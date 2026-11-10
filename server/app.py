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
    Optional env var YTDLP_PROXY: a residential proxy URL, e.g.
    http://user:pass@gate.example.com:7000 — YouTube blocks most cloud/server
    IP addresses outright ("confirm you're not a bot"), and sending the
    download through a home-style IP is what reliably gets past that.
    YouTube is tried with several player clients in turn, since cloud IPs
    are often challenged on some clients but not others.

  POST /transcribe
    multipart/form-data, field "file" — any audio ffmpeg can read (the app
    sends a 16kHz mono WAV). Response 200 JSON:
      { "words": [ { "text": " Hello", "start": 1.2, "end": 1.5 }, ... ],
        "text": "...", "model": "server:small.en" }
    Speech-to-text with word timings (faster-whisper, English). The app uses
    it when Whisper can't run inside the browser — iPads/iPhones (Safari)
    usually can't load the model. Env var WHISPER_MODEL picks the model
    (default small.en); it downloads once, in the background at start-up.

  GET /spotify-search?title=...&artist=...
    Finds the song's original recording on Spotify. Response 200 JSON:
      { "url": "https://open.spotify.com/track/...", "name": "...",
        "artist": "...", "year": "1976" }   or { "url": null, "reason": "..." }
    Needs env vars SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET (a free app at
    developer.spotify.com); without them it answers { "url": null } and the
    app links to a Spotify search instead.

  GET /spotify-playlist?url=https://open.spotify.com/playlist/...
    The tracks of a public Spotify playlist, for the app's "Add a Spotify
    playlist" (paste a link; refresh adds new tracks). Response 200 JSON:
      { "id": "...", "name": "Playlist name", "source": "api" | "page",
        "partial": false,
        "tracks": [ { "id": "...", "title": "...", "artist": "...", "url": "..." }, ... ] }
    Tries Spotify's Web API first (works for playlists the app's owner can
    read), then reads the playlist's public web page. The public page is not
    an official API: it can change without notice, and long playlists may
    only show their first 100 or so tracks ("partial": true).

  POST /fetch-page   JSON { "url": "https://..." }   (or GET /fetch-page?url=...)
    Reads a web page with a song on it (a chord sheet or lyrics page) for
    the app's Import › From a link. Response 200 JSON:
      { "title": "...", "artist": "...", "text": "chords over lyrics...",
        "site": "tabs.ultimate-guitar.com", "kind": "ug" | "pre" | "lyrics" | "text" }
    The app then reads the text like an uploaded .txt file. Only public
    http(s) pages; addresses on private networks are refused.

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
import threading
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
        if os.environ.get("YTDLP_PROXY", "").strip():
            return "YouTube blocked the download even through the proxy. Try again in a minute, or upload the audio file instead."
        return "YouTube blocks downloads from the Singa server (it asks it to prove it isn't a bot). Upload the audio file instead for now."
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
    proxy = os.environ.get("YTDLP_PROXY", "").strip()
    if proxy:
        cmd += ["--proxy", proxy]
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


# ---------------- lyrics: speech-to-text for devices that can't run it ----------------
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small.en").strip() or "small.en"
_whisper = None
_whisper_load_lock = threading.Lock()
_whisper_run_lock = threading.Lock()   # one transcription at a time keeps memory bounded


def _get_whisper():
    global _whisper
    with _whisper_load_lock:
        if _whisper is None:
            from faster_whisper import WhisperModel
            _whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _whisper


def _warm_whisper():
    try:
        _get_whisper()
    except Exception as e:  # noqa: BLE001 — a failed warm-up just means the first request tries again
        print("Singa: speech model warm-up failed:", e, flush=True)


threading.Thread(target=_warm_whisper, daemon=True).start()


@app.post("/transcribe")
def transcribe(file: UploadFile = File(...)):
    raw = file.file.read()
    if not raw:
        return JSONResponse(status_code=400, content={"error": "Empty upload."})
    if len(raw) > MAX_UPLOAD_BYTES:
        return JSONResponse(status_code=413, content={"error": "File too large (max 25MB)."})
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "input" + (os.path.splitext(file.filename or "")[1] or ".bin"))
        dst = os.path.join(tmp, "speech.wav")
        with open(src, "wb") as f:
            f.write(raw)
        result = subprocess.run(["ffmpeg", "-y", "-i", src, "-vn", "-t", str(MAX_DURATION_S), "-ar", "16000", "-ac", "1",
                                 "-c:a", "pcm_s16le", dst], capture_output=True, text=True)
        if result.returncode != 0 or not os.path.exists(dst):
            return JSONResponse(status_code=400, content={"error": "Couldn't read that file as audio."})
        try:
            model = _get_whisper()
        except Exception as e:  # noqa: BLE001
            return JSONResponse(status_code=503, content={"error": "The lyrics model isn't ready on the server: " + str(e)})
        try:
            with _whisper_run_lock:
                segments, _info = model.transcribe(dst, language="en", beam_size=5, word_timestamps=True,
                                                   condition_on_previous_text=False)
                words, texts = [], []
                for seg in segments:
                    texts.append(seg.text)
                    for w in (seg.words or []):
                        words.append({"text": w.word, "start": round(float(w.start), 2), "end": round(float(w.end), 2)})
        except Exception as e:  # noqa: BLE001
            return JSONResponse(status_code=500, content={"error": "Transcription failed: " + str(e)})
    return {"words": words, "text": "".join(texts).strip(), "model": "server:" + WHISPER_MODEL}


# ---- Spotify: a link to the original recording of a song ----
_spotify_token = {"value": None, "exp": 0.0}
_SPOT_SKIP = ("live", "remaster", "karaoke", "cover", "acoustic", "remix", "instrumental", "tribute",
              "demo", "version", "re-record", "rerecord", "originally performed", "in the style")


def _spotify_auth():
    import time
    import requests
    cid, sec = os.environ.get("SPOTIFY_CLIENT_ID"), os.environ.get("SPOTIFY_CLIENT_SECRET")
    if not cid or not sec:
        return None
    if _spotify_token["value"] and time.time() < _spotify_token["exp"] - 60:
        return _spotify_token["value"]
    r = requests.post("https://accounts.spotify.com/api/token", data={"grant_type": "client_credentials"},
                      auth=(cid, sec), timeout=10)
    r.raise_for_status()
    j = r.json()
    _spotify_token["value"] = j["access_token"]
    _spotify_token["exp"] = time.time() + int(j.get("expires_in", 3600))
    return _spotify_token["value"]


def _norm(t: str) -> str:
    import re
    t = (t or "").lower()
    t = re.sub(r"\s*[\(\[].*?[\)\]]", "", t)          # (Remastered 2011), [Live]
    t = re.sub(r"\s+-\s+.*$", "", t)                    # " - 2015 Remaster"
    return re.sub(r"[^a-z0-9À-ɏ]+", " ", t).strip()


@app.get("/spotify-search")
def spotify_search(title: str = "", artist: str = ""):
    import requests
    title, artist = (title or "").strip(), (artist or "").strip()
    if not title:
        return {"url": None, "reason": "no title"}
    try:
        token = _spotify_auth()
    except Exception as e:  # noqa: BLE001
        return {"url": None, "reason": "Spotify sign-in failed: " + str(e)}
    if not token:
        return {"url": None, "reason": "not configured"}
    q = 'track:"%s"' % title + (' artist:"%s"' % artist if artist else "")
    try:
        r = requests.get("https://api.spotify.com/v1/search", params={"q": q, "type": "track", "limit": 30},
                         headers={"Authorization": "Bearer " + token}, timeout=10)
        items = r.json().get("tracks", {}).get("items", []) if r.ok else []
        if not items and artist:   # a looser search
            r = requests.get("https://api.spotify.com/v1/search", params={"q": title + " " + artist, "type": "track", "limit": 30},
                             headers={"Authorization": "Bearer " + token}, timeout=10)
            items = r.json().get("tracks", {}).get("items", []) if r.ok else []
    except Exception as e:  # noqa: BLE001
        return {"url": None, "reason": "Spotify search failed: " + str(e)}
    nt, na = _norm(title), _norm(artist)
    best, best_key = None, None
    for it in items:
        name = it.get("name") or ""
        full = name.lower() + " " + ((it.get("album") or {}).get("name") or "").lower()
        artists = [a.get("name") or "" for a in it.get("artists") or []]
        title_ok = _norm(name) == nt
        artist_ok = (not na) or any(_norm(a) == na or na in _norm(a) or _norm(a) in na for a in artists)
        if not title_ok and not artist_ok:
            continue
        odd = any(w in full for w in _SPOT_SKIP)
        album = it.get("album") or {}
        comp = album.get("album_type") == "compilation"
        date = (album.get("release_date") or "9999")[:10]
        pop = it.get("popularity") or 0
        # the original: right title and artist, not a live / remastered / cover
        # version, not a compilation, then the earliest release (then the most played)
        key = (0 if title_ok else 1, 0 if artist_ok else 1, 1 if odd else 0, 1 if comp else 0, date, -pop)
        if best_key is None or key < best_key:
            best, best_key = it, key
    if not best:
        return {"url": None, "reason": "not found"}
    return {"url": (best.get("external_urls") or {}).get("spotify"),
            "name": best.get("name"),
            "artist": ", ".join(a.get("name") or "" for a in best.get("artists") or []),
            "year": ((best.get("album") or {}).get("release_date") or "")[:4]}


# ---- Spotify: the tracks of a public playlist ----
_PL_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def _playlist_id(s: str):
    import re
    s = (s or "").strip()
    m = re.search(r"playlist[/:]([A-Za-z0-9]{22})", s) or re.fullmatch(r"([A-Za-z0-9]{22})", s)
    return m.group(1) if m else None


def _artist_text(el) -> str:
    """Artist names from the shapes Spotify uses (a subtitle string, a list
    of {name}, a list of {profile: {name}}, or {items: [...]})."""
    if isinstance(el.get("subtitle"), str):
        return el["subtitle"].replace(" ", " ").strip()
    arts = el.get("artists")
    if isinstance(arts, dict):
        arts = arts.get("items") or []
    names = []
    for a in arts or []:
        if isinstance(a, dict):
            n = a.get("name") or (a.get("profile") or {}).get("name")
            if n:
                names.append(n)
        elif isinstance(a, str):
            names.append(a)
    return ", ".join(names)


def _as_track(el):
    if not isinstance(el, dict):
        return None
    for k in ("item", "track", "itemV2"):
        if isinstance(el.get(k), dict):
            inner = el[k].get("data") if isinstance(el[k].get("data"), dict) else el[k]
            t = _as_track(inner)
            if t:
                return t
    uri = el.get("uri") or ""
    title = el.get("title") or el.get("name")
    if not isinstance(title, str) or not title.strip():
        return None
    if uri and not str(uri).startswith("spotify:track:"):
        return None
    tid = str(uri).split(":")[-1] if uri else (el.get("id") or "")
    if not uri and not el.get("artists") and not isinstance(el.get("subtitle"), str):
        return None
    return {"id": tid, "title": title.strip(), "artist": _artist_text(el),
            "url": ("https://open.spotify.com/track/" + tid) if tid else ""}


def _find_tracks(node, best):
    """The longest list in the page's data that looks like a track list."""
    if isinstance(node, list):
        if len(node) >= 1:
            ts = [t for t in (_as_track(x) for x in node) if t]
            if ts and len(ts) >= max(1, int(len(node) * 0.6)) and len(ts) > len(best["tracks"]):
                best["tracks"] = ts
        for x in node:
            _find_tracks(x, best)
    elif isinstance(node, dict):
        if not best["name"] and node.get("type") == "playlist":
            nm = node.get("name") or node.get("title")
            if isinstance(nm, str):
                best["name"] = nm
        for v in node.values():
            _find_tracks(v, best)


def _page_data(html: str):
    """Every JSON blob in the page's <script> tags (plain or base64)."""
    import base64
    import json
    import re
    out = []
    for m in re.finditer(r"<script[^>]*>(.*?)</script>", html, re.S | re.I):
        body = (m.group(1) or "").strip()
        if len(body) < 40:
            continue
        try:
            out.append(json.loads(body))
            continue
        except Exception:  # noqa: BLE001
            pass
        if re.fullmatch(r"[A-Za-z0-9+/=\s]+", body):
            try:
                out.append(json.loads(base64.b64decode(body).decode("utf-8")))
            except Exception:  # noqa: BLE001
                pass
    return out


def _og_title(html: str):
    import html as _h
    import re
    m = re.search(r'<meta[^>]+property="og:title"[^>]+content="([^"]*)"', html)
    return _h.unescape(m.group(1)) if m else ""


@app.get("/spotify-playlist")
def spotify_playlist(url: str = ""):
    import requests
    pid = _playlist_id(url)
    if not pid:
        return JSONResponse(status_code=400, content={"error": "That isn't a Spotify playlist link"})
    # 1) the Web API, when it will share this playlist
    try:
        token = _spotify_auth()
    except Exception:  # noqa: BLE001
        token = None
    if token:
        try:
            h = {"Authorization": "Bearer " + token}
            meta = requests.get("https://api.spotify.com/v1/playlists/" + pid, params={"fields": "name"}, headers=h, timeout=10)
            name = meta.json().get("name") if meta.ok else ""
            tracks, nxt = [], "https://api.spotify.com/v1/playlists/%s/items?limit=100" % pid
            while nxt and len(tracks) < 2000:
                r = requests.get(nxt, headers=h, timeout=15)
                if not r.ok:
                    break
                j = r.json()
                for it in j.get("items") or []:
                    t = _as_track(it)
                    if t:
                        tracks.append(t)
                nxt = j.get("next")
            if tracks:
                return {"id": pid, "name": name or "", "source": "api", "partial": False, "tracks": tracks}
        except Exception:  # noqa: BLE001
            pass
    # 2) the playlist's public pages
    best = {"tracks": [], "name": ""}
    last_status = None
    for page in ("https://open.spotify.com/embed/playlist/" + pid, "https://open.spotify.com/playlist/" + pid):
        try:
            r = requests.get(page, headers={"User-Agent": _PL_UA, "Accept-Language": "en"}, timeout=15)
        except Exception as e:  # noqa: BLE001
            last_status = str(e)
            continue
        last_status = r.status_code
        if not r.ok:
            continue
        for blob in _page_data(r.text):
            _find_tracks(blob, best)
        if not best["name"]:
            best["name"] = _og_title(r.text)
        if best["tracks"]:
            break
    if not best["tracks"]:
        if last_status == 404:
            return JSONResponse(status_code=404, content={"error": "Spotify couldn't find that playlist — is it public?"})
        return JSONResponse(status_code=502, content={"error": "Couldn't read that playlist from Spotify"})
    seen, tracks = set(), []
    for t in best["tracks"]:
        k = t["id"] or (t["title"] + "|" + t["artist"])
        if k in seen:
            continue
        seen.add(k)
        tracks.append(t)
    return {"id": pid, "name": best["name"], "source": "page", "partial": len(tracks) >= 100, "tracks": tracks}


# ---- a song from a web page (Import › From a link) ----
_PAGE_MAX = 4 * 1024 * 1024
_VIDEO_HOSTS = ("youtube.com", "youtu.be", "vimeo.com", "soundcloud.com", "tiktok.com", "instagram.com", "spotify.com")


def _public_host(host: str) -> bool:
    import ipaddress
    import socket
    try:
        infos = socket.getaddrinfo(host, None)
    except Exception:  # noqa: BLE001
        return False
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return False
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            return False
    return True


def _html_text(fragment: str) -> str:
    """HTML to plain text, keeping the line breaks a song needs."""
    import html as _h
    import re
    t = re.sub(r"(?is)<(script|style|noscript|svg|template)\b.*?</\1>", "", fragment)
    t = re.sub(r"(?is)<!--.*?-->", "", t)
    t = re.sub(r"(?i)<br\s*/?>", "\n", t)
    t = re.sub(r"(?i)</?(p|div|li|h[1-6]|tr|section|article|header|footer|pre|blockquote)\b[^>]*>", "\n", t)
    t = re.sub(r"(?s)<[^>]+>", "", t)
    t = _h.unescape(t).replace(chr(160), " ").replace("\r\n", "\n").replace("\r", "\n")
    lines = [l.rstrip() for l in t.split("\n")]
    out, blank = [], 0
    for l in lines:
        if l.strip():
            out.append(l); blank = 0
        else:
            blank += 1
            if blank == 1:
                out.append("")
    return "\n".join(out).strip("\n")


def _ug_text(html: str):
    """Ultimate Guitar: the tab is JSON in <div class="js-store" data-content="...">."""
    import html as _h
    import json
    import re
    m = re.search(r'class="js-store"\s+data-content="([^"]+)"', html)
    if not m:
        return None
    try:
        store = json.loads(_h.unescape(m.group(1)))
    except Exception:  # noqa: BLE001
        return None
    found = {"content": None, "song": "", "artist": ""}

    def walk(n):
        if isinstance(n, dict):
            c = n.get("content")
            if isinstance(c, str) and "[ch]" in c and (found["content"] is None or len(c) > len(found["content"])):
                found["content"] = c
            if not found["song"] and isinstance(n.get("song_name"), str):
                found["song"] = n["song_name"]
            if not found["artist"] and isinstance(n.get("artist_name"), str):
                found["artist"] = n["artist_name"]
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)
    walk(store)
    c = found["content"]
    if not c:
        return None
    c = c.replace("\r\n", "\n").replace("\r", "\n")
    c = re.sub(r"\[/?tab\]", "", c)
    c = re.sub(r"\[ch\](.*?)\[/ch\]", r"\1", c)
    return {"title": found["song"], "artist": found["artist"], "text": c.strip("\n"), "kind": "ug"}


def _pre_text(html: str):
    """Chord sites that put the sheet in a <pre> block."""
    import re
    best = ""
    for m in re.finditer(r"(?is)<pre\b[^>]*>(.*?)</pre>", html):
        t = _html_text(m.group(1))
        if len([l for l in t.split("\n") if l.strip()]) >= 4 and len(t) > len(best):
            best = t
    return {"text": best, "kind": "pre"} if best else None


def _lyrics_containers(html: str):
    """Lyrics sites: Genius's data-lyrics-container blocks, AZLyrics's comment-marked block."""
    import re
    parts = []
    for m in re.finditer(r'(?is)<div[^>]*data-lyrics-container="true"[^>]*>', html):
        # take everything up to the matching </div>
        i, depth, j = m.end(), 1, m.end()
        for t in re.finditer(r"(?is)<(/?)div\b[^>]*>", html[i:]):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                j = i + t.start(); break
        parts.append(_html_text(html[i:j]))
    if not parts:
        m = re.search(r"(?is)<!--\s*Usage of azlyrics\.com content.*?-->(.*?)</div>", html)
        if m:
            parts.append(_html_text(m.group(1)))
    text = "\n\n".join(p for p in parts if p.strip())
    return {"text": text, "kind": "lyrics"} if text.strip() else None


_CHORD_TOK = None


def _line_score(l: str) -> float:
    """1 for a line that looks like a sung line or a row of chords, else 0."""
    import re
    global _CHORD_TOK
    if _CHORD_TOK is None:
        _CHORD_TOK = re.compile(r"^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?\d*(?:/[A-G][#b]?)?$")
    s = l.strip()
    if not s or len(s) > 90:
        return 0
    toks = s.split()
    if all(_CHORD_TOK.match(t) for t in toks):
        return 1
    return 1 if 3 <= len(toks) <= 16 else (0.5 if len(toks) == 2 else 0)


def _strip_chrome(html: str) -> str:
    """Drop the parts of a page that are never the song: menus, headers, footers, forms."""
    import re
    t = re.sub(r"(?is)<(nav|header|footer|aside|form|select|button|noscript)\b.*?</\1>", "\n", html)
    return t


def _marked_blocks(html: str):
    """Elements whose class or id says lyrics / chords / song / poem."""
    import re
    out = []
    for m in re.finditer(r'(?is)<(div|section|article|pre|p)\b[^>]*(?:class|id)="[^"]*(?:lyric|chord|song-?text|songbody|poem|tab-?content|verse)[^"]*"[^>]*>', html):
        tag, i, depth, j = m.group(1).lower(), m.end(), 1, len(html)
        for t in re.finditer(r"(?is)<(/?)" + tag + r"\b[^>]*>", html[i:]):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                j = i + t.start(); break
        txt = _html_text(html[i:j])
        if sum(_line_score(l) for l in txt.split("\n")) >= 4:
            out.append(txt)
    return out


def _song_block(html: str):
    """Any other page: a block marked as the lyrics, else the longest run of song-like lines."""
    import re
    body = re.search(r"(?is)<body\b[^>]*>(.*)</body>", html)
    page = _strip_chrome(body.group(1) if body else html)
    marked = _marked_blocks(page)
    if marked:
        best = max(marked, key=lambda t: sum(_line_score(l) for l in t.split("\n")))
        return {"text": best.strip("\n"), "kind": "text"}
    # menus and link lists are never the song
    page = re.sub(r"(?is)<(ul|ol|table)\b.*?</\1>", "\n", page)
    page = re.sub(r"(?is)<a\b[^>]*>.*?</a>", " ", page)
    t = _html_text(page)
    blocks, cur = [], []
    for l in t.split("\n"):
        if len(l.strip()) > 110:                 # prose: a break
            if cur: blocks.append(cur); cur = []
            continue
        cur.append(l)
    if cur:
        blocks.append(cur)
    # split blocks further at runs of 3+ lines that aren't song-like (menus, labels)
    pieces = []
    for b in blocks:
        cur, junk = [], 0
        for l in b:
            sc = _line_score(l)
            if l.strip() and not sc:
                junk += 1
                if junk >= 3:
                    if cur: pieces.append(cur); cur = []
                    continue
            elif sc:
                junk = 0
            cur.append(l)
        if cur:
            pieces.append(cur)

    def score(b):
        return sum(_line_score(l) for l in b)
    best = max(pieces, key=score) if pieces else []
    if score(best) < 4:
        return None
    # trim leading / trailing lines that aren't part of the song
    while best and not _line_score(best[0]):
        best = best[1:]
    while best and not _line_score(best[-1]):
        best = best[:-1]
    return {"text": "\n".join(best).strip("\n"), "kind": "text"}


def _page_title(html: str, host: str = ""):
    import html as _h
    import re
    m = re.search(r'(?is)<meta[^>]+property="og:title"[^>]+content="([^"]*)"', html) or re.search(r"(?is)<title[^>]*>(.*?)</title>", html)
    t = _h.unescape(m.group(1)).strip() if m else ""
    t = re.sub(r"\s*[|•·]\s*[^|•·]*$", "", t).strip()          # " | Site name"
    t = re.sub(r"\s+@\s+\S+$", "", t).strip()                    # " @ Site.com"
    site = [p for p in (host or "").split(".") if p not in ("www", "m", "en", "com", "org", "net", "co", "uk", "io")]
    if site:                                                    # " - Site name, the free library"
        t = re.sub(r"\s+[–—-]\s+[^–—-]*" + re.escape(site[0]) + r"[^–—-]*$", "", t, flags=re.I).strip()
    title, artist = t, ""
    m = re.match(r"(?i)^(.*?)\s+(?:ukulele |guitar |bass )?(?:chords|tabs?|lyrics(?: and chords)?)\s+by\s+(.+)$", t)
    if m:
        title, artist = m.group(1), m.group(2)
    else:
        m = re.match(r"^(.+?)\s+[–—-]\s+(.+?)\s+(?:lyrics|chords|tabs?)\b.*$", t, re.I)
        if m:
            artist, title = m.group(1), m.group(2)
        else:
            title = re.sub(r"(?i)\s+(?:lyrics|chords|tabs?)$", "", t)
    title = re.sub(r"(?i)\s*\((?:official )?(?:lyrics|chords)\)\s*$", "", title).strip(" \"'“”")
    return title.strip(), artist.strip()


def _read_page(url: str):
    import requests
    url = (url or "").strip()
    if not url.lower().startswith(("http://", "https://")):
        return 400, {"error": "Send a link that starts with https://"}
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    if not host:
        return 400, {"error": "That doesn't look like a link"}
    if any(host == h or host.endswith("." + h) for h in _VIDEO_HOSTS):
        return 422, {"error": "That's a video or music link. Import › From a link reads web pages with lyrics or chords on them; for a recording, upload the audio file."}
    if not _public_host(host):
        return 400, {"error": "That address can't be reached from Singa's server"}
    try:
        hdrs = {"User-Agent": _PL_UA, "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5", "Accept-Language": "en"}
        r = None
        for _hop in range(6):                     # follow redirects, checking every address
            r = requests.get(url, headers=hdrs, timeout=15, stream=True, allow_redirects=False)
            if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
                url = urllib.parse.urljoin(url, r.headers["location"])
                nh = (urllib.parse.urlparse(url).hostname or "").lower()
                if not url.lower().startswith(("http://", "https://")) or not _public_host(nh):
                    return 400, {"error": "That address can't be reached from Singa's server"}
                r.close()
                continue
            break
        if r.status_code in (301, 302, 303, 307, 308):
            return 502, {"error": "That page keeps redirecting"}
        if r.status_code in (401, 403, 429, 503):
            return 502, {"error": "That site wouldn't let Singa read the page (it blocks automatic readers). Copy the lyrics into Manual instead."}
        if not r.ok:
            return 502, {"error": "The page answered with an error (%s)" % r.status_code}
        raw = r.raw.read(_PAGE_MAX + 1, decode_content=True)
        if len(raw) > _PAGE_MAX:
            return 413, {"error": "That page is too large to read"}
        ctype = (r.headers.get("content-type") or "").lower()
        enc = r.encoding if r.encoding and r.encoding.lower() != "iso-8859-1" else None
        if not enc:
            import re as _re
            mm = _re.search(rb"""charset=["']?([A-Za-z0-9_-]+)""", raw[:6000])
            enc = mm.group(1).decode("ascii") if mm else "utf-8"
        try:
            html = raw.decode(enc, errors="replace")
        except LookupError:
            html = raw.decode("utf-8", errors="replace")
        host = (urllib.parse.urlparse(url).hostname or host).lower()
    except requests.exceptions.Timeout:
        return 504, {"error": "The page took too long to answer"}
    except Exception as e:  # noqa: BLE001
        return 502, {"error": "Couldn't open that page: " + str(e)[:200]}
    if "text/plain" in ctype:
        return 200, {"title": "", "artist": "", "text": html.strip(), "site": host, "kind": "text"}
    if "html" not in ctype and "<html" not in html[:2000].lower():
        return 422, {"error": "That link isn't a web page Singa can read"}
    res = _ug_text(html) or _lyrics_containers(html) or _pre_text(html) or _song_block(html)
    if not res or not res.get("text", "").strip():
        return 422, {"error": "Couldn't find a song on that page"}
    t, a = _page_title(html, host)
    res.setdefault("title", ""); res.setdefault("artist", "")
    if not res["title"]:
        res["title"], res["artist"] = t, res["artist"] or a
    res["site"] = host
    if len(res["text"]) > 60000:
        res["text"] = res["text"][:60000]
    return 200, res


@app.post("/fetch-page")
def fetch_page(payload: dict = Body(...)):
    code, body = _read_page(str((payload or {}).get("url") or ""))
    return body if code == 200 else JSONResponse(status_code=code, content=body)


@app.get("/fetch-page")
def fetch_page_get(url: str = ""):
    code, body = _read_page(url)
    return body if code == 200 else JSONResponse(status_code=code, content=body)


@app.get("/")
async def health():
    return {"status": "ok", "service": "singa-chord-recognition"}
