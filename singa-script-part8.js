"use strict";
const Binds = {
  email(v){ ST.email=v; render(); },
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

/* ============================================================
   INIT
   ============================================================ */
(function restoreSession(){
  const p = loadProfile();
  if(p && p.email){
    ST.email = p.email; ST.nickname = p.nickname || nicknameFromEmail(p.email); ST.authProvider = p.authProvider || 'email';
    if(p.instrument) ST.instrument = p.instrument;
    if(p.plan) ST.plan = p.plan;
    if(p.notif) ST.notif = p.notif;
    if(p.startMode) ST.startMode = p.startMode;
    ST.screen = 'home';
  }
})();
render();
