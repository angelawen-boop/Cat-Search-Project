//@ The cloud ledger's jobs, which the screen calls and shows: Save now, the automatic save, the check and safety copy before Load or Reset, Cloud Saves (listing, roll-back, download), the one-tab claim and heartbeat, and their sentences.
//@piece cloudTracker


// THE CLOUD LEDGER'S JOBS. Each takes what it needs and hands back what happened and the
// sentence to show (or tells its progress through a callback); the screen puts it on screen.
// What this page knows of the live ledger, kept for the page load and handed to every job: the
// live record this page last wrote or read (prev), the fingerprint of what that record holds (fp),
// and the save under way — one at a time (busy) — and a change during one, which queues another (again).
function cloudTracker(){ return {prev:null,fp:null,busy:false,again:false}; }
//@piece cloudGoReadOnly

// This copy is read only for the rest of the page load: the store's door refuses its writes.
function cloudGoReadOnly(){ cloudReadOnly=true; }
//@piece cloudOtherEditing

// The one-tab claim, on open, at every beat and before every save: true when another copy is
// editing (this copy is then read only). A claim that fails decides nothing.
async function cloudOtherEditing(){
  try{ if(await cloudSessionClaim()==="other"){ cloudGoReadOnly(); return true; } }catch{}
  return false;
}
//@piece cloudHeartbeat

// THE HEARTBEAT: the editing copy claims again every SESSION_BEAT_MS. True when another copy
// has taken over.
async function cloudHeartbeat(){
  if(cloudReadOnly)return false;
  return cloudOtherEditing();
}
//@piece cloudLetGo

// Letting go on the way out (best effort — a closing page
// may not finish it; the record then goes stale in SESSION_STALE_MS).
async function cloudLetGo(){
  if(cloudReadOnly)return;
  try{ const snap=await storeRead(CLOUD_SESSION_DOC); if(snap.exists&&(snap.data||{}).id===CLOUD_SESSION_ID)await storeDelete(CLOUD_SESSION_DOC,{claim:true}); }catch{}
}
//@piece cloudOpenRead

// The cloud copy, read on open. Hands back `live` for the readout ({rec,data} / {rec:null} /
// {why}); `off`, why nothing is being saved; `open` when the page opens it by itself (CLOUD_OPENS).
async function cloudOpenRead(tr){
  if(!await storeReached())return {live:{why:"This viewer can’t reach the page’s store."},off:"This viewer can’t reach the page’s store, so nothing is being saved to the cloud copy."};
  try{
    const {rec,text}=await cloudReadLive();
    if(!rec)return {live:{rec:null}};
    const data=JSON.parse(text);
    tr.prev=rec; tr.fp=ledgerFingerprintText(data);
    // A read-only copy opens nothing by itself (her decision); "Open it" shows the
    // cloud copy on request.
    return {live:{rec,data},rec,data,open:CLOUD_OPENS&&!cloudReadOnly};
  }catch(e){ return {live:{why:cloudTrouble(e,"read")}}; }
}
//@piece cloudSaveLatest

// The save: one at a time; a change mid-save queues one more, which reads the newest
// ledger. Nothing is written when nothing changed. One retry after a short pause; a
// second failure is reported, never swallowed.
// `latest()` is the ledger as it stands ({rows,ignored,lastRun}); `tell` hears "saving", then
// {saved:rec} for each record written. Hands back null, or {readOnly} (another copy took over),
// {off} or {failed} with the sentence why.
async function cloudSaveLatest(tr,latest,tell){
  if(cloudReadOnly)return null;
  if(tr.busy){ tr.again=true; return null; }
  // Another copy took over while this one slept? Then nothing is written.
  if(await cloudOtherEditing())return {readOnly:true};
  if(!await storeReached())return {off:"This viewer can’t reach the page’s store, so nothing is being saved to the cloud copy."};
  tr.busy=true;
  try{
    do{
      tr.again=false;
      const d=latest();
      const fp=ledgerFingerprintText(d);
      if(fp===tr.fp)continue;
      tell("saving");
      const text=JSON.stringify({rows:d.rows,ignored:d.ignored,lastRun:d.lastRun,savedAt:new Date().toISOString()});
      const info={rows:d.rows.length,quarantined:d.ignored.length};
      let rec;
      try{ rec=await cloudSaveLive(text,info,tr.prev); }
      catch(e){
        if(e&&["invalid_argument","quota_exceeded","not_granted","revoked"].includes(e.code))throw e;
        await new Promise(r=>setTimeout(r,800+Math.random()*700));
        rec=await cloudSaveLive(text,info,tr.prev);
      }
      tr.prev=rec; tr.fp=fp;
      tell({saved:rec});
    }while(tr.again);
  }catch(e){ return {failed:cloudTrouble(e,"save")}; }
  finally{ tr.busy=false; }
  return null;
}
//@piece cloudCheckBeforeReplace

// Before a whole ledger replaces the cloud copy (Load, Reset): the same → said so (the
// trial's check); different → the cloud copy is kept as a safety snapshot first, and if
// that fails nothing is replaced. `incoming` is {rows,ignored}; `reason` "import" or "reset";
// `noted` hears the breakdown for the diagnostic before the snapshot is taken. Hands back `check`,
// the line to show (null for none); `said`, true when that line says what was loaded (then
// "Loaded N exhibitions" is not shown — her decision); `snapped` when a safety copy was taken;
// `failed` when it could not be (the caller stops).
async function cloudCheckBeforeReplace(tr,incoming,reason,noted){
  if(!await storeReached())return {check:null,said:false};
  let live;
  try{ live=await cloudReadLive(); }
  catch(e){ const check="The cloud copy couldn’t be read ("+cloudTrouble(e,"read")+"). It was left in the store untouched; this ledger is saved as the new cloud copy."; tr.prev=null; tr.fp=null; return {check,said:true}; }
  if(!live.rec)return {check:"No cloud copy existed yet — this ledger is now the first one.",said:true};
  const data=JSON.parse(live.text);
  tr.prev=live.rec; tr.fp=ledgerFingerprintText(data);
  const when=localReadable(live.rec.savedAt);
  const diff=ledgerDifference(data,incoming);
  if(!diff)return {check:"✓ The file you just loaded is identical to the last cloud save ("+when+"). No snapshot of the last cloud state was needed before loading your file.",said:true};
  // Her format: one count of differences, the cloud save's time, and what was done;
  // the breakdown goes to the diagnostic.
  const bits=[];
  if(diff.onlyA)bits.push(diff.onlyA+" exhibition"+(diff.onlyA===1?"":"s")+" only in the cloud copy");
  if(diff.onlyB)bits.push(diff.onlyB+" only in "+(reason==="reset"?"the starter set":"this file"));
  if(diff.changed)bits.push(diff.changed+" different in some field");
  if(diff.quarantineDiffers)bits.push(diff.qDiff+" quarantine entr"+(diff.qDiff===1?"y":"ies")+" different ("+diff.qa+" in the cloud copy, "+diff.qb+" here)");
  // Never "0 differences" beside a ledger that does differ.
  const n=Math.max(1,diff.onlyA+diff.onlyB+diff.changed+(diff.quarantineDiffers?diff.qDiff:0));
  const what=reason==="reset"?"The starter set":"The file you just loaded";
  const head=what+" differs from the last cloud save ("+when+"): "+n+" difference"+(n===1?"":"s")+".";
  noted("Compared with the last cloud save ("+when+"): "+bits.join(", ")+".");
  try{
    await cloudTakeSnapshot(live.text,{label:"Safety snapshot before "+(reason==="reset"?"Reset":"Load"),kind:"safety",rows:data.rows.length,quarantined:(data.ignored||[]).length});
    return {check:head+" A snapshot of the last cloud state was taken before loading "+(reason==="reset"?"it":"your file")+".",said:true,snapped:true};
  }catch(e){
    return {check:head+" A snapshot of the last cloud state could NOT be taken ("+cloudTrouble(e,"save")+"), so "+(reason==="reset"?"it":"your file")+" was not loaded.",said:false,failed:e};
  }
}
//@piece cloudOpening

// OPEN THE CLOUD COPY: the ledger it holds, as the screen opens it, and the line to show.
function cloudOpening(tr,rec,data){
  const out={rows:(data.rows||[]).map(r=>({...r,watching:r.watching||false})),lastRun:data.lastRun||null,
    info:"Opened the cloud copy saved "+localReadable(rec.savedAt)+" — "+(data.rows||[]).length+" exhibitions.",
    ignored:Array.isArray(data.ignored)?data.ignored:[]};
  tr.prev=rec; tr.fp=ledgerFingerprintText(data);
  return out;
}
//@piece cloudOpenQuestion

// "Open it" asks first while unsaved work shows and the cloud copy is not saving.
function cloudOpenQuestion(){ return "Opening the cloud copy replaces everything on screen. The cloud copy is NOT saving, so your changes since your last Save are on screen only and will be lost. Continue?"; }
//@piece cloudReadToOpen

// "Open it": the cloud copy read and handed to `open(rec,data)`. Hands back the line to show
// when it cannot be, or null. Allowed in a read-only copy (her decision): it shows the cloud
// copy, writes nothing.
async function cloudReadToOpen(open){
  if(!await storeReached())return null;
  try{
    const {rec,text}=await cloudReadLive();
    if(!rec)return "There is no cloud copy yet.";
    open(rec,JSON.parse(text));
    return null;
  }catch(e){ return "The cloud copy couldn’t be opened: "+cloudTrouble(e,"read"); }
}
//@piece cloudSavesRead

// SNAPSHOTS. Cloud Saves' list, newest first, and why it is empty when it could not be read.
async function cloudSavesRead(){
  if(!await storeReached())return {snaps:[],why:"This viewer can’t reach the page’s store."};
  try{ return {snaps:await cloudListSnapshots(),why:null}; }
  catch(e){ return {snaps:[],why:"Couldn’t read the cloud saves ("+cloudTrouble(e,"read")+")."}; }
}
//@piece cloudRollbackQuestion

// Roll back's question, for Cloud Save `s` among `all`.
function cloudRollbackQuestion(s,all){
  return {title:"Roll back to this cloud save?",
    text:"The ledger becomes the cloud save “"+snapTitle(s,all)+"” from "+localReadable(s.at)+" ("+s.rows+" exhibitions). What you have now is kept in Cloud Saves first, so this can be undone."};
}
//@piece cloudRollback

// Roll back: the ledger it replaces is kept first as a safety snapshot (her decision),
// so a roll-back can be undone; no safety copy, no roll-back.
// `current()` is the ledger open on screen, or null when none is (then the live cloud copy is the
// one kept); `started()` is told once the store is reached and the work begins. Hands back null
// when the store is not reached, {why} when nothing was replaced, or the ledger to open and its line.
async function cloudRollback(tr,s,all,{current,started}){
  if(!await storeReached())return null;
  started();
  try{
    let curText=null,curRows=0,curQ=0;
    const d=current();
    if(d){ curText=JSON.stringify({rows:d.rows,ignored:d.ignored,lastRun:d.lastRun,savedAt:new Date().toISOString()}); curRows=d.rows.length; curQ=d.ignored.length; }
    else{ const live=await cloudReadLive(); if(live.rec){ curText=live.text; const cd=JSON.parse(live.text); curRows=cd.rows.length; curQ=(cd.ignored||[]).length; tr.prev=live.rec; } }
    if(curText)await cloudTakeSnapshot(curText,{label:"Safety snapshot before roll-back to snapshot of "+localReadable(s.at),kind:"safety",rows:curRows,quarantined:curQ});
    const data=JSON.parse(await cloudReadSnapshot(s));
    return {rows:(data.rows||[]).map(r=>({...r,watching:r.watching||false})),lastRun:data.lastRun||null,
      info:"Rolled back to the cloud save “"+snapTitle(s,all)+"” from "+localReadable(s.at)+" — "+(data.rows||[]).length+" exhibitions.",
      ignored:Array.isArray(data.ignored)?data.ignored:[]};
  }catch(e){ return {why:cloudRollbackNotDone(e)}; }
}
//@piece cloudRollbackNotDone

function cloudRollbackNotDone(e){ return "Rollback NOT done — "+cloudTrouble(e,"read")+" Nothing was replaced."; }
//@piece cloudSaveDownload

// Cloud Saves' Download: the copy handed over as a file. Hands back the line to show, or null
// when the store is not reached.
async function cloudSaveDownload(s){
  if(!await storeReached())return null;
  try{
    const text=await cloudReadSnapshot(s);
    // A copy made by Save comes back under the name its offline twin has.
    // Older copies, and the automatic ones, are named as before.
    const slug=labelSlug(s.label);
    const filename=s.filename||("art-watch-snapshot-"+localStamp(s.at)+(slug?"-"+slug:"")+".json");
    const route=await offerFile(filename,JSON.stringify(JSON.parse(text),null,2));
    return route==="runtime"?"Saved "+filename+".":"A download of "+filename+" was started — this viewer can’t confirm it arrived; check your downloads folder.";
  }catch(e){
    const why=e&&e.route==="browser"?"the download couldn’t start"
      :e&&["missing_part","fingerprint"].includes(e.code)?String(e.message)
      :"the save was refused or cancelled ("+String((e&&(e.code||e.message))||e)+")";
    return "Download NOT done — "+why+".";
  }
}
//@piece saveShrinkQuestion

// SAVE ASKS BEFORE IT SHRINKS THE LEDGER: fewer exhibitions on screen than the
// cloud copy or the newest Cloud Save holds (her ledger lost to an import onto an
// empty page; docs/app.md §9). A store that cannot be read never blocks a Save.
// Hands back the question for saving `count` exhibitions ({title,text,yes}), or null.
async function saveShrinkQuestion(count){
  let most=0;
  // The live record alone carries the count; its parts (the whole ledger) are not read.
  if(!cloudReadOnly){ try{ const ls=await storeRead(CLOUD_LIVE_DOC); const live=ls.exists?ls.data:null; const snap=(await cloudListSnapshots(1))[0];
      most=Math.max(live?live.rows||0:0,snap?snap.rows||0:0); }catch{} }
  if(count<most)return {title:"Save a smaller ledger?",text:"You’re saving "+count+" exhibition"+(count===1?"":"s")+"; your last cloud save has "+most+". Save anyway?",yes:"Save anyway"};
  return null;
}
//@piece saveFile

// Save (her design; docs/app.md §2): the offline file AND, when ticked, the same file in
// Cloud Saves — same name and content. The cloud copy is written while the file question
// is open, so a cancelled file cannot take it with it. Each half reports itself; a plain browser download never
// clears the unsaved state. Never a click-triggered "Saved" tick.
// The file: its moment, description, name and text, from the ledger and the description typed.
// {note} when it cannot be built.
function saveFile({rows,ignored,lastRun,typed}){
  const at=new Date().toISOString();
  const label=typed.trim().slice(0,80);
  const slug=labelSlug(label);
  const filename=LEDGER_PREFIX+localStamp(at)+(slug?"-"+slug:"")+".json";
  let data;
  try{
    data=JSON.stringify({rows,ignored,lastRun,exportedAt:at,exportedLocal:localReadable(at),...(label?{label}:{})},null,2);
  }catch(e){ return {note:{ok:false,text:"NOT SAVED — the file couldn’t be built: "+String(e?.message||e)}}; }
  return {rows,ignored,at,label,filename,data};
}
//@piece saveLedger

// Save now: the file from saveFile offered and, when `toCloud`, the same file kept in Cloud
// Saves. `kept()` is told once the cloud copy is kept; `refused(line)` once the file is refused,
// with the diagnostic. Hands back the line to show ({ok,text}), `file` ("saved", "browser" or why
// not), `cloud` (null, true or why not) and `debug`, the diagnostic line.
async function saveLedger(f,toCloud,{kept,refused}){
  const {rows,ignored,at,label,filename,data}=f;
  // cloud: null = not asked for; true = kept; a string = why not. Started, not
  // awaited: the file question opens while the copy is written (her decision).
  const cloudDone=(async()=>{
    if(!toCloud||cloudReadOnly)return null;
    if(!await storeReached())return "this viewer can’t reach the page’s store";
    try{
      await cloudTakeSnapshot(data,{label,kind:"manual",rows:rows.length,quarantined:ignored.length,filename,at});
      kept();
      return true;
    }catch(e){ return cloudTrouble(e,"save"); }
  })();
  // file: "saved" (the viewer confirmed), "browser" (started, cannot be
  // confirmed), or a string saying why it was not saved.
  // Both routes live in offerFile, shared with Cloud Saves' Download.
  let file;
  try{ file=(await offerFile(filename,data))==="runtime"?"saved":"browser"; }
  catch(e){
    file=e&&e.route==="browser"?"the download couldn’t start"
      :e&&e.code==="declined"?"cancelled"
      :"refused ("+String(e?.code||e?.message||e)+")";
    refused("Save: the file was not saved — "+String(e?.code||"")+" "+String(e?.message||e));
  }
  const cloud=await cloudDone;
  const cloudBit=cloud===true?null:cloud===null?"":"Cloud copy NOT kept — "+cloud+".";
  let text,ok;
  if(file==="saved"){
    ok=cloud!==null&&cloud!==true?false:true;
    text=cloud===true?"Local file saved. Extra copy also sent to the cloud."
      :cloud===null?"Local file saved."
      :"Local file saved. "+cloudBit;
  }else if(file==="browser"){
    ok=false;
    text=(cloud===true?"Extra copy sent to the cloud. ":cloud===null?"":cloudBit+" ")
      +"A download of the local file was started — this viewer can’t confirm it arrived; check your downloads folder.";
  }else{
    ok=false;
    text=cloud===true?"Cloud copy kept. Local file not saved - "+file+"."
      :cloud===null?"Local file not saved - "+file+"."
      :"NOTHING SAVED — local file not saved - "+file+". "+cloudBit;
  }
  return {ok,text,file,cloud,
    debug:"Save "+filename+" ("+localReadable(at)+"): file "+(file==="saved"?"confirmed by the viewer":file)+"; cloud "+(cloud===true?"kept":cloud===null?"not asked for":cloud)+"."};
}
//@piece cloudStatusLine

// The cloud readout, never silent (her ask): `trouble` when the cloud copy is not saving —
// then the line says when it last worked (her ask): how far back the cloud copy stands.
function cloudStatusLine({saveState,saveErr,lastSaved,cloudLive,hasLedger}){
  if(saveState==="failed"||saveState==="off")
    return {trouble:true,text:"CLOUD COPY NOT SAVING — "+(saveErr||"reason unknown.")
      +(lastSaved&&lastSaved.savedAt?" Last cloud save: "+localReadable(lastSaved.savedAt)+" ("+relTime(lastSaved.savedAt)+")."
        :" Nothing has been saved to the cloud yet.")
      +(hasLedger?" Changes since then are on screen only — tap Save to keep them in a file.":"")};
  return {trouble:false,text:
    saveState==="saving"?"Saving to the cloud copy…"
    :lastSaved?("Last cloud save: "+localReadable(lastSaved.savedAt)+" ("+relTime(lastSaved.savedAt)+") · "+lastSaved.rows+" exhibitions")
    :cloudLive&&cloudLive.why?("Cloud copy: "+cloudLive.why)
    :cloudLive&&cloudLive.rec===null?"No cloud copy yet — it starts when you open your ledger."
    :"Checking the cloud copy…"};
}
