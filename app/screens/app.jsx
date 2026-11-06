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
  // A Read's progress, its note and each line it could not read: one piece for Links, Pages and
  // Paste; failAs(f) is how a line names what it could not read.
  const readStatus=failAs=><>
    {busy&&prog.total>0&&<div style={{marginTop:8}}>
      <div style={{height:4,background:C.rule,borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:Math.round(100*prog.done/prog.total)+"%",background:C.action}}/></div>
      <div style={{marginTop:4,fontSize:11,color:C.soft}}>{prog.label}</div>
    </div>}
    {linkNote&&<div style={{marginTop:6,fontSize:11.5,color:C.soft,lineHeight:1.45}}>{linkNote}</div>}
    {linkFails.map((f,i)=><div key={i} style={{marginTop:6,fontSize:11.5,color:TH.urgent.ink,lineHeight:1.4,overflowWrap:"anywhere"}}>
      {f.url?failAs(f):""}{f.url?" \u2014 ":""}{f.why}
    </div>)}
  </>;
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
  const[copySaid,setCopySaid]=useState(null);       // "ok" / "no": what the diagnostic's copy icon last managed
  const[recheckSaid,setRecheckSaid]=useState(null);  // {id,text,failed}: Re-check's answer, shown on that card
  const[saveErr,setSaveErr]=useState(false);
  const[debug,setDebug]=useState(null);
  useEffect(()=>setCopySaid(null),[debug]); // a new diagnostic has not been copied
  const[showDebug,setShowDebug]=useState(false);
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
  const[showFresh,setShowFresh]=useState(false);
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
  const[sortBy,setSortBy]=useState("date");
  const[dateReversed,setDateReversed]=useState(false);
  const[venueF,setVenueF]=useState(new Set());
  const[themeF,setThemeF]=useState(new Set());
  const[timeF,setTimeF]=useState(new Set());
  const[acqWanted,setAcqWanted]=useState(false);
  const[acqOwned,setAcqOwned]=useState(false);
  const[acq3mo,setAcq3mo]=useState(false);
  const[acq6mo,setAcq6mo]=useState(false);
  const[acqHasCat,setAcqHasCat]=useState(false);
  const[acqNoCat,setAcqNoCat]=useState(false);
  const[acqDigital,setAcqDigital]=useState(false);
  const[acqBuyNext,setAcqBuyNext]=useState(false);
  const bnOnly=acqBuyNext&&!acqOwned;   // Buy next alone: her dragged order; with Owned it is an ordinary list
  const[drag,setDrag]=useState(null); // the card being dragged in the Buy next view
  const[bnPeriod,setBnPeriod]=useState(false);
  const[bnDate,setBnDate]=useState(false);   // Buy next alone, sorted by date: the same taps as Period
  const dragOn=bnOnly&&!bnPeriod&&!bnDate&&!readOnly;
  const[showAll,setShowAll]=useState(false);
  const[dismissedOnly,setDismissedOnly]=useState(false);
  const[labelledF,setLabelledF]=useState(false);
  const[watchedF,setWatchedF]=useState(false);
  const[showSearch,setShowSearch]=useState(false);
  const[search,setSearch]=useState("");
  const[openCards,setOpenCards]=useState({});
  const[undo,setUndo]=useState(null);
  const undoTimer=useRef(null);
  const fileRef=useRef(null);
  const refreshFileRef=useRef(null);
  const searchRef=useRef(null);
  // Words selected anywhere on the page (her design): a button beside them searches them, exactly as typed.
  const[selPick,setSelPick]=useState(null);
  const[proposals,setProposals]=useState(null); // null = not in refresh review; array = reviewing
  // Listing pages the sweep could not read. NOT proposals — see isMarkerRow().
  const[coverage,setCoverage]=useState([]);
  const[tally,setTally]=useState(null);
  // Which triage bands are open: set by what a band asks of her, never its size —
  // markers and combined-for-you open closed; the count shows either way.
  const[openBands,setOpenBands]=useState({});
  // Which venues are open in normal cases. Undefined = OPEN, so a venue is never hidden
  // by default. "Collapse all" writes false for each venue, so opening one later does
  // not reopen the rest.
  const[openVenues,setOpenVenues]=useState({});
  const[decisions,setDecisions]=useState({}); // proposal index -> "accept"|"reject"|"addnew"
  const[refreshDone,setRefreshDone]=useState(null); // {added,filled,changed} after applying
  const[refreshTouched,setRefreshTouched]=useState([]); // ids added/changed in the last refresh
  const[pinTouched,setPinTouched]=useState(false); // pin those ids to the top this session
  // Buy next by period (her design): Period in the Buy next view switches between her dragged
  // order and the period order with its dividers; she drags only in her own order.
  const periodView=bnOnly?bnPeriod:(sortBy==="period"&&!pinTouched);
  const[showTop,setShowTop]=useState(false); // show the return-to-top button once scrolled down
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
    setSearch(selPick.text); setShowSearch(true); setSelPick(null);
    try{window.getSelection().removeAllRanges();}catch{}
    // Lands at the start of the cards (her ask), once the list has redrawn.
    setTimeout(()=>{const el=document.querySelector("[data-card-list]");window.scrollTo({top:el?el.getBoundingClientRect().top+window.scrollY-8:0});},60);
  };
  useEffect(()=>{const onScroll=()=>setShowTop(window.scrollY>400);window.addEventListener("scroll",onScroll,{passive:true});onScroll();return()=>window.removeEventListener("scroll",onScroll);},[]);

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
    setPinTouched(false); setRefreshTouched([]);
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

  const toggleSet=(setter,val)=>setter(prev=>{const n=new Set(prev);if(n.has(val))n.delete(val);else n.add(val);return n;});
  const clearFilters=()=>{setVenueF(new Set());setThemeF(new Set());setTimeF(new Set());setAcqWanted(false);setAcqOwned(false);setAcq3mo(false);setAcq6mo(false);setAcqHasCat(false);setAcqNoCat(false);setAcqDigital(false);setAcqBuyNext(false);setBnPeriod(false);setBnDate(false);setShowAll(false);setDismissedOnly(false);setWatchedF(false);setLabelledF(false);setSearch("");setShowSearch(false);};

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


  // Every new show gets its period while she reviews the cards: one ask for
  // the import, written onto the card (docs/periods.md). A miss leaves the card without
  // one, for Label to fill later.
  async function labelCards(props){
    const shows=[];
    props.forEach((p,i)=>{ if(p.type==="add")shows.push(periodShow(i,p.cand)); });
    if(!shows.length)return;
    const tape=tapeStart("Label import cards",{title:shows.length+" new shows"});
    const {labels,batches}=await labelPeriods(shows);
    const said=labelSummary(shows.length,batches);
    saveLookupTape(tape,{ok:said.ok,said:said.text,detail:JSON.stringify(batches)});
    const at=new Date().toISOString();
    if(labels.size)setProposals(cur=>cur!==props?cur:props.map((p,i)=>labels.has(i)?{...p,cand:{...p.cand,...labels.get(i),labelledAt:at}}:p));
  }
  // Label: every show (stage 3: the whole ledger, her decision) with no period or no themes yet, dismissed ones
  // included. Fills only; a labelled show is never relabelled. Not an edit of hers: editedAt stays.
  async function labelLedger(){
    if(busy||roStop())return;
    const todo=rows.filter(r=>!labelDone(r));
    if(!todo.length){ setLabelSaid({ok:true,text:"Label: every exhibition already has a period."}); return; }
    setBusy(true); setLabelSaid(null); setProg({done:0,total:todo.length,label:"Labelling periods\u2026"});
    // Each run is one record in the lookup log: every question, Claude's answer, each batch's outcome.
    const tape=tapeStart("Label periods",{title:todo.length+" exhibitions"});
    let said={ok:false,text:"Label: didn\u2019t finish."}, batches=[];
    try{
      const res=await labelPeriods(todo.map((r,i)=>periodShow(i,r)),(done,total)=>setProg({done,total,label:"Labelling periods\u2026"}));
      batches=res.batches;
      const at=new Date().toISOString();
      const byId=new Map(); res.labels.forEach((v,i)=>byId.set(todo[i].id,{...v,labelledAt:at}));
      if(byId.size){ setRows(prev=>prev.map(r=>byId.has(r.id)&&!labelDone(r)?{...r,...byId.get(r.id)}:r)); setDirty(true); setSaveNote(null); }
      said=labelSummary(todo.length,batches);
    }catch(e){ said={ok:false,text:"Label: didn\u2019t finish \u2014 "+String((e&&e.message)||e)+"."}; }
    finally{
      setLabelSaid(said);
      setDebug(said.text+"\n"+batches.map((b,j)=>"Batch "+(j+1)+": "+b.labelled+" of "+b.shows+" labelled, "+b.tries+" "+(b.tries===1?"try":"tries")+(b.why?" \u2014 "+b.why:"")).join("\n"));
      saveLookupTape(tape,{ok:said.ok,said:said.text,detail:JSON.stringify(batches)});
      setBusy(false); setProg({done:0,total:0,label:""});
    }
  }

  // Relabel (her design): one show asked afresh under the current rules, its label
  // replaced; what it says shows in that card's drawer. Not an edit of hers: editedAt stays.
  async function relabel(id){
    const r=rows.find(x=>x.id===id);
    if(!r||busy||relabelId||roStop())return;
    setRelabelId(id); setRecheckSaid(null);
    const tape=tapeStart("Relabel",r);
    let said;
    try{
      const {labels,batches}=await labelPeriods([periodShow(0,r)]);
      const v=labels.get(0)&&{...labels.get(0),periodKeep:false,relabelledAt:new Date().toISOString()};
      if(v){
        const next=landOnCard(cloudLatest.current.rows,id,r,{...r,...v});
        setRows(next); setDirty(true); setSaveNote(null);
        const nr={...r,...v}, shown=periodOf(nr,artistPeriods(next));
        said={id,failed:false,regrouped:shown!==nr.period,text:"Relabelled: "+periodText(nr)+(shown!==nr.period?" \u2014 shown with "+nr.periodArtist+"\u2019s other shows, under "+PERIOD_NAME[shown]:"")+"."};
      }else said={id,failed:true,text:"Relabel didn\u2019t finish \u2014 "+(batches[0]&&batches[0].why||"no answer")+"."};
    }catch(e){ said={id,failed:true,text:"Relabel didn\u2019t finish \u2014 "+String((e&&e.message)||e)+"."}; }
    finally{ setRecheckSaid(said); saveLookupTape(tape,{ok:!said.failed,said:said.text}); setRelabelId(null); }
  }

  // Do not regroup: Claude's answer stands for this show until its next Relabel (her design).
  function keepPeriod(id){
    const r=rows.find(x=>x.id===id); if(!r||roStop())return;
    commit(rows.map(x=>x.id===id?{...x,periodKeep:true,editedAt:new Date().toISOString()}:x));
    setRecheckSaid({id,failed:false,text:"Relabelled: "+periodText(r)+" \u2014 no regrouping."});
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
  // Each answer keeps what the finder found (`beforeAnswer`), so an answer for a venue with no show going in is
  // dropped when the ledger moves (answeredOnly).
  // A shop with no books section seen ("Shop found, but not its books section"): her Confirm takes the shop shown as its section.
  function confirmShop(id,english){ const v=occVenues[id]; if(!v)return; const whole=v.shop==="noshelf"&&v.shopHome?{shop:"found",shopCatalogues:v.shopHome,shelfKind:"front"}:{};
    holdVenues({...occVenues,[id]:{...v,beforeAnswer:v.beforeAnswer||foundShop(v),...whole,confirmed:true,englishPicked:!!english,shopAdded:false}}); }
  // "No shop": the lookup goes straight to the web, as at Capodimonte.
  function noShopFor(id){ const v=occVenues[id]; if(v)holdVenues({...occVenues,[id]:{...v,beforeAnswer:v.beforeAnswer||foundShop(v),shop:"none",confirmed:true,...SHOP_RESET,shopAdded:false}}); }
  // "Add": her own link taken as the section. Its search is worked out at the venue's first lookup (fillShopSearch).
  // Not a link → the box stays open.
  function addShopFor(id,text){
    const v=occVenues[id]; if(!v)return;
    if(!String(text||"").trim()){ setShopAdding(null); return; }
    const href=typedLink(text); if(!href)return;
    setShopAdding(null);
    holdVenues({...occVenues,[id]:{...v,beforeAnswer:v.beforeAnswer||foundShop(v),shop:"found",...SHOP_RESET,shopHome:originOf(href),shopCatalogues:href,searchRule:null,shopAdded:true,foundBy:"her link",confirmed:true}});
  }
  // "Look again": a new search NOW, skipping only the pages she turned down, never the
  // whole site.
  async function lookAgain(id){
    const v=occVenues[id]; if(!v)return;
    const turnedDown=[...(v.turnedDown||[]),v.shopCatalogues].filter(Boolean);
    setShopLooking(id);
    let shop;
    try{ shop=await discoverShop(v.pageShop||"",v.host,venueSearchName(v.id,v),turnedDown,v.id,null,v.english===false,v.gallery===true); }
    catch(e){ shop={shop:"failed",why:"Couldn\u2019t look ("+String((e&&e.message)||e)+")."}; }
    setShopLooking(null);
    setOccVenues(prev=>{
      const{beforeAnswer,...was}=prev[id];
      const next={...prev,[id]:{...was,...SHOP_RESET,shopAdded:false,...shop,confirmed:false,turnedDown}};
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
    setRefreshTouched(out.touched); setPinTouched(out.touched.length>0); // float just-changed entries to the top, this session
    setVenueF(new Set()); setThemeF(new Set()); setTimeF(new Set()); setWatchedF(false); setLabelledF(false);
    setAcqWanted(false); setAcqOwned(false); setAcq3mo(false); setAcq6mo(false); setAcqHasCat(false); setAcqNoCat(false); setAcqDigital(false); setAcqBuyNext(false); setBnPeriod(false); setBnDate(false);
    setDismissedOnly(false); setShowAll(false); setSearch("");
  }
  // Cancel import after a Read puts every link (or page) it read back (pendingAfterCancel), stored.
  function cancelRefresh(){
    const p=pendingAfterCancel(linksAtRead.current,{linkText,pages,pastes});
    if(p){ setPending(p.kind,p.value); writePending(p.kind,p.value); linksAtRead.current=null; }
    dropHeldVenues(); setShopScreen(null); setShopAdding(null); setReadVenues([]); setProposals(null); setDecisions({}); setCoverage([]); setTally(null); setSeenInFile(null); }
  // A second tap on Date reverses it; a third goes back to the usual order.
  const pickSort=k=>{if(bnOnly){if(k==="period"||k==="date"){const cur=bnPeriod?"period":bnDate?"date":"";if(cur!==k){setBnPeriod(k==="period");setBnDate(k==="date");setDateReversed(false);}else if(!dateReversed)setDateReversed(true);else{setBnPeriod(false);setBnDate(false);setDateReversed(false);}}return;}setDateReversed((k==="date"||k==="period")&&sortBy===k&&!pinTouched&&!dateReversed);setSortBy(k);setPinTouched(false);}; // manual sort releases the pinned refresh group




  // The lookup runs at top level (lookupCatalogue); the page hands it its progress
  // line and, for an occasional venue, the check that works out its shop search.
  const lookHooks={label:setLookLabel,prepareShop:fillShopSearch};
  const lookupCat=row=>lookupCatalogue(row,lookHooks);

  // A link venue met before the finder proved searches (finder 2), or before today's search
  // proof (SEARCH_RULE: the RA's search was missed), gets its search worked out once, at its
  // first lookup, from its own shelf — then stored.
  async function fillShopSearch(id){
    const mu=MU[id];
    if(!mu||!mu.occasional||mu.shopSearch||!mu.shopHome)return;
    const v=occVenues[id]||occSaved.current[id];
    if(!v||(v.finder>=3&&v.searchRule>=SEARCH_RULE))return;
    let found;
    const f=mu.shopCatalogues?await fetchPage(mu.shopCatalogues,"The books in this section of the shop, with their prices.",null,{full:true}):{ok:true,results:[]};
    if(f.ok)found=await proveShopSearch(pageTextOf(f.results),mu.shopCatalogues||mu.shopHome);
    if(found===undefined||!f.ok)return;   // a call that died is not an answer
    const add=x=>x?{...x,shopSearch:found,finder:3,searchRule:SEARCH_RULE}:x;
    if(occSaved.current[id]){ const saved={...occSaved.current,[id]:add(occSaved.current[id])}; occSaved.current=saved; writeOccasional(saved); }
    setOccVenues(prev=>{ const next=prev[id]?{...prev,[id]:add(prev[id])}:prev; registerOccasional(next); return next; });
    MU[id]={...MU[id],...occVenue(id,{...v,shopSearch:found,finder:3,searchRule:SEARCH_RULE})};
  }
  // A step that died is not an answer: the card says why, and the reason is not
  // stored — it is a fact about one attempt. C-043 to C-045.
  async function findOneCat(id){
    if(roStop())return;
    setBusy(true);setBusyId(id);setError(null);setRecheckSaid(null);
    const row=rows.find(r=>r.id===id);
    const tape=tapeStart(row.looked?"Search again":"Find catalogue",row);
    const out=await lookupCat(row);
    saveLookupTape(tape,out);
    setDebug(out.detail);
    // SEARCH AGAIN REPLACES THE CARD ONLY WHEN IT FINISHED. Any step that
    // failed → the card stays as it was, and says so.
    if(row.looked&&out.ok&&out.trouble){
      setRecheckSaid({id,failed:true,text:"Search again didn\u2019t finish \u2014 "+out.trouble.split("[")[0].trim()});
    } else if(out.ok){
      await commit(landOnCard(cloudLatest.current.rows,id,row,out.row));
      if(out.trouble&&out.troubleLang)setError("Found the catalogue for \u201c"+row.title+"\u201d, but the language check "
        +"stopped part-way, so the title may be the shop\u2019s translation and an English edition may be missed. "
        +out.trouble.split("[")[0].trim());
      else if(out.trouble)setError("Found the catalogue for \u201c"+row.title+"\u201d, but the search "
        +"stopped part-way, so the ISBN or the publisher\u2019s page may be missing when they "
        +"exist. "+out.trouble.split("[")[0].trim()+" Press \u201cSearch again\u201d.");
    } else {
      // On the card, not in a banner (her decision): Re-check's line word for word,
      // "Re-check" swapped for "Search" or "Search again".
      const why=String(out.detail||"").split("\n").pop().split("[")[0].trim();
      setRecheckSaid({id,failed:true,text:(row.looked?"Search again":"Search")+" didn\u2019t run \u2014 "+why});
    }
    setBusy(false);setBusyId(null);setLookLabel(null);
  }

  // "Re-check museum shop" (her design; see "A BOOK LEAVING THE SHOP" above): its answer
  // is printed on the card, under the button she pressed.
  async function recheckShop(id){
    if(roStop())return;
    setBusy(true);setBusyId(id);setRechecking(true);setError(null);setRecheckSaid(null);
    const found=rows.find(r=>r.id===id);
    const tape=tapeStart("Re-check museum shop",found);
    const out=await recheckShopRow(found,lookHooks);
    saveLookupTape(tape,out);
    setDebug(out.detail||null);
    if(out.ok&&out.row&&out.row!==found)await commit(landOnCard(cloudLatest.current.rows,id,found,out.row));
    setRecheckSaid({id,text:out.said,failed:!out.ok});
    setBusy(false);setBusyId(null);setRechecking(false);setLookLabel(null);
  }

  const dismiss=id=>{commit(rows.map(r=>r.id===id?{...r,interested:false}:r));if(undoTimer.current)clearTimeout(undoTimer.current);setUndo({id});undoTimer.current=setTimeout(()=>setUndo(null),10000);};
  const undoDismiss=()=>{if(!undo)return;commit(rows.map(r=>r.id===undo.id?{...r,interested:true}:r));setUndo(null);if(undoTimer.current)clearTimeout(undoTimer.current);};
  const restore=id=>commit(rows.map(r=>r.id===id?{...r,interested:true}:r));
  const toggleWatch=id=>commit(rows.map(r=>r.id===id?{...r,watching:!r.watching}:r));
  // Leaving Yes clears the buy-next dot and its place in her order: it marks a wanted book only.
  const setAcq=(id,v)=>commit(rows.map(r=>{if(r.id!==id)return r;const a=r.acquiring===v?null:v,bn=a==="yes"&&!!r.buyNext;return{...r,acquiring:a,buyNext:bn,buyRank:bn?(r.buyRank??null):null};}));
  // A newly marked card goes to the top of her Buy next order (highest buyRank first).
  const toggleBuyNext=id=>{const top=rows.reduce((m,r)=>r.buyNext&&Number.isFinite(r.buyRank)?Math.max(m,r.buyRank):m,0);
    commit(rows.map(r=>r.id===id?{...r,buyNext:!r.buyNext,buyRank:r.buyNext?null:top+1}:r));};
  // A drop in the Buy next view: the card lands before the shown card it was dropped above
  // (else after the one below it), across every Buy next card, hidden ones included, then
  // all are renumbered. Not an edit: editedAt is untouched (her decision).
  const moveBuyNext=(id,beforeId,afterId)=>{
    const shown=new Map(view.map((r,i)=>[r.id,i])),key=r=>Number.isFinite(r.buyRank)?r.buyRank:-Infinity;
    const all=rows.filter(isBuyNext).sort((a,b)=>key(b)-key(a)||(shown.get(a.id)??1e9)-(shown.get(b.id)??1e9)).map(r=>r.id);
    const order=all.filter(x=>x!==id);let at=beforeId?order.indexOf(beforeId):afterId?order.indexOf(afterId)+1:-1;if(at<0)at=order.length;
    order.splice(at,0,id);const rank=new Map(order.map((x,i)=>[x,order.length-i]));
    commit(rows.map(r=>rank.has(r.id)?{...r,buyRank:rank.get(r.id)}:r));};
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
  // Her pick on a card with several versions (pickRow): the card's book follows it.
  const setPick=(id,i)=>{ const r=rows.find(x=>x.id===id); const next=r&&pickRow(r,i,new Date().toISOString()); if(next&&next!==r)commit(rows.map(x=>x.id===id?next:x)); };
  // A card's buttons, by name. One function for the life of the page (so LedgerCard can skip
  // redrawing) that calls this render's handler, which sees the current ledger.
  const cardActs=useRef(null);
  // Her digital catalogue link: an empty box leaves the card as it was; not a link → the box stays open.
  const setDigital=(id,text)=>{ if(!String(text||"").trim()){ setDigitalBox(null); return; }
    const href=typedLink(text); if(!href)return; setDigitalBox(null);
    const r=rows.find(x=>x.id===id); if(r&&r.digitalUrl!==href)commit(rows.map(x=>x.id===id?{...x,digitalUrl:href,editedAt:new Date().toISOString()}:x)); };
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
  const view=useMemo(()=>{
    const sq=foldText(search).trim();
    // Each row's tier, worked out once: the sort below asks for it thousands of times.
    const tiers=new Map();
    const tierOf=r=>{let t=tiers.get(r);if(t===undefined){t=tierFor(r);tiers.set(r,t);}return t;};
    const newestRun=labelledF?rows.reduce((m,r)=>r.labelledAt&&r.labelledAt>m?r.labelledAt:m,""):"";
    let out=rows.filter(r=>{
      // The search narrows; it does not end the check, so every other filter applies. It reads what the
      // card prints: title, description, the venue's card name (her decision). Accents count as plain
      // letters both ways ("Bocklin" finds Böcklin; her ask).
      if(sq&&![r.title,r.summary,MU[r.museumId]?.card].some(t=>foldText(t).includes(sq)))return false;
      // Dismissed narrows too. A search still finds a dismissed show unless Dismissed
      // is on.
      if(dismissedOnly){ if(r.interested)return false; }
      else if(!r.interested&&!showAll&&!sq)return false;
      if(themeF.size>0&&!themeMatch(r,themeF))return false;
      if(venueF.size>0&&!venueF.has(chipKey(r.museumId))&&!(hasNoChip(r.museumId)&&venueF.has("occ:"+occRegion(r.museumId))))return false;
      const t=tierOf(r),ts=TIERS[t]?.time||"current";
      if(timeF.size>0){let match=timeF.has(ts);if(timeF.has("recent")&&t==="recent")match=true;if(timeF.has("current")&&t==="recent")match=true;if(!match)return false;}
      if(watchedF&&!r.watching)return false;
      // Recently labelled: the shows of the newest Label run or import; a Relabel keeps its show in its run.
      if(labelledF&&(!newestRun||r.labelledAt!==newestRun))return false;
      // Period shows only labelled shows.
      if(periodView&&!periodLabelled(r))return false;
      // Acquiring filters stack as AND across the axes, OR within an axis. Owned beside Wanted or Buy next shows
      // both lists, as two venues do (her decision); Buy next is the part of Wanted she has put in her order.
      if(acqWanted||acqOwned||acqBuyNext){if(!((acqOwned&&r.acquiring==="acquired")||(acqWanted&&r.acquiring==="yes"&&(!acqBuyNext||isBuyNext(r)))||(acqBuyNext&&!acqWanted&&isBuyNext(r))))return false;}
      if(acq3mo||acq6mo){if(!((acq3mo&&t==="closing")||(acq6mo&&(t==="urgent"||t==="lapsed"))))return false;}
      // Has, No and Digital catalogue widen one another: a card shows when it matches any one chosen.
      if(acqHasCat||acqNoCat||acqDigital){if(!((acqHasCat&&r.looked&&r.hasCatalogue==="yes")||(acqNoCat&&r.looked&&r.hasCatalogue==="no")||(acqDigital&&r.digitalUrl)))return false;}
      return true;
    });
    out.sort((a,b)=>{
      // Buy next is in her own dragged order; the sort chips and the pinned group step aside.
      // Buy next alone is in her own dragged order; with Owned the list sorts like any other.
      if(bnOnly&&bnPeriod)return(dateReversed?-1:1)*periodCompare(a,b,byArtist);
      const sb=bnOnly&&bnDate?"date":sortBy;   // Buy next by date sorts like the Date chip
      if(bnOnly&&!bnDate){const ka=Number.isFinite(a.buyRank)?a.buyRank:-Infinity,kb=Number.isFinite(b.buyRank)?b.buyRank:-Infinity;if(ka!==kb)return kb>ka?1:-1;}
      if(pinTouched&&!bnOnly){const aT=refreshTouched.includes(a.id)?0:1,bT=refreshTouched.includes(b.id)?0:1;if(aT!==bT)return aT-bT;}
      if(sb==="added"){const d=String(b.addedAt||"").localeCompare(String(a.addedAt||""));if(d!==0)return d;}
      if(sb==="labelled"){const d=String(lastLabel(b)).localeCompare(String(lastLabel(a)));if(d!==0)return d;const aL=periodLabelled(a)?1:0,bL=periodLabelled(b)?1:0;if(aL!==bL)return bL-aL;}
      if(sb==="edited"){const d=String(b.editedAt||"").localeCompare(String(a.editedAt||""));if(d!==0)return d;if(!a.editedAt&&!b.editedAt){const aH=a.addedAt?1:0,bH=b.addedAt?1:0;if(aH!==bH)return bH-aH;}}
      if(sb==="venue"){const d=venueRank(a.museumId)-venueRank(b.museumId);if(d!==0)return d;}
      // A second tap on Date or Period turns this whole order upside down, Wanted view included.
      const flip=(sb==="date"||sb==="period")&&dateReversed?-1:1;
      if(sb==="period")return flip*periodCompare(a,b,byArtist);
      const ta=tierOf(a),tb=tierOf(b);
      if(acqWanted&&(ta==="upcoming")!==(tb==="upcoming"))return flip*(ta==="upcoming"?1:-1); // Wanted view: Announced drops to the bottom (nothing to buy yet)
      const oa=TIERS[ta]?.ord??9,ob=TIERS[tb]?.ord??9;
      if(oa!==ob)return flip*(oa-ob);
      const da=a.startDate||a.endDate||"",db=b.startDate||b.endDate||"";
      if(ta==="upcoming")return flip*da.localeCompare(db);
      return flip*db.localeCompare(da);
    });
    return out;
  },[rows,byArtist,sortBy,venueF,themeF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqHasCat,acqNoCat,acqDigital,acqBuyNext,bnPeriod,bnDate,periodView,showAll,dismissedOnly,watchedF,labelledF,search,pinTouched,refreshTouched,dateReversed]);

  // DRAWN AS SHE SCROLLS: the first DRAW_STEP cards, then DRAW_STEP more each time the end
  // of the drawn list nears the screen. A new filter, sort or search starts again from the
  // top (viewToken). Jump to bottom draws the rest first. No IntersectionObserver → all.
  const viewToken=useMemo(()=>({}),[sortBy,venueF,themeF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqHasCat,acqNoCat,acqDigital,acqBuyNext,bnPeriod,bnDate,showAll,dismissedOnly,watchedF,labelledF,search,pinTouched,dateReversed]);
  const[drawn,setDrawn]=useState({token:null,n:DRAW_STEP});
  const drawLimit=typeof IntersectionObserver==="undefined"?Infinity:drawn.token===viewToken?drawn.n:DRAW_STEP;
  const moreRef=useRef(null);
  const wantBottom=useRef(false);
  useEffect(()=>{
    const el=moreRef.current;
    if(!el)return;
    const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting))setDrawn({token:viewToken,n:drawLimit+DRAW_STEP}); },{rootMargin:"1500px 0px"});
    io.observe(el);
    return()=>io.disconnect();
  },[viewToken,drawLimit,view.length]);
  useEffect(()=>{ if(wantBottom.current){ wantBottom.current=false; window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"}); } });
  // The scrubber's periods: the view's groups in order, each with its first card's place.
  const scrubGroups=useMemo(()=>{
    if(!periodView)return [];
    const out=[];
    view.forEach((r,i)=>{const k=periodOf(r,byArtist); if(!out.length||out[out.length-1].key!==k)out.push({key:k,name:PERIOD_NAME[k],at:i});});
    return out;
  },[view,periodView,byArtist]);
  const wantPeriod=useRef(null);
  const scrollToPeriod=k=>{
    const el=document.querySelector("[data-period=\""+k+"\"]");
    if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-8,behavior:"auto"});
  };
  useEffect(()=>{ if(wantPeriod.current){ const k=wantPeriod.current; wantPeriod.current=null; scrollToPeriod(k); } });
  const jumpToPeriod=useCallback(k=>{
    const x=scrubGroups.find(g=>g.key===k); if(!x)return;
    if(x.at>=drawLimit){ wantPeriod.current=k; setDrawn({token:viewToken,n:x.at+DRAW_STEP}); }
    else scrollToPeriod(k);
  },[scrubGroups,drawLimit,viewToken]);
  const jumpToBottom=()=>{
    if(view.length>drawLimit){ wantBottom.current=true; setDrawn({token:viewToken,n:Infinity}); }
    else window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"});
  };

  const counts=useMemo(()=>{const c={total:rows.length,dismissed:0,watched:0,wanted:0,owned:0,pressing:0};for(const r of rows){if(!r.interested){c.dismissed++;continue;}if(r.watching)c.watched++;if(r.acquiring==="yes")c.wanted++;if(r.acquiring==="acquired")c.owned++;if(inClosingWindow(r))c.pressing++;}return c;},[rows]);

  const C=PALETTES[theme];
  // TH, chip, pBtn and lnk keep their identity between renders, so LedgerCard can skip redrawing.
  const TH=useMemo(()=>tiersFor(theme),[theme]);          // the tier colours for THIS theme
  const chip=useCallback(on=>({padding:"4px 10px",borderRadius:999,border:"1px solid "+(on?C.ink:C.rule),background:on?C.ink:"transparent",color:on?C.onAction:C.soft,fontSize:11,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"}),[C]);
  const sBtn={padding:"5px 12px",borderRadius:4,border:"1px solid "+C.rule,background:"transparent",color:C.soft,fontSize:11,fontWeight:500,cursor:"pointer"};
  const pBtn=useMemo(()=>({...sBtn,background:C.action,color:C.onAction,border:"none",opacity:busy?0.5:1,cursor:busy?"wait":"pointer"}),[C,busy]);
  const lnk=useMemo(()=>linkButton(C),[C]);

  // ---- Approval-stage render helpers ----
  const decBtn=(active,color)=>({padding:"3px 9px",borderRadius:4,border:"1px solid "+(active?color:C.rule),background:active?color:"transparent",color:active?C.onAction:C.soft,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"});
  const isUndecided=(p,i)=>isUndecidedCard(p,decisions[i]);

  const renderProposalCard=(p,i)=>{
    const dec=decisions[i]||{};
    const infoRow=(label,val)=><div style={{marginBottom:2,overflowWrap:"anywhere"}}><b style={{color:C.ink}}>{label}:</b> {val&&String(val).trim()?val:<span style={{color:C.muted}}>{"\u2014"}</span>}</div>;
    return(
      <div key={i} id={"prop-"+i} style={{border:"1px solid "+C.rule,borderRadius:6,background:C.card,padding:"10px 12px",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:600,color:C.ink,marginBottom:4}}>{p.title}</div>


        {p.type==="add"&&<div style={{fontSize:11.5,color:C.ink,lineHeight:1.5}}>
          <div style={{fontWeight:700,marginBottom:3}}>{"New show \u2014 not in your ledger yet."}</div>
          {infoRow("Dates",dateRange(p.cand))}
          {infoRow("Description",p.cand.summary)}
          {infoRow("Link",p.cand.exUrl&&<a href={p.cand.exUrl} target="_blank" rel="noopener noreferrer" style={{color:C.ink}}>{p.cand.exUrl}</a>)}
          {infoRow("Period",periodText(p.cand))}
        </div>}

        {(p.type==="fill"||p.type==="change")&&<div style={{fontSize:11.5,color:C.ink}}>
          <div style={{fontWeight:700,marginBottom:5}}>{"Existing entry \u2014 decide each change:"}</div>
          {dec.mode==="addnew"
            ? <div style={{fontStyle:"italic",color:C.action}}>Will be added as a separate new entry instead of changing the existing one.</div>
            : p.upd.map((u,j)=>{const fd=(dec.fields||{})[j];return(
                <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
                  <div style={{flex:1,minWidth:0,lineHeight:1.4,overflowWrap:"anywhere"}}><b style={{color:C.ink}}>{u.label}:</b> <span style={{color:C.soft}}>{u.kind==="fill"?("add \u201c"+u.newVal+"\u201d"):("\u201c"+u.oldVal+"\u201d \u2192 \u201c"+u.newVal+"\u201d")}</span></div>
                  <button onClick={()=>setFieldDec(i,j,"accept")} style={decBtn(fd==="accept",C.okEdge)}>{fd==="accept"?"\u2713 ":""}Accept edit</button>
                  <button onClick={()=>setFieldDec(i,j,"reject")} style={decBtn(fd==="reject",C.rejectInk)}>Reject</button>
                </div>
              );})}
        </div>}

        {/* The file disagreed with itself: both values shown, the fuller one ticked as
            a starting point, one tap switches (her decision). */}
        {p.choices&&p.choices.length>0&&<div style={{marginTop:7,paddingTop:6,borderTop:"1px dotted "+C.rule}}>
          <div style={{fontSize:10.5,color:C.soft,lineHeight:1.5,marginBottom:5}}>The sweep file gave two different answers here. The longer one is picked for you {"\u2014"} change it if it{"\u2019"}s wrong.</div>
          {p.choices.map((ch,j)=>(
            <div key={j} style={{marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:C.ink,marginBottom:3}}>{ch.label}</div>
              {ch.options.map((opt,k)=>{
                const picked=(dec.choices||{})[ch.field];
                const chosen=(picked===undefined?ch.picked:picked)===opt;
                return(
                  <button key={k} onClick={()=>setChoice(i,ch.field,opt)}
                    style={{...decBtn(chosen,C.okEdge),display:"block",width:"100%",textAlign:"left",marginBottom:3,whiteSpace:"normal",lineHeight:1.4}}>
                    {chosen?"\u2713 ":"\u00a0\u00a0"}{opt&&String(opt).trim()?opt:"(blank)"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>}

        {p.notes&&p.notes.length>0&&<div style={{marginTop:6,fontSize:10.5,color:C.soft,lineHeight:1.5,borderTop:"1px dotted "+C.rule,paddingTop:5}}>{p.notes.map((n,j)=><div key={j}>{"\u00b7 "}{n}</div>)}</div>}

        {/* Three outcomes: Reject remembers nothing (the row returns next sweep). Never
            add is for rows that should not be entries at all (a talk, an unfoldable
            duplicate, a dead link) — not for a show she is not interested in, which is
            accepted and then dismissed. */}
        {p.type==="add"&&<div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setCardMode(i,"accept")} style={decBtn(dec.mode==="accept",C.okEdge)}>{dec.mode==="accept"?"\u2713 ":""}Add new entry</button>
          <button onClick={()=>setCardMode(i,"reject")} style={decBtn(dec.mode==="reject",C.rejectInk)}>{dec.mode==="reject"?"\u2713 ":""}Reject</button>
          <button onClick={()=>setCardMode(i,"never")} style={decBtn(dec.mode==="never",C.neverInk)}>{dec.mode==="never"?"\u2713 ":""}{"Never add this"}</button>
        </div>}
        {p.type==="add"&&dec.mode==="never"&&<div style={{marginTop:5,fontSize:10.5,color:C.soft,lineHeight:1.45}}>
          {"Won\u2019t be offered again on future sweeps."}
        </div>}

        {p.type==="change"&&<div style={{marginTop:8}}>
          <button onClick={()=>setCardMode(i,"addnew")} style={decBtn(dec.mode==="addnew","#4A5A6B")}>{dec.mode==="addnew"?"\u2713 ":""}{"No \u2014 this is a different show, add as separate entry"}</button>
        </div>}

      </div>
    );
  };
  const{acceptedCount,undecidedCount,quarantinedCount,rejectedCount}=countDecisions(proposals,decisions);

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

  if(!loaded)return(<div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.soft,minHeight:"100vh",display:"grid",placeItems:"center",fontSize:13}}>Opening the ledger{"\u2026"}</div>);

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.ink,minHeight:"100vh",padding:"20px 16px 60px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      <header style={{maxWidth:760,margin:"0 auto 14px"}}>
        <div style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:C.soft,marginBottom:4}}>Art Watch</div>
        <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:36,lineHeight:1,fontWeight:500,margin:0,letterSpacing:"-0.02em"}}>Before it goes<span style={{color:C.accent}}> out of print</span></h1>
        <div style={{marginTop:14,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          {/* Load and Import (her decision): Load opens a ledger file; Import brings in a
              sweep CSV as cards. */}
          <button onClick={requestImport} style={sBtn}>Load</button>
          <button onClick={()=>setShowSave(v=>!v)} disabled={!hasLedger} style={{...pBtn,opacity:hasLedger?1:0.4,cursor:hasLedger?"pointer":"not-allowed"}}>Save</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{display:"none"}}/>
          {/* Small and out of the way: it is a comfort control, not part of the
              work. Says what it will DO, not what is currently on. */}
          <button onClick={toggleTheme} title={theme==="dark"?"Switch to light":"Switch to dark"}
            style={{...sBtn,marginLeft:"auto",padding:"5px 9px"}}>{theme==="dark"?"\u2600 Light":"\u263D Dark"}</button>
          <button onClick={()=>{setLinkNote(null);setImportMode(hasLedger?"choose":"needLedger");}} style={sBtn}>Import</button>
          <input ref={refreshFileRef} type="file" accept=".csv,text/csv" onChange={handleRefreshFile} style={{display:"none"}}/>
        </div>
        {/* The Save panel (her design): the description names the offline file and its
            cloud twin; the tick starts on. */}
        {showSave&&hasLedger&&<div style={{marginTop:8,padding:"10px 12px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input value={saveLabel} onChange={e=>setSaveLabel(e.target.value)} maxLength={80} placeholder={"Description (optional) \u2014 e.g. after 30 lookups"}
              onKeyDown={e=>{if(e.key==="Enter")handleSave();}}
              style={{flex:"1 1 220px",minWidth:0,padding:"5px 8px",fontSize:12.5,border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontFamily:"inherit"}}/>
            <button onClick={handleSave} disabled={saveBusy} style={{...pBtn,opacity:saveBusy?0.4:1,cursor:saveBusy?"not-allowed":"pointer"}}>{saveBusy?"Saving\u2026":"Save now"}</button>
            <button onClick={()=>setShowSave(false)} style={sBtn}>Cancel</button>
          </div>
          <label style={{display:"flex",gap:6,alignItems:"center",marginTop:8,fontSize:12.5,color:C.ink,cursor:"pointer"}}>
            <input type="checkbox" checked={saveCloud} onChange={e=>setSaveCloud(e.target.checked)}/>
            {"Also save a copy to cloud"}
          </label>
          <div style={{marginTop:6,fontSize:11,color:C.soft,wordBreak:"break-all"}}>{"File name: "+LEDGER_PREFIX+localStamp()+(labelSlug(saveLabel)?"-"+labelSlug(saveLabel):"")+".json"}</div>
        </div>}
        {/* The status lines, in her order (docs/app.md §9): the cloud line first, always —
            green, or the red banner when saving has stopped; a line's space; what loading
            did; what saving did. */}
        {cloudStatus.trouble?
          <div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
            <span style={{fontSize:17,lineHeight:1.1}}>{"☁"}</span>
            <span>{cloudStatus.text}</span>
          </div>
        :<div style={{marginTop:6,fontSize:11,color:C.okEdge,fontWeight:600,display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
          <span>{"☁ "}{cloudStatus.text}</span>
          {!hasLedger&&cloudLive&&cloudLive.rec&&<button onClick={requestOpenCloud} style={{background:"none",border:"none",color:C.action,fontSize:11,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0}}>Open it</button>}
        </div>}
        <div style={{marginTop:16}}>
          {savedText&&<div style={{fontSize:11,color:C.ink,lineHeight:1.45}}>{savedText}</div>}
          {/* Stays until she dismisses it or the next Load replaces it (her decision): a
              line that fades can vanish unread. */}
          {cloudCheck&&<div style={{marginTop:2,fontSize:11,color:C.ink,lineHeight:1.45,display:"flex",gap:8,alignItems:"baseline"}}>
            <span style={{flex:1}}>{cloudCheck}</span>
            <button onClick={()=>setCloudCheck(null)} title="Dismiss" aria-label="Dismiss" style={{background:"none",border:"none",color:C.soft,fontSize:14,lineHeight:1,cursor:"pointer",padding:0}}>{"\u00d7"}</button>
          </div>}
          {hasLedger&&saveNote&&<div style={{marginTop:6,fontSize:11,lineHeight:1.45}}>
            <span style={{color:saveNote.ok?C.okEdge:C.warnInk,fontWeight:saveNote.ok?600:700}}>{saveNote.text}</span>
            {saveNote.file&&<span style={{color:C.ink,fontWeight:400}}>{" ("+saveNote.file+")"}</span>}
          </div>}
        </div>
        {hasLedger&&refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:C.okBg,border:"2px solid #2D6B5A",borderRadius:5,fontSize:12.5,fontWeight:700,color:C.okInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          {/* The icon sits on the first line of text (her ask): centred, it drifted when
              the banner wrapped. */}
          <span style={{fontSize:17,lineHeight:"17.5px"}}>{"\u21BB"}</span>
          {/* Two paragraphs, worded by importComplete: the instruction, then the counts
              (the way back is on the partial-import confirm box). */}
          <span>
            <span style={{display:"block",marginBottom:"1.45em"}}>{importComplete(refreshDone).head}</span>
            <span style={{display:"block"}}>{importComplete(refreshDone).counts}</span>
          </span>
        </div>}
        {hasLedger&&unconfirmedSave&&<div style={{marginTop:8,padding:"9px 12px",background:C.holdBg,border:"2px solid "+C.soft,borderRadius:5,fontSize:12.5,color:C.ink,lineHeight:1.45,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:16,lineHeight:1.1}}>{"\u2193"}</span>
          <span>{"A download of "+unconfirmedSave+" was started. This viewer can\u2019t tell us whether it arrived, so your ledger is still marked unsaved \u2014 check your downloads folder. If the file is there, you\u2019re safe."}</span>
        </div>}
        {showUnsavedBanner&&!refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid #B5791A",borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:17,lineHeight:1}}>{"\u26A0"}</span>
          <span>{"UNSAVED CHANGES \u2014 what's on screen is not saved to a file. Tap \u201cSave\u201d before you close this tab or your work is lost."}</span>
        </div>}
        {/* A quarantine that isn't saving is a banner, not a footnote (her decision),
            shown with or without a ledger open. */}
        {/* A part of the store that could not be read (the quarantine has its own banner). */}
        {storeUnread.filter(w=>w!==UNREAD_QUAR).length>0&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:17,lineHeight:1.1}}>{"\u26A0"}</span>
          <span>{"STORE NOT READ \u2014 "+storeUnread.filter(w=>w!==UNREAD_QUAR).join(", ")+" couldn\u2019t be read from store, refresh to re-check. Current incorrect information will not overwrite the store until the read corrects."}</span>
        </div>}
        {quarWhy&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:17,lineHeight:1.1}}>{"\u26A0"}</span>
          <span>{"QUARANTINE \u2014 "+quarWhy}</span>
        </div>}
        {busy&&prog.total>0&&!importMode&&<div style={{marginTop:8}}><div style={{height:3,background:C.rule,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(prog.done/prog.total*100)+"%",background:C.action,transition:"width .3s ease"}}/></div><div style={{fontSize:10,color:C.soft,marginTop:3}}>{prog.done}/{prog.total} · {prog.label}</div></div>}
        {labelSaid&&<div style={labelSaid.ok?{marginTop:8,fontSize:11.5,color:C.soft}:{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink}}>{labelSaid.text}</div>}
        {readOnly&&<div style={{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink,fontWeight:700}}>{RO_LINE}</div>}
        {error&&error!==RO_LINE&&<div style={{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink}}>{error}</div>}
        {debug&&<div style={{marginTop:4}}><button onClick={()=>setShowDebug(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{showDebug?"Hide diagnostic":"Show diagnostic"}</button>
          {/* Copy: an icon alone, bottom right of the tray (her ask). A tick only if the
              copy happened — a frame can refuse the clipboard — else a cross; back to
              the icon after two seconds. */}
          {showDebug&&<div style={{position:"relative",marginTop:4}}>
            <pre style={{margin:0,padding:"7px 28px 7px 7px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4,fontSize:9.5,whiteSpace:"pre-wrap",wordBreak:"break-word",color:C.soft,maxHeight:160,overflow:"auto"}}>{debug}</pre>
            <button aria-label={copySaid==="ok"?"Copied":copySaid==="no"?"Couldn\u2019t copy":"Copy"} title={copySaid==="ok"?"Copied":copySaid==="no"?"Couldn\u2019t copy":"Copy"}
              onClick={async()=>{const r=await copyText(debug)?"ok":"no";setCopySaid(r);setTimeout(()=>setCopySaid(v=>v===r?null:v),2000);}}
              style={{position:"absolute",right:5,bottom:5,background:"none",border:"none",color:C.soft,fontSize:13,lineHeight:1,cursor:"pointer",padding:2}}>{copySaid==="ok"?"\u2713":copySaid==="no"?"\u2717":"\u29c9"}</button>
          </div>}</div>}
        {/* Not gated on a ledger: when a sweep last ran is what the page knows. */}
        <div style={{marginTop:6,fontSize:10.5,color:C.soft,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          {/* "Unknown", never "never" (her decision): an empty store is not evidence
              that no sweep ran. */}
          <span>Last sweep: {lastSweep?fmtRefresh(lastSweep):"Unknown"}</span>
          {/* Per-venue freshness: collapsed by default, ALWAYS shown — a control that
              disappears when the log is empty cannot report anything. */}
          <button onClick={()=>setShowFresh(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{showFresh?"Hide details":"Details"}</button>
        </div>

        {/* Not gated on a ledger: the sweep log survives Reset. */}
        {showFresh&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* Tracked and Dismissed live here, at the top of Details (her decision). */}
          <div style={{display:"flex",gap:14,fontSize:10.5,color:C.soft,flexWrap:"wrap",marginBottom:8}}>
            <span><b style={{color:C.ink}}>{counts.total}</b> Tracked</span>
            {counts.dismissed>0&&<span><b>{counts.dismissed}</b> Dismissed</span>}
          </div>
          <div style={{fontSize:10,color:C.soft,marginBottom:6,lineHeight:1.5}}>
            {"When each venue was last swept, and when it last gave us exhibitions."}
          </div>
          {/* "NO SWEEPS YET" AND "COULDN'T READ THE STORE" LOOK IDENTICAL AND
              MEAN OPPOSITE THINGS, so an empty panel always says which. */}
          {freshWhy&&<div style={{fontSize:11,color:C.accent,marginBottom:6,lineHeight:1.5}}>{freshWhy}</div>}
          {/* An empty store says nothing about whether a sweep ran (her decision), so no
              "No sweep imported yet". Unlike freshWhy, here the store did answer. */}
          {!freshWhy&&Object.keys(venueSeen).length===0&&
            <div style={{fontSize:11,color:C.soft,marginBottom:6}}>{"The store holds no sweep dates, so when each venue was last swept is unknown."}</div>}
          {MUSEUMS.map(m=>{
            const v=venueSeen[m.id]; if(!v)return null;
            const stale=v.returned&&v.attempted&&v.returned!==v.attempted;
            return(
              <div key={m.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)",gap:8,fontSize:10.5,color:C.soft,padding:"3px 0",alignItems:"baseline"}}>
                <span style={{color:C.ink}}>{m.card}</span>
                <span>{momentLines("swept ",v.attempted)}</span>
                <span style={{color:v.returned?(stale?TH.urgent.ink:C.soft):TH.urgent.ink,fontWeight:stale||!v.returned?600:400}}>
                  {v.returned?momentLines("rows ",v.returned):"no rows \u2014 refused"}
                </span>
              </div>
            );
          })}
          {MUSEUMS.filter(m=>!venueSeen[m.id]).length>0&&
            <div style={{fontSize:10.5,color:C.soft,marginTop:6,paddingTop:5,borderTop:"1px solid "+C.rule}}>
              {"Not in any sweep yet: "+MUSEUMS.filter(m=>!venueSeen[m.id]).map(m=>m.card).join(", ")+"."}
            </div>}
        </div>}

        <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid "+C.rule,display:"flex",gap:14,fontSize:10.5,color:C.soft,flexWrap:"wrap",alignItems:"center"}}>
          <span><b style={{color:C.ink}}>{counts.watched}</b> Watched</span>
          <span><b style={{color:C.ink}}>{counts.wanted}</b> Wanted</span>
          <span><b style={{color:C.owned}}>{counts.owned}</b> Owned</span>
          <span><b style={{color:TH.urgent.ink}}>{counts.pressing}</b> Closing Window</span>
          <button onClick={()=>{if(showSearch)setSearch("");setShowSearch(v=>!v);setTimeout(()=>searchRef.current?.focus(),100);}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.soft,padding:0,lineHeight:1}} title="Search">{"\uD83D\uDD0D"}</button>
        </div>
        {/* The cross clears what she typed (her ask): right-aligned, shown while there is text. */}
        {showSearch&&<div style={{marginTop:6,position:"relative"}}><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",padding:"7px 30px 7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/>
          {search&&<button onClick={()=>{setSearch("");if(searchRef.current)searchRef.current.focus();}} aria-label="Clear search" title="Clear"
            style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.soft,fontSize:16,lineHeight:1,cursor:"pointer",padding:"2px 4px"}}>{"\u00d7"}</button>}</div>}
      </header>

      <div style={{maxWidth:760,margin:"0 auto 12px",display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Sort</span>
          {[["date","Date"],["venue","Venue"],["period","Period"],["added","Recently added"],["edited","Recently edited"],["labelled","Recently labelled"]].map(([k,l])=><button key={k} onClick={()=>pickSort(k)} style={chip(bnOnly?((k==="period"&&bnPeriod)||(k==="date"&&bnDate)):(sortBy===k&&!pinTouched))}>{l}{(bnOnly?(k==="period"&&bnPeriod)||(k==="date"&&bnDate):(k==="date"||k==="period")&&sortBy===k&&!pinTouched)?(dateReversed?" \u2191":" \u2193"):""}</button>)}
          {pinTouched&&<span style={{fontSize:10.5,color:C.action,fontWeight:600}}>{"\u2191 just-refreshed entries shown first"}</span>}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>When</span>
          {[["current","Current"],["past","Past"],["upcoming","Announced"],["recent","Recently opened"]].map(([k,l])=><button key={k} onClick={()=>toggleSet(setTimeF,k)} style={chip(timeF.has(k))}>{l}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Venue</span>
          {chipVenues().map(id=><button key={chipKey(id)} onClick={()=>toggleSet(setVenueF,chipKey(id))} style={chip(venueF.has(chipKey(id)))}>{REG[id].names.chip}</button>)}
          {OCC_CHIPS.map(([k,l])=><button key={k} onClick={()=>toggleSet(setVenueF,k)} style={chip(venueF.has(k))}>{l}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Theme</span>
          {THEME_CHIPS.map(([k,l])=><button key={k} onClick={()=>toggleSet(setThemeF,k)} style={chip(themeF.has(k))}>{l}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Acquiring?</span>
          <button onClick={()=>setAcqWanted(v=>!v)} style={chip(acqWanted)}>Wanted</button>
          <button onClick={()=>{setAcqOwned(v=>!v);if(acqBuyNext){setBnPeriod(false);setBnDate(false);setDateReversed(false);}}} style={chip(acqOwned)}>Owned</button>
          <button onClick={()=>{setAcqBuyNext(v=>!v);setBnPeriod(false);setBnDate(false);}} style={chip(acqBuyNext)}>Buy next</button>
          <button onClick={()=>setAcq3mo(v=>!v)} style={chip(acq3mo)}>3+ mos</button>
          <button onClick={()=>setAcq6mo(v=>!v)} style={chip(acq6mo)}>6+ mos closing window</button>
          <button onClick={()=>setAcqHasCat(v=>!v)} style={chip(acqHasCat)}>Has catalogue</button>
          <button onClick={()=>setAcqNoCat(v=>!v)} style={chip(acqNoCat)}>No catalogue</button>
          <button onClick={()=>setAcqDigital(v=>!v)} style={chip(acqDigital)}>Digital catalogue</button>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Showing</span>
          <button onClick={()=>setWatchedF(v=>!v)} style={chip(watchedF)}>Watched</button>
          <button onClick={()=>{setDismissedOnly(v=>!v);setShowAll(false);}} style={chip(dismissedOnly)}>Dismissed</button>
          <button onClick={()=>setLabelledF(v=>!v)} style={chip(labelledF)}>Recently labelled</button>
          <button onClick={()=>{setShowAll(v=>!v);setDismissedOnly(false);}} style={chip(showAll)}>Show all</button>
          <button onClick={clearFilters} style={{...chip(false),color:C.muted,borderColor:C.muted}}>Clear all</button>
        </div>
      </div>

      <div data-card-list="1" style={{maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
        {view.length===0&&<div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:5,padding:18,fontSize:12.5,color:C.soft}}>Nothing matches those filters.</div>}
        {(()=>{
          const pinnedCount=pinTouched&&!bnOnly?view.filter(x=>refreshTouched.includes(x.id)).length:0;
          // Band headers for the "recently" sorts (only when not in the post-import pinned snapshot).
          const bandMode=(!pinTouched&&!bnOnly&&(sortBy==="added"||sortBy==="edited"||sortBy==="labelled"))?sortBy:null;
          const newestAdd=bandMode==="added"?(view.find(x=>x.addedAt)?.addedAt||null):null;
          const newestEdit=bandMode==="edited"?(view.find(x=>x.editedAt)?.editedAt||null):null;
          const newestLabel=bandMode==="labelled"?(lastLabel(view.find(x=>lastLabel(x)))||null):null;
          const bandOf=(x)=>{
            if(bandMode==="added")return !x.addedAt?"seed":(x.addedAt===newestAdd?"add_this":"add_earlier");
            if(bandMode==="edited")return x.editedAt?(x.editedAt===newestEdit?"ed_this":"ed_earlier"):(x.addedAt?"ed_never":"seed");
            // A show labelled before this sort existed has no labelledAt: stage 1.
            if(bandMode==="labelled")return lastLabel(x)?(lastLabel(x)===newestLabel?"lab_this":"lab_earlier"):(periodLabelled(x)?"lab_stage1":"lab_never");
            return null;
          };
          const BAND_LABEL={add_this:"This import",add_earlier:"Earlier imports",seed:"Original set",ed_this:"This import's edits",ed_earlier:"Earlier edits",ed_never:"Never edited",lab_this:"This labelling",lab_earlier:"Earlier labellings",lab_stage1:"Stage 1",lab_never:"Not labelled"};
          const bandDivider=(txt,pk)=><div data-period={pk} style={{display:"flex",alignItems:"center",gap:8,margin:"2px 2px",color:C.soft}}><div style={{flex:1,height:1,background:C.rule}}/><span style={{fontSize:9.5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{txt}</span><div style={{flex:1,height:1,background:C.rule}}/></div>;
          return view.slice(0,drawLimit).map((r,i)=>{
          const brk=(pinTouched&&pinnedCount>0&&pinnedCount<view.length&&i===pinnedCount)?bandDivider("Rest of the list"):null;
          let header=null;
          if(periodView&&(i===0||periodOf(view[i-1],byArtist)!==periodOf(r,byArtist)))header=bandDivider(PERIOD_NAME[periodOf(r,byArtist)],periodOf(r,byArtist));
          if(bandMode){const b=bandOf(r);const pb=i>0?bandOf(view[i-1]):null;if(b!==pb)header=bandDivider(BAND_LABEL[b]||"");}
          const lead=brk||header;
          const isBusy=busyId===r.id;
          const card=<LedgerCard r={r} mu={MU[r.museumId]} isOpen={!!openCards[r.id]} isBusy={isBusy} busy={busy} rechecking={isBusy&&rechecking} lookLabel={isBusy?lookLabel:null}
              said={recheckSaid&&recheckSaid.id===r.id?recheckSaid:null} relabelling={relabelId===r.id} digitalOpen={digitalBox===r.id} C={C} TH={TH} chip={chip} pBtn={pBtn} lnk={lnk} act={cardAct}/>;
          if(!dragOn||!isBuyNext(r))return <React.Fragment key={r.id}>{lead}{card}</React.Fragment>;
          // The lifted card follows the finger; the cards it passes slide aside by its height.
          let ds={userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",cursor:"grab"};
          if(drag&&r.id===drag.id)ds={...ds,position:"relative",zIndex:5,transform:"translateY("+drag.dy+"px) scale(1.02)",boxShadow:"0 6px 18px rgba(0,0,0,0.28)",borderRadius:5,cursor:"grabbing"};
          else if(drag){const j=i<drag.from?i:i-1,f=j<drag.to?j:j+1;ds={...ds,transform:"translateY("+((f-i)*(drag.h+10))+"px)",transition:"transform 150ms ease"};}
          return <div key={r.id} data-buynext={r.id} onMouseDown={e=>startDrag(e,r.id)} onTouchStart={e=>startDrag(e,r.id)} onContextMenu={e=>e.preventDefault()} style={ds}>{card}</div>;
        });})()}
        {view.length>drawLimit&&<div ref={moreRef} style={{height:1}}/>}
      </div>
      {scrubGroups.length>0&&<PeriodScrubber groups={scrubGroups} C={C} onJump={jumpToPeriod}/>}
      {/* Top on the left, bottom on the right (her layout), shown once she has scrolled down. */}
      {/* Filled as the "Recently opened" tag, edged in the action green (her choice), in both themes. */}
      {selPick&&<button onMouseDown={e=>e.preventDefault()} onClick={searchPick}
        style={{position:"fixed",top:selPick.y,left:selPick.x,transform:"translateX(-50%)",zIndex:1000,background:TH.recent.wash,border:"1px solid "+C.action,borderRadius:4,color:TH.recent.ink,fontSize:12,fontWeight:500,cursor:"pointer",padding:"6px 12px",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>Search</button>}
      {showTop&&(<>
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="Return to top"
          style={{position:"fixed",bottom:undo?64:20,left:"50%",transform:"translateX(calc(-100% - 5px))",zIndex:998,width:38,height:38,borderRadius:"50%",background:C.card,border:"1px solid "+C.rule,color:C.ink,fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>{"\u2191"}</button>
        <button onClick={jumpToBottom} aria-label="Jump to bottom"
          style={{position:"fixed",bottom:undo?64:20,left:"50%",transform:"translateX(5px)",zIndex:998,width:38,height:38,borderRadius:"50%",background:C.card,border:"1px solid "+C.rule,color:C.ink,fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>{"\u2193"}</button>
      </>)}
      {undo&&(
        <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:C.ink,color:C.onAction,borderRadius:4,padding:"7px 14px",fontSize:12,display:"flex",gap:10,alignItems:"center",zIndex:999,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
          {/* "Undo", the same size as the word before it (her decision). A <button>
              does not inherit the page's font, so it is told to. */}
          <span style={{fontSize:14,lineHeight:"20px"}}>Dismissed</span>
          <button onClick={undoDismiss} style={{background:"none",border:"1px solid rgba(255,255,255,0.5)",borderRadius:3,color:C.onAction,fontFamily:"inherit",fontSize:14,lineHeight:"20px",fontWeight:600,cursor:"pointer",padding:"1px 8px",margin:0}}>Undo</button>
        </div>
      )}
      {/* Quarantine lives down here, right-aligned on the starter-set line (her decision). */}
      <div style={{maxWidth:760,margin:"18px auto 0",paddingTop:10,borderTop:"1px solid "+C.rule,fontSize:10,color:C.soft,lineHeight:1.6,display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
        {/* Two buttons on the left, no sentence (her decision), spaced like the drawers on the right. */}
        <span style={{display:"flex",gap:14}}>
          {/* Reset to Seed is unwired from her page (her decision), requestReset kept; drawn only for the tests. */}
          {typeof window!=="undefined"&&window.__catWatchTest&&<button onClick={requestReset} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Reset to Seed</button>}
          <button onClick={labelLedger} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Label</button>
          <button onClick={()=>{if(showResetCards)setResetQuery("");setShowResetCards(v=>!v);}} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear search</button>
        </span>
        <span style={{marginLeft:"auto",display:"flex",gap:14}}>
          {/* Cloud Saves sit beside Quarantine, in the same type, always drawn — a control
              that appears only with something to show can't say "none yet" (her decision). */}
          <button onClick={()=>{setShowSnaps(v=>!v); if(!showSnaps)loadSnaps();}} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{"Cloud Saves"}</button>
          {/* Quarantine's link is always drawn too (her catch): an empty one vanished. */}
          {<button onClick={()=>setShowIgnored(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{"Quarantine"}</button>}
        </span>
      </div>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {showSnaps&&<div style={{marginTop:6,padding:"10px 12px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* A list, like Quarantine (her design): copies come from Save and the two
              automatic safety copies. */}
          <div style={{fontSize:12,color:C.ink,marginBottom:8,lineHeight:1.55}}>
            {snaps&&snaps.length>0&&<b>{snaps.length+" cloud save"+(snaps.length===1?"":"s")+". "}</b>}
            {"From exports also saved to the cloud and safety snapshots (taken before a Load, Reset or roll-back to an earlier snapshot)."}
          </div>
          {snapWhy&&<div style={{fontSize:12,fontWeight:600,color:C.warnInk,background:C.warnBg,border:"1px solid "+C.warnEdge,borderRadius:4,padding:"5px 8px",marginBottom:8}}>{snapWhy}</div>}
          {snaps===null?<div style={{fontSize:12,color:C.soft}}>{"Reading cloud saves…"}</div>
          :snaps.length===0?<div style={{fontSize:12,color:C.soft}}>{"No cloud saves yet."}</div>
          :snaps.map(s=>(
            <div key={s.id} style={{display:"flex",gap:10,fontSize:12.5,color:C.ink,padding:"5px 0",alignItems:"baseline",borderTop:"1px dotted "+C.rule,flexWrap:"wrap"}}>
              {/* One width for every time (her ask): 15em fits the longest, with
                  even-width digits. */}
              <span style={{flex:"0 0 auto",minWidth:"15em",fontWeight:600,whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>{localReadable(s.at)}</span>
              {/* No "automatic" tag (her decision): her own copies are marked by her
                  description in bold. */}
              <span style={{flex:"1 1 160px"}}>{s.kind!=="safety"&&s.label?<>{"Export: \u201c"}<b>{s.label}</b>{"\u201d"}</>:snapTitle(s,snaps)}<span style={{color:C.soft}}>{" · "+s.rows+" exhibitions"}</span>{s.filename&&<span style={{display:"block",fontSize:11,color:C.soft,wordBreak:"break-all"}}>{s.filename}</span>}</span>
              <button onClick={()=>downloadSnapshot(s)} style={{background:"none",border:"none",color:C.action,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>Download</button>
              <button onClick={()=>requestRollback(s)} disabled={snapBusy} style={{background:"none",border:"none",color:C.accent,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>Roll back</button>
            </div>
          ))}
        </div>}
      </div>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {showIgnored&&ignored.length===0&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4,fontSize:12,color:C.soft}}>{quarWhy?"Quarantine can\u2019t be read: "+quarWhy:"Nothing in quarantine."}</div>}
        {/* Reset cards (her design): find a card by typing, pick it, confirm; its catalogue
            result is cleared (resetCard) and it shows "Find catalogue" again. Her marks
            stay. One card per confirm. */}
        {showResetCards&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          <input value={resetQuery} onChange={e=>setResetQuery(e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/>
          {resetQuery.trim()&&(()=>{
            const hits=cardsToReset(rows,resetQuery);
            if(!hits.length)return <div style={{fontSize:12,color:C.soft,marginTop:8}}>{"No searched cards match."}</div>;
            return hits.map(r=>(
              <div key={r.id} style={{display:"flex",gap:10,fontSize:12.5,color:C.ink,padding:"4px 0",alignItems:"baseline",marginTop:4}}>
                <span style={{minWidth:130,fontWeight:600}}>{MU[r.museumId]?MU[r.museumId].card:r.museumId}</span>
                <button onClick={()=>setConfirmBox({title:"Reset this search?",yes:"Yes",act:()=>{
                  commit(resetOneCard(rows,r.id));
                  if(recheckSaid&&recheckSaid.id===r.id)setRecheckSaid(null);
                  setResetQuery("");}})} style={{flex:1,textAlign:"left",background:"none",border:"none",color:C.action,fontSize:12.5,fontFamily:"inherit",textDecoration:"underline",cursor:"pointer",padding:0}}>{r.title}</button>
              </div>));
          })()}
        </div>}
        {showIgnored&&ignored.length>0&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* Big enough to read (her decision): decisions she may need to undo, in body
              ink, at chip size or above. */}
          <div style={{fontSize:12,color:C.ink,marginBottom:8,lineHeight:1.55}}>
            {/* The count lives in here (her decision); the footer button just says Quarantine. */}
            <b>{ignored.length+" in quarantine. "}</b>{"Entries excluded from all future imports. Removing them from quarantine will re-offer them in future sweeps \u2014 it does not immediately add them to your ledger."}
          </div>
          {/* By venue only (her decision): venues in the app's order, titles A–Z. */}
          {ignoredByVenue.map(x=>(
            <div key={x.key} style={{display:"grid",gridTemplateColumns:"minmax(60px,0.7fr) minmax(0,2fr) auto",gap:10,fontSize:12.5,color:C.ink,padding:"4px 0",alignItems:"baseline"}}>
              <span style={{fontWeight:600}}>{MU[x.venueId]?MU[x.venueId].card:x.venueId}</span>
              <span>{x.title||"(no title)"}</span>
              <button onClick={()=>{
                if(roStop())return;
                const at=new Date().toISOString();
                setQuarantine(prev=>{ const next=mergeQuarantine(prev,{[x.key]:{venueId:x.venueId,title:x.title,at,state:"released"}});
                  writeQuarantine(next).then(ok=>{ if(!ok) setQuarWhy("That release couldn\u2019t be saved to this page\u2019s store, so it may come back when you reload."); });
                  return next; });
                setDirty(true);}} style={{background:"none",border:"none",color:C.action,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>Remove</button>
            </div>
          ))}
        </div>}
      </div>
      {/* The import pop-up (her design; docs/add_by_link.md): CSV and Links, and a small
          Cancel. Under the review (1100) so cards open on top; under the confirm box (1200). */}
      {importMode&&(
        <div role="dialog" style={{position:"fixed",inset:0,background:C.scrim,zIndex:1050,display:"flex",flexDirection:"column",justifyContent:"center",padding:16}}>
          {/* Sized to what it holds. CSV and Links match Load and Save; the one pressed
              turns green (her design). */}
          <div style={{background:C.bg,borderRadius:8,...(importMode==="links"||importMode==="pages"||importMode==="paste"?{maxWidth:820,width:"100%"}:{width:"fit-content"}),boxSizing:"border-box",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"auto",boxShadow:"0 8px 30px rgba(0,0,0,0.3)",padding:"14px 18px 10px"}}>
            {/* IMPORT NEEDS A LEDGER OPEN: on an empty page it offers only the ways to open
                one (her design), so an import can never become the whole ledger. */}
            {importMode==="needLedger"&&<div style={{textAlign:"center"}}>
              <div style={{fontSize:13,color:C.ink,marginBottom:10}}>Your ledger needs to be opened first.</div>
              <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                <button onClick={()=>{setImportMode(null);requestOpenCloud();}} style={sBtn}>Open last cloud save</button>
                <button onClick={()=>{setImportMode(null);requestImport();}} style={sBtn}>Load</button>
              </div>
            </div>}
            {importMode!=="needLedger"&&<div style={{display:"flex",gap:5,justifyContent:"center"}}>
              <button onClick={()=>{setImportMode(null);refreshFileRef.current?.click();}} disabled={busy} style={sBtn}>CSV</button>
              <button onClick={()=>{ if(importMode!=="links"){ setLinkFails([]); setLinkNote(null); } setImportMode("links"); }} disabled={busy} style={importMode==="links"?{...pBtn,opacity:1}:sBtn}>Links</button>
              <button onClick={()=>{ if(importMode!=="pages"){ setLinkFails([]); setLinkNote(null); } setImportMode("pages"); }} disabled={busy} style={importMode==="pages"?{...pBtn,opacity:1}:sBtn}>Pages</button>
              <button onClick={()=>{ if(importMode!=="paste"){ setLinkFails([]); setLinkNote(null); } setImportMode("paste"); }} disabled={busy} style={importMode==="paste"?{...pBtn,opacity:1}:sBtn}>Paste</button>
            </div>}
            {importMode==="paste"&&<div style={{marginTop:14}}>
              {/* Paste: one box per page, the link and the page's text in separate boxes, a faint "Link" in
                  the link box (her design). "Clear" as the Links box has it: in the box, top right; "Clear all"
                  the same, above the boxes. */}
              {pastes.map((x,i)=>{
                const set=(k,v)=>setPastes(l=>l.map(y=>y.id===x.id?{...y,[k]:v}:y));
                const field={width:"100%",boxSizing:"border-box",fontSize:12.5,fontFamily:"inherit",padding:"6px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,display:"block"};
                return <div key={x.id} style={{marginBottom:10,position:"relative"}}>
                  <input value={x.url} onChange={e=>set("url",e.target.value)} disabled={busy} placeholder="Link" aria-label="Link" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{...field,paddingRight:52}}/>
                  {filledBox(x)&&<button onClick={()=>{ const l=pastes.map(y=>y.id===x.id?newBox():y); setPastes(l); writePendingPastes(l); }} disabled={busy}
                    style={{position:"absolute",top:7,right:8,background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear</button>}
                  <textarea value={x.text} onChange={e=>set("text",e.target.value)} disabled={busy} aria-label="Text" rows={5} style={{...field,marginTop:4,resize:"vertical"}}/>
                </div>;
              })}
              {/* "Clear all" in the row with + and Read, centred as Cancel is (her design). */}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center"}}>
                <span/>
                <span>{pastes.some(filledBox)&&<button onClick={()=>{ const l=pasteBoxes([]); setPastes(l); setLinkFails([]); setLinkNote(null); writePendingPastes(l); }} disabled={busy}
                  style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear all</button>}</span>
                <div style={{display:"flex",justifyContent:"flex-end",gap:5}}>
                <button onClick={()=>setPastes(l=>[...l,newBox()])} disabled={busy} aria-label="Add a box" style={sBtn}>+</button>
                <button onClick={()=>readLinks("paste")} disabled={busy} style={pBtn}>Read</button>
                </div>
              </div>
              {readStatus(f=>f.url)}
            </div>}
            {importMode==="pages"&&<div style={{marginTop:14}}>
              {/* Pages: saved show pages, read as a link is read. The list works as the Links
                  box does: "Clear" empties it and the store; what is not read stays. */}
              <input ref={pagesFileRef} type="file" multiple accept=".mht,.mhtml,.html,.htm,multipart/related,message/rfc822,text/html" onChange={pickPages} style={{display:"none"}}/>
              <div style={{position:"relative",border:"1px solid "+C.rule,borderRadius:4,background:C.card,padding:"8px 52px 8px 10px",minHeight:60,fontSize:12.5,color:C.ink}}>
                {pages.length?pages.map(p=><div key={p.url} style={{overflowWrap:"anywhere",lineHeight:1.5}}>{p.title||p.name||p.url}</div>)
                  :null}
                {pages.length>0&&<button onClick={()=>{ setPages([]); setLinkFails([]); setLinkNote(null); writePendingPages([]); }} disabled={busy}
                  style={{position:"absolute",top:6,right:8,background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear</button>}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:5,marginTop:8}}>
                <button onClick={()=>pagesFileRef.current?.click()} disabled={busy} style={sBtn}>Choose pages</button>
                <button onClick={()=>readLinks("pages")} disabled={busy||!pages.length} style={pBtn}>Read</button>
              </div>
              {readStatus(f=>{ const pg=pages.find(p=>p.url===f.url); return (pg&&(pg.title||pg.name))||f.url; })}
            </div>}
            {importMode==="links"&&<div style={{marginTop:14}}>
              {/* "Clear" sits inside the box, top right (her design): one press empties
                  it and the store. */}
              <div style={{position:"relative"}}>
                <textarea value={linkText} onChange={e=>setLinkText(e.target.value)} rows={8} disabled={busy}
                  style={{width:"100%",boxSizing:"border-box",fontSize:12.5,fontFamily:"inherit",padding:"8px 52px 8px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,resize:"vertical",display:"block"}}/>
                {linkText.trim()&&<button onClick={()=>{ setLinkText(""); setLinkFails([]); setLinkNote(null); writePendingLinks(""); }} disabled={busy}
                  style={{position:"absolute",top:6,right:8,background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear</button>}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                <button onClick={()=>readLinks("links")} disabled={busy} style={pBtn}>Read</button>
              </div>
              {readStatus(f=><a href={f.url} target="_blank" rel="noopener noreferrer" style={{color:TH.urgent.ink}}>{f.url}</a>)}
            </div>}
            {/* Cancel always answers: a catalogue search also sets busy, and once locked the
                pop-up out until the search ended (her report). */}
            <div style={{textAlign:"center",marginTop:10}}>
              <button onClick={()=>{ if(linkRead.current.on){ linkRead.current.stop=true; setProg(p=>({...p,label:readStopping(importMode)})); return; } if(!proposals)dropHeldVenues(); setImportMode(null); }} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {proposals&&(
        <div style={{position:"fixed",inset:0,background:"rgba(20,18,16,0.5)",zIndex:1100,display:"flex",flexDirection:"column",padding:16}}>
          <div style={{background:C.bg,borderRadius:8,maxWidth:820,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.rule}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:500,color:C.ink}}>{proposals.length} proposed change{proposals.length===1?"":"s"} found</div>
              {/* The counts, her wording: two sentences, each ending in the number the
                  next starts from (docs/app.md §3). Every term stays — drop one and the
                  arithmetic stops closing. */}
              {tally&&(()=>{
                const cards=tally.add+tally.fill+tally.change;
                const n=(v,tone)=><b style={{color:tone||C.ink}}>{v}</b>;
                return (
                <div style={{fontSize:11.5,color:C.soft,marginTop:6,lineHeight:1.6}}>
                  <div>
                    From {n(tally.fileRows)} row{tally.fileRows===1?"":"s"} in the file
                    {" \u2014 "}{n(tally.markers)} marker row{tally.markers===1?"":"s"}
                    {tally.blocked>0&&<>{", "}{n(tally.blocked)} you{"\u2019"}d said never to add</>}
                    {", "}{n(tally.folded)} duplicate row{tally.folded===1?"":"s"} reconciled/de-duped
                    {", "}{n(tally.silent)} already matching ledger
                    {" = "}{n(cards)} entries considered for import
                  </div>
                  <div style={{marginTop:2}}>
                    From {n(cards)} entr{cards===1?"y":"ies"}
                    {" \u2014 "}{n(tally.fill)} fill a gap
                    {", "}{n(tally.change)} edit existing data
                    {", "}{n(tally.add)} new exhibition{tally.add===1?"":"s"}
                  </div>
                </div>
                );
              })()}
            </div>
            <div style={{overflow:"auto",padding:"12px 18px",flex:1}}>
              {/* Triage first, then the ordinary work (her decision): odd cases batched
                  by kind, easiest first, so she finishes one kind of thinking at a time.
                  A venue can appear twice on this screen — accepted. */}
              {(()=>{
                const at=proposals.map((p,i)=>({p,i}));
                const vOrder=m=>{const k=MUSEUMS.findIndex(x=>x.id===m);return k<0?999:k;};
                const byVenue=a=>a.slice().sort((x,y)=>vOrder(x.p.venueId)-vOrder(y.p.venueId));
                // No "unusable" band: a faulty row refuses the whole file (analyzeProForma;
                // qc.js upstream).
                const real    = at;
                // Was this card built from more than one row? Ask the fold's own flag, never
                // the notes — a travelling show's note says "same exhibition" too (fixture 16).
                const isMerged=x=>!!x.p.merged;
                const hasChoice=x=>!!x.p.choices;
                const mergedOnly = byVenue(real.filter(x=>isMerged(x)&&!hasChoice(x)));
                // A conflict is always a fold, so there is no band for a lone disagreement
                // (fixture 17).
                const mergedConf = byVenue(real.filter(x=>hasChoice(x)));
                const plain      = real.filter(x=>!isMerged(x)&&!hasChoice(x));
                // No link at all: usable rows, grouped because the link is the only key for
                // folding and quarantine, so they return fresh every sweep (her decision).
                const noLink     = byVenue(plain.filter(x=>!x.p.cand||!x.p.cand.exUrl));
                const notForYou  = byVenue(plain.filter(x=>isTopicCard(x.p)));
                const ordinary   = plain.filter(x=>x.p.cand&&x.p.cand.exUrl&&!isTopicCard(x.p));
                // Venue subheadings inside each band, in the same style and order as below.
                const byVenueBlocks=list=>allVenues().map(m=>{
                  const grp=list.filter(x=>x.p.venueId===m.id);
                  if(!grp.length)return null;
                  return(
                    <div key={m.id} style={{marginBottom:10}}>
                      <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginBottom:6,fontWeight:600}}>{m.card}</div>
                      {grp.map(({p,i})=>renderProposalCard(p,i))}
                    </div>
                  );
                }).filter(Boolean);
                // Every band carries its own count on its header, so collapsing never
                // hides it.
                const bandOpen=(key,dflt)=>openBands[key]===undefined?dflt:openBands[key];
                // A venue with no entry is OPEN. See the state declaration.
                const venueOpen=id=>openVenues[id]!==false;
                const band=(key,title,tone,n,dflt,body)=>{
                  const open=bandOpen(key,dflt);
                  return(
                    <div key={key} style={{marginBottom:10}}>
                      <button onClick={()=>setOpenBands(o=>({...o,[key]:!open}))}
                        style={{display:"flex",alignItems:"center",gap:7,width:"100%",textAlign:"left",background:"none",
                                border:"none",borderBottom:"1px solid "+C.rule,padding:"5px 0",cursor:"pointer",color:tone||C.soft}}>
                        <span style={{fontSize:9,lineHeight:1,width:9,display:"inline-block",transform:open?"rotate(90deg)":"none",transition:"transform .12s"}}>{"\u25B6"}</span>
                        <span style={{fontSize:11,letterSpacing:"0.07em",fontWeight:600}}>{title}</span>
                        <span style={{fontSize:11,fontWeight:700,color:tone||C.ink}}>{"\u00b7"} {n}</span>
                      </button>
                      {open&&<div style={{marginTop:8}}>{body}</div>}
                    </div>
                  );
                };
                // The odd-cases total counts the markers too.
                const oddCount=coverage.length+mergedOnly.length+mergedConf.length+noLink.length;
                const markerBlocks=MUSEUMS.map(m=>{
                  const grp=coverage.filter(cv=>cv.venueId===m.id);
                  if(!grp.length)return null;
                  return(
                    <div key={"cvg"+m.id} style={{marginBottom:10}}>
                      <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginBottom:6,fontWeight:600}}>{m.card}</div>
                      {grp.map((cv,i)=>(
                        <div key={"cv"+i} style={{border:"1px solid "+C.rule,borderRadius:6,padding:"8px 10px",marginBottom:6,background:C.card}}>
                          <div style={{fontSize:12,color:C.ink}}>{cv.what}</div>
                          <div style={{fontSize:11.5,color:C.soft,marginTop:2,lineHeight:1.5}}>{cv.why}</div>
                        </div>
                      ))}
                    </div>
                  );
                }).filter(Boolean);
                return(<>
                  {oddCount>0&&(
                    <div style={{marginBottom:16,paddingBottom:12,borderBottom:"2px solid "+C.rule}}>
                      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:8}}>Odd cases {"\u00b7"} {oddCount}</div>
                      {coverage.length>0&&band("markers","1. Marker rows",undefined,coverage.length,false,markerBlocks)}
                      {mergedOnly.length>0&&band("merged","2. Combined rows \u00b7 identical rows were de-duped or reconciled",undefined,mergedOnly.length,false,byVenueBlocks(mergedOnly))}
                      {mergedConf.length>0&&band("mergedconf","3. Combined rows \u00b7 identical rows produced conflicts \u2014 yours to choose",C.accent,mergedConf.length,true,byVenueBlocks(mergedConf))}
                      {noLink.length>0&&band("nolink","4. No exhibition url \u00b7 link goes to venue\u2019s listing page",undefined,noLink.length,true,byVenueBlocks(noLink))}
                    </div>
                  )}
                  {notForYou.length>0&&(
                    <div style={{marginBottom:16,paddingBottom:12,borderBottom:"2px solid "+C.rule}}>
                      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:8}}>Probably not for you {"\u00b7"} {notForYou.length}</div>
                      {byVenueBlocks(notForYou)}
                    </div>
                  )}
                {ordinary.length>0&&(()=>{
                    // Only venues with ordinary cards, or "Collapse all" would write keys
                    // for empty venues and read the wrong way next click.
                    const venuesHere=allVenues().filter(m=>ordinary.some(x=>x.p.venueId===m.id)).map(m=>m.id);
                    const anyOpen=venuesHere.some(id=>venueOpen(id));
                    return(
                    <div style={{marginBottom:12,display:"flex",alignItems:"flex-end",gap:12,flexWrap:"wrap"}}>
                      <div style={{flex:"1 1 260px",minWidth:0}}>
                        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:2}}>Normal cases {"\u00b7"} {ordinary.length}</div>
                        <div style={{fontSize:11.5,color:C.soft,lineHeight:1.55}}>Nothing unusual about these {"\u2014"} one row in the file, nothing combined, nothing disagreeing.</div>
                      </div>
                      <button onClick={()=>{
                          const next={};
                          for(const id of venuesHere) next[id]=!anyOpen;
                          setOpenVenues(o=>({...o,...next}));
                        }} style={sBtn}>{anyOpen?"Collapse all venues":"Expand all venues"}</button>
                    </div>
                  );})()}
                  {/* Order inside a venue (her decision): fills, then edits, then new;
                      newest closing date first in each; no closing date last. */}
                  {allVenues().map(m=>{
                    const rank={fill:0,change:1,add:2};
                    const grp=ordinary.filter(x=>x.p.venueId===m.id).slice().sort((a,b)=>{
                      const d=(rank[a.p.type]??9)-(rank[b.p.type]??9); if(d!==0)return d;
                      const ae=a.p.cand&&a.p.cand.endDate, be=b.p.cand&&b.p.cand.endDate;
                      if(!ae&&!be)return 0; if(!ae)return 1; if(!be)return -1;
                      return be.localeCompare(ae);
                    });
                    if(!grp.length)return null;
                    // The venue heading is the control (docs/app.md §3 "Screen rulings").
                    const vOpen=venueOpen(m.id);
                    return(
                    <div key={m.id} style={{marginBottom:14}}>
                      <button onClick={()=>setOpenVenues(o=>({...o,[m.id]:!vOpen}))}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",background:"none",
                                border:"none",borderBottom:"1px solid "+C.rule,padding:"6px 0",marginBottom:8,cursor:"pointer",color:C.accent}}>
                        <span style={{fontSize:10,lineHeight:1,width:10,display:"inline-block",transform:vOpen?"rotate(90deg)":"none",transition:"transform .12s"}}>{"\u25B6"}</span>
                        <span style={{fontSize:14,letterSpacing:"0.01em",fontWeight:700}}>{m.card}</span>
                        <span style={{fontSize:12,fontWeight:700}}>{"\u00b7"} {grp.length}</span>
                        {/* The undecided count per venue, only where there is work: a
                            closed venue still declares what it holds; a "0" is clutter
                            (her decision). */}
                        {(()=>{const u=grp.filter(({p,i})=>isUndecided(p,i)).length;
                          return u>0?<span style={{fontSize:11,fontWeight:600,color:C.soft}}>{"\u00b7 "+u+" to decide"}</span>:null;})()}
                      </button>
                      {vOpen&&grp.map(({p,i})=>renderProposalCard(p,i))}
                    </div>
                  );})}
                </>);
              })()}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid "+C.rule,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={cancelRefresh} style={sBtn}>Cancel import</button>
              {/* Rejected and quarantined are named only when there is one (her ask);
                  what is named adds up to what is decided. */}
              <span style={{fontSize:11.5,color:C.soft,marginLeft:"auto"}}>
                {(rejectedCount?rejectedCount+" rejected, ":"")+(quarantinedCount?quarantinedCount+" quarantined, ":"")+acceptedCount+" to apply"}</span>
              {/* No separate "N to decide" link here (her decision: clutter) — the venue
                  headings say where the cards are. */}
              {/* Every card must be decided before the ledger moves — a hard block, her
                  permanent design (docs/app.md §3). The button says what is missing. */}
              {/* ===== PARTIAL APPLY — stays until she says (CLAUDE.md §5.1) =====
                  Beside the block, never instead of it: drawn only when some cards are
                  decided and some are not (offerPartialApply). It asks first, in her
                  wording (partialApplyWords), naming what is left behind and the way back. To
                  remove it: this block, `partial` on applyRefresh and applyCards,
                  offerPartialApply, partialApplyWords, fixture 18h. */}
              {offerPartialApply({acceptedCount,undecidedCount})&&<button
                onClick={()=>setConfirmBox({
                  title:partialApplyWords({acceptedCount,undecidedCount}).title,
                  text:partialApplyWords({acceptedCount,undecidedCount}).text,
                  act:()=>proceedRefresh(true)})}
                title={partialApplyWords({acceptedCount,undecidedCount}).hover}
                style={{...sBtn,borderColor:C.accent,color:C.accent,fontWeight:600}}>
                {partialApplyWords({acceptedCount,undecidedCount}).button}</button>}
              {/* ===== end partial apply block ===== */}
              {/* "Next" when a new venue's shop is still to confirm (her design): the
                  ledger moves only after the shop screen. */}
              <button onClick={()=>proceedRefresh(false)} disabled={undecidedCount>0}
                title={undecidedCount>0?"Decide every card first — "+undecidedCount+" still undecided.":""}
                style={{...pBtn,...(undecidedCount>0?{background:C.muted,cursor:"not-allowed",opacity:1}:{})}}>
                {undecidedCount>0
                  ? undecidedCount+" still to decide"
                  : venuesToConfirm().length?"Next":"Go ahead and update the ledger"}</button>
            </div>
          </div>
        </div>
      )}
      {/* The shop screen (her design): one card per new venue with an unconfirmed shop;
          the ledger moves only when every card is answered. Over the review (1100),
          under the confirm box (1200). */}
      {shopScreen&&proposals&&(()=>{
        const left=shopScreen.ids.filter(id=>!(occVenues[id]||{}).confirmed||shopLooking===id).length;
        return <div role="dialog" style={{position:"fixed",inset:0,background:C.scrim,zIndex:1150,display:"flex",flexDirection:"column",padding:16}}>
          <div style={{background:C.bg,borderRadius:8,maxWidth:820,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.rule}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:500,color:C.ink}}>New Venue Shops</div>
            </div>
            <div style={{overflow:"auto",padding:"4px 18px 14px",flex:1}}>
              {/* The review cards' buttons (decBtn), always the same four in the same
                  places (her decision); Confirm greyed only with no shop to confirm. */}
              {shopScreen.ids.map(id=>{
                const v=occVenues[id]||{}, link=v.shop==="found"?v.shopCatalogues:null, looking=shopLooking===id;
                const home=v.shop==="noshelf"||v.shop==="failed"?v.shopHome:null;
                const said=v.shop==="found"?null:v.shop==="noshelf"?"Shop found, but not its books section: "
                  :v.shop==="failed"?"Search failed.":"No museum shop found.";
                // The finder found no catalogues section: one line, her wording, whatever it took instead.
                const lesser=link&&v.shelfKind&&v.shelfKind!=="catalogues"?"Shop found, but not its catalogues section ":null;
                const en=v.shop==="found"?v.shopEnglishUnread:null;
                const yes=v.confirmed&&v.shop==="found"&&!v.englishPicked&&!v.shopAdded, yesEn=v.confirmed&&!!en&&!!v.englishPicked, none=v.confirmed&&v.shop==="none", added=v.confirmed&&!!v.shopAdded;
                const typing=shopAdding&&shopAdding.id===id;
                return <div key={id} style={{paddingTop:12,marginTop:10,borderTop:"1px solid "+C.rule,fontSize:12.5,color:C.ink,lineHeight:1.45}}>
                  <div style={{fontWeight:600}}>{(MU[id]&&MU[id].card)||v.short||v.name||id}</div>
                  {link?<div>{lesser&&<span style={{color:C.soft}}>{lesser}</span>}<a href={link} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{link}</a></div>
                    :<div style={{color:C.soft}}>{said}{home&&v.shop==="noshelf"&&<a href={home} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{home}</a>}</div>}
                  <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                    {looking?<span style={{fontSize:11.5,color:C.soft}}>Looking{"\u2026"}</span>:<>
                      <button onClick={()=>confirmShop(id)} disabled={!!shopLooking||!(link||home)} style={{...decBtn(yes,C.okEdge),...(!(link||home)?{opacity:0.4,cursor:"not-allowed"}:{})}}>{yes?"\u2713 ":""}Confirm</button>
                      <button onClick={()=>lookAgain(id)} disabled={!!shopLooking} style={decBtn(false,C.okEdge)}>Look again</button>
                      <button onClick={()=>noShopFor(id)} disabled={!!shopLooking} style={decBtn(none,C.rejectInk)}>{none?"\u2713 ":""}No shop</button>
                      <button onClick={()=>setShopAdding(typing?null:{id,text:added?link:""})} disabled={!!shopLooking} style={decBtn(added,C.okEdge)}>{added?"\u2713 ":""}Add</button>
                    </>}
                  </div>
                  {/* "Add": her link, taken on Enter or on leaving the box; Escape closes it. */}
                  {typing&&!looking&&<input autoFocus value={shopAdding.text} onChange={e=>setShopAdding({id,text:e.target.value})}
                    onKeyDown={e=>{ if(e.key==="Enter")addShopFor(id,e.target.value); else if(e.key==="Escape"){ e.target.value=""; setShopAdding(null); } }}
                    onBlur={e=>addShopFor(id,e.target.value)}
                    style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"5px 8px",fontSize:12.5,border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontFamily:"inherit"}}/>}
                  {/* Its English section, which the finder could not read: hers to confirm instead. */}
                  {en&&<><div style={{marginTop:6}}><a href={en} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{en}</a></div>
                    <div style={{display:"flex",gap:6,marginTop:6}}>{!looking&&<button onClick={()=>confirmShop(id,true)} disabled={!!shopLooking} style={decBtn(yesEn,C.okEdge)}>{yesEn?"\u2713 ":""}Confirm</button>}</div></>}
                </div>;})}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid "+C.rule,display:"flex",gap:10,alignItems:"center"}}>
              <button onClick={()=>{setShopAdding(null);setShopScreen(null);}} disabled={!!shopLooking} style={sBtn}>Back</button>
              <button onClick={()=>applyRefresh(shopScreen.partial)} disabled={left>0}
                style={{...pBtn,marginLeft:"auto",...(left>0?{background:C.muted,cursor:"not-allowed",opacity:1}:{})}}>
                {left>0?left+" still to decide":"Go ahead and update the ledger"}</button>
            </div>
          </div>
        </div>;})()}
      {/* ABOVE THE REVIEW PANEL, NOT UNDER IT: the confirm box is the TOP layer (1200),
          because the thing asked last is answered first (fixture 18i). Any new overlay
          goes below it. */}
      {confirmBox&&(
        <div style={{position:"fixed",inset:0,background:C.scrim,display:"grid",placeItems:"center",zIndex:1200,padding:16}}>
          <div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:8,maxWidth:420,padding:"18px 20px",boxShadow:"0 6px 24px rgba(0,0,0,0.25)"}}>
            {/* The heading is the caller's; the default keeps the old wording. */}
            <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:8}}>{confirmBox.title||"Replace what's on screen?"}</div>
            {confirmBox.text?<div style={{fontSize:12.5,color:C.body,lineHeight:1.5,marginBottom:16}}>{confirmBox.text}</div>:<div style={{height:8}}/>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setConfirmBox(null)} style={sBtn}>Cancel</button>
              <button onClick={()=>{const a=confirmBox.act;setConfirmBox(null);a&&a();}} style={{...pBtn,background:C.accent}}>{confirmBox.yes||"Continue"}</button>
            </div>
          </div>
        </div>
      )}
      {/* The version, small and grey: something she checks, not acts on. Reads
          APP_VERSION, so there is one copy of the number. */}
      <footer style={{maxWidth:760,margin:"28px auto 0",fontSize:10.5,color:C.soft,textAlign:"center"}}>
        Art Watch {"·"} v {APP_VERSION} {"·"} {APP_VERSION_DATE}
      </footer>
    </div>
  );
}
