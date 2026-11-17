//@ The tools row, the Cloud Saves drawer, and the Quarantine list with the Reset cards drawer.
//@piece ToolsRow

// The tools row at the foot of the page: Label, Clear search, Cloud Saves and Quarantine.
function ToolsRow({ui,requestReset,labelLedger,toggleResetCards,toggleCloudSaves,toggleQuarantine}){
  const{C}=ui;
  return(<>
      {/* Quarantine lives down here, right-aligned on the starter-set line (her decision). */}
      <div style={{maxWidth:760,margin:"18px auto 0",paddingTop:10,borderTop:"1px solid "+C.rule,fontSize:10,color:C.soft,lineHeight:1.6,display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
        {/* Two buttons on the left, no sentence (her decision), spaced like the drawers on the right. */}
        <span style={{display:"flex",gap:14}}>
          {/* Reset to Seed is unwired from her page (her decision), requestReset kept; drawn only for the tests. */}
          {typeof window!=="undefined"&&window.__catWatchTest&&<button onClick={requestReset} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.resetToSeed}</button>}
          <button onClick={labelLedger} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.label}</button>
          <button onClick={toggleResetCards} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.clearSearch}</button>
        </span>
        <span style={{marginLeft:"auto",display:"flex",gap:14}}>
          {/* Cloud Saves sit beside Quarantine, in the same type, always drawn — a control
              that appears only with something to show can't say "none yet" (her decision). */}
          <button onClick={toggleCloudSaves} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.cloudSaves}</button>
          {/* Quarantine's link is always drawn too (her catch): an empty one vanished. */}
          {<button onClick={toggleQuarantine} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.quarantine}</button>}
        </span>
      </div>
  </>);
}
//@piece CloudSaves

// The Cloud Saves drawer: the saved copies, Download and Roll back.
function CloudSaves({ui,showSnaps,snaps,snapWhy,snapBusy,downloadSnapshot,requestRollback}){
  const{C}=ui;
  return(
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {showSnaps&&<div style={{marginTop:6,padding:"10px 12px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* A list, like Quarantine (her design): copies come from Save and the two
              automatic safety copies. */}
          <div style={{fontSize:12,color:C.ink,marginBottom:8,lineHeight:1.55}}>
            {snaps&&snaps.length>0&&<b>{say(W.cloudSavesCount,{n:snaps.length,s:snaps.length===1?"":"s"})}</b>}
            {W.cloudSavesLead}
          </div>
          {snapWhy&&<div style={{fontSize:12,fontWeight:600,color:C.warnInk,background:C.warnBg,border:"1px solid "+C.warnEdge,borderRadius:4,padding:"5px 8px",marginBottom:8}}>{snapWhy}</div>}
          {snaps===null?<div style={{fontSize:12,color:C.soft}}>{W.readingCloudSaves}</div>
          :snaps.length===0?<div style={{fontSize:12,color:C.soft}}>{W.noCloudSaves}</div>
          :snaps.map(s=>(
            <div key={s.id} style={{display:"flex",gap:10,fontSize:12.5,color:C.ink,padding:"5px 0",alignItems:"baseline",borderTop:"1px dotted "+C.rule,flexWrap:"wrap"}}>
              {/* One width for every time (her ask): 15em fits the longest, with
                  even-width digits. */}
              <span style={{flex:"0 0 auto",minWidth:"15em",fontWeight:600,whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>{localReadable(s.at)}</span>
              {/* No "automatic" tag (her decision): her own copies are marked by her
                  description in bold. */}
              <span style={{flex:"1 1 160px"}}>{s.kind!=="safety"&&s.label?<Say text={W.exportLabel} gaps={{label:<b>{s.label}</b>}}/>:snapTitle(s,snaps)}<span style={{color:C.soft}}>{say(W.snapRows,{n:s.rows})}</span>{s.filename&&<span style={{display:"block",fontSize:11,color:C.soft,wordBreak:"break-all"}}>{s.filename}</span>}</span>
              <button onClick={()=>downloadSnapshot(s)} style={{background:"none",border:"none",color:C.action,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>{W.download}</button>
              <button onClick={()=>requestRollback(s)} disabled={snapBusy} style={{background:"none",border:"none",color:C.accent,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>{W.rollBack}</button>
            </div>
          ))}
        </div>}
      </div>
  );
}
//@piece ResetAndQuarantine

// The Quarantine list and the Reset cards drawer.
function ResetAndQuarantine({ui,rows,showIgnored,ignored,ignoredByVenue,quarWhy,showResetCards,resetQuery,typeResetQuery,askResetCard,releaseFromQuarantine}){
  const{C,chip}=ui;
  return(
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {showIgnored&&ignored.length===0&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4,fontSize:12,color:C.soft}}>{quarWhy?say(W.quarantineUnread,{why:quarWhy}):W.quarantineEmpty}</div>}
        {/* Reset cards (her design): find a card by typing, pick it, confirm; its catalogue
            result is cleared (resetCard) and it shows "Find catalogue" again. Her marks
            stay. One card per confirm. */}
        {showResetCards&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          <input value={resetQuery} onChange={e=>typeResetQuery(e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/>
          {resetQuery.trim()&&(()=>{
            const hits=cardsToReset(rows,resetQuery);
            if(!hits.length)return <div style={{fontSize:12,color:C.soft,marginTop:8}}>{W.noSearchedCards}</div>;
            return hits.map(r=>(
              <div key={r.id} style={{display:"flex",gap:10,fontSize:12.5,color:C.ink,padding:"4px 0",alignItems:"baseline",marginTop:4}}>
                <span style={{minWidth:130,fontWeight:600}}>{MU[r.museumId]?MU[r.museumId].card:r.museumId}</span>
                <button onClick={()=>askResetCard(r.id)} style={{flex:1,textAlign:"left",background:"none",border:"none",color:C.action,fontSize:12.5,fontFamily:"inherit",textDecoration:"underline",cursor:"pointer",padding:0}}>{r.title}</button>
              </div>));
          })()}
        </div>}
        {showIgnored&&ignored.length>0&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* Big enough to read (her decision): decisions she may need to undo, in body
              ink, at chip size or above. */}
          <div style={{fontSize:12,color:C.ink,marginBottom:8,lineHeight:1.55}}>
            {/* The count lives in here (her decision); the footer button just says Quarantine. */}
            <b>{say(W.inQuarantine,{n:ignored.length})}</b>{W.quarantineLead}
          </div>
          {/* By venue only (her decision): venues in the app's order, titles A–Z. */}
          {ignoredByVenue.map(x=>(
            <div key={x.key} style={{display:"grid",gridTemplateColumns:"minmax(60px,0.7fr) minmax(0,2fr) auto",gap:10,fontSize:12.5,color:C.ink,padding:"4px 0",alignItems:"baseline"}}>
              <span style={{fontWeight:600}}>{MU[x.venueId]?MU[x.venueId].card:x.venueId}</span>
              <span>{x.title||W.noTitle}</span>
              <button onClick={()=>releaseFromQuarantine(x)} style={{background:"none",border:"none",color:C.action,fontSize:12.5,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>{W.remove}</button>
            </div>
          ))}
        </div>}
      </div>
  );
}
