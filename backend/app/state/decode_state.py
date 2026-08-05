"""In-process guard against concurrent decode runs.

Separate from Manifest.state (which persists the *outcome* to disk): this
tracks whether a decode is *currently running in this server process*, so a
second POST /api/decode/start or WS start_decode while one is already in
flight gets rejected instead of spawning a second worker.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass


@dataclass
class RunHandle:
    process: object
    queue: object


class DecodeState:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._running: RunHandle | None = None

    def try_start(self, handle: RunHandle) -> bool:
        with self._lock:
            if self._running is not None:
                return False
            self._running = handle
            return True

    def clear(self) -> None:
        with self._lock:
            self._running = None

    @property
    def is_running(self) -> bool:
        with self._lock:
            return self._running is not None

    @property
    def current(self) -> RunHandle | None:
        with self._lock:
            return self._running


decode_state = DecodeState()
