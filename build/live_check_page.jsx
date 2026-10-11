// live_check_page.jsx — the root of the "Cat Watch live check" page. build/live_check.js
// appends this to Cat_Watch.jsx and mounts LiveCheck instead of App, so every lookup
// below is the app's own code: lookupCatalogue, its connector and Claude calls, the
// lookup log (saveLookupTape). The card is the app's own too: App is mounted per case and
// its Catalogue section read as drawn. Nothing here searches, reads or draws a card.
// LC_CASES, LC_CARDS, LC_AKA, LC_VENUES and LC_BUILD are written in by the build.

// Claude's raw answer and the tier that answered. The app calls sample.json, which
// resolves to the parsed answer only, so the page hands the app a sample that is the
// real one plus an onText listener: the same call, the same modelTier, the raw text kept.
const lcReads=[];
const lcRealUseCap=useCap;
function lcWrapSample(ns){
  const w=(input,opts)=>ns(input,opts);
  w.limits=(...a)=>ns.limits(...a);
  w.json=(input,opts)=>{
    let raw=null;
    const o={...(opts||{}),onText:u=>{ raw=u.text; if(opts&&opts.onText)opts.onText(u); }};
    return ns.json(input,o).then(
      v=>{ lcReads.push({prompt:input,raw,ok:true,code:null}); return v; },
      e=>{ lcReads.push({prompt:input,raw:raw||(e&&e.text)||null,ok:false,code:String((e&&e.code)||"")}); throw e; });
  };
  return w;
}
// eslint-disable-next-line no-func-assign
const lcWatched=new WeakMap();
useCap=async function(name){
  const ns=await lcRealUseCap(name);
  if(name==="sample"&&ns)return lcWrapSample(ns);
  if(name==="db"&&ns){ if(!lcWatched.has(ns))lcWatched.set(ns,lcWatchDb(ns)); return lcWatched.get(ns); }
  return ns;
};

// The check page keeps every lookup record: the app keeps 50, which would delete earlier
// runs' records after about five runs.
// eslint-disable-next-line no-func-assign
pruneLookupLog=async function(){};

// NGA is an occasional venue: its entry, copied from her test page's store, is
// registered as the app registers one it reads from its own store.
registerOccasional(LC_VENUES);

// ── GRADING — only the fields docs/lookup_proof_cards.json states ──────────────
const lcFold=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ø/g,"o").toLowerCase();
const lcIsEnglish=l=>/\b(english|anglais|inglese|englisch|engels)\b/i.test(String(l||""));
const lcLangWord=l=>lcFold(l).split(/[^a-z]+/).filter(Boolean)[0]||"";
const LC_LANG_ALIASES={french:["french","francais","fr"],dutch:["dutch","nederlands","nl"],italian:["italian","italiano","it"],english:["english","en"]};
function lcSameLang(got,want){
  if(lcIsEnglish(want))return lcIsEnglish(got);
  const w=lcLangWord(want), g=lcLangWord(got);
  return (LC_LANG_ALIASES[w]||[w]).includes(g);
}
// A publisher is its SET of houses. Each side is split where the app recognises a
// separator, each house folded (accents, capitals, punctuation, a leading "the", trailing
// generic words only), and the sets must match both ways: no missing house, no extra one.
// Two names are one house only when folded equal or listed in the cards' `aka` map.
const LC_HOUSE_SPLIT=/\s*[\/;&]\s*|\s+:\s+|\s+(?:and|with)\s+/i;
const LC_HOUSE_TAILS=["editions d art","editions","edition","books","publishing","publishers","publications","ltd","limited","inc"];
function lcFoldHouse(s){
  let t=lcFold(s).replace(/[^a-z0-9]+/g," ").trim().replace(/^the /,"");
  for(;;){
    const hit=LC_HOUSE_TAILS.find(x=>t.length>x.length&&t.endsWith(" "+x));
    if(!hit)return t;
    t=t.slice(0,t.length-hit.length-1).trim();
  }
}
const lcHousesOf=s=>String(s==null?"":s).split(LC_HOUSE_SPLIT).map(lcFoldHouse).filter(Boolean);
const LC_AKA_PAIRS=Object.entries(LC_AKA).filter(([k])=>!k.startsWith("_")).flatMap(([k,others])=>others.map(o=>[lcFoldHouse(k),lcFoldHouse(o)]));
const lcSameHouse=(a,b)=>a===b||LC_AKA_PAIRS.some(([x,y])=>(x===a&&y===b)||(x===b&&y===a));
function lcSamePublisher(got,want){
  const g=lcHousesOf(got), w=lcHousesOf(want);
  if(!g.length||!w.length)return false;
  return g.every(a=>w.some(b=>lcSameHouse(a,b)))&&w.every(b=>g.some(a=>lcSameHouse(a,b)));
}
const lcIsbn=n=>n?fmtIsbn(n):"none";
const lcLangOf=v=>v?(langName(v.lang)||v.lang||"no language"):"";

// What the lookup returned, graded. `key` names the fact graded ("<isbn>|<fact>"): the
// card grades below use the same keys, so one fact failing in both tables counts once.
function lcGrade(card,row){
  const out=[];
  const add=(field,verdict,got,want,why,key)=>out.push({field,verdict,got:got==null?"":String(got),want:want==null?"":String(want),why:why||null,key:key||"row:"+field});
  const vs=Array.isArray(row&&row.editions)?row.editions.filter(Boolean):[];
  const used=new Set();
  for(const want of card.versions){
    const label=want.lang+" "+lcIsbn(want.isbn13);
    const v=vs.find(x=>x.isbn13===want.isbn13||x.alsoIsbn13===want.isbn13);
    const k=f=>want.isbn13+"|"+f;
    add(label+" — listed as a version",v?"pass":"fail",v?"listed":"not listed","listed",null,k("listed"));
    if(!v)continue;
    used.add(v);
    const gotAlso=v.isbn13===want.isbn13?v.alsoIsbn13:v.isbn13;
    add(label+" — second number on the block",(gotAlso||null)===(want.alsoIsbn13||null)?"pass":"fail",lcIsbn(gotAlso),lcIsbn(want.alsoIsbn13),null,k("alsoIsbn"));
    if(v.isbn13!==want.isbn13)add(label+" — number the block leads with","fail",lcIsbn(v.isbn13),lcIsbn(want.isbn13),null,k("leads"));
    add(label+" — language",lcSameLang(v.lang,want.lang)?"pass":"fail",lcLangOf(v),want.lang,null,k("language"));
    add(label+" — publisher",lcSamePublisher(v.publisher,want.publisher)?"pass":"fail",v.publisher||"none",want.publisher,null,k("publisher"));
    add(label+" — showing",v.showing===want.showing?"pass":"fail",v.showing==="other"?"another showing":"this show",want.showing==="other"?"another showing":"this show",null,k("showing"));
  }
  const extras=vs.filter(v=>!used.has(v));
  add("No other versions listed",extras.length?"fail":"pass",extras.length?extras.map(v=>lcLangOf(v)+" "+lcIsbn(v.isbn13)+(v.publisher?" ("+v.publisher+")":"")).join("; "):"none","none",null,"extras");
  const left=(card.leftOff||[]).filter(n=>vs.some(v=>v.isbn13===n||v.alsoIsbn13===n));
  if((card.leftOff||[]).length)add("Left off: "+card.leftOff.map(lcIsbn).join(", "),left.length?"fail":"pass",left.length?"listed: "+left.map(lcIsbn).join(", "):"left off","left off",null,"leftoff");
  const i=row&&row.editionPick;
  const picked=Number.isInteger(i)&&vs[i]?vs[i]:null;
  // A single-version card has no pick of its own: its one book is the pick.
  const pickIsbn=picked?picked.isbn13:(vs.length===1&&!Number.isInteger(i)?vs[0].isbn13:null);
  add("Starting pick",pickIsbn===card.pick?"pass":"fail",pickIsbn?lcIsbn(pickIsbn):"nothing picked",card.pick?lcIsbn(card.pick):"nothing picked",null,"pick");
  return out;
}

// ── THE CARD AS THE APP DRAWS IT ─────────────────────────────────────────────
// The app's own App is mounted in a hidden box, the case's returned row goes in through
// its Load button (a File on the .json input), the card's Catalogue section is opened and
// read as rendered, and the app is unmounted. Nothing here draws a card. The app's store
// calls while it is mounted are recorded (lcRun.appOps).
const lcPause=ms=>new Promise(r=>setTimeout(r,ms));
async function lcUntil(find,what,ms=10000){
  const t0=Date.now();
  for(;;){
    const v=find();
    if(v)return v;
    if(Date.now()-t0>ms)throw new Error("timed out waiting for "+what);
    await lcPause(8);
  }
}
// The mounted app paints the page's theme on <html> and <body>; put back what was there.
function lcGround(){
  const d=document.documentElement, b=document.body;
  const was={theme:d.getAttribute("data-theme"),scheme:d.style.colorScheme,bg:b.style.background,fg:b.style.color};
  return()=>{
    if(was.theme===null)d.removeAttribute("data-theme"); else d.setAttribute("data-theme",was.theme);
    d.style.colorScheme=was.scheme; b.style.background=was.bg; b.style.color=was.fg;
  };
}
function lcSetFile(input,file){
  try{ const dt=new window.DataTransfer(); dt.items.add(file); input.files=dt.files; }
  catch{
    Object.defineProperty(input,"files",{value:[file],configurable:true});
    Object.defineProperty(input,"value",{get:()=>"",set(){},configurable:true});
  }
}
const lcIsAction=el=>el.tagName==="BUTTON"||el.tagName==="A"||(el.children.length>0&&[...el.children].every(c=>c.tagName==="A"||c.tagName==="BUTTON"));
const lcLineOf=el=>({text:el.textContent.replace(/\s+/g," ").trim(),title:/Fraunces/.test(el.getAttribute("style")||"")});
// A card with versions: each [role=radio] block (marker, then its lines). Any other card
// (one book, no catalogue, not searched): the section's lines above its buttons, as ONE block.
function lcReadSection(article){
  const panel=article.children[1];
  if(!panel)return null;
  const radios=[...panel.querySelectorAll("[role=radio]")];
  if(radios.length)return{kind:"blocks",blocks:radios.map(b=>({marker:b.children[0].textContent.trim(),picked:b.getAttribute("aria-checked")==="true",lines:[...b.children[1].children].map(lcLineOf)}))};
  const kids=panel.children[0]?[...panel.children[0].children]:[];
  const end=kids.findIndex(lcIsAction);
  return{kind:"single",blocks:[{marker:null,picked:true,lines:(end<0?kids:kids.slice(0,end)).map(lcLineOf).filter(l=>l.text)}]};
}
async function lcReadRealCard(row){
  const restore=lcGround();
  const host=document.createElement("div");
  host.setAttribute("aria-hidden","true");
  host.style.cssText="position:absolute;left:-10000px;top:0;width:820px;height:1px;overflow:hidden;visibility:hidden";
  document.body.appendChild(host);
  const root=ReactDOM.createRoot(host);
  const ops=[]; lcRun.appOps=ops;
  let card;
  try{
    root.render(<App/>);
    const input=await lcUntil(()=>host.querySelector('input[type=file][accept=".json"]'),"the app's Load button");
    const ledgerRow={interested:true,watching:false,acquiring:"yes",buyNext:false,looked:true,...row};
    lcSetFile(input,new window.File([JSON.stringify({rows:[ledgerRow],ignored:[]})],"case.json",{type:"application/json"}));
    input.dispatchEvent(new window.Event("change",{bubbles:true}));
    const find=()=>[...host.querySelectorAll("article")].find(a=>((a.querySelector("h3")||{}).textContent||"").includes(row.title));
    const art=await lcUntil(find,"the card after Load");
    const open=[...art.querySelectorAll("button")].find(b=>/Catalogue$/.test(b.textContent.trim()));
    if(!open)throw new Error("the card has no Catalogue button");
    open.click();
    await lcUntil(()=>{ const a=find(); return a&&a.children[1]; },"the card's Catalogue section");
    card={ok:true,error:null,...lcReadSection(find())};
  }catch(e){ card={ok:false,error:lcMsgOf(e),kind:"none",blocks:[]}; }
  finally{ try{ root.unmount(); }catch{} host.remove(); restore(); lcRun.appOps=null; }
  card.appStore={reads:ops.filter(o=>o.op==="get").map(o=>o.path),writes:ops.filter(o=>o.op!=="get").map(o=>o.op+" "+o.path)};
  return card;
}

// ── GRADING THE CARD AS DRAWN ────────────────────────────────────────────────
// Blocks are matched to versions by the ISBN on the block's ISBN line. Each stated fact
// (language, binding, pages, publisher, ISBN, second ISBN, note) must be on a line of its
// block: right → pass, a different value → fail, absent → fail "not shown on the card".
// Every line, or part of a line (split on " · "), that no stated fact accounts for is
// "unchecked": titles, shop lines and sources have no recorded answer. Roles come from
// the text (ISBN line, facts line, shop line) and the title's own font; the lines after
// the ISBN line are the note and source.
const LC_NOT_SHOWN="not shown on the card";
const LC_UNCHECKED="not checked — no right answer recorded";
const LC_LANGUAGES=["english","french","dutch","italian","german","spanish","portuguese","swedish","danish","norwegian","finnish","russian","polish","czech","hungarian","greek","latin","japanese","chinese","korean","turkish","arabic","catalan"];
const lcBindPart=t=>/^(hardcover|paperback)$/i.test(t);
const lcPagesPart=t=>/^\d+ pp$/.test(t);
const lcShopLeads=()=>[shopHeadline("shop",null),shopHeadline("shop","now"),shopHeadline("shop","back"),shopHeadline("gone",null),
  NOT_IN_SHOP.split(" —")[0],SHOP_BLOCKED_HEAD,SHOP_CHECK_UNFINISHED,"Venue has no shop","Museum shop not found"];
const lcStraight=s=>String(s==null?"":s).replace(/[‘’]/g,"'");
const lcNoteForm=s=>lcFold(lcStraight(s)).replace(/\s+/g," ").trim().replace(/\.$/,"");
const lcISBNS=/97[89]-\d{10}/g;

function lcPartsOf(lines,isLang){
  const isFacts=t=>{ const p=t.split(" · "); return p.every((x,i)=>(i===0&&isLang(x))||lcBindPart(x)||lcPagesPart(x)); };
  const leads=lcShopLeads();
  const isbnAt=lines.findIndex(l=>/^ISBN\b/.test(l.text));
  const parts=[];
  lines.forEach((l,i)=>{
    let role, texts;
    if(i===isbnAt){ role="isbn"; texts=l.text.split(/ · |; /); }
    else if(isbnAt>=0&&i>isbnAt){ role="tail"; texts=l.text.split(/\s+(?=Source: )/); }
    else if(l.title){ role="title"; texts=[l.text]; }
    else if(leads.some(x=>l.text.startsWith(x))){ role="shop"; texts=[l.text]; }
    else if(isFacts(l.text)){ role="facts"; texts=l.text.split(" · "); }
    else{ role="pub"; texts=l.text.split(" · "); }
    texts.forEach((t,j)=>parts.push({line:i,role,text:t,first:j===0,fact:null,verdict:null}));
  });
  return{parts,isbnLine:lines[isbnAt]||null};
}
const LC_ROLE_NAME={isbn:"ISBN line",tail:"note or source",title:"title",shop:"shop line",facts:"facts line",pub:"publisher line"};

function lcGradeCard(want,drawn){
  const rows=[], unchecked=[];
  const add=r=>rows.push({why:null,got:"",want:"",key:null,...r});
  if(!drawn.ok){
    add({field:"The app drew the card",verdict:"fail",got:drawn.error||"no card",want:"a card",key:"drawn"});
    return{grades:rows,card:{...drawn,blocks:[]}};
  }
  const langs=want.versions.map(v=>lcFold(v.lang));
  const isLang=t=>LC_LANGUAGES.includes(lcFold(t))||langs.includes(lcFold(t));
  const blocks=drawn.blocks.map(b=>({...b,...lcPartsOf(b.lines,isLang),version:null}));
  const numsOf=b=>b.isbnLine?(b.isbnLine.text.match(lcISBNS)||[]):[];
  for(const w of want.versions){
    const label=w.lang+" "+lcIsbn(w.isbn13);
    const m=blocks.find(b=>!b.version&&numsOf(b).includes(fmtIsbn(w.isbn13)));
    if(m)m.version=label;
    const key=f=>w.isbn13+"|"+f;
    const grade=(fact,verdict,got,wanted,part,k)=>{
      add({field:label+" — "+fact,verdict,got,want:wanted,why:got===""?LC_NOT_SHOWN:null,key:k||key(fact)});
      if(part){ part.verdict=verdict; part.fact=fact; }
    };
    const partsOf=(role,test)=>m?m.parts.filter(p=>p.role===role&&test(p)):[];
    // ISBN
    const nums=m?numsOf(m):[];
    const isbnPart=m?m.parts.find(p=>p.role==="isbn"&&p.first):null;
    if(!m)grade("ISBN","fail","",fmtIsbn(w.isbn13),null,key("listed"));
    else if(nums[0]===fmtIsbn(w.isbn13))grade("ISBN","pass",nums[0],fmtIsbn(w.isbn13),isbnPart,key("listed"));
    else grade("ISBN","fail",nums[0]||m.isbnLine.text,fmtIsbn(w.isbn13),isbnPart,key("leads"));
    // Second ISBN
    if(w.alsoIsbn13){
      const second=m?m.parts.filter(p=>p.role==="isbn")[1]:null;
      const wantAlso=fmtIsbn(w.alsoIsbn13);
      if(second&&nums[1]===wantAlso)grade("second ISBN","pass",nums[1],wantAlso,second,key("alsoIsbn"));
      else grade("second ISBN","fail",second?second.text:"",wantAlso,second,key("alsoIsbn"));
    }
    // Language, binding, pages — the facts line
    const lang=partsOf("facts",p=>isLang(p.text))[0];
    grade("language",lang&&lcSameLang(lang.text,w.lang)?"pass":"fail",lang?lang.text:"",w.lang,lang||null,key("language"));
    if(w.binding){
      const b=partsOf("facts",p=>lcBindPart(p.text))[0];
      grade("binding",b&&b.text.toLowerCase()===w.binding?"pass":"fail",b?b.text:"",w.binding,b||null);
    }
    if(w.pages){
      const pg=partsOf("facts",p=>lcPagesPart(p.text))[0];
      grade("pages",pg&&parseInt(pg.text,10)===w.pages?"pass":"fail",pg?pg.text:"",w.pages+" pp",pg||null);
    }
    // Publisher — the text before any " · " on the publisher line
    if(w.publisher){
      const cands=partsOf("pub",p=>p.first);
      const hit=cands.find(p=>lcSamePublisher(p.text,w.publisher))||cands[0];
      grade("publisher",hit&&lcSamePublisher(hit.text,w.publisher)?"pass":"fail",hit?hit.text:"",w.publisher,hit||null);
    }
    // Note — the line that says why this version is listed
    if(typeof w.note==="string"){
      const notes=partsOf("tail",p=>!/^Source: /.test(p.text));
      const hit=notes.find(p=>lcNoteForm(p.text)===lcNoteForm(w.note))||notes[0];
      grade("note",hit&&lcNoteForm(hit.text)===lcNoteForm(w.note)?"pass":"fail",hit?hit.text:"",w.note,hit||null);
    }
  }
  // The pick: the ● marker.
  if(drawn.kind==="blocks"){
    const first=b=>numsOf(b)[0]||"no ISBN";
    const marked=blocks.filter(b=>b.picked).map(first);
    const wantPick=want.pick?fmtIsbn(want.pick):null;
    const right=wantPick?(marked.length===1&&marked[0]===wantPick):marked.length===0;
    add({field:"Starting pick (the ● marker)",verdict:right?"pass":"fail",got:marked.length?marked.join(", "):"nothing picked",want:wantPick||"nothing picked",key:"pick"});
  }else{
    unchecked.push({field:"Starting pick (the ● marker)",got:"a card with one book draws no marker",why:"not checked — its one book is the pick"});
  }
  // Everything no stated fact accounted for.
  blocks.forEach((b,k)=>{
    const where=drawn.kind==="blocks"?"Block "+(k+1)+(b.version?" ("+b.version+")":" (no stated version has this ISBN)"):"The card";
    b.parts.forEach(p=>{ if(!p.verdict)unchecked.push({field:where+" — "+LC_ROLE_NAME[p.role],got:p.text,why:LC_UNCHECKED}); });
  });
  for(const u of unchecked)add({field:u.field,verdict:"unchecked",got:u.got,want:"",why:u.why});
  // The card as it is stored: every line with the verdict of each of its parts.
  const out={...drawn,blocks:blocks.map(b=>({marker:b.marker,picked:b.picked,version:b.version,lines:b.lines.map((l,i)=>{
    const ps=b.parts.filter(p=>p.line===i).map(p=>({text:p.text,fact:p.fact,verdict:p.verdict||"unchecked"}));
    return{text:l.text,verdict:ps.some(p=>p.verdict==="fail")?"fail":ps.every(p=>p.verdict==="pass")?"pass":"unchecked",parts:ps};
  })}))};
  return{grades:rows,card:out};
}

// One count for a case: each fact once, even when it fails in both tables.
function lcCount(...tables){
  const seen=new Map();
  let unchecked=0;
  for(const g of tables.flat()){
    if(g.verdict==="unchecked"){ unchecked++; continue; }
    if(g.verdict!=="pass"&&g.verdict!=="fail")continue;
    const k=g.key||"row:"+g.field;
    seen.set(k,seen.get(k)==="fail"||g.verdict==="fail"?"fail":"pass");
  }
  return{checks:seen.size,fails:[...seen.values()].filter(v=>v==="fail").length,unchecked};
}

// ── SAVING — every write goes through lcWrite; the app's own writes are watched ───
const LC_RUNS="checks", LC_PIECE=150000;
// Waits are injectable so tests never sleep. The 20–40 s and 1 s windows are judgement:
// the store's contract gives none.
let lcSleep=ms=>new Promise(r=>setTimeout(r,ms));
const lcBetween=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const LC_NO_RETRY=["invalid_argument","quota_exceeded","revoked","transform_error","not_granted","capability_disabled","capability_removed","TypeError"];
const LC_KNOWN=[...LC_NO_RETRY,"resource_exhausted","unavailable"];
const lcCodeOf=e=>e&&e.code?String(e.code):(e&&e.name==="TypeError"?"TypeError":"unknown");
const lcMsgOf=e=>String((e&&e.message)||e||"");
const lcErr=e=>lcCodeOf(e)+": "+lcMsgOf(e);

// One run's state: the raw store, every problem so far, and whether writes are spaced.
let lcRun={db:null,problems:[],spaced:false,caseNo:null,lookupPath:null,appError:null,active:false,appOps:null};
function lcRecord(p){
  const rec={at:new Date().toISOString(),case:lcRun.caseNo,what:"",path:"",op:"",code:"",message:"",attempt:1,retried:false,outcome:"not saved",...p};
  lcRun.problems.push(rec);
  return rec;
}

// The store's own instructions by code: a transient code waits 1–3 s and retries that one
// write; the per-viewer call rate waits longer, retries, then spaces every later write;
// every other code cannot succeed again. Never throws: {ok, value} or {ok:false, error}.
async function lcWrite(op,path,data,what){
  let first=null;
  for(let attempt=1;;attempt++){
    if(lcRun.spaced&&attempt===1)await lcSleep(1000);
    try{
      const db=lcRun.db;
      let value;
      if(op==="list")value=await db.collection(path).get();
      else{ const ref=db.doc(path); value=await (op==="get"?ref.get():op==="delete"?ref.delete():ref[op](data)); }
      if(first)first.outcome="saved on retry";
      return{ok:true,value};
    }catch(e){
      const code=lcCodeOf(e);
      const retry=attempt===1&&!LC_NO_RETRY.includes(code);
      const rec=lcRecord({what,path,op,code,message:lcMsgOf(e),attempt,retried:retry,outcome:retry?"pending":"not saved"});
      if(attempt===2){ if(first)first.outcome="not saved"; return{ok:false,error:e}; }
      if(!retry)return{ok:false,error:e};
      first=rec;
      if(code==="resource_exhausted"){ await lcSleep(lcBetween(20000,40000)); lcRun.spaced=true; }
      else await lcSleep(lcBetween(1000,3000));
    }
  }
}

// The app's writes, watched and never changed: a rejection is recorded, then rethrown.
function lcWatchDb(raw){
  const note=(op,path,e)=>{
    if(!lcRun.active)return;
    lcRun.appError=e;
    lcRecord({what:op==="get"?"the app's read":"the app's write",path,op,code:lcCodeOf(e),message:lcMsgOf(e)});
  };
  const watch=(op,path,fn)=>async(...a)=>{ if(lcRun.appOps)lcRun.appOps.push({op,path}); try{ return await fn(...a); }catch(e){ note(op,path,e); throw e; } };
  const query=(q,path)=>({
    where:(...a)=>query(q.where(...a),path), orderBy:(...a)=>query(q.orderBy(...a),path), limit:(...a)=>query(q.limit(...a),path),
    get:watch("get",path,()=>q.get()), onSnapshot:(...a)=>q.onSnapshot(...a)});
  const col=(c,path)=>({...query(c,path),path,
    doc:id=>docRef(c.doc(id),id===undefined?c.doc(id).path:path+"/"+id),
    add:watch("set",path,d=>c.add(d))});
  const docRef=(r,path)=>({id:r.id,path,
    get:watch("get",path,()=>r.get()),
    set:watch("set",path,d=>{ if(new RegExp("^"+LOOKUP_LOG+"/[^/]+$").test(path))lcRun.lookupPath=path; return r.set(d); }),
    update:watch("update",path,d=>r.update(d)),
    delete:watch("delete",path,()=>r.delete()),
    collection:n=>col(r.collection(n),path+"/"+n),
    onSnapshot:(...a)=>r.onSnapshot(...a)});
  return{doc:p=>docRef(raw.doc(p),p),collection:p=>col(raw.collection(p),p)};
}

// Why a case's parts did not save, and what each problem line says.
const lcUnsavedOf=(problems,n)=>[...new Set(problems.filter(p=>p.case===n&&p.outcome==="not saved").map(p=>p.what))];
const lcLine=(p,withPath)=>p.what+" — "+p.code+": "+p.message+" — "+(p.retried?"retried, ":"not retried, ")+p.outcome+(withPath&&p.path?" ("+p.op+" "+p.path+")":"");

async function lcPutText(path,text,what,ok){
  const t=String(text==null?"":text), n=Math.max(1,Math.ceil(t.length/LC_PIECE));
  for(let i=0;i<n;i++){
    const r=await lcWrite("set",path+"/"+i,{text:t.slice(i*LC_PIECE,(i+1)*LC_PIECE),i,of:n},what+(n>1?" (piece "+(i+1)+" of "+n+")":""));
    if(!r.ok)ok.value=false;
  }
  return n;
}
function lcPiecesOf(text){ return Math.max(1,Math.ceil(String(text==null?"":text).length/LC_PIECE)); }
function lcCallsOf(tape){
  return (tape.calls||[]).filter(c=>c.kind!=="claude").map(c=>({n:c.n,kind:c.kind==="open"?"open page":"search",
    queries:(c.input&&c.input.queries)||null,objective:(c.input&&c.input.objective)||null,
    asked:(c.input&&c.input.urls)||null,ok:!!(c.output&&c.output.ok),detail:(c.output&&c.output.detail)||"",
    results:((c.output&&c.output.results)||[]).map(r=>r&&r.url||"").filter(Boolean),
    refused:((c.output&&c.output.errors)||[]).map(e=>(e&&e.url||"")+" "+String((e&&(e.http_status_code||e.error_type))||"")).filter(Boolean)}));
}
// Claude's calls from the tape, each with the raw answer the listener caught for
// that prompt (two run at once, so they are paired by prompt, not by order).
function lcReadsOf(tape,raws){
  const left=raws.slice();
  return (tape.calls||[]).filter(c=>c.kind==="claude").map(c=>{
    const p=c.input&&c.input.prompt, k=left.findIndex(r=>r.prompt===p);
    const r=k<0?null:left.splice(k,1)[0];
    return{n:c.n,prompt:p,raw:r?r.raw:null,ok:!!(c.output&&c.output.ok),detail:(c.output&&c.output.detail)||"",
      parsed:c.output&&c.output.data!==undefined?JSON.stringify(c.output.data):null};
  });
}
// Save order loses the least: the case record, then each read's header, then its prompt and
// answer. A failed write does not stop the rest. True when every write landed.
async function lcSaveCase(runId,rec,reads){
  const base=LC_RUNS+"/"+runId+"/cases/"+rec.case;
  const head=await lcWrite("set",base,{...rec,reads:reads.map(r=>r.n)},"the case record");
  let all=head.ok;
  for(const r of reads){
    const h=await lcWrite("set",base+"/reads/"+r.n,{n:r.n,ok:r.ok,detail:r.detail,parsed:r.parsed,promptPieces:lcPiecesOf(r.prompt),answerPieces:lcPiecesOf(r.raw)},"the header of Claude’s read "+r.n);
    if(!h.ok)all=false;
  }
  const ok={value:true};
  for(const r of reads){
    await lcPutText(base+"/reads/"+r.n+"/prompt",r.prompt,"Claude’s prompt, read "+r.n,ok);
    await lcPutText(base+"/reads/"+r.n+"/answer",r.raw,"Claude’s answer, read "+r.n,ok);
  }
  return{caseWritten:head.ok,all:all&&ok.value};
}

// Reads the store back: the run record, its cases, and each case's lookup record.
// Returns {failed} when a read fails, else {missing:[sentence parts]}.
async function lcReadBack(runPath,cases){
  const list=await lcWrite("list",runPath+"/cases",null,"the read-back of the cases");
  if(!list.ok)return{failed:list.error};
  const run=await lcWrite("get",runPath,null,"the read-back of the run record");
  if(!run.ok)return{failed:run.error};
  const have=new Set(list.value.docs.map(d=>String(d.id)));
  const missing=[];
  if(!run.value.exists)missing.push("the run record");
  for(const c of cases){
    let lookupMissing=true;
    if(c.lookupPath){
      const l=await lcWrite("get",c.lookupPath,null,"the read-back of the lookup record");
      if(!l.ok)return{failed:l.error};
      lookupMissing=!(l.value.exists&&(l.value.data()||{}).complete===true);
    }
    const recMissing=!have.has(String(c.case));
    if(recMissing||lookupMissing)missing.push("case "+c.case+"'s "+[recMissing?"record":null,lookupMissing?"lookup record":null].filter(Boolean).join(" and its "));
  }
  return{missing};
}
// "Saved" only when the read-back found everything.
function lcFinalLine(hasStore,back,unsavedParts){
  if(!hasStore)return "Finished, but this page couldn’t reach its store, so nothing was saved.";
  if(back.failed)return "Finished, but this page couldn’t read the store back to check what saved ("+lcErr(back.failed)+").";
  if(back.missing.length)return "Finished, but "+back.missing.join("; ")+(back.missing.length>1||/ and /.test(back.missing[0])?" are":" is")+" missing from the store.";
  if(unsavedParts)return "Finished. Every case and every lookup record is in the store, but "+unsavedParts+" other write"+(unsavedParts===1?"":"s")+" did not save — see Problems.";
  return "Finished. Every case and every lookup record is saved.";
}

// ── THE PAGE ────────────────────────────────────────────────────────────────
const LC_STYLE=`
  .lc{max-width:860px;margin:0 auto;padding:20px 16px 48px;font-size:14px;line-height:1.45}
  .lc h1{font-size:20px;margin:0 0 4px;font-weight:600}
  .lc .soft{opacity:.72}
  .lc button.run{font:inherit;font-weight:600;padding:10px 26px;border-radius:6px;border:2px solid var(--ink);background:var(--ink);color:var(--ground);cursor:pointer;margin:14px 0}
  .lc button.run:disabled{opacity:.45;cursor:default}
  .lc .case{border:1px solid color-mix(in srgb,var(--ink) 22%,transparent);border-radius:6px;padding:12px 14px;margin:12px 0}
  .lc .case h2{font-size:15px;margin:0 0 6px;font-weight:600}
  .lc table{width:100%;border-collapse:collapse;font-size:12.5px;table-layout:fixed}
  .lc td,.lc th{text-align:left;vertical-align:top;padding:4px 6px;border-top:1px solid color-mix(in srgb,var(--ink) 14%,transparent);overflow-wrap:anywhere}
  .lc th{font-weight:600}
  .lc .v{font-weight:700;white-space:nowrap}
  .lc .fail .v{text-decoration:underline}
  .lc .block{border-left:3px solid color-mix(in srgb,var(--ink) 30%,transparent);padding:4px 10px;margin:6px 0;font-size:12.5px}
  .lc .block.picked{border-left-width:6px}
  .lc .status{font-weight:600}
  .lc .tag{font-size:10.5px}
  .lc .tag.fail{font-weight:700}
  @media (max-width:560px){.lc td:nth-child(3),.lc th:nth-child(3){display:none}}
`;
const LC_MARK={"pass":"✓ Pass","fail":"✗ Fail","unchecked":"– Not checked"};

function LcTable({title,grades}){
  return(<>
    <div style={{marginTop:10,fontWeight:600,fontSize:12.5}}>{title}</div>
    <table><thead><tr><th style={{width:"42%"}}>What is checked</th><th style={{width:"18%"}}>Result</th><th>Came back</th><th>Right answer</th></tr></thead>
      <tbody>{grades.map((g,k)=>(
        <tr key={k} className={g.verdict==="fail"?"fail":""}><td>{g.field}{g.why&&<div className="soft">{g.why}</div>}</td><td className="v">{LC_MARK[g.verdict]}</td><td>{g.got}</td><td>{g.want}</td></tr>))}
      </tbody></table>
  </>);
}

function LcCase({c,problems}){
  const mine=problems.filter(p=>p.case===c.case);
  const lost=lcUnsavedOf(problems,c.case);
  return(
    <div className="case">
      <h2>{c.case}. {c.title} <span className="soft">({c.venue})</span></h2>
      <div className="status">{c.verdict}</div>
      <div className="soft" style={{fontSize:11.5}}>Lookup record: {c.lookupId?c.lookupId+" ("+c.lookupPath+")":"none written"}</div>
      {c.trouble&&<div className="soft">The lookup said: {c.trouble}</div>}
      {lost.length>0&&<div className="status">Did not save: {lost.join("; ")}.</div>}
      {mine.map((p,k)=><div key={k} className="soft">{lcLine(p,false)}</div>)}
      <div className="soft" style={{fontSize:11.5}}>Each fact is counted once, even when it fails both in what the lookup returned and on the card.</div>
      <LcTable title="What the lookup returned" grades={c.grades}/>
      <LcTable title="On the card" grades={c.cardGrades}/>
      <div style={{marginTop:10,fontWeight:600,fontSize:12.5}}>The card as the app shows it</div>
      {c.card.ok===false&&<div className="soft">Not drawn: {c.card.error}</div>}
      {c.card.appStore&&<div className="soft" style={{fontSize:11.5}}>While the app was open it read {c.card.appStore.reads.length?c.card.appStore.reads.join(", "):"nothing"} from the store and wrote {c.card.appStore.writes.length?c.card.appStore.writes.join(", "):"nothing"}.</div>}
      {c.card.blocks.map((b,k)=>(
        <div key={k} className={"block"+(b.picked?" picked":"")}>
          {c.card.kind==="blocks"&&<div className="soft">{b.picked?"● picked":"○"}</div>}
          {b.lines.map((l,j)=><div key={j}>{l.parts.map((p,i)=><span key={i}>{i?" · ":""}{p.text} <span className={"soft tag "+p.verdict}>{p.verdict==="pass"?"✓":p.verdict==="fail"?"✗":"not checked"}</span></span>)}</div>)}
        </div>))}
    </div>);
}

function LiveCheck(){
  const [running,setRunning]=useState(false);
  const [status,setStatus]=useState("");
  const [done,setDone]=useState([]);
  const [finished,setFinished]=useState(null);
  const [problems,setProblems]=useState([]);

  async function run(){
    setRunning(true); setDone([]); setFinished(null); setProblems([]);
    const rawDb=await lcRealUseCap("db");
    const runId="R"+Date.now()+Math.random().toString(36).slice(2,6);
    const runPath=LC_RUNS+"/"+runId;
    lcRun={db:rawDb,problems:[],spaced:false,caseNo:null,lookupPath:null,appError:null,active:true,appOps:null};
    const shown=()=>setProblems(lcRun.problems.slice());
    const at=new Date().toISOString();
    // Which tier answers the app's modelTier:"default" (sample.json does not say).
    setStatus("Asking Claude which model tier answers…");
    let tier={modelTierApplied:null,modelApplied:null,error:null};
    try{
      const s=await lcRealUseCap("sample");
      if(!s)tier.error="Claude isn’t available to this page.";
      else{ const r=await s("Reply with the one word: ready",{modelTier:"default",cache:false}); tier={modelTierApplied:r.modelTierApplied||null,modelApplied:r.modelApplied||null,error:null}; }
    }catch(e){ tier.error=lcErr(e); }
    const head={at,branch:LC_BUILD.branch,commit:LC_BUILD.commit,builtAt:LC_BUILD.builtAt,appVersionInCode:LC_BUILD.appVersion,
      modelTierAsked:"default",modelTierApplied:tier.modelTierApplied,modelApplied:tier.modelApplied,
      modelNote:tier.modelApplied?null:"modelApplied is reported only when a page names a model; the app asks by modelTier only.",
      tierError:tier.error,cases:LC_CASES.length,done:0,savedCases:[],unsavedCases:[],problems:[],finished:false,saved:!!rawDb};
    if(rawDb)await lcWrite("set",runPath,head,"the run record");
    const all=[], saved=[], unsaved=[], lookups=[];
    for(const x of LC_CASES){
      const card=LC_CARDS.find(c=>c.case===x.case);
      const mu=MU[x.row.museumId];
      setStatus("Case "+x.case+" of "+LC_CASES.length+": "+x.row.title+" — searching…");
      lcReads.length=0;
      lcRun.caseNo=x.case; lcRun.lookupPath=null; lcRun.appError=null;
      const tape=tapeStart("Live check",x.row);
      let out;
      try{
        out=await lookupCatalogue(x.row,{label:l=>setStatus("Case "+x.case+" of "+LC_CASES.length+": "+x.row.title+" — "+l),prepareShop:async()=>{}});
      }catch(e){ out={ok:false,row:null,detail:"The lookup threw: "+lcErr(e)}; }
      const reads=lcReadsOf(tape,lcReads.splice(0));
      const calls=lcCallsOf(tape);
      const tapeSaved=await saveLookupTape(tape,out);
      if(rawDb&&!tapeSaved){
        const e=lcRun.appError;
        lcRecord({what:"the lookup record",path:lcRun.lookupPath||"",op:"set",code:e?lcCodeOf(e):"none",
          message:e?"the lookup record did not save ("+lcMsgOf(e)+")":"no store error was raised; the app returned false"});
      }
      const lookupPath=lcRun.lookupPath, lookupId=lookupPath?lookupPath.split("/").pop():null;
      lookups.push({case:x.case,lookupId,lookupPath});
      const row=out&&out.row;
      // What the lookup returned, then the card the app draws from it.
      const grades=row?lcGrade(card,row):[{field:"The lookup finished",verdict:"fail",got:"no",want:"yes",why:null,key:"row:finished"}];
      if(row)setStatus("Case "+x.case+" of "+LC_CASES.length+": "+x.row.title+" — reading the card the app draws…");
      const onCard=row?lcGradeCard(card,await lcReadRealCard(row)):{grades:[],card:{ok:false,error:"The lookup returned no row, so no card was drawn.",kind:"none",blocks:[],appStore:null}};
      const n=lcCount(grades,onCard.grades);
      const rec={case:x.case,title:x.row.title,venue:mu?mu.name:x.row.museumId,museumId:x.row.museumId,
        lookupAt:new Date(tape.t0).toISOString(),ms:Date.now()-tape.t0,lookupId,lookupPath,
        ok:!!(out&&out.ok),trouble:(out&&out.trouble)||null,panel:(out&&out.detail)||null,
        verdict:(out&&out.ok?"":"The lookup did not finish. ")+(n.fails?n.fails+" of "+n.checks+" checks failed.":"Every graded check passed.")+(n.unchecked?" "+n.unchecked+" lines or parts on the card not checked.":""),
        counted:n,grades,cardGrades:onCard.grades,card:onCard.card,row:row?cardFields(row):null,calls};
      if(rawDb){
        const r=await lcSaveCase(runId,rec,reads);
        if(r.caseWritten)saved.push(x.case);
        else{ const p=lcRun.problems.filter(q=>q.case===x.case&&q.what==="the case record").pop(); unsaved.push({case:x.case,error:p?p.code+": "+p.message:"not written"}); }
        await lcWrite("update",runPath,{done:saved.length,savedCases:saved,unsavedCases:unsaved,lookups,problems:lcRun.problems.slice()},"the run record");
      }
      all.push(rec); setDone(all.slice()); shown();
    }
    lcRun.caseNo=null;
    if(rawDb)await lcWrite("update",runPath,{finished:true,endedAt:new Date().toISOString(),done:saved.length,savedCases:saved,unsavedCases:unsaved,lookups,problems:lcRun.problems.slice(),
      failedCases:all.filter(r=>r.counted.fails>0).map(r=>r.case)},"the run record");
    const back=rawDb?await lcReadBack(runPath,lookups):null;
    lcRun.active=false;
    setStatus("");
    setFinished(lcFinalLine(!!rawDb,back,lcRun.problems.filter(p=>p.outcome==="not saved"&&(!p.retried||p.attempt===2)).length));
    shown(); setRunning(false);
  }

  return(
    <div className="lc">
      <style>{LC_STYLE}</style>
      <h1>Cat Watch live check</h1>
      <div className="soft">Code under test: {LC_BUILD.branch} {"·"} commit {LC_BUILD.commit} {"·"} built {LC_BUILD.builtAt}</div>
      <div className="soft">{LC_CASES.length} cases, searched live through Parallel Search Key and read by Claude, as the app does.</div>
      <button className="run" onClick={run} disabled={running}>{running?"Running…":"Run"}</button>
      {status&&<div className="status">{status}</div>}
      {finished&&<div className="status">{finished}</div>}
      {done.map(c=><LcCase key={c.case} c={c} problems={problems}/>)}
      {(done.length>0||finished)&&<div className="case problems">
        <h2>Problems during this run</h2>
        {problems.length?problems.map((p,k)=><div key={k}>{(p.case?"Case "+p.case+": ":"")+lcLine(p,true)}</div>):<div>None.</div>}
      </div>}
    </div>);
}
