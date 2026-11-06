//@ The one request to Claude for the whole import, and checking its answers.
//@piece LINK_READ_TIER

// The model tier for the Links, Pages and Paste read: one call that writes the description and reads the
// subtitle, English title and venue (Paste: title and dates too). Not an extra call (her decision).
const LINK_READ_TIER="complex";
//@piece SHORT_NAME_EXAMPLES


// askVenue: a site the app has never seen (or has stored named only by its address). Claude is
// given the page's address and names the venue that held the show (her decision): its full name
// and other names, city and country, for searching, and a short card name in her style. Whether the page is
// the museum's own decides the rest: only someone else's page asks more (elsewherePrompt).
// Her names for venues, as the style for a new venue's short name.
const SHORT_NAME_EXAMPLES=()=>VENUE_REGISTER.filter(e=>e.kind==="manual"&&e.names.hers).map(e=>e.names.card).filter(Boolean);
//@piece SHORT_NAME_RENAMES

// Her renames of Claude's card names (`notCard`), each with the name Claude gave: so Claude learns her style.
// The full name is the entry's, else the one Claude gave, as the store holds it (MU).
const SHORT_NAME_RENAMES=()=>VENUE_REGISTER.filter(e=>e.kind==="manual"&&e.names.hers&&e.names.replaced.length)
  .map(e=>"for "+JSON.stringify(e.names.full||e.names.card)+": "+JSON.stringify(e.names.card)+", not "+e.names.replaced.map(x=>JSON.stringify(x)).join(" or "));
//@piece linkItem

// ONE REQUEST FOR THE WHOLE IMPORT (her decision): every page of a Links, Pages or Paste import goes
// to Claude in one request — the opening, the examples and the rules once, as the sweep's compressor
// sends them, then each page as an item. A page's own questions (a pasted box's title and dates, a
// subtitle, a new venue's names) are asked inside its item. linkItem is one page; linkBatchPrompt the request.
// A pasted box (page.pasted): the whole text, and Claude asked for the title and the date words too.
function linkItem(page,askVenue,url,vc){
  const museum=page.pasted&&!askVenue&&MU[vc]?MU[vc].name:"";
  const keys=[
    page.pasted?"The summary is written from the rest of the text, once the title and the dates are taken out.\n"
      +"\"title\": the exhibition's full name with its subtitle, copied exactly as the text writes it, word for word (a line break inside it may become a space). Only the name: never a sentence about the show, an author's or editor's name after it, a label (\"Title:\", \"Exhibition\"), a place or a date.\n"
      +"\"dates\": the words that give the exhibition's opening and closing dates"+(museum||askVenue?" at "+(museum?"THE MUSEUM THIS CARD IS FOR":"the museum you give as venue"):"")+", copied exactly as the text writes them (\"November 19, 1977 to February 12, 1978\"). Never another venue's showing, a birth or death date, or a publication date. \"\" if the text gives none.":"",
    page.between.length?"\"subtitle\": if one of the LINES BETWEEN THE TITLE AND THE DATES is the second part of the exhibition's own name — the part a catalogue's title would carry after the main title — copy that line exactly as written. Otherwise \"\". Never a category (\"Special Exhibition\"), a sponsor, a place, a price or a date. \"english\" then carries the subtitle you gave, if any.":"",
    askVenue?"\"venue\": the museum or gallery of THE SHOWING THIS CARD IS FOR: the one that line names, even when the text lists other showings or another venue first; if the line names none, the museum that held the exhibition on its dates. The museum itself, not a building, wing or room of it. Its full official name, written out (no acronym). \"\" if the page does not say.\n"
      +"\"venueCity\": that museum's city, in English. \"\" if not known.\n"
      +"\"venueCountry\": that museum's country, in English. \"\" if not known.\n"
      +"\"venueAlso\": the other names that museum goes by, as an array of strings: its acronym, its name in its own language (\"KMSKA\", \"Koninklijk Museum voor Schone Kunsten Antwerpen\"). [] if none.\n"
      +"\"venueShort\": that museum's name as it would head a card in this tracker: short, but enough to tell it from any other museum (\"National Gallery\" alone is not: there are several), in the style of these: "+JSON.stringify(SHORT_NAME_EXAMPLES())+"."+(SHORT_NAME_RENAMES().length?" Where she renamed the name first given, hers is the style to follow: "+SHORT_NAME_RENAMES().join("; ")+".":"")+" \"\" if \"venue\" is \"\".\n"
      +"\"venueOwnPage\": true if the PAGE ADDRESS is on that museum's own website; false if it is on someone else's site (a blog, a magazine, a newspaper, an aggregator, another organisation), even when the text is the museum's own press release.":""].filter(Boolean);
  return (askVenue?"PAGE ADDRESS: "+url+"\n":"")
    +(museum?"THE MUSEUM THIS CARD IS FOR: "+JSON.stringify(museum)+"\n":"")
    +(askVenue&&page.dateLine?"THE SHOWING THIS CARD IS FOR, as the page prints it: "+JSON.stringify(page.dateLine)+"\n":"")
    +(page.pasted?"RAW TEXT (pasted or typed by hand, from one source or several; its order and layout can be anything):\n\"\"\"\n"+page.raw+"\n\"\"\""
    :"EXHIBITION TITLE, as the page gives it: "+JSON.stringify(page.base)+"\n"
    +(page.between.length?"LINES BETWEEN THE TITLE AND THE DATES: "+JSON.stringify(page.between)+"\n":"")
    +"RAW TEXT (the page under the title, dates taken out):\n\"\"\"\n"+page.raw+"\n\"\"\"")
    +(keys.length?"\n\nTHIS ITEM'S ANSWER ALSO HAS THESE KEYS:\n"+keys.join("\n"):"");
}
//@piece LINK_KEYS

// Every item's answer has these keys.
const LINK_KEYS="\"summary\": the summary, following the rules above — or null if the item's raw text does not describe an exhibition.\n"
  +"\"english\": the exhibition's title in natural English if it is not in English; \"\" if it already is, names aside. Keep every name as written and the title's own full stops. Plain words: no \"In English\", no quotation marks.\n"
  +"\"englishSpeaking\": true if the museum is in an English-speaking country, false if not.\n"
  +"\"gallery\": true if the venue that held the exhibition is a commercial art gallery (a dealer that shows and sells artists' work), false if it is a museum or another public institution.";
//@piece linkBatchPrompt

// entries: [{key, item, refused?: {faults, answer}}]. A refused answer is shown back inside its item,
// to be fixed rather than started afresh (her Memling link; AL-062c).
function linkBatchPrompt(entries){
  const items=entries.map(e=>"===== ITEM "+e.key+" =====\n"+e.item
    +(e.refused?"\n\nYOUR LAST ANSWER WAS REFUSED: "+e.refused.faults.join("; ")+".\nTHE ANSWER REFUSED: "+JSON.stringify(e.refused.answer)
      +"\nAnswer again, every key, with that fixed — never the same answer again. Leave out anything the text does not state.":"")
    +"\n===== END ITEM "+e.key+" =====").join("\n\n");
  return SUMMARY_OPENING+" You also read a few facts off each exhibition page. Your ONLY output is one JSON object.\n\n"
    +"EXAMPLES of the required style — a venue's raw curatorial text, and the summary that was accepted for it:\n\n"+SUMMARY_EXAMPLES+"\n"+SUMMARY_STUDY+"\n\n"
    +"RULES FOR THE SUMMARY:\n"+SUMMARY_RULES+"\n\n"
    +"THE PAGES: "+entries.length+(entries.length===1?" item":" items")+", each between its ===== ITEM ===== and ===== END ITEM ===== lines. Write each item's answer from its own text alone.\n\n"
    +items+"\n\n"
    +"ANSWER: one JSON object mapping each item's number, as a string, to that item's answer — an object with these keys:\n"+LINK_KEYS+"\n"
    +"An item that lists more keys answers those too. Every item appears exactly once. No commentary before or after, no code fence.";
}
//@piece linkPrompt

// One page's request, as a one-item import sends it.
const linkPrompt=(page,askVenue,url,vc)=>linkBatchPrompt([{key:"0",item:linkItem(page,askVenue,url,vc)}]);
//@piece LINK_BATCH_BYTES,LINK_BATCH_ITEMS

// A request stays well under what one Claude call may carry (sample.limits: 262,144 bytes) and asks
// for a bounded number of answers at once; a larger import is split.
const LINK_BATCH_BYTES=200000, LINK_BATCH_ITEMS=20;
//@piece linkBatches

function linkBatches(entries){
  const base=utf8Bytes(linkBatchPrompt([])), out=[];
  let cur=[], size=base;
  for(const e of entries){
    const n=utf8Bytes(e.item)+(e.refused?utf8Bytes(JSON.stringify(e.refused)):0)+80;
    if(cur.length&&(cur.length>=LINK_BATCH_ITEMS||size+n>LINK_BATCH_BYTES)){ out.push(cur); cur=[]; size=base; }
    cur.push(e); size+=n;
  }
  if(cur.length)out.push(cur);
  return out;
}
//@piece batchAnswers

// Each item's answer from a reply. A reply cut short or unreadable keeps the items it holds whole;
// the rest are asked again (her decision: only the ones that did not come back).
function batchAnswers(data,text){
  if(data&&typeof data==="object"&&!Array.isArray(data))return data;
  const t=String(text||""), out={};
  const re=/"(\d+)"\s*:\s*\{/g; let m;
  while((m=re.exec(t))){
    let depth=0, inStr=false, esc=false, end=-1;
    for(let i=m.index+m[0].length-1;i<t.length;i++){
      const c=t[i];
      if(inStr){ if(esc)esc=false; else if(c==="\\")esc=true; else if(c==='"')inStr=false; continue; }
      if(c==='"'){ inStr=true; continue; }
      if(c==="{")depth++;
      else if(c==="}"){ depth--; if(depth===0){ end=i; break; } }
    }
    if(end<0)break;
    try{ out[m[1]]=JSON.parse(t.slice(m.index+m[0].length-1,end+1)); }catch{}
    re.lastIndex=end+1;
  }
  return out;
}
//@piece readLinkBatch


// The whole import asked at once: each page's answer checked; the ones refused, or that did not come
// back, asked again together (LINK_ASK_AGAIN times), never the whole import. A call that fails outright
// (declined, rate-limited) is not repeated: each page goes on with no description, as one page did.
// Each page's lookup-log record holds every request its page was in. `stopped` says whether Cancel was pressed.
async function readLinkBatch(work,stopped){
  for(const w of work){ w.ask=null; w.faults=["no answer"]; }
  let pending=work.slice();
  for(let round=0;round<=LINK_ASK_AGAIN&&pending.length;round++){
    for(const batch of linkBatches(pending.map(w=>({key:String(w.n),item:w.entry,refused:w.refused||null,w})))){
      if(stopped&&stopped())return;
      const prompt=linkBatchPrompt(batch), t0=Date.now();
      lookupTape=null;
      const out=await readResultsCall(prompt,LINK_READ_TIER);
      const got=batchAnswers(out.ok?out.data:null,out.partial);
      for(const e of batch){
        const w=e.w, t=w.tape;
        t.calls.push({n:t.calls.length+1,kind:"claude",at:t0-t.t0,ms:Date.now()-t0,input:{prompt,item:e.key},output:out});
        const d=got[e.key];
        if(d!==undefined){ w.ask={ok:true,data:d,detail:out.detail||"read the results"}; w.faults=answerFaults(d,w.page); }
        else if(!out.ok&&out.code!=="invalid_json"){ w.ask=out; w.faults=[]; }
        else { w.ask={ok:true,data:null,detail:"no answer for this page"}; w.faults=["no answer"]; }
        if(w.faults.length&&d!==undefined){ w.refused={faults:w.faults,answer:d}; w.seen.refused=[...(w.seen.refused||[]),{answer:d,faults:w.faults}]; }
      }
    }
    pending=work.filter(w=>w.faults.length);
  }
}
//@piece linkAnswer


// What the model said, checked. Wording is not a control.
function linkAnswer(a){
  const o=a&&typeof a==="object"?a:{};
  const str=v=>typeof v==="string"?v.replace(/["“”]/g,"").replace(/\s+/g," ").trim():"";
  return{summary:typeof o.summary==="string"?o.summary.trim():"",subtitle:typeof o.subtitle==="string"?o.subtitle.trim():"",
    english:str(o.english).replace(/^In English:\s*/i,""),englishSpeaking:o.englishSpeaking!==false,gallery:o.gallery===true,
    venue:str(o.venue),venueCity:str(o.venueCity),venueCountry:str(o.venueCountry),venueAlso:(Array.isArray(o.venueAlso)?o.venueAlso:[]).map(str).filter(Boolean).slice(0,4),venueShort:str(o.venueShort),venueOwnPage:o.venueOwnPage!==false,
    pasteTitle:typeof o.title==="string"?o.title.replace(/\s+/g," ").trim():"",pasteDates:typeof o.dates==="string"?o.dates.replace(/\s+/g," ").trim():""};
}
//@piece LINK_ASK_AGAIN


// Claude's answer, checked as the compressor checks its own (ANSWER_CHECK, one copy, shared): the
// description's shape, and every claim and number in it on the page Claude was given. Returns the
// faults, said so Claude can fix them; [] when it passes. A null description (the text is not a
// show's description) is Claude's decision and passes. A failed answer is asked for again
// (LINK_ASK_AGAIN times); one that never passes leaves the link unread (her decision).
const LINK_ASK_AGAIN=2;
//@piece answerFaults

function answerFaults(raw,page){
  const o=raw&&typeof raw==="object"?raw:null;
  if(!o)return["no answer"];
  const faults=[];
  if(o.summary!==null){
    const v=ANSWER_CHECK.validateAnswer(typeof o.summary==="string"?o.summary:"");
    if(!v.ok)faults.push("the summary: "+v.reason);
    else{
      faults.push(...ANSWER_CHECK.stringFaults(o.summary).map(f=>"the summary "+f));
      faults.push(...ANSWER_CHECK.unsupportedClaims(o.summary,page.pasted?pasteRest(o,page):[page.base,...(page.between||[]),page.raw].join("\n")).map(f=>"in the summary, "+f));
      // The title said again tells her nothing — one shared check for Links, Pages, Paste and the sweep.
      // The title is the page's, with any subtitle line; a paste's is the one Claude copied.
      const title=page.pasted?linkAnswer(o).pasteTitle:[page.base,...(page.between||[])].join(" ");
      if(ANSWER_CHECK.rewordsTitle(o.summary,title))faults.push(ANSWER_CHECK.REWORDS_TITLE);
    }
  }
  // The English title as linkAnswer reads it (not a string is none; quotation marks and an "In English:"
  // opening taken off, AL-006).
  { const e=ANSWER_CHECK.validateEnglish(linkAnswer(o).english); if(!e.ok)faults.push(e.reason); }
  if(page.pasted)faults.push(...pasteFaults(o,page));
  return faults;
}
