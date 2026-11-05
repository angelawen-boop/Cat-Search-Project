//@ Finding a gallery's books.
//@piece GALLERY_OPENS


// ── A GALLERY'S SHOP — her design (docs/add_by_link.md, "A gallery's shop") ──
// A gallery sells its books from a shop of its own, on its own site ("Publications", "Library") or another
// (shop.pacegallery.com, a Shopify shop), rarely called a shop. The way in is read off its pages: the show page,
// then its home page, then the usual addresses, then a search. The list taken is the narrowest section that holds its catalogues and can be read (her rule).
// Each step runs only if the one before found nothing. Never "Editions": a gallery's editions are prints.
const GALLERY_OPENS=14;
//@piece GALLERY_WAY_WORD

const GALLERY_WAY_WORD="shop|store|boutique|bookshop|bookstore|books?|publications?|publishing|library|librairie|livres|publikationen|bucher|buecher|libreria|libri|pubblicazioni|publicaciones|libros|tienda|negozio|winkel|butik|webshop";
//@piece GALLERY_WAY

const GALLERY_WAY=new RegExp("^(?:the\\s+|our\\s+|online\\s+|alle\\s+)*(?:"+GALLERY_WAY_WORD+")(?:\\s+online)?$");
//@piece GALLERY_WAY_PATH

const GALLERY_WAY_PATH=new RegExp("^\\/(?:"+LANG_PART+"\\/)?(?:"+GALLERY_WAY_WORD+")\\/?$","i");
//@piece GALLERY_BUY

const GALLERY_BUY=/^(?:purchase|buy(?: now)?|add to (?:cart|bag|basket)|shop now|order|acheter|kaufen|in den warenkorb|comprar|acquista)$/;
//@piece GALLERY_SHOP_IN

const GALLERY_SHOP_IN=/\b(?:shop|store|boutique)\b/;
//@piece GALLERY_NOT_PAGE

const GALLERY_NOT_PAGE=/\/(?:cart|basket|checkout|account|login|wishlist)\b|ticket/i;
//@piece GALLERY_BOOK_MAKE

// A book's own page: its price and its make (ISBN, binding, page count), in the languages met.
const GALLERY_BOOK_MAKE=/\bisbn\b|\bhard ?(?:cover|back)\b|\bsoft ?cover\b|\bpaperback\b|\bbroschur|\bgebunden\b|\breliure\b|\bbroche\b|\b\d+\s?(?:pages|pp\b|p\.|s\.|seiten|pagine|paginas)/;
//@piece GALLERY_PRICE

// A price with no cents counts on a book's own page ("80 €", Galerie Karsten Greve).
const GALLERY_PRICE=new RegExp(PRICE.source+"|\\b\\d+\\s?(?:€|eur\\b|chf\\b)");
//@piece ownShopifyStore

// A Shopify shop under the gallery's own store name (acquavellagalleries.myshopify.com).
function ownShopifyStore(u,host){
  const h=hostOf(u);
  if(!/\.myshopify\.com$/.test(h))return false;
  const store=h.split(".")[0].replace(/[^a-z0-9]/g,""), own=baseDomain(host).split(".")[0].replace(/[^a-z0-9]/g,"");
  return own.length>=4&&(store.includes(own)||own.includes(store));
}
//@piece GALLERY_BOOK_FILED

// A shop's own word for it does too: a line filing it under books ("Books, Editions Mennour").
const GALLERY_BOOK_FILED=/^(?:books?|livres|bucher|libri|libros|catalog(?:ue)?s?)\b/;
//@piece galleryBookPage

const galleryBookPage=t=>{ const f=foldText(t); return (GALLERY_BOOK_MAKE.test(f)||String(t).split("\n").some(l=>GALLERY_BOOK_FILED.test(foldText(stripMd(l)).trim())))&&GALLERY_PRICE.test(f); };
//@piece GALLERY_CATALOGUES

// Which list (her rule): the NARROWEST section that holds the catalogues and can be read. Best first:
// 1 the catalogues ("Catalogues", "Exhibition-Related Books"), 2 the gallery's own publications ("Publications",
// "Gagosian Books", "Perrotin Editions - Books"), 3 books, 4 everything ("All"). Never a section of only some
// books (Selected, New, Rare, Sale…), editions, prints or posters. Lists of one rank: the smaller first.
const GALLERY_CATALOGUES=/\bcatalog(?:ue)?s?\b|\bkatalog(?:e)?\b|\bcataloghi\b|\bcatalogos\b|\bexhibition related\b|\bexhibition books\b/;
//@piece GALLERY_PUBS

const GALLERY_PUBS=/\bpublications?\b|\bpublikationen\b|\bpubblicazioni\b|\bpublicaciones\b|\bpublished by\b|\bpublishers?\b/;
//@piece GALLERY_BOOKS

const GALLERY_BOOKS=/\bbooks?\b|\blivres\b|\bbu(?:e)?cher\b|\blibri\b|\blibros\b/;
//@piece GALLERY_PART

const GALLERY_PART=/\b(?:new|latest|recent|selected|featured|highlights?|rare|signed|sale|archive|backlist|special|limited|holiday|gifts?|spotlight|edit|zero rated|vat|world book day|wbd|monographs?|artists books|staff picks|pre ?orders?|coming soon|from the archives|writings|lives|biography|kids|children s|childrens|criticism|theory|essays)\b/;
//@piece galleryListRank

function galleryListRank(words,ownName){
  const t=foldText(words).replace(/[^a-z0-9& ]+/g," ").replace(/\s+/g," ").trim();
  if(!t||GALLERY_PART.test(t))return 0;
  const books=GALLERY_BOOKS.test(t)||GALLERY_PUBS.test(t)||GALLERY_CATALOGUES.test(t);
  if(/\beditions?\b|\bprints?\b|\bposters?\b|\bmultiples?\b/.test(t)&&!books)return 0;
  if(GALLERY_CATALOGUES.test(t))return 1;
  if(GALLERY_PUBS.test(t)||(GALLERY_BOOKS.test(t)&&ownName&&ownName(t)))return 2;
  if(GALLERY_BOOKS.test(t))return 3;
  if(/^(?:all|alle|tout|tous|tutti|todos)$/.test(t))return 4;
  return 0;
}
//@piece galleryShop

async function galleryShop(page,museumHost,venueName,turnedDown,trace,foreign){
  const g={host:page.url?hostOf(page.url)||museumHost:museumHost,opens:0,seen:"",no:new Set((turnedDown||[]).map(normalizeUrlKey)),tried:new Set(),home:"",unread:null};
  // The gallery's own name in a list's name ("Gagosian Books"): its address's name, or the first word of its name.
  const names=[baseDomain(museumHost).split(".")[0],...String(venueName||"").split(/\s+/)].map(x=>foldText(x).replace(/[^a-z0-9]/g,"")).filter(x=>x.length>=4&&!/^(?:galerie|gallery|galleria|galeria|museum|paris|london|york|berlin)$/.test(x));
  const ownName=t=>{ const w=t.replace(/[^a-z0-9]/g,""); return names.some(n=>w.includes(n)); };
  const rank=w=>galleryListRank(w,ownName);
  const note=(step,what)=>{ if(trace)trace.push({step:"gallery-"+step,...what}); };
  const open=async(url,objective)=>{
    if(g.opens>=GALLERY_OPENS)return null;
    g.opens++;
    const f=await openShopPage(fetchPage,url,objective||"The page's links: the shop, books and publications, and the books with their prices.",null,{full:true});
    if(!f.ok||!f.results.length)return null;
    const t=pageTextOf(f.results); g.seen+="\n"+t;
    return t;
  };
  const own=u=>baseDomain(hostOf(u))===baseDomain(g.host);
  const shopSite=u=>!!hostOf(u)&&hostOf(u)!==g.host&&(SHOP_HOST.test(hostOf(u))||isShopPlace(u,g.host,"")||ownShopifyStore(u,g.host));
  const pathOf=u=>{ try{ return new URL(u).pathname; }catch{ return ""; } };
  const parentOf=u=>{ try{ const x=new URL(u); const p=x.pathname.replace(/\/[^/]+\/?$/,"/"); return p==="/"?"":x.origin+p; }catch{ return ""; } };
  // The ways in on a page, in its order: a shop elsewhere, a page of the gallery's own named for its books, a
  // book's "Purchase" (its list), a link into a shop site (that shop).
  const waysIn=text=>{
    const out=[];
    for(const l of mdLinks(text)){
      const u=l.url.split("#")[0], lab=foldText(l.label).replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
      if(notAShop(u)||GALLERY_NOT_PAGE.test(u))continue;
      const named=GALLERY_WAY.test(lab)||(own(u)&&GALLERY_WAY_PATH.test(pathOf(u))), buy=GALLERY_BUY.test(lab);
      if(shopSite(u))out.push({kind:"away",url:/\/(?:products?|collections|p|detail|item)\//i.test(u)?originOf(u):u});
      else if(!own(u)){ if(named||buy||GALLERY_SHOP_IN.test(lab))out.push({kind:"away",url:originOf(u)}); }
      else if(named)out.push({kind:"own",url:u});
      else if(buy&&parentOf(u))out.push({kind:"own",url:parentOf(u)});
    }
    const seen=new Set();
    return out.filter(c=>{ const k=c.kind+normalizeUrlKey(c.url); if(seen.has(k)||g.tried.has(k))return false; seen.add(k); return true; });
  };
  // A list proved as books: priced books on it, or one of its books opened — the one under a books heading
  // first (Massimo De Carlo's "Catalogues" among its prints), else the first.
  const sells=async(text,url)=>{
    if(looksLikeBookShelf(text))return true;
    // A heading naming its books, two priced entries under it (Massimo De Carlo's "## Catalogues", whose own pages
    // come back without the book).
    const head=String(text).search(/^#+\s*(?:catalog|books?\b|publications?\b|livres|publikationen|libri|pubblicazioni)/im);
    if(head>=0){ const part=String(text).slice(head).split(/\n#+\s/)[0]; if(part.split("\n").filter(l=>GALLERY_PRICE.test(foldText(l))).length>=2)return true; }
    const host=hostOf(url);
    let items=productLinksOn(text,host);
    if(items.length<2)items=itemsUnder(text,host,url);
    // The list read without its links: its books linked from the gallery's other pages (its home page), when their
    // titles are on it.
    if(items.length<2){ const flat=foldText(stripMd(text)); items=itemsUnder(g.seen,host,url).filter(u=>{ const l=mdLinks(g.seen).find(x=>x.url.split("#")[0]===u); const w=l?foldText(l.label).trim():""; return w.length>=6&&flat.includes(w); }); }
    if(items.length<2)items=[...new Set(mdLinks(text).filter(l=>GALLERY_BUY.test(foldText(l.label).trim())&&hostOf(l.url)===host).map(l=>l.url))];
    if(!items.length)return false;
    const at=String(text).search(/^#+\s*.*(?:catalog|books?|publication|livres|publikation|libri)/im);
    const after=at>=0?items.find(u=>String(text).indexOf(u,at)>at):null;
    for(const u of [...new Set([after,items[0]].filter(Boolean))]){
      const b=await open(u,"This book's title, price, binding, page count and ISBN.");
      if(!b||!galleryBookPage(b))continue;
      // The book bought in a shop elsewhere (Lévy Gorvy Dayan's Library: "Buy" → its shop): that shop.
      const buy=mdLinks(b).find(l=>hostOf(l.url)!==hostOf(u)&&shopSite(l.url)&&(GALLERY_BUY.test(foldText(l.label).trim())||/\/products?\//i.test(l.url)));
      return buy?{away:originOf(buy.url)}:true;
    }
    return false;
  };
  // Inside a shop: the narrowest list that holds its catalogues and can be read. A Shopify shop's own list of lists, else its front page's links;
  // no books-only list → the front page itself, when it sells books (Mennour: books, caps and bags).
  const inShop=async front=>{
    const o=originOf(front);
    const pick=async(cands,how)=>{
      const ranked=cands.map(c=>({...c,rank:rank(c.words)})).filter(c=>c.rank&&!g.no.has(normalizeUrlKey(c.url)))
        .sort((a,b)=>a.rank-b.rank||(a.count||Infinity)-(b.count||Infinity));
      for(const c of ranked.slice(0,4)){
        const pj=shopifyProductsUrl(c.url);
        if(pj){ if(g.opens>=GALLERY_OPENS)break; g.opens++; const j=await fetchPage(pj,"The products in this list: titles, types and prices.",null,{full:true}); if(j.ok&&shopifyShelfIsBooks(pageTextOf(j.results),false))return{url:c.url,how}; continue; }
        const t=await open(c.url); if(t&&await sells(t,c.url)===true)return{url:c.url,how};
      }
      return null;
    };
    if(g.opens<GALLERY_OPENS){
      g.opens++;
      const f=await fetchPage(o+"collections.json?limit=250","The shop's lists: titles and handles.",null,{full:true});
      let t=f.ok?pageTextOf(f.results):"";
      if(/"collections"\s*:/.test(t)){
        // A list of 250 is read on (Perrotin's "Perrotin Editions - Books" is on its second page).
        for(let page=2,last=t;page<=SHOPIFY_LIST_PAGES&&(last.match(/"handle"\s*:/g)||[]).length>=250&&g.opens<GALLERY_OPENS;page++){ g.opens++; const n=await fetchPage(o+"collections.json?limit=250&page="+page,"The shop's lists: titles and handles.",null,{full:true}); last=n.ok?pageTextOf(n.results):""; t+="\n"+last; }
        const lists=shopifySections(t,o).map(c=>({...c,count:+((t.split('"handle":"'+c.handle+'"')[1]||"").match(/"products_count"\s*:\s*(\d+)/)||[])[1]||0}));
        const r=await pick(lists,"the shop's lists");
        if(r)return r;
        if(g.opens<GALLERY_OPENS){ g.opens++; const j=await fetchPage(o+"collections/all/products.json?limit=8","The products in this shop: titles, types and prices.",null,{full:true}); if(j.ok&&shopifyShelfIsBooks(pageTextOf(j.results),false))return{url:o+"collections/all",how:"the shop's whole list"}; }
        // Products with no type given (Lévy Gorvy Dayan's): the whole list read as a page, one of its books opened.
        const all=await open(o+"collections/all");
        return all&&await sells(all,o+"collections/all")===true?{url:o+"collections/all",how:"the shop's whole list"}:null;
      }
    }
    const t=await open(front);
    if(!t)return null;
    const r=await pick(menuLinks(t,hostOf(front)).map(c=>({...c,words:c.label||c.words})),"the shop's menu");
    if(r)return r;
    return await sells(t,front)===true?{url:front,how:"the shop's front page"}:null;
  };
  // A page of the gallery's own: a link on it to a shop elsewhere is followed; else it is the shop when it sells
  // books. Its whole list ("All", "Alle Publikationen") is taken when that sells too; for a gallery in a country
  // that does not speak English, its English version when the page links one.
  const onOwn=async(url,text)=>{
    const t=text!=null?text:await open(url);
    if(!t||t.trim().length<SHELL_CHARS)return null;
    const away=mdLinks(t).find(l=>shopSite(l.url)||(!own(l.url)&&!notAShop(l.url)&&GALLERY_SHOP_IN.test(foldText(l.label))));
    if(away){ const r=await inShop(shopSite(away.url)&&!/\/(?:products?|collections)\//i.test(away.url)?away.url:originOf(away.url)); if(r)return{...r,home:originOf(away.url)}; }
    const sold=await sells(t,url);
    if(!sold)return null;
    if(sold.away){ const r=await inShop(sold.away); return r?{...r,home:sold.away}:null; }
    let list=url, listText=t;
    // Its narrower sections first (Karsten Greve's "Catalogues" tab, White Cube's "Publications"), each taken only if
    // it can be read; on a landing page with none, its "All" list (Zwirner's "All Books"); else the page itself.
    const self=rank(pathWords(url))||rank(String(t).match(/^#\s+(.+)$/m)?String(t).match(/^#\s+(.+)$/m)[1]:"")||4;
    // A link the page also shows with its price is one book, not a section (Zwirner's "Meet the Typographer, David
    // Zwirner Books, 2024" cover, "$19.95" beside it).
    const priced=new Set([...mdLinks(t).filter(l=>GALLERY_PRICE.test(foldText(l.label))).map(l=>normalizeUrlKey(l.url)),...booksSeenOn(t,hostOf(url)).map(b=>b.path)]);
    const isBook=u=>{ let p=""; try{ p=new URL(u).pathname; }catch{} return priced.has(normalizeUrlKey(u))||priced.has(p); };
    const subs=menuLinks(t,hostOf(url)).filter(c=>own(c.url)&&normalizeUrlKey(c.url)!==normalizeUrlKey(url)&&!GALLERY_NOT_PAGE.test(c.url)&&!isBook(c.url))
      .map(c=>({...c,rank:rank(c.label||"")})).filter(c=>c.rank);
    const narrower=subs.filter(c=>c.rank<self).sort((a,b)=>a.rank-b.rank);
    const allList=subs.find(c=>/^(?:all|alle|tout|tous|tutti|todos)\b/.test(foldText(c.label||"").trim())&&c.rank<=self&&c.rank!==4);
    for(const c of [...narrower,...(allList?[allList]:[])]){
      if(g.opens>=GALLERY_OPENS)break;
      const ct=await open(c.url);
      if(ct&&await sells(ct,c.url)===true){ list=c.url; listText=ct; break; }
    }
    // Its own language link, not its words: English titles make a German list read as English (Galerie Karsten Greve).
    const bare=u=>{ try{ const x=new URL(u); return x.host+x.pathname.replace(/\/$/,""); }catch{ return u; } };
    const en=foreign?[listText,t].map(x=>mdLinks(x).find(l=>EN_LABEL.test(foldText(l.label).trim())&&own(l.url)&&bare(l.url)!==bare(list))).find(Boolean):null;
    if(en){
      // Its address with the list's own filter: the site's language links carry whichever filter it last served.
      let eu=en.url; try{ const x=new URL(eu); if(!/lang|locale|language/i.test(x.search))x.search=new URL(list).search; eu=x.toString(); }catch{}
      const et=await open(eu);
      // The same list in English: its titles are the list's own (names are not translated), or it sells itself.
      const lines=x=>new Set(String(x).split("\n").map(l=>stripMd(l).trim()).filter(l=>l.length>=8));
      const ours=lines(listText), same=et?[...lines(et)].filter(l=>ours.has(l)).length:0;
      if(et&&pageLanguage(eu,et)==="en"&&(same>=5||await sells(et,eu)===true))list=eu;
    }
    return{url:list,how:"the gallery's own page",home:originOf(url)};
  };
  const tryAll=async(cands,step)=>{
    for(const c of cands){
      g.tried.add(c.kind+normalizeUrlKey(c.url));
      if(g.no.has(normalizeUrlKey(c.url)))continue;
      const r=c.kind==="away"?await inShop(c.url):await onOwn(c.url);
      note(step,{tried:c.url,kind:c.kind,found:r?r.url:null,opens:g.opens});
      if(r)return c.kind==="away"?{...r,home:originOf(c.url)}:r;
      if(g.opens>=GALLERY_OPENS)break;
    }
    return null;
  };
  let hit=null;
  // 1. The show page read.
  if(page.page)hit=await tryAll(waysIn(page.page),"show-page");
  // 2. The home page, a redirect followed (kamelmennour.com → mennour.com).
  if(!hit){
    let home="https://"+g.host+"/", t=await open(home,"The site's menu and footer links: shop, books, publications, library.");
    const moved=t&&t.trim().length<SHELL_CHARS&&/redirect/i.test(t)?mdLinks(t).find(l=>!own(l.url))||(t.match(/<(https?:\/\/[^>\s]+)>/)?{url:t.match(/<(https?:\/\/[^>\s]+)>/)[1]}:null):null;
    if(moved){ g.host=hostOf(moved.url); home=originOf(moved.url); t=await open(home,"The site's menu and footer links: shop, books, publications, library."); }
    g.home=t||"";
    if(!t||t.trim().length<SHELL_CHARS)g.unread="The gallery's site could not be read.";
    note("home",{home,read:!!t,chars:(t||"").length});
    if(t)hit=await tryAll(waysIn(t),"home");
  }
  // 3. The usual addresses, in one call. One that lands on the home page proves nothing.
  if(!hit&&g.opens<GALLERY_OPENS){
    const o="https://"+g.host+"/", paths=["shop","store","books","publications","publishing","en/shop","en/books","en/publications","en/publishing"];
    g.opens++;
    const f=await fetchPage(paths.map(p=>o+p),"The page's books with their prices, and its links to the shop.",null,{full:true});
    const answers=f.ok?paths.map(p=>(f.results||[]).find(r=>r&&normalizeUrlKey(r.url)===normalizeUrlKey(o+p))).filter(Boolean):[];
    for(const r of answers){
      const t=pageTextOf([r]);
      if(t.trim().length<SHELL_CHARS||(g.home&&t.slice(0,600)===g.home.slice(0,600)))continue;
      g.seen+="\n"+t;
      const got=await onOwn(r.url,t);
      note("address",{tried:r.url,found:got?got.url:null,opens:g.opens});
      if(got){ hit=got; break; }
      if(g.opens>=GALLERY_OPENS)break;
    }
  }
  // 4. A search, its results judged as the pages were: a shop site, a page of the gallery's own named for its books.
  if(!hit&&g.opens<GALLERY_OPENS){
    g.opens++;
    const s=await searchWeb("Where "+venueName+" sells its books and exhibition catalogues online.",[venueName+" shop books",venueName+" publications catalogues buy"]);
    const res=s.ok?s.results||[]:[];
    const cands=[...res.filter(r=>shopSite(r.url)).map(r=>({kind:"away",url:originOf(r.url)})),
      ...res.filter(r=>own(r.url)&&GALLERY_WAY_PATH.test(pathOf(r.url))&&!/\/(?:detail|products?)\//i.test(r.url)).map(r=>({kind:"own",url:r.url}))]
      .filter((c,i,a)=>a.findIndex(x=>x.kind+normalizeUrlKey(x.url)===c.kind+normalizeUrlKey(c.url))===i&&!g.tried.has(c.kind+normalizeUrlKey(c.url)));
    note("search",{results:res.length,ways:cands.map(c=>c.url)});
    hit=await tryAll(cands,"search");
  }
  if(!hit){ note("result",{shop:"none",unread:g.unread,opens:g.opens}); return{shop:"none",unread:g.unread}; }
  const home=hit.home||originOf(hit.url);
  const search=searchFor(g.seen+"\n"+hit.url,home)||(await proveShopSearch(g.seen,home))||null;
  note("result",{shop:"found",shopCatalogues:hit.url,how:hit.how,opens:g.opens});
  return{shop:"found",shopHome:home,shopCatalogues:hit.url,shelfKind:"books",shopSearch:search,foundBy:hit.how,finder:3,searchRule:SEARCH_RULE};
}
