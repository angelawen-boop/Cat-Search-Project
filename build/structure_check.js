#!/usr/bin/env node
/*
 * structure_check.js — the structure guard (docs/restructure.md, "The guard").
 *
 *   node build/structure_check.js [--root <dir>]
 *
 * Parses every part under app/ with the TypeScript compiler (real identifiers, resolved by the
 * checker; comments and strings never count) and fails when:
 *   1. a part names a top-level name defined in a part of a HIGHER level — even inside a function body.
 *      Levels: foundations 1, connections 2, saving and logs 3, the feature parts (ledger, periods, import,
 *      shop_finder, lookup) 4, screens 5.
 *   2. any part but connections/store.jsx calls useCap("db"), or calls .doc( or .collection( on something.
 *   3. any part outside screens/ uses a React hook (useState, useEffect, useMemo, useCallback, useRef,
 *      useReducer, useLayoutEffect, useContext) or contains JSX: state and drawing are the screens' own.
 * References between different feature parts (level 4) are listed, not failed.
 * Exit 0 when clean, 1 on a violation.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { partFiles } = require('./app_join.js');

const LEVEL = { foundations: 1, connections: 2, saving: 3, logs: 3, ledger: 4, periods: 4, import: 4, shop_finder: 4, lookup: 4, screens: 5 };
const STORE_DOOR = 'connections/store.jsx';

const HOOKS = new Set(['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useReducer', 'useLayoutEffect', 'useContext']);
const SCREENS = 'screens';

const levelOf = file => LEVEL[file.split('/')[0]];

// Top-level names a statement declares.
function declaredNames(st, out) {
  const bind = n => {
    if (ts.isIdentifier(n)) out.push(n);
    else if (ts.isObjectBindingPattern(n) || ts.isArrayBindingPattern(n)) n.elements.forEach(e => { if (!ts.isOmittedExpression(e)) bind(e.name); });
  };
  if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) out.push(st.name);
  else if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach(d => bind(d.name));
}

function check(root) {
  const APP = path.join(root, 'app');
  const files = partFiles(APP);
  const problems = [];
  for (const f of files) if (levelOf(f) === undefined) problems.push(`app/${f}: its folder has no level in build/structure_check.js`);

  // One program over every part. The import line is blanked in memory so each part is a script, and
  // top-level names of different parts resolve to each other as one global scope, as in the joined page.
  const text = {};
  for (const f of files) text[f] = fs.readFileSync(path.join(APP, f), 'utf8').replace(/^import\s[^\n]*$/gm, m => ' '.repeat(m.length));
  const names = f => 'app/' + f;
  const lib = ts.getDefaultCompilerOptions();
  const options = { allowJs: true, checkJs: false, noEmit: true, noLib: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.Latest, types: [], skipLibCheck: true };
  const host = ts.createCompilerHost(options, true);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, lang, ...rest) => {
    const f = files.find(x => path.resolve(root, names(x)) === path.resolve(fileName));
    return f ? ts.createSourceFile(fileName, text[f], lang, true, ts.ScriptKind.JSX) : getSourceFile(fileName, lang, ...rest);
  };
  host.fileExists = fn => files.some(x => path.resolve(root, names(x)) === path.resolve(fn));
  host.readFile = fn => { const f = files.find(x => path.resolve(root, names(x)) === path.resolve(fn)); return f ? text[f] : undefined; };
  const program = ts.createProgram(files.map(f => path.resolve(root, names(f))), options, host);
  const checker = program.getTypeChecker();
  const partOf = sf => { const f = files.find(x => path.resolve(root, names(x)) === path.resolve(sf.fileName)); return f; };
  const topLevel = d => d && (ts.isFunctionDeclaration(d) || ts.isClassDeclaration(d) || ts.isVariableDeclaration(d))
    && (ts.isSourceFile(d.parent) || (ts.isVariableDeclarationList(d.parent) && ts.isVariableStatement(d.parent.parent) && ts.isSourceFile(d.parent.parent.parent)));

  const upward = new Map(), sideways = new Map(), direct = [], screenOnly = [];
  for (const f of files) {
    const sf = program.getSourceFile(path.resolve(root, names(f)));
    const mine = levelOf(f);
    const lineOf = n => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
    const visit = n => {
      if (ts.isIdentifier(n)) {
        let sym = ts.isShorthandPropertyAssignment(n.parent) && n.parent.name === n ? checker.getShorthandAssignmentValueSymbol(n.parent) : checker.getSymbolAtLocation(n);
        const d = sym && (sym.declarations || []).find(topLevel);
        if (d) {
          const g = partOf(d.getSourceFile());
          if (g && g !== f) {
            const key = f + '\u0000' + n.text, theirs = levelOf(g);
            if (theirs > mine) { if (!upward.has(key)) upward.set(key, { from: f, name: n.text, defIn: g, line: lineOf(n), count: 0 }); upward.get(key).count++; }
            else if (theirs === 4 && mine === 4 && g.split('/')[0] !== f.split('/')[0]) { if (!sideways.has(key)) sideways.set(key, { from: f, name: n.text, defIn: g, line: lineOf(n), count: 0 }); sideways.get(key).count++; }
          }
        }
      }
      if (f.split('/')[0] !== SCREENS) {
        if (ts.isIdentifier(n) && HOOKS.has(n.text)) screenOnly.push({ from: f, what: 'uses the React hook ' + n.text, line: lineOf(n) });
        if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) screenOnly.push({ from: f, what: 'contains JSX', line: lineOf(n) });
      }
      if (f !== STORE_DOOR && ts.isCallExpression(n)) {
        const c = n.expression;
        if (ts.isIdentifier(c) && c.text === 'useCap' && n.arguments[0] && (ts.isStringLiteralLike(n.arguments[0])) && n.arguments[0].text === 'db')
          direct.push({ from: f, what: 'useCap("db")', line: lineOf(n) });
        if (ts.isPropertyAccessExpression(c) && (c.name.text === 'doc' || c.name.text === 'collection'))
          direct.push({ from: f, what: '.' + c.name.text + '(', line: lineOf(n) });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }

  for (const u of upward.values())
    problems.push(`app/${u.from} (level ${levelOf(u.from)}) names ${u.name}, defined in app/${u.defIn} (level ${levelOf(u.defIn)}) — a part may not name a higher one (line ${u.line}${u.count > 1 ? `, ${u.count} times` : ''})`);
  for (const d of direct)
    problems.push(`app/${d.from} line ${d.line} calls ${d.what} — only app/${STORE_DOOR} reaches the store`);
  for (const d of screenOnly.filter((d, k, a) => a.findIndex(x => x.from === d.from && x.what === d.what && x.line === d.line) === k))
    problems.push(`app/${d.from} line ${d.line} ${d.what} — only the parts in app/${SCREENS}/ hold state and drawing`);
  return { problems, sideways: [...sideways.values()], parts: files.length };
}

module.exports = { check, LEVEL };

if (require.main === module) {
  const a = process.argv.slice(2), ri = a.indexOf('--root');
  const root = ri >= 0 ? path.resolve(a[ri + 1]) : path.join(__dirname, '..');
  const r = check(root);
  if (r.sideways.length) {
    console.log(`NOTE  ${r.sideways.length} reference(s) between different feature parts (level 4), listed not failed:`);
    for (const s of r.sideways) console.log(`      app/${s.from} names ${s.name} (app/${s.defIn})`);
  }
  if (r.problems.length) {
    for (const p of r.problems) console.log('FAIL  ' + p);
    console.log(`STRUCTURE CHECK FAILED: ${r.problems.length} problem(s) in ${r.parts} parts.`);
    process.exit(1);
  }
  console.log(`PASS  structure: no part names a higher one, only ${STORE_DOOR} reaches the store, and no part outside ${SCREENS}/ uses a hook or JSX (${r.parts} parts)`);
}
