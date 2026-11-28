//@ The main screen: the hooks called in their order, the shared job flag, error line, confirm box, theme and the drawers' shared flags, and the layout pieces in page order.
//@piece momentLines

// A sweep moment on two lines, the date then the time, so every row of the Details table wraps the same way.
function momentLines(label,iso){const t=fmtRefresh(iso),i=t.lastIndexOf(" ");return i<0?label+t:<>{label+t.slice(0,i)}<br/>{t.slice(i+1)}</>;}
//@piece App


export default function App(){
  const[busy,setBusy]=useState(false);
  const[prog,setProg]=useState({done:0,total:0,label:""});
  const[error,setError]=useState(null);
  const[debug,setDebug]=useState(null);
  const[storeUnread,setStoreUnread]=useState([]);   // parts of the store that could not be read this opening
  useEffect(()=>{ storeUnreadSeen=setStoreUnread; setStoreUnread([...STORE_UNREAD]); return()=>{ storeUnreadSeen=()=>{}; }; },[]);
  const[showIgnored,setShowIgnored]=useState(false);
  const[showResetCards,setShowResetCards]=useState(false);
  const[resetQuery,setResetQuery]=useState("");
  const{venueSeen,lastSweep,freshWhy,recordSweep}=useSweepLog(); // FIRST: its opening read is the first thing the page reads from its store
  const[confirmBox,setConfirmBox]=useState(null); // {text, act} for confirm-before-replace
  const list=useFilters();
  const{filters,sort,bnOnly,periodView,venueScrub,viewToken,showSearch,searchRef,sortBy,dateReversed,refreshTouched,pinTouched,toggleSet,clearFilters,pickSort,toggleSearchBox,typeSearch,clearSearchText,toggleAcqWanted,toggleAcqOwned,toggleBuyNextView,toggleAcq3mo,toggleAcq6mo,toggleAcqHasCat,toggleAcqNoCat,toggleAcqDigital,toggleWatchedOnly,toggleDismissedOnly,toggleLabelledOnly,toggleShowAll,searchFor,ledgerLoaded,importApplied}=list;
  const{venueF,themeF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqHasCat,acqNoCat,acqDigital,acqBuyNext,bnPeriod,bnDate,showAll,dismissedOnly,labelledF,watchedF,search}=filters;
  // The ledger as a document (the hook: app/screens/use_ledger_document.jsx). Called after the sweep log and the
  // filters and before the import session below, so the store's reads keep their order.
  const doc=useLedgerDocument({showError:setError,showDiagnostic:setDebug,ask:setConfirmBox,onLoaded:ledgerLoaded});
  const{rows,loaded,hasLedger,readOnly,ignored,ignoredByVenue,quarWhy,cloudLive,cloudCheck,cloudStatus,savedText,saveNote,refreshDone,unconfirmedSave,showUnsavedBanner,
    showSave,saveLabel,saveCloud,saveBusy,showSnaps,snaps,snapWhy,snapBusy,fileRef,
    commit,put,latest,readOnlyStop:roStop,releaseFromQuarantine,addToQuarantine,
    requestImport,handleImport,requestOpenCloud,requestReset,handleSave,toggleSavePanel,closeSavePanel,typeSaveLabel,chooseSaveCloud,
    toggleCloudSaves,requestRollback,downloadSnapshot,dismissCloudCheck}=doc;
  // A row from an occasional venue this page's store has not met still files
  // under a venue — see registerUnseenOccasional. Idempotent; costs a loop.
  registerUnseenOccasional(rows);
  // The link venues (the hook: app/screens/use_link_venues.jsx). Called after the ledger document and before the
  // import session below, so the venues are still read after the cloud copy and before the pending links.
  const linkVenues=useLinkVenues(rows);
  const{occVenues,hold,dropHeld,confirmShop,noShop,addShop,toConfirm,fillShopSearch}=linkVenues;
  // The jobs and marks on one card (the hook: app/screens/use_card_actions.jsx). Called after the link venues (it is
  // handed fillShopSearch) and before the Buy next drag (it is handed moveBuyNext). The job flag stays here, shared
  // with the import's Read; the hook gets it as named things.
  const jobStarts=()=>setBusy(true), jobEnds=()=>setBusy(false), showProgress=p=>setProg(p);
  const{cardState,cardAct,labelSaid,labelLedger,undo,undoDismiss,moveBuyNext,forgetSaid}=useCardActions({rows,commit,put,latest,readOnlyStop:roStop,
    jobRunning:busy,jobStarts,jobEnds,showProgress,showError:setError,showDiagnostic:setDebug,shownIds:()=>view.map(r=>r.id),fillShopSearch});
  // Words selected anywhere on the page (her design): a button beside them searches them, exactly as typed.
  const[selPick,setSelPick]=useState(null);
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

  // The import session (the hook: app/screens/use_import_session.jsx): the pop-up, the review and the shop screen.
  // Called here, where the opening effect sat, so its reads (the pending links, pages, pastes) are still the last.
  const{reviewSaid,importMode,shopScreen,shopLooking,shopAdding,linkNote,linkText,linkFails,pages,pastes,pagesFileRef,refreshFileRef,proposals,coverage,tally,decisions,
    handleRefreshFile,readLinks,pickPages,addShopFor,lookAgain,venuesToConfirm,proceedRefresh,setCardMode,setChoice,setFieldDec,applyRefresh,cancelRefresh,
    openImportChoice,openCloudFromImport,loadFromImport,chooseCsvImport,pickImportTab,typeLinkText,clearLinkText,typeInPasteBox,clearPasteBox,clearAllPasteBoxes,addPasteBox,clearPages,cancelImportPopup,askPartialApply,toggleShopAdd,typeShopLink,closeShopAdd,backFromShop}=useImportSession({
    rows,ignored,hasLedger,commit,addToQuarantine,documentImportApplied:doc.importApplied,readOnlyStop:roStop,requestImport,requestOpenCloud,recordSweep,filtersImportApplied:importApplied,
    occVenues,hold,dropHeld,addShop,venuesLookAgain:linkVenues.lookAgain,toConfirm,venuesImportApplied:linkVenues.importApplied,jobStarts,jobEnds,showProgress,showError:setError,ask:setConfirmBox});

  // ── DRAG TO REORDER, BUY NEXT ONLY ── (the hook: app/screens/use_buy_next_drag.jsx)
  const{drag,startDrag}=useBuyNextDrag(dragOn,moveBuyNext);

  // One artist, one group: worked out from every labelled show, dismissed ones included.
  const byArtist=useMemo(()=>artistPeriods(rows),[rows]);
  const view=useMemo(()=>listView(rows,filters,sort,byArtist),[rows,byArtist,sortBy,filters,pinTouched,refreshTouched,dateReversed]);

  // The scrubber's periods: the view's groups in order, each with its first card's place.
  const scrubGroups=useMemo(()=>periodView?scrubGroupsOf(view,periodView,byArtist):venueScrubGroupsOf(view,venueScrub),[view,periodView,byArtist,venueScrub]);
  const themeCount=useMemo(()=>themeCounts(rows,filters,sort,byArtist),[rows,byArtist,sortBy,filters,pinTouched,refreshTouched,dateReversed]);
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


  // What the layout pieces call, each by a name that says what it does. The bodies are the ones the
  // buttons carried inline: the screen's own setters stay here.
  const toggleResetCards=()=>{if(showResetCards)setResetQuery("");setShowResetCards(v=>!v);};
  const toggleQuarantine=()=>setShowIgnored(v=>!v);
  const typeResetQuery=v=>setResetQuery(v);
  const askResetCard=id=>setConfirmBox({title:W.resetThisSearch,yes:W.yes,act:()=>{
    commit(resetOneCard(rows,id));
    forgetSaid(id);
    setResetQuery("");}});
  const dismissConfirm=()=>setConfirmBox(null);
  const answerConfirm=()=>{const a=confirmBox.act;setConfirmBox(null);a&&a();};

  if(!loaded)return(<div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.soft,minHeight:"100vh",display:"grid",placeItems:"center",fontSize:13}}>{W.openingLedger}</div>);

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
        <ThemeRow ui={ui} filters={filters} toggleSet={toggleSet} themeCount={themeCount}/>
        <AcquiringRow ui={ui} filters={filters} toggleAcqWanted={toggleAcqWanted} toggleAcqOwned={toggleAcqOwned} toggleBuyNextView={toggleBuyNextView} toggleAcq3mo={toggleAcq3mo} toggleAcq6mo={toggleAcq6mo} toggleAcqHasCat={toggleAcqHasCat} toggleAcqNoCat={toggleAcqNoCat} toggleAcqDigital={toggleAcqDigital}/>
        <ShowingRow ui={ui} filters={filters} toggleWatchedOnly={toggleWatchedOnly} toggleDismissedOnly={toggleDismissedOnly} toggleLabelledOnly={toggleLabelledOnly} toggleShowAll={toggleShowAll} clearFilters={clearFilters}/>
      </div>

      <CardList ui={ui} view={view} sort={sort} bnOnly={bnOnly} periodView={periodView} venueScrub={venueScrub} byArtist={byArtist} drawLimit={drawLimit} cardState={cardState} dragOn={dragOn} drag={drag} startDrag={startDrag} cardAct={cardAct} moreRef={moreRef}/>
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
        <ImportCsvStatus ui={ui} importMode={importMode} busy={busy} prog={prog}/>
        <ImportLinks ui={ui} importMode={importMode} busy={busy} linkText={linkText} typeLinkText={typeLinkText} clearLinkText={clearLinkText} readLinks={readLinks} prog={prog} linkNote={linkNote} linkFails={linkFails}/>
      </ImportPopup>
      <ReviewPanel ui={ui} proposals={proposals} reviewSaid={reviewSaid} tally={tally} coverage={coverage} decisions={decisions} setFieldDec={setFieldDec} setCardMode={setCardMode} setChoice={setChoice} cancelRefresh={cancelRefresh} askPartialApply={askPartialApply} proceedRefresh={proceedRefresh} venuesToConfirm={venuesToConfirm}/>
      {/* The shop screen (her design): one card per new venue with an unconfirmed shop;
          the ledger moves only when every card is answered. Over the review (1100),
          under the confirm box (1200). */}
      {shopScreen&&proposals&&<ShopScreen ui={ui} shopScreen={shopScreen} occVenues={occVenues} shopLooking={shopLooking} shopAdding={shopAdding} confirmShop={confirmShop} lookAgain={lookAgain} noShopFor={noShop} addShopFor={addShopFor} toggleShopAdd={toggleShopAdd} typeShopLink={typeShopLink} closeShopAdd={closeShopAdd} backFromShop={backFromShop} applyRefresh={applyRefresh}/>}
      <ConfirmBox ui={ui} confirmBox={confirmBox} dismissConfirm={dismissConfirm} answerConfirm={answerConfirm}/>
      <Footer ui={ui}/>
    </div>
  );
}
