//@ The list on the main screen as plain functions: the filters as one object, which mode the list is in, the list itself, its counts and the scrubber's groups.
//@piece filtersClear

// Every filter at "all clear". A NEW object each call, so the list starts again from the top after every clear.
function filtersClear(){return{venueF:new Set(),themeF:new Set(),timeF:new Set(),acqWanted:false,acqOwned:false,acq3mo:false,acq6mo:false,acqHasCat:false,acqNoCat:false,acqDigital:false,acqBuyNext:false,closingF:false,bnPeriod:false,bnDate:false,showAll:false,dismissedOnly:false,labelledF:false,watchedF:false,search:""};}
//@piece listMode

// Which mode the list is in. `sort` is {sortBy, dateReversed, pinTouched, refreshTouched}.
function listMode(filters,sort){
  const{acqBuyNext,acqOwned,bnPeriod}=filters,{sortBy,pinTouched}=sort;
  const bnOnly=acqBuyNext&&!acqOwned;   // Buy next alone: her dragged order; with Owned it is an ordinary list
  // Buy next by period (her design): Period in the Buy next view switches between her dragged
  // order and the period order with its dividers; she drags only in her own order.
  const periodView=bnOnly?bnPeriod:(sortBy==="period"&&!pinTouched);
  // The venue scrubber (her design): with an Occ group picked and the list sorted by venue, she scrubs to a venue.
  const venueScrub=!bnOnly&&!pinTouched&&sortBy==="venue"&&[...filters.venueF].some(k=>String(k).startsWith("occ:"));
  return{bnOnly,periodView,venueScrub};
}
//@piece listView

// The list: filtered, searched and sorted.
function listView(rows,filters,sort,byArtist){
  const{venueF,themeF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqHasCat,acqNoCat,acqDigital,acqBuyNext,closingF,bnPeriod,bnDate,showAll,dismissedOnly,labelledF,watchedF,search}=filters;
  const{sortBy,dateReversed,pinTouched,refreshTouched}=sort;
  const{bnOnly,periodView}=listMode(filters,sort);
    const sq=foldText(search).trim();
    // Each row's tier, worked out once: the sort below asks for it thousands of times.
    const tiers=new Map();
    const tierOf=r=>{let t=tiers.get(r);if(t===undefined){t=tierFor(r);tiers.set(r,t);}return t;};
    const newestRun=labelledF?rows.reduce((m,r)=>r.labelledAt&&r.labelledAt>m?r.labelledAt:m,""):"";
    let out=rows.filter(r=>{
      // The search narrows; it does not end the check, so every other filter applies. It reads what the
      // card prints: title, description, the venue's card name (her decision). Accents count as plain
      // letters both ways ("Bocklin" finds Böcklin; her ask).
      if(sq&&![r.title,r.summary,MU[r.museumId]?.card].some(t=>foldText(t).includes(sq)))return false;
      // Dismissed narrows too. A search still finds a dismissed show unless Dismissed
      // is on.
      if(dismissedOnly){ if(r.interested)return false; }
      else if(!r.interested&&!showAll&&!sq)return false;
      if(themeF.size>0&&!themeMatch(r,themeF))return false;
      if(venueF.size>0&&!venueF.has(chipKey(r.museumId))&&!(hasNoChip(r.museumId)&&venueF.has("occ:"+occRegion(r.museumId))))return false;
      const t=tierOf(r),ts=TIERS[t]?.time||"current";
      if(timeF.size>0){let match=timeF.has(ts);if(timeF.has("recent")&&t==="recent")match=true;if(timeF.has("current")&&t==="recent")match=true;if(!match)return false;}
      if(watchedF&&!r.watching)return false;
      // Recently labelled: the shows of the newest Label run or import; a Relabel keeps its show in its run.
      if(labelledF&&(!newestRun||r.labelledAt!==newestRun))return false;
      // Period shows only labelled shows.
      if(periodView&&!periodLabelled(r))return false;
      // Acquiring filters stack as AND across the axes, OR within an axis. Owned beside Wanted or Buy next shows
      // both lists, as two venues do (her decision); Buy next is the part of Wanted she has put in her order.
      if(acqWanted||acqOwned||acqBuyNext){if(!((acqOwned&&r.acquiring==="acquired")||(acqWanted&&r.acquiring==="yes"&&(!acqBuyNext||isBuyNext(r)))||(acqBuyNext&&!acqWanted&&isBuyNext(r))))return false;}
      // The Closing Window count, tapped (her ask): the shows it counts.
      if(closingF&&!inClosingWindow(r))return false;
      // <6 mos and 6-12 mos (her ask): closed up to 6 months ago, and 6 to 12; together, the Closing Window.
      if(acq3mo||acq6mo){if(!((acq3mo&&(t==="fresh"||t==="closing"))||(acq6mo&&t==="urgent")))return false;}
      // Has, No and Digital catalogue widen one another: a card shows when it matches any one chosen.
      if(acqHasCat||acqNoCat||acqDigital){if(!((acqHasCat&&r.looked&&r.hasCatalogue==="yes")||(acqNoCat&&r.looked&&r.hasCatalogue==="no")||(acqDigital&&r.digitalUrl)))return false;}
      return true;
    });
    out.sort((a,b)=>{
      // Buy next is in her own dragged order; the sort chips and the pinned group step aside.
      // Buy next alone is in her own dragged order; with Owned the list sorts like any other.
      if(bnOnly&&bnPeriod)return(dateReversed?-1:1)*periodCompare(a,b,byArtist);
      const sb=bnOnly&&bnDate?"date":sortBy;   // Buy next by date sorts like the Date chip
      if(bnOnly&&!bnDate){const ka=Number.isFinite(a.buyRank)?a.buyRank:-Infinity,kb=Number.isFinite(b.buyRank)?b.buyRank:-Infinity;if(ka!==kb)return kb>ka?1:-1;}
      if(pinTouched&&!bnOnly){const aT=refreshTouched.includes(a.id)?0:1,bT=refreshTouched.includes(b.id)?0:1;if(aT!==bT)return aT-bT;}
      if(sb==="added"){const d=String(b.addedAt||"").localeCompare(String(a.addedAt||""));if(d!==0)return d;}
      if(sb==="labelled"){const d=String(lastLabel(b)).localeCompare(String(lastLabel(a)));if(d!==0)return d;const aL=periodLabelled(a)?1:0,bL=periodLabelled(b)?1:0;if(aL!==bL)return bL-aL;}
      if(sb==="edited"){const d=String(b.editedAt||"").localeCompare(String(a.editedAt||""));if(d!==0)return d;if(!a.editedAt&&!b.editedAt){const aH=a.addedAt?1:0,bH=b.addedAt?1:0;if(aH!==bH)return bH-aH;}}
      if(sb==="venue"){const d=venueRank(a.museumId)-venueRank(b.museumId);if(d!==0)return d;}
      // A second tap on Date or Period turns this whole order upside down, Wanted view included.
      const flip=(sb==="date"||sb==="period")&&dateReversed?-1:1;
      if(sb==="period")return flip*periodCompare(a,b,byArtist);
      const ta=tierOf(a),tb=tierOf(b);
      if(acqWanted&&(ta==="upcoming")!==(tb==="upcoming"))return flip*(ta==="upcoming"?1:-1); // Wanted view: Announced drops to the bottom (nothing to buy yet)
      const oa=TIERS[ta]?.ord??9,ob=TIERS[tb]?.ord??9;
      if(oa!==ob)return flip*(oa-ob);
      const da=a.startDate||a.endDate||"",db=b.startDate||b.endDate||"";
      if(ta==="upcoming")return flip*da.localeCompare(db);
      return flip*db.localeCompare(da);
    });
    return out;
}
//@piece listCounts

function listCounts(rows){const c={total:rows.length,dismissed:0,watched:0,wanted:0,owned:0,pressing:0};for(const r of rows){if(!r.interested){c.dismissed++;continue;}if(r.watching)c.watched++;if(r.acquiring==="yes")c.wanted++;if(r.acquiring==="acquired")c.owned++;if(inClosingWindow(r))c.pressing++;}return c;}
//@piece scrubGroupsOf

// The scrubber's periods: the view's groups in order, each with its first card's place.
function scrubGroupsOf(view,periodView,byArtist){
    if(!periodView)return [];
    const out=[];
    view.forEach((r,i)=>{const k=periodOf(r,byArtist); if(!out.length||out[out.length-1].key!==k)out.push({key:k,name:PERIOD_NAME[k],at:i});});
    return out;
}
//@piece venueScrubGroupsOf

// The scrubber's venues: the view's venues in order (the order Sort by venue gives), each with its first card's place.
function venueScrubGroupsOf(view,venueScrub){
    if(!venueScrub)return [];
    const out=[];
    view.forEach((r,i)=>{const k=venueScrubKey(r.museumId); if(!out.length||out[out.length-1].key!==k)out.push({key:k,name:(MU[r.museumId]||{}).card||r.museumId,at:i});});
    return out;
}
//@piece venueScrubKey

// The mark the scrubber jumps to: a venue's first card in the list.
const venueScrubKey=id=>"venue:"+id;
//@piece themeCounts

// The count a picked Theme chip shows (her design): the cards the list would hold with that theme alone picked,
// every other filter as it stands. One count per picked theme.
function themeCounts(rows,filters,sort,byArtist){
    const out={};
    for(const k of filters.themeF)out[k]=listView(rows,{...filters,themeF:new Set([k])},sort,byArtist).length;
    return out;
}
