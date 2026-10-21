"use strict";
function renderSongMenu(){
  const s = song(ST.songId);
  const instOpts = INSTS.map(([v,l])=>`<a class="link" style="display:flex;align-items:center;gap:8px;font-weight:${v===ST.instrument?700:500};color:${v===ST.instrument?'#1b1b1b':'#6f6f6f'}" data-act="setInstrumentMenu" data-id="${v}">${icon('check',18)}${l}</a>`).join('');
  return `<div class="modal-backdrop" style="background:rgba(255,255,255,.9);align-items:flex-start;justify-content:flex-end;padding:20px 64px 0" data-act="toggleMenu">
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:12px;text-align:right" onclick="modalClick(event)">
      <span class="icon-btn" data-act="toggleMenu">${icon('close',28)}</span>
      <a class="link" style="font-size:17px;font-weight:700" data-act="editSong">Edit</a>
      <a class="link" style="font-size:17px;font-weight:700;display:flex;align-items:center;gap:4px" data-act="toggleInstMenu">Change instrument${icon(ST.instMenu?'expand_less':'expand_more',20)}</a>
      ${ST.instMenu?`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;margin:-4px 0 4px">${instOpts}</div>`:''}
      ${Object.keys(s.notes||{}).length ? `<a class="link" style="font-size:17px;font-weight:700" data-act="removeMarkings">Remove markings</a>` : ''}
      <a class="link" style="font-size:17px;font-weight:700" data-act="menuAddGig">Add to a gig</a>
      <a class="link" style="font-size:17px;font-weight:700" data-act="openAccount">Full settings</a>
      <a class="link" style="font-size:17px;font-weight:700;margin-top:16px;display:flex;align-items:center;gap:6px" data-act="newSong">Add a new song${icon('add_circle',22)}</a>
      <a class="link link-accent" style="font-size:17px;font-weight:700;margin-top:16px" data-act="deleteSong">Delete song</a>
    </div>
  </div>`;
}

function playButtonHTML(playing, act, listening){
  if(ST.startMode==='countdown')
    return `<button class="icon-btn playbtn" title="${playing?'Pause':'Start'}" data-act="${act}">${icon(playing?'pause':'play_arrow',34)}</button>`;
  return `<div class="row" style="gap:10px;cursor:pointer;max-width:460px" data-act="${act}"><span class="icon-btn playbtn" style="background:${listening||playing?'#f24822':'#1b1b1b'}">${icon(playing?'pause':'mic',28)}</span><div><div style="font-size:15px;font-weight:600">${playing?'Following your voice':(listening?'Listening… starts the moment you sing':'Start')}</div><div style="font-size:12px;color:#8a8a8a;margin-top:2px">${playing?'Tap to pause':(listening?'Tap to cancel':'Starts when you start singing')}</div></div></div>`;
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
  const lines = buildLines(s, vLive?'play':'view', { t: vLive?ST.t:null, hideChords: !hasInst });
  const chordScale = Math.max(0.55, Math.min(1.9, ST.chordH/230));
  return `<div class="scr" style="padding-bottom:0">
    <div class="row" style="gap:14px;align-items:flex-start">
      <span class="icon-btn" style="margin-top:4px" data-act="back" data-to="${esc(ST.back)}">${icon('chevron_left',26)}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:28px;font-weight:700;letter-spacing:-0.01em">${esc(s.title||'Untitled song')}</div>
        <div style="font-size:14px;color:#6f6f6f;margin-top:4px">${esc(s.sub)}</div>
        ${ST.viewBy?`<div class="row" style="gap:6px;font-size:13px;margin-top:8px">${icon('account_circle',18)}added by ${esc(ST.viewBy)}</div>`:''}
        <div class="row" style="gap:14px;margin-top:14px">${playButtonHTML(ST.playing,'viewPlay',ST.listening)}${ST.viewBy?`<button class="btn btn-dark btn-sm" data-act="copySong">Copy to your songs</button>`:''}</div>
      </div>
      <span class="icon-btn" data-act="toggleMenu">${icon('menu',28)}</span>
    </div>
    ${hasInst?`<div id="chordDiagramBox" style="height:${Math.round(ST.chordH)}px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-top:8px;flex:none">
        <div class="chordInnerScale" style="display:flex;flex-direction:column;align-items:center;gap:14px;transform:scale(${chordScale})">
          ${diagramHTML(dia)}
        </div>
      </div>
      <div id="chordResizeHandle" class="row" style="justify-content:center;cursor:ns-resize;height:30px;touch-action:none;flex:none" title="Drag to resize">${icon('drag_handle',26)}</div>`:''}
    <div style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;align-items:center;padding:20px 0 40%" id="lyricsScroll">
      ${linesHTML(lines)}
    </div>
  </div>
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
    ${ST.instrument!=='none' ? `<div style="margin-top:30px;min-height:140px">${diagramHTML(dia,'#f24822')}</div>` : ''}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center">
      ${linesHTML(lines, true)}
    </div>
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
    return `<div class="list-row" data-act="openGigSong" data-id="${id}"><div><div class="t">${esc(s.title||'Untitled song')}</div><div class="s">${esc(s.sub)}</div></div><div class="row" style="gap:10px"><span style="font-size:11px;font-weight:700;letter-spacing:.05em;color:${s.synced?'#1b1b1b':'#b0b0b0'}">${s.synced?'SYNCED':'NO TAKE'}</span>${icon('chevron_right',22)}</div></div>`;
  }).join('');
  const collapsed = ST.gigMenuCollapsed;
  const items = gigMenuItems().map(([ic,label,act])=>`<a class="gigmenu-item" data-act="${act}" title="${label}">${icon(ic,24)}<span class="lbl">${label}</span></a>`).join('');
  return `<div class="scr gig-layout">
    <div class="gigmenu-backdrop ${ST.gigMenuOpen?'open':''}" data-act="toggleGigMenu"></div>
    <aside class="gigmenu ${collapsed?'collapsed':''} ${ST.gigMenuOpen?'open':''}">
      <button class="gigmenu-item gigmenu-toggle" data-act="toggleGigMenu" title="${collapsed?'Expand menu':'Collapse menu'}">${icon(collapsed?'menu_open':'menu',24)}<span class="lbl">Gig menu</span></button>
      ${items}
    </aside>
    <div class="gig-main">
      <div class="row" style="gap:12px;align-items:flex-start">
        <span class="icon-btn" style="margin-top:4px" data-act="nav" data-to="home">${icon('chevron_left',26)}</span>
        <div style="flex:1;min-width:0"><div style="font-size:30px;font-weight:700;line-height:1.25">${esc(g.title)}</div><div style="font-size:14px;color:#6f6f6f;margin-top:6px">${esc(g.date)}${g.date?' · ':''}${g.setlist.length} song${g.setlist.length===1?'':'s'}</div></div>
        <button class="icon-btn gigmenu-mobilebtn" title="Gig menu" data-act="toggleGigMenu">${icon('more_vert',26)}</button>
      </div>
      <div class="row" style="gap:10px;margin:18px 0 6px 40px;flex-wrap:wrap">
        <button class="btn btn-accent btn-sm" style="display:flex;align-items:center;gap:8px" data-act="goLive">${icon('rocket_launch',20)}Go live</button>
        <button class="btn btn-outline btn-sm" style="display:flex;align-items:center;gap:6px" data-act="gigAddSongs">${icon('add',20)}Add songs</button>
      </div>
      <div style="margin-top:10px">${setRows || '<div style="padding:20px 0;color:#8a8a8a">No songs yet — add some to get started.</div>'}</div>
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
