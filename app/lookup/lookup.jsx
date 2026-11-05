//@ The lookup itself, step by step (lookupCatalogue).
//@piece landOnCard


// Reset cards (her design): every lookup field blank, her marks kept, so the next
// "Find catalogue" runs the whole route.
// A LOOKUP LANDS ON THE CARD AS IT IS NOW: when a search, Re-check or Relabel finishes, only
// the fields it changed are written, onto the ledger as it stands then, so marks made while it
// ran are kept (docs/app.md, "The route"; LC-001 to LC-005).
function landOnCard(now,id,before,after){
  return now.map(r=>{
    if(r.id!==id)return r;
    const out={...r};
    for(const k of Object.keys(after))if(after[k]!==before[k])out[k]=after[k];
    return out;
  });
}
//@piece resetCard

function resetCard(r){
  return{...r,looked:false,hasCatalogue:"unknown",catalogueTitle:null,isbn13:null,publisher:null,
    publisherUrl:null,publisherResult:null,shopUrl:null,shopState:null,shopChange:null,englishCheck:null,originalEdition:null,otherVenueBook:null,alsoVersion:null,
    editions:null,editionPick:null};
}
//@piece cardsToReset

// The cards Reset cards can offer: searched ones whose title, catalogue title
// or venue carry what she typed. Accents and capitals do not count.
function cardsToReset(rows,q){
  const k=foldText;
  const want=k(q).trim();
  if(!want)return[];
  return rows.filter(r=>r.looked&&[r.title,r.catalogueTitle,MU[r.museumId]&&MU[r.museumId].short,MU[r.museumId]&&MU[r.museumId].name]
    .some(t=>k(t).includes(want)));
}
//@piece LOOKUP_STAGE


// THE PROGRESS LINE (her decision): at most four labels, in this order, each at most
// once, never back to an earlier one. The book's page and the facts round share one.
// Re-check stops at the first (upTo). PL-001 to PL-005.
const LOOKUP_STAGE={shop:1,web:2,page:3,facts:3,publisher:4};
//@piece lookupLabel

function lookupLabel(n,foreign){
  return n===1?"Searching venue shop\u2026":n===2?"Searching more broadly\u2026"
    :n===3?(foreign?"Finding the ISBN, publisher and English edition\u2026":"Finding the ISBN and publisher\u2026")
    :n===4?"Looking for the publisher\u2019s page\u2026":"";
}
//@piece slots


// The lookup's calls, counted and timed for the diagnostic. At most three connector
// calls and two Claude reads run at once.
function slots(n){
  let busy=0; const waiting=[];
  return async fn=>{
    if(busy>=n)await new Promise(r=>waiting.push(r));
    busy++;
    try{ return await fn(); }
    finally{ busy--; const next=waiting.shift(); if(next)next(); }
  };
}
//@piece lookupIo

function lookupIo(hooks,opts){
  const h=hooks||{}, o=opts||{};
  const mcp=slots(3), claude=slots(2);
  const st={search:0,fetch:0,read:0,waits:0,group:0,step:"",ms:{},order:[],shown:0};
  const timed=async(kind,run)=>{
    st[kind]++; if(!st.group)st.waits++;
    const step=st.step||"start", t0=Date.now();
    try{ return await run(); }
    finally{ if(!(step in st.ms))st.order.push(step); st.ms[step]=(st.ms[step]||0)+Date.now()-t0; }
  };
  return{
    phase:p=>{
      st.step=p;
      const n=LOOKUP_STAGE[p]||0;
      if(n>st.shown&&n<=(o.upTo||4)){ st.shown=n; if(h.label)h.label(lookupLabel(n,o.foreign)); }
    },
    prepareShop:async id=>{ if(h.prepareShop)await h.prepareShop(id); },
    search:(o,q)=>timed("search",()=>mcp(()=>searchWeb(o,q))),
    fetch:(u,o,q,opts)=>timed("fetch",()=>mcp(()=>fetchPage(u,o,q,opts))),
    read:p=>timed("read",()=>claude(()=>readResults(p))),
    // Calls launched together count as one wait.
    together:async jobs=>{ st.waits++; st.group++; try{ return await Promise.all(jobs.map(j=>j())); }finally{ st.group--; } },
    counts:()=>({search:st.search,fetch:st.fetch,read:st.read,calls:st.search+st.fetch+st.read,waits:st.waits}),
    summary:()=>"Lookup: "+(st.search+st.fetch+st.read)+" calls ("+st.search+" searches, "+st.fetch+" page opens, "+st.read
      +" Claude reads), "+st.waits+" waits in a row. Time in calls: "
      +(st.order.map(k=>k+" "+(st.ms[k]/1000).toFixed(1)+"s").join(", ")||"none")+".",
  };
}
//@piece settle


// A book the shop step found is in the museum shop; its link is filed only when it is
// on the shop (shopLinkOf) — shopStep has already refused the pages it opened.
// `seen`: the text the read was given, which an ISBN must appear in (toIsbn13).
// `blocked`: false, or why the shop step could not read the shop ("blocked", "script" or "parallel");
// the row says so.
function settle(row,o,dom,detail,fromShopStage,blocked,seen){
  const link=isTicketLink(o.shopUrl)?null:(o.shopUrl||null);
  const onShop=!!shopLinkOf(o,dom);
  if(o.found&&(o.catalogueTitle||o.isbn13)){
    // pageUrl is carried BESIDE the row: the book's page may be a shop's or a
    // publisher's, and only a link on the venue's shop is filed as shopUrl.
    return{ok:true,detail,pageUrl:link,
      shopCandidate:(!fromShopStage&&onShop)?link:null,
      row:{...row,looked:true,hasCatalogue:"yes",
      shopState:fromShopStage?"shop":blocked||"web",shopChange:null,
      catalogueTitle:o.catalogueTitle||null,isbn13:toIsbn13(o.isbn13,seen||""),
      publisher:o.publisher||null,publisherUrl:publisherLinkOf(o.publisherUrl,row.publisher||o.publisher,dom,row.museumId),
      publisherResult:null,
      shopUrl:fromShopStage&&onShop?link:null}};
  }
  if(fromShopStage)return null;          // not found in the shop — go wider
  return{ok:true,detail,row:composeRow(row,{found:false,blocked})};
}
//@piece lookupCatalogue


// THE LOOKUP. Every lookup starts from a blank card (her decision: "Search again
// literally means search again"); the caller decides whether the result replaces the
// card. Resolves to {ok, row, detail, trouble?, troubleLang?, calls}.
// Read docs/app.md §1 before changing the order of the phases.
async function lookupCatalogue(row,hooks){
  row=resetCard(row);
  const mu=MU[row.museumId];
  const dom=shopDomain(mu);
  const title=String(row.title||"").trim();
  const venue=mu?mu.name:"";
  const foreign=!!(mu&&mu.english===false);
  const io=lookupIo(hooks,{foreign});
  // The first label is set before anything is awaited, so no other line shows first.
  io.phase(dom?"shop":"web");
  const log=[];
  const done=o=>({...o,detail:[io.summary()].concat(log.filter(Boolean)).join("\n"),calls:io.counts()});

  // ── PHASE 1: FIND THE BOOK. Go to the shop — open its own pages, as she does by hand;
  // never a general web search, which filed the National Gallery's list of 32 books as
  // the book (Zurbarán). The wider web only because the shop had nothing.
  let hit=null, fromShop=false, blocked=false, unnamed=false;
  let webRes=[];        // the web search's results, read again by every later step
  const s1=await shopStep(row,io);
  if(s1.ran){
    log.push(s1.detail);
    if(!s1.ok)return done({row,ok:false});
    blocked=s1.blocked||false;
    if(s1.data){ hit=settle(row,s1.data,dom,"",true,false,resultsText(s1.results)); fromShop=!!hit; }
  }
  if(!hit){
    io.phase("web");
    const s2=await io.search(
      "Confirm whether a printed catalogue was published for the exhibition “"+title+"” at "
        +venue+", and give its exact title, ISBN-13 and publisher. Museums often state these in a "
        +"press release; art-book publishers and booksellers list them too.",
      [title+" exhibition catalogue ISBN publisher",
       venue+" "+title+" catalogue book",
       venue+" "+title+" press release catalogue"].concat(localCatalogueQuery(mu,row)));
    log.push(s2.detail);
    if(!s2.ok)return done({row,ok:false});
    webRes=s2.results||[];
    if(!s2.results.length)return done({ok:true,row:composeRow(row,{found:false,blocked})});
    const r2=await io.read((foreign?READ_RULES_FOREIGN:READ_RULES)
      +"\nExhibition: "+title+"\nVenue: "+venue+(dom?"\nIts shop is at "+dom:"")+"\n\n"
      // Read whole (the shop step's cap), never cut to 700 characters (Botticelli).
      +resultsForPrompt(s2.results,6000,{words:[title,venue],dom})+READ_SHAPE);
    log.push(r2.detail);
    if(!r2.ok)return done({row,ok:false});
    let d2=r2.data||{};
    // A "catalog" link onto the venue's own shop, read off the results in code
    // (catalogueLinkOn), goes to the check that opens shop links when the read found
    // the book and gave no shop link of its own.
    const catLink=catalogueLinkOn(s2.results,dom);
    if(catLink&&d2.found&&!d2.shopUrl){ d2={...d2,shopUrl:catLink}; log.push("A catalogue link onto the museum shop, read off the results: "+catLink); }
    // Another venue's catalogue is not this show's (her decision, NG van Hemessen): a
    // book found on the web counts only when the read ties it to THIS venue's show.
    if(d2.found&&d2.thisVenue!==true){
      log.push("Not filed: “"+(d2.catalogueTitle||"the book found")+"” is not tied to this venue’s show in the results.");
      d2={};
    }
    // A catalogue tied to this venue but named by neither title nor ISBN (a press release's
    // "the accompanying catalog", Hubert Robert) goes on to the facts round, which looks
    // for both; neither found there → no catalogue. UN-001 to UN-003.
    if(d2.found&&d2.thisVenue===true&&!d2.catalogueTitle&&!d2.isbn13){
      unnamed=true;
      log.push("The results say a catalogue exists"+(d2.publisher?" ("+d2.publisher+")":"")+" but give no title or ISBN — looking for them.");
      hit={ok:true,pageUrl:null,row:{...row,looked:true,hasCatalogue:"yes",shopState:blocked||"web",shopChange:null,
        catalogueTitle:null,isbn13:null,publisher:d2.publisher||null,
        publisherUrl:publisherLinkOf(d2.publisherUrl,d2.publisher,dom,row.museumId),publisherResult:null,shopUrl:null}};
    }else{
      hit=await confirmShopLink(settle(row,d2,dom,"",false,blocked,resultsText(s2.results)),io);
      if(hit&&hit.detail)log.push(hit.detail.trim());
      if(!hit||!hit.row||hit.row.hasCatalogue!=="yes")return done({ok:true,row:composeRow(row,{found:false,blocked})});
    }
  }

  const r=hit.row;
  const F={found:true,title:r.catalogueTitle,isbn:cleanIsbn(r.isbn13),publisher:r.publisher,
    pubFrom:r.publisher?(fromShop?"the museum shop":"general results"):null,
    publisherUrl:r.publisherUrl,publisherResult:null,shopState:r.shopState,shopUrl:r.shopUrl,
    blocked,englishCheck:null,pubPageRead:false};
  let trouble=hit.trouble||null, troubleLang=false;
  const fault=d=>{ if(!trouble)trouble=d; };
  // Every page opened, by address: nothing is opened twice.
  const pages=new Map();
  if(hit.pageUrl&&hit.pageResults)pages.set(normalizeUrlKey(hit.pageUrl),hit.pageResults);
  // A publisher, offered with where it was read; it replaces the one held only when
  // it is more trusted and a different house.
  const offerPublisher=(name,from)=>{
    const n=String(name||"").trim();
    if(!n)return;
    if(!F.publisher){ F.publisher=n; F.pubFrom=from; return; }
    if(sameHouse(F.publisher,n)){ if(PUBLISHER_TRUST[from]>PUBLISHER_TRUST[F.pubFrom])F.pubFrom=from; return; }
    if(PUBLISHER_TRUST[from]>PUBLISHER_TRUST[F.pubFrom]){
      log.push("Publisher: "+n+" (from "+from+"), replacing “"+F.publisher+"” (from "+F.pubFrom+").");
      F.publisher=n; F.pubFrom=from;
      F.publisherUrl=publisherLinkOf(F.publisherUrl,n,dom,row.museumId);
    }
  };

  // ── PHASE 2a: THE BOOK'S OWN PAGE, when the ISBN or the publisher is missing. The
  // ISBN is read in code; at an English-speaking venue Claude reads the page for what
  // is still missing; at a non-English venue the facts round reads it, in its one read.
  let bookPage=null;
  if(hit.pageUrl&&(!F.isbn||!F.publisher)){
    io.phase("page");
    const key=normalizeUrlKey(hit.pageUrl);
    let res=pages.get(key);
    if(res)log.push("The book’s page, already open.");
    else{
      // The venue's own shop page gets the blank-page retry (openShopPage); a publisher's does not.
      const f=await (shopLinkOf({shopUrl:hit.pageUrl},dom)?(...a)=>openShopPage(io.fetch,...a):io.fetch)(hit.pageUrl,
        "The ISBN-13, the publisher, and any link to the publisher’s own page for the book "
          +"“"+(F.title||title)+"”, including any details or specification panel on the page.",
        [(F.title||title)+" ISBN publisher details"],{full:true});
      log.push(f.detail);
      if(!f.ok)fault(f.detail);
      else{ res=f.results; pages.set(key,res); }
    }
    if(res&&res.length){
      bookPage={url:hit.pageUrl,results:res};
      if(!F.isbn){ const c=isbnOnPage(pageTextOf(res)); if(c){ F.isbn=c; log.push("ISBN read off the book’s page in code: "+c); } }
      if(!foreign&&(!F.publisher||!F.isbn)){
        const rd=await io.read(PAGE_RULES+"\nBook: "+(F.title||title)+"\nExhibition venue: "+venue+"\n\n"+pageForPrompt(res)+PAGE_SHAPE);
        log.push(rd.detail);
        if(!rd.ok)fault(rd.detail);
        else{
          const d=rd.data||{};
          if(!F.isbn){ const c=toIsbn13(d.isbn13,resultsText(res)); if(c){ F.isbn=c; log.push("ISBN read off the book’s page: "+c); } }
          offerPublisher(d.publisher,"the book’s page");
          if(!F.publisherUrl)F.publisherUrl=publisherLinkOf(d.publisherUrl,F.publisher,dom,row.museumId);
        }
      }
    }
  }

  // ── PHASE 2b: THE FACTS ROUND, in one go. The facts search and, at a non-English
  // venue, the edition search run together; one Claude read covers both.
  const needFacts=foreign||!F.isbn||!F.publisher||F.pubFrom==="general results";
  let factsRes=[], edRes=[], factsOk=false, langStopped=false, read=null;
  const found2=[];      // every phase-2 result, for the publisher's site
  if(needFacts){
    io.phase("facts");
    const book=F.title||title;
    const pubName=F.publisher&&!isSelfPublisher(F.publisher,row.museumId)?publisherToFind(F.publisher,row.museumId):"";
    const jobs=[()=>io.search(
      "The ISBN-13, publisher, language and exact printed title of the exhibition catalogue “"+book+"”"
        +(F.isbn?", ISBN "+F.isbn:"")+(F.publisher?", published by "+F.publisher:"")+", for the exhibition at "+venue+".",
      // The venue's name is in a query.
      F.isbn?[F.isbn,F.isbn+" "+book,book+" "+venue+" catalogue"]
            :[book+" "+venue+" catalogue ISBN",book+" "+(F.publisher||"exhibition catalogue")+" ISBN",book+" catalogue publisher"])];
    if(foreign)jobs.push(()=>io.search(
      "An ENGLISH-language edition of the exhibition catalogue “"+book+"” ("+venue
        +(F.isbn?", original ISBN "+F.isbn:"")+"): its English title and its own ISBN, as library catalogues and publishers record it.",
      editionQueries(mu,row,book,F.isbn,pubName)));
    const [fs,es]=await io.together(jobs);
    log.push(fs.detail); if(es)log.push(es.detail);
    factsOk=fs.ok;
    if(fs.ok)factsRes=fs.results; else fault(fs.detail);
    if(es&&es.ok)edRes=es.results;
    else if(es){ fault(es.detail); langStopped=true; }
    if(!fs.ok&&foreign)langStopped=true;
    const page=foreign?bookPage:null;
    if(factsRes.length||edRes.length||page){
      const rd=await io.read(factsPrompt({book,show:title,venue,isbn:F.isbn,bookPage:page,facts:factsRes,editions:edRes,
        earlier:notIn(webRes,[...factsRes,...edRes]),foreign,needTitle:unnamed}));
      log.push(rd.detail);
      if(rd.ok)read=rd.data||{};
      else{ fault(rd.detail); if(foreign)langStopped=true; }
    }
    found2.push(...factsRes,...edRes);
    const given=[...(page?page.results:[]),...factsRes,...edRes,...webRes];
    // The book's own title, for a catalogue known so far by no title (unnamed), as printed.
    if(unnamed&&!F.title&&!foreign&&read&&read.title){
      const tp=titleAsPrinted(read.title,given);
      if(tp.onPage){ F.title=tp.title; log.push("The book’s title, from the results: “"+tp.title+"”."); }
    }
    // The ISBN: the book's page in code (above), the results in code, then Claude's —
    // only if the text it was given prints it.
    // Matched on the book's title once it is known, never the show's (Hubert Robert: the
    // show's dates matched only a French bookseller's listing).
    if(!F.isbn){ const c=isbnInResults(factsRes,F.title||book); if(c){ F.isbn=c; log.push("ISBN read off the search results in code: "+c); } }
    if(!F.isbn&&read){ const c=toIsbn13(read.isbn13,resultsText(given)); if(c){ F.isbn=c; log.push("ISBN from the read, printed in the results: "+c); } }
    if(read)notABooklet(F,given,pagesPrinted(read.pages,given),log);
    // The publisher, in order of trust (her decision, Botticelli).
    const onIsbn=F.isbn?publisherOnIsbnResults(given,F.isbn):null;
    if(onIsbn)offerPublisher(onIsbn,"the ISBN’s results");
    else if(F.isbn&&factsOk)log.push("Publisher from the ISBN: the results carrying it don’t agree on one.");
    if(read){
      offerPublisher(read.pagePublisher,"the book’s page");
      offerPublisher(read.publisher,"general results");
      if(!F.publisherUrl&&read.pagePublisherUrl)F.publisherUrl=publisherLinkOf(read.pagePublisherUrl,F.publisher,dom,row.museumId);
    }
    oneBook(F,given,log,dom,row.museumId);
  }

  // ── PHASE 2c: LAST TRY FOR THE ISBN — open up to two results about the book, whole.
  if(!F.isbn&&factsOk){
    const open=resultsCarrying(factsRes,F.title||title).filter(x=>x.url&&!isTicketLink(x.url)).slice(0,2);
    const already=open.filter(x=>pages.has(normalizeUrlKey(x.url)));
    const fresh=open.filter(x=>!pages.has(normalizeUrlKey(x.url))).map(x=>x.url);
    const opened=already.flatMap(x=>pages.get(normalizeUrlKey(x.url)));
    let onPages=opened.length?isbnInResults(opened,F.title||title):null;
    if(!onPages&&fresh.length){
      const fp=await io.fetch(fresh,"The ISBN of the book “"+(F.title||title)+"”.",[(F.title||title)+" ISBN"],{full:true});
      log.push(fp.detail);
      if(!fp.ok)fault(fp.detail);
      else{ for(const x of fp.results){ pages.set(normalizeUrlKey(x.url),[x]); opened.push(x); } onPages=isbnInResults(fp.results,F.title||title); }
    }
    if(onPages&&onPages===F.notIsbn){ log.push("The pages found give the booklet’s ISBN again — not filed."); onPages=null; }
    if(onPages){
      F.isbn=onPages; log.push("ISBN read off the pages about this book, in code: "+onPages);
      const p=publisherOnIsbnResults([...found2,...opened],onPages);
      if(p)offerPublisher(p,"the ISBN’s results");
    }
    else log.push("No ISBN in the web search, or on the pages it found about this book.");
  }
  if(unnamed&&!F.title&&!F.isbn){
    log.push("No title or ISBN found for the catalogue the results mention, so it is not filed.");
    return done({ok:true,row:composeRow(row,{found:false,blocked}),...(trouble?{trouble}:{})});
  }
  if(F.publisher)log.push("Publisher: "+F.publisher+" — from "+F.pubFrom+(F.pubFrom==="general results"?" (a guess).":"."));

  // ── PHASE 3: EVERY VERSION, IN HER ORDER (code only; docs/catalogue_versions.md).
  // The book found so far is this showing's catalogue; the read's other printings and
  // editions join it only when proved. putInOrder sorts them; the first starts picked.
  const everything=[...(bookPage?bookPage.results:[]),...factsRes,...edRes,...webRes,...[...pages.values()].flat()];
  const said=read&&read.language?String(read.language):"";
  const lang=foreign?langName(said):"English";
  if(foreign){
    if(langStopped){ F.englishCheck="stopped"; troubleLang=true; }
    else if(!said){ F.englishCheck="unknownlang"; log.push("Language check: nothing says, so the book stands as found."); }
    else if(isEnglishLang(said)){ F.englishCheck="english"; log.push("Language check: "+said+"."); }
    else{
      // The book's own title, if the results print it.
      const own=read.title?titleAsPrinted(read.title,[...(bookPage?bookPage.results:[]),...factsRes,...edRes]):null;
      if(own&&own.onPage)F.title=own.title;
      log.push("Language check: "+said+(own&&own.onPage?" — its own title “"+own.title+"”.":"."));
    }
  }
  const found=foundVersion(F,foreign&&langStopped?null:lang,read?pagesPrinted(read.pages,everything):null,everything,row.museumId,hit.pageUrl||F.shopUrl);
  const versions=[found];
  const add=list=>{ for(const v of list)if(!versions.some(x=>x.isbn13===v.isbn13))versions.push(v); };
  if(F.isbn&&read)add(printingsOf(read.versions,
    {isbn:F.isbn,title:F.title||title,titles:[read.title],pages:found.pages,lang:found.lang},everything,row.museumId));
  // Editions in other languages only once the book's own language is known; then the
  // other printings of each edition proved (Vasari: the Nationalmuseum's English book).
  if(read&&found.lang){
    const eds=editionsOf(read.editions,found,everything,row.museumId,log);
    add(eds);
    for(const e of eds.filter(e=>e.showing==="this"))
      add(printingsOf(read.editions,{isbn:e.isbn13,title:e.title,pages:e.pages,lang:e.lang},everything,row.museumId));
  }
  foldCoEditions(versions,everything,row.museumId,log);
  const thisEnglish=()=>versions.some(v=>v.showing==="this"&&isEnglishLang(v.lang));
  const notEnglish=foreign&&!!found.lang&&!isEnglishLang(found.lang);
  if(notEnglish){
    F.englishCheck=thisEnglish()?"english":"shops";
    if(!thisEnglish()&&Array.isArray(read.editions)&&read.editions.length)log.push("English edition: none proved to be this catalogue's.");
  }
  const F0={...F};   // the book as found, before any pick
  putInOrder(versions,row.museumId);
  const pick=0;
  log.push(versions.length+" version"+(versions.length===1?"":"s")+" found; first in her order: "+(versions[0].isbn13||"the book found")+".");
  takeVersion(F,versions[0],log);

  // ── PHASE 4: THE PUBLISHER'S PAGE, ONCE, FOR THE PICKED BOOK. When it is this show's
  // book and no English version is known, its publisher's page may list an English edition.
  const wantEditions=notEnglish&&!thisEnglish()&&versions[0].showing==="this";
  {
    const p4=await findPublisherPage(F,{io,log,row,dom,venue,found:found2,pages,wantEditions});
    if(p4.trouble)fault(p4.trouble);
    const ed=p4.edition;
    if(ed&&!versions.some(v=>v.isbn13===ed.isbn13||v.alsoIsbn13===ed.isbn13)){
      log.push("English edition on the publisher’s own page: “"+ed.title+"”, ISBN "+ed.isbn13+".");
      const en={title:ed.title,lang:"English",binding:null,pages:null,publisher:found.publisher,isbn13:ed.isbn13,
        alsoIsbn13:null,showing:"this",proofUrl:ed.link,note:"the publisher’s own page lists it",_pub:F.publisher};
      versions.push(en);
      putInOrder(versions,row.museumId);
      if(versions[0]===en){
        F.title=ed.title; F.isbn=ed.isbn13;
        F.publisherUrl=ed.link; F.publisherResult=ed.linkResult;
        F.shopState=F.blocked||"web"; F.shopUrl=null;
      }
      F.englishCheck="english";
    } else if(wantEditions){
      // "Checked the publisher's site" only when its page was really read (Canaletto).
      F.englishCheck=F.pubPageRead?"publisher":"shops";
      log.push("English edition: none found"+(F.pubPageRead?" — the publisher’s own page read ("+F.publisherUrl+").":"; the publisher’s own page for it was not read."));
    }
  }
  // ── PHASE 4b: EVERY BOOK FOUND ON THE WEB, LOOKED FOR AGAIN ON THE SHOP'S LIST READ IN
  // PHASE 1 (bookOnShelfAfterWeb), so the shop line is true whichever she picks (her
  // decision). A page opened for one book is not opened again for the next. SV-001 to SV-005.
  const shelfSkip=new Set(shopPagesFor(mu,title).map(normalizeUrlKey)), shelfSeen=new Map();
  const onShelf=async(G,v)=>{
    if(!(G.title&&G.shopState==="web"&&s1.ran&&(s1.results||[]).length))return;
    io.phase("page");
    const {url,failed}=await bookOnShelfAfterWeb(G,v,s1.results,dom,shelfSkip,io,log,shelfSeen);
    if(url){ G.shopState="shop"; G.shopUrl=url; }
    // Not known: no shop answer for this book, and the lookup did not finish.
    else if(failed){ G.shopState=null; fault("The museum shop’s page for “"+G.title+"” couldn’t be read — "+failed+"."); }
  };
  await onShelf(F,versions[pick]);
  // Each version's book fields, for a change of pick on the card; the pick's are final.
  for(const v of versions){
    if(v===versions[pick]){ v.card=bookFieldsOf(F); continue; }
    const G={...F0}; takeVersion(G,v,[]);
    await onShelf(G,v);
    v.card=bookFieldsOf(G);
  }
  // A book in the museum shop goes first at an English-language venue (her decision); if that
  // moves another book first, its own stored fields become the card's.
  for(const v of versions)if(v.card&&v.card.shopState==="shop")v.shopFirst=true;
  const was=versions[pick];
  putInOrder(versions,row.museumId);
  if(versions[pick]!==was){
    const c=versions[pick].card;
    log.push("In the museum shop, so first: “"+c.catalogueTitle+"”"+(c.isbn13?", ISBN "+c.isbn13:"")+".");
    F.title=c.catalogueTitle; F.isbn=c.isbn13; F.publisher=c.publisher; F.publisherUrl=c.publisherUrl;
    F.publisherResult=c.publisherResult; F.shopState=c.shopState; F.shopUrl=c.shopUrl;
  }
  F.editions=versions.map(storedVersion);
  F.editionPick=pick;

  // ── PHASE 5: THE ROW, ONCE.
  return done({ok:true,row:composeRow(row,F),...(trouble?{trouble}:{}),...(troubleLang?{troubleLang:true}:{})});
}
