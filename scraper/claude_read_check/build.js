// The app's own code builds the exact first question it sends Claude for each live page.
const fs=require('fs'),path=require('path');
const [,,pagesDir,outDir,jsx]=process.argv;
const A=require('./load.js')(jsx,['readShowPage','linkReadVenue','linkVenue','linkPrompt','isOcc','hostOf','siteUrlOf']);
fs.mkdirSync(outDir,{recursive:true});
for(const f of fs.readdirSync(pagesDir).filter(x=>x.endsWith('.json')).sort()){
  const res=JSON.parse(fs.readFileSync(path.join(pagesDir,f),'utf8'));
  const page=A.readShowPage(res,res.url,A.linkReadVenue(res.url));
  if(!page.ok){ console.log('NOREAD',f,res.url,page.why); continue; }
  const lv=A.linkVenue(res.url,page); if(!lv.id){console.log('NOVENUE',f);continue;}
  if(lv.line)page.between=page.between.filter(l=>l!==lv.line);
  const askVenue=A.isOcc(lv.id);
  fs.writeFileSync(path.join(outDir,f.replace('.json','.txt')),A.linkPrompt(page,askVenue,res.url));
  fs.writeFileSync(path.join(outDir,f.replace('.json','.page.json')),JSON.stringify({url:res.url,vc:lv.id,askVenue,page}));
  console.log(f,askVenue?'ask':'   ',page.between.length,'|',page.base,'|',JSON.stringify(page.between).slice(0,150));
}
