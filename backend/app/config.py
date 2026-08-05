from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent

WAV_PATH = PROJECT_ROOT / "voyager_images_384khz.wav"

DATA_DIR = BACKEND_DIR / "data"
EXTRACTED_DIR = DATA_DIR / "extracted"
# Lives inside EXTRACTED_DIR (not alongside it) so clips are servable through
# the same /gallery static mount without a second mount point.
AUDIO_DIR = EXTRACTED_DIR / "audio"

MANIFEST_PATH = EXTRACTED_DIR / "manifest.json"

AUDIO_DIR.mkdir(parents=True, exist_ok=True)
