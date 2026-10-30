// ============================================================
// Singa — chord-sheet file import engine ("Text import 01")
// The exact logic approved in test-chordsheet.html, as a module so the app's
// "From File" flow and the test page read files the same way:
//  - .txt / .md: character columns line chords up with words
//  - .pdf with a text layer: pdf.js positions; scanned pages: Tesseract OCR
//    with real per-word positions
//  - page numbers / web addresses dropped; a chord line whose lyric was
//    pushed onto the next page still pairs with it
//  - chords sit over the word they're written above; chords written past
//    the end of a lyric line are kept as end-of-line chords
//  - the header above the first chord/section (title, "Chords by …") is
//    read as title + artist, not as lyrics
// ============================================================
let logHook = null;
function log(msg){ if(logHook) try{ logHook(msg); }catch(_e){} }

// ============================================================
// POSITION-AWARE TEXT EXTRACTION
// Every path below produces the same shape: an array of
// { text, words: [{text, x}] } lines — x is a plain horizontal
// position (PDF points, OCR pixels, or character columns for
// plain text) usable to line a chord up with the word under it.
// ============================================================
function plainTextToWordLines(text){
  return (text||'').replace(/\r\n?/g,'\n').split('\n').map(rawLine=>{
    const words = [];
    const re = /\S+/g; let m;
    while((m = re.exec(rawLine))) words.push({ text:m[0], x:m.index, xEnd:m.index+m[0].length });
    return { text: rawLine, words };
  });
}

let pdfjsLib = null;
async function loadPdfJs(){
  if(pdfjsLib) return pdfjsLib;
  log('Loading pdf.js (first time only)…');
  pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';
  return pdfjsLib;
}
let tesseractWorkerPromise = null;
async function getOcrWorker(){
  if(tesseractWorkerPromise) return tesseractWorkerPromise;
  tesseractWorkerPromise = (async ()=>{
    log('Loading OCR engine (Tesseract.js, first time only — downloads a language model, ~15MB)…');
    const { default: Tesseract } = await import('https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js');
    return await Tesseract.createWorker('eng', 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',
    });
  })();
  return tesseractWorkerPromise;
}
async function pageIsFullPageScan(lib, page){
  const viewport = page.getViewport({ scale: 1 });
  const pageArea = viewport.width * viewport.height;
  const opList = await page.getOperatorList();
  const OPS = lib.OPS;
  let cur = [1,0,0,1,0,0];
  const stack = [];
  let maxFrac = 0;
  for(let i=0;i<opList.fnArray.length;i++){
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if(fn===OPS.save){ stack.push(cur.slice()); }
    else if(fn===OPS.restore){ cur = stack.pop() || cur; }
    else if(fn===OPS.transform){
      const [a,b,c,d,e,f] = args;
      const [a0,b0,c0,d0,e0,f0] = cur;
      cur = [a*a0+b*c0, a*b0+b*d0, c*a0+d*c0, c*b0+d*d0, e*a0+f*c0+e0, e*b0+f*d0+f0];
    }
    else if(fn===OPS.paintImageXObject || fn===OPS.paintJpegXObject || fn===OPS.paintImageMaskXObject){
      const [a,b,c,d] = cur;
      maxFrac = Math.max(maxFrac, Math.abs(a*d-b*c)/pageArea);
    }
  }
  return maxFrac > 0.6;
}
// pdf.js hands back text in disconnected chunks with x/y positions, not
// word-level boxes. Group chunks sharing a y into a line (same tolerance
// as the File Import Lab), then approximate each word's x by spreading
// its chunk's total width across its characters — not exact (proportional
// fonts aren't evenly spaced per character) but close enough to tell which
// word a chord above it is nearest to.
function reconstructWordLines(content){
  const items = content.items.map(it=>({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width||0, size: Math.abs(it.transform[3]) || Math.hypot(it.transform[2]||0, it.transform[3]||0) || 0 }));
  const lines = [];
  items.forEach(it=>{
    let line = lines.find(l=>Math.abs(l.y - it.y) < 2.5);
    if(!line){ line = { y: it.y, items: [] }; lines.push(line); }
    line.items.push(it);
  });
  lines.sort((a,b)=>b.y-a.y);
  return lines.map(l=>{
    l.items.sort((a,b)=>a.x-b.x);
    const words = [];
    l.items.forEach(it=>{
      const re = /\S+/g; let m;
      const len = it.str.length || 1;
      while((m = re.exec(it.str))){
        const frac = m.index/len, fracEnd=(m.index+m[0].length)/len;
        words.push({ text: m[0], x: it.x + (it.width||0)*frac, xEnd: it.x + (it.width||0)*fracEnd });
      }
    });
    // font size: tells a song's title (bigger) from its lyrics on a page
    const size = Math.max(0, ...l.items.filter(it=>/\S/.test(it.str)).map(it=>it.size||0));
    return { text: words.map(w=>w.text).join(' '), words, size };
  });
}
async function ocrPageWordLines(page){
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(canvas);
  // Tesseract's result nests block > paragraph > line > word, each with
  // its own bbox — real per-word positions, not an approximation like the
  // PDF text-layer path above, so OCR'd chord sheets can be aligned at
  // least as reliably as ones with a real embedded text layer.
  const lines = [];
  (data.lines||[]).forEach(l=>{
    const words = (l.words||[]).map(w=>({ text: (w.text||'').trim(), x: w.bbox ? w.bbox.x0 : 0, xEnd: w.bbox ? w.bbox.x1 : 0 })).filter(w=>w.text);
    if(words.length) lines.push({ text: words.map(w=>w.text).join(' '), words });
  });
  if(lines.length) return lines;
  // Fallback: if this Tesseract build/version didn't return line/word
  // boxes for some reason, fall back to plain recognized text so the
  // page still produces something rather than silently dropping content.
  return plainTextToWordLines(data.text||'');
}
async function extractPdfWordLines(file){
  const lib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await lib.getDocument({ data: buf }).promise;
  log('PDF has '+doc.numPages+' page(s). Extracting text…');
  let lines = [];
  let usedOcr = false;
  for(let p=1; p<=doc.numPages; p++){
    const page = await doc.getPage(p);
    const isScan = await pageIsFullPageScan(lib, page);
    if(isScan){
      log('Page '+p+' is a full-page image — reading it with OCR…', 'ok');
      lines = lines.concat(await ocrPageWordLines(page));
      usedOcr = true;
    } else {
      const content = await page.getTextContent();
      lines = lines.concat(reconstructWordLines(content));
    }
    lines.push({ text:'', words:[], pageBreak:true });
  }
  return { lines: removePageFurniture(lines), usedOcr };
}

// Printed / exported sheets carry text that isn't part of the song: page
// numbers ("Page 1/2", "1 of 3", "- 2 -"), web addresses and
// similar page furniture. Drop those, so they
// neither show up as lyrics nor sit between a chord line and its lyric.
const PAGE_JUNK = [
  /^page\s*\d+(\s*(\/|of)\s*\d+)?$/i,
  /^\d+\s*(\/|of)\s*\d+$/i,
  /^[-–]?\s*\d{1,3}\s*[-–]?$/,
  /^(https?:\/\/|www\.)\S+$/i,
  /^\S+\.(com|net|org|co\.uk|io)(\/\S*)?$/i
];
function isPageJunk(text){ const t=(text||'').trim(); return !!t && PAGE_JUNK.some(re=>re.test(t)); }
function removePageFurniture(lines){
  // Only explicit page furniture is removed. (Dropping "any line repeated
  // at the top or bottom of every page" was tried and is unsafe: a song's
  // own repeated line can land at a page edge, as "Dream a little dream of
  // me" does on both pages of the Mamas & Papas sheet.)
  return lines.map(l=> (!l.pageBreak && isPageJunk(l.text)) ? { ...l, junk:true } : l);
}

// ============================================================
// LINE CLASSIFICATION — section label / chord line / lyric / noise
// (identical heuristic to the Lyrics File Import Lab, including its
// "[Chorus]"-style bracket fix: a bracketed label that IS a known
// section keyword is always trusted, never run through the OCR-noise
// word-frequency check that's meant for chord-diagram misreads, not
// short deliberate labels)
// ============================================================
const COMMON_WORDS_SAMPLE = "the of and to in for is on that by this with you it not or be are from at as your all have new more an was we will home can us about if page my has search free but our one other do no information time they site he up may what which their news out use any there see only so his when contact here business who web also now help get pm view online first am been would how were me services some these click its like service than find price date back top people had list name just over state year day into email two health world re next used go work last most products music buy data make them should product system post her city add policy number such please available copyright support message after best software then jan good video well where info rights public books high school through each links she review years order very privacy book items company read group need many user said de does set under general research university january mail full map reviews program life know games way days management part could great united hotel real item international center ebay must store travel comments made development report off member details line terms before hotels did send right type because local those using results office education national car design take posted internet address community within states area want phone dvd shipping reserved subject between forum family long based code show even black check special prices website index being women much sign file link open today technology south case project same pages uk version section own found sports house related security both county american photo game members power while care network down computer systems three total place end following download him without per access think north resources current posts big media law control water history pictures size art personal since including guide shop directory board location change white text small rating rate government children during usa return students shopping account times sites level digital profile previous form events love old john main call hours image department title description non insurance another why shall property class cd still money quality every listing content country private little visit save tools low reply customer december compare movies include college value article york man card jobs provide food source author different press learn sale around print course job canada process teen room stock training too credit point join science men categories advanced west sales look english left team estate box conditions select windows photos gay thread week category note live large gallery table register however june october november market library really action start series model features air industry plan human provided tv yes required second hot accessories cost movie forums march la september better say questions july yahoo going medical test friend come dec server pc study application cart staff articles san feedback again play looking issues april never users complete street topic comment financial things working against standard tax person below mobile less got blog party payment equipment login student let programs offers legal above recent park stores side act problem red give memory performance social august quote language story sell options experience rates create key body young america important field few east paper single ii age activities club example girls additional password latest something road gift question changes night ca hard texas oct pay four poker status browse issue range building seller court february always result audio light write war nov offer blue groups al easy given files event release analysis request fax china making picture needs possible might professional yet month major star areas future space committee hand sun cards problems london washington meeting rss become interest id child keep enter california share similar garden schools million added reference companies listed baby learning energy run delivery net popular term film stories put computers journal reports co try welcome central images president notice original head radio until cell color self council away includes track australia discussion archive once others entertainment agreement format least society months log safety friends sure faq trade edition cars messages marketing tell further updated association able having provides david fun already green studies close common drive specific several gold feb living sep collection called short arts lot ask display limited powered solutions means director daily beach past natural whether due et electronics five upon period planning database says official weather mar land average done technical window france pro region island record direct microsoft conference environment records st district calendar costs style url front statement update parts aug ever downloads early miles sound resource present applications either ago document word works material bill apr written talk federal hosting rules final adult tickets thing centre requirements via cheap kids finance true minutes else mark third rock gifts europe reading topics bad individual tips plus auto cover usually edit together videos percent fast function fact unit getting global tech meet far economic en player projects lyrics often subscribe submit germany amount watch included feel though bank risk thanks everything deals various words linux jul production commercial james weight town heart advertising received choose treatment newsletter archives points knowledge magazine error camera jun girl currently construction toys registered clear golf receive domain methods chapter makes protection policies loan wide beauty manager india position taken sort listings models michael known half cases step engineering florida simple quick none wireless license paul friday lake whole annual published later basic sony shows corporate google church method purchase customers active response practice hardware figure materials fire holiday chat enough designed along among death writing speed html countries loss face brand discount higher effects created remember standards oil bit yellow political increase advertise kingdom base near environmental thought stuff french storage oh japan doing loans shoes entry stay nature orders availability africa summary turn mean growth notes agency king monday european activity copy although drug pics western income force cash employment overall bay river commission ad package contents seen players engine port album regional stop supplies started administration bar institute views plans double dog build screen exchange types soon sponsored lines electronic continue across benefits needed season apply someone held ny anything printer condition effective believe organization effect asked eur mind sunday selection casino pdf lost tour menu volume cross anyone mortgage hope silver corporation wish inside solution mature role rather weeks addition came supply nothing certain usr executive running lower necessary union jewelry according dc clothing mon com particular fine names robert homepage hour gas skills six bush islands advice career military rental decision leave british teens pre huge sat woman facilities zip bid kind sellers middle move cable opportunities taking values division coming tuesday object lesbian appropriate machine logo length actually nice score statistics client ok returns capital follow sample investment sent shown saturday christmas england culture band flash ms lead george choice went starting registration fri thursday courses consumer hi airport foreign artist outside furniture levels channel letter mode phones ideas wednesday structure fund summer allow degree contract button releases wed homes super male matter custom virginia almost took located multiple asian distribution editor inn industrial cause potential song cnet ltd los hp focus late fall featured idea rooms female responsible inc communications win associated thomas primary cancer numbers reason tool browser spring foundation answer voice eg friendly schedule documents communication purpose feature bed comes police everyone independent ip approach cameras brown physical operating hill maps medicine deal hold ratings chicago forms glass happy tue smith wanted developed thank safe unique survey prior telephone sport ready feed animal sources mexico population pa regular secure navigation operations therefore simply evidence station christian round paypal favorite understand option master valley recently probably thu rentals sea built publications blood cut worldwide improve connection publisher hall larger anti networks earth parents nokia impact transfer introduction kitchen strong tel carolina wedding properties hospital ground overview ship accommodation owners disease tx excellent paid italy perfect hair opportunity kit classic basis command cities william express award distance tree peter assessment ensure thus wall ie involved el extra especially interface partners budget rated guides success maximum ma operation existing quite selected boy amazon patients restaurants beautiful warning wine locations horse vote forward flowers stars significant lists technologies owner retail animals useful directly manufacturer ways est son providing rule mac housing takes iii gmt bring catalog searches max trying mother authority considered told xml traffic programme joined input strategy feet agent valid bin modern senior ireland teaching door grand testing trial charge units instead canadian cool normal wrote enterprise ships entire educational md leading metal positive fl fitness chinese opinion mb asia football abstract uses output funds mr greater likely develop employees artists alternative processing responsibility resolution java guest seems publication pass relations trust van contains session multi photography republic fees components vacation century academic assistance completed skin graphics indian prev ads mary il expected ring grade dating pacific mountain organizations pop filter mailing vehicle longer consider int northern behind panel floor german buying match proposed default require iraq boys outdoor deep morning otherwise allows rest protein plant reported hit transportation mm pool mini politics partner disclaimer authors boards faculty parties fish membership mission eye string sense modified pack released stage internal goods recommended born unless richard detailed japanese race approved background target except character usb maintenance ability maybe functions ed moving brands places php pretty trademarks spain southern yourself etc winter battery youth pressure submitted boston debt keywords medium television interested core break purposes throughout sets dance wood msn itself defined papers playing awards fee studio reader virtual device established answers rent las remote dark programming external apple le regarding instructions min offered theory enjoy remove aid surface minimum visual host variety teachers isbn martin manual block subjects agents increased repair fair civil steel understanding songs fixed wrong beginning hands associates finally az updates desktop classes paris ohio gets sector capacity requires jersey un fat fully father electric saw instruments quotes officer driver businesses dead respect unknown specified restaurant mike trip pst worth mi procedures poor teacher eyes relationship workers farm georgia peace traditional campus tom showing creative coast benefit progress funding devices lord grant sub agree fiction hear sometimes watches careers beyond goes families led museum themselves fan transport interesting blogs wife evaluation accepted former implementation ten hits zone complex th cat galleries references die presented jack flat flow agencies literature respective parent spanish michigan columbia setting dr scale stand economy highest helpful monthly critical frame musical definition secretary angeles networking path australian employee chief gives kb bottom magazines packages detail francisco laws changed pet heard begin individuals colorado royal clean switch russian largest african guy titles relevant guidelines justice connect bible dev cup basket applied weekly vol installation described demand pp suite vegas na square chris attention advance skip diet army auction gear lee os difference allowed correct charles nation selling lots piece sheet firm seven older illinois regulations elements species jump cells module resort facility random pricing dvds certificate minister motion looks fashion directions visitors documentation monitor trading forest calls whose coverage couple giving chance vision ball ending clients actions listen discuss accept automotive naked goal successful sold wind communities clinical situation sciences markets lowest highly publishing appear emergency developing lives currency leather determine temperature palm announcements patient actual historical stone bob commerce ringtones perhaps persons difficult scientific satellite fit tests village accounts amateur ex met pain xbox particularly factors coffee www settings buyer cultural steve easily oral ford poster edge functional root au fi closed holidays ice pink zealand balance monitoring graduate replies shot nc architecture initial label thinking scott llc sec recommend canon league waste minute bus provider optional dictionary cold accounting manufacturing sections chair fishing effort phase fields bag fantasy po letters motor va professor context install shirt apparel generally continued foot mass crime count breast techniques ibm rd johnson sc quickly dollars websites religion claim driving permission surgery patch heat wild measures generation kansas miss chemical doctor task reduce brought himself nor component enable exercise bug santa mid guarantee leader diamond israel se processes soft servers alone meetings seconds jones arizona keyword interests flight congress fuel username walk produced italian paperback classifieds wait supported pocket saint rose freedom argument competition creating jim drugs joint premium providers fresh characters attorney upgrade di factor growing thousands km stream apartments pick hearing eastern auctions therapy entries dates generated signed upper administrative serious prime samsung limit began louis steps errors shops del efforts informed ga ac thoughts creek ft worked quantity urban practices sorted reporting essential myself tours platform load affiliate labor immediately admin nursing defense machines designated tags heavy covered recovery joe guys integrated configuration merchant comprehensive expert universal protect drop solid cds presentation languages became orange compliance vehicles prevent theme rich im campaign marine improvement vs guitar finding pennsylvania examples ipod saying spirit ar claims challenge motorola acceptance strategies mo seem affairs touch intended towards sa goals hire election suggest branch charges serve affiliates reasons magic mount smart talking gave ones latin multimedia xp avoid certified manage corner rank computing oregon element birth virus abuse interactive requests separate quarter procedure leadership tables define racing religious facts breakfast kong column plants faith chain developer identify avenue missing died approximately domestic sitemap recommendations moved houston reach comparison mental viewed moment extended sequence inch attack sorry centers opening damage lab reserve recipes cvs gamma plastic produce snow placed truth counter failure follows eu weekend dollar camp ontario automatically des minnesota films bridge native fill williams movement printing baseball owned approval draft chart played contacts cc jesus readers clubs lcd wa jackson equal adventure matching offering shirts profit leaders posters institutions assistant variable ave dj advertisement expect parking headlines yesterday compared determined wholesale workshop russia gone codes kinds extension seattle statements golden completely teams fort cm wi lighting senate forces funny brother gene turned portable tried electrical applicable disc returned pattern ct boat named theatre laser earlier manufacturers sponsor classical icon warranty dedicated indiana direction harry basketball objects ends delete evening assembly nuclear taxes mouse signal criminal issued brain sexual wisconsin powerful dream obtained false da cast flower felt personnel passed supplied identified falls pic soul aids opinions promote stated stats hawaii professionals appears carry flag decided nj covers hr em advantage hello designs maintain tourism priority newsletters adults clips savings iv graphic atom payments rw estimated binding brief ended winning eight anonymous iron straight script served wants miscellaneous prepared void dining alert integration atlanta dakota tag interview mix framework disk installed queen vhs credits clearly fix handle sweet desk criteria pubmed dave massachusetts diego hong vice associate ne truck behavior enlarge ray frequently revenue measure changing votes du duty looked discussions bear gain festival laboratory ocean flights experts signs lack depth iowa whatever logged laptop vintage train exactly dry explore maryland spa concept nearly eligible checkout reality forgot handling origin knew gaming feeds billion destination scotland faster intelligence dallas bought con ups nations route followed specifications broken tripadvisor frank alaska zoom blow battle residential anime speak decisions industries protocol query clip partnership editorial nt expression es equity provisions speech wire principles suggestions rural shared sounds replacement tape strategic judge spam economics acid bytes cent forced compatible fight apartment height null zero speaker filed gb netherlands obtain bc consulting recreation offices designer remain managed pr failed marriage roll korea banks fr participants secret bath aa kelly leads negative austin favorites toronto theater springs missouri andrew var perform healthy translation estimates font assets injury mt joseph ministry drivers lawyer figures married protected proposal sharing philadelphia portal waiting birthday beta fail gratis banking officials brian toward won slightly assist conduct contained lingerie legislation calling parameters jazz serving bags profiles miami comics matters houses doc postal relationships tennessee wear controls breaking combined ultimate wales representative frequency introduced minor finish departments residents noted displayed mom reduced physics rare spent performed extreme samples davis daniel bars reviewed row oz forecast removed helps singles administrator cycle amounts contain accuracy dual rise usd sleep mg bird pharmacy brazil creation static scene hunter addresses lady crystal famous writer chairman violence fans oklahoma speakers drink academy dynamic gender eat permanent agriculture dell cleaning constitutes portfolio practical delivered collectibles infrastructure exclusive seat concerns colour vendor originally intel utilities philosophy regulation officers reduction aim bids referred supports nutrition recording regions junior toll les cape ann rings meaning tip secondary wonderful mine ladies henry ticket announced guess agreed prevention whom ski soccer math import posting presence instant mentioned automatic healthcare viewing maintained ch increasing majority connected christ dan dogs sd directors aspects austria ahead moon participation scheme utility preview fly manner matrix containing combination devel amendment despite strength guaranteed turkey libraries proper distributed degrees singapore enterprises delta fear seeking inches phoenix rs convention shares principal daughter standing comfort colors wars cisco ordering kept alpha appeal cruise bonus certification previously hey bookmark buildings specials beat disney household batteries adobe smoking bbc becomes drives arms alabama tea improved trees avg achieve positions dress subscription dealer contemporary sky utah nearby rom carried happen exposure panasonic hide permalink signature gambling refer miller provision outdoors clothes caused luxury babes frames certainly indeed newspaper toy circuit layer printed slow removal easier src liability trademark hip printers faqs nine adding kentucky mostly eric spot taylor trackback prints spend factory interior revised grow americans optical promotion relative amazing clock dot hiv identity suites conversion feeling hidden reasonable victoria serial relief revision broadband influence ratio pda importance rain onto dsl planet webmaster copies recipe zum permit seeing proof dna diff tennis bass prescription bedroom empty instance hole pets ride licensed orlando specifically tim bureau maine sql represent conservation pair ideal specs recorded don pieces finished parks dinner lawyers sydney stress cream ss runs trends yeah discover ap patterns boxes louisiana hills javascript fourth nm advisor mn marketplace nd evil aware wilson shape evolution irish certificates objectives stations suggested gps op remains acc greatest firms concerned".split(" ");
const COMMON_WORDS = new Set(COMMON_WORDS_SAMPLE);
function wordStats(rawLine){
  const t = (rawLine||'').trim();
  const tokens = t.split(/\s+/).filter(Boolean);
  let counted = 0, hits = 0;
  tokens.forEach(tok=>{
    const stripped = tok.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g,'').toLowerCase();
    if(stripped.length < 3) return;
    counted++;
    if(COMMON_WORDS.has(stripped)) hits++;
  });
  const nonSpace = t.replace(/\s+/g,'');
  const junkChars = (t.match(/[\[\]{}()|@©®~^]/g)||[]).length;
  const junkRatio = nonSpace.length ? junkChars/nonSpace.length : 0;
  return { counted, hits, junkRatio };
}
function isLikelyNoiseLine(rawLine){
  if(!(rawLine||'').trim()) return false;
  const { counted, hits, junkRatio } = wordStats(rawLine);
  if(junkRatio > 0.12) return true;
  if(counted < 2) return true;
  return (hits/counted) < 0.35;
}
function isPlausibleBracketLabel(rawLine){
  const { counted, hits, junkRatio } = wordStats(rawLine);
  if(junkRatio > 0.12) return false;
  return counted > 0 && hits > 0;
}
const SECTION_WORDS = ['intro','verse','chorus','pre-chorus','prechorus','bridge','outro','hook','refrain',
  'interlude','breakdown','instrumental','solo','guitar solo','piano solo','drum solo','vamp','tag','coda','ad-lib','spoken','build','drop'];
function bareMatchesSectionKeyword(bare){
  const lower = (bare||'').trim().toLowerCase();
  return SECTION_WORDS.some(w=>{
    const re = new RegExp('^'+w.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')+'\\s*\\d*\\.?$');
    return re.test(lower);
  });
}
function sectionLabelFor(rawLine){
  const t = (rawLine||'').trim();
  if(!t) return null;
  const bracketed = /^[\[(]/.test(t) && /[\])]$/.test(t);
  const bare = t.replace(/^[\[(]\s*/,'').replace(/\s*[\])]$/,'').trim();
  if(!bare) return null;
  if(bracketed) return bare;
  const lower = bare.toLowerCase();
  const isKeywordLine = SECTION_WORDS.some(w=>{
    const re = new RegExp('^'+w.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')+'\\s*\\d*\\.?$');
    return re.test(lower);
  });
  if(isKeywordLine && bare.split(/\s+/).length<=4) return bare;
  return null;
}
const CHORD_TOKEN_RE = /^[A-G](#|b)?(maj|min|m|dim|aug|sus2|sus4|add\d{1,2}|maj7|m7|6|7|9|11|13)?(\/[A-G](#|b)?)?$/;
function isChordLine(rawLine){
  const t = (rawLine||'').trim();
  if(!t) return false;
  const tokens = t.split(/\s+/).filter(Boolean);
  if(!tokens.length) return false;
  return tokens.every(tok=>CHORD_TOKEN_RE.test(tok));
}

// Classify a sequence of word-lines into typed entries, keeping each
// line's word/position data attached (needed by the chord<->lyric
// pairing pass that follows).
function classifyWordLines(wordLines, applyOcrNoiseFilter){
  return wordLines.map(line=>{
    const raw = line.text;
    if(line.pageBreak) return { type:'pagebreak', text:'', words:[] };
    if(line.junk || isPageJunk(raw)) return { type:'junk', text:raw.trim(), words:[] };
    const label = sectionLabelFor(raw);
    if(label){
      const bracketed = /^[\[(]/.test(raw.trim()) && /[\])]$/.test(raw.trim());
      const trustLabel = !applyOcrNoiseFilter || !bracketed || bareMatchesSectionKeyword(label) || isPlausibleBracketLabel(label);
      if(trustLabel) return { type:'label', text:label, words:[] };
    }
    if(isChordLine(raw)) return { type:'chord', text:raw.trim(), words:line.words };
    const trimmed = raw.trim();
    if(!trimmed.length) return { type:'blank', text:'', words:[] };
    if(applyOcrNoiseFilter && isLikelyNoiseLine(trimmed)) return { type:'noise', text:trimmed, words:[] };
    return { type:'lyric', text:trimmed, words:line.words };
  });
}

// ============================================================
// CHORD <-> LYRIC PAIRING
// A chord line followed immediately by a lyric line gets its chords
// attached to the nearest word (by position) in that lyric line.
// ============================================================
function nearestWordIndex(targetX, words){
  let best=-1, bestDist=Infinity;
  words.forEach((w,i)=>{
    const d = Math.abs(w.x-targetX);
    if(d<bestDist){ bestDist=d; best=i; }
  });
  return best;
}
// Which lyric word a chord belongs to: the word it sits over (the last word
// starting at or before the chord, with a little slack), so a chord above
// the middle of a long word stays on that word. A chord that sits past the
// end of the lyric line (common at line ends: "...of me  C  E7") is kept as a
// trailing chord after the last word instead of being dropped.
function mapChordsToWords(chordWords, words){
  const chordMap = {}, tail = [];
  if(!words.length) return { chordMap, tail:chordWords.map(c=>c.text) };
  const lens = words.map(w=>Math.max(1,w.text.length));
  const spans = words.map((w,i)=> (w.xEnd!=null && w.xEnd>w.x) ? (w.xEnd-w.x) : null);
  const known = spans.map((sp,i)=> sp!=null ? sp/lens[i] : null).filter(v=>v!=null);
  const charW = known.length ? known.reduce((a,b)=>a+b,0)/known.length : 1;
  const last = words[words.length-1];
  const lastEnd = last.xEnd!=null && last.xEnd>last.x ? last.xEnd : last.x + charW*last.text.length;
  chordWords.forEach(cw=>{
    if(cw.x >= lastEnd + charW*0.5){ tail.push(cw.text); return; }
    let idx = 0;
    words.forEach((w,i)=>{ if(w.x <= cw.x + charW*0.6) idx=i; });
    // a chord written in the gap after a word belongs to the word that follows
    const w=words[idx], wEnd = (w.xEnd!=null && w.xEnd>w.x) ? w.xEnd : w.x + charW*w.text.length;
    if(cw.x >= wEnd - charW*0.2 && idx+1<words.length) idx++;
    (chordMap[idx] = chordMap[idx] || []).push(cw.text);
  });
  return { chordMap, tail };
}
function buildSheetBlocks(classified){
  const blocks = [];
  for(let i=0;i<classified.length;i++){
    const line = classified[i];
    if(line.type==='label'){ blocks.push({ type:'label', text:line.text }); continue; }
    if(line.type==='chord'){
      // the lyric under a chord line can be pushed onto the next page, or have
      // a page number/footer in between — look past those
      let j=i+1;
      while(j<classified.length && (classified[j].type==='pagebreak' || classified[j].type==='junk')) j++;
      const next = classified[j];
      if(next && next.type==='lyric' && next.words.length){
        const { chordMap, tail } = mapChordsToWords(line.words, next.words);
        blocks.push({ type:'couplet', words: next.words, chordMap, tail });
        i=j; // consumed the paired lyric line
      } else {
        blocks.push({ type:'standalone-chords', text: line.text });
      }
      continue;
    }
    if(line.type==='lyric'){
      blocks.push({ type:'couplet', words: line.words, chordMap: {} });
    }
    // 'blank' and 'noise' lines produce no block
  }
  return blocks;
}

// ============================================================
// TITLE EXTRACTION
// ============================================================
function titleFromFilename(name){
  const base = (name||'song').replace(/\.[^.]+$/, '');
  const spaced = base.replace(/[_-]+/g,' ').trim();
  return spaced.replace(/\w\S*/g, w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()) || 'Untitled';
}
// Sheets usually open with a few header lines before the music starts:
// the title, often "Chords by <artist>", sometimes the title again in a
// decorative style. Everything above the first chord line or section label
// is treated as that header — not as lyrics.
function extractHeader(classified, fileName){
  const firstMusic = classified.findIndex(l=>l.type==='chord' || l.type==='label');
  if(firstMusic<=0) return null;
  const head = classified.slice(0, firstMusic).map((l,i)=>({l,i})).filter(x=>x.l.type==='lyric');
  if(!head.length || head.length>5) return null;
  let title='', artist='';
  head.forEach(({l})=>{
    const m = /^(?:chords|lyrics|tabs?)?\s*(?:and\s+(?:chords|lyrics)\s+)?by\s+(.+)$/i.exec(l.text);
    if(m && !artist) artist=m[1].trim();
    else if(!title) title=l.text;
  });
  return { title: title || titleFromFilename(fileName), artist, consumed: new Set(head.map(x=>x.i)) };
}
function extractTitle(classified, fileName){
  for(const line of classified){
    if(line.type==='blank') continue;
    if(line.type==='lyric' && line.words.length && line.words.length<=8){
      return { title: line.text, consumedIndex: classified.indexOf(line) };
    }
    break; // first non-blank line wasn't a short plain lyric line — give up
  }
  return { title: titleFromFilename(fileName), consumedIndex: -1 };
}


// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------
function detectKind(file){
  const name=(file.name||'').toLowerCase(), type=(file.type||'').toLowerCase();
  if(name.endsWith('.pdf') || type==='application/pdf') return 'pdf';
  if(name.endsWith('.txt') || name.endsWith('.md') || type.startsWith('text/')) return 'text';
  return 'unknown';
}
async function sniff(file){
  const head=new Uint8Array(await file.slice(0,5).arrayBuffer());
  return String.fromCharCode(...head).startsWith('%PDF-') ? 'pdf' : 'text';
}
export function isSheetFile(file){
  return /\.(txt|md|pdf)$/i.test(file.name||'') || /^text\//.test(file.type||'') || file.type==='application/pdf';
}
async function fileWordLines(file){
  let kind = detectKind(file);
  if(kind==='unknown') kind = await sniff(file);
  if(kind==='pdf'){ const r = await extractPdfWordLines(file); return { lines:r.lines, usedOcr:r.usedOcr, kind }; }
  return { lines: plainTextToWordLines(await file.text()), usedOcr:false, kind };
}
function sheetFromLines(wordLines, usedOcr, fileName){
  const rawText = wordLines.map(l=>l.text).join('\n');
  const classified = classifyWordLines(wordLines, usedOcr===true);
  const header = extractHeader(classified, fileName);
  let title, artist='', body;
  if(header){ title=header.title; artist=header.artist; body=classified.filter((_,i)=>!header.consumed.has(i)); }
  else { const t=extractTitle(classified, fileName); title=t.title; body = t.consumedIndex>=0 ? classified.filter((_,i)=>i!==t.consumedIndex) : classified; }
  const blocks = buildSheetBlocks(body);
  return { title, artist, blocks, rawText, usedOcr,
    junkCount: classified.filter(l=>l.type==='junk').length,
    noiseCount: classified.filter(l=>l.type==='noise').length };
}
// Reads a chord-sheet file and returns
//   { title, artist, blocks, rawText, usedOcr, junkCount, noiseCount }
// where blocks are { type:'label', text } | { type:'couplet', words:[{text}],
// chordMap:{wordIndex:[chords]}, tail:[chords] } | { type:'standalone-chords', text }.
export async function importSheetFile(file, { onLog } = {}){
  logHook = onLog || null;
  try{
    const r = await fileWordLines(file);
    return sheetFromLines(r.lines, r.usedOcr, file.name);
  } finally { logHook = null; }
}
// ---- several songs in one file ----
// A text file: songs separated by a page break (form feed), a divider line
// (---, ===, ***) or three or more empty lines.
function splitTextSegments(lines){
  const segs = [[]]; let blanks = 0;
  lines.forEach(l=>{
    const t = (l.text||'').trim();
    if(/\f/.test(l.text||'') || /^[-=_*~#]{3,}$/.test(t)){ blanks = 0; if(segs[segs.length-1].length) segs.push([]); return; }
    if(!t){ blanks++; if(blanks>=3 && segs[segs.length-1].length){ segs.push([]); return; } }
    else blanks = 0;
    segs[segs.length-1].push(l);
  });
  return segs.filter(s=>s.some(l=>(l.text||'').trim()));
}
// A PDF: page by page. A page starts a new song when it opens with a title
// — a line in a bigger font than the rest of the page (or, on a scanned
// page, a short line with a gap under it). A page that opens straight into
// chords, a section label or more lyrics carries on the song before it.
function splitPdfPages(lines){
  const pages = [[]];
  lines.forEach(l=>{ if(l.pageBreak){ if(pages[pages.length-1].length) pages.push([]); } else pages[pages.length-1].push(l); });
  return pages.filter(p=>p.some(l=>(l.text||'').trim() && !l.junk));
}
function pageStartsSong(page, usedOcr){
  const cls = classifyWordLines(page, usedOcr===true);
  const idx = cls.findIndex(c=>c.type!=='blank' && c.type!=='junk' && c.type!=='noise' && c.type!=='pagebreak');
  if(idx<0) return false;
  const first = cls[idx];
  if(first.type!=='lyric') return false;
  const sizes = page.filter((l,i)=>l.size && cls[i].type==='lyric').map(l=>l.size).sort((a,b)=>a-b);
  if(page[idx].size && sizes.length>=3){
    const median = sizes[Math.floor(sizes.length/2)];
    return page[idx].size >= median*1.18;
  }
  const next = cls[idx+1];
  return first.words.length<=8 && (!next || next.type==='blank' || /^(chords|lyrics|tabs?)?\s*by\s/i.test(next.text||''));
}
// Reads several files into songs. split=false: everything is one song (the
// files in order, e.g. the pages of one song). split=true: every file is at
// least one song, and a file holding several songs is cut into them.
export async function importSheetFiles(files, { onLog, split=false } = {}){
  logHook = onLog || null;
  try{
    const parts = [];
    for(const f of files){ const r = await fileWordLines(f); parts.push({ ...r, name:f.name }); }
    if(!split){
      const lines = [];
      parts.forEach((p,i)=>{ if(i) lines.push({ text:'', words:[], pageBreak:true }); lines.push(...p.lines); });
      return [sheetFromLines(lines, parts.some(p=>p.usedOcr), parts[0].name)];
    }
    const out = [];
    parts.forEach(p=>{
      let songs;
      if(p.kind==='pdf'){
        songs = [];
        splitPdfPages(p.lines).forEach((pg,i)=>{
          if(!i || pageStartsSong(pg, p.usedOcr) || !songs.length) songs.push([...pg]);
          else songs[songs.length-1].push({ text:'', words:[], pageBreak:true }, ...pg);
        });
      } else songs = splitTextSegments(plainTextToWordLines(p.lines.map(l=>l.text).join('\n').replace(/\f/g, '\n---\n')));
      if(!songs.length) songs = [p.lines];
      songs.forEach(lines=>{ const r = sheetFromLines(lines, p.usedOcr, p.name); r.fileName = p.name; out.push(r); });
    });
    return out.filter(r=>r.blocks.some(b=>b.type==='couplet'));
  } finally { logHook = null; }
}
export { plainTextToWordLines, classifyWordLines, buildSheetBlocks, extractHeader, extractTitle, mapChordsToWords };
