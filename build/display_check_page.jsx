// display_check_page.jsx — the root of the "Catalogue Display Check" page. build/display_check.js
// appends this to Cat_Watch.jsx and mounts DisplayCheck, which draws a short check panel and
// then the app itself (App), unchanged. The page's store is seeded with her test cards as a
// cloud save and a copy of her link venues' records, so Import → "Open last cloud save" opens
// the cases through the app's own path. The panel only reads the store: it watches Yale's
// stored shop record against DC_BASE and lists the lookups the app logged, with their calls.

const DC_STYLE=`
.dc{max-width:760px;margin:0 auto;padding:16px max(16px,env(safe-area-inset-left,0px)) 4px;font:14px/1.5 -apple-system,BlinkMacSystemFont,sans-serif}
.dc h1{font:500 20px Georgia,serif;margin:0 0 2px}
.dc .soft{opacity:.75;font-size:12.5px}
.dc .box{border:1px solid currentColor;border-color:rgba(128,128,128,.45);border-radius:6px;padding:10px 12px;margin-top:10px}
.dc ol,.dc ul{margin:4px 0 0;padding-left:20px}
.dc li{margin:3px 0}
.dc .ok{font-weight:700} .dc .bad{font-weight:700;text-decoration:underline}
.dc table{border-collapse:collapse;width:100%;font-size:12.5px;table-layout:fixed}
.dc td{border-top:1px solid rgba(128,128,128,.35);padding:3px 4px;vertical-align:top;overflow-wrap:anywhere}
`;

// What to look at, per case and per thing the change reaches (docs/catalogue_versions.md).
const DC_CHECKS=[
  ["Open the cards","Import → “Open last cloud save”. The 8 test cards appear; nothing else is in this page’s ledger."],
  ["Before any Search again","Cards with two books show blocks, not a run-on line. Canaletto in England keeps its saved ● on the 2nd block; the rest have ● on the first. Single-book cards (Constable, Gwen John, Beauty of Life, Pearls to Pyramids, Canaletto & Bellotto) look exactly as in your app."],
  ["Search again, each Yale card","The first block is English in Yale’s own imprint, then other English, then other languages; hardcover before paperback. ● on the first. Below: the lookup’s calls."],
  ["Tap each other block","● moves, blocks stay put. The shop line, Museum shop link and bookstore buttons switch to that book; Publisher only where that book’s page was found."],
  ["Re-check museum shop","With the 2nd book picked: its answer for the Yale shop. Pick away and back: the answer stays."],
  ["Yale’s shop address","The line below must say “unchanged” after every Search again, Re-check and Add by link."],
  ["Blocked shop","Canaletto & Bellotto (KHM), Search again: the shop line says the shop could not be read, never “Not in the museum shop”."],
  ["Acquired","Mark Sensation and Sensibility Acquired: only its shop and publisher links remain, for the picked book."],
  ["Add by link","Import → Links → paste the Edward Lear show (Yale): it files under Yale CBA, its shop is the same Touchnet shop, and Yale’s address stays unchanged."],
  ["Saving","Save, then reload the page and Open last cloud save: the order and every ● come back as you left them."],
  ["Look","Phone width and dark mode: blocks readable, nothing runs off the side."],
];

function dcDiff(now){
  const base=DC_BASE.venue, cur=now||{};
  return DC_BASE.fields.filter(k=>JSON.stringify(cur[k]===undefined?null:cur[k])!==JSON.stringify(base[k]===undefined?null:base[k]))
    .map(k=>k+": was "+JSON.stringify(base[k])+", now "+JSON.stringify(cur[k]===undefined?null:cur[k]));
}

function DisplayCheck(){
  const [yale,setYale]=useState({read:false,diff:[]});
  const [logs,setLogs]=useState([]);
  useEffect(()=>{
    let stop=false;
    const tick=async()=>{
      const db=await useCap("db");
      if(stop||!db)return;
      try{
        const s=await db.doc(OCC_DOC).get();
        const v=s.exists?(((s.data()||{}).venues)||{})[DC_BASE.id]:null;
        if(!stop)setYale({read:true,missing:!v,diff:v?dcDiff(v):[]});
      }catch{ if(!stop)setYale({read:false,diff:[]}); }
      try{
        const q=await db.collection(LOOKUP_LOG).orderBy("at","desc").limit(12).get();
        if(!stop)setLogs(q.docs.map(d=>d.data()||{}));
      }catch{}
    };
    tick();
    const t=setInterval(tick,5000);
    return()=>{ stop=true; clearInterval(t); };
  },[]);
  return <>
    <div className="dc">
      <style>{DC_STYLE}</style>
      <h1>Catalogue Display Check</h1>
      <div className="soft">Your app’s own code, built from {DC_BUILD.branch} at {DC_BUILD.commit} ({DC_BUILD.builtAt}). Its own store: nothing here reaches your app. Lookups use your Parallel Search Key and Claude, as in your app.</div>
      <div className="box">
        <b>What to check</b>
        <ol>{DC_CHECKS.map(([h,t],i)=><li key={i}><b>{h}.</b> {t}</li>)}</ol>
      </div>
      <div className="box">
        <b>Yale’s stored shop address: </b>
        {!yale.read?<span>not read yet</span>
          :yale.missing?<span className="bad">MISSING — the Yale venue record is gone</span>
          :yale.diff.length?<span className="bad">CHANGED — {yale.diff.join("; ")}</span>
          :<span className="ok">unchanged</span>}
        <div className="soft" style={{overflowWrap:"anywhere"}}>{DC_BASE.venue.shopCatalogues}</div>
      </div>
      <div className="box">
        <b>Lookups on this page</b> <span className="soft">(newest first; calls = searches, page opens and Claude reads)</span>
        {logs.length?<table><tbody>{logs.map((l,i)=><tr key={i}>
          <td style={{width:"22%"}}>{String(l.at||"").slice(11,16)} UTC</td>
          <td style={{width:"22%"}}>{l.action}</td>
          <td>{l.title}</td>
          <td style={{width:"14%"}}>{l.calls} calls</td>
        </tr>)}</tbody></table>:<div className="soft">None yet.</div>}
      </div>
    </div>
    <App/>
  </>;
}
