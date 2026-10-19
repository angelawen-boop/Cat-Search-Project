// npm test — every suite, side by side (one per processor), each one's output
// printed whole and in list order. Exit code 1 if ANY suite failed; every
// suite runs either way, so one failure never hides the rest.
//
// RUN ONLY THE GROUP FOR THE WORK IN HAND (docs/testing.md). App-only work was
// running the scraper suites, and Add by link work the cloud-saving ones, so a
// session reported failures in suites that had nothing to do with its change.
//   npm run test:links     Add by link — reading a pasted page, venue link rules
//   npm run test:lookup    the shop finder and catalogue lookup
//   npm run test:saving    the cloud ledger, Save and Load
//   npm run test:screen    the import screen, cards, sorting, display
//   npm run test:app       the whole app half — once, before publishing
//   npm run test:scraper   scraper/ — the sweep, its recipes, QC, compression
//   npm run test:shelf     Theme Shelf, the separate page (docs/themes.md)
//   npm test               both halves — the shared date reader or summary rules
// A suite tagged with both halves is where they genuinely meet: the app
// importing a scraper CSV, the shared date reader and summary rules, Add by
// link reading the scraper's venue list, compression reading the app's seed.
//
// A suite only one branch has goes in scraper/fixtures/branch_tests.txt on that
// branch (one command per line) — never in this list. Main never touches that
// file, so merging main into a branch never clashes over the test list. Those
// suites run with every app group (today there are none).

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const APP = 'app', SCRAPER = 'scraper', BOTH = [APP, SCRAPER];
const LINKS = 'links', LOOKUP = 'lookup', SAVING = 'saving', SCREEN = 'screen', SHELF = 'shelf';
const GROUPS = [APP, SCRAPER, LINKS, LOOKUP, SAVING, SCREEN, SHELF];
// Run one at a time, before the rest, with the machine to itself: the cloud-saving
// suites wait 8 seconds for a save, and failed only when other suites crowded the machine.
const ALONE = 'alone';
// Quick checks every app group runs: the import, and the page opens and draws.
const EVERY_APP = [APP, LINKS, LOOKUP, SAVING, SCREEN];
const SUITES = [
  [SCRAPER, 'node --test scraper/date.test.js scraper/qc.test.js scraper/sweep_log.test.js scraper/venue_status.test.js scraper/pacing.test.js scraper/sweep_diff.test.js scraper/routine_window.test.js'],
  [BOTH,    'node --test scraper/compress.test.js'],
  [[...EVERY_APP, SCRAPER], 'node scraper/fixtures/intake_cases.js'],
  [EVERY_APP, 'node scraper/fixtures/page_loads.js'],
  [EVERY_APP, 'node scraper/fixtures/page_renders.js'],
  [[APP, SCREEN], 'node scraper/fixtures/app_decisions.js'],
  [[APP, SCREEN], 'node scraper/fixtures/list_drawing.js'],
  [[APP, LOOKUP], 'node scraper/fixtures/catalogue_lookup.js'],
  [[APP, LOOKUP], 'node scraper/fixtures/catalogue_route.js'],
  [[APP, LOOKUP], 'node scraper/fixtures/recheck_shop.js'],
  [[APP, LOOKUP], 'node scraper/fixtures/lookup_log.js'],
  [[APP, SAVING], 'node scraper/fixtures/cloud_ledger.js', ALONE],
  [[APP, SAVING], 'node scraper/fixtures/cloud_app.js', ALONE],
  [[APP, SAVING], 'node scraper/fixtures/cloud_two_copies.js', ALONE],
  [[APP, SAVING], 'node scraper/fixtures/cloud_empty_import.js', ALONE],
  [SCRAPER, 'node scraper/fixtures/summary_pages.js'],
  [SCRAPER, 'node scraper/fixtures/orsay_pages.js'],
  [SCRAPER, 'node scraper/fixtures/pacing_pages.js'],
  [SCRAPER, 'node scraper/fixtures/mam_pages.js'],
  [SCRAPER, 'node scraper/fixtures/mad_pages.js'],
  [SCRAPER, 'node scraper/fixtures/brit_pages.js'],
  [SCRAPER, 'node scraper/fixtures/morgan_pages.js'],
  [SCRAPER, 'node scraper/fixtures/title_case_pages.js'],
  [SCRAPER, 'node scraper/fixtures/listing_pages.js'],
  [SCRAPER, 'node scraper/fixtures/met_exclusion_pages.js'],
  [SCRAPER, 'node scraper/fixtures/page_keep_pages.js'],
  [SCRAPER, 'node scraper/fixtures/moma_pages.js'],
  [SCRAPER, 'node scraper/fixtures/ashmolean_pages.js'],
  [SCRAPER, 'node scraper/fixtures/cincinnati_pages.js'],
  [SCRAPER, 'node scraper/fixtures/va_pages.js'],
  [SCRAPER, 'node scraper/fixtures/description_pages_oct.js'],
  [SCRAPER, 'node scraper/fixtures/bridge_reuse.js'],
  [SCRAPER, 'node scraper/fixtures/robots_pages.js'],
  [[...BOTH, LINKS, LOOKUP], 'node build/sync_shared.js --check'],
  [[...BOTH, LINKS, LOOKUP], 'node scraper/fixtures/add_by_link.js'],
  [[APP, LINKS], 'node scraper/fixtures/add_by_page.js'],
  // Theme Shelf copies Cat Watch's ISBN, bookseller and saved-page code, so any app
  // group checks the copy still matches.
  [[...EVERY_APP, SHELF], 'node build/sync_shelf.js --check'],
  [[APP, SHELF], 'node scraper/fixtures/theme_shelf.js'],
];

const half = process.argv[2];
if (half && !GROUPS.includes(half)) {
  console.error(`Unknown group "${half}" — use ${GROUPS.join(', ')}, or nothing for both halves.`);
  process.exit(2);
}
const chosen = SUITES.filter(([tags]) => !half || [].concat(tags).includes(half));
const alone = new Set(chosen.filter(([, , how]) => how === ALONE).map(([, cmd]) => cmd));
const picked = chosen.map(([, cmd]) => cmd);

const branchFile = path.join(ROOT, 'scraper/fixtures/branch_tests.txt');
const branchSuites = fs.existsSync(branchFile)
  ? fs.readFileSync(branchFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  : [];

// The doc budget and the guide check warn and never fail; they run last, on their
// own, so their report is the final thing printed.
const all = [...picked, ...(half === SCRAPER ? [] : branchSuites)];
const LAST = 'node scraper/doc_budget.js && node scraper/guide_check.js';

function run(cmd) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const child = spawn(cmd, { cwd: ROOT, shell: true });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('close', code => resolve({ cmd, code, out, secs: (Date.now() - t0) / 1000 }));
  });
}

async function main() {
  const t0 = Date.now();
  const jobs = Math.max(1, os.cpus().length);
  console.log(`Running ${all.length} suites (${half || 'app and scraper'}), ${jobs} at a time` +
    (branchSuites.length && half !== SCRAPER ? ` (${branchSuites.length} from this branch's branch_tests.txt)` : '') + '.');

  const results = new Array(all.length);
  let next = 0, printed = 0;
  const flush = () => {
    while (printed < all.length && results[printed]) {
      const r = results[printed++];
      console.log(`\n===== ${r.code === 0 ? 'PASS' : 'FAIL'} (${r.secs.toFixed(1)}s) ${r.cmd}`);
      process.stdout.write(r.out);
    }
  };
  const worker = async () => {
    while (next < all.length) {
      const i = next++;
      if (results[i]) continue;
      results[i] = await run(all[i]);
      flush();
    }
  };
  for (let i = 0; i < all.length; i++) if (alone.has(all[i])) results[i] = await run(all[i]);
  flush();
  await Promise.all(Array.from({ length: Math.min(jobs, all.length) }, worker));

  const last = await run(LAST);
  console.log(`\n===== ${LAST}`);
  process.stdout.write(last.out);

  const failed = results.filter(r => r.code !== 0);
  console.log(`\n${all.length - failed.length} of ${all.length} suites passed in ${((Date.now() - t0) / 1000).toFixed(0)}s.`);
  for (const r of failed) console.log(`FAILED (exit ${r.code}): ${r.cmd}`);
  process.exit(failed.length || last.code ? 1 : 0);
}

main();
