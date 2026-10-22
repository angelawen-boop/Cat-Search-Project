// The app's own code on each second answer: elsewhereAnswer, heldElsewhere, cardTitle.
const fs=require('fs');
const [,,jsx]=process.argv;
const A=require('./load.js')(jsx,['linkAnswer','elsewhereAnswer','heldElsewhere','cardTitle','hostOf','siteUrlOf']);
for(const f of fs.readdirSync('a2').sort()){
  const nn=f.slice(0,2), {url}=JSON.parse(fs.readFileSync('q/'+nn+'.page.json','utf8'));
  const a1=A.linkAnswer(JSON.parse(fs.readFileSync('a1/'+nn+'.json','utf8')));
  const a={...a1,...A.elsewhereAnswer(JSON.parse(fs.readFileSync('a2/'+f,'utf8')))};
  const host=A.hostOf(A.siteUrlOf(url)), away=A.heldElsewhere(a,host);
  console.log(f.padEnd(10),'filed:',away?away.id:'(own)','| site:',a.venueSite,'| title:',A.cardTitle(a.title,away?away.id:''));
}
