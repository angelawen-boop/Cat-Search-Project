# One copy of every fact — the audit behind items 4A–4F

Read-only audit of the app's parts, the scraper, build and test files, and copies of her store records and ledger as
they stood on 5 Nov: each finding was a fact kept in more than one place. **All of 4A–4F is done** — every finding
(D1–D24) was removed by the venue register (4A: venue facts), one copy of each repeated sentence and store path (4B, 4E,
4F), one web-address clean-up (4C: `bareHost`), `scraper/pro_forma.js` for the sweep file's columns, marker sentence,
"Topic:" note, readers and sweep-log merge (4D), `scraper/keys.js` for the address key, letter fold and show ID, one
month list, and one price rule (D7). Each finding's evidence is in git (`git log -p -- docs/restructure/duplicates.md`).
"Manual import" = Links, Pages and Paste together (her name).

## What stays, on purpose (her decisions)

- **D19 — the quarantine** lives in the store and in her saved file, joined by `mergeQuarantine` (they agreed 83/83).
- **D5 — a book's publisher twice in her ledger** (each edition and its card; 7 differed, the edition's copy split on
  "with"): her ledger is never changed, so both copies stay; the version block reads the edition, the card line the row.
- **D6 — show IDs:** an ID once given never changes, so 6 of the 110 seed shows keep the seed's form in her ledger (e.g.
  `ng-zurbarn`); new IDs come from one rule.
- **Left alone — different jobs, not duplicates:** `docs/restructure.md`, "What is left".
- Christie's orphan press record (`occ-press-christies-com`) is deleted at the one-time clear after the next publish
  (`docs/restructure.md`, "What is left").

## Checked and not duplicated

Ledger rows hold only `museumId` and the show's address (no venue name or site); every ledger `shopUrl` is a book page
(per-book fact); `VENUE_SITES`, the date rules and summary rules are written by the join; `qc.js`, `compress.js
seedMemory`, `shop_addresses.js`, `link_proof_check.js`, `shop_check.js` read the app rather than copy it; `PERIODS` is
one list; no model id written twice; one constant per store path in the app; swept-venue addresses (`exBase`/`listUrl`,
5 venues) agree with the scraper's and are a narrower fact (D9).
