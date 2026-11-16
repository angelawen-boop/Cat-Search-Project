//@ The sweep log: the freshness record per venue, why it could not be read, its opening read and recording a finished import's sweep.
//@piece useSweepLog

// The page's memory of when each venue was last tried. It reads its own record from the store when the page
// opens (the first read the page makes: App calls it before its opening effect) and hands back the record,
// the latest attempt, the why-line and the action that records a sweep.
function useSweepLog(){
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
  // Read once, not subscribed.
  useEffect(()=>{ readSweepLog().then(({log,why})=>{ setVenueSeen(log); setFreshWhy(why); }); },[]);
  // The sweep log is written when the import FINISHES (her decision: an unfinished
  // import keeps nothing); held in seenInFile until then. A file with nothing to
  // propose is recorded at once. AL-013.
  const recordSweep=(seen)=>{
    if(!seen) return;
    const vs=mergeSweepLog(venueSeen,seen);
    setVenueSeen(vs);
    saveSweepLog(vs).then(setFreshWhy);
  };
  return{venueSeen,lastSweep,freshWhy,recordSweep};
}
