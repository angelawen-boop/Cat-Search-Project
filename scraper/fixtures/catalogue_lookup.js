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
    code + '\n;return { fetchPage, applyIsbnFill, isbn10to13, shelfPages, shopPagesFor, needsPageRead, cleanPublisherUrl, publisherDomainFrom, publisherSearchPages, onPublisherHost };')(
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

  // ── C-009 to C-013a: WHEN to read the book's own page ────────────────
  // Her ruling, 21 Sep: a list of catalogues never prints an ISBN, so a gate
  // that waits for a missing ISBN opens every single time and is decoration.
  // What it must actually ask is whether anything is still blank.
  {
    const api = lift({ document: {}, localStorage: {} });
    const found = { ok: true, pageUrl: 'https://shop.test/book',
                    row: { hasCatalogue: 'yes', isbn13: null, publisher: null } };
    eq(api.needsPageRead(found), true,
       'C-009: a book found with a page and nothing else is the case this exists for');
    eq(api.needsPageRead({ ...found,
        row: { hasCatalogue: 'yes', isbn13: '9781588398130', publisher: 'The Met' } }), false,
       'C-010: a book already complete is not read again');
    eq(api.needsPageRead({ ...found, pageUrl: null }), false,
       'C-011: no page link, nothing to read');
    eq(api.needsPageRead({ ...found, row: { hasCatalogue: 'no', isbn13: null } }), false,
       'C-012: no catalogue, no page read \u2014 the lookup already settled it');
    eq(api.needsPageRead(null), false, 'C-013: a failed lookup asks for nothing');

    // HER CATCH, and the reason the old gate was not merely useless. It asked
    // about the ISBN alone, so a result carrying an ISBN and no publisher
    // never opened the page and lost the publisher for nothing.
    eq(api.needsPageRead({ ...found,
        row: { hasCatalogue: 'yes', isbn13: '9781588398130', publisher: null } }), true,
       'C-013a: an ISBN without a publisher still opens the page');
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

  // ── C-026 to C-031: a shelf that scrolls or paginates ──────────────────
  // Her question, 21 Sep. The Menil's shelf shows 16 of its 47 books on the
  // page you land on; the Morgan's simply grows as you scroll. Both are more
  // addresses, and reading only the first screen loses the rest.
  {
    const api = lift({ document: {}, localStorage: {} });
    const menil = api.shelfPages('https://bookstore.menil.org/collections/menil-publications');
    eq(menil.length, 3, 'C-026: a shelf is read past its first screen');
    eq(menil[1], 'https://bookstore.menil.org/collections/menil-publications?page=2',
       'C-027: the later pages are the shop\u2019s own addresses');

    // A shelf that already serves the lot in one page is left alone \u2014 asking
    // Tate for "page 2" of a list that has no pages is a wasted read.
    eq(api.shelfPages('https://shop.tate.org.uk/books/exhibition-books?sz=96').length, 1,
       'C-028: a shelf that serves everything in one page is not paged again');

    eq(api.shelfPages(null).length, 0, 'C-029: a venue with no shelf asks for nothing');

    // The shelf comes FIRST and the search box LAST, in one call.
    const pages = api.shopPagesFor(
      { shopCatalogues: 'https://x.test/shelf', shopSearch: 'https://x.test/find?q=' },
      'Zurbar\u00e1n');
    eq(pages.length, 4, 'C-030: the shelf\u2019s pages and the search box go over together');
    eq(pages[pages.length - 1], 'https://x.test/find?q=Zurbar%C3%A1n',
       'C-031: the title is written into the search address, never guessed at');
  }

  // ── C-032 to C-038: the publisher's own page ───────────────────────
  // Her finding, 21 Sep: the app has always had a Publisher button and the
  // rebuild quietly stopped filling it, so the button could never appear.
  {
    const api = lift({ document: {}, localStorage: {} });
    const dom = 'shop.nationalgallery.org.uk';

    eq(api.cleanPublisherUrl('https://nationalgalleryglobal.com/zurbaran', dom),
       'https://nationalgalleryglobal.com/zurbaran',
       'C-032: a real publisher page is kept');
    eq(api.cleanPublisherUrl('https://shop.nationalgallery.org.uk/zurbaran-1056951.html', dom), null,
       'C-033: the shop wearing the publisher\u2019s label is refused \u2014 she already has that button');
    eq(api.cleanPublisherUrl('not a link', dom), null, 'C-034: anything that is not an address is refused');
    eq(api.cleanPublisherUrl(null, dom), null, 'C-035: nothing found, nothing stored');
    // Borghese, Capodimonte and the Accademia have NO shop at all, so the
    // publisher's page is the only real "buy it here" link they can ever get.
    // There is no shop domain to compare against and that must not block it.
    eq(api.cleanPublisherUrl('https://hannibalbooks.be/metamorphoses', null),
       'https://hannibalbooks.be/metamorphoses',
       'C-036: a venue with no shop still gets its publisher link');
    eq(api.cleanPublisherUrl('javascript:alert(1)', null), null,
       'C-036a: and it still has to be a real web address');

    // The page read fills it, and like everything else it fills a BLANK only.
    const row = { hasCatalogue: 'yes', isbn13: null, publisher: null, publisherUrl: null };
    const out = api.applyIsbnFill(row,
      { isbn13: '9781857097399', publisher: 'National Gallery Global',
        publisherUrl: 'https://nationalgalleryglobal.com/zurbaran' }, dom);
    eq(out.publisherUrl, 'https://nationalgalleryglobal.com/zurbaran',
       'C-037: the book\u2019s page can supply it');
    const had = api.applyIsbnFill({ ...row, publisherUrl: 'https://kept.example/book' },
      { publisherUrl: 'https://other.example/book' }, dom);
    eq(had.publisherUrl, 'https://kept.example/book',
       'C-038: one we already had is never overwritten');
  }

  // ── C-039 to C-042: the shop found the book and nothing else ──────────
  // Her finding, 21 Sep. Acquavella's page for its Matisse catalogue prints a
  // title, a price and the show's dates and no ISBN at all, so going to the
  // shop made the answer smaller than the old web search had. The gap-fill
  // may only ever ADD, never rename or relocate a book the shop named.
  {
    const api = lift({ document: {}, localStorage: {} });
    const found = { hasCatalogue: 'yes', catalogueTitle: 'Matisse: The Pursuit of Harmony',
                    isbn13: null, publisher: null, publisherUrl: null,
                    shopUrl: 'https://acquavellagalleries.myshopify.com/products/matisse-the-pursuit-of-harmony',
                    shopState: 'shop' };
    const filled = api.applyIsbnFill(found,
      { isbn13: '9780847873463', publisher: 'Rizzoli' }, 'acquavellagalleries.myshopify.com');
    eq(filled.isbn13, '9780847873463', 'C-039: the number the shop page never printed');
    eq(filled.publisher, 'Rizzoli', 'C-040: and the publisher with it');
    eq(filled.shopUrl, found.shopUrl, 'C-041: the shop link the shop gave is untouched');
    eq(filled.catalogueTitle, found.catalogueTitle,
       'C-042: and so is the title \u2014 a wide search cannot rename the book');
  }

  // ── C-043 to C-045: a step that died is not an answer ────────────────
  // Her question, 21 Sep: how would she tell a rate-limited lookup from a book
  // that genuinely has no ISBN and no publisher page? She could not. The later
  // steps returned the row unchanged, so the card printed the two "none"
  // sentences as findings.
  //
  // NO `return` IN HERE. An early return inside this file exits the whole suite
  // and the summary line simply stops printing — the silent-suite failure this
  // project has now recorded four times. Await, never return.
  {
    const limited = new Error('slow down');
    limited.code = 'rate_limited';
    const { window } = runtime(limited, []);
    const api = lift(window);
    const out = await api.fetchPage('https://shop.test/book', 'its ISBN', ['x']);
    eq(out.ok, false, 'C-043: a refused read is reported, not swallowed');
    eq(/many searches/i.test(out.detail), true,
       'C-044: and it says the connector refused, in her words');
    eq(out.results.length, 0, 'C-045: with nothing invented to fill the gap');
  }

  // ── C-046 to C-051: which result is the publisher's own site ──────────
  // Her correction, 21 Sep: tuning search phrases to make a general index cough
  // up hannibalbooks.be was the same mistake the whole session was about. Go to
  // the publisher, the way step one goes to the shop — which means working out
  // the publisher's address, and a name in a hostname has one correct answer.
  {
    const api = lift({ document: {}, localStorage: {} });
    const d = (name, urls) => api.publisherDomainFrom(urls.map(u => ({ url: u })), name);

    eq(d('Hannibal Books', ['https://en.wikipedia.org/wiki/Hannibal_(Harris_novel)',
                            'https://hannibalbooks.be/en/about-us']), 'hannibalbooks.be',
       'C-046: the novel about the cannibal is not the publisher');
    eq(d('Thames & Hudson', ['https://www.amazon.com/x', 'https://thamesandhudson.com/book']),
       'thamesandhudson.com', 'C-047: an ampersand in the name, an "and" in the host');
    eq(d('Yale University Press', ['https://oup.com/x', 'https://yalebooks.yale.edu/book/9780300']),
       'yalebooks.yale.edu', 'C-048: "university" and "press" are shared words and carry nothing');
    eq(d('Rizzoli', ['https://www.abebooks.com/y', 'https://www.rizzoliusa.com/book/123']),
       'www.rizzoliusa.com', 'C-049: a national arm of the same house still carries the name');
    eq(d('Hannibal Books', ['https://www.amazon.com/x', 'https://www.abebooks.com/y']), null,
       'C-050: booksellers are not the publisher, so nothing is returned');
    eq(d('', ['https://hannibalbooks.be/']), null, 'C-051: no publisher name, no guess');
  }

  // \u2500\u2500 C-052 to C-060: the publisher's own search box \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Her ruling, 21 Sep. The step used to ask a general index for
  // "site:hannibalbooks.be <title>" and let a model choose between the links
  // it returned. That is the pattern removed from stage one the same day,
  // left standing one step down, and it lost Metamorphoses twice over: the
  // index does not index the ISBN (nine unrelated Hannibal books came back),
  // and the only book page it did return was the Dutch edition, which the
  // model rejected as a different book.
  {
    const api = lift({ document: {}, localStorage: {} });
    const byIsbn = api.publisherSearchPages('hannibalbooks.be', '9789493416543');

    eq(byIsbn[0], 'https://hannibalbooks.be/en/search?q=9789493416543',
       'C-052: the English box is asked first \u2014 her page, her language');
    eq(byIsbn.length, 4, 'C-053: four shapes, one call, an absent one costs nothing');
    eq(byIsbn.includes('https://hannibalbooks.be/search?q=9789493416543'), true,
       'C-054: a site with no /en/ is reached by the same call');
    eq(byIsbn.includes('https://hannibalbooks.be/?s=9789493416543'), true,
       'C-055: and so is a WordPress one');
    eq(api.publisherSearchPages('hannibalbooks.be', 'Ovid & the Arts')[1],
       'https://hannibalbooks.be/search?q=Ovid%20%26%20the%20Arts',
       'C-056: a title with an ampersand survives the trip');
    eq(api.publisherSearchPages('', '9789493416543').length, 0,
       'C-057: no publisher site, no addresses invented');
    eq(api.publisherSearchPages('hannibalbooks.be', '   ').length, 0,
       'C-058: and nothing to search for is not a search');

    // www. ON ONE SIDE ONLY. The host is found by one search and the pages
    // come back from another, so an exact string match threw the right page
    // away over four letters.
    eq(api.onPublisherHost('https://www.hannibalbooks.be/en/x', 'hannibalbooks.be'), true,
       'C-059: a www. on one side only is still the same site');
    eq(api.onPublisherHost('https://www.amazon.com/x', 'hannibalbooks.be'), false,
       'C-060: a bookseller linked from their page is not their page');
  }

  console.log(failures ? failures + ' failed' : 'the ISBN fill holds');
  process.exit(failures ? 1 : 0);
})();
