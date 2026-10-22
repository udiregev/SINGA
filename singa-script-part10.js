"use strict";
const Binds = {
  email(v){ ST.email=v; },
  password(v){ ST.password=v; },
  homeQuery(v){ ST.homeQuery=v; },
  listQuery(v){ ST.listQuery=v; render(); },
  searchQuery(v){ ST.searchQuery=v; render(); },
  draftTitle(v){ D.songs[ST.editId].title=v; queueSaveSong(ST.editId); },
  draftSub(v){ D.songs[ST.editId].sub=v; queueSaveSong(ST.editId); },
  draftLyrics(v){ D.songs[ST.editId].lyrics=v; render(); queueSaveSong(ST.editId); },
  noteDraft(v){ ST.noteDraft=v; },
  newName(v){ ST.newItem.name=v; render(); },
  newDate(v){ ST.newItem.date=v; },
  spQuery(v){ ST.spQuery=v; render(); },
  ceName(v){ ST.collabEdit.name=v; },
  ceEmail(v){ ST.collabEdit.email=v; },
  gigMsgDraft(v){ ST.gigMsgDraft=v; }
};
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
  if(ST.vcd>0){ const v=ST.vcd-0.1; if(v<=0){ ST.vcd=0; ST.playing=true; } else ST.vcd=v; changed=true; }
  if((ST.ctx==='view' && ST.screen!=='song') || (ST.ctx==='practice' && ST.screen!=='practice') || (ST.ctx==='syncpreview' && (ST.screen!=='create' || ST.step!=='sync'))){
    if(ST.playing){ ST.playing=false; changed=true; }
    if(ST.vcd>0){ ST.vcd=0; ST.playing=false; changed=true; }
  }
  if(ST.playing){
    const s = song(playId()); const tm = timing(s);
    let t = ST.t + 0.1;
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
    ST.recT += 0.1;
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
    if(ST.phase==='recording' || ST.phase==='practicing') liveT = ST.recT;
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
  const pos = t.selectionStart, posEnd = t.selectionEnd;
  if(Binds[name]) Binds[name](t.value, t.dataset);
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
  // From File / From Recording, or several files at once: each file becomes
  // its own song, added in the background (see queueImports).
  if(files.length > 1 || (ST.screen==='create' && ST.createMode!=='manual' && !ST.editing)){ queueImports(files); return; }
  const file = files[0];
  const s = D.songs[ST.editId];
  if(/\.docx?$/i.test(file.name)){
    toast("Word files aren't supported — save it as a PDF or .txt and upload that");
    return;
  }
  if(isSheetFile(file)){ queueImports([file]); return; }
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
      const inner = box.querySelector('.chordInnerScale');
      if(inner) inner.style.transform = 'scale('+Math.max(0.55, Math.min(1.9, h/230))+')';
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
      fitLandDia();
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
    if(s && !/t/.test(id)){
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
   INIT
   ============================================================ */
restoreSession();
render();
