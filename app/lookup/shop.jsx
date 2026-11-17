//@ The museum-shop step and Re-check museum shop.
//@piece SHELF_DEPTH


// The pages step one opens: the shelf where the shop has one, then its search box with
// the exhibition's title, both from MUSEUMS. A shelf that scrolls or paginates is just
// more addresses. Depth is one number for every shop, never a count per venue: a
// missing page costs nothing and all go in one call. Five covers MAD's 68 books.
const SHELF_DEPTH=5;
//@piece shelfPages


// Shopify and most others take ?page=N. A shelf that already carries its own
// size parameter (Tate) is left exactly as written — it serves the lot in one.
function shelfPages(url){
  if(!url)return[];
  if(/[?&]sz=|[?&]product_list_limit=/.test(url))return[url];
  // A shelf whose address ends in its own page number (MAD: /c462/1/) is
  // counted up in the path; ?page= would be ignored there.
  if(/\/1\/$/.test(url)){const out=[url];for(let n=2;n<=SHELF_DEPTH;n++)out.push(url.replace(/\/1\/$/,"/"+n+"/"));return out;}
  const join=url.includes("?")?"&":"?";
  const out=[url];
  for(let n=2;n<=SHELF_DEPTH;n++)out.push(url+join+"page="+n);
  return out;
}
//@piece shopPagesFor


function shopPagesFor(mu,title){
  const out=[];
  if(mu&&mu.shopCatalogues)out.push(...shelfPages(mu.shopCatalogues));
  // Curly quotes straightened: shops file "O’Keeffe" with a straight one.
  if(mu&&mu.shopSearch)out.push(mu.shopSearch+encodeURIComponent(String(title).replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"')));
  return out;
}
//@piece shopDomain


function shopDomain(mu){if(!mu||!mu.shopHome)return null;try{return new URL(mu.shopHome).hostname;}catch{return null;}}
//@piece isTicketLink


// A ticket is never a catalogue (her decision, KHM Canaletto & Bellotto): a link with
// /ticket/ or /tickets/ in its path is never taken as the book. L-001 to L-019.
function isTicketLink(url){ return /\/tickets?\//i.test(String(url||"")); }
//@piece shopLinkOf


// The link, only when it is really on the venue's shop and is not a ticket.
// One copy, used by the lookup and by Re-check. A shop page links outward —
// to a publisher, a distributor, another shop — so a link read off a shop page
// is not automatically ON that shop.
function shopLinkOf(o,dom){
  const u=o&&o.shopUrl;
  if(!u||!dom||isTicketLink(u))return null;
  return String(u).toLowerCase().includes(String(dom).toLowerCase())?u:null;
}
//@piece bookLinkOnShelf


// The book's link on a shelf, read in code (her decision, MAD Christofle): exactly one
// address on the shop's own site whose link words carry the whole catalogue title; two
// or none → nothing. Never a page this step opened, never a ticket.
function bookLinkOnShelf(results,bookTitle,dom,opened){
  const all=shelfLinksFor(results,bookTitle,dom,opened);
  return all.length===1?all[0]:null;
}
//@piece shelfLinksFor

// Every such address, in the order the shelf lists them.
function shelfLinksFor(results,bookTitle,dom,opened){
  const norm=v=>foldText(v).replace(/[^a-z0-9]+/g," ").trim();
  const want=norm(bookTitle);
  if(want.length<6||!dom)return null;
  const found=new Map();
  for(const r of (results||[])){
    const text=Array.isArray(r&&r.excerpts)?r.excerpts.join("\n"):String((r&&r.full_content)||"");
    const re=/\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)/g;
    let m;
    while((m=re.exec(text))){
      const url=m[2];
      if(!shopLinkOf({shopUrl:url},dom))continue;
      const key=normalizeUrlKey(url);
      if(!key||(opened&&opened.has(key)))continue;
      if(!(" "+norm(m[1]+" "+(m[3]||""))+" ").includes(" "+want+" "))continue;
      found.set(key,url);
    }
  }
  return [...found.values()];
}
//@piece foundInShop


// Case 2 — the shop step found the book where no shop link was on file. Fills blanks
// only; the caller has checked the link is on the venue's shop. A catalogue the app
// had given up on becomes one.
function foundInShop(row,o){
  return{...row,looked:true,hasCatalogue:"yes",
    catalogueTitle:row.catalogueTitle||o.catalogueTitle||null,
    isbn13:row.isbn13||toIsbn13(o.isbn13),
    publisher:row.publisher||(o.publisher?String(o.publisher).trim():null)||null,
    // "Now" only for a book that was NOT in the shop before.
    shopState:"shop",shopChange:row.shopState==="shop"?(row.shopChange||null):"now",shopUrl:o.shopUrl};
}
//@piece GONE_HTTP


// Cases 1 and 3 — re-read the ONE page on file: {ok:true, row, said}, or {ok:false,
// said} and nothing may change. 404/410 is decided in code from the connector's error;
// any other error or an empty page is a failed check, never "gone". Otherwise one
// question to Claude: is THIS book for sale HERE, now? A redirect fails that test.
const GONE_HTTP=new Set([404,410]);
//@piece inStockByRule


// READ ONE SHOP PAGE AND ASK: is this book for sale HERE, now? One copy, used
// by Re-check and by the lookup's check of a shop link a web search turned up.
// Returns {kind, detail, …}:
//   "norun"      the connector refused; `why` says why
//   "gone"       404 or 410; `status`
//   "unreadable" nothing came back, or only a shell; `why` the errors, if any
//   "noread"     Claude could not be asked; `why`
//   "badanswer"  Claude's answer was not a yes or no
//   "read"       `forSale` true or false, `why` Claude's reason, `results` the page
// A venue whose shop draws its order button by script (MUSEUMS `inStock`): the book's own page, served at the address
// asked, with the status line saying In Stock, is for sale whatever Claude read.
function inStockByRule(url,results){
  const host=hostOf(url), mu=MUSEUMS.find(m=>m.inStock&&hostOf(m.shopHome||"")===host);
  if(!mu)return false;
  const path=u=>{ try{ return new URL(u).pathname.replace(/\/+$/,""); }catch{ return ""; } };
  if(!mu.inStock.path.test(path(url)))return false;
  const served=(results||[]).map(r=>String((r&&r.url)||"")).filter(Boolean);
  if(served.some(u=>hostOf(u)!==host||path(u)!==path(url)))return false;
  return mu.inStock.line.test(pageTextOf(results));
}
//@piece readShopPage

async function readShopPage(book,url,io,opened){
  const f=opened||await openShopPage(io?io.fetch:fetchPage,url,
    // Not words: asked of the web.
    "Whether the book “"+book+"” can be bought on this page now: its product page, price, "
      +"add to cart, pre-order, sold out, out of stock, unavailable.",
    /* Not words: asked of the web. */[book+" add to cart sold out"],{full:true});
  if(!f.ok)return{kind:"norun",detail:f.detail,why:f.detail.split("[")[0].trim()};
  const dead=(f.errors||[]).find(e=>GONE_HTTP.has(Number(e&&e.http_status_code)));
  if(dead)return{kind:"gone",status:dead.http_status_code,
    detail:f.detail+say(W.logShopAnswered,{status:dead.http_status_code})};
  if(!f.results.length||pageIsShell(f.results)){
    const why=(f.errors||[]).map(e=>String((e&&e.error_type)||"")+(e&&e.http_status_code?" "+e.http_status_code:"")).filter(Boolean).join(", ");
    return{kind:"unreadable",why,detail:f.detail+(why?"\n"+why:"")};
  }
  const served=f.results.map(r=>String((r&&r.url)||"")).filter(Boolean).join(" ");
  // Not words: sent to Claude.
  const rd=await (io?io.read:readResults)(
    "You are reading ONE page from a museum shop. Decide whether the book named below can be bought "
   +"on it NOW.\nUse ONLY what this page says.\n"
   // Sold out outranks "Add to cart" and notes to earlier pre-orderers (Morgan Tarot;
   // docs/app.md §1).
   +'"forSale": true ONLY if this page IS that book’s own product page AND a NEW order can be '
   +"placed on it today: add to cart or bag, buy now, pre-order now, available to order.\n"
   +'"forSale": false if the page says sold out, out of stock, unavailable, no longer available, or '
   +"not found, in any language (esaurito, épuisé, uitverkocht, ausverkauft, agotado …). "
   +"SOLD OUT OUTRANKS EVERYTHING ELSE ON THE PAGE: if the page says this book is sold out anywhere, "
   +"the answer is false, whatever else it says. "
   +"A note to people who have ALREADY ordered or pre-ordered (\u201cif you pre-ordered\u201d, shipping news, "
   +"\u201cpreorders will ship\u201d) is NOT an offer to order. The words \u201cAdd to cart\u201d or a price are not "
   +"proof on their own: a greyed-out button still prints its words. "
   +"ALSO false if this page is NOT that book’s own page — the shop’s front page, a "
   +"category, search results, a ticket or a different product. That is what a pulled page redirecting looks like.\n"
   +"\nBook: "+book+"\nAddress on file: "+url+"\nAddress served: "+(served||"(not given)")+"\n\n"
   +pageTextOf(f.results).slice(0,PAGE_CHARS)
   +"\n"+REPLY_JSON_ONLY+'{"forSale": true|false, "why": string}\n'
   +'Example: {"forSale":false,"why":"The page says Sold out."}');
  if(!rd.ok)return{kind:"noread",detail:f.detail+"\n"+rd.detail,why:rd.detail.split("[")[0].trim()};
  const d=rd.data||{};
  if(typeof d.forSale!=="boolean")return{kind:"badanswer",detail:f.detail+"\n"+JSON.stringify(d)};
  const why=String(d.why||"").trim();
  if(!d.forSale&&inStockByRule(url,f.results)){
    const said=W.inStockByRule;
    return{kind:"read",forSale:true,why:said,results:f.results,detail:f.detail+"\n"+rd.detail+(why?"\n"+why:"")+"\n"+said};
  }
  return{kind:"read",forSale:d.forSale,why,results:f.results,detail:f.detail+"\n"+rd.detail+(why?"\n"+why:"")};
}
//@piece stillInShop

// A Re-check found the book in the shop again: the card's headline says "Still in the museum shop." from now on
// (her design: the small line under the button goes, the headline is what tells her she re-checked).
const stillInShop=row=>row.shopChange==="still"?row:{...row,shopChange:"still"};
//@piece recheckLinkedPage


async function recheckLinkedPage(row){
  const book=row.catalogueTitle||row.title;
  const p=await readShopPage(book,row.shopUrl);
  const hadIt=row.shopState==="shop";
  if(p.kind==="norun")return{ok:false,detail:p.detail,said:say(W.recheckDidntRun,{why:p.why})};
  if(p.kind==="gone")return{ok:true,detail:p.detail,row:{...row,shopState:"gone",shopChange:null},
    said:hadIt?W.recheckedPageGone
              :W.recheckedNotReturned};
  if(p.kind==="unreadable")return{ok:false,detail:p.detail,
    said:say(W.recheckPageUnread,{why:p.why?" ("+p.why+")":""})};
  if(p.kind==="noread")return{ok:false,detail:p.detail,said:say(W.recheckDidntFinish,{why:p.why})};
  if(p.kind==="badanswer")return{ok:false,detail:p.detail,said:say(W.recheckDidntFinish,{why:W.answerUnreadable})};
  if(p.forSale){
    if(hadIt)return{ok:true,detail:p.detail,row:stillInShop(row),said:W.recheckedStillForSale};
    return{ok:true,detail:p.detail,row:{...row,shopState:"shop",shopChange:"back"},said:W.recheckedBack};
  }
  return{ok:true,detail:p.detail,row:{...row,shopState:"gone",shopChange:null},
    said:hadIt?W.recheckedNoLongerForSale+(p.why?" "+p.why:""):W.recheckedStillNotForSale};
}
//@piece pickedVersion


// "Re-check museum shop" on one card → {ok, detail, row?, said}. At top level so the
// shop check page runs the same code; the page's recheckShop prints its answer.
// A card with several books: Re-check is about the picked one only, and that book's own
// stored fields follow the card (pickRow reads them back). SV-006 to SV-008.
function pickedVersion(row){
  const vs=Array.isArray(row&&row.editions)?row.editions:[];
  return vs.length>1&&Number.isInteger(row.editionPick)?vs[row.editionPick]||null:null;
}
//@piece withPickedCard

function withPickedCard(row){
  const v=pickedVersion(row);
  if(!v)return row;
  const card={catalogueTitle:row.catalogueTitle||null,isbn13:row.isbn13||null,publisher:row.publisher||null,publisherUrl:row.publisherUrl||null,
    publisherResult:row.publisherResult||null,shopState:row.shopState||null,shopUrl:row.shopUrl||null};
  return{...row,editions:row.editions.map(x=>x===v?{...v,card}:x)};
}
//@piece recheckShopRow

async function recheckShopRow(found,hooks){
  const out=await recheckShopCore(found,hooks);
  return out.row?{...out,row:withPickedCard(out.row)}:out;
}
//@piece recheckShopCore

async function recheckShopCore(found,hooks){
  // A ticket on file was never the book: dropped, and the shop searched afresh.
  const ticket=!!(found.shopUrl&&isTicketLink(found.shopUrl));
  const row=ticket?{...found,shopUrl:null,shopState:"web",shopChange:null}:found;
  let out;
  if(row.shopUrl&&(row.shopState==="shop"||row.shopState==="gone")){
    if(hooks&&hooks.label)hooks.label(W.rereadingShopPage);
    out=await recheckLinkedPage(row);
  } else {
    const io=lookupIo(hooks,{upTo:1});
    io.phase("shop");
    const s=await shopStep(row,io);
    const dom=shopDomain(MU[row.museumId]);
    const o=s.data||{};
    const onShop=!!shopLinkOf(o,dom);
    // Not-there moves an unread row on: the shop answered this time.
    const answered=shopUnread(row.shopState)?{...row,shopState:row.hasCatalogue==="yes"?"web":"none"}:row;
    // The ticket link is dropped silently (her decision).
    const dropped="";
    if(!s.ran)out={ok:false,detail:"",said:say(W.recheckDidntRun,{why:W.venueNoShop})};
    else if(!s.ok)out={ok:false,detail:s.detail,said:say(W.recheckDidntRun,{why:s.detail.split("\n").pop().split("[")[0].trim()})};
    // A blocked shop is a failed check and changes nothing — except a ticket
    // link, which was wrong whatever the shop says.
    else if(s.blocked)out=ticket
      ?{ok:true,detail:s.detail,row:{...row,shopState:s.blocked},said:dropped+say(W.recheckShopUnread,{why:shopUnreadSaid(s.blocked)})}
      :{ok:false,detail:s.detail,said:say(W.recheckShopUnread,{why:shopUnreadSaid(s.blocked)})};
    // The shop's book is the picked one only when its ISBN says so; otherwise the picked
    // book is looked for on the list the shop step read, as the lookup does.
    else if(pickedVersion(row)&&!(o.found&&o.isbn13&&[pickedVersion(row).isbn13,pickedVersion(row).alsoIsbn13].includes(o.isbn13))){
      const v=pickedVersion(row), log=[];
      const F={title:row.catalogueTitle||v.title,isbn:row.isbn13||v.isbn13,publisher:row.publisher||v.publisher};
      const {url,failed}=await bookOnShelfAfterWeb(F,v,s.results,dom,new Set(shopPagesFor(MU[row.museumId],String(row.title||"").trim()).map(normalizeUrlKey)),io,log);
      const detail=[s.detail].concat(log).join("\n");
      out=failed?{ok:false,detail,said:say(W.recheckPageUnread,{why:""})}
        :url?{ok:true,detail,row:{...answered,shopState:"shop",shopUrl:url,shopChange:row.shopState==="shop"?"still":"now"},said:dropped+(row.shopState==="shop"?W.recheckedStillInShop:W.recheckedNowInShop)}
        :{ok:true,detail,row:{...answered,shopState:"web",shopUrl:null},said:dropped+W.recheckedNotInShop};
    }
    else if(o.found&&(o.catalogueTitle||o.isbn13)&&(onShop||o.listedOnly)){
      // Reading the book's page for a blank ISBN is part of the shop step —
      // the page IS the shop's. Web search and the publisher are never run.
      const hit=await readBookPage({ok:true,detail:s.detail,pageUrl:o.shopUrl,row:foundInShop(row,o)},
        MU[row.museumId]?.name||"",dom,io);
      out={ok:true,detail:hit.detail,row:row.shopState==="shop"?stillInShop(hit.row):hit.row,said:dropped+(row.shopState==="shop"?W.recheckedStillInShop:W.recheckedNowInShop)};
    }
    else out={ok:true,detail:s.detail,row:answered,said:dropped+W.recheckedNotInShop};
  }
  return out;
}
//@piece sameBookOnPage


// THE BOOK FOUND ON THE WEB, LOOKED FOR AGAIN ON THE SHOP'S OWN LIST (her decision, Yale
// Constable): every link on the shelf already read whose words carry the book's whole
// title is opened, in shelf order. It is this book when its page prints the same ISBN;
// with no ISBN on the page, when its page count or publisher agrees and the page count
// does not disagree. Then it must be for sale (readShopPage). → {url} when found;
// {url:null, failed} when it was not found and a page that might be it could not be read —
// a failed read is never "not in the shop" (her decision, Yale Constable). SB-001 to SB-011.
function sameBookOnPage(results,F,v){
  const text=pageTextOf(results);
  const isbns=isbnsLabelled(text);
  if(isbns.size)return [F.isbn,v&&v.alsoIsbn13].filter(Boolean).some(i=>isbns.has(i))?W.sameIsbn:null;
  const printed=(text.match(/(?<![0-9])(\d{2,4})\s*(?:pages|pp\b)/i)||[])[1];
  if(v&&v.pages&&printed&&Number(printed)!==Number(v.pages))return null;
  if(v&&v.pages&&printed)return W.samePageCount;
  const pub=F.publisher?normPublisher(F.publisher):"";
  if(pub.length>=4&&(" "+normPublisher(text)+" ").includes(" "+pub+" "))return W.samePublisher;
  return null;
}
//@piece bookOnShelfAfterWeb

// `seen` (optional): pages already opened and read in this lookup, by address, so a page
// carrying two books' titles is opened once.
async function bookOnShelfAfterWeb(F,v,shelf,dom,opened,io,log,seen){
  const links=shelfLinksFor(shelf,F.title,dom,opened)||[];
  if(!links.length)return{url:null,failed:null};
  let failed=null;
  const miss=(url,why)=>{ if(!failed)failed=say(W.couldntReadUrl,{url,why:why?" ("+why+")":""}); };
  log.push(say(W.logLookedForOnList,{n:links.length,s:links.length===1?"":"s",title:F.title}));
  for(const url of links){
    const key=normalizeUrlKey(url), had=seen&&seen.get(key);
    const f=had?had.f:await openShopPage(io.fetch,url,
      // Not words: asked of the web.
      "Whether the book “"+F.title+"” can be bought on this page now: its ISBN, pages, publisher, price, add to cart, sold out.",
      /* Not words: asked of the web. */[F.title+" ISBN add to cart"],{full:true});
    if(seen&&!had)seen.set(key,{f});
    if(!had)log.push(f.detail);
    if(!f.ok||!f.results.length||pageIsShell(f.results)){ miss(url,f.ok?W.blankPage:f.detail.split("\n").pop().split("[")[0].trim()); continue; }
    const same=sameBookOnPage(f.results,F,v);
    if(!same){ log.push(say(W.logNotThisBook,{url})); continue; }
    const mem=seen&&seen.get(key);
    const p=mem&&mem.p?mem.p:await readShopPage(F.title,url,io,f);
    if(mem&&!mem.p)mem.p=p;
    log.push(p.detail);
    if(p.kind==="read"&&p.forSale){ log.push(say(W.logInShopBy,{same,url})); return{url,failed:null}; }
    if(p.kind!=="read"&&p.kind!=="gone")miss(url,p.why);
  }
  if(failed)log.push(say(W.logNotSettled,{why:failed}));
  return{url:null,failed};
}
//@piece shopStep


// STAGE ONE ON ITS OWN: open the venue's shop pages and read the book off them. Used
// by the lookup, and ALONE by "Re-check museum shop" when no shop link is on file —
// one copy of the step, so the two cannot drift. Returns {ran:false} for a venue with
// no shop; otherwise {ran, ok, detail, data, results} where data is the read, or null
// when the pages came back empty.
async function shopStep(row,io){
  await io.prepareShop(row.museumId);
  const mu=MU[row.museumId];
  const dom=shopDomain(mu);
  const title=String(row.title||"").trim();
  const venue=mu?mu.name:"";
  const shopPages=shopPagesFor(mu,title);
  if(!dom||!shopPages.length)return{ran:false,ok:false,detail:"",data:null};
  io.phase("shop");
  const s1=await io.fetch(shopPages,
    // Not words: asked of the web.
    "The printed exhibition catalogue for “"+title+"”: the book’s own product page "
      +"on this shop, its full title and its price.",
    /* Not words: asked of the web. */[title+" exhibition catalogue book"]);
  if(!s1.ok)return{ran:true,ok:false,detail:s1.detail,data:null};
  // Every page refused is not "nothing there": the shop could not be read (KHM).
  if(!s1.results.length&&(s1.errors||[]).length)
    return{ran:true,ok:true,blocked:"blocked",detail:s1.detail+W.logShopRefusedAll,data:null};
  if(!s1.results.length)return{ran:true,ok:true,detail:s1.detail,data:null};
  // A venue whose books Parallel drops (the Städel), a shop drawn by script (Basel), or a section she confirmed
  // unread (Berlin's English one): no priced line, even read whole, is "parallel", "script" or "unconfirmed".
  const priced=r=>hasPrice(pageTextOf(r.results));
  if(mu&&(mu.shopUnseen==="parallel"||mu.shopUnseen==="script"||mu.shopUnseen==="unconfirmed")&&!priced(s1)){
    const whole=await io.fetch(shopPages,SHOP_BOOKS_ASK,null,{full:true});
    if(!whole.ok)return{ran:true,ok:false,detail:s1.detail+"\n"+whole.detail,data:null};
    if(!priced(whole))
      return{ran:true,ok:true,blocked:mu.shopUnseen,detail:s1.detail+"\n"+whole.detail+(mu.shopUnseen==="parallel"?W.logParallelNoBooks:W.logPagesNoBooks),data:null};
  }
  // Every page empty: drawn by script (her decision, MoMA Brancusi), "script". But short excerpts are not an empty page (her Watteau): the pages are
  // opened again whole, and the shop is unread only if they are still empty or show
  // no price anywhere.
  let shop=s1;
  // The pages read whole: {whole} with books on them, or the step's answer when none.
  const readWhole=async()=>{
    const whole=await io.fetch(shopPages,SHOP_BOOKS_ASK,null,{full:true});
    if(!whole.ok)return{out:{ran:true,ok:false,detail:s1.detail+"\n"+whole.detail,data:null}};
    let books=whole.results.filter(r=>!pageIsShell([r])&&hasPrice(oneText(r)));
    // No price on any page: a list of titles is books when its first product is one
    // (firstProductIsBook, Yale's Publications), or its first book under its own address (Galerie Karsten Greve).
    const listed=books.length?null:whole.results.find(r=>!pageIsShell([r]));
    if(listed&&await firstProductIsBook(io.fetch,oneText(listed),dom,listed.url))books=[listed];
    if(!books.length)
      return{out:{ran:true,ok:true,blocked:"script",detail:s1.detail+"\n"+whole.detail+W.logPagesNoBooksOnThem,data:null}};
    return{whole};
  };
  if(s1.results.every(r=>pageIsShell([r]))){
    const w=await readWhole();
    if(w.out)return w.out;
    shop={...w.whole,detail:s1.detail+"\n"+w.whole.detail+W.logReadWhole};
  }
  // Not words: sent to Claude.
  const r1=await io.read(READ_RULES
    +"\nExhibition: "+title+"\nVenue: "+venue
    +"\nBelow are the venue’s OWN shop pages, opened directly at "+dom
    +". THE LINK YOU RETURN MUST BE THE BOOK’S OWN PRODUCT PAGE. A page listing many "
    +"catalogues, a category page or a search-results page is NOT the book — take the "
    +"one link on it that names this exhibition. If nothing on these pages is this "
    +"exhibition’s catalogue, answer found false.\n\n"
    +resultsForPrompt(shop.results,6000,{words:[title],dom})+READ_SHAPE);
  let detail=shop.detail+"\n"+r1.detail;
  if(!r1.ok)return{ran:true,ok:false,detail,data:null};
  // Nothing found on pages that show no book at all — no price, no product link (MoMA's
  // member pop-up, too long to count as empty): read whole, and with no books on them
  // the shop could not be seen, never "not in the museum shop" (her decision; B-007).
  const showsBook=r=>hasPrice(oneText(r))||productLinksOn(oneText(r),hostOf(r.url)).length>0;
  if(!(r1.data&&r1.data.found)&&shop===s1&&s1.results.every(r=>!showsBook(r))){
    const w=await readWhole();
    if(w.out&&w.out.blocked)return w.out;
  }
  const data={...(r1.data||{})};
  // An ISBN the read gave is taken only if the shop's pages print it (toIsbn13).
  data.isbn13=toIsbn13(data.isbn13,resultsText(shop.results));
  // The title as the shop's pages print it — titleAsPrinted.
  if(data.found&&data.catalogueTitle){
    const tp=titleAsPrinted(data.catalogueTitle,shop.results);
    if(tp.cut)detail+=say(W.logTitleCut,{title:tp.title,read:data.catalogueTitle});
    else if(!tp.onPage)detail+=W.logTitleNotOnPages;
    data.catalogueTitle=tp.title;
  }
  // A list is not the book (her decision, KHM Canaletto): a link that is one of the
  // pages this step opened is refused as a link; the book still counts as in the shop,
  // and her shop button falls back to the shop's search for the show. L-020 to L-023.
  const opened=new Set(shopPages.map(normalizeUrlKey));
  // Before falling back: the book's own link may be on the shelf all the
  // same — bookLinkOnShelf. Also when Claude found the book and gave no link.
  const listed=data.shopUrl&&opened.has(normalizeUrlKey(data.shopUrl));
  if(data.found&&(listed||!data.shopUrl)){
    const own=bookLinkOnShelf(shop.results,data.catalogueTitle,dom,opened);
    if(own){
      detail+=say(W.logOwnLinkOnListing,{url:own});
      return{ran:true,ok:true,detail,results:shop.results,data:{...data,shopUrl:own}};
    }
  }
  if(listed){
    detail+=W.logLinkWasListing;
    return{ran:true,ok:true,detail,results:shop.results,data:{...data,shopUrl:null,listedOnly:true}};
  }
  return{ran:true,ok:true,detail,results:shop.results,data};
}
//@piece confirmShopLink


// OPEN THE SHOP LINK THE WEB SEARCH GAVE — see settle. Filed as in the museum shop
// only when the page opens and is this book, for sale. Anything else leaves "found on
// the web" (or "blocked") and drops the link, so the book's page is not opened again.
async function confirmShopLink(hit,io){
  if(!hit||!hit.ok||!hit.shopCandidate)return hit;
  const link=hit.shopCandidate;
  io.phase("page");
  const p=await readShopPage(hit.row.catalogueTitle||hit.row.title,link,io);
  if(p.kind==="read"&&p.forSale){
    return{...hit,shopCandidate:null,pageResults:p.results,
      detail:hit.detail+"\n"+p.detail+W.logShopLinkIsBook,
      row:{...hit.row,shopState:"shop",shopChange:null,shopUrl:link}};
  }
  const why=p.kind==="read"?W.isntThisBookForSale+(p.why?" ("+p.why+")":"")
    :p.kind==="gone"?say(W.noLongerExists,{status:p.status})
    :p.kind==="unreadable"?W.didntOpen+(p.why?" ("+p.why+")":"")
    :W.couldntBeChecked;
  return{...hit,shopCandidate:null,pageUrl:null,
    detail:hit.detail+"\n"+p.detail+say(W.logShopLinkNot,{why}),
    trouble:(p.kind==="norun"||p.kind==="noread")?p.detail:hit.trouble};
}
//@piece readBookPage


// Re-check's read of the book's shop page for a blank ISBN or publisher: one page,
// read whole, ISBN read in code first. Fills blanks only (applyIsbnFill).
async function readBookPage(hit,venue,dom,io){
  if(!needsPageRead(hit))return hit;
  const r=hit.row;
  const book=r.catalogueTitle||r.title;
  io.phase("page");
  // The venue's own shop page gets the blank-page retry (openShopPage); a publisher's does not.
  const f=await (shopLinkOf({shopUrl:hit.pageUrl},dom)?(...a)=>openShopPage(io.fetch,...a):io.fetch)(hit.pageUrl,
    bookPageAsk(book),
    /* Not words: asked of the web. */[book+" ISBN publisher details"],{full:true});
  let detail=hit.detail+"\n"+f.detail;
  if(!f.ok)return{...hit,detail,trouble:f.detail};
  if(!f.results.length)return{...hit,detail};
  const coded=r.isbn13?null:isbnOnPage(pageTextOf(f.results));
  if(coded)detail=detail+say(W.logIsbnOffPageCode,{isbn:coded});
  // Not words: sent to Claude.
  const rd=await io.read(PAGE_RULES
    +"\nBook: "+book+"\nExhibition venue: "+venue+"\n\n"
    +pageForPrompt(f.results)+PAGE_SHAPE);
  detail=detail+"\n"+rd.detail;
  if(!rd.ok){
    if(!coded)return{...hit,detail,trouble:rd.detail};
    return{...hit,detail,trouble:rd.detail,row:applyIsbnFill(r,{isbn13:coded},dom,resultsText(f.results))};
  }
  const o={...(rd.data||{}),...(coded?{isbn13:coded}:{})};
  const filled=applyIsbnFill(r,o,dom,resultsText(f.results));
  detail=detail+(filled.isbn13?say(W.logIsbnOffPage,{isbn:filled.isbn13})
                              :W.logNoIsbnEither);
  return{...hit,detail,row:filled};
}
