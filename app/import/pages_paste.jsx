//@ Saved pages, pasted text, and the pending links/pages/pastes in the store.
//@piece LINKS_DOC

const LINKS_DOC="links/pending";
//@piece savedPageHtml

// ── PAGES: a show page she saved (her decision; docs/add_by_link.md, "Saved pages") ──
// For a site that refuses Parallel. A saved page (.mht/.mhtml from Chrome, or .html) is
// turned into the reply Parallel gives — {url,title,full_content}, headings as "#",
// links as [text](href) — and read by readShowPage like any link. Only the page's own
// text is kept; the photos and fonts packed in the file are dropped.
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
//@piece savedPageReply

// parse: html → a Document (the page's own DOMParser; a test hands in jsdom's).
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
//@piece PAGES_COLL

// The pages waiting in the Pages list — their text, not the files — kept in the page's
// store like the Links box (her decision), one document each (the store caps a document).
const PAGES_COLL="links_pages";
//@piece pageDocId

const pageDocId=u=>{ let h=5381; for(const c of String(normalizeUrlKey(u)||u))h=((h*33)^c.charCodeAt(0))>>>0; return "p"+h.toString(36); };
//@piece readPendingPages

async function readPendingPages(){
  try{
    const list=await storeList(PAGES_COLL,{by:"at",dir:"asc",limit:1000},{part:UNREAD_PAGES});
    return list.map(d=>d.data||{}).filter(p=>p.url&&p.text).map(p=>({url:p.url,title:p.title||"",name:p.name||"",text:p.text}));
  }catch{ return []; }
}
//@piece writePendingPages

async function writePendingPages(list){
  if(!await storeReached({part:UNREAD_PAGES}))return false;
  try{
    const keep=new Set(list.map(p=>pageDocId(p.url)));
    const had=await storeList(PAGES_COLL,{by:"at",dir:"asc",limit:1000});
    for(const d of had) if(!keep.has(d.id))await storeDelete(PAGES_COLL+"/"+d.id);
    const at=Date.now();
    for(let i=0;i<list.length;i++){ const p=list[i]; await storeWrite(PAGES_COLL+"/"+pageDocId(p.url),{url:p.url,title:p.title||"",name:p.name||"",text:p.text,at:at+i}); }
    return true;
  }catch{ return false; }
}
//@piece pastedPageReply

// Paste: a page's text copied by hand, its link typed beside it (docs/add_by_link.md, "Pasted
// pages"). Pasted text has no layout to read, so the page reader never sees it: Claude gives the
// title and copies the date words, code checks both are in the text and reads the dates
// (pastedPage, pasteFaults; her decision). Any length of text is read.
function pastedPageReply(url,text){
  const u=String(url||"").trim();
  if(!/^https?:\/\/\S+$/i.test(u))return{ok:false,why:"The link box holds no web address."};
  const lines=String(text||"").replace(/\r/g,"").split("\n").map(l=>l.replace(/[ \t]+/g," ").trim());
  if(!lines.some(Boolean))return{ok:false,why:"The text box is empty."};
  return{ok:true,res:{url:withoutTracking(u),text:lines.join("\n").replace(/\n{3,}/g,"\n\n").trim()}};
}
//@piece pastedPage

// A pasted box as the rest of the road takes a page: Claude is handed the text (the description's
// 2,000-character cut applies); title and dates are filled from Claude's answer (pasteDates).
function pastedPage(text,url){
  return{ok:true,pasted:true,text,base:"",between:[],under:"",afterDates:String(text).split("\n").filter(Boolean),start:"",end:"",
    raw:String(text).slice(0,LINK_RAW_CHARS),site:hostOf(siteUrlOf(url)).replace(/^www\./,""),link:url,noDates:true,dateLine:""};
}
//@piece pasteWords

// Claude's copy is checked word for word against the text: capitals, punctuation and line breaks aside.
const pasteWords=t=>" "+foldText(String(t||"")).replace(/[^\p{L}\p{N}]+/gu," ").trim()+" ";
//@piece inPasted

const inPasted=(part,text)=>pasteWords(part).trim()!==""&&pasteWords(text).includes(pasteWords(part));
//@piece pasteTitle

// A library record's " : " as ": ", and no closing full stop (George Stubbs : a celebration.).
const pasteTitle=t=>String(t||"").replace(/\s+/g," ").trim().replace(/\s+:\s+/g,": ").replace(/[\s.:;,]+$/,"");
//@piece pasteFaults

function pasteFaults(o,page){
  const a=linkAnswer(o), faults=[];
  if(!a.pasteTitle)faults.push("no title given");
  else if(!inPasted(a.pasteTitle,page.text))faults.push("the title is not copied exactly from the text");
  if(a.pasteDates&&!inPasted(a.pasteDates,page.text))faults.push("the dates are not copied exactly from the text");
  return faults;
}
//@piece pasteRest

// The text the summary is checked against: the paste with the title and the date words taken out,
// as Links and Pages hand Claude the page under its title, dates taken out.
function pasteRest(o,page){
  const a=linkAnswer(o);
  let rest=pasteWords(page.text);
  for(const part of [a.pasteTitle,a.pasteDates]) if(pasteWords(part).trim())rest=rest.split(pasteWords(part)).join(" ");
  return rest;
}
//@piece pasteDates

// The dates from Claude's copied words, by the shared date reader with no year floor: the
// words are already cut out of the text, so no lifespan can be among them.
function pasteDates(page,words,vc){
  const r=words?DATES.findDateRange(words,{looseSingles:true,slashes:true,anyYear:true,venue:vc}):{start:"",end:""};
  if(r.start||r.end)return{...page,start:r.start||"",end:r.end||"",noDates:false,dateLine:words,dateNote:DATES.closedEarlyNote(r)};
  return{...page,noDates:true,orderUnknown:!!r.orderUnknown,shown:r.shownText||"",shownWhy:r.shownWhy||"",dateLine:words||""};
}
//@piece PASTES_COLL

// The Paste boxes waiting, kept in the page's store as she types, one document each like the
// Pages list (the store caps a document). Only a box that changed is written again.
const PASTES_COLL="links_pastes";
//@piece boxSeq

let boxSeq=0;
//@piece filledBox

const filledBox=x=>!!(x.url.trim()||x.text.trim());
//@piece pastesWritten

let pastesWritten=new Map();
//@piece readPendingPastes
   // box id → what the store holds for it
async function readPendingPastes(){
  try{
    const list=await storeList(PASTES_COLL,{by:"at",dir:"asc",limit:1000},{part:UNREAD_PASTES});
    const l=list.map(d=>({id:d.id,...(d.data||{})})).map(x=>({id:x.id,at:+x.at||0,url:String(x.url||""),text:String(x.text||"")})).filter(filledBox);
    pastesWritten=new Map(l.map(x=>[x.id,x.url+"\n"+x.text]));
    return l;
  }catch{ return []; }
}
//@piece writePendingPastes

async function writePendingPastes(items){
  if(!await storeReached({part:UNREAD_PASTES}))return false;
  try{
    const keep=items.filter(filledBox), ids=new Set(keep.map(x=>x.id));
    for(const id of [...pastesWritten.keys()]) if(!ids.has(id)){ await storeDelete(PASTES_COLL+"/"+id); pastesWritten.delete(id); }
    for(const x of keep){ const v=x.url+"\n"+x.text; if(pastesWritten.get(x.id)===v)continue;
      await storeWrite(PASTES_COLL+"/"+x.id,{url:x.url,text:x.text,at:x.at}); pastesWritten.set(x.id,v); }
    return true;
  }catch{ return false; }
}
//@piece PASTE_BOXES

// Two boxes to start, one more each time she asks; boxes she filled are kept.
const PASTE_BOXES=2;
//@piece newBox

// A box's place in the list is when it was made, so a box typed in again keeps its place.
const newBox=()=>{ const at=Date.now()*1000+(boxSeq++%1000); const id="b"+at.toString(36); return{id,at,url:"",text:""}; };
//@piece pasteBoxes

const pasteBoxes=items=>{ const l=items.filter(filledBox); while(l.length<PASTE_BOXES)l.push(newBox()); return l; };
//@piece mergeBoxes

// Boxes back from a Read join those left, once each, in the order they were made.
const mergeBoxes=(had,back)=>pasteBoxes([...new Map([...had,...back].map(x=>[x.id,x])).values()].sort((a,b)=>a.at-b.at));
//@piece mergePages


// Pages in a list once each, by address; a later pick of the same page replaces it.
function mergePages(had,add){
  const by=new Map();
  for(const p of [...had,...add])by.set(normalizeUrlKey(p.url)||p.url,p);
  return [...by.values()];
}
//@piece readPendingLinks


async function readPendingLinks(){
  try{ const s=await storeRead(LINKS_DOC,{part:UNREAD_LINKS}); return s.exists?String((s.data||{}).text||""):""; }catch{ return ""; }
}
//@piece writePendingLinks

async function writePendingLinks(text){
  try{ await storeWrite(LINKS_DOC,{text:String(text||""),updatedAt:new Date().toISOString()},{part:UNREAD_LINKS}); return true; }catch{ return false; }
}
//@piece writePending

// The waiting box, list or boxes stored, by kind ("links", "pages", "paste").
function writePending(kind,value){
  return kind==="paste"?writePendingPastes(value):kind==="pages"?writePendingPages(value):writePendingLinks(value);
}
