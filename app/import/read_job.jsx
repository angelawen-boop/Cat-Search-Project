//@ The Read button's job for Links, Pages and Paste: reading each one, its progress lines, and what goes back into the pending lists.
//@piece readInputs


// What a Read is given: kind "links", "pages" or "paste", and the box, list or boxes waiting.
// Nothing to read → `nothing`, the lines to show.
function readInputs(kind,{linkText,pages,pastes}){
  const fromPasted=kind==="paste", fromPages=kind==="pages"||fromPasted;
  // Pasted boxes: each turned into a page now, then read as a saved page is; a box that
  // cannot be is a line, never read.
  const pasteBad=[];
  const pasted=fromPasted?pastes.filter(filledBox).map(x=>{ const r=pastedPageReply(x.url,x.text); if(!r.ok){ pasteBad.push({url:x.url.trim(),why:r.why}); return null; } return{url:r.res.url,text:r.res.text,box:x}; }).filter(Boolean):[];
  const items=fromPasted?pasted:fromPages?pages:linksIn(linkText).map(url=>({url}));
  const urls=items.map(x=>x.url);
  const input={kind:fromPasted?"paste":fromPages?"pages":"links",items,urls,pasted,pasteBad};
  if(!urls.length)input.nothing=pasteBad.length?pasteBad:[{url:"",why:fromPasted?"Nothing pasted.":fromPages?"No pages chosen.":"No links found in the box."}];
  return input;
}
//@piece readShows


// ── ADD BY LINK — the button's work ────────────────────────────────────────
// One page read per link, then one model call for the prose; a new venue's
// shop is found once. Every row then goes through analyzeProForma, the same
// door as a sweep file. What could not be read stays in the box.
// Pages (saved pages) take the same road, the page's text in place of the fetch;
// what could not be read stays in the Pages list.
// `occVenues` is the working copy of her link venues; `progress` takes each progress line and
// `stopped` says whether Cancel was pressed mid-Read. Hands back the rows read (`got`), the lines
// that could not be read (`fails`), the venues met, and the venues as they now stand.
async function readShows(input,occVenues,{progress,stopped}){
  const {items,urls,pasteBad}=input, fromPasted=input.kind==="paste", fromPages=input.kind!=="links";
  const got=[], fails=[...pasteBad], met=new Set(), looked=new Set();
  let venues={...occVenues}, venuesChanged=false;
  const work=[], namedNow=new Set();
  for(let n=0;n<urls.length;n++){
    if(stopped())break;
    const url=urls[n];
    progress({done:n,total:urls.length,label:"Reading "+(n+1)+" of "+urls.length+"\u2026"});
    const item=items[n];
    // Each link's reading is one record in the lookup log: what code read off the
    // page, Claude's answer and the title made from them.
    const tape=tapeStart(fromPasted?"Add by paste":fromPages?"Add by page":"Add by link",{title:url,exUrl:url}), seen={url};
    const failsBefore=fails.length;
    let queued=false;
    try{
      const f=fromPages?{ok:true,results:[{url,title:item.title,full_content:item.text}]}:await fetchPage(url,"The exhibition's title, dates and description.",null,{full:true});
      if(!f.ok){ fails.push({url,why:f.detail}); continue; }
      const res=f.results[0];
      if(!res){
        const e=(f.errors||[])[0];
        fails.push({url,why:pageUnreadWhy(e)});
        continue;
      }
      let page=fromPasted?pastedPage(item.text,url):readShowPage(res,url,linkReadVenue(url));
      seen.venue=knownVenueFor(url)||null; seen.page=page;
      if(!page.ok){ fails.push({url,why:page.why}); continue; }
      const lv=linkVenue(url,page);
      let vc=lv.id;
      seen.venue=vc||null;
      if(!vc){ fails.push({url,why:lv.why}); continue; }
      if(lv.line)page.between=page.between.filter(l=>l!==lv.line);
      let host=hostOf(siteUrlOf(url));
      // A venue not met before (or stored named only by its address): Claude names it (her
      // decision). On someone else's page, code files the show at the venue Claude names
      // (heldElsewhere; her decision, a last resort).
      // A venue on another part of one of her museums' own site is asked every time, so each
      // page there can file under the museum it names (ownMuseumNamed).
      // A new venue is named once per import: by its first page (AL-053).
      const askFresh=isOcc(vc)&&needsFacts(venues[vc])&&!namedNow.has(vc), askVenue=askFresh||(isOcc(vc)&&!(linkEntry(vc)||{}).name&&nearMuseumSite(host));
      // An entry that only places the venue's chip leaves this as it was (Cini).
      const lk=linkEntry(vc), ownSite=vc===occVenueId(host)&&(!lk||Object.keys(lk).every(k=>k==="ownChip"||k==="chip"||k==="group"));
      if(askFresh)namedNow.add(vc);
      work.push({n,url,item,res,page,vc,host,askFresh,askVenue,ownSite,tape,seen,entry:linkItem(page,askVenue,url,vc)});
      queued=true;
    }catch(e){ fails.push({url,why:"Couldn\u2019t read it ("+String((e&&e.message)||e)+")."}); }
    finally{
      if(!queued){ tape.link={...seen,row:null}; saveLookupTape(tape,{ok:false,said:fails.length>failsBefore?fails[fails.length-1].why:null}); }
    }
  }
  // Every page read: Claude is asked for all of them at once (readLinkBatch).
  if(work.length&&!stopped())await readLinkBatch(work,stopped);
  for(const w of work){
    if(stopped())break;
    const {n,url,res,tape,seen,askFresh,askVenue,ownSite}=w;
    // Counted now: a page that failed to read meanwhile is not this page's failure.
    const failsBefore=fails.length;
    let {page,vc,host}=w;
    const ask=w.ask, faults=w.faults;
    lookupTape=tape;
    try{
      if(faults.length){ fails.push({url,why:"Claude\u2019s description failed check and re-attempt multiple times ("+faults.join("; ")+")"}); continue; }
      let a=linkAnswer(ask.ok?ask.data:null);
      // A pasted box: no title, no box read (the title is Claude's, checked; her decision).
      if(page.pasted){
        if(!ask.ok){ fails.push({url,why:"Claude couldn\u2019t read the text ("+ask.detail.replace(/\s+\[.*$/,"")+")."}); continue; }
        page=pasteDates({...page,base:pasteTitle(a.pasteTitle)},a.pasteDates,vc); seen.page=page;
      }
      if(askFresh&&ownSite&&maybeElsewhere(a,host)){ const more=await readResults(elsewherePrompt(page,url,a)); if(more.ok)a={...a,...elsewhereAnswer(more.data)}; }
      const away=askFresh&&ownSite?heldElsewhere(a,host):null;
      if(away){ vc=away.id; host=away.host; seen.venue=vc; seen.heldElsewhere=away; }
      const ownMuseum=!away&&askVenue?ownMuseumNamed(a,host):null;
      if(ownMuseum){ vc=ownMuseum; seen.venue=vc; seen.ownMuseum=ownMuseum; }
      const named=askFresh&&!ownMuseum&&a.venue?{name:a.venue,short:a.venueShort||a.venue,aka:a.venueAlso,city:a.venueCity,country:a.venueCountry}:null;
      const fresh=!venues[vc];
      if(isOcc(vc)){
        met.add(vc);
        const had=venues[vc];
        // A new venue's shop is looked for once per Read. On a later Read, again only
        // while unconfirmed AND (found by the first finder, or no books section found)
        // — a miss is never kept as the answer.
        if(!looked.has(vc)&&(!had||(!had.confirmed&&(!(had.finder>=2)||had.shop!=="found")))){
          looked.add(vc);
          const name=venueSearchName(vc,{...(had&&!namedByAddress(had)?had:{name:page.site}),...(named&&(!had||namedByAddress(had))?{name:named.name}:{}),...(named?{aka:named.aka,city:named.city,country:named.country}:{})});
          progress({done:n,total:urls.length,label:"Reading "+(n+1)+" of "+urls.length+"\u2026 looking for "+name+"\u2019s shop"});
          const pageShop=away?"":shopLinkOnPage(oneText(res),host);
          const gallery=had&&had.gallery!==undefined?had.gallery:ask.ok&&a.gallery;
          const shop=await discoverShop(pageShop,host,name,had?had.turnedDown:[],vc,null,(had&&had.english===false)||(ask.ok&&a.englishSpeaking===false),gallery&&!away?{page:oneText(res),url}:gallery);
          venues={...venues,[vc]:{...(had||{}),id:vc,name:had?had.name:named?named.name:page.site,host,english:had?had.english:undefined,
            shopHome:null,shopCatalogues:null,shelfKind:null,shopSearch:null,why:null,shopEnglishUnread:null,englishPicked:false,
            ...shop,confirmed:false,turnedDown:had?had.turnedDown||[]:[],pageShop,addedAt:had?had.addedAt:new Date().toISOString()}};
          venuesChanged=true;
        }
      }
      if(isOcc(vc)&&named&&venues[vc]&&needsFacts(venues[vc])){
        const renamed=fresh||namedByAddress(venues[vc]);
        venues={...venues,[vc]:{...venues[vc],...(renamed?{name:named.name,short:named.short}:{}),aka:named.aka,city:named.city,country:named.country}}; venuesChanged=true; seen.named=named;
      }
      if(isOcc(vc)&&venues[vc]&&venues[vc].english===undefined&&ask.ok){ venues={...venues,[vc]:{...venues[vc],english:a.englishSpeaking}}; venuesChanged=true; }
      if(isOcc(vc)&&venues[vc]&&venues[vc].gallery===undefined&&ask.ok){ venues={...venues,[vc]:{...venues[vc],gallery:a.gallery}}; venuesChanged=true; }
      // A venue whose subtitle sits under the heading: read by code. A line
      // ending like a sentence is the text, not a subtitle.
      const own=(MU[vc]||{}).subtitleUnderHeading&&page.under&&page.under.length<=120&&!/[.!?]$/.test(page.under)?page.under:"";
      // A show held elsewhere takes the title Claude read (someone else's page title can be anything).
      const lt=page.pasted?page.base:(away&&a.title)||nameInLines(page,vc)||linkTitle(page.base,own||a.subtitle,page.between);
      const title=cardTitle(lt,vc);
      Object.assign(seen,{venue:vc,answer:a,subtitleUnderHeading:own||null,title});
      tape.row={title,museumId:vc,exUrl:url};
      got.push({venue_code:vc,title,start_date:page.start,end_date:page.end,
        summary:a.summary?composeSummary(cardTitle(a.english,vc),a.summary):"",url:page.link,
        notes:[page.noDates?(page.orderUnknown?DATES.ORDER_UNKNOWN_NOTE:page.shown?DATES.shownOnlyNote(page.shown,page.shownWhy):page.scriptDates?SCRIPT_DATES_NOTE:DATES.NO_DATES_NOTE):"",page.dateNote||"",
          ask.ok?"":"Description not written \u2014 "+ask.detail.replace(/\s+\[.*$/,"")].filter(Boolean).join(" ")});
    }catch(e){ fails.push({url,why:"Couldn\u2019t read it ("+String((e&&e.message)||e)+")."}); }
    finally{
      const failed=fails.length>failsBefore;
      tape.link={...seen,row:failed?null:got[got.length-1]};
      saveLookupTape(tape,{ok:!failed,said:failed?fails[fails.length-1].why:null});
    }
  }
  return {stopped:stopped(),got,fails,met:[...met],venues,venuesChanged};
}
//@piece readOutcome


// After the Read: what stays in the box (or list, or boxes) — the links that failed — and what the
// rows read come to: nothing read, a refused file, nothing new to propose (its line), or the cards.
// `held` is what Cancel import or the apply puts back (pendingAfterCancel, pendingAfterApply).
function readOutcome(input,out,{pages,pastes,rows,ignored}){
  const {kind,items,urls,pasted}=input, fromPasted=kind==="paste", fromPages=kind!=="links";
  const {got,fails}=out;
  const failed=new Set(fails.map(x=>x.url));
  const left=fails.map(x=>x.url).join("\n"), leftPages=pages.filter(p=>failed.has(p.url));
  // A pasted box stays when it was not read or failed.
  const readBox=new Map(pasted.map(p=>[p.box,p.url]));
  const leftPastes=pasteBoxes(pastes.filter(x=>filledBox(x)&&(!readBox.has(x)||failed.has(readBox.get(x)))));
  const pending=fromPasted?leftPastes:fromPages?leftPages:left;
  if(!got.length)return {pending};
  const res=analyzeProForma(proFormaCsv(got),rows,new Set(ignored.map(x=>x.key)),{notePrefix:""});
  if(res.error)return {pending,note:res.error};
  if(!res.props.length){
    // Every one quarantined: it says so, not "your ledger already matches" (her wording).
    return {pending,finished:true,tally:res.tally||null,
      note:"Read "+got.length+(fromPages?" page":" link")+(got.length===1?"":"s")+", but "+(res.tally&&res.tally.blocked>=got.length?"nothing to add \u2014 already in your quarantine.":"nothing new to propose \u2014 your ledger already matches "+(got.length===1?"it":"them")+".")};
  }
  return {pending,props:res.props,tally:res.tally||null,
    held:{kind,items:fromPasted?pasted.map(p=>({...p.box,url:p.url})):fromPages?items:urls}};
}
//@piece readStopping

// The progress line once Cancel is pressed mid-Read.
const readStopping=kind=>"Stopping after this "+(kind==="pages"||kind==="paste"?"page":"link")+"\u2026";
//@piece pendingAfterApply


// The import is finished: back in the box go the unread links plus the links of rejected cards,
// and of cards a partial apply left undecided (her decision); in Pages and Paste, those pages and
// boxes. `held` is what the Read read (readOutcome); with none, the links box.
function pendingAfterApply(held,proposals,decisions,{linkText,pages,pastes}){
  const back=proposals.filter((p,i)=>/^(rejected|undecided)$/.test(cardOutcome(p,decisions[i]))).map(p=>(p.cand||{}).exUrl).filter(Boolean);
  if(held&&held.kind==="paste"){
    const keys=new Set(back.map(u=>normalizeUrlKey(u)));
    return {kind:"paste",value:mergeBoxes(pastes,held.items.filter(p=>keys.has(normalizeUrlKey(p.url))))};
  }
  if(held&&held.kind==="pages"){
    const keys=new Set(back.map(u=>normalizeUrlKey(u)));
    return {kind:"pages",value:mergePages(pages,held.items.filter(p=>keys.has(normalizeUrlKey(p.url))))};
  }
  return {kind:"links",value:[...new Set([...linksIn(linkText),...back])].join("\n")};
}
//@piece pendingAfterCancel

// Cancel import after a Read puts every link (or page) it read back in the box (or list), stored (her decision).
function pendingAfterCancel(held,{linkText,pages,pastes}){
  if(!held)return null;
  if(held.kind==="paste")return {kind:"paste",value:mergeBoxes(pastes,held.items)};
  if(held.kind==="pages")return {kind:"pages",value:mergePages(pages,held.items)};
  return {kind:"links",value:[...new Set([...linksIn(linkText),...held.items])].join("\n")};
}
//@piece pickedPages

// Pages chosen: each file turned into its text now, the file itself never kept. Added to
// the list (and the store) at once, as typing fills the Links box. `files`: each
// {name,text}, or {name,failed:true,error} when the file could not be read; `parse` turns HTML into a document.
function pickedPages(pages,files,parse){
  const add=[], bad=[];
  for(const f of files){
    let r;
    try{ if(f.failed)throw f.error; r=savedPageReply(f.text,parse); }
    catch(err){ r={ok:false,why:"Couldn\u2019t read it ("+String((err&&err.message)||err)+")."}; }
    if(r.ok)add.push({url:r.res.url,title:r.res.title,name:f.name,text:r.res.full_content});
    else bad.push({url:"",why:f.name+": "+r.why});
  }
  return {list:mergePages(pages,add),bad,store:add.length>0};
}
