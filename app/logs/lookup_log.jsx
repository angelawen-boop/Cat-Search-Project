//@ The lookup log: recording every search, page and Claude call.
//@piece LOOKUP_LOG,LOOKUP_KEEP,LOOKUP_PIECE


// ── THE LOOKUP LOG — every catalogue lookup, recorded whole (docs/app.md §1) ──
// Find catalogue, Search again, Re-check and each link an Add by link reads save one
// record to the page's store: every call's input and full answer, Claude's answers,
// the card before and after, and for a link what code read off its page.
// Nothing shows on the page; Claude reads it with build/lookup_log.js. The newest 50
// are kept. A record is gzipped and split under the store's size cap; it is marked
// complete only after every piece is written. LL-001 to LL-009.
const LOOKUP_LOG="lookups", LOOKUP_KEEP=50, LOOKUP_PIECE=180000;
//@piece CARD_FIELDS

const CARD_FIELDS=["hasCatalogue","catalogueTitle","isbn13","publisher","publisherUrl","publisherResult",
  "shopUrl","shopState","shopChange","englishCheck","originalEdition","otherVenueBook","alsoVersion","editions","editionPick"];
//@piece lookupTape

let lookupTape=null;
//@piece tapeStart

function tapeStart(action,row){
  lookupTape={t0:Date.now(),action,row,calls:[]};
  return lookupTape;
}
//@piece tapeCall

function tapeCall(kind,input,output,t0){
  const t=lookupTape;
  if(t)t.calls.push({n:t.calls.length+1,kind,at:t0-t.t0,ms:Date.now()-t0,input,output});
}
//@piece stmt:onCall(tapeCall);

onCall(tapeCall);
//@piece cardFields

const cardFields=r=>Object.fromEntries(CARD_FIELDS.map(k=>[k,r?(r[k]===undefined?null:r[k]):null]));
//@piece gzipBase64

async function gzipBase64(text){
  if(typeof CompressionStream==="undefined")return null;
  const buf=await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
  const bytes=new Uint8Array(buf); let bin="";
  for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
  return btoa(bin);
}
//@piece saveLookupTape

// Ends the tape and saves it. Never throws, and a lookup never waits on it.
async function saveLookupTape(tape,out){
  if(lookupTape===tape)lookupTape=null;
  try{
    if(!await storeReached()||!tape)return false;
    const row=tape.row||{}, mu=MU[row.museumId];
    const at=new Date(tape.t0).toISOString();
    const body=JSON.stringify({
      action:tape.action,at,version:APP_VERSION,ms:Date.now()-tape.t0,
      card:{id:row.id,title:row.title,museumId:row.museumId,venue:mu?mu.name:null,
        startDate:row.startDate||null,endDate:row.endDate||null,exUrl:row.exUrl||null},
      before:cardFields(row),after:out&&out.row?cardFields(out.row):null,
      ok:!!(out&&out.ok),said:(out&&out.said)||null,trouble:(out&&out.trouble)||null,
      panel:(out&&out.detail)||null,link:tape.link||null,calls:tape.calls});
    const z=await gzipBase64(body);
    const enc=z?"gzip-base64":"json", text=z||body;
    const pieces=[];
    for(let i=0;i<text.length;i+=LOOKUP_PIECE)pieces.push(text.slice(i,i+LOOKUP_PIECE));
    const id="L"+tape.t0+Math.random().toString(36).slice(2,6);
    const rec=LOOKUP_LOG+"/"+id;
    await storeWrite(rec,{at,action:tape.action,title:row.title||null,venue:mu?mu.name:null,museumId:row.museumId||null,
      version:APP_VERSION,calls:tape.calls.length,enc,pieces:pieces.length,complete:false});
    for(let i=0;i<pieces.length;i++)await storeWrite(rec+"/pieces/"+i,{text:pieces[i]});
    await storeWrite(rec,{complete:true},{merge:true});
    await pruneLookupLog();
    return true;
  }catch{ return false; }
}
//@piece pruneLookupLog

async function pruneLookupLog(){
  const list=await storeList(LOOKUP_LOG,{by:"at",dir:"desc",limit:1000});
  for(const d of list.slice(LOOKUP_KEEP)){
    const n=Number((d.data||{}).pieces)||0, rec=LOOKUP_LOG+"/"+d.id;
    for(let i=0;i<n;i++)await storeDelete(rec+"/pieces/"+i);
    await storeDelete(rec);
  }
}
