"use strict";
function computeModeSegShown(){
  return ST.phase==='idle';
}
// Collapses/expands the Manual/From Recording/From File toggle with a real
// CSS transition around a step change that crosses in or out of the Lyrics
// step, instead of the full re-render just snapping it away. #modeSegWrap
// is mutated in place first so the browser actually animates the existing
// node; the normal full re-render then runs once the collapse has played
// out (or immediately, with the freshly-rendered wrapper pre-collapsed, so
// an expand can animate in on the next frame).
function withModeSegTransition(mutate){
  if(ST.screen!=='create'){ mutate(); render(); return; }
  const wasShown = computeModeSegShown();
  mutate();
  const nowShown = computeModeSegShown();
  const wrap = document.getElementById('modeSegWrap');
  if(!wrap || wasShown===nowShown){ render(); return; }
  if(wasShown && !nowShown){
    wrap.style.maxHeight = '0px'; wrap.style.opacity = '0';
    setTimeout(render, 240);
  } else {
    render();
    const w2 = document.getElementById('modeSegWrap');
    if(w2){
      w2.style.maxHeight = '0px'; w2.style.opacity = '0';
      void w2.offsetHeight;
      requestAnimationFrame(()=>{ w2.style.maxHeight = '60px'; w2.style.opacity = '1'; });
    }
  }
}
// Deletes a song for good: from your songs, every playlist and gig, and the database.
function deleteSongEverywhere(delId){
  delete D.songs[delId]; D.order = D.order.filter(x=>x!==delId);
  const autoPl=D.playlists.find(p=>p.auto); if(autoPl) autoPl.ids=D.order;
  D.playlists.forEach(p=>{ if(!p.auto && p.ids.includes(delId)){ p.ids = p.ids.filter(i=>i!==delId); queueSavePlaylist(p.id); } });
  D.gigs.forEach(g=>{ if(g.setlist.includes(delId)){ g.setlist = g.setlist.filter(i=>i!==delId); queueSaveGig(g.id); } });
  if(ST.gigCur===delId){ stopOnsetListening(); ST.gigCur=null; ST.t=0; ST.playing=false; ST.gListening=false; }
  deleteSongRow(delId);
}
const Actions = {
  setAuthMode(d){ ST.authMode = d.id; render(); },
  async login(){
    const email = ST.email.trim(), password = ST.password.trim();
    if(ST.authBusy) return;
    if(!email || !password){ toast('Enter an email and password'); return; }
    ST.authBusy = true; render();
    try{
      if(ST.authMode==='signup'){
        const signUp = await sb.auth.signUp({ email, password });
        ST.authBusy = false;
        if(signUp.error){ toast(signUp.error.message); render(); return; }
        if(signUp.data.session){
          await applySession(signUp.data.session);
          ST.password=''; render();
        } else {
          ST.password=''; toast('Account created — check your email to confirm, then sign in'); ST.authMode='signin'; render();
        }
      } else {
        const signIn = await sb.auth.signInWithPassword({ email, password });
        ST.authBusy = false;
        if(signIn.error){ toast(signIn.error.message); render(); return; }
        if(signIn.data.session){
          await applySession(signIn.data.session);
          ST.password=''; render();
        }
      }
    }catch(e){ ST.authBusy=false; toast('Sign-in failed — check your connection and try again'); render(); }
  },
  loginSocial(d){
    const provider = { Apple:'apple', Google:'google', Facebook:'facebook' }[d && d.id] || null;
    if(!provider){ toast('Unknown sign-in provider'); return; }
    sb.auth.signInWithOAuth({ provider, options:{ redirectTo: location.href } }).then(function(res){
      if(res.error) toast(res.error.message);
    }).catch(function(){ toast('Sign-in failed — check your connection and try again'); });
  },
  // Singa wordmark → Home (a running import carries on in the background)
  goHome(){
    if(ST.screen==='login') return;
    if(ST.screen==='create'){ exitCreate(); return; }
    stopOnsetListening(); ST.screen='home'; ST.menu=false; ST.accountOpen=false; ST.gigMenuOpen=false; ST.sortOpen=false; render();
  },
  openAccount(){ ST.accountOpen=true; ST.menu=false; render(); },
  closeAccount(){ ST.accountOpen=false; render(); },
  toggleGigMenu(){
    if(window.matchMedia && window.matchMedia('(max-width: 759px)').matches) ST.gigMenuOpen = !ST.gigMenuOpen;
    else ST.gigMenuCollapsed = !ST.gigMenuCollapsed;
    render();
  },
  continueInBackground(){
    const j = ST.jobs.find(x=>x.id===ST.fgJob); if(!j) return;
    j.bg = true; j.target = ST.addTarget; ST.addTarget = null;
    ST.fgJob = null; ST.phase='idle'; ST.procPct=0; ST.procNote='';
    ST.screen='home'; render();
    toast("Working on it in the background — it'll appear in your songs");
  },
  reviewAccept(){
    const s = D.songs[ST.editId]; if(!s) return;
    finalizeSong(s); ST.songId = s.id; ST.screen='done'; render();
  },
  reviewEdit(){
    const s = D.songs[ST.editId]; if(!s) return;
    ST.editing=true; ST.screen='create'; ST.createMode='manual'; ST.step='chords'; ST.phase='idle'; ST.selWord=null; ST.editorLine=0; render();
  },
  reviewLater(){ ST.screen='home'; render(); },
  editDone(){
    const s = D.songs[ST.editId];
    if(s && !lyricsReady(s)){ ST.step='lyrics'; render(); toast(lyricsMissing(s)); return; }
    ST.playing=false; ST.testSpeed=false; stopPracticeFollow();
    ST.editing=false; ST.selWord=null; ST.phase='idle';
    const ret = ST.editReturn; ST.editReturn = null;
    if(s) finalizeSong(s);
    if(ret==='gigplayer') ST.screen='gigplayer';
    else if(s) openSongOrIncomplete(s.id, ST.back==='list' ? 'list' : 'home');
    else ST.screen='home';
    render();
  },
  addNewSong(d){
    // from the "Add songs" picker of a gig / playlist: remember where it goes
    const sp = ST.songPick;
    ST.addTarget = sp && sp.kind!=='all' ? { kind: sp.kind, id: sp.id } : null;
    ST.songPick=null; ST.spQuery='';
    ST.doneSpeed=false; ST.doneNoticeHidden=false; ST.tempoTab=null;
    newSongDraft(); ST.createMode = d.id || 'manual'; render();
  },
  gigEditAddSongs(){ ST.songPick = { kind:'gigedit', id: gigObj().id }; render(); },
  nav(d){ stopOnsetListening(); if(ST.screen==='search' && d.to!=='search'){ ST.searchQuery=''; ST.homeQuery=''; } ST.screen=d.to; ST.menu=false; ST.qrOpen=false; ST.sortOpen=false; render(); },
  back(d){ stopOnsetListening(); ST.screen = d.to && d.to!==ST.screen ? d.to : 'home'; ST.menu=false; render(); },
  async signOut(){
    stopOnsetListening(); endLiveGig();
    try{ await sb.auth.signOut(); }catch(e){}
    ST.screen='login'; ST.email=''; ST.password=''; ST.nickname=null; ST.authProvider=null; ST.userId=null; render();
  },
  async rebootApp(){
    try{
      if('serviceWorker' in navigator){
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.unregister()));
      }
      if(window.caches){
        const keys = await caches.keys();
        await Promise.all(keys.map(k=>caches.delete(k)));
      }
    }catch(e){}
    location.reload();
  },
  runSearch(){ ST.screen='search'; ST.searchQuery = ST.homeQuery; ST.sortOpen=false; render(); },
  newItem(d){ if(!canSync()) return; ST.newItem = { kind:d.kind, name:'', date:'' }; render(); },
  newSong(){ if(!canSync()) return; ST.addTarget=null; ST.doneSpeed=false; ST.doneNoticeHidden=false; ST.tempoTab=null; newSongDraft(); render(); },
  openPlaylist(d){ ST.screen='list'; ST.listKind='songs'; ST.listPl=d.id; ST.listQuery=''; ST.sortOpen=false; render(); },
  openGig(d){ ST.gigId=d.id; ST.screen='gig'; ST.qrOpen=false; render(); },
  openSongFrom(d){ openSongOrIncomplete(d.id, d.from); render(); },
  openList(d){ ST.screen='list'; ST.listKind=d.kind; ST.listPl=null; ST.listQuery=''; ST.sortOpen=false; render(); },
  // All Songs → straight into creating a new song; a playlist → pick songs to add
  listAdd(){ if(ST.listKind==='playlists') Actions.newItem({kind:'playlist'}); else if(ST.listKind==='gigs') Actions.newItem({kind:'gig'}); else { const curPl = ST.listPl ? D.playlists.find(p=>p.id===ST.listPl) : null; if(curPl && !curPl.auto){ ST.songPick = { kind:'playlist', id:curPl.id }; render(); } else Actions.newSong(); } },
  // the delete / remove button on a song row: ask first
  askRowAction(d, e){
    if(e) e.stopPropagation();
    const s = song(d.id), title = '“'+(s.title||'Untitled song')+'”';
    if(d.kind==='delete') ST.confirm = { act:'delete', id:d.id, ok:'Delete', text: title+' will be deleted from your songs, playlists and gigs.' };
    else if(d.kind==='plremove'){ const p = D.playlists.find(x=>x.id===ST.listPl); if(!p) return; ST.confirm = { act:'plremove', id:d.id, pl:p.id, ok:'Remove', text: title+' will be removed from '+p.title+'.' }; }
    else if(d.kind==='gigremove'){ const g = gigObj(); if(!g) return; ST.confirm = { act:'gigremove', id:d.id, gig:g.id, ok:'Remove', text: title+' will be removed from '+g.title+'.' }; }
    render();
  },
  confirmCancel(){ ST.confirm=null; render(); },
  confirmOk(){
    const c = ST.confirm; ST.confirm = null; if(!c){ render(); return; }
    if(!canSync()) return;
    if(c.act==='delete'){ deleteSongEverywhere(c.id); render(); toast('Song deleted'); return; }
    if(c.act==='plremove'){ const p = D.playlists.find(x=>x.id===c.pl); if(p){ p.ids = p.ids.filter(i=>i!==c.id); queueSavePlaylist(p.id); } render(); toast('Removed from '+(p?p.title:'the playlist')); return; }
    if(c.act==='gigremove'){
      const g = D.gigs.find(x=>x.id===c.gig);
      if(g){ g.setlist = g.setlist.filter(i=>i!==c.id); queueSaveGig(g.id); }
      if(ST.gigCur===c.id){ stopOnsetListening(); ST.gigCur=null; ST.t=0; ST.playing=false; ST.gListening=false; ST.vcd=0; }
      ST.played = (ST.played||[]).filter(i=>i!==c.id);
      render(); toast('Removed from '+(g?g.title:'the gig')); return;
    }
    render();
  },
  closeAlert(){ ST.alert=null; render(); },
  toggleSort(){ ST.sortOpen = !ST.sortOpen; render(); },
  setSort(d){ ST.sort = d.id; ST.sortOpen=false; render(); },

  editNickname(){ ST.editNick = ST.nickname || nicknameFromEmail(ST.email); render(); },
  nickInput(v){ ST.editNick=v; render(); },
  closeEditNick(){ ST.editNick=null; render(); },
  saveNickname(){ if(!canSync()) return; if(ST.editNick && ST.editNick.trim()) ST.nickname = ST.editNick.trim(); ST.editNick=null; syncProfile(); render(); toast('Nickname updated'); },
  openUpgrade(){ ST.upgrade=true; render(); },
  closeUpgrade(){ ST.upgrade=false; render(); },
  doUpgrade(){ if(!canSync()) return; ST.plan='rockstar'; ST.upgrade=false; syncProfile(); render(); toast("You're a RockStar now"); },
  downgrade(){ if(!canSync()) return; ST.plan='free'; syncProfile(); render(); toast('Switched to Free'); },
  newCollab(){ ST.collabEdit = { i:null, name:'', email:'', gigs: ST.collabFor ? [ST.collabFor] : [] }; render(); },
  editCollab(d){ const i = +d.id; const c = D.collabs[i]; ST.collabEdit = { i, name:c.name, email:c.email, gigs:[...c.gigs] }; render(); },
  closeCollabEdit(){ ST.collabEdit=null; render(); },
  toggleCeGig(d){ const ce = ST.collabEdit; const on = ce.gigs.includes(d.id); ce.gigs = on ? ce.gigs.filter(x=>x!==d.id) : [...ce.gigs, d.id]; render(); },
  saveCollab(){ const ce = ST.collabEdit; if(!ce.name.trim()) return; const c = { name:ce.name, email:ce.email, gigs:ce.gigs }; if(ce.i==null) D.collabs.push(c); else D.collabs[ce.i]=c; ST.collabEdit=null; render(); toast(ce.i==null?'Invite sent to '+(ce.email||ce.name):'Saved'); },
  setInstrument(d){ if(!canSync()) return; ST.instrument = d.id; syncProfile(); render(); },
  setStartMode(d){ if(!canSync()) return; ST.startMode = d.id; syncProfile(); render(); },
  toggleNotif(d){ if(!canSync()) return; ST.notif[d.id] = !ST.notif[d.id]; syncProfile(); render(); },
  toggleCollabInGig(d){ const i = +d.id; const cg = D.gigs.find(g=>g.id===ST.collabFor); if(!cg) return; const c = D.collabs[i]; const inGig = c.gigs.includes(cg.id); c.gigs = inGig ? c.gigs.filter(x=>x!==cg.id) : [...c.gigs, cg.id]; render(); toast(inGig ? c.name+' removed from '+cg.title : c.name+' added to '+cg.title); },

  setCreateMode(d){ if(ST.ctx==='syncpreview'){ ST.playing=false; ST.testSpeed=false; } ST.createMode=d.id; ST.phase='idle'; ST.step='lyrics'; ST.editorLine=0; ST.abortArm=0; render(); },
  abortCreate(){
    // first tap turns the button red; a second tap (within 3s) aborts
    if(!(ST.abortArm && Date.now() - ST.abortArm < 3000)){
      ST.abortArm = Date.now(); render();
      clearTimeout(ST._abortT); ST._abortT = setTimeout(()=>{ ST.abortArm = 0; render(); }, 3000);
      return;
    }
    ST.abortArm = 0; clearTimeout(ST._abortT);
    ST.playing=false; ST.testSpeed=false;
    const s = D.songs[ST.editId];
    if(s && !s.synced){ delete D.songs[ST.editId]; D.order = D.order.filter(x=>x!==ST.editId); }
    stopOnsetListening(); stopPracticeFollow(); ST.phase='idle'; ST.selWord=null; ST.screen='home'; render();
  },
  createBack(){ if(ST.editing){ Actions.editDone(); return; } exitCreate(); },
  goCreateStep(d){
    const s = D.songs[ST.editId];
    if(ST.phase!=='idle') return;
    if(!lyricsReady(s) && d.id!=='lyrics'){ toast(lyricsMissing(s)); return; }
    if((d.id==='chords' || d.id==='markings') && !hasLyrics(s)){ toast('Add lyrics first — or capture them from a recording on the Tempo step'); return; }
    if(ST.ctx==='syncpreview'){ ST.playing=false; }
    withModeSegTransition(()=>{ ST.step=d.id; ST.selWord=null; ST.editorLine=0; ST.tempoTab=null; ST.tempoView=null; ST.speedOpen=false; ST.testSpeed=false; ST.abortArm=0; });
  },
  createNextStep(){ withModeSegTransition(()=>{ const order=['lyrics','chords','markings','sync']; const i=order.indexOf(ST.step); ST.step=order[Math.min(3,i+1)]; ST.selWord=null; ST.editorLine=0; ST.tempoTab=null; ST.tempoView=null; ST.speedOpen=false; ST.testSpeed=false; ST.abortArm=0; }); },
  // no lyrics typed: straight to Tempo, where a recording / upload / link captures them
  lyricsNext(){ const s = D.songs[ST.editId]; if(!lyricsReady(s)){ toast(lyricsMissing(s)); return; } if(!hasLyrics(s)){ withModeSegTransition(()=>{ ST.step='sync'; ST.tempoView=null; ST.speedOpen=false; ST.abortArm=0; }); return; } Actions.createNextStep(); },
  async openSimilar(){
    const d = D.songs[ST.editId];
    ST.similar=true; ST.similarLoading=true; ST.similarResults=[]; render();
    const results = await searchSimilarTitles(d && d.title);
    ST.similarLoading=false; ST.similarResults=results; render();
  },
  closeSimilar(){ ST.similar=false; render(); },
  async useSimilar(d){
    const r = (ST.similarResults||[]).find(x=>x.id===d.id);
    if(!r) return;
    ST.similar=false; render();
    try{
      const res = await sb.from('songs').select('*').eq('id', r.id).maybeSingle();
      if(res.data) D.songs[r.id] = songRowToLocal(res.data);
    }catch(e){ console.error('Singa: failed to load that song', e); }
    ST.screen='song'; ST.songId=r.id; ST.viewBy=r.owner_nickname||'someone'; ST.back='create'; ST.ctx='view'; ST.t=0; ST.playing=false; render();
  },
  pickRoot(d){ ST.rootIdx = +d.id; ST.selRoot = LETTERS[+d.id]; render(); },
  scrollChipRow(d){
    const el = document.getElementById(d.id);
    if(!el) return;
    el.scrollBy({ left: (+d.dir) * Math.round(el.clientWidth*0.8), behavior:'smooth' });
  },
  pickVariant(d){ ST.selRoot = d.root; ST.selSuffix = d.q; render(); },
  toggleAcc(){ ST.accOn = !ST.accOn; render(); },
  removeChord(d){ const s = D.songs[ST.editId]; if(!s || !s.chords[d.id]) return; dropChord(s.chords[d.id], d.id, null); },
  placeChord(d){
    const s = D.songs[ST.editId]; const sel = ST.selRoot+ST.selSuffix;
    const [li, wi] = String(d.id).split('-').map(Number); if(!isNaN(li)) ST.editorLine = li;
    if(s.chords[d.id]===sel) delete s.chords[d.id];
    else { s.chords[d.id]=sel; recordRecentChord(sel); applyChordPatternToRepeats(s, li, wi, sel); }
    render();
    queueSaveSong(ST.editId);
  },
  pickMarkWord(d){
    const s = D.songs[ST.editId];
    const li = +String(d.id).split('-')[0]; if(!isNaN(li)) ST.editorLine = li;
    ST.selWord = d.id; ST.noteDraft = (s.notes||{})[d.id] || ''; render();
    const ip = document.querySelector('.sticky-ipt');
    if(ip){ try{ ip.focus({ preventScroll:true }); const n = ip.value.length; ip.setSelectionRange(n, n); }catch(e){} }
  },
  saveNote(){ const s = D.songs[ST.editId]; const n = {...s.notes}; if(ST.noteDraft.trim()) n[ST.selWord]=ST.noteDraft.trim(); else delete n[ST.selWord]; s.notes=n; ST.selWord=null; render(); queueSaveSong(ST.editId); },
  removeNote(){ const s = D.songs[ST.editId]; const n = {...s.notes}; delete n[ST.selWord]; s.notes=n; ST.selWord=null; ST.noteDraft=''; render(); queueSaveSong(ST.editId); },
  closeNoteEditor(){ ST.selWord=null; ST.noteDraft=''; render(); },
  detectChords(){ ST.autoChords=true; ST.step='sync'; ST.tempoTab='synced'; render(); },
  // Tempo step
  setTempoTab(d){
    const s = D.songs[ST.editId]; if(!s) return;
    if(ST.ctx==='syncpreview'){ ST.playing=false; ST.testSpeed=false; }
    ST.tempoTab = d.id;
    if(d.id==='speed') setSongTempo(s, { mode:'speed' });
    else if(s.synced) setSongTempo(s, { mode:'synced' });
    render(); queueSaveSong(s.id);
  },
  testSpeed(){
    if(ST.ctx==='syncpreview' && ST.playing && ST.testSpeed){ ST.playing=false; ST.testSpeed=false; ST.t=0; render(); return; }
    ST.ctx='syncpreview'; ST.testSpeed=true; ST.t=0; ST.editorLine=0; ST.playing=true; render();
  },
  setSpeed(d){
    const s = D.songs[ST.editId]; if(!s) return;
    if(ST.ctx==='syncpreview'){ ST.playing=false; ST.testSpeed=false; ST.t=0; }
    if(d.id==='rec') setSongTempo(s, { mode:'synced' });
    else setSongTempo(s, { mode:'speed', speed:+d.id });
    ST.speedOpen = false;
    render(); queueSaveSong(s.id);
  },
  toggleSpeedList(){ ST.speedOpen = !ST.speedOpen; render(); },
  // Sync (record / upload / link) ⇄ Set Speed
  setTempoView(d){
    const s = D.songs[ST.editId]; if(!s) return;
    if(ST.ctx==='syncpreview'){ ST.playing=false; ST.testSpeed=false; ST.t=0; }
    ST.tempoView = d.id; ST.speedOpen = false;
    if(d.id==='speed') setSongTempo(s, { mode:'speed' });
    else if(s.synced) setSongTempo(s, { mode:'synced' });
    render(); queueSaveSong(s.id);
  },
  // Embed link: fetch the track from YouTube (or any page with audio) and
  // treat it like an uploaded file
  submitLink(){
    if(!canSync()) return;
    const url = (ST.linkDraft||'').trim();
    if(!url){ const ip = document.querySelector('[data-bind="linkDraft"]'); if(ip) ip.focus(); toast('Paste a link to the song first'); return; }
    if(!/^https?:\/\/\S+\.\S+/i.test(url)){ toast("That doesn't look like a link — it should start with https://"); return; }
    ST.linkDraft = '';
    queueLinkImport(url);
  },
  // Practice: run through the lyrics at the chosen tempo (your recorded one
  // highlights the words; a set speed just scrolls)
  practiceTempo(){
    const s = D.songs[ST.editId]; if(!s) return;
    if(ST.ctx==='syncpreview' && ST.playing){ ST.playing=false; ST.testSpeed=false; ST.t=0; render(); return; }
    ST.ctx='syncpreview'; ST.testSpeed = songMode(s)!=='synced'; ST.t=0; ST.editorLine=0; ST.playing=true; render();
  },
  recordTempo(){ ST.playing=false; ST.testSpeed=false; ST.tempoTab='synced'; Actions.startRecord(); },
  // Done on the Tempo step: the song is added (set speed if there's no take)
  finishCreate(){
    const s = D.songs[ST.editId]; if(!s) return;
    if(!lyricsReady(s)){ ST.step='lyrics'; render(); toast(lyricsMissing(s)); return; }
    if(!hasLyrics(s) && !s.synced){ toast('Record, upload or paste a link so Singa can capture the lyrics'); return; }
    stopPracticeFollow(); ST.playing=false; ST.testSpeed=false; ST.phase='idle'; ST.abortArm=0;
    if(!s.synced) setSongTempo(s, { mode:'speed' });
    finalizeSong(s); ST.songId = s.id; ST.autoChords=false;
    ST.doneSpeed=false; ST.doneNoticeHidden=false; ST.screen='done'; render();
  },
  doneSkipSync(){ const s = D.songs[ST.editId]; if(s){ setSongTempo(s, { mode:'speed' }); queueSaveSong(s.id); } ST.doneSpeed=true; render(); toast('The default scroll speed will be used — adjust it here if you like'); },
  doneLater(){ ST.doneNoticeHidden=true; render(); toast('You can add a tempo any time: open the song → Edit → Tempo'); },
  // Practice stays right here on the Sync step (same compact scrolling
  // lyrics window Record uses) instead of jumping to the full Practice
  // Player — nothing is captured, it just paces through the lyrics so you
  // can rehearse against the beat before actually recording a take.
  async practiceDraft(){
    if(ST.phase!=='idle') return;
    ST.phase='practicing'; ST.pracState='waiting'; ST.recT=0; ST.editorLine=0; render();
    const ok = await startPracticeFollow(D.songs[ST.editId]);
    if(!ok && ST.phase==='practicing'){ ST.phase='idle'; render(); }
  },
  stopPractice(){ stopPracticeFollow(); if(ST.phase==='practicing'){ ST.phase='idle'; ST.recT=0; ST.editorLine=0; render(); } },
  // "Play your synced take": previews the song's real recorded-and-aligned
  // take right there on the Sync step, with the same bold-focus progression
  // the Practice Player/Song Viewer use — reusing their exact timing/curWord
  // machinery via ST.ctx='syncpreview' (see tick() and playId()).
  syncPreviewPlay(){
    if(ST.ctx==='syncpreview' && ST.playing && !ST.testSpeed){ ST.playing=false; render(); return; }
    const s = D.songs[ST.editId]; if(!s) return;
    ST.testSpeed=false;
    const tm = timing(s);
    ST.ctx='syncpreview'; ST.t = ST.t<tm.total ? ST.t : 0; ST.playing=true; render();
  },
  async startRecord(){
    if(!canSync()) return;
    // Ask for the mic right now, before showing the 3-2-1 countdown, so the
    // browser's permission prompt appears immediately on tapping Record
    // instead of after the countdown finishes.
    if(ST.phase!=='idle') return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toast('Microphone not available on this device/browser'); return; }
    let stream;
    try{ stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
    catch(err){ toast('Mic error: '+(err && err.name || err)); return; }
    pendingMicStream = stream;
    ST.phase='countdown'; ST.cd=3; ST.bars=[]; ST.recT=0; render();
  },
  startUpload(){
    if(!canSync()) return;
    const fi = document.getElementById('fileInput');
    // From text doc takes chord sheets / lyrics (several at once); everywhere
    // else Upload takes audio or video. On iPhone/iPad the picker isn't
    // filtered (iOS greys out files it doesn't recognise) — the file is
    // checked once it's chosen instead.
    const ios = isIOSDevice();
    if(ST.createMode==='file'){ fi.accept = ios ? '' : '.txt,.md,.text,.pdf,.rtf,.docx,.odt,.pages,text/plain,text/markdown,application/pdf,application/rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'; fi.multiple=true; }
    else { fi.accept = ios ? '' : 'audio/*,video/*,.mp3,.m4a,.m4b,.aac,.wav,.aif,.aiff,.caf,.flac,.ogg,.oga,.opus,.webm,.wma,.amr,.3gp,.mp4,.m4v,.mov,.mkv'; fi.multiple = ST.createMode==='recording' && !ST.editing; }
    fi.click();
  },
  startCloud(){ toast('Importing from cloud storage is coming soon — use Record or Upload for now'); },
  stopRecord(){
    if(ST.phase==='countdown'){
      if(pendingMicStream){ pendingMicStream.getTracks().forEach(t=>t.stop()); pendingMicStream=null; }
      ST.phase='idle'; ST.cd=0; render(); return;
    }
    if(liveRecorder && liveRecorder.state==='recording'){ liveRecorder.stop(); }
    else { ST.phase='idle'; render(); }
  },
  abortRecord(){
    if(pendingMicStream){ pendingMicStream.getTracks().forEach(t=>t.stop()); pendingMicStream=null; }
    if(liveRecorder && liveRecorder.state!=='inactive'){ liveAborting=true; try{ liveRecorder.stop(); }catch(e){} }
    else if(liveStream){ liveStream.getTracks().forEach(t=>t.stop()); liveStream=null; }
    ST.phase='idle'; ST.bars=[]; render();
  },

  openPicker(d){ ST.pick = { kind:d.kind, songId: ST.editId }; render(); },
  closePick(){ ST.pick=null; render(); },
  togglePickPlaylist(d){ if(!canSync()) return; const p = D.playlists.find(x=>x.id===d.id); const sid = ST.pick.songId; const on = p.ids.includes(sid); p.ids = on ? p.ids.filter(i=>i!==sid) : [...p.ids, sid]; render(); queueSavePlaylist(d.id); },
  togglePickGig(d){ if(!canSync()) return; const g = D.gigs.find(x=>x.id===d.id); const sid = ST.pick.songId; const on = g.setlist.includes(sid); g.setlist = on ? g.setlist.filter(i=>i!==sid) : [...g.setlist, sid]; render(); queueSaveGig(d.id); },
  closeSongPick(){ ST.songPick=null; ST.spQuery=''; render(); },
  toggleSongPick(d){ if(!canSync()) return; const sp = ST.songPick;
    if(sp.kind==='gigedit'){ const l = ST.editList||[]; ST.editList = l.includes(d.id) ? l.filter(i=>i!==d.id) : [...l, d.id]; render(); return; }
    const isPl = sp.kind==='playlist'; const target = isPl ? D.playlists.find(p=>p.id===sp.id) : D.gigs.find(g=>g.id===sp.id); const ids = isPl?target.ids:target.setlist; const on = ids.includes(d.id); const next = on ? ids.filter(i=>i!==d.id) : [...ids, d.id]; if(isPl) target.ids=next; else target.setlist=next; render(); if(isPl) queueSavePlaylist(sp.id); else queueSaveGig(sp.id); },
  togglePublic(){ if(!canSync()) return; const s = D.songs[ST.editId]; if(!s) return; s.isPublic = !s.isPublic; render(); saveSongRow(s); },
  togglePlaylistPublic(d){ if(!canSync()) return; const p = D.playlists.find(x=>x.id===d.id); if(!p) return; p.isPublic = !p.isPublic; render(); savePlaylistRow(p); },
  viewDone(){ openSongOrIncomplete(ST.editId, 'home'); render(); },
  continueSong(){ if(!canSync()) return; ST.editId = ST.songId; ST.screen='create'; ST.createMode='manual'; ST.step='lyrics'; ST.phase='idle'; ST.editorLine=0; render(); },

  openNew(d){ if(!canSync()) return; ST.newItem = { kind:d.id, name:'', date:'' }; render(); },
  closeNew(){ ST.newItem=null; render(); },
  createNew(){
    if(!canSync()) return;
    const ni = ST.newItem; if(!ni || !ni.name.trim()) return;
    const withSong = ST.pick ? [ST.pick.songId] : [];
    if(ni.kind==='playlist'){
      const id='p'+Date.now(); const p = { id, title:ni.name.trim(), ids:withSong, mine:true, isPublic:false, added:Date.now(), plays:0 };
      D.playlists.splice(1,0,p);
      ST.newItem=null; if(!ST.pick){ ST.screen='list'; ST.listKind='songs'; ST.listPl=id; } toast('Playlist created');
      savePlaylistRow(p);
    } else {
      // Gigs are shareable from the moment they exist — no separate "make
      // shared" step (see gigShare/openQr/deleteGig).
      const id='g'+Date.now(); const g = { id, title:ni.name.trim(), date: ni.date.trim()||'Date to be confirmed', setlist:withSong, mine:true, isPublic:true, added:Date.now(), plays:0, settings:{} };
      D.gigs.unshift(g);
      ST.newItem=null; if(!ST.pick){ ST.screen='gig'; ST.gigId=id; } toast('Gig created');
      saveGigRow(g);
    }
    render();
  },

  toggleMenu(d, e){
    if(!ST.menu && ST.screen==='gigplayer') ST.songId = gigSongId();
    if(!ST.menu && e && e.target){
      const b = (e.target.closest('[data-act]')||e.target).getBoundingClientRect();
      ST.menuPos = { top: b.top, right: innerWidth - b.right };
    }
    ST.menu = !ST.menu; ST.instMenu=false; render();
  },
  toggleInstMenu(d,e){ if(e) e.stopPropagation(); ST.instMenu = !ST.instMenu; render(); },
  setInstrumentMenu(d, e){ if(e) e.stopPropagation(); ST.instrument=d.id; ST.menu=false; ST.instMenu=false; render(); },
  menuAddGig(){ ST.menu=false; ST.pick = { kind:'gig', songId: ST.songId }; render(); },
  menuAddPlaylist(){ ST.menu=false; ST.pick = { kind:'playlist', songId: ST.songId }; render(); },
  menuRemovePlaylist(){
    if(!canSync()) return;
    const p = D.playlists.find(x=>x.id===ST.listPl); const sid = ST.songId; if(!p) return;
    p.ids = p.ids.filter(i=>i!==sid); queueSavePlaylist(p.id);
    ST.menu=false; stopOnsetListening(); ST.playing=false; ST.listening=false;
    // carry on with the next song in the playlist, or back to the list when it's empty
    const next = listSongIds().ids[0];
    if(next) openSongOrIncomplete(next, 'list'); else ST.screen='list';
    render(); toast('Removed from '+p.title);
  },
  menuRemoveGig(){
    if(!canSync()) return;
    const g = gigObj(); const sid = ST.songId;
    g.setlist = g.setlist.filter(i=>i!==sid); queueSaveGig(g.id);
    ST.menu=false;
    if(ST.gigCur===sid){ stopOnsetListening(); ST.gigCur=null; ST.t=0; ST.playing=false; ST.gListening=false; ST.vcd=0; }
    ST.played = ST.played.filter(i=>i!==sid);
    if(!g.setlist.length) ST.screen='gig';
    render(); toast('Removed from '+g.title);
  },
  // song viewer: a song without a take / without chords
  addSync(){ Actions.editSong(); if(ST.screen==='create'){ ST.step='sync'; render(); } },
  addChords(){ Actions.editSong(); },
  removeMarkings(){ const s = song(ST.songId); if(!s || s.id==='none') return; const keep = {}; if(s.notes && s.notes._tempo) keep._tempo = s.notes._tempo; if(s.notes && s.notes._intro) keep._intro = s.notes._intro; s.notes = keep; ST.menu=false; render(); toast('Markings removed'); queueSaveSong(s.id); },
  editSong(){ if(!canSync()) return; stopOnsetListening(); ST.editReturn = ST.screen==='gigplayer' ? 'gigplayer' : null; ST.playing=false; ST.vcd=0; ST.editId = ST.songId; ST.editing=true; ST.addTarget=null; ST.screen='create'; ST.createMode='manual'; ST.step=hasLyrics(song(ST.songId))?'chords':'sync'; ST.phase='idle'; ST.menu=false; ST.selWord=null; ST.editorLine=0; ST.tempoView=null; ST.speedOpen=false; ST.linkDraft=''; render(); },
  deleteSong(){
    if(!canSync()) return; stopOnsetListening();
    const delId=ST.songId, fromGig = ST.screen==='gigplayer';
    deleteSongEverywhere(delId);
    ST.menu=false;
    if(fromGig){ if(ST.gigCur===delId){ ST.gigCur=null; ST.t=0; ST.playing=false; ST.gListening=false; } if(!gigObj().setlist.length) ST.screen='gig'; }
    else ST.screen='home';
    render(); toast('Song deleted');
  },
  copySong(){
    if(!canSync()) return;
    const src = song(ST.songId);
    const id = 'n'+Date.now();
    const copy = { id, title:src.title, sub:src.sub, lyrics:src.lyrics, chords:{...src.chords}, notes:{...src.notes},
      synced:src.synced, wordTimestamps:src.wordTimestamps||null, audioDurationSec:src.audioDurationSec||null,
      sampleUrl:src.sampleUrl||null, isPublic:false, plays:0, added:Date.now(), mine:true };
    D.songs[id] = copy; D.order = [id, ...D.order];
    const autoPl=D.playlists.find(p=>p.auto); if(autoPl) autoPl.ids=D.order;
    ST.songId = id; ST.viewBy = null; ST.back='home'; render();
    toast('Copied to My songs');
    saveSongRow(copy);
  },
  setViewChord(d){ ST.viewChord = d.id; render(); },
  viewPlay(){
    const s = song(ST.songId); const tm = timing(s);
    // Stop: back to the start of the song
    if(ST.playing || ST.vcd>0){ ST.playing=false; ST.vcd=0; ST.t=0; render(); return; }
    if(ST.listening){ stopOnsetListening(); ST.listening=false; render(); return; }
    const t = ST.t < tm.total ? ST.t : 0;
    ST.t = t;
    if(ST.startMode==='countdown'){ ST.vcd=3; render(); }
    else {
      ST.listening=true; render();
      startOnsetListening(()=>{ ST.listening=false; ST.playing=true; render(); });
    }
  },
  playSample(){
    if(ST.sampling){ stopSampleAudio(); ST.sampling=false; ST.sampleLeft=0; render(); return; }
    const s = song(ST.ctx==='gig' ? gigSongId() : ST.songId);
    // Previously this faked a 5s countdown with no audio when sampleUrl was
    // missing — looked like it was "playing" but nothing was ever audible.
    // Be honest instead: only animate the countdown when a clip will
    // actually play.
    if(!s.sampleUrl){ toast('No recorded sample for this song yet'); return; }
    playSampleAudio(s.sampleUrl); ST.sampling=true; ST.sampleLeft = s.audioDurationSec && s.audioDurationSec<=5 ? s.audioDurationSec : 5; render();
  },

  exitPractice(){ ST.playing=false; ST.screen = ST.back==='create' ? 'create' : 'song'; ST.back = ST.back==='create' ? 'home' : ST.back; render(); },
  togglePlay(){ const tm = timing(song(ST.songId)); const t = ST.t>=tm.total ? 0 : ST.t; ST.playing = !ST.playing; ST.t=t; render(); },
  restart(){ ST.t=0; render(); },
  seek(d,e){ const r = e.currentTarget.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (e.clientX-r.left)/r.width)); const tm = timing(song(ST.songId)); ST.t = f*tm.total; render(); },
  toggleGuide(){ ST.guide = !ST.guide; render(); },
  setGuideInst(d){ ST.guideInst=d.id; ST.guide=true; render(); },

  gigAddSongs(){ ST.gigMenuOpen=false; ST.songPick = { kind:'gig', id: gigObj().id }; render(); },
  gigEditOpen(){ ST.screen='gigedit'; ST.editList = [...gigObj().setlist]; render(); },
  gigPhotosOpen(){ ST.screen='gigphotos'; render(); },
  async gigMessagesOpen(){
    ST.screen='gigmessages'; ST.gigMsgThread=null; ST.gigMsgLoading=true; render();
    const g = gigObj();
    ST.gigThreads = await loadGigThreads(g.id);
    ST.gigMsgLoading=false; render();
  },
  openGigThread(d){ ST.gigMsgThread=d.id; ST.gigMsgDraft=''; render(); },
  closeGigThread(){ ST.gigMsgThread=null; render(); },
  async sendGigReply(){
    if(!canSync()) return;
    const text = (ST.gigMsgDraft||'').trim(); if(!text || !ST.gigMsgThread) return;
    ST.gigMsgDraft='';
    const g = gigObj(); const guestId = ST.gigMsgThread;
    const row = await sendGigDM(g.id, guestId, text);
    const thread = ST.gigThreads.find(t=>t.guestId===guestId);
    if(thread) thread.messages.push(row);
    render();
  },
  gigAddCollab(){ ST.screen='collab'; ST.back='gig'; ST.collabFor = gigObj().id; render(); },
  openGigSettings(){ ST.gigSettings=true; render(); },
  // Every gig is shareable the moment it exists — there's no separate
  // "make shared" step. Audience access is just: does this gig still
  // exist (and isn't deleted)? See deleteGig() below for the only way a
  // gig stops being reachable.
  async gigShare(){
    const g = gigObj();
    const url = audienceUrl(g.id);
    try{ await navigator.clipboard.writeText(url); toast('Audience link copied'); }
    catch(e){ toast(url); }
  },
  async openQr(){
    const g = gigObj();
    ST.qrOpen=true; ST.qrDataUrl=null; render();
    try{
      const dataUrl = await QRCode.toDataURL(audienceUrl(g.id), { width:440, margin:1, color:{ dark:'#1b1b1b', light:'#ffffff' } });
      if(ST.qrOpen){ ST.qrDataUrl=dataUrl; render(); }
    }catch(e){ console.error('Singa: QR generation failed', e); toast('Could not generate the QR code'); ST.qrOpen=false; render(); }
  },
  closeQr(){ ST.qrOpen=false; ST.qrDataUrl=null; render(); },
  closeGigSettings(){ ST.gigSettings=false; render(); },
  toggleGigSetting(d){ const g = gigObj(); const gs = gigSettings(g); g.settings = { ...gs, [d.id]: !gs[d.id] }; render(); },
  deleteGig(){
    if(!canSync()) return;
    const delId = gigObj().id;
    if(ST._liveGig===delId) endLiveGig();
    D.gigs = D.gigs.filter(g=>g.id!==delId);
    ST.gigSettings=false; ST.screen='home'; render();
    toast('Gig deleted'); deleteGigRow(delId);
  },
  openGigSong(d){ openPlayer(d.id); render(); },
  goLive(){
    const g = gigObj(); if(!g.setlist.length){ toast('Add songs to this gig first'); return; }
    openPlayer(null); render();
  },
  // Leaving the player doesn't end the gig: guests stay connected (on a
  // paused screen) until you tap End gig on the gig page.
  exitGig(){
    stopOnsetListening(); ST.playing=false; ST.listening=false; ST.gListening=false; ST.vcd=0; ST.menu=false;
    if(ST._liveGig) broadcastGigState({ songId: gigSongId(), t: ST.t, playing:false, listening:false, vcd:0, ended:false });
    ST.screen='gig'; render();
  },
  endGig(){ endLiveGig(); render(); toast('Gig ended'); },
  startGig(d){
    const g = gigObj();
    joinGigChannel(g.id);
    if(ST.vcd>0) return;
    const cur = gigSongId();
    const gStarted = ST.playing || ST.t>0;
    if(d.id===cur && gStarted){ ST.playing = !ST.playing; render(); return; }
    if(d.id===cur && ST.gListening){ stopOnsetListening(); ST.gListening=false; render(); return; }
    const x = song(d.id); const ok = !!(x.lyrics && x.lyrics.trim());
    const played = (gStarted && cur!==d.id && !ST.played.includes(cur)) ? [...ST.played, cur] : ST.played;
    stopOnsetListening();
    ST.gigCur = d.id; ST.played = played.filter(p=>p!==d.id); ST.t=0; ST.playing=false; ST._liveGig=g.id; ST.gListening=false;
    if(ok){
      if(ST.startMode==='countdown'){ ST.vcd=3; }
      else {
        ST.gListening=true;
        startOnsetListening(()=>{ ST.gListening=false; ST.playing=true; ST.t=0; render(); });
      }
    }
    render();
  },
  gigHeard(){ stopOnsetListening(); ST.gListening=false; ST.playing=true; ST.t=0; render(); },
  editPart(){ toast('Opens Markings for the '+ST.part+' layer'); },
  addPhoto(){ D.photos.push({ id:Date.now(), by: ST.nickname || nicknameFromEmail(ST.email), span: Math.random()>0.7?2:1 }); render(); },
  saveGigEdit(){ if(!canSync()) return; const g = gigObj(); g.setlist = ST.editList; ST.screen='gig'; ST.editList=null; render(); toast('Setlist saved'); saveGigRow(g); },
  addToSetlist(){ const el = ST.editList; const next = D.order.find(id=>!el.includes(id)); if(next) { ST.editList=[...el,next]; render(); } else toast('Every song is already in this gig'); },
  editRowUp(d){ const i = +d.id; if(!i) return; const l=[...ST.editList]; [l[i-1],l[i]]=[l[i],l[i-1]]; ST.editList=l; render(); },
  editRowRemove(d){ const i = +d.id; ST.editList = ST.editList.filter((_,j)=>j!==i); render(); },

  toggleDark(){ ST.perfDark = !ST.perfDark; render(); },

  closeVerifyModal(){ ST.verifyModal=false; render(); },
  async resendVerifyEmail(){
    if(!ST.email){ toast('No email on file'); return; }
    try{
      const r = await sb.auth.resend({ type:'signup', email: ST.email });
      if(r.error) toast(r.error.message);
      else toast('Verification email sent to '+ST.email);
    }catch(e){ toast('Could not resend — check your connection'); }
  }
};
