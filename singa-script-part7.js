"use strict";
let onsetCtx=null, onsetStream=null, onsetRaf=null;
function stopOnsetListening(){
  if(onsetRaf!=null){ cancelAnimationFrame(onsetRaf); onsetRaf=null; }
  if(onsetStream){ onsetStream.getTracks().forEach(t=>t.stop()); onsetStream=null; }
  if(onsetCtx){ onsetCtx.close().catch(()=>{}); onsetCtx=null; }
}
async function startOnsetListening(onTrigger){
  stopOnsetListening();
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toast('Microphone not available on this device/browser'); return; }
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
  catch(err){ toast('Mic error: '+(err && err.name || err)); return; }
  onsetStream = stream;
  const actx = new (window.AudioContext||window.webkitAudioContext)();
  onsetCtx = actx;
  const source = actx.createMediaStreamSource(stream);
  const analyser = actx.createAnalyser();
  analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.2;
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const HISTORY_LEN=43, THRESHOLD_MULT=1.6, MIN_ENERGY_FLOOR=12, REFRACTORY_MS=180;
  let energyHistory=[], lastOnsetTime=0;
  const avg = a=>a.reduce((x,y)=>x+y,0)/a.length;
  const sd = (a,m)=>Math.sqrt(a.reduce((x,y)=>x+(y-m)*(y-m),0)/a.length);
  function frame(){
    if(onsetCtx!==actx) return; // superseded by a newer call
    analyser.getByteFrequencyData(dataArray);
    const binStart=Math.floor(dataArray.length*0.02), binEnd=Math.floor(dataArray.length*0.5);
    let sum=0; for(let i=binStart;i<binEnd;i++) sum+=dataArray[i];
    const energy = sum/(binEnd-binStart);
    energyHistory.push(energy); if(energyHistory.length>HISTORY_LEN) energyHistory.shift();
    const mean=avg(energyHistory), std=sd(energyHistory,mean);
    const threshold = Math.max(MIN_ENERGY_FLOOR, mean+THRESHOLD_MULT*std);
    const now = performance.now();
    if(energy>threshold && energy>MIN_ENERGY_FLOOR && (now-lastOnsetTime)>REFRACTORY_MS && energyHistory.length>=15){
      lastOnsetTime = now;
      stopOnsetListening();
      onTrigger();
      return;
    }
    onsetRaf = requestAnimationFrame(frame);
  }
  onsetRaf = requestAnimationFrame(frame);
}

const Actions = {
  login(){
    if(!ST.email.trim()) return;
    if(!ST.nickname) ST.nickname = nicknameFromEmail(ST.email);
    ST.authProvider = 'email'; ST.screen='home'; saveProfile(); render();
  },
  loginSocial(d){
    const label = d && d.id ? d.id : 'that provider';
    toast('Sign-in with '+label+' needs a connected account (coming once Singa is linked to real sign-in) — use email for now');
  },
  nav(d){ stopOnsetListening(); ST.screen=d.to; ST.menu=false; ST.qrOpen=false; ST.sortOpen=false; render(); },
  back(d){ stopOnsetListening(); ST.screen = d.to && d.to!==ST.screen ? d.to : 'home'; ST.menu=false; render(); },
  signOut(){ stopOnsetListening(); clearProfile(); ST.screen='login'; ST.email=''; ST.nickname=null; ST.authProvider=null; render(); },
  runSearch(){ ST.screen='search'; ST.searchQuery = ST.homeQuery; ST.sortOpen=false; render(); },
  newItem(d){ ST.newItem = { kind:d.kind, name:'', date:'' }; render(); },
  newSong(){ newSongDraft(); render(); },
  openPlaylist(d){ ST.screen='list'; ST.listKind='songs'; ST.listPl=d.id; ST.listQuery=''; ST.sortOpen=false; render(); },
  openGig(d){ ST.gigId=d.id; ST.screen='gig'; ST.qrOpen=false; render(); },
  openSongFrom(d){ openSongOrIncomplete(d.id, d.from); render(); },
  openList(d){ ST.screen='list'; ST.listKind=d.kind; ST.listPl=null; ST.listQuery=''; ST.sortOpen=false; render(); },
  listAdd(){ if(ST.listKind==='playlists') Actions.newItem({kind:'playlist'}); else if(ST.listKind==='gigs') Actions.newItem({kind:'gig'}); else { const curPl = ST.listPl ? D.playlists.find(p=>p.id===ST.listPl) : null; if(curPl && !curPl.auto) { ST.songPick = { kind:'playlist', id:curPl.id }; render(); } else { newSongDraft(); render(); } } },
  toggleSort(){ ST.sortOpen = !ST.sortOpen; render(); },
  setSort(d){ ST.sort = d.id; ST.sortOpen=false; render(); },

  editNickname(){ ST.editNick = ST.nickname || nicknameFromEmail(ST.email); render(); },
  nickInput(v){ ST.editNick=v; render(); },
  closeEditNick(){ ST.editNick=null; render(); },
  saveNickname(){ if(ST.editNick && ST.editNick.trim()) ST.nickname = ST.editNick.trim(); ST.editNick=null; saveProfile(); render(); toast('Nickname updated'); },
  openUpgrade(){ ST.upgrade=true; render(); },
  closeUpgrade(){ ST.upgrade=false; render(); },
  doUpgrade(){ ST.plan='rockstar'; ST.upgrade=false; saveProfile(); render(); toast("You're a RockStar now"); },
  downgrade(){ ST.plan='free'; saveProfile(); render(); toast('Switched to Free'); },
  newCollab(){ ST.collabEdit = { i:null, name:'', email:'', gigs: ST.collabFor ? [ST.collabFor] : [] }; render(); },
  editCollab(d){ const i = +d.id; const c = D.collabs[i]; ST.collabEdit = { i, name:c.name, email:c.email, gigs:[...c.gigs] }; render(); },
  closeCollabEdit(){ ST.collabEdit=null; render(); },
  toggleCeGig(d){ const ce = ST.collabEdit; const on = ce.gigs.includes(d.id); ce.gigs = on ? ce.gigs.filter(x=>x!==d.id) : [...ce.gigs, d.id]; render(); },
  saveCollab(){ const ce = ST.collabEdit; if(!ce.name.trim()) return; const c = { name:ce.name, email:ce.email, gigs:ce.gigs }; if(ce.i==null) D.collabs.push(c); else D.collabs[ce.i]=c; ST.collabEdit=null; render(); toast(ce.i==null?'Invite sent to '+(ce.email||ce.name):'Saved'); },
  setInstrument(d){ ST.instrument = d.id; saveProfile(); render(); },
  setStartMode(d){ ST.startMode = d.id; saveProfile(); render(); },
  toggleNotif(d){ ST.notif[d.id] = !ST.notif[d.id]; saveProfile(); render(); },
  toggleCollabInGig(d){ const i = +d.id; const cg = D.gigs.find(g=>g.id===ST.collabFor); if(!cg) return; const c = D.collabs[i]; const inGig = c.gigs.includes(cg.id); c.gigs = inGig ? c.gigs.filter(x=>x!==cg.id) : [...c.gigs, cg.id]; render(); toast(inGig ? c.name+' removed from '+cg.title : c.name+' added to '+cg.title); },

  setCreateMode(d){ ST.createMode=d.id; ST.phase='idle'; ST.step='lyrics'; render(); },
  createBack(){
    if(ST.phase!=='idle'){ ST.phase='idle'; render(); return; }
    const order=['lyrics','chords','markings','sync'], i=order.indexOf(ST.step);
    if(ST.createMode==='manual' && i>0){ ST.step=order[i-1]; ST.selWord=null; } else ST.screen='home';
    render();
  },
  goCreateStep(d){
    const s = D.songs[ST.editId]; const hasLyrics = !!(s && s.lyrics.trim());
    if(ST.phase!=='idle') return;
    if(!hasLyrics && d.id!=='lyrics'){ toast('Add lyrics first'); return; }
    ST.step=d.id; ST.selWord=null; render();
  },
  createNextStep(){ const order=['lyrics','chords','markings','sync']; const i=order.indexOf(ST.step); ST.step=order[Math.min(3,i+1)]; ST.selWord=null; render(); },
  lyricsNext(){ const s = D.songs[ST.editId]; if(s.lyrics.trim()) Actions.createNextStep(); },
  openSimilar(){ ST.similar=true; render(); },
  closeSimilar(){ ST.similar=false; render(); },
  useSimilar(){ ST.similar=false; ST.screen='song'; ST.songId='dgbmh'; ST.viewBy = 'allhands232'; ST.back='create'; ST.ctx='view'; ST.t=0; ST.playing=false; render(); },
  fillExample(){ const s = D.songs[ST.editId]; s.lyrics = EX_LYRICS; if(!s.title) s.title = "Don't Go Breaking My Heart"; if(!s.sub) s.sub = EX_SUB; render(); },
  pickRoot(d){ ST.rootIdx = +d.id; ST.selRoot = LETTERS[+d.id]; render(); },
  pickVariant(d){ ST.selRoot = d.root; ST.selSuffix = d.q; render(); },
  placeChord(d){ const s = D.songs[ST.editId]; const sel = ST.selRoot+ST.selSuffix; if(s.chords[d.id]===sel) delete s.chords[d.id]; else s.chords[d.id]=sel; render(); },
  pickMarkWord(d){ const s = D.songs[ST.editId]; ST.selWord = d.id; ST.noteDraft = (s.notes||{})[d.id] || ''; render(); },
  saveNote(){ const s = D.songs[ST.editId]; const n = {...s.notes}; if(ST.noteDraft.trim()) n[ST.selWord]=ST.noteDraft.trim(); else delete n[ST.selWord]; s.notes=n; ST.selWord=null; render(); },
  removeNote(){ const s = D.songs[ST.editId]; const n = {...s.notes}; delete n[ST.selWord]; s.notes=n; ST.selWord=null; ST.noteDraft=''; render(); },
  detectChords(){ ST.autoChords=true; ST.step='sync'; render(); },
  practiceDraft(){ ST.screen='practice'; ST.ctx='practice'; ST.t=0; ST.playing=false; ST.songId=ST.editId; ST.back='create'; render(); },
  startRecord(){ ST.phase='countdown'; ST.cd=3; ST.bars=[]; ST.recT=0; render(); },
  startUpload(){ document.getElementById('fileInput').click(); },
  startCloud(){ toast('Importing from cloud storage is coming soon — use Record or Upload for now'); },
  stopRecord(){
    if(ST.phase==='countdown'){ ST.phase='idle'; ST.cd=0; render(); return; }
    if(liveRecorder && liveRecorder.state==='recording'){ liveRecorder.stop(); }
    else { ST.phase='idle'; render(); }
  },
  abortRecord(){
    if(liveRecorder && liveRecorder.state!=='inactive'){ liveAborting=true; try{ liveRecorder.stop(); }catch(e){} }
    else if(liveStream){ liveStream.getTracks().forEach(t=>t.stop()); liveStream=null; }
    ST.phase='idle'; ST.bars=[]; render();
  },

  openPicker(d){ ST.pick = { kind:d.kind, songId: ST.editId }; render(); },
  closePick(){ ST.pick=null; render(); },
  togglePickPlaylist(d){ const p = D.playlists.find(x=>x.id===d.id); const sid = ST.pick.songId; const on = p.ids.includes(sid); p.ids = on ? p.ids.filter(i=>i!==sid) : [...p.ids, sid]; render(); },
  togglePickGig(d){ const g = D.gigs.find(x=>x.id===d.id); const sid = ST.pick.songId; const on = g.setlist.includes(sid); g.setlist = on ? g.setlist.filter(i=>i!==sid) : [...g.setlist, sid]; render(); },
  closeSongPick(){ ST.songPick=null; ST.spQuery=''; render(); },
  toggleSongPick(d){ const sp = ST.songPick; const isPl = sp.kind==='playlist'; const target = isPl ? D.playlists.find(p=>p.id===sp.id) : D.gigs.find(g=>g.id===sp.id); const ids = isPl?target.ids:target.setlist; const on = ids.includes(d.id); const next = on ? ids.filter(i=>i!==d.id) : [...ids, d.id]; if(isPl) target.ids=next; else target.setlist=next; render(); },
  togglePublic(){ ST.isPublic = !ST.isPublic; render(); },
  viewDone(){ openSongOrIncomplete(ST.editId, 'home'); render(); },
  continueSong(){ ST.editId = ST.songId; ST.screen='create'; ST.createMode='manual'; ST.step='lyrics'; ST.phase='idle'; render(); },

  openNew(d){ ST.newItem = { kind:d.id, name:'', date:'' }; render(); },
  closeNew(){ ST.newItem=null; render(); },
  createNew(){
    const ni = ST.newItem; if(!ni || !ni.name.trim()) return;
    const withSong = ST.pick ? [ST.pick.songId] : [];
    if(ni.kind==='playlist'){
      const id='p'+Date.now(); D.playlists.splice(1,0,{ id, title:ni.name.trim(), ids:withSong, mine:true, added:Date.now(), plays:0 });
      ST.newItem=null; if(!ST.pick){ ST.screen='list'; ST.listKind='songs'; ST.listPl=id; } toast('Playlist created');
    } else {
      const id='g'+Date.now(); D.gigs.unshift({ id, title:ni.name.trim(), date: ni.date.trim()||'Date to be confirmed', setlist:withSong, mine:true, added:Date.now(), plays:0, settings:{} });
      ST.newItem=null; if(!ST.pick){ ST.screen='gig'; ST.gigId=id; } toast('Gig created');
    }
    render();
  },

  toggleMenu(){ ST.menu = !ST.menu; ST.instMenu=false; render(); },
  toggleInstMenu(d,e){ if(e) e.stopPropagation(); ST.instMenu = !ST.instMenu; render(); },
  setInstrumentMenu(d, e){ if(e) e.stopPropagation(); ST.instrument=d.id; ST.menu=false; ST.instMenu=false; render(); },
  menuAddGig(){ ST.menu=false; ST.pick = { kind:'gig', songId: ST.songId }; render(); },
  editSong(){ stopOnsetListening(); ST.editId = ST.songId; ST.screen='create'; ST.createMode='manual'; ST.step='chords'; ST.phase='idle'; ST.menu=false; render(); },
  deleteSong(){ if(ST.songId==='dgbmh'){ ST.menu=false; render(); toast('Demo song is used in a gig — remove it there first'); return; } stopOnsetListening(); delete D.songs[ST.songId]; D.order = D.order.filter(x=>x!==ST.songId); ST.screen='home'; ST.menu=false; ST.songId='dgbmh'; render(); toast('Song deleted'); },
  copySong(){ ST.viewBy=null; render(); toast('Copied to My songs'); },
  setViewChord(d){ ST.viewChord = d.id; render(); },
  viewPlay(){
    const s = song(ST.songId); const tm = timing(s);
    if(ST.playing){ ST.playing=false; render(); return; }
    if(ST.vcd>0) return;
    if(ST.listening){ stopOnsetListening(); ST.listening=false; render(); return; }
    const t = ST.t < tm.total ? ST.t : 0;
    ST.t = t;
    if(ST.startMode==='countdown'){ ST.vcd=3; render(); }
    else {
      ST.listening=true; render();
      startOnsetListening(()=>{ ST.listening=false; ST.playing=true; render(); });
    }
  },
  playSample(){ ST.sampling = !ST.sampling; ST.sampleLeft = ST.sampling ? 10 : 0; render(); if(ST.sampling) toast('Playing a short preview'); },

  exitPractice(){ ST.playing=false; ST.screen = ST.back==='create' ? 'create' : 'song'; ST.back = ST.back==='create' ? 'home' : ST.back; render(); },
  togglePlay(){ const tm = timing(song(ST.songId)); const t = ST.t>=tm.total ? 0 : ST.t; ST.playing = !ST.playing; ST.t=t; render(); },
  restart(){ ST.t=0; render(); },
  seek(d,e){ const r = e.currentTarget.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (e.clientX-r.left)/r.width)); const tm = timing(song(ST.songId)); ST.t = f*tm.total; render(); },
  toggleGuide(){ ST.guide = !ST.guide; render(); },
  setGuideInst(d){ ST.guideInst=d.id; ST.guide=true; render(); },

  gigAddSongs(){ ST.songPick = { kind:'gig', id: gigObj().id }; render(); },
  gigEditOpen(){ ST.screen='gigedit'; ST.editList = [...gigObj().setlist]; render(); },
  gigPhotosOpen(){ ST.screen='gigphotos'; render(); },
  gigAddCollab(){ ST.screen='collab'; ST.back='gig'; ST.collabFor = gigObj().id; render(); },
  openGigSettings(){ ST.gigSettings=true; render(); },
  gigShare(){ toast('Link copied · singa.live/g/'+gigObj().id); },
  openQr(){ ST.qrOpen=true; render(); },
  closeQr(){ ST.qrOpen=false; render(); },
  closeGigSettings(){ ST.gigSettings=false; render(); },
  toggleGigSetting(d){ const g = gigObj(); const gs = gigSettings(g); g.settings = { ...gs, [d.id]: !gs[d.id] }; render(); },
  openGigSong(d){ openPlayer(d.id); render(); },
  goLive(){
    const g = gigObj(); if(!g.setlist.length){ toast('Add songs to this gig first'); return; }
    openPlayer(null); render();
  },
  exitGig(){ stopOnsetListening(); ST.screen='gig'; ST.playing=false; ST.listening=false; ST.gListening=false; render(); },
  startGig(d){
    const g = gigObj();
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
  saveGigEdit(){ const g = gigObj(); g.setlist = ST.editList; ST.screen='gig'; ST.editList=null; render(); toast('Setlist saved'); },
  addToSetlist(){ const el = ST.editList; const next = D.order.find(id=>!el.includes(id)); if(next) { ST.editList=[...el,next]; render(); } else toast('Every song is already in this gig'); },
  editRowUp(d){ const i = +d.id; if(!i) return; const l=[...ST.editList]; [l[i-1],l[i]]=[l[i],l[i-1]]; ST.editList=l; render(); },
  editRowRemove(d){ const i = +d.id; ST.editList = ST.editList.filter((_,j)=>j!==i); render(); },

  toggleDark(){ ST.perfDark = !ST.perfDark; render(); }
};

