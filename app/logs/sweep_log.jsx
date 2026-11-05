//@ The sweep log (freshness per venue).
//@piece mergeSweepLog


// Merge, never replace: a venue's dates move only for a LATER time, so an old sweep
// file cannot drag them backwards. Tried and brought-rows move independently.
function mergeSweepLog(prev,seen){
  const out={...(prev||{})};
  const later=(a,b)=>(!a||(b&&b>a))?b:a;
  for(const v of Object.keys((seen&&seen.attempted)||{})){
    const was=out[v]||{};
    out[v]={
      attempted: later(was.attempted, seen.attempted[v]),
      returned:  later(was.returned,  (seen.returned||{})[v]||null),
    };
  }
  return out;
}
//@piece SWEEP_LOG_DOC



// ── THE SWEEP LOG — in the page's store, outside the ledger (docs/app.md §5) ──
// A fact about the world must not roll back with a backup. One line per venue, never
// growing; it survives Reset. A cache, not a master record: any sweep file rebuilds it.
const SWEEP_LOG_DOC = "sweeps/venues";
//@piece readSweepLog


// Returns {log, why} — `why` is null on success and a sentence otherwise. The
// drawer prints it rather than showing an empty panel, because "no sweeps yet"
// and "could not reach the store" look identical and mean opposite things.
async function readSweepLog(){
  try{
    const snap=await storeRead(SWEEP_LOG_DOC,{part:UNREAD_SWEEPS});
    if(!snap.exists) return {log:{},why:null};
    const d=snap.data||{};
    const log=(d.venues&&typeof d.venues==="object")?d.venues:{};
    return {log,why:null};
  }catch(e){
    const code=String((e&&e.code)||"");
    if(code==="no_store") return {log:{},why:"This page can\u2019t reach its sweep log in this viewer."};
    if(code==="not_granted") return {log:{},why:"You declined this page access to its sweep log."};
    return {log:{},why:"Couldn\u2019t read the sweep log ("+(code||"unknown")+")."};
  }
}
//@piece writeSweepLog


async function writeSweepLog(next){
  try{ await storeWrite(SWEEP_LOG_DOC,{venues:next,updatedAt:new Date().toISOString()},{part:UNREAD_SWEEPS}); return true; }
  catch{ return false; }
}
