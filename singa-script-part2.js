"use strict";
function makeQr(seed){
  let x = seed; const rnd=()=>{ x=(x*9301+49297)%233280; return x/233280; };
  const N=25, out=[];
  const finder=(r,c,R,C)=>{ const a=r-R,b=c-C; if(a<0||b<0||a>6||b>6) return null; if(a===0||a===6||b===0||b===6) return 1; return (a>=2&&a<=4&&b>=2&&b<=4)?1:0; };
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    let v=finder(r,c,0,0); if(v===null) v=finder(r,c,0,18); if(v===null) v=finder(r,c,18,0);
    if(v===null){ const zone=(r<8&&c<8)||(r<8&&c>16)||(r>16&&c<8); v = zone?0:(rnd()>0.52?1:0); }
    out.push(v?'#111':'#fff');
  }
  return out;
}
const QR = makeQr(42);
function qrHTML(){ return `<div class="qrgrid">${QR.map(c=>`<div style="background:${c}"></div>`).join('')}</div>`; }

function buildLines(s, mode, opt){
  opt = opt || {};
  const tm = timing(s);
  const ci = opt.t!=null ? curWord(tm, opt.t) : -1;
  const cw = ci>=0 ? tm.words[ci] : null;
  let curChordK = -1; if(ci>=0) for(let k=0;k<=ci;k++){ const w=tm.words[k]; if(s.chords[w.li+'-'+w.wi]) curChordK=k; }
  const notes = { ...(s.notes||{}), ...(opt.extraNotes||{}) };
  const sel = ST.selRoot + ST.selSuffix;
  let g = 0;
  return tm.lines.map((ws,li)=>{
    const curLine = cw && cw.li===li, last = ws.length-1;
    let hasUp = false;
    const w2 = ws.map((w,wi)=>{
      const id = li+'-'+wi, ch = opt.hideChords ? '' : (s.chords[id]||''), gi = g++;
      const mark = notes[id] || '';
      const o = { id, w, chord:ch, col:'#333', chordCol:'#9a9a9a', weight:400, cursor:'default', mark,
        markBefore: !!mark && wi===0, markAfter: !!mark && wi===last && wi!==0, markUp: !!mark && wi>0 && wi<last };
      if(o.markUp) hasUp = true;
      if(mode==='chords'){
        o.col='#a3a3a3'; o.chordCol='#1b1b1b'; o.cursor='pointer'; o.clickAct='placeChord'; o.clickId=id;
      } else if(mode==='markings'){
        o.cursor='pointer'; o.clickAct='pickMarkWord'; o.clickId=id; o.selected = ST.selWord===id;
      } else if(mode==='view'){
        o.chordCol = ch && ch===opt.selChord ? '#f24822' : '#9a9a9a';
        if(ch){ o.cursor='pointer'; o.clickAct='setViewChord'; o.clickId=ch; }
      } else if(mode==='play'){
        const past = cw && li<cw.li;
        o.weight=700;
        o.col = curLine ? (gi<=ci?'#1b1b1b':'#b8b8b8') : (past?'#d2d2d2':'#a8a8a8');
        o.chordCol = gi===curChordK ? '#f24822' : (curLine?'#8a8a8a':'#cfcfcf');
      }
      return o;
    });
    const isPlay = mode==='play', on = isPlay && curLine;
    return { li, words:w2, padTop:(hasUp?30:0)+(on?10:0), mb: on?10:0, scale: on?1.12:1, op: isPlay && cw && li<cw.li ? 0.75:1, cur: on };
  });
}
function linesHTML(lines, big){
  return `<div class="lyrics-wrap">` + lines.map(l=>{
    const style = `margin-top:${l.padTop}px;margin-bottom:${l.mb}px;transform:scale(${l.scale});transform-origin:left center;opacity:${l.op}`;
    const words = l.words.map(w=>{
      let marks = '';
      if(w.markUp) marks += `<span class="markup"><span class="mtext">${esc(w.mark)}</span><svg width="16" height="18" viewBox="0 0 16 18" fill="none" stroke="#2f8fe0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 1.5c2.5 4 3.4 8.5 2.4 14"></path><path d="M4.3 11.8l4.1 4.2 3.6-4.6"></path></svg></span>`;
      if(w.markBefore) marks += `<span class="markbefore"><span class="mtext">${esc(w.mark)}</span><svg width="24" height="14" viewBox="0 0 24 14" fill="none" stroke="#2f8fe0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8c5-3 11-3.2 19-.8"></path><path d="M16 3l4.6 4.3-5.4 3.2"></path></svg></span>`;
      if(w.markAfter) marks += `<span class="markafter"><svg width="24" height="14" viewBox="0 0 24 14" fill="none" stroke="#2f8fe0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 8c-5-3-11-3.2-19-.8"></path><path d="M8 3L3.4 7.3l5.4 3.2"></path></svg><span class="mtext">${esc(w.mark)}</span></span>`;
      const act = w.clickAct ? `data-act="${w.clickAct}" data-id="${esc(w.clickId)}"` : '';
      const bg = w.selected ? 'background:#e5f0fc' : '';
      const fsz = big ? 'font-size:32px;padding:0 2px' : 'font-size:24px';
      const fszc = big ? 'font-size:15px;font-weight:700' : 'font-size:14px;font-weight:600';
      return `<span class="lword" style="cursor:${w.cursor};border-radius:5px;${bg}" ${act}>${marks}<span class="lchord" style="${fszc};color:${w.chordCol}">${esc(w.chord)}</span><span class="ltext" style="${fsz};font-weight:${w.weight};color:${w.col}">${esc(w.w)}</span></span>`;
    }).join('');
    return `<div class="lline" style="${style}">${words}</div>`;
  }).join('') + `</div>`;
}
/* ============================================================
   SCREENS: Login / Home / List / Search
   ============================================================ */
function renderLogin(){
  return `<div class="scr center" style="padding-top:24px">
    <svg class="mascot" style="height:300px;margin-top:10px" viewBox="0 0 160 160" fill="none" aria-hidden="true"><circle cx="80" cy="80" r="74" fill="var(--accent)"/><path d="M50 83l19 19 41-46" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="34" r="6" fill="var(--accent)"/><circle cx="142" cy="46" r="5" fill="#2a9d6b"/><circle cx="136" cy="124" r="7" fill="#4169c7"/><circle cx="16" cy="118" r="5" fill="#8e4fd6"/></svg>
    <div style="font-size:46px;font-weight:800;letter-spacing:-0.02em;margin-top:18px">make some noise!</div>
    <div style="width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px;margin-top:36px">
      <div class="seg" style="align-self:center;margin-bottom:4px">
        <button class="${ST.authMode==='signin'?'on':''}" data-act="setAuthMode" data-id="signin">Sign In</button>
        <button class="${ST.authMode==='signup'?'on':''}" data-act="setAuthMode" data-id="signup">Sign Up</button>
      </div>
      <input class="ipt" placeholder="Email" value="${esc(ST.email)}" data-bind="email" autocomplete="email" inputmode="email">
      <input class="ipt" type="password" placeholder="Password" value="${esc(ST.password)}" data-bind="password" data-key="login" autocomplete="${ST.authMode==='signup'?'new-password':'current-password'}">
      <button class="btn ${ST.authBusy?'btn-disabled':'btn-dark'}" data-act="login">${ST.authBusy?'Please wait…':(ST.authMode==='signup'?'Create Account':'Sign In')}</button>
      <div style="font-size:12px;color:#9a9a9a;text-align:center">${ST.authMode==='signup'?"We'll create your account and sign you in.":"Don't have an account? Tap Sign Up above."}</div>
      <div style="display:flex;align-items:center;gap:12px;color:#9a9a9a;font-size:13px;margin:6px 0"><div style="flex:1;height:1px;background:#e2e2e2"></div>or<div style="flex:1;height:1px;background:#e2e2e2"></div></div>
      <button class="btn btn-outline" data-act="loginSocial" data-id="Apple">Continue with Apple</button>
      <button class="btn btn-outline" data-act="loginSocial" data-id="Google">Continue with Google</button>
      <button class="btn btn-outline" data-act="loginSocial" data-id="Facebook">Continue with Facebook</button>
    </div>
  </div>`;
}

function srcBadge(p){
  if(!p || !p.src) return '';
  return p.src==='spotify'
    ? `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1ed760"></circle><path d="M6.5 9.2c3.8-1.1 7.6-.8 11 1M7.2 12.4c3-.8 6.1-.6 8.8.9M7.9 15.4c2.3-.6 4.6-.4 6.6.7" stroke="#000" stroke-width="1.6" fill="none" stroke-linecap="round"></path></svg>`
    : p.src==='youtube'
    ? `<svg width="24" height="17" viewBox="0 0 24 17"><rect width="24" height="17" rx="4.5" fill="#ff0000"></rect><path d="M9.6 4.8v7.4l6.2-3.7z" fill="#fff"></path></svg>` : '';
}
function playlistRow(p){
  const ids = p.auto ? D.order : p.ids;
  const sub = p.auto ? (ids.length+' songs') : (p.src ? 'Imported playlist' : (ids.length+' songs'+(p.mine?'':' · by '+p.by)));
  const badge = srcBadge(p);
  return `<div class="list-row" data-act="openPlaylist" data-id="${p.id}"><div><div class="t">${esc(p.title)}${badge}</div><div class="s">${esc(sub)}</div></div></div>`;
}
function gigRowHome(g){
  return `<div class="list-row" data-act="openGig" data-id="${g.id}"><div style="min-width:0"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(g.title)}</div><div class="s">${esc(g.date)}</div></div>${g.id==='nye'?'<span style="font-size:11px;font-weight:700;letter-spacing:.06em;color:#f24822">LIVE</span>':''}</div>`;
}
function songRowHome(s){
  return `<div class="list-row" data-act="openSongFrom" data-id="${s.id}" data-from="home" style="border-bottom:1px solid var(--b2)"><div><div class="t">${esc(s.title||'Untitled song')}</div><div class="s">${esc(s.sub || (s.synced?'':'Draft'))}</div></div></div>`;
}

function renderHome(){
  const playlists = D.playlists.slice(0,3).map(playlistRow).join('');
  const gigs = D.gigs.slice(0,3).map(gigRowHome).join('');
  const recent = D.order.slice(0,4).map(id=>songRowHome(song(id))).join('');
  return `<div class="scr">
    <div class="row" style="gap:16px;margin-bottom:36px">
      <div class="search-field" style="flex:1;max-width:340px">
        <input placeholder="Search songs, playlists or gigs" value="${esc(ST.homeQuery)}" data-bind="homeQuery" data-key="runSearch" inputmode="search" enterkeyhint="search">
        <button class="icon-btn" style="width:36px;height:36px" data-act="runSearch">${icon('search',22)}</button>
      </div>
      <div style="flex:1"></div>
      <button class="icon-btn" title="Account" data-act="nav" data-to="account" style="width:48px;height:48px;border-radius:50%;border:1.5px solid var(--fg);background:#fff">${icon('person',24)}</button>
    </div>
    <div class="home-grid">
      <div style="display:flex;flex-direction:column;gap:48px">
        <div>
          <div class="row" style="justify-content:space-between;margin-bottom:8px"><span style="font-size:26px;font-weight:700">Playlists</span><span class="icon-btn" title="New playlist" data-act="newItem" data-kind="playlist">${icon('add',24)}</span></div>
          ${playlists}
          <a class="link" style="display:inline-block;margin-top:14px;text-decoration:underline" data-act="openList" data-kind="playlists">All Playlists</a>
        </div>
        <div>
          <div class="row" style="justify-content:space-between;margin-bottom:8px"><span style="font-size:26px;font-weight:700">Gigs</span><span class="icon-btn" title="New gig" data-act="newItem" data-kind="gig">${icon('add',24)}</span></div>
          ${gigs}
          <a class="link" style="display:inline-block;margin-top:14px;text-decoration:underline" data-act="openList" data-kind="gigs">All Gigs</a>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:48px">
        <div class="row" style="flex-direction:column;gap:12px;padding:16px 0;cursor:pointer" data-act="newSong">
          <div style="width:84px;height:84px;border-radius:50%;background:var(--fg);color:#fff;display:flex;align-items:center;justify-content:center">${icon('add',40)}</div>
          <div style="font-size:17px;font-weight:600">Add a Song</div>
        </div>
        <div>
          <div style="font-size:26px;font-weight:700;margin-bottom:8px">Recent Songs</div>
          ${recent}
          <a class="link" style="display:inline-block;margin-top:14px;text-decoration:underline" data-act="openList" data-kind="songs">All Songs</a>
        </div>
      </div>
    </div>
  </div>`;
}

function sortRows(rows){
  const r = ST.sort==='mine' ? rows.filter(x=>x.mine) : rows;
  const by = { az:(a,b)=>a.title.localeCompare(b.title), za:(a,b)=>b.title.localeCompare(a.title), played:(a,b)=>b.plays-a.plays, recent:(a,b)=>b.added-a.added, mine:(a,b)=>b.added-a.added }[ST.sort];
  return [...r].sort(by);
}
function sortDropdown(){
  const label = SORTS.find(x=>x[0]===ST.sort)[1];
  const opts = ST.sortOpen ? `<div style="position:absolute;right:0;top:calc(100% + 6px);width:210px;background:#fff;border:1.5px solid var(--fg);border-radius:12px;padding:6px;box-shadow:0 12px 30px rgba(0,0,0,.1);display:flex;flex-direction:column;z-index:4">
    ${SORTS.map(([v,l])=>`<button style="border:0;border-radius:8px;background:${v===ST.sort?'#f2f2f2':'transparent'};text-align:left;padding:10px 12px;font-size:14px;font-weight:${v===ST.sort?700:500};display:flex;justify-content:space-between;align-items:center" data-act="setSort" data-id="${v}">${l}<span class="msi" style="font-size:18px;opacity:${v===ST.sort?1:0}">check</span></button>`).join('')}
  </div>` : '';
  return `<div style="position:relative"><button class="row" style="border:0;background:transparent;gap:4px;font-size:13px;color:#6f6f6f" data-act="toggleSort">Sort by: <span style="font-weight:600;color:var(--fg)">${label}</span>${icon(ST.sortOpen?'expand_less':'expand_more',18)}</button>${opts}</div>`;
}
function songRowList(id, badgeText, badgeCol, from){
  const s = song(id);
  return `<div class="list-row" data-act="openSongFrom" data-id="${id}" data-from="${from}"><div><div class="t">${esc(s.title||'Untitled song')}</div><div class="s">${esc(s.sub || (s.synced?'':'Draft'))}</div></div><div class="row" style="gap:12px"><span style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${badgeCol}">${esc(badgeText)}</span>${icon('chevron_right',22)}</div></div>`;
}
function gigRowList(g){
  const sub = g.date+' · '+g.setlist.length+' songs'+(g.mine?'':' · by '+g.by);
  return `<div class="list-row" data-act="openGig" data-id="${g.id}"><div><div class="t">${esc(g.title)}</div><div class="s">${esc(sub)}</div></div><div class="row" style="gap:12px"><span style="font-size:11px;font-weight:700;letter-spacing:.05em;color:#f24822">${g.id==='nye'?'LIVE':''}</span>${icon('chevron_right',22)}</div></div>`;
}

function renderList(){
  const curPl = ST.listPl ? D.playlists.find(p=>p.id===ST.listPl) : null;
  let title, rowsHtml, empty, titleBadge='';
  if(ST.listKind==='songs'){
    const ids = curPl ? (curPl.auto?D.order:curPl.ids) : D.order;
    let rows = ids.map(id=>({ id, ...song(id) }));
    const q = ST.listQuery.trim().toLowerCase();
    if(q) rows = rows.filter(r=>((r.title||'')+' '+(r.sub||'')).toLowerCase().includes(q));
    rows = sortRows(rows);
    title = curPl ? curPl.title : 'Songs';
    titleBadge = srcBadge(curPl);
    rowsHtml = rows.map(r=>songRowList(r.id, r.synced?'SYNCED':'NO TAKE', r.synced?'#1b1b1b':'#b0b0b0', 'list')).join('');
    empty = !rows.length;
  } else if(ST.listKind==='playlists'){
    let rows = D.playlists.slice();
    const q = ST.listQuery.trim().toLowerCase();
    if(q) rows = rows.filter(r=>r.title.toLowerCase().includes(q));
    rows = sortRows(rows);
    title='Playlists'; rowsHtml = rows.map(playlistRow).join(''); empty = !rows.length;
  } else {
    let rows = D.gigs.slice();
    const q = ST.listQuery.trim().toLowerCase();
    if(q) rows = rows.filter(r=>r.title.toLowerCase().includes(q));
    rows = sortRows(rows);
    title='Gigs'; rowsHtml = rows.map(gigRowList).join(''); empty = !rows.length;
  }
  return `<div class="scr">
    <div class="search-field" style="max-width:340px;margin-bottom:28px">
      <input placeholder="Search" value="${esc(ST.listQuery)}" data-bind="listQuery" inputmode="search" enterkeyhint="search">${icon('search',22)}
    </div>
    <div class="row" style="gap:14px;position:relative;z-index:2;margin-bottom:24px">
      <span class="icon-btn" data-act="nav" data-to="home">${icon('chevron_left',26)}</span>
      <span style="font-size:28px;font-weight:700;display:flex;align-items:center;gap:8px">${esc(title)}${titleBadge}</span>
      <span class="icon-btn" title="Add" data-act="listAdd" style="margin-left:36px">${icon('add',24)}</span>
      <div style="flex:1"></div>
      ${sortDropdown()}
    </div>
    <div style="overflow:auto">${rowsHtml}${empty?'<div style="padding:24px 0;color:#8a8a8a">Nothing here yet.</div>':''}</div>
  </div>`;
}