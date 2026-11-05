//@ Reading the pro forma CSV.
//@piece proFormaCsv


// One pro forma file, built in memory, so a link goes through the very same
// door as a sweep. swept_at stays blank: a link is not a sweep, and the
// freshness drawer is about sweeps.
function proFormaCsv(rows){
  const cell=v=>{const s=String(v==null?"":v);return /[",\n\r]/.test(s)?"\""+s.replace(/"/g,"\"\"")+"\"":s;};
  const cols=["venue_code","title","start_date","end_date","summary","url","notes","swept_at"];
  return [cols.join(",")].concat(rows.map(r=>cols.map(c=>cell(r[c])).join(","))).join("\n")+"\n";
}
//@piece csvParse

function csvParse(text){
  const out=[]; let i=0,field="",row=[],inQ=false; text=String(text).replace(/\r\n?/g,"\n");
  const pushF=()=>{row.push(field);field="";}; const pushR=()=>{out.push(row);row=[];};
  while(i<text.length){ const c=text[i];
    if(inQ){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i+=2;continue;} inQ=false;i++;continue;} field+=c;i++;continue; }
    if(c==='"'){inQ=true;i++;continue;}
    if(c===','){pushF();i++;continue;}
    if(c==='\n'){pushF();pushR();i++;continue;}
    field+=c;i++;
  }
  if(field.length>0||row.length>0){pushF();pushR();}
  return out.filter(r=>r.some(c=>String(c).trim()!==""));
}
