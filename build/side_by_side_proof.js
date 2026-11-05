#!/usr/bin/env node
/*
 * side_by_side_proof.js — proof that each side-by-side check catches a change (docs/restructure.md,
 * "The side-by-side check for items that change code"). A check that has never failed proves nothing.
 *
 * On scratch copies of Cat_Watch.jsx in a temporary folder (the real file is never touched), each
 * break is one word changed in a function, reaching one screen or step. The copy is run side by side
 * with the real page under --changes-allowed, where a function's text is set aside, so only the
 * screen and store checks can catch it: the run must fail, and on that break's own check.
 * Then --changes-allowed itself: a renamed local variable and a new function pass; a table's value
 * changed and a new table fail.
 *
 * The real page is run once; the Links read's two pages are fetched live once, through the free
 * Parallel server, and handed to every run.
 *
 *   node build/side_by_side_proof.js          about eight minutes
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SBS = path.join(__dirname, 'side_by_side.js');
const REAL = fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sbs-proof-'));
let bad = 0;
const ok = (c, m, detail) => { if (c) console.log('PASS  ' + m); else { bad++; console.log('FAIL  ' + m + (detail ? '\n' + detail : '')); } };
const node = args => new Promise(resolve => {
  const c = spawn(process.execPath, args, { cwd: ROOT }); let out = '';
  c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { out += d; });
  c.on('close', status => resolve({ status, out }));
});
// One word swapped, where the old text stands exactly once.
const swap = (from, to) => t => {
  const n = t.split(from).length - 1;
  if (n !== 1) throw new Error(`"${from}" is in the page ${n} times, not once`);
  return t.replace(from, to);
};
// A local variable renamed inside one function (never a property: e.code stays).
const rename = (fn, from, to) => t => {
  const i = t.indexOf('function ' + fn + '('), j = t.indexOf('\n}\n', i);
  if (i < 0 || j < 0) throw new Error('no function ' + fn);
  return t.slice(0, i) + t.slice(i, j).replace(new RegExp('(?<![.\\w])' + from + '\\b', 'g'), to) + t.slice(j);
};

// [the check that must catch it, the break]
const BREAKS = [
  ['afterLedger-store', swap('const rec={...w,savedAt:new Date().toISOString(),rows:info.rows,quarantined:', 'const rec={...w,savedAt:new Date().toISOString(),rows:info.rows,quarantine:')],
  ['importPopup', swap(':{width:"fit-content"}', ':{width:"max-content"}')],
  ['importCsv', swap('<button onClick={()=>{setImportMode(null);refreshFileRef.current?.click();}}', '<button onClick={()=>{setImportMode("choose");refreshFileRef.current?.click();}}')],
  ['importLinks', swap('rows={8} disabled={busy}', 'rows={9} disabled={busy}')],
  ['importPages', swap('padding:"8px 52px 8px 10px",minHeight:60', 'padding:"8px 52px 8px 10px",minHeight:61')],
  ['importPaste', swap('aria-label="Text" rows={5}', 'aria-label="Text" rows={6}')],
  ['venueChip', swap('if(venueF.size>0&&', 'if(venueF.size>1&&')],
  ['themeChip', swap('if(themeF.size>0&&', 'if(themeF.size>1&&')],
  ['periodSort', swap('<span style={{fontSize:9.5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{txt}</span>', '<span style={{fontSize:9.6,letterSpacing:"0.1em",textTransform:"uppercase"}}>{txt}</span>')],
  ['cardOpened', swap('disabled={busy} style={{...pBtn,padding:"6px 12px",fontSize:12}}', 'disabled={busy} style={{...pBtn,padding:"6px 12px",fontSize:13}}')],
  ['saveNow', swap('"Local file saved. Extra copy also sent to the cloud."', '"Local file saved. Extra copy also put to the cloud."')],
  ['saveNow-store', swap('kind:"manual",rows:rows.length', 'kind:"manually",rows:rows.length')],
  ['saveNow-download', swap('...(label?{label}:{})},null,2)', '...(label?{label}:{})},null,1)')],
  ['cloudDrawer', swap('{" · "+s.rows+" exhibitions"}', '{" · "+s.rows+" shows"}')],
  ['review', swap('Nothing unusual about these {"\\u2014"} one row in the file', 'Nothing odd about these {"\\u2014"} one row in the file')],
  ['applied', swap('"Import complete. Save it now."', '"Import complete. Save it soon."')],
  ['applied-store', swap('returned:  later(was.returned,', 'returned:  later(was.attempted,')],
  ['reset', swap('" exhibitions) \\u2014 not saved to a file."', '" exhibitions) \\u2014 not saved to any file."')],
  ['reset-store', swap('"Safety snapshot before "+(reason==="reset"?"Reset":"Load")', '"Safety snapshot before "+(reason==="reset"?"Resetting":"Load")')],
  ['readLinks', swap('words.some(w=>w.length>=6)', 'words.some(w=>w.length>=16)')],
  ['readLinks-calls', swap('"The exhibition\'s title, dates and description."', '"The exhibition\'s title, dates and summary."')],
  ['readPages', swap('const title=((doc.querySelector("title")', 'const title=((doc.querySelector("h1")')],
  ['readPages-calls', swap('if(tag==="LI")out.push("* ");', 'if(tag==="LI")out.push("- ");')],
  ['readPaste', swap('return{...page,start:r.start||"",end:r.end||""', 'return{...page,start:r.start||"",end:r.start||""')],
  ['readPaste-calls', swap('raw:String(text).slice(0,LINK_RAW_CHARS)', 'raw:String(text).slice(1,LINK_RAW_CHARS)')],
];
// [what is shown, the change, whether --changes-allowed passes it, the line that must name it when it fails]
const ALLOWED = [
  ['CA-01: a local variable renamed inside a function (mcpTrouble: code → kode)', rename('mcpTrouble', 'code', 'kode'), true],
  ['CA-02: a new function added', t => t + '\nfunction strayHelper(){ return 1; }\n', true],
  ['CA-03: a table\'s value changed (THEMES: jewellery\'s rule → "jewelry")', swap('chip:"fashion",rule:"jewellery"}', 'chip:"fashion",rule:"jewelry"}'), false, /^DIFF  value THEMES:/m],
  ['CA-04: a new table added', t => t + '\nconst strayTable=[1];\n', false, /^DIFF  value strayTable: only in the new version, and it is not a function/m],
];

// Up to three at a time.
async function pool(jobs, n) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) { const k = i++; out[k] = await jobs[k](); } }));
  return out;
}

(async () => {
  const live = path.join(tmp, 'live.json');
  const f = await node([SBS, '--fetch-live', live]);
  const haveLive = f.status === 0;
  ok(haveLive, 'the Links read\'s two pages fetched live through the free Parallel server', f.out.trim());
  const snap = async (name, text) => {
    const jsx = path.join(tmp, name + '.jsx'), out = path.join(tmp, name + '.json');
    fs.writeFileSync(jsx, text);
    const r = await node([SBS, '--snapshot', jsx, out].concat(haveLive ? [live] : []));
    return r.status === 0 ? out : (console.log('could not run ' + name + ': ' + r.out.slice(-600)), null);
  };
  const real = await snap('real', REAL);
  ok(!!real, 'the real page runs');
  if (!real) process.exit(1);
  const cmp = (a, b, allowed) => node([SBS, '--compare', a, b].concat(allowed ? ['--changes-allowed'] : []));

  // The real page against a second run of itself: nothing differs between two runs.
  const again = await snap('again', REAL);
  const same = again && await cmp(real, again, false);
  ok(same && same.status === 0, 'S-00: the real page against a second run of itself is identical', same && same.out.split('\n').filter(l => !/^same /.test(l)).join('\n'));

  const jobs = BREAKS.map(([check, doBreak], k) => async () => {
    let text; try { text = doBreak(REAL); } catch (e) { return [check, null, e.message]; }
    const s = await snap('break' + k, text);
    return [check, s && await cmp(real, s, true)];
  });
  for (const [check, r, why] of await pool(jobs, 3)) {
    if (!r) { ok(false, `S-${check}: the break could not be made or run — ${why || ''}`); continue; }
    const caught = r.out.split('\n').filter(l => /^(DIFF|FAIL)  screen: /.test(l)).map(l => l.replace(/^(DIFF|FAIL)  screen: ([^,\s]+).*$/, '$2'));
    const also = caught.filter(c => c !== check);
    ok(r.status === 1 && caught.includes(check), `S-${check}: a one-word change reaching it fails the check` + (also.length ? ` (also caught by: ${also.join(', ')})` : ''),
      r.out.split('\n').filter(l => !/^same /.test(l)).slice(0, 12).join('\n'));
  }

  const ajobs = ALLOWED.map(([, change], k) => async () => {
    const s = await snap('allowed' + k, change(REAL));
    return s && [await cmp(real, s, true), await cmp(real, s, false)];
  });
  const results = await pool(ajobs, 3);
  ALLOWED.forEach(([name, , passes, line], k) => {
    const r = results[k];
    if (!r) { ok(false, name + ' — could not be run'); return; }
    const [withFlag, without] = r;
    const show = x => x.out.split('\n').filter(l => !/^same /.test(l)).slice(0, 10).join('\n');
    if (passes) {
      ok(withFlag.status === 0, name + ' — passes with --changes-allowed', show(withFlag));
      ok(without.status === 1 && /^DIFF  value /m.test(without.out), name + ' — fails without it, on the value', show(without));
    } else ok(withFlag.status === 1 && line.test(withFlag.out), name + ' — fails with --changes-allowed, named', show(withFlag));
  });

  console.log(bad ? `PROOF FAILED: ${bad}.` : 'PROOF PASSED: every side-by-side check fails on a change that reaches it, and --changes-allowed sets aside only a function\'s text.');
  process.exit(bad ? 1 : 0);
})();
