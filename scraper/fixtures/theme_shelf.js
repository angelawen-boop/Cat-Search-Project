/**
 * THEME SHELF — does the page draw, and does its code decide what it should?
 * (docs/themes.md; Theme_Shelf.jsx.)
 *
 * Built the way build/build_shelf.js builds it, then:
 *   TS-001  drawn with no Claude runtime: says the shelf isn’t available.
 *   TS-002  drawn with a store holding two books and a theme: titles, ISBNs as
 *           xxx-xxxxxxxxxx, the publication line and the four booksellers on screen.
 *   TS-003  the publication line ("Published 2002 · 24 years").
 *   TS-004  a dragged book's new order sits between its new neighbours.
 *   TS-005  by ISBN, with no Open Library record: only results that print the ISBN reach Claude (the live search
 *           for 9780300091519 returned Harry Potter pages); a publisher or year not
 *           printed is left blank.
 *   TS-006  by link or page: a book whose ISBN is not printed is refused; an ISBN-10
 *           printed is taken as its 13.
 *   TS-007  the cover in a saved page: the page's own og:image, else a picture whose
 *           address carries the ISBN, else none.
 *   TS-008  Find by ISBN matches digits of the 13 or the 10.
 *   TS-009  by ISBN, Open Library's record first, read by code: no search, no Claude.
 * Result shapes ({url,title,publish_date,excerpts}) are copied from live Parallel replies.
 *
 *   node scraper/fixtures/theme_shelf.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const JSX = path.join(__dirname, '..', '..', 'Theme_Shelf.jsx');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-test-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* the emit is what matters */ }
const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');

const { JSDOM } = require('jsdom');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = require('react');

let failures = 0;
const fail = m => { console.log('FAIL  ' + m); failures++; };
const pass = m => console.log('PASS  ' + m);
const check = (ok, m) => ok ? pass(m) : fail(m);

const EXPORTS = ['App', 'publishedLine', 'orderBetween', 'dropOrder', 'lookupIsbn', 'lookupLink',
  'readOnePage', 'olDate', 'pickCover', 'mhtmlImages', 'isbnMatches', 'fmtIsbn'];
function load(win) {
  return new Function('React', 'window', 'document', 'localStorage',
    code + '\n;return {' + EXPORTS.join(',') + '};')(React, win, win.document, win.localStorage);
}

function fakeDb(data) {
  const docs = new Map(Object.entries(data));
  return {
    collection: coll => ({
      limit: () => ({
        get: async () => ({ docs: [...docs].filter(([k]) => k.startsWith(coll + '/'))
          .map(([k, v]) => ({ id: k.split('/')[1], data: () => v })) }),
      }),
    }),
    doc: key => ({ set: async v => { docs.set(key, v); }, delete: async () => { docs.delete(key); } }),
  };
}

async function render(label, runtime) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window;
  if (runtime) win.claude = runtime;
  const globals = ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame',
    'cancelAnimationFrame', 'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event',
    'CustomEvent', 'getComputedStyle'];
  const saved = {};
  for (const k of globals) { saved[k] = global[k]; try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const shouted = [];
  const realError = console.error;
  console.error = (...a) => shouted.push(String(a[0]));
  let text = '', links = [];
  try {
    const { App } = load(win);
    const root = createRoot(win.document.getElementById('root'));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    text = win.document.getElementById('root').textContent || '';
    links = [...win.document.querySelectorAll('.ts-shops a')].map(a => a.textContent + ' ' + a.href);
    await act(async () => root.unmount());
  } catch (e) {
    fail(label + ': threw ' + (e && e.stack || e));
  } finally {
    console.error = realError;
    for (const k of globals) { try { global[k] = saved[k]; } catch {} }
  }
  if (shouted.length) fail(label + ': React complained — ' + shouted[0].slice(0, 200));
  return { text, links };
}

(async () => {
  // TS-001
  {
    const { text } = await render('TS-001');
    check(/The shelf isn’t available in this viewer/.test(text) && /Theme Shelf prototype/.test(text),
      'TS-001 with no runtime the page draws and says the shelf isn’t available');
  }
  // TS-002
  {
    const db = fakeDb({
      'themes/t1': { name: 'Fashion in art', order: 0 },
      'books/9780300091519': { isbn13: '9780300091519', title: 'Dress in Eighteenth-Century Europe, 1715–1789',
        publisher: 'Yale University Press', published: '2002', themes: ['t1'], order: 1, cover: null },
      'books/9783791350622': { isbn13: '9783791350622', title: 'Fashioning Fashion: European Dress in Detail, 1700–1915',
        publisher: 'Prestel', published: '2010-11', themes: ['t1'], order: 0, cover: null },
    });
    const runtime = { use: async n => n === 'db' ? db : null };
    const { text, links } = await render('TS-002', runtime);
    check(text.includes('Dress in Eighteenth-Century Europe') && text.includes('Fashioning Fashion'), 'TS-002 both books on screen');
    check(text.includes('ISBN 978-0300091519') && text.includes('ISBN 978-3791350622'), 'TS-002 ISBNs shown xxx-xxxxxxxxxx');
    check(text.includes('Fashion in art') && text.includes('2 Books') && text.includes('1 Themes'), 'TS-002 the theme chip and the counts line (2 books, 1 theme)');
    check(text.indexOf('Fashioning Fashion') < text.indexOf('Dress in Eighteenth'), 'TS-002 books in their saved order');
    const names = links.map(l => l.split(' ')[0] + ' ' + l.split(' ')[1]);
    check(['Amazon AU', 'AbeBooks AU', 'Alibris https', 'Booko AU'].every(n => names.some(x => x.startsWith(n.split(' ')[0]))) && links.length === 8,
      'TS-002 four booksellers per book (' + links.length + ' links for 2 books)');
    check(links.some(l => l.includes('booko.au/9780300091519')), 'TS-002 Booko links by ISBN');
  }

  const win = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://claude.ai/' }).window;
  const S = load(win);
  const now = new Date('2026-10-19T12:00:00');

  // TS-003
  check(S.publishedLine('2002', now) === 'Published 2002 · 24 years', 'TS-003 year only: ' + S.publishedLine('2002', now));
  check(S.publishedLine('2010-11', now) === 'Published Nov 2010 · 15 years', 'TS-003 month known: ' + S.publishedLine('2010-11', now));
  check(S.publishedLine('2025-11-02', now) === 'Published Nov 2025 · this year', 'TS-003 under a year: ' + S.publishedLine('2025-11-02', now));
  check(S.publishedLine('2025', now) === 'Published 2025 · 1 year', 'TS-003 one year: ' + S.publishedLine('2025', now));
  check(S.publishedLine(null, now) === 'Publication date unknown', 'TS-003 no date');

  // TS-004
  {
    const vis = [{ isbn13: 'a', order: 0 }, { isbn13: 'b', order: 1 }, { isbn13: 'c', order: 2 }, { isbn13: 'd', order: 3 }];
    check(S.dropOrder(vis, 'd', 0) === -1, 'TS-004 to the front: before the first');
    check(S.dropOrder(vis, 'a', 3) === 4, 'TS-004 to the end: after the last');
    check(S.dropOrder(vis, 'd', 1) === 0.5, 'TS-004 between a and b');
    check(S.dropOrder([{ isbn13: 'x', order: 7 }], 'x', 0) === 0, 'TS-004 alone');
  }

  // TS-005 — the shape of the live search for 9780300091519.
  {
    const results = [
      { url: 'https://www.isfdb.org/cgi-bin/title.cgi?19763', title: "Title: Harry Potter and the Philosopher's Stone - isfdb.org", publish_date: null,
        excerpts: ['Title: Harry Potter and the Philosopher\'s Stone Date: 1997-06-26 Publisher Bloomsbury ISBN 0-7475-3269-9'] },
      { url: 'https://catalog.library.nashville.gov/GroupedWork/x/Home', title: 'Dress in eighteenth-century Europe, 1715-1789 | Nashville Public Library', publish_date: null,
        excerpts: ['Dress in eighteenth-century Europe, 1715-1789\nAuthor\nRibeiro, Aileen, 1944-\nPublisher\nYale University Press\nPublication Date\nc2002\nISBN\n9780300091519'] },
    ];
    let sent = '';
    const io = {
      fetch: async () => ({ ok: true, results: [{ url: 'https://openlibrary.org/api/books', full_content: '{}' }] }),
      search: async () => ({ ok: true, results }),
      ask: async p => { sent = p; return { ok: true, data: { title: 'Dress in Eighteenth-Century Europe, 1715–1789', publisher: 'Yale University Press', published: '2002' } }; },
    };
    const r = await S.lookupIsbn('9780300091519', io);
    check(!sent.includes('Harry Potter') && sent.includes('Nashville'), 'TS-005 only the page printing the ISBN reaches Claude');
    check(r.ok && r.book.publisher === 'Yale University Press' && r.book.published === '2002' && r.book.isbn13 === '9780300091519',
      'TS-005 facts kept when printed: ' + JSON.stringify(r.book));
    io.ask = async () => ({ ok: true, data: { title: 'Dress in Eighteenth-Century Europe', publisher: 'Thames & Hudson', published: '1984' } });
    const r2 = await S.lookupIsbn('9780300091519', io);
    check(r2.ok && r2.book.publisher === null && r2.book.published === null, 'TS-005 a publisher and year not printed are left blank');
    io.search = async () => ({ ok: true, results: [results[0]] });
    const r3 = await S.lookupIsbn('9780300091519', io);
    check(!r3.ok && /No page found that prints ISBN 978-0300091519/.test(r3.why), 'TS-005 nothing printing the ISBN: says so — ' + (r3.why || ''));
  }

  // TS-006
  {
    const page = { url: 'https://www.thriftbooks.com/w/fashioning-fashion/9520971', title: 'Fashioning Fashion',
      excerpts: ['Hardcover Fashioning Fashion: European Dress in Detail, 1700-1915 Book. ISBN: 3791350625. Release Date: November 2010. Publisher: Prestel USA. Length: 223 Pages. ' + 'x'.repeat(80)] };
    const ask = data => ({ ask: async () => ({ ok: true, data }) });
    const r = await S.readOnePage(page, ask({ isbn13: '3791350625', title: 'Fashioning Fashion: European Dress in Detail, 1700–1915', publisher: 'Prestel USA', published: '2010-11' }));
    check(r.ok && r.book.isbn13 === '9783791350622' && r.book.published === '2010-11', 'TS-006 a printed ISBN-10 is taken as its 13: ' + JSON.stringify(r.book || r.why));
    const r2 = await S.readOnePage(page, ask({ isbn13: '9780300091519', title: 'Dress' }));
    check(!r2.ok && /doesn’t print an ISBN/.test(r2.why), 'TS-006 an ISBN not printed on the page is refused');
    const r3 = await S.readOnePage({ url: 'https://x.org', title: '', excerpts: [''] }, ask({}));
    check(!r3.ok && /came back empty/.test(r3.why), 'TS-006 an empty page says so');
  }

  // TS-007
  {
    const part = (type, loc, body) => '--B\r\nContent-Type: ' + type + '\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ' + loc + '\r\n\r\n' + body + '\r\n';
    const mht = og => 'From: <Saved by Blink>\r\nSnapshot-Content-Location: https://www.abebooks.com/book/1\r\nMIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="B"\r\n\r\n'
      + part('image/jpeg', 'https://pictures.abebooks.com/banner.jpg', 'QkFOTkVS')
      + part('image/jpeg', 'https://pictures.abebooks.com/isbn/9783791350622-us.jpg', 'Q09WRVI=')
      + part('image/png', 'https://www.abebooks.com/logo.png', 'TE9HTw==') + '--B--';
    const doc = og => new JSDOM('<html><head>' + (og ? '<meta property="og:image" content="' + og + '">' : '') + '</head></html>').window.document;
    check(S.mhtmlImages(mht()).length === 3, 'TS-007 reads the pictures packed in a saved page');
    const a = S.pickCover(mht(), doc('https://www.abebooks.com/logo.png'), '9783791350622');
    check(a && a.url.endsWith('logo.png'), 'TS-007 the page’s own og:image wins');
    const b = S.pickCover(mht(), doc(null), '9783791350622');
    check(b && b.url.includes('9783791350622') && b.b64 === 'Q09WRVI=', 'TS-007 else the picture whose address carries the ISBN');
    check(S.pickCover(mht(), doc(null), '9780300091519') === null, 'TS-007 else no cover — never the biggest picture');
    check(S.pickCover('<html></html>', doc(null), '9783791350622') === null, 'TS-007 a plain .html file has no pictures');
  }

  // TS-009 — the live Open Library record for 9780300121193 (fields cut down).
  {
    const ol = JSON.stringify({ 'ISBN:9780300121193': { key: '/books/OL10319439M', title: 'The Dress of the People',
      subtitle: 'Everyday Fashion in Eighteenth-Century England', identifiers: { isbn_13: ['9780300121193'] },
      publishers: [{ name: 'Yale University Press' }], publish_date: 'February 28, 2008' } });
    let searched = false, asked = false;
    const io = { fetch: async () => ({ ok: true, results: [{ url: 'x', full_content: ol }] }),
      search: async () => { searched = true; return { ok: true, results: [] }; }, ask: async () => { asked = true; return { ok: false }; } };
    const r = await S.lookupIsbn('9780300121193', io);
    check(r.ok && r.book.title === 'The Dress of the People: Everyday Fashion in Eighteenth-Century England'
      && r.book.publisher === 'Yale University Press' && r.book.published === '2008-02-28'
      && r.book.source === 'https://openlibrary.org/books/OL10319439M', 'TS-009 an Open Library record is read by code: ' + JSON.stringify(r.book));
    check(!searched && !asked, 'TS-009 with a record, no search and no Claude call');
    const dates = [['February 28, 2008', '2008-02-28'], ['Feb 2008', '2008-02'], ['2002', '2002'], ['c2002', '2002'], ['28 February 2008', '2008-02-28'], ['', null]];
    check(dates.every(([a, b]) => S.olDate(a) === b), 'TS-009 Open Library dates: ' + dates.map(([a]) => JSON.stringify(a) + '→' + S.olDate(a)).join(', '));
  }

  // TS-008
  {
    const b = { isbn13: '9783791350622' };
    check(S.isbnMatches(b, '') && S.isbnMatches(b, '978-3791') && S.isbnMatches(b, '3791350625') && !S.isbnMatches(b, '0300'),
      'TS-008 Find by ISBN: digits of the 13 or the 10');
  }

  console.log(failures ? '\n' + failures + ' FAILED' : '\nAll Theme Shelf checks passed.');
  process.exit(failures ? 1 : 0);
})();
