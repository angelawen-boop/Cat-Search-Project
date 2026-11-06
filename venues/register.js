/*
 * venues/register.js — every venue's facts, in one place (docs/restructure.md, item 4A).
 *
 * Data only. One entry per venue, in her venue order (chips, Sort by Venue, the freshness drawer, the
 * review); the venues with no chip of their own ("Occasional") sit in their country order. The scraper
 * requires this file; the join writes it into Cat_Watch.jsx (build/app_join.js), so the app's parts hold
 * no copy. Nothing about a venue is written anywhere else (build/venue_facts_check.js fails if it is).
 * A manual-import venue's facts learned since the last publish wait in the page's store
 * (`venues/occasional`) and show over its entry until `node build/file_venues.js` files them here.
 *
 * Every entry has the same fields:
 *   id, kind         "swept" (one of her 28, with a recipe in scraper/sweep_prototype.js) or "manual"
 *                    (Links, Pages and Paste)
 *   names.card       her name for it, wherever a venue is named
 *   names.chip       its own Venue chip's label; null: no chip of its own, its cards under "Occasional"
 *   names.group      venues sharing one chip (Munich, Berlin, Cini)
 *   names.full       its full name, in its own language; names.inEnglish: its English name, where different
 *   names.aka        other names it goes by (the shop is searched under them)
 *   names.lookup     the name the catalogue lookup searches with
 *   names.replaced   names Claude gave that she replaced (Claude's examples of her style)
 *   names.hers       the card name is hers, not Claude's (Claude is shown it as an example)
 *   city, country    where it is
 *   english          false: not English-speaking (the language check and the English-edition search);
 *                    null: not yet known. language: its language, where known ("French")
 *   shop.home, shop.catalogues, shop.search   its shop's front page, catalogue shelf and search box
 *                    (search: the address the exhibition title is added to)
 *   shop.unseen      "parallel" or "script": its books cannot be read, so a lookup there goes to the web
 *   shop.queries     the searches its shop is found by; shop.named: the house its shop's sections are named for
 *   shop.rankAsOwn   other houses ranked as its own imprint; shop.inStock: a book page's in-stock line
 *   read.link        how Links, Pages and Paste read its pages (docs/add_by_link.md, "Venue link rules")
 *   read.sites       other sites its pages sit on, {host, path, line}: `path` a part of a shared site,
 *                    `line` the house line naming it on a site several houses share
 *   read.dateOrder   "day" or "month": the order of an all-number date (scraper/dates.js)
 *   read.spacedYear  writes day.month with the year after a space ("16.2–26.5 2013")
 *   read.places      its galleries, where it has several (Acquavella, Lévy Gorvy Dayan): a show run in two
 *                    of them gets its gallery in brackets in its title, one shared description and the
 *                    "also shown at" note; a gallery tacked onto a title is not part of it, and a city
 *                    on this list is never another showing's. read.placeOwner: the venue's own name a
 *                    gallery may be written after ("Acquavella Palm Beach"). A venue with several
 *                    galleries needs only these two fields (her decision).
 *   read.subtitleUnderHeading   the line under a show page's heading is its subtitle
 *   sweep.exBase, sweep.listUrl   the sweep's show and listing addresses
 *   filed            the store record this entry was last filed from, as stored: the shop finder's findings
 *                    and her confirmations (shop, shopHome, shopCatalogues, shopSearch, confirmed,
 *                    turnedDown…) are read from it, and a waiting record equal to it is already filed.
 *
 */
'use strict';

// Palazzo Reale Milano's heading is the short name plus " - Palazzo Reale Milano", the full
// name on a line below it (nameInLines: the longest line between title and dates that starts
// with the short name; AL-048). Its pages on the city council's site open with a "# Navigation"
// heading and the site's menu; the show's heading is the one ending in the venue's name
// (titleHeading): "Palazzo Reale Milano", "Palazzo Reale, Milan" or "Royal Palace of Milan".
// Its English pages say "as of" for "to" ("from February 21, 2019 as of June 6, 2019";
// Antonello da Messina; asOfTo).
const PRM_TAIL = /\s+[-–—]\s+(?:Palazzo Reale,? Milano?|Royal Palace of Milan)$/i;
// Its "Upcoming Exhibitions" box lists other shows with their dates: the show's own dates and
// text end there (until, datesUntil; Soutine took the box's first dates).
const PRM_BOX = /^(?:Current|Upcoming|Past) Exhibitions$|^Mostre (?:in corso|future|passate)$/i;

const VENUES = [

  // The Met prints a show's dates on its "on view" line: below a podcast transcript (Manet/Degas), or above the only line naming the show (Impossible Conversations).
  { id: "met", kind: "swept",
    names: { card: "The Met", chip: "The Met", group: null, full: "The Metropolitan Museum of Art", inEnglish: null, aka: [], lookup: "The Met", replaced: [], hers: true },
    city: "New York", country: null, english: true, language: null,
    shop: { home: "https://store.metmuseum.org/", catalogues: "https://store.metmuseum.org/books-toys-games/exhibition-catalogues", search: "https://store.metmuseum.org/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { dateLine: /\bon view\b/i }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: "https://www.metmuseum.org/exhibitions/", listUrl: "https://www.metmuseum.org/exhibitions" },
    filed: null },

  { id: "ng", kind: "swept",
    names: { card: "NG UK", chip: "NG UK", group: null, full: "The National Gallery", inEnglish: null, aka: [], lookup: "National Gallery", replaced: [], hers: true },
    city: "London", country: null, english: true, language: null,
    shop: { home: "https://shop.nationalgallery.org.uk/", catalogues: "https://shop.nationalgallery.org.uk/books/exhibition-catalogues.html", search: "https://shop.nationalgallery.org.uk/catalogsearch/result/?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: "https://www.nationalgallery.org.uk/exhibitions/", listUrl: "https://www.nationalgallery.org.uk/exhibitions" },
    filed: null },

  { id: "occ-nga-gov", kind: "manual",
    names: { card: "NG Washington", chip: "NG Washington", group: null, full: "National Gallery of Art", inEnglish: null, aka: ["NGA"], lookup: "NGA", replaced: [], hers: true },
    city: "Washington, DC", country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-09T13:32:40.150Z", aka: ["NGA"], city: "Washington, DC", confirmed: true, country: "United States", english: true, finder: 3, foundBy: "a search", host: "www.nga.gov", id: "occ-nga-gov", name: "National Gallery of Art", pageShop: "https://shop.nga.gov/", shelfKind: "catalogues", shop: "found", shopCatalogues: "https://shop.nga.gov/collections/books-exhibition-catalogs", shopHome: "https://shop.nga.gov/", shopSearch: "https://shop.nga.gov/search?q=", turnedDown: [], why: null } },

  // The whole Publications shelf: the Frick files some show books outside "Exhibition catalogues" (her finding).
  { id: "frick", kind: "swept",
    names: { card: "Frick", chip: "Frick", group: null, full: "The Frick Collection", inEnglish: null, aka: [], lookup: "Frick", replaced: [], hers: true },
    city: "New York", country: null, english: true, language: null,
    shop: { home: "https://shop.frick.org/", catalogues: "https://shop.frick.org/publications/", search: "https://shop.frick.org/search.php?search_query=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { titleDrop: /^Special Loan:\s*/i }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "morgan", kind: "swept",
    names: { card: "Morgan", chip: "Morgan", group: null, full: "Morgan Library & Museum", inEnglish: null, aka: [], lookup: "Morgan", replaced: [], hers: true },
    city: "New York", country: null, english: true, language: null,
    shop: { home: "https://shop.themorgan.org/", catalogues: "https://shop.themorgan.org/collections/exhibition-catalogs", search: "https://shop.themorgan.org/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "artic", kind: "swept",
    names: { card: "Artic", chip: "Artic", group: null, full: "Art Institute of Chicago", inEnglish: null, aka: [], lookup: "Artic", replaced: [], hers: true },
    city: "Chicago", country: null, english: true, language: null,
    shop: { home: "https://shop.artic.edu/", catalogues: "https://shop.artic.edu/collections/exhibition-catalogues", search: "https://shop.artic.edu/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { from: /^Share$/, until: /^(?:Share|Related(?: Exhibitions| Products)?|Sign up for our enewsletter\b.*)$/, minLine: 60, skip: /\u00a9|Press 300ppi|Image CC|Photo courtesy|^(?:an?|the)\s+(?:[\w,\x27-]+\s+){0,5}?(?:painting|poster|drawing|photograph|photomontage|statuette|cover|print)\b,?\s+(?:of|with|reads|that|in|featuring|showing)\b/i }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "menil", kind: "swept",
    names: { card: "Menil", chip: "Menil", group: null, full: "The Menil Collection", inEnglish: null, aka: [], lookup: "Menil", replaced: [], hers: true },
    city: "Houston", country: null, english: true, language: null,
    shop: { home: "https://bookstore.menil.org/", catalogues: "https://bookstore.menil.org/collections/menil-publications", search: "https://bookstore.menil.org/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { titleDrop: /^Collection Close-Up:\s*/i }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // linkRead: Add by link options for met, acq, frick, menil, louvre, artic, brit, cincinnati, moma (docs/add_by_link.md, "Venue link rules").
  // No apostrophe or double quote inside a linkRead pattern (write \x27): compress.js seedMemory scans this list as text.
  { id: "acq", kind: "swept",
    names: { card: "Acquavella", chip: "Acquavella", group: null, full: "Acquavella Galleries", inEnglish: null, aka: [], lookup: "Acquavella", replaced: [], hers: true },
    city: "New York", country: null, english: true, language: null,
    shop: { home: "https://acquavellagalleries.myshopify.com/", catalogues: "https://acquavellagalleries.myshopify.com/collections/all", search: "https://acquavellagalleries.myshopify.com/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { title: "subtitle", credit: /^In collaboration with\b/i, dashAfterColon: true, from: /^Press Release$/, minLine: 60, skip: /^Gallery Hours:|\bImage Courtesy\b/, skipEntities: true, cleanLink: true }, sites: [], dateOrder: null, spacedYear: false, places: ["New York", "Palm Beach"], placeOwner: "Acquavella", subtitleUnderHeading: false },
    sweep: { exBase: "https://www.acquavellagalleries.com/exhibitions/", listUrl: "https://www.acquavellagalleries.com/exhibitions" },
    filed: null },

  // Shopify, like Acquavella's. Chip "Levy", cards "Lévy Gorvy Dayan" (her decision).
  { id: "lgd", kind: "swept",
    names: { card: "L\u00e9vy Gorvy Dayan", chip: "Levy", group: null, full: "L\u00e9vy Gorvy Dayan", inEnglish: null, aka: [], lookup: "Levy", replaced: [], hers: true },
    city: "New York / London", country: null, english: true, language: null,
    shop: { home: "https://shop.levygorvydayan.com/", catalogues: "https://shop.levygorvydayan.com/collections/all", search: "https://shop.levygorvydayan.com/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: ["New York", "London"], placeOwner: "L\u00e9vy Gorvy Dayan", subtitleUnderHeading: false },
    sweep: { exBase: "https://www.levygorvydayan.com/exhibitions/", listUrl: "https://www.levygorvydayan.com/exhibitions" },
    filed: null },

  // Mia's page titles end "–– Minneapolis Institute of Art".
  { id: "occ-new-artsmia-org", kind: "manual",
    names: { card: "Mia", chip: "Mia", group: null, full: "Minneapolis Institute of Art", inEnglish: null, aka: [], lookup: "Mia", replaced: [], hers: true },
    city: null, country: null, english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { titleDrop: /\s+[-–—]+\s+Minneapolis Institute of Art$/i }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-13T13:05:11.688Z", confirmed: true, english: true, finder: 3, foundBy: "a search", host: "new.artsmia.org", id: "occ-new-artsmia-org", name: "Minneapolis Institute of Art", pageShop: "", shelfKind: "catalogues", shop: "found", shopCatalogues: "https://shop.artsmia.org/collections/exhibition-catalogues", shopHome: "https://shop.artsmia.org/", shopSearch: "https://shop.artsmia.org/search?q=", turnedDown: [], why: null } },

  // Her addition, after Artic. Shopify: search box and her Books shelf.
  { id: "cincinnati", kind: "swept",
    names: { card: "Cincinnati", chip: "Cincinnati", group: null, full: "Cincinnati Art Museum", inEnglish: null, aka: [], lookup: "Cincinnati", replaced: [], hers: true },
    city: "Cincinnati", country: null, english: true, language: null,
    shop: { home: "https://shop.cincinnatiartmuseum.org/", catalogues: "https://shop.cincinnatiartmuseum.org/collections/books", search: "https://shop.cincinnatiartmuseum.org/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { crumb: true }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // rankAsOwn: other houses ranked as the venue's own in her order, display only (her decision:
  // Yale's two imprints rank the same).
  { id: "occ-britishart-yale-edu", kind: "manual",
    names: { card: "Yale CBA", chip: "Yale CBA", group: null, full: "Yale Center for British Art", inEnglish: null, aka: [], lookup: "Yale Center for British Art", replaced: [], hers: true },
    city: null, country: null, english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: ["Yale University Press"], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-17T06:44:41.407Z", confirmed: true, english: true, finder: 3, foundBy: "the shop's menu", host: "britishart.yale.edu", id: "occ-britishart-yale-edu", name: "Yale Center for British Art", pageShop: "", shelfKind: "publications", shop: "found", shopCatalogues: "https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true", shopHome: "https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true", shopSearch: null, turnedDown: [], why: null } },

  { id: "brit", kind: "swept",
    names: { card: "British Museum", chip: "British Museum", group: null, full: "The British Museum", inEnglish: null, aka: [], lookup: "British Museum", replaced: [], hers: true },
    city: "London", country: null, english: true, language: null,
    shop: { home: "https://britishmuseumshoponline.org/", catalogues: "https://www.britishmuseumshoponline.org/books/exhibition-books.html", search: "https://www.britishmuseumshoponline.org/catalogsearch/result/?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { from: /^(?:For the catalogue, homewares and gifts from the exhibition|Book tickets$)/ }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "tate-britain", kind: "swept",
    names: { card: "Tate Britain", chip: "Tate Britain", group: null, full: "Tate Britain", inEnglish: null, aka: [], lookup: "Tate Britain", replaced: [], hers: true },
    city: "London", country: null, english: true, language: null,
    shop: { home: "https://shop.tate.org.uk/", catalogues: "https://shop.tate.org.uk/books/exhibition-books?sz=96", search: "https://shop.tate.org.uk/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "wallace", kind: "swept",
    names: { card: "Wallace", chip: "Wallace", group: null, full: "The Wallace Collection", inEnglish: null, aka: [], lookup: "Wallace", replaced: [], hers: true },
    city: "London", country: null, english: true, language: null,
    shop: { home: "https://wallacecollectionshop.org/", catalogues: "https://wallacecollectionshop.org/collections/wallace-collection-publications", search: "https://wallacecollectionshop.org/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "va", kind: "swept",
    names: { card: "V&A", chip: "V&A", group: null, full: "Victoria and Albert Museum", inEnglish: null, aka: [], lookup: "V&A", replaced: [], hers: true },
    city: "London", country: null, english: true, language: null,
    shop: { home: "https://www.vam.ac.uk/shop", catalogues: "https://www.vam.ac.uk/shop/books/exhibition-books.html", search: "https://www.vam.ac.uk/shop/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "occ-nationalgalleries-org", kind: "manual",
    names: { card: "NG Scotland", chip: "NG Scotland", group: null, full: "National Galleries of Scotland", inEnglish: null, aka: [], lookup: "NG Scotland", replaced: [], hers: true },
    city: null, country: null, english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-13T12:48:23.190Z", confirmed: true, english: true, finder: 3, foundBy: "a search", host: "www.nationalgalleries.org", id: "occ-nationalgalleries-org", name: "National Galleries of Scotland", pageShop: "https://shop.nationalgalleries.org/", shelfKind: "books", shop: "found", shopCatalogues: "https://shop.nationalgalleries.org/collection-exhibitions/exhibition-books/", shopHome: "https://shop.nationalgalleries.org/", shopSearch: "https://shop.nationalgalleries.org/search?q=", turnedDown: [], why: null } },

  { id: "louvre", kind: "swept",
    names: { card: "Louvre", chip: "Louvre", group: null, full: "Louvre Museum", inEnglish: null, aka: [], lookup: "Louvre", replaced: [], hers: true },
    city: "Paris", country: null, english: false, language: "French",
    shop: { home: "https://boutique.louvre.fr/en/", catalogues: "https://boutique.louvre.fr/en/products/400001-exhibition-catalogues/", search: "https://boutique.louvre.fr/en/search/products/?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { title: "pieces", minLine: 60, skip: /\bclosed\b|remain open|apologis|pleasant visit/i }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // The French venues below share the Louvre's shop system: search box and "Exhibition catalogs" shelf.
  // Orsay: the national museums' shared shop; shelf and search are hers (the search covers every museum there).
  { id: "orsay", kind: "swept",
    names: { card: "Orsay", chip: "Orsay", group: null, full: "Mus\u00e9e d'Orsay", inEnglish: null, aka: [], lookup: "Orsay", replaced: [], hers: true },
    city: "Paris", country: null, english: false, language: "French",
    shop: { home: "https://www.boutiquesdemusees.fr/en/ext/products/musee-orsay/5452-exhibition-catalogues/", catalogues: "https://www.boutiquesdemusees.fr/en/ext/products/musee-orsay/5452-exhibition-catalogues/", search: "https://www.boutiquesdemusees.fr/en/search/products/?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // subtitleUnderHeading: the line under a show page's heading is its subtitle, read by code
  // for Add by link (docs/link_pages/).
  { id: "jacquemart", kind: "swept",
    names: { card: "Jacquemart-Andr\u00e9", chip: "Jacquemart", group: null, full: "Mus\u00e9e Jacquemart-Andr\u00e9", inEnglish: null, aka: [], lookup: "Jacquemart-Andr\u00e9", replaced: [], hers: true },
    city: "Paris", country: null, english: false, language: "French",
    shop: { home: "https://boutique.musee-jacquemart-andre.com/en/", catalogues: "https://boutique.musee-jacquemart-andre.com/en/products/116-exhibition-catalogs/", search: "https://boutique.musee-jacquemart-andre.com/en/search/products/?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: true },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // Chantilly (Musée Condé): chip "Chantilly" after Jacquemart; its cards keep the store's name (her decision).
  { id: "occ-chateaudechantilly-fr", kind: "manual",
    names: { card: "Chantilly Mus\u00e9e Cond\u00e9", chip: "Chantilly", group: null, full: "Mus\u00e9e Cond\u00e9, Ch\u00e2teau de Chantilly", inEnglish: null, aka: ["Ch\u00e2teau de Chantilly", "Domaine de Chantilly"], lookup: "Chantilly Mus\u00e9e Cond\u00e9", replaced: [], hers: false },
    city: "Chantilly", country: "France", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T02:55:17.273Z", aka: ["Ch\u00e2teau de Chantilly", "Domaine de Chantilly"], city: "Chantilly", confirmed: true, country: "France", english: false, englishPicked: false, finder: 3, gallery: false, host: "chateaudechantilly.fr", id: "occ-chateaudechantilly-fr", name: "Mus\u00e9e Cond\u00e9, Ch\u00e2teau de Chantilly", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Chantilly Mus\u00e9e Cond\u00e9", turnedDown: [], why: null } },

  // No search box, so the publications shelf is the only route in. Pages are numbered in the
  // path (/c462/2/; shelfPages). shopHome is the shelf, so her shop link lands on the books.
  { id: "mad", kind: "swept",
    names: { card: "MAD Paris", chip: "MAD Paris", group: null, full: "Mus\u00e9e des Arts D\u00e9coratifs", inEnglish: null, aka: [], lookup: "MAD Paris", replaced: [], hers: true },
    city: "Paris", country: null, english: false, language: "French",
    shop: { home: "https://boutique.madparis.fr/en/mads-publications/c462/1/", catalogues: "https://boutique.madparis.fr/en/mads-publications/c462/1/", search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "rijks", kind: "swept",
    names: { card: "Rijksmuseum", chip: "Rijks", group: null, full: "Rijksmuseum", inEnglish: null, aka: [], lookup: "Rijksmuseum", replaced: [], hers: true },
    city: "Amsterdam", country: null, english: false, language: "Dutch",
    shop: { home: "https://www.rijksmuseumshop.nl/en/", catalogues: "https://www.rijksmuseumshop.nl/en/books/exhibition-books", search: "https://www.rijksmuseumshop.nl/en/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: "https://www.rijksmuseum.nl/en/whats-on/exhibitions/", listUrl: "https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view" },
    filed: null },

  // Search address is hers. The shop answers with a waiting room, so the lookup reports it
  // blocked; the address stays for her shop link.
  { id: "khm", kind: "swept",
    names: { card: "KHM", chip: "KHM", group: null, full: "Kunsthistorisches Museum", inEnglish: null, aka: [], lookup: "KHM", replaced: [], hers: true },
    city: "Vienna", country: null, english: false, language: "German",
    shop: { home: "https://shop.khm.at/en/", catalogues: null, search: "https://shop.khm.at/en/products?shop%5Bq%5D=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // The Prado: chip "Prado" right after KHM, cards "Prado Madrid" (her decision). Its dates are month first
  // (DATE_ORDER, dates.js).
  // Its all-number dates: "6/9/2026 - 9/27/2026".
  { id: "occ-museodelprado-es", kind: "manual",
    names: { card: "Prado Madrid", chip: "Prado", group: null, full: "Museo Nacional del Prado", inEnglish: null, aka: ["Prado", "Museo del Prado"], lookup: "Museo Nacional del Prado", replaced: [], hers: true },
    city: "Madrid", country: "Spain", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: "month", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T04:52:37.794Z", aka: ["Prado", "Museo del Prado"], city: "Madrid", confirmed: true, country: "Spain", english: false, englishPicked: false, finder: 3, foundBy: "a search", gallery: false, host: "www.museodelprado.es", id: "occ-museodelprado-es", name: "Museo Nacional del Prado", pageShop: "https://tiendaprado.com/en/", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://tiendaprado.com/en/410-catalogues", shopEnglishUnread: null, shopHome: "https://tiendaprado.com/", shopSearch: null, short: "Madrid Prado", turnedDown: [], why: null } },

  // Munich's Alte Pinakothek, Pinakothek der Moderne and Sammlung Schack: three venues on one
  // site (pinakothek.de), one chip "Munich", the Alte first (her decision). The house line
  // between the show's title and its dates says which ("Pinakothek der Moderne | Art"); der
  // Moderne's own site prints "10/07/2026 - 04/10/2026" above the title, day first. The Alte
  // and der Moderne's shops are searched in German (`shopQueries`); CEDON sells for both, its
  // sections named for each house (`shopNamed`, namesVenue). Schack has no shop of its own and
  // no CEDON section: it gets no shop settings, so the finder answers "none". Titles typed in
  // capitals are recased (`capsTitles`).
  // Its all-number dates: "27.10.2023-04.02.2024".
  { id: "occ-alte-pinakothek", kind: "manual",
    names: { card: "Munich Alte Pinakothek", chip: "Munich", group: "munich-pinakotheken", full: "Alte Pinakothek M\u00fcnchen", inEnglish: null, aka: [], lookup: "Alte Pinakothek", replaced: [], hers: true },
    city: "Munich", country: "Germany", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: ["Alte Pinakothek M\u00fcnchen Museumsshop Kataloge"], named: "Alte Pinakothek", rankAsOwn: [], inStock: null },
    read: { link: { capsTitles: true }, sites: [{ host: "pinakothek.de", line: /^Alte Pinakothek\b/i }], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-18T05:37:39.636Z", confirmed: true, english: false, finder: 3, foundBy: "a search", host: "www.pinakothek.de", id: "occ-alte-pinakothek", name: "pinakothek.de", pageShop: "", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://www.museumsshop.cedon.de/Kataloge/Alte-Pinakothek-Muenchen", shopHome: "https://www.museumsshop.cedon.de/", shopSearch: "https://www.museumsshop.cedon.de/search?search=", turnedDown: [], why: null } },

  // Its all-number dates: "10/07/2026 - 04/10/2026", "09.10.2026-21.02.2027".
  { id: "occ-pinakothek-der-moderne", kind: "manual",
    names: { card: "Munich der Moderne", chip: "Munich", group: "munich-pinakotheken", full: "Pinakothek der Moderne M\u00fcnchen", inEnglish: null, aka: [], lookup: "Pinakothek der Moderne", replaced: [], hers: true },
    city: "Munich", country: "Germany", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: ["Pinakothek der Moderne M\u00fcnchen Museumsshop Kataloge"], named: "Pinakothek der Moderne", rankAsOwn: [], inStock: null },
    read: { link: { capsTitles: true }, sites: [{ host: "pinakothek.de", line: /^Pinakothek der Moderne\b/i }, { host: "pinakothek-der-moderne.de" }], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-18T05:37:59.500Z", confirmed: true, english: false, finder: 3, foundBy: "a search", host: "www.pinakothek.de", id: "occ-pinakothek-der-moderne", name: "pinakothek.de", pageShop: "", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://www.museumsshop.cedon.de/Kataloge/Pinakothek-der-Moderne-Muenchen", shopHome: "https://www.museumsshop.cedon.de/", shopSearch: "https://www.museumsshop.cedon.de/search?search=", turnedDown: [], why: null } },

  // Its all-number dates: "14.10.2027-13.02.2028".
  { id: "occ-sammlung-schack", kind: "manual",
    names: { card: "Munich Sammlung Schack", chip: "Munich", group: "munich-pinakotheken", full: "Sammlung Schack", inEnglish: null, aka: [], lookup: "Sammlung Schack", replaced: [], hers: true },
    city: "Munich", country: "Germany", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { capsTitles: true }, sites: [{ host: "pinakothek.de", line: /^Sammlung Schack\b/i }], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-18T05:37:46.493Z", confirmed: true, english: false, finder: 3, host: "www.pinakothek.de", id: "occ-sammlung-schack", name: "pinakothek.de", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopHome: null, shopSearch: null, turnedDown: [], why: null } },

  // Staatliche Museen zu Berlin (smb.museum): chip "Berlin" after KHM, cards "Berlin Gemäldegalerie" (her decision).
  // The Alte and Neue Nationalgalerie are venues under the chip too, cards "Berlin Alte NG" and "Berlin Neue NG"
  // (her decision): their pages sit under their own paths, or carry their house line just under the dates
  // (Böcklin, Wols); every other smb.museum page files under the Gemäldegalerie, as before (linkVenue).
  // Its all-number dates: "14.05.2027 to 12.09.2027".
  { id: "occ-smb-museum", kind: "manual",
    names: { card: "Berlin Gem\u00e4ldegalerie", chip: "Berlin", group: "berlin", full: "Staatliche Museen zu Berlin", inEnglish: null, aka: [], lookup: "Gem\u00e4ldegalerie Berlin", replaced: [], hers: true },
    city: "Berlin", country: "Germany", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-18T04:37:40.571Z", aka: ["Staatliche Museen zu Berlin", "Old National Gallery"], city: "Berlin", confirmed: true, country: "Germany", english: false, finder: 3, foundBy: "the shop's menu", host: "www.smb.museum", id: "occ-smb-museum", name: "Staatliche Museen zu Berlin", pageShop: "https://www.smb.museum/webshop", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://www.smb-webshop.de/buecher-und-medien/ausstellungskataloge/", shopHome: "https://www.smb-webshop.de/", shopSearch: "https://www.smb-webshop.de/search?sSearch=", turnedDown: [], why: null } },

  // Its all-number dates: "19.03.2027 to 01.08.2027".
  { id: "occ-alte-nationalgalerie", kind: "manual",
    names: { card: "Berlin Alte NG", chip: "Berlin", group: "berlin", full: "Alte Nationalgalerie", inEnglish: null, aka: ["Staatliche Museen zu Berlin", "Old National Gallery"], lookup: "Alte Nationalgalerie Berlin", replaced: [], hers: true },
    city: "Berlin", country: "Germany", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [{ host: "smb.museum", path: /\/museums-institutions\/alte-nationalgalerie\//i }, { host: "smb.museum", line: /^Alte Nationalgalerie$/i }], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-26T06:01:09.715Z", aka: ["Staatliche Museen zu Berlin", "Old National Gallery"], city: "Berlin", confirmed: true, country: "Germany", english: false, englishPicked: false, finder: 3, foundBy: "the shop's menu", host: "www.smb.museum", id: "occ-alte-nationalgalerie", name: "Alte Nationalgalerie", pageShop: "https://www.smb.museum/webshop", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://www.smb-webshop.de/buecher-und-medien/ausstellungskataloge/", shopEnglishUnread: null, shopHome: "https://www.smb-webshop.de/museen-und-sammlungen/", shopSearch: null, short: "Berlin Alte NG", turnedDown: [], why: null } },

  // Its all-number dates: "20.03.2026 to 09.08.2026".
  { id: "occ-neue-nationalgalerie", kind: "manual",
    names: { card: "Berlin Neue NG", chip: "Berlin", group: "berlin", full: "Neue Nationalgalerie", inEnglish: null, aka: [], lookup: "Neue Nationalgalerie Berlin", replaced: [], hers: true },
    city: "Berlin", country: "Germany", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [{ host: "smb.museum", path: /\/museums-institutions\/neue-nationalgalerie\//i }, { host: "smb.museum", line: /^Neue Nationalgalerie$/i }], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-26T07:16:16.435Z", aka: ["Kupferstichkabinett", "Museum of Prints and Drawings", "SMB"], city: "Berlin", confirmed: true, country: "Germany", english: false, englishPicked: false, finder: 3, foundBy: "the shop's menu", host: "www.smb.museum", id: "occ-neue-nationalgalerie", name: "Kupferstichkabinett, Staatliche Museen zu Berlin", pageShop: "https://www.smb.museum/webshop", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://www.smb-webshop.de/buecher-und-medien/ausstellungskataloge/", shopEnglishUnread: null, shopHome: "https://www.smb-webshop.de/museen-und-sammlungen/", shopSearch: null, short: "Berlin Kupferstichkabinett", turnedDown: [], why: null } },

  // Dresden's Gemäldegalerie Alte Meister: chip "Dresden", cards "Dresden Gemäldegalerie" (her
  // decision). Its pages open with a short "# " name above every SKD museum's menu; the show's
  // own heading follows "Active page:" (titleAfter). Dates day first with slashes; the site
  // line ("Exhibition Site Zwinger") never reaches Claude (her decision; skip).
  // Its all-number dates: "14/04/2022—31/07/2022".
  { id: "occ-gemaeldegalerie-skd-museum", kind: "manual",
    names: { card: "Dresden Gem\u00e4ldegalerie", chip: "Dresden", group: null, full: "Gem\u00e4ldegalerie Alte Meister", inEnglish: null, aka: [], lookup: "Gem\u00e4ldegalerie Alte Meister Dresden", replaced: [], hers: true },
    city: null, country: null, english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { titleAfter: /^Active page:/, skip: /^(?:Exhibition Site\b|Opening Hours\b|\[Translate to English:\]|\u00a9)/ }, sites: [], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-18T05:48:07.945Z", confirmed: true, english: false, finder: 3, host: "gemaeldegalerie.skd.museum", id: "occ-gemaeldegalerie-skd-museum", name: "Gem\u00e4ldegalerie Alte Meister", pageShop: "https://shop.skd.museum/", searchRule: 2, shelfKind: null, shop: "none", shopCatalogues: null, shopHome: null, shopSearch: null, turnedDown: [], why: null } },

  // The Städel (staedelmuseum.de): chip "Frankfurt" after Dresden, cards "Frankfurt Städel" (her decision).
  // Written in, her decision: its shop's books section (the finder cannot see its books), and
  // `shopUnseen` — its books are in the page's HTML but Parallel drops them, so a shop page
  // with no priced line reads "Parallel fault" (docs/add_by_link.md, "Frankfurt").
  { id: "occ-staedelmuseum-de", kind: "manual",
    names: { card: "St\u00e4del Frankfurt", chip: "Frankfurt", group: null, full: "St\u00e4del Museum", inEnglish: null, aka: [], lookup: "St\u00e4del Museum", replaced: [], hers: true },
    city: null, country: null, english: false, language: null,
    shop: { home: "https://liebieghaus.ticketfritz.de/", catalogues: "https://liebieghaus.ticketfritz.de/Shop/Index/staedel-publikationen/43885", search: null, unseen: "parallel", queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-19T04:12:56.470Z", confirmed: true, english: false, finder: 3, foundBy: "the venue's rule", host: "www.staedelmuseum.de", id: "occ-staedelmuseum-de", name: "St\u00e4del Museum", pageShop: "", searchRule: 2, shelfKind: null, shop: "found", shopCatalogues: "https://liebieghaus.ticketfritz.de/Shop/Index/staedel-publikationen/43885", shopHome: "https://liebieghaus.ticketfritz.de/", shopSearch: null, turnedDown: [], why: null } },

  // Its all-number dates: "From 18/06/2025 to 28/09/2025".
  { id: "uffizi", kind: "swept",
    names: { card: "Uffizi", chip: "Uffizi", group: null, full: "Uffizi Galleries", inEnglish: null, aka: [], lookup: "Uffizi", replaced: [], hers: true },
    city: "Florence", country: null, english: false, language: "Italian",
    shop: { home: "https://shop.uffizi.it/en/", catalogues: null, search: "https://shop.uffizi.it/en/?s=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "dellav", kind: "swept",
    names: { card: "Accademia", chip: "Accademia", group: null, full: "Gallerie dell'Accademia", inEnglish: null, aka: [], lookup: "Accademia", replaced: [], hers: true },
    city: "Venice", country: null, english: false, language: "Italian",
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "borghese", kind: "swept",
    names: { card: "Borghese", chip: "Borghese", group: null, full: "Galleria Borghese", inEnglish: null, aka: [], lookup: "Borghese", replaced: [], hers: true },
    city: "Rome", country: null, english: false, language: "Italian",
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "brera", kind: "swept",
    names: { card: "Brera", chip: "Brera", group: null, full: "Pinacoteca di Brera", inEnglish: null, aka: [], lookup: "Brera", replaced: [], hers: true },
    city: "Milan", country: null, english: false, language: "Italian",
    shop: { home: "https://bottegabrera.org/en/", catalogues: "https://bottegabrera.org/en/collections/guide-e-cataloghi", search: "https://bottegabrera.org/en/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "capo", kind: "swept",
    names: { card: "Capodimonte", chip: "Capo", group: null, full: "Museo e Real Bosco di Capodimonte aka Museo Nazionale di Capodimonte", inEnglish: null, aka: [], lookup: "Capodimonte", replaced: [], hers: true },
    city: "Naples", country: null, english: false, language: "Italian",
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // The Cini Foundation and its island's two houses: three venues, Claude's names, under one chip "Cini" after
  // Capodimonte (her decision).
  { id: "occ-cini-it", kind: "manual",
    names: { card: "Fondazione Cini", chip: "Cini", group: "cini", full: "Fondazione Giorgio Cini", inEnglish: null, aka: ["Fondazione Giorgio Cini Onlus", "Cini Foundation"], lookup: "Fondazione Cini", replaced: ["Venice Cini"], hers: true },
    city: "Venice", country: "Italy", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T04:43:01.799Z", aka: ["Fondazione Giorgio Cini Onlus", "Cini Foundation"], city: "Venice", confirmed: true, country: "Italy", english: false, englishPicked: false, finder: 3, gallery: false, host: "www.cini.it", id: "occ-cini-it", name: "Fondazione Giorgio Cini", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Venice Cini", turnedDown: [], why: null } },

  { id: "occ-lestanzedelvetro-org", kind: "manual",
    names: { card: "Le Stanze del Vetro", chip: "Cini", group: "cini", full: "Le Stanze del Vetro", inEnglish: null, aka: [], lookup: "Le Stanze del Vetro", replaced: [], hers: false },
    city: "Venice", country: "Italy", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T04:38:56.876Z", aka: [], city: "Venice", confirmed: true, country: "Italy", english: false, englishPicked: false, finder: 3, foundBy: "the shop's front page", gallery: false, host: "lestanzedelvetro.org", id: "occ-lestanzedelvetro-org", name: "Le Stanze del Vetro", pageShop: "", searchRule: 2, shelfKind: "front", shop: "found", shopCatalogues: "https://lestanzedelvetro.org/en/shop/", shopEnglishUnread: null, shopHome: "https://lestanzedelvetro.org/en/shop/", shopSearch: "https://lestanzedelvetro.org/en/?post_type=product&s=", short: "Le Stanze del Vetro", turnedDown: ["https://lestanzedelvetro.org/en/shop/"], why: null } },

  { id: "occ-lestanzedellafotografia-it", kind: "manual",
    names: { card: "Stanze della Fotografia Venice", chip: "Cini", group: "cini", full: "Le Stanze della Fotografia", inEnglish: null, aka: [], lookup: "Stanze della Fotografia Venice", replaced: ["Venice Stanze della Fotografia"], hers: true },
    city: "Venice", country: "Italy", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T04:42:51.092Z", aka: [], city: "Venice", confirmed: true, country: "Italy", english: false, englishPicked: false, finder: 3, gallery: false, host: "lestanzedellafotografia.it", id: "occ-lestanzedellafotografia-it", name: "Le Stanze della Fotografia", pageShop: "", searchRule: 2, shelfKind: "front", shop: "found", shopCatalogues: "https://lestanzedellafotografia.it/it/attivita/bookshop", shopEnglishUnread: null, shopHome: "https://lestanzedellafotografia.it/it/attivita/bookshop", shopSearch: null, short: "Venice Stanze della Fotografia", turnedDown: [], why: null } },

  // inStock: a book page there whose own status line says "In Stock" is for sale; its Add to Cart is drawn by script, so the
  // page as read lacks it (Labrouste; her decision, a MoMA rule; docs/catalogue_versions.md, "MoMA *Brancusi*").
  { id: "moma", kind: "swept",
    names: { card: "MoMA", chip: "MoMA", group: null, full: "Museum of Modern Art", inEnglish: null, aka: [], lookup: "MoMA", replaced: [], hers: true },
    city: "New York", country: null, english: true, language: null,
    shop: { home: "https://store.moma.org/", catalogues: "https://store.moma.org/collections/exhibition-catalogues", search: "https://store.moma.org/collections/shop?q=" /* her own search */, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: { path: /^\/products\//, line: /\bItem#\s*\S+\s+In Stock\b/ } },
    read: { link: { spaceBeforeComma: true }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "tate-modern", kind: "swept",
    names: { card: "Tate Modern", chip: "Tate Modern", group: null, full: "Tate Modern", inEnglish: null, aka: [], lookup: "Tate Modern", replaced: [], hers: true },
    city: "London", country: null, english: true, language: null,
    shop: { home: "https://shop.tate.org.uk/", catalogues: "https://shop.tate.org.uk/books/exhibition-books?sz=96", search: "https://shop.tate.org.uk/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // The search is hers, query moved last so the title can follow. A Cloudflare check refuses
  // us, so the lookup reports it blocked; the address stays for her shop link.
  { id: "mam", kind: "swept",
    names: { card: "MAM Paris", chip: "MAM Paris", group: null, full: "Mus\u00e9e d'Art Moderne de Paris", inEnglish: null, aka: [], lookup: "MAM Paris", replaced: [], hers: true },
    city: "Paris", country: null, english: false, language: "French",
    shop: { home: "https://www.mamlibrairieboutique.fr/", catalogues: null, search: "https://www.mamlibrairieboutique.fr/listeliv.php?flou&base=paper&mots_recherche=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // Under "Occasional". Boston MFA prints the dates on the line above the show's title.
  { id: "occ-mfa-org", kind: "manual",
    names: { card: "Boston MFA", chip: null, group: null, full: "Museum of Fine Arts Boston", inEnglish: null, aka: ["MFA", "MFA Boston"], lookup: "Boston MFA", replaced: [], hers: true },
    city: "Boston", country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-14T10:44:35.097Z", aka: ["MFA", "MFA Boston"], city: "Boston", confirmed: true, country: "United States", english: true, finder: 3, foundBy: "a search", gallery: false, host: "www.mfa.org", id: "occ-mfa-org", name: "Museum of Fine Arts Boston", pageShop: "", shelfKind: "catalogues", shop: "found", shopCatalogues: "https://mfashop.com/books/exhibition-catalogues/", shopHome: "https://mfashop.com/", shopSearch: "https://mfashop.com/search?q=", turnedDown: [], why: null } },

  { id: "occ-clevelandart-org", kind: "manual",
    names: { card: "Cleveland", chip: null, group: null, full: "Cleveland Museum of Art", inEnglish: null, aka: [], lookup: "Cleveland", replaced: [], hers: false },
    city: null, country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-04T01:01:30.062Z", confirmed: true, english: true, finder: 2, foundBy: "the shop's menu", host: "www.clevelandart.org", id: "occ-clevelandart-org", name: "Cleveland Museum of Art", pageShop: "https://shop.clevelandart.org/", rejected: [], shelfKind: "catalogues", shop: "found", shopCatalogues: "https://shop.clevelandart.org/collections/exhibitions", shopHome: "https://shop.clevelandart.org/", shopSearch: "https://shop.clevelandart.org/search?q=", short: "Cleveland", turnedDown: [], why: null } },

  { id: "occ-dia-org", kind: "manual",
    names: { card: "Detroit", chip: null, group: null, full: "Detroit Institute of Arts Museum", inEnglish: null, aka: [], lookup: "Detroit", replaced: [], hers: false },
    city: null, country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-04T01:01:25.244Z", confirmed: true, english: true, finder: 3, foundBy: "a search", host: "dia.org", id: "occ-dia-org", name: "Detroit Institute of Arts Museum", pageShop: "https://diashop.org/", rejected: [], shelfKind: "books", shop: "found", shopCatalogues: "https://diashop.org/dia-publications/", shopHome: "https://diashop.org/", shopSearch: "https://diashop.org/search.php?search_query=", short: "Detroit", turnedDown: ["https://diashop.org/dia-museum-book-shop"], why: null } },

  { id: "occ-archive-worcesterart-org", kind: "manual",
    names: { card: "Worcester", chip: null, group: null, full: "Worcester Art Museum", inEnglish: null, aka: [], lookup: "Worcester", replaced: [], hers: true },
    city: null, country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-13T13:04:00.912Z", confirmed: true, english: true, finder: 3, foundBy: "the shop's list of sections", host: "archive.worcesterart.org", id: "occ-archive-worcesterart-org", name: "Worcester Art Museum", pageShop: "https://archive.worcesterart.org/visit/shop/", shelfKind: "catalogues", shop: "found", shopCatalogues: "https://the-museum-shop-at-wam.myshopify.com/collections/catalogs", shopHome: "https://the-museum-shop-at-wam.myshopify.com/", shopSearch: "https://the-museum-shop-at-wam.myshopify.com/search?q=", turnedDown: [], why: null } },

  { id: "occ-adelsongalleries-com", kind: "manual",
    names: { card: "Adelson Galleries", chip: null, group: null, full: "Adelson Galleries", inEnglish: null, aka: [], lookup: "Adelson Galleries", replaced: [], hers: false },
    city: null, country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-14T10:49:19.375Z", confirmed: true, english: true, finder: 3, host: "adelsongalleries.com", id: "occ-adelsongalleries-com", name: "Adelson Galleries", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopHome: null, shopSearch: null, turnedDown: [], why: null } },

  { id: "occ-wallach-columbia-edu", kind: "manual",
    names: { card: "Wallach Gallery Columbia", chip: null, group: null, full: "Miriam and Ira D. Wallach Art Gallery", inEnglish: null, aka: ["Wallach Art Gallery"], lookup: "Wallach Gallery Columbia", replaced: ["Columbia Wallach"], hers: true },
    city: "New York", country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T13:35:54.995Z", aka: ["Wallach Art Gallery"], city: "New York", confirmed: true, country: "United States", english: true, englishPicked: false, finder: 3, gallery: false, host: "wallach.columbia.edu", id: "occ-wallach-columbia-edu", name: "Miriam and Ira D. Wallach Art Gallery", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Columbia Wallach", turnedDown: [], why: null } },

  // The Getty (her decision, Getty only): its collection database's exhibition pages are titled
  // "Museum Collection", so their heading is the show's name.
  { id: "occ-getty-edu", kind: "manual",
    names: { card: "Getty Museum", chip: null, group: null, full: "J. Paul Getty Museum", inEnglish: null, aka: ["Getty Museum", "Getty Center"], lookup: "Getty Museum", replaced: [], hers: false },
    city: "Los Angeles", country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { tabNotName: /^Museum Collection$/ }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T10:04:35.166Z", aka: ["Getty Museum", "Getty Center"], city: "Los Angeles", confirmed: true, country: "United States", english: true, englishPicked: false, finder: 3, foundBy: "the shop's list of sections", gallery: false, host: "www.getty.edu", id: "occ-getty-edu", name: "J. Paul Getty Museum", pageShop: "http://shop.getty.edu/", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://shop.getty.edu/collections/exhibition-catalogues", shopEnglishUnread: null, shopHome: "https://shop.getty.edu/", shopSearch: "https://shop.getty.edu/search?q=", short: "Getty Museum", turnedDown: ["https://shop.getty.edu/collections/current-exhibition-catalogues", "https://shop.getty.edu/collections/current-exhibition-catalogues?hp-2nd-level-nav=1"], why: null } },

  { id: "occ-guggenheim-org", kind: "manual",
    names: { card: "Guggenheim New York", chip: null, group: null, full: "Solomon R. Guggenheim Museum", inEnglish: null, aka: ["Guggenheim Museum", "The Guggenheim"], lookup: "Guggenheim New York", replaced: [], hers: false },
    city: "New York", country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-11-01T15:28:11.076Z", aka: ["Guggenheim Museum", "The Guggenheim"], city: "New York", confirmed: true, country: "United States", english: true, englishPicked: false, finder: 3, foundBy: "her link", gallery: false, host: "www.guggenheim.org", id: "occ-guggenheim-org", name: "Solomon R. Guggenheim Museum", pageShop: "", searchRule: null, shelfKind: null, shop: "found", shopAdded: true, shopCatalogues: "https://guggenheimstore.org/collections/shop-by-category-books", shopEnglishUnread: null, shopHome: "https://guggenheimstore.org/", shopSearch: null, short: "Guggenheim New York", turnedDown: [], why: null } },

  // Moretti (her decision, Moretti only): the place after " : " leaves the title ("… : Monaco", "… : New York,
  // Sotheby's"); its description is typed in capitals (capsText); the cookie panel ends the passage.
  { id: "occ-morettigallery-com", kind: "manual",
    names: { card: "Moretti Fine Art", chip: null, group: null, full: "Moretti Fine Art", inEnglish: null, aka: [], lookup: "Moretti Fine Art", replaced: [], hers: false },
    city: "New York", country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { titleDrop: /\s+:\s+[^:]+$/, capsText: true, until: /^Manage cookies$/ }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T04:46:29.539Z", aka: [], city: "New York", confirmed: true, country: "United States", english: true, englishPicked: false, finder: 3, gallery: true, host: "morettigallery.com", id: "occ-morettigallery-com", name: "Moretti Fine Art", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Moretti Fine Art", turnedDown: [], why: null } },

  { id: "occ-philamuseum-org", kind: "manual",
    names: { card: "Philadelphia MA", chip: null, group: null, full: "Philadelphia Museum of Art", inEnglish: null, aka: ["PMA"], lookup: "Philadelphia MA", replaced: [], hers: false },
    city: "Philadelphia", country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-25T12:04:32.004Z", aka: ["PMA"], city: "Philadelphia", confirmed: true, country: "United States", english: true, englishPicked: false, finder: 3, foundBy: "a search", host: "www.philamuseum.org", id: "occ-philamuseum-org", name: "Philadelphia Museum of Art", pageShop: "https://store.philamuseum.org/", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://store.philamuseum.org/pma-icons/pma-catalogues/pma-exhbition-catalogues/", shopEnglishUnread: null, shopHome: "https://store.philamuseum.org/", shopSearch: "https://store.philamuseum.org/search?q=", short: "Philadelphia MA", turnedDown: ["https://store.philamuseum.org/pma-icons/pma-catalogues/pma-highlights-books/"], why: null } },

  { id: "occ-sfmoma-org", kind: "manual",
    names: { card: "SFMOMA", chip: null, group: null, full: "San Francisco Museum of Modern Art", inEnglish: null, aka: ["SFMOMA"], lookup: "SFMOMA", replaced: [], hers: false },
    city: "San Francisco", country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T14:14:33.447Z", aka: ["SFMOMA"], city: "San Francisco", confirmed: true, country: "United States", english: true, englishPicked: false, finder: 3, foundBy: "the shop's front page", gallery: false, host: "www.sfmoma.org", id: "occ-sfmoma-org", name: "San Francisco Museum of Modern Art", pageShop: "https://museumstore.sfmoma.org/", searchRule: 2, shelfKind: "front", shop: "found", shopCatalogues: "https://museumstore.sfmoma.org/", shopEnglishUnread: null, shopHome: "https://museumstore.sfmoma.org/", shopSearch: "https://museumstore.sfmoma.org/search?q=", short: "SFMOMA", turnedDown: ["https://museumstore.sfmoma.org/", "https://museumstore.sfmoma.org/"], why: null } },

  { id: "occ-whitney-org", kind: "manual",
    names: { card: "Whitney", chip: null, group: null, full: "Whitney Museum of American Art", inEnglish: null, aka: ["Whitney", "The Whitney"], lookup: "Whitney", replaced: [], hers: false },
    city: "New York", country: "United States", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-11-01T14:52:10.663Z", aka: ["Whitney", "The Whitney"], city: "New York", confirmed: true, country: "United States", english: true, englishPicked: false, finder: 3, foundBy: "her link", gallery: false, host: "whitney.org", id: "occ-whitney-org", name: "Whitney Museum of American Art", pageShop: "", searchRule: null, shelfKind: null, shop: "found", shopAdded: true, shopCatalogues: "https://shop.whitney.org/collections/exhibition-catalogues", shopEnglishUnread: null, shopHome: "https://shop.whitney.org/", shopSearch: null, short: "Whitney", turnedDown: [], why: null } },

  // NGV writes two-digit years ("4 Sep 26 – 31 Jan 27").
  { id: "occ-ngv-vic-gov-au", kind: "manual",
    names: { card: "National Gallery Victoria", chip: null, group: null, full: "NGV", inEnglish: null, aka: [], lookup: "National Gallery Victoria", replaced: [], hers: true },
    city: null, country: "Australia", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { shortYear: true }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-14T11:34:36.828Z", confirmed: true, english: true, finder: 3, foundBy: "a search", host: "www.ngv.vic.gov.au", id: "occ-ngv-vic-gov-au", name: "NGV", pageShop: "https://store.ngv.vic.gov.au/", shelfKind: "books", shop: "found", shopCatalogues: "https://store.ngv.vic.gov.au/collections/books", shopHome: "https://store.ngv.vic.gov.au/", shopSearch: "https://store.ngv.vic.gov.au/search?q=", turnedDown: [], why: null } },

  { id: "occ-courtauld-ac-uk", kind: "manual",
    names: { card: "Courtauld", chip: null, group: null, full: "Courtauld", inEnglish: null, aka: [], lookup: "Courtauld", replaced: [], hers: false },
    city: null, country: "United Kingdom", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-04T01:01:19.607Z", confirmed: true, english: true, finder: 2, foundBy: "a search", host: "courtauld.ac.uk", id: "occ-courtauld-ac-uk", name: "Courtauld", pageShop: "https://shop.courtauld.ac.uk/", rejected: [], shelfKind: "catalogues", shop: "found", shopCatalogues: "https://shop.courtauld.ac.uk/collections/courtauld-catalogues", shopHome: "https://shop.courtauld.ac.uk/", shopSearch: "https://shop.courtauld.ac.uk/search?q=", turnedDown: [], why: null } },

  { id: "occ-royalacademy-org-uk", kind: "manual",
    names: { card: "Royal Academy UK", chip: null, group: null, full: "Royal Academy of Arts", inEnglish: null, aka: [], lookup: "Royal Academy UK", replaced: [], hers: false },
    city: null, country: "United Kingdom", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-04T01:01:13.484Z", confirmed: true, english: true, finder: 3, foundBy: "a search", host: "www.royalacademy.org.uk", id: "occ-royalacademy-org-uk", name: "Royal Academy of Arts", pageShop: "", rejected: [], shelfKind: "catalogues", shop: "found", shopCatalogues: "https://shop.royalacademy.org.uk/books/bookshop/exhibition-catalogues", shopHome: "https://shop.royalacademy.org.uk/", shopSearch: null, short: "Royal Academy UK", turnedDown: [], why: null } },

  // Her addition, after Tate Britain. Shopify: search box and her exhibition-catalogues shelf.
  { id: "ashmolean", kind: "swept",
    names: { card: "Ashmolean", chip: null, group: null, full: "Ashmolean Museum", inEnglish: null, aka: [], lookup: "Ashmolean", replaced: [], hers: true },
    city: "Oxford", country: "United Kingdom", english: true, language: null,
    shop: { home: "https://shop.ashmolean.org/", catalogues: "https://shop.ashmolean.org/collections/exhibition-catalogues", search: "https://shop.ashmolean.org/search?q=", unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  { id: "occ-rct-uk", kind: "manual",
    names: { card: "Queen's Gallery Edinburgh", chip: null, group: null, full: "The Queen\u2019s Gallery, Palace of Holyroodhouse", inEnglish: null, aka: [], lookup: "Queen's Gallery Edinburgh", replaced: ["The Queen\u2019s Gallery, Palace of Holyroodhouse"], hers: true },
    city: null, country: "United Kingdom", english: true, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-21T03:00:24.644Z", confirmed: true, english: true, finder: 3, host: "rct.uk", id: "occ-rct-uk", name: "The Queen\u2019s Gallery, Palace of Holyroodhouse", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopHome: null, shopSearch: null, turnedDown: [], why: null } },

  { id: "occ-hlmd-de", kind: "manual",
    names: { card: "Darmstadt Landesmuseum", chip: null, group: null, full: "Hessisches Landesmuseum Darmstadt", inEnglish: null, aka: ["HLMD"], lookup: "Darmstadt Landesmuseum", replaced: [], hers: false },
    city: "Darmstadt", country: "Germany", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-26T06:11:07.479Z", aka: ["HLMD"], city: "Darmstadt", confirmed: true, country: "Germany", english: false, englishPicked: false, finder: 3, host: "www.hlmd.de", id: "occ-hlmd-de", name: "Hessisches Landesmuseum Darmstadt", pageShop: "https://shop.hlmd.de/", searchRule: 2, shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Darmstadt Landesmuseum", turnedDown: [], why: null } },

  { id: "occ-esmh-de", kind: "manual",
    names: { card: "Emil Schumacher Hagen", chip: null, group: null, full: "Emil Schumacher Museum", inEnglish: null, aka: ["ESMH"], lookup: "Emil Schumacher Hagen", replaced: ["Hagen Emil Schumacher"], hers: true },
    city: "Hagen", country: "Germany", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-31T02:35:35.232Z", aka: ["ESMH"], city: "Hagen", confirmed: true, country: "Germany", english: false, englishPicked: false, finder: 3, foundBy: "her link", gallery: false, host: "esmh.de", id: "occ-esmh-de", name: "Emil Schumacher Museum", pageShop: "", searchRule: 2, shelfKind: null, shop: "found", shopAdded: true, shopCatalogues: "https://esmh.de/kataloge/", shopEnglishUnread: null, shopHome: "https://esmh.de/", shopSearch: null, short: "Hagen Emil Schumacher", turnedDown: [], why: null } },

  { id: "occ-staatsgalerie-de", kind: "manual",
    names: { card: "Stuttgart Staatsgalerie", chip: null, group: null, full: "Staatsgalerie Stuttgart", inEnglish: null, aka: ["Staatsgalerie"], lookup: "Stuttgart Staatsgalerie", replaced: [], hers: false },
    city: "Stuttgart", country: "Germany", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-23T00:43:44.642Z", aka: ["Staatsgalerie"], city: "Stuttgart", confirmed: true, country: "Germany", english: false, finder: 3, foundBy: "a search", gallery: false, host: "www.staatsgalerie.de", id: "occ-staatsgalerie-de", name: "Staatsgalerie Stuttgart", pageShop: "https://museumsshop.cedon.de/", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://www.museumsshop.cedon.de/Kataloge/Staatsgalerie-Stuttgart", shopHome: "https://museumsshop.cedon.de/", shopSearch: null, short: "Stuttgart Staatsgalerie", turnedDown: [], why: null } },

  // Her name, not Claude's "KMSKA Antwerp" (notCard: Claude learns her style from it).
  { id: "occ-kmska-be", kind: "manual",
    names: { card: "Antwerp KMSKA", chip: null, group: null, full: "Koninklijk Museum voor Schone Kunsten Antwerpen", inEnglish: null, aka: ["KMSKA", "Koninklijk Museum voor Schone Kunsten Antwerpen"], lookup: "Koninklijk Museum voor Schone Kunsten Antwerpen", replaced: ["KMSKA Antwerp"], hers: true },
    city: "Antwerp", country: "Belgium", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-23T00:37:08.015Z", aka: ["KMSKA", "Koninklijk Museum voor Schone Kunsten Antwerpen"], city: "Antwerp", confirmed: true, country: "Belgium", english: false, finder: 3, foundBy: "a search", host: "kmska.be", id: "occ-kmska-be", name: "Royal Museum of Fine Arts Antwerp", pageShop: "https://kmska.be/en/kmskashop-and-coffee-bar", searchRule: 2, shelfKind: "books", shop: "found", shopCatalogues: "https://www.kmskashop.be/en/books/kmska/", shopHome: "https://kmska.be/", shopSearch: null, short: "Antwerp Fine Arts", turnedDown: ["https://www.kmskashop.be/nl/boeken/"], why: null } },

  // Its all-number dates: "01.02 – 30.04.20".
  { id: "occ-mskgent-be", kind: "manual",
    names: { card: "Ghent Fine Arts", chip: null, group: null, full: "Museum of Fine Arts Ghent", inEnglish: null, aka: ["MSK", "Museum voor Schone Kunsten Gent"], lookup: "Ghent Fine Arts", replaced: [], hers: false },
    city: "Ghent", country: "Belgium", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-26T14:24:49.089Z", aka: ["MSK", "Museum voor Schone Kunsten Gent"], city: "Ghent", confirmed: true, country: "Belgium", english: false, englishPicked: false, finder: 3, gallery: false, host: "www.mskgent.be", id: "occ-mskgent-be", name: "Museum of Fine Arts Ghent", pageShop: "", searchRule: 2, shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Ghent Fine Arts", turnedDown: [], why: null } },

  // Christie's press site is the same venue as christies.com (her decision; links from now on, rows already in left as they are).
  { id: "occ-christies-com", kind: "manual",
    names: { card: "Christie's Paris", chip: null, group: null, full: "Christie's Paris", inEnglish: null, aka: ["Christie's"], lookup: "Christie's Paris", replaced: [], hers: false },
    city: "Paris", country: "France", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [{ host: "press.christies.com" }], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T13:42:10.959Z", aka: ["Christie's"], city: "Paris", confirmed: true, country: "France", english: false, englishPicked: false, finder: 3, gallery: false, host: "www.christies.com", id: "occ-christies-com", name: "Christie's Paris", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Christie's Paris", turnedDown: [], why: null } },

  { id: "occ-galerie-karsten-greve-com", kind: "manual",
    names: { card: "Karsten Greve Paris", chip: null, group: null, full: "Galerie Karsten Greve Paris", inEnglish: null, aka: ["Galerie Karsten Greve"], lookup: "Karsten Greve Paris", replaced: [], hers: false },
    city: "Paris", country: "France", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-26T08:35:31.092Z", aka: ["Galerie Karsten Greve"], city: "Paris", confirmed: true, country: "France", english: false, englishPicked: false, finder: 3, foundBy: "the gallery's own page", gallery: true, host: "galerie-karsten-greve.com", id: "occ-galerie-karsten-greve-com", name: "Galerie Karsten Greve Paris", pageShop: "", searchRule: 2, shelfKind: "books", shop: "found", shopCatalogues: "https://galerie-karsten-greve.com/en/publications?filter=C", shopEnglishUnread: null, shopHome: "https://galerie-karsten-greve.com/", shopSearch: null, short: "Karsten Greve Paris", turnedDown: [], why: null } },

  { id: "occ-musees-nationaux-alpesmaritimes-fr", kind: "manual",
    names: { card: "Chagall Museum Nice", chip: null, group: null, full: "Mus\u00e9e national Marc Chagall", inEnglish: null, aka: ["Mus\u00e9e Marc Chagall", "Mus\u00e9e national Message Biblique Marc Chagall"], lookup: "Chagall Museum Nice", replaced: ["Nice Chagall"], hers: true },
    city: "Nice", country: "France", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T14:13:56.728Z", aka: ["Mus\u00e9e Marc Chagall", "Mus\u00e9e national Message Biblique Marc Chagall"], city: "Nice", confirmed: true, country: "France", english: false, englishPicked: false, finder: 3, foundBy: "the shop's front page", gallery: false, host: "musees-nationaux-alpesmaritimes.fr", id: "occ-musees-nationaux-alpesmaritimes-fr", name: "Mus\u00e9e national Marc Chagall", pageShop: "", searchRule: 2, shelfKind: "front", shop: "found", shopCatalogues: "https://www.boutiquesdemusees.fr/fr/boutique/musees/musee-national-marc-chagall/?par=11", shopEnglishUnread: null, shopHome: "https://www.boutiquesdemusees.fr/fr/boutique/musees/musee-national-marc-chagall/?par=11", shopSearch: "https://www.boutiquesdemusees.fr/search?q=", short: "Nice Chagall", turnedDown: ["https://www.boutiquesdemusees.fr/en/selection/english-and-foreign-language-books-525/1/", "https://www.boutiquesdemusees.fr/fr/boutique/musees/musee-national-marc-chagall/?par=11", "https://www.boutiquesdemusees.fr/fr/boutique/musees/musee-national-marc-chagall/?par=11"], why: null } },

  // Galerie de la Présidence ends its show headings " : Exhibition".
  { id: "occ-presidence-fr", kind: "manual",
    names: { card: "Galerie de la Pr\u00e9sidence Paris", chip: null, group: null, full: "Pr\u00e9sidence de la R\u00e9publique", inEnglish: null, aka: ["\u00c9lys\u00e9e Palace", "Palais de l'\u00c9lys\u00e9e"], lookup: "Galerie de la Pr\u00e9sidence Paris", replaced: ["Paris Pr\u00e9sidence"], hers: true },
    city: "Paris", country: "France", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { titleDrop: /\s*:\s*Exhibition$/i }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-31T02:35:41.832Z", aka: ["\u00c9lys\u00e9e Palace", "Palais de l'\u00c9lys\u00e9e"], city: "Paris", confirmed: true, country: "France", english: false, englishPicked: false, finder: 3, gallery: false, host: "www.presidence.fr", id: "occ-presidence-fr", name: "Pr\u00e9sidence de la R\u00e9publique", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Paris Pr\u00e9sidence", turnedDown: [], why: null } },

  // Her names for venues Claude named (her review of link venues); notCard is the name Claude gave.
  { id: "occ-centrepompidou-fr", kind: "manual",
    names: { card: "Centre Pompidou", chip: null, group: null, full: "Centre Pompidou", inEnglish: null, aka: ["Centre national d'art et de culture Georges-Pompidou"], lookup: "Centre Pompidou", replaced: ["Pompidou Paris"], hers: true },
    city: "Paris", country: "France", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T14:14:26.847Z", aka: ["Centre national d'art et de culture Georges-Pompidou"], city: "Paris", confirmed: true, country: "France", english: false, englishPicked: false, finder: 3, foundBy: "the shop's menu", gallery: false, host: "www.centrepompidou.fr", id: "occ-centrepompidou-fr", name: "Centre Pompidou", pageShop: "", searchRule: 2, shelfKind: "catalogues", shop: "found", shopCatalogues: "https://boutique.centrepompidou.fr/en/products/2267-exhibition-catalogs-and-monographs/", shopEnglishUnread: null, shopHome: "https://boutique.centrepompidou.fr/", shopSearch: "https://boutique.centrepompidou.fr/search?q=", short: "Pompidou Paris", turnedDown: [], why: null } },

  // Written in, her decision: a shop drawn by script (its page's code holds no books, only a frame and a
  // script) gets its best section written in and `shopUnseen` "script": a lookup there reads "contents
  // cannot be seen — JS-rendering" and goes to the web (docs/add_by_link.md, "A shop drawn by script").
  // Its all-number dates: "25.05.–24.11.2024".
  { id: "occ-kunstmuseumbasel-ch", kind: "manual",
    names: { card: "Kunstmuseum Basel", chip: null, group: null, full: "Kunstmuseum Basel", inEnglish: null, aka: [], lookup: "Kunstmuseum Basel", replaced: ["Basel Kunstmuseum"], hers: true },
    city: "Basel", country: "Switzerland", english: false, language: null,
    shop: { home: "https://shop.kunstmuseumbasel.ch/en/", catalogues: "https://shop.kunstmuseumbasel.ch/en/merchandise?category=Exhibition+Catalogues", search: null, unseen: "script", queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-26T06:10:30.646Z", aka: [], city: "Basel", confirmed: true, country: "Switzerland", english: false, englishPicked: false, finder: 3, foundBy: "the venue's rule", gallery: false, host: "kunstmuseumbasel.ch", id: "occ-kunstmuseumbasel-ch", name: "Kunstmuseum Basel", pageShop: "https://kunstmuseumbasel.ch/en/visit/shop", searchRule: 2, shelfKind: null, shop: "found", shopAdded: false, shopCatalogues: "https://shop.kunstmuseumbasel.ch/en/merchandise?category=Exhibition+Catalogues", shopEnglishUnread: null, shopHome: "https://shop.kunstmuseumbasel.ch/en/", shopSearch: null, short: "Basel Kunstmuseum", turnedDown: [], why: null } },

  { id: "occ-fondationbeyeler-ch", kind: "manual",
    names: { card: "Fondation Beyeler", chip: null, group: null, full: "Fondation Beyeler", inEnglish: null, aka: ["Beyeler Foundation"], lookup: "Fondation Beyeler", replaced: [], hers: false },
    city: "Riehen", country: "Switzerland", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-11-01T14:34:51.806Z", aka: ["Beyeler Foundation"], city: "Riehen", confirmed: true, country: "Switzerland", english: false, englishPicked: false, finder: 3, foundBy: "a search", gallery: false, host: "www.fondationbeyeler.ch", id: "occ-fondationbeyeler-ch", name: "Fondation Beyeler", pageShop: "", searchRule: 2, shelfKind: "catalogues", shop: "found", shopAdded: false, shopCatalogues: "https://shop.fondationbeyeler.ch/en/kategorie/exhibition-catalogues", shopEnglishUnread: null, shopHome: "https://shop.fondationbeyeler.ch/", shopSearch: null, short: "Fondation Beyeler", turnedDown: [], why: null } },

  // The Tuscan state museums' site names itself "Direzione regionale Musei nazionali Toscana";
  // its cards show "San Marco" and the lookup searches as "Museo di San Marco" (her decision).
  // Its pages are press releases: the title is the headline's first sentence, without "Mostra"
  // (exhibition) or the quotation marks round the name; capitals recased (her decision).
  { id: "occ-museitoscana-cultura-gov-it", kind: "manual",
    names: { card: "San Marco Florence", chip: null, group: null, full: "Museo di San Marco", inEnglish: null, aka: [], lookup: "Museo di San Marco", replaced: [], hers: true },
    city: "Florence", country: "Italy", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { firstSentence: true, unquote: true, capsTitles: true }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-18T09:08:51.834Z", confirmed: true, english: false, finder: 3, host: "museitoscana.cultura.gov.it", id: "occ-museitoscana-cultura-gov-it", name: "Direzione regionale Musei nazionali Toscana", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopHome: null, shopSearch: null, turnedDown: [], why: null } },

  // Genoa's page titles give no name, Milan's name the city council (her names, both written in).
  { id: "occ-palazzoducale-genova-it", kind: "manual",
    names: { card: "Palazzo Ducale Genova", chip: null, group: null, full: "Palazzo Ducale Genova", inEnglish: null, aka: [], lookup: "Palazzo Ducale Genova", replaced: [], hers: true },
    city: "Genoa", country: "Italy", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-18T09:08:46.904Z", confirmed: true, english: false, finder: 3, host: "palazzoducale.genova.it", id: "occ-palazzoducale-genova-it", name: "palazzoducale.genova.it", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopHome: null, shopSearch: null, turnedDown: [], why: null } },

  // Palazzo Reale Milano's pages also sit on the city council's site, saved by her because that
  // site refuses Parallel (docs/add_by_link.md, "Saved pages").
  { id: "occ-palazzorealemilano-it", kind: "manual",
    names: { card: "Palazzo Reale Milano", chip: null, group: null, full: "Palazzo Reale Milano", inEnglish: null, aka: [], lookup: "Palazzo Reale Milano", replaced: [], hers: true },
    city: "Milan", country: "Italy", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { titleHeading: PRM_TAIL, titleDrop: PRM_TAIL, nameInLines: true, until: PRM_BOX, datesUntil: PRM_BOX, capsTitles: true, asOfTo: true }, sites: [{ host: "www2.comune.milano.it", path: /^\/(?:en|it)\/web\/palazzo-reale-milano\// }], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-18T12:41:17.202Z", confirmed: true, english: false, finder: 3, host: "www.palazzorealemilano.it", id: "occ-palazzorealemilano-it", name: "Comune di Milano", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopHome: null, shopSearch: null, turnedDown: [], why: null } },

  { id: "occ-museo-archeologico-regionale", kind: "manual",
    names: { card: "Aosta Archaeological Museum", chip: null, group: null, full: "Museo Archeologico Regionale", inEnglish: null, aka: ["MAR", "Museo Archeologico Regionale di Aosta"], lookup: "Aosta Archaeological Museum", replaced: [], hers: false },
    city: "Aosta", country: "Italy", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T14:36:54.550Z", aka: ["MAR", "Museo Archeologico Regionale di Aosta"], city: "Aosta", confirmed: true, country: "Italy", english: false, englishPicked: false, finder: 3, gallery: false, host: "", id: "occ-museo-archeologico-regionale", name: "Museo Archeologico Regionale", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Aosta Archaeological Museum", turnedDown: [], why: null } },

  { id: "occ-palazzostrozzi-org", kind: "manual",
    names: { card: "Palazzo Strozzi Florence", chip: null, group: null, full: "Fondazione Palazzo Strozzi", inEnglish: null, aka: ["Palazzo Strozzi"], lookup: "Palazzo Strozzi Florence", replaced: [], hers: false },
    city: "Florence", country: "Italy", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-11-05T01:15:20.459Z", aka: ["Palazzo Strozzi"], city: "Florence", confirmed: true, country: "Italy", english: false, englishPicked: false, finder: 3, foundBy: "her link", gallery: false, host: "www.palazzostrozzi.org", id: "occ-palazzostrozzi-org", name: "Fondazione Palazzo Strozzi", pageShop: "", searchRule: null, shelfKind: null, shop: "found", shopAdded: true, shopCatalogues: "https://www.palazzostrozzi.org/en/cataloghi-libri/", shopEnglishUnread: null, shopHome: "https://www.palazzostrozzi.org/", shopSearch: null, short: "Palazzo Strozzi Florence", turnedDown: [], why: null } },

  // The Correr's archive site (that site only): each show has several pages, its tab title the
  // page's own name ("Project", "Mostra"); the show's name is the heading after "Section menu" ("Menù di sezione").
  // Titles typed in capitals are recased (her decision), each part either side of a full stop.
  { id: "occ-archivio-correr-visitmuve-it", kind: "manual",
    names: { card: "Correr Venice", chip: null, group: null, full: "Museo Correr", inEnglish: null, aka: ["Museum Correr", "Correr Museum"], lookup: "Correr Venice", replaced: ["Venice Correr"], hers: true },
    city: "Venice", country: "Italy", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { titleAfter: /^(?:Section menu|Men\u00f9 di sezione)$/, capsTitles: true, capsStops: true }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T10:34:02.443Z", aka: ["Museum Correr", "Correr Museum"], city: "Venice", confirmed: true, country: "Italy", english: false, englishPicked: false, finder: 3, gallery: false, host: "archivio-correr.visitmuve.it", id: "occ-archivio-correr-visitmuve-it", name: "Museo Correr", pageShop: "", searchRule: 2, shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Venice Correr", turnedDown: [], why: null } },

  { id: "occ-museothyssen-org", kind: "manual",
    names: { card: "Thyssen-Bornemisza", chip: null, group: null, full: "Museo Nacional Thyssen-Bornemisza", inEnglish: null, aka: ["Museo Thyssen-Bornemisza", "Thyssen-Bornemisza National Museum", "Museo Thyssen"], lookup: "Thyssen-Bornemisza", replaced: [], hers: false },
    city: "Madrid", country: "Spain", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-04T01:00:56.784Z", aka: ["Museo Thyssen-Bornemisza", "Thyssen-Bornemisza National Museum", "Museo Thyssen"], city: "Madrid", confirmed: true, country: "Spain", english: false, finder: 2, foundBy: "a search", gallery: false, host: "www.museothyssen.org", id: "occ-museothyssen-org", name: "Museo Nacional Thyssen-Bornemisza", pageShop: "https://tienda.museothyssen.org/en", rejected: [], shelfKind: "catalogues", shop: "found", shopCatalogues: "https://tienda.museothyssen.org/en/collections/guias-y-catalogos-del-museo", shopHome: "https://tienda.museothyssen.org/", shopSearch: "https://tienda.museothyssen.org/search?q=", short: "Thyssen-Bornemisza", turnedDown: [], why: null } },

  { id: "occ-guggenheim-bilbao-eus", kind: "manual",
    names: { card: "Guggenheim Bilbao", chip: null, group: null, full: "Guggenheim Museum Bilbao", inEnglish: null, aka: ["Museo Guggenheim Bilbao", "Bilboko Guggenheim Museoa", "Guggenheim Bilbao"], lookup: "Guggenheim Bilbao", replaced: [], hers: false },
    city: "Bilbao", country: "Spain", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-11-01T15:28:25.772Z", aka: ["Museo Guggenheim Bilbao", "Bilboko Guggenheim Museoa", "Guggenheim Bilbao"], city: "Bilbao", confirmed: true, country: "Spain", english: false, englishPicked: false, finder: 3, foundBy: "a search", gallery: false, host: "www.guggenheim-bilbao.eus", id: "occ-guggenheim-bilbao-eus", name: "Guggenheim Museum Bilbao", pageShop: "", searchRule: 2, shelfKind: "catalogues", shop: "found", shopAdded: false, shopCatalogues: "https://tienda.guggenheim-bilbao.eus/en/books/catalogs-of-exhibitions", shopEnglishUnread: null, shopHome: "https://tienda.guggenheim-bilbao.eus/", shopSearch: null, short: "Guggenheim Bilbao", turnedDown: [], why: null } },

  { id: "occ-museoreinasofia-es", kind: "manual",
    names: { card: "Reina Sof\u00eda Madrid", chip: null, group: null, full: "Museo Nacional Centro de Arte Reina Sof\u00eda", inEnglish: null, aka: ["MNCARS", "Museo Reina Sof\u00eda", "Reina Sof\u00eda"], lookup: "Reina Sof\u00eda Madrid", replaced: ["Madrid Reina Sof\u00eda"], hers: true },
    city: "Madrid", country: "Spain", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-26T13:27:44.300Z", aka: ["MNCARS", "Museo Reina Sof\u00eda", "Reina Sof\u00eda"], city: "Madrid", confirmed: true, country: "Spain", english: false, englishPicked: false, finder: 3, gallery: false, host: "www.museoreinasofia.es", id: "occ-museoreinasofia-es", name: "Museo Nacional Centro de Arte Reina Sof\u00eda", pageShop: "", searchRule: 2, shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Madrid Reina Sof\u00eda", turnedDown: [], why: null } },

  { id: "occ-mauritshuis-nl", kind: "manual",
    names: { card: "Mauritshuis", chip: null, group: null, full: "Mauritshuis", inEnglish: null, aka: [], lookup: "Mauritshuis", replaced: [], hers: false },
    city: null, country: "Netherlands", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-04T01:01:04.776Z", confirmed: true, english: false, finder: 2, foundBy: "a search", host: "www.mauritshuis.nl", id: "occ-mauritshuis-nl", name: "Mauritshuis", pageShop: "", rejected: [], shelfKind: "catalogues", shop: "found", shopCatalogues: "https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi", shopHome: "https://shop.mauritshuis.nl/", shopSearch: null, turnedDown: [], why: null } },

  { id: "occ-museumhetvalkhof-nl", kind: "manual",
    names: { card: "Valkhof Nijmegen", chip: null, group: null, full: "Museum Het Valkhof", inEnglish: null, aka: ["Het Valkhof"], lookup: "Valkhof Nijmegen", replaced: ["Nijmegen Valkhof"], hers: true },
    city: "Nijmegen", country: "Netherlands", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T10:20:03.694Z", aka: ["Het Valkhof"], city: "Nijmegen", confirmed: true, country: "Netherlands", english: false, englishPicked: false, finder: 3, gallery: false, host: "museumhetvalkhof.nl", id: "occ-museumhetvalkhof-nl", name: "Museum Het Valkhof", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Nijmegen Valkhof", turnedDown: [], why: null } },

  { id: "occ-vangoghmuseum-nl", kind: "manual",
    names: { card: "Van Gogh Museum", chip: null, group: null, full: "Van Gogh Museum", inEnglish: null, aka: [], lookup: "Van Gogh Museum", replaced: [], hers: false },
    city: "Amsterdam", country: "Netherlands", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T06:02:41.812Z", aka: [], city: "Amsterdam", confirmed: true, country: "Netherlands", english: false, englishPicked: false, finder: 3, foundBy: "a search", gallery: false, host: "www.vangoghmuseum.nl", id: "occ-vangoghmuseum-nl", name: "Van Gogh Museum", pageShop: "https://www.vangogh.shop/", searchRule: 2, shelfKind: "publications", shop: "found", shopCatalogues: "https://www.vangogh.shop/en/van-gogh-museum-publicaties", shopEnglishUnread: null, shopHome: "https://www.vangogh.shop/", shopSearch: null, short: "Van Gogh Museum", turnedDown: [], why: null } },

  // Her name, the country first. A retired show's address opens the "Past Exhibitions" list (Louise
  // Bourgeois), which is never a show (listingPage); a heading line ending in a comma runs on to the
  // next line (headingCommaJoin; "Diane Arbus Photographs," over "1956-1971").
  // Its all-number dates: "11.10.24 - 27.4.25".
  { id: "occ-louisiana-dk", kind: "manual",
    names: { card: "Denmark Louisiana", chip: null, group: null, full: "Louisiana Museum of Modern Art", inEnglish: null, aka: ["Louisiana", "Louisiana Museum for Moderne Kunst"], lookup: "Louisiana Museum of Modern Art", replaced: ["Louisiana Humleb\u00e6k"], hers: true },
    city: "Humleb\u00e6k", country: "Denmark", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { listingPage: /^Past exhibitions$/i, headingCommaJoin: true }, sites: [], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-11-01T13:48:29.836Z", aka: ["Louisiana", "Louisiana Museum for Moderne Kunst"], city: "Humleb\u00e6k", confirmed: true, country: "Denmark", english: false, englishPicked: false, finder: 3, foundBy: "a search", gallery: false, host: "louisiana.dk", id: "occ-louisiana-dk", name: "Louisiana Museum of Modern Art", pageShop: "https://butik.louisiana.dk/", searchRule: 2, shelfKind: "catalogues", shop: "found", shopAdded: false, shopCatalogues: "https://butik.louisiana.dk/en-int/collections/udstillingskataloger", shopEnglishUnread: null, shopHome: "https://butik.louisiana.dk/", shopSearch: "https://butik.louisiana.dk/search?q=", short: "Louisiana Humleb\u00e6k", turnedDown: [], why: null } },

  // Her name, the city first (her decision, as Antwerp KMSKA).
  // Its all-number dates: "16.2–26.5 2013", "8.10 2011–15.1 2012".
  { id: "occ-modernamuseet-se", kind: "manual",
    names: { card: "Stockholm Moderna", chip: null, group: null, full: "Moderna Museet", inEnglish: null, aka: [], lookup: "Moderna Museet", replaced: ["Moderna Museet Stockholm"], hers: true },
    city: "Stockholm", country: "Sweden", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: "day", spacedYear: true, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-11-01T13:43:00.860Z", aka: [], city: "Stockholm", confirmed: true, country: "Sweden", english: false, englishPicked: false, finder: 3, foundBy: "a search", gallery: false, host: "www.modernamuseet.se", id: "occ-modernamuseet-se", name: "Moderna Museet", pageShop: "https://webshop.modernamuseet.se/en", searchRule: 2, shelfKind: "catalogues", shop: "found", shopAdded: false, shopCatalogues: "https://webshop.modernamuseet.se/en/collections/utstallningskataloger-1", shopEnglishUnread: null, shopHome: "https://webshop.modernamuseet.se/", shopSearch: "https://webshop.modernamuseet.se/search?q=", short: "Stockholm Moderna Museet", turnedDown: [], why: null } },

  // Łazienki (her decision, Łazienki only): its heading runs on into the show's opening paragraph; the
  // page title is the show's name and its section ("The Nabis. Prophets of a New Art - Events"): the name is the title.
  { id: "occ-lazienki-krolewskie-pl", kind: "manual",
    names: { card: "Royal \u0141azienki Warsaw", chip: null, group: null, full: "Royal \u0141azienki Museum", inEnglish: null, aka: ["Muzeum \u0141azienki Kr\u00f3lewskie w Warszawie", "\u0141azienki Kr\u00f3lewskie"], lookup: "Royal \u0141azienki Warsaw", replaced: ["Warsaw \u0141azienki"], hers: true },
    city: "Warsaw", country: "Poland", english: false, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { tabTitle: /\s+[-–—]\s+[^-–—]+$/ }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: { addedAt: "2026-10-29T06:02:59.654Z", aka: ["Muzeum \u0141azienki Kr\u00f3lewskie w Warszawie", "\u0141azienki Kr\u00f3lewskie"], city: "Warsaw", confirmed: true, country: "Poland", english: false, englishPicked: false, finder: 3, gallery: false, host: "www.lazienki-krolewskie.pl", id: "occ-lazienki-krolewskie-pl", name: "Royal \u0141azienki Museum", pageShop: "", shelfKind: null, shop: "none", shopCatalogues: null, shopEnglishUnread: null, shopHome: null, shopSearch: null, short: "Warsaw \u0141azienki", turnedDown: [], why: null } },

  // The Tate library's records file under the Tate Claude names (ownMuseumNamed); the record's
  // summary sits under its own "Summary" heading, below the copies list and after a tab of that name.
  { id: "occ-library-tate-org-uk", kind: "manual",
    names: { card: null, chip: null, group: null, full: null, inEnglish: null, aka: [], lookup: null, replaced: [], hers: false },
    city: null, country: null, english: null, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: { from: /^Summary$/, fromLast: true }, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // Its all-number dates: "Until 25.10.2026".
  { id: "occ-kunsthaus-ch", kind: "manual",
    names: { card: null, chip: null, group: null, full: null, inEnglish: null, aka: [], lookup: null, replaced: [], hers: false },
    city: null, country: null, english: null, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },

  // Its all-number dates: "22.05.2008 | 14.08.2008".
  { id: "occ-approfondimentimostre-com", kind: "manual",
    names: { card: null, chip: null, group: null, full: null, inEnglish: null, aka: [], lookup: null, replaced: [], hers: false },
    city: null, country: null, english: null, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: "day", spacedYear: false, places: [], placeOwner: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null },
    filed: null },
];

module.exports = { VENUES };
