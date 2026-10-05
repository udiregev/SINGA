"use strict";
function renderNickModal(){
  return `<div class="modal-backdrop" data-act="closeEditNick"><div class="modal" style="max-width:380px" onclick="event.stopPropagation()">
    <div class="mhead"><span style="font-size:21px;font-weight:600">Nickname</span><span class="icon-btn" data-act="closeEditNick">${icon('close',22)}</span></div>
    <label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Shown to collaborators and your audience</span><input style="border:0;outline:none;font-size:16px;font-weight:600" value="${esc(ST.editNick)}" data-bind="nickInput" data-key="saveNickname" autofocus></label>
    <button class="btn" style="background:${ST.editNick.trim()?'#1b1b1b':'#d6d6d6'};color:#fff;margin-top:6px" data-act="saveNickname">Save</button>
  </div></div>`;
}

function renderModals(){
  let html = '';
  if(ST.gigSettings) html += renderGigSettingsModal();
  if(ST.upgrade) html += renderUpgradeModal();
  if(ST.pick || ST.songPick) html += renderPickerModal();
  if(ST.newItem) html += renderNewModal();
  if(ST.collabEdit) html += renderCollabEditModal();
  if(ST.editNick!=null) html += renderNickModal();
  return html;
}
/* ============================================================
   RENDER DISPATCH
   ============================================================ */
function render(){
  document.body.classList.toggle('dark-invert', ST.perfDark);
  document.getElementById('darkToggle').style.display = ST.screen==='login' ? 'none' : 'flex';
  document.getElementById('darkPill').style.background = ST.perfDark ? '#1b1b1b' : '#fff';
  document.getElementById('darkDot').style.left = (ST.perfDark?20:2)+'px';
  document.getElementById('darkDot').style.background = ST.perfDark ? '#fff' : '#1b1b1b';
  let html = '';
  switch(ST.screen){
    case 'login': html = renderLogin(); break;
    case 'home': html = renderHome(); break;
    case 'list': html = renderList(); break;
    case 'search': html = renderSearch(); break;
    case 'account': html = renderAccount(); break;
    case 'collab': html = renderCollab(); break;
    case 'create': html = renderCreate(); break;
    case 'done': html = renderDone(); break;
    case 'incomplete': html = renderIncomplete(); break;
    case 'song': html = renderSong(); break;
    case 'practice': html = renderPractice(); break;
    case 'gig': html = renderGig(); break;
    case 'gigphotos': html = renderGigPhotos(); break;
    case 'gigedit': html = renderGigEdit(); break;
    case 'gigplayer': html = renderGigPlayer(); break;
    default: html = renderHome();
  }
  document.getElementById('screen').innerHTML = html;
  document.getElementById('modalLayer').innerHTML = renderModals();
  document.getElementById('toastBox').innerHTML = ST.toast ? `<div class="toast">${esc(ST.toast)}</div>` : '';
  // autofocus search on search screen
  if(ST.screen==='search'){ const el = document.querySelector('#screen input[data-bind="searchQuery"]'); if(el){ el.focus(); const v=el.value; el.value=''; el.value=v; } }
  // scroll current lyric line into view
  const sc = document.getElementById('lyricsScroll');
  if(sc){ const cur = sc.querySelector('[data-cur]'); }
  // keep the chord-root spinner's scroll position in sync with ST.rootIdx
  // across any re-render that isn't itself caused by scrolling it
  const rs = document.getElementById('rootScroller');
  if(rs){
    const want = ST.rootIdx*100;
    if(Math.abs(rs.scrollLeft-want)>1){ ST._lastProgScrollAt = Date.now(); rs.scrollLeft = want; }
  }
}

/* ============================================================
   ACTIONS
   ============================================================ */
function autoChordsFor(lyrics){
  const cyc = ['Am','F','G','C'], out = {};
  parseLyrics(lyrics).forEach((ws,li)=>{ out[li+'-0']=cyc[li%4]; if(ws.length>3) out[li+'-'+Math.floor(ws.length/2)]=cyc[(li+1)%4]; });
  return out;
}
function openSongOrIncomplete(id, from){
  stopOnsetListening();
  const s = song(id);
  const ok = s.lyrics && s.lyrics.trim();
  ST.songId = id; ST.viewBy=null; ST.viewChord=null; ST.menu=false; ST.instMenu=false; ST.ctx='view'; ST.t=0; ST.playing=false; ST.vcd=0; ST.listening=false; ST.sortOpen=false;
  ST.screen = ok ? 'song' : 'incomplete';
  ST.back = from || ST.screen;
}
function newSongDraft(){
  const id = 'n'+Date.now();
  D.songs[id] = { id, title:'', sub:'', lyrics:'', chords:{}, notes:{}, synced:false, plays:0, added:Date.now(), mine:true };
  D.order = [id, ...D.order];
  ST.editId = id; ST.screen='create'; ST.createMode='manual'; ST.step='lyrics'; ST.phase='idle'; ST.selWord=null; ST.similar=false; ST.menu=false; ST.isPublic=false; ST.sortOpen=false;
}
function finishSong(){
  const id = ST.editId, s = D.songs[id];
  const patch = { synced:true };
  if(!s.lyrics.trim()) patch.lyrics = EX_LYRICS;
  if(!s.title.trim()) patch.title = "Don't Go Breaking My Heart";
  if(!Object.keys(s.chords).length || ST.autoChords) patch.chords = autoChordsFor(patch.lyrics || s.lyrics);
  Object.assign(s, patch);
  ST.phase='idle'; ST.procPct=0; ST.procNote=''; ST.screen='done'; ST.autoChords=false; ST.songId=id;
}

/* ============================================================
   REAL AUDIO ENGINE
   Replaces the old simulated recording (random waveform bars, a fake
   progress bar, then a canned demo song regardless of what you did) with
   real microphone / file capture, real speech-to-text, and real
   force-aligned per-word timestamps — ported from song-builder.html's
   working engine. Vocal isolation (on-device Demucs) is NOT ported yet;
   chords are still assigned from the built-in pattern-based guesser
   (autoChordsFor) rather than detected from the recording's pitch.
   ============================================================ */
let liveStream=null, liveRecorder=null, liveChunks=[], liveAudioCtx=null, liveAnalyser=null, liveDataArr=null, liveAborting=false, recordingStartPending=false;

function sampleLiveLevel(){
  if(!liveAnalyser || !liveDataArr) return null;
  liveAnalyser.getByteTimeDomainData(liveDataArr);
  let sum=0;
  for(let i=0;i<liveDataArr.length;i++){ const v=(liveDataArr[i]-128)/128; sum+=v*v; }
  const rms = Math.sqrt(sum/liveDataArr.length);
  return Math.max(4, Math.min(100, Math.round(rms*420)+8));
}

async function beginRealRecording(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    toast('Microphone not available on this device/browser'); ST.phase='idle'; render(); return;
  }
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
  catch(err){ toast('Mic error: '+(err && err.name || err)); ST.phase='idle'; render(); return; }
  let recorder;
  try{ recorder = new MediaRecorder(stream); }
  catch(err){ toast('Recording is not supported in this browser'); stream.getTracks().forEach(t=>t.stop()); ST.phase='idle'; render(); return; }
  const actx = new (window.AudioContext||window.webkitAudioContext)();
  const src = actx.createMediaStreamSource(stream);
  const analyser = actx.createAnalyser(); analyser.fftSize = 256;
  src.connect(analyser);
  liveStream=stream; liveRecorder=recorder; liveAudioCtx=actx; liveAnalyser=analyser;
  liveDataArr = new Uint8Array(analyser.frequencyBinCount);
  liveChunks = []; liveAborting = false;
  recorder.ondataavailable = e=>{ if(e.data && e.data.size>0) liveChunks.push(e.data); };
  recorder.onstop = async ()=>{
    const chunks = liveChunks, mimeType = recorder.mimeType || 'audio/webm', wasAborting = liveAborting;
    stream.getTracks().forEach(t=>t.stop());
    actx.close().catch(()=>{});
    liveStream=null; liveRecorder=null; liveAudioCtx=null; liveAnalyser=null; liveDataArr=null; liveChunks=[]; liveAborting=false;
    if(wasAborting){ ST.phase='idle'; ST.bars=[]; render(); return; }
    const blob = new Blob(chunks, { type: mimeType });
    const s = D.songs[ST.editId];
    await processRecordingBlob(s, blob);
  };
  recorder.start();
  ST.phase='recording'; ST.recT=0; ST.bars=[]; render();
}

function decodeToFloat32Mono16k(blob){
  return blob.arrayBuffer().then(arrayBuf=>{
    const tmpCtx = new (window.AudioContext||window.webkitAudioContext)();
    return tmpCtx.decodeAudioData(arrayBuf.slice(0)).then(decoded=>{
      const durationSec = decoded.duration;
      const targetLen = Math.max(1, Math.ceil(durationSec*16000));
      const offline = new OfflineAudioContext(1, targetLen, 16000);
      const bufSrc = offline.createBufferSource();
      bufSrc.buffer = decoded; bufSrc.connect(offline.destination); bufSrc.start();
      return offline.startRendering().then(rendered=>{
        tmpCtx.close().catch(()=>{});
        return { float32: rendered.getChannelData(0), durationSec };
      });
    });
  });
}

function normWord(w){ return (w||'').toLowerCase().replace(/[^a-z0-9'’]/g,''); }

// Classic edit-distance alignment of the typed/recognized lyric words (ref)
// against the speech-recognizer's words (hyp) — for each ref word, finds the
// best-matching hyp word (or null), so real timestamps can be looked up.
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
