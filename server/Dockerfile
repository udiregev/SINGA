FROM python:3.11-slim

# ffmpeg: decodes whatever format the browser uploads (m4a/mp3/webm/...) to WAV.
# build-essential + libsndfile1: madmom has Cython extensions and soundfile
# needs libsndfile at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg build-essential libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# madmom (last released 2018) needs an old setuptools (pre-distutils-removal)
# plus numpy/Cython already present at its own build time, so these install
# in two passes rather than one `pip install -r requirements.txt`.
RUN pip install --no-cache-dir \
    setuptools==59.8.0 numpy==1.23.5 scipy==1.10.1 Cython==3.3.0 mido==1.3.3 soundfile==0.14.0 \
    fastapi==0.115.0 "uvicorn[standard]==0.30.6" python-multipart==0.0.9
RUN pip install --no-cache-dir --no-build-isolation madmom==0.16.1

# "Embed link" (POST /fetch-audio): yt-dlp downloads the audio from YouTube
# and most other sites. Left unpinned on purpose — sites change and yt-dlp
# ships fixes often, so every rebuild picks up the latest. YouTube also needs
# a JavaScript runtime for yt-dlp, which is what Deno is here for.
RUN pip install --no-cache-dir -U "yt-dlp[default]"
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

COPY app.py .

ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
