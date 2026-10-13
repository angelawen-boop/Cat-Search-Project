// stage1_grade.js — her Stage 1 and 1b pass test (docs/handover_search_stage1.md), one copy.
// Written into the live check page by build/live_check.js and required by
// build/stage1_check.js, which regrades saved lookup records. No app code is used: it
// reads the lookup's calls (the lookup log's tape) and the row it returned.
//
// A pass needs all three: this show's catalogue kept; its English edition kept, when one
// exists; no book the search saw dropped, except her excluded types. For each book in the
// answers, the trace names the first step where it was lost: never seen (in nothing
// Parallel returned), seen but not shown to Claude, shown but not reported, reported but
// dropped by the app, or kept. Matched by ISBN; a book kept with no ISBN is matched by
// its answer's `title` (every word, whole). Kept without its ISBN fails only where the
// number was printed in something the search saw (information thrown away).

function s1Digits(s){ return String(s||"").replace(/[^0-9Xx]/g,""); }
function s1Checks(d){
  if(!/^97[89]\d{10}$/.test(d))return false;
  let t=0; for(let i=0;i<12;i++)t+=(+d[i])*(i%2?3:1);
  return (10-t%10)%10===+d[12];
}
// The number as text prints it: digits, with or without hyphens or spaces between them.
function s1Re(isbn){ return new RegExp("(?<![0-9])"+s1Digits(isbn).split("").join("[\\s\\u2010-\\u2015-]?")+"(?![0-9])"); }
function s1ResultText(r){
  return [r&&r.title,r&&r.url,r&&typeof r.full_content==="string"?r.full_content:"",
    Array.isArray(r&&r.excerpts)?r.excerpts.join("\n"):""].filter(Boolean).join("\n");
}
// Every valid 978/979 number in a text.
function s1IsbnsIn(text){
  const t=String(text||"").replace(/(\d)[\s‐-―-](?=\d)/g,"$1");
  return [...new Set([...t.matchAll(/(?<![0-9])(97[89]\d{10})(?![0-9])/g)].map(m=>m[1]).filter(s1Checks))];
}
function s1Kept(row){
  const out=new Set();
  if(!row)return out;
  for(const n of [row.isbn13,row.alsoIsbn13])if(n)out.add(s1Digits(n));
  for(const v of (Array.isArray(row.editions)?row.editions:[]))for(const n of [v&&v.isbn13,v&&v.alsoIsbn13])if(n)out.add(s1Digits(n));
  return out;
}
// The books kept with no ISBN: their titles.
function s1KeptUnnumbered(row){
  return (Array.isArray(row&&row.editions)?row.editions:[]).filter(v=>v&&v.title&&!v.isbn13&&!v.alsoIsbn13).map(v=>String(v.title));
}
const s1Fold=t=>String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function s1Words(t){ return [...new Set(s1Fold(t).split(/[^a-z0-9]+/).filter(w=>w.length>=4))]; }
// A kept title carrying every word of the answer's title, each whole.
function s1TitleMatch(want,title){
  const w=s1Words(want), have=new Set(s1Fold(title).split(/[^a-z0-9]+/));
  return w.length>0&&w.every(x=>have.has(x));
}
// Where one book (any of its numbers) went, step by step.
function s1Trace(nums,calls,kept,title,unnumbered){
  const res=nums.map(s1Re);
  const any=t=>res.some(r=>r.test(t));
  const where=[];
  let seen=false, shown=false, reported=false;
  for(const c of calls||[]){
    const o=c.output||{}, i=c.input||{};
    if(Array.isArray(o.results))for(const r of o.results)if(any(s1ResultText(r))){ seen=true; where.push(r.url); }
    if(c.kind==="claude"){
      if(any(String(i.prompt||"")))shown=true;
      if(o.data!==undefined&&any(JSON.stringify(o.data)))reported=true;
    }
  }
  const isKept=nums.some(n=>kept.has(s1Digits(n)));
  const byTitle=!isKept&&title&&(unnumbered||[]).find(t=>s1TitleMatch(title,t))||null;
  const step=isKept?"kept":byTitle?(seen?"kept without its ISBN, though the search saw it printed":"kept by title; no text printed its ISBN"):reported?"reported by Claude, dropped by the app":shown?"shown to Claude, not reported"
    :seen?"seen, not shown to Claude":"never seen";
  return{step,kept:isKept||(!!byTitle&&!seen),byTitle,seen,where:[...new Set(where)].slice(0,3)};
}
const s1Fmt=n=>{ const d=s1Digits(n); return d.length===13?d.slice(0,3)+"-"+d.slice(3):d; };
// `answers`: one case from docs/stage1_answers.json. Returns {pass, lines, books, dropped}.
function s1Grade(answers,calls,row,finished){
  const kept=s1Kept(row), unnumbered=s1KeptUnnumbered(row);
  const lines=[], books=[];
  const nums=b=>[b.isbn].concat(b.also||[]);
  const book=(b,role)=>{ const t=s1Trace(nums(b),calls,kept,b.title,unnumbered); const x={role,isbn:b.isbn,what:b.what,...t}; books.push(x); return x; };
  const how=x=>x.byTitle?" (kept by title, “"+x.byTitle+"”; no text printed its ISBN)":"";
  if(finished===false)lines.push({ok:false,text:"The lookup did not finish."});
  const own=(answers.thisShow||[]).map(b=>book(b,"this show's catalogue"));
  const ownOk=own.some(b=>b.kept);
  lines.push({ok:ownOk,text:ownOk?"This show's catalogue found: "+own.filter(b=>b.kept).map(b=>s1Fmt(b.isbn)+how(b)).join(", ")+"."
    :"This show's catalogue not found ("+own.map(b=>s1Fmt(b.isbn)+": "+b.step).join("; ")+")."});
  if(answers.english){
    const e=books.find(b=>b.isbn===answers.english.isbn)||book(answers.english,"English edition");
    lines.push({ok:e.kept,text:e.kept?"English edition found: "+s1Fmt(e.isbn)+how(e)+".":"English edition "+s1Fmt(e.isbn)+" missing — "+e.step+"."});
  } else lines.push({ok:true,text:"No English edition exists for this show — none needed."});
  for(const b of (answers.keptIfSeen||[])){
    const x=book(b,"kept if seen");
    if(x.kept)lines.push({ok:true,text:s1Fmt(b.isbn)+" ("+b.what+") "+(x.byTitle?"kept by title, “"+x.byTitle+"”; no text printed its ISBN.":"seen and kept.")});
    else if(x.step==="never seen")lines.push({ok:true,text:s1Fmt(b.isbn)+" ("+b.what+") not in these results — nothing to keep."});
    else lines.push({ok:false,text:s1Fmt(b.isbn)+" ("+b.what+") seen but dropped — "+x.step+"."});
  }
  for(const b of (answers.excluded||[])){
    const x=book(b,"excluded");
    lines.push({ok:!x.kept,text:x.kept?s1Fmt(b.isbn)+" ("+b.what+") is an excluded type but was kept.":s1Fmt(b.isbn)+" ("+b.what+") left off, as it should be."});
  }
  for(const b of (answers.watch||[])){
    const x=s1Trace(nums(b),calls,kept,null,[]);
    if(x.seen)lines.push({ok:true,watch:true,text:"WATCH: "+s1Fmt(b.isbn)+" ("+b.what+") appeared — "+x.where.join(", ")+"."});
  }
  // Any other book Claude named, printed in the text it was given, and not kept: dropped.
  const known=new Set([...books.flatMap(b=>nums(b)),...(answers.excluded||[]).flatMap(nums),...(answers.watch||[]).flatMap(nums)].map(s1Digits));
  const dropped=[];
  for(const c of calls||[]){
    if(c.kind!=="claude"||!c.output||c.output.data===undefined)continue;
    const prompt=String((c.input&&c.input.prompt)||"").replace(/(\d)[\s‐-―-](?=\d)/g,"$1");
    for(const n of s1IsbnsIn(JSON.stringify(c.output.data)))
      if(!known.has(n)&&!kept.has(n)&&prompt.includes(n)&&!dropped.includes(n))dropped.push(n);
  }
  for(const n of dropped)lines.push({ok:false,text:"Another book Claude named, "+s1Fmt(n)+", was dropped by the app."});
  // Every other book kept with no ISBN: a fail only where a result carrying its whole title
  // prints exactly one valid number (a "You may also like" link makes two) that nothing
  // else accounts for — probably its own, thrown away.
  const accounted=new Set([...known,...kept]);
  for(const t of new Set(unnumbered)){
    if(books.some(b=>b.byTitle===t))continue;
    const w=s1Words(t), cands=new Map();
    if(w.length>=2)for(const c of calls||[])for(const r of ((c.output&&c.output.results)||[])){
      const txt=s1ResultText(r), f=s1Fold(txt);
      if(!w.every(x=>f.includes(x)))continue;
      const ns=[...new Set(s1IsbnsIn(txt))];
      if(ns.length===1&&!accounted.has(ns[0])&&!cands.has(ns[0]))cands.set(ns[0],r.url);
    }
    if(cands.size===1){ const [n,u]=[...cands][0]; lines.push({ok:false,text:"“"+t+"” kept without an ISBN, though "+u+" prints "+s1Fmt(n)+" with its title — probably its own (check)."}); }
    else lines.push({ok:true,text:"“"+t+"” kept without an ISBN; no text the search saw printed one for it."});
  }
  // ── STAGE 1B: THE CONCLUSIONS (her decision) — every kept book is one the answers name,
  // with the right language and the right show; a book kept twice is the same book read twice.
  const named=[...(answers.thisShow||[]),...(answers.english?[answers.english]:[]),...(answers.keptIfSeen||[])];
  const eds=(Array.isArray(row&&row.editions)?row.editions:[]).filter(Boolean);
  const langOk=(want,got)=>{ const w=s1Fold(want), g=s1Fold(got); return !g||g.split(/[^a-z]+/).includes(w); };
  for(const v of eds){
    const label=(v.isbn13?s1Fmt(v.isbn13)+" ":"")+"“"+(v.title||"untitled")+"”";
    if(!v.isbn13&&eds.some(o=>o!==v&&o.isbn13&&o.title&&s1Words(v.title).length&&s1TitleMatch(v.title,o.title))){
      lines.push({ok:false,stage:"1b",text:label+" kept twice — once without its ISBN, as a separate book."});
      continue;
    }
    const b=v.isbn13?named.find(x=>nums(x).map(s1Digits).includes(s1Digits(v.isbn13)))
      :named.find(x=>x.title&&s1TitleMatch(x.title,v.title||""));
    // Kept by title while its numbered copy is kept too: one book recorded twice.
    if(b&&!v.isbn13&&nums(b).some(n=>kept.has(s1Digits(n)))){
      lines.push({ok:false,stage:"1b",text:label+" kept twice — once without its ISBN, as a separate book."});
      continue;
    }
    // A numbered book under a title not its own (a list's heading).
    if(b&&v.isbn13&&b.title&&v.title&&!s1TitleMatch(b.title,v.title))
      lines.push({ok:false,stage:"1b",text:label+" recorded under a title that is not its own."});
    if(!b){
      if(!(answers.excluded||[]).some(x=>v.isbn13&&nums(x).map(s1Digits).includes(s1Digits(v.isbn13))))
        lines.push({ok:false,stage:"1b",text:label+" kept, but it is not in the answers — another show’s book or junk (if it belongs, add it to the answers)."});
      continue;
    }
    if(b.lang&&v.lang&&!langOk(b.lang,v.lang))lines.push({ok:false,stage:"1b",text:label+" recorded as "+v.lang+"; it is "+b.lang+"."});
    if(b.showing&&(v.showing||"this")!==b.showing)lines.push({ok:false,stage:"1b",text:label+" recorded as "+((v.showing||"this")==="this"?"this show’s":"another showing’s")+"; it is "+(b.showing==="this"?"this show’s":"another showing’s")+"."});
  }
  return{pass:finished!==false&&lines.every(l=>l.ok),lines,books,dropped,kept:[...kept]};
}
if(typeof module!=="undefined"&&module.exports)module.exports={s1Grade,s1Trace,s1Kept,s1KeptUnnumbered,s1TitleMatch,s1IsbnsIn,s1Checks};
