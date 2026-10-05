"use strict";
function renderCollab(){
  const cg = ST.collabFor ? D.gigs.find(g=>g.id===ST.collabFor) : null;
  const rows = D.collabs.map((c,i)=>{
    const inGig = cg && c.gigs.includes(cg.id);
    const addBtn = cg ? `<span class="icon-btn" title="${inGig?'Remove from gig':'Add to gig'}" data-act="toggleCollabInGig" data-id="${i}">${icon(inGig?'check_circle':'add_circle',24)}</span>` : '<span></span>';
    return `<div style="display:grid;grid-template-columns:1fr 32px 32px;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid var(--b2)">
      <div><div style="font-size:16px;font-weight:600">${esc(c.name)}</div><div style="font-size:13px;color:#8a8a8a;margin-top:4px">${esc(c.gigs.map(gigName).join(' · ') || 'No gigs yet')}</div></div>
      <span class="icon-btn" data-act="editCollab" data-id="${i}">${icon('edit',22)}</span>
      ${addBtn}
    </div>`;
  }).join('');
  return `<div class="scr" style="gap:28px">
    <div class="row" style="gap:14px">
      <span class="icon-btn" data-act="back" data-to="${esc(ST.back)}">${icon('chevron_left',26)}</span>
      <div><div style="font-size:28px;font-weight:700">Collaborators</div>${cg?`<div style="font-size:14px;color:#6f6f6f;margin-top:4px">Tap + to add someone to ${esc(cg.title)}</div>`:''}</div>
      <div style="flex:1"></div>
      <span class="icon-btn" title="Add collaborator" data-act="newCollab">${icon('person_add',26)}</span>
    </div>
    <div>${rows}</div>
  </div>`;
}
/* ============================================================
   SCREEN: Create Song (Manual / From Recording / From File)
   ============================================================ */
function confirmFootnote(){
  return `<div style="text-align:center;font-size:12px;color:#8a8a8a">You hereby confirm that you have permission to reproduce these lyrics</div>`;
}
function processingBlock(){
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:40px">
    <div style="font-size:22px;font-weight:700">Applying magic…</div>
    <div style="width:300px;height:8px;border-radius:4px;background:#e6e6e6;overflow:hidden"><div style="height:100%;width:${Math.round(ST.procPct)}%;background:#1b1b1b;border-radius:4px"></div></div>
    <div style="font-size:14px;color:#6f6f6f">${esc(ST.procNote) || STAGES[Math.min(3,Math.floor(ST.procPct/25))]}</div>
  </div>`;
}
function waveformBlock(){
  const bars = (ST.bars.length?ST.bars:[20,40,30]).slice(-18);
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:28px">
    <div style="display:flex;align-items:center;gap:5px;height:96px">
      ${bars.map(h=>`<div style="width:6px;border-radius:3px;background:#1b1b1b;height:${h}px"></div>`).join('')}
      <div style="width:2px;height:96px;background:#f24822;margin:0 6px"></div>
      ${[0,1,2,3,4,5,6,7,8].map(()=>`<div style="width:6px;height:6px;border-radius:50%;background:#1b1b1b"></div>`).join('')}
    </div>
    <div style="font-size:14px;color:#6f6f6f;font-variant-numeric:tabular-nums">${fmtTime(ST.recT)}</div>
    <div class="row" style="gap:12px">
      <button class="btn btn-accent" style="width:150px" data-act="stopRecord">Stop</button>
      <button class="btn btn-outline" style="width:150px" data-act="abortRecord">Abort</button>
    </div>
  </div>`;
}
function countdownBlock(){
  return `<div style="position:relative;top:40px;display:flex;justify-content:center;font-size:160px;font-weight:800;line-height:1">${Math.max(1,Math.ceil(ST.cd))}</div>`;
}

function renderManualLyrics(d){
  const hasLyrics = !!d.lyrics.trim();
  return `<div style="width:100%;flex:1;display:flex;flex-direction:column;gap:14px;margin-top:28px;max-width:640px;margin-left:auto;margin-right:auto">
    <div class="row" style="gap:14px">
      <input class="ipt" style="height:64px;font-size:18px;font-weight:600" placeholder="Title" value="${esc(d.title)}" data-bind="draftTitle">
      <button class="icon-btn" title="Find similar titles" style="width:48px;height:48px" data-act="openSimilar">${icon('search',26)}</button>
    </div>
    <input class="ipt" style="height:64px" placeholder="Sub title — artist, version" value="${esc(d.sub)}" data-bind="draftSub">
    <textarea class="ipt" style="min-height:300px;font-size:18px" placeholder="Type or paste lyrics, one line per row" data-bind="draftLyrics">${esc(d.lyrics)}</textarea>
    ${!hasLyrics?`<a class="link" style="text-decoration:underline;align-self:flex-start" data-act="fillExample">Paste example lyrics</a>`:''}
    ${confirmFootnote()}
    <button class="btn ${hasLyrics?'btn-dark':'btn-disabled'}" style="align-self:center;width:170px;height:48px" data-act="lyricsNext">Next</button>
  </div>`;
}

function renderChordWheel(){
  const roots = LETTERS.map((r,i)=>`<div style="flex:none;width:100px;height:72px;display:flex;align-items:center;justify-content:center;font-size:${i===ST.rootIdx?44:26}px;font-weight:700;color:${i===ST.rootIdx?'#1b1b1b':'#a8a8a8'};cursor:pointer" data-act="pickRoot" data-id="${i}">${r}</div>`).join('');
  const letter = LETTERS[ST.rootIdx];
  const variants = [letter, ACC[letter]].flatMap(rt => SUFFIXES.map(q=>{
    const on = rt===ST.selRoot && q===ST.selSuffix;
    return `<button style="height:48px;border-radius:12px;border:1.5px solid var(--fg);background:${on?'#1b1b1b':'#fff'};color:${on?'#fff':'#1b1b1b'};font-size:17px;font-weight:700" data-act="pickVariant" data-root="${rt}" data-q="${q}">${rt}${q}</button>`;
  })).join('');
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:26px">
    <div style="font-size:13px;color:#6f6f6f">Pick a chord, then tap a word to place it. Tap again to remove.</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <div style="position:relative;width:300px;height:72px">
        <div style="position:absolute;left:100px;top:0;width:100px;height:72px;border-radius:14px;background:#f2f2f2"></div>
        <div style="position:relative;width:300px;height:72px;overflow-x:auto;overflow-y:hidden;display:flex;mask-image:linear-gradient(90deg,transparent 0,#000 24%,#000 76%,transparent 100%)">
          <div style="flex:none;width:100px"></div>${roots}<div style="flex:none;width:100px"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,76px);gap:6px;max-width:580px;grid-template-columns:repeat(auto-fit,76px);justify-content:center">${variants}</div>
    </div>
    <a class="link" style="text-decoration:underline" data-act="detectChords">Detect chords from a recording instead</a>
  </div>`;
}

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
