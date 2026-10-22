// Fetch each address live through the free Parallel MCP server; save {url,title,full_content}.
const fs=require('fs'),path=require('path');
const [,,listFile,outDir]=process.argv;
const EP='https://search.parallel.ai/mcp';
const H={'Content-Type':'application/json','Accept':'application/json, text/event-stream'};
async function rpc(sid,body){
  const r=await fetch(EP,{method:'POST',headers:{...H,...(sid?{'Mcp-Session-Id':sid}:{})},body:JSON.stringify(body)});
  const t=await r.text(); let j=null;
  try{ j=JSON.parse(t); }catch{ const m=t.match(/^data: (.*)$/m); if(m)j=JSON.parse(m[1]); }
  return {sid:r.headers.get('mcp-session-id')||sid,j};
}
(async()=>{
  fs.mkdirSync(outDir,{recursive:true});
  let {sid}=await rpc(null,{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'cw-test',version:'1'}}});
  await rpc(sid,{jsonrpc:'2.0',method:'notifications/initialized'});
  const urls=JSON.parse(fs.readFileSync(listFile,'utf8'));
  let i=0;
  for(const u of urls){
    i++;
    const f=path.join(outDir,String(i).padStart(2,'0')+'.json');
    if(fs.existsSync(f))continue;
    const {j}=await rpc(sid,{jsonrpc:'2.0',id:100+i,method:'tools/call',params:{name:'web_fetch',arguments:{urls:[u],full_content:true,objective:"The exhibition's title, dates and description.",session_id:'cwtest'+'0'.repeat(30)}}});
    let rep=null;
    try{ const c=j.result.content.find(x=>x.type==='text'); rep=JSON.parse(c.text); }catch(e){ console.log('ERR',u,JSON.stringify(j).slice(0,300)); continue; }
    const r=(rep.results||[])[0];
    if(!r){ console.log('EMPTY',u,JSON.stringify(rep.errors||[]).slice(0,200)); continue; }
    fs.writeFileSync(f,JSON.stringify({url:u,title:r.title,full_content:r.full_content||''}));
    console.log('ok',i,u,(r.full_content||'').length);
    await new Promise(r=>setTimeout(r,800));
  }
})();
