//@ Tiers and their colours, the closing window, Buy next and its dot's size beside the star.
//@piece isBuyNext

const isBuyNext=r=>!!r&&r.acquiring==="yes"&&!!r.buyNext;
//@piece TIER_SETS


// URGENCY COLOURS, ONE SET PER THEME. Dark washes are deep tints of the same hue, not
// the light ones dimmed, so the ladder keeps its meaning.
const TIER_SETS = {
  light: {
    upcoming: { ink: "#4A5A6B", wash: "#E1E5EB" },
    recent:   { ink: "#2D6B5A", wash: "#D4EDE4" },
    current:  { ink: "#2D4A3F", wash: "#DBE7E1" },
    fresh:    { ink: "#556B3E", wash: "#E3E8D8" },
    closing:  { ink: "#9C7020", wash: "#F0E6CE" },
    urgent:   { ink: "#A13823", wash: "#F0DCD6" },
    lapsed:   { ink: "#6B2E2E", wash: "#E5D6D4" },
    unknown:  { ink: "#6A6560", wash: "#E3DED7" },
  },
  dark: {
    upcoming: { ink: "#A8BDD4", wash: "#26313D" },
    recent:   { ink: "#7FD6B8", wash: "#193328" },
    current:  { ink: "#8FC4AE", wash: "#1B2B24" },
    fresh:    { ink: "#B4C98C", wash: "#242B1A" },
    closing:  { ink: "#E0B45C", wash: "#33280F" },
    urgent:   { ink: "#F09079", wash: "#3A1E17" },
    lapsed:   { ink: "#D9928F", wash: "#331C1C" },
    unknown:  { ink: "#A8A29A", wash: "#2A2622" },
  },
};
//@piece TIER_TEXT

const TIER_TEXT = {
    upcoming: { label: "Announced", note: "Not open yet. Catalogue usually appears at opening.", time: "upcoming", ord: 2 },
    recent: { label: "Recently opened", note: "Just opened. Catalogue should be available now.", time: "current", ord: 0 },
    current: { label: "On now", note: "In print. Cheapest it will ever be.", time: "current", ord: 1 },
    fresh: { label: "Closed under 3 months", note: "Still stocked. Comfortable window.", time: "past", ord: 4 },
    closing: { label: "Closed 3\u20136 months", note: "Shop stock thinning. Buy now if you want it.", time: "past", ord: 5 },
    urgent: { label: "Closed 6\u201312 months", note: "Final call. Reprints are rare.", time: "past", ord: 6 },
    lapsed: { label: "Closed over a year", note: "Assume out of print. Secondhand only.", time: "past", ord: 7 },
    // After Announced — her ordering.
    unknown: { label: "Dates unclear", note: "No reliable end date found.", time: "current", ord: 3 },
};
//@piece tiersFor

const tiersFor = mode => Object.fromEntries(Object.keys(TIER_TEXT).map(
  k => [k, { ...TIER_TEXT[k], ...TIER_SETS[mode][k] }]));
//@piece TIERS

// TIERS (light values) serves labels and `ord` outside the component; colour comes
// from the component's themed copy.
const TIERS = tiersFor("light");
//@piece starInkCache


// The buy-next dot matches the star's measured ink (her decision): 85% of its height,
// centred on it, because a disc reads larger than a star. No canvas → an 11px dot.
let starInkCache=null;
//@piece starInk

function starInk(){
  if(starInkCache)return starInkCache;
  let out={a:12,d:1};
  try{
    const b=document.createElement("button");b.style.fontSize="16px";document.body.appendChild(b);
    const f=getComputedStyle(b);const font=f.fontStyle+" "+f.fontWeight+" 16px "+f.fontFamily;b.remove();
    const c=typeof OffscreenCanvas==="function"?new OffscreenCanvas(1,1).getContext("2d"):null;
    if(c){c.font=font;const m=c.measureText("\u2605");const h=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
      if(h>0&&h<=16)out={a:m.actualBoundingBoxAscent,d:m.actualBoundingBoxDescent};}
  }catch{}
  const D=Math.round((out.a+out.d)*0.85*2)/2;
  return starInkCache={D,v:(out.a-out.d-D)/2};
}
//@piece inClosingWindow


// Closing Window on the counts line (her decision): Yes-wanted catalogues whose show
// closed 3–12 months ago.
function inClosingWindow(r){
  if(!r||!r.interested||r.acquiring!=="yes")return false;
  const t=tierFor(r);
  return t==="closing"||t==="urgent";
}
//@piece tierFor


function tierFor(r){
  const now=new Date(),st=r.startDate?new Date(r.startDate+"T00:00:00"):null,en=r.endDate?new Date(r.endDate+"T00:00:00"):null;
  if(st&&!isNaN(st)&&st>now)return"upcoming";
  if(en&&!isNaN(en)){if(en>=now){return(st&&wksSince(r.startDate)<=6)?"recent":"current";}const m=moSince(r.endDate);if(m<3)return"fresh";if(m<6)return"closing";if(m<12)return"urgent";return"lapsed";}
  if(st&&!isNaN(st)&&st<=now)return wksSince(r.startDate)<=6?"recent":"current";
  return"unknown";
}
