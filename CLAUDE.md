# Cat Watch — project guide for Claude Code

**Repo:** `angelawen-boop/Cat-Search-Project`
**Last updated:** 13 Sep 2026

Cassili collects art-exhibition catalogues. They go out of print fast once a show
closes, then resale prices climb. **Cat Watch** tracks temporary exhibitions at 21
museums and galleries and shows how close each catalogue is to its likely
out-of-print window, so she can buy before it is too late.

Two components, and they are **coupled**:

1. **The app** — `Cat_Watch_v10.2_haiku.jsx`, a React artifact she runs inside Claude.
2. **The scraper** — `scraper/`, which produces the CSV the app eats.

They agree on the pro forma CSV columns (§3). If the scraper changes what it
writes, the app has to agree in the same breath. That coupling — not tidiness —
is why they live in one repo, on one branch.

---

## 1. How to work on this project

### House rules

- **Plain English, ELI5 for a non-technical reader — but never use that as cover
  for explaining less.** She does not read code and does not want to. Explain the
  logic, the trade-off, the limitation, the risk — all of it — in easier words.
  Simplify the *language*, never the *substance*. Leaving out a real problem
  because it was hard to phrase simply is a failure, not a kindness.
- **Be concise.** She is optimising for decisions-per-minute. Short bullets over
  paragraphs.
- **Cut the length of every reply by roughly 60%** against what comes naturally.
  This is on top of "be concise", not a restatement of it.
- **Suppress most visible thinking.** It burns her usage allowance and is written
  in a register she cannot read. Think as hard as needed; show almost none of it.
- **Never propose dropping a feature or accepting reduced functionality as the
  fix.** When something breaks, make it work.
- **No undiscussed changes, no silent workarounds, no shortcut fixes.** Fix the
  real problem and say what you did.
- **She will not manually enter exhibition data.** A fixed constraint.
- **Destructive actions need a confirmed backup or an explicit yes.**
- **Long runs need progress.** A backgrounded command that shows nothing reads as
  a dead session.
- ISBN-13 is always displayed `xxx-xxxxxxxxxx` (3 digits, hyphen, 10 digits).

### Put it in code — her rule, 10 Sep 2026

**Hard code beats a Claude Code session, and a Claude Code session beats Chat
Claude.** Push every job as far up that order as it will go. The test:

> **Does the task have exactly one correct answer, derivable from the inputs?**

- **One correct answer → code.** Merging files, choosing which venues still need
  running, validating a date, resolving a link. These must never be prose rules a
  session re-derives, because that is precisely how a CSV gets mangled — and the
  damage is invisible until it reaches her.
- **Many acceptable answers, or judgement about the outside world → a model.**
  Compressing curatorial prose into a six-word teaser.
- **Even then, a model touches strings, never files.** A script owns the CSV and
  asks for a value; the model never sees a comma or a column.

Chat Claude has no project context and cannot read this guide. It is the last
resort, not the plan.

### Editing this guide

This file is loaded in full at the start of every session, so every line costs
something on every session. It was 2,761 lines on 12 Sep 2026 and was cut to this.
Keep it that way:

- **Put the trigger next to the code, not in an index here.** A comment above the
  date parser saying "before changing this, read `docs/venues.md`" fires because
  the session is already looking at that line. An index entry only fires if a
  session reads the index and follows it — that is where cross-referencing slop
  comes from.
- **Never duplicate a code comment into this guide.** One copy will drift, and the
  drift is silent. The scraper's recipes are already well commented; trust them.
- **Record the conclusion, not the journey.** When a finding is overturned,
  replace the old passage with a line saying what is true now and what was wrong.
  Git holds the full text; that is the archive.
- **Never use `@path` imports here.** Claude Code loads those eagerly, so they
  move text without saving anything.
- **Anything derivable from the repo should be printed by a script, not typed
  here.** The status table below is the standing example of the failure: it said
  "artic never run" while four artic runs sat committed, and that line cost a
  session.

### Branching

**`main` is the trunk and the source of truth for app and scraper both.** Work
there by default. This document lives there and nowhere else.

Branches are for separating **in-progress work from known-good work**, not for
separating components. Use one only for a side quest that might be thrown away.
Merge or abandon quickly.

Claude Code web sessions are handed their own branch name at startup. That is the
tool's habit, not a decision — `.claude/hooks/session-start.sh` switches to `main`
before work begins. It refuses to move if the working tree is dirty or the branch
carries commits not on `origin/main`, and it fetches before deciding, so it cannot
discard anything.

**LIVE BRANCH, 13 Sep 2026: `claude/jsx-stitched-intake`.** The app's new intake —
marker rows rejected, duplicate rows folded (§4). **Not merged, not yet tested by
her.** A session that works only on `main` will not find it and will re-derive it.

**Branches that exist:** `claude/personal-tracking-ledgers-z49s2h` is **dead** (an
old default branch with no CLAUDE.md — if a session reports the scraper as having
no date handling, it is on that branch). `claude/met-connection-experiments` and
`claude/playwright-scraper-prototype-z68iko` hold abandoned experiments — **do not
merge either**; the second would undo the current scraper.

---

## 2. Where things stand

**This table is hand-maintained and therefore suspect.** It is derivable from
`scraper/output/` and should be printed by a script — see "Editing this guide".
Until it is, check it against the newest run directory before trusting it.

| Venue | Code | Rows | **Her substantive review** | Fixed & re-verified | Notes |
|---|---|---|---|---|---|
| National Gallery, London | `ng` | 27 | yes — her count | yes | |
| Rijksmuseum | `rijks` | 37 | yes — her count (36) | yes | 37 since; not chased, her call. *Asian Pavilion* pulled by the venue |
| Acquavella | `acq` | 15 | yes — her count | yes | |
| Art Institute of Chicago | `artic` | 65 | yes — her count + every row's type tag read | yes | **local only**; only EXHIBITION and TICKETED EXHIBITION kept, her ruling |
| The Met | `met` | 106 | yes — row by row, 11 Sep | yes | **local only**; see `docs/venues.md` |
| The Frick | `frick` | 10 | **yes — 12 Sep** | **no — page two never read** | past archive paginates; `paginate` wired 13 Sep but the venue answered 403 on every verifying attempt, so the ~10 rows on page two are still uncollected |
| The Menil | `menil` | 32 | **yes — 12 Sep** | yes | past AND current archives paginate; 7 permanent galleries excluded, her ruling |
| V&A | `va` | 6 | **yes — 12 Sep** | yes | Displays excluded, **her ruling for THIS venue only** |
| Tate Modern | `tate-modern` | 13 | **yes — 12 Sep** | yes | |
| Tate Britain | `tate-britain` | 9 | **yes — 12 Sep** | yes | Ofili excluded on the venue's own ONGOING label |
| Wallace Collection | `wallace` | 11 | **yes — 12 Sep** | yes | displays and trails kept, **her ruling for THIS venue** |
| Louvre | `louvre` | 22 | **yes — 12 Sep** | yes | 22 was never a ceiling — see §5; "load more" pressed until it runs out |
| Gallerie dell'Accademia | `dellav` | 2 | **yes — 12 Sep** | yes | prints Italian dates on its English page |
| Kunsthistorisches | `khm` | 6 | **yes — 12 Sep** | yes — no change needed | two rows half-dated because the venue says "since"/"until" |
| Capodimonte | `capo` | 18 | **partly — see below** | yes, fixes applied | **NOT count-verified and never will be**, her decision |
| Uffizi | `uffizi` | 13 | **yes — 12 Sep** | yes | headlines kept as titles and undated rows kept, **both her rulings** |
| Brera | `brera` | 8 | **yes — 12 Sep** | yes | 7 exhibitions + 1 marker for a genuinely empty upcoming page |
| Galleria Borghese | `borghese` | 8 | **yes — 12 Sep, her count** | yes | 7 exhibitions + 1 marker for a genuinely empty upcoming page |
| MoMA / British Museum / Morgan | `moma` `brit` `morgan` | 0 | n/a | n/a | refused; marker rows only |

**Read the two middle columns separately.** "Her substantive review" means she went
through that venue against the live site herself and her findings are recorded.
"Fixed" means those findings have been acted on and the venue re-swept and checked.
A venue can have the first without the second — that is exactly the state `uffizi`
and `brera` are in, and the state all thirteen were in at the start of 12 Sep.

**ALL SIXTEEN REACHABLE VENUES ARE REVIEWED BY HER, FIXED, AND VERIFIED AGAINST HER
OWN COUNT.** Capodimonte is the one exception and a deliberate one — see below.

Final counts, 12 Sep 2026 — **408 rows across the 18 reachable venues**, of which
406 are exhibitions and 2 are marker rows (brera and borghese each have one for a
genuinely empty upcoming page):

| | | | |
|---|---|---|---|
| ng 27 | rijks 37 | acq 15 | va 6 |
| tate-modern 13 | tate-britain 9 | frick 10 | menil 32 |
| wallace 11 | louvre 22 | dellav 2 | khm 6 |
| uffizi 13 | brera 8 | capo 18 | borghese 8 |
| **container total 237** | **met 106** | **artic 65** | |

**406 is the eighteen REACHABLE venues.** `moma`, `brit` and `morgan` return no
exhibitions at all — marker rows only — so nothing they do changes that figure.
What to do about them is still open; see §7 step 6.

No row at any venue carries a credit line, star rating, ticket price, funder list,
opening hours, breadcrumb or cookie notice. The only empty summaries are the three
Rijksmuseum rows whose own pages return HTTP 404, plus the occasional transient page
timeout — which always says so on the row.

Her 12 Sep review and every fix made against it are written up in
**`docs/review-2026-09-12.md`**, venue by venue, with what was wrong, what
changed and what each venue now returns. Read that before touching a venue
listed as DONE.

### Getting past page one — 13 Sep 2026

**Three venues were reading only page one of a listing, and none of it was a
decision** — each recipe was written by looking at a first page and stopping.
Her count cannot catch it: she counts what the site shows her, which is also
page one. `menil` past lost 12 exhibitions; `menil` current and `frick` past
both have a page two (~10 at the Frick).

`detectUnwiredPagination()` now asks every listing page, every sweep, whether it
links a page no recipe follows, and reports it in the run summary. **Structural,
never a phrase list** — same address, one number different. **It warns, never
fetches.** A filter the recipe drives itself is not a page: artic's `?year=`
decade links tripped it 32 times for a venue with nothing missing, so
`recipeDrivenParams()` excludes them. **A false alarm teaches her to scroll past
the real one.**

**The index base is the site's to state.** The Menil's bare page IS page 1
(`from: 2`); the Frick's is page 0 (`from: 1`). Fixture P-014 holds both.

`scraper/probe_pagination.js` asks whether a given page holds anything.
Read-only; reads the venue's own selector so it cannot drift from the engine.

### What is NOT confirmed — 13 Sep 2026

Diagnosing the Louvre took repeated sweeps of the same pages, and by the end the
Frick was 403 on a page it had just served and the Met was 429 on everything.
**Her instruction: no probes or sweeps for hypothetical problems.** These are
open, to be confirmed only as a by-product of a sweep that was happening anyway:

| Open | Why |
|---|---|
| `frick` page two, ~10 exhibitions | Wired 13 Sep, 403 on every attempt since |
| `artic` — any year needing page **three**? | Recipe asks pages 1-2; no year holds 40+ today. The standing check reports it if it happens |
| `louvre` — 2 summaries short | HTTP 429; those rows carry the reason |
| The load-more fix beyond the Louvre | No other venue has such a control today |

**`met` needs nothing** — her check: its year pages load whole, nothing to click.
`tate-modern`/`tate-britain` "recently opened" pages 1-4: **her ruling, the
structure grows as needed and is not triggered — nothing to do.**

### Capodimonte is closed differently, and the difference matters — her ruling 12 Sep

She could confirm the CSV holds no *visible* defects — no nonsensical titles, no
mangled summaries. She could **not** verify it against the site: Capodimonte
publishes in Italian only, and taking a CSV row and finding that exhibition on the
site is slow to the point of uselessness.

**So this venue is not count-verified and will not be.** Her decision instead:
import every row unless it is visibly mangled, then use the app's URL button —
Chrome translates the page for her, and the link is already attached to the card.

Two consequences:

- **The `url` column is the load-bearing field at this venue, not the dates.** All
  18 rows carry the venue's own exhibition address and none was dead on the 12 Sep
  run. Five rows have no closing date; she has accepted that.
- **The summary must arrive in English.** Her whole approach rests on it. Prompt A
  never stated an output language — English prompt, English examples, so a model
  would most likely comply, but nothing required it. Now it does; see
  `scraper/compress_prompt.md`.

**Whether displays count is HERS, and it varies by venue** — different museums mean
different things by the word. Not wanted at the V&A, wanted at the Wallace. Two
venues disagreeing is the expected state, not a contradiction to tidy up.

**All 21 have a recipe.** Blocked venues stay wired in deliberately: a refusal
costs about half a second, leaves marker rows in the CSV so it is visible on the
approval pile, and turns every sweep into a standing monitor. Blocks are not
permanent facts — in five days Borghese went down and came back, dellav turned out
never to have been blocked, the Met's archive turned out to be reachable, and
`artic` went from "reliable" to refused.

**Three routes, and the split is now settled — 12 Sep 2026:**

| Route | Count | Venues |
|---|---|---|
| **Claude scrapes** | **16** | `ng` `rijks` `acq` `louvre` `uffizi` `brera` `capo` `dellav` `khm` `frick` `menil` `wallace` `va` `tate-modern` `tate-britain` `borghese` |
| **Her laptop** | **2** | `met`, `artic` |
| **No route** | **3** | `moma`, `brit`, `morgan` — retested by her 12 Sep, still refused |

**`capo` belongs to the container, and it is the first venue where the asymmetry
runs THAT way.** Tested from both machines within minutes of each other on
12 Sep: the container returned 18 rows cleanly; her laptop timed out, retried,
got the 50 links, then hit HTTP 429 on individual detail pages. So the two
machines cover different gaps rather than one being strictly better — do not
assume a venue she cannot reach is unreachable. **How they join into one importable
CSV was parked until all 21 were done. They now are**, so it is live — see §7 step 6.
Her decision to make, and the shape depends on what happens to the three refusals.

### artic — only the two types the venue calls an exhibition, her ruling 12 Sep

**65 rows, down from 77.** She wants ONLY `EXHIBITION` and `TICKETED EXHIBITION`;
`COLLECTION INSTALLATION`, `COLLECTION ROTATION`, `VIDEO INSTALLATION`,
`SPECIAL LOAN INSTALLATION` and `HOLIDAY INSTALLATION` are all out. Her question was
the right one: *"I don't know why we simply unglued the tags, instead of filtering
out those exhibitions completely."* The badge stuck to the title was the visible
symptom, so it had been treated as a title problem, and stripping it left the row
in place looking like an exhibition.

**The tag is on the exhibition's own page, not on every listing card.** Its current
and upcoming cards carry it; its archive cards do not, which is why the card rule
caught eight on the current page and nothing at all across six history pages.

**Its year pages group by OPENING date**, so the year before the lookback floor has
to be requested too — a show that opened in December 2023 and closed in August 2024
is in range and sits on the 2023 page.

**THE VENUE CONTRADICTS ITS OWN TAGGING.** The Neapolitan Crèche runs every year:
one instance is labelled `HOLIDAY INSTALLATION` and excluded, the 2024 instance is
labelled `EXHIBITION` and kept. **Her ruling: leave it.** Trusting the venue's tag is
still right — the alternative is us deciding what things are — but it cannot survive
the venue disagreeing with itself, and that is a known, accepted hole rather than a
bug to chase.

**`scraper/show_tags.js` prints every row's tag** and writes `tags_<venue>.txt` into
the run directory. It exists because reconciling her count meant opening dozens of
pages by hand to read one word off each — work with exactly one correct answer per
row, which makes it code's job. It reads the same 400-character window as the
scraper's own exclusion, so the two cannot disagree about where a tag lives.

### artic — the earlier title lesson, still worth reading

**77 rows, every title clean, verified against her own count and her reading of
all 77.** The last of the 21. Detail in `docs/venues.md`.

The lesson is worth more than the venue. **Three fixes in a row were guessed at
from the CSV and all three were wrong**, because the CSV stores the title
*squashed to one line* and the defect was made of line breaks — the evidence had
been destroyed before it reached the file being read. One diagnostic on her
machine printing the card's text **as lines** settled it in a single pass.

**When the artefact cannot contain the evidence, stop reading the artefact.**
And the CSV is not the only thing that flattens: a count does too. The run before
last scored perfectly — 0 badges, 0 blanks, 0 wrong rows, exactly the predicted
77 — while two titles had quietly lost half their names. **Only reading the 77
titles found it.** Numbers confirm what you already suspect; they do not tell you
what you failed to imagine.

### Her rules for wiring a venue

- **Count the live listing pages FIRST, then write the recipe, then check the
  sweep returns that number.** This step was skipped for the European venues and
  she caught two errors from the counts alone that the output could not show.
  An independent count is the only check that can say "your number is wrong"
  rather than "your rows look tidy".
- **Two rounds of fixing and sweeping per venue, then stop.** If a session cannot
  tell "the venue does not publish this" from "my recipe is wrong", it stops and
  asks. **But check the limit is real first** — the KHM was written off as
  publishing two links when the page simply lazy-loads.
- At most ~15 diagnostic page reads per venue. Commit each venue before starting
  the next; commit an unsolved venue anyway with the open question in the message.
- **Diagnose one VENUE at a time, not one ISSUE at a time.** Within a venue:
  is it getting data → is it getting the right data → is it recording it properly.
- **An engine change is re-verified against the signed-off venues in the same
  sitting.** Re-sweep after an engine change, never after a recipe tweak.

### What is hers and what is the session's

- **How the scraper mechanically finds the right thing on a page** — the session's.
- **Whether a thing is an exhibition at all** — hers. Use judgement, proceed, and
  surface it for confirmation.
- **Checkable facts about the outside world** (is this documented address really
  the listing?) — the session's, but **verified, never assumed**. This is the only
  one of the three that fails silently: a bad extraction rule shows up as visible
  junk, a wrong category call as unwanted cards, but a listing page never found
  shows up as nothing at all. The Wallace brief's address is a two-tile hub;
  trusting it would have returned 4 healthy-looking rows.

---

## 3. The contract — the pro forma CSV

The **only** file the app ingests. Columns exactly, in this order:

```
venue_code, title, start_date, end_date, summary, url, notes
```

- CSV, not Excel. Excel silently reformats dates.
- Dates must be `YYYY-MM-DD`. The app blanks anything it cannot read and notes it.
- `venue_code` must be one of the codes in §2. Unknown codes land in "Couldn't be filed".
- **Sweep lookback is 1 July 2024, permanently.**

### What the lookback means

Keep an exhibition if it was **open at any point on or after 1 July 2024**.

- March 2024 → September 2024 is **kept**; January 2024 → June 2024 is **dropped**.
- **The test is on the end date, never the start date.**
- An unreadable end date is **kept and flagged** — an unknown date is not evidence
  of being too old.
- **One exception: a year with no day.** "Summer 2022", "March / 2026". That is a
  known but imprecise date, so take the **latest possible day of that year** as an
  upper bound and drop if even that is before the floor. Used for the lookback
  test only — **nothing is written into the date columns**.

### The scraper must never de-duplicate

**It records everything it finds and makes no judgement about duplicates, ever.**
Deciding whether two rows are the same exhibition happens in the app, where she
sees each proposal. A scraper that silently drops rows it *thinks* are duplicates
makes that decision unseen — and when wrong the loss is invisible. That is exactly
what happened: 32 National Gallery exhibitions looked like 3 and 29 were destroyed.

Know precisely what the app absorbs:

- **Across sweeps — handled.** A row matching the ledger becomes a fill/change
  proposal. Re-feeding the same file is safe.
- **Within one file — handled on `claude/jsx-stitched-intake` ONLY, not on `main`.**
  On `main`, `analyzeProForma` compares each row against the ledger and never
  against the rows beside it, so the same exhibition twice in one CSV produces
  **two Add cards** and `applyRefresh` keeps both. On the branch it folds them
  first — §4.

**This does not license the scraper to de-duplicate.** The app folds on URL where
she can see it happen; a scraper that drops rows makes the same call unseen.

**The one permitted exception: never read the same address twice.** Two rows with
the same URL are the same exhibition, always, with no interpretation. Nothing
cleverer qualifies — "same title", "looks like the same show" are judgements, and
the last one cost 29 exhibitions. Three details make it work:

- Compare the **finished address**, not the raw href. `normalizeUrl()` resolves
  each href against the page it was found on.
- The guard spans a **whole venue**, not one page.
- **Only scheme and host are lowercased.** Hosts are case-insensitive by spec;
  paths are not. Folding the whole address merged two exhibitions differing only
  in capitalisation.

A link resolving to **another host** is refused and counted in its own `offsite`
column. When a link appears twice on different listing pages, the surviving row
gains an "Also listed on the venue's 'past' page." note — information, never a
silent drop.

### The notes column is written for her, not for a log

Whatever lands in `notes` is shown **verbatim on the approval card**.

- **Keep them short.** State the fact and stop.
- **No advice, no instructions.** She can see an empty field and decide herself.
- **Say WHY, not WHAT.** The app already reports empty fields itself; the
  scraper's job is to explain the cause.

Good: `No closing date found anywhere on the venue's pages.`
Bad: `NO_END_DATE: kept, lookback unverified`

### Prefer structured data over guessing

Some venues embed a **schema.org Event** block: title, dates and description as
real fields. It removes exactly the part that keeps breaking.

**Universal logic, not a per-venue opt-in** — a venue that adds it later is picked
up with no code change, one that removes it falls back silently. It is a **bonus
source, never a replacement**: only the National Gallery publishes it, and only on
detail pages, so the listing still has to be walked and the browser is always
needed.

**It must be proved to belong to this exhibition before use.** A page can carry
several event blocks — a members' preview, a curator's tour, stale metadata.
`pickStructuredEvent()` accepts one only on a confident name match; no match, or
two equally good ones, and structured data is skipped entirely. A wrong date
labelled "from the site's structured data" reads more authoritative than a blank
one, which is worse than nothing.

---

## 4. The app

**Core mental model (load-bearing):** the app is the *tool*; the ledger is the
*document* — like a word processor and a file. Data lives in the ledger, never
baked into the tool.

**The ledger** holds every tracked exhibition plus her marks: watching / dismissed
/ want-catalogue / acquired / catalogue details. Losing or silently corrupting it
is the worst outcome the design guards against.

Current build: `Cat_Watch_v10.2_haiku.jsx` (1047 lines). An identical Sonnet copy
exists on Claude chat, differing in one model string.

**Ledger row shape:**

```
id, museumId, title, startDate, endDate, summary, exUrl, interested, watching,
acquiring, looked, hasCatalogue, catalogueTitle, isbn13, publisher,
publisherUrl, shopUrl, shopState, addedAt, editedAt
```

Ledger backup is JSON; the sweep pro forma is CSV.

**JSX validation:** `tsc check.tsx --jsx preserve --noEmit --skipLibCheck
--allowJs --target esnext`, filtering for `error TS1[0-9]{3}[^0-9]`.

### What is built and passed testing

**Loading and saving (v8.3).** She holds the only real copy of the ledger as a
file; the app is the workspace. Open → empty portal, no auto-loading. Import →
pick file. Status line has three states: calm neutral on fresh load, loud red
**UNSAVED CHANGES** after any change, calm green **✓ Saved — safe to close** after
Export. **Export IS Save.** Import and Reset ask before replacing unsaved work.

> **Accepted limit (her decision):** the green tick cannot be fully honest —
> Claude's download prompt has a Cancel the app cannot detect. She lives with it.
> Do not re-add a confirm step and do not remove the green tick.

**Refreshing (v9.2).** The app does the thinking; she approves each change. A
sweep CSV goes in via **Import Refresh**; the app compares it against the ledger
with no internet access, shows proposals as cards grouped by venue, and applies
only what she accepts. Proposal types: **Add**, **Fill/Change** (per-field
accept/reject with an escape hatch "this is a different show"), and **Couldn't be
filed**. Bad data is always surfaced with a note, never silently dropped.

Refeed workflow: reject bad rows, fix only those cells, refeed the whole file.
Already-applied rows stay silent.

**Sorting, timestamps and dividers (v9.3)** — most likely to look "broken" later
when it is working as designed.

- **Timestamp scheme — do NOT "simplify".** Every import stamps **one shared time
  for the whole batch**. A new import gets an `addedAt` only; `editedAt` is set
  only when a later sweep changes an existing entry. The ~110 seed entries have no
  timestamps at all — a permanent "Original set" floor. This is the only way to
  tell this import from earlier imports, imported-but-never-edited, and the seed.
- **Date ladder:** just opened → on now → dates unclear → announced → closed <3mo
  → 3–6 → 6–12 → over a year. "Dates unclear" between "on now" and "announced" is
  her explicit choice.
- **Recently added** bands: This import / Earlier imports / Original set.
  **Recently edited** bands: This import's edits / Earlier edits / Never edited /
  Original set — one more, because there are two kinds of not-in-an-edit-batch.
- Default post-import view floats the touched batch to the top under one "Rest of
  the list" divider, vanishing on any sort click.
- **"Announced last"** applies to the Wanted filter only. **Acquiring filters** are
  AND across the three axes, OR within one.

**Urgency tiers** are computed live from dates versus today (`tierFor`). No data
written, no internet call.

**Catalogue lookup (v10)** — the app's one live internet function and the only
thing that spends tokens. Step 1 searches **only** the venue's shop domain (hard
allow-list, cap of 1 search); step 2 runs one broad search **only if** step 1 found
nothing. Results are tagged shop / web / none. Reseller links (Amazon AU,
AbeBooks, Alibris) are built by the app from ISBN or title. It is one function
(`askClaude`); swapping the model is a one-line change.

### Reading a stitched file — `claude/jsx-stitched-intake`, 13 Sep, SIGNED OFF BY HER ON TEST DATA

One CSV now carries every machine's output, so the app reconciles rows against
**each other** before the ledger. Her design: the stitch stays dumb, all judgement
lives here where she sees it.

- **Marker rows are not proposals.** Matched on the sentence the scraper stamps
  verbatim — `Marker row, not an exhibition.` — not on the bracketed title, which
  is a guess about formatting. They become a coverage panel. Previously each was
  an Add card, and rejecting is not remembered, so a refused venue put the same
  junk on her pile **on every future sweep forever**.
- **Duplicate rows fold on venue + URL, and nothing else.** Gaps fill silently;
  a genuine disagreement is carried to the card as a CHOICE, fuller value ticked
  and marked as a guess, both shown. Folds are disclosed in the notes so the card
  count still reconciles with the file.
- **Rows with no URL never fold.** The only other key is the title, and
  `sameExhibition()` returns true whenever either side lacks dates — fine against
  the ledger where she sees each proposal, fatal here where it fires first. An
  unfolded duplicate costs one visible card; a wrong fold costs an exhibition.

**Odd cases come FIRST, batched by kind, in six numbered bands** — her ruling
after seeing it: markers, unusable rows, combined-for-you, combined-with-a-
disagreement, disagreements, then rows with no link at all. Easiest first and
hardest last, which is not the order an engine would pick: she is spending
attention rather than compute, and clearing what needs nothing leaves more of it
for what does. Batched by kind means a venue can appear twice on the screen; she
would rather finish one kind of thinking than keep switching. Venue headings sit
inside every band, in the same order as the ordinary list below.

`scraper/fixtures/intake_cases.js` — 14 cases, including the two that must NOT
merge. `scraper/fixtures/intake_sample.csv` — 76 rows, 8 venues, built from real
sweeps: a venue with both marker and real rows, two with markers only, four with
real rows only, and a Louvre block covering every conflict shape.

**Deliberately not built:** bulk-approve, in-app field editing, and the mirror
case where the app proposes Add but it is really an update.

### Shop homepages (wired for the catalogue lookup's domain lock)

met `store.metmuseum.org` · ng `shop.nationalgallery.org.uk` · rijks
`rijksmuseumshop.nl` · acq `acquavellagalleries.myshopify.com` · louvre
`boutique.louvre.fr` · uffizi `shop.uffizi.it` · brera `bottegabrera.org` · khm
`shop.khm.at` · both Tates `shop.tate.org.uk` · moma `store.moma.org` · frick
`shop.frick.org` · morgan `shop.themorgan.org` · menil `bookstore.menil.org` ·
artic `shop.artic.edu` · brit `britishmuseumshoponline.org` · wallace
`wallacecollectionshop.org` · va `vam.ac.uk/shop`.
**No shop:** borghese, capo, dellav — these skip to the broad web search.

**Seed set:** ~110 exhibitions read 20 Aug 2026, covering met / ng / rijks / acq
only. Baked into the JSX, shown via Reset. Stripping it has been rejected.

### The inversion — worth preserving

The originally-easy problem and the originally-hard problem swapped places. She
expected ingestion to be trivial and the portal to be hard. The reverse happened:
the React portal was straightforward, and **data gathering is structurally hard
because it depends on the outside world's current architecture**.

Consequences that should hold:

- The app already built is what she keeps. No data-gathering solution forces a
  rebuild of the portal.
- **The data-gathering layer is swappable underneath**, never replacing the app.
- Whenever a session drifts toward "rebuild the app around a new backend" or
  "downgrade the app to fit the tools" — neither.

---

## 5. The scraper

### Why it exists

Chat Claude's fetch tool **retrieves a page before its JavaScript runs**. Modern
museum sites are shell-plus-database designs, so the fetch tool sees an empty frame
where a human sees exhibitions. Confirmed architectural across Sep 6–7 2026: no
prompt-crafting fixes it. **A headless browser fixes this at the root** — it loads
the page, runs the JavaScript, waits for content, and only then reads the text.

**Target output:** a CSV in exact pro forma format, with the **summary column
carrying the raw curatorial text dump**. A later compression step turns that into
the teaser she reads. Keeping the raw text is what makes fabrication structurally
impossible.

### Files and commands

- `scraper/sweep_prototype.js` — the real scraper. Playwright + headless Chromium.
- `scraper/sweep_fetch.js` — older diagnostic copy, no browser. Not developed.
- `scraper/compress.js` / `compress_cli.js` — raw dump → the summary she reads.
- `scraper/date.test.js`, `compress.test.js` — fixtures. `npm test`, ~1 second.
- `scraper/reach_probe.js` — **reachability only**; says nothing about usable rows.
- `scraper/inspect_listing.js` — asks a listing page what link shapes it contains.
- `scraper/data_probe.js` — **the only probe that asks the project's real question**:
  opens real exhibition pages and extracts title, dates and text. Two live limits:
  it lacks the engine's navigation filter, so listing pages can read as false
  passes, and it still defaults to all 15 venues including wired ones.

```
node scraper/sweep_prototype.js              everything
node scraper/sweep_prototype.js ng rijks     named venues only
node scraper/sweep_prototype.js --continue   finish the newest run
node scraper/sweep_prototype.js --jobs=6     venues at once (default 4)
node scraper/sweep_prototype.js --budget-mins=3   abandon a venue after N min
node scraper/stitch.js <run> <run> ...        combine runs into one importable file
node scraper/compress.js                     plan compression of the newest run
node scraper/compress.js <run> --apply       write sweep_compressed.csv
npm test                                     all fixtures
```

**`stitch.js` chooses NOTHING** — her design. It does not pick which copy of a
venue wins, drop marker rows or notice duplicates; every row from every named
folder goes in. Order therefore cannot change the result. A venue swept on both
machines arriving twice is the POINT: the app folds the copies where she can see
it. It writes `output/stitch_<stamp>/sweep.csv` — a directory, because compress
reads directories, and named `stitch_` not `run_` so `--continue` and the
archiver both ignore it.

**Reachability is not the project's question.** Her correction: *"this is not a
project in can you map me an internet directory."* A row needs a title, two dates
and curatorial text. **Count rows, not links.** Three measurement failures in one
afternoon all made the same mistake — measuring something cheap instead of the
thing that mattered, then stating it confidently and having to withdraw it.

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
  sweep taking three invocations still produces one file. Rebuilding rather than
  appending makes it idempotent.

Timestamps are **Sydney time**, fixed to that zone rather than the machine's.

**The sweep archives old runs at start-up** (`archiveOldRuns`, 13 Sep). Diagnosing
one venue means running real sweeps, each leaving a folder, and `--continue` resumes
whichever is NEWEST — by 13 Sep there were 135 and the newest three were one-venue
probes. **Moved into `output/archive/`, never deleted**, and three things are never
moved: the newest 10, anything holding a compressed CSV (that is compression's
memory — archiving it silently recompresses everything), and any run with 16+ venue
files. It runs before the run directory is chosen, and says what it moved.

**Runs are committed, not gitignored.** The container is temporary: a finished
sweep could otherwise be lost because nobody asked for the file before the session
closed. Committing also lets a later session read an earlier sweep to diagnose a
change. Size is not a reason to hesitate (~500 KB per 21-venue run).

**Then hand her `sweep_compressed.csv` — she must never have to ask.** Send it
with the file-sending tool as soon as compression finishes, saying how many rows
it holds and how many summaries were reused versus written. **One file, and only
one** — not `sweep.csv`, which still holds raw dumps, and not the per-venue files.
Handing her several means she might import raw text. **If compression has not been
run, the run is not finished.**

One gap, honestly: if the container dies **mid-run**, completed venues are still
lost. Git is deliberately not built into the scraper — credentials differ between
machines, and that fails silently.

### How long a sweep takes — measured 12 Sep 2026 from the run logs

| | Time |
|---|---|
| All 21, one venue at a time | **33 min** |
| `--jobs=4` (default) | **~9–11 min** |
| `--jobs=6` | ~7–8 min, at which point Capodimonte alone is the bound |
| Slowest single venue — `capo` | 6.0 min |
| Blocked venues | 1–18 **seconds** each |

**Parallelism is across venues only, never within one** (IR-15), so the floor is
the slowest venue. It also splits across two machines: 19 venues here, 2 on hers,
at the same time. **A hang is bounded** — a venue over budget (default 10 min) is
abandoned, writes no file, and is redone by `--continue`.

Caveats: these are container timings, and the listing scroll added 12 Sep costs a
few seconds per listing page. Two additions of 12 Sep cost a page load each where
they apply: following a numbered archive to the lookback floor (the Menil now
reads 3 pages of past instead of 1) and pressing a "load more" control (the
Louvre, once per year page).

### The network bridge — don't remove it

In this container all outbound traffic goes through an agent proxy, and **Chromium
cannot use it**: the tunnel opens, Chromium sends its unusually large (~1.8 KB) TLS
greeting, and the proxy drops the tunnel — `net::ERR_CONNECTION_RESET` on every
https page. Setting a proxy on `chromium.launch()` does not fix it; nor does
ignoring certificate errors, because it is not a certificate problem.

**The fix, proven and in the code:** Chromium does no network I/O at all. Every
request is intercepted and answered by Node, which reaches the internet through the
proxy fine. Chromium still parses, renders and runs JavaScript normally. This is
`installNetworkBridge()`.

Two consequences: the TLS fingerprint does not match the Chrome user-agent the page
sends, so sites checking for that may notice; and image, media and font requests are
deliberately dropped.

**A raw egress path around the proxy exists. Do not use it and do not build on it.**
The environment routes traffic through the policy proxy deliberately. The remaining
route is to **report** the WebSocket limitation, not engineer past it.

### How the scraper is organised

**One engine, one recipe per venue.** The split follows what the logic is *about*,
not whether it happens to be shared.

**Universal — in the engine, a fix here helps all 21:** fetching and waiting, the
counters, the URL-identity guard, the lookback rule, structured-data-first,
**parsing a date string once you have it**, writing the CSV.

**Per venue — in `VENUES`, one readable block each:** which pages to visit, which
links are exhibitions rather than navigation, where the title sits, where the dates
sit, what boilerplate to strip.

There is no clever general rule for the second list, and **every attempt at one has
cost us**. A rule learned at Borghese — "never read the title from above the link" —
was wrong at Rijksmuseum a day later. A venue writes down only what differs.

Recipe options: `selector`, `isNav`, `title` (heading / card / strip rules),
`lookbackAfterDetail`, `excludeOngoing`, `yearArchive`, `lookbackFrom` (unused),
`card: { firstLine }`, `otherBranch`, `within` (per **page**, not per venue),
`excludeUndated`, `suffix`, `includeCurrentYear`, `notATitle`, `excludeLabelled`,
`paginate` (per **page**), `loadMore`, `description`, `noise`.

The last two are about where the BLURB is, and they exist because the shared
extraction ladder expects a paragraph at every rung:

- **`description`** names the element holding the curatorial text, read whatever its
  tag. The V&A writes its blurb into a `div` with no paragraph in it at all, so the
  ladder fell to the bottom rung and stored the membership offer on all 15 rows.
  Capodimonte keeps its article in a tabbed panel whose paragraphs are divs, so the
  ladder took a nested fragment and several summaries began mid-sentence.
- **`noise`** names extra containers to exclude at one venue only — Capodimonte's
  practical-info box is styled `has-custom-color`, a generic WordPress class that
  means nothing anywhere else.

Two that carry a trap:

- **`notATitle` is checked wherever `CTA_ONLY` is checked, INCLUDING the heading
  branch.** The heading was trusted first and returned before any check ran, which
  was the entire bug on the first attempt — Tate's hero cards named two exhibitions
  after the building.
- **`yearArchive` never writes the years down.** A recipe listing `2025, 2024` by
  hand is correct that afternoon and wrong every year after: run it in 2028 and the
  sweep **completes, reports no error, and is quietly missing two years**. So a
  recipe declares the shape and `expandYearArchive()` derives the years at run time
  — the floor's year through **last** year, newest first, current year excluded
  because the bare `past` page already serves it. Fixtures Y-001 to Y-005 assert no
  recipe carries a hand-written year again.

**`yearDropdown` is gone.** Driving the Met's year menu returned the same 68 links
three times. **The menu changes the ADDRESS** — `?year=2025` — so each year is
simply another page, and clicking raced the navigation. **Check the address bar
before reaching for a click: if it changes, there is no interaction to automate.**

**A link back to the venue's own listing page is navigation** — universal.
`isOwnListingPage()` compares with any language prefix stripped, so `/es/exhibitions/past`
matches. Mechanical rather than a judgement, because we already know which pages are
listings. It cannot swallow a real exhibition; fixture N-004 guarantees it.

### How a listing page is read

Per page: `seen -> navigation / already-seen URL -> collected (n with no readable
title)`, ending in a coverage table. **Every link is accounted for by a number.**

**Titles come from the page's own heading where there is one**, never from the first
line of link text — that captured badges and made 32 NG exhibitions share 3 titles.
Where a venue wraps only the *image*, the title is read from the card container
above, guarded: at most 2 levels up, nothing over 220 characters.

**A link with no readable title is never dropped.** It gets a blank title and a note
saying what the URL slug suggests. The slug guess stays in the notes and never enters
the title column.

**`noTitle` is counted when the page is FINISHED, not as each link is read.** A venue
links one exhibition several times per card; `fillBlanksFromRepeatLink()` supplies the
name a moment later, but the counter had already fired. The Met reported **43
unreadable titles on a page whose finished rows every one had a title**, and that was
read as a defect and reported as one. **Report the state that reaches her.**

**The same exhibition linked three times on one card.** `fillBlanksFromRepeatLink()`
fills the kept row's **empty fields only** from other links to the same address — not
de-duplication, and it cannot lose anything. Button text is not a name: `CTA_ONLY`
rejects a link whose **whole** text is one of those phrases, so a title containing
"Explore" survives.

### Getting past a listing's first page — added 12 Sep 2026

Two shapes of "there is more below", and which one a venue uses decides everything.

**A NUMBERED ARCHIVE is just more addresses.** The Menil's past listing paginates,
`?page=2`, and only page one was being read — 12 exhibitions lost outright, invisible
in the output because a first page that reads perfectly looks exactly like a complete
archive. `followPagination()` asks for the next page and lets the site's answer decide
whether there is another, stopping when a page hands over no address not already seen.
**How many pages there are is never written into a recipe** — the same trap as a
hand-written year, one step worse, because only the site knows.

**It stops at the lookback floor, and that is not an optimisation.** The first version
walked to the true end, on the grounds that stopping early assumes a newest-first
archive. That caution cost eleven Menil pages instead of three and put 13 decades-old
undated exhibitions on her approval pile that nothing downstream could drop. **The
ordering is not assumed, it is checked**: each page carries its newest closing date to
the next, and the first page that comes back newer says so in the log and reverts that
venue to reading to the end.

**A "LOAD MORE" BUTTON IS A CONTROL, and pressing it is correct here.** The test is
whether the address changes — the Met's year menu changes it, so each year was simply
another page and clicking raced the navigation; the Louvre's loader changes nothing in
the address bar and has no address of its own that answers. A venue names its own
control (`loadMore`); there is no general rule for what such a button looks like.

Three things make it work, and each cost a failure:

- **The consent banner comes down first** (`dismissConsent()`, universal). The Louvre's
  control was recorded as broken for two days because the cookie popin swallowed the
  click. **"I clicked it and nothing happened" is only evidence if the click reached
  the thing.** The banner is not shown on every visit, which is how one unlucky test
  became a written fact.
- **The anchor's default action is cancelled before every press.** The button is a
  disguised link to a page that 404s. While there is more to load the site intercepts
  the click; once the list is complete it stops intercepting, the browser follows the
  href, and the listing is replaced by the 404. **The failure needs the press AFTER
  the last real one**, so a single-click probe cannot show it — mine reported success
  immediately before the live sweep lost 8 rows. **A control tested once is tested in
  its easy case.**
- **THE PRESS IS FOLLOWED BY A WATCH, NOT A SLEEP — 13 Sep.** A fixed 2.5s pause
  then one count was answering two questions at once — has the batch arrived, and
  is there no batch — and cannot tell them apart. Under load it read a slow batch
  as the end of the list: the Louvre's "past 2025" gave 6 links at `--jobs=4` and
  11 alone, same code, same day, both reporting success. Now polled until it grows;
  only 12s of nothing means the end. **22 was never a verified ceiling** — the old
  loop read 43 links from the past page where it now reads 60.
- **The stop REASON is logged, not just the press count.** "pressed 1x" was printed
  whether the control vanished, the click missed, or the batch was slow. **A log
  that cannot tell a working mechanism from a broken one is why this sat unnoticed.**

### Three universal behaviours added 12 Sep 2026

- **A listing page is SCROLLED before it is read.** The KHM builds cards as you
  scroll; read at the fold its whole programme is two links, and that was written
  into this guide as a fact about the venue. Listing pages only; the loop stops when
  the page stops growing.
- **Measure the page height AFTER the wait, not before.** The first version still
  missed all three KHM upcoming shows. It now requires two unchanged steps.
- **A page that loads and yields nothing leaves a marker row.** The check sits AFTER
  the de-duplication guard, so a page whose links were all collected elsewhere does
  not report itself as empty.
- **A title can come from the exhibition's own page when the listing gives none.**
  Fills a BLANK only, never overwrites.

### Keeping junk out of the summary — her biggest issue, 12 Sep

Her verdict across the twelve venues she reviewed: **the biggest problem is junk text
in the summaries** — photo captions, "join us for the opening talk", ticketing. And
the reason it matters is hers, not a restatement: some litter the compression step can
be trusted to ignore, but **an artist and a work named in a caption read exactly like
an artist and a work named in the blurb**, so the model cannot tell them apart and can
state something false with no way to know.

Three kinds of rule, in descending order of trust. Reach for the next one only when
the one above gives nothing:

1. **The page names the block itself** — `image-caption` at Tate, `Alert` at the
   Louvre, `onetrust` anywhere, `has-custom-color` at Capodimonte. Strongest, because
   it survives the wording inside changing, and the Louvre's visitor notices change
   weekly.
2. **The shape of the markup** — a paragraph that is bold end to end is a label, not
   prose. The Wallace's details line sits in the same `div.rich-text` as its blurb,
   same class, same parent; the bold is the only difference. Guarded to fire only
   where the page has non-bold prose to fall back on.
3. **A phrase list** (`BOILERPLATE`) — "admission charge", "generously provided by",
   a star rating. **Weakest, and it does not generalise**: it catches only the
   phrasings we have seen, and a venue writing "entry is chargeable" slips through.
   Only add a phrase that could never appear in a real blurb — a donor list, a ticket
   price — never a word that might turn up in curatorial prose.

**Junk in a summary is visible on her approval card, unlike a dropped row.** That is
why a phrase list is an acceptable last resort here and would not be acceptable for
deciding what to collect.

**Clearing one kind of junk can pull in another.** Removing Tate's caption freed a slot
and what moved up at the Menil was the funder list — and the Frick was already shedding
those while the Menil was taking them on. Re-check the closed venues after every change
to this area, which is her standing rule for an engine change anyway.

### Failure handling

**Every venue leaves marker rows for listing pages it could not read** — one per
page, titled `[past page]`, carrying the reason. Universal since 10 Sep: it was a
per-venue opt-in, so **the Met, refused on every page, contributed nothing at all**.
A standing monitor that reports nothing is not a monitor.

`classifyLoadError()` reads Chromium's own error name and `failureProse()` turns it
into the sentence she sees:

| What happened | On the card |
|---|---|
| HTTP 403 / 418 / 429 | the venue's site refused us (HTTP 429) |
| `ERR_FAILED` | the venue's site did not respond |
| `ERR_CONNECTION_RESET` | the venue's server dropped the connection part-way |
| `ERR_CONNECTION_REFUSED` | the venue's server refused the connection |
| `ERR_NAME_NOT_RESOLVED` | the venue's web address could not be found |
| `ERR_CERT_*` / `ERR_SSL_*` | the security certificate could not be verified |
| navigation timeout | the page did not finish loading in time |

A reason falling through to `LOAD_ERROR, cause unknown` means a network error we have
not seen; add it rather than guess.

**A transient failure is retried once — a refusal never is.** A failed page costs the
row's dates, and a row with no end date cannot be dropped by the lookback, so it
arrives as a rogue undated card. `safeGoto` retries **once**, after two seconds, only
on `TIMEOUT`, `CONNECTION_*`, `EMPTY_RESPONSE`, `NO_RESPONSE`, `LOAD_ERROR`.
**Every HTTP status is excluded, deliberately** — a venue answering 403 has told us
its answer, and asking again is the hammering the standing rule forbids.

**A page that loads is not a page that exists.** `safeGoto` refuses any status ≥ 400.
A 404 still **serves a readable page**, so "This page does not exist." was stored as
three Rijksmuseum summaries. Those rows are kept and carry a note; **the dead link
stays in the URL column**, because `applyRefresh` falls back to the venue's generic
listing when `exUrl` is empty, and an arrow that silently goes somewhere else is worse
than one that goes nowhere honestly. Such rows necessarily have an empty summary.

**A dying run is not a page failure.** The run directory rests on one guarantee — a
venue file on disk means that venue finished — and it was not true. A run stopped
by hand mid-venue recorded the browser teardown as nine ordinary page failures,
**retried them against a browser that no longer existed**, declared the venue
complete and wrote 10 of 16 summaries missing. Nothing said so. A browser crash does
the same with nobody touching anything. Three parts, all needed:

1. `classifyLoadError` returns `SHUTDOWN` for `Target closed`, `Browser has been
   closed`, `Execution context was destroyed`, `Target crashed` — deliberately **not**
   in `TRANSIENT_FAILURES`, so never retried.
2. `safeGoto` **throws `ScrapeAborted`** rather than returning `{ok:false}`. A
   returned failure looks like a page that would not load, so the venue finishes;
   throwing means `writeVenueCsv` is never reached.
3. **`rethrowIfAborted()` in every catch that continues past a failure.** This is the
   part missed first time, and why it must be stated as a principle: **a dying browser
   raises the same error from ANY Playwright call, not only navigation.** Every catch
   in a scraper is written for the page in front of it — that is right, and exactly
   why each one needs this guard.

Also: a `SIGINT`/`SIGTERM` handler sets `STOPPING` so the venue stops at its next
navigation. Fixtures E-001 to E-006 cover the classification.

### Reading dates

**All date parsing is shared, on purpose** — every venue contains several venues'
worth of formats (the Rijksmuseum alone uses six), so a pattern learned at one is
worth having at all.

Sources in order: **structured data** → the **listing card** (`datesNearLink`) →
**prose on the exhibition's page** (`findDateRangeInProse`) → a date-ish element. The
detail scan runs whenever *either* date is missing and **fills only empty fields —
the listing wins on disagreement.**

Formats handled, all found in the wild:

```
6 FEBRUARY TILL 25 MAY 2026          day-first, year on the end
22 MARCH 2025 TO 15 MARCH 2026       day-first, year on both
12 SEP 2025 TO 25 JAN 2026           abbreviated months
21 Sept. 2024 to 12 Jan. 2025        abbreviated with a full stop
11 Oct. 2019 t/m 19 Jan. 2020        Dutch "t/m" (tot en met)
December 13, 2025 - February 2, 2026 month-first
From June 10 to September 14, 2025   month-first, word separator
5 June to 25 October                 no year — borrowed from the listing
Till 29 November                     no year, no opening date
WORN till 21 March 2027              single date with a preposition
March / 2026                         month and year only
December 9 - 31, 2023                one month, day only on the closing side
December 5 - January 20, 2026        crosses new year — opens in 2025
Summer 2022                          season and year — a bound, not a date
Dal 16 ottobre 2025 al 6 gennaio 2026   Italian, "from ... to ..."
Dal 16 aprile all'8 settembre 2026      Italian, "al" elided before a vowel
From 21/03/2024 to 28/04/2024           all numeric — see below
10 set 2026 - 22 nov 2026               Italian month abbreviated to three letters
Saturday 23 May - Sunday 29 Nov 2026    a weekday in front of each date
```

**A WEEKDAY NAME BREAKS EVERY RANGE PATTERN**, so it is stripped first. The Wallace
prints "Saturday 23 May - Sunday 29 November 2026" and its Churchill row reached her
with NO dates and a note saying the venue published none — untrue, and the same shape
of failure as dellav below: **the scraper blamed the site for its own gap.** The strip
is anchored on what follows (a day number or a month name) so a bare "Sun" is not cut
out of prose. Longest alternative first, or it removes "Sunday" and silently leaves
"Saturday" — which is what the first attempt did.

**THREE-LETTER ITALIAN MONTHS.** The Gallerie dell'Accademia prints "10 set 2026 -
22 nov 2026" on its ENGLISH page. `nov` matched as English, `set` did not, because the
map held `sett`. Both dates came back blank.

**Italian is in the SHARED month map**, like every other format: five wired venues
are Italian. Without it Capodimonte's 50 rows were ALL undated, and undated rows
cannot be excluded by the lookback, so its entire history survived. Note the elision:
"al" becomes "all'" before a vowel, in both apostrophes, and **the longest alternative
must come first** or a bare "al" matches the first two letters of "all'8".

**An ALL-NUMERIC range is read only when the numbers PROVE their own order.** In
"From 21/03/2024 to 28/04/2024", 21 cannot be a month, so the range is day-first and
the other end inherits it. If either end has a first component over 12 it is
day-first; a second component over 12, month-first; if **neither end proves anything
the range is refused** rather than guessed. It is a **listing-card rule** — run
against whole page text it gave two Uffizi exhibitions the run of a sidebar lecture.

**A range that runs backwards crosses the new year**, and the opening year is worked
out rather than assumed. "December 5 – January 20, 2026" opened in December **2025**.
Until 10 Sep the start inherited the closing year, so the show ended seven weeks
before it opened. Museums run winter shows constantly.

**Every date is checked against the calendar before storage.** `ymd()` is the single
gate. JavaScript rolls `2026-02-31` silently forward to 3 March, so an impossible date
never announces itself — it becomes a plausible **wrong** one and can then decide
whether a show passes the lookback.

**Every dash is normalised first** — U+2010 to U+2015, minus sign, Hebrew maqaf. With
only the en dash handled, a figure dash made "15 October 2026" read as 1 October.

**Two guards stop art history being read as exhibition dates:** a month **name** must
sit beside the number, and the year must be plausible (**1990–2035**). Verified
against `Caravaggio (1571-1610)`, `stayed in Italy in 1629`, `confiscated on 4 May
1607`, `August 17 1945` — all correctly ignored.

**A PUBLISHED OPENING YEAR THAT FAILS THAT GUARD REFUSES THE WHOLE RANGE** — it is
never quietly swapped for the closing year. Capodimonte's Mimmo Jodice page says
"Mimmo Jodice ( Napoli 29 marzo 1934 – 27 ottobre 2025)", the photographer's birth and
death. 1934 was rejected, the opening year was then worked out from the closing one,
and **a lifespan was stored as the exhibition's run** in a row that looked healthy in
every other respect. The flaw was treating "no year published" and "a year published
that cannot be an exhibition year" as the same case. They are opposites: the first is
a gap to fill, the second is proof the sentence is not about a run at all.

**The two parsers must not diverge.** `findDateRange` (listings) and
`findDateRangeInProse` (page text) drifted twice, each time silently losing dates.
The prose parser now falls through to the listing parser, and there is one shared
`MONTH_PATTERN`.

**Her standing rule:** where the code has applicable logic it uses it; where it has
none the date columns stay blank and the notes explain why. **Never a guess.**

#### A listing card is not a page — the loose rules apply to one, not the other

**The most dangerous rule in the file is "one month name beside one year".** On a
listing card that is almost certainly the exhibition's date. On a whole page it is a
lottery, because a page also carries navigation, captions, a footer and opening hours.

The Rijksmuseum's *Express yourself* prints `16 Feb - 9 June` with **no year
anywhere**, so the scan fell through to the bare month-and-year rule and matched a
photo caption — *"Gerard Wessel, RoXY, Amsterdam, April 1994"*. A 2024 exhibition got
a **1994** opening date, ranking it thirty years closed.

So `findDateRange` takes `{ looseSingles }` and `findDateRangeInProse` passes
**false**. Refused on page text: bare `Month YYYY`, bare `Season YYYY`, bare
`Month D, YYYY` with no preposition. Still allowed everywhere: every range pattern,
and a single date with a preposition (`until 20 February 2026`).

Express yourself now returns **no dates at all**, with a note. That is the correct
answer — the venue never published a usable one.

#### A date must be proved to belong to this exhibition — three sources, three guards

The 9 Sep review raised this against **structured data** only (IR-09). It was
implemented exactly that narrowly, and the underlying principle was not carried
across. Both other sources then failed the same way within a day. **Read the
principle, not the finding.**

1. **Structured data → match the event's name.** `pickStructuredEvent()`.
2. **Page text → refuse a sentence that contradicts what is already known.** NG pages
   carry related courses. Waldmüller's page advertises a course running "7 September -
   28 September 2026" while its card says "Until 20 September 2026". The old rule was
   "fill only what is empty", so it took the course's opening date and discarded its
   closing date — the very thing proving the sentence belonged to something else. No
   date-*shape* rule can catch this, so **if either end of a prose range disagrees
   with a date already collected, the whole range is discarded.**
3. **Listing cards → stop at the edge of the card.** `datesNearLink()` walked a fixed
   two steps; a step count is not a boundary. Two steps up sat a box holding one card
   *and the next one*, whose dates had a year and so won. The walk now stops as soon
   as a box contains **more than one exhibition address**
   (`coversMoreThanOneExhibition()`), whatever its size.

**Why losing that date is the right outcome:** the row is then incomplete, and an
incomplete row is exactly what sends the scraper to the exhibition's own page, which
states the dates plainly. The bad grab cost the correct answer twice over, because a
row that looks complete is never followed up.

**The half that is NOT solved.** There is no general way to tell an exhibition's dates
from any other date on its page. All three guards need something to check against.
Where a venue's listing carries no dates and its page carries a related event, the
scraper will take the wrong dates silently. **This is the same problem as known bug 2,
one scale up.** The ladder is the same each time:

1. **The site says so** — use its tag, exactly as structured data is used.
2. **Structure implies it** — URL shape, which block the text sits in. Mechanical, so
   code's job.
3. **Neither** — collect it, flag it, let her decide. Never guess, never drop.

### Travelling exhibitions — a note, never a merge

A venue with two addresses runs the same show in both. Both rows are always kept and
the **city stays in the title**, so they read as different entries.
`noteTravellingRuns()` adds "The same exhibition is also shown at Palm Beach." to
each. Matching ignores the city and all punctuation. **It must never become
de-duplication:** a wrong match costs one misleading sentence, never a row. A venue
opts in by listing its `locations`.

### Compression — the summary column

The scraper writes the **raw curatorial dump**; `scraper/compress.js` turns it into
the ~6-word teaser she reads, and `sweep_compressed.csv` is **the file she imports**.

- **Reuse is by code and cannot be wrong.** It reads the previous run's compressed
  CSV; identical raw text reuses the wording with **no model call**. Changed text asks
  one question — *is the old summary now false?* — handing over the old wording.
- **Identical text INSIDE one file is also asked once** (`groupIdenticalRaw`, 13 Sep).
  A stitched file repeats any venue swept on both machines, and the previous-run
  memory cannot see the copy beside it. Asking twice is worse than wasteful: each row
  is an isolated question, so the model can word the same text differently and the
  difference reaches her as a conflict.
- **Sonnet writes fresh, Haiku judges staleness.** Measured, not assumed.
- **Reached by subagent, not the session itself** — a session uses whatever model it
  happens to be, which discards the measurement. One subagent per **job**, never per row.
- **A reuse caused by a failed page must say so in `notes`.** Silent reuse papers over
  a scraper failure.
- Cap is **ten words**, ending in a full stop, a noun phrase — measured from her 110
  seed summaries, not chosen.

**Full design, evidence and the rejected alternatives: `docs/compression.md`.**
It is finished and signed off — do not re-plan it.

### No single key identifies an exhibition over time — 13 Sep 2026

Found while matching her 110 seed summaries against a real sweep. Title matching
found 56; URL matching found 103 of the same 110. Four cases where they
disagreed, and they had four different causes:

| What happened | Example |
|---|---|
| Same address, written differently | `waldmuller` vs `waldm%C3%BCller` |
| The show moved to the archive | `/exhibitions/zurbaran` → `/exhibitions/**past**/zurbaran` |
| The venue renamed its own slug | `ng-stories-making-a-national-gallery` → `ng-stories` |
| **The venue RECYCLED an address** | Rijksmuseum's *Document Nederland* is annual; `/past/document-nederland` now points at the 2024 edition and the 2025 one has a suffix |

The first two are code gaps, not changes: decode before comparing, and strip a
known listing segment. The last is the important one — **a URL is not permanent
either.** It is the address-shaped version of artic's Crèche problem.

**So neither key works alone, and DATES are the tiebreaker.** Same address with
date ranges a year apart is a recycled address, not one exhibition.

**THE RIGHT ANSWER DIFFERS BY WHERE IT IS USED, because the cost of being wrong
differs.** This is the part to carry across:

- **The app's folding — strict, same URL only.** A wrong fold loses an
  exhibition permanently and silently. Everything else becomes two cards she
  can see and reject.
- **Compression memory — loose is safe.** Both failures are soft: a miss costs
  one model call, and a false match hands the model the wrong old wording
  **together with the real blurb**, so it rewrites. URL, then title, then dates.

Applying the app's rule to compression wastes calls; applying compression's rule
to the app loses rows.

### Known bugs — open

1. **Nothing filters out non-exhibitions, generally.** The only test is URL shape, so
   talks, tours and opening events filed under an exhibitions path are collected. A
   venue that dumps everything *and* tags nothing still needs a different answer.
   **Where a venue DOES tag, the tag is now used** — Tate's `event_type` query filter,
   the V&A's `Display` badge, Tate Britain's `ONGOING`, the Art Institute's
   `COLLECTION INSTALLATION`. That is rung 1 of the ladder, the site saying so.
2. **Title casing is inconsistent** — some venues apply capitalisation in CSS.
   **Her decision: live with it.** Genuinely all-caps titles exist.
3. **artic's two title defects** — see §2.

---

## 6. Do not re-break these

Each entry cost a real failure. Before changing the area, read the line.

- `networkidle` waits — 30s timeouts on pages that had loaded in 3.
- Unwrapped `route.fulfill`/`abort` — a cascade of "interrupted by another
  navigation" that returned zero rows for all six venues.
- Title-based de-duplication — deleted 29 NG exhibitions.
- Borghese's `/mostre/` selector — collected the navigation menu.
- Dropping links with unreadable titles.
- A cookie-banner filter that walked up to `<body>`, excluding every paragraph on
  every page. **The ancestor walk must stop before `<body>` and `<html>`.**
- A noise-class match believed on a container holding most of the page — the Wallace
  Collection's `section--footer-spacer` LAYOUT class made an image-licence notice all
  11 summaries.
- Two copies of the month pattern, full names only, so `12 SEP 2025` parsed to nothing.
- The plausible-year guard missing from a branch, so "4 May 1607" became a start date.
  Later missing again from the day-first range branch, the busiest path in the parser.
- Six near-identical venue scraper functions — now the engine/recipe split.
- A single fixed `sweep_raw.csv`, which let a one-venue diagnostic silently replace a
  full sweep while the file still looked complete.
- A hardcoded Chromium path. `resolveChromium()` tries Playwright's answer first, then
  what is installed, newest first — **both halves are needed**.
- A range with the year on the closing side giving the opening date that same year,
  and no impossible-range guard on the listing parser to catch it.
- Building date strings by hand with `padStart`, nothing checking the day exists.
- `parseMonthDay` matching the month as `[A-Za-z]+`, stopping at the full stop
  `MONTH_PATTERN` allows, so `Sept. 21, 2024 - Oct. 12, 2024` produced nothing silently.
- `normalizeUrl` lowercasing the whole address — two exhibitions differing only in
  capitalisation collapsed into one.
- Joining hrefs onto the venue base by hand — cannot resolve `../`, protocol-relative
  `//host`, or query-only links, and never checked the result was still on the site.
- Taking `events[0]` from structured data without checking the event was this exhibition.
- `parseDateRange`, a second anchored parser nothing called. Dead code shaped like live
  code is a trap for whoever debugs dates next.
- The bare month-and-year rule applied to whole page text — a photo caption became an
  opening date.
- Giving up on a detail page after one transient failure, which cost a summary AND let
  an out-of-range row survive the lookback undated.
- Keeping the FIRST link to an address and ignoring the rest — the NG's first link to a
  card is the image, so Renoir and Love lost its title and dates.
- Only the en and em dash normalised.
- Treating a 404 as a page that loaded.
- Treating a torn-down browser as a page failure — a venue written to disk as COMPLETE
  with 10 of 16 summaries missing, breaking the one guarantee the run directory exists
  to give.
- Reading a listing page without SCROLLING it, then writing the result down as a fact
  about the venue.
- Measuring a scrolled page's height BEFORE waiting for the new cards.
- A listing that loads and yields nothing leaving no trace in the CSV.
- `TITLE_NOISE` stripping EXHIBITION / DISPLAY / FREE case-insensitively — "How to Make
  an Exhibition" was stored as "How to Make an ".
- `VENUE_ORDER` as a second hand-typed list of venue codes, so two finished recipes
  could not be selected and nothing said why.
- Trusting the heading FIRST and returning before any check ran.
- Reading an all-numeric range from whole page text.
- Acquavella's title rule stripping `NEW YORK` / `PALM BEACH`, making its two runs of
  one show read as the same exhibition. It now strips only the date tail.
- Reading only the FIRST page of a paginated archive — 12 Menil exhibitions lost, and
  a first page that reads perfectly looks exactly like a complete archive.
- Walking a paginated archive past the lookback floor "to be safe" — eleven pages
  instead of three and 13 undated decades-old rows on her approval pile.
- A load-more click following the anchor's href once the list is complete, replacing
  the listing with a 404 and costing 8 Louvre rows.
- A FIXED PAUSE after a load-more press, counted once, deciding both "has it
  arrived" and "is there any more" — 4 Louvre exhibitions, invisible in the output
  AND the log, and a row count that varied with how busy the machine was.
- Reading only page one of a listing because nobody asked whether there was a two.
- Assuming a site numbers pages from 0, or from 1. Only its own next link says.
- A next-page check treating a recipe's OWN filter as a page — 32 false alarms at
  artic for a venue with nothing missing.
- Inserting a check into the middle of an existing block, splitting it: every venue
  without a load-more control died before reading a page, while the unit suite
  passed 148/148. **It has no browser, so the listing loop never runs in it.**
- Archiving old run folders without checking which ones compression needs — its
  memory is the newest previously-compressed run, and moving those recompresses
  every row from scratch while reporting nothing.
- Two groupings both claiming a pending row by assignment, so the second silently
  dropped the first and that row never received an answer.
- Writing a stitched file as a loose CSV when compress reads DIRECTORIES — it
  compressed the newest sweep instead, 652 rows in and 172 out, no error. Each
  half was correct; the join between them had never been run.
- Matching her seed summaries by TITLE when the seed carries a URL slug — 56
  matches where there were 103, and Acquavella scored zero because the scraper
  deliberately keeps the city in its titles and her seed does not.
- Concluding a control is broken without checking the click reached it; the Louvre's
  cookie popin swallowed it and the wrong conclusion sat in the recipe for two days.
- The layout-wrapper escape applied to a NAMED consent manager — the V&A's cookie
  panel held 24 of 27 paragraphs, passed itself off as the layout, and its text became
  the description on all 15 rows.
- An extraction ladder that expects a paragraph at every rung, with no way for a venue
  to name a blurb that lives in a div.
- A weekday name in front of a date, which defeats every range pattern.
- Discarding an implausible published opening year and deriving one from the closing
  year — an artist's lifespan stored as an exhibition run.
- Italian months abbreviated to three letters (`set`), where the map held only `sett`.
- Checking output for junk with an ENGLISH-only word list, then reporting an Italian
  venue as clean.
- Filtering `rows` after `applyLookback` has already copied it into `toFetch` — the
  log announced ten exclusions while all ten sat in the CSV with empty summaries.
  **A log line describing something that did not happen is worse than no log line**,
  so counts are taken from the array AFTER the change, never from the list of marks.

---

## 7. Open decisions and order of work

1. ~~**Compression**~~ — **DONE, built and tested. Do not re-plan.** See
   `docs/compression.md`. One gap remains and **she has declined to close it**: the
   judging half has never fired on real data because no venue has yet reworded a blurb.
   It rests on an authored eval that scored 14 of 14. **Do not raise it again.**
2. ~~**Wire all 21 venues**~~ — **DONE.** All 21 have a recipe; see §2 for state.
3. ~~**Parallelism and the hang bound**~~ — **DONE** (`--jobs=N`, `--budget-mins=N`).
4. ~~**Venue-by-venue diagnosis of the working set**~~ — **DONE, 12 Sep 2026.** All
   sixteen reachable venues reviewed by her, fixed and verified against her counts.
   Her findings and every fix, venue by venue: `docs/review-2026-09-12.md`.
5. **Produce one importable CSV — THE CURRENT STAGE.** Agreed with her 12 Sep, in
   this order, and the order matters:

   1. ~~**A full 21-venue run from the container.**~~ **DONE, 13 Sep** —
      `run_2026-09-13_020041`, `--jobs=4`. All 16 reachable venues match her
      signed-off counts exactly; container total **237**. Refusal marker rows
      present for met (4), artic (10), moma (2), brit (2), morgan (3).
      **The Louvre is genuinely 22 here, where the 12 Sep run had 18.**
      Two Louvre summaries were lost to HTTP 429 and say so on their cards.
   2. ~~**She runs `artic` and `met` on her laptop.**~~ **DONE, 13 Sep** —
      `run_2026-09-13_020305`: artic **65**, met **106**, both with every row
      carrying text and no marker rows. Her counts.
   3. ~~**Decide how the two machines' output joins.**~~ **DECIDED, 13 Sep — hers.**
      **The stitch is dumb concatenation with no logic in it at all**, and every
      judgement moves into the app, which is where this project already puts
      judgement and where she sees each decision before it lands. No merge tool,
      no precedence rule, no folder ordering to remember — order cannot change the
      result because nothing is chosen. Marker rows and duplicate rows are then
      handled at intake (§4).

      Rejected on the way: a merge tool picking which venue file wins (order
      becomes a thing to remember), and redefining `venueIsDone` as "has real
      rows" — **her call**, because the three permanently-refused venues would
      then never count as done and the standing monitor breaks for no gain.

      **The stitch script itself is NOT written yet.**
   4. **Compress the combined file.** Never yet run at scale: the largest
      compression to date is 15 rows from one venue, against roughly 400 now. The
      reuse half is pure code and cannot be wrong; the writing half has not been
      asked for hundreds of summaries before, so cost and batching are untested.
   5. **Hand her `sweep_compressed.csv`** — one file, never the raw sweep.

   **A run is not finished until compression has run.** A full sweep that stops at
   raw CSVs is not a deliverable.

   **Both halves are now in hand: 237 + 106 + 65 = 408 rows**, the same figure as
   12 Sep, with the Louvre now genuinely at 22 rather than accidentally at 18.

   **WHERE THIS ACTUALLY STANDS, 13 Sep — read before assuming anything works.**

   **The intake is signed off by her.** Tested by hand against
   `intake_sample.csv` and corrected twice on her findings: odd cases moved to
   the top and batched by kind (§4), then venue headings inside each band. Still
   on the branch; it merges once the real import passes.

   **The chain has now been run as far as compression.** Both machines swept,
   three run folders stitched into `stitch_20260913_0442` — 652 rows, 402
   distinct exhibitions, 206 duplicate copies. Borghese was dead from every
   machine that day (`cultura.gov.it` unreachable, not a refusal); capo answered
   neither of us; moma, brit and morgan refused as always. Everything else
   matched her signed-off counts.

   **STILL NOT RUN: the compression itself, and the import.** Measured, not
   guessed: 390 rows need a summary and the Sonnet half alone is ~126,000 tokens
   of raw text. That is too much for one subagent, so the job splits into
   several — the guide's "cost and batching are untested" line, now with a
   number against it.

6. **Decide what to do about venues still unreachable** — `moma`, `brit`, `morgan`.
   They contribute no exhibitions at all, only marker rows, so the 406 figure above
   is unaffected by them. Every sweep re-tests them, so the day one starts answering
   it shows up on the approval pile by itself.
7. **JSX work** — quarantine ("Never add this"), plus whatever steps 5–6 turn up.
8. **Catalogue lookup tuning** — Haiku vs Sonnet, on known-tricky catalogues.
   Independent of everything above.

**The ledger is not being protected during development.** Her ruling: she keeps no real
ledger until JSX and scraper are both finished, so she can import freely and roll back.
**Do not raise ledger pollution as a reason to reorder this list.**

### Quarantine — "never add this", not yet built

**Dismiss is not a rubbish chute.** She dismisses only exhibitions that are **real**,
**not duplicates**, and that she has looked at and isn't interested in. Junk must never
enter the ledger.

Today there are two outcomes and neither fits junk: **Reject** stores nothing, so the
row proposes itself again on every future sweep forever; **Accept then dismiss** puts it
in the ledger permanently. There is no third option and there needs to be.

**The design, keyed on normalised URL:** the ledger gains an `ignored` list alongside
`rows`; `analyzeProForma` skips any row whose URL is on it; Add cards gain a third
button. Rows with no URL fall back to venue + title. Import reads only `d.rows` and
`d.lastRun`, so this **breaks no existing ledger**.

What it is for: dead links, non-exhibitions, genuine duplicates. **Not** undated shows —
a real exhibition with no dates is fine to accept, and later sweeps match it silently.

### Travelling shows — settled 8 Sep

A show moving between venues is imported as **one entry per venue**, because rejecting an
Add card is not remembered but dismissing in the ledger is. So: **accept both, then
dismiss the one she doesn't want** — not reject the duplicate card. Cross-venue shows
never merge on their own (`sameExhibition` returns false when `museumId` differs).

### Parked, not accepted

- **Shop links can be stale or dead.** The link comes from the search index, not a live
  check. The obvious fix — point it at an ISBN search — **doesn't work**, because museum
  shops search by title, not ISBN. Open problem.
- **Sweeper brief v3** — the Chat-Claude-era instruction document still needs its URL
  corrections. Expect it to end up as the fallback procedure for blocked venues rather
  than the main sweep.

---

## 8. Rejected — do not re-propose

Ledger on Claude cloud storage. Google Drive auto-load on open. Saving the ledger to
Drive from the app. The app gathering its own exhibition data. Auto-save on every change.
A confirm-tap after download. Bulk-approve during refresh. In-app field editing. The
separate readout doc. Excel as the sweep format. Merging the two Tates. Stripping the 110
seed. Watching the sweeper and interrupting it. Firing a new JSX mid-discussion. Splitting
catalogue lookup from drawer output. A "GPT scrapes, Claude compresses" role split.
Blocking scripts and trackers in the network bridge (IR-13). Splitting the scraper into
modules (IR-14). **Fetching several pages at once within one venue (IR-15) — never, at any
scale.** Dropping an undated row because its start date is old (IR-18). **Proposing "drop
the feature" as a fix — rejected as an approach entirely.**

Corrected along the way: Chat can **not** fetch any URL cold. The Italian venues are four
different situations, not one problem. "18 venues fetchable" was wrong. The AbeBooks link
is `/servlet/SearchResults?kn=…&sts=t`.

Reasoning for the compression-specific rejections is in `docs/compression.md`; for review
findings, in `docs/review-log.md`.

---

## 9. Where the rest lives

| File | What is in it | Read it when |
|---|---|---|
| `docs/venues.md` | Per-venue forensics: the scoreboard, exactly what each refusal is, the Met, Morgan, Rijksmuseum, Borghese, the legacy fetch-tool notes, listing URLs | Working one specific venue |
| `docs/venue_urls.md` | All 21 venues' addresses from the Sweeper Brief, plus its per-venue traps | Wiring or re-checking a venue's pages |
| `docs/compression.md` | The compression design, the model split and its evidence, the eval, the rejected alternatives | Changing compression — otherwise don't |
| `docs/review-2026-09-12.md` | **Her 12 Sep review of the 13 unchecked venues**, venue by venue: what she found, what was wrong, what changed, what each returns now | Before touching any venue marked DONE in §2 |
| `docs/review-log.md` | Independent review findings and what was decided | A reviewer raises something |
| `docs/Cat_Watch_Sweeper_Brief_v2.docx` | The original Chat-Claude brief | Rarely; most of it does not apply to the scraper |
| `scraper/compress_prompt.md` | The compression prompts and three rounds of tuning | Changing summary wording |

Git history holds the full text of everything compressed out of this guide on
12 Sep 2026 — `git log -- CLAUDE.md`.
