//@ The shop screen: one card per new venue with an unconfirmed shop, and the card's four answers.
//@piece ShopVenueCard

// One new venue's card: its shop, the four answers and the box for her own link.
function ShopVenueCard({ui,id,occVenues,shopLooking,shopAdding,confirmShop,lookAgain,noShopFor,toggleShopAdd,typeShopLink,closeShopAdd,addShopFor}){
  const{C,decBtn}=ui;
                const v=occVenues[id]||{}, link=v.shop==="found"?v.shopCatalogues:null, looking=shopLooking===id;
                const home=v.shop==="noshelf"||v.shop==="failed"?v.shopHome:null;
                const said=v.shop==="found"?null:v.shop==="noshelf"?"Shop found, but not its books section: "
                  :v.shop==="failed"?"Search failed.":"No museum shop found.";
                // The finder found no catalogues section: one line, her wording, whatever it took instead.
                const lesser=link&&v.shelfKind&&v.shelfKind!=="catalogues"?"Shop found, but not its catalogues section ":null;
                const en=v.shop==="found"?v.shopEnglishUnread:null;
                const yes=v.confirmed&&v.shop==="found"&&!v.englishPicked&&!v.shopAdded, yesEn=v.confirmed&&!!en&&!!v.englishPicked, none=v.confirmed&&v.shop==="none", added=v.confirmed&&!!v.shopAdded;
                const typing=shopAdding&&shopAdding.id===id;
  return(
                <div style={{paddingTop:12,marginTop:10,borderTop:"1px solid "+C.rule,fontSize:12.5,color:C.ink,lineHeight:1.45}}>
                  <div style={{fontWeight:600}}>{(MU[id]&&MU[id].card)||v.short||v.name||id}</div>
                  {link?<div>{lesser&&<span style={{color:C.soft}}>{lesser}</span>}<a href={link} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{link}</a></div>
                    :<div style={{color:C.soft}}>{said}{home&&v.shop==="noshelf"&&<a href={home} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{home}</a>}</div>}
                  <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                    {looking?<span style={{fontSize:11.5,color:C.soft}}>Looking{"\u2026"}</span>:<>
                      <button onClick={()=>confirmShop(id)} disabled={!!shopLooking||!(link||home)} style={{...decBtn(yes,C.okEdge),...(!(link||home)?{opacity:0.4,cursor:"not-allowed"}:{})}}>{yes?"\u2713 ":""}Confirm</button>
                      <button onClick={()=>lookAgain(id)} disabled={!!shopLooking} style={decBtn(false,C.okEdge)}>Look again</button>
                      <button onClick={()=>noShopFor(id)} disabled={!!shopLooking} style={decBtn(none,C.rejectInk)}>{none?"\u2713 ":""}No shop</button>
                      <button onClick={()=>toggleShopAdd(id,typing,added,link)} disabled={!!shopLooking} style={decBtn(added,C.okEdge)}>{added?"\u2713 ":""}Add</button>
                    </>}
                  </div>
                  {/* "Add": her link, taken on Enter or on leaving the box; Escape closes it. */}
                  {typing&&!looking&&<input autoFocus value={shopAdding.text} onChange={e=>typeShopLink(id,e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter")addShopFor(id,e.target.value); else if(e.key==="Escape"){ e.target.value=""; closeShopAdd(); } }}
                    onBlur={e=>addShopFor(id,e.target.value)}
                    style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"5px 8px",fontSize:12.5,border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontFamily:"inherit"}}/>}
                  {/* Its English section, which the finder could not read: hers to confirm instead. */}
                  {en&&<><div style={{marginTop:6}}><a href={en} target="_blank" rel="noopener noreferrer" style={{color:C.action,overflowWrap:"anywhere"}}>{en}</a></div>
                    <div style={{display:"flex",gap:6,marginTop:6}}>{!looking&&<button onClick={()=>confirmShop(id,true)} disabled={!!shopLooking} style={decBtn(yesEn,C.okEdge)}>{yesEn?"\u2713 ":""}Confirm</button>}</div></>}
                </div>
  );
}
//@piece ShopScreen

// The shop screen (her design), after the review: the ledger moves only when every card is answered.
function ShopScreen({ui,shopScreen,occVenues,shopLooking,shopAdding,confirmShop,lookAgain,noShopFor,addShopFor,toggleShopAdd,typeShopLink,closeShopAdd,backFromShop,applyRefresh}){
  const{C,pBtn,sBtn}=ui;
        const left=shopScreen.ids.filter(id=>!(occVenues[id]||{}).confirmed||shopLooking===id).length;
        return <div role="dialog" style={{position:"fixed",inset:0,background:C.scrim,zIndex:1150,display:"flex",flexDirection:"column",padding:16}}>
          <div style={{background:C.bg,borderRadius:8,maxWidth:820,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.rule}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:500,color:C.ink}}>New Venue Shops</div>
            </div>
            <div style={{overflow:"auto",padding:"4px 18px 14px",flex:1}}>
              {/* The review cards' buttons (decBtn), always the same four in the same
                  places (her decision); Confirm greyed only with no shop to confirm. */}
              {shopScreen.ids.map(id=><ShopVenueCard key={id} ui={ui} id={id} occVenues={occVenues} shopLooking={shopLooking} shopAdding={shopAdding} confirmShop={confirmShop} lookAgain={lookAgain} noShopFor={noShopFor} toggleShopAdd={toggleShopAdd} typeShopLink={typeShopLink} closeShopAdd={closeShopAdd} addShopFor={addShopFor}/>)}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid "+C.rule,display:"flex",gap:10,alignItems:"center"}}>
              <button onClick={backFromShop} disabled={!!shopLooking} style={sBtn}>Back</button>
              <button onClick={()=>applyRefresh(shopScreen.partial)} disabled={left>0}
                style={{...pBtn,marginLeft:"auto",...(left>0?{background:C.muted,cursor:"not-allowed",opacity:1}:{})}}>
                {left>0?left+" still to decide":"Go ahead and update the ledger"}</button>
            </div>
          </div>
        </div>;
}
