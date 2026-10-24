// The Period sort (her trial; docs/periods.md): the period list's order, the tie rule,
// the trial venues, and the check on Claude's answer. Cases PS-001 to PS-006.
const H=require('./harness.js');
let fails=0;
const check=(name,cond,extra)=>{ console.log((cond?'PASS  ':'FAIL  ')+name); if(!cond){fails++; if(extra)console.log('        '+JSON.stringify(extra));} };
const rank=k=>H.PERIOD_RANK[k];

// Her centre-of-gravity rule: Italy, then the North, then France, then America.
check('PS-001 Italy first only where two compete: Early Renaissance, then Northern, then High Renaissance', rank('earlyren')<rank('northern')&&rank('northern')<rank('highren')&&rank('highren')<rank('mannerism'));
check('PS-001 Late Venetian after Rococo; Belle \u00c9poque before Symbolism; General 19th Century last of the 1800s', rank('rococo')+1===rank('latevenetian')&&rank('belleepoque')+1===rank('symbolism')&&rank('symbolism')+1===rank('general19')&&rank('general19')+1===rank('earlymodern'));
check('PS-001 Italian before Flemish before Dutch', rank('baroque')<rank('flemish')&&rank('flemish')<rank('dutch'));
check('PS-001 her reorder: Georgian between Rococo and Neoclassicism; Victorian Britain and 19th-century America after Realism, before Impressionism', rank('latevenetian')+1===rank('georgian')&&rank('georgian')+1===rank('neoclassicism')&&rank('realism')+1===rank('victorian')&&rank('victorian')+1===rank('american19')&&rank('american19')+1===rank('impressionism'));
check('PS-001 her reorder: Postwar Europe after Abstract Expressionism, before Pop; Contemporary last of the periods', rank('abex')+1===rank('postwareu')&&rank('postwareu')+1===rank('pop')&&rank('contemporary')===rank('surveys')-1);
check('PS-001 Antiquity first', rank('antiquity')===0);

// Period, then year, then her venue order (two Monet shows of the same year).
const met={museumId:'met',period:'impressionism',periodYear:1900};
const orsay={museumId:'orsay',period:'impressionism',periodYear:1900};
const metFirst=H.VENUE_ORDER.indexOf('met')<H.VENUE_ORDER.indexOf('orsay');
check('PS-002 a tie goes in her venue order', metFirst===(H.periodCompare(met,orsay)<0)&&H.periodCompare(met,orsay)!==0, {met:H.VENUE_ORDER.indexOf('met'),orsay:H.VENUE_ORDER.indexOf('orsay')});
check('PS-003 the period outranks the year', H.periodCompare({museumId:'met',period:'dutch',periodYear:1610},{museumId:'met',period:'baroque',periodYear:1690})>0);
check('PS-003 the year orders within a period', H.periodCompare({museumId:'met',period:'highren',periodYear:1500},{museumId:'met',period:'highren',periodYear:1520})<0);

// Her seven trial venues.
check('PS-004 the trial venues are her seven', [...H.PERIOD_VENUES].sort().join()===['cincinnati','dellav','met','ng','orsay','tate-modern','va'].sort().join());
check('PS-004 every trial venue exists', [...H.PERIOD_VENUES].every(id=>H.MU[id]));

// Only a listed period and a whole year in range are kept.
const a=H.periodAnswers({labels:[
  {i:0,period:'highren',year:1510},
  {i:1,period:'Impressionism',year:1875},
  {i:2,period:'quattrocento',year:1450},
  {i:3,period:'baroque',year:1650.5},
  {i:4,period:'antiquity',year:-450},
  {i:5,period:'contemporary',year:3000},
]});
check('PS-005 a listed period and whole year are kept', a.get(0)&&a.get(0).period==='highren'&&a.get(0).periodYear===1510);
check('PS-005 the key is read case-blind', a.get(1)&&a.get(1).period==='impressionism');
check('PS-005 an unlisted period, a fraction or a year out of range is dropped', !a.has(2)&&!a.has(3)&&!a.has(5));
check('PS-005 BC years are negative', a.get(4)&&a.get(4).periodYear===-450);
check('PS-005 a reply with no labels gives nothing', H.periodAnswers(null).size===0&&H.periodAnswers({labels:'x'}).size===0);

check('PS-006 the label reads name and year', H.periodText({period:'highren',periodYear:1510})==='High Renaissance · c. 1510');
check('PS-006 BC reads as BC', H.periodText({period:'antiquity',periodYear:-450})==='Antiquity · c. 450 BC');
check('PS-006 no label, no text', H.periodText({})===''&&!H.periodLabelled({period:'highren'}));
check('PS-006 the prompt lists every period Claude may pick, and not the two set by code', H.PERIODS.every(p=>H.periodPrompt([]).includes('  '+p.key+' — ')===!['decorative','architecture'].includes(p.key)));

// v1.1 (her decisions): the four new groups, response shows last, one artist one group.
check('PS-007 the groups after Contemporary, in her order', ['contemporary','surveys','decorative','architecture','mischistoric','miscmodern','nonwestern'].every((k,j,all)=>j===0||rank(all[j-1])+1===rank(k))&&rank('nonwestern')===H.PERIODS.length-1);
check('PS-008 a response show sorts after the rest of its period, whatever its year',
  H.periodCompare({museumId:'ng',period:'highren',periodYear:1450,periodResponse:true},{museumId:'met',period:'highren',periodYear:1520})>0);
check('PS-008 a response show still sorts before the next period',
  H.periodCompare({museumId:'ng',period:'highren',periodYear:1520,periodResponse:true},{museumId:'met',period:'venetian',periodYear:1480})<0);
const b=H.periodAnswers({labels:[{i:0,period:'mischistoric',year:1950},{i:1,period:'miscmodern',year:1850},{i:2,period:'highren',year:1500,response:true,artist:'David Hockney'},{i:3,period:'impressionism',year:1890,artist:' John Singer Sargent '}]});
check('PS-009 code sets the stragglers\' group by the 1900 cut-off', b.get(0).period==='miscmodern'&&b.get(1).period==='mischistoric');
check('PS-009 response and artist are kept', b.get(2).periodResponse===true&&b.get(3).periodResponse===false&&b.get(3).periodArtist==='John Singer Sargent');
const sg=[
  {id:'a',museumId:'met',period:'impressionism',periodYear:1890,periodArtist:'John Singer Sargent'},
  {id:'b',museumId:'met',period:'american19',periodYear:1880,periodArtist:'John Singer Sargent'},
  {id:'c',museumId:'orsay',period:'impressionism',periodYear:1885,periodArtist:'John Singer Sargent'},
  {id:'d',museumId:'ng',period:'highren',periodYear:1500,periodResponse:true,periodArtist:'John Singer Sargent'},
  {id:'e',museumId:'ng',period:'romanticism',periodYear:1830,periodArtist:'J. M. W. Turner'},
  {id:'f',museumId:'ng',period:'georgian',periodYear:1800,periodArtist:'J.M.W. Turner'},
];
const by=H.artistPeriods(sg);
check('PS-010 one artist, one group: the group most of their shows were given', H.periodOf(sg[1],by)==='impressionism'&&H.periodOf(sg[2],by)==='impressionism');
check('PS-010 a response show keeps its own group', H.periodOf(sg[3],by)==='highren');
check('PS-010 a tie goes to the earlier group; names match however dotted', H.periodOf(sg[4],by)==='georgian'&&H.periodOf(sg[5],by)==='georgian');
check('PS-010 a show with no artist keeps its own group', H.periodOf({period:'gothic',periodYear:1325},by)==='gothic');
check('PS-011 her line says when every show was labelled', H.labelSummary(80,[{shows:40,labelled:40},{shows:40,labelled:40}]).ok&&H.labelSummary(80,[{shows:40,labelled:40},{shows:40,labelled:40}]).text==='Label: all 80 exhibitions labelled.');
const ls=H.labelSummary(80,[{shows:40,labelled:40},{shows:40,labelled:0,why:'Claude is rate-limited.'}]);
check('PS-011 her line says how many were not, and why', !ls.ok&&ls.text==='Label: 40 of 80 exhibitions labelled; 40 not — Claude is rate-limited..'.replace('..','.'), ls.text);

// v1.2: decorative arts and architecture leave their period from 1800 (her cut-off), set by code.
const k=H.periodAnswers({labels:[
  {i:0,period:'general19',year:1850,kind:'decorative'},
  {i:1,period:'rococo',year:1750,kind:'decorative'},
  {i:2,period:'general19',year:1870,kind:'architecture'},
  {i:3,period:'antiquity',year:-500,kind:'decorative'},
  {i:4,period:'decorative',year:1900},
  {i:5,period:'nonwestern',year:1850,kind:'decorative'},
]});
check('PS-012 decorative arts from 1800 go to Decorative Arts; architecture to Architecture', k.get(0).period==='decorative'&&k.get(2).period==='architecture');
check('PS-012 before 1800 they stay with their period (Rococo silver, Greek pots)', k.get(1).period==='rococo'&&k.get(3).period==='antiquity');
check('PS-012 Claude cannot pick the two groups itself; non-Western stays non-Western', !k.has(4)&&k.get(5).period==='nonwestern');

console.log(fails?'\n'+fails+' FAILED':'\nall period checks passed');
process.exit(fails?1:0);
