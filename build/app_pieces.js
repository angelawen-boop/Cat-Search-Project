/*
 * app_pieces.js — cut the app's source into its top-level pieces, and put them back.
 *
 * Used by the restructure tools (docs/restructure.md). A piece is one top-level statement
 * (a function, a constant, the import line, the component) with the comments and blank
 * lines above it. The pieces joined in order give back the file exactly, character for
 * character; `split` refuses to return pieces that do not.
 *
 * The block the join writes from the scraper (between its SHARED markers) is one piece, "SHARED",
 * so the markers never land in two different files. In the part it is a directive line; here, in
 * the joined page, it is the rules' text.
 */
'use strict';
const ts = require('typescript');

const SHARED_OPEN = '// ===== SHARED WITH THE SCRAPER';
const SHARED_CLOSE = '// ===== END SHARED =====';

// The name a piece goes by: what it declares, or for a bare statement its first words.
function pieceId(st, sf) {
  if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) return st.name.text;
  if (ts.isVariableStatement(st)) return st.declarationList.declarations.map(d => d.name.getText(sf)).join(',');
  if (ts.isImportDeclaration(st)) return 'import';
  return 'stmt:' + st.getText(sf).replace(/\s+/g, ' ').slice(0, 40);
}

// Pieces of `src`, in file order: [{ id, text }], plus `tail` (what follows the last one).
function split(src) {
  const sf = ts.createSourceFile('app.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const open = src.indexOf(SHARED_OPEN);
  const closeAt = src.indexOf(SHARED_CLOSE);
  const close = closeAt < 0 ? -1 : closeAt + SHARED_CLOSE.length;
  const pieces = [];
  let pos = 0;
  for (const st of sf.statements) {
    const start = st.getStart(sf);
    if (open >= 0 && start > open && start < close) {
      // Inside the shared block: the whole block is one piece, ending at its closing marker.
      if (!pieces.length || pieces[pieces.length - 1].id !== 'SHARED') {
        pieces.push({ id: 'SHARED', text: src.slice(pos, close) });
        pos = close;
      }
      continue;
    }
    pieces.push({ id: pieceId(st, sf), text: src.slice(pos, st.getEnd()) });
    pos = st.getEnd();
  }
  const tail = src.slice(pos);
  const seen = new Set();
  for (const p of pieces) {
    if (seen.has(p.id)) throw new Error('app_pieces: two pieces share the name "' + p.id + '"');
    seen.add(p.id);
  }
  if (pieces.map(p => p.text).join('') + tail !== src) throw new Error('app_pieces: the pieces do not join back to the file');
  return { pieces, tail };
}

// ── Part files ──────────────────────────────────────────────────────────────
// A part file holds pieces, each opened by a line `//@piece <id>`. Lines before the first
// piece that start with `//@` are the part's own notes for sessions; the join drops them.
const MARK = '//@piece ';

function writePart(notes, pieces) {
  const head = notes.map(l => '//@ ' + l).join('\n');
  return (head ? head + '\n' : '') + pieces.map(p => MARK + p.id + '\n' + p.text + '\n').join('');
}

function readPart(text, file) {
  const out = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].startsWith(MARK)) {
    if (lines[i] !== '' && !lines[i].startsWith('//@')) throw new Error(file + ': line ' + (i + 1) + ' sits outside any piece');
    i++;
  }
  let cur = null, buf = [];
  const flush = () => { if (cur) out.push({ id: cur, text: buf.join('\n').replace(/\n$/, '') }); };
  for (; i < lines.length; i++) {
    if (lines[i].startsWith(MARK)) { flush(); cur = lines[i].slice(MARK.length).trim(); buf = []; }
    else buf.push(lines[i]);
  }
  flush();
  return out;
}

module.exports = { split, writePart, readPart, MARK, SHARED_OPEN, SHARED_CLOSE };
