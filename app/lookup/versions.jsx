//@ Editions and versions of the book, their order and blocks.
//@piece VENUE_LANGUAGE


// ── WHERE AN ENGLISH EDITION IS RECORDED ─────────────────────────────────────
// The venue's language, for the library-record wording "originally published in
// French as …". Non-English venues only, beside CATALOGUE_WORDS.
const VENUE_LANGUAGE={louvre:"French",orsay:"French",mad:"French",jacquemart:"French",mam:"French",
  khm:"German",rijks:"Dutch",uffizi:"Italian",dellav:"Italian",borghese:"Italian",brera:"Italian",capo:"Italian"};
//@piece editionQueries

// Aimed at where an English edition is recorded, library catalogues included. The
// show's English title with the publisher stays when the publisher is already known.
function editionQueries(mu,row,book,isbn,pub){
  const lang=mu&&VENUE_LANGUAGE[mu.id];
  const head=String(row.title||"").split(/\s*:\s*/)[0].trim();
  return [book+" English edition"]
    .concat(lang?["originally published in "+lang+" as "+book]:[])
    .concat(isbn?[isbn+" English edition"]:[])
    .concat(head&&mu?[head+" "+(lookupName(mu)||mu.card||mu.name)+" catalogue English edition"]:[])
    .concat(pub?[String(row.title||"").trim()+" "+pub+" ISBN"]:[]);
}
//@piece EDITION_LINK


// A record tying a translation to its original: one of these phrases, folded.
const EDITION_LINK=/originally published|english edition|translated from|translation of|edition anglaise|traduction|edizione inglese|englische ausgabe|engelse editie/;
//@piece TITLE_STOP

const TITLE_STOP=new Set([...FOCUS_STOP,"dans","pour","avec","della","delle","dello","degli","eine","einer","sous","voor","over"]);
//@piece titleWords

function titleWords(t){
  return [...new Set(foldText(t).split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!TITLE_STOP.has(w)))];
}
//@piece notIn

// Results not already in a list, by address.
function notIn(list,already){
  const seen=new Set((already||[]).map(x=>normalizeUrlKey(x&&x.url)));
  return (list||[]).filter(x=>!seen.has(normalizeUrlKey(x&&x.url)));
}
//@piece pagesPrinted

// A page count Claude reports, kept only when the text prints it ("544 pages", "281 pp.").
function pagesPrinted(n,results){
  const v=parseInt(String(n||"").replace(/[^0-9]/g,""),10);
  if(!(v>=8&&v<=3000))return null;
  const re=new RegExp("(?<![0-9])"+v+"\\s*(?:pages|pp\\b|p\\.|pagine|seiten|s\\.|blz|bladzijden)","i");
  return (results||[]).some(x=>re.test(resultText(x)))?v:null;
}
//@piece differentBook

// Two page counts this far apart are two books, not one translated (her decision,
// Hubert Robert: Somogy's 544 pages against Lund Humphries' 288).
function differentBook(a,b){ return !!(a&&b&&Math.abs(a-b)/Math.max(a,b)>0.15); }
//@piece isbnsIn

// The page count the records of ONE ISBN print: results carrying that number and no other
// ISBN, their counts agreeing; else null. Every valid 978/979 number in a result counts.
function isbnsIn(x){
  const t=resultText(x).replace(/(\d)[\u2010-\u2015-](?=\d)/g,"$1");
  return new Set([...t.matchAll(/(?<![0-9])(97[89]\d{10})(?![0-9])/g)].map(m=>m[1]).filter(isbn13Checks));
}
//@piece pagesOfIsbn

function pagesOfIsbn(results,isbn){
  const counts=[];
  for(const x of (results||[])){
    const own=isbnsIn(x);
    if(!isbnInText(isbn,resultText(x))||[...own].some(d=>d!==isbn))continue;
    for(const m of resultText(x).matchAll(/(?<![0-9])(\d{2,4})\s*(?:pages|pp\b|p\.|pagine|seiten|blz)/gi))counts.push(+m[1]);
  }
  if(!counts.length||counts.some(c=>differentBook(c,counts[0])))return null;
  return counts[0];
}
//@piece notABooklet

// A BOOKLET IS NOT THE CATALOGUE (her decision, Hubert Robert: the 48-page album's ISBN
// filed for the 544-page catalogue). The ISBN's own records print far fewer pages than
// the catalogue has: another ISBN for the book whose records print the catalogue's count
// replaces it — exactly one — else no ISBN is filed. BK-001 to BK-004.
function notABooklet(F,results,bookPages,log){
  const own=F.isbn?pagesOfIsbn(results,F.isbn):null;
  if(!own||!bookPages||!(own<bookPages)||!differentBook(own,bookPages))return;
  const other=new Set();
  for(const x of resultsCarrying(results,F.title))for(const d of isbnsIn(x))
    if(d!==F.isbn){ const n=pagesOfIsbn(results,d); if(n&&!differentBook(n,bookPages))other.add(d); }
  const swap=other.size===1?[...other][0]:null;
  log.push("ISBN "+F.isbn+" is a "+own+"-page book; the catalogue has "+bookPages+" pages"
    +(swap?" — ISBN "+swap+", printed with "+bookPages+" pages, taken.":" — no ISBN for the catalogue itself found, so none is filed."));
  F.notIsbn=F.isbn;
  F.isbn=swap;
}
//@piece HARD_WORDS


// ── EVERY VERSION OF THE CATALOGUE (docs/catalogue_versions.md) ──────────────
// A version: {title, lang, binding, pages, publisher, isbn13, alsoIsbn13, showing,
// proofUrl, note}. showing "this": this showing's catalogue, any language or printing;
// "other": a different book from another showing, listed and never picked. Fields
// starting "_" are the lookup's own and never stored (storedVersion).
const HARD_WORDS=/(?<!\p{L})(?:hardcover|hardback|hard cover|reli[ée]|rilegato|gebunden|gebonden|cartonn[ée])(?!\p{L})/iu;
//@piece SOFT_WORDS

const SOFT_WORDS=/(?<!\p{L})(?:paperback|softcover|soft cover|softback|broch[ée]|brossura|kartoniert|ingenaaid)(?!\p{L})/iu;
//@piece bindingOfIsbn

function bindingOfIsbn(results,isbn){
  let hard=false, soft=false;
  for(const x of (results||[])){
    if(!isbnInText(isbn,resultText(x))||[...isbnsIn(x)].some(d=>d!==isbn))continue;
    const t=resultText(x);
    if(HARD_WORDS.test(t))hard=true;
    if(SOFT_WORDS.test(t))soft=true;
  }
  return hard===soft?null:hard?"hardcover":"paperback";
}
//@piece MUSEUM_WORDS

const MUSEUM_WORDS=/(?<!\p{L})(?:museum|nationalmuseum|mus[ée]e|museo|museu|gallery|galleria|galerie|gallerie|kunsthalle|pinacoteca|rijksmuseum|louvre)(?!\p{L})/iu;
//@piece museumImprintOnly

// A museum's own imprint: every house named is a museum (isVenueImprint, or a museum word).
function museumImprintOnly(name,museumId){
  const parts=String(name||"").split(/\s*(?:\/|;|&|\s+and\s+|\s+with\s+|,)\s*/i).map(x=>x.trim()).filter(Boolean);
  return parts.length>0&&parts.every(p=>isVenueImprint(p,museumId)||MUSEUM_WORDS.test(p));
}
//@piece sameBookTitle

function sameBookTitle(a,b){
  const x=titleWords(a), y=titleWords(b);
  const [small,big]=x.length<=y.length?[x,y]:[y,x];
  return small.length>=2&&small.filter(w=>big.includes(w)).length>=Math.ceil(small.length*0.75);
}
//@piece sameWords

function sameWords(a,b){
  const x=titleWords(a), y=titleWords(b);
  return x.length>=2&&x.length===y.length&&x.every(w=>y.includes(w));
}
//@piece langName

// A language as the read named it, first letter capitalised.
function langName(l){
  const s=String(l||"").trim();
  return s?s.charAt(0).toUpperCase()+s.slice(1):null;
}
//@piece sameLang

function sameLang(a,b){
  if(!a||!b)return !a&&!b;
  return isEnglishLang(a)===isEnglishLang(b)&&(isEnglishLang(a)||foldText(a)===foldText(b));
}
//@piece onIsbn

function onIsbn(results,isbn){ return isbn?(results||[]).filter(x=>isbnInText(isbn,resultText(x))):[]; }
//@piece proofOf

// The page proving a version: the read's own page when it carries the ISBN, else the first that does.
function proofOf(onV,given){
  const g=given&&onV.find(x=>normalizeUrlKey(x&&x.url)===normalizeUrlKey(given));
  return String((g||onV[0]||{}).url||"")||null;
}
//@piece VENUE_GENERIC

// The venue's own house: its imprint (isVenueImprint), or a name carrying every
// distinctive word of the venue's short name ("Louvre éditions").
const VENUE_GENERIC=new Set(["national","art","arts","fine","modern","royal","musee","museum","museo","museu",
  "gallery","galleria","galerie","collection","the"]);
//@piece venueHouse

function venueHouse(name,museumId){
  if(isVenueImprint(name,museumId))return true;
  const mu=MU[museumId];
  const v=mu?normPublisher(lookupName(mu)).split(" ").filter(t=>t.length>2&&!VENUE_GENERIC.has(t)):[];
  const n=" "+normPublisher(name)+" ";
  return v.length>0&&v.every(t=>n.includes(" "+t+" "));
}
//@piece HOUSE_SPLIT

const HOUSE_SPLIT=/\s*(?:\/|;|&|\s+and\s+|\s+with\s+)\s*/i;
//@piece venuePrinting

function venuePrinting(name,museumId){
  const s=String(name||"").trim();
  return !!s&&[s,...s.split(HOUSE_SPLIT)].some(p=>p.trim()&&venueHouse(p.trim(),museumId));
}
//@piece venueFirst

// Publisher names lead with the venue's own house (her rule, display only: the publisher
// step still looks for the outside house, publisherToFind).
function venueFirst(name,museumId){
  const s=String(name||"").trim();
  if(!s)return null;
  for(const mark of CO_EDITION_MARKS){
    const parts=s.split(mark).map(x=>x.trim()).filter(Boolean);
    if(parts.length<2)continue;
    const own=parts.filter(p=>venueHouse(p,museumId));
    if(!own.length||own.length===parts.length)return s;
    return [...own,...parts.filter(p=>!venueHouse(p,museumId))].join(" / ");
  }
  return s;
}
//@piece MAGAZINE_WORDS

// Never a version: a magazine's special issue (Canaletto – Guardi, Connaissance des Arts).
const MAGAZINE_WORDS=/hors[- ]s[ée]rie|special issue|num[ée]ro sp[ée]cial|sonderheft|numero speciale|(?<!\p{L})magazine(?!\p{L})|connaissance des arts/iu;
//@piece aMagazine

function aMagazine(title,publisher,onV){
  return MAGAZINE_WORDS.test(String(title||"")+" "+String(publisher||""))
    ||onV.some(x=>isbnsIn(x).size===1&&MAGAZINE_WORDS.test(String((x&&x.title)||"")));
}
//@piece SHOW_WORDS

// A different book counts as another showing's catalogue only where a result carrying
// its ISBN speaks of an exhibition or a catalogue (Reaktion's Botticelli does not).
const SHOW_WORDS=/catalog|exhibition|exposition|mostra|esposizione|ausstellung|tentoonstelling/i;
//@piece cityOf

// The other showing's city, kept only where the text prints it; else, when its publisher
// is one of the app's venues, that venue's city.
function cityOf(said,pub,results,museumId){
  const c=String(said||"").trim();
  if(c&&(results||[]).some(x=>foldText(resultText(x)).includes(foldText(c))))return c;
  const m=venueNamedIn(pub,museumId);
  return m&&m.city||null;
}
//@piece venueNamedIn

// One of her venues named as a publisher: its whole name, or every distinctive word of
// its short name ("Musée du Louvre"); never a name merely containing another's
// ("National Gallery of Art" is not the National Gallery).
function venueNamedIn(pub,except){
  const parts=String(pub||"").split(HOUSE_SPLIT).map(normPublisher).filter(Boolean);
  for(const m of Object.values(MU)){
    if(!m||m.id===except)continue;
    const w=normPublisher(lookupName(m)).split(" ").filter(t=>t.length>2&&!VENUE_GENERIC.has(t));
    if(parts.some(p=>p===normPublisher(m.name)||(w.length&&w.every(t=>(" "+p+" ").includes(" "+t+" ")))))return m;
  }
  return null;
}
//@piece yearOf

// A version's year, kept only where a result carrying its ISBN prints it.
function yearOf(said,onV){
  const y=String(said||"").match(/(?<![0-9])(?:19|20)\d\d(?![0-9])/);
  return y&&onV.some(x=>new RegExp("(?<![0-9])"+y[0]+"(?![0-9])").test(resultText(x)))?+y[0]:null;
}
//@piece foundVersion


// The book found so far: this showing's catalogue.
function foundVersion(F,lang,pages,results,museumId,pageUrl){
  const onV=onIsbn(results,F.isbn);
  return{title:F.title||null,lang:lang||null,binding:F.isbn?bindingOfIsbn(results,F.isbn):null,
    pages:(F.isbn&&pagesOfIsbn(results,F.isbn))||pages||null,publisher:venueFirst(F.publisher,museumId),
    isbn13:F.isbn||null,alsoIsbn13:null,showing:"this",proofUrl:proofOf(onV,null)||pageUrl||null,note:null,
    city:null,year:null,_found:true};
}
//@piece printingsOf

// Other printings in the found book's language (her decision, Vasari): its own ISBN
// printed, the title's key words shared, page counts agreeing where printed — else the
// very same title words. A far shorter or longer one is not kept. VS-001 to VS-008.
function printingsOf(cands,card,results,museumId){
  const cardPages=pagesOfIsbn(results,card.isbn)||card.pages||null;
  const out=[];
  for(const c of (Array.isArray(cands)?cands:[])){
    if(!c||!c.title)continue;
    const isbn=toIsbn13(c.isbn13,resultsText(results));
    if(!isbn||isbn===card.isbn||out.some(v=>v.isbn13===isbn))continue;
    if(c.language&&card.lang&&!sameLang(c.language,card.lang))continue;
    const titles=[card.title,...(card.titles||[])].filter(Boolean);
    if(!titles.some(t=>sameBookTitle(c.title,t)))continue;
    const pages=pagesOfIsbn(results,isbn)||pagesPrinted(c.pages,results);
    if(pages&&cardPages?differentBook(pages,cardPages):!titles.some(t=>sameWords(c.title,t)))continue;
    const onV=onIsbn(results,isbn);
    const said=c.publisher&&onV.some(x=>foldText(resultText(x)).includes(foldText(c.publisher)))?String(c.publisher).trim():null;
    const coded=publisherOnIsbnResults(onV,isbn);
    const pub=coded||said;
    if(aMagazine(c.title,pub,onV))continue;
    out.push({title:titleAsPrinted(c.title,onV).title,lang:card.lang||null,binding:bindingOfIsbn(results,isbn),pages:pages||null,
      publisher:venueFirst(pub,museumId),isbn13:isbn,alsoIsbn13:null,showing:"this",proofUrl:proofOf(onV,c.evidenceUrl),
      note:"another printing",city:cityOf(c.venueCity,pub,results,museumId),year:yearOf(c.year,onV),
      _pub:pub,_pubFrom:coded?"the ISBN’s results":"general results"});
  }
  return out;
}
//@piece editionsOf

// Editions in another language, decided in code (her Botticelli and Hubert Robert;
// docs/app.md §1). A fetched result must carry its ISBN and show the link: the original's
// house (any outside house of a co-edition), the venue named (sameCatalogue), the original's ISBN, or a linking phrase with
// every key word of the original's title (Hammershøi's library record). Page counts far
// apart: a different book, kept as "other". `orig`: the found version, pages printed.
function editionsOf(editions,orig,results,museumId,log){
  const origPub=orig.publisher?publisherToFind(orig.publisher,museumId):null;
  // A co-edition's outside houses, each one the original's publisher ("… / Lienart").
  const houses=String(orig.publisher||"").split(HOUSE_SPLIT).map(x=>x.trim()).filter(p=>p&&!venueHouse(p,museumId));
  const keys=titleWords(orig.title);
  const out=[];
  for(const ed of (Array.isArray(editions)?editions:[])){
    if(!ed||!ed.title||!ed.language||(orig.lang&&sameLang(ed.language,orig.lang)))continue;
    const isbn=toIsbn13(ed.isbn13,resultsText(results||[]));
    if(!isbn||isbn===orig.isbn13||out.some(v=>v.isbn13===isbn))continue;
    const onV=onIsbn(results,isbn);
    const coded=publisherOnIsbnResults(onV,isbn);
    let pub=coded||(ed.publisher?String(ed.publisher).trim():null), from=coded?"the ISBN’s results":"general results", pubUrl=null;
    const pages=pagesPrinted(ed.pages,results);
    const title=titleAsPrinted(ed.title,onV).title;
    if(aMagazine(ed.title,pub,onV))continue;
    const v={title,lang:langName(ed.language),binding:bindingOfIsbn(results,isbn),pages,publisher:null,isbn13:isbn,
      alsoIsbn13:null,showing:"this",proofUrl:proofOf(onV,ed.evidenceUrl),note:null,
      city:cityOf(ed.venueCity,pub,results,museumId),year:yearOf(ed.year,onV)};
    if(differentBook(pages,orig.pages)){
      const said=onV.some(x=>SHOW_WORDS.test(resultText(x)));
      if(log)log.push("“"+ed.title+"” (ISBN "+isbn+", "+pages+" pages) is a different book from this one ("+orig.pages+" pages)"
        +(said?" — listed as another showing’s.":" — and nothing calls it a catalogue, so it is left off."));
      if(said)out.push({...v,publisher:venueFirst(pub,museumId),showing:"other",note:"a different book: "+pages+" pages against "+orig.pages,_pub:pub,_pubFrom:from});
      continue;
    }
    let why=null;
    if(sameCatalogue(pub,origPub,[],museumId)||houses.some(h=>sameCatalogue(pub,h,[],museumId)))why="the same publisher as the original";
    else if(sameCatalogue(pub,origPub,onV,museumId))why="the venue named";
    else if(orig.isbn13&&onV.some(x=>isbnInText(orig.isbn13,resultText(x))))why="a record carrying both ISBNs";
    else if(keys.length&&onV.some(x=>{ const t=foldText(resultText(x)); return EDITION_LINK.test(t)&&keys.every(w=>t.includes(w)); }))
      why="a record naming it a translation of the original";
    if(!why)continue;
    // Named by no house: the original's, when a page on that house's own site carries
    // this ISBN (Lienart's page for Vasari).
    let inherit=why==="the same publisher as the original";
    if(!pub&&orig.publisher){
      for(const part of String(orig.publisher).split(HOUSE_SPLIT).filter(Boolean)){
        const page=onV.find(x=>publisherDomainFrom([x],part));
        if(page){ pub=part.trim(); from="the book’s page"; pubUrl=page.url; inherit=true;
          if(log)log.push("Publisher of “"+title+"”: "+pub+" — its own page carries this ISBN ("+page.url+")."); break; }
      }
    }
    if(log)log.push("Edition: “"+title+"”, "+v.lang+", ISBN "+isbn+" — "+why+" ("+v.proofUrl+").");
    // Printed by the original's house: shown with the original's publishers.
    out.push({...v,publisher:venueFirst(inherit?orig.publisher:pub,museumId),note:why,_pub:pub,_pubFrom:pub?from:null,_pubUrl:pubUrl});
  }
  return out;
}
//@piece ISBN_PAIR


// ONE BOOK, TWO NUMBERS (her decision, Vasari and Hubert Robert): a co-edition given an
// ISBN by each publisher folds into one version — only where a record lists both under
// one ISBN label ("ISBN : 978-2-7572-1064-2. - 978-2-35031-535-5"). The outside house's
// number leads; the museum's own goes in alsoIsbn13. Bindings or page counts that
// differ are two books, never folded. FO-001 to FO-006.
const ISBN_PAIR=/ISBN[\s:*_.]{0,12}(97[89]\d{10})(?:\s*[.;,]?\s*[-\u2013\u2014;,\/]\s*|\s*[.;,]\s+)(97[89]\d{10})(?![0-9])/gi;
//@piece isbnPairs

function isbnPairs(results){
  const pairs=[];
  for(const x of (results||[])){
    const t=resultText(x).replace(/(\d)[\u2010-\u2015-](?=\d)/g,"$1");
    for(const m of t.matchAll(ISBN_PAIR))if(m[1]!==m[2]&&isbn13Checks(m[1])&&isbn13Checks(m[2]))pairs.push([m[1],m[2]]);
  }
  return pairs;
}
//@piece foldCoEditions

function foldCoEditions(versions,results,museumId,log){
  const own=n=>{ const p=publisherOnIsbnResults(onIsbn(results,n),n); return !!p&&museumImprintOnly(p,museumId); };
  const apart=(a,b)=>{
    const ba=bindingOfIsbn(results,a), bb=bindingOfIsbn(results,b);
    return !!(ba&&bb&&ba!==bb)||differentBook(pagesOfIsbn(results,a),pagesOfIsbn(results,b));
  };
  for(const [a,b] of isbnPairs(results)){
    const v=versions.find(x=>x.isbn13===a||x.isbn13===b);
    if(!v||v.alsoIsbn13||apart(a,b))continue;
    const n=v.isbn13===a?b:a;
    const w=versions.find(x=>x!==v&&(x.isbn13===n||x.alsoIsbn13===n));
    if(w&&(w.alsoIsbn13||w.showing!==v.showing||!sameLang(w.lang,v.lang)))continue;
    // One number must be the same house's or this venue's own: another house's printing
    // is a version of its own (Vasari: the Nationalmuseum's English book, listed with
    // Lienart's in one library record).
    const house=w?w.publisher:publisherOnIsbnResults(onIsbn(results,n),n);
    const venueOnly=p=>String(p).split(HOUSE_SPLIT).every(x=>!x.trim()||venueHouse(x.trim(),museumId));
    if(house&&v.publisher&&!sameHouse(house,v.publisher)&&!venueOnly(house)&&!venueOnly(v.publisher))continue;
    if(w)versions.splice(versions.indexOf(w),1);
    const swap=own(v.isbn13)&&!own(n);
    v.alsoIsbn13=swap?v.isbn13:n;
    v.isbn13=swap?n:v.isbn13;
    if(log)log.push("One book, two numbers: ISBN "+v.isbn13+", also "+v.alsoIsbn13+" — a record lists both.");
  }
}
//@piece rankedOwn


// HER ORDER (docs/catalogue_versions.md): at an English-language venue, a book found in its
// museum shop first of all (`shopFirst`, set once by the lookup, so a Re-check never moves a
// block); then English in the venue's own imprint (or a house ranked as its own, `rankAsOwn`);
// then English from anyone else; then other languages. Within each, hardcover, then paperback,
// then a binding not known; otherwise as found. The first is the starting pick. VO-001 to VO-009.
function rankedOwn(name,museumId){
  const extra=(linkEntry(museumId)||{}).rankAsOwn||[];
  return venuePrinting(name,museumId)||extra.some(h=>String(name||"").split(HOUSE_SPLIT).some(p=>sameHouse(p.trim(),h)));
}
//@piece versionRank

function versionRank(v,museumId){
  const en=isEnglishLang(v&&v.lang), mu=MU[museumId];
  const shop=!!(v&&v.shopFirst)&&!(mu&&mu.english===false);
  const group=en&&rankedOwn(v.publisher,museumId)?0:en?1:2;
  return (shop?0:9)+group*3+(v.binding==="hardcover"?0:v.binding==="paperback"?1:2);
}
//@piece versionOrder

// The versions' indexes in her order.
function versionOrder(versions,museumId){
  const vs=Array.isArray(versions)?versions:[];
  return vs.map((v,i)=>i).sort((a,b)=>versionRank(vs[a]||{},museumId)-versionRank(vs[b]||{},museumId)||a-b);
}
//@piece putInOrder

// The lookup keeps its versions in her order, so the starting pick is always 0.
function putInOrder(versions,museumId){
  const sorted=versionOrder(versions,museumId).map(i=>versions[i]);
  versions.splice(0,versions.length,...sorted);
}
//@piece storedVersion

// A version as the ledger keeps it: the lookup's own fields dropped. `card` holds the
// card's book fields for that version, so a change of pick refills the card (pickRow).
function storedVersion(v){
  const o={};
  for(const k of ["title","lang","binding","pages","publisher","isbn13","alsoIsbn13","showing","proofUrl","note","city","year","card","shopFirst"])o[k]=v[k]===undefined?null:v[k];
  return o;
}
//@piece takeVersion

// The picked version becomes the card's book, as a found book does.
function takeVersion(F,v,log){
  if(v._found){ F.isbn=v.isbn13; return; }
  log.push("The card’s book: “"+v.title+"”"+(v.isbn13?", ISBN "+v.isbn13:"")+".");
  F.title=v.title; F.isbn=v.isbn13; F.publisher=v._pub||null; F.pubFrom=v._pub?v._pubFrom:null;
  F.publisherUrl=v._pubUrl||null; F.publisherResult=v._pubUrl?"product":null;
  // A shop that could not be read stays unread for every book.
  F.shopState=F.blocked||"web"; F.shopUrl=null;
}
//@piece bookFieldsOf

function bookFieldsOf(F){
  return{catalogueTitle:F.title||null,isbn13:F.isbn||null,publisher:F.publisher||null,publisherUrl:F.publisherUrl||null,
    publisherResult:F.publisherResult||null,shopState:F.shopState||null,shopUrl:F.shopUrl||null};
}
//@piece pickRow

// Her pick changed on the card: that version's book fields fill the card, as at the
// lookup (takeVersion). Pure — no lookup, no network. PK-001 to PK-003.
function pickRow(row,i,now){
  const v=Array.isArray(row&&row.editions)?row.editions[i]:null;
  if(!v||!v.card||row.editionPick===i)return row;
  return{...row,...v.card,editionPick:i,editedAt:now};
}
//@piece sourceOf


// ── HER VERSION BLOCKS (docs/catalogue_versions.md, "Her layout") ──────────────
// One block per version, in her order, on a card with two or more; a card with one looks
// as it always has. Notes are decided here, first rule that fits. VB-001 to VB-010.
function sourceOf(u){
  try{ const h=new URL(String(u||"")).hostname.replace(/^www\./,""); return h?{url:String(u),host:h}:null; }catch{ return null; }
}
//@piece versionNote

function versionNote(vs,i,row){
  const v=vs[i], mu=MU[row.museumId], id=row.museumId;
  const vc=v.city||(venueNamedIn(v.publisher,id)||{}).city||null;
  const where=vc?"from the show's "+vc+" exhibition":"from the show's other exhibition";
  if(v.showing==="other")return "a different book, "+where;
  const mine=vs.filter(x=>x.showing==="this");
  // One house, the versions differing only in language (Metamorphoses): no notes.
  const langs=new Set(mine.map(x=>foldText(x.lang||"")));
  if(mine.length===vs.length&&langs.size===mine.length&&mine.every(x=>x.publisher&&sameHouse(x.publisher,mine[0].publisher)))return null;
  // Printed for another showing: another museum's own, or a city not this venue's.
  const city=mu&&mu.city?foldText(mu.city):"";
  if(!venuePrinting(v.publisher,id)&&((vc&&foldText(vc)!==city)||(v.publisher&&museumImprintOnly(v.publisher,id))))return where;
  if(vs.some(x=>x.showing==="other"))return "this showing's catalogue";
  const english=isEnglishLang(v.lang), hasEnglish=mine.some(x=>isEnglishLang(x.lang)), hasOriginal=mine.some(x=>x.lang&&!isEnglishLang(x.lang));
  if(!english&&v.lang&&hasEnglish)return "the original edition";
  if(english&&hasOriginal){
    if(venuePrinting(v.publisher,id))return "this venue's English edition";
    const start=parseInt(String(row.startDate||"").slice(0,4),10);
    return v.year&&start&&v.year>start?"the English edition, published later":"the English edition";
  }
  return null;
}
//@piece versionBlock

// A block's facts, each its own item: the title, publisher (a later English edition's year
// after a dot), language · binding · pages, the ISBN and any second number, why it is
// listed, and the page that proved it.
function versionBlock(vs,i,row){
  const v=vs[i], mu=venueNamedIn(v.publisher)||MU[row.museumId];
  const note=versionNote(vs,i,row);
  const later=note==="the English edition, published later"&&v.year;
  const bind=v.binding==="hardcover"?"Hardcover":v.binding==="paperback"?"Paperback":null;
  const facts=[v.lang,bind,v.pages?v.pages+" pp":null].filter(Boolean).join(" \u00b7 ");
  return{i,picked:row.editionPick===i,title:v.title||null,
    publisher:v.publisher?v.publisher+(later?" \u00b7 "+v.year:""):null,facts:facts||null,
    isbn:v.isbn13?fmtIsbn(v.isbn13):null,
    also:v.isbn13&&v.alsoIsbn13?{isbn:fmtIsbn(v.alsoIsbn13),whose:(mu?mu.short:"venue")+"\u2019s own number for the same book"}:null,
    why:note?note.charAt(0).toUpperCase()+note.slice(1)+".":null,source:sourceOf(v.proofUrl)};
}
//@piece versionBlocks

// Null for a card with fewer than two versions.
function versionBlocks(row){
  const all=Array.isArray(row&&row.editions)?row.editions:[];
  if(all.filter(Boolean).length<2)return null;
  const vs=all.map(v=>v||{});
  return versionOrder(vs,row.museumId).filter(i=>all[i]).map(i=>versionBlock(vs,i,row));
}
//@piece alsoLine

// The note after an old row's ISBN: "also 978-… (hardcover, Nationalmuseum)".
function alsoLine(v){
  if(!v||!v.isbn13)return "";
  const bits=[v.binding,v.publisher].filter(Boolean);
  return "also "+fmtIsbn(v.isbn13)+(bits.length?" ("+bits.join(", ")+")":"");
}
