"""Headless runner: python -m app.decoder.cli <wav_path> [out_dir]

Decodes the WAV file synchronously and writes monoNNN.png / colorNNN-NNN.png
to the output directory, exactly mirroring the reference script's own output
naming. Used to validate the ported pipeline before any web/async code is
layered on top.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

from .pipeline import decode_wav
from .postprocess import all_color_triplets, color_filename, mono_filename, render_color, render_mono


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python -m app.decoder.cli <wav_path> [out_dir]", file=sys.stderr)
        raise SystemExit(1)

    wav_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[2] / "data" / "extracted"
    out_dir.mkdir(parents=True, exist_ok=True)

    t0 = time.monotonic()
    print(f"Decoding {wav_path} ...")
    rate, images = decode_wav(wav_path)
    t1 = time.monotonic()
    print(f"Decoded {len(images)} raw images from {rate} Hz audio in {t1 - t0:.1f}s")

    for i, img in enumerate(images):
        render_mono(img, i).save(out_dir / mono_filename(i))
    t2 = time.monotonic()
    print(f"Wrote {len(images)} mono PNGs in {t2 - t1:.1f}s")

    triplets = all_color_triplets()
    for triplet in triplets:
        render_color(images, triplet).save(out_dir / color_filename(triplet))
    t3 = time.monotonic()
    print(f"Wrote {len(triplets)} color PNGs in {t3 - t2:.1f}s")

    print(f"Done in {t3 - t0:.1f}s total. Output: {out_dir}")


if __name__ == "__main__":
    main()
