//@ Working out the publisher and its own page.
//@piece PUBLISHER_WORDS


// Which result is the publisher's own site, in code: a publisher's name is in its
// hostname (hannibalbooks.be). Shared words are dropped ("university" too: Yale
// University Press is yalebooks.yale.edu); every remaining word must be in the host.
const PUBLISHER_WORDS=new Set(["books","book","press","publishing","publishers","publisher",
  "editions","edition","verlag","publications","university","the","and","of","co","inc","ltd",
  "llc","bv","nv"]);
//@piece publisherWords

// A joint publisher on her PUBLISHER_SITES list is used only when the name finds none.
const publisherWords=name=>foldText(name).split(/[^a-z0-9]+/).filter(w=>w.length>2&&!PUBLISHER_WORDS.has(w));
//@piece publisherDomainFrom

function publisherDomainFrom(results,name){
  const words=publisherWords(name);
  const listed=listedPublisherSite(name);
  for(const r of (results||[])){
    let host;
    try{ host=new URL(String(r&&r.url||"")).hostname.toLowerCase(); }catch{ continue; }
    const flat=host.replace(/[^a-z0-9]/g,"");
    if(words.length&&words.every(w=>flat.includes(w)))return host;
  }
  const bare=h=>h.replace(/^www\./,"");
  if(listed)for(const r of (results||[])){ const h=hostOf(String(r&&r.url||"")); if(h&&bare(h)===bare(listed))return h; }
  return null;
}
//@piece SELF_PUBLISHERS


// ── A MUSEUM'S OWN IMPRINT HAS NO PUBLISHER PAGE TO FIND (docs/app.md §1) ──────
// Its "publisher page" is the museum shop, so looking costs searches for nothing.
// SELF_PUBLISHERS is her list, grown only when she adds one. A blockbuster printed by
// an art-book house, or a joint show printed by the other museum, is still looked for.
const SELF_PUBLISHERS = new Set([
  "national gallery global",              // ng — her row, Zurbaran
  "national gallery london",              // ng — the same imprint as Yale (its distributor) names it, her addition (Millet)
  "metropolitan museum of art",           // met
  "british museum press",                 // brit — her addition (Bayeux Tapestry)
  "editions les arts decoratifs",         // mad — her addition (Christofle); normPublisher drops the accents
  "musee des arts decoratifs",            // mad — the same imprint under the museum's name, her addition (Christofle again)
  "museum of modern art",                 // moma — her addition (The Surrealist Book)
  "museum of modern art new york",        // moma — the same, as the lookup also read it (Brancusi)
  "art institute of chicago",             // artic — her addition
  "cincinnati art museum",                // cincinnati — her addition
  "frick collection new york",            // frick — her addition (Ruffles & Ribbons)
  "national gallery publications limited", // ng — her addition (Venice: Canaletto and His Rivals)
  "national gallery company",              // ng — her addition (Ed Ruscha: Course of Empire)
]);
//@piece PUBLISHER_SITES

// JOINT PUBLISHERS WHOSE NAME IS NOT IN THEIR ADDRESS — her list, kept short. An entry
// is added only when her card says "Couldn't work out the publisher's own website" for
// a publisher that has one, and she asks; never from a general list. Matched on the
// name's own words (publisherWords). Used only when the name finds no site. PS-001 to PS-006.
const PUBLISHER_SITES={
  "Rizzoli Electa":"https://www.rizzoliusa.com/",
  "DelMonico Books · Prestel":"https://delmonicobooks.com/",
};
//@piece listedPublisherSite

function listedPublisherSite(name){
  const k=publisherWords(name).join(" ");
  if(!k)return null;
  for(const [n,u] of Object.entries(PUBLISHER_SITES))if(publisherWords(n).join(" ")===k)return hostOf(u);
  return null;
}
//@piece normPublisher

// A leading "The" and any punctuation are noise, not a different publisher.
function normPublisher(name){
  return foldText(name).replace(/[^a-z0-9]+/g," ").trim().replace(/^the\s+/,"");
}
//@piece NOT_SELF_PUBLISHERS

// A publisher carrying the venue's FULL name, whole words, is the venue (her decision,
// on trial; never the chip name). Known misfire: a namesake museum — she lists it in
// NOT_SELF_PUBLISHERS. Too many misfires → back to her list alone (delete the venue
// test in isVenueImprint). C-070 to C-078e.
const NOT_SELF_PUBLISHERS = new Set([
  // her entries, normalised as normPublisher writes them
]);
//@piece isSelfPublisher

function isSelfPublisher(name,museumId){
  return isVenueImprint(publisherToFind(name,museumId),museumId);
}
//@piece isVenueImprint

// One name, taken whole: is it the venue's own imprint?
function isVenueImprint(name,museumId){
  const n=normPublisher(name);
  if(!n||NOT_SELF_PUBLISHERS.has(n))return false;
  if(SELF_PUBLISHERS.has(n))return true;
  const v=normPublisher(MU[museumId]&&MU[museumId].name);
  return v.length>=6&&(" "+n+" ").includes(" "+v+" ");
}
//@piece cleanPublisherUrl


// The publisher's own page: an art-book house often lists the book long after the shop
// sells out. A link is taken only if it is a real address and not on the venue's own
// shop. C-032 to C-038.
function cleanPublisherUrl(u,dom){
  if(!u)return null;
  const t=String(u).trim();
  if(!urlLooksValid(t))return null;
  try{ if(dom&&new URL(t).hostname.toLowerCase().includes(String(dom).toLowerCase()))return null; }catch{ return null; }
  return t;
}
//@piece CO_EDITION_MARKS


// Only the publisher is the publisher (her decision, Millet): a link a read hands over
// is filed only on the publisher's own site; a distributor's page is dropped and the
// publisher step runs. Self-published → no link.
// "X in association with Y": Y is the publisher (her decision). A co-edition — "X /
// Venue", "X and Venue", "X with Venue", "X & Venue" — X is the publisher, for every
// verdict (her decision, Turner). Strongest mark first, so "Thames & Hudson / Venue"
// keeps its "&"; never a comma ("The Museum of Modern Art, New York" is one venue).
const CO_EDITION_MARKS=[/\s*\/\s*/,/\s*;\s*/,/\s+with\s+/i,/\s+and\s+/i,/\s+&\s+/];
//@piece publisherToFind

function publisherToFind(name,museumId){
  const s=String(name||"").trim();
  const m=s.match(/\bin\s+association\s+with\s+(.+)$/i);
  const y=m?m[1].replace(/[\s.,;:]+$/,"").trim():"";
  if(y)return y;
  if(museumId){
    for(const mark of CO_EDITION_MARKS){
      const parts=s.split(mark).map(x=>x.trim()).filter(Boolean);
      if(parts.length<2)continue;
      const others=parts.filter(x=>!isVenueImprint(x,museumId));
      if(others.length&&others.length<parts.length)return others[0];
    }
  }
  return s;
}
//@piece publisherLinkOf


function publisherLinkOf(u,publisher,dom,museumId){
  publisher=publisherToFind(publisher,museumId);
  const t=cleanPublisherUrl(u,dom);
  if(!t||!publisher||isSelfPublisher(publisher,museumId))return null;
  return publisherDomainFrom([{url:t}],publisher)?t:null;
}
//@piece sameAddress


// A link read off a listing is checked: on the publisher's own host, and not the
// listing itself. A differing #fragment is a different address — Hannibal addresses
// its books by fragment.
function sameAddress(a,b){
  const strip=u=>{try{const x=new URL(String(u));return (x.origin+x.pathname).replace(/\/+$/,"")+x.search;}catch{return String(u||"").trim();}};
  return strip(a)===strip(b);
}
//@piece deepLinkOn

function deepLinkOn(u,host,container){
  if(!u)return null;
  const t=String(u).trim();
  if(!urlLooksValid(t))return null;
  let h; try{ h=new URL(t).hostname.toLowerCase(); }catch{ return null; }
  if(h!==String(host||"").toLowerCase())return null;
  if(container&&sameAddress(t,container)&&!/#/.test(t))return null;
  return t;
}
//@piece PUBLISHER_LABEL


// The publisher, read off the ISBN (her decision, Botticelli: three lookups gave three
// publishers). Only results carrying the ISBN count, and only their LABELLED publisher;
// each result votes once, and one house's names fold together. Two agreeing votes,
// ahead of any other, or nothing. The label must not sit inside a longer word (an
// ASCII \b cannot see "É").
const PUBLISHER_LABEL=/(?<!\p{L})(?:publisher|published by|[ée]diteur|[ée]dit[ée] par|editore|editorial|verlag|uitgever(?:ij)?)\s*:?\s*\[?([^\]\n|(]{2,70}?)(?:\]|\s*,\s*(?:19|20)\d\d|\s*\(|\n|$)/giu;
//@piece houseWords

function houseWords(n){
  return normPublisher(n).split(" ").filter(w=>w.length>2&&!PUBLISHER_WORDS.has(w)&&!["fonds","editions","ed","sa","srl","gmbh"].includes(w));
}
//@piece publisherGroups

function publisherGroups(results,isbn){
  const d=String(isbn||"").replace(/\D/g,"");
  if(d.length!==13)return [];
  const groups=[];
  for(const r of (results||[])){
    const text=(r&&r.title||"")+"\n"+oneText(r);
    if(!text.replace(/[^0-9]/g,"").includes(d)&&!String((r&&r.url)||"").includes(d))continue;
    const seen=new Set();
    // Links read as their words, addresses dropped: "/editeur-imprimeur/…" in a link is
    // not a label (Hubert Robert, Paris Musées).
    const words=text.replace(/\[([^\]]*)\]\([^)]*\)/g,"$1").replace(/https?:\/\/\S+/g," ");
    for(const m of words.matchAll(PUBLISHER_LABEL)){
      const name=stripMd(m[1]).replace(/[\s.,;:]+$/,"").trim();
      if(/[%[\]()]|\/\S/.test(name))continue;
      const w=houseWords(name);
      if(!w.length)continue;
      let g=groups.find(g=>w.some(x=>g.words.some(y=>x.includes(y)||y.includes(x))));
      if(!g){ g={words:w,names:[],votes:0}; groups.push(g); }
      if(seen.has(g))continue;
      seen.add(g); g.votes++; g.names.push(name);
    }
  }
  return groups.sort((a,b)=>b.votes-a.votes);
}
//@piece groupName

// The spelling most results use, ordinary capitals preferred over SHOUTING.
function groupName(g){
  const count=new Map();
  for(const n of g.names)count.set(n,(count.get(n)||0)+1);
  return [...count.entries()].sort((a,b)=>b[1]-a[1]||(a[0]===a[0].toUpperCase())-(b[0]===b[0].toUpperCase()))[0][0];
}
//@piece publisherOnIsbnResults

function publisherOnIsbnResults(results,isbn){
  const groups=publisherGroups(results,isbn), top=groups[0];
  if(!top||top.votes<2||(groups[1]&&groups[1].votes===top.votes))return null;
  return groupName(top);
}
//@piece editionOnPublisherPage


// An English edition the publisher's own page lists with its own ISBN: the same house
// (rule one), so accepted. Its link on that page, if it gives one.
function editionOnPublisherPage(editions,pageResults,origIsbn){
  for(const ed of (Array.isArray(editions)?editions:[])){
    if(!ed||!ed.title||!isEnglishLang(ed.language))continue;
    const en=toIsbn13(ed.isbn13,resultsText(pageResults||[]));
    if(!en||en===origIsbn)continue;
    return{title:String(ed.title).trim(),isbn13:en,url:ed.url||null};
  }
  return null;
}
//@piece rankPublisherPages


// The publisher's pages a site search returned, ranked in code: the ISBN in the
// address or title first, then the title's lead words. None → Claude ranks them.
function rankPublisherPages(onSite,book,isbn,dom){
  const lead=foldText(String(book||"").split(/\s*(?:[.:;]|\s[–—-])\s+/)[0]).replace(/[^a-z0-9]+/g," ").trim();
  const scored=[];
  for(const x of (onSite||[])){
    const u=cleanPublisherUrl(x&&x.url,dom);
    if(!u)continue;
    const head=String((x&&x.title)||"")+" "+u;
    const flat=" "+foldText(head).replace(/[^a-z0-9]+/g," ")+" ";
    const score=isbn&&isbnInText(isbn,head)?2:lead.length>=4&&flat.includes(" "+lead+" ")?1:0;
    if(score&&!scored.some(s=>sameAddress(s.u,u)))scored.push({u,score});
  }
  return scored.sort((a,b)=>b.score-a.score).slice(0,2).map(s=>s.u);
}
//@piece onHost

function onHost(results,host){ return (results||[]).filter(x=>hostOf(x&&x.url)===host); }
//@piece carriesBook

function carriesBook(x,book,isbn){ return !!((isbn&&isbnInText(isbn,resultText(x)))||resultsCarrying([x],book).length); }
//@piece PUBLISHER_TRUST


// The trust order for a publisher: read off the ISBN's results, then printed on the
// book's own shop or publisher page, then Claude's read of general results (a guess).
const PUBLISHER_TRUST={"the ISBN’s results":3,"the museum shop":2,"the book’s page":2,"general results":1};
//@piece sameHouse

function sameHouse(a,b){
  const x=houseWords(a), y=houseWords(b);
  return x.some(p=>y.some(q=>p.includes(q)||q.includes(p)));
}
//@piece siteOfHouses


// A co-edition's site, by the whole name or any one house in it, outside houses first
// ("Musée du Louvre Editions / Lienart" → lienarteditions.com, Vasari).
function siteOfHouses(results,pub,museumId){
  const whole=publisherDomainFrom(results,pub);
  if(whole)return whole;
  const parts=String(pub||"").split(/\s*(?:\/|;|&|\s+and\s+|\s+with\s+)\s*/i).map(x=>x.trim()).filter(Boolean);
  if(parts.length<2)return null;
  parts.sort((a,b)=>museumImprintOnly(a,museumId)-museumImprintOnly(b,museumId));
  for(const p of parts){ const h=publisherDomainFrom(results,p); if(h)return h; }
  return null;
}
//@piece findPublisherPage


// ── PHASE 4: THE PUBLISHER'S PAGE, ONCE, FOR THE FINAL BOOK ──────────────────
// Go to the publisher: their site read off the results already found, else one search
// for their name; a page already found on it, else a search inside it; open up to two
// candidates and judge each. A museum's own imprint has none. Returns
// {trouble, edition} — edition when the page lists an English edition of a foreign book.
async function findPublisherPage(F,c){
  const {io,log,row,dom,venue}=c;
  if(isSelfPublisher(F.publisher,row.museumId)){
    log.push(F.publisher+" is a museum’s own imprint — no publisher page to look for.");
    F.publisherUrl=null; F.publisherResult="selfpublished";
    return{};
  }
  // No name, so nothing was looked for — and the card says so.
  if(!F.publisher){ F.publisherResult="unnamed"; return{}; }
  const pub=publisherToFind(F.publisher,row.museumId);
  const book=F.title||row.title, isbn=F.isbn;
  io.phase("publisher");
  let pubHost, candidates;
  const given=F.publisherUrl;
  if(given){
    // A link a read handed over stands; it is opened only to see the editions it lists.
    if(!c.wantEditions){ log.push("Publisher’s page, given by a read: "+given); return{}; }
    pubHost=hostOf(given); candidates=[given];
  } else {
    pubHost=siteOfHouses(c.found,pub,row.museumId);
    if(pubHost)log.push("The publisher’s site, read off the results already found: "+pubHost);
    else if((pubHost=listedPublisherSite(pub)))log.push("The publisher’s site, from her list of joint publishers: "+pubHost);
    else{
      const d1=await io.search("The official website of the art-book publisher “"+pub+"”.",[pub,pub+" art book publisher"]);
      log.push(d1.detail);
      if(!d1.ok)return{trouble:d1.detail};
      pubHost=siteOfHouses(d1.results,pub,row.museumId);
      if(!pubHost){ log.push("Couldn’t identify the publisher’s own website."); F.publisherResult="nosite"; return{}; }
    }
    const known=onHost(c.found,pubHost).filter(x=>carriesBook(x,book,isbn)).map(x=>cleanPublisherUrl(x.url,dom)).filter(Boolean);
    candidates=[];
    for(const u of known)if(!candidates.some(x=>sameAddress(x,u))&&candidates.length<2)candidates.push(u);
    if(candidates.length)log.push("A page for this book on "+pubHost+", among the results already found: "+candidates.join(" + "));
    else{
      const sp=await io.search(
        "The page on "+pubHost+" for the book “"+book+"”"+(isbn?", ISBN "+isbn:"")+".",
        isbn?["site:"+pubHost+" "+book,"site:"+pubHost+" "+isbn,"site:"+pubHost+" "+book.split(/[:–—-]/)[0].trim()]
            :["site:"+pubHost+" "+book,"site:"+pubHost+" "+book.split(/[:–—-]/)[0].trim()]);
      log.push(sp.detail);
      if(!sp.ok)return{trouble:sp.detail};
      const onSite=onHost(sp.results,pubHost);
      if(!onSite.length)return siteOnly(F,pubHost,log,"Nothing for this book on "+pubHost+".");
      candidates=rankPublisherPages(onSite,book,isbn,dom);
      if(candidates.length)log.push("Ranked in code: "+candidates.join(" + "));
      else{
        // TWO CANDIDATES, THEN THE FALLBACK (her decision): if the best two are wrong
        // the site does not have the book. No new search.
        const rd=await io.read(
          "These are pages from ONE publisher’s own website. Put them in order, best first, "
         +"by how likely each is to BE the page for this book or to LEAD to it.\n"
         +"A book’s own page beats a list or a section of many books, which beats anything else. "
         +"Give at most two, and give none at all if nothing here relates to this book.\n"
         +"Use ONLY these results. Never invent a link.\n"
         +"\nBook: "+book+(isbn?"\nISBN: "+isbn:"")+"\nPublisher: "+pub
         +"\nExhibition venue: "+venue+"\n\n"
         +resultsForPrompt(onSite,3000,{words:[book,isbn||""]})
         +"\nReply with ONLY this JSON object and nothing else:\n"
         +'{"candidates": [string]}\n'
         +'Example: {"candidates":["https://hannibalbooks.be/en/fine-art","https://hannibalbooks.be/en/new"]}');
        log.push(rd.detail);
        if(!rd.ok)return{trouble:rd.detail};
        for(const x of (Array.isArray((rd.data||{}).candidates)?rd.data.candidates:[])){
          const u=cleanPublisherUrl(x,dom);
          if(u&&hostOf(u)===pubHost&&!candidates.some(y=>sameAddress(y,u)))candidates.push(u);
          if(candidates.length>=2)break;
        }
      }
      if(!candidates.length)return siteOnly(F,pubHost,log,"No page for this book on "+pubHost+".");
    }
  }

  // NOW OPEN THEM: a search cannot tell a book's page from a section of books.
  for(let i=0;i<candidates.length;i++){
    const candidate=candidates[i];
    let res=c.pages.get(normalizeUrlKey(candidate));
    if(res)log.push("The publisher’s page, already open: "+candidate);
    else{
      const fp=await io.fetch(candidate,
        "Whether this page is the book “"+book+"” itself, and any link on it to that book."
          +(c.wantEditions?" Every language edition of it this page lists, with ISBNs.":""),
        [book,isbn||book],{full:true});
      log.push(fp.detail);
      if(!fp.ok)return{trouble:fp.detail};
      res=fp.results; c.pages.set(normalizeUrlKey(candidate),res);
    }
    // A script-drawn page comes back empty: kept as the section, never claimed as the
    // book, and not counted as read.
    if(pageIsShell(res)){
      log.push("That page came back empty — kept as the publisher’s section, not the book’s own page.");
      F.publisherUrl=candidate; F.publisherResult="container";
      return{};
    }
    const vr=await io.read(
      "You are reading ONE page from a publisher’s own website, in full. Decide what it is.\n"
     +"Use ONLY what this page says. Never use outside knowledge and never invent a link.\n"
     +'"book"    — this page IS about the book named below: it is that book’s own page.\n'
     +'"listing" — this page lists or advertises several books. If one of them is the book '
     +"below, give ITS link in bookUrl, copied exactly from this page; otherwise bookUrl null.\n"
     +'"other"   — this page has nothing to do with this book or this publisher’s books.\n'
     +"MATCH ON THE ISBN WHERE THERE IS ONE. A publisher may carry the same book in two "
     +"languages, with two links and two numbers, and the titles will not tell them apart.\n"
     +(c.wantEditions?"editions: every edition of this book in ANOTHER language this page shows with its own ISBN — "
       +"its title as printed, its ISBN as printed, its language, and its own link on this page if it has one. "
       +"An empty list if none.\n":"")
     +"\nBook: "+book+(isbn?"\nISBN: "+isbn:"")+"\nPublisher: "+pub+"\n\n"
     +pageForPrompt(res)
     +"\nReply with ONLY this JSON object and nothing else:\n"
     +'{"kind": "book"|"listing"|"other", "bookUrl": string|null'
     +(c.wantEditions?', "editions": [{"title": string, "isbn13": string, "language": string, "url": string|null}]':'')+'}\n'
     +'Example: {"kind":"listing","bookUrl":"https://hannibalbooks.be/en/metamorfosen-ovidius-en-de-kunsten#102642"}');
    log.push(vr.detail);
    if(!vr.ok)return{trouble:vr.detail};
    const v=vr.data||{};
    const kind=String(v.kind||"");
    if(kind==="book"||kind==="listing"){
      let link=candidate, result="product";
      if(kind==="listing"){
        // The deep link is checked, not trusted: on the publisher's own host and not
        // the listing we are standing on.
        const deep=deepLinkOn(v.bookUrl,pubHost,candidate);
        if(deep){ link=deep; log.push("Book’s own page, read off the publisher’s list: "+deep); }
        else{ result="container"; log.push("The publisher lists books here but gives this one no page of its own — kept as the section."); }
      } else log.push("Publisher’s page for the book: "+candidate);
      F.publisherUrl=link; F.publisherResult=result;
      // Read means fetched, not empty, and the very page the card links (Canaletto).
      F.pubPageRead=link===candidate;
      const ed=c.wantEditions?editionOnPublisherPage(v.editions,res,F.isbn):null;
      if(ed){
        const deep=deepLinkOn(ed.url,pubHost,candidate);
        return{edition:{...ed,link:deep||candidate,linkResult:deep?"product":"container"}};
      }
      return{};
    }
    // "other": try the next candidate; otherwise fall to the site.
    log.push("That page is not about this book."+(i+1<candidates.length?" Trying the next result.":""));
  }
  if(given){ log.push("The link the read gave stands, unconfirmed."); return{}; }
  return siteOnly(F,pubHost,log,"None of the pages on "+pubHost+" was this book.");
}
//@piece siteOnly

// The weakest honest answer once the publisher is known: their own front door.
function siteOnly(F,pubHost,log,why){
  log.push(why);
  F.publisherUrl="https://"+pubHost+"/"; F.publisherResult="site";
  return{};
}
