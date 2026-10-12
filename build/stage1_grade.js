// stage1_grade.js — her Stage 1 pass test (docs/handover_search_stage1.md), one copy.
// Written into the live check page by build/live_check.js and required by
// build/stage1_check.js, which regrades saved lookup records. No app code is used: it
// reads the lookup's calls (the lookup log's tape) and the row it returned.
//
// A pass needs all three: this show's catalogue kept; its English edition kept, when one
// exists; no book the search saw dropped, except her excluded types. For each book in the
// answers, the trace names the first step where it was lost: never seen (in nothing
// Parallel returned), seen but not shown to Claude, shown but not reported, reported but
// dropped by the app, or kept. Matched by ISBN.

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
// Where one book (any of its numbers) went, step by step.
function s1Trace(nums,calls,kept){
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
  const step=isKept?"kept":reported?"reported by Claude, dropped by the app":shown?"shown to Claude, not reported"
    :seen?"seen, not shown to Claude":"never seen";
  return{step,kept:isKept,seen,where:[...new Set(where)].slice(0,3)};
}
const s1Fmt=n=>{ const d=s1Digits(n); return d.length===13?d.slice(0,3)+"-"+d.slice(3):d; };
// `answers`: one case from docs/stage1_answers.json. Returns {pass, lines, books, dropped}.
function s1Grade(answers,calls,row,finished){
  const kept=s1Kept(row);
  const lines=[], books=[];
  const nums=b=>[b.isbn].concat(b.also||[]);
  const book=(b,role)=>{ const t=s1Trace(nums(b),calls,kept); const x={role,isbn:b.isbn,what:b.what,...t}; books.push(x); return x; };
  if(finished===false)lines.push({ok:false,text:"The lookup did not finish."});
  const own=(answers.thisShow||[]).map(b=>book(b,"this show's catalogue"));
  const ownOk=own.some(b=>b.kept);
  lines.push({ok:ownOk,text:ownOk?"This show's catalogue found: "+own.filter(b=>b.kept).map(b=>s1Fmt(b.isbn)).join(", ")+"."
    :"This show's catalogue not found ("+own.map(b=>s1Fmt(b.isbn)+": "+b.step).join("; ")+")."});
  if(answers.english){
    const e=books.find(b=>b.isbn===answers.english.isbn)||book(answers.english,"English edition");
    lines.push({ok:e.kept,text:e.kept?"English edition found: "+s1Fmt(e.isbn)+".":"English edition "+s1Fmt(e.isbn)+" missing — "+e.step+"."});
  } else lines.push({ok:true,text:"No English edition exists for this show — none needed."});
  for(const b of (answers.keptIfSeen||[])){
    const x=book(b,"kept if seen");
    if(x.kept)lines.push({ok:true,text:s1Fmt(b.isbn)+" ("+b.what+") seen and kept."});
    else if(x.step==="never seen")lines.push({ok:true,text:s1Fmt(b.isbn)+" ("+b.what+") not in these results — nothing to keep."});
    else lines.push({ok:false,text:s1Fmt(b.isbn)+" ("+b.what+") seen but dropped — "+x.step+"."});
  }
  for(const b of (answers.excluded||[])){
    const x=book(b,"excluded");
    lines.push({ok:!x.kept,text:x.kept?s1Fmt(b.isbn)+" ("+b.what+") is an excluded type but was kept.":s1Fmt(b.isbn)+" ("+b.what+") left off, as it should be."});
  }
  for(const b of (answers.watch||[])){
    const x=s1Trace(nums(b),calls,kept);
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
  return{pass:finished!==false&&lines.every(l=>l.ok),lines,books,dropped,kept:[...kept]};
}
if(typeof module!=="undefined"&&module.exports)module.exports={s1Grade,s1Trace,s1Kept,s1IsbnsIn,s1Checks};
