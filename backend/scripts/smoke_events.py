"""One-off smoke test: run decode_wav with on_event and sanity-check the event stream."""
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.decoder.pipeline import decode_wav

counts = Counter()
row_batches_per_image = Counter()
image_started_indices = []
errors = []

def on_event(evt):
    counts[evt["type"]] += 1
    if evt["type"] == "image_started":
        image_started_indices.append(evt["global_index"])
    if evt["type"] == "row_batch":
        row_batches_per_image[evt["global_index"]] += evt["row_count"]
        if len(evt["pixels_b64"]) == 0:
            errors.append(f"empty pixels_b64 for image {evt['global_index']}")
        if evt["width"] <= 0:
            errors.append(f"bad width for image {evt['global_index']}")

t0 = time.monotonic()
rate, images = decode_wav(Path(sys.argv[1]), on_event=on_event)
t1 = time.monotonic()

print("event counts:", dict(counts))
print("total images returned:", len(images))
print("image_started count vs images len:", len(image_started_indices), len(images))
print("image_started indices == range(len(images))?", image_started_indices == list(range(len(images))))
print("images with zero row_batches:", sum(1 for i in range(len(images)) if row_batches_per_image[i] == 0))
print("errors:", errors[:10], "... total", len(errors))
print(f"decoded in {t1 - t0:.1f}s")
