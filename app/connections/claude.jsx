//@ Asking Claude and reading its JSON answer.
//@piece readResults


// Hand the search results to Claude and ask it to read the catalogue off them.
// It sees ONLY these excerpts, so it cannot report a shop page that was not
// found. Returns {ok, data, detail}.
// tier: the model tier asked for — "default", or "complex" for the Links, Pages and Paste read,
// which writes the description (her decision: flat descriptions on the default tier).
async function readResults(prompt,tier="default"){
  const t0=Date.now(), out=await readResultsCall(prompt,tier);
  announceCall("claude",{prompt},out,t0);
  return out;
}
//@piece readResultsCall

async function readResultsCall(prompt,tier){
  const sample=await useCap("sample");
  if(!sample)return{ok:false,data:null,code:"unavailable",detail:"Claude isn\u2019t available to this page in this viewer."};
  try{
    // Never a replayed answer: the platform replays an identical question asked within five minutes,
    // so Relabel, Search again and Re-check would not ask again (her Metamorphoses Relabel).
    const data=await sample.json(prompt,{modelTier:tier||"default",cache:false});
    return{ok:true,data,detail:"read the results"};
  }catch(e){
    const code=String((e&&e.code)||"");
    // A reply holding two answers ("Wait — here is the corrected object", Hubert Robert):
    // the last one is Claude's own correction. TW-001 to TW-004.
    if(code==="invalid_json"&&e&&e.text){
      const data=lastJsonObject(e.text);
      if(data)return{ok:true,data,detail:"read the results (the reply held more than one answer; the last was taken)"};
    }
    let why="Couldn\u2019t read the search results ("+(code||"unknown")+").";
    if(code==="not_granted")       why="You declined to let this page use Claude. Reload and allow it to search.";
    else if(code==="rate_limited") why="Claude is rate-limited.";
    else if(code==="invalid_json") why="Claude\u2019s answer came back unreadable. Try again.";
    return{ok:false,data:null,code,partial:(e&&e.text)||null,detail:why+"  ["+String((e&&e.message)||e)+"]"};
  }
}
//@piece lastJsonObject


// The last complete {…} object in a reply that parses, or null. Strings are skipped
// whole, so a brace inside one is not counted.
function lastJsonObject(text){
  const t=String(text||""), found=[];
  let depth=0, start=-1, inStr=false, esc=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(inStr){ if(esc)esc=false; else if(c==="\\")esc=true; else if(c==='"')inStr=false; continue; }
    if(c==='"'){ if(depth>0)inStr=true; continue; }
    if(c==="{"){ if(depth===0)start=i; depth++; }
    else if(c==="}"&&depth>0){ depth--; if(depth===0)found.push(t.slice(start,i+1)); }
  }
  for(let k=found.length-1;k>=0;k--){
    try{ const v=JSON.parse(found[k]); if(v&&typeof v==="object"&&!Array.isArray(v))return v; }catch{}
  }
  return null;
}
