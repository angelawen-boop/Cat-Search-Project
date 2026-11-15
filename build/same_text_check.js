#!/usr/bin/env node
/*
 * same_text_check.js — proves the app-side round (docs/restructure.md, "Round app side") changed no sentence,
 * prompt or pattern the app shows, sends or reads: the old page (`git show <base>:Cat_Watch.jsx`, default
 * main) beside the new Cat_Watch.jsx, each transpiled and lifted as scraper/fixtures/catalogue_lookup.js does.
 *
 *   node build/same_text_check.js [--base <ref>]      exit 1 on any difference
 *
 * Proved two ways:
 *  1. By the text in the code (every top-level piece in both pages). The string and pattern literals of a
 *     piece are read in source order and joined. In the new page a name that exists only there (a constant
 *     or helper this round made) stands for what it holds: a constant for its value, a helper for its own
 *     literals. The old and the new join must be equal. This covers the texts inside the async functions
 *     that need the network (the lookup's prompts, the shop finder's questions, the cloud jobs' sentences).
 *  2. By calling both on the same inputs and comparing the results: the store's sentences, the snapshot
 *     titles, the cloud jobs with no store, Claude's prompts for a page and for the facts round, the
 *     version notes, the unreadable-date note, the ISBN readers and the host clean-up.
 * Pieces whose join differs on purpose (the ISBN patterns merged into one, written with a look-behind, the
 * web-address strip, the answer checks, whose accent strip the keys round made KEYS.stripAccents, and the
 * starter set, whose IDs come from showId or are written out in SEED_IDS) are in
 * BY_CALLS and are held to way 2 only. A name standing for a function (`const stripAccents=KEYS.stripAccents`)
 * is read by the literals of that function's source. The pieces the scraper-side round made
 * name scraper/pro_forma.js, and the date reader whose month lists it builds from one list, are in
 * BY_SWEEP_CHECK and are held by build/sweep_same_check.js, which calls old and new on the sweep files on disk.
 * A member of a new shared object (`PRO_FORMA.later`) is read as what it holds.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ts = require('typescript');
const React = require('react');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const base = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'main';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-same-'));

function transpile(name, jsx) {
  const src = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
    + jsx.replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){');
  const f = path.join(tmp, name + '.tsx');
  fs.writeFileSync(f, src);
  try { execFileSync('npx', ['tsc', f, '--jsx', 'react', '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' }); } catch { /* the emit is what matters */ }
  return fs.readFileSync(path.join(tmp, name + '.js'), 'utf8');
}
const oldCode = transpile('old', execFileSync('git', ['show', base + ':Cat_Watch.jsx'], { cwd: ROOT, maxBuffer: 1 << 28 }).toString());
const newCode = transpile('new', fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8'));

// A page's names, reachable by name: get('snapTitle'), get('READ_RULES').
function lift(code) {
  const win = { document: {}, localStorage: {}, claude: {} };
  return new Function('React', 'window', 'document', 'localStorage', code + '\n;return n => eval(n);',
  )(React, win, win.document, win.localStorage);
}
const O = lift(oldCode), N = lift(newCode);

let failures = 0;
const pass = m => console.log('PASS  ' + m);
const fail = m => { console.log('FAIL  ' + m); failures++; };
const show = v => JSON.stringify(v, (k, x) => x instanceof RegExp ? String(x) : x instanceof Set ? [...x] : x);

// ── Way 1: the literals of every top-level piece ─────────────────────────────
function topLevel(code) {
  const sf = ts.createSourceFile('p.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const out = new Map();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) out.set(st.name.text, st);
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) out.set(d.name.text, d);
  }
  return { sf, decls: out };
}
const A = topLevel(oldCode), B = topLevel(newCode);
const onlyNew = new Set([...B.decls.keys()].filter(k => !A.decls.has(k)));

// Pieces the round made a name of, in the old page too: both pages read them as what they hold.
const INLINE_BOTH = new Set(['HOUSE_SPLIT']);
// `\D` and `[^0-9]` are the same pattern; both are read as `\D`.
const patternText = src => (src === '[^0-9]' ? '\\D' : src);
const isFn = d => ts.isFunctionDeclaration(d) || (d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)));

function literals(node, page) {
  const { decls, sf, get, only } = page;
  let out = '';
  const take = (name, seen) => {
    const d = decls.get(name);
    if (isFn(d)) { if (!seen.has(name)) { seen.add(name); literals1(d, seen); seen.delete(name); } }
    else { const v = get(name); if (typeof v === 'function') member(v); else out += v instanceof RegExp ? patternText(v.source) + v.flags : String(v); }
  };
  const wanted = n => ts.isIdentifier(n) && (only.has(n.text) || INLINE_BOTH.has(n.text)) && decls.has(n.text)
    && !(n.parent.name === n && (ts.isVariableDeclaration(n.parent) || ts.isFunctionDeclaration(n.parent)));
  // A member of a shared object: a function by the literals of its own source, a value as itself.
  const member = v => {
    if (typeof v !== 'function') { out += v instanceof RegExp ? patternText(v.source) + v.flags : String(v); return; }
    const f = ts.createSourceFile('m.js', '(' + v.toString() + ')', ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const visit = n => {
      if (ts.isStringLiteralLike(n)) out += n.text;
      else if (ts.isTemplateExpression(n)) { out += n.head.text; for (const t of n.templateSpans) { visit(t.expression); out += t.literal.text; } return; }
      else if (ts.isRegularExpressionLiteral(n)) out += patternText(n.text.replace(/\/[a-z]*$/, '').slice(1)) + (n.text.match(/\/([a-z]*)$/) || [])[1];
      ts.forEachChild(n, visit);
    };
    visit(f);
  };
  const literals1 = (root, seen) => {
    const visit = n => {
      if (ts.isStringLiteralLike(n)) out += n.text;
      else if (ts.isTemplateExpression(n)) { out += n.head.text; for (const t of n.templateSpans) { visit(t.expression); out += t.literal.text; } return; }
      else if (ts.isRegularExpressionLiteral(n)) out += patternText(n.text.replace(/\/[a-z]*$/, '').slice(1)) + (n.text.match(/\/([a-z]*)$/) || [])[1];
      else if (ts.isPropertyAccessExpression(n) && wanted(n.expression) && !isFn(decls.get(n.expression.text))) { member(get(n.expression.text)[n.name.text]); return; }
      else if (wanted(n)) { take(n.text, seen); return; }
      else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && wanted(n.expression)) { n.arguments.forEach(visit); take(n.expression.text, seen); return; }
      ts.forEachChild(n, visit);
    };
    ts.isVariableDeclaration(root) ? visit(root.initializer || root) : ts.forEachChild(root, visit);
  };
  out = '';
  literals1(node, new Set());
  return out;
}
const pageA = { ...A, get: n => O(n), only: new Set() }, pageB = { ...B, get: n => N(n), only: onlyNew };

// The ISBN patterns merged into one, written with a look-behind, and the new helper itself: by calls only.
const BY_CALLS = new Set(['isbnInResults', 'isbnsIn', 'withoutWww', 'ANSWER_CHECK', 'buildSeed']);
const BY_SWEEP_CHECK = new Set(['DATES', 'proFormaCsv', 'csvParse', 'isMarkerRow', 'topicOf', 'mergeSweepLog']);
let same = 0;
for (const [name, a] of A.decls) {
  const b = B.decls.get(name);
  if (!b) { fail('piece "' + name + '" is gone from the new page'); continue; }
  if (BY_CALLS.has(name) || BY_SWEEP_CHECK.has(name)) continue;
  const x = literals(a, pageA), y = literals(b, pageB);
  if (x === y) same++;
  else {
    let i = 0; while (x[i] === y[i]) i++;
    fail('"' + name + '" holds different text: …' + JSON.stringify(x.slice(Math.max(0, i - 30), i + 50)) + ' / …' + JSON.stringify(y.slice(Math.max(0, i - 30), i + 50)));
  }
}
if (!failures) pass('the text of ' + same + ' pieces is the same, old page and new (' + onlyNew.size + ' new names read as what they hold)');

// ── Way 2: calling both on the same inputs ───────────────────────────────────
const sameCall = async (label, f) => {
  let x, y;
  try { x = show(await f(O)); } catch (e) { x = 'THROWS ' + e.message; }
  try { y = show(await f(N)); } catch (e) { y = 'THROWS ' + e.message; }
  x === y ? pass(label) : fail(label + ' — old ' + x + ' / new ' + y);
};

(async () => {
  for (const c of ['no_store', 'read_only', 'unread', 'other']) await sameCall('storeNo(' + c + ')', g => g('storeNo')(c));
  for (const v of ['STORE_UNREACHED']) if (N(v) !== O('storeNo')('no_store').message) fail(v + ' is not the old sentence'); else pass(v + ' is the old sentence');
  const snaps = [
    { kind: 'manual', label: 'My save', at: '2026-10-01T10:00:00Z' },
    { kind: 'safety', label: 'Before rolling back to Safety snapshot before roll-back to snapshot of 1 Oct', at: '2026-10-03T10:00:00Z' },
    { kind: 'safety', label: 'Before rolling back to Cloud copy before Load', at: '2026-10-04T10:00:00Z' },
    { kind: 'safety', label: 'Cloud copy before roll-back to something', at: '2026-10-05T10:00:00Z' },
    { kind: 'safety', label: 'Safety snapshot before roll-back to snapshot of 2 Oct', at: '2026-10-06T10:00:00Z' },
    { kind: 'safety', label: '', at: '2026-10-07T10:00:00Z' },
  ];
  for (const s of snaps) await sameCall('snapTitle ' + show(s.label), g => g('snapTitle')(s, snaps));
  const oldLabel = /label:\s*"([^"]*)"\s*\+\s*localReadable/.exec(oldCode);
  const at = '2026-10-01T10:00:00Z';
  // Against a base that already makes the label in rollbackSafetyLabel, the two are called side by side.
  const oldMade = oldLabel ? oldLabel[1] + O('localReadable')(at) : (() => { try { return O('rollbackSafetyLabel')(at); } catch { return null; } })();
  oldMade && N('rollbackSafetyLabel')(at) === oldMade ? pass('a roll-back\'s safety label') : fail('a roll-back\'s safety label differs');
  await sameCall('cloudOpenRead with no store', g => g('cloudOpenRead')({}));
  await sameCall('cloudSavesRead with no store', g => g('cloudSavesRead')());
  await sameCall('cloudSaveLatest with no store', g => g('cloudSaveLatest')({ busy: false }, () => ({ rows: [], ignored: [] }), () => {}));

  const csv = 'venue_code,title,start_date,end_date,summary,url,notes,swept_at\nmet,A Show,2026-13-45,tomorrow,s,https://x.org/a,,2026-10-15\n';
  await sameCall('a CSV with unreadable dates', g => { const r = g('analyzeProForma')(csv, [], new Set(), {}); return r; });

  const page = { base: 'The Show', between: ['Line one'], raw: 'Body text.', pasted: false, dateLine: '' };
  const pasted = { ...page, pasted: true };
  for (const [label, args] of [['Links', [page, false, 'https://x.org/a', 'met']], ['Links asking the venue', [page, true, 'https://x.org/a', null]], ['Paste', [pasted, false, 'https://x.org/a', 'met']]])
    await sameCall('the Claude item for ' + label, g => g('linkItem')(...args));
  await sameCall('the other-site prompt', g => g('elsewherePrompt')(page, 'https://x.org/a', { venue: 'V', venueCity: 'C', venueCountry: 'K' }));

  const q = (o) => ({ book: 'The Book', show: 'The Show', venue: 'The Museum', isbn: '9781588398130', facts: [], editions: [], earlier: [], ...o });
  const res = [{ title: 'T', url: 'https://a.org/b', excerpts: ['x 9781588398130 y'] }];
  for (const o of [{}, { needTitle: true }, { foreign: true }, { bookPage: { results: res }, facts: res, editions: res, earlier: res }])
    await sameCall('the facts prompt ' + show(Object.keys(o)), g => g('factsPrompt')(q(o)));

  for (const n of ['READ_RULES', 'READ_RULES_FOREIGN', 'READ_SHAPE', 'PAGE_RULES', 'PAGE_SHAPE']) await sameCall(n, g => g(n));
  await sameCall('HOUSE_SPLIT', g => String(g('HOUSE_SPLIT')));
  const pubs = ['A / B', 'Hazan with Louvre', 'Lund Humphries', 'Foo and Bar; Baz'];
  for (const p of pubs) await sameCall('siteOfHouses ' + p, g => g('siteOfHouses')([{ url: 'https://hazan.fr/x' }, { url: 'https://lundhumphries.com/y' }], p, 'met'));
  const vs = [{ lang: 'French', year: 2020, publisher: 'Hazan', isbn13: '9781588398130', title: 'T', pages: 100 }, { lang: 'English', year: 2024, publisher: 'Lund Humphries', isbn13: '9780500000000', title: 'T', pages: 100 }];
  for (const i of [0, 1]) {
    await sameCall('versionNote ' + i, g => g('versionNote')(vs, i, { museumId: 'met', startDate: '2022-05-01' }));
    await sameCall('versionBlock ' + i, g => g('versionBlock')(vs, i, { museumId: 'met', startDate: '2022-05-01', editionPick: 0 }));
  }

  const isbnText = ['ISBN 978-1-58839-813-0 and EAN 9781588398130', 'x9781588398130y 9780500000000', '97815883981300', 'a 9781588398130', '9781588398130 9781588398130'];
  for (const t of isbnText) {
    await sameCall('isbnInResults ' + t, g => g('isbnInResults')([{ title: 'The Book', url: 'https://s.org/p-' + t.replace(/ /g, '-'), excerpts: [t, 'The Book'] }], 'The Book'));
    await sameCall('isbnsIn ' + t, g => g('isbnsIn')({ title: 'x', url: '', excerpts: [t] }));
    await sameCall('isbnInText ' + t, g => g('isbnInText')('9781588398130', t));
    await sameCall('toIsbn13 ' + t, g => [g('toIsbn13')(t), g('toIsbn13')(t, t), g('cleanIsbn')(t), g('fmtIsbn')(t)]);
  }
  for (const t of ['0-8478-9928-9', '9781588398130', null, '', '97-8']) await sameCall('ISBN digits ' + t, g => [g('cleanIsbn')(t), g('fmtIsbn')(t), g('toIsbn13')(t), g('isbn10to13')(t)]);

  const hosts = ['www.Example.org', 'www.shop.courtauld.ac.uk', 'shop.example.com', 'wwwx.example.com', '', null, undefined, 'WWW.A.CO.UK'];
  for (const h of hosts) await sameCall('hosts ' + h, g => [g('bareHost')(h), g('baseDomain')(h), g('occVenueId')(h)]);
  for (const u of ['https://www.a.org/x', 'https://b.org', 'not a url']) await sameCall('addresses ' + u, g => [g('hostOf')(u), g('shopLinkOf')({ shopUrl: u }, null)].map(x => x));

  // The answer checks, on accented and special-letter text (their accent strip is the shared one).
  const said = ['Zurbarán\'s first great retrospective.', 'Les plus grands chefs-d\'œuvre de Hammershøi.', 'Größte Schau, never seen.', 'Miró and Riopelle, côte à côte.'];
  const pageText = 'La première rétrospective de Zurbarán; la plus grande exposition. Größte, største Hammershøi, mai vista.';
  for (const t of said) await sameCall('ANSWER_CHECK ' + t, g => { const c = g('ANSWER_CHECK'); return [c.validateAnswer(t), c.unsupportedClaims(t, pageText), c.rewordsTitle(t, 'Zurbarán'), c.withoutPlaceOpener('Côte à côte. ' + t, 'Miró', ['Côte à côte'])]; });

  await sameCall('the starter set, every show and its ID', g => g('buildSeed')());

  const shopify = '{"collections":[{"id":1,"title":"Books","handle":"books","products_count":12,"description":""},{"id":2,"title":"Empty","handle":"empty","products_count":0},{"id":3,"title":"Cards","handle":"cards"}]}';
  await sameCall('shopifySections', g => g('shopifySections')(shopify, 'https://s.org/'));

  console.log(failures ? '\n' + failures + ' difference(s).' : '\nSAME  every text and pattern the round touched comes out as before.');
  process.exit(failures ? 1 : 0);
})();
