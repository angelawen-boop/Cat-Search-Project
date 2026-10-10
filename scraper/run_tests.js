// npm test — every suite, side by side (one per processor), each one's output
// printed whole and in list order. Exit code 1 if ANY suite failed; every
// suite runs either way, so one failure never hides the rest.
//
// RUN THE HALF YOU CHANGED (her ruling, 7 Oct) — a plumber does not test the
// wiring:
//   npm run test:app       Cat_Watch.jsx, build/ — the app and its lookup
//   npm run test:scraper   scraper/ — the sweep, its recipes, QC, compression
//   npm test               both — only when a change touches both halves
// A suite tagged with both halves is where they genuinely meet: the app
// importing a scraper CSV, the shared date reader and summary rules, Add by
// link reading the scraper's venue list, compression reading the app's seed.
//
// A suite only one branch has goes in scraper/fixtures/branch_tests.txt on that
// branch (one command per line) — never in this list. Main never touches that
// file, so merging main into a branch never clashes over the test list. Those
// suites run with the app half (today they are the cloud ledger's).

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const APP = 'app', SCRAPER = 'scraper', BOTH = [APP, SCRAPER];
const SUITES = [
  [SCRAPER, 'node --test scraper/date.test.js scraper/qc.test.js scraper/sweep_log.test.js scraper/venue_status.test.js scraper/pacing.test.js scraper/sweep_diff.test.js'],
  [BOTH,    'node --test scraper/compress.test.js'],
  [BOTH,    'node scraper/fixtures/intake_cases.js'],
  [APP,     'node scraper/fixtures/page_loads.js'],
  [APP,     'node scraper/fixtures/page_renders.js'],
  [APP,     'node scraper/fixtures/app_decisions.js'],
  [APP,     'node scraper/fixtures/catalogue_lookup.js'],
  [APP,     'node scraper/fixtures/catalogue_route.js'],
  [APP,     'node scraper/fixtures/catalogue_versions.js'],
  [APP,     'node scraper/fixtures/recheck_shop.js'],
  [APP,     'node scraper/fixtures/lookup_log.js'],
  [SCRAPER, 'node scraper/fixtures/summary_pages.js'],
  [SCRAPER, 'node scraper/fixtures/orsay_pages.js'],
  [SCRAPER, 'node scraper/fixtures/pacing_pages.js'],
  [SCRAPER, 'node scraper/fixtures/mam_pages.js'],
  [SCRAPER, 'node scraper/fixtures/mad_pages.js'],
  [SCRAPER, 'node scraper/fixtures/brit_pages.js'],
  [SCRAPER, 'node scraper/fixtures/morgan_pages.js'],
  [SCRAPER, 'node scraper/fixtures/title_case_pages.js'],
  [SCRAPER, 'node scraper/fixtures/listing_pages.js'],
  [SCRAPER, 'node scraper/fixtures/page_keep_pages.js'],
  [SCRAPER, 'node scraper/fixtures/moma_pages.js'],
  [SCRAPER, 'node scraper/fixtures/ashmolean_pages.js'],
  [SCRAPER, 'node scraper/fixtures/cincinnati_pages.js'],
  [SCRAPER, 'node scraper/fixtures/va_pages.js'],
  [SCRAPER, 'node scraper/fixtures/description_pages_oct.js'],
  [SCRAPER, 'node scraper/fixtures/bridge_reuse.js'],
  [SCRAPER, 'node scraper/fixtures/robots_pages.js'],
  [BOTH,    'node build/sync_shared.js --check'],
  [BOTH,    'node scraper/fixtures/add_by_link.js'],
];

const half = process.argv[2];
if (half && half !== APP && half !== SCRAPER) {
  console.error(`Unknown half "${half}" — use app, scraper, or nothing for both.`);
  process.exit(2);
}
const picked = SUITES.filter(([tags]) => !half || [].concat(tags).includes(half)).map(([, cmd]) => cmd);

const branchFile = path.join(ROOT, 'scraper/fixtures/branch_tests.txt');
const branchSuites = fs.existsSync(branchFile)
  ? fs.readFileSync(branchFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  : [];

// The doc budget warns and never fails; it runs last, on its own, so its
// report is the final thing printed.
const all = [...picked, ...(half === SCRAPER ? [] : branchSuites)];
const LAST = 'node scraper/doc_budget.js';

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
      results[i] = await run(all[i]);
      flush();
    }
  };
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
