# One copy of every fact — the audit behind items 4A–4F

Read-only audit of the app's parts, the scraper, build and test files, and copies of her store records
and ledger as they stood on 5 Nov. Each finding is a fact kept in more than one place; the work items that
remove them are in `docs/restructure.md`, item 4. Numbers are as found: re-check each against the code and
her store before fixing it (the store changes as she works). "Manual import" = Links, Pages and Paste
together (her name). Her ledger is never changed (her decision).

## 4A — venue facts: done

Every 4A finding (D1–D4, D8, D10, D14–D16, D20's venue copies, D23, D24 and the asides) was fixed by the
venue register (`docs/restructure.md`, "4A"); the old evidence is in git. Left from it: Christie's orphan
press record (`occ-press-christies-com`) is deleted at the one-time clear after her first real publish.

## 4B — saving

- **D21 (saving):** "This viewer can't reach the page's store." ×3; "… so nothing is being saved to the
  cloud copy." ×2; "Safety snapshot before roll-back to snapshot of" ×2.
- **D20 (saving):** store record paths typed into `build/test_page_check.js`, `build/lookup_log.js` and
  fixtures (store_unread.js 19×, add_by_link.js 17×).

## 4C — the web-address clean-up

- **D22:** `bareHost` exists, yet `.replace(/^www\./,"")` is written inline 17 times.

## 4D — the sweep import

- **D11 — "Marker row, not an exhibition.":** written in `sweep_prototype.js` (3 places), its own constant
  in `qc.js`, `routine_window.js`, `sweep_diff.js`, and in the app's `isMarkerRow`. Agree.
- **D12 — CSV columns** in six places (`proFormaCsv`, `sweep_prototype.js`, `compress.js`, `stitch.js`,
  `reread_kept.js`); `sweep_fetch.js` writes 7 columns, no `swept_at`. Three CSV readers (app `csvParse`,
  `compress.parseCsv`, `show_tags.readCsv`).
- **D13 — the "Topic: …" note:** written by `compress.js`, re-parsed by the app's `topicOf` with its own
  pattern; not shared by the join.
- **D17 — web addresses standardised three ways:** app `normalizeUrlKey`, scraper `normalizeUrl`,
  `compress.urlKey` (differ on decoding and the root "/"). Quarantine keys use the app's.
- **D18 — the sweep-log merge** in the app and `scraper/sweep_log.js`; the ledger's `lastRun` written on
  every import, saved, never shown (the sweep log replaced it).
- **D6 — show IDs by two rules:** `buildSeed` and `makeLedgerRow` differ for 6 of 110 seed shows, all 6 in
  her ledger under the seed form (e.g. `ng-zurbarn`). An id once given never changes. Three accent rules:
  `foldText`, `normalizeTitle` (feeds quarantine keys and matching; "Hammershøi" → "hammersh i"),
  `artistKey`; the scraper's `titleKey` folds none. Any change is checked against her real quarantine.
- **D22 (scraper):** `MONTHS` and `MONTH_PATTERN` hold the same spellings; `GERMAN_DAY_DOT` a third list.
- **D20 (sweep):** `blocks_check.js` hand-types show ids.

## 4E — catalogue lookup

- **D21 (lookup):** the '"Sold by …" names the SHOP' rule ×3 in `find.jsx`; "The ISBN-13, the publisher,
  and any link …" ×2; "The books in this section of the shop, with their prices." ×5; "The products in
  this section: titles, types and prices." ×2; "the English edition, published later" ×2.
- **D22 (lookup):** `HOUSE_SPLIT` retyped in `siteOfHouses`; ISBN dash removal ×2, 978/979 pulled out in
  four regex forms.
- **D5 — a book's publisher twice in her ledger:** each edition and its `card`; 7 differ (6 the picked
  one) — the edition's copy was split on "with" ("…in association / D Giles Limited"). The version block
  reads the edition, the card line the row. Her ledger is never changed (her decision): both copies stay.
- **D7 — two price rules:** the shop finder accepts CHF/SEK/DKK/NOK/kr; the lookup's `SHOP_PRICE` only
  € $ £. Basel, Beyeler, Louisiana, Moderna Museet affected; checked live, old rule beside new.

## 4F — manual import and the shop finder

- **D21 (manual import):** "EXHIBITION TITLE, as the page gives it:" and "RAW TEXT …" ×2 (`linkItem`,
  `elsewherePrompt`); "Couldn't find the show's title on the page." ×2.
- **D22:** Shopify `"handle"`/`"products_count"` reading in both shop finders.

## Stays (her decision)

- **D19 — the quarantine** in the store and in her saved file, joined by `mergeQuarantine`; 83/83 agree.

## Checked and not duplicated

Ledger rows hold only `museumId` and the show's address (no venue name or site); every ledger `shopUrl`
is a book page (per-book fact); `VENUE_SITES`, the date rules and summary rules are written by the join;
`qc.js`, `compress.js seedMemory`, `shop_addresses.js`, `link_proof_check.js`, `shop_check.js` read the
app rather than copy it; `PERIODS` is one list; no model id written twice; one constant per store path in
the app; swept-venue addresses (`exBase`/`listUrl`, 5 venues) agree with the scraper's and are a
narrower fact (D9).
