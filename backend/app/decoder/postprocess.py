"""Finalization pass: orientation correction, gamma, and color compositing.

Faithful port of the second half of amazing-rando/voyager-decoder's
voyager-decoder.py — the part that runs once the full `images` list (see
pipeline.py) has been built.
"""

from __future__ import annotations

from typing import Literal

import numpy as np
import scipy.ndimage
from PIL import Image

from .constants import CCW_INDEX, COLOR_INDEX, PORTRAIT_INDEX

MONO_GAMMA = 1.3
COLOR_GAMMA = 1.6


def _gamma_lut(gamma: float):
    return lambda x: ((x / 255) ** gamma) * 255


def rotation_for(index: int) -> Literal["cw", "ccw", "none"]:
    """Which rotation (if any) a global image index needs, per the hardcoded
    PORTRAIT_INDEX/CCW_INDEX tables."""
    if index not in PORTRAIT_INDEX:
        return "none"
    return "ccw" if index in CCW_INDEX else "cw"


def orient(img: np.ndarray, index: int) -> np.ndarray:
    """Apply the portrait-orientation fix-up for a given global image index."""
    if index in PORTRAIT_INDEX:
        angle = 90 if index in CCW_INDEX else -90
        img = scipy.ndimage.rotate(img, angle)
    return img


def render_mono(img: np.ndarray, index: int) -> Image.Image:
    """Render a single grayscale image, oriented and gamma-corrected."""
    img = orient(img, index)
    render = Image.fromarray(img.astype(np.uint8))
    return render.point(_gamma_lut(MONO_GAMMA))


def render_color(images: list[np.ndarray], triplet: tuple[int, int, int]) -> Image.Image:
    """Composite a (R, G, B) triplet of global image indices into a color photo."""
    r, g, b = (images[c] for c in triplet)

    edge = min(max(r.shape), max(g.shape), max(b.shape))
    r, g, b = (r[:, :edge], g[:, :edge], b[:, :edge])

    color_img = np.dstack((r, g, b))

    if triplet[0] in PORTRAIT_INDEX:
        angle = 90 if triplet[0] in CCW_INDEX else -90
        color_img = scipy.ndimage.rotate(color_img, angle)

    render = Image.fromarray(color_img.astype(np.uint8))
    return render.point(_gamma_lut(COLOR_GAMMA))


def mono_filename(index: int) -> str:
    return f"mono{index:03d}.png"


def color_filename(triplet: tuple[int, int, int]) -> str:
    return f"color{triplet[0]:03d}-{triplet[-1]:03d}.png"


def all_color_triplets() -> list[tuple[int, int, int]]:
    return list(COLOR_INDEX)
