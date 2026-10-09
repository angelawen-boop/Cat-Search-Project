import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

// The footer prints APP_VERSION and its date, so she can tell one build from the next.
// Numbering, her decision: a whole number for a substantial change, a decimal for a
// small one, one number per publish. Bump it with the change it describes.
const APP_VERSION = "42.3";
const APP_VERSION_DATE = "9 Oct 2026";

// MUSEUMS is her working order, not alphabetical or geographic: the venues she reads
// most first, the Italian sites together, the venues that refuse us last. Accademia
// (dellav) sits with the Italian venues until she says otherwise.
// It is the ONLY venue order in the app — drawer, chips and refresh headings all read
// it. Never add a second hand-typed list of codes; one once hid two finished recipes.
//
// shopCatalogues: the shop's catalogue shelf, opened first. shopSearch: its search box
// plus the exhibition title, opened with it. Addresses: docs/app.md §1 "Shop addresses".
// card: the name on exhibition cards where it differs from the chip's `short`.
// english:false: only these venues get the language check and English-edition search
// (lookupCatalogue, phases 2b and 3).
const MUSEUMS = [
  // The Met prints a show's dates on its "on view" line: below a podcast transcript (Manet/Degas), or above the only line naming the show (Impossible Conversations).
  { id:"met", linkRead:{ dateLine:/\bon view\b/i }, short:"The Met", name:"The Metropolitan Museum of Art", city:"New York",
    exBase:"https://www.metmuseum.org/exhibitions/", shopSearch:"https://store.metmuseum.org/search?q=", shopCatalogues:"https://store.metmuseum.org/books-toys-games/exhibition-catalogues", shopHome:"https://store.metmuseum.org/", listUrl:"https://www.metmuseum.org/exhibitions" },
  { id:"rijks", english:false, short:"Rijksmuseum", name:"Rijksmuseum", city:"Amsterdam",
    exBase:"https://www.rijksmuseum.nl/en/whats-on/exhibitions/", shopSearch:"https://www.rijksmuseumshop.nl/en/search?q=", shopCatalogues:"https://www.rijksmuseumshop.nl/en/books/exhibition-books", shopHome:"https://www.rijksmuseumshop.nl/en/", listUrl:"https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view" },
  { id:"ng", short:"National Gallery", name:"The National Gallery", city:"London",
    exBase:"https://www.nationalgallery.org.uk/exhibitions/", shopSearch:"https://shop.nationalgallery.org.uk/catalogsearch/result/?q=", shopCatalogues:"https://shop.nationalgallery.org.uk/books/exhibition-catalogues.html", shopHome:"https://shop.nationalgallery.org.uk/", listUrl:"https://www.nationalgallery.org.uk/exhibitions" },
  // linkRead: Add by link options for met, acq, frick, louvre, artic, brit (docs/picked_shows.md, "Venue link rules").
  // No apostrophe or double quote inside a linkRead pattern (write \x27): compress.js seedMemory scans this list as text.
  { id:"acq", linkRead:{ title:"subtitle", places:["New York","Palm Beach"], credit:/^In collaboration with\b/i, dashAfterColon:true, from:/^Press Release$/, minLine:60, skip:/^Gallery Hours:|\bImage Courtesy\b/, skipEntities:true, cleanLink:true }, short:"Acquavella", name:"Acquavella Galleries", city:"New York",
    exBase:"https://www.acquavellagalleries.com/exhibitions/", shopSearch:"https://acquavellagalleries.myshopify.com/search?q=", shopCatalogues:"https://acquavellagalleries.myshopify.com/collections/all", shopHome:"https://acquavellagalleries.myshopify.com/", listUrl:"https://www.acquavellagalleries.com/exhibitions" },
  // Shopify, like Acquavella's. Chip "Levy", cards "Lévy Gorvy Dayan" (her decision).
  { id:"lgd", short:"Levy", card:"Lévy Gorvy Dayan", name:"Lévy Gorvy Dayan", city:"New York / London",
    exBase:"https://www.levygorvydayan.com/exhibitions/", shopSearch:"https://shop.levygorvydayan.com/search?q=", shopCatalogues:"https://shop.levygorvydayan.com/collections/all", shopHome:"https://shop.levygorvydayan.com/", listUrl:"https://www.levygorvydayan.com/exhibitions" },
  // The whole Publications shelf: the Frick files some show books outside "Exhibition catalogues" (her finding).
  { id:"frick", linkRead:{ titleDrop:/^Special Loan:\s*/i }, short:"Frick", name:"The Frick Collection", city:"New York", exBase:null, shopSearch:"https://shop.frick.org/search.php?search_query=", shopCatalogues:"https://shop.frick.org/publications/", shopHome:"https://shop.frick.org/", listUrl:null },
  { id:"menil", short:"Menil", name:"The Menil Collection", city:"Houston", exBase:null, shopSearch:"https://bookstore.menil.org/search?q=", shopCatalogues:"https://bookstore.menil.org/collections/menil-publications", shopHome:"https://bookstore.menil.org/", listUrl:null },
  { id:"artic", linkRead:{ from:/^Share$/, until:/^(?:Share|Related(?: Exhibitions| Products)?|Sign up for our enewsletter\b.*)$/, minLine:60, skip:/\u00a9|Press 300ppi|Image CC|Photo courtesy|^(?:an?|the)\s+(?:[\w,\x27-]+\s+){0,5}?(?:painting|poster|drawing|photograph|photomontage|statuette|cover|print)\b,?\s+(?:of|with|reads|that|in|featuring|showing)\b/i }, short:"Artic", name:"Art Institute of Chicago", city:"Chicago", exBase:null, shopSearch:"https://shop.artic.edu/search?q=", shopCatalogues:"https://shop.artic.edu/collections/exhibition-catalogues", shopHome:"https://shop.artic.edu/", listUrl:null },
  // Her addition, after Artic. Shopify: search box and her Books shelf.
  { id:"cincinnati", short:"Cincinnati", name:"Cincinnati Art Museum", city:"Cincinnati", exBase:null, shopSearch:"https://shop.cincinnatiartmuseum.org/search?q=", shopCatalogues:"https://shop.cincinnatiartmuseum.org/collections/books", shopHome:"https://shop.cincinnatiartmuseum.org/", listUrl:null },
  { id:"wallace", short:"Wallace", name:"The Wallace Collection", city:"London", exBase:null, shopSearch:"https://wallacecollectionshop.org/search?q=", shopCatalogues:"https://wallacecollectionshop.org/collections/wallace-collection-publications", shopHome:"https://wallacecollectionshop.org/", listUrl:null },
  { id:"tate-britain", short:"Tate Britain", name:"Tate Britain", city:"London", exBase:null, shopSearch:"https://shop.tate.org.uk/search?q=", shopCatalogues:"https://shop.tate.org.uk/books/exhibition-books?sz=96", shopHome:"https://shop.tate.org.uk/", listUrl:null },
  // Her addition, after Tate Britain. Shopify: search box and her exhibition-catalogues shelf.
  { id:"ashmolean", short:"Ashmolean", name:"Ashmolean Museum", city:"Oxford", exBase:null, shopSearch:"https://shop.ashmolean.org/search?q=", shopCatalogues:"https://shop.ashmolean.org/collections/exhibition-catalogues", shopHome:"https://shop.ashmolean.org/", listUrl:null },
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
  { id:"jacquemart", subtitleUnderHeading:true, english:false, short:"Jacquemart-Andr\u00e9", name:"Mus\u00e9e Jacquemart-Andr\u00e9", city:"Paris", exBase:null, shopSearch:"https://boutique.musee-jacquemart-andre.com/en/search/products/?q=", shopCatalogues:"https://boutique.musee-jacquemart-andre.com/en/products/116-exhibition-catalogs/", shopHome:"https://boutique.musee-jacquemart-andre.com/en/", listUrl:null },
  // Search address is hers. The shop answers with a waiting room, so the lookup reports it
  // blocked; the address stays for her shop link.
  { id:"khm", english:false, short:"KHM", name:"Kunsthistorisches Museum", city:"Vienna", exBase:null, shopSearch:"https://shop.khm.at/en/products?shop%5Bq%5D=", shopHome:"https://shop.khm.at/en/", listUrl:null },
  { id:"uffizi", english:false, short:"Uffizi", name:"Uffizi Galleries", city:"Florence", exBase:null, shopSearch:"https://shop.uffizi.it/en/?s=", shopHome:"https://shop.uffizi.it/en/", listUrl:null },
  { id:"dellav", english:false, short:"Accademia", name:"Gallerie dell'Accademia", city:"Venice", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"borghese", english:false, short:"Borghese", name:"Galleria Borghese", city:"Rome", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"brera", english:false, short:"Brera", name:"Pinacoteca di Brera", city:"Milan", exBase:null, shopSearch:"https://bottegabrera.org/en/search?q=", shopCatalogues:"https://bottegabrera.org/en/collections/guide-e-cataloghi", shopHome:"https://bottegabrera.org/en/", listUrl:null },
  { id:"capo", english:false, short:"Capodimonte", name:"Museo e Real Bosco di Capodimonte aka Museo Nazionale di Capodimonte", city:"Naples", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"morgan", short:"Morgan", name:"Morgan Library & Museum", city:"New York", exBase:null, shopSearch:"https://shop.themorgan.org/search?q=", shopCatalogues:"https://shop.themorgan.org/collections/exhibition-catalogs", shopHome:"https://shop.themorgan.org/", listUrl:null },
  { id:"brit", linkRead:{ from:/^(?:For the catalogue, homewares and gifts from the exhibition|Book tickets$)/ }, short:"British Museum", name:"The British Museum", city:"London", exBase:null, shopSearch:"https://www.britishmuseumshoponline.org/catalogsearch/result/?q=", shopCatalogues:"https://www.britishmuseumshoponline.org/books/exhibition-books.html", shopHome:"https://britishmuseumshoponline.org/", listUrl:null },
  { id:"moma", short:"MoMA", name:"Museum of Modern Art", city:"New York", exBase:null, shopSearch:"https://store.moma.org/collections/shop?q=" /* her own search */, shopCatalogues:"https://store.moma.org/collections/exhibition-catalogues", shopHome:"https://store.moma.org/", listUrl:null },
  { id:"tate-modern", short:"Tate Modern", name:"Tate Modern", city:"London", exBase:null, shopSearch:"https://shop.tate.org.uk/search?q=", shopCatalogues:"https://shop.tate.org.uk/books/exhibition-books?sz=96", shopHome:"https://shop.tate.org.uk/", listUrl:null },
  // The search is hers, query moved last so the title can follow. A Cloudflare check refuses
  // us, so the lookup reports it blocked; the address stays for her shop link.
  { id:"mam", english:false, short:"MAM Paris", name:"Mus\u00e9e d'Art Moderne de Paris", city:"Paris", exBase:null, shopSearch:"https://www.mamlibrairieboutique.fr/listeliv.php?flou&base=paper&mots_recherche=", shopHome:"https://www.mamlibrairieboutique.fr/", listUrl:null },
];
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

  // A venue's own misspelling (Jacquemart-André, "Feburary").
  feburary:2 };

/**
 * A weekday in front of a date. Longest alternative first ("sat" before "saturday"
 * leaves "urday"), and anchored on a following day or month, so "the Sun King" is safe.
 */
const WEEKDAY_PREFIX_SRC =
  '\\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday' +
  '|thurs|thur|tues|weds|mon|tue|wed|thu|fri|sat|sun)\\.?,?\\s+';

// Ordinal days ("May 23rd", Orsay's cards): both parsers drop the suffix first.
const ORDINAL_SUFFIX = /\b(\d{1,2})(?:st|nd|rd|th)\b/gi;

// One month pattern for every parser; long names first, a trailing full stop allowed
// ("Sept."). The (?![A-Za-z]) is load-bearing: without it "7 November 2025" can match
// as "7 Nov" + "ember 2025", silently defeating any lookahead after it.
const MONTH_PATTERN =
  '(?:January|February|Feburary|March|April|May|June|July|August|September|October|November|December' +
  '|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre' +
  '|Sept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec' +
  // Longest first within each language: sett before set, genn before gen, magg before mag.
  '|genn|febbr|magg|giu|lug|ago|sett|ott|dic|set|gen|mag)\\.?(?![A-Za-z])';

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
// "until", "through", Dutch "t/m", Italian "al" and its elisions "all'"/"alle"/"allo".
// Longest alternative first, or "al" eats "all'8". A comma may sit before the
// separator ("From May 16, 2025, to May 17, 2027" — Brera).
const RANGE_SEP = "\\s*,?\\s*(?:-|t/m|to|till|until|through|all['\u2019]|all[oe]|al)\\s*";

const WEEKDAY_PREFIX = new RegExp(WEEKDAY_PREFIX_SRC + '(?=\\d|' + MONTH_PATTERN + ')', 'gi');
const stripWeekdays = t => String(t || '').replace(WEEKDAY_PREFIX, '');

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
function applyExtension(range, text) {
  if (!range || !range.end || !text) return range;
  const t = String(text);
  const m = EXTENDED_TO.exec(t);
  if (!m) return range;

  const dm = readDayMonth(m[1]);
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

/** "11 novembre", "October 11", "02/11/2025" → { day, mon, year (0 if none) }. */
function readDayMonth(s) {
  const M = MONTH_PATTERN;
  const numeric = s.match(/^(\d{1,2})\s*[/.]\s*(\d{1,2})\s*[/.]\s*(\d{4})$/);
  if (numeric) return { day: +numeric[1], mon: +numeric[2], year: +numeric[3] };  // day-first everywhere seen
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

function dayText(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${y}`;
}

// Read docs/scraper.md §3 before changing this parser: every format found in the wild,
// the guards against art-history dates, and why `looseSingles` exists.
// opts.looseSingles: true for a listing card (a short string about one show); false for
// page text, where loose patterns are a lottery (a 1994 photo caption once became a 2024
// show's opening date).
function findDateRange(raw, opts = {}) {
  return applyExtension(findDateRangeCore(raw, opts), raw);
}

function findDateRangeCore(raw, opts = {}) {
  const looseSingles = opts.looseSingles !== false;
  if (!raw) return { start: '', end: '', raw: '' };
  // Normalise every dash (the National Gallery mixes U+2012 and U+2013).
  const s = String(raw).replace(/[\u2010-\u2015\u2212\u2043]/g, '-')
    // Weekdays carry no date and break every range pattern (Wallace), so they go first.
    .replace(WEEKDAY_PREFIX, '')
    .replace(ORDINAL_SUFFIX, '$1')
    .replace(/\s+/g, ' ').trim();
  const M = MONTH_PATTERN;

  // All-numeric range, its order PROVED from the numbers: a component over 12 decides
  // day-first or month-first for both ends; neither proves it → refused (Uffizi).
  // Listing cards only (looseSingles) — on a page it read a sidebar's dates.
  const num = looseSingles && s.match(new RegExp(
    `\\b(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})${RANGE_SEP}(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})\\b`));
  if (num) {
    const [a1, b1, y1, a2, b2, y2] = [1,2,3,4,5,6].map(i => Number(num[i]));
    const dayFirst   = a1 > 12 || a2 > 12;
    const monthFirst = b1 > 12 || b2 > 12;
    if (dayFirst !== monthFirst && plausibleYear(y1) && plausibleYear(y2)) {
      const start = dayFirst ? ymd(y1, b1, a1) : ymd(y1, a1, b1);
      const end   = dayFirst ? ymd(y2, b2, a2) : ymd(y2, a2, b2);
      const r = sane(start, end, frag(num));
      if (r.start || r.end) return r;
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

  // "Month D, YYYY - Month D, YYYY" — year on both sides
  let m = s.match(new RegExp(`(${M}\\s+\\d{1,2},\\s*\\d{4})${RANGE_SEP}(${M}\\s+\\d{1,2},\\s*\\d{4})`, 'i'));
  if (m) return sane(parseMonthDay(titleCase(m[1]), null) || '', parseMonthDay(titleCase(m[2]), null) || '', frag(m));

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
  // "Closes 15 November 2026" and Italian "fino al 24 aprile 2026" close too.
  m = s.match(new RegExp(`\\b(?:(?:till|until|through|to|closes?|closing|fino\\s+al)\\s+|fino\\s+all['\u2019]\\s*)(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[3])) {
    const mo = monthNum(m[2]);
    if (mo) return { start: '', end: ymd(m[3], mo, m[1]), raw: frag(m) };
  }

  // The same, month first: "Through January 10, 2027", "Closes November 15, 2026".
  m = s.match(new RegExp(`\\b(?:till|until|through|thru|closes?|closing)\\s+(${M})\\s+(\\d{1,2}),?\\s*(\\d{4})`, 'i'));
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

  return { start: '', end: '', raw: '' };
}

// Plausible exhibition years: wide enough for any archive a venue still lists, narrow
// enough that a lifespan ("Caravaggio (1571-1610)") never reads as a run.
const PLAUSIBLE_YEAR_MIN = 1990;
const PLAUSIBLE_YEAR_MAX = 2035;

function plausibleYear(y) {
  const n = parseInt(y, 10);
  return n >= PLAUSIBLE_YEAR_MIN && n <= PLAUSIBLE_YEAR_MAX;
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
function findDateRangeInProse(text, hintYear) {
  // The extension rule runs here too: the parsers must not diverge (Giorgio Armani's
  // extended run lost its opening date when only one knew about extensions).
  return applyExtension(findDateRangeInProseCore(text, hintYear), text);
}

function findDateRangeInProseCore(text, hintYear) {
  if (!text) return { start: '', end: '', raw: '' };
  const s = String(text).replace(/[–—]/g, '-').replace(ORDINAL_SUFFIX, '$1').replace(/\s+/g, ' ');
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
  const viaListing = findDateRangeCore(s, { looseSingles: false });
  if (viaListing.start || viaListing.end) return viaListing;

  return { start: '', end: '', raw: '' };
}

function titleCase(str) {
  return str.replace(/([A-Za-z]+)/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}
return { findDateRange, findDateRangeInProse };
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
const SUMMARY_EXAMPLES=[{"title":"German Expressionism","raw":"Across Germany’s major cities, a new generation of artists emerged between 1900 and 1918 to change the rules of painting. They were the German Expressionists. Made up of two pioneering groups – Die Brücke (The Bridge) and Der Blaue Reiter (The Blue Rider) – these young artists painted raw emotions on canvas with a new intensity. Die Brücke was formed by a group of self-taught artists. Rebelling against conservative society, they lived and worked together in the bohemian corners of Dresden and other cities, before moving to Berlin, Germany’s rapidly modernising capital. For them, colour became…","summary":"Fifty German Expressionist works."},{"title":"Asian Bronze","raw":"From Shiva and the Buddha to wine casks and weapons. Everything about bronze triggers your senses. For centuries, this material has played a central role in the traditions of Asia. Now you too can experience the beauty of bronze art at last.","summary":"Four thousand years of Asian bronze."},{"title":"Hockney and Piero: A Longer Look","raw":"David Hockney, in his own words, has always been a looker. Throughout his career, Hockney has found inspiration in the work of other artists. He never tires of looking at paintings. For him, there’s magic in it every time, whether that’s enjoying a picture in a gallery or a much-loved poster at home. This very personal show brings together two Hockney paintings, one showing his mother and father and the other depicting his friend, curator Henry Geldzahler. They are displayed with the thread that ties them together, Piero della Francesca’s ‘The Baptism of Christ’. ‘My Parents’ and ‘Looking at…","summary":"Hockney against Piero della Francesca."},{"title":"At Home in the 17th Century","raw":"What was life really like in the 17th century? That’s the museum’s most-asked question. Now, the time has come to find out. At Home in the 17th Century offers an up-close experience of daily life 400 years ago. Immerse yourself in a full day of the 17th century as you walk among the nine diorama-style displays that make up this exhibition — packed with personal stories and unique objects.","summary":"Domestic life with Rembrandt, Hals, Vermeer."},{"title":"José María Velasco","raw":"See the first UK exhibition of Mexico’s much-loved artist, José María Velasco. Velasco, working in Mexico in the 19th century, was a man of many interests. He was fascinated by advances in geology, the archaeology of his home country, the study of local flora, and the increasing presence of industrialisation. He painted the sweeping landscapes of the Valley of Mexico, the home of modern-day Mexico City, with exquisite detail. His impressive panoramic views of the valley reveal allusions to Mexico's historic past and its rapidly modernising present. Velasco was keenly aware of his country’s…","summary":"Mexico's landscape painter."},{"title":"Carel Visser in the Rijksmuseum Gardens","raw":"This summer, the Rijksmuseum Gardens are home to the work of Carel Visser, the most influential Dutch sculptor of the twentieth century. Visser's sculptures, some as tall as eight metres or as long as five metres, come from museums, private collections and public spaces. Now they are brought together for the very first time. Carel Visser (1928–2015) had little affinity with traditional sculptors' materials such as marble, stone or wood. Iron was his great love. With a cutting torch and welding equipment, he shaped his sculptures from steel plates and beams. Stacking, repetition and symmetry…","summary":"Most influential Dutch sculptor of the twentieth century."},{"title":"Millet: Life on the Land","raw":"The sower, the woodcutter, a shepherd girl. These are the subjects that made French artist Jean-Francois Millet famous. Marking the 150th anniversary of his death, this is an opportunity to see some of Millet’s best-loved paintings and drawings. Born into a farming family in Normandy, Millet moved to the village of Barbizon in 1849 where he put the people who spent their life working on the land, often the poorest of the poor in 19th-century France, at the heart of his work. He knew these people and his realistic, unsentimental approach to painting them was completely new. See his iconic…","summary":"The subjects that made Millet famous."},{"title":"Crossings","raw":"Discover how colonial and contemporary perspectives converge in photographs from the Indian subcontinent. Past meets present in the Crossings exhibition.","summary":"Photography from the Indian subcontinent."}];
// ===== END SHARED =====

// ── ADD BY LINK (docs/picked_shows.md) ──────────────────────────────────────
// Each pasted show link is read once and becomes an ordinary pro forma row for the
// SAME intake as a sweep file; nothing here writes the ledger. Code reads the title
// and dates (the FIRST date line under the show's heading — show pages carry other
// shows' dates too). The model writes only the description and the English title,
// and picks the subtitle from the page's own lines. A link that cannot be read is a
// line, never a card. No lookback for a link (her decision).
const OCC_CHIP="occasional";
const OCC_DOC="venues/occasional";
const LINKS_DOC="links/pending";
const isOcc=id=>String(id||"").startsWith("occ-");

// Every address in whatever she pasted — commas, spaces, lines, or mixed in
// with other words. A repeat is read once (same finished address).
function linksIn(text){
  const out=[],seen=new Set();
  for(const m of String(text||"").matchAll(/https?:\/\/[^\s,;<>"'\]\[]+/gi)){
    const u=m[0].replace(/[.,;:!?)\]]+$/,"");
    const k=normalizeUrlKey(u);
    if(!k||seen.has(k))continue;
    seen.add(k); out.push(u);
  }
  return out;
}

function hostOf(u){ try{ return new URL(u).hostname.toLowerCase(); }catch{ return ""; } }
function originOf(u){ try{ return new URL(u).origin+"/"; }catch{ return ""; } }
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
    .replace(/^\s*#{1,6}\s+/,"")
    .replace(/^\s*[*+]\s+/,"")
    .replace(/\s+/g," ")
    .trim();
}

// "Hammershøi. The Eye that Listens | Museo Nacional Thyssen-Bornemisza".
// A bar always parts the show from the site. A dash only when the words after
// it are the site's own (Courtauld) — Mauritshuis titles a show "The Grand
// Tour - Destination Italy", and that dash belongs to the title.
function splitPageTitle(t,host){
  const s=stripMd(t);
  if(!s)return{show:"",site:""};
  // Several bars: the show is named first, the site last ("Venice: Canaletto and
  // His Rivals | Past exhibitions | National Gallery").
  const parts=s.split(" | ").map(x=>x.trim()).filter(Boolean);
  if(parts.length>1)return{show:parts[0],site:parts[parts.length-1]};
  const m=s.match(/^(.*\S)\s+[-–—]\s+([^-–—]+)$/);
  if(m){
    const h=foldText(host);
    // The tail may be the site's own address ("… - KHM.at"): picked-shows R1.
    const flat=x=>foldText(x).replace(/[^a-z0-9]/g,"");
    const bare=h.replace(/^www\./,"");
    if(foldText(m[2]).split(/[^a-z0-9]+/).some(w=>w.length>=4&&h.includes(w))||flat(m[2])===flat(bare)||flat(m[2])===flat(bare.split(".")[0]))return{show:m[1].trim(),site:m[2].trim()};
  }
  return{show:s,site:""};
}

// The scraper's 2,000-character description cut (her decision). Read from under the
// show's heading, skipping the date line: some venues print the dates at the foot of
// the page (Jacquemart-André).
const LINK_RAW_CHARS=2000;
const LINK_DATE_LINES=60;
// A date line longer than this is a paragraph that carries the dates; it stays in the passage.
const LINK_DATE_LINE_MAX=150;

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

// A venue's own link options (its MUSEUMS entry's `linkRead`). Cases: docs/picked_shows.md,
// "Venue link rules".
function linkOptions(vc){ return (vc&&MU[vc]&&MU[vc].linkRead)||null; }
function joinTitle(name,sub,dashAfterColon){
  if(/[:.!?]\s*$/.test(name))return name+" "+sub;
  return name+(dashAfterColon&&name.includes(":")?" – ":": ")+sub;
}

// One page → {ok, base, between, start, end, raw, site, link} or {ok:false, why}.
// Rules and the cases they came from: docs/picked_shows.md, "The general reader".
function readShowPage(res,url,vc){
  const lr=linkOptions(vc);
  const text=String(oneText(res)||"");
  if(text.trim().length<SHELL_CHARS)return{ok:false,why:"The page came back empty."};
  const host=hostOf(url);
  const{show,site}=splitPageTitle(res&&res.title,host);
  const lines=text.split("\n");
  // Candidate title lines, in order; the heading is the first with dates under it.
  const words=l=>foldText(stripMd(l)).replace(/[^a-z0-9]+/g," ").trim();
  const cands=[];
  const add=i=>{ if(i>=0&&!cands.includes(i))cands.push(i); };
  add(lines.findIndex(l=>/^\s*#\s+\S/.test(l)));
  if(show){
    const fs=foldText(show);
    add(lines.findIndex(l=>/^\s*#{2,3}\s+\S/.test(l)&&foldText(stripMd(l)).includes(fs)));
    add(lines.findIndex(l=>foldText(stripMd(l)).includes(fs)));
    const piece=" "+words(show)+" ";
    add(lines.findIndex(l=>{ const w=words(l); return w.split(" ").length>=2&&w.length<=80&&piece.includes(" "+w+" "); }));
  }
  if(!cands.length)return{ok:false,why:"Couldn’t find the show’s title on the page."};
  const datesUnder=h=>{
    // A venue that labels its date line (linkRead.dateLine) is read there, anywhere on the page.
    if(lr&&lr.dateLine){
      for(let k=0;k<lines.length;k++){
        const l=stripMd(lines[k]); if(!l||!lr.dateLine.test(l))continue;
        const r=DATES.findDateRange(l,{looseSingles:false});
        if(r.start||r.end)return{d:k,range:r};
      }
    }
    for(let k=h+1,seen=0;k<lines.length&&seen<LINK_DATE_LINES;k++){
      const l=stripMd(lines[k]); if(!l)continue; seen++;
      const r=DATES.findDateRange(l,{looseSingles:false});
      if(r.start||r.end)return{d:k,range:r};
    }
    return null;
  };
  let h=cands[0],found=null;
  for(const i of cands){ found=datesUnder(i); if(found){ h=i; break; } }
  if(!found)return{ok:false,why:"No dates found under the show’s title."};
  const heading=stripMd(lines[h]);
  const d=found.d;
  let range=found.range;
  // One side only: a full range further down that shares that date completes it. A range
  // ending on another day never does.
  if(!range.start||!range.end){
    for(let k=d+1;k<lines.length;k++){
      const r=DATES.findDateRange(stripMd(lines[k]),{looseSingles:false});
      if(r.start&&r.end&&((range.end&&r.end===range.end)||(range.start&&r.start===range.start))){ range={...range,start:r.start,end:r.end}; break; }
    }
  }
  // The heading is the name when the page title cuts it at a bar inside the name
  // ("Art in Dialogue: Duccio | Caro") or wraps it in site words ("Exhibition Giovanni
  // Bellini in Paris"). A title that runs on past the heading keeps its subtitle
  // ("Hammershøi. The Eye that Listens"). AL-015.
  const wrapped=show&&heading&&foldText(show).indexOf(foldText(heading))>0;
  let base=wrapped?heading:show&&heading.length>show.length&&heading.length<=200&&foldText(heading).startsWith(foldText(show))?heading:(show||heading);
  // A page title that is the heading plus a dash-led tail or the word "Exhibition" gives way to the heading.
  if(show&&heading&&base===show){
    const fh=foldText(heading).replace(/\s+/g," ").trim();
    if(fh.length>=3&&foldText(show).startsWith(fh)){
      const rest=show.slice(heading.trim().length);
      if(/^\s+[-–—·]\s/.test(rest)||/^\s+exhibitions?\s*$/i.test(rest))base=heading.trim();
    }
  }
  if(lr&&lr.title)base=venueTitle(lines,h,heading,lr,words)||base;
  // A label the venue puts before the show's own name (linkRead.titleDrop).
  if(lr&&lr.titleDrop)base=base.replace(lr.titleDrop,"").trim()||base;
  const between=lr&&lr.title?[]:lines.slice(h+1,d).map(stripMd).filter(l=>l&&l.length<=120&&!foldText(base).includes(foldText(l)));
  const dateLine=decodeEntities(stripMd(lines[d])).replace(/\s+/g," ").trim();
  const keepDateLine=dateLine.length>LINK_DATE_LINE_MAX;
  const headingText=decodeEntities(heading).replace(/\s+/g," ").trim();
  let raw="";
  const seenLines=new Set();
  let from=h+1;
  if(lr&&lr.from){
    for(let k=h+1;k<lines.length;k++){ if(lr.from.test(stripMd(lines[k]))){ from=k+1; break; } }
  }
  for(let k=from;k<lines.length&&raw.length<LINK_RAW_CHARS;k++){
    const own=stripMd(lines[k]);
    // The passage ends at the first line matching linkRead.until (a box for other shows).
    if(lr&&lr.until&&lr.until.test(own))break;
    if(lr&&((lr.skip&&lr.skip.test(own))||(lr.skipEntities&&/&#?\w+;/.test(own))))continue;
    const l=decodeEntities(own).replace(/\s+/g," ").trim();
    if(!l||(l===dateLine&&!keepDateLine)||l===headingText||seenLines.has(l)||(lr&&lr.minLine&&l.length<lr.minLine))continue;
    seenLines.add(l);
    raw+=(raw?"\n":"")+l;
  }
  // The first line under the heading, for a venue whose subtitle sits there.
  const under=lines.slice(h+1).map(stripMd).find(Boolean)||"";
  const link=lr&&lr.cleanLink?String(url).split(/[?#]/)[0]:url;
  return{ok:true,base,between,under,start:range.start||"",end:range.end||"",raw:raw.slice(0,LINK_RAW_CHARS),site:site||host.replace(/^www\./,""),link};
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

function linkPrompt(page){
  const ex=SUMMARY_EXAMPLES.map(e=>"RAW: "+e.raw+"\nACCEPTED SUMMARY: "+e.summary).join("\n\n");
  return "You are reading one museum exhibition page for a personal art-catalogue tracker. Your ONLY output is one JSON object.\n\n"
    +"EXHIBITION TITLE, as the page gives it: "+JSON.stringify(page.base)+"\n"
    +(page.between.length?"LINES BETWEEN THE TITLE AND THE DATES: "+JSON.stringify(page.between)+"\n":"")
    +"RAW TEXT (the page under the title, dates taken out):\n\"\"\"\n"+page.raw+"\n\"\"\"\n\n"
    +"EXAMPLES of the required summary style — a venue's raw text, and the summary that was accepted:\n\n"+ex+"\n\n"
    +"RULES FOR THE SUMMARY:\n"+SUMMARY_RULES+"\n\n"
    +"Answer with exactly these keys:\n"
    +"\"summary\": the summary, following the rules above — or null if the raw text does not describe an exhibition.\n"
    +(page.between.length?"\"subtitle\": if one of the LINES BETWEEN THE TITLE AND THE DATES is the second part of the exhibition's own name — the part a catalogue's title would carry after the main title — copy that line exactly as written. Otherwise \"\". Never a category (\"Special Exhibition\"), a sponsor, a place, a price or a date.\n":"")
    +"\"english\": the exhibition's title"+(page.between.length?" (with the subtitle you gave, if any)":"")+" in natural English if it is not in English; \"\" if it already is, names aside. Keep every name as written and the title's own full stops. Plain words: no \"In English\", no quotation marks.\n"
    +"\"englishSpeaking\": true if the museum is in an English-speaking country, false if not.";
}

// What the model said, checked. Wording is not a control.
function linkAnswer(a){
  const o=a&&typeof a==="object"?a:{};
  const str=v=>typeof v==="string"?v.replace(/["“”]/g,"").replace(/\s+/g," ").trim():"";
  return{summary:typeof o.summary==="string"?o.summary.trim():"",subtitle:typeof o.subtitle==="string"?o.subtitle.trim():"",
    english:str(o.english).replace(/^In English:\s*/i,""),englishSpeaking:o.englishSpeaking!==false};
}

function occVenueId(host){
  return "occ-"+String(host||"").toLowerCase().replace(/^www\./,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

// A link to one of the swept venues files under it, matched by site from the scraper's
// recipes (VENUE_SITES, written by sync_shared); the Tates are told apart by path.
function knownVenueFor(url){
  const h=hostOf(url).replace(/^www\./,"");
  if(!h)return null;
  let path="";
  try{ path=new URL(url).pathname; }catch{}
  const hit=VENUE_SITES.find(v=>v.host===h&&(!v.path||path.startsWith(v.path)));
  return hit?hit.id:null;
}

// An occasional venue: kept in the page's store (a fact about the world, like the sweep
// log) and registered into MU, so everything reads it like any venue. One chip,
// "Occasional" (her decision).
//   shop: "found" (books section), "noshelf" (a shop, no books section), "none" (no
//   shop; confirmed = her "No shop", lookups go to the web), "failed" (a step died —
//   not an answer), "unknown" (look again on the next link). Lookups use "found", and
//   "noshelf" once its search is proved.
function occEntry(v){
  const live=v.shop==="found"||(v.shop==="noshelf"&&!!v.shopSearch);
  // `short` is her name for the venue's cards, written into the store by a session;
  // the page title's name stands until then.
  return{id:v.id,short:v.short||v.name,name:v.name,occasional:true,english:v.english===false?false:undefined,
    exBase:null,listUrl:null,
    shopHome:live?v.shopHome||null:null,shopCatalogues:live?v.shopCatalogues||null:null,shopSearch:live?v.shopSearch||null:null,
    shopUnknown:!live&&!(v.shop==="none"&&v.confirmed)};
}
// Every venue a card can be filed under: hers in order, then occasional ones by name.
// The review walks THIS, not MUSEUMS, or occasional cards are counted and never drawn.
function allVenues(){
  const occ=Object.values(MU).filter(m=>m&&m.occasional).sort((a,b)=>a.short.localeCompare(b.short));
  return MUSEUMS.concat(occ);
}
function venueRank(id){ const i=allVenues().findIndex(m=>m.id===id); return i<0?1e6:i; }
function registerOccasional(map){
  for(const v of Object.values(map||{})){ if(!v||!isOcc(v.id))continue; MU[v.id]=occEntry(v); KNOWN_VENUES.add(v.id); }
}
// A ledger row from a venue this page's store has never seen (her file opened
// on another page): filed under its own address, shop not known.
function registerUnseenOccasional(rows){
  for(const r of rows||[]){
    if(!isOcc(r.museumId)||MU[r.museumId])continue;
    const name=hostOf(r.exUrl).replace(/^www\./,"")||r.museumId.slice(4);
    MU[r.museumId]={id:r.museumId,short:name,name,occasional:true,exBase:null,listUrl:null,shopHome:null,shopCatalogues:null,shopSearch:null,shopUnknown:true};
    KNOWN_VENUES.add(r.museumId);
  }
}

async function readOccasional(){
  const db=await useCap("db");
  if(!db)return{};
  try{ const s=await db.doc(OCC_DOC).get(); return s.exists?((s.data()||{}).venues||{}):{}; }catch{ return {}; }
}
async function writeOccasional(map){
  const db=await useCap("db");
  if(!db)return false;
  try{ await db.doc(OCC_DOC).set({venues:map,updatedAt:new Date().toISOString()}); return true; }catch{ return false; }
}
async function readPendingLinks(){
  const db=await useCap("db");
  if(!db)return"";
  try{ const s=await db.doc(LINKS_DOC).get(); return s.exists?String((s.data()||{}).text||""):""; }catch{ return ""; }
}
async function writePendingLinks(text){
  const db=await useCap("db");
  if(!db)return false;
  try{ await db.doc(LINKS_DOC).set({text:String(text||""),updatedAt:new Date().toISOString()}); return true; }catch{ return false; }
}

// ── FINDING A NEW VENUE'S SHOP SECTION — once per venue, then kept ─────────
// Wanted: the shop's exhibition-catalogues section, else books / publications; never
// the front page, one book or a post (her decision; docs/picked_shows.md). Each step
// runs only if the one before found nothing: 1. one search call, two queries, every
// result ranked in code; 2. a Shopify shop's collections.json; 3. the shop's menu.
// The pick is opened and must read as books with prices. "Look again" skips only the
// pages she turned down, never the site. Evidence: docs/link_pages/shop_search/.
const SHOP_WORDS=/^(?:the\s+)?(?:museum\s+|online\s+|gift\s+|book)?(?:shop|store|boutique|tienda|winkel|webshop|museumshop|negozio|librairie|bookshop)(?:\s+online)?$/i;
const SHOP_HOST=/^(?:shop|store|boutique|tienda|winkel|webshop|bookshop|negozio|museumshop)\.|shop/i;
const SHOP_PATH=/\/(?:shop|store|boutique|tienda|winkel|webshop|negozio|bookshop)(?:\/|$)/i;
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
  const links=mdLinks(text);
  const named=links.find(l=>SHOP_WORDS.test(l.label));
  if(named)return named.url;
  const byHost=links.find(l=>hostOf(l.url)!==museumHost&&SHOP_HOST.test(hostOf(l.url)));
  return byHost?originOf(byHost.url):"";
}
// The museum's own shop: its show page's shop link's site, a shop on the museum's own
// domain (shop.courtauld.ac.uk, a /shop path), or a shop site carrying the museum's
// name (diashop.org). A reseller's shelf for the museum is not.
function isShopPlace(u,museumHost,pageShopHost){
  const h=hostOf(u).replace(/^www\./,"");
  if(!h)return false;
  if(pageShopHost&&h===pageShopHost.replace(/^www\./,""))return true;
  const b=baseDomain(museumHost), hb=baseDomain(h), label=b.split(".")[0], hl=hb.split(".")[0];
  if(hb===b){ let path=""; try{ path=new URL(u).pathname; }catch{} return SHOP_HOST.test(h)||SHOP_PATH.test(path); }
  return label.length>=3&&hl!==label&&hl.includes(label)&&SHOP_HOST.test(hl);
}
// A section names itself in the plural — one book's page or a blog post is not a
// section. Words are read with accents folded.
const SHELF_CATALOGUES=/\bcatalog(?:ue)?s\b|\bcatalogos\b|\bcatalogi\b|\bcataloghi\b|\bkataloge\b/;
const SHELF_BOOKS=/\bbooks\b|\bpublications\b|\bpublicaciones\b|\bpublicaties\b|\bpubblicazioni\b|\blivres\b|\blibros\b|\bboeken\b|\bbucher\b|\blibri\b/;
// A section that says it is NOT books ("All Products (not Catalogues)") is not one.
const SHELF_NOT=/\b(?:not|non|sin|sans|ohne|niet|geen|zonder|except)\b\W+(?:\w+\W+)?(?:catalog|book|boek|libr|livre|public)/;
// A sale or clearance section holds only some of the books ("Catálogos en
// oferta", Thyssen): kept as a last resort, never ahead of a whole section.
const SHELF_SALE=/\b(?:sale|clearance|offers?|outlet|ofertas?|rebajas|saldi|soldes|korting|aanbieding|black friday|promo\w*)\b/;
// Books and only books (her decision): a section mixing books with other goods
// ("Books & Stationery") is never the shelf; it is opened for a books-only section
// inside it. A museum's own publications rank above a general books section.
const SHELF_PUBS=/\bpublications\b|\bpublicaciones\b|\bpublicaties\b|\bpubblicazioni\b/;
const SHELF_GOODS=/\b(?:stationery|stationary|gifts?|toys|games|apparel|clothing|jewell?ery|accessories|homeware|home goods|decor|cards|notecards|journals|notebooks|prints|posters|supplies|merch\w*|souvenirs?|papeterie|cadeaux|jouets|regalos|papeleria|juguetes|cadeaus|speelgoed|regali|cartoleria|giochi)\b/;
const NOT_A_SHELF=/\/(?:products?|p|blogs?|news|journal|articles?|stories|pages|account|cart)\/|[?&]q=|\/search/i;
function pathWords(u){ try{ return decodeURIComponent(new URL(u).pathname).replace(/[-_/.]/g," "); }catch{ return ""; } }
function isFrontPage(u){ try{ return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/?)?$/i.test(new URL(u).pathname); }catch{ return true; } }
// Candidates, best first: a catalogues section, then the museum's
// publications, then books; a sale section after all of them. Ties keep the
// order they came in (the search's own). A books section mixed with other
// goods comes back apart, as `mixed` — never a pick, only a place to look in.
function rankShelves(cands){
  const out=[], mixed=[];
  cands.forEach((c,n)=>{
    if(!c||!c.url||NOT_A_SHELF.test(c.url)||isFrontPage(c.url))return;
    const t=foldText(c.words).replace(/\bgift ?shop\b|\bmuseum stores?\b/g," ");
    if(SHELF_NOT.test(t))return;
    const kind=SHELF_CATALOGUES.test(t)?"catalogues":SHELF_PUBS.test(t)?"publications":SHELF_BOOKS.test(t)?"books":null;
    if(!kind)return;
    if(kind==="books"&&SHELF_GOODS.test(t)){ mixed.push(c); return; }
    out.push({...c,kind,score:({catalogues:3,publications:2,books:1})[kind]-(SHELF_SALE.test(t)?2.5:0),n});
  });
  out.sort((a,b)=>b.score-a.score||a.n-b.n);
  out.mixed=mixed;
  return out;
}
// A SHELF OF BOOKS, READ OFF ITS TEXT: book words and prices, both plural.
const BOOK_WORD=/\bisbn\b|\bhard(?:cover|back)\b|\bpaperback\b|\bsoftcover\b|\bpages\b|\bcatalog(?:ue|o|us)?s?\b|\bcatalogi\b|\bkataloge?\b|\bbooks?\b|\bboek(?:en)?\b|\blibros?\b|\blivres?\b|\bbuch\b|\btapa (?:dura|blanda)\b/g;
const PRICE=/[$€£]\s?\d|\d[.,]\d{2}\s?(?:€|eur\b|usd\b|gbp\b|\$|£)/g;
function looksLikeBookShelf(text){
  const t=foldText(text);
  return (t.match(BOOK_WORD)||[]).length>=3&&(t.match(PRICE)||[]).length>=2;
}
// A Shopify shop's sections, read as text (a long list can come back cut short); empty
// ones skipped; ranked on the TITLE her menu shows, never the handle.
function shopifySections(text,root){
  const out=[];
  for(const chunk of String(text||"").split(/\{\s*"id"\s*:/).slice(1)){
    const t=(chunk.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)||[])[1];
    const h=(chunk.match(/"handle"\s*:\s*"([^"]+)"/)||[])[1];
    const n=(chunk.match(/"products_count"\s*:\s*(\d+)/)||[])[1];
    if(!t||!h||n==="0")continue;
    let title=t; try{ title=JSON.parse('"'+t+'"'); }catch{}
    out.push({url:root+"collections/"+h,words:title});
  }
  return out;
}
// The shop's root, keeping a language path its own link chose ("/en/").
function shopRootOf(u){
  try{ const x=new URL(u); const lang=(x.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)(?:\/|$)/i)||[])[1]; return x.origin+"/"+(lang?lang+"/":""); }catch{ return ""; }
}
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
// died → undefined, asked again next time. AL-008k, AL-014.
const SEARCH_SHAPES=["search?q=","search.php?search_query=","catalogsearch/result/?q=","?post_type=product&s="];
const PRICE_ONE=new RegExp(PRICE.source,"i");
function booksSeenOn(text,host){
  const out=[], seen=new Set();
  for(const m of String(text||"").matchAll(/\[([^\]\[]{3,160})\]\((https?:\/\/[^)\s]+)\)([^\[\n]{0,40})/g)){
    if(!PRICE_ONE.test(m[3])||hostOf(m[2])!==host)continue;
    let path=""; try{ path=new URL(m[2]).pathname; }catch{ continue; }
    if(path.length<3||/cart|wishlist|account|login/i.test(m[2])||seen.has(path))continue;
    seen.add(path); out.push({label:stripMd(m[1]),path});
  }
  return out;
}
async function proveShopSearch(text,home){
  const host=hostOf(home), books=booksSeenOn(text,host).slice(0,2);
  if(!host||!books.length)return null;
  const bases=[...new Set([originOf(home),shopRootOf(home)])].filter(Boolean);
  const tries=[];
  for(const b of bases)for(const sh of SEARCH_SHAPES)for(const bk of books)tries.push({search:b+sh,path:bk.path,url:b+sh+encodeURIComponent(bk.label)});
  const f=await fetchPage(tries.map(t=>t.url),"The products this shop search returns: their names and links.",null,{full:true});
  if(!f.ok)return undefined;
  const key=u=>{ try{ return decodeURIComponent(normalizeUrlKey(u)).replace(/\+/g," "); }catch{ return normalizeUrlKey(u); } };
  for(const t of tries){
    const r=f.results.find(x=>x&&key(x.url)===key(t.url));
    if(r&&pageTextOf([r]).includes(t.path))return t.search;
  }
  return null;
}
const SHELF_OPENS=2;   // at most two candidates opened to check, then the next step
// pageShop: the show page's own shop link (shopLinkOnPage), kept on the venue
// so "Look again" has it without reading the show page twice.
async function discoverShop(pageShop,museumHost,venueName,turnedDown){
  const no=new Set((turnedDown||[]).map(normalizeUrlKey));
  const pageShopHost=hostOf(pageShop);
  const place=u=>isShopPlace(u,museumHost,pageShopHost);
  let opens=0, seenText="", died=null;
  const tryCands=async(cands,how,inside)=>{
    const ranked=rankShelves(cands);
    for(const c of ranked){
      if(no.has(normalizeUrlKey(c.url)))continue;
      if(c.proof&&looksLikeBookShelf(c.proof))return{...c,how};
      if(opens>=SHELF_OPENS)return null;
      opens++;
      const f=await fetchPage(c.url,"The books in this section of the shop, with their prices.",null,{full:true});
      if(!f.ok){ died=f.detail; continue; }
      const t=pageTextOf(f.results); seenText+="\n"+t;
      if(looksLikeBookShelf(t))return{...c,how};
    }
    // Nothing books-only: open the first mixed section and try the sections
    // listed inside it. One level down, once.
    if(inside||!ranked.mixed.length)return null;
    const m=ranked.mixed[0];
    const f=await fetchPage(m.url,"The sections listed on this page: their names and links.",null,{full:true});
    if(!f.ok){ died=f.detail; return null; }
    const t=pageTextOf(f.results); seenText+="\n"+t;
    const mh=hostOf(m.url);
    const subs=mdLinks(t).filter(l=>hostOf(l.url)===mh&&l.label.split(/\s+/).length<=6).map(l=>({url:l.url,words:l.label+" "+pathWords(l.url)}));
    const keep=opens; opens=0;
    const r=await tryCands(subs,how,true);
    opens=keep;
    return r;
  };
  // 1. The search: one call, two queries — hers and the books section's (Detroit's
  // "DIA Publications" came back only with both).
  const s=await searchWeb("The museum shop's exhibition catalogues or books section of "+venueName+".",[venueName+" shop exhibition catalogues",venueName+" shop books publications"]);
  if(!s.ok)died=s.detail;
  const mine=(s.results||[]).filter(r=>r&&place(r.url));
  seenText+="\n"+mine.map(r=>r.url).join("\n");
  const root=pageShop?shopRootOf(pageShop):mine.length?shopRootOf(mine[0].url):"";
  opens=0;
  let pick=await tryCands(mine.map(r=>({url:r.url,words:(r.title||"")+" "+pathWords(r.url),proof:(r.excerpts||[]).join("\n")})),"a search");
  // 2. A Shopify shop's list of its sections.
  if(!pick&&root&&/\/(?:collections|products)\//i.test(seenText)){
    const f=await fetchPage(originOf(root)+"collections.json?limit=250","The shop's sections: titles and handles.",null,{full:true});
    if(f.ok){ opens=0; pick=await tryCands(shopifySections(pageTextOf(f.results),root),"the shop's list of sections"); }
    else died=f.detail;
  }
  // 3. The front page's menu.
  if(!pick&&root){
    const f=await fetchPage(root,"The shop's menu: its exhibition catalogues and books sections.",null,{full:true});
    if(f.ok){
      const t=pageTextOf(f.results); seenText+="\n"+t;
      const rh=hostOf(root);
      const menu=mdLinks(t).filter(l=>hostOf(l.url)===rh&&l.label.split(/\s+/).length<=6).map(l=>({url:l.url,words:l.label+" "+pathWords(l.url)}));
      opens=0; pick=await tryCands(menu,"the shop's menu");
    }else died=f.detail;
  }
  if(pick){
    const home=root||pick.url, seen=seenText+"\n"+(pick.proof||"");
    return{shop:"found",shopHome:originOf(home),shopCatalogues:pick.url,shelfKind:pick.kind,
      shopSearch:searchFor(seen+"\n"+pick.url,home)||(await proveShopSearch(seen,home))||null,foundBy:pick.how,finder:3};
  }
  // A step that died is not an answer: said as such, not as "nothing found".
  if(died)return{shop:"failed",shopHome:root?originOf(root):null,why:died,finder:3};
  // A shop with no books section is still searched, as KHM's is.
  return root?{shop:"noshelf",shopHome:originOf(root),shopSearch:searchFor(seenText,root)||(await proveShopSearch(seenText,root))||null,finder:3}:{shop:"none",finder:3};
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

// Every decided card lands in one count — to apply, quarantined or rejected — so the
// footer adds up (her ask). The counts and the link box both use cardOutcome.
function cardOutcome(p,dec){
  dec=dec||{};
  if(isUndecidedCard(p,dec))return"undecided";
  if(p.type==="add")return dec.mode==="accept"?"accepted":dec.mode==="never"?"quarantined":"rejected";
  if(dec.mode==="addnew")return"accepted";
  return Object.values(dec.fields||{}).some(v=>v==="accept")?"accepted":"rejected";
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

// ===== PARTIAL APPLY — stays until she says (CLAUDE.md §4) =====
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
function dateRange(r){const a=fmtDate(r.startDate),b=fmtDate(r.endDate);if(a&&b)return a+" \u2014 "+b;if(b)return"until "+b;if(a){const st=new Date(r.startDate+"T00:00:00");const past=!isNaN(st)&&st<=new Date();return(past?"open since ":"opens ")+a;}return"dates unknown";}

// The shop link searches by the EXHIBITION's title (her decision): shops index the
// show's name; resellers use the ISBN or the book's title. Booko AU: booko.au/<isbn>,
// or its title search with no ISBN.
function buyLinks(r){const isbn=cleanIsbn(r.isbn13),title=r.catalogueTitle||r.title,q=encodeURIComponent(isbn||title),tq=encodeURIComponent(title),mu=MU[r.museumId],out=[];if(r.shopUrl)out.push({name:shopLinkLabel(r.shopState),href:r.shopUrl});else if(mu&&mu.shopSearch)out.push({name:"Museum shop",href:mu.shopSearch+encodeURIComponent(r.title)});else if(mu&&mu.shopHome)out.push({name:"Museum shop",href:mu.shopHome});if(r.publisherUrl)out.push({name:publisherLinkLabel(r.publisherResult),href:r.publisherUrl});out.push({name:"Amazon AU",href:"https://www.amazon.com.au/s?k="+q},{name:"AbeBooks AU",href:"https://www.abebooks.com/servlet/SearchResults?ds=30&dym=on&kn="+(isbn||tq)+"&rollup=on&sortby=17"},{name:"Alibris",href:"https://www.alibris.com/booksearch?keyword="+q},{name:"Booko AU",href:isbn?"https://booko.au/"+isbn:"https://booko.au/search?query_type=1&q="+tq.replace(/%20/g,"+")});return out;}

// ── FINDING A CATALOGUE (docs/app.md §1; CLAUDE.md §4 "Catalogue lookup") ────
// The page cannot reach the internet, so searching and reading go through her keyed
// connector, and `sample` asks Claude to read only the text handed to it — it can
// never report a page that was not found.
// SEARCH_SERVER must match the connector name in the page's published `mcp`
// capability (CLAUDE.md §4).
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
    return await window.claude.use(name);
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
  if(code==="rate_limited")       return "Too many searches just now. Leave it a minute.";
  if(code==="cancelled")          return "Search stopped.";
  return "Search failed ("+(code||"unknown")+").";
}

// Ask the connector. Returns {ok, results, detail} — never throws.
async function searchWeb(objective,queries){
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
  const sample=await useCap("sample");
  if(!sample)return{ok:false,data:null,detail:"Claude isn\u2019t available to this page in this viewer."};
  try{
    const data=await sample.json(prompt,{modelTier:"default"});
    return{ok:true,data,detail:"read the results"};
  }catch(e){
    const code=String((e&&e.code)||"");
    let why="Couldn\u2019t read the search results ("+(code||"unknown")+").";
    if(code==="not_granted")       why="You declined to let this page use Claude. Reload and allow it to search.";
    else if(code==="rate_limited") why="Claude is rate-limited right now \u2014 leave it a minute.";
    else if(code==="invalid_json") why="Claude\u2019s answer came back unreadable. Try again.";
    return{ok:false,data:null,detail:why+"  ["+String((e&&e.message)||e)+"]"};
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
  if(!db) return {log:{},why:"This page can\u2019t reach its sweep log in this viewer."};
  try{
    const snap=await db.doc(SWEEP_LOG_DOC).get();
    if(!snap.exists) return {log:{},why:null};
    const d=snap.data()||{};
    const log=(d.venues&&typeof d.venues==="object")?d.venues:{};
    return {log,why:null};
  }catch(e){
    const code=String((e&&e.code)||"");
    if(code==="not_granted") return {log:{},why:"You declined this page access to its sweep log."};
    return {log:{},why:"Couldn\u2019t read the sweep log ("+(code||"unknown")+")."};
  }
}

async function writeSweepLog(next){
  const db=await useCap("db");
  if(!db) return false;
  try{ await db.doc(SWEEP_LOG_DOC).set({venues:next,updatedAt:new Date().toISOString()}); return true; }
  catch{ return false; }
}

async function readQuarantine(){
  const db=await useCap("db");
  if(!db) return {map:{},why:"This page can\u2019t reach its quarantine list in this viewer, so nothing is being blocked."};
  try{
    const snap=await db.doc(QUARANTINE_DOC).get();
    if(!snap.exists) return {map:{},why:null};
    const d=snap.data()||{};
    return {map:(d.rows&&typeof d.rows==="object")?d.rows:{},why:null};
  }catch(e){
    const code=String((e&&e.code)||"");
    if(code==="not_granted") return {map:{},why:"You declined this page access to its quarantine list."};
    return {map:{},why:"Couldn\u2019t read the quarantine list ("+(code||"unknown")+")."};
  }
}

async function writeQuarantine(next){
  const db=await useCap("db");
  if(!db) return false;
  try{ await db.doc(QUARANTINE_DOC).set({rows:next,updatedAt:new Date().toISOString()}); return true; }
  catch{ return false; }
}

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

// ── A MUSEUM'S OWN IMPRINT HAS NO PUBLISHER PAGE TO FIND (CLAUDE.md §4) ──────
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
// shopState: "shop" | "gone" | "web" | "none" | "blocked" | null; "gone" keeps shopUrl.
// "blocked": the shop refused every page opened, so whether the book is there is
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

// A blocked shop says so, in her wording (CLAUDE.md §4): the headline in the red and
// weight of "No longer in the museum shop.", the rest grey.
const SHOP_BLOCKED_HEAD="The museum shop is blocked";
const SHOP_BLOCKED_FOUND_REST=" - search it manually. The catalogue is stocked elsewhere.";
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
  return found.size===1?[...found.values()][0]:null;
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
// CLAUDE.md §4) Its publisher shares the original's distinctive words (Fonds Mercator ~
// Mercatorfonds), or a result carrying its ISBN names the venue by its full, chip or
// card name.
function sameCatalogue(edPublisher,origPublisher,isbnResults,museumId){
  const words=n=>normPublisher(n).split(" ").filter(w=>w.length>2&&!PUBLISHER_WORDS.has(w)&&!["fonds","musee","museum","museo","galleria","gallery"].includes(w));
  const a=words(edPublisher), b=words(origPublisher);
  if(a.length&&b.length&&b.every(w=>a.some(x=>x.includes(w)||w.includes(x))))return true;
  const mu=MU[museumId];
  const names=(mu?[mu.name,mu.short,mu.card]:[]).map(words).filter(v=>v.length);
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
function publisherOnIsbnResults(results,isbn){
  const d=String(isbn||"").replace(/\D/g,"");
  if(d.length!==13)return null;
  const groups=[];
  for(const r of (results||[])){
    const text=(r&&r.title||"")+"\n"+oneText(r);
    if(!text.replace(/[^0-9]/g,"").includes(d)&&!String((r&&r.url)||"").includes(d))continue;
    const seen=new Set();
    for(const m of text.matchAll(PUBLISHER_LABEL)){
      const name=stripMd(m[1]).replace(/[\s.,;:]+$/,"").trim();
      const w=houseWords(name);
      if(!w.length)continue;
      let g=groups.find(g=>w.some(x=>g.words.some(y=>x.includes(y)||y.includes(x))));
      if(!g){ g={words:w,names:[],votes:0}; groups.push(g); }
      if(seen.has(g))continue;
      seen.add(g); g.votes++; g.names.push(name);
    }
  }
  groups.sort((a,b)=>b.votes-a.votes);
  const top=groups[0];
  if(!top||top.votes<2||(groups[1]&&groups[1].votes===top.votes))return null;
  // The spelling most results use, ordinary capitals preferred over SHOUTING.
  const count=new Map();
  for(const n of top.names)count.set(n,(count.get(n)||0)+1);
  return [...count.entries()].sort((a,b)=>b[1]-a[1]||(a[0]===a[0].toUpperCase())-(b[0]===b[0].toUpperCase()))[0][0];
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
  return head?[head+" "+(mu.card||mu.short)+" "+word+year]:[];
}

// The English-edition line on a foreign book: how far an English edition was looked
// for (her decision), or which original the English edition on the card translates.
// It never restates the publisher-page status. Null: nothing to say.
function englishLine(r){
  const c=r&&r.englishCheck;
  const o=r&&r.originalEdition;
  if(c==="english"&&o&&o.title)return "English edition of \u201c"+o.title+"\u201d"+(o.publisher?" ("+o.publisher+")":"")+".";
  // Her wording.
  if(c==="publisher")return "No English edition - checked publisher's site"+(r.publisher?" ("+r.publisher+")":"")+" and bookshops.";
  if(c==="shops")return "No English edition found in bookshops.";
  if(c==="unknownlang")return "The book\u2019s language couldn\u2019t be confirmed, so no English edition was looked for.";
  if(c==="stopped")return "English edition not checked \u2014 the search stopped part-way. Search again to retry.";
  return null;
}

// The shop button's label. "(last seen)" is what tells her the page may be
// dead or sold out while the link is still worth keeping.
function shopLinkLabel(shopState){ return shopState==="gone"?"Museum shop (last seen)":"Museum shop"; }

// Reset cards (her design): every lookup field blank, her marks kept, so the next
// "Find catalogue" runs the whole route.
function resetCard(r){
  return{...r,looked:false,hasCatalogue:"unknown",catalogueTitle:null,isbn13:null,publisher:null,
    publisherUrl:null,publisherResult:null,shopUrl:null,shopState:null,shopChange:null,englishCheck:null,originalEdition:null};
}
// The cards Reset cards can offer: searched ones whose title, catalogue title
// or venue carry what she typed. Accents and capitals do not count.
function cardsToReset(rows,q){
  const k=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
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
async function readShopPage(book,url,io){
  const f=await (io?io.fetch:fetchPage)(url,
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
  if(p.kind==="norun")return{ok:false,detail:p.detail,said:"Re-check didn’t run — "+p.why+" Nothing changed."};
  if(p.kind==="gone")return{ok:true,detail:p.detail,row:{...row,shopState:"gone",shopChange:null},
    said:hadIt?"Re-checked: that shop page no longer exists. Marked no longer in the museum shop."
              :"Re-checked: that shop page still doesn’t exist. Still no longer in the museum shop."};
  if(p.kind==="unreadable")return{ok:false,detail:p.detail,
    said:"Re-check didn’t work — the shop page couldn’t be read"+(p.why?" ("+p.why+")":"")+". Nothing changed."};
  if(p.kind==="noread")return{ok:false,detail:p.detail,said:"Re-check didn’t finish — "+p.why+" Nothing changed."};
  if(p.kind==="badanswer")return{ok:false,detail:p.detail,said:"Re-check didn’t finish — the answer came back unreadable. Nothing changed."};
  if(p.forSale){
    if(hadIt)return{ok:true,detail:p.detail,row,said:"Re-checked: still for sale in the museum shop. Nothing changed."};
    return{ok:true,detail:p.detail,row:{...row,shopState:"shop",shopChange:"back"},said:"Re-checked: back in the museum shop."};
  }
  return{ok:true,detail:p.detail,row:{...row,shopState:"gone",shopChange:null},
    said:(hadIt?"Re-checked: no longer for sale in the museum shop.":"Re-checked: still not for sale in the museum shop.")+(p.why?" "+p.why:"")};
}

// ── THE CATALOGUE LOOKUP (docs/app.md §1; CLAUDE.md §4 "Catalogue lookup") ─────
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
// `blocked`: the shop step was refused on every page; the row says so.
function settle(row,o,dom,detail,fromShopStage,blocked,seen){
  const link=isTicketLink(o.shopUrl)?null:(o.shopUrl||null);
  const onShop=!!shopLinkOf(o,dom);
  if(o.found&&(o.catalogueTitle||o.isbn13)){
    // pageUrl is carried BESIDE the row: the book's page may be a shop's or a
    // publisher's, and only a link on the venue's shop is filed as shopUrl.
    return{ok:true,detail,pageUrl:link,
      shopCandidate:(!fromShopStage&&onShop)?link:null,
      row:{...row,looked:true,hasCatalogue:"yes",
      shopState:fromShopStage?"shop":blocked?"blocked":"web",shopChange:null,
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
    return{ran:true,ok:true,blocked:true,detail:s1.detail+"\nThe museum shop refused every page, so it could not be searched.",data:null};
  if(!s1.results.length)return{ran:true,ok:true,detail:s1.detail,data:null};
  // Every page empty is blocked too (her decision, MoMA Brancusi: books drawn by
  // script). But short excerpts are not an empty page (her Watteau): the pages are
  // opened again whole, and the shop is blocked only if they are still empty or show
  // no price anywhere.
  let shop=s1;
  if(s1.results.every(r=>pageIsShell([r]))){
    const whole=await io.fetch(shopPages,"The books in this section of the shop, with their prices.",null,{full:true});
    if(!whole.ok)return{ran:true,ok:false,detail:s1.detail+"\n"+whole.detail,data:null};
    const books=whole.results.filter(r=>!pageIsShell([r])&&SHOP_PRICE.test(oneText(r)));
    if(!books.length)
      return{ran:true,ok:true,blocked:true,detail:s1.detail+"\n"+whole.detail+"\nThe museum shop’s pages came back with no books on them, so it could not be searched.",data:null};
    shop={...whole,detail:s1.detail+"\n"+whole.detail+"\nThe shop’s pages, read whole: books on them, none about this show in the excerpts."};
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
  const f=await io.fetch(hit.pageUrl,
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
    .concat(head&&mu?[head+" "+(mu.short||mu.card||mu.name)+" catalogue English edition"]:[])
    .concat(pub?[String(row.title||"").trim()+" "+pub+" ISBN"]:[]);
}

// A record tying a translation to its original: one of these phrases, folded.
const EDITION_LINK=/originally published|english edition|translated from|translation of|edition anglaise|traduction|edizione inglese|englische ausgabe|engelse editie/;
const TITLE_STOP=new Set([...FOCUS_STOP,"dans","pour","avec","della","delle","dello","degli","eine","einer","sous","voor","over"]);
function titleWords(t){
  return [...new Set(foldText(t).split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!TITLE_STOP.has(w)))];
}
// Everything a result carries: its title, its address and its text, whole and excerpted.
function resultText(x){
  return [x&&x.title,x&&x.url,x&&typeof x.full_content==="string"?x.full_content:"",
    Array.isArray(x&&x.excerpts)?x.excerpts.join("\n"):""].filter(Boolean).join("\n");
}

// Is one of Claude's editions an English edition of THIS catalogue? Decided in code
// (her Botticelli; CLAUDE.md §4). A fetched result must carry its ISBN, and that same
// result must show the link: the same house as the original or the venue named
// (sameCatalogue), the original's ISBN, or a linking phrase with every key word of
// the original's title (Hammershøi's library record).
function englishEditionOf(editions,orig,results,museumId){
  const origPub=orig&&orig.publisher?publisherToFind(orig.publisher,museumId):null;
  const keys=titleWords(orig&&orig.title);
  for(const ed of (Array.isArray(editions)?editions:[])){
    if(!ed||!ed.title||!isEnglishLang(ed.language))continue;
    const en=toIsbn13(ed.isbn13,results||[]);
    if(!en||en===(orig&&orig.isbn13))continue;
    const onEn=(results||[]).filter(x=>isbnInText(en,resultText(x)));
    const coded=publisherOnIsbnResults(onEn,en);
    const pub=coded||(ed.publisher?String(ed.publisher).trim():null);
    let why=null;
    if(sameCatalogue(pub,origPub,onEn,museumId))why="the same publisher as the original, or the venue named";
    else if(orig&&orig.isbn13&&onEn.some(x=>isbnInText(orig.isbn13,resultText(x))))why="a record carrying both ISBNs";
    else if(keys.length&&onEn.some(x=>{ const t=foldText(resultText(x)); return EDITION_LINK.test(t)&&keys.every(w=>t.includes(w)); }))
      why="a record naming it a translation of the original";
    if(!why)continue;
    const tp=titleAsPrinted(ed.title,onEn);
    return{title:tp.title,isbn13:en,publisher:pub,pubFromIsbn:!!coded,why,
      evidenceUrl:String((onEn[0]&&onEn[0].url)||ed.evidenceUrl||"")};
  }
  return null;
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
  const shape='{"isbn13": string|null, "publisher": string|null'
    +(q.bookPage?', "pagePublisher": string|null, "pagePublisherUrl": string|null':'')
    +(q.foreign?', "language": string|null, "title": string|null, "editions": [{"title": string, "isbn13": string, "language": string, "publisher": string|null, "evidenceUrl": string}]':'')+'}';
  return "You are reading real web text about ONE printed exhibition catalogue: “"+q.book+"”"
    +(q.isbn?", ISBN "+q.isbn:"")+", the catalogue of the exhibition “"+q.show+"” at "+q.venue+".\n"
    +"Use ONLY what the text below says. Never use outside knowledge, never guess an ISBN and never invent a link.\n"
    +"Give every ISBN EXACTLY as printed — a 10-digit one as it stands, never converted.\n"
    +"\"Sold by …\" (“vendu par”, “venduto da”) names the SHOP, never the publisher — "
    +"the Orsay’s shop says “Sold by GrandPalaisRmn” for books Hazan printed. Never report it as publisher.\n"
    +"isbn13: this book's own ISBN, or null.\n"
    +"publisher: the house that printed THIS book, as the search results name it — never a shop or a seller. Null if none says.\n"
    +(q.bookPage?"pagePublisher, pagePublisherUrl: the publisher SECTION A prints for this book, and any link there to the "
      +"PUBLISHER'S OWN page for it (not this shop, not a bookseller). Null if it shows none.\n":"")
    +(q.foreign?"language: the language this book's text is printed in, named in English (French, Italian…), or null if "
      +"nothing says. A bilingual book: name both.\n"
      +"title: this book's title EXACTLY as printed, in its own language — never translated. Null if not shown.\n"
      +"editions: every OTHER edition of this same book the text shows with its own ISBN — a translation, "
      +"such as an English edition, often recorded as “originally published in … as …”. Its title as "
      +"printed, its ISBN, its language, its publisher and the address of the result that shows it. Its publisher "
      +"only where the text names the house that printed THAT edition, else null — “originally published … "
      +"Fonds Mercator” names the original's house, not the translation's. An empty list "
      +"if none. Never invent one.\n":"")
    +"If the text is about a different book, answer null.\n"
    +(q.bookPage?"\nSECTION A — ONE web page in full: the book's own page.\n"+pageForPrompt(q.bookPage.results,12000)+"\n":"")
    +(q.facts.length?"\nSECTION B — web search results about this book.\n"+resultsForPrompt(q.facts,2500,{words:[q.book,q.isbn||""]})+"\n":"")
    +(q.editions.length?"\nSECTION C — web search results about editions of this book in other languages.\n"
      // Every result: Hammershøi's library record came tenth (WL-060).
      +resultsForPrompt(q.editions,2000,{words:[q.book,q.show,"originally published","English edition"]},q.editions.length)+"\n":"")
    +"\nReply with ONLY this JSON object and nothing else:\n"+shape;
}

// The trust order for a publisher: read off the ISBN's results, then printed on the
// book's own shop or publisher page, then Claude's read of general results (a guess).
const PUBLISHER_TRUST={"the ISBN’s results":3,"the museum shop":2,"the book’s page":2,"general results":1};
function sameHouse(a,b){
  const x=houseWords(a), y=houseWords(b);
  return x.some(p=>y.some(q=>p.includes(q)||q.includes(p)));
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
    pubHost=publisherDomainFrom(c.found,pub);
    if(pubHost)log.push("The publisher’s site, read off the results already found: "+pubHost);
    else if((pubHost=listedPublisherSite(pub)))log.push("The publisher’s site, from her list of joint publishers: "+pubHost);
    else{
      const d1=await io.search("The official website of the art-book publisher “"+pub+"”.",[pub,pub+" art book publisher"]);
      log.push(d1.detail);
      if(!d1.ok)return{trouble:d1.detail};
      pubHost=publisherDomainFrom(d1.results,pub);
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
// publisher sentence (publisherNote), englishCheck and originalEdition the English line.
function composeRow(row,F){
  if(!F||!F.found)return{...row,looked:true,hasCatalogue:"no",shopState:F&&F.blocked?"blocked":"none",
    catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,publisherResult:null,
    shopUrl:null,shopChange:null,englishCheck:null,originalEdition:null};
  return{...row,looked:true,hasCatalogue:"yes",
    catalogueTitle:F.title||null,isbn13:F.isbn||null,publisher:F.publisher||null,
    publisherUrl:F.publisherUrl||null,publisherResult:F.publisherResult||null,
    shopState:F.shopState,shopUrl:F.shopUrl||null,shopChange:null,
    englishCheck:F.englishCheck||null,originalEdition:F.original||null};
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
  let hit=null, fromShop=false, blocked=false;
  const s1=await shopStep(row,io);
  if(s1.ran){
    log.push(s1.detail);
    if(!s1.ok)return done({row,ok:false});
    blocked=!!s1.blocked;
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
    if(!s2.results.length)return done({ok:true,row:composeRow(row,{found:false,blocked})});
    const r2=await io.read(READ_RULES
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
    hit=await confirmShopLink(settle(row,d2,dom,"",false,blocked,s2.results),io);
    if(hit&&hit.detail)log.push(hit.detail.trim());
    if(!hit||!hit.row||hit.row.hasCatalogue!=="yes")return done({ok:true,row:composeRow(row,{found:false,blocked})});
  }

  const r=hit.row;
  const F={found:true,title:r.catalogueTitle,isbn:cleanIsbn(r.isbn13),publisher:r.publisher,
    pubFrom:r.publisher?(fromShop?"the museum shop":"general results"):null,
    publisherUrl:r.publisherUrl,publisherResult:null,shopState:r.shopState,shopUrl:r.shopUrl,
    blocked,englishCheck:null,original:null,pubPageRead:false};
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
      const f=await io.fetch(hit.pageUrl,
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
      const rd=await io.read(factsPrompt({book,show:title,venue,isbn:F.isbn,bookPage:page,facts:factsRes,editions:edRes,foreign}));
      log.push(rd.detail);
      if(rd.ok)read=rd.data||{};
      else{ fault(rd.detail); if(foreign)langStopped=true; }
    }
    found2.push(...factsRes,...edRes);
    const given=[...(page?page.results:[]),...factsRes,...edRes];
    // The ISBN: the book's page in code (above), the results in code, then Claude's —
    // only if the text it was given prints it.
    if(!F.isbn){ const c=isbnInResults(factsRes,book); if(c){ F.isbn=c; log.push("ISBN read off the search results in code: "+c); } }
    if(!F.isbn&&read){ const c=toIsbn13(read.isbn13,given); if(c){ F.isbn=c; log.push("ISBN from the read, printed in the results: "+c); } }
    // The publisher, in order of trust (her decision, Botticelli).
    const onIsbn=F.isbn?publisherOnIsbnResults([...(bookPage?bookPage.results:[]),...factsRes,...edRes],F.isbn):null;
    if(onIsbn)offerPublisher(onIsbn,"the ISBN’s results");
    else if(F.isbn&&factsOk)log.push("Publisher from the ISBN: the results carrying it don’t agree on one.");
    if(read){
      offerPublisher(read.pagePublisher,"the book’s page");
      offerPublisher(read.publisher,"general results");
      if(!F.publisherUrl&&read.pagePublisherUrl)F.publisherUrl=publisherLinkOf(read.pagePublisherUrl,F.publisher,dom,row.museumId);
    }
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
    if(onPages){
      F.isbn=onPages; log.push("ISBN read off the pages about this book, in code: "+onPages);
      const p=publisherOnIsbnResults([...found2,...opened],onPages);
      if(p)offerPublisher(p,"the ISBN’s results");
    }
    else log.push("No ISBN in the web search, or on the pages it found about this book.");
  }
  if(F.publisher)log.push("Publisher: "+F.publisher+" — from "+F.pubFrom+(F.pubFrom==="general results"?" (a guess).":"."));

  // ── PHASE 3: WHICH BOOK THE CARD IS ABOUT (code only) — a non-English venue's book
  // not printed in English: an English edition replaces it only when proved.
  let notEnglish=false;
  if(foreign){
    const lang=read&&read.language?String(read.language):"";
    if(langStopped){ F.englishCheck="stopped"; troubleLang=true; }
    else if(!lang){ F.englishCheck="unknownlang"; log.push("Language check: nothing says, so the book stands as found."); }
    else if(isEnglishLang(lang)){ F.englishCheck="english"; log.push("Language check: "+lang+"."); }
    else{
      notEnglish=true;
      // The book's own title, if the results print it.
      const own=read.title?titleAsPrinted(read.title,[...(bookPage?bookPage.results:[]),...factsRes,...edRes]):null;
      if(own&&own.onPage)F.title=own.title;
      log.push("Language check: "+lang+(own&&own.onPage?" — its own title “"+own.title+"”.":"."));
      const ed=englishEditionOf(read.editions,{title:F.title,isbn13:F.isbn,publisher:F.publisher},
        [...(bookPage?bookPage.results:[]),...factsRes,...edRes],row.museumId);
      if(ed){
        log.push("English edition: “"+ed.title+"”, ISBN "+ed.isbn13+" — "+ed.why+" ("+ed.evidenceUrl+").");
        F.original={title:F.title||null,isbn13:F.isbn||null,publisher:F.publisher||null};
        F.title=ed.title; F.isbn=ed.isbn13; F.publisher=ed.publisher||null;
        F.pubFrom=ed.publisher?(ed.pubFromIsbn?"the ISBN’s results":"general results"):null;
        F.publisherUrl=null; F.shopState="web"; F.shopUrl=null; F.englishCheck="english";
      } else{
        F.englishCheck="shops";
        if(Array.isArray(read.editions)&&read.editions.length)log.push("English edition: none proved to be this catalogue's.");
      }
    }
  }

  // ── PHASE 4: THE PUBLISHER'S PAGE, ONCE, FOR THE FINAL BOOK.
  const wantEditions=notEnglish&&!F.original;
  const p4=await findPublisherPage(F,{io,log,row,dom,venue,found:found2,pages,wantEditions});
  if(p4.trouble)fault(p4.trouble);
  if(p4.edition){
    const ed=p4.edition;
    log.push("English edition on the publisher’s own page: “"+ed.title+"”, ISBN "+ed.isbn13+".");
    F.original={title:F.title||null,isbn13:F.isbn||null,publisher:F.publisher||null};
    F.title=ed.title; F.isbn=ed.isbn13;
    F.publisherUrl=ed.link; F.publisherResult=ed.linkResult;
    F.shopState="web"; F.shopUrl=null; F.englishCheck="english";
  } else if(wantEditions){
    // "Checked the publisher's site" only when its page was really read (Canaletto).
    F.englishCheck=F.pubPageRead?"publisher":"shops";
    log.push("English edition: none found"+(F.pubPageRead?" — the publisher’s own page read ("+F.publisherUrl+").":"; the publisher’s own page for it was not read."));
  }

  // ── PHASE 5: THE ROW, ONCE.
  return done({ok:true,row:composeRow(row,F),...(trouble?{trouble}:{}),...(troubleLang?{troubleLang:true}:{})});
}

const LEDGER_PREFIX="cat-watch-ledger-";

// Local 24hr timestamp (browser's timezone), e.g. 2026-08-23-2230 = 10:30pm local.
function localStamp(){const d=new Date(),p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes());}
function localReadable(){const d=new Date(),p=n=>String(n).padStart(2,"0");return p(d.getHours())+":"+p(d.getMinutes())+" "+p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear();}

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
  // Add by link: one pop-up for CSV and Links, nothing added to the page (her design).
  // importMode: null · "choose" · "links" (the box open below them).
  const[importMode,setImportMode]=useState(null);
  // The shop screen, after the review: {partial, ids}. shopLooking: the venue being
  // looked for again.
  const[shopScreen,setShopScreen]=useState(null);
  const[shopLooking,setShopLooking]=useState(null);
  const[readVenues,setReadVenues]=useState([]);   // the new venues the last Read met
  const[linkNote,setLinkNote]=useState(null);
  const[linkText,setLinkText]=useState("");
  const[linkFails,setLinkFails]=useState([]);
  const linksAtRead=useRef(null);   // the links the open review was read from; Cancel import puts them back
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
  const ignored=useMemo(()=>activeQuarantine(quarantine),[quarantine]);
  const ignoredByVenue=useMemo(()=>{
    const ord=id=>{ const i=MUSEUMS.findIndex(m=>m.id===id); return i<0?MUSEUMS.length:i; };
    return ignored.slice().sort((a,b)=>ord(a.venueId)-ord(b.venueId)||String(a.title||"").localeCompare(String(b.title||"")));
  },[ignored]);
  const[showIgnored,setShowIgnored]=useState(false);
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
  const[dirty,setDirty]=useState(false);
  const[savedFile,setSavedFile]=useState(null);
  const[loadedInfo,setLoadedInfo]=useState(null);
  const[confirmBox,setConfirmBox]=useState(null); // {text, act} for confirm-before-replace
  const[,setTick]=useState(0);
  const[sortBy,setSortBy]=useState("date");
  const[venueF,setVenueF]=useState(new Set());
  const[timeF,setTimeF]=useState(new Set());
  const[acqWanted,setAcqWanted]=useState(false);
  const[acqOwned,setAcqOwned]=useState(false);
  const[acq3mo,setAcq3mo]=useState(false);
  const[acq6mo,setAcq6mo]=useState(false);
  const[acqHasCat,setAcqHasCat]=useState(false);
  const[acqNoCat,setAcqNoCat]=useState(false);
  const[acqBuyNext,setAcqBuyNext]=useState(false);
  const[showAll,setShowAll]=useState(false);
  const[dismissedOnly,setDismissedOnly]=useState(false);
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
    // Add by link: the venues it has met, and links still waiting in the box.
    readOccasional().then(map=>{ occSaved.current=map; registerOccasional(map); setOccVenues(map); });
    readPendingLinks().then(t=>{ if(t)setLinkText(t); });
  },[]);

  // Keep the "Last saved ... ago" text and its colour current.
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),30000);return()=>clearInterval(t);},[]);

  // EDITS mark the ledger unsaved (dirty). Nothing is written until you Export / Save.
  const commit=useCallback(async(next,lr)=>{
    setRows(next);
    if(lr!==undefined)setLastRun(lr);
    setDirty(true);
    
  },[]);

  // LOADS (Import, Reset) are NOT unsaved work. Freshly loaded data matches its
  // source, so there's nothing to lose yet. The unsaved warning only appears once
  // you actually change something.
  const loadLedger=useCallback((next,lr,info,extra)=>{
    setRows(next);
    setLastRun(lr!==undefined?lr:null);
    // A ledger's quarantine is merged in, never switched to (latest decision wins).
    const fromFile=quarantineFromList((extra&&extra.ignored)||[]);
    if(Object.keys(fromFile).length){
      setQuarantine(prev=>{ const merged=mergeQuarantine(prev,fromFile); writeQuarantine(merged); return merged; });
    }
    // venueSeen is never read from the file: the sweep log lives in the page's store.
    setDirty(false);
    
    setSavedFile(null);
    setUnconfirmedSave(null);
    setError(null);
    setLoadedInfo(info||null);
    setRefreshDone(null);
    setPinTouched(false); setRefreshTouched([]);
  },[]);

  const toggleSet=(setter,val)=>setter(prev=>{const n=new Set(prev);if(n.has(val))n.delete(val);else n.add(val);return n;});
  const clearFilters=()=>{setVenueF(new Set());setTimeF(new Set());setAcqWanted(false);setAcqOwned(false);setAcq3mo(false);setAcq6mo(false);setAcqHasCat(false);setAcqNoCat(false);setAcqBuyNext(false);setShowAll(false);setDismissedOnly(false);setWatchedF(false);setSearch("");setShowSearch(false);};

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
      parsed.push({venueCode:vc,title,startDate:sd,endDate:ed,summary:get(r,"summary"),url,
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

      if(!match){ props.push({type:"add",venueId:vc,venueShort:MU[vc].short,title,cand,notes,line:p.line,choices,merged:!!p.mergedFrom}); continue; }
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
      consider("exUrl","Exhibition link",match.exUrl,url);
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
      setError(null); setProposals(res.props); setCoverage(res.coverage||[]); setTally(res.tally||null); setSeenInFile(res.seen||null); setDecisions({});
    };
    reader.readAsText(file); e.target.value="";
  }


  // ── ADD BY LINK — the button's work ────────────────────────────────────────
  // One page read per link, then one model call for the prose; a new venue's
  // shop is found once. Every row then goes through analyzeProForma, the same
  // door as a sweep file. What could not be read stays in the box.
  async function readLinks(){
    const urls=linksIn(linkText);
    if(!urls.length){ setLinkFails([{url:"",why:"No links found in the box."}]); return; }
    setBusy(true); setLinkNote(null); setLinkFails([]);
    const got=[], fails=[], met=new Set(), looked=new Set();
    let venues={...occVenues}, venuesChanged=false;
    for(let n=0;n<urls.length;n++){
      const url=urls[n];
      setProg({done:n,total:urls.length,label:"Reading "+(n+1)+" of "+urls.length+"\u2026"});
      try{
        const f=await fetchPage(url,"The exhibition's title, dates and description.",null,{full:true});
        if(!f.ok){ fails.push({url,why:f.detail}); continue; }
        const res=f.results[0];
        if(!res){
          const e=(f.errors||[])[0];
          fails.push({url,why:e?"The museum refused the page ("+String(e.http_status_code||e.error_type||"no reason given")+").":"The page came back empty."});
          continue;
        }
        let vc=knownVenueFor(url);
        const page=readShowPage(res,url,vc);
        if(!page.ok){ fails.push({url,why:page.why}); continue; }
        const host=hostOf(url);
        if(!vc){
          vc=occVenueId(host);
          met.add(vc);
          const had=venues[vc];
          // A new venue's shop is looked for once per Read. On a later Read, again only
          // while unconfirmed AND (found by the first finder, or no books section found)
          // — a miss is never kept as the answer.
          if(!looked.has(vc)&&(!had||(!had.confirmed&&(!(had.finder>=2)||had.shop!=="found")))){
            looked.add(vc);
            setProg({done:n,total:urls.length,label:"Reading "+(n+1)+" of "+urls.length+"\u2026 looking for "+page.site+"\u2019s shop"});
            const pageShop=shopLinkOnPage(oneText(res),host);
            const shop=await discoverShop(pageShop,host,page.site,had?had.turnedDown:[]);
            venues={...venues,[vc]:{...(had||{}),id:vc,name:had?had.name:page.site,host,english:had?had.english:undefined,
              shopHome:null,shopCatalogues:null,shelfKind:null,shopSearch:null,why:null,
              ...shop,confirmed:false,turnedDown:had?had.turnedDown||[]:[],pageShop,addedAt:had?had.addedAt:new Date().toISOString()}};
            venuesChanged=true;
          }
        }
        const ask=await readResults(linkPrompt(page));
        const a=linkAnswer(ask.ok?ask.data:null);
        if(isOcc(vc)&&venues[vc].english===undefined&&ask.ok){ venues={...venues,[vc]:{...venues[vc],english:a.englishSpeaking}}; venuesChanged=true; }
        // A venue whose subtitle sits under the heading: read by code. A line
        // ending like a sentence is the text, not a subtitle.
        const own=(MU[vc]||{}).subtitleUnderHeading&&page.under&&page.under.length<=120&&!/[.!?]$/.test(page.under)?page.under:"";
        const title=linkTitle(page.base,own||a.subtitle,page.between);
        got.push({venue_code:vc,title,start_date:page.start,end_date:page.end,
          summary:a.summary?composeSummary(a.english,a.summary):"",url:page.link,
          notes:ask.ok?"":"Description not written \u2014 "+ask.detail.replace(/\s+\[.*$/,"")});
      }catch(e){ fails.push({url,why:"Couldn\u2019t read it ("+String((e&&e.message)||e)+")."}); }
    }
    if(venuesChanged){ registerOccasional(venues); setOccVenues(venues); }   // held, not stored: see occSaved
    setProg({done:0,total:0,label:""}); setBusy(false); setReadVenues([...met]);
    const left=fails.map(x=>x.url).join("\n");
    setLinkText(left); setLinkFails(fails);   // the box is stored when the import finishes
    linksAtRead.current=null;
    if(!got.length)return;
    const res=analyzeProForma(proFormaCsv(got),new Set(ignored.map(x=>x.key)),{notePrefix:""});
    if(res.error){ setLinkNote(res.error); return; }
    if(!res.props.length){
      setTally(res.tally||null);
      writePendingLinks(left);   // nothing to approve: this Read is finished
      setLinkNote("Read "+got.length+" link"+(got.length===1?"":"s")+", but nothing new to propose \u2014 your ledger already matches "+(got.length===1?"it":"them")+".");
      return;
    }
    setProposals(res.props); setCoverage([]); setTally(res.tally||null); setSeenInFile(null); setDecisions({});
    linksAtRead.current=urls;
    // Done with the pop-up — unless a link could not be read: then it stays
    // under the review, its lines waiting for her when the review closes.
    if(!fails.length)setImportMode(null);
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
  function confirmShop(id){ const v=occVenues[id]; if(v)holdVenues({...occVenues,[id]:{...v,confirmed:true}}); }
  // "No shop": the lookup goes straight to the web, as at Capodimonte.
  function noShopFor(id){ const v=occVenues[id]; if(v)holdVenues({...occVenues,[id]:{...v,shop:"none",confirmed:true,shopHome:null,shopCatalogues:null,shelfKind:null,shopSearch:null,why:null}}); }
  // "Look again": a new search NOW, skipping only the pages she turned down, never the
  // whole site.
  async function lookAgain(id){
    const v=occVenues[id]; if(!v)return;
    const turnedDown=[...(v.turnedDown||[]),v.shopCatalogues].filter(Boolean);
    setShopLooking(id);
    let shop;
    try{ shop=await discoverShop(v.pageShop||"",v.host,v.name,turnedDown); }
    catch(e){ shop={shop:"failed",why:"Couldn\u2019t look ("+String((e&&e.message)||e)+")."}; }
    setShopLooking(null);
    setOccVenues(prev=>{
      const next={...prev,[id]:{...prev[id],shopHome:null,shopCatalogues:null,shelfKind:null,shopSearch:null,why:null,...shop,confirmed:false,turnedDown}};
      registerOccasional(next); return next; });
  }
  // The shop screen asks about every venue outside her list met in this Read (or on a
  // card) whose shop is unconfirmed — whatever she decided about its cards (her decision).
  function venuesToConfirm(){
    const ids=new Set(readVenues);
    (proposals||[]).forEach(p=>{ const id=(p.cand||{}).museumId; if(isOcc(id))ids.add(id); });
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
    return {id:base,museumId:c.museumId,title:c.title,startDate:c.startDate||null,endDate:c.endDate||null,summary:c.summary||"",exUrl:c.exUrl||(MU[c.museumId]?.listUrl||""),interested:true,watching:false,acquiring:null,looked:false,hasCatalogue:"unknown",catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,publisherResult:null,shopUrl:null,shopState:null,shopChange:null,addedAt:now,editedAt:null};
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
      const box=[...new Set([...linksIn(linkText),...back])].join("\n");
      setLinkText(box); writePendingLinks(box);
    }
    linksAtRead.current=null;
    // A new quarantine goes to the store, the copy that survives a Reset; the export
    // carries the list too.
    if(newlyIgnored.length){
      const add={};
      for(const x of newlyIgnored) add[x.key]={venueId:x.venueId,title:x.title,at:x.at,state:"blocked"};
      setQuarantine(prev=>{ const merged=mergeQuarantine(prev,add);
        writeQuarantine(merged).then(ok=>{ if(!ok) setQuarWhy("The quarantine couldn\u2019t be saved to this page\u2019s store, so it may reset when you reload. Export to keep it."); });
        return merged; });
    }
    // Counted from the cards with the gate's own function, never handed in.
    const leftUndecided=proposals.filter((p,i)=>isUndecidedCard(p,decisions[i])).length;
    commit(Array.from(byId.values()),new Date().toISOString());
    if(occVenues!==occSaved.current){ writeOccasional(occVenues); occSaved.current=occVenues; }
    setShopScreen(null); setReadVenues([]);
    setProposals(null); setDecisions({}); setSeenInFile(null); setRefreshDone({added,filled,changed,never:newlyIgnored.length,left:partial?leftUndecided:0});
    setRefreshTouched(touched); setPinTouched(touched.length>0); // float just-changed entries to the top, this session
    setVenueF(new Set()); setTimeF(new Set()); setWatchedF(false);
    setAcqWanted(false); setAcqOwned(false); setAcq3mo(false); setAcq6mo(false); setAcqHasCat(false); setAcqNoCat(false); setAcqBuyNext(false);
    setDismissedOnly(false); setShowAll(false); setSearch("");
  }
  // Cancel import after a Read puts every link it read back in the box, stored (her decision).
  function cancelRefresh(){
    if(linksAtRead.current){
      const box=[...new Set([...linksIn(linkText),...linksAtRead.current])].join("\n");
      setLinkText(box); writePendingLinks(box); linksAtRead.current=null;
    }
    dropHeldVenues(); setShopScreen(null); setReadVenues([]); setProposals(null); setDecisions({}); setCoverage([]); setTally(null); setSeenInFile(null); }
  const pickSort=k=>{setSortBy(k);setPinTouched(false);}; // manual sort releases the pinned refresh group




  // The lookup runs at top level (lookupCatalogue); the page hands it its progress
  // line and, for an occasional venue, the check that works out its shop search.
  const lookHooks={label:setLookLabel,prepareShop:fillShopSearch};
  const lookupCat=row=>lookupCatalogue(row,lookHooks);

  // A link venue met before the finder proved searches (finder 2) gets its search
  // worked out once, at its first lookup, from its own shelf — then stored.
  async function fillShopSearch(id){
    const mu=MU[id];
    if(!mu||!mu.occasional||mu.shopSearch||!mu.shopHome)return;
    const v=occVenues[id]||occSaved.current[id];
    if(!v||v.finder>=3)return;
    let found;
    const f=mu.shopCatalogues?await fetchPage(mu.shopCatalogues,"The books in this section of the shop, with their prices.",null,{full:true}):{ok:true,results:[]};
    if(f.ok)found=await proveShopSearch(pageTextOf(f.results),mu.shopCatalogues||mu.shopHome);
    if(found===undefined||!f.ok)return;   // a call that died is not an answer
    const add=x=>x?{...x,shopSearch:found,finder:3}:x;
    if(occSaved.current[id]){ const saved={...occSaved.current,[id]:add(occSaved.current[id])}; occSaved.current=saved; writeOccasional(saved); }
    setOccVenues(prev=>{ const next=prev[id]?{...prev,[id]:add(prev[id])}:prev; registerOccasional(next); return next; });
    MU[id]={...MU[id],...occEntry({...v,shopSearch:found,finder:3})};
  }
  // A step that died is not an answer: the card says why, and the reason is not
  // stored — it is a fact about one attempt. C-043 to C-045.
  async function findOneCat(id){
    setBusy(true);setBusyId(id);setError(null);setRecheckSaid(null);
    const row=rows.find(r=>r.id===id);
    const out=await lookupCat(row);
    setDebug(out.detail);
    // SEARCH AGAIN REPLACES THE CARD ONLY WHEN IT FINISHED. Any step that
    // failed → the card stays as it was, and says so.
    if(row.looked&&out.ok&&out.trouble){
      setRecheckSaid({id,failed:true,text:"Search again didn\u2019t finish \u2014 "+out.trouble.split("[")[0].trim()+" Nothing changed."});
    } else if(out.ok){
      await commit(rows.map(r=>r.id===id?out.row:r));
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
      setRecheckSaid({id,failed:true,text:(row.looked?"Search again":"Search")+" didn\u2019t run \u2014 "+why+" Nothing changed."});
    }
    setBusy(false);setBusyId(null);setLookLabel(null);
  }

  // "Re-check museum shop" (her design; see "A BOOK LEAVING THE SHOP" above): its answer
  // is printed on the card, under the button she pressed.
  async function recheckShop(id){
    setBusy(true);setBusyId(id);setRechecking(true);setError(null);setRecheckSaid(null);
    const found=rows.find(r=>r.id===id);
    // A ticket on file was never the book: dropped, and the shop searched afresh.
    const ticket=!!(found.shopUrl&&isTicketLink(found.shopUrl));
    const row=ticket?{...found,shopUrl:null,shopState:"web",shopChange:null}:found;
    let out;
    if(row.shopUrl&&(row.shopState==="shop"||row.shopState==="gone")){
      setLookLabel("Re-reading the shop page\u2026");
      out=await recheckLinkedPage(row);
    } else {
      const io=lookupIo(lookHooks,{upTo:1});
      io.phase("shop");
      const s=await shopStep(row,io);
      const dom=shopDomain(MU[row.museumId]);
      const o=s.data||{};
      const onShop=!!shopLinkOf(o,dom);
      // Not-there moves a "blocked" row on: the shop answered this time.
      const answered=row.shopState==="blocked"?{...row,shopState:row.hasCatalogue==="yes"?"web":"none"}:row;
      // The ticket link is dropped silently (her decision).
      const dropped="";
      if(!s.ran)out={ok:false,detail:"",said:"This museum has no shop on file, so there is nothing to re-check."};
      else if(!s.ok)out={ok:false,detail:s.detail,said:"Re-check didn’t run — "+s.detail.split("\n").pop().split("[")[0].trim()+" Nothing changed."};
      // A blocked shop is a failed check and changes nothing — except a ticket
      // link, which was wrong whatever the shop says.
      else if(s.blocked)out=ticket
        ?{ok:true,detail:s.detail,row:{...row,shopState:"blocked"},said:dropped+"The museum shop is blocked, so it couldn’t be re-checked."}
        :{ok:false,detail:s.detail,said:"Re-check didn’t work — the museum shop is blocked. Nothing changed."};
      else if(o.found&&(o.catalogueTitle||o.isbn13)&&(onShop||o.listedOnly)){
        // Reading the book's page for a blank ISBN is part of the shop step —
        // the page IS the shop's. Web search and the publisher are never run.
        const hit=await readBookPage({ok:true,detail:s.detail,pageUrl:o.shopUrl,row:foundInShop(row,o)},
          MU[row.museumId]?.name||"",dom,io);
        out={ok:true,detail:hit.detail,row:hit.row,said:dropped+(row.shopState==="shop"?"Re-checked: still in the museum shop.":"Re-checked: now in the museum shop.")};
      }
      else out={ok:true,detail:s.detail,row:answered,said:dropped+"Re-checked the museum shop: this book isn’t there."};
    }
    setDebug(out.detail||null);
    if(out.ok&&out.row&&out.row!==found)await commit(rows.map(r=>r.id===id?out.row:r));
    setRecheckSaid({id,text:out.said,failed:!out.ok});
    setBusy(false);setBusyId(null);setRechecking(false);setLookLabel(null);
  }

  const dismiss=id=>{commit(rows.map(r=>r.id===id?{...r,interested:false}:r));if(undoTimer.current)clearTimeout(undoTimer.current);setUndo({id});undoTimer.current=setTimeout(()=>setUndo(null),10000);};
  const undoDismiss=()=>{if(!undo)return;commit(rows.map(r=>r.id===undo.id?{...r,interested:true}:r));setUndo(null);if(undoTimer.current)clearTimeout(undoTimer.current);};
  const restore=id=>commit(rows.map(r=>r.id===id?{...r,interested:true}:r));
  const toggleWatch=id=>commit(rows.map(r=>r.id===id?{...r,watching:!r.watching}:r));
  // Leaving Yes clears the buy-next dot: it marks a wanted book only.
  const setAcq=(id,v)=>commit(rows.map(r=>{if(r.id!==id)return r;const a=r.acquiring===v?null:v;return{...r,acquiring:a,buyNext:a==="yes"?!!r.buyNext:false};}));
  const toggleBuyNext=id=>commit(rows.map(r=>r.id===id?{...r,buyNext:!r.buyNext}:r));

  function handleImport(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);if(d&&Array.isArray(d.rows)){loadLedger(d.rows.map(r=>({...r,watching:r.watching||false})),d.lastRun||null,"Loaded "+d.rows.length+" exhibitions from your file \u2014 no edits yet.",{ignored:Array.isArray(d.ignored)?d.ignored:[]});setDebug("Imported "+d.rows.length+" exhibitions from your file. It matches your file, so it's not counted as unsaved until you change something.");}else{setError("That file didn't contain a ledger (no entries found).");}}catch{setError("Could not read that file \u2014 it may not be a valid ledger backup.");}};reader.readAsText(file);e.target.value="";}

  // Confirm-before-replace: Import and Reset can wipe the screen in one tap, so
  // they ask first WHENEVER there is unsaved work showing.
  const openFilePicker=()=>fileRef.current?.click();
  function requestImport(){
    if(rows.length>0&&dirty){setConfirmBox({text:"Importing replaces everything on screen, and you haven't exported these changes yet. They will be lost. Continue?",act:openFilePicker});}
    else openFilePicker();
  }
  const doReset=()=>{const seed=buildSeed();loadLedger(seed,null,"Starter set loaded ("+seed.length+" exhibitions) \u2014 not saved to a file.");setDebug("Reset: loaded the built-in starter set ("+seed.length+" exhibitions). It isn't in any file \u2014 Export / Save if you want to keep it.");};
  // Reset to Seed always asks while a ledger is on screen (her decision).
  function requestReset(){
    if(rows.length>0&&dirty){setConfirmBox({text:"This loads the built-in starter set and replaces everything on screen, which you haven't exported. Those changes will be lost. Continue?",act:doReset});}
    else if(rows.length>0){setConfirmBox({text:"This loads the seed set and replaces everything on screen. Continue?",act:doReset});}
    else doReset();
  }

  // Saving (docs/app.md §2). Two routes, differing in what is known: 1. the runtime's
  // file handoff saves or rejects, so it can clear the unsaved warning; 2. a plain
  // browser download cannot tell finished from cancelled, so it never clears it. Never
  // a click-triggered "Saved" tick.
  async function handleExport(){
    const stamp=localStamp();
    const filename=LEDGER_PREFIX+stamp+".json";
    let data;
    try{
      data=JSON.stringify({rows,ignored,lastRun,exportedAt:new Date().toISOString(),exportedLocal:localReadable()},null,2);
    }catch(e){ setError("Export failed while building the file: "+String(e?.message||e)); return; }

    // ── 1. the runtime's file handoff ───────────────────────────────────────
    let dl=null;
    try{
      if(typeof window!=="undefined"&&window.claude&&typeof window.claude.use==="function"){
        dl=await window.claude.use("downloads");
      }
    }catch{ dl=null; }   // unavailable is not a failure — fall through to 2.

    if(dl&&typeof dl.save==="function"){
      try{
        await dl.save({filename,data});
        setError(null); setDirty(false); setUnconfirmedSave(null);
        setSavedFile(filename+"  \u00b7  "+localReadable());
        setRefreshDone(null);
        setDebug("Saved "+rows.length+" exhibitions as "+filename+" ("+localReadable()+"), confirmed by the viewer.");
      }catch(e){
        // A REJECTION IS REAL INFORMATION. She declined, or it failed. Either
        // way nothing was written, so the ledger stays dirty and says so.
        setSavedFile(null); setUnconfirmedSave(null);
        setError("NOT SAVED \u2014 the save was refused or cancelled ("+String(e?.code||e?.message||e)+"). Your ledger is still on screen and still unsaved. Try Export / Save again.");
        setDebug("downloads.save rejected: "+String(e?.code||"")+" "+String(e?.message||e));
      }
      return;
    }

    // ── 2. ordinary browser download, outcome unknowable ────────────────────
    try{
      const blob=new Blob([data],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download=filename;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setError(null); setSavedFile(null);
      setUnconfirmedSave(filename);   // dirty stays TRUE on purpose
      setDebug("Started a browser download of "+filename+" ("+localReadable()+"). This route cannot confirm the file arrived, so the ledger is still marked unsaved. Check your downloads folder.");
    }catch(e){
      setUnconfirmedSave(null);
      setError("Export failed: "+String(e?.message||e));
    }
  }

  const view=useMemo(()=>{
    const sq=search.toLowerCase().trim();
    let out=rows.filter(r=>{
      // The search narrows; it does not end the check, so every other filter applies.
      if(sq&&!(r.title.toLowerCase().includes(sq)||r.summary.toLowerCase().includes(sq)||(MU[r.museumId]?.name||"").toLowerCase().includes(sq)))return false;
      // Dismissed narrows too. A search still finds a dismissed show unless Dismissed
      // is on.
      if(dismissedOnly){ if(r.interested)return false; }
      else if(!r.interested&&!showAll&&!sq)return false;
      if(venueF.size>0&&!venueF.has(r.museumId)&&!(venueF.has(OCC_CHIP)&&isOcc(r.museumId)))return false;
      const t=tierFor(r),ts=TIERS[t]?.time||"current";
      if(timeF.size>0){let match=timeF.has(ts);if(timeF.has("recent")&&t==="recent")match=true;if(timeF.has("current")&&t==="recent")match=true;if(!match)return false;}
      if(watchedF&&!r.watching)return false;
      // Acquiring filters stack as AND across the three axes, OR within an axis.
      if(acqWanted||acqOwned){if(!((acqWanted&&r.acquiring==="yes")||(acqOwned&&r.acquiring==="acquired")))return false;}
      if(acq3mo||acq6mo){if(!((acq3mo&&t==="closing")||(acq6mo&&(t==="urgent"||t==="lapsed"))))return false;}
      if(acqHasCat||acqNoCat){if(!((acqHasCat&&r.looked&&r.hasCatalogue==="yes")||(acqNoCat&&r.looked&&r.hasCatalogue==="no")))return false;}
      if(acqBuyNext){if(!(r.acquiring==="yes"&&r.buyNext))return false;}
      return true;
    });
    out.sort((a,b)=>{
      if(pinTouched){const aT=refreshTouched.includes(a.id)?0:1,bT=refreshTouched.includes(b.id)?0:1;if(aT!==bT)return aT-bT;}
      if(sortBy==="added"){const d=String(b.addedAt||"").localeCompare(String(a.addedAt||""));if(d!==0)return d;}
      if(sortBy==="edited"){const d=String(b.editedAt||"").localeCompare(String(a.editedAt||""));if(d!==0)return d;if(!a.editedAt&&!b.editedAt){const aH=a.addedAt?1:0,bH=b.addedAt?1:0;if(aH!==bH)return bH-aH;}}
      if(sortBy==="venue"){const d=venueRank(a.museumId)-venueRank(b.museumId);if(d!==0)return d;}
      if(sortBy==="acquiring"){const w={acquired:0,yes:1,no:3};const d=(w[a.acquiring]??2)-(w[b.acquiring]??2);if(d!==0)return d;}
      const ta=tierFor(a),tb=tierFor(b);
      let oa=TIERS[ta]?.ord??9,ob=TIERS[tb]?.ord??9;
      if(acqWanted){if(ta==="upcoming")oa=99;if(tb==="upcoming")ob=99;} // Wanted view: Announced drops to the bottom (nothing to buy yet)
      if(oa!==ob)return oa-ob;
      const da=a.startDate||a.endDate||"",db=b.startDate||b.endDate||"";
      if(ta==="upcoming")return da.localeCompare(db);
      return db.localeCompare(da);
    });
    return out;
  },[rows,sortBy,venueF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqHasCat,acqNoCat,acqBuyNext,showAll,dismissedOnly,watchedF,search,pinTouched,refreshTouched]);

  const counts=useMemo(()=>{const c={total:rows.length,dismissed:0,watched:0,wanted:0,owned:0,pressing:0};for(const r of rows){if(!r.interested){c.dismissed++;continue;}if(r.watching)c.watched++;if(r.acquiring==="yes")c.wanted++;if(r.acquiring==="acquired")c.owned++;if(inClosingWindow(r))c.pressing++;}return c;},[rows]);

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
  const C=PALETTES[theme];
  const TH=tiersFor(theme);          // the tier colours for THIS theme
  const chip=on=>({padding:"4px 10px",borderRadius:999,border:"1px solid "+(on?C.ink:C.rule),background:on?C.ink:"transparent",color:on?C.onAction:C.soft,fontSize:11,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"});
  const sBtn={padding:"5px 12px",borderRadius:4,border:"1px solid "+C.rule,background:"transparent",color:C.soft,fontSize:11,fontWeight:500,cursor:"pointer"};
  const pBtn={...sBtn,background:C.action,color:C.onAction,border:"none",opacity:busy?0.5:1,cursor:busy?"wait":"pointer"};
  const lnk={fontSize:11,fontWeight:500,color:C.ink,background:C.card,border:"1px solid "+C.rule,borderRadius:3,padding:"4px 9px",textDecoration:"none",display:"inline-block",whiteSpace:"nowrap"};

  // ---- Approval-stage render helpers ----
  const decBtn=(active,color)=>({padding:"3px 9px",borderRadius:4,border:"1px solid "+(active?color:C.rule),background:active?color:"transparent",color:active?C.onAction:C.soft,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"});
  const isUndecided=(p,i)=>isUndecidedCard(p,decisions[i]);

  const renderProposalCard=(p,i)=>{
    const dec=decisions[i]||{};
    const infoRow=(label,val)=><div style={{marginBottom:2}}><b style={{color:C.ink}}>{label}:</b> {val&&String(val).trim()?val:<span style={{color:C.muted}}>{"\u2014"}</span>}</div>;
    return(
      <div key={i} id={"prop-"+i} style={{border:"1px solid "+C.rule,borderRadius:6,background:C.card,padding:"10px 12px",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:600,color:C.ink,marginBottom:4}}>{p.title}</div>


        {p.type==="add"&&<div style={{fontSize:11.5,color:C.ink,lineHeight:1.5}}>
          <div style={{fontWeight:700,marginBottom:3}}>{"New show \u2014 not in your ledger yet."}</div>
          {infoRow("Dates",dateRange(p.cand))}
          {infoRow("Description",p.cand.summary)}
          {infoRow("Link",p.cand.exUrl)}
        </div>}

        {(p.type==="fill"||p.type==="change")&&<div style={{fontSize:11.5,color:C.ink}}>
          <div style={{fontWeight:700,marginBottom:5}}>{"Existing entry \u2014 decide each change:"}</div>
          {dec.mode==="addnew"
            ? <div style={{fontStyle:"italic",color:C.action}}>Will be added as a separate new entry instead of changing the existing one.</div>
            : p.upd.map((u,j)=>{const fd=(dec.fields||{})[j];return(
                <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
                  <div style={{flex:1,lineHeight:1.4}}><b style={{color:C.ink}}>{u.label}:</b> <span style={{color:C.soft}}>{u.kind==="fill"?("add \u201c"+u.newVal+"\u201d"):("\u201c"+u.oldVal+"\u201d \u2192 \u201c"+u.newVal+"\u201d")}</span></div>
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

  // Status line: a fresh load is neutral; edits bring the red unsaved banner; a
  // confirmed save the green line (a reset seed is in no file, so it stays neutral).
  const hasLedger=rows.length>0;
  const showUnsavedBanner=hasLedger&&dirty;
  let savedText=null,savedCol=C.soft,savedWeight=500;
  // No line at all with no ledger open (her decision).
  if(!hasLedger){savedText=null;}
  else if(dirty){savedText=null;} // the red banner below covers this
  else if(savedFile){savedText="\u2713 Saved \u2014 safe to close  ("+savedFile+")";savedCol=C.okEdge;savedWeight=600;}
  else{savedText=loadedInfo||"Loaded \u2014 no edits yet.";}

  if(!loaded)return(<div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.soft,minHeight:"100vh",display:"grid",placeItems:"center",fontSize:13}}>Opening the ledger{"\u2026"}</div>);

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.ink,minHeight:"100vh",padding:"20px 16px 60px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      <header style={{maxWidth:760,margin:"0 auto 14px"}}>
        <div style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:C.soft,marginBottom:4}}>Exhibition catalogues · acquisition window</div>
        <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:36,lineHeight:1,fontWeight:500,margin:0,letterSpacing:"-0.02em"}}>Before it goes<span style={{color:C.accent}}> out of print</span></h1>
        <div style={{marginTop:14,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          <button onClick={requestImport} style={sBtn}>Import</button>
          <button onClick={handleExport} disabled={!hasLedger} style={{...pBtn,opacity:hasLedger?1:0.4,cursor:hasLedger?"pointer":"not-allowed"}}>Export / Save</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{display:"none"}}/>
          {/* Small and out of the way: it is a comfort control, not part of the
              work. Says what it will DO, not what is currently on. */}
          <button onClick={toggleTheme} title={theme==="dark"?"Switch to light":"Switch to dark"}
            style={{...sBtn,marginLeft:"auto",padding:"5px 9px"}}>{theme==="dark"?"\u2600 Light":"\u263D Dark"}</button>
          <button onClick={()=>{setLinkNote(null);setImportMode("choose");}} style={sBtn}>Import Refresh</button>
          <input ref={refreshFileRef} type="file" accept=".csv,text/csv" onChange={handleRefreshFile} style={{display:"none"}}/>
        </div>
        {savedText&&<div style={{marginTop:6,fontSize:11,color:savedCol,fontWeight:savedWeight}}>{savedText}</div>}
        {showUnsavedBanner&&refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:C.okBg,border:"2px solid #2D6B5A",borderRadius:5,fontSize:12.5,fontWeight:700,color:C.okInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          {/* The icon sits on the first line of text (her ask): centred, it drifted when
              the banner wrapped. */}
          <span style={{fontSize:17,lineHeight:"17.5px"}}>{"\u21BB"}</span>
          {/* Every card she looked at is accounted for in this one sentence; the
              left-behind clause keeps the numbers adding up and says how to get them
              back. */}
          <span>{"Refresh applied \u2014 "+refreshDone.added+" added, "+refreshDone.filled+" filled in, "+refreshDone.changed+" updated"+(refreshDone.never?", "+refreshDone.never+" never to be offered again":"")+(refreshDone.left?", "+refreshDone.left+" left undecided \u2014 import the same sweep file again to carry on with them":"")+". Not saved yet \u2014 tap \u201cExport / Save\u201d now."}</span>
        </div>}
        {hasLedger&&unconfirmedSave&&<div style={{marginTop:8,padding:"9px 12px",background:C.holdBg,border:"2px solid "+C.soft,borderRadius:5,fontSize:12.5,color:C.ink,lineHeight:1.45,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:16,lineHeight:1.1}}>{"\u2193"}</span>
          <span>{"A download of "+unconfirmedSave+" was started. This viewer can\u2019t tell us whether it arrived, so your ledger is still marked unsaved \u2014 check your downloads folder. If the file is there, you\u2019re safe."}</span>
        </div>}
        {showUnsavedBanner&&!refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid #B5791A",borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:17,lineHeight:1}}>{"\u26A0"}</span>
          <span>{"UNSAVED CHANGES \u2014 what's on screen is not saved to a file. Tap \u201cExport / Save\u201d before you close this tab or your work is lost."}</span>
        </div>}
        {/* A quarantine that isn't saving is a banner, not a footnote (her decision),
            shown with or without a ledger open. */}
        {quarWhy&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:17,lineHeight:1.1}}>{"\u26A0"}</span>
          <span>{"QUARANTINE \u2014 "+quarWhy}</span>
        </div>}
        {busy&&prog.total>0&&!importMode&&<div style={{marginTop:8}}><div style={{height:3,background:C.rule,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(prog.done/prog.total*100)+"%",background:C.action,transition:"width .3s ease"}}/></div><div style={{fontSize:10,color:C.soft,marginTop:3}}>{prog.done}/{prog.total} · {prog.label}</div></div>}
        {error&&<div style={{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink}}>{error}</div>}
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
          <span>Last refreshed: {lastSweep?fmtRefresh(lastSweep):"Unknown"}</span>
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
            {"When each venue was last swept, and when it last actually gave us exhibitions. A venue swept recently but with no rows since an older date is being refused \u2014 worth a solo re-run."}
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
              <div key={m.id} style={{display:"flex",gap:8,fontSize:10.5,color:C.soft,padding:"2px 0",alignItems:"baseline"}}>
                <span style={{minWidth:130,color:C.ink}}>{m.short}</span>
                <span style={{minWidth:150}}>swept {fmtRefresh(v.attempted)}</span>
                <span style={{color:v.returned?(stale?TH.urgent.ink:C.soft):TH.urgent.ink,fontWeight:stale||!v.returned?600:400}}>
                  {v.returned?("rows "+fmtRefresh(v.returned)):"no rows \u2014 refused"}
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
        {showSearch&&<div style={{marginTop:6,position:"relative"}}><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder={"Search exhibitions\u2026"} style={{width:"100%",padding:"7px 30px 7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/>
          {search&&<button onClick={()=>{setSearch("");if(searchRef.current)searchRef.current.focus();}} aria-label="Clear search" title="Clear"
            style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.soft,fontSize:16,lineHeight:1,cursor:"pointer",padding:"2px 4px"}}>{"\u00d7"}</button>}</div>}
      </header>

      <div style={{maxWidth:760,margin:"0 auto 12px",display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Sort</span>
          {[["date","Date"],["venue","Venue"],["acquiring","Acquiring"],["added","Recently added"],["edited","Recently edited"]].map(([k,l])=><button key={k} onClick={()=>pickSort(k)} style={chip(sortBy===k&&!pinTouched)}>{l}</button>)}
          {pinTouched&&<span style={{fontSize:10.5,color:C.action,fontWeight:600}}>{"\u2191 just-refreshed entries shown first"}</span>}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>When</span>
          {[["upcoming","Upcoming"],["current","Current"],["past","Past"],["recent","Recently opened"]].map(([k,l])=><button key={k} onClick={()=>toggleSet(setTimeF,k)} style={chip(timeF.has(k))}>{l}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Venue</span>
          {MUSEUMS.map(m=><button key={m.id} onClick={()=>toggleSet(setVenueF,m.id)} style={chip(venueF.has(m.id))}>{m.short}</button>)}
          <button onClick={()=>toggleSet(setVenueF,OCC_CHIP)} style={chip(venueF.has(OCC_CHIP))}>Occasional</button>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Acquiring?</span>
          <button onClick={()=>setAcqWanted(v=>!v)} style={chip(acqWanted)}>Wanted</button>
          <button onClick={()=>setAcqOwned(v=>!v)} style={chip(acqOwned)}>Owned</button>
          <button onClick={()=>setAcq3mo(v=>!v)} style={chip(acq3mo)}>3+ mos</button>
          <button onClick={()=>setAcq6mo(v=>!v)} style={chip(acq6mo)}>6+ mos closing window</button>
          <button onClick={()=>setAcqHasCat(v=>!v)} style={chip(acqHasCat)}>Has catalogue</button>
          <button onClick={()=>setAcqNoCat(v=>!v)} style={chip(acqNoCat)}>No catalogue</button>
          <button onClick={()=>setAcqBuyNext(v=>!v)} style={chip(acqBuyNext)}>Buy next</button>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Showing</span>
          <button onClick={()=>setWatchedF(v=>!v)} style={chip(watchedF)}>Watched</button>
          <button onClick={()=>{setDismissedOnly(v=>!v);setShowAll(false);}} style={chip(dismissedOnly)}>Dismissed</button>
          <button onClick={()=>{setShowAll(v=>!v);setDismissedOnly(false);}} style={chip(showAll)}>Show all</button>
          <button onClick={clearFilters} style={{...chip(false),color:C.muted,borderColor:C.muted}}>Clear all</button>
        </div>
      </div>

      <div style={{maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
        {view.length===0&&<div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:5,padding:18,fontSize:12.5,color:C.soft}}>Nothing matches those filters.</div>}
        {(()=>{
          const pinnedCount=pinTouched?view.filter(x=>refreshTouched.includes(x.id)).length:0;
          // Band headers for the two "recently" sorts (only when not in the post-import pinned snapshot).
          const bandMode=(!pinTouched&&(sortBy==="added"||sortBy==="edited"))?sortBy:null;
          const newestAdd=bandMode==="added"?(view.find(x=>x.addedAt)?.addedAt||null):null;
          const newestEdit=bandMode==="edited"?(view.find(x=>x.editedAt)?.editedAt||null):null;
          const bandOf=(x)=>{
            if(bandMode==="added")return !x.addedAt?"seed":(x.addedAt===newestAdd?"add_this":"add_earlier");
            if(bandMode==="edited")return x.editedAt?(x.editedAt===newestEdit?"ed_this":"ed_earlier"):(x.addedAt?"ed_never":"seed");
            return null;
          };
          const BAND_LABEL={add_this:"This import",add_earlier:"Earlier imports",seed:"Original set",ed_this:"This import's edits",ed_earlier:"Earlier edits",ed_never:"Never edited"};
          const bandDivider=(txt)=><div style={{display:"flex",alignItems:"center",gap:8,margin:"2px 2px",color:C.soft}}><div style={{flex:1,height:1,background:C.rule}}/><span style={{fontSize:9.5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{txt}</span><div style={{flex:1,height:1,background:C.rule}}/></div>;
          return view.map((r,i)=>{
          const brk=(pinTouched&&pinnedCount>0&&pinnedCount<view.length&&i===pinnedCount)?bandDivider("Rest of the list"):null;
          let header=null;
          if(bandMode){const b=bandOf(r);const pb=i>0?bandOf(view[i-1]):null;if(b!==pb)header=bandDivider(BAND_LABEL[b]||"");}
          const lead=brk||header;
          const t=tierFor(r),tier=TH[t],mu=MU[r.museumId],mo=moSince(r.endDate),isOpen=openCards[r.id],noCat=r.looked&&r.hasCatalogue==="no",isAcq=r.acquiring==="acquired",dismissed=!r.interested,isBusy=busyId===r.id;
          const searchingLabel=lookLabel||"Searching\u2026";
          // Two buttons share one busy row; only the one pressed shows progress.
          const againLabel=isBusy&&!rechecking?searchingLabel:"Search again";
          const recheckLabel=isBusy&&rechecking?searchingLabel:"Re-check museum shop";
          // No shop at all (Borghese, Capodimonte, the Accademia; her decision): no
          // Re-check button, and the line says only "Venue has no shop."
          const noShop=!(MU[r.museumId]&&(MU[r.museumId].shopSearch||MU[r.museumId].shopHome));
          const said=recheckSaid&&recheckSaid.id===r.id?recheckSaid:null;
          if(dismissed)return(
            <React.Fragment key={r.id}>{lead}
            <article style={{background:C.dim,border:"1px solid "+C.rule,borderLeft:"4px solid "+C.muted,borderRadius:5,padding:"10px 14px",opacity:0.55}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft}}>{mu?.card||mu?.short}</span>
                <button onClick={()=>restore(r.id)} style={{background:"none",border:"1px solid "+C.action,borderRadius:3,color:C.action,fontSize:10,fontWeight:500,cursor:"pointer",padding:"2px 8px"}}>Restore</button>
              </div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,fontWeight:500,marginTop:3,color:C.soft}}>{r.title}</div>
              <div style={{fontSize:10.5,color:C.muted,marginTop:2}}>{dateRange(r)}</div>
            </article>
            </React.Fragment>
          );
          return(
            <React.Fragment key={r.id}>{lead}
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
                    {r.acquiring==="yes"&&(()=>{const k=starInk();return <button onClick={()=>toggleBuyNext(r.id)} title={r.buyNext?"Not buying next":"Buy next"} style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:16,lineHeight:1}}><svg width={k.D} height={k.D} style={{display:"inline-block",verticalAlign:k.v}} aria-hidden="true"><circle cx={k.D/2} cy={k.D/2} r={k.D/2-0.75} fill={r.buyNext?C.buyNext:"none"} stroke={r.buyNext?C.buyNext:C.muted} strokeWidth="1.5"/></svg></button>;})()}
                    <button onClick={()=>toggleWatch(r.id)} title={r.watching?"Unwatch":"Watch"} style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:16,lineHeight:1,color:r.watching?C.star:C.muted}}>{r.watching?"\u2605":"\u2606"}</button>
                    {!isAcq&&<button onClick={()=>dismiss(r.id)} title="Not interested" style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:18,lineHeight:1,color:C.muted}}>{"\u00d7"}</button>}
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
                {!noCat&&!isAcq&&<div style={{fontSize:11,color:tier.ink,fontWeight:500,marginBottom:8}}>{tier.note}</div>}
                <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",paddingTop:8,borderTop:"1px solid "+C.rule}}>
                  <span style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:C.soft}}>Want the catalogue?</span>
                  <button onClick={()=>setAcq(r.id,"yes")} style={chip(r.acquiring==="yes")}>Yes</button>
                  <button onClick={()=>setAcq(r.id,"no")} style={chip(r.acquiring==="no")}>No</button>
                  <button onClick={()=>setAcq(r.id,"acquired")} style={chip(r.acquiring==="acquired")}>Acquired</button>
                  <button onClick={()=>setOpenCards(o=>({...o,[r.id]:!o[r.id]}))} style={{marginLeft:"auto",background:"none",border:"none",color:C.action,fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 0"}}>
                    {isOpen?"Hide":(r.looked&&r.hasCatalogue==="yes")?"\u2713 Catalogue":(r.looked&&r.hasCatalogue==="no")?"\u2717 Catalogue":"Catalogue"}
                  </button>
                </div>
              </div>
              {isOpen&&(
                <div style={{background:C.panel,borderTop:"1px solid "+C.rule,padding:"12px 14px"}}>
                  {!r.looked?(
                    <div>
                      <p style={{fontSize:12,color:C.soft,margin:"0 0 8px"}}>No catalogue search run yet.</p>
                      <button onClick={()=>findOneCat(r.id)} disabled={busy} style={{...pBtn,padding:"6px 12px",fontSize:12}}>{isBusy?searchingLabel:"Find catalogue"}</button>
                      {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
                    </div>
                  ):noCat?(
                    <div>
                      {r.shopState==="blocked"?(
                        <div style={{margin:"0 0 8px"}}>
                          <p style={{fontSize:12,color:C.soft,margin:"0 0 6px"}}><span style={{color:TH.lapsed.ink,fontWeight:700}}>{SHOP_BLOCKED_HEAD}</span>{SHOP_BLOCKED_NONE_REST}</p>
                          {/* "Search manually" needs somewhere to press: the shop's own
                              search with the title in it, as on a found card. */}
                          {mu&&(mu.shopSearch||mu.shopHome)&&<a href={mu.shopSearch?mu.shopSearch+encodeURIComponent(r.title):mu.shopHome} target="_blank" rel="noopener noreferrer" style={lnk}>Museum shop {"\u2197"}</a>}
                        </div>
                      ):<p style={{fontSize:12,color:C.soft,margin:"0 0 8px"}}>No catalogue found for this exhibition.</p>}
                      <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
                        <button onClick={()=>findOneCat(r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{againLabel}</button>
                        {!noShop&&<button onClick={()=>recheckShop(r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{recheckLabel}</button>}
                      </div>
                      {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
                    </div>
                  ):(
                    <div>
                      {/* A missing button cannot report anything, so the card says what the
                          publisher step concluded (publisherNote). "Now" and "Back" are the
                          same green as the plain sentence (her decision): the word carries
                          the news. */}
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
                      {r.shopState==="blocked"&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>
                        <span style={{color:TH.lapsed.ink,fontWeight:700}}>{SHOP_BLOCKED_HEAD}</span>{SHOP_BLOCKED_FOUND_REST}
                        {publisherNote(r.publisherResult,!!r.publisherUrl)&&(" "+publisherNote(r.publisherResult,!!r.publisherUrl))}
                      </div>}
                      {r.catalogueTitle&&<div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:14.5,fontWeight:500,marginBottom:2,lineHeight:1.3}}>{r.catalogueTitle}</div>}
                      {r.publisher&&<div style={{fontSize:11,color:C.soft,marginBottom:2}}>{r.publisher}</div>}
                      <div style={{fontSize:11.5,fontFamily:"ui-monospace,monospace",marginBottom:englishLine(r)?2:10,color:r.isbn13?C.ink:C.soft}}>
                        {r.isbn13?"ISBN "+fmtIsbn(r.isbn13):"ISBN not confirmed \u2014 verify before buying"}
                      </div>
                      {englishLine(r)&&<div style={{fontSize:11,color:C.soft,marginBottom:10}}>{englishLine(r)}</div>}
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {isAcq?(
                          <>
                            {r.shopUrl&&<a href={r.shopUrl} target="_blank" rel="noopener noreferrer" style={lnk}>{shopLinkLabel(r.shopState)} {"\u2197"}</a>}
                            {r.publisherUrl&&<a href={r.publisherUrl} target="_blank" rel="noopener noreferrer" style={lnk}>{publisherLinkLabel(r.publisherResult)} {"\u2197"}</a>}
                          </>
                        ):buyLinks(r).map(l=><a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" style={lnk}>{l.name} {"\u2197"}</a>)}
                      </div>
                      <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:14}}>
                        <button onClick={()=>findOneCat(r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{againLabel}</button>
                        {!noShop&&<button onClick={()=>recheckShop(r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{recheckLabel}</button>}
                      </div>
                      {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
                    </div>
                  )}
                </div>
              )}
            </article>
            </React.Fragment>
          );
        });})()}
      </div>
      {/* Top on the left, bottom on the right (her layout), shown once she has scrolled down. */}
      {showTop&&(<>
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="Return to top"
          style={{position:"fixed",bottom:undo?64:20,left:"50%",transform:"translateX(calc(-100% - 5px))",zIndex:998,width:38,height:38,borderRadius:"50%",background:C.card,border:"1px solid "+C.rule,color:C.ink,fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>{"\u2191"}</button>
        <button onClick={()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"})} aria-label="Jump to bottom"
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
          <button onClick={requestReset} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Reset to Seed</button>
          <button onClick={()=>{if(showResetCards)setResetQuery("");setShowResetCards(v=>!v);}} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Reset cards</button>
        </span>
        {ignored.length>0&&<button onClick={()=>setShowIgnored(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0,marginLeft:"auto"}}>{showIgnored?"Hide quarantine":"Quarantine - "+ignored.length}</button>}
      </div>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {/* Reset cards (her design): find a card by typing, pick it, confirm; its catalogue
            result is cleared (resetCard) and it shows "Find catalogue" again. Her marks
            stay. One card per confirm. */}
        {showResetCards&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          <input value={resetQuery} onChange={e=>setResetQuery(e.target.value)} placeholder={"Search cards\u2026"} style={{width:"100%",padding:"7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/>
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
            {"Entries excluded from all future imports. Removing them from quarantine will re-offer them in future sweeps \u2014 it does not immediately add them to your ledger."}
          </div>
          {/* By venue only (her decision): venues in the app's order, titles A–Z. */}
          {ignoredByVenue.map(x=>(
            <div key={x.key} style={{display:"flex",gap:10,fontSize:12.5,color:C.ink,padding:"4px 0",alignItems:"baseline"}}>
              <span style={{minWidth:130,fontWeight:600}}>{MU[x.venueId]?MU[x.venueId].short:x.venueId}</span>
              <span style={{flex:1}}>{x.title||"(no title)"}</span>
              <button onClick={()=>{
                const at=new Date().toISOString();
                setQuarantine(prev=>{ const next=mergeQuarantine(prev,{[x.key]:{venueId:x.venueId,title:x.title,at,state:"released"}});
                  writeQuarantine(next).then(ok=>{ if(!ok) setQuarWhy("That release couldn\u2019t be saved to this page\u2019s store, so it may come back when you reload."); });
                  return next; });
                setDirty(true);}} style={{background:"none",border:"none",color:C.action,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>Remove from quarantine</button>
            </div>
          ))}
        </div>}
      </div>
      {/* The import pop-up (her design; docs/picked_shows.md): CSV and Links, and a small
          Cancel. Under the review (1100) so cards open on top; under the confirm box (1200). */}
      {importMode&&(
        <div role="dialog" style={{position:"fixed",inset:0,background:C.scrim,zIndex:1050,display:"flex",flexDirection:"column",justifyContent:"center",padding:16}}>
          {/* Sized to what it holds. CSV and Links match Load and Save; the one pressed
              turns green (her design). */}
          <div style={{background:C.bg,borderRadius:8,...(importMode==="links"?{maxWidth:820,width:"100%"}:{width:"fit-content"}),margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"auto",boxShadow:"0 8px 30px rgba(0,0,0,0.3)",padding:"14px 18px 10px"}}>
            <div style={{display:"flex",gap:5,justifyContent:"center"}}>
              <button onClick={()=>{setImportMode(null);refreshFileRef.current?.click();}} disabled={busy} style={sBtn}>CSV</button>
              <button onClick={()=>setImportMode("links")} disabled={busy} style={importMode==="links"?{...pBtn,opacity:1}:sBtn}>Links</button>
            </div>
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
                <button onClick={readLinks} disabled={busy} style={pBtn}>Read</button>
              </div>
              {busy&&prog.total>0&&<div style={{marginTop:8}}>
                <div style={{height:4,background:C.rule,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:Math.round(100*prog.done/prog.total)+"%",background:C.action}}/></div>
                <div style={{marginTop:4,fontSize:11,color:C.soft}}>{prog.label}</div>
              </div>}
              {linkNote&&<div style={{marginTop:6,fontSize:11.5,color:C.soft,lineHeight:1.45}}>{linkNote}</div>}
              {linkFails.map((f,i)=><div key={i} style={{marginTop:6,fontSize:11.5,color:TH.urgent.ink,lineHeight:1.4,overflowWrap:"anywhere"}}>
                {f.url&&<a href={f.url} target="_blank" rel="noopener noreferrer" style={{color:TH.urgent.ink}}>{f.url}</a>}{f.url?" \u2014 ":""}{f.why}
              </div>)}
            </div>}
            <div style={{textAlign:"center",marginTop:10}}>
              <button onClick={()=>{ if(!proposals)dropHeldVenues(); setImportMode(null); }} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Cancel</button>
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
              <div style={{fontSize:11.5,color:C.soft,marginTop:6,lineHeight:1.5}}>Review each one below.</div>
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
                const ordinary   = plain.filter(x=>x.p.cand&&x.p.cand.exUrl);
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
                {ordinary.length>0&&(()=>{
                    // Only venues with ordinary cards, or "Collapse all" would write keys
                    // for empty venues and read the wrong way next click.
                    const venuesHere=allVenues().filter(m=>ordinary.some(x=>x.p.venueId===m.id)).map(m=>m.id);
                    const anyOpen=venuesHere.some(id=>venueOpen(id));
                    return(
                    <div style={{marginBottom:12,display:"flex",alignItems:"flex-end",gap:12,flexWrap:"wrap"}}>
                      <div style={{flex:"1 1 260px",minWidth:0}}>
                        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:2}}>Normal cases {"\u00b7"} {ordinary.length}</div>
                        <div style={{fontSize:11.5,color:C.soft,lineHeight:1.55}}>Nothing unusual about these {"\u2014"} one row in the file, nothing combined, nothing disagreeing. Accept or reject each.</div>
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
                        <span style={{fontSize:14,letterSpacing:"0.01em",fontWeight:700}}>{m.short}</span>
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
              {/* ===== PARTIAL APPLY — stays until she says (CLAUDE.md §4) =====
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
              <div style={{fontSize:11.5,color:C.soft,marginTop:4}}>Check and approve each shop link.</div>
            </div>
            <div style={{overflow:"auto",padding:"4px 18px 14px",flex:1}}>
              {/* The review cards' buttons (decBtn), always the same three in the same
                  places (her decision); Confirm greyed with no section to confirm. */}
              {shopScreen.ids.map(id=>{
                const v=occVenues[id]||{}, link=v.shop==="found"?v.shopCatalogues:null, looking=shopLooking===id;
                const home=v.shop==="noshelf"||v.shop==="failed"?v.shopHome:null;
                const said=v.shop==="found"?null:v.shop==="noshelf"?"Shop found, but not its books section: "
                  :v.shop==="failed"?"Search failed.":"No museum shop found.";
                const yes=v.confirmed&&v.shop==="found", none=v.confirmed&&v.shop==="none";
                return <div key={id} style={{paddingTop:12,marginTop:10,borderTop:"1px solid "+C.rule,fontSize:12.5,color:C.ink,lineHeight:1.45}}>
                  <div style={{fontWeight:600}}>{v.name||id}</div>
                  {link?<a href={link} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{link}</a>
                    :<div style={{color:C.soft}}>{said}{home&&v.shop==="noshelf"&&<a href={home} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{home}</a>}</div>}
                  <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                    {looking?<span style={{fontSize:11.5,color:C.soft}}>Looking{"\u2026"}</span>:<>
                      <button onClick={()=>confirmShop(id)} disabled={!!shopLooking||!link} style={{...decBtn(yes,C.okEdge),...(!link?{opacity:0.4,cursor:"not-allowed"}:{})}}>{yes?"\u2713 ":""}Confirm</button>
                      <button onClick={()=>lookAgain(id)} disabled={!!shopLooking} style={decBtn(false,C.okEdge)}>Look again</button>
                      <button onClick={()=>noShopFor(id)} disabled={!!shopLooking} style={decBtn(none,C.rejectInk)}>{none?"\u2713 ":""}No shop</button>
                    </>}
                  </div>
                </div>;})}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid "+C.rule,display:"flex",gap:10,alignItems:"center"}}>
              <button onClick={()=>setShopScreen(null)} disabled={!!shopLooking} style={sBtn}>Back</button>
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
        Cat Watch {"·"} version {APP_VERSION} {"·"} {APP_VERSION_DATE}
      </footer>
    </div>
  );
}
