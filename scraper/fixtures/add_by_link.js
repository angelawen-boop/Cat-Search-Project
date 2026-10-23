/**
 * "ADD BY LINK", PRESSED — her design, 3–4 Oct 2026 (docs/add_by_link.md).
 *
 * Renders the real app, loads a ledger through the real Load input, opens
 * Import, pastes links into its pop-up the careless way she will, and
 * presses Read — with the connector and Claude played by a script. Then it
 * reads the review back off the screen: the titles and dates she would see.
 *
 * THE PAGES ARE REAL. docs/link_pages/ holds the ten show pages read through
 * her keyed connector on 3 Oct, as the connector returned them (the eight
 * written down by hand are trimmed of footers; every date-bearing line is
 * kept — those are the trap). Titles and dates are read by CODE, so those
 * expectations are hard. What the MODEL says is scripted here, so this file
 * proves only what code does with an answer, never that an answer is good.
 *
 * THE SHOP SEARCHES ARE REAL TOO: docs/link_pages/shop_search/ holds the four
 * searches the finder makes ("<venue> shop exhibition catalogues"), as the free
 * Parallel Search returned them on 4 Oct, trimmed, and Thyssen's own list of
 * shop sections. WHAT IT CANNOT KNOW: the shop pages a pick is opened to
 * check, and the Thyssen and Mauritshuis menus — made up below to the shapes
 * seen on those shops; a real link from the venue is the test of that.
 *
 *   node scraper/fixtures/add_by_link.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
const PAGES = path.join(__dirname, '..', '..', 'docs', 'link_pages');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-links-'));

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

const { JSDOM } = require('jsdom');
// React and react-dom are required AFTER the page's globals exist (below):
// react-dom decides at load whether the browser fires 'input' events, and
// loaded with no window it decides not — typing into the box then never
// reaches the app. Clicks work either way, which is why other files did not
// meet this.
let React, createRoot, act;

let failures = 0;
function fail(m) { console.log('FAIL  ' + m); failures++; }
function pass(m) { console.log('PASS  ' + m); }
function ok(cond, m, got) { if (cond) pass(m); else fail(m + (got !== undefined ? ' — got: ' + got : '')); }

// ── the pages, and what each must come out as ───────────────────────────────
const page = name => JSON.parse(fs.readFileSync(path.join(PAGES, name + '.json'), 'utf8'));
const P = Object.fromEntries(fs.readdirSync(PAGES).filter(f => f.endsWith('.json'))
  .map(f => { const p = page(f.replace(/\.json$/, '')); return [p.url, p]; }));
const WANT = [
  ['thyssen_hammershoi', 'Hammershøi. The Eye that Listens', '17 Feb 2026', '31 May 2026'],
  ['thyssen_rubens', 'Rubens. The Restoration of Venus and Cupid', '16 Jun 2026', '13 Sep 2026'],
  ['mauritshuis_hoogstraten', 'Samuel van Hoogstraten', '16 Sep 2027', '9 Jan 2028'],
  ['ra_guggenheim', 'Peggy Guggenheim in London: The Making of a Collector', '21 Nov 2026', '14 Mar 2027'],
  ['courtauld_okeeffe', "Georgia O'Keeffe: Ghost Ranch", '1 Oct 2027', '30 Jan 2028'],
  ['dia_caravaggio', "Caravaggio's Models: Friends, Lovers, Rivals", '21 Mar 2027', '18 Jul 2027'],
  ['dia_okeeffe', 'Georgia O’Keeffe: Architecture', '11 Sep 2026', '3 Jan 2027'],
  ['cleveland_manet_morisot', 'Manet & Morisot', '29 Mar 2026', '5 Jul 2026'],
  ['cleveland_filippino', 'Filippino Lippi and Rome', '26 Nov 2025', '22 Feb 2026'],
];
const urlOf = name => page(name).url;
const GRAND = urlOf('mauritshuis_grand_tour');
const REFUSED = 'https://www.example-museum.org/exhibitions/refused-show';
const EMPTY = 'https://www.example-museum.org/exhibitions/empty-show';
// A link whose page arrives only when the test lets it (AL-035: Cancel mid-Read).
const HELD = 'https://www.example-museum.org/exhibitions/held-show';
let release = null;
const held = new Promise(r => { release = r; });

// Her ledger already holds the Grand Tour exactly as the link reads it: no card.
const GRAND_SUMMARY = 'British Grand Tour souvenirs from country houses.';
const ledger = { rows: [{ id: 'occ-mauritshuis-nl-thegrandtourdestinationitaly', museumId: 'occ-mauritshuis-nl',
  title: 'The Grand Tour - Destination Italy', startDate: '2025-09-18', endDate: '2026-01-04', summary: GRAND_SUMMARY,
  exUrl: GRAND, interested: true, watching: false, acquiring: null, looked: false, hasCatalogue: 'unknown',
  catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, publisherResult: null,
  shopUrl: null, shopState: null, shopChange: null, addedAt: '2026-10-01T00:00:00.000Z', editedAt: null }],
  ignored: [], lastRun: null };
// An NGA show already in her ledger: its own chip, never the Occasional pile (AL-030).
const NGA_URL = 'https://www.nga.gov/exhibitions/nga-chip-show';
ledger.rows.push({ ...ledger.rows[0], id: 'occ-nga-gov-ngachipshow', museumId: 'occ-nga-gov', title: 'NGA Chip Show',
  summary: 'A show at the National Gallery of Art.', exUrl: NGA_URL });
// A Yale Center for British Art show: its own chip, "Yale CBA" (AL-039).
ledger.rows.push({ ...ledger.rows[0], id: 'occ-britishart-yale-edu-yalechipshow', museumId: 'occ-britishart-yale-edu', title: 'Yale Chip Show',
  summary: 'A show at the Yale Center for British Art.', exUrl: 'https://britishart.yale.edu/exhibitions-programs/yale-chip-show' });

// ── the shops: real searches, and pages made to real shapes ─────────────────
const SEARCH = name => JSON.parse(fs.readFileSync(path.join(PAGES, 'shop_search', name + '.json'), 'utf8'));
const DIA_MIXED_ONLY = { results: [SEARCH('detroit').results[2]] };   // made: the reply with only "Books & Stationery" in it
const SEARCHES = [[/DIA only mixed/, DIA_MIXED_ONLY], [/Courtauld/, SEARCH('courtauld')], [/Cleveland/, SEARCH('cleveland')],
  [/Mauritshuis/, SEARCH('mauritshuis')], [/Thyssen/, SEARCH('thyssen')], [/Detroit/, SEARCH('detroit')],
  // Made from the live search (13 Oct): only the museum's own Shop page, which sends visitors elsewhere.
  [/Worcester/, { results: [{ url: 'http://worcesterart.org/visit/shop', title: 'Shop | Worcester Art Museum',
    excerpts: ['Online shop\nThe online shop currently offers a limited but exciting range of merchandise, including arts and crafts, WAM-branded goods, books, and exhibition catalogs.\nShop now'] }] }],
  // Made from her keyed search's live reply (13 Oct): its first result, Mia's own Catalogues shelf.
  [/Minneapolis/, { results: [{ url: 'https://shop.artsmia.org/collections/exhibition-catalogues', title: 'Exhibition Catalogues - The Store at Mia - Minneapolis Institute of Art',
    excerpts: ['Menu\nContinue Shopping\nYour Cart is Empty\nOnly at Mia\nMia Merchandise\nCatalogues\nArt & Stationery\nKid\'s Books\nToys\nSale'] }] }],
  // Made from her keyed search's live reply (17 Oct, trimmed): Yale's own "Museum Bookshop" page among its results.
  [/Yale Center for British Art/, { results: [
    { url: 'https://britishart.yale.edu/publications', title: 'Publications - Yale Center for British Art', excerpts: ['# Publications\n\n### The Yale Center for British Art produces books that complement and augment its architecture, collections, exhibitions, programs, and other collaborative research projects.'] },
    { url: 'https://britishart.yale.edu/museum-shop', title: 'Museum Bookshop - Yale Center for British Art', excerpts: ['# Museum Bookshop\n\nBrowse our offerings and make purchases [online](https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true "Museum Shop") . All proceeds support the YCBA’s educational mission and programs.\n\n## [Shop online](https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true)'] }] }]];
const books = ' Hardcover. 240 pages. € 34,95 — Paperback catalogue. € 24,95 — Exhibition catalogue, hardcover. € 49,95.';
const SHOPS = {
  // Yale (17 Oct, live, trimmed): its Museum Bookshop page links to a shop on Yale's payment
  // site (Touchnet). Every Touchnet page reads blank unless its address names a page.
  'https://britishart.yale.edu/museum-shop': '## Main navigation\n\nExhibitions and programs Collections Research and learning Plan your visit About us\n\n# Museum Bookshop\n\nBrowse our offerings and make purchases [online](https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true "Museum Shop") . All proceeds support the YCBA’s educational mission and programs.\n\nBrowse a wide variety of books on British art and culture, as well as publications related to the museum’s collections, exhibitions, and architecture.\n\n## [Shop online](https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true)\n\n## Free Membership',
  'https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true': 'YCBA Home',
  'https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true&page=1': 'YCBA Home Skip to Main Content Pause/play carousel\n\n[YCBA Home](https://britishart.yale.edu/ "YCBA Home")\n\nToggle Main Navigation\n\n* Enter a site search term and use the ENTER KEY to submit your search\n* Items in Cart 0 0\n\nCarousel content with 5 slides.\n\nExplore the Work of John Constable!  \n  \nJOHN CONSTABLE (1776–1837) is celebrated today as one of Britain’s greatest painters. Published by the Yale Center for British Art Hardcover 128 Pages, 113 color illus. ISBN 9780300284669 Tim Barringer Contribution by Nicholas Robbins\n\n# YCBA Home\n\n[Publications The number of products in this category is](https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true)\n\n[Free Membership The number of products in this category is](https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=59&SINGLESTORE=true)\n\n[Yale](http://www.yale.edu/)\n\nShipping Rates | [Privacy Policy](https://www.yale.edu/privacy-policy) | Delivery Policy | [Accessibility](https://usability.yale.edu/web-accessibility/accessibility-yale) | [Contact Us](mailto:ycba.shop@yale.edu "contactUs")\n\nTouchnet\n\nReturn to Top Button',
  'https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true': 'YCBA Home - Publications',
  'https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true&page=1': 'YCBA Home - Publications Skip to Main Content\n\n[YCBA Home](https://britishart.yale.edu/ "YCBA Home")\n\nToggle Main Navigation\n\n* Enter a site search term and use the ENTER KEY to submit your search\n* Items in Cart 0 0\n\n# Publications\n\n1. [YCBA Home](https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true)\n2. Publications\n\n[Painters, Ports, and Profits: Arts and the East India Company, 1750-1850 Painters, Ports, and Profits: Arts and the East India Company, 1750-1850](https://secure.touchnet.net/C20510_ustores/web/product_detail.jsp?PRODUCTID=2564&SINGLESTORE=true)\n\n[Gwen John: Strange Beauties Gwen John: Strange Beauties](https://secure.touchnet.net/C20510_ustores/web/product_detail.jsp?PRODUCTID=2565&SINGLESTORE=true)\n\n[Constable Constable](https://secure.touchnet.net/C20510_ustores/web/product_detail.jsp?PRODUCTID=2409&SINGLESTORE=true)\n\n[Blake Blake](https://secure.touchnet.net/C20510_ustores/web/product_detail.jsp?PRODUCTID=2406&SINGLESTORE=true)\n\n[The English Prize: The Capture of the “Westmorland,” an Episode of the Grand Tour The English Prize: The Capture of the “Westmorland,” an Episode of the Grand Tour](https://secure.touchnet.net/C20510_ustores/web/product_detail.jsp?PRODUCTID=85&SINGLESTORE=true)\n\nOut of Stock\n\n[Endless Forms: Charles Darwin, Natural Science, and the Visual Arts Endless Forms: Charles Darwin, Natural Science, and the Visual Arts](https://secure.touchnet.net/C20510_ustores/web/product_detail.jsp?PRODUCTID=42&SINGLESTORE=true)\n\n[Yale](http://www.yale.edu/)\n\nReturn to Top Button',
  'https://secure.touchnet.net/C20510_ustores/web/product_detail.jsp?PRODUCTID=2564&SINGLESTORE=true': 'Painters, Ports, and Profits: Arts and the East India Company, 1750-1850',
  'https://secure.touchnet.net/C20510_ustores/web/product_detail.jsp?PRODUCTID=2564&SINGLESTORE=true&page=1': 'Painters, Ports, and Profits: Arts and the East India Company, 1750-1850 Skip to Main Content\n\n[YCBA Home](https://britishart.yale.edu/ "YCBA Home")\n\n# Painters, Ports, and Profits: Arts and the East India Company, 1750-1850\n\n1. [YCBA Home](https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true)\n2. [Publications](https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true)\n3. Painters, Ports, and Profits: Arts and the East India Company, 1750-1850\n\n**Description**\n\nDescription Painters, Ports, and Profits: Artists and the East India Company, 1750–1850 tells the story of the remarkable creative exchanges that coincided with the rise of one of the most ruthless and powerful corporations in history. This publication accompanies the exhibition on view at the Yale Center for British Art from January 8 through May 31, 2026.  \n  \nPublished by the Yale Center for British Art Hardcover, 280 pages, 214 color and black-and-white illus. ISBN 9780300286540  \n  \nPublication date: January 6, 2026\n\nPrice:\n\n$65.00\n\nQuantity:\n\nAdd to Basket\n\n[Yale](http://www.yale.edu/)\n\nTouchnet\n\nReturn to Top Button',
  // Worcester (13 Oct, live, trimmed): the Shop page's "Shop now" leads to another site.
  'http://worcesterart.org/visit/shop': '# Shop\n\n## Online shop\n\nThe online shop currently offers a limited but exciting range of merchandise, including arts and crafts, WAM-branded goods, books, and exhibition catalogs.\n\n[Shop now](https://the-museum-shop-at-wam.myshopify.com/)\n\nOrder custom prints of artworks through [RequestAPrint](https://www.requestaprint.net/worcester/index.php) .',
  'https://the-museum-shop-at-wam.myshopify.com/collections.json?limit=250': '{"collections":[{"id":388308795645,"title":"Books - Non Catalog","handle":"books-non-catalog","products_count":152},{"id":387956080893,"title":"Catalogs","handle":"catalogs","description":"<p>Exhibition Catalogs; Past and Present.</p>","products_count":41},{"id":388296442109,"title":"Jewelry","handle":"jewelry","products_count":60}]}',
  'https://the-museum-shop-at-wam.myshopify.com/collections/catalogs': '30 products\n* ### [Japanese Woodblock Prints](https://the-museum-shop-at-wam.myshopify.com/products/jap-woodblock-prints)\n  Regular price $39.99 USD\n* ### [JEWELS OF THE NILE HARDCOVER PUBLICATION](https://the-museum-shop-at-wam.myshopify.com/products/jewels-of-the-nile-hardcover-publication)\n  Regular price $49.95 USD\n* ### [THE ICONIC JERSEY CATALOGUE](https://the-museum-shop-at-wam.myshopify.com/products/the-iconic-jersey-catalogue)\n  Regular price $34.95 USD\n# Collection: Catalogs\nExhibition Catalogs; Past and Present.',
  // Mia's shelf as the connector copies it (13 Oct): the menu only, its books drawn by script.
  'https://shop.artsmia.org/collections/exhibition-catalogues': 'Menu\n* [Catalogues](https://shop.artsmia.org/collections/exhibition-catalogues)\n* [Kid\'s Books](https://shop.artsmia.org/collections/kids-books)\n* [Sale](https://shop.artsmia.org/collections/sale)\n[The Store at Mia - Minneapolis Institute of Art](https://shop.artsmia.org/)',
  'https://shop.artsmia.org/collections/exhibition-catalogues/products.json?limit=8': SEARCH('mia_catalogues_products').full_content,
  'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi': 'Catalogi' + books,
  'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi': 'Boeken & Catalogi' + books,
  'https://tienda.museothyssen.org/collections.json?limit=250': SEARCH('thyssen_collections').full_content,
  'https://tienda.museothyssen.org/en/': '[Print on demand](https://tienda.museothyssen.org/en/collections/print-on-demand) [Gifts](https://tienda.museothyssen.org/en/collections/regalos) [Museum publications](https://tienda.museothyssen.org/en/collections/publicaciones-museo) [Posters](https://tienda.museothyssen.org/en/collections/posters)',
  'https://tienda.museothyssen.org/en/collections/publicaciones-museo': 'Museum publications' + books,
  'https://diashop.org/dia-publications': SEARCH('detroit_publications').full_content,
  'https://diashop.org/dia-publications/': SEARCH('detroit_publications').full_content,   // the sidebar's own spelling
  'https://diashop.org/': '',
  // "Books & Stationery": its sidebar as on her 4 Oct screenshot, links as the
  // search excerpt gives them; products pens and books alike.
  'https://diashop.org/dia-museum-book-shop/': '# Books & Stationery\n[Notecards & Journals](https://diashop.org/notecards-journals/) [Art Supplies](https://diashop.org/art-supplies/) [Cookbooks](https://diashop.org/cookbooks-1/) [DIA Publications](https://diashop.org/dia-publications/) [Detroit & Michigan](https://diashop.org/detroit-michigan/) [Artist Monographs & Subjects](https://diashop.org/artist-monographs-subjects/) [Gift Books](https://diashop.org/book-gifts/)\n#### [Gold Fountain Pen - Wave](https://diashop.org/gold-fountain-pen-wave/) $26.95\n#### [Fineliners Set of 5](https://diashop.org/fineliners/) $21.95\n#### [Dutch Art in a Global Age](https://diashop.org/dutch-art-in-a-global-age/) $60.00',
};

// DIA's own search (BigCommerce) answers only at search.php, with the product
// the words name — made to the shape of DIA's own link to one
// (?searchuuid=…&search_query=…, 4 Oct). Every other address answers empty.
function DIA_SEARCH(u) {
  const m = u.match(/^https:\/\/diashop\.org\/search\.php\?search_query=(.+)$/);
  if (!m) return '';
  const words = decodeURIComponent(m[1]);
  const hit = Object.values(SHOPS).join('\n').match(new RegExp('\\[' + words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]\\((https://diashop\\.org/[^)]+)\\)'));
  return hit ? '# Search Results\n#### [' + words + '](' + hit[1] + '?searchuuid=1)$36.00' : '# Search Results\nNo products found';
}

// ── the runtime: a store, a scripted connector and a scripted Claude ───────
const calls = [];
const store = new Map();
// DIA already met, with her short name, its shop set aside ("Wrong shop"):
// the next link looks for the shop again and must keep her name.
store.set('venues/occasional', { venues: { 'occ-dia-org': { id: 'occ-dia-org', name: 'Detroit Institute of Arts Museum',
  short: 'Detroit', host: 'dia.org', shop: 'unknown', confirmed: false, rejected: [], addedAt: '2026-10-04T00:00:00.000Z' } } });
function runtime() {
  const doc = key => ({
    get: async () => ({ exists: store.has(key), data: () => store.get(key) }),
    set: async v => { store.set(key, v); },
  });
  return {
    use: async name => {
      if (name === 'db') return { doc };
      if (name === 'downloads') return { save: async () => ({ ok: true }) };
      if (name === 'mcp') return { callTool: async (server, tool, args) => {
        calls.push({ kind: 'mcp', tool, args });
        if (tool === 'web_search') {
          const q = args.search_queries.join(' ');
          const hit = SEARCHES.find(([re]) => re.test(q));
          if (hit) return { payload: { results: hit[1].results } };
          return { payload: { results: [{ url: 'https://www.royalacademy.org.uk/visit', title: 'Visit the RA' }] } };
        }
        // Several addresses in one call (the search proof): each answered alone.
        if (args.urls.length > 1) return { payload: { results: args.urls.map(u => ({ url: u, title: 'Shop', full_content: DIA_SEARCH(u) || SHOPS[u] || '' })), errors: [] } };
        const u = args.urls[0];
        if (u === HELD) { await held; return { payload: { results: [{ url: u, title: 'Held', full_content: '' }], errors: [] } }; }
        if (u === REFUSED) return { payload: { results: [], errors: [{ url: u, error_type: 'http_error', http_status_code: 403 }] } };
        if (u === EMPTY) return { payload: { results: [{ url: u, title: 'Empty', full_content: 'Loading…' }], errors: [] } };
        if (P[u]) return { payload: { results: [P[u]], errors: [] } };
        if (SHOPS[u] !== undefined) return { payload: { results: [{ url: u, title: 'Shop', full_content: SHOPS[u] }], errors: [] } };
        return { payload: { results: [{ url: u, title: '', full_content: '' }], errors: [] } };
      } };
      if (name === 'sample') return { json: async prompt => {
        calls.push({ kind: 'sample', prompt });
        const t = (prompt.match(/EXHIBITION TITLE, as the page gives it: (".*")/) || [])[1];
        const title = t ? JSON.parse(t) : '';
        if (/Peggy/.test(title)) return { summary: 'Guggenheim Jeune, her radical London gallery, revisited.', subtitle: 'The Making of a Collector', english: '', englishSpeaking: true };
        if (/Manet/.test(title)) return { summary: 'Manet and Morisot, friends and rivals.', subtitle: 'A Study in Friendship', english: '', englishSpeaking: true };
        if (/Rubens/.test(title)) return { summary: 'Rubens restored.', english: '"Rubens. The Restoration of Venus and Cupid"', englishSpeaking: false };
        if (/Hammersh/.test(title)) return { summary: 'First Spanish retrospective of Hammershøi.', english: '', englishSpeaking: false };
        if (/Grand Tour/.test(title)) return { summary: GRAND_SUMMARY, english: '', englishSpeaking: false };
        if (/venueOwnPage/.test(prompt) && /Magritte|Folly Beyond Words/.test(title))
          return { summary: 'Magritte retold.', english: '', englishSpeaking: false, venue: 'Royal Museum of Fine Arts', venueAlso: ['KMSKA', 'Koninklijk Museum voor Schone Kunsten Antwerpen'], venueCity: 'Antwerp', venueCountry: 'Belgium', venueShort: 'Antwerp KMSKA', venueOwnPage: true };
        if (/published by someone other than the museum/.test(prompt) && /Canaletto and the Art of Venice/.test(title))
          return { venueSite: 'rct.uk', title: 'Canaletto and the Art of Venice' };
        if (/venueOwnPage/.test(prompt) && /Canaletto and the Art of Venice/.test(title))
          return { summary: 'Canaletto and his Venetian contemporaries.', english: '', englishSpeaking: true, venue: 'The Queen\u2019s Gallery, Buckingham Palace', venueCity: 'London', venueCountry: 'United Kingdom', venueOwnPage: false };
        // AL-062: Pontormo's live answer, a claim its page does not hold, then right when told why; and one never right.
        if (/^pontormo$/i.test(title)) return /YOUR LAST ANSWER WAS REFUSED/.test(prompt)
          ? { summary: 'Pontormo\u2019s paintings and drawings.', english: '', englishSpeaking: false }
          : { summary: 'First major monographic exhibition on Pontormo.', english: '', englishSpeaking: false };
        if (/^Never Passes$/.test(title)) return { summary: 'The first show of its kind.', english: '', englishSpeaking: false };
        // Within the ten-word cap, as every answer must be (scraper/answer_check.js).
        return { summary: 'A summary of ' + String(title).split(/\s+/).slice(0, 6).join(' ') + '.', english: '', englishSpeaking: true };
      } };
      return null;
    },
    complete: async () => '',
  };
}

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window;
  win.claude = runtime();
  const globals = ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame',
    'cancelAnimationFrame', 'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event',
    'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'Blob'];
  for (const k of globals) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  React = require('react'); ({ createRoot } = require('react-dom/client')); ({ act } = require('react'));
  const shouted = [];
  console.error = (...a) => shouted.push(String(a[0]));

  const settle = async (n = 6) => { for (let i = 0; i < n; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
  const root = createRoot(win.document.getElementById('root'));
  const App = new Function('React', 'window', 'document', 'localStorage', code + '\n;return App;')(
    React, win, win.document, win.localStorage);
  const discoverShop = new Function('React', 'window', 'document', 'localStorage', code + '\n;return discoverShop;')(
    React, win, win.document, win.localStorage);
  await act(async () => { root.render(React.createElement(App)); });
  await settle();

  const input = win.document.querySelector('input[type=file][accept=".json"]');
  const file = new win.File([JSON.stringify(ledger)], 'ledger.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => { input.dispatchEvent(new win.Event('change', { bubbles: true })); });
  await settle();

  const buttons = re => [...win.document.querySelectorAll('button')].filter(b => re.test(b.textContent.trim()));
  const click = async el => { await act(async () => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }); await settle(); };

  // The sweep-file button: "Import Refresh" on main, "Import" on the cloud
  // branch (where main's ledger "Import" is "Load").
  const importBtn = () => buttons(/^Import Refresh$/)[0] || buttons(/^Import$/)[0];
  // ── AL-015: a page title with the site's sections between show and site ─
  // Her NG link, 6 Oct: "… | Past exhibitions" came through on the title.
  {
    const split = new Function('React', 'window', 'document', 'localStorage', code + '\n;return splitPageTitle;')(React, win, win.document, win.localStorage);
    const r = split('Venice: Canaletto and His Rivals | Past exhibitions | National Gallery', 'www.nationalgallery.org.uk');
    ok(r.show === 'Venice: Canaletto and His Rivals' && r.site === 'National Gallery',
      'AL-015: several bars — the show is the first part, the site the last; the section between dropped', JSON.stringify(r));
  }
  // Her NG Duccio, 6 Oct: the show's own name holds a bar ("Duccio | Caro"),
  // so the page title alone cut it short. The heading carries it whole.
  {
    const read = new Function('React', 'window', 'document', 'localStorage', code + '\n;return readShowPage;')(React, win, win.document, win.localStorage);
    const body = '\n\nPast exhibition\n\n13 June - 8 November 2015\n\nAdmission free\n\n' + 'A work by the late British sculptor Sir Anthony Caro functions as a gateway to re-examining Duccio\'s Annunciation. '.repeat(6);
    const duccio = read({ title: 'Art in Dialogue: Duccio | Caro | Past exhibitions | National Gallery', full_content: '# Art in Dialogue: Duccio \\| Caro' + body }, 'https://www.nationalgallery.org.uk/exhibitions/past/art-in-dialogue-duccio-caro');
    const venice = read({ title: 'Venice: Canaletto and His Rivals | Past exhibitions | National Gallery', full_content: '# Venice: Canaletto and His Rivals' + body }, 'https://www.nationalgallery.org.uk/exhibitions/past/venice-canaletto-and-his-rivals');
    ok(duccio.base === 'Art in Dialogue: Duccio | Caro' && venice.base === 'Venice: Canaletto and His Rivals',
      'AL-015a: a bar inside the show\'s own name is kept, read off the page\'s heading; a section name still is not', JSON.stringify([duccio.base, venice.base]));
  }
  // ── AL-050–052: someone else's page about a show held elsewhere (her Enfilade link) ─
  // The page as Parallel returned it to her app (lookup log), and its saved title.
  {
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const split = fn('splitPageTitle'), read = fn('readShowPage'), away = fn('heldElsewhere');
    const host = 'enfilade18thc.com';
    const a = split('Exhibition | Canaletto and the Art of Venice | Enfilade', host);
    const b = split('Exhibition | Canaletto and the Art of Venice \u2013 Enfilade', host);
    ok(a.show === 'Canaletto and the Art of Venice' && a.site === 'Enfilade' && b.show === a.show && b.site === 'Enfilade',
      'AL-050: a blog\'s "Exhibition |" label is not the show\'s name; the site after a dash or a bar is the site', JSON.stringify([a, b]));
    const c = split('Exhibition | Canaletto and the Art of Venice', host), d = split('Exhibitions | Tate', 'www.tate.org.uk');
    ok(c.show === 'Canaletto and the Art of Venice' && d.show === 'Tate', 'AL-050a:  a label with nothing after it but the show drops too', JSON.stringify([c, d]));
    const enf = JSON.parse(fs.readFileSync(path.join(PAGES, 'elsewhere', 'enfilade_canaletto.json'), 'utf8'));
    const r = read(enf, enf.url + '?utm_source=chatgpt.com', null);
    ok(r.ok && r.base === 'Canaletto and the Art of Venice' && r.start === '2017-05-19' && r.end === '2017-11-12',
      'AL-050b:  Enfilade, Canaletto: titled "Canaletto and the Art of Venice", 19 May to 12 Nov 2017', JSON.stringify([r.base, r.start, r.end, r.why]));
    ok(r.link === enf.url && /Buckingham Palace, London, 19 May/.test(r.dateLine),
      'AL-051: the link\'s tracking tail is dropped; the date line read is kept for Claude', JSON.stringify([r.link, r.dateLine]));
    const qg = away({ venue: 'The Queen\u2019s Gallery, Buckingham Palace', venueSite: 'rct.uk', venueOwnPage: false }, host);
    ok(qg && qg.id === 'occ-rct-uk' && qg.name === 'The Queen\u2019s Gallery, Buckingham Palace' && qg.host === 'rct.uk',
      'AL-052: a show held elsewhere files under the venue Claude names, by its own site', JSON.stringify(qg));
    const tb = away({ venue: 'Tate Britain', venueSite: '', venueOwnPage: false }, 'someblog.com');
    const nosite = away({ venue: 'The Queen\u2019s Gallery', venueSite: '', venueOwnPage: false }, host);
    ok(tb && tb.id === 'tate-britain' && nosite && nosite.id === 'occ-queen-s-gallery',
      'AL-052a:  one of her venues by name; with no site known, a venue of its own by name', JSON.stringify([tb, nosite]));
    ok(away({ venue: 'Enfilade', venueSite: '', venueOwnPage: false }, host) === null && away({ venue: 'Queen\u2019s Gallery', venueSite: 'rct.uk', venueOwnPage: true }, host) === null
      && away({ venue: 'X', venueSite: 'enfilade18thc.com', venueOwnPage: false }, host) === null,
      'AL-052b:  the venue\'s own page, or a venue named in the page\'s own site, stays where it is');
    // Her Reynolds links (Enfilade's PDF, Meer): Claude named the Wallace but, sent no address,
    // called each the museum's own page. It is now given the address and reads the full title.
    const prompt = fn('linkPrompt'), more = fn('elsewherePrompt'), answer = fn('elsewhereAnswer');
    const pdf = 'https://enfilade18thc.com/wp-content/uploads/2014/12/joshua-reynolds.pdf';
    const asked = prompt({ base: 'Joshua Reynolds', between: [], raw: 'x', dateLine: '12 March \u2013 7 June 2015' }, true, pdf);
    const plain = prompt({ base: 'Joshua Reynolds', between: [], raw: 'x', dateLine: '' }, false, pdf);
    const second = more({ base: 'Joshua Reynolds', raw: 'x' }, pdf, { venue: 'The Wallace Collection', venueCity: 'London' });
    ok(asked.includes('PAGE ADDRESS: ' + pdf) && /PAGE ADDRESS is on that museum/.test(asked) && /"venueCity":/.test(asked) && /"venueCountry":/.test(asked) && /"venueAlso":/.test(asked)
      && !/"title":/.test(asked) && !/"venueSite":/.test(asked) && !plain.includes('PAGE ADDRESS') && !/"venueOwnPage":/.test(plain),
      'AL-052g: on a site never seen, Claude is sent the page\'s address and asked the venue, its city and country, and whether the page is its own — nothing only a blog page needs; a known venue\'s prompt is unchanged');
    ok(second.includes('PAGE ADDRESS: ' + pdf) && /"title":/.test(second) && /"venueSite":/.test(second) && second.includes('The Wallace Collection, London'),
      'AL-052g2: on someone else\'s page only, a second question: the museum\'s website and the show\'s full title');
    const ans = { venue: 'The Wallace Collection', venueOwnPage: false, ...answer({ venueSite: 'wallacecollection.org', title: '\u201cJoshua Reynolds: Experiments in Paint\u201d' }) };
    const wal = away(ans, 'enfilade18thc.com');
    ok(ans.title === 'Joshua Reynolds: Experiments in Paint' && wal && wal.id === 'wallace',
      'AL-052h:  Reynolds on Enfilade: the title Claude read is kept; the show files under the Wallace', JSON.stringify([ans.title, wal]));
  }
  // ── AL-016: a link from one of her 28 files under that venue ───────────
  // 7 Oct: her Jacquemart-André links became a new venue — the app knew a venue
  // by exBase/listUrl, blank at 23 of the 28. It now knows each by its site,
  // written in from the scraper's recipes (VENUE_SITES).
  {
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const known = fn('knownVenueFor'), sites = fn('VENUE_SITES'), museums = fn('MUSEUMS');
    const { VENUES } = require('../sweep_prototype.js');
    ok(JSON.stringify(sites.map(v => v.id).sort()) === JSON.stringify(Object.keys(VENUES).sort())
      && JSON.stringify(museums.map(m => m.id).sort()) === JSON.stringify(Object.keys(VENUES).sort()),
      'AL-016: the app knows the site of every one of the scraper\'s venues, and the same 28 as its own list', sites.length);
    const wrong = Object.entries(VENUES).filter(([id, v]) => known(v.base + (v.showPath || '/') + 'some-show') !== id).map(([id]) => id);
    ok(!wrong.length, 'AL-016a:  a show link at each of the 28 files under that venue', wrong.join(', '));
    ok(known('https://www.musee-jacquemart-andre.com/en/watteau-fragonard') === 'jacquemart'
      && known('https://musee-jacquemart-andre.com/en/turner') === 'jacquemart',
      'AL-016b:  her Jacquemart-André links, with and without www');
    ok(known('https://www.tate.org.uk/whats-on/tate-britain/some-show') === 'tate-britain'
      && known('https://www.tate.org.uk/whats-on/tate-modern/some-show') === 'tate-modern'
      && known('https://www.tate.org.uk/whats-on/tate-liverpool/some-show') === null,
      'AL-016c:  one site, two venues: the Tates told apart by the path; Tate Liverpool is neither');
    ok(known('https://www.mauritshuis.nl/en/exhibitions/x') === null, 'AL-016d:  a site outside the 28 is not one of them');
  }
  // ── AL-017: the description is wherever it sits, not only below the dates ─
  // 7 Oct: two of her Jacquemart-André links came with no description. The
  // page prints its dates at the FOOT, and the text read started after them —
  // opening hours, prices and cookies. Her saved page (docs/link_pages/).
  {
    const read = new Function('React', 'window', 'document', 'localStorage', code + '\n;return readShowPage;')(React, win, win.document, win.localStorage);
    const r = read(page('jacquemart_watteau'), page('jacquemart_watteau').url);
    ok(r.ok && r.start === '2014-03-14' && r.end === '2014-07-21', 'AL-017: Watteau to Fragonard dated from the foot of the page', JSON.stringify([r.start, r.end, r.why]));
    ok(r.ok && /delighted to be holding the exhibition/.test(r.raw) && !/Open every day|cookies/i.test(r.raw),
      'AL-017a:  the text handed to Claude is the show\'s, from under its heading — not the hours, prices and cookies under the dates', r.raw && r.raw.slice(0, 120));
    ok(r.ok && !r.raw.includes('From 14 March to 21 July 2014') && !/^From Watteau to Fragonard$/m.test(r.raw), 'AL-017b:  the date line and the heading are not repeated in it');
  }
  // ── AL-036: a link's tracking tags are dropped before it is read ─
  {
    const links = new Function('React', 'window', 'document', 'localStorage', code + '\n;return linksIn;')(React, win, win.document, win.localStorage);
    const got = links('https://www.metmuseum.org/exhibitions/listings/2000/john-singer-sargent?utm_source=chatgpt.com\nhttps://example.org/show?id=4&utm_medium=x#top');
    ok(got.join() === 'https://www.metmuseum.org/exhibitions/listings/2000/john-singer-sargent,https://example.org/show?id=4#top',
      'AL-036: Met Sargent: "?utm_source=chatgpt.com" dropped from the link; the page\'s own query kept', JSON.stringify(got));
  }
  // ── AL-037: a Wayback Machine copy files under the museum it copied ─
  {
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const site = fn('siteUrlOf'), known = fn('knownVenueFor'), occ = fn('occVenueId'), host = fn('hostOf');
    const ra = 'https://web.archive.org/web/2010/http://www.royalacademy.org.uk/exhibitions/sargent-and-the-sea/';
    ok(occ(host(site(ra))) === 'occ-royalacademy-org-uk' && known(ra) === null,
      'AL-037: RA Sargent and the Sea: an archived copy files under the Royal Academy, not web.archive.org', occ(host(site(ra))));
    ok(known('https://web.archive.org/web/20100720000000id_/https://www.metmuseum.org/exhibitions/x') === 'met'
      && known('https://web.archive.org/web/2015/www.tate.org.uk/whats-on/tate-britain/x') === 'tate-britain',
      'AL-037a:  a copy of one of the 28 files under that venue, with or without a scheme or "id_"');
    ok(site('https://web.archive.org/') === 'https://web.archive.org/' && site('https://www.metmuseum.org/x') === 'https://www.metmuseum.org/x',
      'AL-037b:  any other address is left as it is');
  }
  // ── AL-038: NGV's two-digit years (shortYear) ─
  {
    const read = new Function('React', 'window', 'document', 'localStorage', code + '\n;return readShowPage;')(React, win, win.document, win.localStorage);
    const body = '\n\n**The Ian Potter Centre: NGV Australia, Fed Square**\n\nLevel 3\n\n**4 Sep 26 – 31 Jan 27, ticketed**\n\nOpen daily 10am–5pm\n\n' + 'The art of Margaret Preston has shaped the cultural and aesthetic landscape of Australia. '.repeat(6);
    const r = read({ title: 'Margaret Preston | NGV', full_content: '# Margaret Preston' + body }, 'https://www.ngv.vic.gov.au/exhibition/margaret-preston/', 'occ-ngv-vic-gov-au');
    ok(r.ok && r.start === '2026-09-04' && r.end === '2027-01-31', 'AL-038: NGV Margaret Preston: "4 Sep 26 – 31 Jan 27" read as 2026 to 2027', JSON.stringify([r.start, r.end, r.why]));
    const b = read({ title: 'Pierre Bonnard: Designed by India Mahdavi | NGV', full_content: '# Pierre Bonnard\n\n#### Designed by India Mahdavi\n\n**NGV International**\n\n**9 Jun – 7 Oct 23**' + body.slice(body.indexOf('The art')) }, 'https://www.ngv.vic.gov.au/exhibition/pierre-bonnard-archive/', 'occ-ngv-vic-gov-au');
    ok(b.ok && b.start === '2023-06-09' && b.end === '2023-10-07', 'AL-038a:  NGV Pierre Bonnard: the year on the closing side only, "9 Jun – 7 Oct 23"', JSON.stringify([b.start, b.end, b.why]));
    const other = read({ title: 'Some show | Elsewhere', full_content: '# Some show' + body }, 'https://example.org/show', null);
    ok(!other.start && !other.end, 'AL-038b:  two-digit years are read at NGV only', JSON.stringify([other.start, other.end]));
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const order = fn('VENUE_ORDER'), lv = fn('LINK_VENUES');
    ok(order[order.length - 1] === 'occ-ngv-vic-gov-au' && lv['occ-ngv-vic-gov-au'].card === 'National Gallery Victoria',
      'AL-038c:  NGV goes last in the Occasional group; its cards say "National Gallery Victoria" (her decision)', JSON.stringify([order[order.length - 1], lv['occ-ngv-vic-gov-au'].card]));
  }
  // ── AL-046: the shop screen asks only about a venue with a card going in (her decision) ─
  {
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const going = fn('venuesGoingIn');
    const SM = 'occ-museitoscana-cultura-gov-it', PS = 'occ-palazzostrozzi-org';
    const add = id => ({ type: 'add', cand: { museumId: id, title: 't', exUrl: 'https://x/' + id } });
    const props = [add(SM), add(PS), add(PS), add('met')];
    const one = [...going(props, { 0: { mode: 'accept' }, 1: { mode: 'reject' } })];
    ok(one.length === 1 && one[0] === SM, 'AL-046:  one link per venue: San Marco added, Strozzi rejected and undecided → only San Marco asked', JSON.stringify(one));
    const some = [...going(props, { 0: { mode: 'accept' }, 1: { mode: 'reject' }, 2: { mode: 'accept' }, 3: { mode: 'accept' } })];
    ok(some.length === 2 && some.includes(PS) && !some.includes('met'), 'AL-046a: two Strozzi links, one skipped, one added → Strozzi still asked; a swept venue never', JSON.stringify(some));
    const never = [...going(props, { 0: { mode: 'never' }, 1: { mode: 'reject' }, 2: {} })];
    ok(never.length === 0, 'AL-046b: quarantined, rejected and undecided cards ask about no shop', JSON.stringify(never));
    const occVenue = fn('occVenue');
    const sm = occVenue(SM, { id: SM, name: 'Direzione regionale Musei nazionali Toscana', shop: 'none', confirmed: true });
    ok(sm.name === 'Museo di San Marco' && sm.lookupName === 'Museo di San Marco' && sm.short === 'San Marco',
      'AL-046d: the lookup calls San Marco "Museo di San Marco", never the regional office the site names (her decision)', JSON.stringify([sm.name, sm.lookupName, sm.short]));
    const split = fn('splitPageTitle');
    const gd = split('Van Dyck, the European -', 'palazzoducale.genova.it');
    ok(gd.show === 'Van Dyck, the European' && split('Show – ', 'x.org').show === 'Show' && split('A - B', 'x.org').show === 'A - B',
      'AL-047:  Genoa Van Dyck: a page title ending in a separator with no site after it loses the separator; a dash inside a title stays', JSON.stringify(gd));
    const GD = 'occ-palazzoducale-genova-it', PR = 'occ-palazzorealemilano-it';
    const o2 = fn('VENUE_ORDER'), lv2 = fn('LINK_VENUES'), s2 = id => lv2[id].short;
    ok(o2[o2.indexOf(SM) + 1] === GD && o2[o2.indexOf(SM) + 2] === PR && s2(GD) === 'Palazzo Ducale Genova' && s2(PR) === 'Palazzo Reale Milano',
      'AL-046e: Palazzo Ducale Genova second and Palazzo Reale Milano third under Occasional, by her names (her decision)', JSON.stringify([o2[o2.indexOf(SM) + 1], o2[o2.indexOf(SM) + 2]]));
    // Shaped as the live reply (palazzorealemilano.it/en/-/brueghel): heading, short name, full name, dates.
    const readPage = fn('readShowPage'), nil = fn('nameInLines');
    const br = readPage({ title: 'I Brueghel - Palazzo Reale Milano - Comune di Milano', full_content: '4. I Brueghel\n\n# I Brueghel - Palazzo Reale Milano\n\n I Brueghel\n\n## I Brueghel. Le origini dei generi pittorici in Europa\n\nfrom 29 Sep 2026 to 31 Jan 2027\n\n# A Palazzo Reale dal 29 settembre 2026 al 31 gennaio 2027 la prima grande esposizione in Italia dedicata a una delle più influenti dinastie artistiche del Rinascimento europeo.\n\nIn programma dal 29 settembre 2026 al 31 gennaio 2027, la mostra accompagna il visitatore in un percorso storico e artistico attraverso oltre 80 opere tra dipinti, disegni e stampe.' }, 'https://www.palazzorealemilano.it/en/-/brueghel', PR);
    ok(br.ok && nil(br, PR) === 'I Brueghel. Le origini dei generi pittorici in Europa' && br.start === '2026-09-29',
      'AL-048:  Palazzo Reale Milano Brueghel: the full name below the heading is the title, "- Palazzo Reale Milano" dropped', JSON.stringify([br.base, nil(br, PR), br.start]));
    ok(nil(br, 'occ-other-org') === '', 'AL-048a: at any other venue the rule does nothing');
    const order = fn('VENUE_ORDER'), short = fn('LINK_VENUES')[SM].short;
    ok(order[order.indexOf('mam') + 1] === SM && short === 'San Marco',
      'AL-046c: San Marco (museitoscana.cultura.gov.it) first in the Occasional group, named "San Marco" (her decision)', JSON.stringify([order[order.indexOf('mam') + 1], short]));
  }
  // ── AL-031: NGA Souvenirs of the Gilded Age — a doubled colon becomes one ─
  // Live page on docs/link_proof_pages.json; its page title reads "Age:: French".
  {
    const read = new Function('React', 'window', 'document', 'localStorage', code + '\n;return readShowPage;')(React, win, win.document, win.localStorage);
    const r = read({ title: 'Souvenirs of the Gilded Age:: French Landscapes from the Corcoran Collection | National Gallery of Art',
      full_content: '# Souvenirs of the Gilded Age:\n\nFrench Landscapes from the Corcoran Collection\n\n## Details\n\n* ### Dates\n\n  March 13, 2027 \\- January 17, 2028\n\n'
        + 'Once coveted by America’s wealthy, these landscape paintings were eclipsed by the rising popularity of impressionism. '.repeat(4) },
      'https://www.nga.gov/exhibitions/souvenirs-gilded-age');
    ok(r.ok && r.base === 'Souvenirs of the Gilded Age: French Landscapes from the Corcoran Collection',
      'AL-031: NGA Souvenirs of the Gilded Age — the venue’s doubled colon becomes one', JSON.stringify(r.base));
  }
  // ── AL-032: Mia — the "––" site tail dropped, HTML codes decoded, its full name ─
  // Live pages on docs/link_proof_pages.json.
  {
    const read = new Function('React', 'window', 'document', 'localStorage', code + '\n;return readShowPage;')(React, win, win.document, win.localStorage);
    const r = read({ title: 'Matrimonial Bliss: Chagall&#039;s Double Portrait with Wine Glass –– Minneapolis Institute of Art',
      full_content: "# Matrimonial Bliss: Chagall's Double Portrait with Wine Glass\n\n### May 21, 2017 - July 30, 2017  \nCargillGallery  \nFree Exhibition\n\n"
        + 'Amid the hardships of World War I, Marc Chagall eagerly married the beautiful and well-educated Bella Rosenfeld in 1914. '.repeat(4) },
      'https://new.artsmia.org/exhibition/matrimonial-bliss-chagalls-double-portrait-with-wineglass-2', 'occ-new-artsmia-org');
    ok(r.ok && r.base === "Matrimonial Bliss: Chagall's Double Portrait with Wine Glass" && r.site === 'Minneapolis Institute of Art',
      'AL-032: Mia: no "–– Minneapolis Institute of Art" tail, no "&#039;", the venue named in full', JSON.stringify([r.base, r.site]));
  }
  // ── AL-040: Yale CBA — clock times between the dates (the shared reader, DS-003) ─
  // Made from the live pages (17 Oct); all three on docs/link_proof_pages.json.
  {
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const read = fn('readShowPage'), YALE = 'occ-britishart-yale-edu';
    const page = (title, when) => ({ title: title + ' | Yale Center for British Art',
      full_content: '## Main navigation\n\nExhibitions and programs Collections Research and learning Plan your visit About us\n\nExhibition\n\n# ' + title + '\n\n' + when + '\n\n'
        + 'This exhibition situated the work within the great outpouring of images of foreign lands produced by British artists. '.repeat(4) });
    const r = read(page('Pearls to Pyramids: British Visual Culture and the Levant, 1600–1830', 'Thursday, February 7, 2008, 10:00 am ET–Sunday, April 27, 2008, 5:00 pm ET'),
      'https://britishart.yale.edu/exhibitions-programs/pearls-pyramids-british-visual-culture-and-levant-1600-1830', YALE);
    ok(r.ok && r.start === '2008-02-07' && r.end === '2008-04-27' && r.base === 'Pearls to Pyramids: British Visual Culture and the Levant, 1600–1830',
      'AL-040: Yale Pearls to Pyramids: "February 7, 2008, 10:00 am ET–Sunday, April 27, 2008, 5:00 pm ET" read as 7 Feb to 27 Apr 2008', JSON.stringify([r.start, r.end, r.base, r.why]));
    const l = read(page('Edward Lear and the Art of Travel', 'Wednesday, September 20, 2000, 10:00 am ET–Sunday, January 14, 2001, 5:00 pm ET'),
      'https://britishart.yale.edu/exhibitions-programs/edward-lear-and-art-travel', YALE);
    ok(l.ok && l.start === '2000-09-20' && l.end === '2001-01-14', 'AL-040a:  Yale Edward Lear: across a year end, 20 Sep 2000 to 14 Jan 2001', JSON.stringify([l.start, l.end, l.why]));
  }
  // ── AL-019: a page title that dresses the show's name — the heading wins ─
  // 7 Oct, her cards: "Exhibition Fra Angelico in Paris: and the Masters of Light".
  {
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const read = fn('readShowPage'), title = fn('linkTitle');
    const fa = read(page('jacquemart_angelico'), page('jacquemart_angelico').url);
    const wf = read(page('jacquemart_watteau'), page('jacquemart_watteau').url);
    ok(fa.base === 'Fra Angelico' && wf.base === 'From Watteau to Fragonard', 'AL-019: "Exhibition … in Paris" round the heading: the heading is the name', JSON.stringify([fa.base, wf.base]));
    ok(title(fa.base, 'and the Masters of Light', fa.between) === 'Fra Angelico and the Masters of Light',
      'AL-019a:  a subtitle that carries on the sentence joins with a space', title(fa.base, 'and the Masters of Light', fa.between));
    ok(title(wf.base, 'les fêtes galantes', wf.between) === 'From Watteau to Fragonard: les fêtes galantes', 'AL-019b:  any other subtitle still takes a colon');
    ok(title('Botticelli', 'Artist And Designer', ['Artist and designer', 'Exhibition']) === 'Botticelli: Artist and designer',
      'AL-021a:  Claude\'s subtitle in other capitals still matches, and the page\'s own spelling is kept');
    ok(fa.under === 'and the Masters of Light' && wf.under === 'les fêtes galantes', 'AL-021b:  the line under the heading is read off the page', JSON.stringify([fa.under, wf.under]));
    const ham = read(P[urlOf('thyssen_hammershoi')], urlOf('thyssen_hammershoi'));
    ok(ham.base === 'Hammershøi. The Eye that Listens', 'AL-019c:  a title that only runs on past the heading keeps its subtitle (Thyssen)', ham.base);
  }
  // ── AL-022: the web step reads results whole, and a catalogue link is kept ─
  // Her Botticelli, 7 Oct: the app's own search (her keyed connector) returned
  // the museum's page with "Buy the catalog" at character ~1,970; the read was
  // handed 700 characters of each result. docs/lookup_results/.
  {
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const saved = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_results', 'jacquemart_botticelli.json'), 'utf8'));
    const forPrompt = fn('resultsForPrompt'), catLink = fn('catalogueLinkOn');
    ok(forPrompt(saved.results, 6000, { words: ['Botticelli', 'Musée Jacquemart-André'], dom: 'boutique.musee-jacquemart-andre.com' }).includes('Buy the catalog'),
      'AL-022: the museum page\'s "Buy the catalog" reaches the read at the web step');
    // ── AL-023: the relevant passages, not the first N characters (7 Oct) ──
    {
      const museum = saved.results[1].excerpts.join('\n');
      const pick = fn('pickPassages');
      const small = pick(museum, { words: ['Botticelli'], dom: 'boutique.musee-jacquemart-andre.com' }, 700);
      ok(small.includes('Buy the catalog') && small.length <= 700,
        'AL-023: even at 700 characters the catalogue line deep in the page is kept — the blind cut lost it', small.length);
      ok(museum.replace(/\s+/g, ' ').slice(0, 700).indexOf('Buy the catalog') < 0, 'AL-023a:  (the old first-700 cut really did lose it)');
      ok(pick('Short page. Nothing to cut.', {}, 700) === 'Short page. Nothing to cut.', 'AL-023b:  a result that fits is given whole');
      const order = pick(['Intro line one.', 'x'.repeat(800), 'The ISBN is 9789462302815.', 'Last line.'].join('\n'), {}, 300);
      ok(/^Intro line one\..*ISBN/.test(order) && order.length <= 300, 'AL-023c:  passages kept in page order, the relevant one in, under the cap', order.slice(0, 80));
    }
    ok(catLink(saved.results, 'boutique.musee-jacquemart-andre.com') === 'https://boutique.musee-jacquemart-andre.com/en/product/230-special-issue-botticelli-artist-and-designer.html',
      'AL-022a:  the catalogue link onto the venue\'s own shop is read off the results in code');
    ok(catLink(saved.results, 'shop.example.org') === null, 'AL-022b:  and only onto THAT venue\'s shop');
    const lookup = fs.readFileSync(path.join(__dirname, '..', '..', 'Cat_Watch.jsx'), 'utf8');
    ok(/resultsForPrompt\(s2\.results,6000,\{words:\[title,venue\],dom\}\)/.test(lookup), "AL-022c:  the web step reads up to 6,000 characters, chosen around the show and the shop");
  }
  // ── AL-001: Import opens ONE pop-up; nothing is added to the page ───────
  // Her ruling, 4 Oct: no new buttons and no text in the page's header.
  const dialog = () => win.document.querySelector('[role=dialog]');
  const headerButtons = () => [...win.document.querySelector('header').querySelectorAll('button')].map(b => b.textContent.trim());
  const before = headerButtons();
  ok(!dialog(), 'AL-001: before Import is pressed, no pop-up');
  await click(importBtn());
  ok(!!dialog(), 'AL-001a:  pressed, a pop-up opens');
  ok(JSON.stringify(headerButtons()) === JSON.stringify(before), 'AL-001b:  and not one button is added to the page itself', headerButtons().join(' | '));
  const inside = () => [...dialog().querySelectorAll('button')].map(b => b.textContent.trim()).join('|');
  const inDialog = t => [...dialog().querySelectorAll('button')].find(b => b.textContent === t);
  ok(inside() === 'CSV|Links|Pages|Cancel' && !dialog().querySelector('textarea'),
    'AL-001c:  small: CSV, Links, Pages, and Cancel under them — no box yet', inside());
  {
    const csvInput = win.document.querySelector('input[type=file][accept=".csv,text/csv"]');
    let opened = false; csvInput.click = () => { opened = true; };
    await click(inDialog('CSV'));
    ok(opened && !dialog(), 'AL-001d:  "CSV" closes it and opens the file picker, as Import always did');
  }
  await click(importBtn());
  await click(inDialog('Cancel'));
  ok(!dialog(), 'AL-001e:  "Cancel" closes it');
  await click(importBtn());
  await click(inDialog('Links'));
  const box = dialog().querySelector('textarea');
  {
    const [csvB, linksB] = [...dialog().querySelectorAll('button')];
    ok(linksB.style.background && linksB.style.background !== 'transparent' && csvB.style.background === 'transparent',
      'AL-002a:  the pressed one turns solid (Save\'s green), the other stays plain', linksB.style.background + ' / ' + csvB.style.background);
  }
  ok(!!box && inside() === 'CSV|Links|Pages|Read|Cancel', 'AL-002: "Links" opens the box and Read on the same pop-up, Cancel still below', inside());

  // ── AL-003: pasted carelessly — commas, spaces, lines, words, a repeat ─────
  const pasted = 'here you go: ' + WANT.slice(0, 4).map(w => urlOf(w[0])).join(', ') + ' ' + GRAND + '\n'
    + WANT.slice(4).map(w => urlOf(w[0])).join(' , ') + '\nand ' + urlOf('ra_guggenheim') + '.\n' + REFUSED + ';' + EMPTY;
  const setter = Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype, 'value').set;
  await act(async () => { setter.call(box, pasted); box.dispatchEvent(new win.Event('input', { bubbles: true })); });
  await settle();
  calls.length = 0;
  await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Read'));
  await settle(30);
  const expand = buttons(/^Expand all venues$/)[0];
  if (expand) await click(expand);

  const showFetches = calls.filter(c => c.kind === 'mcp' && c.tool === 'web_fetch' && (P[c.args.urls[0]] || c.args.urls[0] === REFUSED || c.args.urls[0] === EMPTY));
  ok(showFetches.length === 12, 'AL-003: twelve different links, the repeated RA one read once — twelve page reads', showFetches.length);
  ok(calls.filter(c => c.kind === 'sample').length === 10, 'AL-003a:  and one Claude call per page that read, ten', calls.filter(c => c.kind === 'sample').length);

  // ── AL-004: each card's title and dates — read by code ────────────────────
  const adds = buttons(/Add new entry$/);
  ok(adds.length === 9, 'AL-004: nine Add cards (the Grand Tour is already in her ledger, unchanged)', adds.length);
  const cardOf = title => {
    for (const b of adds) { let el = b; while (el && !el.textContent.includes(title)) el = el.parentElement; if (el && el.textContent.length < 3000) return el; }
    return null;
  };
  for (const [name, title, from, to] of WANT) {
    const c = cardOf(title);
    ok(!!c, 'AL-004 ' + name + ': a card titled "' + title + '"');
    if (c) ok(c.textContent.includes(from) && c.textContent.includes(to), 'AL-004 ' + name + ':   dated ' + from + ' to ' + to, c.textContent.slice(0, 260));
  }
  ok(!cardOf('Manet & Morisot: A Study'), 'AL-005: a subtitle Claude gives that is NOT on the page is ignored');
  {
    const c = cardOf('Rubens. The Restoration');
    ok(c && c.textContent.includes('In English: "Rubens. The Restoration of Venus and Cupid." Rubens restored.'),
      'AL-006: a translation opens the description, in her format, quotes stripped from Claude\'s answer', c && c.textContent.slice(0, 300));
  }

  // ── AL-007: what could not be read is a line, and stays in the box ───────
  {
    const text = win.document.body.textContent;
    ok(text.includes(REFUSED + ' — The museum refused the page (403).'), 'AL-007: a refused page is a line naming the link and why');
    ok(text.includes(EMPTY + ' — The page came back empty.'), 'AL-007a:  so is an empty one');
    ok(win.document.querySelector('textarea').value === REFUSED + '\n' + EMPTY, 'AL-007b:  and the box now holds exactly those two links', JSON.stringify(win.document.querySelector('textarea').value));
    ok(!store.has('links/pending'), 'AL-007c:  not stored yet — the import has not finished (her rule, 4 Oct)');
  }

  // ── AL-012: an import she does not finish keeps nothing (her rule, 4 Oct) ─
  const occStored = () => ((store.get('venues/occasional') || {}).venues) || {};
  const before12 = JSON.stringify(occStored());
  ok(Object.keys(occStored()).length === 1, 'AL-012: the Read stores no venue and no shop — only what was there before', Object.keys(occStored()).join(', '));
  {
    for (const b of buttons(/Add new entry$/)) await click(b);
    await click(buttons(/^Next$/)[0]);
    const scr = () => [...win.document.querySelectorAll('[role=dialog]')].find(d => /New Venue Shops/.test(d.textContent));
    const card = name => [...scr().querySelectorAll('div')].find(d => d.firstChild && d.firstChild.textContent === name && d.querySelector('button'));
    await click([...card('Museo Nacional Thyssen-Bornemisza').querySelectorAll('button')].find(x => x.textContent === 'Confirm'));
    ok(JSON.stringify(occStored()) === before12, 'AL-012a:  Confirm on the shop screen stores nothing yet');
    await click([...scr().querySelectorAll('button')].find(b => b.textContent === 'Back'));
    await click(buttons(/^Cancel import$/)[0]);
    ok(!scr() && JSON.stringify(occStored()) === before12, 'AL-012b:  Cancel import: the store is as it was before the Read');
    {
      const want = [...new Set(showFetches.map(c => c.args.urls[0]))];
      const box = win.document.querySelector('textarea').value.split('\n').filter(Boolean);
      ok(want.length === 12 && want.every(u => box.includes(u)) && (store.get('links/pending') || {}).text === box.join('\n'),
        'AL-012c:  Cancel import puts every link read back in the box, and stores it (her decision, 9 Oct)', JSON.stringify(box));
    }
    // The same links again, from the start: every venue is asked about again.
    const box2 = dialog().querySelector('textarea');
    await act(async () => { setter.call(box2, pasted); box2.dispatchEvent(new win.Event('input', { bubbles: true })); });
    await settle();
    calls.length = 0;
    await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Read'));
    await settle(30);
    const ex = buttons(/^Expand all venues$/)[0];
    if (ex) await click(ex);
  }

  // ── AL-008: the new venues' shops, as the finder found them ──────────────
  const fetched = u => calls.some(c => c.kind === 'mcp' && c.tool === 'web_fetch' && c.args.urls[0] === u);
  const searchedFor = re => calls.filter(c => c.kind === 'mcp' && c.tool === 'web_search' && re.test(c.args.search_queries.join(' ')));
  ok(searchedFor(/Courtauld/).length === 1 && searchedFor(/Courtauld/)[0].args.search_queries[0] === 'Courtauld shop exhibition catalogues',
    'AL-008: her own query, "<venue> shop exhibition catalogues", searched once per venue', JSON.stringify(searchedFor(/Courtauld/).map(c => c.args.search_queries)));
  ok(!fetched('https://shop.clevelandart.org/collections/exhibitions') && !fetched('https://shop.courtauld.ac.uk/collections/courtauld-catalogues'),
    'AL-008c:  Courtauld\'s and Cleveland\'s sections proved shelves of books by the search\'s own excerpt — no page opened');
  ok(fetched('https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi'), 'AL-008d:  Mauritshuis: "Catalogi" opened to check, its excerpt being too thin');
  ok(fetched('https://tienda.museothyssen.org/collections.json?limit=250'), 'AL-008e:  Thyssen: the search found only single books, so the shop\'s section list was read');
  ok(fetched('https://diashop.org/dia-publications') && !fetched('https://diashop.org/dia-museum-book-shop/'),
    'AL-008f:  DIA: "DIA Publications", the 1st result of her keyed search (4 Oct), opened to check; "Books & Stationery" never offered');
  ok(searchedFor(/Detroit/).length === 1 && searchedFor(/Detroit/)[0].args.search_queries[1] === 'Detroit Institute of Arts Museum shop books publications',
    'AL-008f2:  the books section\'s own query rides in the same search call — without it Parallel never returned DIA Publications', JSON.stringify(searchedFor(/Detroit/).map(c => c.args.search_queries)));
  {
    const r = await discoverShop('https://diashop.org/', 'dia.org', 'DIA only mixed', []);
    ok(r.shopCatalogues === 'https://diashop.org/dia-publications/' && r.shelfKind === 'publications' && fetched('https://diashop.org/dia-museum-book-shop/'),
      'AL-008j:  a search that finds only "Books & Stationery" (pens, journals, books): never taken — opened, and its books-only "DIA Publications" taken', JSON.stringify(r));
    // Her finding, 6 Oct: DIA files a show's catalogue in the show's own
    // section, not on its shelf. Its whole-shop search is proved on a book
    // the shelf showed — BigCommerce's address, which nothing could name before.
    ok(r.shopSearch === 'https://diashop.org/search.php?search_query=' && r.finder === 3,
      'AL-008k:  DIA: its whole-shop search worked out, proved on a product seen on its own shop', JSON.stringify(r));
    const probe = calls.find(c => c.kind === 'mcp' && c.tool === 'web_fetch' && c.args.urls.length > 1);
    ok(probe && probe.args.urls.length === 8 && probe.args.urls.every(u => u.startsWith('https://diashop.org/')),
      'AL-008k2:  the proof is ONE call: four shop softwares × two books seen, all on DIA\'s own shop', probe && JSON.stringify(probe.args.urls));
  }

  // ── AL-042: Yale — its shop on Touchnet, every page blank unless its address names a page ──
  {
    const PUBS = 'https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true';
    const FRONT = 'https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true';
    const r = await discoverShop('', 'britishart.yale.edu', 'Yale Center for British Art', []);
    ok(r.shop === 'found' && r.shopCatalogues === PUBS && r.shelfKind === 'publications' && fetched('https://britishart.yale.edu/museum-shop'),
      'AL-042: Yale: its Museum Bookshop page is followed to its shop, and the shop\'s Publications section is taken', JSON.stringify(r));
    ok(fetched(FRONT) && fetched(FRONT + '&page=1') && !fetched('https://secure.touchnet.net/'),
      'AL-042a:  the menu is read on the exact page the museum links to, never the payment site\'s root; blank, it is read again with "page=1"');
    ok(fetched(PUBS + '&page=1') && fetched('https://secure.touchnet.net/C20510_ustores/web/product_detail.jsp?PRODUCTID=2564&SINGLESTORE=true&page=1'),
      'AL-042b:  a list of titles without prices is proved books by its first product: one book, with a price (her decision)');
    ok(r.shopHome === FRONT, 'AL-042c:  the shop\'s link is Yale\'s own shop front, not Touchnet\'s site', r.shopHome);
    const w = await discoverShop('', 'worcesterart.org', 'Worcester Art Museum', []);
    ok(w.shop === 'found' && w.shopCatalogues === 'https://the-museum-shop-at-wam.myshopify.com/collections/catalogs' && w.shopHome === 'https://the-museum-shop-at-wam.myshopify.com/',
      'AL-042d:  Worcester\'s shop on another site is found as before', JSON.stringify(w));
  }
  // ── AL-033: Mia — a Shopify shelf whose books the connector cannot see ──
  {
    const r = await discoverShop('', 'new.artsmia.org', 'Minneapolis Institute of Art', []);
    ok(r.shop === 'found' && r.shopCatalogues === 'https://shop.artsmia.org/collections/exhibition-catalogues' && r.shopSearch === 'https://shop.artsmia.org/search?q='
      && fetched('https://shop.artsmia.org/collections/exhibition-catalogues/products.json?limit=8'),
      'AL-033: Mia: its Catalogues shelf shows only a menu, so its own product list decides — books, so it is taken', JSON.stringify(r));
    const s = new Function('React', 'window', 'document', 'localStorage', code + '\n;return shopifyShelfIsBooks;')(React, win, win.document, win.localStorage);
    ok(!s('{"products":[{"id":1,"title":"Tote","product_type":"Bags","variants":[{"price":"20.00"}]},{"id":2,"title":"Mug","product_type":"Home","variants":[{"price":"15.00"}]}]}'),
      'AL-033a:  a product list of bags and mugs is not a books shelf');
  }

  // ── AL-034: Worcester — the museum's Shop page sends visitors to another site ──
  {
    const r = await discoverShop('https://archive.worcesterart.org/visit/shop/', 'archive.worcesterart.org', 'Worcester Art Museum', []);
    ok(r.shop === 'found' && r.shopHome === 'https://the-museum-shop-at-wam.myshopify.com/' && r.shopCatalogues === 'https://the-museum-shop-at-wam.myshopify.com/collections/catalogs',
      'AL-034: Worcester: its Shop page\'s "Shop now" is followed to the shop on another site, and its Catalogs section taken', JSON.stringify(r));
  }

  // ── AL-043: Munich — two houses on one site, each its own venue and shop (her decision) ──
  // Pages and shop searches are proved live (docs/add_by_link.md, "Munich"); this holds the rules.
  {
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const linkVenue = fn('linkVenue'), namesVenue = fn('namesVenue'), own = fn('LINK_VENUES'), order = fn('VENUE_ORDER');
    const A = 'occ-alte-pinakothek', M = 'occ-pinakothek-der-moderne';
    const alte = linkVenue('https://www.pinakothek.de/de/von-turner-bis-van-gogh', { between: ['Meisterwerke der Neuen Pinakothek in der Alten Pinakothek', 'Alte Pinakothek'] });
    const mod = linkVenue('https://www.pinakothek.de/en/exhibition/between-and-beyond', { between: ['INTERSPACES AND TRANSITIONS IN ART SINCE 1960', 'Pinakothek der Moderne | Art'] });
    ok(alte.id === A && alte.line === 'Alte Pinakothek' && mod.id === M && mod.line === 'Pinakothek der Moderne | Art',
      'AL-043: a pinakothek.de show files under the house its page names between title and dates', JSON.stringify([alte, mod]));
    ok(linkVenue('https://www.pinakothek-der-moderne.de/en/exhibitions/dana-schutz-trouble-and-appearance/', { between: [] }).id === M,
      'AL-043a:  a show on the Pinakothek der Moderne\'s own site files under it');
    const none = linkVenue('https://www.pinakothek.de/de/ausstellung/spitzentreffen', { between: ['Museum Brandhorst'] });
    ok(none.id === null && /Munich Alte Pinakothek, Munich der Moderne or Sammlung Schack/.test(none.why), 'AL-043b:  a page naming none of the houses is a line, never a card', JSON.stringify(none));
    const S = 'occ-sammlung-schack';
    const schack = linkVenue('https://www.pinakothek.de/en/exhibition/boecklin-and-schack-a-dialogue-between-artist-and-collector', { between: ['On the 200th Anniversary of Arnold Böcklin’s Birth', 'Sammlung Schack'] });
    ok(schack.id === S && own[S].short === 'Sammlung Schack' && own[S].group === own[A].group && !own[S].shopQueries && !own[S].shopNamed
      && order.indexOf(M) + 1 === order.indexOf(S),
      'AL-043h:  Sammlung Schack files as its own venue under "Munich", named without "Munich", with no shop settings (the finder answers "none"; her decision)', JSON.stringify(schack));
    ok([A, M, S].every(id => own[id].linkRead && own[id].linkRead.capsTitles), 'AL-043i:  titles the Munich houses type in capitals are recased');
    const D = 'occ-gemaeldegalerie-skd-museum', card = id => own[id].card;
    ok(own[D].short === 'Dresden' && card(D) === 'Dresden Gemäldegalerie' && own[D].linkRead.slashDayFirst && own[D].linkRead.titleAfter.test('Active page: Hopper')
      && own[D].linkRead.skip.test('Exhibition Site Zwinger') && !own[D].shopQueries,
      'AL-045:  Dresden: chip "Dresden", cards "Dresden Gemäldegalerie", dates day first, the site line never reaches Claude (her decision)');
    const F = 'occ-staedelmuseum-de';
    ok(fn('occVenueId')('www.staedelmuseum.de') === F && own[F].short === 'Frankfurt' && card(F) === 'Frankfurt Städel' && order.indexOf(D) + 1 === order.indexOf(F),
      'AL-049:  the Städel: chip "Frankfurt" right after Dresden, cards "Frankfurt Städel" (her decision)');
    {
      const before = calls.length, r = await discoverShop('', 'www.staedelmuseum.de', 'Städel Museum', [], F);
      ok(r.shop === 'found' && r.shopCatalogues === 'https://liebieghaus.ticketfritz.de/Shop/Index/staedel-publikationen/43885'
        && own[F].shopUnseen === 'parallel' && calls.length === before,
        'AL-049a:  its shop\'s books section is written in (the finder cannot see its books) and offered for her to confirm, nothing fetched', JSON.stringify(r));
      const head = fn('shopUnreadHead');
      ok(head('parallel') === 'The museum shop contents cannot be seen — Parallel fault' && head('script') === 'The museum shop contents cannot be seen — JS-rendering'
        && head('blocked') === 'The museum shop is blocked', 'AL-049b:  the card\'s three lines for a shop that cannot be read (her wording)');
    }
    ok(own[A].group === own[M].group && own[A].chip === 'Munich' && own[A].short === 'Munich Alte Pinakothek'
      && own[M].short === 'Munich der Moderne' && order.indexOf(A) + 1 === order.indexOf(M),
      'AL-043c:  one chip "Munich", the Alte first; cards "Munich Alte Pinakothek" and "Munich der Moderne"');
    ok(/Museumsshop/.test(own[A].shopQueries[0]) && /Museumsshop/.test(own[M].shopQueries[0]), 'AL-043d:  both shops are searched in German');
    const cedon = 'https://www.museumsshop.cedon.de/Kataloge/';
    ok(namesVenue(cedon + 'Alte-Pinakothek-Muenchen', 'Alte Pinakothek') && !namesVenue(cedon + 'Pinakothek-der-Moderne-Muenchen', 'Alte Pinakothek')
      && namesVenue(cedon + 'Pinakothek-der-Moderne-Muenchen', 'Pinakothek der Moderne') && !namesVenue(cedon + 'Alte-Pinakothek-Muenchen', 'Pinakothek der Moderne'),
      'AL-043e:  CEDON\'s section named for the house is its shop; the other house\'s section is not');
    ok(!namesVenue('https://www.amazon.de/Alte-Pinakothek-Muenchen/dp/1', 'Alte Pinakothek') && !namesVenue(cedon + 'Alte-Pinakothek-Muenchen', undefined),
      'AL-043f:  only a shop site counts, and only for a venue that names its section');
    const chips = [...win.document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => /^Munich/.test(t));
    ok(chips.join() === 'Munich', 'AL-043g:  the chip row draws one "Munich" chip for both', JSON.stringify(chips));
  }

  // ── AL-044: a shop's search proved where the old rules found no book (her decision) ──
  // Live replies, saved untrimmed: docs/link_pages/shop_search/search_proof_live.json.
  {
    const LIVE = JSON.parse(fs.readFileSync(path.join(PAGES, 'shop_search', 'search_proof_live.json'), 'utf8')).pages;
    const asked = [];
    const own = { claude: { use: async n => n === 'mcp' ? { callTool: async (s, t, a) => { asked.push(a.urls.length);
      return { payload: { results: a.urls.filter(u => LIVE[u] !== undefined).map(u => ({ url: u, title: '', full_content: LIVE[u] })), errors: [] } }; } } : null } };
    const A = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {booksSeenOn, proveShopSearch};')(React, own, win.document, win.localStorage);
    const labels = (u, h) => A.booksSeenOn(LIVE[u], h).map(b => b.label);
    const berlin = labels('https://www.smb-webshop.de/buecher-und-medien/ausstellungskataloge/', 'www.smb-webshop.de');
    ok(berlin[0] === 'Saâdane Afif: Five Preludes' && !berlin.includes('Merkzettel'),
      'AL-044: Berlin: a book whose price sits lines below its title is taken; the wishlist link beside the empty basket\'s "0,00 €" is not', JSON.stringify(berlin.slice(0, 3)));
    const cedon = labels('https://www.museumsshop.cedon.de/Kataloge/Pinakothek-der-Moderne-Muenchen', 'www.museumsshop.cedon.de');
    ok(cedon[0] === '25 + Highlights', 'AL-044a:  CEDON: title, description, then "Regulärer Preis" — the title is the book', JSON.stringify(cedon.slice(0, 2)));
    const cle = labels('https://shop.clevelandart.org/collections/exhibitions', 'shop.clevelandart.org');
    ok(!cle.includes('Reset') && cle[0] === 'The Jazz Age: American Style in the 1920s', 'AL-044b:  a filter\'s "Reset" beside a price is not a book', JSON.stringify(cle.slice(0, 2)));
    const b = await A.proveShopSearch(LIVE['https://www.smb-webshop.de/buecher-und-medien/ausstellungskataloge/'], 'https://www.smb-webshop.de/');
    ok(b === 'https://www.smb-webshop.de/search?sSearch=', 'AL-044c:  Berlin\'s search proved at "search?sSearch=" (Shopware), its home page at "?post_type=product&s=" turned down', b);
    asked.length = 0;
    const m = await A.proveShopSearch(LIVE['https://www.museumsshop.cedon.de/Kataloge/Pinakothek-der-Moderne-Muenchen'], 'https://www.museumsshop.cedon.de/');
    ok(m === 'https://www.museumsshop.cedon.de/search?search=', 'AL-044d:  CEDON\'s search proved at "search?search="; "search?q=", the same page whatever is asked, turned down', m);
    const front = labels('https://www.smb-webshop.de/', 'www.smb-webshop.de');
    ok(front[0] === 'Göttinnen und Gattinnen. Frauen im antiken Mythos', 'AL-044f:  a title cut short on the page ("Frauen...") takes the book\'s full title', JSON.stringify(front[0]));
    ok(asked.join() === '8,4', 'AL-044e:  today\'s call unchanged (four searches); the Shopware two only in a second call when it proves nothing', asked.join());
  }

  // ── AL-009: the shop screen, between the review and the ledger ───────────
  ok(!/Confirm|Wrong shop|Look again/.test(dialog() ? dialog().textContent : ''), 'AL-009: the import pop-up asks nothing about shops');
  // A venue is asked about only with a card going in (her decision; AL-046): the RA's
  // one card rejected keeps it off the screen; added back, it is asked.
  // The RA's own card: the highest box holding only that card's three buttons. (7 Oct:
  // the old climb stopped at a box of several cards and pressed Manet & Morisot's Reject.)
  const boxOf = b => { let el = b.parentElement; while (el.parentElement && el.parentElement.querySelectorAll('button').length <= 3) el = el.parentElement; return el; };
  const raCard = () => buttons(/Add new entry$/).map(boxOf).find(el => el && /Peggy Guggenheim/.test(el.textContent));
  const raPress = async re => click([...raCard().querySelectorAll('button')].find(b => re.test(b.textContent.trim())));
  {
    const adds = buttons(/Add new entry$/);
    for (const b of adds) await click(b);
    await raPress(/Reject$/);
  }
  const ledgerCards = () => win.document.querySelectorAll('article').length;
  const cardsBefore = ledgerCards();
  ok(buttons(/^Next$/).length === 1 && !buttons(/^Go ahead and update the ledger$/).length, 'AL-009a:  every card decided, the review\'s last button reads "Next"');
  await click(buttons(/^Next$/)[0]);
  const shops = () => [...win.document.querySelectorAll('[role=dialog]')].find(d => /New Venue Shops/.test(d.textContent));
  ok(!!shops() && ledgerCards() === cardsBefore, 'AL-009b:  "Next" opens the shop screen; the ledger has not moved');
  const shopCard = name => [...shops().querySelectorAll('div')].find(d => d.firstChild && d.firstChild.textContent === name && d.querySelector('button'));
  const press = async (name, label) => { const c = shopCard(name); const b = c && [...c.querySelectorAll('button')].find(x => x.textContent === label); if (b) await click(b); return !!b; };
  const footer = () => [...shops().querySelectorAll('button')].pop().textContent;
  ok(footer() === '5 still to decide' && !shopCard('Royal Academy of Arts'), 'AL-009c:  five venues to answer — not the RA, its one card rejected — and the ledger button says so', footer());
  ok(shops().textContent.includes('Check and approve each shop link.'), 'AL-009c2:  her heading and line');
  {
    const has = (name, u) => shopCard(name).textContent.includes(u);
    ok(has('Courtauld', 'https://shop.courtauld.ac.uk/collections/courtauld-catalogues')
       && has('Cleveland Museum of Art', 'https://shop.clevelandart.org/collections/exhibitions')
       && has('Mauritshuis', 'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi')
       && has('Museo Nacional Thyssen-Bornemisza', 'https://tienda.museothyssen.org/en/collections/publicaciones-museo'),
      'AL-009c3:  each card shows the section the finder took: Courtauld\'s catalogues (not the reseller\'s shelf), Cleveland\'s 4th result "Exhibition Catalogues", Mauritshuis\'s "Catalogi", Thyssen\'s menu "Museum publications"');
  }
  await click([...shops().querySelectorAll('button')].find(b => b.textContent === 'Back'));
  await raPress(/Add new entry$/);
  await click(buttons(/^Next$/)[0]);
  ok(footer() === '6 still to decide' && !!shopCard('Royal Academy of Arts'), 'AL-009c4:  the RA\'s card added back, the RA is asked too', footer());
  {
    const order = name => [...shopCard(name).querySelectorAll('button')].map(b => b.textContent).join('|');
    const conf = [...shopCard('Royal Academy of Arts').querySelectorAll('button')].find(b => b.textContent === 'Confirm');
    ok(shopCard('Royal Academy of Arts').textContent.includes('No museum shop found.') && order('Royal Academy of Arts') === 'Confirm|Look again|No shop'
       && conf.disabled && order('Courtauld') === 'Confirm|Look again|No shop',
      'AL-009d:  the same three buttons in the same places on every card; Confirm greyed where nothing was found', order('Royal Academy of Arts'));
  }
  ok(shopCard('Detroit').textContent.includes('https://diashop.org/dia-publications'), 'AL-009e0:  DIA\'s section shown, to confirm');
  // DIA Publications turned down: "Books & Stationery" is mixed, so it is only
  // looked inside — and holds no other books-only section.
  calls.length = 0;
  await press('Detroit', 'Look again'); await settle(10);
  ok(shopCard('Detroit').textContent.includes('Shop found, but not its books section: https://diashop.org/')
     && !shopCard('Detroit').textContent.includes('dia-museum-book-shop') && fetched('https://diashop.org/dia-museum-book-shop/'),
    'AL-009e:  Look again never offers a mixed books-and-stationery section; with nothing books-only left it says so and links the shop', shopCard('Detroit').textContent);
  await press('Museo Nacional Thyssen-Bornemisza', 'Confirm');
  ok(/^✓ Confirm$/.test([...shopCard('Museo Nacional Thyssen-Bornemisza').querySelectorAll('button')][0].textContent), 'AL-009f0:  Confirm ticks, as "Add new entry" does');
  ok(!(occStored()['occ-museothyssen-org'] || {}).confirmed && footer() === '5 still to decide',
    'AL-009f:  Confirm counts at once — one fewer to decide — but is not stored yet', footer());
  calls.length = 0;
  await press('Mauritshuis', 'Look again');
  await settle(10);
  ok(calls.some(c => c.tool === 'web_search') && shopCard('Mauritshuis').textContent.includes('https://shop.mauritshuis.nl/product-categorie/boeken-catalogi')
     && !shopCard('Mauritshuis').textContent.includes('/catalogi/catalogi') && !/✓/.test(shopCard('Mauritshuis').textContent),
    'AL-009g:  Look again searches on the spot and skips only the page turned down — the same shop\'s other section offered, to confirm', shopCard('Mauritshuis').textContent);
  await click([...shops().querySelectorAll('button')].find(b => b.textContent === 'Back'));
  ok(!shops() && buttons(/^Next$/).length === 1, 'AL-009i:  Back returns to the review, decisions kept');
  await click(buttons(/^Next$/)[0]);
  ok(/^✓ Confirm$/.test([...shopCard('Museo Nacional Thyssen-Bornemisza').querySelectorAll('button')][0].textContent) && footer() === '5 still to decide',
    'AL-009i2:  and the shop answers given before Back are still there', footer());
  await press('Royal Academy of Arts', 'No shop');
  ok(/^✓ No shop$/.test([...shopCard('Royal Academy of Arts').querySelectorAll('button')][2].textContent), 'AL-009j:  No shop is an answer');
  await press('Detroit', 'No shop');
  await press('Courtauld', 'Confirm'); await press('Cleveland Museum of Art', 'Confirm'); await press('Mauritshuis', 'Confirm');
  // The RA's card rejected again: off the screen; its answer, given, is kept (Back keeps answers).
  await click([...shops().querySelectorAll('button')].find(b => b.textContent === 'Back'));
  await raPress(/Reject$/);
  await click(buttons(/^Next$/)[0]);
  ok(!shopCard('Royal Academy of Arts'), 'AL-009j2:  the RA\'s card rejected again, the RA leaves the screen');
  ok(footer() === 'Go ahead and update the ledger', 'AL-009k:  every shop answered, the ledger may move', footer());
  await click([...shops().querySelectorAll('button')].pop());
  ok(!shops() && ledgerCards() > cardsBefore, 'AL-009l:  and does');
  ok((store.get('links/pending') || {}).text === REFUSED + '\n' + EMPTY + '\n' + urlOf('ra_guggenheim'), 'AL-007d:  the import finished, the two unread links are stored, so closing the page loses nothing', JSON.stringify(store.get('links/pending')));
  {
    const v = id => occStored()[id] || {};
    ok(Object.keys(occStored()).length === 6 && Object.values(occStored()).every(x => x.confirmed === true),
      'AL-009m:  only now are the six venues and her answers stored', JSON.stringify(Object.values(occStored()).map(x => [x.id, x.shop, x.confirmed])));
    ok(v('occ-courtauld-ac-uk').shelfKind === 'catalogues' && v('occ-clevelandart-org').shopSearch === 'https://shop.clevelandart.org/search?q='
       && v('occ-museothyssen-org').shelfKind === 'publications' && v('occ-mauritshuis-nl').shopCatalogues === 'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi'
       && v('occ-mauritshuis-nl').turnedDown.includes('https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi'),
      'AL-009n:  stored as answered: the section, its kind, the shop\'s search, the pages turned down', JSON.stringify([v('occ-courtauld-ac-uk'), v('occ-mauritshuis-nl')]));
    ok(v('occ-royalacademy-org-uk').shop === 'none' && v('occ-dia-org').shop === 'none', 'AL-009o:  No shop stored: their lookups go to the web');
    ok(v('occ-museothyssen-org').english === false && v('occ-dia-org').english === true && v('occ-courtauld-ac-uk').name === 'Courtauld',
      'AL-009p:  English-speaking or not, and the name from the page title, stored with them');
  }

  // ── AL-010: accepted, they file under their venues and the one chip ─────
  ok(!!dialog() && /Links/.test(dialog().textContent), 'AL-010z:  two links could not be read, so the import pop-up waits under it');
  await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Cancel'));
  const chip = buttons(/^Occasional$/)[0];
  ok(!!chip, 'AL-010: an "Occasional" chip sits with the venue chips');
  await click(chip);
  const arts = [...win.document.querySelectorAll('article')];
  ok(arts.length === 9, 'AL-010a:  pressed, it shows the nine occasional shows accepted (the RA one rejected) and nothing else', arts.length);
  const cle = arts.find(a => a.textContent.includes('Filippino Lippi'));
  ok(cle && /^Cleveland Museum of Art/.test(cle.textContent), 'AL-010b:  each card is headed by its venue', cle && cle.textContent.slice(0, 60));

  const dia = arts.find(a => a.textContent.includes('Caravaggio'));
  ok(dia && /^Detroit/.test(dia.textContent) && !/^Detroit Institute/.test(dia.textContent), 'AL-011: a venue\'s short name, hers, heads its cards', dia && dia.textContent.slice(0, 40));
  ok((((store.get('venues/occasional') || {}).venues || {})['occ-dia-org'] || {}).short === 'Detroit', 'AL-011a:   and survives its shop being looked for again');
  ok(!arts.some(a => a.textContent.includes('NGA Chip Show')), 'AL-030: NGA: an NGA show is not in the Occasional pile');
  await click(chip);
  const nga = buttons(/^NG Washington$/)[0];
  ok(!!nga, 'AL-030a:  NGA has a chip of its own, "NG Washington"');
  if (nga) {
    await click(nga);
    const shown = [...win.document.querySelectorAll('article')];
    ok(shown.length === 1 && /^NG Washington/.test(shown[0].textContent) && shown[0].textContent.includes('NGA Chip Show'),
      'AL-030b:  pressed, it shows the NGA show alone, its card headed "NG Washington"', shown.map(a => a.textContent.slice(0, 40)));
    await click(nga);
  }
  // ── AL-039: Yale Center for British Art — its own chip and cards, "Yale CBA" (her decision) ─
  ok(!arts.some(a => a.textContent.includes('Yale Chip Show')), 'AL-039: Yale CBA: a Yale show is not in the Occasional pile');
  const ycba = buttons(/^Yale CBA$/)[0];
  ok(!!ycba, 'AL-039a:  Yale has a chip of its own, "Yale CBA"');
  if (ycba) {
    await click(ycba);
    const shown = [...win.document.querySelectorAll('article')];
    ok(shown.length === 1 && /^Yale CBA/.test(shown[0].textContent) && shown[0].textContent.includes('Yale Chip Show'),
      'AL-039b:  pressed, it shows the Yale show alone, its card headed "Yale CBA"', shown.map(a => a.textContent.slice(0, 40)));
    await click(ycba);
  }
  // ── AL-020: a rejected card's link goes back in the box (her ask, 7 Oct) ─
  {
    await click(importBtn());
    if (!dialog().querySelector('textarea')) await click(inDialog('Links'));
    const box3 = dialog().querySelector('textarea');
    ok(box3.value === REFUSED + '\n' + EMPTY + '\n' + urlOf('ra_guggenheim'), 'AL-020: the RA card was rejected: its link is back in the box with the two unread, and nothing accepted is', JSON.stringify(box3.value));
    const clear = inDialog('Clear');
    ok(!!clear && box3.parentElement.contains(clear), 'AL-020a:  a "Clear" sits inside the box');
    if (clear) await click(clear);
    ok(dialog().querySelector('textarea').value === '' && (store.get('links/pending') || {}).text === '',
      'AL-020b:  pressed, the box is empty and stays empty — the store emptied too', JSON.stringify(store.get('links/pending')));
    ok(!inDialog('Clear'), 'AL-020c:  and with nothing in the box, no Clear');
    await act(async () => { setter.call(dialog().querySelector('textarea'), REFUSED + '\n' + EMPTY); dialog().querySelector('textarea').dispatchEvent(new win.Event('input', { bubbles: true })); });
    await settle();
    await click(inDialog('Cancel'));
  }
  // ── AL-035: Cancel during a Read stops it; nothing kept, every link left in the box ─
  {
    await click(importBtn());
    if (!dialog().querySelector('textarea')) await click(inDialog('Links'));
    const three = HELD + '\n' + REFUSED + '\n' + EMPTY;
    await act(async () => { setter.call(dialog().querySelector('textarea'), three); dialog().querySelector('textarea').dispatchEvent(new win.Event('input', { bubbles: true })); });
    await settle();
    const before = calls.length;
    await click(inDialog('Read'));
    const cancel = inDialog('Cancel');
    ok(!!cancel && !cancel.disabled, 'AL-035: while links are being read, Cancel can be pressed');
    if (cancel) await click(cancel);
    release();
    await settle(10);
    const after = calls.slice(before).filter(c => c.kind === 'mcp' && c.tool === 'web_fetch').map(c => c.args.urls[0]);
    ok(!dialog() && !/proposed change/.test(win.document.body.textContent) && !after.includes(REFUSED) && !after.includes(EMPTY),
      'AL-035a:  it stops after the link in hand: no more pages read, no review, the pop-up closed', JSON.stringify(after));
    await click(importBtn());
    if (!dialog().querySelector('textarea')) await click(inDialog('Links'));
    ok(dialog().querySelector('textarea').value === three, 'AL-035b:  and every link is still in the box', JSON.stringify(dialog().querySelector('textarea').value));
    await act(async () => { setter.call(dialog().querySelector('textarea'), REFUSED + '\n' + EMPTY); dialog().querySelector('textarea').dispatchEvent(new win.Event('input', { bubbles: true })); });
    await settle();
    await click(inDialog('Cancel'));
  }
  // ── AL-013: a CSV import keeps nothing until it finishes either ─────────
  {
    const csv = 'venue_code,title,start_date,end_date,summary,url,notes,swept_at\n'
      + 'met,A Show Never Seen,2026-11-01,2027-02-01,A test row.,https://www.metmuseum.org/exhibitions/a-show-never-seen,,2026-10-03T00:00:00.000Z\n';
    const feed = async () => {
      const input = win.document.querySelector('input[type=file][accept=".csv,text/csv"]');
      Object.defineProperty(input, 'files', { value: [new win.File([csv], 'sweep.csv', { type: 'text/csv' })], configurable: true });
      await act(async () => { input.dispatchEvent(new win.Event('change', { bubbles: true })); });
      await settle(10);
    };
    await feed();
    ok(buttons(/Add new entry$/).length === 1 && !store.has('sweeps/venues'), 'AL-013: a CSV read: its card shown, the sweep log not stored yet');
    await click(buttons(/^Cancel import$/)[0]);
    ok(!store.has('sweeps/venues'), 'AL-013a:  Cancel import: the sweep log still not stored');
    await feed();
    await click(buttons(/Add new entry$/)[0]);
    await click(buttons(/^Go ahead and update the ledger$/)[0]);
    ok(!!((store.get('sweeps/venues') || {}).venues || {}).met, 'AL-013b:  the import finished: the sweep log stored', JSON.stringify(store.get('sweeps/venues')));
  }
  // ── AL-014: a venue met before searches were proved gets one ────────────
  // Her store as it stood 6 Oct: Detroit confirmed on 4 Oct with its shelf and
  // NO search, so "Georgia O'Keeffe: Architecture" — filed in the show's own
  // section, not on the shelf — was missed. Its first lookup works the search
  // out from the shelf, stores it, and searches the whole shop.
  {
    await act(async () => { root.unmount(); });
    store.set('venues/occasional', { venues: { 'occ-dia-org': { id: 'occ-dia-org', name: 'Detroit Institute of Arts Museum', short: 'Detroit',
      host: 'www.dia.org', english: true, shop: 'found', confirmed: true, finder: 2, shelfKind: 'publications',
      shopHome: 'https://diashop.org/', shopCatalogues: 'https://diashop.org/dia-publications/', shopSearch: null,
      turnedDown: [], addedAt: '2026-10-04T00:00:00.000Z' } } });
    const okeeffe = { ...ledger.rows[0], id: 'occ-dia-org-okeeffe', museumId: 'occ-dia-org', title: 'Georgia O’Keeffe: Architecture',
      startDate: '2026-09-11', endDate: '2027-01-03', exUrl: urlOf('dia_okeeffe'), acquiring: 'yes', looked: true, hasCatalogue: 'no' };
    const root2 = createRoot(win.document.getElementById('root'));
    await act(async () => { root2.render(React.createElement(App)); });
    await settle();
    const input2 = win.document.querySelector('input[type=file][accept=".json"]');
    Object.defineProperty(input2, 'files', { value: [new win.File([JSON.stringify({ ...ledger, rows: [okeeffe] })], 'ledger.json', { type: 'application/json' })], configurable: true });
    await act(async () => { input2.dispatchEvent(new win.Event('change', { bubbles: true })); });
    await settle();
    calls.length = 0;
    const drawer = buttons(/Catalogue$/)[0];
    if (drawer) await click(drawer);
    const again = buttons(/^Search again$/)[0];
    ok(!!again, 'AL-014: the O\'Keeffe card, looked up before, offers Search again');
    if (again) { await click(again); await settle(20); }
    const dia = ((store.get('venues/occasional') || {}).venues || {})['occ-dia-org'] || {};
    ok(dia.shopSearch === 'https://diashop.org/search.php?search_query=' && dia.finder === 3 && dia.short === 'Detroit' && dia.confirmed === true,
      'AL-014a:  its search worked out from its own shelf and stored; her name and her Confirm kept', JSON.stringify(dia));
    const shopCall = calls.find(c => c.kind === 'mcp' && c.tool === 'web_fetch' && c.args.urls.includes('https://diashop.org/dia-publications/?page=2'));
    ok(shopCall && shopCall.args.urls.includes("https://diashop.org/search.php?search_query=Georgia%20O'Keeffe%3A%20Architecture"),
      'AL-014b:  the lookup reads the shelf AND searches the whole shop, the curly apostrophe straightened', shopCall && JSON.stringify(shopCall.args.urls));
    calls.length = 0;
    if (!buttons(/^Search again$/)[0] && buttons(/Catalogue$/)[0]) await click(buttons(/Catalogue$/)[0]);
    ok(!!buttons(/^Search again$/)[0], 'AL-014c0:  Search again still offered');
    if (buttons(/^Search again$/)[0]) { await click(buttons(/^Search again$/)[0]); await settle(20); }
    ok(!calls.some(c => c.kind === 'mcp' && c.tool === 'web_fetch' && c.args.urls.length === 8),
      'AL-014c:  worked out once: the next lookup does not prove it again');
  }
  // ── AL-018: one shop look per venue in a Read — and none at her 28 ──────
  // 7 Oct: seven Jacquemart-André links, seven looks for a shop the app knew.
  {
    const jq = ['fra-angelico', 'canaletto-guardi-0', 'watteau-fragonard', 'hammershoi', 'turner', 'botticelli', 'giovanni-bellini']
      .map(s => 'https://www.musee-jacquemart-andre.com/en/' + s);
    const ra2 = 'https://www.royalacademy.org.uk/exhibition/another-show';
    for (const u of jq) P[u] = { ...page('jacquemart_watteau'), url: u };
    P[ra2] = { ...P[urlOf('ra_guggenheim')], url: ra2 };
    store.delete('venues/occasional');   // the RA unmet: its shop not found, twice over
    await click(importBtn());
    await click(inDialog('Links'));
    const box2 = dialog().querySelector('textarea');
    await act(async () => { setter.call(box2, jq.join('\n') + '\n' + urlOf('ra_guggenheim') + '\n' + ra2); box2.dispatchEvent(new win.Event('input', { bubbles: true })); });
    await settle();
    calls.length = 0;
    await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Read'));
    await settle(30);
    const shopSearches = calls.filter(c => c.kind === 'mcp' && c.tool === 'web_search');
    ok(!shopSearches.some(c => /Jacquemart/i.test(c.args.search_queries.join(' '))), 'AL-018: seven Jacquemart-André links: no shop looked for — it is one of her 28', JSON.stringify(shopSearches.map(c => c.args.search_queries)));
    const ra = shopSearches.filter(c => /Royal Academy/i.test(c.args.search_queries.join(' ')));
    ok(ra.length === 2 && /shop exhibition catalogues/.test(ra[0].args.search_queries[0]) && /online shop/.test(ra[1].args.search_queries[0]),
      'AL-018a:  two links from a new venue whose shop is not found: looked for ONCE (its search, then one for the shop itself)', JSON.stringify(ra.map(c => c.args.search_queries[0])));
    const jqCards = [...win.document.querySelectorAll('button')].filter(b => /^Add new entry$/.test(b.textContent.trim())).length;
    ok(jqCards === 9, 'AL-018b:  and all nine links come to a card', jqCards);
    // ── AL-021: Jacquemart-André's subtitle is read by code (7 Oct, Botticelli) ─
    // Claude is scripted to give NO subtitle for these pages; the title must
    // still carry the line under the heading.
    const titled = [...win.document.querySelectorAll('div')].filter(d => d.textContent === 'From Watteau to Fragonard: les fêtes galantes').length;
    ok(titled === 7, 'AL-021: seven Jacquemart-André cards titled with the line under the heading, Claude giving none', titled);
    // ── AL-024: a partial apply puts the rejected AND the undecided links back in the box (her decision, 9 Oct) ─
    const cardOf = b => { let el = b.parentElement; while (el.parentElement && el.parentElement.querySelectorAll('button').length <= 3) el = el.parentElement; return el; };
    const addBtns = buttons(/^Add new entry$/);
    await click(addBtns[0]);
    await click([...cardOf(buttons(/^Add new entry$/)[1]).querySelectorAll('button')].find(b => /Reject$/.test(b.textContent.trim())));
    const before24 = ledgerCards();
    await click(buttons(/^Update with the 1 I.ve decided$/)[0]);
    await click(buttons(/^Continue$/)[0]);
    const scr = () => [...win.document.querySelectorAll('[role=dialog]')].find(d => /New Venue Shops/.test(d.textContent));
    if (scr()) {
      for (const b of [...scr().querySelectorAll('button')].filter(b => b.textContent === 'No shop')) await click(b);
      await click([...scr().querySelectorAll('button')].pop());
    }
    const kept = ((store.get('links/pending') || {}).text || '').split('\n').filter(Boolean);
    ok(ledgerCards() === before24 + 1 && kept.length === 8,
      'AL-024: one accepted, one rejected, seven undecided: the ledger gains one, the box keeps the other eight links', JSON.stringify(kept));
  }
  // ── AL-052c: her Enfilade link, read: filed under the Queen's Gallery, never the blog ─
  {
    const enf = JSON.parse(fs.readFileSync(path.join(PAGES, 'elsewhere', 'enfilade_canaletto.json'), 'utf8'));
    const pasted = enf.url + '?utm_source=chatgpt.com';
    P[pasted] = { ...enf, url: pasted }; P[enf.url] = enf;
    await click(importBtn());
    if (!dialog().querySelector('textarea')) await click(inDialog('Links'));
    const box = dialog().querySelector('textarea');
    await act(async () => { setter.call(box, pasted); box.dispatchEvent(new win.Event('input', { bubbles: true })); });
    await settle();
    calls.length = 0;
    await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Read'));
    await settle(30);
    const asked = calls.find(c => c.kind === 'sample'), samples = calls.filter(c => c.kind === 'sample');
    ok(asked && /venueOwnPage/.test(asked.prompt) && /Buckingham Palace, London, 19 May/.test(asked.prompt),
      'AL-052c: a site never seen: Claude is asked which venue held the show, given the date line read');
    ok(samples.length === 2 && /published by someone other than the museum/.test(samples[1].prompt), 'AL-052c2: told it is someone else\'s page, Claude is asked once more (site and title)', samples.length);
    const text = win.document.body.textContent;
    ok(/The Queen\u2019s Gallery, Buckingham Palace/.test(text) && !/Enfilade/.test(text.replace(/enfilade18thc/g, '')),
      'AL-052d:  the card files under "The Queen\u2019s Gallery, Buckingham Palace", never "Enfilade"');
    ok([...win.document.querySelectorAll('div')].some(d => d.textContent === 'Canaletto and the Art of Venice') && !/utm_source/.test(text),
      'AL-052e:  titled "Canaletto and the Art of Venice"; the link without its tracking tail');
    const shopAsk = calls.filter(c => c.kind === 'mcp' && c.tool === 'web_search').map(c => c.args.search_queries.join(' '));
    ok(shopAsk.length >= 1 && shopAsk.every(q => /Queen\u2019s Gallery/.test(q)), 'AL-052f:  the shop looked for is the Queen\u2019s Gallery\'s, not the blog\'s', JSON.stringify(shopAsk));
    const cancel = buttons(/^Cancel import$/)[0];
    if (cancel) await click(cancel);
  }
  // ── AL-053: a museum never met: Claude names it, once (her decision) ─
  // Shaped as the live page (kmska.be/en/magritte-la-ligne-de-vie): its tab title names no museum.
  {
    const body = '\n\n15 Nov 2025 \u2013 22 Feb 2026\n\nIn 1938, Ren\u00e9 Magritte gave a lecture at the KMSKA on his vision of reality. There, he discussed the origins and development of his art, as well as the history of the Surrealist movement in Belgium. The exhibition is a collaboration between the KMSKA and the Fondation Ren\u00e9 Magritte. Titled La ligne de vie, this lecture would become the most important Magritte ever gave about his own work.';
    const K1 = 'https://kmska.be/en/magritte-la-ligne-de-vie', K2 = 'https://kmska.be/en/folly-beyond-words-bruegel-and-proverbs-in-art';
    P[K1] = { url: K1, title: 'Magritte. La ligne de vie ', full_content: '# **Magritte** . La ligne de vie' + body };
    P[K2] = { url: K2, title: 'Folly Beyond Words. Bruegel and Proverbs in Art', full_content: '# Folly Beyond Words. Bruegel and Proverbs in Art' + body };
    await click(importBtn());
    if (!dialog().querySelector('textarea')) await click(inDialog('Links'));
    const box = dialog().querySelector('textarea');
    await act(async () => { setter.call(box, K1 + '\n' + K2); box.dispatchEvent(new win.Event('input', { bubbles: true })); });
    await settle();
    calls.length = 0;
    await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Read'));
    await settle(30);
    const asked = calls.filter(c => c.kind === 'sample').map(c => /"venueShort"/.test(c.prompt));
    ok(asked.length === 2 && asked[0] && !asked[1], 'AL-053:  a museum never met: Claude is asked its name on the first link only; its own page asks nothing more', JSON.stringify(asked));
    const first = calls.find(c => c.kind === 'sample');
    ok(first && /"Boston MFA"/.test(first.prompt) && /"Frankfurt St\u00e4del"/.test(first.prompt), 'AL-053a:  her names for venues are the style for the short name');
    const text = win.document.body.textContent;
    ok(/Antwerp Fine Arts/.test(text) && !/Antwerp KMSKA/.test(text) && !/kmska\.be\s*\u00b7/.test(text), 'AL-053b:  its cards are headed by her name, "Antwerp Fine Arts", over Claude\'s "Antwerp KMSKA" — never its address', text.slice(text.indexOf('KMSKA') - 60, text.indexOf('KMSKA') + 20));
    const shopAsk = calls.filter(c => c.kind === 'mcp' && c.tool === 'web_search').map(c => c.args.search_queries.join(' '));
    ok(shopAsk.length >= 1 && /^Koninklijk Museum voor Schone Kunsten Antwerpen KMSKA Belgium shop/.test(shopAsk[0]), 'AL-053c:  its shop is searched under its full name (her entry\'s), other names, city and country (her decision; proved live)', JSON.stringify(shopAsk));
    const cancel = buttons(/^Cancel import$/)[0];
    if (cancel) await click(cancel);
    const sn = new Function('React', 'window', 'document', 'localStorage', code + '\n;return venueSearchName;')(React, win, win.document, win.localStorage);
    ok(sn('occ-x', { name: 'National Gallery', city: 'London', country: 'United Kingdom' }) === 'National Gallery London United Kingdom'
      && sn('occ-x', { name: 'Palazzo Reale Milano', city: 'Milan', country: 'Italy' }) === 'Palazzo Reale Milano Italy'
      && sn('occ-museitoscana-cultura-gov-it', { name: 'Direzione regionale Musei nazionali Toscana', city: 'Florence', country: 'Italy' }) === 'Museo di San Marco Florence Italy',
      'AL-053e:  the search name is long: full name, then city and country where the name lacks them; San Marco by her full name');
    const nf = new Function('React', 'window', 'document', 'localStorage', code + '\n;return needsFacts;')(React, win, win.document, win.localStorage);
    ok(nf(undefined) && nf({ name: 'Detroit Institute of Arts Museum', short: 'Detroit', host: 'dia.org' }) && !nf({ name: 'Detroit Institute of Arts Museum', short: 'Detroit', host: 'dia.org', city: 'Detroit' }),
      'AL-053f:  a venue Claude has not yet placed (no city) is asked on its next link; once placed, never again');
    // ── AL-054 to AL-058: the shared reader's rules, on shapes copied from live replies ─
    const rd = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {readShowPage,cardTitle,splitPageTitle};')(React, win, win.document, win.localStorage);
    const fill = '\n\n' + 'The exhibition brings together paintings, drawings and documents from collections across Europe and America. '.repeat(5);
    const vgm = rd.readShowPage({ title: 'Exhibition Vincent’s Path to Fame - Van Gogh Museum', full_content: '# Exhibition Vincent’s Path to Fame\n\nHow did Vincent van Gogh become a world-famous artist? This exhibition explores the vital role his family played. From 12 June 2026.\n\nAll exhibitions\n\n* Exhibition Vincent’s Path to Fame\n* From 12 June 2026\n* Until 6 September 2026' + fill }, 'https://www.vangoghmuseum.nl/en/visit/whats-on/exhibitions/vincents-path-to-fame', null);
    ok(vgm.ok && vgm.base === 'Vincent’s Path to Fame' && vgm.start === '2026-06-12' && vgm.end === '2026-09-06',
      'AL-054: Van Gogh Museum: a paragraph\'s half date waits for the From/Until lines below; the "Exhibition" label leaves the title', JSON.stringify([vgm.base, vgm.start, vgm.end]));
    const kz = rd.readShowPage({ title: 'Vilhelm Hammershøi Zurich – The Eye That Listens | Kunsthaus Zürich – KUNSTHAUS', full_content: 'Until 25.10.2026\n\n# [Vilhelm Hammershøi](https://www.kunsthaus.ch/en/besuch-planen/ausstellungen/vilhelm-hammershoi/)\n\nThe Eye That Listens\n\n[Buy Tickets](https://tickets.kunsthaus.ch/)' + fill }, 'https://www.kunsthaus.ch/en/besuch-planen/ausstellungen/vilhelm-hammershoi/', null);
    ok(kz.ok && kz.base === 'Vilhelm Hammershøi' && kz.end === '2026-10-25' && kz.between.includes('The Eye That Listens'),
      'AL-055: Kunsthaus: dates just above the heading are read; the subtitle under it is offered to Claude', JSON.stringify([kz.base, kz.end, kz.between]));
    const mfah = rd.readShowPage({ title: 'Frida: The Making of an Icon (January 19–May 17, 2026) | The Museum of Fine Arts, Houston', full_content: '# Frida: The Making of an Icon\n\n**Date** January 19–May 17, 2026' + fill }, 'https://www.mfah.org/art/exhibitions/frida-the-making-of-an-icon', null);
    const phl = rd.readShowPage({ title: 'Van Gogh Sunflowers', full_content: '# Van Gogh’s Sunflowers\n\n## A Symphony in Blue and Yellow\n\n### When\n\nJun 6, 2026 – Oct 11, 2026' + fill }, 'https://www.philamuseum.org/exhibitions/van-gogh-sunflowers', null);
    const pp = rd.readShowPage({ title: 'The Seduction of Color. Andrea Solario and the Renaissance | Poldi Pezzoli Museum', full_content: '# The Seduction of Color\n\n## Andrea Solario and the Renaissance between Italy and France\n\n###### March 26 — June 30, 2025' + fill }, 'https://museopoldipezzoli.it/en/scopri/mostre-ed-eventi/evento/the-seduction-of-color', null);
    const khm = rd.readShowPage({ title: 'Head and Shoulders. Coins in Fashion - KHM.at', full_content: '# Head and Shoulders\n\nMünze zu der Ausstellung Kopf und Kragen\n\ndate\\_range since 11. November 2025' + fill }, 'https://www.khm.at/en/exhibitions/head-and-shoulders-coins-in-fashion', null);
    ok(mfah.base === 'Frida: The Making of an Icon' && phl.base === 'Van Gogh’s Sunflowers'
      && pp.base === 'The Seduction of Color: Andrea Solario and the Renaissance between Italy and France' && khm.base === 'Head and Shoulders. Coins in Fashion',
      'AL-056: the heading is the name; the page title adds only what the page backs (a subtitle on the line under it, or after ". "), never its dates or another spelling', JSON.stringify([mfah.base, phl.base, pp.base, khm.base]));
    const wr = rd.readShowPage({ title: 'Information: Wallraf-Richartz-Museum', full_content: '[BACK](https://www.wallraf.museum/en/exhibitions/now/index.php?id=267&L=1 "BACK")\n\n# [Van Gogh & Co. on tour](https://www.wallraf.museum/en/exhibitions/now/index.php?id=1009 "Details")\n\n## [Masterpieces travel through Japan](https://www.wallraf.museum/en/exhibitions/now/index.php?id=1009 "Details")\n\nInformation\n\nThe tour starts at the Utsunomiya Museum of Art (19 April to 21 June 2026).' + fill }, 'https://www.wallraf.museum/en/exhibitions/now/2026-02-28-japan', null);
    ok(wr.ok && wr.base === 'Van Gogh & Co. on tour',
      'AL-056a:  a page title naming the site and sharing no word with the heading is the site\'s label; the heading stays the name (Wallraf)', JSON.stringify(wr.base));
    const nm = rd.splitPageTitle('Nationalmuseum | Fantasy and Reality – The Art of Johan Tobias Sergel', 'www.nationalmuseum.se');
    ok(nm.show === 'Fantasy and Reality – The Art of Johan Tobias Sergel' && nm.site === 'Nationalmuseum', 'AL-057: a page title with the site first: the part named for the site is the site', JSON.stringify(nm));
    ok(rd.cardTitle('PONTORMO', 'occ-x') === 'Pontormo' && rd.cardTitle('PICASSO – BACON', 'occ-x') === 'Picasso – Bacon' && rd.cardTitle('KAWS', 'occ-x') === 'KAWS'
      && rd.cardTitle('KMSKA x YOUNG FASHION DESIGNERS', 'occ-x') === 'KMSKA x YOUNG FASHION DESIGNERS',
      'AL-058: a title typed wholly in capitals is recased; one short word and a title mixing cases are left alone');
    // ── AL-059: the shop finder's shared words, from the new-museum run ─
    const sf = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {SHOP_PATH,SHOP_WORDS,SHOP_HOST,PRICE,rankShelves,notAShop,foldText};')(React, win, win.document, win.localStorage);
    const prices = t => (sf.foldText(t).match(sf.PRICE) || []).length;
    ok(sf.SHOP_PATH.test('/en/museum/louisiana-butik') && sf.SHOP_PATH.test('/en/kmskashop-and-coffee-bar') && !sf.SHOP_PATH.test('/en/workshops') && !sf.SHOP_PATH.test('/en/restoration')
      && sf.SHOP_WORDS.test('KMSKAShop') && !sf.SHOP_WORDS.test('Workshop') && sf.SHOP_HOST.test('www.kmskashop.be'),
      'AL-059: shop words in other languages and run into a name (Louisiana "butik", "KMSKAShop"), never "workshop"');
    ok(prices('Katalog | Tanzbild EUR 24,90 Katalog | Daumier EUR 34,90') === 2 && prices('CHF 45.00 and CHF 38.00') === 2 && prices('SEK 345') === 1,
      'AL-059a:  prices with the currency code first (Albertina "EUR 24,90") and in francs and crowns count');
    const r = sf.rankShelves([{ url: 'https://shop.albertina.at/de/produkte/publikationen/', words: 'HIER BLÄTTERN de produkte publikationen' },
      { url: 'https://www.biderundtanner.ch/buchhandlung/feminismus-buecher/detail/ISBN-9783832166298/Endler', words: 'Das Patriarchat buecher' }]);
    ok(r.length === 1 && r[0].kind === 'publications' && /publikationen/.test(r[0].url),
      'AL-059b:  a German "Publikationen" section ranks; one book\'s own page never does', JSON.stringify(r.map(x => x.url)));
    ok(sf.notAShop('https://www.petitpalais.paris.fr/sites/default/files/content/images/copie_de_petit_palais_boutique-01.jpg') && sf.notAShop('https://play.google.com/store/apps/details?id=fr.parismusees.petitPalais') && !sf.notAShop('https://shop.kunsthaus.ch/'),
      'AL-059c:  a file or an app store is never the shop');
    // ── AL-063: a shelf found on a later page is kept by its first page ─
    const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
    const fp = fn('firstPageOf');
    ok(fp('https://www.kmskashop.be/en/books/kmska/page2.html') === 'https://www.kmskashop.be/en/books/kmska/'
      && fp('https://shop.example.org/catalogues/page/3/') === 'https://shop.example.org/catalogues/'
      && fp('https://shop.example.org/catalogues?page=2&sort=new') === 'https://shop.example.org/catalogues'
      && fp('https://tienda.museothyssen.org/en/collections/publications?sort_by=best-selling') === 'https://tienda.museothyssen.org/en/collections/publications'
      && fp('https://secure.touchnet.net/C21490_ustores/web/store_cat.jsp?page=1') === 'https://secure.touchnet.net/C21490_ustores/web/store_cat.jsp?page=1'
      && fp('https://diashop.org/dia-publications/') === 'https://diashop.org/dia-publications/',
      'AL-063: a books section the search found on its second page is kept as its first (KMSKA "page2.html"), without its sort order (Thyssen); page 1 and plain addresses untouched');
    const rk = fn('rankShelves')([
      { url: 'https://tienda.museothyssen.org/en/collections/publications', words: 'Catálogos de arte y libros: ediciones especializadas' },
      { url: 'https://tienda.museothyssen.org/en/collections/exhibitions', words: 'Exposiciones: catálogos y guías de muestras de arte' },
      { url: 'https://butik.louisiana.dk/collections/books-in-english', words: 'Books in English' },
      { url: 'https://butik.louisiana.dk/collections/udstillingskataloger', words: 'Udstillingskataloger' },
      { url: 'https://shop.albertina.at/en/products/publications/', words: 'Catalogues & Publications' },
      { url: 'https://shop.example.org/products/the-catalogue-of-a-show', words: 'The catalogue of a show' }]).map(r => r.url);
    ok(rk[0].endsWith('/exhibitions') && rk[1].endsWith('/udstillingskataloger') && rk.includes('https://shop.albertina.at/en/products/publications/') && !rk.some(u => /the-catalogue-of-a-show/.test(u)) && rk[rk.length - 1].endsWith('/books-in-english'),
      'AL-070: an exhibitions\' catalogues section ranks first (Thyssen "Exposiciones"); Danish "udstillingskataloger" is catalogues; a section under "/products/" is one (Albertina), a product never', JSON.stringify(rk));
    // ── AL-064: a show page with no dates anywhere comes in undated, as the sweep keeps it ─
    const rdd = fn('readShowPage');
    const bourgeois = rdd({ title: 'LOUISE BOURGEOIS. L’INCONSCIO DELLA MEMORIA - Galleria Borghese',
      full_content: '# LOUISE BOURGEOIS. L’INCONSCIO DELLA MEMORIA\n\n* * *\n\n' + 'Louise Bourgeois. L’inconscio della memoria è la prima mostra dedicata a un’artista contemporanea donna alla Galleria Borghese. '.repeat(4) },
      'https://galleriaborghese.cultura.gov.it/exhibition/louise-bourgeois-linconscio-della-memoria/', 'borghese');
    ok(bourgeois.ok && bourgeois.start === '' && bourgeois.end === '' && bourgeois.noDates && bourgeois.dateLine === '' && /^Louise Bourgeois\. L’inconscio/.test(bourgeois.raw),
      'AL-064: no dates on the page (Borghese prints them in the poster): read, undated, the text handed to Claude (her decision)', JSON.stringify([bourgeois.ok, bourgeois.why, bourgeois.start, bourgeois.raw && bourgeois.raw.slice(0, 30)]));
    const months = rdd({ title: 'Soutine | Elsewhere', full_content: '# Soutine\n\nseptember 2027 - january 2028\n\n' + 'A show of Soutine’s paintings from collections across Europe and America. '.repeat(8) }, 'https://example.org/soutine', null);
    ok(months.ok && months.start === '' && months.end === '' && months.shown === 'september 2027',
      'AL-064a:  months without days: undated, what the page shows kept for the sweep\'s note — no day is invented (her decision: the sweep\'s rules)', JSON.stringify([months.why, months.shown]));
    const ct = fn('cardTitle');
    ok(ct('TIZIANO. DIALOGHI DI NATURA E DI AMORE', 'borghese') === 'Tiziano — Dialoghi di Natura e di Amore' && ct('TITIAN. DIALOGUES OF NATURE AND LOVE', 'borghese') === 'Titian — Dialogues of Nature and Love',
      'AL-068: a Borghese title by link reads as the sweep writes it: the em dash, ordinary capitals, the Italian "e" small (her decisions)', ct('TIZIANO. DIALOGHI DI NATURA E DI AMORE', 'borghese'));
    // ── AL-065: two dotted dates either side of a bar are a range (the Borghese's archive site) ─
    const corr = rdd({ title: 'Correggio and Antiquity-ENG – Approfondimenti Mostre',
      full_content: '# Correggio and Antiquity\n\n22\\.05.2008 | 14.08.2008\n\n* Exhibition\n* Artworks\n\n## Presentation\n\n' + 'A master of the Emilian Renaissance, Correggio is universally recognised by critics as one of the great protagonists of painting. '.repeat(3) },
      'https://approfondimentimostre.com/en/correggio-e-lantico-eng/', null);
    ok(corr.ok && corr.start === '2008-05-22' && corr.end === '2008-08-14' && corr.base === 'Correggio and Antiquity',
      'AL-065: "22\\.05.2008 | 14.08.2008" read as 22 May to 14 August 2008 (Correggio)', JSON.stringify([corr.base, corr.start, corr.end, corr.why]));
    // ── AL-067: Parallel's 202 is Parallel's fault, not the museum's ─
    const why = fn('pageUnreadWhy');
    ok(why({ error_type: 'network_error', http_status_code: 202 }) === 'The page contents cannot be seen \u2014 Parallel fault. Import the full saved page.'
      && why({ error_type: 'http_error', http_status_code: 403 }) === 'The museum refused the page (403).' && why(null) === 'The page came back empty.',
      'AL-067: a page Parallel answers 202 for says "contents cannot be seen — Parallel fault" (the Borghese\'s archive site serves it to anyone); a 403 is still the museum\'s');
    // ── AL-069: a bot check in place of the page is never a show (the sweep's test, shared) ─
    const anubis = rdd({ title: "Making sure you're not a bot!", full_content: "# Making sure you're not a bot!\n\nLoading...\n\n" + 'You are seeing this because the administrator of this website has set up Anubis to protect the server against the scourge of AI companies aggressively scraping websites. '.repeat(4) },
      'https://www.staatsgalerie.de/en/exhibitions/archive/giorgio-de-chirico', null);
    const cf = rdd({ title: 'Just a moment...', full_content: '# Just a moment...\n\n' + 'Checking your browser before accessing the site. '.repeat(12) }, 'https://example.org/show', null);
    ok(!anubis.ok && anubis.why === 'The venue\u2019s site answered with a bot check instead of the page.' && !cf.ok,
      'AL-069: a bot check in place of the page (Anubis at the Staatsgalerie, Cloudflare) stays unread with the sweep\'s own words — never an undated card', anubis.why);
    // ── AL-066: her renames of Claude's card names are Claude's examples ─
    {
      const box = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {LINK_VENUES,linkPrompt};')(React, win, win.document, win.localStorage);
      const pg = { base: 'Folly Beyond Words', between: [], raw: 'A show about Bruegel and proverbs.', dateLine: '' };
      const before = box.linkPrompt(pg, true, 'https://kmska.be/en/folly');
      ok(before.includes('for "Koninklijk Museum voor Schone Kunsten Antwerpen": "Antwerp Fine Arts", not "KMSKA Antwerp"') && before.includes('"Antwerp Fine Arts"'),
        'AL-066: a venue she renamed (Antwerp) tells Claude her name and the one it gave', before.slice(before.indexOf('venueShort'), before.indexOf('venueShort') + 600));
      for (const v of Object.values(box.LINK_VENUES)) delete v.notCard;
      ok(!/renamed/.test(box.linkPrompt(pg, true, 'https://kmska.be/en/folly')), 'AL-066a:  none renamed, the question says nothing of renames');
    }
    // ── AL-060: the passage's shared rules, on lines copied from live replies ─
    const ps = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {readShowPage,isFurniture,withoutBoilerplate};')(React, win, win.document, win.localStorage);
    ok(['Buy Tickets', 'Adults CHF 31.– / Concessions CHF 22.–* incl. Collection & small exhibitions.', 'MoMA, Floor 3, 3 East The Robert B. Menschel Galleries',
        'Johan Tobias Sergel, detail of Mars and Venus . Photo: Viktor Fordell/Nationalmuseum', 'Anna Atkins, cyanotopi, 1843', 'Free with museum admission'].every(ps.isFurniture)
      && !ps.isFurniture('Bacon was inspired to become a painter by Picasso’s works.') && !ps.isFurniture('In 1938, René Magritte gave a lecture at the KMSKA.'),
      'AL-060: ticket and visit labels, prices, floors, photo credits and captions are furniture; a sentence about the show never is');
    ok(ps.withoutBoilerplate('Frida Kahlo’s art has resonated widely. Major funding is provided by the Kinder Foundation.') === 'Frida Kahlo’s art has resonated widely.',
      'AL-060a:  a sentence holding one of the scraper\'s boilerplate phrases goes, its neighbour stays (BOILERPLATE, shared)');
    const getty = ps.readShowPage({ title: 'Ultra-Violet: New Light on Van Gogh\'s Irises | Getty Exhibitions', full_content: '# Ultra-Violet: New Light on Van Gogh’s Irises\n\nOct 1, 2024–Mar 9, 2025\n\nRelated Events\n\nExamine Getty’s much-loved painting, Irises by Vincent van Gogh, from the perspective of modern conservation science. This exhibition shows how the artist worked and how the painting has changed over time. '.repeat(2) + '\n\nRelated Tours\n\nA tour of the Getty Center gardens, every day at noon, with a docent who knows the plants well and loves them.' }, 'https://www.getty.edu/exhibitions/ultra-violet-new-light-on-van-goghs-irises/', null);
    ok(getty.ok && /^Examine Getty/.test(getty.raw) && !/gardens/.test(getty.raw),
      'AL-060b:  "Related …" above the show\'s text is skipped; after it, the passage ends there (Getty)', JSON.stringify(getty.raw.slice(0, 80)));
    // ── AL-061: the passage read by the page's paragraphs, headings, lists and quotations ─
    const pr = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {readShowPage,withoutBoilerplate,isCaption,isProse};')(React, win, win.document, win.localStorage);
    const footer = '\n\n## Follow us\n\n' + '* Instagram\n'.repeat(40);
    const page = (body, url) => pr.readShowPage({ title: 'Show', full_content: '# Show\n\n12 March – 7 June 2026\n\n' + body + footer }, url || 'https://example.org/show', null);
    const para = n => 'The exhibition brings together paintings and drawings from collections across Europe, paragraph ' + n + '.';
    const mad = page('From 10 April to 13 October 2024,\nthe Musée des Arts Décoratifs\nis devoting an exhibition to the birth\nof department stores.');
    ok(mad.raw === 'From 10 April to 13 October 2024, the Musée des Arts Décoratifs is devoting an exhibition to the birth of department stores.',
      'AL-061: a paragraph printed a line per few words is one paragraph (Musée des Arts Décoratifs)', JSON.stringify(mad.raw));
    ok(pr.withoutBoilerplate('The show brings together forty works. Leadership support is provided by an anonymous donor and by Margot and Jeremiah M. Bogert, Elizabeth M. and Jean-Marie R. Eveillard, and The Christian Humann Foundation.') === 'The show brings together forty works.',
      'AL-061a:  an initial\'s full stop ends no sentence: a funder list goes whole, never its tail (Frick)');
    const kmska = page('Date:\n\n##### In 1938, René Magritte gave a lecture at the KMSKA on his vision of reality. There, he discussed the origins and development of his art.\n\n' + para(2));
    ok(/^In 1938, René Magritte/.test(kmska.raw), 'AL-061b:  a lead paragraph set as a heading is a paragraph (KMSKA)', JSON.stringify(kmska.raw.slice(0, 60)));
    const lists = page(para(1) + '\n\n* 5 of 5 stars\n  \n  > A dazzling, soulful trip\n  > \n  > The Standard\n\n> “A room hung with pictures is a room hung with thoughts.” Joshua Reynolds (1784)\n\n| M | T | W |\n\n' + para(2));
    ok(lists.raw === para(1) + '\n' + para(2), 'AL-061c:  a list, a quotation or a table is never the show\'s text (British Museum\'s reviews)', JSON.stringify(lists.raw));
    ok(['Guido Cagnacci\'s The Death of Cleopatra, a painting of a topless woman collapsed onto a red, studded leather chair. A small black snake can be seen coiled around the arm rest',
        'Francesco di Giorgio (1439–1501), Deposition of Christ from the Cross with a Group of Donors (detail), 1473–74, medium-tin bronze and elevated antimony, Church of Santa Maria del Carmelo, Venice.',
        'Victor Brauner, Bird Embracing a Woman, 1953. Ceramic plate, 12 3/8 × 12 1/8 × 1 5/8 in. (31.4 × 30.8 × 4.1 cm). The Menil Collection, Houston, Gift of the artist.',
        'Charcoal drawing of landscape with human and animal figures approaching trees, in brown and gray washes with white highlights.',
        'Sunbeams or Sunlight. Dust Motes Dancing in the Sunbeams. Strandgade 30', 'Een portret van Thomas William Coke door Pompeo Batoni, uit 1774 te zien in Holkham Hall.'].every(pr.isCaption)
      && !pr.isCaption('Woo Chong Yung (1898–1989), also known in the United States as C.Y. Woo, was a highly accomplished painter, calligrapher, and poet from Shanghai.')
      && !pr.isCaption('The centerpiece of the special feature is the oil on canvas Death of Cleopatra (1660-62) on loan from the Pinacoteca de Brera in Milan, Italy.'),
      'AL-061d:  pictures\' captions and descriptions are not the show\'s text (Cincinnati, Frick, Menil, Morgan, Thyssen, Mauritshuis); a sentence about the show naming a work is');
    const four = page([1, 2, 3, 4, 5].map(para).join('\n\n'));
    ok(four.raw.split('\n').length === 4, 'AL-061e:  four paragraphs at most, the scraper\'s cut (her decision)', JSON.stringify(four.raw.split('\n').length));
    const kh = page('Silent rooms, muted light and minimal shifts within the familiar: Kunsthaus Zürich presents the first exhibition in Switzerland dedicated to Vilhelm Hammershøi.\n\n#### Tickets\n\nAdults CHF 31.– / Concessions CHF 22.–\n\n#### Membership\n\nFree admission plus invitations to all openings and many other benefits!\n\n' + para(2));
    ok(/^Silent rooms/.test(kh.raw) && kh.raw.endsWith(para(2)) && !/CHF|admission/.test(kh.raw),
      'AL-061f:  below a short introduction a box (tickets, membership) is passed over and the show\'s text below it read (Kunsthaus)', JSON.stringify(kh.raw));
    const ven = page([1, 2, 3, 4, 5, 6, 7].map(para).join(' ') + '\n\n## With generous support from\n\n' + para(8) + '\n\n### Events\n\n' + para(9));
    ok(!/paragraph 8/.test(ven.raw), 'AL-061g:  below a fair part of the show\'s text a box\'s heading ends it (Alte Pinakothek\'s programme)', JSON.stringify(ven.raw.slice(-60)));
    const pdf = page('The Wallace Collection’s spring exhibition will offer a fresh perspective on the work of a\n\ntowering figure of British painting, Joshua Reynolds.');
    ok(pdf.raw === 'The Wallace Collection’s spring exhibition will offer a fresh perspective on the work of a towering figure of British painting, Joshua Reynolds.',
      'AL-061h:  a sentence wrapped over paragraphs a line each is one paragraph (Enfilade\'s PDF)', JSON.stringify(pdf.raw));
    ok(pr.withoutBoilerplate('Mary Cassatt was a pillar of the impressionist group. You must accept cookies to view youtube content.') === 'Mary Cassatt was a pillar of the impressionist group.'
      && pr.withoutBoilerplate('Bonnard’s works are on view. Open Monday through Saturday from 10:00am to 6:00pm.') === 'Bonnard’s works are on view.'
      && pr.withoutBoilerplate('After his early years as a member in the Nabi group, Bonnard pursued his own path.') === 'After his early years as a member in the Nabi group, Bonnard pursued his own path.',
      'AL-061i:  cookie notices, opening times and the like go by the sentence; a sentence about the show stays (Orsay, Acquavella)');
    const rijks = page(para(1) + '\n\nRead more about Frans Hals ## Online special ‘Strokes of Genius’\n\nIn Frans Hals: Strokes of Genius, Joanna Lumley takes the visitor to 17th-century Haarlem, where Frans Hals was the go-to painter.\n\n## On view in Amsterdam for the first time\n\n' + para(2));
    ok(rijks.raw === para(1) + '\n' + para(2), 'AL-061j:  an online feature\'s section is passed over to the next heading (Rijksmuseum\'s "Online special")', JSON.stringify(rijks.raw));
    const byAddr = new Function('React', 'window', 'document', 'localStorage', code + '\n;return namedByAddress;')(React, win, win.document, win.localStorage);
    ok(byAddr({ name: 'kmska.be', host: 'kmska.be' }) && byAddr({ name: 'www.mfa.org', host: 'mfa.org' }) && !byAddr({ name: 'kmska.be', short: 'Antwerp', host: 'kmska.be' })
      && !byAddr({ name: 'Detroit Institute of Arts Museum', host: 'dia.org' }),
      'AL-053d:  a stored venue named only by its address is asked again; one with a real name or her short name never');
  }  // ── AL-062: Claude's description checked as the compressor checks its own (scraper/answer_check.js) ─
  {
    const body = '\n\n9 Oct 2026 \u2013 7 Feb 2027\n\nCelebrated alike by scholars, collectors, and the wider public, Pontormo is now the subject of a landmark exhibition dedicated exclusively to his life and artistic achievement. Bringing together the artist\u2019s most important paintings alongside an exceptional selection of drawings, the exhibition offers an unprecedented opportunity to explore the full breadth of his artistic production.\n\n' + '* Instagram\n'.repeat(40);
    const S1 = 'https://scuderiequirinale.it/en/exhibition/pontormo', S2 = 'https://scuderiequirinale.it/en/exhibition/never-passes';
    P[S1] = { url: S1, title: 'PONTORMO', full_content: '# Pontormo' + body };
    P[S2] = { url: S2, title: 'Never Passes', full_content: '# Never Passes' + body.replace('Pontormo is', 'the show is') };
    await click(importBtn());
    if (!dialog().querySelector('textarea')) await click(inDialog('Links'));
    const box = dialog().querySelector('textarea');
    await act(async () => { setter.call(box, S1 + '\n' + S2); box.dispatchEvent(new win.Event('input', { bubbles: true })); });
    await settle();
    calls.length = 0;
    await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Read'));
    await settle(30);
    const asks = t => calls.filter(c => c.kind === 'sample' && new RegExp('EXHIBITION TITLE, as the page gives it: "' + t + '"', 'i').test(c.prompt));
    const p = asks('Pontormo');
    ok(p.length === 2 && /YOUR LAST ANSWER WAS REFUSED: in the summary, "first" is not in the text/.test(p[1].prompt),
      'AL-062: a description making a claim its page does not hold ("first", Pontormo) is asked for again, with the reason', JSON.stringify(p.map(c => c.prompt.slice(-160))));
    const shown = win.document.body.textContent;
    ok(shown.includes('Pontormo\u2019s paintings and drawings.') && !/First major monographic/.test(shown),
      'AL-062a:  the answer that passes is the card\'s description', shown.slice(Math.max(0, shown.indexOf('Pontormo') - 40), shown.indexOf('Pontormo') + 200));
    ok(asks('Never Passes').length === 3 && win.document.body.textContent.includes(S2 + ' \u2014 Claude\u2019s description kept failing its check'),
      'AL-062b:  one that never passes, asked twice more, leaves the link unread with the reason (her decision)', asks('Never Passes').length);
    const cancel = buttons(/^Cancel import$/)[0];
    if (cancel) await click(cancel);
  }

  if (shouted.some(s => /Warning: Each child|Cannot update|Maximum update/.test(s))) fail('React complained: ' + shouted.find(s => /Warning/.test(s)));
  console.log(failures ? '\n' + failures + ' FAILED' : '\nadd_by_link: all passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
