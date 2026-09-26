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

// 5. A FAULTY ROW REFUSES THE WHOLE FILE — her ruling 20 Sep. No title and no
// venue code are data faults, not triage: the only outcome was ever "re-run the
// sweep", which is a message to the session. The file is refused, the LINE
// NUMBERS are named, and she is told there is nothing here for her to fix.
// A bad DATE is not in that class: the row is still an exhibition, so it is
// blanked and noted on the card, exactly as before.
r=H.analyzeProForma(hdr
 +row(['nosuch','X','','','','',''])
 +row(['louvre','Y','2025-01-01','','','https://louvre.fr/y','']));
check('unknown venue -> whole file refused', !!r.error && !r.props, r);
check('  the refusal names the line', !!r.error && r.error.includes('line 2'), r.error);
check('  and tells her it is not hers to fix', !!r.error && /give these line numbers back to Claude/.test(r.error), r.error);

r=H.analyzeProForma(hdr+row(['louvre','','','','','https://louvre.fr/z','']));
check('no title -> whole file refused', !!r.error && r.error.includes('no exhibition title'), r.error);

r=H.analyzeProForma(hdr+row(['louvre','Y','not-a-date','','','https://louvre.fr/y','']));
check('a bad DATE is still an ordinary card', r.props.length===1 && r.props[0].type==='add', r.props);
check('  blanked and noted, not absorbed', r.props[0].notes.some(n=>n.includes("couldn't be read")), r.props[0].notes);

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
const cards=t.add+t.fill+t.change;   // no 'unusable' term: a faulty row refuses the file (case 5)
check('file rows = markers + never-add + folds + already-matching + cards',
      t.fileRows===t.markers+t.blocked+t.folded+t.silent+cards,
      {...t,cards});

// 15. FRESHNESS IS TWO FACTS. A venue that answered with nothing but a marker
// row was reached and refused, which is not the same as never being tried.
//
// AND EACH FACT NOW CARRIES A DATE, read from the file's swept_at column
// (20 Sep). These used to be sets of venue codes and applyRefresh stamped
// "now" against them — so the drawer dated every venue by the moment she
// pressed Import and called it "tried". A venue's entry is the LATEST sweep
// time seen for it in the file.
H.setRows([]);
const hdr8=hdr.trim()+',swept_at\n';
const row8=a=>row(a).trim()+','+a[7]+'\n';
const seenFile=hdr8
 +row8(['moma','[past page]','','','','https://moma.org/past','Refused. Marker row, not an exhibition.','2026-09-13T04:29:05.306Z'])
 +row8(['louvre','A','2025-01-01','2025-02-01','Blurb.','https://louvre.fr/a','','2026-09-13T04:30:10.364Z']);
const seen=H.analyzeProForma(seenFile).seen;
check('a refused venue counts as ATTEMPTED', !!seen.attempted.moma, seen);
check('  but NOT as having returned rows', !seen.returned.moma, seen);
check('a venue with real rows counts as both', !!seen.attempted.louvre&&!!seen.returned.louvre, seen);
check('a venue not in the file is in neither', !seen.attempted.met&&!seen.returned.met, seen);
check('  and it is dated by the SWEEP, not by now',
  seen.attempted.louvre==='2026-09-13T04:30:10.364Z', seen);

// 15a. A VENUE SWEPT TWICE — her question, and the case the drawer exists for.
// The later run got only markers, so it was TRIED later than it last BROUGHT
// ROWS. That gap is the line that says re-run this one on its own.
H.setRows([]);
const twice=hdr8
 +row8(['borghese','Real show','2026-01-01','2026-02-01','Blurb.','https://borghese.it/a','','2026-09-13T02:04:08.334Z'])
 +row8(['borghese','[upcoming page]','','','','https://borghese.it/up','Empty. Marker row, not an exhibition.','2026-09-13T14:26:00.000Z']);
const tw=H.analyzeProForma(twice).seen;
check('15a: swept twice — tried takes the LATER run',
  tw.attempted.borghese==='2026-09-13T14:26:00.000Z', tw);
check('  and rows stays at the run that actually had them',
  tw.returned.borghese==='2026-09-13T02:04:08.334Z', tw);

// 15b. AN OLD FILE MUST NOT DRAG THE LOG BACKWARDS. Importing a two-day-old
// sweep is the same shape as opening a two-day-old backup — the bug she found.
// mergeSweepLog only ever moves a date forwards.
{
  const prev={met:{attempted:'2026-09-20T00:00:00.000Z',returned:'2026-09-20T00:00:00.000Z'}};
  const old={attempted:{met:'2026-09-13T00:00:00.000Z'},returned:{met:'2026-09-13T00:00:00.000Z'}};
  const after=H.mergeSweepLog(prev,old);
  check('15b: importing an older sweep leaves the log alone',
    after.met.attempted==='2026-09-20T00:00:00.000Z'&&after.met.returned==='2026-09-20T00:00:00.000Z', after);
  const newer={attempted:{met:'2026-09-21T00:00:00.000Z'},returned:{}};
  const after2=H.mergeSweepLog(prev,newer);
  check('  a newer sweep moves TRIED forward',
    after2.met.attempted==='2026-09-21T00:00:00.000Z', after2);
  check('  and leaves ROWS where it was when the venue gave nothing',
    after2.met.returned==='2026-09-20T00:00:00.000Z', after2);
  const fresh=H.mergeSweepLog({},{attempted:{ng:'2026-09-21T00:00:00.000Z'},returned:{}});
  check('  a venue never seen before is added with no rows date',
    fresh.ng.attempted==='2026-09-21T00:00:00.000Z'&&!fresh.ng.returned, fresh);
}

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

// 17. A CONFLICT IS ALWAYS A FOLD. There used to be a band for "a disagreement
// that did not come from combining two rows", and it was a phantom: it never
// held a row in its life, because a disagreement is only ever found by holding
// two rows side by side. It shipped, the guide listed it as one of six bands,
// and nobody ran a file and asked why it was always empty.
H.setRows([]);
const everyConflict=H.analyzeProForma(require('fs').readFileSync(__dirname+'/intake_sample.csv','utf8'))
  .props.filter(p=>p.choices);
check('the sample file produces conflicts at all', everyConflict.length>0, everyConflict.length);
check('  and EVERY one of them came from a fold', everyConflict.every(p=>p.merged), everyConflict.map(p=>p.title));

// ── 18. THE GATE ON THE LEDGER — her ruling, 20 Sep ─────────────────────────
//
// applyRefresh used to SKIP an undecided card: not applied, and not remembered
// either, so it came back on the next sweep with nothing on screen to say it
// had been passed over. With 320 cards that is a whole session's reading gone
// on one tap — and she had believed the guard was already there. Her call was
// a block rather than a warning: "otherwise I envision total chaos if I can
// skip. this is SLOW mode at the moment."
//
// The button is disabled while undecidedCount > 0, so THIS COUNT IS THE GATE.
// The half that would break it quietly is the second one: REJECTING IS
// DECIDING. If a rejected card counted as undecided, the button would be
// unreachable for anyone who turns anything down — most of a real sweep — and
// it would look like a stuck button rather than a counting bug.

const cd=(props,dec)=>H.countDecisions(props,dec);

let g=cd([{type:'add'},{type:'change',upd:[{field:'endDate'}]}],{});
check('18: a card she has not touched is undecided', g.undecidedCount===2&&g.acceptedCount===0, g);

g=cd([{type:'add'}],{0:{mode:'reject'}});
check('18a: rejecting an Add is deciding, and is not "to apply"', g.undecidedCount===0&&g.acceptedCount===0, g);

g=cd([{type:'add'}],{0:{mode:'never'}});
check('18b: quarantining an Add is deciding too', g.undecidedCount===0, g);

g=cd([{type:'change',upd:[{field:'endDate'},{field:'summary'}]}],{0:{fields:{0:'reject',1:'reject'}}});
check('18c: rejecting EVERY field of an edit is deciding', g.undecidedCount===0&&g.acceptedCount===0, g);

g=cd([{type:'change',upd:[{field:'endDate'},{field:'summary'}]}],{0:{fields:{0:'accept'}}});
check('18d: accepting one field of an edit decides the card', g.undecidedCount===0&&g.acceptedCount===1, g);

g=cd([{type:'fill',upd:[{field:'endDate'}]}],{0:{mode:'addnew'}});
check('18e: "this is a different show" decides the card', g.undecidedCount===0&&g.acceptedCount===1, g);

// The gate has to hold on the pile she actually faces, not only on hand-built
// cards.
H.setRows([]);
const gateFile=H.analyzeProForma(require('fs').readFileSync(__dirname+'/intake_sample.csv','utf8'));
g=cd(gateFile.props,{});
check('18f: the real sample file starts with every card undecided',
  !gateFile.error&&gateFile.props.length>0&&g.undecidedCount===gateFile.props.length,
  {rows:gateFile.props&&gateFile.props.length,undecided:g.undecidedCount});

// 18g. THE GATE AND THE JUMP MUST AGREE. The footer refuses to fire while
// undecidedCount > 0; the "n undecided" button finds the FIRST card
// isUndecidedCard says is untouched and scrolls to it. If those two ever
// disagree the app is a dead end: a button that will not fire, and a jump that
// insists there is nothing left to do. They were briefly two copies of one
// rule, which is how every such pair starts. Now countDecisions calls
// isUndecidedCard, and this asserts the arithmetic across every decision shape.
{
  const props=[
    {type:'add'},                                             // untouched
    {type:'add'},                                             // accepted
    {type:'add'},                                             // rejected
    {type:'add'},                                             // quarantined
    {type:'change',upd:[{field:'a'},{field:'b'}]},            // untouched
    {type:'change',upd:[{field:'a'},{field:'b'}]},            // one field taken
    {type:'change',upd:[{field:'a'},{field:'b'}]},            // both refused
    {type:'fill',upd:[{field:'a'}]},                          // "different show"
  ];
  const dec={1:{mode:'accept'},2:{mode:'reject'},3:{mode:'never'},
             5:{fields:{0:'accept'}},6:{fields:{0:'reject',1:'reject'}},
             7:{mode:'addnew'}};
  const byCard=props.filter((p,i)=>H.isUndecidedCard(p,dec[i])).length;
  const g2=H.countDecisions(props,dec);
  check('18g: the jump and the gate count the same cards', byCard===g2.undecidedCount,
    {jump:byCard,gate:g2.undecidedCount});
  check('18g1: and it is the two untouched ones', byCard===2, {byCard});
  check('18g2: accepted, taken and "different show" are the three to apply',
    g2.acceptedCount===3, g2);
}

// 18h. THE TEMPORARY SIDE DOOR — the partial-apply button added 22 Sep 2026
// for the 320-card import. TEMPORARY: when that block leaves the JSX, this
// case and offerPartialApply leave with it, and the harness export too.
//
// WHAT IS WORTH CHECKING, and it is narrower than it looks. The gate stays
// exactly as it was — 18 to 18g above are its test and none of them moved.
// What is new is only WHEN THE SIDE DOOR IS OFFERED, and both halves of that
// have a way of going wrong that would not show up on screen as broken:
//
//   Offered with nothing decided  → a button that writes an empty change,
//                                   which reads as a working button doing
//                                   nothing.
//   Offered with everything done  → two buttons doing one job, and the pair
//                                   drifts apart the first time one is edited.
//
// IT ASKS THE RULE DIRECTLY, through the same countDecisions the gate uses, on
// real decision shapes rather than hand-set numbers — a rule that agrees with
// invented counts and disagrees with real cards is the failure this style of
// fixture exists to stop.
//
// WHAT THIS CANNOT REACH, said plainly so nobody reads more into a green tick:
// it does not prove that pressing the button writes the right rows. That walk
// lives inside the component. It is the same walk the full apply has always
// used — partial is one parameter on it, not a second copy — and she checks it
// by clicking.
{
  const props=[
    {type:'add'},                                   // untouched
    {type:'add'},                                   // accepted
    {type:'change',upd:[{field:'a'}]},              // untouched
  ];
  const none=H.countDecisions(props,{});
  check('18h: not offered while nothing is decided — it would write nothing',
    H.offerPartialApply(none)===false, none);

  const some=H.countDecisions(props,{1:{mode:'accept'}});
  check('18h1: offered once something is decided and something is not',
    H.offerPartialApply(some)===true, some);

  const all=H.countDecisions(props,{0:{mode:'reject'},1:{mode:'accept'},2:{fields:{0:'accept'}}});
  check('18h2: not offered once every card is decided — the real button is live',
    all.undecidedCount===0&&H.offerPartialApply(all)===false, all);

  // REJECTING EVERYTHING IS DECIDING EVERYTHING, and it leaves nothing to
  // apply — so neither button is the way out and Cancel is. The door must not
  // open here either: it would apply an empty change and clear the screen,
  // which looks exactly like work being thrown away.
  const allRefused=H.countDecisions(props,{0:{mode:'reject'},1:{mode:'reject'},2:{fields:{0:'reject'}}});
  check('18h3: not offered when every card was turned down',
    allRefused.undecidedCount===0&&allRefused.acceptedCount===0&&
    H.offerPartialApply(allRefused)===false, allRefused);
}

// 18i. THE CONFIRM BOX MUST SIT ABOVE EVERY OTHER OVERLAY — her finding,
// 22 Sep 2026, on the first press of the partial-apply button.
//
// WHAT HAPPENED. The confirm was raised at 1000 while the refresh review sits
// at 1100, so a confirm asked FROM INSIDE the review painted behind it. The
// box existed, the scrim was drawn, and every pixel of both was covered. The
// button read as dead and nothing on screen said otherwise.
//
// WHY NO EXISTING CHECK COULD SEE IT. `tsc` says it parses, the unit suite
// tests lifted functions, and page_renders draws the OPENING screen — where no
// overlay exists at all. The fault was a pair of numbers in two different
// places agreeing wrongly, which is only visible by comparing them.
//
// SO THIS COMPARES THEM, and it is honest about being a source check rather
// than a rendered one: it reads every zIndex the file paints and asserts the
// confirm layer is the largest. That is the actual rule — a confirm is the
// thing asked last and must be answered first, whatever raised it — and it
// catches the real way this returns, which is a NEW overlay added above it by
// someone who never saw this note.
{
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'Cat_Watch.jsx'), 'utf8');

  const all = [...src.matchAll(/zIndex\s*:\s*(\d+)/g)].map(m => Number(m[1]));
  check('18i: the page paints layered overlays at all', all.length >= 3, {found: all.length});

  // The confirm box's own layer, taken from its block rather than from a
  // count: anchored on the prose above it, never on the number itself.
  const anchor = src.indexOf('ABOVE THE REVIEW PANEL, NOT UNDER IT');
  check('18i1: the confirm box still carries its layering note', anchor > -1, {anchor});
  const confirmZ = anchor > -1
    ? Number((/zIndex\s*:\s*(\d+)/.exec(src.slice(anchor)) || [])[1])
    : NaN;

  const others = all.filter(z => z !== confirmZ);
  const highestOther = Math.max(...others);
  check('18i2: nothing is painted above the confirm box',
    Number.isFinite(confirmZ) && confirmZ > highestOther,
    {confirm: confirmZ, highestOther, all});
}

// 19. THE VENUE ORDER IS HERS, and one array drives all three places it shows
// (the freshness drawer, the filter chips, the venue headings on the refresh
// screen). Written down here so a later session reshuffling the array for
// tidiness has to answer to her list rather than to its own taste, and so a
// venue cannot be dropped from it by an edit that looks harmless.
// Lévy Gorvy Dayan (lgd) added 25 Sep — her ruling: always after Acquavella.
// French venues, her order 25 Sep: louvre, orsay, mam, mad, jacquemart.
{
  const want=['met','rijks','ng','acq','lgd','frick','menil','artic','wallace',
    'tate-britain','tate-modern','va','louvre','orsay','mam','mad','jacquemart','khm','uffizi','dellav',
    'borghese','brera','capo','moma','brit','morgan'];
  const got=H.MUSEUMS.map(m=>m.id);
  check('19: the venues are in her order', got.join()===want.join(), {got});
  check('19a: and all 26 are still there', got.length===26, {count:got.length});
}

// 20. QUARANTINE LIVES IN TWO PLACES AND THE LATEST DECISION WINS — her choice
// (option C), 20 Sep, taken over her own dislike of redundancy. The store is
// the working copy, the export is the backup, and these cases are the rule
// that settles every disagreement between them. Her scenario is 20c: the one
// that used to lose every decision the moment she pressed Reset.
{
  const B=(at)=>({venueId:"louvre",title:"[past page]",at,state:"blocked"});
  const R=(at)=>({venueId:"louvre",title:"[past page]",at,state:"released"});

  check('20: a decision from a ledger file is added to what the page knows',
    Object.keys(H.mergeQuarantine({a:B("2026-09-01T00:00:00Z")},{b:B("2026-09-02T00:00:00Z")})).length===2);

  check('20a: an OLDER backup cannot re-block a row she has released',
    H.mergeQuarantine({a:R("2026-09-20T00:00:00Z")},{a:B("2026-09-01T00:00:00Z")}).a.state==="released");

  check('20b: but a release older than the block does not win either',
    H.mergeQuarantine({a:B("2026-09-20T00:00:00Z")},{a:R("2026-09-01T00:00:00Z")}).a.state==="blocked");

  // HER SCENARIO, and the whole reason this moved out of the ledger: quarantine
  // two rows, Reset to the seed, feed the same file again. Reset replaces the
  // ledger and touches nothing here, so both are still blocked.
  const afterReset=H.mergeQuarantine({a:B("2026-09-20T01:00:00Z"),b:B("2026-09-20T01:00:00Z")},{});
  check('20c: a Reset cannot clear the quarantine', H.activeQuarantine(afterReset).length===2);

  // And releasing one leaves exactly one blocked, with the released row kept as
  // a record rather than deleted — that record is what makes 20a work.
  const afterRelease=H.mergeQuarantine(afterReset,{a:R("2026-09-20T02:00:00Z")});
  check('20d: releasing one leaves one blocked', H.activeQuarantine(afterRelease).length===1);
  check('20e:   and the released one is remembered, not forgotten',
    Object.keys(afterRelease).length===2, Object.keys(afterRelease));

  check('20f: an older ledger file still loads — its plain list converts',
    H.activeQuarantine(H.quarantineFromList([{key:"a",venueId:"louvre",title:"x",at:"2026-09-01T00:00:00Z"}])).length===1);

  // The export carries the list she can see, never the tombstones: a released
  // row is not in quarantine, so it has no business in the backup of it.
  check('20g: the export list holds only what is blocked',
    H.activeQuarantine(afterRelease).every(x=>x.key!=="a"));
}

// 21. TITLES — her rulings, 23 Sep, from the 320-card import.
// A changed title is a change she decides — a rename, and equally a title
// that differs only in capitals, because that card is how a title recorded in
// capitals is corrected in her ledger. Nothing is masked on screen: she
// rejected that, since it would hide a scraper fault forever.
{
  const led=(t)=>[{id:"x",museumId:"louvre",title:t,startDate:"2025-01-01",endDate:"2025-05-01",summary:"Same.",exUrl:"https://louvre.fr/a"}];
  const file=(t)=>hdr+row(['louvre',t,'2025-01-01','2025-05-01','Same.','https://louvre.fr/a','']);

  H.setRows(led("Mamluks"));
  let t=H.analyzeProForma(file("Mamluks: 1250-1517"));
  check('21: a renamed show raises a Change card for the title',
    t.props.length===1 && t.props[0].type==="change" && t.props[0].upd.some(u=>u.field==="title"&&u.oldVal==="Mamluks"&&u.newVal==="Mamluks: 1250-1517"), t.props);

  H.setRows(led("MAMLUKS"));
  t=H.analyzeProForma(file("Mamluks"));
  check('21a: a title differing only in capitals raises a card — that is the correction',
    t.props.length===1 && t.props[0].upd.some(u=>u.field==="title"&&u.oldVal==="MAMLUKS"&&u.newVal==="Mamluks"), t.props);

  H.setRows(led("Mamluks"));
  t=H.analyzeProForma(file("  Mamluks \n"));
  check('21b: spacing alone is not a change', t.props.length===0, t.props);

  H.setRows(led("Mamluks"));
  t=H.analyzeProForma(file("Mamluks: 1250-1517"));
  check('21c: the title change is the only change on the card', t.props[0].upd.length===1, t.props[0].upd);

  check('21d: nothing in the app rewrites a title for display', !("displayTitle" in H));
}

process.exit(fails?1:0);
