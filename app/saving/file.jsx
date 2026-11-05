//@ Handing her a file (Save, Cloud Saves downloads); save and snapshot names.
//@piece offerFile


// HANDING HER A FILE — the two routes, in order, and what each can know.
//   1. The runtime's own file handoff: asks her, then SAVES or REJECTS.
//      Resolves "runtime"; a rejection throws its own error.
//   2. An ordinary browser download: cannot tell arrived from cancelled.
//      Resolves "browser"; if even starting it fails, throws {route:"browser"}.
// Save's file and Cloud Saves' downloads both come through here.
async function offerFile(filename,data){
  let dl=null;
  try{
    if(typeof window!=="undefined"&&window.claude&&typeof window.claude.use==="function"){
      dl=await window.claude.use("downloads");
    }
  }catch{ dl=null; }   // unavailable is not a failure — fall through to 2.
  if(dl&&typeof dl.save==="function"){ await dl.save({filename,data}); return "runtime"; }
  try{
    const blob=new Blob([data],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    return "browser";
  }catch(e){ throw {route:"browser",cause:e}; }
}
//@piece LEDGER_PREFIX


const LEDGER_PREFIX="art-watch-ledger-";
//@piece labelSlug


// Local 24hr timestamp (browser's timezone), e.g. 2026-08-23-2230 = 10:30pm local.
// A description, as it goes into a file name: lower case, words joined by hyphens.
function labelSlug(label){return String(label||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);}
//@piece snapTitle

// A cloud save's name in the list (her wording): a Save's copy 'Export: "description"';
// a safety copy, its own label. Older labels are renamed on screen, never in the store.
function snapTitle(s,all){
  if(!s)return "";
  if(s.kind!=="safety")return "Export"+(s.label?": \u201c"+s.label+"\u201d":"");
  const l=String(s.label||"");
  // Roll-back copies name the save by its time (her ask; CL-T1–3). Older copies stored
  // only the target's name; its time is read off the one earlier save carrying that name
  // — two or none, the name as before.
  const m=l.match(/^Before rolling back to (.*)$/);
  if(m){
    const was=m[1].replace(/^Cloud copy before /,"Safety snapshot before ");
    const hits=(all||[]).filter(o=>o&&o!==s&&o.at<s.at&&snapTitle(o)===was);
    return hits.length===1?"Safety snapshot before roll-back to snapshot of "+localReadable(hits[0].at)
      :"Safety snapshot before roll-back to \u201c"+was+"\u201d";
  }
  return l.replace(/^Cloud copy before /,"Safety snapshot before ").replace(/^(Safety snapshot before roll-back to )(?!snapshot of )/,"$1snapshot of ")||"Safety snapshot";
}
//@piece loadQuestion

// Confirm-before-replace: Import and Reset can wipe the screen in one tap, so
// they ask first WHENEVER there is unsaved work showing. The question to ask before Loading
// a file, or null when the screen may go straight to the file picker.
function loadQuestion(rowsCount,dirty,cloudNotSaving){
  if(rowsCount>0&&dirty&&cloudNotSaving)return "Loading replaces everything on screen. The cloud copy is NOT saving, so your changes since your last Save are on screen only and will be lost. Continue?";
  return null;
}
//@piece resetQuestion

// Reset to Seed always asks while a ledger is on screen (her decision): the question to ask,
// or null when nothing is on screen and Reset may go straight ahead.
function resetQuestion(rowsCount,dirty,cloudNotSaving){
  if(rowsCount>0&&dirty&&cloudNotSaving)return "This loads the built-in starter set and replaces everything on screen. The cloud copy is NOT saving, so your changes since your last Save are on screen only and will be lost. Continue?";
  if(rowsCount>0)return "This loads the seed set and replaces everything on screen. Continue?";
  return null;
}
//@piece readLedgerFile

// Load's job: read the text of a ledger backup file. Hands back {error} with the sentence to show,
// or the rows, the quarantine that came with them, the last run, and the two sentences about it
// (note: the screen's line when no cloud safety copy spoke first; debug: the debug line).
function readLedgerFile(text){
  let d;
  try{d=JSON.parse(text);}catch{return {error:"Could not read that file \u2014 it may not be a valid ledger backup."};}
  if(!(d&&Array.isArray(d.rows)))return {error:"That file didn't contain a ledger (no entries found)."};
  const rows=d.rows.map(r=>({...r,watching:r.watching||false})),ignored=Array.isArray(d.ignored)?d.ignored:[];
  return {rows,ignored,lastRun:d.lastRun||null,
    note:"Loaded "+d.rows.length+" exhibitions from your file \u2014 no edits yet.",
    debug:"Loaded "+d.rows.length+" exhibitions from your file. It matches your file, so it's not counted as unsaved until you change something."};
}
