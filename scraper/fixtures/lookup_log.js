/*
 * lookup_log.js — the lookup log (Cat_Watch.jsx, "THE LOOKUP LOG"), run against a
 * store played by a script and read back with build/lookup_log.js.
 *
 * Proves: a lookup's record holds every call's input and full answer and Claude's
 * exact answer (LL-001, LL-002); the card before and after (LL-003); a large record
 * splits under the store's cap and reads back whole (LL-004); only the newest 50 are
 * kept, pieces included (LL-005); no store, or a failing one, never breaks a lookup
 * (LL-006, LL-007); calls outside a lookup are not recorded (LL-008).
 *
 *   node scraper/fixtures/lookup_log.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const React = require('react');
const reader = require('../../build/lookup_log.js');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-log-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* the emit is what matters */ }
const built = path.join(tmp, 'app.js');
if (!fs.existsSync(built)) { console.log('FAIL  the page did not transpile'); process.exit(1); }
const code = fs.readFileSync(built, 'utf8');

let failures = 0;
function fail(m) { console.log('FAIL  ' + m); failures++; }
function pass(m) { console.log('PASS  ' + m); }
function eq(got, want, m) {
  if (JSON.stringify(got) === JSON.stringify(want)) pass(m);
  else fail(m + ' — got ' + JSON.stringify(got) + ', wanted ' + JSON.stringify(want));
}
function ok(cond, m, got) { if (cond) pass(m); else fail(m + (got !== undefined ? ' — got: ' + got : '')); }

// A store with documents by path: just what the log uses.
function fakeDb(opts) {
  const docs = new Map();
  const o = opts || {};
  const docRef = p => ({
    set: async d => { if (o.broken) throw { code: 'unavailable' }; docs.set(p, { ...d }); },
    update: async d => { docs.set(p, { ...(docs.get(p) || {}), ...d }); },
    get: async () => ({ id: p.split('/').pop(), exists: docs.has(p), data: () => docs.get(p) }),
    delete: async () => { docs.delete(p); },
    collection: name => colRef(p + '/' + name),
  });
  const colRef = c => {
    let order = null, lim = 1000;
    const q = {
      doc: id => docRef(c + '/' + id),
      orderBy: (f, dir) => { order = [f, dir]; return q; },
      limit: n => { lim = n; return q; },
      get: async () => {
        let list = [...docs.entries()].filter(([k]) => k.startsWith(c + '/') && !k.slice(c.length + 1).includes('/'))
          .map(([k, v]) => ({ id: k.split('/').pop(), exists: true, data: () => v }));
        if (order) list.sort((a, b) => String(a.data()[order[0]]).localeCompare(String(b.data()[order[0]])) * (order[1] === 'desc' ? -1 : 1));
        list = list.slice(0, lim);
        return { docs: list, size: list.length, empty: !list.length };
      },
    };
    return q;
  };
  return { docs, api: { doc: docRef, collection: colRef } };
}

function lift(script, db) {
  const win = { document: {}, localStorage: {}, claude: { use: async name => {
    if (name === 'mcp') return { callTool: async (server, tool, args) => script.mcp(tool, args) };
    if (name === 'sample') return { json: async prompt => script.sample(prompt) };
    if (name === 'db') return db || null;
    return null;
  } } };
  return new Function('React', 'window', 'document', 'localStorage',
    code + '\n;return { lookupCatalogue, tapeStart, saveLookupTape, searchWeb, LOOKUP_PIECE, LOOKUP_KEEP };')(
    React, win, win.document, win.localStorage);
}

// The store as ArtifactData saves it with out_dir: <dir>/<collection>/<doc>.json.
function saveToDir(docs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-logdir-'));
  for (const [k, v] of docs) {
    const f = path.join(dir, k + '.json');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify({ data: v, version: 1 }));
  }
  return dir;
}

const row = { id: 'met-hr', museumId: 'met', title: 'Hubert Robert, 1733–1808', startDate: '2016-06-26', endDate: '2016-10-02',
  summary: 'x', exUrl: 'https://x.test/hr', interested: true, watching: false, acquiring: null, looked: false,
  hasCatalogue: 'unknown', catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, publisherResult: null,
  shopUrl: null, shopState: null, shopChange: null };
const PRESS = 'Published in association with Lund Humphries, the accompanying catalog richly illuminates Robert.';
const script = {
  mcp: tool => tool === 'web_search'
    ? { payload: { results: [{ url: 'https://press.test/hr', title: 'Press release', excerpts: [PRESS] }] } }
    : { payload: { results: [], errors: [] } },
  sample: () => ({ found: false, catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, shopUrl: null, thisVenue: false }),
};

(async () => {
  // ── LL-001..LL-003: one lookup, recorded whole ──────────────────────────────
  {
    const store = fakeDb();
    const api = lift(script, store.api);
    const tape = api.tapeStart('Find catalogue', row);
    const out = await api.lookupCatalogue(row, {});
    eq(await api.saveLookupTape(tape, out), true, 'LL-001: the record is saved');
    const dir = saveToDir(store.docs);
    const list = reader.listRecords(dir);
    eq([list.length, list[0].complete, list[0].action, list[0].title, list[0].enc], [1, true, 'Find catalogue', row.title, 'gzip-base64'], 'LL-001: one complete record, compressed, named by its card');
    const { record } = reader.readRecord(dir, list[0].id);
    const search = record.calls.find(c => c.kind === 'search');
    ok(search && search.input.queries.some(q => q.includes('Hubert Robert')) && search.output.results[0].excerpts[0] === PRESS,
      'LL-001: the search, its queries and every result’s full text are recorded');
    const read = record.calls.filter(c => c.kind === 'claude').pop();
    ok(read && read.input.prompt.includes(PRESS) && read.output.data && read.output.data.found === false,
      'LL-002: what Claude was sent and its exact answer are recorded (Hubert Robert: found false)');
    eq([record.before.hasCatalogue, record.after && record.after.hasCatalogue, record.panel === out.detail], ['unknown', 'no', true],
      'LL-003: the card before and after, and the panel’s text');
    ok(/Claude answered:[\s\S]*"found": false/.test(reader.describe(record)), 'LL-003: the reader writes Claude’s answer out');
  }

  // ── LL-004: a large record splits and reads back whole ─────────────────────
  {
    const store = fakeDb();
    const big = 'x'.repeat(50) + Array.from({ length: 60000 }, (_, i) => (i * 7919).toString(36)).join(' ');
    const api = lift({ ...script, mcp: () => ({ payload: { results: [{ url: 'https://b.test', title: 'Big', full_content: big }] } }) }, store.api);
    const tape = api.tapeStart('Search again', row);
    await api.searchWeb('big', ['big']);
    await api.searchWeb('big', ['big']);
    await api.saveLookupTape(tape, { ok: true, row, detail: 'd' });
    const dir = saveToDir(store.docs);
    const id = reader.listRecords(dir)[0].id;
    const meta = store.docs.get('lookups/' + id);
    const sizes = [...store.docs.entries()].filter(([k]) => k.startsWith('lookups/' + id + '/pieces/')).map(([, v]) => v.text.length);
    ok(meta.pieces > 1 && sizes.length === meta.pieces && sizes.every(n => n <= api.LOOKUP_PIECE),
      'LL-004: split into pieces under the cap', JSON.stringify(sizes));
    eq(reader.readRecord(dir, id).record.calls[1].output.results[0].full_content === big, true, 'LL-004: and read back whole');
  }

  // ── LL-005: only the newest 50 are kept ────────────────────────────────────
  {
    const store = fakeDb();
    const api = lift(script, store.api);
    for (let i = 0; i < api.LOOKUP_KEEP + 2; i++) {
      const tape = api.tapeStart('Find catalogue', { ...row, title: 'Show ' + i });
      tape.t0 = Date.UTC(2026, 0, 1) + i * 60000;
      await api.saveLookupTape(tape, { ok: true, row, detail: '' });
    }
    const recs = [...store.docs.entries()].filter(([k]) => /^lookups\/[^/]+$/.test(k)).map(([, v]) => v.title);
    eq([recs.length, recs.includes('Show 0'), recs.includes('Show 1'), recs.includes('Show 51')], [50, false, false, true],
      'LL-005: 52 lookups leave the newest 50');
    const orphans = [...store.docs.keys()].filter(k => k.includes('/pieces/') && !store.docs.has(k.split('/pieces/')[0]));
    eq(orphans.length, 0, 'LL-005: a dropped record’s pieces go with it');
  }

  // ── LL-006..LL-008: the log never breaks a lookup ──────────────────────────
  {
    const api = lift(script, null);
    const tape = api.tapeStart('Find catalogue', row);
    const out = await api.lookupCatalogue(row, {});
    eq([out.ok, await api.saveLookupTape(tape, out)], [true, false], 'LL-006: no store — the lookup finishes, nothing saved');
    const broken = fakeDb({ broken: true });
    const api2 = lift(script, broken.api);
    const t2 = api2.tapeStart('Find catalogue', row);
    eq(await api2.saveLookupTape(t2, await api2.lookupCatalogue(row, {})), false, 'LL-007: a failing store — no throw');
    const store = fakeDb();
    const api3 = lift(script, store.api);
    const t3 = api3.tapeStart('Find catalogue', row);
    await api3.saveLookupTape(t3, { ok: true, row, detail: '' });
    await api3.searchWeb('after', ['after']);
    eq(t3.calls.length, 0, 'LL-008: a call after the lookup ended is not recorded');
  }

  console.log(failures ? '\n' + failures + ' FAILED' : '\nAll lookup-log checks passed.');
  process.exit(failures ? 1 : 0);
})();
