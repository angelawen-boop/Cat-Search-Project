// live_check_page.jsx — the root of the "Cat Watch live check" page. build/live_check.js
// appends this to Cat_Watch.jsx and mounts LiveCheck instead of App, so every lookup
// below is the app's own code: lookupCatalogue, its connector and Claude calls, the
// lookup log (saveLookupTape) and versionBlocks. Nothing here searches or reads.
// LC_CASES, LC_CARDS, LC_VENUES and LC_BUILD are written in by the build.

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
// Every house the answer names must be in the publisher found; accents, capitals and
// "éditions"/"editions" do not count.
const LC_SKIP=["editions","edition","the","and","books","publishing","press","d","de","art","of"];
const lcWords=s=>lcFold(s).split(/[^a-z0-9]+/).filter(w=>w.length>1&&!LC_SKIP.includes(w));
function lcSamePublisher(got,want){
  const g=lcWords(got);
  if(!g.length)return false;
  return String(want).split(/\s*\/\s*/).every(house=>lcWords(house).every(w=>g.includes(w)));
}
const lcIsbn=n=>n?fmtIsbn(n):"none";
const lcLangOf=v=>v?(langName(v.lang)||v.lang||"no language"):"";

function lcGrade(card,row){
  const out=[];
  const add=(field,verdict,got,want,why)=>out.push({field,verdict,got:got==null?"":String(got),want:want==null?"":String(want),why:why||null});
  const vs=Array.isArray(row&&row.editions)?row.editions.filter(Boolean):[];
  const used=new Set();
  for(const want of card.versions){
    const label=want.lang+" "+lcIsbn(want.isbn13);
    const v=vs.find(x=>x.isbn13===want.isbn13||x.alsoIsbn13===want.isbn13);
    add(label+" — listed as a version",v?"pass":"fail",v?"listed":"not listed","listed");
    if(!v)continue;
    used.add(v);
    const gotAlso=v.isbn13===want.isbn13?v.alsoIsbn13:v.isbn13;
    add(label+" — second number on the block",(gotAlso||null)===(want.alsoIsbn13||null)?"pass":"fail",lcIsbn(gotAlso),lcIsbn(want.alsoIsbn13));
    if(v.isbn13!==want.isbn13)add(label+" — number the block leads with","fail",lcIsbn(v.isbn13),lcIsbn(want.isbn13));
    add(label+" — language",lcSameLang(v.lang,want.lang)?"pass":"fail",lcLangOf(v),want.lang);
    add(label+" — publisher",lcSamePublisher(v.publisher,want.publisher)?"pass":"fail",v.publisher||"none",want.publisher);
    add(label+" — showing",v.showing===want.showing?"pass":"fail",v.showing==="other"?"another showing":"this show",want.showing==="other"?"another showing":"this show");
  }
  const extras=vs.filter(v=>!used.has(v));
  add("No other versions listed",extras.length?"fail":"pass",extras.length?extras.map(v=>lcLangOf(v)+" "+lcIsbn(v.isbn13)+(v.publisher?" ("+v.publisher+")":"")).join("; "):"none","none");
  const left=(card.leftOff||[]).filter(n=>vs.some(v=>v.isbn13===n||v.alsoIsbn13===n));
  if((card.leftOff||[]).length)add("Left off: "+card.leftOff.map(lcIsbn).join(", "),left.length?"fail":"pass",left.length?"listed: "+left.map(lcIsbn).join(", "):"left off","left off");
  const i=row&&row.editionPick;
  const picked=Number.isInteger(i)&&vs[i]?vs[i]:null;
  // A single-version card has no pick of its own: its one book is the pick.
  const pickIsbn=picked?picked.isbn13:(vs.length===1&&!Number.isInteger(i)?vs[0].isbn13:null);
  add("Starting pick",pickIsbn===card.pick?"pass":"fail",pickIsbn?lcIsbn(pickIsbn):"nothing picked",card.pick?lcIsbn(card.pick):"nothing picked");
  return out;
}

// The card's catalogue section as text: her blocks for two or more versions
// (versionBlocks), else the single-book fields.
function lcShopLine(s){
  if(!s)return null;
  const note=s.note?" "+s.note:"";
  if(s.state==="shop")return shopHeadline("shop",s.change)+note;
  if(s.state==="gone")return shopHeadline("gone",null)+note;
  if(s.state==="blocked")return SHOP_BLOCKED_HEAD+SHOP_BLOCKED_FOUND_REST+note;
  if(s.state==="unfinished")return SHOP_CHECK_UNFINISHED+note;
  return NOT_IN_SHOP+note;
}
function lcDrawn(row){
  const vb=row&&row.hasCatalogue==="yes"?versionBlocks(row):null;
  if(vb)return{kind:"blocks",blocks:vb.map(b=>({picked:b.picked,lines:[lcShopLine(b.shop),b.title,b.publisher,b.facts,b.isbn,[b.why,b.source?"Source: "+b.source.host:null].filter(Boolean).join(" ")||null].filter(Boolean)}))};
  if(!row||row.hasCatalogue!=="yes")return{kind:"none",blocks:[{picked:false,lines:[row&&row.hasCatalogue==="no"?"No catalogue found.":"No catalogue on the card."]}]};
  return{kind:"single",blocks:[{picked:true,lines:[lcShopLine({state:row.shopState,change:row.shopChange}),row.catalogueTitle,row.publisher,row.isbn13?"ISBN "+fmtIsbn(row.isbn13):null].filter(Boolean)}]};
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
let lcRun={db:null,problems:[],spaced:false,caseNo:null,lookupPath:null,appError:null,active:false};
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
  const watch=(op,path,fn)=>async(...a)=>{ try{ return await fn(...a); }catch(e){ note(op,path,e); throw e; } };
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
  @media (max-width:560px){.lc td:nth-child(3),.lc th:nth-child(3){display:none}}
`;
const LC_MARK={"pass":"✓ Pass","fail":"✗ Fail"};

function LcCase({c,problems}){
  const mine=problems.filter(p=>p.case===c.case);
  const lost=lcUnsavedOf(problems,c.case);
  return(
    <div className="case">
      <h2>{c.case}. {c.title} <span className="soft">({c.venue})</span></h2>
      <div className="status">{c.verdict}</div>
      {c.trouble&&<div className="soft">The lookup said: {c.trouble}</div>}
      {lost.length>0&&<div className="status">Did not save: {lost.join("; ")}.</div>}
      {mine.map((p,k)=><div key={k} className="soft">{lcLine(p,false)}</div>)}
      <table><thead><tr><th style={{width:"42%"}}>What is checked</th><th style={{width:"18%"}}>Result</th><th>Came back</th><th>Right answer</th></tr></thead>
        <tbody>{c.grades.map((g,k)=>(
          <tr key={k} className={g.verdict==="fail"?"fail":""}><td>{g.field}{g.why&&<div className="soft">{g.why}</div>}</td><td className="v">{LC_MARK[g.verdict]}</td><td>{g.got}</td><td>{g.want}</td></tr>))}
        </tbody></table>
      <div style={{marginTop:10,fontWeight:600,fontSize:12.5}}>The card as the app draws it</div>
      {c.drawn.blocks.map((b,k)=>(
        <div key={k} className={"block"+(b.picked?" picked":"")}>
          {c.drawn.kind==="blocks"&&<div className="soft">{b.picked?"● picked":"○"}</div>}
          {b.lines.map((l,j)=><div key={j}>{l}</div>)}
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
    lcRun={db:rawDb,problems:[],spaced:false,caseNo:null,lookupPath:null,appError:null,active:true};
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
      lookups.push({case:x.case,lookupPath:lcRun.lookupPath});
      const row=out&&out.row;
      const grades=row?lcGrade(card,row):[{field:"The lookup finished",verdict:"fail",got:"no",want:"yes",why:null}];
      const fails=grades.filter(g=>g.verdict==="fail").length;
      const rec={case:x.case,title:x.row.title,venue:mu?mu.name:x.row.museumId,museumId:x.row.museumId,
        lookupAt:new Date(tape.t0).toISOString(),ms:Date.now()-tape.t0,
        ok:!!(out&&out.ok),trouble:(out&&out.trouble)||null,panel:(out&&out.detail)||null,
        verdict:(out&&out.ok?"":"The lookup did not finish. ")+(fails?fails+" of "+grades.filter(g=>g.verdict==="pass"||g.verdict==="fail").length+" checks failed.":"Every graded check passed."),
        grades,drawn:lcDrawn(row),row:row?cardFields(row):null,calls};
      if(rawDb){
        const r=await lcSaveCase(runId,rec,reads);
        if(r.caseWritten)saved.push(x.case);
        else{ const p=lcRun.problems.filter(q=>q.case===x.case&&q.what==="the case record").pop(); unsaved.push({case:x.case,error:p?p.code+": "+p.message:"not written"}); }
        await lcWrite("update",runPath,{done:saved.length,savedCases:saved,unsavedCases:unsaved,problems:lcRun.problems.slice()},"the run record");
      }
      all.push(rec); setDone(all.slice()); shown();
    }
    lcRun.caseNo=null;
    if(rawDb)await lcWrite("update",runPath,{finished:true,endedAt:new Date().toISOString(),done:saved.length,savedCases:saved,unsavedCases:unsaved,problems:lcRun.problems.slice(),
      failedCases:all.filter(r=>r.grades.some(g=>g.verdict==="fail")).map(r=>r.case)},"the run record");
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
