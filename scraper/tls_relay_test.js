#!/usr/bin/env node
/**
 * TLS RELAY EXPERIMENT — does Chromium's own handshake survive the proxy?
 *
 * WHY THIS EXISTS
 * ---------------
 * In the Claude Code container everything must leave through an HTTP CONNECT
 * proxy, and that proxy drops Chromium's TLS ClientHello (~1.8 KB): the tunnel
 * opens, bytes go out, the tunnel closes, and every https page dies with
 * ERR_CONNECTION_RESET. The working answer so far is the NETWORK BRIDGE —
 * Chromium does no network I/O and Node fetches everything instead.
 *
 * That bridge costs us the Met. Its host (Vercel) serves a bot checkpoint at
 * HTTP 429, and the checkpoint cannot be cleared because clearing it needs the
 * genuine browser TLS session the bridge replaced. Run the same code with no
 * proxy and the Met serves us instantly with no challenge at all.
 *
 * So the question is NOT "how do we look more like Chrome". It is:
 *
 *     can Chromium keep its OWN end-to-end TLS session while still satisfying
 *     the container's mandatory proxy?
 *
 * This relay is the cheapest experiment that answers it, suggested by an
 * outside engineer (11 Sep 2026):
 *
 *     Chromium --proxy-server=http://127.0.0.1:PORT
 *        │  speaks HTTP CONNECT to us
 *        ▼
 *     this relay ── speaks HTTP CONNECT to the real agent proxy
 *        ▼
 *     the internet
 *
 * The relay NEVER terminates TLS. It does not read, parse, or understand a
 * single byte of what passes through: no certificates, no HTTP, no headers, no
 * user-agent. It copies bytes. That means the TLS session is Chromium's from
 * end to end, which is the entire point — nothing here disguises anything, it
 * restores the browser as the real endpoint.
 *
 * THE VARIABLE BEING TESTED is how the client→proxy bytes are WRITTEN. If the
 * proxy chokes on a large first write rather than objecting to Chromium's TLS
 * characteristics, then feeding the same ClientHello through in smaller pieces
 * should sail through. The bytes are identical either way; only the write
 * pattern changes.
 *
 *   node scraper/tls_relay_test.js            try every chunk size
 *   node scraper/tls_relay_test.js 400        try one
 *
 * READ THE RESULT HONESTLY:
 *   - one chunk size works  → the proxy is size/segmentation sensitive, and the
 *                             container can have real Chromium networking
 *   - all of them fail      → the proxy is reacting to Chromium's TLS itself.
 *                             Stop here. The remaining options all involve
 *                             altering the handshake, which is forgery, not
 *                             diagnosis. The Met stays a local-run venue.
 *
 * ANSWERED, 11 Sep 2026 — every write size failed, and the proxy's own log says
 * why far better than this script could:
 *
 *   tunnel closed (code 1006, Connection ended) after 6s;
 *   1724 B sent, 39 B received, client reading, 0 B still queued in the relay
 *
 * from `curl -sS "$HTTPS_PROXY/__agentproxy/status"`. Three things in that one
 * line:
 *
 *   1. The ClientHello WAS fully sent and nothing was left queued — so
 *      segmentation was never the problem, and chunking could not have helped.
 *   2. Only 39 bytes came back before the tunnel died at six seconds. The
 *      failure is the tunnel, not the destination.
 *   3. The same entries appear for www.google.com and accounts.google.com.
 *      Nothing about museums, Vercel or bot protection — Chromium's own TLS
 *      simply does not survive this proxy, for anyone.
 *
 * The proxy is a WebSocket-based relay (`ws_closed_mid_exchange`, close code
 * 1006), and its own README lists WebSocket upgrades among the things that are
 * "Not supported through the proxy (report, do not work around)".
 *
 * So this is an environment limitation to REPORT, not a puzzle to defeat — and
 * that lands in the same place our own rule did, from the other direction. The
 * script is kept because the negative result is worth as much as a positive one
 * would have been: it stops the next session rebuilding the same relay.
 */

const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

// Same resolver as the scraper. Without it the launch fails and every chunk
// size "fails" identically — which reads exactly like a real negative result
// and is not one. That happened on the first run of this script.
function resolveChromium() {
  const candidates = [];
  try { candidates.push(chromium.executablePath()); } catch { /* not installed */ }
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const dirs = fs.readdirSync(root).filter(n => /^chromium-\d+$/.test(n)).sort().reverse();
    for (const d of dirs) {
      candidates.push(path.join(root, d, 'chrome-linux', 'chrome'));
      candidates.push(path.join(root, d, 'chrome-linux64', 'chrome'));
    }
  } catch { /* no such directory */ }
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return undefined;
}

const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const TARGET = process.env.RELAY_TARGET || 'https://www.metmuseum.org/exhibitions';

// 0 means "one write, unchanged" — the control case, which should reproduce the
// original failure. Without it a success tells you nothing about the cause.
const CHUNK_SIZES = process.argv[2] ? [Number(process.argv[2])] : [0, 1200, 800, 400, 200, 100];

function proxyParts() {
  const m = PROXY.match(/^https?:\/\/([^:/]+):(\d+)/);
  if (!m) throw new Error(`Cannot read a host and port from HTTPS_PROXY: "${PROXY}"`);
  return { host: m[1], port: Number(m[2]) };
}

/**
 * A CONNECT proxy that forwards to the real CONNECT proxy, byte for byte.
 * `chunk` is how many bytes to write at a time towards the proxy; 0 writes
 * whatever arrives, unchanged.
 */
function startRelay(chunk) {
  const { host: pHost, port: pPort } = proxyParts();

  const server = net.createServer((client) => {
    client.once('data', (first) => {
      const line = first.toString('latin1').split('\r\n')[0];
      const m = line.match(/^CONNECT\s+(\S+?):(\d+)/i);
      if (!m) { client.destroy(); return; }
      const [, host, port] = m;

      // Hold the client stream still until the tunnel is up. Chromium sends its
      // ClientHello the moment it sees our 200, and with no 'data' listener
      // attached in between those bytes could be read and dropped — which would
      // look exactly like the proxy refusing us and would be our own bug.
      // Explicit pause/resume removes the doubt rather than relying on Node's
      // flowing-mode rules.
      client.pause();

      const up = net.connect(pPort, pHost, () => {
        up.write(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n\r\n`);
      });

      let established = false;
      up.on('data', (buf) => {
        if (established) { client.write(buf); return; }
        // The proxy's own CONNECT response. Swallow it and tell Chromium the
        // tunnel is open; everything after this is opaque.
        const head = buf.toString('latin1');
        const end = head.indexOf('\r\n\r\n');
        if (end === -1) return;
        established = true;
        if (!/^HTTP\/\d\.\d\s+2\d\d/.test(head)) {
          client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
          up.destroy();
          return;
        }
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        const rest = buf.subarray(end + 4);
        if (rest.length) client.write(rest);

        // THE EXPERIMENT. Same bytes, different write sizes.
        client.on('data', (d) => {
          if (!chunk) { up.write(d); return; }
          for (let i = 0; i < d.length; i += chunk) up.write(d.subarray(i, i + chunk));
        });
        client.resume();
      });

      const bin = () => { client.destroy(); up.destroy(); };
      up.on('error', bin);
      client.on('error', bin);
      up.on('close', () => client.destroy());
      client.on('close', () => up.destroy());
    });
  });

  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function tryChunk(chunk) {
  const label = chunk ? `${chunk}-byte writes` : 'one write (control)';
  const server = await startRelay(chunk);
  const port = server.address().port;
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: resolveChromium(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=http://127.0.0.1:${port}`],
    });
    const page = await browser.newPage();
    const resp = await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 25000 });
    const status = resp ? resp.status() : 0;
    const title = (await page.title().catch(() => '')).slice(0, 60);
    console.log(`  ${label.padEnd(22)} → HTTP ${status}  "${title}"`);
    return { chunk, ok: status > 0 && status < 400, status, title };
  } catch (e) {
    console.log(`  ${label.padEnd(22)} → ${String(e.message).split('\n')[0].slice(0, 80)}`);
    return { chunk, ok: false, error: e.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
  }
}

(async () => {
  const exe = resolveChromium();
  if (!exe) { console.log('No Chromium found — nothing can be concluded from this run.'); process.exit(1); }
  console.log(`Chromium: ${exe}`);
  console.log(`Proxy:  ${PROXY || '(none — this experiment is pointless without one)'}`);
  console.log(`Target: ${TARGET}`);
  console.log('Chromium keeps its own TLS session end to end; only the write size varies.\n');

  const results = [];
  for (const c of CHUNK_SIZES) results.push(await tryChunk(c));

  const wins = results.filter(r => r.ok);
  console.log('');
  if (wins.length) {
    console.log(`RESULT: Chromium reached the site with ${wins.map(w => w.chunk || 'one write').join(', ')}.`);
    console.log('The proxy is sensitive to how the ClientHello is written, not to Chromium itself.');
    console.log('A relay like this can give the container real browser networking.');
  } else {
    console.log('RESULT: every write size failed.');
    console.log('The proxy is not merely choking on a large first write, so segmentation is');
    console.log('not the answer. Anything further would mean altering Chromium\'s handshake,');
    console.log('which is forging a fingerprint rather than diagnosing one. Stop here.');
  }
})();
