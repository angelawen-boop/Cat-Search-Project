#!/usr/bin/env node
/*
 * fact_check.js — one copy of every fact (docs/restructure.md, item 4). Two checks, each failing the build:
 *
 *   1. A venue fact written outside the register. In the app's parts, the scraper, the build and the test
 *      files, an object literal is a venue fact when it carries `id: "<venue id>"` beside a name, place or
 *      shop field (name, short, card, chip, city, country, shopHome, shopCatalogues, shopSearch, lookupName),
 *      or when it is keyed by venue ids with a record, a list of names, or a table of four venues or more. The register
 *      (venues/register.js) is the one home; the sweep's recipes (scraper/sweep_prototype.js VENUES) say
 *      only how each venue is swept, and test data that names a venue's shop is listed in ALLOWED below.
 *   2. A sentence, list or rule written twice in the app's parts: a string of 40 characters or more, an
 *      array of four or more strings, or a pattern of 30 characters or more, the same text in two places.
 *      The copies already listed for items 4B–4F (docs/restructure/duplicates.md) are in KNOWN_TWICE, each
 *      to be removed by its item; a new one fails.
 *
 *   node build/fact_check.js [--root <dir>]     exit 1 on a fact written outside its one home
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const FACT_KEYS = new Set(['name', 'short', 'card', 'chip', 'city', 'country', 'shopHome', 'shopCatalogues', 'shopSearch', 'lookupName']);
// Files that may name venues' facts: the register; the sweep's recipes (how each venue is swept, keyed by
// venue, no names or places since 4A); and this check.
const HOMES = new Set(['venues/register.js', 'build/fact_check.js']);
const RECIPES = 'scraper/sweep_prototype.js';
// Test data that holds a venue's record as the store would (a record is what the fixture is about).
const ALLOWED = new Set(['scraper/fixtures/add_by_link.js', 'scraper/fixtures/add_by_page.js', 'scraper/fixtures/add_by_paste.js', 'scraper/fixtures/store_unread.js', 'scraper/venue_register.test.js',
  'scraper/fixtures/cloud_app.js', 'scraper/fixtures/recheck_shop.js', 'scraper/fixtures/catalogue_route.js', 'scraper/fixtures/catalogue_lookup.js']);

function filesUnder(root, dir, re, out = []) {
  const at = path.join(root, dir);
  if (!fs.existsSync(at)) return out;
  for (const e of fs.readdirSync(at, { withFileTypes: true })) {
    const rel = path.join(dir, e.name).split(path.sep).join('/');
    if (e.isDirectory()) { if (!/node_modules|output|chrome_profile/.test(e.name)) filesUnder(root, rel, re, out); }
    else if (re.test(e.name)) out.push(rel);
  }
  return out;
}

const keyText = (n, sf) => n && (ts.isIdentifier(n) || ts.isStringLiteralLike(n) ? n.text : n.getText(sf));
const isLiteral = n => n && (ts.isStringLiteralLike(n) || ts.isArrayLiteralExpression(n) || ts.isObjectLiteralExpression(n) || ts.isRegularExpressionLiteral(n));

function venueFacts(root) {
  const { VENUES } = require(path.join(root, 'venues', 'register.js'));
  const ids = new Set(VENUES.map(v => v.id));
  const files = [...filesUnder(root, 'app', /\.jsx$/), ...filesUnder(root, 'scraper', /\.js$/), ...filesUnder(root, 'build', /\.jsx?$/)]
    .filter(f => !HOMES.has(f));
  const problems = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.JSX : ts.ScriptKind.JS);
    const line = n => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
    const visit = n => {
      if (ts.isObjectLiteralExpression(n)) {
        const props = n.properties.filter(p => ts.isPropertyAssignment(p));
        const idProp = props.find(p => keyText(p.name, sf) === 'id' && ts.isStringLiteralLike(p.initializer) && ids.has(p.initializer.text));
        const facts = props.filter(p => FACT_KEYS.has(keyText(p.name, sf)) && isLiteral(p.initializer));
        if (idProp && facts.length && !ALLOWED.has(f))
          problems.push(`${f}:${line(n)} writes ${idProp.initializer.text}'s ${facts.map(p => keyText(p.name, sf)).join(', ')} — a venue's facts live in venues/register.js`);
        // Keyed by venue: a record with a name, place or shop field, a list of names, or a table of four or
        // more venues' words (OCC_COUNTRY, VENUE_LANGUAGE, Acquavella's galleries were each one).
        const byVenue = props.filter(p => ids.has(keyText(p.name, sf)));
        const factual = v => ts.isObjectLiteralExpression(v) ? v.properties.some(q => ts.isPropertyAssignment(q) && FACT_KEYS.has(keyText(q.name, sf)))
          : ts.isArrayLiteralExpression(v) ? v.elements.length > 0 && v.elements.every(e => ts.isStringLiteralLike(e)) : false;
        const keyed = byVenue.filter(p => factual(p.initializer)).concat(byVenue.filter(p => ts.isStringLiteralLike(p.initializer)).length >= 4 ? byVenue.filter(p => ts.isStringLiteralLike(p.initializer)) : []);
        const isRecipes = f === RECIPES && ts.isVariableDeclaration(n.parent) && n.parent.name.getText(sf) === 'VENUES';
        if (keyed.length && !isRecipes && !ALLOWED.has(f))
          problems.push(`${f}:${line(n)} keys facts by venue (${keyed.slice(0, 4).map(p => keyText(p.name, sf)).join(', ')}${keyed.length > 4 ? '…' : ''}) — a venue's facts live in venues/register.js`);
        if (isRecipes) for (const p of props) {
          if (!ts.isObjectLiteralExpression(p.initializer)) continue;
          const bad = p.initializer.properties.filter(q => ts.isPropertyAssignment(q) && ['name', 'city', 'locations', 'locationOwner', 'shopHome', 'shopCatalogues', 'shopSearch'].includes(keyText(q.name, sf)));
          if (bad.length) problems.push(`${f}:${line(p)} the ${keyText(p.name, sf)} recipe writes its ${bad.map(q => keyText(q.name, sf)).join(', ')} — a venue's facts live in venues/register.js`);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return problems;
}

// The copies listed for later items (docs/restructure/duplicates.md, 4B–4F), by the text they share and the
// item that removes them; a copy removed is taken off this list.
const KNOWN_TWICE = require('./fact_check_known.json');

function writtenTwice(root) {
  const { partFiles } = require('./app_join.js');
  const seen = new Map();
  for (const f of partFiles(path.join(root, 'app'))) {
    const src = fs.readFileSync(path.join(root, 'app', f), 'utf8');
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
    const add = (kind, text, n) => {
      const k = kind + '\u0000' + text;
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push('app/' + f + ':' + (sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1));
    };
    const visit = n => {
      if (ts.isStringLiteralLike(n) && n.text.length >= 40 && !ts.isImportDeclaration(n.parent)) add('sentence', n.text, n);
      else if (ts.isRegularExpressionLiteral(n) && n.text.length >= 30) add('rule', n.text, n);
      else if (ts.isArrayLiteralExpression(n) && n.elements.length >= 4 && n.elements.every(e => ts.isStringLiteralLike(e)))
        add('list', JSON.stringify(n.elements.map(e => e.text)), n);
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  const problems = [];
  for (const [k, where] of seen) {
    if (where.length < 2) continue;
    const [kind, text] = k.split('\u0000');
    if (KNOWN_TWICE.some(x => x.text === text)) continue;
    problems.push(`a ${kind} written ${where.length} times (${where.join(', ')}): ${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`);
  }
  return problems;
}

function check(root) { return { venue: venueFacts(root), twice: writtenTwice(root) }; }
module.exports = { check, venueFacts, writtenTwice };

if (require.main === module) {
  const a = process.argv.slice(2), ri = a.indexOf('--root');
  const root = ri >= 0 ? path.resolve(a[ri + 1]) : path.join(__dirname, '..');
  const r = check(root);
  for (const p of r.venue) console.log('FAIL  ' + p);
  for (const p of r.twice) console.log('FAIL  ' + p);
  if (r.venue.length || r.twice.length) { console.log(`FACT CHECK FAILED: ${r.venue.length} venue fact(s) outside the register, ${r.twice.length} text(s) written twice.`); process.exit(1); }
  console.log('PASS  facts: every venue fact is in venues/register.js, and no sentence, list or rule is written twice in the app\'s parts (' + KNOWN_TWICE.length + ' copies listed for items 4B–4F)');
}
