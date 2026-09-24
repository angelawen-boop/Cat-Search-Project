/**
 * The input for this compression, 24 Sep: her current import file's 419 rows
 * (stitch_20260913_0442/sweep_titles_24sep.csv — titles corrected that day),
 * each given back the museum's ORIGINAL curatorial text from the 13 Sep sweep
 * (stitch_20260913_0442/sweep.csv), matched by address AND sweep time, so two
 * sweeps of one exhibition cannot be confused. Compression then reuses every
 * description whose text is unchanged and asks only for what is missing: the
 * English titles under her 24 Sep format.
 *
 *   node build_input.js     writes sweep.csv beside it; lists any row unmatched
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('../../compress.js');
const SRC = path.join(__dirname, '..', 'stitch_20260913_0442');
const file = C.readProForma(path.join(SRC, 'sweep_titles_24sep.csv'));
const raw = C.readProForma(path.join(SRC, 'sweep.csv'));
// By address. Where the 13 Sep stitch holds two DIFFERENT texts for one
// address (its raw file carries no sweep times), the row's swept_at names the
// run it came from: the source run that started last before that moment and
// holds this venue's file. One correct answer, from the folders on disk.
const OUT = path.join(__dirname, '..');
const runs = fs.readFileSync(path.join(SRC, 'sources.txt'), 'utf8').split('\n').map(x => x.trim()).filter(Boolean);
// The EXACT address first. urlKey() drops "past" from a path on purpose, so a
// show moving to the past section still matches itself — which also makes the
// Rijksmuseum's two Ed van der Elsken shows (/ed-van-der-elsken, Up Close, and
// /past/ed-van-der-elsken, an older one) look like one.
const exact = new Map(), texts = new Map();
const put = (m, k, t) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(t); };
for (const r of raw) { put(exact, `${r.venue_code}|${r.url}`, r.summary); put(texts, C.urlKey(r), r.summary); }
function fromRun(r) {
  const at = Date.parse(r.swept_at);
  const run = runs
    .filter(d => fs.existsSync(path.join(OUT, d, `${r.venue_code}.csv`)) && C.dirInstant(d) <= at)
    .sort((a, b) => C.dirInstant(b) - C.dirInstant(a))[0];
  if (!run) return null;
  const all = C.readProForma(path.join(OUT, run, `${r.venue_code}.csv`));
  const same = all.filter(x => x.url === r.url);
  const hits = same.length ? same : all.filter(x => C.urlKey(x) === C.urlKey(r));
  const set = new Set(hits.map(x => x.summary));
  return set.size === 1 ? { text: [...set][0], run } : null;
}
const unmatched = [], resolved = [];
const out = file.map(r => {
  if (String(r.title).startsWith('[')) return { ...r, summary: '' };
  const ex = exact.get(`${r.venue_code}|${r.url}`);
  if (ex && ex.size === 1) return { ...r, summary: [...ex][0] };
  const set = texts.get(C.urlKey(r));
  if (set && set.size === 1) return { ...r, summary: [...set][0] };
  const got = set ? fromRun(r) : null;
  if (got) { resolved.push(`${r.venue_code} | ${r.title} ← ${got.run}`); return { ...r, summary: got.text }; }
  unmatched.push(`${r.venue_code} | ${r.title} | ${set ? set.size + ' texts' : 'no match'}`);
  return { ...r, summary: '' };
});
C.writeCsv(path.join(__dirname, 'sweep.csv'), out);
console.log(`${out.length} rows written; ${resolved.length} resolved by run; ${unmatched.length} unmatched`);
resolved.forEach(u => console.log('  resolved: ' + u));
unmatched.forEach(u => console.log('  ' + u));
