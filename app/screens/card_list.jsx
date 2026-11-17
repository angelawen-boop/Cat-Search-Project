//@ The list of cards, with its dividers and the Buy next drag wrapper.
//@piece CardList

// The list of cards: the empty state, the period and band dividers, each card (and the Buy next drag wrapper) and the "more" marker.
function CardList({ui,view,sort,bnOnly,periodView,venueScrub,byArtist,drawLimit,cardState,dragOn,drag,startDrag,cardAct,moreRef}){
  const{C,TH,chip,pBtn,lnk}=ui;
  const{sortBy,pinTouched,refreshTouched}=sort;
  const{busyId,busy,rechecking,lookLabel,recheckSaid,relabelId,digitalBox,openCards}=cardState;
  return(
      <div data-card-list="1" style={{maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
        {view.length===0&&<div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:5,padding:18,fontSize:12.5,color:C.soft}}>{W.nothingMatches}</div>}
        {(()=>{
          const pinnedCount=pinTouched&&!bnOnly?view.filter(x=>refreshTouched.includes(x.id)).length:0;
          // Band headers for the "recently" sorts (only when not in the post-import pinned snapshot).
          const bandMode=(!pinTouched&&!bnOnly&&(sortBy==="added"||sortBy==="edited"||sortBy==="labelled"))?sortBy:null;
          const newestAdd=bandMode==="added"?(view.find(x=>x.addedAt)?.addedAt||null):null;
          const newestEdit=bandMode==="edited"?(view.find(x=>x.editedAt)?.editedAt||null):null;
          const newestLabel=bandMode==="labelled"?(lastLabel(view.find(x=>lastLabel(x)))||null):null;
          const bandOf=(x)=>{
            if(bandMode==="added")return !x.addedAt?"seed":(x.addedAt===newestAdd?"add_this":"add_earlier");
            if(bandMode==="edited")return x.editedAt?(x.editedAt===newestEdit?"ed_this":"ed_earlier"):(x.addedAt?"ed_never":"seed");
            // A show labelled before this sort existed has no labelledAt: stage 1.
            if(bandMode==="labelled")return lastLabel(x)?(lastLabel(x)===newestLabel?"lab_this":"lab_earlier"):(periodLabelled(x)?"lab_stage1":"lab_never");
            return null;
          };
          const BAND_LABEL={add_this:W.bandThisImport,add_earlier:W.bandEarlierImports,seed:W.bandOriginalSet,ed_this:W.bandThisImportsEdits,ed_earlier:W.bandEarlierEdits,ed_never:W.bandNeverEdited,lab_this:W.bandThisLabelling,lab_earlier:W.bandEarlierLabellings,lab_stage1:W.bandStage1,lab_never:W.bandNotLabelled};
          const bandDivider=(txt,pk)=><div data-period={pk} style={{display:"flex",alignItems:"center",gap:8,margin:"2px 2px",color:C.soft}}><div style={{flex:1,height:1,background:C.rule}}/><span style={{fontSize:9.5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{txt}</span><div style={{flex:1,height:1,background:C.rule}}/></div>;
          return view.slice(0,drawLimit).map((r,i)=>{
          const brk=(pinTouched&&pinnedCount>0&&pinnedCount<view.length&&i===pinnedCount)?bandDivider(W.bandRestOfList):null;
          let header=null;
          if(periodView&&(i===0||periodOf(view[i-1],byArtist)!==periodOf(r,byArtist)))header=bandDivider(PERIOD_NAME[periodOf(r,byArtist)],periodOf(r,byArtist));
          if(bandMode){const b=bandOf(r);const pb=i>0?bandOf(view[i-1]):null;if(b!==pb)header=bandDivider(BAND_LABEL[b]||"");}
          const lead=brk||header;
          const isBusy=busyId===r.id;
          const card=<LedgerCard r={r} mu={MU[r.museumId]} isOpen={!!openCards[r.id]} isBusy={isBusy} busy={busy} rechecking={isBusy&&rechecking} lookLabel={isBusy?lookLabel:null}
              said={recheckSaid&&recheckSaid.id===r.id?recheckSaid:null} relabelling={relabelId===r.id} digitalOpen={digitalBox===r.id} C={C} TH={TH} chip={chip} pBtn={pBtn} lnk={lnk} act={cardAct}/>;
          // The venue scrubber's mark: a venue's first card, wrapped so the scrubber can find and jump to it.
          if(venueScrub&&(i===0||view[i-1].museumId!==r.museumId))return <React.Fragment key={r.id}>{lead}<div data-period={venueScrubKey(r.museumId)}>{card}</div></React.Fragment>;
          if(!dragOn||!isBuyNext(r))return <React.Fragment key={r.id}>{lead}{card}</React.Fragment>;
          // The lifted card follows the finger; the cards it passes slide aside by its height.
          let ds={userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",cursor:"grab"};
          if(drag&&r.id===drag.id)ds={...ds,position:"relative",zIndex:5,transform:"translateY("+drag.dy+"px) scale(1.02)",boxShadow:"0 6px 18px rgba(0,0,0,0.28)",borderRadius:5,cursor:"grabbing"};
          else if(drag){const j=i<drag.from?i:i-1,f=j<drag.to?j:j+1;ds={...ds,transform:"translateY("+((f-i)*(drag.h+10))+"px)",transition:"transform 150ms ease"};}
          return <div key={r.id} data-buynext={r.id} onMouseDown={e=>startDrag(e,r.id)} onTouchStart={e=>startDrag(e,r.id)} onContextMenu={e=>e.preventDefault()} style={ds}>{card}</div>;
        });})()}
        {view.length>drawLimit&&<div ref={moreRef} style={{height:1}}/>}
      </div>
  );
}
