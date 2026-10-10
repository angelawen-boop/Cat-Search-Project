// lookup_proof_check.js — checks live catalogue lookups against her nine agreed cases
// (docs/lookup_proof_cards.json). Save the lookup log first (build/lookup_log.js says
// how), then:
//
//   node build/lookup_proof_check.js <saved dir>
//
// For each case, the newest finished lookup whose card is at that venue and carries every
// `match` word is compared with the case: the versions found (card after, `editions`) and
// the pick (`editionPick`, an index into `editions`). Prints each difference; exit 1 on
// any. A case with no lookup in the log is listed and is not a difference.
'use strict';
const fs = require('fs');
const path = require('path');
const { readRecord, listRecords } = require('./lookup_log.js');

const CARDS = path.join(__dirname, '..', 'docs', 'lookup_proof_cards.json');
const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u00f8/g, 'o').toLowerCase();
const words = s => fold(s).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !['editions', 'edition', 'the', 'and', 'books', 'musee', 'museum'].includes(w));
const isEnglish = l => /\b(english|anglais|inglese|englisch|engels)\b/i.test(String(l || ''));
const sameLang = (a, b) => isEnglish(a) === isEnglish(b) && (isEnglish(a) || fold(a).split(/[^a-z]+/)[0] === fold(b).split(/[^a-z]+/)[0]);
// One house in common is enough: a publisher's name is written many ways.
const samePublisher = (want, got) => !want || words(want).some(w => words(got).some(g => g.includes(w) || w.includes(g)));

// The differences between one case and one record's card after the lookup.
function compare(card, after) {
  const out = [];
  const got = Array.isArray(after && after.editions) ? after.editions : null;
  if (!got) return ['the card carries no versions (editions) — was this lookup run before versions were built?'];
  const used = new Set();
  for (const want of card.versions) {
    const v = got.find(x => x && (x.isbn13 === want.isbn13 || x.alsoIsbn13 === want.isbn13));
    if (!v) { out.push('missing: ' + want.lang + ' ' + want.isbn13 + ' (' + want.publisher + ', ' + want.showing + ')'); continue; }
    used.add(v);
    const d = [];
    if (v.isbn13 !== want.isbn13) d.push('leads with ' + v.isbn13);
    if ((v.alsoIsbn13 || null) !== want.alsoIsbn13) d.push('also ' + v.alsoIsbn13 + ', wanted ' + want.alsoIsbn13);
    if (v.showing !== want.showing) d.push('showing ' + v.showing + ', wanted ' + want.showing);
    if (!sameLang(v.lang, want.lang)) d.push('language ' + v.lang + ', wanted ' + want.lang);
    if (want.binding && v.binding !== want.binding) d.push('binding ' + v.binding + ', wanted ' + want.binding);
    if (want.pages && v.pages !== want.pages) d.push('pages ' + v.pages + ', wanted ' + want.pages);
    if (!samePublisher(want.publisher, v.publisher)) d.push('publisher “' + v.publisher + '”, wanted “' + want.publisher + '”');
    if (d.length) out.push(want.isbn13 + ': ' + d.join('; '));
  }
  for (const v of got) if (!used.has(v)) out.push('unexpected version: ' + v.lang + ' ' + v.isbn13 + ' (' + v.publisher + ', ' + v.showing + ')');
  for (const n of card.leftOff || []) if (got.some(v => v && (v.isbn13 === n || v.alsoIsbn13 === n))) out.push('left-off book listed: ' + n);
  // editionPick is an index into editions; the case names the picked version by its ISBN.
  const i = after.editionPick;
  const pick = Number.isInteger(i) ? (got[i] ? got[i].isbn13 || 'version ' + i + ' (no ISBN)' : 'version ' + i + ' (missing)') : null;
  if (pick !== card.pick) out.push('picked ' + pick + ', wanted ' + card.pick);
  return out;
}

function matches(card, rec) {
  const c = rec && rec.card;
  if (!c || c.museumId !== card.venue) return false;
  const t = fold(c.title);
  return card.match.every(w => t.includes(fold(w)));
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error('Usage: node build/lookup_proof_check.js <saved dir of lookup-log records>'); process.exit(2); }
  const cards = JSON.parse(fs.readFileSync(CARDS, 'utf8')).cards;
  const records = [];
  for (const r of listRecords(dir)) {
    if (!r.complete) continue;
    try { const { record } = readRecord(dir, r.id); if (record && record.after && !record.link) records.push({ id: r.id, record }); }
    catch (e) { console.log('Unreadable record ' + r.id + ': ' + e.message); }
  }
  let bad = 0;
  for (const card of cards) {
    const hit = records.find(x => matches(card, x.record));   // newest first
    const head = 'Case ' + card.case + ' — ' + card.title + ' (' + card.venue + ')';
    if (!hit) { console.log(head + ': no lookup in the log.'); continue; }
    const diffs = compare(card, hit.record.after);
    if (!diffs.length) { console.log(head + ': as agreed (' + hit.id + ').'); continue; }
    bad++;
    console.log(head + ': ' + diffs.length + ' difference' + (diffs.length === 1 ? '' : 's') + ' (' + hit.id + ')');
    for (const d of diffs) console.log('   ' + d);
  }
  console.log(bad ? bad + ' case' + (bad === 1 ? '' : 's') + ' differ.' : 'Every case found in the log is as agreed.');
  process.exit(bad ? 1 : 0);
}

module.exports = { compare, matches };
