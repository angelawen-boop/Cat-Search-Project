# Add by link — design, decisions and venue link rules

**Her design; signed off at 39.5.** Code: "ADD BY LINK" in `Cat_Watch.jsx`; test
`scraper/fixtures/add_by_link.js` (AL-). The app handles unreadable links itself; no scraper-side reader.

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
- **An import she does not finish keeps NOTHING** — new venues and shops, Confirm / No shop /
  Look again, a CSV's sweep log: all stored when the ledger moves. Cancel import drops them; Back
  keeps them. A file or Read with nothing to propose counts as finished.
- **A link it cannot read is a line, never a card** — the full link and why (empty page, refused, no dates).
  Unread links **stay in the paste box**, stored when the import finishes, until read or cleared ("Clear", inside the box, empties it and the store). **Links come
  back to the box** (her decision): a rejected card's, an undecided card's after a partial apply, and on
  Cancel import every link the Read took — each stored at once. AL-012c, AL-024.
- **No lookback cutoff** for anything added by link (her decision).
- **Chip: one "Occasional"** for every venue added this way (her decision); each venue keeps its own name and
  shop behind it. A link to a venue already swept files under that venue. **Card names are hers** (`short` in
  the store, written by a session); the page title's name until she gives one.
- **Store:** `venues/occasional` (venues, shops, her confirmations) and `links/pending` (the box). Both were
  copied into her app's store when the cloud ledger merged. A ledger row whose venue a page's store has not met shows under
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
- **A shop on a site shared by many shops** (Yale's, on Touchnet): its menu is read on the exact page the
  museum links to, never the site's root, and that page is its shop link. A /museum-shop address counts as a
  shop page (`SHOP_PATH`). **A shop page that comes back as its title alone (one line) is opened once
  more with `page=1` added** (`openShopPage`; finder, the lookup's book page, Re-check): Touchnet sends its
  menu, lists and books only then. A short page of several lines is never retried (Louvre, LG-). **A menu label is read by its first six
  words** (`menuLinks`; Touchnet adds "The number of products in this category is"). Checked on the 48 saved
  pages: no menu ranks differently. AL-042.

**Fixes from Berlin (Staatliche Museen zu Berlin; proven live on its shop):**
- **A Shop button on the museum's own site** (smb.museum/webshop) vouches for that page, never the whole site
  ("Online Catalogues & Databases" there is no shop).
- **A Shop page that shows the shop itself** links one book first: the book's site is taken, not the book
  (`shopElsewhere`).
- **A book's own address in a menu** ("/buecher-und-medien/ausstellungskataloge/6442/brancusi") stands for the
  section it sits in (`menuLinks`).
- **German joins its words**: "Ausstellungskataloge" is a catalogues section, "Bücher" (`buecher`) books
  (`SHELF_CATALOGUES`, `SHELF_BOOKS`, `BOOK_WORD`).
Found: `smb-webshop.de/buecher-und-medien/ausstellungskataloge/`, by the shop's menu. Proven by running the app's
own finder with every call answered by a live Parallel fetch. The site itself often hangs (her own browser too).

A pick is **opened and must read as books with prices** (unless its excerpt already does), **or its first
product must read as one book with a price** — her decision, for a list of titles only (Yale's Publications;
`firstProductIsBook`, one copy with the lookup's shop step, AL-042, YS-001–005). Nothing → "Shop
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

## The general reader — ten rules

From a read of 67 pages at 28 venues. Code: `readShowPage`, `splitPageTitle`, `DATES.findDateRange`. Proved on
fresh Parallel fetches (her decision for Parallel work); only the date phrases are unit-tested
(`date.test.js`, DS-002). A page with no dates still fails (blank dates are not approved).

- **R1 Site address tail** — a dash tail that is the site's own address is the site, not the title (KHM).
  `splitPageTitle`.
- **R2 Heading over tab title** — a tab title that is the heading plus a dash-led tail, or plus
  "Exhibition(s)", gives way to the heading (Acquavella, V&A, MAD, British Museum). `readShowPage`.
- **R3 Closing-only dates** — "Through …", "Until …", "Closes …", "fino al …", "Now–…", in the shared `dates.js` after
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
- **R10 Heading over two lines** — a heading ending in a line break, then a plain line, is one heading and the
  title, over the tab title (Berlin: "## Donatello" / "Inventor of the Renaissance"; its tab titles can be
  misspelt or German). Joined with the tab title's own mark when it reads the same, else as the scraper joins.
- **R11 Range over three lines** — a date, a line holding only "to" or a dash, a date (Berlin).
- **R7 Clean passage** — a repeated line is kept once; HTML character codes become characters (Acquavella
  "Mir&oacute;"). `decodeEntities`.

## Venue link rules

**NGA has its own chip** (her decision): National Gallery of Art links (`occ-nga-gov`) are an occasional venue
in every other way, but sit under an "NG Washington" chip, never "Occasional", and their cards say NG Washington (`OWN_CHIP`;
AL-030). A leading "Exhibition:" is dropped from titles (her ask; *Hubert Robert, 1733–1808*): an `OWN_CHIP`
entry can carry `linkRead`, found by `linkReadVenue`. Proved live: five archive pages, title and dates (on
`docs/link_proof_pages.json`); descriptions carry menu and caption junk, left alone until it reaches Claude's.

**Mia** (Minneapolis Institute of Art): its own chip "Mia", cards print "MIA" (her decision); the full name and the
"–– Minneapolis Institute of Art" title tail are dropped (`OWN_CHIP`; AL-032, three pages on the proof list). HTML
codes in any page title are decoded ("Chagall&#039;s"). **Yale CBA** (Yale Center for British Art, `occ-britishart-yale-edu`): its own chip
and cards "Yale CBA", after Cincinnati (her decision); the lookup searches by the full name (`OWN_CHIP`; AL-039).
Its dates carry clock times ("February 7, 2008, 10:00 am ET–Sunday, April 27, 2008, 5:00 pm ET"): the shared date reader drops them (`CLOCK_TIME`, DS-003).
Its shop: the Publications section on Touchnet (AL-042, above), confirmed in her app; *Constable* filed In the museum shop by phase 4b (SB-, `docs/app.md`). Proved live on the **Yale Shop Check** page, https://claude.ai/artifact/ETa9sqoU2fCfxkW2kHz2et (`node build/shop_check.js`: the app's code whole, the finder, Find catalogue and Re-check run on the case, graded in code). **Jacquemart-André**: the line under the heading is the
subtitle, read by code (`subtitleUnderHeading`); the dates sit at the page's foot, so the description is read
from under the heading.

**Berlin** (Staatliche Museen zu Berlin, `occ-smb-museum`): its own chip "Berlin", after KHM; cards say
"Berlin Gemäldegalerie" (her decision); its shop is searched as "Staatliche Museen zu Berlin" (`OWN_CHIP`,
`OCC_CARD`). Dates are numbers with dots, day first (DS-004). Eleven pages on the proof list.

**Munich** — two venues, each its own cards and shop, under one chip "Munich Pinakotheken", the Alte first,
before Berlin (her decision; `group` on `OWN_CHIP`, `chipKey`): **Munich Alte Pinakothek**
(`occ-alte-pinakothek`) and **Munich der Moderne** (`occ-pinakothek-der-moderne`). The Neue is left out (her
decision): its pictures hang in the Alte while it is closed, and their pages name the Alte.
- **Which house** (`HOUSES`, `linkVenue`): a pinakothek.de show page prints its house on the line between title
  and dates ("Alte Pinakothek", "Pinakothek der Moderne | Art"); that line files the show and is never offered as
  a subtitle. A page naming neither is a line, not a card. The Pinakothek der Moderne's own site files under it;
  it prints "10/07/2026 - 04/10/2026" above the title, day first (`OCC_LINK_READ` `datesAbove`, `slashDayFirst`).
- **Shops: CEDON**, a company running several museums' shops, a section per house
  (`museumsshop.cedon.de/Kataloge/Alte-Pinakothek-Muenchen`, `…/Pinakothek-der-Moderne-Muenchen`), linked only
  from the museums' house pages. Searched in German, one query per house (`shopQueries`: "<house> München
  Museumsshop Kataloge"; live: Alte's section 1st in 3 of 3, der Moderne's 4th in 6 of 7; the English queries
  never found der Moderne's). A shop site outside the museum's domain counts when its own address names the
  house (`shopNamed`, `namesVenue`) — the other house's section there does not. On for these two venues only:
  a general rule needs every link venue's shop search re-checked live first. CEDON's own search is not known
  (`shopSearch` null): lookups read the section. AL-043.
- Proved live: six show pages on the proof list (both sites, both houses), and the app's own finder run on
  the live searches with excerpts withheld, so it opened each pick: both sections found, the Dana Schutz page's
  ticket-shop link (`pinakothek.shop`) not taken.

A venue's page can carry its own options (`linkRead` on its `MUSEUMS` entry; her decision: Parallel-only rules
live in the app, never the scraper). They only tidy what Claude is handed. Options: `title`, `titleDrop` (a
label before the show's name), `dateLine` (dates from the first line matching, anywhere), `from` / `until`
(passage starts after / ends at a matching line), `skip` / `skipEntities` / `minLine` (lines left out),
`cleanLink` (address loses query and fragment), `datesAbove` (dates up to N lines above the heading), `crumb` (title from the breadcrumb when the page never prints its tab title). An
occasional venue takes them from `OCC_LINK_READ`; read by `readShowPage`, `venueTitle`. Junk at the end of a
passage is tolerated (her decision).

- **met** — dates from the "on view" line (`dateLine`), anywhere on the page: a podcast transcript can push it
  past 60 lines, and an old-layout page prints it above the only line naming the show. *Matisse* (2012) prints
  no dates in its text at all.
- **Boston MFA** (`occ-mfa-org`, chip "Boston" under "Occasional", cards "Boston MFA", her decision) — dates
  printed on the line above the title (`datesAbove`). Legacy Illuminated, Degas and Sargent are unchecked
  (the free tier refused).
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
- **cincinnati** — a tab title the page never prints (a sentence: *Cagnacci*) gives way to the breadcrumb's last step (`crumb`). "Now–May 30, 2021" (*Anila Quayyum Agha*) is a closing date only, no opening date (her decision; the shared `dates.js`, DS-002).
- **brit** — passage starts after the shop line ("For the catalogue, homewares and gifts…", archive pages) or
  "Book tickets" (current pages).

Proof pages for every rule above: `docs/link_proof_pages.json`.

## What links are for, and how far the reader reaches

- **At a swept venue** a link is for shows before the 1 July 2024 lookback, or a venue she
  has stopped sweeping (too few keepers per sweep) — never a show the scraper has or will
  have. Otherwise, occasional venues. **No exclusions apply to a link** (her decision):
  displays and collection shows are added too.
- **The general reader works at 17 of the 28** once the eight rules are in (checked on 67
  live pages: one archive, one current each, plus her 10 occasional links). Still short:
  acq, rijks, borghese, louvre, uffizi, mam, mad, ashmolean, artic, brit, dellav. **Her
  choice: only acq, louvre, artic and brit get work** (deep archives); the others may never
  come into play. A page printing no year ("5 June to 25 October") still fails — blank
  dates are NOT approved, and "current year" would misdate archives.
- **Titles from a page title** (AL-015): the show is the first part of a barred title, the
  site the last; a bar inside the show's own name ("Duccio | Caro") is kept, read off the
  page's heading. A page title that dresses the heading ("Exhibition Giovanni Bellini in
  Paris") gives way to the heading.
- **A link from one of the 28 files under that venue**, known by its site from the
  scraper's recipes (`VENUE_SITES`, written by `build/sync_shared.js`; the Tates told apart
  by path). A new venue's shop is looked for once per Read, never once per link.
- **Claude reads relevant passages, not the first N characters** (`pickPassages`): lines
  naming the book or show, catalogue/ISBN/price words, or a link onto the venue's shop come
  first. A link labelled "catalog" onto the venue's shop, in web results, is taken in code
  (`catalogueLinkOn`).

## Re-checking the proof pages

Her decision: proof is always against the live internet; no page text is kept in the repo.
`docs/link_proof_pages.json` lists each proof page (`url`, `venue`, and the `title`, `start`, `end` signed
off; `note` where a field is knowingly imperfect). To re-check: fetch every listed address live through
Parallel (keyed connector only with her yes), save each reply as `{url,title,full_content}` by script, and run
`node scraper/link_proof_check.js <folder>` (`--all` also fails on a listed page with no reply); exit 1 on any
difference. Not in `npm test`. A difference is a reader change to sign off (update the list) or a site that
changed.
