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

/* ============================================================
   ROUND 12
   · New / Edit song: the choices are Manual · Record · Upload. On the
     Markings step only Manual and Upload (a document) make sense, so
     Record is greyed out there, and going to Markings while on Record
     switches to Manual.
   · Playlists: a stack of records (not just one), and your own picture
     can replace it.
   · A take recorded onto typed lyrics puts chords on every line, not just
     the intro.
   ============================================================ */
(function(){
  const css = `
.seg button.nseg-off{opacity:.35;cursor:not-allowed}
.npl-art{position:relative;flex:none;border:0;padding:0;background:none;border-radius:16px;cursor:pointer;line-height:0}
.npl-art .nart{border-radius:16px}
.npl-art b{position:absolute;right:-6px;bottom:-6px;width:24px;height:24px;border-radius:50%;background:#fff;color:#2A1250;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(14,6,32,.4)}
.nart img{width:100%;height:100%;object-fit:cover;display:block}
.nplart-big{align-self:center;line-height:0;margin:4px 0 6px}
.nplart-acts{display:flex;flex-direction:column;gap:10px}
`;
  const st = document.createElement('style'); st.id = 'nightCss12b'; st.textContent = css;
  document.head.appendChild(st);
})();

/* ---- Manual · Record · Upload ---- */
function nNoRecordHere(){ return ST.step==='markings'; }
const _n12bRenderCreate = renderCreate;
renderCreate = function(){
  let html = _n12bRenderCreate();
  html = html.replace(/(data-act="setCreateMode" data-id="recording">)From audio track</g, '$1Record<')
             .replace(/(data-act="setCreateMode" data-id="file">)From text doc</g, '$1Upload<');
  if(nNoRecordHere()) html = html.replace(/<button class="([^"]*)" data-act="setCreateMode" data-id="recording">/, '<button class="$1 nseg-off" aria-disabled="true" title="Markings are added by hand or from a document" data-act="setCreateMode" data-id="recording">');
  return html;
};
const _n12bSetMode = Actions.setCreateMode;
Actions.setCreateMode = function(d){
  if(d && d.id==='recording' && nNoRecordHere()){ toast('Markings are added by hand, or from a document you upload'); return; }
  return _n12bSetMode.apply(this, arguments);
};
const _n12bGoStep = Actions.goCreateStep;
Actions.goCreateStep = function(d){
  // Markings can't come from a recording: going there from Record switches to Manual
  if(d && d.id==='markings' && ST.createMode==='recording' && ST.phase==='idle') ST.createMode = 'manual';
  return _n12bGoStep.apply(this, arguments);
};
const N_DOC_ACCEPT = '.txt,.md,.text,.pdf,.rtf,.docx,.odt,.pages,text/plain,text/markdown,application/pdf,application/rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const _n12bStartUpload = Actions.startUpload;
Actions.startUpload = function(){
  if(ST.screen==='create' && ST.createMode==='file' && nNoRecordHere()){
    if(!canSync()) return;
    const fi = document.getElementById('fileInput');
    fi.accept = isIOSDevice() ? '' : N_DOC_ACCEPT; fi.multiple = true; fi.click(); return;
  }
  return _n12bStartUpload.apply(this, arguments);
};
nUploadToDraft = function(files){
  const docs = [], audio = [];
  let oldDoc = false;
  files.forEach(f=>{
    if(/\.doc$/i.test(f.name||'')){ oldDoc = true; return; }
    if(isAudioFile(f)) audio.push(f); else docs.push(f);
  });
  if(!docs.length && !audio.length){ toast(oldDoc ? "Old Word (.doc) files can't be read — save it as .docx, PDF or .txt and upload that" : "Singa can't read that file"); return; }
  if(ST.step==='sync' && !audio.length){ toast("The tempo can't come from a text document. Upload a recording (audio or video), or use Record."); return; }
  if(ST.step==='markings' && !docs.length){ toast("Markings can't come from a recording. Upload a lyrics or chord sheet, or add them by hand on Manual."); return; }
  nQueueToDraft(docs, ST.step==='markings' ? null : (audio[0] || null));
};
const _n12bCapture = nCaptureBody;
nCaptureBody = function(d){
  const html = _n12bCapture(d);
  if(ST.createMode==='file' && nNoRecordHere())
    return html.replace(/<div class="ncap-s">[\s\S]*?<\/div>/, '<div class="ncap-s">A lyrics or chord sheet (.txt, PDF, Word, Pages, .rtf). Singa takes the lyrics and chords from it; markings are yours to add on Manual.</div>');
  return html;
};

/* ---- playlist artwork: a stack of records, or your own picture ---- */
function nDisc(p, x, y, sz, px, front){
  const ring = Math.max(1.5, px*sz/100*0.035).toFixed(1);
  const bg = (front ? '' : 'linear-gradient(rgba(26,14,56,.24),rgba(26,14,56,.24)),')
    + `radial-gradient(circle closest-side, ${p[0]} 0 7%, ${p[2]} 8% 33%, rgba(0,0,0,.18) 34% 36%, transparent 37%),`
    + (front ? 'conic-gradient(from 20deg, transparent 0 8%, rgba(255,255,255,.22) 11%, transparent 15% 58%, rgba(255,255,255,.14) 61%, transparent 65%),' : '')
    + 'repeating-radial-gradient(circle closest-side, rgba(255,255,255,.13) 0 1.4%, transparent 1.6% 7%),'
    + p[1];
  return `<i class="nrec" style="left:${x}%;top:${y}%;width:${sz}%;height:${sz}%;background:${bg};box-shadow:0 0 0 ${ring}px ${p[0]}"></i>`;
}
function nPlBySeed(seed){ return (D.playlists||[]).find(p=>'pl:'+(p.title||p.id)===seed); }
nArt = function(seed, size, radius, cls){
  if(String(seed).indexOf('pl:')!==0) return _n12Art(seed, size, radius, cls);
  const h = nHash(seed), p = N_ART[h % N_ART.length], v = (h>>>4) % 3;
  const r = radius!=null ? radius : Math.round(size*0.28);
  const pl = nPlBySeed(seed);
  if(pl && pl.art) return `<span class="nart${cls?' '+cls:''}" aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:${r}px;background:#2A1250"><img src="${esc(pl.art)}" alt="" loading="lazy"></span>`;
  let inner;
  if(v===0) inner = nDisc(p, 36, -8, 62, size) + nDisc(p, 15, 13, 62, size) + nDisc(p, -6, 34, 62, size, true);
  else if(v===1) inner = nDisc(p, 34, -14, 68, size) + nDisc(p, 22, 0, 68, size)
    + `<i class="ncas" style="left:-8%;top:34%;width:74%;height:74%;background:${p[2]};border-radius:6%;box-shadow:0 0 0 ${Math.max(1.5,size*0.025).toFixed(1)}px ${p[0]}"></i>`
    + `<i class="nrec" style="left:12%;top:54%;width:30%;height:30%;background:radial-gradient(circle closest-side, ${p[2]} 0 30%, ${p[1]} 33%)"></i>`;
  else inner = nDisc(p, -10, 22, 54, size) + nDisc(p, 18, 22, 54, size) + nDisc(p, 46, 22, 54, size, true);
  return `<span class="nart${cls?' '+cls:''}" aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:${r}px;background:${p[0]}">${inner}</span>`;
};
// your own picture: kept with the playlist (and on this device, in case
// the database doesn't have the art_url column yet)
function nArtKey(id){ return 'singa-plart:'+id; }
function nArtLocal(id){ try{ return localStorage.getItem(nArtKey(id)) || null; }catch(e){ return null; } }
const _n12bPlRow = playlistRowToLocal;
playlistRowToLocal = function(row){
  const p = _n12bPlRow(row);
  p.art = row.art_url || nArtLocal(p.id) || null;
  return p;
};
(D.playlists||[]).forEach(p=>{ if(!p.art){ const a = nArtLocal(p.id); if(a) p.art = a; } });
async function nSavePlArt(p){
  try{ localStorage.setItem(nArtKey(p.id), p.art || ''); if(!p.art) localStorage.removeItem(nArtKey(p.id)); }catch(e){}
  if(!ST.userId || p.auto) return;
  try{
    const r = await sb.from('playlists').update({ art_url: p.art || null }).eq('id', p.id);
    if(r && r.error){ console.error('Singa: playlist artwork save failed', r.error); if(/art_url/.test(r.error.message||'')) toast('Saved on this device. To show it on your other devices too, add the art_url column to playlists'); }
  }catch(e){ console.error('Singa: playlist artwork save failed', e); }
}
function nImgSquare(file, max){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = ()=>{
      const side = Math.min(img.naturalWidth, img.naturalHeight), out = Math.min(max, side);
      const c = document.createElement('canvas'); c.width = c.height = out;
      c.getContext('2d').drawImage(img, (img.naturalWidth-side)/2, (img.naturalHeight-side)/2, side, side, 0, 0, out, out);
      URL.revokeObjectURL(url);
      c.toBlob(b=>b ? resolve(b) : reject(new Error('Could not read the picture')), 'image/jpeg', 0.86);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('Could not read the picture')); };
    img.src = url;
  });
}
XActions.plArtOpen = function(d){ const p = D.playlists.find(x=>x.id===(d.id||ST.listPl)); if(!p) return; ST.newItem = { kind:'plart', id:p.id, name:p.title }; render(); };
XActions.plArtReset = function(){
  const ni = ST.newItem, p = ni && D.playlists.find(x=>x.id===ni.id); ST.newItem = null;
  if(p){ p.art = null; nSavePlArt(p); toast('Back to the Singa artwork'); }
  render();
};
XActions.plArtUpload = function(){
  const ni = ST.newItem, p = ni && D.playlists.find(x=>x.id===ni.id); if(!p) return;
  if(!canSync()) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async ()=>{
    const f = inp.files && inp.files[0]; if(!f) return;
    ST.newItem = null; render(); toast('Adding your picture…');
    try{
      const blob = await nImgSquare(f, 640);
      const path = ST.userId+'/playlist-'+p.id+'-'+Date.now()+'.jpg';
      const up = await sb.storage.from('avatars').upload(path, blob, { contentType:'image/jpeg', upsert:true });
      if(up.error) throw up.error;
      p.art = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      nSavePlArt(p); toast('Artwork updated'); render();
    }catch(e){ console.error('Singa: playlist artwork upload failed', e); toast("The picture couldn't be added — try again"); }
  };
  inp.click();
};
const _n12bNewModal = renderNewModal;
renderNewModal = function(){
  const ni = ST.newItem;
  if(!ni || ni.kind!=='plart') return _n12bNewModal();
  const p = D.playlists.find(x=>x.id===ni.id) || {};
  return `<div class="modal-backdrop" data-act="closeNew"><div class="modal" style="max-width:380px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">Playlist artwork</span><span class="icon-btn" data-act="closeNew">${icon('close',22)}</span></div>
    <div class="nplart-big">${nArt('pl:'+(p.title||p.id), 168, 32)}</div>
    <div class="nplart-acts">
      <button class="btn btn-dark" data-act="x" data-xact="plArtUpload">Upload a picture</button>
      ${p.art ? `<button class="btn btn-outline" data-act="x" data-xact="plArtReset">Use the Singa artwork</button>` : ''}
    </div>
  </div></div>`;
};
// the playlist page: its artwork next to the name; tap it to change it
const _n12bRenderList = renderList;
renderList = function(){
  const html = _n12bRenderList();
  const p = ST.listPl ? D.playlists.find(x=>x.id===ST.listPl) : null;
  if(!p) return html;
  const can = p.mine!==false && !p.auto;
  const art = can
    ? `<button class="npl-art" data-xact="plArtOpen" data-id="${esc(p.id)}" aria-label="Change the artwork">${nArt('pl:'+(p.title||p.id), 56, 16)}<b>${icon('edit',14)}</b></button>`
    : `<span class="npl-art">${nArt('pl:'+(p.title||p.id), 56, 16)}</span>`;
  return html.replace('<span style="font-size:28px;font-weight:700;display:flex;align-items:center;gap:8px">', art+'<span style="font-size:28px;font-weight:700;display:flex;align-items:center;gap:8px">');
};

/* ---- a take on typed lyrics: chords on every line ----
   The chords used to be matched to the words by time alone, so when the
   timing of your typed words came out late, every chord landed before the
   first word and showed only as the intro. Now the chords the take put on
   its own words are carried over to yours, word by word; timing is the
   fallback. Whichever puts chords on more lines wins. */
function nLinesWithChords(lyrics, chords){
  const W = nWords(lyrics), seen = new Set();
  W.forEach(w=>{ if(chords && chords[w.id]) seen.add(w.li); });
  return seen.size;
}
function nTimelineChords(lyrics, ts, timeline){
  const W = nWords(lyrics), out = {};
  if(!W.length || !ts || ts.length!==W.length) return out;
  const segs = (timeline||[]).map(x=>({ start:+x.start, end:+x.end, name: x.concert || x.shown })).filter(x=>x.name && x.name!=='N' && isFinite(x.start));
  // where each word ends: the next word's start (or a second later)
  const te = ts.map((t,i)=> i+1<ts.length ? Math.max(t, ts[i+1]) : t+1);
  let prev = null;
  segs.forEach(seg=>{
    if(seg.name===prev) return;
    let best = -1, bd = Infinity;
    ts.forEach((t,i)=>{ const d = t - seg.start; if(d > -0.25 && d < 1.05 && Math.abs(d) < bd){ bd = Math.abs(d); best = i; } });
    if(best<0) best = ts.findIndex((t,i)=>t <= seg.start && te[i] > seg.start && te[i]-t < 3);
    if(best<0) return;                                  // between lines: the band plays on
    let id = W[best].id;
    if(out[id] && best+1<W.length && W[best+1].li===W[best].li && !out[W[best+1].id]) id = W[best+1].id;
    out[id] = seg.name; prev = seg.name;
  });
  // a line that starts mid-chord shows that chord on its first word
  const firstOf = {}; W.forEach((w,i)=>{ if(firstOf[w.li]==null) firstOf[w.li] = i; });
  Object.keys(firstOf).forEach(li=>{
    const i = firstOf[li], w = W[i];
    if(out[w.id] || (W[i+1] && W[i+1].li===w.li && out[W[i+1].id])) return;
    const a = segs.find(x=>x.start <= ts[i] && x.end > ts[i]);
    if(a) out[w.id] = a.name;
  });
  return out;
}
const _n12bMergeTake = nMergeTake;
nMergeTake = function(s, res, blob){
  const nC = o=>Object.keys(o||{}).filter(k=>/^\d+-/.test(k)).length;
  const had = nC(s.chords) > 0;
  const said = _n12bMergeTake(s, res, blob);
  if(had) return said;
  try{
    const tmp = { id:'tmp', title:'', sub:'', lyrics:'', chords:{}, notes:{} };
    audioSheetToSong(tmp, res.sheet);
    const capoHere = /^\s*\[capo\s*\d+\]/im.test(s.lyrics||''), capo = +(res.sheet.capo||0);
    let carried = s.lyrics===tmp.lyrics ? { ...tmp.chords } : nTransfer(tmp.lyrics, tmp.chords, s.lyrics);
    // the take's chords are capo shapes; typed lyrics have no capo line, so use the real chords
    if(capo>0 && !capoHere){ const flats = /b/.test(((res.sheet.chordTimeline||[]).find(x=>x.concert)||{}).concert||''); Object.keys(carried).forEach(k=>{ carried[k] = transposeChord(carried[k], capo, flats); }); }
    const timed = nTimelineChords(s.lyrics, s.wordTimestamps, res.sheet.chordTimeline);
    const cands = [s.chords||{}, carried, timed];
    let best = cands[0], bn = nLinesWithChords(s.lyrics, best);
    cands.slice(1).forEach(c=>{ const n = nLinesWithChords(s.lyrics, c); if(n > bn){ best = c; bn = n; } });
    s.chords = best;
  }catch(e){ console.error('Singa: placing the take’s chords failed', e); }
  return said;
};

/* ============================================================
   ROUND 13
   · Playlist pictures always save: if the picture can't go to storage,
     a small copy is kept with the playlist itself.
   · Editing a song: the "Got it!" screen says it's being adjusted, and
     the note when it's done says it was updated.
   · A file picked to upload is read straight away, so it can't come
     through empty later (an iPad lets go of picked files).
   · Playlists are back to the single record.
   ============================================================ */

/* ---- playlist artwork: the single record ---- */
nArt = function(seed, size, radius, cls){
  if(String(seed).indexOf('pl:')!==0) return _n12Art(seed, size, radius, cls);
  const h = nHash(seed), p = N_ART[h % N_ART.length], v = (h>>>4) % 2;
  const r = radius!=null ? radius : Math.round(size*0.28);
  const pl = nPlBySeed(seed);
  if(pl && pl.art) return `<span class="nart${cls?' '+cls:''}" aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:${r}px;background:#2A1250"><img src="${esc(pl.art)}" alt="" loading="lazy"></span>`;
  const pos = v===0 ? 'left:24%;top:24%' : 'left:-26%;top:-26%';
  const bg = `radial-gradient(circle closest-side, ${p[0]} 0 7%, ${p[2]} 8% 33%, rgba(0,0,0,.18) 34% 36%, transparent 37%),`
    + `conic-gradient(from 20deg, transparent 0 8%, rgba(255,255,255,.22) 11%, transparent 15% 58%, rgba(255,255,255,.14) 61%, transparent 65%),`
    + `repeating-radial-gradient(circle closest-side, rgba(255,255,255,.13) 0 1.4%, transparent 1.6% 7%),`
    + p[1];
  return `<span class="nart${cls?' '+cls:''}" aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:${r}px;background:${p[0]}"><i class="nrec" style="${pos};width:102%;height:102%;background:${bg}"></i></span>`;
};

/* ---- playlist pictures that always save ---- */
function nBlobToDataUrl(blob){
  return new Promise((resolve, reject)=>{ const fr = new FileReader(); fr.onload = ()=>resolve(fr.result); fr.onerror = ()=>reject(fr.error || new Error('Could not read the picture')); fr.readAsDataURL(blob); });
}
XActions.plArtUpload = function(){
  const ni = ST.newItem, p = ni && D.playlists.find(x=>x.id===ni.id); if(!p) return;
  if(!canSync()) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async ()=>{
    const f = inp.files && inp.files[0]; if(!f) return;
    ST.newItem = null; render(); toast('Adding your picture…');
    let blob;
    try{ blob = await nImgSquare(f, 640); }
    catch(e){ console.error('Singa: playlist picture could not be read', e); toast("That picture couldn't be read — try a JPEG or PNG"); return; }
    let url = null;
    // storage first (the avatars bucket, in your own folder)
    if(ST.userId){
      try{
        const path = ST.userId+'/playlist-'+p.id+'-'+Date.now()+'.jpg';
        const up = await sb.storage.from('avatars').upload(path, blob, { contentType:'image/jpeg', upsert:true });
        if(up.error) throw up.error;
        url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }catch(e){ console.warn('Singa: playlist picture not stored, keeping a small copy instead', e); }
    }
    // otherwise a small copy goes with the playlist itself
    if(!url){
      try{ url = await nBlobToDataUrl(await nImgSquare(f, 320)); }
      catch(e){ console.error('Singa: playlist picture failed', e); toast("The picture couldn't be added — try again"); return; }
    }
    p.art = url; nSavePlArt(p); toast('Artwork updated'); render();
  };
  inp.click();
};

/* ---- editing a song: "being adjusted", then "updated" ---- */
const _n13Edits = new Set();
const _n13Queue = nQueueToDraft;
nQueueToDraft = function(docs, audio){
  const edit = !!ST.editing, id = ST.editId;
  if(edit && id) _n13Edits.add(id);
  ST._queuedEdit = edit;
  return _n13Queue(docs, audio);
};
const _n13Queued = renderQueued;
renderQueued = function(){
  let h = _n13Queued();
  if(ST._queuedEdit) h = h.replace('<br>is being added', '<br>is being adjusted').replace('in your songs marked', 'in your songs, marked').replace('Add Another Song', 'Add a New Song');
  return h;
};
const _n13Finished = jobFinished;
jobFinished = function(j, songObj){
  const r = _n13Finished.apply(this, arguments);
  if(songObj && _n13Edits.has(songObj.id)){ _n13Edits.delete(songObj.id); toast('“'+(songObj.title||'Your song')+'” has been updated'); }
  return r;
};
const _n13Render = render;
render = function(){ if(ST.screen!=='queued') ST._queuedEdit = false; _n13Render(); };

/* ---- uploads: read the picked files straight away ---- */
window.addEventListener('change', function(e){
  const t = e.target;
  if(!t || t.id!=='fileInput' || e._nCopied) return;
  const files = Array.from(t.files||[]);
  if(!files.length) return;
  e.stopImmediatePropagation();
  Promise.all(files.map(f=>f.arrayBuffer().then(b=>{
    if(!b.byteLength) throw new Error('empty');
    try{ return new File([b], f.name, { type: f.type, lastModified: f.lastModified }); }
    catch(_e){ const x = new Blob([b], { type: f.type }); x.name = f.name; return x; }
  }))).then(copies=>{
    let ok = false;
    try{ const dt = new DataTransfer(); copies.forEach(c=>dt.items.add(c)); t.files = dt.files; ok = t.files.length===copies.length; }catch(_e){}
    if(!ok){ t.value = ''; nDeliverFiles(copies); return; }
    const ev = new Event('change', { bubbles:true }); ev._nCopied = true; t.dispatchEvent(ev);
  }).catch(err=>{
    console.error('Singa: picked file could not be read', err);
    t.value = '';
    toast(err && err.message==='empty' ? "That file came through empty. If it's in iCloud, download it to this device first, then try again." : "That file couldn't be read — try again");
  });
}, true);
// (only if this browser can't hand the copies back to the file box)
function nDeliverFiles(files){
  if(ST.screen==='create' && (ST.createMode!=='manual' || ST.editing) && nCapturing()){ nUploadToDraft(files); return; }
  if(files.length > 1 || (ST.screen==='create' && ST.createMode!=='manual' && !ST.editing)){ queueImports(files); return; }
  const f = files[0];
  if(isSheetFile(f) && !isAudioFile(f)){ queueImports([f]); return; }
  if(!isAudioFile(f)){ toast("That isn't an audio file Singa can read — try an mp3, m4a, wav or a video"); return; }
  processRecordingBlob(D.songs[ST.editId], f);
}

render();
