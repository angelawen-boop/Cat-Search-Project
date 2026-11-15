/**
 * keys.js — the pieces a show's matching keys are built from: the web-address key and the accent
 * strip. One copy, shared by the scraper's tools and the app (docs/restructure.md, round "keys").
 * `node build/app_join.js` writes everything above module.exports into Cat_Watch.jsx as KEYS, and
 * `node build/app_join.js --check` fails until it has. Edit HERE, then run the join. Pure: nothing
 * above module.exports may use Node. Her quarantine is stored under these keys: a change here must
 * leave `build/keys_compare.js` empty.
 */
'use strict';

// Same address = same exhibition: scheme and host lowercased, the path never folded (folding it
// merged two exhibitions differing only in capitals). A trailing slash and a #fragment are not part
// of identity, so a site's root keys without its slash. An address that cannot be read keys as "".
function normalizeUrlKey(u) {
  try {
    const x = new URL(String(u || '').trim());
    x.hash = '';
    const path = x.pathname.replace(/\/+$/, '');
    return x.protocol.toLowerCase() + '//' + x.host.toLowerCase() + path + x.search;
  } catch { return ''; }
}

// Accent marks dropped ("é" → "e"). Letters that are not accented ones (ø, æ, ß…) stay as they are.
const stripAccents = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

module.exports = { normalizeUrlKey, stripAccents };
