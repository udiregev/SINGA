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

/* ---- Tempo: every song either scrolls at a set speed (x0.5–x4, default
   x1, no word highlighting) or follows a recorded take (audio synced, words
   highlighted as they're sung). Kept in the song's notes under "_tempo" so it
   saves with the song without a database change; it's never shown as a mark. */
function songTempo(s){ const t = (s && s.notes && s.notes._tempo) || {}; return { mode: t.mode || (s && s.synced ? 'synced' : 'speed'), speed: +t.speed || 1 }; }
function songMode(s){ const t = songTempo(s); return t.mode==='synced' && s && s.synced ? 'synced' : 'speed'; }
function songSpeed(s){ return songTempo(s).speed; }
function setSongTempo(s, patch){ if(!s) return; const t = { ...songTempo(s), ...patch }; s.notes = { ...(s.notes||{}), _tempo: { mode:t.mode, speed:t.speed } }; }
function markCount(s){ return Object.keys((s && s.notes) || {}).filter(k=>k.charAt(0)!=='_').length; }   // _tempo, _intro, _spotify… are settings, not marks
// For a recorded take of typed lyrics: the chords heard before the singing
// starts (notes._intro, with their times) — an instrumental intro row above
// the lyrics. ("[Intro: C G]" lines typed or captured from an audio track are
// instrumental lines; see instrLine.) Returns { li:-1, chords:[{t,ch}], end } or null.
function introInfo(s, tm){
  if(!s || !tm.words.length) return null;
  const end = tm.words[0].t, synced = songMode(s)==='synced';
  if(Object.keys(tm.instr||{}).some(li=>+li < tm.words[0].li)) return null;
  if(!synced) return null;
  const ic = (s.notes && Array.isArray(s.notes._intro)) ? s.notes._intro.filter(x=>x && x.ch) : [];
  if(end < 2.5 || (!ic.length && end < 4)) return null;
  return { li:-1, chords: ic.map(x=>({ ch:x.ch, t:+x.t||0 })), end };
}
function speedLabel(v){ return 'x'+(+v).toFixed(2).replace(/\.?0+$/,''); }
// A speedometer: x0.5 at the far left, x4 at the far right.
function speedometerHTML(v){
  const a = -90 + (Math.max(0.5,Math.min(4,v))-0.5)/3.5*180;
  const ticks = [0.5,1,2,3,4].map(x=>{ const r=(-90+(x-0.5)/3.5*180-90)*Math.PI/180; const c=Math.cos(r), sn=Math.sin(r);
    return `<line x1="${(90+c*54).toFixed(1)}" y1="${(92+sn*54).toFixed(1)}" x2="${(90+c*62).toFixed(1)}" y2="${(92+sn*62).toFixed(1)}" stroke="#1b1b1b" stroke-width="2"/><text x="${(90+c*90).toFixed(1)}" y="${(96+sn*90).toFixed(1)}" font-size="11" font-weight="700" text-anchor="middle" fill="#8a8a8a">${speedLabel(x)}</text>`; }).join('');
  return `<svg class="speedo" width="210" height="116" viewBox="-15 -12 210 116" aria-hidden="true">
    <path d="M18 92 A72 72 0 0 1 162 92" fill="none" stroke="#ececec" stroke-width="10" stroke-linecap="round"/>
    ${ticks}
    <g id="speedNeedle" style="transform-origin:90px 92px;transform:rotate(${a.toFixed(1)}deg);transition:transform .15s"><line x1="90" y1="92" x2="90" y2="30" stroke="#f24822" stroke-width="3.5" stroke-linecap="round"/></g>
    <circle cx="90" cy="92" r="7" fill="#1b1b1b"/>
  </svg>`;
}
// Speedometer + x0.5–x4 slider (dragging updates in place; see Binds.songSpeed).
function speedControlHTML(s){
  const v = songSpeed(s);
  return `<div class="speedctl">
    ${speedometerHTML(v)}
    <div id="speedLabel" class="speedval">${speedLabel(v)}</div>
    <input class="speed-range" type="range" min="0.5" max="4" step="0.25" value="${v}" data-bind="songSpeed" aria-label="Scroll speed">
    <div class="row" style="justify-content:space-between;width:100%;font-size:11px;color:#9a9a9a;font-weight:700"><span>x0.5</span><span>x4</span></div>
  </div>`;
}

function buildLines(s, mode, opt){
  opt = opt || {};
  const tm = timing(s);
  const ci = opt.t!=null ? curWord(tm, opt.t) : -1;
  const cw = ci>=0 ? tm.words[ci] : null;
  let curChordK = -1; if(ci>=0) for(let k=0;k<=ci;k++){ const w=tm.words[k]; if(s.chords[w.li+'-'+w.wi]) curChordK=k; }
  const notes = { ...(s.notes||{}), ...(opt.extraNotes||{}) }; delete notes._tempo; delete notes._intro;
  // Instrumental stretches are rows of ticks in the players (in the editors
  // they stay plain labels); the ticks fill in black as the stretch plays.
  const ticks = mode==='play' || mode==='scroll' || mode==='view' || mode==='static';
  const instrRow = (li, a, b, chords)=>{
    const t = opt.t, live = t!=null;
    const on = live && t>=a && t<b;
    const prog = live ? Math.max(0, Math.min(1, (t-a)/Math.max(0.01, b-a))) : 0;
    let curC = -1; if(on) chords.forEach((c,i)=>{ if(c.p<=prog) curC = i; });
    return { li, instr:true, header:false, words:[], t0:a, chords: chords.map((c,i)=>({ ch:c.ch, p:c.p, id:c.id, on:i===curC })),
      progress: prog, live, cur: on, hideChords: !!opt.hideChords, scale:1, op: (live && t>=b) ? 0.6 : 1, padTop:0, mb:0 };
  };
  const intro = ticks ? introInfo(s, tm) : null;
  const introLine = intro ? instrRow(-1, 0, intro.end, intro.chords.map(c=>({ ch:c.ch, p: intro.end>0 ? c.t/intro.end : 0 }))) : null;
  let g = 0;
  // when each sung line starts (the players scroll smoothly between these)
  const lineT0 = {}; tm.words.forEach(w=>{ if(lineT0[w.li]==null) lineT0[w.li] = w.t; });
  const out = tm.lines.map((ws,li)=>{
    const it = tm.instr && tm.instr[li];
    if(it && ticks) return instrRow(li, it.a, it.b, it.chords);
    // Chords step: the instrumental row is a strip of spots to drop chords on
    if(it && mode==='chords') return { li, instr:true, edit:true, header:false, words:[], chords: it.chords, scale:1, op:1, padTop:0, mb:0 };
    const header = isHeaderLine(ws);
    const curLine = cw && cw.li===li, last = ws.length-1;
    const w2 = ws.map((w,wi)=>{
      const id = li+'-'+wi, gi = header ? -1 : g++;
      const ch = (header || opt.hideChords) ? '' : (s.chords[id]||'');
      const mark = header ? '' : (notes[id] || '');
      // Where a mark sits: first word → left of it, last word → right of it,
      // anything in between → above the line, centred on the word.
      const markSide = mark ? (wi===0 ? (opt.leftTop ? 'top' : 'left') : (wi===last ? 'right' : 'top')) : null;
      const o = { id, w, chord:ch, col:'#333', chordCol:'#9a9a9a', weight:400, cursor:'default', mark, markSide,
        selected: ST.selWord===id };
      if(header){
        // Never interactive, never chorded/marked.
      } else if(mode==='chords'){
        o.col='#a8a8a8'; o.weight=400; o.chordCol='#1b1b1b'; o.chip=true; o.drop=id;
      } else if(mode==='markings'){
        o.cursor='pointer'; o.clickAct='pickMarkWord'; o.clickId=id;
      } else if(mode==='view'){
        o.chordCol = '#9a9a9a';
        if(ch){ o.cursor='pointer'; o.clickAct='setViewChord'; o.clickId=ch; }
      } else if(mode==='scroll'){
        o.chordCol = '#9a9a9a';
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
      // Chords step: an empty spot after the last word, for a chord played
      // after the singing on that line (as many as you like, one after another)
      if(mode==='chords' && ws.length){
        let k = 0; while(s.chords[li+'-t'+k]) k++;
        w2.push({ id:li+'-t'+k, w:'', chord:'', col:'#333', chordCol:'#1b1b1b', weight:400, cursor:'default', mark:'', markSide:null, selected:false, tail:true, tailSlot:true, chip:true, drop:li+'-t'+k });
      }
    }
    const isPlay = mode==='play', on = !header && isPlay && curLine;
    // (no extra margins on the current line, so starting playback never shifts the lyrics)
    return { li, t0: lineT0[li], words:w2, header, padTop: 0, mb: 0, scale: on?1.08:1, op: (!header && isPlay && cw && li<cw.li) ? 0.75:1, cur: on || (mode==='scroll' && !header && !!curLine) };
  });
  if(introLine) out.unshift(introLine);
  // during an instrumental stretch no sung line is current
  const curInstr = out.find(l=>l.instr && l.cur);
  if(curInstr) out.forEach(l=>{ if(l!==curInstr) l.cur = false; });
  return out;
}
// ♪ |||||||||||| — an instrumental stretch where the lyrics would be: the
// ticks turn black as it plays, so you can see when the singing comes back.
// Its chords sit above the ticks, where they're played.
const INSTR_TICKS = 32;
function instrLineHTML(l, big){
  if(l.edit) return instrEditHTML(l);
  const done = l.live ? Math.round(l.progress*INSTR_TICKS) : 0;
  let ticks = '';
  for(let i=0;i<INSTR_TICKS;i++) ticks += `<i class="${i<done?'on':''}" style="height:${i%4===0?(big?26:22):(big?18:15)}px"></i>`;
  const fszc = big ? 'font-size:15px;font-weight:700' : 'font-size:14px;font-weight:600';
  const chords = l.hideChords ? '' : l.chords.map(c=>`<span class="ich${c.on?' on':''}" style="left:${(c.p*100).toFixed(1)}%;${fszc}${c.on?';'+(animStyle('instrChord'+l.li, c.ch+c.p, 'chordPop', 450)||''):''}">${esc(c.ch)}</span>`).join('');
  return `<div class="lline linstr${l.cur?' on':''}" style="opacity:${l.op}"${l.cur?' data-cur="1"':''} data-t0="${(+l.t0||0).toFixed(3)}">
    <span class="msi inote" style="font-size:${big?24:20}px">music_note</span>
    <div class="itrack"><div class="ichords">${chords}</div><div class="iticks">${ticks}</div></div>
  </div>`;
}
// Chords step: the same ♪ ||||| row, split into INSTR_SLOTS drop spots, so a
// chord can go anywhere along the instrumental (drag it on, move it, × it off).
function instrEditHTML(l){
  const by = {}; l.chords.forEach(c=>{ by[c.slot] = c; });
  let cells = '';
  for(let k=0;k<INSTR_SLOTS;k++){
    const c = by[k], id = l.li+'-i'+k;
    const chip = c ? `<span class="lchord chip" data-drag-chord="${esc(c.ch)}" data-from="${esc(c.id)}">${esc(c.ch)}</span><span class="chip-x" data-act="removeChord" data-id="${esc(c.id)}" title="Remove chord">×</span>` : `<span class="lchord"></span>`;
    cells += `<span class="lword islot" data-drop="${id}"><span class="lchord-row">${chip}</span><span class="itk"><i style="height:${k%2===0?22:15}px"></i><i style="height:15px"></i></span></span>`;
  }
  return `<div class="lline linstr iedit">
    <span class="msi inote" style="font-size:20px">music_note</span>
    <div class="islots">${cells}</div>
  </div>`;
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
// A section heading ("Verse 2", "Chorus"…): a small label with space above
// it, clearly not a lyric — never highlighted, never timed.
function headerLineHTML(l){
  const raw = l.words.map(w=>w.w).join(' ').replace(/^[\[(]\s*/,'').replace(/\s*[\])]$/,'');
  const m = /^([^:]{1,30}):\s*(.+)$/.exec(raw);
  const name = sectionName(m ? m[1] : raw);
  return `<div class="lline lheader${SECTION_RE.test(name)?' lsection':''}"><span class="hl">${esc(name)}</span>${m?`<span class="hc">${esc(m[2])}</span>`:''}</div>`;
}
function linesHTML(lines, big){
  return `<div class="lyrics-wrap">` + lines.map(l=>{
    if(l.instr) return instrLineHTML(l, big);
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
      // a placed chord on the Chords step gets a × to take it off again; two
      // chords over one word are two chips, each moved / removed on its own
      const parts = String(w.chord||'').split(/\s+/).filter(Boolean);
      const chipX = (w.chip && w.chord && parts.length<2) ? `<span class="chip-x" data-act="removeChord" data-id="${esc(w.id)}" title="Remove chord">×</span>` : '';
      const chordSpan = (w.chip && parts.length>1)
        ? parts.map((c,k)=>`<span class="${chordCls}" style="${fszc};color:${w.chordCol}" data-drag-chord="${esc(c)}" data-from="${esc(w.id)}#${k}">${esc(c)}</span><span class="chip-x" data-act="removeChord" data-id="${esc(w.id)}#${k}" title="Remove chord">×</span>`).join('')
        : `<span class="${chordCls}" style="${fszc};color:${w.chordCol};${w.chordAnim||''}"${drag}>${esc(w.chord)}</span>`;
      return `<span class="lword${w.chip?' editable':''}${w.tailSlot?' tailslot':(w.tail && w.chip?' tailc':'')}" style="cursor:${w.cursor};border-radius:5px;${bg}" ${act}${drop}${w.tailSlot?' title="Drop a chord here to play it after the last word"':''}>${hasTop?markRowHTML(w.mark, w.markSide, w.lvl, lift):''}<span class="${rowCls}">${chordSpan}${chipX}${topArrow}</span><span class="ltext" style="${fsz};font-weight:${w.weight};color:${w.col}">${w.w?esc(w.w):'&nbsp;'}${side}</span></span>`;
    }).join('');
    return `<div class="lline" style="${style}"${l.cur?' data-cur="1"':''}${l.t0!=null?' data-t0="'+(+l.t0).toFixed(3)+'"':''}>${words}</div>`;
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
  return `<div class="list-row" data-act="openGig" data-id="${g.id}"><div style="min-width:0"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(g.title)}</div><div class="s">${esc(sub)}</div></div>${ST._liveGig===g.id?'<span style="font-size:11px;font-weight:700;letter-spacing:.06em;color:#f24822">LIVE</span>':''}</div>`;
}
function songJob(s){ return ST.jobs.find(j=>j.songId===s.id); }
function songTitle(s){ const j = songJob(s); return s.title || (j && j.label) || 'Untitled song'; }
function jobBarHTML(s){
  const j = songJob(s); if(!j) return '';
  return `<div class="jobbar" style="margin-top:6px;max-width:240px"><div id="jobbar-${j.id}" style="width:${Math.round(j.pct)}%"></div></div><div id="jobnote-${j.id}" style="font-size:11px;color:#8a8a8a;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${esc(j.note||'Waiting…')}</div>`;
}
function songSubLine(s){ return s.failed ? "Couldn't be added — tap to try again" : (s.sub || ''); }
// Song-row layout styles (title | content | status / owner | actions)
(function(){
  if(document.getElementById('singa-srow-css')) return;
  const st = document.createElement('style'); st.id = 'singa-srow-css';
  st.textContent = `
/* ---- a song row: title | content | status / owner | actions ---- */
.srow .sm{min-width:0;flex:1}
.srow .sm .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.srow .scol{flex:none;font-size:12px}
.srow .s-content{width:236px;color:#c4c4c4;white-space:nowrap;font-weight:500}
.srow .s-content span.on{color:#1b1b1b;font-weight:600}
.srow .s-content i{font-style:normal;margin:0 6px;color:#d8d8d8}
.srow .s-status{width:150px;display:flex;flex-direction:column;gap:3px;color:#8a8a8a}
.srow .sbadge{font-size:11px;font-weight:800;letter-spacing:.05em;white-space:nowrap}
.srow .sowner{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srow .s-acts{display:flex;align-items:center;justify-content:flex-end;gap:0;width:108px}
.srow .row-act{opacity:1}
.sact{width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:#b8b8b8;display:inline-flex;align-items:center;justify-content:center;flex:none;transition:background .15s,color .15s}
.sact:hover{background:#f2f2f2;color:#1b1b1b}
.sact.on[data-kind="mark"]{color:#1b1b1b}
.sact.on[data-kind="fav"]{color:#e5372a}
/* narrow screens, and the home screen's Songs column: details wrap under the title */
.srow.compact{flex-wrap:wrap;row-gap:4px}
.srow.compact .sm{flex:1 1 calc(100% - 40px)}
.srow.compact .s-content{width:auto;order:3;flex:none}
.srow.compact .s-status{width:auto;order:4;flex:1 1 0;min-width:0;flex-direction:row;gap:10px;align-items:center;margin-left:8px;overflow:hidden}
.srow.compact .s-acts{order:5;width:auto}
.srow.compact > .msi{order:2}
@media (max-width:820px){
  .srow{flex-wrap:wrap;row-gap:4px}
  .srow .sm{flex:1 1 calc(100% - 40px)}
  .srow .s-content{width:auto;order:3;flex:1 1 100%}
  .srow .s-status{width:auto;order:4;flex:1 1 0;min-width:0;flex-direction:row;gap:10px;align-items:center;margin-left:0;overflow:hidden}
  .srow .s-acts{order:5;width:auto}
  .srow > .msi{order:2}
}
/* screens that fit the window: never cut anything off — the lyrics box
   shrinks to fit, and if it still doesn't fit the screen scrolls */
body.fixed-screen #screen > .scr{overflow-y:auto}
.lyr-form{min-height:0}
.lyr-form textarea{min-height:110px !important;flex:1 1 0;height:auto}
/* Key (Chords step) and Speed (song player) */
.keyrow{display:flex;align-items:center;gap:8px;font-size:13px;color:#6f6f6f;margin:2px 0 6px}
.keyrow select{font:inherit;font-weight:700;color:#1b1b1b;border:1.5px solid #d8d8d8;border-radius:8px;padding:4px 8px;background:#fff}
/* song viewer controls: round Play / Stop with skip buttons; the speed is plain text */
.tpl{display:inline-flex;align-items:center;gap:4px}
.tpl-play{width:52px;height:52px;border-radius:50%;border:0;background:#1b1b1b;color:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none;margin:0 4px;cursor:pointer}
.tpl-play.live{background:#f24822}
.tpl-btn{width:38px;height:38px;border:0;border-radius:50%;background:transparent;color:#1b1b1b;display:inline-flex;align-items:center;justify-content:center;flex:none;cursor:pointer}
.tpl-btn:hover{background:#f2f2f2}
.spdbtn{border:0;background:transparent;padding:4px 2px;font-size:14px;font-weight:700;color:#1b1b1b;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:2px;margin-left:10px}
.spdlbl{font-weight:500;color:#8a8a8a;margin-right:4px}
.spdpop{display:inline-flex;align-items:center;gap:2px;flex-wrap:wrap;margin-left:10px;font-size:14px}
.spdpop button{border:0;background:transparent;padding:4px 6px;font-size:14px;font-weight:500;color:#8a8a8a;cursor:pointer;border-radius:6px}
.spdpop button.on{color:#1b1b1b;font-weight:800;text-decoration:underline;text-underline-offset:4px}
/* set-speed songs: the chords of the current line, side by side (a column in landscape) */
.cgroup{display:flex;align-items:flex-end;gap:30px;justify-content:center}
.cgroup.v{flex-direction:column;align-items:center;gap:18px}
.cg-item{display:flex;flex-direction:column;align-items:center;gap:26px}
.cg-name{font-size:24px;font-weight:800;line-height:1}
.cgroup.v .cg-item{gap:22px}
@keyframes cgroupIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
/* section headings: a small coloured label with room above it */
.lline.lheader.lsection{opacity:1;margin-top:18px;margin-bottom:2px}
.lline.lheader.lsection .hl{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#2f8fe0;background:#e9f3fd;border-radius:5px;padding:3px 8px}
.lyrics-wrap > .lline.lheader.lsection:first-child{margin-top:0}
/* Chords step: the drop spot after a line's last word */
.lword.tailslot{min-width:30px;margin-left:6px}
.lword.tailslot .ltext{color:transparent !important;border-bottom:2px dotted #d4d4d4;display:inline-block;min-width:26px}
.lword.tailslot.drop-on .ltext{border-bottom-color:#2f8fe0}
.lword.tailc{min-width:34px;margin-left:6px}
/* Spotify link on a song */
.spot{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#1b1b1b;text-decoration:none;white-space:nowrap}
.spot:hover{text-decoration:underline}
.spot-edit{border:0;background:transparent;color:#9a9a9a;padding:2px;cursor:pointer;display:inline-flex}
.spot-row{display:flex;align-items:center;gap:6px;margin-top:6px}
/* home screen song rows and the Songs filter */
.hrow .t{display:flex;align-items:center;gap:8px;min-width:0}
.hrow .tt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.hrow .hind{display:inline-flex;gap:2px;flex:none}
.hsort{margin-left:24px;position:relative;display:inline-flex;align-items:center;font-size:13px;color:#6f6f6f}
.hsort select{appearance:none;-webkit-appearance:none;border:0;background:transparent;font:inherit;font-weight:600;color:#1b1b1b;padding:4px 20px 4px 4px;cursor:pointer}
.hsort .msi{position:absolute;right:0;pointer-events:none}
`;
  document.head.appendChild(st);
})();
if(!SORTS.some(x=>x[0]==='fav')) SORTS.push(['fav','Hearted'], ['marked','Marked']);
// Hearts, marks and "recently added" come with your account when you sign in
const _applySessionBase = applySession;
applySession = async function(session){ try{ loadFlags(session && session.user); }catch(e){} return _applySessionBase(session); };
// Heart / mark on a song row: toggles without opening the song
document.addEventListener('click', function(e){
  const b = e.target.closest && e.target.closest('.sact[data-kind]'); if(!b) return;
  e.stopImmediatePropagation(); e.preventDefault();
  setFlag(b.dataset.kind, b.dataset.id, !hasFlag(b.dataset.kind, b.dataset.id));
  render();
}, true);
// Small actions defined outside the main Actions table (parts 2–5):
// elements with data-xact="name" run XActions[name](dataset); a <select
// data-xchange="name"> runs XActions[name](dataset, value) when changed.
const XActions = {};
document.addEventListener('click', function(e){
  const b = e.target.closest && e.target.closest('[data-xact]'); if(!b) return;
  const fn = XActions[b.dataset.xact]; if(!fn) return;
  e.stopImmediatePropagation(); e.preventDefault();
  fn(b.dataset, e);
}, true);
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset || !t.dataset.xchange) return;
  const fn = XActions[t.dataset.xchange]; if(fn) fn(t.dataset, t.value);
});
// ---- Change key: every chord in a song moves by the same interval ----
const NOTE_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_KEYS = new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm']);
function noteIndex(n){ const i = NOTE_SHARP.indexOf(n); return i>=0 ? i : NOTE_FLAT.indexOf(n); }
function keyName(root, minor, flats){ return (flats ? NOTE_FLAT : NOTE_SHARP)[((root%12)+12)%12] + (minor ? 'm' : ''); }
function transposeChord(ch, semis, flats){
  return String(ch||'').split(/(\s+)/).map(tok=>{
    const m = /^([A-G][#b]?)([^\/\s]*)(?:\/([A-G][#b]?))?$/.exec(tok);
    if(!m || noteIndex(m[1])<0) return tok;
    const names = flats ? NOTE_FLAT : NOTE_SHARP;
    const r = names[(noteIndex(m[1])+semis+120)%12];
    const b = m[3] && noteIndex(m[3])>=0 ? '/'+names[(noteIndex(m[3])+semis+120)%12] : '';
    return r + m[2] + b;
  }).join('');
}
// all the chords in a song, in order (word chords, line-end chords,
// instrumental chords, chords written in instrumental labels)
function songChordList(s){
  const out = [];
  Object.keys(s.chords||{}).forEach(k=>{ if(s.chords[k]) String(s.chords[k]).split(/\s+/).forEach(c=>c && out.push(c)); });
  String(s.lyrics||'').split('\n').forEach(l=>{ const m = /^\s*\[(?:instrumental|intro|outro|solo|interlude|break)\b:?\s*([^\]]*)\]\s*$/i.exec(l); if(m) m[1].split(/\s+/).forEach(c=>/^[A-G]/.test(c) && out.push(c)); });
  return out;
}
// The song's key, guessed from its chords: the major or minor key whose
// scale fits the chords best (the first and last chords count extra).
function songKey(s){
  const chords = songChordList(s).map(c=>/^([A-G][#b]?)(m(?!aj))?/.exec(c)).filter(Boolean).map(m=>({ r: noteIndex(m[1]), min: !!m[2] }));
  if(!chords.length) return null;
  let best = null;
  for(let k=0;k<12;k++) for(const minor of [false, true]){
    const tonic = minor ? (k+3)%12 : k;   // a minor key shares its relative major's chords
    const maj = [0,5,7].map(x=>(tonic+x)%12), mn = [2,4,9].map(x=>(tonic+x)%12);
    let sc = 0;
    chords.forEach((c,i)=>{ const w = (i===0 || i===chords.length-1) ? 2 : 1; if((c.min ? mn : maj).includes(c.r)) sc += w; if(c.r===(minor?(tonic+9)%12:tonic) && c.min===minor) sc += w*0.5; });
    if(!best || sc>best.sc) best = { sc, root: minor ? (tonic+9)%12 : tonic, minor };
  }
  const flats = songChordList(s).some(c=>/^[A-G]b/.test(c));
  return { root: best.root, minor: best.minor, name: keyName(best.root, best.minor, flats || FLAT_KEYS.has(keyName(best.root, best.minor, true))) };
}
function transposeSong(s, semis, flats){
  if(!s || !semis) return;
  const ch = {}; Object.keys(s.chords||{}).forEach(k=>{ ch[k] = transposeChord(s.chords[k], semis, flats); }); s.chords = ch;
  s.lyrics = String(s.lyrics||'').split('\n').map(l=>l.replace(/^(\s*\[(?:instrumental|intro|outro|solo|interlude|break)\b:?\s*)([^\]]*)(\]\s*)$/i, (m,a,b,c)=>a+b.split(/(\s+)/).map(t=>/^[A-G]/.test(t) ? transposeChord(t, semis, flats) : t).join('')+c)).join('\n');
  if(s.notes && Array.isArray(s.notes._intro)) s.notes = { ...s.notes, _intro: s.notes._intro.map(x=>({ ...x, ch: transposeChord(x.ch, semis, flats) })) };
}
function keySelectHTML(s){
  const k = songKey(s); if(!k) return '';
  const opts = Array.from({length:12}, (_,i)=>{ const flats = FLAT_KEYS.has(keyName(i, k.minor, true)); const n = keyName(i, k.minor, flats); return `<option value="${i}"${i===k.root?' selected':''}>${n}</option>`; }).join('');
  return `<label class="keyrow">Key <select data-xchange="changeKey" data-id="${esc(s.id)}" data-from="${k.root}" aria-label="Change key">${opts}</select></label>`;
}
XActions.changeKey = function(d, v){
  const s = D.songs[d.id]; if(!s) return;
  const from = +d.from, to = +v; if(isNaN(to) || to===from) return;
  const k = songKey(s), semis = ((to-from)%12+12)%12;
  const flats = FLAT_KEYS.has(keyName(to, k && k.minor, true));
  transposeSong(s, semis>6 ? semis-12 : semis, flats);
  render(); queueSaveSong(s.id);
  toast('Key changed to '+keyName(to, k && k.minor, flats));
};
// ---- Song structure: section headings ----
// The names Singa uses for the parts of a song (a typed or imported label is
// shown with its standard name: "pre-chorus" / "climb" → Pre-Chorus, "coda"
// → Outro, "middle eight" → Middle 8 …).
const SECTION_NAMES = [
  [/^intro$/,'Intro'], [/^verse$/,'Verse'], [/^(pre[- ]?chorus|climb|lift|build)$/,'Pre-Chorus'], [/^chorus$/,'Chorus'],
  [/^post[- ]?chorus$/,'Post-Chorus'], [/^bridge$/,'Bridge'], [/^(outro|coda|ending)$/,'Outro'], [/^hook$/,'Hook'],
  [/^refrain$/,'Refrain'], [/^(middle ?8|middle eight)$/,'Middle 8'],
  [/^(instrumental( break)?|solo|guitar solo|piano solo|sax solo|interlude|break)$/,'Instrumental']
];
const SECTION_RE = /^(Intro|Verse|Pre-Chorus|Chorus|Post-Chorus|Bridge|Outro|Hook|Refrain|Middle 8|Instrumental)\b/;
function sectionName(label){
  const t = String(label||'').trim(), m = /^(.*?)[\s.:]*(\d+)?$/.exec(t);
  const base = (m ? m[1] : t).toLowerCase().trim(), num = m && m[2] ? ' '+m[2] : '';
  for(const [re, name] of SECTION_NAMES) if(re.test(base)) return name + num;
  return t;
}
// "[Verse 2]" is a heading; so is "(Chorus)". A sung line in brackets
// ("(Don't go breaking my)") is a lyric — it's timed and highlighted.
isHeaderLine = function(ws){
  if(!ws || !ws.length) return false;
  if(/^\[/.test(ws[0]) && /\]$/.test(ws[ws.length-1])) return true;
  if(!(/^\(/.test(ws[0]) && /\)$/.test(ws[ws.length-1]))) return false;
  const inner = ws.join(' ').replace(/^\(\s*/,'').replace(/\s*\)$/,'').replace(/:.*$/,'');
  return SECTION_RE.test(sectionName(inner)) || /^(capo|key|tempo|repeat|x\d+|\d+x)\b/i.test(inner);
};
// Lyrics with no section headings (an imported text): label the verses
// (blank-line separated) from how they repeat — a verse that comes back is
// the Chorus, the different part late in the song the Bridge, a short part
// that always leads into the chorus the Pre-Chorus, a last short part the
// Outro. Chords and marks move with their lines. Returns true if it changed.
function autoSections(s){
  const raw = String(s.lyrics||'').split('\n');
  const isHead = l=>{ const ws = l.trim().split(/\s+/); return isHeaderLine(ws) && !instrLine(ws); };
  if(raw.some(l=>l.trim() && isHead(l))) return false;
  const st = []; let cur = null;
  raw.forEach(l=>{
    if(!l.trim()){ cur = null; return; }
    if(instrLine(l.trim().split(/\s+/))){ st.push({ instr:true, lines:[l] }); cur = null; return; }
    if(!cur){ cur = { lines:[] }; st.push(cur); }
    cur.lines.push(l);
  });
  const ly = st.filter(x=>!x.instr);
  if(ly.length < 2) return false;
  // a text with an empty line after every line isn't in parts
  if(ly.reduce((n,x)=>n+x.lines.length,0)/ly.length < 1.8) return false;
  const norm = l=>l.toLowerCase().replace(/[^a-z0-9À-ɏ' ]/g,'').replace(/\s+/g,' ').trim();
  const sets = ly.map(x=>new Set(x.lines.map(norm)));
  const sim = (a,b)=>{ let n=0; a.forEach(x=>{ if(b.has(x)) n++; }); return n/Math.max(a.size,b.size,1); };
  const rep = ly.map((x,i)=>sets.some((o,j)=>j!==i && sim(sets[i],o)>=0.6));
  // clusters of repeated stanzas; a repeated part that always comes right
  // before another repeated part is the Pre-Chorus
  const cl = ly.map(()=>-1); let nc = 0;
  ly.forEach((x,i)=>{ if(!rep[i] || cl[i]>=0) return; cl[i] = nc; ly.forEach((y,j)=>{ if(j>i && rep[j] && cl[j]<0 && sim(sets[i],sets[j])>=0.6) cl[j] = nc; }); nc++; });
  const pre = new Set();
  for(let c=0;c<nc;c++){
    const idx = ly.map((x,i)=>i).filter(i=>cl[i]===c);
    if(idx.length>=2 && idx.every(i=>i+1<ly.length && rep[i+1] && cl[i+1]!==c) && ly[idx[0]].lines.length<=4) pre.add(c);
  }
  let verseN = 0, chorusSeen = 0;
  const lastChorus = ly.map((x,i)=>i).filter(i=>rep[i] && !pre.has(cl[i])).pop();
  ly.forEach((x,i)=>{
    if(rep[i]){ x.label = pre.has(cl[i]) ? 'Pre-Chorus' : 'Chorus'; if(x.label==='Chorus') chorusSeen++; return; }
    if(chorusSeen>=2 && lastChorus!=null && i<lastChorus) x.label = 'Bridge';
    else if(i===ly.length-1 && chorusSeen>=1 && x.lines.length<=3) x.label = 'Outro';
    else { verseN++; x.label = 'Verse '+verseN; }
  });
  if(verseN===1) ly.forEach(x=>{ if(x.label==='Verse 1') x.label = 'Verse'; });
  // rebuild the lyrics; old line index → new line index (headings are lines too)
  const out = [], map = {}; let oldLi = 0, newLi = 0;
  st.forEach((x,si)=>{
    if(x.instr){
      let line = x.lines[0];
      if(si===0) line = line.replace(/^\[\s*instrumental\b/i, '[Intro');
      if(out.length) out.push('');
      out.push(line); map[oldLi++] = newLi++; return;
    }
    if(out.length) out.push('');
    out.push('['+x.label+']'); newLi++;
    x.lines.forEach(l=>{ out.push(l); map[oldLi++] = newLi++; });
  });
  const remap = obj=>{ const o = {}; Object.keys(obj||{}).forEach(k=>{ const m = /^(\d+)-(.+)$/.exec(k); if(m && map[m[1]]!=null) o[map[m[1]]+'-'+m[2]] = obj[k]; else o[k] = obj[k]; }); return o; };
  s.lyrics = out.join('\n');
  s.chords = remap(s.chords);
  if(s.notes) s.notes = remap(s.notes);
  return true;
}
// ---- Chord timing: two chords over one word, and chords after the last word ----
// "C G" over a word: the second chord comes halfway to the next word. Chords
// after a line's last word (li-t0, li-t1…) are spread over the gap before
// the next line.
chordEvents = function(s, tm){
  const ev = [], words = tm.words;
  words.forEach((w,k)=>{
    const ch = s.chords[w.li+'-'+w.wi]; if(!ch) return;
    const parts = String(ch).split(/\s+/).filter(Boolean);
    const nt = k+1<words.length ? words[k+1].t : w.t+1;
    parts.forEach((c,i)=>ev.push({ t: w.t + (nt-w.t)*i/parts.length, ch:c }));
  });
  const lastOf = {}; words.forEach((w,k)=>{ lastOf[w.li] = k; });
  Object.keys(lastOf).forEach(li=>{
    const tails = []; for(let k=0; s.chords[li+'-t'+k]; k++) String(s.chords[li+'-t'+k]).split(/\s+/).filter(Boolean).forEach(c=>tails.push(c));
    if(!tails.length) return;
    const k = lastOf[li], w = words[k], nt = k+1<words.length ? words[k+1].t : w.t+2;
    const a = w.t + Math.min(0.5, (nt-w.t)*0.4);
    tails.forEach((c,i)=>ev.push({ t: a + (nt-a)*i/tails.length, ch:c }));
  });
  Object.keys(tm.instr||{}).forEach(li=>{ const it = tm.instr[li]; it.chords.forEach(c=>ev.push({ t: it.a+(it.b-it.a)*c.p, ch:c.ch })); });
  const io = typeof introInfo==='function' ? introInfo(s, tm) : null;
  if(io) io.chords.forEach(c=>ev.push({ t:c.t, ch:c.ch }));
  return ev.sort((x,y)=>x.t-y.t);
};
chordSeq = function(s){ const tm = timing(s); return chordEvents(s, tm).map((e,k)=>({ k, ch:e.ch })); };
// ---- Your songs: your own, the demo, and songs you've added from others ----
// Each song you make can be found by other Singa users unless you set it
// private (song menu). Songs added from other people (flags.lib) are shown
// in your songs too, and can be removed again.
function songIsPrivate(s){ return hasFlag('priv', s && s.id); }
const _songToRowBase = songToRow;
songToRow = function(s){ const r = _songToRowBase(s); r.is_public = !songIsPrivate(s); return r; };
const _songRowToLocalBase = songRowToLocal;
songRowToLocal = function(row){
  const s = _songRowToLocalBase(row);
  try{ s.notes = JSON.parse(JSON.stringify(s.notes||{})); }catch(e){ s.notes = {}; }   // every song its own settings
  s.isPublic = !!row.is_public;
  return s;
};
const _loadUserDataBase = loadUserData;
loadUserData = async function(){
  await _loadUserDataBase();
  if(!ST.userId) return;
  // songs made before "discoverable by default" become discoverable (unless set private)
  Object.values(D.songs).forEach(s=>{ if(s.mine!==false && !s.isPublic && !songIsPrivate(s)){ s.isPublic = true; queueSaveSong(s.id); } });
  const lib = flagList('lib').filter(id=>!D.songs[id]);
  if(!lib.length) return;
  try{
    const res = await sb.from('songs').select('*').in('id', lib);
    (res.data||[]).forEach(row=>{ const s = songRowToLocal(row); D.songs[s.id] = s; if(!D.order.includes(s.id)) D.order.push(s.id); });
    const at = (ST.flags && ST.flags.libAt) || {};
    D.order.sort((a,b)=>(at[b]||D.songs[b].added||0)-(at[a]||D.songs[a].added||0));
    const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  }catch(e){ console.error('Singa: failed to load added songs', e); }
};
// Signing in: start from an empty library (never another account's songs),
// and work out whether this email has been confirmed.
const _applySessionWithFlags = applySession;
applySession = async function(session){
  D.songs = {}; D.order = []; D.playlists = []; D.gigs = [];
  const r = await _applySessionWithFlags(session);
  ST.emailVerified = emailConfirmed(session && session.user);
  if(/[?&#]singa_verify=1/.test(location.href) && session && session.user){
    ST.emailVerified = true; ST.verifyModal = false;
    try{ await sb.auth.updateUser({ data:{ singa_verified:true } }); }catch(e){}
    try{ history.replaceState(history.state, '', location.pathname); }catch(e){}
    toast('Email confirmed — thanks!');
  }
  return r;
};
// You can sign in straight away; your email is confirmed when you open the
// link Singa sends (until then, saving asks you to confirm it). Older
// accounts that confirmed through the sign-up email count as confirmed.
function emailConfirmed(u){
  if(!u) return false;
  if((u.app_metadata && u.app_metadata.provider && u.app_metadata.provider!=='email')) return true;
  if(u.user_metadata && u.user_metadata.singa_verified) return true;
  const c = u.email_confirmed_at || u.confirmed_at;
  return !!(c && u.created_at && new Date(c) - new Date(u.created_at) > 60000);
}
XActions.addToMine = function(d){
  if(!canSync()) return;
  const s = D.songs[d.id]; if(!s) return;
  setFlag('lib', d.id, true);
  ST.flags.libAt = ST.flags.libAt || {}; ST.flags.libAt[d.id] = Date.now(); saveFlags();
  if(!D.order.includes(d.id)) D.order = [d.id, ...D.order];
  const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  ST.viewBy = null; ST.menu = false; render(); toast('Added to your songs');
};
function removeFromMine(id){
  setFlag('lib', id, false);
  D.order = D.order.filter(x=>x!==id);
  const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  D.playlists.forEach(p=>{ if(!p.auto && p.mine!==false && p.ids.includes(id)){ p.ids = p.ids.filter(i=>i!==id); queueSavePlaylist(p.id); } });
}
XActions.togglePrivate = function(d){
  if(!canSync()) return;
  const s = D.songs[d.id]; if(!s) return;
  const priv = !songIsPrivate(s);
  setFlag('priv', s.id, priv); s.isPublic = !priv;
  ST.menu = false; render(); saveSongRow(s);
  toast(priv ? 'Private — only you can see this song' : 'Other Singa users can now find this song');
};
// ---- Spotify link (temporary) ----
// Every uploaded song gets a link to its original recording on Spotify,
// found by the Singa server (or, if it can't search Spotify, a Spotify
// search for the title and artist). Kept in the song's notes as _spotify,
// and can be edited from the song menu. Set to false to switch it all off.
const SPOTIFY_LINKS = true;
const SPOTIFY_SERVER = 'https://singa-production-e6f3.up.railway.app';
function spotifyOf(s){ const x = s && s.notes && s.notes._spotify; return x && x.url ? x : null; }
function spotifySearchUrl(s){ return 'https://open.spotify.com/search/' + encodeURIComponent(((s.title||'')+' '+(s.sub||'')).trim()); }
// A pasted link: open.spotify.com/…, spotify:track:…, spotify.link/… — or null
function normSpotify(v){
  v = String(v||'').trim();
  let m = /^spotify:(track|album|playlist|artist):([A-Za-z0-9]+)$/.exec(v);
  if(m) return 'https://open.spotify.com/'+m[1]+'/'+m[2];
  if(!/^https?:\/\//i.test(v) && /^(open\.spotify\.com|spotify\.link)\//i.test(v)) v = 'https://'+v;
  try{ const u = new URL(v); if(/(^|\.)spotify\.(com|link)$/i.test(u.hostname)) return u.origin + u.pathname; }catch(e){}
  return null;
}
function setSpotify(s, url, auto){
  s.notes = { ...(s.notes||{}) };
  if(url) s.notes._spotify = { url, auto: !!auto, search: /\/search\//.test(url) }; else delete s.notes._spotify;
}
async function autoSpotify(s){
  if(!SPOTIFY_LINKS || !s || spotifyOf(s) || !(s.title||'').trim()) return;
  let url = null;
  try{
    const r = await fetch(SPOTIFY_SERVER+'/spotify-search?title='+encodeURIComponent(s.title.trim())+'&artist='+encodeURIComponent((s.sub||'').trim()));
    if(r.ok){ const j = await r.json(); url = j && j.url || null; }
  }catch(e){}
  if(spotifyOf(s)) return;   // set by hand meanwhile
  setSpotify(s, url || spotifySearchUrl(s), true);
  if(s.mine!==false && D.songs[s.id]) queueSaveSong(s.id);
  render();
}
const SPOTIFY_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1ed760"/><path d="M6.5 9.2c3.8-1.1 7.6-.8 11 1M7.2 12.4c3-.8 6.1-.6 8.8.9M7.9 15.4c2.3-.6 4.6-.4 6.6.7" stroke="#000" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
// Per-person song flags — heart, mark, and "recently added, not opened yet" —
// kept with your Supabase account (user_metadata) so they follow you to
// every device without a database change; a local copy covers offline use.
function flagList(k){ ST.flags = ST.flags || { fav:[], mark:[], fresh:[] }; return ST.flags[k] || (ST.flags[k] = []); }
function hasFlag(k, id){ return flagList(k).includes(id); }
function setFlag(k, id, on){
  const a = flagList(k), i = a.indexOf(id);
  if(on && i<0) a.push(id); else if(!on && i>=0) a.splice(i,1); else return;
  saveFlags();
}
function saveFlags(){
  try{ localStorage.setItem('singaFlags:'+ST.userId, JSON.stringify(ST.flags)); }catch(e){}
  debounceSave('flags', async ()=>{
    if(!ST.userId || !sb.auth.updateUser) return;
    try{ const r = await sb.auth.updateUser({ data:{ singa_flags: ST.flags } }); if(r && r.error) console.error('Singa: flags save failed', r.error); }catch(e){ console.error('Singa: flags save failed', e); }
  }, 1200);
}
function loadFlags(user){
  let f = (user && user.user_metadata && user.user_metadata.singa_flags) || null;
  if(!f){ try{ f = JSON.parse(localStorage.getItem('singaFlags:'+(user && user.id))||'null'); }catch(e){} }
  ST.flags = { fav:(f && f.fav)||[], mark:(f && f.mark)||[], fresh:(f && f.fresh)||[], opened:(f && f.opened)||{}, lib:(f && f.lib)||[], libAt:(f && f.libAt)||{}, priv:(f && f.priv)||[] };
}
// The only status labels on a song row: PROCESSING (being added), FAILED,
// or RECENTLY ADDED — a song that was added for you automatically, until
// you first open it.
function songBadge(s){
  if(songJob(s)) return ['PROCESSING','#2f8fe0'];
  if(s.failed) return ['FAILED','#e5372a'];
  if(hasFlag('fresh', s.id)) return ['RECENTLY ADDED','#2a9d6b'];
  return ['',''];
}
// What a song holds: lyrics, chords, markings, tempo (timing / speed).
function songContent(s){
  const chordKeys = Object.keys(s.chords||{}).filter(k=>s.chords[k]);
  return [
    ['Lyrics', !!(s.lyrics||'').trim()],
    ['Chords', chordKeys.length>0 || !!((s.notes||{})._intro||[]).length],
    ['Markings', markCount(s)>0],
    ['Tempo', !!(s.synced || (s.notes && s.notes._tempo))]
  ];
}
function songOwner(s){ return s.mine===false ? 'Created by '+(s.by||'someone') : ''; }
// A document still being read (its songs aren't known yet) — not a song.
function readingRowsHTML(){
  return (ST.reading||[]).map(r=>`<div class="list-row" style="cursor:default"><div style="min-width:0;flex:1"><div class="t" style="font-weight:500;color:#6f6f6f">${esc(r.label)}</div><div class="s" id="readnote-${r.id}">${esc(r.note||'Finding the songs…')}</div></div></div>`).join('');
}
// Home screen: just the song (title, artist, PROCESSING / RECENTLY ADDED)
// and a small heart / bookmark if you've loved or marked it.
function songRowHome(s){
  const j = songJob(s), b = songBadge(s), sub = songSubLine(s);
  const ind = (hasFlag('mark', s.id) ? `<span class="msi" title="Marked" style="font-size:17px;font-variation-settings:'FILL' 1;color:#1b1b1b">bookmark</span>` : '')
    + (hasFlag('fav', s.id) ? `<span class="msi" title="Loved" style="font-size:17px;font-variation-settings:'FILL' 1;color:#e5372a">favorite</span>` : '');
  return `<div class="list-row hrow" data-act="openSongFrom" data-id="${s.id}" data-from="home">
    <div style="min-width:0;flex:1"><div class="t"><span class="tt">${esc(songTitle(s))}</span>${ind ? `<span class="hind">${ind}</span>` : ''}</div>${j ? jobBarHTML(s) : (sub ? `<div class="s"${s.failed?' style="color:#e5372a"':''}>${esc(sub)}</div>` : '')}</div>
    ${b[0] ? `<span class="sbadge" style="font-size:11px;font-weight:800;letter-spacing:.05em;white-space:nowrap;color:${b[1]}">${b[0]}</span>` : ''}
    ${icon('chevron_right',22)}
  </div>`;
}
// The home screen's Songs filter. Recent = last opened (played or viewed)
// or added, newest first.
const HOME_SORTS = [['recent','Recent'],['fav','Loved'],['marked','Marked'],['added','Recently added'],['az','A → Z']];
function homeSort(){ if(!ST.homeSort){ try{ ST.homeSort = localStorage.getItem('singaHomeSort') || 'recent'; }catch(e){ ST.homeSort = 'recent'; } } return ST.homeSort; }
function lastUsed(id){ const s = D.songs[id] || {}; return Math.max(((ST.flags && ST.flags.opened) || {})[id] || 0, s.added || 0); }
function homeSongIds(){
  const ids = D.order.filter(id=>D.songs[id]);
  const k = homeSort();
  if(k==='fav') return ids.filter(id=>hasFlag('fav', id));
  if(k==='marked') return ids.filter(id=>hasFlag('mark', id));
  if(k==='added') return ids.slice().sort((a,b)=>(D.songs[b].added||0)-(D.songs[a].added||0));
  if(k==='az') return ids.slice().sort((a,b)=>songTitle(D.songs[a]).localeCompare(songTitle(D.songs[b])));
  return ids.slice().sort((a,b)=>lastUsed(b)-lastUsed(a));
}
XActions.homeSort = function(d, v){ ST.homeSort = v; try{ localStorage.setItem('singaHomeSort', v); }catch(e){} render(); };
// remember when each song was last opened (for Recent)
document.addEventListener('click', function(e){
  const r = e.target.closest && e.target.closest('[data-act="openSongFrom"],[data-act="openGigSong"]'); if(!r || !r.dataset.id) return;
  ST.flags = ST.flags || { fav:[], mark:[], fresh:[] };
  const o = ST.flags.opened = ST.flags.opened || {};
  o[r.dataset.id] = Date.now();
  const keys = Object.keys(o); if(keys.length > 150) keys.sort((a,b)=>o[a]-o[b]).slice(0, keys.length-150).forEach(k=>delete o[k]);
  saveFlags();
}, true);

function renderHome(){
  const playlists = D.playlists.slice(0,3).map(playlistRow).join('');
  const gigs = D.gigs.slice(0,3).map(gigRowHome).join('');
  const recent = homeSongIds().slice(0,5).map(id=>songRowHome(song(id))).join('');
  const hk = homeSort(), emptyNote = hk==='fav' ? 'No loved songs yet — tap ♡ on a song in All Songs.' : hk==='marked' ? 'No marked songs yet.' : 'No songs yet — tap + to add one.';
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
          <div class="row home-h" style="gap:14px;margin-bottom:8px"><span class="home-title" data-act="openList" data-kind="playlists" title="All playlists">Playlists</span><span class="icon-btn" style="margin-left:36px" title="New playlist" data-act="newItem" data-kind="playlist">${icon('add',24)}</span></div>
          ${playlists}
          <a class="link" style="display:inline-block;margin-top:14px;text-decoration:underline" data-act="openList" data-kind="playlists">All Playlists</a>
        </div>
        <div>
          <div class="row home-h" style="gap:14px;margin-bottom:8px"><span class="home-title" data-act="openList" data-kind="gigs" title="All gigs">Gigs</span><span class="icon-btn" style="margin-left:36px" title="New gig" data-act="newItem" data-kind="gig">${icon('add',24)}</span></div>
          ${gigs}
          <a class="link" style="display:inline-block;margin-top:14px;text-decoration:underline" data-act="openList" data-kind="gigs">All Gigs</a>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:48px">
        <div>
          <div class="row home-h" style="gap:14px;margin-bottom:8px"><span class="home-title" data-act="openList" data-kind="songs" title="All songs">Songs</span><span class="icon-btn" style="margin-left:36px" title="Add a song" data-act="newSong">${icon('add',24)}</span><label class="hsort" title="Show"><select data-xchange="homeSort" aria-label="Show songs" style="width:${Math.round((HOME_SORTS.find(x=>x[0]===hk)||HOME_SORTS[0])[1].length*7.6)+28}px">${HOME_SORTS.map(([v,l])=>`<option value="${v}"${v===hk?' selected':''}>${l}</option>`).join('')}</select>${icon('expand_more',18)}</label></div>
          ${readingRowsHTML()}${recent || ((ST.reading||[]).length ? '' : `<div style="padding:14px 0;color:#8a8a8a;font-size:14px">${emptyNote}</div>`)}
          <a class="link" style="display:inline-block;margin-top:14px;text-decoration:underline" data-act="openList" data-kind="songs">All Songs</a>
        </div>
      </div>
    </div>
  </div>`;
}

function sortRows(rows){
  const songsList = ST.listKind==='songs' || ST.screen!=='list';
  const r = ST.sort==='mine' ? rows.filter(x=>x.mine)
    : (ST.sort==='fav' && songsList) ? rows.filter(x=>hasFlag('fav',x.id))
    : (ST.sort==='marked' && songsList) ? rows.filter(x=>hasFlag('mark',x.id)) : rows;
  const newest = (a,b)=>b.added-a.added;
  const by = { az:(a,b)=>a.title.localeCompare(b.title), za:(a,b)=>b.title.localeCompare(a.title), played:(a,b)=>b.plays-a.plays, recent:newest, mine:newest, fav:newest, marked:newest }[ST.sort] || newest;
  return [...r].sort(by);
}
function sortDropdown(){
  const label = SORTS.find(x=>x[0]===ST.sort)[1];
  const opts = ST.sortOpen ? `<div style="position:absolute;right:0;top:calc(100% + 6px);width:210px;background:#fff;border:1.5px solid var(--fg);border-radius:12px;padding:6px;box-shadow:0 12px 30px rgba(0,0,0,.1);display:flex;flex-direction:column;z-index:4">
    ${SORTS.filter(([v])=>ST.listKind==='songs' || (v!=='fav' && v!=='marked')).map(([v,l])=>`<button style="border:0;border-radius:8px;background:${v===ST.sort?'#f2f2f2':'transparent'};text-align:left;padding:10px 12px;font-size:14px;font-weight:${v===ST.sort?700:500};display:flex;justify-content:space-between;align-items:center" data-act="setSort" data-id="${v}">${l}<span class="msi" style="font-size:18px;opacity:${v===ST.sort?1:0}">check</span></button>`).join('')}
  </div>` : '';
  return `<div style="position:relative"><button class="row" style="border:0;background:transparent;gap:4px;font-size:13px;color:#6f6f6f" data-act="toggleSort">Sort by: <span style="font-weight:600;color:var(--fg)">${label}</span>${icon(ST.sortOpen?'expand_less':'expand_more',18)}</button>${opts}</div>`;
}
// A row's delete (All Songs) / remove (a playlist or gig) button: shows on
// hover, always on touch screens; asks before doing anything.
function rowActHTML(kind, id){
  const lbl = kind==='delete' ? 'Delete song' : 'Remove';
  return `<button class="row-act" data-act="askRowAction" data-kind="${kind}" data-id="${esc(id)}" title="${lbl}" aria-label="${lbl}">${icon(kind==='delete'?'delete':'remove_circle',20)}</button>`;
}
// A song row: title (and artist) | what it holds | status / owner | actions
function songRowList(id, badgeText, badgeCol, from, rowAct, compact){
  const s = song(id), j = songJob(s), b = songBadge(s), sub = songSubLine(s);
  const content = songContent(s).map(([l,on])=>`<span class="${on?'on':''}">${l}</span>`).join('<i>|</i>');
  const flagBtn = (k, ic, lbl)=>{ const on = hasFlag(k, id); return `<button class="sact${on?' on':''}" data-kind="${k}" data-id="${esc(id)}" title="${lbl}" aria-label="${lbl}" aria-pressed="${on}"><span class="msi" style="font-size:21px;font-variation-settings:'FILL' ${on?1:0}">${ic}</span></button>`; };
  return `<div class="list-row has-act srow${compact?' compact':''}" data-act="openSongFrom" data-id="${id}" data-from="${from}">
    <div class="sm"><div class="t">${esc(songTitle(s))}</div>${j ? jobBarHTML(s) : (sub ? `<div class="s"${s.failed?' style="color:#e5372a"':''}>${esc(sub)}</div>` : '')}</div>
    <div class="scol s-content">${j ? '' : content}</div>
    <div class="scol s-status">${b[0] ? `<span class="sbadge" style="color:${b[1]}">${b[0]}</span>` : ''}${songOwner(s) ? `<span class="sowner">${esc(songOwner(s))}</span>` : ''}</div>
    <div class="scol s-acts">${rowAct ? rowActHTML(rowAct, id) : ''}${flagBtn('mark','bookmark', hasFlag('mark',id)?'Unmark':'Mark')}${flagBtn('fav','favorite', hasFlag('fav',id)?'Remove heart':'Heart')}</div>
    ${icon('chevron_right',22)}
  </div>`;
}
function gigRowList(g){
  const sub = g.date+' · '+g.setlist.length+' songs'+(g.mine?'':' · by '+g.by);
  return `<div class="list-row" data-act="openGig" data-id="${g.id}"><div><div class="t">${esc(g.title)}</div><div class="s">${esc(sub)}</div></div><div class="row" style="gap:12px"><span style="font-size:11px;font-weight:700;letter-spacing:.05em;color:#f24822">${ST._liveGig===g.id?'LIVE':''}</span>${icon('chevron_right',22)}</div></div>`;
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
    const rowAct = (curPl && !curPl.auto) ? (curPl.mine!==false ? 'plremove' : null) : 'delete';
    rowsHtml = `<div class="list-row addrow" data-act="listAdd"><div class="t">${icon('add_circle',22)}Add song</div></div>` + (curPl && !curPl.auto ? '' : readingRowsHTML()) + rows.map(r=>{ const b=songBadge(r); return songRowList(r.id, b[0], b[1], 'list', r.mine!==false || rowAct==='plremove' ? rowAct : null); }).join('');
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
    <div style="overflow:auto;padding-left:40px">${rowsHtml}${empty?'<div style="padding:14px 0;color:#8a8a8a">Nothing here yet.</div>':''}</div>
  </div>`;
}
