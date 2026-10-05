"use strict";
/* ============================================================
   SUPABASE CLIENT
   Project URL + publishable (anon-safe) key only — never the secret
   key or DB password, which must stay out of this client-side file.
   ============================================================ */
const sb = supabase.createClient(
  'https://xnzytiaixthfbmejltww.supabase.co',
  'sb_publishable_JTLPNLQNOHL3TmbS1MiGWg_rsX_QqmH'
);

/* ============================================================
   SERVICE WORKER (PWA installability + offline app shell)
   ============================================================ */
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}

/* ============================================================
   DATA — ported verbatim from the authoritative design source
   ============================================================ */
const EX_LYRICS = "Don't go breaking my heart\nI couldn't if I tried\nHoney, if I get restless\nBaby, you're not that kind";
const EX_SUB = "Dolly Parton and the booland. Long version 2009";
const LETTERS = ['A','B','C','D','E','F','G'];
const ACC = { A:'Ab', B:'Bb', C:'C#', D:'Db', E:'Eb', F:'F#', G:'G#' };
const ROOTS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const ALT = { Db:1, 'D#':3, Gb:6, 'G#':8, 'A#':10 };
const SUFFIXES = ['','m','7','m7','maj7','6','sus2','sus4','dim','aug','add9','9'];
const IV = { '':[0,4,7], m:[0,3,7], '7':[0,4,7,10], m7:[0,3,7,10], maj7:[0,4,7,11], '6':[0,4,7,9], sus2:[0,2,7], sus4:[0,5,7], dim:[0,3,6], aug:[0,4,8], add9:[0,4,7,14], '9':[0,4,7,10,14] };
const E_SHAPE = { '':[0,2,2,1,0,0], m:[0,2,2,0,0,0], '7':[0,2,0,1,0,0], m7:[0,2,0,0,0,0], maj7:[0,2,1,1,0,0], '6':[0,2,2,1,2,0], sus4:[0,2,2,2,0,0], '9':[0,2,0,1,0,2] };
const A_SHAPE = { '':[-1,0,2,2,2,0], m:[-1,0,2,2,1,0], '7':[-1,0,2,0,2,0], m7:[-1,0,2,0,1,0], maj7:[-1,0,2,1,2,0], '6':[-1,0,2,2,2,2], sus2:[-1,0,2,2,0,0], sus4:[-1,0,2,2,3,0], dim:[-1,0,1,2,1,-1], aug:[-1,0,3,2,2,1], add9:[-1,0,2,4,2,0], '9':[-1,0,2,4,2,3] };
const OPEN_GUITAR = { A:[-1,0,2,2,2,0], Am:[-1,0,2,2,1,0], A7:[-1,0,2,0,2,0], Am7:[-1,0,2,0,1,0], Asus2:[-1,0,2,2,0,0], Asus4:[-1,0,2,2,3,0], C:[-1,3,2,0,1,0], C7:[-1,3,2,3,1,0], Cmaj7:[-1,3,2,0,0,0], D:[-1,-1,0,2,3,2], Dm:[-1,-1,0,2,3,1], D7:[-1,-1,0,2,1,2], Dsus2:[-1,-1,0,2,3,0], Dsus4:[-1,-1,0,2,3,3], E:[0,2,2,1,0,0], Em:[0,2,2,0,0,0], E7:[0,2,0,1,0,0], Em7:[0,2,0,0,0,0], F:[1,3,3,2,1,1], G:[3,2,0,0,0,3], G7:[3,2,0,0,0,1] };
const OPEN_UKE = { C:[0,0,0,3], C7:[0,0,0,1], Cmaj7:[0,0,0,2], Am:[2,0,0,0], Am7:[0,0,0,0], A:[2,1,0,0], A7:[0,1,0,0], F:[2,0,1,0], G:[0,2,3,2], G7:[0,2,1,2], D:[2,2,2,0], Dm:[2,2,1,0], Em:[0,4,3,2], E7:[1,2,0,2] };
const WHITE = [0,2,4,5,7,9,11,12,14,16,17,19,21,23];
const BLACK = [[1,0],[3,1],[6,3],[8,4],[10,5],[13,7],[15,8],[18,10],[20,11],[22,12]];
const STAGES = ['Politely asking your voice to step away from the guitar','Teaching every word to keep up with you','Eavesdropping on the chords','Polishing the teleprompter'];
const DEMO_CHORDS = { '0-0':'Am','0-2':'F','0-4':'G','1-0':'Am','1-3':'G','2-0':'F','2-3':'G','3-0':'Am','3-2':'F' };
const SORTS = [['az','A → Z'],['za','Z → A'],['played','Most played'],['recent','Recently added'],['mine','Added by you']];
const INSTS = [['guitar','Guitar'],['piano','Piano'],['ukulele','Ukulele'],['none','No instrument']];

function freshData(){
  return {
    songs: {
      dgbmh:{ id:'dgbmh', title:"Don't Go Breaking My Heart", sub:EX_SUB, lyrics:EX_LYRICS, chords:{...DEMO_CHORDS}, notes:{'1-4':'Hi note','2-0':'Before','2-3':'Slide'}, synced:true, plays:42, added:5, mine:true, instrument:'guitar' },
      shp:{ id:'shp', title:'Shiny happy people', sub:'REM', lyrics:'', chords:{}, notes:{}, synced:false, plays:12, added:4, mine:true },
      nov:{ id:'nov', title:'November Rain', sub:"Guns 'n' Roses", lyrics:'', chords:{}, notes:{}, synced:false, plays:30, added:3, mine:false, by:'allhands232' },
      bo:{ id:'bo', title:'Bo', sub:'Wooho', lyrics:'', chords:{}, notes:{}, synced:false, plays:3, added:2, mine:true },
      angie:{ id:'angie', title:'Angie', sub:'Long version', lyrics:'', chords:{}, notes:{}, synced:false, plays:8, added:1, mine:true }
    },
    order: ['dgbmh','shp','nov','bo','angie'],
    playlists: [
      { id:'my', title:'My songs', auto:true, ids:[], mine:true, added:1, plays:60 },
      { id:'gnr', title:"Guns 'n' Roses", src:'spotify', ids:['nov'], mine:true, added:2, plays:14 },
      { id:'aff', title:'Affirmations', src:'youtube', ids:['bo','angie'], mine:false, by:'johnnyboy', added:3, plays:5 }
    ],
    gigs: [
      { id:'nye', title:"New year's eve party with Simon and Duncan", date:'Dec 31, 2026', setlist:['dgbmh','shp','nov','bo','angie'], plays:1, added:4, mine:true, settings:{} },
      { id:'anna', title:"Anna's Party, Monday May 2026", date:'May 4, 2026', setlist:['shp','nov','bo','angie'], plays:1, added:3, mine:true, settings:{} },
      { id:'john', title:"John's Cafe", date:'Every Thursday', setlist:['dgbmh','angie'], plays:22, added:2, mine:true, settings:{} },
      { id:'pride', title:'Pride weekend', date:'Jun 27, 2026', setlist:['shp','bo'], plays:2, added:1, mine:false, by:'Allan Jones', settings:{} }
    ],
    collabs: [ { name:'johnnyboy', email:'johnny@gmail.com', gigs:['anna'] }, { name:'Allan Jones', email:'allan@gmail.com', gigs:['nye','anna','john','pride'] } ],
    photos: [ {id:1,by:'Maya',span:1},{id:2,by:'Tom',span:1},{id:3,by:'Ezra',span:2},{id:4,by:'Lior',span:1},{id:5,by:'Maya',span:2},{id:6,by:'Sam',span:1} ]
  };
}

const EMPTY_SONG = { id:'none', title:'Untitled song', sub:'', lyrics:'', chords:{}, notes:{}, synced:false };
/* ============================================================
   STATE
   ============================================================ */
const D = freshData();
const ST = {
  screen:'login', back:'home', email:'', password:'', authBusy:false, authMode:'signin', userId:null, nickname:null, editNick:null, authProvider:null,
  homeQuery:'', searchQuery:'', sort:'recent', sortOpen:false,
  listKind:'songs', listPl:null, listQuery:'',
  songId:'dgbmh', viewBy:null, viewChord:null, instrument:'guitar', menu:false, instMenu:false, chordH:230,
  recentChords:[], _lastProgScrollAt:0,
  startMode:'countdown', vcd:0, listening:false,
  editId:null, createMode:'manual', step:'lyrics', similar:false, rootIdx:0, selRoot:'A', selSuffix:'m', selWord:null, noteDraft:'', autoChords:false,
  phase:'idle', cd:0, recT:0, bars:[], procPct:0, procNote:'', isPublic:false,
  t:0, playing:false, ctx:'view', guide:false, guideInst:'Piano',
  gigId:'nye', gigCur:null, played:[], orderVotes:{}, gListening:false, gigSettings:false,
  plan:'free', upgrade:false, collabFor:null, editList:null, qrOpen:false,
  collabEdit:null, newItem:null, pick:null, songPick:null, spQuery:'',
  notif:{req:true,photos:true,chat:false},
  perfDark:false, toast:null, sampling:false, sampleLeft:0, part:'Keys', avatarUrl:null
};
let toastTimer = null;

/* ============================================================
   REAL ACCOUNT (Supabase Auth + profiles table)
   Replaces the old localStorage-only stand-in: Login now creates/signs
   into a real Supabase account (email+password — signs you up
   automatically on first use), and profile fields are stored in a
   `profiles` row keyed by your Supabase user id, with Row Level
   Security restricting it to you.
   ============================================================ */
async function applySession(session){
  ST.userId = session.user.id;
  ST.email = session.user.email || ST.email;
  const socialAvatar = (session.user.user_metadata && session.user.user_metadata.avatar_url) || null;
  let row = null;
  try{
    const res = await sb.from('profiles').select('*').eq('id', ST.userId).maybeSingle();
    row = res.data;
  }catch(e){}
  if(row){
    ST.nickname = row.nickname || nicknameFromEmail(ST.email);
    ST.instrument = row.instrument || ST.instrument;
    ST.plan = row.plan || ST.plan;
    if(row.notif) ST.notif = row.notif;
    ST.startMode = row.start_mode || ST.startMode;
    ST.avatarUrl = row.avatar_url || socialAvatar;
  } else {
    ST.nickname = ST.nickname || nicknameFromEmail(ST.email);
    ST.avatarUrl = socialAvatar;
    syncProfile();
  }
  ST.authProvider = (session.user.app_metadata && session.user.app_metadata.provider) || 'email'; ST.screen = 'home';
}
function syncProfile(){
  if(!ST.userId) return;
  try{
    sb.from('profiles').upsert({
      id: ST.userId, email: ST.email, nickname: ST.nickname, instrument: ST.instrument,
      plan: ST.plan, notif: ST.notif, start_mode: ST.startMode, avatar_url: ST.avatarUrl, updated_at: new Date().toISOString()
    }).then(function(){}).catch(function(){});
  }catch(e){}
}
async function restoreSession(){
  try{
    const { data } = await sb.auth.getSession();
    if(data && data.session && data.session.user) await applySession(data.session);
  }catch(e){}
  render();
}
function nicknameFromEmail(email){
  const local = (email||'').split('@')[0].replace(/[._-]+/g,' ').trim();
  return local ? local.replace(/\b\w/g, c=>c.toUpperCase()) : 'You';
}

/* ============================================================
   HELPERS
   ============================================================ */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function icon(name, size){ return `<span class="msi" style="font-size:${size||24}px">${name}</span>`; }
function song(id){ return D.songs[id] || EMPTY_SONG; }
function gigObj(){ return D.gigs.find(g=>g.id===ST.gigId) || D.gigs[0]; }
function gigName(id){ return (D.gigs.find(g=>g.id===id)||{}).title || id; }
function toast(msg){
  ST.toast = msg; render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ ST.toast=null; render(); }, 2200);
}
function parseLyrics(text){ return (text||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>l.split(/\s+/)); }
function timing(s){
  const lines = parseLyrics(s && s.lyrics); const words = [];
  lines.forEach((ws,li)=>ws.forEach((w,wi)=>words.push({li,wi,t:1+li*4+wi*(3.2/ws.length)})));
  // If a real recording was captured and force-aligned (see processRecordingBlob),
  // s.wordTimestamps holds one real timestamp per word (seconds into the take) —
  // use those instead of the evenly-spaced estimate above. Falls through to the
  // estimate for demo songs / anything not yet recorded, so nothing else changes.
  const realTs = s && s.wordTimestamps;
  if(realTs && realTs.length===words.length){
    words.forEach((w,i)=>{ if(typeof realTs[i]==='number' && isFinite(realTs[i])) w.t = realTs[i]; });
  }
  const total = (s && typeof s.audioDurationSec==='number') ? s.audioDurationSec : (1+lines.length*4+1.5);
  return { lines, words, total };
}
function curWord(tm,t){ let i=-1; for(let k=0;k<tm.words.length;k++){ if(tm.words[k].t<=t) i=k; else break; } return i; }
function chordAt(s,tm,i){ let c=null; for(let k=0;k<=i&&k<tm.words.length;k++){ const w=tm.words[k]; const ch=s.chords[w.li+'-'+w.wi]; if(ch) c=ch; } return c; }
function chordSeq(s){ const tm=timing(s); const seq=[]; tm.words.forEach((w,k)=>{ const ch=s.chords[w.li+'-'+w.wi]; if(ch) seq.push({k,ch}); }); return seq; }
function fmtTime(x){ return Math.floor(x/60)+':'+String(Math.floor(x%60)).padStart(2,'0'); }

function parseChord(ch){ const m=/^([A-G][#b]?)(.*)$/.exec(ch||''); if(!m) return null; const r=ROOTS.indexOf(m[1]); return { r: r>=0?r:ALT[m[1]], q:m[2] }; }
function pianoSet(ch){ const p=parseChord(ch); if(!p) return []; return (IV[p.q]||IV['']).map(i=>{ let n=p.r+i; if(n>23) n-=12; return n; }); }
function guitarShape(ch){
  if(OPEN_GUITAR[ch]) return OPEN_GUITAR[ch];
  const p=parseChord(ch); if(!p) return [-1,-1,-1,-1,-1,-1];
  const q=IV[p.q]?p.q:'';
  const eOff=(p.r-4+12)%12, aOff=(p.r-9+12)%12;
  const useE = E_SHAPE[q] && (eOff<=aOff || !A_SHAPE[q]);
  const shape = useE?E_SHAPE[q]:A_SHAPE[q], off = useE?eOff:aOff;
  return shape.map(v=>v<0?-1:v+off);
}
function ukeShape(ch){
  if(OPEN_UKE[ch]) return OPEN_UKE[ch];
  const p=parseChord(ch); if(!p) return [-1,-1,-1,-1];
  const tones=(IV[p.q]||IV['']).map(i=>(p.r+i)%12), open=[7,0,4,9];
  let best=null, bs=-1e9;
  for(let b=0;b<=7;b++){
    const opts = open.map(o=>{ const a=[]; for(let f=b;f<=b+3;f++) if(tones.includes((o+f)%12)) a.push(f); return a; });
    if(opts.some(a=>!a.length)) continue;
    for(const a of opts[0]) for(const c of opts[1]) for(const d of opts[2]) for(const e of opts[3]){
      const fr=[a,c,d,e], pcs=new Set(fr.map((x,i)=>(open[i]+x)%12));
      if(!pcs.has(tones[0])) continue;
      const pos=fr.filter(x=>x>0), span = pos.length?Math.max(...pos)-Math.min(...pos):0;
      if(span>3) continue;
      const sc = pcs.size*100 - span*8 - fr.reduce((x,y)=>x+y,0)*2;
      if(sc>bs){ bs=sc; best=fr; }
    }
  }
  return best || [-1,-1,-1,-1];
}
function diagram(ch,next,inst){
  const base = { name: ch||'–', next: next||'–', isPiano:false, isGuitar:false };
  if(!ch || inst==='none') return base;
  if(inst==='piano'){
    const set = pianoSet(ch);
    return { ...base, isPiano:true,
      white: WHITE.map((s,i)=>({k:i,on:set.includes(s)})),
      black: BLACK.map(([s,i])=>({k:s,left:(i+1)*22-8,on:set.includes(s)})) };
  }
  const f = inst==='ukulele'?ukeShape(ch):guitarShape(ch), n=f.length;
  const pos=f.filter(v=>v>0), max=pos.length?Math.max(...pos):0, min=pos.length?Math.min(...pos):0;
  const shift = max>5?min-1:0, dots=[], marks=[];
  f.forEach((v,i)=>{ if(v>0) dots.push({k:i,left:i*20-7,top:(v-shift-0.5)*24-7}); else marks.push({k:i,left:i*20-6,txt: shift ? (v===0?'':'x') : (v===0?'o':'x')}); });
  return { ...base, isGuitar:true, w:(n-1)*20, nut: shift?1.5:4, hasBase: shift>0, base: shift+1,
    strings: f.map((_,i)=>({k:i,left:i*20})), frets:[1,2,3,4,5].map(j=>({k:j,top:j*24-1})), dots, marks };
}
function diagramHTML(dia, dotColor){
  dotColor = dotColor || '#1b1b1b';
  let inner = '';
  if(dia.isGuitar){
    inner += `<div class="fretboard" style="width:${dia.w}px;height:120px;border-top:${dia.nut}px solid #1b1b1b">`;
    if(dia.hasBase) inner += `<div style="position:absolute;right:100%;margin-right:8px;top:4px;font-size:12px;font-weight:700;white-space:nowrap">${dia.base}fr</div>`;
    dia.strings.forEach(x=> inner += `<div style="position:absolute;top:0;bottom:0;left:${x.left}px;width:1.5px;background:#1b1b1b"></div>`);
    dia.frets.forEach(x=> inner += `<div style="position:absolute;left:0;right:-1px;top:${x.top}px;height:1.5px;background:#1b1b1b"></div>`);
    dia.dots.forEach(x=> inner += `<div style="position:absolute;left:${x.left}px;top:${x.top}px;width:15px;height:15px;border-radius:50%;background:${dotColor}"></div>`);
    dia.marks.forEach(x=> inner += `<div style="position:absolute;left:${x.left}px;top:-24px;width:14px;text-align:center;font-size:12px;font-weight:700">${x.txt}</div>`);
    inner += `</div>`;
  } else if(dia.isPiano){
    inner += `<div class="piano">`;
    dia.white.forEach(k=> inner += `<div style="width:22px;height:100%;border-right:1px solid #1b1b1b;background:${k.on?dotColor:'#fff'}"></div>`);
    dia.black.forEach(k=> inner += `<div style="position:absolute;top:0;left:${k.left}px;width:14px;height:56px;background:${k.on?dotColor:'#1b1b1b'};border-radius:0 0 3px 3px;border:1px solid #1b1b1b"></div>`);
    inner += `</div>`;
  }
  return `<div class="diagram-row"><div style="display:flex;align-items:center;gap:26px">${inner}<div class="diaName">${esc(dia.name)}</div><div class="diaNext">» ${esc(dia.next)}</div></div></div>`;
}