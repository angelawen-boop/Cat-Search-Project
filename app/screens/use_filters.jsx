//@ The filters and the sort: what she has chosen to show, the search box, the order and the pinned just-imported cards.
//@piece useFilters

// The memory of the chips, the sort and the search box, with the actions that touch only it. It hands back
// ONE object: what it remembers and named actions; no raw setter leaves it. The list itself is worked out
// in the screen from the ledger's rows and these.
function useFilters(){
  const[sortBy,setSortBy]=useState("date");
  const[dateReversed,setDateReversed]=useState(false);
  // Every filter in ONE object (filtersClear is the all-clear value); set by name with setFilters(f=>({...f,x:…})).
  const[filters,setFilters]=useState(filtersClear);
  const{acqBuyNext,bnPeriod,bnDate}=filters;
  const[showSearch,setShowSearch]=useState(false);
  const searchRef=useRef(null);
  const[refreshTouched,setRefreshTouched]=useState([]); // ids added/changed in the last refresh
  const[pinTouched,setPinTouched]=useState(false); // pin those ids to the top this session
  const sort={sortBy,dateReversed,pinTouched,refreshTouched};
  const{bnOnly,periodView,venueScrub}=listMode(filters,sort);
  const viewToken=useMemo(()=>({}),[sortBy,filters,pinTouched,dateReversed]);
  const toggleSet=(name,val)=>setFilters(f=>{const n=new Set(f[name]);if(n.has(val))n.delete(val);else n.add(val);return{...f,[name]:n};});
  const clearFilters=()=>{setFilters(filtersClear());setShowSearch(false);};
  // A second tap on Date reverses it; a third goes back to the usual order.
  const pickSort=k=>{if(bnOnly){if(k==="period"||k==="date"){const cur=bnPeriod?"period":bnDate?"date":"";if(cur!==k){setFilters(f=>({...f,bnPeriod:k==="period",bnDate:k==="date"}));setDateReversed(false);}else if(!dateReversed)setDateReversed(true);else{setFilters(f=>({...f,bnPeriod:false,bnDate:false}));setDateReversed(false);}}return;}setDateReversed((k==="date"||k==="period")&&sortBy===k&&!pinTouched&&!dateReversed);setSortBy(k);setPinTouched(false);}; // manual sort releases the pinned refresh group
  const toggleSearchBox=()=>{if(showSearch)setFilters(f=>({...f,search:""}));setShowSearch(v=>!v);setTimeout(()=>searchRef.current?.focus(),100);};
  const typeSearch=v=>{setFilters(f=>({...f,search:v}));};
  const clearSearchText=()=>{setFilters(f=>({...f,search:""}));if(searchRef.current)searchRef.current.focus();};
  const toggleAcqWanted=()=>setFilters(f=>({...f,acqWanted:!f.acqWanted}));
  const toggleAcqOwned=()=>{setFilters(f=>({...f,acqOwned:!f.acqOwned,...(acqBuyNext?{bnPeriod:false,bnDate:false}:{})}));if(acqBuyNext){setDateReversed(false);}};
  const toggleBuyNextView=()=>setFilters(f=>({...f,acqBuyNext:!f.acqBuyNext,bnPeriod:false,bnDate:false}));
  const toggleAcq3mo=()=>setFilters(f=>({...f,acq3mo:!f.acq3mo}));
  const toggleAcq6mo=()=>setFilters(f=>({...f,acq6mo:!f.acq6mo}));
  const toggleAcqHasCat=()=>setFilters(f=>({...f,acqHasCat:!f.acqHasCat}));
  const toggleAcqNoCat=()=>setFilters(f=>({...f,acqNoCat:!f.acqNoCat}));
  const toggleAcqDigital=()=>setFilters(f=>({...f,acqDigital:!f.acqDigital}));
  const toggleWatchedOnly=()=>setFilters(f=>({...f,watchedF:!f.watchedF}));
  const toggleDismissedOnly=()=>setFilters(f=>({...f,dismissedOnly:!f.dismissedOnly,showAll:false}));
  const toggleLabelledOnly=()=>setFilters(f=>({...f,labelledF:!f.labelledF}));
  const toggleShowAll=()=>setFilters(f=>({...f,showAll:!f.showAll,dismissedOnly:false}));
  // Search for these words (search-selected-words): typed into the box, which opens.
  const searchFor=text=>{
    setFilters(f=>({...f,search:text})); setShowSearch(true);
  };
  // A ledger was loaded: the pin on the last import's cards is released.
  const ledgerLoaded=()=>{
    setPinTouched(false); setRefreshTouched([]);
  };
  // An import was applied; these cards changed.
  const importApplied=touched=>{
    setRefreshTouched(touched); setPinTouched(touched.length>0); // float just-changed entries to the top, this session
    setFilters(filtersClear());
  };
  return{filters,sort,bnOnly,periodView,venueScrub,viewToken,showSearch,searchRef,sortBy,dateReversed,refreshTouched,pinTouched,
    toggleSet,clearFilters,pickSort,toggleSearchBox,typeSearch,clearSearchText,
    toggleAcqWanted,toggleAcqOwned,toggleBuyNextView,toggleAcq3mo,toggleAcq6mo,toggleAcqHasCat,toggleAcqNoCat,toggleAcqDigital,
    toggleWatchedOnly,toggleDismissedOnly,toggleLabelledOnly,toggleShowAll,searchFor,ledgerLoaded,importApplied};
}
