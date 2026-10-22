// The app's own code on each answer (linkAnswer, linkTitle, cardTitle, composeSummary), scored against hand truth and mechanical summary checks.
const fs=require('fs'),path=require('path');
const [,,ansDir,jsx]=process.argv;
const A=require('./load.js')(jsx,['linkAnswer','linkTitle','cardTitle','composeSummary','nameInLines','maybeElsewhere','hostOf','siteUrlOf']);
const truth=require('./truth.js');
const STOP=new Set('the a an and of in on at to for from with by its his her their as is are was this that into over between across through new first more most own one two three four five six seven eight nine ten than about'.split(' '));
const fold=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const fail={summary:0,subtitle:0,english:0,es:0}; let n=0; const rows=[];
for(const f of fs.readdirSync('q').filter(x=>x.endsWith('.page.json')).sort()){
  const nn=f.slice(0,2), af=path.join(ansDir,nn+'.json'); if(!fs.existsSync(af)){console.log(nn,'NO ANSWER');continue;}
  let raw; try{raw=JSON.parse(fs.readFileSync(af,'utf8'));}catch(e){console.log(nn,'BAD JSON');continue;}
  n++;
  const {url,vc,page}=JSON.parse(fs.readFileSync('q/'+f,'utf8')), a=A.linkAnswer(raw), t=truth(nn), issues=[];
  // summary
  const s=a.summary, w=s.split(/\s+/).filter(Boolean).length;
  if(!s)issues.push('summary: null');
  else{
    if(w>10)issues.push('summary: '+w+' words');
    if(!/\.$/.test(s))issues.push('summary: no full stop');
    if(/:/.test(s))issues.push('summary: colon');
    const src=fold(page.raw+' '+page.base+' '+(page.between||[]).join(' '));
    const odd=fold(s).match(/[a-z0-9]+/g).filter(x=>x.length>=4&&!STOP.has(x)&&!src.includes(x.slice(0,Math.max(4,x.length-3))));
    if(odd.length)issues.push('summary: not in text? '+odd.join(','));
  }
  // subtitle
  if(t.sub!==null){
    const got=(page.between||[]).find(l=>fold(l).replace(/\s+/g,' ').trim()===fold(a.subtitle).replace(/\s+/g,' ').trim())||'';
    if(fold(got)!==fold(t.sub))issues.push('subtitle: got '+JSON.stringify(a.subtitle)+' want '+JSON.stringify(t.sub));
  }
  // english
  if(t.en===true&&!a.english)issues.push('english: missing');
  if(t.en===false&&a.english)issues.push('english: given for an English title: '+JSON.stringify(a.english));
  if(a.englishSpeaking!==t.es)issues.push('englishSpeaking: '+a.englishSpeaking);
  for(const k of Object.keys(fail))if(issues.some(i=>i.startsWith(k==='es'?'englishSpeaking':k)))fail[k]++;
  const title=A.cardTitle(A.nameInLines(page,vc)||A.linkTitle(page.base,a.subtitle,page.between),vc);
  rows.push(nn+'  '+title+'\n      '+A.composeSummary(a.english,a.summary)+(issues.length?'\n      !! '+issues.join(' | '):''));
}
console.log(rows.join('\n'));
console.log('\n'+n+' answers. Faults: summary '+fail.summary+', subtitle '+fail.subtitle+', english '+fail.english+', englishSpeaking '+fail.es);
