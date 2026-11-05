//@ The quarantine: shows set aside, and why.
//@piece QUARANTINE_DOC


// ── QUARANTINE — in the page's store AND her export (docs/app.md §4) ────────
// It is her judgement, derivable from nothing, so it cannot live only in the store;
// in the ledger alone, a Reset brings the junk back. Latest decision wins, which needs
// tombstones: a release is stored as `released`, or an older backup would re-block it.
const QUARANTINE_DOC = "quarantine/rows";
//@piece mergeQuarantine


// Both sides are {key: {venueId, title, at, state}}. Nothing is dropped and
// nothing is invented: for each key the entry with the LATER `at` survives,
// whichever side it came from.
function mergeQuarantine(prev, incoming){
  const out={...(prev||{})};
  for(const [k,v] of Object.entries(incoming||{})){
    if(!v||!v.at) continue;
    const was=out[k];
    if(!was||!was.at||v.at>was.at) out[k]={...v};
  }
  return out;
}
//@piece activeQuarantine

// What she sees and what the export carries: the ones still blocked, newest
// first. Tombstones never leave this file.
function activeQuarantine(map){
  return Object.entries(map||{})
    .filter(([,v])=>v&&v.state!=="released")
    .map(([key,v])=>({key,venueId:v.venueId,title:v.title,at:v.at}))
    .sort((a,b)=>String(b.at||"").localeCompare(String(a.at||"")));
}
//@piece quarantineFromList

// A ledger file stores the plain list it always did, so an older backup loads
// unchanged and a newer one is readable by an older build.
function quarantineFromList(list){
  const out={};
  for(const x of (list||[])) if(x&&x.key) out[x.key]={venueId:x.venueId,title:x.title,at:x.at||"",state:"blocked"};
  return out;
}
//@piece readQuarantine


async function readQuarantine(){
  const db=await useCap("db");
  if(!db){ markUnread(UNREAD_QUAR); return {map:{},why:"This page can\u2019t reach its quarantine list in this viewer, so nothing is being blocked."}; }
  try{
    const snap=await db.doc(QUARANTINE_DOC).get();
    if(!snap.exists) return {map:{},why:null};
    const d=snap.data()||{};
    return {map:(d.rows&&typeof d.rows==="object")?d.rows:{},why:null};
  }catch(e){
    markUnread(UNREAD_QUAR);
    const code=String((e&&e.code)||"");
    if(code==="not_granted") return {map:{},why:"You declined this page access to its quarantine list."};
    return {map:{},why:"Couldn\u2019t read the quarantine list ("+(code||"unknown")+")."};
  }
}
//@piece writeQuarantine


async function writeQuarantine(next){
  if(STORE_UNREAD.has(UNREAD_QUAR))return false;
  const db=await useCap("db");
  if(!db) return false;
  try{ await db.doc(QUARANTINE_DOC).set({rows:next,updatedAt:new Date().toISOString()}); return true; }
  catch{ return false; }
}
