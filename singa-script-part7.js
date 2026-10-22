"use strict";
function renderNewModal(){
  const ni = ST.newItem;
  const heading = ni.kind==='playlist' ? 'New playlist' : 'New gig';
  const placeholder = ni.kind==='playlist' ? 'e.g. Campfire songs' : "e.g. Maya's birthday";
  return `<div class="modal-backdrop" data-act="closeNew"><div class="modal" style="max-width:420px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">${heading}</span><span class="icon-btn" data-act="closeNew">${icon('close',22)}</span></div>
    <label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Name</span><input style="border:0;outline:none;font-size:16px;font-weight:600" placeholder="${placeholder}" value="${esc(ni.name)}" data-bind="newName" data-key="createNew" autofocus></label>
    ${ni.kind==='gig'?`<label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Date</span><input style="border:0;outline:none;font-size:16px;font-weight:600" placeholder="e.g. Oct 12, 2026" value="${esc(ni.date)}" data-bind="newDate" data-key="createNew"></label>`:''}
    <button class="btn" style="background:${ni.name.trim()?'#1b1b1b':'#d6d6d6'};color:#fff;margin-top:6px" data-act="createNew">Create</button>
  </div></div>`;
}

function renderCollabEditModal(){
  const ce = ST.collabEdit;
  const heading = ce.i==null ? 'Add Collaborator' : 'Edit Collaborator';
  const gigRows = D.gigs.map(g=>{ const on = ce.gigs.includes(g.id); return `<div class="row" style="gap:14px;padding:9px 0;cursor:pointer" data-act="toggleCeGig" data-id="${g.id}">
    <div class="toggle" style="background:${on?'#1b1b1b':'#fff'}"><div class="dot" style="left:${on?20:2}px;background:${on?'#fff':'#1b1b1b'}"></div></div>
    <span style="font-size:14px;font-weight:600">${esc(g.title)}</span></div>`; }).join('');
  return `<div class="modal-backdrop" data-act="closeCollabEdit"><div class="modal" style="max-width:440px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">${heading}</span><span class="icon-btn" data-act="closeCollabEdit">${icon('close',22)}</span></div>
    <label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Name</span><input style="border:0;outline:none;font-size:16px;font-weight:600" value="${esc(ce.name)}" data-bind="ceName"></label>
    <label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Email</span><input style="border:0;outline:none;font-size:16px;font-weight:600" value="${esc(ce.email)}" data-bind="ceEmail"></label>
    <div style="font-size:12px;color:#8a8a8a;margin-top:6px">Gigs</div>
    <div>${gigRows}</div>
    <button class="btn btn-dark" style="margin-top:8px" data-act="saveCollab">Save</button>
  </div></div>`;
}

function renderNickModal(){
  return `<div class="modal-backdrop" data-act="closeEditNick"><div class="modal" style="max-width:380px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">Nickname</span><span class="icon-btn" data-act="closeEditNick">${icon('close',22)}</span></div>
    <label style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid #e2e2e2;padding-bottom:8px"><span style="font-size:12px;color:#8a8a8a">Shown to collaborators and your audience</span><input style="border:0;outline:none;font-size:16px;font-weight:600" value="${esc(ST.editNick)}" data-bind="nickInput" data-key="saveNickname" autofocus></label>
    <button class="btn" style="background:${ST.editNick.trim()?'#1b1b1b':'#d6d6d6'};color:#fff;margin-top:6px" data-act="saveNickname">Save</button>
  </div></div>`;
}

function renderVerifyModal(){
  return `<div class="modal-backdrop" data-act="closeVerifyModal"><div class="modal" style="max-width:380px;text-align:center;align-items:center;gap:14px" onclick="modalClick(event)">
    <div class="mhead" style="width:100%"><span style="font-size:21px;font-weight:600">Verify your email</span><span class="icon-btn" data-act="closeVerifyModal">${icon('close',22)}</span></div>
    <div style="font-size:14px;color:#6f6f6f;line-height:1.5">We sent a confirmation link to <b>${esc(ST.email)}</b>. Verify it before saving songs, gigs, or playlists — until then, nothing you create here will be saved.</div>
    <button class="btn btn-dark" style="width:100%" data-act="resendVerifyEmail">Resend email</button>
    <a class="link" data-act="closeVerifyModal">Got it</a>
  </div></div>`;
}

function modalClick(e){
  // Let clicks on any actionable element inside the modal (the X button,
  // Save/Create, etc.) bubble up to the document's delegated handler;
  // swallow clicks that land on blank modal padding so they don't fall
  // through to the backdrop's close handler.
  const actEl = e.target.closest('[data-act]');
  if(actEl && e.currentTarget.contains(actEl)) return;
  e.stopPropagation();
}
function renderModals(){
  let html = '';
  if(ST.gigSettings) html += renderGigSettingsModal();
  if(ST.upgrade) html += renderUpgradeModal();
  if(ST.pick || ST.songPick) html += renderPickerModal();
  if(ST.newItem) html += renderNewModal();
  if(ST.collabEdit) html += renderCollabEditModal();
  if(ST.editNick!=null) html += renderNickModal();
  if(ST.verifyModal) html += renderVerifyModal();
  if(ST.accountOpen) html += renderAccountPanel();
  // The chord/markings-step note editor now floats as a modal popup (over
  // the lyrics, not squeezed in below them) instead of being part of the
  // normal in-flow layout.
  if(ST.step==='markings' && ST.selWord!=null && ST.editId && D.songs[ST.editId]) html += renderNoteEditor(D.songs[ST.editId]);
  return html;
}
/* ============================================================
   RENDER DISPATCH
   ============================================================ */
const DARK_MODE_SCREENS = ['gig','song','practice','gigplayer'];
// Screens that fit the window (the lyrics scroll inside them) instead of
// growing the whole page — on desktop the song used to scroll off the page.
const FIXED_SCREENS = ['song','practice','gigplayer','create','review'];
let _prevRenderScreen = null, _prevModalKey = '', _prevScrollScreen = '', _lastEditorLine = null;
function render(){
  // A render triggered by the 100ms playback/recording/sampling tick
  // redraws the current screen's markup from scratch every time. Without
  // this check that replays the .scr mount-in animation (translateY+fade)
  // on every single tick, which is what was showing up as a flicker on the
  // countdown/recording and "Play Sample" screens. Only play the entrance
  // animation when we're actually navigating to a different screen.
  const sameScreen = _prevRenderScreen === ST.screen;
  _prevRenderScreen = ST.screen;
  const darkAllowed = DARK_MODE_SCREENS.includes(ST.screen);
  document.body.classList.toggle('dark-invert', ST.perfDark && darkAllowed);
  document.body.classList.toggle('fixed-screen', FIXED_SCREENS.includes(ST.screen));
  if(ST.screen!=='gig') ST.gigMenuOpen = false;
  if(ST.screen==='account'){ ST.screen = ST.back && ST.back!=='account' ? ST.back : 'home'; ST.accountOpen = true; }
  document.getElementById('darkToggle').style.display = darkAllowed ? 'flex' : 'none';
  document.getElementById('darkPill').style.background = ST.perfDark ? '#1b1b1b' : '#fff';
  document.getElementById('darkDot').style.left = (ST.perfDark?20:2)+'px';
  document.getElementById('darkDot').style.background = ST.perfDark ? '#fff' : '#1b1b1b';
  let html = '';
  switch(ST.screen){
    case 'login': html = renderLogin(); break;
    case 'home': html = renderHome(); break;
    case 'list': html = renderList(); break;
    case 'search': html = renderSearch(); break;
    case 'account': html = renderHome(); break;
    case 'collab': html = renderCollab(); break;
    case 'create': html = renderCreate(); break;
    case 'review': html = renderReview(); break;
    case 'done': html = renderDone(); break;
    case 'queued': html = renderQueued(); break;
    case 'incomplete': html = renderIncomplete(); break;
    case 'song': html = renderSong(); break;
    case 'practice': html = renderPractice(); break;
    case 'gig': html = renderGig(); break;
    case 'gigphotos': html = renderGigPhotos(); break;
    case 'gigmessages': html = renderGigMessages(); break;
    case 'gigedit': html = renderGigEdit(); break;
    case 'gigplayer': html = renderGigPlayer(); break;
    default: html = renderHome();
  }
  // Remember where the scrollable lyric areas were, so a re-render (the
  // whole screen is rebuilt) doesn't jump them back to the top.
  const _keep = {};
  ['editorLyricsScroll','lyricsScroll','gigLyricsScroll','songSideList','gigSideList'].forEach(id=>{ const el = document.getElementById(id); if(el) _keep[id] = el.scrollTop; });
  const _keepScreen = _prevScrollScreen; _prevScrollScreen = ST.screen + '|' + (ST.songId||'') + '|' + (ST.editId||'');
  document.getElementById('screen').innerHTML = html;
  if(_keepScreen === _prevScrollScreen) Object.keys(_keep).forEach(id=>{ const el = document.getElementById(id); if(el && !el.hasAttribute('data-win')) el.scrollTop = _keep[id]; });
  const _sp = document.querySelector('#modalLayer .sidepanel'), _spTop = _sp ? _sp.scrollTop : 0;
  document.getElementById('modalLayer').innerHTML = renderModals();
  const _sp2 = document.querySelector('#modalLayer .sidepanel'); if(_sp2 && _spTop) _sp2.scrollTop = _spTop;
  // Modals and the toast are redrawn on every 100ms tick during playback and
  // recording; only play their entrance animation when they first appear,
  // otherwise it restarts every tick and flickers.
  const modalKey = [ST.gigSettings,ST.upgrade,!!(ST.pick||ST.songPick),!!ST.newItem,!!ST.collabEdit,ST.editNick!=null,ST.verifyModal,ST.accountOpen,ST.selWord].join('|');
  if(modalKey===_prevModalKey) document.querySelectorAll('#modalLayer .modal-backdrop, #modalLayer .modal, #modalLayer .sidepanel, #modalLayer .sidepanel-backdrop').forEach(el=>{ el.style.animation='none'; });
  _prevModalKey = modalKey;
  document.getElementById('toastBox').innerHTML = ST.toast ? `<div class="toast" style="${animStyle('toast', ST.toast, 'toastUp', 350) || 'animation:none'}">${esc(ST.toast)}</div>` : '';
  if(sameScreen){
    const scrEl = document.querySelector('#screen .scr');
    if(scrEl) scrEl.style.animation = 'none';
  }
  // autofocus search on search screen
  if(ST.screen==='search'){ const el = document.querySelector('#screen input[data-bind="searchQuery"]'); if(el){ el.focus(); const v=el.value; el.value=''; el.value=v; } }
  // players: keep the playing line 2nd of a 4-line window
  syncLyricWindow();
  fitLandDia();
  // keep the chord-root spinner's scroll position in sync with ST.rootIdx
  // across any re-render that isn't itself caused by scrolling it
  const rs = document.getElementById('rootScroller');
  if(rs){
    const want = ST.rootIdx*(+(rs.dataset.itemw||100));
    if(Math.abs(rs.scrollLeft-want)>1){ ST._lastProgScrollAt = Date.now(); rs.scrollLeft = want; }
  }
  // chord-chip row chevrons: recompute every render, since content (and so
  // overflow) can change — e.g. switching root letter or adding a recent chord
  // Keep the chords/markings editor's fixed ~4-line lyrics viewport scrolled
  // so the line you're currently working on sits as the 2nd of the visible
  // rows — like a typewriter margin — clamping at the very top of the first
  // line and the very bottom of the last one.
  const els = document.getElementById('editorLyricsScroll');
  const editorMoved = _lastEditorLine !== ST.editorLine || !(_keepScreen === _prevScrollScreen);
  _lastEditorLine = ST.editorLine;
  if(els && editorMoved){
    const lineEls = els.querySelectorAll('.lline');
    if(lineEls.length){
      const rowH = els.scrollHeight / lineEls.length;
      const maxScroll = Math.max(0, els.scrollHeight - els.clientHeight);
      const want = Math.max(0, Math.min(maxScroll, (ST.editorLine-1)*rowH));
      if(Math.abs(els.scrollTop-want)>1) els.scrollTop = want;
    }
  }
  // make the native/browser Back button act as in-app Back instead of
  // leaving the app: push a history entry whenever the screen changes,
  // and pop one in the 'popstate' listener below instead of re-pushing.
  if(_histScreen===null){
    _histScreen = ST.screen;
    try{ history.replaceState({screen:ST.screen}, '', location.href); }catch(e){}
  } else if(_histScreen!==ST.screen){
    if(!_poppingHistState){
      try{ history.pushState({screen:ST.screen}, '', location.href); }catch(e){}
    }
    _histScreen = ST.screen;
  }
}
/* While a song plays (song viewer, Practice, gig player) the lyrics show
   just 4 lines. The highlighted line sits 2nd (1st at the very start, 4th
   at the very end) and the window glides there smoothly. The screen is
   rebuilt every 100ms, so the eased position lives here, not in the DOM. */
const _win = { pos:0, target:0, key:'', raf:0, lineH:0 };
function syncLyricWindow(){
  const el = document.querySelector('[data-win]');
  if(!el){ _win.key=''; return; }
  const lines = Array.from(el.querySelectorAll('.lline'));
  if(!lines.length) return;
  const key = el.getAttribute('data-win');
  // window height = 4 typical sung lines (measured once per song/layout)
  const sizeKey = key+'|'+innerWidth+'x'+innerHeight;
  if(_win.sizeKey !== sizeKey){
    const sung = lines.filter(l=>!l.classList.contains('lheader'));
    const hs = sung.map(l=>l.offsetHeight).sort((a,b)=>a-b);
    const med = hs.length ? hs[Math.floor(hs.length/2)] : 60;
    const gap = parseFloat(getComputedStyle(el.querySelector('.lyrics-wrap')).rowGap) || 16;
    _win.lineH = med + gap; _win.sizeKey = sizeKey;
  }
  el.style.height = Math.round(_win.lineH*4 + 8)+'px';
  const ci = lines.findIndex(l=>l.hasAttribute('data-cur'));
  const base = lines[0].offsetTop;
  const max = Math.max(0, el.scrollHeight - el.clientHeight);
  let target = 0;
  if(ci > 0) target = Math.min(max, lines[ci-1].offsetTop - base);
  if(ci === lines.length-1) target = max;
  if(_win.key !== key){ _win.key = key; _win.pos = target; }
  _win.target = target;
  el.scrollTop = _win.pos;
  if(!_win.raf && Math.abs(_win.pos-_win.target) > 0.5) _win.raf = requestAnimationFrame(stepLyricWindow);
}
function stepLyricWindow(){
  _win.raf = 0;
  const el = document.querySelector('[data-win]');
  if(!el) return;
  const d = _win.target - _win.pos;
  _win.pos = Math.abs(d) < 0.5 ? _win.target : _win.pos + d*0.12;
  el.scrollTop = _win.pos;
  if(_win.pos !== _win.target) _win.raf = requestAnimationFrame(stepLyricWindow);
}
// Song viewer / gig player switch between portrait (diagram above the
// lyrics) and landscape (lyrics left, diagram right) as the window turns.
// Landscape chord column: scale the diagram to the column's width (the |||
// handle) but never taller than the column itself.
function fitLandDia(){
  const box = document.querySelector('.land-dia'); if(!box) return;
  const inner = box.querySelector('.chordInnerScale'); if(!inner) return;
  const nh = inner.offsetHeight, nw = inner.offsetWidth; if(!nh || !nw) return;
  const sc = Math.max(0.35, Math.min(chordScaleV(), (box.clientHeight-12)/nh, (box.clientWidth-12)/nw));
  inner.style.transform = 'scale('+sc.toFixed(3)+')';
}
function isLandscape(){ return innerWidth > innerHeight && innerWidth >= 640; }
let _wasLandscape = null, _resizeT = 0;
window.addEventListener('resize', function(){
  clearTimeout(_resizeT);
  _resizeT = setTimeout(function(){
    const l = isLandscape();
    if(l !== _wasLandscape && ['song','gigplayer','practice'].includes(ST.screen)) render();
    _wasLandscape = l;
  }, 120);
});

let _histScreen = null, _poppingHistState = false;
window.addEventListener('popstate', function(e){
  _poppingHistState = true;
  stopOnsetListening();
  ST.screen = (e.state && e.state.screen) || 'home';
  ST.menu=false; ST.qrOpen=false; ST.sortOpen=false;
  render();
  _poppingHistState = false;
});

/* ============================================================
   ACTIONS
   ============================================================ */
function autoChordsFor(lyrics){
  const cyc = ['Am','F','G','C'], out = {};
  parseLyrics(lyrics).forEach((ws,li)=>{ out[li+'-0']=cyc[li%4]; if(ws.length>3) out[li+'-'+Math.floor(ws.length/2)]=cyc[(li+1)%4]; });
  return out;
}
// Pattern recognition for chords: when a chord is placed on word `wi` of
// line `li`, any OTHER line whose text is identical (e.g. a repeated verse
// or chorus line) gets the same chord at the same word position — but only
// where that spot is still empty, so it never overwrites a chord the user
// already set differently on a particular repeat.
// The same word position on every OTHER line with identical text that has
// no chord there yet.
function repeatSpots(s, li, wi){
  const out = [];
  if(isNaN(li) || isNaN(wi)) return out;
  const lines = parseLyrics(s.lyrics);
  const ws0 = lines[li]; if(!ws0 || isHeaderLine(ws0)) return out;
  const target = ws0.join(' ').toLowerCase();
  if(!target) return out;
  lines.forEach((ws, i)=>{
    if(i===li || isHeaderLine(ws)) return;
    if(ws.join(' ').toLowerCase() !== target) return;
    const id = i+'-'+wi;
    if(wi < ws.length && !s.chords[id]) out.push(id);
  });
  return out;
}
function applyChordPatternToRepeats(s, li, wi, chordVal){
  repeatSpots(s, li, wi).forEach(id=>{ s.chords[id] = chordVal; });
}
// Drag & drop on the Chords step: drop a chord on a word (filling the same
// spot on every repeat of that line), move a placed chord to another word,
// or drag a placed chord off the lyrics to remove it.
function dropChord(chord, from, to){
  const s = D.songs[ST.editId]; if(!s || !chord) return;
  if(from && from===to) return;
  if(from) delete s.chords[from];
  if(to){
    s.chords[to] = chord; recordRecentChord(chord);
    const [li, wi] = String(to).split('-').map(Number);
    applyChordPatternToRepeats(s, li, wi, chord);
    const p = splitChordStr(chord); ST.selRoot = p.root; ST.selSuffix = p.q;
  }
  render();
  queueSaveSong(ST.editId);
}
/* ============================================================
   CHORD-SHEET TEXT IMPORT ("From File" → a plain-text document of
   lyrics with chord names on their own line above them, the common
   .txt/.md chord-sheet format). Audio/video files keep using the
   real recording pipeline above; PDF/Word parsing is not implemented
   yet and is rejected with a clear message instead of silently failing.
   ============================================================ */
function looksLikeChordToken(t){
  return /^[A-G](#|b)?(m|maj7|m6|m7|6|7|9|11|13|sus2|sus4|dim7?|aug|add9)?(\/[A-G](#|b)?)?$/.test(t);
}
function looksLikeChordLine(line){
  const trimmed = (line||'').trim();
  if(!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  return tokens.every(looksLikeChordToken);
}
function parseChordSheetText(text){
  let rawLines = (text||'').replace(/\r\n?/g,'\n').split('\n');
  // Common chord-sheet convention: a title (and optionally a sub/artist
  // line) on their own, followed by a blank line, before the lyrics proper.
  // Detected only when that shape is actually there — never guessed from
  // the lyrics themselves — so a plain lyrics-only file is untouched.
  let title = '', sub = '';
  if(rawLines[0] && rawLines[0].trim() && !looksLikeChordLine(rawLines[0])){
    if(rawLines[1]!==undefined && !rawLines[1].trim()){
      title = rawLines[0].trim();
      rawLines = rawLines.slice(2);
    } else if(rawLines[1]!==undefined && rawLines[1].trim() && !looksLikeChordLine(rawLines[1]) && rawLines[2]!==undefined && !rawLines[2].trim()){
      title = rawLines[0].trim(); sub = rawLines[1].trim();
      rawLines = rawLines.slice(3);
    }
  }
  const lyricLines = []; const chordMap = {}; let li = 0;
  for(let i=0;i<rawLines.length;i++){
    const line = rawLines[i];
    const next = rawLines[i+1];
    if(looksLikeChordLine(line) && next!==undefined && next.trim() && !looksLikeChordLine(next)){
      const words = next.trim().split(/\s+/);
      line.trim().split(/\s+/).forEach((ch,ci)=>{ if(ci<words.length) chordMap[li+'-'+ci] = ch; });
      lyricLines.push(next.trim()); li++; i++;
    } else if(looksLikeChordLine(line)){
      continue; // a chord-only line with nothing to attach it to (e.g. an intro) — skip
    } else {
      lyricLines.push(line.trim());
      if(line.trim()) li++;
    }
  }
  return { lyrics: lyricLines.join('\n').trim(), chords: chordMap, title, sub };
}
/* ============================================================
   "FROM FILE" — the Text import 01 engine (sheet-import.js, the same code
   as test-chordsheet.html): .txt/.md and .pdf (with OCR for scanned
   pages), chords placed over the word they're written above, end-of-line
   chords kept, page numbers dropped, lyric lines split across a page break
   re-joined to their chords, and title + artist read from the header.
   ============================================================ */
function isSheetFile(file){
  return /\.(txt|md|pdf)$/i.test(file.name||'') || /^text\//.test(file.type||'') || file.type==='application/pdf';
}
let sheetImportMod = null;
async function readSheetFile(file, onLog){
  if(!sheetImportMod) sheetImportMod = await import('./sheet-import.js?v=1');
  return sheetImportMod.importSheetFile(file, { onLog });
}
// Turns the engine's blocks into Singa's song shape: one lyrics line per
// sung line, section names as "[Verse 1]" header lines, chords keyed by
// "line-word", and end-of-line chords as "line-t0", "line-t1"…
function applySheetToSong(songObj, res, overwriteTitle){
  const lines = [], chords = {};
  let li = 0;
  (res.blocks||[]).forEach(b=>{
    if(b.type==='label'){ if(lines.length) lines.push(''); lines.push('['+b.text+']'); li++; return; }
    if(b.type==='standalone-chords'){ lines.push('['+b.text+']'); li++; return; }
    const ws = b.words.map(w=>String(w.text).replace(/\s+/g,'')).filter(Boolean);
    if(!ws.length) return;
    const tail = (b.tail||[]).slice();
    Object.keys(b.chordMap||{}).map(Number).sort((a,b)=>a-b).forEach(idx=>{
      const list = [].concat(b.chordMap[idx]);
      chords[li+'-'+idx] = list.shift();
      // a second chord written over the same word goes on the next word if
      // that has none, or after the line if it's the last word
      list.forEach(c=>{
        if(idx+1<ws.length && !(b.chordMap||{})[idx+1] && !chords[li+'-'+(idx+1)]) chords[li+'-'+(idx+1)] = c;
        else if(idx===ws.length-1) tail.unshift(c);
        else chords[li+'-'+idx] += ' '+c;
      });
    });
    tail.forEach((c,k)=>{ chords[li+'-t'+k] = c; });
    lines.push(ws.join(' ')); li++;
  });
  songObj.lyrics = lines.join('\n').trim();
  songObj.chords = chords;
  if(res.title && (overwriteTitle || !songObj.title.trim())) songObj.title = res.title;
  if(res.artist && (overwriteTitle || !songObj.sub.trim())) songObj.sub = res.artist;
}
/* ============================================================
   BACKGROUND IMPORTS
   Capturing a song from a recording or a file runs as a "job". While it
   runs on the Create screen you can choose "Continue in the background":
   the job keeps going, you're free to use the app, and the finished song
   lands in your library marked REVIEW.
   ============================================================ */
function newJob(songId, label, bg){
  const j = { id:'j'+Date.now()+Math.random().toString(36).slice(2,6), songId, label, pct:0, note:'', bg:!!bg };
  ST.jobs = [...ST.jobs, j];
  if(!bg){ ST.fgJob = j.id; ST.phase='processing'; ST.procPct=0; ST.procNote=''; }
  return j;
}
function jobProgress(j, pct, note){
  j.pct = pct; if(note) j.note = note;
  if(ST.fgJob===j.id){ ST.procPct = pct; ST.procNote = j.note; render(); return; }
  const bar = document.getElementById('jobbar-'+j.id); if(bar) bar.style.width = Math.round(pct)+'%';
  const nt = document.getElementById('jobnote-'+j.id); if(nt) nt.textContent = j.note;
}
function endJob(j){
  ST.jobs = ST.jobs.filter(x=>x.id!==j.id);
  const wasFg = ST.fgJob===j.id;
  if(wasFg){ ST.fgJob=null; ST.phase='idle'; ST.procPct=0; ST.procNote=''; }
  return wasFg;
}
// A captured song is ready: open the review screen if you're still watching,
// otherwise mark it for review and let you know.
function jobFinished(j, songObj){
  const wasFg = endJob(j);
  if(!D.order.includes(songObj.id)){ D.order = [songObj.id, ...D.order]; }
  const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  if(!songObj.title.trim()) songObj.title = 'Untitled song';
  if(wasFg){
    songObj.needsReview = true;
    ST.editId = songObj.id; ST.screen = 'review';
    render();
  } else {
    songObj.needsReview = true;
    addSongToTarget(songObj.id, j.target);
    render();
    toast('“'+songObj.title+'” is ready — open it to review');
    notifyReady(songObj.title);
  }
  saveSongRow(songObj);
}
function jobFailed(j, msg){
  const wasFg = endJob(j);
  const s = D.songs[j.songId];
  if(s && !(s.lyrics||'').trim() && !s.synced){
    delete D.songs[s.id]; D.order = D.order.filter(x=>x!==s.id);
    const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  }
  render();
  toast(msg);
  return wasFg;
}
// "Add songs" from a gig or playlist remembers where the new song should go.
function addSongToTarget(songId, target){
  if(!target || !songId) return;
  if(target.kind==='playlist'){ const p = D.playlists.find(x=>x.id===target.id); if(p && !p.auto && !p.ids.includes(songId)){ p.ids = [...p.ids, songId]; queueSavePlaylist(p.id); } }
  else if(target.kind==='gig'){ const g = D.gigs.find(x=>x.id===target.id); if(g && !g.setlist.includes(songId)){ g.setlist = [...g.setlist, songId]; queueSaveGig(g.id); } }
  else if(target.kind==='gigedit'){ if(ST.editList && !ST.editList.includes(songId)) ST.editList = [...ST.editList, songId]; }
}
// Text import 01 for one file, as a background job.
async function importSheetJob(s, file, j){
  jobProgress(j, 10, 'Reading '+file.name+'…');
  let res;
  try{
    res = await readSheetFile(file, msg=>jobProgress(j, Math.min(90, j.pct+8), msg));
  }catch(e){
    console.error('Singa: file import failed', e);
    jobFailed(j, "Couldn't read “"+file.name+"”: "+(e && e.message || e));
    return;
  }
  applySheetToSong(s, res, !s.title.trim());
  if(!s.title.trim()) s.title = file.name.replace(/\.[^.]+$/, '').replace(/_+/g,' ').trim();
  if(!s.lyrics.trim()){ jobFailed(j, "Couldn't find any lyrics in “"+file.name+"”"); return; }
  s.synced = false;
  jobFinished(j, s);
}
// Uploading a document or a recording never makes you wait: each file
// becomes a song marked IN PROGRESS in your songs, the work runs in the
// background, and you get a "we'll let you know" screen right away. When
// it's done the song is marked REVIEW and you're told (in the app, and
// with a notification if you allowed them).
let _importAudioQueue = Promise.resolve();
function queueImports(files){
  askNotify();
  const target = ST.addTarget; ST.addTarget = null;
  const draft = ST.screen==='create' ? D.songs[ST.editId] : null;
  const labels = [];
  let skipped = 0;
  files.forEach(f=>{
    if(/\.docx?$/i.test(f.name||'')){ skipped++; return; }
    let songObj;
    if(draft && !labels.length && !(draft.lyrics||'').trim() && !draft.synced) songObj = draft;   // keep a title you already typed
    else {
      const id = 'n'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
      songObj = { id, title:'', sub:'', lyrics:'', chords:{}, notes:{}, synced:false, isPublic:false, plays:0, added:Date.now(), mine:true };
      D.songs[id] = songObj;
    }
    if(!D.order.includes(songObj.id)) D.order = [songObj.id, ...D.order];
    const base = (f.name||'').replace(/\.[^.]+$/, '').replace(/_+/g,' ').trim();
    const label = songObj.title.trim() || base || 'Your recording';
    const j = newJob(songObj.id, label, true); j.target = target; j.note = 'Waiting…';
    labels.push(label);
    if(f.name && isSheetFile(f)) importSheetJob(songObj, f, j).catch(e=>console.error('Singa: import failed', e));
    else _importAudioQueue = _importAudioQueue.then(()=>processRecordingFromScratch(songObj, f, j)).catch(e=>console.error('Singa: audio import failed', e));
  });
  const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  if(skipped) toast("Word files aren't supported — save them as PDF or .txt");
  if(!labels.length){ render(); return; }
  ST.phase='idle'; ST.selWord=null; ST.queued = labels; ST.screen='queued';
  render();
}
function askNotify(){
  try{ if('Notification' in window && Notification.permission==='default') Notification.requestPermission().catch(()=>{}); }catch(e){}
}
function notifyReady(title){
  try{
    if(!('Notification' in window) || Notification.permission!=='granted' || !document.hidden) return;
    const body = '“'+title+'” is ready — open it to review';
    const plain = ()=>{ try{ new Notification('Singa', { body }); }catch(e){} };
    if(navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r=>r.showNotification('Singa', { body, tag:'singa-ready-'+Date.now() })).catch(plain);
    else plain();
  }catch(e){}
}
function openSongOrIncomplete(id, from){
  stopOnsetListening();
  const s = song(id);
  if(ST.jobs.some(j=>j.songId===id)){ toast('Still being added — we\'ll let you know when it\'s ready'); return; }
  if(s.needsReview){ ST.editId = id; ST.screen='review'; ST.back = from || 'home'; return; }
  const ok = s.lyrics && s.lyrics.trim();
  ST.songId = id; ST.viewBy=null; ST.viewChord=null; ST.menu=false; ST.instMenu=false; ST.ctx='view'; ST.t=0; ST.playing=false; ST.vcd=0; ST.listening=false; ST.sortOpen=false;
  ST.screen = ok ? 'song' : 'incomplete';
  ST.back = from || ST.screen;
}
function newSongDraft(){
  const id = 'n'+Date.now();
  D.songs[id] = { id, title:'', sub:'', lyrics:'', chords:{}, notes:{}, synced:false, isPublic:false, plays:0, added:Date.now(), mine:true };
  D.order = [id, ...D.order];
  ST.editId = id; ST.screen='create'; ST.createMode='manual'; ST.step='lyrics'; ST.phase='idle'; ST.selWord=null; ST.similar=false; ST.menu=false; ST.sortOpen=false; ST.editorLine=0;
}
// Leaving Create (back chevron or the Singa logo): a running capture keeps
// going in the background; an untouched empty draft is thrown away.
function exitCreate(){
  if(ST.phase==='processing'){
    if(ST.fgJob){ Actions.continueInBackground(); return; }
    toast('Finishing the sync — one moment'); return;
  }
  if(ST.phase==='countdown' || ST.phase==='recording') Actions.abortRecord();
  if(ST.phase==='practicing'){ ST.phase='idle'; ST.recT=0; }
  stopOnsetListening();
  const s = D.songs[ST.editId];
  if(s && !s.synced && !s.lyrics.trim() && !s.title.trim()){
    delete D.songs[s.id]; D.order = D.order.filter(x=>x!==s.id);
    const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  } else if(s) queueSaveSong(s.id);
  ST.addTarget=null; ST.selWord=null; ST.screen='home'; render();
}
// Saves a song as done: title fallback, into the library (and the gig or
// playlist you were adding to), written to the database.
function finalizeSong(s){
  if(!s.title.trim()) s.title = 'Untitled song';
  s.needsReview = false;
  if(!D.order.includes(s.id)) D.order = [s.id, ...D.order];
  const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  addSongToTarget(s.id, ST.addTarget); ST.addTarget = null;
  saveSongRow(s);
}
// End of a recorded take in the manual flow (or an edit's Retake).
function finishSong(){
  const id = ST.editId, s = D.songs[id];
  s.synced = true;
  // No made-up content: empty lyrics stay empty rather than a demo song.
  // Pattern chords only when you explicitly chose "detect chords" (Skip).
  if(s.lyrics.trim() && ST.autoChords && !Object.keys(s.chords).length) s.chords = autoChordsFor(s.lyrics);
  ST.phase='idle'; ST.procPct=0; ST.procNote=''; ST.autoChords=false; ST.songId=id;
  if(ST.editing){ saveSongRow(s); ST.step='chords'; toast('New take synced'); return; }
  finalizeSong(s);
  ST.screen='done';
}

/* ============================================================
   REAL AUDIO ENGINE
   Replaces the old simulated recording (random waveform bars, a fake
   progress bar, then a canned demo song regardless of what you did) with
   real microphone / file capture, real speech-to-text, and real
   force-aligned per-word timestamps — ported from song-builder.html's
   working engine. Vocal isolation (on-device Demucs) is NOT ported yet;
   chords are still assigned from the built-in pattern-based guesser
   (autoChordsFor) rather than detected from the recording's pitch.
   ============================================================ */
let liveStream=null, liveRecorder=null, liveChunks=[], liveAudioCtx=null, liveAnalyser=null, liveDataArr=null, liveAborting=false, recordingStartPending=false;
// Microphone access requested up front by Actions.startRecord(), BEFORE the
// 3-2-1 countdown starts — so the browser's "allow microphone" prompt shows
// immediately on tapping Record, not after the countdown finishes. Consumed
// (and cleared) by beginRealRecording() once the countdown ends.
let pendingMicStream=null;

function sampleLiveLevel(){
  if(!liveAnalyser || !liveDataArr) return null;
  liveAnalyser.getByteTimeDomainData(liveDataArr);
  let sum=0;
  for(let i=0;i<liveDataArr.length;i++){ const v=(liveDataArr[i]-128)/128; sum+=v*v; }
  const rms = Math.sqrt(sum/liveDataArr.length);
  return Math.max(4, Math.min(100, Math.round(rms*420)+8));
}

async function beginRealRecording(){
  let stream = pendingMicStream;
  pendingMicStream = null;
  if(!stream){
    // Fallback path — only hit if something reaches this without having
    // gone through Actions.startRecord() first (which normally already
    // acquired the mic before the countdown began).
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      toast('Microphone not available on this device/browser'); ST.phase='idle'; render(); return;
    }
    try{ stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
    catch(err){ toast('Mic error: '+(err && err.name || err)); ST.phase='idle'; render(); return; }
  }
  let recorder;
  try{ recorder = new MediaRecorder(stream); }
  catch(err){ toast('Recording is not supported in this browser'); stream.getTracks().forEach(t=>t.stop()); ST.phase='idle'; render(); return; }
  const actx = new (window.AudioContext||window.webkitAudioContext)();
  const src = actx.createMediaStreamSource(stream);
  const analyser = actx.createAnalyser(); analyser.fftSize = 256;
  src.connect(analyser);
  liveStream=stream; liveRecorder=recorder; liveAudioCtx=actx; liveAnalyser=analyser;
  liveDataArr = new Uint8Array(analyser.frequencyBinCount);
  liveChunks = []; liveAborting = false;
  recorder.ondataavailable = e=>{ if(e.data && e.data.size>0) liveChunks.push(e.data); };
  recorder.onstop = async ()=>{
    const chunks = liveChunks, mimeType = recorder.mimeType || 'audio/webm', wasAborting = liveAborting;
    stream.getTracks().forEach(t=>t.stop());
    actx.close().catch(()=>{});
    liveStream=null; liveRecorder=null; liveAudioCtx=null; liveAnalyser=null; liveDataArr=null; liveChunks=[]; liveAborting=false;
    if(wasAborting){ ST.phase='idle'; ST.bars=[]; render(); return; }
    const blob = new Blob(chunks, { type: mimeType });
    const s = D.songs[ST.editId];
    await processRecordingBlob(s, blob);
  };
  recorder.start();
  ST.phase='recording'; ST.recT=0; ST.bars=[]; render();
}

function decodeToFloat32Mono16k(blob){
  return blob.arrayBuffer().then(arrayBuf=>{
    const tmpCtx = new (window.AudioContext||window.webkitAudioContext)();
    return tmpCtx.decodeAudioData(arrayBuf.slice(0)).then(decoded=>{
      const durationSec = decoded.duration;
      const targetLen = Math.max(1, Math.ceil(durationSec*16000));
      const offline = new OfflineAudioContext(1, targetLen, 16000);
      const bufSrc = offline.createBufferSource();
      bufSrc.buffer = decoded; bufSrc.connect(offline.destination); bufSrc.start();
      return offline.startRendering().then(rendered=>{
        tmpCtx.close().catch(()=>{});
        return { float32: rendered.getChannelData(0), durationSec };
      });
    });
  });
}

function normWord(w){ return (w||'').toLowerCase().replace(/[^a-z0-9'’]/g,''); }

// Classic edit-distance alignment of the typed/recognized lyric words (ref)
// against the speech-recognizer's words (hyp) — for each ref word, finds the
// best-matching hyp word (or null), so real timestamps can be looked up.
