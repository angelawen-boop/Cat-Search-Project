//@ The Sort, When, Venue, Theme, Acquiring and Showing chip rows.
//@piece SortRow

// The Sort chips.
function SortRow({ui,sort,filters,bnOnly,pickSort}){
  const{C,chip}=ui;
  const{sortBy,dateReversed,pinTouched}=sort;
  const{bnPeriod,bnDate}=filters;
  return(
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>{W.sortRow}</span>
          {[["date",W.sortDate],["venue",W.sortVenue],["period",W.sortPeriod],["added",W.recentlyAdded],["edited",W.recentlyEdited],["labelled",W.recentlyLabelled]].map(([k,l])=><button key={k} onClick={()=>pickSort(k)} style={chip(bnOnly?((k==="period"&&bnPeriod)||(k==="date"&&bnDate)):(sortBy===k&&!pinTouched))}>{l}{(bnOnly?(k==="period"&&bnPeriod)||(k==="date"&&bnDate):(k==="date"||k==="period")&&sortBy===k&&!pinTouched)?(dateReversed?" \u2191":" \u2193"):""}</button>)}
          {pinTouched&&<span style={{fontSize:10.5,color:C.action,fontWeight:600}}>{W.justRefreshedFirst}</span>}
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
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>{W.whenRow}</span>
          {[["current",W.whenCurrent],["past",W.whenPast],["upcoming",W.whenAnnounced],["recent",W.recentlyOpened]].map(([k,l])=><button key={k} onClick={()=>toggleSet("timeF",k)} style={chip(timeF.has(k))}>{l}</button>)}
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
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>{W.sortVenue}</span>
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
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>{W.themeRow}</span>
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
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>{W.acquiringRow}</span>
          <button onClick={toggleAcqWanted} style={chip(acqWanted)}>{W.chipWanted}</button>
          <button onClick={toggleAcqOwned} style={chip(acqOwned)}>{W.chipOwned}</button>
          <button onClick={toggleBuyNextView} style={chip(acqBuyNext)}>{W.buyNext}</button>
          <button onClick={toggleAcq3mo} style={chip(acq3mo)}>{W.chip3mo}</button>
          <button onClick={toggleAcq6mo} style={chip(acq6mo)}>{W.chip6mo}</button>
          <button onClick={toggleAcqHasCat} style={chip(acqHasCat)}>{W.chipHasCatalogue}</button>
          <button onClick={toggleAcqNoCat} style={chip(acqNoCat)}>{W.chipNoCatalogue}</button>
          <button onClick={toggleAcqDigital} style={chip(acqDigital)}>{W.digitalCatalogue}</button>
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
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>{W.showingRow}</span>
          <button onClick={toggleWatchedOnly} style={chip(watchedF)}>{W.chipWatched}</button>
          <button onClick={toggleDismissedOnly} style={chip(dismissedOnly)}>{W.chipDismissed}</button>
          <button onClick={toggleLabelledOnly} style={chip(labelledF)}>{W.recentlyLabelled}</button>
          <button onClick={toggleShowAll} style={chip(showAll)}>{W.showAll}</button>
          <button onClick={clearFilters} style={{...chip(false),color:C.muted,borderColor:C.muted}}>{W.clearAll}</button>
        </div>
  );
}
