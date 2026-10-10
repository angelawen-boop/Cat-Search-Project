# Cat Watch — project guide for Claude Code

**Repo:** `angelawen-boop/Cat-Search-Project`

She collects art-exhibition catalogues. They go out of print fast once a show
closes, then resale prices climb. **Cat Watch** tracks temporary exhibitions at 28
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

- **Plain English, ELI5.**
- **Be concise, then cut another 30%.**
- **Suppress most visible thinking.** Work quietly and surface only what needs her.
- **Destructive actions need a confirmed backup or an explicit yes.**
- **NEVER REPUBLISH THE APP WHILE SHE HAS IT OPEN.** Her ledger lives IN that
  page until she Exports, so a publish landing mid-review can take unsaved work
  with it.
- **Her report and output first, the guide after.** Send the report and
  anything for her review, then update this guide in a background job, so she
  never waits on guide updates.
- **Applying to the scraper and scraper-related work only — test
  conservatively.** Every page a sweep fetches counts towards the venue's rate
  limit. Use saved pages first, with no network. Never a blanket re-sweep.
- **For work not relating to the scraper and which uses Parallel's features —
  testing is always against the live internet, as it is at that time**: pages
  fetched live through Parallel. Do not test on saved pages and do not invent
  test pages. Parallel's text is not returned to the app and to Claude in the
  same format as browser-rendered pages. A feature keeps a list of where its
  tests live on the internet — addresses and the signed-off result for each —
  so any later change is re-checked by fetching that list live. Add by link's:
  `docs/link_proof_pages.json`, checked by `scraper/link_proof_check.js`.
- **Raise a past decision by its reason, never its date.** She keeps no log,
  and a date tells her nothing. Say it as: "Because of X, you decided Y. Would
  you like to reconsider? / If this changes your decision, we can do Z." Call
  it her decision or her judgement call — never a "ruling" or a "rule".
- **A question gets an answer first.** "Talk to me about X" means discuss;
  nothing is built until she says.
- **Respect UI simplicity and specific UI instructions.** Build what she named,
  nothing added. "Add a copy icon" = an icon, not an icon plus the word "Copy".
  "Copy this line for case X and Y" = the same line with only the words naming
  X and Y swapped, never a new, longer line.
- **A guess is labelled a guess.** Say what is proven, what is not, and what one
  request would settle.
- **Parallel:** a session's own calls use the free "Parallel Search". Her keyed
  "Parallel Search Key" needs her yes — ask up front, with the reason, when the
  work will clearly need it. Once she has said yes, switch to the key as soon as
  the free tier refuses; never sit waiting for it to reopen. Later in the same
  session, after time has passed, try the free tier again first. A sub-agent
  cannot spend the key (permissions block it), so the main session does keyed
  fetches; a large reply is saved to a file — extract it by script, never retype.
- **`/orchestrate` runs only when she types it** (her decision). No session
  routes work through it, or follows its steps, unless she has typed
  `/orchestrate` in that session.
- ISBN-13 is always displayed `xxx-xxxxxxxxxx` (3 digits, hyphen, 10 digits).

### Put it in code — her decision

**Hard code beats a Claude Code session, and a session beats Chat Claude.** Push
every job as far up that order as it goes. The test:

> **Does the task have exactly one correct answer, derivable from the inputs?**

- **One correct answer → code.** Merging files, choosing which venues still need
  running, validating a date, resolving a link, rebuilding a lost cache. Never
  prose rules a session re-derives — that is how a CSV gets mangled, invisibly.
- **Many acceptable answers, or judgement about the outside world → a model.**
  Compressing curatorial prose into a six-word teaser.
- **Even then, a model touches strings, never files.** A script owns the CSV and
  asks for a value; the model never sees a comma or a column.

Chat Claude has no project context and cannot read this guide. Last resort.

### Editing this guide — and the side docs

Loaded in full at the start of every session, so every line costs something every
time. It once grew to 2,905 lines, mostly run-by-run stories. The rules:

- **Record the conclusion, not the journey.** Results, decisions and the lesson —
  never the order things happened in. When a finding is overturned, replace the
  passage; git is the archive.
- **Only OPEN work carries its backstory** — enough for the next session to pick
  it up cold. When the item closes, cut it to its result.
- **No dates on decisions.** Write "her decision" or "her judgement call",
  never a date. A date stays only where an open item's story needs the
  sequence (what happened, then what was decided a week later), names a run,
  or is a deadline.
- **Moving text to `docs/` is not a way to keep it.** Compress it first, in
  place, then move it. A side doc holds evidence a future session will need,
  never a transcript.
- **Every file has a line budget** — `node scraper/doc_budget.js` (her decision;
  runs at the end of `npm test`). Over budget warns and never fails a
  test: the clean-up is a separate session, away from active work — never the
  session that tripped it, mid-task. Raising a budget is her call.
- **The clean-up is the "Guide review" routine** — a fresh session on the 15th
  and 30th (28th in February — a second routine), 7:50am Sydney, push to her; it follows
  `.claude/skills/guide-review/SKILL.md` (fix what has one answer, ask her
  about her decisions and anything untraceable). She can also ask for it any time.
- **Anything derivable from the repo is printed by a script, not typed here**
  (`scraper/venue_status.js` replaced the venue table).
- **Put the trigger next to the code, not in an index here.** A comment above the
  date parser saying "read `docs/scraper.md` first" fires because the session is
  already looking at that line.
- **Never duplicate a code comment into this guide.** One copy drifts, silently.
- **Never use `@path` imports here** — Claude Code loads those eagerly.

### Code comments and decision history

Long dated comments ("her ruling, 22 Sep…", "WHAT BROKE…", "DO NOT PUT IT
BACK…") make the code read as a case history, not steps to follow. These rules
hold on every branch, `claude/ledger-cloud` included.

**A comment may say only:**
- What the block does, and any rule the code does not show. Present tense, a few lines.
- A pointer to the decision behind a rule — the case and where the reasoning lives:
  `// Sold out outranks "Add to cart" (Morgan Tarot; docs/app.md).`
- A one-line warning where undoing it would bring back a known bug:
  `// Lowercase scheme and host only: folding the path merged two exhibitions (docs/scraper.md).`
- A short section label a test uses as an anchor (below).

**Never:** how a problem was found, what was tried, or why an earlier version
was wrong; her quotes or paragraphs of her reasoning; headings such as WHAT
BROKE, WHY or HER RULING; anything over about five lines; code that is gone
("this used to…") — git keeps it.

**Where the history goes:** app decisions in `docs/app.md`, scraper decisions
in `docs/scraper.md`, in the section for that code. Each as its conclusion: the
rule, one sentence on why, the case, the functions it touches. One
entry per decision — update an existing one, never add a second. Within budget
and compressed first (above); the narrative stays in git.

**Protect her decisions with tests, not prose.** When she decides how something
behaves, add or update a fixture that fails if it is undone, named after the
case ("Morgan Tarot: sold out beats Add to cart"). A comment can be overlooked;
a failing test cannot.

**Test anchors.** The harness finds its place in the JSX by comment text
(`// URGENCY COLOURS, ONE SET PER THEME`, `// WHAT A QUARANTINE REMEMBERS.`; §4
"Tests"). Before removing or rewording a comment, grep `scraper/fixtures/` for
it. Keep an anchor as a short label, or move the test to a new anchor in the
same change — never leave a test pointing at nothing.

**When editing code:** update the comment already there rather than adding one
beside it; delete any comment the code no longer matches; a long history
comment on a function you change moves to the docs, compressed, in the same
change. Leave comments elsewhere alone unless the task is a tidy-up. Behaviour
changes and tidy-ups go in separate commits, so a tidy-up can never hide a
change in behaviour.

**Exceptions:** the numbering rule beside `APP_VERSION` stays, as short as
possible. The SHARED block's comments come from the scraper (`dates.js`,
`compress_prompt.md`, `compress.js`, `sweep_prototype.js`'s `VENUES`): apply
these rules there, run `node build/sync_shared.js`, then the full `npm test`.
Never edit the block directly (§4).

### Branching

**`main` is the trunk and the source of truth for app, scraper and this guide.**
Work there. `.claude/hooks/session-start.sh` switches a web session's
auto-assigned branch to `main` before work begins; it refuses if the tree is
dirty or the branch carries unmerged commits, and it fetches first.

Branches separate in-progress work from known-good work, never components.

| Branch | What it is |
|---|---|
| `claude/ledger-cloud` | **Live trial — §7.1.** Merged to `main` only on her call |
| `parked` | Work held for another session (below). Deleted once on `main`. **Holds the unfinished Vasari English-edition fix (§7.4)** |
| `claude/jsx-stitched-intake`, `claude/blissful-volta-jxj5c0` | Merged into `main`; kept as history |
| `claude/quiet-user-agent` | Parked, her decision — do not merge or re-open |
| `claude/personal-tracking-ledgers-z49s2h` | Dead — do not merge |
| `claude/blissful-knuth-snbqci`, `claude/design-questions-87gj6w`, `claude/headless-chromium-claude-code-wl94l0` | Dead — early 7–10 Sep work from before `main` was the trunk (no shared history with it); superseded, do not merge. Kept on GitHub, her decision — never raise deleting them |
| `claude/met-connection-experiments` | Abandoned — do not merge |
| `claude/playwright-scraper-prototype-z68iko` | Abandoned — merging it would undo the current scraper |

**Holding a push for another session — her decision.** When she says a
session must wait for another:
- **The waiting session** commits locally, pushes nothing and does not ask about
  it. It waits for a message from the named session (cross-session
  `send_message`), then pulls `main`, merges, runs `npm test` and pushes to `main`.
- **The finishing session**, once its work is on `main`, messages the waiting
  session by the title she gave (`list_sessions` finds it) that it may push.
- Unpushed work is lost if an idle container is reclaimed. Only if that is a
  real worry: push to `parked` — that branch, never a new one; delete it once
  the work is on `main`.

---

## 2. Where things stand

### Run the script, do not read a table

```
node scraper/venue_status.js
```

Per venue: rows from the last run that brought any, the last run that held the
venue at all, which machine sweeps it, and — read from the marker rows — why the
last attempt brought nothing. When the two runs differ, that venue has stopped
answering. **Every venue has returned rows at least once** — except `cincinnati`, never swept.

**Access and pace — settled for the four Cloudflare venues.** A blank browser
profile is refused; a visible Chrome on a profile she has browsed in gets in
(`probe_headed.js`). Firing pages back to back gets challenged, and the
judgement follows to the next Cloudflare venue. Paced sweeps from her laptop in
mode B have been clean at all four (§5). Evidence: `docs/venues.md`,
"The headed venues".

### What the script cannot derive — her decisions, per venue

Judgement about the outside world is not in any file. Her counts are always what
should reach the app.

| Venue | Her decision |
|---|---|
| `va` | Displays excluded — **this venue only** |
| `wallace` | Displays and trails KEPT — **this venue only** |
| `menil` | 7 permanent galleries excluded; "Foyer Installation: …", "… from the Collection", "Recent Acquisitions" excluded — **this venue only** |
| `tate-modern`, `tate-britain` | Exhibitions only, never collection displays. The "recently opened" page is not an archive and is not fetched |
| `tate-britain` | Ofili excluded, on the venue's own ONGOING label. Turner Prize and the Tate Britain Commission excluded. Past exhibitions from the What's On calendar, 1 Jul 2024 to the day of the run — `expandDateRange`. A session nested under a show is not a show |
| `tate-modern` | **Never its past exhibitions**, though she knows where they are |
| `uffizi` | Headlines kept as titles; undated rows kept |
| `artic` | Only `EXHIBITION` and `TICKETED EXHIBITION` — `docs/scraper.md` §13. Bare "from the Collection" and "Film Series" titles excluded; family, named and lent collections KEPT. No note on the card for films or installations; no model judging rows |
| `met` | Recurring series (P.S. Art, Scholastic, crèche, Burdick baseball cards) and every commission series excluded. **Nothing excluded for coming from a collection, a gift or acquisitions** — they can be major |
| `moma` | **Current and upcoming only** — never its past. **Exhibitions only**: the listing's "Installations and projects" section is dropped on the listing, never opened (MM-001–003). Her count: 9 + 5 = 14 |
| `brit` | Current/upcoming asks for **Exhibition AND Experience** — the Bayeux Tapestry is filed as an Experience (BM-012); only `/exhibitions/` pages kept. Past read in the listing's year sections only (a heading is the year a show OPENED); nothing under 2023 opened (BM-013–015). Her count: current + upcoming 5 (*Multiplied wonders* newly listed), past 2026 **9**, 2025 **12**, 2024 **10** (*Legion*, closed 23 Jun 2024, out) — **34 rows**, because *Admonitions* is listed under every year at one address and is one row |
| `mam` | Collection displays excluded — "Permanent collection" subtitle and "New acquisitions…"; also the Prix Marcel Duchamp and Oliver Beer's films. Her count: 3 current, 0 upcoming, 13 past |
| `mad` | Nothing excluded. Her count: 2 current, 2 upcoming, 16 past. Musée Nissim de Camondo ignored — closed until 2030 |
| `jacquemart` | Exhibitions only — the card's own tag; operas, costume balls and other events refused |
| `orsay` | **Displays always kept**, "Focus on our collections" included — its collection is deep, like the Met's. **Every off-site show kept.** "Exceptional presentation" kept for now. Parcours, Immersive experience, Invitation dropped; an unseen tag is kept and named. Her count: 13 + 45 = 58 |
| `lgd` | New York and London only — Hong Kong partnership shows ("& Wei, Hong Kong") and "LGD Hammer" auctions excluded. One exception to the lookback: *Yves Klein and the Tangible World*, its catalogue only just published — `keepDespiteLookback`, that one address |
| `morgan` | *Collections Spotlight* excluded — a standing rotation, not a show. Past blurbs read off the listing, pages not opened — **unless the listing gives no description; then the page is opened**. A picture caption (`p.small`) is not a description. Her count: current 3, upcoming 5; past 2025-26 **20**, 2024-25 **3**, 2023-24 **8** — 39 |
| `rijks` | 37 rows, not chased further. *Asian Pavilion* was pulled by the venue |
| `capo` | **Not count-verified and never will be** — see below |
| `brera`, `borghese` | Their single extra row is a marker for a genuinely empty upcoming page |
| `ashmolean` | **Everything kept** — major, free and displays, past included. Her count: current 0 major + 4 free, upcoming 2 + 1, past 4 + 13. **Titles: the full name from the show's page header, ordinary capitals written by code** — the venue types capitals everywhere (`capsTitles`, `titleFromCaps`, `pageTitle`) |
| `cincinnati` | Nothing excluded. Her count: current 2, upcoming 2, past 2026 **4**, 2025 **14**, 2024 **9** — 31. Pages saved by the container, her yes for this venue only. **Never swept yet** |

**Whether displays count is HERS, and varies by venue.** Two venues disagreeing
is the expected state, not a contradiction.

**Capodimonte is closed differently.** Italian only, so checking a row against
the site is uselessly slow. Her decision: import every row unless visibly
mangled, then use the app's URL button and let Chrome translate. So **the `url`
column is the load-bearing field there**, and **the summary must arrive in
English**. `docs/scraper.md` §15.

**All 28 have a recipe**, blocked ones included: a refusal costs half a second,
leaves marker rows on the approval pile, and turns every sweep into a standing
monitor. **Blocks are not permanent facts** — venues have gone down and come
back within days.

**The original venues were reviewed by her against the live site and re-swept**
— `docs/review-2026-09-12.md`. Read it before touching a venue listed
there. The nine venues added since were checked against her counts at intake.

No row carries a credit line, star rating, ticket price, funder list, opening
hours, breadcrumb or cookie notice. Empty summaries: three Rijksmuseum rows whose
pages return 404, plus occasional page timeouts — which say so on the row.

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
- **One exception: a year with no day.** "Summer 2022", "March / 2026": take the
  **latest possible day of that year** as an upper bound and drop if even that is
  before the floor. Lookback test only — **nothing is written into the date
  columns.**

### The scraper must never de-duplicate

**It records everything it finds and makes no judgement about duplicates, ever.**
Whether two rows are the same exhibition is decided in the app, where she sees
each proposal. Title-based de-duplication once turned **32 National Gallery
exhibitions into 3.**

**The one permitted exception: never read the same address twice.** Same URL =
same exhibition, no interpretation. Nothing cleverer qualifies.

- Compare the **finished address**, not the raw href (`normalizeUrl()`).
- The guard spans a **whole venue**, not one page.
- **Only scheme and host are lowercased.** Paths are case-sensitive; folding them
  merged two exhibitions differing only in capitalisation.

A link resolving to **another host** is refused and counted in its own `offsite`
column. Every listing page a row is seen on is recorded once and written as
"Found on … Also listed on …" (`listing_note.js`) — her only trace of where a
row came from. A venue's `within` scopes this to the listing, so a menu or promo
card on every page cannot make it lie.

### The notes column is written for her, not for a log

Whatever lands in `notes` is shown **verbatim on the approval card**.

- **Short.** State the fact and stop. **No advice, no instructions.**
- **Say WHY, not WHAT.** The app already reports empty fields.

Good: `No closing date found anywhere on the venue's pages.`
Bad: `NO_END_DATE: kept, lookback unverified`

**A note that quotes the page quotes its MATCH, never its INPUT.** Capodimonte
rows once carried whole pages in `notes` (one at 17,734 characters) because
`findDateRange` returned its input as `raw`. Every branch now quotes its own
match, capped (`frag()`); Q-100 to Q-102. A length cap alone would not have
caught it — a capped whole page is still the wrong thing.

### swept_at — the eighth column

**Per ROW** — a stitch mixes two machines and routinely two runs of one venue.
**Stamped when the venue FINISHES**, in `writeVenueCsv` — a run can spread
across hours. **UTC** (run folder names are Sydney, for sorting by a human).

It drives the app's freshness drawer: **last TRIED** is the latest stamp for the
venue, **last BROUGHT ROWS** the latest among its real rows. The gap says re-run
this one alone. `stitch` and `compress` carry it untouched.

---

## 4. The app

> ### https://claude.ai/artifact/E2WjpRgr4W5eSzYtxyfrt5
>
> **Republish to THAT url** or a new page is created and hers stops updating;
> from a session that did not publish it, pass it as `url`. It carries **four
> capabilities**, each load-bearing: `downloads` (Export), `mcp` (her **Parallel
> Search Key** connector, by name), `sample` (Claude reading what the connector found), `db`
> (the sweep log, quarantine and lookup log — they survive a Reset). A publish
> restating `capabilities` must restate all four; omitting it carries them
> forward. **Renaming the connector means restating them.**

**Live: 42.6 · cloud 5 on the test page**; her main app shows 39.2, its code on `main` current. **Only the cloud test page is published** (her decision): `main`'s code
keeps up with it, merged, so her main app never falls behind — it is not
republished each time. Reset to Seed always asks; the counts line is Watched · Wanted · Owned ·
Closing Window (Yes-wanted catalogues closed 3–12 months ago,
`inClosingWindow`), Tracked and Dismissed inside "Details"; footer "Reset to
Seed" and "Reset cards" (clears one card's lookup). Older numbers are in git.

- **The number lives in `APP_VERSION`; the footer prints it with the date.**
  Bump it in the same breath as the change.
- **Her numbering:** whole number for a substantial change (adding venues is
  one), decimal for a small one. **One number per PUBLISH**, never per build.
  Bump it only when a publish is under way — never turn by turn while one
  issue is still being worked on (her ask).
- The file is `Cat_Watch.jsx` — no version number in the name, ever.

**Building is code's job — `node build/build_app.js`**: transpiles, wraps it in
the committed shell (`build/shell_head.html`, `build/shell_tail.html`), proves it
parses, writes `build/dist/index.html`. `--shell-from <saved live page>` says
whether the committed shell still matches.

**Publishing cannot be automated and the order matters.** The service refuses a
publish from a session that has not read the live version in full, and then
refuses the same bytes resent. So: **read the URL (the service then counts it
as viewed), build, diff the saved live file against the build in code, publish.**
Never page the 6,700 lines into context — it filled whole sessions. `build_app.js` prints the steps.

### The mental model, load-bearing

**On `main`, her data is NOT hosted — the page is.** The app is the *tool*, the
ledger is the *document*, like a word processor and a file. Opening the link
gives an empty portal. *(The cloud-ledger trial, §7.1, changes this on its
branch only.)*

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
reopening, §7.1). Reasoning and the two rejected arguments: `docs/app.md` §4–5.

### Ledger row shape

```
id, museumId, title, startDate, endDate, summary, exUrl, interested, watching,
acquiring, buyNext, looked, hasCatalogue, catalogueTitle, isbn13, publisher,
publisherUrl, publisherResult, shopUrl, shopState, shopChange, englishCheck, originalEdition, addedAt, editedAt
```

Ledger backup is JSON; the sweep pro forma is CSV.

**JSX validation:** `tsc check.tsx --jsx preserve --noEmit --skipLibCheck
--allowJs --target esnext`, filtering for `error TS1[0-9]{3}[^0-9]`.

### What is built and signed off

Confirmed by her on real files, not only by fixtures. **Design and evidence:
`docs/app.md`.**

- **Loading and saving.** Open → empty portal; Import → pick file. **Export IS
  Save.** Two save routes, differing in what is KNOWN — the runtime's file
  handoff resolves or throws; a plain browser download cannot tell finished from
  cancelled, so it does not clear the unsaved warning. **Never put back a
  click-triggered green tick** — it once read "Saved — safe to close" while
  nothing was written.
- **Refreshing.** A sweep CSV goes in via Import Refresh; the app compares it
  against the ledger with no internet access and shows proposals as cards grouped
  by venue: Add / Fill / Change / Couldn't be filed. Bad data is always surfaced,
  never dropped.
- **Reading a stitched file.** Four bands for the odd cases; duplicate rows fold
  on venue + URL and nothing else; rows with no URL never fold; marker rows
  become a coverage panel, never proposals.
- **The ledger will not move until every card is decided** — a hard block.
  Rejecting counts as deciding. **Permanent design.** Beside it sits the
  **partial-apply button** (applies only the cards decided so far, asks first,
  says what it leaves behind) — **stays until she says, her decision:** she
  imports new venues in batches of 50–100 cards and needs to work them in
  sittings. The way back is re-importing the same file; rejections do not
  survive the round trip, which she accepted. It is not confirm-and-continue
  (§8). To remove it one day: the marked block in `Cat_Watch.jsx`, `partial` on
  `applyRefresh`, `offerPartialApply` and its harness export, fixture 18h.
- **Counts that reconcile.** One line accounts for every row read, two sentences
  each ending in the number the next starts from. **Every term stays.**
- **Quarantine ("never add this")**, keyed on normalised URL. Latest decision
  wins, which needs tombstones — a release is RECORDED, not merely absent.
- **Reject and quarantine are different jobs.** Quarantine: never show me this
  again. Reject: *this entry is wrong* — fix it at the source. **A rejected card
  coming back is correct.** Never propose remembering rejections.
- **Buy next** (her design): on a Yes card, a dot left of the star, drawn
  to the star's measured size (`starInk`) — hollow off, red on. Leaving Yes clears
  it. Acquiring row ends Has catalogue · No catalogue · Buy next. **No count
  anywhere.** Closing the search bar or Reset cards empties its box.
- **Per-venue freshness**, two dates, from `swept_at`.
- **Add by link** (39–39.5, her design; signed off on her 10 links): Import opens a small pop-up — CSV · Links, Cancel; **nothing added
  to the page itself**. Each link is read
  once by code (title, dates) and the model (prose, always English), then the
  same intake as a sweep; no lookback. New venues file under one "Occasional"
  chip (NGA has its own, her decision); their shop sections confirmed on a screen after the review (39.2).
  **The date reader and summary rules are the scraper's own**, written into the
  JSX by `node build/sync_shared.js` — never edit between its SHARED markers.
  `docs/picked_shows.md`.
- **The confirm box is the TOP layer** (`zIndex` 1200), above the refresh review
  at 1100. **Any new overlay goes BELOW 1200.** Fixture 18i.
- **Dark mode**, every colour named; the shell paints a ground before React runs.
- **Sorting, timestamps and dividers** — the only way to tell this import from
  earlier ones from the seed. **Do NOT "simplify" it.**
- **Seed set**, ~110 exhibitions read before the scraper existed, met / ng / rijks / acq only.
  Thin on history at met and rijks by design of the tool that read it. **Nothing
  to fix; do not re-diagnose this as a matching failure.**
- **Titles.** A changed title is a Change card — a rename or only capitals.
  Nothing masked; the scraper records the venue's own letters (`restoreCase`).
  **A changed description is a Change card too** (`consider`), so descriptions
  must be stable from sweep to sweep.
- **Italian titles** (`capo`, `brera`, `uffizi`): title stays the museum's own
  (the lookup searches by it); an English translation opens the description —
  `In English: "…". Sixteen works…`. The model returns plain strings; code
  writes the line (`composeSummary`). `compress_prompt.md`, "Italian titles".

**Deliberately not built:** bulk-approve, in-app field editing, and the mirror
case where the app proposes Add but it is really an update.

### Catalogue lookup — the route

Five phases (`lookupCatalogue`; `docs/app.md` §1): steps gather facts, code decides
each, `composeRow` writes the row once — one owner per sentence on the card.
1. **The venue's shop** (shelf and search box, one call; **the book's own product
   page**, never a list) — found there = in the shop. Nothing there → the web.
2. **Complete it:** the book's page; one facts round (facts search, plus an edition
   search at non-English venues, together; ONE read); two results opened.
3. **Which book**, in code (`englishEditionOf`). 4. **The publisher's page**, once,
   for the final book: find their site, search inside it, **open what it returns**.
5. **The row.**

**Every step after the first is conditional — do not make them unconditional,
and do not flip to searching wide first.**

**The rules, each of which replaced a real failure:**

- **`web_fetch` for a page whose address we have or can work out; `web_search`
  only for the three real searches** — does this book exist, where is its ISBN,
  where does this publisher live.
- **Never choose a page from a general index and build on it**, and **open a
  candidate before believing it** — a search cannot tell a book from a shelf.
  Two candidates, then the fallback.
- **Go to the publisher, do not search for them.** Their site read off results
  already found, else one search for the name; the domain read off mechanically
  (books, press, publishing, editions, university dropped); candidates ranked in code.
  Name finds no site → her short list (`PUBLISHER_SITES`), grown only on her ask.
- **Every outcome says which negative it is** (`publisherResult`,
  `publisherNote`); **a step that died is not an answer** — later steps carry
  why it came back empty.
- **Only the publisher is the publisher** (her decision, Millet): a link a
  read hands over is filed only on the publisher's own site (`publisherLinkOf`);
  a distributor's page never. Self-published → no link at all.
- **Another venue's catalogue is not this show's** (her decision): a book
  found on the web is filed only when the read says it is the catalogue of the
  show AT THIS VENUE (`thisVenue`); a show that travels here "in modified form"
  does not count. The shop step needs no such answer. A blank publisher with the
  ISBN known runs the wider search too.
- **The title as printed, and English first at non-English venues** (her
  decision): a shop title is kept only as far as the pages print it
  (`titleAsPrinted`). At a venue marked `english:false` the facts round reads the
  book's language and own title; the edition search runs beside it, aimed at
  library records ("originally published in French as …"), plus the show's
  English title with the publisher when that is known. An English edition proved
  → filed as "Not in the museum shop", the original in `originalEdition`; none →
  the book stays under its own title. **"Checked publisher's site" only when its
  page was read** — once, the page the card links, listing its editions (Watteau,
  Canaletto); `englishCheck`, `englishLine`; the line never repeats the publisher
  printed above it (her decision). Its publisher is read off its ISBN.
  At those venues the web search adds one query in the venue's language
  (`localCatalogueQuery`; Hammershøi, listed only in French).
- **"X in association with Y" — Y is the publisher** (her decision):
  the publisher step and the self-publisher check use Y (`publisherToFind`);
  the card prints the line as given. **A co-edition, "X / Venue", "X and
  Venue", "X with Venue": X is the publisher**, for every publisher verdict
  (her decision, Turner).
- **The publisher is read off the ISBN, in code** (her decision —
  Botticelli gave three publishers in three lookups): once the ISBN is known,
  the labelled publisher in the results carrying it, two agreeing
  (`publisherOnIsbnResults`), outranks the book's own page, which outranks any
  read of general results (a guess, wherever read). The facts round runs always
  at a non-English venue; elsewhere only for a missing ISBN or a missing or
  guessed publisher.
- **An English edition must be the same catalogue** (her Botticelli case): a
  result carrying its ISBN shows the same publisher or names the venue
  (`sameCatalogue`), carries the original's ISBN, or links it to the original's
  title ("originally published as…"). Reaktion's monograph is refused (ED-004).
- **A museum's own imprint is skipped**, no line on the card (her decision):
  a publisher carrying the **venue's full name** as whole words is the venue
  (`isSelfPublisher`), plus her list `SELF_PUBLISHERS`; her `NOT_SELF_PUBLISHERS`
  overrides both. On trial: too many misfires → back to her list alone.
- **Search again means search again** (her decision): a whole fresh
  lookup from a blank card (`lookupCat` → `resetCard`), nothing kept or
  skipped. Finished → it replaces the card's catalogue details. Any step
  failed → the card is untouched and says "Search again didn't finish". The
  old "keep what's on the card" rule is gone; do not bring it back. Within one
  lookup, each step fills what earlier steps left blank.
- **An ISBN enters only through `toIsbn13`**: check digit verified (a 10 converted),
  and printed in text the app fetched. `cleanIsbn` shows ledger values as stored.
- **"Re-check museum shop" checks the shop alone** (her design; untouched by Search again's change).
  With a link on file it re-reads that page (gone → "No longer", link kept as
  "Museum shop (last seen)"; buyable again → "Back"); with none it runs the shop
  step alone ("Now"; a book already in the shop stays "In the museum shop",
  "Re-checked: still in the museum shop."). A failed check changes nothing.
  `docs/app.md`, "A book leaving the shop".
- **A blocked shop says so** — `shopState: "blocked"`, her wording: *"The
  museum shop is blocked - search it manually. The catalogue is stocked
  elsewhere."* / *"The museum shop is blocked. The catalogue also does not
  appear to exist elsewhere. Search manually to confirm."* Headline red and
  bold, the rest grey. Blocked today: KHM, MAM. **A shop whose every page comes
  back empty is blocked too** (her decision) — MoMA's shelf is drawn by
  script and its search and `products.json` answer 403. Judged on the WHOLE page, opened
  again when the excerpts are short; no price anywhere = empty (Watteau).
- **The Museum shop link searches the shop for the EXHIBITION's title** when
  no book page is on file (`buyLinks`) — resellers keep the book's title, the
  shop keeps the show's. A search or shelf page is never filed as the book's
  page (`listedOnly`). KHM opening its search is the design working.
- **The line under a book not in the shop** reads "Not in the museum shop —
  shop link opens the general store." for every venue with a shop (her decision;
  no per-venue wording). **A venue with no shop**
  (`borghese`, `capo`, `dellav`) reads only "Venue has no shop.", grey, with
  no shop link and no Re-check button; its lookup goes straight to the web.
- **Booko AU** (last buy link) is `booko.au/<isbn>`; with no ISBN, its title
  search. Her verdict: works well on the ISBN, which the lookup now finds
  far more often; the messier title-search results are accepted.
- **A ticket is never a catalogue** (`isTicketLink`).
- **A shop link from the web search is opened before it is filed as in the
  shop** (`confirmShopLink`).
- **A book's link on a shelf is read in code** (`bookLinkOnShelf`): the one link
  on the shop whose words carry the whole catalogue title; two, or none, and
  nothing.
- **One page is read whole** (`fetchPage` `{full:true}`, her decision): the
  book's page (at an `english:false` venue, in the facts round's read), Re-check's
  page, the publisher's candidates. The shelf stays
  excerpts (a call is capped ~25,000 characters). **The ISBN is read in code
  first** (`isbnOnPage`): exactly one 978/979 number labelled ISBN or EAN, check
  digit valid; Claude's only when code finds none. **"Sold by …" is the shop, never
  the publisher.** Hidden-until-clicked text is not in Parallel's copy.
- **The web ISBN search reads its results in code too** (`isbnInResults`): only
  results carrying the whole book title count; labelled numbers and valid
  978/979 numbers in their addresses; exactly one. None → the two results about
  the book are opened whole. Queries name the venue.

**The cost:** up to five searches and seven page opens. **Every reading runs on
her allowance.** The keyless tier refuses after roughly a dozen quick searches
(observed; unpublished). A failed search shows one line on the card, Re-check's
words with "Search"/"Search again" (her decision; no red banner). **Per
`mcp.d.ts`: `rate_limited` is never returned; `upstream_error` is the catch-all
and Parallel's words never reach the page** — so its free-tier refusal is most
likely "Search failed (upstream_error)" in the app (not proven).

**Her keyed connector since 36: "Parallel Search Key"** — custom, at
`https://search.parallel.ai/mcp-oauth`, No sign-in, her key in an **`x-api-key`**
header (`authorization: Bearer` never reached Parallel); billed to her Parallel
account ($20 credit for 60 days, $5 a month, auto-reload off). The built-in
keyless "Parallel Search" cannot be removed; a second connector at `/mcp` is
refused. The key has been used for ~30–50 lookups with only brief connection
errors.

**Shop addresses:** all 18 original venues checked, `docs/app.md` §1;
`borghese`, `capo`, `dellav` have none. Newer venues: in `MUSEUMS`, a comment
each. `mad` has no search box — its publications shelf is read five pages deep
(`SHELF_DEPTH`).

**Which model — CLOSED, her decision.** The page asks the viewer's Claude
through `sample` at `modelTier: default`. Do not re-open without a real misread.

### Tests

**Test the half you changed — her decision.** A plumber does not test the
wiring.

- App work (`Cat_Watch.jsx`, `build/`) → `npm run test:app`.
- Scraper work (`scraper/`) → `npm run test:scraper`.
- `npm test` (both) only when a change touches both halves.

Where the halves meet — importing a scraper CSV, the shared date reader and
summary rules — those tests run in both halves already. A test failing in the
other half is reported in one line and left alone. **The exit code says
whether everything run passed.**

The suite list, and which half each belongs to, is `scraper/run_tests.js`,
never retyped here; a suite only a branch has goes in that branch's
`scraper/fixtures/branch_tests.txt` and runs with the app half
(`claude/ledger-cloud`: `cloud_ledger.js`, `cloud_app.js`, `cloud_two_copies.js`).
Each fixture file opens with what it proves; case IDs (AL-, C-, R-, KP-…) are
found by grep. Per-venue `*_pages.js` run a recipe on saved pages, no network,
against her counts, dates, titles and descriptions.

**OPEN — RB-016 and RB-020** (robots wait, scraper) fail under load: run ten at
once, RB-016 read 1148–1293ms against 1450 in 5 of 10, RB-020 over
1400ms in 2. Not investigated. A scraper session's job — not an app one's.

The harness lifts the intake out of the JSX by **anchors on prose, never line
numbers**. An early `return` in a fixture file exits the whole suite silently —
**await, never return.**

---

## 5. The scraper

### Why it exists

Chat Claude's fetch tool **retrieves a page before its JavaScript runs**; museum
sites are shell-plus-database, so it sees an empty frame. Architectural — no
prompt fixes it. **A headless browser fixes it at the root.**

**Target output:** the pro forma CSV, **summary carrying the raw curatorial
text**. Compression turns that into her teaser. Keeping the raw text is what
makes fabrication structurally impossible.

### Commands

```
node scraper/sweep_prototype.js              everything for this machine
node scraper/sweep_prototype.js ng rijks     named venues only
node scraper/sweep_prototype.js --continue   finish the newest run
node scraper/sweep_prototype.js --jobs=6     venues at once (default 4)
node scraper/sweep_prototype.js --budget-mins=3   abandon a venue after N min
node scraper/sweep_prototype.js --pace=30    her machine: seconds between pages (default 30)
node scraper/sweep_prototype.js --ignore-cooldown   her machine: ask a gatekeeper still in its quiet period
node scraper/sweep_prototype.js --reread     her machine: ignore pages kept from a cut-short attempt
node scraper/from_saved_pages.js <venue> <listing.mhtml> <page.mhtml> ...   rows from pages she saved, no network
node scraper/stitch.js <run> <run> ...       combine runs into one importable file
node scraper/compress.js <run>               plan, and write the subagent job files
node scraper/compress.js <run> --check       verify the answers before they land
node scraper/compress.js <run> --apply       write sweep_compressed.csv
node scraper/qc.js <run|stitch>              faulty rows + exceptions; exit 1 on a fault
node scraper/sweep_diff.js <run>             each venue vs its last run, by address, causes from the log (qc.js prints it for a run)
node scraper/sweep_log.js [--json]           rebuild the app's freshness dates
node scraper/venue_status.js                 what each venue currently yields
node scraper/robots.js [--report]            each site's robots.txt: its wait and off-limits paths
node scraper/reread_kept.js <run> <venue> [--write]   a recipe fix applied to the pages that run kept, no network
npm run test:scraper                         scraper tests (npm test: app and scraper)
```

### The files

| File | What it is |
|---|---|
| `sweep_prototype.js` | The real scraper. Playwright + Chromium |
| `dates.js` | THE date reader — the app gets it via `node build/sync_shared.js` (with compression's rules); `npm test` fails if they differ |
| `compress.js` / `compress_cli.js` | Raw text → the summary she reads |
| `qc.js` | Exceptions report **and the gate in front of her import file**. A faulty row (no title, no venue code) BLOCKS `--apply`; an exception warns and never acts |
| `sweep_log.js`, `venue_status.js` | Freshness drawer rebuilt from disk; §2's table |
| `reread_kept.js` | **A fault in a sweep's rows is fixed from the pages it kept, never by sweeping again** (her decision). Prints every changed field; `--write` corrects the run, `swept_at` kept |
| `from_saved_pages.js` | A venue's real recipe over `.mhtml` pages she saved, no network |
| `page_keep.js`, `robots.js` | Pages kept as read; each site's robots.txt |
| `probe_headed.js` | Opens the seeded Chrome (`open`); paced, stops at the first check that will not clear, saves each page it reads |
| `show_tags.js`, `probe_pagination.js`, `inspect_listing.js`, `probe_access.js`, `data_probe.js` | Read-only diagnostics. Only `data_probe.js` asks the real question (title, dates, text); `reach_probe.js` is reachability only |
| `probe_morgan.js`, `sweep_fetch.js` | Superseded — kept as the record, do not run or develop |

**`stitch.js` chooses NOTHING** — her design. It picks no winner, drops no marker
rows, notices no duplicates; order cannot change its result. A venue swept on
both machines arriving twice is the POINT: the app folds them where she sees it.

### A run is a directory, not a file

```
scraper/output/run_2026-09-10_183045/
    ng.csv  rijks.csv  acq.csv     one file per venue
    sweep.csv                      all of them
    log_<stamp>.txt                one per invocation
```

- **A venue file is written only once that venue finishes** — a dead run leaves
  no half venue. **Re-running a venue overwrites its own file.**
- **`--continue` needs no stored state**: what remains is which venues have no
  file yet.
- **`sweep.csv` is rebuilt from the venue files at the end of every run.**
- Timestamps are **Sydney time**, fixed to that zone.
- **Old runs are archived at start-up, never deleted.** Never moved: the newest
  10, anything holding a compressed CSV (compression's memory), any run with 16+
  venue files. **Requiring `sweep_prototype.js` runs this tidy** — commit the
  move, never undo it by hand.
- **Runs are committed, not gitignored.** The container is temporary.
- **Pushing a laptop run:** `git add scraper/output` (the whole folder — the tidy
  may have moved old runs), commit, `git pull --rebase`, push.

### Adding a venue — the intake, in this order (her decision)

**No show page is asked for before step 6.**

1. **Her count and her decisions** (§2 table).
2. **Pages SHE saves**: the listings, and one show page of EVERY address shape.
   **One complete list**, addresses copied from a record, never typed from
   memory. Any question about what a page says is answered by opening it, never
   by asking her. **Saved pages are a recipe's guide and its offline test, never
   the data. Page layout comes from HER, never from a probe.**
3. **What the site asks** — `node scraper/robots.js`. Anything needed that is
   off-limits goes to her.
4. **The recipe, offline**, on her pages: her count, dates, titles, and the
   descriptions READ.
5. **The time, worked out**: pages × the wait, written down.
6. **One sweep, when she says go**, with every question answered. It passes only
   if every page is read and her count holds. **A failure is diagnosed offline
   from its log** (reply labels, stall report, kept pages), never by sweeping
   again; the next attempt is hers to call.

**Reading the page alone (`pageOnly`) — Ashmolean only.** Only for a venue
whose PAGES HANG (the stall report: the page answered, its files did not): she
saves view-source of its show pages and `pageOnly` is tested on those. **Never
on a headed venue** — it strips the page's programs, bot check included, which
is what headed exists to run.

### Who sweeps what — in code, not a habit

`machineVenues()` decides; the machine is worked out from the proxy (present in
the container, absent on her laptop); `--home` / `--container` force it; the run
announces which it thinks it is. **Container: 21. Her laptop: 7** — `met`,
`artic`, `mad`, `brit`, `orsay`, `morgan`, `moma` (`route: 'local'`). Naming
venues by hand overrides it, and says so in the log. R-001 to R-005.

- **A venue moves to her laptop only after a COMPLETE, CLEAN sweep from there**
  (her decision). Until then the container sweeps it, and its refusals are
  the marker rows. Candidates are tested on her laptop by NAMING them.
- **The two machines never sweep the same venue** — doubling what a
  rate-limited venue sees turns a working venue into a blocked one.

### Headed venues — `moma`, `brit`, `morgan`, `orsay`

**`headed: true`: on her machine the venue is swept in a visible Google Chrome
on the profile `probe_headed.js open` seeds**, paced; never headless there,
never on an unseeded profile. The container never sweeps it (her decision).
Design: the HEADED block in `sweep_prototype.js`; H-001 to H-007.

**Three modes — never blur them:**
- **B — THE DEFAULT (her decision).** She opens Chrome, warms it up,
  LEAVES IT OPEN; the sweep attaches and works in a tab of its own, closing only
  its own tabs. No Chrome open → nothing asked, the run says so; never falls
  back to A. **Clean at all four.**
- **A — `--launch-chrome`.** The sweep launches Chrome, which announces it is
  driven by a program. Stopped part-way at MoMA and d'Orsay; kept, not default.
- **C — her everyday Chrome and profile. Rejected** (§8).

**Her steps for a headed run:**
1. `git pull`.
2. `node scraper/probe_headed.js open`, browse the venue a minute, let any check
   finish, **LEAVE IT OPEN**.
3. `node scraper/sweep_prototype.js <venue>` (add `--ignore-cooldown` inside the
   hour after a clean run), then push the run (above).
4. A REFUSED lane waits a day — that wait has evidence behind it.

**Sizes at 30s:** brit ~37 pages, orsay ~64, morgan 18, moma 15.

**Her decisions:** never split one venue across days, and no slower pace.
**Open with her:** whether several Cloudflare venues may be spread across days
(she has run all four in one afternoon, clean).

### Pacing — her machine only (her approval)

**The limit belongs to the gatekeeper, not the venue.** On her machine every
venue is paced in **lanes by gatekeeper, read off the reply** (never typed in;
kept in the run's `pacing.json`): one venue at a time per lane, ~30s varied
between pages, lanes side by side. **The first refusal or bot check stops the
whole lane for the run** — no retry. A refused lane is not asked for a day, a
clean one gets an hour's quiet. A venue cut short is NOT written, so
`--continue` redoes it. Design: the PACING block; P-001 to P-010, PC-001 to
PC-013. **Unproven:** whether a limit is on speed or per browsing session.

**Pages kept.** Every exhibition page read is kept (`output/pages_kept/<venue>/`),
so a venue cut short asks next time only for what is missing. Not reused once
the venue has written a file, after 14 days, or with `--reread`. Her machine:
always. **Container: only a recipe with `keepPages: true`** — a site that drops
out or blocks part-way more than once (her decision). Fixtures never keep or
reuse. `page_keep.js`, `pageKeepFor`; KP-001 to KP-021. **Keeping pages at
every container venue: reconsider if the monthly routine's reports show many
faults that kept pages would have fixed without a re-sweep** (her decision).
If so, the best home is **a separate repo for kept pages** — fetched only when
needed, never on her laptop, deletable outright; here they bloat every clone.

### What each site asks — robots.txt, both machines

**Every sweep obeys each site's robots.txt** (`robots.js`): pages at least its
stated wait apart; an off-limits address never asked for — a marker row says
why. Kept in `scraper/robots/`, re-read after a week. Waits do not count against
a venue's budget. Fixtures and probes never read it.
`node scraper/robots.js --report` prints each site's wait and paths.

- **The one exception:** the British Museum's past page, allowed by its file only
  with a trailing slash its own links omit — **allowed by her decision**
  (`robotsAllow`, that one address; RB-021/022).
- **No default wait on top of robots.txt in the container** — her decision,
  no problem seen in container sweeps.

### Then hand her the file — she must never have to ask

**Before sending, read the run summary's TITLES list** — every title the page
check (`titleFromPage`) changed, and every name it could not complete.

Send `sweep_compressed.csv` with the file-sending tool as soon as compression
finishes, saying how many rows and how many summaries were reused versus written.
**One file only** — never `sweep.csv`, which holds raw text. **If compression has
not been run, the run is not finished.** Run the file through the app's intake
and READ the cards before sending (§6).

### The network bridge — don't remove it

In the container all outbound traffic goes through an agent proxy **Chromium
cannot use**. So Chromium does no network I/O: every request is intercepted and
answered by Node (`installNetworkBridge`). **A raw egress path around the proxy
exists. Do not use it and do not build on it.**

- **It reuses program files and stylesheets the site lets be kept**, once per
  worker, as a browser does (her go-ahead); never the page itself or live
  data. `reusableFile`; BR-001 to BR-014. Container only.
- **It logs who answered**: each venue's first reply and every refusal carry a
  `reply labels` line (`replyLabels`; BR-015 to BR-017). A timeout says whether
  the page itself arrived and which files were outstanding (`stallReport`;
  ST-001/002).

### How it is organised

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

---

## 6. Lessons — mistakes not to repeat

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

---

## 7. Open work

Everything not listed here is finished. Do not reopen a closed item without a
new fact.

### 1. The cloud ledger — on branch `claude/ledger-cloud`, in trial

**What it is:** the ledger kept in the page's own store, saved about a second
after every change, instead of living only in her exported file. She reopened
this idea herself. **Branch only — `main` and her published app do not have
it.** Code: "THE CLOUD LEDGER" in `Cat_Watch.jsx` on the branch. Screen spec:
`docs/app.md` §9.

**Where:** test page **https://claude.ai/artifact/CbUv5Fcwt1R3kug7azGNmf**, its
own store, all four capabilities. **Her working app: she works ONLY
there, on her real ledger, in ONE tab on ONE device** (a second copy is read
only, below). Buttons: **Load** (a ledger file), **Save**, **Import** (a sweep
CSV) — `main`'s Import, Export and Import Refresh, renamed.

**Versions** (the branch's own series: `main`'s number, then the cloud count):
live on the test page **42.6 · cloud 5**. Cloud-only in it:
the read-only lock (below); Import on an empty page offers only "Open last
cloud save" and Load, and Save asks before writing fewer exhibitions than the
cloud holds (EI-001–007; `docs/app.md` §9); a roll-back's safety copy names the save by its
time (CL-T1–3); Cloud Saves' times share one width. The cloud count moves only
when she says. Merge `main` in again before the page is rebuilt. The page's
title is "Cat Watch Cloud Test" — set it in `build/dist/index.html` before
publishing (the shell says "Cat Watch").

**What the store holds:**
- **The live ledger** — the only thing the app reads and writes as she works.
  Compressed; a large ledger splits into pieces, same code.
- **Cloud Saves** (snapshots in the code) — whole copies, never rewritten, never
  pruned (her choice). Same store as the live ledger, her yes.
- **The sweep log and quarantine** — during the trial the TEST page's copies are
  the live ones (a page reads only its own store). Seeded from her app.

**Saving:** one **Save** button → a description, "Also save a copy to cloud"
(ticked; revisit if storage fills), Save now. Plus exactly **two automatic
safety copies** of the live ledger: before a roll-back, and before Load or Reset
replaces a live ledger that differs from what is coming in. If it cannot be kept,
nothing is replaced. Import never triggers one.

**Trial switch `CLOUD_OPENS=false`:** the app opens empty, she Loads her file,
and the loading line says whether the file matched the last cloud save — that is
the trial's check.

**Safety, proven** (`cloud_ledger.js`, `cloud_app.js`, 51 checks, her real
ledger): a save writes new pieces and switches one record last, so a save cut off
anywhere leaves the last complete ledger; a damaged or missing piece is refused;
an empty page never saves.

**Her tests all passed** — load, change, reload, roll-back,
Save, close and reopen, a real sweep Import.

**Two copies open: the later one is READ ONLY** (her decision). It opens
empty and writes nothing — "Open it" shows the cloud copy when she asks, never by itself (her decision); an edit record with a heartbeat decides,
stale after a minute; every save checks it first. A republish while her page is open can lock the new page for up to a minute — accepted, her decision (a same-tab fix did not hold and was removed). Design: "ONE COPY EDITS AT A TIME" in the code;
`cloud_two_copies.js`, TC-001–010.

**Next:**
1. Her normal use, over several sessions; she reports what surfaces. On request,
   read the store and check it against her file. Loads were never checked
   (she opened the cloud copy and did not export on leaving). **Until 11 Oct:**
   export on every exit, Load that file next time, read the match line.
2. `CLOUD_OPENS=true` once Loads have matched every time — her call. **Load
   stays for good** — it is how she opens a backup.
3. Merge to `main` and publish to her app — her call; §4's rules apply. **First
   copy the test page's `sweeps/venues`, `quarantine/rows`, `venues/occasional` and `links/pending` into her app's
   store** (quarantine merged latest-wins, never replaced).
4. Google Drive backup by button — on the table, never automatic.


### 2. Add by link — 39.5 signed off on her 10 links; a new venue still to see

**Her test of 39.5:** all 10 original links imported; the shop finder
better; catalogue lookups at Thyssen and Mauritshuis found the catalogue. Left
here for now. **Open:** how the finder does on a venue it has never met — she
will see when she next adds one by link. A miss is a finder bug (below).

**What links are for at a swept venue (her account):** only shows before the
1 July 2024 lookback, or a venue she has stopped sweeping (too few keepers per
sweep). Never a show the scraper has or will have. Otherwise, occasional venues.
**No exclusions apply to a link** — whatever she pastes is added, displays and
collection shows included (her decision).

**The reader at the 28, checked on 67 live pages** (one archive, one current
each, plus her 10 occasional links): the general reader works at 17 venues once
the eight general-reader rules are in (on `main`; `docs/picked_shows.md`, "The
general reader — eight rules"; proved on 37 fresh live pages). Still short: acq,
rijks, borghese, louvre, uffizi, mam, mad, ashmolean, artic, brit, dellav. **Her
choice: only acq, louvre, artic and brit get work** (deep archives); the others
may never come into play. A page printing no year ("5 June to 25 October") still
fails — blank dates instead is NOT approved; "current year" would misdate
archives.
- **Venue link rules live in the APP**, on the venue's `MUSEUMS` entry (like
  `subtitleUnderHeading`), never in the scraper — the scraper never runs them
  (her decision). A rule both use (the date reader) stays in `dates.js`.
- **Venue link rules** (`linkRead` on the `MUSEUMS` entry; `docs/picked_shows.md`,
  "Venue link rules"): acq, louvre, artic, brit (four live archive pages each);
  met — dates from its "on view" line anywhere on the page; frick — a leading
  "Special Loan:" dropped; menil — "Collection Close-Up:" dropped; artic — the
  description stops at a "Related" box (a photos-only page took another show's
  card). Each proved live; all on `docs/link_proof_pages.json`, which can also
  require no description (`noDescription`).
- **NGA (National Gallery of Art) — her deep-archive link venue**: an occasional
  venue with its own "NGA" chip and card name, and a leading "Exhibition:"
  dropped (`OWN_CHIP`, `linkReadVenue`; AL-030). Proved live on five archive
  pages; descriptions carry menu and caption junk around the real text, left
  alone until her cards show it reaching Claude's descriptions.
  A line opening "In collaboration with" under Acquavella's name is a credit,
  never a subtitle (her decision; *Calder | Miró*).
- **Old-layout Met pages that print no dates in their text** (*Matisse*, 2012,
  dates only in the banner) stay a failed link — no new code for them (her
  decision: her Met deep-archive work is done).
- **Junk at the end of a link's description is tolerated** (her decision) — act
  only if it starts reaching Claude's compressed descriptions. Not so for the
  scraper: venues swept repeatedly are kept precise.

Rules this work settled (code and tests carry the detail; `docs/picked_shows.md`):
- **An import she does not finish keeps NOTHING** — CSV or links: new venues
  and shops, Confirm / No shop / Look again, a CSV's sweep log. All stored when
  the ledger moves; Cancel import drops them; Back keeps them. **Except the
  links:** Cancel import puts every link read back in the box, stored.
  A file or Read with nothing to propose counts as finished.
- **A rejected link goes back in the box** when the import finishes, with the
  unread ones and, after a partial apply, the undecided ones; "Clear", inside the box, empties it and the store.
- **Books and ONLY books** — a section mixing books with other goods is never
  taken; the finder looks inside it for a books-only one. Catalogues ›
  publications › books. Never a front page.
- **She never feeds the app a shop link**, and "no shop found" is not an answer
  from a museum that has one.
- **The finder's search sends two queries in one call** — hers and "<venue>
  shop books publications" (Detroit's "DIA Publications" came only with both;
  her keyed connector).
- **A link venue is looked up exactly as the 28 are — shelf AND whole-shop
  search** (her decision). DIA files a show's book in the show's own shop
  section, not its shelf. The finder keeps a search only if it finds a book it
  saw (`proveShopSearch`); venues met before (finder 2) work it out at their
  first lookup. **Open:** O'Keeffe found at Detroit? Did Mauritshuis and the RA
  get a search? Her next lookups there say.
- **Titles from a page title**: the show is the first part of a barred
  title, the site the last; a bar inside the show's own name ("Duccio | Caro")
  is kept, read off the page's heading. AL-015. A page title that dresses the
  heading ("Exhibition Giovanni Bellini in Paris") gives way to the heading.
- **A link from one of the 28 files under that venue**: known by its
  site, from the scraper's recipes (`VENUE_SITES`, written by
  `build/sync_shared.js`; the Tates told apart by path). A new venue's shop is
  looked for once per Read, never once per link.
- **Jacquemart-André** (her saved pages, `docs/link_pages/`): the line under the
  heading is the subtitle, read by code (`subtitleUnderHeading`); the dates
  sit at the page's foot, so the description is read from under the heading.
- **Claude reads relevant passages, not the first N characters** (`pickPassages`): lines naming the book or show, catalogue/ISBN/price words,
  or a link onto the venue's shop come first. A link labelled "catalog" onto
  the venue's shop, in the web results, is taken in code (`catalogueLinkOn`).

### 3. Fixes not yet checked in the cases they were written for

1. **Borghese: 7 titles still in capitals.** The site answered on 5 Oct and the
   sweep still wrote all 7 in capitals; the title check changed none. Her import
   file has them corrected by hand (2 from the venue's text, 5 by hand),
   so each sweep proposes 7 capitals-only Change cards. Whether the venue TYPES
   them in capitals needs one saved listing and one show page.
2. **Title check not yet run** at `met`, `artic` (home venues). Ran at `capo` and
   `borghese` on 5 Oct, changing nothing.
3. **KHM: *Head and Shoulders* lost its opening date on 5 Oct** — the page
   says "since 11. November 2025"; the date reader now reads "since" (DS-001,
   `docs/khm_pages/`). Check the 15 Oct run has 2025-11-11.

### 4. Catalogue lookup generally

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
  test page's store — every call, what Claude was sent and answered, the card
  before and after (`docs/app.md` §1, "The lookup log"; read it with ArtifactData
  `list` + `out_dir`, then `node build/lookup_log.js <dir> [<id>]`).
- **Fixed in 42.6, her next lookups confirm:** *Hubert Robert* (NGA) — a catalogue
  the read finds with no title or ISBN (press release: "the accompanying catalog")
  now goes on to the facts round instead of being dropped (`unnamed`, UN-001–003);
  a reply holding two answers takes Claude's last (`lastJsonObject`, TW-001–004 —
  her Louvre links' "unreadable" descriptions).
- **OPEN — Hubert Robert, rebuilt, not yet published.** Her three English-edition
  cases (`docs/app.md` §1, step 3), one book per card, the ISBN read on the book's
  title. A different book is caught only when both page counts are printed — a
  partner venue's book with none, naming the venue, can still pass. Her re-run of
  both cards confirms.
- **OPEN — Vasari: "No English edition" on a book that IS the English edition.**
  *Giorgio Vasari: The Book of Drawings* (Louvre). The card holds ISBN
  978-2359063738 — the real English edition (Lienart, Sept 2022, for the show's
  Stockholm leg); French original 978-2359063721. The facts read said the book
  was French (it took the Louvre page's "(In French)", which describes the
  original), so `englishCheck` became "shops". Her four buy links finding nothing
  is the book being scarce, not a fault (her acceptance).
  **Fix, unfinished, on branch `parked` — NOT on `main`, NOT published (her
  decision: not verified):** `languageOnIsbn` reads the language off results
  carrying the ISBN — a label within 400 characters of it ("Langue: anglais",
  "Language: | eng", "Text in English") or a library record's "Translation of:
  <original>" with an English title — and outranks the read; the original goes
  in `originalEdition`. Tests EL-001–009 (LG-008's fixture adjusted). Proved on
  the results her lookup received (record `L17915952125267zcl`) and on today's
  live edition search; *Things* and *Van Eyck* records unchanged.
  **Not verified:** the whole lookup end to end — its Claude reads run only in
  her app, and the live web varies (one day the facts search printed no ISBN).
  **Next session:** bring `parked` onto `main` (merge, `npm run test:app`), agree
  with her how it is verified before publishing, then delete `parked`.
- **Search again and Reset card + Find catalogue run the same lookup** (checked
  on the live page). They differ only when a step fails part-way: Search
  again then leaves the card untouched. Otherwise a different result is the
  web answering differently — get that run's log.

### 5. The monthly container sweep — confirmation re-run 15 Oct

**She sweeps no more than once a month.** The container's half runs itself:
the "Monthly container sweep" routine, the 5th, ~2am Sydney, follows
`.claude/skills/monthly-sweep/SKILL.md` — sweep, QC, push, report; anything
needing a re-sweep or a code change waits for her. She then does the home
sweep, and a session with her stitches and compresses (her design).
**Every run — container and home — goes through `.claude/skills/sweep-qc/`
and has its faults fixed before anything is stitched** (her decision):
the routine runs it on its own run; she starts a session for her home run.
**The routine has the repo attached** (her setting) — without it the
session clones read-only and cannot push. It sweeps only the container's 21;
its report never names a home venue (her decision).

**First run, 5 Oct — a test, not imported** (`run_2026-10-05_015417`, 359
rows). `sweep_diff.js` now works out each change's cause; the skill asks only
for the UNEXPLAINED pile. Its faults (V&A, National Gallery, Cincinnati, Brera,
Tates) were fixed from her saves the same day; Louvre refused 3 pages.

**Re-run 15 Oct, 1:53am Sydney** — this session fires the routine (a
`send_later`). Her test: it pushes and reports in the new format; the five
fixed venues come back clean; nothing new broken. Good → she imports that run.
Not good → more work on the routine or the recipes.

### 6. Queued next

- **Catalogue-search rebuild: published on the test page (41.1).** Open: her live
  check of Hammershøi — the edition read now sees every result, so the library
  record (978-0847899289) that came tenth should give the English edition (WL-060).
- **Then:** the comment tidy for the rest of `scraper/`, and tests for two scraper
  decisions — MoMA's visitor notices dropped; the Wallace keeps displays and trails.

---

## 8. Rejected — do not re-propose

**Proposing "drop the feature" as a fix — rejected as an approach entirely.**

- **Announcing "this row used to have a catalogue"** when a later lookup finds
  none anywhere.
- **Storage and saving:** the sweep log inside her export. Google Drive auto-load
  on open. Automatic saving to Drive (a button is on the table, §7.1). The app
  gathering its own exhibition data. Auto-save to her FILE on every change (the
  cloud ledger's live save is a different thing, §7.1). A confirm-tap after
  download. A backup in the browser's own storage. A snapshot on closing the page.
- **The intake:** bulk-approve. In-app field editing. Confirm-and-continue past
  undecided cards. Remembering rejections. Ticking nothing on a date conflict.
- **Data:** Excel as the sweep format. Merging the two Tates. Stripping the 110
  seed. The separate readout doc.
- **Process:** watching the sweeper and interrupting it. Firing a new JSX
  mid-discussion. A "GPT scrapes, Claude compresses" role split.
- **Catalogue lookup:** splitting it from drawer output. A map of publisher
  websites (her short list of joint publishers, `PUBLISHER_SITES`, is her
  decision — never filled ahead). A background shop check on every click. Linking straight to an
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

## 9. Where the rest lives

| File | What is in it | Read it when |
|---|---|---|
| `docs/app.md` | The app's evidence: catalogue lookup, shop addresses, saving, intake bands, quarantine, sweep log, seed, the cloud ledger's screen | Changing anything in the app |
| `docs/scraper.md` | The scraper's evidence: listings, pagination, the date parser, junk in summaries, failure handling, compression, blocked venues | Changing anything in the scraper |
| `docs/import-file.md` | How each file she imported was built | Touching that file, or explaining its dates |
| `docs/venues.md` | Per-venue evidence: refusals, listing URLs, the headed venues' runs | Working one specific venue |
| `docs/venue_urls.md` | The original 21 venues' addresses from the Sweeper Brief, and which of its notes still hold | Wiring or re-checking one of those venues |
| `docs/listing_pages/`, `docs/*_pages/` | Pages she saved, with a README of what each settled | Changing that venue's recipe — before asking her for anything |
| `docs/compression.md` | Compression design, model split, eval, rejected alternatives | Changing compression — otherwise don't |
| `docs/picked_shows.md` | Add by link — design, decisions, store, shelf rule, first test | Changing Add by link |
| `docs/library.md` | Purchase tracking and a Library tab — **future consideration, never propose** | She raises it |
| `docs/review-2026-09-12.md` | Her venue-by-venue review | Before touching a reviewed venue |
| `docs/review-log.md` | Independent review findings and decisions | A reviewer raises something |
| `docs/store_backup_2026-09-21/` | A read-out of the page's store, as insurance | Only if the store is lost AND `sweep_log.js` cannot rebuild it |
| `scraper/compress_prompt.md` | Compression prompts and tuning | Changing summary wording |
| `docs/Cat_Watch_Sweeper_Brief_v2.docx` | The original Chat-Claude brief | Rarely |

Git holds the full text of everything compressed out of this guide —
`git log -- CLAUDE.md`.
