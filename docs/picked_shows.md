# Picked shows — "Add by link" in the app

**Her design; signed off at 39.5.** Code: "ADD BY LINK" in `Cat_Watch.jsx`; test
`scraper/fixtures/add_by_link.js` (AL-). Replaces the earlier scraper-side plan (in git), which survives only
as the fallback below.

## The problem

Some venues matter only now and then (~5 shows a year). A full venue costs a recipe, an archive and a monthly
sweep — then ~30 rows arrive and 27 are dismissed. She would rather pick the shows and add one the moment she
meets it.

## The design

- **Import opens ONE small pop-up — nothing added to the page** (her design, 39.2): **CSV · Links**, a small
  **Cancel** under them (the footer's Quarantine style). CSV = the file picker, the sweep route. Links = the
  box and **Read**, same pop-up, with a progress bar. Links separated any way; a repeat read once. The review
  opens when reading ends; the pop-up waits under it if a link failed.
- **Then the shop screen** (her design): with a card going in from a venue outside her 27 whose shop is
  unconfirmed, the review's last button is **Next** → one card per new venue met in the Read: **Confirm · Look
  again · No shop**, always in that order. **The ledger moves only when every one is answered.** Back returns
  to the review. Confirmed once, never asked again.
- **The ordinary review.** Each link becomes a pro forma row fed to the existing intake: Add / Fill / Change /
  Reject / quarantine all as now.
- **A link it cannot read is a line, never a card** — the full link and why (empty page, refused, no dates).
  Unread links **stay in the paste box**, stored when the import finishes, until read or cleared. **Links come
  back to the box** (her decision): a rejected card's, an undecided card's after a partial apply, and on
  Cancel import every link the Read took — each stored at once. AL-012c, AL-024.
- **No lookback cutoff** for anything added by link (her decision).
- **Chip: one "Occasional"** for every venue added this way (her decision); each venue keeps its own name and
  shop behind it. A link to a venue already swept files under that venue. **Card names are hers** (`short` in
  the store, written by a session); the page title's name until she gives one.
- **Store:** `venues/occasional` (venues, shops, her confirmations) and `links/pending` (the box). Copy both
  when the cloud page merges (CLAUDE.md §7.1). A ledger row whose venue a page's store has not met shows under
  its web address, shop "not found".

## Per link — code first, model only for prose

1. One page read (`fetchPage`, `full`).
2. **Title = what the catalogue would be called** (her decision): the page's title, site name stripped;
   subtitles and split headings kept. **Title stays in the museum's language.**
3. **Dates:** the first range after the show's heading, by the scraper's own date reader — in its own file,
   shared, never copied.
4. **Description by the model** (`modelTier: default`, her decision), same prompt as compression, shared not
   copied. **Any non-English page comes out in English; a non-English title gets its translation at the
   start** (`In English: "…".`), every language (her decision).
5. No note — a link is not a sweep; `swept_at` blank, sweep log untouched.

## A venue the app has not seen

Name from the page title. Its shop: the **exhibition-catalogues section**, else the museum's publications,
else books — **never the front page, one book, a post, or a section mixing books with other goods** (her
decision). A mixed section is opened and a books-only section inside it taken. **Nothing found is stored until
the import finishes.** Code: "FINDING A NEW VENUE'S SHOP SECTION".

1. **One search call, two queries: hers, "<venue> shop exhibition catalogues", and "<venue> shop books
   publications"** — Detroit's "DIA Publications" came back with both, never with hers alone (keyed). Parallel
   does not always rank the section first (Cleveland's was 4th), so code ranks every result: the museum's own
   shop site only; plural section words; "not Catalogues" and sale shelves refused or last.
2. **A Shopify shop's section list** (`collections.json`) — Thyssen's search held only single books. Ranked on
   titles.
3. **The shop's menu.**

**Fixes from the first venues it had never met (proven live, 43.1):**
- **The venue's own name drives the search.** A site name the reader cannot match to the address (Mia, on
  new.artsmia.org) left the search finding other museums' shops; a venue rule names it (`OWN_CHIP` `name`),
  Look again included.
- **A Shopify section that opens with no books** (Mia's Catalogues shows only its menu) is judged on its
  `products.json`: two priced products, most with a book type (`shopifyShelfIsBooks`; AL-033).
- **The museum's own Shop page pointing elsewhere** (Worcester's "Shop now" → a myshopify.com shop) is
  followed when the search finds no section (`shopElsewhere`; AL-034).

A pick is **opened and must read as books with prices** (unless its excerpt already does). Nothing → "Shop
found, but not its books section: <shop>" / "No museum shop found." / "Search failed." — and **a miss is a
finder bug, fixed in code: she never pastes a shop link** (her decision). **Look again** skips only the pages
she turned down, never the site. **No shop** → lookups go to the web, as at Capodimonte. Venues found by the
old finder and never confirmed are looked for again on their next link. Evidence:
`docs/link_pages/shop_search/`.

**NGV writes two-digit years** ("4 Sep 26 – 31 Jan 27"): read as 20YY at NGV only (`shortYear` in
`OCC_LINK_READ`, `withLongYears`; AL-038). A general rule would read "Jun 23" as a year anywhere. NGV goes
last in the Occasional group; its cards say "National Gallery Victoria" (her decision).

**A Wayback Machine copy files under the museum it copied** (her decision; *Sargent and the Sea*, RA 2010):
the venue, its shop and the page title's site name come from the address inside the copy; the copy is what is
read and what the card links (`siteUrlOf`; AL-037).

**Shelf AND whole-shop search, as the 28 (her decision)** — DIA files a show's book in the show's own section.
A search is kept only if it finds a book the finder saw (`proveShopSearch`; AL-008k, AL-014); older venues
work it out at first lookup.

## First test

10 pages, 6 venues: all full text, dates right 10/10; no JSON-LD comes through Parallel. Pages are the
fixtures (`docs/link_pages/`).

## The general reader — eight rules

From a read of 67 pages at 28 venues. Code: `readShowPage`, `splitPageTitle`, `DATES.findDateRange`. Proved on
fresh Parallel fetches (her decision for Parallel work); only the date phrases are unit-tested
(`date.test.js`, DS-002). A page with no dates still fails (blank dates are not approved).

- **R1 Site address tail** — a dash tail that is the site's own address is the site, not the title (KHM).
  `splitPageTitle`.
- **R2 Heading over tab title** — a tab title that is the heading plus a dash-led tail, or plus
  "Exhibition(s)", gives way to the heading (Acquavella, V&A, MAD, British Museum). `readShowPage`.
- **R3 Closing-only dates** — "Through …", "Until …", "Closes …", "fino al …", in the shared `dates.js` after
  the ranges, so a range still wins; the scraper reads them too. DS-002.
- **R9 One side completed** — a one-sided first date takes a full range further down that shares the date on
  the same side (Tate Modern *Ana Mendieta*); never a range ending on another day (National Gallery *Renoir
  and Love*).
- **R5 Title line** — first `# `; else first `##`/`###` holding the show's title; else first line holding it;
  else first short line (2+ words, 80 characters at most) that is a whole-word piece of it. The heading is the
  first with dates under it (Cincinnati *Rexroth*, Orsay *Cassatt*).
- **R6 Sixty lines** — dates are looked for in 60 non-empty lines under the title (`LINK_DATE_LINES`; Met
  *Harlem Renaissance*).
- **R4 Long date line stays** — a date line over 150 characters is a paragraph carrying the dates; it stays in
  the passage (Borghese, Uffizi).
- **R7 Clean passage** — a repeated line is kept once; HTML character codes become characters (Acquavella
  "Mir&oacute;"). `decodeEntities`.

## Venue link rules

**NGA has its own chip** (her decision): National Gallery of Art links (`occ-nga-gov`) are an occasional venue
in every other way, but sit under an "NGA" chip, never "Occasional", and their cards say NGA (`OWN_CHIP`;
AL-030). A leading "Exhibition:" is dropped from titles (her ask; *Hubert Robert, 1733–1808*): an `OWN_CHIP`
entry can carry `linkRead`, found by `linkReadVenue`. Proved live: five archive pages, title and dates (on
`docs/link_proof_pages.json`).

A venue's page can carry its own options (`linkRead` on its `MUSEUMS` entry; her decision: Parallel-only rules
live in the app, never the scraper). They only tidy what Claude is handed. Options: `title`, `titleDrop` (a
label before the show's name), `dateLine` (dates from the first line matching, anywhere), `from` / `until`
(passage starts after / ends at a matching line), `skip` / `skipEntities` / `minLine` (lines left out),
`cleanLink` (address loses query and fragment), `datesAbove` (dates up to N lines above the heading). An
occasional venue takes them from `OCC_LINK_READ`; read by `readShowPage`, `venueTitle`. Junk at the end of a
passage is tolerated (her decision).

- **met** — dates from the "on view" line (`dateLine`), anywhere on the page: a podcast transcript can push it
  past 60 lines, and an old-layout page prints it above the only line naming the show. *Matisse* (2012) prints
  no dates in its text at all.
- **Boston MFA** (`occ-mfa-org`, chip "Boston" under "Occasional", cards "Boston MFA", her decision) — dates
  printed on the line above the title (`datesAbove`).
- **frick** — a leading "Special Loan:" is the Frick's label, not the show's name (`titleDrop`).
- **menil** — a leading "Collection Close-Up:" dropped (`titleDrop`, her ask).
- **acq** — description = the "Press Release" text (`from`), headings and short caption lines dropped. Title =
  `# name` + the `##` line under it unless that is a place (New York, Palm Beach), joined as the scraper joins
  a card (`: `, a dash after a name with a colon). The gallery in brackets is not added: the scraper adds it
  only when one show ran in both galleries. Stored address loses `?view=…#…`. A layout with no Press Release
  skips lines with unread HTML codes (caption blobs). A `##` line opening "In collaboration with" is a credit,
  never a subtitle (her decision; *Calder | Miró*, `linkRead.credit`).
- **louvre** — title = the `##` and `###` lines joined (the `#` heading is those two run together); one `##`
  alone is the title. Passage: lines of 60+ characters, closure and late-opening notices skipped.
- **artic** — passage starts after the first "Share" heading, lines of 60+ characters; credit lines (©, "Photo
  courtesy", "Press 300ppi") and picture descriptions opening "A/An/The … painting/poster/cover … of/with/…"
  skipped. Passage ends at the closing "Share", a "Related" box or the newsletter (`until`): a photos-only
  page otherwise took another show's card as its description (*Violence and Virtue*; `noDescription`).
- **brit** — passage starts after the shop line ("For the catalogue, homewares and gifts…", archive pages) or
  "Book tickets" (current pages).

Proof pages for every rule above: `docs/link_proof_pages.json`.

## Re-checking the proof pages

Her decision: proof is always against the live internet; no page text is kept in the repo.
`docs/link_proof_pages.json` lists each proof page (`url`, `venue`, and the `title`, `start`, `end` signed
off; `note` where a field is knowingly imperfect). To re-check: fetch every listed address live through
Parallel (keyed connector only with her yes), save each reply as `{url,title,full_content}` by script, and run
`node scraper/link_proof_check.js <folder>` (`--all` also fails on a listed page with no reply); exit 1 on any
difference. Not in `npm test`. A difference is a reader change to sign off (update the list) or a site that
changed.

## Fallback — a link the app cannot read

The scraper reads that one page (a small recipe on pages she saves; robots.txt first), output the ordinary
CSV.