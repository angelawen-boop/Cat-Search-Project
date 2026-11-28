//@ The review: its heading and counts, the bands and venues, the last buttons, and the proposal card.
//@piece ProposalCard

// One proposed change: what it is, the decisions she can take, and the buttons for them.
function ProposalCard({ui,p,i,decisions,setCardMode,setChoice,setFieldDec}){
  const{C,decBtn}=ui;
    const dec=decisions[i]||{};
    const infoRow=(label,val)=><div style={{marginBottom:2,overflowWrap:"anywhere"}}><b style={{color:C.ink}}>{label}:</b> {val&&String(val).trim()?val:<span style={{color:C.muted}}>{"\u2014"}</span>}</div>;
    return(
      <div id={"prop-"+i} style={{border:"1px solid "+C.rule,borderRadius:6,background:C.card,padding:"10px 12px",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:600,color:C.ink,marginBottom:4}}>{p.title}</div>


        {p.type==="add"&&<div style={{fontSize:11.5,color:C.ink,lineHeight:1.5}}>
          <div style={{fontWeight:700,marginBottom:3}}>{W.newShow}</div>
          {infoRow(W.dates,dateRange(p.cand))}
          {infoRow(W.description,p.cand.summary)}
          {infoRow(W.linkBox,p.cand.exUrl&&<a href={p.cand.exUrl} target="_blank" rel="noopener noreferrer" style={{color:C.ink}}>{p.cand.exUrl}</a>)}
          {infoRow(W.sortPeriod,periodText(p.cand))}
        </div>}

        {(p.type==="fill"||p.type==="change")&&<div style={{fontSize:11.5,color:C.ink}}>
          <div style={{fontWeight:700,marginBottom:5}}>{W.existingEntry}</div>
          {dec.mode==="addnew"
            ? <div style={{fontStyle:"italic",color:C.action}}>{W.willBeAddedSeparately}</div>
            : p.upd.map((u,j)=>{const fd=(dec.fields||{})[j];return(
                <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
                  <div style={{flex:1,minWidth:0,lineHeight:1.4,overflowWrap:"anywhere"}}><b style={{color:C.ink}}>{u.label}:</b> <span style={{color:C.soft}}>{u.kind==="fill"?say(W.fillValue,{value:u.newVal}):("\u201c"+u.oldVal+"\u201d \u2192 \u201c"+u.newVal+"\u201d")}</span></div>
                  <button onClick={()=>setFieldDec(i,j,"accept")} style={decBtn(fd==="accept",C.okEdge)}>{fd==="accept"?"\u2713 ":""}{W.acceptEdit}</button>
                  <button onClick={()=>setFieldDec(i,j,"reject")} style={decBtn(fd==="reject",C.rejectInk)}>{W.reject}</button>
                </div>
              );})}
        </div>}

        {/* The file disagreed with itself: both values shown, the fuller one ticked as
            a starting point, one tap switches (her decision). */}
        {p.choices&&p.choices.length>0&&<div style={{marginTop:7,paddingTop:6,borderTop:"1px dotted "+C.rule}}>
          <div style={{fontSize:10.5,color:C.soft,lineHeight:1.5,marginBottom:5}}>{W.twoAnswers}</div>
          {p.choices.map((ch,j)=>(
            <div key={j} style={{marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:C.ink,marginBottom:3}}>{ch.label}</div>
              {ch.options.map((opt,k)=>{
                const picked=(dec.choices||{})[ch.field];
                const chosen=(picked===undefined?ch.picked:picked)===opt;
                return(
                  <button key={k} onClick={()=>setChoice(i,ch.field,opt)}
                    style={{...decBtn(chosen,C.okEdge),display:"block",width:"100%",textAlign:"left",marginBottom:3,whiteSpace:"normal",lineHeight:1.4}}>
                    {chosen?"\u2713 ":"\u00a0\u00a0"}{opt&&String(opt).trim()?opt:W.blank}
                  </button>
                );
              })}
            </div>
          ))}
        </div>}

        {p.notes&&p.notes.length>0&&<div style={{marginTop:6,fontSize:10.5,color:C.soft,lineHeight:1.5,borderTop:"1px dotted "+C.rule,paddingTop:5}}>{p.notes.map((n,j)=><div key={j}>{"\u00b7 "}{n}</div>)}</div>}

        {/* Three outcomes: Reject remembers nothing (the row returns next sweep). Never
            add is for rows that should not be entries at all (a talk, an unfoldable
            duplicate, a dead link) — not for a show she is not interested in, which is
            accepted and then dismissed. */}
        {p.type==="add"&&<div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setCardMode(i,"accept")} style={decBtn(dec.mode==="accept",C.okEdge)}>{dec.mode==="accept"?"\u2713 ":""}{W.addNewEntry}</button>
          <button onClick={()=>setCardMode(i,"reject")} style={decBtn(dec.mode==="reject",C.rejectInk)}>{dec.mode==="reject"?"\u2713 ":""}{W.reject}</button>
          <button onClick={()=>setCardMode(i,"never")} style={decBtn(dec.mode==="never",C.neverInk)}>{dec.mode==="never"?"\u2713 ":""}{W.neverAddThis}</button>
        </div>}
        {p.type==="add"&&dec.mode==="never"&&<div style={{marginTop:5,fontSize:10.5,color:C.soft,lineHeight:1.45}}>
          {W.wontBeOffered}
        </div>}

        {p.type==="change"&&<div style={{marginTop:8}}>
          <button onClick={()=>setCardMode(i,"addnew")} style={decBtn(dec.mode==="addnew","#4A5A6B")}>{dec.mode==="addnew"?"\u2713 ":""}{W.differentShow}</button>
        </div>}

      </div>
    );
}
//@piece ReviewHeading

// The review's heading and its two counting sentences.
function ReviewHeading({ui,proposals,reviewSaid,tally}){
  const{C,TH}=ui;
  return(
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.rule}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:500,color:C.ink}}>{say(W.proposedChanges,{n:proposals.length,s:proposals.length===1?"":"s"})}</div>
              {/* The counts, her wording: two sentences, each ending in the number the
                  next starts from (docs/app.md §3). Every term stays — drop one and the
                  arithmetic stops closing. */}
              {tally&&(()=>{
                const cards=tally.add+tally.fill+tally.change;
                const n=(v,tone)=><b style={{color:tone||C.ink}}>{v}</b>;
                return (
                <div style={{fontSize:11.5,color:C.soft,marginTop:6,lineHeight:1.6}}>
                  <div>
                    <Say text={W.tallyRows} gaps={{rows:n(tally.fileRows),s1:tally.fileRows===1?"":"s",markers:n(tally.markers),s2:tally.markers===1?"":"s",
                      blocked:tally.blocked>0&&<Say text={W.tallyBlocked} gaps={{n:n(tally.blocked)}}/>,
                      folded:n(tally.folded),s3:tally.folded===1?"":"s",silent:n(tally.silent),cards:n(cards)}}/>
                  </div>
                  <div style={{marginTop:2}}>
                    <Say text={W.tallyCards} gaps={{cards:n(cards),y:cards===1?"y":"ies",fill:n(tally.fill),change:n(tally.change),add:n(tally.add),s:tally.add===1?"":"s"}}/>
                  </div>
                </div>
                );
              })()}
              {/* Not every new show labelled: said before she decides anything (her ask). */}
              {reviewSaid&&<div style={{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink}}>{reviewSaid}</div>}
            </div>
  );
}
//@piece ReviewBody

// The review's bands and venues: the odd cases first, then the ordinary work.
function ReviewBody({ui,proposals,coverage,decisions,setFieldDec,setCardMode,setChoice,openBands,openVenues,flipBand,flipVenue,setVenuesOpen}){
  const{C,sBtn}=ui;
  const isUndecided=(p,i)=>isUndecidedCard(p,decisions[i]);
              {/* Triage first, then the ordinary work (her decision): odd cases batched
                  by kind, easiest first, so she finishes one kind of thinking at a time.
                  A venue can appear twice on this screen — accepted. */}
                const at=proposals.map((p,i)=>({p,i}));
                const vOrder=m=>{const k=MUSEUMS.findIndex(x=>x.id===m);return k<0?999:k;};
                const byVenue=a=>a.slice().sort((x,y)=>vOrder(x.p.venueId)-vOrder(y.p.venueId));
                // No "unusable" band: a faulty row refuses the whole file (analyzeProForma;
                // qc.js upstream).
                const real    = at;
                // Was this card built from more than one row? Ask the fold's own flag, never
                // the notes — a travelling show's note says "same exhibition" too (fixture 16).
                const isMerged=x=>!!x.p.merged;
                const hasChoice=x=>!!x.p.choices;
                const mergedOnly = byVenue(real.filter(x=>isMerged(x)&&!hasChoice(x)));
                // A conflict is always a fold, so there is no band for a lone disagreement
                // (fixture 17).
                const mergedConf = byVenue(real.filter(x=>hasChoice(x)));
                const plain      = real.filter(x=>!isMerged(x)&&!hasChoice(x));
                // No link at all: usable rows, grouped because the link is the only key for
                // folding and quarantine, so they return fresh every sweep (her decision).
                const noLink     = byVenue(plain.filter(x=>!x.p.cand||!x.p.cand.exUrl));
                const potentialQuarantines  = byVenue(plain.filter(x=>isPotentialQuarantine(x.p)));
                const ordinary   = plain.filter(x=>x.p.cand&&x.p.cand.exUrl&&!isPotentialQuarantine(x.p));
                // Venue subheadings inside each band, in the same style and order as below.
                const byVenueBlocks=list=>allVenues().map(m=>{
                  const grp=list.filter(x=>x.p.venueId===m.id);
                  if(!grp.length)return null;
                  return(
                    <div key={m.id} style={{marginBottom:10}}>
                      <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginBottom:6,fontWeight:600}}>{m.card}</div>
                      {grp.map(({p,i})=><ProposalCard key={i} ui={ui} p={p} i={i} decisions={decisions} setCardMode={setCardMode} setChoice={setChoice} setFieldDec={setFieldDec}/>)}
                    </div>
                  );
                }).filter(Boolean);
                // Every band carries its own count on its header, so collapsing never
                // hides it.
                const bandOpen=(key,dflt)=>openBands[key]===undefined?dflt:openBands[key];
                // A venue with no entry is OPEN. See the state declaration.
                const venueOpen=id=>openVenues[id]!==false;
                const band=(key,title,tone,n,dflt,body)=>{
                  const open=bandOpen(key,dflt);
                  return(
                    <div key={key} style={{marginBottom:10}}>
                      <button onClick={()=>flipBand(key,open)}
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
                // The odd-cases total counts the markers too.
                const oddCount=coverage.length+mergedOnly.length+mergedConf.length+noLink.length;
                const markerBlocks=MUSEUMS.map(m=>{
                  const grp=coverage.filter(cv=>cv.venueId===m.id);
                  if(!grp.length)return null;
                  return(
                    <div key={"cvg"+m.id} style={{marginBottom:10}}>
                      <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginBottom:6,fontWeight:600}}>{m.card}</div>
                      {grp.map((cv,i)=>(
                        <div key={"cv"+i} style={{border:"1px solid "+C.rule,borderRadius:6,padding:"8px 10px",marginBottom:6,background:C.card}}>
                          <div style={{fontSize:12,color:C.ink}}>{cv.what}</div>
                          <div style={{fontSize:11.5,color:C.soft,marginTop:2,lineHeight:1.5}}>{cv.why}</div>
                        </div>
                      ))}
                    </div>
                  );
                }).filter(Boolean);
                return(<div style={{overflow:"auto",padding:"12px 18px",flex:1}}>
                  {oddCount>0&&(
                    <div style={{marginBottom:16,paddingBottom:12,borderBottom:"2px solid "+C.rule}}>
                      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:8}}>{W.oddCases}{"\u00b7"} {oddCount}</div>
                      {coverage.length>0&&band("markers",W.bandMarkers,undefined,coverage.length,false,markerBlocks)}
                      {mergedOnly.length>0&&band("merged",W.bandMerged,undefined,mergedOnly.length,false,byVenueBlocks(mergedOnly))}
                      {mergedConf.length>0&&band("mergedconf",W.bandMergedConflicts,C.accent,mergedConf.length,true,byVenueBlocks(mergedConf))}
                      {noLink.length>0&&band("nolink",W.bandNoLink,undefined,noLink.length,true,byVenueBlocks(noLink))}
                    </div>
                  )}
                  {potentialQuarantines.length>0&&(
                    <div style={{marginBottom:16,paddingBottom:12,borderBottom:"2px solid "+C.rule}}>
                      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:8}}>{W.potentialQuarantines}{"\u00b7"} {potentialQuarantines.length}</div>
                      {byVenueBlocks(potentialQuarantines)}
                    </div>
                  )}
                {ordinary.length>0&&(()=>{
                    // Only venues with ordinary cards, or "Collapse all" would write keys
                    // for empty venues and read the wrong way next click.
                    const venuesHere=allVenues().filter(m=>ordinary.some(x=>x.p.venueId===m.id)).map(m=>m.id);
                    const anyOpen=venuesHere.some(id=>venueOpen(id));
                    return(
                    <div style={{marginBottom:12,display:"flex",alignItems:"flex-end",gap:12,flexWrap:"wrap"}}>
                      <div style={{flex:"1 1 260px",minWidth:0}}>
                        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:C.ink,marginBottom:2}}>{W.normalCases}{"\u00b7"} {ordinary.length}</div>
                        <div style={{fontSize:11.5,color:C.soft,lineHeight:1.55}}>{W.nothingUnusual}</div>
                      </div>
                      <button onClick={()=>{
                          const next={};
                          for(const id of venuesHere) next[id]=!anyOpen;
                          setVenuesOpen(next);
                        }} style={sBtn}>{anyOpen?W.collapseAllVenues:W.expandAllVenues}</button>
                    </div>
                  );})()}
                  {/* Order inside a venue (her decision): fills, then edits, then new;
                      newest closing date first in each; no closing date last. */}
                  {allVenues().map(m=>{
                    const rank={fill:0,change:1,add:2};
                    const grp=ordinary.filter(x=>x.p.venueId===m.id).slice().sort((a,b)=>{
                      const d=(rank[a.p.type]??9)-(rank[b.p.type]??9); if(d!==0)return d;
                      const ae=a.p.cand&&a.p.cand.endDate, be=b.p.cand&&b.p.cand.endDate;
                      if(!ae&&!be)return 0; if(!ae)return 1; if(!be)return -1;
                      return be.localeCompare(ae);
                    });
                    if(!grp.length)return null;
                    // The venue heading is the control (docs/app.md §3 "Screen rulings").
                    const vOpen=venueOpen(m.id);
                    return(
                    <div key={m.id} style={{marginBottom:14}}>
                      <button onClick={()=>flipVenue(m.id,vOpen)}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",background:"none",
                                border:"none",borderBottom:"1px solid "+C.rule,padding:"6px 0",marginBottom:8,cursor:"pointer",color:C.accent}}>
                        <span style={{fontSize:10,lineHeight:1,width:10,display:"inline-block",transform:vOpen?"rotate(90deg)":"none",transition:"transform .12s"}}>{"\u25B6"}</span>
                        <span style={{fontSize:14,letterSpacing:"0.01em",fontWeight:700}}>{m.card}</span>
                        <span style={{fontSize:12,fontWeight:700}}>{"\u00b7"} {grp.length}</span>
                        {/* The undecided count per venue, only where there is work: a
                            closed venue still declares what it holds; a "0" is clutter
                            (her decision). */}
                        {(()=>{const u=grp.filter(({p,i})=>isUndecided(p,i)).length;
                          return u>0?<span style={{fontSize:11,fontWeight:600,color:C.soft}}>{say(W.venueToDecide,{n:u})}</span>:null;})()}
                      </button>
                      {vOpen&&grp.map(({p,i})=><ProposalCard key={i} ui={ui} p={p} i={i} decisions={decisions} setCardMode={setCardMode} setChoice={setChoice} setFieldDec={setFieldDec}/>)}
                    </div>
                  );})}
                </div>);
}
//@piece ReviewButtons

// The review's last row: Cancel import, what is decided, the partial apply and the last button.
function ReviewButtons({ui,proposals,decisions,cancelRefresh,askPartialApply,proceedRefresh,venuesToConfirm}){
  const{C,sBtn,pBtn}=ui;
  const{acceptedCount,undecidedCount,quarantinedCount,rejectedCount}=countDecisions(proposals,decisions);
  return(
            <div style={{padding:"12px 18px",borderTop:"1px solid "+C.rule,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={cancelRefresh} style={sBtn}>{W.cancelImport}</button>
              {/* Rejected and quarantined are named only when there is one (her ask);
                  what is named adds up to what is decided. */}
              <span style={{fontSize:11.5,color:C.soft,marginLeft:"auto"}}>
                {(rejectedCount?say(W.nRejected,{n:rejectedCount}):"")+(quarantinedCount?say(W.nQuarantined,{n:quarantinedCount}):"")+say(W.nToApply,{n:acceptedCount})}</span>
              {/* No separate "N to decide" link here (her decision: clutter) — the venue
                  headings say where the cards are. */}
              {/* Every card must be decided before the ledger moves — a hard block, her
                  permanent design (docs/app.md §3). The button says what is missing. */}
              {/* ===== PARTIAL APPLY — stays until she says (CLAUDE.md §5.1) =====
                  Beside the block, never instead of it: drawn only when some cards are
                  decided and some are not (offerPartialApply). It asks first, in her
                  wording (partialApplyWords), naming what is left behind and the way back. To
                  remove it: this block, `partial` on applyRefresh and applyCards,
                  offerPartialApply, partialApplyWords, fixture 18h. */}
              {offerPartialApply({acceptedCount,undecidedCount})&&<button
                onClick={()=>askPartialApply(acceptedCount,undecidedCount)}
                title={partialApplyWords({acceptedCount,undecidedCount}).hover}
                style={{...sBtn,borderColor:C.accent,color:C.accent,fontWeight:600}}>
                {partialApplyWords({acceptedCount,undecidedCount}).button}</button>}
              {/* ===== end partial apply block ===== */}
              {/* "Next" when a new venue's shop is still to confirm (her design): the
                  ledger moves only after the shop screen. */}
              <button onClick={()=>proceedRefresh(false)} disabled={undecidedCount>0}
                title={undecidedCount>0?say(W.decideEveryCard,{n:undecidedCount}):""}
                style={{...pBtn,...(undecidedCount>0?{background:C.muted,cursor:"not-allowed",opacity:1}:{})}}>
                {undecidedCount>0
                  ? say(W.stillToDecide,{n:undecidedCount})
                  : venuesToConfirm().length?W.next:W.goAhead}</button>
            </div>
  );
}
//@piece ReviewPanel

// The review screen. It stays mounted between imports and draws nothing without a review, so the bands
// and venues she opened stay open from one review to the next.
function ReviewPanel({ui,proposals,reviewSaid,tally,coverage,decisions,setFieldDec,setCardMode,setChoice,cancelRefresh,askPartialApply,proceedRefresh,venuesToConfirm}){
  const{C}=ui;
  // Which triage bands are open: set by what a band asks of her, never its size —
  // markers and combined-for-you open closed; the count shows either way.
  const[openBands,setOpenBands]=useState({});
  // Which venues are open in normal cases. Undefined = OPEN, so a venue is never hidden
  // by default. "Collapse all" writes false for each venue, so opening one later does
  // not reopen the rest.
  const[openVenues,setOpenVenues]=useState({});
  const flipBand=(key,open)=>setOpenBands(o=>({...o,[key]:!open}));
  const flipVenue=(id,open)=>setOpenVenues(o=>({...o,[id]:!open}));
  const setVenuesOpen=next=>setOpenVenues(o=>({...o,...next}));
  if(!proposals)return null;
  return(
        <div style={{position:"fixed",inset:0,background:"rgba(20,18,16,0.5)",zIndex:1100,display:"flex",flexDirection:"column",padding:16}}>
          <div style={{background:C.bg,borderRadius:8,maxWidth:820,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
            <ReviewHeading ui={ui} proposals={proposals} reviewSaid={reviewSaid} tally={tally}/>
            <ReviewBody ui={ui} proposals={proposals} coverage={coverage} decisions={decisions} setFieldDec={setFieldDec} setCardMode={setCardMode} setChoice={setChoice} openBands={openBands} openVenues={openVenues} flipBand={flipBand} flipVenue={flipVenue} setVenuesOpen={setVenuesOpen}/>
            <ReviewButtons ui={ui} proposals={proposals} decisions={decisions} cancelRefresh={cancelRefresh} askPartialApply={askPartialApply} proceedRefresh={proceedRefresh} venuesToConfirm={venuesToConfirm}/>
          </div>
        </div>
  );
}
