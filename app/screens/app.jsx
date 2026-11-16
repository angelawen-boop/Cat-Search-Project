//@ The whole main screen, to be split into its screens in layer 5b.
//@piece momentLines

// A sweep moment on two lines, the date then the time, so every row of the Details table wraps the same way.
function momentLines(label,iso){const t=fmtRefresh(iso),i=t.lastIndexOf(" ");return i<0?label+t:<>{label+t.slice(0,i)}<br/>{t.slice(i+1)}</>;}
//@piece App


export default function App(){
  const[rows,setRows]=useState([]);
  // A row from an occasional venue this page's store has not met still files
  // under a venue — see registerUnseenOccasional. Idempotent; costs a loop.
  registerUnseenOccasional(rows);
  const[loaded,setLoaded]=useState(false);
  const[busy,setBusy]=useState(false);
  const[busyId,setBusyId]=useState(null);
  const[lookLabel,setLookLabel]=useState(null); // the progress line while a lookup or Re-check runs (lookupLabel)
  const[prog,setProg]=useState({done:0,total:0,label:""});
  const[labelSaid,setLabelSaid]=useState(null);   // the last Label run's line
  const[relabelId,setRelabelId]=useState(null);   // the card a Relabel is asking about
  const[digitalBox,setDigitalBox]=useState(null);  // the card whose Digital catalogue box is open
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
  const[occVenues,setOccVenues]=useState({});
  // The stored copy of the new venues; occVenues is the working copy. The store is
  // written only when the ledger moves — an unfinished import keeps nothing (her decision).
  const occSaved=useRef({});
  const[error,setError]=useState(null);
  const[rechecking,setRechecking]=useState(false);   // which of the card's two buttons is running
  const[recheckSaid,setRecheckSaid]=useState(null);  // {id,text,failed}: Re-check's answer, shown on that card
  const[saveErr,setSaveErr]=useState(false);
  const[debug,setDebug]=useState(null);
  const[lastRun,setLastRun]=useState(null);
  // Quarantine (docs/app.md §4): the third outcome beside reject and dismiss. The MAP is
  // stored (tombstones and all); the LIST is derived from it — what she sees and what
  // the export carries.
  const[quarantine,setQuarantine]=useState({});
  const[quarWhy,setQuarWhy]=useState(null);
  const[storeUnread,setStoreUnread]=useState([]);   // parts of the store that could not be read this opening
  useEffect(()=>{ storeUnreadSeen=setStoreUnread; setStoreUnread([...STORE_UNREAD]); return()=>{ storeUnreadSeen=()=>{}; }; },[]);
  const ignored=useMemo(()=>activeQuarantine(quarantine),[quarantine]);
  const ignoredByVenue=useMemo(()=>{
    const ord=id=>{ const i=MUSEUMS.findIndex(m=>m.id===id); return i<0?MUSEUMS.length:i; };
    return ignored.slice().sort((a,b)=>ord(a.venueId)-ord(b.venueId)||String(a.title||"").localeCompare(String(b.title||"")));
  },[ignored]);
  const[showIgnored,setShowIgnored]=useState(false);
  // The cloud readout, never silent (her ask). saveState: idle | off | saving | saved |
  // failed; lastSaved: the live record last written or read; saveErr: why it is not
  // saving. cloudLive: what the store held on open ({rec,data} / {rec:null} / {why}).
  const[cloudLive,setCloudLive]=useState(null);
  // A sentence from the last import's check against the cloud copy (trial).
  const[cloudCheck,setCloudCheck]=useState(null);
  // Saving is armed only once a ledger is opened in this page load, so an empty portal
  // never overwrites the cloud copy.
  const cloudArmed=useRef(false);
  // ONE COPY EDITS AT A TIME — see cloudSessionClaim. True for the rest of
  // this page load once another copy is found editing.
  const[readOnly,setReadOnly]=useState(false);
  const goReadOnly=useCallback(()=>{ setReadOnly(true); },[]);
  // Every action that would change the ledger asks this first.
  const roStop=()=>{ if(!cloudReadOnly)return false; setError(RO_LINE); return true; };
  const[cloudT]=useState(cloudTracker); // what this page knows of the live ledger (cloudTracker)
  const cloudLatest=useRef(null); // the ledger as it stands, for the save to read
  const[snaps,setSnaps]=useState(null);       // null = not read yet
  const[snapWhy,setSnapWhy]=useState(null);
  const[showSnaps,setShowSnaps]=useState(false);
  const[snapBusy,setSnapBusy]=useState(false);
  // The Save panel (her design): the offline file plus, ticked by default, the same file
  // in Cloud Saves.
  const[showSave,setShowSave]=useState(false);
  const[saveLabel,setSaveLabel]=useState("");
  const[saveCloud,setSaveCloud]=useState(true);
  const[saveBusy,setSaveBusy]=useState(false);
  const[saveNote,setSaveNote]=useState(null);   // {text, ok} — what the last Save did
  const[showResetCards,setShowResetCards]=useState(false);
  const[resetQuery,setResetQuery]=useState("");
  // Per-venue freshness, two facts: { [venueId]: { attempted: iso, returned: iso|null } }.
  const[venueSeen,setVenueSeen]=useState({});
  // "Last refreshed" = the latest attempt in the sweep log, never the ledger's lastRun
  // (docs/app.md §5). An empty store reads "Unknown".
  const lastSweep=useMemo(()=>{
    let out=null;
    for(const v of Object.values(venueSeen||{})){
      const a=v&&v.attempted;
      if(a&&(!out||a>out))out=a;
    }
    return out;
  },[venueSeen]);
  const[freshWhy,setFreshWhy]=useState(null);   // why the sweep log is empty, when it is
  const[seenInFile,setSeenInFile]=useState(null);
  // A download we started but cannot confirm arrived. Never clears `dirty`.
  const[unconfirmedSave,setUnconfirmedSave]=useState(null);
  const[lastSaved,setLastSaved]=useState(null);
  const[saveState,setSaveState]=useState("idle");
  const cloudNotSaving=saveState==="failed"||saveState==="off";
  const[dirty,setDirty]=useState(false);
  const[savedFile,setSavedFile]=useState(null);
  const[loadedInfo,setLoadedInfo]=useState(null);
  const[confirmBox,setConfirmBox]=useState(null); // {text, act} for confirm-before-replace
  const[,setTick]=useState(0);
  const list=useFilters();
  const{filters,sort,bnOnly,periodView,viewToken,showSearch,searchRef,sortBy,dateReversed,refreshTouched,pinTouched,toggleSet,clearFilters,pickSort,toggleSearchBox,typeSearch,clearSearchText,toggleAcqWanted,toggleAcqOwned,toggleBuyNextView,toggleAcq3mo,toggleAcq6mo,toggleAcqHasCat,toggleAcqNoCat,toggleAcqDigital,toggleWatchedOnly,toggleDismissedOnly,toggleLabelledOnly,toggleShowAll,searchFor,ledgerLoaded,importApplied}=list;
  const{venueF,themeF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqHasCat,acqNoCat,acqDigital,acqBuyNext,bnPeriod,bnDate,showAll,dismissedOnly,labelledF,watchedF,search}=filters;
  const[drag,setDrag]=useState(null); // the card being dragged in the Buy next view
  const[openCards,setOpenCards]=useState({});
  const[undo,setUndo]=useState(null);
  const undoTimer=useRef(null);
  const fileRef=useRef(null);
  const refreshFileRef=useRef(null);
  // Words selected anywhere on the page (her design): a button beside them searches them, exactly as typed.
  const[selPick,setSelPick]=useState(null);
  const[proposals,setProposals]=useState(null); // null = not in refresh review; array = reviewing
  // Listing pages the sweep could not read. NOT proposals — see isMarkerRow().
  const[coverage,setCoverage]=useState([]);
  const[tally,setTally]=useState(null);
  const[decisions,setDecisions]=useState({}); // proposal index -> "accept"|"reject"|"addnew"
  const[refreshDone,setRefreshDone]=useState(null); // {added,filled,changed} after applying
  const dragOn=bnOnly&&!bnPeriod&&!bnDate&&!readOnly;
  // Light or dark: remembered in browser storage (a per-device convenience, wrapped —
  // storage can throw). First visit follows the machine; her pick then wins there.
  const[theme,setTheme]=useState(()=>{
    try{ const v=localStorage.getItem("cw-theme"); if(v==="dark"||v==="light")return v; }catch{}
    try{ if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)return "dark"; }catch{}
    return "light";
  });
  const toggleTheme=()=>setTheme(t=>{
    const n=t==="dark"?"light":"dark";
    try{ localStorage.setItem("cw-theme",n); }catch{}
    return n;
  });
  // The page around the component paints its own ground before React runs, so tell it
  // too; color-scheme makes scrollbars and form controls follow.
  useEffect(()=>{
    try{
      const d=document.documentElement;
      d.setAttribute("data-theme",theme);
      d.style.colorScheme=theme;
      document.body.style.background=theme==="dark"?"#1A1815":"#E8E4DE";
      document.body.style.color=theme==="dark"?"#EDE8E0":"#1E1B18";
    }catch{}
  },[theme]);
  // Follows the selection (never in a box she types in);
  // hidden a moment after the selection goes, so a tap on it still lands.
  useEffect(()=>{
    let hide=null;
    const place=()=>{
      const sel=window.getSelection&&window.getSelection();
      const typing=/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName||"");
      const text=sel&&!typing&&!sel.isCollapsed&&sel.rangeCount?sel.toString().replace(/\u2197/g," ").replace(/\s+/g," ").trim():"";
      if(!text){ if(!hide)hide=setTimeout(()=>{hide=null;setSelPick(null);},400); return; }
      if(hide){clearTimeout(hide);hide=null;}
      // Under the LAST line of the selection, and below Android's handles (they hang about 20px
      // under each end and take a tap meant for anything beneath them — her report), so it can always be tapped.
      const range=sel.getRangeAt(0), lines=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
      const rc=lines.length?lines.reduce((a,r)=>r.bottom>a.bottom+1?r:a):range.getBoundingClientRect(), vw=window.innerWidth, vh=window.innerHeight;
      const x=Math.min(Math.max(rc.left+rc.width/2,16+100),vw-16-100);
      const gap=32;
      const top=lines.length?Math.min(...lines.map(r=>r.top)):rc.top;
      const y=rc.bottom+gap+40<vh?rc.bottom+gap:Math.max(8,top-44);
      setSelPick({text,x,y});
    };
    document.addEventListener("selectionchange",place);
    window.addEventListener("scroll",place,{passive:true});
    return()=>{document.removeEventListener("selectionchange",place);window.removeEventListener("scroll",place);if(hide)clearTimeout(hide);};
  },[]);
  const searchPick=()=>{
    if(!selPick)return;
    searchFor(selPick.text); setSelPick(null);
    try{window.getSelection().removeAllRanges();}catch{}
    // Lands at the start of the cards (her ask), once the list has redrawn.
    setTimeout(()=>{const el=document.querySelector("[data-card-list]");window.scrollTo({top:el?el.getBoundingClientRect().top+window.scrollY-8:0});},60);
  };

  useEffect(()=>{
    // Opens empty: a workspace waiting for her ledger file (docs/app.md §2). Nothing
    // is fetched on open.
    setRows([]);
    setLoaded(true);
    // The sweep log, quarantine and Add-by-link state are not part of the ledger, so
    // they load here, before any file is opened. Read once, not subscribed.
    readSweepLog().then(({log,why})=>{ setVenueSeen(log); setFreshWhy(why); });
    readQuarantine().then(({map,why})=>{ setQuarantine(map); setQuarWhy(why); });
    // The cloud copy is read on open; during the trial it is only read (CLOUD_OPENS).
    (async()=>{
      if(await cloudOtherEditing())goReadOnly();
      tidyOccasional();
      const o=await cloudOpenRead(cloudT);
      setCloudLive(o.live);
      if(o.off){ setSaveState("off"); setSaveErr(o.off); }
      if(o.rec){ setLastSaved(o.rec); if(o.open)openCloudData(o.rec,o.data); }
    })();
    // Add by link: the venues it has met, and links still waiting in the box.
    readOccasional().then(map=>{ occSaved.current=map; registerOccasional(map); setOccVenues(map); });
    readPendingLinks().then(t=>{ if(t)setLinkText(t); });
    readPendingPages().then(l=>{ if(l.length)setPages(l); });
    readPendingPastes().then(l=>{ if(l.length)setPastes(pasteBoxes(l)); });
  },[]);

  // Pasted boxes are stored as she types, a moment after the last key: copying on a phone
  // means leaving the page, which can reload it.
  useEffect(()=>{ if(importMode!=="paste")return; const t=setTimeout(()=>writePendingPastes(pastes),800); return()=>clearTimeout(t); },[pastes,importMode]);

  // Keep the "Last saved ... ago" text and its colour current.
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),30000);return()=>clearInterval(t);},[]);

  // THE HEARTBEAT (cloudHeartbeat), and letting go on the way out (cloudLetGo).
  useEffect(()=>{
    const beat=async()=>{ if(await cloudHeartbeat())goReadOnly(); };
    const t=setInterval(beat,SESSION_BEAT_MS);
    window.addEventListener("pagehide",cloudLetGo);
    return()=>{ clearInterval(t); window.removeEventListener("pagehide",cloudLetGo); };
  },[goReadOnly]);

  // EDITS mark the ledger dirty: changed since the last offline Save. The
  // cloud copy saves them by itself; `dirty` now only decides whether a Load
  // or Reset must ask first while the cloud is NOT saving.
  const commit=useCallback(async(next,lr)=>{
    if(cloudReadOnly){ setError(RO_LINE); return; }
    setRows(next);
    if(lr!==undefined)setLastRun(lr);
    setDirty(true);
    setSaveNote(null);
    
  },[]);

  // LOADS (Import, Reset) are NOT unsaved work. Freshly loaded data matches its
  // source, so there's nothing to lose yet. The unsaved warning only appears once
  // you actually change something.
  const loadLedger=useCallback((next,lr,info,extra,display)=>{
    if(cloudReadOnly&&!display){ setError(RO_LINE); return; }
    setRows(next);
    setLastRun(lr!==undefined?lr:null);
    // A ledger's quarantine is merged in, never switched to (latest decision wins).
    const fromFile=quarantineFromList((extra&&extra.ignored)||[]);
    if(Object.keys(fromFile).length){
      setQuarantine(prev=>{ const merged=mergeQuarantine(prev,fromFile); writeQuarantine(merged); return merged; });
    }
    // venueSeen is never read from the file: the sweep log lives in the page's store.
    setDirty(false);
    setSaveNote(null);
    setSavedFile(null);
    setUnconfirmedSave(null);
    setError(null);
    setLoadedInfo(info||null);
    setRefreshDone(null);
    ledgerLoaded();
  },[]);

  // ── THE CLOUD LEDGER, INSIDE THE APP ──────────────────────────────────────
  // What a save reads: the ledger as it stands on screen — the same three things Save's
  // file holds.
  cloudLatest.current={rows,ignored,lastRun};

  // The save (cloudSaveLatest): what it says goes on screen.
  const cloudSaveNow=useCallback(async()=>{
    const r=await cloudSaveLatest(cloudT,()=>cloudLatest.current,
      s=>{ if(s==="saving")setSaveState("saving"); else{ setLastSaved(s.saved); setSaveErr(null); setSaveState("saved"); } });
    if(!r)return;
    if(r.readOnly){ goReadOnly(); setError(RO_LINE); }
    else if(r.off){ setSaveState("off"); setSaveErr(r.off); }
    else{ setSaveState("failed"); setSaveErr(r.failed); }
  },[goReadOnly]);
  // INSTANT SAVE: shortly after every change, once a ledger is open.
  useEffect(()=>{
    if(!cloudArmed.current||!rows.length)return;
    const t=setTimeout(cloudSaveNow,600);
    return()=>clearTimeout(t);
  },[rows,ignored,lastRun,cloudSaveNow]);

  // Before a whole ledger replaces the cloud copy (Load, Reset): cloudCheckBeforeReplace. Returns
  // true when it put a line on screen about what was loaded; throws when the safety copy could not be
  // taken.
  async function guardCloudBeforeReplace(incoming,reason){
    const g=await cloudCheckBeforeReplace(cloudT,incoming,reason,setDebug);
    if(g.snapped)loadSnaps();   // an open drawer shows it straight away
    setCloudCheck(g.check);
    if(g.failed)throw g.failed;   // the caller stops: nothing is armed, nothing overwritten
    return g.said;
  }

  // OPEN THE CLOUD COPY. During the trial, by her button; afterwards, on open.
  function openCloudData(rec,data){
    const o=cloudOpening(cloudT,rec,data);
    loadLedger(o.rows,o.lastRun,o.info,{ignored:o.ignored},cloudReadOnly);
    setLastSaved(rec); setSaveState("saved"); setSaveErr(null); setCloudCheck(null);
    cloudArmed.current=true;
  }
  async function requestOpenCloud(){
    const go=async()=>{ const why=await cloudReadToOpen(openCloudData); if(why)setError(why); };
    if(rows.length>0&&dirty&&cloudNotSaving)setConfirmBox({text:cloudOpenQuestion(),act:go});
    else go();
  }

  // SNAPSHOTS.
  async function loadSnaps(){
    const r=await cloudSavesRead();
    setSnaps(r.snaps); setSnapWhy(r.why);
  }
  function requestRollback(s){
    if(roStop())return;
    setConfirmBox({...cloudRollbackQuestion(s,snaps),
      act:async()=>{
        const r=await cloudRollback(cloudT,s,snaps,{current:()=>rows.length?cloudLatest.current:null,started:()=>setSnapBusy(true)});
        if(!r)return;
        try{
          if(r.why){ setSnapWhy(r.why); return; }
          loadLedger(r.rows,r.lastRun,r.info,{ignored:r.ignored});
          setDirty(true);          // it is in no file yet
          setCloudCheck(null);
          cloudArmed.current=true; // the save that follows makes it the live copy
          await loadSnaps();
        }catch(e){ setSnapWhy(cloudRollbackNotDone(e)); }
        finally{ setSnapBusy(false); }
      }});
  }
  async function downloadSnapshot(s){
    const line=await cloudSaveDownload(s);
    if(line!==null)setSnapWhy(line);
  }


  // The sweep log is written when the import FINISHES (her decision: an unfinished
  // import keeps nothing); held in seenInFile until then. A file with nothing to
  // propose is recorded at once. AL-013.
  const recordSweep=(seen)=>{
    if(!seen) return;
    const vs=mergeSweepLog(venueSeen,seen);
    setVenueSeen(vs);
    saveSweepLog(vs).then(setFreshWhy);
  };

  function handleRefreshFile(e){
    setReadVenues([]);
    const file=e.target.files[0]; if(!file)return;
    if(roStop()){ e.target.value=""; return; }
    const reader=new FileReader();
    reader.onload=()=>{
      const res=readSweepFile(String(reader.result||""),rows,ignored);
      if(res.error){setError(res.error);return;}
      if(res.nothingNew){
        recordSweep(res.seen);
        setCoverage(res.coverage||[]); setTally(res.tally||null); setSeenInFile(res.seen||null);
        setError(res.nothingNew);
        return;
      }
      setError(null); setProposals(res.props); setCoverage(res.coverage||[]); setTally(res.tally||null); setSeenInFile(res.seen||null); setDecisions(topicPresets(res.props));
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
  // Label (labelLedgerStart, labelLedgerJob): the screen is busy, shows its progress and puts
  // the labels onto the rows as they stand when the answer arrives.
  async function labelLedger(){
    if(busy||roStop())return;
    const start=labelLedgerStart(rows);
    if(start.said){ setLabelSaid(start.said); return; }
    setBusy(true); setLabelSaid(null);
    const out=await labelLedgerJob(start.todo,setProg);
    if(out.labels){ setRows(prev=>labelsOntoRows(prev,out.labels)); setDirty(true); setSaveNote(null); }
    setLabelSaid(out.said);
    setDebug(out.debug);
    setBusy(false); setProg({done:0,total:0,label:""});
  }

  // Relabel (relabelJob): what it says shows in that card's drawer.
  async function relabel(id){
    const r=rows.find(x=>x.id===id);
    if(!r||busy||relabelId||roStop())return;
    setRelabelId(id); setRecheckSaid(null);
    const out=await relabelJob(r,()=>cloudLatest.current.rows);
    if(out.rows){ setRows(out.rows); setDirty(true); setSaveNote(null); }
    setRecheckSaid(out.said); setRelabelId(null);
  }

  function keepPeriod(id){
    const r=rows.find(x=>x.id===id); if(!r||roStop())return;
    commit(markKeepPeriod(rows,id,new Date().toISOString()));
    setRecheckSaid(keptPeriodSaid(id,r));
  }

  // ── ADD BY LINK — the Read button. The job is readShows (the Links/Pages/Paste parts);
  // here the screen is busy, shows its progress and puts what comes back on screen.
  async function readLinks(kind){
    const input=readInputs(kind,{linkText,pages,pastes});
    if(input.nothing){ setLinkFails(input.nothing); return; }
    setBusy(true); setLinkNote(null); setLinkFails([]);
    linkRead.current={on:true,stop:false};
    const out=await readShows(input,occVenues,{progress:setProg,stopped:()=>linkRead.current.stop});
    // Cancelled mid-Read: nothing from this Read is kept; every link stays in the box.
    if(out.stopped){ linkRead.current={on:false,stop:false}; setProg({done:0,total:0,label:""}); setBusy(false); setImportMode(null); return; }
    linkRead.current={on:false,stop:false};
    if(out.venuesChanged){ registerOccasional(out.venues); setOccVenues(out.venues); }   // held, not stored: see occSaved
    setProg({done:0,total:0,label:""}); setBusy(false); setReadVenues(out.met);
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
  // The shop screen's answers are held in the working copy and stored when the ledger
  // moves; Cancel import drops them, Back keeps them (her decision). Confirmed in a
  // finished import → never asked again.
  function holdVenues(next){ registerOccasional(next); setOccVenues(next); }
  // Back to what the store holds: the import's venues and answers dropped.
  function dropHeldVenues(){
    const saved=occSaved.current;
    for(const id of Object.keys(MU)) if(isOcc(id)&&!saved[id]){ delete MU[id]; KNOWN_VENUES.delete(id); }
    registerOccasional(saved); registerUnseenOccasional(rows); setOccVenues(saved);
  }
  // The shop screen's answers (venuesShopConfirmed, venuesNoShop, venuesShopAdded), held.
  function confirmShop(id,english){ if(occVenues[id])holdVenues(venuesShopConfirmed(occVenues,id,english)); }
  function noShopFor(id){ if(occVenues[id])holdVenues(venuesNoShop(occVenues,id)); }
  // Not a link → the box stays open.
  function addShopFor(id,text){
    if(!occVenues[id])return;
    if(!String(text||"").trim()){ setShopAdding(null); return; }
    const href=typedLink(text); if(!href)return;
    setShopAdding(null);
    holdVenues(venuesShopAdded(occVenues,id,href));
  }
  // "Look again" (lookAgainJob); what it found goes onto the venues as they stand then (venuesLookedAgain).
  async function lookAgain(id){
    const v=occVenues[id]; if(!v)return;
    setShopLooking(id);
    const found=await lookAgainJob(v);
    setShopLooking(null);
    setOccVenues(prev=>{
      const next=venuesLookedAgain(prev,id,found);
      registerOccasional(next); return next; });
  }
  // The shop screen asks about a venue outside her list whose shop is unconfirmed (venuesGoingIn).
  function venuesToConfirm(){ return shopVenuesToConfirm(proposals,decisions,occVenues,occSaved.current); }
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
    if(out.quarantineAdd){
      setQuarantine(prev=>{ const merged=mergeQuarantine(prev,out.quarantineAdd);
        saveImportQuarantine(merged).then(why=>{ if(why) setQuarWhy(why); });
        return merged; });
    }
    commit(out.ledger,new Date().toISOString());
    if(occVenues!==occSaved.current){ const kept=answeredOnly(occVenues,occSaved.current,venuesGoingIn(proposals,decisions)); writeOccasional(kept); occSaved.current=kept; registerOccasional(kept); setOccVenues(kept); }
    setShopScreen(null); setShopAdding(null); setReadVenues([]);
    setProposals(null); setDecisions({}); setSeenInFile(null); setRefreshDone(out.done);
    importApplied(out.touched);
  }
  // Cancel import after a Read puts every link (or page) it read back (pendingAfterCancel), stored.
  function cancelRefresh(){
    const p=pendingAfterCancel(linksAtRead.current,{linkText,pages,pastes});
    if(p){ setPending(p.kind,p.value); writePending(p.kind,p.value); linksAtRead.current=null; }
    dropHeldVenues(); setShopScreen(null); setShopAdding(null); setReadVenues([]); setProposals(null); setDecisions({}); setCoverage([]); setTally(null); setSeenInFile(null); }




  // The lookup runs at top level (lookupCatalogue); the page hands it its progress
  // line and, for an occasional venue, the check that works out its shop search.
  const lookHooks={label:setLookLabel,prepareShop:fillShopSearch};

  // A link venue's shop search, worked out once at its first lookup (shopSearchAdditions) — then stored.
  async function fillShopSearch(id){
    const v=occVenues[id]||occSaved.current[id];
    const adds=await shopSearchAdditions(MU[id],v);
    if(!adds)return;
    const add=x=>x?{...x,...adds}:x;
    if(occSaved.current[id]){ const saved={...occSaved.current,[id]:add(occSaved.current[id])}; occSaved.current=saved; writeOccasional(saved); }
    setOccVenues(prev=>{ const next=prev[id]?{...prev,[id]:add(prev[id])}:prev; registerOccasional(next); return next; });
    MU[id]={...MU[id],...occVenue(id,{...v,...adds})};
  }
  // Find catalogue / Search again (findCatalogueJob): what it found lands on the ledger as it
  // stands when the answer arrives; its line goes on the card, or its sentence in the banner.
  async function findOneCat(id){
    if(roStop())return;
    setBusy(true);setBusyId(id);setError(null);setRecheckSaid(null);
    const row=rows.find(r=>r.id===id);
    const out=await findCatalogueJob(row,lookHooks,()=>cloudLatest.current.rows);
    setDebug(out.detail);
    if(out.card)setRecheckSaid(out.card);
    if(out.rows)await commit(out.rows);
    if(out.banner)setError(out.banner);
    setBusy(false);setBusyId(null);setLookLabel(null);
  }

  // "Re-check museum shop" (recheckShopJob): its answer is printed on the card, under the button she pressed.
  async function recheckShop(id){
    if(roStop())return;
    setBusy(true);setBusyId(id);setRechecking(true);setError(null);setRecheckSaid(null);
    const found=rows.find(r=>r.id===id);
    const out=await recheckShopJob(found,lookHooks,()=>cloudLatest.current.rows);
    setDebug(out.detail);
    if(out.rows)await commit(out.rows);
    setRecheckSaid(out.card);
    setBusy(false);setBusyId(null);setRechecking(false);setLookLabel(null);
  }

  const dismiss=id=>{commit(markDismiss(rows,id));if(undoTimer.current)clearTimeout(undoTimer.current);setUndo({id});undoTimer.current=setTimeout(()=>setUndo(null),10000);};
  const undoDismiss=()=>{if(!undo)return;commit(markRestore(rows,undo.id));setUndo(null);if(undoTimer.current)clearTimeout(undoTimer.current);};
  const restore=id=>commit(markRestore(rows,id));
  const toggleWatch=id=>commit(markWatch(rows,id));
  const setAcq=(id,v)=>commit(markAcquiring(rows,id,v));
  const toggleBuyNext=id=>commit(markBuyNext(rows,id));
  const moveBuyNext=(id,beforeId,afterId)=>commit(markBuyNextMove(rows,id,beforeId,afterId,view.map(r=>r.id)));
  // ── DRAG TO REORDER, BUY NEXT ONLY ──
  // Touch: hold a card ~0.45s (a buzz where the phone allows), then drag; a swipe before
  // that scrolls. Mouse: press and move. Buttons, links and version picks keep their taps.
  const dragGesture=useRef(null);
  const dragActs=useRef(null);
  dragActs.current={moveBuyNext};
  const startDrag=(e,id)=>{
    if(dragGesture.current||(e.button!==undefined&&e.button>0))return;
    if(e.target.closest&&e.target.closest("button,a,input,select,textarea,label,[role]"))return;
    const touch=e.type==="touchstart";
    if(touch&&e.touches.length!==1)return;
    const p0=touch?e.touches[0]:e;
    const g={lifted:false,x:p0.clientX,y:p0.clientY,lastY:p0.clientY,scroll0:window.scrollY,raf:0,timer:0};
    dragGesture.current=g;
    const place=()=>{
      const dy=g.lastY+window.scrollY-(g.y+g.scroll0),r=g.rects[g.from],centre=r.top+r.h/2+dy;
      g.to=g.rects.filter((q,i)=>i!==g.from&&q.top+q.h/2<centre).length;
      setDrag(d=>d&&{...d,dy,to:g.to});
    };
    const tick=()=>{ // near the screen's top or bottom edge, the page scrolls with her
      const E=70,H=window.innerHeight,v=g.lastY<E?-(E-g.lastY)/4:g.lastY>H-E?(g.lastY-(H-E))/4:0;
      if(v){window.scrollBy(0,v);place();}
      g.raf=requestAnimationFrame(tick);
    };
    const lift=()=>{
      const els=[...document.querySelectorAll("[data-buynext]")];
      g.ids=els.map(el=>el.getAttribute("data-buynext"));g.from=g.ids.indexOf(id);
      if(g.from<0)return end();
      g.rects=els.map(el=>{const b=el.getBoundingClientRect();return{top:b.top+window.scrollY,h:b.height};});
      g.lifted=true;g.to=g.from;
      if(touch){try{navigator.vibrate&&navigator.vibrate(25);}catch(_){}}
      setDrag({id,from:g.from,to:g.from,dy:0,h:g.rects[g.from].h});
      if(typeof requestAnimationFrame!=="undefined")g.raf=requestAnimationFrame(tick);
    };
    const move=ev=>{
      const p=ev.touches?ev.touches[0]:ev;if(!p)return;
      if(!g.lifted){
        const far=Math.hypot(p.clientX-g.x,p.clientY-g.y)>(touch?10:5);
        if(!far)return;
        if(touch)return end();
        lift();if(!g.lifted)return;
      }
      if(ev.cancelable)ev.preventDefault();
      g.lastY=p.clientY;place();
    };
    const up=()=>{
      if(g.lifted){
        const rest=g.ids.filter(x=>x!==id);
        dragActs.current.moveBuyNext(id,rest[g.to]||null,g.to>0?rest[g.to-1]:null);
        // The release is not a click on whatever sits under it.
        const eat=ev=>{ev.stopPropagation();ev.preventDefault();};
        window.addEventListener("click",eat,true);setTimeout(()=>window.removeEventListener("click",eat,true),0);
      }
      end();
    };
    const end=()=>{
      clearTimeout(g.timer);if(g.raf)cancelAnimationFrame(g.raf);
      document.removeEventListener(touch?"touchmove":"mousemove",move);
      document.removeEventListener(touch?"touchend":"mouseup",up);
      document.removeEventListener("touchcancel",end);
      dragGesture.current=null;setDrag(null);
    };
    document.addEventListener(touch?"touchmove":"mousemove",move);
    document.addEventListener(touch?"touchend":"mouseup",up);
    if(touch){document.addEventListener("touchcancel",end);g.timer=setTimeout(lift,450);}
  };
  // Once a card is lifted, a finger's move drags it and does not scroll the page. Chrome
  // lets a move be held back only by a listener in place before the touch begins.
  useEffect(()=>{
    if(!dragOn)return;
    const hold=ev=>{if(dragGesture.current&&dragGesture.current.lifted&&ev.cancelable)ev.preventDefault();};
    document.addEventListener("touchmove",hold,{passive:false});
    return()=>document.removeEventListener("touchmove",hold,{passive:false});
  },[dragOn]);
  const setPick=(id,i)=>{ const next=markPick(rows,id,i,new Date().toISOString()); if(next!==rows)commit(next); };
  // A card's buttons, by name. One function for the life of the page (so LedgerCard can skip
  // redrawing) that calls this render's handler, which sees the current ledger.
  const cardActs=useRef(null);
  // Her digital catalogue link: an empty box leaves the card as it was; not a link → the box stays open.
  const setDigital=(id,text)=>{ if(!String(text||"").trim()){ setDigitalBox(null); return; }
    const href=typedLink(text); if(!href)return; setDigitalBox(null);
    const next=markDigital(rows,id,href,new Date().toISOString()); if(next!==rows)commit(next); };
  cardActs.current={restore,toggleWatch,dismiss,setAcq,toggleBuyNext,setPick,findOneCat,recheckShop,relabel,keepPeriod,setDigital,
    openDigital:id=>setDigitalBox(id),closeDigital:()=>setDigitalBox(null),
    toggleOpen:id=>setOpenCards(o=>({...o,[id]:!o[id]}))};
  const cardAct=useCallback((name,...a)=>cardActs.current[name](...a),[]);

  // AN IMPORT CHECKS THE CLOUD COPY FIRST (guardCloudBeforeReplace), then
  // replaces the screen and arms saving. If the cloud copy differed and could
  // not be kept as a snapshot, the import stops there and says so.
  function handleImport(e){const file=e.target.files[0];if(!file)return;if(roStop()){e.target.value="";return;}const reader=new FileReader();reader.onload=async()=>{const got=readLedgerFile(reader.result);if(got.error){setError(got.error);return;}const next=got.rows,ign=got.ignored;let said=false;try{said=await guardCloudBeforeReplace({rows:next,ignored:ign},"import");}catch{return;}loadLedger(next,got.lastRun,said?null:got.note,{ignored:ign});cloudArmed.current=true;setDebug(got.debug);};reader.readAsText(file);e.target.value="";}

  // Confirm-before-replace: Import and Reset can wipe the screen in one tap, so
  // they ask first WHENEVER there is unsaved work showing.
  const openFilePicker=()=>fileRef.current?.click();
  function requestImport(){
    const ask=loadQuestion(rows.length,dirty,cloudNotSaving);
    if(ask){setConfirmBox({text:ask,act:openFilePicker});}
    else openFilePicker();
  }
  const doReset=async()=>{if(roStop())return;const seed=resetSeed();try{await guardCloudBeforeReplace({rows:seed.rows,ignored},"reset");}catch{return;}cloudArmed.current=true;loadLedger(seed.rows,null,seed.note);setDebug(seed.debug);};
  // Reset to Seed always asks while a ledger is on screen (her decision).
  function requestReset(){
    const ask=resetQuestion(rows.length,dirty,cloudNotSaving);
    if(ask){setConfirmBox({text:ask,act:doReset});}
    else doReset();
  }

  // Save: saveShrinkQuestion asks first when it would shrink the ledger; saveFile and saveLedger do the work.
  async function handleSave(){
    if(saveBusy||!rows.length)return;
    const ask=await saveShrinkQuestion(rows.length);
    if(ask){ setConfirmBox({...ask,act:saveNow}); return; }
    saveNow();
  }
  async function saveNow(){
    if(saveBusy||!rows.length)return;
    const f=saveFile({rows,ignored,lastRun,typed:saveLabel});
    if(f.note){ setSaveNote(f.note); return; }
    setSaveBusy(true);
    try{
      const r=await saveLedger(f,saveCloud,{kept:()=>{ if(showSnaps)loadSnaps(); },refused:setDebug});
      setSaveNote({ok:r.ok,text:r.text,file:f.filename});
      if(r.file==="saved"){
        setError(null); setDirty(false); setUnconfirmedSave(null);
        setShowSave(false); setSaveLabel(""); setSaveCloud(true);
        // THE IMPORT REMINDER ASKS FOR BOTH, her wording — it goes only when both happened.
        if(r.cloud===true)setRefreshDone(null);
      }
      setDebug(r.debug);
    }finally{ setSaveBusy(false); }
  }

  // One artist, one group: worked out from every labelled show, dismissed ones included.
  const byArtist=useMemo(()=>artistPeriods(rows),[rows]);
  const view=useMemo(()=>listView(rows,filters,sort,byArtist),[rows,byArtist,sortBy,filters,pinTouched,refreshTouched,dateReversed]);

  // The scrubber's periods: the view's groups in order, each with its first card's place.
  const scrubGroups=useMemo(()=>scrubGroupsOf(view,periodView,byArtist),[view,periodView,byArtist]);
  const{drawLimit,moreRef,showTop,jumpToPeriod,jumpToBottom}=useListDrawing(view,viewToken,scrubGroups);

  const counts=useMemo(()=>listCounts(rows),[rows]);

  const C=PALETTES[theme];
  // TH, chip, pBtn and lnk keep their identity between renders, so LedgerCard can skip redrawing.
  const TH=useMemo(()=>tiersFor(theme),[theme]);          // the tier colours for THIS theme
  const chip=useCallback(on=>({padding:"4px 10px",borderRadius:999,border:"1px solid "+(on?C.ink:C.rule),background:on?C.ink:"transparent",color:on?C.onAction:C.soft,fontSize:11,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"}),[C]);
  const sBtn=useMemo(()=>({padding:"5px 12px",borderRadius:4,border:"1px solid "+C.rule,background:"transparent",color:C.soft,fontSize:11,fontWeight:500,cursor:"pointer"}),[C]);
  const pBtn=useMemo(()=>({...sBtn,background:C.action,color:C.onAction,border:"none",opacity:busy?0.5:1,cursor:busy?"wait":"pointer"}),[C,busy]);
  const lnk=useMemo(()=>linkButton(C),[C]);
  // The look-and-feel the layout pieces take, as one object (it keeps its identity while its members do).
  // The review cards' and shop screen's decision buttons (decBtn), always the same four in the same places.
  const ui=useMemo(()=>({C,TH,chip,sBtn,pBtn,lnk,
    decBtn:(active,color)=>({padding:"3px 9px",borderRadius:4,border:"1px solid "+(active?color:C.rule),background:active?color:"transparent",color:active?C.onAction:C.soft,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"})
  }),[C,TH,chip,sBtn,pBtn,lnk]);


  // The line under the buttons: what the last Save did, until the next change; otherwise
  // what was loaded. Whether work is safe is the cloud line's job.
  const hasLedger=rows.length>0;
  const cloudStatus=cloudStatusLine({saveState,saveErr,lastSaved,cloudLive,hasLedger});
  // The "not saved to a file" banner is unwired, not deleted (her decision): with the
  // cloud copy saving every change it would nag. If the trial fails, set true.
  const FILE_UNSAVED_WARNING=false;
  const showUnsavedBanner=FILE_UNSAVED_WARNING&&hasLedger&&dirty;
  // THE LOAD LINE — what was opened, until the first change.
  let savedText=null;
  // No line at all with no ledger open (her decision).
  if(!hasLedger){savedText=null;}
  // "Loaded N exhibitions" is not shown while the cloud check line speaks (her decision);
  // it still shows with no check line, and for Reset, roll-back and open-from-cloud.
  else if(!dirty&&!saveNote&&loadedInfo){savedText=loadedInfo;}

  // What the layout pieces call, each by a name that says what it does. The bodies are the ones the
  // buttons carried inline: the screen's own setters stay here.
  const toggleSavePanel=()=>setShowSave(v=>!v);
  const closeSavePanel=()=>setShowSave(false);
  const typeSaveLabel=v=>setSaveLabel(v);
  const chooseSaveCloud=on=>setSaveCloud(on);
  const openImportChoice=()=>{setLinkNote(null);setImportMode(hasLedger?"choose":"needLedger");};
  const dismissCloudCheck=()=>setCloudCheck(null);
  const toggleResetCards=()=>{if(showResetCards)setResetQuery("");setShowResetCards(v=>!v);};
  const toggleCloudSaves=()=>{setShowSnaps(v=>!v); if(!showSnaps)loadSnaps();};
  const toggleQuarantine=()=>setShowIgnored(v=>!v);
  const typeResetQuery=v=>setResetQuery(v);
  const askResetCard=id=>setConfirmBox({title:"Reset this search?",yes:"Yes",act:()=>{
    commit(resetOneCard(rows,id));
    if(recheckSaid&&recheckSaid.id===id)setRecheckSaid(null);
    setResetQuery("");}});
  const releaseFromQuarantine=x=>{
    if(roStop())return;
    const at=new Date().toISOString();
    setQuarantine(prev=>{ const next=mergeQuarantine(prev,{[x.key]:{venueId:x.venueId,title:x.title,at,state:"released"}});
      writeQuarantine(next).then(ok=>{ if(!ok) setQuarWhy("That release couldn\u2019t be saved to this page\u2019s store, so it may come back when you reload."); });
      return next; });
    setDirty(true);};
  const dismissConfirm=()=>setConfirmBox(null);
  const answerConfirm=()=>{const a=confirmBox.act;setConfirmBox(null);a&&a();};
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
  const cancelImportPopup=()=>{ if(linkRead.current.on){ linkRead.current.stop=true; setProg(p=>({...p,label:readStopping(importMode)})); return; } if(!proposals)dropHeldVenues(); setImportMode(null); };
  const askPartialApply=(acceptedCount,undecidedCount)=>setConfirmBox({
    title:partialApplyWords({acceptedCount,undecidedCount}).title,
    text:partialApplyWords({acceptedCount,undecidedCount}).text,
    act:()=>proceedRefresh(true)});
  const toggleShopAdd=(id,typing,added,link)=>setShopAdding(typing?null:{id,text:added?link:""});
  const typeShopLink=(id,text)=>setShopAdding({id,text});
  const closeShopAdd=()=>setShopAdding(null);
  const backFromShop=()=>{setShopAdding(null);setShopScreen(null);};

  if(!loaded)return(<div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.soft,minHeight:"100vh",display:"grid",placeItems:"center",fontSize:13}}>Opening the ledger{"\u2026"}</div>);

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.ink,minHeight:"100vh",padding:"20px 16px 60px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      <header style={{maxWidth:760,margin:"0 auto 14px"}}>
        <Toolbar ui={ui} theme={theme} hasLedger={hasLedger} fileRef={fileRef} refreshFileRef={refreshFileRef} requestImport={requestImport} handleImport={handleImport} handleRefreshFile={handleRefreshFile} toggleTheme={toggleTheme} toggleSavePanel={toggleSavePanel} openImportChoice={openImportChoice}/>
        <SavePanel ui={ui} showSave={showSave} hasLedger={hasLedger} saveLabel={saveLabel} saveCloud={saveCloud} saveBusy={saveBusy} typeSaveLabel={typeSaveLabel} chooseSaveCloud={chooseSaveCloud} handleSave={handleSave} closeSavePanel={closeSavePanel}/>
        <StatusLines ui={ui} cloudStatus={cloudStatus} hasLedger={hasLedger} cloudLive={cloudLive} requestOpenCloud={requestOpenCloud} savedText={savedText} cloudCheck={cloudCheck} dismissCloudCheck={dismissCloudCheck} saveNote={saveNote}/>
        <Banners ui={ui} hasLedger={hasLedger} refreshDone={refreshDone} unconfirmedSave={unconfirmedSave} showUnsavedBanner={showUnsavedBanner} storeUnread={storeUnread} quarWhy={quarWhy} busy={busy} prog={prog} importMode={importMode} labelSaid={labelSaid} readOnly={readOnly} error={error}/>
        <DiagnosticBox ui={ui} debug={debug}/>
        <SweepLog ui={ui} lastSweep={lastSweep} venueSeen={venueSeen} freshWhy={freshWhy} counts={counts}/>

        <CountsRow ui={ui} counts={counts} toggleSearchBox={toggleSearchBox}/>
        <SearchRow ui={ui} showSearch={showSearch} search={search} searchRef={searchRef} typeSearch={typeSearch} clearSearchText={clearSearchText}/>
      </header>

      <div style={{maxWidth:760,margin:"0 auto 12px",display:"flex",flexDirection:"column",gap:5}}>
        <SortRow ui={ui} sort={sort} filters={filters} bnOnly={bnOnly} pickSort={pickSort}/>
        <WhenRow ui={ui} filters={filters} toggleSet={toggleSet}/>
        <VenueRow ui={ui} filters={filters} toggleSet={toggleSet}/>
        <ThemeRow ui={ui} filters={filters} toggleSet={toggleSet}/>
        <AcquiringRow ui={ui} filters={filters} toggleAcqWanted={toggleAcqWanted} toggleAcqOwned={toggleAcqOwned} toggleBuyNextView={toggleBuyNextView} toggleAcq3mo={toggleAcq3mo} toggleAcq6mo={toggleAcq6mo} toggleAcqHasCat={toggleAcqHasCat} toggleAcqNoCat={toggleAcqNoCat} toggleAcqDigital={toggleAcqDigital}/>
        <ShowingRow ui={ui} filters={filters} toggleWatchedOnly={toggleWatchedOnly} toggleDismissedOnly={toggleDismissedOnly} toggleLabelledOnly={toggleLabelledOnly} toggleShowAll={toggleShowAll} clearFilters={clearFilters}/>
      </div>

      <CardList ui={ui} view={view} sort={sort} bnOnly={bnOnly} periodView={periodView} byArtist={byArtist} drawLimit={drawLimit} cardState={{busyId,busy,rechecking,lookLabel,recheckSaid,relabelId,digitalBox,openCards}} dragOn={dragOn} drag={drag} startDrag={startDrag} cardAct={cardAct} moreRef={moreRef}/>
      {scrubGroups.length>0&&<PeriodScrubber groups={scrubGroups} C={C} onJump={jumpToPeriod}/>}
      <SelectedWordsButton ui={ui} selPick={selPick} searchPick={searchPick}/>
      <JumpButtons ui={ui} showTop={showTop} undo={undo} jumpToBottom={jumpToBottom}/>
      <UndoBar ui={ui} undo={undo} undoDismiss={undoDismiss}/>
      <ToolsRow ui={ui} requestReset={requestReset} labelLedger={labelLedger} toggleResetCards={toggleResetCards} toggleCloudSaves={toggleCloudSaves} toggleQuarantine={toggleQuarantine}/>
      <CloudSaves ui={ui} showSnaps={showSnaps} snaps={snaps} snapWhy={snapWhy} snapBusy={snapBusy} downloadSnapshot={downloadSnapshot} requestRollback={requestRollback}/>
      <ResetAndQuarantine ui={ui} rows={rows} showIgnored={showIgnored} ignored={ignored} ignoredByVenue={ignoredByVenue} quarWhy={quarWhy} showResetCards={showResetCards} resetQuery={resetQuery} typeResetQuery={typeResetQuery} askResetCard={askResetCard} releaseFromQuarantine={releaseFromQuarantine}/>
      {/* The import pop-up (her design; docs/add_by_link.md): CSV and Links, and a small
          Cancel. Under the review (1100) so cards open on top; under the confirm box (1200). */}
      <ImportPopup ui={ui} importMode={importMode} cancelImportPopup={cancelImportPopup}>
        <ImportNeedLedger ui={ui} importMode={importMode} openCloudFromImport={openCloudFromImport} loadFromImport={loadFromImport}/>
        <ImportTabs ui={ui} importMode={importMode} busy={busy} chooseCsvImport={chooseCsvImport} pickImportTab={pickImportTab}/>
        <ImportPaste ui={ui} importMode={importMode} busy={busy} pastes={pastes} typeInPasteBox={typeInPasteBox} clearPasteBox={clearPasteBox} clearAllPasteBoxes={clearAllPasteBoxes} addPasteBox={addPasteBox} readLinks={readLinks} prog={prog} linkNote={linkNote} linkFails={linkFails}/>
        <ImportPages ui={ui} importMode={importMode} busy={busy} pages={pages} pagesFileRef={pagesFileRef} pickPages={pickPages} clearPages={clearPages} readLinks={readLinks} prog={prog} linkNote={linkNote} linkFails={linkFails}/>
        <ImportLinks ui={ui} importMode={importMode} busy={busy} linkText={linkText} typeLinkText={typeLinkText} clearLinkText={clearLinkText} readLinks={readLinks} prog={prog} linkNote={linkNote} linkFails={linkFails}/>
      </ImportPopup>
      <ReviewPanel ui={ui} proposals={proposals} tally={tally} coverage={coverage} decisions={decisions} setFieldDec={setFieldDec} setCardMode={setCardMode} setChoice={setChoice} cancelRefresh={cancelRefresh} askPartialApply={askPartialApply} proceedRefresh={proceedRefresh} venuesToConfirm={venuesToConfirm}/>
      {/* The shop screen (her design): one card per new venue with an unconfirmed shop;
          the ledger moves only when every card is answered. Over the review (1100),
          under the confirm box (1200). */}
      {shopScreen&&proposals&&<ShopScreen ui={ui} shopScreen={shopScreen} occVenues={occVenues} shopLooking={shopLooking} shopAdding={shopAdding} confirmShop={confirmShop} lookAgain={lookAgain} noShopFor={noShopFor} addShopFor={addShopFor} toggleShopAdd={toggleShopAdd} typeShopLink={typeShopLink} closeShopAdd={closeShopAdd} backFromShop={backFromShop} applyRefresh={applyRefresh}/>}
      <ConfirmBox ui={ui} confirmBox={confirmBox} dismissConfirm={dismissConfirm} answerConfirm={answerConfirm}/>
      <Footer ui={ui}/>
    </div>
  );
}
