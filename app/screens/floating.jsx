//@ The floating buttons, the undo bar, the confirm box and the footer.
//@piece SelectedWordsButton

// The Search button that follows words she has selected anywhere on the page.
function SelectedWordsButton({ui,selPick,searchPick}){
  const{C,TH}=ui;
  return(<>
      {/* Top on the left, bottom on the right (her layout), shown once she has scrolled down. */}
      {/* Filled as the "Recently opened" tag, edged in the action green (her choice), in both themes. */}
      {selPick&&<button onMouseDown={e=>e.preventDefault()} onClick={searchPick}
        style={{position:"fixed",top:selPick.y,left:selPick.x,transform:"translateX(-50%)",zIndex:1000,background:TH.recent.wash,border:"1px solid "+C.action,borderRadius:4,color:TH.recent.ink,fontSize:12,fontWeight:500,cursor:"pointer",padding:"6px 12px",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>Search</button>}
  </>);
}
//@piece JumpButtons

// Return to top and Jump to bottom, shown once she has scrolled down.
function JumpButtons({ui,showTop,undo,jumpToBottom}){
  const{C}=ui;
  return(<>
      {showTop&&(<>
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="Return to top"
          style={{position:"fixed",bottom:undo?64:20,left:"50%",transform:"translateX(calc(-100% - 5px))",zIndex:998,width:38,height:38,borderRadius:"50%",background:C.card,border:"1px solid "+C.rule,color:C.ink,fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>{"\u2191"}</button>
        <button onClick={jumpToBottom} aria-label="Jump to bottom"
          style={{position:"fixed",bottom:undo?64:20,left:"50%",transform:"translateX(5px)",zIndex:998,width:38,height:38,borderRadius:"50%",background:C.card,border:"1px solid "+C.rule,color:C.ink,fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>{"\u2193"}</button>
      </>)}
  </>);
}
//@piece UndoBar

// The bar that follows a dismiss, with Undo.
function UndoBar({ui,undo,undoDismiss}){
  const{C}=ui;
  return(<>
      {undo&&(
        <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:C.ink,color:C.onAction,borderRadius:4,padding:"7px 14px",fontSize:12,display:"flex",gap:10,alignItems:"center",zIndex:999,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
          {/* "Undo", the same size as the word before it (her decision). A <button>
              does not inherit the page's font, so it is told to. */}
          <span style={{fontSize:14,lineHeight:"20px"}}>Dismissed</span>
          <button onClick={undoDismiss} style={{background:"none",border:"1px solid rgba(255,255,255,0.5)",borderRadius:3,color:C.onAction,fontFamily:"inherit",fontSize:14,lineHeight:"20px",fontWeight:600,cursor:"pointer",padding:"1px 8px",margin:0}}>Undo</button>
        </div>
      )}
  </>);
}
//@piece ConfirmBox

// The confirm box, the top layer of the page.
function ConfirmBox({ui,confirmBox,dismissConfirm,answerConfirm}){
  const{C,sBtn,pBtn}=ui;
  return(<>
      {/* ABOVE THE REVIEW PANEL, NOT UNDER IT: the confirm box is the TOP layer (1200),
          because the thing asked last is answered first (fixture 18i). Any new overlay
          goes below it. */}
      {confirmBox&&(
        <div style={{position:"fixed",inset:0,background:C.scrim,display:"grid",placeItems:"center",zIndex:1200,padding:16}}>
          <div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:8,maxWidth:420,padding:"18px 20px",boxShadow:"0 6px 24px rgba(0,0,0,0.25)"}}>
            {/* The heading is the caller's; the default keeps the old wording. */}
            <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:8}}>{confirmBox.title||"Replace what's on screen?"}</div>
            {confirmBox.text?<div style={{fontSize:12.5,color:C.body,lineHeight:1.5,marginBottom:16}}>{confirmBox.text}</div>:<div style={{height:8}}/>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={dismissConfirm} style={sBtn}>Cancel</button>
              <button onClick={answerConfirm} style={{...pBtn,background:C.accent}}>{confirmBox.yes||"Continue"}</button>
            </div>
          </div>
        </div>
      )}
  </>);
}
//@piece Footer

// The version line.
function Footer({ui}){
  const{C}=ui;
  return(<>
      {/* The version, small and grey: something she checks, not acts on. Reads
          APP_VERSION, so there is one copy of the number. */}
      <footer style={{maxWidth:760,margin:"28px auto 0",fontSize:10.5,color:C.soft,textAlign:"center"}}>
        Art Watch {"·"} v {APP_VERSION} {"·"} {APP_VERSION_DATE}
      </footer>
  </>);
}
