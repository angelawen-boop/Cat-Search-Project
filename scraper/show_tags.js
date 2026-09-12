/**
 * Print the venue's own TYPE TAG for every row of a venue's CSV.
 *
 * WHY THIS EXISTS. Reconciling her count against the scraper's meant opening
 * dozens of exhibition pages by hand to read one word off each — the label the
 * venue prints beside the title. That is the sort of work that should never be
 * done by a person, and it is not a judgement call: the tag is right there on
 * the page and there is exactly one correct answer per row.
 *
 *   node scraper/show_tags.js artic
 *   node scraper/show_tags.js artic scraper/output/run_2026-09-13_000155
 *
 * Reads the newest run that has that venue's CSV unless a run is named, opens
 * each row's own page and prints one line per row:
 *
 *   TICKETED EXHIBITION | 2026-03-07 2026-06-01 | Matisse's Jazz: Rhythms in Color
 *   (no tag found)      | 2025-06-07 2026-11-15 | Raqib Shaw: Paradise Lost
 *
 * Output goes to the screen AND to tags_<venue>.txt in the run directory, so it
 * can be committed and read from the other machine.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { installNetworkBridge, resolveChromium, safeGoto } = require('./sweep_prototype.js');

const OUTPUT_DIR = path.join(__dirname, 'output');

// The label sits beside the title, so only the start of the page is read — far
// enough in to catch it, not so far that the same words in curatorial prose are
// mistaken for the venue's own tag.
const HEAD_CHARS = 400;
const TAG = /\b(?:TICKETED EXHIBITION|SPECIAL LOAN INSTALLATION|COLLECTION INSTALLATION|COLLECTION ROTATION|VIDEO INSTALLATION|HOLIDAY INSTALLATION|EXHIBITION)\b/;

function newestRunWith(venue) {
  const runs = fs.readdirSync(OUTPUT_DIR)
    .filter(d => d.startsWith('run_'))
    .filter(d => fs.existsSync(path.join(OUTPUT_DIR, d, `${venue}.csv`)))
    .sort();
  return runs.length ? path.join(OUTPUT_DIR, runs[runs.length - 1]) : null;
}

// Minimal CSV reader: the pro forma's own quoting rules, nothing more.
function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length === head.length)
             .map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

(async () => {
  const venue = process.argv[2];
  if (!venue) { console.error('usage: node scraper/show_tags.js <venue> [run directory]'); process.exit(1); }
  const run = process.argv[3] || newestRunWith(venue);
  if (!run) { console.error(`no run found holding ${venue}.csv`); process.exit(1); }

  const rows = readCsv(path.join(run, `${venue}.csv`)).filter(r => r.url && !r.title.startsWith('['));
  console.log(`${rows.length} rows from ${run}\n`);

  const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true });
  const page = await browser.newPage();
  await installNetworkBridge(page);

  const lines = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const res = await safeGoto(page, r.url, venue, 'tags');
    let tag = '(page could not be read)';
    if (res.ok) {
      await page.waitForTimeout(1200);
      const head = (await page.innerText('body').catch(() => '')).slice(0, HEAD_CHARS);
      const m = head.match(TAG);
      tag = m ? m[0] : '(no tag found)';
    }
    const line = `${tag.padEnd(26)} | ${(r.start_date || '----------')} ${(r.end_date || '----------')} | ${r.title}`;
    lines.push(line);
    console.log(`${String(i + 1).padStart(3)}. ${line}`);
  }
  await browser.close();

  const out = path.join(run, `tags_${venue}.txt`);
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  console.log(`\nwritten to ${out}`);
})();
