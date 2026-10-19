import React,{useState,useEffect,useMemo,useCallback,useRef} from "react";

// THEME SHELF — art books gathered by theme, not by exhibition (her design;
// docs/theme_shelf.md). A wishlist: cover, title, ISBN, publisher, when it was published
// and the four booksellers. Its own page with its own store, so Cat Watch's ledger is
// never touched. What it shares with Cat Watch (ISBNs, the booksellers, saved pages, the
// connector's messages) is copied in by `node build/sync_shelf.js`.
const APP_VERSION="1";
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
const MON3=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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

const CSS=`
.ts{max-width:1180px;margin:0 auto;padding-block:20px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.ts *{box-sizing:border-box}
.ts-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 20px;margin-bottom:18px}
.ts-title{font-family:var(--display);font-weight:500;font-style:italic;font-size:2.2rem;line-height:1;margin:0;letter-spacing:.005em;text-wrap:balance}
.ts-sub{color:var(--muted);font-size:.86rem;margin:6px 0 0}
.ts-btn{font:inherit;font-size:.9rem;border:1px solid var(--line);background:var(--paper);color:var(--ink);border-radius:999px;padding:7px 14px;cursor:pointer}
.ts-btn:hover{border-color:var(--muted)}
.ts-btn:focus-visible,.ts-chip:focus-visible,.ts-card:focus-visible,.ts-link:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.ts-btn.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.ts-btn:disabled{opacity:.5;cursor:default}
.ts-link{font:inherit;background:none;border:0;padding:0;color:var(--accent);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.ts-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.ts-chip{font:inherit;font-size:.88rem;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:6px 12px;cursor:pointer;display:inline-flex;gap:6px;align-items:baseline}
.ts-chip .n{color:var(--muted);font-size:.78rem;font-variant-numeric:tabular-nums}
.ts-chip[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--ground)}
.ts-chip[aria-pressed="true"] .n{color:var(--ground);opacity:.75}
.ts-tools{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:4px 0 22px;font-size:.86rem;color:var(--muted)}
.ts-input{font:inherit;font-size:.92rem;border:1px solid var(--line);background:var(--paper);color:var(--ink);border-radius:8px;padding:8px 10px;min-width:0}
.ts-input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.ts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:28px 20px;align-items:start}
.ts-card{display:flex;flex-direction:column;gap:8px;min-width:0;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:grab;border-radius:6px}
.ts-card.ghost{opacity:.25}
.ts-cover{width:100%;max-width:100%;aspect-ratio:2/3;border-radius:3px;overflow:hidden;background:var(--paper);box-shadow:0 1px 2px var(--shadow),0 6px 16px var(--shadow);display:flex}
.ts-cover img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.ts-plain{flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;margin:8px;padding:12px;border:1px solid var(--line);text-align:center}
.ts-plain b{font-family:var(--display);font-style:italic;font-weight:500;font-size:1.06rem;line-height:1.15;color:var(--ink);overflow:hidden;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical}
.ts-plain span{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ts-meta{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:.8rem;color:var(--muted)}
.ts-meta .t{font-size:.9rem;color:var(--ink);font-weight:600;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.ts-meta .isbn{font-variant-numeric:tabular-nums}
.ts-meta .age{color:var(--ink)}
.ts-shops{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:.78rem;margin-top:2px}
.ts-shops a{color:var(--accent);text-decoration:none}
.ts-shops a:hover{text-decoration:underline}
.ts-float{position:fixed;left:0;top:0;width:150px;pointer-events:none;z-index:50;transform-origin:20% 20%;opacity:.95}
.ts-empty{border:1px dashed var(--line);border-radius:10px;padding:28px 20px;color:var(--muted);text-align:center;max-width:560px;margin:20px auto}
.ts-empty b{color:var(--ink);font-family:var(--display);font-style:italic;font-weight:500;font-size:1.3rem;display:block;margin-bottom:6px}
.ts-scrim{position:fixed;inset:0;background:var(--scrim);z-index:40;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:max(24px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 24px max(12px,env(safe-area-inset-left,0px))}
.ts-sheet{background:var(--ground);color:var(--ink);border-radius:12px;width:100%;max-width:620px;padding:20px;box-shadow:0 12px 40px var(--shadow);display:flex;flex-direction:column;gap:14px}
.ts-sheet h2{font-family:var(--display);font-style:italic;font-weight:500;font-size:1.6rem;margin:0;line-height:1.15;text-wrap:balance}
.ts-tabs{display:flex;gap:6px}
.ts-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.ts-row .ts-input{flex:1 1 220px}
.ts-note{font-size:.84rem;color:var(--muted);margin:0}
.ts-err{font-size:.88rem;color:var(--ink);background:var(--warn);border-radius:8px;padding:8px 10px;margin:0}
.ts-detail{display:grid;grid-template-columns:minmax(0,180px) minmax(0,1fr);gap:18px}
@media (max-width:480px){.ts-detail{grid-template-columns:minmax(0,1fr)}.ts-detail .ts-cover{max-width:200px}.ts-title{font-size:1.8rem}}
.ts-facts{display:flex;flex-direction:column;gap:6px;font-size:.9rem;min-width:0}
.ts-facts .k{color:var(--muted);font-size:.74rem;letter-spacing:.06em;text-transform:uppercase}
.ts-paste{border:1px dashed var(--line);border-radius:8px;padding:10px;font-size:.84rem;color:var(--muted);min-height:40px;outline:none}
.ts-paste:focus{border-color:var(--accent);color:var(--ink)}
.ts-foot{margin-top:40px;display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;font-size:.8rem;color:var(--muted)}
@media (prefers-reduced-motion:no-preference){.ts-card{transition:transform .12s ease}}
`;

function Cover({book,big}){
  const src=coverSrc(book);
  const [bad,setBad]=useState(false);
  useEffect(()=>setBad(false),[src]);
  return(
    <div className="ts-cover" style={big?{maxWidth:180}:null}>
      {src&&!bad
        ?<img src={src} alt={"Cover of "+book.title} onError={()=>setBad(true)} draggable={false}/>
        :<div className="ts-plain"><b>{book.title}</b>{book.publisher?<span>{book.publisher}</span>:null}</div>}
    </div>
  );
}

function Shops({book}){
  return(
    <div className="ts-shops">
      {resellerLinks(book.isbn13,book.title).map(l=>(
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" onPointerDown={e=>e.stopPropagation()}>{l.name}</a>
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
  const [msg,setMsg]=useState("");
  const [adding,setAdding]=useState(null);
  const [open,setOpen]=useState(null);
  const [themeEdit,setThemeEdit]=useState(null); // {mode:"new"|"rename"|"delete", name}
  const [drag,setDrag]=useState(null);           // {id, x, y, to}
  const [loadFile,setLoadFile]=useState(null);
  const dbRef=useRef(null);

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

  const writeBook=useCallback(async b=>{
    const db=dbRef.current; if(!db)return false;
    try{ await db.doc(BOOKS+"/"+b.isbn13).set(bookDoc(b)); return true; }
    catch{ setMsg("Couldn’t save “"+b.title+"” to the shelf. Reload and try again."); return false; }
  },[]);
  const putBook=useCallback(async b=>{
    setBooks(list=>{ const rest=list.filter(x=>x.isbn13!==b.isbn13); return[...rest,b]; });
    return writeBook(b);
  },[writeBook]);
  const writeTheme=useCallback(async t=>{
    const db=dbRef.current; if(!db)return false;
    try{ await db.doc(THEMES+"/"+t.id).set({name:t.name,order:t.order}); return true; }
    catch{ setMsg("Couldn’t save the theme. Reload and try again."); return false; }
  },[]);

  const sorted=useMemo(()=>books.slice().sort(byOrder),[books]);
  const shown=useMemo(()=>sorted.filter(b=>(view==="all"||b.themes.includes(view))&&isbnMatches(b,q)),[sorted,view,q]);
  const counts=useMemo(()=>{ const c={}; for(const b of books)for(const t of b.themes)c[t]=(c[t]||0)+1; return c; },[books]);
  const theme=themes.find(t=>t.id===view)||null;
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
  async function saveThemeEdit(){
    const te=themeEdit; if(!te)return;
    const name=String(te.name||"").replace(/\s+/g," ").trim();
    if(te.mode==="delete"){
      const id=theme.id;
      const db=dbRef.current;
      setThemes(ts=>ts.filter(t=>t.id!==id)); setView("all"); setThemeEdit(null);
      for(const b of books.filter(x=>x.themes.includes(id)))await putBook({...b,themes:b.themes.filter(t=>t!==id)});
      try{ if(db)await db.doc(THEMES+"/"+id).delete(); }catch{ setMsg("Couldn’t delete the theme. Reload and try again."); }
      return;
    }
    if(!name)return;
    if(themes.some(t=>t.name.toLowerCase()===name.toLowerCase()&&(te.mode==="new"||t.id!==theme.id))){ setMsg("There is already a theme called “"+name+"”."); return; }
    if(te.mode==="new"){
      const t={id:newId(),name,order:themes.length?Math.max(...themes.map(x=>x.order))+1:0};
      setThemes(ts=>[...ts,t]); setView(t.id); setThemeEdit(null); await writeTheme(t);
    }else{
      const t={...theme,name}; setThemes(ts=>ts.map(x=>x.id===t.id?t:x)); setThemeEdit(null); await writeTheme(t);
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
    try{ const db=dbRef.current; if(db)await db.doc(BOOKS+"/"+b.isbn13).delete(); }catch{ setMsg("Couldn’t remove it from the store. Reload and try again."); }
    if(b.cover){ try{ const assets=await useCap("assets"); if(assets)await assets.delete(b.cover); }catch{} }
  }

  // ── EXPORT AND LOAD ────────────────────────────────────────────────────
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

  const openBook=open?books.find(b=>b.isbn13===open):null;
  const loadRef=useRef(null);

  return(
    <div className="ts">
      <style>{CSS}</style>
      <header className="ts-head">
        <div>
          <h1 className="ts-title">Theme Shelf</h1>
          <p className="ts-sub">Art books gathered by theme. Drag a cover to rearrange.</p>
        </div>
        <button className="ts-btn primary" onClick={startAdd} disabled={store!=="ready"}>Add book</button>
      </header>

      <nav className="ts-bar" aria-label="Themes">
        <button className="ts-chip" aria-pressed={view==="all"} onClick={()=>{setView("all");setThemeEdit(null);}}>All <span className="n">{books.length}</span></button>
        {themes.map(t=>(
          <button key={t.id} className="ts-chip" aria-pressed={view===t.id} onClick={()=>{setView(t.id);setThemeEdit(null);}}>{t.name} <span className="n">{counts[t.id]||0}</span></button>
        ))}
        {store==="ready"?<button className="ts-chip" onClick={()=>setThemeEdit({mode:"new",name:""})}>+ Theme</button>:null}
      </nav>

      {themeEdit&&themeEdit.mode!=="delete"?(
        <form className="ts-row" style={{marginBottom:10}} onSubmit={e=>{e.preventDefault();saveThemeEdit();}}>
          <input id="theme-name" className="ts-input" autoFocus placeholder="Theme name, e.g. Fashion in art" value={themeEdit.name} onChange={e=>setThemeEdit({...themeEdit,name:e.target.value})} style={{maxWidth:360}}/>
          <button className="ts-btn primary" type="submit">{themeEdit.mode==="new"?"Add theme":"Rename"}</button>
          <button className="ts-btn" type="button" onClick={()=>setThemeEdit(null)}>Cancel</button>
        </form>
      ):null}
      {themeEdit&&themeEdit.mode==="delete"&&theme?(
        <div className="ts-row" style={{marginBottom:10}}>
          <span>Delete “{theme.name}”? Its books stay on the shelf.</span>
          <button className="ts-btn primary" onClick={saveThemeEdit}>Delete theme</button>
          <button className="ts-btn" onClick={()=>setThemeEdit(null)}>Cancel</button>
        </div>
      ):null}

      <div className="ts-tools">
        <label htmlFor="isbn-find">Find by ISBN</label>
        <input id="isbn-find" className="ts-input" inputMode="numeric" placeholder="978…" value={q} onChange={e=>setQ(e.target.value)} style={{width:180}}/>
        {theme&&!themeEdit?<span className="ts-row" style={{gap:14}}>
          <button className="ts-link" onClick={()=>setThemeEdit({mode:"rename",name:theme.name})}>Rename theme</button>
          <button className="ts-link" onClick={()=>setThemeEdit({mode:"delete"})}>Delete theme</button>
        </span>:null}
      </div>

      {msg?<p className="ts-err" role="status" style={{marginBottom:16}}>{msg} <button className="ts-link" onClick={()=>setMsg("")}>Dismiss</button></p>:null}

      {store==="loading"?<div className="ts-empty">Opening your shelf…</div>
      :store==="none"?<div className="ts-empty"><b>Your shelf lives with this page</b>Open Theme Shelf from its claude.ai link to see and add books.</div>
      :store==="failed"?<div className="ts-empty"><b>The shelf didn’t open</b>The page’s store didn’t answer. Reload to try again.</div>
      :!books.length?<div className="ts-empty"><b>No books yet</b>Make a theme with “+ Theme”, then add a book by its ISBN, a link to its page, or a page you saved.</div>
      :!shown.length?<div className="ts-empty">{q?"No book on "+(theme?"this theme":"the shelf")+" has an ISBN with those digits.":"No books under this theme yet. Open a book and tick the theme, or add one."}</div>
      :(
        <div className="ts-grid">
          {grid.map(b=>(
            <div key={b.isbn13} data-book={b.isbn13} className={"ts-card"+(drag&&drag.id===b.isbn13?" ghost":"")}
              role="button" tabIndex={0} aria-label={b.title}
              onPointerDown={e=>onCardDown(e,b)} onClick={()=>onCardClick(b)}
              onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setOpen(b.isbn13); } }}
              onContextMenu={e=>{ if(press.current&&press.current.touch)e.preventDefault(); }}>
              <Cover book={b}/>
              <div className="ts-meta">
                <span className="t">{b.title}</span>
                {b.publisher?<span>{b.publisher}</span>:null}
                <span className="isbn">ISBN {fmtIsbn(b.isbn13)}</span>
                <span className="age">{publishedLine(b.published)}</span>
                <Shops book={b}/>
              </div>
            </div>
          ))}
        </div>
      )}
      {dragBook&&drag?<div className="ts-float" style={{transform:"translate("+(drag.x-30)+"px,"+(drag.y-40)+"px) rotate(-2deg) scale(1.04)"}}><Cover book={dragBook}/></div>:null}

      <footer className="ts-foot">
        <button className="ts-link" onClick={exportShelf} disabled={store!=="ready"}>Export</button>
        <button className="ts-link" onClick={()=>loadRef.current&&loadRef.current.click()} disabled={store!=="ready"}>Load</button>
        <input ref={loadRef} id="load-file" type="file" accept=".json,application/json" hidden onChange={pickLoad}/>
        <span>Theme Shelf prototype {APP_VERSION} · {APP_DATE}</span>
      </footer>

      {loadFile?(
        <div className="ts-scrim" onClick={()=>setLoadFile(null)}>
          <div className="ts-sheet" onClick={e=>e.stopPropagation()}>
            <h2>Load {loadFile.name}?</h2>
            <p className="ts-note">The shelf becomes the file’s {loadFile.books.length} books and {loadFile.themes.length} themes. The {books.length} books on the shelf now are replaced. Export first if you want to keep them.</p>
            <div className="ts-row"><button className="ts-btn primary" onClick={confirmLoad}>Load</button><button className="ts-btn" onClick={()=>setLoadFile(null)}>Cancel</button></div>
          </div>
        </div>
      ):null}

      {adding?<AddSheet a={adding} set={setAdding} themes={themes} find={find} confirm={confirmAdd} close={()=>{run.current++;setAdding(null);}}/>:null}
      {openBook?<BookSheet b={openBook} themes={themes} close={()=>setOpen(null)} put={putBook} setCover={setCover} dropCover={dropCover} remove={removeBook}/>:null}
    </div>
  );
}

function ThemePicks({themes,value,onChange}){
  if(!themes.length)return<p className="ts-note">No themes yet — the book goes under All. Make a theme with “+ Theme”.</p>;
  return(
    <div className="ts-bar" style={{margin:0}}>
      {themes.map(t=>{ const on=value.includes(t.id); return(
        <button key={t.id} type="button" className="ts-chip" aria-pressed={on} onClick={()=>onChange(on?value.filter(x=>x!==t.id):[...value,t.id])}>{t.name}</button>
      );})}
    </div>
  );
}

function AddSheet({a,set,themes,find,confirm,close}){
  const fileRef=useRef(null);
  const f=a.found;
  const tab=(k,label)=><button type="button" className="ts-chip" aria-pressed={a.tab===k} onClick={()=>set(x=>({...x,tab:k,why:"",found:null}))}>{label}</button>;
  return(
    <div className="ts-scrim" onClick={close}>
      <div className="ts-sheet" onClick={e=>e.stopPropagation()} role="dialog" aria-label="Add a book">
        <h2>Add a book</h2>
        <div className="ts-tabs">{tab("isbn","ISBN")}{tab("link","Link")}{tab("page","Page")}</div>
        {a.tab==="isbn"?(
          <form className="ts-row" onSubmit={e=>{e.preventDefault();find("isbn");}}>
            <input id="add-isbn" className="ts-input" autoFocus inputMode="numeric" placeholder="ISBN, 10 or 13 digits" value={a.isbn} onChange={e=>set(x=>({...x,isbn:e.target.value}))}/>
            <button className="ts-btn primary" type="submit" disabled={!!a.busy}>Find</button>
          </form>
        ):a.tab==="link"?(
          <form className="ts-row" onSubmit={e=>{e.preventDefault();find("link");}}>
            <input id="add-link" className="ts-input" autoFocus placeholder="https:// a page for the book" value={a.link} onChange={e=>set(x=>({...x,link:e.target.value}))}/>
            <button className="ts-btn primary" type="submit" disabled={!!a.busy}>Find</button>
          </form>
        ):(
          <div className="ts-row">
            <button className="ts-btn primary" type="button" disabled={!!a.busy} onClick={()=>fileRef.current&&fileRef.current.click()}>Choose saved page</button>
            <input ref={fileRef} id="add-page" type="file" hidden accept=".mht,.mhtml,.html,.htm,multipart/related,message/rfc822,text/html" onChange={e=>{ const file=e.target.files&&e.target.files[0]; e.target.value=""; if(file)find("page",file); }}/>
            <p className="ts-note" style={{flexBasis:"100%"}}>For a site that blocks reading, such as AbeBooks: open the book’s page, then Save Page As → “Webpage, Single File”. That kind of file brings the cover too.</p>
          </div>
        )}
        <div>
          <p className="ts-note" style={{marginBottom:6}}>File under</p>
          <ThemePicks themes={themes} value={a.themes} onChange={v=>set(x=>({...x,themes:v}))}/>
        </div>
        {a.busy?<p className="ts-note" role="status">{a.busy}</p>:null}
        {a.why?<p className="ts-err" role="alert">{a.why}</p>:null}
        {f?(
          <div className="ts-detail">
            <div className="ts-cover" style={{maxWidth:140}}>
              {f.coverUrl?<img src={f.coverUrl} alt={"Cover of "+f.title}/>:<div className="ts-plain"><b>{f.title}</b></div>}
            </div>
            <div className="ts-facts">
              <strong style={{fontSize:"1rem"}}>{f.title}</strong>
              <span>{f.publisher||"Publisher not found"}</span>
              <span>ISBN {fmtIsbn(f.isbn13)}</span>
              <span>{publishedLine(f.published)}</span>
              {f.source?<span className="ts-note">Read from {hostOf(f.source)}</span>:null}
              {f.noCoverHint?<span className="ts-note">This file holds no pictures. Add a cover from the book’s panel, or save the page as “Webpage, Single File”.</span>:null}
              {f.had?<span className="ts-note">Already on your shelf.</span>:null}
              <div className="ts-row" style={{marginTop:6}}>
                <button className="ts-btn primary" onClick={confirm}>{f.had?"Update its themes":"Add to shelf"}</button>
                <button className="ts-btn" onClick={close}>Cancel</button>
              </div>
            </div>
          </div>
        ):(
          <div className="ts-row"><button className="ts-btn" onClick={close}>{a.busy?"Stop":"Cancel"}</button></div>
        )}
      </div>
    </div>
  );
}

function BookSheet({b,themes,close,put,setCover,dropCover,remove}){
  const [sure,setSure]=useState(false);
  const fileRef=useRef(null);
  const onPaste=e=>{
    const items=[...((e.clipboardData&&e.clipboardData.items)||[])];
    const it=items.find(i=>i.kind==="file"&&/^image\//.test(i.type));
    e.preventDefault();
    if(it)setCover(b,it.getAsFile());
  };
  const onDrop=e=>{ e.preventDefault(); const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f)setCover(b,f); };
  return(
    <div className="ts-scrim" onClick={close}>
      <div className="ts-sheet" onClick={e=>e.stopPropagation()} role="dialog" aria-label={b.title} onDragOver={e=>e.preventDefault()} onDrop={onDrop}>
        <div className="ts-detail">
          <Cover book={b} big/>
          <div className="ts-facts">
            <h2>{b.title}</h2>
            <span>{b.publisher||"Publisher not found"}</span>
            <span style={{fontVariantNumeric:"tabular-nums"}}>ISBN {fmtIsbn(b.isbn13)}</span>
            <span>{publishedLine(b.published)}</span>
            <Shops book={b}/>
            {b.source?<a className="ts-note" href={b.source} target="_blank" rel="noopener noreferrer" style={{color:"var(--muted)"}}>Read from {hostOf(b.source)}</a>:null}
          </div>
        </div>
        <div>
          <p className="ts-note" style={{margin:"0 0 6px"}}>Themes</p>
          <ThemePicks themes={themes} value={b.themes} onChange={v=>put({...b,themes:v})}/>
        </div>
        <div className="ts-facts">
          <span className="k">Cover</span>
          <div className="ts-paste" contentEditable suppressContentEditableWarning onPaste={onPaste} onKeyDown={e=>{ if(!(e.metaKey||e.ctrlKey))e.preventDefault(); }} onInput={e=>{e.currentTarget.textContent="";}} aria-label="Paste a cover here">
            Copy a cover picture on any website, click here, then paste. Or drop a picture file on this panel.
          </div>
          <div className="ts-row">
            <button className="ts-btn" onClick={()=>fileRef.current&&fileRef.current.click()}>Upload a picture</button>
            <input ref={fileRef} id="cover-file" type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=""; if(f)setCover(b,f); }}/>
            {b.cover?<button className="ts-link" onClick={()=>dropCover(b)}>Remove cover</button>:null}
          </div>
        </div>
        <div className="ts-row" style={{justifyContent:"space-between"}}>
          {sure
            ?<span className="ts-row"><span>Remove from the shelf?</span><button className="ts-btn primary" onClick={()=>remove(b)}>Remove</button><button className="ts-btn" onClick={()=>setSure(false)}>Keep</button></span>
            :<button className="ts-link" onClick={()=>setSure(true)}>Remove book</button>}
          <button className="ts-btn" onClick={close}>Done</button>
        </div>
      </div>
    </div>
  );
}
