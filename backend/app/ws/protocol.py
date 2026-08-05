"""Pydantic schemas for every /ws/decode message type.

Server -> client: hello, decode_started, stage, image_started, row_batch,
image_complete, color_complete, channel_complete, compositing_started,
decode_complete, error.

Client -> server: start_decode, ping.
"""

from __future__ import annotations

from typing import Literal, Union

from pydantic import BaseModel

from ..state.manifest_store import ColorImageEntry, ImageEntry


class Hello(BaseModel):
    type: Literal["hello"] = "hello"
    state: Literal["idle", "decoding", "complete", "error"]
    images: list[ImageEntry]
    color_images: list[ColorImageEntry]
    stage: str | None = None


class DecodeStarted(BaseModel):
    type: Literal["decode_started"] = "decode_started"
    total_channels: int
    sample_rate: int


class Stage(BaseModel):
    type: Literal["stage"] = "stage"
    channel: int | None = None
    stage: str
    message: str


class ImageStarted(BaseModel):
    type: Literal["image_started"] = "image_started"
    global_index: int
    channel: int
    local_index: int
    portrait: bool
    rotation: Literal["cw", "ccw", "none"]


class RowBatch(BaseModel):
    type: Literal["row_batch"] = "row_batch"
    global_index: int
    row_start: int
    row_count: int
    width: int
    pixels_b64: str
    provisional: bool = True


class ImageComplete(BaseModel):
    type: Literal["image_complete"] = "image_complete"
    entry: ImageEntry


class ColorComplete(BaseModel):
    type: Literal["color_complete"] = "color_complete"
    entry: ColorImageEntry


class ChannelComplete(BaseModel):
    type: Literal["channel_complete"] = "channel_complete"
    channel: int
    images_found: int


class CompositingStarted(BaseModel):
    type: Literal["compositing_started"] = "compositing_started"
    total_color_images: int


class DecodeComplete(BaseModel):
    type: Literal["decode_complete"] = "decode_complete"
    total_images: int
    total_color_images: int
    duration_sec: float


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    stage: str
    message: str
    fatal: bool = True


ServerMessage = Union[
    Hello,
    DecodeStarted,
    Stage,
    ImageStarted,
    RowBatch,
    ImageComplete,
    ColorComplete,
    ChannelComplete,
    CompositingStarted,
    DecodeComplete,
    ErrorMessage,
]


class StartDecode(BaseModel):
    type: Literal["start_decode"] = "start_decode"
    force: bool = False


class Ping(BaseModel):
    type: Literal["ping"] = "ping"


ClientMessage = Union[StartDecode, Ping]
