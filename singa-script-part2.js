"use strict";
/* Real QR code for a gig's Audience link (singa-script-part9.js's openQr
   generates it with the `qrcode` library and stores the PNG data URL on
   ST.qrDataUrl — this just renders whatever's ready). Replaces the old
   makeQr()/QR grid, which was a decorative seeded-random pattern styled to
   look like a QR code but never actually encoded a link. */
function qrHTML(){
  if(!ST.qrDataUrl) return `<div class="qrgrid" style="display:flex;align-items:center;justify-content:center;color:#9a9a9a;font-size:13px;height:220px">Generating…</div>`;
  return `<img src="${ST.qrDataUrl}" alt="QR code" width="220" height="220" style="border-radius:8px">`;
}

function buildLines(s, mode, opt){
  opt = opt || {};
  const tm = timing(s);
  const ci = opt.t!=null ? curWord(tm, opt.t) : -1;
  const cw = ci>=0 ? tm.words[ci] : null;
  let curChordK = -1; if(ci>=0) for(let k=0;k<=ci;k++){ const w=tm.words[k]; if(s.chords[w.li+'-'+w.wi]) curChordK=k; }
  const notes = { ...(s.notes||{}), ...(opt.extraNotes||{}) };
  let g = 0;
  return tm.lines.map((ws,li)=>{
    const header = isHeaderLine(ws);
    const curLine = cw && cw.li===li, last = ws.length-1;
    const w2 = ws.map((w,wi)=>{
      const id = li+'-'+wi, gi = header ? -1 : g++;
      const ch = (header || opt.hideChords) ? '' : (s.chords[id]||'');
      const mark = header ? '' : (notes[id] || '');
      // Where a mark sits: first word → left of it, last word → right of it,
      // anything in between → above the line, centred on the word.
      const markSide = mark ? (wi===0 ? 'left' : (wi===last ? 'right' : 'top')) : null;
      const o = { id, w, chord:ch, col:'#333', chordCol:'#9a9a9a', weight:400, cursor:'default', mark, markSide,
        selected: ST.selWord===id };
      if(header){
        // Never interactive, never chorded/marked.
      } else if(mode==='chords'){
        o.col='#a8a8a8'; o.weight=500; o.chordCol='#1b1b1b'; o.chip=true; o.drop=id;
      } else if(mode==='markings'){
        o.cursor='pointer'; o.clickAct='pickMarkWord'; o.clickId=id;
      } else if(mode==='view'){
        o.chordCol = '#9a9a9a';
        if(ch){ o.cursor='pointer'; o.clickAct='setViewChord'; o.clickId=ch; }
      } else if(mode==='play'){
        const past = cw && li<cw.li;
        o.weight=700;
        o.col = curLine ? (gi<=ci?'#1b1b1b':'#b8b8b8') : (past?'#d2d2d2':'#a8a8a8');
        o.chordCol = gi===curChordK ? '#f24822' : (curLine?'#8a8a8a':'#cfcfcf');
        if(gi===curChordK && ch) o.chordAnim = animStyle('lyrChord', id, 'chordPop', 450);
      }
      return o;
    });
    // End-of-line chords ("…of me  E7"): stored as li-t0, li-t1… — a chord
    // played on the held last note, after the last sung word. Shown as a
    // chord with no word under it at the end of the line.
    if(!header && !opt.hideChords){
      for(let k=0; s.chords[li+'-t'+k]; k++){
        const tid = li+'-t'+k, tc = s.chords[tid];
        const o = { id:tid, w:'', chord:tc, col:'#333', chordCol:'#9a9a9a', weight:400, cursor:'default', mark:'', markSide:null, selected:false, tail:true };
        if(mode==='chords'){ o.chordCol='#1b1b1b'; o.chip=true; o.drop=tid; }
        else if(mode==='view'){ o.chordCol = '#9a9a9a'; o.cursor='pointer'; o.clickAct='setViewChord'; o.clickId=tc; }
        else if(mode==='play'){ o.chordCol = curLine ? '#8a8a8a' : '#cfcfcf'; }
        w2.push(o);
      }
    }
    const isPlay = mode==='play', on = !header && isPlay && curLine;
    return { li, words:w2, header, padTop: on?10:0, mb: on?10:0, scale: on?1.12:1, op: (!header && isPlay && cw && li<cw.li) ? 0.75:1, cur: on };
  });
}
// A short-lived CSS animation that survives the app's 100ms full re-renders:
// remembers when `val` last changed for `key`, and while the animation is
// still running hands back the same animation with a negative delay, so each
// fresh copy of the element picks up exactly where the last one was.
const _anim = {};
function animStyle(key, val, name, ms){
  const now = Date.now(), a = _anim[key];
  if(!a || a.val!==val){ _anim[key] = { val, at: now }; }
  const el = now - _anim[key].at;
  return el < ms ? `animation:${name} ${ms}ms cubic-bezier(.2,.8,.2,1) both;animation-delay:-${el}ms;` : '';
}
// Marks (handwritten, blue) never cover lyrics or chords:
//  · first word of a line → the mark sits to its LEFT, arrow → the word
//  · last word            → to its RIGHT, arrow ← the word
//  · any word in between  → ABOVE the line, centred on the word, with an
//    arrow down through the chord row (beside the chord symbol, never on it).
const MARR_R = `<svg class="marr-h" width="30" height="14" viewBox="0 0 30 14" aria-hidden="true"><path d="M2 7h24M19 2l7 5-7 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const MARR_L = `<svg class="marr-h" width="30" height="14" viewBox="0 0 30 14" aria-hidden="true"><path d="M28 7H4M11 2L4 7l7 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function markRowHTML(mark, side, lvl, lift){
  const h = lift ? ' style="height:52px"' : '';
  if(!mark || side!=='top') return `<span class="lmark"${h}></span>`;
  return `<span class="lmark"${h}><span class="mk mk-c"${lvl?' style="bottom:29px"':''}><span class="mtext">${esc(mark)}</span></span></span>`;
}
// Left/right marks hang outside the line (absolutely positioned), so they
// never push the lyrics over; fitMarkGutters() makes room for them.
function sideMarkHTML(w){
  const txt = `<span class="mtext">${esc(w.mark)}</span>`;
  return w.markSide==='left'
    ? `<span class="mside-abs l">${txt}${MARR_R}</span>`
    : `<span class="mside-abs r">${MARR_L}${txt}</span>`;
}
function headerLineHTML(l){
  const raw = l.words.map(w=>w.w).join(' ').replace(/^[\[(]\s*/,'').replace(/\s*[\])]$/,'');
  const m = /^([^:]{1,30}):\s*(.+)$/.exec(raw);
  return `<div class="lline lheader"><span class="hl">${esc(m?m[1]:raw)}</span>${m?`<span class="hc">${esc(m[2])}</span>`:''}</div>`;
}
function linesHTML(lines, big){
  return `<div class="lyrics-wrap">` + lines.map(l=>{
    if(l.header) return headerLineHTML(l);
    const style = `margin-top:${l.padTop}px;margin-bottom:${l.mb}px;transform:scale(${l.scale});transform-origin:left center;opacity:${l.op}`;
    const hasTop = l.words.some(w=>w.mark && w.markSide==='top');
    // two marks above neighbouring words would overlap: lift the later one a row
    let lastTop = -9, lastLvl = 1, lift = false;
    l.words.forEach((w,i)=>{ if(w.mark && w.markSide==='top'){ w.lvl = (i-lastTop<=2 && lastLvl===0) ? 1 : 0; if(w.lvl) lift = true; lastTop = i; lastLvl = w.lvl; } });
    const fsz = big ? 'font-size:32px;padding:0 2px' : 'font-size:24px';
    const fszc = big ? 'font-size:15px;font-weight:700' : 'font-size:14px;font-weight:600';
    const words = l.words.map(w=>{
      const act = w.clickAct ? `data-act="${w.clickAct}" data-id="${esc(w.clickId)}"` : '';
      const drop = w.drop ? ` data-drop="${esc(w.drop)}"` : '';
      const bg = w.selected ? 'background:#e5f0fc' : '';
      const chordCls = w.chip ? 'lchord chip' : 'lchord';
      const drag = (w.chip && w.chord) ? ` data-drag-chord="${esc(w.chord)}" data-from="${esc(w.id)}"` : '';
      const side = (w.mark && (w.markSide==='left' || w.markSide==='right')) ? sideMarkHTML(w) : '';
      const topArrow = (w.mark && w.markSide==='top') ? `<span class="marr-v"${w.lvl?' style="margin-top:-31px"':''}></span>` : '';
      const rowCls = topArrow && !w.chord ? 'lchord-row solo' : 'lchord-row';
      return `<span class="lword${w.chip?' editable':''}" style="cursor:${w.cursor};border-radius:5px;${bg}" ${act}${drop}>${hasTop?markRowHTML(w.mark, w.markSide, w.lvl, lift):''}<span class="${rowCls}"><span class="${chordCls}" style="${fszc};color:${w.chordCol};${w.chordAnim||''}"${drag}>${esc(w.chord)}</span>${topArrow}</span><span class="ltext" style="${fsz};font-weight:${w.weight};color:${w.col}">${w.w?esc(w.w):'&nbsp;'}${side}</span></span>`;
    }).join('');
    return `<div class="lline" style="${style}"${l.cur?' data-cur="1"':''}>${words}</div>`;
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
      <div class="row" style="align-self:center;gap:28px;margin-bottom:4px">
        <a class="link" style="font-size:17px;font-weight:700;color:${ST.authMode==='signin'?'#1b1b1b':'#9a9a9a'};text-decoration:${ST.authMode==='signin'?'underline':'none'}" data-act="setAuthMode" data-id="signin">Sign In</a>
        <a class="link" style="font-size:17px;font-weight:700;color:${ST.authMode==='signup'?'#1b1b1b':'#9a9a9a'};text-decoration:${ST.authMode==='signup'?'underline':'none'}" data-act="setAuthMode" data-id="signup">Sign Up</a>
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
  const count = (g.setlist||[]).length;
  const songCount = count+' song'+(count===1?'':'s');
  const sub = g.date ? (g.date+' · '+songCount) : songCount;
  return `<div class="list-row" data-act="openGig" data-id="${g.id}"><div style="min-width:0"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(g.title)}</div><div class="s">${esc(sub)}</div></div>${g.id==='nye'?'<span style="font-size:11px;font-weight:700;letter-spacing:.06em;color:#f24822">LIVE</span>':''}</div>`;
}
function songJob(s){ return ST.jobs.find(j=>j.songId===s.id); }
function songTitle(s){ const j = songJob(s); return s.title || (j && j.label) || 'Untitled song'; }
function jobBarHTML(s){
  const j = songJob(s); if(!j) return '';
  return `<div class="jobbar" style="margin-top:6px;max-width:240px"><div id="jobbar-${j.id}" style="width:${Math.round(j.pct)}%"></div></div><div id="jobnote-${j.id}" style="font-size:11px;color:#8a8a8a;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${esc(j.note||'Waiting…')}</div>`;
}
function songBadge(s){
  if(songJob(s)) return ['IN PROGRESS','#2f8fe0'];
  if(s.needsReview) return ['REVIEW','#2f8fe0'];
  return s.synced ? ['SYNCED','#1b1b1b'] : ['NO TAKE','#b0b0b0'];
}
function songRowHome(s){
  const j = songJob(s);
  return `<div class="list-row" data-act="openSongFrom" data-id="${s.id}" data-from="home" style="border-bottom:1px solid var(--b2)"><div style="min-width:0;flex:1"><div class="t">${esc(songTitle(s))}</div>${j ? jobBarHTML(s) : `<div class="s">${esc(s.sub || (s.synced?'':'Draft'))}</div>`}</div>${(()=>{ const b=songBadge(s); return b[0]==='SYNCED'||b[0]==='NO TAKE' ? '' : `<span style="font-size:11px;font-weight:800;letter-spacing:.05em;color:${b[1]}">${b[0]}</span>`; })()}</div>`;
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
      <button class="icon-btn" title="Account & settings" data-act="openAccount" style="width:48px;height:48px;border-radius:50%;background:#1b1b1b;color:#fff;font-size:20px;font-weight:700">${esc(((ST.nickname || nicknameFromEmail(ST.email))||'?').charAt(0).toUpperCase())}</button>
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
        <div>
          <div class="row" style="justify-content:space-between;margin-bottom:8px"><span style="font-size:26px;font-weight:700">Songs</span><span class="icon-btn" title="Add a song" data-act="newSong">${icon('add',24)}</span></div>
          ${recent || '<div style="padding:14px 0;color:#8a8a8a;font-size:14px">No songs yet — tap + to add one.</div>'}
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
  return `<div class="list-row" data-act="openSongFrom" data-id="${id}" data-from="${from}"><div style="min-width:0;flex:1"><div class="t">${esc(songTitle(s))}</div>${songJob(s) ? jobBarHTML(s) : `<div class="s">${esc(s.sub || (s.synced?'':'Draft'))}</div>`}</div><div class="row" style="gap:12px"><span style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${badgeCol}">${esc(badgeText)}</span>${icon('chevron_right',22)}</div></div>`;
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
    rowsHtml = `<div class="list-row addrow" data-act="listAdd"><div class="t">${icon('add_circle',22)}Add song</div></div>` + rows.map(r=>{ const b=songBadge(r); return songRowList(r.id, b[0], b[1], 'list'); }).join('');
    empty = false;
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
      ${ST.listKind==='songs' ? '' : `<span class="icon-btn" title="${ST.listKind==='playlists'?'New playlist':'New gig'}" data-act="listAdd" style="margin-left:36px">${icon('add',24)}</span>`}
      ${curPl && curPl.mine && !curPl.auto ? `<a class="link" style="margin-left:18px;color:${curPl.isPublic?'#1b1b1b':'#9a9a9a'}" data-act="togglePlaylistPublic" data-id="${esc(curPl.id)}">${curPl.isPublic?'Shared':'Make shared'}</a>` : ''}
      <div style="flex:1"></div>
      ${sortDropdown()}
    </div>
    <div style="overflow:auto">${rowsHtml}${empty?'<div style="padding:24px 0;color:#8a8a8a">Nothing here yet.</div>':''}</div>
  </div>`;
}
