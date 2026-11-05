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
//@piece shopVenuesToConfirm

// The shop screen asks about a venue outside her list whose shop is unconfirmed (venuesGoingIn).
// `venues` is the working copy of the new venues, `saved` the stored copy.
function shopVenuesToConfirm(proposals,decisions,venues,saved){
  const ids=venuesGoingIn(proposals,decisions);
  // Confirmed in a FINISHED import only: an answer held in this one stays on
  // the screen after Back, to be changed.
  // A shop written into the venue's entry (Basel) is already her answer: never asked again.
  for(const id of [...ids]) if(!venues[id]||(saved[id]||{}).confirmed||shopWrittenIn(id))ids.delete(id);
  return [...ids].sort((a,b)=>String(venues[a].name).localeCompare(String(venues[b].name)));
}
//@piece partialApplyWords

// The partial apply's words: the confirm box, the button's hover and the button. Her wording,
// naming what is left behind and the way back.
function partialApplyWords({acceptedCount,undecidedCount}){
  return {
    title:"Complete this partial import?",
    text:acceptedCount+" decided "+(acceptedCount===1?"card":"cards")+" will go into your ledger now. "
      +undecidedCount+" undecided "+(undecidedCount===1?"card":"cards")+" will be left behind — "
      +"import them using the same sweep file.",
    hover:"Apply the "+acceptedCount+" you have decided and come back to the rest later.",
    button:"Update with the "+acceptedCount+" I’ve decided",
  };
}
//@piece makeLedgerRow

function makeLedgerRow(c,now){
  const base=c.museumId+"-"+normalizeTitle(c.title).replace(/[^a-z0-9]+/g,"").slice(0,50);
  return {id:base,museumId:c.museumId,title:c.title,startDate:c.startDate||null,endDate:c.endDate||null,summary:c.summary||"",exUrl:c.exUrl||(MU[c.museumId]?.listUrl||""),interested:true,watching:false,acquiring:null,looked:false,hasCatalogue:"unknown",catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,publisherResult:null,shopUrl:null,shopState:null,shopChange:null,addedAt:now,editedAt:null,
    ...(labelDone(c)?{period:c.period,periodYear:c.periodYear,periodResponse:!!c.periodResponse,periodArtist:c.periodArtist||"",themes:c.themes,labelledAt:c.labelledAt||now}:{})};
}
//@piece withChoices

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
//@piece applyCards

// PARTIAL IS A PARAMETER, NOT A SECOND COPY OF THIS FUNCTION. `partial` changes
// nothing about what is written; it only counts what was left behind for the green
// bar. One copy of the ledger write.
// The review's cards applied to her ledger `rows`: the new ledger, the ids touched, the
// quarantine to add (null when none) and the counts for the "Import complete" line.
function applyCards(rows,proposals,decisions,partial){
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
  let quarantineAdd=null;
  if(newlyIgnored.length){
    quarantineAdd={};
    for(const x of newlyIgnored) quarantineAdd[x.key]={venueId:x.venueId,title:x.title,at:x.at,state:"blocked"};
  }
  // Counted from the cards with the gate's own function, never handed in.
  const leftUndecided=proposals.filter((p,i)=>isUndecidedCard(p,decisions[i])).length;
  return {ledger:Array.from(byId.values()),touched,quarantineAdd,
    done:{added,filled,changed,never:newlyIgnored.length,left:partial?leftUndecided:0}};
}
//@piece importComplete

// The green "Import complete" bar's two paragraphs, her wording: the instruction, then the
// counts. Every card she looked at is accounted for; the left-behind clause keeps the
// numbers adding up.
function importComplete(done){
  return {
    head:"Import complete. Save it now.",
    counts:done.added+" added, "+done.filled+" filled in, "+done.changed+" updated"+(done.never?", "+done.never+" quarantined":"")+(done.left?", "+done.left+" left undecided":"")+".",
  };
}
