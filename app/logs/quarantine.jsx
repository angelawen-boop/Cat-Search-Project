//@ The quarantine: shows set aside, and why.
//@piece QUARANTINE_DOC


// ── QUARANTINE — in the page's store AND her export (docs/app.md §4) ────────
// It is her judgement, derivable from nothing, so it cannot live only in the store;
// in the ledger alone, a Reset brings the junk back. Latest decision wins, which needs
// tombstones: a release is stored as `released`, or an older backup would re-block it.
const QUARANTINE_DOC = "quarantine/rows";
//@piece quarantineDates

// A quarantined show's dates, only where it has both: an entry without them stays exactly as
// older files and builds wrote it.
const quarantineDates=x=>x&&x.startDate&&x.endDate?{startDate:x.startDate,endDate:x.endDate}:{};
//@piece mergeQuarantine


// Both sides are {key: {venueId, title, startDate?, endDate?, at, state}}. Nothing is dropped
// and nothing is invented: for each key the entry with the LATER `at` survives, whichever
// side it came from; the show's dates, if only one side has them, are kept.
function mergeQuarantine(prev, incoming){
  const out={...(prev||{})};
  for(const [k,v] of Object.entries(incoming||{})){
    if(!v||!v.at) continue;
    const was=out[k];
    const keep=(w,o)=>({...w,...quarantineDates(w.startDate?w:o||{})});
    out[k]=(!was||!was.at||v.at>was.at)?keep(v,was):keep(was,v);
  }
  return out;
}
//@piece activeQuarantine

// What she sees and what the export carries: the ones still blocked, newest
// first. Tombstones never leave this file.
function activeQuarantine(map){
  return Object.entries(map||{})
    .filter(([,v])=>v&&v.state!=="released")
    .map(([key,v])=>({key,venueId:v.venueId,title:v.title,...quarantineDates(v),at:v.at}))
    .sort((a,b)=>String(b.at||"").localeCompare(String(a.at||"")));
}
//@piece quarantineFromList

// A ledger file stores the plain list it always did, so an older backup loads
// unchanged and a newer one is readable by an older build.
function quarantineFromList(list){
  const out={};
  for(const x of (list||[])) if(x&&x.key) out[x.key]={venueId:x.venueId,title:x.title,...quarantineDates(x),at:x.at||"",state:"blocked"};
  return out;
}
//@piece readQuarantine


async function readQuarantine(){
  try{
    const snap=await storeRead(QUARANTINE_DOC,{part:UNREAD_QUAR});
    if(!snap.exists) return {map:{},why:null};
    const d=snap.data||{};
    return {map:(d.rows&&typeof d.rows==="object")?d.rows:{},why:null};
  }catch(e){
    const code=String((e&&e.code)||"");
    if(code==="no_store") return {map:{},why:W.quarantineUnreachable};
    if(code==="not_granted") return {map:{},why:W.quarantineDeclined};
    return {map:{},why:say(W.quarantineUnreadCode,{code:code||"unknown"})};
  }
}
//@piece writeQuarantine


async function writeQuarantine(next){
  try{ await storeWrite(QUARANTINE_DOC,{rows:next,updatedAt:new Date().toISOString()},{part:UNREAD_QUAR}); return true; }
  catch{ return false; }
}
