from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import EXTRACTED_DIR
from .routes import decode, gallery

app = FastAPI(title="Voyager Golden Record Decoder")

app.add_middleware(
    CORSMiddleware,
    # The Vite dev server proxies /api, /gallery, /ws to this backend, so
    # normal usage is same-origin; this just covers running the frontend
    # dev server directly against the backend on whatever port Vite picks.
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gallery.router)
app.include_router(decode.router)

app.mount("/gallery", StaticFiles(directory=EXTRACTED_DIR), name="gallery")
