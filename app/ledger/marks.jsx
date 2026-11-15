//@ What each mark on a card does to the ledger: plain functions, (rows, id, …) → rows; the same rows when nothing changes.
//@piece markRow

// Applies one change to the row with this id; the same rows when no row has it.
function markRow(rows,id,change){
  return rows.some(r=>r.id===id)?rows.map(r=>r.id===id?change(r):r):rows;
}
//@piece markDismiss

// Dismiss: the show is set aside (the screen keeps the undo bar and its timer).
function markDismiss(rows,id){return markRow(rows,id,r=>({...r,interested:false}));}
//@piece markRestore

// Restore, and the undo of a dismiss: the show is back.
function markRestore(rows,id){return markRow(rows,id,r=>({...r,interested:true}));}
//@piece markWatch

function markWatch(rows,id){return markRow(rows,id,r=>({...r,watching:!r.watching}));}
//@piece markAcquiring

// Leaving Yes clears the buy-next dot and its place in her order: it marks a wanted book only.
function markAcquiring(rows,id,v){return markRow(rows,id,r=>{const a=r.acquiring===v?null:v,bn=a==="yes"&&!!r.buyNext;return{...r,acquiring:a,buyNext:bn,buyRank:bn?(r.buyRank??null):null};});}
//@piece markBuyNext

// A newly marked card goes to the top of her Buy next order (highest buyRank first).
function markBuyNext(rows,id){const top=rows.reduce((m,r)=>r.buyNext&&Number.isFinite(r.buyRank)?Math.max(m,r.buyRank):m,0);
  return markRow(rows,id,r=>({...r,buyNext:!r.buyNext,buyRank:r.buyNext?null:top+1}));}
//@piece markBuyNextMove

// A drop in the Buy next view: the card lands before the shown card it was dropped above
// (else after the one below it), across every Buy next card, hidden ones included, then
// all are renumbered. Not an edit: editedAt is untouched (her decision). `shownIds` is the
// order on screen, as a plain list of ids.
function markBuyNextMove(rows,id,beforeId,afterId,shownIds){
  const shown=new Map(shownIds.map((x,i)=>[x,i])),key=r=>Number.isFinite(r.buyRank)?r.buyRank:-Infinity;
  const all=rows.filter(isBuyNext).sort((a,b)=>key(b)-key(a)||(shown.get(a.id)??1e9)-(shown.get(b.id)??1e9)).map(r=>r.id);
  const order=all.filter(x=>x!==id);let at=beforeId?order.indexOf(beforeId):afterId?order.indexOf(afterId)+1:-1;if(at<0)at=order.length;
  order.splice(at,0,id);const rank=new Map(order.map((x,i)=>[x,order.length-i]));
  return rows.map(r=>rank.has(r.id)?{...r,buyRank:rank.get(r.id)}:r);}
//@piece markPick

// Her pick on a card with several versions (pickRow): the card's book follows it.
function markPick(rows,id,i,now){ const r=rows.find(x=>x.id===id); const next=r&&pickRow(r,i,now); return next&&next!==r?rows.map(x=>x.id===id?next:x):rows; }
//@piece markDigital

// Her digital catalogue link, already checked as a link; the same link leaves the card as it was.
function markDigital(rows,id,href,now){ const r=rows.find(x=>x.id===id); return r&&r.digitalUrl!==href?rows.map(x=>x.id===id?{...x,digitalUrl:href,editedAt:now}:x):rows; }
//@piece markKeepPeriod

// Do not regroup: Claude's answer stands for this show until its next Relabel (her design).
function markKeepPeriod(rows,id,now){ return markRow(rows,id,x=>({...x,periodKeep:true,editedAt:now})); }
