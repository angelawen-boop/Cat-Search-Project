//@ Venue link rules (LINK_VENUES), Occasional venues and how a link's venue is decided.
//@piece OCC_DOC


// ── ADD BY LINK (docs/add_by_link.md) ──────────────────────────────────────
// Each pasted show link is read once and becomes an ordinary pro forma row for the
// SAME intake as a sweep file; nothing here writes the ledger. Code reads the title
// and dates (the FIRST date line under the show's heading — show pages carry other
// shows' dates too). The model writes only the description and the English title,
// and picks the subtitle from the page's own lines. A link that cannot be read is a
// line, never a card. No lookback for a link (her decision).

const OCC_DOC="venues/occasional";
//@piece isOcc

const isOcc=id=>String(id||"").startsWith("occ-");
//@piece PRM_TAIL

// Palazzo Reale Milano's heading is the short name plus " - Palazzo Reale Milano", the full
// name on a line below it (nameInLines: the longest line between title and dates that starts
// with the short name; AL-048). Its pages on the city council's site open with a "# Navigation"
// heading and the site's menu; the show's heading is the one ending in the venue's name
// (titleHeading): "Palazzo Reale Milano", "Palazzo Reale, Milan" or "Royal Palace of Milan".
// Its English pages say "as of" for "to" ("from February 21, 2019 as of June 6, 2019";
// Antonello da Messina; asOfTo).
const PRM_TAIL=/\s+[-–—]\s+(?:Palazzo Reale,? Milano?|Royal Palace of Milan)$/i;
//@piece PRM_BOX

// Its "Upcoming Exhibitions" box lists other shows with their dates: the show's own dates and
// text end there (until, datesUntil; Soutine took the box's first dates).
const PRM_BOX=/^(?:Current|Upcoming|Past) Exhibitions$|^Mostre (?:in corso|future|passate)$/i;
//@piece LINK_VENUES


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
  // Her name, the city first (her decision, as Antwerp KMSKA).
  "occ-modernamuseet-se":{card:"Stockholm Moderna",short:"Stockholm Moderna",notCard:"Moderna Museet Stockholm",name:"Moderna Museet"},
  // Her name, the country first. A retired show's address opens the "Past Exhibitions" list (Louise
  // Bourgeois), which is never a show (listingPage); a heading line ending in a comma runs on to the
  // next line (headingCommaJoin; "Diane Arbus Photographs," over "1956-1971").
  "occ-louisiana-dk":{card:"Denmark Louisiana",short:"Denmark Louisiana",notCard:"Louisiana Humleb\u00e6k",name:"Louisiana Museum of Modern Art",
    linkRead:{listingPage:/^Past exhibitions$/i,headingCommaJoin:true}},
  // Christie's press site is the same venue as christies.com (her decision; links from now on, rows already in left as they are).
  "occ-christies-com":{sites:[{host:"press.christies.com"}]},
};
//@piece linkEntry

const linkEntry=id=>Object.prototype.hasOwnProperty.call(LINK_VENUES,id)?LINK_VENUES[id]:null;
//@piece ownChip

const ownChip=id=>!!(linkEntry(id)||{}).ownChip;
//@piece chipKey

// The chip a venue's cards sit under: its group's, where it has one.
const chipKey=id=>(linkEntry(id)||{}).group||id;
//@piece elsewherePrompt


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
//@piece elsewhereAnswer

function elsewhereAnswer(a){
  const o=a&&typeof a==="object"?a:{};
  const str=v=>typeof v==="string"?v.replace(/["“”]/g,"").replace(/\s+/g," ").trim():"";
  return{venueSite:str(o.venueSite).toLowerCase(),title:str(o.title)};
}
//@piece flatName


const flatName=x=>foldText(x).replace(/^the\s+/,"").replace(/[^a-z0-9]+/g," ").trim();
//@piece maybeElsewhere

// Claude says the page is not the museum's own, and the page's site is not named for the museum.
function maybeElsewhere(a,pageHost){
  return !!(a&&a.venue&&!a.venueOwnPage)&&!flatName(a.venue).split(" ").some(w=>w.length>=4&&foldText(pageHost).includes(w));
}
//@piece heldElsewhere

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
//@piece onMuseumSite


// A page on another part of one of her museums' own website (Tate's library, library.tate.org.uk;
// a section the address alone does not file): its host is the museum's, or under it.
const onMuseumSite=(host,m)=>VENUE_SITES.some(v=>v.id===m&&(bareHost(host)===v.host||bareHost(host).endsWith("."+v.host)));
//@piece nearMuseumSite

const nearMuseumSite=host=>VENUE_SITES.some(v=>onMuseumSite(host,v.id));
//@piece ownMuseumNamed

// Such a page files under the museum Claude names, when it is that museum's site → its id, or null.
function ownMuseumNamed(a,pageHost){
  const said=flatName(a&&a.venue||"");
  if(!said)return null;
  const m=Object.values(MU).find(m=>m&&!m.occasional&&[m.name,m.short].some(x=>x&&(said===flatName(x)||said.startsWith(flatName(x)+" "))));
  return m&&onMuseumSite(pageHost,m.id)?m.id:null;
}
//@piece occVenueId


function occVenueId(host){
  return "occ-"+String(host||"").toLowerCase().replace(/^www\./,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
//@piece siteVenues


// The link venues whose `sites` take this address → [[id, line]] (line: the house line, or none).
function siteVenues(url){
  let u; try{ u=new URL(siteUrlOf(url)); }catch{ return []; }
  const h=u.hostname.toLowerCase().replace(/^www\./,"");
  const out=[];
  for(const [id,v] of Object.entries(LINK_VENUES))
    for(const s of v.sites||[]) if(s.host===h&&(!s.path||s.path.test(u.pathname)))out.push([id,s.line||null]);
  return out;
}
//@piece addressVenue

// The one venue an address alone names: a swept venue, a link venue by one of its `sites`
// (not a site several houses share), else null.
function addressVenue(url){
  const known=knownVenueFor(url);
  if(known)return known;
  const s=siteVenues(url).filter(([,l])=>!l);
  return s.length===1?s[0][0]:null;
}
//@piece linkVenue

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
//@piece linkReadVenue


// The venue whose link options read a page: a swept venue, or a link venue.
function linkReadVenue(url){
  const occ=occVenueId(hostOf(siteUrlOf(url)));
  return addressVenue(url)||(linkEntry(occ)?occ:null);
}
//@piece knownVenueFor


// A link to one of the swept venues files under it, matched by site from the scraper's
// recipes (VENUE_SITES, written by the join from the scraper); the Tates are told apart by path.
function knownVenueFor(url){
  const site=siteUrlOf(url);
  const h=hostOf(site).replace(/^www\./,"");
  if(!h)return null;
  let path="";
  try{ path=new URL(site).pathname; }catch{}
  const hit=VENUE_SITES.find(v=>v.host===h&&(!v.path||path.startsWith(v.path)));
  return hit?hit.id:null;
}
//@piece occVenue


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
//@piece namedByAddress

// A venue the store holds named only by its address, as every new venue was before Claude named them.
const namedByAddress=v=>!!v&&!v.short&&bareHost(v.name)===bareHost(v.host);
//@piece needsFacts

// A link venue whose name and place Claude has not yet given: asked on its next link (her
// decision), her own names and rules kept.
const needsFacts=v=>!v||namedByAddress(v)||!v.city;
//@piece bareHost

const bareHost=h=>String(h||"").toLowerCase().replace(/^www\./,"");
//@piece venueSearchName

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
//@piece registerOccasional

function registerOccasional(map){
  for(const v of Object.values(map||{})){ if(!v||!isOcc(v.id))continue; MU[v.id]=occVenue(v.id,v); KNOWN_VENUES.add(v.id); }
}
//@piece registerUnseenOccasional

function registerUnseenOccasional(rows){
  for(const r of rows||[]){
    if(!isOcc(r.museumId)||MU[r.museumId])continue;
    MU[r.museumId]=occVenue(r.museumId,null,hostOf(r.exUrl).replace(/^www\./,"")||r.museumId.slice(4));
    KNOWN_VENUES.add(r.museumId);
  }
}
//@piece readOccasional

async function readOccasional(){
  const db=await useCap("db");
  if(!db){ markUnread(UNREAD_OCC); return{}; }
  try{ const s=await db.doc(OCC_DOC).get(); return s.exists?((s.data()||{}).venues||{}):{}; }catch{ markUnread(UNREAD_OCC); return {}; }
}
//@piece writeOccasional

async function writeOccasional(map){
  if(STORE_UNREAD.has(UNREAD_OCC))return false;
  const db=await useCap("db");
  if(!db)return false;
  try{ await db.doc(OCC_DOC).set({venues:map,updatedAt:new Date().toISOString()}); return true; }catch{ return false; }
}
