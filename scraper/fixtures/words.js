/**
 * The app's words list, as the page holds it (app/foundations/words.jsx, joined into Cat_Watch.jsx).
 *
 * A test that looks for one of the app's sentences reads it here, never retypes it, so a change of
 * wording is made once, in the list, and the tests follow (docs/restructure.md, "The words list").
 * build/words_check.js fails a test file that writes out a sentence the list holds.
 *
 *   const { WORDS, say, wordsRe } = require('./words.js');
 *   t.includes(WORDS.stillInShop)            // a whole sentence
 *   say(WORDS.stillToDecide, { n: 3 })       // a pattern, its gaps filled
 *   wordsRe(WORDS.noLongerInShop)            // the sentence as a pattern to search for, word for word
 *   wordsSource(src) + lifted                // a piece of the page run on its own, with the list it names
 *
 * Not a test itself: the runner never runs it.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');

// The list and its filler (W, say, sayParts) as the page writes them: for a test that lifts part of the
// page and runs it on its own, put this in front of what it lifts.
function wordsSource(src) {
  const a = src.indexOf('const W={');
  const b = src.indexOf('\n};', a);
  const f = src.indexOf('function say(');
  const g = src.indexOf('function sayParts(');
  const h = src.indexOf('\n}\n', g);
  if (a < 0 || b < 0 || f < 0 || g < 0 || h < 0) throw new Error('words.js: the words list or say() was not found in Cat_Watch.jsx');
  return src.slice(a, b + 3) + '\n' + src.slice(f, h + 2) + '\n';
}

// eslint-disable-next-line no-new-func
const fromPage = src => new Function(wordsSource(src) + 'return { WORDS: W, say };')();

const { WORDS, say } = fromPage(fs.readFileSync(JSX, 'utf8'));

// A sentence as a pattern that finds it word for word (what a test's /…/ did).
const wordsRe = (text, flags) => new RegExp(String(text).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), flags || '');

module.exports = { WORDS, say, wordsRe, wordsSource };
