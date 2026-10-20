// ============================================================
// Singa — audio import engine ("Audio import 01")
// The exact flow approved in test-analysis.html, as a module so the app's
// "From Recording" flow analyses a take the same way:
//  1. chords from the AI chord server (madmom), with a clearly-flagged rough
//     in-browser fallback if the server can't be reached
//  2. lyrics from Whisper running in a Web Worker (the page stays responsive)
//  3. a "second listen" on any stretch where chords play but no words came back
//  4. the chord sheet built by audio-sheet.js: key, capo, 7ths, chord on the
//     word where it changes, end-of-line chords, lines and sections
// ============================================================
import { buildSheet, findLyricGaps, acceptGapWords } from './audio-sheet.js?v=4';

export const DEFAULT_CHORD_SERVER = 'https://singa-production-e6f3.up.railway.app';
export const DEFAULT_LYRICS_MODEL = 'Xenova/whisper-small.en'; // the "more accurate" model approved in Audio import 01

// ---------------- decode ----------------
export async function decodeTo16kMono(blob){
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  try{
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const off = new OfflineAudioContext(1, Math.max(1,Math.ceil(buf.duration*16000)), 16000);
    const src = off.createBufferSource(); src.buffer=buf; src.connect(off.destination); src.start();
    const pcm = (await off.startRendering()).getChannelData(0).slice();
    return { pcm16k: pcm, durationSec: buf.duration };
  } finally { ctx.close().catch(()=>{}); }
}

// ---------------- title from mp3 tags ----------------
export async function readId3Title(blob){
  try{
    const head=new Uint8Array(await blob.slice(0,10).arrayBuffer());
    if(String.fromCharCode(head[0],head[1],head[2])!=='ID3') return '';
    const ver=head[3];
    const size=(head[6]<<21)|(head[7]<<14)|(head[8]<<7)|head[9];
    const tag=new Uint8Array(await blob.slice(10,10+size).arrayBuffer());
    const out={}; let p=0;
    const dec=(enc,bytes)=>{
      try{
        if(enc===1||enc===2) return new TextDecoder(enc===1?'utf-16':'utf-16be').decode(bytes).replace(/\0/g,'').trim();
        return new TextDecoder(enc===3?'utf-8':'latin1').decode(bytes).replace(/\0/g,'').trim();
      }catch(_e){ return ''; }
    };
    while(p+10<=tag.length){
      const id=String.fromCharCode(tag[p],tag[p+1],tag[p+2],tag[p+3]);
      if(!/^[A-Z0-9]{4}$/.test(id)) break;
      const fs = ver===4 ? ((tag[p+4]<<21)|(tag[p+5]<<14)|(tag[p+6]<<7)|tag[p+7]) : ((tag[p+4]<<24)|(tag[p+5]<<16)|(tag[p+6]<<8)|tag[p+7]);
      if(fs<=0 || p+10+fs>tag.length) break;
      if(id==='TIT2') out.title=dec(tag[p+10], tag.slice(p+11,p+10+fs));
      p+=10+fs;
    }
    // tags on downloaded files often carry junk like "- Lyrics and Chords" or "(Official Video)"
    return (out.title||'')
      .replace(/\s*[\(\[][^)\]]*(official|lyric|video|audio|chords?)[^)\]]*[\)\]]/ig,'')
      .replace(/\s*[-–|]\s*(lyrics?( and chords?)?|chords?|official.*|audio)\s*$/i,'')
      .trim();
  }catch(_e){ return ''; }
}

// ---------------- chords: AI server ----------------
async function chordsFromServer(blob, fileName, serverUrl){
  const base=serverUrl.replace(/\/+$/,'');
  const form=new FormData(); form.append('file', blob, fileName||'audio.webm');
  const res=await fetch(base+'/analyze-chords',{method:'POST',body:form});
  if(!res.ok){ let d=''; try{ d=(await res.json()).error||''; }catch(_e){} throw new Error('server answered '+res.status+(d?': '+d:'')); }
  const json=await res.json();
  if(!json.chords || !json.chords.length) throw new Error('server returned no chords');
  return json.chords;
}

// ---------------- chords: rough in-browser fallback ----------------
function goertzel(x,sr,f){const n=x.length,k=Math.round(n*f/sr),w=2*Math.PI*k/n,c=Math.cos(w),s=Math.sin(w),co=2*c;let q1=0,q2=0;for(let i=0;i<n;i++){const q0=co*q1-q2+x[i];q2=q1;q1=q0;}const re=q1-q2*c,im=q2*s;return Math.sqrt(re*re+im*im)/n;}
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function chordsInBrowser(pcm){
  const sr=16000, win=Math.round(sr*0.5), out=[];
  const tpls=[]; for(let r=0;r<12;r++){ [[0,4,7,':maj'],[0,3,7,':min']].forEach(([a,b,c,q])=>{const v=Array(12).fill(0);[a,b,c].forEach(o=>v[(r+o)%12]=1);tpls.push({label:NAMES[r]+q,v});}); }
  for(let s=0;s+win<=pcm.length;s+=win){
    const x=pcm.subarray(s,s+win), ch=Array(12).fill(0);
    for(let pc=0;pc<12;pc++) for(let m=36+pc;m<=84;m+=12) ch[pc]+=goertzel(x,sr,440*Math.pow(2,(m-69)/12));
    const nrm=Math.hypot(...ch)||1; let best='N',bs=0.5;
    tpls.forEach(t=>{let d=0;for(let i=0;i<12;i++)d+=ch[i]/nrm*t.v[i]/Math.sqrt(3); if(d>bs){bs=d;best=t.label;}});
    out.push({start:s/sr,end:(s+win)/sr,label:best});
  }
  return out;
}

// ---------------- lyrics: Whisper in a Web Worker ----------------
const WORKER_SRC = `
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
env.allowLocalModels = false;
let pipe=null, loaded=null;
self.onmessage = async (e)=>{
  const { pcm, model, chunked } = e.data;
  try{
    if(!pipe || loaded!==model){
      pipe = await pipeline('automatic-speech-recognition', model, { progress_callback: p=>{ if(p && p.status==='progress') self.postMessage({type:'progress', file:p.file, progress:p.progress}); } });
      loaded = model;
    }
    self.postMessage({type:'status', text:'transcribing'});
    const opts = { return_timestamps:'word' };
    if(chunked){ opts.chunk_length_s=30; opts.stride_length_s=5; }
    const out = await pipe(pcm, opts);
    const words = (out.chunks||[]).map(c=>({ text:c.text, start:c.timestamp[0], end:c.timestamp[1] }));
    self.postMessage({type:'done', words, text: out.text});
  }catch(err){ self.postMessage({type:'error', message:String(err && err.message || err)}); }
};`;
let worker=null;
function transcribe(pcm, model, onMsg, chunked=true){
  return new Promise((resolve,reject)=>{
    if(!worker) worker=new Worker(URL.createObjectURL(new Blob([WORKER_SRC],{type:'text/javascript'})),{type:'module'});
    worker.onmessage=(e)=>{
      const m=e.data;
      if(m.type==='progress' || m.type==='status') onMsg && onMsg(m);
      else if(m.type==='done') resolve(m);
      else if(m.type==='error') reject(new Error(m.message));
    };
    worker.onerror=(e)=>reject(new Error(e.message||'worker failed'));
    worker.postMessage({ pcm, model, chunked });
  });
}

// ---------------- the whole Audio import 01 flow ----------------
// onProgress({ pct, note }) is called as each step moves along.
// Returns { durationSec, pcm16k, rawChords, chordSource:'ai'|'fallback', chordError,
//           rawWords, rawText, lyricsError, secondText, unheard, sheet, id3Title }.
export async function analyzeAudio(blob, { fileName='', model=DEFAULT_LYRICS_MODEL, serverUrl=DEFAULT_CHORD_SERVER, onProgress } = {}){
  const report = (pct, note)=>{ try{ onProgress && onProgress({ pct, note }); }catch(_e){} };
  report(4, 'Listening back to your take…');
  const id3Title = await readId3Title(blob);
  const { pcm16k, durationSec } = await decodeTo16kMono(blob);

  // chords and lyrics run side by side
  let rawChords=null, chordSource='', chordError='';
  const chordsP = chordsFromServer(blob, fileName, serverUrl)
    .then(c=>{ rawChords=c; chordSource='ai'; })
    .catch(err=>{ rawChords=chordsInBrowser(pcm16k); chordSource='fallback'; chordError=err.message; });

  let lyricsPct=10, creep=null;
  report(lyricsPct, 'Eavesdropping on the chords and loading the lyrics model…');
  const lyricsP = transcribe(pcm16k, model, m=>{
    if(m.type==='progress'){ lyricsPct = 10 + Math.round((m.progress||0)*0.2); report(lyricsPct, 'Downloading the lyrics model (first time only) '+Math.round(m.progress||0)+'%'); }
    else if(m.type==='status'){
      lyricsPct = 32; report(lyricsPct, 'Teaching every word to keep up with you — this takes a few minutes');
      // Whisper gives no progress while it listens; creep the bar so it's
      // clearly still working, without ever claiming to be done.
      creep = setInterval(()=>{ lyricsPct = Math.min(78, lyricsPct + (78-lyricsPct)*0.04); report(lyricsPct, 'Teaching every word to keep up with you — this takes a few minutes'); }, 1500);
    }
  }).finally(()=>{ if(creep) clearInterval(creep); });

  let rawWords=[], rawText='', lyricsError='';
  await Promise.all([chordsP, lyricsP.then(r=>{ rawWords=r.words||[]; rawText=r.text||''; }).catch(err=>{ rawWords=[]; rawText=''; lyricsError=err.message; })]);

  // second listen on stretches with chords but no words
  const unheard=[]; let secondText='';
  const gaps = rawWords.length ? findLyricGaps(rawWords, rawChords) : [];
  for(let i=0;i<gaps.length;i++){
    const g=gaps[i];
    report(80 + Math.round(12*i/gaps.length), 'Listening again where no words came through ('+(i+1)+' of '+gaps.length+')…');
    const clipStart=Math.max(0,g.start-0.5), clipEnd=Math.min(durationSec,g.end+0.5);
    const clip=pcm16k.slice(Math.round(clipStart*16000), Math.round(clipEnd*16000));
    try{
      const r=await transcribe(clip, model, null, false);
      const shifted=(r.words||[]).map(w=>({ text:w.text, start:w.start==null?null:w.start+clipStart, end:w.end==null?null:w.end+clipStart }));
      const keep=acceptGapWords(shifted, g, clipStart);
      if(keep.length){ rawWords=rawWords.concat(keep); secondText+=keep.map(w=>w.text).join(' ')+'\n'; }
      else unheard.push(g);
    }catch(_e){ unheard.push(g); }
  }

  report(94, 'Polishing the chord sheet…');
  const sheet = buildSheet(rawChords||[], rawWords);
  return { durationSec, pcm16k, rawChords, chordSource, chordError, rawWords, rawText, lyricsError, secondText, unheard, sheet, id3Title };
}
