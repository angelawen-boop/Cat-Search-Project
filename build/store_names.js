/*
 * store_names.js — the names of the page's store records, read from the app's own constants in
 * Cat_Watch.jsx, so a check or a fixture never types a record path of its own (docs/restructure.md, 4B).
 *
 *   const STORE = require('<root>/build/store_names.js').storeNames();   // STORE.occasional === 'venues/occasional'
 *
 * Throws when a constant is gone or no longer a plain string, so a rename in the app stops the script
 * that depends on it. `storeNames(jsxPath)` reads another page (the old page, for a comparison).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const CONSTANTS = {
  occasional: 'OCC_DOC', quarantine: 'QUARANTINE_DOC', sweeps: 'SWEEP_LOG_DOC',
  linksPending: 'LINKS_DOC', linksPages: 'PAGES_COLL', linksPastes: 'PASTES_COLL',
  ledgerLive: 'CLOUD_LIVE_DOC', ledgerSession: 'CLOUD_SESSION_DOC', snapshots: 'SNAP_COLL', lookups: 'LOOKUP_LOG',
};

function storeNames(jsx = path.join(__dirname, '..', 'Cat_Watch.jsx')) {
  const src = fs.readFileSync(jsx, 'utf8');
  const out = {};
  for (const [key, name] of Object.entries(CONSTANTS)) {
    const m = src.match(new RegExp('(?:^|[\\n,;])\\s*(?:const\\s+)?' + name + '\\s*=\\s*"([^"]+)"'));
    if (!m) throw new Error('store_names: ' + name + ' is not a plain string constant in ' + jsx);
    out[key] = m[1];
  }
  return out;
}

module.exports = { storeNames, CONSTANTS };
if (require.main === module) console.log(JSON.stringify(storeNames(), null, 1));
