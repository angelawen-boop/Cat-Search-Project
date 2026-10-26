/**
 * gallery_shop_check.js — the gallery shop path's standing check (docs/add_by_link.md, "A gallery's shop"),
 * built on shop_check.js: each gallery's show page is read first, as the app reads the link, then the
 * app's own finder runs with the gallery path (docs/gallery_shop_check.json).
 *
 * (shop_check.js:) the shop finder's standing check (her decision; docs/add_by_link.md, "The shop
 * finder's standing check"). Runs the app's own finder (`discoverShop`, Cat_Watch.jsx) LIVE on a list of
 * venues, one per way a shop has been found or missed, each with its right shop and the case it guards
 * (docs/shop_check.json). A miss prints the finder's steps beside its last good run, so the step where it
 * went wrong shows. Run it after a change to the shop finder only: about five searches and opens a venue.
 *
 * Calls go to the free Parallel server, paced: a refusal for the free tier's limit waits and asks again.
 *
 *   node scraper/shop_check.js              every venue on the list; exit 1 on any miss
 *   node scraper/shop_check.js kmska yale   those venues only (the list's `key`)
 *   node scraper/shop_check.js --write      also keeps each passing run's steps as its last good run
 *   node scraper/shop_check.js --save=DIR   also saves every call and its reply, numbered, into DIR
 */
'use strict';
const fs = require('fs');
const path = require('path');
const load = require('./claude_read_check/load.js');

const ROOT = path.join(__dirname, '..');
const LIST = path.join(ROOT, 'docs', 'gallery_shop_check.json');
const EP = 'https://search.parallel.ai/mcp';
const H = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
const WAIT_MS = 120000, TRIES = 8;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let sid = null, rid = 1;
async function rpc(body) {
  const r = await fetch(EP, { method: 'POST', headers: { ...H, ...(sid ? { 'Mcp-Session-Id': sid } : {}) }, body: JSON.stringify(body) });
  const t = await r.text(); let j = null;
  try { j = JSON.parse(t); } catch { const m = t.match(/^data: (.*)$/m); if (m) j = JSON.parse(m[1]); }
  sid = r.headers.get('mcp-session-id') || sid;
  return j;
}
async function connect() {
  await rpc({ jsonrpc: '2.0', id: rid++, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'cw-shop-check', version: '1' } } });
  await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
}
let calls = 0;
const SAVE = (process.argv.find(a => a.startsWith('--save=')) || '').slice(7) || null;
if (SAVE) fs.mkdirSync(SAVE, { recursive: true });
// The page's connector, played by the free server: the same tool names, the reply as the page gets it.
async function callTool(server, tool, args) {
  for (let i = 0; i < TRIES; i++) {
    const j = await rpc({ jsonrpc: '2.0', id: rid++, method: 'tools/call', params: { name: tool, arguments: { ...args, session_id: 'cwshopcheck' + '0'.repeat(24) } } });
    const msg = JSON.stringify((j && j.error) || '');
    if (/rate limit/i.test(msg)) { process.stdout.write(`  (free tier's limit — waiting ${WAIT_MS / 1000}s)\n`); await sleep(WAIT_MS); continue; }
    if (j && j.error) throw { code: 'server_unavailable', message: msg.slice(0, 200) };
    calls++;
    const c = (((j || {}).result || {}).content || []).find(x => x.type === 'text');
    const payload = c ? JSON.parse(c.text) : null;
    if (SAVE) fs.writeFileSync(path.join(SAVE, String(calls).padStart(3, '0') + '-' + tool + '.json'), JSON.stringify({ tool, args, payload }, null, 1));
    return { payload };
  }
  throw { code: 'server_unavailable', message: 'the free tier stayed refused' };
}

const win = { claude: { use: async name => (name === 'mcp' ? { callTool } : null) } };
const A = load(path.join(ROOT, 'Cat_Watch.jsx'), ['discoverShop', 'normalizeUrlKey'], win);

// Right when the finder's answer is the venue's right shop: its books section (`shop`), any of
// `also` where the shop has more than one right section, no shop where it has none, or the shop
// itself (`noshelfHome`) where Parallel cannot see its books.
function judge(v, got) {
  if (v.shop === null) return got.shop !== 'found' ? null : 'found ' + got.shopCatalogues + ', where the venue has no shop of its own';
  // A shop whose books Parallel cannot see: "Shop found, but not its books section" with that shop is right.
  if (v.noshelfHome && got.shop === 'noshelf') return A.normalizeUrlKey(got.shopHome) === A.normalizeUrlKey(v.noshelfHome) ? null : 'gave ' + got.shopHome + ' as the shop, not ' + v.noshelfHome;
  if (got.shop !== 'found') return 'answered "' + got.shop + '"' + (got.why ? ' (' + got.why + ')' : '') + ', not ' + v.shop;
  const k = A.normalizeUrlKey;
  return [v.shop, ...(v.also || [])].some(u => k(u) === k(got.shopCatalogues)) ? null : 'took ' + got.shopCatalogues + ', not ' + v.shop;
}
const stepLine = s => '    ' + s.step.padEnd(16) + JSON.stringify(Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'step'))).slice(0, 220);

(async () => {
  const args = process.argv.slice(2), write = args.includes('--write'), only = args.filter(a => !a.startsWith('--'));
  const list = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  await connect();
  let misses = 0, run = 0;
  for (const v of list.venues) {
    if (only.length && !only.includes(v.key)) continue;
    run++;
    const trace = [], before = calls;
    let got;
    try {
      let page = null;
      if (v.show) { const f = await callTool('', 'web_fetch', { urls: [v.show], objective: "The exhibition's title, dates and description.", full_content: true }); const r = ((f.payload || {}).results || [])[0]; page = r ? (r.full_content || '') : null; }
      got = await A.discoverShop('', v.host, v.searchName, [], 'occ-' + v.key, trace, v.english === false, page ? { page, url: v.show } : true);
    }
    catch (e) { got = { shop: 'failed', why: String((e && e.message) || e) }; }
    const wrong = judge(v, got);
    console.log((wrong ? 'MISS  ' : 'ok    ') + v.key.padEnd(14) + (wrong || (got.shopCatalogues || got.shop)) + `  [${calls - before} calls]`);
    if (got.shopEnglishUnread) console.log('      English section offered beside it, unread: ' + got.shopEnglishUnread);
    console.log('      guards: ' + v.case);
    if (wrong) {
      misses++;
      console.log('      this run:'); trace.forEach(s => console.log(stepLine(s)));
      if (v.lastGood) { console.log('      last good run:'); v.lastGood.forEach(s => console.log(stepLine(s))); }
    } else if (write) v.lastGood = trace;
  }
  if (write) fs.writeFileSync(LIST, JSON.stringify(list, null, 1) + '\n');
  console.log(`\n${run} venues, ${misses ? misses + ' missed' : 'every shop right'}; ${calls} calls.`);
  process.exit(misses ? 1 : 0);
})().catch(e => { console.log('FAIL  ' + (e && e.stack || e)); process.exit(1); });
