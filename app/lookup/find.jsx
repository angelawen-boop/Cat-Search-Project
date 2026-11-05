//@ Searching for the catalogue and reading what comes back: ISBNs, titles, the prompts.
//@piece needsPageRead

// ── THE ISBN FILL — its two decisions live outside the component so fixtures reach them.

// Open the book's own page when a catalogue was found and the ISBN OR the publisher is
// still blank (her decision; docs/app.md §1 "The ISBN"). C-009 to C-013a.
function needsPageRead(hit){
  return !!(hit&&hit.ok&&hit.pageUrl&&hit.row&&hit.row.hasCatalogue==="yes"
            &&(!hit.row.isbn13||!hit.row.publisher));
}
//@piece resultsText

// The plain text of a list of search results (a text or nothing passes through): what toIsbn13 checks an ISBN against.
function resultsText(rs){ return Array.isArray(rs)?rs.map(resultText).join("\n"):rs; }
//@piece applyIsbnFill


// Fills blanks only (docs/app.md §1 "The ISBN"): a value already on the row stands;
// anything not a real ISBN, or not printed in `seen` (plain text), is refused; a page yielding
// nothing leaves the row as it was.
function applyIsbnFill(row,o,dom,seen){
  const isbn=toIsbn13(o&&o.isbn13,seen);
  const pub=(o&&o.publisher)?String(o.publisher).trim():"";
  const purl=publisherLinkOf(o&&o.publisherUrl,row.publisher||pub,dom,row.museumId);
  if(!isbn&&!pub&&!purl)return row;
  return{...row,
    isbn13:row.isbn13||isbn||null,
    publisher:row.publisher||pub||null,
    publisherUrl:row.publisherUrl||purl||null};
}
//@piece titleKey


// The title as printed (her decision, Louvre Experience of Nature): kept only as far
// as the pages print it — whole, else its longest leading part (split at . : and
// dashes). Accents, capitals and punctuation do not count.
function titleKey(t){
  return " "+foldText(t).replace(/[^a-z0-9]+/g," ").trim()+" ";
}
//@piece titleAsPrinted

function titleAsPrinted(title,results){
  const t=String(title||"").trim();
  if(!t)return{title:t,cut:false,onPage:false};
  const text=titleKey(pageTextOf(results));
  if(text.includes(titleKey(t)))return{title:t,cut:false,onPage:true};
  const parts=t.split(/\s*(?:[.:]|\s[\u2013\u2014-])\s+/).filter(Boolean);
  for(let n=parts.length-1;n>=1;n--){
    const lead=parts.slice(0,n);
    if(text.includes(titleKey(lead.join(" ")))){
      // The leading words, cut out of the title exactly as written.
      const last=lead[lead.length-1],at=t.indexOf(last);
      return{title:t.slice(0,at+last.length).trim(),cut:true,onPage:true};
    }
  }
  return{title:t,cut:false,onPage:false};
}
//@piece isEnglishLang


// A LANGUAGE NAMED BY A READ, in any of the venues' languages.
function isEnglishLang(l){
  return /\b(english|anglais|inglese|englisch|engels|ingl[e\u00e9]s)\b/i.test(String(l||""));
}
//@piece PAGE_CHARS


// How much of one page Claude is handed. The ISBN is read in code from the uncut text
// (isbnOnPage), so this cap can only cost the publisher line.
const PAGE_CHARS=20000;
//@piece isbnsLabelled

function isbnsLabelled(text){
  const found=new Set();
  const re=/\b(?:ISBN|EAN)(?:[\s-]?13)?\b[^0-9]{0,15}(97[89](?:[\s\u2010-\u2013-]?\d){10})(?!\d)/gi;
  let m;
  while((m=re.exec(String(text||"")))){
    const d=m[1].replace(/\D/g,"");
    if(isbn13Checks(d))found.add(d);
  }
  return found;
}
//@piece isbnOnPage

function isbnOnPage(text){
  const found=isbnsLabelled(text);
  return found.size===1?[...found][0]:null;
}
//@piece resultsCarrying


// The ISBN in web search results, read in code (her Ashmolean In Bloom): only results
// carrying the whole book title count; their labelled numbers plus any valid 978/979
// number in their addresses. Exactly one distinct number, or nothing.
function resultsCarrying(results,bookTitle){
  const norm=v=>foldText(v).replace(/[^a-z0-9]+/g," ").trim();
  const want=norm(bookTitle);
  if(want.length<6)return[];
  return (results||[]).filter(r=>(" "+norm(String((r&&r.title)||"")+" "+oneText(r))+" ").includes(" "+want+" "));
}
//@piece isbnInResults

function isbnInResults(results,bookTitle){
  const found=new Set();
  for(const r of resultsCarrying(results,bookTitle)){
    for(const d of isbnsLabelled(oneText(r)))found.add(d);
    for(const m of String((r&&r.url)||"").matchAll(/(?:^|[^0-9])(97[89]\d{10})(?![0-9])/g))
      if(isbn13Checks(m[1]))found.add(m[1]);
  }
  return found.size===1?[...found][0]:null;
}
//@piece PASSAGE_CUES


// What Claude is given to read (her decision, Botticelli): a result that fits is given
// whole; a longer one gets its RELEVANT lines first — naming the show or book, a
// catalogue/ISBN/price word, or a link onto the venue's shop, each with its neighbours —
// then the rest in page order up to the cap. At most eight results, under the 64 KiB
// ceiling.
const PASSAGE_CUES=/catal[o\u00f3]g|katalog|isbn|\bean\b|edition|\u00e9dition|edizione|ausgabe|publisher|\u00e9diteur|editore|verlag|uitgeverij|hardcover|hardback|paperback|softcover|\bpages\b|[$\u20ac\u00a3]\s?\d|\d\s?(?:\u20ac|eur\b)|sold out|out of stock|\u00e9puis\u00e9|esaurito|ausverkauft|uitverkocht|add to (?:cart|bag|basket)|pre-?order|english|anglais|inglese|englisch|engels/i;
//@piece FOCUS_STOP

const FOCUS_STOP=new Set(["the","and","from","with","exhibition","catalogue","catalog","museum","musee","mus\u00e9e","paris","london","edition"]);
//@piece focusWords

function focusWords(words){
  const out=new Set();
  for(const w of (words||[]).join(" ").split(/[^\p{L}\p{N}]+/u)){
    const f=foldText(w);
    if(f.length>=4&&!FOCUS_STOP.has(f))out.add(f);
  }
  return [...out];
}
//@piece pickPassages

function pickPassages(text,focus,cap){
  const t=String(text||"");
  if(t.replace(/\s+/g," ").length<=cap)return t.replace(/\s+/g," ").trim();
  const lines=t.split(/\n+/).map(l=>l.replace(/\s+/g," ").trim()).filter(Boolean);
  const words=focusWords((focus&&focus.words)||[]), dom=focus&&focus.dom;
  const hit=l=>{ const f=foldText(l); return PASSAGE_CUES.test(l)||words.some(w=>f.includes(w))||(dom&&l.toLowerCase().includes(String(dom).toLowerCase())); };
  const keep=new Set();
  lines.forEach((l,i)=>{ if(hit(l))for(const j of [i-1,i,i+1])if(j>=0&&j<lines.length)keep.add(j); });
  let out="", used=new Set();
  const add=i=>{ if(used.has(i))return; const piece=(out?" ":"")+lines[i]; if(out.length+piece.length>cap)return; out+=piece; used.add(i); };
  [...keep].sort((a,b)=>a-b).forEach(add);
  lines.forEach((l,i)=>add(i));
  // Kept in page order, so a passage still reads where it stood.
  return [...used].sort((a,b)=>a-b).map(i=>lines[i]).join(" ").slice(0,cap);
}
//@piece resultsForPrompt

// Outside the component so a fixture can reach it (AL-022, AL-023). Eight results
// unless a caller asks for more (the edition search, WL-060).
const resultsForPrompt=(list,cap,focus,most)=>list.slice(0,most||8).map((r,i)=>
  (i+1)+". "+String(r.title||"(untitled)")+"\n   "+String(r.url||"")+"\n   "
  +(Array.isArray(r.excerpts)?pickPassages(r.excerpts.join("\n"),focus,cap||700):"")
).join("\n\n");
//@piece catalogueLinkOn


// A link labelled "catalog" onto the venue's own shop, in the web results (her
// decision, Botticelli): exactly one such address, or none; never a ticket.
function catalogueLinkOn(results,dom){
  if(!dom)return null;
  const found=new Map();
  for(const r of (results||[])){
    const text=Array.isArray(r&&r.excerpts)?r.excerpts.join("\n"):String((r&&r.full_content)||"");
    for(const m of text.matchAll(/\[([^\]]*)\]\((https?:\/\/[^\s)]+)/g)){
      if(!/catal[o\u00f3]g|katalog/i.test(m[1])||!shopLinkOf({shopUrl:m[2]},dom))continue;
      const key=normalizeUrlKey(m[2]);
      if(key)found.set(key,m[2]);
    }
  }
  return found.size===1?[...found.values()][0]:null;
}
//@piece sameCatalogue


// Is this English book an edition of the same catalogue? (her decision, Botticelli;
// docs/app.md §1) Its publisher shares the original's distinctive words (Fonds Mercator ~
// Mercatorfonds), or a result carrying its ISBN names the venue by its full, chip or
// card name.
function sameCatalogue(edPublisher,origPublisher,isbnResults,museumId){
  const words=n=>normPublisher(n).split(" ").filter(w=>w.length>2&&!PUBLISHER_WORDS.has(w)&&!["fonds","musee","museum","museo","galleria","gallery"].includes(w));
  const a=words(edPublisher), b=words(origPublisher);
  if(a.length&&b.length&&b.every(w=>a.some(x=>x.includes(w)||w.includes(x))))return true;
  const mu=MU[museumId];
  const names=(mu?[mu.name,lookupName(mu),mu.card]:[]).map(words).filter(v=>v.length);
  if(!names.length)return false;
  return (isbnResults||[]).some(x=>{ const t=" "+normPublisher((x&&x.title||"")+" "+oneText(x))+" "; return names.some(v=>v.every(w=>t.includes(" "+w+" "))); });
}
//@piece oneBook


// ONE BOOK ON A CARD (Hubert Robert: an English publisher beside a French ISBN). A
// publisher guessed from general results must be one the ISBN's own records name,
// when they name any; else the one they name replaces it, or none if they disagree.
function oneBook(F,results,log,dom,museumId){
  if(!F.isbn||!F.publisher||F.pubFrom!=="general results")return;
  const groups=publisherGroups(results,F.isbn);
  if(!groups.length||groups.some(g=>g.names.some(n=>sameHouse(n,F.publisher))))return;
  const top=groups[0], tied=groups[1]&&groups[1].votes===top.votes;
  const name=tied?null:groupName(top);
  log.push("Publisher “"+F.publisher+"” is not the one the ISBN’s records name ("+groups.map(groupName).join(", ")+")"
    +(name?" — "+name+" taken.":" — no publisher filed."));
  F.publisher=name;
  F.publisherUrl=name?publisherLinkOf(F.publisherUrl,name,dom,museumId):null;
  if(!name)F.pubFrom=null;
}
//@piece CATALOGUE_WORDS


// The show's catalogue in the venue's own language (her decision, Hammershøi, listed
// only in French): the show's name before any colon, the venue's name, "exhibition
// catalogue" in its language and the opening year. Non-English venues only.
const CATALOGUE_WORDS={louvre:"catalogue exposition",orsay:"catalogue exposition",mad:"catalogue exposition",
  jacquemart:"catalogue exposition",mam:"catalogue exposition",khm:"Ausstellungskatalog",rijks:"tentoonstellingscatalogus",
  uffizi:"catalogo mostra",dellav:"catalogo mostra",borghese:"catalogo mostra",brera:"catalogo mostra",capo:"catalogo mostra"};
//@piece localCatalogueQuery

function localCatalogueQuery(mu,row){
  const word=mu&&mu.english===false&&CATALOGUE_WORDS[mu.id];
  if(!word)return[];
  const head=String(row.title||"").split(/\s*:\s*/)[0].trim();
  const year=/^\d{4}/.test(String(row.startDate||""))?" "+String(row.startDate).slice(0,4):"";
  return head?[head+" "+lookupName(mu)+" "+word+year]:[];
}
//@piece READ_RULES


// ── THE CATALOGUE LOOKUP (docs/app.md §1; CLAUDE.md §5.1 "Catalogue lookup") ─────
// At top level so a fixture can run it whole with the connector and Claude faked.
// Steps gather facts; code decides each fact in a set order of trust; composeRow
// writes the row once. No step writes card text; the card reads the row.
const READ_RULES=
  "You are reading real web search results to find the PRINTED EXHIBITION CATALOGUE for one exhibition.\n"
 +"Use ONLY what the results below actually say. Never use outside knowledge, never guess an ISBN, "
 +"never invent a shop page.\n"
 +"Give the ISBN EXACTLY as printed — a 10-digit one is wanted as it stands, never converted.\n"
 +"A catalogue is a BOOK about the exhibition. Tote bags, prints, postcards, mugs, notebooks and "
 +"generic gift items are NOT catalogues, even on the exhibition's own shop page. Neither is a "
 +"TICKET, an admission or a ticket bundle.\n"
 +"THE ISBN IS OFTEN NOT IN THE SHOP. Museums routinely print the catalogue's title, publisher and "
 +"ISBN in a PRESS RELEASE or on the exhibition's own page, while the shop lists only souvenirs. "
 +"A press release stating the book counts as finding it.\n"
 +"Beware of unrelated books that merely share the exhibition's title — a classical text, a novel, "
 +"a textbook. The catalogue is the one tied to THIS exhibition at THIS venue.\n"
 +"publisherUrl is the PUBLISHER'S OWN page for this book — the art-book house that printed it, "
 +"not the museum shop, not a bookseller. Give it only if a result actually shows it; null otherwise.\n"
 +"\"Sold by …\" (“vendu par”, “venduto da”) names the SHOP, never the publisher — "
 +"the Orsay’s shop says “Sold by GrandPalaisRmn” for books Hazan printed. Never report it as publisher.\n"
 +"thisVenue is true ONLY when a result says this book is the catalogue of the show AT THIS VENUE: "
 +"the venue's own page, shop or press release names it, or a publisher or bookseller says it "
 +"accompanies the exhibition at this venue. A catalogue of a show at ANOTHER venue is false — "
 +"even when that show travels here, “in modified form” or as a “second venue”, and "
 +"even when the artist is the same. A different title from the exhibition's needs this venue's own word.\n"
 +"catalogueTitle is the book's title EXACTLY as the results print it — never translated, and never "
 +"completed with words from the exhibition's title.\n"
 +"If the same catalogue is sold in more than one language, take the ENGLISH edition.\n";
//@piece READ_RULES_FOREIGN

// At a non-English venue the web read takes the venue's own book; whether an English
// edition is the same catalogue is decided once, in code (editionsOf; Hubert Robert).
const READ_RULES_FOREIGN=READ_RULES.replace(/If the same catalogue is sold in more than one language, take the ENGLISH edition\.\n$/,
  "If the catalogue is sold in more than one language, take the edition in the venue's own language — "
 +"an English edition is checked separately.\n");
//@piece READ_SHAPE


const READ_SHAPE=
  "\nReply with ONLY this JSON object and nothing else:\n"
 +'{"found": true|false, "catalogueTitle": string|null, "isbn13": string|null, '
 +'"publisher": string|null, "publisherUrl": string|null, "shopUrl": string|null, "thisVenue": true|false}\n'
 +'Example: {"found":true,"catalogueTitle":"Metamorphoses: Ovid and the Arts","isbn13":"9789493416543",'
 +'"publisher":"Hannibal Books","publisherUrl":"https://hannibalbooks.be/en/metamorphoses",'
 +'"shopUrl":null,"thisVenue":true}\n'
 +'Set "found" false and every other field null when these results show no catalogue.';
//@piece PAGE_RULES


// The book's own page, read once: the ISBN, the publisher and any publisher link.
const PAGE_RULES=
  "You are reading ONE web page in full: the page selling or describing a printed exhibition "
 +"catalogue. Read the ISBN, publisher and author off THIS PAGE only.\n"
 +"Use ONLY what the page says. Never use outside knowledge and never guess an ISBN.\n"
 +"The number is usually in a details or specification list near the bottom, which on many shops "
 +"sits inside a collapsed panel — read it wherever it appears.\n"
 +"REPORT THE ISBN EXACTLY AS THE PAGE PRINTS IT. A 13-digit one starts 978 or 979; an older "
 +"book may show a 10-digit one instead, and that is wanted too — give it as it stands and "
 +"never convert it yourself.\n"
 +"publisherUrl is a link to the PUBLISHER'S OWN page for this book, if this page shows one. "
 +"A link to this shop, to Amazon or to another bookseller is NOT it — answer null.\n"
 +"If this page is not about the book named below, set every field null.\n"
 +"\"Sold by …\" (“vendu par”, “venduto da”) names the SHOP, never the publisher — "
 +"the Orsay’s shop says “Sold by GrandPalaisRmn” for books Hazan printed. Never report it as publisher.\n";
//@piece PAGE_SHAPE

const PAGE_SHAPE=
  "\nReply with ONLY this JSON object and nothing else:\n"
 +'{"isbn13": string|null, "publisher": string|null, "publisherUrl": string|null}\n'
 +'Example: {"isbn13":"9781588398130","publisher":"The Metropolitan Museum of Art",'
 +'"publisherUrl":null}';
//@piece pageForPrompt


// The page arrives whole (fetchPage {full}). Capped, because the prompt has a ceiling
// and a page carries its menus too — PAGE_CHARS.
const pageForPrompt=(list,cap)=>list.slice(0,2).map(r=>
  String(r.title||"")+"\n"+String(r.url||"")+"\n"+oneText(r).replace(/[ \t]+/g," ")
).join("\n\n").slice(0,cap||PAGE_CHARS);
//@piece factsPrompt


// The facts round's one read: the book's own page (at a non-English venue, read here
// rather than on its own), the facts search and the edition search.
function factsPrompt(q){
  const item='{"title": string, "isbn13": string, "language": string, "publisher": string|null, "pages": string|null, "year": string|null, "venueCity": string|null, "evidenceUrl": string}';
  const shape='{"isbn13": string|null, "publisher": string|null, "pages": string|null, "versions": ['+item+']'
    +(q.bookPage?', "pagePublisher": string|null, "pagePublisherUrl": string|null':'')
    +(q.foreign?', "language": string|null, "title": string|null':q.needTitle?', "title": string|null':'')
    +', "editions": ['+item+']}';
  // needTitle: the book is known so far only as "the catalogue" (unnamed in lookupCatalogue).
  return "You are reading real web text about ONE printed exhibition catalogue: "
    +(q.needTitle?"the catalogue of the exhibition “"+q.show+"” at "+q.venue+". Its own title is not known yet and may differ from the exhibition's"
      :"“"+q.book+"”"+(q.isbn?", ISBN "+q.isbn:"")+", the catalogue of the exhibition “"+q.show+"” at "+q.venue)+".\n"
    +"Use ONLY what the text below says. Never use outside knowledge, never guess an ISBN and never invent a link.\n"
    +"Give every ISBN EXACTLY as printed — a 10-digit one as it stands, never converted.\n"
    +"\"Sold by …\" (“vendu par”, “venduto da”) names the SHOP, never the publisher — "
    +"the Orsay’s shop says “Sold by GrandPalaisRmn” for books Hazan printed. Never report it as publisher.\n"
    +"isbn13: this book's own ISBN, or null.\n"
    +"pages: the number of pages the text prints for THIS book (\"544 pages\", \"281 pp.\"), digits only, or null.\n"
    +"versions: other printings of THIS SAME book in the SAME language that the text shows with their own ISBN — "
    +"a hardcover beside a paperback, or the same book under another publisher's imprint (a museum's own edition "
    +"beside a co-publisher's). Its title, ISBN, language, publisher and pages as printed, and the address of the "
    +"result that shows it. Never a translation, never a different book. An empty list if none.\n"
    +"publisher: the house that printed THIS book, as the search results name it — never a shop or a seller. Null if none says.\n"
    +(q.bookPage?"pagePublisher, pagePublisherUrl: the publisher SECTION A prints for this book, and any link there to the "
      +"PUBLISHER'S OWN page for it (not this shop, not a bookseller). Null if it shows none.\n":"")
    +(q.foreign?"language: the language this book's text is printed in, named in English (French, Italian…), or null if "
      +"nothing says. A bilingual book: name both.\n"
      +"title: this book's title EXACTLY as printed, in its own language — never translated. Null if not shown.\n"
      :q.needTitle?"title: this book's title EXACTLY as the text prints it, only where the text ties it to this exhibition at this venue. Null if not shown.\n":"")
    // Every venue: an English venue's book may have a translation too (Hubert Robert, NGA).
    +("editions: every OTHER edition of this same book the text shows with its own ISBN — a translation, "
      +"such as an English edition, often recorded as “originally published in … as …”. Its title as "
      +"printed, its ISBN, its language, its publisher and the address of the result that shows it. Its publisher "
      +"only where the text names the house that printed THAT edition, else null — “originally published … "
      +"Fonds Mercator” names the original's house, not the translation's. Its pages as for this book. An empty list "
      +"if none. Never invent one.\n")
    // Her version lines name the other showing's city and an English edition's year.
    +"For each version and edition: year — the year THAT one was published, as printed, else null; venueCity — "
    +"when the text says it was printed for a showing of the exhibition at ANOTHER venue, that venue's city in "
    +"English (Stockholm, Washington), else null.\n"
    +"If the text is about a different book, answer null.\n"
    +(q.bookPage?"\nSECTION A — ONE web page in full: the book's own page.\n"+pageForPrompt(q.bookPage.results,12000)+"\n":"")
    +(q.facts.length?"\nSECTION B — web search results about this book.\n"+resultsForPrompt(q.facts,2500,{words:[q.book,q.isbn||""]},q.facts.length)+"\n":"")
    +(q.editions.length?"\nSECTION C — web search results about editions of this book in other languages.\n"
      // Every result: Hammershøi's library record came tenth (WL-060).
      +resultsForPrompt(q.editions,2000,{words:[q.book,q.show,"originally published","English edition"]},q.editions.length)+"\n":"")
    // The first web search's results, read again (Hubert Robert: its English book was there).
    +(q.earlier&&q.earlier.length?"\nSECTION D — earlier web search results about this exhibition's catalogue.\n"
      +resultsForPrompt(q.earlier,2000,{words:[q.book,q.show,"edition","catalogue"]},q.earlier.length)+"\n":"")
    +"\nReply with ONLY this JSON object and nothing else:\n"+shape;
}
//@piece composeRow


// ── PHASE 5: THE ROW, WRITTEN ONCE ───────────────────────────────────────────
// Each fact has one owner on the card: shopState the shop line, publisherResult the
// publisher sentence (publisherNote), englishCheck the English line. The versions found
// (editions) and the picked one's index (editionPick) sit beside the card's book; originalEdition,
// otherVenueBook and alsoVersion stay on old rows only and are never written again.
function composeRow(row,F){
  if(!F||!F.found)return{...row,looked:true,hasCatalogue:"no",shopState:(F&&F.blocked)||"none",
    catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,publisherResult:null,
    shopUrl:null,shopChange:null,englishCheck:null,originalEdition:null,otherVenueBook:null,alsoVersion:null,
    editions:[],editionPick:null};
  return{...row,looked:true,hasCatalogue:"yes",
    catalogueTitle:F.title||null,isbn13:F.isbn||null,publisher:F.publisher||null,
    publisherUrl:F.publisherUrl||null,publisherResult:F.publisherResult||null,
    shopState:F.shopState,shopUrl:F.shopUrl||null,shopChange:null,
    englishCheck:F.englishCheck||null,originalEdition:null,otherVenueBook:null,alsoVersion:null,
    editions:F.editions||[],editionPick:Number.isInteger(F.editionPick)?F.editionPick:null};
}
