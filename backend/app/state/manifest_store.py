"""Persisted decode manifest: data/extracted/manifest.json.

Single source of truth for what's been decoded so far. Every mutation is an
atomic write (write to a tmp file, then os.replace) so a reload or a crash
mid-decode never sees a torn/corrupt manifest.
"""

from __future__ import annotations

import os
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from ..config import MANIFEST_PATH, WAV_PATH
from ..decoder.constants import SCANWIDTH, THICKNESS

DecodeStateName = Literal["idle", "decoding", "complete", "error"]
Rotation = Literal["cw", "ccw", "none"]


class ImageEntry(BaseModel):
    global_index: int
    channel: int
    local_index: int
    kind: Literal["mono"] = "mono"
    portrait: bool
    rotation: Rotation
    width: int
    height: int
    url: str
    audio_url: str | None = None
    audio_duration_sec: float | None = None


class ColorImageEntry(BaseModel):
    pair: tuple[int, int, int]
    url: str
    width: int
    height: int


class Manifest(BaseModel):
    version: int = 1
    generated_at: str
    source_wav: str
    sample_rate: int | None = None
    scanwidth: int = SCANWIDTH
    thickness: int = THICKNESS
    state: DecodeStateName = "idle"
    error_message: str | None = None
    images: list[ImageEntry] = []
    color_images: list[ColorImageEntry] = []


_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def empty_manifest() -> Manifest:
    return Manifest(generated_at=_now(), source_wav=WAV_PATH.name)


def load() -> Manifest:
    with _lock:
        if not MANIFEST_PATH.exists():
            return empty_manifest()
        return Manifest.model_validate_json(MANIFEST_PATH.read_text())


def save(manifest: Manifest) -> None:
    with _lock:
        _atomic_write(manifest)


def _atomic_write(manifest: Manifest) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(
        dir=MANIFEST_PATH.parent, prefix=".manifest-", suffix=".tmp"
    )
    try:
        with os.fdopen(fd, "w") as f:
            f.write(manifest.model_dump_json(indent=2))
        os.replace(tmp_path, MANIFEST_PATH)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise


def add_image(manifest: Manifest, entry: ImageEntry) -> Manifest:
    manifest.images.append(entry)
    manifest.generated_at = _now()
    save(manifest)
    return manifest


def add_color_image(manifest: Manifest, entry: ColorImageEntry) -> Manifest:
    manifest.color_images.append(entry)
    manifest.generated_at = _now()
    save(manifest)
    return manifest


def set_state(
    manifest: Manifest, state: DecodeStateName, error_message: str | None = None
) -> Manifest:
    manifest.state = state
    manifest.error_message = error_message
    manifest.generated_at = _now()
    save(manifest)
    return manifest
