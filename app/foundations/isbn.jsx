//@ ISBN-10/13 conversion, checking and display.
//@piece cleanIsbn


const cleanIsbn=v=>{if(!v)return null;const d=String(v).replace(/[^0-9]/g,"");return d.length===13?d:null;};
//@piece fmtIsbn

const fmtIsbn=v=>{const c=cleanIsbn(v);return c?c.slice(0,3)+"-"+c.slice(3):null;};
//@piece isbn10to13


// ISBN-10 is taken, not thrown away (her decision): converted to 13 for her screen,
// since the ledger stores one format. The old check digit is verified first, so a
// mistyped number is refused rather than turned into a plausible wrong one.
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
//@piece toIsbn13


// Every ISBN entering the app goes through toIsbn13: a 13 whose check digit holds, or a
// converted valid 10, else nothing. With `seen` (the plain text the app fetched)
// it is taken only if its digits, 13 or 10, are printed there — a read cannot invent
// one. cleanIsbn stays as it is: it also shows ISBNs already in her ledger.
const toIsbn13=(v,seen)=>{
  const d=String(v||"").replace(/[^0-9]/g,"");
  const isbn=d.length===13?(isbn13Checks(d)?d:null):isbn10to13(v);
  if(!isbn||seen===undefined)return isbn;
  return isbnInText(isbn,seen)?isbn:null;
};
//@piece isbn13to10

function isbn13to10(d){
  if(!/^978\d{10}$/.test(d))return null;
  const core=d.slice(3,12);
  let s=0;
  for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);
  const c=(11-s%11)%11;
  return core+(c===10?"X":String(c));
}
//@piece isbnInText

// Printed in the text: the 13 or the 10, hyphens or spaces between its digits allowed,
// never as part of a longer number.
function isbnInText(isbn,text){
  const d=String(isbn||"").replace(/\D/g,"");
  if(d.length!==13)return false;
  const a=String(text||"").replace(/(\d)[\u2010-\u2015-](?=[\dXx])/g,"$1");
  const b=a.replace(/(\d) (?=[\dXx])/g,"$1");
  return [d,isbn13to10(d)].filter(Boolean).some(f=>{ const re=new RegExp("(?<![0-9])"+f+"(?![0-9Xx])","i"); return re.test(a)||re.test(b); });
}
//@piece isbn13Checks


// The ISBN, read in code first (her decision): a 978/979 number labelled ISBN or EAN
// with a valid check digit, taken only when the page carries exactly ONE ("EAN
// 9782754117425" at Orsay). None or two → Claude reads the page.
function isbn13Checks(d){
  if(!/^97[89]\d{10}$/.test(d))return false;
  let sum=0;
  for(let i=0;i<12;i++)sum+=Number(d[i])*(i%2?3:1);
  return (10-(sum%10))%10===Number(d[12]);
}
