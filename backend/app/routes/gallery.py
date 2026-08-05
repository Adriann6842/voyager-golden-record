from fastapi import APIRouter

from ..state import manifest_store

router = APIRouter(prefix="/api")


@router.get("/gallery")
def get_gallery() -> manifest_store.Manifest:
    return manifest_store.load()


@router.get("/status")
def get_status() -> dict:
    manifest = manifest_store.load()
    return {
        "state": manifest.state,
        "images_done": len(manifest.images),
        "color_images_done": len(manifest.color_images),
        "error_message": manifest.error_message,
    }
