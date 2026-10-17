# Cat Watch — project guide for Claude Code

**Repo:** `angelawen-boop/Cat-Search-Project`

She collects art-exhibition catalogues. They go out of print fast once a show
closes, then resale prices climb. **Cat Watch** tracks temporary exhibitions at 28
museums and galleries and shows how close each catalogue is to its likely
out-of-print window, so she can buy before it is too late.

Two components, and they are **coupled**:

1. **The app** — `Cat_Watch.jsx`, a React page published on her Claude account.
2. **The scraper** — `scraper/`, which produces the CSV the app eats.

They agree on the pro forma CSV columns (§5.2). If the scraper changes what it
writes, the app has to agree in the same breath. That coupling — not tidiness —
is why they live in one repo, on one branch.

---

## 1. How to work on this project

### House rules

- **Plain English, ELI5.**
- **Short and concise.**
- **Suppress most of thinking output. Work quietly** - surface only what needs her.
- **Destructive actions need a confirmed backup or an explicit yes.**
- **Never republish the app before confirming it is safe to do so** - republishing in the background can cause loss of unsaved ledger.
- **Her report and output first** - update the guide only after you have responded to the rest of her request.
- **Applying to the scraper and scraper-related work only — test conservatively.** Every page a sweep fetches counts towards the venue's rate limit. Use saved pages first, with no network. Never a blanket re-sweep.
- **For work not relating to the scraper and which uses Parallel's features — testing is always against the live internet**, ie. pages fetched live through Parallel. Do not test on saved pages and do not invent test pages. A feature keeps a list of where its tests live on the internet — addresses and the signed-off result for each — so any later change is re-checked by fetching that list live. Add by link's: `docs/link_proof_pages.json`, checked by `scraper/link_proof_check.js`.
- **Raise a past decision by describing the context, not by reference to a date.** She keeps no log and a date tells her nothing. Say it as: "Because of X, you decided Y. Would you like to reconsider? / If this changes your decision, we can do Z." Call it her decision or her judgement call — never a "ruling" or a "rule".
- **A question gets an answer first.** "Talk to me about X" means discuss; nothing is built until she says.
- **Respect UI simplicity and specific UI instructions.** Build what she named, nothing added. "Add a copy icon" = an icon, not an icon plus the word "Copy". "Copy this line for case X and Y" = the same line with only the words naming X and Y swapped, never a new, longer line.
- **Label a guess as exactly that** - say what is not proven and what would be settled by a check.
- **Never hide a hard-coded answer.** If a fix writes the answer into the app (an address, a value, a
  venue rule) instead of making the feature work it out, say so plainly and up front, never as
  "fixed". If the app could reach the answer itself, tell her how, and discuss it with her before
  building either way.
- **Parallel:** a session's own calls use the free "Parallel Search". Her keyed "Parallel Search Key" needs her yes — ask up front, with the reason, when the work will clearly need it. Once she has said yes, switch to the key as soon as the free tier refuses - no need to hang the task hoping for the free tier to resume access. Later in the same session, after time has passed, try the free tier again first. A sub-agent cannot spend the key (permissions block it), so the main session does keyed fetches; a large reply is saved to a file — extract it by script, never retype.
- **`/orch` runs only when she types it** (her decision). No session routes work through it, or follows its steps, unless she has typed `/orch` in that session.
- **`/close` ends a session** (her design): guide update, clear up, a fixed four-part summary. Never archives the session. Runs only when she types it.
- ISBN-13 is always displayed `xxx-xxxxxxxxxx` (3 digits, hyphen, 10 digits).

### Put it in code — her decision

**Hard code beats a Claude Code session.** Push every job as far toward code as it goes. The test:

> **Does the task have exactly one correct answer, derivable from the inputs?**

- **One correct answer → code.** Merging files, choosing which venues still need
  running, validating a date, resolving a link, rebuilding a lost cache. Never
  prose rules a session re-derives — that is how a CSV gets mangled, invisibly.
- **Many acceptable answers, or judgement about the outside world → Claude.**
  Compressing curatorial prose into a six-word teaser.
- **Even then, Claude touches strings, never files.** A script owns the CSV and
  asks for a value; Claude never sees a comma or a column.

### Procedures — in side docs

`main` is the trunk and the source of truth for app, scraper and this guide; work there.

- **Editing this guide or a side doc, and the rules for code comments and decision history:**
  `docs/doc_rules.md`. **Read it before editing this guide or any code comment.**
- **Branches, and holding a push for another session:** `docs/branches.md`. **Read it before
  creating, merging or pushing a branch.**
- **Publishing the app** (version numbers, building, the publish steps): `docs/publishing.md`.
  **Read it before publishing.**
- **Tests** (which half to run, the suite list, test anchors, JSX validation): `docs/testing.md`.
  **Read it before running or writing tests.**

---

## 2. Where things stand and open work

### 2.1 Where things stand

#### Run the script, do not read a table

```
node scraper/venue_status.js
```

Per venue: rows from the last run that brought any, the last run that held the
venue at all, which machine sweeps it, and — read from the marker rows — why the
last attempt brought nothing. When the two runs differ, that venue has stopped
answering. **Every venue has returned rows at least once.**
**`ashmolean` is no longer swept** — added by link only (her decision; `docs/venues.md`).

**Access and pace — settled for the four Cloudflare venues.** A blank browser
profile is refused; a visible Chrome on a profile she has browsed in gets in
(`probe_headed.js`). Firing pages back to back gets challenged, and the
judgement follows to the next Cloudflare venue. Paced sweeps from her laptop in
mode B have been clean at all four (`docs/sweep_operation.md`). Evidence: `docs/venues.md`,
"The headed venues".

#### Her decisions, per venue — `docs/venues.md`

What is excluded or kept at each venue, her counts, and the Capodimonte arrangement are in
`docs/venues.md`, "Her decisions, per venue". **Read it before touching a venue's recipe, rows or
counts** — her counts are always what should reach the app.

**All 28 have a recipe**, blocked ones included: a refusal costs half a second,
leaves marker rows on the approval pile, and turns every sweep into a standing
monitor. **Blocks are not permanent facts** — venues have gone down and come
back within days.

**The original venues were reviewed by her against the live site and re-swept**
— `docs/scraper-verification-2026-09-12.md`. Read it before touching a venue listed
there. The nine venues added since were checked against her counts at intake.

No row carries a credit line, star rating, ticket price, funder list, opening
hours, breadcrumb or cookie notice. Empty summaries: three Rijksmuseum rows whose
pages return 404, plus occasional page timeouts — which say so on the row.

### 2.2 Open work

Everything not listed here is finished. Do not reopen a closed item without a
new fact.

#### 2.2.2 Fixes not yet checked in the cases they were written for

**The 15 Oct sweep's fixes — in code for the next sweep; this month's runs were imported as the
scraper wrote them (her decision: a fix never changes a run already swept).** Her next sweep checks
each: the Met's excluded series (P.S. Art, Scholastic, commissions, Burdick, crèche) stay out, now
checked on the name the show's page gives; no credit lines at Met, Art Institute, MAD, Rijksmuseum
(the Rijksmuseum rule has no saved page to test on); no "page couldn't be read" card for an empty
Art Institute page 2; Brera keeps bold words mid-sentence and stops before its info block; Borghese
titles arrive in ordinary capitals with an em dash between name and subtitle — one round of title
Change cards against her hand-corrected 7; Acquavella's "– Acquavella Palm Beach" leaves the title
(she accepts that Change card); Tate Britain's listing page 2 is read; the report names every
refused or empty page. Expect ~45 one-time compression re-checks.

#### 2.2.3 Catalogue lookup generally

**All search work after 43 is on `parked`, unpublished** (her decision) — the `parked`
branch's own CLAUDE.md (§7.4 there) and `docs/handover_search_stage1.md` say where it stands.
The text below is as it stood at 43.

**PAUSED — no lookup patches until the redesign is agreed** (her decision: past the
third-patch limit — `lookupCatalogue` changed 10 times in three days). The redesign (find →
choose → tell, every version kept, her starting-pick rules) and its nine agreed cases are in
`docs/catalogue_versions.md`; every later change is checked against them. Awaiting her
approval to build; no code before.

She is noting issues as she uses it, for a later debugging session.
**Shops tested by her in the app: `brit`, `morgan`, `mad`, `orsay`, `louvre`,
`moma`.** `uffizi`'s shop sells no books — settled.

- **OPEN — the publisher step's verdict is not stable.** *Metamorphoses*
  (Hannibal), two fresh lookups, same code: "Publisher's section", then
  "Publisher" (right). Cause unproven — a different candidate page, the page
  returning empty (`pageIsShell`), or the read judging one page differently.
  Its record in the lookup log settles it (`docs/app.md` §1, "The lookup log").
- **OPEN — 40.10's fixes, unchecked in the app**. Her next lookups
  settle each: *Hammershøi* (Jacquemart-André) finds *Hammershøi : le maître
  de la peinture danoise*, ISBN 978-9462302495; *Watteau* no longer reads the
  shop as blocked; *Canaletto - Guardi*'s English line names the publisher's
  page; a MoMA lookup still reads its shop as blocked under the whole-page test.
- **Diagnose a lookup from its record, never a pasted panel.** Every Find
  catalogue, Search again, Re-check and link reading is recorded whole in the
  app's store (the test page's, before the merge) — every call, what Claude was sent and answered, the card
  before and after (`docs/app.md` §1, "The lookup log"; read it with ArtifactData
  `list` + `out_dir`, then `node build/lookup_log.js <dir> [<id>]`).
- **Fixed in 42.6, her next lookups confirm:** *Hubert Robert* (NGA) — a catalogue
  the read finds with no title or ISBN (press release: "the accompanying catalog")
  now goes on to the facts round instead of being dropped (`unnamed`, UN-001–003);
  a reply holding two answers takes Claude's last (`lastJsonObject`, TW-001–004 —
  her Louvre links' "unreadable" descriptions).
- **OPEN — the English-edition and versions rebuild, 42.7–42.9; her re-run of Hubert
  Robert (Louvre, NGA) and Vasari on 42.9 confirms.** What was built, its rules and
  known limits: `docs/app.md` §1, "The route" (Trust order). Tests HR-, BK-, VS-, R8-.

- **Search again and Reset card + Find catalogue run the same lookup** (checked
  on the live page). They differ only when a step fails part-way: Search
  again then leaves the card untouched. Otherwise a different result is the
  web answering differently — get that run's log.

#### 2.2.4 The monthly sweep — 15 Oct imported

**First run, 5 Oct — a test, not imported** (`run_2026-10-05_015417`, 359
rows). `sweep_diff.js` now works out each change's cause; the skill asks only
for the UNEXPLAINED pile. Its faults (V&A, National Gallery, Cincinnati, Brera,
Tates) were fixed from her saves the same day; Louvre refused 3 pages.

**15 Oct — container re-run passed her test** (pushed, reported, the five fixes held); her home
sweep (met, artic, mad only — she checks the headed four by eye and sweeps them only for new shows)
QC'd. Stitched and compressed as swept (`stitch_20261015_0920`, 536 rows) and **imported**.
Faults found are fixed in code (§2.2.2).

#### 2.2.5 Queued next

- **Catalogue-search rebuild: published on the test page (41.1).** Open: her live
  check of Hammershøi — the edition read now sees every result, so the library
  record (978-0847899289) that came tenth should give the English edition (WL-060).
- **Then:** the comment tidy for the rest of `scraper/`, and tests for two scraper
  decisions — MoMA's visitor notices dropped; the Wallace keeps displays and trails.

#### 2.2.7 "Probably not for you" — built, published at 46 (shown then as 45.1); her next monthly import checks it

Compression labels a NEW show in a topic she always quarantines (Prompt D, `TOPICS` in
`scraper/compress.js`; Asian art wins over any other label; the Met's rotations are never
labelled — her decisions). Code writes "Topic: …" into the notes. On import those cards go in
"Probably not for you · N", after Odd cases, pre-set to Never add; Add keeps one. Approval-card
links are clickable. Tests: TP-, TP-A, AD-009–010; `scraper/topic_eval.js` re-scores the labeller
on her decisions (last run: 69 of 86 quarantined caught; 8 of 40 kept wrongly labelled, mostly
contemporary; labels at the edges differ between runs). Her rehearsal in the app passed.
- **OPEN — her next monthly import:** are too many wanted shows pre-set to Never add
  (contemporary the likeliest), and does any always-quarantined show slip through? Narrow a group
  only if she says.

#### 2.2.6 Tests that fail under load

**OPEN — RB-016 and RB-020** (robots wait, scraper) fail under load: run ten at
once, RB-016 read 1148–1293ms against 1450 in 5 of 10, RB-020 over
1400ms in 2. Not investigated. A scraper session's job — not an app one's.

**OPEN — V-003** (`venue_status.test.js`) fails on `main`: mad reports 22 rows but
`run_2026-10-15_230242` holds 8. Not investigated; a scraper session's job.

---

## 3. Where the rest lives

Every side doc is one step from this guide. A doc may name another as a "see also", but nothing
a session needs lives only behind such a link. Read the one for the work in hand.

**App** — the page, how it saves, and how it scales

| File | What is in it | Read it when |
|---|---|---|
| `docs/app.md` | The app's evidence: catalogue lookup, shop addresses, saving, intake bands, quarantine, sweep log, seed, the cloud ledger's screen | Changing anything in the app |
| `docs/cloud_storage.md` | The cloud ledger: what the page's store holds, Save and the safety copies, the opening switch, the safety proofs, the read-only lock for a second copy | Changing anything about saving to the page's own store |
| `docs/store_backup_2026-09-21/` | A read-out of the page's store, as insurance | Only if the store is lost AND `sweep_log.js` cannot rebuild it |
| `docs/ledger_2026-09-24/` | Her real ledger as exported on 24 Sep, kept as test data for the cloud-store and scalability work — **never load it into her published app** | Testing saving or sizing against a real ledger |
| `docs/scalability.md` | What grows as the ledger grows, measured; parked work for when she acts | The list feels slow, the store fills, or she raises the size |

**Import 1: the scraper** — getting exhibitions from the venues into a CSV

| File | What is in it | Read it when |
|---|---|---|
| `docs/scraper.md` | The scraper's evidence: listings, pagination, the date parser, junk in summaries, failure handling, blocked venues, and the steps for adding a venue | Changing anything in the scraper, or wiring a venue |
| `docs/sweep_operation.md` | Running the scraper: commands, files, run directories, who sweeps what, headed venues, pacing, robots.txt, the network bridge, what to send her when a sweep ends, and the monthly container routine | Running a sweep, or changing how one runs |
| `docs/compression.md`, `scraper/compress_prompt.md` | Compression design, model split, eval and rejected alternatives; the prompts and their tuning | Changing compression or summary wording — otherwise don't |
| `docs/import_csv.md` | The pro forma CSV: lookback, never de-duplicate, the notes column, `swept_at` | Changing what the scraper writes or what the app reads |

**Import 2: the venues** — what each museum does and what she decided about it

| File | What is in it | Read it when |
|---|---|---|
| `docs/venues.md` | Her decisions per venue (what is excluded or kept, her counts); per-venue evidence: refusals, the headed venues' runs, each venue's quirks, the original 21 venues' address traps | Working one specific venue |
| `docs/listing_pages/`, `docs/*_pages/` | Pages she saved, with a README of what each settled | Changing that venue's recipe — before asking her for anything |
| `docs/Cat_Watch_Sweeper_Brief_v2.docx` | The original Chat-Claude brief | Rarely |

**Import 3: Add by link** — getting one show in from a pasted address

| File | What is in it | Read it when |
|---|---|---|
| `docs/add_by_link.md`, `docs/link_proof_pages.json` | Design, decisions, store, shelf rule, venue link rules; the live proof pages for them | Changing Add by link |

**Search** — finding a show's catalogue

| File | What is in it | Read it when |
|---|---|---|
| `docs/catalogue_versions.md` | The catalogue-versions redesign (paused) and its agreed cases | Changing the catalogue lookup's design |

**Features** — ideas not yet built

| File | What is in it | Read it when |
|---|---|---|
| `docs/library.md` | Purchase tracking and a Library tab — **future consideration, never propose** | She raises it |

**Procedures** — how to do the recurring jobs

| File | What is in it | Read it when |
|---|---|---|
| `docs/doc_rules.md` | How to edit this guide and the side docs, and the rules for code comments and decision history | Editing this guide, a side doc or a code comment |
| `docs/branches.md` | The branch table and holding a push for another session | Creating, merging or pushing a branch |
| `docs/publishing.md` | Version numbering, building the app and the publish steps | Publishing the app |
| `docs/testing.md` | Which half to test, the suite list, test anchors, JSX validation | Running or writing tests |

**Reviews**

| File | What is in it | Read it when |
|---|---|---|
| `docs/code-review.md` | Every code review of the project, this one and all future ones: each finding and what was decided (fixed, rejected, deferred) | A reviewer raises something, or after any new code review |

**Records** — kept as evidence, rarely needed

| File | What is in it | Read it when |
|---|---|---|
| `docs/scraper-verification-2026-09-12.md` | Her venue-by-venue review of the original venues | Before touching a reviewed venue |
| `docs/import-repair-320.md` | How her first big import files (the 320-card import and the new-venues import) were repaired and built | Touching those files, or explaining their dates |

Git holds the full text of everything compressed out of this guide —
`git log -- CLAUDE.md`.

---

## 4. Guardrails — what not to do

### 4.1 Lessons — mistakes not to repeat

Each line came from a real failure. Details are in git history and `docs/`.

- **Tests can pass and prove nothing.** Check the exit code and grep the output
  for the new test's own name; a suite can be skipped silently (code after
  `process.exit`, a missing harness, an early `return` — use `await`).
- **A command chain that pushes must stop on a failed test** — `grep` of the test output succeeds either way; gate the push on the test's own exit code (`R=$?; [ $R = 0 ] && git push`).
- **Render the page** (`page_renders.js`). `tsc`, unit tests and string greps can all pass on a blank page.
- **Test the real thing.** A fixture must serve the address the recipe asks for now, and must run the step that writes the output. Name a test for what the code does.
- **A count can hide errors.** Read the cards, titles and descriptions, and check titles against the museum's own spelling. Read the page, not a search excerpt of it.
- **A probe answers only the request it made.** One page read says nothing about the venue; do not invent causes when a sweep fails. Free checks first (robots.txt, reply labels, her saved pages), then at most one sweep.
- **Say which "nothing" it is:** found nothing, never ran, or was refused. An empty page is not an empty venue. Say what is unknown instead of printing a default.
- **Never report success because a button was clicked.** Count from the data after the change, not from the list of marks. A control that only appears when it has something to show cannot report "nothing".
- **Never drop a row on a judgement.** No de-duplicating by title (it deleted 29 National Gallery shows); undecided cards are never skipped on apply; a data fault means "re-run", never a card for her.
- **Code owns anything with one right answer**, and anything derivable is never re-derived from prose written for a human. Do not delete dormant code, change more than asked, or invent a constraint she did not state.
- **Quote the match, never the input** (a whole page once landed in one note). Loose rules apply to a listing card, not whole-page text. Ancestor walks stop before `<body>`.
- **One copy of every fact.** Two date parsers, two venue lists and two month patterns each lost data silently. Delete the dead copy; when you fix a fact, fix every place that shows it.
- **Run the whole chain end to end** (stitch → compress → app). Match on the key the data carries (URL, not title). A repair is a flag, not a rule that always wins. Inserting a check into a block can split it; the unit suite has no browser.
- **Where the listing labels a thing, filter on the listing** rather than opening every page.
- **When a tool is swapped, the route must not change with it.** A better source is not a complete one; open a candidate before filing it; go to an address you can build rather than tuning searches. Change one thing at a time.
- **Scraper mechanics:** never `networkidle`; wrap `route.fulfill`/`abort`; a 404 is not a loaded page; retry a detail page once. `normalizeUrl` lowercases scheme and host only; resolve hrefs, never join by hand; keep every link to an address. Dates: never build strings by hand; every month spelling (`Sept.`, Italian `set`); normalise dashes; the year can sit on the closing side only. Listings: read every page and stop at the lookback floor; a load-more click must not follow its href. Titles: noise stripping is case-exact; never strip a location that tells two shows apart. `resolveChromium()` needs both halves. A blanket find-and-replace can eat definitions you just added.
- **A container dry run with `--home` keeps the network bridge on.** Stub every venue it names.
- **One owner per fact.** Two steps looking for the same thing contradict each other on the card (Canaletto): one step finds it, code decides it, one sentence says it.
- **An excerpt is what matches the query, not the page.** Short excerpts are not an empty page; judge emptiness on the whole page (Watteau).
- **Subagents:** send only the rows and fields the question needs. Wording is not a control — remove the tool or check the answer.
- **A general rule ships only if no page gets worse.** Try it against every live page in hand, old reader beside new; a rule that fixes ten and breaks one is a venue rule, not a general one.
- **Capability on one machine is not on both** (pacing was laptop-only), and "the shared path is built" is not "every venue is ready" — say it per venue.

### 4.2 Rejected — do not re-propose

**Proposing "drop the feature" as a fix — rejected as an approach entirely.**

- **Announcing "this row used to have a catalogue"** when a later lookup finds
  none anywhere.
- **Storage and saving:** the sweep log inside her export. Google Drive auto-load
  on open. Automatic saving to Drive (a button is on the table, §6). The app
  gathering its own exhibition data. Auto-save to her FILE on every change (the
  cloud ledger's live save is a different thing, `docs/cloud_storage.md`). A confirm-tap after
  download. A backup in the browser's own storage. A snapshot on closing the page.
- **The intake:** bulk-approve. In-app field editing. Confirm-and-continue past
  undecided cards. Remembering rejections. Ticking nothing on a date conflict.
- **Data:** Excel as the sweep format. Merging the two Tates. Stripping the 110
  seed. The separate readout doc.
- **Process:** watching the sweeper and interrupting it. Firing a new JSX
  mid-discussion. A "GPT scrapes, Claude compresses" role split.
- **Catalogue lookup:** splitting it from drawer output. (A map of publisher
  websites is no longer rejected — her roadmap, §6.) A background shop check on every click. Linking straight to an
  Amazon product page from an ISBN-10. Pointing the shop link at an ISBN search.
  **Asking a Shopify shop directly whether a book is for sale**:
  `.js` refused, `.oembed` 429, a product's `.json` has no availability; the
  search answer's `available` counts pre-orders and omits the sold-out Tarot.
  **Reading the exhibition's own page for a catalogue when the shop is blocked**
  — a model read and a new step for two shops (KHM, MAM); the card already links
  the shop's search.
- **Scraper:** blocking scripts and trackers in the bridge (IR-13). Splitting the
  scraper into modules (IR-14). **Fetching several pages at once within one
  venue (IR-15) — never.** Dropping an undated row because its start date is old
  (IR-18). A default wait on top of robots.txt in the container.
- **Blocked venues:** **sweeping in her everyday Chrome on her own profile**
  — Chrome refuses a program attaching to its main profile, her personal
  browsing stays out of this, and the Morgan checks her own browser every visit
  while the seeded profile is not checked. **Fetching a blocked venue through the
  Parallel connector** — no more new methods to chase a venue.
  **Splitting one venue across days, or a slower pace**.

**Corrected along the way:** Chat can **not** fetch any URL cold. The Italian
venues are four different situations. The AbeBooks link is
`/servlet/SearchResults?ds=30&dym=on&kn=…&rollup=on&sortby=17` (lowest total
price, her decision).

---

## 5. The app

### 5.1 The app itself

> ### https://claude.ai/artifact/E2WjpRgr4W5eSzYtxyfrt5
>
> **Republish to THAT url** or a new page is created and hers stops updating;
> from a session that did not publish it, pass it as `url`. It carries **four
> capabilities**, each load-bearing: `downloads` (Export), `mcp` (her **Parallel
> Search Key** connector, by name), `sample` (Claude reading what the connector found), `db`
> (the sweep log, quarantine and lookup log — they survive a Reset). A publish
> restating `capabilities` must restate all four; omitting it carries them
> forward. **Renaming the connector means restating them.**

**Live: 46.3 in her app**, with the cloud ledger (merged at 46). What each recent version changed is in
`docs/publishing.md`, "What is live now".

#### The mental model, load-bearing

**Her file is still the document; the page's store now keeps a live copy of it.** The app is
the *tool*, the ledger the *document*, like a word processor and a file. Opening the link gives
an empty page until she Loads (her decision); from then on every change is saved to the store as
well (`docs/cloud_storage.md`). She works in ONE tab on ONE device; a second copy is read only.

Losing or silently corrupting the ledger is the worst outcome the design guards
against; it holds every tracked exhibition plus her marks (watching / dismissed /
want-catalogue / acquired / catalogue details). **She keeps a real ledger** — changes touching it need the care of any user data.

**Three containers, decided by what the fact is:**

| | Lives in | Because |
|---|---|---|
| **The ledger** (her file) | her export, hers alone | Derivable from nothing. Rolls back with a backup, correctly |
| **The sweep log** | the page's own store | A FACT ABOUT THE WORLD — must not roll back. Any sweep file rebuilds it |
| **The quarantine** | the store AND her export | A fact about the world derivable from nothing — so both, with one merge rule |

**Do not propose moving any of the three** (the cloud ledger is her own
reopening, now live — `docs/cloud_storage.md`). Reasoning and the two rejected arguments: `docs/app.md` §4–5.

#### Ledger row shape

```
id, museumId, title, startDate, endDate, summary, exUrl, interested, watching,
acquiring, buyNext, looked, hasCatalogue, catalogueTitle, isbn13, publisher,
publisherUrl, publisherResult, shopUrl, shopState, shopChange, englishCheck, originalEdition, otherVenueBook, alsoVersion, addedAt, editedAt
```

Ledger backup is JSON; the sweep pro forma is CSV.

#### What is built and signed off — `docs/app.md`

The summary of every behaviour she has signed off (loading and saving, refreshing, the
all-cards-decided block and partial apply, quarantine, Buy next, sorting, the seed, titles and
more) is in `docs/app.md`, "What is built and signed off". **Read it before changing any app
behaviour she has signed off.**

#### Catalogue lookup — the route

**Design, rules and the case behind each: `docs/app.md` §1. Read it before changing the
lookup.** Five phases (`lookupCatalogue`): the venue's shop; complete the record;
which book (in code); the publisher's page, once; the row, once. Steps gather facts,
code decides each, `composeRow` writes the row once.

- **Every step after the first is conditional — do not make them unconditional, and do
  not flip to searching wide first.**
- **Search again means search again** (her decision): a whole fresh lookup from a blank
  card. The old "keep what's on the card" rule is gone; do not bring it back.
- **Which model — CLOSED, her decision.** The page asks the viewer's Claude through
  `sample` at `modelTier: default`. Do not re-open without a real misread.
- **Every reading runs on her allowance** (up to five searches and seven page opens);
  her keyed connector is "Parallel Search Key" (`docs/app.md` §1, "The connector's
  limits and cost").
- **Shop addresses** are printed from `MUSEUMS` by `node scraper/shop_addresses.js`.

### 5.2 Import csv

The only file the app ingests, with columns exactly in this order:

```
venue_code, title, start_date, end_date, summary, url, notes, swept_at
```

**Sweep lookback is 1 July 2024, permanently.** The rest of the import csv — what the lookback
means, the scraper must never de-duplicate, the notes column, `swept_at` — is in
`docs/import_csv.md`. **Read it before changing what the scraper writes or what the app reads.**

### 5.3 The scraper

#### Why it exists

Chat Claude's fetch tool **retrieves a page before its JavaScript runs**; museum
sites are shell-plus-database, so it sees an empty frame. Architectural — no
prompt fixes it. **A headless browser fixes it at the root.**

**Target output:** the pro forma CSV, **summary carrying the raw curatorial
text**. Compression turns that into her teaser. Keeping the raw text is what
makes fabrication structurally impossible.

#### Running the scraper — `docs/sweep_operation.md`

The commands, the files table, a run's directory, who sweeps what (container or her laptop),
the headed venues, pacing and kept pages, what each site's robots.txt asks, the network
bridge, and the monthly container routine are in `docs/sweep_operation.md`. **Read it before running a sweep or changing how one
runs.**

#### Adding a venue — `docs/scraper.md` §12

The intake, in order, is in `docs/scraper.md` §12, "Her rules for wiring a venue". **Read it
before wiring a new venue.**

#### Then hand her the file — `docs/sweep_operation.md`

When a sweep finishes, what to send her and how is in `docs/sweep_operation.md`. **Read it before
ending a sweep run.**

#### How it is organised

**One engine, one recipe per venue.** Universal logic in the engine — fetching,
counters, the URL guard, the lookback, structured-data-first, date parsing,
writing the CSV. Per venue in `VENUES` — which pages, which links are
exhibitions, where title and dates sit, what boilerplate to strip. **There is no
clever general rule for the second list; every attempt has cost us.** A venue
writes down only what differs. Each recipe option is documented where it is
defined in `sweep_prototype.js`.

**The 4-paragraph / 2,000-character description cut stays — her decision.**
Tested on a 3,360-character page: the cut and the full text gave the same teaser
in substance; raising it would send every long row back for a model review.

**Two recipe options carry a trap:** `notATitle` must be checked in the heading
branch too, and **`yearArchive` never writes the years down** —
`expandYearArchive()` derives them at run time, or a 2028 sweep is quietly
missing two years.

**Everything else — reading a listing, pagination and load-more, the date parser,
junk in summaries, failure handling, compression, the blocked venues — is in
`docs/scraper.md`.** Read the relevant section before changing that area.

### 5.4 Add by link

Design, decisions, the store, the shelf rule and the venue link rules: `docs/add_by_link.md`;
the live proof pages: `docs/link_proof_pages.json`.

**Status: stable** — signed off at 39.5 on her 10 links (all imported; the shop finder better;
catalogue lookups at Thyssen and Mauritshuis found the catalogue). **One weak spot: a link from a
venue the app has never seen needs a fix about half the time** — the exhibition info is not read
correctly off the page, the venue's shop is not found, and so on (Mia and Worcester both missed
and were fixed in code, proven live).

- **OPEN — a link venue is looked up exactly as the 28 are (shelf AND whole-shop search).**
  Detroit files a show's book in the show's own shop section. Her next lookups settle:
  O'Keeffe found at Detroit? Did Mauritshuis and the RA get a search?
- **Venue link rules live in the APP**, on the venue's `MUSEUMS` entry, never in the
  scraper (her decision); a rule both use (the date reader) stays in `dates.js`. Live
  proof of every link venue: `docs/link_proof_pages.json`.

- **Add by link** (39–39.5, her design; signed off on her 10 links): Import opens a small pop-up — CSV · Links, Cancel; **nothing added
  to the page itself**. Each link is read
  once by code (title, dates) and the model (prose, always English), then the
  same intake as a sweep; no lookback. New venues file under one "Occasional"
  chip (NG Washington, NG Scotland, Mia and Yale CBA have their own; the Ashmolean, a swept venue, files under Occasional — `underOcc`; chip and sort order is `VENUE_ORDER`, her decision); their shop sections confirmed on a screen after the review (39.2).
  **The date reader and summary rules are the scraper's own**, written into the
  JSX by `node build/sync_shared.js` — never edit between its SHARED markers.
  `docs/add_by_link.md`.

---

## 6. Future considerations

Ideas not yet built — none is open work, and none is proposed unless she raises it.

- **The ledger's size** — ~850 exhibitions, nearing 1,000; 2,000 possible. Discussed;
  findings and two parked items (a faster list; whether to clear old Cloud Saves) in
  `docs/scalability.md`. Nothing built until she says.
- **Parked — cards for dismissed exhibitions.** A sweep gives dismissed shows Fill
  and Change cards like any other, unmarked (the intake never reads `interested`).
  Her choice: if her next import brings a bothersome number, build "Dismissed" on
  those cards, grouped last in each venue — nothing skipped, nothing auto-applied.
- **Roadmap — a list of publishers and their websites** (her ask), so the card stops
  saying "Couldn't work out the publisher's own website" (Somogy, Hubert Robert).
  It replaces her decision to keep `PUBLISHER_SITES` short and never fill it ahead
  (§4.2); how the list is built is to be agreed with her first.
- **Google Drive backup by button** — on the table, never automatic; through a Google Drive
  connector (`docs/app.md`).
- **Library — purchase tracking and a Library tab** (`docs/library.md`): future consideration, never
  propose.
