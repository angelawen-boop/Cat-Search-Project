// The Period sort (her trial; docs/periods.md): the period list's order, the tie rule,
// the trial venues, and the check on Claude's answer. Cases PS-001 to PS-006.
const H=require('./harness.js');
let fails=0;
const check=(name,cond,extra)=>{ console.log((cond?'PASS  ':'FAIL  ')+name); if(!cond){fails++; if(extra)console.log('        '+JSON.stringify(extra));} };
const rank=k=>H.PERIOD_RANK[k];

// Her centre-of-gravity rule: Italy, then the North, then France, then America.
check('PS-001 Italian Renaissance before Northern Renaissance', rank('earlyren')<rank('northern')&&rank('highren')<rank('northern')&&rank('mannerism')<rank('northern'));
check('PS-001 Italian before Flemish before Dutch', rank('baroque')<rank('flemish')&&rank('flemish')<rank('dutch'));
check('PS-001 French periods before Britain and 19th-century America', ['classicism','rococo','neoclassicism','impressionism','postimp'].every(k=>rank(k)<rank('victorian')&&rank(k)<rank('american19')));
check('PS-001 America first after the war, Contemporary last', rank('abex')<rank('postwareu')&&rank('pop')<rank('postwareu')&&rank('contemporary')===H.PERIODS.length-1);
check('PS-001 Antiquity first', rank('antiquity')===0);

// Period, then year, then her venue order (two Monet shows of the same year).
const met={museumId:'met',period:'impressionism',periodYear:1900};
const orsay={museumId:'orsay',period:'impressionism',periodYear:1900};
const metFirst=H.VENUE_ORDER.indexOf('met')<H.VENUE_ORDER.indexOf('orsay');
check('PS-002 a tie goes in her venue order', metFirst===(H.periodCompare(met,orsay)<0)&&H.periodCompare(met,orsay)!==0, {met:H.VENUE_ORDER.indexOf('met'),orsay:H.VENUE_ORDER.indexOf('orsay')});
check('PS-003 the period outranks the year', H.periodCompare({museumId:'met',period:'northern',periodYear:1430},{museumId:'met',period:'highren',periodYear:1510})>0);
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
check('PS-006 the prompt lists every period', H.PERIODS.every(p=>H.periodPrompt([]).includes('  '+p.key+' — ')));

console.log(fails?'\n'+fails+' FAILED':'\nall period checks passed');
process.exit(fails?1:0);
