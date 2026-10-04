// npm test — every suite, side by side (one per processor), each one's output
// printed whole and in list order. Exit code 1 if ANY suite failed; every
// suite runs either way, so one failure never hides the rest.
//
// A suite only one branch has goes in scraper/fixtures/branch_tests.txt on that
// branch (one command per line) — never in this list. Main never touches that
// file, so merging main into a branch never clashes over the test list.

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SUITES = [
  'node --test scraper/date.test.js scraper/compress.test.js scraper/qc.test.js scraper/sweep_log.test.js scraper/venue_status.test.js scraper/pacing.test.js scraper/sweep_diff.test.js',
  'node scraper/fixtures/intake_cases.js',
  'node scraper/fixtures/page_loads.js',
  'node scraper/fixtures/page_renders.js',
  'node scraper/fixtures/catalogue_lookup.js',
  'node scraper/fixtures/recheck_shop.js',
  'node scraper/fixtures/summary_pages.js',
  'node scraper/fixtures/orsay_pages.js',
  'node scraper/fixtures/pacing_pages.js',
  'node scraper/fixtures/mam_pages.js',
  'node scraper/fixtures/mad_pages.js',
  'node scraper/fixtures/brit_pages.js',
  'node scraper/fixtures/morgan_pages.js',
  'node scraper/fixtures/title_case_pages.js',
  'node scraper/fixtures/listing_pages.js',
  'node scraper/fixtures/page_keep_pages.js',
  'node scraper/fixtures/moma_pages.js',
  'node scraper/fixtures/ashmolean_pages.js',
  'node scraper/fixtures/cincinnati_pages.js',
  'node scraper/fixtures/bridge_reuse.js',
  'node scraper/fixtures/robots_pages.js',
  'node build/sync_shared.js --check',
  'node scraper/fixtures/add_by_link.js',
];

const branchFile = path.join(ROOT, 'scraper/fixtures/branch_tests.txt');
const branchSuites = fs.existsSync(branchFile)
  ? fs.readFileSync(branchFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  : [];

// The doc budget warns and never fails; it runs last, on its own, so its
// report is the final thing printed.
const all = [...SUITES, ...branchSuites];
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
  console.log(`Running ${all.length} suites, ${jobs} at a time` +
    (branchSuites.length ? ` (${branchSuites.length} from this branch's branch_tests.txt)` : '') + '.');

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
