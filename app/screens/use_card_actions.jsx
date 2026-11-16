//@ The jobs and marks on one card: which card is busy and its progress line, Label, Relabel, keep-period, Find catalogue, Re-check, the marks and their undo, the Digital box, which cards are open, and the one cardAct the cards call.
//@piece useCardActions

// The card actions (docs/restructure.md, run C5). The screen hands in, by name, the document's rows and actions, the
// one job flag (whether a job is running, "a job starts", "a job ends", "show this progress" — shared with the
// import's Read, so it stays in the screen), the error line, the diagnostic, the cards' shown order (for the Buy
// next move) and the link venues' fillShopSearch; it hands back ONE object, and no raw setter leaves it.
function useCardActions({rows,commit,put,latest,readOnlyStop:roStop,jobRunning,jobStarts,jobEnds,showProgress,showError,showDiagnostic,shownIds,fillShopSearch}){
  const[busyId,setBusyId]=useState(null);
  const[lookLabel,setLookLabel]=useState(null); // the progress line while a lookup or Re-check runs (lookupLabel)
  const[labelSaid,setLabelSaid]=useState(null);   // the last Label run's line
  const[relabelId,setRelabelId]=useState(null);   // the card a Relabel is asking about
  const[digitalBox,setDigitalBox]=useState(null);  // the card whose Digital catalogue box is open
  const[rechecking,setRechecking]=useState(false);   // which of the card's two buttons is running
  const[recheckSaid,setRecheckSaid]=useState(null);  // {id,text,failed}: Re-check's answer, shown on that card
  const[openCards,setOpenCards]=useState({});
  const[undo,setUndo]=useState(null);
  const undoTimer=useRef(null);
  // Label (labelLedgerStart, labelLedgerJob): the screen is busy, shows its progress and puts
  // the labels onto the rows as they stand when the answer arrives.
  async function labelLedger(){
    if(jobRunning||roStop())return;
    const start=labelLedgerStart(rows);
    if(start.said){ setLabelSaid(start.said); return; }
    jobStarts(); setLabelSaid(null);
    const out=await labelLedgerJob(start.todo,showProgress);
    if(out.labels){ put(prev=>labelsOntoRows(prev,out.labels)); }
    setLabelSaid(out.said);
    showDiagnostic(out.debug);
    jobEnds(); showProgress({done:0,total:0,label:""});
  }

  // Relabel (relabelJob): what it says shows in that card's drawer.
  async function relabel(id){
    const r=rows.find(x=>x.id===id);
    if(!r||jobRunning||relabelId||roStop())return;
    setRelabelId(id); setRecheckSaid(null);
    const out=await relabelJob(r,latest);
    if(out.rows){ put(out.rows); }
    setRecheckSaid(out.said); setRelabelId(null);
  }

  function keepPeriod(id){
    const r=rows.find(x=>x.id===id); if(!r||roStop())return;
    commit(markKeepPeriod(rows,id,new Date().toISOString()));
    setRecheckSaid(keptPeriodSaid(id,r));
  }
  // The lookup runs at top level (lookupCatalogue); the page hands it its progress
  // line and, for an occasional venue, the check that works out its shop search.
  // (fillShopSearch: the link venues' action, useLinkVenues.)
  const lookHooks={label:setLookLabel,prepareShop:fillShopSearch};
  // Find catalogue / Search again (findCatalogueJob): what it found lands on the ledger as it
  // stands when the answer arrives; its line goes on the card, or its sentence in the banner.
  async function findOneCat(id){
    if(roStop())return;
    jobStarts();setBusyId(id);showError(null);setRecheckSaid(null);
    const row=rows.find(r=>r.id===id);
    const out=await findCatalogueJob(row,lookHooks,latest);
    showDiagnostic(out.detail);
    if(out.card)setRecheckSaid(out.card);
    if(out.rows)await commit(out.rows);
    if(out.banner)showError(out.banner);
    jobEnds();setBusyId(null);setLookLabel(null);
  }

  // "Re-check museum shop" (recheckShopJob): its answer is printed on the card, under the button she pressed.
  async function recheckShop(id){
    if(roStop())return;
    jobStarts();setBusyId(id);setRechecking(true);showError(null);setRecheckSaid(null);
    const found=rows.find(r=>r.id===id);
    const out=await recheckShopJob(found,lookHooks,latest);
    showDiagnostic(out.detail);
    if(out.rows)await commit(out.rows);
    setRecheckSaid(out.card);
    jobEnds();setBusyId(null);setRechecking(false);setLookLabel(null);
  }

  const dismiss=id=>{commit(markDismiss(rows,id));if(undoTimer.current)clearTimeout(undoTimer.current);setUndo({id});undoTimer.current=setTimeout(()=>setUndo(null),10000);};
  const undoDismiss=()=>{if(!undo)return;commit(markRestore(rows,undo.id));setUndo(null);if(undoTimer.current)clearTimeout(undoTimer.current);};
  const restore=id=>commit(markRestore(rows,id));
  const toggleWatch=id=>commit(markWatch(rows,id));
  const setAcq=(id,v)=>commit(markAcquiring(rows,id,v));
  const toggleBuyNext=id=>commit(markBuyNext(rows,id));
  const moveBuyNext=(id,beforeId,afterId)=>commit(markBuyNextMove(rows,id,beforeId,afterId,shownIds()));
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
  // Reset-a-card (in the screen) forgets what the last job said on that card.
  const forgetSaid=id=>{if(recheckSaid&&recheckSaid.id===id)setRecheckSaid(null);};
  return{cardState:{busyId,busy:jobRunning,rechecking,lookLabel,recheckSaid,relabelId,digitalBox,openCards},cardAct,labelSaid,labelLedger,undo,undoDismiss,moveBuyNext,forgetSaid};
}
