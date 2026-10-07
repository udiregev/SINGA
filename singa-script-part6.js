"use strict";
function renderGigSettingsModal(){
  const g = gigObj(), gs = gigSettings(g);
  const rows = [['photos','Enable audience photos','Guests can share photos to the gig album'],
    ['chat','Enable audience chat','A group chat for everyone at the gig'],
    ['dm','Allow direct messages','Guests can message the band privately'],
    ['browse','Allow audience to browse songs','Guests can see the setlist'],
    ['order','Allow audience to choose songs order','Guest votes reorder the upcoming songs'],
    ['requests','Allow audience to choose songs',"Guests can request songs that aren't on the setlist"]];
  return `<div class="modal-backdrop" data-act="closeGigSettings"><div class="modal" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">Gig settings</span><span class="icon-btn" data-act="closeGigSettings">${icon('close',22)}</span></div>
    <div class="msub" style="margin-bottom:6px">${esc(g.title)}</div>
    ${rows.map(([k,label,sub])=>{ const on=gs[k]; return `<div class="row" style="gap:14px;padding:11px 0;cursor:pointer" data-act="toggleGigSetting" data-id="${k}">
      <div class="toggle" style="flex:none;background:${on?'#1b1b1b':'#fff'}"><div class="dot" style="left:${on?20:2}px;background:${on?'#fff':'#1b1b1b'}"></div></div>
      <div><div style="font-size:15px;font-weight:600">${label}</div><div style="font-size:12px;color:#8a8a8a;margin-top:2px">${sub}</div></div></div>`; }).join('')}
    <button class="btn btn-dark" style="margin-top:14px" data-act="closeGigSettings">Done</button>
  </div></div>`;
}

/* ---- Gig Player ---- */
function queueFor(g){
  const gs = gigSettings(g);
  const played = ST.played.filter(id=>g.setlist.includes(id));
  const rest = g.setlist.filter(id=>!played.includes(id));
  const cur = ST.gigCur && rest.includes(ST.gigCur) ? ST.gigCur : null;
  let up = rest.filter(id=>id!==cur);
  if(gs.order) up = up.map((id,i)=>({id,i,v:ST.orderVotes[id]||0})).sort((a,b)=>b.v-a.v||a.i-b.i).map(x=>x.id);
  const cued = cur || up[0] || null;
  if(!cur && cued) up = up.slice(1);
  return { played, cued, up };
}
function gigSongId(){ const q = queueFor(gigObj()); return q.cued || gigObj().setlist[0]; }
function openPlayer(id){
  stopOnsetListening();
  const g = gigObj(); const fresh = ST._liveGig !== g.id;
  ST.screen='gigplayer'; ST.ctx='gig'; ST._liveGig=g.id;
  joinGigChannel(g.id);
  ST.gigCur = id || (fresh ? null : ST.gigCur);
  ST.played = fresh ? [] : (id ? ST.played.filter(x=>x!==id) : ST.played);
  ST.t=0; ST.playing=false; ST.vcd=0; ST.gListening=false;
}

function renderGigPlayer(){
  const g = gigObj();
  const gq = queueFor(g), gs = gigSettings(g);
  const isCollab = !g.mine;
  const gStarted = ST.playing || ST.t>0;
  const curId = gigSongId();
  const s = song(curId);
  const tm = timing(s);
  const ci = curWord(tm, ST.t);
  const seq = chordSeq(s);
  const chord = chordAt(s,tm,Math.max(ci,0)) || (seq[0]||{}).ch;
  const next = (seq.find(x=>x.k>ci && x.ch!==chord)||{}).ch;
  const hasInst = ST.instrument!=='none';
  const gigShowChords = hasInst || isCollab;
  const dia = diagram(chord, next || (seq[0]||{}).ch, isCollab ? (ST.part==='Keys'?'piano':'guitar') : ST.instrument);
  const gigHasLyrics = !!(s.lyrics && s.lyrics.trim());
  const lines = gigHasLyrics ? buildLines(s, gStarted?'play':'view', { t: gStarted?ST.t:null, selChord: chord, hideChords: !isCollab && !hasInst }) : [];

  const qRow = (id, kind) => {
    const x = song(id), isCur = kind==='cur';
    const tag = isCur ? (ST.playing?'NOW PLAYING':(gStarted?'PAUSED':(ST.gListening?'LISTENING':'UP NEXT'))) : '';
    const tagCol = isCur && (ST.playing||ST.gListening) ? '#f24822' : '#8a8a8a';
    const col = kind==='played' ? '#b0b0b0' : '#1b1b1b';
    const subCol = kind==='played' ? '#c4c4c4' : (isCur?'#1b1b1b':'#8a8a8a');
    const iconName = kind==='played' ? 'check' : (isCur ? (ST.playing?'pause':'play_arrow') : '');
    const hasVotes = kind==='up' && gs.order && (ST.orderVotes[id]||0)>0;
    return `<div class="row" style="gap:8px;padding:12px 0;border-bottom:1px solid var(--b2);cursor:pointer;justify-content:space-between" data-act="startGig" data-id="${id}">
      <div style="min-width:0;flex:1">
        ${isCur?`<div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:${tagCol};margin-bottom:3px">${tag}</div>`:''}
        <div style="font-size:14px;font-weight:${isCur?700:400};color:${col};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.title||'Untitled song')}</div>
        <div style="font-size:11px;color:${subCol};font-weight:${isCur?600:400};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.sub)}</div>
      </div>
      ${hasVotes?`<span style="font-size:11px;font-weight:700;color:#6f6f6f;display:flex;align-items:center">${icon('arrow_drop_up',16)}${ST.orderVotes[id]||0}</span>`:''}
      <span style="color:${kind==='played'?'#c4c4c4':'#1b1b1b'}">${iconName?icon(iconName,18):''}</span>
    </div>`;
  };
  let queueHTML = '';
  if(gq.cued) queueHTML += qRow(gq.cued,'cur');
  gq.up.forEach(id=> queueHTML += qRow(id,'up'));
  if(gq.played.length){ queueHTML += `<div style="font-size:11px;font-weight:800;letter-spacing:.08em;color:#9a9a9a;padding:22px 0 6px">PLAYED</div>`; gq.played.forEach(id=> queueHTML += qRow(id,'played')); }

  const guestCount = 23 + ' guests';
  const chordScale = Math.max(0.55, Math.min(1.9, ST.chordH/230));
  const hint = !gigHasLyrics ? 'Tap another song to continue' : (ST.playing ? 'Tap the song in the list to pause' : (gStarted ? 'Paused · tap the song to resume' : (ST.startMode==='countdown' ? 'Tap a song in the list to start · 3-2-1 countdown' : 'Tap a song in the list to start listening')));

  return `<div class="gigplayer-grid">
    <div class="gigplayer-side">
      <div class="row" style="gap:8px">
        <span class="icon-btn" data-act="exitGig">${icon('chevron_left',24)}</span>
        <span style="background:#f24822;color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;padding:3px 6px;border-radius:4px">LIVE</span>
        <span style="font-size:12px;color:#6f6f6f;display:flex;align-items:center;gap:3px">${icon('group',16)}${guestCount}</span>
      </div>
      <div style="font-size:18px;font-weight:700;line-height:1.25;margin:22px 16px 18px 0">${esc(g.title)}</div>
      <div style="flex:1;min-height:0;overflow:auto">${queueHTML}</div>
    </div>
    <div style="padding:20px clamp(16px,4vw,48px) 20px;display:flex;flex-direction:column;min-height:0;position:relative;flex:1">
      <div>
        <div style="font-size:26px;font-weight:700;letter-spacing:-0.01em">${esc(s.title||'Untitled song')}</div>
        <div style="font-size:14px;color:#6f6f6f;margin-top:4px">${esc(s.sub)}</div>
        ${s.by?`<div class="row" style="gap:6px;font-size:13px;margin-top:8px">${icon('account_circle',18)}added by ${esc(s.by)}</div>`:''}
      </div>
      ${gigHasLyrics ? `
        ${gigShowChords ? `<div style="height:${Math.round(ST.chordH)}px;display:flex;align-items:center;justify-content:center;overflow:hidden">
          <div style="display:flex;flex-direction:column;align-items:center;gap:14px;transform:scale(${chordScale})">${diagramHTML(dia)}
            <button class="link" style="display:flex;align-items:center;gap:6px" data-act="playSample">${icon(ST.sampling?'stop_circle':'play_circle',22)}${ST.sampling?'Stop sample':'Play Sample'}</button>
          </div></div>
        <div class="row" style="justify-content:center;cursor:ns-resize;height:30px">${icon('drag_handle',26)}</div>` : ''}
        <div style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;align-items:center;padding:16px 0 30%">${linesHTML(lines)}</div>
      ` : `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#6f6f6f">
          ${icon('lyrics',40)}
          <div style="font-size:16px;font-weight:600;color:#1b1b1b">No synced take for this song yet</div>
          <div style="font-size:13px;text-align:center">Guests see "Up next" until you move on. Tap the next song to continue.</div>
        </div>`}
      ${isCollab ? `<div style="border:1px solid #e6e6e6;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;margin-top:10px">
          ${icon('edit_note',24)}<div style="flex:1;font-size:12px;color:#6f6f6f;line-height:1.4"><span style="font-weight:700;color:#1b1b1b">You're a collaborator on this gig.</span> Your own chords and notes are layered on the owner's track. Only you see them.</div>
          <button class="btn btn-outline btn-sm" data-act="editPart">Edit my part</button>
        </div>` : ''}
      <div style="min-height:64px;display:flex;align-items:center;justify-content:center;padding-top:8px">
        ${ST.gListening ? `<div class="row" style="gap:12px;cursor:pointer" data-act="gigHeard">${icon('mic',30)}<div><div style="font-size:16px;font-weight:600">Listening… playback starts the moment you sing</div><div style="font-size:12px;color:#8a8a8a;margin-top:3px">Tap here to start it manually instead</div></div></div>`
        : `<div style="font-size:13px;color:#8a8a8a;display:flex;align-items:center;gap:6px">${icon('touch_app',18)}${hint}</div>`}
      </div>
    </div>
  </div>
  ${ST.vcd>0?`<div class="modal-backdrop" style="background:rgba(255,255,255,.75);font-size:180px;font-weight:800">${Math.max(1,Math.ceil(ST.vcd))}</div>`:''}`;
}
/* ============================================================
   MODALS: Upgrade / Picker / New / Collaborator editor
   ============================================================ */
function renderUpgradeModal(){
  return `<div class="modal-backdrop" data-act="closeUpgrade"><div class="modal" style="max-width:520px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">Choose your plan</span><span class="icon-btn" data-act="closeUpgrade">${icon('close',22)}</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="border:1.5px solid #e2e2e2;border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:6px">
        <div style="font-size:17px;font-weight:700">Free</div><div style="font-size:26px;font-weight:800">$0</div><div style="font-size:12px;color:#8a8a8a">Your current plan</div>
      </div>
      <div style="border:2px solid #f24822;border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:6px">
        <div style="font-size:17px;font-weight:700;display:flex;align-items:center;gap:4px">${icon('bolt',20)}RockStar</div>
        <div style="font-size:26px;font-weight:800">$4.99<span style="font-size:13px;font-weight:600;color:#6f6f6f"> / month</span></div>
        <div style="font-size:12px;color:#8a8a8a">Billed monthly. Cancel anytime.</div>
      </div>
    </div>
    <div style="font-size:13px;color:#8a8a8a;border:1px dashed #d4d4d4;border-radius:10px;padding:14px;text-align:center">RockStar features will be listed here.</div>
    <button class="btn btn-accent" data-act="doUpgrade">Upgrade to RockStar</button>
  </div></div>`;
}

function renderPickerModal(){
  const pick = ST.pick, sp = ST.songPick;
  let heading, sub, rows, hasSearch=false, hasNew=false, newLabel='', closeAct, query='';
  if(sp){
    const isPl = sp.kind==='playlist';
    const target = isPl ? D.playlists.find(p=>p.id===sp.id) : D.gigs.find(g=>g.id===sp.id);
    const ids = target ? (isPl?target.ids:target.setlist) : [];
    const q = (ST.spQuery||'').trim().toLowerCase();
    heading = 'Add songs'; sub = target?target.title:''; hasSearch=true; query = ST.spQuery||'';
    rows = D.order.filter(id=>{ const x=song(id); return !q || ((x.title||'')+' '+(x.sub||'')).toLowerCase().includes(q); })
      .map(id=>{ const x=song(id), on=ids.includes(id); return `<div class="row" style="gap:14px;padding:12px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" data-act="toggleSongPick" data-id="${id}"><span style="width:22px;height:22px;flex:none;border-radius:6px;border:1.5px solid var(--fg);background:${on?'#1b1b1b':'#fff'};color:#fff;display:flex;align-items:center;justify-content:center">${on?icon('check',16):''}</span><div style="min-width:0"><div style="font-size:15px;font-weight:600">${esc(x.title||'Untitled song')}</div><div style="font-size:12px;color:#8a8a8a;margin-top:2px">${esc(x.sub||(x.synced?'':'Draft'))}</div></div></div>`; }).join('');
    closeAct = 'closeSongPick';
  } else if(pick){
    const isPl = pick.kind==='playlist', sid = pick.songId;
    heading = isPl ? 'Add to playlist' : 'Add to a gig'; sub = song(sid).title || 'Untitled song'; hasNew = true; newLabel = isPl?'New playlist':'New gig';
    if(isPl){
      rows = D.playlists.filter(p=>!p.auto).map(p=>{ const on=p.ids.includes(sid); return `<div class="row" style="gap:14px;padding:12px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" data-act="togglePickPlaylist" data-id="${p.id}"><span style="width:22px;height:22px;flex:none;border-radius:6px;border:1.5px solid var(--fg);background:${on?'#1b1b1b':'#fff'};color:#fff;display:flex;align-items:center;justify-content:center">${on?icon('check',16):''}</span><div><div style="font-size:15px;font-weight:600">${esc(p.title)}</div><div style="font-size:12px;color:#8a8a8a;margin-top:2px">${p.ids.length} songs</div></div></div>`; }).join('');
    } else {
      rows = D.gigs.map(g=>{ const on=g.setlist.includes(sid); return `<div class="row" style="gap:14px;padding:12px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" data-act="togglePickGig" data-id="${g.id}"><span style="width:22px;height:22px;flex:none;border-radius:6px;border:1.5px solid var(--fg);background:${on?'#1b1b1b':'#fff'};color:#fff;display:flex;align-items:center;justify-content:center">${on?icon('check',16):''}</span><div><div style="font-size:15px;font-weight:600">${esc(g.title)}</div><div style="font-size:12px;color:#8a8a8a;margin-top:2px">${esc(g.date)} · ${g.setlist.length} songs</div></div></div>`; }).join('');
    }
    closeAct = 'closePick';
  }
  return `<div class="modal-backdrop" data-act="${closeAct}"><div class="modal" style="max-width:440px" onclick="modalClick(event)">
    <div class="mhead"><span style="font-size:21px;font-weight:600">${esc(heading)}</span><span class="icon-btn" data-act="${closeAct}">${icon('close',22)}</span></div>
    <div class="msub">${esc(sub)}</div>
    ${hasSearch?`<div class="search-field" style="margin-bottom:6px"><input placeholder="Search your songs" value="${esc(query)}" data-bind="spQuery">${icon('search',20)}</div>`:''}
    <div style="max-height:380px;overflow:auto">${rows}</div>
    ${hasNew?`<a class="link" style="display:flex;align-items:center;gap:6px;margin-top:8px" data-act="openNew" data-id="${heading==='Add to playlist'?'playlist':'gig'}">${icon('add',20)}${newLabel}</a>`:''}
    <button class="btn btn-dark" style="margin-top:14px" data-act="${closeAct}">Done</button>
  </div></div>`;
}
