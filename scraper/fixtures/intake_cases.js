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

// ── 10. QUARANTINE — "this should never have been an entry" ─────────────────
// The third outcome. Reject remembers nothing and the row returns on every
// future sweep; accept-then-dismiss puts junk in the ledger permanently.
H.setRows([]);
const junk=hdr+row(['louvre','Curator\u2019s tour','2025-01-01','2025-02-01','A tour.','https://louvre.fr/tour','']);
let r10=H.analyzeProForma(junk);
check('not quarantined -> an ordinary Add', r10.props.length===1 && r10.tally.blocked===0, r10.tally);
const k10=H.ignoreKeyFor('louvre','https://louvre.fr/tour','Curator\u2019s tour');
r10=H.analyzeProForma(junk,new Set([k10]));
check('quarantined -> no card at all', r10.props.length===0, r10.props);
check('  and it is COUNTED, never silent', r10.tally.blocked===1, r10.tally);

// 11. the key is the URL where there is one, so a retitled row stays blocked.
// A venue rewording its own listing must not undo her decision.
r10=H.analyzeProForma(
  hdr+row(['louvre','Curator tour (rescheduled)','2025-01-01','2025-02-01','A tour.','https://louvre.fr/tour','']),
  new Set([k10]));
check('same URL, new title -> still blocked', r10.props.length===0, r10.props);

// 12. no URL falls back to venue + title, and does NOT block another venue.
H.setRows([]);
const kNoUrl=H.ignoreKeyFor('louvre','','Some Junk');
let r12=H.analyzeProForma(
  hdr+row(['louvre','Some Junk','','','','',''])
     +row(['ng','Some Junk','','','','','']),
  new Set([kNoUrl]));
check('no-URL quarantine blocks its own venue only', r12.props.length===1 && r12.props[0].venueId==='ng', r12.props.map(p=>p.venueId));

// 13. quarantine is keyed on the row, not on the ledger: an entry she already
// tracks is untouched by it. Blocking is about what gets OFFERED.
H.setRows([{id:'x',museumId:'louvre',title:'Curator\u2019s tour',startDate:'2025-01-01',endDate:'2025-02-01',summary:'A tour.',exUrl:'https://louvre.fr/tour',interested:true}]);
r10=H.analyzeProForma(junk,new Set([k10]));
check('a quarantined row proposes nothing even when the ledger has it', r10.props.length===0, r10.props);

// ── 14. THE ROW IDENTITY. Every row read leaves by exactly one route, so this
// either closes or something was lost. It is the only check on the card total.
H.setRows([]);
const mixed=hdr
 +row(['louvre','[past page]','','','','https://louvre.fr/past','Refused. Marker row, not an exhibition.'])
 +row(['louvre','A','2025-01-01','','','https://louvre.fr/a',''])
 +row(['louvre','A','','2025-02-01','Blurb.','https://louvre.fr/a',''])
 +row(['louvre','B','2025-03-01','2025-04-01','Another.','https://louvre.fr/b',''])
 +row(['louvre','Junk','','','','https://louvre.fr/junk','']);
const t=H.analyzeProForma(mixed,new Set([H.ignoreKeyFor('louvre','https://louvre.fr/junk','Junk')])).tally;
const cards=t.add+t.fill+t.change+t.unusable;
check('file rows = markers + never-add + folds + already-matching + cards',
      t.fileRows===t.markers+t.blocked+t.folded+t.silent+cards,
      {...t,cards});

// 15. FRESHNESS IS TWO FACTS. A venue that answered with nothing but a marker
// row was reached and refused, which is not the same as never being tried.
H.setRows([]);
const seenFile=hdr
 +row(['moma','[past page]','','','','https://moma.org/past','Refused. Marker row, not an exhibition.'])
 +row(['louvre','A','2025-01-01','2025-02-01','Blurb.','https://louvre.fr/a','']);
const seen=H.analyzeProForma(seenFile).seen;
check('a refused venue counts as ATTEMPTED', seen.attempted.includes('moma'), seen);
check('  but NOT as having returned rows', !seen.returned.includes('moma'), seen);
check('a venue with real rows counts as both', seen.attempted.includes('louvre')&&seen.returned.includes('louvre'), seen);
check('a venue not in the file is in neither', !seen.attempted.includes('met')&&!seen.returned.includes('met'), seen);

// 16. A TRAVELLING SHOW IS NOT A FOLD. The sweeper notes a show running at a
// venue's other address with the sentence "The same exhibition is also shown
// at Palm Beach." The triage screen used to decide "was this combined?" by
// searching the notes for the words "same exhibition", so Acquavella's two
// runs of Portraiture — two real shows at two addresses, nothing combined —
// were filed under "combined for you, nothing to decide". The heading then
// told her something untrue about the cards beneath it.
H.setRows([]);
const trav=H.analyzeProForma(hdr
 +row(['acq','PORTRAITURE NEW YORK','2025-01-21','2025-04-04','New York.','https://acquavellagalleries.com/exhibitions/portraiture-ny','The same exhibition is also shown at Palm Beach.'])
 +row(['acq','PORTRAITURE PALM BEACH','2024-11-22','2025-01-05','Palm Beach.','https://acquavellagalleries.com/exhibitions/portraiture','The same exhibition is also shown at New York.']));
check('travelling runs stay two cards', trav.props.length===2, trav.props.map(p=>p.title));
check('  neither is flagged as combined', trav.props.every(p=>!p.merged), trav.props.map(p=>p.merged));
check('  and the note still reaches her card', trav.props.every(p=>p.notes.some(n=>n.includes('also shown at'))), trav.props.map(p=>p.notes));

// A genuine fold still sets the flag, so the band is not simply empty now.
H.setRows([]);
const realFold=H.analyzeProForma(hdr
 +row(['acq','X','2025-01-01','','','https://acquavellagalleries.com/x',''])
 +row(['acq','X','','2025-02-01','Blurb.','https://acquavellagalleries.com/x','']));
check('a real fold is still flagged as combined', realFold.props.length===1 && realFold.props[0].merged===true, realFold.props);

process.exit(fails?1:0);
