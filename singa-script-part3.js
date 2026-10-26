"use strict";
/* Styles for the chords editor, markings, sticky note and players. They ship
   inside the script (not only in the page's <style>) so a browser holding an
   older cached copy of the page still gets them with the new code. */
(function(){
  if(document.getElementById('singa-ui-css')) return;
  const st = document.createElement('style'); st.id = 'singa-ui-css';
  st.textContent = `
/* ---- lyric marks: left / right of the word, or above it with an arrow down ---- */
.lchord-row{display:flex;align-items:flex-end;gap:4px;min-height:18px}
.lchord-row.solo{justify-content:center}
.lmark{position:relative;height:26px;display:block}
.lmark .mk{position:absolute;bottom:3px;white-space:nowrap;color:var(--chordblue);pointer-events:none}
.lmark .mk.mk-c{left:50%;transform:translateX(-50%)}
.lline .mtext{font-family:Caveat,cursive;font-size:25px;font-weight:600;line-height:1;color:var(--chordblue)}
.marr-v{position:relative;flex:none;width:2.2px;align-self:stretch;margin:-5px 1px -3px;background:var(--chordblue);border-radius:1px}
.marr-v::after{content:'';position:absolute;left:50%;bottom:0;width:9px;height:9px;box-sizing:border-box;border-right:2.2px solid var(--chordblue);border-bottom:2.2px solid var(--chordblue);transform:translate(-50%,-1px) rotate(45deg)}
.lside .mside{display:flex;align-items:center;gap:3px;color:var(--chordblue);white-space:nowrap}
.marr-h{flex:none;color:var(--chordblue)}

/* left/right marks hang outside the line, never pushing it */
.lword .ltext{position:relative}
.mside-abs{position:absolute;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:3px;white-space:nowrap;color:var(--chordblue);pointer-events:none;font-weight:600}
.mside-abs.l{right:100%;margin-right:8px;text-align:right}
.mside-abs.r{left:100%;margin-left:8px}
.mside-abs .mtext{white-space:normal;width:max-content;max-width:min(26vw,220px);min-width:min-content}

/* piano keyboard stands upright (rotated 90deg clockwise) */
.piano-rot{position:relative;width:96px;height:314px;flex:none}
.piano-rot .piano{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(90deg)}

/* next chord slides into the current chord's place */
@keyframes chordFromNext{from{transform:translate(96px,6px) scale(.46);opacity:.55}to{transform:none;opacity:1}}
@keyframes chordFromNextV{from{transform:translateY(-80px) scale(.5);opacity:.55}to{transform:none;opacity:1}}
@keyframes nextInV{from{transform:translateY(-12px);opacity:0}to{transform:none;opacity:1}}

/* Play / Pause capsule */
.playcap{height:44px;padding:0 28px;border-radius:999px;background:#1b1b1b;color:#fff;font-size:16px;font-weight:700;border:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;flex:none;cursor:pointer}
.playcap.live{background:#f24822}

/* ---- marking editor: a light-blue sticky note ---- */
.sticky{position:relative;width:min(300px,86vw);background:#d9ecfc;border-radius:4px 4px 18px 4px;padding:30px 22px 16px;box-shadow:0 14px 34px rgba(47,143,224,.22),0 2px 6px rgba(0,0,0,.06);transform:rotate(-1.2deg);animation:singaPop .28s cubic-bezier(.2,.8,.2,1) both;display:flex;flex-direction:column;gap:10px}
.sticky-x{position:absolute;top:6px;right:6px;color:#2f6fa8}
.sticky .sticky-ipt{height:44px;border-radius:0;border:0;background:transparent;outline:none;font-family:Caveat,cursive;font-size:32px;font-weight:600;color:#1f6fc0;width:100%;padding:0;border-bottom:1.5px dashed rgba(31,111,192,.35)}
.sticky-ipt::placeholder{color:rgba(31,111,192,.45)}
.sticky-acts{display:flex;justify-content:flex-end;gap:20px;font-size:15px;font-weight:700}
.sticky-acts a{color:#2f6fa8}
.sticky-acts a.save{color:#0f4f8a}

/* ---- chords step: picker column left of the lyrics, drag & drop ---- */
.ce-wrap{flex:1;min-height:0;width:100%;max-width:880px;display:flex;gap:40px;margin-top:16px}
.ce-picker{flex:none;width:104px;display:flex;flex-direction:column;align-items:stretch;gap:10px;min-height:0}
.ce-roots{width:96px;height:62px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.ce-roots::-webkit-scrollbar{display:none}
.ce-roots-in{display:flex;height:100%}
.ce-root{flex:none;width:48px;height:62px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#c4c4c4;cursor:pointer;scroll-snap-align:start}
.ce-root.on{font-size:46px;color:#1b1b1b}
.ce-acc{align-self:flex-start;width:34px;height:34px;padding:0;border-radius:50%;border:1.5px solid #d6d6d6;background:#fff;font-size:18px;font-weight:700;color:#9a9a9a;display:flex;align-items:center;justify-content:center;line-height:1}
.ce-acc.on{border-color:#1b1b1b;background:#fff;color:#1b1b1b}
.ce-variants{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;align-items:flex-start;gap:2px;transition:opacity .4s ease;padding-bottom:6px}
.ctile,.utile{display:inline-flex;align-items:center;align-self:flex-start;height:40px;border:0;border-radius:999px;background:#fff;color:#1b1b1b;font-size:18px;font-weight:700;padding:0 14px;white-space:nowrap;cursor:grab;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;flex:none}
.ctile{touch-action:pan-y}
.utile{touch-action:pan-x;height:36px;font-size:16px}
.ce-main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0}
.ce-used{display:flex;align-items:center;gap:10px;min-height:40px;padding-bottom:16px;border-bottom:1px solid #f0f0f0}
.ce-used-l{font-size:12px;color:#8a8a8a;font-weight:700;letter-spacing:.04em;text-transform:uppercase;flex:none}
.ce-used-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;min-width:0}
.ce-used-row::-webkit-scrollbar{display:none}
.ce-lyrics{flex:1;min-height:200px;overflow-y:auto;padding-top:26px;display:flex;flex-direction:column;align-items:flex-start}
/* no grey "hover" flash on tapped words (iPad keeps :hover after a tap) */
.ce-lyrics .lword,.ce-lyrics .lword.editable:hover{background:transparent;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
.ce-lyrics .lword.drop-on{background:#e5f0fc !important}
.chip-x{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin:0 2px 3px -4px;border-radius:50%;font-size:15px;line-height:1;font-weight:700;color:#b0b0b0;cursor:pointer;-webkit-tap-highlight-color:transparent;flex:none}
.chip-x:hover{color:#1b1b1b}
body.chord-dragging .chip-x{visibility:hidden}
.lword .lchord.chip{height:auto;min-height:22px;min-width:14px;line-height:22px;border-radius:999px;padding:0 7px;margin:0 0 2px -7px;background:#fff;font-size:16px !important;font-weight:800 !important}
.lword .lchord.chip:empty{background:transparent}
.lword .lchord.chip[data-drag-chord]{cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
.lword.drop-on{background:#e5f0fc !important}
.lword .lchord.pv{color:var(--chordblue) !important}
.lword .lchord.pv-fill{color:#9cc7ee !important}
.lchord.drag-src{opacity:.25}
.chord-ghost{position:fixed;z-index:300;pointer-events:none;transform:translate(-50%,-120%);background:#fff;color:#1b1b1b;font-size:18px;font-weight:800;padding:6px 14px;border-radius:999px}
body.chord-dragging,body.chord-dragging *{cursor:grabbing !important;-webkit-user-select:none;user-select:none}

/* ---- players: 4-line window, portrait / landscape ---- */
.lyr-area{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center}
.lyr-area.live{justify-content:center}
.lyr-scroll{flex:1;min-height:0;width:100%;overflow:auto;display:flex;flex-direction:column;align-items:center;padding:20px 0 40%}
.lyr-win{width:100%;overflow:hidden;display:flex;flex-direction:column;align-items:center;flex:none;max-height:100%;-webkit-mask-image:linear-gradient(180deg,#000 0,#000 85%,transparent 100%);mask-image:linear-gradient(180deg,#000 0,#000 85%,transparent 100%)}
.land-grid{flex:1;min-height:0;display:flex;align-items:stretch;gap:6px;margin-top:10px}
.land-grid .lyr-area{min-width:0}
.land-handle{flex:none;width:22px;display:flex;align-items:center;justify-content:center;cursor:ew-resize;touch-action:none;color:#b0b0b0}
.land-dia{flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;border-left:1px solid var(--b2)}
.land-dia .chordInnerScale{display:flex;flex-direction:column;align-items:center;transform-origin:center}
.dia-v{display:flex;flex-direction:column;align-items:center;gap:8px}
.dia-v-next{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:70px}
.dia-v .diaNext{font-size:26px;font-weight:600}
.dia-v .fretboard{margin-top:26px}
.song-main{flex:1;min-height:0;min-width:0;display:flex;flex-direction:column;padding:20px clamp(16px,4vw,48px) 0}
@media(max-width:759px){.songlist .gigplayer-side{max-height:150px;padding:12px 16px}}

/* short landscape screens (phones on their side): tighter chrome */
@media (max-height:520px){
  body.fixed-screen #topbar{height:40px}
  body.fixed-screen .scr{padding-top:8px}
  .ce-lyrics{min-height:0}
  .ce-wrap{margin-top:6px}
  .ce-roots{height:44px} .ce-root{height:44px} .ce-root.on{font-size:34px}
  .ctile{height:36px;font-size:15px}
  .cs-title{display:none}
  .ce-used{padding-bottom:4px}
  .ce-lyrics{padding-top:6px}
  .ce-foot{flex-direction:row !important;justify-content:center;padding-top:6px !important;margin-top:6px !important}
  .ce-foot .btn{height:40px}
  .song-main{padding-top:8px}
}
.lyrics-wrap{max-width:100%}
.lyr-win .lline{max-width:none}
.lyr-win .lyrics-wrap{max-width:89%}
.lyr-win .lyrics-wrap,.lyr-scroll .lyrics-wrap{padding:0 4px}
/* playlist / gig viewers: lyrics start in line with the title */
.lyr-area.al-left,.al-left .lyr-win,.al-left .lyr-scroll{align-items:flex-start}
.al-left .lyrics-wrap,.lyr-win.al-left .lyrics-wrap{padding:0 !important;max-width:100% !important}
/* pressing Play doesn't move the lyrics: the 4-line window starts exactly
   where the still lyrics did */
.lyr-area.live{justify-content:flex-start}
.lyr-win{margin-top:20px}
/* performers see the whole song scrolling (only the audience view is 4 lines) */
.lyr-area.live .lyr-win{height:auto !important;flex:1 1 auto;min-height:0}
.spchips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.spchip{height:40px;padding:0 16px;border-radius:999px;border:1.5px solid #d6d6d6;background:#fff;font-size:15px;font-weight:700;color:#6f6f6f;white-space:nowrap}
.spchip.on{border-color:#1b1b1b;background:#1b1b1b;color:#fff}
/* the current chord + its diagram sit dead centre; the next chord hangs
   beside it (portrait) or above it (landscape) */
.diagram-row > div{position:relative}
.diagram-row .diaNextWrap{position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:26px}
.dia-v{position:relative}
.dia-v-next{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:10px}
/* tempo: set speed / audio synced */
.speedctl{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;max-width:280px}
.speedval{font-size:28px;font-weight:800;letter-spacing:-0.01em;margin-top:-6px}
.speed-range{width:100%;accent-color:#f24822;height:28px;touch-action:none}
.tempo-note{font-size:12px;color:#8a8a8a;text-align:center;line-height:1.45;max-width:340px}
.steptabs{display:flex;border-bottom:1.5px solid #e2e2e2}
.steptabs button{border:0;background:transparent;width:104px;height:42px;font-size:15px;font-weight:500;color:#8a8a8a;border-bottom:2.5px solid transparent;margin-bottom:-1.5px}
.steptabs button.on{font-weight:700;color:#1b1b1b;border-bottom-color:#1b1b1b}
.steptabs button.off{color:#c8c8c8}
@media(max-width:520px){.steptabs button{width:auto;padding:0 12px}}
/* ---- Abort: second tap confirms ---- */
.btn-danger{background:#e5372a;color:#fff;border:1.5px solid #e5372a}
/* ---- lyrics sit in the same centred place on every create step ---- */
.ce-wrap{display:grid;grid-template-columns:104px minmax(0,1fr) 104px;grid-template-rows:minmax(0,1fr);gap:24px;max-width:960px}
.ce-spacer{width:104px}
.ce-lyrics.lyr-step{align-items:stretch}
.lyr-step .lyrics-wrap{width:fit-content;max-width:100%;margin:0 auto}
.lword .lchord.chip{margin-right:-7px}
.lyr-step .lword.editable{margin:0 -2px}
.lchord-row{position:relative}
.chip-x{position:absolute;top:-8px;left:calc(100% + 2px);margin:0;width:16px;height:16px;font-size:14px;background:#fff;z-index:1}
@media(max-width:700px){.ce-wrap{grid-template-columns:96px minmax(0,1fr);gap:16px}.ce-spacer{display:none}}
/* ---- Tempo step ---- */
.tp-panel{flex:none;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:640px;margin:16px auto 0;padding-bottom:6px}
.tp-row{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;width:100%}
.tp-rec{width:142px;height:52px;font-size:15px;font-weight:600;letter-spacing:.04em}
.tp-up{width:128px;height:52px;font-size:15px;font-weight:600;letter-spacing:.04em}
.tp-link{position:relative;flex:1 1 240px;max-width:300px;height:52px;border-radius:12px;background:#f2f2f2;display:flex;align-items:center}
.tp-link input{flex:1;min-width:0;height:100%;border:0;background:transparent;padding:0 46px 0 16px;font-size:15px;letter-spacing:.04em;outline:none;border-radius:12px;color:#1b1b1b}
.tp-link input::placeholder{color:#9a9a9a}
.tp-go{position:absolute;right:6px;top:6px;width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:#c4c4c4;display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}
.tp-go.on{background:#1b1b1b;color:#fff}
.tp-switch{font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:3px;color:#1b1b1b}
.tp-speed{display:flex;align-items:center;height:52px;border:1.5px solid #1b1b1b;border-radius:12px;padding-left:6px;gap:2px;background:#fff}
.tp-sp{height:100%;border:0;background:transparent;padding:0 13px;font-size:14px;font-weight:500;letter-spacing:.06em;color:#a8a8a8;white-space:nowrap}
.tp-sp.on{color:#1b1b1b;font-weight:700}
.tp-play{width:68px;height:52px;margin:-1.5px -1.5px -1.5px 4px;border:0;border-radius:12px;background:#f24822;display:flex;align-items:center;justify-content:center;flex:none}
.tp-synced{display:flex;align-items:center;gap:12px;font-size:14px;color:#6f6f6f}
.tp-synced .tp-play{margin:0;width:52px;height:44px}
@media(max-width:560px){.tp-link{flex-basis:100%;max-width:none}}
/* ---- instrumental intro line ---- */
.lline.lintro{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:200px}
.lintro .irow{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.lintro .ilabel{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9a9a9a}
.lintro .ich{font-weight:800;color:#c4c4c4;display:inline-block;transform-origin:left bottom}
.lintro.on .ich{color:#8a8a8a}
.lintro .ich.on{color:#f24822}
.lintro .itime{font-size:12px;font-weight:700;color:#b0b0b0;font-variant-numeric:tabular-nums}
.lintro .ibar{width:100%;min-width:200px;height:4px;border-radius:2px;background:#ececec;overflow:hidden}
.lintro .ibar>div{height:100%;background:#f24822;border-radius:2px;transition:width .12s linear}
.lintro:not(.on) .ibar>div{background:#cfcfcf}
`;
  document.head.appendChild(st);
})();
function renderSearch(){
  const q = ST.searchQuery.trim().toLowerCase();
  const match = r => !q || ((r.title||'')+' '+(r.sub||'')).toLowerCase().includes(q);
  const songsRows = sortRows(D.order.map(id=>({id,...song(id)})).filter(match));
  const plRows = sortRows(D.playlists.filter(match));
  const gigRows = sortRows(D.gigs.filter(match));
  const sections = [];
  if(songsRows.length) sections.push(`<div><div style="font-size:24px;font-weight:700;padding-bottom:8px;border-bottom:1px solid var(--b2)">Songs</div>${songsRows.map(r=>songRowList(r.id, r.synced?'SYNCED':'NO TAKE', r.synced?'#1b1b1b':'#b0b0b0','search')).join('')}</div>`);
  if(plRows.length) sections.push(`<div><div style="font-size:24px;font-weight:700;padding-bottom:8px;border-bottom:1px solid var(--b2)">Playlists</div>${plRows.map(playlistRow).join('')}</div>`);
  if(gigRows.length) sections.push(`<div><div style="font-size:24px;font-weight:700;padding-bottom:8px;border-bottom:1px solid var(--b2)">Gigs</div>${gigRows.map(gigRowList).join('')}</div>`);
  return `<div class="scr">
    <div class="search-field" style="max-width:340px;margin-bottom:28px">
      <input placeholder="Search songs, playlists or gigs" value="${esc(ST.searchQuery)}" data-bind="searchQuery" autofocus inputmode="search" enterkeyhint="search">${icon('search',22)}
    </div>
    <div class="row" style="gap:14px;position:relative;z-index:2;margin-bottom:24px">
      <span class="icon-btn" data-act="nav" data-to="home">${icon('chevron_left',26)}</span>
      <span style="font-size:28px;font-weight:700">Search Results</span>
      <div style="flex:1"></div>
      ${sortDropdown()}
    </div>
    <div style="display:flex;flex-direction:column;gap:40px;overflow:auto">
      ${sections.join('') || `<div style="color:#8a8a8a;font-size:15px">No songs, playlists or gigs match "${esc(ST.searchQuery)}".</div>`}
    </div>
  </div>`;
}
/* ============================================================
   SCREENS: Account / Collaborators
   ============================================================ */
// Account & settings open as a side panel over whatever screen you're on,
// grouped: who you are · how you play · gigs · plan · app.
function radioHTML(on, act, id, label){
  return `<div class="row" style="gap:8px;cursor:pointer;padding:6px 0" data-act="${act}" data-id="${id}">
    <span style="width:20px;height:20px;border-radius:50%;border:1.5px solid var(--fg);display:flex;align-items:center;justify-content:center"><span style="width:10px;height:10px;border-radius:50%;background:var(--fg);opacity:${on?1:0}"></span></span>
    <span style="font-size:15px;font-weight:600">${label}</span></div>`;
}
function renderAccountPanel(){
  const planName = ST.plan==='rockstar' ? 'RockStar' : 'Free';
  const planSub = ST.plan==='rockstar' ? '$4.99 / month' : 'Basic features for performing with Singa';
  const name = ST.nickname || nicknameFromEmail(ST.email);
  const collabRows = D.collabs.map((c,i)=>`<div class="list-row" data-act="editCollab" data-id="${i}"><div><div class="t">${esc(c.name)}</div><div class="s">${c.gigs.length} ${c.gigs.length===1?'gig':'gigs'}</div></div>${icon('chevron_right',22)}</div>`).join('');
  const instRadio = INSTS.map(([v,label])=>radioHTML(ST.instrument===v, 'setInstrument', v, label)).join('');
  const startHint = ST.startMode==='countdown' ? 'Press start and Singa counts down from 3.' : 'Singa listens and starts when you start singing.';
  const notifRows = [['req','Song requests'],['photos','Guest photos'],['chat','Chat messages']].map(([k,label])=>{
    const on = ST.notif[k];
    return `<div class="row" style="gap:14px;padding:8px 0;cursor:pointer" data-act="toggleNotif" data-id="${k}">
      <div class="toggle" style="background:${on?'#1b1b1b':'#fff'}"><div class="dot" style="left:${on?20:2}px;background:${on?'#fff':'#1b1b1b'}"></div></div>
      <span style="font-size:15px;font-weight:600">${label}</span></div>`;
  }).join('');
  const sec = (title, body)=>`<div class="ap-sec"><div class="ap-h">${title}</div>${body}</div>`;
  return `<div class="sidepanel-backdrop" data-act="closeAccount"></div>
  <aside class="sidepanel">
    <div class="row" style="gap:14px;align-items:center">
      <div style="width:52px;height:52px;border-radius:50%;background:#1b1b1b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex:none">${esc((name||'?').charAt(0).toUpperCase())}</div>
      <div style="flex:1;min-width:0"><div style="font-size:19px;font-weight:700">${esc(name)}</div><div style="font-size:13px;color:#8a8a8a;overflow:hidden;text-overflow:ellipsis">${esc(ST.email||'Not signed in')}</div></div>
      <span class="icon-btn" data-act="closeAccount">${icon('close',24)}</span>
    </div>
    ${sec('Profile', `<div class="list-row" data-act="editNickname"><div><div class="s" style="margin:0 0 3px">Nickname · shown to collaborators and guests</div><div class="t">${esc(name)}</div></div>${icon('chevron_right',22)}</div>`)}
    ${sec('Playing', `<div style="font-size:13px;color:#8a8a8a;margin:2px 0 4px">Chord diagrams for</div><div style="display:flex;gap:6px 20px;flex-wrap:wrap">${instRadio}</div>
      <div style="font-size:13px;color:#8a8a8a;margin:14px 0 8px">Start songs with — ${startHint}</div>
      <div style="display:flex;gap:6px 20px;flex-wrap:wrap">${[['countdown','Countdown'],['detect','Start detection']].map(([v,label])=>radioHTML(ST.startMode===v, 'setStartMode', v, label)).join('')}</div>`)}
    ${sec('Gigs', `<div style="font-size:13px;color:#8a8a8a;margin:2px 0 2px">Notify me during gigs</div>${notifRows}
      <div style="font-size:13px;color:#8a8a8a;margin:14px 0 0">Collaborators</div>${collabRows}
      <a class="link" style="display:inline-flex;align-items:center;gap:6px;margin-top:10px" data-act="newCollab">${icon('person_add',20)}Add collaborator</a>`)}
    ${sec('Plan', `<div class="row" style="justify-content:space-between;gap:12px"><div><div style="font-size:16px;font-weight:700">${planName}</div><div style="font-size:13px;color:#8a8a8a;margin-top:3px">${planSub}</div></div>
      ${ST.plan!=='rockstar' ? `<button class="btn btn-accent btn-sm" style="display:flex;align-items:center;gap:4px" data-act="openUpgrade">${icon('bolt',18)}Upgrade</button>` : `<a class="link link-muted" style="text-decoration:underline" data-act="downgrade">Switch to Free</a>`}</div>`)}
    ${sec('App', `<div class="row" style="justify-content:space-between;gap:12px"><div><div style="font-size:15px;font-weight:600">Reinstall latest version</div><div style="font-size:13px;color:#8a8a8a;margin-top:3px">If the app looks out of date</div></div><button class="btn btn-outline btn-sm" data-act="rebootApp">Reinstall</button></div>`)}
    <a class="link link-accent" style="margin-top:6px" data-act="signOut">Sign out</a>
  </aside>`;
}

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
  const canBg = !!ST.fgJob;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:40px">
    <div style="font-size:22px;font-weight:700">Applying magic…</div>
    <div style="width:300px;max-width:80vw;height:8px;border-radius:4px;background:#e6e6e6;overflow:hidden"><div style="height:100%;width:${Math.round(ST.procPct)}%;background:#1b1b1b;border-radius:4px;transition:width .4s"></div></div>
    <div style="font-size:14px;color:#6f6f6f;text-align:center;max-width:420px">${esc(ST.procNote) || STAGES[Math.min(3,Math.floor(ST.procPct/25))]}</div>
    ${canBg ? `<button class="btn btn-outline btn-sm" style="margin-top:18px" data-act="continueInBackground">Continue in the background</button>
    <div style="font-size:12px;color:#8a8a8a;text-align:center">This will add a new song to your library when it's done — you can review it then.</div>` : ''}
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
// Practice: the mic listens (nothing is recorded) and the lyrics follow
// your singing — they wait for you to start and hold when you stop.
function practiceBlock(){
  const waiting = ST.pracState!=='following';
  const lvl = Math.max(0, Math.min(1, (ST.pracLevel||0)/12));
  const singing = !waiting && performance.now() - (ST.pracHeardAt||0) < 1500;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:18px;margin-top:6px">
    <div class="row" style="gap:10px;font-size:15px;font-weight:600">
      <span style="width:12px;height:12px;border-radius:50%;background:#f24822;opacity:${(0.3+lvl*0.7).toFixed(2)};transform:scale(${(0.8+lvl*0.6).toFixed(2)});transition:transform .1s,opacity .1s"></span>
      ${waiting ? 'Listening — start singing' : (singing ? 'Following you' : 'Waiting for you to carry on')}
    </div>
    <div style="font-size:13px;color:#8a8a8a;text-align:center;max-width:340px;line-height:1.45">The lyrics move with your singing. Nothing is being recorded.</div>
    <button class="btn btn-outline" style="width:170px" data-act="stopPractice">Stop</button>
  </div>`;
}
// A song needs a title. Lyrics are optional: leave them blank and they're
// captured from a recording (Tempo step) — but typed lyrics need at least 3
// sung words. Chords and Markings need lyrics to work on.
function lyricWordCount(d){ return parseLyrics(d && d.lyrics).filter(ws=>!isHeaderLine(ws)).reduce((n,ws)=>n+ws.length,0); }
function hasLyrics(d){ return lyricWordCount(d) >= 3; }
function lyricsReady(d){ const n = lyricWordCount(d); return !!(d && (d.title||'').trim()) && (n===0 || n>=3); }
function lyricsMissing(d){
  const t = !(d.title||'').trim(), n = lyricWordCount(d);
  if(t) return 'Add a title to continue';
  if(n>0 && n<3) return 'Add at least 3 words of lyrics (or clear them) to continue';
  return '';
}
// The Abort button needs a second tap: the first one turns it red.
function abortBtnHTML(w, h){
  const armed = ST.abortArm && Date.now() - ST.abortArm < 3000;
  return `<button class="btn ${armed?'btn-danger':'btn-outline'}" style="width:${w}px${h?';height:'+h+'px':''}" data-act="abortCreate">${armed?'Confirm abort':'Abort'}</button>`;
}
// Typing the title / lyrics never re-renders the screen (that would close
// the on-screen keyboard after every key): only the hint, Next and the step
// tabs are updated in place.
function refreshLyricsGate(){
  const d = D.songs[ST.editId]; if(!d) return;
  const ok = lyricsReady(d), lyr = hasLyrics(d);
  const m = document.getElementById('lyricsMissing'); if(m) m.textContent = lyricsMissing(d);
  const b = document.getElementById('lyricsNextBtn'); if(b){ b.classList.toggle('btn-dark', ok); b.classList.toggle('btn-disabled', !ok); }
  document.querySelectorAll('.steptabs button').forEach(t=>{ if(t.classList.contains('on') || t.dataset.id==='lyrics') return; t.classList.toggle('off', !ok || (t.dataset.id!=='sync' && !lyr)); });
}
function renderManualLyrics(d){
  const ok = lyricsReady(d), missing = lyricsMissing(d);
  return `<div class="lyr-form" style="width:100%;flex:1;display:flex;flex-direction:column;gap:14px;margin-top:28px;max-width:640px;margin-left:auto;margin-right:auto">
    <div class="row" style="gap:14px">
      <input class="ipt" style="height:64px;font-size:18px;font-weight:600" placeholder="Title" value="${esc(d.title)}" data-bind="draftTitle">
      <button class="icon-btn" title="Find similar titles" style="width:48px;height:48px" data-act="openSimilar">${icon('search',26)}</button>
    </div>
    <input class="ipt" style="height:64px" placeholder="Sub title — artist, version" value="${esc(d.sub)}" data-bind="draftSub">
    <textarea class="ipt" style="min-height:300px;font-size:18px" placeholder="Add lyrics, one line per row — or leave blank to capture them from a recording" data-bind="draftLyrics">${esc(d.lyrics)}</textarea>
    ${confirmFootnote()}
    <div id="lyricsMissing" style="text-align:center;font-size:13px;color:#2f8fe0;min-height:16px">${missing}</div>
    ${ST.editing ? `<div class="row" style="align-self:center"><button id="lyricsNextBtn" class="btn ${ok?'btn-dark':'btn-disabled'}" style="width:220px;height:48px" data-act="editDone">Done</button></div>` : `<div class="row" style="gap:12px;align-self:center">
      ${abortBtnHTML(170, 48)}
      <button id="lyricsNextBtn" class="btn ${ok?'btn-dark':'btn-disabled'}" style="width:170px;height:48px" data-act="lyricsNext">Next</button>
    </div>`}
  </div>`;
}

function splitChordStr(ch){
  const m = /^([A-G][#b]?)(.*)$/.exec(ch||'');
  return m ? { root: m[1], q: m[2] } : { root: ch||'', q: '' };
}
function usedChords(s){
  const out = [];
  const add = c=>{ if(c && !out.includes(c)) out.push(c); };
  if(s){
    const tm = timing(s);
    tm.words.forEach(w=>add(s.chords[w.li+'-'+w.wi]));
    Object.keys(s.chords||{}).forEach(k=>add(s.chords[k]));
  }
  ST.recentChords.forEach(add);
  return out;
}
function recordRecentChord(ch){
  if(!ch) return;
  ST.recentChords = [ch, ...ST.recentChords.filter(c=>c!==ch)].slice(0,8);
}
function chordTileHTML(rt, q, label, cls){
  const on = rt===ST.selRoot && q===ST.selSuffix;
  if(cls) return `<span class="${cls}" data-drag-chord="${esc(rt+q)}">${esc(label!=null?label:rt+q)}</span>`;
  return `<button style="height:48px;border-radius:12px;border:1.5px solid var(--fg);background:${on?'#1b1b1b':'#fff'};color:${on?'#fff':'#1b1b1b'};font-size:17px;font-weight:700;padding:0 16px;white-space:nowrap" data-act="pickVariant" data-root="${esc(rt)}" data-q="${esc(q)}">${esc(label!=null?label:rt+q)}</button>`;
}
