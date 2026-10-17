// display_check_page.jsx — the root of the "Catalogue Display Check" page. build/display_check.js
// appends this to Cat_Watch.jsx and mounts DisplayCheck instead of App. Her test cards are written
// in (DC_CASES). Every step is the app's own code, as the app runs it:
//   on opening: the link venues' records read from the store and registered (readOccasional →
//     registerOccasional), as App does;
//   the catalogue box: CatalogueBox, the component the app's cards draw;
//   tapping a block: pickRow; Search again: lookupCatalogue with the app's progress hook, the card
//     replaced only when the lookup finished (as findOneCat); Re-check museum shop: recheckShopRow;
//   every action's record goes to this page's lookup log (tapeStart, saveLookupTape).
// The pass lines are code, below. DC_BASE is Yale's stored shop record as it stood at build.

const DC_STYLE=`
.dc{max-width:760px;margin:0 auto;padding-block:20px 40px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));font:14px/1.5 -apple-system,BlinkMacSystemFont,sans-serif}
.dc h1{font:500 22px Georgia,serif;margin:0 0 4px}
.dc .soft{opacity:.75;font-size:12.5px}
.dc .case{border-radius:6px;padding:12px 14px;margin-top:14px}
.dc .row{display:flex;gap:10px;align-items:baseline;padding:4px 0;font-size:12.5px}
.dc .mark{font-weight:700;min-width:40px}
.dc .bad{font-weight:700;text-decoration:underline}
`;

function dcYaleDiff(v){
  if(!v)return ["the Yale venue record is gone"];
  return DC_BASE.fields.filter(k=>JSON.stringify(v[k]===undefined?null:v[k])!==JSON.stringify(DC_BASE.venue[k]))
    .map(k=>k+" was "+JSON.stringify(DC_BASE.venue[k])+", now "+JSON.stringify(v[k]===undefined?null:v[k]));
}
// The lines a card must pass, worked out from the card itself.
function dcGrade(r,yaleDiff){
  const out=[], vs=Array.isArray(r.editions)?r.editions.filter(Boolean):[];
  if(vs.length>1){
    const o=versionOrder(vs,r.museumId);
    const inOrder=o.every((v,i)=>v===i);
    out.push({ok:inOrder,what:"Books in your order",got:vs.map(v=>[v.lang,v.binding,v.publisher].filter(Boolean).join(", ")).join(" | ")+(inOrder?"":" — saved before your order; Search again")});
    out.push({ok:r.editionPick!=null,what:"A book is picked",got:r.editionPick==null?"none (saved before your order — Search again)":"book "+(r.editionPick+1)});
    out.push({ok:vs.every(v=>v.card&&v.card.shopState),what:"Every book has its own Yale-shop answer",got:vs.map((v,i)=>(i+1)+": "+((v.card&&v.card.shopState)||"none")).join(", ")});
    const unread=shopUnread(r.shopState);
    if(unread)out.push({ok:vs.every(v=>v.card&&shopUnread(v.card.shopState)),what:"Shop unreadable for every book, never “not in the shop”",got:vs.map(v=>v.card&&v.card.shopState).join(", ")});
  }
  out.push({ok:!yaleDiff.length,what:"Yale’s stored shop address unchanged",got:yaleDiff.length?yaleDiff.join("; "):"unchanged"});
  return out;
}

function DisplayCheck(){
  const dark=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  const C=PALETTES[dark?"dark":"light"], TH=tiersFor(dark?"dark":"light"), lnk=linkButton(C);
  const [rows,setRows]=useState(DC_CASES);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(null);
  const [label,setLabel]=useState("");
  const [said,setSaid]=useState({});
  const [calls,setCalls]=useState({});
  const [yale,setYale]=useState(null);
  const readYale=async()=>{ const m=await readOccasional(); setYale(dcYaleDiff(m[DC_BASE.id])); return m; };
  useEffect(()=>{ readYale().then(m=>{ registerOccasional(m); setReady(true); }); },[]);
  const put=row=>setRows(prev=>prev.map(x=>x.id===row.id?row:x));
  async function searchAgain(row){
    setBusy(row.id); setSaid(s=>({...s,[row.id]:null}));
    const tape=tapeStart(row.looked?"Search again":"Find catalogue",row);
    let out;
    try{ out=await lookupCatalogue(row,{label:l=>setLabel(l||""),prepareShop:async()=>{}}); }
    catch(e){ out={ok:false,detail:"The lookup stopped: "+String((e&&e.message)||e)}; }
    await saveLookupTape(tape,out);
    setCalls(c=>({...c,[row.id]:out.calls||null}));
    if(row.looked&&out.ok&&out.trouble)setSaid(s=>({...s,[row.id]:{failed:true,text:"Search again didn’t finish — "+out.trouble.split("[")[0].trim()}}));
    else if(out.ok)put(out.row);
    else setSaid(s=>({...s,[row.id]:{failed:true,text:"Search again didn’t run — "+String(out.detail||"").split("\n").pop().split("[")[0].trim()}}));
    await readYale(); setBusy(null); setLabel("");
  }
  async function recheck(row){
    setBusy(row.id); setSaid(s=>({...s,[row.id]:null}));
    const tape=tapeStart("Re-check museum shop",row);
    let out;
    try{ out=await recheckShopRow(row,{label:l=>setLabel(l||""),prepareShop:async()=>{}}); }
    catch(e){ out={ok:false,said:"Re-check stopped: "+String((e&&e.message)||e)}; }
    await saveLookupTape(tape,out);
    if(out.ok&&out.row&&out.row!==row)put(out.row);
    setSaid(s=>({...s,[row.id]:{text:out.said,failed:!out.ok}}));
    await readYale(); setBusy(null); setLabel("");
  }
  const sm={background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0};
  return <div className="dc" style={{background:C.bg,color:C.ink,minHeight:"100vh"}}>
    <style>{DC_STYLE}</style>
    <h1>Catalogue Display Check</h1>
    <div className="soft">Cat Watch code from {DC_BUILD.branch} at {DC_BUILD.commit} ({DC_BUILD.builtAt}). Your test cards as saved in your app; Search again and Re-check use your Parallel Search Key and Claude, as in your app. Nothing here reaches your app.</div>
    <div className="case" style={{background:C.card,border:"1px solid "+C.rule}}>
      <b>Yale’s stored shop address: </b>
      {yale===null?"reading…":yale.length?<span className="bad">CHANGED — {yale.join("; ")}</span>:"unchanged"}
    </div>
    {!ready?<div className="soft" style={{marginTop:14}}>Reading the venues…</div>:rows.map(r=>{
      const mu=MU[r.museumId], found=r.looked&&r.hasCatalogue==="yes";
      const vl=found?versionBlocks(r):null;
      const picked=!vl||(Number.isInteger(r.editionPick)&&!!r.editions[r.editionPick]);
      const noShop=!(mu&&(mu.shopSearch||mu.shopHome));
      const isBusy=busy===r.id, s=said[r.id], k=calls[r.id];
      const lines=dcGrade(r,yale||[]);
      const actions=<>
        <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:14}}>
          <button onClick={()=>searchAgain(r)} disabled={!!busy} style={sm}>{isBusy?label||"Searching…":"Search again"}</button>
          {!noShop&&<button onClick={()=>recheck(r)} disabled={!!busy} style={sm}>Re-check museum shop</button>}
          <button onClick={()=>put({...r,acquiring:r.acquiring==="acquired"?null:"acquired"})} disabled={!!busy} style={sm}>{r.acquiring==="acquired"?"Un-mark Acquired":"Mark Acquired"}</button>
        </div>
        {s&&<div style={{marginTop:6,fontSize:11,color:s.failed?TH.urgent.ink:C.soft,fontWeight:s.failed?700:400}}>{s.text}</div>}
      </>;
      return <div className="case" key={r.id} style={{background:C.card,border:"1px solid "+C.rule}}>
        <div style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft}}>{mu?.card||mu?.short}</div>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:17,fontWeight:500,lineHeight:1.25}}>{r.title}</div>
        <div style={{background:C.drawer,margin:"10px -14px",padding:"12px 14px"}}>
          {found?<CatalogueBox r={r} mu={mu} C={C} TH={TH} lnk={lnk} isAcq={r.acquiring==="acquired"} noShop={noShop} vl={vl} picked={picked}
            onPick={i=>put(pickRow(r,i,new Date().toISOString()))} actions={actions}/>
            :<div><div style={{fontSize:12,color:C.soft}}>No catalogue on file.</div>{actions}</div>}
        </div>
        {lines.map((l,i)=><div className="row" key={i}>
          <span className="mark" style={{color:l.ok?C.okInk:TH.urgent.ink}}>{l.ok?"PASS":"FAIL"}</span>
          <div style={{minWidth:0,overflowWrap:"anywhere"}}><div>{l.what}</div><div className="soft">{l.got}</div></div>
        </div>)}
        {k&&<div className="soft">Last Search again: {k.calls} calls ({k.search} searches, {k.fetch} page opens, {k.read} Claude reads).</div>}
      </div>;
    })}
  </div>;
}
