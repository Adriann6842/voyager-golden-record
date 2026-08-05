"""WS protocol smoke test: connect, trigger start_decode, assert invariants."""
import asyncio
import json
import sys
import time
from collections import Counter, defaultdict

import websockets

URL = "ws://127.0.0.1:8000/ws/decode"


async def main():
    counts = Counter()
    row_sum = defaultdict(int)
    image_started = set()
    image_complete = set()
    color_complete = 0
    decode_complete_count = 0
    errors = []
    t0 = time.monotonic()

    async with websockets.connect(URL, max_size=None) as ws:
        hello_raw = await ws.recv()
        hello = json.loads(hello_raw)
        print("hello:", {k: v for k, v in hello.items() if k not in ("images", "color_images")},
              "images_so_far=", len(hello["images"]), "colors_so_far=", len(hello["color_images"]))

        await ws.send(json.dumps({"type": "start_decode", "force": True}))

        deadline = time.monotonic() + float(sys.argv[1]) if len(sys.argv) > 1 else time.monotonic() + 600
        while time.monotonic() < deadline:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=5)
            except asyncio.TimeoutError:
                print(f"... still waiting, elapsed={time.monotonic()-t0:.0f}s, counts={dict(counts)}")
                continue
            evt = json.loads(raw)
            counts[evt["type"]] += 1

            if evt["type"] == "image_started":
                image_started.add(evt["global_index"])
            elif evt["type"] == "row_batch":
                row_sum[evt["global_index"]] += evt["row_count"]
            elif evt["type"] == "image_complete":
                image_complete.add(evt["entry"]["global_index"])
            elif evt["type"] == "color_complete":
                color_complete += 1
            elif evt["type"] == "error":
                errors.append(evt)
                print("ERROR EVENT:", evt)
            elif evt["type"] == "decode_complete":
                decode_complete_count += 1
                print("decode_complete:", evt)
                break

    print()
    print("=== summary ===")
    print("event counts:", dict(counts))
    print("image_started == image_complete (sets equal)?", image_started == image_complete, len(image_started), len(image_complete))
    print("images with zero rows:", sum(1 for i in image_started if row_sum[i] == 0))
    print("color_complete events:", color_complete)
    print("decode_complete fired exactly once:", decode_complete_count == 1)
    print("errors:", errors)
    print(f"wall time: {time.monotonic()-t0:.1f}s")


asyncio.run(main())
