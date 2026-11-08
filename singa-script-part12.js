/* ============================================================
   ROUND 11 (Nov 2026)
   · "Let's make some noise" stays centred when it wraps.
   · Playlist artwork is a record or a cassette; a gig with no date
     gets a location pin, so the two never look alike.
   · Gig dates are picked from a calendar (and an optional time), can be
     changed later from the gig page, and typed dates like 10/5/26 work.
   · No "No date" in the gig lists.
   · Edit song has Manual / From audio track / From text doc too.
   · Chords step: both left panels are the same size, and recording
     works with the keys (tap a chord's notes together) and the chords.
   ============================================================ */

/* ---- styles for this part ---- */
(function(){
  const css = `
.nart .nrec,.nart .ncas,.nart .ncas-b{position:absolute;display:block}
.nart .nrec{border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.08)}
.nart .ncas{border-radius:12%}
.nart .ncas-b{border-radius:999px}
.nstub .npin{position:absolute;left:50%;top:46%;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:translate(-50%,-50%) rotate(-45deg);opacity:1}
.nstub .npin-s{position:absolute;left:50%;top:calc(46% + 19px);width:16px;height:5px;border-radius:50%;transform:translateX(-50%);opacity:.35}
.nstub.big .npin{width:40px;height:40px}
.nstub.big .npin-s{width:24px;height:7px;top:calc(46% + 29px)}
.nmodal-date{display:flex;gap:10px;flex-wrap:wrap}
.nmodal-date label{flex:1 1 140px;display:flex;flex-direction:column;gap:6px;min-width:0}
.nmodal-date label span{font-size:12px;color:var(--n-mute2)}
.nmodal-date input{height:48px;border-radius:14px;padding:0 12px;font-size:16px;font-weight:600;width:100%;box-sizing:border-box;background:var(--n-glass);border:1px solid var(--n-line2);color:#fff;color-scheme:dark}
.nmodal-date input::-webkit-calendar-picker-indicator{filter:invert(1);opacity:.8;cursor:pointer}
.ndate-prev{font-size:13px;color:var(--n-pink);min-height:18px}
.nmodal-x{align-self:center;font-size:14px;color:var(--n-mute)}
.ndate-chip{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px 0 9px;border-radius:999px;border:1px solid var(--n-line2);background:rgba(255,255,255,.06);color:#fff;font-size:14px;font-weight:600;cursor:pointer;vertical-align:middle}
.ndate-chip.none{color:var(--n-pink);border-style:dashed}
.ngig-sub{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14px;color:var(--n-mute);margin-top:8px}
.n-noise{text-align:center;line-height:1.08;text-wrap:balance;max-width:min(560px,92vw)}
@media (min-width:701px){
  .ce-wrap,.ce-wrap.kb-v{grid-template-columns:150px minmax(0,1fr)}
  .ce-wrap > .ce-picker{width:auto;box-sizing:border-box}
}
@media (max-width:700px){
  .ce-wrap.kb-v{grid-template-columns:116px minmax(0,1fr);gap:12px}
  .ce-wrap:not(.kb-side) > .ce-picker{width:116px;box-sizing:border-box}
  .ce-wrap:not(.kb-v):not(.kb-side){grid-template-columns:116px minmax(0,1fr);gap:12px}
}
.ce-wrap > .ce-picker{align-self:stretch;min-height:0}
.ce-picker .nrec-foot{flex:none;display:flex;align-items:center;gap:4px;margin-top:auto;padding-top:8px}
.ce-picker:not(.kbv){display:flex;flex-direction:column}
.ce-picker:not(.kbv) .ce-variants{flex:1 1 auto;min-height:0}
.ce-picker .nrec-foot .kb-rec{flex:1;min-width:0;justify-content:center;height:38px;padding:0 6px;gap:6px;font-size:13px}
.ce-picker .nrec-foot .kb-speed{flex:none;width:50px;height:38px;padding:0 0 0 4px;box-sizing:border-box;border-radius:19px}
.ce-picker .nrec-foot .kb-speed select{height:36px;font-size:12px;width:100%;padding:0 2px}
@media (max-width:700px){ .ce-picker .nrec-foot{flex-direction:column;align-items:stretch} .ce-picker .nrec-foot .kb-speed{width:100%} }
@media (max-height:520px){ .ce-picker .nrec-foot{display:none} }
@media (max-height:900px){ body.n-chords .cs-title{display:none !important} }
/* a short tablet: the chords sit two to a row, so the whole list fits and
   every chord drags any way from the first touch */
@media (max-height:900px) and (min-width:701px){
  .ce-picker:not(.kbv) .ce-variants{display:grid;grid-template-columns:1fr 1fr;align-content:start;gap:5px;padding-bottom:0}
  .ce-picker:not(.kbv) .ctile{width:100%;min-width:0;box-sizing:border-box;justify-content:center;text-align:center;padding:0 2px;font-size:14px;height:34px}
  .ce-picker .kb-switch{margin-bottom:0}
}
`;
  const st = document.createElement('style'); st.id = 'nightCss12'; st.textContent = css;
  document.head.appendChild(st);
})();

/* ---- sign in: the line stays centred over two lines ---- */
const _n12Nightify = nightify;
nightify = function(html){
  html = _n12Nightify(html);
  if(typeof html==='string' && html.indexOf('>Let’s make some noise<')>=0)
    html = html.replace(/<div style="([^"]*)">Let’s make some noise</, '<div class="n-noise" style="$1">Let’s make some noise<');
  return html;
};

/* ---- artwork ---- */
const _n12Art = nArt;
// Playlists: a record (some slipping out of the frame) or a cassette, in
// the playlist's own colours, so a playlist always reads as music.
nArt = function(seed, size, radius, cls){
  if(String(seed).indexOf('pl:')!==0) return _n12Art(seed, size, radius, cls);
  const h = nHash(seed), p = N_ART[h % N_ART.length], v = (h>>>4) % 3;
  const r = radius!=null ? radius : Math.round(size*0.28);
  let inner;
  if(v<2){
    const pos = v===0 ? 'left:24%;top:24%' : 'left:-26%;top:-26%';
    const bg = `radial-gradient(circle closest-side, ${p[0]} 0 7%, ${p[2]} 8% 33%, rgba(0,0,0,.18) 34% 36%, transparent 37%),`
      + `conic-gradient(from 20deg, transparent 0 8%, rgba(255,255,255,.22) 11%, transparent 15% 58%, rgba(255,255,255,.14) 61%, transparent 65%),`
      + `repeating-radial-gradient(circle closest-side, rgba(255,255,255,.13) 0 1.4%, transparent 1.6% 7%),`
      + p[1];
    inner = `<i class="nrec" style="${pos};width:102%;height:102%;background:${bg}"></i>`;
  } else {
    inner = `<i class="ncas" style="left:9%;top:22%;width:82%;height:56%;background:${p[1]}"></i>`
      + `<i class="ncas" style="left:16%;top:29%;width:68%;height:28%;background:${p[2]};border-radius:8%"></i>`
      + `<i class="ncas-b" style="left:27%;top:36%;width:46%;height:14%;background:${p[1]}"></i>`
      + `<i class="ncas-b" style="left:30%;top:37.5%;width:11%;height:11%;background:radial-gradient(circle, ${p[1]} 0 32%, ${p[0]} 36%)"></i>`
      + `<i class="ncas-b" style="left:59%;top:37.5%;width:11%;height:11%;background:radial-gradient(circle, ${p[1]} 0 32%, ${p[0]} 36%)"></i>`
      + `<i class="ncas" style="left:30%;top:64%;width:40%;height:8%;background:${p[0]};opacity:.55;border-radius:2px"></i>`;
  }
  return `<span class="nart${cls?' '+cls:''}" aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:${r}px;background:${p[0]}">${inner}</span>`;
};
// Gigs with no date: a location pin on the stub
const _n12Stub = nStub;
nStub = function(g, big){
  if(nGigWhen(g)) return _n12Stub(g, big);
  const p = nArtColors('gig:'+(g.id||g.title));
  return `<span class="nstub art${big?' big':''}" style="background:${p[0]}"><i style="background:${p[2]}"></i><span class="npin-s" style="background:${p[1]}"></span><span class="npin" style="background:radial-gradient(circle, ${p[0]} 0 24%, ${p[1]} 27%)"></span><span class="sr">No date</span></span>`;
};

/* ---- gig dates ---- */
const N_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const N_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function nNoDate(t){ t = String(t||'').trim(); return !t || /^date to be confirmed$/i.test(t) || /^no date$/i.test(t); }
// typed dates like 10/5/26 or 10.05.2026 (day first, as in the UK and Europe)
const _n12When = nGigWhen;
nGigWhen = function(g){
  const w = _n12When(g); if(w) return w;
  const t = String((g && g.date) || '');
  const m = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})\b/.exec(t);
  if(!m) return null;
  let d = +m[1], mo = +m[2], y = +m[3];
  if(mo>12 && d<=12){ const x = d; d = mo; mo = x; }
  if(y<100) y += 2000;
  if(mo<1 || mo>12 || d<1 || d>31) return null;
  return _n12When({ date: t.replace(m[0], d+' '+N_MONTHS[mo-1]+' '+y) });
};
function nTime12(tm){ const m = /^(\d{1,2}):(\d{2})/.exec(tm||''); if(!m) return ''; let h = +m[1]; const ap = h>=12 ? 'PM' : 'AM'; h = h%12 || 12; return h+':'+m[2]+' '+ap; }
function nFmtDate(d, tm){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d||''); if(!m) return '';
  const Y = +m[1], M = +m[2], D = +m[3], dt = new Date(Y, M-1, D);
  return N_DAYS[dt.getDay()]+' '+D+' '+N_MONTHS[M-1]+' '+Y + (tm ? ', '+nTime12(tm) : '');
}
// the date and time a gig already has, for the calendar
function nDateFields(g){
  const w = g && nGigWhen(g); if(!w) return { d:'', tm:'' };
  const dt = new Date(w.t), pad = n=>String(n).padStart(2,'0');
  return { d: dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate()), tm: w.time ? pad(dt.getHours())+':'+pad(dt.getMinutes()) : '' };
}
function nDateFieldsHTML(ni){
  const prev = nFmtDate(ni.d, ni.tm);
  return `<div class="nmodal-date">
      <label><span>Date</span><input type="date" value="${esc(ni.d||'')}" data-bind="newDay"></label>
      <label><span>Time (optional)</span><input type="time" value="${esc(ni.tm||'')}" data-bind="newTime"></label>
    </div>
    <div class="ndate-prev" id="ndatePrev">${esc(prev)}</div>`;
}
Binds.newDay = function(v){ if(!ST.newItem) return; ST.newItem.d = v; const el = document.getElementById('ndatePrev'); if(el) el.textContent = nFmtDate(ST.newItem.d, ST.newItem.tm); };
Binds.newTime = function(v){ if(!ST.newItem) return; ST.newItem.tm = v; const el = document.getElementById('ndatePrev'); if(el) el.textContent = nFmtDate(ST.newItem.d, ST.newItem.tm); };
const _n12NewModal = renderNewModal;
renderNewModal = function(){
  const ni = ST.newItem;
  if(!ni || (ni.kind!=='gig' && ni.kind!=='gigdate')) return _n12NewModal();
  if(ni.kind==='gig'){
    return _n12NewModal().replace(/<label style="[^"]*"><span style="[^"]*">Date<\/span><input [^>]*data-bind="newDate"[^>]*><\/label>/, nDateFieldsHTML(ni));
  }
  const g = D.gigs.find(x=>x.id===ni.id) || {};
  return `<div class="modal-backdrop" data-act="closeNew"><div class="modal" style="max-width:420px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">When is the gig?</span><span class="icon-btn" data-act="closeNew">${icon('close',22)}</span></div>
    <div style="font-size:14px;color:#8a8a8a;margin-top:-6px">${esc(g.title||'')}</div>
    ${nDateFieldsHTML(ni)}
    <button class="btn btn-dark" style="margin-top:6px" data-act="createNew">Save</button>
    ${nNoDate(g.date) ? '' : `<a class="link nmodal-x" data-act="x" data-xact="gigDateClear">Remove the date</a>`}
  </div></div>`;
};
const _n12CreateNew = Actions.createNew;
Actions.createNew = function(){
  const ni = ST.newItem;
  if(ni && ni.kind==='gigdate'){
    const g = D.gigs.find(x=>x.id===ni.id); ST.newItem = null;
    if(g){ g.date = nFmtDate(ni.d, ni.tm); saveGigRow(g); toast(g.date ? 'Gig date set' : 'Date removed'); }
    render(); return;
  }
  if(ni && ni.kind==='gig'){
    if(!ni.name.trim()) return;
    ni.date = nFmtDate(ni.d, ni.tm);
    const before = new Set(D.gigs.map(g=>g.id));
    const r = _n12CreateNew.apply(this, arguments);
    const g = D.gigs.find(x=>!before.has(x.id));
    if(g && nNoDate(g.date) && g.date){ g.date = ''; saveGigRow(g); render(); }
    return r;
  }
  return _n12CreateNew.apply(this, arguments);
};
XActions.gigDateOpen = function(){
  const g = gigObj(); if(!g) return;
  ST.newItem = { kind:'gigdate', id:g.id, name:g.title, ...nDateFields(g) };
  render();
};
XActions.gigDateClear = function(){
  const ni = ST.newItem; if(!ni) return;
  const g = D.gigs.find(x=>x.id===ni.id); ST.newItem = null;
  if(g){ g.date = ''; saveGigRow(g); toast('Date removed'); }
  render();
};
// the gig page: the date is a button that opens the calendar
const _n12RenderGig = renderGig;
renderGig = function(){
  const html = _n12RenderGig(), g = gigObj(); if(!g) return html;
  const n = (g.setlist||[]).length, songs = n+' song'+(n===1?'':'s');
  const none = nNoDate(g.date), mine = g.mine!==false;
  const dateBit = mine
    ? `<button class="ndate-chip${none?' none':''}" data-xact="gigDateOpen" aria-label="${none?'Add a date':'Change the date'}">${icon(none?'calendar_add_on':'calendar_month',18)}<span>${none ? 'Add a date' : esc(g.date)}</span></button>`
    : (none ? '' : `<span>${esc(g.date)}</span><span>·</span>`);
  return html.replace(/<div style="font-size:14px;color:#6f6f6f;margin-top:6px">[^<]*<\/div>/, `<div class="ngig-sub">${dateBit}<span>${songs}</span></div>`);
};
// the gig lists: no "No date" (a date that isn't a calendar date, like "Every Thursday", still shows)
nGigSub = function(g){
  const n = (g.setlist||[]).length;
  const txt = !nGigWhen(g) && !nNoDate(g.date) ? g.date+' · ' : '';
  return txt + n+' song'+(n===1?'':'s') + (g.mine===false && g.by ? ' · by '+g.by : '');
};

/* ---- Edit song: Manual / From audio track / From text doc ---- */
function nModeSegHTML(){
  const modes = [['manual','Manual'],['recording','From audio track'],['file','From text doc']];
  return `<div id="modeSegWrap" style="flex:none;display:flex;justify-content:center;overflow:hidden;max-height:60px;opacity:1"><div class="seg">${modes.map(([v,l])=>`<button class="${v===(ST.createMode||'manual')?'on':''}" data-act="setCreateMode" data-id="${v}">${l}</button>`).join('')}</div></div>`;
}
function nCapturing(){ return ST.screen==='create' && ST.createMode && ST.createMode!=='manual'; }
const _n12RenderCreate = renderCreate;
renderCreate = function(){
  if(!ST.editing) return _n12RenderCreate();
  const d = D.songs[ST.editId] || { id:'x', title:'', sub:'', lyrics:'', chords:{}, notes:{} };
  if(!ST.createMode || ST.createMode==='manual'){
    return _n12RenderCreate().replace('<div class="scr center" style="padding-top:16px">', '<div class="scr center" style="padding-top:16px">\n    '+nModeSegHTML());
  }
  if(ST.phase!=='idle'){
    // counting in / recording / reading: the same screens as a new song
    ST.editing = false;
    try{ return _n12RenderCreate(); } finally { ST.editing = true; }
  }
  return `<div class="scr center" style="padding-top:16px">
    ${nModeSegHTML()}
    <div style="width:100%;display:flex;align-items:center;gap:8px;margin-top:20px;min-height:44px;max-width:760px">
      <span class="icon-btn" title="Save and close" data-act="editDone">${icon('chevron_left',26)}</span>
      <div style="flex:1;display:flex;justify-content:center">${nCapTabs()}</div>
      <button class="btn btn-dark btn-sm" data-act="editDone">Done</button>
    </div>
    ${nCaptureBody(d)}
  </div>`;
};
const _n12GoStep = Actions.goCreateStep;
Actions.goCreateStep = function(d){
  if(ST.editing && nCapturing()){ if(ST.phase!=='idle') return; ST.step = d.id; ST.selWord = null; ST.editorLine = 0; render(); return; }
  return _n12GoStep.apply(this, arguments);
};
const _n12StartUpload = Actions.startUpload;
Actions.startUpload = function(){
  if(!(ST.editing && nCapturing())) return _n12StartUpload.apply(this, arguments);
  ST.editing = false;
  try{ return _n12StartUpload.apply(this, arguments); } finally { ST.editing = true; }
};
document.addEventListener('change', function(e){
  if(!e.target || e.target.id!=='fileInput' || !ST.editing || !nCapturing()) return;
  const files = Array.from(e.target.files||[]);
  e.stopImmediatePropagation();
  e.target.value = '';
  if(files.length) nUploadToDraft(files);
}, true);
const _n12ProcessBlob = processRecordingBlob;
processRecordingBlob = async function(songObj, blob){
  if(ST.editing && nCapturing()){ nQueueToDraft([], blob); return; }
  return _n12ProcessBlob(songObj, blob);
};
// back to editing by hand: Done saves as before
const _n12SetMode = Actions.setCreateMode;
Actions.setCreateMode = function(d){
  if(ST.editing && ST.phase!=='idle') return;
  return _n12SetMode.apply(this, arguments);
};

/* ---- chords step: recording with the keys or the chords ---- */
// The Record button and its speed sit at the foot of the Chords panel too,
// so a take can be played by tapping chords. Switching between Chords and
// Keys no longer stops a take.
function nRecFootHTML(){
  const sp = ST.kbSpeed || 1;
  return `<div class="nrec-foot">
    <button class="kb-rec" id="kbRec" data-xact="kbRec"><i class="kb-dot"></i><span id="kbRecTxt">Record</span></button>
    <label class="kb-speed" title="Recording speed"><select data-xchange="kbSpeed" aria-label="Recording speed">${KB_SPEEDS.map(v=>`<option value="${v}"${v===sp?' selected':''}>x${v}</option>`).join('')}</select></label>
  </div>`;
}
const _n12Picker = renderChordPicker;
renderChordPicker = function(){
  const html = _n12Picker();
  if(ST.kbOpen && !kbSide()) return html;
  return html.replace(/<\/div>\s*$/, nRecFootHTML()+'</div>');
};
XActions.kbUse = function(d){
  const on = d.id==='1'; if(!!ST.kbOpen===on) return;
  if(KB.rec){ ST.kbOpen = on; KB.latched.clear(); render(); return; }
  XActions.kbToggle();
};
// While a take is running, the notes you tap together make a chord, and it
// lands on the word the marker was on when you started it.
let _n12Grp = null;
document.addEventListener('pointerdown', function(e){
  const k = e.target.closest && e.target.closest('.kb-key'); if(!k || !nInChords()) return;
  if(!KB.rec || KB.rec.phase!=='run') return;
  const n = +k.dataset.note, now = performance.now();
  if(!_n12Grp || now - _n12Grp.last > 700) _n12Grp = { at: now, notes: new Set(), t: 0 };
  _n12Grp.notes.add(n); _n12Grp.last = now;
  if(!KB.latched.has(n)){ KB.latched.add(n); }
  KB.latched = new Set(_n12Grp.notes);
  clearTimeout(_n12Grp.t);
  const g = _n12Grp;
  g.t = setTimeout(()=>{
    if(_n12Grp!==g) return;
    _n12Grp = null;
    const name = kbDetect(g.notes);
    KB.latched.clear();
    if(name){ KB.last = name; kbPlace(name, g.at); }
    kbPaint();
  }, 450);
  kbPaint();
}, true);
// the hint while a take runs, in either panel
const _n12PaintRec = kbPaintRec;
kbPaintRec = function(){
  _n12PaintRec();
  const r = KB.rec, h = document.getElementById('kbHint');
  if(r && h && r.phase==='run'){
    const t = ST.kbOpen ? 'Tap a chord’s notes together as its word comes' : 'Tap each chord as its word comes';
    if(h.textContent!==t) h.textContent = t;
  }
};

// the song title steps aside on the Chords step of a short screen, whichever panel is showing
const _n12Render = render;
render = function(){ _n12Render(); document.body.classList.toggle('n-chords', nInChords()); };

render();
