/**
 * WHAT EACH SITE ASKS OF A MACHINE READING IT — robots.txt. Her go-ahead, 27 Sep.
 *
 * WHY. The Ashmolean's robots.txt asks every automated reader for 10 seconds
 * between requests. We were asking every 2, and its show pages stalled. The file
 * had been read by hand at four venues and used by the scraper at none. What a
 * site asks has exactly one answer, so it is code (§1, "Put it in code").
 *
 * WHAT. Per host, once a week at most:
 *   robots/<host>.txt    the file exactly as served (committed — the record)
 *   robots/<host>.json   when it was read, the HTTP status, and what it means
 * A sweep reads the kept copy, and asks the site again only when that copy is
 * older than MAX_AGE_DAYS. One small request per site per week.
 *
 * WHICH RULES APPLY. The sweep's browser names itself as Chrome, not as a
 * crawler, so no named group ("ClaudeBot", "GPTBot") describes it: the `*`
 * group does. RFC 9309 matching: the longest matching rule wins, Allow wins a
 * tie, `*` matches anything and a trailing `$` anchors the end.
 *
 * UNREADABLE IS NOT PERMISSION TO GUESS. A file that could not be read (bot
 * check, timeout) is recorded as unreadable and asks nothing — which is what the
 * site has told us, and the log says so. A 404 is a site with no file: nothing
 * asked, nothing forbidden (RFC 9309 §2.3.1.3).
 *
 *   node scraper/robots.js            read every venue's file (skips fresh copies)
 *   node scraper/robots.js --report   print what each asks, no network
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'robots');
const MAX_AGE_DAYS = 7;
// What the sweep's browser calls itself; robots.txt is asked for under the
// same name, so the site sees one visitor, not two.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const hostOf = url => new URL(url).host.toLowerCase();
const fileFor = (host, ext, dir = DIR) => path.join(dir, host.replace(/[^a-z0-9.-]/g, '_') + ext);

// ---------------------------------------------------------------- parsing ---

/** The `*` group of a robots.txt: its crawl delay (seconds) and its rules. */
function parseRobots(text) {
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'user-agent') {
      // Consecutive User-agent lines share one group.
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [], delay: null }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === 'allow' || key === 'disallow') {
      if (val) cur.rules.push({ allow: key === 'allow', path: val });
    } else if (key === 'crawl-delay') {
      const n = parseFloat(val);
      if (Number.isFinite(n) && n >= 0) cur.delay = n;
    }
  }
  // Every group naming `*` applies; RFC 9309 merges them.
  const star = groups.filter(g => g.agents.includes('*'));
  const rules = star.flatMap(g => g.rules);
  const delays = star.map(g => g.delay).filter(d => d != null);
  return { crawlDelay: delays.length ? Math.max(...delays) : null, rules };
}

function ruleRegex(p) {
  const anchored = p.endsWith('$');
  const body = (anchored ? p.slice(0, -1) : p)
    .split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + body + (anchored ? '$' : ''));
}

/** Is this address allowed by these rules? Longest match wins; Allow wins a tie. */
function isAllowed(rules, url) {
  let u; try { u = new URL(url); } catch { return true; }
  const target = u.pathname + u.search;
  let best = null;
  for (const r of rules || []) {
    if (!ruleRegex(r.path).test(target)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow, rule: r };
  }
  return best ? { allowed: best.allow, rule: (best.allow ? 'Allow: ' : 'Disallow: ') + best.rule.path } : { allowed: true, rule: null };
}

// ---------------------------------------------------------- the kept copy ---

function readKept(host, dir = DIR) {
  try {
    const meta = JSON.parse(fs.readFileSync(fileFor(host, '.json', dir), 'utf8'));
    const text = meta.readable && meta.status === 200 ? fs.readFileSync(fileFor(host, '.txt', dir), 'utf8') : '';
    return { ...meta, text };
  } catch { return null; }
}

function isFresh(meta, now = Date.now()) {
  return !!meta && (now - Date.parse(meta.fetchedAt)) < MAX_AGE_DAYS * 86400e3;
}

/** What a kept record means for the sweep: the wait, the rules, and a line for the log. */
function interpret(meta) {
  if (!meta) return { known: false, crawlDelay: null, rules: [], says: 'never read' };
  if (!meta.readable) return { known: false, crawlDelay: null, rules: [], says: `unreadable (${meta.why}) — asks nothing we can see` };
  if (meta.status === 404) return { known: true, crawlDelay: null, rules: [], says: 'no robots.txt (404) — asks nothing' };
  const p = parseRobots(meta.text);
  const n = p.rules.filter(r => !r.allow).length;
  return {
    known: true, crawlDelay: p.crawlDelay, rules: p.rules,
    says: `${p.crawlDelay != null ? `asks ${p.crawlDelay}s between requests` : 'states no delay'}, ${n} path(s) off-limits`,
  };
}

// -------------------------------------------------------------- fetching ---

// A bot check served with 200 is not a robots.txt. Cloudflare's carries these.
const CHALLENGE = /just a moment|cf-chl|challenge-platform|attention required/i;

async function fetchRobots(host, { fetchImpl, agent } = {}) {
  const f = fetchImpl || require('node-fetch');
  const url = `https://${host}/robots.txt`;
  const at = new Date().toISOString();
  try {
    const r = await f(url, { agent, headers: { 'user-agent': UA, accept: 'text/plain,*/*' }, redirect: 'follow', timeout: 20000 });
    const text = await r.text();
    const server = r.headers.get('server') || '';
    if (r.status === 404) return { meta: { host, url, fetchedAt: at, status: 404, readable: true, server }, text: '' };
    if (r.status !== 200) return { meta: { host, url, fetchedAt: at, status: r.status, readable: false, why: `HTTP ${r.status}`, server }, text };
    if (CHALLENGE.test(text) || /<html/i.test(text.slice(0, 500))) {
      return { meta: { host, url, fetchedAt: at, status: 200, readable: false, why: 'a web page came back, not a robots.txt (bot check?)', server }, text };
    }
    return { meta: { host, url, fetchedAt: at, status: 200, readable: true, server }, text };
  } catch (e) {
    return { meta: { host, url, fetchedAt: at, status: null, readable: false, why: String(e.message).slice(0, 100) }, text: '' };
  }
}

function keep(host, got, dir = DIR) {
  fs.mkdirSync(dir, { recursive: true });
  const meta = { ...got.meta, ...(got.meta.readable && got.meta.status === 200 ? { sha: require('crypto').createHash('sha1').update(got.text).digest('hex').slice(0, 12) } : {}) };
  fs.writeFileSync(fileFor(host, '.json', dir), JSON.stringify(meta, null, 2) + '\n');
  if (got.meta.readable && got.meta.status === 200) fs.writeFileSync(fileFor(host, '.txt', dir), got.text);
  return meta;
}

/**
 * For a sweep: the kept record for this venue's host, reading the site again
 * only if it is missing or older than a week. `offline` never fetches (fixtures).
 */
async function robotsFor(baseUrl, { agent, fetchImpl, offline = false, now, dir = DIR } = {}) {
  const host = hostOf(baseUrl);
  let meta = readKept(host, dir), fetched = false;
  if (!offline && !isFresh(meta, now)) {
    const got = await fetchRobots(host, { agent, fetchImpl });
    keep(host, got, dir);
    meta = { ...readKept(host, dir) };
    fetched = true;
  }
  return { host, fetched, ...interpret(meta), fetchedAt: meta && meta.fetchedAt };
}

module.exports = { parseRobots, isAllowed, interpret, robotsFor, fetchRobots, readKept, isFresh, hostOf, DIR, MAX_AGE_DAYS };

// ------------------------------------------------------------------- CLI ---

if (require.main === module) {
  (async () => {
    const { VENUES } = require('./sweep_prototype.js');
    const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
    const agent = PROXY ? new (require('https-proxy-agent').HttpsProxyAgent)(PROXY) : undefined;
    const report = process.argv.includes('--report');
    const byHost = {};
    for (const [code, v] of Object.entries(VENUES)) (byHost[hostOf(v.base)] = byHost[hostOf(v.base)] || []).push(code);
    const hosts = Object.keys(byHost);
    let i = 0;
    for (const host of hosts) {
      i++;
      const r = await robotsFor('https://' + host, { agent, offline: report });
      console.log(`[${i}/${hosts.length}] ${byHost[host].join(', ').padEnd(26)} ${r.fetched ? 'read now ' : 'kept copy'}  ${r.says}`);
    }
  })();
}
