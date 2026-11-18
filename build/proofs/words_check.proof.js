#!/usr/bin/env node
/*
 * words_check.proof.js — the words check (build/words_check.js) proven by planted faults: words written
 * outside the list in every form the check looks for, every fault in the list itself, every wrongly
 * filled pattern, a test writing out an entry's words — each caught by its own rule; and the places it
 * must let through (never shown), let through.
 * Run through the watched runner: node scraper/run_tests.js --prove words_check
 */
'use strict';
const path = require('path');
const { proof, addPiece } = require('./kit.js');

const P = proof('the words check');
const check = () => P.run([path.join(__dirname, '..', 'words_check.js'), '--root', P.root]);
const outside = file => new RegExp('^FAIL  ' + file.replace(/[./]/g, '\\$&') + ':\\d+ words written outside the list');
const LIST = 'app/foundations/words.jsx';
const addEntry = line => was => was.replace('const W={', 'const W={\n  ' + line);
// Entries the proof uses: one with a gap, one without (their text is read from the list, never written here).
const W = new Function(P.read(LIST).replace(/^\/\/@.*$/mg, '') + '\nreturn W;')();
const GAPPED = 'downloadUnconfirmed', PLAIN = 'saveNow';
const plainWords = W[PLAIN];
const screen = 'app/screens/floating.jsx', feature = 'app/lookup/card_text.jsx';

P.control('WC-00', 'the project as it is', [], check, /^PASS  words/m);
// 1. Words outside the list.
P.fault('WC-01', 'words written as JSX text', [[screen, addPiece('PlantedText', 'function PlantedText(){ return <p>Planted words</p>; }')]], check, outside(screen));
['title', 'placeholder', 'aria-label', 'alt'].forEach((a, i) => P.fault('WC-0' + (2 + i), `words in a shown attribute (${a})`,
  [[screen, addPiece('PlantedAttr', `function PlantedAttr(){ return <input ${a}="x"/>; }`)]], check, outside(screen)));
P.fault('WC-06', 'a string holding two words', [[feature, addPiece('plantedTwo', 'const plantedTwo = () => "planted words";')]], check, outside(feature));
P.fault('WC-07', 'a string holding one capitalised word', [[feature, addPiece('plantedCap', 'const plantedCap = () => "Planted";')]], check, outside(feature));
P.fault('WC-08', "a template's text holding words", [[feature, addPiece('plantedTpl', 'const plantedTpl = n => `planted ${n} words`;')]], check, outside(feature));
P.fault('WC-09', 'a string with words and a space at one end', [[feature, addPiece('plantedSpaced', 'const plantedSpaced = n => n + " planted";')]], check, outside(feature));
// 2. The list itself.
P.fault('WC-10', 'an entry no part shows', [[LIST, addEntry('plantedUnused:"A planted entry nobody shows",')]], check, /^FAIL  the entry plantedUnused is on the list but no part shows it/);
P.fault('WC-11', 'two entries holding the same words',
  [[LIST, addEntry('plantedSame:' + JSON.stringify(plainWords) + ',')], [screen, addPiece('PlantedSame', 'function PlantedSame(){ return W.plantedSame; }')]], check,
  new RegExp('^FAIL  two entries hold the same words, (' + PLAIN + ' and plantedSame|plantedSame and ' + PLAIN + ')'));
P.fault('WC-12', 'the list missing', [[LIST, null]], check, /^FAIL  the words list \(app\/foundations\/words\.jsx\) is missing/);
// 3. Patterns.
P.fault('WC-13', 'a pattern filled by say() with another gap than its own',
  [[screen, addPiece('plantedSay', `const plantedSay = () => say(W.${GAPPED},{name:1});`)]], check, new RegExp('^FAIL  ' + screen.replace(/[./]/g, '\\$&') + ':\\d+ fills W\\.' + GAPPED + ' with \\{name\\}; its gaps are \\{file\\}'));
P.fault('WC-14', 'a pattern filled by say() with no gaps given',
  [[screen, addPiece('plantedSayNone', `const plantedSayNone = () => say(W.${GAPPED},{});`)]], check, new RegExp('^FAIL  .*fills W\\.' + GAPPED + ' with \\{\\}; its gaps are \\{file\\}'));
P.fault('WC-15', 'a pattern drawn by <Say> with another gap than its own',
  [[screen, addPiece('PlantedSayTag', `function PlantedSayTag(){ return <Say text={W.${GAPPED}} gaps={{name:1}}/>; }`)]], check, new RegExp('^FAIL  .*fills W\\.' + GAPPED + ' with \\{name\\}'));
P.fault('WC-16', 'a pattern shown with its gaps unfilled',
  [[screen, addPiece('PlantedRaw', `function PlantedRaw(){ return <p>{W.${GAPPED}}</p>; }`)]], check, new RegExp('^FAIL  .*shows W\\.' + GAPPED + ' with its gaps unfilled'));
P.fault('WC-17', 'an entry named that is not on the list',
  [[screen, addPiece('plantedMissing', 'const plantedMissing = () => say(W.plantedNowhere,{});')]], check, /^FAIL  .*names W\.plantedNowhere, which is not on the list/);
// 4. A test writing out an entry's words, as a string and as a pattern.
P.fault('WC-18', "a test writes out an entry's words as a string",
  [['scraper/fixtures/planted_test.js', 'const want = ' + JSON.stringify(plainWords) + ';\n']], check, new RegExp('^FAIL  scraper/fixtures/planted_test\\.js:1 writes out the words of W\\.' + PLAIN));
P.fault('WC-19', "a test writes out an entry's words as a pattern",
  [['scraper/fixtures/planted_test.js', 'const want = /' + plainWords + '/;\n']], check, new RegExp('^FAIL  scraper/fixtures/planted_test\\.js:1 writes out the words of W\\.' + PLAIN));
P.fault('WC-20', "the side-by-side check writes out an entry's words",
  [['build/side_by_side.js', was => was + '\nconst plantedWant = ' + JSON.stringify(plainWords) + ';\n']], check, new RegExp('^FAIL  build/side_by_side\\.js:\\d+ writes out the words of W\\.' + PLAIN));

P.control('WC-C1', 'text under a "Not words:" comment', [[feature, addPiece('plantedNot', '// Not words: asked of the web.\nconst plantedNot = () => "planted words";')]], check);
P.control('WC-C2', 'never-shown places: a class name, a style, a comparison, a search, a console line, a key',
  [[screen, addPiece('PlantedHidden', 'function PlantedHidden(x){ console.log("planted words"); const k = {"Planted key": 1}; if (x === "planted words" || "a b".includes("planted words")) return null; return <div className="planted words" style={{fontFamily:"Planted Serif"}}>{k["Planted key"]}</div>; }')]], check);
P.control('WC-C3', 'a pattern filled with its own gap, and a plain entry shown',
  [[screen, addPiece('PlantedRight', `function PlantedRight(){ return <p>{say(W.${GAPPED},{file:"x"})}{W.${PLAIN}}</p>; }`)]], check);
P.control('WC-C4', "a test reading an entry's words from the list", [['scraper/fixtures/planted_test.js', `const { WORDS } = require('./words.js');\nconst want = WORDS.${PLAIN};\n`]], check);
P.done();
