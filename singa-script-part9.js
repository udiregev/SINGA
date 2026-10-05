"use strict";
const Binds = {
  email(v){ ST.email=v; render(); },
  password(v){ ST.password=v; render(); },
  homeQuery(v){ ST.homeQuery=v; },
  listQuery(v){ ST.listQuery=v; render(); },
  searchQuery(v){ ST.searchQuery=v; render(); },
  draftTitle(v){ D.songs[ST.editId].title=v; },
  draftSub(v){ D.songs[ST.editId].sub=v; },
  draftLyrics(v){ D.songs[ST.editId].lyrics=v; render(); },
  noteDraft(v){ ST.noteDraft=v; },
  newName(v){ ST.newItem.name=v; render(); },
  newDate(v){ ST.newItem.date=v; },
  spQuery(v){ ST.spQuery=v; render(); },
  ceName(v){ ST.collabEdit.name=v; },
  ceEmail(v){ ST.collabEdit.email=v; }
};
/* ============================================================
   PLAYBACK TICK (simulated — no real audio capture/analysis)
   ============================================================ */
function playId(){ return ST.ctx==='gig' ? gigSongId() : ST.songId; }
function endGigSong(){ const cur = gigSongId(); if(!ST.played.includes(cur)) ST.played=[...ST.played,cur]; ST.gigCur=null; ST.t=0; ST.playing=false; ST.gListening=false; }

function tick(){
  let changed = false;
  if(ST.vcd>0){ const v=ST.vcd-0.1; if(v<=0){ ST.vcd=0; ST.playing=true; } else ST.vcd=v; changed=true; }
  if((ST.ctx==='view' && ST.screen!=='song') || (ST.ctx==='practice' && ST.screen!=='practice')){
    if(ST.playing){ ST.playing=false; changed=true; }
    if(ST.vcd>0){ ST.vcd=0; ST.playing=false; changed=true; }
  }
  if(ST.playing){
    const s = song(playId()); const tm = timing(s);
    let t = ST.t + 0.1;
    if(t>=tm.total){
      if(ST.ctx==='practice') t=0;
      else if(ST.ctx==='view'){ ST.playing=false; t=0; }
      else { endGigSong(); render(); return; }
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
  /* 'processing' phase is now driven entirely by processRecordingBlob()'s real
     async pipeline (decode → transcribe → align), which sets ST.procPct/ST.procNote
     and calls finishSong() itself — no fake auto-advance here. */
  if(ST.sampling){ ST.sampleLeft = Math.max(0, ST.sampleLeft-0.1); if(ST.sampleLeft<=0) ST.sampling=false; changed=true; }
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
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  e.target.value = '';
  const s = D.songs[ST.editId];
  processRecordingBlob(s, file);
});

/* Chord-root "spinner" (the horizontal letter scroller on the Chords step):
   scrolling it live-selects the letter under the focus window, no extra
   tap needed. The derivative-chord tiles fade out while spinning and fade
   back in ~1s after it settles on a letter. Delegated with capture:true
   because scroll events don't bubble. */
let rootScrollTimer = null;
document.addEventListener('scroll', function(e){
  const el = e.target;
  if(!el || !el.classList || !el.classList.contains('rootScroller')) return;
  if(Date.now() - ST._lastProgScrollAt < 60) return; // ignore our own programmatic sync
  const fadeEl = document.getElementById('chordVariants');
  if(fadeEl) fadeEl.style.opacity = '0';
  clearTimeout(rootScrollTimer);
  rootScrollTimer = setTimeout(function(){
    const itemW = 100;
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

/* ============================================================
   INIT
   ============================================================ */
restoreSession();
render();
