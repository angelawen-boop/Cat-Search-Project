//@ The Sort, When, Venue, Theme, Acquiring and Showing chip rows.
//@piece SortRow

// The Sort chips.
function SortRow({ui,sort,filters,bnOnly,pickSort}){
  const{C,chip}=ui;
  const{sortBy,dateReversed,pinTouched}=sort;
  const{bnPeriod,bnDate}=filters;
  return(
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Sort</span>
          {[["date","Date"],["venue","Venue"],["period","Period"],["added","Recently added"],["edited","Recently edited"],["labelled","Recently labelled"]].map(([k,l])=><button key={k} onClick={()=>pickSort(k)} style={chip(bnOnly?((k==="period"&&bnPeriod)||(k==="date"&&bnDate)):(sortBy===k&&!pinTouched))}>{l}{(bnOnly?(k==="period"&&bnPeriod)||(k==="date"&&bnDate):(k==="date"||k==="period")&&sortBy===k&&!pinTouched)?(dateReversed?" \u2191":" \u2193"):""}</button>)}
          {pinTouched&&<span style={{fontSize:10.5,color:C.action,fontWeight:600}}>{"\u2191 just-refreshed entries shown first"}</span>}
        </div>
  );
}
//@piece WhenRow

// The When chips.
function WhenRow({ui,filters,toggleSet}){
  const{C,chip}=ui;
  const{timeF}=filters;
  return(
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>When</span>
          {[["current","Current"],["past","Past"],["upcoming","Announced"],["recent","Recently opened"]].map(([k,l])=><button key={k} onClick={()=>toggleSet("timeF",k)} style={chip(timeF.has(k))}>{l}</button>)}
        </div>
  );
}
//@piece VenueRow

// The Venue chips.
function VenueRow({ui,filters,toggleSet}){
  const{C,chip}=ui;
  const{venueF}=filters;
  return(
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Venue</span>
          {chipVenues().map(id=><button key={chipKey(id)} onClick={()=>toggleSet("venueF",chipKey(id))} style={chip(venueF.has(chipKey(id)))}>{REG[id].names.chip}</button>)}
          {OCC_CHIPS.map(([k,l])=><button key={k} onClick={()=>toggleSet("venueF",k)} style={chip(venueF.has(k))}>{l}</button>)}
        </div>
  );
}
//@piece ThemeRow

// The Theme chips. A picked one shows its count after a dot (her design).
function ThemeRow({ui,filters,toggleSet,themeCount}){
  const{C,chip}=ui;
  const{themeF}=filters;
  return(
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Theme</span>
          {THEME_CHIPS.map(([k,l])=><button key={k} onClick={()=>toggleSet("themeF",k)} style={chip(themeF.has(k))}>{l}{themeF.has(k)?" \u00b7 "+themeCount[k]:""}</button>)}
        </div>
  );
}
//@piece AcquiringRow

// The Acquiring? chips.
function AcquiringRow({ui,filters,toggleAcqWanted,toggleAcqOwned,toggleBuyNextView,toggleAcq3mo,toggleAcq6mo,toggleAcqHasCat,toggleAcqNoCat,toggleAcqDigital}){
  const{C,chip}=ui;
  const{acqWanted,acqOwned,acq3mo,acq6mo,acqHasCat,acqNoCat,acqDigital,acqBuyNext}=filters;
  return(
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Acquiring?</span>
          <button onClick={toggleAcqWanted} style={chip(acqWanted)}>Wanted</button>
          <button onClick={toggleAcqOwned} style={chip(acqOwned)}>Owned</button>
          <button onClick={toggleBuyNextView} style={chip(acqBuyNext)}>Buy next</button>
          <button onClick={toggleAcq3mo} style={chip(acq3mo)}>3+ mos</button>
          <button onClick={toggleAcq6mo} style={chip(acq6mo)}>6+ mos closing window</button>
          <button onClick={toggleAcqHasCat} style={chip(acqHasCat)}>Has catalogue</button>
          <button onClick={toggleAcqNoCat} style={chip(acqNoCat)}>No catalogue</button>
          <button onClick={toggleAcqDigital} style={chip(acqDigital)}>Digital catalogue</button>
        </div>
  );
}
//@piece ShowingRow

// The Showing chips and Clear all.
function ShowingRow({ui,filters,toggleWatchedOnly,toggleDismissedOnly,toggleLabelledOnly,toggleShowAll,clearFilters}){
  const{C,chip}=ui;
  const{showAll,dismissedOnly,labelledF,watchedF}=filters;
  return(
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Showing</span>
          <button onClick={toggleWatchedOnly} style={chip(watchedF)}>Watched</button>
          <button onClick={toggleDismissedOnly} style={chip(dismissedOnly)}>Dismissed</button>
          <button onClick={toggleLabelledOnly} style={chip(labelledF)}>Recently labelled</button>
          <button onClick={toggleShowAll} style={chip(showAll)}>Show all</button>
          <button onClick={clearFilters} style={{...chip(false),color:C.muted,borderColor:C.muted}}>Clear all</button>
        </div>
  );
}
