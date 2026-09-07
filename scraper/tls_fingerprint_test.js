/**
 * TLS Fingerprint Block — Diagnostic Test
 *
 * Standalone test, unrelated to the museum sweep scraper. Does NOT modify
 * or depend on sweep_prototype.js.
 *
 * Purpose: test whether headless Chromium gets blocked at the TLS handshake
 * stage on a set of 6 deliberately unrelated, geographically spread sites
 * (retail, government, media, nonprofit, and a no-protection baseline),
 * while plain Node.js HTTP requests (going through the same proxy) succeed.
 *
 * For each site we do two things:
 *   1. Try to load the page with headless Chromium (Playwright)
 *   2. Try a plain Node.js HTTPS request through the same proxy tunnel
 *
 * Run: node scraper/tls_fingerprint_test.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const net = require('net');
const tls = require('tls');

const OUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG_PATH = path.join(OUT_DIR, 'tls_fingerprint_test_log.txt');

const logLines = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logLines.push(line);
}

const SITES = [
  { label: 'Walmart (US retail giant)',        url: 'https://www.walmart.com/' },
  { label: 'UK gov.uk (UK government)',          url: 'https://www.gov.uk/' },
  { label: 'Yves Delorme (small FR retailer)',   url: 'https://eu.yvesdelorme.com/l/linge-de-lit/taies-oreiller.html' },
  { label: 'Network 10 (AU broadcaster/media)',  url: 'https://10.com.au/' },
  { label: 'Wikipedia (nonprofit, control)',     url: 'https://www.wikipedia.org/' },
  { label: 'example.com (unprotected baseline)', url: 'https://example.com/' },
];

// ── Plain Node.js HTTPS test via proxy CONNECT tunnel ──────────────────────
function nodeHttpsTest(targetUrl) {
  return new Promise((resolve) => {
    const u = new URL(targetUrl);
    const proxyUrl = new URL(process.env.HTTPS_PROXY);
    const start = Date.now();

    const socket = net.connect(proxyUrl.port, proxyUrl.hostname, () => {
      socket.write(`CONNECT ${u.hostname}:443 HTTP/1.1\r\nHost: ${u.hostname}:443\r\n\r\n`);
      socket.once('data', (d) => {
        const connectLine = d.toString().split('\r\n')[0];
        if (!/^HTTP\/1\.[01] 200/.test(connectLine)) {
          resolve({ ok: false, reason: `PROXY_CONNECT_FAILED: ${connectLine}`, ms: Date.now() - start });
          socket.destroy();
          return;
        }
        const tlsSocket = tls.connect(
          { socket, servername: u.hostname, rejectUnauthorized: false },
          () => {
            tlsSocket.write(`GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.hostname}\r\nUser-Agent: curl/8.0\r\nConnection: close\r\n\r\n`);
          }
        );
        tlsSocket.once('data', (d2) => {
          const statusLine = d2.toString().split('\r\n')[0];
          resolve({ ok: true, status: statusLine, ms: Date.now() - start });
          tlsSocket.destroy();
        });
        tlsSocket.on('error', (e) => {
          resolve({ ok: false, reason: `TLS_ERROR: ${e.message}`, ms: Date.now() - start });
        });
      });
    });
    socket.on('error', (e) => {
      resolve({ ok: false, reason: `SOCKET_ERROR: ${e.message}`, ms: Date.now() - start });
    });
    setTimeout(() => {
      resolve({ ok: false, reason: 'TIMEOUT (15s)', ms: Date.now() - start });
      socket.destroy();
    }, 15000);
  });
}

// ── Chromium test ───────────────────────────────────────────────────────────
async function chromiumTest(browser, targetUrl) {
  const start = Date.now();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  try {
    const resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = resp ? resp.status() : null;
    await context.close();
    return { ok: true, status, ms: Date.now() - start };
  } catch (e) {
    await context.close();
    const reason = e.message.split('\n')[0];
    return { ok: false, reason, ms: Date.now() - start };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────
(async () => {
  log('TLS Fingerprint Block — Diagnostic Test starting');
  log(`Proxy: ${process.env.HTTPS_PROXY || '(none set)'}`);
  log(`Sites under test: ${SITES.length}`);
  log('');

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      ...(process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`] : []),
    ],
  });

  const results = [];

  for (const site of SITES) {
    log('─'.repeat(70));
    log(`SITE: ${site.label}`);
    log(`URL:  ${site.url}`);

    log('  [Chromium] navigating...');
    const chromiumResult = await chromiumTest(browser, site.url);
    if (chromiumResult.ok) {
      log(`  [Chromium] SUCCESS — HTTP ${chromiumResult.status} in ${chromiumResult.ms}ms`);
    } else {
      log(`  [Chromium] FAILED — ${chromiumResult.reason} (${chromiumResult.ms}ms)`);
    }

    log('  [Node.js]  connecting...');
    const nodeResult = await nodeHttpsTest(site.url);
    if (nodeResult.ok) {
      log(`  [Node.js]  SUCCESS — ${nodeResult.status} in ${nodeResult.ms}ms`);
    } else {
      log(`  [Node.js]  FAILED — ${nodeResult.reason} (${nodeResult.ms}ms)`);
    }

    results.push({ site: site.label, url: site.url, chromium: chromiumResult, node: nodeResult });
    log('');
  }

  await browser.close();

  // ── Summary table ──────────────────────────────────────────────────────
  log('═'.repeat(70));
  log('SUMMARY');
  log('═'.repeat(70));
  for (const r of results) {
    const c = r.chromium.ok ? `OK (${r.chromium.status})` : `BLOCKED (${r.chromium.reason})`;
    const n = r.node.ok ? `OK (${r.node.status})` : `BLOCKED (${r.node.reason})`;
    log(`${r.site}`);
    log(`   Chromium: ${c}`);
    log(`   Node.js:  ${n}`);
  }

  const chromiumBlocked = results.filter(r => !r.chromium.ok).length;
  const nodeBlocked = results.filter(r => !r.node.ok).length;
  log('');
  log(`Chromium blocked on ${chromiumBlocked}/${results.length} sites`);
  log(`Node.js blocked on ${nodeBlocked}/${results.length} sites`);

  fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n', 'utf8');
  log('');
  log(`Log written to: ${LOG_PATH}`);
})();
