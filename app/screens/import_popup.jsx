//@ The import pop-up: the frame, the open-a-ledger-first case, the four buttons, and the Paste, Pages and Links boxes with the Read's status.
//@piece ReadStatus

// A Read's progress, its note and each line it could not read: one piece for Links, Pages and
// Paste; failAs(f) is how a line names what it could not read.
function ReadStatus({ui,busy,prog,linkNote,linkFails,failAs}){
  const{C,TH}=ui;
  return(<>
    {busy&&prog.total>0&&<div style={{marginTop:8}}>
      <div style={{height:4,background:C.rule,borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:Math.round(100*prog.done/prog.total)+"%",background:C.action}}/></div>
      <div style={{marginTop:4,fontSize:11,color:C.soft}}>{prog.label}</div>
    </div>}
    {linkNote&&<div style={{marginTop:6,fontSize:11.5,color:C.soft,lineHeight:1.45}}>{linkNote}</div>}
    {linkFails.map((f,i)=><div key={i} style={{marginTop:6,fontSize:11.5,color:TH.urgent.ink,lineHeight:1.4,overflowWrap:"anywhere"}}>
      {f.url?failAs(f):""}{f.url?W.failDash:""}{f.why}
    </div>)}
  </>);
}
//@piece ImportPopup

// The pop-up's frame: the dim page behind, the box sized to what it holds, and Cancel. The boxes go inside it.
function ImportPopup({ui,importMode,cancelImportPopup,children}){
  const{C}=ui;
  return(<>
      {/* The import pop-up (her design; docs/add_by_link.md): CSV and Links, and a small
          Cancel. Under the review (1100) so cards open on top; under the confirm box (1200). */}
      {importMode&&(
        <div role="dialog" style={{position:"fixed",inset:0,background:C.scrim,zIndex:1050,display:"flex",flexDirection:"column",justifyContent:"center",padding:16}}>
          {/* Sized to what it holds. CSV and Links match Load and Save; the one pressed
              turns green (her design). */}
          <div style={{background:C.bg,borderRadius:8,...(importMode==="links"||importMode==="pages"||importMode==="paste"?{maxWidth:820,width:"100%"}:{width:"fit-content"}),boxSizing:"border-box",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"auto",boxShadow:"0 8px 30px rgba(0,0,0,0.3)",padding:"14px 18px 10px"}}>
            {children}
            {/* Cancel always answers: a catalogue search also sets busy, and once locked the
                pop-up out until the search ended (her report). */}
            <div style={{textAlign:"center",marginTop:10}}>
              <button onClick={cancelImportPopup} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.cancel}</button>
            </div>
          </div>
        </div>
      )}
  </>);
}
//@piece ImportNeedLedger

// An empty page: the import offers only the ways to open a ledger.
function ImportNeedLedger({ui,importMode,openCloudFromImport,loadFromImport}){
  const{C,sBtn}=ui;
  return(<>
            {/* IMPORT NEEDS A LEDGER OPEN: on an empty page it offers only the ways to open
                one (her design), so an import can never become the whole ledger. */}
            {importMode==="needLedger"&&<div style={{textAlign:"center"}}>
              <div style={{fontSize:13,color:C.ink,marginBottom:10}}>{W.ledgerFirst}</div>
              <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                <button onClick={openCloudFromImport} style={sBtn}>{W.openLastCloudSave}</button>
                <button onClick={loadFromImport} style={sBtn}>{W.load}</button>
              </div>
            </div>}
  </>);
}
//@piece ImportTabs

// The four buttons: CSV, Links, Pages and Paste.
function ImportTabs({ui,importMode,busy,chooseCsvImport,pickImportTab}){
  const{sBtn,pBtn}=ui;
  return(<>
            {importMode!=="needLedger"&&<div style={{display:"flex",gap:5,justifyContent:"center"}}>
              <button onClick={chooseCsvImport} disabled={busy} style={sBtn}>{W.tabCsv}</button>
              <button onClick={()=>pickImportTab("links")} disabled={busy} style={importMode==="links"?{...pBtn,opacity:1}:sBtn}>{W.tabLinks}</button>
              <button onClick={()=>pickImportTab("pages")} disabled={busy} style={importMode==="pages"?{...pBtn,opacity:1}:sBtn}>{W.tabPages}</button>
              <button onClick={()=>pickImportTab("paste")} disabled={busy} style={importMode==="paste"?{...pBtn,opacity:1}:sBtn}>{W.tabPaste}</button>
            </div>}
  </>);
}
//@piece ImportPaste

// The Paste boxes: a link box and a text box for each page.
function ImportPaste({ui,importMode,busy,pastes,typeInPasteBox,clearPasteBox,clearAllPasteBoxes,addPasteBox,readLinks,prog,linkNote,linkFails}){
  const{C,sBtn,pBtn}=ui;
  return(<>
            {importMode==="paste"&&<div style={{marginTop:14}}>
              {/* Paste: one box per page, the link and the page's text in separate boxes, a faint "Link" in
                  the link box (her design). "Clear" as the Links box has it: in the box, top right; "Clear all"
                  the same, above the boxes. */}
              {pastes.map((x,i)=>{
                const set=(k,v)=>typeInPasteBox(x.id,k,v);
                const field={width:"100%",boxSizing:"border-box",fontSize:12.5,fontFamily:"inherit",padding:"6px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,display:"block"};
                return <div key={x.id} style={{marginBottom:10,position:"relative"}}>
                  <input value={x.url} onChange={e=>set("url",e.target.value)} disabled={busy} placeholder={W.linkBox} aria-label={W.linkBox} inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{...field,paddingRight:52}}/>
                  {filledBox(x)&&<button onClick={()=>clearPasteBox(x.id)} disabled={busy}
                    style={{position:"absolute",top:7,right:8,background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.clear}</button>}
                  <textarea value={x.text} onChange={e=>set("text",e.target.value)} disabled={busy} aria-label={W.textBox} rows={5} style={{...field,marginTop:4,resize:"vertical"}}/>
                </div>;
              })}
              {/* "Clear all" in the row with + and Read, centred as Cancel is (her design). */}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center"}}>
                <span/>
                <span>{pastes.some(filledBox)&&<button onClick={clearAllPasteBoxes} disabled={busy}
                  style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.clearAll}</button>}</span>
                <div style={{display:"flex",justifyContent:"flex-end",gap:5}}>
                <button onClick={addPasteBox} disabled={busy} aria-label={W.addABox} style={sBtn}>+</button>
                <button onClick={()=>readLinks("paste")} disabled={busy} style={pBtn}>{W.read}</button>
                </div>
              </div>
              {<ReadStatus ui={ui} busy={busy} prog={prog} linkNote={linkNote} linkFails={linkFails} failAs={f=>f.url}/>}
            </div>}
  </>);
}
//@piece ImportPages

// The Pages list: saved show pages, read as a link is read.
function ImportPages({ui,importMode,busy,pages,pagesFileRef,pickPages,clearPages,readLinks,prog,linkNote,linkFails}){
  const{C,sBtn,pBtn}=ui;
  return(<>
            {importMode==="pages"&&<div style={{marginTop:14}}>
              {/* Pages: saved show pages, read as a link is read. The list works as the Links
                  box does: "Clear" empties it and the store; what is not read stays. */}
              <input ref={pagesFileRef} type="file" multiple accept=".mht,.mhtml,.html,.htm,multipart/related,message/rfc822,text/html" onChange={pickPages} style={{display:"none"}}/>
              <div style={{position:"relative",border:"1px solid "+C.rule,borderRadius:4,background:C.card,padding:"8px 52px 8px 10px",minHeight:60,fontSize:12.5,color:C.ink}}>
                {pages.length?pages.map(p=><div key={p.url} style={{overflowWrap:"anywhere",lineHeight:1.5}}>{p.title||p.name||p.url}</div>)
                  :null}
                {pages.length>0&&<button onClick={clearPages} disabled={busy}
                  style={{position:"absolute",top:6,right:8,background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.clear}</button>}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:5,marginTop:8}}>
                <button onClick={()=>pagesFileRef.current?.click()} disabled={busy} style={sBtn}>{W.choosePages}</button>
                <button onClick={()=>readLinks("pages")} disabled={busy||!pages.length} style={pBtn}>{W.read}</button>
              </div>
              {<ReadStatus ui={ui} busy={busy} prog={prog} linkNote={linkNote} linkFails={linkFails} failAs={f=>{ const pg=pages.find(p=>p.url===f.url); return (pg&&(pg.title||pg.name))||f.url; }}/>}
            </div>}
  </>);
}
//@piece ImportLinks

// The Links box: one link a line, with Clear inside the box.
function ImportLinks({ui,importMode,busy,linkText,typeLinkText,clearLinkText,readLinks,prog,linkNote,linkFails}){
  const{C,TH,pBtn}=ui;
  return(<>
            {importMode==="links"&&<div style={{marginTop:14}}>
              {/* "Clear" sits inside the box, top right (her design): one press empties
                  it and the store. */}
              <div style={{position:"relative"}}>
                <textarea value={linkText} onChange={e=>typeLinkText(e.target.value)} rows={8} disabled={busy}
                  style={{width:"100%",boxSizing:"border-box",fontSize:12.5,fontFamily:"inherit",padding:"8px 52px 8px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,resize:"vertical",display:"block"}}/>
                {linkText.trim()&&<button onClick={clearLinkText} disabled={busy}
                  style={{position:"absolute",top:6,right:8,background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{W.clear}</button>}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                <button onClick={()=>readLinks("links")} disabled={busy} style={pBtn}>{W.read}</button>
              </div>
              {<ReadStatus ui={ui} busy={busy} prog={prog} linkNote={linkNote} linkFails={linkFails} failAs={f=><a href={f.url} target="_blank" rel="noopener noreferrer" style={{color:TH.urgent.ink}}>{f.url}</a>}/>}
            </div>}
  </>);
}
