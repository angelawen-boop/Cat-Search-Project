# The app — evidence and design

`CLAUDE.md` §4 carries the rules. This carries the evidence behind them.
**Read the relevant section before changing the catalogue lookup, the intake
screen, quarantine, the sweep log or saving.** The full history is in git. The app's original long comments: `git show bea6dd7:Cat_Watch.jsx`.

---

## 1. Catalogue lookup

### The route — five phases (`lookupCatalogue`)

Top level, so `catalogue_route.js` runs it whole with the connector and Claude
faked. Steps gather facts; code decides each fact in a set order of trust;
`composeRow` writes the row once. No step writes card text.

1. **Find the book.** The venue's shop first — its catalogues shelf and its
   search box for the exhibition's title, in one call; the book's own product
   page, never a list. A book the shop step found is in the shop; its link is
   filed only when it is on the shop (BA-001 to BA-003). Only if the shop has
   nothing: one web search and one read, tied to THIS venue's show
   (`thisVenue`), a web-found shop link opened before it is believed.
   A catalogue the read ties to this venue but names by neither title nor ISBN
   (a press release's "the accompanying catalog", her Hubert Robert) goes on to
   the facts round, which is asked its title; neither found there → no catalogue,
   said in the diagnostic (`unnamed`; UN-001 to UN-003).
2. **Complete the record.** (a) The book's own page, if the ISBN or publisher is
   missing: ISBN in code; at an English-speaking venue Claude reads it for what
   is still missing. (b) The facts round — always at a non-English venue,
   elsewhere only for a missing ISBN or a missing or guessed publisher: the
   facts search and, at non-English venues, an edition search aimed at library
   records, launched together; ONE read over both (and the book's page, at a
   non-English venue). (c) ISBN still missing: up to two results about the
   book opened whole.
3. **Which book** (code only, non-English venue, book not in English): an
   English edition is accepted only when a fetched result carries its ISBN and
   shows the link — same house as the original or the venue named
   (`sameCatalogue`), the original's ISBN, or a linking phrase ("originally
   published", "édition anglaise"…) with every key word of the original title
   (`englishEditionOf`). The card then carries it, `originalEdition` the
   original. ED-001 to ED-005. **Her three cases (Hubert Robert):** the
   venue's own English edition (same house) wins; a pure translation published
   elsewhere counts only when there is none; a different book never crosses
   to the other venue's card — page counts more than 15% apart, each printed
   in the results, mark a different book (`pagesPrinted`, `differentBook`;
   Somogy 544 vs Lund Humphries 288). A non-English venue's web read takes
   its own book; later steps re-read the first web search. A book refused as
   different is named on the English line, no links (`otherVenueBook`). HR-001 to HR-014.
4. **The publisher's page, once, for the final book** (`findPublisherPage`).
5. **The row, once.** One owner per fact: shop line, `publisherNote`,
   `englishLine`. A step that fails leaves its facts unknown, sets `trouble`
   (`troubleLang` for the language step) and its sentence claims nothing.

**Trust order.** ISBN: the book's page in code (`isbnOnPage`), the results in
code (`isbnInResults`, on the book's title once known, never the show's), then
Claude's. One book per card: a guessed publisher the ISBN's own records
contradict gives way to theirs (`oneBook`); an ISBN whose records print far fewer
pages than the catalogue is a booklet — another ISBN printed with the catalogue's
count replaces it, else none is filed (`notABooklet`; Hubert Robert's album; BK-).
Two versions of one book (same key words, page counts agreeing): hardcover leads,
else an outside publisher over a museum's own imprint; the other is named after the
ISBN, "also 978-… (paperback, X)" (`otherVersionOf`, `leadsOver`; Vasari; VS-);
with a page count missing, only the very same title words count. Publisher labels
are read with links reduced to their words; a co-edition's site is found by any one
house, outside houses first (`siteOfHouses`; R8-). Publisher: read off the ISBN's results
(`publisherOnIsbnResults`), then printed on the book's own shop or publisher
page, then any read of general results — a guess wherever it came from. The
diagnostic says which won. Title: `titleAsPrinted`.

**Speed.** At most three connector calls and two Claude reads at once; a page is
never opened twice; the diagnostic counts calls and times each step.

**A reply holding two answers** ("Wait — here is the corrected object", her Louvre
links Hubert Robert and Body and Soul): Claude's last answer, its own correction, is
taken (`lastJsonObject` in `readResults`; every read). TW-001 to TW-004.

**The lookup log** (her decision): Find catalogue, Search again, Re-check and each
link Add by link reads save one record to the page's store (`lookups`, newest 50),
so a miss or an untidy title is diagnosed without her pasting the panel. It holds
every call's input and full answer, what Claude was sent and its exact answer, the
card before and after, and for a link what code read off the page and the title
made; gzipped, split
into `pieces` under the 256 KiB cap. Nothing shows on the page; the panel is
unchanged. A session reads it: ArtifactData `list` of `lookups`, then of
`lookups/<id>/pieces`, with `out_dir`; then `node build/lookup_log.js <dir> <id>`.
`saveLookupTape`; LL-001 to LL-009.

**The progress line** (her decision): at most four labels, in order, each once,
never back — "Searching venue shop…", "Searching more broadly…" (shop had
nothing), "Finding the ISBN and publisher…" (book's page and facts round; at
`english:false` venues "…, publisher and English edition…"), "Looking for the
publisher's page…". Re-check: "Re-reading the shop page…", or the first label
alone. `lookupLabel`; PL-001 to PL-005.

**Why the page uses a connector.** The viewer's sandbox blocks a page from
reaching any outside address. The lookup runs through her keyed connector,
"Parallel Search Key", with `sample` reading what it returns. Claude only reads
text handed to it, so it can never report a page that was not found.

### Why each rule exists

- **`web_fetch` to open a known address; `web_search` only for real searches.**
  `site:` is a hint, so a search "of the shop" became a general search still
  labelled "shop": the National Gallery's *Zurbarán* was filed as the shop's
  LIST of 32 books while the book's page sat five results lower — a choosing
  failure, so the fix is to stop choosing from a general index.
- **Open the candidate before believing it.** A `site:` search returned the
  book at Rizzoli (ISBN in the address) and only a section at Hannibal (books
  addressed by `#fragment`, never indexed).

  | The opened page is | Kept | Button |
  |---|---|---|
  | the book's own page | that address, `product` | Publisher |
  | a list with the book on it | the book's link read off it, `product` | Publisher |
  | empty — drawn by script | the section, `container` | Publisher's section |
  | not this book | next candidate, then the fallback | |

  - A link read off a list is checked (`deepLinkOn`): the publisher's own host,
    not the list itself. A different `#fragment` is a different address.
  - "Empty" is measured (`pageIsShell`, 400 characters): Hannibal's section
    returns 110; a real shelf thousands. No rendering fetch is worth building.
  - **Two candidates, then the fallback**, `https://<publisher>/`, labelled
    **Publisher's website** — matters most where a venue has no shop.
- **Go to the publisher, don't search for them.** The site is read off results
  already found, else one search for the publisher's NAME; the domain is read
  off the results in code (`publisherDomainFrom`; books, press, publishing,
  editions, university dropped). A page on that site already found and
  carrying the title or ISBN is opened directly; else a search inside the
  domain, ranked in code (`rankPublisherPages`), Claude only when code finds
  none. C-046 to C-051. A map of publisher websites was declined; a short list of
  joint publishers whose name is not in their address is hers
  (`PUBLISHER_SITES`: Rizzoli Electa, DelMonico · Prestel), used only when the
  name finds no site. Grown only when her card says "Couldn't work out the
  publisher's own website" for one that has a site, and she asks. PS-001 to PS-006.
- **"Checked the publisher's site" only when read** (Canaletto): fetched, not
  empty, and the page the card links (`pubPageRead`). For a foreign book the
  judging read also lists the editions the page shows — a publisher lists every
  language it printed (Watteau); an English one with its own ISBN there is the
  same house, so accepted.
- **Every outcome says which one it was** (`publisherNote`; C-063 to C-069a):

  | Outcome | The card says |
  |---|---|
  | `product` | nothing — the button is the answer |
  | `container` | Publisher's link opens the section this book sits in, not the book's own page. |
  | `site` | Couldn't find this book on the publisher's site — the link opens their home page. |
  | `nosite` | Couldn't work out the publisher's own website, so there's no link to it. |
  | `unnamed` | No publisher was named for this book, so none was looked for. |
  | `selfpublished` | nothing — no publisher button is answer enough (her decision) |
  | none recorded | nothing — the step did not finish (the banner says why), or an older row |

- **A museum's own imprint is skipped** (`isSelfPublisher`): THIS venue's full
  name, whole words (on trial), her `SELF_PUBLISHERS`, her
  `NOT_SELF_PUBLISHERS` overriding both. On trial: too many misfires → back to
  her list alone (known misfire: a namesake). C-070 to C-078e.
- **The publisher link is checked** (`cleanPublisherUrl`, `publisherLinkOf`):
  a real address on the publisher's own site. C-032 to C-038.
- **One fold for matching** (`foldText`): accents dropped and ø æ œ ß ł đ ð þ ı
  folded, so "Hammershøi" matches "Hammershoi". LT-001 to LT-004.

### Rules her decisions settled

Each replaced a real failure. Wording of the card lines is in the code.

- **Only the publisher is the publisher** (Millet): a link a read hands over is filed
  only on the publisher's own site (`publisherLinkOf`); a distributor's page never.
  Self-published → no link at all.
- **Another venue's catalogue is not this show's**: a book found on the web is filed
  only when the read says it is the catalogue of the show AT THIS VENUE (`thisVenue`);
  a show that travels here "in modified form" does not count. The shop step needs no
  such answer. A blank publisher with the ISBN known runs the wider search too.
- **The title as printed, English first at non-English venues**: a shop title is kept
  only as far as the pages print it (`titleAsPrinted`). At an `english:false` venue the
  facts round reads the book's language and own title, and the edition search (aimed
  at library records — "originally published in French as …" — plus the show's English
  title with the publisher when known) runs beside it, with one web query in the
  venue's language (`localCatalogueQuery`; Hammershøi, listed only in French). An
  English edition proved → filed as "Not in the museum shop", the original in
  `originalEdition`; none → the book stays under its own title. "Checked publisher's
  site" only when its page was read, once, the page the card links, listing its
  editions (Watteau, Canaletto): `englishCheck`, `englishLine`; the line never repeats
  the publisher printed above it.
- **"X in association with Y" — Y is the publisher** (`publisherToFind`); the card
  prints the line as given. **A co-edition, "X / Venue", "X and Venue", "X with
  Venue": X is the publisher**, for every publisher verdict (Turner).
- **The publisher is read off the ISBN, in code** (Botticelli gave three publishers in
  three lookups): once the ISBN is known, the labelled publisher in results carrying it,
  two agreeing (`publisherOnIsbnResults`), outranks the book's own page, which outranks
  any read of general results. The facts round runs always at a non-English venue;
  elsewhere only for a missing ISBN or a missing or guessed publisher.
- **An English edition must be the same catalogue** (Botticelli): a result carrying its
  ISBN shows the same publisher or names the venue (`sameCatalogue`), carries the
  original's ISBN, or links it to the original's title. Reaktion's monograph is refused
  (ED-004).
- **Search again means search again**: a whole fresh lookup from a blank card (`lookupCat`
  → `resetCard`), nothing kept or skipped. Finished → it replaces the card's catalogue
  details; any step failed → the card is untouched and says "Search again didn't
  finish". The old "keep what's on the card" rule is gone; do not bring it back. Within
  one lookup, each step fills what earlier steps left blank.
- **A blocked shop says so** (`shopState: "blocked"`): *"The museum shop is blocked -
  search it manually. The catalogue is stocked elsewhere."* / *"The museum shop is
  blocked. The catalogue also does not appear to exist elsewhere. Search manually to
  confirm."* Headline red and bold, the rest grey. Blocked: KHM, MAM. A shop whose every
  page comes back empty is blocked too — MoMA's shelf is drawn by script and its search
  and `products.json` answer 403. Judged on the WHOLE page, opened again when the
  excerpts are short; no price anywhere = empty (Watteau).
- **The Museum shop link searches the shop for the EXHIBITION's title** when no book page
  is on file (`buyLinks`) — resellers keep the book's title, the shop keeps the show's.
  A search or shelf page is never filed as the book's page (`listedOnly`). KHM opening
  its search is the design working. A ticket is never a catalogue (`isTicketLink`); a
  shop link from the web search is opened before it is filed as in the shop
  (`confirmShopLink`).
- **Under a book not in the shop** — "Not in the museum shop — shop link opens the
  general store." for every venue with a shop. **A venue with no shop** (`borghese`,
  `capo`, `dellav`) reads only "Venue has no shop.", grey, with no shop link and no
  Re-check button; its lookup goes straight to the web.
- **Booko AU** (last buy link) is `booko.au/<isbn>`; with no ISBN, its title search. It
  works well on the ISBN; the messier title-search results are accepted.
- **A book's link on a shelf is read in code** (`bookLinkOnShelf`): the one link whose
  words carry the whole catalogue title; two, or none, and nothing.
- **One page is read whole** (`fetchPage` `{full:true}`): the book's page, Re-check's
  page, the publisher's candidates. The shelf stays excerpts (a call is capped ~25,000
  characters). The ISBN is read in code first (`isbnOnPage`: exactly one 978/979
  number labelled ISBN or EAN, check digit valid); Claude's only when code finds none.
  "Sold by …" is the shop, never the publisher. Hidden-until-clicked text is not in
  Parallel's copy.
- **The web ISBN search reads its results in code too** (`isbnInResults`): only results
  carrying the whole book title count; labelled numbers and valid 978/979 numbers in
  their addresses; exactly one. None → the two results about the book are opened whole.
  Queries name the venue.

### The ISBN

- **The book's page is read whenever the ISBN OR the publisher is blank** — the
  connector returns excerpts, and small print was missed (the Met's *Musical
  Bodies*). Read whole (her decision): excerpts dropped the Orsay Cassatt's
  EAN. A collapsed "Details" panel already in the page is read; details fetched
  on click are not. C-009 to C-013a, C-120 to C-129.
- **`toIsbn13` is the only door**: a 13 whose check digit holds, or a valid 10
  converted — and in a lookup only if its digits, 13 or 10, are printed in text
  the app fetched (`isbnInText`). `cleanIsbn` stays as it was: it also shows
  ISBNs already in her ledger. IG-001 to IG-006.
- **Fills blanks only** (`applyIsbnFill`). Prompts ask for the ISBN as printed
  and forbid converting it.

### The connector's limits and cost

- Her keyed connector, **"Parallel Search Key"**: custom, at
  `https://search.parallel.ai/mcp-oauth`, No sign-in, her key in an `x-api-key` header
  (`authorization: Bearer` never reached Parallel). Every search and page opened is
  billed to her Parallel account ($20 credit for 60 days, then $5 a month, auto-reload
  off). The built-in keyless "Parallel Search" cannot be removed; a second connector at
  `/mcp` is refused. About 30–50 lookups so far with only brief connection errors.
- The keyless tier refuses after roughly a dozen quick searches (observed, unpublished).
  Per `mcp.d.ts`, `rate_limited` is never returned and `upstream_error` is the catch-all,
  so its refusal is most likely "Search failed (upstream_error)" in the app (not
  proven). A failed search shows one line on the card (Re-check's words with
  "Search"/"Search again"); no red banner.
- Up to five searches and seven page opens per lookup, plus Claude reads on her
  allowance; every step after the first is conditional.

### A book leaving the shop — "Re-check museum shop" (her design)

A page can't see what she saw in a tab it opened, so the status moves only when
the app re-reads the page itself — and only when she presses the button, after
seeing the change. It is not a monitor.

| Row has | Re-check does | Result |
|---|---|---|
| a shop link, green | re-reads THAT page | 404 / redirected / sold out → **No longer in the museum shop.** (dark red), link kept as **Museum shop (last seen)** |
| a shop link, red | re-reads THAT page | buyable → **Back in the museum shop.** |
| no shop link | the shop step alone | found → **Now in the museum shop.** |

- No history kept (her decision). A failed check changes nothing — a refusal,
  timeout or empty page is never "gone".
- 404/410 decided in code from the connector's error entry; anything else is one
  question to Claude about one page. Pre-order counts as in the shop; sold out /
  unavailable in any language counts as gone. **Sold out anywhere on the page
  outranks** "Add to cart", a price or a note to earlier pre-orderers (Morgan Tarot).
- **Search again is a whole fresh lookup** (her decision) and, when it
  finishes, replaces the card — shop status included. Re-check is unchanged.
- Tested: C-079 to C-099, `recheck_shop.js` R-001 to R-023. **Not yet seen: how
  a real shop words "sold out", or a real redirect.**

### Blocked shops, tickets, web-found shop links

Three rules (KHM *Canaletto & Bellotto*, filed "In the museum shop" with a dead TICKET
link): a shop's waiting room (307 on every page) is not "not in the shop"; a ticket is
never a catalogue; a web-found shop link counts only once opened and shown to be the
book for sale. A blocked shop says so (her wording, `CLAUDE.md` §4). Rows already
carrying a ticket link lose it on Re-check. L-001 to L-019; L-020 to L-023 for
`listedOnly`.

### Shop addresses — checked by opening each

`shopCatalogues` (the shop's own shelf, named from its own navigation) is opened
first, `shopSearch` (+ the exhibition title) in the same call. Both, because `uffizi`
and `khm` have no shelf, and elsewhere the search box catches a book filed on another
shelf. **Sold-out books stay listed** on shelves (Menil 47 with 4 sold out; National
Gallery back to 2019).

**The addresses are printed from `MUSEUMS` by `node scraper/shop_addresses.js`** — the
code is the one copy. No shop: borghese, capo, dellav (`uffizi` sells no books; `khm`
has no shelf).

- **Shelf depth is one number for every shop**: `SHELF_DEPTH`, five pages, read
  in the same call — five covers MAD's 68 books. Menil and Morgan answer
  `?page=2`; Tate's `?sz=96` serves all at once. C-026 to C-031.
- **A venue blocked for sweeping says nothing about its shop** — moma, brit,
  morgan, met and artic shops all answered the reader first time. KHM and MAM
  are the blocked shops.
- **A thin answer from a page is not proof the page is thin** — the Met's
  results page first read as navigation only.

### Which model — closed, her decision

The app names no model. It asks the viewer's Claude through `sample`; every
lookup read passes `modelTier: default`. `quick` risks exactly the misreadings
this route was rebuilt to fix; `complex` costs more; nothing has misread, so
there is nothing to tune against. Only one `.jsx` has ever existed in this repo
— the "Sonnet copy" was a Chat artifact.

---

## 2. Saving and loading (`main`)

She holds the only real copy of the ledger; the app is the workspace. Open →
empty portal; Import → pick file. Red **UNSAVED CHANGES** after any change.
**Export IS Save.** Import and Reset ask before replacing unsaved work.

The sandbox blocks any download a page starts itself (*"File downloads aren't
available for this artifact"*). Two routes, differing in what is KNOWN:

1. **The runtime's file handoff** (the `downloads` capability, declared at
   publish). Saves or rejects — so the green tick means a save happened.
2. **An ordinary browser download.** Cannot tell finished from cancelled, so it
   does not clear the unsaved warning.

**Never put back a click-triggered green tick** — it once read "Saved — safe to
close" while nothing was written.

### Removed code — warnings that outlive it (git `b043a9b` has the rest)

- **Never restore the Google Drive save and load as it was**: it called Claude's
  servers straight from the page, which the viewer's sandbox blocks. A Drive backup
  button (CLAUDE.md §7.1) goes through a Google Drive connector, as the catalogue
  lookup goes through Parallel's.
- **A new "find catalogues for all Wanted"** must work within her Parallel and
  Claude allowance and, on `claude/ledger-cloud`, respect the read-only lock.

---

## 3. Refreshing and the intake screen

A sweep CSV goes in via **Import Refresh**; the app compares it with the ledger,
offline, and shows proposals by venue: **Add**, **Fill/Change** (per field, with
"this is a different show"), **Couldn't be filed**. Bad data is surfaced with a
note, never dropped. To correct: reject the bad rows, fix those cells at the
source, feed the whole file again; applied rows stay silent.

### Reading a stitched file

The stitch stays dumb; all judgement is in the app, where she sees it.

- **Marker rows are not proposals** — matched on the exact sentence `Marker row,
  not an exhibition.`, shown as a coverage panel.
- **Duplicate rows fold on venue + URL, nothing else.** Gaps fill silently; a
  real disagreement becomes a CHOICE card, fuller value ticked and marked a
  guess. Folds are disclosed so counts reconcile.
- **Rows with no URL never fold** — `sameExhibition()` says yes whenever either
  side lacks dates. An unfolded duplicate costs one card; a wrong fold costs an
  exhibition.

**Four bands for odd cases, easiest first** (her decision):
1. Marker rows · 2. Combined rows, reconciled · 3. Combined rows, conflicted —
yours to choose · 4. No exhibition url.

Each band opens or closes by what it asks of her, not by size (markers and
reconciled start closed); the count sits on the header.

- **Band membership is the fold's own flag** (`merged`, from `mergedFrom`), never
  words in the notes — note-searching filed Acquavella's two real *Portraiture*
  runs as "combined". Fixture 16.
- **No "Unusable rows" band:** a data fault is stopped upstream by `qc.js`, and the app
  refuses the WHOLE file, naming the lines. A bad DATE is still an exhibition: blanked
  and noted.
- **Conflict pre-pick is `fuller()`** — meaningless for two dates (a tie keeps
  file order). Her decision: leave it.
- **Order within a venue:** fills, then edits, then new; newest closing date
  first in each; no closing date last.

### The ledger will not move until every card is decided

A hard block (her decision): skipping undecided cards silently loses a session's
reading. **Rejecting is deciding.** The button says what is missing ("323 still
to decide"). `countDecisions` lives outside the component so fixtures reach it;
it and the jump-to-undecided button share `isUndecidedCard` (18g). Fixtures 18
to 18g. The partial-apply button beside it: `CLAUDE.md` §4, fixture 18h.

### Counts that reconcile

Her wording, two sentences, each ending in the number the next starts from:

```
From 415 rows in the file — 9 marker rows, 0 duplicate rows reconciled/de-duped,
86 already matching ledger = 320 entries considered for import
From 320 entries — 14 fill a gap, 7 edit existing data, 299 new exhibitions
```

Quarantine adds a "you'd said never to add" term. **Every term stays.**

### Sorting, timestamps and dividers — do NOT "simplify"

- Every import stamps **one shared time for the batch**. New rows get `addedAt`;
  `editedAt` only when a later sweep changes a row. The seed has no stamps — the
  "Original set" floor.
- **Date ladder:** just opened → on now → dates unclear → announced → closed
  <3mo → 3–6 → 6–12 → over a year. "Dates unclear" placement is her choice.
- **Recently added:** This import / Earlier imports / Original set. **Recently
  edited:** This import's edits / Earlier edits / Never edited / Original set.
- After an import the touched batch floats to the top under one "Rest of the
  list" divider, gone on any sort click.
- "Announced last" applies to the Wanted filter only. Acquiring filters: AND
  across axes, OR within one.
- Urgency tiers are computed live (`tierFor`); nothing stored.

### Screen decisions

- Venue headings are the control: accent red, larger, own count, disclosure
  triangle, sentence case; one Collapse all / Expand all. "n to decide" sits
  beside the venue's count.
- Quarantine shelf 12.5px in body ink; "Remove from quarantine"; toggle reads
  "Quarantine - 3" on its own row. A quarantine that can't save is a banner.
- **Dark mode:** a Dark / Light button; first visit follows the machine, her
  pick then wins on that device (browser storage, wrapped). Every colour is named
  (`PALETTES`, `TIER_SETS`); the dark set is designed, not inverted. The shell
  paints a ground before React runs.

---

## 4. Quarantine

**For real exhibitions she never wants proposed again** — dead links,
non-exhibitions, genuine duplicates. Not undated shows. Reject stores nothing
(the row comes back); accepting then dismissing keeps it forever; quarantine is
the third option.

- **Keyed on normalised URL** (venue + title with no URL). Dropped in
  `analyzeProForma`'s first pass. A venue retitling a show does not undo it
  (fixtures 10–13).
- **Lives in the page's store AND her export** (her decision). Her case:
  quarantine two rows, Reset, feed the same file — with one home in the ledger,
  the junk is back. But it can't live only in the store like the sweep log,
  because it is derivable from nothing. Not two hopeful copies: the store is the
  working copy, the export the backup, and one rule settles disagreements.
- **Latest decision wins, with tombstones** (`mergeQuarantine`) — a release is
  recorded, or an older backup would silently re-block it. The ledger file keeps
  its plain `ignored` list, so old files and old builds still work. Fixtures 20
  to 20g.
- **Counted, never silent**, and listed at the top with a remove button on every
  row. The panel shows with no ledger open.

---

## 5. The sweep log

**Lives OUTSIDE the ledger** (her decision): a sweep either ran or didn't, and
opening an older backup can't un-run it. Content rolls back with a backup; a
fact about the world must not. Rejected arguments for the ledger: "a republish
could destroy it" (it can wipe the seed too); "the shell has nowhere to keep
anything" (false — the page has its own store).

- **One document in the page's store, one line per venue**, never growing;
  survives Reset. **A cache, not a master record**: every fact comes from
  `swept_at`, so any sweep file rebuilds it.
- **Rebuilding it is code's job** — `scraper/sweep_log.js` prints the document
  from every sweep file on disk; a session writes it with `ArtifactData`.
  Fixtures S-001 to S-006 (S-004 holds it against the JSX's `mergeSweepLog`).
- **Written when the import FINISHES** (her decision: an import she does
  not finish keeps nothing); a file with nothing to propose is recorded at once.
  AL-013.
- **Merge, never replace** — a venue's line moves only for a LATER sweep; tried
  and brought-rows move independently. Fixtures 15, 15a, 15b.
- **The headline "Last refreshed" reads the store**, not the ledger's old
  `lastRun` (still written to exports for old builds, drives nothing).
- **"Unknown", never "never"** for an empty store; an unreachable store has its
  own sentence. `page_renders.js` checks both.
- **The export will not carry it** — her decision.

**The wipe-and-restore drill passed:** with the store emptied from outside, quarantine
comes back from her export (by her) and sweep dates from the sweep files via
`sweep_log.js` (by the session — never her job). A released tombstone doesn't survive an
export, correctly. Store read-out kept in `docs/store_backup_2026-09-21/`.

---

## 6. The seed set

~110 exhibitions read 20 Aug 2026 by Chat Claude (met / ng / rijks / acq),
baked into the JSX, shown via Reset. Its fetch tool couldn't see archives, so
it is thin on history at met (51 vs 106 swept) and rijks (20 vs 37). 58 of 59
closed-show Adds at seed venues were genuinely absent. **Nothing to fix; not a
matching failure.**

---

## 7. Tests

In `CLAUDE.md` §4, "Tests".

---

## 8. The inversion — worth preserving

Ingestion was expected to be easy and the portal hard; it was the other way
round. **Data gathering depends on the outside world's current architecture.**
So the app is kept, the data layer is swappable underneath, and neither
"rebuild the app around a new backend" nor "downgrade the app to fit the tools".

---

## 9. The cloud ledger — what's on screen (branch `claude/ledger-cloud`)

Her wording and order. The branch code holds the exact strings.

- **Times** read "Sep 26, 2026 1:22pm" (`localReadable` = `fmtRefresh`); file
  names keep the sortable stamp.
- **Status lines, in order:** (1) the cloud line, green — "☁ Last cloud save: …
  (N minutes ago) · N exhibitions" — or the red "CLOUD COPY NOT SAVING" banner
  ending with the last save time; (2) a blank line; (3) the loading line, black,
  dismissable, saying whether the loaded file differs from the last cloud save
  (with the count, and that a safety snapshot was taken) or matches it; (4) the
  saving line, message green and bold, file name plain.
- "Loaded N exhibitions from your file" is not wired while the loading line
  shows; it still shows with no store, and for Reset, roll-back and Open.
- **Save panel:** description, "Also save a copy to cloud" (ticked), Save now.
  Cloud copy first. "Local file saved. Extra copy also sent to the cloud." /
  "Cloud copy kept. Local file not saved - cancelled."
- **Cloud Saves tray**, beside Quarantine: 'Cloud copy of Export:
  "**description**" · N exhibitions'; safety copies "Safety snapshot before
  Load" / "…Reset" / "…roll-back to <time>" (`snapTitle` renames old labels on
  screen). Download, Roll back (asks first).
- After an Import: "Import complete and needs to be saved offline and to the
  cloud — tap Save now", until a Save delivers both.
- **The amber "not saved to a file" banner is unwired, not deleted**
  (`FILE_UNSAVED_WARNING`) — needed again if the trial fails. Load and Reset ask
  first only while the red banner shows.
- **Storage limit:** a record over 256 KiB is refused; a large ledger splits into
  compressed pieces (a 352-row ledger is one piece) and reads back identical.
