//@ The review cards' decisions, 'Probably not for you', partial apply, counts, and which venues' shop answers are kept.
//@piece isUndecidedCard


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
//@piece topicOf


// ===== "PROBABLY NOT FOR YOU" — her design (CLAUDE.md §2.2.7) =====
// Compression labels a NEW show in a topic she always quarantines, writing one
// sentence into the row's notes ("Topic: Asian art."; TOPICS in scraper/compress.js).
// Such a new show, with nothing odd about it, goes in its own section, pre-set to
// Never add; she clicks Add to keep one. Odd cases stay odd: they need her eye.
function topicOf(note){
  const m=/(?:^|\s)Topic: ([^.]+)\./.exec(String(note||""));
  return m?m[1]:null;
}
//@piece isTopicCard

function isTopicCard(p){
  return !!(p&&p.type==="add"&&p.topic&&!p.merged&&!p.choices&&p.cand&&p.cand.exUrl);
}
//@piece topicPresets

function topicPresets(props){
  const d={};
  (props||[]).forEach((p,i)=>{ if(isTopicCard(p))d[i]={mode:"never"}; });
  return d;
}
//@piece cardOutcome


// Every decided card lands in one count — to apply, quarantined or rejected — so the
// footer adds up (her ask). The counts and the link box both use cardOutcome.
function cardOutcome(p,dec){
  dec=dec||{};
  if(isUndecidedCard(p,dec))return"undecided";
  if(p.type==="add")return dec.mode==="accept"?"accepted":dec.mode==="never"?"quarantined":"rejected";
  if(dec.mode==="addnew")return"accepted";
  return Object.values(dec.fields||{}).some(v=>v==="accept")?"accepted":"rejected";
}
//@piece SHOP_FIELDS

// What the shop finder found for a venue, before her answer on the shop screen.
const SHOP_FIELDS=["shop","shopHome","shopCatalogues","shelfKind","shopSearch","why","shopEnglishUnread","englishPicked","shopAdded","confirmed"];
//@piece foundShop

const foundShop=v=>Object.fromEntries(SHOP_FIELDS.filter(k=>v[k]!==undefined).map(k=>[k,v[k]]));
//@piece answeredOnly

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
//@piece shopWrittenIn

// The venues outside her list with at least one card going in. A venue whose every card is
// rejected, undecided or quarantined is not asked about its shop (her decision; AL-046).
// A venue whose shop section is written into its LINK_VENUES entry (`shopCatalogues`, Basel, the Städel).
const shopWrittenIn=id=>!!(linkEntry(id)||{}).shopCatalogues;
//@piece venuesGoingIn

function venuesGoingIn(proposals,decisions){
  const ids=new Set();
  (proposals||[]).forEach((p,i)=>{ const id=(p.cand||{}).museumId; if(isOcc(id)&&cardOutcome(p,(decisions||{})[i])==="accepted")ids.add(id); });
  return ids;
}
//@piece countDecisions

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
//@piece offerPartialApply


// ===== PARTIAL APPLY — stays until she says (CLAUDE.md §5.1) =====
// Offered only in the middle state: something decided AND something undecided. Out of
// the component so fixture 18h tests this copy.
function offerPartialApply(counts){
  const c=counts||{};
  return (c.acceptedCount||0)>0 && (c.undecidedCount||0)>0;
}
