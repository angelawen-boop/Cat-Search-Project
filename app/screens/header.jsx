//@ The title, toolbar and Save panel, the status lines and banners, the diagnostic box, the sweep-log line and the counts and search row.
//@piece Toolbar

// The title and the toolbar: Load, Save, the theme switch and Import.
function Toolbar({ui,theme,hasLedger,fileRef,refreshFileRef,requestImport,handleImport,handleRefreshFile,toggleTheme,toggleSavePanel,openImportChoice}){
  const{C,sBtn,pBtn}=ui;
  return(<>
        <div style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:C.soft,marginBottom:4}}>Art Watch</div>
        <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:36,lineHeight:1,fontWeight:500,margin:0,letterSpacing:"-0.02em"}}>Before it goes<span style={{color:C.accent}}> out of print</span></h1>
        <div style={{marginTop:14,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          {/* Load and Import (her decision): Load opens a ledger file; Import brings in a
              sweep CSV as cards. */}
          <button onClick={requestImport} style={sBtn}>Load</button>
          <button onClick={toggleSavePanel} disabled={!hasLedger} style={{...pBtn,opacity:hasLedger?1:0.4,cursor:hasLedger?"pointer":"not-allowed"}}>Save</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{display:"none"}}/>
          {/* Small and out of the way: it is a comfort control, not part of the
              work. Says what it will DO, not what is currently on. */}
          <button onClick={toggleTheme} title={theme==="dark"?"Switch to light":"Switch to dark"}
            style={{...sBtn,marginLeft:"auto",padding:"5px 9px"}}>{theme==="dark"?"\u2600 Light":"\u263D Dark"}</button>
          <button onClick={openImportChoice} style={sBtn}>Import</button>
          <input ref={refreshFileRef} type="file" accept=".csv,text/csv" onChange={handleRefreshFile} style={{display:"none"}}/>
        </div>
  </>);
}
//@piece SavePanel

// The Save panel under the toolbar: the description, Save now, the cloud tick and the file name.
function SavePanel({ui,showSave,hasLedger,saveLabel,saveCloud,saveBusy,typeSaveLabel,chooseSaveCloud,handleSave,closeSavePanel}){
  const{C,sBtn,pBtn}=ui;
  return(<>
        {/* The Save panel (her design): the description names the offline file and its
            cloud twin; the tick starts on. */}
        {showSave&&hasLedger&&<div style={{marginTop:8,padding:"10px 12px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input value={saveLabel} onChange={e=>typeSaveLabel(e.target.value)} maxLength={80} placeholder={"Description (optional) \u2014 e.g. after 30 lookups"}
              onKeyDown={e=>{if(e.key==="Enter")handleSave();}}
              style={{flex:"1 1 220px",minWidth:0,padding:"5px 8px",fontSize:12.5,border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontFamily:"inherit"}}/>
            <button onClick={handleSave} disabled={saveBusy} style={{...pBtn,opacity:saveBusy?0.4:1,cursor:saveBusy?"not-allowed":"pointer"}}>{saveBusy?"Saving\u2026":"Save now"}</button>
            <button onClick={closeSavePanel} style={sBtn}>Cancel</button>
          </div>
          <label style={{display:"flex",gap:6,alignItems:"center",marginTop:8,fontSize:12.5,color:C.ink,cursor:"pointer"}}>
            <input type="checkbox" checked={saveCloud} onChange={e=>chooseSaveCloud(e.target.checked)}/>
            {"Also save a copy to cloud"}
          </label>
          <div style={{marginTop:6,fontSize:11,color:C.soft,wordBreak:"break-all"}}>{"File name: "+LEDGER_PREFIX+localStamp()+(labelSlug(saveLabel)?"-"+labelSlug(saveLabel):"")+".json"}</div>
        </div>}
  </>);
}
//@piece StatusLines

// The cloud line first, then what loading did and what saving did.
function StatusLines({ui,cloudStatus,hasLedger,cloudLive,requestOpenCloud,savedText,cloudCheck,dismissCloudCheck,saveNote}){
  const{C}=ui;
  return(<>
        {/* The status lines, in her order (docs/app.md §9): the cloud line first, always —
            green, or the red banner when saving has stopped; a line's space; what loading
            did; what saving did. */}
        {cloudStatus.trouble?
          <div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
            <span style={{fontSize:17,lineHeight:1.1}}>{"☁"}</span>
            <span>{cloudStatus.text}</span>
          </div>
        :<div style={{marginTop:6,fontSize:11,color:C.okEdge,fontWeight:600,display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
          <span>{"☁ "}{cloudStatus.text}</span>
          {!hasLedger&&cloudLive&&cloudLive.rec&&<button onClick={requestOpenCloud} style={{background:"none",border:"none",color:C.action,fontSize:11,fontWeight:600,textDecoration:"underline",cursor:"pointer",padding:0}}>Open it</button>}
        </div>}
        <div style={{marginTop:16}}>
          {savedText&&<div style={{fontSize:11,color:C.ink,lineHeight:1.45}}>{savedText}</div>}
          {/* Stays until she dismisses it or the next Load replaces it (her decision): a
              line that fades can vanish unread. */}
          {cloudCheck&&<div style={{marginTop:2,fontSize:11,color:C.ink,lineHeight:1.45,display:"flex",gap:8,alignItems:"baseline"}}>
            <span style={{flex:1}}>{cloudCheck}</span>
            <button onClick={dismissCloudCheck} title="Dismiss" aria-label="Dismiss" style={{background:"none",border:"none",color:C.soft,fontSize:14,lineHeight:1,cursor:"pointer",padding:0}}>{"\u00d7"}</button>
          </div>}
          {hasLedger&&saveNote&&<div style={{marginTop:6,fontSize:11,lineHeight:1.45}}>
            <span style={{color:saveNote.ok?C.okEdge:C.warnInk,fontWeight:saveNote.ok?600:700}}>{saveNote.text}</span>
            {saveNote.file&&<span style={{color:C.ink,fontWeight:400}}>{" ("+saveNote.file+")"}</span>}
          </div>}
        </div>
  </>);
}
//@piece Banners

// The banners and the error line: import complete, unconfirmed download, unsaved changes, store and quarantine trouble, the progress bar, the Label line, read-only and the error.
function Banners({ui,hasLedger,refreshDone,unconfirmedSave,showUnsavedBanner,storeUnread,quarWhy,busy,prog,importMode,labelSaid,readOnly,error}){
  const{C,TH}=ui;
  return(<>
        {hasLedger&&refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:C.okBg,border:"2px solid #2D6B5A",borderRadius:5,fontSize:12.5,fontWeight:700,color:C.okInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          {/* The icon sits on the first line of text (her ask): centred, it drifted when
              the banner wrapped. */}
          <span style={{fontSize:17,lineHeight:"17.5px"}}>{"\u21BB"}</span>
          {/* Two paragraphs, worded by importComplete: the instruction, then the counts
              (the way back is on the partial-import confirm box). */}
          <span>
            <span style={{display:"block",marginBottom:"1.45em"}}>{importComplete(refreshDone).head}</span>
            <span style={{display:"block"}}>{importComplete(refreshDone).counts}</span>
          </span>
        </div>}
        {hasLedger&&unconfirmedSave&&<div style={{marginTop:8,padding:"9px 12px",background:C.holdBg,border:"2px solid "+C.soft,borderRadius:5,fontSize:12.5,color:C.ink,lineHeight:1.45,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:16,lineHeight:1.1}}>{"\u2193"}</span>
          <span>{"A download of "+unconfirmedSave+" was started. This viewer can\u2019t tell us whether it arrived, so your ledger is still marked unsaved \u2014 check your downloads folder. If the file is there, you\u2019re safe."}</span>
        </div>}
        {showUnsavedBanner&&!refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid #B5791A",borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:17,lineHeight:1}}>{"\u26A0"}</span>
          <span>{"UNSAVED CHANGES \u2014 what's on screen is not saved to a file. Tap \u201cSave\u201d before you close this tab or your work is lost."}</span>
        </div>}
        {/* A quarantine that isn't saving is a banner, not a footnote (her decision),
            shown with or without a ledger open. */}
        {/* A part of the store that could not be read (the quarantine has its own banner). */}
        {storeUnread.filter(w=>w!==UNREAD_QUAR).length>0&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:17,lineHeight:1.1}}>{"\u26A0"}</span>
          <span>{"STORE NOT READ \u2014 "+storeUnread.filter(w=>w!==UNREAD_QUAR).join(", ")+" couldn\u2019t be read from store, refresh to re-check. Current incorrect information will not overwrite the store until the read corrects."}</span>
        </div>}
        {quarWhy&&<div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
          <span style={{fontSize:17,lineHeight:1.1}}>{"\u26A0"}</span>
          <span>{"QUARANTINE \u2014 "+quarWhy}</span>
        </div>}
        {busy&&prog.total>0&&!importMode&&<div style={{marginTop:8}}><div style={{height:3,background:C.rule,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(prog.done/prog.total*100)+"%",background:C.action,transition:"width .3s ease"}}/></div><div style={{fontSize:10,color:C.soft,marginTop:3}}>{prog.done}/{prog.total} · {prog.label}</div></div>}
        {labelSaid&&<div style={labelSaid.ok?{marginTop:8,fontSize:11.5,color:C.soft}:{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink}}>{labelSaid.text}</div>}
        {readOnly&&<div style={{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink,fontWeight:700}}>{RO_LINE}</div>}
        {error&&error!==RO_LINE&&<div style={{marginTop:8,padding:"7px 11px",background:TH.urgent.wash,border:"1px solid "+TH.urgent.ink,borderRadius:4,fontSize:11.5,color:TH.urgent.ink}}>{error}</div>}
  </>);
}
//@piece DiagnosticBox

// The diagnostic box. It owns whether it is open and whether its copy icon last worked; a new diagnostic has not been copied.
function DiagnosticBox({ui,debug}){
  const{C}=ui;
  const[showDebug,setShowDebug]=useState(false);
  const[copySaid,setCopySaid]=useState(null);       // "ok" / "no": what the diagnostic's copy icon last managed
  useEffect(()=>setCopySaid(null),[debug]); // a new diagnostic has not been copied
  return(<>
        {debug&&<div style={{marginTop:4}}><button onClick={()=>setShowDebug(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{showDebug?"Hide diagnostic":"Show diagnostic"}</button>
          {/* Copy: an icon alone, bottom right of the tray (her ask). A tick only if the
              copy happened — a frame can refuse the clipboard — else a cross; back to
              the icon after two seconds. */}
          {showDebug&&<div style={{position:"relative",marginTop:4}}>
            <pre style={{margin:0,padding:"7px 28px 7px 7px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4,fontSize:9.5,whiteSpace:"pre-wrap",wordBreak:"break-word",color:C.soft,maxHeight:160,overflow:"auto"}}>{debug}</pre>
            <button aria-label={copySaid==="ok"?"Copied":copySaid==="no"?"Couldn\u2019t copy":"Copy"} title={copySaid==="ok"?"Copied":copySaid==="no"?"Couldn\u2019t copy":"Copy"}
              onClick={async()=>{const r=await copyText(debug)?"ok":"no";setCopySaid(r);setTimeout(()=>setCopySaid(v=>v===r?null:v),2000);}}
              style={{position:"absolute",right:5,bottom:5,background:"none",border:"none",color:C.soft,fontSize:13,lineHeight:1,cursor:"pointer",padding:2}}>{copySaid==="ok"?"\u2713":copySaid==="no"?"\u2717":"\u29c9"}</button>
          </div>}</div>}
  </>);
}
//@piece SweepLog

// The sweep-log line and its Details drawer. It owns whether the drawer is open.
function SweepLog({ui,lastSweep,venueSeen,freshWhy,counts}){
  const{C,TH}=ui;
  const[showFresh,setShowFresh]=useState(false);
  return(<>
        {/* Not gated on a ledger: when a sweep last ran is what the page knows. */}
        <div style={{marginTop:6,fontSize:10.5,color:C.soft,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          {/* "Unknown", never "never" (her decision): an empty store is not evidence
              that no sweep ran. */}
          <span>Last sweep: {lastSweep?fmtRefresh(lastSweep):"Unknown"}</span>
          {/* Per-venue freshness: collapsed by default, ALWAYS shown — a control that
              disappears when the log is empty cannot report anything. */}
          <button onClick={()=>setShowFresh(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{showFresh?"Hide details":"Details"}</button>
        </div>

        {/* Not gated on a ledger: the sweep log survives Reset. */}
        {showFresh&&<div style={{marginTop:6,padding:"8px 10px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4}}>
          {/* Tracked and Dismissed live here, at the top of Details (her decision). */}
          <div style={{display:"flex",gap:14,fontSize:10.5,color:C.soft,flexWrap:"wrap",marginBottom:8}}>
            <span><b style={{color:C.ink}}>{counts.total}</b> Tracked</span>
            {counts.dismissed>0&&<span><b>{counts.dismissed}</b> Dismissed</span>}
          </div>
          <div style={{fontSize:10,color:C.soft,marginBottom:6,lineHeight:1.5}}>
            {"When each venue was last swept, and when it last gave us exhibitions."}
          </div>
          {/* "NO SWEEPS YET" AND "COULDN'T READ THE STORE" LOOK IDENTICAL AND
              MEAN OPPOSITE THINGS, so an empty panel always says which. */}
          {freshWhy&&<div style={{fontSize:11,color:C.accent,marginBottom:6,lineHeight:1.5}}>{freshWhy}</div>}
          {/* An empty store says nothing about whether a sweep ran (her decision), so no
              "No sweep imported yet". Unlike freshWhy, here the store did answer. */}
          {!freshWhy&&Object.keys(venueSeen).length===0&&
            <div style={{fontSize:11,color:C.soft,marginBottom:6}}>{"The store holds no sweep dates, so when each venue was last swept is unknown."}</div>}
          {MUSEUMS.map(m=>{
            const v=venueSeen[m.id]; if(!v)return null;
            const stale=v.returned&&v.attempted&&v.returned!==v.attempted;
            return(
              <div key={m.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)",gap:8,fontSize:10.5,color:C.soft,padding:"3px 0",alignItems:"baseline"}}>
                <span style={{color:C.ink}}>{m.card}</span>
                <span>{momentLines("swept ",v.attempted)}</span>
                <span style={{color:v.returned?(stale?TH.urgent.ink:C.soft):TH.urgent.ink,fontWeight:stale||!v.returned?600:400}}>
                  {v.returned?momentLines("rows ",v.returned):"no rows \u2014 refused"}
                </span>
              </div>
            );
          })}
          {MUSEUMS.filter(m=>!venueSeen[m.id]).length>0&&
            <div style={{fontSize:10.5,color:C.soft,marginTop:6,paddingTop:5,borderTop:"1px solid "+C.rule}}>
              {"Not in any sweep yet: "+MUSEUMS.filter(m=>!venueSeen[m.id]).map(m=>m.card).join(", ")+"."}
            </div>}
        </div>}
  </>);
}
//@piece CountsRow

// The counts line, with the search icon at its end.
function CountsRow({ui,counts,toggleSearchBox}){
  const{C,TH}=ui;
  return(
        <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid "+C.rule,display:"flex",gap:14,fontSize:10.5,color:C.soft,flexWrap:"wrap",alignItems:"center"}}>
          <span><b style={{color:C.ink}}>{counts.watched}</b> Watched</span>
          <span><b style={{color:C.ink}}>{counts.wanted}</b> Wanted</span>
          <span><b style={{color:C.owned}}>{counts.owned}</b> Owned</span>
          <span><b style={{color:TH.urgent.ink}}>{counts.pressing}</b> Closing Window</span>
          <button onClick={toggleSearchBox} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.soft,padding:0,lineHeight:1}} title="Search">{"\uD83D\uDD0D"}</button>
        </div>
  );
}
//@piece SearchRow

// The search box, with the cross that clears it.
function SearchRow({ui,showSearch,search,searchRef,typeSearch,clearSearchText}){
  const{C}=ui;
  return(<>
        {/* The cross clears what she typed (her ask): right-aligned, shown while there is text. */}
        {showSearch&&<div style={{marginTop:6,position:"relative"}}><input ref={searchRef} value={search} onChange={e=>typeSearch(e.target.value)} style={{width:"100%",padding:"7px 30px 7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/>
          {search&&<button onClick={clearSearchText} aria-label="Clear search" title="Clear"
            style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.soft,fontSize:16,lineHeight:1,cursor:"pointer",padding:"2px 4px"}}>{"\u00d7"}</button>}</div>}
  </>);
}
