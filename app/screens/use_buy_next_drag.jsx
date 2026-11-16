//@ The Buy next drag: the card being dragged, the gesture that lifts and moves it, and the hold-the-scroll listener.
//@piece useBuyNextDrag

// Drag to reorder in the Buy next view. It is handed whether dragging is on and the action that records a
// move; it hands back the card being dragged and the gesture's start.
function useBuyNextDrag(dragOn,moveBuyNext){
  const[drag,setDrag]=useState(null); // the card being dragged in the Buy next view
  // Touch: hold a card ~0.45s (a buzz where the phone allows), then drag; a swipe before
  // that scrolls. Mouse: press and move. Buttons, links and version picks keep their taps.
  const dragGesture=useRef(null);
  const dragActs=useRef(null);
  dragActs.current={moveBuyNext};
  const startDrag=(e,id)=>{
    if(dragGesture.current||(e.button!==undefined&&e.button>0))return;
    if(e.target.closest&&e.target.closest("button,a,input,select,textarea,label,[role]"))return;
    const touch=e.type==="touchstart";
    if(touch&&e.touches.length!==1)return;
    const p0=touch?e.touches[0]:e;
    const g={lifted:false,x:p0.clientX,y:p0.clientY,lastY:p0.clientY,scroll0:window.scrollY,raf:0,timer:0};
    dragGesture.current=g;
    const place=()=>{
      const dy=g.lastY+window.scrollY-(g.y+g.scroll0),r=g.rects[g.from],centre=r.top+r.h/2+dy;
      g.to=g.rects.filter((q,i)=>i!==g.from&&q.top+q.h/2<centre).length;
      setDrag(d=>d&&{...d,dy,to:g.to});
    };
    const tick=()=>{ // near the screen's top or bottom edge, the page scrolls with her
      const E=70,H=window.innerHeight,v=g.lastY<E?-(E-g.lastY)/4:g.lastY>H-E?(g.lastY-(H-E))/4:0;
      if(v){window.scrollBy(0,v);place();}
      g.raf=requestAnimationFrame(tick);
    };
    const lift=()=>{
      const els=[...document.querySelectorAll("[data-buynext]")];
      g.ids=els.map(el=>el.getAttribute("data-buynext"));g.from=g.ids.indexOf(id);
      if(g.from<0)return end();
      g.rects=els.map(el=>{const b=el.getBoundingClientRect();return{top:b.top+window.scrollY,h:b.height};});
      g.lifted=true;g.to=g.from;
      if(touch){try{navigator.vibrate&&navigator.vibrate(25);}catch(_){}}
      setDrag({id,from:g.from,to:g.from,dy:0,h:g.rects[g.from].h});
      if(typeof requestAnimationFrame!=="undefined")g.raf=requestAnimationFrame(tick);
    };
    const move=ev=>{
      const p=ev.touches?ev.touches[0]:ev;if(!p)return;
      if(!g.lifted){
        const far=Math.hypot(p.clientX-g.x,p.clientY-g.y)>(touch?10:5);
        if(!far)return;
        if(touch)return end();
        lift();if(!g.lifted)return;
      }
      if(ev.cancelable)ev.preventDefault();
      g.lastY=p.clientY;place();
    };
    const up=()=>{
      if(g.lifted){
        const rest=g.ids.filter(x=>x!==id);
        dragActs.current.moveBuyNext(id,rest[g.to]||null,g.to>0?rest[g.to-1]:null);
        // The release is not a click on whatever sits under it.
        const eat=ev=>{ev.stopPropagation();ev.preventDefault();};
        window.addEventListener("click",eat,true);setTimeout(()=>window.removeEventListener("click",eat,true),0);
      }
      end();
    };
    const end=()=>{
      clearTimeout(g.timer);if(g.raf)cancelAnimationFrame(g.raf);
      document.removeEventListener(touch?"touchmove":"mousemove",move);
      document.removeEventListener(touch?"touchend":"mouseup",up);
      document.removeEventListener("touchcancel",end);
      dragGesture.current=null;setDrag(null);
    };
    document.addEventListener(touch?"touchmove":"mousemove",move);
    document.addEventListener(touch?"touchend":"mouseup",up);
    if(touch){document.addEventListener("touchcancel",end);g.timer=setTimeout(lift,450);}
  };
  // Once a card is lifted, a finger's move drags it and does not scroll the page. Chrome
  // lets a move be held back only by a listener in place before the touch begins.
  useEffect(()=>{
    if(!dragOn)return;
    const hold=ev=>{if(dragGesture.current&&dragGesture.current.lifted&&ev.cancelable)ev.preventDefault();};
    document.addEventListener("touchmove",hold,{passive:false});
    return()=>document.removeEventListener("touchmove",hold,{passive:false});
  },[dragOn]);
  return{drag,startDrag};
}
