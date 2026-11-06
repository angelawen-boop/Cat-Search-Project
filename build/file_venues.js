#!/usr/bin/env node
/*
 * file_venues.js — file the store's waiting venues into the venue register (docs/restructure.md, 4A).
 *
 *   node build/file_venues.js <store json file>    the store's `venues/occasional` record, as read
 *   --register <file>                               another register file (the tests' own copy)
 *
 * What the app learns at a manual import (a new venue, its name and place, its shop, her confirmation)
 * waits in the page's store and shows over the register until the next publish; this writes it in. For
 * each waiting record: a venue the register does not hold becomes a new entry, after the others; a venue
 * it holds takes each fact that changed since it was filed (name, card name, other names, city, country,
 * English-speaking; her names are never replaced by Claude's), and the record becomes the one its entry
 * was filed from. A record the register already holds is left alone, and so is one for a site another
 * venue's entry takes whole (read.sites). Writes venues/register.js and
 * nothing else; prints one line per venue filed. Exit 1 when the file cannot be read.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ri = args.indexOf('--register');
const REGISTER = ri >= 0 ? path.resolve(args[ri + 1]) : path.join(__dirname, '..', 'venues', 'register.js');
const storeFile = args.filter((a, i) => !a.startsWith('--') && !(ri >= 0 && i === ri + 1))[0];

// JS text for a value as the register writes it: non-ASCII escaped, keys bare where they can be.
function js(v) {
  if (v === null || v === undefined) return 'null';
  if (v instanceof RegExp) return String(v);
  if (Array.isArray(v)) return '[' + v.map(js).join(', ') + ']';
  if (typeof v === 'object') {
    const ks = Object.keys(v);
    return ks.length ? '{ ' + ks.map(k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + js(v[k])).join(', ') + ' }' : '{}';
  }
  if (typeof v === 'string') return JSON.stringify(v).replace(/[\u0080-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  return String(v);
}

// Two records alike, whatever the order of their fields (the app's sameRecord).
const canon = x => x === undefined ? 'null' : JSON.stringify(x, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(j => [j, v[j]])) : v);
const same = (a, b) => canon(a) === canon(b);

// The record fields the register holds elsewhere, and where (the app's STORE_FACTS).
const FACTS = {
  name: e => e.names.full, short: e => e.names.card, aka: e => e.names.aka,
  city: e => e.city, country: e => e.country, english: e => e.english,
};
const setFact = (e, k, v) => {
  if (k === 'name') e.names.full = v; else if (k === 'short') e.names.card = v; else if (k === 'aka') e.names.aka = v || [];
  else e[k] = k === 'english' ? (typeof v === 'boolean' ? v : null) : (v || null);
};
// The register's own record for an entry (the app's recordOf with no waiting record).
function recordOf(e) {
  const out = { ...(e.filed || {}) };
  for (const [k, f] of Object.entries(FACTS)) { const x = f(e); if (x != null) out[k] = x; }
  return out;
}

const entryText = e => '  { id: ' + js(e.id) + ', kind: ' + js(e.kind) + ',\n'
  + '    names: ' + js(e.names) + ',\n'
  + '    city: ' + js(e.city) + ', country: ' + js(e.country) + ', english: ' + js(e.english) + ', language: ' + js(e.language) + ',\n'
  + '    shop: ' + js(e.shop) + ',\n'
  + '    read: ' + js(e.read) + ',\n'
  + '    sweep: ' + js(e.sweep) + ',\n'
  + '    filed: ' + js(e.filed) + ' },\n';

function newEntry(id, w) {
  const card = w.short || w.name || null;
  return { id, kind: 'manual',
    names: { card, chip: null, group: null, full: w.name || null, inEnglish: null, aka: w.aka || [], replaced: [], hers: false },
    city: w.city || null, country: w.country || null, english: typeof w.english === 'boolean' ? w.english : null, language: null,
    shop: { home: null, catalogues: null, search: null, unseen: null, queries: [], named: null, rankAsOwn: [], inStock: null },
    read: { link: null, sites: [], dateOrder: null, spacedYear: false, places: [], placeOwner: null, titleCaps: null, subtitleUnderHeading: false },
    sweep: { exBase: null, listUrl: null }, filed: w };
}

// The register's text with each waiting record filed: { text, lines }.
function file(registerText, entries, waiting) {
  let text = registerText;
  const lines = [], added = [];
  const byId = Object.fromEntries(entries.map(e => [e.id, e]));
  for (const [id, w] of Object.entries(waiting || {})) {
    if (!w || !/^occ-/.test(id)) continue;
    const e = byId[id];
    // A record for a site another venue's entry takes whole (Christie's press site) is that venue's, not a new one.
    const host = String(w.host || '').toLowerCase().replace(/^www\./, '');
    const owner = !e && entries.find(x => x.read.sites.some(st => st.host === host && !st.path && !st.line));
    if (owner) { lines.push(id + ': not filed — its site is ' + owner.id + '\'s (read.sites)'); continue; }
    if (!e) { added.push(newEntry(id, w)); lines.push(id + ': new venue, "' + (w.short || w.name || id) + '"'); continue; }
    if (e.kind !== 'manual' || same(w, e.filed) || same(w, recordOf(e))) continue;
    const filed = e.filed || {}, changed = [];
    for (const k of Object.keys(FACTS)) {
      if (!(k in w) || same(w[k], filed[k]) || same(w[k], FACTS[k](e))) continue;
      if ((k === 'name' || k === 'short') && e.names.hers && FACTS[k](e) != null) continue;
      setFact(e, k, w[k]); changed.push(k);
    }
    e.filed = w;
    // The entry's lines the filing touches: its names, its place line and the record it was filed from.
    const at = text.indexOf('  { id: ' + js(id) + ', kind: ');
    const end = text.indexOf(' },\n', text.indexOf('\n    filed: ', at)) + 4;
    let block = text.slice(at, end);
    block = block.replace(/\n    names: .*,\n/, () => '\n    names: ' + js(e.names) + ',\n')
      .replace(/\n    city: .*, language: .*,\n/, () => '\n    city: ' + js(e.city) + ', country: ' + js(e.country) + ', english: ' + js(e.english) + ', language: ' + js(e.language) + ',\n')
      .replace(/\n    filed: [\s\S]*$/, () => '\n    filed: ' + js(e.filed) + ' },\n');
    text = text.slice(0, at) + block + text.slice(end);
    lines.push(id + ': filed' + (changed.length ? ' (' + changed.join(', ') + ' changed)' : ' (its shop and her confirmations)'));
  }
  // A new venue goes beside the register's last manual venue of its country, so the file keeps her
  // country order; one whose country is not yet held goes after the last manual venue that has a country.
  for (const e of added) {
    const all = (() => { try { return evalRegister(text); } catch { return entries; } })();
    const manual = all.filter(x => x.kind === 'manual' && x.country);
    const after = manual.filter(x => x.country === e.country).pop() || manual.pop();
    const at = after ? text.indexOf(' },\n', text.indexOf('\n    filed: ', text.indexOf('  { id: ' + js(after.id) + ', kind: '))) + 4 : text.lastIndexOf('\n];') + 1;
    text = text.slice(0, at) + '\n' + entryText(e) + text.slice(at);
  }
  return { text, lines };
}

// The register a text holds, read without writing it anywhere.
function evalRegister(text) { const m = { exports: {} }; new Function('module', 'exports', text)(m, m.exports); return m.exports.VENUES; }

// Her names from the venue review page (its store's `names/<id>` records, { wanted, at }), filed as each
// venue's card name: the name it replaces is kept in names.replaced, and the name is hers. A name the
// register already holds is left alone, and so is one typed before the last filing (NAMES_FILED_AT);
// `now` becomes the new NAMES_FILED_AT. { text, lines }.
function fileNames(registerText, names, now) {
  let text = registerText;
  const lines = [];
  const entries = evalRegister(text);
  const since = (() => { const m = { exports: {} }; new Function('module', 'exports', text)(m, m.exports); return m.exports.NAMES_FILED_AT || ''; })();
  for (const [id, n] of Object.entries(names || {})) {
    const wanted = n && typeof n === 'object' ? n.wanted : n, typedAt = n && typeof n === 'object' ? String(n.at || '') : '';
    if (typedAt && since && typedAt <= since) continue;
    const w = String(wanted || '').trim(), e = entries.find(x => x.id === id);
    if (!w || !e) { if (w) lines.push(id + ': not filed — no such venue'); continue; }
    if (e.names.card === w) continue;
    const names2 = { ...e.names, card: w, replaced: [...new Set([...(e.names.replaced || []), e.names.card].filter(Boolean))].filter(x => x !== w), hers: true };
    const at = text.indexOf('  { id: ' + js(id) + ', kind: ');
    const line = text.indexOf('\n    names: ', at), lineEnd = text.indexOf(',\n', line + 1);
    text = text.slice(0, line) + '\n    names: ' + js(names2) + text.slice(lineEnd);
    lines.push(id + ': her name "' + w + '" (was "' + e.names.card + '")');
  }
  if (now) text = text.replace(/const NAMES_FILED_AT = "[^"]*";/, 'const NAMES_FILED_AT = ' + JSON.stringify(now) + ';');
  return { text, lines };
}

module.exports = { file, fileNames, evalRegister, recordOf, newEntry, js };

if (require.main === module) {
  if (!storeFile) { console.log('usage: node build/file_venues.js <store json file> [--register <file>]'); process.exit(2); }
  let data;
  try { data = JSON.parse(fs.readFileSync(storeFile, 'utf8')); } catch (e) { console.error('file_venues: cannot read ' + storeFile + ' — ' + e.message); process.exit(1); }
  const waiting = data && data.venues && typeof data.venues === 'object' ? data.venues : data;
  delete require.cache[require.resolve(REGISTER)];
  const { VENUES } = require(REGISTER);
  const r = file(fs.readFileSync(REGISTER, 'utf8'), VENUES, waiting);
  if (r.text !== fs.readFileSync(REGISTER, 'utf8')) fs.writeFileSync(REGISTER, r.text);
  for (const l of r.lines) console.log(l);
  const n = r.lines.filter(l => !/: not filed/.test(l)).length;
  console.log(n ? n + ' venue(s) filed into ' + path.relative(process.cwd(), REGISTER) + '.' : 'Nothing to file: the register holds every waiting venue.');
}
