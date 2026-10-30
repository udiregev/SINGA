"use strict";
// Where the song menu was opened from: the plain song viewer, a playlist's
// song viewer (songs down the side) or the live gig player.
function songMenuCtx(){
  if(ST.screen==='gigplayer') return 'gig';
  const pl = ST.listPl ? D.playlists.find(p=>p.id===ST.listPl) : null;
  if(ST.screen==='song' && ST.back==='list' && ST.listKind==='songs' && pl && !pl.auto && pl.mine!==false) return 'playlist';
  return 'song';
}
function renderSongMenu(){
  const s = song(ST.songId);
  const ctx = songMenuCtx();
  const instOpts = INSTS.map(([v,l])=>`<a class="link" style="display:flex;align-items:center;gap:8px;font-weight:${v===ST.instrument?700:500};color:${v===ST.instrument?'#1b1b1b':'#6f6f6f'}" data-act="setInstrumentMenu" data-id="${v}">${icon('check',18)}${l}</a>`).join('');
  const item = (act, label, extra) => `<a class="link" style="font-size:17px;font-weight:700${extra||''}" data-act="${act}">${label}</a>`;
  // the close × sits exactly where the ☰ button was
  const mp = ST.menuPos || { top: 84, right: 24 };
  const mine = s.mine!==false && !ST.viewBy;
  return `<div class="modal-backdrop" style="background:rgba(255,255,255,.92);display:block;padding:0" data-act="toggleMenu">
    <div style="position:fixed;top:${Math.round(mp.top)}px;right:${Math.round(mp.right)}px;display:flex;flex-direction:column;align-items:flex-end;gap:12px;text-align:right" onclick="modalClick(event)">
      <span class="icon-btn" data-act="toggleMenu">${icon('close',28)}</span>
      ${mine ? item('editSong','Edit') : ''}
      <a class="link" style="font-size:17px;font-weight:700;display:flex;align-items:center;gap:4px" data-act="toggleInstMenu">Change instrument</a>
      ${ST.instMenu?`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;margin:-4px 0 4px">${instOpts}</div>`:''}
      ${mine && markCount(s) ? item('removeMarkings','Remove markings') : ''}
      ${ctx==='playlist' ? item('menuRemovePlaylist','Remove song from playlist') : item('menuAddPlaylist','Add song to a playlist')}
      ${ctx==='gig' ? item('menuRemoveGig','Remove song from gig') : item('menuAddGig','Add song to a gig')}
      <a class="link" style="font-size:17px;font-weight:700;margin-top:16px;display:flex;align-items:center;gap:6px" data-act="newSong">Add a new song${icon('add_circle',22)}</a>
      ${mine ? `<a class="link link-accent" style="font-size:17px;font-weight:700;margin-top:16px" data-act="deleteSong">Delete song</a>` : ''}
    </div>
  </div>`;
}

// The song viewer's Play / Stop capsule (Play again carries on from where it
// stopped; scroll the lyrics up to start from an earlier point).
// A song with no synced take can't play: it says so and offers to add one.
function playButtonHTML(playing, act, listening, id){
  const did = id ? ` data-id="${esc(id)}"` : '';
  const counting = ST.vcd>0;
  const label = (playing||counting) ? 'Stop' : (listening ? 'Listening…' : 'Play');
  const paused = act==='viewPlay' && !playing && !counting && !listening && ST.t>0;
  const hint = paused ? 'Scroll the lyrics to start from another point' : (ST.startMode==='countdown' ? '' : (playing||counting ? '' : (listening ? 'Starts the moment you sing — tap to cancel' : 'Starts when you start singing')));
  return `<div class="row" style="gap:12px"><button class="playcap${playing||listening||counting?' live':''}" data-act="${act}"${did}>${label}</button>${hint?`<span style="font-size:12px;color:#8a8a8a">${hint}</span>`:''}</div>`;
}
// Set-speed songs say how fast they'll scroll, next to Play.
function speedHintHTML(s){
  return songMode(s)==='synced' ? '' : `<span style="font-size:12px;color:#8a8a8a;white-space:nowrap">Speed ${speedLabel(songSpeed(s))}</span>`;
}
// Shared by the song viewer, Practice and the gig player.
// Portrait: chord diagram above the lyrics (drag ═ to resize it).
// Landscape: lyrics on the left, the diagram in a column on the right with
// the next chord above it (drag ||| to resize it).
// While playing, the lyrics are a 4-line window (see syncLyricWindow).
function chordScaleV(){ return Math.max(0.6, Math.min(1.8, ST.chordW/260)); }
function lyricsAreaHTML(lines, live, winKey, big, scrollId, left){
  const id = scrollId || 'lyricsScroll', al = left ? ' al-left' : '';
  if(live) return `<div class="lyr-area live${al}"><div id="${id}" class="lyr-win" data-win="${esc(winKey)}">${linesHTML(lines, big)}</div></div>`;
  return `<div class="lyr-area${al}"><div id="${id}" class="lyr-scroll">${linesHTML(lines, big)}</div></div>`;
}
// No chords on this song yet: the diagram's spot offers to add them.
function addChordsHTML(){
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center"><span style="font-size:13px;color:#8a8a8a">No chords yet</span><button class="btn btn-outline btn-sm" data-act="addChords">Add chords</button></div>`;
}
function playerBodyHTML(o){
  // o: { lines, live, winKey, dia, showDia, big, extraDia, scrollId, left, noChords }
  if(isLandscape()){
    return `<div class="land-grid">
      ${lyricsAreaHTML(o.lines, o.live, o.winKey, o.big, o.scrollId, o.left)}
      ${o.noChords ? `<div class="land-dia" style="width:${Math.round(ST.chordW)}px;justify-content:center">${addChordsHTML()}</div>`
      : o.showDia ? `<div id="chordResizeHandleX" class="land-handle" title="Drag to resize">${icon('drag_indicator',22)}</div>
      <div id="chordDiagramBox" class="land-dia" data-fit="${chordScaleV()}" style="width:${Math.round(ST.chordW)}px"><div class="chordInnerScale" style="transform:scale(${chordScaleV()})">${diagramHTML(o.dia, o.dotColor, true)}${o.extraDia||''}</div></div>` : ''}
    </div>`;
  }
  const chordScale = Math.max(0.55, Math.min(1.9, ST.chordH/230));
  return `${o.noChords ? `<div style="height:${Math.round(Math.min(ST.chordH,170))}px;display:flex;align-items:center;justify-content:center;margin-top:8px;flex:none">${addChordsHTML()}</div>`
    : o.showDia ? `<div id="chordDiagramBox" data-fit="${chordScale}" style="height:${Math.round(ST.chordH)}px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-top:8px;flex:none">
        <div class="chordInnerScale" style="display:flex;flex-direction:column;align-items:center;gap:14px;transform:scale(${chordScale})">${diagramHTML(o.dia, o.dotColor)}${o.extraDia||''}</div>
      </div>
      <div id="chordResizeHandle" class="row" style="justify-content:center;cursor:ns-resize;height:30px;touch-action:none;flex:none" title="Drag to resize">${icon('drag_handle',26)}</div>` : ''}
    ${lyricsAreaHTML(o.lines, o.live, o.winKey, o.big, o.scrollId, o.left)}`;
}
// The songs you opened this one from (a playlist, or All Songs), down the
// side — same as the gig player's setlist. Tap one to switch to it.
function listSongIds(){
  const curPl = ST.listPl ? D.playlists.find(p=>p.id===ST.listPl) : null;
  const ids = curPl ? (curPl.auto?D.order:curPl.ids) : D.order;
  let rows = ids.map(id=>({ id, ...song(id) })).filter(r=>r.lyrics && r.lyrics.trim());
  const q = (ST.listQuery||'').trim().toLowerCase();
  if(q) rows = rows.filter(r=>((r.title||'')+' '+(r.sub||'')).toLowerCase().includes(q));
  return { title: curPl ? curPl.title : 'Songs', ids: sortRows(rows).map(r=>r.id) };
}
function songSideHTML(){
  const L = listSongIds();
  const rows = L.ids.map(id=>{
    const x = song(id), cur = id===ST.songId;
    return `<div class="row" style="gap:8px;padding:12px 0;border-bottom:1px solid var(--b2);cursor:pointer;justify-content:space-between" data-act="openSongFrom" data-id="${esc(id)}" data-from="list">
      <div style="min-width:0;flex:1">
        ${cur?`<div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:${ST.playing?'#f24822':'#8a8a8a'};margin-bottom:3px">${ST.playing?'NOW PLAYING':'OPEN'}</div>`:''}
        <div style="font-size:14px;font-weight:${cur?700:400};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.title||'Untitled song')}</div>
        <div style="font-size:11px;color:${cur?'#1b1b1b':'#8a8a8a'};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.sub||'')}</div>
      </div>${cur?icon(ST.playing?'stop':'play_arrow',18):''}</div>`;
  }).join('');
  return `<div class="gigplayer-side">
    <div class="row" style="gap:8px;cursor:pointer" data-act="back" data-to="list">${icon('chevron_left',24)}<span style="font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(L.title)}</span></div>
    <div id="songSideList" style="flex:1;min-height:0;overflow:auto;margin-top:14px">${rows}</div>
  </div>`;
}
function renderSong(){
  const s = song(ST.songId);
  const inst = ST.instrument, hasInst = inst!=='none';
  const seq = chordSeq(s);
  const vtm = timing(s);
  const vLive = ST.playing || ST.t>0;
  let diaChord, diaNext, progress = null;
  if(vLive){ const lc = liveChord(s, vtm, ST.t); diaChord = lc.chord; diaNext = lc.next; progress = lc.progress; }
  else { diaChord = ST.viewChord || (seq[0]&&seq[0].ch); const vi = seq.findIndex(x=>x.ch===diaChord); diaNext = (seq.slice(vi+1).find(x=>x.ch!==diaChord)||seq[0]||{}).ch; }
  const dia = diagram(diaChord, diaNext, inst); dia.progress = progress;
  const withList = ST.back==='list' && ST.listKind==='songs' && !ST.viewBy;
  // in a playlist's viewer the lyrics line up with the title, so a mark on a
  // line's first word goes above it rather than out to the left
  const lines = buildLines(s, vLive?(songMode(s)==='synced'?'play':'scroll'):'view', { t: vLive?ST.t:null, hideChords: !hasInst, leftTop: withList });
  const land = isLandscape();
  const playRow = playButtonHTML(ST.playing,'viewPlay',ST.listening) + speedHintHTML(s);
  const noChords = hasInst && !seq.length && !ST.viewBy && s.mine!==false;
  const head = land ? `<div class="row" style="gap:14px;align-items:flex-start">
      ${withList ? '' : `<span class="icon-btn" style="margin-top:2px" data-act="back" data-to="${esc(ST.back)}">${icon('chevron_left',26)}</span>`}
      <div style="flex:1;min-width:0">
        <div style="font-size:22px;font-weight:700;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.title||'Untitled song')}</div>
        <div style="font-size:13px;color:#6f6f6f;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.sub)}${ST.viewBy?' · added by '+esc(ST.viewBy):''}</div>
        <div class="row" style="gap:14px;margin-top:10px">${playRow}${ST.viewBy?`<button class="btn btn-dark btn-sm" data-act="copySong">Copy to your songs</button>`:''}</div>
      </div>
      <span class="icon-btn" data-act="toggleMenu">${icon('menu',28)}</span>
    </div>` : '';
  const main = `<div class="${withList?'song-main':'scr'}" style="padding-bottom:0">
    ${land ? head : `<div class="row" style="gap:14px;align-items:flex-start">
      ${withList ? '' : `<span class="icon-btn" style="margin-top:4px" data-act="back" data-to="${esc(ST.back)}">${icon('chevron_left',26)}</span>`}
      <div style="flex:1;min-width:0">
        <div style="font-size:${land?24:28}px;font-weight:700;letter-spacing:-0.01em">${esc(s.title||'Untitled song')}</div>
        <div style="font-size:14px;color:#6f6f6f;margin-top:4px">${esc(s.sub)}</div>
        ${ST.viewBy?`<div class="row" style="gap:6px;font-size:13px;margin-top:8px">${icon('account_circle',18)}added by ${esc(ST.viewBy)}</div>`:''}
        <div class="row" style="gap:14px;margin-top:${land?10:14}px">${playRow}${ST.viewBy?`<button class="btn btn-dark btn-sm" data-act="copySong">Copy to your songs</button>`:''}</div>
      </div>
      <span class="icon-btn" data-act="toggleMenu">${icon('menu',28)}</span>
    </div>`}
    ${playerBodyHTML({ lines, live:vLive, winKey:'song-'+s.id, dia, showDia:hasInst, left:withList, noChords })}
  </div>`;
  return `${withList ? `<div class="gigplayer-grid songlist">${songSideHTML()}${main}</div>` : main}
  ${ST.vcd>0?`<div class="modal-backdrop" style="background:rgba(255,255,255,.75);font-size:180px;font-weight:800;animation:none">${Math.max(1,Math.ceil(ST.vcd))}</div>`:''}
  ${ST.menu?renderSongMenu():''}`;
}
/* ============================================================
   SCREEN: Practice Player
   ============================================================ */
function renderPractice(){
  const s = song(ST.songId);
  const tm = timing(s);
  const seq = chordSeq(s);
  const ci = curWord(tm, ST.t);
  const lc = liveChord(s, tm, ST.t);
  const chord = lc.chord, next = lc.next;
  const dia = diagram(chord, next || (seq[0]||{}).ch, ST.instrument); dia.progress = lc.progress;
  const lines = buildLines(s, 'play', { t: ST.t, hideChords: ST.instrument==='none' });
  const progress = tm.total ? Math.min(100, ST.t/tm.total*100) : 0;
  const guideSegs = ['Piano','Strings','Flute','Synth'].map(v=>`<button class="${v===ST.guideInst?'on':''}" style="padding:4px 10px;font-size:12px;border-radius:8px;border:1.5px solid var(--fg)" data-act="setGuideInst" data-id="${v}">${v}</button>`).join('');
  const practiceNote = s.synced ? 'Playing along with your recorded take. Guide melody is generated from your pitch-corrected vocal.' : 'Not recorded yet — timing is estimated. Record a take on the Sync step for word-level sync.';
  return `<div class="scr" style="padding-bottom:30px">
    <div class="row" style="gap:14px;align-items:flex-start">
      <span class="icon-btn" style="margin-top:18px" data-act="exitPractice">${icon('chevron_left',26)}</span>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#f24822">PRACTICE</div>
        <div style="font-size:28px;font-weight:700;margin-top:4px">${esc(s.title||'Untitled song')}</div>
        <div style="font-size:14px;color:#6f6f6f;margin-top:4px">${esc(s.sub)}</div>
      </div>
    </div>
    ${isLandscape()
      ? playerBodyHTML({ lines, live:true, winKey:'practice-'+s.id, dia, showDia:ST.instrument!=='none', big:true, dotColor:'#f24822' })
      : `${ST.instrument!=='none' ? `<div data-fit="1" style="margin-top:24px;height:190px;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden"><div class="chordInnerScale" style="display:flex;justify-content:center">${diagramHTML(dia,'#f24822')}</div></div>` : ''}
    ${lyricsAreaHTML(lines, true, 'practice-'+s.id, true)}`}
    <div style="border-top:1px solid #ececec;padding-top:22px;display:flex;flex-direction:column;gap:18px">
      <div style="height:22px;display:flex;align-items:center;cursor:pointer" data-act="seek"><div style="flex:1;height:6px;border-radius:3px;background:#e6e6e6;position:relative"><div style="position:absolute;left:0;top:0;bottom:0;width:${progress}%;background:#1b1b1b;border-radius:3px"></div></div></div>
      <div class="row" style="gap:16px">
        <button class="icon-btn" style="width:48px;height:48px;border-radius:50%;border:1.5px solid var(--fg)" data-act="restart">${icon('replay',24)}</button>
        <button class="icon-btn" style="width:64px;height:64px;border-radius:50%;background:#1b1b1b;color:#fff" data-act="togglePlay">${icon(ST.playing?'pause':'play_arrow',34)}</button>
        <div style="font-size:14px;color:#6f6f6f;font-variant-numeric:tabular-nums">${fmtTime(ST.t)} / ${fmtTime(tm.total)}</div>
        <div style="flex:1"></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div class="row" style="gap:10px;cursor:pointer" data-act="toggleGuide">
            <span style="font-size:14px;font-weight:600">Guide melody</span>
            <div class="toggle" style="background:${ST.guide?'#1b1b1b':'#fff'}"><div class="dot" style="left:${ST.guide?20:2}px;background:${ST.guide?'#fff':'#1b1b1b'}"></div></div>
          </div>
          <div class="row" style="gap:4px;opacity:${ST.guide?1:0.35}">${guideSegs}</div>
        </div>
      </div>
      <div style="font-size:12px;color:#9a9a9a">${practiceNote}</div>
    </div>
  </div>`;
}
/* ============================================================
   SCREENS: Gig / Gig Photos / Gig Edit / Gig Player
   ============================================================ */
function gigSettings(g){ return { photos:true, chat:true, dm:false, order:false, requests:true, browse:true, ...(g.settings||{}) }; }

function gigMenuItems(){
  return [
    ['add','Add songs','gigAddSongs'],
    ['edit','Edit setlist','gigEditOpen'],
    ['image','Photos','gigPhotosOpen'],
    ['forum','Messages','gigMessagesOpen'],
    ['person_add','Collaborators','gigAddCollab'],
    ['share','Share link','gigShare'],
    ['qr_code_2','QR code','openQr'],
    ['settings','Settings','openGigSettings']
  ];
}
function renderGig(){
  const g = gigObj();
  const setRows = g.setlist.map((id,i)=>{
    const s = song(id);
    return `<div class="list-row has-act" data-act="openGigSong" data-id="${id}"><div><div class="t">${esc(s.title||'Untitled song')}</div><div class="s">${esc(s.sub)}</div></div><div class="row" style="gap:10px">${g.mine!==false ? rowActHTML('gigremove', id) : ''}${icon('chevron_right',22)}</div></div>`;
  }).join('');
  const collapsed = ST.gigMenuCollapsed;
  const live = ST._liveGig===g.id;
  const items = gigMenuItems().map(([ic,label,act])=>`<a class="gigmenu-item" data-act="${act}" title="${label}">${icon(ic,24)}<span class="lbl">${label}</span></a>`).join('');
  return `<div class="scr gig-layout">
    <div class="gigmenu-backdrop ${ST.gigMenuOpen?'open':''}" data-act="toggleGigMenu"></div>
    <aside class="gigmenu ${collapsed?'collapsed':''} ${ST.gigMenuOpen?'open':''}">
      <button class="gigmenu-item gigmenu-toggle" data-act="toggleGigMenu" title="${collapsed?'Expand menu':'Collapse menu'}">${icon(collapsed?'menu_open':'menu',24)}<span class="lbl">Gig menu</span></button>
      ${items}
    </aside>
    <div class="gig-main">
      <div class="row" style="gap:14px;align-items:flex-start">
        <span class="icon-btn" style="margin-top:4px" data-act="nav" data-to="home">${icon('chevron_left',26)}</span>
        <div style="flex:1;min-width:0"><div style="font-size:30px;font-weight:700;line-height:1.25;display:flex;align-items:center;gap:10px;flex-wrap:wrap">${esc(g.title)}${live?'<span style="background:#f24822;color:#fff;font-size:11px;font-weight:800;letter-spacing:.08em;padding:3px 7px;border-radius:4px">LIVE</span>':''}</div><div style="font-size:14px;color:#6f6f6f;margin-top:6px">${esc(g.date)}${g.date?' · ':''}${g.setlist.length} song${g.setlist.length===1?'':'s'}</div></div>
        <button class="icon-btn gigmenu-mobilebtn" title="Gig menu" data-act="toggleGigMenu">${icon('more_vert',26)}</button>
      </div>
      <div class="row" style="gap:10px;margin:18px 0 6px 40px;flex-wrap:wrap">
        ${live
          ? `<button class="btn btn-dark btn-sm" style="display:flex;align-items:center;gap:8px" data-act="endGig">${icon('stop_circle',20)}End gig</button>`
          : `<button class="btn btn-accent btn-sm" style="display:flex;align-items:center;gap:8px" data-act="goLive">${icon('rocket_launch',20)}Go live</button>`}
        <button class="btn btn-outline btn-sm" style="display:flex;align-items:center;gap:6px" data-act="gigAddSongs">${icon('add',20)}Add songs</button>
      </div>
      <div style="margin-top:10px;padding-left:40px">${setRows || '<div style="padding:20px 0;color:#8a8a8a">No songs yet — add some to get started.</div>'}</div>
    </div>
  </div>
  ${ST.qrOpen?`<div class="modal-backdrop" data-act="closeQr"><div class="modal" style="align-items:center;text-align:center;max-width:380px" onclick="modalClick(event)">
    ${qrHTML()}
    <div style="font-size:13px;font-weight:600;word-break:break-all">${esc(audienceUrl(g.id))}</div>
    <div style="font-size:13px;color:#6f6f6f;text-align:center">Guests scan to follow the lyrics in sync, karaoke-style. No app or sign-in needed.</div>
  </div></div>`:''}`;
}

function renderGigPhotos(){
  const g = gigObj();
  return `<div class="scr" style="gap:28px">
    <div class="row" style="align-items:flex-end;gap:14px">
      <span class="icon-btn" style="margin-bottom:6px" data-act="nav" data-to="gig">${icon('chevron_left',26)}</span>
      <div style="flex:1"><div style="font-size:13px;font-weight:700">Photos</div><div style="font-size:26px;font-weight:700;line-height:1.25;max-width:420px">${esc(g.title)}</div></div>
      <span class="icon-btn" data-act="addPhoto">${icon('photo_camera',30)}</span>
      <span class="icon-btn" data-act="addPhoto">${icon('upload',30)}</span>
    </div>
    <div class="photogrid">${D.photos.slice().reverse().map(p=>`<div class="phototile" style="grid-column:span ${p.span}"><span>photo · ${esc(p.by)}</span></div>`).join('')}</div>
  </div>`;
}

// DMs guests send via the Audience Guest Site's "Band" chat button —
// see loadGigThreads/sendGigDM in singa-script-part1.js and
// gig_chat_messages in supabase-schema.sql. Master/detail: a thread
// list, or (ST.gigMsgThread set) one thread's messages + a reply box.
function renderGigMessages(){
  const g = gigObj();
  const thread = ST.gigThreads.find(t=>t.guestId===ST.gigMsgThread);
  if(!thread){
    const rows = ST.gigThreads.map(t=>{
      const last = t.messages[t.messages.length-1];
      return `<div class="list-row" data-act="openGigThread" data-id="${esc(t.guestId)}"><div><div class="t">${esc(t.name||'Guest')}</div><div class="s">${esc(last.text)}</div></div>${icon('chevron_right',22)}</div>`;
    }).join('');
    return `<div class="scr" style="gap:24px">
      <div class="row" style="align-items:flex-end;gap:14px">
        <span class="icon-btn" style="margin-bottom:6px" data-act="nav" data-to="gig">${icon('chevron_left',26)}</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:700">Messages</div><div style="font-size:26px;font-weight:700;line-height:1.25;max-width:420px">${esc(g.title)}</div></div>
      </div>
      <div>${ST.gigMsgLoading ? `<div style="color:#8a8a8a">Loading…</div>` : (rows || `<div style="color:#8a8a8a">No direct messages yet — guests can message you privately from the Chat tab on the Audience Guest Site.</div>`)}</div>
    </div>`;
  }
  const msgs = thread.messages.map(m=>{
    const mine = m.is_owner;
    return `<div class="row" style="justify-content:${mine?'flex-end':'flex-start'}"><div style="max-width:78%;padding:10px 14px;border-radius:14px;background:${mine?'#1b1b1b':'#f0f0f0'};color:${mine?'#fff':'#1b1b1b'};font-size:15px">${esc(m.text)}</div></div>`;
  }).join('');
  return `<div class="scr" style="gap:16px">
    <div class="row" style="align-items:center;gap:14px">
      <span class="icon-btn" data-act="closeGigThread">${icon('chevron_left',26)}</span>
      <div style="font-size:19px;font-weight:700">${esc(thread.name||'Guest')}</div>
    </div>
    <div style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:10px" id="gigMsgScroll">${msgs}</div>
    <div class="row" style="gap:8px">
      <div class="search-field" style="flex:1"><input placeholder="Reply…" value="${esc(ST.gigMsgDraft)}" data-bind="gigMsgDraft" data-key="sendGigReply"></div>
      <button class="icon-btn" style="width:46px;height:46px;border-radius:50%;background:#1b1b1b;color:#fff" data-act="sendGigReply">${icon('arrow_upward',22)}</button>
    </div>
  </div>`;
}

function renderGigEdit(){
  const g = gigObj();
  const list = ST.editList || g.setlist;
  const rows = list.map((id,i)=>{
    const s = song(id);
    return `<div class="row" style="gap:12px;padding:14px 0;border-bottom:1px solid var(--b2)">
      ${icon('drag_indicator',20)}
      <div style="flex:1"><div style="font-size:16px;font-weight:600">${esc(s.title||'Untitled song')}</div><div style="font-size:13px;color:#8a8a8a;margin-top:3px">${esc(s.sub)}</div></div>
      <span class="icon-btn" ${i===0?'style="opacity:.3"':''} data-act="editRowUp" data-id="${i}">${icon('arrow_upward',20)}</span>
      <span class="icon-btn" data-act="editRowRemove" data-id="${i}">${icon('close',22)}</span>
    </div>`;
  }).join('');
  return `<div class="scr" style="gap:24px">
    <div class="row" style="align-items:flex-end;gap:14px">
      <span class="icon-btn" style="margin-bottom:6px" data-act="nav" data-to="gig">${icon('chevron_left',26)}</span>
      <div style="flex:1"><div style="font-size:13px;font-weight:700">Edit</div><div style="font-size:26px;font-weight:700;line-height:1.25;max-width:420px">${esc(g.title)}</div></div>
      <a class="link" style="text-decoration:underline;margin-bottom:8px" data-act="saveGigEdit">Save</a>
    </div>
    <div style="max-width:460px">
      <div class="row" style="justify-content:space-between;padding:14px 0;cursor:pointer" data-act="gigEditAddSongs"><span style="font-size:15px;font-weight:700">Add a song</span>${icon('add',22)}</div>
      ${rows}
    </div>
  </div>`;
}
