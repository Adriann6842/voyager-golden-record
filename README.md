# Voyager Golden Record Decoder

A live audio-to-image decoder for the picture data encoded on the 1977 Voyager Golden Record. The backend decodes the analog scan-line images from the raw audio signal; the frontend lets you browse the gallery and watch each image decode live, in sync with its audio.

Watch full explanation: [youtu.be/83TRij3igmE](https://youtu.be/83TRij3igmE)

## Reference

The decoder is built using [amazing-rando/voyager-decoder](https://github.com/amazing-rando/voyager-decoder) as a reference for the decoding parameters and algorithm. Thanks to Claude, for the heavy lifting on writing the code implementation.

**How the decoding works:** the Golden Record encodes each image as a sequence of horizontal scan lines, drawn one at a time into the audio signal much like an old analog TV or fax machine. Each scan line's brightness values are represented as amplitude in the waveform. The decoder reads the raw audio samples, finds the calibration circle at the start of each image to work out the scan-line width and image geometry, then slices the signal into consecutive lines and stacks them into rows to reconstruct the picture. A final pass corrects orientation, contrast, and gamma so the image looks right side up and properly exposed.

The source audio is the archival WAV of the Golden Record's encoded images, hosted on the Internet Archive:

- **WAV file:** [archive.org/details/voyager_images_384khz](https://archive.org/details/voyager_images_384khz) (~1.4GB, stereo, 384kHz)

Download it and place it at the project root as `voyager_images_384khz.wav` before running the backend.

## Project structure

```
voyager/
├── voyager_images_384khz.wav   # source audio (not committed, see Reference above)
├── backend/                    # FastAPI + scipy/numpy decoder
│   └── app/decoder/            # signal-processing pipeline
└── frontend/                   # React + Vite gallery UI
```

## Running locally

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. The first "Start decoding" run processes the full WAV (~6 min); after that, decoded images and audio clips are cached on disk and load instantly, with "Replay decode" available to re-watch the live decode animation.
