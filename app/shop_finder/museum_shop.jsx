//@ Finding a museum's shop and its catalogue shelf.
//@piece SHOP_WORD


// ── FINDING A NEW VENUE'S SHOP SECTION — once per venue, then kept ─────────
// Wanted: the shop's exhibition-catalogues section, else books / publications; never
// the front page, one book or a post (her decision; docs/add_by_link.md). Each step
// runs only if the one before found nothing: 1. one search call, two queries, every
// result ranked in code; 2. a Shopify shop's collections.json; 3. the shop's menu.
// The pick is opened and must read as books with prices, or one of its products as a book
// with a price (Yale's Publications lists titles only; AL-042). "Look again" skips only the
// pages she turned down, never the site. Evidence: docs/link_pages/shop_search/.
// One list of words for a shop, in the languages met: a link's label, a host, a path part.
// Danish "butik" (Louisiana), a name run into "shop" ("KMSKAShop", kmskashop.be) — never "workshop".
const SHOP_WORD="shop|store|boutique|tienda|winkel|webshop|museumshop|museumsshop|negozio|librairie|bookshop|butik|butikk|kauppa";
//@piece SHOP_WORDS

const SHOP_WORDS=new RegExp("^(?:the\\s+)?(?:museum\\s+|online\\s+|gift\\s+|book)?(?:"+SHOP_WORD+")(?:\\s+online)?$|^(?!work)[\\p{L}]{2,}shop$","iu");
//@piece SHOP_HOST

const SHOP_HOST=new RegExp("^(?:"+SHOP_WORD+")\\.|(?<!work)shop|butik","i");
//@piece SHOP_PATH

const SHOP_PATH=new RegExp("\\/(?:[^\\/]*[-_])?(?:museum-?)?(?:"+SHOP_WORD+")(?:[-_][^\\/]*)?(?:\\/|$)|\\/(?!work)[a-z]{2,}shop(?:[-_][^\\/]*)?(?:\\/|$)","i");
//@piece shopLinkOnPage

// The show page's own link to its shop, as an address; "" when it has none.
function shopLinkOnPage(text,museumHost){
  const links=mdLinks(text).filter(l=>!notAShop(l.url));
  const named=links.find(l=>SHOP_WORDS.test(l.label));
  if(named)return named.url;
  const byHost=links.find(l=>hostOf(l.url)!==museumHost&&SHOP_HOST.test(hostOf(l.url)));
  return byHost?originOf(byHost.url):"";
}
//@piece NOT_SHOP_HOST

// Nor an app store or a social site (Petit Palais's app on play.google.com/store/…).
const NOT_SHOP_HOST=/(?:^|\.)(?:play\.google|apps\.apple|itunes\.apple|facebook|instagram|twitter|x|tiktok|youtube|linkedin|pinterest|wikipedia)\.[a-z.]+$/i;
//@piece notAShop

const notAShop=u=>isFileUrl(u)||NOT_SHOP_HOST.test(hostOf(u));
//@piece isShopPlace

function isShopPlace(u,museumHost,pageShopHost){
  const h=hostOf(u).replace(/^www\./,"");
  if(!h)return false;
  if(notAShop(u))return false;
  if(pageShopHost&&h===pageShopHost.replace(/^www\./,""))return true;
  const b=baseDomain(museumHost), hb=baseDomain(h), label=b.split(".")[0], hl=hb.split(".")[0];
  if(hb===b){ let path=""; try{ path=new URL(u).pathname; }catch{} return SHOP_HOST.test(h)||SHOP_PATH.test(path); }
  return label.length>=3&&hl!==label&&hl.includes(label)&&SHOP_HOST.test(hl);
}
//@piece namesVenue

// A shop company selling for several museums, on its own site: the section whose address
// names the venue (CEDON's "/Kataloge/Alte-Pinakothek-Muenchen"), for a venue with
// `shopNamed`. Another house's section there is not its shop.
function namesVenue(u,named){
  if(!named||!SHOP_HOST.test(hostOf(u)))return false;
  const w=s=>" "+foldText(s).replace(/[^a-z0-9]+/g," ").trim()+" ";
  return w(pathWords(u)).includes(w(named));
}
//@piece SHELF_CATALOGUES

// A section names itself in the plural — one book's page or a blog post is not a
// section. Words are read with accents folded.
// German joins its words: "Ausstellungskataloge" (Berlin) ends in "kataloge"; "buecher" is
// "Bücher" in an address.
// Scandinavian joins its words too: "udstillingskataloger" (Louisiana).
const SHELF_CATALOGUES=/\bcatalog(?:ue)?s\b|\bcatalogos\b|\bcatalogi\b|\bcataloghi\b|kataloge\b|kataloger\b/;
//@piece SHELF_EXHIBITIONS

// A section of exhibitions' catalogues, first in her order: "Exposiciones: catálogos y guías" (Thyssen) above its
// collection guides and catalogues; "Exhibition catalogues" (Beyeler).
const SHELF_EXHIBITIONS=/\bexhibitions?\b|ausstellung|udstilling|utstallning|tentoonstelling|\bexposicion(?:es)?\b|\bexpositions?\b|\bmostr[ae]\b/;
//@piece SHELF_EXHIBITIONS_ONLY

const SHELF_EXHIBITIONS_ONLY=/^(?:exhibitions|ausstellungen|udstillinger|utstallningar|tentoonstellingen|exposiciones|expositions|mostre)$/;
//@piece SHELF_BOOKS

const SHELF_BOOKS=/\bbooks\b|\bpublications\b|\bpublicaciones\b|\bpublicaties\b|\bpubblicazioni\b|\bpublikationen\b|\bpublikationer\b|\blivres\b|\blibros\b|\bboeken\b|\bbu(?:e)?cher\b|\blibri\b|\bbocker\b|\bboger\b|\bboker\b/;
//@piece SHELF_NOT

// A section that says it is NOT books ("All Products (not Catalogues)") is not one.
const SHELF_NOT=/\b(?:not|non|sin|sans|ohne|niet|geen|zonder|except)\b\W+(?:\w+\W+)?(?:catalog|book|boek|libr|livre|public)/;
//@piece SHELF_SALE

// A sale or clearance section holds only some of the books ("Catálogos en
// oferta", Thyssen): kept as a last resort, never ahead of a whole section.
const SHELF_SALE=/\b(?:sale|clearance|offers?|outlet|ofertas?|rebajas|saldi|soldes|korting|aanbieding|black friday|promo\w*)\b/;
//@piece SHELF_PUBS

// Books and only books (her decision): a section mixing books with other goods
// ("Books & Stationery") is never the shelf; it is opened for a books-only section
// inside it. A museum's own publications rank above a general books section.
// German and Scandinavian too: "publikationen" (Albertina, Beyeler), "publikationer", "böcker" (folded "bocker").
const SHELF_PUBS=/\bpublications\b|\bpublicaciones\b|\bpublicaties\b|\bpubblicazioni\b|\bpublikationen\b|\bpublikationer\b/;
//@piece SHELF_GOODS

const SHELF_GOODS=/\b(?:stationery|stationary|gifts?|toys|games|apparel|clothing|jewell?ery|accessories|homeware|home goods|decor|cards|notecards|journals|notebooks|prints|posters|supplies|merch\w*|souvenirs?|papeterie|cadeaux|jouets|regalos|papeleria|juguetes|cadeaus|speelgoed|regali|cartoleria|giochi)\b/;
//@piece NOT_A_SHELF

// One book's page is not a section (Bider & Tanner's ".../detail/ISBN-978...").
const NOT_A_SHELF=/\/(?:products?|p|detail|blogs?|news|journal|articles?|stories|pages|account|cart)\/|\/isbn-\d|[?&]q=|\/search/i;
//@piece sectionUnderProducts

// …unless the step after "/products/" is itself a section's word (Albertina's "/en/products/publications/").
const sectionUnderProducts=u=>{ const m=String(u).match(/\/products?\/([^/?#]+)\/?(?:[?#]|$)/i); const w=m?foldText(decodeURIComponent(m[1])).replace(/[-_]/g," "):""; return !!w&&(SHELF_CATALOGUES.test(w)||SHELF_BOOKS.test(w)); };
//@piece pathWords

function pathWords(u){ try{ return decodeURIComponent(new URL(u).pathname).replace(/[-_/.]/g," "); }catch{ return ""; } }
//@piece LANG_PART

// A shop address's language part: "/de/", "/en-gb/", a Shopify market's "/en-int/" (Louisiana).
const LANG_PART="[a-z]{2}(?:-[a-z]{2,3})?";
//@piece isFrontPage

function isFrontPage(u){ try{ return new RegExp("^\\/(?:"+LANG_PART+"\\/?)?$","i").test(new URL(u).pathname); }catch{ return true; } }
//@piece rankShelves

// Candidates, best first: a catalogues section, then the museum's
// publications, then books; a sale section after all of them. Ties keep the
// order they came in (the search's own). A books section mixed with other
// goods comes back apart, as `mixed` — never a pick, only a place to look in.
// `target`: the shop's exhibition-catalogues section, named so by itself (or the venue's own section on a
// shop company's site, CEDON) — the one right answer, taken at once (her design). A books section whose
// label is the museum's own name is its publications (KMSKA's "KMSKA" shelf under Books); `ownName` tests it.
function rankShelves(cands,ownName){
  const out=[], mixed=[];
  cands.forEach((c,n)=>{
    if(!c||!c.url||(NOT_A_SHELF.test(c.url)&&!sectionUnderProducts(c.url))||isFrontPage(c.url))return;
    const t=foldText(c.words).replace(/\bgift ?shop\b|\bmuseum stores?\b/g," ");
    if(SHELF_NOT.test(t))return;
    // A section's own description (`about`) names what it holds; "No te quedes sin los catálogos" is no "not".
    const ta=t+" "+foldText(c.about||"");
    let kind=SHELF_CATALOGUES.test(ta)?"catalogues":SHELF_PUBS.test(ta)?"publications":SHELF_BOOKS.test(ta)?"books":null;
    if(!kind)return;
    if(kind==="books"&&SHELF_GOODS.test(t)){ mixed.push(c); return; }
    if(kind==="books"&&ownName&&ownName(c.label))kind="publications";
    const sale=SHELF_SALE.test(t), target=kind==="catalogues"&&!sale&&(SHELF_EXHIBITIONS.test(ta)||!!c.named);
    out.push({...c,kind,target,score:({catalogues:3,publications:2,books:1})[kind]+(target?0.5:0)-(sale?2.5:0),n});
  });
  out.sort((a,b)=>b.score-a.score||a.n-b.n);
  out.mixed=mixed;
  return out;
}
//@piece BOOK_WORD

// A SHELF OF BOOKS, READ OFF ITS TEXT: book words and prices, both plural. German joins
// its words ("Ausstellungskataloge", Berlin).
const BOOK_WORD=/\bisbn\b|\bhard(?:cover|back)\b|\bpaperback\b|\bsoftcover\b|\bpages\b|\bcatalog(?:ue|o|us)?s?\b|\bcatalogi\b|kataloge?\b|\bbooks?\b|\bboek(?:en)?\b|\blibros?\b|\blivres?\b|\bbuch\b|\bbu(?:e)?cher\b|\bbok\b|\bbocker\b|\bpublikation(?:en|er)?\b|\bseiten\b|\bsidor\b|\btapa (?:dura|blanda)\b/g;
//@piece PRICE

// Swiss francs and Scandinavian crowns count too (Beyeler "CHF 45.00", Nationalmuseum "SEK 345"), and a
// currency code before the number (Albertina "EUR 24,90").
const PRICE=/[$€£]\s?\d|\b(?:chf|sek|dkk|nok|kr\.?|eur|usd|gbp|aud|cad)\s?\d|\d[.,]\d{2}\s?(?:€|eur\b|usd\b|gbp\b|chf\b|\$|£)|\d\s?(?:sek|dkk|nok|kr)\b/g;
//@piece looksLikeBookShelf

function looksLikeBookShelf(text){
  const t=foldText(text);
  return (t.match(BOOK_WORD)||[]).length>=3&&(t.match(PRICE)||[]).length>=2;
}
//@piece PRODUCT_LINK

const PRODUCT_LINK=/\/products?\/[^/?#]|\/p\/[^/?#]|product_?detail|[?&]product_?id=/i;
//@piece productLinksOn

function productLinksOn(text,host){ return [...new Set(mdLinks(text).filter(l=>hostOf(l.url)===host&&PRODUCT_LINK.test(l.url)).map(l=>l.url))]; }
//@piece looksLikeOneBook

function looksLikeOneBook(text){
  const t=foldText(text);
  return /\bisbn\b|\bhard(?:cover|back)\b|\bpaperback\b|\bsoftcover\b/.test(t)&&new RegExp(PRICE.source).test(t);
}
//@piece titleOnly

// A shop page that comes back as one line, its title alone, is opened once more with
// "page=1" added: Yale's shop (on Touchnet) sends its menu, lists and books only when the
// address names a page (AL-042). A short page of several lines is a page, never retried
// (a Louvre book page: title, seller, EAN). One copy: the finder, the lookup's book page
// and Re-check. `open` is fetchPage, or a lookup's io.fetch, which counts the call.
const titleOnly=results=>{ const t=pageTextOf(results); return !!t&&!t.includes("\n")&&pageIsShell(results); };
//@piece openShopPage

async function openShopPage(open,url,objective,queries,opts){
  const f=await open(url,objective,queries,opts);
  if(!f.ok||!f.results.length||(f.errors||[]).length||!titleOnly(f.results)||/[?&]page=/i.test(url))return f;
  const again=await open(url+(url.includes("?")?"&":"?")+"page=1",objective,queries,opts);
  return again.ok&&again.results.length&&!pageIsShell(again.results)?again:f;
}
//@piece itemsUnder

// A list of titles without prices (Yale's Publications): its first product is opened, and
// must read as one book with a price (her decision; AL-042). One copy: the finder and the
// lookup's shop step.
// `list`: the list's own address. Its books under it count as its items when no address looks like a
// shop's product (Galerie Karsten Greve's ".../en/publications/detail/…").
function itemsUnder(text,host,list){
  let base=""; try{ base=new URL(list).pathname.replace(/\/?$/,"/"); }catch{ return []; }
  if(base==="/")return [];
  const bare=h=>String(h||"").replace(/^www\./,"");
  return [...new Set(mdLinks(text).filter(l=>{ if(bare(hostOf(l.url))!==bare(host)||NOT_A_BOOK_LINK.test(l.url))return false; let p=""; try{ p=new URL(l.url).pathname; }catch{ return false; } return p.startsWith(base)&&p.length>base.length+1; }).map(l=>l.url.split("#")[0]))];
}
//@piece firstProductIsBook

async function firstProductIsBook(open,text,host,list){
  let items=productLinksOn(text,host), under=false;
  if(items.length<2&&list){ items=itemsUnder(text,host,list); under=true; }
  if(items.length<2)return false;
  const b=await openShopPage(open,items[0],"This book's title, price and ISBN.",null,{full:true});
  // A book under its list's address is read as a gallery's book page: "80 €" with no cents counts.
  return b.ok&&(looksLikeOneBook(pageTextOf(b.results))||(under&&galleryBookPage(pageTextOf(b.results))));
}
//@piece menuLinks

// A page's links on the shop's own site, as menu entries. A long label is read by its first
// six words: Touchnet adds "The number of products in this category is" to each (Yale).
// A book's own address, a number then its name inside its section ("/buecher-und-medien/
// ausstellungskataloge/6442/brancusi", Berlin), is never a section: the section it sits in
// is taken instead, named by its address alone.
function menuLinks(text,host){
  const out=[],seen=new Set();
  for(const l of mdLinks(text)){
    if(hostOf(l.url)!==host)continue;
    const label=l.label.split(/\s+/).slice(0,6).join(" ");
    let c={url:l.url,label,words:label+" "+pathWords(l.url)};
    try{
      const x=new URL(l.url), m=x.pathname.match(/^(\/.+\/)\d{3,}\/[^/]+\/?$/);
      if(m){ const u=x.origin+m[1]; c={url:u,words:pathWords(u)}; }
    }catch{}
    const k=normalizeUrlKey(c.url);
    if(seen.has(k))continue;
    seen.add(k); out.push(c);
  }
  return out;
}
//@piece shopifyShelfIsBooks

// A Shopify section whose page shows no books (drawn by script, out of the connector's
// copy; Mia): its own product list, read as text. Books when at least two products carry
// a price and most carry a book type ("Books", "Art Book", "Catalogue", "Catálogo").
// The exhibition-catalogues section (`target`) needs only two books: a section named for its exhibitions'
// catalogues counts even when it also sells those shows' goods (her decision; Thyssen's "Exposiciones").
function shopifyShelfIsBooks(text,target){
  const t=String(text||"");
  const types=[...t.matchAll(/"product_type"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map(m=>foldText(m[1]));
  const prices=(t.match(/"price"\s*:\s*"?\d/g)||[]).length;
  const bookish=types.filter(x=>/\bbooks?\b|\bcatalog(?:ue|o)?s?\b|\bpublications?\b|\blibros?\b/i.test(x)).length;
  return types.length>=2&&prices>=2&&(target?bookish>=2:bookish*2>types.length);
}
//@piece shopifyProductsUrl

function shopifyProductsUrl(u){
  try{ const x=new URL(u); return new RegExp("^\\/(?:"+LANG_PART+"\\/)?collections\\/[^/]+\\/?$","i").test(x.pathname)?x.origin+x.pathname.replace(/\/$/,"")+"/products.json?limit=8":""; }catch{ return ""; }
}
//@piece shopifySections

// A Shopify shop's sections, read as text (a long list can come back cut short); empty
// ones skipped; ranked on the TITLE her menu shows, never the handle.
function shopifySections(text,root){
  const out=[];
  for(const chunk of String(text||"").split(/\{\s*"id"\s*:/).slice(1)){
    const t=(chunk.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)||[])[1];
    const h=(chunk.match(/"handle"\s*:\s*"([^"]+)"/)||[])[1];
    const n=(chunk.match(/"products_count"\s*:\s*(\d+)/)||[])[1];
    const id=(chunk.match(/^\s*(\d+)/)||[])[1]||"";
    if(!t||!h||n==="0")continue;
    let title=t; try{ title=JSON.parse('"'+t+'"'); }catch{}
    // A section named only "Exhibitions" says in its own description what it holds (Thyssen's: "los catálogos y
    // artículos exclusivos de nuestras exposiciones"). A show's own section is read by its title alone.
    let about="";
    if(SHELF_EXHIBITIONS_ONLY.test(foldText(title).trim())){ const d=(chunk.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/)||[])[1]||""; try{ about=JSON.parse('"'+d+'"').replace(/<[^>]*>/g," "); }catch{} }
    out.push({url:root+"collections/"+h,words:title,about,id,handle:h});
  }
  return out;
}
//@piece langOf

// The shop's root, keeping a language path its own link chose ("/en/").
function langOf(u){ try{ return ((new URL(u).pathname.match(new RegExp("^\\/("+LANG_PART+")(?:\\/|$)","i"))||[])[1]||"").toLowerCase(); }catch{ return ""; } }
//@piece shopRootOf

function shopRootOf(u){
  try{ const x=new URL(u), lang=langOf(u); return x.origin+"/"+(lang?lang+"/":""); }catch{ return ""; }
}
//@piece EN_WORDS

// A page's language, for a venue in a country that does not speak English (her design: its shop's
// English version is the one wanted): the address's language part, an "en." site, else its words —
// English beats the others by half again ("In Stock" against "Auf Lager", Albertina). "" when too few.
const EN_WORDS=/\b(?:the|and|of|your|our|with|from|this|are|you|stock|cart|basket|opening hours|shipping|delivery|privacy|books|catalogues?)\b/g;
//@piece NOT_EN_WORDS

const NOT_EN_WORDS=/\b(?:und|der|das|mit|fur|oder|zur|auf|lager|warenkorb|og|til|med|af|kurv|ikke|le|les|du|des|pour|avec|panier|el|los|las|del|con|para|carrito|het|een|voor|winkelwagen|il|della|carrello|och|att|varukorg)\b/g;
//@piece pageLanguage

function pageLanguage(url,text){
  const lang=langOf(url);
  if(lang)return /^en\b/.test(lang)?"en":"other";
  if(/^en\./i.test(hostOf(url)))return "en";
  const t=foldText(stripMd(text)), en=(t.match(EN_WORDS)||[]).length, not=(t.match(NOT_EN_WORDS)||[]).length;
  if(en+not<5)return "";
  return en>not*1.5?"en":"other";
}
//@piece isEnglishUrl

const isEnglishUrl=u=>/^en\b/.test(langOf(u))||/^en\./i.test(hostOf(u));
//@piece EN_LABEL

// A language link's label: "English", "Englisch" (Albertina), "EN", in the languages met.
const EN_LABEL=/^(?:en|eng|english|englisch|anglais|ingles|engels|engelsk|engelska|inglese|englanti)$/;
//@piece EN_PATHS

// The shop's English addresses tried when no language link leads there: Louisiana's English shop is
// "/en-int/", its "/en/" not found.
const EN_PATHS=["en/","en-int/","en-gb/","en-us/"];
//@piece searchFor

// A search address only where the shop's platform says how it searches.
function searchFor(text,home){
  const o=originOf(home);
  if(!o)return null;
  if(/\/collections\/|\/products\/|cdn\.shopify/i.test(text))return o+"search?q=";
  if(/catalogsearch/i.test(text))return o+"catalogsearch/result/?q=";
  return null;
}
//@piece SEARCH_RULE

// The whole shop's search, proved (her decision: a link venue is looked up as the 28
// are, shelf AND search — DIA files a show's book in the show's own section). Each
// common shop search is asked for a book seen on the shop's pages; the first whose
// results carry that book's page is kept. None → null (shelf alone); a call that
// died → undefined, asked again next time. AL-008k, AL-014. Each fallback below runs
// only where the rule before it finds nothing (her decision; CEDON, AL-044).
// The search proof's version: a venue stored under an older one is proved again once.
const SEARCH_RULE=2;
//@piece SEARCH_SHAPES

const SEARCH_SHAPES=["search?q=","search.php?search_query=","catalogsearch/result/?q=","?post_type=product&s="];
//@piece SEARCH_SHAPES_LATER

// Shopware's two searches (CEDON "search?search=", Berlin "search?sSearch="): a second call,
// made only when the first proves nothing — one call carries 20 addresses at most.
const SEARCH_SHAPES_LATER=["search?search=","search?sSearch="];
//@piece PRICE_ONE

const PRICE_ONE=new RegExp(PRICE.source,"i");
//@piece NOT_A_BOOK_LINK

const NOT_A_BOOK_LINK=/cart|wishlist|account|login/i;
//@piece BLOCK_LINES

const BLOCK_LINES=6;
//@piece BUTTON_LABEL
   // lines of a link's block read for its price
// A shop's buttons beside a price are not books (Cleveland's filter "Reset", the RA's "Shop now").
const BUTTON_LABEL=/^(?:reset|clear(?: all)?|shop(?: now| all)?|details|view(?: all| more)?|more|quick view|add to (?:cart|basket|bag)|buy(?: now)?|zum produkt|jetzt bestellen|optionen w\u00e4hlen|in den warenkorb)$/i;
//@piece realPrice

// "0,00 €" is an empty basket's total, never a book's price (Berlin's "Merkzettel").
const realPrice=l=>PRICE_ONE.test(l)&&!/(?:^|[^\d.,])0[.,]00\s?(?:€|eur\b)|[$£€]\s?0[.,]00\b/i.test(l);
//@piece booksSeenOn

// A book on the shop's pages: a link with its price right after it; failing that, a link
// whose own block (to the next link on the shop) holds a price within a few lines — CEDON
// prints title, description, then "Regulärer Preis: 34,90 €".
function booksSeenOn(text,host,both){
  const out=[], seen=new Set();
  const add=(label,url)=>{
    let path=""; try{ path=new URL(url).pathname; }catch{ return; }
    if(path.length<3||NOT_A_BOOK_LINK.test(url)||seen.has(path))return;
    seen.add(path); out.push({label:stripMd(label),path});
  };
  for(const m of String(text||"").matchAll(/\[([^\]\[]{3,160})\]\((https?:\/\/[^)\s]+)\)([^\[\n]{0,40})/g)){
    if(PRICE_ONE.test(m[3])&&hostOf(m[2])===host)add(m[1],m[2]);
  }
  if(out.length&&!both)return out;
  const links=[...String(text||"").matchAll(/\[([^\]\[]{3,160})\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/g)].filter(m=>hostOf(m[2])===host);
  // A title cut short ("Göttinnen und Gattinnen. Frauen...", Berlin) takes its book's longest one.
  const full=new Map();
  for(const m of links){ let p=""; try{ p=new URL(m[2]).pathname; }catch{ continue; } const l=stripMd(m[1]).trim(); if(l.length>(full.get(p)||"").length)full.set(p,l); }
  links.forEach((m,i)=>{
    const end=i+1<links.length?links[i+1].index:undefined;
    const block=String(text).slice(m.index+m[0].length,end).split("\n").map(l=>l.trim()).filter(Boolean).slice(0,BLOCK_LINES);
    let p=""; try{ p=new URL(m[2]).pathname; }catch{}
    if(!BUTTON_LABEL.test(stripMd(m[1]).trim())&&block.some(realPrice))add(full.get(p)||m[1],m[2]);
  });
  return out;
}
//@piece proveShopSearch

async function proveShopSearch(text,home){
  const host=hostOf(home), books=booksSeenOn(text,host).slice(0,2);
  if(!host||!books.length)return null;
  const bases=[...new Set([originOf(home),shopRootOf(home)])].filter(Boolean);
  const key=u=>{ try{ return decodeURIComponent(normalizeUrlKey(u)).replace(/\+/g," "); }catch{ return normalizeUrlKey(u); } };
  const same=s=>foldText(s).replace(/[^a-z0-9]+/g," ").trim();
  for(const shapes of [SEARCH_SHAPES,SEARCH_SHAPES_LATER]){
    const tries=[];
    for(const b of bases)for(const sh of shapes)for(const bk of books)tries.push({search:b+sh,path:bk.path,label:bk.label,url:b+sh+encodeURIComponent(bk.label)});
    const f=await fetchPage(tries.map(t=>t.url),"The products this shop search returns: their names and links.",null,{full:true});
    if(!f.ok)return undefined;
    const answer=t=>f.results.find(x=>x&&key(x.url)===key(t.url));
    // A page that is the same whatever was asked is not a search (CEDON's "search?q=").
    const fixed=t=>tries.filter(x=>x.search===t.search&&x!==t).some(x=>{ const a=answer(x), b=answer(t); return a&&b&&pageTextOf([a])===pageTextOf([b]); });
    for(const t of tries){ const r=answer(t); if(r&&pageTextOf([r]).includes(t.path)&&!fixed(t))return t.search; }
    // The book under another address in the results (CEDON's /detail/<id>, Berlin's other
    // category): its title, priced — on a page for that book alone. A page that ignores the
    // words lists both books, or the same page for both (Berlin's home page, CEDON's
    // "search?q="), and proves nothing; so two books are needed.
    const shows=(r,label)=>booksSeenOn(pageTextOf([r]),host,true).some(b=>same(b.label)===same(label));
    const bySearch=new Map();
    for(const t of tries){ if(!bySearch.has(t.search))bySearch.set(t.search,[]); bySearch.get(t.search).push(t); }
    for(const [search,[a,b]] of bySearch){
      const ra=a&&answer(a), rb=b&&answer(b);
      if(!ra||!rb||pageTextOf([ra])===pageTextOf([rb]))continue;
      if((shows(ra,a.label)&&!shows(ra,b.label))||(shows(rb,b.label)&&!shows(rb,a.label)))return search;
    }
  }
  return null;
}
//@piece SHOP_AWAY_LABEL

// The museum's own Shop page (its own site, a /shop path) and the link on it to a shop on
// another site: one labelled as the shop ("Shop now", "Online shop") or a shop's address.
// At most two such pages opened. → {url, text} or {died}.
const SHOP_AWAY_LABEL=/^(?:shop|buy|order)(?:\s+(?:now|online|here))?$|\bonline\s+(?:shop|store)\b|\bvisit\s+(?:the|our)\s+(?:online\s+)?(?:shop|store)\b/i;
//@piece shopElsewhere

async function shopElsewhere(urls,museumHost){
  const b=baseDomain(museumHost), seen=new Set();
  let opened=0, died=null;
  for(const u of urls){
    const h=hostOf(u);
    if(!u||!h||baseDomain(h)!==b||SHOP_HOST.test(h))continue;
    let path=""; try{ path=new URL(u).pathname; }catch{}
    if(!SHOP_PATH.test(path)||seen.has(normalizeUrlKey(u)))continue;
    seen.add(normalizeUrlKey(u));
    if(opened>=2)break;
    opened++;
    const f=await fetchPage(u,"The link to the museum's online shop.",null,{full:true});
    if(!f.ok){ died=f.detail; continue; }
    const t=pageTextOf(f.results);
    const pathOf=x=>{ try{ return new URL(x).pathname; }catch{ return ""; } };
    // A shop's address on another site counts too (Hamburg's Friends' shop, freunde-der-kunsthalle.de/shop/).
    // A shop on the museum's own sub-address counts as well (Louisiana's butik.louisiana.dk).
    const out=mdLinks(t).find(l=>{ const lh=hostOf(l.url); return lh&&!notAShop(l.url)&&(baseDomain(lh)!==b||SHOP_HOST.test(lh))&&(SHOP_AWAY_LABEL.test(l.label)||SHOP_HOST.test(lh)||SHOP_PATH.test(pathOf(l.url))||/\.myshopify\.com$/i.test(lh)); });
    // Else the shop itself on the museum's own site, under its own address (Belvedere's /shop?kategorie=…).
    const home=out?null:mdLinks(t).find(l=>!isFileUrl(l.url)&&baseDomain(hostOf(l.url))===b&&SHOP_PATH.test(pathOf(l.url))&&pathOf(l.url)!==path&&!/ticket/i.test(l.url));
    if(home)return{url:originOf(home.url)+pathOf(home.url).replace(/^\//,""),text:t};
    // A Shop page that hands over the shop itself (Berlin's smb.museum/webshop shows the
    // shop's front page) links one book first: that book's site is the shop, not the book.
    if(out)return{url:/\/(?:detail|products?|p|item)\//i.test(out.url)?originOf(out.url):out.url,text:t};
  }
  return{died};
}
//@piece SHELF_OPENS

const SHELF_OPENS=2;
//@piece WALK_OPENS
   // at most two candidates opened to check, then the next step
const WALK_OPENS=4;
//@piece firstPageOf
    // at most four of the shop's pages opened to walk it, after the search (her design)
// pageShop: the show page's own shop link (shopLinkOnPage), kept on the venue
// so "Look again" has it without reading the show page twice.
// A list's later page stands for its first: the section is kept by its first page (KMSKA: the search
// ranked ".../books/kmska/page2.html" first). "/page2.html", "/page-2", "/page/2/", "?page=2". Its sort
// order is no part of it either ("?sort_by=best-selling", Thyssen; "?sort=down", Beyeler).
function firstPageOf(u){
  try{
    const x=new URL(u);
    x.pathname=x.pathname.replace(/\/page-?(\d+)(?:\.html?)?\/?$|\/page\/(\d+)\/?$/i,(m,a,b)=>+(a||b)>=2?"/":m);
    const p=x.searchParams.get("page");
    if(/^\d+$/.test(p||"")&&+p>=2)x.searchParams.delete("page");
    for(const k of ["sort","sort_by","sortby","order","orderby","dir"])x.searchParams.delete(k);
    return x.toString();
  }catch{ return u; }
}
//@piece discoverShop

// The shop finder in named steps, as the show page reader is: each step reads and writes `sf`, the
// search for one venue's shop; `trace`, when given, collects what each step did (the standing check,
// scraper/shop_check.js — a miss shows the step where it went wrong). The app passes none.
// HER DESIGN: there is one right section, the shop's exhibition catalogues. A search result is taken only
// if it is that section; otherwise the shop is walked for it. Only when the shop has none does the finder
// take the best it saw, and the shop screen says "Shop found, but not its catalogues section" (her wording).
// `foreign`: the venue's country does not speak English — its shop's English version is looked for first.
// `gallery`: Claude named the venue a gallery — {page, url}, the show page read, or true when there is none
// (Look again). The gallery path runs first; when it finds no shop, the museum path below runs unchanged.
async function discoverShop(pageShop,museumHost,venueName,turnedDown,venueId,trace,foreign,gallery){
  if(gallery){
    const g=await galleryShop(gallery===true?{}:gallery,museumHost,venueName,turnedDown,trace,foreign);
    if(g.shop==="found")return g;
    const m=await discoverShop(pageShop,museumHost,venueName,turnedDown,venueId,trace,foreign);
    // A gallery whose own site could not be read is never "no shop" (her design).
    return m.shop==="none"&&g.unread?{shop:"failed",why:g.unread,finder:3}:m;
  }
  const sf=shopFinderStart(pageShop,museumHost,venueName,turnedDown,venueId,trace);
  sf.foreign=!!foreign;
  const ruled=shopFromRule(sf);
  if(ruled)return ruled;
  await searchForShop(sf);
  await pickFromSearch(sf);
  await followShopElsewhere(sf);
  await shopifySectionList(sf);
  await walkShop(sf);
  await englishVersion(sf);
  if(!sf.pick&&sf.best){ sf.pick=sf.best; sf.note("settled",{pick:sf.best.url,kind:sf.best.kind}); }
  return await shopResult(sf);
}
//@piece shopFinderStart


// Step 0. The search's state: what she turned down, the venue's entry, where its shop may be.
// A Shop button on the museum's own site (Berlin's smb.museum/webshop) vouches for that page, not
// the whole site: "Online Catalogues & Databases" there is no shop.
function shopFinderStart(pageShop,museumHost,venueName,turnedDown,venueId,trace){
  const sf={pageShop,museumHost,venueName,venueId,trace,no:new Set((turnedDown||[]).map(normalizeUrlKey)),own:linkEntry(venueId)||{},
    pageShopHost:baseDomain(hostOf(pageShop))===baseDomain(museumHost)?"":hostOf(pageShop),
    opens:0,seenText:"",died:null,opened:new Set(),mine:[],root:"",front:"",pick:null,best:null,
    texts:new Map(),failed:new Set(),walked:new Set(),walkOpens:0,translated:[],unread:[]};
  sf.place=u=>isShopPlace(u,museumHost,sf.pageShopHost);
  sf.named=r=>!sf.place(r.url)&&namesVenue(r.url,sf.own.shopNamed);
  // A shop page on the museum's own site is the shop's front, never the museum's home page
  // (Belvedere's /en/museum-shop).
  sf.ownPage=u=>!!u&&baseDomain(hostOf(u))===baseDomain(museumHost)&&!SHOP_HOST.test(hostOf(u));
  sf.rootFor=u=>sf.ownPage(u)?u:shopRootOf(u);
  sf.homeOf=u=>sf.ownPage(u)?u:originOf(u);
  sf.note=(step,what)=>{ if(trace)trace.push({step,...what}); };
  // The museum's own name as a section's label: its address's name ("kmska"), or the names it goes by.
  const plain=x=>foldText(x||"").replace(/[^a-z0-9]+/g," ").trim();
  const names=new Set([baseDomain(museumHost).split(".")[0],sf.own.short,sf.own.notCard,sf.own.name,venueName].map(plain).filter(x=>x.length>=3));
  sf.ownName=label=>names.has(plain(label));
  // A proven section kept: the exhibition-catalogues section ends the search; anything less is kept
  // as the best so far, in case the shop has none.
  sf.consider=r=>{ if(!r)return; if(r.target)sf.pick=r; if(!sf.best||r.score>sf.best.score)sf.best=r; };
  return sf;
}
//@piece booksUnder


// Candidates in rank order, each proved books-only: on its excerpt, else opened (its page, a Shopify
// section's products, its first product). Nothing books-only: the first mixed section is opened and
// the sections inside it tried. One level down, once.
// Books the shop shows elsewhere, priced, under a section's own address: proof of that section when its own page
// comes back without them (Berlin: Parallel gave "Ausstellungskataloge" as its footer alone, while the front page
// lists "Porträts!" at ".../ausstellungskataloge/6530/portraets", 39,00 €).
function booksUnder(sf,url){
  let p=""; try{ p=new URL(url).pathname.replace(/\/?$/,"/"); }catch{ return 0; }
  if(p==="/")return 0;
  return booksSeenOn(sf.seenText,hostOf(url),true).filter(b=>b.path.startsWith(p)&&b.path.length>p.length).length;
}
//@piece tryShelves

// Only a section ranked above the best already kept is checked: a lesser one cannot change the answer.
// A section that failed its check is not checked twice; a page already read is not fetched again.
async function tryShelves(sf,cands,how,inside){
  const above=sf.best?sf.best.score:-Infinity;
  const ranked=rankShelves(cands.map(c=>({...c,url:firstPageOf(c.url)})).filter((c,i,a)=>a.findIndex(x=>x.url===c.url)===i),sf.ownName);
  for(const c of ranked){
    const k=normalizeUrlKey(c.url);
    if(c.score<=above)break;
    if(sf.no.has(k))continue;
    if(c.proof&&looksLikeBookShelf(c.proof))return{...c,how};
    // Proved by books seen since, though its own page failed (Berlin's English section: its books on the front page).
    if(booksUnder(sf,c.url)>=2)return{...c,how};
    if(sf.failed.has(k))continue;
    let t=sf.texts.get(k);
    if(t==null){
      if(sf.opens>=SHELF_OPENS)return null;
      sf.opens++; sf.opened.add(c.url);
      const f=await openShopPage(fetchPage,c.url,"The books in this section of the shop, with their prices.",null,{full:true});
      if(!f.ok){ sf.died=f.detail; sf.failed.add(k); continue; }
      t=pageTextOf(f.results); sf.texts.set(k,t); sf.seenText+="\n"+t;
    }
    if(looksLikeBookShelf(t))return{...c,how};
    const pj=shopifyProductsUrl(c.url);
    if(pj){
      const j=await fetchPage(pj,"The products in this section: titles, types and prices.",null,{full:true});
      const jt=j.ok?pageTextOf(j.results):"";
      if(shopifyShelfIsBooks(jt,c.target))return{...c,how};
      // A section under a translated address ("/en/collections/exhibitions", Thyssen's "exposiciones") lists no
      // products there: kept for the shop's list of sections, which knows it under its own name.
      if(c.target&&/"products"\s*:\s*\[\s*\]/.test(jt))sf.translated.push({...c,how});
    }
    if(await firstProductIsBook(fetchPage,t,hostOf(c.url)))return{...c,how};
    sf.failed.add(k);
    // An exhibition-catalogues section whose page came back with no price at all: unread, not proved empty.
    if(c.target&&!String(t).split("\n").some(realPrice))sf.unread.push(c.url);
  }
  if(inside||!ranked.mixed.length)return null;
  const m=ranked.mixed[0];
  const f=await openShopPage(fetchPage,m.url,"The sections listed on this page: their names and links.",null,{full:true});
  if(!f.ok){ sf.died=f.detail; return null; }
  const t=pageTextOf(f.results); sf.seenText+="\n"+t;
  const subs=menuLinks(t,hostOf(m.url));
  const keep=sf.opens; sf.opens=0;
  const r=await tryShelves(sf,subs,how,true);
  sf.opens=keep;
  return r;
}
//@piece shopFromRule


// Step 1. A books section written into the venue's rule (the Städel) is offered as found; she confirms it.
function shopFromRule(sf){
  const{own,no}=sf;
  if(!(own.shopCatalogues&&!no.has(normalizeUrlKey(own.shopCatalogues))))return null;
  sf.note("rule",{found:own.shopCatalogues});
  return{shop:"found",shopHome:own.shopHome||originOf(own.shopCatalogues),shopCatalogues:own.shopCatalogues,shopSearch:null,foundBy:"the venue's rule",finder:3,searchRule:SEARCH_RULE};
}
//@piece searchForShop


// Step 2. The search: one call, two queries — hers and the books section's (Detroit's "DIA
// Publications" came back only with both); a venue's own (`shopQueries`) instead. A venue in a country
// that does not speak English asks for the shop's English version first (her design; Albertina's English
// shop came first) and, only when that finds no shop, the plain search (Berlin's shop has no English
// version, and asking for one pushed it out). Nothing shop-like and no Shop link on the show page: one
// more search, for the shop itself (Kunsthaus Zürich, Petit Palais: the first search returned only the
// museum's own pages).
async function searchForShop(sf){
  const{own,venueName,pageShop}=sf;
  const ask=async(objective,queries)=>{ const s=await searchWeb(objective,queries); if(!s.ok)sf.died=sf.died||s.detail; sf.mine=(s.results||[]).filter(r=>r&&(sf.place(r.url)||sf.named(r))); return s; };
  let english=false, again=false, s=null;
  if(sf.foreign&&!own.shopQueries){
    english=true;
    s=await ask("The English-language version of the online museum shop of "+venueName+": its exhibition catalogues or books section.",[venueName+" English language shop exhibition catalogues",venueName+" English language shop books publications"]);
  }
  if(!sf.mine.length)s=await ask("The museum shop's exhibition catalogues or books section of "+(own.shopQueries?own.name:venueName)+".",own.shopQueries||[venueName+" shop exhibition catalogues",venueName+" shop books publications"]);
  if(!sf.mine.length&&!pageShop&&!own.shopQueries){ again=true; s=await ask("The online shop of "+venueName+".",[venueName+" online shop",venueName+" museum shop books"]); }
  // Results in two languages: the English one is taken; a shop's pages in another language are dropped.
  const enHosts=new Set(sf.mine.filter(r=>isEnglishUrl(r.url)).map(r=>hostOf(r.url)));
  if(sf.foreign)sf.mine=sf.mine.filter(r=>!enHosts.has(hostOf(r.url))||!langOf(r.url)||isEnglishUrl(r.url));
  sf.seenText+="\n"+sf.mine.map(r=>r.url).join("\n");
  sf.root=pageShop?sf.rootFor(pageShop):sf.mine.length?sf.rootFor(sf.mine[0].url):"";
  sf.note("search",{results:(s.results||[]).length,shopLike:sf.mine.map(r=>r.url),english,again,root:sf.root,died:sf.died||null});
}
//@piece pickFromSearch


// Step 3. The search's shop-like results: the exhibition-catalogues section is taken; a lesser books
// section is kept as the best so far, and its shop is the one walked — in English when the search shows
// the shop's English pages (KMSKA: "/nl/boeken" came first, "/en" among the rest).
async function pickFromSearch(sf){
  sf.opens=0;
  const r=await tryShelves(sf,sf.mine.map(r=>({url:r.url,words:(r.title||"")+" "+pathWords(r.url),proof:(r.excerpts||[]).join("\n"),named:sf.named(r)})),"a search");
  sf.consider(r);
  // A named section is on the shop company's site: that site is its shop, whatever the page linked.
  if(r&&r.named)sf.root=shopRootOf(r.url);
  else if(r&&!sf.ownPage(r.url)){
    const h=hostOf(r.url), en=sf.mine.map(m=>m.url).find(u=>hostOf(u)===h&&isEnglishUrl(u));
    sf.root=shopRootOf(en||r.url);
  }
  sf.note("search-pick",{pick:sf.pick?sf.pick.url:null,best:sf.best?sf.best.url:null,root:sf.root||null});
}
//@piece followShopElsewhere


// Step 4. The museum's own Shop page sending visitors to a shop on another site ("Shop now" →
// the-museum-shop-at-wam.myshopify.com; Worcester): that shop is the one searched. Its menu is read on
// the exact page linked, never the site's root: Yale's shop is one of many on its payment site
// (secure.touchnet.net; AL-042).
async function followShopElsewhere(sf){
  if(sf.pick||sf.best)return;
  const away=await shopElsewhere([sf.pageShop,...sf.mine.map(r=>r.url)],sf.museumHost);
  if(away.died)sf.died=away.died;
  if(away.url){ sf.root=sf.rootFor(away.url); sf.front=away.url; if(!sf.ownPage(away.url))sf.pageShopHost=hostOf(away.url); sf.seenText+="\n"+away.text; }
  sf.note("shop-elsewhere",{front:sf.front||null,root:sf.root||null});
}
//@piece SHOPIFY_LIST_PAGES


// Step 5. A Shopify shop's list of its sections. A list of 250 is read on (Louisiana's design shop lists
// its "Udstillingskataloger" past the first 250), at most SHOPIFY_LIST_PAGES pages.
const SHOPIFY_LIST_PAGES=4;
//@piece shopifySectionList

async function shopifySectionList(sf){
  if(sf.pick||!sf.root||!/\/(?:collections|products)\/|\.myshopify\.com/i.test(sf.seenText+"\n"+sf.root+"\n"+sf.mine.map(r=>r.url).join("\n")))return;
  const listOf=async(base,first)=>{
    const all=[];
    for(let page=1;page<=SHOPIFY_LIST_PAGES;page++){
      const f=await fetchPage(base+"collections.json?limit=250"+(page>1?"&page="+page:""),"The shop's sections: titles and handles.",null,{full:true});
      if(!f.ok){ if(page===1&&first)sf.died=f.detail; break; }
      const t=pageTextOf(f.results);
      all.push(...shopifySections(t,sf.root));
      if((t.match(/"handle"\s*:/g)||[]).length<250)break;
    }
    return all;
  };
  // In the shop's own language part: the English shop's list names its sections in English (Thyssen's "/en/").
  const all=await listOf(shopRootOf(sf.root),true);
  if(all.length&&!sf.pick){ sf.opens=0; sf.consider(await tryShelves(sf,all,"the shop's list of sections")); }
  // An exhibition-catalogues section under a translated address lists no products there (Thyssen's
  // "/en/collections/exhibitions"): its number finds it in the shop's own-language list, and its products are
  // read under that list's name. The section found by the search is numbered by its own ".json". The address
  // kept is the translated one.
  if(!sf.pick&&sf.translated.length){
    const home=langOf(sf.root)?await listOf(originOf(sf.root),false):all;
    for(const c of sf.translated){
      if(sf.pick||!home.length)break;
      let id=c.id;
      if(!id){
        const cj=await fetchPage(c.url.replace(/\/$/,"")+".json","The section's id and handle.",null,{full:true});
        id=cj.ok?(pageTextOf(cj.results).match(/"collection"\s*:\s*\{\s*"id"\s*:\s*(\d+)/)||[])[1]:null;
      }
      const same=id&&home.find(x=>x.id===id);
      if(!same)continue;
      const j=await fetchPage(originOf(sf.root)+"collections/"+same.handle+"/products.json?limit=8","The products in this section: titles, types and prices.",null,{full:true});
      if(j.ok&&shopifyShelfIsBooks(pageTextOf(j.results),true))sf.consider(c);
    }
  }
  sf.note("shopify-sections",{pick:sf.pick?sf.pick.url:null,best:sf.best?sf.best.url:null});
}
//@piece openToWalk


// Step 6. The walk (her design): the shop's front page, then the section links on what was opened, best
// first — catalogues, the museum's publications, books, then a section mixing books with other goods —
// each opened page's links checked for the exhibition-catalogues section, until it is found or
// WALK_OPENS pages are spent. A page linked as the shop that comes back empty (Berlin's
// smb-webshop.de/museen-und-sammlungen/, "301 Moved Permanently") gives way to the shop's own front page.
async function openToWalk(sf,url){
  const k=normalizeUrlKey(url);
  sf.walked.add(k);
  if(sf.texts.has(k))return sf.texts.get(k);
  if(sf.walkOpens>=WALK_OPENS)return null;
  sf.walkOpens++;
  const f=await openShopPage(fetchPage,url,"The shop's menu: its exhibition catalogues and books sections.",null,{full:true});
  if(!f.ok){ sf.died=f.detail; return null; }
  const t=pageTextOf(f.results); sf.texts.set(k,t); sf.seenText+="\n"+t;
  return t;
}
//@piece walkShop

async function walkShop(sf){
  if(sf.pick||!sf.root)return;
  const host=hostOf(sf.root), links=[], pages=[];
  let page=sf.front||sf.root, t=await openToWalk(sf,page);
  if(t!=null&&sf.front&&t.trim().length<SHELL_CHARS&&shopRootOf(sf.root)!==sf.front){ page=shopRootOf(sf.root); t=await openToWalk(sf,page); }
  while(t!=null){
    pages.push(page);
    const here=menuLinks(t,host);
    links.push(...here);
    sf.opens=0; sf.consider(await tryShelves(sf,here,"the shop's menu",true));
    if(sf.pick||sf.walkOpens>=WALK_OPENS)break;
    // Next: the best section link seen and not yet walked into.
    const ranked=rankShelves(links.map(c=>({...c,url:firstPageOf(c.url)})),sf.ownName);
    const next=[...ranked,...ranked.mixed].find(c=>!sf.walked.has(normalizeUrlKey(c.url))&&!sf.no.has(normalizeUrlKey(c.url)));
    // No section link at all on the page linked as the shop (Berlin's "Museen & Sammlungen" page): the shop's own
    // front page, in the language it was found in. A page that has sections is never left for the site's root
    // (Yale's shop on Touchnet, AL-042a).
    // Its front page came back without its menu (Albertina's English one: shows and products, no sections): another of the shop's pages the
    // search found, which carries the same menu — never a section mixing books with other goods, which is
    // only a place to look for a books section (DIA's "Books & Stationery").
    const home=shopRootOf(sf.root);
    if(!next&&pages.length===1&&!ranked.length&&!ranked.mixed.length&&home&&!sf.walked.has(normalizeUrlKey(home))){ page=home; t=await openToWalk(sf,page); continue; }
    const mixed=new Set(rankShelves(sf.mine.map(r=>({url:r.url,words:(r.title||"")+" "+pathWords(r.url)}))).mixed.map(c=>c.url));
    const other=!next&&!ranked.length&&!ranked.mixed.length&&t.trim().length>=SHELL_CHARS&&sf.mine.map(r=>r.url).find(u=>hostOf(u)===host&&!isFrontPage(u)&&!mixed.has(u)&&!sf.walked.has(normalizeUrlKey(u)));
    if(other){ page=other; t=await openToWalk(sf,page); continue; }
    if(!next)break;
    page=next.url; t=await openToWalk(sf,page);
  }
  sf.note("walk",{pages,pick:sf.pick?sf.pick.url:null,best:sf.best?sf.best.url:null});
}
//@piece englishVersion


// Step 7. The shop's English version, for a venue in a country that does not speak English (her design), when
// the shop found reads in another language: a language link on its pages, else its English addresses
// (EN_PATHS, an "en." site), all in one call; the first that reads in English is walked as the shop was. The
// shop found stands when there is none, or when its English version shows a lesser section (four opens can
// miss what the other language found).
async function englishVersion(sf){
  const at=(sf.pick||sf.best||{}).url||sf.front||sf.root;
  if(!sf.foreign||!at)return;
  const host=hostOf(at), own=[...sf.texts].filter(([k])=>hostOf(k)===host).map(([,t])=>t).join("\n");
  const said=pageLanguage(at,(sf.pick||sf.best||{}).proof||own);
  if(said==="en"){ sf.note("english",{at,already:true}); return; }
  const o=originOf(at), bare=host.replace(/^www\./,""), b=baseDomain(host);
  const links=mdLinks(own).filter(l=>EN_LABEL.test(foldText(l.label).trim())&&baseDomain(hostOf(l.url))===b).map(l=>l.url);
  const tries=[...new Set([...links,...EN_PATHS.map(p=>o+p),"https://en."+bare+"/"])].filter(u=>normalizeUrlKey(u)!==normalizeUrlKey(at)).slice(0,8);
  const f=await fetchPage(tries,"The shop's front page and its menu, in English.",null,{full:true});
  const hit=f.ok?tries.map(u=>({u,r:f.results.find(x=>x&&normalizeUrlKey(x.url)===normalizeUrlKey(u))})).find(({u,r})=>{
    const t=r?pageTextOf([r]):"";
    return t.trim().length>=SHELL_CHARS&&!/\b(?:page not found|404|not found)\b/i.test(t.slice(0,400))&&pageLanguage(u,t)==="en";
  }):null;
  sf.note("english",{at,said,tried:tries,found:hit?hit.u:null});
  if(!hit)return;
  const kept={pick:sf.pick,best:sf.best,root:sf.root,front:sf.front,pageShopHost:sf.pageShopHost,died:sf.died,walked:sf.walked,walkOpens:sf.walkOpens,seenText:sf.seenText};
  const text=pageTextOf([hit.r]);
  Object.assign(sf,{pick:null,best:null,root:shopRootOf(hit.u),front:hit.u,walked:new Set(),walkOpens:0});
  if(!sf.ownPage(hit.u))sf.pageShopHost=hostOf(hit.u);
  sf.texts.set(normalizeUrlKey(hit.u),text); sf.seenText+="\n"+text;
  await shopifySectionList(sf);
  await walkShop(sf);
  // The same section in English (Louisiana's "/en-int/collections/udstillingskataloger"), whatever its English label.
  const was=kept.pick||kept.best, noLang=u=>{ try{ const x=new URL(u); return x.host+x.pathname.replace(new RegExp("^\\/"+LANG_PART+"(?=\\/)","i"),"").replace(/\/$/,""); }catch{ return ""; } };
  const same=was&&sf.best&&noLang(sf.best.url)===noLang(was.url);
  if(same){ sf.pick=sf.best=sf.pick&&sf.pick.score>=was.score?sf.pick:{...was,url:firstPageOf(sf.best.url)}; sf.note("english-same",{pick:sf.pick.url}); return; }
  if(!sf.best||(kept.best&&sf.best.score<kept.best.score)){ Object.assign(sf,kept); sf.note("english-kept-other",{pick:(kept.pick||kept.best||{}).url||null}); }
}
//@piece shopResult


// Step 8. The answer: a books section and the shop's search; a step that died (said as such, not as
// "nothing found"); its front page when that sells books; a shop with no books section, still searched as KHM's is; or no shop.
async function shopResult(sf){
  const{pick,root,front,seenText,died}=sf;
  if(pick){
    const home=root||pick.url;
    let seen=seenText+"\n"+(pick.proof||"");
    let search=searchFor(seen+"\n"+pick.url,home);
    // A pick taken on its search excerpt has no book links to prove a search with: its page
    // is opened once, unless already opened (CEDON; AL-044).
    if(!search&&!booksSeenOn(seen,hostOf(home)).length&&!sf.opened.has(pick.url)){
      const f=await openShopPage(fetchPage,pick.url,"The books in this section of the shop, with their prices.",null,{full:true});
      if(f.ok)seen+="\n"+pageTextOf(f.results);
    }
    // A section in another language taken, its English one found but unread (Berlin): both go to her shop screen.
    const pickText=sf.texts.get(normalizeUrlKey(pick.url))||pick.proof||"";
    const enUnread=sf.foreign&&pageLanguage(pick.url,pickText)!=="en"?sf.unread.find(isEnglishUrl)||null:null;
    const out={shop:"found",shopHome:front||originOf(home),shopCatalogues:pick.url,shelfKind:pick.kind,
      shopSearch:search||(await proveShopSearch(seen,home))||null,foundBy:pick.how,finder:3,searchRule:SEARCH_RULE,
      ...(enUnread?{shopEnglishUnread:firstPageOf(enUnread)}:{})};
    sf.note("result",{shop:out.shop,shopCatalogues:out.shopCatalogues,shopSearch:out.shopSearch,foundBy:out.foundBy});
    return out;
  }
  if(died){ sf.note("result",{shop:"failed",why:died}); return{shop:"failed",shopHome:front||(root?sf.homeOf(root):null),why:died,finder:3}; }
  // No books section: the shop's front page itself, when it sells books — the gallery path's rule (Mennour), for
  // museums too; one of its products opened only while the walk has an open left.
  const fp=root?front||sf.homeOf(root):"", ft=fp?sf.texts.get(normalizeUrlKey(fp))||"":"";
  if(ft&&(looksLikeBookShelf(ft)||(sf.walkOpens<WALK_OPENS&&(sf.walkOpens++,await firstProductIsBook(fetchPage,ft,hostOf(fp)))))){
    const out={shop:"found",shopHome:fp,shopCatalogues:fp,shelfKind:"front",
      shopSearch:searchFor(seenText,root)||(await proveShopSearch(seenText,root))||null,foundBy:"the shop's front page",finder:3,searchRule:SEARCH_RULE};
    sf.note("result",{shop:out.shop,shopCatalogues:out.shopCatalogues,shopSearch:out.shopSearch,foundBy:out.foundBy});
    return out;
  }
  const out=root?{shop:"noshelf",shopHome:front||sf.homeOf(root),shopSearch:searchFor(seenText,root)||(await proveShopSearch(seenText,root))||null,finder:3,searchRule:SEARCH_RULE}:{shop:"none",finder:3};
  sf.note("result",{shop:out.shop,shopHome:out.shopHome||null});
  return out;
}
