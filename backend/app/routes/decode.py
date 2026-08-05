"""POST /api/decode/start and the WS /ws/decode live-progress endpoint."""

from __future__ import annotations

import asyncio
import time
from multiprocessing import Process, Queue
from pathlib import Path
from queue import Empty as QueueEmpty

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..config import EXTRACTED_DIR, WAV_PATH
from ..state import manifest_store
from ..state.decode_state import RunHandle, decode_state
from ..worker.process import run_decode
from ..worker.replay import build_row_batches
from ..ws.manager import manager

router = APIRouter()

_PROCESS_DIED = object()

REPLAY_ROW_DELAY_SEC = 0.018
REPLAY_IMAGE_GAP_SEC = 0.01
REPLAY_COLOR_DELAY_SEC = 0.12

_replay_running = False


class StartDecodeBody(BaseModel):
    force: bool = False


@router.post("/api/decode/start")
async def start_decode_endpoint(body: StartDecodeBody):
    started = await start_decode(force=body.force)
    if not started:
        return JSONResponse({"error": "decode already running"}, status_code=409)
    return {"status": "ok"}


async def start_decode(force: bool) -> bool:
    """Kick off a decode run if one isn't already in flight.

    Returns True if a decode is now running or already complete (idempotent
    success), False if a decode was already running and this call was
    rejected (the caller should surface that as a 409 / no-op).
    """
    manifest = manifest_store.load()
    if manifest.state == "complete" and not force:
        return True

    if decode_state.is_running or _replay_running:
        return False

    queue: Queue = Queue()
    process = Process(target=run_decode, args=(WAV_PATH, EXTRACTED_DIR, queue), daemon=True)

    if not decode_state.try_start(RunHandle(process=process, queue=queue)):
        return False

    fresh = manifest_store.empty_manifest()
    manifest_store.set_state(fresh, "decoding")

    process.start()
    asyncio.create_task(_pump_events(process, queue))
    return True


def _get_with_liveness_check(queue: Queue, process: Process):
    while True:
        try:
            return queue.get(timeout=1.0)
        except QueueEmpty:
            if not process.is_alive():
                return _PROCESS_DIED


async def _pump_events(process: Process, queue: Queue) -> None:
    loop = asyncio.get_running_loop()
    try:
        while True:
            event = await loop.run_in_executor(None, _get_with_liveness_check, queue, process)
            if event is None:
                break
            if event is _PROCESS_DIED:
                await _apply_and_broadcast({
                    "type": "error",
                    "stage": "worker",
                    "message": "Decoder process exited unexpectedly",
                    "fatal": True,
                })
                break
            await _apply_and_broadcast(event)
    finally:
        decode_state.clear()
        process.join(timeout=5)


async def _apply_and_broadcast(event: dict) -> None:
    etype = event["type"]

    if etype == "decode_started":
        manifest = manifest_store.load()
        manifest.sample_rate = event.get("sample_rate")
        manifest_store.save(manifest)
    elif etype == "image_complete":
        manifest = manifest_store.load()
        entry = manifest_store.ImageEntry(**event["entry"])
        manifest_store.add_image(manifest, entry)
    elif etype == "color_complete":
        manifest = manifest_store.load()
        entry = manifest_store.ColorImageEntry(**event["entry"])
        manifest_store.add_color_image(manifest, entry)
    elif etype == "decode_complete":
        manifest = manifest_store.load()
        manifest_store.set_state(manifest, "complete")
    elif etype == "error":
        manifest = manifest_store.load()
        manifest_store.set_state(manifest, "error", error_message=event.get("message"))

    await manager.broadcast_raw(event)


async def replay_decode() -> bool:
    """Re-stream an already-complete decode as a fast, paced sequence of the
    same event types the real decode emits — no audio file access, no
    manifest mutation (nothing on disk changed), purely a WS broadcast.
    """
    global _replay_running

    if decode_state.is_running or _replay_running:
        return False

    manifest = manifest_store.load()
    if manifest.state != "complete" or not manifest.images:
        return False

    _replay_running = True
    asyncio.create_task(_run_replay(manifest))
    return True


async def _run_replay(manifest: manifest_store.Manifest) -> None:
    global _replay_running
    loop = asyncio.get_running_loop()
    t0 = time.monotonic()
    try:
        await manager.broadcast_raw({
            "type": "decode_started",
            "total_channels": 2,
            "sample_rate": manifest.sample_rate or 384000,
        })

        images_sorted = sorted(manifest.images, key=lambda e: e.global_index)
        for entry in images_sorted:
            if entry.audio_url:
                await manager.broadcast_raw({
                    "type": "audio_ready",
                    "global_index": entry.global_index,
                    "audio_url": entry.audio_url,
                    "audio_duration_sec": entry.audio_duration_sec,
                })

            await manager.broadcast_raw({
                "type": "image_started",
                "global_index": entry.global_index,
                "channel": entry.channel,
                "local_index": entry.local_index,
                "portrait": entry.portrait,
                "rotation": entry.rotation,
            })

            png_path = EXTRACTED_DIR / Path(entry.url).name
            batches = await loop.run_in_executor(
                None, build_row_batches, png_path, entry.global_index
            )
            for batch in batches:
                await manager.broadcast_raw(batch)
                await asyncio.sleep(REPLAY_ROW_DELAY_SEC)

            await manager.broadcast_raw({"type": "image_complete", "entry": entry.model_dump()})
            await asyncio.sleep(REPLAY_IMAGE_GAP_SEC)

        colors_sorted = sorted(manifest.color_images, key=lambda e: e.pair[0])
        await manager.broadcast_raw({
            "type": "compositing_started",
            "total_color_images": len(colors_sorted),
        })
        for entry in colors_sorted:
            await manager.broadcast_raw({"type": "color_complete", "entry": entry.model_dump()})
            await asyncio.sleep(REPLAY_COLOR_DELAY_SEC)

        await manager.broadcast_raw({
            "type": "decode_complete",
            "total_images": len(images_sorted),
            "total_color_images": len(colors_sorted),
            "duration_sec": time.monotonic() - t0,
        })
    finally:
        _replay_running = False


@router.websocket("/ws/decode")
async def ws_decode(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    manifest = manifest_store.load()
    await manager.send_raw(websocket, {
        "type": "hello",
        "state": manifest.state,
        "images": [e.model_dump() for e in manifest.images],
        "color_images": [e.model_dump() for e in manifest.color_images],
        "stage": None,
    })
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "start_decode":
                started = await start_decode(force=bool(data.get("force", False)))
                if not started:
                    await manager.send_raw(websocket, {
                        "type": "error",
                        "stage": "start_decode",
                        "message": "A decode is already running",
                        "fatal": False,
                    })
            elif data.get("type") == "replay_decode":
                started = await replay_decode()
                if not started:
                    await manager.send_raw(websocket, {
                        "type": "error",
                        "stage": "replay_decode",
                        "message": "Nothing to replay yet, or a decode/replay is already running",
                        "fatal": False,
                    })
            # "ping" and anything else: no-op, connection is kept alive by the frame itself
    except WebSocketDisconnect:
        manager.disconnect(websocket)
