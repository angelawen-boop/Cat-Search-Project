/*
 * catalogue_lookup.js — the ISBN fill, 21 Sep 2026.
 *
 * WHY IT EXISTS. Her finding, 20 Sep: a catalogue found in a venue's shop came
 * back with NO ISBN while the shop page printed one. The search connector
 * returns EXCERPTS — a headline and a line or two — and an ISBN sits in the
 * small print at the bottom, so it was never in what Claude was handed. With
 * no ISBN the reseller links search by title, and Alibris returned the wrong
 * book for the Met's Musical Bodies.
 *
 * The fix reads the one page in full, through the same connector's web_fetch,
 * which had never been declared. This file checks the parts that can be
 * checked without a network: the SHAPE of the call, which fails at her viewer
 * rather than here if it is wrong, and the two decisions around it.
 *
 * WHAT IT DOES NOT COVER, stated because a silent gap reads like a pass: it
 * never presses the button, so the wiring from a finished lookup into the fill
 * is still only read, not run. Verified live against
 * store.metmuseum.org/musical-bodies-80061361 on 21 Sep, which returned the
 * Details panel and ISBN 9781588398130 with the panel collapsed.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const React = require('react');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch_v10.2_haiku.jsx');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-lookup-'));

// Prepared exactly as page_loads.js and page_renders.js prepare it. Three
// checks disagreeing about what the build is would be worse than one.
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'],
    { stdio: 'pipe' });
} catch { /* tsc reports type errors it cannot fix; the emit is what matters */ }
const built = path.join(tmp, 'app.js');
if (!fs.existsSync(built)) { console.log('FAIL  the page did not transpile'); process.exit(1); }
const code = fs.readFileSync(built, 'utf8');

let failures = 0;
function fail(m) { console.log('FAIL  ' + m); failures++; }
function pass(m) { console.log('PASS  ' + m); }
function eq(got, want, m) {
  if (got === want) pass(m);
  else fail(m + ' — got ' + JSON.stringify(got) + ', wanted ' + JSON.stringify(want));
}

// Lift the page's own functions rather than keeping a second copy of them here.
function lift(fakeWindow) {
  return new Function('React', 'window', 'document', 'localStorage',
    code + '\n;return { fetchPage, needsIsbnFill, applyIsbnFill, isbn10to13 };')(
    React, fakeWindow, fakeWindow.document, fakeWindow.localStorage);
}

// A runtime that records what the page asked it for. `answer` stands in for
// the connector: a value is a reply, an Error is a refusal.
function runtime(answer, log) {
  return {
    window: {
      document: {}, localStorage: {},
      claude: {
        use: async name => {
          if (name !== 'mcp') return null;
          return { callTool: async (server, tool, args) => {
            log.push({ server, tool, args });
            if (answer instanceof Error) throw answer;
            return answer;
          } };
        },
      },
    },
  };
}

(async () => {
  // ── C-001 to C-004: the call shape, which fails at her viewer, not here ────
  {
    const log = [];
    const page = { url: 'https://store.metmuseum.org/musical-bodies-80061361',
                   title: 'Musical Bodies', excerpts: ['ISBN: 9781588398130'] };
    const { window } = runtime({ payload: { results: [page] } }, log);
    const api = lift(window);
    const out = await api.fetchPage(page.url, 'its ISBN', ['Musical Bodies ISBN']);

    eq(log.length, 1, 'C-001: one page is read, never a second search');
    eq(log[0] && log[0].server, 'Parallel Search', 'C-002: it asks her own connector');
    eq(log[0] && log[0].tool, 'web_fetch', 'C-003: and its whole-page tool, not web_search');
    const urls = log[0] && log[0].args && log[0].args.urls;
    if (Array.isArray(urls) && urls.length === 1 && urls[0] === page.url) {
      pass('C-004: the address goes over as a list of one, which is the shape the connector takes');
    } else {
      fail('C-004: the address was sent as ' + JSON.stringify(urls));
    }
    eq(out.ok, true, 'C-005: a page that answers comes back ok');
    eq(out.results.length, 1, 'C-005a:   with the page on it');
  }

  // ── C-006, C-007: a refusal is a sentence, never a thrown page ────────────
  {
    const log = [];
    const e = new Error('nope'); e.code = 'rate_limited';
    const { window } = runtime(e, log);
    const api = lift(window);
    let out;
    try { out = await api.fetchPage('https://x.test/b', 'isbn', ['isbn']); }
    catch { fail('C-006: a refused fetch threw at the page instead of being reported'); return; }
    eq(out.ok, false, 'C-006: a refused fetch is reported, not thrown');
    if (/minute/i.test(out.detail)) pass('C-007: and it says what happened in her words');
    else fail('C-007: the refusal reads "' + out.detail + '"');
  }

  // ── C-008: no connector at all is the plain-page case, and must not throw ──
  {
    const api = lift({ document: {}, localStorage: {} });
    const out = await api.fetchPage('https://x.test/b', 'isbn', ['isbn']);
    eq(out.ok, false, 'C-008: with no connector it reports that, rather than throwing');
  }

  // ── C-009 to C-013: WHEN to read the page at all ──────────────────────────
  {
    const api = lift({ document: {}, localStorage: {} });
    const found = { ok: true, pageUrl: 'https://shop.test/book',
                    row: { hasCatalogue: 'yes', isbn13: null } };
    eq(api.needsIsbnFill(found), true,
       'C-009: a book found with a page and no ISBN is the case this exists for');
    eq(api.needsIsbnFill({ ...found, row: { hasCatalogue: 'yes', isbn13: '9781588398130' } }), false,
       'C-010: an ISBN already found is never second-guessed');
    eq(api.needsIsbnFill({ ...found, pageUrl: null }), false,
       'C-011: no page link, nothing to read');
    eq(api.needsIsbnFill({ ...found, row: { hasCatalogue: 'no', isbn13: null } }), false,
       'C-012: no catalogue, no page read — the search already settled it');
    eq(api.needsIsbnFill(null), false, 'C-013: a failed lookup asks for nothing');
  }

  // ── C-014 to C-018: what the page is allowed to change ────────────────────
  {
    const api = lift({ document: {}, localStorage: {} });
    const row = { hasCatalogue: 'yes', isbn13: null, publisher: null, catalogueTitle: 'Musical Bodies' };

    const a = api.applyIsbnFill(row, { isbn13: '978-1-58839-813-0',
                                       publisher: 'The Metropolitan Museum of Art' });
    eq(a.isbn13, '9781588398130', 'C-014: the ISBN is filled, hyphens and all');
    eq(a.publisher, 'The Metropolitan Museum of Art', 'C-015: and a missing publisher with it');

    const b = api.applyIsbnFill({ ...row, publisher: 'Yale University Press' },
                                { isbn13: '9781588398130', publisher: 'Amazon' });
    eq(b.publisher, 'Yale University Press',
       'C-016: a publisher we already had is not overwritten by the shop page');

    const c = api.applyIsbnFill(row, { isbn13: '1-58839-813-7', publisher: null });
    eq(c.isbn13, '9781588398130',
       'C-017: a 10-digit ISBN is TAKEN and converted — it is the same book, and her one field is 13');

    const d = api.applyIsbnFill(row, {});
    eq(d, row, 'C-018: a page with nothing on it leaves the row exactly as it was');

    const e = api.applyIsbnFill(row, { isbn13: '1588398138' });
    eq(e.isbn13, null,
       'C-019: a 10-digit number that does not check out is refused, not converted into a plausible one');
  }

  // ── C-020 to C-025: the conversion itself ────────────────────────────────
  // Her ruling, 21 Sep: a 10-digit ISBN is fine to SEARCH with, so this is not
  // for searching. It is for the one field and the one format on her screen.
  {
    const api = lift({ document: {}, localStorage: {} });
    eq(api.isbn10to13('1588398137'), '9781588398130',
       'C-020: the Met\u2019s Musical Bodies, the row that found the fault');
    eq(api.isbn10to13('0714848050'), '9780714848051', 'C-021: an ordinary art-book ISBN');
    eq(api.isbn10to13('080442957X'), '9780804429573',
       'C-022: an X check digit is a ten, not a fault');
    eq(api.isbn10to13('0-7148-4805-0'), '9780714848051',
       'C-023: hyphens are how a page prints it');
    eq(api.isbn10to13('0714848051'), null, 'C-024: one digit wrong is refused');
    eq(api.isbn10to13('97807148480'), null, 'C-025: a number of the wrong length is not an ISBN-10');
  }

  console.log(failures ? failures + ' failed' : 'the ISBN fill holds');
  process.exit(failures ? 1 : 0);
})();
