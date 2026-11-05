//@ Reading the pro forma CSV.
//@piece proFormaCsv


// One pro forma file, built in memory, so a link goes through the very same
// door as a sweep. swept_at stays blank: a link is not a sweep, and the
// freshness drawer is about sweeps.
function proFormaCsv(rows){
  const cell=v=>{const s=String(v==null?"":v);return /[",\n\r]/.test(s)?"\""+s.replace(/"/g,"\"\"")+"\"":s;};
  const cols=["venue_code","title","start_date","end_date","summary","url","notes","swept_at"];
  return [cols.join(",")].concat(rows.map(r=>cols.map(c=>cell(r[c])).join(","))).join("\n")+"\n";
}
//@piece csvParse

function csvParse(text){
  const out=[]; let i=0,field="",row=[],inQ=false; text=String(text).replace(/\r\n?/g,"\n");
  const pushF=()=>{row.push(field);field="";}; const pushR=()=>{out.push(row);row=[];};
  while(i<text.length){ const c=text[i];
    if(inQ){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i+=2;continue;} inQ=false;i++;continue;} field+=c;i++;continue; }
    if(c==='"'){inQ=true;i++;continue;}
    if(c===','){pushF();i++;continue;}
    if(c==='\n'){pushF();pushR();i++;continue;}
    field+=c;i++;
  }
  if(field.length>0||row.length>0){pushF();pushR();}
  return out.filter(r=>r.some(c=>String(c).trim()!==""));
}
//@piece ignoreKeyFor

// WHAT A QUARANTINE REMEMBERS. The URL where there is one; venue + title where there
// is not (a reused title could block the wrong row — bounded, and visible on screen).
const ignoreKeyFor=(venueId,url,title)=>
  venueId+"|"+(url?normalizeUrlKey(url):"t:"+normalizeTitle(title));
//@piece normalizeTitle

// Conservative duplicate matching for incoming refresh results.
const normalizeTitle = v => String(v||"")
  .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase()
  .replace(/&/g," and ").replace(/\+/g," and ")
  .replace(/[’‘`]/g,"'").replace(/['"]/g,"")
  .replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
//@piece dateMs

const dateMs = d => {
  if(!d)return null;
  const x=new Date(d+"T00:00:00");
  return isNaN(x)?null:x.getTime();
};
//@piece dateRangesOverlap

const dateRangesOverlap = (a,b) => {
  const as=dateMs(a.startDate), ae=dateMs(a.endDate);
  const bs=dateMs(b.startDate), be=dateMs(b.endDate);
  if(as===null||ae===null||bs===null||be===null)return false;
  return as<=be && bs<=ae;
};
//@piece sameExhibition

const sameExhibition = (a,b) => {
  if(a.museumId!==b.museumId)return false;
  if(normalizeTitle(a.title)!==normalizeTitle(b.title))return false;
  const aHasDates=!!a.startDate&&!!a.endDate;
  const bHasDates=!!b.startDate&&!!b.endDate;
  if(aHasDates&&bHasDates)return dateRangesOverlap(a,b);
  if(aHasDates&&!bHasDates)return true;
  if(!aHasDates&&bHasDates)return true;
  // With neither record carrying dates, a different URL is not enough
  // evidence to merge two potentially separate runs. Exact URL matches
  // are handled before this broader comparison.
  return false;
};
//@piece isMarkerRow

// ---- REFRESH ENGINE ----
// Reads a pro forma CSV, compares each row with the ledger and proposes cards; nothing
// applies until she says. Unusable data becomes a note on the card, never dropped.
// Marker rows (a listing page the sweep could not read) are matched on the scraper's
// notes sentence, never on a bracketed title, and go to the coverage panel.
const isMarkerRow = note => {
  const MARKER_SENTINEL = "Marker row, not an exhibition.";
  return String(note||"").trim().endsWith(MARKER_SENTINEL);
};
//@piece fuller

// Which of two values to offer first when a stitched file disagrees with itself: the
// FULLER one, marked as a guess, both shown (her decision).
const fuller = (a,b) => (String(b||"").trim().length > String(a||"").trim().length) ? b : a;
//@piece foldDuplicateRows

/**
 * Fold rows that are the same exhibition before comparing with the ledger — a venue
 * swept on two machines arrives twice. Keyed on venue + URL and nothing else; rows
 * with no URL never fold (a title match once fused 29 National Gallery shows). Gaps
 * fill; a real disagreement is carried forward as a CHOICE (docs/app.md §3).
 */
function foldDuplicateRows(raws){
  const byKey=new Map(), out=[];
  for(const row of raws){
    const key=row.url?(row.venueCode+"|"+normalizeUrlKey(row.url)):"";
    if(!key){ out.push(row); continue; }
    const seen=byKey.get(key);
    if(!seen){ byKey.set(key,row); out.push(row); continue; }
    seen.mergedFrom=(seen.mergedFrom||[seen.line]).concat(row.line);
    for(const f of ["title","startDate","endDate","summary"]){
      const a=seen[f], b=row[f];
      if(!b) continue;                       // nothing to add
      if(!a){ seen[f]=b; continue; }         // fill a gap — no judgement at all
      if(a===b) continue;                    // agreement
      // A REAL DISAGREEMENT. Keep both; the card offers the fuller one first.
      seen.conflicts=seen.conflicts||{};
      if(!seen.conflicts[f]) seen.conflicts[f]=[a];
      if(!seen.conflicts[f].includes(b)) seen.conflicts[f].push(b);
      seen[f]=fuller(a,b);
    }
    // Notes are additive: two runs can each explain something different.
    for(const n of row.rowNotes||[]) if(!(seen.rowNotes||[]).includes(n)) (seen.rowNotes=seen.rowNotes||[]).push(n);
  }
  return out;
}
//@piece analyzeProForma

// `rows` is her ledger as it stands; the cards are what the file would change in it.
function analyzeProForma(text,rows,ignoredKeys,opts){
  const table=csvParse(text);
  if(!table.length) return {error:"That file was empty."};
  const header=table[0].map(h=>String(h).trim().toLowerCase());
  const idx=n=>header.indexOf(n);
  if(idx("venue_code")<0||idx("title")<0) return {error:"That file doesn't look like a pro forma (no venue_code / title columns)."};
  const get=(r,n)=>{const j=idx(n);return j>=0?String(r[j]||"").trim():"";};
  const props=[];
  const coverage=[];   // marker rows: listing pages that could not be read
  const parsed=[];
  // Which venues this file touched (attempted) and gave rows (returned), dated by the
  // rows' swept_at, the latest per venue — never by the moment of import.
  const attempted={}, returned={};
  const later=(a,b)=>(!a||(b&&b>a))?b:a;
  // Counts she can reconcile: every row read is accounted for (docs/app.md §3
  // "Counts that reconcile").
  let silent=0, blocked=0;
  // Rows the sweep should never have produced. Collected, then the whole file
  // is refused — see the note at the check itself.
  const faults=[];

  // ── PASS ONE: read the file; rows are reconciled with each other before the ledger.
  for(let k=1;k<table.length;k++){
    const r=table[k], line=k+1;
    const vc=get(r,"venue_code").toLowerCase();
    const title=get(r,"title");
    const rowNote=get(r,"notes");

    // A listing page that could not be read goes to the coverage panel, not a card.
    const sweptAt=get(r,"swept_at");
    if(KNOWN_VENUES.has(vc)) attempted[vc]=later(attempted[vc],sweptAt);
    if(isMarkerRow(rowNote)){
      coverage.push({venueId:KNOWN_VENUES.has(vc)?vc:null,venueShort:KNOWN_VENUES.has(vc)?MU[vc].short:(vc||"(blank)"),what:title||"(a listing page)",why:rowNote,url:get(r,"url"),line});
      continue;
    }
    if(KNOWN_VENUES.has(vc)&&title) returned[vc]=later(returned[vc],sweptAt);

    const notes=[];
    // A row with no title or no known venue code is a data fault, not hers to fix (her
    // decision): the whole file is refused, naming the lines. qc.js stops it upstream;
    // this is the last line of defence.
    if(!vc||!KNOWN_VENUES.has(vc)){ faults.push("line "+line+": venue code "+(vc?("\u201c"+vc+"\u201d"):"is blank")+(vc?" isn\u2019t one of the venues":"")); continue; }
    if(!title){ faults.push("line "+line+": no exhibition title"+(get(r,"url")?" \u2014 "+get(r,"url"):"")); continue; }
    let sd=get(r,"start_date"), ed=get(r,"end_date"), url=get(r,"url");
    if(sd&&!isValidYMD(sd)){notes.push("Start date \u201c"+sd+"\u201d couldn't be read (needs YYYY-MM-DD) \u2014 left blank.");sd="";}
    if(ed&&!isValidYMD(ed)){notes.push("End date \u201c"+ed+"\u201d couldn't be read (needs YYYY-MM-DD) \u2014 left blank.");ed="";}
    if(url&&!urlLooksValid(url)){notes.push("Exhibition link \u201c"+url+"\u201d looks garbled \u2014 left blank.");url="";}
    // Quarantined: dropped before anything else sees it. Counted, never silent.
    if(ignoredKeys&&ignoredKeys.has(ignoreKeyFor(vc,url,title))){ blocked++; continue; }
    parsed.push({venueCode:vc,title,startDate:sd,endDate:ed,summary:get(r,"summary"),url,topic:topicOf(rowNote),
                 rowNotes:rowNote?[((opts&&opts.notePrefix!=null)?opts.notePrefix:"Sweeper note: ")+rowNote]:[],parseNotes:notes,line});
  }

  // THE FILE IS REFUSED WHOLE, not row by row. A sweep that produced a
  // nameless row is a sweep to re-run, and importing the rest of it would
  // quietly leave that exhibition out.
  if(faults.length){
    return { error:"This sweep file has "+faults.length+" faulty row"+(faults.length===1?"":"s")+
      " and hasn\u2019t been imported. Nothing here is for you to fix \u2014 give these line numbers back to Claude:\n\n"+
      faults.slice(0,12).join("\n")+(faults.length>12?"\n\u2026and "+(faults.length-12)+" more.":"") };
  }
  // ── PASS TWO: fold rows that are the same exhibition. ────────────────────
  const folded=foldDuplicateRows(parsed);

  // ── PASS THREE: compare each surviving row to the ledger, as before. ─────
  for(const p of folded){
    const vc=p.venueCode, title=p.title, sd=p.startDate, ed=p.endDate, summary=p.summary, url=p.url;
    const notes=p.parseNotes.slice();
    if(!sd)notes.push("No start date.");
    if(!ed)notes.push("No end date.");
    if(!summary)notes.push("No description.");
    if(!url)notes.push("No exhibition link.");
    for(const n of p.rowNotes) notes.push(n);
    // Say when rows were folded, so the count matches the file.
    if(p.mergedFrom) notes.push("Rows "+p.mergedFrom.join(", ")+" of the file describe this same exhibition \u2014 combined into one.");

    const cand={museumId:vc,title,startDate:sd||null,endDate:ed||null,summary,exUrl:url};
    const exact=url?rows.find(x=>x.museumId===vc&&x.exUrl&&x.exUrl===url):null;
    const match=exact||rows.find(x=>sameExhibition(x,cand));

    // WHERE THE FILE DISAGREED WITH ITSELF, offer the choice on the card.
    // The fuller value is ticked, and marked as a guess; both are shown.
    const choices=p.conflicts?Object.keys(p.conflicts).map(f=>({
      field:f,
      label:{title:"Title",startDate:"Start date",endDate:"End date",summary:"Description"}[f]||f,
      options:p.conflicts[f],
      picked:p[f],
    })):null;

    if(!match){ props.push({type:"add",venueId:vc,venueShort:MU[vc].short,title,cand,notes,line:p.line,choices,merged:!!p.mergedFrom,topic:p.topic||null}); continue; }
    const upd=[];
    const consider=(field,label,oldV,newV)=>{ const o=(oldV==null?"":String(oldV)), n=(newV==null?"":String(newV)); if(!n)return; if(!o)upd.push({field,label,oldVal:"",newVal:n,kind:"fill"}); else if(o!==n)upd.push({field,label,oldVal:o,newVal:n,kind:"change"}); };
    // A changed title is a Change card, capitals-only included (her decision): a title
    // recorded in capitals is corrected in her ledger, never masked on screen.
    { const sq=v=>String(v||"").replace(/\s+/g," ").trim();
      if(title&&match.title&&sq(title)!==sq(match.title))
        upd.push({field:"title",label:"Title",oldVal:String(match.title),newVal:String(title),kind:"change"}); }
    consider("startDate","Start date",match.startDate,sd);
    consider("endDate","End date",match.endDate,ed);
    consider("summary","Description",match.summary,summary);
    consider("exUrl","Link",match.exUrl,url);
    if(!upd.length&&!choices){ silent++; continue; }  // identical — nothing to propose
    const hasChange=upd.some(u=>u.kind==="change");
    props.push({type:hasChange?"change":"fill",venueId:vc,venueShort:MU[vc].short,title,cand,matchId:match.id,upd,notes,line:p.line,choices,merged:!!p.mergedFrom});
  }
  const tally={
    fileRows:  table.length-1,
    markers:   coverage.length,
    folded:    parsed.length-folded.length,
    add:       props.filter(p=>p.type==="add").length,
    fill:      props.filter(p=>p.type==="fill").length,
    change:    props.filter(p=>p.type==="change").length,
    silent,
    blocked,
  };
  return {props,coverage,tally,seen:{attempted,returned}};
}
//@piece readSweepFile

// A sweep file read for the review: the cards, or why there are none. `ignored` is the
// quarantine list; a file with nothing to propose says so in `nothingNew`.
function readSweepFile(text,rows,ignored){
  const res=analyzeProForma(text,rows,new Set(ignored.map(x=>x.key)));
  if(res.error||res.props.length)return res;
  return {...res,nothingNew:"Read the refresh file, but nothing new to propose \u2014 your ledger already matches it."+((res.coverage||[]).length?" ("+res.coverage.length+" listing page"+(res.coverage.length===1?"":"s")+" couldn\u2019t be read \u2014 see below.)":"")};
}
//@piece saveSweepLog

// The sweep log written to the store; resolves to why it was not saved, or null.
function saveSweepLog(log){
  return writeSweepLog(log).then(ok=>ok?null:"The sweep log couldn\u2019t be saved to this page\u2019s store, so it may reset when you reload.");
}
