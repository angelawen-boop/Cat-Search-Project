//@ The import session: the pop-up's inputs, the Read, the review's proposals and decisions, the shop screen's turn, Apply and Cancel, and the pending links, pages and pastes read on opening.
//@piece useImportSession

// Import, review and the shop screen are one session with one memory, three layouts over it (docs/restructure.md,
// run C7). The screen hands in, by name, the document's rows and actions (its import reminder as
// documentImportApplied), the sweep log's recordSweep, the filters' "these cards changed" (filtersImportApplied),
// the link venues' working copy and actions (their own "import applied" as venuesImportApplied, Look again as
// venuesLookAgain), the one job flag's start, end and progress, the error line and "ask her". It never clears a
// filter, writes a venue or touches the ledger except through those; it hands back ONE object, no raw setter.
// App calls it last: its opening reads are the last the page makes.
function useImportSession({rows,ignored,hasLedger,commit,addToQuarantine,documentImportApplied,readOnlyStop:roStop,requestImport,requestOpenCloud,recordSweep,filtersImportApplied,occVenues,hold,dropHeld,addShop,venuesLookAgain,toConfirm,venuesImportApplied,jobStarts,jobEnds,showProgress,showError,ask}){
  // Add by link: one pop-up for CSV and Links, nothing added to the page (her design).
  // importMode: null · "choose" · "links" (the box open below them) · "needLedger" (empty page).
  const[importMode,setImportMode]=useState(null);
  // The shop screen, after the review: {partial, ids}. shopLooking: the venue being
  // looked for again.
  const[shopScreen,setShopScreen]=useState(null);
  const[shopLooking,setShopLooking]=useState(null);
  const[shopAdding,setShopAdding]=useState(null);   // {id, text}: the venue whose shop link she is typing
  const[readVenues,setReadVenues]=useState([]);   // the new venues the last Read met
  const[linkNote,setLinkNote]=useState(null);
  const[linkText,setLinkText]=useState("");
  const[linkFails,setLinkFails]=useState([]);
  const[pages,setPages]=useState([]);   // Pages: saved pages waiting, as text ({url,title,name,text})
  const[pastes,setPastes]=useState(()=>pasteBoxes([]));   // Paste: {id,at,url,text} boxes, two to start
  const pagesFileRef=useRef(null);
  const linksAtRead=useRef(null);   // the links the open review was read from; Cancel import puts them back
  const linkRead=useRef({on:false,stop:false});   // a Read under way; Cancel mid-Read stops it after the link in hand
  const[seenInFile,setSeenInFile]=useState(null);
  const refreshFileRef=useRef(null);
  const[proposals,setProposals]=useState(null); // null = not in refresh review; array = reviewing
  // Listing pages the sweep could not read. NOT proposals — see isMarkerRow().
  const[coverage,setCoverage]=useState([]);
  const[tally,setTally]=useState(null);
  const[decisions,setDecisions]=useState({}); // proposal index -> "accept"|"reject"|"addnew"

  useEffect(()=>{
    // Add by link: links still waiting in the box.
    readPendingLinks().then(t=>{ if(t)setLinkText(t); });
    readPendingPages().then(l=>{ if(l.length)setPages(l); });
    readPendingPastes().then(l=>{ if(l.length)setPastes(pasteBoxes(l)); });
  },[]);

  // Pasted boxes are stored as she types, a moment after the last key: copying on a phone
  // means leaving the page, which can reload it.
  useEffect(()=>{ if(importMode!=="paste")return; const t=setTimeout(()=>writePendingPastes(pastes),800); return()=>clearTimeout(t); },[pastes,importMode]);

  function handleRefreshFile(e){
    setReadVenues([]);
    const file=e.target.files[0]; if(!file)return;
    if(roStop()){ e.target.value=""; return; }
    const reader=new FileReader();
    reader.onload=()=>{
      const res=readSweepFile(String(reader.result||""),rows,ignored);
      if(res.error){showError(res.error);return;}
      if(res.nothingNew){
        recordSweep(res.seen);
        setCoverage(res.coverage||[]); setTally(res.tally||null); setSeenInFile(res.seen||null);
        showError(res.nothingNew);
        return;
      }
      showError(null); setProposals(res.props); setCoverage(res.coverage||[]); setTally(res.tally||null); setSeenInFile(res.seen||null); setDecisions(topicPresets(res.props));
      labelCards(res.props);
    };
    reader.readAsText(file); e.target.value="";
  }


  // Every new show gets its period while she reviews the cards (labelCardsJob), written onto
  // the cards only if they are still the same cards.
  async function labelCards(props){
    const out=await labelCardsJob(props);
    if(out&&out.labels.size)setProposals(cur=>labelsOntoCards(cur,props,out));
  }

  // ── ADD BY LINK — the Read button. The job is readShows (the Links/Pages/Paste parts);
  // here the screen is busy, shows its progress and puts what comes back on screen.
  async function readLinks(kind){
    const input=readInputs(kind,{linkText,pages,pastes});
    if(input.nothing){ setLinkFails(input.nothing); return; }
    jobStarts(); setLinkNote(null); setLinkFails([]);
    linkRead.current={on:true,stop:false};
    const out=await readShows(input,occVenues,{progress:showProgress,stopped:()=>linkRead.current.stop});
    // Cancelled mid-Read: nothing from this Read is kept; every link stays in the box.
    if(out.stopped){ linkRead.current={on:false,stop:false}; showProgress({done:0,total:0,label:""}); jobEnds(); setImportMode(null); return; }
    linkRead.current={on:false,stop:false};
    if(out.venuesChanged){ hold(out.venues); }   // held, not stored: see useLinkVenues
    showProgress({done:0,total:0,label:""}); jobEnds(); setReadVenues(out.met);
    const done=readOutcome(input,out,{pages,pastes,rows,ignored});
    // The box (or list) is stored when the import finishes.
    setPending(input.kind,done.pending);
    setLinkFails(out.fails);
    linksAtRead.current=null;
    if(done.finished){
      setTally(done.tally);
      writePending(input.kind,done.pending);   // nothing to approve: this Read is finished
      setLinkNote(done.note);
      return;
    }
    if(done.note){ setLinkNote(done.note); return; }
    if(!done.props)return;
    setProposals(done.props); setCoverage([]); setTally(done.tally); setSeenInFile(null); setDecisions(topicPresets(done.props));
    labelCards(done.props);
    linksAtRead.current=done.held;
    // Done with the pop-up — unless a link could not be read: then it stays
    // under the review, its lines waiting for her when the review closes.
    if(!out.fails.length)setImportMode(null);
  }
  // The waiting box, list or boxes on screen, by kind ("links", "pages", "paste").
  const setPending=(kind,value)=>kind==="paste"?setPastes(value):kind==="pages"?setPages(value):setLinkText(value);
  // Pages chosen: the screen reads each file; pickedPages turns them into the list's pages.
  async function pickPages(e){
    const files=[...(e.target.files||[])]; e.target.value="";
    if(!files.length)return;
    const read=[];
    for(const f of files){
      try{ read.push({name:f.name,text:await f.text()}); }
      catch(err){ read.push({name:f.name,failed:true,error:err}); }
    }
    const picked=pickedPages(pages,read,h=>new DOMParser().parseFromString(h,"text/html"));
    setPages(picked.list); setLinkFails(picked.bad); setLinkNote(null);
    if(picked.store)writePendingPages(picked.list);
  }
  // The shop screen's answers go to the link venues (useLinkVenues); here only the shop screen's own boxes.
  // Not a link → the box stays open.
  function addShopFor(id,text){
    if(!occVenues[id])return;
    if(!String(text||"").trim()){ setShopAdding(null); return; }
    const href=typedLink(text); if(!href)return;
    setShopAdding(null);
    addShop(id,href);
  }
  // "Look again": the venue being looked for shows while the link venues' search runs.
  async function lookAgain(id){
    if(!occVenues[id])return;
    setShopLooking(id);
    await venuesLookAgain(id);
    setShopLooking(null);
  }
  // The shop screen asks about a venue outside her list whose shop is unconfirmed (venuesGoingIn).
  function venuesToConfirm(){ return toConfirm(proposals,decisions); }
  // THE REVIEW'S LAST BUTTON. With a shop to confirm it is "Next" and opens
  // the shop screen; the ledger moves only when that screen is done.
  function proceedRefresh(partial){
    const ids=venuesToConfirm();
    if(ids.length){ setShopScreen({partial,ids}); return; }
    applyRefresh(partial);
  }

  // Decision model. Each card holds: {mode} for an add ("accept"/"reject"/"never"),
  // or {fields:{j:"accept"|"reject"}, mode:"addnew"?} for fill/change.
  const setCardMode=(i,v)=>setDecisions(d=>{const cur=d[i]||{};return{...d,[i]:{...cur,mode:cur.mode===v?undefined:v}};});
  // Which value she picked where the file disagreed with itself. Per card, per
  // field; absent means "still on the pre-picked fuller one".
  const setChoice=(i,field,val)=>setDecisions(d=>{const cur=d[i]||{};return{...d,[i]:{...cur,choices:{...(cur.choices||{}),[field]:val}}};});
  const setFieldDec=(i,j,v)=>setDecisions(d=>{const cur=d[i]||{};const f={...(cur.fields||{})};f[j]=f[j]===v?undefined:v;return{...d,[i]:{...cur,fields:f,mode:undefined}};});

  // The cards applied by the engine (applyCards); here only what the screen and the store keep.
  function applyRefresh(partial){
    const out=applyCards(rows,proposals,decisions,partial);
    // The import is finished, so what it held back is stored now: a CSV's sweep log
    // (seenInFile — a link is not a sweep), or for a Read what goes back in the box
    // (pendingAfterApply). "Clear" in the box empties it.
    if(seenInFile)recordSweep(seenInFile);
    else{ const p=pendingAfterApply(linksAtRead.current,proposals,decisions,{linkText,pages,pastes}); setPending(p.kind,p.value); writePending(p.kind,p.value); }
    linksAtRead.current=null;
    // A new quarantine goes to the store, the copy that survives a Reset; the export
    // carries the list too.
    if(out.quarantineAdd)addToQuarantine(out.quarantineAdd);
    commit(out.ledger,new Date().toISOString());
    venuesImportApplied(proposals,decisions);
    setShopScreen(null); setShopAdding(null); setReadVenues([]);
    setProposals(null); setDecisions({}); setSeenInFile(null); documentImportApplied(out.done);
    filtersImportApplied(out.touched);
  }
  // Cancel import after a Read puts every link (or page) it read back (pendingAfterCancel), stored.
  function cancelRefresh(){
    const p=pendingAfterCancel(linksAtRead.current,{linkText,pages,pastes});
    if(p){ setPending(p.kind,p.value); writePending(p.kind,p.value); linksAtRead.current=null; }
    dropHeld(); setShopScreen(null); setShopAdding(null); setReadVenues([]); setProposals(null); setDecisions({}); setCoverage([]); setTally(null); setSeenInFile(null); }

  const openImportChoice=()=>{setLinkNote(null);setImportMode(hasLedger?"choose":"needLedger");};
  // The import pop-up, the review and the shop screen: each button's handler, as the layout carries it.
  const openCloudFromImport=()=>{setImportMode(null);requestOpenCloud();};
  const loadFromImport=()=>{setImportMode(null);requestImport();};
  const chooseCsvImport=()=>{setImportMode(null);refreshFileRef.current?.click();};
  const pickImportTab=kind=>{ if(importMode!==kind){ setLinkFails([]); setLinkNote(null); } setImportMode(kind); };
  const typeLinkText=v=>setLinkText(v);
  const clearLinkText=()=>{ setLinkText(""); setLinkFails([]); setLinkNote(null); writePendingLinks(""); };
  const typeInPasteBox=(id,k,v)=>setPastes(l=>l.map(y=>y.id===id?{...y,[k]:v}:y));
  const clearPasteBox=id=>{ const l=pastes.map(y=>y.id===id?newBox():y); setPastes(l); writePendingPastes(l); };
  const clearAllPasteBoxes=()=>{ const l=pasteBoxes([]); setPastes(l); setLinkFails([]); setLinkNote(null); writePendingPastes(l); };
  const addPasteBox=()=>setPastes(l=>[...l,newBox()]);
  const clearPages=()=>{ setPages([]); setLinkFails([]); setLinkNote(null); writePendingPages([]); };
  const cancelImportPopup=()=>{ if(linkRead.current.on){ linkRead.current.stop=true; showProgress(p=>({...p,label:readStopping(importMode)})); return; } if(!proposals)dropHeld(); setImportMode(null); };
  const askPartialApply=(acceptedCount,undecidedCount)=>ask({
    title:partialApplyWords({acceptedCount,undecidedCount}).title,
    text:partialApplyWords({acceptedCount,undecidedCount}).text,
    act:()=>proceedRefresh(true)});
  const toggleShopAdd=(id,typing,added,link)=>setShopAdding(typing?null:{id,text:added?link:""});
  const typeShopLink=(id,text)=>setShopAdding({id,text});
  const closeShopAdd=()=>setShopAdding(null);
  const backFromShop=()=>{setShopAdding(null);setShopScreen(null);};
  return{importMode,shopScreen,shopLooking,shopAdding,linkNote,linkText,linkFails,pages,pastes,pagesFileRef,refreshFileRef,proposals,coverage,tally,decisions,handleRefreshFile,readLinks,pickPages,addShopFor,lookAgain,venuesToConfirm,proceedRefresh,setCardMode,setChoice,setFieldDec,applyRefresh,cancelRefresh,openImportChoice,openCloudFromImport,loadFromImport,chooseCsvImport,pickImportTab,typeLinkText,clearLinkText,typeInPasteBox,clearPasteBox,clearAllPasteBoxes,addPasteBox,clearPages,cancelImportPopup,askPartialApply,toggleShopAdd,typeShopLink,closeShopAdd,backFromShop};
}
