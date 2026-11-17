#!/usr/bin/env node
/*
 * words_check.js — every sentence the app shows her is on the words list (docs/restructure.md, "The words list").
 *
 *   node build/words_check.js [--root <dir>] [--list]
 *
 * The list is app/foundations/words.jsx: WORDS, one entry per sentence, button, label or line she can see;
 * a sentence with a gap (a title, a count, a venue) is a pattern, its gaps written {name} and filled by say().
 * Every other part is parsed with the TypeScript compiler, and the check fails on:
 *   1. text that reads as words written anywhere but the list — JSX text with a letter; a shown attribute
 *      (title, placeholder, aria-label, alt); a string or a template's text holding two words, or one
 *      capitalised word — unless it sits where it is never shown (below);
 *   2. an entry on the list that no part names, or two entries with the same text;
 *   3. a pattern filled with other gaps than its own, or shown with its gaps unfilled;
 *   4. a test that writes out a whole entry's words instead of reading them from the list (scraper/fixtures/words.js).
 * Not words, so not flagged: a CSS value; an attribute she does not see (className, href, accept…); a
 * property's name; a comparison or `case`; what a text is searched for or split on; a console line; and
 * anything under a comment that starts "Not words:" and says why — the wording sent to Claude or the
 * web, the starter set's exhibitions, and the tables of facts that have their own one home (venue,
 * period and theme names).
 * --list prints every flagged text with where it is.  Exit 1 on a failure.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { partFiles } = require('./app_join.js');

const LIST = 'foundations/words.jsx';
// The scraper's own rules and Claude's summary examples, written into the page by the join (build/sync_shared.js).
const SCRAPERS = 'foundations/shared_with_scraper.jsx';
const SHOWN_ATTRS = new Set(['title', 'placeholder', 'aria-label', 'alt']);
// A literal in these places is looked for, compared or split on — never put on screen.
const LOOKED_FOR = new Set(['includes', 'startsWith', 'endsWith', 'indexOf', 'lastIndexOf', 'split', 'match', 'matchAll', 'search', 'test',
  'getItem', 'setItem', 'removeItem', 'querySelector', 'querySelectorAll', 'closest', 'getAttribute', 'setAttribute', 'removeAttribute',
  'addEventListener', 'removeEventListener', 'createElement', 'matchMedia', 'has', 'get', 'delete']);
const CSS_PROPS = new Set(['padding', 'margin', 'border', 'borderTop', 'borderBottom', 'borderLeft', 'borderRight', 'borderColor', 'borderStyle',
  'boxShadow', 'transition', 'transform', 'fontFamily', 'gridTemplateColumns', 'gridTemplateRows', 'justifyContent', 'alignItems', 'alignSelf',
  'whiteSpace', 'wordBreak', 'overflowWrap', 'display', 'boxSizing', 'cursor', 'fontVariantNumeric', 'touchAction', 'backdropFilter',
  'WebkitBackdropFilter', 'width', 'maxWidth', 'minWidth', 'height', 'maxHeight', 'minHeight', 'flex', 'flexWrap', 'flexDirection',
  'textDecoration', 'outline', 'background', 'backgroundColor', 'color', 'fontWeight', 'fontStyle', 'textTransform', 'textAlign',
  'verticalAlign', 'overflow', 'overflowX', 'overflowY', 'position', 'inset', 'top', 'left', 'right', 'bottom', 'gap', 'animation',
  'letterSpacing', 'lineHeight', 'fontSize', 'opacity', 'zIndex', 'borderRadius', 'filter', 'pointerEvents', 'userSelect', 'resize',
  'textOverflow', 'listStyle', 'objectFit', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom',
  'marginLeft', 'marginRight', 'gridColumn', 'gridRow', 'placeItems', 'scrollBehavior', 'appearance', 'accentColor', 'caretColor', 'font']);
const NOT_WORDS = /^\s*(\/\/|\/\*)\s*Not words:/;

const WORD = String.raw`\p{L}[\p{L}’'\-]*\p{L}`;
const TWO_WORDS = new RegExp(WORD + String.raw`[\s,;:()“”"—–…\-/]+(?:\p{L}|\d)`, 'u');
const ONE_CAPITAL = /^[^\p{L}]*[A-Z][a-z’']+[^\p{L}]*$/u;
const ONE_SPACED = /^\s+\p{L}{2,}[^\p{L}]*$|^[^\p{L}]*\p{L}{2,}\s+$/u;
const ADDRESS = /^\s*(https?:\/\/|www\.|\/[\w/]|\.\w+,|#[\w-]|data:|mailto:|\[data-)/;

// Does this text read as words?
function readsAsWords(t) {
  if (!/\p{L}{2}/u.test(t)) return false;
  // A CSS value: sizes, times and colour or layout functions.
  const css = t.replace(/\b(rgba?|hsla?|calc|minmax|translate[XY]?|scale|blur)\(/g, '(').replace(/-?\d*\.?\d+(px|em|rem|ms|s|vh|vw|fr|deg|%)?/g, '0');
  if (!/\p{L}{2}/u.test(css)) return false;
  if (ADDRESS.test(t) && !/\s/.test(t.trim())) return false;
  // One token with no space (a key, a selector, an address) reads as words only as one capitalised word.
  if (!/\s/.test(t)) return ONE_CAPITAL.test(t);
  return TWO_WORDS.test(t) || ONE_CAPITAL.test(t) || ONE_SPACED.test(t);
}

const nameOf = (n, sf) => n && (ts.isIdentifier(n) || ts.isStringLiteralLike(n) ? n.text : ts.isComputedPropertyName(n) ? null : n.getText(sf));

// Is this literal in a place that is never shown?
function neverShown(n, sf, src) {
  for (let c = n, p = n.parent; p; c = p, p = p.parent) {
    // The comments just before this node (TypeScript's own reader misses one that follows a comma on the same line).
    if (src.slice(c.getFullStart(), c.getStart(sf)).split(/\n|(?=\/\*)/).some(x => NOT_WORDS.test(x))) return true;
    if (ts.isPropertyAssignment(p) && p.name === c) return true;                       // a property's name
    if (ts.isPropertyAssignment(p) && CSS_PROPS.has(nameOf(p.name, sf))) return true;   // a CSS value
    if (ts.isJsxAttribute(p)) {
      const a = p.name.getText(sf);
      if (a === 'style' || !SHOWN_ATTRS.has(a)) return true;
      return false;
    }
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    if (ts.isElementAccessExpression(p) && p.argumentExpression === c) return true;
    if (ts.isCaseClause(p) && p.expression === c) return true;
    if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword].includes(p.operatorToken.kind)) return true;
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
      const callee = p.expression;
      const fn = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : '';
      const obj = ts.isPropertyAccessExpression(callee) ? callee.expression.getText(sf) : '';
      if (obj === 'console') return true;
      if (fn === 'RegExp') return true;
      if ((LOOKED_FOR.has(fn) || fn === 'replace' || fn === 'replaceAll') && p.arguments && p.arguments[0] === c) return true;
      if (LOOKED_FOR.has(fn) && fn !== 'get' && fn !== 'has' && fn !== 'delete') return true;
    }
    // Stop at the piece: a top-level statement.
    if (ts.isSourceFile(p)) break;
  }
  return false;
}

function flagged(root) {
  const APP = path.join(root, 'app');
  const out = [];
  for (const f of partFiles(APP)) {
    if (f === LIST || f === SCRAPERS) continue;
    const src = fs.readFileSync(path.join(APP, f), 'utf8');
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
    const at = n => 'app/' + f + ':' + (sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1);
    const flag = (n, text) => out.push({ where: at(n), text: text.replace(/\s+/g, ' ').trim() });
    const visit = n => {
      if (ts.isJsxText(n)) { if (/\p{L}/u.test(n.text) && !neverShown(n, sf, src)) flag(n, n.text); }
      else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        const inShownAttr = ts.isJsxAttribute(n.parent) && SHOWN_ATTRS.has(n.parent.name.getText(sf));
        if ((inShownAttr ? /\p{L}/u.test(n.text) : readsAsWords(n.text)) && !neverShown(n, sf, src)) flag(n, n.text);
      } else if (ts.isTemplateExpression(n)) {
        const text = n.head.text + n.templateSpans.map(s => '{…}' + s.literal.text).join('');
        if ([n.head.text, ...n.templateSpans.map(s => s.literal.text)].some(readsAsWords) && !neverShown(n, sf, src)) flag(n, text);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}

// The list as the page holds it: WORDS evaluated from its part.
function loadWords(root) {
  const src = fs.readFileSync(path.join(root, 'app', LIST), 'utf8');
  const WORDS = new Function(src + "\nreturn W;")();
  return WORDS;
}

function listProblems(root) {
  const WORDS = loadWords(root);
  const problems = [];
  const byText = new Map();
  for (const [k, t] of Object.entries(WORDS)) {
    if (byText.has(t)) problems.push(`two entries hold the same words, ${byText.get(t)} and ${k}: ${t.slice(0, 90)}`);
    else byText.set(t, k);
  }
  const named = new Set();
  for (const f of partFiles(path.join(root, 'app'))) {
    if (f === LIST) continue;
    const src = fs.readFileSync(path.join(root, 'app', f), 'utf8');
    for (const m of src.matchAll(/\bW\.([A-Za-z0-9_]+)/g)) named.add(m[1]);
  }
  for (const k of Object.keys(WORDS)) if (!named.has(k)) problems.push(`the entry ${k} is on the list but no part shows it`);
  problems.push(...gapProblems(root, WORDS));
  problems.push(...testProblems(root, WORDS));
  return { problems, count: Object.keys(WORDS).length };
}

// Every pattern is filled with exactly its gaps: say(W.x, {…}) and <Say text={W.x} gaps={{…}}/> name each {gap}
// the entry has and no other, and an entry with a gap is never shown unfilled (W.x on its own).
function gapProblems(root, WORDS) {
  const slots = t => typeof t === 'string' ? [...new Set([...t.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort() : [];
  const problems = [];
  for (const f of partFiles(path.join(root, 'app'))) {
    if (f === LIST) continue;
    const src = fs.readFileSync(path.join(root, 'app', f), 'utf8');
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
    const at = n => 'app/' + f + ':' + (sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1);
    const entryOf = n => n && ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'W' ? n.name.text : null;
    const keysOf = o => o && ts.isObjectLiteralExpression(o) ? o.properties.map(p => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) ? p.name.text : '?').sort() : null;
    const compare = (n, key, gaps) => {
      if (!(key in WORDS)) { problems.push(`${at(n)} names W.${key}, which is not on the list`); return; }
      const want = slots(WORDS[key]).join(','), got = gaps === null ? '(not an object written out)' : gaps.join(',');
      if (want !== got) problems.push(`${at(n)} fills W.${key} with {${got}}; its gaps are {${want}}`);
    };
    const filled = new Set();
    const visit = n => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'say') {
        const key = entryOf(n.arguments[0]);
        if (key) { filled.add(n.arguments[0]); compare(n, key, keysOf(n.arguments[1])); }
      }
      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === 'Say') {
        const attr = name => n.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(sf) === name);
        const text = attr('text'), gaps = attr('gaps');
        const textExpr = text && text.initializer && text.initializer.expression;
        const key = entryOf(textExpr);
        if (key) { filled.add(textExpr); compare(n, key, keysOf(gaps && gaps.initializer && gaps.initializer.expression)); }
      }
      const key = entryOf(n);
      if (key && !filled.has(n) && slots(WORDS[key]).length && !ts.isCallExpression(n.parent)) problems.push(`${at(n)} shows W.${key} with its gaps unfilled`);
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return problems;
}

// Tests read the app's sentences from the list (scraper/fixtures/words.js), never retype them: a string or a
// plain /…/ in a test that holds a whole entry's words — one with a capital or two words, and no gap — fails.
const TESTS = ['build/side_by_side.js', 'build/blocks_check.js', 'build/test_page_check.js'];
function testProblems(root, WORDS) {
  const byText = new Map();
  for (const [k, v] of Object.entries(WORDS))
    if (typeof v === 'string' && !/\{\w+\}/.test(v) && v.trim().length >= 3 && (/[A-Z]/.test(v) || /\S\s+\S/.test(v))) byText.set(v, k);
  const plain = body => /(^|[^\\])[.*+?^$(){}|[\]]/.test(body) ? null
    : body.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(.)/g, '$1');
  const dir = path.join(root, 'scraper', 'fixtures');
  const files = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter(f => f.endsWith('.js') && f !== 'words.js').map(f => 'scraper/fixtures/' + f).concat(TESTS);
  const problems = [];
  for (const f of files) {
    if (!fs.existsSync(path.join(root, f))) continue;
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const visit = n => {
      let text = null;
      if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n)) text = n.text;
      else if (ts.isRegularExpressionLiteral(n)) { const m = /^\/(.*)\/[a-z]*$/s.exec(n.text); text = m && plain(m[1]); }
      if (text !== null && byText.has(text))
        problems.push(`${f}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1} writes out the words of W.${byText.get(text)} — read them from the list (scraper/fixtures/words.js)`);
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return problems;
}

module.exports = { flagged, listProblems, loadWords, readsAsWords, testProblems };

if (require.main === module) {
  const a = process.argv.slice(2), ri = a.indexOf('--root');
  const root = ri >= 0 ? path.resolve(a[ri + 1]) : path.join(__dirname, '..');
  const words = flagged(root);
  const hasList = fs.existsSync(path.join(root, 'app', LIST));
  const list = hasList ? listProblems(root) : { problems: ['the words list (app/' + LIST + ') is missing'], count: 0 };
  for (const w of words) console.log(`FAIL  ${w.where} words written outside the list: ${w.text.slice(0, 120)}`);
  for (const p of list.problems) console.log('FAIL  ' + p);
  if (words.length || list.problems.length) {
    console.log(`WORDS CHECK FAILED: ${words.length} text(s) outside the list, ${list.problems.length} problem(s) with the list.`);
    process.exit(1);
  }
  console.log(`PASS  words: every sentence the app shows is on the words list (${list.count} entries), each entry used, written once and filled with its own gaps; the tests read them from it`);
}
