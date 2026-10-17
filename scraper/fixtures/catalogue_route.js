/*
 * catalogue_route.js — the catalogue lookup, run whole.
 *
 * The lookup lives at top level (lookupCatalogue), so this file runs it end to end
 * with her connector and Claude played by a script, and checks the row it writes,
 * the card's sentences and the number of calls on each path. It also checks the
 * pieces the rebuild fixed: letters such as ø in title matching (LT-), a book the
 * shop step found filed as in the shop (BA-), an ISBN taken only with a valid check
 * digit and only when the fetched text prints it (IG-), and an English edition
 * accepted only when a record proves it is this catalogue's (ED-), her short list of
 * joint publishers' sites (PS-), the progress line on each main path (PL-), and one book per
 * card with her three English-edition cases (HR-), a booklet's ISBN refused (BK-), two versions of one book (VS-), her 42.8 runs replayed (R8-, Hubert Robert, real results in
 * docs/lookup_results/hubert_robert.json). Catalogue versions (docs/catalogue_versions.md):
 * her starting pick on her nine cases (CV-, docs/lookup_proof_cards.json), a co-edition's
 * two numbers folded (FO-), names venue first and the stored shape (VF-), Botticelli
 * replayed (BT-), her version lines word for word (VL-), a change of pick (PK-), the
 * other showing's city and an edition's year (CY-).
 *
 * Hammershøi's library record is real (docs/lookup_results/jacquemart_hammershoi.json);
 * the shop, book and publisher pages are made for the test.
 *
 *   node scraper/fixtures/catalogue_route.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const React = require('react');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-route-'));
// Prepared exactly as catalogue_lookup.js prepares it.
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

// The page's own functions, lifted with a runtime that plays the connector and Claude.
// `script.mcp(tool, args)` answers a connector call (throw to refuse);
// `script.sample(prompt)` answers a Claude read.
function lift(script, calls) {
  const win = { document: {}, localStorage: {}, claude: { use: async name => {
    if (name === 'mcp') return { callTool: async (server, tool, args) => {
      calls.push({ kind: 'mcp', tool, args });
      await new Promise(r => setTimeout(r, 2));
      return script.mcp(tool, args);
    } };
    if (name === 'sample') return { json: async prompt => {
      calls.push({ kind: 'sample', prompt });
      await new Promise(r => setTimeout(r, 2));
      return script.sample(prompt);
    } };
    return null;
  } } };
  return new Function('React', 'window', 'document', 'localStorage',
    code + '\n;return { readResults, lastJsonObject, lookupCatalogue, settle, toIsbn13, isbnInText, titleAsPrinted, resultsCarrying, titleKey, foldText, editionsOf, printingsOf, foldCoEditions, versionOrder, venueFirst, storedVersion, cityOf, yearOf, versionBlocks, pickRow, englishLine, publisherNote, shopHeadline, bookLinkOnShelf, sameCatalogue, publisherDomainFrom, publisherLinkOf, lookupIo, MU, SHOP_BLOCKED_FOUND_REST, SHOP_BLOCKED_NONE_REST, pagesPrinted, differentBook, oneBook, isbnInResults, pagesOfIsbn, notABooklet, alsoLine, bindingOfIsbn, museumImprintOnly, registerOccasional, recheckShopRow, sameBookOnPage };')(
    React, win, win.document, win.localStorage);
}
const api = lift({ mcp: () => ({ payload: { results: [] } }), sample: () => ({}) }, []);

const recorded = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', 'jacquemart_hammershoi.json'), 'utf8'));
const TUM = recorded.edition_record;
const row = (museumId, title) => ({ id: museumId + '-test', museumId, title, startDate: '2019-03-14', endDate: '2019-07-22',
  summary: 'x', exUrl: 'https://x.test/' + museumId, interested: true, watching: false, acquiring: null, looked: false,
  hasCatalogue: 'unknown', catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, publisherResult: null,
  shopUrl: null, shopState: null, shopChange: null });
// A shop shelf as one arrives: the book's tile among priced others.
const shelfOf = (urls, tile) => ({ payload: { errors: [], results: urls.map(u => ({ url: u, title: 'Exhibition catalogues',
  excerpts: [tile + '\n' + 'Another catalogue · €35. '.repeat(20)] })) } });
const isShopRead = p => /venue’s OWN shop pages/.test(p);
const isFactsRead = p => /SECTION B|SECTION A|SECTION C/.test(p) && /"isbn13": string\|null, "publisher": string\|null/.test(p) && !/"found"/.test(p);
const isPageRead = p => /^\{"isbn13": string\|null, "publisher": string\|null, "publisherUrl": string\|null\}/m.test(p) && /ONE web page in full: the page selling/.test(p);
const isJudge = p => /"kind": "book"\|"listing"\|"other"/.test(p);
const searches = calls => calls.filter(c => c.tool === 'web_search').map(c => c.args.search_queries);

(async () => {
  // ── TW-001..TW-004: a reply holding two answers — the last is taken ──────────
  // Her Louvre links: Claude answered, wrote "Wait — …", and answered again (the lookup log).
  {
    const HR = '{"summary": "Hubert Robert\'s visionary poetic images, first monograph since 1933.", "english": "", "englishSpeaking": false}\n\nWait — the summary should use the surname alone and stay within the rules, so here is the corrected object:\n\n{"summary": "Robert, visionary of ruins, gardens and Enlightenment Paris.", "english": "", "englishSpeaking": false}';
    const BS = '{"summary": "Donatello to Michelangelo: bodies and emotions in sculpture.", "english": "", "englishSpeaking": false}\n\nWait, that summary uses a colon, so here is the corrected output:\n\n{"summary": "Donatello to Michelangelo, bodies and emotions in sculpture.", "english": "", "englishSpeaking": false}';
    const refuse = text => ({ mcp: () => ({}), sample: () => { const e = new Error('the reply held no JSON value'); e.code = 'invalid_json'; e.text = text; throw e; } });
    let r = await lift(refuse(HR), []).readResults('x');
    eq([r.ok, r.data && r.data.summary], [true, 'Robert, visionary of ruins, gardens and Enlightenment Paris.'], 'TW-001: Hubert Robert — two answers in one reply, Claude’s corrected last one is taken');
    r = await lift(refuse(BS), []).readResults('x');
    eq(r.data && r.data.summary, 'Donatello to Michelangelo, bodies and emotions in sculpture.', 'TW-002: Body and Soul — the same');
    r = await lift(refuse('Sorry, I cannot read this page.'), []).readResults('x');
    eq([r.ok, /unreadable/.test(r.detail)], [false, true], 'TW-003: a reply with no answer in it still fails, as before');
    eq(api.lastJsonObject('{"a": "a } brace in a string"} then {"b": 2, "c": {"d": 1}}'), { b: 2, c: { d: 1 } }, 'TW-004: braces inside a string are not counted; nested objects kept whole');
  }

  // ── LT-001..LT-004: special letters fold, so titles match ───────────────────
  {
    eq(api.titleKey('Hammershøi'), api.titleKey('Hammershoi'), 'LT-001: Hammershøi and Hammershoi match');
    eq(api.titleKey('Œuvre complète'), api.titleKey('oeuvre complete'), 'LT-002: œuvre and oeuvre match');
    eq(api.titleKey('Straße der Kunst'), api.titleKey('Strasse der Kunst'), 'LT-003: Straße and Strasse match');
    const res = [{ url: 'https://x.test/b', title: 'Hammershoi : le maitre de la peinture danoise', excerpts: ['Fonds Mercator'] }];
    eq(api.resultsCarrying(res, 'Hammershøi : le maître de la peinture danoise').length, 1, 'LT-004: a result spelling Hammershoi carries the book Hammershøi');
  }

  // ── BA-001..BA-003: a book the shop step found is in the museum shop ─────────
  {
    const dom = 'boutique.louvre.fr';
    const r0 = row('louvre', 'Test Show');
    let h = api.settle(r0, { found: true, catalogueTitle: 'Test Book', shopUrl: null }, dom, '', true, false, []);
    eq([h.row.shopState, h.row.shopUrl], ['shop', null], 'BA-001: found by the shop step with no link — in the shop, no link of its own');
    h = api.settle(r0, { found: true, catalogueTitle: 'Test Book', shopUrl: 'https://publisher.test/book' }, dom, '', true, false, []);
    eq([h.row.shopState, h.row.shopUrl], ['shop', null], 'BA-002: a link off the shop is not filed as the shop link, and the book stays in the shop');
    h = api.settle(r0, { found: true, catalogueTitle: 'Test Book', shopUrl: 'https://boutique.louvre.fr/en/product/1-test-book.html' }, dom, '', true, false, []);
    eq([h.row.shopState, h.row.shopUrl], ['shop', 'https://boutique.louvre.fr/en/product/1-test-book.html'], 'BA-003: a link on the shop is kept');
  }

  // ── IG-001..IG-005: an ISBN enters with a valid check digit, printed in the text ─
  {
    eq(api.toIsbn13('9781588398131'), null, 'IG-001: a wrong check digit is refused');
    eq(api.toIsbn13('9781588398130', 'A page about another book. ISBN 9782754117425'), null, 'IG-002: an ISBN the fetched text does not print is refused');
    eq(api.toIsbn13('9781588398130', 'ISBN: 978-1-58839-813-0'), '9781588398130', 'IG-003: printed with hyphens, it is taken');
    eq(api.toIsbn13('9780847899289', [TUM]), '9780847899289', 'IG-004: printed in a fetched result, it is taken');
    eq(api.toIsbn13('9780847899289', 'ISBN 0847899284'), '9780847899289', 'IG-005: printed as its 10-digit form, it is taken');
    eq(api.isbnInText('9781588398130', 'Order 19781588398130'), false, 'IG-006: never as part of a longer number');
  }

  // ── ED-001..ED-005: an edition in another language, proved in code ──────────
  // editionsOf keeps every proved edition as one of this showing's versions.
  {
    const orig = { title: 'Hammershøi : le maître de la peinture danoise', isbn13: '9789462302495', publisher: 'Fonds Mercator', lang: 'French', pages: null };
    const claimed = [{ title: 'Hammershøi: Painter of Northern Light', isbn13: '9780847899289', language: 'English', publisher: 'Rizzoli Electa', evidenceUrl: TUM.url }];
    const one = (eds, o, res, mid) => api.editionsOf(eds, o, res, mid, []).filter(v => v.showing === 'this')[0] || null;
    const ed = one(claimed, orig, [TUM, recorded.cinii], 'jacquemart');
    eq(ed && [ed.isbn13, ed.title, ed.lang], ['9780847899289', 'Hammershøi: Painter of Northern Light', 'English'], 'ED-001: Hammershøi — the library record proves Rizzoli’s book is the English edition');
    // Without the venue named, the record's "Originally published in French as …" still proves it.
    const bare = { ...TUM, excerpts: [TUM.excerpts[0].replace(/Musée Jacquemart-André, Institut de France, /g, '')] };
    const ed2 = one(claimed, orig, [bare], 'jacquemart');
    ok(ed2 && /translation/.test(ed2.note), 'ED-002: the linking phrase and the original title’s words prove it on their own', ed2 && ed2.note);
    const both = [{ url: 'https://lib.test/r', title: 'Record', excerpts: ['English edition. ISBN 9780847899289. Original: ISBN 9789462302495.'] }];
    const ed3 = one(claimed, { ...orig, title: 'Something else entirely' }, both, 'louvre');
    ok(ed3 && /both ISBNs/.test(ed3.note), 'ED-003: a record carrying both ISBNs proves it', ed3 && ed3.note);
    // CE-002 carried over: Reaktion's Botticelli is not the Fonds Mercator catalogue's English edition.
    const reaktion = [{ url: 'https://www.amazon.com/dp/1789144388', title: 'Botticelli: Artist and Designer (Renaissance Lives)', excerpts: ['Ana Debenedetti examines the life and work of Renaissance artist Sandro Botticelli. ISBN 9781789144383. Reaktion Books.'] }];
    eq(api.editionsOf([{ title: 'Botticelli: Artist and Designer', isbn13: '9781789144383', language: 'English', publisher: 'Reaktion Books' }],
      { title: 'Botticelli, artiste et designer', isbn13: '9789462302815', publisher: 'Fonds Mercator', lang: 'French', pages: null }, reaktion, 'jacquemart', []), [],
      'ED-004: Botticelli — Reaktion’s monograph is refused (CE-002), never a version');
    eq(api.editionsOf([{ ...claimed[0], isbn13: '9781588398130' }], orig, [TUM], 'jacquemart', []), [],
      'ED-005: an edition whose ISBN no fetched result prints is refused');
  }

  // ── CT-001..CT-002: one owner per sentence on the card ───────────────────────
  {
    const pubs = ['container', 'site', 'nosite', 'unnamed', 'product', 'selfpublished', null].map(k => api.publisherNote(k, true)).filter(Boolean);
    const eng = ['publisher', 'shops', 'unknownlang', 'stopped', 'english'].map(c => api.englishLine({ englishCheck: c, publisher: 'Lienart',
      originalEdition: c === 'english' ? { title: 'Original', publisher: 'Pub' } : null })).filter(Boolean);
    const shop = [api.shopHeadline('shop', null), api.shopHeadline('gone', null), 'Not in the museum shop — shop link opens the general store.',
      api.SHOP_BLOCKED_FOUND_REST, api.SHOP_BLOCKED_NONE_REST];
    const all = [...pubs, ...eng, ...shop];
    eq(new Set(all).size, all.length, 'CT-001: no sentence is printed by two of the shop, publisher and English lines');
    ok(eng.filter(x => !/^No English edition - checked publisher's site/.test(x)).every(x => !/publisher’s|home page|section/.test(x)),
      'CT-002: the English line never restates the publisher page’s status', JSON.stringify(eng));
  }

  // ════ WHOLE LOOKUPS ════════════════════════════════════════════════════════════
  const run = async (r, script) => {
    const calls = [], labels = [];
    const out = await lift(script, calls).lookupCatalogue(r, { label: l => labels.push(l) });
    return { out, calls, row: out.row, labels };
  };
  const L1 = 'Searching venue shop…', L2 = 'Searching more broadly…', L3 = 'Finding the ISBN and publisher…',
    L3F = 'Finding the ISBN, publisher and English edition…', L4 = 'Looking for the publisher’s page…';

  // ── WL-001..WL-006: Hammershøi ends on the English edition ───────────────────
  {
    const BOOK = 'https://boutique.musee-jacquemart-andre.com/en/products/test-hammershoi-le-maitre';
    const FR = 'Hammershøi : le maître de la peinture danoise';
    const EN = 'Hammershøi: Painter of Northern Light';
    // Rizzoli's real page for the book, opened on 8 Oct 2026; its content here is made for the test.
    const RZ = 'https://www.rizzoliusa.com/book/9780847899289/';
    const script = {
      mcp: (tool, args) => {
        if (tool === 'web_search') {
          const q = args.search_queries.join(' | ');
          if (q.startsWith('9789462302495')) return { payload: { results: recorded.booksellers } };
          if (/English edition/.test(q)) return { payload: { results: [TUM, recorded.cinii] } };
          if (q.startsWith('Rizzoli Electa')) return { payload: { results: [{ url: 'https://www.rizzoliusa.com/', title: 'Rizzoli New York', excerpts: ['Rizzoli Electa'] }] } };
          if (q.startsWith('site:www.rizzoliusa.com')) return { payload: { results: [{ url: RZ, title: EN + ' - Rizzoli New York', excerpts: [EN + '. ISBN 9780847899289'] }] } };
          return { payload: { results: [] } };
        }
        if (args.urls.includes(RZ)) return { payload: { errors: [], results: [{ url: RZ, title: EN + ' - Rizzoli New York', excerpts: [],
          full_content: '# ' + EN + '\nRizzoli Electa\nISBN 9780847899289\n' + 'The Danish painter Vilhelm Hammershøi. '.repeat(20) }] } };
        if (args.urls.includes(BOOK)) return { payload: { errors: [], results: [{ url: BOOK, title: FR, excerpts: [],
          full_content: '# ' + FR + '\nÉditeur : Fonds Mercator\nEAN 9789462302495\n€45.00\n' + 'Catalogue de l’exposition. '.repeat(30) }] } };
        return shelfOf(args.urls, '[' + FR + ' €45](' + BOOK + ')');
      },
      sample: p => isShopRead(p) ? { found: true, thisVenue: true, catalogueTitle: FR, isbn13: null, publisher: null, publisherUrl: null, shopUrl: BOOK }
        : isFactsRead(p) ? { isbn13: null, publisher: null, pagePublisher: 'Fonds Mercator', pagePublisherUrl: null, language: 'French', title: FR,
            editions: [{ title: 'Hammershøi: Painter of Northern Light', isbn13: '9780847899289', language: 'English', publisher: 'Rizzoli Electa', evidenceUrl: TUM.url }] }
        : isJudge(p) ? { kind: 'book', bookUrl: null }
        : {},
    };
    const { out, calls, row: r, labels } = await run(row('jacquemart', 'Hammershøi: the master of danish painting'), script);
    eq([r.catalogueTitle, r.isbn13, r.publisher], ['Hammershøi: Painter of Northern Light', '9780847899289', 'Rizzoli Electa'], 'WL-001: Hammershøi — the card carries the English edition');
    eq([r.editions.map(v => [v.lang, v.isbn13, v.showing, v.title]), r.editionPick, r.originalEdition],
      [[['English', '9780847899289', 'this', 'Hammershøi: Painter of Northern Light'], ['French', '9789462302495', 'this', FR]], 0, null],
      'WL-002:   the French book kept as a version after the English one, which comes first and is picked (no longer written as originalEdition)');
    eq([r.englishCheck, r.shopState, r.shopUrl], ['english', 'web', null], 'WL-003:   filed as found on the web, English');
    eq(api.englishLine(r), null, 'WL-004:   no English line on a card with several versions — her version lines say it (stage 2; was "English edition of …")');
    ok(!searches(calls).some(q => q[0] === 'Fonds Mercator') && searches(calls).filter(q => q[0].startsWith('site:www.rizzoliusa.com')).length === 1,
      'WL-005:   the publisher step runs once, for the English edition only', JSON.stringify(searches(calls)));
    eq([r.publisherUrl, r.publisherResult], [RZ, 'product'], 'WL-007:   Rizzoli’s own page for the book, its site from her list (PUBLISHER_SITES)');
    ok(!searches(calls).some(q => q[0] === 'Rizzoli Electa'), 'WL-008:   the list answers where the site is, so no search for the publisher’s name', JSON.stringify(searches(calls)));
    eq([out.calls.calls, out.calls.waits], [9, 8], 'WL-006:   9 calls, 8 waits in a row (was 18 in a row, counted from the old code)');
    eq(labels, [L1, L3F, L4], 'PL-003: progress at a non-English venue, found in the shop — shop, facts with the English edition, publisher');
  }

  // ── WL-060..WL-063: Hammershøi as her live search ran it ─────────────────────
  // The English-edition search answer is real (docs/lookup_results/
  // jacquemart_hammershoi_edition_search.json): ten results, the library record tenth.
  // Claude is played honestly — it reports the edition only if its prompt shows it.
  {
    const live = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', 'jacquemart_hammershoi_edition_search.json'), 'utf8'));
    const LIB = live.results[9];
    const CAPS = 'HAMMERSHOI. LE MAÎTRE DE LA PEINTURE DANOISE';
    const script = {
      mcp: (tool, args) => {
        if (tool === 'web_search') {
          const q = args.search_queries.join(' | ');
          if (/English edition/.test(q)) return { payload: { results: live.results } };
          if (q.startsWith('9789462302495') || q.startsWith('Hammershøi: the master')) return { payload: { results: recorded.booksellers } };
          return { payload: { results: [] } };
        }
        // The shop's shelf pages 2–5 do not exist (404), as in her live run.
        const res = shelfOf(args.urls.filter(u => !/[?&]page=/.test(u)), '[Another catalogue €39](https://x.test/other)');
        res.payload.errors = args.urls.filter(u => /[?&]page=/.test(u)).map(u => ({ url: u, http_status_code: 404 }));
        return res;
      },
      sample: p => isShopRead(p) ? { found: false }
        : /"found"/.test(p) ? { found: true, thisVenue: true, catalogueTitle: CAPS, isbn13: '9789462302495', publisher: null, publisherUrl: null, shopUrl: null }
        : isFactsRead(p) ? { isbn13: '9789462302495', publisher: 'Fonds Mercator', language: 'French', title: CAPS,
            editions: p.includes(LIB.url) ? [{ title: 'Hammershøi : painter of northern light', isbn13: '9780847899289', language: 'English', publisher: null, evidenceUrl: LIB.url }] : [] }
        : {},
    };
    const { row: r } = await run(row('jacquemart', 'Hammershøi: the master of danish painting'), script);
    eq([r.englishCheck, r.isbn13], ['english', '9780847899289'], 'WL-060: Hammershøi live — the library record that came tenth is read, and the card carries the English edition');
    eq(r.catalogueTitle, 'Hammershøi : painter of northern light', 'WL-061:   its title as the record prints it');
    eq([r.editions.map(v => [v.lang, v.isbn13, v.showing, v.publisher]), r.editionPick],
      [[['English', '9780847899289', 'this', null], ['French', '9789462302495', 'this', 'Fonds Mercator']], 0],
      'WL-062:   her case 4 — the French original and the English edition both kept, the English first and picked (the record names no English publisher)');
    eq([r.publisher, r.publisherResult], [null, 'unnamed'], 'WL-063:   the record names no publisher for the English edition, so none is claimed');
  }

  // ── WL-010..WL-012: an edition swap, publisher reachable — no second publisher step ─
  {
    const BOOK = 'https://boutique.musee-jacquemart-andre.com/en/products/test-swap';
    const FR = 'Test Caillebotte : peintre et mécène';
    const EN = 'Test Caillebotte: Painter and Patron';
    const ENPAGE = 'https://www.mercatorfonds.be/en/books/test-caillebotte-painter-and-patron';
    const record = { url: 'https://lib.test/record/1', title: EN, excerpts: [EN + '. English edition. Originally published in French as: ' + FR + '. Fonds Mercator. ISBN 9781588398130.'] };
    const script = {
      mcp: (tool, args) => {
        if (tool === 'web_search') {
          const q = args.search_queries.join(' | ');
          if (/English edition/.test(q)) return { payload: { results: [record, { url: ENPAGE, title: EN + ' | Fonds Mercator', excerpts: [EN + '. ISBN 9781588398130'] }] } };
          return { payload: { results: [] } };
        }
        if (args.urls.includes(BOOK)) return { payload: { errors: [], results: [{ url: BOOK, title: FR, excerpts: [], full_content: '# ' + FR + '\nEAN 9789462302815\n' + 'x '.repeat(300) }] } };
        if (args.urls.includes(ENPAGE)) return { payload: { errors: [], results: [{ url: ENPAGE, title: EN, excerpts: [], full_content: '# ' + EN + '\nISBN 9781588398130\n' + 'Essays. '.repeat(80) }] } };
        return shelfOf(args.urls, '[' + FR + ' €45](' + BOOK + ')');
      },
      sample: p => isShopRead(p) ? { found: true, thisVenue: true, catalogueTitle: FR, isbn13: null, publisher: null, publisherUrl: null, shopUrl: BOOK }
        : isFactsRead(p) ? { pagePublisher: 'Fonds Mercator', language: 'French', title: FR,
            editions: [{ title: EN, isbn13: '9781588398130', language: 'English', publisher: 'Fonds Mercator', evidenceUrl: record.url }] }
        : isJudge(p) ? { kind: 'book', bookUrl: null } : {},
    };
    const { out, calls, row: r } = await run(row('jacquemart', 'Test Caillebotte Show'), script);
    eq([r.catalogueTitle, r.isbn13, r.publisherUrl, r.publisherResult], [EN, '9781588398130', ENPAGE, 'product'], 'WL-010: an edition swap — the English edition’s own publisher page is found');
    const judged = calls.filter(c => c.kind === 'sample' && isJudge(c.prompt)).length;
    const sites = searches(calls).filter(q => q[0].startsWith('site:')).length;
    eq([judged, sites], [1, 0], 'WL-011:   the publisher step ran once: one page judged, its candidate taken from the results already found');
    eq([out.calls.calls, out.calls.waits], [8, 7], 'WL-012:   8 calls, 7 waits in a row');
  }

  // ── WL-020..WL-022: a self-published book at an English venue ────────────────
  {
    const BOOK = 'https://shop.nationalgallery.org.uk/test-course-of-empire.html';
    const T = 'Test Course of Empire: The Catalogue';
    const script = {
      mcp: (tool, args) => tool === 'web_search' ? { payload: { results: [] } }
        : args.urls.includes(BOOK) ? { payload: { errors: [], results: [{ url: BOOK, title: T, excerpts: [], full_content: '# ' + T + '\nISBN 978-1-85709-738-2\n£30\n' + 'x '.repeat(300) }] } }
        : shelfOf(args.urls, '[' + T + ' £30](' + BOOK + ')'),
      sample: p => isShopRead(p) ? { found: true, thisVenue: true, catalogueTitle: T, isbn13: null, publisher: 'National Gallery Global', publisherUrl: null, shopUrl: BOOK } : {},
    };
    const { out, calls, row: r } = await run(row('ng', 'Test Course of Empire'), script);
    eq([r.shopState, r.shopUrl, r.isbn13, r.publisherResult], ['shop', BOOK, '9781857097382', 'selfpublished'], 'WL-020: self-published at an English venue — in the shop, ISBN read in code, no publisher page');
    eq(searches(calls).length, 0, 'WL-021:   no search at all');
    eq([out.calls.calls, out.calls.waits], [3, 3], 'WL-022:   3 calls in a row (was 4)');
  }

  // ── WL-030..WL-032: a third-party publisher at an English venue ──────────────
  {
    const BOOK = 'https://shop.nationalgallery.org.uk/test-hannibal-book.html';
    const PUB = 'https://hannibalbooks.be/en/test-hannibal-book#1';
    const T = 'Test Hannibal Book';
    const script = {
      mcp: (tool, args) => {
        if (tool === 'web_search') {
          const q = args.search_queries.join(' | ');
          if (q.startsWith('Hannibal Books')) return { payload: { results: [{ url: 'https://hannibalbooks.be/en/about', title: 'Hannibal Books', excerpts: ['Hannibal'] }] } };
          if (q.startsWith('site:hannibalbooks.be')) return { payload: { results: [{ url: PUB, title: T + ' | Hannibal', excerpts: [T] }] } };
          return { payload: { results: [] } };
        }
        if (args.urls.includes(BOOK)) return { payload: { errors: [], results: [{ url: BOOK, title: T, excerpts: [], full_content: '# ' + T + '\nISBN 9789493416543\n£40\n' + 'x '.repeat(300) }] } };
        if (args.urls.includes(PUB)) return { payload: { errors: [], results: [{ url: PUB, title: T, excerpts: [], full_content: '# ' + T + '\nISBN 9789493416543\n' + 'Essays. '.repeat(80) }] } };
        return shelfOf(args.urls, '[' + T + ' £40](' + BOOK + ')');
      },
      sample: p => isShopRead(p) ? { found: true, thisVenue: true, catalogueTitle: T, isbn13: null, publisher: 'Hannibal Books', publisherUrl: null, shopUrl: BOOK }
        : isJudge(p) ? { kind: 'book', bookUrl: null } : {},
    };
    const { out, calls, row: r, labels } = await run(row('ng', 'Test Hannibal Show'), script);
    eq([r.isbn13, r.publisher, r.publisherUrl, r.publisherResult], ['9789493416543', 'Hannibal Books', PUB, 'product'], 'WL-030: a third-party publisher at an English venue — its page found');
    ok(!calls.some(c => c.kind === 'sample' && /"candidates": \[string\]/.test(c.prompt)), 'WL-031:   the site’s results ranked in code, Claude not asked');
    eq([out.calls.calls, out.calls.waits], [7, 7], 'WL-032:   7 calls in a row (was 9)');
    eq(labels, [L1, L3, L4], 'PL-001: progress at an English venue, found in the shop — shop, the book’s page, publisher');
  }

  // ── WL-040..WL-048: a foreign book with no English edition ───────────────────
  {
    const BOOK = 'https://boutique.louvre.fr/en/product/61740-test-nature.html';
    const OWN = 'Test L’Expérience de la nature';
    const PUB_PAGE = 'https://www.lienart.fr/livre/test-experience-de-la-nature';
    const make = ({ pubPage = 'ok', factsFail = false } = {}) => ({
      mcp: (tool, args) => {
        if (tool === 'web_search') {
          const q = args.search_queries.join(' | ');
          if (/English edition/.test(q)) return { payload: { results: [{ url: PUB_PAGE, title: OWN + ' | Lienart éditions', excerpts: [OWN + '. Lienart, 2025.'] }] } };
          if (q.startsWith('9782359064612')) return { payload: { results: [{ url: 'https://books.test/fr', title: OWN, excerpts: [OWN + '. EAN 9782359064612. Langue : français.'] }] } };
          return { payload: { results: [] } };
        }
        if (args.urls.includes(BOOK)) return { payload: { errors: [], results: [{ url: BOOK, title: 'Exhibition catalogue', excerpts: [], full_content: '# Exhibition catalogue\nSold by GrandPalaisRmn\nEAN 9782359064612\n' + 'x '.repeat(300) }] } };
        if (args.urls.includes(PUB_PAGE)) {
          if (pubPage === 'fail') { const e = new Error('upstream'); e.code = 'upstream_error'; throw e; }
          return { payload: { errors: [], results: [{ url: PUB_PAGE, title: OWN, excerpts: [], full_content: pubPage === 'shell' ? 'Menu' : '# ' + OWN + '\nLienart, 2025. Français. EAN 9782359064612.\n' + 'Essais. '.repeat(80) }] } };
        }
        return shelfOf(args.urls, '[Exhibition catalogue Experience of Nature €42](' + BOOK + ')');
      },
      sample: p => {
        if (isShopRead(p)) return { found: true, thisVenue: true, catalogueTitle: 'Exhibition catalogue Experience of Nature', isbn13: null, publisher: null, publisherUrl: null, shopUrl: BOOK };
        if (isFactsRead(p)) { if (factsFail) { const e = new Error('x'); e.code = 'rate_limited'; throw e; } return { pagePublisher: 'Lienart', language: 'French', title: OWN, editions: [] }; }
        if (isJudge(p)) return { kind: 'book', bookUrl: null, editions: [] };
        return {};
      },
    });
    let { out, calls, row: r } = await run(row('louvre', 'Test Nature Show'), make());
    eq([r.catalogueTitle, r.isbn13, r.publisher, r.shopState], [OWN, '9782359064612', 'Lienart', 'shop'], 'WL-040: a foreign book — its own title, its ISBN, still in the museum shop');
    eq([r.englishCheck, r.publisherUrl, r.publisherResult], ['publisher', PUB_PAGE, 'product'], 'WL-041:   no English edition, the publisher’s page read and linked');
    eq(api.englishLine(r), "No English edition - checked publisher's site and bookshops.", 'WL-042:   the card says the publisher’s site was checked, without repeating the publisher printed above');
    ok(!calls.some(c => c.kind === 'sample' && isPageRead(c.prompt)), 'WL-043:   the book’s page read in the facts round’s one read, not on its own');
    eq([out.calls.calls, out.calls.waits], [8, 7], 'WL-044:   8 calls, 7 waits in a row (was 13)');

    ({ out, row: r } = await run(row('louvre', 'Test Nature Show'), make({ pubPage: 'shell' })));
    eq([r.englishCheck, r.publisherResult], ['shops', 'container'], 'WL-045: the publisher’s page came back empty — not "checked publisher’s site"');
    eq(api.englishLine(r), 'No English edition found in bookshops.', 'WL-046:   the card says bookshops only');

    ({ out, row: r } = await run(row('louvre', 'Test Nature Show'), make({ pubPage: 'fail' })));
    ok(out.trouble && !out.troubleLang && r.publisherResult === null && api.publisherNote(r.publisherResult, !!r.publisherUrl) === '' && r.englishCheck === 'shops',
      'WL-047: the publisher step failed — the banner says so and the card claims nothing about the publisher’s page', JSON.stringify([out.trouble, r.publisherResult, r.englishCheck]));

    ({ out, row: r } = await run(row('louvre', 'Test Nature Show'), make({ factsFail: true })));
    ok(out.trouble && out.troubleLang && r.englishCheck === 'stopped' && /not checked/.test(api.englishLine(r)) && r.isbn13 === '9782359064612',
      'WL-048: the facts read failed — the English line says the check was not done, and the ISBN read in code stands', JSON.stringify([out.troubleLang, r.englishCheck]));
  }

  // ── WL-050..WL-051: her Turner — a co-edition names its publisher (CE-001, run whole) ─
  {
    const BOOK = 'https://boutique.musee-jacquemart-andre.com/en/products/test-turner';
    const T = 'Test Turner : peintures et aquarelles';
    const script = {
      mcp: (tool, args) => tool === 'web_search' ? { payload: { results: [] } }
        : args.urls.includes(BOOK) ? { payload: { errors: [], results: [{ url: BOOK, title: T, excerpts: [], full_content: '# ' + T + '\nEAN 9789462302815\n' + 'x '.repeat(300) }] } }
        : shelfOf(args.urls, '[' + T + ' €39](' + BOOK + ')'),
      sample: p => isShopRead(p) ? { found: true, thisVenue: true, catalogueTitle: T, isbn13: null, publisher: 'Fonds Mercator / Musée Jacquemart-André', publisherUrl: null, shopUrl: BOOK }
        : isFactsRead(p) ? { language: 'French', title: T, editions: [] } : {},
    };
    const { calls, row: r } = await run(row('jacquemart', 'Test Turner Show'), script);
    ok(searches(calls).some(q => q[0] === 'Fonds Mercator') && r.publisherResult === 'nosite' && r.publisher === 'Fonds Mercator / Musée Jacquemart-André',
      'WL-050: her Turner — the publisher looked for is Fonds Mercator, and the card prints the line as given', JSON.stringify([searches(calls), r.publisherResult]));
    eq(r.publisherResult !== 'selfpublished', true, 'WL-051:   a co-edition is not the museum’s own imprint');
  }

  // ── PS-001..PS-006: her short list of joint publishers (PUBLISHER_SITES) ──────
  {
    const site = u => ({ url: u, title: 'x', excerpts: ['x'] });
    eq(api.publisherDomainFrom([site('https://www.abebooks.com/x'), site('https://www.rizzoliusa.com/book/1')], 'Rizzoli Electa'), 'www.rizzoliusa.com',
      'PS-001: Rizzoli Electa — its site, from her list, when the name is not in the address');
    eq(api.publisherDomainFrom([site('https://www.rizzoliusa.com/'), site('https://www.rizzolielecta.test/')], 'Rizzoli Electa'), 'www.rizzolielecta.test',
      'PS-002:   the list never overrides a site the name finds');
    eq(['DelMonico Books · Prestel', 'DelMonico Books/Prestel', 'Delmonico Books Prestel'].map(n => api.publisherDomainFrom([site('https://delmonicobooks.com/book/x')], n)),
      ['delmonicobooks.com', 'delmonicobooks.com', 'delmonicobooks.com'], 'PS-003: DelMonico · Prestel — its site, however the line is punctuated');
    eq([api.publisherDomainFrom([site('https://www.rizzoliusa.com/')], 'Fonds Mercator'), api.publisherDomainFrom([site('https://www.rizzoliusa.com/')], 'Electa'),
      api.publisherDomainFrom([site('https://hannibalbooks.be/en/about')], 'Hannibal Books')], [null, null, 'hannibalbooks.be'],
      'PS-004: a publisher not on the list behaves as before — Electa alone is not Rizzoli Electa');
    eq(api.publisherLinkOf('https://www.rizzoliusa.com/book/9780847899289/', 'Rizzoli Electa', null), 'https://www.rizzoliusa.com/book/9780847899289/',
      'PS-005: a link a read gives on the listed site is the publisher’s own');
    eq(api.publisherLinkOf('https://www.abebooks.com/9780847899289', 'Rizzoli Electa', null), null, 'PS-006:   a link anywhere else still is not');
  }

  // ── UN-001..UN-003: Hubert Robert — a press release names the catalogue, not its title ─
  {
    const PRESS = 'https://www.nationalgallery.org.uk/press/test-hubert-robert';
    const ISBN = '9781848221956';
    const searchPlan = (factsResults, failFacts) => (tool, args) => {
      if (tool !== 'web_search') return shelfOf(args.urls, '[Another catalogue £30](https://shop.nationalgallery.org.uk/other.html)');
      const q = args.search_queries.join(' | ');
      if (/press release catalogue/.test(q)) return { payload: { results: [{ url: PRESS, title: 'Test Hubert Robert press release',
        excerpts: ['Published in association with Lund Humphries, the accompanying catalog richly illuminates Robert.'] }] } };
      if (/catalogue ISBN/.test(q)) { if (failFacts) { const e = new Error('x'); e.code = 'server_unavailable'; throw e; } return { payload: { results: factsResults } }; }
      return { payload: { results: [] } };
    };
    const webRead = { found: true, thisVenue: true, catalogueTitle: null, isbn13: null, publisher: 'Lund Humphries', publisherUrl: null, shopUrl: null };
    const sample = factsAnswer => p => isShopRead(p) ? { found: false } : /"thisVenue": true\|false/.test(p) ? webRead : isFactsRead(p) ? factsAnswer : {};
    const book = [{ url: 'https://www.lundhumphries.com/products/hubert-robert', title: 'Hubert Robert | Lund Humphries',
      excerpts: ['Hubert Robert. Margaret Morgan Grasselli and Yuriko Jackall. Published in association with the National Gallery of Art. ISBN ' + ISBN] }];
    let { out, calls, row: r } = await run(row('ng', 'Test Hubert Robert, 1733–1808'), { mcp: searchPlan(book), sample: sample({ isbn13: ISBN, publisher: 'Lund Humphries', title: 'Hubert Robert' }) });
    eq([r.hasCatalogue, r.catalogueTitle, r.isbn13, r.publisher], ['yes', 'Hubert Robert', ISBN, 'Lund Humphries'],
      'UN-001: Hubert Robert — a catalogue named only as "the accompanying catalog" goes on to the facts round, which finds its title and ISBN');
    ok(calls.some(c => c.kind === 'sample' && isFactsRead(c.prompt) && /Its own title is not known yet/.test(c.prompt) && /"title": string\|null/.test(c.prompt)),
      'UN-001a:  the facts read is asked for the book’s title');
    ({ out, row: r } = await run(row('ng', 'Test Hubert Robert, 1733–1808'), { mcp: searchPlan([]), sample: sample({}) }));
    eq([r.hasCatalogue, out.ok, !!out.trouble], ['no', true, false], 'UN-002: no title or ISBN found for it — no catalogue, as before');
    ok(/not filed/.test(out.detail), 'UN-002a:  the diagnostic says why', out.detail.split('\n').pop());
    ({ out } = await run(row('ng', 'Test Hubert Robert, 1733–1808'), { mcp: searchPlan([], true), sample: sample({}) }));
    ok(out.ok && !!out.trouble, 'UN-003: the facts search failed — the lookup says it did not finish, so Search again leaves the card alone');
  }

  // ── PL-001..PL-005: the progress line on each main path ──────────────────────
  // PL-001 and PL-003 are with WL-030 and WL-001 above.
  {
    const RES = 'https://books.test/r/1';
    const PUB = 'https://hannibalbooks.be/en/test-web-book';
    const T = 'Test Web Book';
    const web = ({ foreign }) => ({
      mcp: (tool, args) => {
        if (tool === 'web_search') {
          const q = args.search_queries.join(' | ');
          if (q.startsWith('Hannibal Books')) return { payload: { results: [{ url: 'https://hannibalbooks.be/en/about', title: 'Hannibal Books', excerpts: ['Hannibal'] }] } };
          if (q.startsWith('site:hannibalbooks.be')) return { payload: { results: [{ url: PUB, title: T + ' | Hannibal', excerpts: [T] }] } };
          if (q.startsWith('Test Web Show')) return { payload: { results: [{ url: RES, title: T, excerpts: [T + ', the catalogue of the show. Hannibal Books. ISBN 9789493416543.'] }] } };
          return { payload: { results: [] } };
        }
        if (args.urls.includes(PUB)) return { payload: { errors: [], results: [{ url: PUB, title: T, excerpts: [], full_content: '# ' + T + '\nISBN 9789493416543\n' + 'Essays. '.repeat(80) }] } };
        return shelfOf(args.urls, '[Another book €20](https://x.test/other)');
      },
      sample: p => isShopRead(p) ? { found: false }
        : /"found"/.test(p) ? { found: true, thisVenue: true, catalogueTitle: T, isbn13: '9789493416543', publisher: 'Hannibal Books', publisherUrl: null, shopUrl: null }
        : isFactsRead(p) ? { language: foreign ? 'English' : null, title: T, editions: [] }
        : isJudge(p) ? { kind: 'book', bookUrl: null, editions: [] } : {},
    });
    let { row: r, labels } = await run(row('ng', 'Test Web Show'), web({ foreign: false }));
    eq([r.hasCatalogue, r.shopState, r.publisherUrl], ['yes', 'web', PUB], 'PL-002a: (the English venue’s web path runs whole)');
    eq(labels, [L1, L2, L3, L4], 'PL-002: progress at an English venue, found on the web — shop, broader, facts, publisher');
    ({ row: r, labels } = await run(row('louvre', 'Test Web Show'), web({ foreign: true })));
    eq([r.hasCatalogue, r.shopState, r.publisherUrl], ['yes', 'web', PUB], 'PL-004a: (the non-English venue’s web path runs whole)');
    eq(labels, [L1, L2, L3F, L4], 'PL-004: progress at a non-English venue, found on the web — shop, broader, facts with the English edition, publisher');
    // Re-check stops at the first label, whatever its steps (upTo).
    const shown = [];
    const io = api.lookupIo({ label: l => shown.push(l) }, { upTo: 1 });
    ['shop', 'page', 'shop', 'facts', 'publisher'].forEach(p => io.phase(p));
    const all = [];
    const io2 = api.lookupIo({ label: l => all.push(l) }, {});
    ['shop', 'web', 'page', 'shop', 'facts', 'web', 'publisher', 'page'].forEach(p => io2.phase(p));
    eq([shown, all], [[L1], [L1, L2, L3, L4]], 'PL-005: a label is shown once and never goes back; Re-check’s shop step shows only the first');
  }

  // ── HR-001..HR-009: Hubert Robert — one book per card, and her English-edition cases ─
  // Real results from two lookups (docs/lookup_results/hubert_robert.json); Claude's
  // reads are the answers it gave there. French: Somogy, 544 pages, 978-2757210642 (its
  // 48-page album, 978-2757210659, is what the earlier run filed — FR_ISBN here).
  // English: NGA / Lund Humphries, 288 pages, 978-1848221918 — a different book.
  {
    const HR = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', 'hubert_robert.json'), 'utf8'));
    const FR_ISBN = '9782757210659', EN_ISBN = '9781848221918';
    const FR = 'Hubert Robert (1733-1808) : Un peintre visionnaire';
    const NYRB = 'https://www.nybooks.com/articles/2016/10/13/hubert-robert-the-joy-of-ruins';
    const script = (web, facts, editions, reads) => ({
      mcp: (tool, args) => {
        if (tool !== 'web_search') return shelfOf(args.urls, '[Another book €30](https://x.test/other)');
        const o = String(args.objective || '');
        if (/^Confirm whether/.test(o)) return { payload: { results: web } };
        if (/^An ENGLISH-language edition/.test(o)) return { payload: { results: editions } };
        if (/^The ISBN-13, publisher/.test(o)) return { payload: { results: facts } };
        return { payload: { results: [] } };
      },
      sample: p => isShopRead(p) ? { found: false } : /"found"/.test(p) ? reads.web : isFactsRead(p) ? reads.facts : isJudge(p) ? { kind: 'other', bookUrl: null } : {},
    });

    eq([api.isbnInResults(HR.nga_facts, 'Hubert Robert, 1733–1808'), api.isbnInResults(HR.nga_facts, 'Hubert Robert')], [FR_ISBN, null],
      'HR-001: matched on the show’s dates only the French bookseller carries; on the book’s title the results hold two numbers');

    // NGA, an English venue (run as one the harness knows): the read's English ISBN stands.
    let { out, calls, row: r } = await run(row('ng', 'Hubert Robert, 1733–1808'), script(HR.nga_web, HR.nga_facts, [], {
      web: { found: true, catalogueTitle: null, isbn13: null, publisher: 'Lund Humphries', publisherUrl: null, shopUrl: null, thisVenue: true },
      facts: { isbn13: EN_ISBN, publisher: 'National Gallery of Art', title: 'Hubert Robert' } }));
    eq([r.catalogueTitle, r.isbn13], ['Hubert Robert', EN_ISBN], 'HR-002: NGA — the English book’s own ISBN, never the French one beside its English publisher');
    ok(!/Somogy/i.test(r.publisher || ''), 'HR-003:   and its publisher is the English book’s', r.publisher);
    eq([r.editions.map(v => [v.lang, v.isbn13, v.showing]), r.editionPick], [[['English', EN_ISBN, 'this']], 0],
      'HR-015: NGA, her case 3 — its own English catalogue is picked; the Paris book is not among the versions, because this recording’s facts read names no French edition');

    // Louvre: the French book stands; the English book is a different one (her case three).
    const louvre = (editions) => script(HR.louvre_web, HR.louvre_facts, HR.louvre_editions, {
      web: { found: true, catalogueTitle: FR, isbn13: FR_ISBN, publisher: 'Somogy éditions d\'art', publisherUrl: null, shopUrl: null, thisVenue: true },
      facts: { isbn13: FR_ISBN, publisher: 'Somogy éditions d\'art', language: 'French', title: FR, pages: '544', editions } });
    const LH = { title: 'Hubert Robert', isbn13: EN_ISBN, language: 'English', publisher: 'Lund Humphries', pages: '281', evidenceUrl: NYRB };
    ({ out, calls, row: r } = await run(row('louvre', 'Hubert Robert (1733–1808). A Visionary Painter'), louvre([LH])));
    eq([r.editions.map(v => [v.lang, v.showing, v.title]), r.editionPick, r.catalogueTitle],
      [[['English', 'other', 'Hubert Robert'], ['French', 'this', FR]], 0, 'Hubert Robert'],
      'HR-004: Louvre — the 281-page English book is not the 544-page French one’s edition; kept as another showing’s book, it comes first in her order and is picked');
    ok(/different book/.test(out.detail) && r.englishCheck !== 'english', 'HR-005:   the lookup says why', out.detail.split('\n').find(l => /English/.test(l)));
    eq(api.englishLine(r), null,
      'HR-013:   no English line on a card with several versions — the other book is named by her version lines (stage 2; was "No English edition. An English catalogue from the show’s other venue …")');
    eq([r.editions.filter(v => v.showing === 'other').map(v => [v.isbn13, v.publisher]), r.otherVenueBook, r.isbn13 === EN_ISBN],
      [[[EN_ISBN, 'Lund Humphries']], null, true], 'HR-014:   kept as another showing’s version, and as the first it is the card’s book (no longer written as otherVenueBook)');

    // ── BK-001..BK-005: a booklet's ISBN is not the catalogue's (the 48-page album, 978-2757210659)
    const ALBUM = FR_ISBN, FULL = '9782757210642';
    eq([api.pagesOfIsbn([...HR.louvre_web, ...HR.louvre_facts, ...HR.louvre_editions], ALBUM), api.pagesOfIsbn(HR.louvre2_facts, FULL)], [47, 544],
      'BK-001: the album’s records print 47 pages, the full catalogue’s 544 — read off results carrying that one ISBN only');
    eq([r.editions.map(v => v.isbn13), /47-page book; the catalogue has 544 pages — no ISBN for the catalogue itself/.test(out.detail)], [[EN_ISBN, null], true],
      'BK-002: the earlier Louvre run — the album’s ISBN is refused and, with no other ISBN printed with 544 pages, none is filed on the French version (the album is never a version)');
    const fullRec = HR.louvre2_facts.find(x => /32222598974/.test(x.url));
    const withFull = script(HR.louvre_web, [...HR.louvre_facts, fullRec], HR.louvre_editions, {
      web: { found: true, catalogueTitle: FR, isbn13: ALBUM, publisher: 'Somogy éditions d\'art', publisherUrl: null, shopUrl: null, thisVenue: true },
      facts: { isbn13: ALBUM, publisher: 'Somogy éditions d\'art', language: 'French', title: FR, pages: '544', editions: [] } });
    ({ row: r } = await run(row('louvre', 'Hubert Robert (1733–1808). A Visionary Painter'), withFull));
    eq(r.isbn13, FULL, 'BK-003: with the full catalogue’s record among the results, its ISBN replaces the album’s');
    const F2 = { isbn: FULL, title: 'Hubert Robert, 1733-1808 : un peintre visionnaire' };
    api.notABooklet(F2, [...HR.louvre2_web, ...HR.louvre2_facts, ...HR.louvre2_editions], 544, []);
    eq(F2.isbn, FULL, 'BK-004: today’s Louvre run — the full catalogue’s ISBN stands');
    const F3 = { isbn: ALBUM, title: FR };
    api.notABooklet(F3, [...HR.louvre_web, ...HR.louvre_facts], null, []);
    eq(F3.isbn, ALBUM, 'BK-005: no page count for the catalogue — no verdict, the ISBN stands (a small catalogue is never judged on size alone)');
    const prompts = calls.filter(c => c.kind === 'sample').map(c => c.prompt);
    ok(prompts.some(p => /"found"/.test(p) && /venue's own language — an English edition is checked separately/.test(p)),
      'HR-006:   at a non-English venue the web read takes the venue’s own book; the English edition is decided once, later');
    ok(prompts.some(p => isFactsRead(p) && /SECTION D/.test(p) && p.includes('enfilade18thc.com')),
      'HR-007:   the facts read sees the first web search’s results again (Enfilade’s line about the English book)');

    // Two English editions: both kept; her order puts the venue's own printing first, else as found.
    const first = (list, mid) => { const o = api.versionOrder(list, mid); return list[o[0]] ? list[o[0]].isbn13 : null; };
    const res = [
      { url: 'https://library.test/a', title: 'Hubert Robert: a translation', excerpts: ['Translation of ' + FR + '. ISBN ' + EN_ISBN + ' and the original, ISBN ' + FR_ISBN] },
      { url: 'https://somogy.test/b', title: 'Hubert Robert, English edition', excerpts: ['Publisher: Somogy éditions d\'art. ISBN 9780847899289'] },
    ];
    const eds = [{ title: 'Hubert Robert: a translation', isbn13: EN_ISBN, language: 'English', publisher: 'Elsewhere Press', evidenceUrl: res[0].url },
      { title: 'Hubert Robert, English edition', isbn13: '9780847899289', language: 'English', publisher: 'Somogy éditions d\'art', evidenceUrl: res[1].url }];
    const frV = pub => ({ title: FR, lang: 'French', pages: null, publisher: pub, isbn13: FR_ISBN, showing: 'this' });
    const withEds = (list, pub) => { const o = frV(pub); return [o, ...api.editionsOf(list, o, res, 'louvre', [])]; };
    let vs = withEds(eds, 'Somogy éditions d\'art');
    eq([vs.filter(v => v.showing === 'this').map(v => v.isbn13).sort(), first(vs, 'louvre')], [[EN_ISBN, '9780847899289', FR_ISBN].sort(), EN_ISBN],
      'HR-008: two English editions, neither the Louvre’s own printing — both kept, the one found first leads');
    vs = withEds([...eds].reverse(), 'Somogy éditions d\'art / Louvre éditions');
    const own = vs.find(v => v.isbn13 === '9780847899289');
    eq([own && own.publisher, first(vs, 'louvre')], ['Louvre éditions / Somogy éditions d\'art', '9780847899289'],
      'HR-008a: printed by the original’s house, it shows the original’s publishers, venue first, and comes first as the Louvre’s own printing, whatever order they come in');
    vs = withEds([eds[0]], 'Somogy éditions d\'art');
    eq(first(vs, 'louvre'), EN_ISBN, 'HR-009:   with one English edition, the translation published elsewhere comes before the French original');

    eq([api.pagesPrinted('544', HR.louvre_web), api.pagesPrinted('600', HR.louvre_web), api.pagesPrinted('281', HR.louvre_facts)], [544, null, 281],
      'HR-010: a page count is kept only where the results print it');
    eq([api.differentBook(544, 288), api.differentBook(544, 543), api.differentBook(544, null)], [true, false, false],
      'HR-011: page counts far apart are two books; close or unknown, no verdict');

    // A guessed publisher that contradicts the ISBN's own records gives way to them.
    const F = { isbn: FR_ISBN, publisher: 'Lund Humphries', pubFrom: 'general results', publisherUrl: null };
    api.oneBook(F, [{ url: 'https://shop.test/x', title: FR, excerpts: ['ISBN ' + FR_ISBN + '\nPublisher: Somogy éditions d\'art'] }], [], '', 'louvre');
    eq(F.publisher, 'Somogy éditions d\'art', 'HR-012: a guessed publisher the ISBN’s records contradict is replaced by theirs — one book per card');
  }

  // ── VS-001..VS-008: two printings of one book (her decision, Vasari) ─────────
  // The real Vasari lookup replayed: its results and Claude's answers
  // (docs/lookup_results/louvre_vasari.json). Lienart's paperback 978-2359063738 and
  // the Nationalmuseum's hardcover 978-9171009166, both 240 pages, both English.
  const brief = vs => (vs || []).map(v => [v.lang, v.isbn13, v.alsoIsbn13, v.showing]);
  {
    const V = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', 'louvre_vasari.json'), 'utf8')).calls;
    const pick = (kind, re) => V.find(c => c.kind === kind && re.test(c.objective || ''));
    const reads = V.filter(c => c.kind === 'claude').map(c => c.data);
    const script = {
      mcp: (tool, args) => {
        const o = String(args.objective || '');
        const c = tool === 'web_search'
          ? [pick('search', /^Confirm whether/), pick('search', /^The ISBN-13, publisher/), pick('search', /^An ENGLISH/)].find(c => c && o.slice(0, 30) === c.objective.slice(0, 30))
          : V.find(c => c.kind === 'open' && c.urls && c.urls.join() === args.urls.join());
        return c ? { payload: { results: c.results || [], errors: c.errors || [] } } : { payload: { results: [], errors: [] } };
      },
      sample: p => isShopRead(p) ? reads[0] : /"found"/.test(p) ? reads[1] : isFactsRead(p) ? reads[2] : isJudge(p) ? { kind: 'other', bookUrl: null } : {},
    };
    const { out, row: r } = await run(row('louvre', 'Giorgio Vasari: The Book of Drawings. The Fate of a Legendary Collection'), script);
    eq([r.isbn13, r.editionPick, r.publisher], ['9782359063738', 0, 'Lienart'],
      'VS-001: Vasari — the Louvre’s English paperback comes first, picked, and fills the card, not the Nationalmuseum’s hardcover');
    eq(brief(r.editions), [['English', '9782359063738', null, 'this'], ['English', '9789171009166', null, 'this'], ['French', null, null, 'this']],
      'VS-002:   every version kept, in her order — Lienart’s English (the venue’s own), the Nationalmuseum’s English, the French original (this recording prints no labelled ISBN for it)', out.detail);
    eq(r.editions.slice(0, 2).map(v => [v.binding, v.publisher]), [['paperback', 'Musée du Louvre Editions / Lienart'], ['hardcover', 'Nationalmuseum']],
      'VS-003:   Lienart’s, read off its own page carrying the ISBN, shows the original’s publishers, venue first; the Nationalmuseum’s is the hardcover');
    eq([r.englishCheck, r.originalEdition, r.otherVenueBook, r.alsoVersion], ['english', null, null, null],
      'VS-004:   a new row never writes originalEdition, otherVenueBook or alsoVersion');
    eq(api.versionOrder([{ ...r.editions[1] }, { ...r.editions[0] }], 'louvre'), [1, 0],
      'VS-005: hardcover does not lead by itself — the venue’s own English printing comes first');
    eq(api.versionOrder([{ lang: 'English', publisher: 'Thames & Hudson', showing: 'this', isbn13: '1' }, { lang: 'English', publisher: 'Nationalmuseum', showing: 'this', isbn13: '2' }], 'louvre'), [0, 1],
      'VS-006: two English books from outside houses, bindings unknown — as found');
    eq([api.museumImprintOnly('Musée du Louvre Editions', 'louvre'), api.museumImprintOnly('Musée du Louvre Editions / Lienart', 'louvre')], [true, false],
      'VS-007: a co-edition with an outside house is not a museum’s own imprint');
    const HR = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', 'hubert_robert.json'), 'utf8'));
    eq([api.bindingOfIsbn(HR.louvre2_facts, '9782757210642')], ['hardcover'], 'VS-008: binding read off the records of that one ISBN (Hubert Robert, the full catalogue)');
    eq(api.alsoLine({ isbn13: '9782359063738', binding: 'paperback', publisher: 'Lienart' }), 'also 978-2359063738 (paperback, Lienart)',
      'VS-009: an old row’s also-line still prints in her words after the ISBN');
  }

  // ── R8-001..R8-012: her two Search again runs on 42.8, replayed ──────────────
  // Real results and Claude's answers (docs/lookup_results/louvre_*_42_8.json).
  {
    const replay = file => {
      const V = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', file), 'utf8')).calls;
      const reads = V.filter(c => c.kind === 'claude').map(c => c.data);
      return {
        mcp: (tool, args) => {
          const o = String(args.objective || '');
          const c = tool === 'web_search' ? V.find(c => c.kind === 'search' && c.objective && c.objective.slice(0, 30) === o.slice(0, 30))
            : V.find(c => c.kind === 'open' && c.urls && c.urls.join() === args.urls.join());
          return { payload: { results: (c && c.results) || [], errors: (c && c.errors) || [] } };
        },
        sample: p => isShopRead(p) ? reads[0] : /"found"/.test(p) ? reads[1] : isFactsRead(p) ? reads[2] : isJudge(p) ? { kind: 'other', bookUrl: null } : {},
      };
    };
    let { out, row: r } = await run(row('louvre', 'Hubert Robert (1733–1808). A Visionary Painter'), replay('louvre_hubert_42_8.json'));
    const fr = (r.editions || []).find(v => v.lang === 'French') || {};
    ok(fr.publisher && !/[%[\]()]|imprimeur/.test(fr.publisher), 'R8-001: Hubert Robert — no publisher read out of a link’s address (“-imprimeur/Louvre%20…”)', fr.publisher);
    eq([fr.isbn13, fr.binding, fr.pages], ['9782757210642', 'hardcover', 544], 'R8-002:   the full catalogue’s ISBN, on the French version (hardcover, 544 pages)');
    eq((r.editions || []).filter(v => v.showing === 'other').map(v => [v.isbn13, v.lang, v.pages]), [['9781848221918', 'English', 288]],
      'R8-003:   the NGA book kept as another showing’s different book, though no result ties its ISBN to the Louvre', out.detail.split('\n').filter(l => /English|different/.test(l)).join(' | '));
    eq(brief(r.editions), [['English', '9781848221918', null, 'other'], ['French', '9782757210642', '9782350315355', 'this']],
      'R8-007:   Hubert Robert, her case 2 — the Paris Musées record folds the Louvre’s own number into the French book; the English book comes first (her order)');
    eq([r.editionPick, r.isbn13], [0, '9781848221918'],
      'R8-008:   the first book, the NGA’s English one, starts picked and fills the card (her decision: an English book from another showing is still the one to buy)');
    eq([r.hasCatalogue, api.englishLine(r)], ['yes', null], 'R8-009:   still a catalogue; no English line on a card with several versions (its lines come with stage 2)');
    ({ out, row: r } = await run(row('louvre', 'Giorgio Vasari: The Book of Drawings. The Fate of a Legendary Collection'), replay('louvre_vasari_42_8.json')));
    eq([r.isbn13, r.editionPick], ['9782359063738', 0], 'R8-004: Vasari — the Lienart edition starts picked (the Louvre’s own printing)');
    eq(brief(r.editions), [['English', '9782359063738', null, 'this'], ['English', '9789171009166', null, 'this']],
      'R8-005:   the Nationalmuseum’s English book is a version of its own, never folded into Lienart’s; the French original is missing — this recording’s facts read lists no French edition', out.detail.split('\n').filter(l => /version|numbers/.test(l)).join(' | '));
    ok(/lienarteditions\.com/.test(r.publisherUrl || '') || r.publisherResult !== 'nosite', 'R8-006:   the co-edition’s site found by its outside house, Lienart', [r.publisherUrl, r.publisherResult].join(' '));
    eq(r.editions[0].publisher, 'Musée du Louvre Editions / Lienart', 'R8-010:   publisher names lead with the venue’s own house');
    const book = x => ({ catalogueTitle: x.catalogueTitle, isbn13: x.isbn13, publisher: x.publisher, publisherUrl: x.publisherUrl, publisherResult: x.publisherResult, shopState: x.shopState, shopUrl: x.shopUrl });
    eq([r.editions.every(v => v.card && v.card.isbn13 === v.isbn13), r.editions[r.editionPick].card], [true, book(r)],
      'R8-011:   every version keeps the card’s book fields for it; the picked one’s are the card’s own, publisher page included');
  }

  // ── BT-001..BT-003: Botticelli, artiste et designer, replayed (her case 7) ────
  // Real results (docs/lookup_results/jacquemart_botticelli*.json); Claude's reads played.
  {
    const web = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', 'jacquemart_botticelli.json'), 'utf8')).results;
    const facts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', 'jacquemart_botticelli_isbn.json'), 'utf8')).results;
    const BOOK = 'Botticelli, artiste et designer';
    const script = {
      mcp: (tool, args) => {
        if (tool !== 'web_search') return shelfOf(args.urls, '[Another catalogue €39](https://x.test/other)');
        const o = String(args.objective || '');
        if (/^Confirm whether/.test(o)) return { payload: { results: web } };
        if (/^The ISBN-13, publisher/.test(o)) return { payload: { results: facts } };
        return { payload: { results: [] } };
      },
      sample: p => isShopRead(p) ? { found: false }
        : /"found"/.test(p) ? { found: true, thisVenue: true, catalogueTitle: BOOK, isbn13: null, publisher: 'Fonds Mercator', publisherUrl: null, shopUrl: null }
        : isFactsRead(p) ? { isbn13: '9789462302815', publisher: 'Fonds Mercator', language: 'French', title: BOOK,
            editions: [{ title: 'Botticelli: Artist and Designer', isbn13: '9781789144383', language: 'English', publisher: 'Reaktion Books', evidenceUrl: web[1].url }] }
        : {},
    };
    const { calls, row: r } = await run(row('jacquemart', 'Botticelli, artist and designer'), script);
    const factsPromptSent = calls.filter(c => c.kind === 'sample' && isFactsRead(c.prompt)).map(c => c.prompt)[0] || '';
    ok((factsPromptSent.match(/"year": string\|null, "venueCity": string\|null/g) || []).length === 2,
      'CY-004: the facts read asks each version and edition for its year and the other showing’s city, in the one read it already makes');
    eq(brief(r.editions), [['French', '9789462302815', null, 'this']], 'BT-001: Botticelli — one version, Fonds Mercator’s French catalogue');
    eq([r.editionPick, r.isbn13], [0, '9789462302815'], 'BT-002:   one version only, so it is picked and fills the card');
    eq(api.englishLine(r), 'No English edition found in bookshops.', 'BT-003:   a one-version foreign card keeps today’s English line; Reaktion’s book is left off (this recording prints no ISBN for it — ED-004 proves the refusal)');
  }

  // ── VO-001..VO-006: her order, on her nine cases (docs/lookup_proof_cards.json) and her Yale cards ─
  {
    const CARDS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_proof_cards.json'), 'utf8')).cards;
    const versionsOf = c => c.versions.map(v => ({ ...v, title: c.title }));
    const firstOf = (vs, mid) => vs[api.versionOrder(vs, mid)[0]].isbn13;
    eq(CARDS.map(c => firstOf(versionsOf(c), c.venue)), CARDS.map(c => c.pick),
      'VO-001: her nine cases — the first in her order is each card’s starting pick (Hubert Robert, Louvre: the NGA’s English book)');
    eq(CARDS.every(c => firstOf(versionsOf(c).reverse(), c.venue) === c.pick), true, 'VO-002: the first does not depend on the order the versions were found in, where her order separates them');
    const v = (lang, binding, publisher, isbn13, showing = 'this') => ({ lang, binding, publisher, isbn13, showing, pages: null });
    const order = (vs, mid) => api.versionOrder(vs, mid).map(i => vs[i].isbn13).join(' ');
    eq(order([v('French', null, 'Fonds Mercator', 'F'), v('English', null, 'Rizzoli Electa', 'E'), v('English', null, 'Louvre éditions', 'O')], 'louvre'), 'O E F',
      'VO-003: English in the venue’s own imprint, then English from anyone else, then other languages');
    eq([order([v('French', 'paperback', 'Hazan', 'P'), v('French', null, 'Hazan', 'U'), v('French', 'hardcover', 'Hazan', 'H')], 'louvre'),
        order([v('English', 'paperback', 'Lund Humphries', 'P', 'other'), v('English', 'hardcover', 'Rizzoli', 'H')], 'louvre')], ['H P U', 'H P'],
      'VO-004: within a group, hardcover, then paperback, then a binding not known; another showing’s book is ordered like any other');
    eq(order([v('English', null, 'Thames & Hudson', 'A'), v('English', null, 'Rizzoli', 'B'), v(null, null, null, 'N')], 'louvre'), 'A B N',
      'VO-005: otherwise as found; a book of unknown language goes with the other languages');
    api.registerOccasional({ 'occ-britishart-yale-edu': { id: 'occ-britishart-yale-edu', name: 'Yale Center for British Art', host: 'britishart.yale.edu', shop: 'found', confirmed: true, finder: 3,
      shopHome: 'https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true', shopCatalogues: null, shopSearch: null } });
    const Y = 'occ-britishart-yale-edu';
    eq([order([v('English', 'paperback', 'Yale University Press', '9780300125009'), v('English', 'paperback', 'Yale Center For British Art', '9780300119695')], Y),
        order([v('English', 'hardcover', 'Henry E. Huntington Library And Art Gallery', '9780930606992', 'other'),
          v('English', 'hardcover', 'Yale Center for British Art and the Huntington Library, Art Collections, and Botanical Gardens in association with / Yale University Press', '9780300110029')], Y),
        order([v('English', 'paperback', 'American Federation of Arts & DelMonico Books, Prestel', '9781885444479'), v('English', null, 'DelMonico Books', '9783791357638')], Y)],
      ['9780300125009 9780300119695', '9780300110029 9780930606992', '9781885444479 9783791357638'],
      'VO-006: her Yale cards — Canaletto in England: Yale University Press and the Yale Center rank the same, so as found; Sensation and Sensibility: Yale’s own before San Marino’s; Victorian Radicals: the paperback before the binding not known');
    // Her decisions: in the museum shop first at an English-language venue; Yale's two imprints rank the same.
    const sv = (lang, binding, publisher, isbn13, shopFirst) => ({ ...v(lang, binding, publisher, isbn13), shopFirst });
    eq([order([v('English', 'hardcover', 'Yale Center for British Art', 'H'), sv('English', 'paperback', 'Yale University Press', 'P', true)], Y),
        order([v('English', 'hardcover', 'National Gallery Company', 'N'), sv('French', null, 'Hazan', 'F', true), sv('English', null, 'Rizzoli', 'R', true)], 'ng')],
      ['P H', 'R F N'],
      'VO-007: at an English-language venue a book in its museum shop comes first; two in the shop keep her order between them');
    eq(order([sv('German', 'hardcover', 'KHM-Museumsverband', 'G', true), v('English', null, 'Yale University Press', 'E')], 'khm'), 'E G',
      'VO-008: at a non-English venue English comes first, always — a book in the shop does not jump it');
    eq([order([v('English', 'paperback', 'Yale University Press', 'U'), v('English', 'hardcover', 'Yale Center for British Art', 'C')], Y),
        order([v('English', 'hardcover', 'Yale University Press', 'U'), v('English', 'hardcover', 'Thames & Hudson', 'T')], Y),
        order([v('English', 'hardcover', 'Thames & Hudson', 'T'), v('English', 'hardcover', 'Yale University Press', 'U')], 'ng')],
      ['C U', 'U T', 'T U'],
      'VO-009: on a Yale card Yale University Press ranks as the Yale Center does — hardcover decides between them, and it leads an outside house; on another venue’s card it does not');
  }

  // ── FO-001..FO-006: one book, two numbers — a co-edition folds into one version ─
  {
    const ver = (lang, publisher, isbn13, showing = 'this') => ({ title: 'x', lang, publisher, isbn13, alsoIsbn13: null, showing, binding: null, pages: null });
    const rec = (url, text) => ({ url, title: 'Record', excerpts: [text] });
    // Vasari French: the record's form as she found it (docs/catalogue_versions.md).
    let vs = [ver('French', 'Musée du Louvre Editions / Lienart', '9782359063721'), ver('English', 'Musée du Louvre Editions / Lienart', '9782359063738')];
    api.foldCoEditions(vs, [rec('https://lib.test/vasari', 'Giorgio Vasari, le Livre des dessins. 240 p. ISBN : 978-2-35906-372-1. - 978-2-35031-744-1')], 'louvre', []);
    eq(brief(vs), [['French', '9782359063721', '9782350317441', 'this'], ['English', '9782359063738', null, 'this']],
      'FO-001: Vasari French — the Louvre’s own number folds into Lienart’s book, which leads');
    // Hubert Robert French: the real Paris Musées record (louvre_hubert_42_8.json).
    const HRV = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', 'louvre_hubert_42_8.json'), 'utf8')).calls;
    const paris = HRV.flatMap(c => c.results || []).filter(x => /parismuseescollections/.test(x.url) && /978-2-35031-535-5/.test(JSON.stringify(x)));
    vs = [ver('French', 'Somogy', '9782757210642'), ver('English', 'Lund Humphries', '9781848221918', 'other')];
    api.foldCoEditions(vs, paris, 'louvre', []);
    eq(brief(vs), [['French', '9782757210642', '9782350315355', 'this'], ['English', '9781848221918', null, 'other']],
      'FO-002: Hubert Robert French — Somogy’s number leads, the Louvre’s own folded in, from the real library record');
    // The museum's own number found first: the outside house's number takes the lead.
    const lab = (n, pub) => [1, 2].map(k => rec('https://shop' + k + '.test/' + n, 'Publisher: ' + pub + '\nISBN ' + n));
    vs = [ver('French', 'Musée du Louvre Editions', '9782350317441')];
    api.foldCoEditions(vs, [rec('https://lib.test/v', 'ISBN : 978-2-35031-744-1. - 978-2-35906-372-1'), ...lab('9782350317441', 'Musée du Louvre éditions'), ...lab('9782359063721', 'Lienart')], 'louvre', []);
    eq([vs[0].isbn13, vs[0].alsoIsbn13], ['9782359063721', '9782350317441'], 'FO-003: found by the museum’s own number, the outside house’s number still leads');
    // Two books never fold: bindings that differ, or page counts far apart.
    const pair = rec('https://lib.test/two', 'ISBN 9789462302495 ; 9780847899289');
    vs = [ver('French', 'Fonds Mercator', '9789462302495')];
    api.foldCoEditions(vs, [pair, rec('https://a.test/1', 'Relié. ISBN 9789462302495'), rec('https://b.test/2', 'Broché. ISBN 9780847899289')], 'jacquemart', []);
    const bindings = vs[0].alsoIsbn13;
    vs = [ver('French', 'Fonds Mercator', '9789462302495')];
    api.foldCoEditions(vs, [pair, rec('https://a.test/1', '256 pages. ISBN 9789462302495'), rec('https://b.test/2', '175 pages. ISBN 9780847899289')], 'jacquemart', []);
    eq([bindings, vs[0].alsoIsbn13], [null, null], 'FO-004: two different books never fold — a hardcover and a paperback, or 256 pages against 175');
    // Vasari English: one library record lists Lienart's and the Nationalmuseum's numbers.
    vs = [ver('English', 'Musée du Louvre Editions / Lienart', '9782359063738'), ver('English', 'Nationalmuseum', '9789171009166')];
    api.foldCoEditions(vs, [rec('https://lib.test/en', 'Giorgio Vasari, the book of drawings. ISBN 9789171009166 ; 9782359063738')], 'louvre', []);
    eq(brief(vs).map(x => x[1] + '/' + x[2]), ['9782359063738/null', '9789171009166/null'], 'FO-005: another house’s own printing is never folded in (the Nationalmuseum’s English book)');
    // Two numbers side by side with no ISBN label are not a record of one book.
    vs = [ver('French', 'Somogy', '9782757210642')];
    api.foldCoEditions(vs, [rec('https://ccfr.test/n', 'Notice 1 sur 1\n978-2-35031-535-5 978-2-7572-1064-2 français Hubert Robert')], 'louvre', []);
    eq(vs[0].alsoIsbn13, null, 'FO-006: two numbers side by side with no ISBN label are not evidence — nothing folds');
  }

  // ── VF-001..VF-003: names, venue first; versions stored without the lookup's own fields ─
  {
    eq([api.venueFirst('Somogy éditions d\'art / Louvre éditions', 'louvre'), api.venueFirst('Fonds Mercator / Musée Jacquemart-André', 'jacquemart'),
        api.venueFirst('Hannibal Books', 'rijks'), api.venueFirst('Rizzoli Electa', 'jacquemart')],
      ['Louvre éditions / Somogy éditions d\'art', 'Musée Jacquemart-André / Fonds Mercator', 'Hannibal Books', 'Rizzoli Electa'],
      'VF-001: publisher names lead with the venue’s own house; a name without one is unchanged');
    eq(Object.keys(api.storedVersion({ title: 't', lang: 'French', isbn13: '1', showing: 'this', _pub: 'x', _found: true })),
      ['title', 'lang', 'binding', 'pages', 'publisher', 'isbn13', 'alsoIsbn13', 'showing', 'proofUrl', 'note', 'city', 'year', 'card', 'shopFirst'],
      'VF-002: a stored version keeps her fields, the other showing’s city, its year and whether it was found in the shop; the lookup’s own are dropped');
    eq([api.englishLine({ englishCheck: 'shops', editions: [{}] }), api.englishLine({ englishCheck: 'shops', editions: [{}, {}] })],
      ['No English edition found in bookshops.', null], 'VF-003: a one-version card keeps today’s English line; a card with several has none until her version lines');
  }


  // ── VB-001..VB-010: her version blocks, word for word (docs/catalogue_versions.md, "Her layout") ─
  // Rows built from her cases (docs/lookup_proof_cards.json) with the city, year and
  // proving page her cases give. A block reads: marker | title | publisher | facts | ISBN | why and source.
  {
    const CARDS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_proof_cards.json'), 'utf8')).cards;
    const caseRow = (n, start, extra) => {
      const c = CARDS.find(x => x.case === n);
      const editions = c.versions.map((v, i) => ({ title: c.title, note: null, city: null, year: null, proofUrl: null, card: null, ...v, ...(extra[i] || {}) }));
      const pick = editions.findIndex(v => v.isbn13 === c.pick);
      return { id: 'vl-' + n, museumId: c.venue, title: c.title, startDate: start, looked: true, hasCatalogue: 'yes', editions, editionPick: pick < 0 ? null : pick };
    };
    const shown = r => { const vb = api.versionBlocks(r);
      return vb ? vb.map(b => [b.picked ? '●' : '○', b.title, b.publisher, b.facts,
        b.isbn ? 'ISBN ' + b.isbn + (b.also ? '; ' + b.also.isbn + ' (' + b.also.whose + ')' : '') : 'ISBN not confirmed',
        [b.why, b.source ? 'Source: ' + b.source.host : null].filter(Boolean).join(' ') || null].filter(Boolean).join(' | ')) : null; };
    const LOUVRE_ED = 'https://www.louvre.fr/editions/catalogue/giorgio-vasari-le-livre-des-dessins';
    const PDF = 'https://mini-site.louvre.fr/trimestriel/2016/Catalogue_Editions_2016/files/assets/common/downloads/publication.pdf';
    const NGA = 'https://www.nga.gov/sites/default/files/migrate_images/content/dam/ngaweb/research/gallery-archives/pressreleases/2012-2010/2016/14a11_108163_20160615.pdf';
    const vasari = caseRow(1, '2022-03-31', [{ proofUrl: LOUVRE_ED }, { proofUrl: 'https://www.lienarteditions.com/product-page/giorgio-vasari-the-book-of-drawings' },
      { proofUrl: 'https://nationalmuseum.bokorder.se/en-us/shop/book/4580?slug=giorgio-vasari-the-book-of-drawings', city: 'Stockholm' }]);
    eq(shown(vasari), [
      '● | Giorgio Vasari, the Book of Drawings | Louvre Éditions / Lienart | English · Paperback | ISBN 978-2359063738 | This venue\'s English edition. Source: lienarteditions.com',
      '○ | Giorgio Vasari The Book of Drawings – The fate of a mythical collection | Nationalmuseum | English · Hardcover | ISBN 978-9171009166 | From the show\'s Stockholm exhibition. Source: nationalmuseum.bokorder.se',
      '○ | Giorgio Vasari. Le Livre des dessins. Destinées d\'une collection mythique | Louvre Éditions / Lienart | French | ISBN 978-2359063721; 978-2350317441 (Louvre’s own number for the same book) | The original edition. Source: louvre.fr'],
      'VB-001: Vasari — three blocks in her order, ● on Lienart’s English, the Louvre’s own number on the French');
    eq(api.versionBlocks(vasari).map(b => b.i), [1, 2, 0], 'VB-002:   each block knows its version’s place in the ledger, so a tap picks the right one');
    const hrL = caseRow(2, '2016-03-08', [{ proofUrl: PDF }, { proofUrl: NGA, city: 'Washington' }]);
    eq(shown(hrL), [
      '● | Hubert Robert | National Gallery of Art / Lund Humphries | English · Hardcover · 288 pp | ISBN 978-1848221918 | A different book, from the show\'s Washington exhibition. Source: nga.gov',
      '○ | Hubert Robert, 1733-1808 : un peintre visionnaire | Louvre Éditions / Somogy | French · Hardcover · 544 pp | ISBN 978-2757210642; 978-2350315355 (Louvre’s own number for the same book) | This showing\'s catalogue. Source: mini-site.louvre.fr'],
      'VB-003: Hubert Robert, Louvre card — the English book first; "notably" gone from her note');
    const ham = caseRow(4, '2019-03-14', [{ proofUrl: 'https://www.leslibraires.ca/en/livres/hammershoi-jean-loup-champion-9789462302495.html' },
      { proofUrl: 'https://www.rizzoliusa.com/book/9780847899289', year: 2023 }]);
    eq(shown(ham), [
      '● | Hammershøi: Painter of Northern Light | Rizzoli Electa · 2023 | English | ISBN 978-0847899289 | The English edition, published later. Source: rizzoliusa.com',
      '○ | Hammershøi : le maître de la peinture danoise | Culturespaces / Fonds Mercator | French | ISBN 978-9462302495 | The original edition. Source: leslibraires.ca'],
      'VB-004: Hammershøi — the later English edition first, its year after the publisher');
    const HAN = 'https://hannibalbooks.be/uploads/images/covers/2026_ENG_VOORJAAR_DRUK_compressed.pdf';
    const met = caseRow(8, '2026-02-20', [{ proofUrl: HAN }, { proofUrl: HAN }, { proofUrl: HAN }]);
    eq(shown(met), ['● | Metamorphoses: Ovid and the Arts | Hannibal | English · Paperback | ISBN 978-9493416543 | Source: hannibalbooks.be',
      '○ | Metamorfosen – Ovidius en de kunsten | Hannibal | Dutch | ISBN 978-9493416550 | Source: hannibalbooks.be', '○ | Hannibal | Italian | ISBN 978-9493416857 | Source: hannibalbooks.be'],
      'VB-005: Metamorphoses — one house, only the language differs: no notes; every block carries its own source');
    eq([5, 6, 7, 9].map(n => shown(caseRow(n, '2024-01-01', []))), [null, null, null, null],
      'VB-006: Watteau, Canaletto – Guardi, Botticelli, Millet — one version: no blocks, the card as now');
    eq(api.versionBlocks({ museumId: 'louvre', editions: null }), null, 'VB-007: an old row with no versions has no blocks');
    const bound = { ...vasari, editions: vasari.editions.map((v, i) => ({ ...v, binding: i === 0 ? 'with flaps' : v.binding })) };
    ok(!/flaps/i.test(shown(bound).join(' ')), 'VB-008: binding is Hardcover or Paperback only — never "with flaps"', shown(bound).join(' / '));
    const noCity = caseRow(2, '2016-03-08', [{ proofUrl: PDF }, { proofUrl: NGA }]);
    ok(/A different book, from the show's other exhibition\./.test(shown(noCity)[0]), 'VB-009: another showing’s book with no city known — "from the show\'s other exhibition"', shown(noCity)[0]);
    ok(shown(vasari).every(l => /978-\d{10}/.test(l) && !/978\d{10}/.test(l)), 'VB-010: every ISBN-13 is shown 978-xxxxxxxxxx');

    // ── PK-001..PK-003: her pick moves; the card's book follows it, nothing else changes
    const card = (title, isbn13, publisher) => ({ catalogueTitle: title, isbn13, publisher, publisherUrl: null, publisherResult: null, shopState: 'web', shopUrl: null });
    const row0 = { ...vasari, catalogueTitle: 'The Book of Drawings', isbn13: '9782359063738', publisher: 'Lienart', publisherUrl: 'https://www.lienarteditions.com/', publisherResult: 'site',
      shopState: 'web', shopUrl: null, interested: true, acquiring: 'yes', editedAt: null,
      editions: vasari.editions.map((v, i) => ({ ...v, card: card('Book ' + i, v.isbn13, v.publisher) })) };
    row0.editions[1].card = { catalogueTitle: 'The Book of Drawings', isbn13: '9782359063738', publisher: 'Lienart', publisherUrl: 'https://www.lienarteditions.com/', publisherResult: 'site', shopState: 'web', shopUrl: null };
    const moved = api.pickRow(row0, 2, '2026-10-10T00:00:00.000Z');
    const changed = Object.keys(moved).filter(k => JSON.stringify(moved[k]) !== JSON.stringify(row0[k])).sort();
    eq([moved.editionPick, moved.isbn13, changed], [2, '9789171009166', ['catalogueTitle', 'editedAt', 'editionPick', 'isbn13', 'publisher', 'publisherResult', 'publisherUrl']],
      'PK-001: Vasari — picking Stockholm’s hardcover moves the pick and fills the card’s book from it; nothing else in the row changes');
    eq(api.pickRow(moved, 1, 'later'), { ...row0, editedAt: 'later' }, 'PK-002:   picking Lienart’s again restores its book, its publisher page included');
    eq(api.pickRow(row0, 1, 'x'), row0, 'PK-003:   tapping the version already picked changes nothing');
  }

  // ── CY-001..CY-003: the other showing's city and an edition's year ─────────
  {
    const rec = [{ url: 'https://bokorder.test/vasari', title: 'Giorgio Vasari', excerpts: ['Published for the exhibition at the Nationalmuseum, Stockholm, 2022. ISBN 9789171009166'] }];
    eq([api.cityOf('Stockholm', 'Nationalmuseum', rec, 'louvre'), api.cityOf('Uppsala', 'Nationalmuseum', rec, 'louvre')], ['Stockholm', null],
      'CY-001: Vasari — the read’s city is kept only where the text prints it');
    eq([api.cityOf(null, 'Musée du Louvre / Somogy', [], 'occ-nga-gov'), api.cityOf(null, 'National Gallery of Art / Lund Humphries', [], 'louvre')], ['Paris', null],
      'CY-002: a publisher that is one of her venues gives that venue’s city; “National Gallery of Art” is not the National Gallery, London');
    eq([api.yearOf('2023', [TUM]), api.yearOf('2021', [TUM]), api.yearOf(null, [TUM])], [2023, null, null], 'CY-003: Hammershøi — Rizzoli’s 2023 is kept only where a record carrying its ISBN prints it');
  }


  // ── YS-001..YS-006: Yale — a shelf of titles without prices, every page blank unless
  // its address names a page. Made from the live replies of 17 Oct (trimmed).
  {
    const T = 'https://secure.touchnet.net/C20510_ustores/web/';
    const PUBS = T + 'store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true';
    const P2564 = T + 'product_detail.jsp?PRODUCTID=2564&SINGLESTORE=true', P2409 = T + 'product_detail.jsp?PRODUCTID=2409&SINGLESTORE=true';
    const LIST = 'YCBA Home - Publications Skip to Main Content\n\n# Publications\n\n1. [YCBA Home](' + T + 'store_main.jsp?STOREID=7&SINGLESTORE=true)\n2. Publications\n\n'
      + '[Painters, Ports, and Profits: Arts and the East India Company, 1750-1850 Painters, Ports, and Profits: Arts and the East India Company, 1750-1850](' + P2564 + ')\n\n'
      + '[Gwen John: Strange Beauties Gwen John: Strange Beauties](' + T + 'product_detail.jsp?PRODUCTID=2565&SINGLESTORE=true)\n\n'
      + '[Constable Constable](' + P2409 + ')\n\n[Blake Blake](' + T + 'product_detail.jsp?PRODUCTID=2406&SINGLESTORE=true)\n\n'
      + '[Endless Forms: Charles Darwin, Natural Science, and the Visual Arts Endless Forms: Charles Darwin, Natural Science, and the Visual Arts](' + T + 'product_detail.jsp?PRODUCTID=42&SINGLESTORE=true)\n\n[Yale](http://www.yale.edu/)';
    const BOOK = (title, isbn, price) => '# ' + title + '\n\n1. [YCBA Home](' + T + 'store_main.jsp?STOREID=7&SINGLESTORE=true)\n2. [Publications](' + PUBS + ')\n\n'
      + 'Description ' + 'A generously illustrated volume from the YCBA Collection Series. '.repeat(6) + 'Published by the Yale Center for British Art Hardcover 128 Pages ISBN ' + isbn + '\n\nPrice:\n\n' + price + '\n\nQuantity:\n\nAdd to Basket';
    const page = u => {
      if (u === P2564 + '&page=1') return BOOK('Painters, Ports, and Profits', '9780300286540', '$65.00');
      if (u === P2409 + '&page=1') return BOOK('Constable', '9780300284669', '$40.00');
      if (u === P2564 || u === P2409) return u === P2409 ? 'Constable' : 'Painters, Ports, and Profits';
      if (u === PUBS) return 'YCBA Home - Publications';
      if (u.startsWith(PUBS + '&page=')) return LIST;
      return '';
    };
    const calls = [];
    const y = lift({
      mcp: (tool, args) => tool === 'web_search' ? { payload: { results: [] } }
        : { payload: { errors: [], results: args.urls.map(u => args.full_content ? { url: u, title: 'Store', excerpts: [page(u)], full_content: page(u) }
          : { url: u, title: 'Store Cat', excerpts: [u.startsWith(PUBS + '&page=') ? '# Publications\n[Constable Constable](' + P2409 + ')' : page(u).slice(0, 60)] }) } },
      sample: p => /"forSale"/.test(p) ? { forSale: true, why: 'Add to Basket, $40.00.' }
        : isShopRead(p) ? (/Constable Constable/.test(p) ? { found: true, thisVenue: true, catalogueTitle: 'Constable', isbn13: null, publisher: null, publisherUrl: null, shopUrl: P2409 } : { found: false })
        : isPageRead(p) ? { isbn13: '9780300284669', publisher: 'Yale Center for British Art', publisherUrl: null }
        : {},
    }, calls);
    y.registerOccasional({ 'occ-britishart-yale-edu': { id: 'occ-britishart-yale-edu', name: 'Yale Center for British Art', host: 'britishart.yale.edu',
      shop: 'found', confirmed: true, finder: 3, shopHome: T + 'store_main.jsp?STOREID=7&SINGLESTORE=true', shopCatalogues: PUBS, shelfKind: 'publications', shopSearch: null } });
    const out = await y.lookupCatalogue(row('occ-britishart-yale-edu', 'John Constable: The Landscape Reimagined'), { label: () => {} });
    const r = out.row, opened = u => calls.some(c => c.tool === 'web_fetch' && c.args.urls.includes(u));
        eq([r.shopState, r.shopUrl], ['shop', P2409], 'YS-001: Yale Constable — a shelf of titles without prices is read: In the museum shop, its own page linked', JSON.stringify([r.shopState, r.shopUrl, out.detail]));
    ok(opened(P2564 + '&page=1'), 'YS-002:   the shelf proved books by its first product, read with "page=1" when blank (one copy with the finder)');
    ok(opened(P2409 + '&page=1') && r.isbn13 === '9780300284669', 'YS-003:   Constable’s own page read for its ISBN, with "page=1" when blank', JSON.stringify([r.isbn13]));
    calls.length = 0;
    const re = await y.recheckShopRow(r, { label: () => {} });
    ok(re.ok && re.said === 'Re-checked: still for sale in the museum shop.' && opened(P2409 + '&page=1'),
      'YS-004: Re-check museum shop reads Constable’s page (blank, then "page=1") and finds it still for sale', JSON.stringify([re.ok, re.said]));
    const POPUP = '# Membership\n' + 'Join now to save 20% on your first order. '.repeat(15) + '[View All Memberships](https://store.test/pages/memberships)';
    const shelf = args => ({ payload: { errors: [], results: args.urls.map(u => args.full_content ? { url: u, title: 'Store', excerpts: [POPUP], full_content: POPUP }
      : { url: u, title: 'Store', excerpts: ['# Membership'] }) } });
    const calls2 = [];
    const y3 = lift({ mcp: (tool, args) => tool === 'web_search' ? { payload: { results: [] } } : shelf(args), sample: () => ({ found: false }) }, calls2);
    y3.registerOccasional({ 'occ-britishart-yale-edu': { id: 'occ-britishart-yale-edu', name: 'Yale Center for British Art', host: 'britishart.yale.edu',
      shop: 'found', confirmed: true, finder: 3, shopHome: 'https://store.test/', shopCatalogues: 'https://store.test/collections/books', shelfKind: 'books', shopSearch: null } });
    const m = await y3.lookupCatalogue(row('occ-britishart-yale-edu', 'Test Show'), { label: () => {} });
    eq(m.row.shopState, 'script', 'YS-005: a shelf with neither prices nor product links (MoMA’s pop-up) is still JS-rendered', JSON.stringify(m.row.shopState));
  }

  // ── SB-001..SB-008: the book found on the web, looked for again on the shop's own list
  // (her decision, Yale Constable). The shelf read says "not this show's" — as Claude did
  // live — and the web names the book; every shelf link carrying its title is opened.
  {
    const T = 'https://secure.touchnet.net/C20510_ustores/web/';
    const PUBS = T + 'store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true';
    const P2564 = T + 'product_detail.jsp?PRODUCTID=2564&SINGLESTORE=true', P2409 = T + 'product_detail.jsp?PRODUCTID=2409&SINGLESTORE=true';
    const P900 = T + 'product_detail.jsp?PRODUCTID=900&SINGLESTORE=true';
    const LIST = '# Publications\n\n[Painters, Ports, and Profits Painters, Ports, and Profits](' + P2564 + ')\n\n[Constable: Drawings Constable: Drawings](' + P900 + ')\n\n'
      + '[Constable Constable](' + P2409 + ')\n\n[Blake Blake](' + T + 'product_detail.jsp?PRODUCTID=2406&SINGLESTORE=true)\n\n[Yale](http://www.yale.edu/)';
    const BOOK = (title, isbn, price, pages) => '# ' + title + '\n\n1. [YCBA Home](' + T + 'store_main.jsp?STOREID=7&SINGLESTORE=true)\n2. [Publications](' + PUBS + ')\n\n'
      + 'Description ' + 'A generously illustrated volume from the YCBA Collection Series. '.repeat(6) + 'Published by the Yale Center for British Art Hardcover ' + pages + ' Pages'
      + (isbn ? ' ISBN ' + isbn : '') + '\n\nPrice:\n\n' + price + '\n\nQuantity:\n\nAdd to Basket';
    const make = ({ constableIsbn = '9780300284669', constablePages = 128, forSale = true, readFails = false, pageFails = false } = {}) => {
      const page = u => {
        if (u === P2564 + '&page=1') return BOOK('Painters, Ports, and Profits', '9780300286540', '$65.00', 280);
        if (u === P900 + '&page=1') return BOOK('Constable: Drawings', '9780300111118', '$30.00', 96);
        if (u === P2409 + '&page=1') return BOOK('Constable', constableIsbn, '$40.00', constablePages);
        if ([P2564, P900, P2409].includes(u)) return 'Product Detail';
        if (u === PUBS) return 'YCBA Home - Publications';
        if (u.startsWith(PUBS + '&page=')) return LIST;
        return '';
      };
      const calls = [];
      const y = lift({
        mcp: (tool, args) => tool === 'web_search'
          ? { payload: { results: [{ url: 'https://britishart.yale.edu/exhibitions-programs/john-constable-landscape-reimagined', title: 'John Constable: The Landscape Reimagined',
              excerpts: ['Accompanying Publication: Constable, the third installment in YCBA’s Collection Series. Hardcover, 128 pages. ISBN 9780300284669. Published by the Yale Center for British Art.'] }] } }
          : pageFails && args.urls.includes(P2409 + '&page=1') ? (() => { const e = new Error('upstream'); e.code = 'upstream_error'; throw e; })()
          : { payload: { errors: [], results: args.urls.map(u => ({ url: u, title: 'Store', excerpts: [page(u)], ...(args.full_content ? { full_content: page(u) } : {}) })) } },
        sample: p => /"forSale"/.test(p) ? (readFails ? (() => { const e = new Error('upstream'); e.code = 'upstream_error'; throw e; })()
            : { forSale, why: forSale ? 'Add to Basket, $40.00.' : 'Out of Stock.' })
          : isShopRead(p) ? { found: false }
          : isFactsRead(p) ? { isbn13: '9780300284669', publisher: 'Yale Center for British Art', pages: '128', language: 'English', title: 'Constable' }
          : /"found"/.test(p) ? { found: true, thisVenue: true, catalogueTitle: 'Constable', isbn13: '9780300284669', publisher: 'Yale Center for British Art', publisherUrl: null, shopUrl: null }
          : {},
      }, calls);
      y.registerOccasional({ 'occ-britishart-yale-edu': { id: 'occ-britishart-yale-edu', name: 'Yale Center for British Art', host: 'britishart.yale.edu',
        shop: 'found', confirmed: true, finder: 3, shopHome: T + 'store_main.jsp?STOREID=7&SINGLESTORE=true', shopCatalogues: PUBS, shelfKind: 'publications', shopSearch: null } });
      return { y, calls, opened: u => calls.some(c => c.tool === 'web_fetch' && c.args.urls.includes(u)) };
    };
    const yrow = row('occ-britishart-yale-edu', 'John Constable: The Landscape Reimagined');
    {
      const { y, calls, opened } = make();
      const out = await y.lookupCatalogue(yrow, { label: () => {} });
      const r = out.row;
      eq([r.shopState, r.shopUrl, r.isbn13], ['shop', P2409, '9780300284669'], 'SB-001: Yale Constable — not taken off the list, found on the web, then found on the list by its ISBN: In the museum shop', JSON.stringify([r.shopState, r.shopUrl, out.detail.split('\n').slice(-6)]));
      ok(opened(P900 + '&page=1') && opened(P2409 + '&page=1'), 'SB-002:   every link carrying "Constable" is opened — two, not refused as ambiguous');
      ok(/Not this book: .*PRODUCTID=900/.test(out.detail), 'SB-003:   "Constable: Drawings" prints another ISBN — not this book', out.detail.split('\n').slice(-8).join(' | '));
      calls.length = 0;
      const re = await y.recheckShopRow(r, { label: () => {} });
      ok(re.ok && re.said === 'Re-checked: still for sale in the museum shop.', 'SB-004: Re-check then reads Constable’s page and finds it still for sale', JSON.stringify(re.said));
    }
    {
      const { y } = make({ constableIsbn: null });
      const r = (await y.lookupCatalogue(yrow, { label: () => {} })).row;
      eq([r.shopState, r.shopUrl], ['shop', P2409], 'SB-005: no ISBN on the shop’s page — the same page count (128) settles it');
    }
    {
      const { y } = make({ constableIsbn: null, constablePages: 240 });
      const r = (await y.lookupCatalogue(yrow, { label: () => {} })).row;
      eq([r.shopState, r.shopUrl], ['web', null], 'SB-006: no ISBN and a different page count — not this book; stays found on the web');
    }
    {
      const { y } = make({ forSale: false });
      const r = (await y.lookupCatalogue(yrow, { label: () => {} })).row;
      eq([r.shopState, r.shopUrl], ['web', null], 'SB-007: the right book but not for sale — not filed as in the shop');
    }
    // A failed read is never "not in the shop" (her decision, her Blocks Check run of Constable:
    // the product page opened, then the read failed upstream, and the card said not in the shop).
    {
      const { y } = make({ readFails: true });
      const out = await y.lookupCatalogue(yrow, { label: () => {} });
      eq([out.row.shopState, out.row.shopUrl, !!out.trouble], [null, null, true], 'SB-009: the book’s page opened but its read failed — no shop answer, and the lookup did not finish', JSON.stringify([out.row.shopState, out.trouble]));
      const v = out.row.editions[out.row.editionPick];
      eq(v && v.card && v.card.shopState, null, 'SB-010:   the picked book’s stored answer is the same: not known');
    }
    {
      const { y } = make({ pageFails: true });
      const out = await y.lookupCatalogue(yrow, { label: () => {} });
      eq([out.row.shopState, !!out.trouble], [null, true], 'SB-011: the book’s page would not open — the same: no shop answer, lookup not finished', JSON.stringify([out.row.shopState, out.trouble]));
    }
    {
      const F = { isbn: '9780300284669', publisher: 'Yale Center for British Art' };
      const res = text => [{ url: 'x', full_content: text }];
      eq([api.sameBookOnPage(res('Published by the Yale Center for British Art. $40.00'), F, { pages: null }),
          api.sameBookOnPage(res('Published by Thames & Hudson. $40.00'), F, { pages: null })],
        ['the same publisher', null], 'SB-008: with no ISBN and no page count, the publisher decides');
    }
  }
  // ── SV-001..SV-008: every book on a card looked for on the shop's list, so the shop line
  // is true whichever she picks (her decision); Re-check checks the picked book only.
  {
    const T = 'https://secure.touchnet.net/C20510_ustores/web/';
    const PUBS = T + 'store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true';
    const P1 = T + 'product_detail.jsp?PRODUCTID=2565&SINGLESTORE=true', P0 = T + 'product_detail.jsp?PRODUCTID=2564&SINGLESTORE=true';
    const HARD = '9780300281019', SOFT = '9780300281026', BOOK = 'Gwen John: Strange Beauties';
    const LIST = '# Publications\n\n[Painters, Ports, and Profits Painters, Ports, and Profits](' + P0 + ')\n\n[' + BOOK + ' ' + BOOK + '](' + P1 + ')\n\n'
      + '[Blake Blake](' + T + 'product_detail.jsp?PRODUCTID=2406&SINGLESTORE=true)\n\n[Endless Forms: Charles Darwin, Natural Science, and the Visual Arts Endless Forms: Charles Darwin, Natural Science, and the Visual Arts](' + T + 'product_detail.jsp?PRODUCTID=42&SINGLESTORE=true)\n\n[Yale](http://www.yale.edu/)';
    const PAGE = (title, isbn, price, kind) => '# ' + title + '\n\n1. [YCBA Home](' + T + 'store_main.jsp?STOREID=7&SINGLESTORE=true)\n2. [Publications](' + PUBS + ')\n\n'
      + 'Description ' + 'A generously illustrated volume from the YCBA Collection Series. '.repeat(6) + kind + ' 200 Pages ISBN ' + isbn + '\n\nPrice:\n\n' + price + '\n\nQuantity:\n\nAdd to Basket';
    const make = ({ shelfIsbn = SOFT, refuse = false, readFails = false } = {}) => {
      const page = u => {
        if (u === P0 + '&page=1') return PAGE('Painters, Ports, and Profits', '9780300286540', '$65.00', 'Hardcover');
        if (u === P1 + '&page=1') return PAGE(BOOK, shelfIsbn, '$45.00', 'Paperback');
        if ([P0, P1].includes(u)) return 'Product Detail';
        if (u === PUBS) return 'YCBA Home - Publications';
        if (u.startsWith(PUBS + '&page=')) return LIST;
        return '';
      };
      const WEB = [{ url: 'https://britishart.yale.edu/exhibitions-programs/gwen-john', title: BOOK,
        excerpts: ['Accompanying publication: ' + BOOK + ', 200 pages, ISBN ' + HARD + ', Yale Center for British Art; also ISBN ' + SOFT + ', Yale University Press.'] },
        { url: 'https://books.test/hard', title: BOOK, excerpts: [BOOK + '. Hardcover. 200 pages. ISBN ' + HARD + '. Yale Center for British Art.'] },
        { url: 'https://books.test/soft', title: BOOK, excerpts: [BOOK + '. Paperback. 200 pages. ISBN ' + SOFT + '. Yale University Press.'] }];
      const calls = [];
      const y = lift({
        mcp: (tool, args) => tool === 'web_search' ? { payload: { results: WEB } }
          : refuse ? { payload: { errors: args.urls.map(u => ({ url: u, error_type: 'fetch_error', http_status_code: 403 })), results: [] } }
          : { payload: { errors: [], results: args.urls.map(u => ({ url: u, title: 'Store', excerpts: [page(u)], ...(args.full_content ? { full_content: page(u) } : {}) })) } },
        sample: p => /"forSale"/.test(p) ? (readFails && /ONE page from a museum shop/.test(p) ? (() => { const e = new Error('upstream'); e.code = 'upstream_error'; throw e; })() : { forSale: true, why: 'Add to Basket, $45.00.' })
          : isShopRead(p) ? { found: false }
          : isFactsRead(p) ? { isbn13: HARD, publisher: 'Yale Center for British Art', pages: '200', language: 'English', title: BOOK,
              versions: [{ title: BOOK, isbn13: SOFT, language: 'English', publisher: 'Yale University Press', pages: '200', year: null, venueCity: null, evidenceUrl: WEB[0].url }] }
          : /"found"/.test(p) ? { found: true, thisVenue: true, catalogueTitle: BOOK, isbn13: HARD, publisher: 'Yale Center for British Art', publisherUrl: null, shopUrl: null }
          : {},
      }, calls);
      y.registerOccasional({ 'occ-britishart-yale-edu': { id: 'occ-britishart-yale-edu', name: 'Yale Center for British Art', host: 'britishart.yale.edu',
        shop: 'found', confirmed: true, finder: 3, shopHome: T + 'store_main.jsp?STOREID=7&SINGLESTORE=true', shopCatalogues: PUBS, shelfKind: 'publications', shopSearch: null } });
      return { y, calls, opens: u => calls.filter(c => c.tool === 'web_fetch' && c.args.urls.includes(u)).length };
    };
    const yrow = row('occ-britishart-yale-edu', 'Gwen John: Strange Beauties');
    const { y, calls, opens } = make();
    const out = await y.lookupCatalogue(yrow, { label: () => {} });
    // The paperback is in Yale's shop, so it comes first (her decision: in the museum shop first).
    const r = out.row, card = i => r.editions[i] && r.editions[i].card || {};
    eq(r.editions.map(v => [v.isbn13, v.binding]), [[SOFT, 'paperback'], [HARD, 'hardcover']], 'SV-001: Gwen John — the paperback, found in Yale’s shop, first; the hardcover second', out.detail.split('\n').slice(-12).join(' | '));
    eq([r.editionPick, r.shopState, r.shopUrl, r.isbn13], [0, 'shop', P1, SOFT], 'SV-002:   the paperback starts picked, and the card is its own: in the museum shop');
    eq([card(1).shopState, card(1).shopUrl], ['web', null], 'SV-003:   the hardcover is looked for too — its page prints the paperback’s ISBN: not in the museum shop', JSON.stringify(card(1)));
    eq(opens(P1 + '&page=1'), 1, 'SV-004:   the shop page carrying both titles is opened once');
    const picked = y.pickRow(y.pickRow(r, 1, 'now'), 0, 'now');
    eq([picked.shopState, picked.shopUrl, picked.isbn13], ['shop', P1, SOFT], 'SV-005:   picking the hardcover and back again shows the paperback’s own shop answer and link');
    calls.length = 0;
    const re = await y.recheckShopRow({ ...picked, shopState: 'web', shopUrl: null }, { label: () => {} });
    eq([re.ok, re.row && re.row.shopState, re.row && re.row.shopUrl, re.said], [true, 'shop', P1, 'Re-checked: now in the museum shop.'],
      'SV-006: Re-check with the paperback picked looks for the paperback on the shop’s list', JSON.stringify([re.said, re.detail && re.detail.split('\n').slice(-4)]));
    eq([re.row.editions[0].card.shopState, re.row.editions[0].card.shopUrl], ['shop', P1], 'SV-007:   and the paperback’s own stored answer follows, so picking away and back keeps it');
    const re2 = await y.recheckShopRow(y.pickRow(r, 1, 'now'), { label: () => {} });
    eq([re2.row && re2.row.shopState, re2.said, re2.row && re2.row.editions[1].card.shopState, re2.row && re2.row.editions[0].card.shopState], ['web', 'Re-checked: not in the museum shop.', 'web', 'shop'],
      'SV-008: Re-check with the hardcover picked: still not in the shop, and the paperback’s answer is left as it was');
    eq(re2.row && re2.row.editions.map(v => v.isbn13), [SOFT, HARD], 'SV-012:   a Re-check never moves a block: the order stays as the lookup set it');
    const b = make({ refuse: true });
    const rb = (await b.y.lookupCatalogue(yrow, { label: () => {} })).row;
    eq([rb.shopState, ...rb.editions.map(v => v.card.shopState)], ['blocked', 'blocked', 'blocked'], 'SV-009: a shop that refuses every page is unread for every book, never "not in the museum shop"');
    // A failed read settles nothing, for one book only (her decision, Yale Constable).
    const f = make({ readFails: true });
    const of = await f.y.lookupCatalogue(yrow, { label: () => {} }), rf = of.row;
    eq([rf.editions[0].card.shopState, rf.editions[1].card.shopState, !!of.trouble], ['web', null, true],
      'SV-010: the paperback’s page read fails — its shop answer is not known; the hardcover’s (its page prints the other ISBN) still settled', JSON.stringify([rf.editions.map(v => v.card.shopState), of.trouble]));
    const rr = await f.y.recheckShopRow({ ...picked, shopState: 'web', shopUrl: null }, { label: () => {} });
    eq([rr.ok, !!rr.row, rr.said], [false, false, 'Re-check didn’t work — shop page couldn’t be read.'],
      'SV-011: Re-check with the paperback picked and its read failing — says so, and the card is left as it was', JSON.stringify([rr.ok, rr.said]));
  }
  console.log(failures ? failures + ' failed' : 'the catalogue route holds');
  process.exit(failures ? 1 : 0);
})();
