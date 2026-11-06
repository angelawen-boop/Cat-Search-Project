//@ Manual-import venues: the Occasional chips and order, the waiting room (venues/occasional) over the register, and how a link's venue is decided.
//@piece OCC_COUNTRY_ORDER

// The Occasional venues (no chip of their own) follow, by country: the United States, the rest of that group
// (Australia), then Europe in her country order (her decision). A venue's country is on its register entry.
const OCC_COUNTRY_ORDER=["United States","United Kingdom","Germany","Belgium","France","Switzerland","Italy","Spain","Netherlands"];
//@piece OCC_EUROPE_ELSE

const OCC_EUROPE_ELSE=["Austria","Denmark","Sweden","Norway","Finland","Portugal","Ireland","Poland","Czechia","Hungary","Greece","Luxembourg"];
//@piece OCC_COUNTRY_NAMES

const OCC_COUNTRY_NAMES={"usa":"United States","us":"United States","united states of america":"United States","uk":"United Kingdom","great britain":"United Kingdom","england":"United Kingdom","scotland":"United Kingdom","wales":"United Kingdom","northern ireland":"United Kingdom","the netherlands":"Netherlands","holland":"Netherlands","czech republic":"Czechia","deutschland":"Germany"};
//@piece occCountry

// A venue's country as MU shows it, else its register entry's (a venue not yet shown).
const occCountry=id=>{ const c=String((MU[id]||REG[id]||{}).country||"").trim(); return OCC_COUNTRY_NAMES[c.toLowerCase()]||c; };
//@piece OCC_EUROPE_TLD

// "us", "eu" or "other": the three chips that hold the venues with no chip of their own.
// Two groups only (her decision): Europe, UK included, and everything else under Occ - US (Australia last).
// No country stored: the address's country ending (".uk", ".de"…) says.
const OCC_EUROPE_TLD=["uk","de","be","fr","ch","it","es","nl","at","dk","se","no","fi","pt","ie","pl","cz","hu","gr","lu"];
//@piece occRegion

const occRegion=id=>{ const c=occCountry(id); if(c)return(OCC_COUNTRY_ORDER.includes(c)&&c!=="United States")||OCC_EUROPE_ELSE.includes(c)?"eu":"us";
  const m=/-([a-z]{2})$/.exec(String(id)); return m&&OCC_EUROPE_TLD.includes(m[1])?"eu":"us"; };
//@piece OCC_CHIPS

const OCC_CHIPS=[["occ:us","Occ - US"],["occ:eu","Occ - Europe"]];
//@piece hasNoChip

const hasNoChip=id=>REG[id]?!REG[id].names.chip:isOcc(id);
//@piece CHIP_RANK
// Her order for the venues with a chip of their own: the register's.
const CHIP_RANK=Object.fromEntries(VENUE_REGISTER.filter(e=>e.names.chip).map((e,i)=>[e.id,i]));
//@piece orderOf

// A venue with no chip of its own sorts by country, then in the register's order; a venue met since the
// last publish after those of its country.
const orderOf=id=>{ if(!hasNoChip(id))return id in CHIP_RANK?CHIP_RANK[id]:1e6;
  const c=occCountry(id),j=OCC_COUNTRY_ORDER.indexOf(c),k=VENUE_REGISTER.findIndex(e=>e.id===id);
  const base=c==="United States"?100:occRegion(id)==="eu"?(j>=0?110+j:150):105;   // the United States, the rest of the US group (Australia), then Europe
  return base+(k>=0?k/1000:0.5); };
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
//@piece chipKey

// The chip a venue's cards sit under: its group's, where it has one.
const chipKey=id=>(REG[id]&&REG[id].names.group)||id;
//@piece chipVenues

// The Venue chips: one per venue with a chip of its own, one per group, in her venue order.
const chipVenues=()=>VENUE_REGISTER.filter(e=>e.names.chip).map(e=>e.id).filter((id,i,all)=>all.findIndex(x=>chipKey(x)===chipKey(id))===i);
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
  const mine=Object.values(MU).find(m=>m&&!m.occasional&&venueNames(m).some(x=>flatName(x)===flatName(a.venue)));
  const known=mine?mine.id:site?knownVenueFor("https://"+site+"/"):null;
  if(known)return{id:known,name:MU[known].name,host:site};
  const occ=Object.values(MU).find(m=>m&&m.occasional&&venueNames(m).some(x=>flatName(x)===flatName(a.venue)));
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
  const m=Object.values(MU).find(m=>m&&!m.occasional&&venueNames(m).some(x=>said===flatName(x)||said.startsWith(flatName(x)+" ")));
  return m&&onMuseumSite(pageHost,m.id)?m.id:null;
}
//@piece occVenueId


function occVenueId(host){
  return "occ-"+String(host||"").toLowerCase().replace(/^www\./,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
//@piece siteVenues


// The venues whose `sites` (read.sites) take this address → [[id, line]] (line: the house line, or none).
function siteVenues(url){
  let u; try{ u=new URL(siteUrlOf(url)); }catch{ return []; }
  const h=u.hostname.toLowerCase().replace(/^www\./,"");
  const out=[];
  for(const e of VENUE_REGISTER)
    for(const s of e.read.sites) if(s.host===h&&(!s.path||s.path.test(u.pathname)))out.push([e.id,s.line||null]);
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
  // No house named: the site's own venue, where the register has one (smb.museum, the Gemäldegalerie).
  const own=occVenueId(hostOf(siteUrlOf(url)));
  if(REG[own])return{id:own};
  const names=houses.map(([id])=>REG[id].names.card);
  return{id:null,why:"The page doesn’t say which museum the show is in ("+names.slice(0,-1).join(", ")+" or "+names[names.length-1]+")."};
}
//@piece linkReadVenue


// The venue whose link options read a page: a swept venue, or a manual-import venue in the register.
function linkReadVenue(url){
  const occ=occVenueId(hostOf(siteUrlOf(url)));
  return addressVenue(url)||(REG[occ]?occ:null);
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


// A manual-import venue as MU holds it (venueView): its register entry, and the record `v` (recordOf, or a
// venue met since the last publish); no `v`: a ledger row from a venue neither holds, named `fallback`.
function occVenue(id,v,fallback){
  return venueView(REG[id]||null,v,fallback);
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
// the short one. `v`: the venue's record (recordOf), or Claude's facts.
function venueSearchName(id,v){
  const s=v||{}, e=REG[id];
  // Her names are never replaced by Claude's (names.hers).
  let name=String((e&&e.names.hers&&e.names.full)||s.name||"").trim();
  for(const x of [...(s.aka||[]),s.city,s.country]) if(x&&!foldText(name).includes(foldText(x)))name+=" "+x;
  return name.trim();
}
//@piece allVenues

// Every venue a card can be filed under, in VENUE_ORDER; the rest by name.
// The review walks THIS, not MUSEUMS, or occasional cards are counted and never drawn.
function allVenues(){
  const occ=Object.values(MU).filter(m=>m&&m.occasional);
  return MUSEUMS.concat(occ).sort((a,b)=>orderOf(a.id)-orderOf(b.id)||a.card.localeCompare(b.card));
}
//@piece venueRank

function venueRank(id){ const i=allVenues().findIndex(m=>m.id===id); return i<0?1e6:i; }
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

// The venues met by Links, Pages and Paste: each register entry the store has met (recordOf), and over
// them the waiting room, the store's venues/occasional. A read that failed leaves the register's own.
async function readOccasional(){
  let w={};
  try{ const s=await storeRead(OCC_DOC,{part:UNREAD_OCC}); w=s.exists?((s.data||{}).venues||{}):{}; }catch{}
  return occasionalOver(w);
}
//@piece writeOccasional

// Only what the register does not already hold is written: the waiting room.
async function writeOccasional(map){
  const waiting=Object.fromEntries(Object.entries(map||{}).filter(([id,v])=>!heldByRegister(id,v)));
  try{ await storeWrite(OCC_DOC,{venues:waiting,updatedAt:new Date().toISOString()},{part:UNREAD_OCC}); return true; }catch{ return false; }
}
//@piece tidyOccasional

// When the page opens, its store readable and not read only: each waiting record the register now holds
// is cleared from the waiting room (her decision). Returns how many.
async function tidyOccasional(){
  let s; try{ s=await storeRead(OCC_DOC,{part:UNREAD_OCC}); }catch{ return 0; }
  if(!s.exists)return 0;
  const w=(s.data||{}).venues||{};
  const kept=Object.fromEntries(Object.entries(w).filter(([id,v])=>!heldByRegister(id,v)));
  const n=Object.keys(w).length-Object.keys(kept).length;
  if(!n)return 0;
  try{ await storeWrite(OCC_DOC,{venues:kept,updatedAt:new Date().toISOString()},{part:UNREAD_OCC}); return n; }catch{ return 0; }
}
//@piece STORE_FACTS

// The fields of a waiting-room record that its register entry also holds, and where.
const STORE_FACTS={name:e=>e.names.full,short:e=>e.names.card,aka:e=>e.names.aka,city:e=>e.city,country:e=>e.country,english:e=>e.english};
//@piece sameRecord

// Two records alike, whatever the order of their fields.
const sameRecord=(a,b)=>{ const c=x=>x===undefined?"null":JSON.stringify(x,(k,v)=>v&&typeof v==="object"&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(j=>[j,v[j]])):v); return c(a)===c(b); };
//@piece recordOf

// A manual-import venue's record: the register's facts over the record its entry was filed from (`filed`),
// and over both each field of the waiting record `w` that has changed since it was filed (her latest word).
// Her names (names.hers) are never replaced by a name Claude gave.
function recordOf(e,w){
  const filed=e.filed||{}, out={...filed};
  for(const [k,f] of Object.entries(STORE_FACTS)){ const x=f(e); if(x!=null)out[k]=x; }
  for(const k of Object.keys(w||{})) if(!sameRecord(w[k],filed[k])&&!(e.names.hers&&(k==="name"||k==="short")&&out[k]!=null))out[k]=w[k];
  return out;
}
//@piece heldByRegister

// A waiting record the register already holds: the one its entry was filed from, or the entry's own record.
const heldByRegister=(id,w)=>!!REG[id]&&REG[id].kind==="manual"&&(sameRecord(w,REG[id].filed)||sameRecord(w,recordOf(REG[id])));
//@piece occasionalOver

// The register's manual-import venues the store has met, each with its waiting record over it, then the
// venues only the waiting room holds.
function occasionalOver(w){
  const out={};
  for(const e of VENUE_REGISTER) if(e.kind==="manual"&&(e.filed||(w&&w[e.id])))out[e.id]=recordOf(e,w&&w[e.id]);
  for(const [id,v] of Object.entries(w||{})) if(!REG[id])out[id]=v;
  return out;
}
//@piece herVenue

// The register holds her decisions for this venue: her names for it, or its own reading rules.
const herVenue=id=>{ const e=REG[id]; return !!e&&(e.names.hers||!!e.read.link||e.read.sites.length>0||!!e.shop.catalogues); };
