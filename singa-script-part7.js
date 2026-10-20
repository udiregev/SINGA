"use strict";
function renderNewModal(){
  const ni = ST.newItem;
  const heading = ni.kind==='playlist' ? 'New playlist' : 'New gig';
  const placeholder = ni.kind==='playlist' ? 'e.g. Campfire songs' : "e.g. Maya's birthday";
  return `<div class="modal-backdrop" data-act="closeNew"><div class="modal" style="max-width:420px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">${heading}</span><span class="icon-btn" data-act="closeNew">${icon('close',22)}</span></div>
    <label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Name</span><input style="border:0;outline:none;font-size:16px;font-weight:600" placeholder="${placeholder}" value="${esc(ni.name)}" data-bind="newName" data-key="createNew" autofocus></label>
    ${ni.kind==='gig'?`<label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Date</span><input style="border:0;outline:none;font-size:16px;font-weight:600" placeholder="e.g. Oct 12, 2026" value="${esc(ni.date)}" data-bind="newDate" data-key="createNew"></label>`:''}
    <button class="btn" style="background:${ni.name.trim()?'#1b1b1b':'#d6d6d6'};color:#fff;margin-top:6px" data-act="createNew">Create</button>
  </div></div>`;
}

function renderCollabEditModal(){
  const ce = ST.collabEdit;
  const heading = ce.i==null ? 'Add Collaborator' : 'Edit Collaborator';
  const gigRows = D.gigs.map(g=>{ const on = ce.gigs.includes(g.id); return `<div class="row" style="gap:14px;padding:9px 0;cursor:pointer" data-act="toggleCeGig" data-id="${g.id}">
    <div class="toggle" style="background:${on?'#1b1b1b':'#fff'}"><div class="dot" style="left:${on?20:2}px;background:${on?'#fff':'#1b1b1b'}"></div></div>
    <span style="font-size:14px;font-weight:600">${esc(g.title)}</span></div>`; }).join('');
  return `<div class="modal-backdrop" data-act="closeCollabEdit"><div class="modal" style="max-width:440px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">${heading}</span><span class="icon-btn" data-act="closeCollabEdit">${icon('close',22)}</span></div>
    <label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Name</span><input style="border:0;outline:none;font-size:16px;font-weight:600" value="${esc(ce.name)}" data-bind="ceName"></label>
    <label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Email</span><input style="border:0;outline:none;font-size:16px;font-weight:600" value="${esc(ce.email)}" data-bind="ceEmail"></label>
    <div style="font-size:12px;color:#8a8a8a;margin-top:6px">Gigs</div>
    <div>${gigRows}</div>
    <button class="btn btn-dark" style="margin-top:8px" data-act="saveCollab">Save</button>
  </div></div>`;
}

function renderNickModal(){
  return `<div class="modal-backdrop" data-act="closeEditNick"><div class="modal" style="max-width:380px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">Nickname</span><span class="icon-btn" data-act="closeEditNick">${icon('close',22)}</span></div>
    <label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Shown to collaborators and your audience</span><input style="border:0;outline:none;font-size:16px;font-weight:600" value="${esc(ST.editNick)}" data-bind="nickInput" data-key="saveNickname" autofocus></label>
    <button class="btn" style="background:${ST.editNick.trim()?'#1b1b1b':'#d6d6d6'};color:#fff;margin-top:6px" data-act="saveNickname">Save</button>
  </div></div>`;
}

function renderVerifyModal(){
  return `<div class="modal-backdrop" data-act="closeVerifyModal"><div class="modal" style="max-width:380px;text-align:center;align-items:center;gap:14px" onclick="modalClick(event)">
    <div class="mhead" style="width:100%"><span style="font-size:21px;font-weight:600">Verify your email</span><span class="icon-btn" data-act="closeVerifyModal">${icon('close',22)}</span></div>
    <div style="font-size:14px;color:#6f6f6f;line-height:1.5">We sent a confirmation link to <b>${esc(ST.email)}</b>. Verify it before saving songs, gigs, or playlists — until then, nothing you create here will be saved.</div>
    <button class="btn btn-dark" style="width:100%" data-act="resendVerifyEmail">Resend email</button>
    <a class="link" data-act="closeVerifyModal">Got it</a>
  </div></div>`;
}

function modalClick(e){
  // Let clicks on any actionable element inside the modal (the X button,
  // Save/Create, etc.) bubble up to the document's delegated handler;
  // swallow clicks that land on blank modal padding so they don't fall
  // through to the backdrop's close handler.
  const actEl = e.target.closest('[data-act]');
  if(actEl && e.currentTarget.contains(actEl)) return;
  e.stopPropagation();
}
function renderModals(){
  let html = '';
  if(ST.gigSettings) html += renderGigSettingsModal();
  if(ST.upgrade) html += renderUpgradeModal();
  if(ST.pick || ST.songPick) html += renderPickerModal();
  if(ST.newItem) html += renderNewModal();
  if(ST.collabEdit) html += renderCollabEditModal();
  if(ST.editNick!=null) html += renderNickModal();
  if(ST.verifyModal) html += renderVerifyModal();
  // The chord/markings-step note editor now floats as a modal popup (over
  // the lyrics, not squeezed in below them) instead of being part of the
  // normal in-flow layout.
  if(ST.step==='markings' && ST.selWord!=null && ST.editId && D.songs[ST.editId]) html += renderNoteEditor(D.songs[ST.editId]);
  return html;
}
/* ============================================================
   RENDER DISPATCH
   ============================================================ */
const DARK_MODE_SCREENS = ['gig','song','practice','gigplayer'];
let _prevRenderScreen = null;
function render(){
  // A render triggered by the 100ms playback/recording/sampling tick
  // redraws the current screen's markup from scratch every time. Without
  // this check that replays the .scr mount-in animation (translateY+fade)
  // on every single tick, which is what was showing up as a flicker on the
  // countdown/recording and "Play Sample" screens. Only play the entrance
  // animation when we're actually navigating to a different screen.
  const sameScreen = _prevRenderScreen === ST.screen;
  _prevRenderScreen = ST.screen;
  const darkAllowed = DARK_MODE_SCREENS.includes(ST.screen);
  document.body.classList.toggle('dark-invert', ST.perfDark && darkAllowed);
  document.getElementById('darkToggle').style.display = darkAllowed ? 'flex' : 'none';
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
    case 'gigmessages': html = renderGigMessages(); break;
    case 'gigedit': html = renderGigEdit(); break;
    case 'gigplayer': html = renderGigPlayer(); break;
    default: html = renderHome();
  }
  document.getElementById('screen').innerHTML = html;
  document.getElementById('modalLayer').innerHTML = renderModals();
  document.getElementById('toastBox').innerHTML = ST.toast ? `<div class="toast">${esc(ST.toast)}</div>` : '';
  if(sameScreen){
    const scrEl = document.querySelector('#screen .scr');
    if(scrEl) scrEl.style.animation = 'none';
  }
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
  // chord-chip row chevrons: recompute every render, since content (and so
  // overflow) can change — e.g. switching root letter or adding a recent chord
  ['chordVariantRow','recentChordRow'].forEach(updateChipRowChevrons);
  // Keep the chords/markings editor's fixed ~4-line lyrics viewport scrolled
  // so the line you're currently working on sits as the 2nd of the visible
  // rows — like a typewriter margin — clamping at the very top of the first
  // line and the very bottom of the last one.
  const els = document.getElementById('editorLyricsScroll');
  if(els){
    const lineEls = els.querySelectorAll('.lline');
    if(lineEls.length){
      const rowH = els.scrollHeight / lineEls.length;
      const maxScroll = Math.max(0, els.scrollHeight - els.clientHeight);
      const want = Math.max(0, Math.min(maxScroll, (ST.editorLine-1)*rowH));
      if(Math.abs(els.scrollTop-want)>1) els.scrollTop = want;
    }
  }
  // make the native/browser Back button act as in-app Back instead of
  // leaving the app: push a history entry whenever the screen changes,
  // and pop one in the 'popstate' listener below instead of re-pushing.
  if(_histScreen===null){
    _histScreen = ST.screen;
    try{ history.replaceState({screen:ST.screen}, '', location.href); }catch(e){}
  } else if(_histScreen!==ST.screen){
    if(!_poppingHistState){
      try{ history.pushState({screen:ST.screen}, '', location.href); }catch(e){}
    }
    _histScreen = ST.screen;
  }
}
let _histScreen = null, _poppingHistState = false;
window.addEventListener('popstate', function(e){
  _poppingHistState = true;
  stopOnsetListening();
  ST.screen = (e.state && e.state.screen) || 'home';
  ST.menu=false; ST.qrOpen=false; ST.sortOpen=false;
  render();
  _poppingHistState = false;
});

/* ============================================================
   ACTIONS
   ============================================================ */
function autoChordsFor(lyrics){
  const cyc = ['Am','F','G','C'], out = {};
  parseLyrics(lyrics).forEach((ws,li)=>{ out[li+'-0']=cyc[li%4]; if(ws.length>3) out[li+'-'+Math.floor(ws.length/2)]=cyc[(li+1)%4]; });
  return out;
}
// Pattern recognition for chords: when a chord is placed on word `wi` of
// line `li`, any OTHER line whose text is identical (e.g. a repeated verse
// or chorus line) gets the same chord at the same word position — but only
// where that spot is still empty, so it never overwrites a chord the user
// already set differently on a particular repeat.
function applyChordPatternToRepeats(s, li, wi, chordVal){
  if(isNaN(li) || isNaN(wi)) return;
  const lines = parseLyrics(s.lyrics);
  const ws0 = lines[li]; if(!ws0 || isHeaderLine(ws0)) return;
  const target = ws0.join(' ').toLowerCase();
  if(!target) return;
  lines.forEach((ws, i)=>{
    if(i===li || isHeaderLine(ws)) return;
    if(ws.join(' ').toLowerCase() !== target) return;
    const id = i+'-'+wi;
    if(wi < ws.length && !s.chords[id]) s.chords[id] = chordVal;
  });
}
/* ============================================================
   CHORD-SHEET TEXT IMPORT ("From File" → a plain-text document of
   lyrics with chord names on their own line above them, the common
   .txt/.md chord-sheet format). Audio/video files keep using the
   real recording pipeline above; PDF/Word parsing is not implemented
   yet and is rejected with a clear message instead of silently failing.
   ============================================================ */
function looksLikeChordToken(t){
  return /^[A-G](#|b)?(m|maj7|m6|m7|6|7|9|11|13|sus2|sus4|dim7?|aug|add9)?(\/[A-G](#|b)?)?$/.test(t);
}
function looksLikeChordLine(line){
  const trimmed = (line||'').trim();
  if(!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  return tokens.every(looksLikeChordToken);
}
function parseChordSheetText(text){
  let rawLines = (text||'').replace(/\r\n?/g,'\n').split('\n');
  // Common chord-sheet convention: a title (and optionally a sub/artist
  // line) on their own, followed by a blank line, before the lyrics proper.
  // Detected only when that shape is actually there — never guessed from
  // the lyrics themselves — so a plain lyrics-only file is untouched.
  let title = '', sub = '';
  if(rawLines[0] && rawLines[0].trim() && !looksLikeChordLine(rawLines[0])){
    if(rawLines[1]!==undefined && !rawLines[1].trim()){
      title = rawLines[0].trim();
      rawLines = rawLines.slice(2);
    } else if(rawLines[1]!==undefined && rawLines[1].trim() && !looksLikeChordLine(rawLines[1]) && rawLines[2]!==undefined && !rawLines[2].trim()){
      title = rawLines[0].trim(); sub = rawLines[1].trim();
      rawLines = rawLines.slice(3);
    }
  }
  const lyricLines = []; const chordMap = {}; let li = 0;
  for(let i=0;i<rawLines.length;i++){
    const line = rawLines[i];
    const next = rawLines[i+1];
    if(looksLikeChordLine(line) && next!==undefined && next.trim() && !looksLikeChordLine(next)){
      const words = next.trim().split(/\s+/);
      line.trim().split(/\s+/).forEach((ch,ci)=>{ if(ci<words.length) chordMap[li+'-'+ci] = ch; });
      lyricLines.push(next.trim()); li++; i++;
    } else if(looksLikeChordLine(line)){
      continue; // a chord-only line with nothing to attach it to (e.g. an intro) — skip
    } else {
      lyricLines.push(line.trim());
      if(line.trim()) li++;
    }
  }
  return { lyrics: lyricLines.join('\n').trim(), chords: chordMap, title, sub };
}
/* ============================================================
   "FROM FILE" — the Text import 01 engine (sheet-import.js, the same code
   as test-chordsheet.html): .txt/.md and .pdf (with OCR for scanned
   pages), chords placed over the word they're written above, end-of-line
   chords kept, page numbers dropped, lyric lines split across a page break
   re-joined to their chords, and title + artist read from the header.
   ============================================================ */
function isSheetFile(file){
  return /\.(txt|md|pdf)$/i.test(file.name||'') || /^text\//.test(file.type||'') || file.type==='application/pdf';
}
let sheetImportMod = null;
async function readSheetFile(file, onLog){
  if(!sheetImportMod) sheetImportMod = await import('./sheet-import.js?v=1');
  return sheetImportMod.importSheetFile(file, { onLog });
}
// Turns the engine's blocks into Singa's song shape: one lyrics line per
// sung line, section names as "[Verse 1]" header lines, chords keyed by
// "line-word", and end-of-line chords as "line-t0", "line-t1"…
function applySheetToSong(songObj, res, overwriteTitle){
  const lines = [], chords = {};
  let li = 0;
  (res.blocks||[]).forEach(b=>{
    if(b.type==='label'){ if(lines.length) lines.push(''); lines.push('['+b.text+']'); li++; return; }
    if(b.type==='standalone-chords'){ lines.push('['+b.text+']'); li++; return; }
    const ws = b.words.map(w=>String(w.text).replace(/\s+/g,'')).filter(Boolean);
    if(!ws.length) return;
    const tail = (b.tail||[]).slice();
    Object.keys(b.chordMap||{}).map(Number).sort((a,b)=>a-b).forEach(idx=>{
      const list = [].concat(b.chordMap[idx]);
      chords[li+'-'+idx] = list.shift();
      // a second chord written over the same word goes on the next word if
      // that has none, or after the line if it's the last word
      list.forEach(c=>{
        if(idx+1<ws.length && !(b.chordMap||{})[idx+1] && !chords[li+'-'+(idx+1)]) chords[li+'-'+(idx+1)] = c;
        else if(idx===ws.length-1) tail.unshift(c);
        else chords[li+'-'+idx] += ' '+c;
      });
    });
    tail.forEach((c,k)=>{ chords[li+'-t'+k] = c; });
    lines.push(ws.join(' ')); li++;
  });
  songObj.lyrics = lines.join('\n').trim();
  songObj.chords = chords;
  if(res.title && (overwriteTitle || !songObj.title.trim())) songObj.title = res.title;
  if(res.artist && (overwriteTitle || !songObj.sub.trim())) songObj.sub = res.artist;
}
async function importSheetIntoDraft(s, file){
  ST.phase='processing'; ST.procPct=10; ST.procNote='Reading '+file.name+'…'; render();
  let res;
  try{
    res = await readSheetFile(file, msg=>{ ST.procPct=Math.min(90, ST.procPct+8); ST.procNote=msg; render(); });
  }catch(e){
    console.error('Singa: file import failed', e);
    ST.phase='idle'; ST.procPct=0; ST.procNote=''; render();
    toast("Couldn't read that file: "+(e && e.message || e));
    return;
  }
  ST.phase='idle'; ST.procPct=0; ST.procNote='';
  applySheetToSong(s, res, false);
  if(!s.lyrics.trim()){ render(); toast("Couldn't find any lyrics in that file"); return; }
  const nChords = Object.keys(s.chords).length;
  ST.editId = s.id; ST.screen='create'; ST.createMode='manual'; ST.step = nChords ? 'chords' : 'lyrics'; ST.editorLine=0;
  render();
  queueSaveSong(s.id);
  const extra = [res.junkCount ? res.junkCount+' page number line'+(res.junkCount>1?'s':'')+' left out' : '', res.usedOcr ? 'read with OCR' : ''].filter(Boolean).join(', ');
  toast('Imported lyrics'+(nChords?' and '+nChords+' chords':'')+' — review and continue'+(extra?' ('+extra+')':''));
}

// Batch "From File" import: each selected file becomes its own song, saved
// straight into the library rather than routed through the Create flow one
// at a time. Text/chord-sheet files get their lyrics/chords/title parsed
// immediately; audio/video files are saved as a bare unsynced shell (title
// from the filename) — the user records or uploads a sync track later from
// the song's own (incomplete-song) screen, same as any other unsynced song.
async function handleBatchFileUpload(files){
  let added = 0, skipped = 0;
  const total = files.length;
  for(const file of files){
    if(/\.docx?$/i.test(file.name)){ skipped++; continue; }
    const baseName = file.name.replace(/\.[^.]+$/, '').trim() || 'Untitled song';
    const id = 'n'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    const songObj = { id, title:baseName, sub:'', lyrics:'', chords:{}, notes:{}, synced:false, isPublic:false, plays:0, added:Date.now(), mine:true };
    if(isSheetFile(file)){
      toast('Reading '+(added+skipped+1)+' of '+total+': '+file.name+'…');
      try{
        const res = await readSheetFile(file);
        applySheetToSong(songObj, res, true);
      }catch(e){ console.error('Singa: batch file read failed', e); }
    }
    D.songs[id] = songObj; D.order = [id, ...D.order]; added++;
    saveSongRow(songObj);
  }
  const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  render();
  if(added) toast(`Added ${added} song${added===1?'':'s'}${skipped?` (skipped ${skipped} unsupported)`:''} — open each to sync it`);
  else toast('No supported files in that selection');
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
  D.songs[id] = { id, title:'', sub:'', lyrics:'', chords:{}, notes:{}, synced:false, isPublic:false, plays:0, added:Date.now(), mine:true };
  D.order = [id, ...D.order];
  ST.editId = id; ST.screen='create'; ST.createMode='manual'; ST.step='lyrics'; ST.phase='idle'; ST.selWord=null; ST.similar=false; ST.menu=false; ST.sortOpen=false; ST.editorLine=0;
}
function finishSong(){
  const id = ST.editId, s = D.songs[id];
  const patch = { synced:true };
  // No made-up content: an empty title becomes "Untitled song", and empty
  // lyrics stay empty (the song then opens as incomplete) rather than being
  // replaced by a demo song.
  if(!s.title.trim()) patch.title = 'Untitled song';
  if(s.lyrics.trim() && (!Object.keys(s.chords).length || ST.autoChords)) patch.chords = autoChordsFor(s.lyrics);
  Object.assign(s, patch);
  ST.phase='idle'; ST.procPct=0; ST.procNote=''; ST.screen='done'; ST.autoChords=false; ST.songId=id;
  saveSongRow(s);
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
// Microphone access requested up front by Actions.startRecord(), BEFORE the
// 3-2-1 countdown starts — so the browser's "allow microphone" prompt shows
// immediately on tapping Record, not after the countdown finishes. Consumed
// (and cleared) by beginRealRecording() once the countdown ends.
let pendingMicStream=null;

function sampleLiveLevel(){
  if(!liveAnalyser || !liveDataArr) return null;
  liveAnalyser.getByteTimeDomainData(liveDataArr);
  let sum=0;
  for(let i=0;i<liveDataArr.length;i++){ const v=(liveDataArr[i]-128)/128; sum+=v*v; }
  const rms = Math.sqrt(sum/liveDataArr.length);
  return Math.max(4, Math.min(100, Math.round(rms*420)+8));
}

async function beginRealRecording(){
  let stream = pendingMicStream;
  pendingMicStream = null;
  if(!stream){
    // Fallback path — only hit if something reaches this without having
    // gone through Actions.startRecord() first (which normally already
    // acquired the mic before the countdown began).
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      toast('Microphone not available on this device/browser'); ST.phase='idle'; render(); return;
    }
    try{ stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
    catch(err){ toast('Mic error: '+(err && err.name || err)); ST.phase='idle'; render(); return; }
  }
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
