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
useCap=async function(name){
  const ns=await lcRealUseCap(name);
  return name==="sample"&&ns?lcWrapSample(ns):ns;
};

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

function lcGrade(card,extra,row){
  const out=[];
  const add=(field,verdict,got,want,why)=>out.push({field,verdict,got:got==null?"":String(got),want:want==null?"":String(want),why:why||null});
  const vs=Array.isArray(row&&row.editions)?row.editions.filter(Boolean):[];
  const skip=(list,isbn,field)=>(list||[]).find(x=>x.isbn13===isbn&&x.field===field);
  const used=new Set();
  for(const want of card.versions){
    const label=want.lang+" "+lcIsbn(want.isbn13);
    const v=vs.find(x=>x.isbn13===want.isbn13||x.alsoIsbn13===want.isbn13);
    add(label+" — listed as a version",v?"pass":"fail",v?"listed":"not listed","listed");
    if(!v)continue;
    used.add(v);
    const ng=skip(extra.notGraded,want.isbn13,"also"), dp=skip(extra.disputed,want.isbn13,"also");
    const gotAlso=v.isbn13===want.isbn13?v.alsoIsbn13:v.isbn13;
    if(ng||dp)add(label+" — second number on the block",ng?"not graded":"disputed",lcIsbn(gotAlso),lcIsbn(want.alsoIsbn13),(ng||dp).why);
    else add(label+" — second number on the block",(gotAlso||null)===(want.alsoIsbn13||null)?"pass":"fail",lcIsbn(gotAlso),lcIsbn(want.alsoIsbn13));
    if(v.isbn13!==want.isbn13)add(label+" — number the block leads with","fail",lcIsbn(v.isbn13),lcIsbn(want.isbn13));
    add(label+" — language",lcSameLang(v.lang,want.lang)?"pass":"fail",lcLangOf(v),want.lang);
    const pd=skip(extra.disputed,want.isbn13,"publisher");
    if(pd)add(label+" — publisher","disputed",v.publisher||"none",want.publisher,pd.why);
    else add(label+" — publisher",lcSamePublisher(v.publisher,want.publisher)?"pass":"fail",v.publisher||"none",want.publisher);
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
  if(vb)return{kind:"blocks",blocks:vb.map(b=>({picked:b.picked,lines:[lcShopLine(b.shop),b.title,b.publisher,b.facts,b.isbn,[b.why,b.source?"Source: "+b.source:null].filter(Boolean).join(" ")||null].filter(Boolean)}))};
  if(!row||row.hasCatalogue!=="yes")return{kind:"none",blocks:[{picked:false,lines:[row&&row.hasCatalogue==="no"?"No catalogue found.":"No catalogue on the card."]}]};
  return{kind:"single",blocks:[{picked:true,lines:[lcShopLine({state:row.shopState,change:row.shopChange}),row.catalogueTitle,row.publisher,row.isbn13?"ISBN "+fmtIsbn(row.isbn13):null].filter(Boolean)}]};
}

// ── SAVING — every case to the page's own store as it finishes ─────────────────
const LC_RUNS="checks", LC_PIECE=150000;
async function lcPutText(db,path,text){
  const t=String(text==null?"":text), n=Math.max(1,Math.ceil(t.length/LC_PIECE));
  for(let i=0;i<n;i++)await db.doc(path+"/"+i).set({text:t.slice(i*LC_PIECE,(i+1)*LC_PIECE),i,of:n});
  return n;
}
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
async function lcSaveCase(db,runId,rec,reads){
  const base=LC_RUNS+"/"+runId+"/cases/"+rec.case;
  for(const r of reads){
    const rp=base+"/reads/"+r.n;
    const pp=await lcPutText(db,rp+"/prompt",r.prompt);
    const ap=await lcPutText(db,rp+"/answer",r.raw);
    await db.doc(rp).set({n:r.n,ok:r.ok,detail:r.detail,parsed:r.parsed,promptPieces:pp,answerPieces:ap});
  }
  await db.doc(base).set({...rec,reads:reads.map(r=>r.n)});
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
const LC_MARK={"pass":"✓ Pass","fail":"✗ Fail","not graded":"– Not graded","disputed":"? Disputed, not graded"};

function LcCase({c}){
  return(
    <div className="case">
      <h2>{c.case}. {c.title} <span className="soft">({c.venue})</span></h2>
      <div className="status">{c.verdict}</div>
      {c.trouble&&<div className="soft">The lookup said: {c.trouble}</div>}
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

  async function run(){
    setRunning(true); setDone([]); setFinished(null);
    const db=await lcRealUseCap("db");
    const runId="R"+Date.now()+Math.random().toString(36).slice(2,6);
    const at=new Date().toISOString();
    // Which tier answers the app's modelTier:"default" (sample.json does not say).
    setStatus("Asking Claude which model tier answers…");
    let tier={modelTierApplied:null,modelApplied:null,error:null};
    try{
      const s=await lcRealUseCap("sample");
      if(!s)tier.error="Claude isn’t available to this page.";
      else{ const r=await s("Reply with the one word: ready",{modelTier:"default",cache:false}); tier={modelTierApplied:r.modelTierApplied||null,modelApplied:r.modelApplied||null,error:null}; }
    }catch(e){ tier.error=String((e&&e.code)||e); }
    const head={at,version:LC_BUILD.version,commit:LC_BUILD.commit,builtAt:LC_BUILD.builtAt,
      modelTierAsked:"default",modelTierApplied:tier.modelTierApplied,modelApplied:tier.modelApplied,
      modelNote:tier.modelApplied?null:"modelApplied is reported only when a page names a model; the app asks by modelTier only.",
      tierError:tier.error,cases:LC_CASES.length,done:0,finished:false,saved:!!db};
    try{ if(db)await db.doc(LC_RUNS+"/"+runId).set(head); }catch{}
    const all=[];
    for(const x of LC_CASES){
      const card=LC_CARDS.find(c=>c.case===x.case);
      const mu=MU[x.row.museumId];
      setStatus("Case "+x.case+" of "+LC_CASES.length+": "+x.row.title+" — searching…");
      lcReads.length=0;
      const tape=tapeStart("Live check",x.row);
      let out;
      try{
        out=await lookupCatalogue(x.row,{label:l=>setStatus("Case "+x.case+" of "+LC_CASES.length+": "+x.row.title+" — "+l),prepareShop:async()=>{}});
      }catch(e){ out={ok:false,row:null,detail:"The lookup threw: "+String((e&&e.message)||e)}; }
      const reads=lcReadsOf(tape,lcReads.splice(0));
      const calls=lcCallsOf(tape);
      await saveLookupTape(tape,out);
      const row=out&&out.row;
      const grades=row?lcGrade(card,x,row):[{field:"The lookup finished",verdict:"fail",got:"no",want:"yes",why:null}];
      const fails=grades.filter(g=>g.verdict==="fail").length;
      const rec={case:x.case,title:x.row.title,venue:mu?mu.name:x.row.museumId,museumId:x.row.museumId,
        lookupAt:new Date(tape.t0).toISOString(),ms:Date.now()-tape.t0,
        ok:!!(out&&out.ok),trouble:(out&&out.trouble)||null,panel:(out&&out.detail)||null,
        verdict:(out&&out.ok?"":"The lookup did not finish. ")+(fails?fails+" of "+grades.filter(g=>g.verdict==="pass"||g.verdict==="fail").length+" checks failed.":"Every graded check passed."),
        grades,drawn:lcDrawn(row),row:row?cardFields(row):null,calls};
      try{ if(db){ await lcSaveCase(db,runId,rec,reads); await db.doc(LC_RUNS+"/"+runId).update({done:all.length+1}); } }catch(e){ rec.saveError=String((e&&e.message)||e); }
      all.push(rec); setDone(all.slice());
    }
    try{ if(db)await db.doc(LC_RUNS+"/"+runId).update({finished:true,endedAt:new Date().toISOString(),
      failedCases:all.filter(r=>r.grades.some(g=>g.verdict==="fail")).map(r=>r.case)}); }catch{}
    setStatus(""); setFinished(db?"Finished. Every case is saved.":"Finished, but this page couldn’t reach its store, so nothing was saved.");
    setRunning(false);
  }

  return(
    <div className="lc">
      <style>{LC_STYLE}</style>
      <h1>Cat Watch live check</h1>
      <div className="soft">Code under test: version {LC_BUILD.version} {"·"} commit {LC_BUILD.commit} {"·"} built {LC_BUILD.builtAt}</div>
      <div className="soft">{LC_CASES.length} cases, searched live through Parallel Search Key and read by Claude, as the app does.</div>
      <button className="run" onClick={run} disabled={running}>{running?"Running…":"Run"}</button>
      {status&&<div className="status">{status}</div>}
      {finished&&<div className="status">{finished}</div>}
      {done.map(c=><LcCase key={c.case} c={c}/>)}
    </div>);
}
