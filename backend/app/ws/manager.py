"""WebSocket connection manager: broadcast + late-join snapshot."""

from __future__ import annotations

import json

from fastapi import WebSocket
from pydantic import BaseModel


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)

    async def send(self, ws: WebSocket, message: BaseModel) -> None:
        await ws.send_text(message.model_dump_json())

    async def send_raw(self, ws: WebSocket, event: dict) -> None:
        await ws.send_text(json.dumps(event))

    async def broadcast(self, message: BaseModel) -> None:
        await self.broadcast_raw(message.model_dump())

    async def broadcast_raw(self, event: dict) -> None:
        payload = json.dumps(event)
        dead: list[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
