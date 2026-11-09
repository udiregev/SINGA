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

/* ============================================================
   ROUND 16 · Spotify playlists
   Link one of your Spotify playlists to a Singa playlist. Every track in
   it (now, and any added later) becomes a Singa song with the track's
   title and artist, ready for lyrics, chords, markings and tempo. Singa
   checks for new tracks when it opens, and on "Sync now".
   · Sign-in is Spotify's PKCE flow: only the app's Client ID is needed
     here (never the secret). Each device connects once.
   · Tracks removed on Spotify stay in Singa.
   ============================================================ */
const SP_CLIENT_ID = 'f96a69603fc84b31b65d85cd0462cafb';
const SP_SCOPES = 'playlist-read-private playlist-read-collaborative';
const SP_KEY = 'singa-sp', SP_PEND = 'singa-sp-pending', SP_LINKS = 'singa-sp-links';
(function(){
  const css = `
.nsp-row .t{color:#fff}
.nsp-ico{width:22px;height:22px;flex:none}
.nsp-sync{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px 0 10px;border-radius:17px;border:1px solid rgba(30,215,96,.55);color:#fff;font-size:13px;font-weight:700;cursor:pointer;margin-left:14px;white-space:nowrap}
.nsp-sync.busy{opacity:.6;pointer-events:none}
.nsp-list{display:flex;flex-direction:column;max-height:min(60vh,520px);overflow:auto;margin:0 -6px}
.nsp-pl{display:flex;align-items:center;gap:12px;padding:10px 6px;border-radius:14px;cursor:pointer;text-align:left;border:0;background:none;color:#fff;width:100%}
.nsp-pl:active{background:rgba(255,255,255,.08)}
.nsp-pl img,.nsp-pl .nsp-ph{width:46px;height:46px;border-radius:8px;object-fit:cover;flex:none;background:rgba(255,255,255,.08)}
.nsp-pl b{display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nsp-pl small{display:block;font-size:12px;color:var(--n-mute)}
.nsp-pl.on{opacity:.45;pointer-events:none}
.nsp-note{font-size:13px;color:var(--n-mute);line-height:1.45}
`;
  const st = document.createElement('style'); st.id = 'nightCss16'; st.textContent = css;
  document.head.appendChild(st);
})();
const SP_LOGO = `<svg class="nsp-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1ed760"></circle><path d="M6.5 9.2c3.8-1.1 7.6-.8 11 1M7.2 12.4c3-.8 6.1-.6 8.8.9M7.9 15.4c2.3-.6 4.6-.4 6.6.7" stroke="#000" stroke-width="1.6" fill="none" stroke-linecap="round"></path></svg>`;
function spGet(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
function spSet(k, v){ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function spRedirect(){ return location.origin + location.pathname; }
function spConnected(){ const t = spGet(SP_KEY); return !!(t && t.refresh); }
function spB64url(buf){ return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function spRand(n){ const a = new Uint8Array(n); crypto.getRandomValues(a); const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'; return Array.from(a, x=>c[x % c.length]).join(''); }
// Off to Spotify to sign in; it comes back to this page with a code
async function spConnect(after){
  const verifier = spRand(64), state = 'singa-sp-' + spRand(12);
  const challenge = spB64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  spSet(SP_PEND, { verifier, state, after: after || 'pick', at: Date.now() });
  const q = new URLSearchParams({ client_id: SP_CLIENT_ID, response_type:'code', redirect_uri: spRedirect(), code_challenge_method:'S256', code_challenge: challenge, scope: SP_SCOPES, state });
  location.href = 'https://accounts.spotify.com/authorize?' + q.toString();
}
async function spToken(body){
  const r = await fetch('https://accounts.spotify.com/api/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
  const j = await r.json().catch(()=>({}));
  if(!r.ok || !j.access_token) throw new Error(j.error_description || j.error || ('Spotify answered '+r.status));
  const old = spGet(SP_KEY) || {};
  const t = { access: j.access_token, refresh: j.refresh_token || old.refresh, exp: Date.now() + (j.expires_in||3600)*1000 };
  spSet(SP_KEY, t); return t;
}
async function spAccess(force){
  const t = spGet(SP_KEY); if(!t || !t.refresh) throw new Error('not connected');
  if(!force && t.access && t.exp > Date.now() + 60000) return t.access;
  try{ return (await spToken({ grant_type:'refresh_token', refresh_token: t.refresh, client_id: SP_CLIENT_ID })).access; }
  catch(e){ if(/invalid_grant|revoked/i.test(e.message)) spSet(SP_KEY, null); throw e; }
}
async function spApi(url){
  if(!/^https:/.test(url)) url = 'https://api.spotify.com/v1' + url;
  let tok = await spAccess(), r = await fetch(url, { headers:{ Authorization:'Bearer '+tok } });
  if(r.status===401){ tok = await spAccess(true); r = await fetch(url, { headers:{ Authorization:'Bearer '+tok } }); }
  if(r.status===429){ const w = (+r.headers.get('Retry-After')||2)*1000; await new Promise(x=>setTimeout(x, Math.min(w, 10000))); r = await fetch(url, { headers:{ Authorization:'Bearer '+tok } }); }
  if(!r.ok){ const j = await r.json().catch(()=>({})); const e = new Error((j.error && j.error.message) || ('Spotify answered '+r.status)); e.status = r.status; throw e; }
  return r.json();
}
// Back from Spotify with a code (or a "no"): swap it for a sign-in that lasts
async function spHandleReturn(){
  const q = new URLSearchParams(location.search), pend = spGet(SP_PEND);
  const state = q.get('state'); if(!state || !/^singa-sp-/.test(state)) return null;
  const code = q.get('code'), err = q.get('error');
  try{ history.replaceState(null, '', spRedirect() + location.hash); }catch(e){}
  if(!pend || pend.state!==state){ return { error:'That Spotify sign-in had expired — try again' }; }
  spSet(SP_PEND, null);
  if(err || !code) return { error: err==='access_denied' ? 'Spotify wasn’t connected' : 'Spotify sign-in didn’t finish — try again' };
  try{ await spToken({ grant_type:'authorization_code', code, redirect_uri: spRedirect(), client_id: SP_CLIENT_ID, code_verifier: pend.verifier }); return { ok:true, after: pend.after }; }
  catch(e){ console.error('Singa: Spotify sign-in failed', e); return { error:'Spotify sign-in failed: '+e.message }; }
}

/* ---- which Singa playlist follows which Spotify playlist ---- */
function spLinks(){ return spGet(SP_LINKS) || {}; }
function spApplyLinks(){
  const L = spLinks();
  (D.playlists||[]).forEach(p=>{ if(!p.spotifyId && L[p.id]) p.spotifyId = L[p.id]; if(p.spotifyId) p.src = 'spotify'; });
}
const _n16PlRow = playlistRowToLocal;
playlistRowToLocal = function(row){
  const p = _n16PlRow(row);
  if(row.spotify_id) p.spotifyId = row.spotify_id;
  if(!p.spotifyId){ const L = spLinks(); if(L[p.id]) p.spotifyId = L[p.id]; }
  if(p.spotifyId) p.src = 'spotify';
  return p;
};
async function spSaveLink(p){
  const L = spLinks(); if(p.spotifyId) L[p.id] = p.spotifyId; else delete L[p.id]; spSet(SP_LINKS, L);
  if(!ST.userId) return;
  try{
    await savePlaylistRow(p);
    const r = await sb.from('playlists').update({ spotify_id: p.spotifyId || null }).eq('id', p.id);
    if(r && r.error) console.warn('Singa: the playlist link is kept on this device only (add a spotify_id column to playlists to share it)', r.error);
  }catch(e){ console.warn('Singa: playlist link not saved to the database', e); }
}

/* ---- the sync ---- */
function spCleanTitle(t){
  return String(t||'').replace(/\s+-\s+((\d{4}\s+)?(digital(ly)?\s+)?remaster(ed)?(\s+\d{4})?|(\d{4}\s+)?mono( version)?|(\d{4}\s+)?stereo( mix)?|single version|radio edit)\s*$/i, '')
    .replace(/\s*\((\d{4}\s+)?(digital(ly)?\s+)?remaster(ed)?(\s+\d{4})?\)\s*$/i, '').trim();
}
function spNorm(t){ return String(t||'').toLowerCase().replace(/\(.*?\)|\[.*?\]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
function spFindSong(tid, title, artist){
  const ids = D.order || [];
  for(const id of ids){ const x = D.songs[id]; const sp = x && x.notes && x.notes._spotify; if(sp && (sp.id===tid || (sp.url||'').indexOf('/track/'+tid)>=0)) return x; }
  const nt = spNorm(title), na = spNorm(artist).split(' ').filter(w=>w!=='the').sort((x,y)=>y.length-x.length)[0] || '';
  for(const id of ids){ const x = D.songs[id]; if(!x || x.mine===false) continue; if(spNorm(x.title)===nt && (!x.sub || !na || spNorm(x.sub).indexOf(na)>=0)) return x; }
  return null;
}
async function spTracks(listId){
  const out = []; let url = '/playlists/'+encodeURIComponent(listId)+'/items?limit=100', usedOld = false;
  while(url){
    let j;
    try{ j = await spApi(url); }
    catch(e){ if(e.status===404 && !usedOld){ usedOld = true; url = '/playlists/'+encodeURIComponent(listId)+'/tracks?limit=100'; continue; } throw e; }
    (j.items||[]).forEach(it=>{
      const t = it && (it.item || it.track); if(!t || (t.type && t.type!=='track')) return;
      out.push({ id: t.id || ('local:'+t.uri), name: t.name, artist: (t.artists||[]).map(a=>a.name).filter(Boolean).join(', '), url: (t.external_urls && t.external_urls.spotify) || (t.id ? 'https://open.spotify.com/track/'+t.id : '') });
    });
    url = j.next || null;
  }
  return out;
}
const _spBusy = new Set();
async function spSync(p, quiet){
  if(!p || !p.spotifyId || _spBusy.has(p.id)) return 0;
  _spBusy.add(p.id); render();
  let added = 0, linked = 0;
  try{
    const tracks = await spTracks(p.spotifyId);
    const ids = (p.ids||[]).slice();
    tracks.forEach(t=>{
      if(!t.name) return;
      const title = spCleanTitle(t.name);
      let s = spFindSong(t.id, title, t.artist);
      if(!s){
        const id = 'sp'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
        s = { id, title, sub: t.artist||'', lyrics:'', chords:{}, notes:{ _spotify:{ url: t.url, id: t.id } }, synced:false, isPublic:false, plays:0, added:Date.now(), mine:true };
        D.songs[id] = s; D.order = [id, ...D.order]; saveSongRow(s); added++;
      } else if(!(s.notes && s.notes._spotify) && s.mine!==false){
        s.notes = { ...(s.notes||{}), _spotify:{ url: t.url, id: t.id } }; queueSaveSong(s.id);
      }
      if(!ids.includes(s.id)){ ids.push(s.id); linked++; }
    });
    const autoPl = (D.playlists||[]).find(x=>x.auto); if(autoPl) autoPl.ids = D.order;
    if(linked){ p.ids = ids; savePlaylistRow(p); }
    p.spSyncedAt = Date.now();
    if(!quiet || added) toast(added ? added+' new song'+(added===1?'':'s')+' from Spotify' : '“'+p.title+'” is up to date with Spotify');
  }catch(e){
    console.error('Singa: Spotify sync failed', e);
    if(e.message==='not connected'){ if(!quiet) toast('Connect Spotify first'); }
    else if(!quiet) toast(e.status===403 ? 'Spotify only shares playlists you own or collaborate on' : 'Spotify sync failed: '+e.message);
  }finally{ _spBusy.delete(p.id); render(); }
  return added;
}
async function spSyncAll(quiet){ for(const p of (D.playlists||[]).filter(x=>x.spotifyId && x.mine!==false)) await spSync(p, quiet); }

/* ---- choosing a Spotify playlist ---- */
async function spOpenPicker(){
  ST.newItem = { kind:'splink', loading:true, list:[] }; render();
  try{
    const me = await spApi('/me');
    const list = []; let url = '/me/playlists?limit=50';
    while(url && list.length < 400){ const j = await spApi(url); (j.items||[]).forEach(x=>{ if(x && (x.owner && x.owner.id===me.id || x.collaborative)) list.push(x); }); url = j.next || null; }
    if(!ST.newItem || ST.newItem.kind!=='splink') return;
    ST.newItem = { kind:'splink', loading:false, list: list.map(x=>({ id:x.id, name:x.name, n: (x.items && x.items.total) || (x.tracks && x.tracks.total) || 0, img: x.images && x.images.length ? x.images[x.images.length-1].url : '' })) };
  }catch(e){
    console.error('Singa: Spotify playlists failed', e);
    ST.newItem = null; toast(e.message==='not connected' ? 'Connect Spotify first' : 'Couldn’t get your Spotify playlists: '+e.message);
  }
  render();
}
XActions.spLinkStart = function(){ if(!canSync()) return; if(spConnected()) spOpenPicker(); else spConnect('pick'); };
XActions.spPick = async function(d){
  const ni = ST.newItem; const x = ni && (ni.list||[]).find(y=>y.id===d.id); if(!x) return;
  ST.newItem = null;
  let p = (D.playlists||[]).find(y=>y.spotifyId===x.id && y.mine!==false);
  if(!p){
    p = { id:'p'+Date.now(), title: x.name || 'Spotify playlist', ids:[], mine:true, isPublic:false, added:Date.now(), plays:0, src:'spotify', spotifyId: x.id };
    D.playlists.splice(1, 0, p);
  }
  ST.screen = 'list'; ST.listKind = 'songs'; ST.listPl = p.id; render();
  await spSaveLink(p);
  spSync(p);
};
XActions.spSyncNow = function(d){ const p = (D.playlists||[]).find(y=>y.id===d.id); if(!p) return; if(!spConnected()){ spConnect('sync:'+p.id); return; } spSync(p); };
XActions.spUnlink = function(d){
  const p = (D.playlists||[]).find(y=>y.id===d.id); if(!p) return;
  p.spotifyId = null; p.src = null; spSaveLink(p); toast('No longer synced with Spotify'); render();
};
const _n16NewModal = renderNewModal;
renderNewModal = function(){
  const ni = ST.newItem;
  if(!ni || ni.kind!=='splink') return _n16NewModal();
  const linked = new Set((D.playlists||[]).map(p=>p.spotifyId).filter(Boolean));
  const body = ni.loading ? `<div class="nsp-note">Getting your playlists from Spotify…</div>`
    : !ni.list.length ? `<div class="nsp-note">No playlists found. Singa can follow playlists you made or collaborate on.</div>`
    : `<div class="nsp-list">${ni.list.map(x=>`<button class="nsp-pl${linked.has(x.id)?' on':''}" data-act="x" data-xact="spPick" data-id="${esc(x.id)}">${x.img ? `<img src="${esc(x.img)}" alt="">` : `<span class="nsp-ph"></span>`}<span style="min-width:0;flex:1"><b>${esc(x.name)}</b><small>${x.n} track${x.n===1?'':'s'}${linked.has(x.id)?' · already linked':''}</small></span></button>`).join('')}</div>`;
  return `<div class="modal-backdrop" data-act="closeNew"><div class="modal" style="max-width:440px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600;display:flex;align-items:center;gap:10px">${SP_LOGO}Link a Spotify playlist</span><span class="icon-btn" data-act="closeNew">${icon('close',22)}</span></div>
    <div class="nsp-note">Every track becomes a song in Singa with its title and artist, and new tracks follow when Singa opens.</div>
    ${body}
  </div></div>`;
};
// the Playlists list: a row to link one; a linked playlist: Sync now
const _n16RenderList = renderList;
renderList = function(){
  let html = _n16RenderList();
  const curPl = ST.listPl ? (D.playlists||[]).find(p=>p.id===ST.listPl) : null;
  if(ST.listKind==='playlists' && !curPl){
    const row = `<div class="list-row addrow nsp-row" data-xact="spLinkStart"><div class="t">${SP_LOGO}Link a Spotify playlist</div></div>`;
    html = html.replace('<div style="overflow:auto;padding-left:40px">', '<div style="overflow:auto;padding-left:40px">'+row);
  }
  if(ST.listKind==='songs' && curPl && curPl.spotifyId && curPl.mine!==false){
    const busy = _spBusy.has(curPl.id);
    const btn = `<span class="nsp-sync${busy?' busy':''}" data-xact="spSyncNow" data-id="${esc(curPl.id)}" title="Add any new tracks from Spotify">${SP_LOGO}${busy?'Syncing…':'Sync now'}</span>`;
    html = html.replace('<div style="flex:1"></div>', btn+'<div style="flex:1"></div>');
  }
  return html;
};

/* ---- start-up: finish a Spotify sign-in, then check linked playlists ---- */
let _n16Loaded = false;
const _n16Load = loadUserData;
loadUserData = async function(){ await _n16Load.apply(this, arguments); spApplyLinks(); _n16Loaded = true; };
(async function(){
  const ret = await spHandleReturn();
  const t0 = Date.now();
  while(!(ST.userId && (_n16Loaded || Date.now()-t0 > 8000)) && Date.now()-t0 < 60000) await new Promise(r=>setTimeout(r, 400));
  if(!ST.userId) return;
  spApplyLinks(); render();
  if(ret && ret.error){ toast(ret.error); }
  else if(ret && ret.ok){
    toast('Spotify connected');
    if(ret.after && ret.after.indexOf('sync:')===0){ const p = (D.playlists||[]).find(y=>y.id===ret.after.slice(5)); if(p){ ST.screen='list'; ST.listKind='songs'; ST.listPl=p.id; render(); spSync(p); return; } }
    ST.screen = 'list'; ST.listKind = 'playlists'; ST.listPl = null; render();
    spOpenPicker(); return;
  }
  if(spConnected()) spSyncAll(true);
})();

/* ============================================================
   Round 17 — a public Spotify playlist by its link
   · "Link a Spotify playlist" now asks for the playlist's link
     (Spotify: ••• › Share › Copy link to playlist). Singa's server
     reads the playlist's public page and every track becomes a song
     with its title and artist.
   · A linked playlist shows a refresh button: it reads the playlist
     again and adds any new tracks.
   · Signing in to Spotify stays available for the few invited
     accounts; when signed in, refresh uses that first.
   ============================================================ */
(function(){
  const css = `
.nsp-in{display:flex;gap:8px;margin:14px 0 10px}
.nsp-in input{flex:1;min-width:0;height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;padding:0 14px;font-size:15px;outline:none}
.nsp-in input:focus{border-color:rgba(30,215,96,.75)}
.nsp-go{height:46px;padding:0 18px;border-radius:12px;border:0;background:#1ed760;color:#000;font-weight:700;font-size:15px;cursor:pointer;flex:none}
.nsp-go[disabled]{opacity:.5;pointer-events:none}
.nsp-err{color:#ff8a8a;font-size:13px;margin:-2px 0 8px}
.nsp-alt{font-size:13px;color:var(--n-mute);margin-top:14px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;display:inline-block}
.nsp-ref{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;min-width:34px;padding:0 12px 0 8px;border-radius:17px;border:1px solid rgba(30,215,96,.55);color:#fff;font-size:13px;font-weight:700;cursor:pointer;margin-left:14px;white-space:nowrap}
.nsp-ref svg.r{width:18px;height:18px}
.nsp-ref{flex:none}
@media (max-width:600px){.nsp-ref{padding:0;width:38px;height:38px;border-radius:19px;margin-left:10px}.nsp-ref .l{display:none}.nsp-ref svg.r{width:20px;height:20px}}
.nsp-ref.busy{opacity:.65;pointer-events:none}
.nsp-ref.busy svg.r{animation:nspSpin 1s linear infinite}
@keyframes nspSpin{to{transform:rotate(360deg)}}
`;
  const st = document.createElement('style'); st.id = 'nightCss17'; st.textContent = css;
  document.head.appendChild(st);
})();
const SP_PAGE_SERVER = (typeof LINK_SERVER!=='undefined' && LINK_SERVER) || 'https://singa-production-e6f3.up.railway.app';
const SP_REFRESH_ICO = `<svg class="r" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"></path><path d="M20 4v7h-7"></path></svg>`;
function spIdFromLink(s){ const m = String(s||'').match(/playlist[\/:]([A-Za-z0-9]{22})/) || String(s||'').trim().match(/^([A-Za-z0-9]{22})$/); return m ? m[1] : null; }
function spCleanPlName(n){ return String(n||'').replace(/\s*[|\-–]\s*(playlist by .*|spotify)\s*$/i,'').replace(/\s*\|\s*Spotify\s*$/i,'').trim(); }
// the playlist's tracks, read from its public page by Singa's server
async function spPageTracks(listId){
  let r;
  try{ r = await fetch(SP_PAGE_SERVER + '/spotify-playlist?url=' + encodeURIComponent('https://open.spotify.com/playlist/' + listId)); }
  catch(e){ const er = new Error('Singa’s server didn’t answer — try again in a minute'); er.page = true; throw er; }
  const j = await r.json().catch(()=>({}));
  if(!r.ok || !j.tracks){
    const er = new Error(r.status===404 && !j.error ? 'Singa’s server isn’t ready for Spotify links yet — try again in a few minutes' : (j.error || ('Singa’s server answered '+r.status)));
    er.page = true; er.status = r.status; throw er;
  }
  return { name: spCleanPlName(j.name), partial: !!j.partial, tracks: j.tracks.map(t=>({ id: t.id, name: t.title || t.name, artist: t.artist || '', url: t.url || (t.id ? 'https://open.spotify.com/track/'+t.id : '') })) };
}
// signed in → Spotify itself; otherwise (or if that's refused) → the public page
async function spAnyTracks(listId){
  if(spConnected()){
    try{ return { tracks: await spTracks(listId) }; }
    catch(e){ console.warn('Singa: Spotify API refused, reading the public page instead', e); }
  }
  return spPageTracks(listId);
}
spSync = async function(p, quiet, pre){
  if(!p || !p.spotifyId || _spBusy.has(p.id)) return 0;
  _spBusy.add(p.id); render();
  let added = 0, linked = 0;
  try{
    const res = pre || await spAnyTracks(p.spotifyId);
    const ids = (p.ids||[]).slice();
    res.tracks.forEach(t=>{
      if(!t.name) return;
      const title = spCleanTitle(t.name);
      let s = spFindSong(t.id, title, t.artist);
      if(!s){
        const id = 'sp'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
        s = { id, title, sub: t.artist||'', lyrics:'', chords:{}, notes:{ _spotify:{ url: t.url, id: t.id } }, synced:false, isPublic:false, plays:0, added:Date.now(), mine:true };
        D.songs[id] = s; D.order = [id, ...D.order]; saveSongRow(s); added++;
      } else if(!(s.notes && s.notes._spotify) && s.mine!==false){
        s.notes = { ...(s.notes||{}), _spotify:{ url: t.url, id: t.id } }; queueSaveSong(s.id);
      }
      if(!ids.includes(s.id)){ ids.push(s.id); linked++; }
    });
    const autoPl = (D.playlists||[]).find(x=>x.auto); if(autoPl) autoPl.ids = D.order;
    if(linked){ p.ids = ids; savePlaylistRow(p); }
    p.spSyncedAt = Date.now();
    if(!quiet || added){
      const more = res.partial ? ' (Spotify showed the first '+res.tracks.length+' tracks)' : '';
      toast(added ? added+' new song'+(added===1?'':'s')+' from Spotify'+more : linked ? '“'+p.title+'” is up to date with Spotify' : '“'+p.title+'” is up to date with Spotify'+more);
    }
  }catch(e){
    console.error('Singa: Spotify refresh failed', e);
    if(!quiet) toast(e.page ? e.message : 'Couldn’t refresh from Spotify: '+e.message);
  }finally{ _spBusy.delete(p.id); render(); }
  return added;
};
// on opening Singa, only signed-in accounts refresh by themselves
spSyncAll = async function(quiet){ if(!spConnected()) return; for(const p of (D.playlists||[]).filter(x=>x.spotifyId && x.mine!==false)) await spSync(p, quiet); };

XActions.spLinkStart = function(){ if(!canSync()) return; ST.newItem = { kind:'spurl', url:'', busy:false, err:'' }; render(); setTimeout(()=>{ const i = document.getElementById('nspUrl'); if(i) i.focus(); }, 60); };
XActions.spSignIn = function(){ ST.newItem = null; if(spConnected()) spOpenPicker(); else spConnect('pick'); };
XActions.spUrlGo = async function(){
  const ni = ST.newItem; if(!ni || ni.kind!=='spurl' || ni.busy) return;
  const inp = document.getElementById('nspUrl'); if(inp) ni.url = inp.value;
  const listId = spIdFromLink(ni.url);
  if(!listId){ ni.err = 'That doesn’t look like a Spotify playlist link'; render(); return; }
  let p = (D.playlists||[]).find(y=>y.spotifyId===listId && y.mine!==false);
  if(p){ ST.newItem = null; ST.screen='list'; ST.listKind='songs'; ST.listPl=p.id; render(); spSync(p); return; }
  ni.busy = true; ni.err = ''; render();
  let res;
  try{ res = await spPageTracks(listId); }
  catch(e){
    if(spConnected()){ try{ res = { tracks: await spTracks(listId) }; }catch(e2){} }
    if(!res){ if(ST.newItem===ni){ ni.busy = false; ni.err = e.message; render(); } return; }
  }
  if(ST.newItem!==ni) return;
  ST.newItem = null;
  p = { id:'p'+Date.now(), title: res.name || 'Spotify playlist', ids:[], mine:true, isPublic:false, added:Date.now(), plays:0, src:'spotify', spotifyId: listId };
  D.playlists.splice(1, 0, p);
  ST.screen = 'list'; ST.listKind = 'songs'; ST.listPl = p.id; render();
  await spSaveLink(p);
  spSync(p, false, res);
};
XActions.spSyncNow = function(d){ const p = (D.playlists||[]).find(y=>y.id===d.id); if(p) spSync(p); };
Binds.spUrl = function(v){ const ni = ST.newItem; if(ni && ni.kind==='spurl'){ ni.url = v; if(ni.err){ ni.err=''; const e = document.querySelector('.nsp-err'); if(e) e.remove(); } } };

const _n17NewModal = renderNewModal;
renderNewModal = function(){
  const ni = ST.newItem;
  if(!ni || ni.kind!=='spurl') return _n17NewModal();
  return `<div class="modal-backdrop" data-act="closeNew"><div class="modal" style="max-width:460px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600;display:flex;align-items:center;gap:10px">${SP_LOGO}Add a Spotify playlist</span><span class="icon-btn" data-act="closeNew">${icon('close',22)}</span></div>
    <div class="nsp-note">Paste the link to a public playlist (in Spotify: ••• › Share › Copy link to playlist). Every track becomes a song in Singa with its title and artist. Tap refresh on the playlist later to add new tracks.</div>
    <form class="nsp-in" onsubmit="event.preventDefault();XActions.spUrlGo()">
      <input id="nspUrl" type="text" inputmode="url" autocomplete="off" placeholder="https://open.spotify.com/playlist/…" value="${esc(ni.url||'')}" data-bind="spUrl" ${ni.busy?'disabled':''}>
      <button class="nsp-go" type="submit" ${ni.busy?'disabled':''}>${ni.busy?'Reading…':'Add'}</button>
    </form>
    ${ni.err ? `<div class="nsp-err">${esc(ni.err)}</div>` : ''}
    <div class="nsp-note" style="font-size:12px">Singa reads the playlist’s public Spotify page. Very long playlists may only bring their first 100 or so tracks.</div>
    <span class="nsp-alt" data-xact="spSignIn">${spConnected() ? 'Choose from my Spotify playlists instead' : 'Sign in to Spotify instead (invited accounts only)'}</span>
  </div></div>`;
};
// the linked playlist's button becomes a refresh icon
const _n17RenderList = renderList;
renderList = function(){
  let html = _n17RenderList();
  html = html.replace('Link a Spotify playlist</div>', 'Add a Spotify playlist</div>');
  html = html.replace(/<span class="nsp-sync( busy)?"([^>]*)>[\s\S]*?<\/span><div style="flex:1"><\/div>/, function(m, busy, attrs){
    return `<span class="nsp-ref${busy||''}"${attrs.replace(/title="[^"]*"/, 'title="Refresh from Spotify — adds new tracks" aria-label="Refresh from Spotify"')}>${SP_REFRESH_ICO}<span class="l">${busy ? 'Refreshing…' : 'Refresh'}</span></span><div style="flex:1"></div>`;
  });
  return html;
};

render();
