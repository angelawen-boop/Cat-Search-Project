//@ Parallel search and fetch, what a fetched page's text is, and when a page is too short to read.
//@piece SEARCH_SERVER


// ── FINDING A CATALOGUE (docs/app.md §1; CLAUDE.md §5.1 "Catalogue lookup") ────
// The page cannot reach the internet, so searching and reading go through her keyed
// connector, and `sample` asks Claude to read only the text handed to it — it can
// never report a page that was not found.
// SEARCH_SERVER must match the connector name in the page's published `mcp`
// capability (docs/app.md §1).
const SEARCH_SERVER = "Parallel Search Key";
//@piece SEARCH_TOOL

const SEARCH_TOOL   = "web_search";
//@piece FETCH_TOOL

// Reads a whole page, not a snippet.
const FETCH_TOOL    = "web_fetch";
//@piece SEARCH_SESSION


// The connector wants a stable id per conversation for its free-tier limits.
// One per page load is the honest reading of "conversation" here.
const SEARCH_SESSION = "catwatch" + Math.random().toString(16).slice(2).padEnd(16, "0")
                                  + Date.now().toString(16);
//@piece mcpTrouble


// Each failure code with its own fix gets its own sentence; one catch-all banner
// would hide the fix.
function mcpTrouble(e){
  const code=String((e&&e.code)||"");
  if(code==="server_not_connected")return "Add the \u201cParallel Search Key\u201d connector in claude.ai \u2192 Settings \u2192 Connectors, then try again.";
  if(code==="needs_reauth")       return "Reconnect \u201cParallel Search Key\u201d in claude.ai \u2192 Settings \u2192 Connectors \u2014 its access has lapsed.";
  if(code==="not_in_manifest")    return "This page isn\u2019t allowed to use \u201cParallel Search Key\u201d \u2014 you may have turned it off for this artifact.";
  if(code==="selection_required") return "You have more than one \u201cParallel Search Key\u201d connector. Pick one when Claude asks, then try again.";
  if(code==="blocked_by_policy")  return "Your organisation blocks this connector.";
  if(code==="server_unavailable") return "The search service didn\u2019t answer. Worth one more try in a moment.";
  if(code==="cancelled")          return "Search stopped.";
  return "Search failed ("+(code||"unknown")+").";
}
//@piece onCall

// Who is told of each search, page open and Claude call: a part registers with onCall; the connections never name it.
function onCall(fn){ (onCall.listeners=onCall.listeners||[]).push(fn); }
//@piece announceCall

function announceCall(kind,input,output,t0){ for(const fn of onCall.listeners||[])fn(kind,input,output,t0); }
//@piece searchWeb


// Ask the connector. Returns {ok, results, detail} — never throws.
async function searchWeb(objective,queries){
  const t0=Date.now(), out=await searchWebCall(objective,queries);
  announceCall("search",{objective,queries},out,t0);
  return out;
}
//@piece searchWebCall

async function searchWebCall(objective,queries){
  const mcp=await useCap("mcp");
  if(!mcp)return{ok:false,results:[],detail:"No connector access in this viewer. The page must be opened from its claude.ai link."};
  let res;
  try{
    res=await mcp.callTool(SEARCH_SERVER,SEARCH_TOOL,{
      objective,
      search_queries:queries,
      session_id:SEARCH_SESSION,
    });
  }catch(e){
    return{ok:false,results:[],detail:mcpTrouble(e)+"  ["+String((e&&e.code)||"")+" "+String((e&&e.message)||e)+"]"};
  }
  const p=res&&res.payload;
  const results=(p&&Array.isArray(p.results))?p.results:[];
  return{ok:true,results,detail:"search: "+results.length+" results for "+JSON.stringify(queries)};
}
//@piece fetchPage


// Read one page or several (the shelf and the search box go in ONE call). An ISBN sits
// in a page's small print, rarely in a search excerpt (docs/app.md §1 "The ISBN"). A
// collapsed panel already in the page is read; details fetched on click are not.
// {full:true} reads the page whole (her decision): excerpts dropped the Orsay
// Cassatt's EAN. The shelf stays excerpts — a call is capped at ~25,000 characters.
async function fetchPage(url,objective,queries,opts){
  const t0=Date.now(), out=await fetchPageCall(url,objective,queries,opts);
  announceCall("open",{urls:Array.isArray(url)?url:[url],objective,queries,full:!!(opts&&opts.full)},out,t0);
  return out;
}
//@piece fetchPageCall

async function fetchPageCall(url,objective,queries,opts){
  const urls=Array.isArray(url)?url.filter(Boolean):[url];
  if(!urls.length)return{ok:false,results:[],detail:"No page to open."};
  const mcp=await useCap("mcp");
  if(!mcp)return{ok:false,results:[],detail:"No connector access in this viewer."};
  let res;
  try{
    res=await mcp.callTool(SEARCH_SERVER,FETCH_TOOL,{
      urls,
      objective,
      search_queries:queries,
      session_id:SEARCH_SESSION,
      ...((opts&&opts.full)?{full_content:true}:{}),
    });
  }catch(e){
    return{ok:false,results:[],detail:mcpTrouble(e)+"  ["+String((e&&e.code)||"")+" "+String((e&&e.message)||e)+"]"};
  }
  const p=res&&res.payload;
  const results=(p&&Array.isArray(p.results))?p.results:[];
  // The connector names each address it could not read, with its HTTP status.
  // Re-check reads a 404 off this as "the page is gone" — see recheckLinkedPage.
  const errors=(p&&Array.isArray(p.errors))?p.errors:[];
  return{ok:true,results,errors,detail:"opened "+urls.join(" + ")+": "+results.length+" page(s)"
    +(errors.length?", "+errors.length+" refused ("+errors.map(e=>String((e&&e.http_status_code)||(e&&e.error_type)||"?")).join(", ")+")":"")};
}
//@piece SHELL_CHARS



// ── A CONTAINER IS NOT THE BOOK; A SHELL IS NOT AN EMPTY SHELF (docs/app.md §1) ──
// A publisher candidate is opened before it is believed: it IS the book, it LISTS the
// book (take the link off it), or it came back empty (keep it, labelled as the
// section). No rendering fetch for the few script-drawn publisher sites (her decision).

// Text a fetched page must carry before we believe we saw it — measured: Hannibal's
// script-drawn section returns 110 characters, a real shelf thousands.
const SHELL_CHARS=400;
//@piece pageTextOf

function pageTextOf(results){
  return (results||[]).map(oneText).join("\n").trim();
}
//@piece pageIsShell


// An empty page is not a page with nothing on it: a script-drawn page is our blind
// spot, never a finding.
function pageIsShell(results){ return pageTextOf(results).length<SHELL_CHARS; }
//@piece resultText

// Everything a result carries: its title, its address and its text, whole and excerpted.
function resultText(x){
  return [x&&x.title,x&&x.url,x&&typeof x.full_content==="string"?x.full_content:"",
    Array.isArray(x&&x.excerpts)?x.excerpts.join("\n"):""].filter(Boolean).join("\n");
}
