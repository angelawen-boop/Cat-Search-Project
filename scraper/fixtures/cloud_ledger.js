/**
 * THE CLOUD LEDGER — the storage half, asked directly.
 *
 * Lifts the section between the two prose anchors out of Cat_Watch.jsx (the
 * real code, every run) and drives it against a stand-in store that enforces
 * the platform's own documented limits: 256 KiB per document, whole-document
 * writes, no transactions. Uses her real ledger of 24 Sep
 * (docs/ledger_2026-09-24/) — never a made-up one where hers will do.
 *
 * What it cannot see: the real store, the page, the buttons. Those are the
 * trial's job, on a page she opens.
 *
 *   node scraper/fixtures/cloud_ledger.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'Cat_Watch.jsx'), 'utf8');
const A = '// ── THE CLOUD LEDGER — branch claude/ledger-cloud';
const B = '// ── END OF THE CLOUD LEDGER';
const a = src.indexOf(A), b = src.indexOf(B, a);
if (a < 0 || b < 0) throw new Error('cloud_ledger: anchors not found');
const section = src.slice(a, b);

const load = (partChars) => new Function(`
  ${partChars ? section.replace(/const CLOUD_PART_CHARS=\d+;/, 'const CLOUD_PART_CHARS=' + partChars + ';') : section}
  return {cloudSaveLive,cloudReadLive,cloudTakeSnapshot,cloudListSnapshots,cloudReadSnapshot,
          ledgerFingerprintText,ledgerDifference,cloudTrouble,CLOUD_PART_CHARS,CLOUD_OPENS};`)();

const { fakeStore } = require('./fake_store.js');

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};
const partsIn = (db, coll) => [...db.docs.keys()].filter(k => k.startsWith(coll + '/'));

const HERS = path.join(__dirname, '..', '..', 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json');
const hers = JSON.parse(fs.readFileSync(HERS, 'utf8'));
const textOf = d => JSON.stringify({ rows: d.rows, ignored: d.ignored, lastRun: d.lastRun, savedAt: '2026-09-24T07:00:00.000Z' });
const info = d => ({ rows: d.rows.length, quarantined: d.ignored.length });

(async () => {
  const C = load();
  ok(C.CLOUD_OPENS === false, 'CL-000: the trial switch is off — the app does not open from the cloud by itself');

  // CL-001 — her real ledger goes in and comes back exactly.
  {
    const db = fakeStore();
    const text = textOf(hers);
    const rec = await C.cloudSaveLive(db, text, info(hers), null);
    const back = await C.cloudReadLive(db);
    ok(back.text === text, `CL-001: her ledger (${hers.rows.length} rows, ${hers.ignored.length} quarantined) comes back byte for byte`);
    ok(rec.parts === 1, `CL-001b: it fits in one piece — ${Math.round(rec.bytes / 1024)} KiB as text, ${Math.round(rec.zbytes / 1024)} KiB compressed`, `${rec.parts} parts`);
  }

  // CL-002 — a ledger in several parts takes the same road.
  {
    const C2 = load(20000);
    const db = fakeStore();
    const text = textOf(hers);
    const rec = await C2.cloudSaveLive(db, text, info(hers), null);
    const back = await C2.cloudReadLive(db);
    ok(rec.parts > 1 && back.text === text, `CL-002: split into ${rec.parts} parts, it still comes back exactly`);
  }

  // CL-003 — a save that dies midway leaves the last complete ledger in place.
  {
    const C2 = load(20000);
    const first = textOf(hers);
    const changed = JSON.parse(first); changed.rows[0].watching = !changed.rows[0].watching;
    const second = JSON.stringify(changed);
    let die = false, n = 0;
    const db = fakeStore({ failOnSet: () => die && ++n === 2 });
    const rec1 = await C2.cloudSaveLive(db, first, info(hers), null);
    die = true;
    let threw = false;
    try { await C2.cloudSaveLive(db, second, info(hers), rec1); } catch { threw = true; }
    const back = await C2.cloudReadLive(db);
    ok(threw && back.text === first, 'CL-003: a save cut off after one part — the cloud copy is still the last complete ledger');
  }

  // CL-003b — cut off at the switch itself: same answer.
  {
    const first = textOf(hers);
    const changed = JSON.parse(first); changed.rows[1].interested = !changed.rows[1].interested;
    let die = false;
    const db = fakeStore({ failOnSet: (_, p) => die && p === 'ledger/live' });
    const rec1 = await C.cloudSaveLive(db, first, info(hers), null);
    die = true;
    try { await C.cloudSaveLive(db, JSON.stringify(changed), info(hers), rec1); } catch {}
    const back = await C.cloudReadLive(db);
    ok(back.text === first, 'CL-003b: a save cut off at the switch — the cloud copy is still the last complete ledger');
  }

  // CL-004 — the old pieces go once the switch has moved; nothing piles up.
  {
    const db = fakeStore();
    let rec = null;
    for (let i = 0; i < 5; i++) {
      const d = JSON.parse(textOf(hers)); d.rows[0].title += ' ' + i;
      rec = await C.cloudSaveLive(db, JSON.stringify(d), info(hers), rec);
    }
    ok(partsIn(db, 'ledgerParts').length === rec.parts, `CL-004: after 5 saves the store holds one ledger's pieces, not five`, `${partsIn(db, 'ledgerParts').length} pieces`);
  }

  // CL-005 / 006 — a copy that is not what was written is refused, not shown.
  {
    const db = fakeStore();
    const rec = await C.cloudSaveLive(db, textOf(hers), info(hers), null);
    const key = `ledgerParts/${rec.id}-0`;
    const good = db.docs.get(key);
    // A different, valid compressed text under the same record.
    const other = load(); const db2 = fakeStore();
    const r2 = await other.cloudSaveLive(db2, '{"rows":[],"ignored":[]}', { rows: 0, quarantined: 0 }, null);
    db.docs.set(key, db2.docs.get(`ledgerParts/${r2.id}-0`));
    let code = null; try { await C.cloudReadLive(db); } catch (e) { code = e.code; }
    ok(code === 'fingerprint', 'CL-005: a piece that does not match its fingerprint is refused', code);
    db.docs.set(key, good); db.docs.delete(key);
    code = null; try { await C.cloudReadLive(db); } catch (e) { code = e.code; }
    ok(code === 'missing_part', 'CL-006: a missing piece is refused and named', code);
  }

  // CL-007 — a snapshot that died midway never appears in her list.
  {
    let die = false;
    const db = fakeStore({ failOnSet: (_, p) => die && p.startsWith('snapshots/') });
    await C.cloudTakeSnapshot(db, textOf(hers), { label: 'first', rows: 1, quarantined: 0 });
    die = true;
    try { await C.cloudTakeSnapshot(db, textOf(hers), { label: 'second', rows: 1, quarantined: 0 }); } catch {}
    const list = await C.cloudListSnapshots(db);
    ok(list.length === 1 && list[0].label === 'first', 'CL-007: a snapshot cut off before its listing record is not in the list');
  }

  // CL-008 — snapshots list newest first and read back exactly.
  {
    const db = fakeStore();
    const texts = [];
    for (let i = 0; i < 3; i++) {
      const d = JSON.parse(textOf(hers)); d.rows[0].title += ' v' + i; texts.push(JSON.stringify(d));
      await C.cloudTakeSnapshot(db, texts[i], { label: 'v' + i, rows: d.rows.length, quarantined: 0 });
      await new Promise(r => setTimeout(r, 5));
    }
    const list = await C.cloudListSnapshots(db);
    ok(list.map(s => s.label).join() === 'v2,v1,v0', 'CL-008: snapshots are listed newest first', list.map(s => s.label).join());
    ok(await C.cloudReadSnapshot(db, list[2]) === texts[0], 'CL-008b: the oldest snapshot reads back exactly');
    ok(list.every(s => s.kind === 'manual'), 'CL-008c: a snapshot taken by button is marked as hers, not automatic');
  }

  // CL-009 — "the same ledger" ignores order and stamps, and nothing else.
  {
    const d1 = { rows: hers.rows, ignored: hers.ignored, lastRun: 'x' };
    const d2 = { rows: hers.rows.slice().reverse().map(r => Object.fromEntries(Object.entries(r).reverse())),
                 ignored: hers.ignored.slice().reverse(), lastRun: 'y' };
    ok(C.ledgerDifference(d1, d2) === null, 'CL-009: row order, key order, quarantine order and lastRun do not count as a difference');
    const d3 = JSON.parse(JSON.stringify(d1)); d3.rows[5].watching = !d3.rows[5].watching; d3.rows.pop(); d3.ignored.pop();
    const diff = C.ledgerDifference(d1, d3);
    ok(diff && diff.changed === 1 && diff.onlyA === 1 && diff.onlyB === 0 && diff.quarantineDiffers,
      'CL-009b: one changed, one missing and a quarantine change are each counted', JSON.stringify(diff));
  }

  // CL-010 — room to grow: 2,000 distinct exhibitions with every catalogue field filled.
  {
    const big = { rows: [], ignored: hers.ignored, lastRun: null };
    for (let i = 0; i < 2000; i++) {
      const r = { ...hers.rows[i % hers.rows.length] };
      r.id = 'grow' + i; r.title = r.title + ' — ' + i.toString(36);
      r.summary = (r.summary || '') + ' ' + Math.random().toString(36).repeat(3);
      r.catalogueTitle = r.title + ' catalogue'; r.isbn13 = String(9780000000000 + i * 7919);
      r.publisher = 'Publisher ' + (i % 97); r.publisherUrl = 'https://publisher' + (i % 97) + '.example/books/' + i;
      r.shopUrl = 'https://shop.example/' + i; big.rows.push(r);
    }
    const db = fakeStore();
    const text = JSON.stringify(big);
    const rec = await C.cloudSaveLive(db, text, info(big), null);
    const back = await C.cloudReadLive(db);
    ok(back.text === text, `CL-010: 2,000 exhibitions, ${Math.round(rec.bytes / 1024)} KiB as text → ${Math.round(rec.zbytes / 1024)} KiB compressed in ${rec.parts} piece(s), back exactly`);
  }

  // CL-011 — each failure says which one it is.
  {
    const s = [C.cloudTrouble({ code: 'quota_exceeded', message: 'artifact full' }, 'save'),
               C.cloudTrouble({ code: 'fingerprint', message: 'Mismatch.' }, 'read'),
               C.cloudTrouble({ code: 'weird' }, 'save')];
    ok(/full/.test(s[0]) && s[1] === 'Mismatch.' && /weird/.test(s[2]), 'CL-011: every store failure gets its own sentence, and an unknown one names its code');
  }

  console.log(`\ncloud_ledger: ${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.log('FAIL  cloud_ledger crashed — ' + (e && (e.stack || e.message || JSON.stringify(e)))); process.exitCode = 1; });
