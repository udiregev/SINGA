"use strict";
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
function renderAccount(){
  const planName = ST.plan==='rockstar' ? 'RockStar' : 'Free';
  const planSub = ST.plan==='rockstar' ? '$4.99 / month · renews Nov 2, 2026' : 'Basic features for performing with Singa';
  const planBadgeBg = ST.plan==='rockstar' ? '#f24822' : '#ececec';
  const planBadgeCol = ST.plan==='rockstar' ? '#fff' : '#6f6f6f';
  const collabRows = D.collabs.map((c,i)=>`<div class="list-row" data-act="editCollab" data-id="${i}"><div><div class="t">${esc(c.name)}</div><div class="s">${c.gigs.length} ${c.gigs.length===1?'gig':'gigs'}</div></div>${icon('chevron_right',22)}</div>`).join('');
  const instRadio = INSTS.map(([v,label])=>`<div class="row" style="gap:8px;cursor:pointer;padding:6px 0" data-act="setInstrument" data-id="${v}">
    <span style="width:20px;height:20px;border-radius:50%;border:1.5px solid var(--fg);display:flex;align-items:center;justify-content:center"><span style="width:10px;height:10px;border-radius:50%;background:var(--fg);opacity:${ST.instrument===v?1:0}"></span></span>
    <span style="font-size:15px;font-weight:600">${label}</span></div>`).join('');
  const startHint = ST.startMode==='countdown' ? 'Press play and Singa counts down from 3.' : 'Singa listens and starts playback when you start singing.';
  const notifRows = [['req','Song requests'],['photos','Guest photos'],['chat','Chat messages']].map(([k,label])=>{
    const on = ST.notif[k];
    return `<div class="row" style="gap:14px;padding:10px 0;cursor:pointer" data-act="toggleNotif" data-id="${k}">
      <div class="toggle" style="background:${on?'#1b1b1b':'#fff'}"><div class="dot" style="left:${on?20:2}px;background:${on?'#fff':'#1b1b1b'}"></div></div>
      <span style="font-size:15px;font-weight:600">${label}</span></div>`;
  }).join('');
  return `<div class="scr" style="overflow:auto;gap:30px;padding-bottom:60px">
    <div class="row" style="gap:14px"><span class="icon-btn" data-act="nav" data-to="home">${icon('chevron_left',26)}</span><span style="font-size:28px;font-weight:700">My Account</span></div>
    <div class="row" style="align-items:flex-start;gap:28px">
      <div style="flex:1;min-width:0">
        <div style="font-size:21px;font-weight:700;margin-bottom:6px">Account Details</div>
        <div style="padding:14px 0;border-bottom:1px solid var(--b2);display:flex;justify-content:space-between;align-items:center;cursor:pointer" data-act="editNickname"><div><div style="font-size:12px;color:#8a8a8a">Nickname</div><div style="font-size:16px;font-weight:600;margin-top:3px">${esc(ST.nickname || nicknameFromEmail(ST.email))}</div></div>${icon('chevron_right',22)}</div>
        <div style="padding:14px 0;border-bottom:1px solid var(--b2)"><div style="font-size:12px;color:#8a8a8a">Email</div><div style="font-size:16px;font-weight:600;margin-top:3px">${esc(ST.email || 'Not signed in')}</div></div>
      </div>
      <div class="account-avatar-col" style="flex:none;flex-direction:column;align-items:center;gap:10px;width:140px">
        <div style="width:96px;height:96px;border-radius:50%;overflow:hidden;background:#ececec;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#8a8a8a">
          ${ST.avatarUrl ? `<img src="${esc(ST.avatarUrl)}" style="width:100%;height:100%;object-fit:cover" alt="">` : esc((ST.nickname||nicknameFromEmail(ST.email)||'?').charAt(0).toUpperCase())}
        </div>
        <a class="link" style="font-size:13px" data-act="pickAvatar">Change photo</a>
      </div>
    </div>
    <div>
      <div style="font-size:21px;font-weight:700;margin-bottom:6px">Subscription</div>
      <div class="row" style="justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid var(--b2)">
        <div><div class="row" style="gap:8px"><span style="font-size:16px;font-weight:700">${planName}</span><span style="font-size:11px;font-weight:800;letter-spacing:.06em;padding:3px 7px;border-radius:5px;background:${planBadgeBg};color:${planBadgeCol}">CURRENT</span></div><div style="font-size:13px;color:#8a8a8a;margin-top:3px">${planSub}</div></div>
        ${ST.plan!=='rockstar'
          ? `<button class="btn btn-accent btn-sm" data-act="openUpgrade">${icon('bolt',20)}Upgrade to RockStar</button>`
          : `<a class="link link-muted" style="text-decoration:underline" data-act="downgrade">Switch to Free</a>`}
      </div>
    </div>
    <div>
      <div style="font-size:21px;font-weight:700;margin-bottom:6px">Collaborators</div>
      ${collabRows}
      <a class="link" style="display:inline-flex;align-items:center;gap:6px;margin-top:12px" data-act="newCollab">${icon('person_add',20)}Add collaborator</a>
    </div>
    <div>
      <div style="font-size:21px;font-weight:700;margin-bottom:10px">Default instrument</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap">${instRadio}</div>
    </div>
    <div>
      <div style="font-size:21px;font-weight:700;margin-bottom:6px">Start playback with</div>
      <div style="font-size:13px;color:#8a8a8a;margin-bottom:14px">${startHint}</div>
      <div class="seg">
        <button class="${ST.startMode==='countdown'?'on':''}" data-act="setStartMode" data-id="countdown">Countdown</button>
        <button class="${ST.startMode==='detect'?'on':''}" data-act="setStartMode" data-id="detect">Start detection</button>
      </div>
    </div>
    <div>
      <div style="font-size:21px;font-weight:700;margin-bottom:10px">Notify me during gigs</div>
      ${notifRows}
    </div>
    <div>
      <div style="font-size:21px;font-weight:700;margin-bottom:6px">App</div>
      <div class="row" style="justify-content:space-between;gap:16px;padding:14px 0">
        <div><div style="font-size:15px;font-weight:600">Reinstall latest version</div><div style="font-size:13px;color:#8a8a8a;margin-top:3px">Use this if the app looks out of date after an update</div></div>
        <button class="btn btn-outline btn-sm" data-act="rebootApp">${icon('refresh',20)}Reinstall</button>
      </div>
    </div>
    <a class="link link-accent" data-act="signOut">Sign out</a>
  </div>`;
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
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:40px">
    <div style="font-size:22px;font-weight:700">Applying magic…</div>
    <div style="width:300px;height:8px;border-radius:4px;background:#e6e6e6;overflow:hidden"><div style="height:100%;width:${Math.round(ST.procPct)}%;background:#1b1b1b;border-radius:4px"></div></div>
    <div style="font-size:14px;color:#6f6f6f">${esc(ST.procNote) || STAGES[Math.min(3,Math.floor(ST.procPct/25))]}</div>
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
// Practice follows along with the lyrics (same scrolling 4-line window as
// Record) without saving a take — no mic, no waveform, just a clock and a
// Stop button. Lyrics scroll karaoke-paced but no line bolds yet; that only
// happens once there's a real recorded-and-aligned take to play back.
function practiceBlock(){
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:20px">
    <div style="font-size:14px;color:#6f6f6f;text-align:center">Practicing — follow along with the lyrics. Nothing is being recorded.</div>
    <div style="font-size:14px;color:#6f6f6f;font-variant-numeric:tabular-nums">${fmtTime(ST.recT)}</div>
    <button class="btn btn-outline" style="width:170px" data-act="stopPractice">Stop</button>
  </div>`;
}

function renderManualLyrics(d){
  const hasLyrics = !!d.lyrics.trim();
  return `<div style="width:100%;flex:1;display:flex;flex-direction:column;gap:14px;margin-top:28px;max-width:640px;margin-left:auto;margin-right:auto">
    <div class="row" style="gap:14px">
      <input class="ipt" style="height:64px;font-size:18px;font-weight:600" placeholder="Title" value="${esc(d.title)}" data-bind="draftTitle">
      <button class="icon-btn" title="Find similar titles" style="width:48px;height:48px" data-act="openSimilar">${icon('search',26)}</button>
    </div>
    <input class="ipt" style="height:64px" placeholder="Sub title — artist, version" value="${esc(d.sub)}" data-bind="draftSub">
    <textarea class="ipt" style="min-height:300px;font-size:18px" placeholder="Type or paste lyrics, one line per row" data-bind="draftLyrics">${esc(d.lyrics)}</textarea>
    ${confirmFootnote()}
    <div class="row" style="gap:12px;align-self:center">
      <button class="btn btn-outline" style="width:170px;height:48px" data-act="abortCreate">Abort</button>
      <button class="btn ${hasLyrics?'btn-dark':'btn-disabled'}" style="width:170px;height:48px" data-act="lyricsNext">Next</button>
    </div>
  </div>`;
}

function splitChordStr(ch){
  const m = /^([A-G][#b]?)(.*)$/.exec(ch||'');
  return m ? { root: m[1], q: m[2] } : { root: ch||'', q: '' };
}
function recordRecentChord(ch){
  if(!ch) return;
  ST.recentChords = [ch, ...ST.recentChords.filter(c=>c!==ch)].slice(0,8);
}
function chordTileHTML(rt, q, label){
  const on = rt===ST.selRoot && q===ST.selSuffix;
  return `<button style="height:48px;border-radius:12px;border:1.5px solid var(--fg);background:${on?'#1b1b1b':'#fff'};color:${on?'#fff':'#1b1b1b'};font-size:17px;font-weight:700;padding:0 16px;white-space:nowrap" data-act="pickVariant" data-root="${esc(rt)}" data-q="${esc(q)}">${esc(label!=null?label:rt+q)}</button>`;
}
