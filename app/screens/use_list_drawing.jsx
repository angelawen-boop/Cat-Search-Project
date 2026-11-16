//@ The list's drawing: how much of the list is drawn as she scrolls, the jumps to a period and to the bottom, and the top and bottom buttons.
//@piece useListDrawing

// Memory and effects of drawing the list a stretch at a time. It takes the list, the token that changes when
// a filter or the sort does, and the scrubber's groups; it hands back what the layout draws from and the two jumps.
function useListDrawing(view,viewToken,scrubGroups){
  const[showTop,setShowTop]=useState(false); // show the return-to-top button once scrolled down
  useEffect(()=>{const onScroll=()=>setShowTop(window.scrollY>400);window.addEventListener("scroll",onScroll,{passive:true});onScroll();return()=>window.removeEventListener("scroll",onScroll);},[]);
  // DRAWN AS SHE SCROLLS: the first DRAW_STEP cards, then DRAW_STEP more each time the end
  // of the drawn list nears the screen. A new filter, sort or search starts again from the
  // top (viewToken). Jump to bottom draws the rest first. No IntersectionObserver → all.
  const[drawn,setDrawn]=useState({token:null,n:DRAW_STEP});
  const drawLimit=typeof IntersectionObserver==="undefined"?Infinity:drawn.token===viewToken?drawn.n:DRAW_STEP;
  const moreRef=useRef(null);
  const wantBottom=useRef(false);
  useEffect(()=>{
    const el=moreRef.current;
    if(!el)return;
    const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting))setDrawn({token:viewToken,n:drawLimit+DRAW_STEP}); },{rootMargin:"1500px 0px"});
    io.observe(el);
    return()=>io.disconnect();
  },[viewToken,drawLimit,view.length]);
  useEffect(()=>{ if(wantBottom.current){ wantBottom.current=false; window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"}); } });
  const wantPeriod=useRef(null);
  const scrollToPeriod=k=>{
    const el=document.querySelector("[data-period=\""+k+"\"]");
    if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-8,behavior:"auto"});
  };
  useEffect(()=>{ if(wantPeriod.current){ const k=wantPeriod.current; wantPeriod.current=null; scrollToPeriod(k); } });
  const jumpToPeriod=useCallback(k=>{
    const x=scrubGroups.find(g=>g.key===k); if(!x)return;
    if(x.at>=drawLimit){ wantPeriod.current=k; setDrawn({token:viewToken,n:x.at+DRAW_STEP}); }
    else scrollToPeriod(k);
  },[scrubGroups,drawLimit,viewToken]);
  const jumpToBottom=()=>{
    if(view.length>drawLimit){ wantBottom.current=true; setDrawn({token:viewToken,n:Infinity}); }
    else window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"});
  };
  return{drawLimit,moreRef,showTop,jumpToPeriod,jumpToBottom};
}
