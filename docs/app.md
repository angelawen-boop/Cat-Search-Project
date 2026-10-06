# The app — evidence and design

`CLAUDE.md` §4 carries the rules. This carries the evidence behind them.
**Read the relevant section before changing the catalogue lookup, the intake
screen, quarantine, the sweep log or saving.** Compressed 30 Sep; the full
history is in git.

---

## 1. Catalogue lookup

### The route

Each step runs only if the one before left something missing.

1. **The venue's shop** — its catalogues shelf and its search box for the
   exhibition's title, opened together in one call. Take the book's own product
   page, never a list.
2. **Open that page** for the ISBN, the publisher and any publisher link
   (`fillIsbn`).
3. **ISBN still missing → search the open web**, gaps only (`fillFromWeb`). It
   cannot rename the title, move the shop link or change the "in the shop"
   verdict. C-039 to C-042.
4. **No publisher page → go to the publisher** (`fillPublisherPage`): only for
   a catalogue found, with a publisher named and no page yet.

Nothing in the shop sends it to the open web to decide whether a catalogue
exists at all. Results are tagged shop / web / none. Reseller links (Amazon AU,
AbeBooks, Alibris) are built from the ISBN, or the title when there is none.

**Why the page uses a connector.** The viewer's sandbox blocks a page from
reaching any outside address (`Network: Failed to fetch` is the browser
refusing). Since 20 Sep the lookup runs through her Parallel Search connector
(free, no key), with `sample` reading what it returns. Claude only reads text
handed to it, so it can never report a page that was not found.

### Why each rule exists

- **`web_fetch` to open a known address; `web_search` only for three real
  searches** (does the book exist, where is its ISBN, where does the publisher
  live). The connector has no way to lock a search to one site — `site:` is a
  hint — so a search "of the shop" became a general web search still labelled
  "shop". Result: the National Gallery's *Zurbarán* was filed as the shop's LIST
  of 32 books while the book's own page, printing its ISBN, sat five results
  lower. The model had both and chose the list: **a choosing failure, so the fix
  is to stop choosing from a general index**, not to rank better.
- **Open the candidate before believing it.** A `site:` search returned the
  book at Rizzoli (ISBN in the address) and only a section at Hannibal (books
  addressed by `#fragment`, never indexed). Same label, two different results.

  | The opened page is | Kept | Button |
  |---|---|---|
  | the book's own page | that address, `product` | Publisher |
  | a list with the book on it | the book's link read off it, `product` | Publisher |
  | empty — drawn by script | the section, `container` | Publisher's section |
  | not this book | next candidate, then the fallback | |

  - A link read off a list is checked (`deepLinkOn`): the publisher's own host,
    not the list itself. A different `#fragment` is a different address — that
    is how Hannibal addresses a book.
  - "Empty" is measured (`pageIsShell`, 400 characters). Hannibal's section
    returns 110; a real shelf returns thousands. `full_content` returns the same
    110, so no cheaper route exists; a rendering fetch for a handful of
    publishers is not worth building.
  - **Two candidates, then the fallback** — the results are already ranked.
    The fallback is `https://<publisher>/`, labelled **Publisher's website**
    (her yes, 22 Sep) — matters most at Borghese, Capodimonte and the
    Accademia, which have no shop.
- **Go to the publisher, don't search for them** (her correction, 21 Sep).
  Four tuned queries failed to surface `hannibalbooks.be`. Now: one search for
  the publisher's NAME; the domain is read off the results in code, because a
  publisher's name is in its hostname (`publisherDomainFrom`). Shared words —
  books, press, publishing, editions, university — are dropped. Then search
  INSIDE that domain for the title. C-046 to C-051. A map of publisher websites
  was declined; if ever needed it is a short list of co-imprints (Rizzoli Electa,
  DelMonico · Prestel).
- **Every outcome says which one it was** (`publisherNote`; C-052 to C-069a,
  C-069a asserts no two sentences match). `publisherResult` records what the
  STEP concluded:

  | Outcome | The card says |
  |---|---|
  | `product` | nothing — the button is the answer |
  | `container` | Publisher's link opens the section this book sits in, not the book's own page. |
  | `site` | The publisher's own site doesn't show this book — the link opens their home page. |
  | `nosite` | Couldn't work out the publisher's own website, so there's no link to it. |
  | `unnamed` | No publisher was named for this book, so none was looked for. |
  | `selfpublished` | nothing — no publisher button is answer enough (her ruling, 6 Oct) |
  | none recorded | nothing — the step did not finish (the banner says why), or the row is older than 22 Sep |

- **A museum's own imprint is skipped** (`isSelfPublisher`): a publisher
  carrying THIS venue's full name, whole words (her rule, 6 Oct, on trial —
  misfires → back to the list alone); her list `SELF_PUBLISHERS`; her
  `NOT_SELF_PUBLISHERS` overrides both. A blockbuster handed to an art-book
  house, or a joint show printed by the other museum, carries no part of this
  venue's name and is still looked for (her 22 Sep cases). Known misfire: a
  namesake ("National Gallery of Art" at the London NG). C-070 to C-078e.
- **The publisher link is checked** (`cleanPublisherUrl`): a real address, not
  the venue's own shop. C-032 to C-038.
- **A step that died is not an answer.** Each later step carries why it came
  back empty and the screen says so (search stopped part-way, press Search
  again). Not stored in the ledger — a fact about one attempt. C-043 to C-045.

### The ISBN

- **The book's page is read whenever the ISBN OR the publisher is blank**
  (`needsPageRead`). The connector returns excerpts, so small print below the
  fold was missed (the Met's *Musical Bodies*; Alibris then returned the wrong
  book by title). A gate on the ISBN alone always opened after a shop hit and,
  the one time it stayed shut, lost a publisher. C-009 to C-013a.
- **It fills blanks only** (`applyIsbnFill`).
- **A collapsed "Details" panel is read** — its text is in the page (Met store,
  ISBN 978-1588398130, verified 21 Sep). A shop that fetches details on click
  would still come back empty.
- **ISBN-10 is taken and converted** (`isbn10to13`), old check digit verified
  first. For her screen, not for searching — resellers find either. `toIsbn13`
  is the only way in; `cleanIsbn` the strict 13-digit gate. Prompts ask for the
  ISBN as printed and forbid the model converting it. C-017, C-019 to C-025.

### The connector's limits and cost

- The keyless tier refuses after roughly a dozen searches in quick succession;
  the limit is published nowhere (600/min is for accounts with a key). It clears
  in minutes.
- Up to four searches and three readings. **Searches are free; readings run on
  her allowance.** Every step after the first is conditional.

### A book leaving the shop — "Re-check museum shop" (her design, 25 Sep)

A page can't see what she saw in a tab it opened, so the status moves only when
the app re-reads the page itself — and only when she presses the button, after
seeing the change. It is not a monitor.

| Row has | Re-check does | Result |
|---|---|---|
| a shop link, green | re-reads THAT page | 404 / redirected / sold out → **No longer in the museum shop.** (dark red), link kept as **Museum shop (last seen)** |
| a shop link, red | re-reads THAT page | buyable → **Back in the museum shop.** |
| no shop link | the shop step alone | found → **Now in the museum shop.** |

- No history kept (her ruling). A failed check changes nothing — a refusal,
  timeout or empty page is never "gone".
- 404/410 decided in code from the connector's error entry; anything else is one
  question to Claude about one page. Pre-order counts as in the shop; sold out /
  unavailable in any language counts as gone.
- **Search again fills blanks only and never moves the status**
  (`keepWhatWeKnew`). An earlier design moved it on Search again and could not
  work — shops keep sold-out books listed — so it was replaced.
- Tested: C-079 to C-099, `recheck_shop.js` R-001 to R-023. **Not yet seen: how
  a real shop words "sold out", or a real redirect.**

### Blocked shops, tickets, web-found shop links (25 Sep)

KHM's *Canaletto & Bellotto* was filed "In the museum shop" with a dead TICKET
link. Three faults: the shop's waiting room (307 on every page) read as "not in
the shop"; the web search offered a ticket address from an old index; a link on
the shop's host was filed as in the shop without being opened. Her rulings: a
blocked shop says so (her wording, `CLAUDE.md` §4); a ticket is never a
catalogue; a web-found shop link counts only once opened and shown to be the
book for sale. Rows already carrying a ticket link lose it on Re-check. L-001 to
L-019; L-020 to L-023 for `listedOnly`.

### Shop addresses — checked by opening each, 21 Sep

`shopCatalogues` (the shop's own shelf, named from its own navigation) is opened
first, `shopSearch` (+ the exhibition title) in the same call. Both, because
`uffizi` and `khm` have no shelf, and elsewhere the search box catches a book
filed on another shelf. **Sold-out books stay listed** on shelves (Menil 47 with
4 sold out; National Gallery back to 2019).

| Venue | Catalogue shelf | Search box |
|---|---|---|
| met | `store.metmuseum.org/books-toys-games/exhibition-catalogues` | `/search?q=` |
| rijks | `rijksmuseumshop.nl/en/books/exhibition-books` | `/en/search?q=` |
| ng | `shop.nationalgallery.org.uk/books/exhibition-catalogues.html` | `/catalogsearch/result/?q=` |
| acq | `acquavellagalleries.myshopify.com/collections/all` — the whole shop is catalogues | `/search?q=` |
| frick | `shop.frick.org/publications/` (whole shelf, 2 Oct) | `/search.php?search_query=` |
| menil | `bookstore.menil.org/collections/menil-publications` | `/search?q=` |
| artic | `shop.artic.edu/collections/exhibition-catalogues` | `/search?q=` |
| wallace | `wallacecollectionshop.org/collections/wallace-collection-publications` | `/search?q=` |
| both Tates | `shop.tate.org.uk/books/exhibition-books?sz=96` | `/search?q=` |
| va | `vam.ac.uk/shop/books/exhibition-books.html` | `/shop/search?q=` |
| louvre | `boutique.louvre.fr/en/products/400001-exhibition-catalogues/` | `/en/search/products/?q=` |
| brera | `bottegabrera.org/en/collections/guide-e-cataloghi` | `/en/search?q=` |
| moma | `store.moma.org/collections/exhibition-catalogues` | `/collections/shop?q=` (her search, app 35.4) |
| brit | `britishmuseumshoponline.org/books/exhibition-books.html` | `/catalogsearch/result/?q=` |
| morgan | `shop.themorgan.org/collections/exhibition-catalogs` | `/search?q=` |
| uffizi | none — sells no books (her check, 25 Sep) | `shop.uffizi.it/en/?s=` |
| khm | none | `shop.khm.at/en/products?shop%5Bq%5D=` (her search, 25 Sep) |

No shop: borghese, capo, dellav. Venues added from 25 Sep: in `MUSEUMS`, a
comment each.

- **Shelf depth is one number for every shop**, three pages, read in the same
  call. Menil and Morgan answer `?page=2`; Tate's `?sz=96` serves all at once.
  C-026 to C-031. `mad` has no search box, so its shelf is read five deep
  (`SHELF_DEPTH`).
- **A venue blocked for sweeping says nothing about its shop** — moma, brit,
  morgan, met and artic shops all answered the reader first time. KHM and MAM
  are the blocked shops.
- **A thin answer from a page is not proof the page is thin** — the Met's
  results page first read as navigation only.

### Which model — closed, her ruling 22 Sep

The app names no model. It asks the viewer's Claude through `sample`; every
lookup read passes `modelTier: default`. `quick` risks exactly the misreadings
this route was rebuilt to fix; `complex` costs more; nothing has misread, so
there is nothing to tune against. Only one `.jsx` has ever existed in this repo
— the "Sonnet copy" was a Chat artifact.

**One model string survives in dormant code, and stays until she says:**
`askDrive` (the Google Drive save routine, uncalled) carries
`claude-sonnet-4-6`. A session once deleted that whole routine without asking;
it was restored byte for byte. Unreachable is not unwanted.

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

**Never put back a click-triggered green tick** — on 20 Sep it read "Saved —
safe to close" while nothing was written.

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

**Four bands for odd cases, easiest first** (her ruling, cut from six):
1. Marker rows · 2. Combined rows, reconciled · 3. Combined rows, conflicted —
yours to choose · 4. No exhibition url.

Each band opens or closes by what it asks of her, not by size (markers and
reconciled start closed); the count sits on the header.

- **Band membership is the fold's own flag** (`merged`, from `mergedFrom`), never
  words in the notes — note-searching filed Acquavella's two real *Portraiture*
  runs as "combined". Fixture 16.
- **Two bands deleted:** "Two different answers" could never hold a row (fixture
  17 asserts every conflict comes from a fold); "Unusable rows" was a data fault
  — `qc.js` stops it upstream and the app refuses the WHOLE file, naming the
  lines. A bad DATE is still an exhibition: blanked and noted.
- **Conflict pre-pick is `fuller()`** — meaningless for two dates (a tie keeps
  file order). Her ruling: leave it.
- **Order within a venue:** fills, then edits, then new; newest closing date
  first in each; no closing date last.

### The ledger will not move until every card is decided

A hard block (her ruling): skipping undecided cards silently loses a session's
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

### Screen rulings

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
- **Lives in the page's store AND her export** (her ruling, 20 Sep). Her case:
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

**Lives OUTSIDE the ledger** (her ruling): a sweep either ran or didn't, and
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
- **Written when the import FINISHES** (her rule, 4 Oct: an import she does
  not finish keeps nothing); a file with nothing to propose is recorded at once.
  AL-013.
- **Merge, never replace** — a venue's line moves only for a LATER sweep; tried
  and brought-rows move independently. Fixtures 15, 15a, 15b.
- **The headline "Last refreshed" reads the store**, not the ledger's old
  `lastRun` (still written to exports for old builds, drives nothing).
- **"Unknown", never "never"** for an empty store; an unreachable store has its
  own sentence. `page_renders.js` checks both.
- **The export will not carry it** — her ruling, 20 Sep.

**The wipe-and-restore drill, passed 21 Sep for real:** the store was emptied
from outside; quarantine came back from her export (by her), sweep dates from
the sweep files via `sweep_log.js` (by the session — never her job: she can't
know which file holds the picture). A released tombstone doesn't survive an
export, correctly. The drill found the headline line reading the ledger. Store
read-out kept in `docs/store_backup_2026-09-21/`.

---

## 6. The seed set

~110 exhibitions read 20 Aug 2026 by Chat Claude (met / ng / rijks / acq),
baked into the JSX, shown via Reset. Its fetch tool couldn't see archives, so
it is thin on history at met (51 vs 106 swept) and rijks (20 vs 37). 58 of 59
closed-show Adds at seed venues were genuinely absent. **Nothing to fix; not a
matching failure.**

---

## 7. Tests

- **`page_loads.js` asks whether the page LOADS; `page_renders.js` whether it
  DRAWS** — renders into jsdom twice, plain and with the runtime answering. The
  load check passed twice while the live page was black.
- `scraper/fixtures/intake_cases.js`: merges that must not happen, quarantine,
  freshness, row identity, whole-file refusal, the ledger gate, the sweep-log
  merge. Sample file `intake_sample.csv`: 76 rows, 8 venues, every conflict
  shape.
- The harness lifts the intake out of the JSX by prose anchors, not line numbers.

---

## 8. The inversion — worth preserving

Ingestion was expected to be easy and the portal hard; it was the other way
round. **Data gathering depends on the outside world's current architecture.**
So the app is kept, the data layer is swappable underneath, and neither
"rebuild the app around a new backend" nor "downgrade the app to fit the tools".

---

## 9. The cloud ledger — what's on screen (branch `claude/ledger-cloud`)

Her wording and order, 26 Sep. The branch code holds the exact strings.

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
- **Cloud Saves tray**, beside Quarantine: 'Export: "**description**" · N
  exhibitions'; safety copies "Safety snapshot before
  Load" / "…Reset" / "…roll-back to <time>" (`snapTitle` renames old labels on
  screen). Download, Roll back (asks first).
- After an Import: "Import complete. Save it now both offline and to the
  cloud.", a blank line, then the counts — until a Save delivers both.
- **The amber "not saved to a file" banner is unwired, not deleted**
  (`FILE_UNSAVED_WARNING`) — needed again if the trial fails. Load and Reset ask
  first only while the red banner shows.
- **Storage, proven 25 Sep:** 352 rows, 217 KiB → 46 KiB compressed, one
  piece; 180 KB read back identical; 270 KB refused at the 256 KiB limit.
