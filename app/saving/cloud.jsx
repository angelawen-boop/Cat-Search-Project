//@ The cloud ledger: live copy, safety copies, the one-tab claim.
//@piece CLOUD_LIVE_DOC


// ── THE CLOUD LEDGER — storage ────────────────────────────────────────────────
// Her design (docs/cloud_storage.md; screen docs/app.md §9): the LIVE LEDGER, saved after every
// change, and SNAPSHOTS ("Cloud Saves"), never overwritten or pruned. Parts are written
// under a new name and the live record switched last, so a cut-off save leaves the last
// complete ledger; every piece is fingerprinted (sha-256) and a mismatch is refused.
// Out of the component so fixtures drive it against a stand-in store (cloud_ledger.js).
const CLOUD_LIVE_DOC="ledger/live";
//@piece CLOUD_PARTS

const CLOUD_PARTS="ledgerParts";
//@piece SNAP_COLL

const SNAP_COLL="snapshots";
//@piece SNAP_PARTS

const SNAP_PARTS="snapshotParts";
//@piece CLOUD_PART_CHARS

// Characters of compressed text per part. The store's cap is 256 KiB per
// document; this leaves room for the field names and a margin.
const CLOUD_PART_CHARS=180000;
//@piece CLOUD_OPENS

// false = save and snapshot, but never open from the cloud by itself; she Loads her file
// (her decision).
const CLOUD_OPENS=false;
//@piece cloudGzip


async function cloudGzip(text){
  const bytes=new TextEncoder().encode(text);
  const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf=new Uint8Array(await new Response(stream).arrayBuffer());
  let bin=""; for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));
  return btoa(bin);
}
//@piece cloudGunzip

async function cloudGunzip(b64){
  const bin=atob(b64); const buf=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}
//@piece cloudSha

async function cloudSha(text){
  const h=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)));
  return Array.from(h,b=>b.toString(16).padStart(2,"0")).join("");
}
//@piece cloudNewId

function cloudNewId(prefix){ return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
//@piece cloudWriteParts


// Writes `text` as parts `<coll>/<id>-0 … -n`. Returns what the reader needs.
async function cloudWriteParts(coll,id,text){
  const z=await cloudGzip(text);
  const parts=Math.max(1,Math.ceil(z.length/CLOUD_PART_CHARS));
  for(let i=0;i<parts;i++){
    await storeWrite(coll+"/"+id+"-"+i,{z:z.slice(i*CLOUD_PART_CHARS,(i+1)*CLOUD_PART_CHARS),i,of:parts});
  }
  return {id,parts,sha:await cloudSha(text),bytes:text.length,zbytes:z.length};
}
//@piece cloudReadParts

async function cloudReadParts(coll,meta){
  let z="";
  for(let i=0;i<meta.parts;i++){
    const snap=await storeRead(coll+"/"+meta.id+"-"+i);
    if(!snap.exists)throw {code:"missing_part",message:"Part "+(i+1)+" of "+meta.parts+" is missing."};
    z+=String((snap.data||{}).z||"");
  }
  const text=await cloudGunzip(z);
  if(await cloudSha(text)!==meta.sha)throw {code:"fingerprint",message:"The copy doesn’t match its fingerprint, so it was not used."};
  return text;
}
//@piece cloudDeleteParts

async function cloudDeleteParts(coll,id,parts){
  for(let i=0;i<parts;i++){ try{ await storeDelete(coll+"/"+id+"-"+i); }catch{} }
}
//@piece cloudSaveLive


// THE LIVE LEDGER. `prev` is the record this page last wrote or read, so the
// old parts can be removed once the switch has moved; a save never reads
// first, which keeps it to the writes it actually needs.
async function cloudSaveLive(text,info,prev){
  const w=await cloudWriteParts(CLOUD_PARTS,cloudNewId("g"),text);
  const rec={...w,savedAt:new Date().toISOString(),rows:info.rows,quarantined:info.quarantined};
  await storeWrite(CLOUD_LIVE_DOC,rec);      // THE SWITCH — only after every part landed
  if(prev&&prev.id&&prev.id!==rec.id)await cloudDeleteParts(CLOUD_PARTS,prev.id,prev.parts);
  return rec;
}
//@piece cloudReadLive

// {rec:null} when nothing has ever been saved; throws when something is there
// and cannot be trusted.
async function cloudReadLive(){
  const snap=await storeRead(CLOUD_LIVE_DOC);
  if(!snap.exists)return {rec:null,text:null};
  const rec=snap.data;
  return {rec,text:await cloudReadParts(CLOUD_PARTS,rec)};
}
//@piece cloudTakeSnapshot


// Snapshots: parts first, the listing record last, so a half-written one never appears.
// A Save's copy carries the offline file's name and moment (her decision).
async function cloudTakeSnapshot(text,info){
  const w=await cloudWriteParts(SNAP_PARTS,cloudNewId("s"),text);
  const rec={...w,at:info.at||new Date().toISOString(),label:String(info.label||"").slice(0,80),
             kind:info.kind||"manual",rows:info.rows,quarantined:info.quarantined};
  if(info.filename)rec.filename=String(info.filename);
  await storeWrite(SNAP_COLL+"/"+w.id,rec);
  return rec;
}
//@piece cloudListSnapshots

async function cloudListSnapshots(n){
  return (await storeList(SNAP_COLL,{by:"at",dir:"desc",limit:n||1000})).map(d=>d.data);
}
//@piece cloudReadSnapshot

async function cloudReadSnapshot(rec){ return cloudReadParts(SNAP_PARTS,rec); }
//@piece ledgerFingerprintText


// WHAT COUNTS AS THE SAME LEDGER. Exhibitions compared by id with their keys
// in a fixed order, and the quarantine list as a set. `lastRun` and the export
// stamps are left out: they say when a file was made, not what is in it.
function ledgerFingerprintText(d){
  const canon=v=>Array.isArray(v)?v.map(canon):(v&&typeof v==="object")?Object.keys(v).sort().reduce((o,k)=>{o[k]=canon(v[k]);return o;},{}):v;
  const rows=(d&&Array.isArray(d.rows)?d.rows:[]).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const ign=(d&&Array.isArray(d.ignored)?d.ignored:[]).map(x=>JSON.stringify(canon(x))).sort();
  return JSON.stringify({rows:canon(rows),ignored:ign});
}
//@piece ledgerDifference

// How two ledgers differ, in words she can act on. Null when they are the same.
function ledgerDifference(a,b){
  if(ledgerFingerprintText(a)===ledgerFingerprintText(b))return null;
  const byId=d=>new Map((d.rows||[]).map(r=>[String(r.id),JSON.stringify(Object.keys(r).sort().map(k=>[k,r[k]]))]));
  const A=byId(a),B=byId(b);
  let onlyA=0,onlyB=0,changed=0;
  for(const [k,v] of A){ if(!B.has(k))onlyA++; else if(B.get(k)!==v)changed++; }
  for(const k of B.keys()) if(!A.has(k))onlyB++;
  const qa=(a.ignored||[]).length,qb=(b.ignored||[]).length;
  // Quarantine entries that differ, counted by key: in one list only, or in
  // both but not identical. One count, so her sentence can add them up.
  const byKey=l=>new Map((l||[]).map(x=>[String(x&&x.key),JSON.stringify(x)]));
  const QA=byKey(a.ignored),QB=byKey(b.ignored);
  let qDiff=0;
  for(const [k,v] of QA){ if(QB.get(k)!==v)qDiff++; }
  for(const k of QB.keys()) if(!QA.has(k))qDiff++;
  return {onlyA,onlyB,changed,quarantineDiffers:ledgerFingerprintText({ignored:a.ignored})!==ledgerFingerprintText({ignored:b.ignored}),qa,qb,qDiff};
}
//@piece cloudTrouble

// Every failure that has its own fix gets its own sentence (mcpTrouble's rule).
function cloudTrouble(e,verb){
  const code=String((e&&e.code)||"");
  const act=verb==="read"?"read":"save to";
  if(code==="not_granted")        return "You declined this page access to its store.";
  if(code==="quota_exceeded")     return "The page’s store is full ("+String((e&&e.message)||"")+").";
  if(code==="resource_exhausted") return "Too many saves in a row just now — it will try again on your next change.";
  if(code==="revoked")            return "This page lost access to its store while open. Reload the page.";
  if(code==="missing_part"||code==="fingerprint") return String(e.message);
  return "Couldn’t "+act+" the cloud copy ("+(code||String((e&&e.message)||e||"unknown"))+").";
}
//@piece CLOUD_SESSION_DOC

// ONE COPY EDITS AT A TIME (her decision; TC-001–010). The copy that opens while another
// edits is READ ONLY until reloaded. Each editing copy beats its id into one record every
// SESSION_BEAT_MS; a record older than SESSION_STALE_MS is a closed copy, taken over.
// Every save checks the record first, so a copy waking from sleep never overwrites it.
const CLOUD_SESSION_DOC="ledger/session";
//@piece RO_LINE

const RO_LINE="Read only — Art Watch is open in another tab or device. Close it there, then reload this one.";
//@piece SESSION_BEAT_MS

const SESSION_BEAT_MS=20000;
//@piece SESSION_STALE_MS

const SESSION_STALE_MS=60000;
//@piece CLOUD_SESSION_ID

const CLOUD_SESSION_ID=cloudNewId("t");
//@piece cloudSessionClaim

// "mine": this copy may edit (the record now names it). "other": another copy
// is editing. Reads the record, then writes it — so it is also the heartbeat. The one write a
// read-only copy may make (claim:true). Throws when the store cannot be reached.
async function cloudSessionClaim(now){
  const t=now||Date.now();
  let cur=null;
  try{ const snap=await storeRead(CLOUD_SESSION_DOC); cur=snap.exists?snap.data:null; }catch{}
  if(cur&&cur.id!==CLOUD_SESSION_ID&&t-Date.parse(cur.beat)<SESSION_STALE_MS)return "other";
  await storeWrite(CLOUD_SESSION_DOC,{id:CLOUD_SESSION_ID,beat:new Date(t).toISOString()},{claim:true});
  return "mine";
}
