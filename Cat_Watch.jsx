import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

// The footer prints APP_VERSION and its date, so she can tell one build from the next.
// Numbering, her decision: a whole number for a substantial change, a decimal for a
// small one, one number per publish. Bump it with the change it describes.
const APP_VERSION = "56.7";
const APP_VERSION_DATE = "31 Oct 2026";

// The venue order is VENUE_ORDER, below the list, which sorts MUSEUMS; drawer, chips,
// Sort by Venue and refresh headings all follow it.
//
// shopCatalogues: the shop's catalogue shelf, opened first. shopSearch: its search box
// plus the exhibition title, opened with it. Addresses: docs/app.md §1 "Shop addresses".
// card: the name on exhibition cards where it differs from the chip's `short`.
// chip: the Venue chip's label alone, where shorter than `short` (her decision: "Rijks").
// underOcc: no chip of its own; its cards file under "Occasional" (her decision; Ashmolean).
// lookupName: the name the catalogue lookup searches with, where `short` is only a label.
// english:false: only these venues get the language check and English-edition search
// (lookupCatalogue, phases 2b and 3).
const MUSEUMS = [
  // The Met prints a show's dates on its "on view" line: below a podcast transcript (Manet/Degas), or above the only line naming the show (Impossible Conversations).
  { id:"met", linkRead:{ dateLine:/\bon view\b/i }, short:"The Met", name:"The Metropolitan Museum of Art", city:"New York",
    exBase:"https://www.metmuseum.org/exhibitions/", shopSearch:"https://store.metmuseum.org/search?q=", shopCatalogues:"https://store.metmuseum.org/books-toys-games/exhibition-catalogues", shopHome:"https://store.metmuseum.org/", listUrl:"https://www.metmuseum.org/exhibitions" },
  { id:"rijks", english:false, short:"Rijksmuseum", chip:"Rijks", name:"Rijksmuseum", city:"Amsterdam",
    exBase:"https://www.rijksmuseum.nl/en/whats-on/exhibitions/", shopSearch:"https://www.rijksmuseumshop.nl/en/search?q=", shopCatalogues:"https://www.rijksmuseumshop.nl/en/books/exhibition-books", shopHome:"https://www.rijksmuseumshop.nl/en/", listUrl:"https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view" },
  { id:"ng", short:"NG UK", lookupName:"National Gallery", name:"The National Gallery", city:"London",
    exBase:"https://www.nationalgallery.org.uk/exhibitions/", shopSearch:"https://shop.nationalgallery.org.uk/catalogsearch/result/?q=", shopCatalogues:"https://shop.nationalgallery.org.uk/books/exhibition-catalogues.html", shopHome:"https://shop.nationalgallery.org.uk/", listUrl:"https://www.nationalgallery.org.uk/exhibitions" },
  // linkRead: Add by link options for met, acq, frick, menil, louvre, artic, brit, cincinnati, moma (docs/add_by_link.md, "Venue link rules").
  // No apostrophe or double quote inside a linkRead pattern (write \x27): compress.js seedMemory scans this list as text.
  { id:"acq", linkRead:{ title:"subtitle", places:["New York","Palm Beach"], credit:/^In collaboration with\b/i, dashAfterColon:true, from:/^Press Release$/, minLine:60, skip:/^Gallery Hours:|\bImage Courtesy\b/, skipEntities:true, cleanLink:true }, short:"Acquavella", name:"Acquavella Galleries", city:"New York",
    exBase:"https://www.acquavellagalleries.com/exhibitions/", shopSearch:"https://acquavellagalleries.myshopify.com/search?q=", shopCatalogues:"https://acquavellagalleries.myshopify.com/collections/all", shopHome:"https://acquavellagalleries.myshopify.com/", listUrl:"https://www.acquavellagalleries.com/exhibitions" },
  // Shopify, like Acquavella's. Chip "Levy", cards "Lévy Gorvy Dayan" (her decision).
  { id:"lgd", short:"Levy", name:"Lévy Gorvy Dayan", city:"New York / London",
    exBase:"https://www.levygorvydayan.com/exhibitions/", shopSearch:"https://shop.levygorvydayan.com/search?q=", shopCatalogues:"https://shop.levygorvydayan.com/collections/all", shopHome:"https://shop.levygorvydayan.com/", listUrl:"https://www.levygorvydayan.com/exhibitions" },
  // The whole Publications shelf: the Frick files some show books outside "Exhibition catalogues" (her finding).
  { id:"frick", linkRead:{ titleDrop:/^Special Loan:\s*/i }, short:"Frick", name:"The Frick Collection", city:"New York", exBase:null, shopSearch:"https://shop.frick.org/search.php?search_query=", shopCatalogues:"https://shop.frick.org/publications/", shopHome:"https://shop.frick.org/", listUrl:null },
  { id:"menil", linkRead:{ titleDrop:/^Collection Close-Up:\s*/i }, short:"Menil", name:"The Menil Collection", city:"Houston", exBase:null, shopSearch:"https://bookstore.menil.org/search?q=", shopCatalogues:"https://bookstore.menil.org/collections/menil-publications", shopHome:"https://bookstore.menil.org/", listUrl:null },
  { id:"artic", linkRead:{ from:/^Share$/, until:/^(?:Share|Related(?: Exhibitions| Products)?|Sign up for our enewsletter\b.*)$/, minLine:60, skip:/\u00a9|Press 300ppi|Image CC|Photo courtesy|^(?:an?|the)\s+(?:[\w,\x27-]+\s+){0,5}?(?:painting|poster|drawing|photograph|photomontage|statuette|cover|print)\b,?\s+(?:of|with|reads|that|in|featuring|showing)\b/i }, short:"Artic", name:"Art Institute of Chicago", city:"Chicago", exBase:null, shopSearch:"https://shop.artic.edu/search?q=", shopCatalogues:"https://shop.artic.edu/collections/exhibition-catalogues", shopHome:"https://shop.artic.edu/", listUrl:null },
  // Her addition, after Artic. Shopify: search box and her Books shelf.
  { id:"cincinnati", linkRead:{ crumb:true }, short:"Cincinnati", name:"Cincinnati Art Museum", city:"Cincinnati", exBase:null, shopSearch:"https://shop.cincinnatiartmuseum.org/search?q=", shopCatalogues:"https://shop.cincinnatiartmuseum.org/collections/books", shopHome:"https://shop.cincinnatiartmuseum.org/", listUrl:null },
  { id:"wallace", short:"Wallace", name:"The Wallace Collection", city:"London", exBase:null, shopSearch:"https://wallacecollectionshop.org/search?q=", shopCatalogues:"https://wallacecollectionshop.org/collections/wallace-collection-publications", shopHome:"https://wallacecollectionshop.org/", listUrl:null },
  { id:"tate-britain", short:"Tate Britain", name:"Tate Britain", city:"London", exBase:null, shopSearch:"https://shop.tate.org.uk/search?q=", shopCatalogues:"https://shop.tate.org.uk/books/exhibition-books?sz=96", shopHome:"https://shop.tate.org.uk/", listUrl:null },
  // Her addition, after Tate Britain. Shopify: search box and her exhibition-catalogues shelf.
  { id:"ashmolean", underOcc:true, short:"Ashmolean", name:"Ashmolean Museum", city:"Oxford", exBase:null, shopSearch:"https://shop.ashmolean.org/search?q=", shopCatalogues:"https://shop.ashmolean.org/collections/exhibition-catalogues", shopHome:"https://shop.ashmolean.org/", listUrl:null },
  { id:"va", short:"V&A", name:"Victoria and Albert Museum", city:"London", exBase:null, shopSearch:"https://www.vam.ac.uk/shop/search?q=", shopCatalogues:"https://www.vam.ac.uk/shop/books/exhibition-books.html", shopHome:"https://www.vam.ac.uk/shop", listUrl:null },
  { id:"louvre", linkRead:{ title:"pieces", minLine:60, skip:/\bclosed\b|remain open|apologis|pleasant visit/i }, english:false, short:"Louvre", name:"Louvre Museum", city:"Paris", exBase:null, shopSearch:"https://boutique.louvre.fr/en/search/products/?q=", shopCatalogues:"https://boutique.louvre.fr/en/products/400001-exhibition-catalogues/", shopHome:"https://boutique.louvre.fr/en/", listUrl:null },
  // The French venues below share the Louvre's shop system: search box and "Exhibition catalogs" shelf.
  // Orsay: the national museums' shared shop; shelf and search are hers (the search covers every museum there).
  { id:"orsay", english:false, short:"Orsay", name:"Mus\u00e9e d'Orsay", city:"Paris", exBase:null, shopSearch:"https://www.boutiquesdemusees.fr/en/search/products/?q=", shopCatalogues:"https://www.boutiquesdemusees.fr/en/ext/products/musee-orsay/5452-exhibition-catalogues/", shopHome:"https://www.boutiquesdemusees.fr/en/ext/products/musee-orsay/5452-exhibition-catalogues/", listUrl:null },
  // No search box, so the publications shelf is the only route in. Pages are numbered in the
  // path (/c462/2/; shelfPages). shopHome is the shelf, so her shop link lands on the books.
  { id:"mad", english:false, short:"MAD Paris", name:"Mus\u00e9e des Arts D\u00e9coratifs", city:"Paris", exBase:null, shopSearch:null, shopCatalogues:"https://boutique.madparis.fr/en/mads-publications/c462/1/", shopHome:"https://boutique.madparis.fr/en/mads-publications/c462/1/", listUrl:null },
  // subtitleUnderHeading: the line under a show page's heading is its subtitle, read by code
  // for Add by link (docs/link_pages/).
  { id:"jacquemart", chip:"Jacquemart", subtitleUnderHeading:true, english:false, short:"Jacquemart-Andr\u00e9", name:"Mus\u00e9e Jacquemart-Andr\u00e9", city:"Paris", exBase:null, shopSearch:"https://boutique.musee-jacquemart-andre.com/en/search/products/?q=", shopCatalogues:"https://boutique.musee-jacquemart-andre.com/en/products/116-exhibition-catalogs/", shopHome:"https://boutique.musee-jacquemart-andre.com/en/", listUrl:null },
  // Search address is hers. The shop answers with a waiting room, so the lookup reports it
  // blocked; the address stays for her shop link.
  { id:"khm", english:false, short:"KHM", name:"Kunsthistorisches Museum", city:"Vienna", exBase:null, shopSearch:"https://shop.khm.at/en/products?shop%5Bq%5D=", shopHome:"https://shop.khm.at/en/", listUrl:null },
  { id:"uffizi", english:false, short:"Uffizi", name:"Uffizi Galleries", city:"Florence", exBase:null, shopSearch:"https://shop.uffizi.it/en/?s=", shopHome:"https://shop.uffizi.it/en/", listUrl:null },
  { id:"dellav", english:false, short:"Accademia", name:"Gallerie dell'Accademia", city:"Venice", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"borghese", english:false, short:"Borghese", name:"Galleria Borghese", city:"Rome", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"brera", english:false, short:"Brera", name:"Pinacoteca di Brera", city:"Milan", exBase:null, shopSearch:"https://bottegabrera.org/en/search?q=", shopCatalogues:"https://bottegabrera.org/en/collections/guide-e-cataloghi", shopHome:"https://bottegabrera.org/en/", listUrl:null },
  { id:"capo", english:false, short:"Capo", card:"Capodimonte", lookupName:"Capodimonte", name:"Museo e Real Bosco di Capodimonte aka Museo Nazionale di Capodimonte", city:"Naples", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"morgan", short:"Morgan", name:"Morgan Library & Museum", city:"New York", exBase:null, shopSearch:"https://shop.themorgan.org/search?q=", shopCatalogues:"https://shop.themorgan.org/collections/exhibition-catalogs", shopHome:"https://shop.themorgan.org/", listUrl:null },
  { id:"brit", linkRead:{ from:/^(?:For the catalogue, homewares and gifts from the exhibition|Book tickets$)/ }, short:"British Museum", name:"The British Museum", city:"London", exBase:null, shopSearch:"https://www.britishmuseumshoponline.org/catalogsearch/result/?q=", shopCatalogues:"https://www.britishmuseumshoponline.org/books/exhibition-books.html", shopHome:"https://britishmuseumshoponline.org/", listUrl:null },
  // inStock: a book page there whose own status line says "In Stock" is for sale; its Add to Cart is drawn by script, so the
  // page as read lacks it (Labrouste; her decision, a MoMA rule; docs/catalogue_versions.md, "MoMA *Brancusi*").
  { id:"moma", linkRead:{ spaceBeforeComma:true }, inStock:{ path:/^\/products\//, line:/\bItem#\s*\S+\s+In Stock\b/ }, short:"MoMA", name:"Museum of Modern Art", city:"New York", exBase:null, shopSearch:"https://store.moma.org/collections/shop?q=" /* her own search */, shopCatalogues:"https://store.moma.org/collections/exhibition-catalogues", shopHome:"https://store.moma.org/", listUrl:null },
  { id:"tate-modern", short:"Tate Modern", name:"Tate Modern", city:"London", exBase:null, shopSearch:"https://shop.tate.org.uk/search?q=", shopCatalogues:"https://shop.tate.org.uk/books/exhibition-books?sz=96", shopHome:"https://shop.tate.org.uk/", listUrl:null },
  // The search is hers, query moved last so the title can follow. A Cloudflare check refuses
  // us, so the lookup reports it blocked; the address stays for her shop link.
  { id:"mam", english:false, short:"MAM Paris", name:"Mus\u00e9e d'Art Moderne de Paris", city:"Paris", exBase:null, shopSearch:"https://www.mamlibrairieboutique.fr/listeliv.php?flou&base=paper&mots_recherche=", shopHome:"https://www.mamlibrairieboutique.fr/", listUrl:null },
];
// Her order for every venue list: chips, Sort by Venue, the freshness drawer and the
// refresh screen. A venue not named here goes last, by name.
const VENUE_ORDER=["met","ng","occ-nga-gov","frick","morgan","artic","menil",
  "acq","lgd","occ-new-artsmia-org","cincinnati","occ-britishart-yale-edu","brit","tate-britain","wallace","va","occ-nationalgalleries-org",
  "louvre","orsay","jacquemart","occ-chateaudechantilly-fr","mad","rijks","khm","occ-museodelprado-es","occ-alte-pinakothek","occ-pinakothek-der-moderne","occ-sammlung-schack","occ-smb-museum","occ-alte-nationalgalerie","occ-neue-nationalgalerie","occ-gemaeldegalerie-skd-museum","occ-staedelmuseum-de","uffizi","dellav","borghese","brera","capo","occ-cini-it","occ-lestanzedelvetro-org","occ-lestanzedellafotografia-it","moma",
  "tate-modern","mam",
  ];
// The Occasional venues (no chip of their own) follow, by country: the United States, the rest of that group
// (Australia), then Europe in her country order (her decision). Hard-coded, her decision: the countries of the venues that
// store no country (below); a venue the store holds a country for takes that one.
const OCC_COUNTRY_ORDER=["United States","United Kingdom","Germany","Belgium","France","Switzerland","Italy","Spain","Netherlands"];
const OCC_EUROPE_ELSE=["Austria","Denmark","Sweden","Norway","Finland","Portugal","Ireland","Poland","Czechia","Hungary","Greece","Luxembourg"];
const OCC_COUNTRY_NAMES={"usa":"United States","us":"United States","united states of america":"United States","uk":"United Kingdom","great britain":"United Kingdom","england":"United Kingdom","scotland":"United Kingdom","wales":"United Kingdom","northern ireland":"United Kingdom","the netherlands":"Netherlands","holland":"Netherlands","czech republic":"Czechia","deutschland":"Germany"};
const OCC_COUNTRY={"occ-mfa-org":"United States","occ-clevelandart-org":"United States","occ-dia-org":"United States","occ-archive-worcesterart-org":"United States","occ-philamuseum-org":"United States","occ-adelsongalleries-com":"United States",
  "occ-courtauld-ac-uk":"United Kingdom","occ-royalacademy-org-uk":"United Kingdom","ashmolean":"United Kingdom","occ-rct-uk":"United Kingdom",
  "occ-staatsgalerie-de":"Germany","occ-hlmd-de":"Germany","occ-kmska-be":"Belgium","occ-mskgent-be":"Belgium","occ-galerie-karsten-greve-com":"France","occ-kunstmuseumbasel-ch":"Switzerland",
  "occ-museitoscana-cultura-gov-it":"Italy","occ-palazzoducale-genova-it":"Italy","occ-palazzorealemilano-it":"Italy","occ-museothyssen-org":"Spain","occ-museoreinasofia-es":"Spain","occ-mauritshuis-nl":"Netherlands",
  "occ-ngv-vic-gov-au":"Australia"};
const occCountry=id=>{ const c=OCC_COUNTRY[id]||(MU[id]||{}).country||""; const k=String(c).trim().toLowerCase(); return OCC_COUNTRY_NAMES[k]||String(c).trim(); };
// "us", "eu" or "other": the three chips that hold the venues with no chip of their own.
// Two groups only (her decision): Europe, UK included, and everything else under Occ - US (Australia last).
// No country stored: the address's country ending (".uk", ".de"…) says.
const OCC_EUROPE_TLD=["uk","de","be","fr","ch","it","es","nl","at","dk","se","no","fi","pt","ie","pl","cz","hu","gr","lu"];
const occRegion=id=>{ const c=occCountry(id); if(c)return(OCC_COUNTRY_ORDER.includes(c)&&c!=="United States")||OCC_EUROPE_ELSE.includes(c)?"eu":"us";
  const m=/-([a-z]{2})$/.exec(String(id)); return m&&OCC_EUROPE_TLD.includes(m[1])?"eu":"us"; };
const OCC_CHIPS=[["occ:us","Occ - US"],["occ:eu","Occ - Europe"]];
const hasNoChip=id=>MUSEUMS.some(m=>m.id===id&&m.underOcc)||(String(id).startsWith("occ-")&&!ownChip(id));   // the venue list is sorted at load, before isOcc and LINK_VENUES exist
// Within a country, the venues her order already named come first, in that order; the rest follow by name.
const OCC_NAMED_ORDER=["occ-mfa-org","occ-clevelandart-org","occ-dia-org","occ-archive-worcesterart-org","occ-courtauld-ac-uk","occ-royalacademy-org-uk","ashmolean","occ-museitoscana-cultura-gov-it","occ-palazzoducale-genova-it","occ-palazzorealemilano-it","occ-museothyssen-org"];
const orderOf=id=>{ const i=VENUE_ORDER.indexOf(id); if(i>=0)return i; if(!hasNoChip(id))return 1e6;
  const c=occCountry(id),j=OCC_COUNTRY_ORDER.indexOf(c),k=OCC_NAMED_ORDER.indexOf(id);
  const base=c==="United States"?100:occRegion(id)==="eu"?(j>=0?110+j:150):105;   // the United States, the rest of the US group (Australia), then Europe
  return base+(k>=0?k/100:0.5); };
MUSEUMS.sort((a,b)=>orderOf(a.id)-orderOf(b.id));
const lookupName=mu=>mu.lookupName||mu.short;
const MU = Object.fromEntries(MUSEUMS.map(m=>[m.id,m]));

// ===== SHARED WITH THE SCRAPER — written by `node build/sync_shared.js`; never edit between these markers. Edit scraper/dates.js or scraper/compress_prompt.md, then run it. =====
const DATES=(()=>{
// ── Date helpers ──────────────────────────────────────────────────────────────
// Every month spelling a venue has used, in one shared map (docs/scraper.md §3).
const MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12,

  // Italian, for the five Italian venues ("11 maggio-12 giugno 2025"). gennaio/giugno
  // and marzo/maggio differ late, so abbreviations stay long enough to be unambiguous.
  gennaio:1, febbraio:2, marzo:3, aprile:4, maggio:5, giugno:6,
  luglio:7, agosto:8, settembre:9, ottobre:10, novembre:11, dicembre:12,
  genn:1, febbr:2, magg:5, giu:6, lug:7, ago:8, sett:9, ott:10, dic:12,

  // Three-letter Italian forms ("10 set 2026 - 22 nov 2026", the Accademia).
  set:9, gen:1, mag:5,

  // French ("Du 2 mars au 19 mai 2024", Chantilly), with and without accents.
  janvier:1, février:2, fevrier:2, mars:3, avril:4, mai:5, juin:6, juillet:7, août:8, aout:8,
  septembre:9, octobre:10, décembre:12, decembre:12, janv:1, févr:2, fevr:2, avr:4, juil:7, déc:12,

  // German ("30. Juni 2024 – 5. Januar 2025", Emil Schumacher Museum), Austrian "Jänner" too.
  januar:1, jänner:1, februar:2, märz:3, maerz:3, juni:6, juli:7, oktober:10, dezember:12, okt:10, dez:12,

  // A venue's own misspelling (Jacquemart-André, "Feburary").
  feburary:2 };

/**
 * A weekday in front of a date. Longest alternative first ("sat" before "saturday"
 * leaves "urday"), and anchored on a following day or month, so "the Sun King" is safe.
 */
const WEEKDAY_PREFIX_SRC =
  '\\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday' +
  '|thurs|thur|tues|weds|mon|tue|wed|thu|fri|sat|sun)\\.?,?\\s+';

// Ordinal days ("May 23rd", Orsay's cards; French "1er"): both parsers drop the suffix first. A suffix
// set apart by a space ("September 29 th 2012", the Correr's archive) only in small letters, so "5 St"
// (a saint, a street) stays.
const ORDINAL_SUFFIX = /\b(\d{1,2})(?:[sS][tT]|[nN][dD]|[rR][dD]|[tT][hH]|[eE][rR]| (?:st|nd|rd|th))\b/g;

// One month pattern for every parser; long names first, a trailing full stop allowed
// ("Sept."). The (?![A-Za-z]) is load-bearing: without it "7 November 2025" can match
// as "7 Nov" + "ember 2025", silently defeating any lookahead after it.
const MONTH_PATTERN =
  '(?:January|February|Feburary|March|April|May|June|July|August|September|October|November|December' +
  '|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre'
  + '|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|décembre|decembre' +
  '|januar|jänner|februar|märz|maerz|juni|juli|oktober|dezember' +
  '|Sept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec' +
  // Longest first within each language: sett before set, genn before gen, magg before mag.
  '|genn|febbr|magg|giu|lug|ago|sett|ott|dic|set|gen|mag|janv|févr|fevr|avr|juil|déc|okt|dez)\\.?(?![A-Za-z])';

// A German day is written with a full stop ("30. Juni"): the stop leaves before a month name.
const GERMAN_DAY_DOT = new RegExp('(?<![\\d.])(\\d{1,2})\\.\\s*(?=(?:januar|jänner|februar|märz|maerz|april|mai|juni|juli|august'
  + '|september|oktober|november|dezember|okt|dez)\\.?(?![A-Za-zäöü]))', 'gi');

// Month name to number, tolerating the trailing full stop the pattern allows.
function monthNum(name) {
  return MONTHS[String(name || '').toLowerCase().replace(/\.$/, '')];
}

/**
 * YYYY-MM-DD only when the day exists: JavaScript rolls 2026-02-31 into March, a
 * plausible wrong date. Otherwise '' and the notes say why.
 */
function ymd(y, m, d) {
  const yy = parseInt(y, 10), mm = parseInt(m, 10), dd = parseInt(d, 10);
  if (!plausibleYear(yy)) return '';
  if (!(mm >= 1 && mm <= 12) || !(dd >= 1 && dd <= 31)) return '';
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return '';
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * The opening year when the venue printed the year only on the closing side: a range
 * running backwards within one year crosses new year ("December 5 - January 20, 2026"
 * opened in 2025).
 */
function startYearFor(startMo, startDay, endMo, endDay, endYear) {
  const backwards = startMo > endMo || (startMo === endMo && startDay > endDay);
  return backwards ? endYear - 1 : endYear;
}

function parseMonthDay(str, fallbackYear) {
  // e.g. "March 2", "July 26, 2026", "Sept. 21, 2024" — the full stop allowed, as
  // MONTH_PATTERN allows it.
  const m = str.trim().match(/^([A-Za-z]+\.?)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!m) return null;
  const mo = monthNum(m[1]);
  if (!mo) return null;
  const yr = m[3] ? parseInt(m[3], 10) : fallbackYear;
  if (!yr) return null;
  return ymd(yr, mo, m[2]) || null;
}

// Range separators, shared by both parsers (they once drifted): "-", "to", "till",
// "until", "through", Dutch "t/m", Italian "al" and its elisions "all'"/"alle"/"allo", French "au".
// Longest alternative first, or "al" eats "all'8". A comma may sit before the
// separator ("From May 16, 2025, to May 17, 2027" — Brera).
const RANGE_SEP = "\\s*,?\\s*(?:-|t/m|to|till|until|through|all['\u2019]|all[oe]|al|au)\\s*";

// ── Day first or month first ── A date written only in numbers ("4/2/2019") is read in an order the
// numbers settle (a number over 12 cannot be a month) or, when they cannot, in the order recorded here
// for its venue. Each venue's order comes from its own pages; a venue not listed whose numbers cannot
// settle it gets ORDER_UNKNOWN_NOTE, and a session records its order (her design; docs/scraper.md §3).
const DATE_ORDER = {
  // Swept venues.
  uffizi: 'day',                                // "From 18/06/2025 to 28/09/2025"
  // Link venues.
  'occ-museodelprado-es': 'month',              // "6/9/2026 - 9/27/2026"
  'occ-smb-museum': 'day',                      // "14.05.2027 to 12.09.2027"
  'occ-alte-nationalgalerie': 'day',            // "19.03.2027 to 01.08.2027"
  'occ-neue-nationalgalerie': 'day',            // "20.03.2026 to 09.08.2026"
  'occ-alte-pinakothek': 'day',                 // "27.10.2023-04.02.2024"
  'occ-pinakothek-der-moderne': 'day',          // "10/07/2026 - 04/10/2026", "09.10.2026-21.02.2027"
  'occ-sammlung-schack': 'day',                 // "14.10.2027-13.02.2028"
  'occ-gemaeldegalerie-skd-museum': 'day',      // "14/04/2022—31/07/2022"
  'occ-kunstmuseumbasel-ch': 'day',             // "25.05.–24.11.2024"
  'occ-kunsthaus-ch': 'day',                    // "Until 25.10.2026"
  'occ-louisiana-dk': 'day',                    // "11.10.24 - 27.4.25"
  'occ-mskgent-be': 'day',                      // "01.02 – 30.04.20"
  'occ-approfondimentimostre-com': 'day',       // "22.05.2008 | 14.08.2008"
};
const ORDER_UNKNOWN_NOTE = "Dates not yet read \u2014 confirm whether the venue's date format is day first or month first.";

/**
 * 'day' or 'month' for numeric [first, second] pairs: settled by a number over 12, else the venue's
 * recorded order; 'bad' when the numbers contradict each other, '' when nothing settles it.
 */
function numberOrder(pairs, venue) {
  const dayFirst = pairs.some(([a]) => a > 12), monthFirst = pairs.some(([, b]) => b > 12);
  if (dayFirst && monthFirst) return 'bad';
  if (dayFirst) return 'day';
  if (monthFirst) return 'month';
  return DATE_ORDER[venue] || '';
}
const byOrder = (order, a, b) => order === 'day' ? { day: a, mon: b } : { day: b, mon: a };

const WEEKDAY_PREFIX = new RegExp(WEEKDAY_PREFIX_SRC + '(?=\\d|' + MONTH_PATTERN + ')', 'gi');
const stripWeekdays = t => String(t || '').replace(WEEKDAY_PREFIX, '');
// A clock time, with any time zone: "10:00 am ET", "5pm", "10:30–11 a.m." (Yale prints
// one beside each date, which broke the range). am/pm is required, so a year never matches.
const CLOCK_TIME = /,?\s*\b\d{1,2}(?::\d{2})?\s*(?:-\s*\d{1,2}(?::\d{2})?\s*)?[ap]\.?m\b\.?(?:\s+(?:[ECMP][SD]?T|GMT|BST|CES?T)\b)?/gi;

/**
 * A run extended after it was announced ("extended to02/11/2025", Uffizi; "prorogata
 * al 9 giugno 2026", Capodimonte) — a general museum fact, so in the shared parser.
 */
const EXTENDED_TO = new RegExp(
  // The trigger is the word, verb or noun; a few words may sit between it and the
  // separator, never a full stop.
  '(?:extend(?:ed|ing)?|extension|prorogat[ao])[^.]{0,30}?' +
  // Longest alternative first, or "al" matches the start of "all'8".
  '(?:through|until|to|all[\'\u2019]|alla|al)\\s*' +
  '(' +
    '\\d{1,2}\\s*[/.]\\s*\\d{1,2}\\s*[/.]\\s*\\d{4}' +      // 02/11/2025
    '|\\d{1,2}\\s+' + MONTH_PATTERN + '(?:\\s+\\d{4})?' +          // 9 giugno 2026
    '|' + MONTH_PATTERN + '\\s+\\d{1,2}(?:,?\\s*\\d{4})?' +        // October 11
  ')', 'i');

/** Apply an extension: it only ever moves the closing date LATER, so a stray match cannot shorten a run. */
function applyExtension(range, text, venue) {
  if (!range || !range.end || !text) return range;
  const t = String(text);
  const m = EXTENDED_TO.exec(t);
  if (!m) return range;

  const dm = readDayMonth(m[1], venue);
  if (!dm) return range;
  let { day, mon, year } = dm;
  const quote = frag(m);

  // No year on the extension: take it from the closing date written just before the
  // trigger, crossing into the next year only if earlier ("until 20 December, extended
  // to 18 January"). Never roll the range's own closing date forward — it may already
  // be the extension (Capodimonte's header put Gricci and Lotto a year late).
  if (!year) {
    const before = precedingDate(t.slice(0, m.index), range.end);
    if (before) {
      year = Number(before.slice(0, 4));
      if (ymd(year, mon, day) <= before) year += 1;
    } else {
      // Nothing to anchor on: the closing date's own year, taken only if that
      // is later. Otherwise the year is unknown and the note says so.
      year = Number(range.end.slice(0, 4));
      const same = ymd(year, mon, day);
      if (same && same < range.end) return { ...range, extensionUnclear: quote };
    }
  }
  const iso = ymd(year, mon, day);
  // Only ever LATER. The same date is the header repeating itself; an earlier
  // one is an older extension the header has overtaken.
  if (!iso || iso <= range.end) return range;
  return { ...range, end: iso, extendedFrom: range.end, extendedRaw: quote };
}

/** "11 novembre", "October 11", "02/11/2025" → { day, mon, year (0 if none) }; numbers in the venue's order. */
function readDayMonth(s, venue) {
  const M = MONTH_PATTERN;
  const numeric = s.match(/^(\d{1,2})\s*[/.]\s*(\d{1,2})\s*[/.]\s*(\d{4})$/);
  if (numeric) {
    const order = numberOrder([[+numeric[1], +numeric[2]]], venue);
    return order === 'day' || order === 'month' ? { ...byOrder(order, +numeric[1], +numeric[2]), year: +numeric[3] } : null;
  }
  const dayFirst = s.match(new RegExp(`^(\\d{1,2})\\s+(${M})(?:\\s+(\\d{4}))?$`, 'i'));
  if (dayFirst) return ok(+dayFirst[1], monthNum(dayFirst[2]), +(dayFirst[3] || 0));
  const monthFirst = s.match(new RegExp(`^(${M})\\s+(\\d{1,2})(?:,?\\s*(\\d{4}))?$`, 'i'));
  if (monthFirst) return ok(+monthFirst[2], monthNum(monthFirst[1]), +(monthFirst[3] || 0));
  return null;
  function ok(day, mon, year) { return day && mon ? { day, mon, year } : null; }
}

/**
 * The date an extension replaces: the LAST day-and-month in the same passage
 * before the trigger — back to the previous full stop, at most 80 characters.
 * Its own year if printed; otherwise the closing date's year, or the year
 * before when that would put it after the closing date. '' if there is none.
 */
function precedingDate(before, closing) {
  const M = MONTH_PATTERN;
  const tail = before.slice(-80).split(/\.\s/).pop();
  const re = new RegExp(`(\\d{1,2})\\s+(${M})(?:\\s+(\\d{4}))?|(${M})\\s+(\\d{1,2})(?:,?\\s*(\\d{4}))?`, 'gi');
  let last = null, x;
  while ((x = re.exec(tail))) last = x;
  if (!last) return '';
  const day = +(last[1] || last[5]), mon = monthNum(last[2] || last[4]);
  let year = +(last[3] || last[6] || 0);
  if (!day || !mon) return '';
  if (!year) {
    year = Number(closing.slice(0, 4));
    if (ymd(year, mon, day) > closing) year -= 1;
  }
  return ymd(year, mon, day) || '';
}

/** The one note for an extension, on every path: where the new date came from. */
function extensionNote(range) {
  if (range.extendedFrom) {
    return `Closing date extended from ${dayText(range.extendedFrom)} to ${dayText(range.end)}: "${range.extendedRaw}".`;
  }
  if (range.extensionUnclear) {
    return `An extension is mentioned but its year is not stated, so the closing date was left as published: "${range.extensionUnclear}".`;
  }
  return '';
}

/**
 * A run cut short ("the COVID-19 crisis forced us to close the exhibition earlier", MSK Ghent): a
 * paragraph that says the show closed early AND gives the run again with the same opening day moves
 * the closing date to that paragraph's. Only ever EARLIER and after the opening, so a museum's
 * early-closing hours, which never restate the run, cannot match.
 */
const CLOSED_EARLY = /\b(?:clos(?:e|ed|ing)|end(?:ed)?|shut)\b[^.]{0,25}\b(?:exhibition|show)\b[^.]{0,25}\b(?:early|earlier|prematurely|ahead of schedule)\b|\b(?:exhibition|show)\b[^.]{0,40}\b(?:closed|ended|shut)\b[^.]{0,25}\b(?:early|earlier|prematurely|ahead of schedule)\b/i;

function closedEarly(range, text, venue) {
  if (!range || !range.start || !range.end || !text) return range;
  for (const para of String(text).split(/\n+/)) {
    const m = CLOSED_EARLY.exec(para);
    if (!m) continue;
    const p = findDateRangeInProseCore(para, range.end.slice(0, 4), venue);
    if (p.start === range.start && p.end && p.end > range.start && p.end < range.end) {
      return { ...range, end: p.end, closedEarlyFrom: range.end, closedEarlyRaw: frag(m) };
    }
  }
  return range;
}

/** The one note for a run cut short, on every path. */
function closedEarlyNote(range) {
  return range && range.closedEarlyFrom
    ? `Closed early on ${dayText(range.end)}, not ${dayText(range.closedEarlyFrom)} as published: "${range.closedEarlyRaw}".`
    : '';
}

function dayText(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${y}`;
}

// Read docs/scraper.md §3 before changing this parser: every format found in the wild,
// the guards against art-history dates, and why `looseSingles` exists.
// opts.looseSingles: true for a listing card (a short string about one show); false for
// page text, where loose patterns are a lottery (a 1994 photo caption once became a 2024
// show's opening date).
// opts.venue: the venue's code, for the order of an all-number date (DATE_ORDER).
// opts.anyYear: no year floor, for date words already cut out of the text (Paste: Claude
// copies them, so a lifespan or a caption cannot be among them).
function findDateRange(raw, opts = {}) {
  if (!opts.anyYear) return applyExtension(findDateRangeCore(raw, opts), raw, opts.venue);
  yearFloor = 1;
  try { return applyExtension(findDateRangeCore(raw, opts), raw, opts.venue); }
  finally { yearFloor = PLAUSIBLE_YEAR_MIN; }
}

function findDateRangeCore(raw, opts = {}) {
  const looseSingles = opts.looseSingles !== false;
  if (!raw) return { start: '', end: '', raw: '' };
  // Normalise every dash (the National Gallery mixes U+2012 and U+2013).
  const s = String(raw).replace(/[\u2010-\u2015\u2212\u2043]/g, '-')
    .replace(CLOCK_TIME, '')
    // Weekdays carry no date and break every range pattern (Wallace), so they go first.
    .replace(WEEKDAY_PREFIX, '')
    .replace(ORDINAL_SUFFIX, '$1')
    .replace(GERMAN_DAY_DOT, '$1 ')
    .replace(/\s+/g, ' ').trim();
  const M = MONTH_PATTERN;

  // All-numeric ranges, in the order the numbers settle or the venue's recorded order (numberOrder).
  // Unsettled, the result says so (orderUnknown) unless a later pattern reads the text. Slashes on a
  // listing card or a show page's date line only (opts.slashes): on a sweep's page they read a sidebar.
  let unknown = null;
  const numRange = (m, sDay, sMo, eDay, eMo, sYr, eYr) => {
    const order = numberOrder([[sDay, sMo], [eDay, eMo]], opts.venue);
    if (order === 'bad') return null;
    if (!order) { if (!unknown) unknown = { start: '', end: '', orderUnknown: true, shownText: frag(m), raw: frag(m) }; return null; }
    const a = byOrder(order, sDay, sMo), b = byOrder(order, eDay, eMo);
    const startYr = sYr || startYearFor(a.mon, a.day, b.mon, b.day, eYr);
    const r = sane(ymd(startYr, a.mon, a.day), ymd(eYr, b.mon, b.day), frag(m));
    return r.start || r.end ? r : null;
  };
  // Two-digit years on both sides ("11.10.24 - 27.4.25", Louisiana).
  const dotted2 = s.match(new RegExp(
    `\\b(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2})${RANGE_SEP}(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2})(?![\\d.:])`));
  if (dotted2) {
    const [a1, b1, y1, a2, b2, y2] = [1,2,3,4,5,6].map(i => Number(dotted2[i]));
    const r = numRange(dotted2, a1, b1, a2, b2, 2000 + y1, 2000 + y2);
    if (r) return r;
  }
  // The year on the closing side only ("25.05.–24.11.2024", Kunstmuseum Basel; "01.02 – 30.04.20", MSK Ghent).
  const dottedOpen = s.match(new RegExp(
    `\\b(\\d{1,2})\\.(\\d{1,2})\\.?${RANGE_SEP}(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}\\b|\\d{2}(?![\\d:]|\\.\\d))`));
  const openYr = dottedOpen && (dottedOpen[5].length === 2 ? 2000 + +dottedOpen[5] : +dottedOpen[5]);
  if (dottedOpen && plausibleYear(openYr)) {
    const [a1, b1, a2, b2] = [1,2,3,4].map(i => Number(dottedOpen[i]));
    const r = numRange(dottedOpen, a1, b1, a2, b2, 0, openYr);
    if (r) return r;
  }
  // Full years on both sides, a dash or a bar between ("22.05.2008 | 14.08.2008", the Borghese's archive site).
  const num = s.match(new RegExp(
    `\\b(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})(?:${RANGE_SEP}|\\s*\\|\\s*)(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})\\b`))
    || ((looseSingles || opts.slashes) && s.match(new RegExp(
    `\\b(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})${RANGE_SEP}(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})\\b`)));
  if (num) {
    const [a1, b1, y1, a2, b2, y2] = [1,2,3,4,5,6].map(i => Number(num[i]));
    if (plausibleYear(y1) && plausibleYear(y2)) {
      const r = numRange(num, a1, b1, a2, b2, y1, y2);
      if (r) return r;
    }
  }

  // Day-first European form, as used by Borghese and the National Gallery:
  // "1 November 2025 to 11 January 2026", "19 June till 13 September 2026".
  let dm = s.match(new RegExp(`(\\d{1,2})\\s+(${M})\\s*(\\d{4})?${RANGE_SEP}(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (dm && plausibleYear(dm[6])) {
    const endYr = parseInt(dm[6], 10);
    const sMo = monthNum(dm[2]), eMo = monthNum(dm[5]);
    if (sMo && eMo) {
      const sDay = parseInt(dm[1], 10), eDay = parseInt(dm[4], 10);
      // A published opening year that fails the plausibility check refuses the WHOLE
      // range, never swapped for the closing year (an artist's lifespan, Mimmo Jodice).
      if (dm[3] && !plausibleYear(dm[3])) return { start: '', end: '', raw: '' };
      const startYr = dm[3] ? parseInt(dm[3], 10)
                            : startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), frag(dm));
    }
  }

  // "Month D, YYYY - Month D, YYYY" — year on both sides; the comma may be left out ("September 29 2012 to
  // January 6 2013", the Correr's archive).
  let m = s.match(new RegExp(`(${M}\\s+\\d{1,2}(?:,\\s*|\\s+)\\d{4})${RANGE_SEP}(${M}\\s+\\d{1,2}(?:,\\s*|\\s+)\\d{4})\\b`, 'i'));
  const withComma = d => titleCase(d).replace(/(\d)\s+(\d{4})$/, '$1, $2');
  if (m) return sane(parseMonthDay(withComma(m[1]), null) || '', parseMonthDay(withComma(m[2]), null) || '', frag(m));

  // "Month D - Month D, YYYY": the opening year is worked out (startYearFor).
  m = s.match(new RegExp(`(${M})\\s+(\\d{1,2})${RANGE_SEP}(${M})\\s+(\\d{1,2}),\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[5])) {
    const endYr = parseInt(m[5], 10);
    const sMo = monthNum(m[1]), eMo = monthNum(m[3]);
    if (sMo && eMo) {
      const sDay = parseInt(m[2], 10), eDay = parseInt(m[4], 10);
      const startYr = startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), frag(m));
    }
  }

  // "Month D - D, YYYY": one month, day only on the closing side (Acquavella).
  m = s.match(new RegExp(`(${M})\\s+(\\d{1,2})${RANGE_SEP}(\\d{1,2}),\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[1]);
    if (mo) return sane(ymd(m[4], mo, m[2]), ymd(m[4], mo, m[3]), frag(m));
  }

  // ── A range whose closing side is not a date ("Aug 1, 2026-Summer 2027", "-ongoing";
  // MoMA). Caught HERE, above the single-date rule, which wrote the opening date into
  // the closing column. Only the opening date is written; the season's year is kept as
  // `latestYear`, a lookback bound. MO-001 to MO-010.
  m = s.match(new RegExp(
    `(${M}\\s+\\d{1,2},\\s*\\d{4})${RANGE_SEP}` +
    `(?:(spring|summer|autumn|fall|winter)\\s+(\\d{4})|(ongoing|present|tbc|tba))`, 'i'));
  if (m) {
    const start = parseMonthDay(titleCase(m[1]), null) || '';
    if (start) {
      const seasonYear = m[3] && plausibleYear(m[3]) ? +m[3] : null;
      return {
        start, end: '',
        ...(seasonYear ? { latestYear: seasonYear } : {}),
        shownText: m[0].trim(),
        shownWhy: m[2]
          ? 'the venue gives a season, not a closing date'
          : 'the venue has not announced a closing date',
        raw: frag(m),
      };
    }
  }

  // ── A month and day, no year, with a preposition ("Through Oct 4", "Ongoing from Oct
  // 19"; MoMA). The year is derived: the next occurrence of that day — a current listing
  // cannot mean last year. `today` is a parameter so fixtures can pin it.
  if (looseSingles) {
    const today = opts.today instanceof Date ? opts.today : new Date();
    const nextOccurrence = (mo, day) => {
      const y = today.getUTCFullYear();
      const thisYear = Date.UTC(y, mo - 1, day);
      const cutoff = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      return thisYear >= cutoff ? y : y + 1;
    };

    m = s.match(new RegExp(`\\b(?:till|until|through|thru)\\s+(${M})\\s+(\\d{1,2})\\b(?!,?\\s*\\d{4})`, 'i'));
    if (m) {
      const mo = monthNum(m[1]), day = parseInt(m[2], 10);
      if (mo) return { start: '', end: ymd(nextOccurrence(mo, day), mo, day), raw: frag(m) };
    }

    m = s.match(new RegExp(`\\b(?:ongoing from|from|opens?|opening)\\s+(${M})\\s+(\\d{1,2})\\b(?!,?\\s*\\d{4})`, 'i'));
    if (m) {
      const mo = monthNum(m[1]), day = parseInt(m[2], 10);
      if (mo) return { start: ymd(nextOccurrence(mo, day), mo, day), end: '', raw: frag(m) };
    }
  }

  // Single "Month D, YYYY" — treat as the end date (open until).
  // Bare, with no preposition to anchor it, so it is a listing-card rule only.
  if (looseSingles) {
    m = s.match(new RegExp(`(${M}\\s+\\d{1,2},\\s*\\d{4})`, 'i'));
    if (m) return { start: '', end: parseMonthDay(titleCase(m[1]), null) || '', raw: frag(m) };
  }

  // A single day-first date with a preposition (Rijksmuseum): "till 21 March 2027"
  // closes, "from 9 October 2026" opens. After the range patterns, so a range still wins.
  // "Closes 15 November 2026" and Italian "fino al 24 aprile 2026" close too, and so does
  // "Now–" (Cincinnati, Anila Quayyum Agha: the show is already open, its start unprinted).
  m = s.match(new RegExp(`\\b(?:(?:till|until|through|to|closes?|closing|fino\\s+al)\\s+|fino\\s+all['\u2019]\\s*|now\\s*-\\s*)(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[3])) {
    const mo = monthNum(m[2]);
    if (mo) return { start: '', end: ymd(m[3], mo, m[1]), raw: frag(m) };
  }

  // The same with a dotted date: "Until 25.10.2026" (Kunsthaus Zürich), "bis 25.10.2026".
  m = s.match(/\b(?:till|until|through|closes?|closing|bis|fino\s+al)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\b/i);
  if (m && plausibleYear(m[3])) {
    const order = numberOrder([[+m[1], +m[2]]], opts.venue);
    if (order === 'day' || order === 'month') {
      const x = byOrder(order, +m[1], +m[2]);
      return { start: '', end: ymd(m[3], x.mon, x.day), raw: frag(m) };
    }
    if (!order && !unknown) unknown = { start: '', end: '', orderUnknown: true, shownText: frag(m), raw: frag(m) };
  }

  // The same, month first: "Through January 10, 2027", "Closes November 15, 2026".
  m = s.match(new RegExp(`\\b(?:(?:till|until|through|thru|closes?|closing)\\s+|now\\s*-\\s*)(${M})\\s+(\\d{1,2}),?\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[3])) {
    const mo = monthNum(m[1]);
    if (mo) return { start: '', end: ymd(m[3], mo, m[2]), raw: frag(m) };
  }

  // "since", and a day written "11." the German way (KHM). Only WITH a year: the
  // yearless forms below take the NEXT such date, right for "from", wrong for "since".
  m = s.match(new RegExp(`\\b(from|since|opens?|opening|dal|dall['\u2019]?)\\s*(\\d{1,2})\\.?\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[3]);
    if (mo) return { start: ymd(m[4], mo, m[2]), end: '', raw: frag(m) };
  }

  // "Month YYYY" / "Month / YYYY" (Borghese): a start month, end unknown. The loosest
  // rule in the file — listing cards only.
  if (looseSingles) {
    m = s.match(new RegExp(`(${M})\\s*\\/?\\s*(\\d{4})`, 'i'));
    if (m && plausibleYear(m[2])) {
      const mo = monthNum(m[1]);
      // No day is written (never the 1st — that invents a date); the year is kept as a
      // lookback bound.
      if (mo) return {
        start: '', end: '', latestYear: +m[2],
        shownText: m[0].trim(),
        shownWhy: 'no day is published, only the month and year',
        raw: frag(m),
      };
    }
  }

  // A season and a year ("Summer 2022"): never a date, but a published bound (latestYear).
  if (looseSingles) {
    m = s.match(/\b(?:spring|summer|autumn|fall|winter)\s+(\d{4})\b/i);
    if (m && plausibleYear(m[1])) return {
      start: '', end: '', latestYear: +m[1],
      shownText: m[0].trim(),
      shownWhy: 'only a season and a year are published',
      raw: frag(m),
    };
  }

  return unknown || { start: '', end: '', raw: '' };
}

// Plausible exhibition years: wide enough for any archive a venue still lists, narrow
// enough that a lifespan ("Caravaggio (1571-1610)") never reads as a run.
const PLAUSIBLE_YEAR_MIN = 1990;
const PLAUSIBLE_YEAR_MAX = 2035;
let yearFloor = PLAUSIBLE_YEAR_MIN;   // lowered only while findDateRange runs with anyYear

function plausibleYear(y) {
  const n = parseInt(y, 10);
  return n >= yearFloor && n <= PLAUSIBLE_YEAR_MAX;
}

// The note quotes each branch's own MATCH, capped (frag), never its input — a whole
// page once landed in one note. Q-100 to Q-102.
function frag(m) { return m && m[0] ? String(m[0]).replace(/\s+/g, ' ').trim().slice(0, 120) : ''; }

// A range that runs backwards keeps only its end date (the lookback tests the end).
function sane(start, end, raw) {
  if (start && end && start > end) return { start: '', end, raw };
  return { start, end, raw };
}

/**
 * A day and month printed with NO year (Rijksmuseum's past pages): unusable, but the
 * note says it was there rather than "no date found". Requiring the year to be ABSENT
 * keeps photo captions ("April 1994") out.
 */
function unusableDateText(text) {
  if (!text) return '';
  const s = String(text).replace(/[‐-―−⁃]/g, '-').replace(/\s+/g, ' ');
  const M = MONTH_PATTERN;
  // The leading \.? matters: an abbreviated month can match without its full
  // stop ("Sept" out of "Sept."), and the year test would then be looking at
  // ". 2024" and conclude there was no year.
  const NO_YEAR = '(?!\\.?\\s*,?\\s*\\d{4})';
  // A range is more use to her than one end of it, so look for those first.
  const patterns = [
    new RegExp(`\\d{1,2}\\s+${M}${RANGE_SEP}\\d{1,2}\\s+${M}${NO_YEAR}`, 'i'),
    new RegExp(`${M}\\s+\\d{1,2}${RANGE_SEP}${M}\\s+\\d{1,2}${NO_YEAR}`, 'i'),
    new RegExp(`\\b(?:until|till|through|from)\\s+\\d{1,2}\\s+${M}${NO_YEAR}`, 'i'),
    new RegExp(`\\b(?:until|till|through|from)\\s+${M}\\s+\\d{1,2}${NO_YEAR}`, 'i'),
    new RegExp(`\\d{1,2}\\s+${M}${NO_YEAR}`, 'i'),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[0].trim();
  }
  return '';
}

/**
 * Find an exhibition's run inside prose ("From June 10 to September 14, 2025, Galleria
 * Borghese presents…"). Guards: a month NAME beside the number, and a plausible year.
 * hintYear supplies a missing year from the listing. Returns the matched sentence, so a
 * wrong grab shows in the notes.
 */
function findDateRangeInProse(text, hintYear, venue) {
  // The extension rule runs here too: the parsers must not diverge (Giorgio Armani's
  // extended run lost its opening date when only one knew about extensions).
  return applyExtension(findDateRangeInProseCore(text, hintYear, venue), text, venue);
}

function findDateRangeInProseCore(text, hintYear, venue) {
  if (!text) return { start: '', end: '', raw: '' };
  const s = String(text).replace(/[–—]/g, '-').replace(ORDINAL_SUFFIX, '$1').replace(GERMAN_DAY_DOT, '$1 ').replace(/\s+/g, ' ');
  const M = MONTH_PATTERN;
  const SEP = '(?:\\s*(?:-|t/m|to|until|through|till)\\s*(?:running\\s+)?)';

  // Day-first, as Borghese writes its prose ("From 20 January to 22 February 2026");
  // the year on the end side only, or on both.
  let dm = s.match(new RegExp(
    `(\\d{1,2})\\s+(${M})(?:\\s+(\\d{4}))?[^.]{0,40}?${SEP}(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (dm && plausibleYear(dm[6])) {
    const endYr = parseInt(dm[6], 10);
    const sMo = monthNum(dm[2]), eMo = monthNum(dm[5]);
    if (sMo && eMo) {
      const sDay = parseInt(dm[1], 10), eDay = parseInt(dm[4], 10);
      // See the note in findDateRange: a published-but-implausible opening year
      // refuses the range rather than being replaced by the closing year.
      if (dm[3] && !plausibleYear(dm[3])) return { start: '', end: '', raw: '' };
      const startYr = dm[3] ? parseInt(dm[3], 10)
                            : startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), dm[0].slice(0, 120));
    }
  }

  // "From June 10 to September 14, 2025"  /  "March 17 ... until May 10, 2026"
  let m = s.match(new RegExp(
    `(${M})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?[^.]{0,40}?${SEP}(${M})\\s+(\\d{1,2}),?\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[6])) {
    const endYr = parseInt(m[6], 10);
    const sMo = monthNum(m[1]), eMo = monthNum(m[4]);
    if (sMo && eMo) {
      const sDay = parseInt(m[2], 10), eDay = parseInt(m[5], 10);
      // Same rule for the month-first form: "Mimmo Jodice (March 29, 1934 -
      // October 27, 2025)" must refuse, not borrow the closing year.
      if (m[3] && !plausibleYear(m[3])) return { start: '', end: '', raw: '' };
      const startYr = m[3] ? parseInt(m[3], 10)
                           : startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), m[0].slice(0, 120));
    }
  }

  // Day-first, no year anywhere ("5 June to 25 October", Rijksmuseum): only with the
  // listing's year.
  if (hintYear && plausibleYear(hintYear)) {
    dm = s.match(new RegExp(`(\\d{1,2})\\s+(${M})[^.]{0,40}?${SEP}(\\d{1,2})\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (dm) {
      const sMo = monthNum(dm[2]), eMo = monthNum(dm[4]);
      if (sMo && eMo) {
        // A run that crosses new year ends in the following year. Same test as
        // startYearFor, read from the other end: the year we hold is the start's.
        const sDay = parseInt(dm[1], 10), eDay = parseInt(dm[3], 10);
        const endYr = startYearFor(sMo, sDay, eMo, eDay, Number(hintYear)) === Number(hintYear)
          ? Number(hintYear)
          : Number(hintYear) + 1;
        return sane(
          ymd(hintYear, sMo, sDay),
          ymd(endYr, eMo, eDay),
          dm[0].slice(0, 120) + ' (year taken from the listing page)');
      }
    }

    // A lone closing date with no year: "Till 29 November".
    let one = s.match(new RegExp(`\\b(till|until|through)\\s+(\\d{1,2})\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (one) {
      const mo = monthNum(one[3]);
      if (mo) return { start: '',
        end: ymd(hintYear, mo, one[2]),
        raw: one[0].slice(0, 120) + ' (year taken from the listing page)' };
    }

    // A lone opening date with no year: "From 5 June".
    one = s.match(new RegExp(`\\b(from|opens?|opening|dal|dall['\u2019]?)\\s*(\\d{1,2})\\.?\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (one) {
      const mo = monthNum(one[3]);
      if (mo) return {
        start: ymd(hintYear, mo, one[2]),
        end: '', raw: one[0].slice(0, 120) + ' (year taken from the listing page)' };
    }
  }

  // Same shape but no year anywhere: "From March 26 to June 23".
  // Only usable when the listing page told us which year this show belongs to.
  if (hintYear && plausibleYear(hintYear)) {
    m = s.match(new RegExp(`(${M})\\s+(\\d{1,2})[^.]{0,40}?${SEP}(${M})\\s+(\\d{1,2})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (m) {
      const sMo = monthNum(m[1]), eMo = monthNum(m[3]);
      if (sMo && eMo) {
        // A run that crosses new year ends in the following year.
        const sDay = parseInt(m[2], 10), eDay = parseInt(m[4], 10);
        const endYr = startYearFor(sMo, sDay, eMo, eDay, Number(hintYear)) === Number(hintYear)
          ? Number(hintYear)
          : Number(hintYear) + 1;
        return sane(
          ymd(hintYear, sMo, sDay),
          ymd(endYr, eMo, eDay),
          m[0].slice(0, 120) + ' (year taken from listing page)');
      }
    }
  }

  // Last resort: the listing parser's CORE (ranges and preposition dates only), so any
  // pattern either parser knows serves both. The core, not the wrapper — applying the
  // extension twice put Gricci and Lotto a year late.
  const viaListing = findDateRangeCore(s, { looseSingles: false, venue });
  if (viaListing.start || viaListing.end) return viaListing;

  return { start: '', end: '', raw: '' };
}

function titleCase(str) {
  return str.replace(/([A-Za-z]+)/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

// ── Titles typed in capitals ──────────────────────────────────────────────────
/**
 * A title a venue TYPES in capitals, in ordinary capitals (the Ashmolean, Borghese,
 * Munich's Pinakotheken by link; docs/scraper.md). Shared with the app, one copy.
 *
 * Only a title with no lower-case word is touched: a word of two or more letters, no
 * digit ("1960s" and "x" are not evidence). Each word: first letter capital, rest small;
 * small joining words and name particles ("da", "van") stay small unless they open the
 * title or follow a colon or dash. Roman numerals stay capitals ("Bandō Tamasaburō V").
 * "20TH-CENTURY" → "20th-Century"; "O'KEEFFE" → "O'Keeffe". A styled name ("Ashmolean
 * NOW") comes out ordinary.
 */
const SMALL_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'nor', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'from', 'as', 'into', 'over', 'upon', 'via', 'vs', 'x', 'von',
  'van', 'da', 'de', 'di', 'del', 'della', 'du', 'e']);
const ROMAN = /^(?=[IVXLC]+$)C{0,3}(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
function titleFromCaps(title) {
  const t = String(title || '');
  const words = t.match(/[\p{L}\p{N}]+/gu) || [];
  const judged = words.filter(w => w.length >= 2 && !/\d/.test(w));
  if (!judged.length || judged.some(w => w !== w.toUpperCase())) return t;
  let startOfPhrase = true;
  // Word positions, so a token can tell whether it ends its phrase.
  const tokens = t.match(/[\p{L}\p{N}'’]+|[^\p{L}\p{N}'’]+/gu) || [];
  let at = -1;
  const lastOfPhrase = () => {
    for (let k = at + 1; k < tokens.length; k++) {
      if (/[\p{L}\p{N}]/u.test(tokens[k])) return false;
      if (/[:–—(]|\s-\s/.test(tokens[k])) return true;
    }
    return true;
  };
  return t.replace(/[\p{L}\p{N}'’]+|[^\p{L}\p{N}'’]+/gu, tok => {
    at++;
    if (!/[\p{L}\p{N}]/u.test(tok)) {
      if (/[:–—]|\s-\s/.test(tok)) startOfPhrase = true;
      return tok;
    }
    const first = startOfPhrase; startOfPhrase = false;
    // A numeral stays capitals: "Bandō Tamasaburō V", "Henry VIII and…".
    // Mid-phrase a single letter is a word, and so are the numeral-shaped
    // names "LI" and "LIV" ("LI JIN" is Li Jin); at a phrase's end they count.
    if (ROMAN.test(tok) && tok !== 'I' && (lastOfPhrase() || (tok.length >= 2 && !/^(LI|LIV)$/.test(tok)))) return tok;
    const low = tok.toLowerCase();
    if (!first && SMALL_WORDS.has(low)) return low;
    // Pieces joined by an apostrophe: O'KEEFFE → O'Keeffe, RUSKIN'S → Ruskin's.
    return low.split(/(['’])/).map((part, i, all) => {
      if (i === 0) return part.replace(/^(\d*)(\p{L})/u, (m, d, c) => d ? d + c : c.toUpperCase());
      if (/['’]/.test(part)) return part;
      return all[0].length === 1 && part.length > 1 ? part[0].toUpperCase() + part.slice(1) : part;
    }).join('');
  }).replace(/(^|[-–])(\p{Ll})/gu, (m, d, c) => d === '' ? m : d + c.toUpperCase())
    .replace(/^(\p{Ll})/u, c => c.toUpperCase());
}

// Capitals judged per part: a title can type its name in capitals and its subtitle in
// ordinary letters ("KABUKI KIMONO: Costumes of Bandō Tamasaburō V"), or the reverse
// ("Rachel Ruysch: NATURE INTO ART").
function capsTitleParts(title) {
  return String(title).split(/(\s*[:–—]\s*)/).map((seg, i) => i % 2 ? seg : titleFromCaps(seg)).join('');
}

// The swept venues that type their titles in capitals (her decisions; docs/venues.md): code writes
// ordinary capitals, and at the Borghese the full stop between name and subtitle becomes an em dash
// ("Louise Bourgeois — Unconscious Memories"). One copy: the sweep's recipes take it (`capsTitleRule`)
// and Add by link files the same title for the same venue.
const SWEPT_CAPS_TITLES = { borghese: { stopToDash: true }, ashmolean: {} };
function capsTitleRule(code) {
  const r = SWEPT_CAPS_TITLES[code];
  return r ? { capsTitles: true, ...(r.stopToDash ? { stopToDash: true } : {}) } : {};
}
// A swept venue's title as the sweep writes it: the em dash first where the venue takes one, then
// ordinary capitals for a title typed wholly in them. Other venues' titles are returned as they are.
function sweptVenueTitle(code, title) {
  const r = SWEPT_CAPS_TITLES[code];
  if (!r || !title) return title;
  return titleFromCaps(r.stopToDash ? String(title).replace(/\.\s+(?=\S)/g, ' — ') : title);
}

// The note on a row with no dates anywhere: the sweep writes it and Add by link copies it word for
// word (her decision).
const NO_DATES_NOTE = "No closing date found anywhere on the venue's pages.";
// The note on a row whose page prints a date it cannot be read as one (months only, a season, no year):
// what the page shows, quoted, and why — the dates left blank, a day never invented. One copy, the sweep's
// and Add by link's.
function shownOnlyNote(shown, why) {
  return `The venue's page shows only "${shown}" for this exhibition's dates — ${why || 'no year is published anywhere'}.`;
}
return { findDateRange, findDateRangeInProse, capsTitleParts, NO_DATES_NOTE, ORDER_UNKNOWN_NOTE, shownOnlyNote, unusableDateText, sweptVenueTitle, closedEarly, closedEarlyNote };
})();
const SUMMARY_RULES="- Maximum 10 words. The examples average about six.\n- End with a full stop. Avoid colons — the accepted summaries almost never use one.\n- Name the artist or artists the exhibition is built around.\n\nNAME THEM THE WAY A GALLERY-GOER WOULD. Surname alone, unless the surname alone\nwould be ambiguous. Write \"Zurbarán\", not \"Francisco de Zurbarán\". \"Shonibare\",\nnot \"Yinka Shonibare\". \"Velasco\", not \"Mexican artist José María Velasco\". Drop\n\"painter\", \"artist\" and similar labels in front of a name — the reader already\nknows. Full names, honorifics and formal titles read stiff and waste words that\ncould carry meaning instead.\n\nALWAYS WRITE IN ENGLISH, whatever language the raw text is in. Several venues\npublish only in Italian and one only in French; she reads the summaries in\nEnglish. Translating a phrase does not break the traceability rule below — a\ntranslated phrase is still traceable to the text it came from. Keep the\nexhibition's own title in its original language if that is how it is written;\ntranslate the description around it.\n\nTHE RULE THAT MATTERS MOST: every word of your summary must be traceable to a\nphrase in that row's own raw text. If you cannot point to where something came\nfrom, leave it out. In particular:\n\n- Never add an artist, place, medium or date that you happen to know about but the\n  text does not mention.\n- Use a number only if the text states that number. Do not count a list of names\n  and report the total — the page may state a different figure, and the page is\n  right, not your count.\n\nBeing vague is a much smaller failure than being confidently wrong. If the text\nwill only support something general, write something general.\n\nIf the raw text is not a description of an exhibition — a bare link, a curator's\nbiography, ticketing or opening-hours copy, cookie or consent boilerplate, a \"page\nnot found\" message, or empty — answer null for that row. Do not invent one.";
const EN_PREFIX = 'In English: ';
function composeSummary(english, teaser) {
  const t = String(english || '').trim();
  const d = String(teaser || '').trim();
  if (!t) return d;
  return `${EN_PREFIX}"${/[.!?]$/.test(t) ? t : t + '.'}" ${d}`;
}
const VENUE_SITES=[{"id":"met","host":"metmuseum.org"},{"id":"ng","host":"nationalgallery.org.uk"},{"id":"rijks","host":"rijksmuseum.nl"},{"id":"acq","host":"acquavellagalleries.com"},{"id":"lgd","host":"levygorvydayan.com"},{"id":"borghese","host":"galleriaborghese.cultura.gov.it"},{"id":"frick","host":"frick.org"},{"id":"morgan","host":"themorgan.org"},{"id":"menil","host":"menil.org"},{"id":"va","host":"vam.ac.uk"},{"id":"louvre","host":"louvre.fr"},{"id":"capo","host":"capodimonte.cultura.gov.it"},{"id":"uffizi","host":"uffizi.it"},{"id":"brera","host":"pinacotecabrera.org"},{"id":"orsay","host":"musee-orsay.fr"},{"id":"mam","host":"mam.paris.fr"},{"id":"mad","host":"madparis.fr"},{"id":"ashmolean","host":"ashmolean.org"},{"id":"jacquemart","host":"musee-jacquemart-andre.com"},{"id":"khm","host":"khm.at"},{"id":"artic","host":"artic.edu"},{"id":"moma","host":"moma.org"},{"id":"brit","host":"britishmuseum.org"},{"id":"dellav","host":"gallerieaccademia.it"},{"id":"tate-modern","host":"tate.org.uk","path":"/whats-on/tate-modern/"},{"id":"tate-britain","host":"tate.org.uk","path":"/whats-on/tate-britain/"},{"id":"wallace","host":"wallacecollection.org"},{"id":"cincinnati","host":"cincinnatiartmuseum.org"}];
const BOILERPLATE=["technical storage or access","legitimate purpose of storing preferences","subscriber or user","consent to the use of cookies","we use cookies","this website uses cookies","accept all cookies","privacy policy","sign up to our newsletter","★★","©","admission charge","members go free","free for members","tickets bookable","members enjoy free entry","become a member","tickets for this","no need to book","include entry to the","installation view","courtesy the artist","courtesy of the artist","generously provided by","generously supported by","major funding","leadership support","additional support","support is provided by","supported in part by","entitled to a discount","ticket office","ticket purchase","proof of membership","subscribe to","to stay updated","opening hours","admission is free","book your visit","buy tickets","for visit info","download of this image is authorised","higher image resolution","image licensing policies"];
const CHALLENGE_TITLE=/^\s*(just a moment|attention required|performing security verification|access denied|pardon our interruption|one more step|making sure you['’]re not a bot)/i;const BOT_CHECK_SAID="the venue’s site answered with a bot check instead of the page";
const ANSWER_CHECK=(()=>{
// Measured from all 110 seed summaries: min 3, median 6, max 10, and every one
// ends with a full stop. The data wins over any number written elsewhere.
const MAX_WORDS = 10;

const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * Check one supplied string before it is allowed anywhere near the CSV or a card.
 * An explicit null means "this text is not a curatorial description and I am not
 * going to invent one" — a recorded decision, not a missing answer.
 */
function validateAnswer(text) {
  if (text === null) return { ok: true, skip: true, text: '' };
  const s = String(text == null ? '' : text).trim();
  if (!s) return { ok: false, reason: 'empty' };
  if (/\n/.test(s)) return { ok: false, reason: 'contains a line break' };
  // The model is never asked for format: an English title arrives as its own
  // string, and code writes the "In English:" line.
  if (/^In English\b/i.test(s)) return { ok: false, reason: 'the description carries an "In English" line — the English title is a separate answer' };
  const n = wordCount(s);
  if (n > MAX_WORDS) return { ok: false, reason: `${n} words, cap is ${MAX_WORDS}` };
  return { ok: true, text: /[.!?]$/.test(s) ? s : s + '.' };
}

/** An English title as the model returned it: a plain string, or "" when the
 *  title is already English. Checked, never trusted. */
function validateEnglish(e) {
  if (e === '' ) return { ok: true, text: '' };
  if (typeof e !== 'string') return { ok: false, reason: 'the English title is not a string' };
  const t = e.trim();
  if (!t) return { ok: true, text: '' };
  if (/\n/.test(t)) return { ok: false, reason: 'the English title contains a line break' };
  if (t.length > 200) return { ok: false, reason: `the English title is ${t.length} characters` };
  if (/"/.test(t)) return { ok: false, reason: 'the English title contains a straight double quote, which the line uses' };
  if (/^In English\b/i.test(t)) return { ok: false, reason: 'the English title carries formatting' };
  return { ok: true, text: t };
}

/** What a written string must not carry: no full stop, an HTML fragment, a code fence. */
function stringFaults(s) {
  const t = String(s || '');
  const out = [];
  if (!/[.!?]["”’)]*\s*$/.test(t.trim())) out.push('does not end in a full stop');
  if (/&[a-z]+;|&#\d+;|<[a-z/]/i.test(t)) out.push('carries an HTML fragment');
  if (/^\s*```/.test(t)) out.push('carries a code fence');
  return out;
}

// Each claim the description may make, and its words in the languages the venues write in (English,
// Italian, French, German, Dutch, Spanish, Danish, Swedish). The description's word must be one of
// the English forms; the page must hold any form (a form of two words, "più grande", as a phrase).
const CLAIMS = [
  { en: ['first', 'firstever'], page: ['first', 'primo', 'prima', 'primi', 'prime', 'premier', 'première', 'premiers', 'premières', 'erste', 'ersten', 'erster', 'erstes', 'erstmals', 'eerste', 'primer', 'primera', 'primeros', 'primeras', 'første', 'första', 'först'] },
  { en: ['only'], page: ['only', 'solo', 'sola', 'soltanto', 'unico', 'unica', 'unici', 'uniche', 'seul', 'seule', 'seuls', 'seules', 'uniquement', 'einzige', 'einzigen', 'einziger', 'nur', 'enige', 'alleen', 'único', 'única', 'eneste', 'enda', 'endast'] },
  { en: ['largest', 'biggest'], page: ['largest', 'biggest', 'più grande', 'piu grande', 'plus grand', 'plus grande', 'größte', 'grösste', 'größten', 'grössten', 'grootste', 'más grande', 'el mayor', 'la mayor', 'største', 'största'] },
  { en: ['earliest', 'oldest'], page: ['earliest', 'oldest', 'antico', 'antica', 'ancien', 'ancienne', 'älteste', 'ältesten', 'oudste', 'vroegste', 'antiguo', 'antigua', 'ældste', 'äldsta'] },
  { en: ['greatest'], page: ['greatest', 'grandest', 'più grande', 'piu grande', 'più grandi', 'plus grand', 'plus grands', 'plus grande', 'größte', 'grösste', 'größten', 'grootste', 'el mayor', 'la mayor', 'største', 'största'] },
  { en: ['last', 'final'], page: ['last', 'final', 'ultimo', 'ultima', 'ultimi', 'dernier', 'dernière', 'derniers', 'letzte', 'letzten', 'laatste', 'último', 'última', 'sidste', 'sista'] },
  { en: ['unique'], page: ['unique', 'unico', 'unica', 'einzigartig', 'einzigartige', 'uniek', 'único', 'única', 'enestående', 'unik'] },
  { en: ['never', 'neverbefore'], page: ['never', 'mai', 'jamais', 'nie', 'niemals', 'nooit', 'nunca', 'aldrig'] },
  { en: ['unprecedented'], page: ['unprecedented', 'precedenti', 'inedito', 'inedita', 'inédit', 'inédite', 'précédent', 'beispiellos', 'beispiellose', 'ongekend', 'ongekende', 'precedentes', 'hidtil'] },
];

const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Words, accents folded, each hyphened word both closed up and in its parts ("first-ever" →
// "firstever", "first", "ever").
const wordsOf = s => [...(fold(s).replace(/[-‐–]/g, '').match(/[a-zøæåß]+/g) || []), ...(fold(s).match(/[a-zøæåß]+/g) || [])];

const SMALL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALE = { hundred: 100, thousand: 1000, million: 1000000 };
// A page's ordinals count as the number they name ("seventeenth century" for a description's "17th").
const ORDINAL = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11,
  twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19,
  twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80, ninetieth: 90, hundredth: 100 };
// The numbers a text states: figures ("2,000", "1920s", "17th") and English number words ("two
// thousand", "twenty-first"); with `ordinals`, an ordinal word on its own too ("seventeenth").
function numbersIn(s, ordinals) {
  const out = new Set();
  for (const m of String(s || '').match(/\d[\d,.]*\d|\d/g) || []) {
    const n = m.replace(/[,.](?=\d{3}\b)/g, '');
    if (/^\d+$/.test(n)) out.add(Number(n));
  }
  const w = fold(s).replace(/-/g, ' ').match(/[a-z]+/g) || [];
  for (let i = 0; i < w.length; i++) {
    if (ordinals && w[i] in ORDINAL) { out.add(ORDINAL[w[i]]); continue; }
    if (ordinals && w[i] === 'first') { out.add(1); continue; }
    if (!(w[i] in SMALL) || w[i] === 'one') continue;
    let total = 0, cur = 0, j = i;
    for (; j < w.length; j++) {
      if (w[j] in SMALL) cur += SMALL[w[j]];
      else if (w[j] in SCALE) { cur = (cur || 1) * SCALE[w[j]]; if (SCALE[w[j]] >= 1000) { total += cur; cur = 0; } }
      else if (w[j] === 'and' && j + 1 < w.length && (w[j + 1] in SMALL)) continue;
      else if (w[j] in ORDINAL) { cur += ORDINAL[w[j]]; j++; break; }
      else if (w[j] === 'first') { cur += 1; j++; break; }
      else break;
    }
    out.add(total + cur);
    i = j - 1;
  }
  return out;
}

/**
 * The claims and numbers in a description that its page does not hold, each said in words Claude can
 * act on. `source` is all the page text Claude was given (title included). [] when every one is there.
 */
function unsupportedClaims(text, source) {
  // "Twenty-first" is a number, not the claim "first".
  const claimText = fold(text).replace(/\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]+first\b/g, ' ');
  const said = new Set(wordsOf(claimText)), page = new Set(wordsOf(source)), flat = ' ' + (fold(source).match(/[a-zøæåß]+/g) || []).join(' ') + ' ';
  const holds = w => / /.test(w) ? flat.includes(' ' + fold(w) + ' ') : page.has(fold(w));
  const out = [];
  for (const c of CLAIMS) {
    const used = c.en.find(w => said.has(w));
    if (used && !c.page.some(holds)) out.push(`"${used === 'firstever' ? 'first-ever' : used === 'neverbefore' ? 'never-before' : used}" is not in the text`);
  }
  const have = numbersIn(source, true);
  for (const n of numbersIn(text, false)) {
    // A decade written in full ("1990s") when the page writes it short ("the 90s") is the same claim.
    if (!have.has(n) && !(n >= 1000 && have.has(n % 100))) out.push(`the number ${n} is not in the text`);
  }
  return out;
}
return { MAX_WORDS, validateAnswer, validateEnglish, stringFaults, unsupportedClaims };
})();
const SUMMARY_EXAMPLES=[{"title":"German Expressionism","raw":"Across Germany’s major cities, a new generation of artists emerged between 1900 and 1918 to change the rules of painting. They were the German Expressionists. Made up of two pioneering groups – Die Brücke (The Bridge) and Der Blaue Reiter (The Blue Rider) – these young artists painted raw emotions on canvas with a new intensity. Die Brücke was formed by a group of self-taught artists. Rebelling against conservative society, they lived and worked together in the bohemian corners of Dresden and other cities, before moving to Berlin, Germany’s rapidly modernising capital. For them, colour became…","summary":"Fifty German Expressionist works."},{"title":"Asian Bronze","raw":"From Shiva and the Buddha to wine casks and weapons. Everything about bronze triggers your senses. For centuries, this material has played a central role in the traditions of Asia. Now you too can experience the beauty of bronze art at last.","summary":"Four thousand years of Asian bronze."},{"title":"Hockney and Piero: A Longer Look","raw":"David Hockney, in his own words, has always been a looker. Throughout his career, Hockney has found inspiration in the work of other artists. He never tires of looking at paintings. For him, there’s magic in it every time, whether that’s enjoying a picture in a gallery or a much-loved poster at home. This very personal show brings together two Hockney paintings, one showing his mother and father and the other depicting his friend, curator Henry Geldzahler. They are displayed with the thread that ties them together, Piero della Francesca’s ‘The Baptism of Christ’. ‘My Parents’ and ‘Looking at…","summary":"Hockney against Piero della Francesca."},{"title":"At Home in the 17th Century","raw":"What was life really like in the 17th century? That’s the museum’s most-asked question. Now, the time has come to find out. At Home in the 17th Century offers an up-close experience of daily life 400 years ago. Immerse yourself in a full day of the 17th century as you walk among the nine diorama-style displays that make up this exhibition — packed with personal stories and unique objects.","summary":"Domestic life with Rembrandt, Hals, Vermeer."},{"title":"José María Velasco","raw":"See the first UK exhibition of Mexico’s much-loved artist, José María Velasco. Velasco, working in Mexico in the 19th century, was a man of many interests. He was fascinated by advances in geology, the archaeology of his home country, the study of local flora, and the increasing presence of industrialisation. He painted the sweeping landscapes of the Valley of Mexico, the home of modern-day Mexico City, with exquisite detail. His impressive panoramic views of the valley reveal allusions to Mexico's historic past and its rapidly modernising present. Velasco was keenly aware of his country’s…","summary":"Mexico's landscape painter."},{"title":"Carel Visser in the Rijksmuseum Gardens","raw":"This summer, the Rijksmuseum Gardens are home to the work of Carel Visser, the most influential Dutch sculptor of the twentieth century. Visser's sculptures, some as tall as eight metres or as long as five metres, come from museums, private collections and public spaces. Now they are brought together for the very first time. Carel Visser (1928–2015) had little affinity with traditional sculptors' materials such as marble, stone or wood. Iron was his great love. With a cutting torch and welding equipment, he shaped his sculptures from steel plates and beams. Stacking, repetition and symmetry…","summary":"Most influential Dutch sculptor of the twentieth century."},{"title":"Millet: Life on the Land","raw":"The sower, the woodcutter, a shepherd girl. These are the subjects that made French artist Jean-Francois Millet famous. Marking the 150th anniversary of his death, this is an opportunity to see some of Millet’s best-loved paintings and drawings. Born into a farming family in Normandy, Millet moved to the village of Barbizon in 1849 where he put the people who spent their life working on the land, often the poorest of the poor in 19th-century France, at the heart of his work. He knew these people and his realistic, unsentimental approach to painting them was completely new. See his iconic…","summary":"The subjects that made Millet famous."},{"title":"Crossings","raw":"Discover how colonial and contemporary perspectives converge in photographs from the Indian subcontinent. Past meets present in the Crossings exhibition.","summary":"Photography from the Indian subcontinent."}];
// ===== END SHARED =====

// ── ADD BY LINK (docs/add_by_link.md) ──────────────────────────────────────
// Each pasted show link is read once and becomes an ordinary pro forma row for the
// SAME intake as a sweep file; nothing here writes the ledger. Code reads the title
// and dates (the FIRST date line under the show's heading — show pages carry other
// shows' dates too). The model writes only the description and the English title,
// and picks the subtitle from the page's own lines. A link that cannot be read is a
// line, never a card. No lookback for a link (her decision).

const OCC_DOC="venues/occasional";
const LINKS_DOC="links/pending";
const isOcc=id=>String(id||"").startsWith("occ-");
// Palazzo Reale Milano's heading is the short name plus " - Palazzo Reale Milano", the full
// name on a line below it (nameInLines: the longest line between title and dates that starts
// with the short name; AL-048). Its pages on the city council's site open with a "# Navigation"
// heading and the site's menu; the show's heading is the one ending in the venue's name
// (titleHeading): "Palazzo Reale Milano", "Palazzo Reale, Milan" or "Royal Palace of Milan".
// Its English pages say "as of" for "to" ("from February 21, 2019 as of June 6, 2019";
// Antonello da Messina; asOfTo).
const PRM_TAIL=/\s+[-–—]\s+(?:Palazzo Reale,? Milano?|Royal Palace of Milan)$/i;
// Its "Upcoming Exhibitions" box lists other shows with their dates: the show's own dates and
// text end there (until, datesUntil; Soutine took the box's first dates).
const PRM_BOX=/^(?:Current|Upcoming|Past) Exhibitions$|^Mostre (?:in corso|future|passate)$/i;

// ── LINK VENUES ── Every venue Add by link files under, other than the swept ones in MUSEUMS:
// one entry each, holding what she decided about it, as a MUSEUMS entry does. What the app
// finds out (the venue's name, its shop, her confirmations) is kept in the page's store
// (venues/occasional) and this entry wins over it (occVenue). A venue with no entry here
// files under its own site, named by Claude when first met.
//   ownChip      a chip of its own, labelled `chip`, else `short`; without it, "Occasional"
//   group        venues sharing one chip (Munich)
//   short        her name for it; `card`: her name on its cards, where that differs
//   notCard      the card name Claude gave before she renamed it: her renames are Claude's examples
//   name         its full name; `lookupName`: the name the catalogue lookup searches with
//   sites        other sites its pages sit on, {host, path, line}: `path` a part of a shared
//                site, `line` the house line naming it on a site several houses share
//   linkRead     how its pages are read (as on a MUSEUMS entry)
//   shopHome, shopCatalogues, shopUnseen, shopQueries, shopNamed, rankAsOwn — its shop (below)
const LINK_VENUES={
  // The Tate library's records file under the Tate Claude names (ownMuseumNamed); the record's
  // summary sits under its own "Summary" heading, below the copies list and after a tab of that name.
  "occ-library-tate-org-uk":{linkRead:{from:/^Summary$/,fromLast:true}},
  // Galerie de la Présidence ends its show headings " : Exhibition".
  "occ-presidence-fr":{card:"Galerie de la Pr\u00e9sidence Paris",notCard:"Paris Pr\u00e9sidence",linkRead:{titleDrop:/\s*:\s*Exhibition$/i}},
  "occ-nga-gov":{ownChip:true,short:"NG Washington",lookupName:"NGA"},
  "occ-nationalgalleries-org":{ownChip:true,short:"NG Scotland"},
  // Mia's page titles end "–– Minneapolis Institute of Art".
  "occ-new-artsmia-org":{ownChip:true,short:"Mia",lookupName:"Mia",name:"Minneapolis Institute of Art",linkRead:{titleDrop:/\s+[-–—]+\s+Minneapolis Institute of Art$/i}},
  // rankAsOwn: other houses ranked as the venue's own in her order, display only (her decision:
  // Yale's two imprints rank the same).
  "occ-britishart-yale-edu":{ownChip:true,short:"Yale CBA",lookupName:"Yale Center for British Art",name:"Yale Center for British Art",rankAsOwn:["Yale University Press"]},
  // Munich's Alte Pinakothek, Pinakothek der Moderne and Sammlung Schack: three venues on one
  // site (pinakothek.de), one chip "Munich", the Alte first (her decision). The house line
  // between the show's title and its dates says which ("Pinakothek der Moderne | Art"); der
  // Moderne's own site prints "10/07/2026 - 04/10/2026" above the title, day first. The Alte
  // and der Moderne's shops are searched in German (`shopQueries`); CEDON sells for both, its
  // sections named for each house (`shopNamed`, namesVenue). Schack has no shop of its own and
  // no CEDON section: it gets no shop settings, so the finder answers "none". Titles typed in
  // capitals are recased (`capsTitles`).
  "occ-alte-pinakothek":{ownChip:true,short:"Munich Alte Pinakothek",chip:"Munich",group:"munich-pinakotheken",lookupName:"Alte Pinakothek",name:"Alte Pinakothek M\u00fcnchen",
    sites:[{host:"pinakothek.de",line:/^Alte Pinakothek\b/i}],
    shopQueries:["Alte Pinakothek M\u00fcnchen Museumsshop Kataloge"],shopNamed:"Alte Pinakothek",linkRead:{capsTitles:true}},
  "occ-pinakothek-der-moderne":{ownChip:true,short:"Munich der Moderne",chip:"Munich",group:"munich-pinakotheken",lookupName:"Pinakothek der Moderne",name:"Pinakothek der Moderne M\u00fcnchen",
    sites:[{host:"pinakothek.de",line:/^Pinakothek der Moderne\b/i},{host:"pinakothek-der-moderne.de"}],
    shopQueries:["Pinakothek der Moderne M\u00fcnchen Museumsshop Kataloge"],shopNamed:"Pinakothek der Moderne",linkRead:{capsTitles:true}},
  "occ-sammlung-schack":{ownChip:true,short:"Munich Sammlung Schack",chip:"Munich",group:"munich-pinakotheken",lookupName:"Sammlung Schack",name:"Sammlung Schack",
    sites:[{host:"pinakothek.de",line:/^Sammlung Schack\b/i}],linkRead:{capsTitles:true}},
  // Staatliche Museen zu Berlin (smb.museum): chip "Berlin" after KHM, cards "Berlin Gemäldegalerie" (her decision).
  // The Alte and Neue Nationalgalerie are venues under the chip too, cards "Berlin Alte NG" and "Berlin Neue NG"
  // (her decision): their pages sit under their own paths, or carry their house line just under the dates
  // (Böcklin, Wols); every other smb.museum page files under the Gemäldegalerie, as before (linkVenue).
  "occ-smb-museum":{ownChip:true,short:"Berlin",chip:"Berlin",group:"berlin",card:"Berlin Gem\u00e4ldegalerie",lookupName:"Gem\u00e4ldegalerie Berlin",name:"Staatliche Museen zu Berlin"},
  "occ-alte-nationalgalerie":{ownChip:true,short:"Berlin Alte NG",chip:"Berlin",group:"berlin",lookupName:"Alte Nationalgalerie Berlin",name:"Alte Nationalgalerie",
    sites:[{host:"smb.museum",path:/\/museums-institutions\/alte-nationalgalerie\//i},{host:"smb.museum",line:/^Alte Nationalgalerie$/i}]},
  "occ-neue-nationalgalerie":{ownChip:true,short:"Berlin Neue NG",chip:"Berlin",group:"berlin",lookupName:"Neue Nationalgalerie Berlin",name:"Neue Nationalgalerie",
    sites:[{host:"smb.museum",path:/\/museums-institutions\/neue-nationalgalerie\//i},{host:"smb.museum",line:/^Neue Nationalgalerie$/i}]},
  // Dresden's Gemäldegalerie Alte Meister: chip "Dresden", cards "Dresden Gemäldegalerie" (her
  // decision). Its pages open with a short "# " name above every SKD museum's menu; the show's
  // own heading follows "Active page:" (titleAfter). Dates day first with slashes; the site
  // line ("Exhibition Site Zwinger") never reaches Claude (her decision; skip).
  "occ-gemaeldegalerie-skd-museum":{ownChip:true,short:"Dresden",card:"Dresden Gem\u00e4ldegalerie",lookupName:"Gem\u00e4ldegalerie Alte Meister Dresden",name:"Gem\u00e4ldegalerie Alte Meister",
    linkRead:{titleAfter:/^Active page:/,skip:/^(?:Exhibition Site\b|Opening Hours\b|\[Translate to English:\]|\u00a9)/}},
  // The Städel (staedelmuseum.de): chip "Frankfurt" after Dresden, cards "Frankfurt Städel" (her decision).
  // Written in, her decision: its shop's books section (the finder cannot see its books), and
  // `shopUnseen` — its books are in the page's HTML but Parallel drops them, so a shop page
  // with no priced line reads "Parallel fault" (docs/add_by_link.md, "Frankfurt").
  "occ-staedelmuseum-de":{card:"St\u00e4del Frankfurt",ownChip:true,short:"Frankfurt",lookupName:"St\u00e4del Museum",name:"St\u00e4del Museum",
    shopHome:"https://liebieghaus.ticketfritz.de/",shopCatalogues:"https://liebieghaus.ticketfritz.de/Shop/Index/staedel-publikationen/43885",shopUnseen:"parallel"},
  // Written in, her decision: a shop drawn by script (its page's code holds no books, only a frame and a
  // script) gets its best section written in and `shopUnseen` "script": a lookup there reads "contents
  // cannot be seen — JS-rendering" and goes to the web (docs/add_by_link.md, "A shop drawn by script").
  "occ-kunstmuseumbasel-ch":{card:"Kunstmuseum Basel",notCard:"Basel Kunstmuseum",shopHome:"https://shop.kunstmuseumbasel.ch/en/",shopCatalogues:"https://shop.kunstmuseumbasel.ch/en/merchandise?category=Exhibition+Catalogues",shopUnseen:"script"},
  // The Prado: chip "Prado" right after KHM, cards "Prado Madrid" (her decision). Its dates are month first
  // (DATE_ORDER, dates.js).
  "occ-museodelprado-es":{ownChip:true,chip:"Prado",short:"Prado Madrid",name:"Museo Nacional del Prado"},
  // Chantilly (Musée Condé): chip "Chantilly" after Jacquemart; its cards keep the store's name (her decision).
  "occ-chateaudechantilly-fr":{ownChip:true,chip:"Chantilly"},
  // The Cini Foundation and its island's two houses: three venues, Claude's names, under one chip "Cini" after
  // Capodimonte (her decision).
  "occ-cini-it":{card:"Fondazione Cini",notCard:"Venice Cini",ownChip:true,chip:"Cini",group:"cini"},
  "occ-lestanzedelvetro-org":{ownChip:true,chip:"Cini",group:"cini"},
  "occ-lestanzedellafotografia-it":{card:"Stanze della Fotografia Venice",notCard:"Venice Stanze della Fotografia",ownChip:true,chip:"Cini",group:"cini"},
  // Moretti (her decision, Moretti only): the place after " : " leaves the title ("… : Monaco", "… : New York,
  // Sotheby's"); its description is typed in capitals (capsText); the cookie panel ends the passage.
  "occ-morettigallery-com":{linkRead:{titleDrop:/\s+:\s+[^:]+$/,capsText:true,until:/^Manage cookies$/}},
  // Łazienki (her decision, Łazienki only): its heading runs on into the show's opening paragraph; the
  // page title is the show's name and its section ("The Nabis. Prophets of a New Art - Events"): the name is the title.
  "occ-lazienki-krolewskie-pl":{card:"Royal \u0141azienki Warsaw",notCard:"Warsaw \u0141azienki",linkRead:{tabTitle:/\s+[-–—]\s+[^-–—]+$/}},
  // The Getty (her decision, Getty only): its collection database's exhibition pages are titled
  // "Museum Collection", so their heading is the show's name.
  "occ-getty-edu":{linkRead:{tabNotName:/^Museum Collection$/}},
  // The Correr's archive site (that site only): each show has several pages, its tab title the
  // page's own name ("Project", "Mostra"); the show's name is the heading after "Section menu" ("Menù di sezione").
  // Titles typed in capitals are recased (her decision), each part either side of a full stop.
  "occ-archivio-correr-visitmuve-it":{card:"Correr Venice",notCard:"Venice Correr",linkRead:{titleAfter:/^(?:Section menu|Men\u00f9 di sezione)$/,capsTitles:true,capsStops:true}},
  // Under "Occasional". Boston MFA prints the dates on the line above the show's title.
  "occ-mfa-org":{short:"Boston",card:"Boston MFA"},
  "occ-archive-worcesterart-org":{short:"Worcester"},
  // NGV writes two-digit years ("4 Sep 26 – 31 Jan 27").
  "occ-ngv-vic-gov-au":{card:"National Gallery Victoria",linkRead:{shortYear:true}},
  // Her name, not Claude's "KMSKA Antwerp" (notCard: Claude learns her style from it).
  "occ-kmska-be":{card:"Antwerp KMSKA",short:"Antwerp Fine Arts",notCard:"KMSKA Antwerp",name:"Koninklijk Museum voor Schone Kunsten Antwerpen"},
  // The Tuscan state museums' site names itself "Direzione regionale Musei nazionali Toscana";
  // its cards show "San Marco" and the lookup searches as "Museo di San Marco" (her decision).
  // Its pages are press releases: the title is the headline's first sentence, without "Mostra"
  // (exhibition) or the quotation marks round the name; capitals recased (her decision).
  "occ-museitoscana-cultura-gov-it":{card:"San Marco Florence",short:"San Marco",name:"Museo di San Marco",linkRead:{firstSentence:true,unquote:true,capsTitles:true}},
  // Genoa's page titles give no name, Milan's name the city council (her names, both written in).
  "occ-palazzoducale-genova-it":{short:"Palazzo Ducale Genova",name:"Palazzo Ducale Genova"},
  // Palazzo Reale Milano's pages also sit on the city council's site, saved by her because that
  // site refuses Parallel (docs/add_by_link.md, "Saved pages").
  "occ-palazzorealemilano-it":{short:"Palazzo Reale Milano",name:"Palazzo Reale Milano",
    sites:[{host:"www2.comune.milano.it",path:/^\/(?:en|it)\/web\/palazzo-reale-milano\//}],
    linkRead:{titleHeading:PRM_TAIL,titleDrop:PRM_TAIL,nameInLines:true,until:PRM_BOX,datesUntil:PRM_BOX,capsTitles:true,asOfTo:true}},
  // Her names for venues Claude named (her review of link venues); notCard is the name Claude gave.
  "occ-centrepompidou-fr":{card:"Centre Pompidou",notCard:"Pompidou Paris"},
  "occ-esmh-de":{card:"Emil Schumacher Hagen",notCard:"Hagen Emil Schumacher"},
  "occ-musees-nationaux-alpesmaritimes-fr":{card:"Chagall Museum Nice",notCard:"Nice Chagall"},
  "occ-museoreinasofia-es":{card:"Reina Sof\u00eda Madrid",notCard:"Madrid Reina Sof\u00eda"},
  "occ-museumhetvalkhof-nl":{card:"Valkhof Nijmegen",notCard:"Nijmegen Valkhof"},
  "occ-rct-uk":{card:"Queen's Gallery Edinburgh",notCard:"The Queen\u2019s Gallery, Palace of Holyroodhouse"},
  "occ-wallach-columbia-edu":{card:"Wallach Gallery Columbia",notCard:"Columbia Wallach"},
  // Christie's press site is the same venue as christies.com (her decision; links from now on, rows already in left as they are).
  "occ-christies-com":{sites:[{host:"press.christies.com"}]},
};
const linkEntry=id=>Object.prototype.hasOwnProperty.call(LINK_VENUES,id)?LINK_VENUES[id]:null;
const ownChip=id=>!!(linkEntry(id)||{}).ownChip;
// The chip a venue's cards sit under: its group's, where it has one.
const chipKey=id=>(linkEntry(id)||{}).group||id;
// "4 Sep 26" → "4 Sep 2026": a two-digit year after a day and month, for a venue with shortYear.
function withLongYears(l){
  return String(l).replace(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?)\s+(\d{2})(?![\d:])/gi,"$1 20$2");
}

// Every address in whatever she pasted — commas, spaces, lines, or mixed in
// with other words, tracking tags dropped. A repeat is read once (same finished address).
function linksIn(text){
  const out=[],seen=new Set();
  for(const m of String(text||"").matchAll(/https?:\/\/[^\s,;<>"'\]\[]+/gi)){
    const u=withoutTracking(m[0].replace(/[.,;:!?)\]]+$/,""));
    const k=normalizeUrlKey(u);
    if(!k||seen.has(k))continue;
    seen.add(k); out.push(u);
  }
  return out;
}

// Tracking tags a link picks up on the way (?utm_source=chatgpt.com) say nothing about the page.
const TRACKING_PARAM=/^(?:utm_\w+|fbclid|gclid|msclkid|mc_cid|mc_eid)$/i;
function withoutTracking(u){
  try{
    const x=new URL(u);
    for(const k of [...x.searchParams.keys()])if(TRACKING_PARAM.test(k))x.searchParams.delete(k);
    if(!x.search.replace(/^\?/,""))x.search="";
    return x.toString();
  }catch{ return u; }
}
function hostOf(u){ try{ return new URL(u).hostname.toLowerCase(); }catch{ return ""; } }
// A Wayback Machine copy files under the museum it copied: the original address is
// the venue's site; the copy is still what is read and linked (Sargent and the Sea, RA).
function siteUrlOf(u){
  const m=/^https?:\/\/web\.archive\.org\/web\/\d{1,14}[a-z_]*\/(.+)$/i.exec(String(u||"").trim());
  if(!m)return u;
  const orig=/^https?:\/\//i.test(m[1])?m[1]:"http://"+m[1];
  try{ new URL(orig); return orig; }catch{ return u; }
}
function originOf(u){ try{ return new URL(u).origin+"/"; }catch{ return ""; } }
// A link she typed or pasted, "https://" added when left off; null when it is not a web address.
function typedLink(text){
  const t=String(text||"").trim(); if(!t)return null;
  let u=null; try{ u=new URL(/^https?:\/\//i.test(t)?t:"https://"+t); }catch{}
  return u&&/^https?:$/.test(u.protocol)&&u.hostname.includes(".")?u.href:null;
}
// Accents dropped, and the letters that are not accented ones folded too: ø, æ, œ, ß, ł,
// đ, ð, þ and dotless ı ("Hammershøi" matches "Hammershoi"). One fold for all matching.
const LETTER_FOLD={"\u00f8":"o","\u00e6":"ae","\u0153":"oe","\u00df":"ss","\u0142":"l","\u0111":"d","\u00f0":"d","\u00fe":"th","\u0131":"i"};
const foldText=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\u00f8\u00e6\u0153\u00df\u0142\u0111\u00f0\u00fe\u0131]/g,c=>LETTER_FOLD[c]);

// The connector hands back the page as markdown. One line of it, as words.
function stripMd(line){
  return String(line||"")
    .replace(/!\[[^\]]*\]\([^)]*\)/g,"")             // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g,"$1")          // links → their words
    .replace(/<https?:[^>]*>/g,"")
    .replace(/\*\*|__/g,"")
    .replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g,"$1$2") // _italic_
    .replace(/\\([-*_#.()\[\]|])/g,"$1")              // markdown escapes
    .replace(/^\s*(?:#{1,6}\s+)+/,"")           // "# #### Special Loan:" (Frick)
    .replace(/^\s*[*+]\s+/,"")
    .replace(/\s+/g," ")
    .trim();
}

// "Hammershøi. The Eye that Listens | Museo Nacional Thyssen-Bornemisza".
// A bar always parts the show from the site. A dash only when the words after
// it are the site's own (Courtauld) — Mauritshuis titles a show "The Grand
// Tour - Destination Italy", and that dash belongs to the title.
function splitPageTitle(t,host){
  // HTML codes in a page title are decoded ("Chagall&#039;s", Mia).
  // A separator with no site after it is dropped ("Van Dyck, the European -", Genoa).
  let s=decodeEntities(stripMd(t)).replace(/\s+(?:[-–—|]\s*)+$/,"");
  if(!s)return{show:"",site:""};
  // A dash-led tail naming the site ("… – Enfilade"; "… - KHM.at", picked-shows R1).
  let site="";
  const m=s.match(/^(.*\S)\s+[-–—]\s+([^-–—|]+)$/);
  if(m){
    const h=foldText(host);
    const flat=x=>foldText(x).replace(/[^a-z0-9]/g,"");
    const bare=h.replace(/^www\./,"");
    if(foldText(m[2]).split(/[^a-z0-9]+/).some(w=>w.length>=4&&h.includes(w))||flat(m[2])===flat(bare)||flat(m[2])===flat(bare.split(".")[0])){ s=m[1].trim(); site=m[2].trim(); }
  }
  // Several bars: the show is named first, the site last ("Venice: Canaletto and
  // His Rivals | Past exhibitions | National Gallery"). A blog's label before the show
  // ("Exhibition | Canaletto and the Art of Venice | Enfilade") is not its name. AL-050.
  let parts=s.split(" | ").map(x=>x.trim()).filter(Boolean);
  while(parts.length>1&&TITLE_LABEL.test(parts[0]))parts=parts.slice(1);
  // The site can come first ("Nationalmuseum | Fantasy and Reality – …"): the part named for the site is the site.
  const namesSite=x=>{ const h=foldText(host); return foldText(x).split(/[^a-z0-9]+/).some(w=>w.length>=4&&h.includes(w)); };
  if(parts.length>1&&!site&&namesSite(parts[0])&&!namesSite(parts[parts.length-1]))return{show:parts[parts.length-1],site:parts[0]};
  if(parts.length>1&&!site)return{show:parts[0],site:parts[parts.length-1]};
  return{show:parts[0]||s,site};
}
const TITLE_LABEL=/^(?:exhibitions?|mostra|ausstellung|exposition|exposición|tentoonstelling)$/i;
// Words too general to name a show.
const GENERIC_TITLE_WORDS=new Set(["exhibition","exhibitions","mostra","ausstellung","exposition","tentoonstelling","the","a","an","and","of"]);

// The scraper's 2,000-character description cut (her decision). Read from under the
// show's heading, skipping the date line: some venues print the dates at the foot of
// the page (Jacquemart-André).
const LINK_RAW_CHARS=2000;
const LINK_DATE_LINES=60;
// A date line longer than this is a paragraph that carries the dates; it stays in the passage.
const LINK_DATE_LINE_MAX=150;
// How many lines past a one-sided date the reader looks for a full range.
const LINK_HALF_LOOK=6;

// HTML character codes in page text, named (the HTML 4 set) and numeric: "&ecirc;" → "ê".
const HTML_ENTITIES=(()=>{
  const e={quot:'"',amp:"&",lt:"<",gt:">",apos:"'",OElig:"\u0152",oelig:"\u0153",Scaron:"\u0160",scaron:"\u0161",Yuml:"\u0178",
    circ:"\u02c6",tilde:"\u02dc",ensp:" ",emsp:" ",thinsp:" ",zwnj:"",zwj:"",lrm:"",rlm:"",ndash:"\u2013",mdash:"\u2014",
    lsquo:"\u2018",rsquo:"\u2019",sbquo:"\u201a",ldquo:"\u201c",rdquo:"\u201d",bdquo:"\u201e",dagger:"\u2020",Dagger:"\u2021",
    bull:"\u2022",hellip:"\u2026",permil:"\u2030",prime:"\u2032",Prime:"\u2033",lsaquo:"\u2039",rsaquo:"\u203a",oline:"\u203e",
    frasl:"\u2044",euro:"\u20ac",trade:"\u2122",larr:"\u2190",uarr:"\u2191",rarr:"\u2192",darr:"\u2193",harr:"\u2194",
    minus:"\u2212",lowast:"\u2217",ne:"\u2260",le:"\u2264",ge:"\u2265",infin:"\u221e"};
  ("nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest "
   +"Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig "
   +"agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml")
    .split(" ").forEach((n,i)=>{ e[n]=String.fromCharCode(160+i); });
  e.nbsp=" "; e.shy="";
  return e;
})();
function decodeEntities(t){
  const cp=n=>{ try{ return n>0&&n<=0x10ffff?String.fromCodePoint(n):null; }catch{ return null; } };
  return String(t||"").replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z][A-Za-z0-9]{1,8}));/g,(x,d,h,n)=>{
    if(n)return Object.prototype.hasOwnProperty.call(HTML_ENTITIES,n)?HTML_ENTITIES[n]:x;
    const c=cp(d?+d:parseInt(h,16));
    return c===null?x:c;
  });
}

// THE PASSAGE'S SHARED RULES. What the scraper drops by the page's structure (ticket boxes, captions,
// related shows) a text reader drops by its words. A sentence holding one of the scraper's own
// boilerplate phrases goes (BOILERPLATE, shared). A short line that is the page's furniture — a
// ticket or visit label, a price, a floor, a photo credit — goes. The passage ends where the page
// turns to other shows or the newsletter. Rules and cases: docs/add_by_link.md, "The passage".
const PASSAGE_END=/^(?:related(?: [a-z]+)?|you (?:may|might) also like|more exhibitions|other exhibitions|upcoming exhibitions|current exhibitions|past exhibitions|stay connected!?|follow us|subscribe to (?:our|the) newsletter|sign up for (?:our|the) e?-?newsletter.*)$/i;
const PASSAGE_END_AFTER=300;
const FURNITURE=/^(?:(?:buy|book|get) )?tickets?(?: (?:now|online|here|prices|required|programme))?\.?$|^(?:book|buy) now$|^(?:admission|admission prices|prices|general admission(?: pricing)?:?|opening hours.*|accessibility|audio (?:guide|tour)|share|plan your visit|getting here|location:? .*|become a member(?: today)?|free for members|free with museum admission|sponsored by|supported by|programme|show photos.*|image gallery.*|more info(?:rmation)?|read more|see more|scroll(?:en)?|ready to visit\?|now on view|this is a past exhibition\.?|jump to|partners and sponsors|exhibition resources|parking .*|drop off .*|email your questions.*)$/i;
// A picture's caption: a short line naming a work and ending on its year, no sentence ("Anna Atkins,
// cyanotopi, 1843", Louisiana). An artist and a work in a caption read like the show's own (her concern).
const CAPTION=/^[^.!?]{3,120},\s*(?:c\.\s*|ca\.\s*)?\d{4}(?:\s*[–-]\s*\d{2,4})?(?:\s*\(detail\))?\s*\.?$/i;
function isFurniture(t){
  if(!t||t.length>90)return false;
  return FURNITURE.test(t)||/(?:[$€£]|\b(?:chf|eur|usd|gbp|sek|dkk)\b)\s?\d/i.test(t)&&!/[a-z]{4,}\s+[a-z]{4,}\s+[a-z]{4,}/i.test(t.replace(/\b(?:adults?|concessions?|members?|students?|children|free|tickets?|incl|collection|exhibitions?|small)\b/gi,""))
    ||/\b(?:floor|level)\s+-?\d/i.test(t)||/\bphoto:/i.test(t)||CAPTION.test(t);
}
function withoutBoilerplate(t){
  const bad=x=>{ const low=x.toLowerCase(); return BOILERPLATE.some(b=>low.includes(b))||LINK_JUNK.some(r=>r.test(low)); };
  const parts=sentencesOf(t);
  if(!parts.some(bad))return t;
  return parts.filter(x=>!bad(x)).join(" ").trim();
}
// A paragraph's sentences. A full stop after an initial or a short abbreviation ("Margot and
// Jeremiah M. Bogert", "David L. Klein, Jr. Foundation", "c. 1664") does not end one: splitting
// there left a funder list's tail behind its dropped "support is provided by" (Frick).
const NOT_A_STOP=/(?:^|[\s(])(?:\p{L}|Mr|Mrs|Ms|Dr|St|Jr|Sr|Inc|Ltd|Co|ca|cf|vol|nos?|pp?|fig|approx|eds?|inv|op)\.$/iu;
function sentencesOf(t){
  const s=String(t||""),out=[],re=/[.!?…]["”’»)\]]*\s+(?=["“‘«(\[]?[\p{Lu}\d])/gu;
  let start=0,m;
  while((m=re.exec(s))){ if(NOT_A_STOP.test(s.slice(start,m.index+1)))continue; out.push(s.slice(start,m.index+m[0].length).trim()); start=m.index+m[0].length; }
  out.push(s.slice(start).trim());
  return out.filter(Boolean);
}
// A paragraph reads as prose: eight words or more, and a sentence that ends. A label, a name, a
// logo, an address, opening hours or a caption with no sentence is not one.
function isProse(t){
  const s=String(t||"").trim();
  return s.split(/\s+/).length>=8&&(sentencesOf(s).length>1||/[.!?…]["”’»)\]]*$/.test(s)&&!NOT_A_STOP.test(s));
}
// Sentences whole-page text carries that the scraper drops by the page's structure: funders,
// tickets, members' offers, opening times, visitor and access notes, links' own words, cookie and
// newsletter notices, credits. Matched on the lower-cased sentence. Cases: docs/add_by_link.md, "The passage".
const LINK_JUNK=[
  /\bmade possible\b/,/\bsponsor\w*/,/^(?:\S+\s+){0,6}(?:is|are|was|were)\s+(?:generously\s+|kindly\s+)?supported by\b/,/^supported by\b/,
  /\bwith (?:the )?(?:generous |kind |additional )?support (?:of|from)\b/,/\b(?:leadership|major|additional|principal|generous) (?:support|supporters?)\b/,
  /\bfor (?:their|its|his|her) (?:generous )?support\b/,/\bwith thanks to\b/,/\bindemnity\b/,
  /\btickets?\b/,/\bfree admission\b|\badmission (?:free|prices?|tickets?)\b|\byour admission\b|\badmission to the exhibition\b|\bgeneral admission\b/,
  /\bmembers? (?:go|visit|can|enjoy|receive|get|only|preview|mornings?|events?)\b|\bfor members\b|\bmembership\b|\bjoin (?:as a member|today|now)\b/,
  /\b\d{1,2}(?:[.:]\d{2})?\s?(?:am|pm|a\.m\.|p\.m\.)(?![a-z])/,/\bopen (?:daily|from|until|on|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\bopening (?:hours|times)\b|\blast (?:admission|entry|entrance)\b/,
  /\bwe look forward to welcoming\b/,/\bplease note\b/,/\bvirtual queue\b|\bwait times\b/,/\bthe age of \d/,
  /\belevators?\b|\bwheelchairs?\b|\bstep-free\b|\blarge[- ]print\b|\bseating is provided\b|\bwelcome cart\b|\baccessible (?:audio|toilets?|entrances?)\b/,
  /\baudio ?(?:tours?|guides?)\b|\baudioguides?\b/,
  /\bclick here\b|\bselect to view\b|\blightbox\b|\bopens in a new\b|\bfind out more\b|\bread more\b|\bdownload (?:the|our|a|large)\b|\bshare your feedback\b/,
  /\bcookies?\b|\bconsent\b|\bdata protection\b|\bprivacy (?:notice|statement|policy)\b|\bexternal provider\b|\bunsubscribe\b|\breceive updates\b|\bin your inbox\b|\bnewsletter\b|\bsign up\b/,
  /[\w.-]+@[\w-]+\.[a-z]/,/\bphone:|\btel\.?:|\btoll free\b/,/\bcourtesy\b/,/^credits?:/,/\blicensed by\b/,/\bphoto(?:graph)? by\b|\bphoto:/,/\bcopyright\b/,
  /\bramp\b|\blearn more\b|\bon floor -?\d|\bvisit page\b|\bplease be aware\b|\bsubject to change\b|\badmit(?:tance)?\b|\bstaff will be available\b|\baccessing the (?:gallery|museum|building)\b/,
  /\blogo\b|\byoutube\b|\bvimeo\b|\byour browser\b|\bunder the (?:patronage|auspices)\b|\bpatrocinio\b|\bcontribution from\b|\bchance to win\b/,
  /\btarif\b|\b\d+(?:[.,]\d+)?\s?(?:euros?|€)(?![\w])|[£$€]\s?\d|\b(?:chf|eur|usd|gbp|sek|dkk|nok)\s?\d|\bconcessions?\b|\breduced (?:rate|price)\b|\bdiscounts?\b|\bmember benefits\b/,
  /\byour inbox\b|\byour (?:generosity|donation|gift)\b|\bsubscription\b|\byour \w+ account\b|\bweb ?page\b|\bhow to get to\b|\bview details\b|\bunderwritten\b/,
  /\b\d{1,2}[.:]\d{2}\s?[-–]\s?\d{1,2}[.:]\d{2}\b|\bmore information\b|\bour \w+ page\b|\bshare your\b/,
  /\banalytics\b|\bpersonal (?:information|data)\b/,
  /\btraditional owners\b|\bwe acknowledge\b|\bgroup visits?\b|\bprivate tours?\b|\bexclusive tours?\b|\btime slots?\b|\bprior registration\b|\byour group\b/,/\b(?:view|see|click|explore|find)\b.*\bhere\s*\.?$/
];
// A paragraph that is a picture's caption or description, not the show's own text: "(detail)", a
// work's size, a credit line ("Gift of …", "Bequest of …") with a year, a work in its medium with a
// year and no verb, a description of a picture ("Charcoal drawing of landscape with …"), or a name
// then a title in one short verbless sentence ("Johan Tobias Sergel, Self portrait …").
const CAPTION_VERB=/\b(?:is|are|was|were|has|have|had|will|would|can|could|became|becomes|brings?|presents?|explores?|shows?|features?|offers?|celebrates?|examines?|traces?|reveals?|includes?|focuses|invites?|highlights?|tells?|returns?|marks?|opens?)\b/i;
const CAPTION_MEDIUM=/\b(?:oil|tempera|acrylic|gouache|watercolou?r|pastel|charcoal|graphite|ink|chalk)\s+(?:on|and)\b|\bon (?:canvas|panel|paper|board|wood|copper|linen|vellum)\b|\b(?:etching|engraving|lithograph|woodcut|aquatint|gelatin silver|albumen print|bronze|marble|terracotta)\b/i;
const CAPTION_SIZE=/\d+(?:[.,]\d+)?(?:\s+\d\/\d)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s+\d\/\d)?\s*(?:cm|mm|in)\b/i;
const CAPTION_CREDIT=/\b(?:gift of|bequest of|museum purchase|purchased (?:with|from)|accession|museum no\.)/i;
const PICTURE_OF=/^(?:(?:an?|the|een|ein|eine|un|une|uno|una)\s+)?(?:[\p{L}'’-]+\s+){0,5}(?:painting|drawing|photograph|photo|print|etching|engraving|portrait|portret|sculpture|image|poster|close[- ]up|relief|tapestry|schilderij|gemälde|ritratto|dipinto|tableau)(?:\s+(?:of|van|von|de|di)\b|:)|^(?:affiche|plakat|locandina|cartel)\b/iu;
// A work named then described as a picture: "Guido Cagnacci's The Death of Cleopatra, a painting of a topless woman …" (Cincinnati).
const WORK_THEN_PICTURE=/^[^.]{3,120},\s+an?\s+(?:[\p{L}-]+\s+){0,5}(?:painting|drawing|etching|engraving|photograph|print|sculpture|tapestry)\s+of\b/iu;
function isCaption(t){
  const s=String(t||"").trim(), year=/\b1[0-9]{3}\b|\b20[0-9]{2}\b/.test(s), first=sentencesOf(s)[0]||s;
  const big=s.split(/\s+/).filter(w=>/^\p{L}{4,}/u.test(w)), caps=big.filter(w=>/^\p{Lu}/u.test(w)).length;
  // "detail" marks a caption only outside a long paragraph of prose ("purged of descriptive detail, geometric…", MoMA's Matisse).
  const prose=s.split(/\s+/).length>=40&&CAPTION_VERB.test(s);
  return !prose&&/\(detail\)|^detail\b|\bdetail,|\bdetail of\b/i.test(s)||WORK_THEN_PICTURE.test(s)||big.length>=3&&s.split(/\s+/).length<=15&&caps/big.length>=0.75&&!CAPTION_VERB.test(s)||CAPTION_SIZE.test(s)||CAPTION_CREDIT.test(s)&&year||CAPTION.test(first.replace(/\.$/,""))
    ||CAPTION_MEDIUM.test(s)&&year&&!CAPTION_VERB.test(s)||PICTURE_OF.test(s)&&!/\b(?:is|are|was|were|has|have|had|will|would|can|could)\b/i.test(s)
    ||/^(?:\p{Lu}[\p{L}.'’-]*\s+){0,3}\p{Lu}[\p{L}.'’-]*,\s/u.test(s)&&sentencesOf(s).length===1&&s.split(/\s+/).length<=14&&!CAPTION_VERB.test(s);
}
// A heading that turns from the show to other matter ends the passage once the show's own text is in:
// other shows, events, the shop, the press and reviews, the newsletter, sharing, the footer. An online feature's
// section is passed over to the next heading (Rijksmuseum's "Online special", narrated by Joanna Lumley, between
// its introduction and its show). A box's heading
// (tickets, visiting, supporters, curators, films, pictures, the catalogue) ends it only once a fair
// part of the show's text is in (LINK_BOX_AFTER): below a short introduction the show's text can carry on
// under a box with no heading of its own (Kunsthaus); below the text, what follows is the page's programme
// (Alte Pinakothek's tours and participation project).
const LINK_BOX=/^(?:tickets?|ticket|admission|prices|pricing|(?:opening |museum )?hours|opening times|visit|visitor|visiting|plan your visit|getting here|directions|address|location|access|accessib|membership|members?\b|become a member|curators?|credits|support|supported|sponsor|partners|media partners|in (?:cooperation|collaboration|partnership) with|with (?:generous |additional )?support|exhibition (?:film|guide|catalogue|supporters)|film|videos?|trailer|audio|(?:guided )?tours|führungen|publication|catalogue|images|impressions|(?:photo |image )?gallery|(?:exhibition |key )?highlights|selected works|installation|featured|downloads?|resources|large print)/i;
const LINK_BOX_AFTER=600;
const ONLINE_FEATURE=/^online (?:special|tour|exhibition|feature)/i;
const OTHER_MATTER=/^(?:related|you (?:may|might) also|(?:see )?(?:more|other|further|upcoming|current|past|all) exhibitions|(?:exhibition |related |upcoming )?(?:events?|programmes?|programs?)$|(?:museum )?shop\b|newsletter|sign up|stay (?:in touch|connected)|follow|connect with|share\b|footer|(?:selected )?press\b|reviews?$|what’s on|explore more|discover more|privacy|manage consent|[\w ]*cookies)/i;

// A venue's own link options (its MUSEUMS entry's `linkRead`). Cases: docs/add_by_link.md,
// "Venue link rules".
// The title as the card shows it: a venue with capsTitles recases each part typed in capitals; any
// title typed wholly in capitals is recased (Scuderie "PONTORMO", Albertina "PICASSO – BACON"),
// unless it is one short word (an artist's acronym, "KAWS").
function cardTitle(t,vc){
  // A swept venue's title as the sweep writes it (Borghese's em dash; her decision: the sweep's rules).
  const swept=DATES.sweptVenueTitle(vc,t);
  if(swept!==t)return swept;
  const lo=linkOptions(vc)||{};
  // A venue whose name and subtitle are parted by a full stop (capsStops; the Correr's archive) recases each part.
  if(lo.capsTitles&&lo.capsStops)return String(t||"").split(/(\.\s+)/).map((p,i)=>i%2?p:DATES.capsTitleParts(p)).join("");
  if(lo.capsTitles)return DATES.capsTitleParts(t);
  const s=String(t||"");
  if(/\p{Ll}/u.test(s)||!/\p{Lu}/u.test(s))return s;
  const words=s.split(/[^\p{L}]+/u).filter(w=>w.length>=3);
  return words.length>=2||words.some(w=>w.length>=6)?DATES.capsTitleParts(s):s;
}
function linkOptions(vc){ return (vc&&MU[vc]&&MU[vc].linkRead)||(linkEntry(vc)||{}).linkRead||null; }
function joinTitle(name,sub,dashAfterColon){
  if(/[:.!?]\s*$/.test(name))return name+" "+sub;
  return name+(dashAfterColon&&name.includes(":")?" – ":": ")+sub;
}

// Why a link came back with no page. Parallel answering 202 ("accepted", no page sent) for a page the
// site serves to anyone (the Borghese's archive site) is Parallel's fault, said as the shop's line says it.
function pageUnreadWhy(e){
  if(e&&e.http_status_code===202)return "The page contents cannot be seen \u2014 Parallel fault. Import the full saved page.";
  return e?"The museum refused the page ("+String(e.http_status_code||e.error_type||"no reason given")+").":"The page came back empty.";
}

// ── THE SHOW PAGE READER ── Where the sweep has met a case and she has decided it, this reader follows the
// sweep's rule, shared code where it can be (dates.js) — never a rule of its own (her decision).
// One engine in steps, as the scraper's: each step reads and writes `pg`,
// the page being read, and a venue's own options (`pg.lr`, its linkRead) sit in the step they change.
// Rules and the case behind each: docs/add_by_link.md, "The general reader". `rules`, when given,
// collects the name of every rule that changed this page's result: the proof list keeps a page only
// for a rule no other page at its venue shows (docs/testing.md). The app passes none.
// One page → {ok, base, between, under, afterDates, start, end, raw, site, link, noDates, shown, shownWhy, dateLine, dateNote} or {ok:false, why}.
// A link's page whose dates a script draws after loading (her wording); and the sign of it, a template
// placeholder the script never filled ("{{daysLeft(exhibition.end)}}").
const SCRIPT_DATES_NOTE="Dates cannot be seen \u2014 JS-rendering.";
const SCRIPT_PLACEHOLDER=/\{\{[^{}\n]{1,80}\}\}/;
function readShowPage(res,url,vc,rules){
  const pg=pageToRead(res,url,vc,rules);
  if(pg.fail)return pg.fail;
  joinHeadingOverTwoLines(pg);
  showFromCrumb(pg);
  titleCandidates(pg);
  if(!pg.cands.length){ pg.rule("fail:no-title"); return{ok:false,why:"Couldn’t find the show’s title on the page."}; }
  const fail=findDates(pg);
  if(fail)return fail;
  settleName(pg);
  finishName(pg);
  offerSubtitleLines(pg);
  takePassage(pg);
  return pageResult(pg);
}

// Step 1. The page's lines, its page title split into show and site, and the venue's date rewrites.
function pageToRead(res,url,vc,rules){
  const rule=t=>{ if(rules&&!rules.includes(t))rules.push(t); };
  const lr=linkOptions(vc);
  const text=String(oneText(res)||"");
  if(text.trim().length<SHELL_CHARS){ rule("fail:empty"); return{fail:{ok:false,why:"The page came back empty."}}; }
  // A bot check in place of the page (the sweep's own test, shared): never read as a show.
  const head=(text.match(/^\s*#\s+(.+)$/m)||[])[1];
  if(CHALLENGE_TITLE.test(String(res&&res.title||""))||CHALLENGE_TITLE.test(stripMd(head))){ rule("fail:bot-check"); return{fail:{ok:false,why:BOT_CHECK_SAID.charAt(0).toUpperCase()+BOT_CHECK_SAID.slice(1)+"."}}; }
  const host=hostOf(siteUrlOf(url));
  let{show,site}=splitPageTitle(res&&res.title,host);
  // A venue whose page title on some pages is a section's name, never the show's (linkRead.tabNotName;
  // Getty's collection pages, "Museum Collection | Museum Collection | Getty"): the heading names the show.
  if(lr&&lr.tabNotName&&lr.tabNotName.test(show)){ show=""; rule("tabNotName"); }
  if(site)rule(String(res.title).includes(" | ")?"tab:bars":"tab:site-after-dash");
  if(TITLE_LABEL.test(decodeEntities(stripMd(res&&res.title)).split(" | ")[0].trim()))rule("tab:label");
  // A venue's own date forms rewritten before reading: two-digit years (shortYear, NGV), "as of" for
  // "to" (asOfTo, Palazzo Reale Milano).
  const dateText=l=>lr&&lr.shortYear?withLongYears(l):lr&&lr.asOfTo?String(l).replace(/\s+as of\s+/gi," to "):l;
  // The venue an all-number date's order is looked up under (DATE_ORDER, dates.js): its own site's,
  // whether or not it has an entry here.
  const dateVenue=vc||occVenueId(hostOf(siteUrlOf(url)));
  // A venue that types a space before a comma (linkRead.spaceBeforeComma; MoMA's "Toyo Ito , SANAA"): dropped, so its
  // heading matches the tab title and wins over the title repeated in its events list.
  const lines=text.split("\n").map(l=>lr&&lr.spaceBeforeComma?l.replace(/(\S) +,/g,"$1,"):l);
  return{res,url,vc,rules,rule,lr,host,show,site,lines,dateText,dateVenue,broken:-1,after:-1,
    words:l=>foldText(stripMd(l)).replace(/[^a-z0-9]+/g," ").trim(),
    // A show page's own date line: page text, so no loose single dates.
    rangeIn:l=>DATES.findDateRange(dateText(l),{looseSingles:false,slashes:true,venue:dateVenue})};
}

// Step 2. A heading broken over two lines (Berlin: "## Donatello  " then "Inventor of the
// Renaissance") is one heading, the page's own name for the show: the tab title's mark
// joins its parts when the tab title reads the same, else the scraper's join. Berlin's
// tab titles can be misspelt or German, so the heading wins over them. A date line is
// never the heading's second half (Munich: "### Alte Pinakothek" over the dates).
function joinHeadingOverTwoLines(pg){
  const{lines,show,rule,dateVenue}=pg;
  for(let i=0;i+1<lines.length;i++){
    const hm=lines[i].match(/^(\s*#{1,6}\s+)(\S.*?)\s{2,}$/);
    const next=stripMd(lines[i+1]);
    if(!hm||!next||/^\s*#/.test(lines[i+1]))continue;
    const nd=DATES.findDateRange(next,{looseSingles:false,venue:dateVenue});
    if(nd.start||nd.end){ rule("heading:date-line-not-joined"); continue; }
    const name=stripMd(hm[2]),lo=String(show||"").toLowerCase();
    const sep=lo.startsWith(name.toLowerCase())&&lo.endsWith(next.toLowerCase())?show.slice(name.length,show.length-next.length):"";
    lines[i]=hm[1]+(sep&&sep.length<=3?name+sep+next:joinTitle(name,next,true));
    lines[i+1]="";
    pg.broken=i;
    rule(sep&&sep.length<=3?"heading:two-lines-tab-mark":"heading:two-lines");
    break;
  }
}

// Step 3. A page title the page never prints can be a sentence (Cincinnati, Cagnacci: "Guido
// Cagnacci’s Death of Cleopatra will be the centerpiece…"): the breadcrumb's last step
// names the show instead (linkRead.crumb).
function showFromCrumb(pg){
  const{lr,lines,show}=pg;
  if(!(lr&&lr.crumb&&!(show&&lines.some(l=>foldText(stripMd(l)).includes(foldText(show))))))return;
  const crumb=lines.map(stripMd).find(l=>/^\s*Home\s*»/.test(l));
  const last=crumb?crumb.split("»").pop().trim():"";
  if(last){ pg.show=last; pg.rule("crumb"); }
}

// Step 4. Candidate title lines, in order; the title is the first with dates under it.
function titleCandidates(pg){
  const{lr,lines,show,words}=pg;
  const cands=[],candRule=[];
  const add=(i,t)=>{ if(i>=0&&!cands.includes(i)){ cands.push(i); candRule.push(t); } };
  // A venue whose show heading follows a marker line (linkRead.titleAfter; Dresden's
  // "Active page:"): that heading is tried first and is the title.
  if(lr&&lr.titleAfter){
    const m=lines.findIndex(l=>lr.titleAfter.test(stripMd(l)));
    if(m>=0)pg.after=lines.findIndex((l,k)=>k>m&&/^\s*#{1,6}\s+\S/.test(l));
    add(pg.after,"titleAfter");
  }
  // A venue whose show heading carries a mark of its own (linkRead.titleHeading) tries it first.
  if(lr&&lr.titleHeading)add(lines.findIndex(l=>/^\s*#{1,6}\s+\S/.test(l)&&lr.titleHeading.test(stripMd(l).trim())),"titleHeading");
  add(lines.findIndex(l=>/^\s*#\s+\S/.test(l)),"h1");
  add(pg.broken,"two-lines");
  if(show){
    const fs=foldText(show);
    add(lines.findIndex(l=>/^\s*#{2,3}\s+\S/.test(l)&&foldText(stripMd(l)).includes(fs)),"h2-h3-holds-tab");
    const piece=" "+words(show)+" ";
    // A "##"/"###" heading that is part of the tab ("## Brancusi" in "Brancusi at the Neue Nationalgalerie").
    add(lines.findIndex(l=>/^\s*#{2,3}\s+\S/.test(l)&&words(l)&&piece.includes(" "+words(l)+" ")),"h2-h3-inside-tab");
    add(lines.findIndex(l=>foldText(stripMd(l)).includes(fs)),"line-holds-tab");
    add(lines.findIndex(l=>{ const w=words(l); return w.split(" ").length>=2&&w.length<=80&&piece.includes(" "+w+" "); }),"line-inside-tab");
  }
  pg.cands=cands; pg.candRule=candRule;
}

// Step 5. The dates: under a title line, else just above it, else none — what the page shows kept for the note.
// Sets the title line `h`, the date line `d`…`dEnd` and the range; returns a failure, or null.
// The names of the venue a page is read for, and of the houses sharing its site, and the site the tab
// title names: a line that is only one of these is never the show's title unless its dates sit under
// it (her decision; Brancusi's "Neue Nationalgalerie" line under the dates).
function venueNamesFor(pg){
  const{vc,host,site,words}=pg;
  const h=String(host||"").replace(/^www\./,"");
  const houses=Object.entries(LINK_VENUES).filter(([id,v])=>id===vc||(v.sites||[]).some(x=>x.host===h)).map(([,v])=>v);
  const names=[site,...[MU[vc]||{},...houses].flatMap(v=>[v.name,v.short,v.card,v.lookupName])];
  return new Set(names.filter(Boolean).map(words).filter(Boolean));
}
function findDates(pg){
  const{lr,lines,rule,rangeIn,dateText,dateVenue,cands,candRule}=pg;
  const venueNames=venueNamesFor(pg), nameOnly=i=>venueNames.has(pg.words(lines[i]));
  const datesAboveFor=(h,n,via)=>{
    for(let k=h-1,seen=0;k>=0&&seen<n;k--){
      const l=stripMd(lines[k]); if(!l)continue; seen++;
      const r=rangeIn(l);
      if(r.start||r.end)return{d:k,range:r,via};
    }
    return null;
  };
  const datesUnder=h=>{
    // A line giving one side only (a paragraph's "from 12 June 2026") stands only if no full range
    // follows within a few lines (Van Gogh Museum: the range sits below its introduction).
    let half=null;
    const take=x=>{ if(x.range.start&&x.range.end)return x; if(!half)half=x; return null; };
    // Under a top heading, another top heading starts another part of the page: its dates are its own
    // (the Borghese's archive: "# Insights | 1998 / 2026", the site, over "# Correggio and Antiquity").
    // A lower heading is not (San Marco's "### Date di apertura" under its "###" title).
    const top=l=>/^\s*#\s+\S/.test(String(l)), underTop=top(lines[h]);
    // A venue that labels its date line (linkRead.dateLine) is read there, anywhere on the page.
    if(lr&&lr.dateLine){
      for(let k=0;k<lines.length;k++){
        const l=stripMd(lines[k]); if(!l||!lr.dateLine.test(l))continue;
        const r=rangeIn(l);
        if(r.start||r.end)return{d:k,range:r,via:"dates:dateLine"};
      }
    }
    for(let k=h+1,seen=0;k<lines.length&&seen<LINK_DATE_LINES;k++){
      const l=stripMd(lines[k]); if(!l)continue; seen++;
      if(underTop&&top(lines[k])){ rule("dates:stop-at-heading"); break; }
      // A venue whose box of other shows sits below (linkRead.datesUntil): never read past it.
      if(lr&&lr.datesUntil&&lr.datesUntil.test(l.trim())){ rule("datesUntil"); break; }
      const nx=[];
      for(let j=k+1;j<lines.length&&nx.length<2;j++){ const t=stripMd(lines[j]); if(t)nx.push([j,t]); }
      // Opening and closing dates on two lines, "From 12 June 2026" over "Until 6 September 2026"
      // (Van Gogh Museum), "Held on 14 feb 2014" over "to 26 may 2014" (Reina Sofía): read together
      // before either alone, whatever word comes before the opening date.
      if(nx.length&&!(rangeIn(l).start&&rangeIn(l).end)&&/^(?:until|till|to|through|bis|au|al|jusqu|hasta)\b/i.test(nx[0][1])){
        const r2=rangeIn(l+" "+nx[0][1]);
        if(r2.start&&r2.end)return{d:k,dEnd:nx[0][0],range:r2,via:"dates:two-lines"};
      }
      if(half&&k>half.d+LINK_HALF_LOOK)break;
      const r=rangeIn(l);
      if(r.start||r.end){ const t=take({d:k,range:r,via:"dates:under"}); if(t)return t; }
      // A range printed over three lines, the middle one only "to" or a dash (Berlin).
      if(nx.length===2&&/^(?:-|–|—|to|bis|until|till|through|al|au|tot)$/i.test(nx[0][1])){
        const r3=rangeIn(l+" "+nx[0][1]+" "+nx[1][1]);
        if(r3.start&&r3.end)return{d:k,dEnd:nx[1][0],range:r3,via:"dates:three-lines"};
      }
    }
    return half;
  };
  let h=cands[0],found=null;
  for(const i of cands){ found=datesUnder(i); if(found){ h=i; break; } }
  // None under any candidate: dates printed just above the heading ("Until 25.10.2026", Kunsthaus).
  if(!found)for(const i of cands){ if(nameOnly(i))continue; found=datesAboveFor(i,2,"dates:above-heading"); if(found){ h=i; break; } }
  if(found)rule("title:"+candRule[cands.indexOf(h)]+(h===cands[0]?"":"-not-first"));
  if(!found){
    const h0=cands.find(i=>!nameOnly(i));
    if(h0===undefined){ rule("fail:venue-name-only"); return{ok:false,why:"Couldn’t find the show’s title on the page."}; }
    const near=[];
    for(let k=h0+1;k<lines.length&&near.length<LINK_DATE_LINES;k++){ const l=stripMd(lines[k]); if(!l)continue; if(lr&&lr.datesUntil&&lr.datesUntil.test(l.trim()))break; near.push([k,l]); }
    // A date the page prints but that is not one (months only, a season, no year), else none at all:
    // kept undated with the sweep's own note, the dates left blank (her decision: the sweep's rules, a day
    // never invented). The Borghese prints most past shows' dates only in the poster.
    // A day and month with no year (Chantilly's English pages): quoted as the sweep quotes it (unusableDateText).
    // All numbers in an order nothing settles: the order-unknown note (orderUnknown).
    const mo=near.map(([k,l])=>({k,r:DATES.findDateRange(dateText(l),{looseSingles:true,venue:dateVenue})})).find(x=>x.r.shownText);
    const ny=mo?null:near.map(([k,l])=>({k,t:DATES.unusableDateText(dateText(l))})).find(x=>x.t);
    h=h0; rule("title:"+candRule[cands.indexOf(h0)]);
    found=mo&&mo.r.orderUnknown?{d:mo.k,range:{start:"",end:""},noDates:true,orderUnknown:true,via:"dates:order-unknown"}
      :mo?{d:mo.k,range:{start:"",end:""},noDates:true,shown:mo.r.shownText,shownWhy:mo.r.shownWhy,via:"dates:shown-only"}
      :ny?{d:ny.k,range:{start:"",end:""},noDates:true,shown:ny.t,shownWhy:"no year is published anywhere",via:"dates:no-year"}
      :{d:h0,range:{start:"",end:""},noDates:true,via:"dates:none"};
    // No dates, and the page still holds a script's unfilled placeholder ("{{daysLeft(exhibition.end)}}", Getty):
    // its dates are drawn by script, so the card says so (SCRIPT_DATES_NOTE).
    if(found.via==="dates:none"&&SCRIPT_PLACEHOLDER.test(lines.join("\n"))){ found.scriptDates=true; rule("dates:script"); }
  }
  const d=found.d,dEnd=found.dEnd||found.d;
  let range=found.range;
  rule(found.via);
  // The printed date line's shape, digits and words blanked ("a, a 9, 9, 9:9 a a-…"): a new shape is a new page to keep.
  if(pg.rules){
    const shown=decodeEntities(lines.slice(d,dEnd+1).map(stripMd).join(" "));
    rule("date-shape:"+shown.replace(/\d+/g,"9").replace(/\p{L}+/gu,"a").replace(/\ba(?:\s+a\b)+/g,"a").replace(/\s*[-‐-―]\s*/g,"-").replace(/\s+/g," ").trim().slice(0,80));
    if(range.start&&range.end&&range.start.slice(0,4)!==range.end.slice(0,4)&&(String(range.raw||shown).match(/\b\d{4}\b/g)||[]).length<2)rule("dates:year-worked-out");
  }
  if(dateText(lines[d])!==lines[d])rule("dates:venue-rewrite");
  // One side only: a full range further down that shares that date completes it. A range
  // ending on another day never does.
  if(!range.start||!range.end){
    for(let k=d+1;k<lines.length;k++){
      const r=DATES.findDateRange(dateText(stripMd(lines[k])),{looseSingles:false,venue:dateVenue});
      if(r.start&&r.end&&((range.end&&r.end===range.end)||(range.start&&r.start===range.start))){ range={...range,start:r.start,end:r.end}; rule("dates:one-side-completed"); break; }
    }
  }
  // A run the page says was cut short closes on the day it really closed (MSK Ghent's Van Eyck).
  range=DATES.closedEarly(range,lines.map(stripMd).join("\n"),dateVenue);
  if(range.closedEarlyFrom)rule("dates:closed-early");
  Object.assign(pg,{h,found,d,dEnd,range,heading:stripMd(lines[h])});
  return null;
}

// Step 6. The name. The heading is the name, as in the scraper (titleFromPage). The page title adds
// only what the page backs: written the same (spacing, quotes and "&" aside), its spelling stands
// (Tate "90s"); its words past the heading all on the line under the heading, that fuller line joins
// (Poldi Pezzoli); the heading then a separator and a subtitle, the page title stands (KHM "Head and
// Shoulders. Coins in Fashion"). Never its dates, site name or another spelling (MFAH, NPG,
// Philadelphia). A heading that is generic words, the site's name or shares no word with the page
// title gives way to the page title. A title line that is not a heading keeps the page title's
// show, or the line when it runs on.
function settleName(pg){
  const{lr,lines,rule,dateText,dateVenue,h,heading,show,site,broken,after,words,host}=pg;
  const flatName=x=>foldText(stripMd(x)).replace(/&/g," and ").replace(/[^a-z0-9]/g,"");
  const nameWords=x=>foldText(stripMd(x)).replace(/&/g," and ").split(/[^a-z0-9]+/).filter(w=>w&&!GENERIC_TITLE_WORDS.has(w));
  const isHeading=/^\s*#{1,6}\s/.test(lines[h])||h===broken||(after>=0&&h===after);
  const hw=new Set(nameWords(heading));
  // A heading over two lines, or after a venue's marker line, is the page's own name whatever the
  // page title says (Berlin's can be German or misspelt).
  const ownHeading=h===broken||(after>=0&&h===after);
  // A page title naming the site and sharing no word with the heading is the site's own label
  // ("Information: Wallraf-Richartz-Museum"), not the show's name. AL-056a.
  const namesSite=x=>nameWords(x).some(w=>w.length>=4&&foldText(host||"").includes(w));
  const tabIsSiteLabel=!!(show&&namesSite(show)&&!namesSite(heading));
  const headingIsSite=!ownHeading&&(!hw.size||!!(site&&flatName(site)===flatName(heading))||!!(show&&!nameWords(show).some(w=>hw.has(w))&&!tabIsSiteLabel));
  let base;
  if(isHeading&&!headingIsSite){
    base=heading.trim();
    const datedText=x=>{ const r=DATES.findDateRange(dateText(x),{looseSingles:true,venue:dateVenue}); return !!(r.start||r.end)||/^\(?\d{4}\)?$/.test(x.trim()); };
    const k=lines.findIndex((l,i)=>i>h&&stripMd(l)), next=k>0?decodeEntities(stripMd(lines[k])).trim():"";
    const nw=new Set(nameWords(next)), extra=show?nameWords(show).filter(w=>!hw.has(w)):[];
    const rest=show&&flatName(show).startsWith(flatName(heading))?show.slice(show.length-(show.length-heading.length)).replace(/^[^\s.:–—-]*/,""):"";
    if(ownHeading){ rule("name:heading"); }
    else if(show&&flatName(show)===flatName(base)){ base=show; rule("name:tab-spelling"); }
    else if(extra.length&&next&&next.length<=160&&!datedText(next)&&extra.every(w=>nw.has(w))){
      const joined=joinTitle(base,next);
      base=flatName(joined)===flatName(show)?show:joined; rule("name:heading-and-line");
    }else if(show&&/^\s*[.:]\s+\S/.test(rest)&&nameWords(rest).length&&!datedText(rest)&&!(site&&flatName(rest).endsWith(flatName(site)))){ base=show; rule("name:tab-subtitle"); }
  }else{
    const wrapped=show&&heading&&foldText(show).indexOf(foldText(heading))>0;
    base=wrapped?heading:show&&heading.length>show.length&&heading.length<=200&&foldText(heading).startsWith(foldText(show))?heading:(show||heading);
  }
  rule(base===show?(base===heading?"name:tab-is-heading":"name:tab"):base===heading?"name:heading":"name:heading-trimmed");
  if(lr&&lr.title){ const vt=venueTitle(lines,h,heading,lr,words); if(vt&&vt!==base){ base=vt; rule("name:venue-"+lr.title); } }
  pg.base=base;
}

// Step 7. What is not the name comes off it: a generic label (shared), then the venue's own.
function finishName(pg){
  const{lr,rule}=pg;
  let base=pg.base;
  // A generic label before the show's own name: "Exhibition: Hubert Robert" (NGA), "Exhibition
  // Vincent's Path to Fame" (Van Gogh Museum), "Mostra Rothko a Firenze" (San Marco).
  { const b=base.replace(/^(?:exhibitions?|mostra|ausstellung|exposition|exposición|tentoonstelling)\s*[:–—-]?\s+(?=\S)/i,"").trim();
    if(b!==base&&b.split(/\s+/).length>=1&&/\p{L}{2}/u.test(b)){ base=b; rule("label-dropped"); } }
  // A venue whose heading runs on past the page title's name (linkRead.tabTitle, the page title's tail
  // that is not the name; Łazienki): that name.
  if(lr&&lr.tabTitle){ const t=(pg.show||"").replace(lr.tabTitle,"").trim();
    if(t&&base.length>t.length&&foldText(base).startsWith(foldText(t))){ base=t; rule("tabTitle"); } }
  // A venue whose headline runs on past the show's name (linkRead.firstSentence; San Marco's
  // press releases): its first sentence only.
  if(lr&&lr.firstSentence){ const b=base.split(/[.!?](?=\s+\p{Lu})/u)[0].trim()||base; if(b!==base)rule("firstSentence"); base=b; }
  // A label the venue puts before the show's own name (linkRead.titleDrop).
  if(lr&&lr.titleDrop){ const b=base.replace(lr.titleDrop,"").trim()||base; if(b!==base)rule("titleDrop"); base=b; }
  // Quotation marks round the whole name (linkRead.unquote; "Mostra “Rothko a Firenze”").
  if(lr&&lr.unquote){ const b=base.replace(/^[“"«‘']\s*(.+?)\s*[”"»’']$/u,"$1"); if(b!==base)rule("unquote"); base=b; }
  // A doubled colon is the venue's typo (NGA, Souvenirs of the Gilded Age).
  if(/\s*:{2,}/.test(base)){ base=base.replace(/\s*:{2,}/g,":"); rule("doubled-colon"); }
  // HTML codes the site left in its heading are decoded, as in the rest of the page ("S&eacute;rusier", Łazienki).
  { const b=decodeEntities(base); if(b!==base)rule("entities"); base=b; }
  pg.base=base;
}

// Step 8. The short lines between the title and the dates (or the first few under a title whose
// dates sit above it), offered to Claude as a possible subtitle.
function offerSubtitleLines(pg){
  const{lr,lines,h,d,base}=pg;
  pg.between=lr&&lr.title?[]:lines.slice(h+1,d>h?d:Math.min(lines.length,h+4)).map(stripMd).filter(l=>l&&l.length<=120&&!foldText(base).includes(foldText(l))&&!(lr&&lr.skip&&lr.skip.test(l)));
  if(pg.between.length)pg.rule("between");
}

// Step 9. The passage handed to Claude: the show's own paragraphs from under the title, up to the
// scraper's cut of four paragraphs or 2,000 characters (her decision), the date line left out unless
// it is a paragraph; the venue's own start, stop and skip lines, then the shared rules (see THE
// PASSAGE'S SHARED RULES). The page's text keeps its paragraphs, headings, lists and quotations, and
// they are read as the scraper reads a page's markup: a paragraph's lines are one paragraph (Musée
// des Arts Décoratifs prints a line per few words); a list, a quotation or a table is never the
// show's text (menus, reviews, captions, artists' quotes); a heading turning to other matter ends it.
const LINK_PARAGRAPHS=4;
function takePassage(pg){
  const{lr,lines,rule,h,d,dEnd,heading}=pg;
  const dateLine=decodeEntities(stripMd(lines[d])).replace(/\s+/g," ").trim();
  const keepDateLine=dateLine.length>LINK_DATE_LINE_MAX;
  if(keepDateLine)rule("date-line-kept");
  const headingText=decodeEntities(heading).replace(/\s+/g," ").trim();
  let from=h+1;
  // fromLast: the last such line, where a menu names the section above it (the Tate library).
  if(lr&&lr.from){
    for(let k=h+1;k<lines.length;k++){ if(lr.from.test(stripMd(lines[k]))){ from=k+1; if(!lr.fromLast)break; } }
    if(from>h+1)rule("from");
  }
  // The page under the title in blocks: a heading; a list, quotation or table; or a paragraph, its
  // lines joined. A blank line, a heading or a change of kind starts a new block.
  const blocks=[];
  let cur=null;
  const kindOf=l=>/^\s*#{1,6}\s/.test(l)?"heading":/^\s*>/.test(l)?"quote":/^\s*\|/.test(l)?"table":/^\s*(?:[*+-]|\d+\.)\s/.test(l)?"list":"text";
  for(let k=from;k<lines.length;k++){
    if(k>d&&k<=dEnd||k===d&&!keepDateLine)continue;
    const line=lines[k], own=stripMd(line);
    // The passage ends at the first line matching linkRead.until (a box for other shows).
    if(lr&&lr.until&&lr.until.test(own)){ rule("until"); break; }
    if(!own){ cur=null; continue; }
    if(lr&&lr.skip&&lr.skip.test(own)){ rule("skip"); continue; }
    if(lr&&lr.skipEntities&&/&#?\w+;/.test(own)){ rule("skipEntities"); continue; }
    let t=decodeEntities(own).replace(/\s+/g," ").trim();
    // A line indented under a list item belongs to it; a heading run into a line ("Members only ###
    // A Member's Field Guide", MoMA) is a link to other matter.
    let kind=/^\s{2,}\S/.test(line)&&cur&&cur.kind==="list"?"list":kindOf(line);
    if(kind==="text"&&/\s#{2,6}\s/.test(line)){ kind="heading"; t=t.replace(/^.*\s#{2,6}\s+/,""); }
    // A lead paragraph set as a heading ("##### In 1938, René Magritte gave a lecture…", KMSKA) is a
    // paragraph; a heading that is a link is a card for other matter.
    if(kind==="heading"&&(!/\]\(/.test(line)||lr&&lr.capsText)&&t.split(/\s+/).length>=15&&isProse(t))kind="text";
    if(kind==="heading"||!cur||cur.kind!==kind||kind==="list"&&/^\s*(?:[*+-]|\d+\.)\s/.test(line)){
      cur={kind,text:t,k}; blocks.push(cur);
      if(kind==="heading")cur=null;
    }else cur.text+=" "+t;
  }
  // A sentence wrapped over paragraphs, a line each (a press release's PDF, Enfilade): a paragraph of six
  // words or more that stops mid-sentence joins the next when that one opens in lower case, or when it
  // stops on a word no sentence ends on ("the", "of", a comma). A label or a picture's description above
  // a paragraph stops on neither and stays apart.
  for(let i=0;i+1<blocks.length;i++){
    const a=blocks[i],b=blocks[i+1];
    if(a.kind==="text"&&b.kind==="text"&&!/[.!?:;…"”’»)]$/.test(a.text)&&a.text.split(/\s+/).length>=6
      &&(/^\p{Ll}/u.test(b.text)||/(?:\s(?:a|an|the|of|and|or|to|in|for|with|by|from|his|her|its|their|as|at|on)|,)$/i.test(a.text))){ a.text+=" "+b.text; blocks.splice(i+1,1); i--; }
  }
  let raw="",paras=0,passOver=false;
  const seen=new Set();
  for(const b of blocks){
    if(raw.length>=LINK_RAW_CHARS)break;
    if(paras>=LINK_PARAGRAPHS){ rule("end:four-paragraphs"); break; }
    const t=b.text;
    // Ends only once the show's own text is in: Getty prints "Related Events" above its description.
    if(b.kind==="heading"){ passOver=ONLINE_FEATURE.test(t); if(passOver){ rule("skip:online-feature"); continue; } }
    if(passOver)continue;
    if(b.kind==="heading"||PASSAGE_END.test(t)){
      if(raw&&(OTHER_MATTER.test(t)||PASSAGE_END.test(t))){ rule("end:other-matter"); break; }
      if(raw.length>=LINK_BOX_AFTER&&LINK_BOX.test(t)){ rule("end:box"); break; }
      continue;
    }
    if(b.kind!=="text"){ rule("skip:"+b.kind); continue; }
    if((t===dateLine&&!keepDateLine)||t===headingText||seen.has(t))continue;
    if(isFurniture(t)){ rule("skip:furniture"); continue; }
    if(isCaption(t)){ rule("skip:caption"); continue; }
    // The show's title printed again with a subtitle and no sentence ("Paradise on Earth. Flemish landscape painting from
    // Bruegel to Rubens", Dresden).
    if(pg.base&&foldText(t).startsWith(foldText(pg.base))&&t.split(/\s+/).length<=15&&!CAPTION_VERB.test(t)){ rule("skip:title"); continue; }
    if(!isProse(t)){ rule("skip:not-prose"); continue; }
    // A line typed in capitals is a heading or a quotation shouted (Rijksmuseum's "THIS IS AN ABSOLUTELY
    // FABULOUS SHOW…"), not the show's text.
    const letters=t.replace(/[^\p{L}]/gu,"");
    if(!(lr&&lr.capsText)&&letters.length>=12&&(t.match(/\p{Lu}/gu)||[]).length/letters.length>0.7){ rule("skip:capitals"); continue; }
    const l=withoutBoilerplate(t);
    if(l!==t)rule("boilerplate");
    if(!l||!isProse(l)||isCaption(l))continue;
    if(lr&&lr.minLine&&l.length<lr.minLine){ rule("minLine"); continue; }
    seen.add(t);
    raw+=(raw?"\n":"")+l;
    paras++;
  }
  if(!raw)rule("no-description");
  Object.assign(pg,{dateLine,raw});
}

// Step 10. The answer: the link without tracking tails (or the venue's query, cleanLink), and the
// site's name for a venue the app has not met.
function pageResult(pg){
  const{lr,url,lines,h,rule,range,found,site,vc,host}=pg;
  // The first line under the heading, for a venue whose subtitle sits there.
  const under=lines.slice(h+1).map(stripMd).find(Boolean)||"";
  // The first two lines under the dates, where a house line can sit (linkVenue).
  const afterDates=pg.d>h?lines.slice(pg.dEnd+1).map(stripMd).filter(Boolean).slice(0,2):[];
  let tracked=false; try{ tracked=[...new URL(url).searchParams.keys()].some(k=>TRACKING_PARAM.test(k)); }catch{}
  const link=lr&&lr.cleanLink?String(url).split(/[?#]/)[0]:tracked?withoutTracking(url):url;
  if(link!==url)rule(lr&&lr.cleanLink?"cleanLink":"tracking");
  return{ok:true,base:pg.base,between:pg.between,under,afterDates,start:range.start||"",end:range.end||"",raw:pg.raw.slice(0,LINK_RAW_CHARS),site:site||(linkEntry(vc)||{}).name||host.replace(/^www\./,""),link,noDates:!!found.noDates,scriptDates:!!found.scriptDates,orderUnknown:!!found.orderUnknown,shown:found.shown||"",shownWhy:found.shownWhy||"",dateLine:found.noDates&&!found.shown?"":pg.dateLine,dateNote:DATES.closedEarlyNote(range)};
}

// A venue's title from its own headings (linkRead.title). "pieces": the heading is the "##"
// and "###" lines run together, joined as the scraper joins them. "subtitle": the "##" line
// under the heading, unless it names one of linkRead.places or is a credit (linkRead.credit).
function venueTitle(lines,h,heading,lr,words){
  const near=[];
  for(let k=h+1;k<lines.length&&near.length<40;k++){ if(lines[k].trim())near.push(lines[k]); }
  if(lr.title==="pieces"){
    const a=near.findIndex(l=>/^\s*##\s+\S/.test(l));
    if(a<0||!/^\s*###\s+\S/.test(near[a+1]||""))return"";
    const name=stripMd(near[a]),sub=stripMd(near[a+1]);
    return words(name+" "+sub)===words(heading)?joinTitle(name,sub,lr.dashAfterColon):"";
  }
  const sub=/^\s*##\s+\S/.test(near[0]||"")?stripMd(near[0]):"";
  if(!sub||(lr.places||[]).some(p=>foldText(p)===foldText(sub))||(lr.credit&&lr.credit.test(sub)))return heading.trim();
  return joinTitle(heading.trim(),sub,lr.dashAfterColon);
}

// The title is what the catalogue would be called (her decision): a printed subtitle
// is kept. One that carries on the sentence ("and the Masters of Light") joins with a
// space. Claude's subtitle must match one of the page's lines, capitals and spacing
// ignored, and the page's spelling is kept.
function linkTitle(base,subtitle,between){
  const k=v=>foldText(v).replace(/\s+/g," ").trim();
  const sub=(between||[]).find(l=>k(l)===k(subtitle))||"";
  if(!sub||foldText(base).includes(foldText(sub)))return base;
  return base.replace(/[\s:.—-]+$/,"")+(/^(and|&)\s/.test(sub)?" ":": ")+sub;
}

// A venue whose full name sits on a line below its heading (linkRead.nameInLines): that line.
function nameInLines(page,vc){
  if(!(linkOptions(vc)||{}).nameInLines)return"";
  const b=foldText(page.base).trim();
  return (page.between||[]).filter(l=>{ const f=foldText(l).trim(); return f.length>b.length&&f.startsWith(b); })
    .sort((x,y)=>y.length-x.length)[0]||"";
}

// askVenue: a site the app has never seen (or has stored named only by its address). Claude is
// given the page's address and names the venue that held the show (her decision): its full name
// and other names, city and country, for searching, and a short card name in her style. Whether the page is
// the museum's own decides the rest: only someone else's page asks more (elsewherePrompt).
// Her names for venues, as the style for a new venue's short name.
const SHORT_NAME_EXAMPLES=()=>Object.values(LINK_VENUES).map(v=>v.card||v.short).filter(Boolean);
// Her renames of Claude's card names (`notCard`), each with the name Claude gave: so Claude learns her style.
// The full name is the entry's, else the one Claude gave, as the store holds it (MU).
const SHORT_NAME_RENAMES=()=>Object.entries(LINK_VENUES).filter(([,v])=>v.notCard&&(v.card||v.short))
  .map(([id,v])=>"for "+JSON.stringify(v.name||(MU[id]&&MU[id].name)||v.lookupName||v.short)+": "+JSON.stringify(v.card||v.short)+", not "+JSON.stringify(v.notCard));
// A pasted box (page.pasted): the whole text, and Claude asked for the title and the date words too.
function linkPrompt(page,askVenue,url,vc){
  const ex=SUMMARY_EXAMPLES.map(e=>"RAW: "+e.raw+"\nACCEPTED SUMMARY: "+e.summary).join("\n\n");
  const museum=page.pasted&&!askVenue&&MU[vc]?MU[vc].name:"";
  return "You are reading one museum exhibition page for a personal art-catalogue tracker. Your ONLY output is one JSON object.\n\n"
    +(askVenue?"PAGE ADDRESS: "+url+"\n":"")
    +(museum?"THE MUSEUM THIS CARD IS FOR: "+JSON.stringify(museum)+"\n":"")
    +(askVenue&&page.dateLine?"THE SHOWING THIS CARD IS FOR, as the page prints it: "+JSON.stringify(page.dateLine)+"\n":"")
    +(page.pasted?"RAW TEXT (pasted or typed by hand, from one source or several; its order and layout can be anything):\n\"\"\"\n"+page.raw+"\n\"\"\"\n\n"
    :"EXHIBITION TITLE, as the page gives it: "+JSON.stringify(page.base)+"\n"
    +(page.between.length?"LINES BETWEEN THE TITLE AND THE DATES: "+JSON.stringify(page.between)+"\n":"")
    +"RAW TEXT (the page under the title, dates taken out):\n\"\"\"\n"+page.raw+"\n\"\"\"\n\n")
    +"EXAMPLES of the required summary style — a venue's raw text, and the summary that was accepted:\n\n"+ex+"\n\n"
    +"RULES FOR THE SUMMARY:\n"+SUMMARY_RULES+"\n\n"
    +"Answer with exactly these keys:\n"
    +"\"summary\": the summary, following the rules above — or null if the raw text does not describe an exhibition.\n"
    +(page.pasted?"The summary is written from the rest of the text, once the title and the dates are taken out: what the exhibition showed, never the title reworded.\n"
      +"\"title\": the exhibition's full name with its subtitle, copied exactly as the text writes it, word for word (a line break inside it may become a space). Only the name: never a sentence about the show, an author's or editor's name after it, a label (\"Title:\", \"Exhibition\"), a place or a date.\n"
      +"\"dates\": the words that give the exhibition's opening and closing dates"+(museum||askVenue?" at "+(museum?"THE MUSEUM THIS CARD IS FOR":"the museum you give as venue"):"")+", copied exactly as the text writes them (\"November 19, 1977 to February 12, 1978\"). Never another venue's showing, a birth or death date, or a publication date. \"\" if the text gives none.\n":"")
    +(page.between.length?"\"subtitle\": if one of the LINES BETWEEN THE TITLE AND THE DATES is the second part of the exhibition's own name — the part a catalogue's title would carry after the main title — copy that line exactly as written. Otherwise \"\". Never a category (\"Special Exhibition\"), a sponsor, a place, a price or a date.\n":"")
    +"\"english\": the exhibition's title"+(page.between.length?" (with the subtitle you gave, if any)":"")+" in natural English if it is not in English; \"\" if it already is, names aside. Keep every name as written and the title's own full stops. Plain words: no \"In English\", no quotation marks.\n"
    +"\"englishSpeaking\": true if the museum is in an English-speaking country, false if not.\n"
    +"\"gallery\": true if the venue that held the exhibition is a commercial art gallery (a dealer that shows and sells artists' work), false if it is a museum or another public institution."
    +(askVenue?"\n\"venue\": the museum or gallery of THE SHOWING THIS CARD IS FOR: the one that line names, even when the text lists other showings or another venue first; if the line names none, the museum that held the exhibition on its dates. The museum itself, not a building, wing or room of it. Its full official name, written out (no acronym). \"\" if the page does not say.\n"
      +"\"venueCity\": that museum's city, in English. \"\" if not known.\n"
      +"\"venueCountry\": that museum's country, in English. \"\" if not known.\n"
      +"\"venueAlso\": the other names that museum goes by, as an array of strings: its acronym, its name in its own language (\"KMSKA\", \"Koninklijk Museum voor Schone Kunsten Antwerpen\"). [] if none.\n"
      +"\"venueShort\": that museum's name as it would head a card in this tracker: short, but enough to tell it from any other museum (\"National Gallery\" alone is not: there are several), in the style of these: "+JSON.stringify(SHORT_NAME_EXAMPLES())+"."+(SHORT_NAME_RENAMES().length?" Where she renamed the name first given, hers is the style to follow: "+SHORT_NAME_RENAMES().join("; ")+".":"")+" \"\" if \"venue\" is \"\".\n"
      +"\"venueOwnPage\": true if the PAGE ADDRESS is on that museum's own website; false if it is on someone else's site (a blog, a magazine, a newspaper, an aggregator, another organisation), even when the text is the museum's own press release.":"");
}

// What the model said, checked. Wording is not a control.
function linkAnswer(a){
  const o=a&&typeof a==="object"?a:{};
  const str=v=>typeof v==="string"?v.replace(/["“”]/g,"").replace(/\s+/g," ").trim():"";
  return{summary:typeof o.summary==="string"?o.summary.trim():"",subtitle:typeof o.subtitle==="string"?o.subtitle.trim():"",
    english:str(o.english).replace(/^In English:\s*/i,""),englishSpeaking:o.englishSpeaking!==false,gallery:o.gallery===true,
    venue:str(o.venue),venueCity:str(o.venueCity),venueCountry:str(o.venueCountry),venueAlso:(Array.isArray(o.venueAlso)?o.venueAlso:[]).map(str).filter(Boolean).slice(0,4),venueShort:str(o.venueShort),venueOwnPage:o.venueOwnPage!==false,
    pasteTitle:typeof o.title==="string"?o.title.replace(/\s+/g," ").trim():"",pasteDates:typeof o.dates==="string"?o.dates.replace(/\s+/g," ").trim():""};
}

// Claude's answer, checked as the compressor checks its own (ANSWER_CHECK, one copy, shared): the
// description's shape, and every claim and number in it on the page Claude was given. Returns the
// faults, said so Claude can fix them; [] when it passes. A null description (the text is not a
// show's description) is Claude's decision and passes. A failed answer is asked for again
// (LINK_ASK_AGAIN times); one that never passes leaves the link unread (her decision).
const LINK_ASK_AGAIN=2;
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
    }
  }
  // The English title as linkAnswer reads it (not a string is none; quotation marks and an "In English:"
  // opening taken off, AL-006).
  { const e=ANSWER_CHECK.validateEnglish(linkAnswer(o).english); if(!e.ok)faults.push(e.reason); }
  if(page.pasted)faults.push(...pasteFaults(o,page));
  return faults;
}
// Claude is shown the answer refused, to fix it rather than start afresh (her Memling link; AL-062c).
function askAgainPrompt(prompt,faults,answer){
  return prompt+"\n\nYOUR LAST ANSWER WAS REFUSED: "+faults.join("; ")+".\nTHE ANSWER REFUSED: "+JSON.stringify(answer)
    +"\nAnswer again, every key, with that fixed — never the same answer again. Leave out anything the text does not state.";
}

// Someone else's page about a show held elsewhere (a blog, a magazine; her decision, a last
// resort), asked only once Claude has said so: the museum's own website, to file the show under,
// and the show's full title, since such a page's title can be anything (Enfilade's PDF was
// titled "Joshua Reynolds"; AL-052h).
function elsewherePrompt(page,url,a){
  return "You are reading a page about a museum exhibition, published by someone other than the museum that held it. Your ONLY output is one JSON object.\n\n"
    +"PAGE ADDRESS: "+url+"\n"
    +"THE MUSEUM THAT HELD IT: "+JSON.stringify([a.venue,a.venueCity,a.venueCountry].filter(Boolean).join(", "))+"\n"
    +"EXHIBITION TITLE, as the page gives it: "+JSON.stringify(page.base)+"\n"
    +"RAW TEXT (the page under the title, dates taken out):\n\"\"\"\n"+page.raw+"\n\"\"\"\n\n"
    +"Answer with exactly these keys:\n"
    +"\"venueSite\": that museum's own website, the domain only (\"example.org\"), if you know it; \"\" if not.\n"
    +"\"title\": the exhibition's full name as the text states it, with its subtitle, copied exactly as written (\"Turner and Constable: Rivals and Originals\"). Never a heading that only names the artist when the text gives the full name, never a label such as \"Exhibition\" or \"Review\", never the site's name.";
}
function elsewhereAnswer(a){
  const o=a&&typeof a==="object"?a:{};
  const str=v=>typeof v==="string"?v.replace(/["“”]/g,"").replace(/\s+/g," ").trim():"";
  return{venueSite:str(o.venueSite).toLowerCase(),title:str(o.title)};
}

const flatName=x=>foldText(x).replace(/^the\s+/,"").replace(/[^a-z0-9]+/g," ").trim();
// Claude says the page is not the museum's own, and the page's site is not named for the museum.
function maybeElsewhere(a,pageHost){
  return !!(a&&a.venue&&!a.venueOwnPage)&&!flatName(a.venue).split(" ").some(w=>w.length>=4&&foldText(pageHost).includes(w));
}
// A page about a show held elsewhere → {id, name, host} for the venue Claude named: one of
// hers by name or site, else a new occasional venue filed under its own site (or its name
// when Claude knows no site). Null when the page is the venue's own. AL-052.
function heldElsewhere(a,pageHost){
  if(!maybeElsewhere(a,pageHost))return null;
  const site=hostOf(/^https?:\/\//i.test(a.venueSite||"")?a.venueSite:"https://"+(a.venueSite||"")).replace(/^www\./,"");
  // The page's own site names the venue (Claude's "not its own page" misread): not elsewhere.
  if(site&&baseDomain(site)===baseDomain(pageHost))return null;
  const mine=Object.values(MU).find(m=>m&&!m.occasional&&[m.name,m.short].some(x=>x&&flatName(x)===flatName(a.venue)));
  const known=mine?mine.id:site?knownVenueFor("https://"+site+"/"):null;
  if(known)return{id:known,name:MU[known].name,host:site};
  const occ=Object.values(MU).find(m=>m&&m.occasional&&[m.name,m.short].some(x=>x&&flatName(x)===flatName(a.venue)));
  if(occ)return{id:occ.id,name:occ.name,host:site};
  return{id:site?occVenueId(site):"occ-"+flatName(a.venue).replace(/ /g,"-"),name:a.venue,host:site};
}

// A page on another part of one of her museums' own website (Tate's library, library.tate.org.uk;
// a section the address alone does not file): its host is the museum's, or under it.
const onMuseumSite=(host,m)=>VENUE_SITES.some(v=>v.id===m&&(bareHost(host)===v.host||bareHost(host).endsWith("."+v.host)));
const nearMuseumSite=host=>VENUE_SITES.some(v=>onMuseumSite(host,v.id));
// Such a page files under the museum Claude names, when it is that museum's site → its id, or null.
function ownMuseumNamed(a,pageHost){
  const said=flatName(a&&a.venue||"");
  if(!said)return null;
  const m=Object.values(MU).find(m=>m&&!m.occasional&&[m.name,m.short].some(x=>x&&(said===flatName(x)||said.startsWith(flatName(x)+" "))));
  return m&&onMuseumSite(pageHost,m.id)?m.id:null;
}

function occVenueId(host){
  return "occ-"+String(host||"").toLowerCase().replace(/^www\./,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

// The link venues whose `sites` take this address → [[id, line]] (line: the house line, or none).
function siteVenues(url){
  let u; try{ u=new URL(siteUrlOf(url)); }catch{ return []; }
  const h=u.hostname.toLowerCase().replace(/^www\./,"");
  const out=[];
  for(const [id,v] of Object.entries(LINK_VENUES))
    for(const s of v.sites||[]) if(s.host===h&&(!s.path||s.path.test(u.pathname)))out.push([id,s.line||null]);
  return out;
}
// The one venue an address alone names: a swept venue, a link venue by one of its `sites`
// (not a site several houses share), else null.
function addressVenue(url){
  const known=knownVenueFor(url);
  if(known)return known;
  const s=siteVenues(url).filter(([,l])=>!l);
  return s.length===1?s[0][0]:null;
}
// The venue a read page files under → {id, line} (line: the house line, not a subtitle),
// or {id:null, why} for a shared site's page naming none of its houses (her decision; Munich).
function linkVenue(url,page){
  const known=addressVenue(url);
  if(known)return{id:known};
  const houses=siteVenues(url).filter(([,re])=>re);
  if(!houses.length)return{id:occVenueId(hostOf(siteUrlOf(url)))};
  for(const l of (page&&page.between)||[]) for(const [id,re] of houses) if(re.test(l.trim()))return{id,line:l};
  // A house line just under the dates (Berlin's Alte Nationalgalerie).
  for(const l of (page&&page.afterDates)||[]) for(const [id,re] of houses) if(re.test(l.trim()))return{id};
  // No house named: the site's own link venue, where it has one (smb.museum, the Gemäldegalerie).
  const own=occVenueId(hostOf(siteUrlOf(url)));
  if(linkEntry(own))return{id:own};
  const names=houses.map(([id])=>LINK_VENUES[id].short);
  return{id:null,why:"The page doesn’t say which museum the show is in ("+names.slice(0,-1).join(", ")+" or "+names[names.length-1]+")."};
}

// The venue whose link options read a page: a swept venue, or a link venue.
function linkReadVenue(url){
  const occ=occVenueId(hostOf(siteUrlOf(url)));
  return addressVenue(url)||(linkEntry(occ)?occ:null);
}

// A link to one of the swept venues files under it, matched by site from the scraper's
// recipes (VENUE_SITES, written by sync_shared); the Tates are told apart by path.
function knownVenueFor(url){
  const site=siteUrlOf(url);
  const h=hostOf(site).replace(/^www\./,"");
  if(!h)return null;
  let path="";
  try{ path=new URL(site).pathname; }catch{}
  const hit=VENUE_SITES.find(v=>v.host===h&&(!v.path||path.startsWith(v.path)));
  return hit?hit.id:null;
}

// An occasional venue as MU holds it: its LINK_VENUES entry over what the page's store holds
// (`v`: a fact about the world, like the sweep log), so everything reads it like any venue.
// No `v`: a ledger row from a venue this page's store has never seen (her file opened on
// another page), named `fallback`, shop not known.
//   shop: "found" (books section), "noshelf" (a shop, no books section), "none" (no
//   shop; confirmed = her "No shop", lookups go to the web), "failed" (a step died —
//   not an answer), "unknown" (look again on the next link). Lookups use "found", and
//   "noshelf" once its search is proved.
function occVenue(id,v,fallback){
  const own=linkEntry(id)||{}, s=v||{};
  const live=s.shop==="found"||(s.shop==="noshelf"&&!!s.shopSearch);
  const name=own.name||s.name||fallback;
  // Her pick on the shop screen: the English section the finder could not read (`shopEnglishUnread`), contents unseen.
  const en=!!(s.englishPicked&&s.shopEnglishUnread);
  return{id,shopLink:own.shopCatalogues||undefined,short:own.short||s.short||name,chip:own.chip,card:own.card,lookupName:own.lookupName||own.name||s.short||name,name,country:s.country||undefined,occasional:true,shopUnseen:own.shopUnseen||(en?"unconfirmed":undefined),english:s.english===false?false:undefined,
    exBase:null,listUrl:null,
    shopHome:live?s.shopHome||null:null,shopCatalogues:live?(en?s.shopEnglishUnread:s.shopCatalogues||null):null,shopSearch:live?s.shopSearch||null:null,
    shopUnknown:!live&&!(s.shop==="none"&&s.confirmed)};
}
// A venue the store holds named only by its address, as every new venue was before Claude named them.
const namedByAddress=v=>!!v&&!v.short&&bareHost(v.name)===bareHost(v.host);
// A link venue whose name and place Claude has not yet given: asked on its next link (her
// decision), her own names and rules kept.
const needsFacts=v=>!v||namedByAddress(v)||!v.city;
const bareHost=h=>String(h||"").toLowerCase().replace(/^www\./,"");
// The name a venue's shop is searched under: long and identifying (her decision; three National
// Galleries in three countries) — its full name, the other names it goes by, its city and its
// country, each where the words so far lack it. Proved live: "Palazzo Ducale" alone found Venice's;
// the English name alone found Brussels', "KMSKA" beside it found Antwerp's shop. The card name is
// the short one (`short`, `card`). `v`: the store's facts, or Claude's.
function venueSearchName(id,v){
  const own=linkEntry(id)||{}, s=v||{};
  let name=String(own.name||s.name||"").trim();
  for(const x of [...(s.aka||[]),s.city,s.country]) if(x&&!foldText(name).includes(foldText(x)))name+=" "+x;
  return name.trim();
}
// Every venue a card can be filed under, in VENUE_ORDER; the rest by name.
// The review walks THIS, not MUSEUMS, or occasional cards are counted and never drawn.
function allVenues(){
  const occ=Object.values(MU).filter(m=>m&&m.occasional);
  return MUSEUMS.concat(occ).sort((a,b)=>orderOf(a.id)-orderOf(b.id)||a.short.localeCompare(b.short));
}
function venueRank(id){ const i=allVenues().findIndex(m=>m.id===id); return i<0?1e6:i; }
function registerOccasional(map){
  for(const v of Object.values(map||{})){ if(!v||!isOcc(v.id))continue; MU[v.id]=occVenue(v.id,v); KNOWN_VENUES.add(v.id); }
}
function registerUnseenOccasional(rows){
  for(const r of rows||[]){
    if(!isOcc(r.museumId)||MU[r.museumId])continue;
    MU[r.museumId]=occVenue(r.museumId,null,hostOf(r.exUrl).replace(/^www\./,"")||r.museumId.slice(4));
    KNOWN_VENUES.add(r.museumId);
  }
}

// A STORE READ THAT FAILED IS NEVER SHOWN AS "NOTHING THERE", AND NEVER SAVED OVER (her decision: her link
// venues once came up as bare addresses after a failed read, and the next import would have written the list
// back with only its new venue). A part of the store that could not be read this opening is named on the page,
// and its write refuses until the page is opened again. A part that is simply empty is read as empty.
const STORE_UNREAD=new Set();
let storeUnreadSeen=()=>{};   // the page's banner, told when a read fails
function markUnread(what){ STORE_UNREAD.add(what); storeUnreadSeen([...STORE_UNREAD]); }
const UNREAD_OCC="the link venues", UNREAD_LINKS="the links waiting in the Links box", UNREAD_PAGES="the pages waiting in the Pages list",
  UNREAD_PASTES="the boxes waiting in Paste",
  UNREAD_SWEEPS="the sweep log", UNREAD_QUAR="the quarantine list";
async function readOccasional(){
  const db=await useCap("db");
  if(!db){ markUnread(UNREAD_OCC); return{}; }
  try{ const s=await db.doc(OCC_DOC).get(); return s.exists?((s.data()||{}).venues||{}):{}; }catch{ markUnread(UNREAD_OCC); return {}; }
}
async function writeOccasional(map){
  if(STORE_UNREAD.has(UNREAD_OCC))return false;
  const db=await useCap("db");
  if(!db)return false;
  try{ await db.doc(OCC_DOC).set({venues:map,updatedAt:new Date().toISOString()}); return true; }catch{ return false; }
}
// ── PAGES: a show page she saved (her decision; docs/add_by_link.md, "Saved pages") ──
// For a site that refuses Parallel. A saved page (.mht/.mhtml from Chrome, or .html) is
// turned into the reply Parallel gives — {url,title,full_content}, headings as "#",
// links as [text](href) — and read by readShowPage like any link. Only the page's own
// text is kept; the photos and fonts packed in the file are dropped.
function savedPageHtml(text){
  const t=String(text||"");
  const b=(t.match(/boundary="?([^";\r\n]+)"?/i)||[])[1];
  if(!b||!/^\s*(?:From:|MIME-Version:|Snapshot-Content-Location:|Subject:|Date:)/i.test(t))return{html:t,url:""};
  const url=(t.match(/^Snapshot-Content-Location:\s*(\S+)/mi)||[])[1]||"";
  for(const part of t.split("--"+b)){
    const cut=part.search(/\r?\n\r?\n/); if(cut<0)continue;
    const head=part.slice(0,cut);
    if(!/^Content-Type:\s*text\/html/mi.test(head))continue;
    let body=part.slice(cut).replace(/^\r?\n\r?\n/,"");
    const enc=(head.match(/^Content-Transfer-Encoding:\s*(\S+)/mi)||[])[1]||"";
    if(/quoted-printable/i.test(enc)){
      const bytes=[],raw=body.replace(/=\r?\n/g,"");
      for(let i=0;i<raw.length;i++){
        if(raw[i]==="="&&/^[0-9A-F]{2}$/i.test(raw.slice(i+1,i+3))){ bytes.push(parseInt(raw.slice(i+1,i+3),16)); i+=2; }
        else{ const c=raw.charCodeAt(i); if(c<128)bytes.push(c); else bytes.push(...new TextEncoder().encode(raw[i])); }
      }
      body=new TextDecoder("utf-8").decode(new Uint8Array(bytes));
    }else if(/base64/i.test(enc)){
      body=new TextDecoder("utf-8").decode(Uint8Array.from(atob(body.replace(/\s+/g,"")),c=>c.charCodeAt(0)));
    }
    return{html:body,url:url||(head.match(/^Content-Location:\s*(\S+)/mi)||[])[1]||""};
  }
  return{html:"",url};
}
// parse: html → a Document (the page's own DOMParser; a test hands in jsdom's).
function savedPageReply(text,parse){
  const got=savedPageHtml(text);
  if(!got.html.trim())return{ok:false,why:"The file holds no web page."};
  const doc=parse(got.html);
  const meta=sel=>{ const e=doc.querySelector(sel); return e?(e.getAttribute("href")||e.getAttribute("content")||"").trim():""; };
  const url=got.url||meta('link[rel="canonical"]')||meta('meta[property="og:url"]')||((String(text).match(/saved from url=\(\d+\)(\S+?)\s*-->/i)||[])[1]||"");
  if(!/^https?:\/\//i.test(url))return{ok:false,why:"The saved page doesn’t say its web address."};
  for(const e of doc.querySelectorAll("script,style,noscript,svg,template,iframe"))e.remove();
  const out=[];
  const BLOCK=/^(?:P|DIV|SECTION|ARTICLE|MAIN|HEADER|FOOTER|NAV|ASIDE|UL|OL|TABLE|TR|DL|DT|DD|FIGURE|FIGCAPTION|BLOCKQUOTE|FORM|FIELDSET)$/;
  const walk=n=>{
    if(n.nodeType===3){ out.push(n.textContent.replace(/\s+/g," ")); return; }
    if(n.nodeType!==1)return;
    const tag=n.tagName.toUpperCase(), h=tag.match(/^H([1-6])$/);
    if(tag==="BR"){ out.push("\n"); return; }
    if(tag==="A"){
      const href=n.getAttribute("href")||"", txt=n.textContent.replace(/\s+/g," ").trim();
      let abs=""; try{ abs=new URL(href,url).href; }catch{}
      if(txt&&/^https?:/i.test(abs)&&!n.querySelector("h1,h2,h3,h4,h5,h6,p,div,li")){ out.push("["+txt+"]("+abs+")"); return; }
    }
    if(h||tag==="LI"||BLOCK.test(tag))out.push("\n\n");
    if(h)out.push("#".repeat(+h[1])+" ");
    if(tag==="LI")out.push("* ");
    for(const c of n.childNodes)walk(c);
    if(h||tag==="LI"||BLOCK.test(tag))out.push("\n\n");
  };
  if(doc.body)walk(doc.body);
  const full=out.join("").split("\n").map(l=>l.replace(/[ \t]+/g," ").trim()).join("\n").replace(/\n{3,}/g,"\n\n").trim();
  const title=((doc.querySelector("title")||{}).textContent||"").replace(/\s+/g," ").trim();
  return{ok:true,res:{url,title,full_content:full}};
}
// The pages waiting in the Pages list — their text, not the files — kept in the page's
// store like the Links box (her decision), one document each (the store caps a document).
const PAGES_COLL="links_pages";
const pageDocId=u=>{ let h=5381; for(const c of String(normalizeUrlKey(u)||u))h=((h*33)^c.charCodeAt(0))>>>0; return "p"+h.toString(36); };
async function readPendingPages(){
  const db=await useCap("db");
  if(!db){ markUnread(UNREAD_PAGES); return[]; }
  try{
    const snap=await db.collection(PAGES_COLL).orderBy("at","asc").limit(1000).get();
    return snap.docs.map(d=>d.data()||{}).filter(p=>p.url&&p.text).map(p=>({url:p.url,title:p.title||"",name:p.name||"",text:p.text}));
  }catch{ markUnread(UNREAD_PAGES); return []; }
}
async function writePendingPages(list){
  if(STORE_UNREAD.has(UNREAD_PAGES))return false;
  const db=await useCap("db");
  if(!db)return false;
  try{
    const keep=new Set(list.map(p=>pageDocId(p.url)));
    const snap=await db.collection(PAGES_COLL).orderBy("at","asc").limit(1000).get();
    for(const d of snap.docs) if(!keep.has(d.id))await db.doc(PAGES_COLL+"/"+d.id).delete();
    const at=Date.now();
    for(let i=0;i<list.length;i++){ const p=list[i]; await db.doc(PAGES_COLL+"/"+pageDocId(p.url)).set({url:p.url,title:p.title||"",name:p.name||"",text:p.text,at:at+i}); }
    return true;
  }catch{ return false; }
}
// Paste: a page's text copied by hand, its link typed beside it (docs/add_by_link.md, "Pasted
// pages"). Pasted text has no layout to read, so the page reader never sees it: Claude gives the
// title and copies the date words, code checks both are in the text and reads the dates
// (pastedPage, pasteFaults; her decision). Any length of text is read.
function pastedPageReply(url,text){
  const u=String(url||"").trim();
  if(!/^https?:\/\/\S+$/i.test(u))return{ok:false,why:"The link box holds no web address."};
  const lines=String(text||"").replace(/\r/g,"").split("\n").map(l=>l.replace(/[ \t]+/g," ").trim());
  if(!lines.some(Boolean))return{ok:false,why:"The text box is empty."};
  return{ok:true,res:{url:withoutTracking(u),text:lines.join("\n").replace(/\n{3,}/g,"\n\n").trim()}};
}
// A pasted box as the rest of the road takes a page: Claude is handed the text (the description's
// 2,000-character cut applies); title and dates are filled from Claude's answer (pasteDates).
function pastedPage(text,url){
  return{ok:true,pasted:true,text,base:"",between:[],under:"",afterDates:String(text).split("\n").filter(Boolean),start:"",end:"",
    raw:String(text).slice(0,LINK_RAW_CHARS),site:hostOf(siteUrlOf(url)).replace(/^www\./,""),link:url,noDates:true,dateLine:""};
}
// Claude's copy is checked word for word against the text: capitals, punctuation and line breaks aside.
const pasteWords=t=>" "+foldText(String(t||"")).replace(/[^\p{L}\p{N}]+/gu," ").trim()+" ";
const inPasted=(part,text)=>pasteWords(part).trim()!==""&&pasteWords(text).includes(pasteWords(part));
// A library record's " : " as ": ", and no closing full stop (George Stubbs : a celebration.).
const pasteTitle=t=>String(t||"").replace(/\s+/g," ").trim().replace(/\s+:\s+/g,": ").replace(/[\s.:;,]+$/,"");
function pasteFaults(o,page){
  const a=linkAnswer(o), faults=[];
  if(!a.pasteTitle)faults.push("no title given");
  else if(!inPasted(a.pasteTitle,page.text))faults.push("the title is not copied exactly from the text");
  if(a.pasteDates&&!inPasted(a.pasteDates,page.text))faults.push("the dates are not copied exactly from the text");
  // A summary whose every word is the title's says nothing (her Met paste: "Late Antique and Early Christian art, third to seventh century.").
  const said=pasteWords(a.summary).trim().split(" ").filter(w=>w.length>2&&!PASTE_SMALL_WORDS.has(w));
  if(a.summary&&a.pasteTitle&&said.length&&said.every(w=>pasteWords(a.pasteTitle).includes(" "+w+" ")))
    faults.push("the summary only rewords the title: describe the exhibition from the rest of the text");
  return faults;
}
const PASTE_SMALL_WORDS=new Set(["the","and","for","from","with","art","its","his","her","their"]);
// The text the summary is checked against: the paste with the title and the date words taken out,
// as Links and Pages hand Claude the page under its title, dates taken out.
function pasteRest(o,page){
  const a=linkAnswer(o);
  let rest=pasteWords(page.text);
  for(const part of [a.pasteTitle,a.pasteDates]) if(pasteWords(part).trim())rest=rest.split(pasteWords(part)).join(" ");
  return rest;
}
// The dates from Claude's copied words, by the shared date reader with no year floor: the
// words are already cut out of the text, so no lifespan can be among them.
function pasteDates(page,words,vc){
  const r=words?DATES.findDateRange(words,{looseSingles:true,slashes:true,anyYear:true,venue:vc}):{start:"",end:""};
  if(r.start||r.end)return{...page,start:r.start||"",end:r.end||"",noDates:false,dateLine:words,dateNote:DATES.closedEarlyNote(r)};
  return{...page,noDates:true,orderUnknown:!!r.orderUnknown,shown:r.shownText||"",shownWhy:r.shownWhy||"",dateLine:words||""};
}
// The Paste boxes waiting, kept in the page's store as she types, one document each like the
// Pages list (the store caps a document). Only a box that changed is written again.
const PASTES_COLL="links_pastes";
let boxSeq=0;
const filledBox=x=>!!(x.url.trim()||x.text.trim());
let pastesWritten=new Map();   // box id → what the store holds for it
async function readPendingPastes(){
  const db=await useCap("db");
  if(!db){ markUnread(UNREAD_PASTES); return[]; }
  try{
    const snap=await db.collection(PASTES_COLL).orderBy("at","asc").limit(1000).get();
    const l=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).map(x=>({id:x.id,at:+x.at||0,url:String(x.url||""),text:String(x.text||"")})).filter(filledBox);
    pastesWritten=new Map(l.map(x=>[x.id,x.url+"\n"+x.text]));
    return l;
  }catch{ markUnread(UNREAD_PASTES); return []; }
}
async function writePendingPastes(items){
  if(STORE_UNREAD.has(UNREAD_PASTES))return false;
  const db=await useCap("db");
  if(!db)return false;
  try{
    const keep=items.filter(filledBox), ids=new Set(keep.map(x=>x.id));
    for(const id of [...pastesWritten.keys()]) if(!ids.has(id)){ await db.doc(PASTES_COLL+"/"+id).delete(); pastesWritten.delete(id); }
    for(const x of keep){ const v=x.url+"\n"+x.text; if(pastesWritten.get(x.id)===v)continue;
      await db.doc(PASTES_COLL+"/"+x.id).set({url:x.url,text:x.text,at:x.at}); pastesWritten.set(x.id,v); }
    return true;
  }catch{ return false; }
}
// Two boxes to start, one more each time she asks; boxes she filled are kept.
const PASTE_BOXES=2;
// A box's place in the list is when it was made, so a box typed in again keeps its place.
const newBox=()=>{ const at=Date.now()*1000+(boxSeq++%1000); const id="b"+at.toString(36); return{id,at,url:"",text:""}; };
const pasteBoxes=items=>{ const l=items.filter(filledBox); while(l.length<PASTE_BOXES)l.push(newBox()); return l; };
// Boxes back from a Read join those left, once each, in the order they were made.
const mergeBoxes=(had,back)=>pasteBoxes([...new Map([...had,...back].map(x=>[x.id,x])).values()].sort((a,b)=>a.at-b.at));

// Pages in a list once each, by address; a later pick of the same page replaces it.
function mergePages(had,add){
  const by=new Map();
  for(const p of [...had,...add])by.set(normalizeUrlKey(p.url)||p.url,p);
  return [...by.values()];
}

async function readPendingLinks(){
  const db=await useCap("db");
  if(!db){ markUnread(UNREAD_LINKS); return""; }
  try{ const s=await db.doc(LINKS_DOC).get(); return s.exists?String((s.data()||{}).text||""):""; }catch{ markUnread(UNREAD_LINKS); return ""; }
}
async function writePendingLinks(text){
  if(STORE_UNREAD.has(UNREAD_LINKS))return false;
  const db=await useCap("db");
  if(!db)return false;
  try{ await db.doc(LINKS_DOC).set({text:String(text||""),updatedAt:new Date().toISOString()}); return true; }catch{ return false; }
}

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
const SHOP_WORDS=new RegExp("^(?:the\\s+)?(?:museum\\s+|online\\s+|gift\\s+|book)?(?:"+SHOP_WORD+")(?:\\s+online)?$|^(?!work)[\\p{L}]{2,}shop$","iu");
const SHOP_HOST=new RegExp("^(?:"+SHOP_WORD+")\\.|(?<!work)shop|butik","i");
const SHOP_PATH=new RegExp("\\/(?:[^\\/]*[-_])?(?:museum-?)?(?:"+SHOP_WORD+")(?:[-_][^\\/]*)?(?:\\/|$)|\\/(?!work)[a-z]{2,}shop(?:[-_][^\\/]*)?(?:\\/|$)","i");
function mdLinks(text){
  const out=[];
  for(const m of String(text||"").matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)/g))out.push({label:stripMd(m[1]),url:m[2]});
  return out;
}
// "shop.courtauld.ac.uk" → "courtauld.ac.uk". Two labels, three behind a
// country's own second level (ac.uk, org.uk, com.au…).
function baseDomain(h){
  const p=String(h||"").toLowerCase().replace(/^www\./,"").split(".").filter(Boolean);
  if(p.length<=2)return p.join(".");
  const two=p.slice(-2).join(".");
  return /^(?:ac|co|org|gov|com|net|edu)\.[a-z]{2}$/.test(two)?p.slice(-3).join("."):two;
}
// The show page's own link to its shop, as an address; "" when it has none.
function shopLinkOnPage(text,museumHost){
  const links=mdLinks(text).filter(l=>!notAShop(l.url));
  const named=links.find(l=>SHOP_WORDS.test(l.label));
  if(named)return named.url;
  const byHost=links.find(l=>hostOf(l.url)!==museumHost&&SHOP_HOST.test(hostOf(l.url)));
  return byHost?originOf(byHost.url):"";
}
// The museum's own shop: its show page's shop link's site, a shop on the museum's own
// domain (shop.courtauld.ac.uk, a /shop path), or a shop site carrying the museum's
// name (diashop.org). A reseller's shelf for the museum is not.
// A file is never the shop (Petit Palais: a photo of its shop, ".../petit_palais_boutique-01.jpg").
const isFileUrl=u=>/\.(?:jpe?g|png|gif|webp|svg|pdf|mp4)(?:$|[?#])/i.test(String(u||""));
// Nor an app store or a social site (Petit Palais's app on play.google.com/store/…).
const NOT_SHOP_HOST=/(?:^|\.)(?:play\.google|apps\.apple|itunes\.apple|facebook|instagram|twitter|x|tiktok|youtube|linkedin|pinterest|wikipedia)\.[a-z.]+$/i;
const notAShop=u=>isFileUrl(u)||NOT_SHOP_HOST.test(hostOf(u));
function isShopPlace(u,museumHost,pageShopHost){
  const h=hostOf(u).replace(/^www\./,"");
  if(!h)return false;
  if(notAShop(u))return false;
  if(pageShopHost&&h===pageShopHost.replace(/^www\./,""))return true;
  const b=baseDomain(museumHost), hb=baseDomain(h), label=b.split(".")[0], hl=hb.split(".")[0];
  if(hb===b){ let path=""; try{ path=new URL(u).pathname; }catch{} return SHOP_HOST.test(h)||SHOP_PATH.test(path); }
  return label.length>=3&&hl!==label&&hl.includes(label)&&SHOP_HOST.test(hl);
}
// A shop company selling for several museums, on its own site: the section whose address
// names the venue (CEDON's "/Kataloge/Alte-Pinakothek-Muenchen"), for a venue with
// `shopNamed`. Another house's section there is not its shop.
function namesVenue(u,named){
  if(!named||!SHOP_HOST.test(hostOf(u)))return false;
  const w=s=>" "+foldText(s).replace(/[^a-z0-9]+/g," ").trim()+" ";
  return w(pathWords(u)).includes(w(named));
}
// A section names itself in the plural — one book's page or a blog post is not a
// section. Words are read with accents folded.
// German joins its words: "Ausstellungskataloge" (Berlin) ends in "kataloge"; "buecher" is
// "Bücher" in an address.
// Scandinavian joins its words too: "udstillingskataloger" (Louisiana).
const SHELF_CATALOGUES=/\bcatalog(?:ue)?s\b|\bcatalogos\b|\bcatalogi\b|\bcataloghi\b|kataloge\b|kataloger\b/;
// A section of exhibitions' catalogues, first in her order: "Exposiciones: catálogos y guías" (Thyssen) above its
// collection guides and catalogues; "Exhibition catalogues" (Beyeler).
const SHELF_EXHIBITIONS=/\bexhibitions?\b|ausstellung|udstilling|utstallning|tentoonstelling|\bexposicion(?:es)?\b|\bexpositions?\b|\bmostr[ae]\b/;
const SHELF_EXHIBITIONS_ONLY=/^(?:exhibitions|ausstellungen|udstillinger|utstallningar|tentoonstellingen|exposiciones|expositions|mostre)$/;
const SHELF_BOOKS=/\bbooks\b|\bpublications\b|\bpublicaciones\b|\bpublicaties\b|\bpubblicazioni\b|\bpublikationen\b|\bpublikationer\b|\blivres\b|\blibros\b|\bboeken\b|\bbu(?:e)?cher\b|\blibri\b|\bbocker\b|\bboger\b|\bboker\b/;
// A section that says it is NOT books ("All Products (not Catalogues)") is not one.
const SHELF_NOT=/\b(?:not|non|sin|sans|ohne|niet|geen|zonder|except)\b\W+(?:\w+\W+)?(?:catalog|book|boek|libr|livre|public)/;
// A sale or clearance section holds only some of the books ("Catálogos en
// oferta", Thyssen): kept as a last resort, never ahead of a whole section.
const SHELF_SALE=/\b(?:sale|clearance|offers?|outlet|ofertas?|rebajas|saldi|soldes|korting|aanbieding|black friday|promo\w*)\b/;
// Books and only books (her decision): a section mixing books with other goods
// ("Books & Stationery") is never the shelf; it is opened for a books-only section
// inside it. A museum's own publications rank above a general books section.
// German and Scandinavian too: "publikationen" (Albertina, Beyeler), "publikationer", "böcker" (folded "bocker").
const SHELF_PUBS=/\bpublications\b|\bpublicaciones\b|\bpublicaties\b|\bpubblicazioni\b|\bpublikationen\b|\bpublikationer\b/;
const SHELF_GOODS=/\b(?:stationery|stationary|gifts?|toys|games|apparel|clothing|jewell?ery|accessories|homeware|home goods|decor|cards|notecards|journals|notebooks|prints|posters|supplies|merch\w*|souvenirs?|papeterie|cadeaux|jouets|regalos|papeleria|juguetes|cadeaus|speelgoed|regali|cartoleria|giochi)\b/;
// One book's page is not a section (Bider & Tanner's ".../detail/ISBN-978...").
const NOT_A_SHELF=/\/(?:products?|p|detail|blogs?|news|journal|articles?|stories|pages|account|cart)\/|\/isbn-\d|[?&]q=|\/search/i;
// …unless the step after "/products/" is itself a section's word (Albertina's "/en/products/publications/").
const sectionUnderProducts=u=>{ const m=String(u).match(/\/products?\/([^/?#]+)\/?(?:[?#]|$)/i); const w=m?foldText(decodeURIComponent(m[1])).replace(/[-_]/g," "):""; return !!w&&(SHELF_CATALOGUES.test(w)||SHELF_BOOKS.test(w)); };
function pathWords(u){ try{ return decodeURIComponent(new URL(u).pathname).replace(/[-_/.]/g," "); }catch{ return ""; } }
// A shop address's language part: "/de/", "/en-gb/", a Shopify market's "/en-int/" (Louisiana).
const LANG_PART="[a-z]{2}(?:-[a-z]{2,3})?";
function isFrontPage(u){ try{ return new RegExp("^\\/(?:"+LANG_PART+"\\/?)?$","i").test(new URL(u).pathname); }catch{ return true; } }
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
// A SHELF OF BOOKS, READ OFF ITS TEXT: book words and prices, both plural. German joins
// its words ("Ausstellungskataloge", Berlin).
const BOOK_WORD=/\bisbn\b|\bhard(?:cover|back)\b|\bpaperback\b|\bsoftcover\b|\bpages\b|\bcatalog(?:ue|o|us)?s?\b|\bcatalogi\b|kataloge?\b|\bbooks?\b|\bboek(?:en)?\b|\blibros?\b|\blivres?\b|\bbuch\b|\bbu(?:e)?cher\b|\bbok\b|\bbocker\b|\bpublikation(?:en|er)?\b|\bseiten\b|\bsidor\b|\btapa (?:dura|blanda)\b/g;
// Swiss francs and Scandinavian crowns count too (Beyeler "CHF 45.00", Nationalmuseum "SEK 345"), and a
// currency code before the number (Albertina "EUR 24,90").
const PRICE=/[$€£]\s?\d|\b(?:chf|sek|dkk|nok|kr\.?|eur|usd|gbp|aud|cad)\s?\d|\d[.,]\d{2}\s?(?:€|eur\b|usd\b|gbp\b|chf\b|\$|£)|\d\s?(?:sek|dkk|nok|kr)\b/g;
function looksLikeBookShelf(text){
  const t=foldText(text);
  return (t.match(BOOK_WORD)||[]).length>=3&&(t.match(PRICE)||[]).length>=2;
}
const PRODUCT_LINK=/\/products?\/[^/?#]|\/p\/[^/?#]|product_?detail|[?&]product_?id=/i;
function productLinksOn(text,host){ return [...new Set(mdLinks(text).filter(l=>hostOf(l.url)===host&&PRODUCT_LINK.test(l.url)).map(l=>l.url))]; }
function looksLikeOneBook(text){
  const t=foldText(text);
  return /\bisbn\b|\bhard(?:cover|back)\b|\bpaperback\b|\bsoftcover\b/.test(t)&&new RegExp(PRICE.source).test(t);
}
// A shop page that comes back as one line, its title alone, is opened once more with
// "page=1" added: Yale's shop (on Touchnet) sends its menu, lists and books only when the
// address names a page (AL-042). A short page of several lines is a page, never retried
// (a Louvre book page: title, seller, EAN). One copy: the finder, the lookup's book page
// and Re-check. `open` is fetchPage, or a lookup's io.fetch, which counts the call.
const titleOnly=results=>{ const t=pageTextOf(results); return !!t&&!t.includes("\n")&&pageIsShell(results); };
async function openShopPage(open,url,objective,queries,opts){
  const f=await open(url,objective,queries,opts);
  if(!f.ok||!f.results.length||(f.errors||[]).length||!titleOnly(f.results)||/[?&]page=/i.test(url))return f;
  const again=await open(url+(url.includes("?")?"&":"?")+"page=1",objective,queries,opts);
  return again.ok&&again.results.length&&!pageIsShell(again.results)?again:f;
}
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
async function firstProductIsBook(open,text,host,list){
  let items=productLinksOn(text,host), under=false;
  if(items.length<2&&list){ items=itemsUnder(text,host,list); under=true; }
  if(items.length<2)return false;
  const b=await openShopPage(open,items[0],"This book's title, price and ISBN.",null,{full:true});
  // A book under its list's address is read as a gallery's book page: "80 €" with no cents counts.
  return b.ok&&(looksLikeOneBook(pageTextOf(b.results))||(under&&galleryBookPage(pageTextOf(b.results))));
}
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
function shopifyProductsUrl(u){
  try{ const x=new URL(u); return new RegExp("^\\/(?:"+LANG_PART+"\\/)?collections\\/[^/]+\\/?$","i").test(x.pathname)?x.origin+x.pathname.replace(/\/$/,"")+"/products.json?limit=8":""; }catch{ return ""; }
}
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
// The shop's root, keeping a language path its own link chose ("/en/").
function langOf(u){ try{ return ((new URL(u).pathname.match(new RegExp("^\\/("+LANG_PART+")(?:\\/|$)","i"))||[])[1]||"").toLowerCase(); }catch{ return ""; } }
function shopRootOf(u){
  try{ const x=new URL(u), lang=langOf(u); return x.origin+"/"+(lang?lang+"/":""); }catch{ return ""; }
}
// A page's language, for a venue in a country that does not speak English (her design: its shop's
// English version is the one wanted): the address's language part, an "en." site, else its words —
// English beats the others by half again ("In Stock" against "Auf Lager", Albertina). "" when too few.
const EN_WORDS=/\b(?:the|and|of|your|our|with|from|this|are|you|stock|cart|basket|opening hours|shipping|delivery|privacy|books|catalogues?)\b/g;
const NOT_EN_WORDS=/\b(?:und|der|das|mit|fur|oder|zur|auf|lager|warenkorb|og|til|med|af|kurv|ikke|le|les|du|des|pour|avec|panier|el|los|las|del|con|para|carrito|het|een|voor|winkelwagen|il|della|carrello|och|att|varukorg)\b/g;
function pageLanguage(url,text){
  const lang=langOf(url);
  if(lang)return /^en\b/.test(lang)?"en":"other";
  if(/^en\./i.test(hostOf(url)))return "en";
  const t=foldText(stripMd(text)), en=(t.match(EN_WORDS)||[]).length, not=(t.match(NOT_EN_WORDS)||[]).length;
  if(en+not<5)return "";
  return en>not*1.5?"en":"other";
}
const isEnglishUrl=u=>/^en\b/.test(langOf(u))||/^en\./i.test(hostOf(u));
// A language link's label: "English", "Englisch" (Albertina), "EN", in the languages met.
const EN_LABEL=/^(?:en|eng|english|englisch|anglais|ingles|engels|engelsk|engelska|inglese|englanti)$/;
// The shop's English addresses tried when no language link leads there: Louisiana's English shop is
// "/en-int/", its "/en/" not found.
const EN_PATHS=["en/","en-int/","en-gb/","en-us/"];
// A search address only where the shop's platform says how it searches.
function searchFor(text,home){
  const o=originOf(home);
  if(!o)return null;
  if(/\/collections\/|\/products\/|cdn\.shopify/i.test(text))return o+"search?q=";
  if(/catalogsearch/i.test(text))return o+"catalogsearch/result/?q=";
  return null;
}
// The whole shop's search, proved (her decision: a link venue is looked up as the 28
// are, shelf AND search — DIA files a show's book in the show's own section). Each
// common shop search is asked for a book seen on the shop's pages; the first whose
// results carry that book's page is kept. None → null (shelf alone); a call that
// died → undefined, asked again next time. AL-008k, AL-014. Each fallback below runs
// only where the rule before it finds nothing (her decision; CEDON, AL-044).
// The search proof's version: a venue stored under an older one is proved again once.
const SEARCH_RULE=2;
const SEARCH_SHAPES=["search?q=","search.php?search_query=","catalogsearch/result/?q=","?post_type=product&s="];
// Shopware's two searches (CEDON "search?search=", Berlin "search?sSearch="): a second call,
// made only when the first proves nothing — one call carries 20 addresses at most.
const SEARCH_SHAPES_LATER=["search?search=","search?sSearch="];
const PRICE_ONE=new RegExp(PRICE.source,"i");
const NOT_A_BOOK_LINK=/cart|wishlist|account|login/i;
const BLOCK_LINES=6;   // lines of a link's block read for its price
// A shop's buttons beside a price are not books (Cleveland's filter "Reset", the RA's "Shop now").
const BUTTON_LABEL=/^(?:reset|clear(?: all)?|shop(?: now| all)?|details|view(?: all| more)?|more|quick view|add to (?:cart|basket|bag)|buy(?: now)?|zum produkt|jetzt bestellen|optionen w\u00e4hlen|in den warenkorb)$/i;
// "0,00 €" is an empty basket's total, never a book's price (Berlin's "Merkzettel").
const realPrice=l=>PRICE_ONE.test(l)&&!/(?:^|[^\d.,])0[.,]00\s?(?:€|eur\b)|[$£€]\s?0[.,]00\b/i.test(l);
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
// The museum's own Shop page (its own site, a /shop path) and the link on it to a shop on
// another site: one labelled as the shop ("Shop now", "Online shop") or a shop's address.
// At most two such pages opened. → {url, text} or {died}.
const SHOP_AWAY_LABEL=/^(?:shop|buy|order)(?:\s+(?:now|online|here))?$|\bonline\s+(?:shop|store)\b|\bvisit\s+(?:the|our)\s+(?:online\s+)?(?:shop|store)\b/i;
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
const SHELF_OPENS=2;   // at most two candidates opened to check, then the next step
const WALK_OPENS=4;    // at most four of the shop's pages opened to walk it, after the search (her design)
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

// Step 1. A books section written into the venue's rule (the Städel) is offered as found; she confirms it.
function shopFromRule(sf){
  const{own,no}=sf;
  if(!(own.shopCatalogues&&!no.has(normalizeUrlKey(own.shopCatalogues))))return null;
  sf.note("rule",{found:own.shopCatalogues});
  return{shop:"found",shopHome:own.shopHome||originOf(own.shopCatalogues),shopCatalogues:own.shopCatalogues,shopSearch:null,foundBy:"the venue's rule",finder:3,searchRule:SEARCH_RULE};
}

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

// Step 5. A Shopify shop's list of its sections. A list of 250 is read on (Louisiana's design shop lists
// its "Udstillingskataloger" past the first 250), at most SHOPIFY_LIST_PAGES pages.
const SHOPIFY_LIST_PAGES=4;
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

// ── A GALLERY'S SHOP — her design (docs/add_by_link.md, "A gallery's shop") ──
// A gallery sells its books from a shop of its own, on its own site ("Publications", "Library") or another
// (shop.pacegallery.com, a Shopify shop), rarely called a shop. The way in is read off its pages: the show page,
// then its home page, then the usual addresses, then a search. The list taken is the narrowest section that holds its catalogues and can be read (her rule).
// Each step runs only if the one before found nothing. Never "Editions": a gallery's editions are prints.
const GALLERY_OPENS=14;
const GALLERY_WAY_WORD="shop|store|boutique|bookshop|bookstore|books?|publications?|publishing|library|librairie|livres|publikationen|bucher|buecher|libreria|libri|pubblicazioni|publicaciones|libros|tienda|negozio|winkel|butik|webshop";
const GALLERY_WAY=new RegExp("^(?:the\\s+|our\\s+|online\\s+|alle\\s+)*(?:"+GALLERY_WAY_WORD+")(?:\\s+online)?$");
const GALLERY_WAY_PATH=new RegExp("^\\/(?:"+LANG_PART+"\\/)?(?:"+GALLERY_WAY_WORD+")\\/?$","i");
const GALLERY_BUY=/^(?:purchase|buy(?: now)?|add to (?:cart|bag|basket)|shop now|order|acheter|kaufen|in den warenkorb|comprar|acquista)$/;
const GALLERY_SHOP_IN=/\b(?:shop|store|boutique)\b/;
const GALLERY_NOT_PAGE=/\/(?:cart|basket|checkout|account|login|wishlist)\b|ticket/i;
// A book's own page: its price and its make (ISBN, binding, page count), in the languages met.
const GALLERY_BOOK_MAKE=/\bisbn\b|\bhard ?(?:cover|back)\b|\bsoft ?cover\b|\bpaperback\b|\bbroschur|\bgebunden\b|\breliure\b|\bbroche\b|\b\d+\s?(?:pages|pp\b|p\.|s\.|seiten|pagine|paginas)/;
// A price with no cents counts on a book's own page ("80 €", Galerie Karsten Greve).
const GALLERY_PRICE=new RegExp(PRICE.source+"|\\b\\d+\\s?(?:€|eur\\b|chf\\b)");
// A Shopify shop under the gallery's own store name (acquavellagalleries.myshopify.com).
function ownShopifyStore(u,host){
  const h=hostOf(u);
  if(!/\.myshopify\.com$/.test(h))return false;
  const store=h.split(".")[0].replace(/[^a-z0-9]/g,""), own=baseDomain(host).split(".")[0].replace(/[^a-z0-9]/g,"");
  return own.length>=4&&(store.includes(own)||own.includes(store));
}
// A shop's own word for it does too: a line filing it under books ("Books, Editions Mennour").
const GALLERY_BOOK_FILED=/^(?:books?|livres|bucher|libri|libros|catalog(?:ue)?s?)\b/;
const galleryBookPage=t=>{ const f=foldText(t); return (GALLERY_BOOK_MAKE.test(f)||String(t).split("\n").some(l=>GALLERY_BOOK_FILED.test(foldText(stripMd(l)).trim())))&&GALLERY_PRICE.test(f); };
// Which list (her rule): the NARROWEST section that holds the catalogues and can be read. Best first:
// 1 the catalogues ("Catalogues", "Exhibition-Related Books"), 2 the gallery's own publications ("Publications",
// "Gagosian Books", "Perrotin Editions - Books"), 3 books, 4 everything ("All"). Never a section of only some
// books (Selected, New, Rare, Sale…), editions, prints or posters. Lists of one rank: the smaller first.
const GALLERY_CATALOGUES=/\bcatalog(?:ue)?s?\b|\bkatalog(?:e)?\b|\bcataloghi\b|\bcatalogos\b|\bexhibition related\b|\bexhibition books\b/;
const GALLERY_PUBS=/\bpublications?\b|\bpublikationen\b|\bpubblicazioni\b|\bpublicaciones\b|\bpublished by\b|\bpublishers?\b/;
const GALLERY_BOOKS=/\bbooks?\b|\blivres\b|\bbu(?:e)?cher\b|\blibri\b|\blibros\b/;
const GALLERY_PART=/\b(?:new|latest|recent|selected|featured|highlights?|rare|signed|sale|archive|backlist|special|limited|holiday|gifts?|spotlight|edit|zero rated|vat|world book day|wbd|monographs?|artists books|staff picks|pre ?orders?|coming soon|from the archives|writings|lives|biography|kids|children s|childrens|criticism|theory|essays)\b/;
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

// One pro forma file, built in memory, so a link goes through the very same
// door as a sweep. swept_at stays blank: a link is not a sweep, and the
// freshness drawer is about sweeps.
function proFormaCsv(rows){
  const cell=v=>{const s=String(v==null?"":v);return /[",\n\r]/.test(s)?"\""+s.replace(/"/g,"\"\"")+"\"":s;};
  const cols=["venue_code","title","start_date","end_date","summary","url","notes","swept_at"];
  return [cols.join(",")].concat(rows.map(r=>cols.map(c=>cell(r[c])).join(","))).join("\n")+"\n";
}

// ---- Pro forma helpers (pure) ----
const KNOWN_VENUES = new Set(MUSEUMS.map(m=>m.id));
function isValidYMD(s){ if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false; const d=new Date(s+"T00:00:00"); return !isNaN(d.getTime()); }
// Same address = same exhibition: scheme and host lowercased, the path never folded
// (folding it merged two exhibitions differing only in capitals). A trailing slash
// and a #fragment are not part of identity.
function normalizeUrlKey(u){
  try{
    const x=new URL(String(u||"").trim());
    x.hash="";
    const path=x.pathname.replace(/\/+$/,"");
    return x.protocol.toLowerCase()+"//"+x.host.toLowerCase()+path+x.search;
  }catch{ return ""; }
}

function urlLooksValid(u){ if(!u)return false; try{ const url=new URL(String(u).trim()); if(!/^https?:$/.test(url.protocol))return false; if(!/^[a-z0-9.-]+$/i.test(url.hostname))return false; if(!url.hostname.includes("."))return false; return true; }catch{ return false; } }
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

// The ledger gate counts undecided cards; it lives outside the component so fixtures
// reach it (docs/app.md §3). Rejecting IS deciding: only an untouched card is
// undecided. The gate and the per-venue "N to decide" counts both call
// isUndecidedCard, so they can never disagree.
function isUndecidedCard(p,dec){
  dec=dec||{};
  if(p.type==="add")return !dec.mode;
  if(dec.mode)return false;                       // reject, or "different show"
  return !Object.values(dec.fields||{}).some(v=>v);
}

// ===== "PROBABLY NOT FOR YOU" — her design (CLAUDE.md §2.2.7) =====
// Compression labels a NEW show in a topic she always quarantines, writing one
// sentence into the row's notes ("Topic: Asian art."; TOPICS in scraper/compress.js).
// Such a new show, with nothing odd about it, goes in its own section, pre-set to
// Never add; she clicks Add to keep one. Odd cases stay odd: they need her eye.
function topicOf(note){
  const m=/(?:^|\s)Topic: ([^.]+)\./.exec(String(note||""));
  return m?m[1]:null;
}
function isTopicCard(p){
  return !!(p&&p.type==="add"&&p.topic&&!p.merged&&!p.choices&&p.cand&&p.cand.exUrl);
}
function topicPresets(props){
  const d={};
  (props||[]).forEach((p,i)=>{ if(isTopicCard(p))d[i]={mode:"never"}; });
  return d;
}

// ===== PERIOD — the art-period sort (her trial; docs/periods.md) =====
// Claude labels each show with one period from this list and one year; code sorts by
// the list's order, then the year, then her venue order. The list's order is her
// centre-of-gravity rule: Italy, then the North, then France, then America, a region's
// periods placed after the dominant region's periods of the same time (Italy first only
// where two compete); Georgian before Neoclassicism, Belle Époque before Symbolism, Postwar
// Europe after Abstract Expressionism (her reorder). The groups after Contemporary (her decision) take what cannot
// file in the chronology: surveys, stragglers, non-Western art. Themes are labels, never groups.
const PERIODS=[
  {key:"antiquity",name:"Antiquity",span:"before c. 400; ancient art from anywhere"},
  {key:"medieval",name:"Byzantine and Early Medieval",span:"c. 400–1150, Romanesque included"},
  {key:"gothic",name:"Gothic",span:"c. 1150–1375"},
  {key:"intlgothic",name:"International Gothic",span:"c. 1375–1425"},
  {key:"earlyren",name:"Early Renaissance",span:"Italy, c. 1400–1490"},
  {key:"northern",name:"Northern Renaissance",span:"Netherlands, Germany, France, c. 1420–1580 (Van Eyck, Dürer, Bruegel, Holbein)"},
  {key:"tudor",name:"Tudor / Stuart Britain",span:"c. 1485–1714: art made in Britain or at the English court (Holbein and Van Dyck in England, Hilliard, Lely, Kneller)"},
  {key:"highren",name:"High Renaissance",span:"Italy, c. 1490–1530"},
  {key:"venetian",name:"Venetian Renaissance",span:"Venice, c. 1470–1600 (Bellini, Giorgione, Titian, Tintoretto, Veronese)"},
  {key:"mannerism",name:"Mannerism",span:"Italy, c. 1520–1600"},
  {key:"baroque",name:"Italian Baroque",span:"c. 1590–1700"},
  {key:"flemish",name:"Flemish Baroque",span:"c. 1600–1680 (Rubens, Van Dyck, Jordaens)"},
  {key:"dutch",name:"Dutch Golden Age",span:"c. 1600–1700"},
  {key:"spanish",name:"Spanish Golden Age",span:"c. 1580–1700"},
  {key:"classicism",name:"French Classicism",span:"c. 1620–1715 (Poussin, Claude, the age of Louis XIV)"},
  {key:"rococo",name:"Rococo",span:"c. 1715–1775 (Watteau, Boucher, Fragonard, Tiepolo)"},
  {key:"latevenetian",name:"Late Venetian",span:"c. 1700–1790: Venetian views and the Grand Tour (Canaletto, Bellotto, Guardi)"},
  {key:"georgian",name:"Georgian Britain",span:"c. 1714–1830 (Hogarth, Gainsborough, Reynolds, Stubbs)"},
  {key:"neoclassicism",name:"Neoclassicism",span:"c. 1760–1820"},
  {key:"romanticism",name:"Romanticism",span:"c. 1800–1850 (Turner, Constable and Goya included)"},
  {key:"realism",name:"Realism",span:"c. 1840–1880, the Barbizon school and the Salon included"},
  {key:"impressionism",name:"Impressionism",span:"c. 1865–1890, Manet and Degas included"},
  {key:"postimp",name:"Post-Impressionism",span:"c. 1885–1905"},
  {key:"belleepoque",name:"Belle Époque and Aestheticism",span:"c. 1870–1914 (Sargent, Emily Sargent, Whistler, Tissot, Boldini)"},
  {key:"symbolism",name:"Symbolism and Art Nouveau",span:"c. 1880–1910, the Vienna Secession included"},
  {key:"victorian",name:"Victorian Britain",span:"c. 1837–1901, the Pre-Raphaelites included"},
  {key:"american19",name:"19th-century America",span:"c. 1820–1910"},
  {key:"general19",name:"General 19th Century",span:"c. 1800–1900: 19th-century art that is not about one of the movements above"},
  {key:"earlymodern",name:"Early Modernism",span:"c. 1900–1918 (Fauvism, Cubism, Expressionism, Futurism)"},
  {key:"surrealism",name:"Surrealism / Dada",span:"c. 1915–1950 (Duchamp, Ernst, Dalí, Magritte, Miró)"},
  {key:"interwarmod",name:"Interwar Modernism",span:"c. 1918–1945: every style of those years but Surrealism and Dada (Bauhaus, Art Deco, Constructivism, New Objectivity)"},
  {key:"americanmod",name:"American Modernism",span:"c. 1910–1945 (O’Keeffe, Hopper, the Harlem Renaissance)"},
  {key:"postwareu",name:"Postwar Europe",span:"Postwar Europe is a time-and-place period, not a movement: art made in Europe from c. 1945 to 1980, whatever its style or movement. Use it for any show whose works mainly date from that span and place, unless a more specific category on the list fits better."},
  {key:"abex",name:"Abstract Expressionism",span:"c. 1943–1965"},
  {key:"postwaram",name:"Postwar America",span:"America only, c. 1945–1980, outside Abstract Expressionism and Pop: realism, photography, figuration, assemblage, collage and film (Wyeth, Arbus, Neel, Sleigh)"},
  {key:"pop",name:"Pop Art and Minimalism",span:"c. 1955–1980"},
  {key:"general20",name:"General 20th Century",span:"c. 1900–1980: 20th-century art that is not about one of the movements above, self-taught and folk art included"},
  {key:"contemporary",name:"Contemporary",span:"c. 1980 to now"},
  {key:"surveys",name:"Surveys",span:"a show whose works spread across the centuries with no one period at its heart"},
  {key:"mischistoric",name:"Miscellaneous Historic",span:"Western art before 1900 that fits none of the periods above"},
  {key:"miscmodern",name:"Miscellaneous Modern",span:"Western art from 1900 on that fits none of the periods above"},
  {key:"nonwestern",name:"Non-Western Art",span:"art from outside the Western tradition that is not ancient"},
];
// A split period's old key (Surrealism / Dada out of Interwar, her decision): a show still under it
// sorts with the period named here and is asked again by Label.
const PERIOD_RETIRED={interwar:"interwarmod"};
const PERIOD_RANK=Object.fromEntries([...PERIODS.map((p,i)=>[p.key,i]),...Object.entries(PERIOD_RETIRED).map(([k,to])=>[k,PERIODS.findIndex(p=>p.key===to)])]);
const PERIOD_NAME=Object.fromEntries([...PERIODS.map(p=>[p.key,p.name]),...Object.entries(PERIOD_RETIRED).map(([k,to])=>[k,PERIODS.find(p=>p.key===to).name])]);
const periodKey=k=>PERIOD_RETIRED[k]||k;
const PERIOD_BATCH=40;

// THEMES (her design): a show of a kind of thing still sits in its period; its themes are
// labels, any number per show, for the filter row. A chip may hold several labels
// (Fashion & Jewellery), so she can regroup chips without relabelling.
const THEMES=[
  {key:"fashion",name:"Fashion",chip:"fashion",rule:"clothes, dress, costume, and cloth made for clothes"},
  {key:"jewellery",name:"Jewellery",chip:"fashion",rule:"jewellery"},
  {key:"architecture",name:"Architecture",chip:"architecture",rule:"buildings and architects"},
  {key:"capriccio",name:"Capriccio",chip:"architecture",rule:"capriccio: an architectural fantasy combining real or invented ruins in an imaginary arrangement (Hubert Robert, Panini); ruin painting"},
  {key:"veduta",name:"Veduta",chip:"architecture",rule:"veduta: an accurate topographical view of a city or place (Canaletto; Piranesi's Vedute di Roma)"},
  {key:"sculpture",name:"Sculpture",chip:"sculpture",rule:"sculpture"},
  {key:"animals",name:"Animals",chip:"animals",rule:"animals: dogs, cats, horses, birds, mythical creatures"},
  {key:"nature",name:"Nature",chip:"nature",rule:"trees, plants, flowers, botanical drawings of them, gardens, clouds; NOT landscape painting in general, NOT still life, NOT animals (those are animals); do not label Nature just because the show is displayed outdoors or in a garden"},
  {key:"photography",name:"Photography",chip:"photography",rule:"photography"},
  {key:"dechard",name:"Decorative Arts – Hard",chip:"dechard",rule:"hard decorative objects: furniture, ceramics, porcelain, glass, silver, metalwork; NOT books or manuscripts (those are books)"},
  {key:"decsoft",name:"Decorative Arts – Soft",chip:"decsoft",rule:"soft decorative arts: wallpaper, carpets, drapery, fabric (chintz), soft furnishings, textiles, interior design; also a show described only as \"decorative arts\", naming no kinds; NOT cloth for clothes, such as dress silks (that is fashion)"},
  {key:"books",name:"Books",chip:"books",rule:"rare books, book collections, illuminated manuscripts, and albums: a collector's book of drawings or prints, bound together (Vasari's Book of Drawings)"},
];
const THEME_KEYS=new Set(THEMES.map(t=>t.key));
const THEME_NAME=Object.fromEntries(THEMES.map(t=>[t.key,t.name]));
// Her chips, in her order; Ex-themes is every labelled show with no theme, Surveys and
// Non-Western Art included (they are groups, not themes).
const THEME_CHIPS=[["fashion","Fashion & Jewellery"],["architecture","Architecture"],["sculpture","Sculpture"],["animals","Animals"],["nature","Nature"],["photography","Photography"],["dechard","Decorative – Hard"],["decsoft","Decorative – Soft"],["books","Books"],["exthemes","Ex-themes"]];
const THEME_CHIP_OF=Object.fromEntries(THEMES.map(t=>[t.key,t.chip]));
// A theme chip set and a labelled show: in when any of its themes is under a picked chip,
// or Ex-themes is picked and it has none. A show never asked about themes is in none.
function themeMatch(r,picked){
  if(!Array.isArray(r.themes))return false;
  if(picked.has("exthemes")&&!r.themes.length)return true;
  return r.themes.some(k=>picked.has(THEME_CHIP_OF[k]));
}

const periodLabelled=r=>!!(r&&PERIOD_RANK[r.period]!==undefined&&Number.isInteger(r.periodYear));
const isBuyNext=r=>!!r&&r.acquiring==="yes"&&!!r.buyNext;
// Label fills a show missing its period or its themes (a show labelled before themes is asked again).
// When a show was last labelled: a Relabel, else its Label run or import (the Recently labelled sort).
const lastLabel=r=>(r&&(r.relabelledAt||r.labelledAt))||"";
const labelDone=r=>periodLabelled(r)&&Array.isArray(r.themes)&&!PERIOD_RETIRED[r.period];
const periodYearText=y=>"c. "+(y<0?(-y)+" BC":y);
const periodText=r=>periodLabelled(r)?[PERIOD_NAME[r.period],periodYearText(r.periodYear),...(r.themes||[]).map(k=>THEME_NAME[k])].join(" · "):"";
// The two stragglers' groups split at 1900 (her cut-off) — decided here, not by Claude.
// Claude's Misc answers stand: the bins show what no rule yet files (her decision).
const miscFor=y=>y<1900?"mischistoric":"miscmodern";

// One artist, one group (her decision): shows about one artist take the group most of
// them were given; a tie goes to the earlier group. A response show keeps its own.
const artistKey=a=>String(a||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z]+/g," ").trim();
function artistPeriods(rows){
  const tally=new Map();
  for(const r of rows){
    if(!periodLabelled(r)||r.periodResponse||periodKey(r.period)==="tudor")continue;
    const k=artistKey(r.periodArtist); if(!k)continue;
    const t=tally.get(k)||{}, p=periodKey(r.period); t[p]=(t[p]||0)+1; tally.set(k,t);
  }
  const out=new Map();
  for(const [k,t] of tally)out.set(k,Object.keys(t).sort((a,b)=>(t[b]-t[a])||(PERIOD_RANK[a]-PERIOD_RANK[b]))[0]);
  return out;
}
// An English-years show keeps Tudor / Stuart, whatever the artist's other shows (her decision).
// "Do not regroup" (`periodKeep`) keeps Claude's answer until the next Relabel; the show still
// counts in its artist's tally (docs/periods.md).
const periodOf=(r,byArtist)=>(!r.periodResponse&&!r.periodKeep&&periodKey(r.period)!=="tudor"&&byArtist&&byArtist.get(artistKey(r.periodArtist)))||periodKey(r.period);
// Period order; within a period, response shows last (her decision), then the year, then
// her venue order (her tie rule).
function periodCompare(a,b,byArtist){
  return (PERIOD_RANK[periodOf(a,byArtist)]-PERIOD_RANK[periodOf(b,byArtist)])||((a.periodResponse?1:0)-(b.periodResponse?1:0))
    ||(a.periodYear-b.periodYear)||(venueRank(a.museumId)-venueRank(b.museumId));
}

// One question for up to PERIOD_BATCH shows; each line carries its index i.
function periodPrompt(shows){
  return [
    "You are an art historian. For each exhibition below, name the art period of the art it shows, and one year.",
    "",
    "period: the key of ONE period from this list. The list is in its sorting order, not strict date order:",
    ...PERIODS.map(p=>"  "+p.key+" — "+p.name+" ("+p.span+")"),
    "",
    "Rules:",
    "- Pick by the date and place of the art itself, not the exhibition's theme words.",
    "- Names in a period's description stand for shows about those artists, not for every show that mentions them.",
    "- Italian art of c. 1400–1600 goes in the Italian periods; Netherlandish, German and French art of that time in Northern Renaissance.",
    "- A recent artist responding to older art, or a show pairing artists of different periods: the period of the OLDER art, with its year, and response true.",
    "- A show of art responding to one older source (a text, a myth or a story): the period most of its works come from (its heart), with that period's year, and response true.",
    "- A movement's period only for a show about that movement or its artists. Other 19th-century art: general19.",
    "- A show spanning a long stretch: the period most of its works come from (its heart), with that period's year. Only when the works spread across the centuries with no one period at its heart: surveys, with the midpoint year.",
    "- A show split evenly between two or three neighbouring periods, with no one heart: the EARLIEST of them, with its year (Ingres and Delacroix: neoclassicism) — never a general or miscellaneous group.",
    "- Ancient art from anywhere (Egypt, Greece, Rome, Mesopotamia): antiquity.",
    "- Art from outside the Western tradition that is not ancient (Asian, Islamic, African, Oceanic, Indigenous): nonwestern.",
    "- Fashion, jewellery, decorative arts, design, architecture, photography and books take a period like any other show: the period whose years and place hold the work, even when the show is not about that movement's artists.",
    "- Other 20th-century art, self-taught and folk art included: general20 (to 1980), then contemporary — except European art of c. 1945–1980, which is postwareu.",
    "- Western work that fits none of the periods, not even general19 or general20: mischistoric before 1900, miscmodern from 1900.",
    "- A show about an artist's years in Britain or at the English court (Holbein at the Tudor court, Van Dyck in England): tudor. A general retrospective of such an artist stays in the artist's home period (Holbein: northern; Van Dyck: flemish).",
    "",
    "themes: a list of the keys below for what KIND of thing the show is about — none, one or several. A theme never changes the period.",
    ...THEMES.map(t=>"  "+t.key+" — "+t.rule),
    "- capriccio or veduta (one or both): give it AND architecture (Hubert Robert: capriccio, architecture).",
    "- A decorative-arts show whose description names its kinds gets the theme of each kind named (ceramics and furniture: dechard; furnishings: decsoft).",
    "- Do not label shows by their staging – eg. a sculpture show in a garden is not Nature, a show of paintings among drapery is not Decorative Arts.",
    "- A show of paintings or drawings in general gets no theme unless its subject is one of the above (a show of horse paintings: animals).",
    "",
    "year: one whole number, the year of the art shown (negative for BC). One artist: the middle of the works shown. A show spanning a long stretch: the midpoint of the stretch.",
    "response: true or false, as above.",
    "artist: for a show about ONE artist, their full name as usually written (\"John Singer Sargent\"); otherwise \"\".",
    "why: one short sentence on what in the exhibition's text decided the period and year.",
    "",
    "Answer with JSON only, one entry per exhibition: {\"labels\":[{\"i\":0,\"period\":\"highren\",\"year\":1510,\"response\":false,\"artist\":\"Raphael\",\"themes\":[],\"why\":\"Raphael's works of about 1510.\"}]}",
    "",
    "Exhibitions:",
    ...shows.map(s=>JSON.stringify({i:s.i,venue:s.venue,title:s.title,dates:s.dates,text:String(s.summary||"").replace(/\s+/g," ").slice(0,600)})),
  ].join("\n");
}
// Claude's answer, checked: only a listed period and a sensible whole year are kept.
// A label with no themes list is not a label: it is asked again, never taken as "no theme".
// Returns a Map from i to {period, periodYear, periodResponse, periodArtist, themes}.
function periodAnswers(data){
  const out=new Map();
  for(const x of (data&&Array.isArray(data.labels))?data.labels:[]){
    const i=Number(x&&x.i), y=Number(x&&x.year);
    let k=String((x&&x.period)||"").trim().toLowerCase();
    if(!Number.isInteger(i)||PERIOD_RANK[k]===undefined||PERIOD_RETIRED[k]||!Number.isInteger(y)||y<-5000||y>2100||!Array.isArray(x.themes))continue;
    if(k==="mischistoric"||k==="miscmodern")k=miscFor(y);
    const themes=[...new Set(x.themes.map(t=>String(t||"").trim().toLowerCase()).filter(t=>THEME_KEYS.has(t)))];
    // Capriccio and veduta always come with architecture (her decision).
    if((themes.includes("capriccio")||themes.includes("veduta"))&&!themes.includes("architecture"))themes.push("architecture");
    const artist=typeof x.artist==="string"?x.artist.trim().slice(0,120):"";
    out.set(i,{period:k,periodYear:y,periodResponse:x.response===true,periodArtist:artist,themes});
  }
  return out;
}
// The page's Claude refuses in spells, so a batch that fails, or comes back with no label,
// is asked again after a wait (her decision: 15 seconds, then a minute), and every batch
// still unlabelled gets one last go after a pause at the end.
const LABEL_WAITS={retry:[15000,60000],lastGo:60000};
const pause=ms=>new Promise(res=>setTimeout(res,ms));
// Label's own words for a failed ask: the lookup's wording speaks of search results.
function labelWhy(ask){
  const code=ask.code||"";
  if(code==="not_granted")return "You declined to let this page use Claude.";
  if(code==="invalid_json")return "Claude\u2019s answer came back unreadable.";
  if(code==="rate_limited")return "Claude is rate-limited.";
  if(code==="unavailable")return ask.detail;
  return "Claude didn\u2019t answer ("+(code||"unknown")+").";
}
// Labels shows ({i, venue, title, dates, summary}) in batches. onBatch(done,total) reports
// progress. Returns {labels: Map i → label, batches: [{shows, labelled, tries, why}]}.
async function labelPeriods(shows,onBatch,waits=LABEL_WAITS){
  const labels=new Map(), batches=[];
  const ask=async b=>{
    b.tries++;
    const res=await readResults(periodPrompt(b.batch));
    if(!res.ok){ b.why=labelWhy(res); b.stop=res.code==="not_granted"||res.code==="unavailable"; return; }
    const want=new Set(b.batch.map(s=>s.i));
    for(const [i,v] of periodAnswers(res.data))if(want.has(i)&&!labels.has(i)){ labels.set(i,v); b.labelled++; }
    b.why=b.labelled<b.batch.length?(b.batch.length-b.labelled)+" left out of Claude\u2019s answer":null;
  };
  for(let n=0;n<shows.length;n+=PERIOD_BATCH){
    const b={batch:shows.slice(n,n+PERIOD_BATCH),labelled:0,tries:0,why:null,stop:false};
    await ask(b);
    for(const ms of waits.retry){ if(b.labelled||b.stop)break; await pause(ms); await ask(b); }
    batches.push(b);
    if(onBatch)onBatch(Math.min(n+PERIOD_BATCH,shows.length),shows.length);
  }
  const left=batches.filter(b=>!b.labelled&&!b.stop);
  if(left.length){ await pause(waits.lastGo); for(const b of left)await ask(b); }
  return {labels,batches:batches.map(b=>({shows:b.batch.length,labelled:b.labelled,tries:b.tries,why:b.why}))};
}
// Her line after a Label: all done, or how many were not and why.
function labelSummary(total,batches){
  const done=batches.reduce((a,b)=>a+b.labelled,0);
  if(done===total)return {ok:true,text:"Label: all "+total+" exhibitions labelled."};
  const whys=[...new Set(batches.filter(b=>b.why).map(b=>b.why.replace(/\.$/,"")))];
  return {ok:false,text:"Label: "+done+" of "+total+" exhibitions labelled; "+(total-done)+" not — "+whys.join("; ")+"."};
}
const periodShow=(i,r)=>({i,venue:(MU[r.museumId]||{}).name||r.museumId,title:r.title,dates:dateRange(r),summary:r.summary});

// Every decided card lands in one count — to apply, quarantined or rejected — so the
// footer adds up (her ask). The counts and the link box both use cardOutcome.
function cardOutcome(p,dec){
  dec=dec||{};
  if(isUndecidedCard(p,dec))return"undecided";
  if(p.type==="add")return dec.mode==="accept"?"accepted":dec.mode==="never"?"quarantined":"rejected";
  if(dec.mode==="addnew")return"accepted";
  return Object.values(dec.fields||{}).some(v=>v==="accept")?"accepted":"rejected";
}
// What the shop finder found for a venue, before her answer on the shop screen.
const SHOP_FIELDS=["shop","shopHome","shopCatalogues","shelfKind","shopSearch","why","shopEnglishUnread","englishPicked","shopAdded","confirmed"];
const foundShop=v=>Object.fromEntries(SHOP_FIELDS.filter(k=>v[k]!==undefined).map(k=>[k,v[k]]));
// The venues as stored when the ledger moves: her shop answer kept only for a venue with a card going in
// (her decision: a show not imported leaves its venue's shop unanswered, asked again at its first import).
function answeredOnly(venues,saved,going){
  const out={};
  for(const [id,v] of Object.entries(venues||{})){
    const{beforeAnswer,...rest}=v||{};
    out[id]=beforeAnswer&&!going.has(id)?(saved&&saved[id]?saved[id]:{...rest,...SHOP_FIELDS.reduce((o,k)=>(o[k]=null,o),{}),...beforeAnswer,confirmed:false}):rest;
  }
  return out;
}
// The venues outside her list with at least one card going in. A venue whose every card is
// rejected, undecided or quarantined is not asked about its shop (her decision; AL-046).
function venuesGoingIn(proposals,decisions){
  const ids=new Set();
  (proposals||[]).forEach((p,i)=>{ const id=(p.cand||{}).museumId; if(isOcc(id)&&cardOutcome(p,(decisions||{})[i])==="accepted")ids.add(id); });
  return ids;
}
function countDecisions(proposals,decisions){
  let acceptedCount=0,undecidedCount=0,quarantinedCount=0,rejectedCount=0;
  (proposals||[]).forEach((p,i)=>{
    const o=cardOutcome(p,(decisions||{})[i]);
    if(o==="undecided")undecidedCount++;
    else if(o==="accepted")acceptedCount++;
    else if(o==="quarantined")quarantinedCount++;
    else rejectedCount++;
  });
  return {acceptedCount,undecidedCount,quarantinedCount,rejectedCount};
}

// ===== PARTIAL APPLY — stays until she says (CLAUDE.md §5.1) =====
// Offered only in the middle state: something decided AND something undecided. Out of
// the component so fixture 18h tests this copy.
function offerPartialApply(counts){
  const c=counts||{};
  return (c.acceptedCount||0)>0 && (c.undecidedCount||0)>0;
}

// Merge, never replace: a venue's dates move only for a LATER time, so an old sweep
// file cannot drag them backwards. Tried and brought-rows move independently.
function mergeSweepLog(prev,seen){
  const out={...(prev||{})};
  const later=(a,b)=>(!a||(b&&b>a))?b:a;
  for(const v of Object.keys((seen&&seen.attempted)||{})){
    const was=out[v]||{};
    out[v]={
      attempted: later(was.attempted, seen.attempted[v]),
      returned:  later(was.returned,  (seen.returned||{})[v]||null),
    };
  }
  return out;
}

// ── QUARANTINE — in the page's store AND her export (docs/app.md §4) ────────
// It is her judgement, derivable from nothing, so it cannot live only in the store;
// in the ledger alone, a Reset brings the junk back. Latest decision wins, which needs
// tombstones: a release is stored as `released`, or an older backup would re-block it.
const QUARANTINE_DOC = "quarantine/rows";

// Both sides are {key: {venueId, title, at, state}}. Nothing is dropped and
// nothing is invented: for each key the entry with the LATER `at` survives,
// whichever side it came from.
function mergeQuarantine(prev, incoming){
  const out={...(prev||{})};
  for(const [k,v] of Object.entries(incoming||{})){
    if(!v||!v.at) continue;
    const was=out[k];
    if(!was||!was.at||v.at>was.at) out[k]={...v};
  }
  return out;
}
// What she sees and what the export carries: the ones still blocked, newest
// first. Tombstones never leave this file.
function activeQuarantine(map){
  return Object.entries(map||{})
    .filter(([,v])=>v&&v.state!=="released")
    .map(([key,v])=>({key,venueId:v.venueId,title:v.title,at:v.at}))
    .sort((a,b)=>String(b.at||"").localeCompare(String(a.at||"")));
}
// A ledger file stores the plain list it always did, so an older backup loads
// unchanged and a newer one is readable by an older build.
function quarantineFromList(list){
  const out={};
  for(const x of (list||[])) if(x&&x.key) out[x.key]={venueId:x.venueId,title:x.title,at:x.at||"",state:"blocked"};
  return out;
}

// URGENCY COLOURS, ONE SET PER THEME. Dark washes are deep tints of the same hue, not
// the light ones dimmed, so the ladder keeps its meaning.
const TIER_SETS = {
  light: {
    upcoming: { ink: "#4A5A6B", wash: "#E1E5EB" },
    recent:   { ink: "#2D6B5A", wash: "#D4EDE4" },
    current:  { ink: "#2D4A3F", wash: "#DBE7E1" },
    fresh:    { ink: "#556B3E", wash: "#E3E8D8" },
    closing:  { ink: "#9C7020", wash: "#F0E6CE" },
    urgent:   { ink: "#A13823", wash: "#F0DCD6" },
    lapsed:   { ink: "#6B2E2E", wash: "#E5D6D4" },
    unknown:  { ink: "#6A6560", wash: "#E3DED7" },
  },
  dark: {
    upcoming: { ink: "#A8BDD4", wash: "#26313D" },
    recent:   { ink: "#7FD6B8", wash: "#193328" },
    current:  { ink: "#8FC4AE", wash: "#1B2B24" },
    fresh:    { ink: "#B4C98C", wash: "#242B1A" },
    closing:  { ink: "#E0B45C", wash: "#33280F" },
    urgent:   { ink: "#F09079", wash: "#3A1E17" },
    lapsed:   { ink: "#D9928F", wash: "#331C1C" },
    unknown:  { ink: "#A8A29A", wash: "#2A2622" },
  },
};
const TIER_TEXT = {
    upcoming: { label: "Announced", note: "Not open yet. Catalogue usually appears at opening.", time: "upcoming", ord: 2 },
    recent: { label: "Recently opened", note: "Just opened. Catalogue should be available now.", time: "current", ord: 0 },
    current: { label: "On now", note: "In print. Cheapest it will ever be.", time: "current", ord: 1 },
    fresh: { label: "Closed under 3 months", note: "Still stocked. Comfortable window.", time: "past", ord: 4 },
    closing: { label: "Closed 3\u20136 months", note: "Shop stock thinning. Buy now if you want it.", time: "past", ord: 5 },
    urgent: { label: "Closed 6\u201312 months", note: "Final call. Reprints are rare.", time: "past", ord: 6 },
    lapsed: { label: "Closed over a year", note: "Assume out of print. Secondhand only.", time: "past", ord: 7 },
    // After Announced — her ordering.
    unknown: { label: "Dates unclear", note: "No reliable end date found.", time: "current", ord: 3 },
};
const tiersFor = mode => Object.fromEntries(Object.keys(TIER_TEXT).map(
  k => [k, { ...TIER_TEXT[k], ...TIER_SETS[mode][k] }]));
// TIERS (light values) serves labels and `ord` outside the component; colour comes
// from the component's themed copy.
const TIERS = tiersFor("light");

function relTime(iso){if(!iso)return null;const d=new Date(iso);if(isNaN(d))return null;const s=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));if(s<60)return"just now";const m=Math.floor(s/60);if(m<60)return m+" minute"+(m===1?"":"s")+" ago";const h=Math.floor(m/60);if(h<24)return h+" hour"+(h===1?"":"s")+" ago";const day=Math.floor(h/24);return day+" day"+(day===1?"":"s")+" ago";}
function minsSinceIso(iso){if(!iso)return Infinity;const d=new Date(iso);if(isNaN(d))return Infinity;return(Date.now()-d.getTime())/60000;}
const MS_MO=1e3*60*60*24*30.44, MS_WK=1e3*60*60*24*7;
const moSince=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");return isNaN(x)?null:(Date.now()-x)/MS_MO;};
const wksSince=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");return isNaN(x)?null:(Date.now()-x)/MS_WK;};

// The buy-next dot matches the star's measured ink (her decision): 85% of its height,
// centred on it, because a disc reads larger than a star. No canvas → an 11px dot.
let starInkCache=null;
function starInk(){
  if(starInkCache)return starInkCache;
  let out={a:12,d:1};
  try{
    const b=document.createElement("button");b.style.fontSize="16px";document.body.appendChild(b);
    const f=getComputedStyle(b);const font=f.fontStyle+" "+f.fontWeight+" 16px "+f.fontFamily;b.remove();
    const c=typeof OffscreenCanvas==="function"?new OffscreenCanvas(1,1).getContext("2d"):null;
    if(c){c.font=font;const m=c.measureText("\u2605");const h=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
      if(h>0&&h<=16)out={a:m.actualBoundingBoxAscent,d:m.actualBoundingBoxDescent};}
  }catch{}
  const D=Math.round((out.a+out.d)*0.85*2)/2;
  return starInkCache={D,v:(out.a-out.d-D)/2};
}

// Closing Window on the counts line (her decision): Yes-wanted catalogues whose show
// closed 3–12 months ago.
function inClosingWindow(r){
  if(!r||!r.interested||r.acquiring!=="yes")return false;
  const t=tierFor(r);
  return t==="closing"||t==="urgent";
}

function tierFor(r){
  const now=new Date(),st=r.startDate?new Date(r.startDate+"T00:00:00"):null,en=r.endDate?new Date(r.endDate+"T00:00:00"):null;
  if(st&&!isNaN(st)&&st>now)return"upcoming";
  if(en&&!isNaN(en)){if(en>=now){return(st&&wksSince(r.startDate)<=6)?"recent":"current";}const m=moSince(r.endDate);if(m<3)return"fresh";if(m<6)return"closing";if(m<12)return"urgent";return"lapsed";}
  if(st&&!isNaN(st)&&st<=now)return wksSince(r.startDate)<=6?"recent":"current";
  return"unknown";
}

// The seed set: ~110 rows read before the scraper existed (docs/app.md §6).
const S=[
["met","Musical Bodies","2026-06-07","2026-09-27","Instruments as sculptural and bodily objects from the Met's collection.","musical-bodies"],
["met","Costume Art","2026-05-10","2027-01-10","Costume Institute spring show. Inaugurates new fashion galleries.","costume-art"],
["met","Giacometti in the Temple of Dendur","2026-06-12","2026-09-08","Giacometti's elongated figures alongside the Egyptian temple.","giacometti-in-the-temple-of-dendur"],
["met","Orientalism: Between Fact and Fantasy",null,"2027-02-28","Nineteenth-century European depictions of the Middle East and North Africa.","orientalism-between-fact-and-fantasy"],
["met","Futurism, Constructivism, and Dada in Georgia",null,"2026-10-27","The avant-garde in Tbilisi during Georgia's brief independence.","futurism-constructivism-and-dada-in-georgia-1917-1928"],
["met","Rediscovering Della Robbia at The Met",null,"2028-01-17","Glazed terracotta from the Della Robbia workshop.","rediscovering-della-robbia-at-the-met"],
["met","Revolution!",null,"2026-09-07","Prints and visual material around revolutionary upheaval.","revolution"],
["met","City of Memory: Nanjing",null,"2027-01-03","Chinese painting from the Ming\u2013Qing transition.","city-of-memory-nanjing-in-the-17th-century"],
["met","Household Gods",null,"2027-06-27","Hindu devotional chromolithographs and domestic devotion.","household-gods-hindu-devotional-prints-1860-1930"],
["met","Ecologies of Painting",null,"2027-01-17","Painting through landscape, environment and material relations.","ecologies-of-painting"],
["met","Flip Sides: Seeing Korean Art Anew",null,"2027-05-31","Korean objects revealing their reverse or hard-to-see aspects.","flip-sides-seeing-korean-art-anew"],
["met","The Infinite Artistry of Japanese Ceramics",null,"2027-08-08","Japanese ceramic traditions across technique, glaze and form.","the-infinite-artistry-of-japanese-ceramics"],
["met","Cottage Industry: Val-Kill Furniture Shop",null,"2027-05-09","Eleanor Roosevelt's Val-Kill workshop.","cottage-industry-the-val-kill-furniture-shop"],
["met","Afterlives: Contemporary Art in the Byzantine Crypt",null,"2027-01-10","Contemporary work in the Byzantine galleries.","afterlives-contemporary-art-in-the-byzantine-crypt"],
["met","Celebrating the Year of the Horse",null,"2027-01-26","Asian works for the lunar new year.","celebrating-the-year-of-the-horse"],
["met","Independence and Identity",null,"2026-09-29","Works on paper addressing independence movements.","independence-and-identity-selections-from-the-department-of-drawings-and-prints"],
["met","A King\u2019s Carpet: Louis XIV and the Savonnerie","2026-09-08","2028-03-05","Savonnerie carpets and French court display.","a-kings-carpet-louis-xiv-and-the-savonnerie"],
["met","Chasing Clouds","2026-09-14","2027-02-28","Cloud studies across painting, drawing and photography.","chasing-clouds"],
["met","The Genesis Facade Commission: Liu Wei","2026-09-17","2027-06-08","Liu Wei's sculptures for the facade niches.","the-genesis-facade-commission-liu-wei"],
["met","David Hartt: Peripheries","2026-09-25","2027-02-07","Architecture, migration and the edges of cities.","david-hartt-peripheries"],
["met","There Are No Words: Si Lewen\u2019s Parade","2026-10-01","2027-01-05","Wordless picture sequence on war.","there-are-no-words-si-lewens-parade"],
["met","Krasner and Pollock: Past Continuous","2026-10-04","2027-01-31","Lee Krasner and Jackson Pollock, exchange and divergence.","krasner-and-pollock-past-continuous"],
["met","Designing the Gilded Age: Tiffany","2026-10-22","2027-02-07","Drawings from Tiffany's decorating studios.","designing-the-gilded-age-drawings-from-the-studios-of-louis-c-tiffany"],
["met","Across Wine-Dark Seas","2026-12-20","2027-04-11","Greek visual culture around the Mediterranean.","across-wine-dark-seas-art-and-identity-beyond-ancient-greece"],
["met","John Galliano: Horizons","2027-05-09","2028-01-09","Costume Institute 2027 on Galliano's career.","john-galliano-horizons"],
["met","Lillian Bassman: Bazaar and Beyond","2026-03-02","2026-07-26","Fashion photographer for Harper's Bazaar.","lillian-bassman-bazaar-and-beyond"],
["met","Gothic by Design","2026-04-16","2026-07-19","Architectural drawing in the Gothic period.","gothic-by-design-the-dawn-of-architectural-draftsmanship"],
["met","Raphael: Sublime Poetry","2026-03-29","2026-06-28","First comprehensive US presentation of Raphael.","raphael-sublime-poetry"],
["met","A Passion for Jade","2022-07-02","2026-06-28","Heber Bishop's jade collection.","passion-for-jade"],
["met","Embracing Color: Enamel in Chinese Decorative Arts","2022-07-02","2026-06-28","Cloisonn\u00e9 and painted enamel across six centuries.","embracing-color"],
["met","Making It Modern: European Ceramics","2025-06-16","2026-06-14","Studio ceramics from the Eidelberg collection.","making-it-modern-european-ceramics-from-the-martin-eidelberg-collection"],
["met","The Genesis Facade Commission: Jeffrey Gibson","2025-09-12","2026-06-09","Gibson's beaded sculptures for the facade.","the-facade-commission-jeffrey-gibson"],
["met","Iba Ndiaye","2025-05-31","2026-05-31","Senegalese modernist painter.","iba-n-diaye-between-latitude-and-longitude"],
["met","The Magical City: George Morrison\u2019s New York","2025-07-17","2026-05-31","Ojibwe painter's abstract New York work.","the-magical-city-george-morrison-s-new-york"],
["met","Fanmania","2025-12-11","2026-05-12","Folding fans as fashion and display.","fanmania"],
["met","Chinese Painting and Calligraphy","2025-11-22","2026-05-10","Rotation from the Met's holdings.","chinese-painting-and-calligraphy-selections-from-the-collection"],
["met","View Finding: Walther Collection","2025-10-28","2026-05-03","Photography, African and diasporic practice.","view-finding-selections-from-the-walther-collection"],
["met","Seeing Silence: Helene Schjerfbeck","2025-12-05","2026-04-05","Finnish painter's pared-back portraits.","seeing-silence-the-paintings-of-helene-schjerfbeck"],
["met","Jousting Armor of Philip I of Castile","2023-05-11","2026-04-01","Rare surviving jousting harness.","the-jousting-armor-of-philip-i-of-castile"],
["met","Spectrum of Desire: Middle Ages","2025-10-17","2026-03-29","Medieval desire, sexuality and gender.","spectrum-of-desire-love-sex-and-gender-in-the-middle-ages"],
["met","Emily Sargent: Portrait of a Family","2025-07-01","2026-03-08","Watercolours by Sargent's sister.","emily-sargent-portrait-of-a-family"],
["met","Impressions of the Imagination","2026-02-05","2026-03-03","Printed bestiary imagery.","impressions-of-the-imagination-new-medieval-beasts-in-print"],
["met","The Brooklyn Bridge Up Close","2025-12-08","2026-02-22","Bridge construction in drawings and prints.","the-brooklyn-bridge-up-close"],
["met","Colorful Korea","2024-12-02","2026-02-16","Korean textiles and ceramics.","colorful-korea"],
["met","Witnessing Humanity: John Wilson","2025-09-20","2026-02-08","African American figurative work on race and dignity.","witnessing-humanity-the-art-of-john-wilson"],
["met","Man Ray: When Objects Dream","2025-09-14","2026-02-01","Photographs, rayographs across Dada and Surrealism.","man-ray-when-objects-dream"],
["met","Celebrating the Year of the Snake","2025-01-11","2026-02-01","Asian works featuring the snake.","celebrating-the-year-of-the-snake"],
["met","Casa Susanna","2025-07-21","2026-01-25","1950s\u201360s Catskills retreat photographs.","casa-susanna"],
["met","Divine Egypt","2025-10-12","2026-01-19","Major Egyptian exhibition on twenty deities.","divine-egypt"],
["met","Christmas Tree and Neapolitan Cr\u00e8che","2025-11-25","2026-01-06","Annual Neapolitan cr\u00e8che figures.","christmas-tree-and-neapolitan-baroque-creche-2025"],
["met","Ganesha: Lord of New Beginnings","2022-11-19","2026-01-04","Depictions of Ganesha across Asian art.","ganesha"],
["ng","Zurbar\u00e1n",null,"2026-08-23","First UK exhibition of Zurbar\u00e1n.","zurbaran"],
["ng","Monet and Renoir: Painting Side by Side","2026-07-27","2026-09-15","Two Impressionist paintings at the same motif.","monet-and-renoir-painting-side-by-side"],
["ng","Waldm\u00fcller: Landscapes","2026-07-02","2026-09-20","First UK exhibition of Waldm\u00fcller.","waldmuller-landscapes"],
["ng","Take One Picture 2026",null,"2026-08-31","Children's artworks inspired by Canaletto.","take-one-picture-2026"],
["ng","Renoir and Love","2026-10-03","2027-01-31","Renoir gathered around the theme of love.","renoir-and-love"],
["ng","Yinka Shonibare and Gainsborough","2026-10-15","2027-02-07","Britain's celebrated work reimagined.","yinka-shonibare-and-thomas-gainsborough-a-conversation"],
["ng","Van Eyck: The Portraits","2026-11-21","2027-04-11","All of Van Eyck's portraits together.","van-eyck-the-portraits"],
["ng","Catharina van Hemessen","2027-03-04","2027-05-30","Renaissance artist who painted herself into history.","catharina-van-hemessen"],
["ng","German Expressionism","2027-03-20","2027-08-01","Fifty German Expressionist works.","german-expressionism-modern-painting-1900-1918"],
["ng","Stubbs: Portrait of a Horse","2026-03-12","2026-05-31","George Stubbs, master of horse painting.","past/stubbs-portrait-of-a-horse"],
["ng","Wright of Derby: From the Shadows","2025-11-07","2026-05-10","Joseph Wright of Derby's candlelight paintings.","past/wright-of-derby-from-the-shadows"],
["ng","Ming Wong: Dance of the Sun on the Water","2026-01-15","2026-04-06","Short film based on Saint Sebastian.","past/the-national-gallery-artist-in-residence-ming-wong"],
["ng","Edwin Austin Abbey","2025-11-20","2026-02-15","American artist and Pennsylvania Capitol ceiling.","past/edwin-austin-abbey-by-the-dawn-s-early-light"],
["ng","Radical Harmony: Neo-Impressionists","2025-09-13","2026-02-08","Seurat, Van Gogh, Signac and Pissarro.","past/radical-harmony-neo-impressionists"],
["ng","Millet: Life on the Land","2025-08-07","2025-10-19","The subjects that made Millet famous.","past/millet-life-on-the-land"],
["ng","Take One Picture 2025","2025-06-11","2025-08-31","Children's artworks inspired by de Hooch.","past/take-one-picture-2025"],
["ng","Jos\u00e9 Mar\u00eda Velasco","2025-03-29","2025-08-17","Mexico's landscape painter.","past/velasco"],
["ng","The Carracci Cartoons","2025-04-10","2025-07-06","Carracci brothers' creative process.","past/the-carracci-cartoons-myths-in-the-making"],
["ng","Siena: The Rise of Painting","2025-03-08","2025-06-22","Earliest Sienese trecento paintings.","past/siena-the-rise-of-painting"],
["ng","Parmigianino","2024-12-05","2025-03-09","Visionary Renaissance artist at work.","past/parmigianino-the-vision-of-saint-jerome"],
["ng","Discover Constable and The Hay Wain","2024-10-17","2025-02-02","Behind the making of The Hay Wain.","past/discover-constable-and-the-hay-wain"],
["ng","Van Gogh: Poets and Lovers","2024-09-14","2025-01-19","Once-in-a-century Van Gogh exhibition.","past/van-gogh-poets-and-lovers"],
["ng","NG Stories: Making a National Gallery","2024-10-04","2025-01-12","Two hundred years of Gallery history.","past/ng-stories-making-a-national-gallery"],
["ng","Hockney and Piero: A Longer Look","2024-08-08","2024-10-27","Hockney against Piero della Francesca.","past/hockney-and-piero-a-longer-look"],
["ng","Discover Degas and Miss La La","2024-06-06","2024-09-01","The circus performer's life.","past/discover-degas-and-miss-la-la"],
["rijks","Ed van der Elsken. Up Close","2026-06-19","2026-09-13","Unfiltered street energy across decades.","ed-van-der-elsken"],
["rijks","Fiep Westendorp","2026-06-19","2026-09-13","150 original drawings by the illustrator.","fiep-westendorp"],
["rijks","Carel Visser in the Rijksmuseum Gardens","2026-06-05","2026-10-25","Most influential Dutch sculptor of the twentieth century.","carel-visser"],
["rijks","WORN","2026-03-27","2027-03-21","Dress and textiles: garments from 1640 to 1930.","worn"],
["rijks","Willem de Kooning at work","2026-10-09","2027-01-17","120 works tracing De Kooning's process.","willem-de-kooning-at-work"],
["rijks","Document Netherlands: New Energy","2026-10-09","2027-01-17","Annual commission to a Dutch photographer.","document-netherlands-new-energy"],
["rijks","The Art of Drawing","2027-02-12","2027-05-23","Transformation of drawing, 100 highlights.","draw"],
["rijks","Metamorphoses","2026-02-06","2026-05-25","Ovid: Bernini, Titian to Rodin, Magritte, Bourgeois.","metamorphoses"],
["rijks","Fake!","2026-02-06","2026-05-25","Early photocollages and photomontages.","fake"],
["rijks","Suit Yourself: Menswear 1750\u20131850","2025-03-22","2026-03-15","A century of men's dress.","suit-yourself-or100-years-of-menswear-1750-1850"],
["rijks","Occupied City","2025-09-12","2026-01-25","Amsterdam under occupation, Steve McQueen.","steve-mcqueen-occupied-city"],
["rijks","At Home in the 17th Century","2025-10-17","2026-01-11","Domestic life with Rembrandt, Hals, Vermeer.","past/thuis-in-de-17de-eeuw"],
["rijks","Document Nederland: Tina Farifteh","2025-11-01","2026-01-11","Annual Dutch photography commission.","past/document-nederland-tina-farifteh"],
["rijks","Isamu Noguchi in the Gardens","2025-05-28","2025-10-26","Garden sculpture devoted to Noguchi.","past/isamu-noguchi-in-de-rijksmuseumtuinen"],
["rijks","Crossings","2025-07-04","2025-10-12","Photography from the Indian subcontinent.","crossings"],
["rijks","Fiona Tan: Monomania","2025-07-04","2025-09-14","The artist's view on the collection.","fiona-tan-monomania"],
["rijks","Asian Bronze","2024-09-27","2025-01-12","Four thousand years of Asian bronze.","past/asian-bronze"],
["rijks","Festival Frenzy","2024-09-27","2025-01-12","Dutch festivals photographed.","past/festival-frenzy"],
["rijks","Lee Ufan in the Gardens","2024-05-28","2024-10-27","Garden sculpture devoted to Lee Ufan.","past/lee-ufan"],
["rijks","Frans Hals","2024-02-16","2024-06-09","Major Haarlem portraitist retrospective.","past/frans-hals"],
["acq","Joan Mir\u00f3 | Jean Paul Riopelle","2026-09-01",null,"Palm Beach. Two painters shown together.","joan-miro-jean-paul-riopelle"],
["acq","Matisse: The Pursuit of Harmony","2026-04-09","2026-05-22","New York. Matisse's investigation of form.","matisse2"],
["acq","Soft Reins: From Degas to Fordjour","2026-02-06","2026-04-06","Palm Beach. Horse and equestrian.","soft-reins"],
["acq","Masters of Modernism","2025-12-13","2026-02-02","Palm Beach. Gauguin to Warhol survey.","masters-of-modernism"],
["acq","Nicole Wittenberg: All the Way","2025-10-16","2025-12-05","New York. First solo.","nicole-wittenberg2"],
["acq","Yuka Kashihara: Stardust","2025-10-15","2025-12-08","Palm Beach. Recent paintings.","yuka-kashihara2"],
["acq","Miquel Barcel\u00f3","2025-04-24","2025-05-30","New York. Recent work.","miquel-barcelo4"],
["acq","Joani Tremblay","2025-04-17","2025-06-15","Palm Beach. Landscape painting.","joani-tremblay"],
["acq","Postwar Abstraction","2025-02-28","2025-04-13","Palm Beach. Postwar abstract painting.","postwar-abstraction"],
["acq","Portraiture: Cassatt to Warhol","2025-01-21","2025-04-04","New York. Impressionism to Pop.","portraiture-from-cassatt-to-warhol"],
["acq","Harumi Klossowska de Rola","2025-01-11","2025-02-23","Palm Beach. Balthus's daughter.","harumi-klossowska-de-rola"],
["acq","Portraiture: Cassatt to Warhol (Palm Beach)","2024-11-22","2025-01-05","Palm Beach. First staging.","portraiture-from-cassatt-to-warhol-palm-beach"],
["acq","Tom Sachs: Bronze","2024-11-07","2024-12-13","New York. Bricolage in bronze.","tom-sachs3"],
["acq","Jacob El Hanani: Drawing on Canvas","2024-09-10","2024-10-18","New York. Microscopically fine line drawing.","jacob-el-hanani"],
];

function buildSeed(){return S.map(([m,t,s,e,d,sl])=>{const id=m+"-"+t.toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,50);const mu=MU[m];return{id,museumId:m,title:t,startDate:s||null,endDate:e||null,summary:d,exUrl:sl?(mu.exBase+sl):mu.listUrl,interested:true,watching:false,acquiring:null,looked:false,hasCatalogue:"unknown",catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,publisherResult:null,shopUrl:null,shopState:null,shopChange:null};});}

function mergeSeedInto(existing){const byId=new Map(existing.map(r=>[r.id,r]));for(const s of buildSeed()){const p=byId.get(s.id);if(p)byId.set(s.id,{...p,startDate:p.startDate||s.startDate,endDate:p.endDate||s.endDate,summary:p.summary||s.summary,exUrl:p.exUrl||s.exUrl,watching:p.watching||false});else byId.set(s.id,s);}return Array.from(byId.values());}

const cleanIsbn=v=>{if(!v)return null;const d=String(v).replace(/[^0-9]/g,"");return d.length===13?d:null;};
const fmtIsbn=v=>{const c=cleanIsbn(v);return c?c.slice(0,3)+"-"+c.slice(3):null;};

// ISBN-10 is taken, not thrown away (her decision): converted to 13 for her screen,
// since the ledger stores one format. The old check digit is verified first, so a
// mistyped number is refused rather than turned into a plausible wrong one.
function isbn10to13(v){
  const t=String(v||"").replace(/[^0-9Xx]/g,"").toUpperCase();
  if(t.length!==10)return null;
  let sum=0;
  for(let i=0;i<10;i++){
    const ch=t[i];
    const d=(ch==="X")?10:(ch>="0"&&ch<="9"?Number(ch):-1);
    if(d<0||(ch==="X"&&i!==9))return null;   // X is only ever the check digit
    sum+=d*(10-i);
  }
  if(sum%11!==0)return null;                 // the number does not check out
  const core="978"+t.slice(0,9);
  let s2=0;
  for(let i=0;i<12;i++)s2+=Number(core[i])*(i%2?3:1);
  return core+String((10-(s2%10))%10);
}

// Every ISBN entering the app goes through toIsbn13: a 13 whose check digit holds, or a
// converted valid 10, else nothing. With `seen` (the text or results the app fetched)
// it is taken only if its digits, 13 or 10, are printed there — a read cannot invent
// one. cleanIsbn stays as it is: it also shows ISBNs already in her ledger.
const toIsbn13=(v,seen)=>{
  const d=String(v||"").replace(/[^0-9]/g,"");
  const isbn=d.length===13?(isbn13Checks(d)?d:null):isbn10to13(v);
  if(!isbn||seen===undefined)return isbn;
  return isbnInText(isbn,Array.isArray(seen)?seen.map(resultText).join("\n"):seen)?isbn:null;
};
function isbn13to10(d){
  if(!/^978\d{10}$/.test(d))return null;
  const core=d.slice(3,12);
  let s=0;
  for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);
  const c=(11-s%11)%11;
  return core+(c===10?"X":String(c));
}
// Printed in the text: the 13 or the 10, hyphens or spaces between its digits allowed,
// never as part of a longer number.
function isbnInText(isbn,text){
  const d=String(isbn||"").replace(/\D/g,"");
  if(d.length!==13)return false;
  const a=String(text||"").replace(/(\d)[\u2010-\u2015-](?=[\dXx])/g,"$1");
  const b=a.replace(/(\d) (?=[\dXx])/g,"$1");
  return [d,isbn13to10(d)].filter(Boolean).some(f=>{ const re=new RegExp("(?<![0-9])"+f+"(?![0-9Xx])","i"); return re.test(a)||re.test(b); });
}
const MON3=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");if(isNaN(x))return d;return x.getDate()+" "+MON3[x.getMonth()]+" "+x.getFullYear();};
function fmtRefresh(iso){if(!iso)return"never";const d=new Date(iso);if(isNaN(d))return"never";const mon=MON3[d.getMonth()];let h=d.getHours();const ap=h<12?"am":"pm";h=h%12;if(h===0)h=12;const mm=String(d.getMinutes()).padStart(2,"0");return mon+" "+d.getDate()+", "+d.getFullYear()+" "+h+":"+mm+ap;}
// A sweep moment on two lines, the date then the time, so every row of the Details table wraps the same way.
function momentLines(label,iso){const t=fmtRefresh(iso),i=t.lastIndexOf(" ");return i<0?label+t:<>{label+t.slice(0,i)}<br/>{t.slice(i+1)}</>;}
function dateRange(r){const a=fmtDate(r.startDate),b=fmtDate(r.endDate);if(a&&b)return a+" \u2014 "+b;if(b)return"until "+b;if(a){const st=new Date(r.startDate+"T00:00:00");const past=!isNaN(st)&&st<=new Date();return(past?"open since ":"opens ")+a;}return"dates unknown";}

// The shop link searches by the EXHIBITION's title (her decision): shops index the
// show's name; resellers use the ISBN or the book's title. Booko: booko.au/<isbn>,
// or its title search with no ISBN.
function buyLinks(r){const isbn=cleanIsbn(r.isbn13),title=r.catalogueTitle||r.title,q=encodeURIComponent(isbn||title),tq=encodeURIComponent(title),mu=MU[r.museumId],out=[];if(r.shopUrl)out.push({name:shopLinkLabel(r.shopState),href:r.shopUrl});else if(shopButtonUrl(mu,r.title))out.push({name:"Museum shop",href:shopButtonUrl(mu,r.title)});if(r.publisherUrl)out.push({name:publisherLinkLabel(r.publisherResult),href:r.publisherUrl});out.push({name:"Amazon",href:"https://www.amazon.com.au/s?k="+q},{name:"AbeBooks",href:"https://www.abebooks.com/servlet/SearchResults?ds=30&dym=on&kn="+(isbn||tq)+"&rollup=on&sortby=17"},{name:"Alibris",href:"https://www.alibris.com/booksearch?keyword="+q},{name:"Booko",href:isbn?"https://booko.au/"+isbn:"https://booko.au/search?query_type=1&q="+tq.replace(/%20/g,"+")});return out;}

// ── FINDING A CATALOGUE (docs/app.md §1; CLAUDE.md §5.1 "Catalogue lookup") ────
// The page cannot reach the internet, so searching and reading go through her keyed
// connector, and `sample` asks Claude to read only the text handed to it — it can
// never report a page that was not found.
// SEARCH_SERVER must match the connector name in the page's published `mcp`
// capability (docs/app.md §1).
const SEARCH_SERVER = "Parallel Search Key";
const SEARCH_TOOL   = "web_search";
// Reads a whole page, not a snippet.
const FETCH_TOOL    = "web_fetch";

// The connector wants a stable id per conversation for its free-tier limits.
// One per page load is the honest reading of "conversation" here.
const SEARCH_SESSION = "catwatch" + Math.random().toString(16).slice(2).padEnd(16, "0")
                                  + Date.now().toString(16);

async function useCap(name){
  try{
    if(typeof window==="undefined"||!window.claude||typeof window.claude.use!=="function")return null;
    const cap=await window.claude.use(name);
    // A READ-ONLY COPY CANNOT WRITE TO THE STORE — see ONE COPY EDITS.
    return (name==="db"&&cap&&cloudReadOnly)?readOnlyStore(cap):cap;
  }catch{ return null; }
}

// Each failure code with its own fix gets its own sentence; one catch-all banner
// would hide the fix.
function mcpTrouble(e){
  const code=String((e&&e.code)||"");
  if(code==="server_not_connected")return "Add the \u201cParallel Search Key\u201d connector in claude.ai \u2192 Settings \u2192 Connectors, then try again.";
  if(code==="needs_reauth")       return "Reconnect \u201cParallel Search Key\u201d in claude.ai \u2192 Settings \u2192 Connectors \u2014 its access has lapsed.";
  if(code==="not_in_manifest")    return "This page isn\u2019t allowed to use \u201cParallel Search Key\u201d \u2014 you may have turned it off for this artifact.";
  if(code==="selection_required") return "You have more than one \u201cParallel Search Key\u201d connector. Pick one when Claude asks, then try again.";
  if(code==="blocked_by_policy")  return "Your organisation blocks this connector.";
  if(code==="server_unavailable") return "The search service didn\u2019t answer. Worth one more try in a moment.";
  if(code==="cancelled")          return "Search stopped.";
  return "Search failed ("+(code||"unknown")+").";
}

// Ask the connector. Returns {ok, results, detail} — never throws.
async function searchWeb(objective,queries){
  const t0=Date.now(), out=await searchWebCall(objective,queries);
  tapeCall("search",{objective,queries},out,t0);
  return out;
}
async function searchWebCall(objective,queries){
  const mcp=await useCap("mcp");
  if(!mcp)return{ok:false,results:[],detail:"No connector access in this viewer. The page must be opened from its claude.ai link."};
  let res;
  try{
    res=await mcp.callTool(SEARCH_SERVER,SEARCH_TOOL,{
      objective,
      search_queries:queries,
      session_id:SEARCH_SESSION,
    });
  }catch(e){
    return{ok:false,results:[],detail:mcpTrouble(e)+"  ["+String((e&&e.code)||"")+" "+String((e&&e.message)||e)+"]"};
  }
  const p=res&&res.payload;
  const results=(p&&Array.isArray(p.results))?p.results:[];
  return{ok:true,results,detail:"search: "+results.length+" results for "+JSON.stringify(queries)};
}

// Read one page or several (the shelf and the search box go in ONE call). An ISBN sits
// in a page's small print, rarely in a search excerpt (docs/app.md §1 "The ISBN"). A
// collapsed panel already in the page is read; details fetched on click are not.
// {full:true} reads the page whole (her decision): excerpts dropped the Orsay
// Cassatt's EAN. The shelf stays excerpts — a call is capped at ~25,000 characters.
async function fetchPage(url,objective,queries,opts){
  const t0=Date.now(), out=await fetchPageCall(url,objective,queries,opts);
  tapeCall("open",{urls:Array.isArray(url)?url:[url],objective,queries,full:!!(opts&&opts.full)},out,t0);
  return out;
}
async function fetchPageCall(url,objective,queries,opts){
  const urls=Array.isArray(url)?url.filter(Boolean):[url];
  if(!urls.length)return{ok:false,results:[],detail:"No page to open."};
  const mcp=await useCap("mcp");
  if(!mcp)return{ok:false,results:[],detail:"No connector access in this viewer."};
  let res;
  try{
    res=await mcp.callTool(SEARCH_SERVER,FETCH_TOOL,{
      urls,
      objective,
      search_queries:queries,
      session_id:SEARCH_SESSION,
      ...((opts&&opts.full)?{full_content:true}:{}),
    });
  }catch(e){
    return{ok:false,results:[],detail:mcpTrouble(e)+"  ["+String((e&&e.code)||"")+" "+String((e&&e.message)||e)+"]"};
  }
  const p=res&&res.payload;
  const results=(p&&Array.isArray(p.results))?p.results:[];
  // The connector names each address it could not read, with its HTTP status.
  // Re-check reads a 404 off this as "the page is gone" — see recheckLinkedPage.
  const errors=(p&&Array.isArray(p.errors))?p.errors:[];
  return{ok:true,results,errors,detail:"opened "+urls.join(" + ")+": "+results.length+" page(s)"
    +(errors.length?", "+errors.length+" refused ("+errors.map(e=>String((e&&e.http_status_code)||(e&&e.error_type)||"?")).join(", ")+")":"")};
}

// The pages step one opens: the shelf where the shop has one, then its search box with
// the exhibition's title, both from MUSEUMS. A shelf that scrolls or paginates is just
// more addresses. Depth is one number for every shop, never a count per venue: a
// missing page costs nothing and all go in one call. Five covers MAD's 68 books.
const SHELF_DEPTH=5;

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

function shopPagesFor(mu,title){
  const out=[];
  if(mu&&mu.shopCatalogues)out.push(...shelfPages(mu.shopCatalogues));
  // Curly quotes straightened: shops file "O’Keeffe" with a straight one.
  if(mu&&mu.shopSearch)out.push(mu.shopSearch+encodeURIComponent(String(title).replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"')));
  return out;
}

// Hand the search results to Claude and ask it to read the catalogue off them.
// It sees ONLY these excerpts, so it cannot report a shop page that was not
// found. Returns {ok, data, detail}.
async function readResults(prompt){
  const t0=Date.now(), out=await readResultsCall(prompt);
  tapeCall("claude",{prompt},out,t0);
  return out;
}
async function readResultsCall(prompt){
  const sample=await useCap("sample");
  if(!sample)return{ok:false,data:null,code:"unavailable",detail:"Claude isn\u2019t available to this page in this viewer."};
  try{
    // Never a replayed answer: the platform replays an identical question asked within five minutes,
    // so Relabel, Search again and Re-check would not ask again (her Metamorphoses Relabel).
    const data=await sample.json(prompt,{modelTier:"default",cache:false});
    return{ok:true,data,detail:"read the results"};
  }catch(e){
    const code=String((e&&e.code)||"");
    // A reply holding two answers ("Wait — here is the corrected object", Hubert Robert):
    // the last one is Claude's own correction. TW-001 to TW-004.
    if(code==="invalid_json"&&e&&e.text){
      const data=lastJsonObject(e.text);
      if(data)return{ok:true,data,detail:"read the results (the reply held more than one answer; the last was taken)"};
    }
    let why="Couldn\u2019t read the search results ("+(code||"unknown")+").";
    if(code==="not_granted")       why="You declined to let this page use Claude. Reload and allow it to search.";
    else if(code==="rate_limited") why="Claude is rate-limited.";
    else if(code==="invalid_json") why="Claude\u2019s answer came back unreadable. Try again.";
    return{ok:false,data:null,code,partial:(e&&e.text)||null,detail:why+"  ["+String((e&&e.message)||e)+"]"};
  }
}

// The last complete {…} object in a reply that parses, or null. Strings are skipped
// whole, so a brace inside one is not counted.
function lastJsonObject(text){
  const t=String(text||""), found=[];
  let depth=0, start=-1, inStr=false, esc=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(inStr){ if(esc)esc=false; else if(c==="\\")esc=true; else if(c==='"')inStr=false; continue; }
    if(c==='"'){ if(depth>0)inStr=true; continue; }
    if(c==="{"){ if(depth===0)start=i; depth++; }
    else if(c==="}"&&depth>0){ depth--; if(depth===0)found.push(t.slice(start,i+1)); }
  }
  for(let k=found.length-1;k>=0;k--){
    try{ const v=JSON.parse(found[k]); if(v&&typeof v==="object"&&!Array.isArray(v))return v; }catch{}
  }
  return null;
}

// ── THE LOOKUP LOG — every catalogue lookup, recorded whole (docs/app.md §1) ──
// Find catalogue, Search again, Re-check and each link an Add by link reads save one
// record to the page's store: every call's input and full answer, Claude's answers,
// the card before and after, and for a link what code read off its page.
// Nothing shows on the page; Claude reads it with build/lookup_log.js. The newest 50
// are kept. A record is gzipped and split under the store's size cap; it is marked
// complete only after every piece is written. LL-001 to LL-009.
const LOOKUP_LOG="lookups", LOOKUP_KEEP=50, LOOKUP_PIECE=180000;
const CARD_FIELDS=["hasCatalogue","catalogueTitle","isbn13","publisher","publisherUrl","publisherResult",
  "shopUrl","shopState","shopChange","englishCheck","originalEdition","otherVenueBook","alsoVersion","editions","editionPick"];
let lookupTape=null;
function tapeStart(action,row){
  lookupTape={t0:Date.now(),action,row,calls:[]};
  return lookupTape;
}
function tapeCall(kind,input,output,t0){
  const t=lookupTape;
  if(t)t.calls.push({n:t.calls.length+1,kind,at:t0-t.t0,ms:Date.now()-t0,input,output});
}
const cardFields=r=>Object.fromEntries(CARD_FIELDS.map(k=>[k,r?(r[k]===undefined?null:r[k]):null]));
async function gzipBase64(text){
  if(typeof CompressionStream==="undefined")return null;
  const buf=await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
  const bytes=new Uint8Array(buf); let bin="";
  for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
  return btoa(bin);
}
// Ends the tape and saves it. Never throws, and a lookup never waits on it.
async function saveLookupTape(tape,out){
  if(lookupTape===tape)lookupTape=null;
  try{
    const db=await useCap("db");
    if(!db||!tape)return false;
    const row=tape.row||{}, mu=MU[row.museumId];
    const at=new Date(tape.t0).toISOString();
    const body=JSON.stringify({
      action:tape.action,at,version:APP_VERSION,ms:Date.now()-tape.t0,
      card:{id:row.id,title:row.title,museumId:row.museumId,venue:mu?mu.name:null,
        startDate:row.startDate||null,endDate:row.endDate||null,exUrl:row.exUrl||null},
      before:cardFields(row),after:out&&out.row?cardFields(out.row):null,
      ok:!!(out&&out.ok),said:(out&&out.said)||null,trouble:(out&&out.trouble)||null,
      panel:(out&&out.detail)||null,link:tape.link||null,calls:tape.calls});
    const z=await gzipBase64(body);
    const enc=z?"gzip-base64":"json", text=z||body;
    const pieces=[];
    for(let i=0;i<text.length;i+=LOOKUP_PIECE)pieces.push(text.slice(i,i+LOOKUP_PIECE));
    const id="L"+tape.t0+Math.random().toString(36).slice(2,6);
    const rec=db.doc(LOOKUP_LOG+"/"+id);
    await rec.set({at,action:tape.action,title:row.title||null,venue:mu?mu.name:null,museumId:row.museumId||null,
      version:APP_VERSION,calls:tape.calls.length,enc,pieces:pieces.length,complete:false});
    for(let i=0;i<pieces.length;i++)await rec.collection("pieces").doc(String(i)).set({text:pieces[i]});
    await rec.update({complete:true});
    await pruneLookupLog(db);
    return true;
  }catch{ return false; }
}
async function pruneLookupLog(db){
  const snap=await db.collection(LOOKUP_LOG).orderBy("at","desc").limit(1000).get();
  for(const d of snap.docs.slice(LOOKUP_KEEP)){
    const n=Number((d.data()||{}).pieces)||0, rec=db.doc(LOOKUP_LOG+"/"+d.id);
    for(let i=0;i<n;i++)await rec.collection("pieces").doc(String(i)).delete();
    await rec.delete();
  }
}


// ── THE SWEEP LOG — in the page's store, outside the ledger (docs/app.md §5) ──
// A fact about the world must not roll back with a backup. One line per venue, never
// growing; it survives Reset. A cache, not a master record: any sweep file rebuilds it.
const SWEEP_LOG_DOC = "sweeps/venues";

// Returns {log, why} — `why` is null on success and a sentence otherwise. The
// drawer prints it rather than showing an empty panel, because "no sweeps yet"
// and "could not reach the store" look identical and mean opposite things.
async function readSweepLog(){
  const db=await useCap("db");
  if(!db){ markUnread(UNREAD_SWEEPS); return {log:{},why:"This page can\u2019t reach its sweep log in this viewer."}; }
  try{
    const snap=await db.doc(SWEEP_LOG_DOC).get();
    if(!snap.exists) return {log:{},why:null};
    const d=snap.data()||{};
    const log=(d.venues&&typeof d.venues==="object")?d.venues:{};
    return {log,why:null};
  }catch(e){
    markUnread(UNREAD_SWEEPS);
    const code=String((e&&e.code)||"");
    if(code==="not_granted") return {log:{},why:"You declined this page access to its sweep log."};
    return {log:{},why:"Couldn\u2019t read the sweep log ("+(code||"unknown")+")."};
  }
}

async function writeSweepLog(next){
  if(STORE_UNREAD.has(UNREAD_SWEEPS))return false;
  const db=await useCap("db");
  if(!db) return false;
  try{ await db.doc(SWEEP_LOG_DOC).set({venues:next,updatedAt:new Date().toISOString()}); return true; }
  catch{ return false; }
}

async function readQuarantine(){
  const db=await useCap("db");
  if(!db){ markUnread(UNREAD_QUAR); return {map:{},why:"This page can\u2019t reach its quarantine list in this viewer, so nothing is being blocked."}; }
  try{
    const snap=await db.doc(QUARANTINE_DOC).get();
    if(!snap.exists) return {map:{},why:null};
    const d=snap.data()||{};
    return {map:(d.rows&&typeof d.rows==="object")?d.rows:{},why:null};
  }catch(e){
    markUnread(UNREAD_QUAR);
    const code=String((e&&e.code)||"");
    if(code==="not_granted") return {map:{},why:"You declined this page access to its quarantine list."};
    return {map:{},why:"Couldn\u2019t read the quarantine list ("+(code||"unknown")+")."};
  }
}

async function writeQuarantine(next){
  if(STORE_UNREAD.has(UNREAD_QUAR))return false;
  const db=await useCap("db");
  if(!db) return false;
  try{ await db.doc(QUARANTINE_DOC).set({rows:next,updatedAt:new Date().toISOString()}); return true; }
  catch{ return false; }
}

// HANDING HER A FILE — the two routes, in order, and what each can know.
//   1. The runtime's own file handoff: asks her, then SAVES or REJECTS.
//      Resolves "runtime"; a rejection throws its own error.
//   2. An ordinary browser download: cannot tell arrived from cancelled.
//      Resolves "browser"; if even starting it fails, throws {route:"browser"}.
// Save's file and Cloud Saves' downloads both come through here.
async function offerFile(filename,data){
  let dl=null;
  try{
    if(typeof window!=="undefined"&&window.claude&&typeof window.claude.use==="function"){
      dl=await window.claude.use("downloads");
    }
  }catch{ dl=null; }   // unavailable is not a failure — fall through to 2.
  if(dl&&typeof dl.save==="function"){ await dl.save({filename,data}); return "runtime"; }
  try{
    const blob=new Blob([data],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    return "browser";
  }catch(e){ throw {route:"browser",cause:e}; }
}

// ── THE CLOUD LEDGER — storage ────────────────────────────────────────────────
// Her design (docs/cloud_storage.md; screen docs/app.md §9): the LIVE LEDGER, saved after every
// change, and SNAPSHOTS ("Cloud Saves"), never overwritten or pruned. Parts are written
// under a new name and the live record switched last, so a cut-off save leaves the last
// complete ledger; every piece is fingerprinted (sha-256) and a mismatch is refused.
// Out of the component so fixtures drive it against a stand-in store (cloud_ledger.js).
const CLOUD_LIVE_DOC="ledger/live";
const CLOUD_PARTS="ledgerParts";
const SNAP_COLL="snapshots";
const SNAP_PARTS="snapshotParts";
// Characters of compressed text per part. The store's cap is 256 KiB per
// document; this leaves room for the field names and a margin.
const CLOUD_PART_CHARS=180000;
// false = save and snapshot, but never open from the cloud by itself; she Loads her file
// (her decision).
const CLOUD_OPENS=false;

async function cloudGzip(text){
  const bytes=new TextEncoder().encode(text);
  const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf=new Uint8Array(await new Response(stream).arrayBuffer());
  let bin=""; for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));
  return btoa(bin);
}
async function cloudGunzip(b64){
  const bin=atob(b64); const buf=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}
async function cloudSha(text){
  const h=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)));
  return Array.from(h,b=>b.toString(16).padStart(2,"0")).join("");
}
function cloudNewId(prefix){ return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

// Writes `text` as parts `<coll>/<id>-0 … -n`. Returns what the reader needs.
async function cloudWriteParts(db,coll,id,text){
  const z=await cloudGzip(text);
  const parts=Math.max(1,Math.ceil(z.length/CLOUD_PART_CHARS));
  for(let i=0;i<parts;i++){
    await db.doc(coll+"/"+id+"-"+i).set({z:z.slice(i*CLOUD_PART_CHARS,(i+1)*CLOUD_PART_CHARS),i,of:parts});
  }
  return {id,parts,sha:await cloudSha(text),bytes:text.length,zbytes:z.length};
}
async function cloudReadParts(db,coll,meta){
  let z="";
  for(let i=0;i<meta.parts;i++){
    const snap=await db.doc(coll+"/"+meta.id+"-"+i).get();
    if(!snap.exists)throw {code:"missing_part",message:"Part "+(i+1)+" of "+meta.parts+" is missing."};
    z+=String((snap.data()||{}).z||"");
  }
  const text=await cloudGunzip(z);
  if(await cloudSha(text)!==meta.sha)throw {code:"fingerprint",message:"The copy doesn’t match its fingerprint, so it was not used."};
  return text;
}
async function cloudDeleteParts(db,coll,id,parts){
  for(let i=0;i<parts;i++){ try{ await db.doc(coll+"/"+id+"-"+i).delete(); }catch{} }
}

// THE LIVE LEDGER. `prev` is the record this page last wrote or read, so the
// old parts can be removed once the switch has moved; a save never reads
// first, which keeps it to the writes it actually needs.
async function cloudSaveLive(db,text,info,prev){
  const w=await cloudWriteParts(db,CLOUD_PARTS,cloudNewId("g"),text);
  const rec={...w,savedAt:new Date().toISOString(),rows:info.rows,quarantined:info.quarantined};
  await db.doc(CLOUD_LIVE_DOC).set(rec);      // THE SWITCH — only after every part landed
  if(prev&&prev.id&&prev.id!==rec.id)await cloudDeleteParts(db,CLOUD_PARTS,prev.id,prev.parts);
  return rec;
}
// {rec:null} when nothing has ever been saved; throws when something is there
// and cannot be trusted.
async function cloudReadLive(db){
  const snap=await db.doc(CLOUD_LIVE_DOC).get();
  if(!snap.exists)return {rec:null,text:null};
  const rec=snap.data();
  return {rec,text:await cloudReadParts(db,CLOUD_PARTS,rec)};
}

// Snapshots: parts first, the listing record last, so a half-written one never appears.
// A Save's copy carries the offline file's name and moment (her decision).
async function cloudTakeSnapshot(db,text,info){
  const w=await cloudWriteParts(db,SNAP_PARTS,cloudNewId("s"),text);
  const rec={...w,at:info.at||new Date().toISOString(),label:String(info.label||"").slice(0,80),
             kind:info.kind||"manual",rows:info.rows,quarantined:info.quarantined};
  if(info.filename)rec.filename=String(info.filename);
  await db.doc(SNAP_COLL+"/"+w.id).set(rec);
  return rec;
}
async function cloudListSnapshots(db,n){
  const q=await db.collection(SNAP_COLL).orderBy("at","desc").limit(n||1000).get();
  return q.docs.map(d=>d.data());
}
async function cloudReadSnapshot(db,rec){ return cloudReadParts(db,SNAP_PARTS,rec); }

// WHAT COUNTS AS THE SAME LEDGER. Exhibitions compared by id with their keys
// in a fixed order, and the quarantine list as a set. `lastRun` and the export
// stamps are left out: they say when a file was made, not what is in it.
function ledgerFingerprintText(d){
  const canon=v=>Array.isArray(v)?v.map(canon):(v&&typeof v==="object")?Object.keys(v).sort().reduce((o,k)=>{o[k]=canon(v[k]);return o;},{}):v;
  const rows=(d&&Array.isArray(d.rows)?d.rows:[]).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const ign=(d&&Array.isArray(d.ignored)?d.ignored:[]).map(x=>JSON.stringify(canon(x))).sort();
  return JSON.stringify({rows:canon(rows),ignored:ign});
}
// How two ledgers differ, in words she can act on. Null when they are the same.
function ledgerDifference(a,b){
  if(ledgerFingerprintText(a)===ledgerFingerprintText(b))return null;
  const byId=d=>new Map((d.rows||[]).map(r=>[String(r.id),JSON.stringify(Object.keys(r).sort().map(k=>[k,r[k]]))]));
  const A=byId(a),B=byId(b);
  let onlyA=0,onlyB=0,changed=0;
  for(const [k,v] of A){ if(!B.has(k))onlyA++; else if(B.get(k)!==v)changed++; }
  for(const k of B.keys()) if(!A.has(k))onlyB++;
  const qa=(a.ignored||[]).length,qb=(b.ignored||[]).length;
  // Quarantine entries that differ, counted by key: in one list only, or in
  // both but not identical. One count, so her sentence can add them up.
  const byKey=l=>new Map((l||[]).map(x=>[String(x&&x.key),JSON.stringify(x)]));
  const QA=byKey(a.ignored),QB=byKey(b.ignored);
  let qDiff=0;
  for(const [k,v] of QA){ if(QB.get(k)!==v)qDiff++; }
  for(const k of QB.keys()) if(!QA.has(k))qDiff++;
  return {onlyA,onlyB,changed,quarantineDiffers:ledgerFingerprintText({ignored:a.ignored})!==ledgerFingerprintText({ignored:b.ignored}),qa,qb,qDiff};
}
// Every failure that has its own fix gets its own sentence (mcpTrouble's rule).
function cloudTrouble(e,verb){
  const code=String((e&&e.code)||"");
  const act=verb==="read"?"read":"save to";
  if(code==="not_granted")        return "You declined this page access to its store.";
  if(code==="quota_exceeded")     return "The page’s store is full ("+String((e&&e.message)||"")+").";
  if(code==="resource_exhausted") return "Too many saves in a row just now — it will try again on your next change.";
  if(code==="revoked")            return "This page lost access to its store while open. Reload the page.";
  if(code==="missing_part"||code==="fingerprint") return String(e.message);
  return "Couldn’t "+act+" the cloud copy ("+(code||String((e&&e.message)||e||"unknown"))+").";
}
// ONE COPY EDITS AT A TIME (her decision; TC-001–010). The copy that opens while another
// edits is READ ONLY until reloaded. Each editing copy beats its id into one record every
// SESSION_BEAT_MS; a record older than SESSION_STALE_MS is a closed copy, taken over.
// Every save checks the record first, so a copy waking from sleep never overwrites it.
const CLOUD_SESSION_DOC="ledger/session";
const RO_LINE="Read only — Cat Watch is open in another tab or device. Close it there, then reload this one.";
const SESSION_BEAT_MS=20000;
const SESSION_STALE_MS=60000;
const CLOUD_SESSION_ID=cloudNewId("t");
let cloudReadOnly=false;

// The store, with every write refused. Reads pass through.
function readOnlyStore(db){
  const no=()=>Promise.reject({code:"read_only",message:"This copy is read only."});
  // Named members only: the platform's namespace is frozen, and spreading it
  // would copy nothing its prototype holds.
  return {doc:path=>({get:()=>db.doc(path).get(),set:no,update:no,delete:no}),
          collection:c=>db.collection(c)};
}
// "mine": this copy may edit (the record now names it). "other": another copy
// is editing. Reads the record, then writes it — so it is also the heartbeat.
async function cloudSessionClaim(db,now){
  const t=now||Date.now();
  let cur=null;
  try{ const snap=await db.doc(CLOUD_SESSION_DOC).get(); cur=snap.exists?snap.data():null; }catch{}
  if(cur&&cur.id!==CLOUD_SESSION_ID&&t-Date.parse(cur.beat)<SESSION_STALE_MS)return "other";
  await db.doc(CLOUD_SESSION_DOC).set({id:CLOUD_SESSION_ID,beat:new Date(t).toISOString()});
  return "mine";
}
async function rawStore(){
  try{ return (typeof window!=="undefined"&&window.claude&&window.claude.use)?await window.claude.use("db"):null; }catch{ return null; }
}
// ── END OF THE CLOUD LEDGER ──────────────────────────────────────────────────

const today=()=>new Date().toISOString().slice(0,10);
// ── THE ISBN FILL — its two decisions live outside the component so fixtures reach them.

// Open the book's own page when a catalogue was found and the ISBN OR the publisher is
// still blank (her decision; docs/app.md §1 "The ISBN"). C-009 to C-013a.
function needsPageRead(hit){
  return !!(hit&&hit.ok&&hit.pageUrl&&hit.row&&hit.row.hasCatalogue==="yes"
            &&(!hit.row.isbn13||!hit.row.publisher));
}

// Fills blanks only (docs/app.md §1 "The ISBN"): a value already on the row stands;
// anything not a real ISBN, or not printed in `seen`, is refused; a page yielding
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

function shopDomain(mu){if(!mu||!mu.shopHome)return null;try{return new URL(mu.shopHome).hostname;}catch{return null;}}

// Which result is the publisher's own site, in code: a publisher's name is in its
// hostname (hannibalbooks.be). Shared words are dropped ("university" too: Yale
// University Press is yalebooks.yale.edu); every remaining word must be in the host.
const PUBLISHER_WORDS=new Set(["books","book","press","publishing","publishers","publisher",
  "editions","edition","verlag","publications","university","the","and","of","co","inc","ltd",
  "llc","bv","nv"]);
// A joint publisher on her PUBLISHER_SITES list is used only when the name finds none.
const publisherWords=name=>foldText(name).split(/[^a-z0-9]+/).filter(w=>w.length>2&&!PUBLISHER_WORDS.has(w));
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
// JOINT PUBLISHERS WHOSE NAME IS NOT IN THEIR ADDRESS — her list, kept short. An entry
// is added only when her card says "Couldn't work out the publisher's own website" for
// a publisher that has one, and she asks; never from a general list. Matched on the
// name's own words (publisherWords). Used only when the name finds no site. PS-001 to PS-006.
const PUBLISHER_SITES={
  "Rizzoli Electa":"https://www.rizzoliusa.com/",
  "DelMonico Books · Prestel":"https://delmonicobooks.com/",
};
function listedPublisherSite(name){
  const k=publisherWords(name).join(" ");
  if(!k)return null;
  for(const [n,u] of Object.entries(PUBLISHER_SITES))if(publisherWords(n).join(" ")===k)return hostOf(u);
  return null;
}
// A leading "The" and any punctuation are noise, not a different publisher.
function normPublisher(name){
  return foldText(name).replace(/[^a-z0-9]+/g," ").trim().replace(/^the\s+/,"");
}
// A publisher carrying the venue's FULL name, whole words, is the venue (her decision,
// on trial; never the chip name). Known misfire: a namesake museum — she lists it in
// NOT_SELF_PUBLISHERS. Too many misfires → back to her list alone (delete the venue
// test in isVenueImprint). C-070 to C-078e.
const NOT_SELF_PUBLISHERS = new Set([
  // her entries, normalised as normPublisher writes them
]);
function isSelfPublisher(name,museumId){
  return isVenueImprint(publisherToFind(name,museumId),museumId);
}
// One name, taken whole: is it the venue's own imprint?
function isVenueImprint(name,museumId){
  const n=normPublisher(name);
  if(!n||NOT_SELF_PUBLISHERS.has(n))return false;
  if(SELF_PUBLISHERS.has(n))return true;
  const v=normPublisher(MU[museumId]&&MU[museumId].name);
  return v.length>=6&&(" "+n+" ").includes(" "+v+" ");
}

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

// Only the publisher is the publisher (her decision, Millet): a link a read hands over
// is filed only on the publisher's own site; a distributor's page is dropped and the
// publisher step runs. Self-published → no link.
// "X in association with Y": Y is the publisher (her decision). A co-edition — "X /
// Venue", "X and Venue", "X with Venue", "X & Venue" — X is the publisher, for every
// verdict (her decision, Turner). Strongest mark first, so "Thames & Hudson / Venue"
// keeps its "&"; never a comma ("The Museum of Modern Art, New York" is one venue).
const CO_EDITION_MARKS=[/\s*\/\s*/,/\s*;\s*/,/\s+with\s+/i,/\s+and\s+/i,/\s+&\s+/];
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

function publisherLinkOf(u,publisher,dom,museumId){
  publisher=publisherToFind(publisher,museumId);
  const t=cleanPublisherUrl(u,dom);
  if(!t||!publisher||isSelfPublisher(publisher,museumId))return null;
  return publisherDomainFrom([{url:t}],publisher)?t:null;
}


// ── A CONTAINER IS NOT THE BOOK; A SHELL IS NOT AN EMPTY SHELF (docs/app.md §1) ──
// A publisher candidate is opened before it is believed: it IS the book, it LISTS the
// book (take the link off it), or it came back empty (keep it, labelled as the
// section). No rendering fetch for the few script-drawn publisher sites (her decision).

// Text a fetched page must carry before we believe we saw it — measured: Hannibal's
// script-drawn section returns 110 characters, a real shelf thousands.
const SHELL_CHARS=400;
// A price on a shop page: a shelf of books always shows them (shopStep).
const SHOP_PRICE=/(?:[\u20ac$\u00a3]\s?\d|\d(?:[.,]\d{1,2})?\s?(?:\u20ac|(?:EUR|USD|GBP)\b))/;

// The page's own text: the full copy when one was asked for, else excerpts.
function oneText(r){
  const full=r&&typeof r.full_content==="string"?r.full_content:"";
  if(full.trim())return full;
  return Array.isArray(r&&r.excerpts)?r.excerpts.join("\n"):"";
}
function pageTextOf(results){
  return (results||[]).map(oneText).join("\n").trim();
}

// The title as printed (her decision, Louvre Experience of Nature): kept only as far
// as the pages print it — whole, else its longest leading part (split at . : and
// dashes). Accents, capitals and punctuation do not count.
function titleKey(t){
  return " "+foldText(t).replace(/[^a-z0-9]+/g," ").trim()+" ";
}
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

// A LANGUAGE NAMED BY A READ, in any of the venues' languages.
function isEnglishLang(l){
  return /\b(english|anglais|inglese|englisch|engels|ingl[e\u00e9]s)\b/i.test(String(l||""));
}

// How much of one page Claude is handed. The ISBN is read in code from the uncut text
// (isbnOnPage), so this cap can only cost the publisher line.
const PAGE_CHARS=20000;

// The ISBN, read in code first (her decision): a 978/979 number labelled ISBN or EAN
// with a valid check digit, taken only when the page carries exactly ONE ("EAN
// 9782754117425" at Orsay). None or two → Claude reads the page.
function isbn13Checks(d){
  if(!/^97[89]\d{10}$/.test(d))return false;
  let sum=0;
  for(let i=0;i<12;i++)sum+=Number(d[i])*(i%2?3:1);
  return (10-(sum%10))%10===Number(d[12]);
}
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
function isbnOnPage(text){
  const found=isbnsLabelled(text);
  return found.size===1?[...found][0]:null;
}

// The ISBN in web search results, read in code (her Ashmolean In Bloom): only results
// carrying the whole book title count; their labelled numbers plus any valid 978/979
// number in their addresses. Exactly one distinct number, or nothing.
function resultsCarrying(results,bookTitle){
  const norm=v=>foldText(v).replace(/[^a-z0-9]+/g," ").trim();
  const want=norm(bookTitle);
  if(want.length<6)return[];
  return (results||[]).filter(r=>(" "+norm(String((r&&r.title)||"")+" "+oneText(r))+" ").includes(" "+want+" "));
}
function isbnInResults(results,bookTitle){
  const found=new Set();
  for(const r of resultsCarrying(results,bookTitle)){
    for(const d of isbnsLabelled(oneText(r)))found.add(d);
    for(const m of String((r&&r.url)||"").matchAll(/(?:^|[^0-9])(97[89]\d{10})(?![0-9])/g))
      if(isbn13Checks(m[1]))found.add(m[1]);
  }
  return found.size===1?[...found][0]:null;
}

// An empty page is not a page with nothing on it: a script-drawn page is our blind
// spot, never a finding.
function pageIsShell(results){ return pageTextOf(results).length<SHELL_CHARS; }

// A link read off a listing is checked: on the publisher's own host, and not the
// listing itself. A differing #fragment is a different address — Hannibal addresses
// its books by fragment.
function sameAddress(a,b){
  const strip=u=>{try{const x=new URL(String(u));return (x.origin+x.pathname).replace(/\/+$/,"")+x.search;}catch{return String(u||"").trim();}};
  return strip(a)===strip(b);
}
function deepLinkOn(u,host,container){
  if(!u)return null;
  const t=String(u).trim();
  if(!urlLooksValid(t))return null;
  let h; try{ h=new URL(t).hostname.toLowerCase(); }catch{ return null; }
  if(h!==String(host||"").toLowerCase())return null;
  if(container&&sameAddress(t,container)&&!/#/.test(t))return null;
  return t;
}


// The publisher button claims only what was verified (docs/app.md §1): "Publisher" =
// the book's own page; "Publisher's section" = the section it sits in; "Publisher's
// website" = the home page. An old row with no kind keeps the plain label.
function publisherLinkLabel(kind){
  if(kind==="container")return "Publisher\u2019s section";
  if(kind==="site")return "Publisher\u2019s website";
  return "Publisher";
}

// Each publisher-step outcome says which one it was, in one sentence (C-052 to
// C-069a). No result recorded says nothing: the step did not finish, or the row
// predates outcomes (her decision). Self-published and the book's own page say nothing.
function publisherNote(result,hasUrl){
  if(result==="container")return "Publisher\u2019s link opens the section this book sits in, not the book\u2019s own page.";
  if(result==="site")     return "Couldn\u2019t find this book on the publisher\u2019s site — the link opens their home page.";
  if(result==="nosite")   return "Couldn\u2019t work out the publisher\u2019s own website, so there\u2019s no link to it.";
  if(result==="unnamed")  return "No publisher was named for this book, so none was looked for.";
  // Self-published: no button is answer enough (her decision).
  if(result==="selfpublished")return "";
  if(result==="product")  return "";
  return "";
}


// ── A BOOK LEAVING THE SHOP — "Re-check museum shop" (docs/app.md §1) ───────
// Only Re-check moves the shop status; she presses it after seeing the change, so it
// is not a monitor. With a link it re-reads that page (gone, redirected or sold out →
// "No longer", link kept as "Museum shop (last seen)"; buyable again → "Back"). With
// none it runs the shop step alone ("Now"). No history kept; a failed check changes
// nothing. Pre-order counts as in the shop; sold out in any language counts as gone.
//
// shopState: "shop" | "gone" | "web" | "none" | "blocked" | "script" | "parallel" | "unconfirmed" | null; "gone" keeps shopUrl.
// "blocked": the shop refused every page opened (KHM). "script": its pages opened with no
// books on them, drawn by script (MoMA). "parallel": a venue whose books Parallel drops
// (`shopUnseen`, the Städel), its pages showing no priced line. "unconfirmed": a section she confirmed though the
// finder could not read it (`shopUnseen` "unconfirmed"; Berlin's English one), cause unchecked. Each way whether the book is there is
// UNKNOWN — never "not in the shop". shopChange: "now" | "back" | null on a "shop" row.
// A legacy "gone" on a "web" row reads as plain "web".

// The one line at the top of the catalogue panel. Outside the component so a
// fixture can read the wording, for the reason countDecisions moved out.
// `null` means the ordinary grey sentence stands on its own.
function shopHeadline(shopState,shopChange){
  if(shopState==="shop"){
    if(shopChange==="back")return "Back in the museum shop.";
    if(shopChange==="now") return "Now in the museum shop.";
    return "In the museum shop.";
  }
  if(shopState==="gone")return "No longer in the museum shop.";
  return null;
}

// A blocked shop says so, in her wording (docs/app.md §1): the headline in the red and
// weight of "No longer in the museum shop.", the rest grey.
const SHOP_BLOCKED_HEAD="The museum shop is blocked";
const SHOP_SCRIPT_HEAD="The museum shop contents cannot be seen — JS-rendering";
const SHOP_PARALLEL_HEAD="The museum shop contents cannot be seen — Parallel fault";
const SHOP_UNCONFIRMED_HEAD="The museum shop contents cannot be seen — unconfirmed page problem";
// A shop the lookup could not read: refused, drawn by script, or dropped by Parallel (her wording for each).
const shopUnread=s=>s==="blocked"||s==="script"||s==="parallel"||s==="unconfirmed";
const shopUnreadHead=s=>s==="script"?SHOP_SCRIPT_HEAD:s==="parallel"?SHOP_PARALLEL_HEAD:s==="unconfirmed"?SHOP_UNCONFIRMED_HEAD:SHOP_BLOCKED_HEAD;
// Re-check's line for each: "Re-check didn’t work — museum shop " + this.
const shopUnreadSaid=s=>s==="script"?"contents cannot be seen — JS-rendering":s==="parallel"?"contents cannot be seen — Parallel fault":s==="unconfirmed"?"contents cannot be seen — unconfirmed page problem":"is blocked";
const SHOP_BLOCKED_FOUND_REST=" — search it manually. The catalogue is stocked elsewhere.";
const SHOP_BLOCKED_NONE_REST=". The catalogue also does not appear to exist elsewhere. Search manually to confirm.";

// A ticket is never a catalogue (her decision, KHM Canaletto & Bellotto): a link with
// /ticket/ or /tickets/ in its path is never taken as the book. L-001 to L-019.
function isTicketLink(url){ return /\/tickets?\//i.test(String(url||"")); }

// The link, only when it is really on the venue's shop and is not a ticket.
// One copy, used by the lookup and by Re-check. A shop page links outward —
// to a publisher, a distributor, another shop — so a link read off a shop page
// is not automatically ON that shop.
function shopLinkOf(o,dom){
  const u=o&&o.shopUrl;
  if(!u||!dom||isTicketLink(u))return null;
  return String(u).toLowerCase().includes(String(dom).toLowerCase())?u:null;
}

// The book's link on a shelf, read in code (her decision, MAD Christofle): exactly one
// address on the shop's own site whose link words carry the whole catalogue title; two
// or none → nothing. Never a page this step opened, never a ticket.
function bookLinkOnShelf(results,bookTitle,dom,opened){
  const all=shelfLinksFor(results,bookTitle,dom,opened);
  return all.length===1?all[0]:null;
}
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

// What Claude is given to read (her decision, Botticelli): a result that fits is given
// whole; a longer one gets its RELEVANT lines first — naming the show or book, a
// catalogue/ISBN/price word, or a link onto the venue's shop, each with its neighbours —
// then the rest in page order up to the cap. At most eight results, under the 64 KiB
// ceiling.
const PASSAGE_CUES=/catal[o\u00f3]g|katalog|isbn|\bean\b|edition|\u00e9dition|edizione|ausgabe|publisher|\u00e9diteur|editore|verlag|uitgeverij|hardcover|hardback|paperback|softcover|\bpages\b|[$\u20ac\u00a3]\s?\d|\d\s?(?:\u20ac|eur\b)|sold out|out of stock|\u00e9puis\u00e9|esaurito|ausverkauft|uitverkocht|add to (?:cart|bag|basket)|pre-?order|english|anglais|inglese|englisch|engels/i;
const FOCUS_STOP=new Set(["the","and","from","with","exhibition","catalogue","catalog","museum","musee","mus\u00e9e","paris","london","edition"]);
function focusWords(words){
  const out=new Set();
  for(const w of (words||[]).join(" ").split(/[^\p{L}\p{N}]+/u)){
    const f=foldText(w);
    if(f.length>=4&&!FOCUS_STOP.has(f))out.add(f);
  }
  return [...out];
}
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
// Outside the component so a fixture can reach it (AL-022, AL-023). Eight results
// unless a caller asks for more (the edition search, WL-060).
const resultsForPrompt=(list,cap,focus,most)=>list.slice(0,most||8).map((r,i)=>
  (i+1)+". "+String(r.title||"(untitled)")+"\n   "+String(r.url||"")+"\n   "
  +(Array.isArray(r.excerpts)?pickPassages(r.excerpts.join("\n"),focus,cap||700):"")
).join("\n\n");

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

// The publisher, read off the ISBN (her decision, Botticelli: three lookups gave three
// publishers). Only results carrying the ISBN count, and only their LABELLED publisher;
// each result votes once, and one house's names fold together. Two agreeing votes,
// ahead of any other, or nothing. The label must not sit inside a longer word (an
// ASCII \b cannot see "É").
const PUBLISHER_LABEL=/(?<!\p{L})(?:publisher|published by|[ée]diteur|[ée]dit[ée] par|editore|editorial|verlag|uitgever(?:ij)?)\s*:?\s*\[?([^\]\n|(]{2,70}?)(?:\]|\s*,\s*(?:19|20)\d\d|\s*\(|\n|$)/giu;
function houseWords(n){
  return normPublisher(n).split(" ").filter(w=>w.length>2&&!PUBLISHER_WORDS.has(w)&&!["fonds","editions","ed","sa","srl","gmbh"].includes(w));
}
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
// The spelling most results use, ordinary capitals preferred over SHOUTING.
function groupName(g){
  const count=new Map();
  for(const n of g.names)count.set(n,(count.get(n)||0)+1);
  return [...count.entries()].sort((a,b)=>b[1]-a[1]||(a[0]===a[0].toUpperCase())-(b[0]===b[0].toUpperCase()))[0][0];
}
function publisherOnIsbnResults(results,isbn){
  const groups=publisherGroups(results,isbn), top=groups[0];
  if(!top||top.votes<2||(groups[1]&&groups[1].votes===top.votes))return null;
  return groupName(top);
}

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

// The show's catalogue in the venue's own language (her decision, Hammershøi, listed
// only in French): the show's name before any colon, the venue's name, "exhibition
// catalogue" in its language and the opening year. Non-English venues only.
const CATALOGUE_WORDS={louvre:"catalogue exposition",orsay:"catalogue exposition",mad:"catalogue exposition",
  jacquemart:"catalogue exposition",mam:"catalogue exposition",khm:"Ausstellungskatalog",rijks:"tentoonstellingscatalogus",
  uffizi:"catalogo mostra",dellav:"catalogo mostra",borghese:"catalogo mostra",brera:"catalogo mostra",capo:"catalogo mostra"};
function localCatalogueQuery(mu,row){
  const word=mu&&mu.english===false&&CATALOGUE_WORDS[mu.id];
  if(!word)return[];
  const head=String(row.title||"").split(/\s*:\s*/)[0].trim();
  const year=/^\d{4}/.test(String(row.startDate||""))?" "+String(row.startDate).slice(0,4):"";
  return head?[head+" "+lookupName(mu)+" "+word+year]:[];
}

// The English-edition line on a foreign book: how far an English edition was looked
// for (her decision), or which original the English edition on the card translates.
// It never restates the publisher-page status. Null: nothing to say — and on a card
// with several versions, whose own lines say it.
function englishLine(r){
  if(Array.isArray(r&&r.editions)&&r.editions.length>1)return null;
  const c=r&&r.englishCheck;
  const o=r&&r.originalEdition;
  // An English book of the show refused as a different book (her wording, Hubert Robert):
  // named for her, never filed as the card's book, no buy links.
  const b=r&&r.otherVenueBook;
  if((c==="publisher"||c==="shops")&&b&&b.title&&b.isbn13)
    return "No English edition. An English catalogue from the show’s other venue is a different book: "
      +b.title+(b.publisher?", "+b.publisher:"")+", ISBN "+fmtIsbn(b.isbn13)+".";
  if(c==="english"&&o&&o.title)return "English edition of \u201c"+o.title+"\u201d"+(o.publisher?" ("+o.publisher+")":"")+".";
  // Her wording; the publisher is printed above, so not again here (her decision).
  if(c==="publisher")return "No English edition — checked publisher's site and bookshops.";
  if(c==="shops")return "No English edition found in bookshops.";
  if(c==="unknownlang")return "The book\u2019s language couldn\u2019t be confirmed, so no English edition was looked for.";
  if(c==="stopped")return "English edition not checked \u2014 the search stopped part-way. Search again to retry.";
  return null;
}

// The shop button's label. "(last seen)" is what tells her the page may be
// dead or sold out while the link is still worth keeping.
// The card's "Museum shop" link with no book page of its own: a section written in for the venue (her decision:
// Basel, the Städel), else the shop's search for the show, else its front page. Null when there is none.
function shopButtonUrl(mu,title){
  if(!mu)return null;
  return mu.shopLink||(mu.shopSearch?mu.shopSearch+encodeURIComponent(title):mu.shopHome||null);
}
function shopLinkLabel(shopState){ return shopState==="gone"?"Museum shop (last seen)":"Museum shop"; }

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
function resetCard(r){
  return{...r,looked:false,hasCatalogue:"unknown",catalogueTitle:null,isbn13:null,publisher:null,
    publisherUrl:null,publisherResult:null,shopUrl:null,shopState:null,shopChange:null,englishCheck:null,originalEdition:null,otherVenueBook:null,alsoVersion:null,
    editions:null,editionPick:null};
}
// The cards Reset cards can offer: searched ones whose title, catalogue title
// or venue carry what she typed. Accents and capitals do not count.
function cardsToReset(rows,q){
  const k=foldText;
  const want=k(q).trim();
  if(!want)return[];
  return rows.filter(r=>r.looked&&[r.title,r.catalogueTitle,MU[r.museumId]&&MU[r.museumId].short,MU[r.museumId]&&MU[r.museumId].name]
    .some(t=>k(t).includes(want)));
}

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

// Cases 1 and 3 — re-read the ONE page on file: {ok:true, row, said}, or {ok:false,
// said} and nothing may change. 404/410 is decided in code from the connector's error;
// any other error or an empty page is a failed check, never "gone". Otherwise one
// question to Claude: is THIS book for sale HERE, now? A redirect fails that test.
const GONE_HTTP=new Set([404,410]);

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
async function readShopPage(book,url,io,opened){
  const f=opened||await openShopPage(io?io.fetch:fetchPage,url,
    "Whether the book “"+book+"” can be bought on this page now: its product page, price, "
      +"add to cart, pre-order, sold out, out of stock, unavailable.",
    [book+" add to cart sold out"],{full:true});
  if(!f.ok)return{kind:"norun",detail:f.detail,why:f.detail.split("[")[0].trim()};
  const dead=(f.errors||[]).find(e=>GONE_HTTP.has(Number(e&&e.http_status_code)));
  if(dead)return{kind:"gone",status:dead.http_status_code,
    detail:f.detail+"\nThe shop answered "+dead.http_status_code+": that page no longer exists."};
  if(!f.results.length||pageIsShell(f.results)){
    const why=(f.errors||[]).map(e=>String((e&&e.error_type)||"")+(e&&e.http_status_code?" "+e.http_status_code:"")).filter(Boolean).join(", ");
    return{kind:"unreadable",why,detail:f.detail+(why?"\n"+why:"")};
  }
  const served=f.results.map(r=>String((r&&r.url)||"")).filter(Boolean).join(" ");
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
   +'\n\nReply with ONLY this JSON object and nothing else:\n{"forSale": true|false, "why": string}\n'
   +'Example: {"forSale":false,"why":"The page says Sold out."}');
  if(!rd.ok)return{kind:"noread",detail:f.detail+"\n"+rd.detail,why:rd.detail.split("[")[0].trim()};
  const d=rd.data||{};
  if(typeof d.forSale!=="boolean")return{kind:"badanswer",detail:f.detail+"\n"+JSON.stringify(d)};
  const why=String(d.why||"").trim();
  if(!d.forSale&&inStockByRule(url,f.results)){
    const said="The page\u2019s own status line says In Stock (this shop draws its Add to Cart by script).";
    return{kind:"read",forSale:true,why:said,results:f.results,detail:f.detail+"\n"+rd.detail+(why?"\n"+why:"")+"\n"+said};
  }
  return{kind:"read",forSale:d.forSale,why,results:f.results,detail:f.detail+"\n"+rd.detail+(why?"\n"+why:"")};
}

// Put text on the clipboard; true only if it got there. The clipboard API
// first; a page in a frame may be refused it, so the old select-and-copy
// route second. Neither throwing is taken as success.
async function copyText(text){
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(String(text)); return true; } }catch{}
  try{
    const t=document.createElement("textarea"); t.value=String(text); t.setAttribute("readonly","");
    t.style.position="fixed"; t.style.opacity="0"; document.body.appendChild(t); t.select();
    const ok=document.execCommand&&document.execCommand("copy"); document.body.removeChild(t); return !!ok;
  }catch{ return false; }
}

async function recheckLinkedPage(row){
  const book=row.catalogueTitle||row.title;
  const p=await readShopPage(book,row.shopUrl);
  const hadIt=row.shopState==="shop";
  if(p.kind==="norun")return{ok:false,detail:p.detail,said:"Re-check didn’t run — "+p.why};
  if(p.kind==="gone")return{ok:true,detail:p.detail,row:{...row,shopState:"gone",shopChange:null},
    said:hadIt?"Re-checked: page no longer exists."
              :"Re-checked: shop page has not returned. Still no longer in the museum shop."};
  if(p.kind==="unreadable")return{ok:false,detail:p.detail,
    said:"Re-check didn’t work — shop page couldn’t be read"+(p.why?" ("+p.why+")":"")+"."};
  if(p.kind==="noread")return{ok:false,detail:p.detail,said:"Re-check didn’t finish — "+p.why};
  if(p.kind==="badanswer")return{ok:false,detail:p.detail,said:"Re-check didn’t finish — answer came back unreadable."};
  if(p.forSale){
    if(hadIt)return{ok:true,detail:p.detail,row,said:"Re-checked: still for sale in the museum shop."};
    return{ok:true,detail:p.detail,row:{...row,shopState:"shop",shopChange:"back"},said:"Re-checked: back in the museum shop."};
  }
  return{ok:true,detail:p.detail,row:{...row,shopState:"gone",shopChange:null},
    said:hadIt?"Re-checked: no longer for sale in the museum shop."+(p.why?" "+p.why:""):"Re-checked: still not for sale in the museum shop."};
}

// "Re-check museum shop" on one card → {ok, detail, row?, said}. At top level so the
// shop check page runs the same code; the page's recheckShop prints its answer.
// A card with several books: Re-check is about the picked one only, and that book's own
// stored fields follow the card (pickRow reads them back). SV-006 to SV-008.
function pickedVersion(row){
  const vs=Array.isArray(row&&row.editions)?row.editions:[];
  return vs.length>1&&Number.isInteger(row.editionPick)?vs[row.editionPick]||null:null;
}
function withPickedCard(row){
  const v=pickedVersion(row);
  if(!v)return row;
  const card={catalogueTitle:row.catalogueTitle||null,isbn13:row.isbn13||null,publisher:row.publisher||null,publisherUrl:row.publisherUrl||null,
    publisherResult:row.publisherResult||null,shopState:row.shopState||null,shopUrl:row.shopUrl||null};
  return{...row,editions:row.editions.map(x=>x===v?{...v,card}:x)};
}
async function recheckShopRow(found,hooks){
  const out=await recheckShopCore(found,hooks);
  return out.row?{...out,row:withPickedCard(out.row)}:out;
}
async function recheckShopCore(found,hooks){
  // A ticket on file was never the book: dropped, and the shop searched afresh.
  const ticket=!!(found.shopUrl&&isTicketLink(found.shopUrl));
  const row=ticket?{...found,shopUrl:null,shopState:"web",shopChange:null}:found;
  let out;
  if(row.shopUrl&&(row.shopState==="shop"||row.shopState==="gone")){
    if(hooks&&hooks.label)hooks.label("Re-reading the shop page\u2026");
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
    if(!s.ran)out={ok:false,detail:"",said:"Re-check didn’t run — venue has no shop."};
    else if(!s.ok)out={ok:false,detail:s.detail,said:"Re-check didn’t run — "+s.detail.split("\n").pop().split("[")[0].trim()};
    // A blocked shop is a failed check and changes nothing — except a ticket
    // link, which was wrong whatever the shop says.
    else if(s.blocked)out=ticket
      ?{ok:true,detail:s.detail,row:{...row,shopState:s.blocked},said:dropped+"Re-check didn’t work — museum shop "+shopUnreadSaid(s.blocked)+"."}
      :{ok:false,detail:s.detail,said:"Re-check didn’t work — museum shop "+shopUnreadSaid(s.blocked)+"."};
    // The shop's book is the picked one only when its ISBN says so; otherwise the picked
    // book is looked for on the list the shop step read, as the lookup does.
    else if(pickedVersion(row)&&!(o.found&&o.isbn13&&[pickedVersion(row).isbn13,pickedVersion(row).alsoIsbn13].includes(o.isbn13))){
      const v=pickedVersion(row), log=[];
      const F={title:row.catalogueTitle||v.title,isbn:row.isbn13||v.isbn13,publisher:row.publisher||v.publisher};
      const {url,failed}=await bookOnShelfAfterWeb(F,v,s.results,dom,new Set(shopPagesFor(MU[row.museumId],String(row.title||"").trim()).map(normalizeUrlKey)),io,log);
      const detail=[s.detail].concat(log).join("\n");
      out=failed?{ok:false,detail,said:"Re-check didn’t work — shop page couldn’t be read."}
        :url?{ok:true,detail,row:{...answered,shopState:"shop",shopUrl:url,shopChange:null},said:dropped+(row.shopState==="shop"?"Re-checked: still in the museum shop.":"Re-checked: now in the museum shop.")}
        :{ok:true,detail,row:{...answered,shopState:"web",shopUrl:null},said:dropped+"Re-checked: not in the museum shop."};
    }
    else if(o.found&&(o.catalogueTitle||o.isbn13)&&(onShop||o.listedOnly)){
      // Reading the book's page for a blank ISBN is part of the shop step —
      // the page IS the shop's. Web search and the publisher are never run.
      const hit=await readBookPage({ok:true,detail:s.detail,pageUrl:o.shopUrl,row:foundInShop(row,o)},
        MU[row.museumId]?.name||"",dom,io);
      out={ok:true,detail:hit.detail,row:hit.row,said:dropped+(row.shopState==="shop"?"Re-checked: still in the museum shop.":"Re-checked: now in the museum shop.")};
    }
    else out={ok:true,detail:s.detail,row:answered,said:dropped+"Re-checked: not in the museum shop."};
  }
  return out;
}

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
  if(isbns.size)return [F.isbn,v&&v.alsoIsbn13].filter(Boolean).some(i=>isbns.has(i))?"the same ISBN":null;
  const printed=(text.match(/(?<![0-9])(\d{2,4})\s*(?:pages|pp\b)/i)||[])[1];
  if(v&&v.pages&&printed&&Number(printed)!==Number(v.pages))return null;
  if(v&&v.pages&&printed)return "the same page count";
  const pub=F.publisher?normPublisher(F.publisher):"";
  if(pub.length>=4&&(" "+normPublisher(text)+" ").includes(" "+pub+" "))return "the same publisher";
  return null;
}
// `seen` (optional): pages already opened and read in this lookup, by address, so a page
// carrying two books' titles is opened once.
async function bookOnShelfAfterWeb(F,v,shelf,dom,opened,io,log,seen){
  const links=shelfLinksFor(shelf,F.title,dom,opened)||[];
  if(!links.length)return{url:null,failed:null};
  let failed=null;
  const miss=(url,why)=>{ if(!failed)failed="couldn’t read "+url+(why?" ("+why+")":""); };
  log.push("The book found on the web, looked for on the shop’s own list: "+links.length+" link"+(links.length===1?"":"s")+" carrying “"+F.title+"”.");
  for(const url of links){
    const key=normalizeUrlKey(url), had=seen&&seen.get(key);
    const f=had?had.f:await openShopPage(io.fetch,url,
      "Whether the book “"+F.title+"” can be bought on this page now: its ISBN, pages, publisher, price, add to cart, sold out.",
      [F.title+" ISBN add to cart"],{full:true});
    if(seen&&!had)seen.set(key,{f});
    if(!had)log.push(f.detail);
    if(!f.ok||!f.results.length||pageIsShell(f.results)){ miss(url,f.ok?"blank page":f.detail.split("\n").pop().split("[")[0].trim()); continue; }
    const same=sameBookOnPage(f.results,F,v);
    if(!same){ log.push("Not this book: "+url); continue; }
    const mem=seen&&seen.get(key);
    const p=mem&&mem.p?mem.p:await readShopPage(F.title,url,io,f);
    if(mem&&!mem.p)mem.p=p;
    log.push(p.detail);
    if(p.kind==="read"&&p.forSale){ log.push("In the museum shop ("+same+"): "+url); return{url,failed:null}; }
    if(p.kind!=="read"&&p.kind!=="gone")miss(url,p.why);
  }
  if(failed)log.push("Not settled: "+failed+".");
  return{url:null,failed};
}

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
// At a non-English venue the web read takes the venue's own book; whether an English
// edition is the same catalogue is decided once, in code (editionsOf; Hubert Robert).
const READ_RULES_FOREIGN=READ_RULES.replace(/If the same catalogue is sold in more than one language, take the ENGLISH edition\.\n$/,
  "If the catalogue is sold in more than one language, take the edition in the venue's own language — "
 +"an English edition is checked separately.\n");

const READ_SHAPE=
  "\nReply with ONLY this JSON object and nothing else:\n"
 +'{"found": true|false, "catalogueTitle": string|null, "isbn13": string|null, '
 +'"publisher": string|null, "publisherUrl": string|null, "shopUrl": string|null, "thisVenue": true|false}\n'
 +'Example: {"found":true,"catalogueTitle":"Metamorphoses: Ovid and the Arts","isbn13":"9789493416543",'
 +'"publisher":"Hannibal Books","publisherUrl":"https://hannibalbooks.be/en/metamorphoses",'
 +'"shopUrl":null,"thisVenue":true}\n'
 +'Set "found" false and every other field null when these results show no catalogue.';

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
const PAGE_SHAPE=
  "\nReply with ONLY this JSON object and nothing else:\n"
 +'{"isbn13": string|null, "publisher": string|null, "publisherUrl": string|null}\n'
 +'Example: {"isbn13":"9781588398130","publisher":"The Metropolitan Museum of Art",'
 +'"publisherUrl":null}';

// The page arrives whole (fetchPage {full}). Capped, because the prompt has a ceiling
// and a page carries its menus too — PAGE_CHARS.
const pageForPrompt=(list,cap)=>list.slice(0,2).map(r=>
  String(r.title||"")+"\n"+String(r.url||"")+"\n"+oneText(r).replace(/[ \t]+/g," ")
).join("\n\n").slice(0,cap||PAGE_CHARS);

// THE PROGRESS LINE (her decision): at most four labels, in this order, each at most
// once, never back to an earlier one. The book's page and the facts round share one.
// Re-check stops at the first (upTo). PL-001 to PL-005.
const LOOKUP_STAGE={shop:1,web:2,page:3,facts:3,publisher:4};
function lookupLabel(n,foreign){
  return n===1?"Searching venue shop\u2026":n===2?"Searching more broadly\u2026"
    :n===3?(foreign?"Finding the ISBN, publisher and English edition\u2026":"Finding the ISBN and publisher\u2026")
    :n===4?"Looking for the publisher\u2019s page\u2026":"";
}

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
    "The printed exhibition catalogue for “"+title+"”: the book’s own product page "
      +"on this shop, its full title and its price.",
    [title+" exhibition catalogue book"]);
  if(!s1.ok)return{ran:true,ok:false,detail:s1.detail,data:null};
  // Every page refused is not "nothing there": the shop could not be read (KHM).
  if(!s1.results.length&&(s1.errors||[]).length)
    return{ran:true,ok:true,blocked:"blocked",detail:s1.detail+"\nThe museum shop refused every page, so it could not be searched.",data:null};
  if(!s1.results.length)return{ran:true,ok:true,detail:s1.detail,data:null};
  // A venue whose books Parallel drops (the Städel), a shop drawn by script (Basel), or a section she confirmed
  // unread (Berlin's English one): no priced line, even read whole, is "parallel", "script" or "unconfirmed".
  const priced=r=>pageTextOf(r.results).split("\n").some(realPrice);
  if(mu&&(mu.shopUnseen==="parallel"||mu.shopUnseen==="script"||mu.shopUnseen==="unconfirmed")&&!priced(s1)){
    const whole=await io.fetch(shopPages,"The books in this section of the shop, with their prices.",null,{full:true});
    if(!whole.ok)return{ran:true,ok:false,detail:s1.detail+"\n"+whole.detail,data:null};
    if(!priced(whole))
      return{ran:true,ok:true,blocked:mu.shopUnseen,detail:s1.detail+"\n"+whole.detail+(mu.shopUnseen==="parallel"?"\nParallel brought back this shop’s pages without their books, so it could not be searched.":"\nThe shop’s pages came back without their books, so it could not be searched."),data:null};
  }
  // Every page empty: drawn by script (her decision, MoMA Brancusi), "script". But short excerpts are not an empty page (her Watteau): the pages are
  // opened again whole, and the shop is unread only if they are still empty or show
  // no price anywhere.
  let shop=s1;
  // The pages read whole: {whole} with books on them, or the step's answer when none.
  const readWhole=async()=>{
    const whole=await io.fetch(shopPages,"The books in this section of the shop, with their prices.",null,{full:true});
    if(!whole.ok)return{out:{ran:true,ok:false,detail:s1.detail+"\n"+whole.detail,data:null}};
    let books=whole.results.filter(r=>!pageIsShell([r])&&SHOP_PRICE.test(oneText(r)));
    // No price on any page: a list of titles is books when its first product is one
    // (firstProductIsBook, Yale's Publications), or its first book under its own address (Galerie Karsten Greve).
    const listed=books.length?null:whole.results.find(r=>!pageIsShell([r]));
    if(listed&&await firstProductIsBook(io.fetch,oneText(listed),dom,listed.url))books=[listed];
    if(!books.length)
      return{out:{ran:true,ok:true,blocked:"script",detail:s1.detail+"\n"+whole.detail+"\nThe museum shop’s pages came back with no books on them, so it could not be searched.",data:null}};
    return{whole};
  };
  if(s1.results.every(r=>pageIsShell([r]))){
    const w=await readWhole();
    if(w.out)return w.out;
    shop={...w.whole,detail:s1.detail+"\n"+w.whole.detail+"\nThe shop’s pages, read whole: books on them, none about this show in the excerpts."};
  }
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
  const showsBook=r=>oneText(r).split("\n").some(realPrice)||productLinksOn(oneText(r),hostOf(r.url)).length>0;
  if(!(r1.data&&r1.data.found)&&shop===s1&&s1.results.every(r=>!showsBook(r))){
    const w=await readWhole();
    if(w.out&&w.out.blocked)return w.out;
  }
  const data={...(r1.data||{})};
  // An ISBN the read gave is taken only if the shop's pages print it (toIsbn13).
  data.isbn13=toIsbn13(data.isbn13,shop.results);
  // The title as the shop's pages print it — titleAsPrinted.
  if(data.found&&data.catalogueTitle){
    const tp=titleAsPrinted(data.catalogueTitle,shop.results);
    if(tp.cut)detail+="\nTitle cut to what the shop prints: “"+tp.title+"” (the read gave “"+data.catalogueTitle+"”).";
    else if(!tp.onPage)detail+="\nThe title the read gave is not on the shop’s pages as written.";
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
      detail+="\nThe book’s own link, read off the shop’s listing: "+own;
      return{ran:true,ok:true,detail,results:shop.results,data:{...data,shopUrl:own}};
    }
  }
  if(listed){
    detail+="\nThe link given was the shop's own listing, not the book's page — kept as in the shop, without a link of its own.";
    return{ran:true,ok:true,detail,results:shop.results,data:{...data,shopUrl:null,listedOnly:true}};
  }
  return{ran:true,ok:true,detail,results:shop.results,data};
}

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
      detail:hit.detail+"\n"+p.detail+"\nThe shop link from the web search opened and is the book, for sale.",
      row:{...hit.row,shopState:"shop",shopChange:null,shopUrl:link}};
  }
  const why=p.kind==="read"?"isn’t this book for sale"+(p.why?" ("+p.why+")":"")
    :p.kind==="gone"?"no longer exists ("+p.status+")"
    :p.kind==="unreadable"?"didn’t open"+(p.why?" ("+p.why+")":"")
    :"couldn’t be checked";
  return{...hit,shopCandidate:null,pageUrl:null,
    detail:hit.detail+"\n"+p.detail+"\nThe shop link from the web search "+why+", so it is not filed as in the museum shop.",
    trouble:(p.kind==="norun"||p.kind==="noread")?p.detail:hit.trouble};
}

// Re-check's read of the book's shop page for a blank ISBN or publisher: one page,
// read whole, ISBN read in code first. Fills blanks only (applyIsbnFill).
async function readBookPage(hit,venue,dom,io){
  if(!needsPageRead(hit))return hit;
  const r=hit.row;
  const book=r.catalogueTitle||r.title;
  io.phase("page");
  // The venue's own shop page gets the blank-page retry (openShopPage); a publisher's does not.
  const f=await (shopLinkOf({shopUrl:hit.pageUrl},dom)?(...a)=>openShopPage(io.fetch,...a):io.fetch)(hit.pageUrl,
    "The ISBN-13, the publisher, and any link to the publisher’s own page for the book "
      +"“"+book+"”, including any details or specification panel on the page.",
    [book+" ISBN publisher details"],{full:true});
  let detail=hit.detail+"\n"+f.detail;
  if(!f.ok)return{...hit,detail,trouble:f.detail};
  if(!f.results.length)return{...hit,detail};
  const coded=r.isbn13?null:isbnOnPage(pageTextOf(f.results));
  if(coded)detail=detail+"\nISBN read off the page in code: "+coded;
  const rd=await io.read(PAGE_RULES
    +"\nBook: "+book+"\nExhibition venue: "+venue+"\n\n"
    +pageForPrompt(f.results)+PAGE_SHAPE);
  detail=detail+"\n"+rd.detail;
  if(!rd.ok){
    if(!coded)return{...hit,detail,trouble:rd.detail};
    return{...hit,detail,trouble:rd.detail,row:applyIsbnFill(r,{isbn13:coded},dom,f.results)};
  }
  const o={...(rd.data||{}),...(coded?{isbn13:coded}:{})};
  const filled=applyIsbnFill(r,o,dom,f.results);
  detail=detail+(filled.isbn13?"\nISBN read off the page: "+filled.isbn13
                              :"\nNo ISBN on that page either.");
  return{...hit,detail,row:filled};
}

// ── WHERE AN ENGLISH EDITION IS RECORDED ─────────────────────────────────────
// The venue's language, for the library-record wording "originally published in
// French as …". Non-English venues only, beside CATALOGUE_WORDS.
const VENUE_LANGUAGE={louvre:"French",orsay:"French",mad:"French",jacquemart:"French",mam:"French",
  khm:"German",rijks:"Dutch",uffizi:"Italian",dellav:"Italian",borghese:"Italian",brera:"Italian",capo:"Italian"};
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

// A record tying a translation to its original: one of these phrases, folded.
const EDITION_LINK=/originally published|english edition|translated from|translation of|edition anglaise|traduction|edizione inglese|englische ausgabe|engelse editie/;
const TITLE_STOP=new Set([...FOCUS_STOP,"dans","pour","avec","della","delle","dello","degli","eine","einer","sous","voor","over"]);
function titleWords(t){
  return [...new Set(foldText(t).split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!TITLE_STOP.has(w)))];
}
// Results not already in a list, by address.
function notIn(list,already){
  const seen=new Set((already||[]).map(x=>normalizeUrlKey(x&&x.url)));
  return (list||[]).filter(x=>!seen.has(normalizeUrlKey(x&&x.url)));
}
// A page count Claude reports, kept only when the text prints it ("544 pages", "281 pp.").
function pagesPrinted(n,results){
  const v=parseInt(String(n||"").replace(/[^0-9]/g,""),10);
  if(!(v>=8&&v<=3000))return null;
  const re=new RegExp("(?<![0-9])"+v+"\\s*(?:pages|pp\\b|p\\.|pagine|seiten|s\\.|blz|bladzijden)","i");
  return (results||[]).some(x=>re.test(resultText(x)))?v:null;
}
// Two page counts this far apart are two books, not one translated (her decision,
// Hubert Robert: Somogy's 544 pages against Lund Humphries' 288).
function differentBook(a,b){ return !!(a&&b&&Math.abs(a-b)/Math.max(a,b)>0.15); }
// The page count the records of ONE ISBN print: results carrying that number and no other
// ISBN, their counts agreeing; else null. Every valid 978/979 number in a result counts.
function isbnsIn(x){
  const t=resultText(x).replace(/(\d)[\u2010-\u2015-](?=\d)/g,"$1");
  return new Set([...t.matchAll(/(?<![0-9])(97[89]\d{10})(?![0-9])/g)].map(m=>m[1]).filter(isbn13Checks));
}
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

// ── EVERY VERSION OF THE CATALOGUE (docs/catalogue_versions.md) ──────────────
// A version: {title, lang, binding, pages, publisher, isbn13, alsoIsbn13, showing,
// proofUrl, note}. showing "this": this showing's catalogue, any language or printing;
// "other": a different book from another showing, listed and never picked. Fields
// starting "_" are the lookup's own and never stored (storedVersion).
const HARD_WORDS=/(?<!\p{L})(?:hardcover|hardback|hard cover|reli[ée]|rilegato|gebunden|gebonden|cartonn[ée])(?!\p{L})/iu;
const SOFT_WORDS=/(?<!\p{L})(?:paperback|softcover|soft cover|softback|broch[ée]|brossura|kartoniert|ingenaaid)(?!\p{L})/iu;
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
const MUSEUM_WORDS=/(?<!\p{L})(?:museum|nationalmuseum|mus[ée]e|museo|museu|gallery|galleria|galerie|gallerie|kunsthalle|pinacoteca|rijksmuseum|louvre)(?!\p{L})/iu;
// A museum's own imprint: every house named is a museum (isVenueImprint, or a museum word).
function museumImprintOnly(name,museumId){
  const parts=String(name||"").split(/\s*(?:\/|;|&|\s+and\s+|\s+with\s+|,)\s*/i).map(x=>x.trim()).filter(Boolean);
  return parts.length>0&&parts.every(p=>isVenueImprint(p,museumId)||MUSEUM_WORDS.test(p));
}
function sameBookTitle(a,b){
  const x=titleWords(a), y=titleWords(b);
  const [small,big]=x.length<=y.length?[x,y]:[y,x];
  return small.length>=2&&small.filter(w=>big.includes(w)).length>=Math.ceil(small.length*0.75);
}
function sameWords(a,b){
  const x=titleWords(a), y=titleWords(b);
  return x.length>=2&&x.length===y.length&&x.every(w=>y.includes(w));
}
// A language as the read named it, first letter capitalised.
function langName(l){
  const s=String(l||"").trim();
  return s?s.charAt(0).toUpperCase()+s.slice(1):null;
}
function sameLang(a,b){
  if(!a||!b)return !a&&!b;
  return isEnglishLang(a)===isEnglishLang(b)&&(isEnglishLang(a)||foldText(a)===foldText(b));
}
function onIsbn(results,isbn){ return isbn?(results||[]).filter(x=>isbnInText(isbn,resultText(x))):[]; }
// The page proving a version: the read's own page when it carries the ISBN, else the first that does.
function proofOf(onV,given){
  const g=given&&onV.find(x=>normalizeUrlKey(x&&x.url)===normalizeUrlKey(given));
  return String((g||onV[0]||{}).url||"")||null;
}
// The venue's own house: its imprint (isVenueImprint), or a name carrying every
// distinctive word of the venue's short name ("Louvre éditions").
const VENUE_GENERIC=new Set(["national","art","arts","fine","modern","royal","musee","museum","museo","museu",
  "gallery","galleria","galerie","collection","the"]);
function venueHouse(name,museumId){
  if(isVenueImprint(name,museumId))return true;
  const mu=MU[museumId];
  const v=mu?normPublisher(lookupName(mu)).split(" ").filter(t=>t.length>2&&!VENUE_GENERIC.has(t)):[];
  const n=" "+normPublisher(name)+" ";
  return v.length>0&&v.every(t=>n.includes(" "+t+" "));
}
const HOUSE_SPLIT=/\s*(?:\/|;|&|\s+and\s+|\s+with\s+)\s*/i;
function venuePrinting(name,museumId){
  const s=String(name||"").trim();
  return !!s&&[s,...s.split(HOUSE_SPLIT)].some(p=>p.trim()&&venueHouse(p.trim(),museumId));
}
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
// Never a version: a magazine's special issue (Canaletto – Guardi, Connaissance des Arts).
const MAGAZINE_WORDS=/hors[- ]s[ée]rie|special issue|num[ée]ro sp[ée]cial|sonderheft|numero speciale|(?<!\p{L})magazine(?!\p{L})|connaissance des arts/iu;
function aMagazine(title,publisher,onV){
  return MAGAZINE_WORDS.test(String(title||"")+" "+String(publisher||""))
    ||onV.some(x=>isbnsIn(x).size===1&&MAGAZINE_WORDS.test(String((x&&x.title)||"")));
}
// A different book counts as another showing's catalogue only where a result carrying
// its ISBN speaks of an exhibition or a catalogue (Reaktion's Botticelli does not).
const SHOW_WORDS=/catalog|exhibition|exposition|mostra|esposizione|ausstellung|tentoonstelling/i;
// The other showing's city, kept only where the text prints it; else, when its publisher
// is one of the app's venues, that venue's city.
function cityOf(said,pub,results,museumId){
  const c=String(said||"").trim();
  if(c&&(results||[]).some(x=>foldText(resultText(x)).includes(foldText(c))))return c;
  const m=venueNamedIn(pub,museumId);
  return m&&m.city||null;
}
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
// A version's year, kept only where a result carrying its ISBN prints it.
function yearOf(said,onV){
  const y=String(said||"").match(/(?<![0-9])(?:19|20)\d\d(?![0-9])/);
  return y&&onV.some(x=>new RegExp("(?<![0-9])"+y[0]+"(?![0-9])").test(resultText(x)))?+y[0]:null;
}

// The book found so far: this showing's catalogue.
function foundVersion(F,lang,pages,results,museumId,pageUrl){
  const onV=onIsbn(results,F.isbn);
  return{title:F.title||null,lang:lang||null,binding:F.isbn?bindingOfIsbn(results,F.isbn):null,
    pages:(F.isbn&&pagesOfIsbn(results,F.isbn))||pages||null,publisher:venueFirst(F.publisher,museumId),
    isbn13:F.isbn||null,alsoIsbn13:null,showing:"this",proofUrl:proofOf(onV,null)||pageUrl||null,note:null,
    city:null,year:null,_found:true};
}
// Other printings in the found book's language (her decision, Vasari): its own ISBN
// printed, the title's key words shared, page counts agreeing where printed — else the
// very same title words. A far shorter or longer one is not kept. VS-001 to VS-008.
function printingsOf(cands,card,results,museumId){
  const cardPages=pagesOfIsbn(results,card.isbn)||card.pages||null;
  const out=[];
  for(const c of (Array.isArray(cands)?cands:[])){
    if(!c||!c.title)continue;
    const isbn=toIsbn13(c.isbn13,results);
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
// Everything a result carries: its title, its address and its text, whole and excerpted.
function resultText(x){
  return [x&&x.title,x&&x.url,x&&typeof x.full_content==="string"?x.full_content:"",
    Array.isArray(x&&x.excerpts)?x.excerpts.join("\n"):""].filter(Boolean).join("\n");
}
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
    const isbn=toIsbn13(ed.isbn13,results||[]);
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

// ONE BOOK, TWO NUMBERS (her decision, Vasari and Hubert Robert): a co-edition given an
// ISBN by each publisher folds into one version — only where a record lists both under
// one ISBN label ("ISBN : 978-2-7572-1064-2. - 978-2-35031-535-5"). The outside house's
// number leads; the museum's own goes in alsoIsbn13. Bindings or page counts that
// differ are two books, never folded. FO-001 to FO-006.
const ISBN_PAIR=/ISBN[\s:*_.]{0,12}(97[89]\d{10})(?:\s*[.;,]?\s*[-\u2013\u2014;,\/]\s*|\s*[.;,]\s+)(97[89]\d{10})(?![0-9])/gi;
function isbnPairs(results){
  const pairs=[];
  for(const x of (results||[])){
    const t=resultText(x).replace(/(\d)[\u2010-\u2015-](?=\d)/g,"$1");
    for(const m of t.matchAll(ISBN_PAIR))if(m[1]!==m[2]&&isbn13Checks(m[1])&&isbn13Checks(m[2]))pairs.push([m[1],m[2]]);
  }
  return pairs;
}
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

// HER ORDER (docs/catalogue_versions.md): at an English-language venue, a book found in its
// museum shop first of all (`shopFirst`, set once by the lookup, so a Re-check never moves a
// block); then English in the venue's own imprint (or a house ranked as its own, `rankAsOwn`);
// then English from anyone else; then other languages. Within each, hardcover, then paperback,
// then a binding not known; otherwise as found. The first is the starting pick. VO-001 to VO-009.
function rankedOwn(name,museumId){
  const extra=(linkEntry(museumId)||{}).rankAsOwn||[];
  return venuePrinting(name,museumId)||extra.some(h=>String(name||"").split(HOUSE_SPLIT).some(p=>sameHouse(p.trim(),h)));
}
function versionRank(v,museumId){
  const en=isEnglishLang(v&&v.lang), mu=MU[museumId];
  const shop=!!(v&&v.shopFirst)&&!(mu&&mu.english===false);
  const group=en&&rankedOwn(v.publisher,museumId)?0:en?1:2;
  return (shop?0:9)+group*3+(v.binding==="hardcover"?0:v.binding==="paperback"?1:2);
}
// The versions' indexes in her order.
function versionOrder(versions,museumId){
  const vs=Array.isArray(versions)?versions:[];
  return vs.map((v,i)=>i).sort((a,b)=>versionRank(vs[a]||{},museumId)-versionRank(vs[b]||{},museumId)||a-b);
}
// The lookup keeps its versions in her order, so the starting pick is always 0.
function putInOrder(versions,museumId){
  const sorted=versionOrder(versions,museumId).map(i=>versions[i]);
  versions.splice(0,versions.length,...sorted);
}
// A version as the ledger keeps it: the lookup's own fields dropped. `card` holds the
// card's book fields for that version, so a change of pick refills the card (pickRow).
function storedVersion(v){
  const o={};
  for(const k of ["title","lang","binding","pages","publisher","isbn13","alsoIsbn13","showing","proofUrl","note","city","year","card","shopFirst"])o[k]=v[k]===undefined?null:v[k];
  return o;
}
// The picked version becomes the card's book, as a found book does.
function takeVersion(F,v,log){
  if(v._found){ F.isbn=v.isbn13; return; }
  log.push("The card’s book: “"+v.title+"”"+(v.isbn13?", ISBN "+v.isbn13:"")+".");
  F.title=v.title; F.isbn=v.isbn13; F.publisher=v._pub||null; F.pubFrom=v._pub?v._pubFrom:null;
  F.publisherUrl=v._pubUrl||null; F.publisherResult=v._pubUrl?"product":null;
  // A shop that could not be read stays unread for every book.
  F.shopState=F.blocked||"web"; F.shopUrl=null;
}
function bookFieldsOf(F){
  return{catalogueTitle:F.title||null,isbn13:F.isbn||null,publisher:F.publisher||null,publisherUrl:F.publisherUrl||null,
    publisherResult:F.publisherResult||null,shopState:F.shopState||null,shopUrl:F.shopUrl||null};
}
// Her pick changed on the card: that version's book fields fill the card, as at the
// lookup (takeVersion). Pure — no lookup, no network. PK-001 to PK-003.
function pickRow(row,i,now){
  const v=Array.isArray(row&&row.editions)?row.editions[i]:null;
  if(!v||!v.card||row.editionPick===i)return row;
  return{...row,...v.card,editionPick:i,editedAt:now};
}

// ── HER VERSION BLOCKS (docs/catalogue_versions.md, "Her layout") ──────────────
// One block per version, in her order, on a card with two or more; a card with one looks
// as it always has. Notes are decided here, first rule that fits. VB-001 to VB-010.
function sourceOf(u){
  try{ const h=new URL(String(u||"")).hostname.replace(/^www\./,""); return h?{url:String(u),host:h}:null; }catch{ return null; }
}
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
// Null for a card with fewer than two versions.
function versionBlocks(row){
  const all=Array.isArray(row&&row.editions)?row.editions:[];
  if(all.filter(Boolean).length<2)return null;
  const vs=all.map(v=>v||{});
  return versionOrder(vs,row.museumId).filter(i=>all[i]).map(i=>versionBlock(vs,i,row));
}
// The note after an old row's ISBN: "also 978-… (hardcover, Nationalmuseum)".
function alsoLine(v){
  if(!v||!v.isbn13)return "";
  const bits=[v.binding,v.publisher].filter(Boolean);
  return "also "+fmtIsbn(v.isbn13)+(bits.length?" ("+bits.join(", ")+")":"");
}

// An English edition the publisher's own page lists with its own ISBN: the same house
// (rule one), so accepted. Its link on that page, if it gives one.
function editionOnPublisherPage(editions,pageResults,origIsbn){
  for(const ed of (Array.isArray(editions)?editions:[])){
    if(!ed||!ed.title||!isEnglishLang(ed.language))continue;
    const en=toIsbn13(ed.isbn13,pageResults||[]);
    if(!en||en===origIsbn)continue;
    return{title:String(ed.title).trim(),isbn13:en,url:ed.url||null};
  }
  return null;
}

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
function onHost(results,host){ return (results||[]).filter(x=>hostOf(x&&x.url)===host); }
function carriesBook(x,book,isbn){ return !!((isbn&&isbnInText(isbn,resultText(x)))||resultsCarrying([x],book).length); }

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

// The trust order for a publisher: read off the ISBN's results, then printed on the
// book's own shop or publisher page, then Claude's read of general results (a guess).
const PUBLISHER_TRUST={"the ISBN’s results":3,"the museum shop":2,"the book’s page":2,"general results":1};
function sameHouse(a,b){
  const x=houseWords(a), y=houseWords(b);
  return x.some(p=>y.some(q=>p.includes(q)||q.includes(p)));
}

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
// The weakest honest answer once the publisher is known: their own front door.
function siteOnly(F,pubHost,log,why){
  log.push(why);
  F.publisherUrl="https://"+pubHost+"/"; F.publisherResult="site";
  return{};
}

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
    if(s1.data){ hit=settle(row,s1.data,dom,"",true,false,s1.results); fromShop=!!hit; }
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
      hit=await confirmShopLink(settle(row,d2,dom,"",false,blocked,s2.results),io);
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
          if(!F.isbn){ const c=toIsbn13(d.isbn13,res); if(c){ F.isbn=c; log.push("ISBN read off the book’s page: "+c); } }
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
    if(!F.isbn&&read){ const c=toIsbn13(read.isbn13,given); if(c){ F.isbn=c; log.push("ISBN from the read, printed in the results: "+c); } }
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

const LEDGER_PREFIX="cat-watch-ledger-";

// Local 24hr timestamp (browser's timezone), e.g. 2026-08-23-2230 = 10:30pm local.
// A description, as it goes into a file name: lower case, words joined by hyphens.
function labelSlug(label){return String(label||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);}
// A cloud save's name in the list (her wording): a Save's copy 'Export: "description"';
// a safety copy, its own label. Older labels are renamed on screen, never in the store.
function snapTitle(s,all){
  if(!s)return "";
  if(s.kind!=="safety")return "Export"+(s.label?": \u201c"+s.label+"\u201d":"");
  const l=String(s.label||"");
  // Roll-back copies name the save by its time (her ask; CL-T1–3). Older copies stored
  // only the target's name; its time is read off the one earlier save carrying that name
  // — two or none, the name as before.
  const m=l.match(/^Before rolling back to (.*)$/);
  if(m){
    const was=m[1].replace(/^Cloud copy before /,"Safety snapshot before ");
    const hits=(all||[]).filter(o=>o&&o!==s&&o.at<s.at&&snapTitle(o)===was);
    return hits.length===1?"Safety snapshot before roll-back to snapshot of "+localReadable(hits[0].at)
      :"Safety snapshot before roll-back to \u201c"+was+"\u201d";
  }
  return l.replace(/^Cloud copy before /,"Safety snapshot before ").replace(/^(Safety snapshot before roll-back to )(?!snapshot of )/,"$1snapshot of ")||"Safety snapshot";
}
function localStamp(iso){const d=iso?new Date(iso):new Date(),p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes());}
// One way to write a moment (her decision): "Sep 26, 2026 1:22pm", as "Last refreshed".
function localReadable(iso){return fmtRefresh(iso||new Date().toISOString());}

// Two palettes, one set of names (docs/app.md §3). Every colour the app paints comes
// from here or TIER_SETS — a stray hex would be a cream patch on a dark page. The dark
// set is designed, not inverted: a warm near-black ground, `soft` kept light.
const PALETTES={
  light:{bg:"#E8E4DE",card:"#F5F2ED",ink:"#1E1B18",soft:"#78736C",rule:"#CBC5BB",
         action:"#2D4A3F",accent:"#A13823",owned:"#7B5EA7",muted:"#B5AFA6",
         drawer:"#DDD8D0",body:"#3D3730",dim:"#ECEAE6",panel:"#ECE8E1",
         warnBg:"#F7E4C4",warnEdge:"#B5791A",warnInk:"#6B4A1E",
         okBg:"#D8EAE4",okEdge:"#2D6B5A",okInk:"#1F4C40",
         holdBg:"#E8E2D6",ownedBg:"#EDE5F5",
         rejectInk:"#8A6D3B",neverInk:"#7A4A4A",star:"#B8860B",buyNext:"#C0281E",onAction:"#fff",
         scrim:"rgba(20,18,16,0.45)"},
  dark: {bg:"#1A1815",card:"#232019",ink:"#EDE8E0",soft:"#A8A29A",rule:"#3A352E",
         action:"#5E9E85",accent:"#E2735A",owned:"#B79BE0",muted:"#6A645C",
         drawer:"#2A2620",body:"#D6D0C6",dim:"#201D18",panel:"#262219",
         warnBg:"#3A2E14",warnEdge:"#C79A3E",warnInk:"#F0D9A4",
         okBg:"#16302A",okEdge:"#4E9B80",okInk:"#A6DCC6",
         holdBg:"#32291C",ownedBg:"#2B2136",
         rejectInk:"#D6B87A",neverInk:"#E0A3A3",star:"#E0B45C",buyNext:"#F0705F",onAction:"#12100E",
         scrim:"rgba(0,0,0,0.6)"},
};
// The period scrubber (her design): hidden until she holds a finger on the middle of the right
// edge; then a ruler of every period in the view on a pale panel, the one she is in picked. Sliding moves the
// pick, read from the rows as laid out before the bulge so it never pushes the pick on; lifting
// jumps to that period's divider. A swipe that moves before the hold is an
// ordinary scroll. Rows never spread out: fewer periods, a shorter ruler.
const SCRUB_ROW=15.5, SCRUB_BULGE=28, SCRUB_ZONE=155, SCRUB_HOLD=300, SCRUB_SLOP=6;
// The picked name bulges in place (her design): bigger, its row opened up; the others at 10px.
const scrubName=on=>on?{fontSize:18,fontWeight:700,lineHeight:"24px",borderRadius:13,padding:"0 9px"}:{fontSize:10,fontWeight:400,lineHeight:"14px",borderRadius:9,padding:"0 6px"};
function PeriodScrubber({groups,C,onJump}){
  const zone=useRef(null);
  const[sel,setSel]=useState(null); // the picked row while open
  const live=useRef({timer:null,open:false,y0:0,y:0,sel:0});
  const g=useRef(groups); g.current=groups;
  const jump=useRef(onJump); jump.current=onJump;
  const n=groups.length;
  useEffect(()=>{
    const el=zone.current; if(!el)return;
    const L=live.current;
    const pick=()=>{
      const k=g.current.length, top=window.innerHeight/2-k*SCRUB_ROW/2;
      L.sel=Math.max(0,Math.min(k-1,Math.floor((L.y-top)/SCRUB_ROW))); setSel(L.sel);
    };
    const open=()=>{
      L.timer=null; const k=g.current.length; if(!k)return;
      // The period she is in: the last divider above the upper third of the screen.
      let cur=0; const marks=[...document.querySelectorAll("[data-period]")];
      for(const m of marks){ if(m.getBoundingClientRect().top<=window.innerHeight/3){const i=g.current.findIndex(x=>x.key===m.getAttribute("data-period"));if(i>=0)cur=i;} }
      L.open=true; L.sel=cur; setSel(cur);
    };
    const down=y=>{ L.y0=L.y=y; clearTimeout(L.timer); L.timer=setTimeout(open,SCRUB_HOLD); };
    const move=(y,ev)=>{
      L.y=y;
      if(L.open){ if(ev&&ev.cancelable)ev.preventDefault(); pick(); }
      else if(L.timer&&Math.abs(y-L.y0)>SCRUB_SLOP){ clearTimeout(L.timer); L.timer=null; }
    };
    const up=()=>{
      clearTimeout(L.timer); L.timer=null;
      if(L.open){ L.open=false; setSel(null); const x=g.current[L.sel]; if(x)jump.current(x.key); }
    };
    const ts=e=>{ if(e.touches.length===1)down(e.touches[0].clientY); };
    const tm=e=>move(e.touches[0].clientY,e);
    const mm=e=>move(e.clientY,e);
    const mu=()=>{ window.removeEventListener("mousemove",mm); window.removeEventListener("mouseup",mu); up(); };
    const md=e=>{ if(e.button!==0)return; e.preventDefault(); down(e.clientY); window.addEventListener("mousemove",mm); window.addEventListener("mouseup",mu); };
    el.addEventListener("touchstart",ts,{passive:true});
    el.addEventListener("touchmove",tm,{passive:false});
    el.addEventListener("touchend",up); el.addEventListener("touchcancel",up);
    el.addEventListener("mousedown",md);
    return()=>{ up(); el.removeEventListener("touchstart",ts); el.removeEventListener("touchmove",tm);
      el.removeEventListener("touchend",up); el.removeEventListener("touchcancel",up); el.removeEventListener("mousedown",md);
      window.removeEventListener("mousemove",mm); window.removeEventListener("mouseup",mu); };
  },[]);
  if(!n)return null;
  return(<>
    <div ref={zone} data-scrubber="zone" style={{position:"fixed",right:0,top:"50%",transform:"translateY(-50%)",width:16,height:SCRUB_ZONE,zIndex:997,
      touchAction:"pan-y",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"}}/>
    {sel!==null&&<div data-scrubber="panel" style={{position:"fixed",right:4,top:"50%",transform:"translateY(-50%)",zIndex:997,pointerEvents:"none",
      background:C.card+"DB",backdropFilter:"blur(3px)",WebkitBackdropFilter:"blur(3px)",border:"1px solid "+C.rule,borderRadius:10,padding:"8px 6px 8px 8px"}}>
      <div data-scrubber="ruler" style={{position:"relative"}}>
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:1,background:C.rule}}/>
        {groups.map((x,i)=>{const on=i===sel;return(
          <div key={x.key} data-scrub-row={x.key} style={{height:on?SCRUB_BULGE:SCRUB_ROW,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,whiteSpace:"nowrap",transition:"height 0.12s"}}>
            <span style={{...scrubName(on),color:on?C.onAction:C.soft,background:on?C.action:"none",transition:"font-size 0.12s"}}>{x.name}</span>
            <span style={{width:on?10:6,height:on?2:1,background:on?C.ink:C.soft}}/>
          </div>);})}
        {/* The panel is always as wide as its widest name bulged (her decision): a hidden copy of each sets it. */}
        <div aria-hidden="true" data-scrubber="sizer" style={{height:0,overflow:"hidden",visibility:"hidden",paddingRight:16}}>
          {groups.map(x=><div key={x.key} style={{whiteSpace:"nowrap"}}><span style={scrubName(true)}>{x.name}</span></div>)}
        </div>
      </div>
    </div>}
  </>);
}

// How many ledger cards are drawn at first, and how many more as she scrolls.
const DRAW_STEP=200;
// The card's link buttons (Museum shop, Publisher, the bookstores), in a palette's colours.
const linkButton=C=>({fontSize:11,fontWeight:500,color:C.ink,background:C.card,border:"1px solid "+C.rule,borderRadius:3,padding:"4px 9px",textDecoration:"none",display:"inline-block",whiteSpace:"nowrap"});
// Her digital catalogue (`digitalUrl`: a PDF or online catalogue she pasted in; her design): the link
// button's shape on a green ground, last in the row. Kept through Search again, Re-check and Reset cards.
function DigitalLink({r,C,lnk}){
  return r.digitalUrl?<a href={r.digitalUrl} target="_blank" rel="noopener noreferrer" style={{...lnk,background:C.okBg,border:"1px solid "+C.okEdge,color:C.okInk}}>Digital catalogue {"\u2197"}</a>:null;
}

// ONE LEDGER CARD. Memoised: a mark redraws only the card it changed, so every prop
// must keep its identity between renders (act, chip, pBtn, lnk, TH are held stable in App;
// a venue's MU entry is replaced, never edited, so `mu` changes when its shop does).
const LedgerCard=React.memo(function LedgerCard({r,mu,isOpen,isBusy,busy,rechecking,lookLabel,said,relabelling,digitalOpen,C,TH,chip,pBtn,lnk,act}){
  const t=tierFor(r),tier=TH[t],mo=moSince(r.endDate),noCat=r.looked&&r.hasCatalogue==="no",isAcq=r.acquiring==="acquired",dismissed=!r.interested;
  const searchingLabel=lookLabel||"Searching\u2026";
  // Two buttons share one busy row; only the one pressed shows progress.
  const againLabel=isBusy&&!rechecking?searchingLabel:"Search again";
  const recheckLabel=isBusy&&rechecking?searchingLabel:"Re-check museum shop";
  // No shop at all (Borghese, Capodimonte, the Accademia; her decision): no
  // Re-check button, and the line says only "Venue has no shop."
  const noShop=!(mu&&(mu.shopSearch||mu.shopHome));
  // "Digital catalogue" (her design): an empty box every time; her link, taken on Enter or on leaving
  // the box, replaces any before it. Escape closes it.
  const digitalBox=digitalOpen&&<input autoFocus defaultValue="" onKeyDown={e=>{ if(e.key==="Enter")act("setDigital",r.id,e.target.value); else if(e.key==="Escape"){ e.target.value=""; act("closeDigital"); } }}
    onBlur={e=>act("setDigital",r.id,e.target.value)}
    style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"5px 8px",fontSize:12.5,border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontFamily:"inherit"}}/>;
  // Her version blocks, on a card with two or more versions (versionBlocks); with
  // nothing picked (a card searched before her order) the card shows no book, no
  // status lines and only the shop button.
  const vl=r.looked&&r.hasCatalogue==="yes"?versionBlocks(r):null;
  const picked=!vl||(Number.isInteger(r.editionPick)&&!!r.editions[r.editionPick]);
  if(dismissed)return(
    <article style={{background:C.dim,border:"1px solid "+C.rule,borderLeft:"4px solid "+C.muted,borderRadius:5,padding:"10px 14px",opacity:0.55}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
        <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft}}>{mu?.card||mu?.short}</span>
        <button onClick={()=>act("restore",r.id)} style={{background:"none",border:"1px solid "+C.action,borderRadius:3,color:C.action,fontSize:10,fontWeight:500,cursor:"pointer",padding:"2px 8px"}}>Restore</button>
      </div>
      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,fontWeight:500,marginTop:3,color:C.soft}}>{r.title}</div>
      <div style={{fontSize:10.5,color:C.muted,marginTop:2}}>{dateRange(r)}</div>
    </article>
  );
  return(
    <article style={{background:C.card,border:"1px solid "+C.rule,borderLeft:"4px solid "+(noCat?C.muted:isAcq?C.owned:tier.ink),borderRadius:5,overflow:"hidden"}}>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
          <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginTop:2}}>{mu?.card||mu?.short}</span>
          {/* No "No catalogue" tag (her decision): the corner says how long ago the
              show closed; the Catalogue button carries the cross. */}
          {isAcq?<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:C.owned,background:C.ownedBg,padding:"2px 7px",borderRadius:3}}>Owned</span>
          :<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:tier.ink,background:tier.wash,padding:"2px 7px",borderRadius:3}}>{tier.label}</span>}
        </div>
        <div style={{display:"flex",alignItems:"baseline",gap:0,marginTop:5}}>
          <h3 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:18,lineHeight:1.2,fontWeight:500,margin:0,letterSpacing:"-0.01em",flex:1}}>
            {r.title}
            {r.exUrl&&<a href={r.exUrl} target="_blank" rel="noopener noreferrer" style={{color:C.action,textDecoration:"none",marginLeft:5,fontSize:13,fontWeight:400}}>{"\u2197"}</a>}
          </h3>
          <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:8,flexShrink:0}}>
            {r.acquiring==="yes"&&(()=>{const k=starInk();return <button onClick={()=>act("toggleBuyNext",r.id)} title={r.buyNext?"Not buying next":"Buy next"} style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:16,lineHeight:1}}><svg width={k.D} height={k.D} style={{display:"inline-block",verticalAlign:k.v}} aria-hidden="true"><circle cx={k.D/2} cy={k.D/2} r={k.D/2-0.75} fill={r.buyNext?C.buyNext:"none"} stroke={r.buyNext?C.buyNext:C.muted} strokeWidth="1.5"/></svg></button>;})()}
            <button onClick={()=>act("toggleWatch",r.id)} title={r.watching?"Unwatch":"Watch"} style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:16,lineHeight:1,color:r.watching?C.star:C.muted}}>{r.watching?"\u2605":"\u2606"}</button>
            {!isAcq&&<button onClick={()=>act("dismiss",r.id)} title="Not interested" style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:18,lineHeight:1,color:C.muted}}>{"\u00d7"}</button>}
          </div>
        </div>
        <div style={{fontSize:11,color:C.soft,marginTop:3,marginBottom:6}}>{dateRange(r)}</div>
        {r.summary&&<p style={{fontSize:12.5,lineHeight:1.5,margin:"0 0 8px",color:C.body}}>{r.summary}</p>}
        {!noCat&&!isAcq&&mo!==null&&mo>0&&(
          <div style={{margin:"8px 0 6px"}}>
            <div style={{position:"relative",height:5,background:C.drawer,borderRadius:3}}>
              <div style={{height:"100%",width:Math.min(100,(mo/12)*100)+"%",background:tier.ink,borderRadius:3}}/>
              {[3,6].map(k=><span key={k} style={{position:"absolute",left:(k/12*100)+"%",top:-2,width:1,height:10,background:C.soft,opacity:0.5}}/>)}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:8.5,color:C.soft,marginTop:3,letterSpacing:"0.05em"}}><span>CLOSED</span><span>3 MO</span><span>6 MO</span><span>12 MO</span></div>
          </div>
        )}
                <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",paddingTop:8,borderTop:"1px solid "+C.rule}}>
          <span style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:C.soft}}>Want the catalogue?</span>
          <button onClick={()=>act("setAcq",r.id,"yes")} style={chip(r.acquiring==="yes")}>Yes</button>
          <button onClick={()=>act("setAcq",r.id,"no")} style={chip(r.acquiring==="no")}>No</button>
          <button onClick={()=>act("setAcq",r.id,"acquired")} style={chip(r.acquiring==="acquired")}>Acquired</button>
          <button onClick={()=>act("toggleOpen",r.id)} style={{marginLeft:"auto",background:"none",border:"none",color:C.action,fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 0"}}>
            {isOpen?"Hide":(r.looked&&r.hasCatalogue==="yes")?"\u2713 Catalogue"+(r.digitalUrl?" + digital":""):(r.looked&&r.hasCatalogue==="no")?(r.digitalUrl?"\u2717 Catalogue \u2014 digital only":"\u2717 Catalogue"):"Catalogue"}
          </button>
        </div>
      </div>
      {isOpen&&(
        <div style={{background:C.panel,borderTop:"1px solid "+C.rule,padding:"12px 14px"}}>
          {!r.looked?(
            <div>
              <p style={{fontSize:12,color:C.soft,margin:"0 0 8px"}}>No catalogue search run yet.</p>
              <button onClick={()=>act("findOneCat",r.id)} disabled={busy} style={{...pBtn,padding:"6px 12px",fontSize:12}}>{isBusy?searchingLabel:"Find catalogue"}</button>
              {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
            </div>
          ):noCat?(
            <CatalogueNone r={r} mu={mu} C={C} TH={TH} lnk={lnk} actions={<>
              <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
                <button onClick={()=>act("findOneCat",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{againLabel}</button>
                {!noShop&&<button onClick={()=>act("recheckShop",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{recheckLabel}</button>}
                <button onClick={()=>act("openDigital",r.id)} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Digital catalogue</button>
              </div>
              {digitalBox}
              {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
              </>}/>
          ):(
            <CatalogueBox r={r} mu={mu} C={C} TH={TH} lnk={lnk} isAcq={isAcq} noShop={noShop} vl={vl} picked={picked}
              onPick={i=>act("setPick",r.id,i)} actions={<>
              <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:14}}>
                <button onClick={()=>act("findOneCat",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{againLabel}</button>
                {!noShop&&<button onClick={()=>act("recheckShop",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{recheckLabel}</button>}
                <button onClick={()=>act("openDigital",r.id)} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>Digital catalogue</button>
              </div>
              {digitalBox}
              {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
              </>}/>
          )}
          {/* Relabel, on its own line at the foot of the drawer (her design; the Period trial). */}
          <div style={{marginTop:10}}>
            <button onClick={()=>act("relabel",r.id)} disabled={busy||relabelling} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{relabelling?"Relabelling\u2026":"Relabel"}</button>
            {said&&said.regrouped&&<button onClick={()=>act("keepPeriod",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0,marginLeft:14}}>Do not regroup</button>}
          </div>
        </div>
      )}
    </article>
  );
});

// THE CATALOGUE BOX: a found catalogue in the card's drawer — the shop line, the book (or her
// version blocks) and the buy buttons. One copy, drawn by the app and by the Catalogue Blocks
// Check page; `actions` is the Search again / Re-check row the caller draws.
function CatalogueBox({r,mu,C,TH,lnk,isAcq,noShop,vl,picked,onPick,actions}){
  return(
    <div>
      {/* A missing button cannot report anything, so the card says what the
          publisher step concluded (publisherNote). "Now" and "Back" are the
          same green as the plain sentence (her decision): the word carries
          the news. */}
      {picked&&<>
      {r.shopState==="shop"&&<div style={{fontSize:11,marginBottom:6}}>
        <span style={{color:C.action,fontWeight:600}}>{shopHeadline(r.shopState,r.shopChange)}</span>
        {publisherNote(r.publisherResult,!!r.publisherUrl)&&<span style={{color:C.soft}}> {publisherNote(r.publisherResult,!!r.publisherUrl)}</span>}
      </div>}
      {/* Gone, link kept as "Museum shop (last seen)" (her design): a restock
          usually returns to the same address. Dark red from the "closed over
          a year" ink, never a loose hex. */}
      {r.shopState==="gone"&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>
        {/* The headline alone (her ask). */}
        <span style={{color:TH.lapsed.ink,fontWeight:700}}>{shopHeadline(r.shopState,r.shopChange)}</span>
        {publisherNote(r.publisherResult,!!r.publisherUrl)&&(" "+publisherNote(r.publisherResult,!!r.publisherUrl))}
      </div>}
      {/* The dash is a JS string: a bare — in JSX text prints those
          six characters. */}
      {r.shopState==="web"&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>
        {noShop?(MU[r.museumId]&&MU[r.museumId].shopUnknown?"Museum shop not found.":"Venue has no shop.")
          :"Not in the museum shop \u2014 shop link opens the general store."}
        {publisherNote(r.publisherResult,!!r.publisherUrl)&&(" "+publisherNote(r.publisherResult,!!r.publisherUrl))}
      </div>}
      {shopUnread(r.shopState)&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>
        <span style={{color:TH.lapsed.ink,fontWeight:700}}>{shopUnreadHead(r.shopState)}</span>{SHOP_BLOCKED_FOUND_REST}
        {publisherNote(r.publisherResult,!!r.publisherUrl)&&(" "+publisherNote(r.publisherResult,!!r.publisherUrl))}
      </div>}
      </>}
      {vl?(
        // Each block is the single-book block, the marker in its own column; the
        // whole block picks it. Blocks never move when she picks.
        <div role="radiogroup" aria-label="Versions" style={{marginBottom:10}}>
          {vl.map((b,k)=>(
            <div key={b.i} role="radio" aria-checked={b.picked} tabIndex={0} onClick={()=>onPick(b.i)}
              onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); onPick(b.i); } }}
              style={{display:"flex",alignItems:"flex-start",gap:10,padding:k?"11px 0":"2px 0 11px",borderTop:k?"1px solid "+C.rule:"none",cursor:b.picked?"default":"pointer"}}>
              <span style={{flex:"none",width:14,fontSize:13,lineHeight:1.3,color:C.ink}}>{b.picked?"\u25cf":"\u25cb"}</span>
              <div style={{flex:1,minWidth:0}}>
                {b.title&&<div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:14.5,fontWeight:500,marginBottom:2,lineHeight:1.3}}>{b.title}</div>}
                {b.publisher&&<div style={{fontSize:11,color:C.soft,marginBottom:2,lineHeight:1.4}}>{b.publisher}</div>}
                <div style={{fontSize:11.5,fontFamily:"ui-monospace,monospace",lineHeight:1.5,color:b.isbn?C.ink:C.soft}}>
                  {b.isbn?<>ISBN <span style={{whiteSpace:"nowrap"}}>{b.isbn}</span>{b.also&&<>; <span style={{whiteSpace:"nowrap"}}>{b.also.isbn}</span> ({b.also.whose})</>}</>
                    :"ISBN not confirmed \u2014 verify before buying"}
                </div>
                {b.facts&&<div style={{fontSize:11,color:C.soft,marginTop:2,marginBottom:2,lineHeight:1.4}}>{b.facts}</div>}
                {(b.why||b.source)&&<div style={{fontSize:11,color:C.soft,marginTop:3,lineHeight:1.45}}>
                  {b.why}{b.source&&<>{b.why?" ":""}Source: <a href={b.source.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{color:C.soft}}>{b.source.host}</a></>}
                </div>}
              </div>
            </div>
          ))}
        </div>
      ):(<>
        {r.catalogueTitle&&<div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:14.5,fontWeight:500,marginBottom:2,lineHeight:1.3}}>{r.catalogueTitle}</div>}
        {r.publisher&&<div style={{fontSize:11,color:C.soft,marginBottom:2}}>{r.publisher}</div>}
        <div style={{fontSize:11.5,fontFamily:"ui-monospace,monospace",marginBottom:englishLine(r)?2:10,color:r.isbn13?C.ink:C.soft}}>
          {r.isbn13?"ISBN "+fmtIsbn(r.isbn13)+(r.alsoVersion?" \u00b7 "+alsoLine(r.alsoVersion):""):"ISBN not confirmed \u2014 verify before buying"}
        </div>
        {englishLine(r)&&<div style={{fontSize:11,color:C.soft,marginBottom:10}}>{englishLine(r)}</div>}
      </>)}
      {picked?(<>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {isAcq?(
            <>
              {r.shopUrl&&<a href={r.shopUrl} target="_blank" rel="noopener noreferrer" style={lnk}>{shopLinkLabel(r.shopState)} {"\u2197"}</a>}
              {r.publisherUrl&&<a href={r.publisherUrl} target="_blank" rel="noopener noreferrer" style={lnk}>{publisherLinkLabel(r.publisherResult)} {"\u2197"}</a>}
            </>
          ):buyLinks(r).map(l=><a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" style={lnk}>{l.name} {"\u2197"}</a>)}
          <DigitalLink r={r} C={C} lnk={lnk}/>
        </div>
      </>):(<>
        {(shopButtonUrl(mu,r.title)||r.digitalUrl)&&<div style={{display:"flex",flexWrap:"wrap",gap:5}}>{shopButtonUrl(mu,r.title)&&<a href={shopButtonUrl(mu,r.title)} target="_blank" rel="noopener noreferrer" style={lnk}>Museum shop {"\u2197"}</a>}<DigitalLink r={r} C={C} lnk={lnk}/></div>}
      </>)}
      {actions}
    </div>
  );
}

// The drawer of a card whose search found no catalogue: one copy, drawn by the app and by
// the Catalogue Blocks Check page; `actions` is the Search again / Re-check row.
function CatalogueNone({r,mu,C,TH,lnk,actions}){
  return(
    <div>
      {shopUnread(r.shopState)?(
        <div style={{margin:"0 0 8px"}}>
          <p style={{fontSize:12,color:C.soft,margin:"0 0 6px"}}><span style={{color:TH.lapsed.ink,fontWeight:700}}>{shopUnreadHead(r.shopState)}</span>{SHOP_BLOCKED_NONE_REST}</p>
          {/* "Search manually" needs somewhere to press: the shop's own
              search with the title in it, as on a found card. */}
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {shopButtonUrl(mu,r.title)&&<a href={shopButtonUrl(mu,r.title)} target="_blank" rel="noopener noreferrer" style={lnk}>Museum shop {"\u2197"}</a>}
            <DigitalLink r={r} C={C} lnk={lnk}/>
          </div>
        </div>
      ):<>
        <p style={{fontSize:12,color:C.soft,margin:"0 0 8px"}}>No catalogue found for this exhibition.</p>
        {r.digitalUrl&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}><DigitalLink r={r} C={C} lnk={lnk}/></div>}
      </>}
      {actions}
    </div>
  );
}

export default function App(){
  const[rows,setRows]=useState([]);
  // A row from an occasional venue this page's store has not met still files
  // under a venue — see registerUnseenOccasional. Idempotent; costs a loop.
  registerUnseenOccasional(rows);
  const[loaded,setLoaded]=useState(false);
  const[busy,setBusy]=useState(false);
  const[busyId,setBusyId]=useState(null);
  const[lookLabel,setLookLabel]=useState(null); // the progress line while a lookup or Re-check runs (lookupLabel)
  const[prog,setProg]=useState({done:0,total:0,label:""});
  const[labelSaid,setLabelSaid]=useState(null);   // the last Label run's line
  const[relabelId,setRelabelId]=useState(null);   // the card a Relabel is asking about
  const[digitalBox,setDigitalBox]=useState(null);  // the card whose Digital catalogue box is open
  // Add by link: one pop-up for CSV and Links, nothing added to the page (her design).
  // importMode: null · "choose" · "links" (the box open below them) · "needLedger" (empty page).
  const[importMode,setImportMode]=useState(null);
  // The shop screen, after the review: {partial, ids}. shopLooking: the venue being
  // looked for again.
  const[shopScreen,setShopScreen]=useState(null);
  const[shopLooking,setShopLooking]=useState(null);
  const[shopAdding,setShopAdding]=useState(null);   // {id, text}: the venue whose shop link she is typing
  const[readVenues,setReadVenues]=useState([]);   // the new venues the last Read met
  const[linkNote,setLinkNote]=useState(null);
  const[linkText,setLinkText]=useState("");
  const[linkFails,setLinkFails]=useState([]);
  // A Read's progress, its note and each line it could not read: one piece for Links, Pages and
  // Paste; failAs(f) is how a line names what it could not read.
  const readStatus=failAs=><>
    {busy&&prog.total>0&&<div style={{marginTop:8}}>
      <div style={{height:4,background:C.rule,borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:Math.round(100*prog.done/prog.total)+"%",background:C.action}}/></div>
      <div style={{marginTop:4,fontSize:11,color:C.soft}}>{prog.label}</div>
    </div>}
    {linkNote&&<div style={{marginTop:6,fontSize:11.5,color:C.soft,lineHeight:1.45}}>{linkNote}</div>}
    {linkFails.map((f,i)=><div key={i} style={{marginTop:6,fontSize:11.5,color:TH.urgent.ink,lineHeight:1.4,overflowWrap:"anywhere"}}>
      {f.url?failAs(f):""}{f.url?" \u2014 ":""}{f.why}
    </div>)}
  </>;
  const[pages,setPages]=useState([]);   // Pages: saved pages waiting, as text ({url,title,name,text})
  const[pastes,setPastes]=useState(()=>pasteBoxes([]));   // Paste: {id,at,url,text} boxes, two to start
  const pagesFileRef=useRef(null);
  const linksAtRead=useRef(null);   // the links the open review was read from; Cancel import puts them back
  const linkRead=useRef({on:false,stop:false});   // a Read under way; Cancel mid-Read stops it after the link in hand
  const[occVenues,setOccVenues]=useState({});
  // The stored copy of the new venues; occVenues is the working copy. The store is
  // written only when the ledger moves — an unfinished import keeps nothing (her decision).
  const occSaved=useRef({});
  const[error,setError]=useState(null);
  const[rechecking,setRechecking]=useState(false);   // which of the card's two buttons is running
  const[copySaid,setCopySaid]=useState(null);       // "ok" / "no": what the diagnostic's copy icon last managed
  const[recheckSaid,setRecheckSaid]=useState(null);  // {id,text,failed}: Re-check's answer, shown on that card
  const[saveErr,setSaveErr]=useState(false);
  const[debug,setDebug]=useState(null);
  useEffect(()=>setCopySaid(null),[debug]); // a new diagnostic has not been copied
  const[showDebug,setShowDebug]=useState(false);
  const[lastRun,setLastRun]=useState(null);
  // Quarantine (docs/app.md §4): the third outcome beside reject and dismiss. The MAP is
  // stored (tombstones and all); the LIST is derived from it — what she sees and what
  // the export carries.
  const[quarantine,setQuarantine]=useState({});
  const[quarWhy,setQuarWhy]=useState(null);
  const[storeUnread,setStoreUnread]=useState([]);   // parts of the store that could not be read this opening
  useEffect(()=>{ storeUnreadSeen=setStoreUnread; setStoreUnread([...STORE_UNREAD]); return()=>{ storeUnreadSeen=()=>{}; }; },[]);
  const ignored=useMemo(()=>activeQuarantine(quarantine),[quarantine]);
  const ignoredByVenue=useMemo(()=>{
    const ord=id=>{ const i=MUSEUMS.findIndex(m=>m.id===id); return i<0?MUSEUMS.length:i; };
    return ignored.slice().sort((a,b)=>ord(a.venueId)-ord(b.venueId)||String(a.title||"").localeCompare(String(b.title||"")));
  },[ignored]);
  const[showIgnored,setShowIgnored]=useState(false);
  // The cloud readout, never silent (her ask). saveState: idle | off | saving | saved |
  // failed; lastSaved: the live record last written or read; saveErr: why it is not
  // saving. cloudLive: what the store held on open ({rec,data} / {rec:null} / {why}).
  const[cloudLive,setCloudLive]=useState(null);
  // A sentence from the last import's check against the cloud copy (trial).
  const[cloudCheck,setCloudCheck]=useState(null);
  // Saving is armed only once a ledger is opened in this page load, so an empty portal
  // never overwrites the cloud copy.
  const cloudArmed=useRef(false);
  // ONE COPY EDITS AT A TIME — see cloudSessionClaim. True for the rest of
  // this page load once another copy is found editing.
  const[readOnly,setReadOnly]=useState(false);
  const goReadOnly=useCallback(()=>{ cloudReadOnly=true; setReadOnly(true); },[]);
  // Every action that would change the ledger asks this first.
  const roStop=()=>{ if(!cloudReadOnly)return false; setError(RO_LINE); return true; };
  const cloudPrev=useRef(null);   // the live record this page last wrote or read
  const cloudFp=useRef(null);     // the fingerprint of what that record holds
  const cloudBusy=useRef(false);  // one save at a time …
  const cloudAgain=useRef(false); // … and a change during one queues another
  const cloudLatest=useRef(null); // the ledger as it stands, for the save to read
  const[snaps,setSnaps]=useState(null);       // null = not read yet
  const[snapWhy,setSnapWhy]=useState(null);
  const[showSnaps,setShowSnaps]=useState(false);
  const[snapBusy,setSnapBusy]=useState(false);
  // The Save panel (her design): the offline file plus, ticked by default, the same file
  // in Cloud Saves.
  const[showSave,setShowSave]=useState(false);
  const[saveLabel,setSaveLabel]=useState("");
  const[saveCloud,setSaveCloud]=useState(true);
  const[saveBusy,setSaveBusy]=useState(false);
  const[saveNote,setSaveNote]=useState(null);   // {text, ok} — what the last Save did
  const[showResetCards,setShowResetCards]=useState(false);
  const[resetQuery,setResetQuery]=useState("");
  // Per-venue freshness, two facts: { [venueId]: { attempted: iso, returned: iso|null } }.
  const[venueSeen,setVenueSeen]=useState({});
  // "Last refreshed" = the latest attempt in the sweep log, never the ledger's lastRun
  // (docs/app.md §5). An empty store reads "Unknown".
  const lastSweep=useMemo(()=>{
    let out=null;
    for(const v of Object.values(venueSeen||{})){
      const a=v&&v.attempted;
      if(a&&(!out||a>out))out=a;
    }
    return out;
  },[venueSeen]);
  const[showFresh,setShowFresh]=useState(false);
  const[freshWhy,setFreshWhy]=useState(null);   // why the sweep log is empty, when it is
  const[seenInFile,setSeenInFile]=useState(null);
  // A download we started but cannot confirm arrived. Never clears `dirty`.
  const[unconfirmedSave,setUnconfirmedSave]=useState(null);
  const[lastSaved,setLastSaved]=useState(null);
  const[saveState,setSaveState]=useState("idle");
  const cloudNotSaving=saveState==="failed"||saveState==="off";
  const[dirty,setDirty]=useState(false);
  const[savedFile,setSavedFile]=useState(null);
  const[loadedInfo,setLoadedInfo]=useState(null);
  const[confirmBox,setConfirmBox]=useState(null); // {text, act} for confirm-before-replace
  const[,setTick]=useState(0);
  const[sortBy,setSortBy]=useState("date");
  const[dateReversed,setDateReversed]=useState(false);
  const[venueF,setVenueF]=useState(new Set());
  const[themeF,setThemeF]=useState(new Set());
  const[timeF,setTimeF]=useState(new Set());
  const[acqWanted,setAcqWanted]=useState(false);
  const[acqOwned,setAcqOwned]=useState(false);
  const[acq3mo,setAcq3mo]=useState(false);
  const[acq6mo,setAcq6mo]=useState(false);
  const[acqHasCat,setAcqHasCat]=useState(false);
  const[acqNoCat,setAcqNoCat]=useState(false);
  const[acqDigital,setAcqDigital]=useState(false);
  const[acqBuyNext,setAcqBuyNext]=useState(false);
  const bnOnly=acqBuyNext&&!acqOwned;   // Buy next alone: her dragged order; with Owned it is an ordinary list
  const[drag,setDrag]=useState(null); // the card being dragged in the Buy next view
  const[bnPeriod,setBnPeriod]=useState(false);
  const[bnDate,setBnDate]=useState(false);   // Buy next alone, sorted by date: the same taps as Period
  const dragOn=bnOnly&&!bnPeriod&&!bnDate&&!readOnly;
  const[showAll,setShowAll]=useState(false);
  const[dismissedOnly,setDismissedOnly]=useState(false);
  const[labelledF,setLabelledF]=useState(false);
  const[watchedF,setWatchedF]=useState(false);
  const[showSearch,setShowSearch]=useState(false);
  const[search,setSearch]=useState("");
  const[openCards,setOpenCards]=useState({});
  const[undo,setUndo]=useState(null);
  const undoTimer=useRef(null);
  const fileRef=useRef(null);
  const refreshFileRef=useRef(null);
  const searchRef=useRef(null);
  const[proposals,setProposals]=useState(null); // null = not in refresh review; array = reviewing
  // Listing pages the sweep could not read. NOT proposals — see isMarkerRow().
  const[coverage,setCoverage]=useState([]);
  const[tally,setTally]=useState(null);
  // Which triage bands are open: set by what a band asks of her, never its size —
  // markers and combined-for-you open closed; the count shows either way.
  const[openBands,setOpenBands]=useState({});
  // Which venues are open in normal cases. Undefined = OPEN, so a venue is never hidden
  // by default. "Collapse all" writes false for each venue, so opening one later does
  // not reopen the rest.
  const[openVenues,setOpenVenues]=useState({});
  const[decisions,setDecisions]=useState({}); // proposal index -> "accept"|"reject"|"addnew"
  const[refreshDone,setRefreshDone]=useState(null); // {added,filled,changed} after applying
  const[refreshTouched,setRefreshTouched]=useState([]); // ids added/changed in the last refresh
  const[pinTouched,setPinTouched]=useState(false); // pin those ids to the top this session
  // Buy next by period (her design): Period in the Buy next view switches between her dragged
  // order and the period order with its dividers; she drags only in her own order.
  const periodView=bnOnly?bnPeriod:(sortBy==="period"&&!pinTouched);
  const[showTop,setShowTop]=useState(false); // show the return-to-top button once scrolled down
  // Light or dark: remembered in browser storage (a per-device convenience, wrapped —
  // storage can throw). First visit follows the machine; her pick then wins there.
  const[theme,setTheme]=useState(()=>{
    try{ const v=localStorage.getItem("cw-theme"); if(v==="dark"||v==="light")return v; }catch{}
    try{ if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)return "dark"; }catch{}
    return "light";
  });
  const toggleTheme=()=>setTheme(t=>{
    const n=t==="dark"?"light":"dark";
    try{ localStorage.setItem("cw-theme",n); }catch{}
    return n;
  });
  // The page around the component paints its own ground before React runs, so tell it
  // too; color-scheme makes scrollbars and form controls follow.
  useEffect(()=>{
    try{
      const d=document.documentElement;
      d.setAttribute("data-theme",theme);
      d.style.colorScheme=theme;
      document.body.style.background=theme==="dark"?"#1A1815":"#E8E4DE";
      document.body.style.color=theme==="dark"?"#EDE8E0":"#1E1B18";
    }catch{}
  },[theme]);
  useEffect(()=>{const onScroll=()=>setShowTop(window.scrollY>400);window.addEventListener("scroll",onScroll,{passive:true});onScroll();return()=>window.removeEventListener("scroll",onScroll);},[]);

  useEffect(()=>{
    // Opens empty: a workspace waiting for her ledger file (docs/app.md §2). Nothing
    // is fetched on open.
    setRows([]);
    setLoaded(true);
    // The sweep log, quarantine and Add-by-link state are not part of the ledger, so
    // they load here, before any file is opened. Read once, not subscribed.
    readSweepLog().then(({log,why})=>{ setVenueSeen(log); setFreshWhy(why); });
    readQuarantine().then(({map,why})=>{ setQuarantine(map); setQuarWhy(why); });
    // The cloud copy is read on open; during the trial it is only read (CLOUD_OPENS).
    (async()=>{
      const raw=await rawStore();
      if(raw){ try{ if(await cloudSessionClaim(raw)==="other")goReadOnly(); }catch{} }
      const db=await useCap("db");
      if(!db){ setCloudLive({why:"This viewer can’t reach the page’s store."}); setSaveState("off"); setSaveErr("This viewer can’t reach the page’s store, so nothing is being saved to the cloud copy."); return; }
      try{
        const {rec,text}=await cloudReadLive(db);
        if(!rec){ setCloudLive({rec:null}); return; }
        const data=JSON.parse(text);
        cloudPrev.current=rec; cloudFp.current=ledgerFingerprintText(data);
        setCloudLive({rec,data}); setLastSaved(rec);
        // A read-only copy opens nothing by itself (her decision); "Open it" shows the
        // cloud copy on request.
        if(CLOUD_OPENS&&!cloudReadOnly)openCloudData(rec,data);
      }catch(e){ setCloudLive({why:cloudTrouble(e,"read")}); }
    })();
    // Add by link: the venues it has met, and links still waiting in the box.
    readOccasional().then(map=>{ occSaved.current=map; registerOccasional(map); setOccVenues(map); });
    readPendingLinks().then(t=>{ if(t)setLinkText(t); });
    readPendingPages().then(l=>{ if(l.length)setPages(l); });
    readPendingPastes().then(l=>{ if(l.length)setPastes(pasteBoxes(l)); });
  },[]);

  // Pasted boxes are stored as she types, a moment after the last key: copying on a phone
  // means leaving the page, which can reload it.
  useEffect(()=>{ if(importMode!=="paste")return; const t=setTimeout(()=>writePendingPastes(pastes),800); return()=>clearTimeout(t); },[pastes,importMode]);

  // Keep the "Last saved ... ago" text and its colour current.
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),30000);return()=>clearInterval(t);},[]);

  // THE HEARTBEAT, and letting go on the way out (best effort — a closing page
  // may not finish it; the record then goes stale in SESSION_STALE_MS).
  useEffect(()=>{
    const beat=async()=>{ if(cloudReadOnly)return; const raw=await rawStore(); if(!raw)return;
      try{ if(await cloudSessionClaim(raw)==="other")goReadOnly(); }catch{} };
    const t=setInterval(beat,SESSION_BEAT_MS);
    const bye=async()=>{ if(cloudReadOnly)return; const raw=await rawStore(); if(!raw)return;
      try{ const snap=await raw.doc(CLOUD_SESSION_DOC).get(); if(snap.exists&&(snap.data()||{}).id===CLOUD_SESSION_ID)await raw.doc(CLOUD_SESSION_DOC).delete(); }catch{} };
    window.addEventListener("pagehide",bye);
    return()=>{ clearInterval(t); window.removeEventListener("pagehide",bye); };
  },[goReadOnly]);

  // EDITS mark the ledger dirty: changed since the last offline Save. The
  // cloud copy saves them by itself; `dirty` now only decides whether a Load
  // or Reset must ask first while the cloud is NOT saving.
  const commit=useCallback(async(next,lr)=>{
    if(cloudReadOnly){ setError(RO_LINE); return; }
    setRows(next);
    if(lr!==undefined)setLastRun(lr);
    setDirty(true);
    setSaveNote(null);
    
  },[]);

  // LOADS (Import, Reset) are NOT unsaved work. Freshly loaded data matches its
  // source, so there's nothing to lose yet. The unsaved warning only appears once
  // you actually change something.
  const loadLedger=useCallback((next,lr,info,extra,display)=>{
    if(cloudReadOnly&&!display){ setError(RO_LINE); return; }
    setRows(next);
    setLastRun(lr!==undefined?lr:null);
    // A ledger's quarantine is merged in, never switched to (latest decision wins).
    const fromFile=quarantineFromList((extra&&extra.ignored)||[]);
    if(Object.keys(fromFile).length){
      setQuarantine(prev=>{ const merged=mergeQuarantine(prev,fromFile); writeQuarantine(merged); return merged; });
    }
    // venueSeen is never read from the file: the sweep log lives in the page's store.
    setDirty(false);
    setSaveNote(null);
    setSavedFile(null);
    setUnconfirmedSave(null);
    setError(null);
    setLoadedInfo(info||null);
    setRefreshDone(null);
    setPinTouched(false); setRefreshTouched([]);
  },[]);

  // ── THE CLOUD LEDGER, INSIDE THE APP ──────────────────────────────────────
  // What a save reads: the ledger as it stands on screen — the same three things Save's
  // file holds.
  cloudLatest.current={rows,ignored,lastRun};

  // The save: one at a time; a change mid-save queues one more, which reads the newest
  // ledger. Nothing is written when nothing changed. One retry after a short pause; a
  // second failure is reported, never swallowed.
  const cloudSaveNow=useCallback(async()=>{
    if(cloudReadOnly)return;
    if(cloudBusy.current){ cloudAgain.current=true; return; }
    // Another copy took over while this one slept? Then nothing is written.
    { const raw=await rawStore();
      if(raw){ try{ if(await cloudSessionClaim(raw)==="other"){ goReadOnly(); setError(RO_LINE); return; } }catch{} } }
    const db=await useCap("db");
    if(!db){ setSaveState("off"); setSaveErr("This viewer can’t reach the page’s store, so nothing is being saved to the cloud copy."); return; }
    cloudBusy.current=true;
    try{
      do{
        cloudAgain.current=false;
        const d=cloudLatest.current;
        const fp=ledgerFingerprintText(d);
        if(fp===cloudFp.current)continue;
        setSaveState("saving");
        const text=JSON.stringify({rows:d.rows,ignored:d.ignored,lastRun:d.lastRun,savedAt:new Date().toISOString()});
        const info={rows:d.rows.length,quarantined:d.ignored.length};
        let rec;
        try{ rec=await cloudSaveLive(db,text,info,cloudPrev.current); }
        catch(e){
          if(e&&["invalid_argument","quota_exceeded","not_granted","revoked"].includes(e.code))throw e;
          await new Promise(r=>setTimeout(r,800+Math.random()*700));
          rec=await cloudSaveLive(db,text,info,cloudPrev.current);
        }
        cloudPrev.current=rec; cloudFp.current=fp;
        setLastSaved(rec); setSaveErr(null); setSaveState("saved");
      }while(cloudAgain.current);
    }catch(e){ setSaveState("failed"); setSaveErr(cloudTrouble(e,"save")); }
    finally{ cloudBusy.current=false; }
  },[goReadOnly]);
  // INSTANT SAVE: shortly after every change, once a ledger is open.
  useEffect(()=>{
    if(!cloudArmed.current||!rows.length)return;
    const t=setTimeout(cloudSaveNow,600);
    return()=>clearTimeout(t);
  },[rows,ignored,lastRun,cloudSaveNow]);

  // Before a whole ledger replaces the cloud copy (Load, Reset): the same → said so (the
  // trial's check); different → the cloud copy is kept as a safety snapshot first, and if
  // that fails nothing is replaced. Returns true when it put a line on screen about what
  // was loaded (then "Loaded N exhibitions" is not shown — her decision).
  async function guardCloudBeforeReplace(incoming,reason){
    const db=await useCap("db");
    if(!db){ setCloudCheck(null); return false; }
    let live;
    try{ live=await cloudReadLive(db); }
    catch(e){ setCloudCheck("The cloud copy couldn’t be read ("+cloudTrouble(e,"read")+"). It was left in the store untouched; this ledger is saved as the new cloud copy."); cloudPrev.current=null; cloudFp.current=null; return true; }
    if(!live.rec){ setCloudCheck("No cloud copy existed yet — this ledger is now the first one."); return true; }
    const data=JSON.parse(live.text);
    cloudPrev.current=live.rec; cloudFp.current=ledgerFingerprintText(data);
    const when=localReadable(live.rec.savedAt);
    const diff=ledgerDifference(data,incoming);
    if(!diff){ setCloudCheck("✓ The file you just loaded is identical to the last cloud save ("+when+"). No snapshot of the last cloud state was needed before loading your file."); return true; }
    // Her format: one count of differences, the cloud save's time, and what was done;
    // the breakdown goes to the diagnostic.
    const bits=[];
    if(diff.onlyA)bits.push(diff.onlyA+" exhibition"+(diff.onlyA===1?"":"s")+" only in the cloud copy");
    if(diff.onlyB)bits.push(diff.onlyB+" only in "+(reason==="reset"?"the starter set":"this file"));
    if(diff.changed)bits.push(diff.changed+" different in some field");
    if(diff.quarantineDiffers)bits.push(diff.qDiff+" quarantine entr"+(diff.qDiff===1?"y":"ies")+" different ("+diff.qa+" in the cloud copy, "+diff.qb+" here)");
    // Never "0 differences" beside a ledger that does differ.
    const n=Math.max(1,diff.onlyA+diff.onlyB+diff.changed+(diff.quarantineDiffers?diff.qDiff:0));
    const what=reason==="reset"?"The starter set":"The file you just loaded";
    const head=what+" differs from the last cloud save ("+when+"): "+n+" difference"+(n===1?"":"s")+".";
    setDebug("Compared with the last cloud save ("+when+"): "+bits.join(", ")+".");
    try{
      await cloudTakeSnapshot(db,live.text,{label:"Safety snapshot before "+(reason==="reset"?"Reset":"Load"),kind:"safety",rows:data.rows.length,quarantined:(data.ignored||[]).length});
      loadSnaps();   // an open drawer shows it straight away
      setCloudCheck(head+" A snapshot of the last cloud state was taken before loading "+(reason==="reset"?"it":"your file")+".");
      return true;
    }catch(e){
      setCloudCheck(head+" A snapshot of the last cloud state could NOT be taken ("+cloudTrouble(e,"save")+"), so "+(reason==="reset"?"it":"your file")+" was not loaded.");
      throw e;   // the caller stops: nothing is armed, nothing overwritten
    }
  }

  // OPEN THE CLOUD COPY. During the trial, by her button; afterwards, on open.
  function openCloudData(rec,data){
    loadLedger((data.rows||[]).map(r=>({...r,watching:r.watching||false})),data.lastRun||null,
      "Opened the cloud copy saved "+localReadable(rec.savedAt)+" — "+(data.rows||[]).length+" exhibitions.",
      {ignored:Array.isArray(data.ignored)?data.ignored:[]},cloudReadOnly);
    cloudPrev.current=rec; cloudFp.current=ledgerFingerprintText(data);
    setLastSaved(rec); setSaveState("saved"); setSaveErr(null); setCloudCheck(null);
    cloudArmed.current=true;
  }
  // Allowed in a read-only copy (her decision): it shows the cloud copy, writes nothing.
  async function requestOpenCloud(){
    const go=async()=>{
      const db=await useCap("db"); if(!db)return;
      try{
        const {rec,text}=await cloudReadLive(db);
        if(!rec){ setError("There is no cloud copy yet."); return; }
        openCloudData(rec,JSON.parse(text));
      }catch(e){ setError("The cloud copy couldn’t be opened: "+cloudTrouble(e,"read")); }
    };
    if(rows.length>0&&dirty&&cloudNotSaving)setConfirmBox({text:"Opening the cloud copy replaces everything on screen. The cloud copy is NOT saving, so your changes since your last Save are on screen only and will be lost. Continue?",act:go});
    else go();
  }

  // SNAPSHOTS.
  async function loadSnaps(){
    const db=await useCap("db");
    if(!db){ setSnaps([]); setSnapWhy("This viewer can’t reach the page’s store."); return; }
    try{ setSnaps(await cloudListSnapshots(db)); setSnapWhy(null); }
    catch(e){ setSnaps([]); setSnapWhy("Couldn’t read the cloud saves ("+cloudTrouble(e,"read")+")."); }
  }
  // Roll back: the ledger it replaces is kept first as a safety snapshot (her decision),
  // so a roll-back can be undone; no safety copy, no roll-back.
  function requestRollback(s){
    if(roStop())return;
    setConfirmBox({title:"Roll back to this cloud save?",
      text:"The ledger becomes the cloud save “"+snapTitle(s,snaps)+"” from "+localReadable(s.at)+" ("+s.rows+" exhibitions). What you have now is kept in Cloud Saves first, so this can be undone.",
      act:async()=>{
        const db=await useCap("db"); if(!db)return;
        setSnapBusy(true);
        try{
          let curText=null,curRows=0,curQ=0;
          if(rows.length){ const d=cloudLatest.current; curText=JSON.stringify({rows:d.rows,ignored:d.ignored,lastRun:d.lastRun,savedAt:new Date().toISOString()}); curRows=d.rows.length; curQ=d.ignored.length; }
          else{ const live=await cloudReadLive(db); if(live.rec){ curText=live.text; const cd=JSON.parse(live.text); curRows=cd.rows.length; curQ=(cd.ignored||[]).length; cloudPrev.current=live.rec; } }
          if(curText)await cloudTakeSnapshot(db,curText,{label:"Safety snapshot before roll-back to snapshot of "+localReadable(s.at),kind:"safety",rows:curRows,quarantined:curQ});
          const data=JSON.parse(await cloudReadSnapshot(db,s));
          loadLedger((data.rows||[]).map(r=>({...r,watching:r.watching||false})),data.lastRun||null,
            "Rolled back to the cloud save “"+snapTitle(s,snaps)+"” from "+localReadable(s.at)+" — "+(data.rows||[]).length+" exhibitions.",
            {ignored:Array.isArray(data.ignored)?data.ignored:[]});
          setDirty(true);          // it is in no file yet
          setCloudCheck(null);
          cloudArmed.current=true; // the save that follows makes it the live copy
          await loadSnaps();
        }catch(e){ setSnapWhy("Rollback NOT done — "+cloudTrouble(e,"read")+" Nothing was replaced."); }
        finally{ setSnapBusy(false); }
      }});
  }
  async function downloadSnapshot(s){
    const db=await useCap("db"); if(!db)return;
    try{
      const text=await cloudReadSnapshot(db,s);
      // A copy made by Save comes back under the name its offline twin has.
      // Older copies, and the automatic ones, are named as before.
      const slug=labelSlug(s.label);
      const filename=s.filename||("cat-watch-snapshot-"+localStamp(s.at)+(slug?"-"+slug:"")+".json");
      const route=await offerFile(filename,JSON.stringify(JSON.parse(text),null,2));
      setSnapWhy(route==="runtime"?"Saved "+filename+".":"A download of "+filename+" was started — this viewer can’t confirm it arrived; check your downloads folder.");
    }catch(e){
      const why=e&&e.route==="browser"?"the download couldn’t start"
        :e&&["missing_part","fingerprint"].includes(e.code)?String(e.message)
        :"the save was refused or cancelled ("+String((e&&(e.code||e.message))||e)+")";
      setSnapWhy("Download NOT done — "+why+".");
    }
  }

  const toggleSet=(setter,val)=>setter(prev=>{const n=new Set(prev);if(n.has(val))n.delete(val);else n.add(val);return n;});
  const clearFilters=()=>{setVenueF(new Set());setThemeF(new Set());setTimeF(new Set());setAcqWanted(false);setAcqOwned(false);setAcq3mo(false);setAcq6mo(false);setAcqHasCat(false);setAcqNoCat(false);setAcqDigital(false);setAcqBuyNext(false);setBnPeriod(false);setBnDate(false);setShowAll(false);setDismissedOnly(false);setWatchedF(false);setLabelledF(false);setSearch("");setShowSearch(false);};

  // WHAT A QUARANTINE REMEMBERS. The URL where there is one; venue + title where there
  // is not (a reused title could block the wrong row — bounded, and visible on screen).
  const ignoreKeyFor=(venueId,url,title)=>
    venueId+"|"+(url?normalizeUrlKey(url):"t:"+normalizeTitle(title));

  // Conservative duplicate matching for incoming refresh results.
  const normalizeTitle = v => String(v||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/&/g," and ").replace(/\+/g," and ")
    .replace(/[’‘`]/g,"'").replace(/['"]/g,"")
    .replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();

  const dateMs = d => {
    if(!d)return null;
    const x=new Date(d+"T00:00:00");
    return isNaN(x)?null:x.getTime();
  };

  const dateRangesOverlap = (a,b) => {
    const as=dateMs(a.startDate), ae=dateMs(a.endDate);
    const bs=dateMs(b.startDate), be=dateMs(b.endDate);
    if(as===null||ae===null||bs===null||be===null)return false;
    return as<=be && bs<=ae;
  };

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

  // ---- REFRESH ENGINE ----
  // Reads a pro forma CSV, compares each row with the ledger and proposes cards; nothing
  // applies until she says. Unusable data becomes a note on the card, never dropped.
  // Marker rows (a listing page the sweep could not read) are matched on the scraper's
  // notes sentence, never on a bracketed title, and go to the coverage panel.
  const MARKER_SENTINEL = "Marker row, not an exhibition.";
  const isMarkerRow = note => String(note||"").trim().endsWith(MARKER_SENTINEL);

  // Which of two values to offer first when a stitched file disagrees with itself: the
  // FULLER one, marked as a guess, both shown (her decision).
  const fuller = (a,b) => (String(b||"").trim().length > String(a||"").trim().length) ? b : a;

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

  function analyzeProForma(text,ignoredKeys,opts){
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

  // The sweep log is written when the import FINISHES (her decision: an unfinished
  // import keeps nothing); held in seenInFile until then. A file with nothing to
  // propose is recorded at once. AL-013.
  const recordSweep=(seen)=>{
    if(!seen) return;
    const vs=mergeSweepLog(venueSeen,seen);
    setVenueSeen(vs);
    writeSweepLog(vs).then(ok=>{ setFreshWhy(ok?null:"The sweep log couldn\u2019t be saved to this page\u2019s store, so it may reset when you reload."); });
  };

  function handleRefreshFile(e){
    setReadVenues([]);
    const file=e.target.files[0]; if(!file)return;
    if(roStop()){ e.target.value=""; return; }
    const reader=new FileReader();
    reader.onload=()=>{
      const res=analyzeProForma(String(reader.result||""),new Set(ignored.map(x=>x.key)));
      if(res.error){setError(res.error);return;}
      if(!res.props.length){
        recordSweep(res.seen);
        setCoverage(res.coverage||[]); setTally(res.tally||null); setSeenInFile(res.seen||null);
        setError("Read the refresh file, but nothing new to propose \u2014 your ledger already matches it."+((res.coverage||[]).length?" ("+res.coverage.length+" listing page"+(res.coverage.length===1?"":"s")+" couldn\u2019t be read \u2014 see below.)":""));
        return;
      }
      setError(null); setProposals(res.props); setCoverage(res.coverage||[]); setTally(res.tally||null); setSeenInFile(res.seen||null); setDecisions(topicPresets(res.props));
      labelCards(res.props);
    };
    reader.readAsText(file); e.target.value="";
  }


  // Every new show gets its period while she reviews the cards: one ask for
  // the import, written onto the card (docs/periods.md). A miss leaves the card without
  // one, for Label to fill later.
  async function labelCards(props){
    const shows=[];
    props.forEach((p,i)=>{ if(p.type==="add")shows.push(periodShow(i,p.cand)); });
    if(!shows.length)return;
    const tape=tapeStart("Label import cards",{title:shows.length+" new shows"});
    const {labels,batches}=await labelPeriods(shows);
    const said=labelSummary(shows.length,batches);
    saveLookupTape(tape,{ok:said.ok,said:said.text,detail:JSON.stringify(batches)});
    const at=new Date().toISOString();
    if(labels.size)setProposals(cur=>cur!==props?cur:props.map((p,i)=>labels.has(i)?{...p,cand:{...p.cand,...labels.get(i),labelledAt:at}}:p));
  }
  // Label: every show (stage 3: the whole ledger, her decision) with no period or no themes yet, dismissed ones
  // included. Fills only; a labelled show is never relabelled. Not an edit of hers: editedAt stays.
  async function labelLedger(){
    if(busy||roStop())return;
    const todo=rows.filter(r=>!labelDone(r));
    if(!todo.length){ setLabelSaid({ok:true,text:"Label: every exhibition already has a period."}); return; }
    setBusy(true); setLabelSaid(null); setProg({done:0,total:todo.length,label:"Labelling periods\u2026"});
    // Each run is one record in the lookup log: every question, Claude's answer, each batch's outcome.
    const tape=tapeStart("Label periods",{title:todo.length+" exhibitions"});
    let said={ok:false,text:"Label: didn\u2019t finish."}, batches=[];
    try{
      const res=await labelPeriods(todo.map((r,i)=>periodShow(i,r)),(done,total)=>setProg({done,total,label:"Labelling periods\u2026"}));
      batches=res.batches;
      const at=new Date().toISOString();
      const byId=new Map(); res.labels.forEach((v,i)=>byId.set(todo[i].id,{...v,labelledAt:at}));
      if(byId.size){ setRows(prev=>prev.map(r=>byId.has(r.id)&&!labelDone(r)?{...r,...byId.get(r.id)}:r)); setDirty(true); setSaveNote(null); }
      said=labelSummary(todo.length,batches);
    }catch(e){ said={ok:false,text:"Label: didn\u2019t finish \u2014 "+String((e&&e.message)||e)+"."}; }
    finally{
      setLabelSaid(said);
      setDebug(said.text+"\n"+batches.map((b,j)=>"Batch "+(j+1)+": "+b.labelled+" of "+b.shows+" labelled, "+b.tries+" "+(b.tries===1?"try":"tries")+(b.why?" \u2014 "+b.why:"")).join("\n"));
      saveLookupTape(tape,{ok:said.ok,said:said.text,detail:JSON.stringify(batches)});
      setBusy(false); setProg({done:0,total:0,label:""});
    }
  }

  // Relabel (her design): one show asked afresh under the current rules, its label
  // replaced; what it says shows in that card's drawer. Not an edit of hers: editedAt stays.
  async function relabel(id){
    const r=rows.find(x=>x.id===id);
    if(!r||busy||relabelId||roStop())return;
    setRelabelId(id); setRecheckSaid(null);
    const tape=tapeStart("Relabel",r);
    let said;
    try{
      const {labels,batches}=await labelPeriods([periodShow(0,r)]);
      const v=labels.get(0)&&{...labels.get(0),periodKeep:false,relabelledAt:new Date().toISOString()};
      if(v){
        const next=landOnCard(cloudLatest.current.rows,id,r,{...r,...v});
        setRows(next); setDirty(true); setSaveNote(null);
        const nr={...r,...v}, shown=periodOf(nr,artistPeriods(next));
        said={id,failed:false,regrouped:shown!==nr.period,text:"Relabelled: "+periodText(nr)+(shown!==nr.period?" \u2014 shown with "+nr.periodArtist+"\u2019s other shows, under "+PERIOD_NAME[shown]:"")+"."};
      }else said={id,failed:true,text:"Relabel didn\u2019t finish \u2014 "+(batches[0]&&batches[0].why||"no answer")+"."};
    }catch(e){ said={id,failed:true,text:"Relabel didn\u2019t finish \u2014 "+String((e&&e.message)||e)+"."}; }
    finally{ setRecheckSaid(said); saveLookupTape(tape,{ok:!said.failed,said:said.text}); setRelabelId(null); }
  }

  // Do not regroup: Claude's answer stands for this show until its next Relabel (her design).
  function keepPeriod(id){
    const r=rows.find(x=>x.id===id); if(!r||roStop())return;
    commit(rows.map(x=>x.id===id?{...x,periodKeep:true,editedAt:new Date().toISOString()}:x));
    setRecheckSaid({id,failed:false,text:"Relabelled: "+periodText(r)+" \u2014 no regrouping."});
  }

  // ── ADD BY LINK — the button's work ────────────────────────────────────────
  // One page read per link, then one model call for the prose; a new venue's
  // shop is found once. Every row then goes through analyzeProForma, the same
  // door as a sweep file. What could not be read stays in the box.
  // Pages (saved pages) take the same road, the page's text in place of the fetch;
  // what could not be read stays in the Pages list.
  async function readLinks(kind){
    const fromPasted=kind==="paste", fromPages=kind==="pages"||fromPasted;
    // Pasted boxes: each turned into a page now, then read as a saved page is; a box that
    // cannot be is a line, never read.
    const pasteBad=[];
    const pasted=fromPasted?pastes.filter(filledBox).map(x=>{ const r=pastedPageReply(x.url,x.text); if(!r.ok){ pasteBad.push({url:x.url.trim(),why:r.why}); return null; } return{url:r.res.url,text:r.res.text,box:x}; }).filter(Boolean):[];
    const items=fromPasted?pasted:fromPages?pages:linksIn(linkText).map(url=>({url}));
    const urls=items.map(x=>x.url);
    if(!urls.length){ setLinkFails(pasteBad.length?pasteBad:[{url:"",why:fromPasted?"Nothing pasted.":fromPages?"No pages chosen.":"No links found in the box."}]); return; }
    setBusy(true); setLinkNote(null); setLinkFails([]);
    linkRead.current={on:true,stop:false};
    const got=[], fails=[...pasteBad], met=new Set(), looked=new Set();
    let venues={...occVenues}, venuesChanged=false;
    for(let n=0;n<urls.length;n++){
      if(linkRead.current.stop)break;
      const url=urls[n];
      setProg({done:n,total:urls.length,label:"Reading "+(n+1)+" of "+urls.length+"\u2026"});
      const item=items[n];
      // Each link's reading is one record in the lookup log: what code read off the
      // page, Claude's answer and the title made from them.
      const tape=tapeStart(fromPasted?"Add by paste":fromPages?"Add by page":"Add by link",{title:url,exUrl:url}), seen={url};
      const failsBefore=fails.length;
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
        const askFresh=isOcc(vc)&&needsFacts(venues[vc]), askVenue=askFresh||(isOcc(vc)&&!(linkEntry(vc)||{}).name&&nearMuseumSite(host));
        // An entry that only places the venue's chip leaves this as it was (Cini).
        const lk=linkEntry(vc), ownSite=vc===occVenueId(host)&&(!lk||Object.keys(lk).every(k=>k==="ownChip"||k==="chip"||k==="group"));
        const prompt=linkPrompt(page,askVenue,url,vc);
        let ask=await readResults(prompt);
        let faults=ask.ok?answerFaults(ask.data,page):[];
        for(let again=0;faults.length&&again<LINK_ASK_AGAIN;again++){
          seen.refused=[...(seen.refused||[]),{answer:ask.data,faults}];
          ask=await readResults(askAgainPrompt(prompt,faults,ask.data));
          faults=ask.ok?answerFaults(ask.data,page):[];
        }
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
            setProg({done:n,total:urls.length,label:"Reading "+(n+1)+" of "+urls.length+"\u2026 looking for "+name+"\u2019s shop"});
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
    // Cancelled mid-Read: nothing from this Read is kept; every link stays in the box.
    if(linkRead.current.stop){ linkRead.current={on:false,stop:false}; setProg({done:0,total:0,label:""}); setBusy(false); setImportMode(null); return; }
    linkRead.current={on:false,stop:false};
    if(venuesChanged){ registerOccasional(venues); setOccVenues(venues); }   // held, not stored: see occSaved
    setProg({done:0,total:0,label:""}); setBusy(false); setReadVenues([...met]);
    const failed=new Set(fails.map(x=>x.url));
    const left=fails.map(x=>x.url).join("\n"), leftPages=pages.filter(p=>failed.has(p.url));
    // A pasted box stays when it was not read or failed.
    const readBox=new Map(pasted.map(p=>[p.box,p.url]));
    const leftPastes=pasteBoxes(pastes.filter(x=>filledBox(x)&&(!readBox.has(x)||failed.has(readBox.get(x)))));
    // The box (or list) is stored when the import finishes.
    if(fromPasted)setPastes(leftPastes); else if(fromPages)setPages(leftPages); else setLinkText(left);
    setLinkFails(fails);
    linksAtRead.current=null;
    if(!got.length)return;
    const res=analyzeProForma(proFormaCsv(got),new Set(ignored.map(x=>x.key)),{notePrefix:""});
    if(res.error){ setLinkNote(res.error); return; }
    if(!res.props.length){
      setTally(res.tally||null);
      if(fromPasted)writePendingPastes(leftPastes); else if(fromPages)writePendingPages(leftPages); else writePendingLinks(left);   // nothing to approve: this Read is finished
      // Every one quarantined: it says so, not "your ledger already matches" (her wording).
      setLinkNote("Read "+got.length+(fromPages?" page":" link")+(got.length===1?"":"s")+", but "+(res.tally&&res.tally.blocked>=got.length?"nothing to add \u2014 already in your quarantine.":"nothing new to propose \u2014 your ledger already matches "+(got.length===1?"it":"them")+"."));
      return;
    }
    setProposals(res.props); setCoverage([]); setTally(res.tally||null); setSeenInFile(null); setDecisions(topicPresets(res.props));
    labelCards(res.props);
    linksAtRead.current=fromPasted?{pastes:pasted.map(p=>({...p.box,url:p.url}))}:fromPages?{pages:items}:urls;
    // Done with the pop-up — unless a link could not be read: then it stays
    // under the review, its lines waiting for her when the review closes.
    if(!fails.length)setImportMode(null);
  }
  // Pages chosen: each file turned into its text now, the file itself never kept. Added to
  // the list (and the store) at once, as typing fills the Links box.
  async function pickPages(e){
    const files=[...(e.target.files||[])]; e.target.value="";
    if(!files.length)return;
    const add=[], bad=[];
    for(const f of files){
      let r;
      try{ r=savedPageReply(await f.text(),h=>new DOMParser().parseFromString(h,"text/html")); }
      catch(err){ r={ok:false,why:"Couldn\u2019t read it ("+String((err&&err.message)||err)+")."}; }
      if(r.ok)add.push({url:r.res.url,title:r.res.title,name:f.name,text:r.res.full_content});
      else bad.push({url:"",why:f.name+": "+r.why});
    }
    const list=mergePages(pages,add);
    setPages(list); setLinkFails(bad); setLinkNote(null);
    if(add.length)writePendingPages(list);
  }
  // The shop screen's answers are held in the working copy and stored when the ledger
  // moves; Cancel import drops them, Back keeps them (her decision). Confirmed in a
  // finished import → never asked again.
  function holdVenues(next){ registerOccasional(next); setOccVenues(next); }
  // Back to what the store holds: the import's venues and answers dropped.
  function dropHeldVenues(){
    const saved=occSaved.current;
    for(const id of Object.keys(MU)) if(isOcc(id)&&!saved[id]){ delete MU[id]; KNOWN_VENUES.delete(id); }
    registerOccasional(saved); registerUnseenOccasional(rows); setOccVenues(saved);
  }
  // Each answer keeps what the finder found (`beforeAnswer`), so an answer for a venue with no show going in is
  // dropped when the ledger moves (answeredOnly).
  // A shop with no books section seen ("Shop found, but not its books section"): her Confirm takes the shop shown as its section.
  function confirmShop(id,english){ const v=occVenues[id]; if(!v)return; const whole=v.shop==="noshelf"&&v.shopHome?{shop:"found",shopCatalogues:v.shopHome,shelfKind:"front"}:{};
    holdVenues({...occVenues,[id]:{...v,beforeAnswer:v.beforeAnswer||foundShop(v),...whole,confirmed:true,englishPicked:!!english,shopAdded:false}}); }
  // "No shop": the lookup goes straight to the web, as at Capodimonte.
  function noShopFor(id){ const v=occVenues[id]; if(v)holdVenues({...occVenues,[id]:{...v,beforeAnswer:v.beforeAnswer||foundShop(v),shop:"none",confirmed:true,shopHome:null,shopCatalogues:null,shelfKind:null,shopSearch:null,why:null,shopEnglishUnread:null,englishPicked:false,shopAdded:false}}); }
  // "Add": her own link taken as the section. Its search is worked out at the venue's first lookup (fillShopSearch).
  // Not a link → the box stays open.
  function addShopFor(id,text){
    const v=occVenues[id]; if(!v)return;
    if(!String(text||"").trim()){ setShopAdding(null); return; }
    const href=typedLink(text); if(!href)return;
    setShopAdding(null);
    holdVenues({...occVenues,[id]:{...v,beforeAnswer:v.beforeAnswer||foundShop(v),shop:"found",shopHome:originOf(href),shopCatalogues:href,shelfKind:null,shopSearch:null,searchRule:null,why:null,shopEnglishUnread:null,englishPicked:false,shopAdded:true,foundBy:"her link",confirmed:true}});
  }
  // "Look again": a new search NOW, skipping only the pages she turned down, never the
  // whole site.
  async function lookAgain(id){
    const v=occVenues[id]; if(!v)return;
    const turnedDown=[...(v.turnedDown||[]),v.shopCatalogues].filter(Boolean);
    setShopLooking(id);
    let shop;
    try{ shop=await discoverShop(v.pageShop||"",v.host,venueSearchName(v.id,v),turnedDown,v.id,null,v.english===false,v.gallery===true); }
    catch(e){ shop={shop:"failed",why:"Couldn\u2019t look ("+String((e&&e.message)||e)+")."}; }
    setShopLooking(null);
    setOccVenues(prev=>{
      const{beforeAnswer,...was}=prev[id];
      const next={...prev,[id]:{...was,shopHome:null,shopCatalogues:null,shelfKind:null,shopSearch:null,why:null,shopEnglishUnread:null,englishPicked:false,shopAdded:false,...shop,confirmed:false,turnedDown}};
      registerOccasional(next); return next; });
  }
  // The shop screen asks about a venue outside her list whose shop is unconfirmed (venuesGoingIn).
  function venuesToConfirm(){
    const ids=venuesGoingIn(proposals,decisions);
    // Confirmed in a FINISHED import only: an answer held in this one stays on
    // the screen after Back, to be changed.
    for(const id of [...ids]) if(!occVenues[id]||(occSaved.current[id]||{}).confirmed)ids.delete(id);
    return [...ids].sort((a,b)=>String(occVenues[a].name).localeCompare(String(occVenues[b].name)));
  }
  // THE REVIEW'S LAST BUTTON. With a shop to confirm it is "Next" and opens
  // the shop screen; the ledger moves only when that screen is done.
  function proceedRefresh(partial){
    const ids=venuesToConfirm();
    if(ids.length){ setShopScreen({partial,ids}); return; }
    applyRefresh(partial);
  }

  // Decision model. Each card holds: {mode} for an add ("accept"/"reject"/"never"),
  // or {fields:{j:"accept"|"reject"}, mode:"addnew"?} for fill/change.
  const setCardMode=(i,v)=>setDecisions(d=>{const cur=d[i]||{};return{...d,[i]:{...cur,mode:cur.mode===v?undefined:v}};});
  // Which value she picked where the file disagreed with itself. Per card, per
  // field; absent means "still on the pre-picked fuller one".
  const setChoice=(i,field,val)=>setDecisions(d=>{const cur=d[i]||{};return{...d,[i]:{...cur,choices:{...(cur.choices||{}),[field]:val}}};});
  const setFieldDec=(i,j,v)=>setDecisions(d=>{const cur=d[i]||{};const f={...(cur.fields||{})};f[j]=f[j]===v?undefined:v;return{...d,[i]:{...cur,fields:f,mode:undefined}};});

  function makeLedgerRow(c,now){
    const base=c.museumId+"-"+normalizeTitle(c.title).replace(/[^a-z0-9]+/g,"").slice(0,50);
    return {id:base,museumId:c.museumId,title:c.title,startDate:c.startDate||null,endDate:c.endDate||null,summary:c.summary||"",exUrl:c.exUrl||(MU[c.museumId]?.listUrl||""),interested:true,watching:false,acquiring:null,looked:false,hasCatalogue:"unknown",catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,publisherResult:null,shopUrl:null,shopState:null,shopChange:null,addedAt:now,editedAt:null,
      ...(labelDone(c)?{period:c.period,periodYear:c.periodYear,periodResponse:!!c.periodResponse,periodArtist:c.periodArtist||"",themes:c.themes,labelledAt:c.labelledAt||now}:{})};
  }

  // Apply whatever she picked where the stitched file disagreed with itself.
  // Untouched fields keep the pre-selected fuller value, which is what the card
  // was already showing — so doing nothing gives her exactly what she saw.
  const withChoices=(cand,dec)=>{
    const c=(dec||{}).choices; if(!c)return cand;
    const out={...cand};
    for(const f of Object.keys(c)){
      const v=c[f];
      if(f==="title")out.title=v;
      else if(f==="startDate")out.startDate=v||null;
      else if(f==="endDate")out.endDate=v||null;
      else if(f==="summary")out.summary=v;
    }
    return out;
  };

  // PARTIAL IS A PARAMETER, NOT A SECOND COPY OF THIS FUNCTION. `partial` changes
  // nothing about what is written; it only counts what was left behind for the green
  // bar. One copy of the ledger write.
  function applyRefresh(partial){
    const byId=new Map(rows.map(r=>[r.id,r]));
    const now=new Date().toISOString();
    const touched=[];
    const newlyIgnored=[];
    let added=0,filled=0,changed=0;
    proposals.forEach((p,i)=>{
      const dec=decisions[i]||{};
      if(p.type==="add"){
        if(dec.mode==="never"){
          const c=p.cand;
          newlyIgnored.push({key:ignoreKeyFor(c.museumId,c.exUrl,c.title),venueId:c.museumId,title:c.title,at:now});
          return;
        }
        if(dec.mode!=="accept")return;
        const nrow=makeLedgerRow(withChoices(p.cand,dec),now); let id=nrow.id,c=2; while(byId.has(id)){id=nrow.id+"-"+c;c++;} nrow.id=id; byId.set(id,nrow); touched.push(id); added++; return;
      }
      // fill / change
      if(dec.mode==="addnew"){
        const nrow=makeLedgerRow(withChoices(p.cand,dec),now); let id=nrow.id,c=2; while(byId.has(id)){id=nrow.id+"-"+c;c++;} nrow.id=id; byId.set(id,nrow); touched.push(id); added++; return;
      }
      const m=byId.get(p.matchId); if(!m)return; const patch={...m}; let hit=false;
      p.upd.forEach((u,j)=>{ if((dec.fields||{})[j]==="accept"){ patch[u.field]=u.newVal; if(u.kind==="fill")filled++; else changed++; hit=true; } });
      if(hit){ patch.editedAt=now; byId.set(p.matchId,patch); touched.push(p.matchId); }
    });
    // The import is finished, so what it held back is stored now: a CSV's sweep log
    // (seenInFile — a link is not a sweep), or for a Read the box: unread links plus
    // the links of rejected cards, and of cards a partial apply left undecided (her
    // decision). "Clear" in the box empties it.
    if(seenInFile)recordSweep(seenInFile);
    else{
      const back=proposals.filter((p,i)=>/^(rejected|undecided)$/.test(cardOutcome(p,decisions[i]))).map(p=>(p.cand||{}).exUrl).filter(Boolean);
      if(linksAtRead.current&&linksAtRead.current.pastes){
        const keys=new Set(back.map(u=>normalizeUrlKey(u)));
        const list=mergeBoxes(pastes,linksAtRead.current.pastes.filter(p=>keys.has(normalizeUrlKey(p.url))));
        setPastes(list); writePendingPastes(list);
      }else if(linksAtRead.current&&linksAtRead.current.pages){
        const keys=new Set(back.map(u=>normalizeUrlKey(u)));
        const list=mergePages(pages,linksAtRead.current.pages.filter(p=>keys.has(normalizeUrlKey(p.url))));
        setPages(list); writePendingPages(list);
      }else{
        const box=[...new Set([...linksIn(linkText),...back])].join("\n");
        setLinkText(box); writePendingLinks(box);
      }
    }
    linksAtRead.current=null;
    // A new quarantine goes to the store, the copy that survives a Reset; the export
    // carries the list too.
    if(newlyIgnored.length){
      const add={};
      for(const x of newlyIgnored) add[x.key]={venueId:x.venueId,title:x.title,at:x.at,state:"blocked"};
      setQuarantine(prev=>{ const merged=mergeQuarantine(prev,add);
        writeQuarantine(merged).then(ok=>{ if(!ok) setQuarWhy("The quarantine couldn\u2019t be saved to this page\u2019s store, so it may reset when you reload. Save to keep it."); });
        return merged; });
    }
    // Counted from the cards with the gate's own function, never handed in.
    const leftUndecided=proposals.filter((p,i)=>isUndecidedCard(p,decisions[i])).length;
    commit(Array.from(byId.values()),new Date().toISOString());
    if(occVenues!==occSaved.current){ const kept=answeredOnly(occVenues,occSaved.current,venuesGoingIn(proposals,decisions)); writeOccasional(kept); occSaved.current=kept; registerOccasional(kept); setOccVenues(kept); }
    setShopScreen(null); setShopAdding(null); setReadVenues([]);
    setProposals(null); setDecisions({}); setSeenInFile(null); setRefreshDone({added,filled,changed,never:newlyIgnored.length,left:partial?leftUndecided:0});
    setRefreshTouched(touched); setPinTouched(touched.length>0); // float just-changed entries to the top, this session
    setVenueF(new Set()); setThemeF(new Set()); setTimeF(new Set()); setWatchedF(false); setLabelledF(false);
    setAcqWanted(false); setAcqOwned(false); setAcq3mo(false); setAcq6mo(false); setAcqHasCat(false); setAcqNoCat(false); setAcqDigital(false); setAcqBuyNext(false); setBnPeriod(false); setBnDate(false);
    setDismissedOnly(false); setShowAll(false); setSearch("");
  }
  // Cancel import after a Read puts every link (or page) it read back in the box (or list), stored (her decision).
  function cancelRefresh(){
    if(linksAtRead.current&&linksAtRead.current.pastes){
      const list=mergeBoxes(pastes,linksAtRead.current.pastes);
      setPastes(list); writePendingPastes(list); linksAtRead.current=null;
    }else if(linksAtRead.current&&linksAtRead.current.pages){
      const list=mergePages(pages,linksAtRead.current.pages);
      setPages(list); writePendingPages(list); linksAtRead.current=null;
    }else if(linksAtRead.current){
      const box=[...new Set([...linksIn(linkText),...linksAtRead.current])].join("\n");
      setLinkText(box); writePendingLinks(box); linksAtRead.current=null;
    }
    dropHeldVenues(); setShopScreen(null); setShopAdding(null); setReadVenues([]); setProposals(null); setDecisions({}); setCoverage([]); setTally(null); setSeenInFile(null); }
  // A second tap on Date reverses it; a third goes back to the usual order.
  const pickSort=k=>{if(bnOnly){if(k==="period"||k==="date"){const cur=bnPeriod?"period":bnDate?"date":"";if(cur!==k){setBnPeriod(k==="period");setBnDate(k==="date");setDateReversed(false);}else if(!dateReversed)setDateReversed(true);else{setBnPeriod(false);setBnDate(false);setDateReversed(false);}}return;}setDateReversed((k==="date"||k==="period")&&sortBy===k&&!pinTouched&&!dateReversed);setSortBy(k);setPinTouched(false);}; // manual sort releases the pinned refresh group




  // The lookup runs at top level (lookupCatalogue); the page hands it its progress
  // line and, for an occasional venue, the check that works out its shop search.
  const lookHooks={label:setLookLabel,prepareShop:fillShopSearch};
  const lookupCat=row=>lookupCatalogue(row,lookHooks);

  // A link venue met before the finder proved searches (finder 2), or before today's search
  // proof (SEARCH_RULE: the RA's search was missed), gets its search worked out once, at its
  // first lookup, from its own shelf — then stored.
  async function fillShopSearch(id){
    const mu=MU[id];
    if(!mu||!mu.occasional||mu.shopSearch||!mu.shopHome)return;
    const v=occVenues[id]||occSaved.current[id];
    if(!v||(v.finder>=3&&v.searchRule>=SEARCH_RULE))return;
    let found;
    const f=mu.shopCatalogues?await fetchPage(mu.shopCatalogues,"The books in this section of the shop, with their prices.",null,{full:true}):{ok:true,results:[]};
    if(f.ok)found=await proveShopSearch(pageTextOf(f.results),mu.shopCatalogues||mu.shopHome);
    if(found===undefined||!f.ok)return;   // a call that died is not an answer
    const add=x=>x?{...x,shopSearch:found,finder:3,searchRule:SEARCH_RULE}:x;
    if(occSaved.current[id]){ const saved={...occSaved.current,[id]:add(occSaved.current[id])}; occSaved.current=saved; writeOccasional(saved); }
    setOccVenues(prev=>{ const next=prev[id]?{...prev,[id]:add(prev[id])}:prev; registerOccasional(next); return next; });
    MU[id]={...MU[id],...occVenue(id,{...v,shopSearch:found,finder:3,searchRule:SEARCH_RULE})};
  }
  // A step that died is not an answer: the card says why, and the reason is not
  // stored — it is a fact about one attempt. C-043 to C-045.
  async function findOneCat(id){
    if(roStop())return;
    setBusy(true);setBusyId(id);setError(null);setRecheckSaid(null);
    const row=rows.find(r=>r.id===id);
    const tape=tapeStart(row.looked?"Search again":"Find catalogue",row);
    const out=await lookupCat(row);
    saveLookupTape(tape,out);
    setDebug(out.detail);
    // SEARCH AGAIN REPLACES THE CARD ONLY WHEN IT FINISHED. Any step that
    // failed → the card stays as it was, and says so.
    if(row.looked&&out.ok&&out.trouble){
      setRecheckSaid({id,failed:true,text:"Search again didn\u2019t finish \u2014 "+out.trouble.split("[")[0].trim()});
    } else if(out.ok){
      await commit(landOnCard(cloudLatest.current.rows,id,row,out.row));
      if(out.trouble&&out.troubleLang)setError("Found the catalogue for \u201c"+row.title+"\u201d, but the language check "
        +"stopped part-way, so the title may be the shop\u2019s translation and an English edition may be missed. "
        +out.trouble.split("[")[0].trim());
      else if(out.trouble)setError("Found the catalogue for \u201c"+row.title+"\u201d, but the search "
        +"stopped part-way, so the ISBN or the publisher\u2019s page may be missing when they "
        +"exist. "+out.trouble.split("[")[0].trim()+" Press \u201cSearch again\u201d.");
    } else {
      // On the card, not in a banner (her decision): Re-check's line word for word,
      // "Re-check" swapped for "Search" or "Search again".
      const why=String(out.detail||"").split("\n").pop().split("[")[0].trim();
      setRecheckSaid({id,failed:true,text:(row.looked?"Search again":"Search")+" didn\u2019t run \u2014 "+why});
    }
    setBusy(false);setBusyId(null);setLookLabel(null);
  }

  // "Re-check museum shop" (her design; see "A BOOK LEAVING THE SHOP" above): its answer
  // is printed on the card, under the button she pressed.
  async function recheckShop(id){
    if(roStop())return;
    setBusy(true);setBusyId(id);setRechecking(true);setError(null);setRecheckSaid(null);
    const found=rows.find(r=>r.id===id);
    const tape=tapeStart("Re-check museum shop",found);
    const out=await recheckShopRow(found,lookHooks);
    saveLookupTape(tape,out);
    setDebug(out.detail||null);
    if(out.ok&&out.row&&out.row!==found)await commit(landOnCard(cloudLatest.current.rows,id,found,out.row));
    setRecheckSaid({id,text:out.said,failed:!out.ok});
    setBusy(false);setBusyId(null);setRechecking(false);setLookLabel(null);
  }

  const dismiss=id=>{commit(rows.map(r=>r.id===id?{...r,interested:false}:r));if(undoTimer.current)clearTimeout(undoTimer.current);setUndo({id});undoTimer.current=setTimeout(()=>setUndo(null),10000);};
  const undoDismiss=()=>{if(!undo)return;commit(rows.map(r=>r.id===undo.id?{...r,interested:true}:r));setUndo(null);if(undoTimer.current)clearTimeout(undoTimer.current);};
  const restore=id=>commit(rows.map(r=>r.id===id?{...r,interested:true}:r));
  const toggleWatch=id=>commit(rows.map(r=>r.id===id?{...r,watching:!r.watching}:r));
  // Leaving Yes clears the buy-next dot and its place in her order: it marks a wanted book only.
  const setAcq=(id,v)=>commit(rows.map(r=>{if(r.id!==id)return r;const a=r.acquiring===v?null:v,bn=a==="yes"&&!!r.buyNext;return{...r,acquiring:a,buyNext:bn,buyRank:bn?(r.buyRank??null):null};}));
  // A newly marked card goes to the top of her Buy next order (highest buyRank first).
  const toggleBuyNext=id=>{const top=rows.reduce((m,r)=>r.buyNext&&Number.isFinite(r.buyRank)?Math.max(m,r.buyRank):m,0);
    commit(rows.map(r=>r.id===id?{...r,buyNext:!r.buyNext,buyRank:r.buyNext?null:top+1}:r));};
  // A drop in the Buy next view: the card lands before the shown card it was dropped above
  // (else after the one below it), across every Buy next card, hidden ones included, then
  // all are renumbered. Not an edit: editedAt is untouched (her decision).
  const moveBuyNext=(id,beforeId,afterId)=>{
    const shown=new Map(view.map((r,i)=>[r.id,i])),key=r=>Number.isFinite(r.buyRank)?r.buyRank:-Infinity;
    const all=rows.filter(isBuyNext).sort((a,b)=>key(b)-key(a)||(shown.get(a.id)??1e9)-(shown.get(b.id)??1e9)).map(r=>r.id);
    const order=all.filter(x=>x!==id);let at=beforeId?order.indexOf(beforeId):afterId?order.indexOf(afterId)+1:-1;if(at<0)at=order.length;
    order.splice(at,0,id);const rank=new Map(order.map((x,i)=>[x,order.length-i]));
    commit(rows.map(r=>rank.has(r.id)?{...r,buyRank:rank.get(r.id)}:r));};
  // ── DRAG TO REORDER, BUY NEXT ONLY ──
  // Touch: hold a card ~0.45s (a buzz where the phone allows), then drag; a swipe before
  // that scrolls. Mouse: press and move. Buttons, links and version picks keep their taps.
  const dragGesture=useRef(null);
  const dragActs=useRef(null);
  dragActs.current={moveBuyNext};
  const startDrag=(e,id)=>{
    if(dragGesture.current||(e.button!==undefined&&e.button>0))return;
    if(e.target.closest&&e.target.closest("button,a,input,select,textarea,label,[role]"))return;
    const touch=e.type==="touchstart";
    if(touch&&e.touches.length!==1)return;
    const p0=touch?e.touches[0]:e;
    const g={lifted:false,x:p0.clientX,y:p0.clientY,lastY:p0.clientY,scroll0:window.scrollY,raf:0,timer:0};
    dragGesture.current=g;
    const place=()=>{
      const dy=g.lastY+window.scrollY-(g.y+g.scroll0),r=g.rects[g.from],centre=r.top+r.h/2+dy;
      g.to=g.rects.filter((q,i)=>i!==g.from&&q.top+q.h/2<centre).length;
      setDrag(d=>d&&{...d,dy,to:g.to});
    };
    const tick=()=>{ // near the screen's top or bottom edge, the page scrolls with her
      const E=70,H=window.innerHeight,v=g.lastY<E?-(E-g.lastY)/4:g.lastY>H-E?(g.lastY-(H-E))/4:0;
      if(v){window.scrollBy(0,v);place();}
      g.raf=requestAnimationFrame(tick);
    };
    const lift=()=>{
      const els=[...document.querySelectorAll("[data-buynext]")];
      g.ids=els.map(el=>el.getAttribute("data-buynext"));g.from=g.ids.indexOf(id);
      if(g.from<0)return end();
      g.rects=els.map(el=>{const b=el.getBoundingClientRect();return{top:b.top+window.scrollY,h:b.height};});
      g.lifted=true;g.to=g.from;
      if(touch){try{navigator.vibrate&&navigator.vibrate(25);}catch(_){}}
      setDrag({id,from:g.from,to:g.from,dy:0,h:g.rects[g.from].h});
      if(typeof requestAnimationFrame!=="undefined")g.raf=requestAnimationFrame(tick);
    };
    const move=ev=>{
      const p=ev.touches?ev.touches[0]:ev;if(!p)return;
      if(!g.lifted){
        const far=Math.hypot(p.clientX-g.x,p.clientY-g.y)>(touch?10:5);
        if(!far)return;
        if(touch)return end();
        lift();if(!g.lifted)return;
      }
      if(ev.cancelable)ev.preventDefault();
      g.lastY=p.clientY;place();
    };
    const up=()=>{
      if(g.lifted){
        const rest=g.ids.filter(x=>x!==id);
        dragActs.current.moveBuyNext(id,rest[g.to]||null,g.to>0?rest[g.to-1]:null);
        // The release is not a click on whatever sits under it.
        const eat=ev=>{ev.stopPropagation();ev.preventDefault();};
        window.addEventListener("click",eat,true);setTimeout(()=>window.removeEventListener("click",eat,true),0);
      }
      end();
    };
    const end=()=>{
      clearTimeout(g.timer);if(g.raf)cancelAnimationFrame(g.raf);
      document.removeEventListener(touch?"touchmove":"mousemove",move);
      document.removeEventListener(touch?"touchend":"mouseup",up);
      document.removeEventListener("touchcancel",end);
      dragGesture.current=null;setDrag(null);
    };
    document.addEventListener(touch?"touchmove":"mousemove",move);
    document.addEventListener(touch?"touchend":"mouseup",up);
    if(touch){document.addEventListener("touchcancel",end);g.timer=setTimeout(lift,450);}
  };
  // Once a card is lifted, a finger's move drags it and does not scroll the page. Chrome
  // lets a move be held back only by a listener in place before the touch begins.
  useEffect(()=>{
    if(!dragOn)return;
    const hold=ev=>{if(dragGesture.current&&dragGesture.current.lifted&&ev.cancelable)ev.preventDefault();};
    document.addEventListener("touchmove",hold,{passive:false});
    return()=>document.removeEventListener("touchmove",hold,{passive:false});
  },[dragOn]);
  // Her pick on a card with several versions (pickRow): the card's book follows it.
  const setPick=(id,i)=>{ const r=rows.find(x=>x.id===id); const next=r&&pickRow(r,i,new Date().toISOString()); if(next&&next!==r)commit(rows.map(x=>x.id===id?next:x)); };
  // A card's buttons, by name. One function for the life of the page (so LedgerCard can skip
  // redrawing) that calls this render's handler, which sees the current ledger.
  const cardActs=useRef(null);
  // Her digital catalogue link: an empty box leaves the card as it was; not a link → the box stays open.
  const setDigital=(id,text)=>{ if(!String(text||"").trim()){ setDigitalBox(null); return; }
    const href=typedLink(text); if(!href)return; setDigitalBox(null);
    const r=rows.find(x=>x.id===id); if(r&&r.digitalUrl!==href)commit(rows.map(x=>x.id===id?{...x,digitalUrl:href,editedAt:new Date().toISOString()}:x)); };
  cardActs.current={restore,toggleWatch,dismiss,setAcq,toggleBuyNext,setPick,findOneCat,recheckShop,relabel,keepPeriod,setDigital,
    openDigital:id=>setDigitalBox(id),closeDigital:()=>setDigitalBox(null),
    toggleOpen:id=>setOpenCards(o=>({...o,[id]:!o[id]}))};
  const cardAct=useCallback((name,...a)=>cardActs.current[name](...a),[]);

  // AN IMPORT CHECKS THE CLOUD COPY FIRST (guardCloudBeforeReplace), then
  // replaces the screen and arms saving. If the cloud copy differed and could
  // not be kept as a snapshot, the import stops there and says so.
  function handleImport(e){const file=e.target.files[0];if(!file)return;if(roStop()){e.target.value="";return;}const reader=new FileReader();reader.onload=async()=>{let d;try{d=JSON.parse(reader.result);}catch{setError("Could not read that file \u2014 it may not be a valid ledger backup.");return;}if(!(d&&Array.isArray(d.rows))){setError("That file didn't contain a ledger (no entries found).");return;}const next=d.rows.map(r=>({...r,watching:r.watching||false})),ign=Array.isArray(d.ignored)?d.ignored:[];let said=false;try{said=await guardCloudBeforeReplace({rows:next,ignored:ign},"import");}catch{return;}loadLedger(next,d.lastRun||null,said?null:"Loaded "+d.rows.length+" exhibitions from your file \u2014 no edits yet.",{ignored:ign});cloudArmed.current=true;setDebug("Loaded "+d.rows.length+" exhibitions from your file. It matches your file, so it's not counted as unsaved until you change something.");};reader.readAsText(file);e.target.value="";}

  // Confirm-before-replace: Import and Reset can wipe the screen in one tap, so
  // they ask first WHENEVER there is unsaved work showing.
  const openFilePicker=()=>fileRef.current?.click();
  function requestImport(){
    if(rows.length>0&&dirty&&cloudNotSaving){setConfirmBox({text:"Loading replaces everything on screen. The cloud copy is NOT saving, so your changes since your last Save are on screen only and will be lost. Continue?",act:openFilePicker});}
    else openFilePicker();
  }
  const doReset=async()=>{if(roStop())return;const seed=buildSeed();try{await guardCloudBeforeReplace({rows:seed,ignored},"reset");}catch{return;}cloudArmed.current=true;loadLedger(seed,null,"Starter set loaded ("+seed.length+" exhibitions) \u2014 not saved to a file.");setDebug("Reset: loaded the built-in starter set ("+seed.length+" exhibitions). It isn't in any file \u2014 Save if you want one.");};
  // Reset to Seed always asks while a ledger is on screen (her decision).
  function requestReset(){
    if(rows.length>0&&dirty&&cloudNotSaving){setConfirmBox({text:"This loads the built-in starter set and replaces everything on screen. The cloud copy is NOT saving, so your changes since your last Save are on screen only and will be lost. Continue?",act:doReset});}
    else if(rows.length>0){setConfirmBox({text:"This loads the seed set and replaces everything on screen. Continue?",act:doReset});}
    else doReset();
  }

  // Save (her design; docs/app.md §2): the offline file AND, when ticked, the same file in
  // Cloud Saves — same name and content. The cloud copy is written while the file question
  // is open, so a cancelled file cannot take it with it. Each half reports itself; a plain browser download never
  // clears the unsaved state. Never a click-triggered "Saved" tick.
  // SAVE ASKS BEFORE IT SHRINKS THE LEDGER: fewer exhibitions on screen than the
  // cloud copy or the newest Cloud Save holds (her ledger lost to an import onto an
  // empty page; docs/app.md §9). A store that cannot be read never blocks a Save.
  async function handleSave(){
    if(saveBusy||!rows.length)return;
    let most=0;
    if(!cloudReadOnly){ const db=await useCap("db");
      // The live record alone carries the count; its parts (the whole ledger) are not read.
      if(db){ try{ const ls=await db.doc(CLOUD_LIVE_DOC).get(); const live=ls.exists?ls.data():null; const snap=(await cloudListSnapshots(db,1))[0];
        most=Math.max(live?live.rows||0:0,snap?snap.rows||0:0); }catch{} } }
    if(rows.length<most){ setConfirmBox({title:"Save a smaller ledger?",text:"You\u2019re saving "+rows.length+" exhibition"+(rows.length===1?"":"s")+"; your last cloud save has "+most+". Save anyway?",yes:"Save anyway",act:saveNow}); return; }
    saveNow();
  }
  async function saveNow(){
    if(saveBusy||!rows.length)return;
    const at=new Date().toISOString();
    const label=saveLabel.trim().slice(0,80);
    const slug=labelSlug(label);
    const filename=LEDGER_PREFIX+localStamp(at)+(slug?"-"+slug:"")+".json";
    let data;
    try{
      data=JSON.stringify({rows,ignored,lastRun,exportedAt:at,exportedLocal:localReadable(at),...(label?{label}:{})},null,2);
    }catch(e){ setSaveNote({ok:false,text:"NOT SAVED \u2014 the file couldn\u2019t be built: "+String(e?.message||e)}); return; }
    setSaveBusy(true);
    try{
      // cloud: null = not asked for; true = kept; a string = why not. Started, not
      // awaited: the file question opens while the copy is written (her decision).
      const cloudDone=(async()=>{
        if(!saveCloud||cloudReadOnly)return null;
        const db=await useCap("db");
        if(!db)return "this viewer can\u2019t reach the page\u2019s store";
        try{
          await cloudTakeSnapshot(db,data,{label,kind:"manual",rows:rows.length,quarantined:ignored.length,filename,at});
          if(showSnaps)loadSnaps();
          return true;
        }catch(e){ return cloudTrouble(e,"save"); }
      })();
      // file: "saved" (the viewer confirmed), "browser" (started, cannot be
      // confirmed), or a string saying why it was not saved.
      // Both routes live in offerFile, shared with Cloud Saves' Download.
      let file;
      try{ file=(await offerFile(filename,data))==="runtime"?"saved":"browser"; }
      catch(e){
        file=e&&e.route==="browser"?"the download couldn\u2019t start"
          :e&&e.code==="declined"?"cancelled"
          :"refused ("+String(e?.code||e?.message||e)+")";
        setDebug("Save: the file was not saved \u2014 "+String(e?.code||"")+" "+String(e?.message||e));
      }
      const cloud=await cloudDone;
      const cloudBit=cloud===true?null:cloud===null?"":"Cloud copy NOT kept \u2014 "+cloud+".";
      let text,ok;
      if(file==="saved"){
        ok=cloud!==null&&cloud!==true?false:true;
        text=cloud===true?"Local file saved. Extra copy also sent to the cloud."
          :cloud===null?"Local file saved."
          :"Local file saved. "+cloudBit;
      }else if(file==="browser"){
        ok=false;
        text=(cloud===true?"Extra copy sent to the cloud. ":cloud===null?"":cloudBit+" ")
          +"A download of the local file was started \u2014 this viewer can\u2019t confirm it arrived; check your downloads folder.";
      }else{
        ok=false;
        text=cloud===true?"Cloud copy kept. Local file not saved - "+file+"."
          :cloud===null?"Local file not saved - "+file+"."
          :"NOTHING SAVED \u2014 local file not saved - "+file+". "+cloudBit;
      }
      setSaveNote({ok,text,file:filename});
      if(file==="saved"){
        setError(null); setDirty(false); setUnconfirmedSave(null);
        setShowSave(false); setSaveLabel(""); setSaveCloud(true);
        // THE IMPORT REMINDER ASKS FOR BOTH, her wording — it goes only when both happened.
        if(cloud===true)setRefreshDone(null);
      }
      setDebug("Save "+filename+" ("+localReadable(at)+"): file "+(file==="saved"?"confirmed by the viewer":file)+"; cloud "+(cloud===true?"kept":cloud===null?"not asked for":cloud)+".");
    }finally{ setSaveBusy(false); }
  }

  // One artist, one group: worked out from every labelled show, dismissed ones included.
  const byArtist=useMemo(()=>artistPeriods(rows),[rows]);
  const view=useMemo(()=>{
    const sq=foldText(search).trim();
    // Each row's tier, worked out once: the sort below asks for it thousands of times.
    const tiers=new Map();
    const tierOf=r=>{let t=tiers.get(r);if(t===undefined){t=tierFor(r);tiers.set(r,t);}return t;};
    const newestRun=labelledF?rows.reduce((m,r)=>r.labelledAt&&r.labelledAt>m?r.labelledAt:m,""):"";
    let out=rows.filter(r=>{
      // The search narrows; it does not end the check, so every other filter applies. Accents
      // count as plain letters both ways ("Bocklin" finds Böcklin; her ask).
      if(sq&&![r.title,r.summary,MU[r.museumId]?.name].some(t=>foldText(t).includes(sq)))return false;
      // Dismissed narrows too. A search still finds a dismissed show unless Dismissed
      // is on.
      if(dismissedOnly){ if(r.interested)return false; }
      else if(!r.interested&&!showAll&&!sq)return false;
      if(themeF.size>0&&!themeMatch(r,themeF))return false;
      if(venueF.size>0&&!venueF.has(chipKey(r.museumId))&&!(hasNoChip(r.museumId)&&venueF.has("occ:"+occRegion(r.museumId))))return false;
      const t=tierOf(r),ts=TIERS[t]?.time||"current";
      if(timeF.size>0){let match=timeF.has(ts);if(timeF.has("recent")&&t==="recent")match=true;if(timeF.has("current")&&t==="recent")match=true;if(!match)return false;}
      if(watchedF&&!r.watching)return false;
      // Recently labelled: the shows of the newest Label run or import; a Relabel keeps its show in its run.
      if(labelledF&&(!newestRun||r.labelledAt!==newestRun))return false;
      // Period shows only labelled shows.
      if(periodView&&!periodLabelled(r))return false;
      // Acquiring filters stack as AND across the axes, OR within an axis. Owned beside Wanted or Buy next shows
      // both lists, as two venues do (her decision); Buy next is the part of Wanted she has put in her order.
      if(acqWanted||acqOwned||acqBuyNext){if(!((acqOwned&&r.acquiring==="acquired")||(acqWanted&&r.acquiring==="yes"&&(!acqBuyNext||isBuyNext(r)))||(acqBuyNext&&!acqWanted&&isBuyNext(r))))return false;}
      if(acq3mo||acq6mo){if(!((acq3mo&&t==="closing")||(acq6mo&&(t==="urgent"||t==="lapsed"))))return false;}
      // Has, No and Digital catalogue widen one another: a card shows when it matches any one chosen.
      if(acqHasCat||acqNoCat||acqDigital){if(!((acqHasCat&&r.looked&&r.hasCatalogue==="yes")||(acqNoCat&&r.looked&&r.hasCatalogue==="no")||(acqDigital&&r.digitalUrl)))return false;}
      return true;
    });
    out.sort((a,b)=>{
      // Buy next is in her own dragged order; the sort chips and the pinned group step aside.
      // Buy next alone is in her own dragged order; with Owned the list sorts like any other.
      if(bnOnly&&bnPeriod)return(dateReversed?-1:1)*periodCompare(a,b,byArtist);
      const sb=bnOnly&&bnDate?"date":sortBy;   // Buy next by date sorts like the Date chip
      if(bnOnly&&!bnDate){const ka=Number.isFinite(a.buyRank)?a.buyRank:-Infinity,kb=Number.isFinite(b.buyRank)?b.buyRank:-Infinity;if(ka!==kb)return kb>ka?1:-1;}
      if(pinTouched&&!bnOnly){const aT=refreshTouched.includes(a.id)?0:1,bT=refreshTouched.includes(b.id)?0:1;if(aT!==bT)return aT-bT;}
      if(sb==="added"){const d=String(b.addedAt||"").localeCompare(String(a.addedAt||""));if(d!==0)return d;}
      if(sb==="labelled"){const d=String(lastLabel(b)).localeCompare(String(lastLabel(a)));if(d!==0)return d;const aL=periodLabelled(a)?1:0,bL=periodLabelled(b)?1:0;if(aL!==bL)return bL-aL;}
      if(sb==="edited"){const d=String(b.editedAt||"").localeCompare(String(a.editedAt||""));if(d!==0)return d;if(!a.editedAt&&!b.editedAt){const aH=a.addedAt?1:0,bH=b.addedAt?1:0;if(aH!==bH)return bH-aH;}}
      if(sb==="venue"){const d=venueRank(a.museumId)-venueRank(b.museumId);if(d!==0)return d;}
      // A second tap on Date or Period turns this whole order upside down, Wanted view included.
      const flip=(sb==="date"||sb==="period")&&dateReversed?-1:1;
      if(sb==="period")return flip*periodCompare(a,b,byArtist);
      const ta=tierOf(a),tb=tierOf(b);
      if(acqWanted&&(ta==="upcoming")!==(tb==="upcoming"))return flip*(ta==="upcoming"?1:-1); // Wanted view: Announced drops to the bottom (nothing to buy yet)
      const oa=TIERS[ta]?.ord??9,ob=TIERS[tb]?.ord??9;
      if(oa!==ob)return flip*(oa-ob);
      const da=a.startDate||a.endDate||"",db=b.startDate||b.endDate||"";
      if(ta==="upcoming")return flip*da.localeCompare(db);
      return flip*db.localeCompare(da);
    });
    return out;
  },[rows,byArtist,sortBy,venueF,themeF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqHasCat,acqNoCat,acqDigital,acqBuyNext,bnPeriod,bnDate,periodView,showAll,dismissedOnly,watchedF,labelledF,search,pinTouched,refreshTouched,dateReversed]);

  // DRAWN AS SHE SCROLLS: the first DRAW_STEP cards, then DRAW_STEP more each time the end
  // of the drawn list nears the screen. A new filter, sort or search starts again from the
  // top (viewToken). Jump to bottom draws the rest first. No IntersectionObserver → all.
  const viewToken=useMemo(()=>({}),[sortBy,venueF,themeF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqHasCat,acqNoCat,acqDigital,acqBuyNext,bnPeriod,bnDate,showAll,dismissedOnly,watchedF,labelledF,search,pinTouched,dateReversed]);
  const[drawn,setDrawn]=useState({token:null,n:DRAW_STEP});
  const drawLimit=typeof IntersectionObserver==="undefined"?Infinity:drawn.token===viewToken?drawn.n:DRAW_STEP;
  const moreRef=useRef(null);
  const wantBottom=useRef(false);
  useEffect(()=>{
    const el=moreRef.current;
    if(!el)return;
    const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting))setDrawn({token:viewToken,n:drawLimit+DRAW_STEP}); },{rootMargin:"1500px 0px"});
    io.observe(el);
    return()=>io.disconnect();
  },[viewToken,drawLimit,view.length]);
  useEffect(()=>{ if(wantBottom.current){ wantBottom.current=false; window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"}); } });
  // The scrubber's periods: the view's groups in order, each with its first card's place.
  const scrubGroups=useMemo(()=>{
    if(!periodView)return [];
    const out=[];
    view.forEach((r,i)=>{const k=periodOf(r,byArtist); if(!out.length||out[out.length-1].key!==k)out.push({key:k,name:PERIOD_NAME[k],at:i});});
    return out;
  },[view,periodView,byArtist]);
  const wantPeriod=useRef(null);
  const scrollToPeriod=k=>{
    const el=document.querySelector("[data-period=\""+k+"\"]");
    if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-8,behavior:"auto"});
  };
  useEffect(()=>{ if(wantPeriod.current){ const k=wantPeriod.current; wantPeriod.current=null; scrollToPeriod(k); } });
  const jumpToPeriod=useCallback(k=>{
    const x=scrubGroups.find(g=>g.key===k); if(!x)return;
    if(x.at>=drawLimit){ wantPeriod.current=k; setDrawn({token:viewToken,n:x.at+DRAW_STEP}); }
    else scrollToPeriod(k);
  },[scrubGroups,drawLimit,viewToken]);
  const jumpToBottom=()=>{
    if(view.length>drawLimit){ wantBottom.current=true; setDrawn({token:viewToken,n:Infinity}); }
    else window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"});
  };

  const counts=useMemo(()=>{const c={total:rows.length,dismissed:0,watched:0,wanted:0,owned:0,pressing:0};for(const r of rows){if(!r.interested){c.dismissed++;continue;}if(r.watching)c.watched++;if(r.acquiring==="yes")c.wanted++;if(r.acquiring==="acquired")c.owned++;if(inClosingWindow(r))c.pressing++;}return c;},[rows]);

  const C=PALETTES[theme];
  // TH, chip, pBtn and lnk keep their identity between renders, so LedgerCard can skip redrawing.
  const TH=useMemo(()=>tiersFor(theme),[theme]);          // the tier colours for THIS theme
  const chip=useCallback(on=>({padding:"4px 10px",borderRadius:999,border:"1px solid "+(on?C.ink:C.rule),background:on?C.ink:"transparent",color:on?C.onAction:C.soft,fontSize:11,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"}),[C]);
  const sBtn={padding:"5px 12px",borderRadius:4,border:"1px solid "+C.rule,background:"transparent",color:C.soft,fontSize:11,fontWeight:500,cursor:"pointer"};
  const pBtn=useMemo(()=>({...sBtn,background:C.action,color:C.onAction,border:"none",opacity:busy?0.5:1,cursor:busy?"wait":"pointer"}),[C,busy]);
  const lnk=useMemo(()=>linkButton(C),[C]);

  // ---- Approval-stage render helpers ----
  const decBtn=(active,color)=>({padding:"3px 9px",borderRadius:4,border:"1px solid "+(active?color:C.rule),background:active?color:"transparent",color:active?C.onAction:C.soft,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"});
  const isUndecided=(p,i)=>isUndecidedCard(p,decisions[i]);

  const renderProposalCard=(p,i)=>{
    const dec=decisions[i]||{};
    const infoRow=(label,val)=><div style={{marginBottom:2,overflowWrap:"anywhere"}}><b style={{color:C.ink}}>{label}:</b> {val&&String(val).trim()?val:<span style={{color:C.muted}}>{"\u2014"}</span>}</div>;
    return(
      <div key={i} id={"prop-"+i} style={{border:"1px solid "+C.rule,borderRadius:6,background:C.card,padding:"10px 12px",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:600,color:C.ink,marginBottom:4}}>{p.title}</div>


        {p.type==="add"&&<div style={{fontSize:11.5,color:C.ink,lineHeight:1.5}}>
          <div style={{fontWeight:700,marginBottom:3}}>{"New show \u2014 not in your ledger yet."}</div>
          {infoRow("Dates",dateRange(p.cand))}
          {infoRow("Description",p.cand.summary)}
          {infoRow("Link",p.cand.exUrl&&<a href={p.cand.exUrl} target="_blank" rel="noopener noreferrer" style={{color:C.ink}}>{p.cand.exUrl}</a>)}
          {infoRow("Period",periodText(p.cand))}
        </div>}

        {(p.type==="fill"||p.type==="change")&&<div style={{fontSize:11.5,color:C.ink}}>
          <div style={{fontWeight:700,marginBottom:5}}>{"Existing entry \u2014 decide each change:"}</div>
          {dec.mode==="addnew"
            ? <div style={{fontStyle:"italic",color:C.action}}>Will be added as a separate new entry instead of changing the existing one.</div>
            : p.upd.map((u,j)=>{const fd=(dec.fields||{})[j];return(
                <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
                  <div style={{flex:1,minWidth:0,lineHeight:1.4,overflowWrap:"anywhere"}}><b style={{color:C.ink}}>{u.label}:</b> <span style={{color:C.soft}}>{u.kind==="fill"?("add \u201c"+u.newVal+"\u201d"):("\u201c"+u.oldVal+"\u201d \u2192 \u201c"+u.newVal+"\u201d")}</span></div>
                  <button onClick={()=>setFieldDec(i,j,"accept")} style={decBtn(fd==="accept",C.okEdge)}>{fd==="accept"?"\u2713 ":""}Accept edit</button>
                  <button onClick={()=>setFieldDec(i,j,"reject")} style={decBtn(fd==="reject",C.rejectInk)}>Reject</button>
                </div>
              );})}
        </div>}

        {/* The file disagreed with itself: both values shown, the fuller one ticked as
            a starting point, one tap switches (her decision). */}
        {p.choices&&p.choices.length>0&&<div style={{marginTop:7,paddingTop:6,borderTop:"1px dotted "+C.rule}}>
          <div style={{fontSize:10.5,color:C.soft,lineHeight:1.5,marginBottom:5}}>The sweep file gave two different answers here. The longer one is picked for you {"\u2014"} change it if it{"\u2019"}s wrong.</div>
          {p.choices.map((ch,j)=>(
            <div key={j} style={{marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:C.ink,marginBottom:3}}>{ch.label}</div>
              {ch.options.map((opt,k)=>{
                const picked=(dec.choices||{})[ch.field];
                const chosen=(picked===undefined?ch.picked:picked)===opt;
                return(
                  <button key={k} onClick={()=>setChoice(i,ch.field,opt)}
                    style={{...decBtn(chosen,C.okEdge),display:"block",width:"100%",textAlign:"left",marginBottom:3,whiteSpace:"normal",lineHeight:1.4}}>
                    {chosen?"\u2713 ":"\u00a0\u00a0"}{opt&&String(opt).trim()?opt:"(blank)"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>}

        {p.notes&&p.notes.length>0&&<div style={{marginTop:6,fontSize:10.5,color:C.soft,lineHeight:1.5,borderTop:"1px dotted "+C.rule,paddingTop:5}}>{p.notes.map((n,j)=><div key={j}>{"\u00b7 "}{n}</div>)}</div>}

        {/* Three outcomes: Reject remembers nothing (the row returns next sweep). Never
            add is for rows that should not be entries at all (a talk, an unfoldable
            duplicate, a dead link) — not for a show she is not interested in, which is
            accepted and then dismissed. */}
        {p.type==="add"&&<div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setCardMode(i,"accept")} style={decBtn(dec.mode==="accept",C.okEdge)}>{dec.mode==="accept"?"\u2713 ":""}Add new entry</button>
          <button onClick={()=>setCardMode(i,"reject")} style={decBtn(dec.mode==="reject",C.rejectInk)}>{dec.mode==="reject"?"\u2713 ":""}Reject</button>
          <button onClick={()=>setCardMode(i,"never")} style={decBtn(dec.mode==="never",C.neverInk)}>{dec.mode==="never"?"\u2713 ":""}{"Never add this"}</button>
        </div>}
        {p.type==="add"&&dec.mode==="never"&&<div style={{marginTop:5,fontSize:10.5,color:C.soft,lineHeight:1.45}}>
          {"Won\u2019t be offered again on future sweeps."}
        </div>}

        {p.type==="change"&&<div style={{marginTop:8}}>
          <button onClick={()=>setCardMode(i,"addnew")} style={decBtn(dec.mode==="addnew","#4A5A6B")}>{dec.mode==="addnew"?"\u2713 ":""}{"No \u2014 this is a different show, add as separate entry"}</button>
        </div>}

      </div>
    );
  };
  const{acceptedCount,undecidedCount,quarantinedCount,rejectedCount}=countDecisions(proposals,decisions);

  // The line under the buttons: what the last Save did, until the next change; otherwise
  // what was loaded. Whether work is safe is the cloud line's job.
  const hasLedger=rows.length>0;
  // The "not saved to a file" banner is unwired, not deleted (her decision): with the
  // cloud copy saving every change it would nag. If the trial fails, set true.
  const FILE_UNSAVED_WARNING=false;
  const showUnsavedBanner=FILE_UNSAVED_WARNING&&hasLedger&&dirty;
  // THE LOAD LINE — what was opened, until the first change.
  let savedText=null;
  // No line at all with no ledger open (her decision).
  if(!hasLedger){savedText=null;}
  // "Loaded N exhibitions" is not shown while the cloud check line speaks (her decision);
  // it still shows with no check line, and for Reset, roll-back and open-from-cloud.
  else if(!dirty&&!saveNote&&loadedInfo){savedText=loadedInfo;}

  if(!loaded)return(<div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.soft,minHeight:"100vh",display:"grid",placeItems:"center",fontSize:13}}>Opening the ledger{"\u2026"}</div>);

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.ink,minHeight:"100vh",padding:"20px 16px 60px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      <header style={{maxWidth:760,margin:"0 auto 14px"}}>
        <div style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:C.soft,marginBottom:4}}>Exhibition catalogues</div>
        <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:36,lineHeight:1,fontWeight:500,margin:0,letterSpacing:"-0.02em"}}>Before it goes<span style={{color:C.accent}}> out of print</span></h1>
        <div style={{marginTop:14,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          {/* Load and Import (her decision): Load opens a ledger file; Import brings in a
              sweep CSV as cards. */}
          <button onClick={requestImport} style={sBtn}>Load</button>
          <button onClick={()=>setShowSave(v=>!v)} disabled={!hasLedger} style={{...pBtn,opacity:hasLedger?1:0.4,cursor:hasLedger?"pointer":"not-allowed"}}>Save</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{display:"none"}}/>
          {/* Small and out of the way: it is a comfort control, not part of the
              work. Says what it will DO, not what is currently on. */}
          <button onClick={toggleTheme} title={theme==="dark"?"Switch to light":"Switch to dark"}
            style={{...sBtn,marginLeft:"auto",padding:"5px 9px"}}>{theme==="dark"?"\u2600 Light":"\u263D Dark"}</button>
          <button onClick={()=>{setLinkNote(null);setImportMode(hasLedger?"choose":"needLedger");}} style={sBtn}>Import</button>
          <input ref={refreshFileRef} type="file" accept=".csv,text/csv" onChange={handleRefreshFile} style={{display:"none"}}/>
        </div>
        {/* The Save panel (her design): the description names the offline file and its
            cloud twin; the tick starts on. */}
        {showSave&&hasLedger&&<div style={{marginTop:8,padding:"10px 12px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input value={saveLabel} onChange={e=>setSaveLabel(e.target.value)} maxLength={80} placeholder={"Description (optional) \u2014 e.g. after 30 lookups"}
              onKeyDown={e=>{if(e.key==="Enter")handleSave();}}
              style={{flex:"1 1 220px",minWidth:0,padding:"5px 8px",fontSize:12.5,border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontFamily:"inherit"}}/>
            <button onClick={handleSave} disabled={saveBusy} style={{...pBtn,opacity:saveBusy?0.4:1,cursor:saveBusy?"not-allowed":"pointer"}}>{saveBusy?"Saving\u2026":"Save now"}</button>
            <button onClick={()=>setShowSave(false)} style={sBtn}>Cancel</button>
          </div>
          <label style={{display:"flex",gap:6,alignItems:"center",marginTop:8,fontSize:12.5,color:C.ink,cursor:"pointer"}}>
            <input type="checkbox" checked={saveCloud} onChange={e=>setSaveCloud(e.target.checked)}/>
            {"Also save a copy to cloud"}
          </label>
          <div style={{marginTop:6,fontSize:11,color:C.soft,wordBreak:"break-all"}}>{"File name: "+LEDGER_PREFIX+localStamp()+(labelSlug(saveLabel)?"-"+labelSlug(saveLabel):"")+".json"}</div>
        </div>}
        {/* The status lines, in her order (docs/app.md §9): the cloud line first, always —
            green, or the red banner when saving has stopped; a line's space; what loading
            did; what saving did. */}
        {(saveState==="failed"||saveState==="off")?
          <div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
            <span style={{fontSize:17,lineHeight:1.1}}>{"☁"}</span>
            {/* When it last worked (her ask): how far back the cloud copy stands. */}
            <span>{"CLOUD COPY NOT SAVING — "+(saveErr||"reason unknown.")
              +(lastSaved&&lastSaved.savedAt?" Last cloud save: "+localReadable(lastSaved.savedAt)+" ("+relTime(lastSaved.savedAt)+")."
                :" Nothing has been saved to the cloud yet.")
              +(hasLedger?" Changes since then are on screen only \u2014 tap Save to keep them in a file.":"")}</span>
          </div>
        :<div style={{marginTop:6,fontSize:11,color:C.okEdge,fontWeight:600,display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
          <span>{"☁ "}{
            saveState==="saving"?"Saving to the cloud copy…"
            :lastSaved?("Last cloud save: "+localReadable(lastSaved.savedAt)+" ("+relTime(lastSaved.savedAt)+") · "+lastSaved.rows+" exhibitions")
            :cloudLive&&cloudLive.why?("Cloud copy: "+cloudLive.why)
            :cloudLive&&cloudLive.rec===null?"No cloud copy yet — it starts when you open your ledger."
            :"Checking the cloud copy…"
          }</span>
          {!hasLedger&&cloudLive&&cloudLive.rec&&<button onClick={requestOpenCloud} style={{background:"none",border:"none",color:C.action,fontSize:11,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0}}>Open it</button>}
        </div>}
        <div style={{marginTop:16}}>
          {savedText&&<div style={{fontSize:11,color:C.ink,lineHeight:1.45}}>{savedText}</div>}
          {/* Stays until she dismisses it or the next Load replaces it (her decision): a
              line that fades can vanish unread. */}
          {cloudCheck&&<div style={{marginTop:2,fontSize:11,color:C.ink,lineHeight:1.45,display:"flex",gap:8,alignItems:"baseline"}}>
            <span style={{flex:1}}>{cloudCheck}</span>
            <button onClick={()=>setCloudCheck(null)} title="Dismiss" aria-label="Dismiss" style={{background:"none",border:"none",color:C.soft,fontSize:14,lineHeight:1,cursor:"pointer",padding:0}}>{"\u00d7"}</button>
          </div>}
          {hasLedger&&saveNote&&<div style={{marginTop:6,fontSize:11,lineHeight:1.45}}>
            <span style={{color:saveNote.ok?C.okEdge:C.warnInk,fontWeight:saveNote.ok?600:700}}>{saveNote.text}</span>
            {saveNote.file&&<span style={{color:C.ink,fontWeight:400}}>{" ("+saveNote.file+")"}</span>}
          </div>}
        </div>
        {hasLedger&&refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:C.okBg,border:"2px solid #2D6B5A",borderRadius:5,fontSize:12.5,fontWeight:700,color:C.okInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          {/* The icon sits on the first line of text (her ask): centred, it drifted when
              the banner wrapped. */}
          <span style={{fontSize:17,lineHeight:"17.5px"}}>{"\u21BB"}</span>
          {/* Every card she looked at is accounted for in this sentence; the left-behind
              clause keeps the numbers adding up (the way back is on the partial-import
              confirm box). Two paragraphs, her wording: the instruction, then the counts. */}
          <span>
            <span style={{display:"block",marginBottom:"1.45em"}}>{"Import complete. Save it now."}</span>
            <span style={{display:"block"}}>{refreshDone.added+" added, "+refreshDone.filled+" filled in, "+refreshDone.changed+" updated"+(refreshDone.never?", "+refreshDone.never+" quarantined":"")+(refreshDone.left?", "+refreshDone.left+" left undecided":"")+"."}</span>
          </span>
        </div>}
        {hasLedger&&unconfirmedSave&&<div style={{marginTop:8,padding:"9px 12px",background:C.holdBg,border:"2px solid "+C.soft,borderRadius:5,fontSize:12.5,color:C.ink,lineHeight:1.45,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:16,lineHeight:1.1}}>{"\u2193"}</span>
          <span>{"A download of "+unconfirmedSave+" was started. This viewer can\u2019t tell us whether it arrived, so your ledger is still marked unsaved \u2014 check your downloads folder. If the file is there, you\u2019re safe."}</span>
        </div>}
        {showUnsavedBanner&&!refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid #B5791A",borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:17,lineHeight:1}}>{"\u26A0"}</span>
          <span>{"UNSAVED CHANGES \u2014 what's on screen is not saved to a file. Tap \u201cSave\u201d before you close this tab or your work is lost."}</span>
        </div>}
        {/* A quarantine that isn't saving is a banner, not a footnote (her decision),
            shown with or without a ledger open. */}
        {/* A part of the store that could not be read (the quarantine has its own banner). */}
        {storeUnread.filter(w=>w!==UNREAD_QUAR).length>0&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:17,lineHeight:1.1}}>{"\u26A0"}</span>
          <span>{"STORE NOT READ \u2014 "+storeUnread.filter(w=>w!==UNREAD_QUAR).join(", ")+" couldn\u2019t be read from store, refresh to re-check. Current incorrect information will not overwrite the store until the read corrects."}</span>
        </div>}
        {quarWhy&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:17,lineHeight:1.1}}>{"\u26A0"}</span>
          <span>{"QUARANTINE \u2014 "+quarWhy}</span>
        </div>}
        {busy&&prog.total>0&&!importMode&&<div style={{marginTop:8}}><div style={{height:3,background:C.rule,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(prog.done/prog.total*100)+"%",background:C.action,transition:"width .3s ease"}}/></div><div style={{fontSize:10,color:C.soft,marginTop:3}}>{prog.done}/{prog.total} · {prog.label}</div></div>}
        {labelSaid&&<div style={labelSaid.ok?{marginTop:8,fontSize:11.5,color:C.soft}:{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink}}>{labelSaid.text}</div>}
        {readOnly&&<div style={{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink,fontWeight:700}}>{RO_LINE}</div>}
        {error&&error!==RO_LINE&&<div style={{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink}}>{error}</div>}
        {debug&&<div style={{marginTop:4}}><button onClick={()=>setShowDebug(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{showDebug?"Hide diagnostic":"Show diagnostic"}</button>
          {/* Copy: an icon alone, bottom right of the tray (her ask). A tick only if the
              copy happened — a frame can refuse the clipboard — else a cross; back to
              the icon after two seconds. */}
          {showDebug&&<div style={{position:"relative",marginTop:4}}>
            <pre style={{margin:0,padding:"7px 28px 7px 7px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4,fontSize:9.5,whiteSpace:"pre-wrap",wordBreak:"break-word",color:C.soft,maxHeight:160,overflow:"auto"}}>{debug}</pre>
            <button aria-label={copySaid==="ok"?"Copied":copySaid==="no"?"Couldn\u2019t copy":"Copy"} title={copySaid==="ok"?"Copied":copySaid==="no"?"Couldn\u2019t copy":"Copy"}
              onClick={async()=>{const r=await copyText(debug)?"ok":"no";setCopySaid(r);setTimeout(()=>setCopySaid(v=>v===r?null:v),2000);}}
              style={{position:"absolute",right:5,bottom:5,background:"none",border:"none",color:C.soft,fontSize:13,lineHeight:1,cursor:"pointer",padding:2}}>{copySaid==="ok"?"\u2713":copySaid==="no"?"\u2717":"\u29c9"}</button>
          </div>}</div>}
        {/* Not gated on a ledger: when a sweep last ran is what the page knows. */}
        <div style={{marginTop:6,fontSize:10.5,color:C.soft,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          {/* "Unknown", never "never" (her decision): an empty store is not evidence
              that no sweep ran. */}
          <span>Last sweep: {lastSweep?fmtRefresh(lastSweep):"Unknown"}</span>
          {/* Per-venue freshness: collapsed by default, ALWAYS shown — a control that
              disappears when the log is empty cannot report anything. */}
          <button onClick={()=>setShowFresh(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{showFresh?"Hide details":"Details"}</button>
        </div>

        {/* Not gated on a ledger: the sweep log survives Reset. */}
        {showFresh&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* Tracked and Dismissed live here, at the top of Details (her decision). */}
          <div style={{display:"flex",gap:14,fontSize:10.5,color:C.soft,flexWrap:"wrap",marginBottom:8}}>
            <span><b style={{color:C.ink}}>{counts.total}</b> Tracked</span>
            {counts.dismissed>0&&<span><b>{counts.dismissed}</b> Dismissed</span>}
          </div>
          <div style={{fontSize:10,color:C.soft,marginBottom:6,lineHeight:1.5}}>
            {"When each venue was last swept, and when it last gave us exhibitions."}
          </div>
          {/* "NO SWEEPS YET" AND "COULDN'T READ THE STORE" LOOK IDENTICAL AND
              MEAN OPPOSITE THINGS, so an empty panel always says which. */}
          {freshWhy&&<div style={{fontSize:11,color:C.accent,marginBottom:6,lineHeight:1.5}}>{freshWhy}</div>}
          {/* An empty store says nothing about whether a sweep ran (her decision), so no
              "No sweep imported yet". Unlike freshWhy, here the store did answer. */}
          {!freshWhy&&Object.keys(venueSeen).length===0&&
            <div style={{fontSize:11,color:C.soft,marginBottom:6}}>{"The store holds no sweep dates, so when each venue was last swept is unknown."}</div>}
          {MUSEUMS.map(m=>{
            const v=venueSeen[m.id]; if(!v)return null;
            const stale=v.returned&&v.attempted&&v.returned!==v.attempted;
            return(
              <div key={m.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)",gap:8,fontSize:10.5,color:C.soft,padding:"3px 0",alignItems:"baseline"}}>
                <span style={{color:C.ink}}>{m.short}</span>
                <span>{momentLines("swept ",v.attempted)}</span>
                <span style={{color:v.returned?(stale?TH.urgent.ink:C.soft):TH.urgent.ink,fontWeight:stale||!v.returned?600:400}}>
                  {v.returned?momentLines("rows ",v.returned):"no rows \u2014 refused"}
                </span>
              </div>
            );
          })}
          {MUSEUMS.filter(m=>!venueSeen[m.id]).length>0&&
            <div style={{fontSize:10.5,color:C.soft,marginTop:6,paddingTop:5,borderTop:"1px solid "+C.rule}}>
              {"Not in any sweep yet: "+MUSEUMS.filter(m=>!venueSeen[m.id]).map(m=>m.short).join(", ")+"."}
            </div>}
        </div>}

        <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid "+C.rule,display:"flex",gap:14,fontSize:10.5,color:C.soft,flexWrap:"wrap",alignItems:"center"}}>
          <span><b style={{color:C.ink}}>{counts.watched}</b> Watched</span>
          <span><b style={{color:C.ink}}>{counts.wanted}</b> Wanted</span>
          <span><b style={{color:C.owned}}>{counts.owned}</b> Owned</span>
          <span><b style={{color:TH.urgent.ink}}>{counts.pressing}</b> Closing Window</span>
          <button onClick={()=>{if(showSearch)setSearch("");setShowSearch(v=>!v);setTimeout(()=>searchRef.current?.focus(),100);}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.soft,padding:0,lineHeight:1}} title="Search">{"\uD83D\uDD0D"}</button>
        </div>
        {/* The cross clears what she typed (her ask): right-aligned, shown while there is text. */}
        {showSearch&&<div style={{marginTop:6,position:"relative"}}><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",padding:"7px 30px 7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/>
          {search&&<button onClick={()=>{setSearch("");if(searchRef.current)searchRef.current.focus();}} aria-label="Clear search" title="Clear"
            style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.soft,fontSize:16,lineHeight:1,cursor:"pointer",padding:"2px 4px"}}>{"\u00d7"}</button>}</div>}
      </header>

      <div style={{maxWidth:760,margin:"0 auto 12px",display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Sort</span>
          {[["date","Date"],["venue","Venue"],["period","Period"],["added","Recently added"],["edited","Recently edited"],["labelled","Recently labelled"]].map(([k,l])=><button key={k} onClick={()=>pickSort(k)} style={chip(bnOnly?((k==="period"&&bnPeriod)||(k==="date"&&bnDate)):(sortBy===k&&!pinTouched))}>{l}{(bnOnly?(k==="period"&&bnPeriod)||(k==="date"&&bnDate):(k==="date"||k==="period")&&sortBy===k&&!pinTouched)?(dateReversed?" \u2191":" \u2193"):""}</button>)}
          {pinTouched&&<span style={{fontSize:10.5,color:C.action,fontWeight:600}}>{"\u2191 just-refreshed entries shown first"}</span>}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>When</span>
          {[["current","Current"],["past","Past"],["upcoming","Announced"],["recent","Recently opened"]].map(([k,l])=><button key={k} onClick={()=>toggleSet(setTimeF,k)} style={chip(timeF.has(k))}>{l}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Venue</span>
          {MUSEUMS.filter(m=>!m.underOcc).map(m=>m.id).concat(Object.keys(LINK_VENUES).filter(ownChip)).sort((a,b)=>orderOf(a)-orderOf(b)).filter((id,i,all)=>all.findIndex(x=>chipKey(x)===chipKey(id))===i).map(id=><button key={chipKey(id)} onClick={()=>toggleSet(setVenueF,chipKey(id))} style={chip(venueF.has(chipKey(id)))}>{(x=>x.chip||x.short)(MU[id]||LINK_VENUES[id])}</button>)}
          {OCC_CHIPS.map(([k,l])=><button key={k} onClick={()=>toggleSet(setVenueF,k)} style={chip(venueF.has(k))}>{l}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Theme</span>
          {THEME_CHIPS.map(([k,l])=><button key={k} onClick={()=>toggleSet(setThemeF,k)} style={chip(themeF.has(k))}>{l}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Acquiring?</span>
          <button onClick={()=>setAcqWanted(v=>!v)} style={chip(acqWanted)}>Wanted</button>
          <button onClick={()=>{setAcqOwned(v=>!v);if(acqBuyNext){setBnPeriod(false);setBnDate(false);setDateReversed(false);}}} style={chip(acqOwned)}>Owned</button>
          <button onClick={()=>{setAcqBuyNext(v=>!v);setBnPeriod(false);setBnDate(false);}} style={chip(acqBuyNext)}>Buy next</button>
          <button onClick={()=>setAcq3mo(v=>!v)} style={chip(acq3mo)}>3+ mos</button>
          <button onClick={()=>setAcq6mo(v=>!v)} style={chip(acq6mo)}>6+ mos closing window</button>
          <button onClick={()=>setAcqHasCat(v=>!v)} style={chip(acqHasCat)}>Has catalogue</button>
          <button onClick={()=>setAcqNoCat(v=>!v)} style={chip(acqNoCat)}>No catalogue</button>
          <button onClick={()=>setAcqDigital(v=>!v)} style={chip(acqDigital)}>Digital catalogue</button>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Showing</span>
          <button onClick={()=>setWatchedF(v=>!v)} style={chip(watchedF)}>Watched</button>
          <button onClick={()=>{setDismissedOnly(v=>!v);setShowAll(false);}} style={chip(dismissedOnly)}>Dismissed</button>
          <button onClick={()=>setLabelledF(v=>!v)} style={chip(labelledF)}>Recently labelled</button>
          <button onClick={()=>{setShowAll(v=>!v);setDismissedOnly(false);}} style={chip(showAll)}>Show all</button>
          <button onClick={clearFilters} style={{...chip(false),color:C.muted,borderColor:C.muted}}>Clear all</button>
        </div>
      </div>

      <div style={{maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
        {view.length===0&&<div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:5,padding:18,fontSize:12.5,color:C.soft}}>Nothing matches those filters.</div>}
        {(()=>{
          const pinnedCount=pinTouched&&!bnOnly?view.filter(x=>refreshTouched.includes(x.id)).length:0;
          // Band headers for the "recently" sorts (only when not in the post-import pinned snapshot).
          const bandMode=(!pinTouched&&!bnOnly&&(sortBy==="added"||sortBy==="edited"||sortBy==="labelled"))?sortBy:null;
          const newestAdd=bandMode==="added"?(view.find(x=>x.addedAt)?.addedAt||null):null;
          const newestEdit=bandMode==="edited"?(view.find(x=>x.editedAt)?.editedAt||null):null;
          const newestLabel=bandMode==="labelled"?(lastLabel(view.find(x=>lastLabel(x)))||null):null;
          const bandOf=(x)=>{
            if(bandMode==="added")return !x.addedAt?"seed":(x.addedAt===newestAdd?"add_this":"add_earlier");
            if(bandMode==="edited")return x.editedAt?(x.editedAt===newestEdit?"ed_this":"ed_earlier"):(x.addedAt?"ed_never":"seed");
            // A show labelled before this sort existed has no labelledAt: stage 1.
            if(bandMode==="labelled")return lastLabel(x)?(lastLabel(x)===newestLabel?"lab_this":"lab_earlier"):(periodLabelled(x)?"lab_stage1":"lab_never");
            return null;
          };
          const BAND_LABEL={add_this:"This import",add_earlier:"Earlier imports",seed:"Original set",ed_this:"This import's edits",ed_earlier:"Earlier edits",ed_never:"Never edited",lab_this:"This labelling",lab_earlier:"Earlier labellings",lab_stage1:"Stage 1",lab_never:"Not labelled"};
          const bandDivider=(txt,pk)=><div data-period={pk} style={{display:"flex",alignItems:"center",gap:8,margin:"2px 2px",color:C.soft}}><div style={{flex:1,height:1,background:C.rule}}/><span style={{fontSize:9.5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{txt}</span><div style={{flex:1,height:1,background:C.rule}}/></div>;
          return view.slice(0,drawLimit).map((r,i)=>{
          const brk=(pinTouched&&pinnedCount>0&&pinnedCount<view.length&&i===pinnedCount)?bandDivider("Rest of the list"):null;
          let header=null;
          if(periodView&&(i===0||periodOf(view[i-1],byArtist)!==periodOf(r,byArtist)))header=bandDivider(PERIOD_NAME[periodOf(r,byArtist)],periodOf(r,byArtist));
          if(bandMode){const b=bandOf(r);const pb=i>0?bandOf(view[i-1]):null;if(b!==pb)header=bandDivider(BAND_LABEL[b]||"");}
          const lead=brk||header;
          const isBusy=busyId===r.id;
          const card=<LedgerCard r={r} mu={MU[r.museumId]} isOpen={!!openCards[r.id]} isBusy={isBusy} busy={busy} rechecking={isBusy&&rechecking} lookLabel={isBusy?lookLabel:null}
              said={recheckSaid&&recheckSaid.id===r.id?recheckSaid:null} relabelling={relabelId===r.id} digitalOpen={digitalBox===r.id} C={C} TH={TH} chip={chip} pBtn={pBtn} lnk={lnk} act={cardAct}/>;
          if(!dragOn||!isBuyNext(r))return <React.Fragment key={r.id}>{lead}{card}</React.Fragment>;
          // The lifted card follows the finger; the cards it passes slide aside by its height.
          let ds={userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",cursor:"grab"};
          if(drag&&r.id===drag.id)ds={...ds,position:"relative",zIndex:5,transform:"translateY("+drag.dy+"px) scale(1.02)",boxShadow:"0 6px 18px rgba(0,0,0,0.28)",borderRadius:5,cursor:"grabbing"};
          else if(drag){const j=i<drag.from?i:i-1,f=j<drag.to?j:j+1;ds={...ds,transform:"translateY("+((f-i)*(drag.h+10))+"px)",transition:"transform 150ms ease"};}
          return <div key={r.id} data-buynext={r.id} onMouseDown={e=>startDrag(e,r.id)} onTouchStart={e=>startDrag(e,r.id)} onContextMenu={e=>e.preventDefault()} style={ds}>{card}</div>;
        });})()}
        {view.length>drawLimit&&<div ref={moreRef} style={{height:1}}/>}
      </div>
      {scrubGroups.length>0&&<PeriodScrubber groups={scrubGroups} C={C} onJump={jumpToPeriod}/>}
      {/* Top on the left, bottom on the right (her layout), shown once she has scrolled down. */}
      {showTop&&(<>
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="Return to top"
          style={{position:"fixed",bottom:undo?64:20,left:"50%",transform:"translateX(calc(-100% - 5px))",zIndex:998,width:38,height:38,borderRadius:"50%",background:C.card,border:"1px solid "+C.rule,color:C.ink,fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>{"\u2191"}</button>
        <button onClick={jumpToBottom} aria-label="Jump to bottom"
          style={{position:"fixed",bottom:undo?64:20,left:"50%",transform:"translateX(5px)",zIndex:998,width:38,height:38,borderRadius:"50%",background:C.card,border:"1px solid "+C.rule,color:C.ink,fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>{"\u2193"}</button>
      </>)}
      {undo&&(
        <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:C.ink,color:C.onAction,borderRadius:4,padding:"7px 14px",fontSize:12,display:"flex",gap:10,alignItems:"center",zIndex:999,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
          {/* "Undo", the same size as the word before it (her decision). A <button>
              does not inherit the page's font, so it is told to. */}
          <span style={{fontSize:14,lineHeight:"20px"}}>Dismissed</span>
          <button onClick={undoDismiss} style={{background:"none",border:"1px solid rgba(255,255,255,0.5)",borderRadius:3,color:C.onAction,fontFamily:"inherit",fontSize:14,lineHeight:"20px",fontWeight:600,cursor:"pointer",padding:"1px 8px",margin:0}}>Undo</button>
        </div>
      )}
      {/* Quarantine lives down here, right-aligned on the starter-set line (her decision). */}
      <div style={{maxWidth:760,margin:"18px auto 0",paddingTop:10,borderTop:"1px solid "+C.rule,fontSize:10,color:C.soft,lineHeight:1.6,display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
        {/* Two buttons on the left, no sentence (her decision), spaced like the drawers on the right. */}
        <span style={{display:"flex",gap:14}}>
          {/* Reset to Seed is unwired from her page (her decision), requestReset kept; drawn only for the tests. */}
          {typeof window!=="undefined"&&window.__catWatchTest&&<button onClick={requestReset} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Reset to Seed</button>}
          <button onClick={labelLedger} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Label</button>
          <button onClick={()=>{if(showResetCards)setResetQuery("");setShowResetCards(v=>!v);}} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear search</button>
        </span>
        <span style={{marginLeft:"auto",display:"flex",gap:14}}>
          {/* Cloud Saves sit beside Quarantine, in the same type, always drawn — a control
              that appears only with something to show can't say "none yet" (her decision). */}
          <button onClick={()=>{setShowSnaps(v=>!v); if(!showSnaps)loadSnaps();}} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{"Cloud Saves"}</button>
          {/* Quarantine's link is always drawn too (her catch): an empty one vanished. */}
          {<button onClick={()=>setShowIgnored(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{"Quarantine"}</button>}
        </span>
      </div>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {showSnaps&&<div style={{marginTop:6,padding:"10px 12px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* A list, like Quarantine (her design): copies come from Save and the two
              automatic safety copies. */}
          <div style={{fontSize:12,color:C.ink,marginBottom:8,lineHeight:1.55}}>
            {snaps&&snaps.length>0&&<b>{snaps.length+" cloud save"+(snaps.length===1?"":"s")+". "}</b>}
            {"From exports also saved to the cloud and safety snapshots (taken before a Load, Reset or roll-back to an earlier snapshot)."}
          </div>
          {snapWhy&&<div style={{fontSize:12,fontWeight:600,color:C.warnInk,background:C.warnBg,border:"1px solid "+C.warnEdge,borderRadius:4,padding:"5px 8px",marginBottom:8}}>{snapWhy}</div>}
          {snaps===null?<div style={{fontSize:12,color:C.soft}}>{"Reading cloud saves…"}</div>
          :snaps.length===0?<div style={{fontSize:12,color:C.soft}}>{"No cloud saves yet."}</div>
          :snaps.map(s=>(
            <div key={s.id} style={{display:"flex",gap:10,fontSize:12.5,color:C.ink,padding:"5px 0",alignItems:"baseline",borderTop:"1px dotted "+C.rule,flexWrap:"wrap"}}>
              {/* One width for every time (her ask): 15em fits the longest, with
                  even-width digits. */}
              <span style={{flex:"0 0 auto",minWidth:"15em",fontWeight:600,whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>{localReadable(s.at)}</span>
              {/* No "automatic" tag (her decision): her own copies are marked by her
                  description in bold. */}
              <span style={{flex:"1 1 160px"}}>{s.kind!=="safety"&&s.label?<>{"Export: \u201c"}<b>{s.label}</b>{"\u201d"}</>:snapTitle(s,snaps)}<span style={{color:C.soft}}>{" · "+s.rows+" exhibitions"}</span>{s.filename&&<span style={{display:"block",fontSize:11,color:C.soft,wordBreak:"break-all"}}>{s.filename}</span>}</span>
              <button onClick={()=>downloadSnapshot(s)} style={{background:"none",border:"none",color:C.action,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>Download</button>
              <button onClick={()=>requestRollback(s)} disabled={snapBusy} style={{background:"none",border:"none",color:C.accent,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>Roll back</button>
            </div>
          ))}
        </div>}
      </div>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {showIgnored&&ignored.length===0&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4,fontSize:12,color:C.soft}}>{quarWhy?"Quarantine can\u2019t be read: "+quarWhy:"Nothing in quarantine."}</div>}
        {/* Reset cards (her design): find a card by typing, pick it, confirm; its catalogue
            result is cleared (resetCard) and it shows "Find catalogue" again. Her marks
            stay. One card per confirm. */}
        {showResetCards&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          <input value={resetQuery} onChange={e=>setResetQuery(e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/>
          {resetQuery.trim()&&(()=>{
            const hits=cardsToReset(rows,resetQuery);
            if(!hits.length)return <div style={{fontSize:12,color:C.soft,marginTop:8}}>{"No searched cards match."}</div>;
            return hits.map(r=>(
              <div key={r.id} style={{display:"flex",gap:10,fontSize:12.5,color:C.ink,padding:"4px 0",alignItems:"baseline",marginTop:4}}>
                <span style={{minWidth:130,fontWeight:600}}>{MU[r.museumId]?MU[r.museumId].short:r.museumId}</span>
                <button onClick={()=>setConfirmBox({title:"Reset this search?",yes:"Yes",act:()=>{
                  commit(rows.map(x=>x.id===r.id?resetCard(x):x));
                  if(recheckSaid&&recheckSaid.id===r.id)setRecheckSaid(null);
                  setResetQuery("");}})} style={{flex:1,textAlign:"left",background:"none",border:"none",color:C.action,fontSize:12.5,fontFamily:"inherit",textDecoration:"underline",cursor:"pointer",padding:0}}>{r.title}</button>
              </div>));
          })()}
        </div>}
        {showIgnored&&ignored.length>0&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* Big enough to read (her decision): decisions she may need to undo, in body
              ink, at chip size or above. */}
          <div style={{fontSize:12,color:C.ink,marginBottom:8,lineHeight:1.55}}>
            {/* The count lives in here (her decision); the footer button just says Quarantine. */}
            <b>{ignored.length+" in quarantine. "}</b>{"Entries excluded from all future imports. Removing them from quarantine will re-offer them in future sweeps \u2014 it does not immediately add them to your ledger."}
          </div>
          {/* By venue only (her decision): venues in the app's order, titles A–Z. */}
          {ignoredByVenue.map(x=>(
            <div key={x.key} style={{display:"grid",gridTemplateColumns:"minmax(60px,0.7fr) minmax(0,2fr) auto",gap:10,fontSize:12.5,color:C.ink,padding:"4px 0",alignItems:"baseline"}}>
              <span style={{fontWeight:600}}>{MU[x.venueId]?MU[x.venueId].short:x.venueId}</span>
              <span>{x.title||"(no title)"}</span>
              <button onClick={()=>{
                if(roStop())return;
                const at=new Date().toISOString();
                setQuarantine(prev=>{ const next=mergeQuarantine(prev,{[x.key]:{venueId:x.venueId,title:x.title,at,state:"released"}});
                  writeQuarantine(next).then(ok=>{ if(!ok) setQuarWhy("That release couldn\u2019t be saved to this page\u2019s store, so it may come back when you reload."); });
                  return next; });
                setDirty(true);}} style={{background:"none",border:"none",color:C.action,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>Remove</button>
            </div>
          ))}
        </div>}
      </div>
      {/* The import pop-up (her design; docs/add_by_link.md): CSV and Links, and a small
          Cancel. Under the review (1100) so cards open on top; under the confirm box (1200). */}
      {importMode&&(
        <div role="dialog" style={{position:"fixed",inset:0,background:C.scrim,zIndex:1050,display:"flex",flexDirection:"column",justifyContent:"center",padding:16}}>
          {/* Sized to what it holds. CSV and Links match Load and Save; the one pressed
              turns green (her design). */}
          <div style={{background:C.bg,borderRadius:8,...(importMode==="links"||importMode==="pages"||importMode==="paste"?{maxWidth:820,width:"100%"}:{width:"fit-content"}),boxSizing:"border-box",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"auto",boxShadow:"0 8px 30px rgba(0,0,0,0.3)",padding:"14px 18px 10px"}}>
            {/* IMPORT NEEDS A LEDGER OPEN: on an empty page it offers only the ways to open
                one (her design), so an import can never become the whole ledger. */}
            {importMode==="needLedger"&&<div style={{textAlign:"center"}}>
              <div style={{fontSize:13,color:C.ink,marginBottom:10}}>Your ledger needs to be opened first.</div>
              <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                <button onClick={()=>{setImportMode(null);requestOpenCloud();}} style={sBtn}>Open last cloud save</button>
                <button onClick={()=>{setImportMode(null);requestImport();}} style={sBtn}>Load</button>
              </div>
            </div>}
            {importMode!=="needLedger"&&<div style={{display:"flex",gap:5,justifyContent:"center"}}>
              <button onClick={()=>{setImportMode(null);refreshFileRef.current?.click();}} disabled={busy} style={sBtn}>CSV</button>
              <button onClick={()=>{ if(importMode!=="links"){ setLinkFails([]); setLinkNote(null); } setImportMode("links"); }} disabled={busy} style={importMode==="links"?{...pBtn,opacity:1}:sBtn}>Links</button>
              <button onClick={()=>{ if(importMode!=="pages"){ setLinkFails([]); setLinkNote(null); } setImportMode("pages"); }} disabled={busy} style={importMode==="pages"?{...pBtn,opacity:1}:sBtn}>Pages</button>
              <button onClick={()=>{ if(importMode!=="paste"){ setLinkFails([]); setLinkNote(null); } setImportMode("paste"); }} disabled={busy} style={importMode==="paste"?{...pBtn,opacity:1}:sBtn}>Paste</button>
            </div>}
            {importMode==="paste"&&<div style={{marginTop:14}}>
              {/* Paste: one box per page, the link and the page's text in separate boxes, a faint "Link" in
                  the link box (her design). "Clear" as the Links box has it: in the box, top right; "Clear all"
                  the same, above the boxes. */}
              {pastes.map((x,i)=>{
                const set=(k,v)=>setPastes(l=>l.map(y=>y.id===x.id?{...y,[k]:v}:y));
                const field={width:"100%",boxSizing:"border-box",fontSize:12.5,fontFamily:"inherit",padding:"6px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,display:"block"};
                return <div key={x.id} style={{marginBottom:10,position:"relative"}}>
                  <input value={x.url} onChange={e=>set("url",e.target.value)} disabled={busy} placeholder="Link" aria-label="Link" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{...field,paddingRight:52}}/>
                  {filledBox(x)&&<button onClick={()=>{ const l=pastes.map(y=>y.id===x.id?newBox():y); setPastes(l); writePendingPastes(l); }} disabled={busy}
                    style={{position:"absolute",top:7,right:8,background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear</button>}
                  <textarea value={x.text} onChange={e=>set("text",e.target.value)} disabled={busy} aria-label="Text" rows={5} style={{...field,marginTop:4,resize:"vertical"}}/>
                </div>;
              })}
              {/* "Clear all" in the row with + and Read, centred as Cancel is (her design). */}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center"}}>
                <span/>
                <span>{pastes.some(filledBox)&&<button onClick={()=>{ const l=pasteBoxes([]); setPastes(l); setLinkFails([]); setLinkNote(null); writePendingPastes(l); }} disabled={busy}
                  style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear all</button>}</span>
                <div style={{display:"flex",justifyContent:"flex-end",gap:5}}>
                <button onClick={()=>setPastes(l=>[...l,newBox()])} disabled={busy} aria-label="Add a box" style={sBtn}>+</button>
                <button onClick={()=>readLinks("paste")} disabled={busy} style={pBtn}>Read</button>
                </div>
              </div>
              {readStatus(f=>f.url)}
            </div>}
            {importMode==="pages"&&<div style={{marginTop:14}}>
              {/* Pages: saved show pages, read as a link is read. The list works as the Links
                  box does: "Clear" empties it and the store; what is not read stays. */}
              <input ref={pagesFileRef} type="file" multiple accept=".mht,.mhtml,.html,.htm,multipart/related,message/rfc822,text/html" onChange={pickPages} style={{display:"none"}}/>
              <div style={{position:"relative",border:"1px solid "+C.rule,borderRadius:4,background:C.card,padding:"8px 52px 8px 10px",minHeight:60,fontSize:12.5,color:C.ink}}>
                {pages.length?pages.map(p=><div key={p.url} style={{overflowWrap:"anywhere",lineHeight:1.5}}>{p.title||p.name||p.url}</div>)
                  :null}
                {pages.length>0&&<button onClick={()=>{ setPages([]); setLinkFails([]); setLinkNote(null); writePendingPages([]); }} disabled={busy}
                  style={{position:"absolute",top:6,right:8,background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear</button>}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:5,marginTop:8}}>
                <button onClick={()=>pagesFileRef.current?.click()} disabled={busy} style={sBtn}>Choose pages</button>
                <button onClick={()=>readLinks("pages")} disabled={busy||!pages.length} style={pBtn}>Read</button>
              </div>
              {readStatus(f=>{ const pg=pages.find(p=>p.url===f.url); return (pg&&(pg.title||pg.name))||f.url; })}
            </div>}
            {importMode==="links"&&<div style={{marginTop:14}}>
              {/* "Clear" sits inside the box, top right (her design): one press empties
                  it and the store. */}
              <div style={{position:"relative"}}>
                <textarea value={linkText} onChange={e=>setLinkText(e.target.value)} rows={8} disabled={busy}
                  style={{width:"100%",boxSizing:"border-box",fontSize:12.5,fontFamily:"inherit",padding:"8px 52px 8px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,resize:"vertical",display:"block"}}/>
                {linkText.trim()&&<button onClick={()=>{ setLinkText(""); setLinkFails([]); setLinkNote(null); writePendingLinks(""); }} disabled={busy}
                  style={{position:"absolute",top:6,right:8,background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Clear</button>}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                <button onClick={()=>readLinks("links")} disabled={busy} style={pBtn}>Read</button>
              </div>
              {readStatus(f=><a href={f.url} target="_blank" rel="noopener noreferrer" style={{color:TH.urgent.ink}}>{f.url}</a>)}
            </div>}
            {/* Cancel always answers: a catalogue search also sets busy, and once locked the
                pop-up out until the search ended (her report). */}
            <div style={{textAlign:"center",marginTop:10}}>
              <button onClick={()=>{ if(linkRead.current.on){ linkRead.current.stop=true; setProg(p=>({...p,label:"Stopping after this "+(importMode==="pages"||importMode==="paste"?"page":"link")+"\u2026"})); return; } if(!proposals)dropHeldVenues(); setImportMode(null); }} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {proposals&&(
        <div style={{position:"fixed",inset:0,background:"rgba(20,18,16,0.5)",zIndex:1100,display:"flex",flexDirection:"column",padding:16}}>
          <div style={{background:C.bg,borderRadius:8,maxWidth:820,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.rule}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:500,color:C.ink}}>{proposals.length} proposed change{proposals.length===1?"":"s"} found</div>
              {/* The counts, her wording: two sentences, each ending in the number the
                  next starts from (docs/app.md §3). Every term stays — drop one and the
                  arithmetic stops closing. */}
              {tally&&(()=>{
                const cards=tally.add+tally.fill+tally.change;
                const n=(v,tone)=><b style={{color:tone||C.ink}}>{v}</b>;
                return (
                <div style={{fontSize:11.5,color:C.soft,marginTop:6,lineHeight:1.6}}>
                  <div>
                    From {n(tally.fileRows)} row{tally.fileRows===1?"":"s"} in the file
                    {" \u2014 "}{n(tally.markers)} marker row{tally.markers===1?"":"s"}
                    {tally.blocked>0&&<>{", "}{n(tally.blocked)} you{"\u2019"}d said never to add</>}
                    {", "}{n(tally.folded)} duplicate row{tally.folded===1?"":"s"} reconciled/de-duped
                    {", "}{n(tally.silent)} already matching ledger
                    {" = "}{n(cards)} entries considered for import
                  </div>
                  <div style={{marginTop:2}}>
                    From {n(cards)} entr{cards===1?"y":"ies"}
                    {" \u2014 "}{n(tally.fill)} fill a gap
                    {", "}{n(tally.change)} edit existing data
                    {", "}{n(tally.add)} new exhibition{tally.add===1?"":"s"}
                  </div>
                </div>
                );
              })()}
            </div>
            <div style={{overflow:"auto",padding:"12px 18px",flex:1}}>
              {/* Triage first, then the ordinary work (her decision): odd cases batched
                  by kind, easiest first, so she finishes one kind of thinking at a time.
                  A venue can appear twice on this screen — accepted. */}
              {(()=>{
                const at=proposals.map((p,i)=>({p,i}));
                const vOrder=m=>{const k=MUSEUMS.findIndex(x=>x.id===m);return k<0?999:k;};
                const byVenue=a=>a.slice().sort((x,y)=>vOrder(x.p.venueId)-vOrder(y.p.venueId));
                // No "unusable" band: a faulty row refuses the whole file (analyzeProForma;
                // qc.js upstream).
                const real    = at;
                // Was this card built from more than one row? Ask the fold's own flag, never
                // the notes — a travelling show's note says "same exhibition" too (fixture 16).
                const isMerged=x=>!!x.p.merged;
                const hasChoice=x=>!!x.p.choices;
                const mergedOnly = byVenue(real.filter(x=>isMerged(x)&&!hasChoice(x)));
                // A conflict is always a fold, so there is no band for a lone disagreement
                // (fixture 17).
                const mergedConf = byVenue(real.filter(x=>hasChoice(x)));
                const plain      = real.filter(x=>!isMerged(x)&&!hasChoice(x));
                // No link at all: usable rows, grouped because the link is the only key for
                // folding and quarantine, so they return fresh every sweep (her decision).
                const noLink     = byVenue(plain.filter(x=>!x.p.cand||!x.p.cand.exUrl));
                const notForYou  = byVenue(plain.filter(x=>isTopicCard(x.p)));
                const ordinary   = plain.filter(x=>x.p.cand&&x.p.cand.exUrl&&!isTopicCard(x.p));
                // Venue subheadings inside each band, in the same style and order as below.
                const byVenueBlocks=list=>allVenues().map(m=>{
                  const grp=list.filter(x=>x.p.venueId===m.id);
                  if(!grp.length)return null;
                  return(
                    <div key={m.id} style={{marginBottom:10}}>
                      <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginBottom:6,fontWeight:600}}>{m.short}</div>
                      {grp.map(({p,i})=>renderProposalCard(p,i))}
                    </div>
                  );
                }).filter(Boolean);
                // Every band carries its own count on its header, so collapsing never
                // hides it.
                const bandOpen=(key,dflt)=>openBands[key]===undefined?dflt:openBands[key];
                // A venue with no entry is OPEN. See the state declaration.
                const venueOpen=id=>openVenues[id]!==false;
                const band=(key,title,tone,n,dflt,body)=>{
                  const open=bandOpen(key,dflt);
                  return(
                    <div key={key} style={{marginBottom:10}}>
                      <button onClick={()=>setOpenBands(o=>({...o,[key]:!open}))}
                        style={{display:"flex",alignItems:"center",gap:7,width:"100%",textAlign:"left",background:"none",
                                border:"none",borderBottom:"1px solid "+C.rule,padding:"5px 0",cursor:"pointer",color:tone||C.soft}}>
                        <span style={{fontSize:9,lineHeight:1,width:9,display:"inline-block",transform:open?"rotate(90deg)":"none",transition:"transform .12s"}}>{"\u25B6"}</span>
                        <span style={{fontSize:11,letterSpacing:"0.07em",fontWeight:600}}>{title}</span>
                        <span style={{fontSize:11,fontWeight:700,color:tone||C.ink}}>{"\u00b7"} {n}</span>
                      </button>
                      {open&&<div style={{marginTop:8}}>{body}</div>}
                    </div>
                  );
                };
                // The odd-cases total counts the markers too.
                const oddCount=coverage.length+mergedOnly.length+mergedConf.length+noLink.length;
                const markerBlocks=MUSEUMS.map(m=>{
                  const grp=coverage.filter(cv=>cv.venueId===m.id);
                  if(!grp.length)return null;
                  return(
                    <div key={"cvg"+m.id} style={{marginBottom:10}}>
                      <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginBottom:6,fontWeight:600}}>{m.short}</div>
                      {grp.map((cv,i)=>(
                        <div key={"cv"+i} style={{border:"1px solid "+C.rule,borderRadius:6,padding:"8px 10px",marginBottom:6,background:C.card}}>
                          <div style={{fontSize:12,color:C.ink}}>{cv.what}</div>
                          <div style={{fontSize:11.5,color:C.soft,marginTop:2,lineHeight:1.5}}>{cv.why}</div>
                        </div>
                      ))}
                    </div>
                  );
                }).filter(Boolean);
                return(<>
                  {oddCount>0&&(
                    <div style={{marginBottom:16,paddingBottom:12,borderBottom:"2px solid "+C.rule}}>
                      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:8}}>Odd cases {"\u00b7"} {oddCount}</div>
                      {coverage.length>0&&band("markers","1. Marker rows",undefined,coverage.length,false,markerBlocks)}
                      {mergedOnly.length>0&&band("merged","2. Combined rows \u00b7 identical rows were de-duped or reconciled",undefined,mergedOnly.length,false,byVenueBlocks(mergedOnly))}
                      {mergedConf.length>0&&band("mergedconf","3. Combined rows \u00b7 identical rows produced conflicts \u2014 yours to choose",C.accent,mergedConf.length,true,byVenueBlocks(mergedConf))}
                      {noLink.length>0&&band("nolink","4. No exhibition url \u00b7 link goes to venue\u2019s listing page",undefined,noLink.length,true,byVenueBlocks(noLink))}
                    </div>
                  )}
                  {notForYou.length>0&&(
                    <div style={{marginBottom:16,paddingBottom:12,borderBottom:"2px solid "+C.rule}}>
                      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:8}}>Probably not for you {"\u00b7"} {notForYou.length}</div>
                      {byVenueBlocks(notForYou)}
                    </div>
                  )}
                {ordinary.length>0&&(()=>{
                    // Only venues with ordinary cards, or "Collapse all" would write keys
                    // for empty venues and read the wrong way next click.
                    const venuesHere=allVenues().filter(m=>ordinary.some(x=>x.p.venueId===m.id)).map(m=>m.id);
                    const anyOpen=venuesHere.some(id=>venueOpen(id));
                    return(
                    <div style={{marginBottom:12,display:"flex",alignItems:"flex-end",gap:12,flexWrap:"wrap"}}>
                      <div style={{flex:"1 1 260px",minWidth:0}}>
                        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:2}}>Normal cases {"\u00b7"} {ordinary.length}</div>
                        <div style={{fontSize:11.5,color:C.soft,lineHeight:1.55}}>Nothing unusual about these {"\u2014"} one row in the file, nothing combined, nothing disagreeing.</div>
                      </div>
                      <button onClick={()=>{
                          const next={};
                          for(const id of venuesHere) next[id]=!anyOpen;
                          setOpenVenues(o=>({...o,...next}));
                        }} style={sBtn}>{anyOpen?"Collapse all venues":"Expand all venues"}</button>
                    </div>
                  );})()}
                  {/* Order inside a venue (her decision): fills, then edits, then new;
                      newest closing date first in each; no closing date last. */}
                  {allVenues().map(m=>{
                    const rank={fill:0,change:1,add:2};
                    const grp=ordinary.filter(x=>x.p.venueId===m.id).slice().sort((a,b)=>{
                      const d=(rank[a.p.type]??9)-(rank[b.p.type]??9); if(d!==0)return d;
                      const ae=a.p.cand&&a.p.cand.endDate, be=b.p.cand&&b.p.cand.endDate;
                      if(!ae&&!be)return 0; if(!ae)return 1; if(!be)return -1;
                      return be.localeCompare(ae);
                    });
                    if(!grp.length)return null;
                    // The venue heading is the control (docs/app.md §3 "Screen rulings").
                    const vOpen=venueOpen(m.id);
                    return(
                    <div key={m.id} style={{marginBottom:14}}>
                      <button onClick={()=>setOpenVenues(o=>({...o,[m.id]:!vOpen}))}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",background:"none",
                                border:"none",borderBottom:"1px solid "+C.rule,padding:"6px 0",marginBottom:8,cursor:"pointer",color:C.accent}}>
                        <span style={{fontSize:10,lineHeight:1,width:10,display:"inline-block",transform:vOpen?"rotate(90deg)":"none",transition:"transform .12s"}}>{"\u25B6"}</span>
                        <span style={{fontSize:14,letterSpacing:"0.01em",fontWeight:700}}>{m.card||m.short}</span>
                        <span style={{fontSize:12,fontWeight:700}}>{"\u00b7"} {grp.length}</span>
                        {/* The undecided count per venue, only where there is work: a
                            closed venue still declares what it holds; a "0" is clutter
                            (her decision). */}
                        {(()=>{const u=grp.filter(({p,i})=>isUndecided(p,i)).length;
                          return u>0?<span style={{fontSize:11,fontWeight:600,color:C.soft}}>{"\u00b7 "+u+" to decide"}</span>:null;})()}
                      </button>
                      {vOpen&&grp.map(({p,i})=>renderProposalCard(p,i))}
                    </div>
                  );})}
                </>);
              })()}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid "+C.rule,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={cancelRefresh} style={sBtn}>Cancel import</button>
              {/* Rejected and quarantined are named only when there is one (her ask);
                  what is named adds up to what is decided. */}
              <span style={{fontSize:11.5,color:C.soft,marginLeft:"auto"}}>
                {(rejectedCount?rejectedCount+" rejected, ":"")+(quarantinedCount?quarantinedCount+" quarantined, ":"")+acceptedCount+" to apply"}</span>
              {/* No separate "N to decide" link here (her decision: clutter) — the venue
                  headings say where the cards are. */}
              {/* Every card must be decided before the ledger moves — a hard block, her
                  permanent design (docs/app.md §3). The button says what is missing. */}
              {/* ===== PARTIAL APPLY — stays until she says (CLAUDE.md §5.1) =====
                  Beside the block, never instead of it: drawn only when some cards are
                  decided and some are not (offerPartialApply). It asks first, in her
                  wording, naming what is left behind and the way back. To remove it: this
                  block, `partial` on applyRefresh, offerPartialApply, fixture 18h. */}
              {offerPartialApply({acceptedCount,undecidedCount})&&<button
                onClick={()=>setConfirmBox({
                  title:"Complete this partial import?",
                  text:acceptedCount+" decided "+(acceptedCount===1?"card":"cards")+" will go into your ledger now. "
                    +undecidedCount+" undecided "+(undecidedCount===1?"card":"cards")+" will be left behind \u2014 "
                    +"import them using the same sweep file.",
                  act:()=>proceedRefresh(true)})}
                title={"Apply the "+acceptedCount+" you have decided and come back to the rest later."}
                style={{...sBtn,borderColor:C.accent,color:C.accent,fontWeight:600}}>
                Update with the {acceptedCount} I{"’"}ve decided</button>}
              {/* ===== end partial apply block ===== */}
              {/* "Next" when a new venue's shop is still to confirm (her design): the
                  ledger moves only after the shop screen. */}
              <button onClick={()=>proceedRefresh(false)} disabled={undecidedCount>0}
                title={undecidedCount>0?"Decide every card first — "+undecidedCount+" still undecided.":""}
                style={{...pBtn,...(undecidedCount>0?{background:C.muted,cursor:"not-allowed",opacity:1}:{})}}>
                {undecidedCount>0
                  ? undecidedCount+" still to decide"
                  : venuesToConfirm().length?"Next":"Go ahead and update the ledger"}</button>
            </div>
          </div>
        </div>
      )}
      {/* The shop screen (her design): one card per new venue with an unconfirmed shop;
          the ledger moves only when every card is answered. Over the review (1100),
          under the confirm box (1200). */}
      {shopScreen&&proposals&&(()=>{
        const left=shopScreen.ids.filter(id=>!(occVenues[id]||{}).confirmed||shopLooking===id).length;
        return <div role="dialog" style={{position:"fixed",inset:0,background:C.scrim,zIndex:1150,display:"flex",flexDirection:"column",padding:16}}>
          <div style={{background:C.bg,borderRadius:8,maxWidth:820,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.rule}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:500,color:C.ink}}>New Venue Shops</div>
            </div>
            <div style={{overflow:"auto",padding:"4px 18px 14px",flex:1}}>
              {/* The review cards' buttons (decBtn), always the same four in the same
                  places (her decision); Confirm greyed only with no shop to confirm. */}
              {shopScreen.ids.map(id=>{
                const v=occVenues[id]||{}, link=v.shop==="found"?v.shopCatalogues:null, looking=shopLooking===id;
                const home=v.shop==="noshelf"||v.shop==="failed"?v.shopHome:null;
                const said=v.shop==="found"?null:v.shop==="noshelf"?"Shop found, but not its books section: "
                  :v.shop==="failed"?"Search failed.":"No museum shop found.";
                // The finder found no catalogues section: one line, her wording, whatever it took instead.
                const lesser=link&&v.shelfKind&&v.shelfKind!=="catalogues"?"Shop found, but not its catalogues section ":null;
                const en=v.shop==="found"?v.shopEnglishUnread:null;
                const yes=v.confirmed&&v.shop==="found"&&!v.englishPicked&&!v.shopAdded, yesEn=v.confirmed&&!!en&&!!v.englishPicked, none=v.confirmed&&v.shop==="none", added=v.confirmed&&!!v.shopAdded;
                const typing=shopAdding&&shopAdding.id===id;
                return <div key={id} style={{paddingTop:12,marginTop:10,borderTop:"1px solid "+C.rule,fontSize:12.5,color:C.ink,lineHeight:1.45}}>
                  <div style={{fontWeight:600}}>{(MU[id]&&(MU[id].card||MU[id].short))||v.short||v.name||id}</div>
                  {link?<div>{lesser&&<span style={{color:C.soft}}>{lesser}</span>}<a href={link} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{link}</a></div>
                    :<div style={{color:C.soft}}>{said}{home&&v.shop==="noshelf"&&<a href={home} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{home}</a>}</div>}
                  <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                    {looking?<span style={{fontSize:11.5,color:C.soft}}>Looking{"\u2026"}</span>:<>
                      <button onClick={()=>confirmShop(id)} disabled={!!shopLooking||!(link||home)} style={{...decBtn(yes,C.okEdge),...(!(link||home)?{opacity:0.4,cursor:"not-allowed"}:{})}}>{yes?"\u2713 ":""}Confirm</button>
                      <button onClick={()=>lookAgain(id)} disabled={!!shopLooking} style={decBtn(false,C.okEdge)}>Look again</button>
                      <button onClick={()=>noShopFor(id)} disabled={!!shopLooking} style={decBtn(none,C.rejectInk)}>{none?"\u2713 ":""}No shop</button>
                      <button onClick={()=>setShopAdding(typing?null:{id,text:added?link:""})} disabled={!!shopLooking} style={decBtn(added,C.okEdge)}>{added?"\u2713 ":""}Add</button>
                    </>}
                  </div>
                  {/* "Add": her link, taken on Enter or on leaving the box; Escape closes it. */}
                  {typing&&!looking&&<input autoFocus value={shopAdding.text} onChange={e=>setShopAdding({id,text:e.target.value})}
                    onKeyDown={e=>{ if(e.key==="Enter")addShopFor(id,e.target.value); else if(e.key==="Escape"){ e.target.value=""; setShopAdding(null); } }}
                    onBlur={e=>addShopFor(id,e.target.value)}
                    style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"5px 8px",fontSize:12.5,border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontFamily:"inherit"}}/>}
                  {/* Its English section, which the finder could not read: hers to confirm instead. */}
                  {en&&<><div style={{marginTop:6}}><a href={en} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{en}</a></div>
                    <div style={{display:"flex",gap:6,marginTop:6}}>{!looking&&<button onClick={()=>confirmShop(id,true)} disabled={!!shopLooking} style={decBtn(yesEn,C.okEdge)}>{yesEn?"\u2713 ":""}Confirm</button>}</div></>}
                </div>;})}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid "+C.rule,display:"flex",gap:10,alignItems:"center"}}>
              <button onClick={()=>{setShopAdding(null);setShopScreen(null);}} disabled={!!shopLooking} style={sBtn}>Back</button>
              <button onClick={()=>applyRefresh(shopScreen.partial)} disabled={left>0}
                style={{...pBtn,marginLeft:"auto",...(left>0?{background:C.muted,cursor:"not-allowed",opacity:1}:{})}}>
                {left>0?left+" still to decide":"Go ahead and update the ledger"}</button>
            </div>
          </div>
        </div>;})()}
      {/* ABOVE THE REVIEW PANEL, NOT UNDER IT: the confirm box is the TOP layer (1200),
          because the thing asked last is answered first (fixture 18i). Any new overlay
          goes below it. */}
      {confirmBox&&(
        <div style={{position:"fixed",inset:0,background:C.scrim,display:"grid",placeItems:"center",zIndex:1200,padding:16}}>
          <div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:8,maxWidth:420,padding:"18px 20px",boxShadow:"0 6px 24px rgba(0,0,0,0.25)"}}>
            {/* The heading is the caller's; the default keeps the old wording. */}
            <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:8}}>{confirmBox.title||"Replace what's on screen?"}</div>
            {confirmBox.text?<div style={{fontSize:12.5,color:C.body,lineHeight:1.5,marginBottom:16}}>{confirmBox.text}</div>:<div style={{height:8}}/>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setConfirmBox(null)} style={sBtn}>Cancel</button>
              <button onClick={()=>{const a=confirmBox.act;setConfirmBox(null);a&&a();}} style={{...pBtn,background:C.accent}}>{confirmBox.yes||"Continue"}</button>
            </div>
          </div>
        </div>
      )}
      {/* The version, small and grey: something she checks, not acts on. Reads
          APP_VERSION, so there is one copy of the number. */}
      <footer style={{maxWidth:760,margin:"28px auto 0",fontSize:10.5,color:C.soft,textAlign:"center"}}>
        Cat Watch {"·"} v {APP_VERSION} {"·"} {APP_VERSION_DATE}
      </footer>
    </div>
  );
}
