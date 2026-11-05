/* ============================================================
   NIGHT DESIGN (Nov 2026)
   The app's screens are built as HTML strings with the old light
   palette written straight into them. Rather than rewrite hundreds of
   inline styles, every string that goes on screen passes through
   nightify(), which swaps the light colours for the Night palette
   (deep violet, glass, pink accent). singa-night.css restyles the
   shared classes. On top of that this part:
     · gives songs, playlists and gigs their own artwork (made from
       their name, so it never changes);
     · rebuilds Home (gig "tickets", playlist tiles, song rows with
       artwork) and adds a bottom tab bar;
     · draws markings with a curved arrow that lands on the word,
       and underlines the word it belongs to;
     · links the gig's TV / monitor screen.
   ============================================================ */

/* ---- palette ---- */
const N_INK = '#2A1250', N_PINK = '#F3B8FF';
// [ground, big shape, small shape] — every piece of artwork uses one of these
const N_ART = [
  ['#F3B8FF','#6E1C78','#FFD8A8'],
  ['#FFD8A8','#C2185B','#6E1C78'],
  ['#9CC8FF','#2A1250','#FFD8A8'],
  ['#FF9E9E','#6E1C78','#FFD8A8'],
  ['#9FE3D2','#1A4D5C','#F3B8FF'],
  ['#B9A6FF','#2A1250','#F3B8FF']
];
function nHash(str){ let h = 2166136261; str = String(str||''); for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h>>>0; }
// Artwork for a song / playlist: a coloured square with two shapes. The
// same name always gets the same picture.
function nArt(seed, size, radius, cls){
  const h = nHash(seed), p = N_ART[h % N_ART.length], v = (h>>>4) % 3;
  const r = radius!=null ? radius : Math.round(size*0.28);
  let shapes;
  if(v===0) shapes = `<i style="right:-24%;bottom:-24%;width:82%;height:82%;background:${p[1]}"></i><i style="left:14%;top:14%;width:24%;height:24%;background:${p[2]}"></i>`;
  else if(v===1) shapes = `<i style="left:-30%;top:-30%;width:96%;height:96%;background:${p[1]}"></i><i style="right:13%;bottom:13%;width:34%;height:34%;background:${p[2]}"></i>`;
  else shapes = `<i style="left:0;bottom:0;width:100%;height:50%;border-radius:999px 999px 0 0;background:${p[1]}"></i><i style="left:38%;top:14%;width:25%;height:25%;background:${p[2]}"></i>`;
  return `<span class="nart${cls?' '+cls:''}" aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:${r}px;background:${p[0]}">${shapes}</span>`;
}
function nArtColors(seed){ return N_ART[nHash(seed) % N_ART.length]; }
// A gig's date as a ticket stub: "DEC" / "31" and the time, or the year
// when the gig is more than ~6 months away (or long past). A gig with no
// date (or "Every Thursday") gets its own artwork on the stub instead.
const N_MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const N_MRE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';
function nGigWhen(g){
  const t = String((g && g.date) || '').trim();
  if(!t || /^every\b/i.test(t)) return null;
  let mon = -1, day = 0, year = 0, m;
  if((m = new RegExp('\\b'+N_MRE+'\\s+(\\d{1,2})(?!\\d)','i').exec(t))){ mon = N_MON.indexOf(m[1].slice(0,3).toUpperCase()); day = +m[2]; }
  else if((m = new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+'+N_MRE,'i').exec(t))){ mon = N_MON.indexOf(m[2].slice(0,3).toUpperCase()); day = +m[1]; }
  else if((m = /\b((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(t))){ year = +m[1]; mon = +m[2]-1; day = +m[3]; }
  if(mon<0 || mon>11 || day<1 || day>31) return null;
  const now = new Date();
  if(!year){ const ym = /\b(19|20)\d{2}\b/.exec(t); year = ym ? +ym[0] : now.getFullYear(); }
  let hh = 12, mm = 0, time = '';
  const tm = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i.exec(t) || /\b(\d{1,2}):(\d{2})\b/.exec(t);
  if(tm){
    hh = +tm[1]; mm = +(tm[2]||0); const ap = (tm[3]||'').toLowerCase();
    if(ap==='pm' && hh<12) hh += 12; if(ap==='am' && hh===12) hh = 0;
    time = ap ? (+tm[1]) + (tm[2] ? ':'+tm[2] : '') + ' ' + ap.toUpperCase() : tm[1]+':'+tm[2];
  }
  const d = new Date(year, mon, day, hh, mm), day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return { mon: N_MON[mon], day: String(day), year, time, t: d.getTime(), past: d.getTime() < day0,
           today: d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate(),
           far: Math.abs(d.getTime() - now.getTime()) > 183*86400000 };
}
function nGigDate(g){ return nGigWhen(g); }
function nStub(g, big){
  const p = nArtColors('gig:'+(g.id||g.title)), w = nGigWhen(g);
  if(!w) return `<span class="nstub art${big?' big':''}" style="background:${p[0]}"><i style="background:${p[2]}"></i><i class="b" style="background:${p[1]}"></i><span class="sr">No date</span></span>`;
  const third = w.far ? String(w.year) : w.time;
  return `<span class="nstub${big?' big':''}" aria-hidden="true" style="background:${p[0]};color:${p[1]}"><i style="background:${p[2]}"></i><i class="b" style="background:${p[1]}"></i><b class="mon">${w.mon}</b><b class="day">${w.day}</b>${third?`<b class="yr">${esc(third)}</b>`:''}</span>`;
}
// Coming up first (soonest on top), then gigs with no date, then past gigs (newest first)
function nGigOrder(list){
  const up = [], none = [], past = [];
  list.forEach(g=>{ const w = nGigWhen(g); (!w ? none : w.past ? past : up).push({ g, w }); });
  up.sort((a,b)=>a.w.t-b.w.t); past.sort((a,b)=>b.w.t-a.w.t);
  return up.concat(none, past).map(x=>x.g);
}
// The Singa wordmark
const N_WM = `<svg class="wm" role="img" aria-label="Singa" viewBox="32 -226 2840 1101"><path fill="currentColor" d="M32 417H201Q204 446 228 464Q252 482 287 482Q319 482 336 470Q354 457 354 437Q354 413 329 402Q304 390 248 376Q188 362 148 346Q108 331 79 298Q50 264 50 207Q50 159 76 120Q103 80 154 57Q206 34 277 34H606V161H272Q242 161 226 172Q210 184 210 204Q210 228 236 240Q261 252 315 264Q377 280 416 296Q455 311 484 346Q514 380 515 438Q515 487 488 526Q460 564 408 586Q357 608 289 608Q216 608 159 583Q102 558 69 514Q36 471 32 417Z M757 42V600H586V42Z M1402 274V600H1232V297Q1232 241 1203 210Q1174 179 1125 179Q1076 179 1047 210Q1018 241 1018 297V600H847V42H1018V116Q1044 79 1088 58Q1132 36 1187 36Q1285 36 1344 100Q1402 163 1402 274Z M1871 121V42H2042V599Q2042 676 2012 738Q1981 801 1918 838Q1856 875 1763 875Q1639 875 1562 816Q1485 758 1474 658H1643Q1651 690 1681 708Q1711 727 1755 727Q1808 727 1840 696Q1871 666 1871 599V520Q1846 559 1802 584Q1758 608 1699 608Q1630 608 1574 572Q1518 537 1486 472Q1453 406 1453 320Q1453 234 1486 169Q1518 104 1574 69Q1630 34 1699 34Q1758 34 1802 58Q1847 82 1871 121ZM1749 183Q1698 183 1662 220Q1627 256 1627 320Q1627 384 1662 422Q1698 459 1749 459Q1800 459 1836 422Q1871 385 1871 321Q1871 257 1836 220Q1800 183 1749 183Z M2344 34Q2403 34 2448 58Q2492 82 2516 121V42H2687V600H2516V521Q2491 560 2446 584Q2402 608 2343 608Q2275 608 2219 572Q2163 537 2130 472Q2098 406 2098 320Q2098 234 2130 169Q2163 104 2219 69Q2275 34 2344 34ZM2394 183Q2343 183 2308 220Q2272 256 2272 320Q2272 384 2308 422Q2343 459 2394 459Q2445 459 2480 422Q2516 385 2516 321Q2516 257 2480 220Q2445 183 2394 183Z"/><path d="M2602 270V274C2602 407 2709 514 2842 514H2872" fill="none" stroke="currentColor" stroke-width="171"/><circle cx="672" cy="-122" r="104" fill="#F3B8FF" class="wm-dot"/></svg>`;

/* ---- the colour swap ---- */
const N_TEXT = {
  '#1b1b1b':'#FFFFFF','#111':'#FFFFFF','#111111':'#FFFFFF','#000':'#FFFFFF','#000000':'#FFFFFF','#222':'#FFFFFF','#333':'#FFFFFF','#333333':'#FFFFFF',
  '#fff':N_INK,'#ffffff':N_INK,
  '#444':'rgba(255,255,255,.9)','#444444':'rgba(255,255,255,.9)','#555':'rgba(255,255,255,.82)',
  '#666':'rgba(255,255,255,.74)','#6f6f6f':'rgba(255,255,255,.74)','#77756f':'rgba(255,255,255,.74)',
  '#888':'rgba(255,255,255,.66)','#8a8a8a':'rgba(255,255,255,.66)','#8f8f8f':'rgba(255,255,255,.62)',
  '#999':'rgba(255,255,255,.58)','#9a9a9a':'rgba(255,255,255,.58)','#a0a0a0':'rgba(255,255,255,.55)',
  '#a8a8a8':'rgba(255,255,255,.5)','#aaa':'rgba(255,255,255,.5)','#b0b0b0':'rgba(255,255,255,.48)','#b3b3b3':'rgba(255,255,255,.46)',
  '#b8b8b8':'rgba(255,255,255,.42)','#bbb':'rgba(255,255,255,.42)','#c4c4c4':'rgba(255,255,255,.4)','#c8c8c8':'rgba(255,255,255,.38)','#ccc':'rgba(255,255,255,.38)',
  '#d4d4d4':'rgba(255,255,255,.32)','#d8d8d8':'rgba(255,255,255,.3)','#ddd':'rgba(255,255,255,.3)',
  '#f24822':N_PINK,'#e5372a':'#FFB3C1','#b3261e':'#FFB3C1',
  '#2f8fe0':N_PINK,'#2f6fa8':N_PINK,'#1f6fc0':N_PINK,'#0f4f8a':'#FFD8F8','#9cc7ee':'rgba(243,184,255,.6)',
  '#2a9d6b':'#9FE3D2','#4169c7':'#9CC8FF','#8e4fd6':'#B9A6FF'
};
const N_BG = {
  '#fff':'rgba(255,255,255,.08)','#ffffff':'rgba(255,255,255,.08)',
  '#1b1b1b':'#FFFFFF','#111':'#FFFFFF','#000':'#FFFFFF','#222':'#FFFFFF','#333':'#FFFFFF',
  '#f24822':N_PINK,'#e5372a':'#FF6B8A','#b3261e':'#FF6B8A','#fdecea':'rgba(255,107,138,.16)',
  '#2f8fe0':N_PINK,'#2a9d6b':'#9FE3D2','#4169c7':'#9CC8FF','#8e4fd6':'#B9A6FF',
  '#f2f2f2':'rgba(255,255,255,.12)','#f4f4f2':'rgba(255,255,255,.12)','#f6f5f2':'rgba(255,255,255,.1)','#f0efe9':'rgba(255,255,255,.12)','#f0f0f0':'rgba(255,255,255,.1)',
  '#ececec':'rgba(255,255,255,.12)','#eee':'rgba(255,255,255,.12)','#e9e9e9':'rgba(255,255,255,.12)','#e6e6e6':'rgba(255,255,255,.14)','#e2e2e2':'rgba(255,255,255,.14)','#e1e1e1':'rgba(255,255,255,.14)',
  '#dcdcdc':'rgba(255,255,255,.2)','#d6d6d6':'rgba(255,255,255,.2)','#d4d4d4':'rgba(255,255,255,.2)','#cfcfcf':'rgba(255,255,255,.24)','#c8c8c8':'rgba(255,255,255,.24)',
  '#e5f0fc':'rgba(243,184,255,.16)','#e9f3fd':'rgba(243,184,255,.14)','#d9ecfc':'rgba(243,184,255,.18)'
};
const N_LINE = {
  '#1b1b1b':'rgba(255,255,255,.7)','#111':'rgba(255,255,255,.7)','#000':'rgba(255,255,255,.7)',
  '#fff':'rgba(255,255,255,.16)','#ffffff':'rgba(255,255,255,.16)',
  '#ececec':'rgba(255,255,255,.12)','#f0f0f0':'rgba(255,255,255,.1)','#e2e2e2':'rgba(255,255,255,.12)','#e6e6e6':'rgba(255,255,255,.12)','#dcdad5':'rgba(255,255,255,.12)','#eee':'rgba(255,255,255,.12)',
  '#d4d4d4':'rgba(255,255,255,.2)','#d6d6d6':'rgba(255,255,255,.2)','#d8d8d8':'rgba(255,255,255,.2)','#ccc':'rgba(255,255,255,.22)','#c4c4c4':'rgba(255,255,255,.24)',
  '#f24822':N_PINK,'#e5372a':'#FF8FA3','#2f8fe0':N_PINK
};
function nMapCss(css, sheet){
  // a dark overlay (photo captions etc.) keeps its white text
  const keepWhite = !sheet && (/rgba\(0,\s*0,\s*0/.test(css) || /url\(/.test(css));
  return css.replace(/(^|;|\s|\{)(background(?:-color)?|color|border(?:-(?:top|bottom|left|right))?(?:-color)?|outline(?:-color)?|fill|stroke|box-shadow|text-decoration-color|caret-color)(\s*:\s*)([^;}]*)/gi, function(all, pre, prop, colon, val){
    const p = prop.toLowerCase();
    const map = p==='color' || p==='fill' || p==='caret-color' || p==='text-decoration-color' ? N_TEXT : (p.indexOf('background')===0 ? N_BG : (p==='box-shadow' ? null : N_LINE));
    if(!map) return all;
    // light see-through overlays (the song menu, the 3-2-1 countdown) become dark ones
    if(p.indexOf('background')===0) val = val.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0?\.\d+|1)\s*\)/g, (m, a)=> +a>=.5 ? 'rgba(26,14,56,'+Math.max(+a,.88)+')' : m);
    const nv = val.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, function(hex){
      const k = hex.toLowerCase();
      if(p==='color' && keepWhite && (k==='#fff' || k==='#ffffff')) return hex;
      return map[k] || hex;
    });
    return pre + prop + colon + nv;
  });
}
function nightify(html){
  if(typeof html!=='string' || !html) return html;
  // piano keys keep a light keyboard look; chord dots turn pink
  html = html.replace(/border-right:1px solid #1b1b1b;background:#fff/g, 'border-right:1px solid #2A1250;background:#F4EEFF')
             .replace(/background:#1b1b1b;border-radius:0 0 3px 3px;border:1px solid #1b1b1b/g, 'background:#2A1250;border-radius:0 0 3px 3px;border:1px solid #2A1250')
             .replace(/(width:15px;height:15px;border-radius:50%;background:)#1b1b1b/g, '$1'+N_PINK);
  html = html.replace(/style="([^"]*)"/g, (m, css)=>'style="'+nMapCss(css)+'"');
  html = html.replace(/\b(fill|stroke)="#1b1b1b"/g, '$1="#FFFFFF"').replace(/\b(fill|stroke)="#f24822"/g, '$1="'+N_PINK+'"');
  // markings above a word: the text moves next to a curved arrow that lands on the word
  html = html.replace(/<span class="mk mk-c"([^>]*)><span class="mtext">([\s\S]*?)<\/span><\/span><\/span>([\s\S]*?)<span class="marr-v"( style="[^"]*")?><\/span>/g,
    (m, mkStyle, txt, between, arrStyle)=>`</span>${between}<span class="marr-c"${arrStyle||''}>${N_CURVE}<span class="mtext mt-c">${txt}</span></span>`);
  if(html.indexOf('class="mascot"')>=0 && html.indexOf('make some noise!')>=0) html = html.replace(/<svg class="mascot"[\s\S]*?<\/svg>/, N_STAGE_SVG).replace(/make some noise!/, 'Let’s make some noise');
  return html;
}
const N_CURVE = `<svg class="marr-svg" viewBox="0 0 18 30" preserveAspectRatio="none" aria-hidden="true"><path d="M17 1.5C8 2 3.5 9 4.2 26.5" vector-effect="non-scaling-stroke"/><path d="M0.8 21.5L4.3 27.8L8.4 22" vector-effect="non-scaling-stroke"/></svg>`;
// side marks: a short curved arrow from the note to the first / last word
const N_ARR_R = `<svg class="marr-h" width="30" height="20" viewBox="0 0 30 20" aria-hidden="true"><path d="M2 4C12 1 22 4 26 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M20.5 11.5L26.3 14.2L28 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const N_ARR_L = `<svg class="marr-h" width="30" height="20" viewBox="0 0 30 20" aria-hidden="true"><path d="M28 4C18 1 8 4 4 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M9.5 11.5L3.7 14.2L2 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
sideMarkHTML = function(w){
  const txt = `<span class="mtext">${esc(w.mark)}</span>`;
  return w.markSide==='left'
    ? `<span class="mside-abs l">${txt}${N_ARR_R}</span>`
    : `<span class="mside-abs r">${N_ARR_L}${txt}</span>`;
};
// The sign-in illustration: a hand holding up a microphone
const N_STAGE_SVG = `<svg class="n-stage n-hand" viewBox="0 0 320 290" aria-hidden="true" style="overflow:visible">
  <defs>
    <linearGradient id="hBgL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F01CFF"/><stop offset="1" stop-color="#9418E8"/></linearGradient>
    <linearGradient id="hBgR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4524B8"/><stop offset="1" stop-color="#2E1A8C"/></linearGradient>
    <linearGradient id="hSkin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC2DA"/><stop offset="0.5" stop-color="#FF4D8D"/><stop offset="1" stop-color="#2F7BFF"/></linearGradient>
    <linearGradient id="hSkin2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB0D0"/><stop offset="0.55" stop-color="#FF3D84"/><stop offset="1" stop-color="#6A4BFF"/></linearGradient>
    <linearGradient id="hArm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF5C96"/><stop offset="1" stop-color="#3A6BFF"/></linearGradient>
    <linearGradient id="hHandle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#140733"/><stop offset="0.55" stop-color="#2A1260"/><stop offset="0.8" stop-color="#5B3DD6"/><stop offset="1" stop-color="#1A0B44"/></linearGradient>
    <radialGradient id="hHead" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#FF9BF5"/><stop offset="0.55" stop-color="#D21CFF"/><stop offset="1" stop-color="#5B14B8"/></radialGradient>
    <pattern id="hStripeH" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="5" fill="#E61CFF"/></pattern>
    <pattern id="hStripeV" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="4" height="9" fill="#6E14C8"/></pattern>
    <pattern id="hGrille" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="3" fill="rgba(42,8,90,0.45)"/></pattern>
    <clipPath id="hHalfL"><rect x="0" y="0" width="160" height="290"/></clipPath>
    <clipPath id="hHalfR"><rect x="160" y="0" width="160" height="290"/></clipPath>
    <linearGradient id="hFadeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0.82" stop-color="#FFFFFF"/><stop offset="1" stop-color="#000000"/></linearGradient>
    <mask id="hFade"><rect x="-20" y="-20" width="360" height="330" fill="url(#hFadeG)"/></mask>
  </defs>
  <g mask="url(#hFade)">
    <circle cx="160" cy="150" r="128" fill="url(#hBgL)" clip-path="url(#hHalfL)"/>
    <circle cx="160" cy="150" r="128" fill="url(#hBgR)" clip-path="url(#hHalfR)"/>
    <circle cx="246" cy="64" r="46" fill="url(#hStripeH)"/>
    <circle cx="74" cy="226" r="52" fill="url(#hStripeV)" opacity="0.8"/>
    <path d="M30 150C22 112 60 92 98 104C128 114 134 150 112 170C88 192 38 190 30 150Z" fill="#5A0D9E" opacity="0.55"/>
    <path d="M196 214C206 186 250 178 272 196C292 214 282 246 252 252C222 258 188 240 196 214Z" fill="#1B0E5C" opacity="0.7"/>
    <path d="M98 36C120 18 168 22 178 46C186 66 160 80 132 76C104 72 82 52 98 36Z" fill="#2A1478" opacity="0.6"/>
    <circle cx="48" cy="92" r="9" fill="#4A0F96" opacity="0.8"/>
    <circle cx="290" cy="138" r="7" fill="#1B0E5C"/>
    <circle cx="206" cy="270" r="5" fill="#E61CFF" opacity="0.8"/>
    <g fill="none" stroke="#FFB3F3" stroke-width="3" stroke-linecap="round">
      <path d="M262 24c14 6 22 18 24 32"/>
      <path d="M270 6c22 9 34 27 36 48" opacity="0.6"/>
    </g>
    <g transform="translate(176 160) rotate(28)">
      <path d="M-58 64L-8 72L-26 230L-104 230Z" fill="url(#hArm)"/>
      <path d="M-70 150L-18 154L-22 232L-100 232Z" fill="#1B0E5C"/>
      <path d="M-74 162L-14 166M-78 186L-17 190M-82 210L-20 214" stroke="#3A1E9C" stroke-width="5"/>
      <path d="M-17-64L17-64L12 128L-12 128Z" fill="url(#hHandle)"/>
      <rect x="-23" y="-80" width="46" height="18" rx="6" fill="#2A1260"/>
      <rect x="-23" y="-80" width="46" height="5" rx="2.5" fill="#7A5CFF" opacity="0.6"/>
      <circle cx="0" cy="-114" r="38" fill="url(#hHead)"/>
      <circle cx="0" cy="-114" r="38" fill="url(#hGrille)"/>
      <path d="M-22-138a30 30 0 0 1 22-10" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.7"/>
      <path d="M-56-30C-60-48-44-56-30-50L-14-44L-18 80C-36 84-58 76-60 58Z" fill="url(#hSkin2)"/>
      <g stroke="rgba(90,0,70,0.35)" stroke-width="1.5">
        <rect x="-30" y="-44" width="66" height="25" rx="12.5" fill="url(#hSkin)"/>
        <rect x="-32" y="-20" width="70" height="25" rx="12.5" fill="url(#hSkin)"/>
        <rect x="-32" y="4" width="68" height="25" rx="12.5" fill="url(#hSkin)"/>
        <rect x="-30" y="28" width="60" height="24" rx="12" fill="url(#hSkin)"/>
      </g>
      <rect x="-54" y="-62" width="66" height="25" rx="12.5" transform="rotate(-14 -21 -50)" fill="url(#hSkin2)" stroke="rgba(90,0,70,0.35)" stroke-width="1.5"/>
      <ellipse cx="-2" cy="-58" rx="7" ry="5" transform="rotate(-14 -2 -58)" fill="#FFD6E8" opacity="0.7"/>
    </g>
  </g>
</svg>`;

// The light colours in the app's own stylesheets get the same swap
document.querySelectorAll('style').forEach(st=>{ if(st.id!=='nightCss') st.textContent = nMapCss(st.textContent, true); });
// Everything the app puts on screen goes through nightify()
(function(){
  const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  ['screen','modalLayer','toastBox'].forEach(id=>{
    const el = document.getElementById(id); if(!el) return;
    Object.defineProperty(el, 'innerHTML', {
      configurable:true,
      get(){ return desc.get.call(this); },
      set(v){ desc.set.call(this, nightify(v)); }
    });
  });
})();

/* ---- rows with artwork ---- */
function nSub(t){ return t ? `<div class="s">${esc(t)}</div>` : ''; }
songRowHome = function(s){
  const j = songJob(s), b = songBadge(s), sub = songSubLine(s);
  const ind = (hasFlag('mark', s.id) ? `<span class="msi" title="Marked" style="font-size:17px;font-variation-settings:'FILL' 1;color:#FFFFFF">bookmark</span>` : '')
    + (hasFlag('fav', s.id) ? `<span class="msi" title="Loved" style="font-size:17px;font-variation-settings:'FILL' 1;color:${N_PINK}">favorite</span>` : '');
  return `<div class="list-row hrow nrow" data-act="openSongFrom" data-id="${s.id}" data-from="home">
    ${nArt('song:'+songTitle(s), 44)}
    <div style="min-width:0;flex:1"><div class="t"><span class="tt">${esc(songTitle(s))}</span>${ind ? `<span class="hind">${ind}</span>` : ''}</div>${j ? jobBarHTML(s) : (sub ? `<div class="s"${s.failed?' style="color:#FFB3C1"':''}>${esc(sub)}</div>` : '')}</div>
    ${b[0] ? `<span class="sbadge" style="font-size:11px;font-weight:800;letter-spacing:.05em;white-space:nowrap;color:${b[1]}">${b[0]}</span>` : ''}
  </div>`;
};
const _nSongRowList = songRowList;
songRowList = function(id, badgeText, badgeCol, from, rowAct, compact){
  const s = song(id);
  // a song someone else made, in your Songs list: it can be removed (from your songs) like yours can be deleted
  if(!rowAct && from==='list' && ST.screen==='list' && ST.listKind==='songs' && s.mine===false && D.order.includes(id)){
    const pl = ST.listPl ? D.playlists.find(p=>p.id===ST.listPl) : null;
    if(!pl || pl.auto) rowAct = 'unlib';
  }
  const html = _nSongRowList(id, badgeText, badgeCol, from, rowAct, compact);
  return html.replace('<div class="sm">', `<div class="sm nsm">${nArt('song:'+songTitle(s), 44)}<div class="nsm-t">`).replace('\n    <div class="scol s-content">', '</div>\n    <div class="scol s-content">').replace('class="list-row has-act srow', 'class="list-row has-act srow nrow');
};
playlistRow = function(p){
  const ids = p.auto ? D.order : p.ids;
  const n = ids.length, sub = p.src ? (p.src==='spotify' ? 'From Spotify' : 'From YouTube') : (n+' song'+(n===1?'':'s')+(p.mine?'':' · by '+p.by));
  return `<div class="list-row nrow" data-act="openPlaylist" data-id="${p.id}">${nArt('pl:'+(p.title||p.id), 48)}<div style="min-width:0;flex:1"><div class="t">${esc(p.title)}${srcBadge(p)}</div><div class="s">${esc(sub)}</div></div>${icon('chevron_right',22)}</div>`;
};
function nGigSub(g){
  const n = (g.setlist||[]).length;
  return (nGigWhen(g) ? '' : (g.date ? g.date : 'No date')+' · ') + n+' song'+(n===1?'':'s') + (g.mine===false && g.by ? ' · by '+g.by : '');
}
function nGigTicket(g){
  const live = ST._liveGig===g.id;
  return `<div class="nticket" data-act="openGig" data-id="${g.id}">${nStub(g)}<div class="nt-body"><div class="t">${esc(g.title)}</div><div class="s">${esc(nGigSub(g))}</div></div>${live?'<span class="nlive">LIVE</span>':icon('chevron_right',22)}</div>`;
}
gigRowHome = nGigTicket;
gigRowList = nGigTicket;

/* ---- Home ---- */
// The gig at the top of Home: the live one, else the next one coming up,
// else the gig opened last (or one with no date, or the latest past one)
function nNextGig(){
  if(ST._liveGig){ const g = D.gigs.find(x=>x.id===ST._liveGig); if(g) return g; }
  const order = nGigOrder(D.gigs);
  const up = order.find(g=>{ const w = nGigWhen(g); return w && !w.past; });
  if(up) return up;
  const last = ST.gigId && D.gigs.find(x=>x.id===ST.gigId);
  return last || order[0] || null;
}
function nHeroGig(g){
  const live = ST._liveGig===g.id, n = (g.setlist||[]).length, w = nGigWhen(g);
  const k = live ? 'LIVE NOW' : w && w.today ? "TODAY'S GIG" : w && !w.past ? 'NEXT GIG' : 'YOUR GIG';
  return `<div class="nhero" data-act="openGig" data-id="${g.id}">
    ${nStub(g, true)}
    <div class="nh-body">
      <span class="nh-k">${k} · ${n} SONG${n===1?'':'S'}</span>
      <span class="nh-t">${esc(g.title)}</span>
      <span class="nh-go">${live ? 'Back to the gig' : 'Open the gig'} ${icon('arrow_forward',18)}</span>
    </div>
  </div>`;
}
renderHome = function(){
  const name = (ST.nickname || nicknameFromEmail(ST.email) || '').trim();
  const hero = nNextGig();
  const otherGigs = nGigOrder(D.gigs).filter(g=>!hero || g.id!==hero.id).slice(0,3);
  const tiles = D.playlists.slice(0,8).map(p=>{
    const ids = p.auto ? D.order : p.ids, n = ids.length;
    const sub = p.src ? (p.src==='spotify' ? 'Spotify' : 'YouTube') : n+' song'+(n===1?'':'s');
    return `<div class="ntile" data-act="openPlaylist" data-id="${p.id}">${nArt('pl:'+(p.title||p.id), 112, 24)}<span class="t">${esc(p.title)}</span><span class="s">${esc(sub)}</span></div>`;
  }).join('');
  const recent = homeSongIds().slice(0,6).map(id=>songRowHome(song(id))).join('');
  const hk = homeSort(), emptyNote = hk==='fav' ? 'No loved songs yet — tap ♡ on a song in All Songs.' : hk==='marked' ? 'No marked songs yet.' : 'No songs yet — tap + to add one.';
  const initial = esc((name || '?').charAt(0).toUpperCase());
  return `<div class="scr nhome">
    <div class="nh-head">
      <h1 class="nh-brand" data-act="goHome">${N_WM}</h1>
      <button class="icon-btn nh-avatar" title="Account & settings" aria-label="Account and settings" data-act="openAccount">${initial}</button>
    </div>
    <label class="search-field nh-search">
      <input placeholder="Search songs, playlists or gigs" aria-label="Search" value="${esc(ST.homeQuery)}" data-bind="homeQuery" data-key="runSearch" inputmode="search" enterkeyhint="search">
      <button class="icon-btn nh-sbtn" aria-label="Search" data-act="runSearch">${icon('search',22)}</button>
    </label>
    <div class="home-grid">
      <div class="nh-col">
        ${hero ? nHeroGig(hero) : `<div class="nhero empty" data-act="newItem" data-kind="gig"><span class="nstub big" style="background:#B9A6FF;color:#2A1250"><span class="msi" style="font-size:30px">add</span></span><div class="nh-body"><span class="nh-k">GIGS</span><span class="nh-t">Plan your first gig</span></div></div>`}
        <section>
          <div class="nh-h"><h2 data-act="openList" data-kind="playlists">Playlists</h2><button class="icon-btn nh-add" title="New playlist" aria-label="New playlist" data-act="newItem" data-kind="playlist">${icon('add',20)}</button><a class="link nh-all" data-act="openList" data-kind="playlists">All</a></div>
          <div class="ntiles">${tiles || '<div class="s" style="padding:8px 0">No playlists yet.</div>'}</div>
        </section>
        <section>
          <div class="nh-h"><h2 data-act="openList" data-kind="gigs">Gigs</h2><button class="icon-btn nh-add" title="New gig" aria-label="New gig" data-act="newItem" data-kind="gig">${icon('add',20)}</button><a class="link nh-all" data-act="openList" data-kind="gigs">All</a></div>
          <div class="ntickets">${otherGigs.map(nGigTicket).join('') || '<div class="s" style="padding:8px 0">No other gigs yet.</div>'}</div>
        </section>
      </div>
      <div class="nh-col">
        <section>
          <div class="nh-h"><h2 data-act="openList" data-kind="songs">Songs</h2><button class="icon-btn nh-add" title="Add a song" aria-label="Add a song" data-act="newSong">${icon('add',20)}</button><label class="hsort" title="Show"><select data-xchange="homeSort" aria-label="Show songs" style="width:${Math.round((HOME_SORTS.find(x=>x[0]===hk)||HOME_SORTS[0])[1].length*7.6)+28}px">${HOME_SORTS.map(([v,l])=>`<option value="${v}"${v===hk?' selected':''}>${l}</option>`).join('')}</select>${icon('expand_more',18)}</label></div>
          ${readingRowsHTML()}${recent || ((ST.reading||[]).length ? '' : `<div class="s" style="padding:14px 0">${emptyNote}</div>`)}
          <a class="link nh-more" data-act="openList" data-kind="songs">All songs</a>
        </section>
      </div>
    </div>
  </div>`;
};

/* ---- bottom tab bar (Home / Songs / Gigs / New song) ---- */
const N_NAV_SCREENS = ['home','list','search','collab'];
function nNavHTML(){
  const on = k => (k==='home' && ST.screen==='home') || (k==='songs' && ST.screen==='list' && ST.listKind==='songs') || (k==='gigs' && ST.screen==='list' && ST.listKind==='gigs');
  const b = (k, ic, lbl, act)=>`<button class="nnav-b${on(k)?' on':''}" ${act} aria-label="${lbl}"${on(k)?' aria-current="page"':''}>${icon(ic,22)}<span>${lbl}</span></button>`;
  return b('home','home','Home','data-act="nav" data-to="home"') + b('songs','music_note','Songs','data-act="openList" data-kind="songs"')
    + b('gigs','calendar_month','Gigs','data-act="openList" data-kind="gigs"') + b('new','add_circle','New song','data-act="newSong"');
}
function nSyncNav(){
  let nav = document.getElementById('nNav');
  if(!nav){ nav = document.createElement('nav'); nav.id = 'nNav'; nav.setAttribute('aria-label','Main'); document.body.appendChild(nav); }
  const show = N_NAV_SCREENS.includes(ST.screen) && !!ST.userId;
  document.body.classList.toggle('has-nav', show);
  nav.hidden = !show;
  if(show){ const h = nNavHTML(); if(nav._h !== h){ nav.innerHTML = h; nav._h = h; } }
}

/* ---- TV / monitor screen for a gig ---- */
function tvUrl(gigId){ return new URL('tv.html?gig='+encodeURIComponent(gigId), location.href).href; }
XActions.openTv = function(){ const g = gigObj(); if(g) window.open(tvUrl(g.id), '_blank', 'noopener'); };
XActions.copyTv = async function(){ const g = gigObj(); if(!g) return; const url = tvUrl(g.id); try{ await navigator.clipboard.writeText(url); toast('TV screen link copied'); }catch(e){ toast(url); } };
const _nRenderGig = renderGig;
renderGig = function(){
  return _nRenderGig().replace(/(Guests scan to follow the lyrics in sync, karaoke-style\. No app or sign-in needed\.<\/div>)/,
    '$1<div class="ntv-row"><span class="msi" style="font-size:22px">tv</span><span style="flex:1;text-align:left">Show the lyrics on a TV or big screen</span><button class="btn btn-outline btn-sm" data-xact="copyTv">Copy link</button><button class="btn btn-dark btn-sm" data-xact="openTv">Open</button></div>');
};

/* ---- render: Night extras after every redraw ---- */
const _nRender = render;
let _nScrOverlay = false;
render = function(){
  ST.perfDark = false;
  if(!nInChords()) ST.chordArmed = null;
  _nRender();
  document.body.classList.toggle('n-home', ST.screen==='home' && !!ST.userId);
  nMarkArmed();
  // an overlay drawn inside the screen (song menu, countdown) is redrawn on
  // every playback tick: fade it in once, not on every tick (that flickered)
  const ov = document.querySelectorAll('#screen .modal-backdrop');
  if(ov.length && _nScrOverlay) ov.forEach(el=>{ el.style.animation = 'none'; });
  _nScrOverlay = ov.length > 0;
  nSyncNav();
  nQueueFit();
};

/* ---- chords step: drag a chord onto a word, or tap a chord and then tap words ---- */
function nInChords(){ return ST.screen==='create' && ST.step==='chords'; }
function nMarkArmed(){
  document.body.classList.toggle('chord-armed', !!ST.chordArmed && nInChords());
  if(!nInChords()) return;
  document.querySelectorAll('.ctile,.utile').forEach(t=>t.classList.toggle('armed', t.dataset.dragChord===ST.chordArmed));
}
const _nUsedRow = renderUsedRow;
renderUsedRow = function(){
  const html = _nUsedRow().replace('Drag and drop a chord onto a word', 'Drag a chord onto a word, or tap a chord and then tap the words');
  if(!ST.chordArmed) return html;
  return html.replace(/<\/div><\/div>$/, '</div><div class="ce-armed">Tap words to add <b>'+esc(ST.chordArmed)+'</b><button class="ce-armed-x" data-xact="disarmChord" aria-label="Stop adding '+esc(ST.chordArmed)+'">Done</button></div></div>');
};
XActions.disarmChord = function(){ ST.chordArmed = null; render(); };
document.addEventListener('click', function(e){
  if(!nInChords()) return;
  const tile = e.target.closest('.ctile,.utile');
  if(tile){
    const ch = tile.dataset.dragChord; if(!ch) return;
    ST.chordArmed = ST.chordArmed===ch ? null : ch;
    if(ST.chordArmed){ const p = splitChordStr(ch); ST.selRoot = p.root; ST.selSuffix = p.q; }
    render(); return;
  }
  if(!ST.chordArmed || e.target.closest('.chip-x,[data-drag-chord],[data-act],[data-xact]')) return;
  const w = e.target.closest('.lword[data-drop]'); if(!w) return;
  const s = D.songs[ST.editId], id = w.dataset.drop;
  // tapping a word that already has this chord takes it off again
  if(s && s.chords && s.chords[id]===ST.chordArmed){ Actions.removeChord({ id }); return; }
  dropChord(ST.chordArmed, null, id);
});

/* ---- the remove button for songs you added from someone else ---- */
const _nRowAct = rowActHTML;
rowActHTML = function(kind, id){
  if(kind!=='unlib') return _nRowAct(kind, id);
  return `<button class="row-act" data-act="askRowAction" data-kind="unlib" data-id="${esc(id)}" title="Remove from my songs" aria-label="Remove from my songs">${icon('delete',20)}</button>`;
};
/* ---- song menu: on someone else's song, "Copy and edit" goes first ---- */
const _nSongMenu = renderSongMenu;
renderSongMenu = function(){
  let h = _nSongMenu();
  const m = h.match(/<a class="link"[^>]*data-act="copySong">[^<]*<\/a>/);
  if(!m) return h;
  h = h.replace(m[0], '');
  return h.replace('close</span></span>', 'close</span></span>\n      '+m[0]);
};
/* ---- nickname: typing in the box now reaches Save ---- */
Binds.nickInput = function(v){ ST.editNick = v; };
/* ---- a deleted song leaves every playlist and gig straight away ---- */
const _nDeleteEverywhere = deleteSongEverywhere;
deleteSongEverywhere = function(id){
  const gigs = D.gigs.filter(g=>(g.setlist||[]).includes(id)).map(g=>g.id);
  const pls = D.playlists.filter(p=>!p.auto && (p.ids||[]).includes(id)).map(p=>p.id);
  _nDeleteEverywhere(id);
  ST.played = (ST.played||[]).filter(x=>x!==id);
  gigs.forEach(gid=>{ const g = D.gigs.find(x=>x.id===gid); if(g){ clearTimeout(_saveTimers['gig:'+gid]); saveGigRow(g); } });
  pls.forEach(pid=>{ const p = D.playlists.find(x=>x.id===pid); if(p){ clearTimeout(_saveTimers['pl:'+pid]); savePlaylistRow(p); } });
};
// ...and songs deleted earlier (or on another device) are cleared out of your gigs and playlists when they load
const _nLoadUserData = loadUserData;
loadUserData = async function(){
  await _nLoadUserData();
  if(!ST.userId) return;
  try{
    const want = new Set();
    D.gigs.forEach(g=>{ if(g.mine!==false) (g.setlist||[]).forEach(id=>{ if(!D.songs[id]) want.add(id); }); });
    D.playlists.forEach(p=>{ if(!p.auto && p.mine!==false) (p.ids||[]).forEach(id=>{ if(!D.songs[id]) want.add(id); }); });
    if(!want.size) return;
    const res = await sb.from('songs').select('id').in('id', [...want]);
    if(res.error) return;
    const alive = new Set((res.data||[]).map(r=>r.id));
    const gone = new Set([...want].filter(id=>!alive.has(id)));
    if(!gone.size) return;
    D.gigs.forEach(g=>{ if(g.mine===false) return; const n = (g.setlist||[]).filter(id=>!gone.has(id)); if(n.length!==(g.setlist||[]).length){ g.setlist = n; saveGigRow(g); } });
    D.playlists.forEach(p=>{ if(p.auto || p.mine===false) return; const n = (p.ids||[]).filter(id=>!gone.has(id)); if(n.length!==(p.ids||[]).length){ p.ids = n; savePlaylistRow(p); } });
    render();
  }catch(e){ console.error('Singa: tidying deleted songs failed', e); }
};
/* ---- gig: tapping another song in the list loads it; the performer presses Play ---- */
Actions.pickGigSong = function(d){
  const g = gigObj(); if(!g) return;
  const cur = gigSongId();
  if(d.id===cur) return;
  const gStarted = ST.playing || ST.t>0;
  const played = (gStarted && cur && !ST.played.includes(cur)) ? [...ST.played, cur] : ST.played;
  stopOnsetListening();
  ST.vcd = 0; ST.gigCur = d.id; ST.played = played.filter(x=>x!==d.id); ST.t = 0; ST.playing = false; ST.gListening = false;
  render();
};
const _nGigPlayer = renderGigPlayer;
renderGigPlayer = function(){
  const cur = gigSongId();
  return _nGigPlayer().replace(/(cursor:pointer;justify-content:space-between" )data-act="startGig" data-id="([^"]*)"/g,
    (m, pre, id)=> id===cur ? m : pre+'data-act="pickGigSong" data-id="'+id+'"');
};
/* ---- "Got it!" after an upload: a hand throwing the horns, and files (not songs) ---- */
const N_HORNS_SVG = `<svg class="n-stage n-horns" viewBox="0 0 320 290" aria-hidden="true" style="overflow:visible">
  <defs>
    <linearGradient id="gBgL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F01CFF"/><stop offset="1" stop-color="#9418E8"/></linearGradient>
    <linearGradient id="gBgR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4524B8"/><stop offset="1" stop-color="#2E1A8C"/></linearGradient>
    <linearGradient id="gSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC2DA"/><stop offset="0.55" stop-color="#FF4D8D"/><stop offset="1" stop-color="#7A4BFF"/></linearGradient>
    <linearGradient id="gSkin2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB0D0"/><stop offset="0.6" stop-color="#FF3D84"/><stop offset="1" stop-color="#4E5BFF"/></linearGradient>
    <linearGradient id="gArm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF5C96"/><stop offset="1" stop-color="#3A6BFF"/></linearGradient>
    <pattern id="gStripeH" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="5" fill="#E61CFF"/></pattern>
    <pattern id="gStripeV" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="4" height="9" fill="#6E14C8"/></pattern>
    <clipPath id="gHalfL"><rect x="0" y="0" width="160" height="290"/></clipPath>
    <clipPath id="gHalfR"><rect x="160" y="0" width="160" height="290"/></clipPath>
    <linearGradient id="gFadeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0.8" stop-color="#FFFFFF"/><stop offset="1" stop-color="#000000"/></linearGradient>
    <mask id="gFade"><rect x="-20" y="-20" width="360" height="330" fill="url(#gFadeG)"/></mask>
  </defs>
  <g mask="url(#gFade)">
    <circle cx="160" cy="150" r="128" fill="url(#gBgL)" clip-path="url(#gHalfL)"/>
    <circle cx="160" cy="150" r="128" fill="url(#gBgR)" clip-path="url(#gHalfR)"/>
    <circle cx="74" cy="70" r="44" fill="url(#gStripeH)"/>
    <circle cx="252" cy="222" r="50" fill="url(#gStripeV)" opacity="0.8"/>
    <path d="M206 64C214 36 254 30 274 50C292 68 280 98 254 102C228 106 200 90 206 64Z" fill="#1B0E5C" opacity="0.65"/>
    <path d="M36 196C30 168 62 152 90 162C114 172 116 202 96 216C74 230 42 222 36 196Z" fill="#5A0D9E" opacity="0.55"/>
    <circle cx="282" cy="140" r="8" fill="#1B0E5C"/><circle cx="42" cy="128" r="6" fill="#E61CFF" opacity="0.8"/>
    <g fill="#FFD8A8"><path d="M232 128l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M92 112l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>
    <g transform="translate(160 176) rotate(-6)">
      <path d="M-46 44L42 44L36 150L-52 150Z" fill="url(#gArm)"/>
      <path d="M-48 96L36 96L32 152L-52 152Z" fill="#1B0E5C"/>
      <path d="M-49 108H35M-50 124H34M-51 140H33" stroke="#3A1E9C" stroke-width="5"/>
      <g stroke="rgba(90,0,70,0.35)" stroke-width="1.5">
        <rect x="-56" y="-118" width="27" height="112" rx="13.5" transform="rotate(-15 -42 -10)" fill="url(#gSkin)"/>
        <rect x="31" y="-92" width="23" height="86" rx="11.5" transform="rotate(17 42 -10)" fill="url(#gSkin)"/>
        <rect x="-56" y="-24" width="112" height="84" rx="34" fill="url(#gSkin2)"/>
        <rect x="-29" y="-40" width="30" height="44" rx="15" fill="url(#gSkin)"/>
        <rect x="1" y="-37" width="28" height="41" rx="14" fill="url(#gSkin)"/>
        <rect x="-50" y="2" width="84" height="25" rx="12.5" transform="rotate(-8 -8 14)" fill="url(#gSkin2)"/>
      </g>
      <ellipse cx="-67" cy="-103" rx="7" ry="5" transform="rotate(-15 -67 -103)" fill="#FFE0EE" opacity="0.75"/>
      <ellipse cx="63" cy="-80" rx="6" ry="4.4" transform="rotate(17 63 -80)" fill="#FFE0EE" opacity="0.75"/>
      <path d="M-30 30c8 6 22 7 34 2" stroke="rgba(90,0,70,0.3)" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
    <g fill="none" stroke="#FFB3F3" stroke-width="3" stroke-linecap="round">
      <path d="M108 52c-10 6-16 16-16 28"/><path d="M98 34c-16 9-26 25-26 44" opacity="0.6"/>
      <path d="M226 74c9 6 14 15 14 26"/><path d="M238 58c14 9 22 23 22 40" opacity="0.6"/>
    </g>
  </g>
</svg>`;
const _nQueued = renderQueued;
renderQueued = function(){
  const q = ST.queued || [];
  let h = _nQueued().replace(/<svg class="mascot"[\s\S]*?<\/svg>/, N_HORNS_SVG);
  const docs = q.length===1 && /^(\d+) documents$/.exec(q[0]||'');
  if(q.length>1) h = h.replace(q.length+' songs<br>are being added', q.length+' files<br>are being read');
  else if(docs) h = h.replace('“'+esc(q[0])+'”<br>is being added', docs[1]+' files<br>are being read');
  if(q.length>1 || docs) h = h.replace(/We'll let you know when (they're|it's) ready — you'll find (them|it) in/, "We'll let you know when your songs are ready — you'll find them in");
  return h;
};
/* ---- markings: a note that would run off the right edge goes to the left of its arrow ---- */
let _nFitQ = 0;
function nQueueFit(){ if(_nFitQ) return; _nFitQ = requestAnimationFrame(()=>{ _nFitQ = 0; nFitMarks(); }); }
function nFitMarks(){
  const W = window.innerWidth;
  document.querySelectorAll('#screen .marr-c').forEach(a=>{
    const t = a.querySelector('.mt-c'); if(!t) return;
    a.classList.remove('flip');
    const clip = a.closest('.lyr-scroll') || a.closest('.scr') || document.getElementById('screen');
    const right = Math.min(W, clip.getBoundingClientRect().right) - 6;
    if(t.getBoundingClientRect().right > right) a.classList.add('flip');
  });
}
window.addEventListener('resize', nQueueFit);
try{ new MutationObserver(nQueueFit).observe(document.getElementById('screen'), { childList:true, subtree:true }); }catch(e){}
// the wordmark in the top bar
(function(){ const w = document.querySelector('#topbar .wordmark'); if(w) w.innerHTML = N_WM; })();
// the old light/dark switch is gone — the app is always Night
try{ document.querySelector('meta[name="theme-color"]').setAttribute('content', '#1A0E38'); }catch(e){}
// the Night stylesheet goes last, after the styles earlier parts added
(function(){ const l = document.getElementById('nightCss'); if(l) document.head.appendChild(l); })();

// part10 already started the app; draw it again in the Night design
render();
