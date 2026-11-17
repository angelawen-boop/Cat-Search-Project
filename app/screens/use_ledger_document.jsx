//@ The ledger as a document: its rows, the quarantine, changed-since-saved, the cloud copy (opening, automatic save, heartbeat, read-only), the safety copies, Save, Load and Reset.
//@piece useLedgerDocument

// The memory of her ledger and everything that guards it (docs/cloud_storage.md). It takes four named actions from
// the screen — put a line in the error line, put a diagnostic in the box, ask her in the confirm box, and "a ledger
// was loaded" — and hands back ONE object: what it remembers and named actions; no raw setter leaves it. Its
// opening reads (the quarantine, then the cloud copy) run before the screen's own: App calls it before its opening effect.
function useLedgerDocument({showError,showDiagnostic,ask:askHer,onLoaded}){
  const[rows,setRows]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[saveErr,setSaveErr]=useState(false);
  const[lastRun,setLastRun]=useState(null);
  // Quarantine (docs/app.md §4): the third outcome beside reject and dismiss. The MAP is
  // stored (tombstones and all); the LIST is derived from it — what she sees and what
  // the export carries.
  const[quarantine,setQuarantine]=useState({});
  const[quarWhy,setQuarWhy]=useState(null);
  const ignored=useMemo(()=>activeQuarantine(quarantine),[quarantine]);
  const ignoredByVenue=useMemo(()=>{
    const ord=id=>{ const i=MUSEUMS.findIndex(m=>m.id===id); return i<0?MUSEUMS.length:i; };
    return ignored.slice().sort((a,b)=>ord(a.venueId)-ord(b.venueId)||String(a.title||"").localeCompare(String(b.title||"")));
  },[ignored]);
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
  const roStop=()=>{ if(!cloudReadOnly)return false; showError(RO_LINE); return true; };
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
  // A download we started but cannot confirm arrived. Never clears `dirty`.
  const[unconfirmedSave,setUnconfirmedSave]=useState(null);
  const[lastSaved,setLastSaved]=useState(null);
  const[saveState,setSaveState]=useState("idle");
  const cloudNotSaving=saveState==="failed"||saveState==="off";
  const[dirty,setDirty]=useState(false);
  const[savedFile,setSavedFile]=useState(null);
  const[loadedInfo,setLoadedInfo]=useState(null);
  const[,setTick]=useState(0);
  const fileRef=useRef(null);
  const[refreshDone,setRefreshDone]=useState(null); // {added,filled,changed} after applying

  useEffect(()=>{
    // Opens empty: a workspace waiting for her ledger file (docs/app.md §2). Nothing
    // is fetched on open.
    setRows([]);
    setLoaded(true);
    // The sweep log, quarantine and Add-by-link state are not part of the ledger, so
    // they load here, before any file is opened. Read once, not subscribed.
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
  },[]);

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
    if(cloudReadOnly){ showError(RO_LINE); return; }
    setRows(next);
    if(lr!==undefined)setLastRun(lr);
    setDirty(true);
    setSaveNote(null);
    
  },[]);

  // LOADS (Import, Reset) are NOT unsaved work. Freshly loaded data matches its
  // source, so there's nothing to lose yet. The unsaved warning only appears once
  // you actually change something.
  const loadLedger=useCallback((next,lr,info,extra,display)=>{
    if(cloudReadOnly&&!display){ showError(RO_LINE); return; }
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
    showError(null);
    setLoadedInfo(info||null);
    setRefreshDone(null);
    onLoaded();
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
    if(r.readOnly){ goReadOnly(); showError(RO_LINE); }
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
    const g=await cloudCheckBeforeReplace(cloudT,incoming,reason,showDiagnostic);
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
    const go=async()=>{ const why=await cloudReadToOpen(openCloudData); if(why)showError(why); };
    if(rows.length>0&&dirty&&cloudNotSaving)askHer({text:cloudOpenQuestion(),act:go});
    else go();
  }

  // SNAPSHOTS.
  async function loadSnaps(){
    const r=await cloudSavesRead();
    setSnaps(r.snaps); setSnapWhy(r.why);
  }
  function requestRollback(s){
    if(roStop())return;
    askHer({...cloudRollbackQuestion(s,snaps),
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

  // AN IMPORT CHECKS THE CLOUD COPY FIRST (guardCloudBeforeReplace), then
  // replaces the screen and arms saving. If the cloud copy differed and could
  // not be kept as a snapshot, the import stops there and says so.
  function handleImport(e){const file=e.target.files[0];if(!file)return;if(roStop()){e.target.value="";return;}const reader=new FileReader();reader.onload=async()=>{const got=readLedgerFile(reader.result);if(got.error){showError(got.error);return;}const next=got.rows,ign=got.ignored;let said=false;try{said=await guardCloudBeforeReplace({rows:next,ignored:ign},"import");}catch{return;}loadLedger(next,got.lastRun,said?null:got.note,{ignored:ign});cloudArmed.current=true;showDiagnostic(got.debug);};reader.readAsText(file);e.target.value="";}

  // Confirm-before-replace: Import and Reset can wipe the screen in one tap, so
  // they ask first WHENEVER there is unsaved work showing.
  const openFilePicker=()=>fileRef.current?.click();
  function requestImport(){
    const ask=loadQuestion(rows.length,dirty,cloudNotSaving);
    if(ask){askHer({text:ask,act:openFilePicker});}
    else openFilePicker();
  }
  const doReset=async()=>{if(roStop())return;const seed=resetSeed();try{await guardCloudBeforeReplace({rows:seed.rows,ignored},"reset");}catch{return;}cloudArmed.current=true;loadLedger(seed.rows,null,seed.note);showDiagnostic(seed.debug);};
  // Reset to Seed always asks while a ledger is on screen (her decision).
  function requestReset(){
    const ask=resetQuestion(rows.length,dirty,cloudNotSaving);
    if(ask){askHer({text:ask,act:doReset});}
    else doReset();
  }

  // Save: saveShrinkQuestion asks first when it would shrink the ledger; saveFile and saveLedger do the work.
  async function handleSave(){
    if(saveBusy||!rows.length)return;
    const ask=await saveShrinkQuestion(rows.length);
    if(ask){ askHer({...ask,act:saveNow}); return; }
    saveNow();
  }
  async function saveNow(){
    if(saveBusy||!rows.length)return;
    const f=saveFile({rows,ignored,lastRun,typed:saveLabel});
    if(f.note){ setSaveNote(f.note); return; }
    setSaveBusy(true);
    try{
      const r=await saveLedger(f,saveCloud,{kept:()=>{ if(showSnaps)loadSnaps(); },refused:showDiagnostic});
      setSaveNote({ok:r.ok,text:r.text,file:f.filename});
      if(r.file==="saved"){
        showError(null); setDirty(false); setUnconfirmedSave(null);
        setShowSave(false); setSaveLabel(""); setSaveCloud(true);
        // THE IMPORT REMINDER ASKS FOR BOTH, her wording — it goes only when both happened.
        if(r.cloud===true)setRefreshDone(null);
      }
      showDiagnostic(r.debug);
    }finally{ setSaveBusy(false); }
  }

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

  // What the layout pieces call, each by a name that says what it does.
  const toggleSavePanel=()=>setShowSave(v=>!v);
  const closeSavePanel=()=>setShowSave(false);
  const typeSaveLabel=v=>setSaveLabel(v);
  const chooseSaveCloud=on=>setSaveCloud(on);
  const dismissCloudCheck=()=>setCloudCheck(null);
  const toggleCloudSaves=()=>{setShowSnaps(v=>!v); if(!showSnaps)loadSnaps();};
  const releaseFromQuarantine=x=>{
    if(roStop())return;
    const at=new Date().toISOString();
    setQuarantine(prev=>{ const next=mergeQuarantine(prev,{[x.key]:{venueId:x.venueId,title:x.title,at,state:"released"}});
      writeQuarantine(next).then(ok=>{ if(!ok) setQuarWhy(W.releaseNotSaved); });
      return next; });
    setDirty(true);};

  // Named actions for the rest of the screen in place of the document's setters.
  // Label and Relabel put their rows in place with no read-only question, marked changed.
  const put=next=>{ setRows(next); setDirty(true); setSaveNote(null); };
  // The rows as they stand, for a job whose answer arrives later.
  const latest=()=>cloudLatest.current.rows;
  // An import's new quarantine, merged in and stored.
  const addToQuarantine=add=>{
    setQuarantine(prev=>{ const merged=mergeQuarantine(prev,add);
      saveImportQuarantine(merged).then(why=>{ if(why) setQuarWhy(why); });
      return merged; });
  };
  // An import was applied: the reminder to save both (Save and Load clear it).
  const importApplied=done=>setRefreshDone(done);
  return{rows,loaded,hasLedger,dirty,readOnly,ignored,ignoredByVenue,quarWhy,lastRun,
    cloudLive,cloudCheck,cloudStatus,savedText,saveNote,refreshDone,unconfirmedSave,showUnsavedBanner,
    showSave,saveLabel,saveCloud,saveBusy,showSnaps,snaps,snapWhy,snapBusy,fileRef,
    commit,put,latest,readOnlyStop:roStop,addToQuarantine,releaseFromQuarantine,importApplied,
    requestImport,handleImport,requestOpenCloud,requestReset,
    handleSave,toggleSavePanel,closeSavePanel,typeSaveLabel,chooseSaveCloud,
    toggleCloudSaves,requestRollback,downloadSnapshot,dismissCloudCheck};
}
