"""Core signal-processing pipeline for voyager_images_384khz.wav.

This is a faithful port of amazing-rando/voyager-decoder's voyager-decoder.py.
Parameters, call order, and thresholds are kept identical to the reference —
do not "improve" or reorder anything here without re-validating against the
reference script's output (see the verification step in the project plan).

Produces the same per-image arrays as the reference script's `images` list:
rotated, flipped, and contrast-stretched/inverted, but *before* the
portrait-orientation fix-up and gamma correction (those live in
postprocess.py, exactly mirroring the reference script's two-stage
structure).

`on_event`, when given, is called with plain-dict progress events (see
ws/protocol.py for the corresponding wire schema) as decoding happens. It is
purely an observation hook — passing None reproduces the original
script's behavior exactly, used by cli.py for the reference-comparable
headless run.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
import scipy.io.wavfile
import scipy.ndimage
import scipy.signal

from .constants import SCANWIDTH, THICKNESS
from .postprocess import rotation_for

EventCallback = Callable[[dict], None]


@dataclass
class DecodedImage:
    global_index: int
    channel_idx: int
    local_index: int
    img: np.ndarray
    """Raw processed image array (see module docstring)."""


@dataclass
class AudioSegment:
    global_index: int
    channel_idx: int
    local_index: int
    raw_audio: np.ndarray
    """The full audio segment for this image (image-boundary to image-boundary,
    before boundary-marker trimming), in the original file's sample domain."""
    start_sample: int
    """Absolute sample offset into the original (untrimmed) channel."""
    end_sample: int


ImageReadyCallback = Callable[[DecodedImage], None]
AudioReadyCallback = Callable[[AudioSegment], None]

# How many accepted rows to buffer before flushing a `row_batch` event.
ROW_BATCH_SIZE = 8
# Width downsample factor for the live preview only (full-res only ever
# travels as the final rendered PNG).
ROW_DOWNSAMPLE = 4


def _noop(_event: dict) -> None:
    return None


def load_wav(path: Path) -> tuple[int, np.ndarray]:
    """Read the WAV file, returning (sample_rate, samples[n, channels])."""
    rate, data = scipy.io.wavfile.read(path)
    return rate, data


class _RowBatcher:
    """Accumulates accepted rows for one image, emitting row_batch events.

    Also tracks a running min/max to cheaply normalize each row for the live
    preview — this is *not* the accurate percentile-based contrast stretch
    the final image gets, just a fast approximation for the live canvas.
    """

    def __init__(self, global_index: int, on_event: EventCallback) -> None:
        self.global_index = global_index
        self.on_event = on_event
        self._buffer: list[np.ndarray] = []
        self._row_start = 0
        self._running_min: float | None = None
        self._running_max: float | None = None

    def add(self, line: np.ndarray) -> None:
        ds = line[::ROW_DOWNSAMPLE]
        lo = float(ds.min())
        hi = float(ds.max())
        self._running_min = lo if self._running_min is None else min(self._running_min, lo)
        self._running_max = hi if self._running_max is None else max(self._running_max, hi)
        self._buffer.append(ds)
        if len(self._buffer) >= ROW_BATCH_SIZE:
            self.flush()

    def flush(self) -> None:
        if not self._buffer:
            return
        span = max((self._running_max or 1.0) - (self._running_min or 0.0), 1e-6)
        lo = self._running_min or 0.0
        stacked = np.clip((np.vstack(self._buffer) - lo) / span, 0, 1) * 255
        pixels = stacked.astype(np.uint8).tobytes()
        self.on_event(
            {
                "type": "row_batch",
                "global_index": self.global_index,
                "row_start": self._row_start,
                "row_count": len(self._buffer),
                "width": stacked.shape[1],
                "pixels_b64": base64.b64encode(pixels).decode("ascii"),
                "provisional": True,
            }
        )
        self._row_start += len(self._buffer)
        self._buffer = []


def decode_channel(
    channel: np.ndarray,
    rate: int,
    channel_idx: int = 0,
    global_index_start: int = 0,
    on_event: EventCallback | None = None,
    on_image_ready: ImageReadyCallback | None = None,
    on_audio_ready: AudioReadyCallback | None = None,
) -> list[np.ndarray]:
    """Decode a single audio channel into a list of raw image arrays.

    Mirrors the reference script's per-channel loop body exactly; the
    `on_event` hook is purely additive and never changes the numeric result.
    """
    emit = on_event or _noop

    channel = channel.astype(np.float32, copy=True)
    channel /= np.max(np.abs(channel))

    emit({"type": "stage", "channel": channel_idx, "stage": "trim_start_tone",
          "message": f"Channel {channel_idx}: removing start tone"})

    # Remove the leading start tone: find the last strong negative-going
    # peak in the first 30s and trim everything before it.
    first_30s = channel[: 30 * rate]
    start_tone, _ = scipy.signal.find_peaks(
        -first_30s, height=np.max(-first_30s) - 0.2
    )
    channel_offset = int(start_tone[-1])
    channel = channel[channel_offset:]

    emit({"type": "stage", "channel": channel_idx, "stage": "find_image_boundaries",
          "message": f"Channel {channel_idx}: locating image boundaries"})

    # Peaks marking the start of each image (image index/separator beeps).
    img_index, _ = scipy.signal.find_peaks(
        channel, height=np.max(channel) - 0.2, distance=rate / 5
    )

    emit({"type": "stage", "channel": channel_idx, "stage": "decoding_images",
          "message": f"Channel {channel_idx}: decoding {len(img_index)} images"})

    images: list[np.ndarray] = []

    boundaries = np.append(img_index[1:], len(channel))
    for local_index, (start, end) in enumerate(zip(img_index, boundaries)):
        global_index = global_index_start + local_index
        img_signal = channel[start:end]
        raw_audio_segment = img_signal.copy()

        # Fire the audio callback as early as possible (before the row/image
        # DSP below) so a listener can start writing/streaming the clip
        # while the image itself is still being decoded.
        if on_audio_ready is not None:
            on_audio_ready(AudioSegment(
                global_index=global_index,
                channel_idx=channel_idx,
                local_index=local_index,
                raw_audio=raw_audio_segment,
                start_sample=channel_offset + int(start),
                end_sample=channel_offset + int(end),
            ))

        # Trim boundary markers from both ends: peak-detect in the first
        # tenth of the signal, trim up to the last marker found, then flip
        # so the same logic trims what is now the tail. Run twice.
        for _ in range(2):
            tenth = img_signal[: len(img_signal) // 10]
            boundary_index, _ = scipy.signal.find_peaks(tenth, height=0.7)
            if boundary_index.size > 0:
                img_signal = img_signal[boundary_index[-1]:]
            img_signal = img_signal[::-1]

        # Row sync pulses.
        row_index, _ = scipy.signal.find_peaks(
            img_signal, height=0.05, distance=rate / 100
        )

        rotation = rotation_for(global_index)
        emit({
            "type": "image_started",
            "global_index": global_index,
            "channel": channel_idx,
            "local_index": local_index,
            "portrait": rotation != "none",
            "rotation": rotation,
        })
        batcher = _RowBatcher(global_index, emit)

        img_data = np.zeros(SCANWIDTH, dtype=np.float32)
        for row_signal in row_index[2:-2]:
            line = img_signal[row_signal: row_signal + SCANWIDTH]
            if np.mean(line[0:100]) >= 0.15:
                # Each physical row repeats THICKNESS times (calibration
                # circle geometry).
                img_data = np.vstack([img_data] + [line] * THICKNESS)
                batcher.add(line)
        batcher.flush()

        img_data = np.flip(scipy.ndimage.rotate(img_data, -90), 1)

        low = np.percentile(img_data, 2)
        high = np.percentile(img_data, 98)
        img_data = np.clip(img_data, low, high)
        img_data = 255 - ((img_data - low) / (high - low)) * 255

        img_data = img_data.astype(np.float32)
        images.append(img_data)
        if on_image_ready is not None:
            on_image_ready(DecodedImage(
                global_index=global_index,
                channel_idx=channel_idx,
                local_index=local_index,
                img=img_data,
            ))

    emit({"type": "channel_complete", "channel": channel_idx, "images_found": len(images)})

    return images


def decode_wav(
    path: Path,
    on_event: EventCallback | None = None,
    on_image_ready: ImageReadyCallback | None = None,
    on_audio_ready: AudioReadyCallback | None = None,
) -> tuple[int, list[np.ndarray]]:
    """Decode the whole WAV file.

    Returns (sample_rate, images) where `images` is the single global list
    built by fully decoding channel 0 first, then channel 1 — this exact
    order is what postprocess.py's COLOR_INDEX/PORTRAIT_INDEX/CCW_INDEX
    tables are numbered against.
    """
    emit = on_event or _noop

    emit({"type": "stage", "channel": None, "stage": "loading", "message": "Loading WAV file"})
    rate, data = load_wav(path)
    emit({"type": "decode_started", "total_channels": data.shape[1], "sample_rate": rate})

    images: list[np.ndarray] = []
    for channel_idx, channel in enumerate(data.transpose()):
        channel_images = decode_channel(
            channel, rate, channel_idx=channel_idx,
            global_index_start=len(images), on_event=on_event,
            on_image_ready=on_image_ready, on_audio_ready=on_audio_ready,
        )
        images.extend(channel_images)

    return rate, images
