// The venue register (venues/register.js) and its waiting room — docs/restructure.md, item 4A.
//   VR-001…  build/file_venues.js files the store's waiting records into the register.
//   VR-010…  the page clears a waiting record the register already holds, and shows the rest over it.
//   VR-020…  a venue with several galleries (Acquavella, Lévy Gorvy Dayan): one list, every way in.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REGISTER = path.join(ROOT, 'venues', 'register.js');
const SNAPSHOT = path.join(ROOT, 'docs', 'store_backup_2026-11-06', 'venues_occasional.json');
const { VENUES } = require(REGISTER);
const F = require(path.join(ROOT, 'build', 'file_venues.js'));
const { fakeStore } = require('./fixtures/fake_store.js');

const copy = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-reg-')), f = path.join(d, 'register.js'); fs.copyFileSync(REGISTER, f); return f; };
const fileInto = (reg, waiting) => {
  const src = path.join(path.dirname(reg), 'store.json');
  fs.writeFileSync(src, JSON.stringify({ venues: waiting }));
  const out = execFileSync(process.execPath, [path.join(ROOT, 'build', 'file_venues.js'), src, '--register', reg], { encoding: 'utf8' });
  delete require.cache[require.resolve(reg)];
  return { out, venues: require(reg).VENUES };
};
const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')).venues;

test('VR-001: her store as backed up is already filed — nothing to write, the orphan Christie\'s press record not filed', () => {
  const reg = copy();
  const { out } = fileInto(reg, snapshot);
  assert.strictEqual(fs.readFileSync(reg, 'utf8'), fs.readFileSync(REGISTER, 'utf8'));
  assert.match(out, /occ-press-christies-com: not filed — its site is occ-christies-com's/);
  assert.match(out, /Nothing to file/);
});

test('VR-002: a venue met since the last publish becomes a new entry, every field in the register\'s layout', () => {
  const reg = copy();
  const w = { id: 'occ-test-museum-org', name: 'Test Museum', short: 'Test', city: 'Lyon', country: 'France', english: false, host: 'test-museum.org', shop: 'none', confirmed: true };
  const { out, venues } = fileInto(reg, { 'occ-test-museum-org': w });
  assert.match(out, /^occ-test-museum-org: new venue, "Test"$/m);
  const e = venues.find(v => v.id === 'occ-test-museum-org');
  assert.deepStrictEqual(Object.keys(e), Object.keys(VENUES[0]));
  assert.deepStrictEqual(Object.keys(e.names), Object.keys(VENUES[0].names));
  assert.deepStrictEqual(Object.keys(e.read), Object.keys(VENUES[0].read));
  assert.ok(e.kind === 'manual' && e.names.card === 'Test' && e.names.full === 'Test Museum' && e.city === 'Lyon' && e.english === false && !e.names.hers);
  assert.deepStrictEqual(e.filed, w);
  assert.strictEqual(venues.length, VENUES.length + 1);
});

test('VR-003: a filed venue takes each fact that changed since it was filed; her names are never replaced by Claude\'s', () => {
  const reg = copy();
  const ngv = VENUES.find(v => v.id === 'occ-ngv-vic-gov-au'), kmska = VENUES.find(v => v.id === 'occ-kmska-be');
  const { out, venues } = fileInto(reg, {
    'occ-ngv-vic-gov-au': { ...ngv.filed, city: 'Melbourne', shopSearch: 'https://shop.ngv.vic.gov.au/search?q=' },
    'occ-kmska-be': { ...kmska.filed, short: 'KMSKA Belgium' },
  });
  const n = venues.find(v => v.id === 'occ-ngv-vic-gov-au'), k = venues.find(v => v.id === 'occ-kmska-be');
  assert.match(out, /occ-ngv-vic-gov-au: filed \(city changed\)/);
  assert.ok(n.city === 'Melbourne' && n.filed.shopSearch === 'https://shop.ngv.vic.gov.au/search?q=' && n.names.card === ngv.names.card);
  assert.ok(k.names.card === 'Antwerp KMSKA' && k.filed.short === 'KMSKA Belgium', 'her card name stays');
  // Nothing else in the file moves: the other entries are as they were.
  const others = vs => JSON.stringify(vs.filter(v => !['occ-ngv-vic-gov-au', 'occ-kmska-be'].includes(v.id)), (key, v) => v instanceof RegExp ? String(v) : v);
  assert.strictEqual(others(venues), others(VENUES));
});

// ── the page's side: lifted from Cat_Watch.jsx as the join wrote it ──
function page(db) {
  const load = require('./claude_read_check/load.js');
  return load(path.join(ROOT, 'Cat_Watch.jsx'), ['tidyOccasional', 'readOccasional', 'writeOccasional', 'heldByRegister', 'occasionalOver', 'occVenue', 'REG', 'MU', 'occCountry', 'cloudGoReadOnly'],
    { claude: { use: async name => (name === 'db' ? db : null) } });
}

test('VR-010: at opening, each waiting record the register holds is cleared; one changed since it was filed stays', async () => {
  const db = fakeStore();
  const ngv = snapshot['occ-ngv-vic-gov-au'];
  const changed = { ...snapshot['occ-mfa-org'], shopSearch: 'https://shop.mfa.org/search?q=' };
  const fresh = { id: 'occ-new-org', name: 'New', host: 'new.org', shop: 'unknown' };
  // The store's own field order is not the register's: equal records are still recognised.
  const reordered = Object.fromEntries(Object.entries(ngv).reverse());
  await db.doc('venues/occasional').set({ venues: { 'occ-ngv-vic-gov-au': reordered, 'occ-mfa-org': changed, 'occ-new-org': fresh } });
  const P = page(db);
  assert.strictEqual(await P.tidyOccasional(), 1);
  const kept = JSON.parse(db.docs.get('venues/occasional')).venues;
  assert.deepStrictEqual(Object.keys(kept).sort(), ['occ-mfa-org', 'occ-new-org']);
  assert.strictEqual(await P.tidyOccasional(), 0, 'nothing more to clear');
});

test('VR-011: a read-only copy clears nothing', async () => {
  const db = fakeStore();
  await db.doc('venues/occasional').set({ venues: { 'occ-ngv-vic-gov-au': snapshot['occ-ngv-vic-gov-au'] } });
  const P = page(db);
  P.cloudGoReadOnly();
  assert.strictEqual(await P.tidyOccasional(), 0);
  assert.ok(JSON.parse(db.docs.get('venues/occasional')).venues['occ-ngv-vic-gov-au']);
});

test('VR-012: a waiting record shows over its entry, field by field (her latest word); the register\'s names otherwise', async () => {
  const db = fakeStore();
  const mfa = { ...snapshot['occ-mfa-org'], city: 'Boston, MA' };
  await db.doc('venues/occasional').set({ venues: { 'occ-mfa-org': mfa, 'occ-neue-nationalgalerie': snapshot['occ-neue-nationalgalerie'] } });
  const P = page(db);
  const map = await P.readOccasional();
  const m = P.occVenue('occ-mfa-org', map['occ-mfa-org']);
  assert.ok(m.city === 'Boston, MA' && m.card === 'Boston MFA');
  // The store's record was the Kupferstichkabinett's: the register's name shows, never the store's.
  const n = P.occVenue('occ-neue-nationalgalerie', map['occ-neue-nationalgalerie']);
  assert.ok(n.name === 'Neue Nationalgalerie' && n.card === 'Berlin Neue NG' && n.city === 'Berlin', JSON.stringify([n.name, n.card]));
  // Every venue the register has filed is known with the store empty, its city passed on.
  const none = await page(fakeStore()).readOccasional();
  assert.ok(none['occ-alte-pinakothek'] && none['occ-alte-pinakothek'].city === 'Munich' && !none['occ-press-christies-com']);
  // Writing keeps only what the register does not hold.
  assert.strictEqual(await P.writeOccasional(map), true);
  assert.deepStrictEqual(Object.keys(JSON.parse(db.docs.get('venues/occasional')).venues), ['occ-mfa-org']);
});

// ── VR-020: several galleries (her decision: one setup for every such venue) ──
const S = require('./sweep_prototype.js');
const D = require('./dates.js');
const A = require('./answer_check.js');
const C = require('./compress.js');
const LGD_PAGES = ['lgd_enchanted_alchemies.html', 'lgd_mark_bradford.html'].map(f => fs.readFileSync(path.join(ROOT, 'docs', 'summary_pages', f), 'utf8'));
const textLines = html => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n').split('\n').map(l => l.replace(/&nbsp;/g, ' ').trim()).filter(Boolean);

test('VR-020: each venue\'s galleries are one list on its register entry, read by the scraper and compression alike', () => {
  const several = VENUES.filter(v => v.read.places.length > 1).map(v => [v.id, v.read.places, v.read.placeOwner]);
  assert.deepStrictEqual(several, [['acq', ['New York', 'Palm Beach'], 'Acquavella'], ['lgd', ['New York', 'London'], 'Lévy Gorvy Dayan']]);
  assert.deepStrictEqual([...S.placesOf('lgd')], ['New York', 'London']);
  assert.deepStrictEqual(C.TRAVELLING_LOCATIONS.lgd, ['New York', 'London']);
});

test('VR-021: Lévy Gorvy Dayan\'s own pages name the gallery under the title — read as a gallery, never part of the title', () => {
  // Its saved show pages: "Lévy Gorvy Dayan, London" (Enchanted Alchemies), "Lévy Gorvy Dayan New York" (Mark Bradford).
  const L = S.placesOf('lgd');
  const lines = LGD_PAGES.map(h => textLines(h).find(l => /^Lévy Gorvy Dayan,? (?:New York|London)$/.test(l)));
  assert.deepStrictEqual(lines.map(l => S.isPlace(l, L)), ['London', 'New York']);
  assert.strictEqual(S.isPlace('Lévy Gorvy Dayan Hong Kong', L), undefined, 'Hong Kong is not one of hers');
  assert.strictEqual(D.withoutPlaceTail('lgd', 'Enchanted Alchemies: Magic, Mysticism, and the Occult in Art – Lévy Gorvy Dayan, London'), 'Enchanted Alchemies: Magic, Mysticism, and the Occult in Art');
  assert.strictEqual(D.withoutPlaceTail('acq', 'Portraiture – Acquavella Palm Beach'), 'Portraiture');
  assert.strictEqual(D.withoutPlaceTail('lgd', 'Paris – London (London)'), 'Paris – London (London)', 'a gallery in brackets stays');
  assert.strictEqual(D.withoutPlaceTail('met', 'Turner – London'), 'Turner – London', 'a venue with one place keeps its title');
});

test('VR-022: a show run in both of its galleries gets each in brackets and the "also shown at" note, as at Acquavella', () => {
  // A row as the 15 Oct sweep wrote it for Lévy Gorvy Dayan, run in both galleries.
  const csv = fs.readFileSync(path.join(ROOT, 'scraper', 'output', 'stitch_20261015_0920', 'sweep_compressed.csv'), 'utf8');
  const line = csv.split('\n').find(l => l.startsWith('lgd,Pierre Soulages: Paintings on Paper,'));
  assert.ok(line, 'the Soulages row is on disk');
  const [, title, start, end] = line.split(',');
  const rows = [{ venue_code: 'lgd', title, start_date: start, end_date: end, _place: 'New York' },
    { venue_code: 'lgd', title, start_date: end, end_date: end, _place: 'London' },
    { venue_code: 'lgd', title: 'Another Show', start_date: start, end_date: end, _place: 'London' }];
  S.placeTravellingRuns(rows);
  S.noteTravellingRuns(rows, 'lgd');
  assert.deepStrictEqual(rows.map(r => r.title), [title + ' (New York)', title + ' (London)', 'Another Show']);
  assert.match(rows[0].notes, /also shown at London\./);
  assert.match(rows[1].notes, /also shown at New York\./);
  assert.ok(!rows[2].notes, 'a one-gallery show carries no note');
  // Compression: the pair is one question, one shared description.
  assert.strictEqual(C.travellingKey(rows[0]), C.travellingKey(rows[1]));
});

test('VR-023: a title carrying its gallery in brackets: the description does not open with that gallery too (sweep and app)', () => {
  const t = 'Portraiture: From Cassatt to Warhol (Palm Beach)', P = ['New York', 'Palm Beach'];
  assert.strictEqual(A.withoutPlaceOpener('Palm Beach. Portraits from Cassatt to Warhol.', t, P), 'Portraits from Cassatt to Warhol.');
  assert.strictEqual(A.withoutPlaceOpener('In Palm Beach, portraits from Cassatt to Warhol.', t, P), 'Portraits from Cassatt to Warhol.');
  assert.strictEqual(A.withoutPlaceOpener('Palm Beach. Portraits.', 'Portraiture', P), 'Palm Beach. Portraits.', 'a one-gallery show keeps its opener');
  assert.strictEqual(A.withoutPlaceOpener('New York. Portraits.', t, P), 'New York. Portraits.', 'only the gallery its title names');
  assert.strictEqual(C.resolveAnswer('London. Soulages on paper.', { title: 'Pierre Soulages: Paintings on Paper (London)', venue_code: 'lgd' }).text, 'Soulages on paper.');
  assert.strictEqual(C.resolveAnswer({ summary: 'New York. Soulages.', english: '' }, { title: 'Soulages (New York)', venue_code: 'lgd', englishTitle: true, action: 'fresh' }).text, 'Soulages.');
  // The app's copy is the scraper's, written by the join.
  const P2 = require('./claude_read_check/load.js')(path.join(ROOT, 'Cat_Watch.jsx'), ['ANSWER_CHECK']);
  assert.strictEqual(P2.ANSWER_CHECK.withoutPlaceOpener('London. Soulages.', 'Soulages (London)', ['New York', 'London']), 'Soulages.');
});

test('VR-024: in the catalogue lookup, a city on the venue\'s own list is never "another showing"', () => {
  const L = require('./claude_read_check/load.js')(path.join(ROOT, 'Cat_Watch.jsx'), ['versionNote']);
  const row = { museumId: 'lgd', title: 'Soulages', startDate: '2026-09-17' };
  const vs = [{ showing: 'this', city: 'London', publisher: 'Some Press', lang: 'en' }, { showing: 'this', city: 'Paris', publisher: 'Other Press', lang: 'en' }];
  assert.notStrictEqual(L.versionNote(vs, 0, row), "from the show's London exhibition");
  assert.strictEqual(L.versionNote(vs, 1, row), "from the show's Paris exhibition");
});
