# Picked shows — "Add by link" in the app

**Her design, 3–4 Oct 2026; signed off at 39.5.** Code: "ADD BY LINK" in
`Cat_Watch.jsx`; test `scraper/fixtures/add_by_link.js` (AL-). Replaces the
scraper-side plan of 28 Sep (in git), which survives only as the fallback below.

## The problem

Some venues matter only now and then (~5 shows a year). A full venue costs a
recipe, an archive and a monthly sweep — then ~30 rows arrive and 27 are
dismissed. She would rather pick the shows and add one the moment she meets it.

## The design

- **Import opens ONE small pop-up — nothing added to the page** (her design,
  4 Oct, 39.2): **CSV · Links**, a small **Cancel** under them (the footer's
  Quarantine style). CSV = the file picker, the sweep route. Links = the box
  and **Read** below, same pop-up; progress bar and "Reading 3 of 10…" there.
  Links separated any way; a repeat read once. The review opens when reading
  ends; the pop-up waits under it if a link failed.
- **Then the shop screen** (her design, 4 Oct): with a card going in from a
  venue outside her 27 whose shop is unconfirmed, the review's last button is
  **Next** → one card per new venue met in the Read (whatever her card
  decisions): **Confirm · Look again · No shop**, always in that order, the
  review cards' button style. **The ledger moves only when every one is
  answered.** Back returns to the review. Confirmed once, never asked again.
- **The ordinary review.** Each link becomes a pro forma row fed to the
  existing intake: Add / Fill / Change / Reject / quarantine all as now.
- **A link it cannot read is a line, never a card** — the full link and why
  (empty page, refused, no dates). Unread links **stay in the paste box**,
  stored when the import finishes (her rule, 4 Oct), until read or cleared.
- **No lookback cutoff** for anything added by link (her ruling).
- **Chip: one "Occasional"** for every venue added this way (her ruling); each
  venue keeps its own name and shop behind it. A link to a venue already
  swept files under that venue. **Card names are hers** (`short` in the
  store, written by a session); the page title's name until she gives one.
- **Store:** `venues/occasional` (venues, shops, her confirmations) and
  `links/pending` (the box). Copy both when the cloud page merges (CLAUDE.md
  §7.1). A ledger row whose venue a page's store has not met shows under its
  web address, shop "not found".

## Per link — code first, model only for prose

1. One page read (`fetchPage`, `full`).
2. **Title = what the catalogue would be called** (her ruling): the page's
   title, site name stripped; subtitles and split headings kept. **Title stays
   in the museum's language.**
3. **Dates:** the first range after the show's heading, by the scraper's own
   date reader — moved to its own file and shared, never copied.
4. **Description by the model** (`modelTier: default`, her ruling), same
   prompt as compression, shared not copied. **Any non-English page comes out
   in English; a non-English title gets its translation at the start**
   (`In English: "…".`) — every language, not only Italian (her ruling).
5. No note — a link is not a sweep; `swept_at` blank, sweep log untouched.

## A venue the app has not seen

Name from the page title. Its shop: the **exhibition-catalogues section**,
else the museum's publications, else books — **never the front page, one book,
a post, or a section mixing books with other goods** (her rulings, 4 Oct). A
mixed section ("Books & Stationery") is opened and a books-only section inside
it taken. **Nothing found is stored until the import finishes.** Code: "FINDING A NEW VENUE'S SHOP SECTION".

1. **One search call, two queries: hers, "<venue> shop exhibition
   catalogues", and "<venue> shop books publications"** — Detroit's "DIA
   Publications" came back 1st with both, never with hers alone (keyed, 4 Oct).
   Parallel does not always rank the section first (Cleveland's was 4th), so
   code ranks every result: the museum's own shop site only; plural section
   words; "not Catalogues" and sale shelves refused or last.
2. **A Shopify shop's section list** (`collections.json`, read by Parallel
   4 Oct) — Thyssen's search held only single books. Ranked on titles.
3. **The shop's menu.**

A pick is **opened and must read as books with prices** (unless its excerpt
already does). Nothing → "Shop found, but not its books section: <shop>" /
"No museum shop found." / "Search failed." — and **a miss is a finder bug,
fixed in code: she never pastes a shop link** (her ruling, 4 Oct). **Look again**
skips only the pages she turned down, never the site. **No shop** → lookups go to the web, as at
Capodimonte. Venues found by the old finder and never confirmed are looked
for again on their next link. Evidence: `docs/link_pages/shop_search/`.

**Shelf AND whole-shop search, as the 28 (her rule, 6 Oct)** — DIA files a show's book in the
show's own section. A search is kept only if it finds a book the finder saw
(`proveShopSearch`; AL-008k, AL-014); older venues work it out at first lookup.

## Tested 3 Oct

10 pages, 6 venues: all full text; dates rule right 10/10. No JSON-LD comes
through Parallel. Pages are the fixtures (`docs/link_pages/`).

## The general reader — eight rules

From a read of 67 pages at 28 venues. Code: `readShowPage`, `splitPageTitle`,
`DATES.findDateRange`. Proved on fresh Parallel fetches, not fixtures (her rule for
Parallel work); only the date phrases are unit-tested (`date.test.js`, DS-002). A page
with no dates still fails (blank dates are not approved).

- **R1 Site address tail** — a dash tail that is the site's own address is the
  site, not the title (KHM "Cleopatra & Rome – Crime Scene Ephesus - KHM.at").
  `splitPageTitle`.
- **R2 Heading over tab title** — a tab title that is the heading plus a
  dash-led tail, or plus "Exhibition(s)", gives way to the heading (Acquavella
  "- New York - Exhibitions"; V&A "- Exhibition at V&A South Kensington · V&A";
  MAD "- du 10 April au …"; British Museum "Korea exhibition"). `readShowPage`.
- **R3 Closing-only dates** — "Through January 10, 2027", "Until …", "Closes
  Sunday, 15 November 2026", "fino al 24 aprile 2026" (Met *Costume Art*, V&A
  *Schiaparelli*, MoMA *Architects of Liberation*). In the shared `dates.js`,
  after the ranges so a range still wins; the scraper reads them too.
  `date.test.js` DS-002.
- **R9 One side completed** — a one-sided first date takes a full range
  further down the page that shares that date on the same side (Tate Modern
  *Ana Mendieta* "Until 17 January 2027"; Rijksmuseum *Frans Hals*). Never a
  range ending on another day: National Gallery *Renoir and Love* "Until 31
  January 2027" must not take "23 October 2026 to 15 January 2027".
- **R5 Title line** — candidates in order: first `# `; first `##`/`###` holding
  the show's title; first line holding it; first short line (2+ words, 80
  characters at most) that is a whole-word piece of it. The heading is the first
  with dates under it (Cincinnati *Rexroth*, whose `# ` is another show; Orsay
  *Cassatt*, no `# `).
- **R6 Sixty lines** — dates are looked for in 60 non-empty lines under the
  title, not 40 (`LINK_DATE_LINES`; Met *Harlem Renaissance*).
- **R4 Long date line stays** — a date line over 150 characters is a paragraph
  that carries the dates; it stays in the passage (Borghese *Metamorphoses*,
  Uffizi *Sarmi*).
- **R7 Clean passage** — a line repeated word for word is kept once (Uffizi
  *Sarmi* repeated ten), and HTML character codes (named HTML 4 set, numeric)
  become characters (Acquavella "Mir&oacute;"). `decodeEntities`.

## Venue link rules

A venue's page can carry its own options (`linkRead` on its `MUSEUMS` entry; her
decision: Parallel-only rules live in the app, never the scraper). They only
tidy what Claude is handed; other venues and occasional ones are untouched.
Options: `title` (built from the page's headings), `from` (the passage starts after
the first line matching), `skip` / `skipEntities` / `minLine` (lines left out),
`cleanLink` (stored address loses its query and fragment). Read by `readShowPage(res,url,vc)`,
`venueTitle`. Junk at the end of a passage is tolerated (her decision).

- **acq** — description = the "Press Release" text (`from`), headings and short
  caption lines dropped. Title = `# name` + the `##` line under it unless that is a
  place (New York, Palm Beach), joined as the scraper joins a card (`: `, a dash
  after a name with a colon). The gallery in brackets is not added: the scraper
  adds it only when one show ran in both galleries. Stored address is the show
  page without `?view=…#…`. Proved: *Bonnard*, *James Rosenquist* (Painting Below
  Zero), *Lucian Freud* (Monumental), *Calder | Miró* and the pasted *From Cézanne
  to Rosenquist* (no Press Release on that layout: lines with unread HTML codes,
  the caption blobs, are skipped). A `##` line opening "In collaboration with" is
  a credit, never a subtitle (her decision; *Calder | Miró*, `linkRead.credit`).
- **louvre** — title = the `##` and `###` lines joined (the `#` heading is those
  two run together); one `##` alone (*Golden Age of the Portuguese Renaissance*) is
  the title. Passage: lines of 60+ characters, closure and late-opening notices
  skipped. Proved: *Naples in Paris*, *Things*, *Pharaoh of the two lands*, *The
  Golden Age of the Portuguese Renaissance*.
- **artic** — passage starts after the first "Share" heading, lines of 60+
  characters, credit lines (©, "Photo courtesy", "Press 300ppi") and picture
  descriptions that open "A/An/The … painting/poster/cover … of/with/…" skipped.
  Other picture descriptions stay (*Van Gogh and the Avant-Garde*: two).
  Proved: *Christina Ramberg*, *Hito Steyerl*, *Van Gogh and the Avant-Garde*,
  *Revoliutsiia! Demonstratsiia!*.
- **brit** — passage starts after the shop line ("For the catalogue, homewares and
  gifts…", archive pages) or "Book tickets" (current pages). Proved:
  *Michelangelo: the last decades*, *China's hidden century*, *Burma to
  Myanmar*, *The world of Stonehenge*, and current *Korea*.

## Re-checking the proof pages

Her decision: proof is always against the live internet; no page text is kept in
the repo and no test is built from a saved page. `docs/link_proof_pages.json` lists
each proof page (`url`, `venue`, and the `title`, `start`, `end` the reader gave
when signed off; `note` where a field is knowingly imperfect). The title is the
reader's own, before any subtitle Claude picks. To re-check: the main session
fetches every listed address live through Parallel (the keyed connector only with
her yes, if the free tier refuses), saves each reply as `{url,title,full_content}`
in a folder by script (never retyped), and runs
`node scraper/link_proof_check.js <folder>` (`--all` also fails on a listed page
with no reply). It prints each page beside the list and exits 1 on any
difference. Not in `npm test`: it needs live replies. A difference is either a
reader change to sign off (update the list) or a site that changed.

## Fallback — a link the app cannot read

The scraper reads that one page (a small recipe on pages she saves; robots.txt
first), output the ordinary CSV.
