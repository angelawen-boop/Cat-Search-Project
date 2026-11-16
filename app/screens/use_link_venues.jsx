//@ The link venues: the manual-import venues held while an import is open and the copy in the store, their opening read, the shop screen's answers and a link venue's shop search.
//@piece useLinkVenues

// The venues Links, Pages and Paste have met (docs/add_by_link.md). It reads its own record from the store when
// the page opens (App calls it after the ledger document and before its opening effect, so the store's reads keep
// their order) and hands back the working copy and named actions; the stored copy never leaves it.
function useLinkVenues(rows){
  const[occVenues,setOccVenues]=useState({});
  // The stored copy of the new venues; occVenues is the working copy. The store is
  // written only when the ledger moves — an unfinished import keeps nothing (her decision).
  const occSaved=useRef({});
  useEffect(()=>{
    // Add by link: the venues it has met.
    readOccasional().then(map=>{ occSaved.current=map; registerOccasional(map); setOccVenues(map); });
  },[]);
  // The shop screen's answers are held in the working copy and stored when the ledger
  // moves; Cancel import drops them, Back keeps them (her decision). Confirmed in a
  // finished import → never asked again.
  function hold(next){ registerOccasional(next); setOccVenues(next); }
  // Back to what the store holds: the import's venues and answers dropped.
  function dropHeld(){
    const saved=occSaved.current;
    for(const id of Object.keys(MU)) if(isOcc(id)&&!saved[id]){ delete MU[id]; KNOWN_VENUES.delete(id); }
    registerOccasional(saved); registerUnseenOccasional(rows); setOccVenues(saved);
  }
  // The shop screen's answers (venuesShopConfirmed, venuesNoShop, venuesShopAdded), held.
  function confirmShop(id,english){ if(occVenues[id])hold(venuesShopConfirmed(occVenues,id,english)); }
  function noShop(id){ if(occVenues[id])hold(venuesNoShop(occVenues,id)); }
  // Her own shop link, already checked to be a link.
  function addShop(id,href){
    if(!occVenues[id])return;
    hold(venuesShopAdded(occVenues,id,href));
  }
  // "Look again" (lookAgainJob); what it found goes onto the venues as they stand then (venuesLookedAgain).
  async function lookAgain(id){
    const v=occVenues[id]; if(!v)return;
    const found=await lookAgainJob(v);
    setOccVenues(prev=>{
      const next=venuesLookedAgain(prev,id,found);
      registerOccasional(next); return next; });
  }
  // The shop screen asks about a venue outside her list whose shop is unconfirmed (venuesGoingIn).
  function toConfirm(proposals,decisions){ return shopVenuesToConfirm(proposals,decisions,occVenues,occSaved.current); }
  // An import applied: only the answers for venues going in are kept, and stored.
  function importApplied(proposals,decisions){
    if(occVenues!==occSaved.current){ const kept=answeredOnly(occVenues,occSaved.current,venuesGoingIn(proposals,decisions)); writeOccasional(kept); occSaved.current=kept; registerOccasional(kept); setOccVenues(kept); }
  }
  // A link venue's shop search, worked out once at its first lookup (shopSearchAdditions) — then stored.
  async function fillShopSearch(id){
    const v=occVenues[id]||occSaved.current[id];
    const adds=await shopSearchAdditions(MU[id],v);
    if(!adds)return;
    const add=x=>x?{...x,...adds}:x;
    if(occSaved.current[id]){ const saved={...occSaved.current,[id]:add(occSaved.current[id])}; occSaved.current=saved; writeOccasional(saved); }
    setOccVenues(prev=>{ const next=prev[id]?{...prev,[id]:add(prev[id])}:prev; registerOccasional(next); return next; });
    MU[id]={...MU[id],...occVenue(id,{...v,...adds})};
  }
  return{occVenues,hold,dropHeld,confirmShop,noShop,addShop,lookAgain,toConfirm,importApplied,fillShopSearch};
}
