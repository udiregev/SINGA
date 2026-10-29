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

  POST /fetch-audio
    JSON { "url": "https://www.youtube.com/watch?v=..." } — any page yt-dlp
    understands (YouTube, SoundCloud, Vimeo, a direct .mp3 link, ...).
    Response 200: the audio file itself (m4a/mp3/...), with the track's
    title in the X-Title header (URL-encoded). Errors come back as JSON
    { "error": "..." }. Used by the app's "Embed link" box: the browser
    can't download from YouTube itself, so the server fetches the audio and
    the app analyses it exactly like an uploaded file.
    Optional env var YTDLP_COOKIES: the contents of a cookies.txt (Netscape
    format) for when YouTube asks the server to "confirm you're not a bot".
    YouTube is tried with several player clients in turn, since cloud IPs
    are often challenged on some clients but not others.

  POST /convert-audio
    multipart/form-data, field "file" — any audio/video ffmpeg can read.
    Response 200: 16kHz mono WAV. The app falls back to this when the
    browser itself can't decode a format (e.g. .ogg/.opus/.wma on an iPad).

Run locally:
    pip install -r requirements.txt
    uvicorn app:app --host 0.0.0.0 --port 8000

Then test:
    curl -F "file=@/path/to/recording.m4a" http://localhost:8000/analyze-chords
"""
import collections
import collections.abc
import glob
import os
import subprocess
import tempfile
import urllib.parse

# madmom (last released 2018) still references these pre-3.10 aliases.
collections.MutableSequence = collections.abc.MutableSequence
collections.Iterable = collections.abc.Iterable
collections.MutableMapping = collections.abc.MutableMapping

from fastapi import Body, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

app = FastAPI(title="Singa chord recognition")

# Wide-open CORS: this is meant to be called directly from a browser tab
# served off GitHub Pages (a different origin), with no cookies/auth involved.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-Title"],
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


AUDIO_TYPES = {".m4a": "audio/mp4", ".mp4": "audio/mp4", ".mp3": "audio/mpeg", ".webm": "audio/webm",
               ".opus": "audio/ogg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".aac": "audio/aac"}


def _yt_dlp_error(stderr: str) -> str:
    low = stderr.lower()
    if "confirm you" in low and "bot" in low:
        return "YouTube is asking the server to prove it isn't a bot. Add YouTube cookies (YTDLP_COOKIES) to the server, or upload the audio file instead."
    if "private video" in low or "sign in" in low:
        return "That video is private or needs a sign-in."
    if "unsupported url" in low:
        return "That link isn't a page with audio Singa can read."
    if "does not pass filter" in low:
        return "That track is longer than 10 minutes."
    if "file is larger" in low or "max-filesize" in low:
        return "That track is too large (max 25MB of audio)."
    lines = [l for l in stderr.strip().splitlines() if l.strip()]
    return (lines[-1] if lines else "Couldn't download the audio from that link.")[-300:]


# YouTube challenges cloud servers on some player clients but not others, so
# a YouTube link is tried with each of these in turn (None = yt-dlp default).
YT_CLIENTS = [None, "tv_embedded", "web_safari", "mweb", "android_vr", "ios", "tv", "web_embedded"]


def _is_youtube(url: str) -> bool:
    host = urllib.parse.urlparse(url).netloc.lower()
    return any(h in host for h in ("youtube.com", "youtu.be", "youtube-nocookie.com"))


def _run_yt_dlp(url: str, tmp: str, client):
    cmd = [
            "yt-dlp", "--no-playlist", "--no-progress", "--no-warnings",
            "-f", "bestaudio[ext=m4a]/bestaudio/best",
            "-x", "--audio-format", "m4a",
            "--match-filter", "duration <=? %d" % MAX_DURATION_S,
            "--max-filesize", str(MAX_UPLOAD_BYTES),
            "--no-simulate", "--print", "after_move:TITLE:%(title)s",
            "-o", os.path.join(tmp, "audio.%(ext)s"),
    ]
    if client:
        cmd += ["--extractor-args", "youtube:player_client=" + client]
    cookies = os.environ.get("YTDLP_COOKIES", "").strip()
    if cookies:
        cpath = os.path.join(tmp, "cookies.txt")
        with open(cpath, "w") as f:
            f.write(cookies + "\n")
        cmd += ["--cookies", cpath]
    cmd.append(url)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=150)


@app.post("/fetch-audio")
def fetch_audio(payload: dict = Body(...)):
    url = str((payload or {}).get("url") or "").strip()
    if not url.lower().startswith(("http://", "https://")):
        return JSONResponse(status_code=400, content={"error": "Send a link that starts with https://"})
    with tempfile.TemporaryDirectory() as tmp:
        clients = YT_CLIENTS if _is_youtube(url) else [None]
        result, files, tried = None, [], []
        for client in clients:
            for p in glob.glob(os.path.join(tmp, "audio.*")):
                os.remove(p)
            try:
                result = _run_yt_dlp(url, tmp, client)
            except subprocess.TimeoutExpired:
                tried.append(str(client) + ": timeout")
                continue
            except FileNotFoundError:
                return JSONResponse(status_code=500, content={"error": "yt-dlp isn't installed on the server."})
            files = [p for p in glob.glob(os.path.join(tmp, "audio.*")) if not p.endswith((".part", ".ytdl", ".json"))]
            if result.returncode == 0 and files:
                break
            tried.append(str(client) + ": " + _yt_dlp_error(result.stderr or result.stdout or "")[:120])
            low = (result.stderr or "").lower()
            if "does not pass filter" in low or "private video" in low or "unsupported url" in low:
                break
        if result is None or result.returncode != 0 or not files:
            msg = _yt_dlp_error((result.stderr or result.stdout or "") if result else "Fetching that link took too long.")
            return JSONResponse(status_code=422, content={"error": msg, "tried": tried})
        title = ""
        for line in (result.stdout or "").splitlines():
            if line.startswith("TITLE:"):
                title = line[6:].strip()
        path = max(files, key=os.path.getsize)
        if os.path.getsize(path) > MAX_UPLOAD_BYTES:
            return JSONResponse(status_code=413, content={"error": "That track is too large (max 25MB of audio)."})
        with open(path, "rb") as f:
            data = f.read()
    ext = os.path.splitext(path)[1].lower()
    return Response(content=data, media_type=AUDIO_TYPES.get(ext, "application/octet-stream"),
                    headers={"X-Title": urllib.parse.quote(title[:200])})


@app.post("/convert-audio")
async def convert_audio(file: UploadFile = File(...)):
    raw = await file.read()
    if not raw:
        return JSONResponse(status_code=400, content={"error": "Empty upload."})
    if len(raw) > MAX_UPLOAD_BYTES * 2:
        return JSONResponse(status_code=413, content={"error": "File too large (max 50MB)."})
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "input" + (os.path.splitext(file.filename or "")[1] or ".bin"))
        dst = os.path.join(tmp, "out.wav")
        with open(src, "wb") as f:
            f.write(raw)
        result = subprocess.run(["ffmpeg", "-y", "-i", src, "-vn", "-t", str(MAX_DURATION_S), "-ar", "16000", "-ac", "1",
                                 "-c:a", "pcm_s16le", dst], capture_output=True, text=True)
        if result.returncode != 0 or not os.path.exists(dst):
            return JSONResponse(status_code=400, content={"error": "Couldn't read that file as audio."})
        with open(dst, "rb") as f:
            data = f.read()
    return Response(content=data, media_type="audio/wav")


@app.get("/")
async def health():
    return {"status": "ok", "service": "singa-chord-recognition"}
