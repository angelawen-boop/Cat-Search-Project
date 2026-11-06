//@ The venues: the register (venues/register.js, written in by the join), each venue as the app reads it (venueView), and the lookup by id (MU).
//@piece VENUE_REGISTER


// ===== THE VENUE REGISTER — the join writes venues/register.js in below, every venue's facts in her venue order; never edit it here. Edit venues/register.js, then run `node build/app_join.js`. =====
//@venue-register
//@piece REG

// Each venue's register entry, by id.
const REG=Object.fromEntries(VENUE_REGISTER.map(e=>[e.id,e]));
//@piece linkRulesOf

// How Links, Pages and Paste read a venue's pages: its link options, with its galleries (Acquavella's places).
const linkRulesOf=e=>!e||!e.read.link?null:e.read.places.length?{...e.read.link,places:e.read.places}:e.read.link;
//@piece venueView

// A venue as every part reads it (MU): its register entry `e` and, for a manual-import venue, the record
// the page's store holds for it (`rec`: the entry's facts with what was learned since it was filed over
// them, recordOf). No `e`: a venue met since the last publish, known by its record only; no record either:
// a ledger row from a venue neither holds, named `fallback`, shop not known.
//   shop (on the record): "found" (books section), "noshelf" (a shop, no books section), "none" (no
//   shop; confirmed = her "No shop", lookups go to the web), "failed" (a step died — not an answer),
//   "unknown" (look again on the next link). Lookups use "found", and "noshelf" once its search is proved.
function venueView(e,rec,fallback){
  const n=e?e.names:{}, sh=e?e.shop:{}, rd=e?e.read:{}, s=rec||{};
  const manual=!e||e.kind==="manual";
  const name=s.name||n.full||fallback||null, card=s.short||n.card||name;
  const en=s.english!=null?s.english:e?e.english:null;
  const v={id:e?e.id:s.id,card,chip:n.chip||null,group:n.group||null,name,nameInEnglish:n.inEnglish||null,
    aka:s.aka||n.aka||[],lookupName:n.lookup||card,replaced:n.replaced||[],hers:!!n.hers,
    city:s.city||(e&&e.city)||null,country:s.country||(e&&e.country)||null,english:en===false?false:undefined,language:(e&&e.language)||null,
    linkRead:linkRulesOf(e),sites:rd.sites||[],places:rd.places||[],subtitleUnderHeading:!!rd.subtitleUnderHeading,
    inStock:sh.inStock||null,shopQueries:sh.queries&&sh.queries.length?sh.queries:null,shopNamed:sh.named||null,rankAsOwn:sh.rankAsOwn||[],
    exBase:e?e.sweep.exBase:null,listUrl:e?e.sweep.listUrl:null,occasional:manual};
  if(!manual)return{...v,shopHome:sh.home,shopCatalogues:sh.catalogues,shopSearch:sh.search,shopUnseen:sh.unseen||undefined};
  // A shop section written into the entry (the Städel, Basel) is her answer; else what the finder found.
  const ruled=!!sh.catalogues, live=ruled||s.shop==="found"||(s.shop==="noshelf"&&!!s.shopSearch);
  // Her pick on the shop screen: the English section the finder could not read (`shopEnglishUnread`), contents unseen.
  const enPick=!!(s.englishPicked&&s.shopEnglishUnread);
  return{...v,shopLink:sh.catalogues||undefined,shopUnseen:sh.unseen||(enPick?"unconfirmed":undefined),
    shopHome:ruled?sh.home:live?s.shopHome||null:null,shopCatalogues:ruled?sh.catalogues:live?(enPick?s.shopEnglishUnread:s.shopCatalogues||null):null,
    shopSearch:live?s.shopSearch||null:null,shopUnknown:!live&&!(s.shop==="none"&&s.confirmed)};
}
//@piece venueNames

// Every name a venue goes by, as the parts that look for it in a text match it.
const venueNames=v=>[...new Set([v&&v.name,v&&v.card,v&&v.lookupName,...((v&&v.replaced)||[])].filter(Boolean))];
//@piece MUSEUMS

// Her 28 swept venues, in her venue order: drawer, chips, Sort by Venue and refresh headings follow it.
const MUSEUMS=VENUE_REGISTER.filter(e=>e.kind==="swept").map(e=>venueView(e));
//@piece lookupName

const lookupName=mu=>mu.lookupName;
//@piece MU

const MU = Object.fromEntries(MUSEUMS.map(m=>[m.id,m]));
//@piece KNOWN_VENUES


// ---- Pro forma helpers (pure) ----
const KNOWN_VENUES = new Set(MUSEUMS.map(m=>m.id));
