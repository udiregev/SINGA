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
// Derivative-chord suggestions shown per root on the Chords step, curated to
// the qualities musicians actually reach for most often and ordered most-
// common-first (full set — '6','sus2','dim','aug','add9','9' — stays
// available via IV/E_SHAPE/A_SHAPE for anything that still looks them up,
// just not offered as a one-tap suggestion anymore).
const SUFFIXES = ['','m','7','m7','maj7','sus4','sus2'];
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

/* A new / real account should start with nothing of its own — no demo
   songs, gigs, playlists or collaborators. freshData() above is kept
   around (unused for now) in case a future "load demo content" button
   wants it; the app itself now boots from this empty shape instead. */
function emptyData(){
  return {
    songs: {},
    order: [],
    playlists: [ { id:'my', title:'Demo Playlist', auto:true, ids:[], mine:true, added:Date.now(), plays:0 } ],
    gigs: [],
    collabs: [],
    photos: []
  };
}

const EMPTY_SONG = { id:'none', title:'Untitled song', sub:'', lyrics:'', chords:{}, notes:{}, synced:false };
/* ============================================================
   STATE
   ============================================================ */
const D = emptyData();
const ST = {
  screen:'login', back:'home', email:'', password:'', authBusy:false, authMode:'signin', userId:null, nickname:null, editNick:null, authProvider:null,
  homeQuery:'', searchQuery:'', sort:'recent', sortOpen:false,
  listKind:'songs', listPl:null, listQuery:'',
  songId:'dgbmh', viewBy:null, viewChord:null, instrument:'guitar', menu:false, instMenu:false, chordH:230,
  recentChords:[], _lastProgScrollAt:0,
  startMode:'countdown', vcd:0, listening:false,
  editId:null, createMode:'manual', step:'lyrics', similar:false, similarLoading:false, similarResults:[], rootIdx:0, selRoot:'A', selSuffix:'m', selWord:null, noteDraft:'', autoChords:false, editorLine:0,
  phase:'idle', cd:0, recT:0, bars:[], procPct:0, procNote:'',
  t:0, playing:false, ctx:'view', guide:false, guideInst:'Piano',
  gigId:'nye', gigCur:null, played:[], orderVotes:{}, gListening:false, gigSettings:false,
  plan:'free', upgrade:false, collabFor:null, editList:null, qrOpen:false, qrDataUrl:null,
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
    await loadUserData();
  } else {
    ST.nickname = ST.nickname || nicknameFromEmail(ST.email);
    ST.avatarUrl = socialAvatar;
    syncProfile();
    await seedSampleContent();
  }
  ST.authProvider = (session.user.app_metadata && session.user.app_metadata.provider) || 'email'; ST.screen = 'home';
}

/* ============================================================
   SONGS / PLAYLISTS / GIGS — Supabase-backed data layer
   D used to be purely in-memory (reset on every reload, no way for
   two people to see the same song/playlist/gig). It's now a local
   cache: loadUserData() fills it from the songs/playlists/gigs tables
   on sign-in, and every mutation below is mirrored back with an
   upsert. "Shared" is a single is_public flag per item (no separate
   collaborator roles) — a public row is readable by any signed-in
   user, which is what the "similar titles" search and song-copy flow
   query against.
   ============================================================ */
function songRowToLocal(row){
  return {
    id: row.id, title: row.title||'', sub: row.sub||'', lyrics: row.lyrics||'',
    chords: row.chords||{}, notes: row.notes||{}, synced: !!row.synced,
    wordTimestamps: row.word_timestamps||null, audioDurationSec: row.audio_duration_sec||null,
    sampleUrl: row.sample_url||null, isPublic: !!row.is_public, plays: row.plays||0,
    added: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    mine: row.owner_id===ST.userId, by: row.owner_id===ST.userId ? undefined : (row.owner_nickname||'someone')
  };
}
function playlistRowToLocal(row){
  return {
    id: row.id, title: row.title||'', ids: row.song_ids||[], auto:false,
    isPublic: !!row.is_public, plays: row.plays||0,
    added: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    mine: row.owner_id===ST.userId, by: row.owner_id===ST.userId ? undefined : (row.owner_nickname||'someone')
  };
}
function gigRowToLocal(row){
  return {
    id: row.id, title: row.title||'', date: row.date_label||'', setlist: row.setlist||[],
    settings: row.settings||{}, isPublic: !!row.is_public, plays: row.plays||0,
    added: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    mine: row.owner_id===ST.userId, by: row.owner_id===ST.userId ? undefined : (row.owner_nickname||'someone')
  };
}
function songToRow(s){
  return { id:s.id, owner_id:ST.userId, owner_nickname: ST.nickname||nicknameFromEmail(ST.email),
    title:s.title||'', sub:s.sub||'', lyrics:s.lyrics||'', chords:s.chords||{}, notes:s.notes||{},
    word_timestamps:s.wordTimestamps||null, audio_duration_sec:s.audioDurationSec||null,
    sample_url:s.sampleUrl||null, synced:!!s.synced, is_public:!!s.isPublic, plays:s.plays||0,
    updated_at:new Date().toISOString() };
}
function playlistToRow(p){
  return { id:p.id, owner_id:ST.userId, owner_nickname: ST.nickname||nicknameFromEmail(ST.email),
    title:p.title||'', song_ids:p.ids||[], is_public:!!p.isPublic, plays:p.plays||0,
    updated_at:new Date().toISOString() };
}
function gigToRow(g){
  return { id:g.id, owner_id:ST.userId, owner_nickname: ST.nickname||nicknameFromEmail(ST.email),
    title:g.title||'', date_label:g.date||'', setlist:g.setlist||[], settings:g.settings||{},
    is_public:!!g.isPublic, plays:g.plays||0, updated_at:new Date().toISOString() };
}
async function saveSongRow(s){ if(!ST.userId || !s) return; try{ const r=await sb.from('songs').upsert(songToRow(s)); if(r.error) console.error('Singa: song save failed', r.error); }catch(e){ console.error('Singa: song save failed', e); } }
async function savePlaylistRow(p){ if(!ST.userId || !p || p.auto) return; try{ const r=await sb.from('playlists').upsert(playlistToRow(p)); if(r.error) console.error('Singa: playlist save failed', r.error); }catch(e){ console.error('Singa: playlist save failed', e); } }
async function saveGigRow(g){ if(!ST.userId || !g) return; try{ const r=await sb.from('gigs').upsert(gigToRow(g)); if(r.error) console.error('Singa: gig save failed', r.error); }catch(e){ console.error('Singa: gig save failed', e); } }
async function deleteSongRow(id){ if(!ST.userId || !id) return; try{ await sb.from('songs').delete().eq('id',id).eq('owner_id',ST.userId); }catch(e){ console.error('Singa: song delete failed', e); } }

const _saveTimers = {};
function debounceSave(key, fn, delay){ clearTimeout(_saveTimers[key]); _saveTimers[key] = setTimeout(fn, delay||800); }
function queueSaveSong(id){ const s=D.songs[id]; if(s) debounceSave('song:'+id, ()=>saveSongRow(s)); }
function queueSavePlaylist(id){ const p=D.playlists.find(x=>x.id===id); if(p) debounceSave('pl:'+id, ()=>savePlaylistRow(p)); }
function queueSaveGig(id){ const g=D.gigs.find(x=>x.id===id); if(g) debounceSave('gig:'+id, ()=>saveGigRow(g)); }

/* ============================================================
   LIVE GIG BROADCAST (performer → Audience Guest Site)
   A Supabase Realtime broadcast channel, one per gig, carries the
   currently-playing song id + playback position from the performer's
   app out to anyone with audience.html open for that gig (no login,
   no row writes — broadcast messages aren't persisted). The audience
   page joins the same channel name and listens for 'state' events.
   ============================================================ */
let _liveChannel = null, _liveChannelGigId = null;
function joinGigChannel(gigId){
  if(!gigId || (_liveChannelGigId===gigId && _liveChannel)) return;
  leaveGigChannel();
  _liveChannel = sb.channel('gig-live-'+gigId, { config: { broadcast: { self: false } } });
  _liveChannel.subscribe();
  _liveChannelGigId = gigId;
}
function leaveGigChannel(){
  if(_liveChannel){ try{ sb.removeChannel(_liveChannel); }catch(e){} _liveChannel=null; _liveChannelGigId=null; }
}
function broadcastGigState(payload){
  if(_liveChannel) _liveChannel.send({ type:'broadcast', event:'state', payload });
}
// The Audience Guest Site lives at audience.html next to this app, so the
// link always matches wherever Singa itself is actually hosted (GitHub
// Pages, a future custom domain, even a local test server) instead of a
// hardcoded domain.
function audienceUrl(gigId){ return new URL('audience.html?gig='+encodeURIComponent(gigId), location.href).href; }

async function loadUserData(){
  if(!ST.userId) return;
  try{
    const [songsRes, plRes, gigRes] = await Promise.all([
      sb.from('songs').select('*').eq('owner_id', ST.userId),
      sb.from('playlists').select('*').eq('owner_id', ST.userId),
      sb.from('gigs').select('*').eq('owner_id', ST.userId)
    ]);
    const songs = {}, order = [];
    (songsRes.data||[]).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).forEach(row=>{ songs[row.id]=songRowToLocal(row); order.push(row.id); });
    D.songs = songs; D.order = order;
    const autoPl = (D.playlists||[]).find(p=>p.auto) || { id:'my', title:'Demo Playlist', auto:true, ids:[], mine:true, added:Date.now(), plays:0 };
    autoPl.ids = order;
    D.playlists = [autoPl, ...(plRes.data||[]).map(playlistRowToLocal)];
    D.gigs = (gigRes.data||[]).map(gigRowToLocal);
  }catch(e){ console.error('Singa: failed to load your songs/playlists/gigs', e); }
}

// Real search against songs other Singa users have made public — replaces
// the old "Similar titles" modal's two hardcoded demo rows.
async function searchSimilarTitles(q){
  q = (q||'').trim();
  if(!q || !ST.userId) return [];
  try{
    const res = await sb.from('songs').select('id,title,sub,owner_id,owner_nickname')
      .eq('is_public', true).ilike('title', '%'+q+'%').neq('owner_id', ST.userId).limit(5);
    if(res.error){ console.error('Singa: similar-title search failed', res.error); return []; }
    return res.data||[];
  }catch(e){ console.error('Singa: similar-title search failed', e); return []; }
}

// One-time setup for a brand-new account: a sample song (built from a real
// ~5s vocal clip so Play Sample has something to actually play) added to the
// account's default auto playlist, and a "Demo Gig" gig, so the app isn't
// empty on first open. Runs once, right after the profile row is created —
// never again on later sign-ins. The clip ships as base64 text (sample-dream-data.js)
// rather than a binary file, decoded here and uploaded to the same kind of
// Storage bucket avatars already use.
function b64ToBlob(b64, mime){
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
async function seedSampleContent(){
  if(!ST.userId) return;
  try{
    let sampleUrl = null;
    try{
      const blob = b64ToBlob(SAMPLE_DREAM_B64, 'audio/mpeg');
      const path = ST.userId+'/sample-dream.mp3';
      const up = await sb.storage.from('song-samples').upload(path, blob, { upsert:true, contentType:'audio/mpeg' });
      if(!up.error) sampleUrl = sb.storage.from('song-samples').getPublicUrl(path).data.publicUrl;
      else console.error('Singa: sample clip upload failed', up.error);
    }catch(e){ console.error('Singa: sample clip upload failed', e); }
    const songId = 's'+Date.now();
    // Real lyrics, chords, and per-word timing for "Dream a Little Dream of Me"
    // (public domain in the US as of Jan 1, 2026), captured via forced alignment
    // against the actual sample recording — one full pass through verse 1,
    // verse 2, bridge, and chorus (103 words / 102 app-tokens).
    const SEED_LYRICS = `Stars shining bright above you
Night breezes seem to whisper, "I love you"
Birds singing in the sycamore tree
Dream a little dream of me
Say "nighty-night" and kiss me
Just hold me tight and tell me you'll miss me
While I'm alone and blue as can be
Dream a little dream of me
Stars fading, but I linger on, dear
Still craving your kiss
I'm longing to linger 'til dawn, dear
Just saying this
Sweet dreams 'til sunbeams find you
Sweet dreams that leave all worries behind you
But in your dreams, whatever they be
Dream a little dream of me`;
    const SEED_CHORDS = {'0-0':'C', '0-1':'B7', '0-2':'Ab', '0-3':'G7', '1-0':'C', '1-4':'B7', '1-6':'A7', '2-0':'F', '2-4':'Fm', '3-0':'C', '3-2':'Ab', '3-4':'G7', '4-0':'C', '4-1':'B7', '4-2':'Ab', '4-3':'G7', '5-0':'C', '5-3':'B7', '5-5':'A7', '6-0':'F', '6-5':'Fm', '7-0':'C', '7-2':'Ab', '7-4':'C', '8-0':'A', '8-4':'E7', '9-0':'A', '10-0':'D', '10-5':'E7', '11-0':'A', '12-0':'F', '12-3':'C', '13-0':'F', '13-5':'Fm', '14-0':'C', '14-4':'G7', '15-0':'C', '15-2':'Ab', '15-4':'C'};
    const SEED_NOTES = {'2-4':'song marking 1', '8-0':'song marking 2'};
    const SEED_WORD_TIMESTAMPS = [1.44,3.04,5.42,5.67,5.84,6.55,6.8,7.57,8.41,10.54,14.79,14.83,15.29,15.35,16.32,17.25,17.46,25.13,26.9,27.01,29.09,30.39,34.14,34.49,34.62,34.72,34.79,35.49,36.43,36.53,42.21,42.56,42.72,46.59,46.85,50.04,50.7,51.57,52.4,52.6,52.66,52.93,53.09,53.24,53.62,54.15,57.47,59.88,59.97,60.46,60.93,62.13,62.98,63.57,63.64,64.08,64.72,67.79,68.68,68.99,70.33,70.52,70.82,71.57,73.7,74.91,75.88,76.66,81.67,83.95,84.06,85.97,86.44,86.67,89.51,91.58,92.18,95.33,96.05,97.28,100.98,104.45,105.17,105.63,106.17,106.58,106.86,107.04,109.06,109.14,112.28,112.95,113.04,116.9,119.92,120.04,122.36,124.42,133.53,141.33,141.72,146.19];
    const song = { id:songId, title:'Demo Song', sub:'Sample song',
      lyrics:SEED_LYRICS, chords:SEED_CHORDS, notes:SEED_NOTES, synced:true,
      wordTimestamps:SEED_WORD_TIMESTAMPS, audioDurationSec:147.62, sampleUrl, isPublic:false, plays:0, added:Date.now(), mine:true };
    D.songs[songId] = song; D.order = [songId, ...D.order];
    const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
    const gigId = 'g'+Date.now();
    const gig = { id:gigId, title:'Demo Gig', date:'', setlist:[songId], settings:{}, isPublic:false, plays:0, added:Date.now(), mine:true };
    D.gigs = [...D.gigs, gig];
    await Promise.all([ saveSongRow(song), saveGigRow(gig) ]);
  }catch(e){ console.error('Singa: sample content setup failed', e); }
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
