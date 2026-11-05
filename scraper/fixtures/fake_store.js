/**
 * A stand-in for the page's store, as the platform's db.d.ts describes it:
 * whole-document writes, 256 KiB per document, no transactions, collections
 * that are the documents one path level down. `failOnSet(n, path)` returning
 * true makes the nth write fail, as a dropped connection would. `beforeSet(path)` may
 * return a promise that holds a write back until it resolves, as a slow store would.
 * Used by cloud_ledger.js and cloud_app.js.
 *
 * The page reaches its store only through its door (connections/store.jsx: storeRead, storeWrite,
 * storeDelete, storeList…), which asks `useCap("db")`. `onStore` binds code lifted from the page to a
 * stand-in store: each named function takes the store as its first argument, as it did before the door.
 * `doorSource` lifts the door itself, for a fixture whose section does not hold it.
 */
'use strict';
function fakeStore({ failOnSet, beforeSet } = {}) {
  const docs = new Map();
  let sets = 0;
  const parentOf = p => p.split('/').slice(0, -1).join('/');
  return {
    docs,
    doc(p) {
      return {
        async get() { const d = docs.get(p); return { exists: !!d, data: () => d && JSON.parse(d) }; },
        async set(obj) {
          if (beforeSet) await beforeSet(p);
          sets++;
          if (failOnSet && failOnSet(sets, p)) throw { code: 'unavailable', message: 'injected' };
          const s = JSON.stringify(obj);
          if (Buffer.byteLength(s) > 256 * 1024) throw { code: 'invalid_argument', message: 'over 256 KiB' };
          docs.set(p, s);
        },
        async delete() { docs.delete(p); },
      };
    },
    collection(c) {
      let field = null, dir = 'asc', n = 1000;
      const q = {
        orderBy(f, d) { field = f; dir = d || 'asc'; return q; },
        limit(k) { n = k; return q; },
        async get() {
          let out = [...docs.entries()].filter(([p]) => parentOf(p) === c).map(([p, s]) => ({ id: p.split('/').pop(), d: JSON.parse(s) }));
          if (field) out.sort((x, y) => (x.d[field] < y.d[field] ? -1 : x.d[field] > y.d[field] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
          out = out.slice(0, n);
          return { docs: out.map(({ id, d }) => ({ id, data: () => d })), size: out.length };
        },
      };
      return q;
    },
  };
}

// make(useCap) runs the lifted code and returns its functions; the named ones take the store first.
function onStore(make, storeFns) {
  let cur = null;
  const api = make(async name => (name === 'db' ? cur : null));
  const out = { ...api };
  for (const k of storeFns) out[k] = (db, ...a) => { cur = db; return api[k](...a); };
  return out;
}

const DOOR = ['storeRef', 'storeNo', 'storeReached', 'storeRead', 'storeList', 'storeWrite', 'storeDelete', 'storeWritable'];
function doorSource(src) {
  return DOOR.map(n => {
    const m = new RegExp('^(async )?function ' + n + '\\(', 'm').exec(src);
    if (!m) throw new Error('fake_store: the door\'s ' + n + ' is not in Cat_Watch.jsx');
    return src.slice(m.index, src.indexOf('\n}\n', m.index) + 3);
  }).join('');
}

module.exports = { fakeStore, onStore, doorSource };
