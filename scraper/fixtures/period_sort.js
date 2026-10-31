// The Period sort (her trial; docs/periods.md): the period list's order, the tie rule,
// the trial venues, the check on Claude's answer, themes and Label's retries. Cases PS-001 to PS-018.
const H=require('./harness.js');
let fails=0;
const check=(name,cond,extra)=>{ console.log((cond?'PASS  ':'FAIL  ')+name); if(!cond){fails++; if(extra)console.log('        '+JSON.stringify(extra));} };
const rank=k=>H.PERIOD_RANK[k];

// Her centre-of-gravity rule: Italy, then the North, then France, then America.
check('PS-001 Italy first only where two compete: Early Renaissance, then Northern, then High Renaissance', rank('earlyren')<rank('northern')&&rank('northern')<rank('highren')&&rank('highren')<rank('mannerism'));
check('PS-001 Late Venetian after Rococo; Belle \u00c9poque before Symbolism; General 19th Century last of the 1800s', rank('rococo')+1===rank('latevenetian')&&rank('belleepoque')+1===rank('symbolism')&&rank('american19')+1===rank('general19')&&rank('general19')+1===rank('earlymodern'));
check('PS-001 Italian before Flemish before Dutch', rank('baroque')<rank('flemish')&&rank('flemish')<rank('dutch'));
check('PS-001 her reorder: Georgian between Late Venetian and Neoclassicism; Victorian Britain and 19th-century America stay after Symbolism', rank('latevenetian')+1===rank('georgian')&&rank('georgian')+1===rank('neoclassicism')&&rank('symbolism')+1===rank('victorian')&&rank('victorian')+1===rank('american19')&&rank('american19')+1===rank('general19'));
check('PS-001 French periods before Britain and 19th-century America', ['classicism','rococo','neoclassicism','impressionism','postimp'].every(k=>rank(k)<rank('victorian')&&rank(k)<rank('american19')));
check('PS-001 her reorder: Postwar Europe after Abstract Expressionism, then Postwar America, then Pop; Contemporary last of the periods', rank('abex')+1===rank('postwareu')&&rank('postwareu')+1===rank('postwaram')&&rank('postwaram')+1===rank('pop')&&rank('contemporary')===rank('surveys')-1);
check('PS-001 Antiquity first', rank('antiquity')===0);

// Period, then year, then her venue order (two Monet shows of the same year).
const met={museumId:'met',period:'impressionism',periodYear:1900};
const orsay={museumId:'orsay',period:'impressionism',periodYear:1900};
const metFirst=H.VENUE_ORDER.indexOf('met')<H.VENUE_ORDER.indexOf('orsay');
check('PS-002 a tie goes in her venue order', metFirst===(H.periodCompare(met,orsay)<0)&&H.periodCompare(met,orsay)!==0, {met:H.VENUE_ORDER.indexOf('met'),orsay:H.VENUE_ORDER.indexOf('orsay')});
check('PS-003 the period outranks the year', H.periodCompare({museumId:'met',period:'dutch',periodYear:1610},{museumId:'met',period:'baroque',periodYear:1690})>0);
check('PS-003 the year orders within a period', H.periodCompare({museumId:'met',period:'highren',periodYear:1500},{museumId:'met',period:'highren',periodYear:1520})<0);


// Only a listed period and a whole year in range are kept.
const a=H.periodAnswers({labels:[
  {i:0,period:'highren',year:1510,themes:[]},
  {i:1,period:'Impressionism',year:1875,themes:[]},
  {i:2,period:'quattrocento',year:1450,themes:[]},
  {i:3,period:'baroque',year:1650.5,themes:[]},
  {i:4,period:'antiquity',year:-450,themes:[]},
  {i:5,period:'contemporary',year:3000,themes:[]},
]});
check('PS-005 a listed period and whole year are kept', a.get(0)&&a.get(0).period==='highren'&&a.get(0).periodYear===1510);
check('PS-005 the key is read case-blind', a.get(1)&&a.get(1).period==='impressionism');
check('PS-005 an unlisted period, a fraction or a year out of range is dropped', !a.has(2)&&!a.has(3)&&!a.has(5));
check('PS-005 BC years are negative', a.get(4)&&a.get(4).periodYear===-450);
check('PS-005 a reply with no labels gives nothing', H.periodAnswers(null).size===0&&H.periodAnswers({labels:'x'}).size===0);

check('PS-006 the label reads name and year', H.periodText({period:'highren',periodYear:1510})==='High Renaissance · c. 1510');
check('PS-006 BC reads as BC', H.periodText({period:'antiquity',periodYear:-450})==='Antiquity · c. 450 BC');
check('PS-006 no label, no text', H.periodText({})===''&&!H.periodLabelled({period:'highren'}));
check('PS-006 the prompt lists every period and every theme', H.PERIODS.every(p=>H.periodPrompt([]).includes('  '+p.key+' — '))&&H.THEMES.every(t=>H.periodPrompt([]).includes('  '+t.key+' — '+t.rule)));

// v1.1 (her decisions): the four new groups, response shows last, one artist one group.
check('PS-007 the groups after Contemporary, in her order; no theme is a group', ['contemporary','surveys','mischistoric','miscmodern','nonwestern'].every((k,j,all)=>j===0||rank(all[j-1])+1===rank(k))&&rank('nonwestern')===H.PERIODS.length-1);
check('PS-008 a response show sorts after the rest of its period, whatever its year',
  H.periodCompare({museumId:'ng',period:'highren',periodYear:1450,periodResponse:true},{museumId:'met',period:'highren',periodYear:1520})>0);
check('PS-008 a response show still sorts before the next period',
  H.periodCompare({museumId:'ng',period:'highren',periodYear:1520,periodResponse:true},{museumId:'met',period:'venetian',periodYear:1480})<0);
const b=H.periodAnswers({labels:[{i:0,period:'mischistoric',year:1950,themes:[]},{i:1,period:'miscmodern',year:1850,themes:[]},{i:2,period:'highren',year:1500,response:true,artist:'David Hockney',themes:[]},{i:3,period:'impressionism',year:1890,artist:' John Singer Sargent ',themes:[]}]});
check('PS-009 code sets the stragglers\' group by the 1900 cut-off; Claude\'s Misc answers stay in the bins', b.get(0).period==='miscmodern'&&b.get(1).period==='mischistoric');
const PR=H.periodPrompt([]);
check('PS-021 no kind of show is named as Misc; a split show with no heart goes to the earliest; Postwar Europe is Europe only',
  !/folk art, say/.test(PR)&&PR.includes('not even general19 or general20')&&PR.includes('the EARLIEST of them')&&PR.includes('postwareu — Postwar Europe (Postwar Europe is a time-and-place period, not a movement: art made in Europe from c. 1945 to 1980'));
check('PS-020 Tudor / Stuart Britain straight after Northern Renaissance; General 20th Century after Pop, before Contemporary', rank('northern')+1===rank('tudor')&&rank('pop')+1===rank('general20')&&rank('general20')+1===rank('contemporary'));
check('PS-020 Georgian Britain starts at 1714, where Tudor / Stuart ends', /^c\. 1714/.test(H.PERIODS.find(p=>p.key==='georgian').span)&&/1714/.test(H.PERIODS.find(p=>p.key==='tudor').span));
const vd=[{period:'flemish',periodYear:1630,periodArtist:'Anthony van Dyck'},{period:'flemish',periodYear:1625,periodArtist:'Anthony van Dyck'},{period:'tudor',periodYear:1637,periodArtist:'Anthony van Dyck'}];
const vdBy=H.artistPeriods(vd);
check('PS-020 Van Dyck in England keeps Tudor / Stuart; his retrospectives stay Flemish Baroque', H.periodOf(vd[2],vdBy)==='tudor'&&H.periodOf(vd[0],vdBy)==='flemish');
const ch=[{period:'earlymodern',periodYear:1912,periodArtist:'Marc Chagall'},{period:'earlymodern',periodYear:1914,periodArtist:'Marc Chagall'},{period:'postwareu',periodYear:1958,periodArtist:'Marc Chagall',periodKeep:true},{period:'postwareu',periodYear:1960,periodArtist:'Marc Chagall'}];
const chBy=H.artistPeriods(ch);
check('PS-026 Do not regroup keeps Claude\'s answer (Chagall, Postwar Europe); his other straggler is still regrouped', H.periodOf(ch[2],chBy)==='postwareu'&&H.periodOf(ch[3],chBy)==='earlymodern');
check('PS-026 a kept show still counts in its artist\'s tally', H.artistPeriods([...ch,{period:'postwareu',periodYear:1962,periodArtist:'Marc Chagall'}]).get('marc chagall')==='postwareu');
check('PS-027 Postwar Europe is a time-and-place period, not a movement; the general20 catch-all leaves European art of 1945–1980 to it (Pompidou Chagall 1945–1970)', H.periodPrompt([]).includes('postwareu — Postwar Europe (Postwar Europe is a time-and-place period, not a movement: art made in Europe from c. 1945 to 1980, whatever its style or movement.')&&H.periodPrompt([]).includes('general20 (to 1980), then contemporary — except European art of c. 1945–1980, which is postwareu.'));
check('PS-023 Books takes albums of drawings (Vasari\'s Book of Drawings)', H.periodPrompt([]).includes('albums: a collector\'s book of drawings or prints'));
check('PS-024 a show responding to one older source takes the period where most of its works sit (Rijksmuseum Metamorphoses)', H.periodPrompt([]).includes("- A show of art responding to one older source (a text, a myth or a story): the period most of its works come from (its heart), with that period's year, and response true."));
check('PS-025 Claude gives its reason with each label, kept only in the lookup log', H.periodPrompt([]).includes('why: one short sentence on what in the exhibition') && H.periodPrompt([]).includes('"why":') && !('why' in H.periodAnswers({labels:[{i:0,period:'baroque',year:1620,themes:[],why:'Bernini.'}]}).get(0)));
check('PS-022 the staging line, her wording', H.periodPrompt([]).includes('Do not label shows by their staging – eg. a sculpture show in a garden is not Nature, a show of paintings among drapery is not Decorative Arts.'));
check('PS-020 the prompt sends English-years shows to tudor and keeps Nature out of garden settings', H.periodPrompt([]).includes('Van Dyck in England): tudor')&&H.periodPrompt([]).includes('displayed outdoors or in a garden'));
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

// Themes (her design): labels, any number per show, never a group; the period stays.
const k=H.periodAnswers({labels:[
  {i:0,period:'general19',year:1850,themes:['dechard','DecSoft']},
  {i:1,period:'rococo',year:1750,themes:['fashion','fashion','jewellery']},
  {i:2,period:'general19',year:1870,themes:['interior','architecture']},
  {i:3,period:'decorative',year:1900,themes:[]},
  {i:4,period:'antiquity',year:-500},
  {i:5,period:'nonwestern',year:1850,themes:['sculpture']},
]});
check('PS-012 a themed show keeps its period; its themes are kept, read case-blind, once each', k.get(0).period==='general19'&&k.get(0).themes.join()==='dechard,decsoft'&&k.get(1).themes.join()==='fashion,jewellery');
check('PS-012 an unlisted theme is dropped (Interior is gone); the old groups cannot be picked', k.get(2).themes.join()==='architecture'&&!k.has(3));
check('PS-012 an answer with no themes list is not a label', !k.has(4)&&k.get(5).period==='nonwestern');
const pk=(...c)=>new Set(c);
check('PS-013 Fashion and Jewellery are two labels under one chip', H.themeMatch({themes:['jewellery']},pk('fashion'))&&H.themeMatch({themes:['fashion']},pk('fashion')));
check('PS-013 a show with two themes is under both chips', H.themeMatch({themes:['dechard','decsoft']},pk('dechard'))&&H.themeMatch({themes:['dechard','decsoft']},pk('decsoft')));
check('PS-013 Ex-themes: every show with no theme, Surveys and Non-Western Art included', H.themeMatch({period:'surveys',themes:[]},pk('exthemes'))&&H.themeMatch({period:'nonwestern',themes:[]},pk('exthemes'))&&!H.themeMatch({themes:['books']},pk('exthemes')));
check('PS-013 a show never asked about themes is under no chip, Ex-themes included', !H.themeMatch({period:'gothic'},pk('exthemes'))&&!H.themeMatch({},pk('books')));
check('PS-013 every theme has a chip', H.THEMES.every(t=>H.THEME_CHIPS.some(([c])=>c===t.chip)));
const cv=H.periodAnswers({labels:[{i:0,period:'rococo',year:1780,themes:['capriccio']},{i:1,period:'latevenetian',year:1740,themes:['veduta','capriccio','architecture']}]});
check('PS-019 Hubert Robert: capriccio brings architecture with it, once (her decision)', cv.get(0).themes.join()==='capriccio,architecture'&&cv.get(1).themes.join()==='veduta,capriccio,architecture');
check('PS-019 capriccio and veduta file under the Architecture chip', H.themeMatch({themes:['capriccio']},pk('architecture'))&&H.themeMatch({themes:['veduta']},pk('architecture'))&&H.periodPrompt([]).includes('AND architecture'));
check('PS-014 the label reads its themes after the year', H.periodText({period:'rococo',periodYear:1750,themes:['dechard','books']})==='Rococo · c. 1750 · Decorative Arts – Hard · Books');
check('PS-014 a show labelled before themes is asked again', !H.labelDone({period:'rococo',periodYear:1750})&&H.labelDone({period:'rococo',periodYear:1750,themes:[]}));
check('PS-015 her waits: 15 seconds, then a minute; a minute before the last go', H.LABEL_WAITS.retry.join()==='15000,60000'&&H.LABEL_WAITS.lastGo===60000);
check('PS-016 Label\'s own words: Claude didn\u2019t answer, with the code', H.labelWhy({code:'upstream_error'})==='Claude didn\u2019t answer (upstream_error).');
check('PS-016 unreadable and declined, without telling her what to do', H.labelWhy({code:'invalid_json'})==='Claude\u2019s answer came back unreadable.'&&H.labelWhy({code:'not_granted'})==='You declined to let this page use Claude.');
check('PS-016 never the lookup\'s "search results"', !/search results/.test(['upstream_error','invalid_json','not_granted','rate_limited',''].map(c=>H.labelWhy({code:c})).join()));

// Surrealism / Dada has its own group (her decision); Interwar Modernism keeps every other style of those years.
const P=k=>H.PERIODS.find(p=>p.key===k);
check('PS-017 Surrealism / Dada, her name, right after Early Modernism and before Interwar Modernism', P('surrealism')&&P('surrealism').name==='Surrealism / Dada'&&rank('earlymodern')+1===rank('surrealism')&&rank('surrealism')+1===rank('interwarmod'));
check('PS-017 Interwar Modernism no longer names Surrealism or Dada as its own', !/Surrealism,|Dada,|\(Surrealism/.test(P('interwarmod').span)&&/but Surrealism and Dada/.test(P('interwarmod').span));
const old={museumId:'met',period:'interwar',periodYear:1925,themes:[]};
check('PS-018 a show labelled Interwar before the split stays under Interwar Modernism until asked again', H.periodLabelled(old)&&H.periodOf(old)==='interwarmod'&&H.periodText(old).startsWith('Interwar Modernism'));
check('PS-018 Label asks it again', !H.labelDone(old)&&H.labelDone({...old,period:'interwarmod'})&&H.labelDone({...old,period:'surrealism'}));
check('PS-018 the old key is never taken from Claude (it would be asked forever)', !H.periodAnswers({labels:[{i:0,period:'interwar',year:1925,themes:[]}]}).has(0));
check('PS-018 the old key sorts with Interwar Modernism', H.periodCompare(old,{museumId:'met',period:'interwarmod',periodYear:1930})<0&&H.periodCompare(old,{museumId:'met',period:'surrealism',periodYear:1930})>0);

console.log(fails?'\n'+fails+' FAILED':'\nall period checks passed');
process.exit(fails?1:0);
