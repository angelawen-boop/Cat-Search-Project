# One copy of every fact — the audit behind items 4A–4F

Read-only audit of the app's parts, the scraper, build and test files, and copies of her store records
and ledger as they stood on 5 Nov (her store unchanged since round 1). Each finding is a fact kept in
more than one place. The work items that remove them are in `docs/restructure.md`, item 4. Numbers are
as found; re-check each against the code and her store before fixing it (the store changes as she works).

"Manual import" = Links, Pages and Paste together (her name). "Register" = the one home for venue facts item 4A builds; whether it is in the code or the store is her decision, not yet made. Her ledger is never changed (her decision).

## 4A — venue facts

- **D1 — a manual-import venue's names, in `LINK_VENUES` (41 entries) and the store's `venues/occasional`
  (61).** `occVenue` lets the code entry win; `needsFacts`/`namedByAddress` read only the store.
  - `name` in both for 17: 8 clash — Munich ×3 (store "pinakothek.de", no short, no city), Neue
    Nationalgalerie (the store record is the Kupferstichkabinett, short "Berlin Kupferstichkabinett"),
    KMSKA, Museo di San Marco (store "Direzione regionale Musei nazionali Toscana"), Palazzo Ducale Genova
    (store "palazzoducale.genova.it"), Palazzo Reale Milano (store "Comune di Milano").
  - `short` in both for 6: 4 clash — Neue NG, Prado ("Prado Madrid"/"Madrid Prado"), Moderna, Louisiana.
  - `card` vs the short name used elsewhere differs for 20; for 13 the screens that show `short` (review
    headings, Reset list, quarantine list, CSV venue name) show the name she rejected (Présidence shows
    "Paris Présidence"; also Basel, Cini, Stanze della Fotografia, Łazienki, Correr, Pompidou, Emil
    Schumacher, Chagall, Reina Sofía, Valkhof, Wallach; NGV and RCT get the store's full name).
  - `notCard` (16 entries) is itself a copy of the store's short name; 2 match nothing (KMSKA, Moderna).
  - `lookupName` falls through to the store's short name for 35 venues — the "Detroit" search fault
    (CLAUDE.md §2.2.3); for 13 it is the rejected name (Pompidou searched as "Pompidou Paris").
  - The shop search name mixes both copies (Neue NG: "…Kupferstichkabinett Museum of Prints and Drawings
    SMB…"); the store's `occ-smb-museum` aka holds "Old National Gallery".
  - The Munich three count as unnamed, so they are asked again on every import.
- **D2 — a manual-import venue's shop section** for Städel and Basel: in `LINK_VENUES` and copied into the
  store (`shopFromRule` → read job). The card's shop button reads the entry; the lookup reads the store;
  `shopWrittenIn` keeps them off the shop screen, so the store copy is never refreshed. Agree today.
- **D3 — Christie's, two store records:** `occ-christies-com` (1 row, confirmed) and
  `occ-press-christies-com` (0 rows, unconfirmed, gallery:true, different aka); the orphan is still
  registered as a venue.
- **D4 — country:** `OCC_COUNTRY` (23) and the store; `occCountry` lets the code win, its comment says the
  store wins. 10 agree, 12 have no store country, 1 is Ashmolean. Read by the Occ chips and ordering.
- **D8 — swept-venue names:** `MUSEUMS` and the scraper's `VENUES` differ for 24 of 28 (20 by ", City";
  ng, louvre, brit, capo in the name itself). The scraper's name is used only by its log header and
  `venue_status.js`. LGD's city "New York / London" vs "New York and London".
- **D10 — Acquavella's two locations:** `VENUES.acq.locations`, `compress.js TRAVELLING_LOCATIONS`,
  `MUSEUMS.acq.linkRead.places`. Agree.
- **D14 — a swept venue's language:** `english:false`, `VENUE_LANGUAGE`, `CATALOGUE_WORDS` — 12 each,
  agree. Manual-import venues (store `english` false for 35) are in none.
- **D15 — own chip, label, order:** `LINK_VENUES.ownChip` and `VENUE_ORDER` (17, agree); the chip label
  repeated per group member (Munich, Berlin, Cini); Ashmolean's place under Occasional in three lists.
- **D16 — a venue's shop fields listed four times** with different contents (`SHOP_FIELDS` 10, the read
  job's reset 7, two lists in the main screen 8 + shop/confirmed).
- **D23 — a venue's set of names built five ways** (find, page reader, museum shop finder,
  heldElsewhere/ownMuseumNamed, lookup).
- **D24 — date order for 14 manual-import venues** in the scraper's `DATE_ORDER` / `SPACED_YEAR_VENUES`;
  every other reading rule is in `LINK_VENUES`. `occ-kunsthaus-ch` and `occ-approfondimentimostre-com`
  have no entry and no store record.
- **D20 (venue part) — test copies:** `docs/shop_check.json` Thyssen shelf differs from the store;
  `docs/gallery_shop_check.json` Acquavella `/frontpage` vs `MUSEUMS` `/all`; `scraper/probe_headed.js`
  types its targets (brit's selector differs from its recipe).
- **Asides:** Lévy Gorvy Dayan has no `card`, so cards show "Levy" though the code's note says "Lévy Gorvy
  Dayan"; `occVenue` passes on `country` but not `city`, so a manual-import venue's city is blank.

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
