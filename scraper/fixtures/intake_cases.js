const H=require('./harness.js');
const hdr='venue_code,title,start_date,end_date,summary,url,notes\n';
const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
const row=a=>a.map(q).join(',')+'\n';
let fails=0;
const check=(name,cond,extra)=>{ console.log((cond?'PASS  ':'FAIL  ')+name); if(!cond){fails++; if(extra)console.log('        '+JSON.stringify(extra));} };

// 1. marker row
H.setRows([]);
let r=H.analyzeProForma(hdr+row(['louvre','[past page]','','','','https://louvre.fr/past','The venue refused us. Marker row, not an exhibition.']));
check('marker -> coverage, no proposal', r.props.length===0 && r.coverage.length===1, r);

// 2. complementary gaps, same URL
r=H.analyzeProForma(hdr
 +row(['louvre','Mamluks','2025-01-01','','','https://louvre.fr/a',''])
 +row(['louvre','Mamluks','','2025-05-01','Cairo under the Mamluks.','https://louvre.fr/a','']));
check('same URL, gaps filled -> one Add', r.props.length===1 && r.props[0].cand.startDate==='2025-01-01' && r.props[0].cand.endDate==='2025-05-01' && r.props[0].cand.summary==='Cairo under the Mamluks.', r.props);
check('  no conflict offered', !r.props[0].choices);

// 3. genuine disagreement -> choice, fuller picked
r=H.analyzeProForma(hdr
 +row(['louvre','Mamluks','2025-01-01','2025-05-01','Short one.','https://louvre.fr/a',''])
 +row(['louvre','Mamluks','2025-01-01','2025-05-01','A considerably longer description of the show.','https://louvre.fr/a','']));
check('disagreement -> one card with a choice', r.props.length===1 && !!r.props[0].choices, r.props);
check('  fuller pre-picked, both kept', r.props[0].choices[0].picked==='A considerably longer description of the show.' && r.props[0].choices[0].options.length===2, r.props[0].choices);

// 4. no URL, same title -> NOT merged
r=H.analyzeProForma(hdr
 +row(['louvre','Mamluks','2025-01-01','2025-05-01','One.','',''])
 +row(['louvre','Mamluks','2025-01-01','2025-05-01','Two.','','']));
check('no URL -> two separate cards', r.props.length===2, r.props.map(p=>p.type));

// 5. bad venue / bad date
r=H.analyzeProForma(hdr
 +row(['nosuch','X','','','','','' ])
 +row(['louvre','Y','not-a-date','','','https://louvre.fr/y','']));
check('unknown venue -> problem card', r.props.filter(p=>p.type==='problem').length===1, r.props);
check('bad date noted, not absorbed', r.props.some(p=>p.notes&&p.notes.some(n=>n.includes("couldn't be read"))), r.props);

// 6. case-only URL difference must NOT merge (path is case-sensitive)
r=H.analyzeProForma(hdr
 +row(['louvre','A','','','','https://louvre.fr/Show',''])
 +row(['louvre','B','','','','https://louvre.fr/show','']));
check('paths differing by case stay separate', r.props.length===2, r.props.map(p=>p.title));

// 7. host case + trailing slash SHOULD merge
r=H.analyzeProForma(hdr
 +row(['louvre','A','2025-01-01','','','https://LOUVRE.fr/show/',''])
 +row(['louvre','A','','2025-02-01','','https://louvre.fr/show','']));
check('host case and trailing slash merge', r.props.length===1, r.props.map(p=>p.title));


// 8. the pick she makes is what gets written
const c={museumId:'louvre',title:'A',startDate:null,endDate:null,summary:'Short one.',exUrl:'u'};
const applied=H.withChoices(c,{choices:{summary:'Short one.'}});
check('choosing the shorter value overrides the pre-pick', applied.summary==='Short one.', applied);
const untouched=H.withChoices(c,{});
check('no choice made -> card value stands', untouched.summary==='Short one.', untouched);

// 9. three-way: marker + real + real-with-gap, one venue
H.setRows([]);
let r9=H.analyzeProForma(hdr
 +row(['met','[past page]','','','','https://metmuseum.org/past','Refused. Marker row, not an exhibition.'])
 +row(['met','Siena','2025-03-01','','','https://metmuseum.org/siena',''])
 +row(['met','Siena','','2025-06-01','Sienese painting, 1300-1350.','https://metmuseum.org/siena','']));
check('marker ignored, two rows folded', r9.props.length===1 && r9.coverage.length===1 && r9.props[0].cand.summary==='Sienese painting, 1300-1350.', {p:r9.props.length,c:r9.coverage.length});
check('  fold is disclosed in the notes', r9.props[0].notes.some(n=>n.includes('same exhibition')), r9.props[0].notes);

process.exit(fails?1:0);
