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

## Deploying it on Railway (same account used for the Between app)

1. Push this `server/` folder to its own spot in your GitHub repo (it's
   already there if you got this file from the Singa repo).
2. On [railway.com](https://railway.com), "New Project" → "Deploy from GitHub
   repo" → pick the `SINGA` repo.
3. Open the new service's **Settings** tab and set **Root Directory** to
   `server` — this tells Railway to build only that folder, where it'll find
   the `Dockerfile` and use it automatically.
4. Still in Settings, under **Networking → Public Networking**, click
   **Generate Domain**. Railway doesn't hand out a public web address
   automatically — you have to ask for one once, and it'll look like
   `https://singa-chords-production.up.railway.app`.
5. Paste that URL into the "AI chord analysis" box on `test-analysis.html`
   and click "Analyze chords with AI".

Cost is usage-based (CPU + memory time), not a flat monthly fee — roughly
$10-20/month to keep a small instance like this running all the time,
offset by the plan's included monthly credit (check Railway's current
pricing page for exact numbers, since this changes). An instance that's only
used occasionally costs less; Railway doesn't force a cold-start sleep the
way some free tiers do, but you pay for whatever time it's actually running.

## Deploying it elsewhere

Any other platform that runs a Dockerfile (Render, Fly.io, a plain VM) works
the same way — there's nothing Railway-specific in the code itself.

## Testing it directly (without the browser page)

```bash
curl -F "file=@/path/to/your/recording.m4a" https://your-deployed-url/analyze-chords
```

## If this becomes a paid feature

This runs real inference per request — not free at any real volume. If
chord detection ends up gated behind a paid tier in Singa (as opposed to
this test page), metering or paywalling this specific endpoint — leaving
the free in-browser heuristic available to everyone — is a reasonable way
to keep hosting costs tied to actual paying usage.
