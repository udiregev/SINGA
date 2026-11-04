"use strict";
const Binds = {
  email(v){ ST.email=v; },
  password(v){ ST.password=v; },
  homeQuery(v){ ST.homeQuery=v; },
  listQuery(v){ ST.listQuery=v; render(); },
  searchQuery(v){ ST.searchQuery=v; render(); },
  draftTitle(v){ D.songs[ST.editId].title=v; queueSaveSong(ST.editId); if(ST.screen==='create') refreshLyricsGate(); },
  draftSub(v){ D.songs[ST.editId].sub=v; queueSaveSong(ST.editId); },
  draftLyrics(v){ const s = D.songs[ST.editId]; remapOnEdit(s, s.lyrics, v); s.lyrics=v; queueSaveSong(ST.editId); refreshLyricsGate(); },
  noteDraft(v){ ST.noteDraft=v; },
  newName(v){ ST.newItem.name=v; render(); },
  newDate(v){ ST.newItem.date=v; },
  spQuery(v){ ST.spQuery=v; render(); },
  ceName(v){ ST.collabEdit.name=v; },
  ceEmail(v){ ST.collabEdit.email=v; },
  gigMsgDraft(v){ ST.gigMsgDraft=v; },
  // the Embed link box: only the → button lights up, no re-render
  linkDraft(v){ ST.linkDraft=v; document.querySelectorAll('.tp-go').forEach(b=>b.classList.toggle('on', !!v.trim())); },
  // the speed slider moves the speedometer in place (no re-render mid-drag)
  songSpeed(v){
    const s = D.songs[ST.editId]; if(!s) return;
    const x = Math.max(0.5, Math.min(4, +v||1));
    setSongTempo(s, { speed:x });
    const lab = document.getElementById('speedLabel'); if(lab) lab.textContent = speedLabel(x);
    const nd = document.getElementById('speedNeedle'); if(nd) nd.style.transform = 'rotate('+(-90+(x-0.5)/3.5*180).toFixed(1)+'deg)';
    queueSaveSong(s.id);
  }
};
// hold the screen still while the speed slider is being dragged
document.addEventListener('pointerdown', function(e){
  if(e.target && e.target.classList && e.target.classList.contains('speed-range')){ _holdRender = true; clearTimeout(_holdT); }
}, true);
/* ============================================================
   PLAYBACK TICK (simulated — no real audio capture/analysis)
   ============================================================ */
function playId(){ return ST.ctx==='gig' ? gigSongId() : (ST.ctx==='syncpreview' ? ST.editId : ST.songId); }
function endGigSong(){ const cur = gigSongId(); if(!ST.played.includes(cur)) ST.played=[...ST.played,cur]; ST.gigCur=null; ST.t=0; ST.playing=false; ST.gListening=false; }

// Throttles the live-gig broadcast (see joinGigChannel/broadcastGigState in
// singa-script-part1.js) to a few times a second instead of every 100ms
// tick — plenty for the Audience Guest Site to stay in sync, since it
// interpolates playback position locally between messages.
let _lastBroadcastAt = 0;
function broadcastLiveTick(){
  if(!(ST._liveGig && ST.ctx==='gig')) return;
  const now = Date.now();
  if(now - _lastBroadcastAt < 400) return;
  _lastBroadcastAt = now;
  broadcastGigState({ songId: gigSongId(), t: ST.t, playing: ST.playing, listening: ST.gListening, vcd: ST.vcd, ended:false });
}

function tick(){
  let changed = false;
  if(pracActive && ST.phase!=='practicing') stopPracticeFollow();   // left Practice some other way (back, logo…)
  if(ST.vcd>0){ const v=ST.vcd-0.1; if(v<=0){ ST.vcd=0; ST.playing=true; } else ST.vcd=v; changed=true; }
  if((ST.ctx==='view' && ST.screen!=='song') || (ST.ctx==='practice' && ST.screen!=='practice') || (ST.ctx==='syncpreview' && (ST.screen!=='create' || ST.step!=='sync'))){
    if(ST.playing){ ST.playing=false; changed=true; }
    if(ST.vcd>0){ ST.vcd=0; ST.playing=false; changed=true; }
  }
  if(ST.playing){
    const s = song(playId()); const tm = timing(s);
    // set-speed songs (and Test on the Tempo step) move at their speed
    const sp = ST.ctx==='syncpreview' ? (ST.testSpeed ? songSpeed(s) : 1) : (songMode(s)==='synced' ? 1 : songSpeed(s));
    let t = ST.t + 0.1*sp;
    if(t>=tm.total){
      if(ST.ctx==='practice' || ST.ctx==='syncpreview') t=0;
      else if(ST.ctx==='view'){ ST.playing=false; t=0; }
      else { endGigSong(); broadcastLiveTick(); render(); return; }
    }
    ST.t = t; changed=true;
  }
  if(ST.phase==='countdown'){
    const cd=ST.cd-0.1;
    if(cd<=0){ ST.cd=0; if(!recordingStartPending){ recordingStartPending=true; beginRealRecording().finally(()=>{ recordingStartPending=false; }); } }
    else { ST.cd=cd; }
    changed=true;
  }
  else if(ST.phase==='recording'){
    ST.recT += 0.1;
    const lvl = sampleLiveLevel();
    ST.bars=[...ST.bars, lvl!=null?lvl:(10+Math.round(Math.random()*80))].slice(-18);
    changed=true;
  }
  else if(ST.phase==='practicing'){
    // moves on only while you're singing (see startPracticeFollow)
    if(ST.pracState==='following' && performance.now() - (ST.pracHeardAt||0) < 1500){
      const ps = D.songs[ST.editId];
      ST.recT = Math.min(timing(ps).total, ST.recT + 0.1*songSpeed(ps));
    }
    changed=true;
  }
  /* 'processing' phase is now driven entirely by processRecordingBlob()'s real
     async pipeline (decode → transcribe → align), which sets ST.procPct/ST.procNote
     and calls finishSong() itself — no fake auto-advance here. */
  // Auto-scroll the Sync step's compact lyrics window: karaoke-paced (no
  // bold focus) while practicing/recording a take, or real-alignment-paced
  // (with bold focus, via buildLines' 'play' mode) while previewing an
  // already-synced take — both drive the same typewriter-scroll mechanism
  // in render() that keeps the current line as the 2nd visible row.
  if(ST.screen==='create' && ST.createMode==='manual' && ST.step==='sync'){
    const s = D.songs[ST.editId];
    let liveT = null;
    if(ST.phase==='recording') liveT = ST.recT*songSpeed(s);
    else if(ST.phase==='practicing') liveT = ST.recT;
    else if(ST.ctx==='syncpreview' && ST.playing) liveT = ST.t;
    if(s && liveT!=null){
      const tm = timing(s); const ci = curWord(tm, liveT);
      const li = ci>=0 ? tm.words[ci].li : 0;
      if(li !== ST.editorLine){ ST.editorLine = li; changed = true; }
    }
  }
  if(ST.sampling){ ST.sampleLeft = Math.max(0, ST.sampleLeft-0.1); if(ST.sampleLeft<=0){ ST.sampling=false; stopSampleAudio(); } changed=true; }
  broadcastLiveTick();
  if(changed) render();
}
setInterval(tick, 100);

/* ============================================================
   EVENT WIRING (delegation)
   ============================================================ */
document.addEventListener('click', function(e){
  const t = e.target.closest('[data-act]');
  if(!t) return;
  const act = t.dataset.act;
  if(Actions[act]) Actions[act](t.dataset, e);
});

document.addEventListener('input', function(e){
  const t = e.target.closest('[data-bind]');
  if(!t) return;
  const name = t.dataset.bind;
  let pos = null, posEnd = null;
  try{ pos = t.selectionStart; posEnd = t.selectionEnd; }catch(err){}   // range inputs have no caret
  if(Binds[name]) Binds[name](t.value, t.dataset);
  if(t.type==='range') return;
  requestAnimationFrame(function(){
    const el = document.querySelector('[data-bind="'+name+'"]');
    if(el && el !== document.activeElement){
      el.focus();
      try{ el.setSelectionRange(pos, posEnd); }catch(err){}
    }
  });
});

document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  const t = e.target.closest('[data-key]');
  if(!t) return;
  const act = t.dataset.key;
  if(Actions[act]) Actions[act](t.dataset, e);
});

document.getElementById('fileInput').addEventListener('change', function(e){
  const files = Array.from(e.target.files||[]);
  if(!files.length) return;
  e.target.value = '';
  // From text doc / From audio track, or several files at once: each file
  // becomes its own song, added in the background (see queueImports).
  if(files.length > 1 || (ST.screen==='create' && ST.createMode!=='manual' && !ST.editing)){ queueImports(files); return; }
  const file = files[0];
  const s = D.songs[ST.editId];
  if(/\.doc$/i.test(file.name)){
    toast("Old Word (.doc) files can't be read — save it as .docx, PDF or .txt and upload that");
    return;
  }
  if(isSheetFile(file) && !isAudioFile(file)){ queueImports([file]); return; }
  if(!isAudioFile(file)){ toast("That isn't an audio file Singa can read — try an mp3, m4a, wav or a video"); return; }
  processRecordingBlob(s, file);
});

document.getElementById('avatarInput').addEventListener('change', async function(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  e.target.value = '';
  if(!ST.userId){ toast('Sign in first'); return; }
  if(!canSync()) return;
  try{
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = ST.userId + '/avatar.' + ext;
    const up = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if(up.error){ toast('Upload failed — make sure the "avatars" storage bucket exists and is public'); return; }
    const pub = sb.storage.from('avatars').getPublicUrl(path);
    ST.avatarUrl = pub.data.publicUrl + '?t=' + Date.now();
    syncProfile(); render(); toast('Photo updated');
  }catch(err){ toast('Upload failed — make sure the "avatars" storage bucket exists and is public'); }
});

/* Chord-root "spinner" (the horizontal letter scroller on the Chords step):
   scrolling it live-selects the letter under the focus window, no extra
   tap needed. The derivative-chord tiles fade out while spinning and fade
   back in ~1s after it settles on a letter. Delegated with capture:true
   because scroll events don't bubble. */
let rootScrollTimer = null;
document.addEventListener('scroll', function(e){
  const el = e.target;
  if(!el || !el.classList) return;
  // Chord-chip rows (quality suggestions, recent chords): just keep their
  // chevrons in sync with however far the user has actually scrolled.
  if(el.classList.contains('chiprow')){ updateChipRowChevrons(el.id); return; }
  if(!el.classList.contains('rootScroller')) return;
  if(Date.now() - ST._lastProgScrollAt < 60) return; // ignore our own programmatic sync
  const fadeEl = document.getElementById('chordVariants');
  if(fadeEl) fadeEl.style.opacity = '0';
  clearTimeout(rootScrollTimer);
  rootScrollTimer = setTimeout(function(){
    const itemW = +(el.dataset.itemw || 100);
    const idx = Math.max(0, Math.min(LETTERS.length-1, Math.round(el.scrollLeft / itemW)));
    if(idx !== ST.rootIdx){
      Actions.pickRoot({ id: String(idx) });
    }
    const fe2 = document.getElementById('chordVariants');
    if(fe2) fe2.style.opacity = '0'; // stay hidden through the render pickRoot may have just triggered
    setTimeout(function(){
      const fe = document.getElementById('chordVariants');
      if(fe) fe.style.opacity = '1';
    }, 1000);
  }, 140);
}, true);

/* Song-viewer chord/about section resize: dragging the handle between it
   and the lyrics changes how much vertical space each gets. Mutates the
   diagram box's height/scale directly while dragging (not via render(), to
   stay smooth) and only commits ST.chordH + re-renders once, on release. */
(function(){
  let dragging = false, startY = 0, startH = 230;
  document.addEventListener('pointerdown', function(e){
    const handle = e.target.closest('#chordResizeHandle');
    if(!handle) return;
    dragging = true; startY = e.clientY; startH = ST.chordH;
    e.preventDefault();
  });
  document.addEventListener('pointermove', function(e){
    if(!dragging) return;
    const h = Math.max(90, Math.min(420, startH + (e.clientY - startY)));
    ST.chordH = h;
    const box = document.getElementById('chordDiagramBox');
    if(box){
      box.style.height = Math.round(h)+'px';
      box.dataset.fit = Math.max(0.55, Math.min(1.9, h/230));
      fitDias();
    }
  });
  document.addEventListener('pointerup', function(){
    if(!dragging) return;
    dragging = false;
    render();
  });
})();

/* Landscape players: the ||| handle between the lyrics and the chord
   column drags the column wider/narrower (live, then commits on release). */
(function(){
  let dragging = false, startX = 0, startW = 260;
  document.addEventListener('pointerdown', function(e){
    if(!e.target.closest('#chordResizeHandleX')) return;
    dragging = true; startX = e.clientX; startW = ST.chordW; e.preventDefault();
  });
  document.addEventListener('pointermove', function(e){
    if(!dragging) return;
    const w = Math.max(160, Math.min(Math.min(560, innerWidth*0.55), startW - (e.clientX - startX)));
    ST.chordW = w;
    const box = document.getElementById('chordDiagramBox');
    if(box){
      box.style.width = Math.round(w)+'px';
      box.dataset.fit = chordScaleV();
      fitDias();
    }
  });
  document.addEventListener('pointerup', function(){ if(dragging){ dragging = false; render(); } });
})();

/* Chords step drag & drop. Works with mouse and touch: chord tiles in the
   picker column only start a drag on a sideways move (an up/down swipe
   still scrolls the list), "used" chips on a downward move, placed chords
   any way. While dragging, the word under the finger previews the chord,
   and so does the same spot on every repeat of that line. */
(function(){
  let drag = null, suppressClickUntil = 0, preview = [];
  function clearPreview(){
    preview.forEach(p=>{ p.el.classList.remove('drop-on'); if(p.ch){ p.ch.textContent = p.txt; p.ch.classList.remove('pv','pv-fill'); } });
    preview = [];
  }
  function show(id, cls, word){
    const w = document.querySelector('.lword[data-drop="'+id+'"]'); if(!w) return;
    const ch = w.querySelector('.lchord');
    preview.push({ el:w, ch, txt: ch ? ch.textContent : '' });
    if(word) w.classList.add('drop-on');
    if(ch){ ch.textContent = drag.chord; ch.classList.add(cls); }
  }
  function setTarget(id){
    if(drag.target === id) return;
    drag.target = id; clearPreview();
    if(!id) return;
    show(id, 'pv', true);
    const s = D.songs[ST.editId];
    if(s && !drag.from && !/t/.test(id)){
      const [li, wi] = id.split('-').map(Number);
      repeatSpots(s, li, wi).forEach(r=>{ if(r!==drag.from) show(r, 'pv-fill', false); });
    }
  }
  function end(apply){
    if(!drag) return;
    const d = drag; drag = null;
    if(d.raf) cancelAnimationFrame(d.raf);
    if(d.ghost) d.ghost.remove();
    document.body.classList.remove('chord-dragging');
    if(d.srcChip) d.srcChip.classList.remove('drag-src');
    if(!d.started) return;
    suppressClickUntil = Date.now() + 250;
    clearPreview();
    if(apply){
      if(d.target) dropChord(d.chord, d.from, d.target);
      else if(d.from) dropChord(d.chord, d.from, null);
    }
  }
  document.addEventListener('pointerdown', function(e){
    if(ST.step!=='chords' || (ST.screen!=='create')) return;
    if(e.button>0) return;
    const src = e.target.closest('[data-drag-chord]');
    if(!src) return;
    drag = { chord: src.dataset.dragChord, from: src.dataset.from || null, x0:e.clientX, y0:e.clientY, pid:e.pointerId, started:false, target:null,
      kind: src.classList.contains('ctile') ? 'tile' : (src.classList.contains('utile') ? 'used' : 'chip'), srcEl: src };
  });
  document.addEventListener('pointermove', function(e){
    if(!drag || e.pointerId!==drag.pid) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if(!drag.started){
      if(Math.hypot(dx, dy) < 7) return;
      // touch: let the picker list / used row scroll on their own axis
      if(e.pointerType==='touch'){
        if(drag.kind==='tile' && Math.abs(dy) > Math.abs(dx)){ drag = null; return; }
        if(drag.kind==='used' && Math.abs(dx) > Math.abs(dy)){ drag = null; return; }
      }
      drag.started = true;
      const g = document.createElement('div'); g.className = 'chord-ghost'; g.textContent = drag.chord;
      document.body.appendChild(g); drag.ghost = g;
      document.body.classList.add('chord-dragging');
      if(drag.from){ drag.srcChip = drag.srcEl; drag.srcEl.classList.add('drag-src'); }
    }
    e.preventDefault();
    drag.x = e.clientX; drag.y = e.clientY;
    drag.ghost.style.left = e.clientX+'px'; drag.ghost.style.top = e.clientY+'px';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const w = under && under.closest('.lword[data-drop]');
    setTarget(w ? w.dataset.drop : null);
    // near the top/bottom edge of the lyrics: keep scrolling
    if(!drag.raf) drag.raf = requestAnimationFrame(function edge(){
      if(!drag || !drag.started) return;
      drag.raf = 0;
      const box = document.getElementById('editorLyricsScroll'); if(!box) return;
      const r = box.getBoundingClientRect();
      let v = 0;
      const zone = Math.min(40, r.height*0.15);
      if(drag.x>r.left && drag.x<r.right){ if(drag.y < r.top+zone) v = -6; else if(drag.y > r.bottom-zone) v = 6; }
      if(v){ box.scrollTop += v; drag.raf = requestAnimationFrame(edge); }
    });
  }, { passive:false });
  document.addEventListener('pointerup', function(e){ if(drag && e.pointerId===drag.pid) end(true); });
  document.addEventListener('pointercancel', function(e){ if(drag && e.pointerId===drag.pid) end(false); });
  // a drag shouldn't also count as a tap on the tile / word it ended on
  document.addEventListener('click', function(e){ if(Date.now() < suppressClickUntil){ e.stopPropagation(); e.preventDefault(); } }, true);
  // stop the browser's own drag-image / text-drag on desktop
  document.addEventListener('dragstart', function(e){ if(e.target.closest && e.target.closest('[data-drag-chord]')) e.preventDefault(); });
})();

/* ============================================================
   SONG STRUCTURE FROM IMPORTED LYRICS
   1. A sung line written in brackets — "(She said yeah, yeah, yeah)" — is
      a lyric, not a section name: only a bracketed line that names a part
      of the song ("[Chorus]", "(Repeat x2)", "[Guitar solo]"…) or is one or
      two words ("[Spoken]") is a heading.
   2. Lyrics with no empty lines between their parts still get their parts
      named, from how the lines repeat: the block of lines that comes back
      most is the Chorus, the parts between are Verses, a line sung over and
      over between choruses is the Refrain, what follows the last chorus is
      the Outro, a different part late in the song is the Bridge.
   ============================================================ */
const LABEL_WORDS_RE = /\b(intro|verse|pre-?chorus|chorus|post-?chorus|bridge|outro|hook|refrain|solo|instrumental|interlude|break|breakdown|coda|ending|middle|climb|tag|vamp|riff|spoken|repeat|capo|key|tempo|fade|x\d+|\d+x)\b/i;
function labelIsSection(text){
  const t = String(text||'').trim();
  return LABEL_WORDS_RE.test(t) || t.split(/\s+/).filter(Boolean).length <= 2;
}
const _applySheetToSongBase = applySheetToSong;
applySheetToSong = function(songObj, res, overwriteTitle){
  const blocks = (res && res.blocks || []).map(b=>{
    if(b.type!=='label' || labelIsSection(b.text)) return b;
    return { type:'couplet', words: ('('+String(b.text).trim()+')').split(/\s+/).map(t=>({ text:t })), chordMap:{} };
  });
  return _applySheetToSongBase(songObj, { ...res, blocks }, overwriteTitle);
};
// lines compared without ad-libs in brackets, punctuation or case
function lineKey(l){ return String(l||'').toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g,' ').replace(/[^a-z0-9À-ɏ' ]/g,'').replace(/\s+/g,' ').trim(); }
const _autoSectionsBase = autoSections;
autoSections = function(s){
  const r = _autoSectionsBase(s) || autoSectionsByRepeats(s);
  if(r) normalizeHeads(s);
  return r;
};
function autoSectionsByRepeats(s){
  const raw = String(s.lyrics||'').split('\n').map(l=>l.trim()).filter(Boolean);
  if(raw.length < 8) return false;
  if(raw.some(l=>isHeaderLine(l.split(/\s+/)))) return false;   // already has headings (or instrumentals): leave it
  const keys = raw.map(lineKey), n = raw.length;
  // the chorus: the run of 2–8 lines that comes back most (not one line over and over)
  let best = null;
  for(let k=Math.min(8, Math.floor(n/2)); k>=2; k--){
    for(let i=0;i+k<=n;i++){
      const blk = keys.slice(i, i+k);
      if(blk.some(x=>!x) || blk.every(x=>x===blk[0])) continue;
      const occ = [];
      for(let j=0;j+k<=n;){ if(blk.every((x,q)=>keys[j+q]===x)){ occ.push(j); j+=k; } else j++; }
      if(occ.length < 2) continue;
      const score = k*occ.length;
      if(!best || score>best.score || (score===best.score && k>best.k)) best = { k, occ, score };
    }
  }
  if(!best || best.score < 6) return false;
  const isCh = new Array(n).fill(false);
  best.occ.forEach(j=>{ for(let q=0;q<best.k;q++) isCh[j+q] = true; });
  // the song in parts: choruses (back to back = one chorus) and what's between them
  const parts = [];
  for(let i=0;i<n;i++){
    const last = parts[parts.length-1];
    if(last && last.ch===isCh[i]) last.lines.push(i); else parts.push({ ch:isCh[i], lines:[i] });
  }
  // a verse that ends on the same line twice ("It's easy") is two verses
  const split = [], lastChPart = parts.map((p,i)=>p.ch?i:-1).filter(i=>i>=0).pop();
  parts.forEach((p,pi)=>{
    const pks = p.lines.map(li=>keys[li]);
    if(p.ch || pi>lastChPart || pks.every(x=>x===pks[0])){ split.push(p); return; }
    const endKey = keys[p.lines[p.lines.length-1]];
    let cur = [];
    p.lines.forEach((li,x)=>{ cur.push(li); if(keys[li]===endKey && x<p.lines.length-1 && cur.length>=2){ split.push({ ch:false, lines:cur }); cur = []; } });
    if(cur.length) split.push({ ch:false, lines:cur });
  });
  const lastCh = split.map((p,i)=>p.ch?i:-1).filter(i=>i>=0).pop();
  let verseN = 0, chorusSeen = 0, firstVerse = null;
  split.forEach((p,i)=>{
    if(p.ch){ p.label = 'Chorus'; chorusSeen++; return; }
    const ks = p.lines.map(li=>keys[li]);
    const same = ks.length>=2 && ks.every(x=>x===ks[0]);
    const repeated = ks.filter(x=>keys.filter(y=>y===x).length>1).length / ks.length;
    if(i>lastCh && chorusSeen) p.label = 'Outro';
    else if(i===0 && same) p.label = 'Intro';
    else if(same) p.label = 'Refrain';
    else if(chorusSeen>=2 && verseN>=1 && i<lastCh && repeated<0.5 && firstVerse
      && Math.abs(p.lines.length-firstVerse.lines.length)>1 && keys[p.lines[p.lines.length-1]]!==keys[firstVerse.lines[firstVerse.lines.length-1]]) p.label = 'Bridge';
    else { verseN++; p.label = 'Verse '+verseN; if(!firstVerse) firstVerse = p; }
  });
  if(verseN===1) split.forEach(p=>{ if(p.label==='Verse 1') p.label = 'Verse'; });
  // rebuild with headings; chords and marks move with their lines
  const out = [], map = {};
  split.forEach(p=>{
    if(out.length) out.push('');
    out.push('(('+p.label+'))');
    p.lines.forEach(li=>{ map[li] = out.filter(Boolean).length; out.push(raw[li]); });
  });
  const remap = obj=>{ const o = {}; Object.keys(obj||{}).forEach(k=>{ const m = /^(\d+)-(.+)$/.exec(k); if(m && map[m[1]]!=null) o[map[m[1]]+'-'+m[2]] = obj[k]; else o[k] = obj[k]; }); return o; };
  s.lyrics = out.join('\n');
  s.chords = remap(s.chords);
  if(s.notes) s.notes = remap(s.notes);
  return true;
}
/* ============================================================
   SECTION HEADINGS AND INSTRUMENTALS, AS TYPED IN THE LYRICS
   ((Chorus)), ((Verse 2)), ((bridge))… on a line of its own is a section
   heading — add, change or delete them like any other line.
   ((instrumental)) is an instrumental part: an "Instrumental" heading and a
   strip of ticks you can put chords and markings on. Several in a row make
   one longer part (the heading shows once).
   Songs saved before this used [Verse 1] / [instrumental]; those still
   read the same and are turned into the new form when the song is opened.
   ============================================================ */
function headText(ws){ return (Array.isArray(ws) ? ws.join(' ') : String(ws||'')).trim().replace(/^[\[(]+\s*/,'').replace(/\s*[\])]+$/,''); }
function headParts(ws){ const raw = headText(ws), m = /^([^:]*?)\s*(?::\s*(.*))?$/.exec(raw) || []; return { name: (m[1]!=null ? m[1] : raw).trim(), rest: (m[2]||'').trim() }; }
const NOTE_HEAD_RE = /^(capo|key|tempo|repeat|x\d+|\d+x)\b/i;
isHeaderLine = function(ws){
  if(!ws || !ws.length) return false;
  const t = ws.join(' ').trim();
  if(/^\(\(.*\)\)$/.test(t) || /^\[.*\]$/.test(t)) return true;
  if(/^\([^()]*\)$/.test(t)){ const inner = t.slice(1,-1).replace(/:.*$/,'').trim(); return SECTION_RE.test(sectionName(inner)) || NOTE_HEAD_RE.test(inner); }
  return false;
};
// an instrumental part: ((instrumental)) (also solo / interlude / break), or
// a part written with its chords ("((Intro: C G))", "((Outro: instrumental))")
instrLine = function(ws){
  if(!isHeaderLine(ws)) return null;
  const { name, rest } = headParts(ws);
  const chords = rest.split(/\s+/).filter(x=>/^[A-G]/.test(x));
  const sec = sectionName(name);
  if(/^Instrumental\b/.test(sec) || /\binstrumental\b/i.test(rest) || (chords.length && /^(Intro|Outro)\b/.test(sec))) return { kind: name.toLowerCase(), label: name, chords };
  return null;
};
// older [Verse 1] / [Intro] / (Chorus) lines → ((Verse 1)) / ((Intro)) / ((Chorus))
function normalizeHeads(s){
  if(!s || !s.lyrics) return false;
  const all = String(s.lyrics).split('\n'), ch = s.chords || {};
  const filled = all.map(l=>l.trim()).filter(Boolean);
  let k = -1, changed = false;
  const out = all.map(line=>{
    const t = line.trim(); if(!t) return line;
    k++;
    const ws = t.split(/\s+/);
    if(/^\(\(.*\)\)$/.test(t) || !isHeaderLine(ws)) return line;
    let txt = headText(ws);
    const { name, rest } = headParts(ws);
    if(/^(intro|outro)$/i.test(name) && !rest){
      // an [Intro] / [Outro] used to be an instrumental part: it stays one if
      // it has chords on its strip or no singing straight after it
      const next = filled[k+1];
      const slots = Object.keys(ch).some(key=>key.indexOf(k+'-i')===0);
      if(slots || !next || isHeaderLine(next.split(/\s+/))) txt = name+': instrumental';
    }
    changed = true;
    return '(('+txt+'))';
  });
  if(changed) s.lyrics = out.join('\n');
  return changed;
}
// chords written in an instrumental's line become chords on its strip
instrMigrate = function(s){
  if(!s) return false;
  let changed = normalizeHeads(s);
  const lines = parseLyrics(s.lyrics), relabel = {};
  s.chords = s.chords || {};
  lines.forEach((ws,li)=>{
    const il = instrLine(ws); if(!il || !il.chords.length) return;
    const n = il.chords.length;
    il.chords.forEach((c,i)=>{ const id = li+'-i'+instrSlotOf(i, n); if(!s.chords[id]) s.chords[id] = c; });
    relabel[li] = /^Instrumental\b/.test(sectionName(il.label)) ? '(('+il.label+'))' : '(('+il.label+': instrumental))';
  });
  if(Object.keys(relabel).length){
    let k = -1;
    s.lyrics = String(s.lyrics||'').split('\n').map(raw=>{ if(!raw.trim()) return raw; k++; return relabel[k]!=null ? relabel[k] : raw; }).join('\n');
    changed = true;
  }
  return changed;
};
const _applySheetHeads = applySheetToSong;
applySheetToSong = function(songObj, res, overwriteTitle){
  const r = _applySheetHeads(songObj, res, overwriteTitle);
  instrMigrate(songObj);
  return r;
};
const _songRowToLocalHeads = songRowToLocal;
songRowToLocal = function(row){ const s = _songRowToLocalHeads(row); try{ normalizeHeads(s); }catch(e){} return s; };
// A heading: its name, as a small label (notes such as "Capo 2" stay plain)
headerLineHTML = function(l){
  const { name, rest } = headParts(l.words.map(w=>w.w));
  const note = NOTE_HEAD_RE.test(name);
  const shownRest = rest && !/^instrumental$/i.test(rest) ? rest : '';
  return `<div class="lline lheader${note?'':' lsection'}"><span class="hl">${esc(sectionName(name) || name)}</span>${shownRest?`<span class="hc">${esc(shownRest)}</span>`:''}</div>`;
};
// Instrumental strips: the heading once above a run of them, markings on them
const _buildLinesHeads = buildLines;
buildLines = function(s, mode, opt){
  opt = opt || {};
  const out = _buildLinesHeads(s, mode, opt);
  const tm = timing(s), lines = tm.lines;
  const notes = { ...(s.notes||{}), ...(opt.extraNotes||{}) };
  if(mode==='markings') out.forEach((l,i)=>{ const it = tm.instr && tm.instr[l.li]; if(it && !l.instr) out[i] = { li:l.li, instr:true, markEdit:true, header:false, words:[], chords: it.chords, scale:1, op:1, padTop:0, mb:0 }; });
  let prevInstr = false;
  out.forEach(l=>{
    if(l.instr && l.li>=0){
      const il = instrLine(lines[l.li]);
      l.label = il ? (sectionName(il.label) || il.label) : 'Instrumental';
      l.first = !prevInstr;
      l.marks = [];
      for(let k=0;k<INSTR_SLOTS;k++){ const m = notes[l.li+'-i'+k]; if(m) l.marks.push({ slot:k, text:m, id:l.li+'-i'+k }); }
      prevInstr = true;
    } else prevInstr = false;
  });
  return out;
};
function instrMarkEditHTML(l){
  const by = {}; (l.marks||[]).forEach(m=>{ by[m.slot] = m; });
  let cells = '';
  for(let k=0;k<INSTR_SLOTS;k++){
    const id = l.li+'-i'+k, m = by[k], sel = ST.selWord===id;
    cells += `<span class="lword islot mslot${sel?' sel':''}" data-act="pickMarkWord" data-id="${id}" title="Add a marking here">${m?`<span class="imk"><span class="mtext">${esc(m.text)}</span><i class="iarr"></i></span>`:''}<span class="itk"><i style="height:${k%2===0?22:15}px"></i><i style="height:15px"></i></span></span>`;
  }
  return `<div class="lline linstr iedit imark${l.first?'':' icont'}"><span class="msi inote" style="font-size:20px">music_note</span><div class="islots">${cells}</div></div>`;
}
const _instrLineHTMLBase = instrLineHTML;
instrLineHTML = function(l, big){
  const head = l.first && l.label ? `<div class="lline lheader lsection"><span class="hl">${esc(l.label)}</span></div>` : '';
  if(l.markEdit) return head + instrMarkEditHTML(l);
  let row = _instrLineHTMLBase(l, big);
  if(l.li>=0 && !l.first) row = row.replace('class="lline linstr', 'class="lline linstr icont');
  if(l.marks && l.marks.length && !l.edit){
    const mk = `<div class="imarks">${l.marks.map(m=>`<span class="imk" style="left:${(m.slot/INSTR_SLOTS*100).toFixed(1)}%"><span class="mtext">${esc(m.text)}</span><i class="iarr"></i></span>`).join('')}</div>`;
    row = row.replace('<div class="itrack">', '<div class="itrack">'+mk);
  }
  return head + row;
};
(function(){
  if(document.getElementById('singa-instr-css')) return;
  const st = document.createElement('style'); st.id = 'singa-instr-css';
  st.textContent = `
.lline.linstr.icont{padding-top:0;margin-top:-2px}
.lline.linstr.icont .inote{visibility:hidden}
.lline.lheader.lsection + .lline.linstr{margin-top:2px}
.linstr .imarks{position:relative;height:30px}
.linstr .imk{position:absolute;bottom:0;display:flex;flex-direction:column;align-items:flex-start;color:var(--chordblue);pointer-events:none;white-space:nowrap}
.linstr .imk .mtext{font-family:Caveat,cursive;font-size:22px;font-weight:600;line-height:1;color:var(--chordblue)}
.linstr .imk .iarr{display:block;width:2px;height:9px;background:var(--chordblue);border-radius:1px;margin-left:1px}
.iedit.imark .islots{height:74px}
.iedit .mslot{cursor:pointer}
.iedit .mslot:hover .itk i, .iedit .mslot.sel .itk i{background:#2f8fe0}
.iedit .mslot.sel{background:#e5f0fc}
.iedit .mslot .imk{bottom:30px;left:0;z-index:1}
`;
  document.head.appendChild(st);
})();
// Editing the lyrics (adding or removing a heading, a line…) keeps every
// chord and marking on the line it was on.
function remapOnEdit(s, a, b){
  if(!s) return;
  const A = parseLyrics(a).map(ws=>ws.join(' ')), B = parseLyrics(b).map(ws=>ws.join(' '));
  const n = A.length, m = B.length;
  if(A.join('\n')===B.join('\n') || !n || n*m > 250000) return;
  const L = Array.from({ length:n+1 }, ()=>new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) L[i][j] = A[i]===B[j] ? L[i+1][j+1]+1 : Math.max(L[i+1][j], L[i][j+1]);
  const map = {}, gapA = [], gapB = [];
  const head = (X,i)=>isHeaderLine(X[i].split(' '));
  // lines changed in place: paired up in order (headings with headings, lyrics with lyrics)
  const flush = ()=>{
    [true,false].forEach(h=>{ const a1 = gapA.filter(i=>head(A,i)===h), b1 = gapB.filter(j=>head(B,j)===h); for(let q=0;q<Math.min(a1.length,b1.length);q++) map[a1[q]] = b1[q]; });
    gapA.length = 0; gapB.length = 0;
  };
  let i = 0, j = 0;
  while(i<n && j<m){
    if(A[i]===B[j]){ flush(); map[i] = j; i++; j++; }
    else if(L[i+1][j] >= L[i][j+1]) gapA.push(i++); else gapB.push(j++);
  }
  while(i<n) gapA.push(i++); while(j<m) gapB.push(j++); flush();
  const remap = obj=>{ const o = {}; Object.keys(obj||{}).forEach(k=>{ const mm = /^(\d+)-(.+)$/.exec(k); if(!mm){ o[k] = obj[k]; return; } const to = map[mm[1]]; if(to!=null) o[to+'-'+mm[2]] = obj[k]; }); return o; };
  s.chords = remap(s.chords);
  if(s.notes) s.notes = remap(s.notes);
}
// the Lyrics step explains the two formats
const _renderManualLyricsBase = renderManualLyrics;
renderManualLyrics = function(d){
  if(d) normalizeHeads(d);
  return _renderManualLyricsBase(d)
    .replace('&#10;Type [instrumental] to add an instrumental line', '&#10;((Chorus)) on its own line starts a section&#10;((instrumental)) adds an instrumental part')
    .replace(/Type <b>\[instrumental\]<\/b> to add an instrumental line — type it again on the next line to make it longer/,
      'Type <b>((Chorus))</b>, <b>((Verse 2))</b>, <b>((Bridge))</b>… on a line of its own for a section heading, and <b>((instrumental))</b> for an instrumental part — repeat it on the next lines to make it longer');
};
/* ============================================================
   INIT
   ============================================================ */
restoreSession();
render();
