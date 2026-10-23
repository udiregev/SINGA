"use strict";
// A single-line, chevron-navigated chip strip: no visible scrollbar, and
// nothing is ever permanently cropped at the edge — left/right chevrons
// appear only when there's actually more content in that direction, and
// content only looks clipped transiently while mid-scroll.
function chipRowHTML(rowId, itemsHTML){
  return `<div class="chiprow-wrap">
    <button class="chiprow-chevron" data-act="scrollChipRow" data-id="${rowId}" data-dir="-1" id="${rowId}-chevL" style="display:none">${icon('chevron_left',18)}</button>
    <div class="chiprow" id="${rowId}">${itemsHTML}</div>
    <button class="chiprow-chevron" data-act="scrollChipRow" data-id="${rowId}" data-dir="1" id="${rowId}-chevR" style="display:none">${icon('chevron_right',18)}</button>
  </div>`;
}
function updateChipRowChevrons(id){
  const el = document.getElementById(id);
  const chevL = document.getElementById(id+'-chevL');
  const chevR = document.getElementById(id+'-chevR');
  if(!el || !chevL || !chevR) return;
  const overflow = el.scrollWidth > el.clientWidth + 1;
  chevL.style.display = overflow && el.scrollLeft > 2 ? 'flex' : 'none';
  chevR.style.display = overflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 2 ? 'flex' : 'none';
}
// Chords step: a picker column LEFT of the lyrics (both orientations).
// Root letters scroll sideways (current big, next one faded), a ♯/♭ switch,
// then the chord variants as a vertical list. Drag any chord onto a word —
// or tap a chord, then tap words.
const ROOT_W = 48;
function renderChordPicker(){
  const roots = LETTERS.map((r,i)=>`<div class="ce-root${i===ST.rootIdx?' on':''}" data-act="pickRoot" data-id="${i}">${r}</div>`).join('');
  const letter = LETTERS[ST.rootIdx];
  const rt = ST.accOn ? ACC[letter] : letter;
  const tiles = SUFFIXES.map(q=>chordTileHTML(rt, q, null, 'ctile')).join('');
  return `<div class="ce-picker">
    <div id="rootScroller" class="rootScroller ce-roots" data-itemw="${ROOT_W}"><div class="ce-roots-in">${roots}<div style="flex:none;width:${ROOT_W}px"></div></div></div>
    <button class="ce-acc${ST.accOn?' on':''}" data-act="toggleAcc" title="${ST.accOn?'Back to '+esc(letter):'Switch to '+esc(ACC[letter])}">${ACC[letter].slice(1)==='#'?'♯':'♭'}</button>
    <div id="chordVariants" class="ce-variants">${tiles}</div>
  </div>`;
}
function renderUsedRow(){
  const used = usedChords(D.songs[ST.editId]);
  const tiles = used.map(ch=>{ const p = splitChordStr(ch); return chordTileHTML(p.root, p.q, ch, 'utile'); }).join('');
  const placed = Object.keys((D.songs[ST.editId]||{}).chords||{}).length;
  return `<div class="ce-used"><div class="ce-used-row">${placed && tiles ? tiles : '<span style="font-size:14px;color:#9a9a9a">Drag and drop a chord onto a word</span>'}</div></div>`;
}

// The marking editor is a light-blue sticky note: close ×, the note itself
// ("add a marking"), Remove (if there's one already) and Save. Nothing else.
function renderNoteEditor(d){
  if(ST.selWord==null) return '';
  const has = !!((d.notes||{})[ST.selWord]);
  return `<div class="modal-backdrop" data-act="closeNoteEditor" style="background:rgba(255,255,255,.55);align-items:flex-start;padding-top:120px">
    <div class="sticky" onclick="modalClick(event)">
      <span class="icon-btn sticky-x" data-act="closeNoteEditor">${icon('close',22)}</span>
      <input class="sticky-ipt" placeholder="add a marking" value="${esc(ST.noteDraft)}" data-bind="noteDraft" data-key="saveNote" autofocus maxlength="40">
      <div class="sticky-acts">${has?`<a data-act="removeNote">Remove</a>`:''}<a class="save" data-act="saveNote">Save</a></div>
    </div>
  </div>`;
}

function renderSongBody(d){
  // During live Practice/Record, lyrics scroll in time (karaoke-paced) but
  // no line is bolded yet — that only happens once there's a real take to
  // play back (see syncPreviewPlay), using real forced-alignment timing.
  const previewPlaying = ST.step==='sync' && ST.ctx==='syncpreview' && ST.playing;
  const following = ST.step==='sync' && ST.phase==='practicing' && ST.pracState==='following';
  const editMode = ST.step==='chords' ? 'chords' : ST.step==='markings' ? 'markings' : (previewPlaying ? (ST.testSpeed ? 'scroll' : 'play') : (following ? 'play' : 'static'));
  // the recording screen scrolls at the song's set speed
  const liveT = ST.phase==='recording' ? ST.recT*songSpeed(d) : ST.phase==='practicing' ? ST.recT : (previewPlaying ? ST.t : null);
  const lines = buildLines(d, editMode, liveT!=null ? {t:liveT} : null);
  const opacity = (ST.phase==='countdown'||ST.phase==='processing') ? 0.12 : 1;
  const skipLabel = ST.step==='chords' ? 'Skip (detect chords from a recording instead)' : 'Skip';
  const skipAct = ST.step==='chords' ? 'detectChords' : 'createNextStep';
  return `<div style="width:100%;flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;margin-top:10px;position:relative">
    <div style="opacity:${opacity};flex:none;display:flex;flex-direction:column;align-items:center;width:100%">
      <div class="cs-title" style="font-size:32px;font-weight:800;letter-spacing:-0.02em;text-align:center">${esc(d.title||'Untitled song')}</div>
      ${ST.step==='markings' ? `<div style="font-size:13px;color:#6f6f6f;margin-top:14px">Tap a word to add a mark.</div>` : ''}
    </div>
    ${ST.step==='chords' ? `<div class="ce-wrap">
      ${renderChordPicker()}
      <div class="ce-main">
        ${renderUsedRow()}
        <div id="editorLyricsScroll" class="sheet-edit ce-lyrics">${linesHTML(lines)}</div>
      </div>
    </div>` : `<div id="editorLyricsScroll" class="${ST.step==='sync'?'':'sheet-edit'}" style="opacity:${opacity};${ST.step==='sync'?'flex:none;max-height:260px;':'flex:1;min-height:200px;'}width:100%;overflow-y:auto;margin-top:18px;display:flex;flex-direction:column;align-items:center">
      ${linesHTML(lines)}
    </div>`}
    ${ST.step==='sync' ? '<div style="flex:1"></div>' : ''}
    ${ST.phase==='countdown' ? `<div style="position:absolute;top:60px;left:0;right:0">${countdownBlock()}</div>` : ''}
    ${ST.phase==='processing' ? `<div style="position:absolute;top:60px;left:0;right:0">${processingBlock()}</div>` : ''}
    ${(ST.step==='chords'||ST.step==='markings') && ST.editing ? `<div class="ce-foot" style="flex:none;display:flex;justify-content:center;padding-top:12px;border-top:1px solid #f0f0f0;width:100%;margin-top:14px">
        <button class="btn btn-dark" style="width:220px" data-act="editDone">Done</button>
      </div>` : ''}
    ${(ST.step==='chords'||ST.step==='markings') && !ST.editing ? `<div class="ce-foot" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:10px;padding-top:12px;border-top:1px solid #f0f0f0;width:100%;margin-top:14px">
        <div class="row" style="gap:12px">
          <button class="btn btn-outline" style="width:170px" data-act="abortCreate">Abort</button>
          <button class="btn btn-dark" style="width:170px" data-act="createNextStep">Next</button>
        </div>
        <a class="link" style="color:#9a9a9a;text-align:center" data-act="${skipAct}">${skipLabel}</a>
      </div>` : ''}
    ${ST.step==='sync' && ST.phase==='idle' ? tempoPanelHTML(d) : ''}
    ${ST.step==='sync' && (ST.phase==='countdown'||ST.phase==='recording') ? waveformBlock() : ''}
    ${ST.step==='sync' && ST.phase==='practicing' ? practiceBlock() : ''}
  </div>`;
}

// Tempo step: Set speed (default x1 — the lyrics scroll at that speed, no
// highlighting) or Audio synced (record / upload a take — every word
// highlighted as it's sung).
function tempoPanelHTML(d){
  const tab = ST.tempoTab || songMode(d);
  const testing = ST.ctx==='syncpreview' && ST.playing && ST.testSpeed;
  const previewPlaying = ST.ctx==='syncpreview' && ST.playing && !ST.testSpeed;
  const seg = `<div class="seg">${[['speed','Set speed'],['synced','Audio synced']].map(([k,l])=>`<button class="${k===tab?'on':''}" data-act="setTempoTab" data-id="${k}">${l}</button>`).join('')}</div>`;
  const speed = `${speedControlHTML(d)}
    <div class="row" style="gap:12px;flex-wrap:wrap;justify-content:center">
      <button class="btn btn-grey" style="width:150px" data-act="testSpeed">${testing?'Stop':'Test'}</button>
      <button class="btn btn-accent" style="min-width:230px;padding:0 20px;white-space:nowrap" data-act="recordTempo">Record your own tempo</button>
    </div>
    <div class="tempo-note">The lyrics scroll at this speed in the song viewer, without highlighting the words. Record your own tempo to have every word follow your take.</div>`;
  const synced = `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;max-width:340px">
    ${ST.autoChords?`<div style="font-size:13px;color:#2f8fe0;text-align:center;line-height:1.45">Chords will be detected from the instruments in your recording. No need to wait for it — we'll let you know when the song is ready.</div>`:''}
    ${d.synced ? `<button class="btn btn-dark" style="width:100%" data-act="syncPreviewPlay">${previewPlaying?'Pause':'Play your synced take'}</button>` : ''}
    <button class="btn btn-grey" style="width:100%" data-act="practiceDraft">Practice</button>
    <button class="btn btn-accent" style="width:100%" data-act="startRecord">Record</button>
    <a class="link" style="text-decoration:underline;margin-top:2px" data-act="startUpload">Upload</a>
    <div class="tempo-note">Sing and play it once — Singa lines up every word with your take. The lyrics on the recording screen scroll at ${speedLabel(songSpeed(d))}.</div>
  </div>`;
  const foot = ST.editing ? '' : `<div class="row" style="gap:12px;margin-top:4px">
      <button class="btn btn-outline" style="width:150px" data-act="abortCreate">Abort</button>
      <button class="btn btn-dark" style="width:150px" data-act="finishCreate">Done</button>
    </div>`;
  return `<div style="flex:none;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:440px;margin:0 auto;padding-bottom:6px">${seg}${tab==='speed'?speed:synced}${foot}</div>`;
}
// Lyrics / Chords / Markings / Tempo — the same tabs when creating and editing.
function stepTabsHTML(d){
  const ok = lyricsReady(d);
  return `<div class="steptabs">${[['lyrics','Lyrics'],['chords','Chords'],['markings','Markings'],['sync','Tempo']].map(([k,l])=>`<button class="${k===ST.step?'on':(ok||k==='lyrics'?'':'off')}" data-act="goCreateStep" data-id="${k}">${l}</button>`).join('')}</div>`;
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

function renderEdit(d){
  const body = ST.step==='lyrics' ? renderManualLyrics(d) : renderSongBody(d);
  return `<div class="scr center" style="padding-top:16px">
    <div style="width:100%;display:flex;align-items:center;gap:8px;margin-top:20px;min-height:44px;max-width:760px">
      <span class="icon-btn" title="Save and close" data-act="editDone">${icon('chevron_left',26)}</span>
      <div style="flex:1;display:flex;justify-content:center">${stepTabsHTML(d)}</div>
      <button class="btn btn-dark btn-sm" data-act="editDone">Done</button>
    </div>
    ${body}
  </div>`;
}
// After a recording or file has been captured: look it over, then Accept or Edit.
function renderReview(){
  const d = D.songs[ST.editId] || EMPTY_SONG;
  const lines = buildLines(d, 'view', {});
  const nChords = Object.keys(d.chords||{}).length;
  return `<div class="scr center" style="padding-top:16px">
    <div style="width:100%;max-width:760px;display:flex;flex-direction:column;flex:1;min-height:0;gap:12px">
      <div class="row" style="gap:12px">
        <span class="icon-btn" title="Decide later" data-act="reviewLater">${icon('chevron_left',26)}</span>
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#2f8fe0">REVIEW YOUR NEW SONG</div>
      </div>
      <input class="ipt" style="height:56px;font-size:20px;font-weight:700" placeholder="Title" value="${esc(d.title)}" data-bind="draftTitle">
      <input class="ipt" style="height:48px" placeholder="Artist / version" value="${esc(d.sub)}" data-bind="draftSub">
      <div style="font-size:13px;color:#6f6f6f">${parseLyrics(d.lyrics).filter(ws=>!isHeaderLine(ws)).length} lines · ${nChords} chords${d.synced?' · synced to the recording':''}</div>
      <div style="flex:1;min-height:200px;overflow:auto;border:1px solid var(--b2);border-radius:14px;padding:18px 20px 40px">${linesHTML(lines)}</div>
      <div class="row" style="gap:12px;justify-content:center;padding:6px 0 4px">
        <button class="btn btn-outline" style="width:170px" data-act="reviewEdit">Edit</button>
        <button class="btn btn-dark" style="width:170px" data-act="reviewAccept">Accept</button>
      </div>
    </div>
  </div>`;
}
function renderCreate(){
  const d = D.songs[ST.editId] || { id:'x', title:'', sub:'', lyrics:'', chords:{}, notes:{} };
  if(ST.editing) return renderEdit(d);
  const phaseIdle = ST.phase==='idle';
  const modeLocked = !phaseIdle || (ST.createMode==='manual' && ST.step!=='lyrics');
  const modeSegShown = !modeLocked;
  const modes = [['manual','Manual'],['recording','Import audio'],['file','Import text']];
  const modeSeg = `<div class="seg">
    ${modes.map(([v,l])=>`<button class="${v===ST.createMode?'on':''}" data-act="setCreateMode" data-id="${v}">${l}</button>`).join('')}
  </div>`;
  const hasLyrics = !!d.lyrics.trim();
  const isManual = ST.createMode==='manual';
  const tabsHTML = isManual ? stepTabsHTML(d) : '';

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
        <div style="font-size:13px;color:#6f6f6f;text-align:center;max-width:420px;line-height:1.5">A chord sheet or lyrics file — .txt or .pdf (scanned PDFs work too). Singa reads the title, the lyrics and the chords above each word. Pick several files to add several songs at once.</div>
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
      <div style="flex:1;display:flex;justify-content:center">${tabsHTML}</div>
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
    ${songMode(d)!=='synced' && !ST.doneNoticeHidden ? `<div style="margin-top:22px;width:100%;max-width:420px;border:1.5px solid #e6e6e6;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center">
      <div style="font-size:15px;font-weight:700">No audio sync for this song</div>
      <div style="font-size:13px;color:#6f6f6f;line-height:1.45">${ST.doneSpeed ? 'The lyrics will scroll at this speed — set it here, or later from Edit → Tempo.' : `Without a recorded take, the lyrics scroll at a set speed (${speedLabel(songSpeed(d))}) and the words aren't highlighted.`}</div>
      ${ST.doneSpeed ? speedControlHTML(d) : `<div class="row" style="gap:10px"><button class="btn btn-dark btn-sm" data-act="doneSkipSync">Skip sync</button><button class="btn btn-outline btn-sm" data-act="doneLater">Later</button></div>`}
    </div>` : ''}
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:24px">
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

// Right after uploading a document or recording: same look as the
// completion screen, but the song is still being added in the background.
function renderQueued(){
  const q = ST.queued || [];
  const what = q.length===1 ? `“${esc(q[0])}”<br>is being added` : `${q.length} songs<br>are being added`;
  return `<div class="scr center" style="padding-top:20px">
    <svg class="mascot" style="height:280px" viewBox="0 0 160 160" fill="none" aria-hidden="true"><circle cx="80" cy="80" r="74" fill="var(--accent)"/><path d="M50 83l19 19 41-46" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="34" r="6" fill="var(--accent)"/><circle cx="142" cy="46" r="5" fill="#2a9d6b"/><circle cx="136" cy="124" r="7" fill="#4169c7"/><circle cx="16" cy="118" r="5" fill="#8e4fd6"/></svg>
    <div style="font-size:64px;font-weight:800;letter-spacing:-0.03em;margin-top:12px">Got it!</div>
    <div style="font-size:22px;text-align:center;line-height:1.4;margin-top:4px">${what}</div>
    <div style="font-size:15px;color:#6f6f6f;text-align:center;max-width:360px;line-height:1.5;margin-top:14px">No need to wait here. We'll let you know when ${q.length===1?'it\'s':'they\'re'} ready — you'll find ${q.length===1?'it':'them'} in your songs marked <b style="color:#2f8fe0">IN PROGRESS</b>.</div>
    <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:340px;margin-top:30px">
      <button class="btn btn-grey" style="height:64px" data-act="goHome">Close</button>
      <button class="btn btn-dark" style="height:64px" data-act="newSong">Add Another Song</button>
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
