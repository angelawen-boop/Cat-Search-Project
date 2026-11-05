//@ The period scrubber.
//@piece SCRUB_ROW,SCRUB_BULGE,SCRUB_ZONE,SCRUB_HOLD,SCRUB_SLOP

// The period scrubber (her design): hidden until she holds a finger on the middle of the right
// edge; then a ruler of every period in the view on a pale panel, the one she is in picked. Sliding moves the
// pick, read from the rows as laid out before the bulge so it never pushes the pick on; lifting
// jumps to that period's divider. A swipe that moves before the hold is an
// ordinary scroll. Rows never spread out: fewer periods, a shorter ruler.
const SCRUB_ROW=15.5, SCRUB_BULGE=28, SCRUB_ZONE=155, SCRUB_HOLD=300, SCRUB_SLOP=6;
//@piece scrubName

// The picked name bulges in place (her design): bigger, its row opened up; the others at 10px.
const scrubName=on=>on?{fontSize:18,fontWeight:700,lineHeight:"24px",borderRadius:13,padding:"0 9px"}:{fontSize:10,fontWeight:400,lineHeight:"14px",borderRadius:9,padding:"0 6px"};
//@piece PeriodScrubber

function PeriodScrubber({groups,C,onJump}){
  const zone=useRef(null);
  const[sel,setSel]=useState(null); // the picked row while open
  const live=useRef({timer:null,open:false,y0:0,y:0,sel:0});
  const g=useRef(groups); g.current=groups;
  const jump=useRef(onJump); jump.current=onJump;
  const n=groups.length;
  useEffect(()=>{
    const el=zone.current; if(!el)return;
    const L=live.current;
    const pick=()=>{
      const k=g.current.length, top=window.innerHeight/2-k*SCRUB_ROW/2;
      L.sel=Math.max(0,Math.min(k-1,Math.floor((L.y-top)/SCRUB_ROW))); setSel(L.sel);
    };
    const open=()=>{
      L.timer=null; const k=g.current.length; if(!k)return;
      // The period she is in: the last divider above the upper third of the screen.
      let cur=0; const marks=[...document.querySelectorAll("[data-period]")];
      for(const m of marks){ if(m.getBoundingClientRect().top<=window.innerHeight/3){const i=g.current.findIndex(x=>x.key===m.getAttribute("data-period"));if(i>=0)cur=i;} }
      L.open=true; L.sel=cur; setSel(cur);
    };
    const down=y=>{ L.y0=L.y=y; clearTimeout(L.timer); L.timer=setTimeout(open,SCRUB_HOLD); };
    const move=(y,ev)=>{
      L.y=y;
      if(L.open){ if(ev&&ev.cancelable)ev.preventDefault(); pick(); }
      else if(L.timer&&Math.abs(y-L.y0)>SCRUB_SLOP){ clearTimeout(L.timer); L.timer=null; }
    };
    const up=()=>{
      clearTimeout(L.timer); L.timer=null;
      if(L.open){ L.open=false; setSel(null); const x=g.current[L.sel]; if(x)jump.current(x.key); }
    };
    const ts=e=>{ if(e.touches.length===1)down(e.touches[0].clientY); };
    const tm=e=>move(e.touches[0].clientY,e);
    const mm=e=>move(e.clientY,e);
    const mu=()=>{ window.removeEventListener("mousemove",mm); window.removeEventListener("mouseup",mu); up(); };
    const md=e=>{ if(e.button!==0)return; e.preventDefault(); down(e.clientY); window.addEventListener("mousemove",mm); window.addEventListener("mouseup",mu); };
    el.addEventListener("touchstart",ts,{passive:true});
    el.addEventListener("touchmove",tm,{passive:false});
    el.addEventListener("touchend",up); el.addEventListener("touchcancel",up);
    el.addEventListener("mousedown",md);
    return()=>{ up(); el.removeEventListener("touchstart",ts); el.removeEventListener("touchmove",tm);
      el.removeEventListener("touchend",up); el.removeEventListener("touchcancel",up); el.removeEventListener("mousedown",md);
      window.removeEventListener("mousemove",mm); window.removeEventListener("mouseup",mu); };
  },[]);
  if(!n)return null;
  return(<>
    <div ref={zone} data-scrubber="zone" style={{position:"fixed",right:0,top:"50%",transform:"translateY(-50%)",width:16,height:SCRUB_ZONE,zIndex:997,
      touchAction:"pan-y",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"}}/>
    {sel!==null&&<div data-scrubber="panel" style={{position:"fixed",right:4,top:"50%",transform:"translateY(-50%)",zIndex:997,pointerEvents:"none",
      background:C.card+"DB",backdropFilter:"blur(3px)",WebkitBackdropFilter:"blur(3px)",border:"1px solid "+C.rule,borderRadius:10,padding:"8px 6px 8px 8px"}}>
      <div data-scrubber="ruler" style={{position:"relative"}}>
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:1,background:C.rule}}/>
        {groups.map((x,i)=>{const on=i===sel;return(
          <div key={x.key} data-scrub-row={x.key} style={{height:on?SCRUB_BULGE:SCRUB_ROW,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,whiteSpace:"nowrap",transition:"height 0.12s"}}>
            <span style={{...scrubName(on),color:on?C.onAction:C.soft,background:on?C.action:"none",transition:"font-size 0.12s"}}>{x.name}</span>
            <span style={{width:on?10:6,height:on?2:1,background:on?C.ink:C.soft}}/>
          </div>);})}
        {/* The panel is always as wide as its widest name bulged (her decision): a hidden copy of each sets it. */}
        <div aria-hidden="true" data-scrubber="sizer" style={{height:0,overflow:"hidden",visibility:"hidden",paddingRight:16}}>
          {groups.map(x=><div key={x.key} style={{whiteSpace:"nowrap"}}><span style={scrubName(true)}>{x.name}</span></div>)}
        </div>
      </div>
    </div>}
  </>);
}
