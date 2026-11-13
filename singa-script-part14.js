/* Singa · later rounds (loaded by singa-script-part13.js) */

/* ============================================================
   ROUND 18
   · Spotify playlists: the Spotify logo is their artwork (and sits on a
     picture of your own, as a small badge); the line under the name
     says how many songs, like other playlists.
   · Gig menu › Settings on a phone: a second panel over the menu.
   · Playlist settings (the gear on a playlist): name, shared, artwork,
     Spotify, and Delete playlist.
   · New song › Upload › a document with several songs in it: Singa
     finds them and asks whether to add each one as its own song.
   · New artwork for the hand on "Got it!" (the sign-in picture is the
     first version, restored in round 21).
   ============================================================ */
(function(){
  const css = `
.nart .nsp-wm{position:absolute;display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))}
.nart.nsp-art{display:inline-flex;align-items:center;justify-content:center}
.nart.nsp-art svg{position:relative;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35))}
.npl-set{margin-left:14px;color:var(--n-mute)}
.nps-row{display:flex;align-items:center;gap:14px;padding:11px 0;cursor:pointer}
.nps-row .nps-t{font-size:15px;font-weight:600}
.nps-row .nps-s{font-size:12px;color:var(--n-mute);margin-top:2px}
.nps-row .nart{flex:none}
.nps-row > div:not(.toggle){min-width:0;flex:1}
.modal.nps-modal{min-width:0}
.toggle:has(> .dot[style*="left:20px"]){background:var(--n-pink) !important}
.toggle > .dot[style*="left:20px"]{background:#fff !important}
.nps-name{margin:2px 0 6px}
.nps-link{font-size:13px;color:var(--n-mute);text-decoration:underline;text-underline-offset:3px;cursor:pointer;margin-left:auto;white-space:nowrap}
.nms-list{display:flex;flex-direction:column;gap:2px;max-height:min(42vh,320px);overflow:auto;margin:4px 0 2px}
.nms-list div{display:flex;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--n-line)}
.nms-list b{font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nms-list small{color:var(--n-mute);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nms-list i{font-style:normal;color:var(--n-mute);font-size:13px;width:22px;flex:none;text-align:right}
@media (max-width:600px){ .npl-head{flex-wrap:wrap;row-gap:6px} .npl-head > div[style="flex:1"]{flex:0 0 100%;height:0} .npl-head .npl-set{margin-left:4px} }
.nms-spin{width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.18);border-top-color:#fff;animation:nspSpin 1s linear infinite;margin:8px auto}
@media (max-width:759px){
  .modal-backdrop.ngs-bd{z-index:130;background:transparent;justify-content:flex-start;align-items:stretch;padding:0;animation:none}
  .modal.ngs-panel{width:min(calc(100vw - 28px),380px);max-width:none;height:100%;max-height:none;border-radius:0 28px 28px 0;border-left:0;padding:calc(18px + env(safe-area-inset-top)) 20px calc(22px + env(safe-area-inset-bottom));overflow:auto;animation:ngsIn .28s cubic-bezier(.2,.8,.2,1) both}
  .ngs-head{justify-content:flex-start !important;gap:6px;margin-left:-8px}
}
@keyframes ngsIn{from{transform:translateX(-48px);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){ .modal.ngs-panel{animation:none} }
`;
  const st = document.createElement('style'); st.id = 'nightCss18'; st.textContent = css;
  document.head.appendChild(st);
})();

/* ---- Spotify playlists: the logo is the artwork ---- */
function nSpLogo(px){ return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1ed760"></circle><path d="M6.5 9.2c3.8-1.1 7.6-.8 11 1M7.2 12.4c3-.8 6.1-.6 8.8.9M7.9 15.4c2.3-.6 4.6-.4 6.6.7" stroke="#000" stroke-width="1.6" fill="none" stroke-linecap="round"></path></svg>`; }
function nIsSp(p){ return !!(p && (p.src==='spotify' || p.spotifyId)); }
const _n18Art = nArt;
nArt = function(seed, size, radius, cls){
  const html = _n18Art(seed, size, radius, cls);
  if(String(seed).indexOf('pl:')!==0) return html;
  const pl = nPlBySeed(seed); if(!nIsSp(pl)) return html;
  const r = radius!=null ? radius : Math.round(size*0.28);
  if(pl.art){
    const w = Math.max(14, Math.round(size*0.24)), pad = Math.max(3, Math.round(size*0.06));
    return html.replace(/<\/span>$/, nSpLogo(w).replace('<svg ', `<svg class="nsp-wm" style="right:${pad}px;bottom:${pad}px" `)+'</span>');
  }
  const p = nArtColors(seed);
  return `<span class="nart nsp-art${cls?' '+cls:''}" aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:${r}px;background:radial-gradient(circle at 30% 22%, rgba(255,255,255,.16), transparent 60%),${p[1]}">${nSpLogo(Math.round(size*0.56))}</span>`;
};
// the name is enough: no badge beside it, and the songs counted underneath
const _n18Badge = srcBadge;
srcBadge = function(p){ return nIsSp(p) ? '' : _n18Badge(p); };
function nPlCount(p){ const n = ((p.auto ? D.order : p.ids)||[]).length; return n+' song'+(n===1?'':'s'); }
const _n18PlRow = playlistRow;
playlistRow = function(p){
  const h = _n18PlRow(p);
  return nIsSp(p) ? h.replace('<div class="s">From Spotify</div>', '<div class="s">'+esc(nPlCount(p))+'</div>') : h;
};
const _n18Home = renderHome;
renderHome = function(){
  return _n18Home().replace(/(<div class="ntile" data-act="openPlaylist" data-id="([^"]+)">(?:(?!<div class="ntile")[\s\S])*?<span class="s">)Spotify(<\/span>)/g, (m, a, id, b)=>{
    const p = (D.playlists||[]).find(x=>String(x.id)===id);
    return p ? a+esc(nPlCount(p))+b : m;
  });
};

/* ---- Gig menu › Settings on a phone: a panel over the menu ---- */
function nPhoneNarrow(){ return !!(window.matchMedia && matchMedia('(max-width: 759px)').matches); }
const _n18GigSet = renderGigSettingsModal;
renderGigSettingsModal = function(){
  const h = _n18GigSet();
  if(!(nPhoneNarrow() && ST.gigMenuOpen && ST.screen==='gig')) return h;
  return h.replace('<div class="modal-backdrop" data-act="closeGigSettings"><div class="modal"', '<div class="modal-backdrop ngs-bd" data-act="closeGigSettings"><div class="modal ngs-panel"')
    .replace(/<div class="mhead"><span([^>]*)>Gig settings<\/span><span class="icon-btn" data-act="closeGigSettings">[\s\S]*?<\/span><\/div>/,
      (m, st)=>`<div class="mhead ngs-head"><span class="icon-btn" data-act="closeGigSettings" title="Back to the gig menu" aria-label="Back to the gig menu">${icon('chevron_left',26)}</span><span${st}>Gig settings</span></div>`)
    .replace('data-act="closeGigSettings">Done</button>', 'data-xact="gigSetDone">Done</button>');
};
XActions.gigSetDone = function(){ ST.gigSettings = false; ST.gigMenuOpen = false; render(); };

/* ---- Playlist settings ---- */
function nTog(on){ return `<div class="toggle" style="flex:none;background:${on?'#1b1b1b':'#fff'}"><div class="dot" style="left:${on?20:2}px;background:${on?'#fff':'#1b1b1b'}"></div></div>`; }
XActions.plSetOpen = function(d){ const p = (D.playlists||[]).find(x=>x.id===d.id); if(!p || p.auto || p.mine===false) return; ST.newItem = { kind:'plset', id:p.id, name:p.title||'' }; render(); };
Binds.plSetName = function(v){ const ni = ST.newItem; if(ni && ni.kind==='plset') ni.name = v; };
function nPlSetSaveName(){
  const ni = ST.newItem; if(!ni || ni.kind!=='plset') return;
  const p = (D.playlists||[]).find(x=>x.id===ni.id); if(!p) return;
  const inp = document.querySelector('[data-bind="plSetName"]'); if(inp) ni.name = inp.value;
  const t = (ni.name||'').trim();
  if(t && t!==p.title){
    // a custom picture is kept under the playlist, the Singa artwork follows the name
    p.title = t; if(canSync()) savePlaylistRow(p);
  }
}
XActions.plSetDone = function(){ nPlSetSaveName(); ST.newItem = null; render(); };
XActions.plSetShare = function(){
  const ni = ST.newItem, p = ni && (D.playlists||[]).find(x=>x.id===ni.id); if(!p) return;
  if(!canSync()) return;
  nPlSetSaveName();
  p.isPublic = !p.isPublic; savePlaylistRow(p); render();
};
XActions.plSetArt = function(){ const ni = ST.newItem; if(!ni) return; nPlSetSaveName(); XActions.plArtOpen({ id: ni.id }); };
XActions.plSetUnlink = function(){ const ni = ST.newItem; if(!ni) return; nPlSetSaveName(); XActions.spUnlink({ id: ni.id }); };
XActions.plSetDelete = function(){
  const ni = ST.newItem, p = ni && (D.playlists||[]).find(x=>x.id===ni.id); if(!p) return;
  ST.newItem = null;
  ST.confirm = { act:'delPl', id:p.id, ok:'Delete', text:'“'+(p.title||'This playlist')+'” will be deleted. The songs in it stay in your songs.' };
  render();
};
const _n18ConfirmOk = Actions.confirmOk;
Actions.confirmOk = function(){
  const c = ST.confirm;
  if(!c || c.act!=='delPl') return _n18ConfirmOk.apply(this, arguments);
  ST.confirm = null;
  if(!canSync()){ render(); return; }
  D.playlists = (D.playlists||[]).filter(x=>x.id!==c.id);
  if(ST.listPl===c.id){ ST.listPl = null; ST.listKind = 'playlists'; }
  try{ localStorage.removeItem(nArtKey(c.id)); }catch(e){}
  try{ const L = spLinks(); if(L[c.id]){ delete L[c.id]; spSet(SP_LINKS, L); } }catch(e){}
  render(); toast('Playlist deleted');
  if(ST.userId){ (async ()=>{ try{ const r = await sb.from('playlists').delete().eq('id', c.id).eq('owner_id', ST.userId); if(r && r.error) console.error('Singa: playlist delete failed', r.error); }catch(e){ console.error('Singa: playlist delete failed', e); } })(); }
};
const _n18NewModal = renderNewModal;
renderNewModal = function(){
  const ni = ST.newItem;
  if(ni && ni.kind==='plset') return nPlSetHTML(ni);
  if(ni && ni.kind==='multiscan') return nMultiHTML(ni);
  return _n18NewModal();
};
function nPlSetHTML(ni){
  const p = (D.playlists||[]).find(x=>x.id===ni.id);
  if(!p){ ST.newItem = null; return ''; }
  const sp = p.spotifyId ? `<div class="nps-row" style="cursor:default">${nSpLogo(40)}<div style="min-width:0"><div class="nps-t">Follows a Spotify playlist</div><div class="nps-s">Refresh on the playlist adds its new tracks</div></div><span class="nps-link" data-xact="plSetUnlink">Stop following</span></div>` : '';
  return `<div class="modal-backdrop" data-act="closeNew"><div class="modal nps-modal" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">Playlist settings</span><span class="icon-btn" data-act="closeNew">${icon('close',22)}</span></div>
    <input class="ipt nps-name" placeholder="Playlist name" value="${esc(ni.name)}" data-bind="plSetName" aria-label="Playlist name">
    <div class="nps-row" data-xact="plSetShare">${nTog(!!p.isPublic)}<div><div class="nps-t">Shared</div><div class="nps-s">Other Singa users can find this playlist and add it</div></div></div>
    <div class="nps-row" data-xact="plSetArt">${nArt('pl:'+(p.title||p.id), 40, 10)}<div style="flex:1;min-width:0"><div class="nps-t">Artwork</div><div class="nps-s">${p.art ? 'Your picture' : nIsSp(p) ? 'The Spotify logo, or a picture of your own' : 'The Singa artwork, or a picture of your own'}</div></div>${icon('chevron_right',22)}</div>
    ${sp}
    <div style="border-top:1px solid var(--b2);margin-top:4px;padding-top:14px">
      <a class="link" style="color:var(--accent)" data-xact="plSetDelete">Delete playlist</a>
    </div>
    <button class="btn btn-dark" style="margin-top:14px" data-xact="plSetDone">Done</button>
  </div></div>`;
}
// closing it keeps a new name too
const _n18CloseNew = Actions.closeNew;
Actions.closeNew = function(){ if(ST.newItem && ST.newItem.kind==='plset') nPlSetSaveName(); if(ST.newItem && ST.newItem.kind==='multiscan' && !ST.newItem.busy){ XActions.multiOne(); return; } return _n18CloseNew.apply(this, arguments); };
// the gear on a playlist you made (Shared now lives in its settings)
const _n18RenderList = renderList;
renderList = function(){
  let html = _n18RenderList();
  // a playlist page on a phone: the sort goes under the name, so nothing runs off the screen
  if(ST.listPl) html = html.replace('<div class="row" style="gap:14px;position:relative;z-index:2;margin-bottom:24px">', '<div class="row npl-head" style="gap:14px;position:relative;z-index:2;margin-bottom:24px">');
  return html.replace(/<a class="link" style="margin-left:18px;color:[^"]*" data-act="togglePlaylistPublic" data-id="([^"]*)">[^<]*<\/a>/,
    (m, id)=>`<span class="icon-btn npl-set" title="Playlist settings" aria-label="Playlist settings" data-xact="plSetOpen" data-id="${id}">${icon('settings',24)}</span>`);
};

/* ---- several songs in one document ---- */
let _n18Pre = null;   // a document already read: { files, results }
const _n18Read = readSheetFiles;
readSheetFiles = async function(files, split, onLog){
  const pre = _n18Pre;
  if(pre && files && pre.files.length===files.length && pre.files.every((f,i)=>f===files[i]) && (split || (files.length===1 && pre.results.length===1))){ _n18Pre = null; return pre.results; }
  return _n18Read.apply(this, arguments);
};
function nIsDocOnly(files){ return files.length && files.every(f=>!/\.doc$/i.test(f.name||'') && !isAudioFile(f)); }
const _n18Upload = nUploadToDraft;
nUploadToDraft = function(files){
  const s = D.songs[ST.editId];
  if(ST.editing || !s || hasLyrics(s) || ST.step==='sync' || !nIsDocOnly(files)) return _n18Upload(files);
  nScanDocs(files);
};
function nHasCouplets(r){ return !!(r && (r.blocks||[]).some(b=>b.type==='couplet')); }
async function nScanDocs(docs){
  const name = docs.length>1 ? docs.length+' files' : '“'+(docs[0].name||'your document')+'”';
  const ni = { kind:'multiscan', busy:true, name, docs }; ST.newItem = ni; render();
  let all = null;
  try{ all = await _n18Read(docs, true, ()=>{}); }catch(e){ console.warn('Singa: reading the document first failed', e); }
  if(ST.newItem!==ni) return;              // cancelled
  const good = (all||[]).filter(nHasCouplets);
  if(good.length<=1){
    ST.newItem = null; render();
    if(all && docs.length===1) _n18Pre = { files: docs, results: all };
    _n18Upload(docs); return;
  }
  ni.busy = false; ni.results = good; render();
}
function nMultiHTML(ni){
  if(ni.busy) return `<div class="modal-backdrop"><div class="modal" style="max-width:400px;align-items:center;text-align:center" onclick="modalClick(event)">
    <div class="nms-spin"></div>
    <div style="font-size:17px;font-weight:600">Reading ${esc(ni.name)}…</div>
    <div class="nps-s" style="font-size:13px;color:var(--n-mute)">Checking how many songs it holds</div>
    <button class="btn btn-outline" style="margin-top:8px;width:160px" data-xact="multiCancel">Cancel</button>
  </div></div>`;
  const n = ni.results.length;
  const rows = ni.results.map((r,i)=>`<div><i>${i+1}</i><b>${esc(r.title||'Untitled song')}</b>${r.artist ? `<small>${esc(r.artist)}</small>` : ''}</div>`).join('');
  return `<div class="modal-backdrop"><div class="modal nps-modal" style="max-width:440px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">${n} songs found</span><span class="icon-btn" data-xact="multiOne" title="Keep it as one song">${icon('close',22)}</span></div>
    <div class="nps-s" style="font-size:14px;color:var(--n-mute);line-height:1.45">${esc(ni.name)} holds ${n} songs. Add each one as its own song, or keep everything as one song?</div>
    <div class="nms-list">${rows}</div>
    <button class="btn btn-dark" data-xact="multiAdd">Add ${n} songs</button>
    <button class="btn btn-outline" data-xact="multiOne">Keep it as one song</button>
  </div></div>`;
}
XActions.multiCancel = function(){ ST.newItem = null; render(); };
XActions.multiOne = function(){
  const ni = ST.newItem; if(!ni || ni.kind!=='multiscan' || ni.busy) return;
  ST.newItem = null; render();
  _n18Upload(ni.docs);
};
XActions.multiAdd = function(){
  const ni = ST.newItem; if(!ni || ni.kind!=='multiscan' || ni.busy) return;
  ST.newItem = null;
  const s = D.songs[ST.editId]; if(!s){ render(); return; }
  askNotify();
  _n18Pre = { files: ni.docs, results: ni.results };
  const label = ni.results.length+' songs';
  const j = newJob(s.id, label, true); j.target = ST.addTarget; ST.addTarget = null; j.note = 'Waiting…';
  j.src = { kind:'sheet', files: ni.docs, file: ni.docs[0], split:true };
  if(!D.order.includes(s.id)) D.order = [s.id, ...D.order];
  const autoPl = (D.playlists||[]).find(p=>p.auto); if(autoPl) autoPl.ids = D.order;
  leaveCreateForQueue();
  ST.phase = 'idle'; ST.selWord = null; ST._queuedEdit = false;
  ST.queued = ni.results.map(r=>r.title||'Untitled song'); ST._queuedMulti = ST.queued.length; ST.screen = 'queued';
  render();
  _importAudioQueue = _importAudioQueue.then(()=>importSheetJob(s, j.src, j)).catch(e=>{ console.error('Singa: adding the songs failed', e); jobFailed(j, "Couldn't add the songs from "+ni.name+": "+(e && e.message || e)); });
};
const _n18Queued = renderQueued;
renderQueued = function(){
  let h = _n18Queued();
  const q = ST.queued || [];
  if(ST._queuedMulti && q.length===ST._queuedMulti) h = h.replace(q.length+' files<br>are being read', q.length+' songs<br>are being added');
  return h;
};
const _n18QueueDraft = nQueueToDraft;
nQueueToDraft = function(){ ST._queuedMulti = 0; return _n18QueueDraft.apply(this, arguments); };

/* ---- the hands: new artwork ---- */
const N18_DEFS = `<linearGradient id="xSkin" gradientUnits="userSpaceOnUse" x1="0" y1="-130" x2="0" y2="80"><stop offset="0" stop-color="#FFC4DD"/><stop offset=".55" stop-color="#FF7AB0"/><stop offset="1" stop-color="#E2508F"/></linearGradient>
<linearGradient id="xSkin2" gradientUnits="userSpaceOnUse" x1="0" y1="-60" x2="0" y2="0"><stop offset="0" stop-color="#FFB3D2"/><stop offset="1" stop-color="#F0649F"/></linearGradient>
<linearGradient id="xSkin3" gradientUnits="userSpaceOnUse" x1="-50" y1="0" x2="45" y2="0"><stop offset="0" stop-color="#F0649F"/><stop offset="1" stop-color="#FFB9D6"/></linearGradient>
<linearGradient id="xSleeve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2AC0"/><stop offset="1" stop-color="#1B0E5C"/></linearGradient>
<linearGradient id="xHandle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#140733"/><stop offset=".55" stop-color="#2A1260"/><stop offset=".8" stop-color="#5B3DD6"/><stop offset="1" stop-color="#1A0B44"/></linearGradient>
<radialGradient id="xHead" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FF9BF5"/><stop offset=".55" stop-color="#D21CFF"/><stop offset="1" stop-color="#5B14B8"/></radialGradient>
<pattern id="xGrille" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="3" fill="rgba(42,8,90,0.45)"/></pattern>
<linearGradient id="xFist" gradientUnits="userSpaceOnUse" x1="-50" y1="-60" x2="40" y2="70"><stop offset="0" stop-color="#FFC0DA"/><stop offset=".55" stop-color="#FF7AB0"/><stop offset="1" stop-color="#E2508F"/></linearGradient>`;
const N18_HORNS = `<path d="M-38 62 L38 62 L46 172 L-46 172 Z" fill="url(#xSleeve)"/>
<path d="M-40 94H40M-42 118H42M-44 142H44" stroke="#3A1E9C" stroke-width="5"/>
<path d="M-41 58 Q0 52 41 58 L42 72 Q0 66 -42 72 Z" fill="#B21CFF"/>
<g fill="url(#xSkin)">
<path d="M-47 -26 L-60 -116 C-62 -132 -38 -136 -36 -120 L-22 -26 Z"/>
<path d="M28 -18 L46 -94 C49 -108 69 -104 66 -90 L54 -10 Z"/>
<path d="M-52 -34 C-53 -48 -42 -52 -30 -48 L42 -42 C54 -41 60 -30 58 -16 L52 26 C49 46 38 60 22 64 L-24 64 C-40 60 -50 44 -52 24 Z"/>
</g>
<g fill="url(#xSkin2)">
<path d="M-25 -12 L-25 -46 C-25 -64 3 -64 3 -46 L3 -12 Z"/>
<path d="M4 -10 L4 -42 C4 -58 30 -58 30 -42 L30 -10 Z"/>
</g>
<path d="M-21 -44 q10 -4 20 0 M8 -40 q9 -4 18 0" stroke="#C2457F" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>
<path d="M-56 -96 q8 -3 16 0 M50 -74 q7 -2 13 1" stroke="#D85A95" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>
<path d="M-50 -10 C-44 -18 30 -24 40 -20" stroke="#B83C78" stroke-width="7" fill="none" stroke-linecap="round" opacity=".18"/>
<path d="M-56 28 C-60 8 -44 -6 -26 -8 L28 -20 C44 -23 54 -10 48 2 C44 9 36 11 26 12 L-28 34 C-42 38 -54 36 -56 28 Z" fill="url(#xSkin3)"/>
<path d="M33 -18 C42 -19 49 -12 48 -5 C45 0 38 0 34 -4 Z" fill="#FFE0EE" opacity=".85"/>
<path d="M-28 44 C-10 52 14 50 32 38" stroke="#C2457F" stroke-width="2" fill="none" stroke-linecap="round" opacity=".4"/>`;
const N18_HORNS_SVG = (function(){
  let s = N_HORNS_SVG.replace('</defs>', N18_DEFS.replace(/id="x/g, 'id="gx')+'</defs>');
  const i = s.indexOf('<g transform="translate(160 176) rotate(-6)">'), k = s.indexOf('<g fill="none" stroke="#FFB3F3"', i);
  if(i<0 || k<0) return N_HORNS_SVG;
  return s.slice(0, i) + '<g transform="translate(160 164) rotate(-5)">' + N18_HORNS.replace(/url\(#x/g, 'url(#gx') + '</g>\n    ' + s.slice(k);
})();
const _n18Night = nightify;
nightify = function(html){
  let h = _n18Night(html);
  if(h.indexOf('n-stage')<0) return h;
  // (the sign-in picture stays the first version: the hand holding up a microphone)
  return h.replace(/<svg class="n-stage n-horns"[\s\S]*?<\/svg>/, ()=>N18_HORNS_SVG);
};

/* ============================================================
   ROUND 19 · Import
   · New / Edit song: Manual · Record · Import (was Upload).
   · Import › From a file: as before (a document or a recording).
   · Import › From a link: paste the address of a web page with the song
     (a chord sheet or lyrics page). Singa's server reads the page and the
     song is made from it, like an uploaded document.
   ============================================================ */
(function(){
  const css = `
.nimp-row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:10px}
.nimp-row .ncap-up{margin-top:0;width:180px;height:150px}
.nimp-link{width:100%;max-width:460px;display:flex;flex-direction:column;gap:10px;margin-top:10px}
.nimp-in{display:flex;gap:8px}
.nimp-in input{flex:1;min-width:0;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#fff;padding:0 16px;font-size:16px;outline:none}
.nimp-in input:focus{border-color:rgba(255,255,255,.6)}
.nimp-go{height:52px;padding:0 20px;border-radius:14px;border:0;background:#fff;color:#2A1250;font-weight:700;font-size:15px;cursor:pointer;flex:none}
.nimp-go[disabled]{opacity:.55;pointer-events:none}
.nimp-err{color:#FFB3C1;font-size:13px;line-height:1.4;text-align:left}
.nimp-back{font-size:13px;color:var(--n-mute);text-decoration:underline;text-underline-offset:3px;cursor:pointer;align-self:center}
@media (max-width:420px){ .nimp-row .ncap-up{width:calc(50% - 7px);height:130px} }
`;
  const st = document.createElement('style'); st.id = 'nightCss19'; st.textContent = css;
  document.head.appendChild(st);
})();
const IMP_SERVER = (typeof LINK_SERVER!=='undefined' && LINK_SERVER) || 'https://singa-production-e6f3.up.railway.app';
// the mode is called Import now
const _n19RenderCreate = renderCreate;
renderCreate = function(){
  return _n19RenderCreate().replace(/(data-act="setCreateMode" data-id="file">)Upload</g, '$1Import<');
};
const _n19SetMode = Actions.setCreateMode;
Actions.setCreateMode = function(d){ if(ST.phase==='idle'){ ST.impLink = false; ST.impErr = ''; } return _n19SetMode.apply(this, arguments); };
const _n19Capture = nCaptureBody;
nCaptureBody = function(d){
  let html = _n19Capture(d);
  if(ST.createMode!=='file') return html;
  const linkOk = ST.step!=='sync';
  if(!linkOk) ST.impLink = false;
  const upRe = /<button class="ncap-up" data-act="startUpload">[\s\S]*?<\/button>/;
  if(ST.impLink){
    const busy = !!ST.impBusy;
    html = html.replace(upRe, ()=>`<div class="nimp-link">
      <form class="nimp-in" onsubmit="event.preventDefault();XActions.impLinkGo()">
        <input id="nimpUrl" type="text" inputmode="url" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Paste the link to a chords or lyrics page" value="${esc(ST.impUrl||'')}" data-bind="impUrl" ${busy?'disabled':''}>
        <button class="nimp-go" type="submit" ${busy?'disabled':''}>${busy?'Reading…':'Import'}</button>
      </form>
      ${ST.impErr ? `<div class="nimp-err">${esc(ST.impErr)}</div>` : ''}
      <span class="nimp-back" data-xact="impLinkBack">Import from a file instead</span>
    </div>`);
    html = html.replace(/<div class="ncap-s">[\s\S]*?<\/div>/, '<div class="ncap-s">Singa reads the page and takes the title, the lyrics and the chords above each word. It works with most chord and lyrics pages, though some sites block it.</div>');
  } else if(linkOk){
    html = html.replace(upRe, ()=>`<div class="nimp-row">
      <button class="ncap-up" data-act="startUpload">${icon('upload_file',36)}<span>From a file</span></button>
      <button class="ncap-up" data-xact="impLinkOpen">${icon('link',36)}<span>From a link</span></button>
    </div>`);
    html = html.replace(/<div class="ncap-s">[\s\S]*?<\/div>/, (m)=>m.replace(/<div class="ncap-s">(\w)/, (x, c)=>'<div class="ncap-s">From a file: '+c.toLowerCase()).replace(/<\/div>$/, ' From a link: a web page with the song’s chords or lyrics.</div>'));
  }
  return html;
};
XActions.impLinkOpen = function(){ if(!canSync()) return; ST.impLink = true; ST.impErr = ''; render(); setTimeout(()=>{ const i = document.getElementById('nimpUrl'); if(i) i.focus(); }, 60); };
XActions.impLinkBack = function(){ if(ST.impBusy) return; ST.impLink = false; ST.impErr = ''; render(); };
Binds.impUrl = function(v){ ST.impUrl = v; if(ST.impErr){ ST.impErr = ''; const e = document.querySelector('.nimp-err'); if(e) e.remove(); } };
function nImpCleanUrl(u){
  u = String(u||'').trim();
  const m = u.match(/https?:\/\/\S+/i);
  if(m) u = m[0];
  else { const d = u.match(/(?:^|\s)((?:[\w-]+\.)+[a-z]{2,}(?:\/\S*)?)/i); if(d) u = 'https://' + d[1]; }
  return u.replace(/[)\].,;]+$/, '');
}
XActions.impLinkGo = async function(){
  if(ST.impBusy || !canSync()) return;
  const inp = document.getElementById('nimpUrl'); if(inp) ST.impUrl = inp.value;
  const url = nImpCleanUrl(ST.impUrl);
  if(!/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)){ ST.impErr = 'Paste the full address of the page — it starts with https://'; render(); return; }
  const editId = ST.editId;
  ST.impBusy = true; ST.impErr = ''; render();
  let j = null, err = '';
  try{
    const r = await fetch(IMP_SERVER + '/fetch-page', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ url }) });
    j = await r.json().catch(()=>null);
    if(!r.ok || !j || !j.text) err = (j && j.error) || (r.status===404 || r.status===405 ? 'Singa’s server isn’t ready for links yet — try again in a few minutes' : 'Couldn’t read that page ('+r.status+')');
  }catch(e){ err = 'Singa’s server didn’t answer — check your connection and try again'; }
  ST.impBusy = false;
  if(ST.screen!=='create' || ST.editId!==editId){ render(); return; }
  if(err){ ST.impErr = err; render(); return; }
  const title = (j.title||'').trim(), artist = (j.artist||'').trim();
  const head = title ? title + '\n' + (artist ? artist + '\n' : '') + '\n' : '';
  const name = (title || (j.site||'web page')).replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80) + '.txt';
  let file;
  try{ file = new File([head + j.text + '\n'], name, { type:'text/plain' }); }
  catch(e){ file = new Blob([head + j.text + '\n'], { type:'text/plain' }); file.name = name; }
  ST.impLink = false; ST.impUrl = ''; ST.impErr = '';
  // one page is one song: straight into the song (no "several songs" question)
  _n18Upload([file]);
};

/* ============================================================
   ROUND 20 · A song with nothing in it yet: artwork in the same
   style as sign-in and "Got it!" (a blank sheet and a pencil)
   ============================================================ */
(function(){
  const st = document.createElement('style'); st.id = 'nightCss20';
  st.textContent = `.n-empty{display:block;width:min(250px,62vw);height:auto;margin:26px auto 4px}
@media(max-height:560px) and (orientation:landscape){ .n-empty{width:150px;margin-top:10px} }`;
  document.head.appendChild(st);
})();
const N20_EMPTY_SVG = `<svg class="n-stage n-empty" viewBox="0 0 320 290" style="overflow:visible">
<defs>
<linearGradient id="eBgL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F01CFF"/><stop offset="1" stop-color="#9418E8"/></linearGradient>
<linearGradient id="eBgR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4524B8"/><stop offset="1" stop-color="#2E1A8C"/></linearGradient>
<pattern id="eStripeH" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="5" fill="#E61CFF"/></pattern>
<pattern id="eStripeV" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="4" height="9" fill="#6E14C8"/></pattern>
<clipPath id="eHalfL"><rect x="0" y="0" width="160" height="290"/></clipPath>
<clipPath id="eHalfR"><rect x="160" y="0" width="160" height="290"/></clipPath>
<linearGradient id="ePaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EBDDFF"/></linearGradient>
<linearGradient id="ePencil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFC27A"/><stop offset=".5" stop-color="#FFD8A8"/><stop offset="1" stop-color="#F2A65A"/></linearGradient>
<linearGradient id="eFadeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0.84" stop-color="#FFFFFF"/><stop offset="1" stop-color="#000000"/></linearGradient>
<mask id="eFade"><rect x="-20" y="-20" width="360" height="330" fill="url(#eFadeG)"/></mask>
</defs>
<g mask="url(#eFade)">
<circle cx="160" cy="150" r="128" fill="url(#eBgL)" clip-path="url(#eHalfL)"/>
<circle cx="160" cy="150" r="128" fill="url(#eBgR)" clip-path="url(#eHalfR)"/>
<circle cx="250" cy="70" r="44" fill="url(#eStripeH)"/>
<circle cx="70" cy="222" r="50" fill="url(#eStripeV)" opacity="0.8"/>
<path d="M30 120C24 92 56 76 84 86C108 96 110 126 90 140C68 154 36 146 30 120Z" fill="#5A0D9E" opacity="0.55"/>
<path d="M214 214C222 190 258 184 276 200C292 216 282 242 258 246C232 250 208 236 214 214Z" fill="#1B0E5C" opacity="0.65"/>
<circle cx="290" cy="146" r="7" fill="#1B0E5C"/><circle cx="40" cy="70" r="6" fill="#E61CFF" opacity="0.8"/>
<g transform="translate(160 156) rotate(-7)">
<rect x="-70" y="-92" width="140" height="180" rx="14" fill="#1B0E5C" opacity=".35" transform="translate(8 10)"/>
<rect x="-70" y="-92" width="140" height="180" rx="14" fill="url(#ePaper)"/>
<rect x="-50" y="-72" width="62" height="10" rx="5" fill="#E61CFF"/>
<rect x="-50" y="-56" width="38" height="7" rx="3.5" fill="#B9A6FF"/>
<g stroke="#C9B6F2" stroke-width="2">
<path d="M-50 -32H50M-50 -24H50M-50 -16H50M-50 -8H50M-50 0H50"/>
</g>
<g stroke="#D9CCF7" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 11">
<path d="M-48 24H48M-48 42H48M-48 60H30"/>
</g>
<circle cx="-30" cy="-12" r="6" fill="#6E14C8" opacity=".18"/>
<path d="M-24 -12V-38" stroke="#6E14C8" stroke-width="2.5" opacity=".18"/>
</g>
<g transform="translate(222 196) rotate(-52)">
<rect x="-12" y="-74" width="24" height="16" rx="4" fill="#FF6B8B"/>
<rect x="-12" y="-60" width="24" height="10" fill="#B9A6FF"/>
<rect x="-12" y="-51" width="24" height="72" fill="url(#ePencil)"/>
<path d="M-12 21L0 46L12 21Z" fill="#FFE7CC"/>
<path d="M-4.5 36.4L0 46L4.5 36.4Z" fill="#2A1250"/>
<path d="M-4 -51V21" stroke="#E8964A" stroke-width="2" opacity=".6"/>
</g>
<g fill="#FFD8F8">
<g transform="translate(70 70) rotate(-12)"><ellipse cx="0" cy="22" rx="9" ry="7"/><rect x="6.5" y="-6" width="3.5" height="28" rx="1.5"/><path d="M8.5 -6c8 4 14 8 12 18c-2-6-6-8-12-9z"/></g>
<g transform="translate(262 112) rotate(10)" opacity=".85"><ellipse cx="0" cy="18" rx="7.5" ry="6"/><ellipse cx="22" cy="12" rx="7.5" ry="6"/><rect x="5.5" y="-8" width="3" height="26" rx="1.5"/><rect x="27.5" y="-14" width="3" height="26" rx="1.5"/><path d="M5.5 -8L30.5 -14V-7L5.5 -1Z"/></g>
</g>
<g fill="#FFD8A8"><path d="M244 36l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M96 246l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>
<g fill="#FFFFFF"><rect x="118" y="30" width="8" height="8" rx="2" opacity=".5"/><rect x="40" y="170" width="7" height="7" rx="1.8" opacity=".4"/></g>
</g>
</svg>`;
const _n20Incomplete = renderIncomplete;
renderIncomplete = function(){
  return _n20Incomplete().replace(/<span class="msi" style="font-size:48px;margin-top:60px;color:#6f6f6f">folder<\/span>/, ()=>N20_EMPTY_SVG);
};

/* ============================================================
   ROUND 21 · "Got it!" screen
   · The song's name is the big title ("No Mercy" / "is being added"),
     shrinking to fit two lines, or "Your song" when it can't fit or
     isn't known yet.
   · When the song is ready while you're still here, the screen says so
     ("has been added", Open the song) instead of a pop-up.
   ============================================================ */
(function(){
  const css = `
.nq-title{font-size:64px;font-weight:800;letter-spacing:-0.03em;line-height:1.08;text-align:center;margin-top:12px;max-width:min(92vw,760px);overflow-wrap:anywhere;color:#fff}
.nq-what{font-size:22px;text-align:center;line-height:1.4;margin-top:8px}
.nq-what.done{color:#9FE3D2;font-weight:700}
.nq-what.fail{color:#FFB3C1;font-weight:700}
.nq-info{font-size:15px;color:var(--n-mute);text-align:center;max-width:360px;line-height:1.5;margin-top:14px}
`;
  const st = document.createElement('style'); st.id = 'nightCss21'; st.textContent = css;
  document.head.appendChild(st);
})();
const _n21Recent = [];                      // jobs started in the last few seconds
const _n21NewJob = newJob;
newJob = function(){ const j = _n21NewJob.apply(this, arguments); _n21Recent.push({ id:j.id, at:Date.now() }); while(_n21Recent.length > 30) _n21Recent.shift(); return j; };
let _n21Q = null;                           // { jobs:Set, songs:Set, done:Set, failed:Set }
function nQOn(){ return ST.screen==='queued' && _n21Q; }
const _n21Render = render;
render = function(){
  if(ST.screen==='queued' && !_n21Q){
    const now = Date.now(), ids = _n21Recent.filter(x=>now - x.at < 6000).map(x=>x.id);
    const jobs = (ST.jobs||[]).filter(j=>ids.includes(j.id));
    _n21Q = { jobs:new Set(jobs.map(j=>j.id)), songs:new Set(jobs.map(j=>j.songId)), done:new Set(), failed:new Set() };
  } else if(ST.screen!=='queued' && _n21Q) _n21Q = null;
  _n21Render();
  if(ST.screen==='queued') nQFit();
};
const _n21Finished = jobFinished;
jobFinished = function(j, songObj){
  if(nQOn() && _n21Q.jobs.has(j.id)){ _n21Q.done.add(j.id); if(songObj) _n21Q.songs.add(songObj.id); _n21Q.mute = Date.now(); }
  return _n21Finished.apply(this, arguments);
};
const _n21Failed = jobFailed;
jobFailed = function(j){
  if(nQOn() && _n21Q.jobs.has(j.id)) _n21Q.failed.add(j.id);
  return _n21Failed.apply(this, arguments);
};
// the screen says it, so no pop-up saying the same
const _n21Toast = toast;
toast = function(msg){
  if(nQOn() && _n21Q.mute && Date.now() - _n21Q.mute < 8000 && /has been added to your songs|has been updated|songs? added from/.test(String(msg||''))) return;
  return _n21Toast.apply(this, arguments);
};
function nQState(){
  const q = _n21Q; if(!q || !q.jobs.size) return 'pending';
  const ended = q.done.size + q.failed.size;
  if(ended < q.jobs.size) return 'pending';
  return q.done.size ? 'done' : 'failed';
}
function nQName(){
  const q = ST.queued || [];
  const docs = q.length===1 && /^(\d+) (documents|files|songs)$/.exec(q[0]||'');
  if(q.length > 1 || docs) return { name: (docs ? docs[1] : q.length) + (ST._queuedMulti || !docs || docs[2]==='songs' ? ' songs' : ' files'), many:true };
  let name = q[0] || '';
  if(_n21Q && _n21Q.songs.size===1){ const s = D.songs[[..._n21Q.songs][0]]; if(s && (s.title||'').trim() && s.title!=='Untitled song') name = s.title.trim(); }
  if(!name || /^(your (recording|document|song|take)|the linked track|untitled song|web page)$/i.test(name)) name = '';
  return { name, many:false };
}
const _n21Queued = renderQueued;
renderQueued = function(){
  let h = _n21Queued();
  const st = nQState(), nm = nQName(), edit = !!ST._queuedEdit;
  const title = nm.name || 'Your song';
  const verb = nm.many
    ? (st==='done' ? 'have been added' : st==='failed' ? "couldn't be added" : 'are being added')
    : (st==='done' ? (edit ? 'has been updated' : 'has been added') : st==='failed' ? (edit ? "couldn't be updated" : "couldn't be added") : (edit ? 'is being adjusted' : 'is being added'));
  const info = st==='done'
    ? (nm.many ? 'They’re ready in your songs.' : 'It’s ready in your songs.')
    : st==='failed'
    ? 'You’ll find it in your songs marked <b style="color:#FFB3C1">FAILED</b> — tap it to see why and try again.'
    : `No need to wait here. We'll let you know when ${nm.many ? "they're" : "it's"} ready — you'll find ${nm.many ? 'them' : 'it'} in your songs marked <b style="color:#2f8fe0">PROCESSING</b>.`;
  h = h.replace(/<div style="font-size:64px[^"]*">Got it!<\/div>\s*<div style="font-size:22px[^"]*">[\s\S]*?<\/div>\s*<div style="font-size:15px[^"]*">[\s\S]*?<\/div>/,
    ()=>`<div class="nq-title" id="nqTitle" data-fallback="${nm.name ? '1' : ''}">${esc(title)}</div>
    <div class="nq-what${st==='done'?' done':st==='failed'?' fail':''}">${verb}</div>
    <div class="nq-info">${info}</div>`);
  if(st==='done' && !nm.many && _n21Q && _n21Q.songs.size===1){
    const id = [..._n21Q.songs][0];
    h = h.replace('<button class="btn btn-grey" style="height:64px" data-act="goHome">Close</button>',
      `<button class="btn btn-dark" style="height:64px" data-act="openSongFrom" data-id="${esc(id)}" data-from="home">Open the song</button><button class="btn btn-grey" style="height:64px" data-act="goHome">Close</button>`)
      .replace('<button class="btn btn-dark" style="height:64px" data-act="newSong">', '<button class="btn btn-grey" style="height:64px" data-act="newSong">');
  }
  return h;
};
// the name in two lines at most: smaller type (down to 22px), else "Your song"
function nQFit(){
  const el = document.getElementById('nqTitle'); if(!el) return;
  const lines = px=>{ el.style.fontSize = px+'px'; const lh = parseFloat(getComputedStyle(el).lineHeight) || px*1.08; return Math.round(el.scrollHeight / lh); };
  let px = 64;
  while(px > 22 && lines(px) > 2) px -= 2;
  if(lines(px) > 2 && el.dataset.fallback){ el.textContent = 'Your song'; el.dataset.fallback = ''; px = 64; while(px > 22 && lines(px) > 2) px -= 2; }
}
window.addEventListener('resize', ()=>{ if(ST.screen==='queued') render(); });

render();

// Round 22 on lives in singa-script-part15.js
(function(){ const sc = document.createElement('script'); sc.src = 'singa-script-part15.js'; document.head.appendChild(sc); })();
