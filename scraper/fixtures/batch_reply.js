/**
 * The fixtures' stand-in Claude answers one page at a time; the app now asks for every page of an
 * import in ONE request (linkBatchPrompt). This splits such a request into its items, hands each to
 * the fixture's own answer as if it were alone (the item's text plus the keys every item answers),
 * and returns the answers keyed by item number, as Claude does; an answer of undefined is left out,
 * as a reply that skips a page. Any other request passes through.
 */
'use strict';
async function batchReply(prompt, one) {
  const p = String(prompt || '');
  if (!/===== ITEM \d+ =====/.test(p)) return one(p);
  const keys = (p.match(/\nANSWER: [\s\S]*$/) || [''])[0];
  const out = {};
  const re = /===== ITEM (\d+) =====\n([\s\S]*?)\n===== END ITEM \1 =====/g;
  let m;
  while ((m = re.exec(p))) { const a = await one(m[2] + '\n' + keys); if (a !== undefined) out[m[1]] = a; }
  return out;
}
module.exports = { batchReply };
