/**
 * Titles in capitals → the venue's own letters, in her import file. 23 Sep.
 *
 * WHY. ~75 titles in this file arrived in capitals because the venues shout
 * them with CSS and the scraper recorded what was displayed. The scraper now
 * records the venue's own letters (restoreCase, sweep_prototype.js). Her
 * ruling: no on-screen masking in the app — fix the data, once, in this file.
 *
 * HOW, in two steps so the page reading is done once and kept:
 *
 *   node .../repair_capitals_23sep.js --fetch    read the listing pages of every
 *                                               venue with a capitals title, as
 *                                               a sweep reads them (listing only,
 *                                               no exhibition pages), and save
 *                                               url → title to capitals_fetched_23sep.json
 *   node .../repair_capitals_23sep.js --fetch borghese
 *                                               read only the venues named, and
 *                                               merge them into the saved file —
 *                                               for a venue that was down
 *   node .../repair_capitals_23sep.js            report what would change
 *   node .../repair_capitals_23sep.js --apply    write it
 *
 * IT CHANGES CAPITALS AND NOTHING ELSE. A title is replaced only where the
 * venue's title today, at the SAME ADDRESS, is the same letters in a different
 * case. Anything else — not found, reworded, still in capitals at the venue —
 * is left exactly as it is and named in the report.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('../../compress.js');

const FILE = path.join(__dirname, 'sweep_compressed_clean.csv');
const FETCHED = path.join(__dirname, 'capitals_fetched_23sep.json');
const squash = s => String(s || '').replace(/\s+/g, ' ').trim();

// Mostly capitals: more than half the words carry no lowercase letter. The
// same test she saw on screen, used here only to choose which rows to look at.
function shouting(t) {
  const words = squash(t).split(' ').filter(w => /\p{L}/u.test(w));
  return words.length > 0 && words.filter(w => !/\p{Ll}/u.test(w)).length * 2 > words.length;
}

const rows = C.readProForma(FILE);
const targets = rows.filter(r => !String(r.title).startsWith('[') && shouting(r.title));
const named = process.argv.slice(2).filter(a => !a.startsWith('--'));
const venues = named.length ? named : [...new Set(targets.map(r => r.venue_code))];

async function fetchTitles() {
  const S = require('../../sweep_prototype.js');
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: S.resolveChromium(), headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (process.env.HTTPS_PROXY || process.env.https_proxy) await S.installNetworkBridge(context);
  const page = await context.newPage();
  // Venues named on the command line are MERGED into what was read before;
  // a venue that reads nothing this time keeps its earlier titles.
  const prev = fs.existsSync(FETCHED) ? JSON.parse(fs.readFileSync(FETCHED, 'utf8')).titles : {};
  const out = named.length ? { ...prev } : {};
  for (const code of venues) {
    console.log(`\n[${code}] reading listing pages…`);
    try {
      const found = await S.scrapeVenue(page, code, { listingOnly: true });
      const got = {};
      for (const r of found) if (r.url && r.title && !r.title.startsWith('[')) got[r.url] = r.title;
      console.log(`[${code}] ${Object.keys(got).length} titles read`);
      if (Object.keys(got).length || !out[code]) out[code] = got;
    } catch (e) {
      console.log(`[${code}] FAILED — ${e.message.slice(0, 120)}`);
    }
  }
  await browser.close();
  fs.writeFileSync(FETCHED, JSON.stringify({ at: new Date().toISOString(), titles: out }, null, 2) + '\n');
  console.log(`\nSaved ${path.basename(FETCHED)}.`);
}

function repair() {
  if (!fs.existsSync(FETCHED)) throw new Error('Run --fetch first.');
  const { at, titles } = JSON.parse(fs.readFileSync(FETCHED, 'utf8'));
  const changed = [], left = [];
  const out = rows.map(r => {
    if (!targets.includes(r)) return r;
    const fresh = titles[r.venue_code] && titles[r.venue_code][r.url];
    if (!fresh) { left.push(`${r.venue_code} | ${r.title} — not on the venue's listing pages at this address today`); return r; }
    if (squash(fresh).toLowerCase() !== squash(r.title).toLowerCase()) {
      left.push(`${r.venue_code} | ${r.title} — the venue's title now reads "${fresh}", which is more than capitals`);
      return r;
    }
    if (shouting(fresh)) { left.push(`${r.venue_code} | ${r.title} — the venue itself writes it in capitals`); return r; }
    changed.push(`${r.venue_code} | ${r.title} → ${fresh}`);
    return { ...r, title: squash(fresh) };
  });
  if (out.length !== rows.length) throw new Error('row count changed — refusing');
  console.log(`Titles read from the venues at ${at}.\n`);
  for (const c of changed) console.log('FIXED  ' + c);
  if (left.length) { console.log(`\nLEFT AS THEY ARE (${left.length}):`); for (const l of left) console.log('  ' + l); }
  console.log(`\n${targets.length} titles in capitals: ${changed.length} fixed, ${left.length} left.`);
  if (process.argv.includes('--apply')) { C.writeCsv(FILE, out); console.log(`Wrote ${path.basename(FILE)}.`); }
  else console.log('Report only. --apply writes it.');
}

if (process.argv.includes('--fetch')) fetchTitles().catch(e => { console.error(e); process.exit(1); });
else repair();
