"use strict";
function alignSequences(ref, hyp){
  const n=ref.length, m=hyp.length;
  const dp = Array.from({length:n+1}, ()=>new Array(m+1).fill(0));
  for(let i=0;i<=n;i++) dp[i][0]=i;
  for(let j=0;j<=m;j++) dp[0][j]=j;
  for(let i=1;i<=n;i++) for(let j=1;j<=m;j++){
    const cost = ref[i-1]===hyp[j-1] ? 0 : 1;
    dp[i][j] = Math.min(dp[i-1][j-1]+cost, dp[i-1][j]+1, dp[i][j-1]+1);
  }
  const mapping = new Array(n).fill(null);
  let i=n, j=m;
  while(i>0 && j>0){
    const cost = ref[i-1]===hyp[j-1] ? 0 : 1;
    if(dp[i][j]===dp[i-1][j-1]+cost){ mapping[i-1]=j-1; i--; j--; }
    else if(dp[i][j]===dp[i-1][j]+1){ i--; }
    else { j--; }
  }
  return mapping;
}

// Fills in a timestamp for every ref word: matched words get the real
// recognized timestamp, unmatched ones are linearly interpolated between
// their nearest matched neighbors (or extrapolated at the ends).
function fillTimestamps(mapping, hypWords, totalDuration){
  const n = mapping.length;
  const ts = new Array(n).fill(null);
  for(let i=0;i<n;i++){ if(mapping[i]!=null && hypWords[mapping[i]]) ts[i] = hypWords[mapping[i]].start; }
  let lastIdx=-1, lastT=0;
  for(let i=0;i<n;i++){
    if(ts[i]==null) continue;
    if(lastIdx===-1 && i>0){ for(let k=0;k<i;k++) ts[k] = ts[i]*(k+1)/(i+1); }
    else if(i-lastIdx>1){ const span=ts[i]-lastT; for(let k=lastIdx+1;k<i;k++) ts[k] = lastT+span*(k-lastIdx)/(i-lastIdx); }
    lastIdx=i; lastT=ts[i];
  }
  if(lastIdx===-1){ for(let k=0;k<n;k++) ts[k] = totalDuration*(k+1)/(n+1); }
  else if(lastIdx<n-1){ const span=Math.max(0,totalDuration-lastT); for(let k=lastIdx+1;k<n;k++) ts[k] = lastT+span*(k-lastIdx)/(n-lastIdx); }
  return ts;
}

// The real pipeline: decode the take, transcribe it with an on-device speech
// model, then either (a) force-align it against lyrics you already typed, or
// (b) — if you recorded/uploaded with no typed lyrics — use the real
// transcription AS the lyrics. Runs entirely client-side (Transformers.js +
// Whisper-tiny.en, loaded from a CDN on first use).
async function processRecordingBlob(songObj, blob){
  const hadManualLyrics = !!(songObj.lyrics && songObj.lyrics.trim());
  ST.phase='processing'; ST.procPct=5; ST.procNote='Listening back to your take…'; render();
  try{
    const { float32, durationSec } = await decodeToFloat32Mono16k(blob);
    ST.procPct=20; render();
    ST.procNote='Loading the speech model (first time only)…'; render();
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    ST.procPct=35; render();
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
    ST.procPct=55; ST.procNote='Transcribing your words…'; render();
    const output = await transcriber(float32, { return_timestamps:'word', chunk_length_s:30, stride_length_s:5 });
    ST.procPct=82; ST.procNote='Lining up every word…'; render();
    const hypWords = (output.chunks||[]).map(c=>({
      text: (c.text||'').trim(),
      norm: normWord(c.text),
      start: (c.timestamp && typeof c.timestamp[0]==='number') ? c.timestamp[0] : 0,
    })).filter(w=>w.norm);

    if(hadManualLyrics){
      const refWords = [];
      parseLyrics(songObj.lyrics).forEach(ws=>ws.forEach(w=>refWords.push(normWord(w))));
      const mapping = alignSequences(refWords, hypWords.map(w=>w.norm));
      songObj.wordTimestamps = fillTimestamps(mapping, hypWords, durationSec);
    } else {
      const WORDS_PER_LINE = 7;
      const rawWords = hypWords.map(w=>w.text).filter(Boolean);
      if(rawWords.length){
        const lines = [];
        for(let i=0;i<rawWords.length;i+=WORDS_PER_LINE) lines.push(rawWords.slice(i,i+WORDS_PER_LINE).join(' '));
        songObj.lyrics = lines.join('\n');
        songObj.wordTimestamps = hypWords.map(w=>w.start);
      }
    }
    songObj.audioDurationSec = durationSec;
    songObj.synced = true;
    ST.procPct=100; ST.procNote='Done'; render();
  }catch(err){
    console.error('Singa: speech alignment failed, falling back to estimated timing', err);
    toast("Couldn't analyze the audio — using estimated timing instead");
    songObj.wordTimestamps = null; songObj.audioDurationSec = null; songObj.synced = true;
  }
  finishSong();
  render();
}

// Real "Start detection" playback mode: listens to the mic and auto-starts
// (sets ST.playing/ST.gListening=true) the instant it hears you begin, via a
// rolling energy-threshold onset detector (ported from song-builder.html's
// startListeningForCue). onTrigger is called once, then listening stops.
let onsetCtx=null, onsetStream=null, onsetRaf=null;
function stopOnsetListening(){
  if(onsetRaf!=null){ cancelAnimationFrame(onsetRaf); onsetRaf=null; }
  if(onsetStream){ onsetStream.getTracks().forEach(t=>t.stop()); onsetStream=null; }
  if(onsetCtx){ onsetCtx.close().catch(()=>{}); onsetCtx=null; }
}
async function startOnsetListening(onTrigger){
  stopOnsetListening();
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toast('Microphone not available on this device/browser'); return; }
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
  catch(err){ toast('Mic error: '+(err && err.name || err)); return; }
  onsetStream = stream;
  const actx = new (window.AudioContext||window.webkitAudioContext)();
  onsetCtx = actx;
  const source = actx.createMediaStreamSource(stream);
  const analyser = actx.createAnalyser();
  analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.2;
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const HISTORY_LEN=43, THRESHOLD_MULT=1.6, MIN_ENERGY_FLOOR=12, REFRACTORY_MS=180;
  let energyHistory=[], lastOnsetTime=0;
  const avg = a=>a.reduce((x,y)=>x+y,0)/a.length;
  const sd = (a,m)=>Math.sqrt(a.reduce((x,y)=>x+(y-m)*(y-m),0)/a.length);
  function frame(){
    if(onsetCtx!==actx) return; // superseded by a newer call
    analyser.getByteFrequencyData(dataArray);
    const binStart=Math.floor(dataArray.length*0.02), binEnd=Math.floor(dataArray.length*0.5);
    let sum=0; for(let i=binStart;i<binEnd;i++) sum+=dataArray[i];
    const energy = sum/(binEnd-binStart);
    energyHistory.push(energy); if(energyHistory.length>HISTORY_LEN) energyHistory.shift();
    const mean=avg(energyHistory), std=sd(energyHistory,mean);
    const threshold = Math.max(MIN_ENERGY_FLOOR, mean+THRESHOLD_MULT*std);
    const now = performance.now();
    if(energy>threshold && energy>MIN_ENERGY_FLOOR && (now-lastOnsetTime)>REFRACTORY_MS && energyHistory.length>=15){
      lastOnsetTime = now;
      stopOnsetListening();
      onTrigger();
      return;
    }
    onsetRaf = requestAnimationFrame(frame);
  }
  onsetRaf = requestAnimationFrame(frame);
}
