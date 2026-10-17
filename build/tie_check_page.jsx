// tie_check_page.jsx — the root of the "Tie Check" page. build/tie_check.js appends this
// to Cat_Watch.jsx and mounts TieCheck instead of App, so every step is the app's own code:
//   1. Yale, a link venue: its show page read and its shop found as Add by link does
//      (fetchPage, readShowPage, shopLinkOnPage, discoverShop), then registered as Confirm
//      registers it (registerOccasional).
//   2. Find catalogue (lookupCatalogue) on each case in SC_CASE, one after another.
// Each lookup's record goes to this page's lookup log (saveLookupTape), read by
// node build/lookup_log.js. The pass test is code, below; nothing here searches or reads.

const SC_STYLE=`
:root{--sc-bg:#E8E4DE;--sc-card:#F5F2ED;--sc-ink:#1E1B18;--sc-soft:#78736C;--sc-rule:#CBC5BB;--sc-action:#2D4A3F;--sc-on:#fff;--sc-pass:#1F4C40;--sc-fail:#8A2A1A}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--sc-bg:#1A1815;--sc-card:#232019;--sc-ink:#EDE8E0;--sc-soft:#A8A29A;--sc-rule:#3A352E;--sc-action:#5E9E85;--sc-on:#111;--sc-pass:#8FD3B8;--sc-fail:#F0A08A;color-scheme:dark}}
:root[data-theme="dark"]{--sc-bg:#1A1815;--sc-card:#232019;--sc-ink:#EDE8E0;--sc-soft:#A8A29A;--sc-rule:#3A352E;--sc-action:#5E9E85;--sc-on:#111;--sc-pass:#8FD3B8;--sc-fail:#F0A08A;color-scheme:dark}
body{background:var(--sc-bg);color:var(--sc-ink)}
.sc{max-width:760px;margin:0 auto;padding-block:24px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));font:14px/1.5 -apple-system,BlinkMacSystemFont,sans-serif}
.sc h1{font:500 22px Georgia,serif;margin:0 0 4px;text-wrap:balance}
.sc .soft{color:var(--sc-soft);font-size:12.5px}
.sc button{background:var(--sc-action);color:var(--sc-on);border:0;border-radius:4px;padding:8px 16px;font-size:14px;cursor:pointer}
.sc button:disabled{opacity:.5;cursor:default}
.sc button:focus-visible{outline:2px solid var(--sc-ink);outline-offset:2px}
.sc .box{background:var(--sc-card);border:1px solid var(--sc-rule);border-radius:6px;padding:12px 14px;margin-top:14px}
.sc .row{display:flex;gap:10px;align-items:baseline;padding:6px 0;border-top:1px solid var(--sc-rule)}
.sc .row:first-child{border-top:0}
.sc .mark{font-weight:700;min-width:44px}
.sc .pass{color:var(--sc-pass)} .sc .fail{color:var(--sc-fail)}
.sc .row div{min-width:0;overflow-wrap:anywhere}
.sc pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;margin:6px 0 0}
.sc details{margin-top:6px}
`;

// Every ISBN a card carries: its own and each version's.
function tcIsbns(r){
  const v=Array.isArray(r&&r.editions)?r.editions:[];
  return [r&&r.isbn13].concat(v.map(x=>x&&x.isbn13),v.map(x=>x&&x.alsoIsbn13)).map(cleanIsbn).filter(Boolean);
}
// One line per case, worked out from what the lookup returned.
function tcGrade(c,out){
  if(!out)return{ok:false,got:"did not run"};
  if(!out.ok)return{ok:false,got:"the lookup did not finish"+(out.trouble?" — "+out.trouble:"")};
  const r=out.row||{}, isbns=tcIsbns(r);
  const said=r.hasCatalogue==="yes"?"filed: “"+(r.catalogueTitle||"no title")+"”"+(r.isbn13?", ISBN "+fmtIsbn(cleanIsbn(r.isbn13)||r.isbn13):""):"no catalogue filed";
  if(c.notIsbn)return{ok:!isbns.includes(c.notIsbn),got:said};
  if(c.wantIsbn)return{ok:isbns.includes(c.wantIsbn),got:said};
  return{ok:r.hasCatalogue==="yes",got:said};
}

function TieCheck(){
  const [state,setState]=useState({running:false,label:"",results:null,saved:null,why:null});
  async function run(){
    setState({running:true,label:"Finding Yale’s shop…",results:null,saved:null,why:null});
    let yale=null, why=null;
    try{
      const url=SC_CASE.yale.showUrl;
      const f=await fetchPage(url,"The exhibition's title, dates and description.",null,{full:true});
      const res=f.ok?f.results[0]:null;
      const page=res?readShowPage(res,url,linkReadVenue(url)):null;
      if(!page||!page.ok)why="Yale’s show page could not be read"+(page&&page.why?" — "+page.why:f.ok?"":" — "+f.detail)+".";
      else{
        const host=hostOf(siteUrlOf(url)), vc=occVenueId(host), pageShop=shopLinkOnPage(oneText(res),host);
        const finder=await discoverShop(pageShop,host,page.site,[]);
        yale={id:vc,name:page.site,host,shopHome:null,shopCatalogues:null,shelfKind:null,shopSearch:null,why:null,
          ...finder,turnedDown:[],pageShop,addedAt:new Date().toISOString(),confirmed:true};
        registerOccasional({[vc]:yale});
      }
    }catch(e){ why="Yale’s shop could not be found ("+String((e&&e.message)||e)+")."; }
    const results=[];
    for(const c of SC_CASE.cases){
      const museumId=c.venue==="yale"?(yale&&yale.id):c.venue;
      if(!museumId){ results.push({c,out:null}); continue; }
      setState(s=>({...s,label:c.title+" — searching…"}));
      const row={id:museumId+"-"+c.title.toLowerCase().replace(/[^a-z0-9]/g,""),museumId,title:c.title,
        startDate:c.startDate,endDate:c.endDate,summary:"",exUrl:c.exUrl,interested:true,watching:false,acquiring:false,
        buyNext:false,looked:false,hasCatalogue:"unknown"};
      const tape=tapeStart("Find catalogue",row);
      let out;
      try{ out=await lookupCatalogue(row,{label:l=>setState(s=>({...s,label:c.title+" — "+(l||"")})),prepareShop:async()=>{}}); }
      catch(e){ out={ok:false,detail:"The lookup stopped: "+String((e&&e.message)||e)}; }
      await saveLookupTape(tape,out);
      results.push({c,out});
    }
    let saved=false;
    try{
      const db=await useCap("db");
      if(db){ await db.doc("checks/R"+Date.now()).set({at:new Date().toISOString(),build:SC_BUILD,why,
        lines:results.map(({c,out})=>({title:c.title,...tcGrade(c,out),panel:out?out.detail||null:null}))}); saved=true; }
    }catch{}
    setState({running:false,label:"",results,saved,why});
  }
  const s=state, graded=s.results?s.results.map(x=>({...x,g:tcGrade(x.c,x.out)})):null;
  const failed=graded?graded.filter(x=>!x.g.ok).length:0;
  return <div className="sc">
    <style>{SC_STYLE}</style>
    <h1>Tie Check</h1>
    <div className="soft">Cat Watch {SC_BUILD.appVersion} code, built from {SC_BUILD.branch} at {SC_BUILD.commit}, {SC_BUILD.builtAt}.
      Runs the app's own Find catalogue on {SC_CASE.cases.length} shows, one after another. Uses your Parallel Search Key and Claude, as a lookup in the app does. Takes a few minutes.</div>
    <div className="box">
      {SC_CASE.cases.map((c,i)=><div key={i}><b>{c.title}</b> <span className="soft">— {c.what}</span></div>)}
      <div style={{marginTop:10,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={run} disabled={s.running}>{s.running?"Running…":graded?"Run again":"Run the check"}</button>
        {s.running&&<span className="soft">{s.label}</span>}
      </div>
    </div>
    {graded&&<div className="box">
      <div style={{fontWeight:600,marginBottom:4}} className={failed?"fail":"pass"}>{failed?"Failed — "+failed+" of "+graded.length+" lines wrong.":"Passed — every line as it should be."}</div>
      {s.why&&<div className="soft">{s.why}</div>}
      {graded.map(({c,out,g},i)=><div className="row" key={i}>
        <span className={"mark "+(g.ok?"pass":"fail")}>{g.ok?"PASS":"FAIL"}</span>
        <div><div>{c.title}: {c.what}</div><div className="soft">{g.got}</div>
          {out&&out.detail&&<details><summary className="soft">The lookup's own panel</summary><pre>{out.detail}</pre></details>}</div>
      </div>)}
      <div className="soft" style={{marginTop:8}}>{s.saved?"This run is saved on the page for Claude to read.":"This run could not be saved on the page."}</div>
    </div>}
  </div>;
}
