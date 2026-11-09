/* Singa · later rounds (loaded by singa-script-part12.js) */

/* ============================================================
   ROUND 14
   · Songs list: a button on each song to add it to a playlist.
   · Recording in the app hears the instruments: the microphone is no
     longer treated like a phone call (no noise suppression, echo
     cancelling or automatic volume, which filter out guitar and piano),
     and the take is saved at a higher quality.
   ============================================================ */
(function(){
  const css = `
.srow .s-acts{width:auto;min-width:108px}
.sact.nsact-pl{color:var(--n-mute)}
@media (hover:hover) and (pointer:fine){ .sact.nsact-pl:hover{color:#fff;background:rgba(255,255,255,.1)} }
`;
  const st = document.createElement('style'); st.id = 'nightCss14'; st.textContent = css;
  document.head.appendChild(st);
})();

/* ---- add to playlist, right from the list ---- */
const _n14SongRow = songRowList;
songRowList = function(id, badgeText, badgeCol, from, rowAct, compact){
  const html = _n14SongRow(id, badgeText, badgeCol, from, rowAct, compact);
  if(from!=='list' || !ST.userId) return html;
  const s = song(id); if(!s || s===EMPTY_SONG) return html;
  const btn = `<button class="sact nsact-pl" data-xact="rowAddPl" data-id="${esc(id)}" title="Add to a playlist" aria-label="Add to a playlist"><span class="msi" style="font-size:22px">playlist_add</span></button>`;
  return html.replace('<div class="scol s-acts">', '<div class="scol s-acts">'+btn);
};
XActions.rowAddPl = function(d){ if(!d || !d.id) return; ST.pick = { kind:'playlist', songId: d.id }; render(); };

/* ---- recording: the whole band, not just the voice ---- */
(function(){
  const md = navigator.mediaDevices;
  if(md && md.getUserMedia && !md._nMusic){
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = function(c){
      // a song take (New / Edit song): ask for the raw microphone
      if(c && c.audio===true && !c.video && ST.screen==='create')
        c = { audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:{ ideal:2 } } };
      return orig(c).catch(err=>{
        // a microphone that won't take those settings still records
        if(c && c.audio && c.audio!==true && err && (err.name==='OverconstrainedError' || err.name==='TypeError')) return orig({ audio:true });
        throw err;
      });
    };
    md._nMusic = true;
  }
  const MR = window.MediaRecorder;
  if(MR && !MR._nMusic){
    class NMediaRecorder extends MR {
      constructor(stream, opts){
        const o = Object.assign({}, opts||{});
        if(ST.screen==='create' && o.audioBitsPerSecond==null && o.bitsPerSecond==null) o.audioBitsPerSecond = 192000;
        try{ super(stream, o); }catch(e){ super(stream, opts); }
      }
    }
    NMediaRecorder._nMusic = true;
    window.MediaRecorder = NMediaRecorder;
  }
})();

/* ============================================================
   ROUND 15
   · Chords panel: no Record / speed at its foot. A take of chords is
     recorded with the keys (Keys tab), or with Record at the top.
   · Keys recording keeps a playable pace (lyrics without a recorded
     tempo move at a relaxed pace; the speed choice slows or speeds it),
     the line being played stays in view, and the chords tapped land.
   · Record (at the top) on a song that has lyrics: the lyrics are shown
     and scroll at the chosen speed while you record. If the take has no
     clear singing, the chords are placed by where the lyrics were.
   · "You've already added …" only when that kind of data is there.
   · Edit song: one Done, at the bottom.
   ============================================================ */
(function(){
  const css = `
.ncap-sp{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center}
.ncap-sp span{font-size:13px;color:var(--n-mute);margin-right:4px}
.ncap-sp button{height:34px;min-width:52px;padding:0 10px;border-radius:17px;border:1px solid var(--n-line2);background:transparent;color:#fff;font-size:14px;font-weight:700}
.ncap-sp button.on{background:#fff;color:#2A1250;border-color:#fff}
.ntele-wrap{width:100%;max-width:760px;flex:1;min-height:0;display:flex;flex-direction:column;align-items:stretch;margin-top:14px}
.ntele-head{display:flex;align-items:center;gap:10px;font-size:15px;color:var(--n-mute);padding:0 4px 10px}
.ntele-head b{color:#fff;font-variant-numeric:tabular-nums}
.ntele-head .ntt{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;color:#fff;font-weight:600}
.ntele-dot{width:12px;height:12px;border-radius:50%;background:#FF6B8B;flex:none}
.ntele-wrap.rec .ntele-dot{animation:kbPulse 1s ease-in-out infinite}
.ntele{position:relative;flex:1;min-height:240px;overflow:hidden;border-radius:24px;background:rgba(255,255,255,.05);border:1px solid var(--n-line);-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 12%,#000 82%,transparent 100%);mask-image:linear-gradient(180deg,transparent 0,#000 12%,#000 82%,transparent 100%)}
.ntele-in{position:absolute;left:0;right:0;top:0;padding:0 28px;will-change:transform}
.ntl{font-size:30px;line-height:1.3;padding:10px 0;color:rgba(255,255,255,.42);transition:color .25s ease}
.ntl.on{color:#fff}
.ntl.hd{font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.35);padding:16px 0 4px}
.ntl .nch{display:inline-block;font-size:15px;font-weight:800;color:var(--n-pink);transform:translateY(-14px);margin-right:4px}
.ntele-cd{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:150px;font-weight:800;color:#fff;background:rgba(26,14,56,.55)}
.ntele-acts{display:flex;gap:12px;justify-content:center;margin-top:16px}
@media (max-width:700px){ .ntl{font-size:24px} .ntele-in{padding:0 18px} }
@media (max-height:520px){ .ntl{font-size:22px;padding:6px 0} .ntele{min-height:150px} }
`;
  const st = document.createElement('style'); st.id = 'nightCss15'; st.textContent = css;
  document.head.appendChild(st);
})();

/* ---- the Chords panel goes back to just the chords ---- */
renderChordPicker = function(){ return _n12Picker(); };

/* ---- recording with the keys: a playable pace, the line in view ---- */
KB_SPEEDS.splice(0, KB_SPEEDS.length, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2);
// lyrics with no recorded tempo are timed at a quick sung pace; a take on
// the keys moves at a little over half of that, so there's time to play
function nKbPace(){ const s = D.songs[ST.editId]; const tm = s && timing(s); return (s && s.wordTimestamps && tm && s.wordTimestamps.length===tm.words.length) ? 1 : 0.55; }
kbRecTime = function(at){ const r = KB.rec; if(r._pace==null) r._pace = nKbPace(); return r.startT + Math.max(0, at - r.t0)/1000*r.speed*r._pace; };
const _n15KbStart = kbRecStart;
kbRecStart = function(){
  _n15KbStart();
  const r = KB.rec; if(!r) return;
  r._pace = nKbPace();
  // the lead-in and run-out are real seconds, whatever the pace
  const firstT = r.startT > 0 ? r.startT + 1.5*r.speed : r.tm.words[0].t;
  r.startT = Math.max(0, firstT - 1.5*r.speed*r._pace);
  r.end = r.tm.words[r.tm.words.length-1].t + 2*r.speed*r._pace;
};
let _n15ScrollAt = 0;
const _n15Tick = kbRecTick;
kbRecTick = function(){
  _n15Tick();
  const r = KB.rec; if(!r || r.phase!=='run') return;
  const box = document.getElementById('editorLyricsScroll'); if(!box) return;
  const cur = box.querySelector('.lword.kb-cur') || box.querySelector('.kb-caret'); if(!cur) return;
  const br = box.getBoundingClientRect(), cr = cur.getBoundingClientRect(), now = performance.now();
  // after a redraw (a chord landing) the lyrics box starts at the top again: bring the line back
  if((cr.top < br.top + br.height*0.12 || cr.bottom > br.top + br.height*0.7) && now - _n15ScrollAt > 450){
    _n15ScrollAt = now;
    box.scrollTo({ top: Math.max(0, box.scrollTop + (cr.top - br.top) - box.clientHeight*0.35), behavior: 'smooth' });
  }
};

/* ---- Record at the top: the lyrics scroll while you record ---- */
const N_CAP_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
XActions.capSpeed = function(d){ ST.capSpeed = +d.id || 1; render(); };
// each word's time in seconds at x1: the song's own timing when it has a
// recorded tempo, otherwise a relaxed pace (and never before two seconds in)
function nTeleTimes(d){
  const tm = timing(d), synced = d.wordTimestamps && d.wordTimestamps.length===tm.words.length;
  let ts = tm.words.map(w=> synced ? w.t : w.t/0.55);
  if(ts.length && ts[0] < 2){ const sh = 2 - ts[0]; ts = ts.map(t=>t+sh); }
  return ts;
}
function nTeleOn(){
  const d = D.songs[ST.editId];
  return ST.screen==='create' && ST.createMode==='recording' && (ST.phase==='countdown' || ST.phase==='recording') && d && hasLyrics(d);
}
let _n15Tele = null;   // { t0, speed, times, lyrics }
function nTeleHTML(d){
  const lines = parseLyrics(d.lyrics), chords = d.chords || {};
  const rows = lines.map((ws,li)=>{
    if(isHeaderLine(ws)) return `<div class="ntl hd" data-li="${li}">${esc(ws.join(' ').replace(/^[\[(]+|[\])]+$/g,''))}</div>`;
    if(!ws.length) return '';
    return `<div class="ntl" data-li="${li}">${ws.map((w,wi)=>(chords[li+'-'+wi] ? `<span class="nch">${esc(chords[li+'-'+wi])}</span>` : '')+esc(w)).join(' ')}</div>`;
  }).join('');
  const speed = ST.capSpeed || 1, rec = ST.phase==='recording';
  return `<div class="scr center" style="padding-top:16px">
    <div class="ntele-wrap${rec?' rec':''}">
      <div class="ntele-head"><span class="ntele-dot"></span><b>${rec ? fmtTime(ST.recT) : 'Get ready'}</b><span class="ntt">${esc(d.title||'Your song')}</span><span>x${speed}</span></div>
      <div class="ntele" id="nTele"><div class="ntele-in" id="nTeleIn">${rows}</div>${ST.phase==='countdown' ? `<div class="ntele-cd">${Math.max(1,Math.ceil(ST.cd))}</div>` : ''}</div>
      <div class="ntele-acts">${rec ? `<button class="btn btn-accent" style="width:150px" data-act="stopRecord">Stop</button><button class="btn btn-outline" style="width:150px" data-act="abortRecord">Abort</button>` : `<button class="btn btn-outline" style="width:150px" data-act="abortRecord">Cancel</button>`}</div>
    </div>
  </div>`;
}
function nTelePlace(){
  const inner = document.getElementById('nTeleIn'), box = document.getElementById('nTele');
  if(!inner || !box || !_n15Tele) return;
  const t = _n15Tele.t0 ? (performance.now() - _n15Tele.t0)/1000 * _n15Tele.speed : 0;
  const tm = timing(D.songs[ST.editId]), ts = _n15Tele.times;
  if(!tm.words.length) return;
  // the line being played, and how far through it we are
  let wi = -1; for(let i=0;i<ts.length;i++){ if(ts[i] <= t) wi = i; else break; }
  const li = wi>=0 ? tm.words[wi].li : tm.words[0].li;
  const lineFirst = i=>tm.words.findIndex(w=>w.li===i);
  const a = wi>=0 ? ts[lineFirst(li)] : 0;
  const nextIdx = tm.words.findIndex(w=>w.li>li), b = nextIdx>=0 ? ts[nextIdx] : a + 4;
  const frac = wi>=0 ? Math.max(0, Math.min(1, (t - a)/Math.max(0.3, b - a))) : 0;
  const el = inner.querySelector('.ntl[data-li="'+li+'"]'), nx = nextIdx>=0 ? inner.querySelector('.ntl[data-li="'+tm.words[nextIdx].li+'"]') : null;
  if(!el) return;
  const y0 = el.offsetTop + el.offsetHeight/2, y1 = nx ? nx.offsetTop + nx.offsetHeight/2 : y0;
  const y = y0 + (y1 - y0)*frac;
  inner.style.transform = 'translate3d(0,'+(box.clientHeight*0.38 - y).toFixed(1)+'px,0)';
  inner.querySelectorAll('.ntl.on').forEach(x=>{ if(x!==el) x.classList.remove('on'); });
  if(wi>=0) el.classList.add('on');
}
let _n15Raf = 0;
function nTeleLoop(){ _n15Raf = 0; if(!nTeleOn()) return; nTelePlace(); _n15Raf = requestAnimationFrame(nTeleLoop); }
const _n15RenderCreate = renderCreate;
renderCreate = function(){
  if(!nTeleOn()) return _n15RenderCreate();
  return nTeleHTML(D.songs[ST.editId]);
};
const _n15Render = render;
render = function(){
  if(nTeleOn()){
    const d = D.songs[ST.editId];
    // a new take (or new lyrics) starts a fresh timeline
    if(!_n15Tele || _n15Tele.lyrics!==d.lyrics || (ST.phase==='countdown' && _n15Tele.t0)) _n15Tele = { t0:0, speed: ST.capSpeed || 1, times: nTeleTimes(d), lyrics: d.lyrics };
    if(ST.phase==='recording' && !_n15Tele.t0) _n15Tele.t0 = performance.now();
  }
  _n15Render();
  if(nTeleOn()){ nTelePlace(); if(!_n15Raf) _n15Raf = requestAnimationFrame(nTeleLoop); }
};
// the take carries the lyrics' timing with it, for placing the chords
const _n15Blob = processRecordingBlob;
processRecordingBlob = async function(songObj, blob){
  if(_n15Tele && _n15Tele.t0 && blob && ST.createMode==='recording' && performance.now() - _n15Tele.t0 < 2*3600*1000){
    try{ blob._nTele = { lyrics: _n15Tele.lyrics, times: _n15Tele.times.map(t=>t/_n15Tele.speed) }; }catch(e){}
  }
  _n15Tele = null;
  return _n15Blob(songObj, blob);
};

/* ---- the merge: chords from the take, by its words, its timing or the scrolling lyrics ---- */
function nIntroFrom(res, firstT){
  const intro = [];
  (res.sheet.chordTimeline||[]).forEach(seg=>{
    const name = seg.concert || seg.shown;
    if(name && seg.start < firstT - 0.3 && (!intro.length || intro[intro.length-1].ch!==name)) intro.push({ t: Math.round(seg.start*100)/100, ch: name });
  });
  return intro;
}
nMergeTake = function(s, res, blob){
  const hadChords = nHasChords(s);
  const said = _n12bMergeTake(s, res, blob);
  try{
    const tele = blob && blob._nTele;
    const W = nWords(s.lyrics);
    let heard = 0; (res.sheet.sections||[]).forEach(sec=>(sec.lines||[]).forEach(ln=>{ heard += (ln.words||[]).length; }));
    const teleFits = tele && tele.lyrics===s.lyrics && tele.times.length===W.length;
    // played along to the scrolling lyrics without (clear) singing: the lyrics' own timing is the truth
    if(teleFits && heard < W.length*0.3){
      s.wordTimestamps = tele.times.slice();
      const notes = { ...(s.notes||{}) }, intro = nIntroFrom(res, s.wordTimestamps[0]||0);
      if(intro.length && (s.wordTimestamps[0]||0) >= 2.5) notes._intro = intro; else delete notes._intro;
      s.notes = notes;
    }
    const tmp = { id:'tmp', title:'', sub:'', lyrics:'', chords:{}, notes:{} };
    audioSheetToSong(tmp, res.sheet);
    const capoHere = /^\s*\[capo\s*\d+\]/im.test(s.lyrics||''), capo = +(res.sheet.capo||0);
    let carried = s.lyrics===tmp.lyrics ? { ...tmp.chords } : nTransfer(tmp.lyrics, tmp.chords, s.lyrics);
    if(capo>0 && !capoHere){ const flats = /b/.test(((res.sheet.chordTimeline||[]).find(x=>x.concert)||{}).concert||''); Object.keys(carried).forEach(k=>{ carried[k] = transposeChord(carried[k], capo, flats); }); }
    const base = s.chords || {}, timed = nTimelineChords(s.lyrics, s.wordTimestamps, res.sheet.chordTimeline);
    const teled = teleFits ? nTimelineChords(s.lyrics, tele.times, res.sheet.chordTimeline) : null;
    // whichever puts chords on the most lines; on a tie the chords you had
    // win, then the ones placed by the scrolling lyrics, then the take's own
    const cands = (hadChords ? [base] : []).concat(teled ? [teled] : [], [carried, timed], hadChords ? [] : [base]);
    let best = cands[0], bn = nLinesWithChords(s.lyrics, best);
    cands.slice(1).forEach(c=>{ const n = nLinesWithChords(s.lyrics, c); if(n > bn){ best = c; bn = n; } });
    s.chords = best;
  }catch(e){ console.error('Singa: placing the take’s chords failed', e); }
  return said;
};

/* ---- Record / Upload screen: the speed, and the right "already added" note ---- */
function nHasChords(d){ return Object.keys((d && d.chords)||{}).some(k=>/^\d+-/.test(k)); }
const _n15Capture = nCaptureBody;
nCaptureBody = function(d){
  let html = _n15Capture(d).replace(/\s*<div class="ncap-n">[\s\S]*?<\/div>/, '');
  let note = '';
  if(ST.step==='lyrics' && hasLyrics(d)) note = "You've already added lyrics. Singa keeps whichever is more complete.";
  else if(ST.step==='chords' && nHasChords(d)) note = "You've already added chords. Singa keeps whichever is more complete.";
  let extra = '';
  if(ST.createMode==='recording' && hasLyrics(d) && ST.step!=='markings'){
    const sp = ST.capSpeed || 1;
    extra = `<div class="ncap-sp" role="group" aria-label="Lyrics scroll speed"><span>Lyrics scroll</span>${N_CAP_SPEEDS.map(v=>`<button class="${v===sp?'on':''}" data-xact="capSpeed" data-id="${v}" aria-pressed="${v===sp}">x${v}</button>`).join('')}</div>`
      + `<div class="ncap-s" style="margin-top:-4px">Your lyrics scroll while you record, so you can play along.</div>`;
  }
  if(note) extra += `<div class="ncap-n">${icon('merge',16)}${note}</div>`;
  return extra ? html.replace('<div class="ncap-legal">', extra+'\n    <div class="ncap-legal">') : html;
};

/* ---- Edit song: one Done, at the bottom ---- */
const _n15RenderCreate2 = renderCreate;
renderCreate = function(){
  let html = _n15RenderCreate2();
  if(!ST.editing || nTeleOn()) return html;
  html = html.replace(/(<\/div>\s*)<button class="btn btn-dark btn-sm" data-act="editDone">Done<\/button>(\s*<\/div>)/, '$1<span style="width:26px"></span>$2');
  // Tempo (and the Record / Upload screens) had no Done of their own at the bottom
  const manual = !ST.createMode || ST.createMode==='manual';
  if(ST.phase==='idle' && (!manual || ST.step==='sync') && html.indexOf('data-act="editDone">Done')<0)
    html = html.replace(/\s*<\/div>\s*$/, `\n    <div class="row" style="align-self:center;margin-top:22px"><button class="btn btn-dark" style="width:220px;height:48px" data-act="editDone">Done</button></div>\n  </div>`);
  return html;
};

render();
