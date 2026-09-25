# Cat Watch — project guide for Claude Code

**Repo:** `angelawen-boop/Cat-Search-Project`

She collects art-exhibition catalogues. They go out of print fast once a show
closes, then resale prices climb. **Cat Watch** tracks temporary exhibitions at 24
museums and galleries and shows how close each catalogue is to its likely
out-of-print window, so she can buy before it is too late.

Two components, and they are **coupled**:

1. **The app** — `Cat_Watch.jsx`, a React page published on her Claude account.
2. **The scraper** — `scraper/`, which produces the CSV the app eats.

They agree on the pro forma CSV columns (§3). If the scraper changes what it
writes, the app has to agree in the same breath. That coupling — not tidiness —
is why they live in one repo, on one branch.

---

## 1. How to work on this project

### House rules

- **Plain English, ELI5 — but never as cover for explaining less.** She does not
  read code and does not want to. Explain the logic, the trade-off, the risk —
  all of it — in easier words. Simplify the *language*, never the *substance*.
- **Be concise, then cut another 60%.** She is optimising for
  decisions-per-minute. Short bullets, never paragraphs.
- **Suppress most visible thinking.** It burns her allowance and is written in a
  register she cannot read.
- **This guide talks ABOUT her in the third person. Never talk TO her that way.**
  "She" and "her" here mean the person reading your reply. Saying "her call" or
  "she confirmed" to her face is alienating and she has said so.
- **Never hand back a list of open items copied out of this guide without
  checking it first.** Lines go stale: an item can be settled, rejected, or
  already done. Read the surrounding passage before repeating it.
- **She tests every change herself, by clicking, on the published page.** Never
  report an automated test's blind spot as though the app were unverified.
- **Never propose dropping a feature or accepting reduced functionality as the
  fix.** When something breaks, make it work.
- **No undiscussed changes, no silent workarounds, no shortcut fixes.**
- **She will not manually enter exhibition data.** A fixed constraint.
- **Destructive actions need a confirmed backup or an explicit yes.**
- **NEVER REPUBLISH THE APP WHILE SHE HAS IT OPEN.** Her ledger lives IN that
  page until she Exports, so a publish landing mid-review can take unsaved work
  with it. Ask, or wait until she says she is out.
- **Long runs need progress.** A backgrounded command showing nothing reads as a
  dead session.
- **Test conservatively — her rule, 24 Sep.** Every page fetched from a venue
  counts toward its rate limit, and a limit hit stops work. Before touching the
  network, work out the fewest venues and the fewest pages at each that answer
  the question. Saved pages and fixtures first. Never a blanket re-sweep because
  it is quick.
- ISBN-13 is always displayed `xxx-xxxxxxxxxx` (3 digits, hyphen, 10 digits).

### Put it in code — her rule, 10 Sep 2026

**Hard code beats a Claude Code session, and a session beats Chat Claude.** Push
every job as far up that order as it goes. The test:

> **Does the task have exactly one correct answer, derivable from the inputs?**

- **One correct answer → code.** Merging files, choosing which venues still need
  running, validating a date, resolving a link, rebuilding a lost cache. These
  must never be prose rules a session re-derives — that is precisely how a CSV
  gets mangled, and the damage is invisible until it reaches her.
- **Many acceptable answers, or judgement about the outside world → a model.**
  Compressing curatorial prose into a six-word teaser.
- **Even then, a model touches strings, never files.** A script owns the CSV and
  asks for a value; the model never sees a comma or a column.

Chat Claude has no project context and cannot read this guide. Last resort.

### Editing this guide

Loaded in full at the start of every session, so every line costs something every
time. It hit 2,905 lines on 22 Sep 2026 and was cut to this. Keep it that way:

- **Record the conclusion, not the journey.** The story of how a bug was found
  belongs in `docs/`, not here. When a finding is overturned, replace the passage
  — git is the archive.
- **Anything derivable from the repo is printed by a script, not typed here.**
  The venue table was the standing example of the failure and is now
  `scraper/venue_status.js`.
- **Put the trigger next to the code, not in an index here.** A comment above the
  date parser saying "read `docs/scraper.md` first" fires because the session is
  already looking at that line.
- **Never duplicate a code comment into this guide.** One copy will drift, and
  the drift is silent.
- **Never use `@path` imports here** — Claude Code loads those eagerly.

### Branching

**`main` is the trunk and the source of truth for app, scraper and this guide.**
Work there. `.claude/hooks/session-start.sh` switches a web session's
auto-assigned branch to `main` before work begins; it refuses if the tree is
dirty or the branch carries unmerged commits, and it fetches first.

Branches are for separating in-progress work from known-good work, never for
separating components. Use one only for a side quest that might be thrown away.

**Do not merge, do not re-open:**

| Branch | What it is |
|---|---|
| `claude/quiet-user-agent` | The 16 Sep user-agent work. Parked, her ruling 19 Sep — §5 |
| `claude/personal-tracking-ledgers-z49s2h` | Dead. An old default branch with no CLAUDE.md |
| `claude/met-connection-experiments` | Abandoned experiment |
| `claude/playwright-scraper-prototype-z68iko` | Abandoned — merging it would undo the current scraper |

`claude/jsx-stitched-intake` merged into `main` on 20 Sep and is kept as history.

---

## 2. Where things stand

### Run the script, do not read a table

```
node scraper/venue_status.js
```

Per venue: rows from the last run that brought any, the last run that held the
venue at all, which machine sweeps it, and — read from the marker rows, never
inferred — why the last attempt brought nothing. When the two runs differ, that
venue has stopped answering.

As of 22 Sep: **406 exhibitions across 18 venues**; `moma`, `brit` and `morgan`
have never returned one; `met` and `artic` were refused on 16 Sep after that
session's repeated sweeps.

**A browser with a PAST gets into all three blocked venues — 22 Sep.** Every
earlier attempt used a blank profile Playwright built and threw away. A visible
Chrome on a profile SHE had browsed in was served `moma`, `brit` and `morgan`
cleanly, no challenge offered, from the same machine and address that had been
refused six days earlier. MoMA went all the way to a real exhibition page with
text — the first ever read from that venue. **`scraper/probe_headed.js` is the
record and the tool; `docs/venues.md` §Morgan has what this overturned.**

**But access was never the hard part — PACE is.** Five addresses fired back to
back, four at one museum, and everything after the first was challenged; the
judgement then followed us to the other venue, since both sit behind the same
protection. **The engine currently fetches exhibition pages with no gap at all**
— MoMA alone would fire 24 in seconds. Nothing sweeps these three until that is
fixed. Open: is it speed, or a limit per browsing session? The two look
identical from here and the next run is designed to separate them.

### What the script cannot derive — her rulings, per venue

Judgement about the outside world is not in any file.

| Venue | Her ruling |
|---|---|
| `va` | Displays excluded — **this venue only** |
| `wallace` | Displays and trails KEPT — **this venue only** |
| `menil` | 7 permanent galleries excluded; "Foyer Installation: …", "… from the Collection", "Recent Acquisitions" excluded — **this venue only** (24 Sep) |
| `tate-britain` | Ofili excluded, on the venue's own ONGOING label |
| `tate-modern`, `tate-britain` | Exhibitions only, never collection displays (24 Sep). The "recently opened" page is not an archive and is not fetched |
| `tate-britain` | Past exhibitions from the What's On calendar's date range, 1 Jul 2024 to the day of the run (25 Sep) — `expandDateRange`. A session nested under a show is not a show |
| `tate-modern` | **Never its past exhibitions**, though she knows where they are (24 Sep) |
| `uffizi` | Headlines kept as titles; undated rows kept |
| `artic` | Only `EXHIBITION` and `TICKETED EXHIBITION` — §13 of `docs/scraper.md`. Bare "from the Collection" and titles with "Film Series" excluded; family, named and lent collections KEPT (24 Sep). No note on the card for films or installations; no model judging rows — compression stays mechanical (24 Sep) |
| `met` | Recurring series (P.S. Art, Scholastic, crèche, Burdick baseball cards) and every commission series excluded. **Nothing excluded for coming from a collection, a gift or acquisitions** — they can be major (24 Sep) |
| `moma` | **Current and upcoming only.** She does not want its past at all |
| `jacquemart` | Exhibitions only — the card's own tag; operas, costume balls and other events refused (25 Sep) |
| `lgd` | New York and London only — the Hong Kong partnership shows ("& Wei, Hong Kong") excluded (25 Sep). **One-time lookback exception:** *Yves Klein and the Tangible World* kept, its catalogue only just published — `keepDespiteLookback`, that one address only |
| `morgan` | *Collections Spotlight* excluded — a standing rotation, not a show. Past blurbs read off the listing, pages not opened |
| `rijks` | 37 rows, not chased further. *Asian Pavilion* was pulled by the venue |
| `capo` | **Not count-verified and never will be** — see below |
| `brera`, `borghese` | Their single extra row is a marker for a genuinely empty upcoming page |

**Whether displays count is HERS, and it varies by venue** — different museums
mean different things by the word. Two venues disagreeing is the expected state,
not a contradiction to tidy up.

**Capodimonte is closed differently.** It publishes in Italian only, so taking a
CSV row and finding that exhibition on the site is uselessly slow. Her decision:
import every row unless visibly mangled, then use the app's URL button and let
Chrome translate. Two consequences — **the `url` column is the load-bearing field
at this venue, not the dates**, and **the summary must arrive in English**.
Reasoning in `docs/scraper.md` §15.

**All 24 have a recipe**, blocked ones included: a refusal costs half a second,
leaves marker rows that show on the approval pile, and turns every sweep into a
standing monitor. **Blocks are not permanent facts** — in five days Borghese went
down and came back, dellav turned out never to have been blocked, the Met's
archive turned out reachable, and `artic` went from reliable to refused.

**Every reachable venue but Capodimonte was reviewed by her against the live site
and re-swept** — `docs/review-2026-09-12.md`, venue by venue. Read it before
touching a venue listed there. The one open exception is the Frick's page two.

No row carries a credit line, star rating, ticket price, funder list, opening
hours, breadcrumb or cookie notice. The only empty summaries are three Rijksmuseum
rows whose own pages return 404, plus occasional page timeouts — which say so on
the row.

---

## 3. The contract — the pro forma CSV

The **only** file the app ingests. Columns exactly, in this order:

```
venue_code, title, start_date, end_date, summary, url, notes, swept_at
```

- CSV, not Excel. Excel silently reformats dates.
- Dates `YYYY-MM-DD`. The app blanks what it cannot read and notes it.
- `venue_code` must be one the recipes know. Unknown codes land in "Couldn't be
  filed".
- **Sweep lookback is 1 July 2024, permanently.**

### What the lookback means

Keep an exhibition if it was **open at any point on or after 1 July 2024**.

- March 2024 → September 2024 is **kept**; January 2024 → June 2024 is **dropped**.
- **The test is on the end date, never the start date.**
- An unreadable end date is **kept and flagged** — an unknown date is not evidence
  of being too old.
- **One exception: a year with no day.** "Summer 2022", "March / 2026" is a known
  but imprecise date, so take the **latest possible day of that year** as an upper
  bound and drop if even that is before the floor. Lookback test only —
  **nothing is written into the date columns.**

### The scraper must never de-duplicate

**It records everything it finds and makes no judgement about duplicates, ever.**
Deciding whether two rows are the same exhibition happens in the app, where she
sees each proposal. A scraper that silently drops rows it *thinks* are duplicates
makes that decision unseen, and when wrong the loss is invisible. That is exactly
what happened: **32 National Gallery exhibitions looked like 3 and 29 were
destroyed.**

**The one permitted exception: never read the same address twice.** Two rows with
the same URL are the same exhibition, always, with no interpretation. Nothing
cleverer qualifies — "same title", "looks like the same show" are judgements, and
the last one cost 29 exhibitions. Three details make it work:

- Compare the **finished address**, not the raw href (`normalizeUrl()`).
- The guard spans a **whole venue**, not one page.
- **Only scheme and host are lowercased.** Hosts are case-insensitive by spec;
  paths are not. Folding the whole address merged two exhibitions differing only
  in capitalisation.

A link resolving to **another host** is refused and counted in its own `offsite`
column. Every listing page a row is seen on is recorded once and written as
"Found on … Also listed on …" (`listing_note.js`) — her only trace of where a
row came from. A link read from OUTSIDE the listing (a menu or promo card on
every page) makes these lie; a venue's `within` scopes it to the listing.

### The notes column is written for her, not for a log

Whatever lands in `notes` is shown **verbatim on the approval card**.

- **Keep them short.** State the fact and stop.
- **No advice, no instructions.** She can see an empty field and decide herself.
- **Say WHY, not WHAT.** The app already reports empty fields; the scraper's job
  is to explain the cause.

Good: `No closing date found anywhere on the venue's pages.`
Bad: `NO_END_DATE: kept, lookback unverified`

**A note that quotes the page quotes its MATCH, never its INPUT — her finding,
20 Sep.** Almost every Capodimonte row reached her carrying the whole page in
`notes` — navigation, breadcrumbs, ticket prices — averaging **6,709 characters
per row**, one at **17,734**. `findDateRange` returned its input as `raw`, which
was indistinguishable from returning the match while the input was always a
listing card; then a second caller began handing it whole pages. Every branch now
quotes its own match, capped (`frag()`). Fixtures Q-100 to Q-102. **A length cap
alone would not have caught it** — the bug is quoting the wrong THING, and a
capped whole page is still the wrong thing.

### swept_at — the eighth column

**PER ROW, not per file or per venue.** Per file is wrong because a stitch mixes
two machines; per venue is wrong because a stitch routinely holds two runs of one
venue.

**Stamped when the venue FINISHES**, in `writeVenueCsv`, not at run start: a run
takes ten minutes across nineteen venues and `--continue` can spread one across
hours, so a run-level stamp would flatten every venue to one instant — the exact
flattening this column undoes. **UTC**, unlike run folder names, which are Sydney
because a human sorts by them.

It drives the app's freshness drawer: **last TRIED** is the latest stamp for the
venue, **last BROUGHT ROWS** the latest among its real rows. That gap is the line
that says re-run this one alone.

`stitch` and `compress` carry it without looking at it — but compress needed
its column list extended, or `readProForma` would have dropped the column
silently.

---

## 4. The app

> ### https://claude.ai/artifact/E2WjpRgr4W5eSzYtxyfrt5
>
> **Republish to THAT url** or a new page is created and hers stops updating;
> from a session that did not publish it, pass it as `url`. It carries **four
> capabilities**, each load-bearing: `downloads` (Export), `mcp` (her Parallel
> Search connector), `sample` (Claude reading what the connector found), `db`
> (the sweep log and quarantine — the two things that survive a Reset). A publish
> restating `capabilities` must restate all four; omitting it carries them
> forward, which is what every publish has done.

**Version 34, 25 Sep 2026, is live; 34.3 (Levy Gorvy Dayan, Jacquemart-André and MAM Paris added; chips renamed "Levy Gorvy", "Artic", "KHM") is built, not yet published — held for her one import (§7.6).** The file is `Cat_Watch.jsx` — renamed from
`Cat_Watch_v10.2_haiku.jsx` on 22 Sep, a fossil of a question that no longer
exists. **No version number in the name either**: the published version is
already past it and a number in a filename only drifts. Line count went stale
twice when typed here — `wc -l` answers it.

**The number lives in `APP_VERSION`, and the footer prints it — her ruling,
22 Sep.** It used to exist only here and in chat, so the page in front of her
carried no way to tell itself apart from the one before it. One copy in the
file, one place on screen, and the date beside it because the number alone
cannot answer the only question it is ever asked: is this older than the one
just built. **Bump it in the same breath as the change it describes.**

**How it counts — hers: a whole number for a substantial change, a decimal
for a small one** (v37, then v37.1).

**Building is code's job — `node build/build_app.js`**, which transpiles, wraps it
in the committed shell (`build/shell_head.html`, `build/shell_tail.html`), proves
it parses and writes `build/dist/index.html`. It reproduced version 29 byte for
byte when written, and has built 30 and 31 since. `--shell-from <saved live page>`
says whether the committed shell still matches.

**Publishing cannot be automated and the order matters.** The service refuses a
publish from a session that has not VIEWED the live version, and viewing means
reading every line of the ~3,000-line saved copy; no script can do that reading.
Worse, a second refusal follows a first — the same bytes resent are rejected as
"resent unchanged" even once the reading is done. So: **read the URL, read the
whole saved file, then build, then publish.** `build_app.js` prints those steps
when it finishes.

**Never republish while she has it open** — §1.

### The mental model, load-bearing

**Her data is NOT hosted** — the page is. *(Changing: the branch `claude/ledger-cloud` keeps the ledger in the page's store — §7.1. True of `main` until that merges.)* The app is the *tool*, the ledger is the
*document*, like a word processor and a file. Data lives in the ledger, never
baked into the tool. Opening the link gives an empty portal.

Losing or silently corrupting the ledger is the worst outcome the design guards
against; it holds every tracked exhibition plus her marks (watching / dismissed /
want-catalogue / acquired / catalogue details).

**Three containers, and which one a fact belongs in is decided by what it is:**

| | Lives in | Because |
|---|---|---|
| **The ledger** (her file) | her export, hers alone | Derivable from nothing. Rolls back with a backup, correctly |
| **The sweep log** | the page's own store | A FACT ABOUT THE WORLD — must not roll back. Safe there because any sweep file rebuilds it |
| **The quarantine** | the store AND her export | A fact about the world that is derivable from nothing — so it needs both, with one merge rule |

**Do not propose moving any of the three.** The reasoning, and the two rejected
arguments, are in `docs/app.md` §4–5.

### Ledger row shape

```
id, museumId, title, startDate, endDate, summary, exUrl, interested, watching,
acquiring, looked, hasCatalogue, catalogueTitle, isbn13, publisher,
publisherUrl, publisherResult, shopUrl, shopState, shopChange, addedAt, editedAt
```

Ledger backup is JSON; the sweep pro forma is CSV.

**JSX validation:** `tsc check.tsx --jsx preserve --noEmit --skipLibCheck
--allowJs --target esnext`, filtering for `error TS1[0-9]{3}[^0-9]`.

### What is built and signed off

All of this was confirmed by her on real files, not only by fixtures. **Design,
evidence and every finding: `docs/app.md`.**

- **Loading and saving.** Open → empty portal; Load → pick file (called Import on `main`; renamed on the cloud branch, 25 Sep). **Export IS
  Save.** Two save routes, differing in what is KNOWN — the runtime's file handoff
  resolves or throws, a plain browser download cannot tell finished from cancelled
  and so does not clear the unsaved warning. **Never put back a click-triggered
  green tick**: on 20 Sep that read "Saved — safe to close" while nothing was
  written.
- **Refreshing.** A sweep CSV goes in via Import (called Import Refresh on `main`; renamed on the cloud branch, 25 Sep); the app compares it
  against the ledger with no internet access and shows proposals as cards grouped
  by venue. Add / Fill / Change / Couldn't be filed. Bad data is always surfaced,
  never dropped.
- **Reading a stitched file.** Four bands for the odd cases, easiest first;
  duplicate rows fold on venue + URL and nothing else; rows with no URL never
  fold; marker rows become a coverage panel, never proposals.
- **The ledger will not move until every card is decided** — a hard block, not a
  warning. Rejecting counts as deciding. Do not re-propose confirm-and-continue.
  **This is the permanent design and it has not moved.** One temporary button
  sits BESIDE it for the 320-card import — §7.2. It is not confirm-and-continue,
  which stays rejected (§8): it is a separate, plainly-labelled door that asks
  first and says what it leaves behind. The gate itself is untouched, and so are
  its fixtures.
- **Counts that reconcile.** One line accounts for every row read, in two
  sentences each ending in the number the next starts from. **Every term stays** —
  drop one and the arithmetic stops closing, which is all these lines are for.
- **Quarantine ("never add this")**, keyed on normalised URL. Latest decision
  wins, which needs tombstones — a release is RECORDED, not merely absent.
- **Reject and quarantine are different jobs.** Quarantine is the app's only
  memory: never show me this again. Reject means *this entry is wrong* — fix it
  at the source so the next sweep imports it correctly. **A rejected card coming
  back is correct**: the file still disagrees with the ledger. Never propose
  remembering rejections.
- **Per-venue freshness**, two dates, from `swept_at`.
- **The confirm box is the TOP layer** (`zIndex` 1200), above the refresh review
  at 1100. It sat below it and a confirm raised from inside the review painted
  where nothing could see it, so the button looked dead. **Any new overlay goes
  BELOW that number.** Fixture 18i compares them.
- **Dark mode**, every colour named; the shell paints a ground before React runs.
- **Sorting, timestamps and dividers** — the timestamp scheme is the only way to
  tell this import from earlier ones from the seed. **Do NOT "simplify" it.**
- **Catalogue lookup** — the route is below.
- **Seed set**, ~110 exhibitions read 20 Aug 2026, met / ng / rijks / acq only.
  Thin on history at met and rijks because Chat Claude's fetch tool could not see
  the archive. **Nothing to fix; do not re-diagnose this as a matching failure.**

- **Titles — her rulings, 23 Sep.** A **changed title is a Change card** —
  a rename, and equally a difference only in capitals. **Nothing is masked on
  screen**: the scraper records titles in the venue's own letters
  (`restoreCase`, proven on her saved pages by `title_case_pages.js`).
- **A changed description is a Change card too** (`consider` in the intake) —
  anything written into the description must be stable from sweep to sweep.
- **Italian titles — built 24 Sep, her format.** The title stays the museum's
  own (the catalogue lookup searches by it); an English translation opens the
  description: `In English: "Carlo Maria Mariani. Art Beyond Time." Sixteen
  works…`. **The model returns plain strings; code writes the line**
  (`composeSummary`). Only `capo`, `brera`, `uffizi`. Translated once, reused
  by compression's memory. `compress_prompt.md`, "Italian titles".

**Deliberately not built:** bulk-approve, in-app field editing, and the mirror
case where the app proposes Add but it is really an update.

### Catalogue lookup — the route

Each step runs only if the one before left something missing.

1. **Go to the venue's shop** — its catalogues page and its search box, opened
   together in one call. Take **the book's own product page**, never a list.
2. **Open that page** for the ISBN, the publisher and any publisher link.
3. **If the ISBN is still missing, search the open web.** Gaps only.
4. **If no publisher page came back, go to the publisher** — find their site from
   their name, search inside it, then **open what that returns**.

**The rules, each of which replaced a real failure:**

- **`web_fetch` for a page whose address we have or can work out; `web_search`
  only for the three questions that really are searches** — does this book exist,
  where is its ISBN, where does this publisher live.
- **Never choose a page from a general index and build on it.** That filed the
  National Gallery shop's list of 32 books as the *Zurbarán* catalogue while the
  book's own page sat five results lower printing its ISBN.
- **Go to the publisher, do not search for them.** One search for the name alone,
  then read the domain off the results mechanically — a publisher's name is in its
  hostname. Shared words (books, press, publishing, editions, **university**) are
  dropped.
- **Open the candidate before believing it.** A search cannot tell a book from a
  shelf; the difference is inside the page. Two candidates, then the fallback.
- **Every outcome says which negative it is** (`publisherResult`, `publisherNote`)
  — "searched and found nothing" and "never fired" are different sentences.
- **A step that died is not an answer.** Each later step carries why it came back
  empty and the screen says so.
- **A museum's own imprint is skipped** — `SELF_PUBLISHERS`, keyed on the
  **publisher**, never on the venue, and **added to only by her**.
- **Everything fills a blank and can do nothing else.** A known value is never
  overwritten; a step that yields nothing leaves the row as it was.
- **A 10-digit ISBN is taken and converted**, check digit verified first.
  `toIsbn13` is the only door; `cleanIsbn` is the strict 13-digit gate downstream.
- **Only "Re-check museum shop" moves the shop status — her design, 25 Sep,
  version 34.** She presses it after seeing a change herself. With a link on
  file it re-reads that one page (gone → "No longer", link kept as "Museum shop
  (last seen)"; buyable again → "Back"); with none it runs the shop step alone
  ("Now"). No history kept. A failed check says so and changes nothing. **Search
  again fills blanks only and never moves the status.** `docs/app.md`, "A book
  leaving the shop". **Built and tested by fixtures; not yet met a real sold-out
  or pulled page.**

**The cost:** up to four searches and three readings. Searches are free; **every
reading runs on her allowance**, and the connector's keyless tier refuses after
roughly a dozen searches in quick succession. **Every step after the first is
conditional — do not make them unconditional, and do not flip to searching wide
first.**

**Shop addresses for all 18 venues are checked and written down** —
`docs/app.md` §1. `borghese`, `capo` and `dellav` have no shop.

**Which model — CLOSED, her ruling 22 Sep.** The page cannot reach any outside
address, so it does not choose a model; it asks the viewer's Claude through
`sample` at `modelTier: default`. Do not re-open without a real misread.

### Tests

`npm test` runs, and **the exit code says whether all of it passed** — not the
first number to scroll past:

| | |
|---|---|
| unit fixtures | `date.test.js`, `compress.test.js`, `qc.test.js`, `sweep_log.test.js`, `venue_status.test.js` |
| `intake_cases.js` | 62 checks — folding, quarantine, freshness, the ledger gate |
| `page_loads.js` | does the page load |
| `page_renders.js` | does it DRAW — renders into jsdom twice, plain and with the runtime answering |
| `catalogue_lookup.js` | C-001 to C-099 |
| `recheck_shop.js` | "Re-check museum shop" pressed in the real app (jsdom) — R-001 to R-023 |
| `summary_pages.js` | descriptions on saved pages (`docs/summary_pages/`), no network — the museum's own text, never a press list, credit or ticket note |
| `title_case_pages.js` | the real scraper over pages she saved (`docs/title_case_pages/`), no network — titles in the museum's own letters, Tate asking for exhibitions only |
| `listing_pages.js` | the same, for WHERE each row was seen — no page twice, no promo card read as a listing |
| `cloud_ledger.js`, `cloud_app.js` | the cloud ledger (branch): storage against a stand-in store with the platform's limits, then the screen driven by clicks — both on her real ledger, `docs/ledger_2026-09-24/` |

The harness lifts the intake out of the JSX by **anchors on prose, never line
numbers**. An early `return` in a fixture file exits the whole suite and the
summary just stops printing — **await, never return.**

---

## 5. The scraper

### Why it exists

Chat Claude's fetch tool **retrieves a page before its JavaScript runs**. Modern
museum sites are shell-plus-database designs, so it sees an empty frame where a
human sees exhibitions. Architectural, confirmed across 6–7 Sep 2026: no
prompt-crafting fixes it. **A headless browser fixes it at the root.**

**Target output:** the pro forma CSV, with the **summary column carrying the raw
curatorial dump**. Compression turns that into the teaser she reads. Keeping the
raw text is what makes fabrication structurally impossible.

### Commands

```
node scraper/sweep_prototype.js              everything for this machine
node scraper/sweep_prototype.js ng rijks     named venues only
node scraper/sweep_prototype.js --continue   finish the newest run
node scraper/sweep_prototype.js --jobs=6     venues at once (default 4)
node scraper/sweep_prototype.js --budget-mins=3   abandon a venue after N min
node scraper/stitch.js <run> <run> ...       combine runs into one importable file
node scraper/compress.js <run>               plan, and write the subagent job files
node scraper/compress.js <run> --check       verify the answers before they land
node scraper/compress.js <run> --apply       write sweep_compressed.csv
node scraper/qc.js <run|stitch>              faulty rows + exceptions; exit 1 on a fault
node scraper/sweep_log.js [--json]           rebuild the app's freshness dates
node scraper/venue_status.js                 what each venue currently yields
npm test                                     all fixtures
```

### The files

| File | What it is |
|---|---|
| `sweep_prototype.js` | The real scraper. Playwright + headless Chromium |
| `compress.js` / `compress_cli.js` | Raw dump → the summary she reads |
| `qc.js` | Exceptions report **and the gate in front of her import file**. A faulty row (no title, no venue code) BLOCKS `--apply`; an exception (count dropped, venue gone to markers, descriptions lost, a row listed on an archive year before it opened) warns and never acts |
| `sweep_log.js` | Rebuilds the app's freshness drawer from the sweep files on disk |
| `venue_status.js` | Prints §2's table |
| `show_tags.js` | Prints every row's venue tag |
| `probe_pagination.js` | Asks whether a given page holds anything. Read-only |
| `inspect_listing.js` | Asks a listing page what link shapes it contains |
| `probe_access.js` | Loads a listing twice, headless announced and not |
| `probe_headed.js` | Whether a browser with a HISTORY gets in. Paces itself, stops at the first check that will not clear, and saves each page it reads so a recipe can be written offline |
| `probe_morgan.js` | The Morgan's four combinations, all blank-profile. **Superseded 22 Sep — keep as the record, do not re-run** |
| `data_probe.js` | The only probe that asks the real question: opens exhibition pages and extracts title, dates, text |
| `reach_probe.js` | Reachability only — says nothing about usable rows |
| `sweep_fetch.js` | Older diagnostic copy, no browser. Not developed |

**`stitch.js` chooses NOTHING** — her design. It does not pick which copy of a
venue wins, drop marker rows or notice duplicates. Order cannot change its
result. A venue swept on both machines arriving twice is the POINT: the app folds
the copies where she can see it.

### A run is a directory, not a file

```
scraper/output/run_2026-09-10_183045/
    ng.csv  rijks.csv  acq.csv     one file per venue
    sweep.csv                      all of them
    log_<stamp>.txt                one per invocation
```

- **A venue file is written only once that venue finishes**, so a file existing
  means that venue completed and a dead run leaves no half venue behind.
- **Re-running a venue overwrites its own file**, so one exhibition can never
  appear twice in a sweep — the one case the app does not absorb.
- **`--continue` needs no stored state**: what still needs doing is which venues
  have no file yet. Nothing to go stale.
- **`sweep.csv` is rebuilt from the venue files at the end of every run**, so a
  sweep taking three invocations still produces one file.
- Timestamps are **Sydney time**, fixed to that zone.
- **Old runs are archived at start-up, never deleted.** Three things are never
  moved: the newest 10, anything holding a compressed CSV (that is compression's
  memory), and any run with 16+ venue files.
- **Runs are committed, not gitignored.** The container is temporary.

### Who sweeps what — in code, not a habit

`machineVenues()` decides; the machine is worked out from the proxy (present in
the container, absent on her laptop); `--home` / `--container` force it; the run
announces which it thinks it is before fetching. **Container: 21** (its 19 working
venues plus `brit` and `morgan`). **Her laptop: 3** — `met`, `artic`, `moma`
(`route: 'local'`).

`moma` moved on 22 Sep: the container is refused and only a visible browser with
a history gets in. `brit` and `morgan` stay on the container until their recipes
are written from the live pages — moving them sooner would only mean her machine
collecting the refusals instead. Fixtures R-001 to R-005.

**`headed: true` marks a venue needing that browser.** The engine cannot launch
one yet, so the run SAYS SO per venue rather than letting the flag sit there
looking like working wiring.

**The two machines never sweep the same venue.** Sweeping from both doubles what
a venue sees, and both of these rate-limit — which is how a working venue becomes
a blocked one. Naming venues by hand still overrides it, and says so in the log.

### Then hand her the file — she must never have to ask

**Before sending, read the run summary's TITLES list** — every title the
page check (`titleFromPage`) changed, and every name it could not complete.

Send `sweep_compressed.csv` with the file-sending tool as soon as compression
finishes, saying how many rows and how many summaries were reused versus written.
**One file, and only one** — not `sweep.csv`, which holds raw dumps. **If
compression has not been run, the run is not finished.**

### The network bridge — don't remove it

In this container all outbound traffic goes through an agent proxy and **Chromium
cannot use it**. The fix, proven and in the code (`installNetworkBridge`):
Chromium does no network I/O at all; every request is intercepted and answered by
Node, which reaches the internet through the proxy fine. **A raw egress path
around the proxy exists. Do not use it and do not build on it.**

### How it is organised

**One engine, one recipe per venue.** Universal logic in the engine — fetching,
counters, the URL guard, the lookback, structured-data-first, date parsing,
writing the CSV. Per venue in `VENUES` — which pages, which links are exhibitions,
where the title and dates sit, what boilerplate to strip.

There is no clever general rule for the second list, and **every attempt at one
has cost us**: a rule learned at Borghese was wrong at Rijksmuseum a day later. A
venue writes down only what differs.

**Two recipe options carry a trap:** `notATitle` must be checked in the heading
branch too (the heading was trusted first and returned before any check ran), and
**`yearArchive` never writes the years down** — `expandYearArchive()` derives them
at run time, or a sweep run in 2028 completes, reports no error, and is quietly
missing two years.

**Everything else about the scraper — how a listing page is read, pagination and
load-more, the date parser and its twenty formats, keeping junk out of summaries,
failure handling, compression, the blocked venues — is in `docs/scraper.md`.**
Read the relevant section before changing that area.

---

## 6. Do not re-break these

Each line cost a real failure. They group into a handful of mistakes this project
keeps making in new clothes.

### A check that cannot fail reads exactly like a check that passes

- Fixtures below a `process.exit`, or needing a `harness.js` that did not exist,
  or not named by `npm test` — **four silent suites so far.**
- Reading `npm test`'s first half for a pass count while the second half crashed.
  **Check the exit code.**
- A triage band that never held a row, shipped and documented as one of six. She
  found it by importing the sample file and looking.
- `tsc --noEmit` answers "does this parse"; the unit suite tests functions LIFTED
  OUT of the file; grepping the built page found the broken line because it was
  one of the expected strings. **Three greens, none of which could catch a blank
  page.**
- A fixture proving its rule through a SIDE EFFECT (W-004 read the parser's `raw`
  field) so it broke on an unrelated change. **Ask the rule directly.**
- **Grep the output for the new test's own name; a total cannot tell you a case
  ran.**

### A negative has to be earned, and has to say which negative it is

- "No separate publisher page." printed whether the step searched and found
  nothing or never fired at all.
- "ISBN not confirmed" printed when the connector had refused mid-lookup.
- "never" printed for an empty sweep log, from the absence of a note, while she
  was looking at quarantined rows that could only have come from a sweep. **Say
  what is unknown.**
- A page that came back EMPTY reported as a page with nothing on it — Hannibal
  draws its books by script, so the reader gets 110 characters of furniture.
- **A missing button cannot report anything** — the Publisher button is drawn only
  when a link was found, so its absence read identically to a step that never ran.
  Third time this app learned it.
- **A control that renders only when it has something to show.** Emptying the
  sweep log removed the "By venue" button, so its "nothing here" line became
  unreachable at the only moment it was true.
- A status line saying "Saved — safe to close" because a button was CLICKED, while
  the sandbox had refused the download.
- A log line describing something that did not happen — filtering `rows` after
  `applyLookback` had already copied it into `toFetch`. The log announced ten
  exclusions while all ten sat in the CSV. **Count from the array AFTER the
  change, never from the list of marks.**
- **Name a test by what the code does, never by what it was meant to achieve.**
  "We stayed silent and let the site decide" was recorded while Chromium went on
  announcing `HeadlessChrome`.

### Measuring the cheap thing instead of the thing that matters

- **A probe answers the one request it made.** Reading one listing page, calling
  the venue open, changing the real scraper on that basis, and then inventing
  causes when the real sweep failed. Two hours and a day's allowance.
- A single-click test of the Louvre's load-more, which reported success
  immediately before the live sweep lost 8 rows. **The failure needs the press
  AFTER the last real one.** A control tested once is tested in its easy case.
- **A FIXED PAUSE answering two questions at once** — has the batch arrived, and
  is there any more. Four Louvre exhibitions lost, and a row count that varied
  with how busy the machine was.
- Concluding a control is broken without checking the click reached it; the
  Louvre's cookie popin swallowed it for two days.
- Reporting a card total with nothing to check it against. Rows vanish for three
  innocent reasons, so a total alone cannot tell a fold from a loss.
- Reading a listing page **without scrolling it**, then writing the result down as
  a fact about the venue. And measuring the scrolled height BEFORE the wait.
- **A count flattens the evidence too.** A run scored 0 badges, 0 blanks, exactly
  the predicted 77 — while two titles had quietly lost half their names.
- **When the artefact cannot contain the evidence, stop reading the artefact.**
  Three title fixes guessed from a CSV that stores titles squashed to one line,
  when the defect was made of line breaks.
- **Run the thing itself before concluding the thing is wrong.** One hand-written
  query, run in a session rather than through the app, was read as "the lookup is
  broken" and her design was rewritten around it.
- Reading a search EXCERPT and treating it as the page. **Declaring only half a
  connector's tools is the same gap** — `web_fetch` had been there all along.
- **A thin answer from a page is not proof the page is thin.**

### Judgement made silently where she should have seen it

- **Title-based de-duplication — deleted 29 NG exhibitions.**
- Dropping links with unreadable titles.
- Putting a DATA FAULT on her approval pile — a row with no title can only ever
  mean "re-run the sweep", which is a message to the session.
- Letting the ledger update run with cards undecided, skipping them silently.
- Deciding which triage band a card belongs in by searching its notes for words
  the sweeper also writes. **A fact the code already knows is never re-derived
  from prose written for a human.**
- **Deleting working-but-dormant code because it carried something the session
  WAS asked to change.** Unreachable is not unwanted, and "it was already dead" is
  a description, not a permission.
- Deleting a whole line when asked to delete one sentence in it. And claiming to
  restore a deleted sentence while moving its words somewhere else.
- **Telling her to rebuild a lost thing by choosing between files herself.** A
  recovery step with one correct answer is code.
- Inventing a constraint she never stated and leaning on it twice. **A convenient
  hypothesis is worse than no argument.**
- Giving a reason that had never been checked ("the catalogues page only lists
  what is in stock" — false, sold-out books stay listed).
- **Arguing an architecture question from what had been BUILT rather than what the
  platform offers.** "The shell has nowhere to keep anything" was false.

### A rule that held only while its input stayed small

- Returning a parser's INPUT as the text it matched — 17,734 characters of
  navigation on one approval card once a second caller fed it whole pages.
- The bare month-and-year rule applied to whole page text — a photo caption became
  an opening date.
- Reading an all-numeric range from whole page text.
- `datesNearLink` walking a fixed two steps. **A step count is not a boundary.**
- A cookie-banner filter that walked up to `<body>`, excluding every paragraph on
  every page. **The ancestor walk must stop before `<body>`.**
- A noise-class match believed on a container holding most of the page — the
  Wallace's `section--footer-spacer` LAYOUT class made an image-licence notice all
  11 summaries. And the V&A's cookie panel, holding 24 of 27 paragraphs, passing
  itself off as the layout.
- **A branch nothing has entered is untested however long it has shipped.**
  `—` written among the words of a page instead of inside quotes sat unseen
  for weeks.

### Two copies of one fact, which drift silently

- Two copies of the month pattern, full names only, so `12 SEP 2025` parsed to
  nothing.
- The plausible-year guard missing from a branch — twice, the second time from the
  busiest path in the parser.
- `VENUE_ORDER` as a second hand-typed list of venue codes, so two finished
  recipes could not be selected and nothing said why.
- Six near-identical venue scraper functions — now the engine/recipe split.
- `parseDateRange`, a second anchored parser nothing called. **Dead code shaped
  like live code is a trap for whoever debugs dates next.**
- `findDateRange` and `findDateRangeInProse` drifting twice, each time losing
  dates silently.
- Anchoring a test harness on a LINE OF CODE (`const TIERS = {`) rather than on
  prose. Dark mode made TIERS theme-dependent and every intake fixture died.
- **Fixing a fault per venue and leaving the SUMMARY LINE above it reading the old
  way.** `lastRun` went on being stamped at Apply for a day after `swept_at` had
  replaced exactly that, one line down the same screen.
- **A ruling about where a fact belongs applies to every fact of that kind in
  front of you.** The sweep log moved out of the ledger and quarantine was left in,
  in the same session.

### Joins that were never run, though both halves were tested

- Stitch writing a loose CSV where compress reads DIRECTORIES — 652 rows in, 172
  out, no error.
- Matching her seed summaries by TITLE when the seed carries a URL slug — 56
  matches where there were 103.
- Consulting her seed BEHIND the previous compressed run, then fixing it by making
  her wording win on EVERY run, **which is a revert machine.** The repair had to be
  a flag, not a rule.
- Archiving old run folders without checking which ones compression needs.
- Two groupings both claiming a pending row, so the second silently dropped the
  first and that row never received an answer.
- Inserting a check into the middle of an existing block, splitting it: every
  venue without a load-more control died before reading a page, while the unit
  suite passed 148/148. **It has no browser, so the listing loop never runs in it.**
- **Rebuilding the import file to one sweep per venue and letting the DATES follow
  the rows.** Right about the rows, wrong about the dates.
- **A rebuild choosing between two copies by a key both copies share.** The
  21 Sep one-sweep-per-venue rebuild took the FIRST Louvre copy — the
  rate-limited sweep's empty one — and dropped two descriptions.
- **Leaving the reasoning for a hand-rebuilt data file in a comment inside the
  one-off script.** Three sessions later the guide still described it wrongly and
  SHE had to type the history out again — `docs/import-file.md` now holds it.

### Substituting a tool and letting the route change with it

- The old search tool could be locked to one website; the connector cannot, so
  "ask the shop and nothing else" quietly became a general web search with the
  shop's address in the query. It stayed that way for days and the screen went on
  labelling it "shop". **A capability lost in a substitution is the thing to
  report, not to absorb.**
- Rewriting a prompt and the row it fills in one go, dropping the publisher field
  from both, so the button was unreachable for a day.
- **A gate that could only ever open.** The book's page was read "only when the
  ISBN is missing", and a shop's list never prints an ISBN. She asked what it was
  for and there was no answer.
- **Sending stage one to the right place and letting it END there.** A better
  source is not a complete one.
- Filing whatever a search returned as "the publisher's page" without opening it.
  **Rizzoli was not the step working, it was the step being lucky.**
- **Tuning query strings to surface a page we could simply have gone to.** Four
  attempts, on the same day the session was spent proving searching-and-hoping is
  the wrong shape.
- Deciding a catalogue is self-published by matching the PUBLISHER'S name against
  the VENUE'S.
- **A status that could only ever be set, never changed.** "In the museum shop"
  was written once and never compared to the last lookup — in an app whose entire
  subject is catalogues selling out.
- Never writing down 17 of 18 shops' search addresses, and leaving the one that
  existed pointing at a dead page.

### Scraper mechanics that each cost rows

- `networkidle` waits — 30s timeouts on pages that had loaded in 3.
- Unwrapped `route.fulfill`/`abort` — zero rows for all six venues.
- Borghese's `/mostre/` selector — collected the navigation menu.
- A hardcoded Chromium path. `resolveChromium()` needs **both** halves.
- A single fixed `sweep_raw.csv`, letting a one-venue diagnostic silently replace
  a full sweep while the file still looked complete.
- Building date strings by hand with `padStart`, nothing checking the day exists.
- `parseMonthDay` matching the month as `[A-Za-z]+`, so `Sept. 21, 2024` produced
  nothing silently.
- `normalizeUrl` lowercasing the whole address.
- Joining hrefs onto the venue base by hand.
- Taking `events[0]` from structured data without checking it was this exhibition.
- A range with the year on the closing side giving the opening date that same year.
- Only the en and em dash normalised.
- Treating a 404 as a page that loaded.
- **Treating a torn-down browser as a page failure** — a venue written to disk as
  COMPLETE with 10 of 16 summaries missing.
- Giving up on a detail page after one transient failure.
- Keeping the FIRST link to an address and ignoring the rest.
- A listing that loads and yields nothing leaving no trace in the CSV.
- `TITLE_NOISE` stripping EXHIBITION case-insensitively — "How to Make an
  Exhibition" became "How to Make an ".
- Acquavella's title rule stripping `NEW YORK` / `PALM BEACH`, making its two runs
  of one show read as the same exhibition. **Now (24 Sep):** the gallery is
  added only to a show run in both galleries within six months — same name
  alone is not the same show (Barceló 2022 and 2025).
- **Reading only page one of a paginated archive** — 12 Menil exhibitions lost.
- Walking a paginated archive past the lookback floor "to be safe" — eleven pages
  and 13 undated decades-old rows on her pile.
- A load-more click following the anchor's href once the list is complete.
- Assuming a site numbers pages from 0, or from 1. **Only its own next link says.**
- A next-page check treating a recipe's OWN filter as a page — 32 false alarms.
  **A false alarm teaches her to scroll past the real one.**
- An extraction ladder expecting a paragraph at every rung, with no way for a venue
  to name a blurb living in a div.
- A weekday name in front of a date, which defeats every range pattern.
- Discarding an implausible published opening year and deriving one from the
  closing year — an artist's lifespan stored as an exhibition run.
- Italian months abbreviated to three letters (`set`) where the map held `sett`.
- Checking output for junk with an ENGLISH-only word list, then reporting an
  Italian venue as clean.
- **Shipping a page that does not load.** A blanket colour rename ran AFTER the
  palette was written and rewrote its own literals. Valid syntax, throws on first
  render, black screen. **A blanket find-and-replace over a file you have just
  added definitions to will eat those definitions.**

### Handing her work nobody read

- **Counting the cards a file would produce and calling the file checked.** A
  right count can hide wrong cards. **Run the file through the app's own intake
  and READ the cards before sending it.**
- **Asserting what a set of changes is instead of looking** — "longer, fuller
  titles" — while several were shorter or lower-case.

- **A title rule proven at two museums, shipped to all.** Testing on venues it
  did not come from found MoMA's site name confirming its preview dates as a
  title. Test a general rule where it was NOT derived.

### Subagents

- **Sending a model everything when the question applies to a few.** Send only
  the rows the question can apply to; every token is her allowance.

- Handing one pretty-printed JSON with fields it never reads, plus a second file
  for examples — 178k tokens where 100k did the same work.
- **Telling a subagent what not to do and believing it.** Five jobs, four
  disobeyed. **Remove the tool or check the answer. Wording is not a control.**

---

## 7. Open work

In her order, 24 Sep. Everything not listed here is finished. Do not reopen a
closed item without a new fact.

### 1. The ledger in the page's store — BUILT on branch `claude/ledger-cloud`, in trial

Reopened by her 24 Sep (was §8); built 25 Sep. **Branch only — `main` and her
published app do not have it.** Version series of its own, her ruling:
"33.1 · cloud 1". Test page, own store, never her app:
**https://claude.ai/artifact/CbUv5Fcwt1R3kug7azGNmf** (`db` + `downloads`
only, so no catalogue lookup there). The code's detail is under "THE CLOUD
LEDGER" in `Cat_Watch.jsx`.

**What is where — the store holds two kinds of thing:**
- **The live ledger** — the ONLY thing the app reads and writes as she works.
  Saved about a second after every change, no button, compressed (her 352
  rows: 217 KiB → 46 KiB, one piece; a bigger ledger splits, same code).
- **Snapshots** — whole copies, each under its own name, never written again
  and never pruned (her choice: keep all, judge later). Read only when she
  opens the drawer, downloads one or rolls back. **Kept in the same store as
  the live ledger, her yes 25 Sep** — protected by the code never writing to
  one and by its fingerprint, not by the platform (the file store would
  have been write-once; declined).
- **Her Exports** stay as they are: the copy outside Claude.

**Snapshots — by her button, plus exactly two automatic SAFETY copies** (both
her yes, 25 Sep): before a **rollback**, and before **Load** or **Reset**
replaces a live ledger that differs from what is coming in ("differs": any
exhibition or quarantine entry not identical; row order and file stamps
ignored). The safety copy is of the live ledger being replaced, never of the
file. If it cannot be kept, nothing is replaced. **Import (a sweep CSV) never
triggers one** — it proposes cards and replaces nothing.

**On screen:** a permanent ☁ line under the buttons (when it last saved, how
many); a warning banner when it is NOT saving — her ask, never silent. The
Snapshots drawer sits in the footer beside Quarantine: label, Take snapshot,
the list, Download (an ordinary ledger file Load can read), Roll back (asks
first). **Buttons renamed 25 Sep, her ruling:** Import → **Load** (a ledger
file), Import Refresh → **Import** (a sweep CSV). Quarantine's button says
only "Quarantine", always drawn; the count is inside the tray.

**Trial switch `CLOUD_OPENS=false`.** The app still opens empty; she Loads her
file, and every Load is compared with the live ledger — "matches exactly" or
how it differs. That sentence is the trial's check. "Open it" on the ☁ line
opens the live ledger by hand. True only when she ends the trial — her ruling:
a long one, checked at several points and in several scenarios, Exports as
usual throughout.

**Safety, proven (`cloud_ledger.js`, `cloud_app.js`, her real ledger):** a
save writes new pieces and switches one record last, so a save cut off at any
point leaves the last complete ledger; a damaged or missing piece is refused;
an empty page never saves. **On the real store, 25 Sep:** a 180 KB piece
stored and read back identical; 270 KB refused at the 256 KiB limit.

**Decided against, 25 Sep:**
- **A snapshot on closing the page** — a browser gives a closing page no
  reliable time to save and a crash gives none. Not buildable as asked.
- **A backup copy in the browser's own storage** — her no: a fourth way of
  saving is too messy. **Cloud saving has to be proven reliable; that is the
  point of the trial.** Her own protection is snapshots and Exports.

**Next:**
1. **Her test session on the test page**, then this session reads the store
   and checks it against her file.
2. **Streamlining the saves — after her tests, not before (her ruling).** On
   leaving she will always snapshot AND Export; today that is two buttons.
   She will decide the routine from use.
3. Merge to `main` and publish to her app to start the real trial — hers
   to call; §4's publishing rules apply.
4. Google Drive backup by button — back on the table, never automatic.

**Parked, not gating:** two tabs open at once.

### 2. The 320 decisions — hers, in progress

**The file is `stitch_20260924_0417/sweep_compressed.csv`** — her 21 Sep file
(`stitch_20260913_0442`, commit `f1bfb41`) with 24 Sep's repairs, all made by
code from the museums' own pages. How it was built:
**`docs/import-file.md`**. It is also compression's newest memory.

**Debugging finished 24 Sep; the file was sent to her as the one cumulative
copy.** Any later repair lands in the same file, and she is told. Short titles
in the file are left for the next sweep, her ruling — reject those cards
meanwhile. Save round-trips work — her confirmation, 24 Sep.

**The catalogue lookup works on real use** — she has bought two catalogues
since the import. Not perfect; she is noting issues as she goes, for a later
debugging session (item 7).

**Still open, waiting on venues:**
1. **Borghese: 7 titles still in capitals** — site down 24 Sep; its 3 listing
   pages, read once, when it is back.
2. **Title check not yet run** at `capo`, `borghese`, `met`, `artic`.

**It is done in sittings, and version 32 has the door for that — TEMPORARY, to
be unwired when this import is finished.** A second button beside the gate
applies only the cards she has decided. Her ask, 22 Sep, and her framing: the
gate is right and stays; 320 cards is simply more than one sitting.

- **The way back is re-importing the same sweep file.** What she accepted is in
  the ledger, so it no longer proposes; what she never reached comes back.
- **Rejections do not survive the round trip** — only "never add this" does.
  She knows and accepted it. Not a defect to go and fix.
- **To remove it:** the one marked block in `Cat_Watch.jsx`, the `partial`
  parameter on `applyRefresh`, `offerPartialApply` and its harness export, and
  fixture 18h. Nothing else knows about it.

### 3. A dead shop link — BUILT 25 Sep, version 34, waiting on a real case

"Re-check museum shop" (§4, catalogue lookup rules). Fixture-tested end to end.
**Proven live by her, 25 Sep: "still for sale"** (artic, *Lee Miller*). **Not
yet met a real sold-out, pulled or redirected shop page.** When she meets
one and presses the button, check the result. *(Still rejected: pointing the
link at an ISBN search — museum shops search by title.)*

### 4. Tate Britain's past exhibitions — BUILT 25 Sep

Swept live once (`run_2026-09-25_130534`, 23 rows, 14 of them past). **Kept
for one import, her plan 25 Sep:** once Levy Gorvy Dayan and the French venues
(item 6) are built, she imports those new venues and this run together.

### 5. The three blocked venues — a route exists, and it needs pacing

**Access is answered (§2). Whether it survives a sweep is not.** In order, and
each step really does block the next:

1. **Three addresses, well spaced, one run** — `brit` and `morgan`. Two
   questions at once: does a REAL exhibition page open (brit has only ever
   given listings, morgan a listing and a section page), and **was it speed or
   something about the browsing session?** All clean means speed. First clean
   and the rest blocked means the session, which is a different fix.
2. **A gap between pages in the engine, then headed support.** Nothing can be
   tested before this: a MoMA sweep fires 24 exhibition pages back to back and
   is refused before it finishes, which is exactly what happened on 22 Sep.
   `headed: true` currently does nothing but announce that it cannot be
   honoured. **Shared code, 18 working venues — hers to approve.**
3. **A real sweep of `moma` and `morgan`.** Their recipes are written and
   fixtured, but **every selector in both is untestable without a browser** —
   the fixtures cover what a recipe SAYS, not what it finds. This is the loop
   that once passed 148/148 while every venue died.
4. **`brit`'s recipe**, the last one. It hunts for `/exhibitions-events/` while
   its exhibitions live at `/exhibitions/`, and its listing takes a DATE RANGE
   in the address — one request returns the whole upcoming set, no pagination.
5. **`brit` and `morgan` move to her machine**, joining `met`, `artic`, `moma`.

**Page layout comes from HER, never from a probe — her ruling, 22 Sep.** She
saves the pages from her own browser; `docs/moma_pages/` and
`docs/morgan_pages/` hold them and what each settled. The probe answers access
and nothing else.

**`artic` from her machine is unchanged and untested against any of this.**

### 6. More venues

Her notes, 24–25 Sep.

**Levy Gorvy Dayan — BUILT 25 Sep** (`lgd`, chip "Levy Gorvy", always after
Acquavella). Swept live once: `run_2026-09-25_132334`, 28 rows, all with text;
kept for her one import with Tate Britain's past (item 4) and the French
venues. App 34.2 carries the venue — **not yet published**.

**Jacquemart-André — BUILT 25 Sep** (`jacquemart`, chip "Jacquemart-André",
after the Louvre). Swept live once: `run_2026-09-25_133825`, 5 rows, all with
text. Operas and a costume ball share its current page and are refused on the
museum's own card tag (`keepOnlyType`, new engine option). Its past listing
misspells "Feburary"; the shared month map now reads it.

**MAM Paris — BUILT 25 Sep** (`mam`). Swept live once: `run_2026-09-25_140234`,
20 rows, all with text; archive paginated Drupal-style (`paginate.prefix`),
`?archive=1` dropped from addresses (`dropQuery`). **Its shop refused the
container (Cloudflare)** — front door only in the app until she sends a search
address. **Hers to rule:** *Cultural Olympiad: Permanent collection* is a
collection display (an "Art and Sport tour", free with the collection).

**d'Orsay — BLOCKED 25 Sep:** Cloudflare 403 on the first page, not retried.
She is saving its pages; it joins the headed-browser route (item 5).

**Before her import, re-sweep `tate-britain`, `lgd` and `mam` once**: their
committed runs predate the description fixes and MAM's title fix.

**Her chip names for the rest, 25 Sep:** Orsay → **"d'Orsay"**; the others
"MAM Paris", "MAD Paris". **Her order for the French venues:** Louvre, d'Orsay,
MAM Paris, MAD Paris, Jacquemart-André.

**Descriptions checked 25 Sep** for Tate Britain, Levy and Jacquemart-André:
junk found and removed at the source (Tate members' banner and joint-ticket
note; Levy's press list and a photo credit) — `summary_pages.js`, SP-001 to
SP-007. **The 4-paragraph / 2,000-character description cut
(`getCuratorialText`, every venue) — STAYS, her ruling 25 Sep:** a
venue-wide change is not proportionate to a museum showing 1–2 shows a year. 57 of 419 rows
in her import file hit it. Compressing Baroque Splendors from the cut text and
from her full saved page (3,360 chars) gave the same teaser in substance; a
teaser is ~6 words, so the cut costs nothing she reads. Changing it would send
every cut row back for a model review on the next sweep.

**French venues** — the Louvre is the only one today. To add:

- **Musée d'Orsay**
- **Musée d'Art Moderne de Paris** (MAM Paris) — modern art
- **Musée des Arts Décoratifs** (MAD Paris) — decorative arts
- **Musée Jacquemart-André** — past exhibitions at
  `https://www.musee-jacquemart-andre.com/en/past-exhibitions`

### 7. Catalogue lookup generally

The debugging session for the issues she is noting (item 2). Standing gaps:
fourteen venues have had no lookup run against them, their shop addresses
checked but unseen live; `khm`'s shop queues every request and `uffizi` has no
catalogues page, so both behave as if they had no shop.

### 8. The cheapest archive route per venue — very low priority, may never happen

Full paginated archive or year pages: whichever reaches 1 July 2024 in the
fewest loads with certainty. Venue by venue; the recipes work.

### 9. A fresh sweep — mid-October at the earliest

The import file was swept 13 Sep. **She sweeps no more than once a month.**

### 10. Smaller, parked

- **Sweeper brief v3** — the Chat-Claude-era instruction document still needs its
  URL corrections. Expect it to end up as the fallback procedure for blocked
  venues rather than the main sweep.
- **Art Institute films by room — reopen only if the bin fills again.** Both
  films in her saved pages sat in Gallery 186 or 188 (`docs/artic_pages/`
  README). Idea: record each show's room at the next sweep, report the shows in
  those rooms, exclude only if the list is all films. Unproven on two pages.
- **A QA pass before the stitch** — parked with everything else from 16 Sep. It
  may be a good idea; it came out of a session whose reasoning she does not trust.
  `qc.js`'s exceptions report is NOT that pass and does not re-open it.

**She keeps a real ledger since 24 Sep** — the 320-card import, with that day's
fixes. Changes that touch her ledger now need the same care as any user data.

---

## 8. Rejected — do not re-propose

**Announcing "this row used to have a catalogue"** when a later lookup finds none
anywhere (raised 22 Sep, rejected on the spot, then raised again by the next
session as though it were open).

The sweep log inside her export. Ledger on Claude cloud storage (reopened by her 24 Sep — §7.1). Google Drive
auto-load on open. Automatic saving to Drive (backup by button is back on the
table — §7.1). The app gathering its
own exhibition data. Auto-save on every change. A confirm-tap after download.
Bulk-approve during refresh. In-app field editing. The separate readout doc. Excel
as the sweep format. Merging the two Tates. Stripping the 110 seed. Watching the
sweeper and interrupting it. Firing a new JSX mid-discussion. Splitting catalogue
lookup from drawer output. A "GPT scrapes, Claude compresses" role split. A map of
publisher websites. Ticking nothing on a date conflict. A background shop check on
every click. Linking straight to an Amazon product page from an ISBN-10.
Confirm-and-continue past undecided cards. A backup of the ledger in the browser's own storage (25 Sep — a fourth way of saving; §7.1).

Blocking scripts and trackers in the network bridge (IR-13). Splitting the scraper
into modules (IR-14). **Fetching several pages at once within one venue (IR-15) —
never, at any scale.** Dropping an undated row because its start date is old
(IR-18).

**Proposing "drop the feature" as a fix — rejected as an approach entirely.**

Corrected along the way: Chat can **not** fetch any URL cold. The Italian venues
are four different situations, not one problem. "18 venues fetchable" was wrong.
The AbeBooks link is `/servlet/SearchResults?kn=…&sts=t`.

---

## 9. Where the rest lives

| File | What is in it | Read it when |
|---|---|---|
| `docs/app.md` | The app's forensics: the catalogue lookup and its four rebuilds, shop addresses, saving, the intake bands, quarantine, the sweep log, the seed | Changing anything in the app |
| `docs/scraper.md` | The scraper's forensics: reading a listing, pagination, the date parser, junk in summaries, failure handling, compression, the blocked venues | Changing anything in the scraper |
| `docs/import-file.md` | How the file she imports was built, and why it is not a straight stitch | Touching that file, or explaining its dates |
| `docs/venues.md` | Per-venue forensics: the scoreboard, exactly what each refusal is, listing URLs | Working one specific venue |
| `docs/venue_urls.md` | All 21 venues' addresses from the Sweeper Brief, plus per-venue traps | Wiring or re-checking a venue's pages |
| `docs/listing_pages/` | Frick, Wallace, Brera listing pages she saved — where each listing sits | Changing a `within` there |
| `docs/moma_pages/`, `docs/morgan_pages/` | Pages she saved from her own browser, with a README of what each settled — link shapes, blurb containers, the traps | Changing either recipe, before asking her for anything |
| `docs/compression.md` | The compression design, the model split, the eval, the rejected alternatives | Changing compression — otherwise don't |
| `docs/review-2026-09-12.md` | Her venue-by-venue review: what she found, what changed, what each returns now | Before touching a reviewed venue |
| `docs/review-log.md` | Independent review findings and what was decided | A reviewer raises something |
| `docs/store_backup_2026-09-21/` | A read-out of the page's store, as insurance | Never, unless the store is lost AND `sweep_log.js` cannot rebuild it |
| `scraper/compress_prompt.md` | The compression prompts and three rounds of tuning | Changing summary wording |
| `docs/Cat_Watch_Sweeper_Brief_v2.docx` | The original Chat-Claude brief | Rarely; most does not apply |

Git holds the full text of everything compressed out of this guide —
`git log -- CLAUDE.md`.
