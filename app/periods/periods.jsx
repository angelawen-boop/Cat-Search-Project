//@ The period list and order, themes, labelling with Claude.
//@piece PERIODS


// ===== PERIOD — the art-period sort (her trial; docs/periods.md) =====
// Claude labels each show with one period from this list and one year; code sorts by
// the list's order, then the year, then her venue order. The list's order is her
// centre-of-gravity rule: Italy, then the North, then France, then America, a region's
// periods placed after the dominant region's periods of the same time (Italy first only
// where two compete); Georgian before Neoclassicism, Belle Époque before Symbolism, Postwar
// Europe after Abstract Expressionism (her reorder). The groups after Contemporary (her decision) take what cannot
// file in the chronology: surveys, stragglers, non-Western art. Themes are labels, never groups.
const PERIODS=[
  {key:"antiquity",name:"Antiquity",span:"before c. 400; ancient art from anywhere"},
  {key:"medieval",name:"Byzantine and Early Medieval",span:"c. 400–1150, Romanesque included"},
  {key:"gothic",name:"Gothic",span:"c. 1150–1375"},
  {key:"intlgothic",name:"International Gothic",span:"c. 1375–1425"},
  {key:"earlyren",name:"Early Renaissance",span:"Italy, c. 1400–1490"},
  {key:"northern",name:"Northern Renaissance",span:"Netherlands, Germany, France, c. 1420–1580 (Van Eyck, Dürer, Bruegel, Holbein)"},
  {key:"tudor",name:"Tudor / Stuart Britain",span:"c. 1485–1714: art made in Britain or at the English court (Holbein and Van Dyck in England, Hilliard, Lely, Kneller)"},
  {key:"highren",name:"High Renaissance",span:"Italy, c. 1490–1530"},
  {key:"venetian",name:"Venetian Renaissance",span:"Venice, c. 1470–1600 (Bellini, Giorgione, Titian, Tintoretto, Veronese)"},
  {key:"mannerism",name:"Mannerism",span:"Italy, c. 1520–1600"},
  {key:"baroque",name:"Italian Baroque",span:"c. 1590–1700"},
  {key:"flemish",name:"Flemish Baroque",span:"c. 1600–1680 (Rubens, Van Dyck, Jordaens)"},
  {key:"dutch",name:"Dutch Golden Age",span:"c. 1600–1700"},
  {key:"spanish",name:"Spanish Golden Age",span:"c. 1580–1700"},
  {key:"classicism",name:"French Classicism",span:"c. 1620–1715 (Poussin, Claude, the age of Louis XIV)"},
  {key:"rococo",name:"Rococo",span:"c. 1715–1775 (Watteau, Boucher, Fragonard, Tiepolo)"},
  {key:"latevenetian",name:"Late Venetian",span:"c. 1700–1790: Venetian views and the Grand Tour (Canaletto, Bellotto, Guardi)"},
  {key:"georgian",name:"Georgian Britain",span:"c. 1714–1830 (Hogarth, Gainsborough, Reynolds, Stubbs)"},
  {key:"neoclassicism",name:"Neoclassicism",span:"c. 1760–1820"},
  {key:"romanticism",name:"Romanticism",span:"c. 1800–1850 (Turner, Constable and Goya included)"},
  {key:"realism",name:"Realism",span:"c. 1840–1880, the Barbizon school and the Salon included"},
  {key:"impressionism",name:"Impressionism",span:"c. 1865–1890, Manet and Degas included"},
  {key:"postimp",name:"Post-Impressionism",span:"c. 1885–1905"},
  {key:"belleepoque",name:"Belle Époque and Aestheticism",span:"c. 1870–1914 (Sargent, Emily Sargent, Whistler, Tissot, Boldini)"},
  {key:"symbolism",name:"Symbolism and Art Nouveau",span:"c. 1880–1910, the Vienna Secession included"},
  {key:"victorian",name:"Victorian Britain",span:"c. 1837–1901, the Pre-Raphaelites included"},
  {key:"american19",name:"19th-century America",span:"c. 1820–1910"},
  {key:"general19",name:"General 19th Century",span:"c. 1800–1900: 19th-century art that is not about one of the movements above"},
  {key:"earlymodern",name:"Early Modernism",span:"c. 1900–1918 (Fauvism, Cubism, Expressionism, Futurism)"},
  {key:"surrealism",name:"Surrealism / Dada",span:"c. 1915–1950 (Duchamp, Ernst, Dalí, Magritte, Miró)"},
  {key:"interwarmod",name:"Interwar Modernism",span:"c. 1918–1945: every style of those years but Surrealism and Dada (Bauhaus, Art Deco, Constructivism, New Objectivity)"},
  {key:"americanmod",name:"American Modernism",span:"c. 1910–1945 (O’Keeffe, Hopper, the Harlem Renaissance)"},
  {key:"postwareu",name:"Postwar Europe",span:"Postwar Europe is a time-and-place period, not a movement: art made in Europe from c. 1945 to 1980, whatever its style or movement. Use it for any show whose works mainly date from that span and place, unless a more specific category on the list fits better."},
  {key:"abex",name:"Abstract Expressionism",span:"c. 1943–1965"},
  {key:"postwaram",name:"Postwar America",span:"America only, c. 1945–1980, outside Abstract Expressionism and Pop: realism, photography, figuration, assemblage, collage and film (Wyeth, Arbus, Neel, Sleigh)"},
  {key:"pop",name:"Pop Art and Minimalism",span:"c. 1955–1980"},
  {key:"general20",name:"General 20th Century",span:"c. 1900–1980: 20th-century art that is not about one of the movements above, self-taught and folk art included"},
  {key:"contemporary",name:"Contemporary",span:"c. 1980 to now"},
  {key:"surveys",name:"Surveys",span:"a show whose works spread across the centuries with no one period at its heart"},
  {key:"mischistoric",name:"Miscellaneous Historic",span:"Western art before 1900 that fits none of the periods above"},
  {key:"miscmodern",name:"Miscellaneous Modern",span:"Western art from 1900 on that fits none of the periods above"},
  {key:"nonwestern",name:"Non-Western Art",span:"art from outside the Western tradition that is not ancient"},
];
//@piece PERIOD_RETIRED

// A split period's old key (Surrealism / Dada out of Interwar, her decision): a show still under it
// sorts with the period named here and is asked again by Label.
const PERIOD_RETIRED={interwar:"interwarmod"};
//@piece PERIOD_RANK

const PERIOD_RANK=Object.fromEntries([...PERIODS.map((p,i)=>[p.key,i]),...Object.entries(PERIOD_RETIRED).map(([k,to])=>[k,PERIODS.findIndex(p=>p.key===to)])]);
//@piece PERIOD_NAME

const PERIOD_NAME=Object.fromEntries([...PERIODS.map(p=>[p.key,p.name]),...Object.entries(PERIOD_RETIRED).map(([k,to])=>[k,PERIODS.find(p=>p.key===to).name])]);
//@piece periodKey

const periodKey=k=>PERIOD_RETIRED[k]||k;
//@piece PERIOD_BATCH

const PERIOD_BATCH=40;
//@piece THEMES


// THEMES (her design): a show of a kind of thing still sits in its period; its themes are
// labels, any number per show, for the filter row. A chip may hold several labels
// (Fashion & Jewellery), so she can regroup chips without relabelling.
const THEMES=[
  {key:"fashion",name:"Fashion",chip:"fashion",rule:"clothes, dress, costume, and cloth made for clothes"},
  {key:"jewellery",name:"Jewellery",chip:"fashion",rule:"jewellery"},
  {key:"architecture",name:"Architecture",chip:"architecture",rule:"buildings and architects"},
  {key:"capriccio",name:"Capriccio",chip:"architecture",rule:"capriccio: an architectural fantasy combining real or invented ruins in an imaginary arrangement (Hubert Robert, Panini); ruin painting"},
  {key:"veduta",name:"Veduta",chip:"architecture",rule:"veduta: an accurate topographical view of a city or place (Canaletto; Piranesi's Vedute di Roma)"},
  {key:"sculpture",name:"Sculpture",chip:"sculpture",rule:"sculpture"},
  {key:"animals",name:"Animals",chip:"animals",rule:"animals: dogs, cats, horses, birds, mythical creatures"},
  {key:"nature",name:"Nature",chip:"nature",rule:"trees, plants, flowers, botanical drawings of them, gardens, clouds; NOT landscape painting in general, NOT still life, NOT animals (those are animals); do not label Nature just because the show is displayed outdoors or in a garden"},
  {key:"photography",name:"Photography",chip:"photography",rule:"photography"},
  {key:"dechard",name:"Decorative Arts – Hard",chip:"dechard",rule:"hard decorative objects: furniture, ceramics, porcelain, glass, silver, metalwork; NOT books or manuscripts (those are books)"},
  {key:"decsoft",name:"Decorative Arts – Soft",chip:"decsoft",rule:"soft decorative arts: wallpaper, carpets, drapery, fabric (chintz), soft furnishings, textiles, interior design; also a show described only as \"decorative arts\", naming no kinds; NOT cloth for clothes, such as dress silks (that is fashion)"},
  {key:"books",name:"Books",chip:"books",rule:"rare books, book collections, illuminated manuscripts, and albums: a collector's book of drawings or prints, bound together (Vasari's Book of Drawings)"},
];
//@piece THEME_KEYS

const THEME_KEYS=new Set(THEMES.map(t=>t.key));
//@piece THEME_NAME

const THEME_NAME=Object.fromEntries(THEMES.map(t=>[t.key,t.name]));
//@piece THEME_CHIPS

// Her chips, in her order; Ex-themes is every labelled show with no theme, Surveys and
// Non-Western Art included (they are groups, not themes).
const THEME_CHIPS=[["fashion","Fashion & Jewellery"],["architecture","Architecture"],["sculpture","Sculpture"],["animals","Animals"],["nature","Nature"],["photography","Photography"],["dechard","Decorative – Hard"],["decsoft","Decorative – Soft"],["books","Books"],["exthemes","Ex-themes"]];
//@piece THEME_CHIP_OF

const THEME_CHIP_OF=Object.fromEntries(THEMES.map(t=>[t.key,t.chip]));
//@piece themeMatch

// A theme chip set and a labelled show: in when any of its themes is under a picked chip,
// or Ex-themes is picked and it has none. A show never asked about themes is in none.
function themeMatch(r,picked){
  if(!Array.isArray(r.themes))return false;
  if(picked.has("exthemes")&&!r.themes.length)return true;
  return r.themes.some(k=>picked.has(THEME_CHIP_OF[k]));
}
//@piece periodLabelled


const periodLabelled=r=>!!(r&&PERIOD_RANK[r.period]!==undefined&&Number.isInteger(r.periodYear));
//@piece lastLabel

// Label fills a show missing its period or its themes (a show labelled before themes is asked again).
// When a show was last labelled: a Relabel, else its Label run or import (the Recently labelled sort).
const lastLabel=r=>(r&&(r.relabelledAt||r.labelledAt))||"";
//@piece labelDone

const labelDone=r=>periodLabelled(r)&&Array.isArray(r.themes)&&!PERIOD_RETIRED[r.period];
//@piece periodYearText

const periodYearText=y=>"c. "+(y<0?(-y)+" BC":y);
//@piece periodText

const periodText=r=>periodLabelled(r)?[PERIOD_NAME[r.period],periodYearText(r.periodYear),...(r.themes||[]).map(k=>THEME_NAME[k])].join(" · "):"";
//@piece miscFor

// The two stragglers' groups split at 1900 (her cut-off) — decided here, not by Claude.
// Claude's Misc answers stand: the bins show what no rule yet files (her decision).
const miscFor=y=>y<1900?"mischistoric":"miscmodern";
//@piece artistKey


// One artist, one group (her decision): shows about one artist take the group most of
// them were given; a tie goes to the earlier group. A response show keeps its own.
const artistKey=a=>String(a||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z]+/g," ").trim();
//@piece artistPeriods

function artistPeriods(rows){
  const tally=new Map();
  for(const r of rows){
    if(!periodLabelled(r)||r.periodResponse||periodKey(r.period)==="tudor")continue;
    const k=artistKey(r.periodArtist); if(!k)continue;
    const t=tally.get(k)||{}, p=periodKey(r.period); t[p]=(t[p]||0)+1; tally.set(k,t);
  }
  const out=new Map();
  for(const [k,t] of tally)out.set(k,Object.keys(t).sort((a,b)=>(t[b]-t[a])||(PERIOD_RANK[a]-PERIOD_RANK[b]))[0]);
  return out;
}
//@piece periodOf

// An English-years show keeps Tudor / Stuart, whatever the artist's other shows (her decision).
// "Do not regroup" (`periodKeep`) keeps Claude's answer until the next Relabel; the show still
// counts in its artist's tally (docs/periods.md).
const periodOf=(r,byArtist)=>(!r.periodResponse&&!r.periodKeep&&periodKey(r.period)!=="tudor"&&byArtist&&byArtist.get(artistKey(r.periodArtist)))||periodKey(r.period);
//@piece periodCompare

// Period order; within a period, response shows last (her decision), then the year, then
// her venue order (her tie rule).
function periodCompare(a,b,byArtist){
  return (PERIOD_RANK[periodOf(a,byArtist)]-PERIOD_RANK[periodOf(b,byArtist)])||((a.periodResponse?1:0)-(b.periodResponse?1:0))
    ||(a.periodYear-b.periodYear)||(venueRank(a.museumId)-venueRank(b.museumId));
}
//@piece periodPrompt


// One question for up to PERIOD_BATCH shows; each line carries its index i.
function periodPrompt(shows){
  return [
    "You are an art historian. For each exhibition below, name the art period of the art it shows, and one year.",
    "",
    "period: the key of ONE period from this list. The list is in its sorting order, not strict date order:",
    ...PERIODS.map(p=>"  "+p.key+" — "+p.name+" ("+p.span+")"),
    "",
    "Rules:",
    "- Pick by the date and place of the art itself, not the exhibition's theme words.",
    "- Names in a period's description stand for shows about those artists, not for every show that mentions them.",
    "- Italian art of c. 1400–1600 goes in the Italian periods; Netherlandish, German and French art of that time in Northern Renaissance.",
    "- A recent artist responding to older art, or a show pairing artists of different periods: the period of the OLDER art, with its year, and response true.",
    "- A show of art responding to one older source (a text, a myth or a story): the period most of its works come from (its heart), with that period's year, and response true.",
    "- A movement's period only for a show about that movement or its artists. Other 19th-century art: general19.",
    "- A show spanning a long stretch: the period most of its works come from (its heart), with that period's year. Only when the works spread across the centuries with no one period at its heart: surveys, with the midpoint year.",
    "- A show split evenly between two or three neighbouring periods, with no one heart: the EARLIEST of them, with its year (Ingres and Delacroix: neoclassicism) — never a general or miscellaneous group.",
    "- Ancient art from anywhere (Egypt, Greece, Rome, Mesopotamia): antiquity.",
    "- Art from outside the Western tradition that is not ancient (Asian, Islamic, African, Oceanic, Indigenous): nonwestern.",
    "- Fashion, jewellery, decorative arts, design, architecture, photography and books take a period like any other show: the period whose years and place hold the work, even when the show is not about that movement's artists.",
    "- Other 20th-century art, self-taught and folk art included: general20 (to 1980), then contemporary — except European art of c. 1945–1980, which is postwareu.",
    "- Western work that fits none of the periods, not even general19 or general20: mischistoric before 1900, miscmodern from 1900.",
    "- A show about an artist's years in Britain or at the English court (Holbein at the Tudor court, Van Dyck in England): tudor. A general retrospective of such an artist stays in the artist's home period (Holbein: northern; Van Dyck: flemish).",
    "",
    "themes: a list of the keys below for what KIND of thing the show is about — none, one or several. A theme never changes the period.",
    ...THEMES.map(t=>"  "+t.key+" — "+t.rule),
    "- capriccio or veduta (one or both): give it AND architecture (Hubert Robert: capriccio, architecture).",
    "- A decorative-arts show whose description names its kinds gets the theme of each kind named (ceramics and furniture: dechard; furnishings: decsoft).",
    "- Do not label shows by their staging – eg. a sculpture show in a garden is not Nature, a show of paintings among drapery is not Decorative Arts.",
    "- A show of paintings or drawings in general gets no theme unless its subject is one of the above (a show of horse paintings: animals).",
    "",
    "year: one whole number, the year of the art shown (negative for BC). One artist: the middle of the works shown. A show spanning a long stretch: the midpoint of the stretch.",
    "response: true or false, as above.",
    "artist: for a show about ONE artist, their full name as usually written (\"John Singer Sargent\"); otherwise \"\".",
    "why: one short sentence on what in the exhibition's text decided the period and year.",
    "",
    "Answer with JSON only, one entry per exhibition: {\"labels\":[{\"i\":0,\"period\":\"highren\",\"year\":1510,\"response\":false,\"artist\":\"Raphael\",\"themes\":[],\"why\":\"Raphael's works of about 1510.\"}]}",
    "",
    "Exhibitions:",
    ...shows.map(s=>JSON.stringify({i:s.i,venue:s.venue,title:s.title,dates:s.dates,text:String(s.summary||"").replace(/\s+/g," ").slice(0,600)})),
  ].join("\n");
}
//@piece periodAnswers

// Claude's answer, checked: only a listed period and a sensible whole year are kept.
// A label with no themes list is not a label: it is asked again, never taken as "no theme".
// Returns a Map from i to {period, periodYear, periodResponse, periodArtist, themes}.
function periodAnswers(data){
  const out=new Map();
  for(const x of (data&&Array.isArray(data.labels))?data.labels:[]){
    const i=Number(x&&x.i), y=Number(x&&x.year);
    let k=String((x&&x.period)||"").trim().toLowerCase();
    if(!Number.isInteger(i)||PERIOD_RANK[k]===undefined||PERIOD_RETIRED[k]||!Number.isInteger(y)||y<-5000||y>2100||!Array.isArray(x.themes))continue;
    if(k==="mischistoric"||k==="miscmodern")k=miscFor(y);
    const themes=[...new Set(x.themes.map(t=>String(t||"").trim().toLowerCase()).filter(t=>THEME_KEYS.has(t)))];
    // Capriccio and veduta always come with architecture (her decision).
    if((themes.includes("capriccio")||themes.includes("veduta"))&&!themes.includes("architecture"))themes.push("architecture");
    const artist=typeof x.artist==="string"?x.artist.trim().slice(0,120):"";
    out.set(i,{period:k,periodYear:y,periodResponse:x.response===true,periodArtist:artist,themes});
  }
  return out;
}
//@piece LABEL_WAITS

// The page's Claude refuses in spells, so a batch that fails, or comes back with no label,
// is asked again after a wait (her decision: 15 seconds, then a minute), and every batch
// still unlabelled gets one last go after a pause at the end.
const LABEL_WAITS={retry:[15000,60000],lastGo:60000};
//@piece labelWhy

// Label's own words for a failed ask: the lookup's wording speaks of search results.
function labelWhy(ask){
  const code=ask.code||"";
  if(code==="not_granted")return "You declined to let this page use Claude.";
  if(code==="invalid_json")return "Claude\u2019s answer came back unreadable.";
  if(code==="rate_limited")return "Claude is rate-limited.";
  if(code==="unavailable")return ask.detail;
  return "Claude didn\u2019t answer ("+(code||"unknown")+").";
}
//@piece labelPeriods

// Labels shows ({i, venue, title, dates, summary}) in batches. onBatch(done,total) reports
// progress. Returns {labels: Map i → label, batches: [{shows, labelled, tries, why}]}.
async function labelPeriods(shows,onBatch,waits=LABEL_WAITS){
  const labels=new Map(), batches=[];
  const ask=async b=>{
    b.tries++;
    const res=await readResults(periodPrompt(b.batch));
    if(!res.ok){ b.why=labelWhy(res); b.stop=res.code==="not_granted"||res.code==="unavailable"; return; }
    const want=new Set(b.batch.map(s=>s.i));
    for(const [i,v] of periodAnswers(res.data))if(want.has(i)&&!labels.has(i)){ labels.set(i,v); b.labelled++; }
    b.why=b.labelled<b.batch.length?(b.batch.length-b.labelled)+" left out of Claude\u2019s answer":null;
  };
  for(let n=0;n<shows.length;n+=PERIOD_BATCH){
    const b={batch:shows.slice(n,n+PERIOD_BATCH),labelled:0,tries:0,why:null,stop:false};
    await ask(b);
    for(const ms of waits.retry){ if(b.labelled||b.stop)break; await pause(ms); await ask(b); }
    batches.push(b);
    if(onBatch)onBatch(Math.min(n+PERIOD_BATCH,shows.length),shows.length);
  }
  const left=batches.filter(b=>!b.labelled&&!b.stop);
  if(left.length){ await pause(waits.lastGo); for(const b of left)await ask(b); }
  return {labels,batches:batches.map(b=>({shows:b.batch.length,labelled:b.labelled,tries:b.tries,why:b.why}))};
}
//@piece labelSummary

// Her line after a Label: all done, or how many were not and why.
function labelSummary(total,batches){
  const done=batches.reduce((a,b)=>a+b.labelled,0);
  if(done===total)return {ok:true,text:"Label: all "+total+" exhibitions labelled."};
  const whys=[...new Set(batches.filter(b=>b.why).map(b=>b.why.replace(/\.$/,"")))];
  return {ok:false,text:"Label: "+done+" of "+total+" exhibitions labelled; "+(total-done)+" not — "+whys.join("; ")+"."};
}
//@piece periodShow

const periodShow=(i,r)=>({i,venue:(MU[r.museumId]||{}).name||r.museumId,title:r.title,dates:dateRange(r),summary:r.summary});
