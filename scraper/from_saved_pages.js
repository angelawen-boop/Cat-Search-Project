/**
 * A VENUE'S ROWS FROM PAGES SHE SAVED — no network. 27 Sep 2026.
 *
 * WHY. Some venues cost more to sweep than they are worth to her. MoMA let 18
 * paced pages through and challenged the 19th; she wants four of its future
 * shows. So she saves those pages in her own browser (Ctrl+S, "Webpage, Single
 * File" — .mhtml) and this reads them.
 *
 * NOT A SECOND SCRAPER. It runs the venue's REAL recipe — the real
 * scrapeVenue, the real detail pass, the real lookback and CSV writer — with
 * every request answered from her files and everything else refused. So the
 * rows are what a sweep would write from the same pages, and a recipe fix
 * reaches both.
 *
 *   node scraper/from_saved_pages.js <venue> <page.mhtml> <page.mhtml> ...
 *
 * THE LISTING PAGE MUST BE ONE OF THE FILES. Titles and dates come off the
 * listing, as in a sweep; the exhibition pages give the descriptions. Each
 * file's own address is read from inside it (Snapshot-Content-Location).
 *
 * ONLY THE SHOWS WHOSE PAGE SHE SAVED ARE WRITTEN. The listing names others;
 * they are left out and each is NAMED in the output, never dropped in silence.
 *
 * The result is an ordinary run folder — stitch, compress and qc take it as
 * they take any other. Each row's swept_at is when she saved its page, and its
 * notes say it came from a saved page.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const venue = (args[0] || '').toLowerCase();
const files = args.slice(1);

function readMhtml(file) {
  const raw = fs.readFileSync(file, 'latin1');
  const url = (raw.match(/^Snapshot-Content-Location:\s*(\S+)/m) || [])[1];
  const date = (raw.match(/^Date:\s*(.+)$/m) || [])[1];
  const start = raw.search(/^Content-Type: text\/html/im);
  if (!url || start < 0) return null;
  const head = raw.slice(start, raw.indexOf('\r\n\r\n', start));
  let body = raw.slice(raw.indexOf('\r\n\r\n', start) + 4);
  const end = body.search(/\r\n------MultipartBoundary/);
  if (end > 0) body = body.slice(0, end);
  if (/quoted-printable/i.test(head)) {
    body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
  return { url: url.replace(/#.*$/, ''), savedAt: date ? new Date(date) : null, html: Buffer.from(body, 'latin1').toString('utf8') };
}

(async () => {
  const S = require('./sweep_prototype.js');
  const v = S.VENUES[venue];
  if (!v || !files.length) {
    console.log('Usage: node scraper/from_saved_pages.js <venue> <page.mhtml> ...' + (venue && !v ? `\nNo recipe called "${venue}".` : ''));
    process.exit(2);
  }
  const pages = new Map();
  for (const f of files) {
    const p = readMhtml(f);
    if (!p) { console.log(`Not a saved page this can read (no address or no HTML inside): ${f}`); process.exit(2); }
    pages.set(p.url, { ...p, file: path.basename(f) });
  }
  const listingUrls = new Set(S.listingPages(v).map(p => new URL(p.path, v.base).href));
  const listings = [...pages.keys()].filter(u => listingUrls.has(u));
  if (!listings.length) {
    console.log(`None of the files is ${venue}'s listing page. Save one of:\n  ${[...listingUrls].join('\n  ')}`);
    process.exit(2);
  }

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  const refused = [];
  let rows;
  const logged = [];
  try {
    const context = await browser.newContext();
    await context.route(() => true, r => {
      const u = r.request().url().replace(/#.*$/, '');
      const p = pages.get(u);
      if (p) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: p.html });
      if (r.request().resourceType() === 'document') refused.push(u);
      return r.abort();
    });
    const page = await context.newPage();
    const log = console.log; console.log = (...a) => logged.push(a.join(' '));
    try { rows = S.applyLookback(await S.scrapeVenue(page, venue), venue, 'final'); }
    finally { console.log = log; }
  } finally { await browser.close(); }

  const real = rows.filter(r => !r.title.startsWith('['));
  const kept = real.filter(r => pages.has(r.url) && !listingUrls.has(r.url));
  const leftOut = real.filter(r => !kept.includes(r));
  const unused = [...pages.keys()].filter(u => !listingUrls.has(u) && !kept.some(r => r.url === u));

  for (const r of kept) {
    const p = pages.get(r.url);
    // The note is for her card, so the date is hers: Sydney, as she reads it.
    const day = p.savedAt ? p.savedAt.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric' }) : 'an unknown date';
    r.notes = S.addNote(r.notes, `Read from a page saved in your browser on ${day}, not by a sweep.`);
    if (p.savedAt) r.swept_at = p.savedAt.toISOString();
  }
  S.noteTravellingRuns(kept, venue);
  fs.mkdirSync(S.RUN_DIR, { recursive: true });
  S.writeVenueCsv(venue, kept);
  S.rebuildSweepCsv();

  const out = [];
  out.push(`${venue}: ${kept.length} row(s) from saved pages → ${path.relative(process.cwd(), S.RUN_DIR)}/${venue}.csv`);
  for (const r of kept) out.push(`  ${r.start_date || '?'} → ${r.end_date || '?'}  ${r.title}  (${r.summary ? r.summary.length + ' chars of description' : 'NO DESCRIPTION'})`);
  if (leftOut.length) {
    out.push(`Left out — on the listing, no saved page: ${leftOut.length}`);
    for (const r of leftOut) out.push(`  ${r.title}  ${r.url}`);
  }
  if (unused.length) {
    out.push(`Saved but not written — the recipe did not keep them (see the log): ${unused.length}`);
    for (const u of unused) out.push(`  ${pages.get(u).file}  ${u}`);
  }
  out.push(`Requests refused (no saved page): ${refused.length}. Nothing reached the network.`);
  fs.writeFileSync(path.join(S.RUN_DIR, `from_saved_pages_${venue}.txt`),
    ['FILES: ' + files.map(f => path.basename(f)).join(', '), '', ...out, '', 'RECIPE LOG', ...logged].join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.log('from_saved_pages failed: ' + e.message); process.exit(1); });
