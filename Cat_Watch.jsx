import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

// WHICH VERSION IS SHE LOOKING AT — her ruling, 22 Sep 2026. The number used to
// live only in the guide and in chat, so the page in front of her carried no
// way to tell itself apart from the one before it. It is printed in the footer
// now: a number she can read off the screen instead of matching against a
// conversation.
//
// THE DATE IS PART OF IT because the number alone cannot answer the only
// question it is ever asked — is this older than the one just built. A date
// answers that on sight.
//
// HOW IT COUNTS, her rule: a whole number for a substantial change, a decimal
// for a small one. This is the ONLY place it is written down. Bump it in the
// same breath as the change it describes, or it lies.
const APP_VERSION = "34";
const APP_VERSION_DATE = "25 Sep 2026";

// THE ORDER IS HERS, 20 Sep 2026, and it is not alphabetical, geographic or by
// size — it is the order she wants to WORK in. The venues she reads most come
// first; the three Italian sites she finds hardest to check sit together near
// the end; the three that refuse us outright sit last, because nothing there is
// ever hers to decide.
//
// IT IS ALSO THE ONLY ORDER IN THE APP. The freshness drawer, the venue filter
// chips and every venue heading on the refresh screen all read this array, so
// moving a venue here moves it everywhere and they cannot drift apart. Adding a
// second hand-typed list of codes is how two finished recipes once became
// unselectable with nothing to say why.
//
// Accademia (dellav) was not in her list; it sits with the other Italian venues
// until she says otherwise.
// SHOP ADDRESSES — the search box, not the front door. Checked one by one,
// 21 Sep 2026, by opening each and reading the results back. Step one OPENS
// these; it no longer searches the open web hoping to land on the shop.
//
// shopSearch is the shop's own search box with the exhibition title tacked on.
// shopCatalogues, where a shop has one, is its shelf of exhibition catalogues:
// all books, no trinkets, but only what is in stock today, so it is looked at
// FIRST and the search box still runs after it.
//
// KHM is the one unverified line: its shop answers with a waiting-room
// redirect that the reader cannot follow. Left wired so it is retried and
// visible, exactly as the blocked venues are in the scraper.
const MUSEUMS = [
  { id:"met", short:"The Met", name:"The Metropolitan Museum of Art", city:"New York",
    exBase:"https://www.metmuseum.org/exhibitions/", shopSearch:"https://store.metmuseum.org/search?q=", shopCatalogues:"https://store.metmuseum.org/books-toys-games/exhibition-catalogues", shopHome:"https://store.metmuseum.org/", listUrl:"https://www.metmuseum.org/exhibitions" },
  { id:"rijks", short:"Rijksmuseum", name:"Rijksmuseum", city:"Amsterdam",
    exBase:"https://www.rijksmuseum.nl/en/whats-on/exhibitions/", shopSearch:"https://www.rijksmuseumshop.nl/en/search?q=", shopCatalogues:"https://www.rijksmuseumshop.nl/en/books/exhibition-books", shopHome:"https://www.rijksmuseumshop.nl/en/", listUrl:"https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view" },
  { id:"ng", short:"National Gallery", name:"The National Gallery", city:"London",
    exBase:"https://www.nationalgallery.org.uk/exhibitions/", shopSearch:"https://shop.nationalgallery.org.uk/catalogsearch/result/?q=", shopCatalogues:"https://shop.nationalgallery.org.uk/books/exhibition-catalogues.html", shopHome:"https://shop.nationalgallery.org.uk/", listUrl:"https://www.nationalgallery.org.uk/exhibitions" },
  { id:"acq", short:"Acquavella", name:"Acquavella Galleries", city:"New York",
    exBase:"https://www.acquavellagalleries.com/exhibitions/", shopSearch:"https://acquavellagalleries.myshopify.com/search?q=", shopCatalogues:"https://acquavellagalleries.myshopify.com/collections/all", shopHome:"https://acquavellagalleries.myshopify.com/", listUrl:"https://www.acquavellagalleries.com/exhibitions" },
  { id:"frick", short:"Frick", name:"The Frick Collection", city:"New York", exBase:null, shopSearch:"https://shop.frick.org/search.php?search_query=", shopCatalogues:"https://shop.frick.org/publications/exhibition-catalogues/", shopHome:"https://shop.frick.org/", listUrl:null },
  { id:"menil", short:"Menil", name:"The Menil Collection", city:"Houston", exBase:null, shopSearch:"https://bookstore.menil.org/search?q=", shopCatalogues:"https://bookstore.menil.org/collections/menil-publications", shopHome:"https://bookstore.menil.org/", listUrl:null },
  { id:"artic", short:"Art Institute", name:"Art Institute of Chicago", city:"Chicago", exBase:null, shopSearch:"https://shop.artic.edu/search?q=", shopCatalogues:"https://shop.artic.edu/collections/exhibition-catalogues", shopHome:"https://shop.artic.edu/", listUrl:null },
  { id:"wallace", short:"Wallace", name:"The Wallace Collection", city:"London", exBase:null, shopSearch:"https://wallacecollectionshop.org/search?q=", shopCatalogues:"https://wallacecollectionshop.org/collections/wallace-collection-publications", shopHome:"https://wallacecollectionshop.org/", listUrl:null },
  { id:"tate-britain", short:"Tate Britain", name:"Tate Britain", city:"London", exBase:null, shopSearch:"https://shop.tate.org.uk/search?q=", shopCatalogues:"https://shop.tate.org.uk/books/exhibition-books?sz=96", shopHome:"https://shop.tate.org.uk/", listUrl:null },
  { id:"tate-modern", short:"Tate Modern", name:"Tate Modern", city:"London", exBase:null, shopSearch:"https://shop.tate.org.uk/search?q=", shopCatalogues:"https://shop.tate.org.uk/books/exhibition-books?sz=96", shopHome:"https://shop.tate.org.uk/", listUrl:null },
  { id:"va", short:"V&A", name:"Victoria and Albert Museum", city:"London", exBase:null, shopSearch:"https://www.vam.ac.uk/shop/search?q=", shopCatalogues:"https://www.vam.ac.uk/shop/books/exhibition-books.html", shopHome:"https://www.vam.ac.uk/shop", listUrl:null },
  { id:"louvre", short:"Louvre", name:"Louvre Museum", city:"Paris", exBase:null, shopSearch:"https://boutique.louvre.fr/en/search/products/?q=", shopCatalogues:"https://boutique.louvre.fr/en/products/400001-exhibition-catalogues/", shopHome:"https://boutique.louvre.fr/en/", listUrl:null },
  { id:"khm", short:"KHM Vienna", name:"Kunsthistorisches Museum", city:"Vienna", exBase:null, shopSearch:"https://shop.khm.at/en/search?q=", shopHome:"https://shop.khm.at/en/", listUrl:null },
  { id:"uffizi", short:"Uffizi", name:"Uffizi Galleries", city:"Florence", exBase:null, shopSearch:"https://shop.uffizi.it/en/?s=", shopHome:"https://shop.uffizi.it/en/", listUrl:null },
  { id:"dellav", short:"Accademia", name:"Gallerie dell'Accademia", city:"Venice", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"borghese", short:"Borghese", name:"Galleria Borghese", city:"Rome", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"brera", short:"Brera", name:"Pinacoteca di Brera", city:"Milan", exBase:null, shopSearch:"https://bottegabrera.org/en/search?q=", shopCatalogues:"https://bottegabrera.org/en/collections/guide-e-cataloghi", shopHome:"https://bottegabrera.org/en/", listUrl:null },
  { id:"capo", short:"Capodimonte", name:"Museo e Real Bosco di Capodimonte aka Museo Nazionale di Capodimonte", city:"Naples", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"moma", short:"MoMA", name:"Museum of Modern Art", city:"New York", exBase:null, shopSearch:"https://store.moma.org/search?q=", shopCatalogues:"https://store.moma.org/collections/exhibition-catalogues", shopHome:"https://store.moma.org/", listUrl:null },
  { id:"brit", short:"British Museum", name:"The British Museum", city:"London", exBase:null, shopSearch:"https://www.britishmuseumshoponline.org/catalogsearch/result/?q=", shopCatalogues:"https://www.britishmuseumshoponline.org/books/exhibition-books.html", shopHome:"https://britishmuseumshoponline.org/", listUrl:null },
  { id:"morgan", short:"Morgan", name:"Morgan Library & Museum", city:"New York", exBase:null, shopSearch:"https://shop.themorgan.org/search?q=", shopCatalogues:"https://shop.themorgan.org/collections/exhibition-catalogs", shopHome:"https://shop.themorgan.org/", listUrl:null },
];
const MU = Object.fromEntries(MUSEUMS.map(m=>[m.id,m]));

// ---- v9 pro forma helpers (pure) ----
const KNOWN_VENUES = new Set(MUSEUMS.map(m=>m.id));
function isValidYMD(s){ if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false; const d=new Date(s+"T00:00:00"); return !isNaN(d.getTime()); }
// SAME ADDRESS MEANS SAME EXHIBITION — the one identity test with no
// judgement in it, and the scraper's own settled rule. Scheme and host are
// lowercased because hosts are case-insensitive by spec; THE PATH IS NOT
// TOUCHED, because folding it merged two exhibitions that differed only in
// capitalisation. A trailing slash and a #fragment are not part of identity.
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

// HOW MANY CARDS ARE DECIDED — and it is the gate on the ledger, so it lives
// out here where a fixture can reach it. It used to be eight lines inside the
// component, which is where the counting for a LABEL belongs; it stopped being
// a label on 20 Sep, when her ruling made the button refuse to fire while
// anything is undecided.
//
// WHAT COUNTS AS DECIDED, and the subtlety is the second half: REJECTING is
// deciding. An Add card she turned down, and a Fill/Change card whose every
// field she turned down, are finished work — they must not hold the gate shut.
// Only a card she has not touched at all is undecided. Getting that backwards
// would make the button unreachable for anyone who rejects anything, which is
// most of a real sweep.
// IS THIS ONE CARD STILL UNTOUCHED. The gate counts these and the "jump to the
// next undecided" button finds them, and THOSE TWO MUST NEVER DISAGREE — a
// button refusing to fire while the jump says there is nothing left is a dead
// end with no way out of it. So there is one function and both call it. It was
// briefly two, which is exactly how that pair of copies begins.
function isUndecidedCard(p,dec){
  dec=dec||{};
  if(p.type==="add")return !dec.mode;
  if(dec.mode)return false;                       // reject, or "different show"
  return !Object.values(dec.fields||{}).some(v=>v);
}

function countDecisions(proposals,decisions){
  let acceptedCount=0,undecidedCount=0;
  (proposals||[]).forEach((p,i)=>{
    const dec=(decisions||{})[i]||{};
    if(isUndecidedCard(p,dec)){undecidedCount++;return;}
    if(p.type==="add"){ if(dec.mode==="accept")acceptedCount++; return; }
    if(dec.mode==="addnew"){acceptedCount++;return;}
    if(Object.values(dec.fields||{}).some(v=>v==="accept"))acceptedCount++;
  });
  return {acceptedCount,undecidedCount};
}

// ===== TEMPORARY, WITH countDecisions BECAUSE A FIXTURE MUST REACH IT =====
// WHEN THE SIDE DOOR IS OFFERED — see the button itself for why it exists and
// when to pull it out. The rule lives here, out of the component, for one
// reason: written inline in the JSX it could only be tested by a second copy
// of it in the test file, and a second copy drifts silently.
//
// BOTH HALVES MATTER. Nothing decided → nothing to apply, and offering a
// button that would write an empty change is offering a dead control. Nothing
// left undecided → the real button is already live, and a second way to do the
// same thing is the kind of pair that ends up disagreeing. So it appears only
// in the middle state, which is the only state it is for.
function offerPartialApply(counts){
  const c=counts||{};
  return (c.acceptedCount||0)>0 && (c.undecidedCount||0)>0;
}

// MERGE, NEVER REPLACE — and this is the rule that stops the bug coming back
// in a new place. Importing an OLD sweep file must not drag a venue's date
// backwards, so a venue's line only moves when the incoming time is LATER.
// The two halves move independently: a venue can be tried today and still show
// an older date for its last real rows, which is the one line that says
// "re-run this one on its own".
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

// ── QUARANTINE — SAME THIRD PLACE AS THE SWEEP LOG, her ruling 20 Sep 2026 ──
//
// IT WAS IN THE LEDGER AND THAT WAS THE WRONG CONTAINER, decided in the same
// session that moved the sweep log out and somehow not applied to the thing
// sitting next to it. Her scenario is the whole argument: quarantine two junk
// rows, Reset to the starter set, feed the SAME sweep file again — and every
// piece of junk is back, because the only record of her decision went with the
// ledger she just replaced. A feature whose entire promise is "never show me
// this again" cannot depend on which file happens to be open.
//
// BUT IT IS NOT THE SWEEP LOG EITHER, and the difference decides the design.
// The sweep log is safe living only here because it is DERIVABLE: every fact in
// it comes from a sweep file, so losing it costs one re-import. Quarantine is
// derivable from nothing — it is her judgement, and only she can rebuild it.
// That is the same property that keeps her LEDGER out of this store.
//
// SO IT LIVES IN BOTH, WITH A RULE ABOUT WHICH WINS — her choice, C, taken over
// her own objection that redundancy is lazy. It is not two hopeful copies: the
// store is the working copy that always applies, the export is the backup, and
// the rule below settles every disagreement between them. Her ledger already
// has exactly this shape.
//
// THE RULE IS LATEST DECISION WINS, WHICH NEEDS TOMBSTONES. Taking a row out of
// quarantine has to be RECORDED, not merely absent, or loading an older backup
// would silently re-block something she released — the same bug the sweep log's
// merge rule exists to prevent, one door along. So a released row stays in the
// store as `released` with the time she released it.
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

// URGENCY COLOURS, ONE SET PER THEME — dark added 20 Sep 2026 at her request.
//
// The washes are not the light ones dimmed. A pale badge on a dark ground
// glares, so each dark wash is a DEEP tint of the same hue and the ink becomes
// the light end of it — the ladder keeps its meaning (cool blue for announced
// through to deep red for long closed) while the page stays dark.
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
    // After Announced — her ordering, 23 Sep.
    unknown: { label: "Dates unclear", note: "No reliable end date found.", time: "current", ord: 3 },
};
const tiersFor = mode => Object.fromEntries(Object.keys(TIER_TEXT).map(
  k => [k, { ...TIER_TEXT[k], ...TIER_SETS[mode][k] }]));
// TIERS stays a module-level constant for everything that reads a LABEL or an
// `ord` outside the component (sorting, band names). Colour is read from the
// component's themed copy; these values are the light ones and are never used
// to paint anything in dark mode.
const TIERS = tiersFor("light");

function relTime(iso){if(!iso)return null;const d=new Date(iso);if(isNaN(d))return null;const s=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));if(s<60)return"just now";const m=Math.floor(s/60);if(m<60)return m+" minute"+(m===1?"":"s")+" ago";const h=Math.floor(m/60);if(h<24)return h+" hour"+(h===1?"":"s")+" ago";const day=Math.floor(h/24);return day+" day"+(day===1?"":"s")+" ago";}
function minsSinceIso(iso){if(!iso)return Infinity;const d=new Date(iso);if(isNaN(d))return Infinity;return(Date.now()-d.getTime())/60000;}
const MS_MO=1e3*60*60*24*30.44, MS_WK=1e3*60*60*24*7;
const moSince=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");return isNaN(x)?null:(Date.now()-x)/MS_MO;};
const wksSince=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");return isNaN(x)?null:(Date.now()-x)/MS_WK;};

function tierFor(r){
  const now=new Date(),st=r.startDate?new Date(r.startDate+"T00:00:00"):null,en=r.endDate?new Date(r.endDate+"T00:00:00"):null;
  if(st&&!isNaN(st)&&st>now)return"upcoming";
  if(en&&!isNaN(en)){if(en>=now){return(st&&wksSince(r.startDate)<=6)?"recent":"current";}const m=moSince(r.endDate);if(m<3)return"fresh";if(m<6)return"closing";if(m<12)return"urgent";return"lapsed";}
  if(st&&!isNaN(st)&&st<=now)return wksSince(r.startDate)<=6?"recent":"current";
  return"unknown";
}

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

// ── A 10-DIGIT ISBN IS TAKEN, NOT THROWN AWAY \u2014 her ruling, 21 Sep 2026 ──
//
// There is nothing wrong with an ISBN-10. Every book printed before 2007 has
// one and plenty of shop pages still show only that. The first version of the
// page read refused them, which was a limit I put in rather than a fact about
// the number, and it cost the row its ISBN for no reason: with no ISBN the
// reseller links fall back to searching by TITLE, which is the failure that
// sent Alibris to the wrong book.
//
// THE CONVERSION IS NOT FOR SEARCHING. All three resellers find a book from
// either form. It is for HER SCREEN: the ledger has one field and one format,
// 3 digits and 10, so a 10-digit number cannot be stored or shown in it. One
// input, one correct answer, no judgement \u2014 which makes it code's job.
//
// 978 on the front, the first nine digits, and a fresh check digit. THE OLD
// CHECK DIGIT IS VERIFIED FIRST, so a mangled or mistyped number is refused
// rather than converted into a plausible wrong one \u2014 the same reasoning as
// ymd() checking a date exists before it is stored.
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

// WHAT THE LEDGER IS ALLOWED TO STORE. Thirteen digits if we were given
// thirteen; a converted ten if we were given a valid ten; nothing otherwise.
// Every place an ISBN ENTERS the app goes through here. cleanIsbn stays the
// strict gate everything downstream reads, so nothing but a 13 can be
// displayed or linked.
const toIsbn13=v=>cleanIsbn(v)||isbn10to13(v);
const MON3=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");if(isNaN(x))return d;return x.getDate()+" "+MON3[x.getMonth()]+" "+x.getFullYear();};
function fmtRefresh(iso){if(!iso)return"never";const d=new Date(iso);if(isNaN(d))return"never";const mon=MON3[d.getMonth()];let h=d.getHours();const ap=h<12?"am":"pm";h=h%12;if(h===0)h=12;const mm=String(d.getMinutes()).padStart(2,"0");return mon+" "+d.getDate()+", "+d.getFullYear()+" "+h+":"+mm+ap;}
function dateRange(r){const a=fmtDate(r.startDate),b=fmtDate(r.endDate);if(a&&b)return a+" \u2014 "+b;if(b)return"until "+b;if(a){const st=new Date(r.startDate+"T00:00:00");const past=!isNaN(st)&&st<=new Date();return(past?"open since ":"opens ")+a;}return"dates unknown";}

function buyLinks(r){const isbn=cleanIsbn(r.isbn13),title=r.catalogueTitle||r.title,q=encodeURIComponent(isbn||title),tq=encodeURIComponent(title),mu=MU[r.museumId],out=[];if(r.shopUrl)out.push({name:shopLinkLabel(r.shopState),href:r.shopUrl});else if(mu&&mu.shopSearch)out.push({name:"Museum shop",href:mu.shopSearch+tq});else if(mu&&mu.shopHome)out.push({name:"Museum shop",href:mu.shopHome});if(r.publisherUrl)out.push({name:publisherLinkLabel(r.publisherResult),href:r.publisherUrl});out.push({name:"Amazon AU",href:"https://www.amazon.com.au/s?k="+q},{name:"AbeBooks AU",href:"https://www.abebooks.com/servlet/SearchResults?kn="+(isbn||tq)+"&sts=t"},{name:"Alibris",href:"https://www.alibris.com/booksearch?keyword="+q});return out;}

// ── FINDING A CATALOGUE — rebuilt 20 Sep 2026 ────────────────────────────────
//
// WHAT BROKE. The old version called api.anthropic.com straight from the page.
// The viewer's sandbox now blocks a page from reaching ANY outside address, so
// the request never left: the diagnostic read "Network: Failed to fetch", which
// is the browser refusing, not a server saying no. Nothing was wrong with the
// key, the account or the prompt. The route closed.
//
// WHAT REPLACES IT, and why it is not the same mistake. A page may not reach
// the internet, but it MAY call the viewer's own connectors, under the viewer's
// credentials, with no key anywhere in this file. So:
//
//   1. SEARCH runs on her Parallel Search connector — free, no account, and
//      the page never touches the network itself.
//   2. READING the results is Claude's job, through `sample`. Claude cannot
//      browse, which is exactly why the two halves are separate: the connector
//      finds pages, Claude only reads text we hand it. It can never invent a
//      shop it did not see.
//
// The division is the same as before — search, then a model reads what came
// back. Only the plumbing changed.
//
// NAMED CONSTANTS, because a typo here fails at the viewer, not here.
const SEARCH_SERVER = "Parallel Search";
const SEARCH_TOOL   = "web_search";
// READING A WHOLE PAGE, not a snippet. Declared 21 Sep 2026 for the ISBN gap
// below; the connector has always offered it and only web_search was wired.
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

// Every failure code that has its OWN fix gets its own sentence. The capability
// notes name a single catch-all banner as the anti-pattern: it hides the one
// action that would fix the page.
function mcpTrouble(e){
  const code=String((e&&e.code)||"");
  if(code==="server_not_connected")return "Add the \u201cParallel Search\u201d connector in claude.ai \u2192 Settings \u2192 Connectors, then try again.";
  if(code==="needs_reauth")       return "Reconnect \u201cParallel Search\u201d in claude.ai \u2192 Settings \u2192 Connectors \u2014 its access has lapsed.";
  if(code==="not_in_manifest")    return "This page isn\u2019t allowed to use \u201cParallel Search\u201d \u2014 you may have turned it off for this artifact.";
  if(code==="selection_required") return "You have more than one \u201cParallel Search\u201d connector. Pick one when Claude asks, then try again.";
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

// Read ONE page in full. Same connector, same failure sentences as searchWeb.
//
// WHY THIS EXISTS — her finding, 20 Sep 2026. A search result is an EXCERPT:
// a headline and a line or two. An ISBN is printed in the small print at the
// bottom of a shop page, so it is almost never inside the excerpt, and the
// lookup reported no ISBN for books whose page prints one. With no ISBN the
// reseller links fall back to searching by TITLE, and a title search misfires
// \u2014 Alibris returned the wrong book for the Met's Musical Bodies.
//
// It reaches a COLLAPSED section, which is the case she asked about: the Met
// store's "Details" panel is already in the page and the button only hides it,
// so a full read sees it shut. Verified against that page, 21 Sep. A shop that
// only goes and GETS those details when clicked would still come back empty
// \u2014 no ISBN, noted, exactly as today. Never a wrong one.
//
// IT TAKES ONE PAGE OR SEVERAL. Step one opens a shop's catalogue shelf and
// its search box together, in ONE call, because they answer the same question
// and two calls would be two waits.
async function fetchPage(url,objective,queries){
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

// The shop pages step one opens for one exhibition: the catalogue shelf where
// the shop has one, then its search box with the exhibition's title in it.
// Nothing is guessed here \u2014 both addresses are the venue's own, written down
// in MUSEUMS above.
//
// A SHELF THAT SCROLLS OR PAGINATES IS STILL JUST MORE ADDRESSES \u2014 her
// question, 21 Sep, and the scraper learned the same thing at the Menil. The
// Menil's shelf shows 16 books and has three numbered pages; the Morgan's
// keeps growing as you scroll and has no buttons at all. Both answer
// "?page=2" perfectly well, and Tate's endless scroll answers a size
// parameter that is baked into its address above. Reading only what the
// first screen shows would have taken 16 of the Menil's 47.
//
// THE DEPTH IS ONE NUMBER FOR EVERY SHOP, NEVER A COUNT PER VENUE \u2014 the
// scraper's rule, and for the same reason: how many pages a shop has is the
// shop's business and it changes. Asking for a page that does not exist costs
// nothing and comes back empty, and all of them go in ONE call, so depth is
// free. Today's largest shelf is the Menil's 47.
const SHELF_DEPTH=3;

// Shopify and most others take ?page=N. A shelf that already carries its own
// size parameter (Tate) is left exactly as written \u2014 it serves the lot in one.
function shelfPages(url){
  if(!url)return[];
  if(/[?&]sz=|[?&]product_list_limit=/.test(url))return[url];
  const join=url.includes("?")?"&":"?";
  const out=[url];
  for(let n=2;n<=SHELF_DEPTH;n++)out.push(url+join+"page="+n);
  return out;
}

function shopPagesFor(mu,title){
  const out=[];
  if(mu&&mu.shopCatalogues)out.push(...shelfPages(mu.shopCatalogues));
  if(mu&&mu.shopSearch)out.push(mu.shopSearch+encodeURIComponent(title));
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


// ── THE SWEEP LOG — kept OUTSIDE the ledger, her ruling 20 Sep 2026 ─────────
//
// IT USED TO LIVE IN THE LEDGER AND THAT WAS WRONG. Her test settles it:
// open a backup from two days ago and the drawer said "the Met last brought
// rows 18 Sep"; open today's and it said 20 Sep. Same world, two answers. A
// sweep either ran or it did not — opening an older file cannot un-run it.
//
// THE DISTINCTION, and it is hers: CONTENT rolls back with a backup and that
// is correct (fewer exhibitions, her marks as they stood — the document
// genuinely was smaller then). A FACT ABOUT THE WORLD must not. "The Met was
// swept on 13 Sep" is true whichever backup she has open. The sweep log is the
// second kind and it was sitting in the first kind's container.
//
// SO IT LIVES IN THIS PAGE'S OWN STORE — one document, one line per venue,
// twenty-one lines, never growing. It survives Reset, it is there before any
// ledger is loaded, and loading an old backup does not move it.
//
// IT IS A CACHE, NOT A MASTER RECORD, and that is what makes it safe to keep
// somewhere she cannot export. Every fact in it comes from swept_at in a sweep
// file, so any sweep file rebuilds it. Losing it costs one re-import, not her
// work. Her LEDGER could never live here for exactly that reason — it is not
// derivable from anything.
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
// ── THE ISBN FILL \u2014 the two decisions, kept OUT of the component ───────────
//
// They sit here, not inside App, for the reason countDecisions was moved out:
// a rule a fixture cannot reach is a rule nobody checks. The component keeps
// the plumbing (which page, which prompt); these two hold what may change.

// OPEN THE BOOK'S OWN PAGE WHENEVER ANYTHING IS STILL MISSING \u2014 her ruling,
// 21 Sep, and she was right that the old rule was decoration.
//
// It used to open the page only when the ISBN was missing. That gate saved
// nothing: a shop's list of catalogues prints a cover, a title and a price,
// and NEVER an ISBN \u2014 so after a shop lookup the ISBN is always missing and
// the gate always opened. Her question: what is it for?
//
// And in the one case it stayed shut it did harm. It asked about the ISBN
// alone, so a web result that happened to carry an ISBN but no publisher
// never opened the book's page, and the PUBLISHER was lost for nothing.
//
// Now: a catalogue was found, a page came with it, and either the ISBN or the
// publisher is still blank. Reading that page is the normal step, not the
// exception.
function needsPageRead(hit){
  return !!(hit&&hit.ok&&hit.pageUrl&&hit.row&&hit.row.hasCatalogue==="yes"
            &&(!hit.row.isbn13||!hit.row.publisher));
}

// IT FILLS BLANKS AND NOTHING ELSE. A publisher already read from the search
// results stands; a 10-digit ISBN is converted by toIsbn13 and anything that
// is not a real ISBN is refused, so the row keeps its blank. A page that
// yields nothing must leave the row exactly as it was \u2014 the old answer,
// never a worse one.
function applyIsbnFill(row,o,dom){
  const isbn=toIsbn13(o&&o.isbn13);
  const pub=(o&&o.publisher)?String(o.publisher).trim():"";
  const purl=cleanPublisherUrl(o&&o.publisherUrl,dom);
  if(!isbn&&!pub&&!purl)return row;
  return{...row,
    isbn13:isbn||row.isbn13,
    publisher:row.publisher||pub||null,
    publisherUrl:row.publisherUrl||purl||null};
}

function shopDomain(mu){if(!mu||!mu.shopHome)return null;try{return new URL(mu.shopHome).hostname;}catch{return null;}}

// WHICH OF THESE RESULTS IS THE PUBLISHER\u2019S OWN SITE \u2014 answered in code.
//
// A publisher\u2019s name is in its hostname: Hannibal Books is hannibalbooks.be,
// Thames & Hudson is thamesandhudson.com, Rizzoli is rizzoliusa.com. That is
// one input with one correct answer, so it is code\u2019s job and not a model\u2019s.
//
// The words every publisher shares carry no information and are dropped, or
// "Yale University Press" would match any university press. What is left must
// ALL appear in the host, so "hannibal" finds hannibalbooks.be and does not
// find hannibal-lecter fan sites, which are not publishers and have neither
// the rest of the name nor a book on them.
// "university" is dropped for the same reason as "press": Yale University
// Press lives at yalebooks.yale.edu, which carries the distinctive word and
// none of the shared ones. Checked against real publishers, not imagined ones.
const PUBLISHER_WORDS=new Set(["books","book","press","publishing","publishers","publisher",
  "editions","edition","verlag","publications","university","the","and","of","co","inc","ltd",
  "llc","bv","nv"]);
function publisherDomainFrom(results,name){
  const words=String(name||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .split(/[^a-z0-9]+/).filter(w=>w.length>2&&!PUBLISHER_WORDS.has(w));
  if(!words.length)return null;
  for(const r of (results||[])){
    let host;
    try{ host=new URL(String(r&&r.url||"")).hostname.toLowerCase(); }catch{ continue; }
    const flat=host.replace(/[^a-z0-9]/g,"");
    if(words.every(w=>flat.includes(w)))return host;
  }
  return null;
}

// \u2500\u2500 A MUSEUM THAT PRINTS ITS OWN CATALOGUES HAS NO PUBLISHER PAGE TO FIND \u2500\u2500
// Her ruling, 22 Sep 2026, after running the rebuilt lookup on real rows.
//
// The National Gallery's Zurbaran came back publisher "National Gallery
// Global", and the step then spent two searches and a page read proving what
// was already known: a museum's publishing arm has no separate site, because
// its "publisher page" IS the museum shop, which `cleanPublisherUrl` refuses
// by design. Two searches and a reading of her allowance, every time, for a
// guaranteed nothing.
//
// IT IS KEYED ON THE PUBLISHER, NEVER ON THE VENUE \u2014 her correction, and the
// first version got this wrong. I had matched the publisher's name against
// the venue's, so ANY catalogue from the Met or the National Gallery would
// have skipped the search. She named the two ways that breaks, and both are
// ordinary:
//
//   * a blockbuster show whose catalogue the museum gives to a big art-book
//     house to print, and
//   * a show mounted jointly with another museum, where the OTHER museum
//     prints it \u2014 a Met/Louvre co-production published by the Louvre.
//
// In both, a real third-party publisher page exists and my rule would have
// suppressed the search that finds it. So the test is not "is the publisher
// this venue" \u2014 it is "is this publisher one of the named few we have
// actually seen self-publish".
//
// SO IT IS A LIST OF TWO, AND IT GROWS ONLY WHEN SHE ADDS ONE. Her
// instruction: these two now, more as she meets them. Nothing is inferred
// from a name's shape, because inferring is precisely what went wrong.
// A publisher not on this list is searched for exactly as before \u2014 the cost
// of a miss is one search, the cost of a wrong entry is a lost buy link.
//
// ONE KNOWN LIMIT, STATED RATHER THAN ENGINEERED AROUND: the sentence says
// "the venue", which is true for every case we have. A Met-published
// catalogue for a show at the Louvre would read slightly wrong. It costs a
// word on one card and no link, so it is not worth a venue comparison here \u2014
// that comparison is the thing this note exists to avoid.
const SELF_PUBLISHERS = new Set([
  "national gallery global",              // ng \u2014 her row, Zurbaran
  "metropolitan museum of art",           // met
]);
// A leading "The" and any punctuation are noise, not a different publisher.
function normPublisher(name){
  return String(name||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g," ").trim().replace(/^the\s+/,"");
}
function isSelfPublisher(name){
  const n=normPublisher(name);
  return !!n&&SELF_PUBLISHERS.has(n);
}

// THE PUBLISHER\u2019S OWN PAGE \u2014 restored 21 Sep 2026, her finding.
//
// The app has always had a Publisher button and the ledger has always had a
// field for it. The 20 Sep rebuild asked neither prompt for it and wrote null
// into the row every time, so the button became unreachable and nothing said
// so \u2014 the same quiet loss in the same rewrite as the shop lock.
//
// IT MATTERS MORE THAN IT LOOKS. A museum shop sells its catalogue while the
// show is on; the art-book house that printed it often still lists the book
// long after the shop has sold out, which is the window this whole app is
// about.
//
// CHECKED, NOT TRUSTED. A link is taken only if it is a real http address, and
// never if it is on the venue\u2019s own shop \u2014 that is the shop link wearing the
// wrong label, and it would send her to a page she already has a button for.
// Everything else is left to her judgement, as it was before: there is no list
// of art publishers to check against and inventing one would be the phrase-list
// mistake again.
function cleanPublisherUrl(u,dom){
  if(!u)return null;
  const t=String(u).trim();
  if(!urlLooksValid(t))return null;
  try{ if(dom&&new URL(t).hostname.toLowerCase().includes(String(dom).toLowerCase()))return null; }catch{ return null; }
  return t;
}


// ── A CONTAINER IS NOT THE BOOK, AND A SHELL IS NOT AN EMPTY SHELF ──────────
// Her ruling, 22 Sep 2026, from her own diagnosis of two real lookups.
//
// WHAT WAS WRONG. The publisher step took whatever page the search returned
// and filed it as "the publisher's page", full stop. For Rizzoli that was the
// book itself — rizzoliusa.com/book/9780847877645 — and it looked like the
// step working. It was not working; it was LUCKY. Rizzoli happens to key its
// product addresses by ISBN, so a site: search matches the book directly.
// Hannibal Books keys its books by a Dutch slug plus a #fragment, and a
// fragment is never sent to a server and never indexed, so the deepest thing
// any search can return for that book is the SECTION it sits in —
// hannibalbooks.be/en/fine-art. The step returned that and called it the
// book's page. The code could not tell the two outcomes apart.
//
// HER FIX, AND IT IS ONE STEP, NOT A BETTER QUERY: never accept a candidate
// unseen. Open it. Either it IS the book (accept), or it LISTS the book
// (take the link off it), or it came back empty (keep it, and say on screen
// that it is the section and not the book).
//
// NO HEADLESS BROWSER. Her call, and the scope is why: only the buried-product
// publishers reach this step at all, and only the client-rendered ones among
// those come back empty. Building a rendering fetch for a handful of Belgian
// art publishers is not worth it. The honest label is.

// How much text a fetched page must carry before we believe we saw it.
//
// MEASURED, NOT CHOSEN, 22 Sep 2026, against the two real pages this rule is
// about. Hannibal's fine-art section returns 110 characters — a sort control,
// a newsletter box and the web designer's credit, with all 200-odd books
// missing because they are drawn by script after the page arrives. The Menil's
// shelf, which is ordinary server-drawn HTML, returns several thousand with
// every book's own address in it. There is no third case anywhere near the
// line, which is what makes one number safe here.
const SHELL_CHARS=400;

function pageTextOf(results){
  return (results||[]).map(r=>
    Array.isArray(r&&r.excerpts)?r.excerpts.join("\n"):String((r&&r.full_content)||"")
  ).join("\n").trim();
}

// A page that came back empty is NOT a page with nothing on it. Saying which
// is the whole point: an empty answer from a script-drawn page is our blind
// spot, and reporting it as "this book is not on the publisher's site" would
// be a finding we never earned.
function pageIsShell(results){ return pageTextOf(results).length<SHELL_CHARS; }

// A LINK READ OFF A LISTING IS CHECKED BEFORE IT IS BELIEVED.
//
// Two ways it can be wrong and both are mechanical, so both are code's. It
// must be on the publisher's own site — a listing links out to Amazon, to
// distributors, to the museum — and it must not be the listing itself, or
// "the book's own page" is the container wearing a new label.
//
// A DIFFERING #FRAGMENT COUNTS AS A DIFFERENT ADDRESS, deliberately. That is
// exactly how Hannibal addresses its books (#102642 is the English edition,
// #102640 the Dutch), so folding on the fragment would throw away the one
// case this whole step exists for.
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


// WHAT THE PUBLISHER BUTTON IS ALLOWED TO CLAIM — her ruling, 22 Sep 2026.
//
// A link the app verified against the book's own page and a link that is only
// the section the book sits in are DIFFERENT THINGS, and until today the
// button called both of them "Publisher". That is the same fault as a status
// line reading "Saved" on a download nobody watched: the claim was never
// earned, and she could only catch it by opening the link herself.
//
// So the label carries the difference. "Publisher" means the book's own page.
// "Publisher's section" means the link lands her in the right part of the
// publisher's site and the book is one scroll away — useful, and honestly
// described. A link from an older ledger has no kind recorded; it keeps the
// plain label, because inventing a claim about it either way would be worse
// than making none.
function publisherLinkLabel(kind){
  if(kind==="container")return "Publisher\u2019s section";
  if(kind==="site")return "Publisher\u2019s website";
  return "Publisher";
}

// THE SILENCE HAD TO END A SECOND TIME — her question, 22 Sep 2026.
//
// "No separate publisher page." was printed whether the step had searched the
// publisher’s own site and found nothing, or had never fired at all. Her
// words: the silence could be "search function didn’t even fire". So each
// outcome now says which one it was, in one plain sentence.
//
// THE LADDER IS DELIBERATE, weakest answer last and each rung honest about
// what it is: the book’s own page, then the section it sits in, then the
// publisher’s front door, then no publisher website at all, then no
// publisher name to go on. A row from an older ledger has no result recorded
// and keeps the old sentence, because inventing one for it would be a claim.
function publisherNote(result,hasUrl){
  if(result==="container")return "The publisher\u2019s link opens the section this book sits in, not a page of its own.";
  if(result==="site")     return "The publisher\u2019s own site doesn\u2019t show this book — the link opens their home page.";
  if(result==="nosite")   return "Couldn\u2019t work out the publisher\u2019s own website, so there\u2019s no link to it.";
  if(result==="unnamed")  return "No publisher was named for this book, so none was looked for.";
  if(result==="selfpublished")return "Catalogue is self-published by the venue.";
  if(result==="product")  return "";
  return hasUrl?"":"No separate publisher page.";
}


// ── A BOOK LEAVES THE SHOP, AND THAT IS THE WHOLE POINT OF THE APP ─────
// Her ruling, 22 Sep 2026, and she is right that the old screen could not say
// it: a row that was ever found in the museum shop went on reading "In the
// museum shop" forever, because nothing compared one lookup against the last.
// Catalogues selling out is the thing this app exists to watch, so the one
// event it most needs to show was the one it could not.
//
// THE LIMIT, which no design gets round: when she clicks the Museum shop
// button and sees for herself that the book has gone, the app learns NOTHING.
// A page cannot see what comes back in a tab it opened — a browser rule. So
// the status moves only when the app itself re-opens the page.
//
// THE 22 SEP DESIGN MOVED IT ON SEARCH AGAIN, AND THAT COULD NOT WORK. Search
// again searched the shop from scratch, and shops keep sold-out books listed,
// so the listing put the green straight back; it cost a whole lookup to ask
// one question; and it rebuilt the row, wiping what it did not re-find.
//
// HER DESIGN, 25 Sep — "Re-check museum shop". Reasoning in docs/app.md,
// "A book leaving the shop". Fixtures C-079 to C-099.
//
//   * ONE BUTTON MOVES THE SHOP STATUS: "Re-check museum shop". Nothing else.
//     Search again fills blanks and never touches it (keepWhatWeKnew).
//   * She presses it only AFTER she has seen the change for herself, so it is
//     a way to make the screen agree with what she saw, not a monitor.
//   * WITH A SHOP LINK ON FILE it re-reads THAT ONE PAGE, nothing else:
//       gone (404), sent elsewhere, or sold out → "No longer in the museum
//       shop.", red. The link STAYS, labelled "Museum shop (last seen)", in
//       case the book comes back there.
//       buyable again after being gone → "Back in the museum shop.", green.
//   * WITH NO SHOP LINK it runs the shop step alone — never the web search,
//     never the publisher — and a find reads "Now in the museum shop."
//   * NO HISTORY IS KEPT — her ruling. The status implies it: "No longer"
//     says it once was, "Back" says it went and returned.
//   * A CHECK THAT FAILED SAYS SO AND CHANGES NOTHING. A refused connector is
//     not evidence the book has gone.
//
// Pre-order and "available to order" count as in the shop; sold out, out of
// stock and unavailable count as gone, in any language — her yes, 25 Sep.
//
// shopState: "shop" | "gone" | "web" | "none" | null.  "gone" keeps shopUrl.
// shopChange: "now" | "back" | null on a "shop" row — how it got there.
// (The 22 Sep code could leave "gone" on a "web" row, with no link kept. That
// is read as plain "web" now: not in the shop, and no page to re-check.)

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

// The shop button's label. "(last seen)" is what tells her the page may be
// dead or sold out while the link is still worth keeping.
function shopLinkLabel(shopState){ return shopState==="gone"?"Museum shop (last seen)":"Museum shop"; }

// SEARCH AGAIN NEVER TAKES AWAY WHAT WAS THERE — her rule, 25 Sep. Until now it
// rebuilt the row from scratch, so a lookup that found less (the connector
// half-refusing, a shop reshuffling its shelf) wiped an ISBN and a publisher
// she had already had. Now:
//   * a known title, ISBN or publisher is kept; the new lookup only fills gaps;
//   * a known publisher LINK is kept together with what it is (publisherResult),
//     so the publisher never gets re-tangled — it has been messy before;
//   * the shop status and link are Re-check's alone, once there is one;
//   * a lookup finding nothing leaves a found catalogue exactly as it was.
// A row never searched, or searched and found nothing, has nothing to lose,
// so the new answer is taken whole.
function keepWhatWeKnew(prev,next){
  if(!prev||!prev.looked||prev.hasCatalogue!=="yes")return next;
  if(!next||next.hasCatalogue!=="yes")return prev;
  const out={...next};
  out.catalogueTitle=prev.catalogueTitle||next.catalogueTitle||null;
  out.isbn13=prev.isbn13||next.isbn13||null;
  out.publisher=prev.publisher||next.publisher||null;
  if(prev.publisherUrl){out.publisherUrl=prev.publisherUrl;out.publisherResult=prev.publisherResult??null;}
  if(prev.shopState){out.shopState=prev.shopState;out.shopUrl=prev.shopUrl??null;out.shopChange=prev.shopChange??null;}
  return out;
}

// CASE 2 — the shop step found the book where no shop link was on file.
// Fills blanks only, like everything else in the lookup. `o` is the read of
// the shop's pages; `onShop` was checked by the caller (the link must really
// be on the venue's shop). A catalogue the app had given up on becomes one.
function foundInShop(row,o){
  return{...row,looked:true,hasCatalogue:"yes",
    catalogueTitle:row.catalogueTitle||o.catalogueTitle||null,
    isbn13:row.isbn13||toIsbn13(o.isbn13),
    publisher:row.publisher||(o.publisher?String(o.publisher).trim():null)||null,
    shopState:"shop",shopChange:"now",shopUrl:o.shopUrl};
}

// CASES 1 AND 3 — re-read the ONE page on file. Returns
//   {ok:true,  row, said}  the status the page supports, and what to tell her
//   {ok:false, said}       the check did not happen; nothing may change
//
// A 404 OR 410 IS DECIDED IN CODE. The connector reports it as an error with
// the status code (seen live on the Met's store, 25 Sep), so no model is
// asked whether a missing page is missing. Every OTHER error, and a page that
// comes back with nothing on it, is a failed check — never "gone".
//
// Everything else is one question to Claude about one page: is THIS book for
// sale HERE, now? A redirect to the shop front is caught there, because the
// page served is then not the book's own page.
const GONE_HTTP=new Set([404,410]);
async function recheckLinkedPage(row){
  const book=row.catalogueTitle||row.title;
  const f=await fetchPage(row.shopUrl,
    "Whether the book “"+book+"” can be bought on this page now: its product page, price, "
      +"add to cart, pre-order, sold out, out of stock, unavailable.",
    [book+" add to cart sold out"]);
  if(!f.ok)return{ok:false,detail:f.detail,said:"Re-check didn’t run — "+f.detail.split("[")[0].trim()+" Nothing changed."};
  const dead=(f.errors||[]).find(e=>GONE_HTTP.has(Number(e&&e.http_status_code)));
  const hadIt=row.shopState==="shop";
  if(dead){
    return{ok:true,detail:f.detail+"\nThe shop answered "+dead.http_status_code+": that page no longer exists.",
      row:{...row,shopState:"gone",shopChange:null},
      said:hadIt?"Re-checked: that shop page no longer exists. Marked no longer in the museum shop."
                :"Re-checked: that shop page still doesn’t exist. Still no longer in the museum shop."};
  }
  if(!f.results.length||pageIsShell(f.results)){
    const why=(f.errors||[]).map(e=>String((e&&e.error_type)||"")+(e&&e.http_status_code?" "+e.http_status_code:"")).filter(Boolean).join(", ");
    return{ok:false,detail:f.detail+(why?"\n"+why:""),
      said:"Re-check didn’t work — the shop page couldn’t be read"+(why?" ("+why+")":"")+". Nothing changed."};
  }
  const served=f.results.map(r=>String((r&&r.url)||"")).filter(Boolean).join(" ");
  const rd=await readResults(
    "You are reading ONE page from a museum shop. Decide whether the book named below can be bought "
   +"on it NOW.\nUse ONLY what this page says.\n"
   +'"forSale": true ONLY if this page IS that book’s own product page AND it can be bought or '
   +"ordered now: add to cart or bag, buy now, pre-order, available to order.\n"
   +'"forSale": false if it says sold out, out of stock, unavailable, no longer available, or '
   +"not found, in any language (esaurito, épuisé, uitverkocht, ausverkauft, agotado …). "
   +"ALSO false if this page is NOT that book’s own page — the shop’s front page, a "
   +"category, search results or a different product. That is what a pulled page redirecting looks like.\n"
   +"\nBook: "+book+"\nAddress on file: "+row.shopUrl+"\nAddress served: "+(served||"(not given)")+"\n\n"
   +pageTextOf(f.results).slice(0,6000)
   +'\n\nReply with ONLY this JSON object and nothing else:\n{"forSale": true|false, "why": string}\n'
   +'Example: {"forSale":false,"why":"The page says Sold out."}');
  if(!rd.ok)return{ok:false,detail:f.detail+"\n"+rd.detail,said:"Re-check didn’t finish — "+rd.detail.split("[")[0].trim()+" Nothing changed."};
  const d=rd.data||{};
  if(typeof d.forSale!=="boolean")return{ok:false,detail:f.detail+"\n"+JSON.stringify(d),said:"Re-check didn’t finish — the answer came back unreadable. Nothing changed."};
  const why=String(d.why||"").trim();
  const detail=f.detail+"\n"+rd.detail+(why?"\n"+why:"");
  if(d.forSale){
    if(hadIt)return{ok:true,detail,row,said:"Re-checked: still for sale in the museum shop. Nothing changed."};
    return{ok:true,detail,row:{...row,shopState:"shop",shopChange:"back"},said:"Re-checked: back in the museum shop."};
  }
  return{ok:true,detail,row:{...row,shopState:"gone",shopChange:null},
    said:(hadIt?"Re-checked: no longer for sale in the museum shop.":"Re-checked: still not for sale in the museum shop.")+(why?" "+why:"")};
}

const SKEY="cw-v3";
// DORMANT in v8: Claude cloud save is kept in the file but nothing calls it.
// Drive is the single source of truth. Re-wire this only if Drive is retired.
async function safeSave(rows,lastRun,lastSaved){const data=JSON.stringify({rows,lastRun,lastSaved:lastSaved||new Date().toISOString()});for(let i=0;i<3;i++){try{const r=await window.storage.set(SKEY,data,false);if(r)return{ok:true};}catch{}await new Promise(r=>setTimeout(r,500*(i+1)));}return{ok:false};}

// ---- Google Drive spine (v8) ----------------------------------------------
// Ledger files are saved as cat-watch-ledger-<localstamp>.json. Newest loads
// on open; every save writes a NEW file (versioned backups, nothing deleted).
const DRIVE_MCP={type:"url",url:"https://drivemcp.googleapis.com/mcp/v1",name:"google-drive"};
const LEDGER_PREFIX="cat-watch-ledger-";
let AUTOLOAD_FIRED=false; // module-level: survives a strict-mode remount so open never costs two Drive calls

// Local 24hr timestamp (browser's timezone), e.g. 2026-08-23-2230 = 10:30pm local.
function localStamp(){const d=new Date(),p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes());}
function localReadable(){const d=new Date(),p=n=>String(n).padStart(2,"0");return p(d.getHours())+":"+p(d.getMinutes())+" "+p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear();}

// One instrumented call to Drive via the Anthropic API + MCP. Returns text + diagnostics.
async function askDrive(prompt){
  let res,raw;
  try{
    res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1500,messages:[{role:"user",content:prompt}],mcp_servers:[DRIVE_MCP]})});
  }catch(e){return{ok:false,usedTool:false,text:"",detail:"Could not reach Drive (network): "+(e&&e.message?e.message:String(e))};}
  if(!res.ok){raw=await res.text().catch(()=>"");return{ok:false,usedTool:false,text:"",detail:"HTTP "+res.status+" "+raw.slice(0,300)};}
  raw=await res.text();
  let data;try{data=JSON.parse(raw);}catch{return{ok:false,usedTool:false,text:"",detail:"Drive reply was not JSON."};}
  const blocks=Array.isArray(data.content)?data.content:[];
  const text=blocks.filter(b=>b.type==="text").map(b=>b.text).join("\n");
  const usedTool=blocks.some(b=>b.type==="mcp_tool_use");
  const toolErr=blocks.some(b=>b.type==="mcp_tool_result"&&b.is_error===true);
  return{ok:true,usedTool,toolErr,text,detail:"blocks: "+blocks.map(b=>b.type).join(", ")+"\n"+text.slice(0,400)};
}

// Pull the newest ledger JSON out of a Drive read reply.
function extractLedgerJson(text){
  if(!text)return null;
  let depth=0,start=-1,inStr=false,esc=false,best=null;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(inStr){if(esc)esc=false;else if(c==="\\")esc=true;else if(c==='"')inStr=false;continue;}
    if(c==='"')inStr=true;else if(c==="{"){if(depth===0)start=i;depth++;}
    else if(c==="}"){depth--;if(depth===0&&start!==-1){const chunk=text.slice(start,i+1);try{const o=JSON.parse(chunk);if(o&&Array.isArray(o.rows))best=o;}catch{}start=-1;}}}
  return best;
}

export default function App(){
  const[rows,setRows]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[busy,setBusy]=useState(false);
  const[busyId,setBusyId]=useState(null);
  const[lookPhase,setLookPhase]=useState(null); // DIAGNOSTIC: "shop"|"web"|null — which lookup step is running (revert to plain "Searching…" later)
  const[prog,setProg]=useState({done:0,total:0,label:""});
  const[error,setError]=useState(null);
  const[rechecking,setRechecking]=useState(false);   // which of the card's two buttons is running
  const[recheckSaid,setRecheckSaid]=useState(null);  // {id,text,failed}: Re-check's answer, shown on that card
  const[saveErr,setSaveErr]=useState(false);
  const[debug,setDebug]=useState(null);
  const[showDebug,setShowDebug]=useState(false);
  const[lastRun,setLastRun]=useState(null);
  // QUARANTINE — "this should never have been an entry". Not the same as
  // dismiss, which is for a REAL exhibition she has looked at and passed on.
  // Rejecting an Add card stores nothing, so junk returns on every future
  // sweep forever; accepting then dismissing puts junk in the ledger
  // permanently. This is the third outcome, and it is the only one that keeps
  // the ledger clean. Entries: {key, venueId, title, at}.
  // The MAP is what is stored (tombstones and all); the LIST is what she sees
  // and what the export carries. Deriving one from the other means they cannot
  // drift, which two pieces of state for one fact always eventually do.
  const[quarantine,setQuarantine]=useState({});
  const[quarWhy,setQuarWhy]=useState(null);
  const ignored=useMemo(()=>activeQuarantine(quarantine),[quarantine]);
  const ignoredByVenue=useMemo(()=>{
    const ord=id=>{ const i=MUSEUMS.findIndex(m=>m.id===id); return i<0?MUSEUMS.length:i; };
    return ignored.slice().sort((a,b)=>ord(a.venueId)-ord(b.venueId)||String(a.title||"").localeCompare(String(b.title||"")));
  },[ignored]);
  const[showIgnored,setShowIgnored]=useState(false);
  // PER-VENUE FRESHNESS, and it has to be TWO facts. One global lastRun cannot
  // say "artic was tried today and last gave us rows on 13 Sep", which is the
  // line that decides whether a solo re-run is worth it. Shape:
  //   { [venueId]: { attempted: iso, returned: iso|null } }
  const[venueSeen,setVenueSeen]=useState({});
  // THE ONE-LINE "LAST REFRESHED" IS DERIVED FROM THE SWEEP LOG, NOT STORED —
  // her finding, 21 Sep, caught by wiping the store and reloading her export.
  //
  // IT USED TO SHOW `lastRun`, WHICH WAS WRONG TWICE OVER. It was stamped at
  // the moment she pressed Apply, so it reported when she had last worked
  // rather than when a venue was last swept — the exact fault that produced
  // swept_at and this whole drawer on 20 Sep, left behind one line above the
  // thing built to replace it. And it rode inside the LEDGER, so loading an
  // older backup rolled the date back with it: a fact about the world kept in
  // a document that rolls back, which is the ruling this app already has.
  //
  // Taking the LATEST attempt across all venues keeps the headline honest and
  // costs nothing: the same store that fills the drawer fills this, so an
  // empty store reads "never" instead of asserting a time nothing swept at.
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
  const[firstTime,setFirstTime]=useState(false);
  const[dirty,setDirty]=useState(false);
  const[driveMsg,setDriveMsg]=useState(null);
  const[savedFile,setSavedFile]=useState(null);
  const[loadedInfo,setLoadedInfo]=useState(null);
  const[confirmBox,setConfirmBox]=useState(null); // {text, act} for confirm-before-replace
  const[driveState,setDriveState]=useState("idle");
  const driveStarted=useRef(false);
  const[,setTick]=useState(0);
  const[sortBy,setSortBy]=useState("date");
  const[venueF,setVenueF]=useState(new Set());
  const[timeF,setTimeF]=useState(new Set());
  const[acqWanted,setAcqWanted]=useState(false);
  const[acqOwned,setAcqOwned]=useState(false);
  const[acq3mo,setAcq3mo]=useState(false);
  const[acq6mo,setAcq6mo]=useState(false);
  const[acqNoCat,setAcqNoCat]=useState(false);
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
  // WHICH TRIAGE BANDS ARE OPEN. Most are empty on a healthy file, and the two
  // that are not need nothing from her, so a permanently expanded band is a
  // long scroll between her and the actual work. The default is set by WHAT A
  // BAND ASKS OF HER, never by its size: one she cannot act on opens closed
  // (markers, combined-for-you), one needing a look or a decision opens open.
  // The count sits on the header either way, so collapsing hides the cards and
  // never the fact that there are some.
  const[openBands,setOpenBands]=useState({});
  // WHICH VENUES ARE OPEN IN "NORMAL CASES". Same reasoning as the triage
  // bands: 320 cards is a long scroll, and she works one venue at a time.
  // Undefined means OPEN — the default is to show the work, not to hide it,
  // so a venue can never go unnoticed because the app closed it on her.
  // "Collapse all" writes false for every venue rather than flipping a single
  // master flag, so opening one venue afterwards does not reopen the rest.
  const[openVenues,setOpenVenues]=useState({});
  const[decisions,setDecisions]=useState({}); // proposal index -> "accept"|"reject"|"addnew"
  const[refreshDone,setRefreshDone]=useState(null); // {added,filled,changed} after applying
  const[refreshTouched,setRefreshTouched]=useState([]); // ids added/changed in the last refresh
  const[pinTouched,setPinTouched]=useState(false); // pin those ids to the top this session
  const[showTop,setShowTop]=useState(false); // show the return-to-top button once scrolled down
  // LIGHT OR DARK. Her choice is remembered in the browser, not in the ledger
  // and not in the page's store: it is a per-device convenience, and the right
  // answer on her laptop at 9pm is not necessarily the right one on another
  // screen. Browser storage can throw outright (private window, blocked site
  // data), so every touch is wrapped and the page renders fine without it.
  //
  // FIRST VISIT FOLLOWS THE OPERATING SYSTEM. If her machine is already in
  // dark mode the app opens dark, which is the whole point of asking at 9pm.
  // Once she picks, her pick wins on that device forever.
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
  // The page around the component paints its own background before React runs,
  // so it has to be told too — otherwise the margins stay cream around a dark
  // app. Also sets color-scheme, which is what makes scrollbars and form
  // controls follow.
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
    // v8.2 OPEN-EMPTY. The app is a workspace, like a word processor: it opens
    // showing nothing and waits for you to Import your ledger file. It does NOT
    // reach out to Google Drive or Claude storage on open. (The old Drive auto-load
    // routine is retired; its helper functions remain dormant below, uncalled.)
    setRows([]);
    setLoaded(true);
    // The sweep log is NOT part of the ledger, so it loads here rather than on
    // Import — it is there before any file is opened and it survives Reset.
    // Read ONCE, not subscribed: she is the only viewer and the only writer,
    // and a subscription in a component body is how a page ends up in a loop.
    readSweepLog().then(({log,why})=>{ setVenueSeen(log); setFreshWhy(why); });
    // Quarantine loads here too, and for the same reason: it is not part of the
    // ledger any more, so it has to be in force before any file is opened.
    readQuarantine().then(({map,why})=>{ setQuarantine(map); setQuarWhy(why); });
  },[]);

  // Keep the "Last saved ... ago" text and its colour current.
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),30000);return()=>clearInterval(t);},[]);

  // EDITS mark the ledger unsaved (dirty). Nothing is written until you Export / Save.
  const commit=useCallback(async(next,lr)=>{
    setRows(next);
    if(lr!==undefined)setLastRun(lr);
    setFirstTime(false);
    setDirty(true);
    
  },[]);

  // LOADS (Import, Reset) are NOT unsaved work. Freshly loaded data matches its
  // source, so there's nothing to lose yet. The unsaved warning only appears once
  // you actually change something.
  const loadLedger=useCallback((next,lr,info,extra)=>{
    setRows(next);
    setLastRun(lr!==undefined?lr:null);
    // A LEDGER'S QUARANTINE IS MERGED IN, NEVER SWITCHED TO. The file is the
    // backup copy; the page holds the working one. Latest decision wins, so an
    // old backup cannot re-block a row she has since released, and a backup
    // from another machine adds what it knows.
    const fromFile=quarantineFromList((extra&&extra.ignored)||[]);
    if(Object.keys(fromFile).length){
      setQuarantine(prev=>{ const merged=mergeQuarantine(prev,fromFile); writeQuarantine(merged); return merged; });
    }
    // venueSeen is DELIBERATELY not read from the file. It lives in the page's
    // own store now — see the sweep log note. Reading it here is exactly the
    // bug she found: loading a two-day-old backup dragged the sweep dates back
    // with it, as though opening an older document un-ran a sweep.
    setFirstTime(false);
    setDirty(false);
    
    setSavedFile(null);
    setUnconfirmedSave(null);
    setError(null);
    setLoadedInfo(info||null);
    setRefreshDone(null);
    setPinTouched(false); setRefreshTouched([]);
  },[]);

  // Write a NEW timestamped ledger copy to Drive. Never overwrites; nothing deleted.
  const saveToDrive=useCallback(async()=>{
    if(driveState==="saving")return;
    setDriveState("saving");setError(null);
    const fname=LEDGER_PREFIX+localStamp()+".json";
    const payload=JSON.stringify({rows,ignored,lastRun,savedAt:new Date().toISOString(),savedLocal:localReadable()});
    const prompt=
      "Using Google Drive, create a NEW file named \""+fname+"\" whose entire text content is exactly this JSON:\n"+
      payload+"\n"+
      "Do NOT overwrite, modify, or delete any existing file \u2014 always create a new file. "+
      "After saving, confirm the new file's name and its Drive file ID. Do not take any other action.";
    const r=await askDrive(prompt);
    if(r.ok&&r.usedTool&&!r.toolErr){
      setDirty(false);setDriveState("saved");
      setSavedFile(fname+"  ·  "+localReadable());
      setDebug("Save to Drive OK.\n"+r.detail);
    }else{
      setDriveState("savefail");
      setError("Save to Drive FAILED \u2014 your recent changes are NOT backed up. Try again, or use Export ledger to keep a local copy right now.");
      setDebug("Save to Drive FAILED.\n"+r.detail);
    }
  },[rows,ignored,lastRun,driveState]);
  const toggleSet=(setter,val)=>setter(prev=>{const n=new Set(prev);if(n.has(val))n.delete(val);else n.add(val);return n;});
  const clearFilters=()=>{setVenueF(new Set());setTimeF(new Set());setAcqWanted(false);setAcqOwned(false);setAcq3mo(false);setAcq6mo(false);setAcqNoCat(false);setShowAll(false);setDismissedOnly(false);setWatchedF(false);setSearch("");setShowSearch(false);};

  // WHAT A QUARANTINE REMEMBERS. The URL where there is one, because that is
  // the only key that cannot be wrong; venue + title where there is not,
  // accepting that a venue reusing a title would suppress the wrong row. The
  // cost of that is bounded and visible — the list is on screen and every
  // entry can be put back — whereas keying junk loosely and getting it wrong
  // silently is not.
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

  // ---- v9 REFRESH ENGINE ----
  // Reads a filled pro forma CSV, compares each row against the current ledger,
  // and produces a list of proposals to review one at a time. Nothing is applied
  // until "Go ahead and update the ledger". Anything the app can't use is not
  // dropped silently — it becomes a plain note on the proposal card.
  // The sentence the scraper stamps on every marker row, verbatim. A marker
  // reports a LISTING PAGE it could not read — it is not an exhibition and was
  // never a proposal. Until now the app had no idea, so each one became an
  // ordinary Add card titled "[past page]"; rejecting is not remembered, so the
  // same junk returned on every future sweep forever.
  //
  // Matched on the NOTES SENTINEL rather than the bracketed title. The scraper
  // writes this sentence at every marker site, so this is the producer saying
  // so — the strongest rung. A bracketed title is a guess about formatting, and
  // a real exhibition could carry brackets.
  const MARKER_SENTINEL = "Marker row, not an exhibition.";
  const isMarkerRow = note => String(note||"").trim().endsWith(MARKER_SENTINEL);

  // Which of two values to offer first when a stitched file disagrees with
  // itself. Her ruling: the FULLER one, clearly marked as a guess, with both
  // shown and one click to switch. Never silent, never irreversible.
  const fuller = (a,b) => (String(b||"").trim().length > String(a||"").trim().length) ? b : a;

  /**
   * Fold rows that are the same exhibition BEFORE anything is compared to the
   * ledger.
   *
   * One stitched file now carries every machine's output, so a venue swept in
   * two places appears twice — one copy with dates and no summary because its
   * detail page timed out, the other the reverse. analyzeProForma compares each
   * row against the LEDGER only, never against the row beside it, so both would
   * become separate Add cards for one exhibition.
   *
   * KEYED ON VENUE + URL, AND NOTHING ELSE. Same address is the same
   * exhibition, always, with no interpretation — the scraper's own rule.
   *
   * ROWS WITH NO URL ARE NEVER FOLDED. The only other key is the title, and
   * sameExhibition() matches on normalised title plus date overlap and returns
   * true whenever EITHER side lacks dates. That is fine against the ledger,
   * where she sees every proposal before it lands; here it would fire before
   * she sees anything, and a title collision would silently fuse two different
   * shows. That is the judgement that destroyed 29 National Gallery
   * exhibitions. An unfolded duplicate costs one extra card she can see.
   *
   * Nothing is invented and nothing is dropped: a group yields exactly one row,
   * built only from values that were in the file, and a genuine disagreement is
   * carried forward as a CHOICE rather than resolved here.
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

  function analyzeProForma(text,ignoredKeys){
    const table=csvParse(text);
    if(!table.length) return {error:"That file was empty."};
    const header=table[0].map(h=>String(h).trim().toLowerCase());
    const idx=n=>header.indexOf(n);
    if(idx("venue_code")<0||idx("title")<0) return {error:"That file doesn't look like a pro forma (no venue_code / title columns)."};
    const get=(r,n)=>{const j=idx(n);return j>=0?String(r[j]||"").trim():"";};
    const props=[];
    const coverage=[];   // marker rows: listing pages that could not be read
    const parsed=[];
    // WHICH VENUES THIS FILE TOUCHED, and whether they gave anything. Two
    // different facts: a venue can be in the sweep and hand back nothing but
    // marker rows, which is a refusal, not an absence. Read off the FILE, not
    // off her decisions — a row she rejects was still collected.
    // DATED BY THE SWEEP, NOT BY THIS MOMENT — her finding, 20 Sep. These used
    // to be bare sets, and applyRefresh stamped "now" against them, so the
    // drawer said a venue was tried at the instant she pressed Import. The file
    // now carries swept_at per ROW, so each venue keeps the LATEST time it was
    // seen. Per row and not per venue because a stitched file routinely holds
    // two runs of one venue — which is exactly the case the drawer is for: a
    // venue tried at 14:26 whose last real rows came at 02:04 is being refused.
    const attempted={}, returned={};
    const later=(a,b)=>(!a||(b&&b>a))?b:a;
    // COUNTS SHE CAN RECONCILE AGAINST THE FILE. A card total alone cannot be
    // checked against anything: rows vanish for three innocent reasons — a
    // marker row, a fold, an entry that already matches the ledger — and with
    // 652 rows arriving as 319 cards there is no way to tell those apart from
    // a row silently lost. Every row read is accounted for by one of these.
    let silent=0, blocked=0;
    // Rows the sweep should never have produced. Collected, then the whole file
    // is refused — see the note at the check itself.
    const faults=[];

    // ── PASS ONE: read the file. No comparison to anything yet. ──────────────
    // Split out because one stitched file now holds every machine's output, so
    // rows have to be reconciled against EACH OTHER before the ledger is
    // consulted at all.
    for(let k=1;k<table.length;k++){
      const r=table[k], line=k+1;
      const vc=get(r,"venue_code").toLowerCase();
      const title=get(r,"title");
      const rowNote=get(r,"notes");

      // A LISTING PAGE THAT COULD NOT BE READ IS NOT A PROPOSAL. It goes to the
      // coverage panel, where "we tried and were refused" is what it actually
      // says — rather than becoming an exhibition she rejects on every sweep.
      const sweptAt=get(r,"swept_at");
      if(KNOWN_VENUES.has(vc)) attempted[vc]=later(attempted[vc],sweptAt);
      if(isMarkerRow(rowNote)){
        coverage.push({venueId:KNOWN_VENUES.has(vc)?vc:null,venueShort:KNOWN_VENUES.has(vc)?MU[vc].short:(vc||"(blank)"),what:title||"(a listing page)",why:rowNote,url:get(r,"url"),line});
        continue;
      }
      if(KNOWN_VENUES.has(vc)&&title) returned[vc]=later(returned[vc],sweptAt);

      const notes=[];
      // A FAULTY ROW IS NOT HER PROBLEM — her ruling, 20 Sep 2026. A row with no
      // title or no venue code is a DATA FAULT: there is no such thing as an
      // exhibition with no name, and a row always came from somewhere, so a
      // missing code means the file is malformed. Neither can be resolved by
      // looking at a card, and the only outcome was ever "fix the sweep and
      // feed it again" — a message to the session, printed on her screen.
      //
      // They used to be a band of their own. Now the file is REFUSED whole, so
      // she never triages one, and `scraper/qc.js` stops it upstream: it runs
      // at the end of every sweep and gates compress --apply, so the file she
      // imports cannot contain one. This check stays as the last line, and it
      // says WHICH LINES so the session can fix them without asking her.
      if(!vc||!KNOWN_VENUES.has(vc)){ faults.push("line "+line+": venue code "+(vc?("\u201c"+vc+"\u201d"):"is blank")+(vc?" isn\u2019t one of the 21 venues":"")); continue; }
      if(!title){ faults.push("line "+line+": no exhibition title"+(get(r,"url")?" \u2014 "+get(r,"url"):"")); continue; }
      let sd=get(r,"start_date"), ed=get(r,"end_date"), url=get(r,"url");
      if(sd&&!isValidYMD(sd)){notes.push("Start date \u201c"+sd+"\u201d couldn't be read (needs YYYY-MM-DD) \u2014 left blank.");sd="";}
      if(ed&&!isValidYMD(ed)){notes.push("End date \u201c"+ed+"\u201d couldn't be read (needs YYYY-MM-DD) \u2014 left blank.");ed="";}
      if(url&&!urlLooksValid(url)){notes.push("Exhibition link \u201c"+url+"\u201d looks garbled \u2014 left blank.");url="";}
      // QUARANTINED — she has already said this should never be an entry.
      // Dropped here, before anything else looks at it, so it cannot fold with
      // a real row or reach the ledger comparison. Counted, never silent.
      if(ignoredKeys&&ignoredKeys.has(ignoreKeyFor(vc,url,title))){ blocked++; continue; }
      parsed.push({venueCode:vc,title,startDate:sd,endDate:ed,summary:get(r,"summary"),url,
                   rowNotes:rowNote?["Sweeper note: "+rowNote]:[],parseNotes:notes,line});
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
      // SAY WHEN ROWS WERE FOLDED. She is being shown one card for what was
      // several lines in the file, and that has to be visible or the count on
      // her approval pile will not match the file she fed in.
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
      // A CHANGED TITLE IS A CHANGE — her rulings, 23 Sep. Until then the
      // title was never compared, so a venue renaming a show was silently
      // ignored. Compared as written, spacing aside: a title that differs only
      // in capitals is a card too, because that is how a title recorded in
      // capitals is corrected in her ledger. She rejected masking capitals on
      // screen — it would hide a scraper fault forever — so the data is fixed,
      // and fixing it has to reach the ledger.
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

  // THE SWEEP LOG IS WRITTEN AT IMPORT, NOT AT APPLY — corrected 20 Sep, and
  // it is the half of her ruling I failed to carry through.
  //
  // It used to be written when she pressed "Go ahead and update the ledger",
  // on the reasoning that cancelling a review should leave no trace. That
  // reasoning was correct WHILE THE LOG LIVED IN THE LEDGER, where it was part
  // of the document. It is not part of the document any more. It is what this
  // page knows about the world, and reading a sweep file is the moment it
  // learns the sweep happened — whether or not she then accepts a single card.
  //
  // It also had a cost she found immediately: with the ledger gated on deciding
  // every card, seeing the drawer fill meant working 320 cards first. Now she
  // can import, look, and cancel.
  const recordSweep=(seen)=>{
    if(!seen) return;
    const vs=mergeSweepLog(venueSeen,seen);
    setVenueSeen(vs);
    writeSweepLog(vs).then(ok=>{ setFreshWhy(ok?null:"The sweep log couldn\u2019t be saved to this page\u2019s store, so it may reset when you reload."); });
  };

  function handleRefreshFile(e){
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      const res=analyzeProForma(String(reader.result||""),new Set(ignored.map(x=>x.key)));
      if(res.error){setError(res.error);return;}
      recordSweep(res.seen);
      if(!res.props.length){
        setCoverage(res.coverage||[]); setTally(res.tally||null); setSeenInFile(res.seen||null);
        setError("Read the refresh file, but nothing new to propose \u2014 your ledger already matches it."+((res.coverage||[]).length?" ("+res.coverage.length+" listing page"+(res.coverage.length===1?"":"s")+" couldn\u2019t be read \u2014 see below.)":""));
        return;
      }
      setError(null); setProposals(res.props); setCoverage(res.coverage||[]); setTally(res.tally||null); setSeenInFile(res.seen||null); setDecisions({});
    };
    reader.readAsText(file); e.target.value="";
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

  // PARTIAL IS A PARAMETER, NOT A SECOND COPY OF THIS FUNCTION. Applying what
  // she has decided and applying everything are the same walk over the same
  // cards — an undecided card was always skipped here, which is exactly what
  // made the 20 Sep gate necessary. The only difference is whether the gate
  // let her arrive, and how the result is reported afterwards.
  //
  // So `partial` changes NOTHING about what is written. It only counts what
  // was left behind, so the green bar can say so. Copying this function to
  // make a partial version would put the ledger write in two places, and the
  // second copy drifts.
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
    // The sweep log is NOT touched here. It was written the moment the file was
    // read — see recordSweep. Applying changes her ledger; it tells us nothing
    // new about when a venue was swept.
    // A NEW QUARANTINE GOES TO THE STORE, not into the ledger she is about to
    // commit. Her export still carries the list, but the copy that does the
    // blocking is the one that survives a Reset.
    if(newlyIgnored.length){
      const add={};
      for(const x of newlyIgnored) add[x.key]={venueId:x.venueId,title:x.title,at:x.at,state:"blocked"};
      setQuarantine(prev=>{ const merged=mergeQuarantine(prev,add);
        writeQuarantine(merged).then(ok=>{ if(!ok) setQuarWhy("The quarantine couldn\u2019t be saved to this page\u2019s store, so it may reset when you reload. Export to keep it."); });
        return merged; });
    }
    // COUNTED FROM THE CARDS, NOT FROM THE BUTTON. The figure that reaches the
    // green bar is re-derived here from the same function the gate uses, so the
    // sentence cannot claim a different number from the one she was just
    // looking at. A count handed in from the caller is a second copy.
    const leftUndecided=proposals.filter((p,i)=>isUndecidedCard(p,decisions[i])).length;
    commit(Array.from(byId.values()),new Date().toISOString());
    setProposals(null); setDecisions({}); setSeenInFile(null); setRefreshDone({added,filled,changed,never:newlyIgnored.length,left:partial?leftUndecided:0});
    setRefreshTouched(touched); setPinTouched(touched.length>0); // float just-changed entries to the top, this session
    setVenueF(new Set()); setTimeF(new Set()); setWatchedF(false);
    setAcqWanted(false); setAcqOwned(false); setAcq3mo(false); setAcq6mo(false); setAcqNoCat(false);
    setDismissedOnly(false); setShowAll(false); setSearch("");
  }
  function cancelRefresh(){ setProposals(null); setDecisions({}); setCoverage([]); setTally(null); setSeenInFile(null); }
  const pickSort=k=>{setSortBy(k);setPinTouched(false);}; // manual sort releases the pinned refresh group

  // refreshVenues() REMOVED 20 Sep 2026. It had the app gathering its own
  // exhibition data — rejected long ago and wired to no button since — and it
  // called askClaude(), which no longer exists. Dead code shaped like live code
  // is a trap for whoever debugs this next; git holds it.


  // Turn the connector's results into the few lines Claude is asked to read.
  // Trimmed hard: excerpts are long, and the prompt has a 64 KiB ceiling.
  // Trimmed hard for a SEARCH result, which is a headline and a line or two.
  // A shop page opened whole is a different size of thing \u2014 its product list
  // IS the answer \u2014 so step one raises the cap rather than cutting the list
  // off after the first few books.
  const resultsForPrompt=(list,cap)=>list.slice(0,8).map((r,i)=>
    (i+1)+". "+String(r.title||"(untitled)")+"\n   "+String(r.url||"")+"\n   "
    +(Array.isArray(r.excerpts)?r.excerpts.join(" ").replace(/\s+/g," ").slice(0,cap||700):"")
  ).join("\n\n");

  const READ_RULES=
    "You are reading real web search results to find the PRINTED EXHIBITION CATALOGUE for one exhibition.\n"
   +"Use ONLY what the results below actually say. Never use outside knowledge, never guess an ISBN, "
   +"never invent a shop page.\n"
   +"Give the ISBN EXACTLY as printed \u2014 a 10-digit one is wanted as it stands, never converted.\n"
   +"A catalogue is a BOOK about the exhibition. Tote bags, prints, postcards, mugs, notebooks and "
   +"generic gift items are NOT catalogues, even on the exhibition's own shop page.\n"
   +"THE ISBN IS OFTEN NOT IN THE SHOP. Museums routinely print the catalogue's title, publisher and "
   +"ISBN in a PRESS RELEASE or on the exhibition's own page, while the shop lists only souvenirs. "
   +"A press release stating the book counts as finding it.\n"
   +"Beware of unrelated books that merely share the exhibition's title \u2014 a classical text, a novel, "
   +"a textbook. The catalogue is the one tied to THIS exhibition at THIS venue.\n"
   +"publisherUrl is the PUBLISHER'S OWN page for this book \u2014 the art-book house that printed it, "
   +"not the museum shop, not a bookseller. Give it only if a result actually shows it; null otherwise.\n";

  const READ_SHAPE=
    "\nReply with ONLY this JSON object and nothing else:\n"
   +'{"found": true|false, "catalogueTitle": string|null, "isbn13": string|null, '
   +'"publisher": string|null, "publisherUrl": string|null, "shopUrl": string|null}\n'
   +'Example: {"found":true,"catalogueTitle":"Metamorphoses: Ovid and the Arts","isbn13":"9789493416543",'
   +'"publisher":"Hannibal Books","publisherUrl":"https://hannibalbooks.be/en/metamorphoses",'
   +'"shopUrl":null}\n'
   +'Set "found" false and every other field null when these results show no catalogue.';

  // TWO STAGES, HER DESIGN, UNCHANGED SINCE IT WAS TESTED.
  //
  // Stage one asks the venue's own shop and nothing else. Stage two, only if
  // the shop had nothing, looks wider. Nothing found in either means no
  // catalogue. The reason for the order is not cost, which is gone: a shop hit
  // is the only result that gives her a real "buy it here" link.
  //
  // THE SHOP LINK IS STILL CHECKED, and it stays checked now that step one
  // opens the shop directly. A shop page links outward — to a publisher, to a
  // distributor, to another shop — so a link read off a shop page is not
  // automatically ON that shop. A link that is not on the venue's shop is
  // never filed as being in the venue's shop.
  const settle=(row,o,dom,detail,fromShopStage)=>{
    const onShop=o.shopUrl&&dom&&String(o.shopUrl).toLowerCase().includes(String(dom).toLowerCase());
    if(o.found&&(o.catalogueTitle||o.isbn13)){
      // pageUrl is carried BESIDE the row, never in it: shopUrl is only filed
      // when the link is really on the venue's shop, and the ISBN step may
      // read a publisher's page too. Two different questions of one link.
      // The shop status is never CHANGED here — only "Re-check museum shop"
      // does that. keepWhatWeKnew hands a found row back with what it had, so
      // the steps after this one see the known ISBN and publisher and skip.
      return{ok:true,detail,pageUrl:o.shopUrl||null,
        row:keepWhatWeKnew(row,{...row,looked:true,hasCatalogue:"yes",
        shopState:onShop?"shop":"web",shopChange:null,
        catalogueTitle:o.catalogueTitle||null,isbn13:toIsbn13(o.isbn13),
        publisher:o.publisher||null,publisherUrl:cleanPublisherUrl(o.publisherUrl,dom),
        publisherResult:null,
        shopUrl:onShop?o.shopUrl:null})};
    }
    if(fromShopStage)return null;          // not found in the shop — go wider
    return{ok:true,detail,row:keepWhatWeKnew(row,{...row,looked:true,hasCatalogue:"no",shopState:"none",
      catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,publisherResult:null,
      shopUrl:null,shopChange:null})};
  };

  // ── FILLING A MISSING ISBN FROM THE PAGE ITSELF \u2014 her finding, 20 Sep 2026 ──
  //
  // Runs ONLY when a catalogue was found, a page link came with it, and no
  // ISBN did. It is not a third search: one page, read whole, because the
  // number is printed there and the search excerpt simply stopped short of it.
  //
  // IT CAN ONLY EVER FILL A BLANK. An ISBN already read from the search
  // results is never overwritten, and neither is a publisher we already have.
  // If the page yields nothing the row comes back exactly as it was \u2014 the
  // old answer, not a worse one.
  const PAGE_RULES=
    "You are reading ONE web page in full: the page selling or describing a printed exhibition "
   +"catalogue. Read the ISBN, publisher and author off THIS PAGE only.\n"
   +"Use ONLY what the page says. Never use outside knowledge and never guess an ISBN.\n"
   +"The number is usually in a details or specification list near the bottom, which on many shops "
   +"sits inside a collapsed panel \u2014 read it wherever it appears.\n"
   +"REPORT THE ISBN EXACTLY AS THE PAGE PRINTS IT. A 13-digit one starts 978 or 979; an older "
   +"book may show a 10-digit one instead, and that is wanted too \u2014 give it as it stands and "
   +"never convert it yourself.\n"
   +"publisherUrl is a link to the PUBLISHER'S OWN page for this book, if this page shows one. "
   +"A link to this shop, to Amazon or to another bookseller is NOT it \u2014 answer null.\n"
   +"If this page is not about the book named below, set every field null.\n";
  const PAGE_SHAPE=
    "\nReply with ONLY this JSON object and nothing else:\n"
   +'{"isbn13": string|null, "publisher": string|null, "publisherUrl": string|null}\n'
   +'Example: {"isbn13":"9781588398130","publisher":"The Metropolitan Museum of Art",'
   +'"publisherUrl":null}';

  // The page arrives as excerpts chosen against our objective. Capped, because
  // the prompt has a ceiling and a product page can be very long.
  const pageForPrompt=list=>list.slice(0,2).map(r=>
    String(r.title||"")+"\n"+String(r.url||"")+"\n"
    +(Array.isArray(r.excerpts)?r.excerpts.join("\n").replace(/[ \t]+/g," "):String(r.full_content||""))
  ).join("\n\n").slice(0,6000);

  const fillIsbn=async(hit,venue,dom)=>{
    if(!needsPageRead(hit))return hit;
    const r=hit.row;
    const book=r.catalogueTitle||r.title;
    setLookPhase("page");
    const f=await fetchPage(hit.pageUrl,
      "The ISBN-13, the publisher, and any link to the publisher\u2019s own page for the book "
        +"\u201c"+book+"\u201d, including any details or specification panel on the page.",
      [book+" ISBN publisher details"]);
    let detail=hit.detail+"\n"+f.detail;
    if(!f.ok)return{...hit,detail,trouble:f.detail};
    if(!f.results.length)return{...hit,detail};
    const rd=await readResults(PAGE_RULES
      +"\nBook: "+book+"\nExhibition venue: "+venue+"\n\n"
      +pageForPrompt(f.results)+PAGE_SHAPE);
    detail=detail+"\n"+rd.detail;
    if(!rd.ok)return{...hit,detail,trouble:rd.detail};
    const o=rd.data||{};
    const filled=applyIsbnFill(r,o,dom);
    detail=detail+(filled.isbn13?"\nISBN read off the page: "+filled.isbn13
                                :"\nNo ISBN on that page either.");
    return{...hit,detail,row:filled};
  };

  // \u2500\u2500 THE SHOP FOUND THE BOOK AND NOTHING ELSE \u2014 her finding, 21 Sep \u2500\u2500\u2500\u2500\u2500
  //
  // A REGRESSION THIS SESSION CAUSED, and worth writing down because the shape
  // repeats. Acquavella's page for its Matisse catalogue prints a title, a
  // price and the exhibition's dates \u2014 no ISBN, no publisher. While step one
  // was a general web search it picked the ISBN up from the publisher or a
  // bookseller; now that step one goes to the shop, finding the book there
  // ENDED the lookup and the wider search never ran. **Going to the right
  // place made the answer smaller.**
  //
  // So when the shop route leaves the ISBN blank, the wide search runs after
  // all. It is not "both stages every time", which is rejected: it fires only
  // on a catalogue that was found and is still missing its number.
  //
  // IT FILLS GAPS AND CANNOT DO ANYTHING ELSE. The book has already been
  // identified in the venue's own shop, so the title, the shop link and the
  // "in the museum shop" verdict all stand; only blank fields are written.
  // A wide search must never be able to rename or relocate a book the shop
  // already named.
  const fillFromWeb=async(hit,venue,dom)=>{
    const r=hit&&hit.row;
    if(!r||!hit.ok||r.hasCatalogue!=="yes"||r.isbn13)return hit;
    const book=r.catalogueTitle||r.title;
    setLookPhase("web");
    const s3=await searchWeb(
      "The ISBN-13 and publisher of the printed exhibition catalogue \u201c"+book+"\u201d"
        +(r.publisher?", published by "+r.publisher:"")+", for the exhibition at "+venue+".",
      [book+" "+(r.publisher||"")+" ISBN",
       book+" exhibition catalogue ISBN",
       book+" catalogue publisher"]);
    let detail=hit.detail+"\n"+s3.detail;
    if(!s3.ok)return{...hit,detail,trouble:s3.detail};
    if(!s3.results.length)return{...hit,detail};
    const rd=await readResults(PAGE_RULES
      +"\nBook: "+book+"\nExhibition venue: "+venue
      +"\nThese are web search results about THIS book. Read its ISBN and publisher off them. "
      +"If they are about a different book, answer null.\n\n"
      +resultsForPrompt(s3.results)+PAGE_SHAPE);
    detail=detail+"\n"+rd.detail;
    if(!rd.ok)return{...hit,detail,trouble:rd.detail};
    const filled=applyIsbnFill(r,rd.data||{},dom);
    detail=detail+(filled.isbn13?"\nISBN found on the wider web: "+filled.isbn13
                                :"\nNo ISBN anywhere for this one.");
    return{...hit,detail,row:filled};
  };

  // \u2500\u2500 THE PUBLISHER\u2019S PAGE, LOOKED FOR PROPERLY \u2014 her ruling, 21 Sep \u2500\u2500\u2500\u2500
  //
  // The earlier steps find it only BY LUCK. When step two searches, the
  // publisher is not known yet, so not one of its queries can name the
  // publisher\u2019s website \u2014 Hannibal Books is stated all over the Rijksmuseum\u2019s
  // press kit for Metamorphoses, and Hannibal\u2019s own site never appeared.
  //
  // So once the NAME is known, ask for the page by name. It fires only when a
  // catalogue was found, its publisher is known, and no page came with it \u2014
  // never to second-guess a link an earlier step already produced.
  //
  // WHY IT IS WORTH A SEARCH OF ITS OWN: the museum shop sells the book while
  // the show is on, and the art-book house that printed it often lists it long
  // after the shop has sold out. That is the window this whole app is about.
  // BEFORE CHANGING THE LOOKUP CHAIN, READ docs/app.md SECTION 1. Four rebuilds
  // are recorded there: why stage one must OPEN the shop rather than search for
  // it, why a search result is opened before being believed, why each step fills
  // a blank and can do nothing else, and why every step after the first stays
  // conditional (every page read runs on her allowance).
  const fillPublisherPage=async(hit,venue,dom)=>{
    const r=hit&&hit.row;
    if(!r||!hit.ok||r.hasCatalogue!=="yes"||r.publisherUrl)return hit;
    // NO NAME, SO NOTHING WAS LOOKED FOR — and the card must say that rather
    // than print the same sentence as a search that ran and found nothing.
    if(!r.publisher)return{...hit,row:{...r,publisherResult:"unnamed"}};
    // A NAMED MUSEUM PUBLISHING ARM — no searches at all. See SELF_PUBLISHERS.
    if(isSelfPublisher(r.publisher)){
      return{...hit,detail:hit.detail+"\n"+r.publisher+" is a museum’s own imprint — no publisher page to look for.",
        row:{...r,publisherResult:"selfpublished"}};
    }
    const book=r.catalogueTitle||r.title;
    const isbn=cleanIsbn(r.isbn13);
    setLookPhase("publisher");

    // ── FIRST, WHERE IS THE PUBLISHER ──────────────────────────
    // One search for the NAME alone. A publisher’s own site is the top answer
    // for its own name, and the domain is then read off the results in code.
    const d1=await searchWeb(
      "The official website of the art-book publisher “"+r.publisher+"”.",
      [r.publisher, r.publisher+" art book publisher"]);
    let detail=hit.detail+"\n"+d1.detail;
    if(!d1.ok)return{...hit,detail,trouble:d1.detail};
    const pubHost=publisherDomainFrom(d1.results,r.publisher);
    if(!pubHost)return{...hit,detail:detail+"\nCouldn’t identify the publisher’s own website.",
      row:{...r,publisherResult:"nosite"}};

    // FROM HERE THE PUBLISHER IS KNOWN, so the weakest honest answer is their
    // own front door. Every branch below either beats it or falls back to it.
    const home="https://"+pubHost+"/";
    const onlyTheSite=why=>({...hit,detail:detail+"\n"+why,
      row:{...r,publisherUrl:home,publisherResult:"site"}});

    // ── THEN SEARCH INSIDE IT, exactly as step one searches inside the shop ──
    const sp=await searchWeb(
      "The page on "+pubHost+" for the book “"+book+"”"+(isbn?", ISBN "+isbn:"")+".",
      isbn?["site:"+pubHost+" "+book,"site:"+pubHost+" "+isbn,"site:"+pubHost+" "+book.split(/[:–—-]/)[0].trim()]
          :["site:"+pubHost+" "+book,"site:"+pubHost+" "+book.split(/[:–—-]/)[0].trim()]);
    detail=detail+"\n"+sp.detail;
    if(!sp.ok)return{...hit,detail,trouble:sp.detail};
    const onSite=(sp.results||[]).filter(x=>{try{return new URL(x.url).hostname.toLowerCase()===pubHost;}catch{return false;}});
    if(!onSite.length)return onlyTheSite("Nothing for this book on "+pubHost+".");

    // ── TWO CANDIDATES, NOT ONE — her question, 22 Sep ──────────────
    //
    // She asked what happens when the page we open turns out to have nothing
    // to do with the book: did the model simply pick the wrong one of the
    // eight results, and should we go back for another? Yes — and going back
    // costs NO NEW SEARCH, because the results are already in hand. It is one
    // more page opened, nothing else.
    //
    // WHAT BOUNDS IT IS THE LIST, NOT A COUNTER. The read hands back an
    // ordered short list and the code walks it. Two is the cap and it is
    // stated here rather than tuned: the results came back RANKED, so if the
    // best two are both wrong the site does not have the book, and a third
    // opening is spending her allowance on hope. The fallback below is better
    // than a lucky third guess because it cannot be wrong.
    const rd=await readResults(
      "These are pages from ONE publisher’s own website. Put them in order, best first, "
     +"by how likely each is to BE the page for this book or to LEAD to it.\n"
     +"A book’s own page beats a list or a section of many books, which beats anything else. "
     +"Give at most two, and give none at all if nothing here relates to this book.\n"
     +"Use ONLY these results. Never invent a link.\n"
     +"\nBook: "+book+(isbn?"\nISBN: "+isbn:"")+"\nPublisher: "+r.publisher
     +"\nExhibition venue: "+venue+"\n\n"
     +resultsForPrompt(onSite)
     +"\nReply with ONLY this JSON object and nothing else:\n"
     +'{"candidates": [string]}\n'
     +'Example: {"candidates":["https://hannibalbooks.be/en/fine-art","https://hannibalbooks.be/en/new"]}');
    detail=detail+"\n"+rd.detail;
    if(!rd.ok)return{...hit,detail,trouble:rd.detail};
    const raw=Array.isArray((rd.data||{}).candidates)?rd.data.candidates:[];
    const candidates=[];
    for(const c of raw){
      const u=cleanPublisherUrl(c,dom);
      if(u&&!candidates.some(x=>sameAddress(x,u)))candidates.push(u);
      if(candidates.length>=2)break;
    }
    if(!candidates.length)return onlyTheSite("No page for this book on "+pubHost+".");

    // ── NOW OPEN THEM. WHAT SEARCH HANDS BACK IS A GUESS, NOT AN ANSWER ──
    //
    // This is the step that was missing until 22 Sep, and its absence is why
    // Rizzoli read as a success and Hannibal read as a success while one was
    // the book and the other was a whole section of books. Search cannot tell
    // us which it got, because the difference is INSIDE the page.
    for(let i=0;i<candidates.length;i++){
      const candidate=candidates[i];
      const fp=await fetchPage(candidate,
        "Whether this page is the book “"+book+"” itself, and any link on it to that book.",
        [book,isbn||book]);
      detail=detail+"\n"+fp.detail;
      if(!fp.ok)return{...hit,detail,trouble:fp.detail};

      // THE SHELL CASE, AND IT IS THE HONEST FLOOR. Hannibal draws its book
      // list by script after the page arrives, so the reader gets a sort
      // control and a newsletter box. We cannot see the book and we must not
      // pretend we looked: the link is kept, and kept LABELLED as the section.
      if(pageIsShell(fp.results)){
        return{...hit,detail:detail+"\nThat page came back empty — kept as the publisher’s section, not the book’s own page.",
          row:{...r,publisherUrl:candidate,publisherResult:"container"}};
      }

      const vr=await readResults(
        "You are reading ONE page from a publisher’s own website, in full. Decide what it is.\n"
       +"Use ONLY what this page says. Never use outside knowledge and never invent a link.\n"
       +'"book"    — this page IS about the book named below: it is that book’s own page.\n'
       +'"listing" — this page lists or advertises several books. If one of them is the book '
       +"below, give ITS link in bookUrl, copied exactly from this page; otherwise bookUrl null.\n"
       +'"other"   — this page has nothing to do with this book or this publisher’s books.\n'
       +"MATCH ON THE ISBN WHERE THERE IS ONE. A publisher may carry the same book in two "
       +"languages, with two links and two numbers, and the titles will not tell them apart.\n"
       +"\nBook: "+book+(isbn?"\nISBN: "+isbn:"")+"\nPublisher: "+r.publisher+"\n\n"
       +pageForPrompt(fp.results)
       +"\nReply with ONLY this JSON object and nothing else:\n"
       +'{"kind": "book"|"listing"|"other", "bookUrl": string|null}\n'
       +'Example: {"kind":"listing","bookUrl":"https://hannibalbooks.be/en/metamorfosen-ovidius-en-de-kunsten#102642"}');
      detail=detail+"\n"+vr.detail;
      if(!vr.ok)return{...hit,detail,trouble:vr.detail};
      const kind=String((vr.data||{}).kind||"");

      if(kind==="book"){
        detail=detail+"\nPublisher’s page for the book: "+candidate;
        return{...hit,detail,row:{...r,publisherUrl:candidate,publisherResult:"product"}};
      }
      if(kind==="listing"){
        // The deep link is checked, not trusted: it must be on the publisher's
        // own host and it must not be the listing we are standing on.
        const deep=deepLinkOn((vr.data||{}).bookUrl,pubHost,candidate);
        if(deep){
          detail=detail+"\nBook’s own page, read off the publisher’s list: "+deep;
          return{...hit,detail,row:{...r,publisherUrl:deep,publisherResult:"product"}};
        }
        detail=detail+"\nThe publisher lists books here but gives this one no page of its own — kept as the section.";
        return{...hit,detail,row:{...r,publisherUrl:candidate,publisherResult:"container"}};
      }
      // "other" — the search matched something that is not this book at all.
      // Try the next candidate if there is one; otherwise fall to the site.
      detail=detail+"\nThat page is not about this book."
        +(i+1<candidates.length?" Trying the next result.":"");
    }
    return onlyTheSite("None of the pages on "+pubHost+" was this book.");
  };

  // STAGE ONE ON ITS OWN: open the venue's shop pages and read the book off
  // them. Used by the lookup, and ALONE by "Re-check museum shop" when no shop
  // link is on file — one copy of the step, so the two cannot drift.
  // Returns {ran:false} for a venue with no shop; otherwise {ran, ok, detail,
  // data} where data is the read, or null when the pages came back empty.
  async function shopStep(row){
    const mu=MU[row.museumId];
    const dom=shopDomain(mu);
    const title=String(row.title||"").trim();
    const venue=mu?mu.name:"";
    const shopPages=shopPagesFor(mu,title);
    if(!dom||!shopPages.length)return{ran:false,ok:false,detail:"",data:null};
    setLookPhase("shop");
    const s1=await fetchPage(shopPages,
      "The printed exhibition catalogue for “"+title+"”: the book’s own product page "
        +"on this shop, its full title and its price.",
      [title+" exhibition catalogue book"]);
    if(!s1.ok)return{ran:true,ok:false,detail:s1.detail,data:null};
    if(!s1.results.length)return{ran:true,ok:true,detail:s1.detail,data:null};
    const r1=await readResults(READ_RULES
      +"\nExhibition: "+title+"\nVenue: "+venue
      +"\nBelow are the venue’s OWN shop pages, opened directly at "+dom
      +". THE LINK YOU RETURN MUST BE THE BOOK’S OWN PRODUCT PAGE. A page listing many "
      +"catalogues, a category page or a search-results page is NOT the book — take the "
      +"one link on it that names this exhibition. If nothing on these pages is this "
      +"exhibition’s catalogue, answer found false.\n\n"
      +resultsForPrompt(s1.results,6000)+READ_SHAPE);
    const detail=s1.detail+"\n"+r1.detail;
    if(!r1.ok)return{ran:true,ok:false,detail,data:null};
    return{ran:true,ok:true,detail,data:r1.data||{}};
  }

  async function lookupCat(row){
    const mu=MU[row.museumId];
    const dom=shopDomain(mu);
    const title=String(row.title||"").trim();
    const venue=mu?mu.name:"";
    let detail="";

    // ── Stage one: GO TO THE SHOP ───────────────────────────────
    //
    // HER DESIGN, AND UNTIL 21 SEP 2026 IT WAS NOT WHAT THE CODE DID. The old
    // tool took a locked list of websites and could not look anywhere else, so
    // a search "at the shop" really was at the shop. The connector that
    // replaced it has no lock — only a site: hint inside a query — and the
    // rebuild kept the search and lost the lock. Step one became a general web
    // search dragging the shop's address along with it.
    //
    // WHAT THAT COST, her finding: the National Gallery's Zurbaran. A general
    // index ranks the shop's LIST of every catalogue above the one book's own
    // page, so the read ran perfectly on a list, reported no ISBN, and filed
    // the list as her "Museum shop" link. The book's own page was in the same
    // results, five places down, printing the ISBN in plain sight.
    //
    // So step one OPENS the shop's own pages now. That is what she does by
    // hand, and a shop's own search box knows what "catalogue" means at that
    // shop, which no general index does. Only step two searches the open web,
    // because "does this book exist anywhere" really is a search.
    const s1=await shopStep(row);
    if(s1.ran){
      detail=s1.detail;
      if(!s1.ok)return{row,detail,ok:false};
      if(s1.data){
        const hit=settle(row,s1.data,dom,detail,true);
        if(hit)return await fillPublisherPage(await fillFromWeb(await fillIsbn(hit,venue,dom),venue,dom),venue,dom);
      }
    }

    // ── Stage two: wider, only because the shop had nothing ─────────────────
    setLookPhase("web");
    const s2=await searchWeb(
      "Confirm whether a printed catalogue was published for the exhibition \u201c"+title+"\u201d at "
        +venue+", and give its exact title, ISBN-13 and publisher. Museums often state these in a "
        +"press release; art-book publishers and booksellers list them too.",
      [title+" exhibition catalogue ISBN publisher",
       venue+" "+title+" catalogue book",
       venue+" "+title+" press release catalogue"]);
    detail=(detail?detail+"\n":"")+s2.detail;
    if(!s2.ok)return{row,detail,ok:false};
    if(!s2.results.length)return settle(row,{},dom,detail,false);
    const r2=await readResults(READ_RULES
      +"\nExhibition: "+title+"\nVenue: "+venue+(dom?"\nIts shop is at "+dom:"")+"\n\n"
      +resultsForPrompt(s2.results)+READ_SHAPE);
    detail=detail+"\n"+r2.detail;
    if(!r2.ok)return{row,detail,ok:false};
    return await fillPublisherPage(await fillIsbn(settle(row,r2.data||{},dom,detail,false),venue,dom),venue,dom);
  }

  // A STEP THAT DIED IS NOT AN ANSWER \u2014 her question, 21 Sep, and the fault was
  // mine. Steps one and two fail the whole lookup and say so. The three later
  // steps \u2014 reading the book\u2019s page, filling a missing ISBN, finding the
  // publisher\u2019s page \u2014 were written to give back the row UNCHANGED when they
  // fail, which is right for the row and wrong for the screen: the card then
  // printed "ISBN not confirmed" and "No separate publisher page." as though
  // those were findings. The connector\u2019s free tier rate-limits, so this is not
  // hypothetical.
  //
  // They now carry WHY, and it is shown the moment it happens. It is not stored
  // in the ledger: it is a fact about one attempt, not about the book, and the
  // remedy is simply to press Search again.
  async function findOneCat(id){
    setBusy(true);setBusyId(id);setError(null);setRecheckSaid(null);
    const row=rows.find(r=>r.id===id);
    const out=await lookupCat(row);
    setDebug(out.detail);
    if(out.ok){
      await commit(rows.map(r=>r.id===id?out.row:r));
      if(out.trouble)setError("Found the catalogue for \u201c"+row.title+"\u201d, but the search "
        +"stopped part-way, so the ISBN or the publisher\u2019s page may be missing when they "
        +"exist. "+out.trouble.split("[")[0].trim()+" Press \u201cSearch again\u201d.");
    } else setError("Catalogue search failed for \u201c"+row.title+"\u201d.");
    setBusy(false);setBusyId(null);setLookPhase(null);
  }

  // "RE-CHECK MUSEUM SHOP" — her design, 25 Sep. The design and its reasons are
  // at shopHeadline, top of file. With a shop link on file it reads that one
  // page (recheckLinkedPage); with none it runs the shop step alone. Its answer
  // is printed ON THE CARD, under the button she pressed, not in the banner at
  // the top of the page — she is looking at the card.
  async function recheckShop(id){
    setBusy(true);setBusyId(id);setRechecking(true);setError(null);setRecheckSaid(null);
    const row=rows.find(r=>r.id===id);
    let out;
    if(row.shopUrl&&(row.shopState==="shop"||row.shopState==="gone")){
      setLookPhase("recheck");
      out=await recheckLinkedPage(row);
    } else {
      const s=await shopStep(row);
      const dom=shopDomain(MU[row.museumId]);
      const o=s.data||{};
      const onShop=o.shopUrl&&dom&&String(o.shopUrl).toLowerCase().includes(String(dom).toLowerCase());
      if(!s.ran)out={ok:false,detail:"",said:"This museum has no shop on file, so there is nothing to re-check."};
      else if(!s.ok)out={ok:false,detail:s.detail,said:"Re-check didn’t run — "+s.detail.split("\n").pop().split("[")[0].trim()+" Nothing changed."};
      else if(o.found&&(o.catalogueTitle||o.isbn13)&&onShop){
        // Reading the book's page for a blank ISBN is part of the shop step —
        // the page IS the shop's. Web search and the publisher are never run.
        const hit=await fillIsbn({ok:true,detail:s.detail,pageUrl:o.shopUrl,row:foundInShop(row,o)},
          MU[row.museumId]?.name||"",dom);
        out={ok:true,detail:hit.detail,row:hit.row,said:"Re-checked: now in the museum shop."};
      }
      else out={ok:true,detail:s.detail,row,said:"Re-checked the museum shop: this book isn’t there."};
    }
    setDebug(out.detail||null);
    if(out.ok&&out.row&&out.row!==row)await commit(rows.map(r=>r.id===id?out.row:r));
    setRecheckSaid({id,text:out.said,failed:!out.ok});
    setBusy(false);setBusyId(null);setRechecking(false);setLookPhase(null);
  }

  async function findWantedCats(){const targets=rows.filter(r=>r.acquiring==="yes"&&!r.looked&&r.interested);if(!targets.length)return;setBusy(true);setError(null);let next=[...rows];for(let i=0;i<targets.length;i++){setProg({done:i,total:targets.length,label:targets[i].title});const out=await lookupCat(targets[i]);if(out.ok){next=next.map(r=>r.id===out.row.id?out.row:r);setRows(next);}if(i===0)setDebug(out.detail);}await commit(next);setProg({done:targets.length,total:targets.length,label:"Done"});setBusy(false);setLookPhase(null);}

  const dismiss=id=>{commit(rows.map(r=>r.id===id?{...r,interested:false}:r));if(undoTimer.current)clearTimeout(undoTimer.current);setUndo({id});undoTimer.current=setTimeout(()=>setUndo(null),10000);};
  const undoDismiss=()=>{if(!undo)return;commit(rows.map(r=>r.id===undo.id?{...r,interested:true}:r));setUndo(null);if(undoTimer.current)clearTimeout(undoTimer.current);};
  const restore=id=>commit(rows.map(r=>r.id===id?{...r,interested:true}:r));
  const toggleWatch=id=>commit(rows.map(r=>r.id===id?{...r,watching:!r.watching}:r));
  const setAcq=(id,v)=>commit(rows.map(r=>r.id===id?{...r,acquiring:r.acquiring===v?null:v}:r));

  function handleImport(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);if(d&&Array.isArray(d.rows)){loadLedger(d.rows.map(r=>({...r,watching:r.watching||false})),d.lastRun||null,"Loaded "+d.rows.length+" exhibitions from your file \u2014 no edits yet.",{ignored:Array.isArray(d.ignored)?d.ignored:[]});setDebug("Imported "+d.rows.length+" exhibitions from your file. It matches your file, so it's not counted as unsaved until you change something.");}else{setError("That file didn't contain a ledger (no entries found).");}}catch{setError("Could not read that file \u2014 it may not be a valid ledger backup.");}};reader.readAsText(file);e.target.value="";}

  // Confirm-before-replace: Import and Reset can wipe the screen in one tap, so
  // they ask first WHENEVER there is unsaved work showing.
  const openFilePicker=()=>fileRef.current?.click();
  function requestImport(){
    if(rows.length>0&&dirty){setConfirmBox({text:"Importing replaces everything on screen, and you haven't exported these changes yet. They will be lost. Continue?",act:openFilePicker});}
    else openFilePicker();
  }
  const doReset=()=>{const seed=buildSeed();loadLedger(seed,null,"Starter set loaded ("+seed.length+" exhibitions) \u2014 not saved to a file.");setDebug("Reset: loaded the built-in starter set ("+seed.length+" exhibitions). It isn't in any file \u2014 Export / Save if you want to keep it.");};
  function requestReset(){
    if(rows.length>0&&dirty){setConfirmBox({text:"This loads the built-in starter set and replaces everything on screen, which you haven't exported. Those changes will be lost. Continue?",act:doReset});}
    else doReset();
  }

  // SAVING MUST NOT DEPEND ON THE SANDBOX ALLOWING A DOWNLOAD — 20 Sep 2026.
  //
  // It did, and the viewer withdrew the permission: "File downloads aren't
  // available for this artifact." That took away THE ONLY ROUTE HER LEDGER HAD
  // OUT OF THE APP, and the app said "Saved — safe to close" while it happened,
  // because the old code treated clicking a link as evidence a file arrived.
  //
  // Two routes now, in order, and the difference between them is what is known:
  //
  //   1. The runtime's own file handoff. It asks her and then either SAVES or
  //      REJECTS, so for the first time there is a real answer to hold the
  //      green tick to.
  //   2. An ordinary browser download, for a plain page or an older viewer.
  //      This one cannot tell a finished download from a cancelled one from a
  //      sandbox that refused silently — so it DOES NOT CLEAR THE UNSAVED
  //      WARNING. Not knowing is reported as not knowing.
  //
  // The guide records her accepting a dishonest tick because Claude's download
  // prompt had a Cancel the app could not see. That premise is gone on route 1.
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

  const wantedUnlooked=useMemo(()=>rows.filter(r=>r.acquiring==="yes"&&!r.looked&&r.interested).length,[rows]);

  const view=useMemo(()=>{
    const sq=search.toLowerCase().trim();
    let out=rows.filter(r=>{
      if(sq)return r.title.toLowerCase().includes(sq)||r.summary.toLowerCase().includes(sq)||(MU[r.museumId]?.name||"").toLowerCase().includes(sq);
      // DISMISSED NARROWS, IT DOES NOT END THE CHECK — her finding, 24 Sep.
      // It returned here, so a venue (or any other) filter beside it was
      // never asked: Dismissed + Menil showed every venue's dismissed rows.
      if(dismissedOnly){ if(r.interested)return false; }
      else if(!r.interested&&!showAll)return false;
      if(venueF.size>0&&!venueF.has(r.museumId))return false;
      const t=tierFor(r),ts=TIERS[t]?.time||"current";
      if(timeF.size>0){let match=timeF.has(ts);if(timeF.has("recent")&&t==="recent")match=true;if(timeF.has("current")&&t==="recent")match=true;if(!match)return false;}
      if(watchedF&&!r.watching)return false;
      // Acquiring filters stack as AND across the three axes, OR within an axis.
      if(acqWanted||acqOwned){if(!((acqWanted&&r.acquiring==="yes")||(acqOwned&&r.acquiring==="acquired")))return false;}
      if(acq3mo||acq6mo){if(!((acq3mo&&t==="closing")||(acq6mo&&(t==="urgent"||t==="lapsed"))))return false;}
      if(acqNoCat){if(!(r.looked&&r.hasCatalogue==="no"))return false;}
      return true;
    });
    out.sort((a,b)=>{
      if(pinTouched){const aT=refreshTouched.includes(a.id)?0:1,bT=refreshTouched.includes(b.id)?0:1;if(aT!==bT)return aT-bT;}
      if(sortBy==="added"){const d=String(b.addedAt||"").localeCompare(String(a.addedAt||""));if(d!==0)return d;}
      if(sortBy==="edited"){const d=String(b.editedAt||"").localeCompare(String(a.editedAt||""));if(d!==0)return d;if(!a.editedAt&&!b.editedAt){const aH=a.addedAt?1:0,bH=b.addedAt?1:0;if(aH!==bH)return bH-aH;}}
      if(sortBy==="venue"){const d=MUSEUMS.findIndex(m=>m.id===a.museumId)-MUSEUMS.findIndex(m=>m.id===b.museumId);if(d!==0)return d;}
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
  },[rows,sortBy,venueF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqNoCat,showAll,dismissedOnly,watchedF,search,pinTouched,refreshTouched]);

  const counts=useMemo(()=>{const c={total:rows.length,dismissed:0,wanted:0,owned:0,pressing:0};for(const r of rows){if(!r.interested){c.dismissed++;continue;}if(r.acquiring==="yes")c.wanted++;if(r.acquiring==="acquired")c.owned++;const t=tierFor(r);if((t==="closing"||t==="urgent")&&r.acquiring!=="no"&&r.acquiring!=="acquired"&&r.hasCatalogue!=="no")c.pressing++;}return c;},[rows]);

  // ── TWO PALETTES, ONE SET OF NAMES — dark added 20 Sep 2026, her request:
  //    "it's 9pm and this cream background with light grey text is v difficult
  //    to read."
  //
  // EVERY COLOUR THE APP PAINTS COMES FROM HERE OR FROM TIER_SETS. Hexes had
  // been scattered through the render — drawer grounds, banner washes, one-off
  // button inks — and each one left behind would have been a cream patch on a
  // dark page. They are all named now, which is the only way a second theme
  // can be trusted.
  //
  // THE DARK SET IS NOT THE LIGHT SET INVERTED. Pure white on pure black is
  // harsh for long reading, and this is a screen she works down for an hour at
  // a time, so the ground is a warm near-black and the text a warm off-white.
  // `soft` is deliberately LIGHTER than a plain inversion would make it: her
  // complaint was grey-on-cream, and the same mistake is easy to repeat in the
  // other direction.
  const PALETTES={
    light:{bg:"#E8E4DE",card:"#F5F2ED",ink:"#1E1B18",soft:"#78736C",rule:"#CBC5BB",
           action:"#2D4A3F",accent:"#A13823",owned:"#7B5EA7",muted:"#B5AFA6",
           drawer:"#DDD8D0",body:"#3D3730",dim:"#ECEAE6",panel:"#ECE8E1",
           warnBg:"#F7E4C4",warnEdge:"#B5791A",warnInk:"#6B4A1E",
           okBg:"#D8EAE4",okEdge:"#2D6B5A",okInk:"#1F4C40",
           holdBg:"#E8E2D6",ownedBg:"#EDE5F5",
           rejectInk:"#8A6D3B",neverInk:"#7A4A4A",star:"#B8860B",onAction:"#fff",
           scrim:"rgba(20,18,16,0.45)"},
    dark: {bg:"#1A1815",card:"#232019",ink:"#EDE8E0",soft:"#A8A29A",rule:"#3A352E",
           action:"#5E9E85",accent:"#E2735A",owned:"#B79BE0",muted:"#6A645C",
           drawer:"#2A2620",body:"#D6D0C6",dim:"#201D18",panel:"#262219",
           warnBg:"#3A2E14",warnEdge:"#C79A3E",warnInk:"#F0D9A4",
           okBg:"#16302A",okEdge:"#4E9B80",okInk:"#A6DCC6",
           holdBg:"#32291C",ownedBg:"#2B2136",
           rejectInk:"#D6B87A",neverInk:"#E0A3A3",star:"#E0B45C",onAction:"#12100E",
           scrim:"rgba(0,0,0,0.6)"},
  };
  const C=PALETTES[theme];
  const TH=tiersFor(theme);          // the tier colours for THIS theme
  const chip=on=>({padding:"4px 10px",borderRadius:999,border:"1px solid "+(on?C.ink:C.rule),background:on?C.ink:"transparent",color:on?C.onAction:C.soft,fontSize:11,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"});
  const sBtn={padding:"5px 12px",borderRadius:4,border:"1px solid "+C.rule,background:"transparent",color:C.soft,fontSize:11,fontWeight:500,cursor:"pointer"};
  const pBtn={...sBtn,background:C.action,color:C.onAction,border:"none",opacity:busy?0.5:1,cursor:busy?"wait":"pointer"};
  const lnk={fontSize:11,fontWeight:500,color:C.ink,background:C.card,border:"1px solid "+C.rule,borderRadius:3,padding:"4px 9px",textDecoration:"none",display:"inline-block",whiteSpace:"nowrap"};

  // ---- v9 approval-stage render helpers ----
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

        {/* THE FILE DISAGREED WITH ITSELF about this exhibition — two rows, same
            address, different values. Nothing is resolved silently: both are
            shown, the fuller one is ticked as a starting point, one tap
            switches. Her ruling, 13 Sep. */}
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

        {/* THREE OUTCOMES, AND THE THIRD IS NOT A STRONGER REJECT. Reject
            means "not now" and remembers nothing, so the row returns on every
            future sweep. Never add this means the row should not be an entry
            at all — a talk filed under an exhibitions address, a duplicate that
            could not fold, a dead link. It is NOT for an exhibition she simply
            is not interested in: that one is accepted and then dismissed, and
            dismiss is not a rubbish chute. */}
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
  const{acceptedCount,undecidedCount}=countDecisions(proposals,decisions);

  // v8.3 status, file model. Three states: fresh load = neutral line; your edits
  // = loud red banner; after Export/Save = calm green line. Green only appears once
  // you've actually exported this session (a reset seed is in no file, so it's neutral).
  const hasLedger=rows.length>0;
  const showUnsavedBanner=hasLedger&&dirty;
  let savedText=null,savedCol=C.soft,savedWeight=500;
  if(!hasLedger){savedText="No ledger loaded \u2014 tap Import to begin.";}
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
        {/* Venue refresh buttons removed to protect usage. refreshVenues() is kept dormant below and can be re-wired here later. */}
        <div style={{marginTop:14,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          {/* Bulk "Find catalogues for N Wanted" button removed to protect usage. findWantedCats() is kept dormant below. */}
          <button onClick={requestImport} style={sBtn}>Import</button>
          <button onClick={handleExport} disabled={!hasLedger} style={{...pBtn,opacity:hasLedger?1:0.4,cursor:hasLedger?"pointer":"not-allowed"}}>Export / Save</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{display:"none"}}/>
          {/* Small and out of the way: it is a comfort control, not part of the
              work. Says what it will DO, not what is currently on. */}
          <button onClick={toggleTheme} title={theme==="dark"?"Switch to light":"Switch to dark"}
            style={{...sBtn,marginLeft:"auto",padding:"5px 9px"}}>{theme==="dark"?"\u2600 Light":"\u263D Dark"}</button>
          <button onClick={()=>refreshFileRef.current?.click()} style={sBtn}>Import Refresh</button>
          <input ref={refreshFileRef} type="file" accept=".csv,text/csv" onChange={handleRefreshFile} style={{display:"none"}}/>
        </div>
        {savedText&&<div style={{marginTop:6,fontSize:11,color:savedCol,fontWeight:savedWeight}}>{savedText}</div>}
        {showUnsavedBanner&&refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:C.okBg,border:"2px solid #2D6B5A",borderRadius:5,fontSize:12.5,fontWeight:700,color:C.okInk,lineHeight:1.4,display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:17,lineHeight:1}}>{"\u21BB"}</span>
          {/* EVERY CARD SHE LOOKED AT IS ACCOUNTED FOR IN THIS ONE SENTENCE,
              which is the whole job of it. Partial apply put cards somewhere
              the sentence did not name \u2014 neither applied nor refused \u2014 so the
              arithmetic stopped closing and the bar quietly under-reported.
              The clause below is not decoration: drop it and the numbers no
              longer add up to the pile she started with. It says HOW to get
              them back too, because "left behind" with no next step reads as
              lost. */}
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
        {/* A QUARANTINE THAT ISN'T SAVING IS A BANNER, NOT A FOOTNOTE — her
            ruling, 20 Sep. It used to print inside the quarantine panel, which
            she would have to open to find: the rows sit on screen looking
            normal while nothing is being written, and the one person who needs
            to know is the one least likely to go looking. It borrows the
            unsaved-changes banner because it means the same thing — a decision
            you have made is not stored. NOT gated on a ledger being open: the
            quarantine applies before any file is loaded, so its failures do
            too. */}
        {quarWhy&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:17,lineHeight:1.1}}>{"\u26A0"}</span>
          <span>{"QUARANTINE \u2014 "+quarWhy}</span>
        </div>}
        {busy&&prog.total>0&&<div style={{marginTop:8}}><div style={{height:3,background:C.rule,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(prog.done/prog.total*100)+"%",background:C.action,transition:"width .3s ease"}}/></div><div style={{fontSize:10,color:C.soft,marginTop:3}}>{prog.done}/{prog.total} · {prog.label}</div></div>}
        {error&&<div style={{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink}}>{error}</div>}
        {debug&&<div style={{marginTop:4}}><button onClick={()=>setShowDebug(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{showDebug?"Hide diagnostic":"Show diagnostic"}</button>{showDebug&&<pre style={{marginTop:4,padding:7,background:C.drawer,border:"1px solid "+C.rule,borderRadius:4,fontSize:9.5,whiteSpace:"pre-wrap",wordBreak:"break-word",color:C.soft,maxHeight:160,overflow:"auto"}}>{debug}</pre>}</div>}
        {/* NOT GATED ON A LEDGER EITHER, matching the panel below, whose own
            comment has said so since 20 Sep while this row quietly required
            one. When a sweep last ran is what the PAGE knows about the world,
            not something her document tells it, so it is answerable before any
            file is opened. */}
        <div style={{marginTop:6,fontSize:10.5,color:C.soft,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          {/* "UNKNOWN", NEVER "NEVER" — her ruling, 21 Sep. An empty store is
              not evidence that no sweep ever ran: she can be looking at rows
              she quarantined, which only ever come from a sweep. "Never" is a
              claim about the world made from the absence of a record, which is
              the same shape of error as dating a venue by the moment she
              pressed a button. We know what we were told and nothing else. */}
          <span>Last refreshed: {lastSweep?fmtRefresh(lastSweep):"Unknown"}</span>
          {/* PER-VENUE FRESHNESS lives here because this is where she already
              looks for "when was this last touched", next to the save state.
              Collapsed by default: 21 venues is a wall, and the question is
              occasional. */}
          {/* ALWAYS SHOWN once a ledger is open, even with nothing in the
              sweep log. It used to appear only when there was something to
              list, so an emptied store removed the control itself and the
              screen said nothing at all was wrong — which is precisely the
              silence the panel's own "no sweeps yet" line exists to break.
              A control that disappears cannot report anything. */}
          <button onClick={()=>setShowFresh(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{showFresh?"Hide venues":"By venue"}</button>
        </div>

        {/* NOT GATED ON A LEDGER BEING OPEN. The sweep log is not part of her
            document — it is what this page knows about the world, so it is
            there on a fresh page and it survives Reset. */}
        {showFresh&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          <div style={{fontSize:10,color:C.soft,marginBottom:6,lineHeight:1.5}}>
            {"When each venue was last swept, and when it last actually gave us exhibitions. A venue swept recently but with no rows since an older date is being refused \u2014 worth a solo re-run."}
          </div>
          {/* "NO SWEEPS YET" AND "COULDN'T READ THE STORE" LOOK IDENTICAL AND
              MEAN OPPOSITE THINGS, so an empty panel always says which. */}
          {freshWhy&&<div style={{fontSize:11,color:C.accent,marginBottom:6,lineHeight:1.5}}>{freshWhy}</div>}
          {/* IT SAID "No sweep imported yet.", WHICH ASSERTS SOMETHING WE
              CANNOT KNOW — her ruling, 21 Sep, same reasoning as the headline.
              The store holding nothing is a fact about the RECORD. Whether a
              sweep ran is a fact about the world, and the two are not the same
              claim. Note this is NOT the same case as freshWhy above, which is
              the store failing to answer at all: here it answered, and what it
              answered was nothing. */}
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
          <span><b style={{color:C.ink}}>{counts.total}</b> Tracked</span>
          <span><b style={{color:C.ink}}>{counts.wanted}</b> Wanted</span>
          <span><b style={{color:C.owned}}>{counts.owned}</b> Owned</span>
          <span><b style={{color:TH.urgent.ink}}>{counts.pressing}</b> Closing Window</span>
          {counts.dismissed>0&&<span><b>{counts.dismissed}</b> Dismissed</span>}
          <button onClick={()=>{setShowSearch(v=>!v);setTimeout(()=>searchRef.current?.focus(),100);}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.soft,padding:0,lineHeight:1}} title="Search">{"\uD83D\uDD0D"}</button>
        </div>
        {showSearch&&<div style={{marginTop:6}}><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exhibitions\u2026" style={{width:"100%",padding:"7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/></div>}
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
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Acquiring?</span>
          <button onClick={()=>setAcqWanted(v=>!v)} style={chip(acqWanted)}>Wanted</button>
          <button onClick={()=>setAcqOwned(v=>!v)} style={chip(acqOwned)}>Owned</button>
          <button onClick={()=>setAcq3mo(v=>!v)} style={chip(acq3mo)}>3+ mos</button>
          <button onClick={()=>setAcq6mo(v=>!v)} style={chip(acq6mo)}>6+ mos closing window</button>
          <button onClick={()=>setAcqNoCat(v=>!v)} style={chip(acqNoCat)}>No catalogue</button>
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
          const searchingLabel=lookPhase==="shop"?"Searching venue shop\u2026":lookPhase==="web"?"Searching more broadly\u2026":lookPhase==="page"?"Reading the book\u2019s page for its ISBN\u2026":lookPhase==="publisher"?"Looking for the publisher\u2019s page\u2026":lookPhase==="recheck"?"Re-reading the shop page\u2026":"Searching\u2026";
          // Two buttons share one busy row; only the one pressed shows progress.
          const againLabel=isBusy&&!rechecking?searchingLabel:"Search again";
          const recheckLabel=isBusy&&rechecking?searchingLabel:"Re-check museum shop";
          const said=recheckSaid&&recheckSaid.id===r.id?recheckSaid:null;
          if(dismissed)return(
            <React.Fragment key={r.id}>{lead}
            <article style={{background:C.dim,border:"1px solid "+C.rule,borderLeft:"4px solid "+C.muted,borderRadius:5,padding:"10px 14px",opacity:0.55}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft}}>{mu?.short}</span>
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
                  <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginTop:2}}>{mu?.short}</span>
                  {noCat?<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:C.muted,background:"#E3DED7",padding:"2px 7px",borderRadius:3}}>No catalogue</span>
                  :isAcq?<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:C.owned,background:C.ownedBg,padding:"2px 7px",borderRadius:3}}>Owned</span>
                  :<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:tier.ink,background:tier.wash,padding:"2px 7px",borderRadius:3}}>{tier.label}</span>}
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:0,marginTop:5}}>
                  <h3 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:18,lineHeight:1.2,fontWeight:500,margin:0,letterSpacing:"-0.01em",flex:1}}>
                    {r.title}
                    {r.exUrl&&<a href={r.exUrl} target="_blank" rel="noopener noreferrer" style={{color:C.action,textDecoration:"none",marginLeft:5,fontSize:13,fontWeight:400}}>{"\u2197"}</a>}
                  </h3>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:8,flexShrink:0}}>
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
                    </div>
                  ):noCat?(
                    <div>
                      <p style={{fontSize:12,color:C.soft,margin:"0 0 8px"}}>No catalogue found for this exhibition.</p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
                        <button onClick={()=>findOneCat(r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{againLabel}</button>
                        <button onClick={()=>recheckShop(r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{recheckLabel}</button>
                      </div>
                      {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
                    </div>
                  ):(
                    <div>
                      {/* A MISSING BUTTON CANNOT REPORT ANYTHING \u2014 her ruling, 21 Sep, and the
                          third time this app has had to learn it. The Publisher button is drawn
                          only when a link was found, so its absence read the same whether the
                          step found nothing, or never ran. It says so now. Most catalogues are
                          published by the museum itself, where the publisher\u2019s page IS the shop
                          and is deliberately refused, so "none" is the ordinary answer rather
                          than a fault \u2014 which is exactly why the silence had to end. */}
                      {/* "Now" and "Back in the museum shop." are the SAME green as
                          the plain sentence — her ruling. The word carries the news;
                          a second colour would make a book coming back look like a
                          different kind of thing from a book being there. */}
                      {r.shopState==="shop"&&<div style={{fontSize:11,marginBottom:6}}>
                        <span style={{color:C.action,fontWeight:600}}>{shopHeadline(r.shopState,r.shopChange)}</span>
                        {publisherNote(r.publisherResult,!!r.publisherUrl)&&<span style={{color:C.soft}}> {publisherNote(r.publisherResult,!!r.publisherUrl)}</span>}
                      </div>}
                      {/* GONE, AND THE LINK KEPT — her design, 25 Sep. The link stays as
                          "Museum shop (last seen)" because a restock usually comes back
                          at the same address. A DARK RED, NOT A FIRE ENGINE — her words:
                          it borrows the "closed over a year" ink, already muted, already
                          with a dark-mode partner, no loose hex. */}
                      {r.shopState==="gone"&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>
                        <span style={{color:TH.lapsed.ink,fontWeight:700}}>{shopHeadline(r.shopState,r.shopChange)+" "}</span>
                        {"The museum shop link below is where it was last seen; other buy options shown too."}
                        {publisherNote(r.publisherResult,!!r.publisherUrl)&&(" "+publisherNote(r.publisherResult,!!r.publisherUrl))}
                      </div>}
                      {/* The dash is a STRING, not page text. Written as a bare
                          \u2014 among the words it printed those six characters
                          literally, and nothing caught it for weeks. */}
                      {r.shopState==="web"&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>
                        {"Not in the museum shop \u2014 the shop link below opens the general store; other buy options shown too."}
                        {publisherNote(r.publisherResult,!!r.publisherUrl)&&(" "+publisherNote(r.publisherResult,!!r.publisherUrl))}
                      </div>}
                      {r.catalogueTitle&&<div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:14.5,fontWeight:500,marginBottom:2,lineHeight:1.3}}>{r.catalogueTitle}</div>}
                      {r.publisher&&<div style={{fontSize:11,color:C.soft,marginBottom:2}}>{r.publisher}</div>}
                      <div style={{fontSize:11.5,fontFamily:"ui-monospace,monospace",marginBottom:10,color:r.isbn13?C.ink:C.soft}}>
                        {r.isbn13?"ISBN "+fmtIsbn(r.isbn13):"ISBN not confirmed \u2014 verify before buying"}
                      </div>
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
                        <button onClick={()=>recheckShop(r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{recheckLabel}</button>
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
      {showTop&&(
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="Return to top"
          style={{position:"fixed",bottom:undo?64:20,left:"50%",transform:"translateX(-50%)",zIndex:998,width:38,height:38,borderRadius:"50%",background:C.card,border:"1px solid "+C.rule,color:C.ink,fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>{"\u2191"}</button>
      )}
      {undo&&(
        <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:C.ink,color:C.onAction,borderRadius:4,padding:"7px 14px",fontSize:12,display:"flex",gap:10,alignItems:"center",zIndex:999,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
          {/* THE ORIGINAL STYLE, ONE WORD CHANGED — her ruling, 24 Sep:
              "Restore" became "Undo", both words the same larger size. A
              <button> does not inherit the page's font, so it is told to, and
              both carry the same line height so their baselines meet. */}
          <span style={{fontSize:14,lineHeight:"20px"}}>Dismissed</span>
          <button onClick={undoDismiss} style={{background:"none",border:"1px solid rgba(255,255,255,0.5)",borderRadius:3,color:C.onAction,fontFamily:"inherit",fontSize:14,lineHeight:"20px",fontWeight:600,cursor:"pointer",padding:"1px 8px",margin:0}}>Undo</button>
        </div>
      )}
      {/* QUARANTINE LIVES DOWN HERE — her ruling, 24 Sep. At eye level at the
          top it read as an overflow bin. Right-aligned on the starter-set line,
          in that line's own type; its drawer opens beneath. */}
      <div style={{maxWidth:760,margin:"18px auto 0",paddingTop:10,borderTop:"1px solid "+C.rule,fontSize:10,color:C.soft,lineHeight:1.6,display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
        <span>
          Built-in starter set from venue pages, 20 Aug 2026.{" "}
          <button onClick={requestReset} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Reset ledger</button>
          {" \u2014 force-loads the starter set."}
        </span>
        {ignored.length>0&&<button onClick={()=>setShowIgnored(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0,marginLeft:"auto"}}>{showIgnored?"Hide quarantine":"Quarantine - "+ignored.length}</button>}
      </div>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {showIgnored&&ignored.length>0&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* BIG ENOUGH TO READ — her finding, 20 Sep: "tiny AND faint". This
              is a list of decisions she may need to UNDO, so it cannot be the
              smallest, palest text on the screen. Set at or above the filter
              chips below it, in the body ink rather than the muted grey. */}
          <div style={{fontSize:12,color:C.ink,marginBottom:8,lineHeight:1.55}}>
            {"Entries excluded from all future imports. Removing them from quarantine will re-offer them in future sweeps \u2014 it does not immediately add them to your ledger."}
          </div>
          {/* BY VENUE ONLY — her ruling, 24 Sep. It listed newest decision
              first, so each import session formed its own block. Venues in the
              app's own order, titles A–Z within each. */}
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
      {proposals&&(
        <div style={{position:"fixed",inset:0,background:"rgba(20,18,16,0.5)",zIndex:1100,display:"flex",flexDirection:"column",padding:16}}>
          <div style={{background:C.bg,borderRadius:8,maxWidth:820,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.rule}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:500,color:C.ink}}>{proposals.length} proposed change{proposals.length===1?"":"s"} found</div>
              {/* THE COUNTS, AND WHY THEY EARN THEIR SPACE. A card total on
                  its own cannot be checked against anything: rows leave the
                  pile for four innocent reasons — a marker row, a quarantine,
                  a fold, an entry that already matches — so 652 rows arriving
                  as 319 cards is indistinguishable from the same with eleven
                  quietly lost.

                  REWRITTEN TO HER WORDING, 20 Sep. Two sentences, each ending
                  in the number the next one starts from: the file narrows to
                  the pile, the pile splits by what it does to her ledger. The
                  old version put the split FIRST and the reconciliation
                  second, so the two lines shared no number and nothing led
                  anywhere. Every term stays — drop one and the arithmetic
                  stops closing, which is the only thing these lines are for. */}
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
              {/* TRIAGE FIRST, THEN THE ORDINARY WORK — her ruling, 13 Sep.
                  Odd cases were sprinkled through the venue groups, so every
                  few cards she switched from approving to investigating. Her
                  reason for the order INSIDE triage is hers and it is not the
                  one an engine would pick: easiest first, hardest last. She is
                  spending attention, not compute, and clearing the cards that
                  need nothing leaves more of it for the ones that do.

                  Batched by KIND, not by venue, which means a venue can appear
                  twice on this screen — once in triage, once below. That is the
                  accepted cost: she would rather finish one kind of thinking
                  than keep switching. */}
              {(()=>{
                const at=proposals.map((p,i)=>({p,i}));
                const vOrder=m=>{const k=MUSEUMS.findIndex(x=>x.id===m);return k<0?999:k;};
                const byVenue=a=>a.slice().sort((x,y)=>vOrder(x.p.venueId)-vOrder(y.p.venueId));
                // NO "UNUSABLE" BAND — her ruling 20 Sep. A row with no title
                // or no venue code never gets this far: analyzeProForma refuses
                // the whole file and names the lines for the session, and
                // scraper/qc.js stops it upstream. Nothing faulty is triage.
                const real    = at;
                // WAS THIS CARD BUILT FROM MORE THAN ONE ROW? Ask the fold
                // itself, via the flag it sets. This used to search the notes
                // for the words "same exhibition", and the sweeper writes those
                // same words for a travelling show — "The same exhibition is
                // also shown at Palm Beach." Acquavella's two runs of
                // Portraiture were then filed under "combined for you" when
                // nothing had been combined, under a heading that told her
                // something untrue. A FACT THE CODE ALREADY KNOWS IS NEVER
                // RE-DERIVED FROM PROSE WRITTEN FOR A HUMAN.
                const isMerged=x=>!!x.p.merged;
                const hasChoice=x=>!!x.p.choices;
                const mergedOnly = byVenue(real.filter(x=>isMerged(x)&&!hasChoice(x)));
                // A CONFLICT IS ALWAYS A FOLD, so there is no band for a
                // disagreement that arrived on its own. There was one, and it
                // was a PHANTOM: it never held a row and never could, because a
                // disagreement is only ever found by holding two rows side by
                // side, and foldDuplicateRows flags every card it builds. It
                // shipped, this guide listed it as one of six bands, and nobody
                // ran a file and asked why it was always empty. So the test is
                // hasChoice alone — being a fold adds nothing to it.
                const mergedConf = byVenue(real.filter(x=>hasChoice(x)));
                const plain      = real.filter(x=>!isMerged(x)&&!hasChoice(x));
                // NO LINK AT ALL — band 6, her ruling 13 Sep. These rows are
                // perfectly usable: a title, dates and a description, and the
                // card's arrow falls back to the venue's own listing. So they
                // are NOT faulty: everything is present except the link.
                //
                // They are shown together because of what the missing link
                // costs LATER, invisibly: it is the only key that can fold two
                // copies of one exhibition, and the only key quarantine can use,
                // so a no-link row arrives fresh on every future sweep. Her
                // reason for grouping them: once she reaches the ordinary list
                // she is no longer in "what is wrong with this one" mode, and
                // these are the last rows that need that mode.
                const noLink     = byVenue(plain.filter(x=>!x.p.cand||!x.p.cand.exUrl));
                const ordinary   = plain.filter(x=>x.p.cand&&x.p.cand.exUrl);
                // VENUE SUBHEADINGS INSIDE EACH BAND. Batching by kind removed
                // the venue grouping, so a band read as one undifferentiated
                // run of cards and the only way to tell which museum a show was
                // at was to read its link. Same heading style and same venue
                // order as the ordinary list below, so both halves of the
                // screen read the same way round.
                const byVenueBlocks=list=>MUSEUMS.map(m=>{
                  const grp=list.filter(x=>x.p.venueId===m.id);
                  if(!grp.length)return null;
                  return(
                    <div key={m.id} style={{marginBottom:10}}>
                      <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginBottom:6,fontWeight:600}}>{m.short}</div>
                      {grp.map(({p,i})=>renderProposalCard(p,i))}
                    </div>
                  );
                }).filter(Boolean);
                // EVERY BAND CARRIES ITS OWN COUNT, AND ITS OWN DISCLOSURE.
                // Without a count a band is an unbounded pile: no way to tell
                // "two of these" from "eighty" before scrolling through them,
                // and no way to check the bands add up to the header. The count
                // lives ON the header, so collapsing can never hide it.
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
                // ODD CASES COUNTS THE MARKERS TOO. It used to add up only the
                // five card bands, so the heading read "Odd cases first \u00b7 0"
                // directly above a band of its own saying 9 \u2014 a total that
                // left out one of the things it was totalling.
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
                    // Which venues actually have ordinary cards. The toggle must
                    // act on THESE and not on all 21, or "collapse all" would
                    // write keys for venues with nothing in them and the button
                    // would read the wrong way on the next click.
                    const venuesHere=MUSEUMS.filter(m=>ordinary.some(x=>x.p.venueId===m.id)).map(m=>m.id);
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
                  {/* ORDER INSIDE A VENUE — her ruling 20 Sep. It was FILE
                      ORDER, which is the order the scraper read the venue's
                      pages, so an edit to something she owns sat between two
                      brand-new shows and she switched between "is this change
                      right?" and "do I want this?" every few cards. Same
                      reasoning as batching the triage bands by kind.

                      Fills, then edits, then new. Within each, NEWEST CLOSING
                      DATE FIRST, because that is the field the whole app is
                      about — how close the catalogue is to going out of print.
                      A row with no closing date has nothing to sort on, so it
                      sits at the BOTTOM of its group rather than being given a
                      position it did not earn. */}
                  {MUSEUMS.map(m=>{
                    const rank={fill:0,change:1,add:2};
                    const grp=ordinary.filter(x=>x.p.venueId===m.id).slice().sort((a,b)=>{
                      const d=(rank[a.p.type]??9)-(rank[b.p.type]??9); if(d!==0)return d;
                      const ae=a.p.cand&&a.p.cand.endDate, be=b.p.cand&&b.p.cand.endDate;
                      if(!ae&&!be)return 0; if(!ae)return 1; if(!be)return -1;
                      return be.localeCompare(ae);
                    });
                    if(!grp.length)return null;
                    // THE VENUE HEADING IS THE CONTROL. It used to be small grey
                    // uppercase text that read as a label and was lost between
                    // the cards — her finding. Now it carries the accent red,
                    // a larger size, its own count, and the same disclosure
                    // triangle as a triage band, so the one thing that separates
                    // one venue's work from the next is the most visible line on
                    // the screen rather than the least.
                    const vOpen=venueOpen(m.id);
                    return(
                    <div key={m.id} style={{marginBottom:14}}>
                      <button onClick={()=>setOpenVenues(o=>({...o,[m.id]:!vOpen}))}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",background:"none",
                                border:"none",borderBottom:"1px solid "+C.rule,padding:"6px 0",marginBottom:8,cursor:"pointer",color:C.accent}}>
                        <span style={{fontSize:10,lineHeight:1,width:10,display:"inline-block",transform:vOpen?"rotate(90deg)":"none",transition:"transform .12s"}}>{"\u25B6"}</span>
                        <span style={{fontSize:14,letterSpacing:"0.01em",fontWeight:700}}>{m.short}</span>
                        <span style={{fontSize:12,fontWeight:700}}>{"\u00b7"} {grp.length}</span>
                        {/* THE UNDECIDED COUNT PER VENUE. With a hard gate on
                            the ledger, a number in the footer says how much is
                            left but never WHERE, and a collapsed venue hides
                            its own. Printed on the heading, a closed venue
                            still declares what it is holding. */}
                        {/* ONLY WHERE THERE IS WORK. A badge on every venue
                            whatever its state is one more number to read past
                            on a screen that already carries plenty — her
                            warning. A venue with nothing left says nothing. */}
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
              <button onClick={cancelRefresh} style={sBtn}>Cancel refresh</button>
              <span style={{fontSize:11.5,color:C.soft,marginLeft:"auto"}}>{acceptedCount} to apply</span>
              {/* THE COUNT IS THE WAY TO REACH ONE — raised as the gap the
                  block leaves and built at her ask. A number she cannot act on
                  is the thing that makes a hard gate feel arbitrary. It opens
                  the venue holding the first undecided card, because a
                  collapsed venue would otherwise scroll to nothing.

                  REMOVED 22 Sep 2026 — her ruling on seeing the finished
                  footer: "clutter and duplication". Three things said the same
                  number on one screen — this, the disabled button beside it,
                  and the per-venue "N to decide" on every heading. The venue
                  headings are the better answer, because they say WHERE as well
                  as how many, and a closed venue still declares what it holds.

                  DO NOT PUT IT BACK as a fix for "she cannot find the remaining
                  cards" — she can, from the headings. Git holds it. */}
              {/* EVERY CARD MUST BE DECIDED BEFORE THE LEDGER MOVES — her ruling,
                  20 Sep. applyRefresh SKIPPED an undecided card silently: not
                  applied, and not remembered either, so it returned on the next
                  sweep with nothing on screen to say it had been passed over.
                  With 320 cards that is a whole session's reading thrown away by
                  one tap, and she had believed the guard was already there.

                  A BLOCK, not a warning — her call, and her reason: "otherwise I
                  envision total chaos if I can skip. this is SLOW mode at the
                  moment." A warning she can wave through is the same failure one
                  dialogue later.

                  The button says WHAT IS MISSING rather than going quietly grey.
                  A dead control with no reason attached is the thing she would
                  be left staring at, and the count is the only clue to where the
                  work is. */}
              {/* ===== TEMPORARY — THE SIDE DOOR FOR THE 320-CARD IMPORT =====
                  Her ask, 22 Sep 2026, and her words: the block above is the
                  permanent design and STAYS. This is a way past it for one job
                  — 320 cards is more than one sitting, and the gate makes a
                  half-finished sitting worth nothing.

                  UNWIRE THIS WHEN THAT IMPORT IS DONE. Delete this block and
                  the `partial` parameter on applyRefresh; nothing else knows
                  about it. It is deliberately one contiguous piece for that
                  reason.

                  IT CANNOT APPEAR INSTEAD OF THE BLOCK, only beside it. It is
                  drawn when some cards are decided AND some are not — with
                  nothing decided there is nothing to apply, and with everything
                  decided the real button is live and this one would be a second
                  way to do the same thing. So the gate is never the only thing
                  on screen and never absent.

                  IT ASKS FIRST. What is left behind is not remembered anywhere
                  — that is not a fault to fix here, it is how refusing works
                  today — so the confirm box says the number, says the way back,
                  and says that rejections do not stick. Her call to make with
                  the facts in front of her, every time, not once. */}
              {offerPartialApply({acceptedCount,undecidedCount})&&<button
                onClick={()=>setConfirmBox({
                  title:"Update the ledger with part of this?",
                  text:acceptedCount+" decided "+(acceptedCount===1?"card":"cards")+" will go into your ledger now. "
                    +undecidedCount+" undecided "+(undecidedCount===1?"card":"cards")+" will be left behind and are not remembered anywhere — "
                    +"import the same sweep file again to pick them up. Anything you rejected will come back too. "
                    +"Export / Save straight afterwards.",
                  act:()=>applyRefresh(true)})}
                title={"Apply the "+acceptedCount+" you have decided and come back to the rest later."}
                style={{...sBtn,borderColor:C.accent,color:C.accent,fontWeight:600}}>
                Update with the {acceptedCount} I{"’"}ve decided</button>}
              {/* ===== end temporary block ===== */}
              <button onClick={()=>applyRefresh(false)} disabled={undecidedCount>0}
                title={undecidedCount>0?"Decide every card first — "+undecidedCount+" still undecided.":""}
                style={{...pBtn,...(undecidedCount>0?{background:C.muted,cursor:"not-allowed",opacity:1}:{})}}>
                {undecidedCount>0
                  ? undecidedCount+" still to decide"
                  : "Go ahead and update the ledger"}</button>
            </div>
          </div>
        </div>
      )}
      {/* ABOVE THE REVIEW PANEL, NOT UNDER IT — her finding, 22 Sep 2026, on
          the very first press of the partial-apply button.

          It sat at 1000 while the refresh review sits at 1100, so a confirm
          raised FROM inside the review painted behind it: the box was built,
          the scrim was drawn, and every pixel of both was covered. The button
          read as dead. Nothing was wrong with the button.

          IT WENT UNSEEN BECAUSE OF WHERE IT USED TO BE RAISED FROM. Import and
          Reset both live on the header, with no review open, so 1000 was above
          everything that existed at the time and the gap could not show. The
          first caller from inside the review found it immediately.

          SO IT IS THE TOP LAYER NOW, which is what a confirm is: the thing
          asked last is the thing answered first, whatever raised it. Any new
          overlay belongs BELOW this number, never above it. */}
      {confirmBox&&(
        <div style={{position:"fixed",inset:0,background:C.scrim,display:"grid",placeItems:"center",zIndex:1200,padding:16}}>
          <div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:8,maxWidth:420,padding:"18px 20px",boxShadow:"0 6px 24px rgba(0,0,0,0.25)"}}>
            {/* The heading is now the CALLER'S, because this box no longer only
                guards replacing the screen. The old wording stays as the
                default so every existing caller reads exactly as it did. */}
            <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:8}}>{confirmBox.title||"Replace what's on screen?"}</div>
            <div style={{fontSize:12.5,color:C.body,lineHeight:1.5,marginBottom:16}}>{confirmBox.text}</div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setConfirmBox(null)} style={sBtn}>Cancel</button>
              <button onClick={()=>{const a=confirmBox.act;setConfirmBox(null);a&&a();}} style={{...pBtn,background:C.accent}}>Continue</button>
            </div>
          </div>
        </div>
      )}
      {/* WHICH VERSION IS THIS — her ask, 22 Sep 2026. Small, grey, at the
          bottom, out of the way of the work: it is not something she acts on,
          it is something she checks when a page and a conversation disagree.
          Reads APP_VERSION, so there is one copy of the number in the file. */}
      <footer style={{maxWidth:760,margin:"28px auto 0",fontSize:10.5,color:C.soft,textAlign:"center"}}>
        Cat Watch {"·"} version {APP_VERSION} {"·"} {APP_VERSION_DATE}
      </footer>
    </div>
  );
}
