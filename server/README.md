# Singa — AI chord recognition server

A small, real deep-learning chord recognizer, built because the in-browser
Goertzel/template heuristic in `test-analysis.html` is provably unreliable on
real recordings where vocals are mixed over an instrument (verified directly
against a real test recording — see the main repo's test notes). This server
uses [madmom](https://madmom.readthedocs.io/)'s `DeepChromaProcessor` (a CNN
for chroma feature extraction) + `DeepChromaChordRecognitionProcessor` (a CRF
chord-sequence decoder) — a genuinely learned model, not a hand-rolled
heuristic. It has been verified end to end: tested against a synthetic
ground-truth suite of 8 real guitar chord voicings (8/8 correct) and against
a real recording, where it produced a clean, correct progression that was
confirmed against the actual chords played.

This can't run in the browser — madmom is Python-only and depends on old,
unmaintained C extensions — so it needs to run on a small server you deploy
yourself. `test-analysis.html` already has a "AI chord analysis" box in its
Chord timeline panel that calls whatever URL you deploy this to.

## What's here

- `app.py` — a FastAPI app exposing `POST /analyze-chords` (upload an audio
  file, get back `{"chords": [{"start", "end", "label"}, ...]}`).
- `requirements.txt` — pinned dependency versions. madmom hasn't had a real
  release since 2018 and only works with older numpy/scipy/setuptools — these
  exact versions are load-bearing, not arbitrary.
- `Dockerfile` — builds the whole thing, including `ffmpeg` (to decode
  whatever format gets uploaded) and the two-pass pip install madmom needs.

## Deploying it (Render.com, free/cheapest path)

1. Push this `server/` folder to its own spot in your GitHub repo (it's
   already there if you got this file from the Singa repo).
2. On [render.com](https://render.com), "New +" → "Web Service" → connect
   your GitHub repo → set **Root Directory** to `server` → Render will detect
   the `Dockerfile` automatically.
3. Pick an instance size. The free tier works for testing but spins down
   after inactivity (the first request after a while will be slow — 30-60s —
   while it wakes back up and loads the model). A paid "Starter" instance
   avoids that cold start, which matters if this becomes a real feature.
4. Deploy. Render gives you a URL like `https://singa-chords.onrender.com`.
5. Paste that URL into the "AI chord analysis" box on `test-analysis.html`
   and click "Analyze chords with AI".

Any other platform that runs a Dockerfile (Railway, Fly.io, a plain VM) works
the same way — there's nothing Render-specific in the code itself.

## Testing it directly (without the browser page)

```bash
curl -F "file=@/path/to/your/recording.m4a" https://your-deployed-url/analyze-chords
```

## Cost note

This runs real inference per request — not free at any real volume. If this
becomes a paid feature in Singa (as opposed to this test page), budget for
either: (a) an always-on small instance (predictable monthly cost, no cold
starts), or (b) a scale-to-zero platform (cheaper at low volume, but the
first request after idle time is slow). Either way, metering/paywalling this
specific endpoint (vs. the free in-browser heuristic) is a reasonable way to
keep hosting costs tied to actual paying usage.
