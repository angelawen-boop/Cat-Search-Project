// For each answer where the app would ask the second question, build it with the app's code.
const fs=require('fs');
const [,,ansDir,outDir,jsx]=process.argv;
const A=require('./load.js')(jsx,['linkAnswer','maybeElsewhere','elsewherePrompt','hostOf','siteUrlOf','occVenueId','linkEntry']);
fs.mkdirSync(outDir,{recursive:true});
for(const f of fs.readdirSync('q').filter(x=>x.endsWith('.page.json')).sort()){
  const nn=f.slice(0,2), {url,vc,askVenue,page}=JSON.parse(fs.readFileSync('q/'+f,'utf8'));
  const a=A.linkAnswer(JSON.parse(fs.readFileSync(ansDir+'/'+nn+'.json','utf8'))), host=A.hostOf(A.siteUrlOf(url));
  const ownSite=vc===A.occVenueId(host)&&!A.linkEntry(vc);
  const asks=askVenue&&ownSite&&A.maybeElsewhere(a,host);
  if(!askVenue)continue;
  console.log(nn,asks?'SECOND':'      ',a.venueOwnPage?'own':'NOT own',a.venue,'|',a.venueShort,'|',a.venueCity,a.venueCountry);
  if(asks)fs.writeFileSync(outDir+'/'+nn+'.txt',A.elsewherePrompt(page,url,a));
}
