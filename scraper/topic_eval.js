#!/usr/bin/env node
/**
 * Test the topic labeller ("Probably not for you", CLAUDE.md §2.2.7) on her own
 * decisions, before it is trusted on a sweep.
 *
 *   node scraper/topic_eval.js <store dir> --jobs     write the job files
 *   node scraper/topic_eval.js <store dir> --score    score topic_answers.json
 *
 * <store dir> holds the test page's store read out with ArtifactData:
 * quarantine/rows.json and ledger.json (the live ledger, unzipped). Her
 * quarantined shows should mostly be caught; her watched and want-catalogue
 * shows should almost never be. Sized by her (CLAUDE.md §2.2.7): every
 * quarantined show plus KEPT_SAMPLE kept ones spread across venues, in at most
 * two job files (two model calls) — never her whole ledger. Each show's text is the newest raw text any
 * sweep holds for its address — what the labeller would have been given — else
 * the ledger's own summary. The job files are the real ones (topicJobLines),
 * mixed, with nothing saying which pile a show came from.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./compress.js');

const OUTPUT_DIR = path.join(__dirname, 'output');
const KEPT_SAMPLE = 40;
const MAX_JOBS = 2;

function newestRaw() {
  const raw = new Map();
  for (const d of fs.readdirSync(OUTPUT_DIR).sort()) {
    const dir = path.join(OUTPUT_DIR, d);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.csv') || f.includes('compressed')) continue;
      let rows; try { rows = C.readProForma(path.join(dir, f)); } catch { continue; }
      for (const r of rows) if (r.url && r.summary) raw.set(C.urlKey(r), r.summary);
    }
  }
  return raw;
}

function items(store) {
  const raw = newestRaw();
  const q = JSON.parse(fs.readFileSync(path.join(store, 'quarantine', 'rows.json'), 'utf8'));
  const qrows = (q.data || q).rows;
  const ledger = JSON.parse(fs.readFileSync(path.join(store, 'ledger.json'), 'utf8')).rows;
  const out = [];
  for (const [k, v] of Object.entries(qrows)) {
    if (v.state !== 'blocked') continue;
    const venue = k.slice(0, k.indexOf('|')), url = k.slice(k.indexOf('|') + 1);
    out.push({ pile: 'quarantined', venue, title: v.title, url, raw: raw.get(C.urlKey({ venue_code: venue, url })) || '' });
  }
  // Kept: one per venue in turn (venues and titles in alphabetical order), so
  // the sample is spread across venues and the same every time.
  const byVenue = new Map();
  for (const r of ledger) {
    if (!(r.watching === true || r.acquiring === 'yes' || r.acquiring === 'acquired')) continue;
    if (!byVenue.has(r.museumId)) byVenue.set(r.museumId, []);
    byVenue.get(r.museumId).push(r);
  }
  const queues = [...byVenue.keys()].sort().map(v => byVenue.get(v).sort((a, b) => String(a.title).localeCompare(String(b.title))));
  let kept = 0;
  for (let round = 0; kept < KEPT_SAMPLE && queues.some(q => q.length > round); round++) {
    for (const q of queues) {
      if (kept >= KEPT_SAMPLE || q.length <= round) continue;
      const r = q[round], url = r.exUrl || '';
      out.push({ pile: 'kept', venue: r.museumId, title: r.title, url, raw: raw.get(C.urlKey({ venue_code: r.museumId, url })) || r.summary || '' });
      kept++;
    }
  }
  // Mixed by a fixed shuffle, so neither pile sits together in a job.
  out.forEach((x, i) => { x.index = i; });
  return { all: out, order: [...out].sort((a, b) => ((a.index * 7919) % 997) - ((b.index * 7919) % 997)) };
}

function main([store, flag]) {
  if (!store || !['--jobs', '--score'].includes(flag)) { console.log('usage: topic_eval.js <store dir> --jobs|--score'); process.exit(1); }
  const { all, order } = items(store);
  if (flag === '--jobs') {
    const size = Math.ceil(order.length / MAX_JOBS);
    for (const f of fs.readdirSync(store)) if (/^job_topics_\d+\.txt$/.test(f)) fs.unlinkSync(path.join(store, f));
    for (let i = 0; i < order.length; i += size) {
      fs.writeFileSync(path.join(store, `job_topics_${i / size + 1}.txt`), C.topicJobLines(order.slice(i, i + size)).join('\n'), 'utf8');
    }
    const venues = new Set(all.filter(x => x.pile === 'kept').map(x => x.venue)).size;
    console.log(`${all.length} shows (${all.filter(x => x.pile === 'quarantined').length} quarantined, ${all.filter(x => x.pile === 'kept').length} kept from ${venues} venues) in ${Math.ceil(order.length / size)} job files.`);
    return;
  }
  const answers = JSON.parse(fs.readFileSync(path.join(store, 'topic_answers.json'), 'utf8'));
  const missing = all.filter(x => !(String(x.index) in answers));
  if (missing.length) { console.log(`${missing.length} shows have no answer — nothing scored.`); process.exit(1); }
  const res = all.map(x => {
    const t = C.resolveTopic(answers[String(x.index)], x.venue);
    if (!t.ok) { console.log(`[${x.index}] ${t.reason}`); process.exit(1); }
    return { ...x, label: t.note.replace(C.TOPIC_PREFIX, '').replace(/\.$/, '') };
  });
  const lines = [];
  for (const pile of ['quarantined', 'kept']) {
    const p = res.filter(x => x.pile === pile), hit = p.filter(x => x.label);
    lines.push(`${pile}: ${hit.length} of ${p.length} labelled`);
  }
  lines.push('');
  for (const [pile, want] of [['quarantined', false], ['kept', true]]) {
    lines.push(want ? '── KEPT BUT LABELLED (would be set aside wrongly)' : '── QUARANTINED, NOT CAUGHT');
    for (const x of res.filter(r => r.pile === pile && !!r.label === want)) lines.push(`  ${x.venue.padEnd(8)} ${x.title}${x.label ? `  →  ${x.label}` : ''}`);
    lines.push('');
  }
  lines.push('── QUARANTINED AND CAUGHT');
  for (const x of res.filter(r => r.pile === 'quarantined' && r.label)) lines.push(`  ${x.venue.padEnd(8)} ${x.title}  →  ${x.label}`);
  const text = lines.join('\n');
  fs.writeFileSync(path.join(store, 'topic_eval.txt'), text + '\n', 'utf8');
  console.log(text);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { items };
