/**
 * THE NETWORK BRIDGE REUSES FILES AS A PERSON'S BROWSER DOES — 27 Sep 2026.
 * No network: the bridge's fetch is replaced by a stand-in that serves a made-
 * up site and counts every request that would have gone to the museum.
 *
 *   node scraper/fixtures/bridge_reuse.js
 */
'use strict';
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 300) : '')); }
};

const SITE = 'https://museum.test';
const PAGE = n => `<html><head>
<link rel="stylesheet" href="${SITE}/style.css">
<script src="${SITE}/shared.js"></script>
<script src="${SITE}/nostore.js"></script>
<script src="${SITE}/nodate.js"></script>
</head><body><p>Show ${n}</p><script>fetch('${SITE}/api/live').catch(()=>{})</script></body></html>`;
const FILES = {
  '/style.css':   { type: 'text/css', headers: { 'cache-control': 'public, max-age=3600' }, body: 'p{}' },
  '/shared.js':   { type: 'application/javascript', headers: { 'last-modified': 'Mon, 01 Sep 2026 00:00:00 GMT' }, body: 'var a=1;' },
  '/nostore.js':  { type: 'application/javascript', headers: { 'cache-control': 'no-store' }, body: 'var b=1;' },
  '/nodate.js':   { type: 'application/javascript', headers: {}, body: 'var c=1;' },
  '/api/live':    { type: 'application/json', headers: { 'cache-control': 'max-age=3600' }, body: '{}' },
};

(async () => {
  const asked = {};
  const fakeFetch = async (url) => {
    const p = new URL(url).pathname;
    asked[p] = (asked[p] || 0) + 1;
    const f = FILES[p] || { type: 'text/html', headers: {}, body: PAGE(p) };
    const headers = { 'content-type': [f.type], ...Object.fromEntries(Object.entries(f.headers).map(([k, v]) => [k, [v]])) };
    return { status: 200, buffer: async () => Buffer.from(f.body), headers: { raw: () => headers } };
  };

  const browser = await chromium.launch({ executablePath: S.resolveChromium(), args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext();
    const stats = await S.installNetworkBridge(context, { fetchImpl: fakeFetch });
    const page = await context.newPage();
    for (const n of [1, 2, 3]) {
      await page.goto(`${SITE}/exhibition/show-${n}`, { waitUntil: 'load' });
      await page.waitForTimeout(150);
    }
    const text = await page.evaluate(() => document.body.innerText);

    check('BR-001: a program file the site lets be kept is fetched once over three pages', asked['/shared.js'] === 1, asked['/shared.js']);
    check('BR-002: a stylesheet with a max-age is fetched once', asked['/style.css'] === 1, asked['/style.css']);
    check('BR-003: no-store is fetched every time', asked['/nostore.js'] === 3, asked['/nostore.js']);
    check('BR-004: a file with no word from the site on keeping is fetched every time', asked['/nodate.js'] === 3, asked['/nodate.js']);
    check('BR-005: live data is never reused, whatever its headers', asked['/api/live'] === 3, asked['/api/live']);
    check('BR-006: every page itself is fetched fresh', [1, 2, 3].every(n => asked[`/exhibition/show-${n}`] === 1), JSON.stringify(asked));
    check('BR-007: the page still works on a reused file', /Show \/exhibition\/show-3/.test(text), text);
    check('BR-008: the count of reused files is reported', stats.reused === 4, stats.reused);
    await context.close();

    // A second context — another worker — starts with nothing kept.
    const ctx2 = await browser.newContext();
    await S.installNetworkBridge(ctx2, { fetchImpl: fakeFetch });
    const p2 = await ctx2.newPage();
    await p2.goto(`${SITE}/exhibition/show-4`, { waitUntil: 'load' });
    check('BR-009: nothing is shared between workers', asked['/shared.js'] === 2, asked['/shared.js']);
    await ctx2.close();

    check('BR-010: an error reply is never kept', S.reusableFile('script', 404, { 'cache-control': 'max-age=60' }) === false);
    check('BR-011: max-age=0 is not kept', S.reusableFile('script', 200, { 'cache-control': 'max-age=0' }) === false);
    check('BR-012: no-cache is not kept', S.reusableFile('stylesheet', 200, { 'Cache-Control': 'public, no-cache' }) === false);
    check('BR-013: an Expires in the past is not kept', S.reusableFile('script', 200, { expires: 'Mon, 01 Jan 2024 00:00:00 GMT' }) === false);
    check('BR-014: a document is never kept', S.reusableFile('document', 200, { 'cache-control': 'max-age=60' }) === false);
    // WHO ANSWERED (27 Sep): the labels the container now logs.
    const ash = { 'Server': 'Apache', 'X-Ah-Environment': 'prod', 'X-Cache-Hits': '226', 'Cache-Control': 'public, max-age=60' };
    const L = S.replyLabels(ash, 'https://www.ashmolean.org/exhibition/x');
    check('BR-015: a site with no gatekeeper is named by its own host', /^gatekeeper site:www\.ashmolean\.org/.test(L), L);
    check('BR-016: its hosting and cache labels are kept', /x-ah-environment: prod/.test(L) && /x-cache-hits: 226/.test(L) && /server: Apache/.test(L), L);
    const cf = S.replyLabels({ 'cf-ray': '8a1b', server: 'cloudflare', 'retry-after': '120' }, 'https://www.moma.org/');
    check('BR-017: Cloudflare, and a stated wait, are named', /gatekeeper Cloudflare/.test(cf) && /retry-after: 120/.test(cf), cf);
  } finally {
    await browser.close();
  }
  console.log(failures ? failures + ' failed' : 'the bridge reuses what a browser would, and nothing else');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  bridge_reuse crashed — ' + e.message); process.exit(1); });
