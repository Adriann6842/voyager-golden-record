"""Constants for decoding voyager_images_384khz.wav.

These were empirically discovered for this exact recording by the reference
decoder (github.com/amazing-rando/voyager-decoder) and are copied verbatim.
The index tables are numbered against one global `images` list built by
fully decoding channel 0 (left) first, then fully decoding channel 1
(right) — do not reorder or re-derive them independently of that ordering.
"""

# Width (in samples) of a single decoded scan line, and how many times each
# physical row is repeated vertically (from the calibration circle geometry).
SCANWIDTH = 3300
THICKNESS = 15

# Groups of three global image indices that are really the R, G, B channels
# of a single color photo.
COLOR_INDEX: list[tuple[int, int, int]] = [
    (7, 8, 9), (13, 14, 15), (16, 17, 18), (28, 29, 30),
    (41, 42, 43), (44, 45, 46), (47, 48, 49), (58, 59, 60),
    (61, 62, 63), (65, 66, 67), (68, 69, 70), (71, 72, 73),
    (78, 79, 80), (85, 86, 87), (105, 106, 107), (118, 119, 120),
    (125, 126, 127), (130, 131, 132), (147, 148, 149),
    (151, 152, 153),
]

# Global indices of images that are in portrait orientation.
PORTRAIT_INDEX: set[int] = {
    12, 13, 14, 15, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
    38, 39, 40, 41, 42, 43, 44, 45, 46, 52, 61, 62, 63, 65, 66,
    67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 85,
    86, 87, 90, 91, 93, 95, 96, 103, 114, 124, 125, 126, 127,
    129, 133, 137, 150, 155,
}

# Subset of PORTRAIT_INDEX that needs counter-clockwise rotation instead of
# clockwise.
CCW_INDEX: set[int] = {12, 13, 14, 15, 74, 155}
