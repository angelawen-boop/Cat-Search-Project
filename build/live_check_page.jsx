// live_check_page.jsx — the root of the "Cat Watch live check" page, Stage 1
// (docs/handover_search_stage1.md). build/live_check.js appends this to Cat_Watch.jsx and
// mounts LiveCheck instead of App, so every lookup below is the app's own code:
// lookupCatalogue, its connector and Claude calls, the lookup log (saveLookupTape).
// Nothing here searches, reads or draws a card. Each round runs every case once; rounds
// run back to back. Her pass test is build/stage1_grade.js (s1Grade), written in ahead of
// this file with LC_CASES, LC_ANSWERS, LC_VENUES and LC_BUILD.

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
let lcRun={db:null,problems:[],spaced:false,caseNo:null,round:null,lookupPath:null,appError:null,active:false,appOps:null};
function lcRecord(p){
  const rec={at:new Date().toISOString(),round:lcRun.round||null,case:lcRun.caseNo,what:"",path:"",op:"",code:"",message:"",attempt:1,retried:false,outcome:"not saved",...p};
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
  .lc label{margin-left:12px}
  .lc input.rounds{font:inherit;width:3.5em;margin-left:6px;padding:4px 6px;border:1px solid var(--ink);border-radius:4px;background:var(--ground);color:var(--ink)}
  .lc .case{border:1px solid color-mix(in srgb,var(--ink) 22%,transparent);border-radius:6px;padding:12px 14px;margin:12px 0}
  .lc .case h2{font-size:15px;margin:0 0 6px;font-weight:600}
  .lc table{width:100%;border-collapse:collapse;font-size:12.5px;table-layout:fixed}
  .lc td,.lc th{text-align:left;vertical-align:top;padding:4px 6px;border-top:1px solid color-mix(in srgb,var(--ink) 14%,transparent);overflow-wrap:anywhere}
  .lc th{font-weight:600}
  .lc .status{font-weight:600}
  .lc .bad{font-weight:700}
`;
const LC_ROUNDS_MAX=10;
// Rounds offered when the page opens (a test sets 1).
let lcDefaultRounds=3;

function LcCase({c,problems}){
  const mine=problems.filter(p=>p.case===c.case&&p.round===c.round);
  const lost=lcUnsavedOf(problems.filter(p=>p.round===c.round),c.case);
  return(
    <div className="case">
      <h2>{c.case}. {c.title} <span className="soft">({c.venue}) · round {c.round}</span></h2>
      <div className="status">{c.verdict}</div>
      <div className="soft" style={{fontSize:11.5}}>Lookup record: {c.lookupId?c.lookupId+" ("+c.lookupPath+")":"none written"}</div>
      {c.trouble&&<div className="soft">The lookup said: {c.trouble}</div>}
      {lost.length>0&&<div className="status">Did not save: {lost.join("; ")}.</div>}
      {mine.map((p,k)=><div key={k} className="soft">{lcLine(p,false)}</div>)}
      {c.stage1.lines.map((l,k)=><div key={k} className={l.ok?"":"bad"}>{l.watch?"! ":l.ok?"✓ ":"✗ "}{l.text}</div>)}
      <div style={{marginTop:8,fontWeight:600,fontSize:12.5}}>Every book the lookup kept</div>
      {c.keptBooks.length?<table><thead><tr><th>ISBN</th><th>Title</th><th>Language</th><th>Publisher</th><th>Show</th></tr></thead>
        <tbody>{c.keptBooks.map((b,k)=><tr key={k}><td>{b.isbn13?fmtIsbn(b.isbn13):"none"}{b.alsoIsbn13?"; "+fmtIsbn(b.alsoIsbn13):""}</td><td>{b.title||""}</td><td>{b.lang||""}</td><td>{b.publisher||""}</td><td>{b.showing==="other"?"another showing"+(b.city?" ("+b.city+")":""):"this show"}</td></tr>)}</tbody></table>
        :<div className="soft">None.</div>}
    </div>);
}

// Rounds × cases, pass or fail.
function LcGrid({done,rounds}){
  const cell=(r,n)=>{ const c=done.find(x=>x.round===r&&x.case===n); return c?(c.stage1.pass?"✓ Pass":"✗ Fail"):""; };
  return(<table style={{margin:"10px 0"}}><thead><tr><th>Case</th>{Array.from({length:rounds},(_,i)=><th key={i}>Round {i+1}</th>)}</tr></thead>
    <tbody>{LC_CASES.map(x=><tr key={x.case}><td>{x.case}. {LC_ANSWERS[x.case]?LC_ANSWERS[x.case].title:x.row.title}</td>
      {Array.from({length:rounds},(_,i)=><td key={i} className={cell(i+1,x.case)==="✗ Fail"?"bad":""}>{cell(i+1,x.case)}</td>)}</tr>)}</tbody></table>);
}

function LiveCheck(){
  const [running,setRunning]=useState(false);
  const [rounds,setRounds]=useState(lcDefaultRounds);
  const [shownRounds,setShownRounds]=useState(0);
  const [status,setStatus]=useState("");
  const [done,setDone]=useState([]);
  const [finished,setFinished]=useState(null);
  const [problems,setProblems]=useState([]);

  async function run(){
    const N=Math.max(1,Math.min(LC_ROUNDS_MAX,parseInt(rounds,10)||1));
    setRunning(true); setDone([]); setFinished(null); setProblems([]); setShownRounds(N);
    const rawDb=await lcRealUseCap("db");
    const loopId="P"+Date.now()+Math.random().toString(36).slice(2,6);
    lcRun={db:rawDb,problems:[],spaced:false,caseNo:null,round:null,lookupPath:null,appError:null,active:true,appOps:null};
    const shown=()=>setProblems(lcRun.problems.slice());
    // Which tier answers the app's modelTier:"default" (sample.json does not say).
    setStatus("Asking Claude which model tier answers…");
    let tier={modelTierApplied:null,modelApplied:null,error:null};
    try{
      const s=await lcRealUseCap("sample");
      if(!s)tier.error="Claude isn’t available to this page.";
      else{ const r=await s("Reply with the one word: ready",{modelTier:"default",cache:false}); tier={modelTierApplied:r.modelTierApplied||null,modelApplied:r.modelApplied||null,error:null}; }
    }catch(e){ tier.error=lcErr(e); }
    const all=[], finals=[];
    // One run record per round, all naming the loop: the store's layout is the earlier runs'.
    for(let round=1;round<=N;round++){
      const runId="R"+Date.now()+Math.random().toString(36).slice(2,6);
      const runPath=LC_RUNS+"/"+runId;
      lcRun.round=round;
      const head={at:new Date().toISOString(),stage:1,loop:loopId,round,rounds:N,branch:LC_BUILD.branch,commit:LC_BUILD.commit,builtAt:LC_BUILD.builtAt,appVersionInCode:LC_BUILD.appVersion,
        modelTierAsked:"default",modelTierApplied:tier.modelTierApplied,modelApplied:tier.modelApplied,
        modelNote:tier.modelApplied?null:"modelApplied is reported only when a page names a model; the app asks by modelTier only.",
        tierError:tier.error,cases:LC_CASES.length,done:0,savedCases:[],unsavedCases:[],problems:[],finished:false,saved:!!rawDb};
      if(rawDb)await lcWrite("set",runPath,head,"the run record");
      const saved=[], unsaved=[], lookups=[], mine=[];
      for(const x of LC_CASES){
        const mu=MU[x.row.museumId];
        const say=l=>setStatus("Round "+round+" of "+N+", case "+x.case+" of "+LC_CASES.length+": "+x.row.title+" — "+l);
        say("searching…");
        lcReads.length=0;
        lcRun.caseNo=x.case; lcRun.lookupPath=null; lcRun.appError=null;
        const tape=tapeStart("Live check",x.row);
        let out;
        try{
          out=await lookupCatalogue(x.row,{label:say,prepareShop:async()=>{}});
        }catch(e){ out={ok:false,row:null,detail:"The lookup threw: "+lcErr(e)}; }
        const reads=lcReadsOf(tape,lcReads.splice(0));
        const calls=lcCallsOf(tape);
        const tapeCalls=tape.calls.slice();
        const tapeSaved=await saveLookupTape(tape,out);
        if(rawDb&&!tapeSaved){
          const e=lcRun.appError;
          lcRecord({what:"the lookup record",path:lcRun.lookupPath||"",op:"set",code:e?lcCodeOf(e):"none",
            message:e?"the lookup record did not save ("+lcMsgOf(e)+")":"no store error was raised; the app returned false"});
        }
        const lookupPath=lcRun.lookupPath, lookupId=lookupPath?lookupPath.split("/").pop():null;
        lookups.push({case:x.case,lookupId,lookupPath});
        const row=out&&out.row;
        const answers=LC_ANSWERS[x.case]||{thisShow:[],english:null};
        const stage1=s1Grade(answers,tapeCalls,row,!!(out&&out.ok));
        const keptBooks=row&&Array.isArray(row.editions)&&row.editions.length?row.editions
          :row&&row.isbn13?[{title:row.catalogueTitle,isbn13:row.isbn13,lang:null,publisher:row.publisher,showing:"this"}]:[];
        const rec={case:x.case,round,loop:loopId,title:x.row.title,venue:mu?mu.name:x.row.museumId,museumId:x.row.museumId,
          lookupAt:new Date(tape.t0).toISOString(),ms:Date.now()-tape.t0,lookupId,lookupPath,
          ok:!!(out&&out.ok),trouble:(out&&out.trouble)||null,panel:(out&&out.detail)||null,
          verdict:"Stage 1b: "+(stage1.pass?"pass.":"fail."),stage1,keptBooks,row:row?cardFields(row):null,calls};
        if(rawDb){
          const r=await lcSaveCase(runId,rec,reads);
          if(r.caseWritten)saved.push(x.case);
          else{ const p=lcRun.problems.filter(q=>q.case===x.case&&q.round===round&&q.what==="the case record").pop(); unsaved.push({case:x.case,error:p?p.code+": "+p.message:"not written"}); }
          await lcWrite("update",runPath,{done:saved.length,savedCases:saved,unsavedCases:unsaved,lookups,problems:lcRun.problems.filter(p=>p.round===round)},"the run record");
        }
        mine.push(rec); all.push(rec); setDone(all.slice()); shown();
      }
      lcRun.caseNo=null;
      if(rawDb)await lcWrite("update",runPath,{finished:true,endedAt:new Date().toISOString(),done:saved.length,savedCases:saved,unsavedCases:unsaved,lookups,problems:lcRun.problems.filter(p=>p.round===round),
        passedCases:mine.filter(r=>r.stage1.pass).map(r=>r.case),failedCases:mine.filter(r=>!r.stage1.pass).map(r=>r.case)},"the run record");
      const back=rawDb?await lcReadBack(runPath,lookups):null;
      finals.push("Round "+round+": "+lcFinalLine(!!rawDb,back,lcRun.problems.filter(p=>p.round===round&&p.outcome==="not saved"&&(!p.retried||p.attempt===2)).length));
    }
    lcRun.active=false;
    setStatus("");
    setFinished(finals.join(" "));
    shown(); setRunning(false);
  }

  return(
    <div className="lc">
      <style>{LC_STYLE}</style>
      <h1>Cat Watch live check — Stage 1b</h1>
      <div className="soft">Code under test: {LC_BUILD.branch} {"·"} commit {LC_BUILD.commit} {"·"} built {LC_BUILD.builtAt}</div>
      <div className="soft">{LC_CASES.length} cases, searched live through Parallel Search Key and read by Claude, as the app does. Each round runs every case once.</div>
      <button className="run" onClick={run} disabled={running}>{running?"Running…":"Run"}</button>
      <label>Rounds<input className="rounds" type="number" min="1" max={LC_ROUNDS_MAX} value={rounds} disabled={running} onChange={e=>setRounds(e.target.value)}/></label>
      {status&&<div className="status">{status}</div>}
      {finished&&<div className="status">{finished}</div>}
      {done.length>0&&<LcGrid done={done} rounds={shownRounds}/>}
      {done.map(c=><LcCase key={c.round+"-"+c.case} c={c} problems={problems}/>)}
      {(done.length>0||finished)&&<div className="case problems">
        <h2>Problems during this run</h2>
        {problems.length?problems.map((p,k)=><div key={k}>{"Round "+p.round+(p.case?", case "+p.case+": ":": ")+lcLine(p,true)}</div>):<div>None.</div>}
      </div>}
    </div>);
}
