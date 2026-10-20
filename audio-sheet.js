// ============================================================
// Singa — audio → chord sheet
// Pure functions (no DOM) so the same code runs in the browser page and in
// Node tests. Input: chord segments from the AI chord server + word
// timestamps from Whisper. Output: a chord sheet (sections → lines → words
// with a chord on the word where the chord changes), optionally shown with a
// capo so the shapes match what a guitarist would actually play.
// ============================================================

export const PCS_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const PCS_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const PC_INDEX = { C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,F:5,'E#':5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11 };

// "B:maj" / "G#:min" / "Bm" / "B7" / "N"  ->  {root:11, quality:'', ext:''} or null
export function parseChord(label){
  if(!label || label==='N' || label==='X') return null;
  let m = /^([A-G][#b]?):(maj|min)$/.exec(label);
  if(m) return { root: PC_INDEX[m[1]], minor: m[2]==='min', seventh: false };
  m = /^([A-G][#b]?)(m(?!aj))?(7)?$/.exec(label);
  if(m) return { root: PC_INDEX[m[1]], minor: !!m[2], seventh: !!m[3] };
  return null;
}

// Keys that conventionally use flats (major tonic pitch classes F, Bb, Eb, Ab, Db, Gb).
const FLAT_MAJOR_KEYS = new Set([5,10,3,8,1,6]);
export function chordName(c, keyTonic){
  if(!c) return 'N';
  const k=((keyTonic%12)+12)%12, r=((c.root%12)+12)%12;
  const iv=((r-k)%12+12)%12;
  // Flat keys spell with flats; in sharp keys, chords borrowed from the
  // minor (bIII, bVI, bVII) and bII are still spelled as flats (Bb in D, not A#).
  const useFlat = FLAT_MAJOR_KEYS.has(k) || iv===1 || iv===3 || iv===8 || iv===10;
  return (useFlat?PCS_FLAT:PCS_SHARP)[r] + (c.minor?'m':'') + (c.seventh?'7':'');
}

// ------------------------------------------------------------
// 1. Clean the raw chord timeline: drop "no chord", absorb blips that are
//    too short to be a real chord change into their neighbours, merge
//    repeats. The AI model is already smooth, but sub-beat blips still
//    happen where a vocal note colours the harmony.
// ------------------------------------------------------------
export function cleanChords(raw, minDur=0.7){
  let segs = raw.map(s=>({ start:+s.start, end:+s.end, c: parseChord(s.label) }))
                .filter(s=>s.c && s.end>s.start);
  const same = (a,b)=>a.c.root===b.c.root && a.c.minor===b.c.minor && a.c.seventh===b.c.seventh;
  const merge = (list)=>{
    const out=[];
    list.forEach(s=>{
      const p=out[out.length-1];
      if(p && same(p,s) && s.start-p.end < 1.0){ p.end=s.end; }
      else out.push({...s});
    });
    return out;
  };
  segs = merge(segs);
  // Absorb short blips: give the time to the longer neighbour.
  let changed=true;
  while(changed){
    changed=false;
    for(let i=0;i<segs.length;i++){
      const s=segs[i];
      if(s.end-s.start >= minDur) continue;
      const prev=segs[i-1], next=segs[i+1];
      const target = !prev ? next : !next ? prev : ((prev.end-prev.start)>=(next.end-next.start)?prev:next);
      if(!target) continue;
      if(target===prev) prev.end = s.end; else next.start = s.start;
      segs.splice(i,1); changed=true; break;
    }
    if(changed) segs = merge(segs);
  }
  return segs;
}

// ------------------------------------------------------------
// 2. Key detection from chord durations. Each candidate major key scores
//    how much of the song's time is spent on chords that belong to it,
//    weighted by how central the chord is (I, V, IV, vi most).
// ------------------------------------------------------------
const DIATONIC = [ // [interval from tonic, minor?, weight]
  [0,false,1.0],[7,false,0.9],[5,false,0.85],[9,true,0.75],[2,true,0.6],[4,true,0.55],
  [4,false,0.25],[2,false,0.2],[9,false,0.15],[10,false,0.2] // common borrowed / secondary chords
];
export function detectKey(segs){
  let best={tonic:0,score:-1};
  for(let t=0;t<12;t++){
    let score=0;
    segs.forEach(s=>{
      const iv=((s.c.root-t)%12+12)%12;
      const hit=DIATONIC.find(([i,m])=>i===iv && m===s.c.minor);
      if(hit) score += (s.end-s.start)*hit[2];
    });
    if(score>best.score) best={tonic:t,score};
  }
  return best.tonic; // major tonic pitch class
}

// ------------------------------------------------------------
// 3. Dominant sevenths. The AI model only knows major/minor triads, so a
//    B7 comes back as plain "B". In pop harmony a major chord built on the
//    3rd, 6th or 7th degree of the key is almost always a secondary
//    dominant (V7 of the next chord), so it is shown as a 7th. That is a
//    music-theory rule, not something heard — labelled as such in the UI.
// ------------------------------------------------------------
export function addSecondaryDominantSevenths(segs, tonic){
  return segs.map(s=>{
    const iv=((s.c.root-tonic)%12+12)%12;
    if(!s.c.minor && (iv===4 || iv===9 || iv===11)) return { ...s, c:{...s.c, seventh:true} };
    return s;
  });
}

// ------------------------------------------------------------
// 4. Capo. Guitar sheets for songs in "hard" keys (B, Eb, F#…) are almost
//    always written with a capo so the shapes are open chords. Try capo
//    0–7 and pick the position whose shapes are easiest, with a small
//    penalty per fret so we don't capo for nothing.
// ------------------------------------------------------------
const EASY_SHAPES = new Set(['C','D','E','G','A','Am','Em','Dm','E7','A7','D7','G7','B7','C7']);
const OK_SHAPES   = new Set(['F','Bm','Fmaj7','Cadd9','F#m','Bb']);
export function chooseCapo(segs, tonic){
  let best={capo:0,score:-Infinity};
  for(let capo=0;capo<=7;capo++){
    let score=0;
    segs.forEach(s=>{
      const name=chordName({ ...s.c, root:s.c.root-capo }, tonic-capo);
      const d=s.end-s.start;
      score += EASY_SHAPES.has(name) ? d : OK_SHAPES.has(name) ? d*0.45 : 0;
    });
    const total = segs.reduce((a,s)=>a+(s.end-s.start),0) || 1;
    score = score/total - capo*0.015;
    if(score>best.score) best={capo,score};
  }
  return best.capo;
}

// ------------------------------------------------------------
// 5. Lines. Whisper returns a flat word stream. Break it into sung lines
//    at pauses (and at a sensible maximum length), which is how a chord
//    sheet's lines are laid out.
// ------------------------------------------------------------
// Whisper transcribes a song in overlapping 30-second chunks, and the
// chunk-stitching in transformers.js returns the overlap TWICE (the same
// words again with earlier timestamps — e.g. a whole chorus line repeated,
// once as "bed" and once as "pain"). Sort by time and drop those repeats,
// keeping the first chunk's version.
export function cleanWords(words){
  const ws = (words||[])
    .map((w,idx)=>({ idx, text:String(w.text||'').trim(), start:w.start, end:w.end==null?w.start:w.end }))
    .filter(w=>w.text && w.start!=null && !/^\[.*\]?$/.test(w.text) && !/^_?[A-Z_]+\]$/.test(w.text) && !/^[♪\s]+$/.test(w.text) && !/^\(.*\)$/.test(w.text));
  ws.forEach(w=>{ if(!(w.end>=w.start)) w.end = w.start; if(w.end-w.start>1.6) w.end = w.start+1.6; });
  ws.sort((a,b)=> a.start-b.start || a.idx-b.idx);
  const norm = t=>t.toLowerCase().replace(/[^a-z0-9']/g,'');
  const kept=[];
  ws.forEach(w=>{
    const recent = kept.slice(-5);
    const dup = recent.some(k=>
      (norm(k.text)===norm(w.text) && Math.abs(k.start-w.start)<=0.5) ||
      (Math.abs(k.start-w.start)<0.12 && Math.abs(k.end-w.end)<0.25 && Math.abs(k.idx-w.idx)>3)
    );
    if(!dup) kept.push(w);
  });
  return kept.map(({idx,...w})=>w);
}
const NOT_LINE_START = /^(I|I'm|I'll|I'd|I've|[A-Z0-9]{2,}[,.!?]?)$/; // "I", acronyms like TV / MTV / P90X
function startsLyricLine(w){ return /^['"(]?[A-Z]/.test(w.text) && !NOT_LINE_START.test(w.text.replace(/^['"(]+/,'')); }
// Whisper writes lyrics with a capital letter at the start of each sung
// line, which is a far more reliable line marker than pause length alone.
export function splitLines(words, { maxWords=12, minWords=2, longPause=0.9 }={}){
  const lines=[]; let cur=[];
  words.forEach((w,i)=>{
    const prev=words[i-1];
    const pause = prev ? (w.start - prev.end) : 0;
    const brk = cur.length && (
      (startsLyricLine(w) && cur.length>=minWords) ||
      (pause>=longPause && cur.length>=2) ||
      pause>=2.0
    );
    if(brk){ lines.push(cur); cur=[]; }
    else if(cur.length>=maxWords){
      // too long: split at the biggest pause inside it rather than mid-phrase
      let at=-1, best=-1;
      for(let k=2;k<cur.length-1;k++){ const p=cur[k].start-cur[k-1].end; if(p>best){ best=p; at=k; } }
      if(at>0){ lines.push(cur.slice(0,at)); cur=cur.slice(at); } else { lines.push(cur); cur=[]; }
    }
    cur.push(w);
  });
  if(cur.length) lines.push(cur);
  // fold a dangling 1-word line into its neighbour when they're sung together
  for(let i=lines.length-1;i>0;i--){
    const a=lines[i-1], b=lines[i];
    if(b.length===1 && b[0].start - a[a.length-1].end < 0.6){ a.push(...b); lines.splice(i,1); }
  }
  return lines;
}

// ------------------------------------------------------------
// 6. Put each chord CHANGE on the word sung when it happens (or the word
//    it anticipates). Chords that change where nobody is singing become
//    instrumental chord lines between the lyric lines.
// ------------------------------------------------------------
export function placeChords(lines, segs, { anticipate=0.45 }={}){
  const flat=[]; lines.forEach((ln,li)=>ln.forEach((w,wi)=>flat.push({w,li,wi})));
  const placed = lines.map(ln=>ln.map(()=>null));
  const instrumental=[]; // {afterLine, chords:[]}
  segs.forEach(s=>{
    // The word whose onset is closest to the chord change, within a window
    let bestIdx=-1, bestD=Infinity;
    flat.forEach((f,i)=>{
      const d = f.w.start - s.start;
      // allow the chord to land slightly after a word started (singer ahead
      // of the beat) or a bit before the word (chord anticipates the word)
      if(d > -0.25 && d < anticipate + 0.6 && Math.abs(d) < bestD){ bestD=Math.abs(d); bestIdx=i; }
    });
    if(bestIdx<0){
      // change happened mid-word: use the word being sung
      const inside = flat.findIndex(f=>f.w.start<=s.start && f.w.end>s.start);
      if(inside>=0) bestIdx=inside;
    }
    if(bestIdx>=0){
      const {li,wi}=flat[bestIdx];
      if(!placed[li][wi]) placed[li][wi]=s;
      else if(wi+1<placed[li].length && !placed[li][wi+1]) placed[li][wi+1]=s;
      else if(wi>0 && !placed[li][wi-1]){ placed[li][wi-1]=placed[li][wi]; placed[li][wi]=s; }
      else placed[li][wi]=s; // no room left: the later change wins
    } else {
      const afterLine = flat.filter(f=>f.w.end<=s.start).reduce((a,f)=>Math.max(a,f.li),-1);
      let slot=instrumental.find(x=>x.afterLine===afterLine);
      if(!slot){ slot={afterLine,chords:[]}; instrumental.push(slot); }
      slot.chords.push(s);
    }
  });
  // A line that starts mid-chord gets that chord shown on its first word,
  // as chord sheets do (otherwise a line can look like it has no chord).
  lines.forEach((ln,li)=>{
    if(placed[li][0] || placed[li][1]) return; // a change right at the start already says it
    const t=ln[0].start;
    const active=segs.find(s=>s.start<=t && s.end>t);
    if(active) placed[li][0]=active;
  });
  // Drop a chord that merely repeats the previous chord within the same line.
  lines.forEach((ln,li)=>{
    let last=null;
    ln.forEach((w,wi)=>{
      const s=placed[li][wi];
      if(!s) return;
      const key=s.c.root+'|'+s.c.minor+'|'+s.c.seventh;
      if(key===last && wi>0) placed[li][wi]=null;
      last=key;
    });
  });
  return { placed, instrumental };
}

// ------------------------------------------------------------
// 7. Sections. A chorus is the block of lines whose lyrics come back.
//    Blocks are split at long pauses; a block counts as a chorus when most
//    of its lines reappear elsewhere in the song.
// ------------------------------------------------------------
function normLine(ln){ return ln.map(w=>w.text.toLowerCase().replace(/[^a-z0-9']/g,'')).filter(Boolean).join(' '); }
export function similar(a,b){
  const A=a.split(' ').filter(Boolean), B=new Set(b.split(' ').filter(Boolean));
  if(!A.length||!B.size) return 0;
  const As=new Set(A); let inter=0; As.forEach(x=>{ if(B.has(x)) inter++; });
  return inter/Math.max(As.size,B.size);
}
// A line belongs to the chorus when its lyrics come back somewhere else in
// the song (at least ~15s away, so a line repeated back-to-back inside a
// verse doesn't count). Consecutive lines of the same kind form a section.
export function labelSections(lines, { repeatSim=0.5, minDistance=15, blockGap=2.5 }={}, lineChords=null){
  if(!lines.length) return [];
  const norm=lines.map(normLine);
  const t0=lines.map(l=>l[0].start);
  let rep=lines.map((_,i)=> norm.some((t,j)=> Math.abs(t0[j]-t0[i])>minDistance && similar(t,norm[i])>=repeatSim));
  // a single odd line inside a chorus (usually a mis-heard word or two) stays in the chorus
  rep=rep.map((r,i)=> r || (i>0 && i<rep.length-1 && rep[i-1] && rep[i+1]));
  const groups=[]; let cur=null;
  lines.forEach((ln,i)=>{
    const gapBefore = i ? ln[0].start - lines[i-1][lines[i-1].length-1].end : 0;
    if(!cur || cur.rep!==rep[i] || (!rep[i] && gapBefore>blockGap)){ cur={rep:rep[i], lineIdx:[]}; groups.push(cur); }
    cur.lineIdx.push(i);
  });
  // A "repeated" block of only a few words (an echoed phrase, or a
  // hallucinated repeat) isn't a chorus — fold it back into its neighbours.
  const wordsIn=g=>g.lineIdx.reduce((a,i)=>a+lines[i].length,0);
  groups.forEach(g=>{ if(g.rep && wordsIn(g)<12) g.rep=false; });
  const merged=[];
  groups.forEach(g=>{
    const p=merged[merged.length-1];
    const gap = p ? lines[g.lineIdx[0]][0].start - lines[p.lineIdx[p.lineIdx.length-1]].slice(-1)[0].end : 0;
    if(p && p.rep===g.rep && (g.rep || gap<=blockGap)) p.lineIdx.push(...g.lineIdx);
    else merged.push({ rep:g.rep, lineIdx:[...g.lineIdx] });
  });
  // A pre-chorus is the stretch just before a chorus where the harmony
  // moves somewhere new (e.g. verse on G–D–C, then Am–Bm–C–D into the
  // chorus). Split it off a verse block when its last 1–3 lines bring in at
  // least two chords the rest of the block doesn't use.
  if(lineChords){
    for(let gi=merged.length-1;gi>=0;gi--){
      const g=merged[gi], next=merged[gi+1];
      if(g.rep || !next || !next.rep || g.lineIdx.length<3) continue;
      for(let k=Math.min(3,g.lineIdx.length-2);k>=1;k--){
        const head=g.lineIdx.slice(0,-k), tail=g.lineIdx.slice(-k);
        const hs=new Set(head.flatMap(i=>lineChords[i]||[]).filter(Boolean));
        const fresh=new Set(tail.flatMap(i=>lineChords[i]||[]).filter(c=>c && !hs.has(c)));
        if(fresh.size>=2){ merged.splice(gi,1,{rep:false,lineIdx:head},{rep:false,pre:true,lineIdx:tail}); break; }
      }
    }
  }
  let verseN=0, chorusN=0;
  const out = merged.map((g,gi)=>{
    if(g.pre) return { label:'Pre-chorus', lineIdx:g.lineIdx };
    if(g.rep){ chorusN++; return { label:'Chorus', lineIdx:g.lineIdx }; }
    const next=merged[gi+1];
    if(chorusN>=2 && verseN>=2) return { label:'Bridge', lineIdx:g.lineIdx };
    if(g.lineIdx.length<=3 && next && next.rep && verseN>0) return { label:'Pre-chorus', lineIdx:g.lineIdx };
    verseN++; return { label:'Verse '+verseN, lineIdx:g.lineIdx };
  });
  // two neighbouring blocks with the same label are one section
  const final=[];
  out.forEach(sec=>{ const p=final[final.length-1]; if(p && p.label===sec.label) p.lineIdx.push(...sec.lineIdx); else final.push(sec); });
  return final;
}

// Repeated lines (every chorus) should carry the same chords, as they do on
// a printed sheet. Where the AI heard the relative minor in one repeat and
// the major in another (G vs Em, C vs Am — chords that share two notes and
// are the model's most common mix-up), take the majority across repeats;
// on a tie, keep the major chord.
export function harmonizeRepeats(lineChordNames, lineTexts, { sim=0.6 }={}){
  const rel = (a,b)=>{
    const A=parseChord(a), B=parseChord(b); if(!A||!B||A.minor===B.minor) return false;
    const maj=A.minor?B:A, min=A.minor?A:B;
    return ((maj.root-3-min.root)%12+12)%12===0;
  };
  const out=lineChordNames.map(r=>r.slice());
  const done=new Set();
  lineTexts.forEach((t,i)=>{
    if(done.has(i)) return;
    const grp=[i]; lineTexts.forEach((u,j)=>{ if(j!==i && !done.has(j) && similar(t,u)>=sim) grp.push(j); });
    grp.forEach(j=>done.add(j));
    if(grp.length<2) return;
    // Lines can differ by a carried-over chord at the start, so align on the
    // most common chord count, comparing from the end of the line.
    const lens=grp.map(j=>out[j].filter(Boolean).length);
    const freq={}; lens.forEach(n=>freq[n]=(freq[n]||0)+1);
    const n=+Object.keys(freq).sort((a,b)=>freq[b]-freq[a] || a-b)[0];
    const members=grp.filter((j,gi)=>lens[gi]>=n && n>0);
    if(members.length<2) return;
    const tail=j=>{ const q=out[j].filter(Boolean); return q.slice(q.length-n); };
    for(let k=0;k<n;k++){
      const opts=members.map(j=>tail(j)[k]);
      if(new Set(opts).size===1) continue;
      if(!opts.every(o=>o===opts[0] || rel(o,opts[0]))) continue;
      const count={}; opts.forEach(o=>count[o]=(count[o]||0)+1);
      const pick=Object.keys(count).sort((a,b)=> count[b]-count[a] || (parseChord(a).minor?1:0)-(parseChord(b).minor?1:0))[0];
      members.forEach(j=>{
        const total=out[j].filter(Boolean).length, target=total-n+k;
        let seen=-1; out[j]=out[j].map(c=>{ if(!c) return c; seen++; return seen===target?pick:c; });
      });
    }
  });
  return out;
}

// ------------------------------------------------------------
// Whole pipeline
// ------------------------------------------------------------
export function buildSheet(rawChords, rawWords, opts={}){
  let segs = cleanChords(rawChords, opts.minChordDur ?? 0.7);
  const tonic = detectKey(segs);
  segs = addSecondaryDominantSevenths(segs, tonic);
  const capo = opts.capo ?? chooseCapo(segs, tonic);
  const words = cleanWords(rawWords);
  const lines = splitLines(words);
  const { placed, instrumental } = placeChords(lines, segs);
  const show = (s)=> chordName({ ...s.c, root:s.c.root-capo }, tonic-capo);
  const names = harmonizeRepeats(placed.map(r=>r.map(s=>s?show(s):null)), lines.map(normLine));
  const sections = labelSections(lines, {}, names.map(r=>r.filter(Boolean)));
  return {
    key: chordName({root:tonic,minor:false,seventh:false}, tonic),
    capo,
    shapesKey: chordName({root:tonic-capo,minor:false,seventh:false}, tonic-capo),
    sections: sections.map(sec=>({
      label: sec.label,
      lines: sec.lineIdx.map(li=>({
        start: lines[li][0].start,
        words: lines[li].map((w,wi)=>({ text:w.text, start:w.start, end:w.end, chord: names[li][wi] })),
        instrumentalAfter: (instrumental.find(x=>x.afterLine===li)?.chords||[]).map(show)
      }))
    })),
    instrumentalIntro: (instrumental.find(x=>x.afterLine===-1)?.chords||[]).map(show),
    chordTimeline: segs.map(s=>({ start:s.start, end:s.end, concert: chordName(s.c, tonic), shown: show(s) }))
  };
}
