import React,{useState,useEffect,useMemo,useCallback,useRef} from "react";

// THEME SHELF — art books gathered by theme, not by exhibition (her design;
// docs/themes.md). A wishlist: cover, title, ISBN, publisher, when it was published
// and the four booksellers. Its own page with its own store, so Cat Watch's ledger is
// never touched. What it shares with Cat Watch (ISBNs, the booksellers, saved pages, the
// connector's messages) is copied in by `node build/sync_shelf.js`.
const APP_VERSION="2.1";
const APP_DATE="19 Oct 2026";

// ===== SHARED WITH CAT WATCH — written by `node build/sync_shelf.js`; never edit between these markers. Edit Cat_Watch.jsx, then run it. =====
const cleanIsbn=v=>{if(!v)return null;const d=String(v).replace(/[^0-9]/g,"");return d.length===13?d:null;};
const fmtIsbn=v=>{const c=cleanIsbn(v);return c?c.slice(0,3)+"-"+c.slice(3):null;};
function isbn10to13(v){
  const t=String(v||"").replace(/[^0-9Xx]/g,"").toUpperCase();
  if(t.length!==10)return null;
  let sum=0;
  for(let i=0;i<10;i++){
    const ch=t[i];
    const d=(ch==="X")?10:(ch>="0"&&ch<="9"?Number(ch):-1);
    if(d<0||(ch==="X"&&i!==9))return null;   // X is only ever the check digit
    sum+=d*(10-i);
  }
  if(sum%11!==0)return null;                 // the number does not check out
  const core="978"+t.slice(0,9);
  let s2=0;
  for(let i=0;i<12;i++)s2+=Number(core[i])*(i%2?3:1);
  return core+String((10-(s2%10))%10);
}
function isbn13Checks(d){
  if(!/^97[89]\d{10}$/.test(d))return false;
  let sum=0;
  for(let i=0;i<12;i++)sum+=Number(d[i])*(i%2?3:1);
  return (10-(sum%10))%10===Number(d[12]);
}
const toIsbn13=(v,seen)=>{
  const d=String(v||"").replace(/[^0-9]/g,"");
  const isbn=d.length===13?(isbn13Checks(d)?d:null):isbn10to13(v);
  if(!isbn||seen===undefined)return isbn;
  return isbnInText(isbn,Array.isArray(seen)?seen.map(resultText).join("\n"):seen)?isbn:null;
};
function isbn13to10(d){
  if(!/^978\d{10}$/.test(d))return null;
  const core=d.slice(3,12);
  let s=0;
  for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);
  const c=(11-s%11)%11;
  return core+(c===10?"X":String(c));
}
function isbnInText(isbn,text){
  const d=String(isbn||"").replace(/\D/g,"");
  if(d.length!==13)return false;
  const a=String(text||"").replace(/(\d)[\u2010-\u2015-](?=[\dXx])/g,"$1");
  const b=a.replace(/(\d) (?=[\dXx])/g,"$1");
  return [d,isbn13to10(d)].filter(Boolean).some(f=>{ const re=new RegExp("(?<![0-9])"+f+"(?![0-9Xx])","i"); return re.test(a)||re.test(b); });
}
function resultText(x){
  return [x&&x.title,x&&x.url,x&&typeof x.full_content==="string"?x.full_content:"",
    Array.isArray(x&&x.excerpts)?x.excerpts.join("\n"):""].filter(Boolean).join("\n");
}
function resellerLinks(isbn,title){const q=encodeURIComponent(isbn||title),tq=encodeURIComponent(title);return[{name:"Amazon AU",href:"https://www.amazon.com.au/s?k="+q},{name:"AbeBooks AU",href:"https://www.abebooks.com/servlet/SearchResults?ds=30&dym=on&kn="+(isbn||tq)+"&rollup=on&sortby=17"},{name:"Alibris",href:"https://www.alibris.com/booksearch?keyword="+q},{name:"Booko AU",href:isbn?"https://booko.au/"+isbn:"https://booko.au/search?query_type=1&q="+tq.replace(/%20/g,"+")}];}
function savedPageHtml(text){
  const t=String(text||"");
  const b=(t.match(/boundary="?([^";\r\n]+)"?/i)||[])[1];
  if(!b||!/^\s*(?:From:|MIME-Version:|Snapshot-Content-Location:|Subject:|Date:)/i.test(t))return{html:t,url:""};
  const url=(t.match(/^Snapshot-Content-Location:\s*(\S+)/mi)||[])[1]||"";
  for(const part of t.split("--"+b)){
    const cut=part.search(/\r?\n\r?\n/); if(cut<0)continue;
    const head=part.slice(0,cut);
    if(!/^Content-Type:\s*text\/html/mi.test(head))continue;
    let body=part.slice(cut).replace(/^\r?\n\r?\n/,"");
    const enc=(head.match(/^Content-Transfer-Encoding:\s*(\S+)/mi)||[])[1]||"";
    if(/quoted-printable/i.test(enc)){
      const bytes=[],raw=body.replace(/=\r?\n/g,"");
      for(let i=0;i<raw.length;i++){
        if(raw[i]==="="&&/^[0-9A-F]{2}$/i.test(raw.slice(i+1,i+3))){ bytes.push(parseInt(raw.slice(i+1,i+3),16)); i+=2; }
        else{ const c=raw.charCodeAt(i); if(c<128)bytes.push(c); else bytes.push(...new TextEncoder().encode(raw[i])); }
      }
      body=new TextDecoder("utf-8").decode(new Uint8Array(bytes));
    }else if(/base64/i.test(enc)){
      body=new TextDecoder("utf-8").decode(Uint8Array.from(atob(body.replace(/\s+/g,"")),c=>c.charCodeAt(0)));
    }
    return{html:body,url:url||(head.match(/^Content-Location:\s*(\S+)/mi)||[])[1]||""};
  }
  return{html:"",url};
}
function savedPageReply(text,parse){
  const got=savedPageHtml(text);
  if(!got.html.trim())return{ok:false,why:"The file holds no web page."};
  const doc=parse(got.html);
  const meta=sel=>{ const e=doc.querySelector(sel); return e?(e.getAttribute("href")||e.getAttribute("content")||"").trim():""; };
  const url=got.url||meta('link[rel="canonical"]')||meta('meta[property="og:url"]')||((String(text).match(/saved from url=\(\d+\)(\S+?)\s*-->/i)||[])[1]||"");
  if(!/^https?:\/\//i.test(url))return{ok:false,why:"The saved page doesn’t say its web address."};
  for(const e of doc.querySelectorAll("script,style,noscript,svg,template,iframe"))e.remove();
  const out=[];
  const BLOCK=/^(?:P|DIV|SECTION|ARTICLE|MAIN|HEADER|FOOTER|NAV|ASIDE|UL|OL|TABLE|TR|DL|DT|DD|FIGURE|FIGCAPTION|BLOCKQUOTE|FORM|FIELDSET)$/;
  const walk=n=>{
    if(n.nodeType===3){ out.push(n.textContent.replace(/\s+/g," ")); return; }
    if(n.nodeType!==1)return;
    const tag=n.tagName.toUpperCase(), h=tag.match(/^H([1-6])$/);
    if(tag==="BR"){ out.push("\n"); return; }
    if(tag==="A"){
      const href=n.getAttribute("href")||"", txt=n.textContent.replace(/\s+/g," ").trim();
      let abs=""; try{ abs=new URL(href,url).href; }catch{}
      if(txt&&/^https?:/i.test(abs)&&!n.querySelector("h1,h2,h3,h4,h5,h6,p,div,li")){ out.push("["+txt+"]("+abs+")"); return; }
    }
    if(h||tag==="LI"||BLOCK.test(tag))out.push("\n\n");
    if(h)out.push("#".repeat(+h[1])+" ");
    if(tag==="LI")out.push("* ");
    for(const c of n.childNodes)walk(c);
    if(h||tag==="LI"||BLOCK.test(tag))out.push("\n\n");
  };
  if(doc.body)walk(doc.body);
  const full=out.join("").split("\n").map(l=>l.replace(/[ \t]+/g," ").trim()).join("\n").replace(/\n{3,}/g,"\n\n").trim();
  const title=((doc.querySelector("title")||{}).textContent||"").replace(/\s+/g," ").trim();
  return{ok:true,res:{url,title,full_content:full}};
}
function mcpTrouble(e){
  const code=String((e&&e.code)||"");
  if(code==="server_not_connected")return "Add the \u201cParallel Search Key\u201d connector in claude.ai \u2192 Settings \u2192 Connectors, then try again.";
  if(code==="needs_reauth")       return "Reconnect \u201cParallel Search Key\u201d in claude.ai \u2192 Settings \u2192 Connectors \u2014 its access has lapsed.";
  if(code==="not_in_manifest")    return "This page isn\u2019t allowed to use \u201cParallel Search Key\u201d \u2014 you may have turned it off for this artifact.";
  if(code==="selection_required") return "You have more than one \u201cParallel Search Key\u201d connector. Pick one when Claude asks, then try again.";
  if(code==="blocked_by_policy")  return "Your organisation blocks this connector.";
  if(code==="server_unavailable") return "The search service didn\u2019t answer. Worth one more try in a moment.";
  if(code==="cancelled")          return "Search stopped.";
  return "Search failed ("+(code||"unknown")+").";
}
function lastJsonObject(text){
  const t=String(text||""), found=[];
  let depth=0, start=-1, inStr=false, esc=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(inStr){ if(esc)esc=false; else if(c==="\\")esc=true; else if(c==='"')inStr=false; continue; }
    if(c==='"'){ if(depth>0)inStr=true; continue; }
    if(c==="{"){ if(depth===0)start=i; depth++; }
    else if(c==="}"&&depth>0){ depth--; if(depth===0)found.push(t.slice(start,i+1)); }
  }
  for(let k=found.length-1;k>=0;k--){
    try{ const v=JSON.parse(found[k]); if(v&&typeof v==="object"&&!Array.isArray(v))return v; }catch{}
  }
  return null;
}
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
const linkButton=C=>({fontSize:11,fontWeight:500,color:C.ink,background:C.card,border:"1px solid "+C.rule,borderRadius:3,padding:"4px 9px",textDecoration:"none",display:"inline-block",whiteSpace:"nowrap"});
const MON3=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtRefresh(iso){if(!iso)return"never";const d=new Date(iso);if(isNaN(d))return"never";const mon=MON3[d.getMonth()];let h=d.getHours();const ap=h<12?"am":"pm";h=h%12;if(h===0)h=12;const mm=String(d.getMinutes()).padStart(2,"0");return mon+" "+d.getDate()+", "+d.getFullYear()+" "+h+":"+mm+ap;}
function relTime(iso){if(!iso)return null;const d=new Date(iso);if(isNaN(d))return null;const s=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));if(s<60)return"just now";const m=Math.floor(s/60);if(m<60)return m+" minute"+(m===1?"":"s")+" ago";const h=Math.floor(m/60);if(h<24)return h+" hour"+(h===1?"":"s")+" ago";const day=Math.floor(h/24);return day+" day"+(day===1?"":"s")+" ago";}
// ===== END SHARED =====

// ── THE CONNECTOR AND CLAUDE ────────────────────────────────────────────────
// The page cannot reach the internet itself: searching and reading pages go through her
// keyed connector, and Claude (`sample`) reads only the text handed to it.
// SEARCH_SERVER must match the connector named in the page's published `mcp` capability.
const SEARCH_SERVER="Parallel Search Key";
const SEARCH_TOOL="web_search";
const FETCH_TOOL="web_fetch";
const SEARCH_SESSION="shelf"+Math.random().toString(16).slice(2).padEnd(16,"0")+Date.now().toString(16);

async function useCap(name){
  try{
    if(typeof window==="undefined"||!window.claude||typeof window.claude.use!=="function")return null;
    return await window.claude.use(name);
  }catch{ return null; }
}
async function searchWeb(objective,queries){
  const mcp=await useCap("mcp");
  if(!mcp)return{ok:false,results:[],detail:"Searching needs the page opened from its claude.ai link."};
  try{
    const res=await mcp.callTool(SEARCH_SERVER,SEARCH_TOOL,{objective,search_queries:queries,session_id:SEARCH_SESSION});
    const p=res&&res.payload;
    return{ok:true,results:(p&&Array.isArray(p.results))?p.results:[]};
  }catch(e){ return{ok:false,results:[],detail:mcpTrouble(e)}; }
}
async function fetchPage(url,objective){
  const mcp=await useCap("mcp");
  if(!mcp)return{ok:false,results:[],detail:"Reading a link needs the page opened from its claude.ai link."};
  try{
    const res=await mcp.callTool(SEARCH_SERVER,FETCH_TOOL,{urls:[url],objective,session_id:SEARCH_SESSION,full_content:true});
    const p=res&&res.payload;
    return{ok:true,results:(p&&Array.isArray(p.results))?p.results:[]};
  }catch(e){ return{ok:false,results:[],detail:mcpTrouble(e)}; }
}
async function askClaude(prompt){
  const sample=await useCap("sample");
  if(!sample)return{ok:false,detail:"Claude isn’t available to this page in this viewer."};
  try{ return{ok:true,data:await sample.json(prompt,{modelTier:"default"})}; }
  catch(e){
    const code=String((e&&e.code)||"");
    if(code==="invalid_json"&&e&&e.text){ const data=lastJsonObject(e.text); if(data)return{ok:true,data}; }
    if(code==="not_granted")return{ok:false,detail:"You declined to let this page use Claude. Reload and allow it."};
    if(code==="rate_limited")return{ok:false,detail:"Claude is rate-limited. Try again in a minute."};
    return{ok:false,detail:"Claude’s answer came back unreadable ("+(code||"unknown")+"). Try again."};
  }
}

// ── READING A BOOK'S FACTS ──────────────────────────────────────────────────
// Claude reads; code decides. The ISBN must be printed in the text Claude was given
// (toIsbn13 with `seen`), a publisher must be printed there, and so must the year.
// Anything that fails is left blank rather than guessed.
const FACTS_RULES=[
  "Answer with JSON only, in this shape: {\"isbn13\": string|null, \"title\": string|null, \"publisher\": string|null, \"published\": string|null}.",
  "Use only the text below. Never guess. A field the text does not give is null.",
  "isbn13: the ISBN printed for this book (13 digits; if only an ISBN-10 is printed, give that).",
  "title: the book's full title, its subtitle after a colon, in ordinary capitals (never ALL CAPS). No author names, edition or binding words, seller notes or \"signed\".",
  "publisher: the publishing house of this edition as printed, without its city. If several houses published it together, join them with \" / \" in the order printed.",
  "published: when this edition was first published, as \"YYYY-MM-DD\", \"YYYY-MM\" or \"YYYY\" — only as much as the text gives. Not a reprint, a seller's listing date or a copyright line for another edition.",
  "When pages disagree, prefer the publisher's own page or a library record over a bookseller's listing.",
].join("\n");

function factsPrompt(isbn,texts){
  return "You are reading web pages about ONE book"+(isbn?", ISBN "+isbn:"")+".\n"+FACTS_RULES
    +"\n\n"+texts.map((t,i)=>"=== PAGE "+(i+1)+" ===\n"+t).join("\n\n");
}

const fold=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();

// "2002", "2010-11", "2010-11-05" → kept as given; anything else, or a year not printed
// in the text, → null.
function cleanPublished(v,text){
  const m=String(v||"").trim().match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if(!m)return null;
  const y=+m[1], now=new Date().getFullYear();
  if(y<1450||y>now+1)return null;
  if(m[2]&&(+m[2]<1||+m[2]>12))return null;
  if(!new RegExp("(?<![0-9])"+m[1]+"(?![0-9])").test(String(text||"")))return null;
  return m[0];
}
function cleanPublisher(v,text){
  const t=" "+fold(text)+" ";
  const parts=String(v||"").split(/\s+\/\s+/).map(p=>p.replace(/\s+/g," ").trim()).filter(p=>p&&t.includes(" "+fold(p)+" "));
  return parts.length?parts.join(" / "):null;
}
function cleanTitle(v){
  const t=String(v||"").replace(/\s+/g," ").trim();
  return t.length>=2&&t.length<=300?t:null;
}
// isbn: known when she typed it; else it must come from the page.
function checkFacts(v,text,isbn){
  const got=isbn||toIsbn13(v&&v.isbn13,text);
  if(!got)return{ok:false,why:"This page doesn’t print an ISBN for the book, so it can’t go on the shelf from here. Try adding it by ISBN."};
  const title=cleanTitle(v&&v.title);
  if(!title)return{ok:false,why:"Couldn’t read the book’s title from what was found."};
  return{ok:true,book:{isbn13:got,title,publisher:cleanPublisher(v&&v.publisher,text),published:cleanPublished(v&&v.published,text)}};
}
const cut=(s,n)=>String(s||"").length>n?String(s).slice(0,n):String(s||"");

// BY ISBN, first: Open Library's record for the number — an address that can be built,
// and structured, so code reads it with no Claude call. A bare-number web search is hit
// and miss (the Watteau drawings, 978-1905711710, brought only unrelated pages).
const OL_API=isbn=>"https://openlibrary.org/api/books?bibkeys=ISBN:"+isbn+"&format=json&jscmd=data";
const MONTHS=["january","february","march","april","may","june","july","august","september","october","november","december"];
// "February 28, 2008", "Feb 2008", "2008", "2008-02-28" → "2008-02-28", "2008-02", "2008".
function olDate(v){
  const s=String(v||"").trim().toLowerCase(), pad=n=>String(n).padStart(2,"0");
  let m=s.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if(m)return m[0];
  m=s.match(/^([a-z]{3,9})\.?\s+(?:(\d{1,2}),?\s+)?(\d{4})$/)||s.match(/^(?:(\d{1,2})\s+)?([a-z]{3,9})\.?,?\s+(\d{4})$/);
  if(m){
    const [name,day]=/^\d/.test(m[1]||"")?[m[2],m[1]]:[m[1],m[2]];
    const mo=MONTHS.findIndex(x=>x.startsWith(name.slice(0,3)));
    if(mo>=0)return m[3]+"-"+pad(mo+1)+(day&&+day>=1&&+day<=31?"-"+pad(day):"");
  }
  m=s.match(/(?<!\d)(1[5-9]\d\d|20\d\d)(?!\d)/);
  return m?m[1]:null;
}
function readOpenLibrary(text,isbn){
  let d=null; try{ d=JSON.parse(text); }catch{ return null; }
  const r=d&&d["ISBN:"+isbn];
  if(!r||!cleanTitle(r.title))return null;
  const title=cleanTitle(r.title+(r.subtitle?": "+r.subtitle:""));
  const pubs=(Array.isArray(r.publishers)?r.publishers:[]).map(p=>String((p&&p.name)||"").trim()).filter(Boolean);
  return{isbn13:isbn,title,publisher:pubs.length?pubs.join(" / "):null,published:olDate(r.publish_date),
    source:r.key?"https://openlibrary.org"+r.key:"https://openlibrary.org/isbn/"+isbn};
}
// BY ISBN, else: one search; only the results that print this ISBN are read.
async function lookupIsbn(isbn,io){
  const o=await io.fetch(OL_API(isbn),"The whole JSON record.");
  const rec=o.ok&&o.results[0]?readOpenLibrary(String(o.results[0].full_content||(o.results[0].excerpts||[]).join("")),isbn):null;
  if(rec)return{ok:true,book:rec};
  const ten=isbn13to10(isbn);
  const s=await io.search("The book with ISBN "+isbn+": its title, publisher and publication date.",
    [isbn,"ISBN "+isbn,...(ten?[ten]:[])]);
  if(!s.ok)return{ok:false,why:s.detail};
  const hits=s.results.filter(r=>isbnInText(isbn,resultText(r)));
  if(!hits.length)return{ok:false,why:"No page found that prints ISBN "+fmtIsbn(isbn)+". Try adding it by a link to the book’s page, or a page you saved."};
  const texts=hits.slice(0,6).map(r=>cut(resultText(r),4000));
  const a=await io.ask(factsPrompt(fmtIsbn(isbn),texts));
  if(!a.ok)return{ok:false,why:a.detail};
  const c=checkFacts(a.data,texts.join("\n"),isbn);
  return c.ok?{ok:true,book:{...c.book,source:hits[0].url||null}}:c;
}
// BY LINK or SAVED PAGE: one page, read whole.
async function readOnePage(res,io){
  const text=cut(resultText(res),24000);
  if(text.replace(/\s+/g,"").length<80)return{ok:false,why:"The page came back empty — the site may refuse to be read. Save the page in your browser and add it under Page."};
  const a=await io.ask(factsPrompt(null,[text]));
  if(!a.ok)return{ok:false,why:a.detail};
  const c=checkFacts(a.data,text,null);
  return c.ok?{ok:true,book:{...c.book,source:res.url||null}}:c;
}
async function lookupLink(url,io){
  const f=await io.fetch(url,"This book's ISBN, title, publisher and publication date.");
  if(!f.ok)return{ok:false,why:f.detail};
  if(!f.results.length)return{ok:false,why:"That page couldn’t be read. If the site blocks it, save the page and add it under Page."};
  return readOnePage({...f.results[0],url:f.results[0].url||url},io);
}

// ── A COVER FROM A SAVED PAGE ───────────────────────────────────────────────
// A page saved as "Webpage, Single File" (.mhtml) carries its pictures. The cover is the
// one the page names as its own picture (og:image), else one whose address carries the
// book's ISBN. Nothing is guessed from size: a banner is often the biggest picture.
function mhtmlImages(text){
  const t=String(text||"");
  const b=(t.match(/boundary="?([^";\r\n]+)"?/i)||[])[1];
  if(!b)return[];
  const out=[];
  for(const part of t.split("--"+b)){
    const at=part.search(/\r?\n\r?\n/); if(at<0)continue;
    const head=part.slice(0,at);
    const type=((head.match(/^Content-Type:\s*(image\/(?:jpeg|png|webp|gif))/mi)||[])[1]||"").toLowerCase();
    if(!type||!/^Content-Transfer-Encoding:\s*base64/mi.test(head))continue;
    const url=(head.match(/^Content-Location:\s*(\S+)/mi)||[])[1]||"";
    out.push({url,type,b64:part.slice(at).replace(/\s+/g,"")});
  }
  return out;
}
function pickCover(text,doc,isbn){
  const imgs=mhtmlImages(text);
  if(!imgs.length)return null;
  const og=doc&&doc.querySelector('meta[property="og:image"],meta[name="og:image"],meta[name="twitter:image"]');
  const want=og?String(og.getAttribute("content")||"").trim():"";
  const same=(a,b)=>{ try{ const x=new URL(a),y=new URL(b); return x.host===y.host&&x.pathname===y.pathname; }catch{ return a===b; } };
  const named=want&&imgs.find(i=>same(i.url,want));
  if(named)return named;
  const ten=isbn13to10(isbn||"");
  return imgs.find(i=>isbn&&(i.url.includes(isbn)||(ten&&i.url.includes(ten))))||null;
}
function b64Blob(img){
  const bin=atob(img.b64), u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  return new Blob([u],{type:img.type});
}
// Shrunk to 600 px wide, sharp on a phone and small in the store.
async function shrinkImage(blob){
  try{
    const url=URL.createObjectURL(blob);
    const img=await new Promise((ok,no)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=no; i.src=url; });
    URL.revokeObjectURL(url);
    const w=Math.min(600,img.naturalWidth||600), h=Math.round((img.naturalHeight||900)*w/(img.naturalWidth||600));
    const c=document.createElement("canvas"); c.width=w; c.height=h;
    c.getContext("2d").drawImage(img,0,0,w,h);
    const out=await new Promise(ok=>c.toBlob(ok,"image/jpeg",0.86));
    return out||blob;
  }catch{ return blob; }
}

// ── HOW OLD A BOOK IS ───────────────────────────────────────────────────────
// Her out-of-print signal: the publication date, and its age in whole years.
function publishedLine(p,now){
  const m=String(p||"").match(/^(\d{4})(?:-(\d{2}))?/);
  if(!m)return"Publication date unknown";
  const n=now||new Date(), y=+m[1], mo=m[2]?+m[2]:null;
  const yrs=mo?Math.floor(((n.getFullYear()-y)*12+(n.getMonth()+1-mo))/12):n.getFullYear()-y;
  const when=(mo?MON3[mo-1]+" ":"")+y;
  return"Published "+when+" · "+(yrs<=0?"this year":yrs===1?"1 year":yrs+" years");
}

// ── ORDER ───────────────────────────────────────────────────────────────────
// One order for every book, whichever theme is showing (her choice, the simpler one).
// A dragged book takes a number between its new neighbours, so a move is one write.
function orderBetween(a,b){
  if(a==null&&b==null)return 0;
  if(a==null)return b-1;
  if(b==null)return a+1;
  return(a+b)/2;
}
// Visible list `vis`, book `id` dropped at index `to` of the list without it.
function dropOrder(vis,id,to){
  const rest=vis.filter(b=>b.isbn13!==id);
  const prev=rest[to-1], next=rest[to];
  return orderBetween(prev?prev.order:null,next?next.order:null);
}
const byOrder=(a,b)=>(a.order-b.order)||String(a.isbn13).localeCompare(String(b.isbn13));
const isbnMatches=(b,q)=>{ const d=String(q||"").replace(/\D/g,""); if(!d)return true; return String(b.isbn13).includes(d)||String(isbn13to10(b.isbn13)||"").includes(d); };

// ── THE STORE ───────────────────────────────────────────────────────────────
// One document per book (books/<isbn13>) and per theme (themes/<id>); a cover is an asset
// whose id the book carries.
const BOOKS="books", THEMES="themes";
async function readAll(db,coll){
  const snap=await db.collection(coll).limit(1000).get();
  return snap.docs.map(d=>({...(d.data()||{}),_id:d.id}));
}
const bookDoc=b=>({isbn13:b.isbn13,title:b.title,publisher:b.publisher||null,published:b.published||null,
  themes:Array.isArray(b.themes)?b.themes:[],order:Number(b.order)||0,cover:b.cover||null,source:b.source||null,addedAt:b.addedAt||new Date().toISOString()});
const coverSrc=b=>b&&b.cover?"/_blob/"+b.cover:null;
const newId=()=>"t"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const hostOf=u=>{ try{ return new URL(u).hostname.replace(/^www\./,""); }catch{ return""; } };


// ── THE LOOK ────────────────────────────────────────────────────────────────
// Cat Watch's look throughout (her decision: the shelf is an extension of the app, on
// its own page only while it is a prototype). Palettes and link buttons are copied in
// above; the header, buttons, chip rows, pop-ups and footer follow Cat_Watch.jsx.
// Only what inline styles cannot say lives here: the grid's columns and the drag.
const CSS=`
.ts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(200px,calc(50% - 6px)),1fr));gap:12px;align-items:start}
.ts-card{touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:grab}
.ts-card.ghost{opacity:.25}
.ts-card:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.ts-float{position:fixed;left:0;top:0;width:150px;pointer-events:none;z-index:1300;transform-origin:20% 20%;opacity:.95}
@media (prefers-reduced-motion:no-preference){.ts-card{transition:transform .12s ease}}
`;
const SERIF="'Fraunces',Georgia,serif";
// The shelf's one difference from Cat Watch (her decision): its rose, in place of Cat
// Watch's accent and action colours, so the two pages tell themselves apart.
const ROSE={light:{accent:"#8A4559",action:"#8A4559",onAction:"#fff"},dark:{accent:"#D99AAE",action:"#D99AAE",onAction:"#1A1013"}};
const label9=C=>({fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2});
const field=C=>({padding:"7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box",minWidth:0});
const textBtn=C=>({background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0,fontFamily:"inherit"});
const warnBox=C=>({marginTop:8,padding:"7px 11px",background:C.warnBg,border:"1px solid "+C.warnEdge,borderRadius:4,fontSize:11.5,color:C.warnInk,lineHeight:1.45});
const dialogOuter=C=>({position:"fixed",inset:0,background:C.scrim,zIndex:1050,display:"flex",flexDirection:"column",justifyContent:"center",padding:16});
const dialogInner=C=>({background:C.bg,borderRadius:8,maxWidth:620,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",gap:12,maxHeight:"100%",overflow:"auto",boxShadow:"0 8px 30px rgba(0,0,0,0.3)",padding:"14px 18px 14px",boxSizing:"border-box"});

function Cover({book,C,big}){
  const src=coverSrc(book);
  const [bad,setBad]=useState(false);
  useEffect(()=>setBad(false),[src]);
  return(
    <div style={{width:"100%",maxWidth:big?160:"100%",aspectRatio:"2 / 3",background:C.panel,display:"flex",overflow:"hidden",flexShrink:0,borderRadius:big?3:0}}>
      {src&&!bad
        ?<img src={src} alt={"Cover of "+book.title} onError={()=>setBad(true)} draggable={false} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",pointerEvents:"none"}}/>
        :<div style={{flex:1,margin:8,padding:10,border:"1px solid "+C.rule,display:"flex",flexDirection:"column",justifyContent:"center",gap:8,textAlign:"center"}}>
          <span style={{fontFamily:SERIF,fontSize:big?15:16,fontWeight:500,lineHeight:1.2,color:C.ink,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:6,WebkitBoxOrient:"vertical"}}>{book.title}</span>
          {book.publisher?<span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft}}>{book.publisher}</span>:null}
        </div>}
    </div>
  );
}

function Shops({book,C}){
  const lnk=linkButton(C);
  return(
    <div className="ts-shops" style={{display:"flex",flexWrap:"wrap",gap:5}}>
      {resellerLinks(book.isbn13,book.title).map(l=>(
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" style={lnk} onPointerDown={e=>e.stopPropagation()}>{l.name} {"↗"}</a>
      ))}
    </div>
  );
}

export default function App(){
  const [books,setBooks]=useState([]);
  const [themes,setThemes]=useState([]);
  const [store,setStore]=useState("loading"); // loading | ready | none | failed
  const [view,setView]=useState("all");
  const [q,setQ]=useState("");
  const [showFind,setShowFind]=useState(false);
  const [msg,setMsg]=useState("");
  const [adding,setAdding]=useState(null);
  const [open,setOpen]=useState(null);
  const [themeEdit,setThemeEdit]=useState(null); // {mode:"new"|"rename", name}
  const [confirmBox,setConfirmBox]=useState(null); // {title, text, yes, act} — Cat Watch's confirm box
  const [drag,setDrag]=useState(null);           // {id, x, y, to}
  const [loadFile,setLoadFile]=useState(null);
  // The cloud line: every change is written to the page's store as it is made (her
  // decision: cloud save only for now). idle | saving | saved | failed.
  const [saveState,setSaveState]=useState("idle");
  const [saveErr,setSaveErr]=useState("");
  const [lastSavedAt,setLastSavedAt]=useState(null);
  const dbRef=useRef(null);
  const findRef=useRef(null);

  // Light or dark, as Cat Watch does it: remembered on this device, first visit follows the machine.
  const [theme,setTheme]=useState(()=>{
    try{ const v=localStorage.getItem("cw-theme"); if(v==="dark"||v==="light")return v; }catch{}
    try{ if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)return "dark"; }catch{}
    return "light";
  });
  const toggleTheme=()=>setTheme(t=>{ const n=t==="dark"?"light":"dark"; try{ localStorage.setItem("cw-theme",n); }catch{} return n; });
  useEffect(()=>{
    try{
      const d=document.documentElement;
      d.setAttribute("data-theme",theme); d.style.colorScheme=theme;
      document.body.style.background=PALETTES[theme].bg; document.body.style.color=PALETTES[theme].ink;
    }catch{}
  },[theme]);
  const C={...PALETTES[theme],...ROSE[theme]};
  const chip=on=>({padding:"4px 10px",borderRadius:999,border:"1px solid "+(on?C.ink:C.rule),background:on?C.ink:"transparent",color:on?C.onAction:C.soft,fontSize:11,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"});
  const sBtn={padding:"5px 12px",borderRadius:4,border:"1px solid "+C.rule,background:"transparent",color:C.soft,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"};
  const pBtn={...sBtn,background:C.action,color:C.onAction,border:"none"};
  const UI={C,chip,sBtn,pBtn};

  useEffect(()=>{
    let gone=false;
    (async()=>{
      const db=await useCap("db");
      if(gone)return;
      if(!db){ setStore("none"); return; }
      dbRef.current=db;
      try{
        const [b,t]=await Promise.all([readAll(db,BOOKS),readAll(db,THEMES)]);
        if(gone)return;
        setBooks(b.filter(x=>cleanIsbn(x.isbn13)).map(bookDoc));
        setThemes(t.filter(x=>x.name).map(x=>({id:x._id,name:x.name,order:Number(x.order)||0})).sort((a,c)=>a.order-c.order));
        setStore("ready");
      }catch{ setStore("failed"); }
    })();
    return()=>{gone=true;};
  },[]);

  // One write to the store, reported on the cloud line.
  const saving=useCallback(async(what,job)=>{
    setSaveState("saving");
    try{ await job(); setSaveState("saved"); setLastSavedAt(new Date().toISOString()); setSaveErr(""); return true; }
    catch(e){ setSaveState("failed"); setSaveErr("couldn’t save "+what+" ("+String((e&&e.code)||(e&&e.message)||"unknown")+")."); return false; }
  },[]);
  const writeBook=useCallback(async b=>{
    const db=dbRef.current; if(!db)return false;
    return saving("“"+b.title+"”",()=>db.doc(BOOKS+"/"+b.isbn13).set(bookDoc(b)));
  },[saving]);
  const putBook=useCallback(async b=>{
    setBooks(list=>{ const rest=list.filter(x=>x.isbn13!==b.isbn13); return[...rest,b]; });
    return writeBook(b);
  },[writeBook]);
  const writeTheme=useCallback(async t=>{
    const db=dbRef.current; if(!db)return false;
    return saving("the theme “"+t.name+"”",()=>db.doc(THEMES+"/"+t.id).set({name:t.name,order:t.order}));
  },[saving]);

  const sorted=useMemo(()=>books.slice().sort(byOrder),[books]);
  const shown=useMemo(()=>sorted.filter(b=>(view==="all"||b.themes.includes(view))&&isbnMatches(b,q)),[sorted,view,q]);
  const theme_=themes.find(t=>t.id===view)||null;
  useEffect(()=>{ if(view!=="all"&&!themes.some(t=>t.id===view))setView("all"); },[themes,view]);

  // ── DRAG TO REARRANGE ──────────────────────────────────────────────────
  // A mouse drags once it moves; a finger after a short hold, so a swipe still scrolls.
  const press=useRef(null);
  const visRef=useRef(shown); visRef.current=shown;
  const dragRef=useRef(null); dragRef.current=drag;
  const endDrag=useCallback(async commit=>{
    const d=dragRef.current; press.current=null; setDrag(null);
    if(!commit||!d||d.to==null)return;
    const vis=visRef.current, from=vis.findIndex(b=>b.isbn13===d.id);
    if(from<0||d.to===from)return;
    const b=vis[from], order=dropOrder(vis,d.id,d.to);
    await putBook({...b,order});
  },[putBook]);
  useEffect(()=>{
    // Where the pointer is now: start the drag, or move the gap under it.
    const moveTo=(x,y,ev)=>{
      const p=press.current; if(!p)return;
      const far=Math.hypot(x-p.x,y-p.y);
      if(!dragRef.current){
        if(p.touch){ if(far>10){ clearTimeout(p.timer); press.current=null; } return; }
        if(far<6)return;
        setDrag({id:p.id,x,y,to:null}); return;
      }
      if(ev&&ev.cancelable)ev.preventDefault();
      const el=document.elementFromPoint(x,y);
      const over=el&&el.closest?el.closest("[data-book]"):null;
      let to=dragRef.current.to;
      if(over){
        const rest=visRef.current.filter(b=>b.isbn13!==p.id), oid=over.getAttribute("data-book");
        const k=rest.findIndex(b=>b.isbn13===oid);
        if(k>=0){ const r=over.getBoundingClientRect(); to=x>r.left+r.width/2?k+1:k; }
      }
      setDrag(d=>d?{...d,x,y,to}:d);
    };
    const move=e=>moveTo(e.clientX,e.clientY,e);
    const up=()=>{ const p=press.current; if(p&&p.timer)clearTimeout(p.timer); if(dragRef.current)endDrag(true); else press.current=null; };
    // A phone may hand the gesture to scrolling (pointercancel) even while a book is held;
    // the finger is then followed by its touch events instead.
    const cancel=()=>{ const p=press.current; if(p&&p.timer)clearTimeout(p.timer); if(dragRef.current&&p&&p.touch)return; endDrag(false); };
    const touchMove=e=>{ if(!dragRef.current)return; if(e.cancelable)e.preventDefault(); const t=e.touches&&e.touches[0]; if(t)moveTo(t.clientX,t.clientY,null); };
    const touchEnd=()=>{ if(dragRef.current&&press.current&&press.current.touch)endDrag(true); };
    const key=e=>{ if(e.key==="Escape"&&dragRef.current)endDrag(false); };
    window.addEventListener("pointermove",move,{passive:false});
    window.addEventListener("pointerup",up);
    window.addEventListener("pointercancel",cancel);
    window.addEventListener("touchmove",touchMove,{passive:false});
    window.addEventListener("touchend",touchEnd);
    window.addEventListener("keydown",key);
    return()=>{ window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); window.removeEventListener("pointercancel",cancel); window.removeEventListener("touchmove",touchMove); window.removeEventListener("touchend",touchEnd); window.removeEventListener("keydown",key); };
  },[endDrag]);
  const onCardDown=(e,b)=>{
    if(e.button!==undefined&&e.button!==0)return;
    const touch=e.pointerType==="touch"||e.pointerType==="pen";
    const p={id:b.isbn13,x:e.clientX,y:e.clientY,touch,timer:null};
    if(touch)p.timer=setTimeout(()=>{ if(press.current===p)setDrag({id:b.isbn13,x:p.x,y:p.y,to:null}); },350);
    press.current=p;
  };
  const dragged=useRef(false);
  useEffect(()=>{ if(drag)dragged.current=true; },[drag]);
  const onCardClick=b=>{ if(dragged.current){ dragged.current=false; return; } setOpen(b.isbn13); };

  // The grid as it would be after the drop, so the gap follows the pointer.
  const grid=useMemo(()=>{
    if(!drag||drag.to==null)return shown;
    const me=shown.find(b=>b.isbn13===drag.id); if(!me)return shown;
    const rest=shown.filter(b=>b.isbn13!==drag.id);
    return[...rest.slice(0,drag.to),me,...rest.slice(drag.to)];
  },[shown,drag]);
  const dragBook=drag?books.find(b=>b.isbn13===drag.id):null;

  // ── THEMES ─────────────────────────────────────────────────────────────
  async function deleteTheme(t){
    const db=dbRef.current;
    setThemes(ts=>ts.filter(x=>x.id!==t.id)); setView("all"); setThemeEdit(null);
    for(const b of books.filter(x=>x.themes.includes(t.id)))await putBook({...b,themes:b.themes.filter(x=>x!==t.id)});
    if(db)await saving("the theme’s removal",()=>db.doc(THEMES+"/"+t.id).delete());
  }
  async function saveThemeEdit(){
    const te=themeEdit; if(!te)return;
    const name=String(te.name||"").replace(/\s+/g," ").trim();
    if(!name)return;
    if(themes.some(t=>t.name.toLowerCase()===name.toLowerCase()&&(te.mode==="new"||t.id!==theme_.id))){ setMsg("There is already a theme called “"+name+"”."); return; }
    if(te.mode==="new"){
      const t={id:newId(),name,order:themes.length?Math.max(...themes.map(x=>x.order))+1:0};
      setThemes(ts=>[...ts,t]); setView(t.id); setThemeEdit(null); await writeTheme(t);
    }else{
      const t={...theme_,name}; setThemes(ts=>ts.map(x=>x.id===t.id?t:x)); setThemeEdit(null); await writeTheme(t);
    }
  }

  // ── ADDING A BOOK ──────────────────────────────────────────────────────
  const run=useRef(0);
  const io={search:searchWeb,fetch:fetchPage,ask:askClaude};
  function startAdd(){ setMsg(""); setAdding({tab:"isbn",isbn:"",link:"",themes:view==="all"?[]:[view],busy:"",why:"",found:null}); }
  async function find(kind,file){
    const a=adding; const me=++run.current;
    setAdding(x=>({...x,busy:kind==="isbn"?"Searching for the ISBN…":kind==="link"?"Reading the page…":"Reading the saved page…",why:"",found:null}));
    let r, cover=null, noCoverHint=false;
    if(kind==="isbn"){
      const isbn=toIsbn13(a.isbn);
      if(!isbn){ setAdding(x=>({...x,busy:"",why:"That isn’t a valid ISBN. Check the digits (10 or 13)."})); return; }
      r=await lookupIsbn(isbn,io);
    }else if(kind==="link"){
      const url=String(a.link||"").trim();
      if(!/^https?:\/\/\S+$/i.test(url)){ setAdding(x=>({...x,busy:"",why:"Paste a full web address, starting with https://"})); return; }
      r=await lookupLink(url,io);
    }else{
      let text=""; try{ text=await file.text(); }catch{}
      const parse=h=>new DOMParser().parseFromString(h,"text/html");
      const s=savedPageReply(text,parse);
      if(!s.ok){ setAdding(x=>({...x,busy:"",why:s.why})); return; }
      r=await readOnePage(s.res,io);
      if(r.ok){
        const img=pickCover(text,parse(savedPageHtml(text).html),r.book.isbn13);
        if(img){ try{ cover=b64Blob(img); }catch{} }
        noCoverHint=!img&&!mhtmlImages(text).length;
      }
    }
    if(me!==run.current)return;
    if(!r.ok){ setAdding(x=>({...x,busy:"",why:r.why})); return; }
    const had=books.find(b=>b.isbn13===r.book.isbn13)||null;
    setAdding(x=>({...x,busy:"",found:{...r.book,coverBlob:cover,coverUrl:cover?URL.createObjectURL(cover):null,noCoverHint,had}}));
  }
  async function confirmAdd(){
    const a=adding, f=a&&a.found; if(!f)return;
    if(f.had){
      const themesNow=[...new Set([...f.had.themes,...a.themes])];
      await putBook({...f.had,themes:themesNow});
      setAdding(null); setMsg("“"+f.had.title+"” was already on the shelf"+(a.themes.length?"; its themes are updated.":"."));
      return;
    }
    const first=sorted[0];
    const b={isbn13:f.isbn13,title:f.title,publisher:f.publisher,published:f.published,source:f.source,themes:a.themes,order:first?first.order-1:0,cover:null,addedAt:new Date().toISOString()};
    setAdding(null);
    await putBook(b);
    if(f.coverBlob){ const id=await uploadCover(f.coverBlob); if(id)await putBook({...b,cover:id}); }
  }
  async function uploadCover(blob){
    const assets=await useCap("assets");
    if(!assets){ setMsg("Covers can be stored only by the page’s owner, from its claude.ai link."); return null; }
    try{ const r=await assets.upload(await shrinkImage(blob),{type:"image/jpeg"}); return r.id; }
    catch(e){ setMsg("Couldn’t store the cover ("+String((e&&e.code)||"unknown")+")."); return null; }
  }
  async function setCover(b,blob){
    if(!blob||!/^image\//.test(blob.type||"")){ setMsg("That isn’t a picture. Use a JPEG, PNG or WebP."); return; }
    const id=await uploadCover(blob); if(!id)return;
    const old=b.cover;
    await putBook({...b,cover:id});
    if(old){ try{ const assets=await useCap("assets"); if(assets)await assets.delete(old); }catch{} }
  }
  async function dropCover(b){
    const old=b.cover; await putBook({...b,cover:null});
    if(old){ try{ const assets=await useCap("assets"); if(assets)await assets.delete(old); }catch{} }
  }
  async function removeBook(b){
    setOpen(null);
    setBooks(list=>list.filter(x=>x.isbn13!==b.isbn13));
    const db=dbRef.current;
    if(db)await saving("the removal of “"+b.title+"”",()=>db.doc(BOOKS+"/"+b.isbn13).delete());
    if(b.cover){ try{ const assets=await useCap("assets"); if(assets)await assets.delete(b.cover); }catch{} }
  }

  // ── EXPORT AND LOAD — not offered for now ──────────────────────────────
  // Cloud save only for now (her decision), so no button reaches these; kept for when a
  // file backup comes back.
  async function exportShelf(){
    const dl=await useCap("downloads");
    if(!dl){ setMsg("Export works only from the page’s claude.ai link."); return; }
    const data=JSON.stringify({kind:"theme-shelf",version:1,exportedAt:new Date().toISOString(),themes,books:sorted.map(bookDoc)},null,1);
    try{ await dl.save({filename:"theme_shelf_"+new Date().toISOString().slice(0,10)+".json",data}); }
    catch(e){ if(String((e&&e.code)||"")!=="declined")setMsg("Export didn’t go through ("+String((e&&e.code)||"unknown")+")."); }
  }
  async function pickLoad(e){
    const file=e.target.files&&e.target.files[0]; e.target.value=""; if(!file)return;
    let d=null; try{ d=JSON.parse(await file.text()); }catch{}
    if(!d||d.kind!=="theme-shelf"||!Array.isArray(d.books)||!Array.isArray(d.themes)){ setMsg("That file isn’t a Theme Shelf export."); return; }
    setLoadFile({name:file.name,books:d.books.filter(b=>cleanIsbn(b&&b.isbn13)&&b.title).map(bookDoc),themes:d.themes.filter(t=>t&&t.id&&t.name)});
  }
  async function confirmLoad(){
    const f=loadFile, db=dbRef.current; setLoadFile(null); if(!f||!db)return;
    try{
      for(const b of books)if(!f.books.some(x=>x.isbn13===b.isbn13))await db.doc(BOOKS+"/"+b.isbn13).delete();
      for(const t of themes)if(!f.themes.some(x=>x.id===t.id))await db.doc(THEMES+"/"+t.id).delete();
      for(const t of f.themes)await db.doc(THEMES+"/"+t.id).set({name:t.name,order:Number(t.order)||0});
      for(const b of f.books)await db.doc(BOOKS+"/"+b.isbn13).set(b);
      setBooks(f.books); setThemes(f.themes.map(t=>({id:t.id,name:t.name,order:Number(t.order)||0})).sort((a,c)=>a.order-c.order)); setView("all");
      setMsg("Loaded "+f.books.length+" books from "+f.name+".");
    }catch{ setMsg("Loading stopped part-way. Reload the page and load the file again."); }
  }
  void exportShelf; void pickLoad; void confirmLoad;

  const openBook=open?books.find(b=>b.isbn13===open):null;
  const ready=store==="ready";
  const box={background:C.card,border:"1px solid "+C.rule,borderRadius:5,padding:18,fontSize:12.5,color:C.soft,lineHeight:1.5};

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.ink,minHeight:"100vh",padding:"20px 16px 60px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>{CSS}</style>
      <header style={{maxWidth:760,margin:"0 auto 14px"}}>
        <div style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:C.soft,marginBottom:4}}>Art books · by theme</div>
        <h1 style={{fontFamily:SERIF,fontSize:36,lineHeight:1,fontWeight:500,margin:0,letterSpacing:"-0.02em"}}>Theme<span style={{color:C.accent}}> shelf</span></h1>
        <div style={{marginTop:14,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          {/* Cat Watch's row: the comfort control, then the way in (where Import sits). */}
          <button onClick={toggleTheme} title={theme==="dark"?"Switch to light":"Switch to dark"}
            style={{...sBtn,marginLeft:"auto",padding:"5px 9px"}}>{theme==="dark"?"☀ Light":"☽ Dark"}</button>
          <button onClick={startAdd} disabled={!ready} style={{...pBtn,opacity:ready?1:0.4,cursor:ready?"pointer":"not-allowed"}}>Add book</button>
        </div>
        {/* The cloud line, as Cat Watch's: green while saving works, the banner when it stops. */}
        {saveState==="failed"?
          <div style={{marginTop:8,padding:"9px 12px",background:C.warnBg,border:"2px solid "+C.warnEdge,borderRadius:5,fontSize:12.5,fontWeight:700,color:C.warnInk,lineHeight:1.4,display:"flex",alignItems:"flex-start",gap:9}}>
            <span style={{fontSize:17,lineHeight:1.1}}>{"☁"}</span>
            <span>{"CLOUD COPY NOT SAVING — "+saveErr+(lastSavedAt?" Last cloud save: "+fmtRefresh(lastSavedAt)+" ("+relTime(lastSavedAt)+").":"")+" Reload the page and try again."}</span>
          </div>
        :<div style={{marginTop:6,fontSize:11,color:store==="ready"?C.okEdge:C.soft,fontWeight:600}}>
          {"☁ "}{
            store==="loading"?"Opening the shelf…"
            :store==="none"?"The shelf isn’t available in this viewer."
            :store==="failed"?"The cloud copy didn’t answer. Reload to try again."
            :saveState==="saving"?"Saving to the cloud…"
            :lastSavedAt?"Last cloud save: "+fmtRefresh(lastSavedAt)+" ("+relTime(lastSavedAt)+")"
            :"Saved in the cloud"
          }
        </div>}
        {msg?<div style={{...warnBox(C),display:"flex",gap:8,alignItems:"baseline"}} role="status">
          <span style={{flex:1}}>{msg}</span>
          <button onClick={()=>setMsg("")} title="Dismiss" aria-label="Dismiss" style={{background:"none",border:"none",color:C.warnInk,fontSize:14,lineHeight:1,cursor:"pointer",padding:0}}>{"×"}</button>
        </div>:null}

        <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid "+C.rule,display:"flex",gap:14,fontSize:10.5,color:C.soft,flexWrap:"wrap",alignItems:"center"}}>
          <span><b style={{color:C.ink}}>{books.length}</b> Books</span>
          <span><b style={{color:C.ink}}>{themes.length}</b> Themes</span>
          <button onClick={()=>{ if(showFind)setQ(""); setShowFind(v=>!v); setTimeout(()=>findRef.current&&findRef.current.focus(),100); }} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.soft,padding:0,lineHeight:1}} title="Find by ISBN" aria-label="Find by ISBN">{"🔍"}</button>
        </div>
        {showFind?<div style={{marginTop:6,position:"relative"}}>
          <input ref={findRef} id="isbn-find" inputMode="numeric" value={q} onChange={e=>setQ(e.target.value)} placeholder={"Find by ISBN…"} style={{...field(C),width:"100%",paddingRight:30}}/>
          {q?<button onClick={()=>{ setQ(""); if(findRef.current)findRef.current.focus(); }} aria-label="Clear search" title="Clear"
            style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.soft,fontSize:16,lineHeight:1,cursor:"pointer",padding:"2px 4px"}}>{"×"}</button>:null}
        </div>:null}

        {ready?<div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          <span style={label9(C)}>Theme</span>
          <button style={chip(view==="all")} aria-pressed={view==="all"} onClick={()=>{setView("all");setThemeEdit(null);}}>All</button>
          {themes.map(t=>(
            <button key={t.id} style={chip(view===t.id)} aria-pressed={view===t.id} onClick={()=>{setView(t.id);setThemeEdit(null);}}>{t.name}</button>
          ))}
          <button style={chip(false)} onClick={()=>setThemeEdit({mode:"new",name:""})}>+ Theme</button>
          {theme_&&!themeEdit?<span style={{display:"inline-flex",gap:12,marginLeft:6}}>
            <button style={textBtn(C)} onClick={()=>setThemeEdit({mode:"rename",name:theme_.name})}>Rename</button>
            <button style={textBtn(C)} onClick={()=>setConfirmBox({title:"Delete “"+theme_.name+"”?",text:"Its books stay on the shelf.",yes:"Delete theme",act:()=>deleteTheme(theme_)})}>Delete</button>
          </span>:null}
        </div>:null}
        {/* Cat Watch's panel under a button (its Save panel): a field, the action, Cancel. */}
        {themeEdit?<form onSubmit={e=>{e.preventDefault();saveThemeEdit();}} style={{marginTop:8,padding:"10px 12px",background:C.drawer,border:"1px solid "+C.rule,borderRadius:4,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <input id="theme-name" autoFocus maxLength={60} placeholder="Theme name" value={themeEdit.name} onChange={e=>setThemeEdit({...themeEdit,name:e.target.value})} style={{...field(C),flex:"1 1 220px",padding:"5px 8px"}}/>
          <button type="submit" style={pBtn}>{themeEdit.mode==="new"?"Add theme":"Rename"}</button>
          <button type="button" onClick={()=>setThemeEdit(null)} style={sBtn}>Cancel</button>
        </form>:null}
      </header>

      <main style={{maxWidth:760,margin:"0 auto"}}>
        {store==="loading"?<div style={box}>Opening the shelf{"…"}</div>
        :store==="none"?<div style={box}>The shelf isn{"’"}t available in this viewer.</div>
        :store==="failed"?<div style={box}>The shelf didn{"’"}t open {"—"} the page{"’"}s store didn{"’"}t answer. Reload to try again.</div>
        :!books.length?<div style={box}>No books yet.</div>
        :!shown.length?<div style={box}>{q?"No book "+(theme_?"under this theme":"on the shelf")+" has an ISBN with those digits.":"No books under this theme yet."}</div>
        :(
          <div className="ts-grid">
            {grid.map(b=>(
              <article key={b.isbn13} data-book={b.isbn13} className={"ts-card"+(drag&&drag.id===b.isbn13?" ghost":"")}
                role="button" tabIndex={0} aria-label={b.title}
                onPointerDown={e=>onCardDown(e,b)} onClick={()=>onCardClick(b)}
                onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setOpen(b.isbn13); } }}
                onContextMenu={e=>{ if(press.current&&press.current.touch)e.preventDefault(); }}
                style={{background:C.card,border:"1px solid "+C.rule,borderRadius:5,overflow:"hidden",display:"flex",flexDirection:"column",minWidth:0,color:C.ink}}>
                <Cover book={b} C={C}/>
                <div style={{padding:"10px 12px 12px",display:"flex",flexDirection:"column",gap:2,minWidth:0}}>
                  <h3 style={{fontFamily:SERIF,fontSize:15,lineHeight:1.25,fontWeight:500,margin:0,letterSpacing:"-0.01em",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical"}}>{b.title}</h3>
                  {b.publisher?<span style={{fontSize:11,color:C.soft,marginTop:2}}>{b.publisher}</span>:null}
                  <span style={{fontSize:11,color:C.soft,fontVariantNumeric:"tabular-nums"}}>ISBN {fmtIsbn(b.isbn13)}</span>
                  <span style={{fontSize:11,color:C.ink,fontWeight:600,marginBottom:8}}>{publishedLine(b.published)}</span>
                  <Shops book={b} C={C}/>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      {dragBook&&drag?<div className="ts-float" style={{transform:"translate("+(drag.x-30)+"px,"+(drag.y-40)+"px) rotate(-2deg) scale(1.04)",boxShadow:"0 6px 24px rgba(0,0,0,0.25)"}}><Cover book={dragBook} C={C}/></div>:null}

      {/* The version, small and grey, as Cat Watch's footer. */}
      <footer style={{maxWidth:760,margin:"28px auto 0",fontSize:10.5,color:C.soft,textAlign:"center"}}>
        Theme Shelf prototype {"·"} version {APP_VERSION} {"·"} {APP_DATE}
      </footer>

      {loadFile?<ConfirmBox UI={UI} box={{title:"Load "+loadFile.name+"?",text:"The shelf becomes the file’s "+loadFile.books.length+" books and "+loadFile.themes.length+" themes. The "+books.length+" books on the shelf now are replaced.",yes:"Load",act:confirmLoad}} close={()=>setLoadFile(null)}/>:null}
      {adding?<AddSheet UI={UI} a={adding} set={setAdding} themes={themes} find={find} confirm={confirmAdd} close={()=>{run.current++;setAdding(null);}}/>:null}
      {openBook?<BookSheet UI={UI} b={openBook} themes={themes} close={()=>setOpen(null)} put={putBook} setCover={setCover} dropCover={dropCover} ask={setConfirmBox} remove={removeBook}/>:null}
      {confirmBox?<ConfirmBox UI={UI} box={confirmBox} close={()=>setConfirmBox(null)}/>:null}
    </div>
  );
}

// Cat Watch's confirm box: a heading, a line, Cancel and the action.
function ConfirmBox({UI,box,close}){
  const {C,sBtn,pBtn}=UI;
  return(
    <div style={{position:"fixed",inset:0,background:C.scrim,display:"grid",placeItems:"center",zIndex:1200,padding:16}}>
      <div role="dialog" aria-label={box.title} style={{background:C.card,border:"1px solid "+C.rule,borderRadius:8,maxWidth:420,padding:"18px 20px",boxShadow:"0 6px 24px rgba(0,0,0,0.25)"}}>
        <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:8}}>{box.title}</div>
        {box.text?<div style={{fontSize:12.5,color:C.body,lineHeight:1.5,marginBottom:16}}>{box.text}</div>:<div style={{height:8}}/>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={close} style={sBtn}>Cancel</button>
          <button onClick={()=>{ const a=box.act; close(); a&&a(); }} style={{...pBtn,background:C.accent}}>{box.yes||"Continue"}</button>
        </div>
      </div>
    </div>
  );
}

function ThemePicks({UI,themes,value,onChange}){
  const {C,chip}=UI;
  if(!themes.length)return<div style={{fontSize:11.5,color:C.soft}}>No themes yet.</div>;
  return(
    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
      {themes.map(t=>{ const on=value.includes(t.id); return(
        <button key={t.id} type="button" style={chip(on)} aria-pressed={on} onClick={()=>onChange(on?value.filter(x=>x!==t.id):[...value,t.id])}>{t.name}</button>
      );})}
    </div>
  );
}

function AddSheet({UI,a,set,themes,find,confirm,close}){
  const {C,sBtn,pBtn}=UI;
  const fileRef=useRef(null);
  const f=a.found;
  // As Cat Watch's Import: the three ways in side by side; the one pressed turns green.
  const tab=(k,label)=><button type="button" onClick={()=>set(x=>({...x,tab:k,why:"",found:null}))} style={a.tab===k?pBtn:sBtn}>{label}</button>;
  return(
    <div style={dialogOuter(C)} onClick={close}>
      <div role="dialog" aria-label="Add a book" style={dialogInner(C)} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",gap:5,justifyContent:"center"}}>{tab("isbn","ISBN")}{tab("link","Link")}{tab("page","Page")}</div>
        {a.tab==="isbn"?(
          <form style={{display:"flex",gap:5,flexWrap:"wrap"}} onSubmit={e=>{e.preventDefault();find("isbn");}}>
            <input id="add-isbn" autoFocus inputMode="numeric" placeholder="ISBN" value={a.isbn} onChange={e=>set(x=>({...x,isbn:e.target.value}))} style={{...field(C),flex:"1 1 220px"}}/>
            <button type="submit" disabled={!!a.busy} style={{...pBtn,opacity:a.busy?0.5:1}}>Find</button>
          </form>
        ):a.tab==="link"?(
          <form style={{display:"flex",gap:5,flexWrap:"wrap"}} onSubmit={e=>{e.preventDefault();find("link");}}>
            <input id="add-link" autoFocus placeholder="https://" value={a.link} onChange={e=>set(x=>({...x,link:e.target.value}))} style={{...field(C),flex:"1 1 220px"}}/>
            <button type="submit" disabled={!!a.busy} style={{...pBtn,opacity:a.busy?0.5:1}}>Find</button>
          </form>
        ):(
          <div>
            <input ref={fileRef} id="add-page" type="file" hidden accept=".mht,.mhtml,.html,.htm,multipart/related,message/rfc822,text/html" onChange={e=>{ const file=e.target.files&&e.target.files[0]; e.target.value=""; if(file)find("page",file); }}/>
            <div style={{display:"flex",justifyContent:"flex-end"}}><button type="button" disabled={!!a.busy} onClick={()=>fileRef.current&&fileRef.current.click()} style={{...pBtn,opacity:a.busy?0.5:1}}>Choose saved page</button></div>
          </div>
        )}
        <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          <span style={label9(C)}>File under</span>
          <ThemePicks UI={UI} themes={themes} value={a.themes} onChange={v=>set(x=>({...x,themes:v}))}/>
        </div>
        {a.busy?<div style={{fontSize:11,color:C.soft}} role="status">{a.busy}</div>:null}
        {a.why?<div style={{...warnBox(C),marginTop:0}} role="alert">{a.why}</div>:null}
        {f?(
          <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-start",background:C.card,border:"1px solid "+C.rule,borderRadius:5,padding:12}}>
            <div style={{width:100,flexShrink:0}}>
              {f.coverUrl
                ?<img src={f.coverUrl} alt={"Cover of "+f.title} style={{width:"100%",display:"block",borderRadius:3}}/>
                :<Cover book={f} C={C}/>}
            </div>
            <div style={{flex:"1 1 200px",display:"flex",flexDirection:"column",gap:3,fontSize:12.5,minWidth:0}}>
              <div style={{fontFamily:SERIF,fontSize:17,fontWeight:500,lineHeight:1.25}}>{f.title}</div>
              <span style={{color:C.soft}}>{f.publisher||"Publisher not found"}</span>
              <span style={{color:C.soft,fontVariantNumeric:"tabular-nums"}}>ISBN {fmtIsbn(f.isbn13)}</span>
              <span style={{fontWeight:600}}>{publishedLine(f.published)}</span>
              {f.source?<span style={{fontSize:11,color:C.soft}}>Read from {hostOf(f.source)}</span>:null}
              {f.noCoverHint?<span style={{fontSize:11,color:C.soft}}>No cover in this file.</span>:null}
              {f.had?<span style={{fontSize:11,color:C.soft}}>Already on your shelf.</span>:null}
            </div>
          </div>
        ):null}
        <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
          <button onClick={close} style={sBtn}>{a.busy?"Stop":"Cancel"}</button>
          {f?<button onClick={confirm} style={pBtn}>{f.had?"Update its themes":"Add to shelf"}</button>:null}
        </div>
      </div>
    </div>
  );
}

function BookSheet({UI,b,themes,close,put,setCover,dropCover,ask,remove}){
  const {C,sBtn,pBtn}=UI;
  const fileRef=useRef(null);
  const onPaste=e=>{
    const items=[...((e.clipboardData&&e.clipboardData.items)||[])];
    const it=items.find(i=>i.kind==="file"&&/^image\//.test(i.type));
    e.preventDefault();
    if(it)setCover(b,it.getAsFile());
  };
  const onDrop=e=>{ e.preventDefault(); const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f)setCover(b,f); };
  return(
    <div style={dialogOuter(C)} onClick={close}>
      <div role="dialog" aria-label={b.title} style={dialogInner(C)} onClick={e=>e.stopPropagation()} onDragOver={e=>e.preventDefault()} onDrop={onDrop}>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
          <div style={{width:140,flexShrink:0}}><Cover book={b} C={C} big/></div>
          <div style={{flex:"1 1 220px",display:"flex",flexDirection:"column",gap:3,fontSize:12.5,minWidth:0}}>
            <h2 style={{fontFamily:SERIF,fontSize:20,fontWeight:500,lineHeight:1.2,margin:"0 0 4px",letterSpacing:"-0.01em"}}>{b.title}</h2>
            <span style={{color:C.soft}}>{b.publisher||"Publisher not found"}</span>
            <span style={{color:C.soft,fontVariantNumeric:"tabular-nums"}}>ISBN {fmtIsbn(b.isbn13)}</span>
            <span style={{fontWeight:600,marginBottom:8}}>{publishedLine(b.published)}</span>
            <Shops book={b} C={C}/>
            {b.source?<a href={b.source} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.soft,marginTop:6}}>Read from {hostOf(b.source)}</a>:null}
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          <span style={label9(C)}>Themes</span>
          <ThemePicks UI={UI} themes={themes} value={b.themes} onChange={v=>put({...b,themes:v})}/>
        </div>
        <div>
          <div style={{...label9(C),marginBottom:6}}>Cover</div>
          <div contentEditable suppressContentEditableWarning onPaste={onPaste} onKeyDown={e=>{ if(!(e.metaKey||e.ctrlKey))e.preventDefault(); }} onInput={e=>{e.currentTarget.textContent="";}} aria-label="Paste a cover here"
            style={{border:"1px dashed "+C.rule,borderRadius:4,background:C.card,padding:"8px 10px",fontSize:11.5,color:C.soft,minHeight:36,outline:"none",lineHeight:1.5}}>
            Paste a cover
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",marginTop:6}}>
            <button onClick={()=>fileRef.current&&fileRef.current.click()} style={sBtn}>Upload a picture</button>
            <input ref={fileRef} id="cover-file" type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=""; if(f)setCover(b,f); }}/>
            {b.cover?<button onClick={()=>dropCover(b)} style={textBtn(C)}>Remove cover</button>:null}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid "+C.rule,paddingTop:10}}>
          <button onClick={()=>ask({title:"Remove “"+b.title+"”?",text:"It leaves the shelf and every theme.",yes:"Remove",act:()=>remove(b)})} style={textBtn(C)}>Remove book</button>
          <button onClick={close} style={pBtn}>Done</button>
        </div>
      </div>
    </div>
  );
}
