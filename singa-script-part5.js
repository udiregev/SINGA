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
      <a class="link" style="font-size:17px;font-weight:700" data-act="menuAddGig">Add to a gig</a>
      <a class="link" style="font-size:17px;font-weight:700" data-act="nav" data-to="account">Full settings</a>
      <a class="link" style="font-size:17px;font-weight:700;margin-top:16px;display:flex;align-items:center;gap:6px" data-act="newSong">Add a new song${icon('add_circle',22)}</a>
      <a class="link link-accent" style="font-size:17px;font-weight:700;margin-top:16px" data-act="deleteSong">Delete song</a>
    </div>
  </div>`;
}

function renderSong(){
  const s = song(ST.songId);
  const inst = ST.instrument, hasInst = inst!=='none';
  const seq = chordSeq(s);
  const vtm = timing(s);
  const vLive = ST.playing || ST.t>0;
  const vci = curWord(vtm, ST.t);
  let diaChord, diaNext;
  if(vLive){ diaChord = chordAt(s,vtm,Math.max(vci,0)) || (seq[0]||{}).ch; diaNext = (seq.find(x=>x.k>vci && x.ch!==diaChord)||{}).ch; }
  else { diaChord = ST.viewChord || (seq[0]&&seq[0].ch); const vi = seq.findIndex(x=>x.ch===diaChord); diaNext = seq[vi+1] ? seq[vi+1].ch : (seq[0]&&seq[0].ch); }
  const dia = diagram(diaChord, diaNext, inst);
  const lines = buildLines(s, vLive?'play':'view', { t: vLive?ST.t:null, selChord: diaChord, hideChords: !hasInst });
  const vPlaying = ST.playing;
  const chordScale = Math.max(0.55, Math.min(1.9, ST.chordH/230));
  return `<div class="scr" style="padding-bottom:0">
    <div class="row" style="gap:14px;align-items:flex-start">
      <span class="icon-btn" style="margin-top:4px" data-act="back" data-to="${esc(ST.back)}">${icon('chevron_left',26)}</span>
      <div style="flex:1">
        <div style="font-size:28px;font-weight:700;letter-spacing:-0.01em">${esc(s.title||'Untitled song')}</div>
        <div style="font-size:14px;color:#6f6f6f;margin-top:4px">${esc(s.sub)}</div>
        ${ST.viewBy?`<div class="row" style="gap:6px;font-size:13px;margin-top:8px">${icon('account_circle',18)}added by ${esc(ST.viewBy)}</div>`:''}
      </div>
      <span class="icon-btn" data-act="toggleMenu">${icon('menu',28)}</span>
    </div>
    ${ST.viewBy?`<button class="btn btn-dark btn-sm" style="align-self:flex-start;margin:18px 0 0 40px" data-act="copySong">Copy to your playlist</button>`:''}
    ${hasInst?`<div id="chordDiagramBox" style="height:${Math.round(ST.chordH)}px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-top:8px">
        <div class="chordInnerScale" style="display:flex;flex-direction:column;align-items:center;gap:14px;transform:scale(${chordScale})">
          ${diagramHTML(dia)}
          <button class="link" style="display:flex;align-items:center;gap:6px" data-act="playSample">${icon(ST.sampling?'stop_circle':'play_circle',22)}${ST.sampling?'Stop sample · '+Math.ceil(ST.sampleLeft)+'s':'Play Sample'}</button>
        </div>
      </div>
      <div id="chordResizeHandle" class="row" style="justify-content:center;cursor:ns-resize;height:30px;touch-action:none" title="Drag to resize">${icon('drag_handle',26)}</div>`:''}
    <div style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;align-items:center;padding:20px 0 40%" id="lyricsScroll">
      ${linesHTML(lines)}
    </div>
    <div style="flex:none;min-height:92px;display:flex;align-items:center;justify-content:center;padding:10px 0">
      ${ST.startMode==='countdown'
        ? `<button class="icon-btn" title="Play" style="width:68px;height:68px;border-radius:50%;background:#1b1b1b;color:#fff" data-act="viewPlay">${icon(vPlaying?'pause':'play_arrow',38)}</button>`
        : `<div class="row" style="gap:12px;cursor:pointer;max-width:520px" data-act="viewPlay">${icon('mic',30)}<div><div style="font-size:16px;font-weight:600">${vPlaying?'Following your voice':(ST.listening?"Listening… playback starts the moment you sing":'Tap to start listening')}</div><div style="font-size:12px;color:#8a8a8a;margin-top:3px">${vPlaying?'Tap to pause':(ST.listening?'Tap to cancel':'Uses your mic to detect when you start singing')}</div></div></div>`}
    </div>
  </div>
  ${ST.vcd>0?`<div class="modal-backdrop" style="background:rgba(255,255,255,.75);font-size:180px;font-weight:800">${Math.max(1,Math.ceil(ST.vcd))}</div>`:''}
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
  const chord = chordAt(s,tm,Math.max(ci,0)) || (seq[0]||{}).ch;
  const next = (seq.find(x=>x.k>ci && x.ch!==chord)||{}).ch;
  const dia = diagram(chord, next || (seq[0]||{}).ch, ST.instrument);
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

function renderGig(){
  const g = gigObj();
  const setRows = g.setlist.map((id,i)=>{
    const s = song(id);
    return `<div class="list-row" data-act="openGigSong" data-id="${id}"><div><div class="t">${esc(s.title||'Untitled song')}</div><div class="s">${esc(s.sub)}</div></div><div class="row" style="gap:10px"><span style="font-size:11px;font-weight:700;letter-spacing:.05em;color:${s.synced?'#1b1b1b':'#b0b0b0'}">${s.synced?'SYNCED':'NO TAKE'}</span>${icon('chevron_right',22)}</div></div>`;
  }).join('');
  const rail = [
    ['add','Add songs','gigAddSongs',true],
    ['edit','Edit','gigEditOpen'],
    ['image','Photos','gigPhotosOpen'],
    ['person_add','Add Collaborator','gigAddCollab'],
    ['settings','Settings','openGigSettings'],
    ['share','Share','gigShare'],
    ['qr_code_2','QR Code','openQr']
  ];
  const railHTML = rail.map(([ic,label,act,big])=>{
    if(big) return `<div class="row" style="flex-direction:column;gap:6px;cursor:pointer" data-act="${act}"><div style="width:40px;height:40px;border-radius:50%;background:#1b1b1b;color:#fff;display:flex;align-items:center;justify-content:center">${icon(ic,24)}</div><span style="font-size:13px;font-weight:600">${label}</span></div>`;
    return `<div class="row" style="flex-direction:column;gap:6px;cursor:pointer" data-act="${act}">${icon(ic,28)}<span style="font-size:13px;color:#444">${label}</span></div>`;
  }).join('');
  return `<div class="scr">
    <div class="gig-grid">
      <div style="display:flex;flex-direction:column;gap:22px">
        <div class="search-field" style="max-width:340px;color:#8a8a8a"><span style="flex:1">Search this gig</span>${icon('search',22)}</div>
        <div class="row" style="gap:14px;align-items:flex-start;margin-top:10px">
          <span class="icon-btn" style="margin-top:4px" data-act="nav" data-to="home">${icon('chevron_left',26)}</span>
          <div><div style="font-size:30px;font-weight:700;line-height:1.25">${esc(g.title)}</div><div style="font-size:14px;color:#6f6f6f;margin-top:6px">${esc(g.date)} · ${g.setlist.length} songs${g.mine?` · <a class="link" style="color:${g.isPublic?'#1b1b1b':'#9a9a9a'}" data-act="toggleGigPublic">${g.isPublic?'Shared':'Make shared'}</a>`:''}</div></div>
        </div>
        <div>${setRows}</div>
      </div>
      <div class="gig-rail">${railHTML}</div>
    </div>
    <div style="position:fixed;left:0;right:0;bottom:40px;display:flex;justify-content:center;pointer-events:none">
      <button class="icon-btn" title="Start gig player" style="pointer-events:auto;width:68px;height:68px;border-radius:50%;background:#1b1b1b;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.2)" data-act="goLive">${icon('play_arrow',38)}</button>
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
      <div class="row" style="justify-content:space-between;padding:14px 0;cursor:pointer" data-act="addToSetlist"><span style="font-size:15px;font-weight:700">Add a song</span>${icon('add',22)}</div>
      ${rows}
    </div>
  </div>`;
}
