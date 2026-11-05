//@ Small text and address tools: folding letters, Markdown and HTML entities, hosts, URL keys, the clipboard.
//@piece TRACKING_PARAM


// Tracking tags a link picks up on the way (?utm_source=chatgpt.com) say nothing about the page.
const TRACKING_PARAM=/^(?:utm_\w+|fbclid|gclid|msclkid|mc_cid|mc_eid)$/i;
//@piece withoutTracking

function withoutTracking(u){
  try{
    const x=new URL(u);
    for(const k of [...x.searchParams.keys()])if(TRACKING_PARAM.test(k))x.searchParams.delete(k);
    if(!x.search.replace(/^\?/,""))x.search="";
    return x.toString();
  }catch{ return u; }
}
//@piece hostOf

function hostOf(u){ try{ return new URL(u).hostname.toLowerCase(); }catch{ return ""; } }
//@piece siteUrlOf

// A Wayback Machine copy files under the museum it copied: the original address is
// the venue's site; the copy is still what is read and linked (Sargent and the Sea, RA).
function siteUrlOf(u){
  const m=/^https?:\/\/web\.archive\.org\/web\/\d{1,14}[a-z_]*\/(.+)$/i.exec(String(u||"").trim());
  if(!m)return u;
  const orig=/^https?:\/\//i.test(m[1])?m[1]:"http://"+m[1];
  try{ new URL(orig); return orig; }catch{ return u; }
}
//@piece originOf

function originOf(u){ try{ return new URL(u).origin+"/"; }catch{ return ""; } }
//@piece LETTER_FOLD

// Accents dropped, and the letters that are not accented ones folded too: ø, æ, œ, ß, ł,
// đ, ð, þ and dotless ı ("Hammershøi" matches "Hammershoi"). One fold for all matching.
const LETTER_FOLD={"\u00f8":"o","\u00e6":"ae","\u0153":"oe","\u00df":"ss","\u0142":"l","\u0111":"d","\u00f0":"d","\u00fe":"th","\u0131":"i"};
//@piece foldText

const foldText=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\u00f8\u00e6\u0153\u00df\u0142\u0111\u00f0\u00fe\u0131]/g,c=>LETTER_FOLD[c]);
//@piece stripMd


// The connector hands back the page as markdown. One line of it, as words.
function stripMd(line){
  return String(line||"")
    .replace(/!\[[^\]]*\]\([^)]*\)/g,"")             // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g,"$1")          // links → their words
    .replace(/<https?:[^>]*>/g,"")
    .replace(/\*\*|__/g,"")
    .replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g,"$1$2") // _italic_
    .replace(/\\([-*_#.()\[\]|])/g,"$1")              // markdown escapes
    .replace(/^\s*(?:#{1,6}\s+)+/,"")           // "# #### Special Loan:" (Frick)
    .replace(/^\s*[*+]\s+/,"")
    .replace(/\s+/g," ")
    .trim();
}
//@piece HTML_ENTITIES


// HTML character codes in page text, named (the HTML 4 set) and numeric: "&ecirc;" → "ê".
const HTML_ENTITIES=(()=>{
  const e={quot:'"',amp:"&",lt:"<",gt:">",apos:"'",OElig:"\u0152",oelig:"\u0153",Scaron:"\u0160",scaron:"\u0161",Yuml:"\u0178",
    circ:"\u02c6",tilde:"\u02dc",ensp:" ",emsp:" ",thinsp:" ",zwnj:"",zwj:"",lrm:"",rlm:"",ndash:"\u2013",mdash:"\u2014",
    lsquo:"\u2018",rsquo:"\u2019",sbquo:"\u201a",ldquo:"\u201c",rdquo:"\u201d",bdquo:"\u201e",dagger:"\u2020",Dagger:"\u2021",
    bull:"\u2022",hellip:"\u2026",permil:"\u2030",prime:"\u2032",Prime:"\u2033",lsaquo:"\u2039",rsaquo:"\u203a",oline:"\u203e",
    frasl:"\u2044",euro:"\u20ac",trade:"\u2122",larr:"\u2190",uarr:"\u2191",rarr:"\u2192",darr:"\u2193",harr:"\u2194",
    minus:"\u2212",lowast:"\u2217",ne:"\u2260",le:"\u2264",ge:"\u2265",infin:"\u221e"};
  ("nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest "
   +"Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig "
   +"agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml")
    .split(" ").forEach((n,i)=>{ e[n]=String.fromCharCode(160+i); });
  e.nbsp=" "; e.shy="";
  return e;
})();
//@piece decodeEntities

function decodeEntities(t){
  const cp=n=>{ try{ return n>0&&n<=0x10ffff?String.fromCodePoint(n):null; }catch{ return null; } };
  return String(t||"").replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z][A-Za-z0-9]{1,8}));/g,(x,d,h,n)=>{
    if(n)return Object.prototype.hasOwnProperty.call(HTML_ENTITIES,n)?HTML_ENTITIES[n]:x;
    const c=cp(d?+d:parseInt(h,16));
    return c===null?x:c;
  });
}
//@piece utf8Bytes

const utf8Bytes=s=>new TextEncoder().encode(String(s)).length;
//@piece mdLinks

function mdLinks(text){
  const out=[];
  for(const m of String(text||"").matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)/g))out.push({label:stripMd(m[1]),url:m[2]});
  return out;
}
//@piece baseDomain

// "shop.courtauld.ac.uk" → "courtauld.ac.uk". Two labels, three behind a
// country's own second level (ac.uk, org.uk, com.au…).
function baseDomain(h){
  const p=String(h||"").toLowerCase().replace(/^www\./,"").split(".").filter(Boolean);
  if(p.length<=2)return p.join(".");
  const two=p.slice(-2).join(".");
  return /^(?:ac|co|org|gov|com|net|edu)\.[a-z]{2}$/.test(two)?p.slice(-3).join("."):two;
}
//@piece isFileUrl

// The museum's own shop: its show page's shop link's site, a shop on the museum's own
// domain (shop.courtauld.ac.uk, a /shop path), or a shop site carrying the museum's
// name (diashop.org). A reseller's shelf for the museum is not.
// A file is never the shop (Petit Palais: a photo of its shop, ".../petit_palais_boutique-01.jpg").
const isFileUrl=u=>/\.(?:jpe?g|png|gif|webp|svg|pdf|mp4)(?:$|[?#])/i.test(String(u||""));
//@piece isValidYMD

function isValidYMD(s){ if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false; const d=new Date(s+"T00:00:00"); return !isNaN(d.getTime()); }
//@piece normalizeUrlKey

// Same address = same exhibition: scheme and host lowercased, the path never folded
// (folding it merged two exhibitions differing only in capitals). A trailing slash
// and a #fragment are not part of identity.
function normalizeUrlKey(u){
  try{
    const x=new URL(String(u||"").trim());
    x.hash="";
    const path=x.pathname.replace(/\/+$/,"");
    return x.protocol.toLowerCase()+"//"+x.host.toLowerCase()+path+x.search;
  }catch{ return ""; }
}
//@piece urlLooksValid


function urlLooksValid(u){ if(!u)return false; try{ const url=new URL(String(u).trim()); if(!/^https?:$/.test(url.protocol))return false; if(!/^[a-z0-9.-]+$/i.test(url.hostname))return false; if(!url.hostname.includes("."))return false; return true; }catch{ return false; } }
//@piece pause

const pause=ms=>new Promise(res=>setTimeout(res,ms));
//@piece today

// ── END OF THE CLOUD LEDGER ──────────────────────────────────────────────────

const today=()=>new Date().toISOString().slice(0,10);
//@piece oneText


// The page's own text: the full copy when one was asked for, else excerpts.
function oneText(r){
  const full=r&&typeof r.full_content==="string"?r.full_content:"";
  if(full.trim())return full;
  return Array.isArray(r&&r.excerpts)?r.excerpts.join("\n"):"";
}
//@piece copyText


// Put text on the clipboard; true only if it got there. The clipboard API
// first; a page in a frame may be refused it, so the old select-and-copy
// route second. Neither throwing is taken as success.
async function copyText(text){
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(String(text)); return true; } }catch{}
  try{
    const t=document.createElement("textarea"); t.value=String(text); t.setAttribute("readonly","");
    t.style.position="fixed"; t.style.opacity="0"; document.body.appendChild(t); t.select();
    const ok=document.execCommand&&document.execCommand("copy"); document.body.removeChild(t); return !!ok;
  }catch{ return false; }
}
