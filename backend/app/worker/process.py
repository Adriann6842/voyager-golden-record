"""Decode worker entrypoint, run in a separate multiprocessing.Process.

Isolating the decode here means the heavy numpy/scipy-bound work never
contends with the FastAPI event loop for GIL time, and a crash/OOM in the
decoder never takes the API server down. PNGs and audio clips are written
straight to disk; only small JSON-safe event dicts cross the process
boundary via the queue.
"""

from __future__ import annotations

import time
from multiprocessing import Queue
from pathlib import Path

import numpy as np
import scipy.io.wavfile

from ..decoder.pipeline import AudioSegment, DecodedImage, decode_wav
from ..decoder.postprocess import (
    all_color_triplets,
    color_filename,
    mono_filename,
    render_color,
    render_mono,
    rotation_for,
)

# Sentinel put on the queue to signal the worker is done (success or error).
DONE = None


def audio_clip_filename(global_index: int) -> str:
    return f"clip{global_index:03d}.wav"


def run_decode(wav_path: Path, out_dir: Path, event_queue: Queue) -> None:
    audio_dir = out_dir / "audio"

    def emit(event: dict) -> None:
        event_queue.put(event)

    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        audio_dir.mkdir(parents=True, exist_ok=True)
        t0 = time.monotonic()

        rate_holder: dict[str, int] = {}
        audio_by_index: dict[int, tuple[str, float]] = {}

        def on_event(event: dict) -> None:
            if event["type"] == "decode_started":
                rate_holder["rate"] = event["sample_rate"]
            emit(event)

        def on_audio_ready(seg: AudioSegment) -> None:
            rate = rate_holder["rate"]
            clip_filename = audio_clip_filename(seg.global_index)
            pcm16 = np.clip(seg.raw_audio, -1.0, 1.0)
            pcm16 = (pcm16 * 32767).astype(np.int16)
            scipy.io.wavfile.write(audio_dir / clip_filename, rate, pcm16)
            audio_url = f"/gallery/audio/{clip_filename}"
            audio_duration_sec = len(seg.raw_audio) / rate
            audio_by_index[seg.global_index] = (audio_url, audio_duration_sec)

            emit({
                "type": "audio_ready",
                "global_index": seg.global_index,
                "audio_url": audio_url,
                "audio_duration_sec": audio_duration_sec,
            })

        def on_image_ready(decoded: DecodedImage) -> None:
            rotation = rotation_for(decoded.global_index)
            render = render_mono(decoded.img, decoded.global_index)
            filename = mono_filename(decoded.global_index)
            render.save(out_dir / filename)
            width, height = render.size

            audio_url, audio_duration_sec = audio_by_index.pop(
                decoded.global_index, (None, None)
            )

            emit({
                "type": "image_complete",
                "entry": {
                    "global_index": decoded.global_index,
                    "channel": decoded.channel_idx,
                    "local_index": decoded.local_index,
                    "kind": "mono",
                    "portrait": rotation != "none",
                    "rotation": rotation,
                    "width": width,
                    "height": height,
                    "url": f"/gallery/{filename}",
                    "audio_url": audio_url,
                    "audio_duration_sec": audio_duration_sec,
                },
            })

        rate, images = decode_wav(
            wav_path, on_event=on_event,
            on_image_ready=on_image_ready, on_audio_ready=on_audio_ready,
        )

        triplets = all_color_triplets()
        emit({"type": "compositing_started", "total_color_images": len(triplets)})
        for triplet in triplets:
            render = render_color(images, triplet)
            filename = color_filename(triplet)
            render.save(out_dir / filename)
            width, height = render.size
            emit({
                "type": "color_complete",
                "entry": {
                    "pair": list(triplet),
                    "url": f"/gallery/{filename}",
                    "width": width,
                    "height": height,
                },
            })

        emit({
            "type": "decode_complete",
            "total_images": len(images),
            "total_color_images": len(triplets),
            "duration_sec": time.monotonic() - t0,
        })
    except Exception as exc:  # decode failures must reach the client, not crash silently
        emit({"type": "error", "stage": "decode", "message": str(exc), "fatal": True})
    finally:
        event_queue.put(DONE)
