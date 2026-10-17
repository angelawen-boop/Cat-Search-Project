// blocks_check_page.jsx — the root of the "Catalogue Blocks Check" page. build/blocks_check.js
// appends this to Cat_Watch.jsx and mounts BlocksCheck instead of App. Her cases (BC_CASES) are
// blank cards; every step is the app's own code, as the app runs it:
//   on opening: the cases' link venues registered (registerOccasional), as App does;
//   Run: lookupCatalogue on the blank card (as Find catalogue / Search again, findOneCat);
//   the drawer: CatalogueBox or CatalogueNone, the components the app's cards draw;
//   tapping a block: pickRow; Re-check museum shop: recheckShopRow;
//   every action's record goes to this page's lookup log (tapeStart, saveLookupTape).
// Each result is kept in this page's store the moment it arrives (checks/<case id>), so leaving
// the page loses nothing. The pass lines are code, below, and appear only for a case she ran.

const BC_STYLE=`
.bc{max-width:760px;margin:0 auto;padding-block:20px 40px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));font:14px/1.5 -apple-system,BlinkMacSystemFont,sans-serif}
.bc h1{font:500 22px Georgia,serif;margin:0 0 4px}
.bc .soft{opacity:.75;font-size:12.5px}
.bc .case{border-radius:6px;padding:12px 14px;margin-top:14px}
.bc .row{display:flex;gap:10px;align-items:baseline;padding:4px 0;font-size:12.5px}
.bc .mark{font-weight:700;min-width:40px}
.bc .row div{min-width:0;overflow-wrap:anywhere}
`;
const BC_LABEL=s=>s==="shop"?"in the shop":s==="gone"?"gone from the shop":s==="web"?"not in the shop":shopUnread(s)?"shop unreadable":(s||"no answer");

// The lines a case must pass, worked out in code from the card and the run that made it.
function bcGrade(r,k){
  const out=[];
  if(!k.ok){ out.push({ok:false,what:"The search finished",got:k.why||"it stopped"}); return out; }
  if(k.trouble)out.push({ok:false,what:"The search finished",got:"stopped part-way — "+k.trouble});
  if(r.hasCatalogue!=="yes"){ out.push({ok:true,what:"The search finished",got:"no catalogue found"}); return out; }
  const vs=Array.isArray(r.editions)?r.editions.filter(Boolean):[];
  if(vs.length<2){
    out.push({ok:versionBlocks(r)===null,what:"One book: the card drawn as before, no blocks",got:vs.length+" book"+(vs.length===1?"":"s")+" found"});
    return out;
  }
  const o=versionOrder(vs,r.museumId);
  out.push({ok:o.every((v,i)=>v===i),what:"Books in your order",
    got:vs.map((v,i)=>(i+1)+". "+[v.lang||"language not known",v.binding||"binding not known",v.publisher].filter(Boolean).join(", ")).join(" | ")});
  out.push({ok:k.firstPick===0,what:"The first book started picked",got:Number.isInteger(k.firstPick)?"book "+(k.firstPick+1):"none"});
  out.push({ok:vs.every(v=>v.card&&v.card.shopState),what:"Every book has its own museum-shop answer",
    got:vs.map((v,i)=>(i+1)+": "+BC_LABEL(v.card&&v.card.shopState)).join(" · ")});
  const mu=MU[r.museumId], hosts=[shopDomain(mu),mu&&mu.shopCatalogues?hostOf(mu.shopCatalogues):null].filter(Boolean);
  const links=vs.map(v=>v.card&&v.card.shopUrl).filter(Boolean);
  out.push({ok:links.every(u=>hosts.includes(hostOf(u))),what:"Shop answers from this venue’s shop only",
    got:links.length?links.map(hostOf).join(", "):"no book has a shop link"});
  if(vs.some(v=>v.card&&shopUnread(v.card.shopState)))
    out.push({ok:vs.every(v=>v.card&&shopUnread(v.card.shopState)),what:"Shop unreadable: unreadable for every book",
      got:vs.map(v=>BC_LABEL(v.card&&v.card.shopState)).join(" · ")});
  const p=vs[r.editionPick], keys=["catalogueTitle","isbn13","publisherUrl","shopState","shopUrl"];
  out.push({ok:!!(p&&p.card)&&keys.every(x=>(r[x]||null)===(p.card[x]||null)),what:"The card follows your pick",
    got:p?"book "+(r.editionPick+1)+" picked":"no book picked"});
  if(k.recheck){
    const same=(a,b)=>JSON.stringify(a||null)===JSON.stringify(b||null);
    const others=vs.every((v,i)=>i===k.recheck.pick||same(v.card,k.recheck.before[i]));
    out.push({ok:others,what:"Re-check changed only the picked book’s answer",
      got:"book "+(k.recheck.pick+1)+" re-checked — "+(k.recheck.said||"no answer")});
  }
  return out;
}

function BlocksCheck(){
  const dark=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  const C=PALETTES[dark?"dark":"light"], TH=tiersFor(dark?"dark":"light"), lnk=linkButton(C);
  // kept[id]: {row, ok, why, trouble, firstPick, recheck, at} — a case she has run.
  const [kept,setKept]=useState({});
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(null);
  const [label,setLabel]=useState("");
  const [said,setSaid]=useState({});
  const [lost,setLost]=useState(false);
  useEffect(()=>{ (async()=>{
    registerOccasional(BC_VENUES);
    try{ const db=await useCap("db");
      if(db){ const got={};
        for(const c of BC_CASES){ const d=await db.doc("checks/"+c.id).get(); if(d&&d.exists)got[c.id]=d.data(); }
        setKept(got); } }catch{}
    setReady(true); })(); },[]);
  const keep=async(id,k)=>{
    setKept(s=>({...s,[id]:k}));
    try{ const db=await useCap("db"); if(!db)throw 0; await db.doc("checks/"+id).set(k); setLost(false); }catch{ setLost(true); }
  };
  async function run(c){
    setBusy(c.id); setSaid(s=>({...s,[c.id]:null}));
    const tape=tapeStart("Find catalogue",c);
    let out;
    try{ out=await lookupCatalogue(c,{label:l=>setLabel(l||""),prepareShop:async()=>{}}); }
    catch(e){ out={ok:false,detail:"The lookup stopped: "+String((e&&e.message)||e)}; }
    await saveLookupTape(tape,out);
    const why=out.ok?null:String(out.detail||"").split("\n").pop().split("[")[0].trim();
    const trouble=out.ok&&out.trouble?out.trouble.split("[")[0].trim():null;
    await keep(c.id,{row:out.ok?out.row:c,ok:!!out.ok,why,trouble,
      firstPick:out.ok&&Number.isInteger(out.row.editionPick)?out.row.editionPick:null,recheck:null,at:new Date().toISOString()});
    setBusy(null); setLabel("");
  }
  async function recheck(c,k){
    const row=k.row;
    setBusy(c.id); setSaid(s=>({...s,[c.id]:null}));
    const tape=tapeStart("Re-check museum shop",row);
    let out;
    try{ out=await recheckShopRow(row,{label:l=>setLabel(l||""),prepareShop:async()=>{}}); }
    catch(e){ out={ok:false,said:"Re-check stopped: "+String((e&&e.message)||e)}; }
    await saveLookupTape(tape,out);
    const vs=Array.isArray(row.editions)?row.editions:[];
    const next=out.ok&&out.row?out.row:row;
    await keep(c.id,{...k,row:next,recheck:vs.length>1&&Number.isInteger(row.editionPick)
      ?{pick:row.editionPick,said:out.said||null,before:vs.map(v=>v&&v.card||null)}:k.recheck});
    setSaid(s=>({...s,[c.id]:{text:out.said,failed:!out.ok}}));
    setBusy(null); setLabel("");
  }
  const sm={background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0};
  return <div className="bc" style={{background:C.bg,color:C.ink,minHeight:"100vh"}}>
    <style>{BC_STYLE}</style>
    <h1>Catalogue Blocks Check</h1>
    <div className="soft">Cat Watch code from {BC_BUILD.branch} at {BC_BUILD.commit} ({BC_BUILD.builtAt}). Each Run is a fresh Find catalogue from a blank card, using your Parallel Search Key and Claude. Nothing here reaches your app.</div>
    {lost&&<div className="case" style={{background:C.warnBg,border:"1px solid "+C.warnEdge,color:C.warnInk}}>The last result could not be kept on this page — it will be gone if you leave.</div>}
    {!ready?<div className="soft" style={{marginTop:14}}>Opening…</div>:BC_CASES.map(c=>{
      const k=kept[c.id], r=k?k.row:null, mu=MU[c.museumId];
      const noShop=!(mu&&(mu.shopSearch||mu.shopHome));
      const isBusy=busy===c.id, s=said[c.id];
      const found=!!(r&&r.looked&&r.hasCatalogue==="yes");
      const vl=found?versionBlocks(r):null;
      const picked=!vl||(Number.isInteger(r.editionPick)&&!!r.editions[r.editionPick]);
      const actions=<>
        <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:14}}>
          {!noShop&&<button onClick={()=>recheck(c,k)} disabled={!!busy} style={sm}>Re-check museum shop</button>}
        </div>
        {s&&<div style={{marginTop:6,fontSize:11,color:s.failed?TH.urgent.ink:C.soft,fontWeight:s.failed?700:400}}>{s.text}</div>}
      </>;
      return <div className="case" key={c.id} style={{background:C.card,border:"1px solid "+C.rule}}>
        <div style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft}}>{mu?.card||mu?.short}</div>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:17,fontWeight:500,lineHeight:1.25}}>{c.title}</div>
        <div style={{marginTop:8,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>run(c)} disabled={!!busy} style={{background:C.action,color:C.onAction,border:0,borderRadius:4,padding:"6px 14px",fontSize:13,cursor:busy?"default":"pointer",opacity:busy&&!isBusy?0.5:1}}>
            {isBusy?"Running…":k?"Run again":"Run"}</button>
          {isBusy&&<span className="soft">{label}</span>}
        </div>
        {r&&r.looked&&<div style={{background:C.drawer,margin:"10px -14px",padding:"12px 14px"}}>
          {found?<CatalogueBox r={r} mu={mu} C={C} TH={TH} lnk={lnk} isAcq={false} noShop={noShop} vl={vl} picked={picked}
            onPick={i=>{ const n=pickRow(r,i,new Date().toISOString()); if(n!==r)keep(c.id,{...k,row:n}); }} actions={actions}/>
            :<CatalogueNone r={r} mu={mu} C={C} TH={TH} lnk={lnk} actions={actions}/>}
        </div>}
        {k&&bcGrade(r,k).map((l,i)=><div className="row" key={i}>
          <span className="mark" style={{color:l.ok?C.okInk:TH.urgent.ink}}>{l.ok?"PASS":"FAIL"}</span>
          <div><div>{l.what}</div><div className="soft">{l.got}</div></div>
        </div>)}
      </div>;
    })}
  </div>;
}
