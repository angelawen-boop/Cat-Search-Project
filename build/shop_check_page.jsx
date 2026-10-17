// shop_check_page.jsx — the root of the "Yale Shop Check" page. build/shop_check.js
// appends this to Cat_Watch.jsx and mounts ShopCheck instead of App, so every step below
// is the app's own code, called in the order the app calls it:
//   1. Add by link's Read (readLinks): the show page opened, read, and a new venue's shop
//      looked for (fetchPage, readShowPage, shopLinkOnPage, discoverShop).
//   2. Confirm on the New Venue Shops screen: the venue registered as the app registers it
//      (registerOccasional → occEntry).
//   3. Find catalogue (findOneCat): lookupCatalogue on the show's card, with the app's
//      hooks (fillShopSearch does nothing for a venue found by finder 3).
//   4. Re-check museum shop (recheckShop): recheckShopRow on the card the lookup wrote.
// Each step's record goes to this page's own lookup log (saveLookupTape), read by
// node build/lookup_log.js. The pass test is code, below; nothing here searches or reads.
// The case is SC_CASE, written in by the build with SC_BUILD.

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
`;

// The pass test: one line per thing the fix must do, each worked out from what the app
// returned. A step that did not finish fails its lines, saying why.
function scGrade(finder,lookup,recheck){
  const c=SC_CASE, out=[];
  const f=finder||{};
  out.push({ok:f.shop==="found"&&f.shopCatalogues===c.wantShelf,
    what:"The finder takes Yale's Publications section",
    got:f.shop==="found"?f.shopCatalogues:(f.shop||"did not run")+(f.why?" — "+f.why:"")});
  const r=lookup&&lookup.row||{};
  out.push({ok:!!(lookup&&lookup.ok)&&r.shopState==="shop",
    what:"The lookup files the catalogue as In the museum shop",
    got:lookup?(lookup.ok?"shopState: "+(r.shopState||"none"):"lookup did not finish"):"did not run"});
  out.push({ok:!!(lookup&&lookup.ok)&&String(r.shopUrl||"").includes(c.wantProduct),
    what:"Its shop link is Constable's own page",
    got:lookup&&lookup.ok?(r.shopUrl||"no link"):"—"});
  out.push({ok:!!(lookup&&lookup.ok)&&cleanIsbn(r.isbn13)===c.wantIsbn,
    what:"ISBN "+c.wantIsbn.slice(0,3)+"-"+c.wantIsbn.slice(3),
    got:lookup&&lookup.ok?(r.isbn13||"none"):"—"});
  out.push({ok:!!(recheck&&recheck.ok)&&recheck.said==="Re-checked: still for sale in the museum shop.",
    what:"Re-check museum shop finds it still for sale",
    got:recheck?(recheck.said||"no answer"):"did not run"});
  return out;
}

function ShopCheck(){
  const [state,setState]=useState({running:false,label:"",lines:null,finder:null,lookup:null,saved:null});
  async function run(){
    const c=SC_CASE;
    setState({running:true,label:"Reading the show page…",lines:null,finder:null,lookup:null,saved:null});
    let finder=null, lookup=null, recheck=null, venue=null;
    // 1. As readLinks does for one link from a venue the store has never met.
    const tape=tapeStart("Add by link",{title:c.showUrl,exUrl:c.showUrl});
    try{
      const f=await fetchPage(c.showUrl,"The exhibition's title, dates and description.",null,{full:true});
      const res=f.ok?f.results[0]:null;
      if(!res)finder={shop:"failed",why:f.ok?"The page came back empty.":f.detail};
      else{
        const page=readShowPage(res,c.showUrl,linkReadVenue(c.showUrl));
        if(!page.ok)finder={shop:"failed",why:page.why};
        else{
          const host=hostOf(siteUrlOf(c.showUrl)), vc=occVenueId(host);
          setState(s=>({...s,label:"Looking for "+page.site+"’s shop…"}));
          const pageShop=shopLinkOnPage(oneText(res),host);
          finder=await discoverShop(pageShop,host,page.site,[]);
          venue={id:vc,name:page.site,host,shopHome:null,shopCatalogues:null,shelfKind:null,shopSearch:null,why:null,
            ...finder,turnedDown:[],pageShop,addedAt:new Date().toISOString()};
          tape.row={title:c.title,museumId:vc,exUrl:c.showUrl};
        }
      }
    }catch(e){ finder={shop:"failed",why:"Couldn’t read it ("+String((e&&e.message)||e)+")."}; }
    tape.link={finder};
    await saveLookupTape(tape,{ok:!!finder&&finder.shop!=="failed",said:finder&&finder.why||null});
    // 2. Confirm, then 3. Find catalogue — only when the finder found a books section.
    if(venue&&finder.shop==="found"){
      registerOccasional({[venue.id]:{...venue,confirmed:true}});
      setState(s=>({...s,label:"Finding the catalogue…"}));
      const row={id:venue.id+"-"+c.title.toLowerCase().replace(/[^a-z0-9]/g,""),museumId:venue.id,title:c.title,
        startDate:c.startDate,endDate:c.endDate,summary:"",exUrl:c.showUrl,interested:true,watching:false,acquiring:false,
        buyNext:false,looked:false,hasCatalogue:"unknown"};
      const t2=tapeStart("Find catalogue",row);
      try{ lookup=await lookupCatalogue(row,{label:l=>setState(s=>({...s,label:l||s.label})),prepareShop:async()=>{}}); }
      catch(e){ lookup={ok:false,detail:"The lookup stopped: "+String((e&&e.message)||e)}; }
      await saveLookupTape(t2,lookup);
      // 4. Re-check, on the card the lookup wrote — only when it was filed in the shop.
      if(lookup&&lookup.ok&&lookup.row&&lookup.row.shopState==="shop"){
        setState(s=>({...s,label:"Re-checking the museum shop\u2026"}));
        const t3=tapeStart("Re-check museum shop",lookup.row);
        try{ recheck=await recheckShopRow(lookup.row,{label:l=>setState(s=>({...s,label:l||s.label})),prepareShop:async()=>{}}); }
        catch(e){ recheck={ok:false,said:"Re-check stopped: "+String((e&&e.message)||e)}; }
        await saveLookupTape(t3,recheck);
      }
    }
    const lines=scGrade(finder,lookup,recheck);
    // The run, kept in this page's store for the session that reads it.
    let saved=false;
    try{
      const db=await useCap("db");
      if(db){ await db.doc("checks/R"+Date.now()).set({at:new Date().toISOString(),build:SC_BUILD,finder,lines,
        card:lookup&&lookup.row?cardFields(lookup.row):null,panel:lookup?lookup.detail||null:null,
        recheck:recheck?{ok:!!recheck.ok,said:recheck.said||null,detail:recheck.detail||null}:null}); saved=true; }
    }catch{}
    setState({running:false,label:"",lines,finder,lookup,saved});
  }
  const s=state, passed=s.lines&&s.lines.every(l=>l.ok);
  return <div className="sc">
    <style>{SC_STYLE}</style>
    <h1>Yale Shop Check</h1>
    <div className="soft">Cat Watch {SC_BUILD.appVersion} code, built from {SC_BUILD.branch} at {SC_BUILD.commit}, {SC_BUILD.builtAt}.
      Runs the app's own shop finder, Find catalogue and Re-check museum shop on one case. Uses your Parallel Search Key and Claude, as a lookup in the app does.</div>
    <div className="box">
      <div><b>{SC_CASE.title}</b> — Yale Center for British Art</div>
      <div className="soft" style={{overflowWrap:"anywhere"}}>{SC_CASE.showUrl}</div>
      <div style={{marginTop:10,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={run} disabled={s.running}>{s.running?"Running…":s.lines?"Run again":"Run the check"}</button>
        {s.running&&<span className="soft">{s.label}</span>}
      </div>
    </div>
    {s.lines&&<div className="box">
      <div style={{fontWeight:600,marginBottom:4}} className={passed?"pass":"fail"}>{passed?"Passed — every line as it should be.":"Failed — "+s.lines.filter(l=>!l.ok).length+" of "+s.lines.length+" lines wrong."}</div>
      {s.lines.map((l,i)=><div className="row" key={i}>
        <span className={"mark "+(l.ok?"pass":"fail")}>{l.ok?"PASS":"FAIL"}</span>
        <div><div>{l.what}</div><div className="soft">{l.got}</div></div>
      </div>)}
      <div className="soft" style={{marginTop:8}}>{s.saved?"This run is saved on the page for Claude to read.":"This run could not be saved on the page."}</div>
    </div>}
    {s.lookup&&s.lookup.detail&&<div className="box"><div className="soft">The lookup's own panel</div><pre>{s.lookup.detail}</pre></div>}
  </div>;
}
