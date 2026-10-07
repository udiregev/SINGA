"use strict";
function renderChordWheel(){
  const roots = LETTERS.map((r,i)=>`<div style="flex:none;width:100px;height:72px;display:flex;align-items:center;justify-content:center;font-size:${i===ST.rootIdx?44:26}px;font-weight:700;color:${i===ST.rootIdx?'#1b1b1b':'#a8a8a8'};cursor:pointer;scroll-snap-align:center" data-act="pickRoot" data-id="${i}">${r}</div>`).join('');
  const letter = LETTERS[ST.rootIdx];
  const variants = [letter, ACC[letter]].flatMap(rt => SUFFIXES.map(q=>chordTileHTML(rt, q))).join('');
  const recentTiles = ST.recentChords.map(ch=>{ const p = splitChordStr(ch); return chordTileHTML(p.root, p.q, ch); }).join('');
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:10px">
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <div style="position:relative;width:300px;height:72px">
        <div style="position:absolute;left:100px;top:0;width:100px;height:72px;border-radius:14px;background:#f2f2f2"></div>
        <div id="rootScroller" class="rootScroller" style="position:relative;width:300px;height:72px;overflow-x:auto;overflow-y:hidden;display:flex;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;mask-image:linear-gradient(90deg,transparent 0,#000 24%,#000 76%,transparent 100%)">
          <div style="flex:none;width:100px"></div>${roots}<div style="flex:none;width:100px"></div>
        </div>
      </div>
      <div id="chordVariants" style="opacity:1;transition:opacity .4s ease;display:flex;flex-direction:column;gap:12px;max-width:320px">
        <div style="display:grid;grid-auto-flow:column;grid-template-rows:repeat(2,48px);grid-auto-columns:max-content;gap:6px;overflow-x:auto;padding-bottom:4px">${variants}</div>
        ${ST.recentChords.length ? `<div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          <span style="font-size:12px;color:#8a8a8a;font-weight:700;letter-spacing:.04em;text-transform:uppercase;flex:none">recent</span>
          <div style="display:flex;gap:6px;overflow-x:auto">${recentTiles}</div>
        </div>` : ''}
      </div>
    </div>
  </div>`;
}

function renderNoteEditor(d){
  if(ST.selWord==null) return '';
  const [li, wi] = ST.selWord.split('-').map(Number);
  const ws = parseLyrics(d.lyrics)[li] || [];
  const w = ws[wi] || '';
  const side = wi <= (ws.length-1)/2 ? 'left' : 'right';
  const placement = side==='left' ? 'Shown to the left of this line' : 'Shown to the right of this line';
  return `<div class="modal-backdrop" data-act="closeNoteEditor" style="align-items:flex-start;padding-top:120px">
    <div class="modal" style="max-width:380px" onclick="modalClick(event)">
      <div class="mhead"><span style="font-size:15px;font-weight:700;color:#2f8fe0">Mark on "${esc(w)}"</span><span class="icon-btn" data-act="closeNoteEditor">${icon('close',22)}</span></div>
      <input class="ipt" style="height:44px;border:1px solid #cfe0f5;font-family:Caveat,cursive;font-size:24px;color:#2f8fe0;background:#f3f8ff" placeholder="e.g. Hi note, breathe, key change" value="${esc(ST.noteDraft)}" data-bind="noteDraft" autofocus>
      <div class="row" style="gap:8px">
        <span style="font-size:12px;color:#6f6f6f">${placement}</span>
        <div style="flex:1"></div>
        <a class="link link-accent" data-act="removeNote">Remove</a>
        <button class="btn btn-dark btn-sm" data-act="saveNote">Save</button>
      </div>
    </div>
  </div>`;
}

function renderSongBody(d){
  const editMode = ST.step==='chords' ? 'chords' : ST.step==='markings' ? 'markings' : 'static';
  const lines = buildLines(d, editMode, ST.phase==='recording' ? {t:ST.recT} : null);
  const opacity = (ST.phase==='countdown'||ST.phase==='processing') ? 0.12 : 1;
  const skipLabel = ST.step==='chords' ? 'Skip (detect chords from a recording instead)' : 'Skip';
  const skipAct = ST.step==='chords' ? 'detectChords' : 'createNextStep';
  return `<div style="width:100%;flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;margin-top:10px;position:relative">
    <div style="opacity:${opacity};flex:none;display:flex;flex-direction:column;align-items:center;width:100%">
      <div style="font-size:32px;font-weight:800;letter-spacing:-0.02em;text-align:center">${esc(d.title||'Untitled song')}</div>
      ${ST.step==='chords' ? renderChordWheel() : ''}
      ${ST.step==='markings' ? `<div style="font-size:13px;color:#6f6f6f;margin-top:14px">Tap a word to add a mark.</div>` : ''}
    </div>
    <div id="editorLyricsScroll" style="opacity:${opacity};flex:none;width:100%;max-height:260px;overflow-y:auto;margin-top:18px;display:flex;flex-direction:column;align-items:center">
      ${linesHTML(lines)}
    </div>
    <div style="flex:1"></div>
    ${ST.phase==='countdown' ? `<div style="position:absolute;top:60px;left:0;right:0">${countdownBlock()}</div>` : ''}
    ${ST.phase==='processing' ? `<div style="position:absolute;top:60px;left:0;right:0">${processingBlock()}</div>` : ''}
    ${(ST.step==='chords'||ST.step==='markings') ? `<div style="flex:none;display:flex;flex-direction:column;align-items:center;gap:10px;padding-top:12px;border-top:1px solid #f0f0f0;width:100%;margin-top:14px">
        <div class="row" style="gap:12px">
          <button class="btn btn-outline" style="width:170px" data-act="abortCreate">Abort</button>
          <button class="btn btn-dark" style="width:170px" data-act="createNextStep">Next</button>
        </div>
        <a class="link" style="color:#9a9a9a;text-align:center" data-act="${skipAct}">${skipLabel}</a>
      </div>` : ''}
    ${ST.step==='sync' && ST.phase==='idle' ? `<div style="flex:none;display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;max-width:340px;margin:0 auto">
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
  const rows = ST.similarResults || [];
  const sub = ST.similarLoading ? 'Searching Singa…' : (rows.length ? 'Already shared on Singa. Copy one instead of starting from scratch.' : 'No similar titles shared on Singa yet.');
  return `<div class="modal-backdrop" data-act="closeSimilar" style="align-items:flex-start;padding-top:140px">
    <div class="modal" style="max-width:420px" onclick="modalClick(event)">
      <div class="mhead"><span style="font-size:15px;font-weight:700">Similar titles</span><span class="icon-btn" data-act="closeSimilar">${icon('close',22)}</span></div>
      <div class="msub">${sub}</div>
      ${rows.map(r=>`<div class="list-row" style="padding:12px 14px;border:1px solid #ececec;border-radius:10px" data-act="useSimilar" data-id="${esc(r.id)}"><div><div style="font-size:15px;font-weight:600">${esc(r.title)}</div><div style="font-size:12px;color:#8a8a8a;margin-top:2px">${esc(r.sub||'')} · added by ${esc(r.owner_nickname||'someone')}</div></div>${icon('chevron_right',22)}</div>`).join('')}
      <button class="btn btn-dark" style="margin-top:8px" data-act="closeSimilar">Keep creating my own</button>
    </div>
  </div>`;
}

function renderCreate(){
  const d = D.songs[ST.editId] || { id:'x', title:'', sub:'', lyrics:'', chords:{}, notes:{} };
  const phaseIdle = ST.phase==='idle';
  const modeLocked = !phaseIdle || (ST.createMode==='manual' && ST.step!=='lyrics');
  const modeSegShown = !modeLocked;
  const modes = [['manual','Manual'],['recording','From Recording'],['file','From File']];
  const modeSeg = `<div class="seg">
    ${modes.map(([v,l])=>`<button class="${v===ST.createMode?'on':''}" data-act="setCreateMode" data-id="${v}">${l}</button>`).join('')}
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
    <div id="modeSegWrap" style="display:flex;justify-content:center;overflow:hidden;max-height:${modeSegShown?'60px':'0px'};opacity:${modeSegShown?1:0}">${modeSeg}</div>
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
      <a class="link" style="color:${d.isPublic?'#1b1b1b':'#6f6f6f'}" data-act="togglePublic">${d.isPublic?'Public · anyone can copy it':'Make publicly available'}</a>
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
