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
  with it. Ask ONCE; her yes holds until she says otherwise — never ask again in
  the same exchange (4 Oct: asked three times, she was furious).
- **Her report and output first, the guide after — her rule, 4 Oct.** Send the
  report and anything for her review, then update this guide in a background
  job; say once when it lands. Her review never waits on the guide.
- **Long runs need progress.** A backgrounded command showing nothing reads as a
  dead session.
- **Test conservatively — her rule, 24 Sep.** Every page fetched from a venue
  counts toward its rate limit, and a limit hit stops work. Before touching the
  network, work out the fewest venues and the fewest pages at each that answer
  the question. Saved pages and fixtures first. Never a blanket re-sweep because
  it is quick.
- **A question gets an answer first — her rule, 27 Sep.** "Talk to me about X"
  means discuss; nothing is built until she says.
- **Respect UI simplicity and specific UI instructions — her rule, 1 Oct.** Build
  exactly what she named, nothing added. "Add a copy icon" = an icon, not an icon
  plus the word "Copy". "Copy this line for case X and Y" = the same line with
  only the words naming X and Y swapped, never a new, longer line. No words she
  did not ask for — she is constantly decluttering invented verbiage.
- **A guess is labelled a guess.** Say what is proven, what is not, and what one
  request would settle.
- **A session's own Parallel calls use the free "Parallel Search" — her rule,
  3 Oct.** Her keyed "Parallel Search Key" only with a reason (e.g. ten pages at
  once, which would hit the free limit), and she is told clearly BEFORE the call.
- ISBN-13 is always displayed `xxx-xxxxxxxxxx` (3 digits, hyphen, 10 digits).

### Put it in code — her rule, 10 Sep 2026

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

- **Record the conclusion, not the journey.** Results, rulings and the lesson —
  never the order things happened in. When a finding is overturned, replace the
  passage; git is the archive.
- **Only OPEN work carries its backstory** — enough for the next session to pick
  it up cold. When the item closes, cut it to its result.
- **Moving text to `docs/` is not a way to keep it.** Compress it first, in
  place, then move it. A side doc holds evidence a future session will need,
  never a transcript.
- **Every file has a line budget** — `node scraper/doc_budget.js` (her ruling,
  30 Sep; runs at the end of `npm test`). Over budget warns and never fails a
  test: the clean-up is a separate session, away from active work — never the
  session that tripped it, mid-task. Raising a budget is her call.
- **The clean-up is the "Guide review" routine** — a fresh session on the 15th
  and 30th (28th in February — a second routine), 7:50am Sydney, push to her; it follows
  `.claude/skills/guide-review/SKILL.md` (fix what has one answer, ask her
  about rulings and anything untraceable). She can also ask for it any time.
- **Anything derivable from the repo is printed by a script, not typed here**
  (`scraper/venue_status.js` replaced the venue table).
- **Put the trigger next to the code, not in an index here.** A comment above the
  date parser saying "read `docs/scraper.md` first" fires because the session is
  already looking at that line.
- **Never duplicate a code comment into this guide.** One copy drifts, silently.
- **Never use `@path` imports here** — Claude Code loads those eagerly.

### Branching

**`main` is the trunk and the source of truth for app, scraper and this guide.**
Work there. `.claude/hooks/session-start.sh` switches a web session's
auto-assigned branch to `main` before work begins; it refuses if the tree is
dirty or the branch carries unmerged commits, and it fetches first.

Branches separate in-progress work from known-good work, never components.

| Branch | What it is |
|---|---|
| `claude/ledger-cloud` | **Live trial — §7.1.** Merged to `main` only on her call |
| `parked` | Work held for another session (below). Deleted once on `main` |
| `claude/jsx-stitched-intake` | Merged 20 Sep; kept as history |
| `claude/quiet-user-agent` | Parked, her ruling 19 Sep — do not merge or re-open |
| `claude/personal-tracking-ledgers-z49s2h` | Dead — do not merge |
| `claude/blissful-knuth-snbqci`, `claude/design-questions-87gj6w`, `claude/headless-chromium-claude-code-wl94l0` | Dead — early 7–10 Sep work from before `main` was the trunk (no shared history with it); superseded, do not merge. Kept on GitHub, her ruling 2 Oct — never raise deleting them |
| `claude/met-connection-experiments` | Abandoned — do not merge |
| `claude/playwright-scraper-prototype-z68iko` | Abandoned — merging it would undo the current scraper |

**Holding a push for another session — her rule, 4 Oct.** When she says a
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
mode B were clean at all four on 30 Sep (§5). Evidence: `docs/venues.md`,
"The headed venues".

### What the script cannot derive — her rulings, per venue

Judgement about the outside world is not in any file. Her counts are always what
should reach the app.

| Venue | Her ruling |
|---|---|
| `va` | Displays excluded — **this venue only** |
| `wallace` | Displays and trails KEPT — **this venue only** |
| `menil` | 7 permanent galleries excluded; "Foyer Installation: …", "… from the Collection", "Recent Acquisitions" excluded — **this venue only** (24 Sep) |
| `tate-modern`, `tate-britain` | Exhibitions only, never collection displays (24 Sep). The "recently opened" page is not an archive and is not fetched |
| `tate-britain` | Ofili excluded, on the venue's own ONGOING label. Turner Prize and the Tate Britain Commission excluded (25 Sep). Past exhibitions from the What's On calendar, 1 Jul 2024 to the day of the run — `expandDateRange`. A session nested under a show is not a show |
| `tate-modern` | **Never its past exhibitions**, though she knows where they are (24 Sep) |
| `uffizi` | Headlines kept as titles; undated rows kept |
| `artic` | Only `EXHIBITION` and `TICKETED EXHIBITION` — `docs/scraper.md` §13. Bare "from the Collection" and "Film Series" titles excluded; family, named and lent collections KEPT. No note on the card for films or installations; no model judging rows (24 Sep) |
| `met` | Recurring series (P.S. Art, Scholastic, crèche, Burdick baseball cards) and every commission series excluded. **Nothing excluded for coming from a collection, a gift or acquisitions** — they can be major (24 Sep) |
| `moma` | **Current and upcoming only** — never its past. **Exhibitions only**: the listing's "Installations and projects" section is dropped on the listing, never opened (MM-001–003). Her count 30 Sep: 9 + 5 = 14 |
| `brit` | Current/upcoming asks for **Exhibition AND Experience** — the Bayeux Tapestry is filed as an Experience (BM-012); only `/exhibitions/` pages kept. Past read in the listing's year sections only (a heading is the year a show OPENED); nothing under 2023 opened (BM-013–015). Her count: current + upcoming 5 (*Multiplied wonders* newly listed 30 Sep), past 2026 **9**, 2025 **12**, 2024 **10** (*Legion*, closed 23 Jun 2024, out) — **34 rows**, because *Admonitions* is listed under every year at one address and is one row |
| `mam` | Collection displays excluded — "Permanent collection" subtitle and "New acquisitions…"; also the Prix Marcel Duchamp and Oliver Beer's films (25 Sep). Her count: 3 current, 0 upcoming, 13 past |
| `mad` | Nothing excluded. Her count: 2 current, 2 upcoming, 16 past. Musée Nissim de Camondo ignored — closed until 2030 (25 Sep) |
| `jacquemart` | Exhibitions only — the card's own tag; operas, costume balls and other events refused (25 Sep) |
| `orsay` | **Displays always kept**, "Focus on our collections" included — its collection is deep, like the Met's. **Every off-site show kept.** "Exceptional presentation" kept for now. Parcours, Immersive experience, Invitation dropped; an unseen tag is kept and named (25 Sep). Her count: 13 + 45 = 58 |
| `lgd` | New York and London only — Hong Kong partnership shows ("& Wei, Hong Kong") and "LGD Hammer" auctions excluded. One exception to the lookback: *Yves Klein and the Tangible World*, its catalogue only just published — `keepDespiteLookback`, that one address (25 Sep) |
| `morgan` | *Collections Spotlight* excluded — a standing rotation, not a show. Past blurbs read off the listing, pages not opened — **unless the listing gives no description; then the page is opened** (30 Sep). A picture caption (`p.small`) is not a description. Her count, 28 Sep: current 3, upcoming 5; past 2025-26 **20**, 2024-25 **3**, 2023-24 **8** — 39 |
| `rijks` | 37 rows, not chased further. *Asian Pavilion* was pulled by the venue |
| `capo` | **Not count-verified and never will be** — see below |
| `brera`, `borghese` | Their single extra row is a marker for a genuinely empty upcoming page |
| `ashmolean` | **Everything kept** — major, free and displays, past included (27 Sep). Her count: current 0 major + 4 free, upcoming 2 + 1, past 4 + 13. **Titles: the full name from the show's page header, ordinary capitals written by code** — the venue types capitals everywhere (`capsTitles`, `titleFromCaps`, `pageTitle`) |
| `cincinnati` | Nothing excluded (4 Oct). Her count: current 2, upcoming 2, past 2026 **4**, 2025 **14**, 2024 **9** — 31. Pages saved by the container, her yes for this venue only. **Never swept yet** |

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

**The original venues were reviewed by her against the live site and re-swept,
12 Sep** — `docs/review-2026-09-12.md`. Read it before touching a venue listed
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
> (the sweep log and quarantine — the two things that survive a Reset). A publish
> restating `capabilities` must restate all four; omitting it carries them
> forward. **Renaming the connector means restating them.**

**Live: 40 · cloud 4 on the test page** (4 Oct, Cincinnati added); her main app shows 39.2, its code on `main` current. **Only the cloud test page is published** (her ruling, 4 Oct): `main`'s code
keeps up with it, merged, so her main app never falls behind — it is not
republished each time. Reset to Seed always asks; the counts line is Watched · Wanted · Owned ·
Closing Window (Yes-wanted catalogues closed 3–12 months ago,
`inClosingWindow`), Tracked and Dismissed inside "Details"; footer "Reset to
Seed" and "Reset cards" (clears one card's lookup). Older numbers are in git.

- **The number lives in `APP_VERSION`; the footer prints it with the date.**
  Bump it in the same breath as the change.
- **Her numbering:** whole number for a substantial change (adding venues is
  one), decimal for a small one. **One number per PUBLISH**, never per build.
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
want-catalogue / acquired / catalogue details). **She keeps a real ledger since
24 Sep** — changes touching it need the care of any user data.

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
publisherUrl, publisherResult, shopUrl, shopState, shopChange, addedAt, editedAt
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
  says what it leaves behind) — **stays until she says, her ruling 30 Sep:** she
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
- **Buy next** (her design, 2 Oct): on a Yes card, a dot left of the star, drawn
  to the star's measured size (`starInk`) — hollow off, red on. Leaving Yes clears
  it. Acquiring row ends Has catalogue · No catalogue · Buy next. **No count
  anywhere.** Closing the search bar or Reset cards empties its box.
- **Per-venue freshness**, two dates, from `swept_at`.
- **Add by link** (39–39.5, her design 3–4 Oct; signed off on her 10 links
  4 Oct): Import opens a small pop-up — CSV · Links, Cancel; **nothing added
  to the page itself**. Each link is read
  once by code (title, dates) and the model (prose, always English), then the
  same intake as a sweep; no lookback. New venues file under one "Occasional"
  chip; their shop sections confirmed on a screen after the review (39.2).
  **The date reader and summary rules are the scraper's own**, written into the
  JSX by `node build/sync_shared.js` — never edit between its SHARED markers.
  `docs/picked_shows.md`.
- **The confirm box is the TOP layer** (`zIndex` 1200), above the refresh review
  at 1100. **Any new overlay goes BELOW 1200.** Fixture 18i.
- **Dark mode**, every colour named; the shell paints a ground before React runs.
- **Sorting, timestamps and dividers** — the only way to tell this import from
  earlier ones from the seed. **Do NOT "simplify" it.**
- **Seed set**, ~110 exhibitions read 20 Aug 2026, met / ng / rijks / acq only.
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

Each step runs only if the one before left something missing.

1. **The venue's shop** — its catalogues page and its search box, in one call.
   Take **the book's own product page**, never a list.
2. **Open that page** for the ISBN, the publisher and any publisher link.
3. **ISBN still missing → search the open web.** Gaps only — whether or not
   the shop had the book (N-001).
4. **No publisher page → go to the publisher**: find their site from their
   name, search inside it, **open what that returns**.

**Every step after the first is conditional — do not make them unconditional,
and do not flip to searching wide first.**

**The rules, each of which replaced a real failure:**

- **`web_fetch` for a page whose address we have or can work out; `web_search`
  only for the three real searches** — does this book exist, where is its ISBN,
  where does this publisher live.
- **Never choose a page from a general index and build on it**, and **open a
  candidate before believing it** — a search cannot tell a book from a shelf.
  Two candidates, then the fallback.
- **Go to the publisher, do not search for them.** One search for the name,
  then read the domain off the results mechanically. Shared words (books, press,
  publishing, editions, university) are dropped.
- **Every outcome says which negative it is** (`publisherResult`,
  `publisherNote`); **a step that died is not an answer** — later steps carry
  why it came back empty.
- **Only the publisher is the publisher** (her ruling, 1 Oct, Millet): a link a
  read hands over is filed only on the publisher's own site (`publisherLinkOf`);
  a distributor's page never. Self-published → no link at all.
- **Another venue's catalogue is not this show's** (her ruling, 2 Oct): a book
  found on the web is filed only when the read says it is the catalogue of the
  show AT THIS VENUE (`thisVenue`); a show that travels here "in modified form"
  does not count. The shop step needs no such answer. A blank publisher with the
  ISBN known runs the wider search too.
- **The title as printed, and English first at non-English venues** (her
  ruling, 2 Oct): a shop title is kept only as far as the pages print it
  (`titleAsPrinted`). At a venue marked `english:false`, a book this lookup
  found gets one search by ISBN for its language and own title; not English →
  one search for an English edition → filed as "Not in the museum shop". None →
  the book stays under its own title. A book already on a card is never renamed
  (`fillLanguage`).
- **"X in association with Y" — Y is the publisher** (her ruling, 2 Oct):
  the publisher step and the self-publisher check use Y (`publisherToFind`);
  the card prints the line as given.
- **A museum's own imprint is skipped** — `SELF_PUBLISHERS`, keyed on the
  **publisher**, never the venue, **added to only by her**; one imprint may need
  two names (MAD and MoMA have two).
- **Everything fills a blank and nothing else.** A known value is never
  overwritten.
- **A 10-digit ISBN is taken and converted**, check digit verified. `toIsbn13`
  is the only door; `cleanIsbn` the strict gate downstream.
- **Only "Re-check museum shop" moves the shop status** (her design, 25 Sep).
  With a link on file it re-reads that page (gone → "No longer", link kept as
  "Museum shop (last seen)"; buyable again → "Back"); with none it runs the shop
  step alone ("Now"; a book already in the shop stays "In the museum shop",
  "Re-checked: still in the museum shop."). A failed check changes nothing.
  **Search again fills blanks only.** `docs/app.md`, "A book leaving the shop".
- **A blocked shop says so** — `shopState: "blocked"`, her wording: *"The
  museum shop is blocked - search it manually. The catalogue is stocked
  elsewhere."* / *"The museum shop is blocked. The catalogue also does not
  appear to exist elsewhere. Search manually to confirm."* Headline red and
  bold, the rest grey. Blocked today: KHM, MAM. **A shop whose every page comes
  back empty is blocked too** (her ruling, 1 Oct) — MoMA's shelf is drawn by
  script and its search and `products.json` answer 403.
- **The Museum shop link searches the shop for the EXHIBITION's title** when
  no book page is on file (`buyLinks`) — resellers keep the book's title, the
  shop keeps the show's. A search or shelf page is never filed as the book's
  page (`listedOnly`). KHM opening its search is the design working.
- **The line under a book not in the shop** reads "Not in the museum shop —
  shop link opens the general store." for every venue with a shop (her ruling
  2 Oct; no per-venue wording). **A venue with no shop**
  (`borghese`, `capo`, `dellav`) reads only "Venue has no shop.", grey, with
  no shop link and no Re-check button; its lookup goes straight to the web.
- **Booko AU** (last buy link) is `booko.au/<isbn>`; with no ISBN, its title
  search. Her verdict, 2 Oct: works well on the ISBN, which the lookup now finds
  far more often; the messier title-search results are accepted.
- **A ticket is never a catalogue** (`isTicketLink`).
- **A shop link from the web search is opened before it is filed as in the
  shop** (`confirmShopLink`).
- **A book's link on a shelf is read in code** (`bookLinkOnShelf`): the one link
  on the shop whose words carry the whole catalogue title; two, or none, and
  nothing.
- **One page is read whole** (`fetchPage` `{full:true}`, her ruling 1 Oct): the
  book's page, Re-check's page, the publisher's candidates. The shelf stays
  excerpts (a call is capped ~25,000 characters). **The ISBN is read in code
  first** (`isbnOnPage`): exactly one 978/979 number labelled ISBN or EAN, check
  digit valid; Claude's only when code finds none. **"Sold by …" is the shop,
  never the publisher.** Text a page hides until clicked is not in Parallel's
  copy — the wider web is the route for it. Evidence: `docs/shop_pages/README.md`.
- **The web ISBN search reads its results in code too** (`isbnInResults`): only
  results carrying the whole book title count; labelled numbers and valid
  978/979 numbers in their addresses; exactly one. None → the two results about
  the book are opened whole. Queries name the venue.

**The cost:** up to four searches and three readings. **Every reading runs on
her allowance.** The keyless tier refuses after roughly a dozen quick searches
(observed; unpublished). A failed search shows one line on the card, Re-check's
words with "Search"/"Search again" (her ruling 30 Sep; no red banner). **Per
`mcp.d.ts`: `rate_limited` is never returned; `upstream_error` is the catch-all
and Parallel's words never reach the page** — so its free-tier refusal is most
likely "Search failed (upstream_error)" in the app (not proven).

**Her keyed connector since 36: "Parallel Search Key"** — custom, at
`https://search.parallel.ai/mcp-oauth`, No sign-in, her key in an **`x-api-key`**
header (`authorization: Bearer` never reached Parallel); billed to her Parallel
account ($20 credit for 60 days, $5 a month, auto-reload off). The built-in
keyless "Parallel Search" cannot be removed; a second connector at `/mcp` is
refused. The key has been used for ~30–50 lookups with only brief connection
errors (2 Oct).

**Shop addresses:** all 18 original venues checked, `docs/app.md` §1;
`borghese`, `capo`, `dellav` have none. Newer venues: in `MUSEUMS`, a comment
each. `mad` has no search box — its publications shelf is read five pages deep
(`SHELF_DEPTH`).

**Which model — CLOSED, her ruling 22 Sep.** The page asks the viewer's Claude
through `sample` at `modelTier: default`. Do not re-open without a real misread.

### Tests

`npm test` runs everything, and **the exit code says whether all of it passed**.

| | |
|---|---|
| unit fixtures | `date.test.js`, `compress.test.js`, `qc.test.js`, `sweep_log.test.js`, `venue_status.test.js`, `pacing.test.js`, `sweep_diff.test.js` |
| `intake_cases.js` | folding, quarantine, freshness, the ledger gate |
| `page_loads.js`, `page_renders.js` | does the page load; does it DRAW (jsdom, plain and with the runtime answering) |
| `add_by_link.js` | Add by link on the 3 Oct pages (`docs/link_pages/`): titles, dates, unread links, new venues' shops, the chip (AL-) |
| `catalogue_lookup.js`, `recheck_shop.js` | the lookup (C-); Re-check, blocked shops, web-found links, search filters, another venue's book, no-shop venues, language, Reset cards, counts, buy-next dot, closing a search box — the real app, buttons pressed (R-, L-, S-, VN-, LG-, RC-, RS-, CT-, SC-, BN-) |
| `*_pages.js` per venue | `mam`, `ashmolean`, `moma`, `mad`, `brit`, `morgan`, `orsay`, `cincinnati`, `va` recipes on saved pages, no network — her counts, dates, titles, descriptions |
| `summary_pages.js`, `description_pages_oct.js`, `title_case_pages.js`, `listing_pages.js` | descriptions, titles in the venue's letters, where each row was seen — on saved pages |
| `page_keep_pages.js`, `bridge_reuse.js`, `robots_pages.js`, `pacing_pages.js` | kept pages; the bridge's file reuse and reply labels; robots.txt obeyed and stall reports; pacing against Cloudflare's replies |
| `cloud_ledger.js`, `cloud_app.js`, `cloud_two_copies.js` | the cloud ledger (branch), on her real ledger; two copies open at once |

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
npm test                                     all fixtures
```

### The files

| File | What it is |
|---|---|
| `sweep_prototype.js` | The real scraper. Playwright + Chromium |
| `dates.js` | THE date reader — the app gets it via `node build/sync_shared.js` (with compression's rules); `npm test` fails if they differ |
| `compress.js` / `compress_cli.js` | Raw text → the summary she reads |
| `qc.js` | Exceptions report **and the gate in front of her import file**. A faulty row (no title, no venue code) BLOCKS `--apply`; an exception warns and never acts |
| `sweep_log.js`, `venue_status.js` | Freshness drawer rebuilt from disk; §2's table |
| `reread_kept.js` | **A fault in a sweep's rows is fixed from the pages it kept, never by sweeping again** (her rule, 27 Sep). Prints every changed field; `--write` corrects the run, `swept_at` kept |
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

### Adding a venue — the intake, in this order (her rule, 27 Sep)

**No show page is asked for before step 6.**

1. **Her count and her rulings** (§2 table).
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
  (her rule, 26 Sep). Until then the container sweeps it, and its refusals are
  the marker rows. Candidates are tested on her laptop by NAMING them.
- **The two machines never sweep the same venue** — doubling what a
  rate-limited venue sees turns a working venue into a blocked one.

### Headed venues — `moma`, `brit`, `morgan`, `orsay`

**`headed: true`: on her machine the venue is swept in a visible Google Chrome
on the profile `probe_headed.js open` seeds**, paced; never headless there,
never on an unseeded profile. The container never sweeps it (her ruling, 5 Oct).
Design: the HEADED block in `sweep_prototype.js`; H-001 to H-007.

**Three modes — never blur them:**
- **B — THE DEFAULT (her ruling, 29 Sep).** She opens Chrome, warms it up,
  LEAVES IT OPEN; the sweep attaches and works in a tab of its own, closing only
  its own tabs. No Chrome open → nothing asked, the run says so; never falls
  back to A. **Clean at all four, 30 Sep.**
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

**Her rulings, 29 Sep:** never split one venue across days, and no slower pace.
**Open with her:** whether several Cloudflare venues may be spread across days
(on 30 Sep she ran all four in one afternoon, clean).

### Pacing — her machine only (her approval 26 Sep)

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
out or blocks part-way more than once (her ruling). Fixtures never keep or
reuse. `page_keep.js`, `pageKeepFor`; KP-001 to KP-021. **Keeping pages at
every container venue: reconsider if the monthly routine's reports show many
faults that kept pages would have fixed without a re-sweep** (her ruling, 2 Oct).
If so, the best home is **a separate repo for kept pages** — fetched only when
needed, never on her laptop, deletable outright; here they bloat every clone.

### What each site asks — robots.txt, both machines

**Every sweep obeys each site's robots.txt** (`robots.js`): pages at least its
stated wait apart; an off-limits address never asked for — a marker row says
why. Kept in `scraper/robots/`, re-read after a week. Waits do not count against
a venue's budget. Fixtures and probes never read it.
`node scraper/robots.js --report` prints each site's wait and paths.

- **The one exception:** the British Museum's past page, allowed by its file only
  with a trailing slash its own links omit — **allowed by her ruling, 27 Sep**
  (`robotsAllow`, that one address; RB-021/022).
- **No default wait on top of robots.txt in the container** — her ruling 27 Sep,
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
  worker, as a browser does (her go-ahead, 27 Sep); never the page itself or live
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

**The 4-paragraph / 2,000-character description cut stays — her ruling 25 Sep.**
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

## 6. Do not re-break these

Each line cost a real failure. The details are in git and `docs/`; the lesson is
here.

### A check that cannot fail looks exactly like a check that passes

- **Check the exit code, and grep the output for the new test's own name.** Four
  suites have run silently: below a `process.exit`, needing a missing harness,
  not named by `npm test`, or cut short by an early `return`. A total cannot say a
  case ran.
- **Three greens can all miss a blank page** — `tsc` says it parses, unit tests
  test lifted-out functions, grepping the built page finds expected strings.
  Render it (`page_renders.js`).
- **Ask the rule directly**, never through a side effect of another field.
- **A fixture must serve the address the recipe asks for NOW.** One served a
  retired address and kept passing on a carousel that happened to repeat the
  same shows.
- **A fixture that stops before the step that writes proves nothing about what
  is written.** The Morgan's listing read 39 right and the file got 8.
- **A branch nothing has entered is untested however long it has shipped.**
- **Name a test by what the code does, never by what it was meant to achieve.**

### A negative has to be earned, and has to say which negative it is

- "Found nothing", "never ran" and "was refused" are different sentences. Several
  screens once printed the same line for all three.
- **An empty page is not a page with nothing on it** — script-drawn pages read
  as 110 characters of furniture.
- **A control that only renders when it has something to show cannot report
  nothing** — a missing button, and a "nothing here" line inside a button that
  vanished when the list emptied. Three times.
- **Never report a success because a button was CLICKED.**
- **Count from the array AFTER the change, never from the list of marks.** A log
  announced ten exclusions while all ten sat in the CSV.
- **Say what is unknown** rather than print a default like "never".

### Measuring the cheap thing instead of the thing that matters

- **A probe answers only the one request it made.** One listing page read, the
  venue called open, the scraper changed, and causes invented when the sweep
  failed.
- **A control tested once is tested in its easy case** — the Louvre's load-more
  failed on the press AFTER the last real one. Check the click reached it (a
  cookie popin swallowed it for two days).
- **Never let one fixed pause answer two questions** (has the batch arrived; is
  there more).
- **A count flattens the evidence.** A right total can hide lost rows, halved
  titles, or junk descriptions. **Read the cards, the titles and the
  descriptions** before calling anything done.
- **When the artefact cannot contain the evidence, stop reading the artefact** —
  a CSV squashes titles to one line; the defect was made of line breaks.
- **Run the thing itself** before concluding it is wrong, and **read a page, not
  a search excerpt of it.** A thin answer from a page is not proof the page is
  thin.
- **Check a title against the museum's own spelling**, not only against the
  listing it came from.
- **Answer "what will the scraper do" from the recipe and the code, never from an
  old run's output.**
- **Scroll a listing before reading it**, and measure its height AFTER the wait.
- **Test a general rule where it was NOT derived.**
- **A filled field is not a right one** — a picture caption passed for a
  listing's description, so the page holding the real one was never opened.

### Judgement made silently where she should have seen it

- **De-duplicating by title — deleted 29 National Gallery exhibitions.** Never
  drop a row on a judgement: unreadable titles, "looks the same", undecided
  cards skipped on apply.
- **A data fault never goes on her approval pile** — a row with no title means
  "re-run", a message to the session.
- **A fact the code already knows is never re-derived from prose written for a
  human** (triage bands chosen by searching notes).
- **Unreachable is not unwanted.** Never delete working-but-dormant code because
  it carried something you were asked to change.
- **Change exactly what was asked** — one sentence, not its whole line; a
  restored sentence restored where it was.
- **A recovery step with one correct answer is code**, never a choice handed to her.
- **Never invent a constraint she did not state, or give a reason nobody
  checked.** An error code is explained from the platform's types
  (`mcp.d.ts`), never from memory. A change that is code is yours — never her
  settings task with a failure branch (1 Oct).
- **Argue architecture from what the platform offers, not from what was built.**

### A rule that held only while its input stayed small

- **Quote the match, never the input** — a parser's input once became 17,734
  characters on one card.
- **Loose rules apply to a listing card, not to whole page text** — a photo
  caption became an opening date; an all-numeric range was read from page text.
- **A step count is not a boundary** (`datesNearLink` walking two steps).
- **An ancestor walk stops before `<body>`**, and a noise class on a container
  holding most of the page is layout, not noise (Wallace, V&A).

### Two copies of one fact drift silently

- Two month patterns, two date parsers, a second hand-typed venue list, six
  near-identical venue functions — **each lost dates or venues without a word.
  One copy, and delete the dead one: dead code shaped like live code is a trap.**
- **Anchor a harness on prose, never on a line of code.**
- **When you fix a fact in one place, fix every place on screen that shows it**
  — a summary line read the old way a day after the line below it was fixed.
- **A ruling about where a fact belongs applies to every fact of that kind in
  front of you.**

### Joins that were never run, though both halves were tested

- **Run the whole chain end to end** — stitch wrote a loose file where compress
  read directories: 652 rows in, 172 out, no error.
- **Match on the key the data actually carries** (URL slug, not title — 56
  matches instead of 103).
- **A repair is a flag, not a rule that wins every run** — a rule that always
  prefers one source is a revert machine.
- **When rows are rebuilt, check what follows them** (dates, descriptions); and
  **never choose between two copies by a key both share.**
- **Archiving must ask what else depends on a folder** (compression's memory).
- **Inserting a check into an existing block can split it** — every venue
  without a load-more died while 148/148 unit tests passed; the unit suite has
  no browser.
- **Where the listing labels a thing, filter on the listing** — never open every
  page to learn what the listing already said.
- **Reasoning for a hand-built data file goes in `docs/`,** not a comment in a
  one-off script.

### Substituting a tool and letting the route change with it

- **A capability lost in a substitution is the thing to report, not to absorb** —
  "ask the shop" silently became a general web search, still labelled "shop".
- **Change one thing at a time** — a prompt and the row it fills rewritten
  together dropped the publisher field from both.
- **A gate that can only ever open, or a status that can only ever be set, is a
  bug.**
- **A better source is not a complete one** — do not let stage one end the route.
- **Open a candidate before filing it.** A lucky hit is not a working step.
- **Go to a page you can address; do not tune searches to surface it.**
- **Self-publishing is decided on the publisher, never by matching it against
  the venue.**
- **Write every address down, and check the ones already written.**

### Scraper mechanics that each cost rows

- Waits: never `networkidle`; wrap `route.fulfill`/`abort`; a 404 is not a
  loaded page; a torn-down browser is not a page failure; retry a detail page
  after one transient failure.
- Addresses: `normalizeUrl` lowercases scheme and host only; resolve hrefs, never
  join by hand; keep every link to an address, not the first.
- Dates: never build date strings by hand; month patterns take every spelling
  (`Sept.`, `SEP`, Italian `set`); a weekday before a date; the year on the
  closing side; never derive an opening year from the closing year; normalise
  every dash.
- Listings: read every page of a paginated archive, and stop at the lookback
  floor; only the site's own next link says how it numbers pages; a load-more
  click must not follow its href once the list is complete; a recipe's own
  filter is not a page; a listing that loads and yields nothing leaves a marker.
- Structured data: check `events[0]` is this exhibition.
- Titles: noise stripping is case-exact ("How to Make an Exhibition"); never
  strip a location that tells two shows apart — Acquavella adds the gallery only
  to a show run in both galleries within six months.
- Summaries: a venue can name a blurb living in a div; junk checks cover every
  language a venue writes in.
- `resolveChromium()` needs both halves; never a hardcoded path.
- **A blanket find-and-replace over a file you just added definitions to will eat
  those definitions** — valid syntax, black screen.

### Diagnosing in the wrong order — the Ashmolean, 27 Sep

- **Free checks before live sweeps:** robots.txt, the reply's labels, her
  view-source saves. The answer was in the first (it asks 10s; we asked every 2).
- **A missing label on one reply proves nothing** — that reply came from a cache.
- **Repeated sweeps spoil the evidence the next diagnosis needs.** A sweep runs
  once, after every question is answered and the recipe passes offline.
- **A capability on one machine is not on both** — pacing was her laptop's; the
  container went unpaced for a month unnoticed.
- **"The shared path is built" is not "every venue is ready"** — say per venue.

### Tests that reach the network

- **A container dry run with `--home` keeps the network bridge on.** Stub EVERY
  venue a dry run names, or name only stubbed ones.

### Subagents

- **Send only the rows the question applies to, and only the fields it reads.**
  Every token is her allowance.
- **Wording is not a control.** Five jobs told what not to do; four disobeyed.
  Remove the tool or check the answer.

---

## 7. Open work

Everything not listed here is finished. Do not reopen a closed item without a
new fact.

### 1. The cloud ledger — on branch `claude/ledger-cloud`, in trial

**What it is:** the ledger kept in the page's own store, saved about a second
after every change, instead of living only in her exported file. Her reopening,
24 Sep; built 25 Sep. **Branch only — `main` and her published app do not have
it.** Code: "THE CLOUD LEDGER" in `Cat_Watch.jsx` on the branch. Screen spec:
`docs/app.md` §9.

**Where:** test page **https://claude.ai/artifact/CbUv5Fcwt1R3kug7azGNmf**, its
own store, all four capabilities. **Her working app since 26 Sep: she works ONLY
there, on her real ledger, in ONE tab on ONE device** (a second copy is read
only, below). Buttons: **Load** (a ledger file), **Save**, **Import** (a sweep
CSV) — `main`'s Import, Export and Import Refresh, renamed.

**Versions** (the branch's own series: `main`'s number, then the cloud count):
live on the test page **40 · cloud 4**, published 4 Oct (Cincinnati added). Cloud-only in it:
the read-only lock (below); a roll-back's safety copy names the save by its
time (CL-T1–3); Cloud Saves' times share one width. The cloud count moves only
when she says. Merge `main` in again before the page is rebuilt. The page's
title is "Cat Watch Cloud Test" — set it in `build/dist/index.html` before
publishing (the shell says "Cat Watch").

**What the store holds:**
- **The live ledger** — the only thing the app reads and writes as she works.
  Compressed; a large ledger splits into pieces, same code.
- **Cloud Saves** (snapshots in the code) — whole copies, never rewritten, never
  pruned (her choice). Same store as the live ledger, her yes 25 Sep.
- **The sweep log and quarantine** — during the trial the TEST page's copies are
  the live ones (a page reads only its own store). Seeded from her app 26 Sep.

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

**Her tests, all passed (26 Sep–1 Oct):** load, change, reload, roll-back,
Save, Download and Load, close and reopen, a real sweep Import.

**Two copies open: the later one is READ ONLY** (her ruling, 1 Oct). It opens
empty and writes nothing — "Open it" shows the cloud copy when she asks, never by itself (her ruling, 4 Oct); an edit record with a heartbeat decides,
stale after a minute; every save checks it first. A republish while her page is open can lock the new page for up to a minute — accepted, her ruling 4 Oct (a same-tab fix did not hold and was removed). Design: "ONE COPY EDITS AT A TIME" in the code;
`cloud_two_copies.js`, TC-001–010.

**Next:**
1. Her normal use, over several sessions; she reports what surfaces. On request,
   read the store and check it against her file. **4 Oct:** the cloud copy works
   well, but she has been opening it ("open it") and not exporting on leaving —
   so Loads were never checked. **One more week, from 4 Oct:** export on every
   exit, Load that file next time, read the match line.
2. `CLOUD_OPENS=true` once Loads have matched every time — her call. **Load
   stays for good** — it is how she opens a backup.
3. Merge to `main` and publish to her app — her call; §4's rules apply. **First
   copy the test page's `sweeps/venues`, `quarantine/rows`, `venues/occasional` and `links/pending` into her app's
   store** (quarantine merged latest-wins, never replaced).
4. Google Drive backup by button — on the table, never automatic.


### 2. Add by link — 39.5 signed off on her 10 links; a new venue still to see

**Her test, 4 Oct (39.5):** all 10 original links imported; the shop finder
better; catalogue lookups at Thyssen and Mauritshuis found the catalogue. Left
here for now. **Open:** how the finder does on a venue it has never met — she
will see when she next adds one by link. A miss is a finder bug (below).

Rules this work settled (code and tests carry the detail; `docs/picked_shows.md`):
- **An import she does not finish keeps NOTHING** — CSV or links: new venues
  and shops, Confirm / No shop / Look again, a CSV's sweep log, the paste box.
  All stored when the ledger moves; Cancel import drops them; Back keeps them.
  A file or Read with nothing to propose counts as finished.
- **Books and ONLY books** — a section mixing books with other goods is never
  taken; the finder looks inside it for a books-only one. Catalogues ›
  publications › books. Never a front page.
- **She never feeds the app a shop link**, and "no shop found" is not an answer
  from a museum that has one.
- **The finder's search sends two queries in one call** — hers and "<venue>
  shop books publications" (Detroit's "DIA Publications" came only with both;
  her keyed connector, 4 Oct).

### 3. Fixes not yet checked in the cases they were written for

1. **Borghese: 7 titles still in capitals.** The site answered on 5 Oct and the
   sweep still wrote all 7 in capitals; the title check changed none. Her import
   file has them corrected by hand (2 from the venue's text, 5 by hand, 23 Sep),
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
`moma` (1 Oct).** `uffizi`'s shop sells no books — settled.

- **OPEN — the publisher step's verdict is not stable.** *Metamorphoses*
  (Hannibal), two fresh lookups, same code, 1 Oct: "Publisher's section", then
  "Publisher" (right). Cause unproven — a different candidate page, the page
  returning empty (`pageIsShell`), or the read judging one page differently.
  Only that lookup's log settles it ("Show diagnostic" keeps the last action's
  only); if it recurs, get the log first. A log per card: offered, not built.

### 5. The monthly container sweep — confirmation re-run 15 Oct

**She sweeps no more than once a month.** The container's half runs itself:
the "Monthly container sweep" routine, the 5th, ~2am Sydney, follows
`.claude/skills/monthly-sweep/SKILL.md` — sweep, QC, push, report; anything
needing a re-sweep or a code change waits for her. She then does the home
sweep, and a session with her stitches and compresses (her design, 2 Oct).
**Every run — container and home — goes through `.claude/skills/sweep-qc/`
and has its faults fixed before anything is stitched** (her ruling, 5 Oct):
the routine runs it on its own run; she starts a session for her home run.
**The routine has the repo attached** (her setting, 5 Oct) — without it the
session clones read-only and cannot push. It sweeps only the container's 21;
its report never names a home venue (her ruling, 5 Oct).

**First run, 5 Oct — a test, not imported** (`run_2026-10-05_015417`, 359
rows; Cincinnati 31, her count). Its report guessed where code could know, so
`sweep_diff.js` now works out each change's cause and the skill asks only for
the UNEXPLAINED pile. Faults found and fixed on her saves the same day: V&A
Displays back (badge now inside the link), National Gallery catalogue promo
read as the text, Cincinnati captions (prose in divs; prose under an "Extended
Hours" heading), Brera credit label, Tate dining panels. Rijksmuseum shortened
its own pages — no fault. Louvre refused 3 pages.

**Re-run 15 Oct, 1:53am Sydney** — this session fires the routine (a
`send_later`). Her test: it pushes and reports in the new format; the five
fixed venues come back clean; nothing new broken. Good → she imports that run.
Not good → more work on the routine or the recipes.

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
  websites. A background shop check on every click. Linking straight to an
  Amazon product page from an ISBN-10. Pointing the shop link at an ISBN search.
  **Asking a Shopify shop directly whether a book is for sale** (1 Oct):
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
  (28 Sep) — Chrome refuses a program attaching to its main profile, her personal
  browsing stays out of this, and the Morgan checks her own browser every visit
  while the seeded profile is not checked. **Fetching a blocked venue through the
  Parallel connector** (29 Sep) — no more new methods to chase a venue.
  **Splitting one venue across days, or a slower pace** (29 Sep).

**Corrected along the way:** Chat can **not** fetch any URL cold. The Italian
venues are four different situations. The AbeBooks link is
`/servlet/SearchResults?ds=30&dym=on&kn=…&rollup=on&sortby=17` (lowest total
price, her ruling 1 Oct).

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
| `docs/picked_shows.md` | Add by link — design, rulings, store, shelf rule, 3 Oct test | Changing Add by link |
| `docs/library.md` | Purchase tracking and a Library tab — **future consideration, never propose** | She raises it |
| `docs/review-2026-09-12.md` | Her venue-by-venue review | Before touching a reviewed venue |
| `docs/review-log.md` | Independent review findings and decisions | A reviewer raises something |
| `docs/store_backup_2026-09-21/` | A read-out of the page's store, as insurance | Only if the store is lost AND `sweep_log.js` cannot rebuild it |
| `scraper/compress_prompt.md` | Compression prompts and tuning | Changing summary wording |
| `docs/Cat_Watch_Sweeper_Brief_v2.docx` | The original Chat-Claude brief | Rarely |

Git holds the full text of everything compressed out of this guide —
`git log -- CLAUDE.md`.
