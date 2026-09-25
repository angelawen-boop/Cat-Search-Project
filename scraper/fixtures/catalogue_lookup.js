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

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
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
    code + '\n;return { fetchPage, applyIsbnFill, isbn10to13, shelfPages, shopPagesFor, needsPageRead, cleanPublisherUrl, publisherDomainFrom, pageIsShell, pageTextOf, deepLinkOn, publisherLinkLabel, publisherNote, isSelfPublisher, normPublisher, shopHeadline, shopLinkLabel, keepWhatWeKnew, foundInShop, recheckLinkedPage };')(
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


  // ── C-052 to C-062: a container is not the book ───────────────────────
  // Her ruling, 22 Sep, from two real lookups of her own. The publisher step
  // filed whatever search returned as "the publisher's page". For Rizzoli
  // that was the book, because Rizzoli puts the ISBN in its addresses; for
  // Hannibal it was the whole fine-art section, because Hannibal addresses a
  // book with a #fragment and a fragment is never indexed. Both were reported
  // the same way, so the step could not tell a hit from a near miss.
  {
    const api = lift({ document: {}, localStorage: {} });

    // The two real pages, as the connector really returned them on 22 Sep.
    const hannibalShell = [{ url: 'https://hannibalbooks.be/en/fine-art', excerpts: [
      'Show categories\nsort by Price Alphabetically Date\n\n# Newsletter Subscribe\nWebsite by [waanzin](https://waanz.in)' ] }];
    const realListing = [{ url: 'https://bookstore.menil.org/collections/menil-publications', excerpts: [
      '# Collection: Menil Publications\n## 47 products\n'
      + Array.from({ length: 16 }, (_, i) =>
          `* Book ${i}\n[Book ${i}](https://bookstore.menil.org/products/book-${i})\nRegular price $40.00 USD\nUnit price / per`
        ).join('\n') ] }];

    eq(api.pageIsShell(hannibalShell), true,
       'C-052: a page whose books are drawn by script reads as empty, and says so');
    eq(api.pageIsShell(realListing), false,
       'C-053: an ordinary server-drawn list of books does not');
    eq(api.pageIsShell([]), true,
       'C-054: nothing came back at all, which is the same blind spot');
    eq(api.pageIsShell([{ url: 'x', full_content: 'y'.repeat(900) }]), false,
       'C-055: a page read in full counts its full text, not only its excerpts');

    // The link read off a listing is checked before it is believed.
    const cont = 'https://hannibalbooks.be/en/fine-art';
    eq(api.deepLinkOn('https://hannibalbooks.be/en/metamorfosen-ovidius-en-de-kunsten#102642',
                      'hannibalbooks.be', cont),
       'https://hannibalbooks.be/en/metamorfosen-ovidius-en-de-kunsten#102642',
       'C-056: the book’s own address on the publisher’s own site is taken');
    eq(api.deepLinkOn('https://www.amazon.com/dp/123', 'hannibalbooks.be', cont), null,
       'C-057: a listing links out to booksellers, and those are not the publisher');
    eq(api.deepLinkOn(cont, 'hannibalbooks.be', cont), null,
       'C-058: the listing itself is not the book’s page wearing a new label');
    eq(api.deepLinkOn(cont + '/', 'hannibalbooks.be', cont), null,
       'C-059: nor is it with a slash on the end');
    eq(api.deepLinkOn(cont + '#102642', 'hannibalbooks.be', cont), cont + '#102642',
       'C-060: but a #fragment IS how Hannibal addresses a book, so it is kept');
    eq(api.deepLinkOn('not a url', 'hannibalbooks.be', cont), null,
       'C-061: and nothing that is not an address gets through');

    // What the button is allowed to claim.
    eq(api.publisherLinkLabel('container'), 'Publisher’s section',
       'C-062: a section is called a section');
    eq(api.publisherLinkLabel('site'), 'Publisher’s website',
       'C-062a: and a front door is called a website');
    eq(api.publisherLinkLabel('product'), 'Publisher',
       'C-062b: a verified page is called the publisher');
    eq(api.publisherLinkLabel(null), 'Publisher',
       'C-062c: a link from an older ledger makes no claim either way');
  }

  // C-063 to C-069a: every outcome says which one it was.
  // Her question, 22 Sep: "No separate publisher page." was printed whether
  // the step had searched the publisher's own site and found nothing or had
  // never fired at all, so the silence could be "search didn't even fire".
  // Each rung of the ladder now has its own sentence, and no two are equal.
  {
    const api = lift({ document: {}, localStorage: {} });
    const note = (result, hasUrl) => api.publisherNote(result, hasUrl);

    eq(note('product', true), '', 'C-063: the book’s own page needs no explaining');
    eq(/section this book sits in/.test(note('container', true)), true,
       'C-064: a section says it is a section');
    eq(/home page/.test(note('site', true)), true,
       'C-065: a front door says the site does not show this book');
    eq(/work out the publisher./.test(note('nosite', false)), true,
       'C-066: no website found is not the same as no page found');
    eq(/no publisher was named/i.test(note('unnamed', false)), true,
       'C-067: and a step that never fired says so, which is what she asked for');
    eq(note(null, false), 'No separate publisher page.',
       'C-068: an older row keeps the old sentence rather than a new claim');
    eq(note(null, true), '', 'C-069: an older row WITH a link says nothing at all');

    // The sentences must differ, or the whole point of them is lost.
    const said = ['container', 'site', 'nosite', 'unnamed', null]
      .map(k => note(k, k === 'container' || k === 'site'));
    eq(new Set(said).size, said.length, 'C-069a: no two outcomes print the same sentence');
  }

  // C-070 to C-078: a museum's own imprint has no publisher page to find.
  // Her ruling 22 Sep, and her CORRECTION of my first attempt, which is the
  // part worth testing. I had matched the publisher's name against the
  // VENUE's, so every Met and National Gallery catalogue would have skipped
  // the search. She named the two ordinary ways that breaks - a blockbuster
  // given to a big art-book house, and a joint show where the other museum
  // prints it - and both are asserted here.
  {
    const api = lift({ document: {}, localStorage: {} });

    eq(api.isSelfPublisher('National Gallery Global'), true,
       'C-070: the National Gallery’s own imprint is on the list');
    eq(api.isSelfPublisher('The Metropolitan Museum of Art'), true,
       'C-071: so is the Met’s, with or without a leading "The"');
    eq(api.isSelfPublisher('Metropolitan Museum of Art'), true,
       'C-072: a leading "The" is noise, not a different publisher');

    // THE TWO CASES SHE NAMED. A venue-based rule would have suppressed the
    // search on both of these; a publisher-based one cannot.
    eq(api.isSelfPublisher('Thames & Hudson'), false,
       'C-073: a blockbuster given to a big art-book house is still searched for');
    eq(api.isSelfPublisher('Mus\u00e9e du Louvre \u00c9ditions'), false,
       'C-074: a joint show whose OTHER museum prints it is still searched for');

    // Nothing is inferred from the shape of a name.
    eq(api.isSelfPublisher('Tate Publishing'), false,
       'C-075: a museum imprint we have not actually seen is not assumed');
    eq(api.isSelfPublisher('Rijksmuseum'), false,
       'C-076: nor is a venue name that happens to appear as a publisher');
    eq(api.isSelfPublisher('Hannibal Books'), false, 'C-077: and an ordinary publisher never matches');
    eq(api.isSelfPublisher(''), false, 'C-077a: no name, no match');
    eq(api.isSelfPublisher(null), false, 'C-077b: and null is not a publisher');

    eq(api.publisherNote('selfpublished', false), 'Catalogue is self-published by the venue.',
       'C-078: and the card says so in her words');
    // It must not collide with any other outcome, same rule as C-069a.
    const said = ['container', 'site', 'nosite', 'unnamed', 'selfpublished', null]
      .map(k => api.publisherNote(k, k === 'container' || k === 'site'));
    eq(new Set(said).size, said.length, 'C-078a: still no two outcomes printing the same sentence');
  }

  // C-079 to C-099: "Re-check museum shop" — her design, 25 Sep. It replaced
  // the 22 Sep design, where Search again moved the status. Pressed for real,
  // on screen, in recheck_shop.js; the pieces are asserted here.
  {
    const api = lift({ document: {}, localStorage: {} });

    // The wording, hers. The status implies the history; none is kept.
    eq(api.shopHeadline('shop', null), 'In the museum shop.', 'C-079: the plain green sentence');
    eq(api.shopHeadline('shop', 'now'), 'Now in the museum shop.', 'C-079a: wasn’t there, now is');
    eq(api.shopHeadline('shop', 'back'), 'Back in the museum shop.', 'C-079b: was there, went, came back');
    eq(api.shopHeadline('gone', null), 'No longer in the museum shop.', 'C-080: the red one says it plainly');
    eq(api.shopHeadline('web', 'gone'), null,
       'C-080a: a 22 Sep "web"+"gone" row, with no link kept, reads as plain "not in the shop"');
    eq(api.shopHeadline('web', null), null, 'C-080b: an ordinary miss adds no headline at all');
    eq(api.shopHeadline('none', null), null, 'C-080c: nor does a row with no catalogue');
    eq(api.shopLinkLabel('gone'), 'Museum shop (last seen)', 'C-081: a gone book’s link says "(last seen)"');
    eq(api.shopLinkLabel('shop'), 'Museum shop', 'C-081a: an in-shop one does not');

    // SEARCH AGAIN NEVER TAKES AWAY WHAT WAS THERE.
    const had = { looked: true, hasCatalogue: 'yes', catalogueTitle: 'Old', isbn13: '9781588397751',
      publisher: 'Pub', publisherUrl: 'https://pub.test/b', publisherResult: 'product',
      shopUrl: 'https://shop.test/b', shopState: 'gone', shopChange: null };
    const got = { ...had, catalogueTitle: 'New', isbn13: null, publisher: null, publisherUrl: null,
      publisherResult: 'nosite', shopUrl: 'https://shop.test/other', shopState: 'shop', shopChange: null };
    const k = api.keepWhatWeKnew(had, got);
    eq(k.isbn13, '9781588397751', 'C-082: a known ISBN survives a lookup that did not find it');
    eq(k.catalogueTitle, 'Old', 'C-082a: so does the title');
    eq(k.publisher + '|' + k.publisherUrl + '|' + k.publisherResult, 'Pub|https://pub.test/b|product',
       'C-083: the publisher, its link and what that link is stay together');
    eq(k.shopState + '|' + k.shopUrl, 'gone|https://shop.test/b', 'C-084: the shop status is Re-check’s alone');
    eq(api.keepWhatWeKnew(had, { ...got, hasCatalogue: 'no' }), had,
       'C-085: a lookup finding nothing hands back the row it had');
    const blank = { ...had, isbn13: null, publisher: null, publisherUrl: null, publisherResult: null };
    const f = api.keepWhatWeKnew(blank, { ...got, isbn13: '9781588398130', publisher: 'P2' });
    eq(f.isbn13 + '|' + f.publisher, '9781588398130|P2', 'C-086: blanks are still filled');
    const first = { looked: false, hasCatalogue: 'unknown' };
    eq(api.keepWhatWeKnew(first, got), got, 'C-087: a first lookup is taken whole');
    eq(api.keepWhatWeKnew({ looked: true, hasCatalogue: 'no' }, got), got,
       'C-087a: so is one after "no catalogue", which had nothing to lose');

    // CASE 2's row. Fills blanks, and is "now".
    const fis = api.foundInShop({ ...blank, catalogueTitle: 'Old', shopState: 'web', shopUrl: null },
      { catalogueTitle: 'Shop title', isbn13: '1588398137', publisher: 'Shop pub', shopUrl: 'https://shop.test/n' });
    eq(fis.shopState + '|' + fis.shopChange + '|' + fis.shopUrl, 'shop|now|https://shop.test/n',
       'C-088: found in the shop becomes "now", with the new link');
    eq(fis.catalogueTitle + '|' + fis.isbn13, 'Old|9781588398130', 'C-088a: keeps the title, converts and fills the ISBN');
  }

  // C-089 to C-099: reading the one page on file. The connector and Claude are
  // played by a script; the 404 shape is the one the live connector returned.
  {
    const run = async (row, mcp, sample) => {
      const asked = [];
      const win = { document: {}, localStorage: {}, claude: { use: async n => {
        if (n === 'mcp') return { callTool: async (s, t, a) => { asked.push(t); if (mcp instanceof Error) throw mcp; return mcp; } };
        if (n === 'sample') return { json: async () => { asked.push('claude'); if (sample instanceof Error) throw sample; return sample; } };
        return null; } } };
      const out = await lift(win).recheckLinkedPage(row);
      return { out, asked };
    };
    const inShop = { title: 'X', catalogueTitle: 'X', shopUrl: 'https://shop.test/x', shopState: 'shop', shopChange: null };
    const isGone = { ...inShop, shopState: 'gone' };
    const page = { payload: { results: [{ url: 'https://shop.test/x', excerpts: ['Add to cart. '.repeat(60)] }], errors: [] } };
    const err = (type, status) => ({ payload: { results: [], errors: [{ url: 'https://shop.test/x', error_type: type, http_status_code: status }] } });

    let r = await run(inShop, err('http_error', 404), new Error('never'));
    eq(r.out.ok && r.out.row.shopState, 'gone', 'C-089: a 404 is gone');
    eq(r.asked.join(), 'web_fetch', 'C-089a:   decided in code, Claude never asked');
    eq(r.out.row.shopUrl, 'https://shop.test/x', 'C-089b:   and the link is kept');
    r = await run(inShop, err('http_error', 410), null);
    eq(r.out.row && r.out.row.shopState, 'gone', 'C-090: so is a 410');
    r = await run(inShop, err('timeout', null), null);
    eq(r.out.ok, false, 'C-091: a timeout is a failed check, never "gone"');
    r = await run(inShop, err('http_error', 500), null);
    eq(r.out.ok, false, 'C-092: so is a server error');
    const e = new Error('x'); e.code = 'rate_limited';
    r = await run(inShop, e, null);
    eq(r.out.ok + '|' + /Nothing changed/.test(r.out.said), 'false|true', 'C-093: a refused connector says nothing changed');
    r = await run(inShop, { payload: { results: [{ url: 'https://shop.test/x', excerpts: ['menu'] }], errors: [] } }, null);
    eq(r.out.ok, false, 'C-094: a page that came back empty is a failed check, not "gone"');
    r = await run(inShop, page, { forSale: false, why: 'Sold out.' });
    eq(r.out.row.shopState, 'gone', 'C-095: sold out is gone');
    r = await run(isGone, page, { forSale: true, why: 'Add to cart.' });
    eq(r.out.row.shopState + '|' + r.out.row.shopChange, 'shop|back', 'C-096: gone then buyable is "back"');
    r = await run(inShop, page, { forSale: true });
    eq(r.out.ok && r.out.row === inShop, true, 'C-097: still for sale changes nothing');
    r = await run(inShop, page, { forSale: 'maybe' });
    eq(r.out.ok, false, 'C-098: an unreadable answer is a failed check');
    const ce = new Error('x'); ce.code = 'rate_limited';
    r = await run(inShop, page, ce);
    eq(r.out.ok, false, 'C-099: Claude refusing is a failed check');
  }

  console.log(failures ? failures + ' failed' : 'the ISBN fill holds');
  process.exit(failures ? 1 : 0);
})();
