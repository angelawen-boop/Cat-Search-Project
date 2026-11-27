/**
 * QUARANTINE HOLDS A SHOW THE VENUE MOVES TO A NEW ADDRESS (her ask; docs/app.md §4).
 *
 * Cincinnati moved Yayoi Kusama from its current page into its archive; she had quarantined it at the old
 * address. The app's own intake (lifted from Cat_Watch.jsx by the harness) on a sweep row at the new address.
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
const hdr = 'venue_code,title,start_date,end_date,summary,url,notes,swept_at\n';
const row = (title, url) => `cincinnati,"${title}",2026-07-17,2026-10-18,Mirrored pumpkins.,${url},,2026-11-27\n`;
const quarantined = [{ key: H.ignoreKeyFor('cincinnati', CAM + 'yayoi-kusama-all-the-eternal-love-i-have-for-the-pumpkins/', KUSAMA), venueId: 'cincinnati', title: KUSAMA }];

H.setRows([]);
{
  const r = H.analyzeProForma(hdr + row(KUSAMA, CAM + 'exhibition-archive/2026/yayoi-kusama-all-the-eternal-love-i-have-for-the-pumpkins/'), H.quarantineKeys(quarantined));
  check('QM-01: a quarantined show at a new address stays out, counted', r.props.length === 0 && r.tally.blocked === 1, JSON.stringify(r.tally));
}
{
  const r = H.analyzeProForma(hdr + row(KUSAMA, CAM + 'yayoi-kusama-all-the-eternal-love-i-have-for-the-pumpkins/'), H.quarantineKeys(quarantined));
  check('QM-02: at its old address it stays out, as before', r.props.length === 0 && r.tally.blocked === 1, JSON.stringify(r.tally));
}
{
  const r = H.analyzeProForma(hdr + row('Nancy Rexroth: Secrets of My Power', CAM + 'nancy-rexroth-secrets-of-my-power/'), H.quarantineKeys(quarantined));
  check('QM-03: another show at the venue comes in', r.props.length === 1 && r.tally.blocked === 0, JSON.stringify(r.tally));
}
{
  const r = H.analyzeProForma(hdr + row(KUSAMA, 'https://www.menil.org/exhibition/kusama').replace(/^cincinnati/, 'menil'), H.quarantineKeys(quarantined));
  check('QM-04: the same title at another venue comes in', r.props.length === 1 && r.tally.blocked === 0, JSON.stringify(r.tally));
}

console.log(failures ? `\nquarantine_moved: ${failures} failed` : '\nquarantine_moved: all passed');
process.exitCode = failures ? 1 : 0;
