//@ The 28 venues and the occasional ones: their order, chips and regions, and the lookup by id (MU).
//@piece MUSEUMS


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
//@piece VENUE_ORDER

// Her order for every venue list: chips, Sort by Venue, the freshness drawer and the
// refresh screen. A venue not named here goes last, by name.
const VENUE_ORDER=["met","ng","occ-nga-gov","frick","morgan","artic","menil",
  "acq","lgd","occ-new-artsmia-org","cincinnati","occ-britishart-yale-edu","brit","tate-britain","wallace","va","occ-nationalgalleries-org",
  "louvre","orsay","jacquemart","occ-chateaudechantilly-fr","mad","rijks","khm","occ-museodelprado-es","occ-alte-pinakothek","occ-pinakothek-der-moderne","occ-sammlung-schack","occ-smb-museum","occ-alte-nationalgalerie","occ-neue-nationalgalerie","occ-gemaeldegalerie-skd-museum","occ-staedelmuseum-de","uffizi","dellav","borghese","brera","capo","occ-cini-it","occ-lestanzedelvetro-org","occ-lestanzedellafotografia-it","moma",
  "tate-modern","mam",
  ];
//@piece lookupName

const lookupName=mu=>mu.lookupName||mu.short;
//@piece MU

const MU = Object.fromEntries(MUSEUMS.map(m=>[m.id,m]));
//@piece KNOWN_VENUES


// ---- Pro forma helpers (pure) ----
const KNOWN_VENUES = new Set(MUSEUMS.map(m=>m.id));
