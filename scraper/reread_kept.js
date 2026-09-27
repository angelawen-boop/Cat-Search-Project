/**
 * A RECIPE FIX APPLIED TO PAGES ALREADY READ — no network. Her go-ahead, 27 Sep.
 *
 * WHY. A sweep keeps every show page it reads (page_keep.js). When the rows
 * show a recipe fault, the fix is proven on those pages and the rows corrected
 * from them — never by sweeping the museum again (her rule, 27 Sep: saved
 * pages instead of resweeps).
 *
 * WHAT. Takes a run's venue CSV (the sweep's rows, listing already applied),
 * runs the venue's REAL show-page pass over the pages kept by that sweep —
 * every other request refused — and prints each field that changed. Nothing is
 * written without --write. swept_at is kept: the page was read then, not now.
 *
 *   node scraper/reread_kept.js <run folder> <venue>           show the changes
 *   node scraper/reread_kept.js <run folder> <venue> --write   and write them
 *
 * Only pages kept by THAT run are used (saved after the run began); a row
 * whose page is not kept is left exactly as it was, and named.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

async function reread(runDir, venue, { S = require('./sweep_prototype.js'), keptDir } = {}) {
  const { readProForma } = require('./compress.js');
  const { chromium } = require('playwright');
  const csv = path.join(runDir, `${venue}.csv`);
  const rows = readProForma(csv);
  const runStart = runStartOf(runDir);
  const dir = keptDir || path.join(__dirname, 'output', 'pages_kept', venue);

  // The kept pages of THIS run, by address.
  const kept = new Map();
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!f.endsWith('.json') || f === 'finished.json') continue;
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const gz = path.join(dir, f.replace(/\.json$/, '.html.gz'));
    if (!fs.existsSync(gz) || (runStart && Date.parse(j.savedAt) < runStart)) continue;
    kept.set(j.url, zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8'));
  }

  const browser = await chromium.launch({ executablePath: S.resolveChromium(), args: ['--no-sandbox'] });
  const changes = [], missing = [];
  try {
    const ctx = await browser.newContext();
    await ctx.route('**/*', route => {
      const u = route.request().url().replace(/#.*$/, '');
      const html = kept.get(u);
      return html ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : route.abort();
    });
    const page = await ctx.newPage();
    const quiet = console.log; console.log = () => {};
    try {
      for (const row of rows) {
        if (row.title.startsWith('[')) continue;               // marker rows
        if (!kept.has(row.url)) { missing.push(row.title); continue; }
        const before = { ...row };
        await S.fetchIndividualPages(page, [row], venue);
        row.notes = before.notes;                              // the sweep's notes stand
        for (const k of ['title', 'start_date', 'end_date', 'summary']) {
          if ((row[k] || '') !== (before[k] || '')) changes.push({ url: row.url, field: k, from: before[k] || '', to: row[k] || '' });
        }
      }
    } finally { console.log = quiet; }
    await ctx.close();
  } finally { await browser.close(); }
  return { rows, changes, missing, kept: kept.size, csv };
}

// The run folder's own name is its start, Sydney time (run_YYYY-MM-DD_HHMMSS).
function runStartOf(runDir) {
  const m = path.basename(runDir).match(/^run_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  // Sydney is UTC+10 or +11; take the earlier, so no page of this run is missed.
  return guess - 11 * 3600e3;
}

function writeRows(csv, rows) {
  const cols = ['venue_code', 'title', 'start_date', 'end_date', 'summary', 'url', 'notes', 'swept_at'];
  const q = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(csv, [cols.join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\n') + '\n', 'utf8');
}

module.exports = { reread, writeRows, runStartOf };

if (require.main === module) {
  (async () => {
    const [runArg, venue] = process.argv.slice(2);
    const write = process.argv.includes('--write');
    if (!runArg || !venue) { console.log('Usage: node scraper/reread_kept.js <run folder> <venue> [--write]'); process.exit(2); }
    const runDir = fs.existsSync(runArg) ? runArg : path.join(__dirname, 'output', runArg);
    const r = await reread(runDir, venue);
    console.log(`${venue}: ${r.rows.length} rows, ${r.kept} pages kept by this run, ${r.changes.length} field(s) changed`);
    for (const c of r.changes) {
      console.log(`\n  ${c.url}\n    ${c.field}:\n      was: ${c.from.slice(0, 200)}\n      now: ${c.to.slice(0, 200)}`);
    }
    if (r.missing.length) console.log(`\n  Not kept, left as they were: ${r.missing.join('; ')}`);
    if (write && r.changes.length) {
      writeRows(r.csv, r.rows);
      // sweep.csv is every venue file of the run, rebuilt the same way the sweep does.
      const files = fs.readdirSync(runDir).filter(f => /^[a-z-]+\.csv$/.test(f) && f !== 'sweep.csv').sort();
      const all = files.flatMap(f => require('./compress.js').readProForma(path.join(runDir, f)));
      writeRows(path.join(runDir, 'sweep.csv'), all);
      console.log(`\nWritten: ${r.csv} and sweep.csv`);
    } else if (!write) console.log('\nNothing written (add --write).');
  })().catch(e => { console.error(e); process.exit(1); });
}
