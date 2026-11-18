#!/usr/bin/env node
/*
 * structure_check.proof.js — the layout check (build/structure_check.js) proven by planted faults: one in
 * every rule it enforces, each caught by that rule; and the changes it must let through, let through.
 * Run through the watched runner: node scraper/run_tests.js --prove structure_check
 */
'use strict';
const path = require('path');
const { proof, addPiece } = require('./kit.js');

const P = proof('the layout check');
const check = () => P.run([path.join(__dirname, '..', 'structure_check.js'), '--root', P.root]);
const up = name => new RegExp('^FAIL .*names ' + name + ', defined in app/screens/.*a part may not name a higher one');

P.control('ST-00', 'the parts as they are', [], check, /^PASS  structure/m);
P.fault('ST-01', 'a foundation part names a screen piece inside a function body',
  [['app/foundations/text.jsx', addPiece('plantedUp', 'function plantedUp(){ return Toolbar; }')]], check, up('Toolbar'));
P.fault('ST-02', 'a connection names a screen piece as a shorthand property',
  [['app/connections/web.jsx', addPiece('plantedShort', 'function plantedShort(){ return { DiagnosticBox }; }')]], check, up('DiagnosticBox'));
P.fault('ST-03', 'a log part names a screen piece at its top level',
  [['app/logs/quarantine.jsx', addPiece('plantedTop', 'const plantedTop = SavePanel;')]], check, up('SavePanel'));
P.fault('ST-04', 'a foundation part names a feature part',
  [['app/foundations/isbn.jsx', addPiece('plantedFeature', 'function plantedFeature(){ return lookupCatalogue; }')]], check,
  /^FAIL .*app\/foundations\/isbn\.jsx \(level 1\) names lookupCatalogue, defined in app\/lookup\/.*\(level 4\)/);
P.fault('ST-05', 'a connection names a saving part',
  [['app/connections/claude.jsx', addPiece('plantedSaving', 'function plantedSaving(){ return cloudGzip; }')]], check,
  /^FAIL .*app\/connections\/claude\.jsx \(level 2\) names cloudGzip, defined in app\/saving\/cloud\.jsx \(level 3\)/);
P.fault('ST-06', 'a part in a folder that has no level',
  [['app/misc/planted.jsx', addPiece('plantedMisc', 'const plantedMisc = 1;')]], check, /^FAIL  app\/misc\/planted\.jsx: its folder has no level/);
P.fault('ST-07', 'a feature part asks for the store itself (useCap("db"))',
  [['app/import/csv.jsx', addPiece('plantedDb', 'async function plantedDb(){ return await useCap("db"); }')]], check,
  /^FAIL  app\/import\/csv\.jsx line \d+ calls useCap\("db"\) — only app\/connections\/store\.jsx reaches the store/);
P.fault('ST-08', 'a ledger part reads a store record (.doc()',
  [['app/ledger/marks.jsx', addPiece('plantedDoc', 'function plantedDoc(db){ return db.doc("x"); }')]], check,
  /^FAIL  app\/ledger\/marks\.jsx line \d+ calls \.doc\( — only/);
P.fault('ST-09', 'a saving part lists a store collection (.collection()',
  [['app/saving/file.jsx', addPiece('plantedColl', 'function plantedColl(db){ return db.collection("x"); }')]], check,
  /^FAIL  app\/saving\/file\.jsx line \d+ calls \.collection\( — only/);
const HOOKS = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useReducer', 'useLayoutEffect', 'useContext'];
HOOKS.forEach((h, k) => P.fault('ST-' + (10 + k), `a feature part uses the React hook ${h}`,
  [['app/periods/periods.jsx', addPiece('plantedHook', `function plantedHook(){ return ${h}(null); }`)]], check,
  new RegExp('^FAIL  app/periods/periods\\.jsx line \\d+ uses the React hook ' + h + ' — only the parts in app/screens/')));
P.fault('ST-18', 'a foundation part draws an element (JSX)',
  [['app/foundations/isbn.jsx', addPiece('plantedJsx', 'function plantedJsx(){ return <div className="x"></div>; }')]], check,
  /^FAIL  app\/foundations\/isbn\.jsx line \d+ contains JSX/);
P.fault('ST-19', 'a lookup part draws a self-closing element',
  [['app/lookup/card_text.jsx', addPiece('plantedSelf', 'function plantedSelf(){ return <br/>; }')]], check,
  /^FAIL  app\/lookup\/card_text\.jsx line \d+ contains JSX/);
P.fault('ST-20', 'a shop-finder part draws a fragment',
  [['app/shop_finder/museum_shop.jsx', addPiece('plantedFrag', 'function plantedFrag(){ return <></>; }')]], check,
  /^FAIL  app\/shop_finder\/museum_shop\.jsx line \d+ contains JSX/);

P.control('ST-C1', 'a screen name in a comment and in a string is not a reference',
  [['app/foundations/text.jsx', addPiece('plantedWords', '// Toolbar, SavePanel\nconst plantedWords = "Toolbar";')]], check);
P.control('ST-C2', 'a local name that shadows a screen piece is not a reference',
  [['app/foundations/text.jsx', addPiece('plantedLocal', 'function plantedLocal(){ const Toolbar = 1; return Toolbar; }')]], check);
P.control('ST-C3', 'a feature part naming another feature part is listed, not failed',
  [['app/periods/periods.jsx', addPiece('plantedSide', 'function plantedSide(){ return lookupCatalogue; }')]], check,
  /^ {6}app\/periods\/periods\.jsx names lookupCatalogue/m);
P.control('ST-C4', 'a screen part may use hooks, JSX and lower parts',
  [['app/screens/floating.jsx', addPiece('plantedScreen', 'function PlantedScreen(){ const [a] = useState(cloudGzip); return <div className={a}></div>; }')]], check);
P.done();
