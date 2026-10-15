/**
 * THE MET'S EXCLUSIONS, CHECKED ON THE NAME ITS SHOW PAGE GIVES — over two pages
 * the 15 Oct sweep kept (docs/met_pages/). No network.
 *
 * The Met's listing cards give no readable name, so `excludeTitle` at the listing
 * never fired and 18 shows her decisions exclude reached the run (P.S. Art,
 * Scholastic, commissions, Burdick, the crèche). The page pass now checks the
 * name too, and reread_kept.js drops such a row from a run.
 *
 *   node scraper/fixtures/met_exclusion_pages.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const S = require('../sweep_prototype.js');
S.useFixtureWaits();
const { reread, writeRows } = require('../reread_kept.js');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'met_pages');
const row = (title, slug) => ({ venue_code: 'met', title, start_date: '', end_date: '', summary: '',
  url: `https://www.metmuseum.org/exhibitions/${slug}`, notes: '', swept_at: '2026-10-15T08:16:00Z' });

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

(async () => {
  // A folder not named run_…, so every page in docs/met_pages counts as this run's.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'met-excl-'));
  writeRows(path.join(dir, 'met.csv'), [
    row('P. S. Art 2026: Celebrating the Creative Spirit of New York City Kids', 'p-s-art-2026-celebrating-the-creative-spirit-of-new-york-city-kids'),
    row('Krasner and Pollock: Past Continuous', 'krasner-and-pollock-past-continuous'),
  ]);
  const r = await reread(dir, 'met', { S, keptDir: PAGES });
  const titles = r.rows.map(x => x.title);
  ok(!titles.some(t => /^P\. S\. Art/.test(t)), 'ME-001: P.S. Art leaves the run on the name its own page gives (her decision)', titles.join(' | '));
  ok(titles.some(t => /^Krasner and Pollock/.test(t)), 'ME-002: an ordinary show stays', titles.join(' | '));
  ok(r.changes.some(c => c.field === 'excluded' && /^P\. S\. Art/.test(c.from)), 'ME-003: the drop is named among the changes, never silent');
  const krasner = r.rows.find(x => /^Krasner/.test(x.title));
  ok(krasner && krasner.summary.length > 200, 'ME-004: the kept show still gets its description', krasner && String(krasner.summary.length));
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\nmet_exclusion_pages: ${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.log('FAIL  met_exclusion_pages crashed — ' + e.message); process.exitCode = 1; });
