"use strict";
function renderNoteEditor(d){
  if(ST.selWord==null) return '';
  const [li, wi] = ST.selWord.split('-').map(Number);
  const ws = parseLyrics(d.lyrics)[li] || [];
  const w = ws[wi] || '';
  const placement = wi===0 ? 'Shown before the line' : (wi===ws.length-1 ? 'Shown after the line' : 'Shown above the word, with an arrow');
  return `<div style="margin-top:28px;width:100%;max-width:440px;border:1.5px solid #2f8fe0;border-radius:12px;background:#f3f8ff;padding:16px;display:flex;flex-direction:column;gap:12px">
    <div style="font-size:13px;font-weight:600;color:#2f8fe0">Mark on "${esc(w)}"</div>
    <input class="ipt" style="height:44px;border:1px solid #cfe0f5;font-family:Caveat,cursive;font-size:24px;color:#2f8fe0;background:#fff" placeholder="e.g. Hi note, breathe, key change" value="${esc(ST.noteDraft)}" data-bind="noteDraft">
    <div class="row" style="gap:8px">
      <span style="font-size:12px;color:#6f6f6f">${placement}</span>
      <div style="flex:1"></div>
      <a class="link link-accent" data-act="removeNote">Remove</a>
      <button class="btn btn-dark btn-sm" data-act="saveNote">Save</button>
    </div>
  </div>`;
}

function renderSongBody(d){
  const editMode = ST.step==='chords' ? 'chords' : ST.step==='markings' ? 'markings' : 'static';
  const lines = buildLines(d, editMode, ST.phase==='recording' ? {t:ST.recT} : null);
  const opacity = (ST.phase==='countdown'||ST.phase==='processing') ? 0.12 : 1;
  return `<div style="width:100%;flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;margin-top:24px;position:relative">
    <div style="opacity:${opacity};display:flex;flex-direction:column;align-items:center;width:100%;overflow:auto;padding-bottom:16px">
      <div style="font-size:40px;font-weight:800;letter-spacing:-0.02em;text-align:center">${esc(d.title||'Untitled song')}</div>
      <div style="font-size:15px;color:#6f6f6f;margin-top:6px">${esc(d.sub)}</div>
      ${ST.step==='chords' ? renderChordWheel() : ''}
      ${ST.step==='markings' ? `<div style="font-size:13px;color:#6f6f6f;margin-top:26px">Tap a word to add a mark. Marks on the first or last word sit beside the line; others point at the word.</div>` : ''}
      <div style="margin-top:34px">${linesHTML(lines)}</div>
    </div>
    ${ST.step==='markings' ? renderNoteEditor(d) : ''}
    ${ST.phase==='countdown' ? `<div style="position:absolute;top:60px;left:0;right:0">${countdownBlock()}</div>` : ''}
    ${ST.phase==='processing' ? `<div style="position:absolute;top:60px;left:0;right:0">${processingBlock()}</div>` : ''}
    ${(ST.step==='chords'||ST.step==='markings') ? `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:12px;border-top:1px solid #f0f0f0;width:100%;margin-top:20px">
        <div style="font-size:12px;color:#8a8a8a">You hereby confirm that you have permission to reproduce these lyrics</div>
        <button class="btn btn-dark" style="width:170px" data-act="createNextStep">Next</button>
        <a class="link" style="color:#9a9a9a" data-act="createNextStep">Skip</a>
      </div>` : ''}
    ${ST.step==='sync' && ST.phase==='idle' ? `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;max-width:340px;margin:0 auto">
        ${ST.autoChords?`<div style="font-size:13px;color:#2f8fe0;text-align:center;margin-bottom:6px">Chords will be detected from the instruments in your recording.</div>`:''}
        <button class="btn btn-grey" style="width:100%" data-act="practiceDraft">Practice</button>
        <button class="btn btn-accent" style="width:100%" data-act="startRecord">Record</button>
        <a class="link" style="text-decoration:underline;margin-top:4px" data-act="startUpload">Upload</a>
        <div style="font-size:12px;color:#8a8a8a;text-align:center">Sing and play it once. Singa isolates your vocal, aligns every word and detects the chords.</div>
      </div>` : ''}
    ${ST.step==='sync' && (ST.phase==='countdown'||ST.phase==='recording') ? waveformBlock() : ''}
  </div>`;
}

function renderSimilarModal(){
  const rows = [
    {title:"Don't Go Breaking My Heart", sub:'Dolly Parton', by:'joesnow'},
    {title:"Don't Go Breaking My Heart", sub:'Dolly Parton & Rick Stein', by:'allhands232'}
  ];
  return `<div class="modal-backdrop" data-act="closeSimilar" style="align-items:flex-start;padding-top:140px">
    <div class="modal" style="max-width:420px" onclick="event.stopPropagation()">
      <div class="mhead"><span style="font-size:15px;font-weight:700">Similar titles</span><span class="icon-btn" data-act="closeSimilar">${icon('close',22)}</span></div>
      <div class="msub">Already on Singa. Copy one instead of starting from scratch.</div>
      ${rows.map((r,i)=>`<div class="list-row" style="padding:12px 14px;border:1px solid #ececec;border-radius:10px" data-act="useSimilar" data-id="${i}"><div><div style="font-size:15px;font-weight:600">${esc(r.title)}</div><div style="font-size:12px;color:#8a8a8a;margin-top:2px">${esc(r.sub)} · added by ${esc(r.by)}</div></div>${icon('chevron_right',22)}</div>`).join('')}
      <button class="btn btn-dark" style="margin-top:8px" data-act="closeSimilar">Keep creating my own</button>
    </div>
  </div>`;
}

function renderCreate(){
  const d = D.songs[ST.editId] || { id:'x', title:'', sub:'', lyrics:'', chords:{}, notes:{} };
  const phaseIdle = ST.phase==='idle';
  const modeLocked = !phaseIdle || (ST.createMode==='manual' && ST.step!=='lyrics');
  const modes = [['manual','Manual'],['recording','From Recording'],['file','From File']];
  const modeSeg = `<div class="seg" style="opacity:${modeLocked?0.4:1};border-color:${modeLocked?'#bdbdbd':'#1b1b1b'}">
    ${modes.map(([v,l])=>`<button class="${v===ST.createMode?'on':''}" ${modeLocked?'':`data-act="setCreateMode" data-id="${v}"`}>${l}</button>`).join('')}
  </div>`;
  const hasLyrics = !!d.lyrics.trim();
  const stepTabs = ['lyrics','chords','markings','sync'];
  const isManual = ST.createMode==='manual';
  const stepTabsHTML = isManual ? `<div style="display:flex;border-bottom:1.5px solid #e2e2e2">
    ${stepTabs.map(k=>`<button style="border:0;background:transparent;width:104px;height:42px;font-size:15px;font-weight:${k===ST.step?700:500};color:${k===ST.step?'#1b1b1b':(hasLyrics||k==='lyrics'?'#8a8a8a':'#c8c8c8')};border-bottom:2.5px solid ${k===ST.step?'#1b1b1b':'transparent'};margin-bottom:-1.5px" data-act="goCreateStep" data-id="${k}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}
  </div>` : '';

  let body = '';
  if(isManual && ST.step==='lyrics'){
    body = renderManualLyrics(d);
  } else if(isManual){
    body = renderSongBody(d);
  } else if(ST.createMode==='recording'){
    if(phaseIdle){
      body = `<div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:28px;margin-top:40px;max-width:420px;margin-left:auto;margin-right:auto">
        <input class="ipt" placeholder="Song title" value="${esc(d.title)}" data-bind="draftTitle">
        <div class="row" style="gap:22px;margin-top:40px">
          <button class="btn btn-accent" style="width:150px" data-act="startRecord">Record</button>
          <a class="link" style="text-decoration:underline" data-act="startUpload">Upload</a>
        </div>
        <div style="font-size:13px;color:#6f6f6f;text-align:center;max-width:420px;line-height:1.5">No lyrics needed. Singa transcribes your words and detects the chords from the recording. You can correct them afterwards.</div>
        <div style="font-size:12px;color:#8a8a8a">You hereby confirm that you have permission to reproduce these lyrics</div>
      </div>`;
    } else {
      body = `<div style="width:100%;flex:1;display:flex;flex-direction:column;align-items:center;gap:40px;margin-top:80px">
        <div style="font-size:40px;font-weight:800;letter-spacing:-0.02em;color:${ST.phase==='countdown'?'#d0d0d0':'#1b1b1b'}">${esc(d.title||'Untitled song')}</div>
        ${ST.phase==='countdown'?countdownBlock():''}
        ${ST.phase==='recording'?waveformBlock():''}
        ${ST.phase==='processing'?processingBlock():''}
      </div>`;
    }
  } else if(ST.createMode==='file'){
    if(phaseIdle){
      body = `<div style="display:flex;flex-direction:column;align-items:center;gap:28px;margin-top:80px">
        <div class="row" style="gap:28px">
          <button class="btn-outline" style="width:170px;height:150px;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px" data-act="startUpload">${icon('upload',36)}<span style="font-size:15px;font-weight:600">Upload</span></button>
          <button class="btn-outline" style="width:170px;height:150px;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px" data-act="startCloud">${icon('cloud',36)}<span style="font-size:15px;font-weight:600">Link Cloud</span></button>
        </div>
        <div style="font-size:13px;color:#6f6f6f">Audio or video of you performing the song.</div>
        <div style="font-size:12px;color:#8a8a8a">You hereby confirm that you have permission to reproduce these lyrics</div>
      </div>`;
    } else {
      body = `<div style="margin-top:120px">${processingBlock()}</div>`;
    }
  }

  return `<div class="scr center" style="padding-top:16px">
    ${modeSeg}
    <div style="width:100%;display:flex;align-items:center;margin-top:20px;min-height:44px;max-width:760px">
      <span class="icon-btn" data-act="createBack">${icon('chevron_left',26)}</span>
      <div style="flex:1;display:flex;justify-content:center">${stepTabsHTML}</div>
      <span style="width:26px"></span>
    </div>
    ${body}
  </div>${ST.similar?renderSimilarModal():''}`;
}
/* ============================================================
   SCREENS: Completion / Incomplete / Song Viewer (+menu)
   ============================================================ */
function renderDone(){
  const d = D.songs[ST.editId] || EMPTY_SONG;
  return `<div class="scr center" style="padding-top:20px">
    <svg class="mascot" style="height:280px" viewBox="0 0 160 160" fill="none" aria-hidden="true"><circle cx="80" cy="80" r="74" fill="var(--accent)"/><path d="M50 83l19 19 41-46" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="34" r="6" fill="var(--accent)"/><circle cx="142" cy="46" r="5" fill="#2a9d6b"/><circle cx="136" cy="124" r="7" fill="#4169c7"/><circle cx="16" cy="118" r="5" fill="#8e4fd6"/></svg>
    <div style="font-size:64px;font-weight:800;letter-spacing:-0.03em;margin-top:12px">Congrats!</div>
    <div style="font-size:22px;text-align:center;line-height:1.4;margin-top:4px">${esc(d.title||'Your song')}<br>was added</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:30px">
      <a class="link link-muted" data-act="openPicker" data-kind="playlist">Add to playlist</a>
      <a class="link link-muted" data-act="openPicker" data-kind="gig">Add to a gig</a>
      <a class="link" style="color:${ST.isPublic?'#1b1b1b':'#6f6f6f'}" data-act="togglePublic">${ST.isPublic?'Public · anyone can copy it':'Make publicly available'}</a>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:340px;margin-top:30px">
      <button class="btn btn-grey" style="height:64px" data-act="viewDone">View Song</button>
      <button class="btn btn-dark" style="height:64px" data-act="newSong">Add New Song</button>
    </div>
  </div>`;
}

function renderIncomplete(){
  const s = song(ST.songId);
  return `<div class="scr center" style="padding-top:20px">
    <div style="align-self:flex-start"><span class="icon-btn" data-act="back" data-to="${esc(ST.back)}">${icon('chevron_left',26)}</span></div>
    <div style="font-size:40px;font-weight:800;letter-spacing:-0.02em;margin-top:40px;text-align:center">${esc(s.title||'Untitled song')}</div>
    <span class="msi" style="font-size:48px;margin-top:60px;color:#6f6f6f">folder</span>
    <div style="font-size:17px;font-weight:700;margin-top:10px">Nothing here yet</div>
    <div style="font-size:13px;color:#8a8a8a;margin-top:4px">This song is incomplete</div>
    <button class="btn btn-dark btn-sm" style="margin-top:18px" data-act="continueSong">Continue</button>
  </div>`;
}

function renderSongMenu(){
  const s = song(ST.songId);
  const instOpts = INSTS.map(([v,l])=>`<a class="link" style="display:flex;align-items:center;gap:8px;font-weight:${v===ST.instrument?700:500};color:${v===ST.instrument?'#1b1b1b':'#6f6f6f'}" data-act="setInstrumentMenu" data-id="${v}">${icon('check',18)}${l}</a>`).join('');
  return `<div class="modal-backdrop" style="background:rgba(255,255,255,.9);align-items:flex-start;justify-content:flex-end;padding:20px 64px 0" data-act="toggleMenu">
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:12px;text-align:right" onclick="event.stopPropagation()">
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

