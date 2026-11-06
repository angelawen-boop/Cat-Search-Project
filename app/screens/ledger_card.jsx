//@ An exhibition card, its digital-catalogue link and its catalogue box.
//@piece DigitalLink

// Her digital catalogue (`digitalUrl`: a PDF or online catalogue she pasted in; her design): the link
// button's shape on a green ground, last in the row. Kept through Search again, Re-check and Reset cards.
function DigitalLink({r,C,lnk}){
  return r.digitalUrl?<a href={r.digitalUrl} target="_blank" rel="noopener noreferrer" style={{...lnk,background:C.okBg,border:"1px solid "+C.okEdge,color:C.okInk}}>Digital catalogue {"\u2197"}</a>:null;
}
//@piece LedgerCard


// ONE LEDGER CARD. Memoised: a mark redraws only the card it changed, so every prop
// must keep its identity between renders (act, chip, pBtn, lnk, TH are held stable in App;
// a venue's MU entry is replaced, never edited, so `mu` changes when its shop does).
const LedgerCard=React.memo(function LedgerCard({r,mu,isOpen,isBusy,busy,rechecking,lookLabel,said,relabelling,digitalOpen,C,TH,chip,pBtn,lnk,act}){
  const t=tierFor(r),tier=TH[t],mo=moSince(r.endDate),noCat=r.looked&&r.hasCatalogue==="no",isAcq=r.acquiring==="acquired",dismissed=!r.interested;
  const searchingLabel=lookLabel||"Searching\u2026";
  // Two buttons share one busy row; only the one pressed shows progress.
  const againLabel=isBusy&&!rechecking?searchingLabel:"Search again";
  const recheckLabel=isBusy&&rechecking?searchingLabel:"Re-check museum shop";
  // No shop at all (Borghese, Capodimonte, the Accademia; her decision): no
  // Re-check button, and the line says only "Venue has no shop."
  const noShop=!(mu&&(mu.shopSearch||mu.shopHome));
  // "Digital catalogue" (her design): an empty box every time; her link, taken on Enter or on leaving
  // the box, replaces any before it. Escape closes it.
  const digitalBox=digitalOpen&&<input autoFocus defaultValue="" onKeyDown={e=>{ if(e.key==="Enter")act("setDigital",r.id,e.target.value); else if(e.key==="Escape"){ e.target.value=""; act("closeDigital"); } }}
    onBlur={e=>act("setDigital",r.id,e.target.value)}
    style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"5px 8px",fontSize:12.5,border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontFamily:"inherit"}}/>;
  // Her version blocks, on a card with two or more versions (versionBlocks); with
  // nothing picked (a card searched before her order) the card shows no book, no
  // status lines and only the shop button.
  const vl=r.looked&&r.hasCatalogue==="yes"?versionBlocks(r):null;
  const picked=!vl||(Number.isInteger(r.editionPick)&&!!r.editions[r.editionPick]);
  if(dismissed)return(
    <article style={{background:C.dim,border:"1px solid "+C.rule,borderLeft:"4px solid "+C.muted,borderRadius:5,padding:"10px 14px",opacity:0.55}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
        <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft}}>{mu?.card}</span>
        <button onClick={()=>act("restore",r.id)} style={{background:"none",border:"1px solid "+C.action,borderRadius:3,color:C.action,fontSize:10,fontWeight:500,cursor:"pointer",padding:"2px 8px"}}>Restore</button>
      </div>
      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,fontWeight:500,marginTop:3,color:C.soft}}>{r.title}</div>
      <div style={{fontSize:10.5,color:C.muted,marginTop:2}}>{dateRange(r)}</div>
    </article>
  );
  return(
    <article style={{background:C.card,border:"1px solid "+C.rule,borderLeft:"4px solid "+(noCat?C.muted:isAcq?C.owned:tier.ink),borderRadius:5,overflow:"hidden"}}>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
          <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginTop:2}}>{mu?.card}</span>
          {/* No "No catalogue" tag (her decision): the corner says how long ago the
              show closed; the Catalogue button carries the cross. */}
          {isAcq?<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:C.owned,background:C.ownedBg,padding:"2px 7px",borderRadius:3}}>Owned</span>
          :<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:tier.ink,background:tier.wash,padding:"2px 7px",borderRadius:3}}>{tier.label}</span>}
        </div>
        <div style={{display:"flex",alignItems:"baseline",gap:0,marginTop:5}}>
          <h3 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:18,lineHeight:1.2,fontWeight:500,margin:0,letterSpacing:"-0.01em",flex:1}}>
            {r.title}
            {r.exUrl&&<a href={r.exUrl} target="_blank" rel="noopener noreferrer" style={{color:C.action,textDecoration:"none",marginLeft:5,fontSize:13,fontWeight:400}}>{"\u2197"}</a>}
          </h3>
          <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:8,flexShrink:0}}>
            {r.acquiring==="yes"&&(()=>{const k=starInk();return <button onClick={()=>act("toggleBuyNext",r.id)} title={r.buyNext?"Not buying next":"Buy next"} style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:16,lineHeight:1}}><svg width={k.D} height={k.D} style={{display:"inline-block",verticalAlign:k.v}} aria-hidden="true"><circle cx={k.D/2} cy={k.D/2} r={k.D/2-0.75} fill={r.buyNext?C.buyNext:"none"} stroke={r.buyNext?C.buyNext:C.muted} strokeWidth="1.5"/></svg></button>;})()}
            <button onClick={()=>act("toggleWatch",r.id)} title={r.watching?"Unwatch":"Watch"} style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:16,lineHeight:1,color:r.watching?C.star:C.muted}}>{r.watching?"\u2605":"\u2606"}</button>
            {!isAcq&&<button onClick={()=>act("dismiss",r.id)} title="Not interested" style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:18,lineHeight:1,color:C.muted}}>{"\u00d7"}</button>}
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
                <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",paddingTop:8,borderTop:"1px solid "+C.rule}}>
          <span style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:C.soft}}>Want the catalogue?</span>
          <button onClick={()=>act("setAcq",r.id,"yes")} style={chip(r.acquiring==="yes")}>Yes</button>
          <button onClick={()=>act("setAcq",r.id,"no")} style={chip(r.acquiring==="no")}>No</button>
          <button onClick={()=>act("setAcq",r.id,"acquired")} style={chip(r.acquiring==="acquired")}>Acquired</button>
          <button onClick={()=>act("toggleOpen",r.id)} style={{marginLeft:"auto",background:"none",border:"none",color:C.action,fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 0"}}>
            {isOpen?"Hide":(r.looked&&r.hasCatalogue==="yes")?"\u2713 Catalogue"+(r.digitalUrl?" + digital":""):(r.looked&&r.hasCatalogue==="no")?(r.digitalUrl?"\u2717 Catalogue \u2014 digital only":"\u2717 Catalogue"):"Catalogue"}
          </button>
        </div>
      </div>
      {isOpen&&(
        <div style={{background:C.panel,borderTop:"1px solid "+C.rule,padding:"12px 14px"}}>
          {!r.looked?(
            <div>
              <p style={{fontSize:12,color:C.soft,margin:"0 0 8px"}}>No catalogue search run yet.</p>
              <button onClick={()=>act("findOneCat",r.id)} disabled={busy} style={{...pBtn,padding:"6px 12px",fontSize:12}}>{isBusy?searchingLabel:"Find catalogue"}</button>
              {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
            </div>
          ):noCat?(
            <CatalogueNone r={r} mu={mu} C={C} TH={TH} lnk={lnk} actions={<>
              <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
                <button onClick={()=>act("findOneCat",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{againLabel}</button>
                {!noShop&&<button onClick={()=>act("recheckShop",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{recheckLabel}</button>}
                <button onClick={()=>act("openDigital",r.id)} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>Digital catalogue</button>
              </div>
              {digitalBox}
              {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
              </>}/>
          ):(
            <CatalogueBox r={r} mu={mu} C={C} TH={TH} lnk={lnk} isAcq={isAcq} noShop={noShop} vl={vl} picked={picked}
              onPick={i=>act("setPick",r.id,i)} actions={<>
              <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:14}}>
                <button onClick={()=>act("findOneCat",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{againLabel}</button>
                {!noShop&&<button onClick={()=>act("recheckShop",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{recheckLabel}</button>}
                <button onClick={()=>act("openDigital",r.id)} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>Digital catalogue</button>
              </div>
              {digitalBox}
              {said&&<div style={{marginTop:6,fontSize:11,color:said.failed?TH.urgent.ink:C.soft,fontWeight:said.failed?700:400}}>{said.text}</div>}
              </>}/>
          )}
          {/* Relabel, on its own line at the foot of the drawer (her design; the Period trial). */}
          <div style={{marginTop:10}}>
            <button onClick={()=>act("relabel",r.id)} disabled={busy||relabelling} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{relabelling?"Relabelling\u2026":"Relabel"}</button>
            {said&&said.regrouped&&<button onClick={()=>act("keepPeriod",r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0,marginLeft:14}}>Do not regroup</button>}
          </div>
        </div>
      )}
    </article>
  );
});
//@piece CatalogueBox


// THE CATALOGUE BOX: a found catalogue in the card's drawer — the shop line, the book (or her
// version blocks) and the buy buttons. One copy, drawn by the app and by the Catalogue Blocks
// Check page; `actions` is the Search again / Re-check row the caller draws.
function CatalogueBox({r,mu,C,TH,lnk,isAcq,noShop,vl,picked,onPick,actions}){
  return(
    <div>
      {/* A missing button cannot report anything, so the card says what the
          publisher step concluded (publisherNote). "Now" and "Back" are the
          same green as the plain sentence (her decision): the word carries
          the news. */}
      {picked&&<>
      {r.shopState==="shop"&&<div style={{fontSize:11,marginBottom:6}}>
        <span style={{color:C.action,fontWeight:600}}>{shopHeadline(r.shopState,r.shopChange)}</span>
        {publisherNote(r.publisherResult,!!r.publisherUrl)&&<span style={{color:C.soft}}> {publisherNote(r.publisherResult,!!r.publisherUrl)}</span>}
      </div>}
      {/* Gone, link kept as "Museum shop (last seen)" (her design): a restock
          usually returns to the same address. Dark red from the "closed over
          a year" ink, never a loose hex. */}
      {r.shopState==="gone"&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>
        {/* The headline alone (her ask). */}
        <span style={{color:TH.lapsed.ink,fontWeight:700}}>{shopHeadline(r.shopState,r.shopChange)}</span>
        {publisherNote(r.publisherResult,!!r.publisherUrl)&&(" "+publisherNote(r.publisherResult,!!r.publisherUrl))}
      </div>}
      {/* The dash is a JS string: a bare — in JSX text prints those
          six characters. */}
      {r.shopState==="web"&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>
        {noShop?(MU[r.museumId]&&MU[r.museumId].shopUnknown?"Museum shop not found.":"Venue has no shop.")
          :"Not in the museum shop \u2014 shop link opens the general store."}
        {publisherNote(r.publisherResult,!!r.publisherUrl)&&(" "+publisherNote(r.publisherResult,!!r.publisherUrl))}
      </div>}
      {shopUnread(r.shopState)&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>
        <span style={{color:TH.lapsed.ink,fontWeight:700}}>{shopUnreadHead(r.shopState)}</span>{SHOP_BLOCKED_FOUND_REST}
        {publisherNote(r.publisherResult,!!r.publisherUrl)&&(" "+publisherNote(r.publisherResult,!!r.publisherUrl))}
      </div>}
      </>}
      {vl?(
        // Each block is the single-book block, the marker in its own column; the
        // whole block picks it. Blocks never move when she picks.
        <div role="radiogroup" aria-label="Versions" style={{marginBottom:10}}>
          {vl.map((b,k)=>(
            <div key={b.i} role="radio" aria-checked={b.picked} tabIndex={0} onClick={()=>onPick(b.i)}
              onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); onPick(b.i); } }}
              style={{display:"flex",alignItems:"flex-start",gap:10,padding:k?"11px 0":"2px 0 11px",borderTop:k?"1px solid "+C.rule:"none",cursor:b.picked?"default":"pointer"}}>
              <span style={{flex:"none",width:14,fontSize:13,lineHeight:1.3,color:C.ink}}>{b.picked?"\u25cf":"\u25cb"}</span>
              <div style={{flex:1,minWidth:0}}>
                {b.title&&<div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:14.5,fontWeight:500,marginBottom:2,lineHeight:1.3}}>{b.title}</div>}
                {b.publisher&&<div style={{fontSize:11,color:C.soft,marginBottom:2,lineHeight:1.4}}>{b.publisher}</div>}
                <div style={{fontSize:11.5,fontFamily:"ui-monospace,monospace",lineHeight:1.5,color:b.isbn?C.ink:C.soft}}>
                  {b.isbn?<>ISBN <span style={{whiteSpace:"nowrap"}}>{b.isbn}</span>{b.also&&<>; <span style={{whiteSpace:"nowrap"}}>{b.also.isbn}</span> ({b.also.whose})</>}</>
                    :"ISBN not confirmed \u2014 verify before buying"}
                </div>
                {b.facts&&<div style={{fontSize:11,color:C.soft,marginTop:2,marginBottom:2,lineHeight:1.4}}>{b.facts}</div>}
                {(b.why||b.source)&&<div style={{fontSize:11,color:C.soft,marginTop:3,lineHeight:1.45}}>
                  {b.why}{b.source&&<>{b.why?" ":""}Source: <a href={b.source.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{color:C.soft}}>{b.source.host}</a></>}
                </div>}
              </div>
            </div>
          ))}
        </div>
      ):(<>
        {r.catalogueTitle&&<div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:14.5,fontWeight:500,marginBottom:2,lineHeight:1.3}}>{r.catalogueTitle}</div>}
        {r.publisher&&<div style={{fontSize:11,color:C.soft,marginBottom:2}}>{r.publisher}</div>}
        <div style={{fontSize:11.5,fontFamily:"ui-monospace,monospace",marginBottom:englishLine(r)?2:10,color:r.isbn13?C.ink:C.soft}}>
          {r.isbn13?"ISBN "+fmtIsbn(r.isbn13)+(r.alsoVersion?" \u00b7 "+alsoLine(r.alsoVersion):""):"ISBN not confirmed \u2014 verify before buying"}
        </div>
        {englishLine(r)&&<div style={{fontSize:11,color:C.soft,marginBottom:10}}>{englishLine(r)}</div>}
      </>)}
      {picked?(<>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {isAcq?(
            <>
              {r.shopUrl&&<a href={r.shopUrl} target="_blank" rel="noopener noreferrer" style={lnk}>{shopLinkLabel(r.shopState)} {"\u2197"}</a>}
              {r.publisherUrl&&<a href={r.publisherUrl} target="_blank" rel="noopener noreferrer" style={lnk}>{publisherLinkLabel(r.publisherResult)} {"\u2197"}</a>}
            </>
          ):buyLinks(r).map(l=><a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" style={lnk}>{l.name} {"\u2197"}</a>)}
          <DigitalLink r={r} C={C} lnk={lnk}/>
        </div>
      </>):(<>
        {(shopButtonUrl(mu,r.title)||r.digitalUrl)&&<div style={{display:"flex",flexWrap:"wrap",gap:5}}>{shopButtonUrl(mu,r.title)&&<a href={shopButtonUrl(mu,r.title)} target="_blank" rel="noopener noreferrer" style={lnk}>Museum shop {"\u2197"}</a>}<DigitalLink r={r} C={C} lnk={lnk}/></div>}
      </>)}
      {actions}
    </div>
  );
}
//@piece CatalogueNone


// The drawer of a card whose search found no catalogue: one copy, drawn by the app and by
// the Catalogue Blocks Check page; `actions` is the Search again / Re-check row.
function CatalogueNone({r,mu,C,TH,lnk,actions}){
  return(
    <div>
      {shopUnread(r.shopState)?(
        <div style={{margin:"0 0 8px"}}>
          <p style={{fontSize:12,color:C.soft,margin:"0 0 6px"}}><span style={{color:TH.lapsed.ink,fontWeight:700}}>{shopUnreadHead(r.shopState)}</span>{SHOP_BLOCKED_NONE_REST}</p>
          {/* "Search manually" needs somewhere to press: the shop's own
              search with the title in it, as on a found card. */}
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {shopButtonUrl(mu,r.title)&&<a href={shopButtonUrl(mu,r.title)} target="_blank" rel="noopener noreferrer" style={lnk}>Museum shop {"\u2197"}</a>}
            <DigitalLink r={r} C={C} lnk={lnk}/>
          </div>
        </div>
      ):<>
        <p style={{fontSize:12,color:C.soft,margin:"0 0 8px"}}>No catalogue found for this exhibition.</p>
        {r.digitalUrl&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}><DigitalLink r={r} C={C} lnk={lnk}/></div>}
      </>}
      {actions}
    </div>
  );
}
