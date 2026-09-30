#!/usr/bin/env node
/*
 * DOC BUDGETS — her ruling, 30 Sep 2026.
 *
 * The guide grew from 1,392 to 1,621 lines in three days, almost all of it
 * run-by-run stories, and the side docs had grown to 4,400 lines of the same.
 * Each file here has a line budget. Over budget means a clean-up is due.
 *
 * It WARNS and never fails `npm test`, on purpose: her experience is that the
 * session that made a mess cleans it up badly, so the clean-up belongs to a
 * separate session run away from active work — not to whichever session
 * happens to trip the line mid-task. `--strict` exits 1 when over, for that
 * clean-up session to use as its finish line.
 *
 * A file not listed gets DEFAULT_BUDGET. Raising a budget is her call.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_BUDGET = 80;
const BUDGETS = {
  'CLAUDE.md': 1150,
  'docs/app.md': 500,
  'docs/scraper.md': 475,
  'docs/venues.md': 250,
  'docs/compression.md': 130,
  'docs/library.md': 110,
  'docs/venue_urls.md': 90,
  'docs/picked_shows.md': 90,
  'docs/import-file.md': 80,
  'docs/review-2026-09-12.md': 70,
  'docs/review-log.md': 60,
  'docs/morgan_pages/README.md': 80,
};

function markdownFiles() {
  const out = ['CLAUDE.md'];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.md')) out.push(rel);
    }
  };
  walk('docs');
  return out;
}

function report() {
  return markdownFiles().map((f) => {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').length;
    const budget = BUDGETS[f] ?? DEFAULT_BUDGET;
    return { file: f, lines, budget, over: lines > budget };
  });
}

if (require.main === module) {
  const rows = report();
  const over = rows.filter((r) => r.over);
  for (const r of rows) {
    console.log(`${r.over ? 'OVER' : 'ok  '}  ${String(r.lines).padStart(5)} / ${String(r.budget).padEnd(5)} ${r.file}`);
  }
  if (over.length) {
    console.log(`\nDoc budgets: ${over.length} file(s) over budget — a guide clean-up session is due. Not a test failure.`);
  } else {
    console.log('\nDoc budgets: every file within budget.');
  }
  if (process.argv.includes('--strict') && over.length) process.exit(1);
}

module.exports = { report, BUDGETS, DEFAULT_BUDGET };
