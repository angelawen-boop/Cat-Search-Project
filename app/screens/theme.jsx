//@ The two colour palettes, the card draw step and the link-button style.
//@piece PALETTES


// Two palettes, one set of names (docs/app.md §3). Every colour the app paints comes
// from here or TIER_SETS — a stray hex would be a cream patch on a dark page. The dark
// set is designed, not inverted: a warm near-black ground, `soft` kept light.
const PALETTES={
  light:{bg:"#E8E4DE",card:"#F5F2ED",ink:"#1E1B18",soft:"#78736C",rule:"#CBC5BB",
         action:"#2D4A3F",accent:"#A13823",owned:"#7B5EA7",muted:"#B5AFA6",
         drawer:"#DDD8D0",body:"#3D3730",dim:"#ECEAE6",panel:"#ECE8E1",
         warnBg:"#F7E4C4",warnEdge:"#B5791A",warnInk:"#6B4A1E",
         okBg:"#D8EAE4",okEdge:"#2D6B5A",okInk:"#1F4C40",
         holdBg:"#E8E2D6",ownedBg:"#EDE5F5",
         rejectInk:"#8A6D3B",neverInk:"#7A4A4A",star:"#B8860B",buyNext:"#C0281E",onAction:"#fff",
         scrim:"rgba(20,18,16,0.45)"},
  dark: {bg:"#1A1815",card:"#232019",ink:"#EDE8E0",soft:"#A8A29A",rule:"#3A352E",
         action:"#5E9E85",accent:"#E2735A",owned:"#B79BE0",muted:"#6A645C",
         drawer:"#2A2620",body:"#D6D0C6",dim:"#201D18",panel:"#262219",
         warnBg:"#3A2E14",warnEdge:"#C79A3E",warnInk:"#F0D9A4",
         okBg:"#16302A",okEdge:"#4E9B80",okInk:"#A6DCC6",
         holdBg:"#32291C",ownedBg:"#2B2136",
         rejectInk:"#D6B87A",neverInk:"#E0A3A3",star:"#E0B45C",buyNext:"#F0705F",onAction:"#12100E",
         scrim:"rgba(0,0,0,0.6)"},
};
//@piece DRAW_STEP


// How many ledger cards are drawn at first, and how many more as she scrolls.
const DRAW_STEP=200;
//@piece linkButton

// The card's link buttons (Museum shop, Publisher, the bookstores), in a palette's colours.
const linkButton=C=>({fontSize:11,fontWeight:500,color:C.ink,background:C.card,border:"1px solid "+C.rule,borderRadius:3,padding:"4px 9px",textDecoration:"none",display:"inline-block",whiteSpace:"nowrap"});
