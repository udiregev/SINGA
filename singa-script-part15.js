/* Singa · round 22 on (loaded by singa-script-part14.js) */

/* ============================================================
   ROUND 22
   · Songs › Select: tick several songs, then add them to a playlist or
     a gig, heart or mark them, remove them from a playlist, or delete
     them, all at once.
   · Sign in › Forgot your password?: Singa emails a link; opening it
     brings you back to Singa to choose a new password. Account ›
     Change password does the same while signed in.
   ============================================================ */
(function(){
  const css = `
.nsel-go{height:36px;padding:0 16px;border-radius:18px;border:1px solid rgba(255,255,255,.28);background:transparent;color:#fff;font-size:14px;font-weight:600;cursor:pointer;flex:none;margin-right:10px}
.nsel-go.on{background:#fff;color:#2A1250;border-color:#fff}
body.n-selecting .srow .s-acts, body.n-selecting .srow > .msi:last-child, body.n-selecting .list-row.addrow{display:none !important}
.nsel-row{cursor:pointer;position:relative;padding-left:42px !important}
.nsel-box{width:24px;height:24px;flex:none;border-radius:7px;border:2px solid rgba(255,255,255,.55);display:inline-flex;align-items:center;justify-content:center;position:absolute;left:4px;top:50%;transform:translateY(-50%);color:#2A1250;transition:background-color .15s ease,border-color .15s ease}
.nsel-row.on .nsel-box{background:var(--n-pink);border-color:var(--n-pink)}
.nsel-row.on{background:rgba(243,184,255,.08)}
body.n-selecting #nNav{display:none !important}
body.n-selecting .scr{padding-bottom:calc(170px + env(safe-area-inset-bottom,0px)) !important}
#nSelBar{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:95;width:min(calc(100vw - 24px),560px);border-radius:26px;background:rgba(42,18,80,.92);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.16);box-shadow:0 12px 40px rgba(14,6,32,.5);padding:12px 12px 10px;color:#fff}
#nSelBar[hidden]{display:none}
.nsb-top{display:flex;align-items:center;gap:12px;padding:0 6px 8px}
.nsb-n{font-size:15px;font-weight:700;flex:1}
.nsb-all{font-size:14px;color:var(--n-pink);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.nsb-x{width:34px;height:34px;border-radius:17px;border:0;background:rgba(255,255,255,.1);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.nsb-acts{display:flex;justify-content:space-around;gap:4px}
.nsb-b{flex:1;min-width:0;border:0;background:transparent;color:#fff;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;border-radius:14px;cursor:pointer;font-size:11px;font-weight:600}
.nsb-b span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.nsb-b:active{background:rgba(255,255,255,.1)}
.nsb-b.danger{color:var(--n-danger)}
.nsb-b[disabled]{opacity:.38;pointer-events:none}
@media (hover:hover) and (pointer:fine){ .nsb-b:hover{background:rgba(255,255,255,.08)} }
.nbp-row{display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid var(--n-line);cursor:pointer}
.nbp-row .nart{flex:none}
.nbp-row .t{font-size:15px;font-weight:600}
.nbp-row .s{font-size:12px;color:var(--n-mute);margin-top:2px}
.nbp-list{max-height:min(46vh,360px);overflow:auto;margin:2px 0 4px}
.nbp-new{display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer;font-weight:600}
.n-forgot{align-self:flex-end;font-size:13px;margin-top:-4px;cursor:pointer;color:var(--n-mute) !important;text-decoration:underline;text-underline-offset:3px}
.n-pw-h{font-size:20px;font-weight:700;text-align:center;margin-bottom:2px}
.n-pw-s{font-size:14px;color:var(--n-mute);text-align:center;line-height:1.5}
.n-pw-back{align-self:center;font-size:14px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;margin-top:4px}
.n-pw-err{color:var(--n-danger);font-size:13px;line-height:1.4}
.n-pw-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--n-mute);cursor:pointer;padding:6px;display:flex}
`;
  const st = document.createElement('style'); st.id = 'nightCss22'; st.textContent = css;
  document.head.appendChild(st);
})();

/* ---- selecting songs ---- */
// ST.sel = { ids:[...], pl: the playlist shown when selecting started }
function nSelOn(){ return !!(ST.sel && ST.screen==='list' && ST.listKind==='songs' && (ST.sel.pl||null)===(ST.listPl||null)); }
function nSelPl(){ const p = ST.listPl ? (D.playlists||[]).find(x=>x.id===ST.listPl) : null; return p && !p.auto ? p : null; }
function nSelVisible(){
  // the songs the list shows right now (search applied), in order
  const p = ST.listPl ? (D.playlists||[]).find(x=>x.id===ST.listPl) : null;
  let ids = p ? (p.auto ? D.order : p.ids) : D.order;
  const q = (ST.listQuery||'').trim().toLowerCase();
  if(q) ids = ids.filter(id=>{ const s = song(id); return ((s.title||'')+' '+(s.sub||'')).toLowerCase().includes(q); });
  return ids.filter(id=>D.songs[id]);
}
XActions.selStart = function(){ if(!ST.userId) return; ST.sel = { ids:[], pl: ST.listPl||null }; render(); };
XActions.selEnd = function(){ ST.sel = null; render(); };
XActions.selToggle = function(d){
  if(!nSelOn() || !d || !d.id) return;
  const a = ST.sel.ids, i = a.indexOf(d.id);
  if(i>=0) a.splice(i,1); else a.push(d.id);
  render();
};
XActions.selAll = function(){
  if(!nSelOn()) return;
  const vis = nSelVisible();
  ST.sel.ids = vis.every(id=>ST.sel.ids.includes(id)) ? [] : vis.slice();
  render();
};
const _n22RenderList = renderList;
renderList = function(){
  let html = _n22RenderList();
  if(ST.listKind!=='songs' || !ST.userId) return html;
  const on = nSelOn();
  const btn = `<button class="nsel-go${on?' on':''}" data-xact="${on?'selEnd':'selStart'}">${on?'Done':'Select'}</button>`;
  html = html.replace('<div style="flex:1"></div>', '<div style="flex:1"></div>'+btn);
  if(!on) return html;
  const sel = ST.sel.ids;
  return html.replace(/<div class="list-row has-act srow([^"]*)" data-act="openSongFrom" data-id="([^"]*)" data-from="list">/g, (m, cls, id)=>{
    const s = sel.includes(id);
    return `<div class="list-row has-act srow nsel-row${s?' on':''}${cls}" data-xact="selToggle" data-id="${id}" role="checkbox" aria-checked="${s}"><span class="nsel-box">${s?icon('check',18):''}</span>`;
  });
};
function nSelBarHTML(){
  const n = ST.sel.ids.length, vis = nSelVisible(), all = vis.length && vis.every(id=>ST.sel.ids.includes(id));
  const pl = nSelPl(), plMine = pl && pl.mine!==false;
  const dis = n ? '' : ' disabled';
  const ids = ST.sel.ids;
  const allFav = n && ids.every(id=>hasFlag('fav', id)), allMark = n && ids.every(id=>hasFlag('mark', id));
  const b = (act, ic, lbl, cls)=>`<button class="nsb-b${cls?' '+cls:''}" data-xact="${act}"${dis}>${icon(ic,22)}<span>${lbl}</span></button>`;
  return `<div class="nsb-top"><span class="nsb-n">${n ? n+' selected' : 'Tap songs to select them'}</span>${vis.length ? `<span class="nsb-all" data-xact="selAll">${all?'Clear':'Select all'}</span>` : ''}<button class="nsb-x" data-xact="selEnd" title="Done" aria-label="Done selecting">${icon('close',20)}</button></div>
    <div class="nsb-acts">
      ${b('selAddPl','playlist_add','Playlist')}
      ${b('selAddGig','event','Gig')}
      ${b('selFav', 'favorite', allFav ? 'Unheart' : 'Heart')}
      ${b('selMark','bookmark', allMark ? 'Unmark' : 'Mark')}
      ${plMine ? b('selPlRemove','playlist_remove','Remove','danger') : (pl ? '' : b('selDelete','delete','Delete','danger'))}
    </div>`;
}
function nSyncSelBar(){
  let bar = document.getElementById('nSelBar');
  const on = nSelOn() && !ST.newItem && !ST.confirm;
  document.body.classList.toggle('n-selecting', nSelOn());
  if(!on){ if(bar){ bar.hidden = true; bar._h = ''; } return; }
  if(!bar){ bar = document.createElement('div'); bar.id = 'nSelBar'; bar.setAttribute('role','toolbar'); bar.setAttribute('aria-label','Selected songs'); document.body.appendChild(bar); }
  const h = nSelBarHTML();
  bar.hidden = false;
  if(bar._h !== h){ bar.innerHTML = h; bar._h = h; }
}
const _n22Render = render;
render = function(){
  if(ST.sel && !nSelOn()) ST.sel = null;
  if(ST.sel) ST.sel.ids = ST.sel.ids.filter(id=>D.songs[id]);
  _n22Render();
  nSyncSelBar();
};
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && nSelOn() && !ST.newItem && !ST.confirm){ ST.sel = null; render(); } });

function nSelDone(msg){ ST.sel = null; render(); if(msg) toast(msg); }
function nSongs(n){ return n+' song'+(n===1?'':'s'); }
XActions.selFav = function(){ nSelFlag('fav', 'Hearted', 'Removed the heart from'); };
XActions.selMark = function(){ nSelFlag('mark', 'Marked', 'Unmarked'); };
function nSelFlag(k, onMsg, offMsg){
  if(!nSelOn() || !ST.sel.ids.length) return;
  const ids = ST.sel.ids.slice(), off = ids.every(id=>hasFlag(k, id));
  ids.forEach(id=>setFlag(k, id, !off));
  nSelDone((off ? offMsg : onMsg)+' '+nSongs(ids.length));
}
XActions.selAddPl = function(){ if(!nSelOn() || !ST.sel.ids.length || !canSync()) return; ST.newItem = { kind:'bulkpick', to:'playlist', ids: ST.sel.ids.slice() }; render(); };
XActions.selAddGig = function(){ if(!nSelOn() || !ST.sel.ids.length || !canSync()) return; ST.newItem = { kind:'bulkpick', to:'gig', ids: ST.sel.ids.slice() }; render(); };
XActions.bulkPick = function(d){
  const ni = ST.newItem; if(!ni || ni.kind!=='bulkpick' || !canSync()) return;
  const isPl = ni.to==='playlist';
  const t = isPl ? (D.playlists||[]).find(x=>x.id===d.id) : (D.gigs||[]).find(x=>x.id===d.id);
  if(!t) return;
  const list = isPl ? t.ids : t.setlist;
  const add = ni.ids.filter(id=>!list.includes(id));
  if(add.length){
    if(isPl){ t.ids = [...t.ids, ...add]; queueSavePlaylist(t.id); }
    else { t.setlist = [...t.setlist, ...add]; queueSaveGig(t.id); }
  }
  ST.newItem = null;
  nSelDone(add.length ? nSongs(add.length)+' added to '+(t.title||(isPl?'the playlist':'the gig')) : 'They’re all in '+(t.title||(isPl?'that playlist':'that gig'))+' already');
};
XActions.bulkNew = function(){
  const ni = ST.newItem; if(!ni || ni.kind!=='bulkpick') return;
  ST._bulkNew = { ids: ni.ids.slice(), to: ni.to };
  ST.newItem = null;
  Actions.openNew({ id: ni.to==='playlist' ? 'playlist' : 'gig' });
};
// a new playlist / gig made from the selection starts with those songs
const _n22CreateNew = Actions.createNew;
Actions.createNew = function(){
  const bn = ST._bulkNew, ni = ST.newItem;
  if(!bn || !ni || (ni.kind!=='playlist' && ni.kind!=='gig')) return _n22CreateNew.apply(this, arguments);
  const beforeP = new Set((D.playlists||[]).map(p=>p.id)), beforeG = new Set((D.gigs||[]).map(g=>g.id));
  const r = _n22CreateNew.apply(this, arguments);
  if(ST.newItem) return r;                         // not made (no name yet)
  ST._bulkNew = null;
  if(ni.kind==='playlist'){
    const p = (D.playlists||[]).find(x=>!beforeP.has(x.id));
    if(p){ p.ids = [...p.ids, ...bn.ids.filter(id=>!p.ids.includes(id))]; queueSavePlaylist(p.id); }
  } else {
    const g = (D.gigs||[]).find(x=>!beforeG.has(x.id));
    if(g){ g.setlist = [...g.setlist, ...bn.ids.filter(id=>!g.setlist.includes(id))]; queueSaveGig(g.id); }
  }
  ST.sel = null; render();
  return r;
};
const _n22CloseNew = Actions.closeNew;
Actions.closeNew = function(){ ST._bulkNew = null; return _n22CloseNew.apply(this, arguments); };
XActions.bulkClose = function(){ ST.newItem = null; render(); };
function nBulkPickHTML(ni){
  const isPl = ni.to==='playlist', n = ni.ids.length;
  const items = isPl ? (D.playlists||[]).filter(p=>!p.auto && p.mine!==false) : (D.gigs||[]).filter(g=>g.mine!==false);
  const rows = items.map(t=>{
    const list = isPl ? t.ids : t.setlist, have = ni.ids.filter(id=>list.includes(id)).length;
    const art = nArt(isPl ? 'pl:'+(t.title||t.id) : 'gig:'+(t.id||t.title), 44, 11);
    const sub = (isPl ? '' : (t.date ? t.date+' · ' : '')) + nSongs(list.length) + (have ? ' · '+(have===n ? 'all '+(n===1?'':'of these ')+'already in it' : have+' already in it') : '');
    return `<div class="nbp-row" data-xact="bulkPick" data-id="${esc(t.id)}">${art}<div style="min-width:0"><div class="t">${esc(t.title||'Untitled')}</div><div class="s">${esc(sub)}</div></div></div>`;
  }).join('');
  return `<div class="modal-backdrop" data-xact="bulkClose"><div class="modal" style="max-width:440px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">${isPl ? 'Add to playlist' : 'Add to a gig'}</span><span class="icon-btn" data-xact="bulkClose">${icon('close',22)}</span></div>
    <div class="msub">${nSongs(n)}</div>
    <div class="nbp-list">${rows || `<div style="padding:12px 0;color:var(--n-mute)">${isPl ? 'No playlists of yours yet.' : 'No gigs of yours yet.'}</div>`}</div>
    <a class="link nbp-new" data-xact="bulkNew">${icon('add',20)}${isPl ? 'New playlist with these songs' : 'New gig with these songs'}</a>
  </div></div>`;
}
XActions.selDelete = function(){
  if(!nSelOn() || !ST.sel.ids.length || !canSync()) return;
  const ids = ST.sel.ids.slice(), mine = ids.filter(id=>song(id).mine!==false), others = ids.length - mine.length;
  const parts = [];
  if(mine.length) parts.push(nSongs(mine.length)+' will be deleted from your songs, playlists and gigs.');
  if(others) parts.push((mine.length ? 'The '+(others===1?'one':others)+' made by someone else ' : nSongs(others)+' made by someone else ')+(others===1?'is':'are')+' removed from your songs (you can add '+(others===1?'it':'them')+' again from Search).');
  ST.confirm = { act:'bulkDel', ids, ok: mine.length ? 'Delete' : 'Remove', text: parts.join(' ') };
  render();
};
XActions.selPlRemove = function(){
  const pl = nSelPl(); if(!nSelOn() || !ST.sel.ids.length || !pl || !canSync()) return;
  ST.confirm = { act:'bulkPlRm', ids: ST.sel.ids.slice(), pl: pl.id, ok:'Remove', text: nSongs(ST.sel.ids.length)+' will be removed from '+(pl.title||'this playlist')+'. They stay in your songs.' };
  render();
};
const _n22ConfirmOk = Actions.confirmOk;
Actions.confirmOk = function(){
  const c = ST.confirm;
  if(!c || (c.act!=='bulkDel' && c.act!=='bulkPlRm')) return _n22ConfirmOk.apply(this, arguments);
  ST.confirm = null;
  if(!canSync()){ render(); return; }
  if(c.act==='bulkPlRm'){
    const p = (D.playlists||[]).find(x=>x.id===c.pl);
    if(p){ p.ids = p.ids.filter(id=>!c.ids.includes(id)); queueSavePlaylist(p.id); }
    nSelDone(nSongs(c.ids.length)+' removed from '+(p ? p.title : 'the playlist'));
    return;
  }
  let del = 0, rem = 0;
  c.ids.forEach(id=>{
    const s = D.songs[id]; if(!s) return;
    if(s.mine===false){ removeFromMine(id); rem++; } else { deleteSongEverywhere(id); del++; }
  });
  nSelDone(del && rem ? nSongs(del)+' deleted, '+rem+' removed' : del ? nSongs(del)+' deleted' : nSongs(rem)+' removed from your songs');
};

/* ---- forgotten password ---- */
const N22_RESET_FLAG = 'singa_reset=1';
function nResetUrl(){ return location.origin + location.pathname + '?' + N22_RESET_FLAG; }
XActions.pwForgot = function(){ ST.authMode = 'forgot'; ST.pwSent = ''; ST.pwBusy = false; render(); setTimeout(()=>{ const i = document.querySelector('[data-bind="email"]'); if(i && !i.value) i.focus(); }, 60); };
XActions.pwBack = function(){ ST.authMode = 'signin'; ST.pwSent = ''; ST.pwBusy = false; render(); };
XActions.pwAgain = function(){ ST.pwSent = ''; render(); };
Actions.pwSend = async function(){
  if(ST.pwBusy) return;
  const inp = document.querySelector('[data-bind="email"]'); if(inp) ST.email = inp.value;
  const email = (ST.email||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ toast('Enter the email you signed up with'); return; }
  ST.pwBusy = true; render();
  try{
    const r = await sb.auth.resetPasswordForEmail(email, { redirectTo: nResetUrl() });
    ST.pwBusy = false;
    if(r && r.error){
      const m = String(r.error.message||'');
      toast(/after \d+ seconds|rate limit|too many/i.test(m) ? 'An email was just sent — wait a minute before asking for another' : m);
      render(); return;
    }
    ST.pwSent = email; render();
  }catch(e){ ST.pwBusy = false; render(); toast('Couldn’t send the email — check your connection and try again'); }
};
const _n22Login = renderLogin;
renderLogin = function(){
  if(ST.authMode!=='forgot'){
    const h = _n22Login();
    if(ST.authMode!=='signin') return h;
    return h.replace(/(<input class="ipt" type="password"[^>]*>)/, '$1<a class="link n-forgot" data-xact="pwForgot">Forgot your password?</a>');
  }
  ST.authMode = 'signin';
  let h;
  try{ h = _n22Login(); } finally { ST.authMode = 'forgot'; }
  h = h.replace(/<div class="row" style="align-self:center;gap:28px;margin-bottom:4px">[\s\S]*?<\/div>/, '<div class="n-pw-h">Reset your password</div>')
    .replace(/<div style="display:flex;align-items:center;gap:12px;color:#9a9a9a;font-size:13px;margin:6px 0">[\s\S]*?data-id="Facebook">[^<]*<\/button>/, '');
  if(ST.pwSent){
    return h.replace(/<input class="ipt" placeholder="Email"[^>]*>[\s\S]*?<div style="font-size:12px;color:#9a9a9a;text-align:center">[\s\S]*?<\/div>/,
      `<div class="n-pw-s">Check your email. If <b style="color:#fff">${esc(ST.pwSent)}</b> has a Singa account, we’ve sent it a link to choose a new password. Open it on any device — it brings you back here.</div>
      <button class="btn btn-dark" data-xact="pwBack">Back to sign in</button>
      <a class="link n-pw-back" data-xact="pwAgain">Didn’t get it? Send it again</a>`);
  }
  return h.replace(/<input class="ipt" type="password"[^>]*>/, '')
    .replace('data-bind="email"', 'data-bind="email" data-key="pwSend"')
    .replace(/<button class="btn [^"]*" data-act="login">[\s\S]*?<\/button>/, `<button class="btn ${ST.pwBusy?'btn-disabled':'btn-dark'}" data-act="pwSend">${ST.pwBusy?'Sending…':'Email me a reset link'}</button>`)
    .replace(/<div style="font-size:12px;color:#9a9a9a;text-align:center">[\s\S]*?<\/div>/, `<div class="n-pw-s" style="font-size:13px">Enter the email you signed up with. We’ll send you a link to choose a new password.</div>
      <a class="link n-pw-back" data-xact="pwBack">Back to sign in</a>`);
};
const _n22SetMode = Actions.setAuthMode;
Actions.setAuthMode = function(){ ST.pwSent = ''; return _n22SetMode.apply(this, arguments); };

/* ---- choosing a new password (from the emailed link, or Account › Change password) ---- */
function nPwOpen(fromLink){ ST.newItem = { kind:'pwnew', pw:'', show:false, err:'', busy:false, fromLink:!!fromLink }; render(); setTimeout(()=>{ const i = document.getElementById('nPwNew'); if(i) i.focus(); }, 80); }
function nStripReset(){ try{ if(location.search.indexOf(N22_RESET_FLAG)>=0) history.replaceState(history.state, '', location.pathname); }catch(e){} }
XActions.pwChange = function(){ if(!ST.userId) return; ST.accountOpen = false; nPwOpen(false); };
XActions.pwShow = function(){ const ni = ST.newItem; if(!ni || ni.kind!=='pwnew') return; const i = document.getElementById('nPwNew'); if(i) ni.pw = i.value; ni.show = !ni.show; render(); };
XActions.pwClose = function(){ const ni = ST.newItem; if(ni && ni.kind==='pwnew' && ni.busy) return; ST.newItem = null; nStripReset(); render(); };
Binds.pwNew = function(v){ const ni = ST.newItem; if(ni && ni.kind==='pwnew'){ ni.pw = v; if(ni.err){ ni.err = ''; const e = document.querySelector('.n-pw-err'); if(e) e.remove(); } } };
Actions.pwSave = async function(){
  const ni = ST.newItem; if(!ni || ni.kind!=='pwnew' || ni.busy) return;
  const i = document.getElementById('nPwNew'); if(i) ni.pw = i.value;
  if((ni.pw||'').length < 6){ ni.err = 'Use at least 6 characters'; render(); return; }
  ni.busy = true; ni.err = ''; render();
  try{
    const r = await sb.auth.updateUser({ password: ni.pw });
    ni.busy = false;
    if(r && r.error){
      const m = String(r.error.message||'');
      ni.err = /different from the old/i.test(m) ? 'That’s your current password — choose a new one' : /session|expired|jwt/i.test(m) ? 'The reset link has expired — sign out and ask for a new one' : m;
      render(); return;
    }
    if(ST.newItem===ni) ST.newItem = null;
    nStripReset(); render();
    toast('Password changed — use it next time you sign in');
  }catch(e){ ni.busy = false; ni.err = 'Couldn’t save it — check your connection and try again'; render(); }
};
function nPwNewHTML(ni){
  return `<div class="modal-backdrop"><div class="modal" style="max-width:420px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">Choose a new password</span><span class="icon-btn" data-xact="pwClose" aria-label="Close">${icon('close',22)}</span></div>
    <div class="msub">${ni.fromLink ? 'You’re signed in as '+esc(ST.email||'you')+'. Set the password you’ll use from now on.' : 'For '+esc(ST.email||'your account')+'.'}</div>
    <div style="position:relative;margin-top:6px">
      <input id="nPwNew" class="ipt" style="width:100%;padding-right:46px" type="${ni.show?'text':'password'}" placeholder="New password" autocomplete="new-password" value="${esc(ni.pw)}" data-bind="pwNew" data-key="pwSave" ${ni.busy?'disabled':''}>
      <button class="n-pw-eye" data-xact="pwShow" aria-label="${ni.show?'Hide password':'Show password'}" type="button">${icon(ni.show?'visibility_off':'visibility',20)}</button>
    </div>
    <div style="font-size:12px;color:var(--n-mute);margin-top:6px">At least 6 characters.</div>
    ${ni.err ? `<div class="n-pw-err" style="margin-top:8px">${esc(ni.err)}</div>` : ''}
    <button class="btn ${ni.busy?'btn-disabled':'btn-dark'}" style="margin-top:14px" data-act="pwSave">${ni.busy?'Saving…':'Save password'}</button>
  </div></div>`;
}
const _n22NewModal = renderNewModal;
renderNewModal = function(){
  const ni = ST.newItem;
  if(ni && ni.kind==='pwnew') return nPwNewHTML(ni);
  if(ni && ni.kind==='bulkpick') return nBulkPickHTML(ni);
  return _n22NewModal();
};
// Account › Change password (email sign-ins only)
const _n22Account = renderAccountPanel;
renderAccountPanel = function(){
  const h = _n22Account();
  const prov = String(ST.authProvider||'email').toLowerCase();
  if(!ST.userId || (prov && prov!=='email')) return h;
  const row = `<div class="list-row" data-xact="pwChange"><div><div class="s" style="margin:0 0 3px">Password</div><div class="t">Change password</div></div>${icon('chevron_right',22)}</div>`;
  return h.replace(/<div class="list-row" data-act="editNickname">[\s\S]*?chevron_right<\/span><\/div>/, m=>m+row);
};
// arriving from the emailed link: signed in by it, so ask for the new password
function nResetLanding(){
  const href = location.href;
  if(href.indexOf(N22_RESET_FLAG)<0) return;
  if(ST.userId){ if(!ST.newItem || ST.newItem.kind!=='pwnew') nPwOpen(true); return; }
  if(/error_code=|error=access_denied/.test(location.hash)){
    nStripReset();
    ST.authMode = 'forgot'; ST.pwSent = ''; render();
    toast('That reset link has expired or was already used — ask for a new one');
  }
}
const _n22Apply = applySession;
applySession = async function(session){
  const r = await _n22Apply.apply(this, arguments);
  if(session && session.user && location.href.indexOf(N22_RESET_FLAG)>=0) setTimeout(nResetLanding, 0);
  return r;
};
try{
  sb.auth.onAuthStateChange(function(ev){ if(ev==='PASSWORD_RECOVERY') setTimeout(()=>{ if(ST.userId && (!ST.newItem || ST.newItem.kind!=='pwnew')) nPwOpen(true); }, 400); });
}catch(e){}
setTimeout(nResetLanding, 0);

render();
