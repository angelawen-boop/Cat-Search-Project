/**
 * ASSUMED DATES — A MONTH OR SEASON WITH NO DAY (her decision; docs/app.md, "Assumed dates").
 *
 * The Whitney's "Through Spring 2027": the card shows the venue's words and the day assumed, and the
 * assumed day is the date the app runs on. The shared date reader quotes the words with the word before
 * them; the app's intake (lifted from Cat_Watch.jsx) turns the quote into the assumed day, keeps the
 * words on the card and the ledger row, and never lets an assumed date overwrite a real one.
 *
 *   node scraper/fixtures/assumed_dates.js     (proof: build/proofs/assumed_dates.proof.js)
 */
'use strict';
require('../test_proofs.js').requireProven(__filename);   // not used until proven at this version (scraper/test_proofs.js)
const fs = require('fs');
const path = require('path');
const H = require('./harness.js');
const DATES = require('../dates.js');

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 400) : '')); }
};

// The card's date line, lifted from the joined page with the words it says.
const page = fs.readFileSync(path.join(__dirname, '..', '..', 'Cat_Watch.jsx'), 'utf8');
const cut = (a, b) => { const i = page.indexOf(a), j = page.indexOf(b, i); if (i < 0 || j < 0) throw new Error('anchor not found: ' + a); return page.slice(i, j); };
const words = cut('const W=', '\nconst REG=');
const line = start => { const l = page.split('\n').find(x => x.startsWith(start)); if (!l) throw new Error('line not found: ' + start); return l; };
const display = ['const MON3=', 'const fmtDate=', 'const assumedText=', 'function dateRange('].map(line).join('\n');
// eslint-disable-next-line no-new-func
const dateRange = new Function(words + '\n' + display + '\nreturn dateRange;')();

const hdr = 'venue_code,title,start_date,end_date,summary,url,notes,swept_at\n';
const note = (shown, why) => `"${DATES.shownOnlyNote(shown, why || 'only a season and a year are published').replace(/"/g, '""')}"`;
const row = (venue, title, start, end, notes, url) => `${venue},"${title}",${start},${end},A show.,${url || 'https://example.org/' + encodeURIComponent(title)},${notes || ''},\n`;
const read = csv => H.analyzeProForma(hdr + csv, new Set(), {});
const cand = r => r.props[0] && r.props[0].cand;
// A link venue in Australia, known to the intake as the page knows it once its link is read.
const AU = H.VENUE_REGISTER.find(e => e.country === 'Australia');
H.KNOWN_VENUES.add(AU.id);
H.MU[AU.id] = { id: AU.id, card: AU.names.card, country: AU.country };

// ── The reader quotes the word before the month or season.
check('AD-01: the reader quotes "Through Spring 2027" whole', DATES.findDateRange('Through Spring 2027').shownText === 'Through Spring 2027', DATES.findDateRange('Through Spring 2027').shownText);
check('AD-02: the reader quotes "until September 2026" whole', DATES.findDateRange('until September 2026').shownText === 'until September 2026', DATES.findDateRange('until September 2026').shownText);

// ── The intake: the assumed day, the words kept, capitalised.
H.setRows([]);
{
  const c = cand(read(row('moma', 'Spring Show', '', '', note('THROUGH SPRING 2027'))));
  check('AD-03: "Through Spring 2027" closes 31 May 2027, the words kept capitalised', c && c.endDate === '2027-05-31' && c.endShown === 'Through Spring 2027' && !c.startDate, JSON.stringify(c));
}
{
  const c = cand(read(row('moma', 'Month Show', '', '', note('until September 2026', 'no day is published, only the month and year'))));
  check('AD-04: "until September 2026" closes on the month\'s last day', c && c.endDate === '2026-09-30' && c.endShown === 'Until September 2026', JSON.stringify(c));
}
{
  const c = cand(read(row('moma', 'Opening Show', '', '', note('Opens Spring 2027'))));
  check('AD-05: "Opens Spring 2027" opens on the season\'s first day', c && c.startDate === '2027-03-01' && c.startShown === 'Opens Spring 2027' && !c.endDate, JSON.stringify(c));
}
{
  const c = cand(read(row('moma', 'Range Show', '2026-08-01', '', note('Aug 1, 2026-Summer 2027', 'the venue gives a season, not a closing date'))));
  check('AD-06: a real opening date, then a season: the season closes it', c && c.startDate === '2026-08-01' && !c.startShown && c.endDate === '2027-08-31' && c.endShown === 'Summer 2027', JSON.stringify(c));
}
for (const [shown, name] of [['Through late Spring 2027', 'late'], ['Through early 2027', 'early'], ['Spring 2027', 'no word for its side'], ['March / 2026', 'a bare month']]) {
  const c = cand(read(row('moma', 'Blank ' + name, '', '', note(shown))));
  check(`AD-07: ${name} ("${shown}") is given no date`, c && !c.startDate && !c.endDate && !c.endShown && !c.startShown, JSON.stringify(c));
}
{
  const c = cand(read(row('moma', 'Mid Show', '2026-08-01', '', note('Aug 1, 2026-mid-Summer 2027'))));
  check('AD-07b: "mid-Summer" after a real opening is given no closing date (its hyphen is not a range)', c && !c.endDate && !c.endShown, JSON.stringify(c));
}
{
  const a = cand(read(row('moma', 'Winter A', '2026-01-10', '', note('Through Winter 2026'))));
  const b = cand(read(row('moma', 'Winter B', '2026-11-10', '', note('Through Winter 2026'))));
  const c = cand(read(row('moma', 'Winter C', '', '', note('Through Winter 2026'))));
  check('AD-08: winter closes at the first end of February after the opening', a && a.endDate === '2026-02-28' && b && b.endDate === '2027-02-28', JSON.stringify([a, b]));
  check('AD-09: winter with no opening date is given no date', c && !c.endDate && !c.endShown, JSON.stringify(c));
}
{
  const c = cand(read(row(AU.id, 'Southern Show', '', '', note('Through Spring 2027'))));
  check('AD-10: a southern venue\'s spring closes on 30 November', c && c.endDate === '2027-11-30', JSON.stringify(c));
}

// ── Later imports: real over assumed, never assumed over real.
const A = { id: 'a', museumId: 'moma', title: 'Spring Show', startDate: null, endDate: '2027-05-31', endShown: 'Through Spring 2027', exUrl: 'https://example.org/a' };
const later = (rows, start, end, notes) => { H.setRows(rows); return read(row('moma', 'Spring Show', start, end, notes, 'https://example.org/a')); };
const endUpd = r => (r.props[0] && r.props[0].upd || []).find(u => u.field === 'endDate');
{
  const u = endUpd(later([A], '', '2027-06-14', ''));
  check('AD-11: the venue\'s real date over an assumed one is a Change card, the words dropped', u && u.kind === 'change' && u.newVal === '2027-06-14' && !u.shown && u.oldShown === 'Through Spring 2027', JSON.stringify(u));
}
{
  const u = endUpd(later([A], '', '2027-05-31', ''));
  check('AD-12: the venue\'s real date on the assumed day still comes as a Change card', u && u.kind === 'change' && !u.shown, JSON.stringify(u));
}
{
  const u = endUpd(later([A], '', '', note('Through Spring 2027')));
  check('AD-13: the same assumption again proposes nothing', !u, JSON.stringify(u));
}
{
  const u = endUpd(later([A], '', '', note('Through Summer 2027')));
  check('AD-14: another season is a Change card carrying its words', u && u.kind === 'change' && u.newVal === '2027-08-31' && u.shown === 'Through Summer 2027', JSON.stringify(u));
}
{
  const u = endUpd(later([{ ...A, endDate: '2027-04-30', endShown: undefined }], '', '', note('Through Spring 2027')));
  check('AD-15: an assumed date never overwrites a real one', !u, JSON.stringify(u));
}
{
  const u = endUpd(later([{ ...A, endDate: null, endShown: undefined }], '', '', note('Through Spring 2027')));
  check('AD-16: an assumed date fills a blank as a Fill card', u && u.kind === 'fill' && u.shown === 'Through Spring 2027', JSON.stringify(u));
}

// ── Applying: the words travel with the date into the ledger.
{
  H.setRows([]);
  const r = read(row('moma', 'Spring Show', '', '', note('Through Spring 2027'), 'https://example.org/a'));
  const out = H.applyCards([], r.props, [{ mode: 'accept' }]);
  const n = out.ledger[0];
  check('AD-17: a new show keeps the words on its ledger row', n && n.endDate === '2027-05-31' && n.endShown === 'Through Spring 2027', JSON.stringify(n));
  const r2 = later([n], '', '2027-06-14', '');
  const i = r2.props[0].upd.findIndex(u => u.field === 'endDate');
  const out2 = H.applyCards([n], r2.props, [{ mode: 'fields', fields: { [i]: 'accept' } }]);
  const m = out2.ledger[0];
  check('AD-18: the real date applied drops the words', m.endDate === '2027-06-14' && !('endShown' in m), JSON.stringify(m));
}

// ── Two runs of one venue: the real date wins over the assumed one.
{
  const rows = [
    { venueCode: 'moma', title: 'X', startDate: '', endDate: '2027-05-31', shown: { endDate: 'Through Spring 2027' }, url: 'https://example.org/x', line: 2 },
    { venueCode: 'moma', title: 'X', startDate: '', endDate: '2027-06-14', shown: {}, url: 'https://example.org/x', line: 3 },
  ];
  const f = H.foldDuplicateRows(rows)[0];
  check('AD-19: folding two runs, the real date wins with no choice offered', f.endDate === '2027-06-14' && !f.conflicts && !(f.shown || {}).endDate, JSON.stringify(f));
}

// ── The card's line.
check('AD-20: closing assumed', dateRange({ endDate: '2027-05-31', endShown: 'Through Spring 2027' }) === '“Through Spring 2027” (assumed 31 May 2027)', dateRange({ endDate: '2027-05-31', endShown: 'Through Spring 2027' }));
check('AD-21: opening assumed', dateRange({ startDate: '2027-03-01', startShown: 'Opens Spring 2027' }) === '“Opens Spring 2027” (assumed 1 Mar 2027)', dateRange({ startDate: '2027-03-01', startShown: 'Opens Spring 2027' }));
check('AD-22: a real opening, then a season', dateRange({ startDate: '2026-08-01', endDate: '2027-08-31', endShown: 'Summer 2027' }) === '1 Aug 2026 — “Summer 2027” (assumed 31 Aug 2027)', dateRange({ startDate: '2026-08-01', endDate: '2027-08-31', endShown: 'Summer 2027' }));
check('AD-23: real dates unchanged', dateRange({ startDate: '2026-08-01', endDate: '2027-08-31' }) === '1 Aug 2026 — 31 Aug 2027', dateRange({ startDate: '2026-08-01', endDate: '2027-08-31' }));

console.log(failures ? `\nassumed_dates: ${failures} failed` : '\nassumed_dates: all passed');
process.exitCode = failures ? 1 : 0;
