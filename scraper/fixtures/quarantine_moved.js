/**
 * QUARANTINE FOLLOWS A SHOW ITS VENUE MOVES TO A NEW ADDRESS — AND ONLY THAT SHOW (her decision; docs/app.md §4).
 *
 * Cincinnati moved Yayoi Kusama from its current page into its archive; she had quarantined it at the old
 * address. The same test that offers a Change card for a ledger card — same venue, same name, dates
 * overlapping — finds the quarantined show; its new address is quarantined too. A later show reusing the name
 * comes in. The app's own intake (lifted from Cat_Watch.jsx by the harness).
 *
 *   node scraper/fixtures/quarantine_moved.js     (proof: build/proofs/quarantine_moved.proof.js)
 */
'use strict';
require('../test_proofs.js').requireProven(__filename);   // not used until proven at this version (scraper/test_proofs.js)
const H = require('./harness.js');

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 400) : '')); }
};

const CAM = 'https://www.cincinnatiartmuseum.org/art/exhibitions/';
const KUSAMA = 'Yayoi Kusama: All the Eternal Love I Have for the Pumpkins';
const OLD = CAM + 'yayoi-kusama-all-the-eternal-love-i-have-for-the-pumpkins/';
const NEW = CAM + 'exhibition-archive/2026/yayoi-kusama-all-the-eternal-love-i-have-for-the-pumpkins/';
const hdr = 'venue_code,title,start_date,end_date,summary,url,notes,swept_at\n';
const row = (venue, title, start, end, url) => `${venue},"${title}",${start},${end},Mirrored pumpkins.,${url},,2026-11-27\n`;
const entry = (dates) => ({ key: H.ignoreKeyFor('cincinnati', OLD, KUSAMA), venueId: 'cincinnati', title: KUSAMA, ...dates, at: '2026-10-15T10:20:22.144Z' });
const read = (csv, quarantined) => H.analyzeProForma(hdr + csv, new Set(quarantined.map(x => x.key)), { quarantined });
const DATED = entry({ startDate: '2026-07-17', endDate: '2026-10-18' });

H.setRows([]);
{
  const r = read(row('cincinnati', KUSAMA, '2026-07-17', '2026-10-18', NEW), [DATED]);
  check('QM-01: the quarantined show at its new address stays out, counted', r.props.length === 0 && r.tally.blocked === 1, JSON.stringify(r.tally));
  const k = H.ignoreKeyFor('cincinnati', NEW, KUSAMA);
  check('QM-02: its new address is handed back to be quarantined, with its dates',
    r.moved && r.moved[k] && r.moved[k].state === 'blocked' && r.moved[k].startDate === '2026-07-17' && Object.keys(r.moved).length === 1, JSON.stringify(r.moved));
}
{
  const r = read(row('cincinnati', KUSAMA, '2028-03-01', '2028-06-30', CAM + 'yayoi-kusama-2028/'), [DATED]);
  check('QM-03: a later show reusing the name comes in', r.props.length === 1 && r.tally.blocked === 0 && !r.moved, JSON.stringify(r.tally));
}
{
  const r = read(row('cincinnati', KUSAMA, '2026-07-17', '2026-10-18', NEW), [entry({})]);
  check('QM-04: a quarantined show with no dates is never matched on its name alone', r.props.length === 1 && r.tally.blocked === 0, JSON.stringify(r.tally));
}
{
  const r = read(row('menil', KUSAMA, '2026-07-17', '2026-10-18', 'https://www.menil.org/exhibition/kusama'), [DATED]);
  check('QM-05: the same show name and dates at another venue comes in', r.props.length === 1 && r.tally.blocked === 0, JSON.stringify(r.tally));
}
{
  const k = DATED.key;
  const merged = H.mergeQuarantine({ [k]: { venueId: 'cincinnati', title: KUSAMA, at: DATED.at, state: 'blocked' } },
    { [k]: { venueId: 'cincinnati', title: KUSAMA, startDate: '2026-07-17', endDate: '2026-10-18', at: DATED.at, state: 'blocked' } });
  check('QM-06: a copy without dates (an older export) does not lose them', merged[k].startDate === '2026-07-17' && merged[k].endDate === '2026-10-18', JSON.stringify(merged[k]));
  const listed = H.activeQuarantine(merged)[0];
  check('QM-07: the quarantine list she sees and exports carries the dates', listed.startDate === '2026-07-17' && listed.endDate === '2026-10-18', JSON.stringify(listed));
}

console.log(failures ? `\nquarantine_moved: ${failures} failed` : '\nquarantine_moved: all passed');
process.exitCode = failures ? 1 : 0;
