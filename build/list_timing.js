#!/usr/bin/env node
/*
 * list_timing.js — times the main list in a real browser (Chromium), on a large copy of
 * her 24 Sep ledger: Load, a star, search keystrokes, scrolling, Jump to bottom, typing a
 * Save name (docs/scalability.md). Not a test: numbers vary run to run; compare two builds
 * on the same machine.
 *
 *   node build/build_app.js && node build/list_timing.js [build/dist/index.html] [--rows 2000] [--slow 4]
 *
 * --slow slows the CPU (4 ≈ a phone). React comes from cdnjs, the page's own source.
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const html = args.find(a => a.endsWith('.html')) || path.join(__dirname, 'dist', 'index.html');
const N = +opt('--rows', 2000), SLOW = +opt('--slow', 1);
const ROOT = path.join(__dirname, '..');

// Her ledger repeated to N rows: new ids, dates moved back two months a copy.
const hers = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json'), 'utf8'));
const shift = (d, m) => { if (!d) return d; const x = new Date(d + 'T00:00:00'); x.setMonth(x.getMonth() - m); return x.toISOString().slice(0, 10); };
const rows = [];
while (rows.length < N) {
  const n = rows.length, r = hers.rows[n % hers.rows.length], m = Math.floor(n / hers.rows.length) * 2;
  rows.push({ ...r, id: r.id + '-c' + n, startDate: shift(r.startDate, m), endDate: shift(r.endDate, m) });
}
const ledger = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cw-time-')), 'ledger.json');
fs.writeFileSync(ledger, JSON.stringify({ ...hers, rows }));

(async () => {
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const b = await chromium.launch(exe ? { executablePath: exe } : {});
  const p = await b.newPage({ viewport: { width: 420, height: 900 } });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u === 'http://cw.test/') return r.fulfill({ body: fs.readFileSync(html), contentType: 'text/html' });
    if (u.startsWith('https://cdnjs.cloudflare.com/')) return r.continue();
    return r.abort();
  });
  p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await p.goto('http://cw.test/'); await p.waitForSelector('text=Load');
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW });
  const cards = () => p.evaluate(() => document.querySelectorAll('article').length);
  // One action, timed until the next frame has been drawn.
  const time = fn => p.evaluate(new Function('return (async()=>{const t=performance.now();(' + fn + ')();'
    + 'await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));return Math.round(performance.now()-t);})()'));
  const typeIn = (sel, v) => `()=>{const i=document.querySelector('${sel}');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(v)});i.dispatchEvent(new Event('input',{bubbles:true}));}`;
  const many = async (fns) => { const o = []; for (const f of fns) o.push(await time(f)); return o.join(' '); };

  console.log(`${N} rows, CPU slowed ×${SLOW}; ms per action, until the next frame`);
  const t0 = Date.now(); await p.setInputFiles('input[type=file][accept=".json"]', ledger);
  await p.waitForFunction(() => document.querySelectorAll('article').length > 0, null, { timeout: 120000 });
  console.log('load and draw', Date.now() - t0, '· cards drawn', await cards());
  console.log('do nothing (one frame)', await many(Array(5).fill('()=>{}')));
  console.log('star', await many(Array(5).fill(`()=>document.querySelector('button[title="Watch"],button[title="Unwatch"]').click()`)));
  await p.click('button[title="Search"]');
  const SQ = 'input[placeholder^="Search exhibitions"]'; await p.waitForSelector(SQ);
  console.log('search typing', await many(['p', 'pa', 'pai', 'pain'].map(v => typeIn(SQ, v))));
  console.log('search deleting', await many(['pai', 'pa', 'p', ''].map(v => typeIn(SQ, v))));
  for (let k = 0; k < 4; k++) { await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(400); }
  console.log('cards drawn after scrolling', await cards());
  await p.evaluate(() => window.scrollBy(0, 800)); await p.waitForTimeout(200);
  await p.click('button[aria-label="Jump to bottom"]'); await p.waitForTimeout(1500);
  console.log('Jump to bottom: cards drawn', await cards());
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent === 'Save').click());
  const LB = 'input[placeholder^="Description"]'; await p.waitForSelector(LB);
  let v = ''; const fns = []; for (const ch of 'after lookups') { v += ch; fns.push(typeIn(LB, v)); }
  console.log('Save name typing', await many(fns));
  await b.close();
})();
