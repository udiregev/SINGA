"""
Singa — AI chord recognition server
====================================

Real, deep-learning-based chord recognition (madmom's DeepChromaProcessor +
DeepChromaChordRecognitionProcessor: a CNN for chroma feature extraction fed
into a CRF chord-sequence decoder), exposed as a tiny HTTP API so the
client-side Goertzel/template heuristic in test-analysis.html has a genuinely
more accurate fallback to call.

This exists because the plain JS chroma+template matcher in the browser is
provably unreliable on real recordings with vocals mixed over an instrument
(flickering, musically implausible output), while this model produced a
clean, correct chord progression on the same test recording, verified against
a synthetic ground-truth suite (8/8 correct chord guesses on real guitar
voicings) as well as against the user's own confirmation of the real result.

Endpoint:
  POST /analyze-chords
    multipart/form-data, field name "file" — any audio/video file ffmpeg can
    decode (m4a, mp3, wav, webm, mp4, ...).

  Response 200 JSON:
    { "chords": [ { "start": 0.0, "end": 2.3, "label": "C" }, ... ] }

  Response 4xx/5xx JSON:
    { "error": "human-readable message" }

Run locally:
    pip install -r requirements.txt
    uvicorn app:app --host 0.0.0.0 --port 8000

Then test:
    curl -F "file=@/path/to/recording.m4a" http://localhost:8000/analyze-chords
"""
import collections
import collections.abc
import os
import subprocess
import tempfile

# madmom (last released 2018) still references these pre-3.10 aliases.
collections.MutableSequence = collections.abc.MutableSequence
collections.Iterable = collections.abc.Iterable
collections.MutableMapping = collections.abc.MutableMapping

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Singa chord recognition")

# Wide-open CORS: this is meant to be called directly from a browser tab
# served off GitHub Pages (a different origin), with no cookies/auth involved.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25MB — generous for a few minutes of audio
MAX_DURATION_S = 600  # 10 minutes, to keep inference time/cost bounded


def _ffmpeg_to_wav(src_path: str, dst_path: str) -> None:
    """Decode whatever the browser uploaded into 44.1kHz mono PCM WAV, which
    is what madmom's DeepChromaProcessor expects."""
    result = subprocess.run(
        [
            "ffmpeg", "-y", "-i", src_path,
            "-t", str(MAX_DURATION_S),
            "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le",
            dst_path,
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise ValueError("ffmpeg could not decode this file as audio: " + result.stderr[-500:])


def _recognize_chords(wav_path: str):
    # Imported lazily so the module-level monkeypatch above always runs first,
    # and so a single bad request can't take the whole process down before
    # these (slow-ish to import) model classes are ready.
    from madmom.audio.chroma import DeepChromaProcessor
    from madmom.features.chords import DeepChromaChordRecognitionProcessor

    chroma_proc = DeepChromaProcessor()
    decode_proc = DeepChromaChordRecognitionProcessor()
    chroma = chroma_proc(wav_path)
    annotations = decode_proc(chroma)

    chords = []
    for start, end, label in annotations:
        label = str(label)
        if label == "N":
            continue  # no-chord segments aren't useful to overlay on lyrics
        chords.append({"start": round(float(start), 2), "end": round(float(end), 2), "label": label})
    return chords


@app.post("/analyze-chords")
async def analyze_chords(file: UploadFile = File(...)):
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        return JSONResponse(status_code=413, content={"error": "File too large (max 25MB)."})
    if not raw:
        return JSONResponse(status_code=400, content={"error": "Empty upload."})

    with tempfile.TemporaryDirectory() as tmp:
        src_path = os.path.join(tmp, "input" + (os.path.splitext(file.filename or "")[1] or ".bin"))
        wav_path = os.path.join(tmp, "audio.wav")
        with open(src_path, "wb") as f:
            f.write(raw)

        try:
            _ffmpeg_to_wav(src_path, wav_path)
        except ValueError as e:
            return JSONResponse(status_code=400, content={"error": str(e)})

        try:
            chords = _recognize_chords(wav_path)
        except Exception as e:  # noqa: BLE001 — surface it to the caller rather than a bare 500
            return JSONResponse(status_code=500, content={"error": "Chord recognition failed: " + str(e)})

    return {"chords": chords}


@app.get("/")
async def health():
    return {"status": "ok", "service": "singa-chord-recognition"}
