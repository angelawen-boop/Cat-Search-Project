/**
 * Cat Watch — Venue Data Audit probe (clean room)
 *
 * Establishes, per venue, whether exhibition data can be had cleanly and what
 * stands in the way. Collects NO exhibitions and writes to no ledger.
 *
 * CLEAN-ROOM RULE: this file contains no venue-specific code. Every venue gets
 * the same checks, in the same order, with the same thresholds. The only
 * per-venue input is a name and a homepage. Search this file for a venue name
 * and you will find it once, in VENUES, and nowhere else.
 *
 * Run: node audit/probe.js [--venue <slug>] [--quick]
 * Out: audit/out/audit_raw.json
 */

const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { parse: parseHtml } = require('node-html-parser');
const fs = require('fs');
const path = require('path');

// ── The only per-venue input ──────────────────────────────────────────────────
const VENUES = [
  { slug: 'met',      name: 'The Metropolitan Museum of Art', home: 'https://www.metmuseum.org/' },
  { slug: 'ng',       name: 'The National Gallery',           home: 'https://www.nationalgallery.org.uk/' },
  { slug: 'rijks',    name: 'Rijksmuseum',                    home: 'https://www.rijksmuseum.nl/en' },
  { slug: 'acq',      name: 'Acquavella Galleries',           home: 'https://www.acquavellagalleries.com/' },
  { slug: 'borghese', name: 'Galleria Borghese',              home: 'https://galleriaborghese.it/' },
  { slug: 'morgan',   name: 'Morgan Library & Museum',        home: 'https://www.themorgan.org/' },
];

const CUTOFF = '2024-07-01';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const POLITE_MS = 2000;
const NAV_TIMEOUT = 30000;

const proxy = process.env.HTTPS_PROXY;
const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

const OUT_DIR = path.join(__dirname, 'out');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Vocabulary (shared by all venues; multilingual, not venue-specific) ───────
const EXHIB_TOKENS = ['exhibition', 'exhibitions', 'mostra', 'mostre', 'tentoonstelling',
  'tentoonstellingen', 'ausstellung', 'exposition', 'whats-on', 'what-s-on', 'on-view',
  'onview', 'te-zien', 'exhibit'];

const BUCKET_TOKENS = {
  current:  ['current', 'now', 'on-view', 'onview', 'on now', 'present', 'presenti', 'presente',
             'nu-te-zien', 'huidige', 'te zien', 'in corso'],
  upcoming: ['upcoming', 'future', 'futuri', 'future', 'coming', 'comingsoon', 'coming-soon',
             'binnenkort', 'toekomstig', 'prossim', 'soon'],
  past:     ['past', 'previous', 'archive', 'archief', 'archivio', 'passate', 'passati',
             'afgelopen', 'verleden', 'geweest', 'former'],
};

const MONTHS = {
  january:1, february:2, march:3, april:4, may:5, june:6, july:7, august:8,
  september:9, october:10, november:11, december:12,
  jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, sept:9, oct:10, nov:11, dec:12,
  gennaio:1, febbraio:2, marzo:3, aprile:4, maggio:5, giugno:6, luglio:7, agosto:8,
  settembre:9, ottobre:10, novembre:11, dicembre:12,
  januari:1, februari:2, maart:3, mei:5, juni:6, juli:7, augustus:8, oktober:10,
};
const MONTH_RE = new RegExp('\\b(' + Object.keys(MONTHS).join('|') + ')\\b', 'i');

// ── Logging ───────────────────────────────────────────────────────────────────
const logLines = [];
function log(msg) {
  const line = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  console.log(line);
  logLines.push(line);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Plain HTTP ────────────────────────────────────────────────────────────────
async function httpGet(url, { timeout = 25000 } = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      agent, redirect: 'follow', timeout,
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    const body = await r.text();
    return { ok: r.ok, status: r.status, finalUrl: r.url, body, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, error: e.message.slice(0, 160), ms: Date.now() - t0 };
  }
}

// ── Reachability classification ───────────────────────────────────────────────
// A page that answers 200 with real markup is reachable plainly. A page that
// answers 200 with almost no text is a shell that needs a browser. Anything
// else is a refusal, and 401/403/429 before any content is a refusal at the door.
function classifyReach(res, html) {
  if (res.status === 0) return { reach: 'error', detail: res.error };
  if ([401, 403, 429, 503].includes(res.status)) {
    return { reach: 'refused', detail: `HTTP ${res.status}`, atDoor: true };
  }
  if (res.status >= 400) return { reach: 'error', detail: `HTTP ${res.status}` };
  const text = html ? (html.querySelector('body')?.text || '').replace(/\s+/g, ' ').trim() : '';
  const links = html ? html.querySelectorAll('a[href]').length : 0;
  if (text.length < 500 || links < 5) {
    return { reach: 'needs-browser', detail: `only ${text.length} chars of text, ${links} links` };
  }
  return { reach: 'plain', detail: `${text.length} chars, ${links} links` };
}

// A URL is exhibition-ish only if a whole path SEGMENT is an exhibition word.
// Substring matching pulled in unrelated pages (a painting's title, a news item).
function hasExhibitionSegment(url) {
  let segs;
  try { segs = new URL(url).pathname.toLowerCase().split('/').filter(Boolean); }
  catch { return false; }
  return segs.some(s => EXHIB_TOKENS.includes(s));
}

// ── Check 2: embedded structured data (JSON-LD) ───────────────────────────────
const EVENT_TYPES = ['event', 'exhibitionevent', 'visualartsevent', 'socialevent', 'eventseries'];

function collectJsonLdNodes(root, out = []) {
  if (!root || typeof root !== 'object') return out;
  if (Array.isArray(root)) { root.forEach(n => collectJsonLdNodes(n, out)); return out; }
  out.push(root);
  for (const k of ['@graph', 'itemListElement', 'item', 'subEvent', 'hasPart', 'mainEntity']) {
    if (root[k]) collectJsonLdNodes(root[k], out);
  }
  return out;
}

function checkJsonLd(html) {
  const result = { present: false, blocks: 0, eventItems: 0, complete: 0, sample: null, types: [] };
  if (!html) return result;
  const scripts = html.querySelectorAll('script[type="application/ld+json"]');
  result.blocks = scripts.length;
  if (!scripts.length) return result;
  result.present = true;
  for (const s of scripts) {
    let data;
    try { data = JSON.parse(s.rawText.trim()); } catch { continue; }
    for (const node of collectJsonLdNodes(data)) {
      const t = [].concat(node['@type'] || []).map(x => String(x).toLowerCase());
      if (!t.length) continue;
      for (const ty of t) if (!result.types.includes(ty)) result.types.push(ty);
      if (!t.some(x => EVENT_TYPES.includes(x))) continue;
      result.eventItems++;
      const has = {
        title: !!node.name,
        start: !!node.startDate,
        end: !!node.endDate,
        url: !!node.url,
        description: !!node.description,
      };
      const n = Object.values(has).filter(Boolean).length;
      if (n === 5) result.complete++;
      if (!result.sample) {
        result.sample = { has, name: node.name || null, startDate: node.startDate || null, endDate: node.endDate || null };
      }
    }
  }
  return result;
}

// ── Check 4: site index (sitemaps) ────────────────────────────────────────────
async function checkSitemap(origin) {
  const out = { found: [], exhibitionUrls: 0, sampleUrls: [], robotsSitemaps: [], notes: [] };

  const robots = await httpGet(new URL('/robots.txt', origin).href, { timeout: 15000 });
  if (robots.ok && robots.body) {
    for (const m of robots.body.matchAll(/^\s*sitemap:\s*(\S+)/gim)) out.robotsSitemaps.push(m[1]);
  }

  const queue = out.robotsSitemaps.length ? [...out.robotsSitemaps] : [new URL('/sitemap.xml', origin).href];
  const seen = new Set();
  const allUrls = [];
  let depth = 0;

  while (queue.length && depth < 40) {
    const sm = queue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm); depth++;
    const r = await httpGet(sm, { timeout: 20000 });
    if (!r.ok || !r.body) { out.notes.push(`${sm} -> ${r.status || r.error}`); continue; }
    out.found.push(sm);
    const isIndex = /<sitemapindex/i.test(r.body);
    const locs = [...r.body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m => m[1]);
    if (isIndex) {
      // Follow only children that look like they could hold exhibitions.
      for (const loc of locs) {
        if (EXHIB_TOKENS.some(t => loc.toLowerCase().includes(t)) || locs.length <= 12) queue.push(loc);
      }
    } else {
      allUrls.push(...locs);
    }
  }

  const exhib = allUrls.filter(u => hasExhibitionSegment(u));
  out.exhibitionUrls = exhib.length;
  out.totalUrls = allUrls.length;
  out.sampleUrls = exhib.slice(0, 5);
  return out;
}

// ── Check 5: feeds ────────────────────────────────────────────────────────────
async function checkFeeds(html, origin) {
  const out = { declared: [], reachable: [] };
  if (html) {
    for (const l of html.querySelectorAll('link[rel="alternate"]')) {
      const type = (l.getAttribute('type') || '').toLowerCase();
      const href = l.getAttribute('href');
      if (href && /rss|atom|xml|calendar/.test(type)) out.declared.push(new URL(href, origin).href);
    }
  }
  for (const guess of ['/feed', '/rss', '/rss.xml', '/feed.xml', '/events.ics']) {
    const u = new URL(guess, origin).href;
    const r = await httpGet(u, { timeout: 12000 });
    if (r.ok && r.body && /<rss|<feed|BEGIN:VCALENDAR/i.test(r.body.slice(0, 800))) out.reachable.push(u);
  }
  out.declared = [...new Set(out.declared)];
  return out;
}

// ── Check 6: politeness file ──────────────────────────────────────────────────
async function checkRobots(origin) {
  const r = await httpGet(new URL('/robots.txt', origin).href, { timeout: 15000 });
  if (!r.ok) return { status: r.status || r.error, disallowAll: null, note: 'not readable' };
  const body = r.body || '';
  const generic = body.split(/user-agent:/i).find(b => b.trim().startsWith('*')) || '';
  const disallows = [...generic.matchAll(/^\s*disallow:\s*(\S*)/gim)].map(m => m[1]);
  return {
    status: r.status,
    disallowAll: disallows.includes('/'),
    disallowCount: disallows.length,
    blocksExhibitionPaths: disallows.some(d => d && EXHIB_TOKENS.some(t => d.toLowerCase().includes(t))),
  };
}

// ── Step 0: find the exhibition listing pages ─────────────────────────────────
function scoreLink(href, text) {
  const h = (href || '').toLowerCase();
  const t = (text || '').toLowerCase().trim();
  let score = 0;
  for (const tok of EXHIB_TOKENS) {
    if (h.includes(tok)) score += 3;
    if (t.includes(tok)) score += 2;
  }
  // Prefer listing pages over individual exhibitions: shallow paths win.
  const segs = h.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean);
  if (score > 0 && segs.length <= 2) score += 2;
  if (segs.length >= 4) score -= 2;
  return score;
}

function bucketOf(href, text) {
  const s = ((href || '') + ' ' + (text || '')).toLowerCase();
  for (const [bucket, toks] of Object.entries(BUCKET_TOKENS)) {
    if (toks.some(t => s.includes(t))) return bucket;
  }
  return null;
}

function findListingCandidates(html, baseUrl) {
  if (!html) return [];
  const origin = new URL(baseUrl).origin;
  const seen = new Map();
  for (const a of html.querySelectorAll('a[href]')) {
    const raw = a.getAttribute('href');
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;
    let url;
    try { url = new URL(raw, baseUrl).href.split('#')[0]; } catch { continue; }
    if (!url.startsWith(origin)) continue;
    const text = a.text.replace(/\s+/g, ' ').trim().slice(0, 80);
    const score = scoreLink(url, text);
    if (score <= 0) continue;
    const prev = seen.get(url);
    if (!prev || score > prev.score) seen.set(url, { url, text, score, bucket: bucketOf(url, text) });
  }
  return [...seen.values()].sort((a, b) => b.score - a.score);
}

// Individual exhibition pages linked from a listing page. An item sits deeper
// than the listing and either lives under the listing's own path or carries an
// exhibition word as a path segment. Bucket pages (past/current/upcoming) are
// listings, not items, so they are excluded.
function findItemLinks(html, listingUrl) {
  if (!html) return [];
  const origin = new URL(listingUrl).origin;
  const listingSegs = new URL(listingUrl).pathname.split('/').filter(Boolean);
  const out = new Map();
  for (const a of html.querySelectorAll('a[href]')) {
    const raw = a.getAttribute('href');
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;
    let u;
    try { u = new URL(raw, listingUrl); } catch { continue; }
    if (u.origin !== origin) continue;
    const url = (u.origin + u.pathname).replace(/\/$/, '') || u.origin;
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length <= listingSegs.length) continue;
    const underListing = listingSegs.every((s, i) => segs[i] === s);
    if (!underListing && !hasExhibitionSegment(url)) continue;
    // The last segment must be a specific thing, not another bucket label.
    const last = (segs[segs.length - 1] || '').toLowerCase();
    if (Object.values(BUCKET_TOKENS).flat().includes(last)) continue;
    if (EXHIB_TOKENS.includes(last)) continue;
    const text = a.text.replace(/\s+/g, ' ').trim().slice(0, 90);
    if (!out.has(url)) out.set(url, { url, text });
  }
  return [...out.values()];
}

// ── Date detection in text ────────────────────────────────────────────────────
function findDatesInText(text) {
  if (!text) return { any: false, monthName: 0, numeric: 0, years: [] };
  const monthName = (text.match(new RegExp(MONTH_RE.source, 'gi')) || []).length;
  const numeric = (text.match(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g) || []).length;
  const years = [...new Set((text.match(/\b(19|20)\d{2}\b/g) || []))].sort();
  return { any: monthName > 0 || numeric > 0, monthName, numeric, years };
}

// ── Step 2 helpers ────────────────────────────────────────────────────────────
function findPagingAffordances(html) {
  if (!html) return { paging: false, loadMore: false, yearFilters: 0, kinds: [] };
  const kinds = [];
  const bodyText = (html.querySelector('body')?.text || '').toLowerCase();
  const hrefs = html.querySelectorAll('a[href]').map(a => (a.getAttribute('href') || '').toLowerCase());
  const paging = hrefs.some(h => /[?&](page|p|offset|start)=/.test(h)) ||
                 !!html.querySelector('[class*="pagin"],[class*="Pagin"],nav[aria-label*="agina" i]');
  if (paging) kinds.push('paging');
  const loadMore = /load more|show more|meer laden|carica altri|see more/.test(bodyText) ||
                   !!html.querySelector('button[class*="load" i],button[class*="more" i]');
  if (loadMore) kinds.push('load-more');
  const yearFilters = hrefs.filter(h => /[?&](year|date|anno|jaar)=\d{4}\b/.test(h) || /\/(19|20)\d{2}\/?$/.test(h)).length;
  if (yearFilters) kinds.push('year-filters');
  return { paging, loadMore, yearFilters, kinds };
}

function extractDescription(html) {
  if (!html) return { chars: 0, paragraphs: 0 };
  // Longest run of <p> text on the page, ignoring tiny fragments.
  const ps = html.querySelectorAll('p')
    .map(p => p.text.replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 60);
  return { chars: ps.join(' ').length, paragraphs: ps.length };
}

// ── Browser (only where plain HTTP is not enough) ─────────────────────────────
// The pre-installed Chromium may be a different build number from the one this
// Playwright version expects. Use it rather than downloading another copy.
function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(root)) return undefined;
  for (const d of fs.readdirSync(root).filter(d => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(root, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

async function withBrowser(fn) {
  const { chromium } = require('playwright');
  const executablePath = findChromium();
  if (executablePath) log(`Browser: ${executablePath}`);
  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    proxy: proxy ? { server: proxy } : undefined,
  });
  const ctx = await browser.newContext({ userAgent: UA, ignoreHTTPSErrors: true });
  try { return await fn(ctx); }
  finally { await ctx.close().catch(()=>{}); await browser.close().catch(()=>{}); }
}

async function browserProbe(ctx, url) {
  const page = await ctx.newPage();
  const jsonResponses = [];
  page.on('response', async res => {
    try {
      const ct = (res.headers()['content-type'] || '').toLowerCase();
      if (!ct.includes('json')) return;
      const u = res.url();
      if (/analytics|gtm|segment|sentry|consent|cookie|recaptcha|hotjar/i.test(u)) return;
      const body = await res.text().catch(() => '');
      if (!body || body.length < 200) return;
      let data; try { data = JSON.parse(body); } catch { return; }
      // Exhibition-shaped: an array of objects, or an object holding one.
      const arrays = [];
      const walk = (n, d = 0) => {
        if (d > 4 || !n || typeof n !== 'object') return;
        if (Array.isArray(n)) { if (n.length >= 3 && typeof n[0] === 'object') arrays.push(n); return; }
        for (const v of Object.values(n)) walk(v, d + 1);
      };
      walk(data);
      if (!arrays.length) return;
      const best = arrays.sort((a, b) => b.length - a.length)[0];
      const keys = [...new Set(best.slice(0, 5).flatMap(o => Object.keys(o || {})))].map(k => k.toLowerCase());
      const looksExhibition = keys.some(k => /title|name|heading/.test(k)) &&
                              keys.some(k => /date|start|end|period|from|until/.test(k));
      if (!looksExhibition) return;
      jsonResponses.push({ url: u.slice(0, 200), items: best.length, keys: keys.slice(0, 18) });
    } catch {}
  });

  let status = 0, html = '', error = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    status = resp ? resp.status() : 0;
    await page.waitForTimeout(2500);
    html = await page.content();
  } catch (e) { error = e.message.slice(0, 160); }
  await page.close().catch(()=>{});

  // Dedupe by endpoint path.
  const byPath = new Map();
  for (const j of jsonResponses) {
    const key = j.url.split('?')[0];
    if (!byPath.has(key) || byPath.get(key).items < j.items) byPath.set(key, j);
  }
  return { status, html, error, xhr: [...byPath.values()] };
}

// ── Per-venue run ─────────────────────────────────────────────────────────────
async function auditVenue(venue, ctx, opts) {
  const V = { ...venue, cutoff: CUTOFF, steps: {}, pages: [], detail: null, notes: [] };
  log(`── ${venue.name}`);

  // Step 0 — find the pages, starting from the homepage only.
  const homeRes = await httpGet(venue.home);
  const homeHtml = homeRes.body ? parseHtml(homeRes.body) : null;
  const homeReach = classifyReach(homeRes, homeHtml);
  V.homepage = { requested: venue.home, finalUrl: homeRes.finalUrl || null, status: homeRes.status, ...homeReach };
  log(`   homepage: ${homeReach.reach} (${homeReach.detail || ''})`);

  let candidates = findListingCandidates(homeHtml, homeRes.finalUrl || venue.home);

  // If plain HTTP gave us nothing usable, try the homepage in a browser.
  if (!candidates.length && ctx) {
    log('   homepage yielded no listing links via plain HTTP — retrying in a browser');
    const b = await browserProbe(ctx, venue.home);
    V.homepage.browserStatus = b.status;
    V.homepage.browserError = b.error;
    if (b.html) {
      candidates = findListingCandidates(parseHtml(b.html), venue.home);
      if (candidates.length) V.homepage.foundVia = 'browser';
    }
  } else if (candidates.length) {
    V.homepage.foundVia = 'plain';
  }

  // Second hop. Venues put "past exhibitions" on the exhibitions page, not the
  // homepage, so stopping at the homepage reports an archive as missing when it
  // is simply one click further in. Take the shallowest exhibition hub and look
  // again from there.
  const homeBuckets = ['current','upcoming','past'].filter(b => candidates.some(c => c.bucket === b));
  const hub = candidates
    .filter(c => hasExhibitionSegment(c.url))
    .sort((a, b) => new URL(a.url).pathname.length - new URL(b.url).pathname.length)[0];

  let hubItems = [];
  if (hub && homeBuckets.length < 3) {
    await sleep(POLITE_MS);
    const hres = await httpGet(hub.url);
    let hhtml = hres.body ? parseHtml(hres.body) : null;
    if (ctx && classifyReach(hres, hhtml).reach === 'needs-browser') {
      const b = await browserProbe(ctx, hub.url);
      if (b.html) hhtml = parseHtml(b.html);
    }
    if (hhtml) {
      const deeper = findListingCandidates(hhtml, hub.url);
      const known = new Set(candidates.map(c => c.url));
      for (const d of deeper) if (!known.has(d.url)) candidates.push(d);
      hubItems = findItemLinks(hhtml, hub.url);
    }
    V.steps.hub = { url: hub.url, itemsSeen: hubItems.length };
    log(`   hub: ${hub.url.replace(/^https?:\/\/[^/]+/, '')} -> ${hubItems.length} item links`);
  }

  V.steps.discovery = {
    candidatesFound: candidates.length,
    hubUsed: hub ? hub.url : null,
    buckets: Object.fromEntries(['current','upcoming','past'].map(b =>
      [b, candidates.filter(c => c.bucket === b).length])),
    unbucketed: candidates.filter(c => !c.bucket).length,
    top: candidates.slice(0, 12).map(c => ({ url: c.url, text: c.text, score: c.score, bucket: c.bucket })),
  };
  log(`   discovery: ${candidates.length} candidate listing links ` +
      `(current ${V.steps.discovery.buckets.current}, upcoming ${V.steps.discovery.buckets.upcoming}, past ${V.steps.discovery.buckets.past})`);

  // Pick one page per bucket, plus the hub itself so a single-page venue is covered.
  const chosen = [];
  for (const b of ['current', 'upcoming', 'past']) {
    const pick = candidates.find(c => c.bucket === b);
    if (pick) chosen.push({ ...pick, bucket: b });
  }
  if (hub && !chosen.some(x => x.url === hub.url)) chosen.push({ ...hub, bucket: 'hub' });
  if (!chosen.length && candidates.length) chosen.push({ ...candidates[0], bucket: 'unlabelled' });
  V.itemPool = hubItems;

  // Step 1 — per listing page.
  const origin = new URL(homeRes.finalUrl || venue.home).origin;
  for (const c of chosen) {
    await sleep(POLITE_MS);
    const rec = { bucket: c.bucket, url: c.url, linkText: c.text };
    const res = await httpGet(c.url);
    const html = res.body ? parseHtml(res.body) : null;
    Object.assign(rec, { status: res.status }, classifyReach(res, html));

    rec.jsonLd = checkJsonLd(html);

    if (ctx && (rec.reach === 'needs-browser' || rec.reach === 'plain')) {
      await sleep(POLITE_MS);
      const b = await browserProbe(ctx, c.url);
      rec.browser = { status: b.status, error: b.error, xhrEndpoints: b.xhr };
      if (b.html) {
        const bh = parseHtml(b.html);
        if (rec.reach === 'needs-browser') {
          const after = classifyReach({ status: b.status || 200, ok: true }, bh);
          rec.browserReach = after.reach;
          rec.browserDetail = after.detail;
          if (!rec.jsonLd.present) rec.jsonLd = checkJsonLd(bh);
        }
        rec.paging = findPagingAffordances(bh);
        const t = (bh.querySelector('body')?.text || '').replace(/\s+/g, ' ');
        rec.datesInListing = findDatesInText(t);
        rec.items = findItemLinks(bh, c.url);
        rec.itemCount = rec.items.length;
      }
    } else if (html) {
      rec.paging = findPagingAffordances(html);
      const t = (html.querySelector('body')?.text || '').replace(/\s+/g, ' ');
      rec.datesInListing = findDatesInText(t);
      rec.items = findItemLinks(html, c.url);
      rec.itemCount = rec.items.length;
    }

    V.pages.push(rec);
    log(`   ${c.bucket.padEnd(10)} ${rec.reach.padEnd(14)} ` +
        `jsonld:${rec.jsonLd.eventItems} xhr:${rec.browser?.xhrEndpoints?.length ?? '-'} ` +
        `items:${rec.itemCount ?? 0} dates:${rec.datesInListing?.any ? 'yes' : 'no'} ` +
        `${(rec.paging?.kinds || []).join('+') || ''}`);
  }

  // Checks 4, 5, 6 — site-wide.
  await sleep(POLITE_MS);
  V.steps.sitemap = await checkSitemap(origin);
  log(`   sitemap: ${V.steps.sitemap.found.length} file(s), ${V.steps.sitemap.exhibitionUrls} exhibition-ish URLs`);
  await sleep(POLITE_MS);
  V.steps.feeds = await checkFeeds(homeHtml, origin);
  V.steps.robots = await checkRobots(origin);

  // Step 2 — individual exhibition pages. Sample several, not one: a venue's
  // date availability cannot be judged from a single page. Structured data is
  // checked HERE as well as on the listings, because that is where venues
  // usually put it.
  const pool = [];
  const poolSeen = new Set();
  for (const src of [V.itemPool || [], ...V.pages.map(p => p.items || [])]) {
    for (const it of src) {
      if (!poolSeen.has(it.url)) { poolSeen.add(it.url); pool.push(it); }
    }
  }
  for (const u of (V.steps.sitemap.sampleUrls || [])) {
    if (!poolSeen.has(u) && hasExhibitionSegment(u)) { poolSeen.add(u); pool.push({ url: u, text: '' }); }
  }

  V.details = [];
  const sample = pool.slice(0, opts.quick ? 1 : 3);
  for (const it of sample) {
    await sleep(POLITE_MS);
    let dHtml = null, via = 'plain';
    const dRes = await httpGet(it.url);
    if (dRes.body) dHtml = parseHtml(dRes.body);
    const dReach = classifyReach(dRes, dHtml);
    if (dReach.reach === 'needs-browser' && ctx) {
      const b = await browserProbe(ctx, it.url);
      if (b.html) { dHtml = parseHtml(b.html); via = 'browser'; }
    }
    const text = dHtml ? (dHtml.querySelector('body')?.text || '').replace(/\s+/g, ' ') : '';
    const dates = findDatesInText(text);
    const imgs = dHtml ? dHtml.querySelectorAll('img').length : 0;
    const jsonLd = checkJsonLd(dHtml);
    V.details.push({
      url: it.url, linkText: it.text, status: dRes.status, via, reach: dReach.reach,
      jsonLd,
      datesAsText: dates.any, dateSignals: dates,
      description: extractDescription(dHtml),
      images: imgs,
      // Honest limit: we cannot read pixels. No date in the text on an
      // image-bearing page means the date may be printed inside a picture.
      datesMayBeInImages: !dates.any && imgs >= 1,
    });
    log(`   detail ${dReach.reach.padEnd(13)} jsonld:${jsonLd.complete}/${jsonLd.eventItems} ` +
        `dates:${dates.any} desc:${extractDescription(dHtml).chars}c  ${it.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 52)}`);
  }
  if (!V.details.length) log('   detail: no individual exhibition page could be reached');

  return V;
}

// ── Verdict ───────────────────────────────────────────────────────────────────
function verdictFor(V) {
  const pages = V.pages || [];
  const details = V.details || [];
  const reasons = [];

  // 1. Refused at the door. Nothing downstream can be judged.
  const doorRefusals = [V.homepage, ...pages].filter(p => p && p.atDoor);
  const anythingServed = pages.some(p => p.reach === 'plain' || p.browserReach === 'plain') || details.length;
  if (doorRefusals.length && !anythingServed) {
    return { verdict: 'RED', kind: 'Locked out',
      why: `Refused before any page was served (${[...new Set(doorRefusals.map(p => p.detail))].join(', ')}). A browser does not help; the refusal is at the network.`,
      reasons };
  }

  // 2. Gather every positive signal before judging anything missing.
  const ldComplete = Math.max(0, ...pages.map(p => p.jsonLd?.complete || 0),
                                 ...details.map(d => d.jsonLd?.complete || 0));
  const ldEvents = Math.max(0, ...pages.map(p => p.jsonLd?.eventItems || 0),
                               ...details.map(d => d.jsonLd?.eventItems || 0));
  const ldWhere = details.some(d => (d.jsonLd?.complete || 0) > 0) ? 'exhibition pages'
                : pages.some(p => (p.jsonLd?.complete || 0) > 0) ? 'listing pages' : null;
  const xhr = pages.flatMap(p => p.browser?.xhrEndpoints || []);
  const smExhib = V.steps.sitemap?.exhibitionUrls || 0;
  const feeds = V.steps.feeds?.reachable?.length || 0;
  const items = Math.max(0, ...pages.map(p => p.itemCount || 0), (V.steps.hub?.itemsSeen || 0));

  if (ldComplete) reasons.push(`structured data with all five fields on ${ldWhere} (${ldComplete} sampled)`);
  else if (ldEvents) reasons.push(`structured data present but incomplete (${ldEvents} event item(s))`);
  if (xhr.length) reasons.push(`${xhr.length} data endpoint(s) behind the page`);
  if (smExhib) reasons.push(`${smExhib} exhibition URLs in the site index`);
  if (feeds) reasons.push(`${feeds} feed(s)`);
  if (items) reasons.push(`${items} exhibition links found on listings`);

  // 3. A clean machine-readable source covering all five fields.
  if (ldComplete > 0) {
    return { verdict: 'GREEN', kind: 'Feed',
      why: `Structured data on the ${ldWhere} carries title, start, end, URL and description.`, reasons };
  }

  // 4. Is the past archive reachable at all? Only a real absence counts:
  //    no past listing AND no way to enumerate old exhibitions.
  const pastPage = pages.find(p => p.bucket === 'past');
  const canEnumerate = smExhib > 0 || feeds > 0 || xhr.length > 0;
  if (!pastPage && !canEnumerate) {
    return { verdict: 'RED', kind: 'Not there',
      why: `No past-exhibitions listing was found and there is no site index or feed to enumerate old shows, so ${V.cutoff} looks unreachable.`,
      reasons };
  }
  if (!pastPage && canEnumerate) {
    reasons.push('no past listing found, but old exhibitions are enumerable another way');
  }

  // 5. Dates. Judge on the sample, not on one page, and separate
  //    "no date anywhere" from "date exists but not as text".
  if (details.length) {
    const withDates = details.filter(d => d.datesAsText).length;
    if (withDates === 0) {
      const imagey = details.filter(d => d.datesMayBeInImages).length;
      return { verdict: 'RED', kind: 'There but not as text',
        why: imagey === details.length
          ? `No date in the text of any of the ${details.length} exhibition pages sampled; all carry images, so dates may be printed inside pictures. No text scraper reaches those.`
          : `No date found in the text of any of the ${details.length} exhibition pages sampled.`,
        reasons };
    }
    reasons.push(`dates readable as text on ${withDates} of ${details.length} sampled exhibition pages`);
    if (withDates < details.length) {
      reasons.push(`${details.length - withDates} sampled page(s) had no date in the text`);
    }
    const desc = details.filter(d => (d.description?.chars || 0) > 200).length;
    reasons.push(`descriptive text on ${desc} of ${details.length} sampled pages`);
  } else {
    reasons.push('no individual exhibition page could be sampled');
  }

  return { verdict: 'AMBER', kind: 'Recipe',
    why: 'Reachable and the data is present, but the five fields must be assembled by hand from the page layout.',
    reasons };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const args = process.argv.slice(2);
  const only = args.includes('--venue') ? args[args.indexOf('--venue') + 1] : null;
  const opts = { quick: args.includes('--quick') };
  const list = only ? VENUES.filter(v => v.slug === only) : VENUES;

  log(`Cat Watch venue audit — ${list.length} venue(s), cutoff ${CUTOFF}`);
  log(`Proxy: ${proxy || '(none)'}`);
  log('Note: this runs from a datacenter network. Refusals here may not match a home connection.');

  const results = [];
  await withBrowser(async ctx => {
    for (const v of list) {
      try {
        results.push(await auditVenue(v, ctx, opts));
      } catch (e) {
        log(`   FAILED: ${e.message}`);
        results.push({ ...v, error: e.message, pages: [], steps: {} });
      }
    }
  });

  for (const V of results) V.verdictInfo = V.error
    ? { verdict: 'RED', kind: 'Probe error', why: V.error, reasons: [] }
    : verdictFor(V);

  const out = {
    generatedAt: new Date().toISOString(),
    cutoff: CUTOFF,
    network: 'datacenter (results may differ from a home connection)',
    venues: results,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'audit_raw.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'audit_log.txt'), logLines.join('\n') + '\n');

  log('');
  log('── VERDICTS ──');
  for (const V of results) log(`   ${V.name.padEnd(38)} ${V.verdictInfo.verdict} — ${V.verdictInfo.kind}`);
  log(`Written: ${path.join(OUT_DIR, 'audit_raw.json')}`);
})();
