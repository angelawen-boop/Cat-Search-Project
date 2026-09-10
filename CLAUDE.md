# Cat Watch — project guide for Claude Code

**Repo:** `angelawen-boop/Cat-Search-Project`
**Last updated:** 10 Sep 2026 (independent review acted on — see Section 11)
**Source:** built from Cat Watch Handover v11 plus what this repo's own scraper work has since proven.

This repo now holds **two** things, and will hold both going forward:

1. **The app** — `Cat_Watch_v10.2_haiku.jsx`, a React artifact. Development of this is being **ported from Claude chat into Claude Code**, so app decisions get made here too, not just scraper ones.
2. **The scraper** — `scraper/`, which produces the CSV the app eats.

Neither exists for its own sake. The scraper feeds the app. Don't build either in isolation.

## Branching policy — read this first

**`main` is the trunk and the source of truth for the whole project — app and scraper
both.** Work there by default. This document lives there and nowhere else; there is one
copy of it, on `main`.

The scraper and the app are **coupled**: they agree on the pro forma CSV columns
(Section 3). If the scraper changes what it writes, the app has to agree in the same
breath. On one branch that is a single consistent commit. Split across branches, they
drift, and it surfaces at import time. That coupling — not tidiness — is why they live
together.

**Branches are for separating in-progress work from known-good work, not for separating
components.** Use one only for a side quest or experiment that might be thrown away and
never merged. Merge or abandon it quickly; a branch left to age becomes a merge conflict.
A previous session's stealth-plugin attempt is the model: exploratory, didn't work,
correctly stayed on a branch, correctly abandoned.

Everything routine goes straight to `main`.

### Branches that exist and what they are

- **`main`** — the trunk. Everything.
- **`claude/personal-tracking-ledgers-z49s2h`** — **dead**. An old session branch that
  was for a while the repository's *default* branch on GitHub, so new sessions opened it,
  found no CLAUDE.md and a pre-date-handling scraper, and reported the project as barely
  started. If a session tells you the scraper has no date handling and no project guide,
  it is on that branch: ignore it and check out `main`.
- **`claude/headless-chromium-claude-code-wl94l0`** — where the 7 Sep scraper work was
  developed. Merged into `main`; nothing unique on it.
- **`claude/playwright-scraper-prototype-z68iko`** — a parallel session's experiment with
  routing Chromium through the proxy and a stealth plugin. Its own commit message records
  the result: "both insufficient". Forked before the current scraper work, so **do not
  merge it** — its `sweep_prototype.js` would undo everything. It holds one standalone
  file, `scraper/tls_fingerprint_test.js`, that could be cherry-picked if ever wanted.

**Note on session branches:** Claude Code web sessions are each handed their own branch
name automatically at startup. That is the tool's habit, not a decision. Such a branch is
a working copy to merge back and abandon, never a candidate for the truth.

**This is now enforced, not just written down** (10 Sep 2026). The startup instruction
the web tool injects — "develop on branch X" — outranks this document, so the policy was
being ignored despite being the first thing in the guide. `.claude/hooks/session-start.sh`
switches the session to `main` before work begins. It refuses to move if the working tree
is dirty or the branch already carries its own commits, so it cannot discard anything. It
also runs `npm install`, so `npm test` works with no manual step.

## 1. House rules for this repo

These are the rules for Claude Code sessions. They will grow over time; right now there is one, and it is not negotiable.

**Plain English, ELI5 for a non-technical reader — but never use that as cover for explaining less.**
The owner does not read code and does not want to. Explain the logic, the trade-off, the limitation, the risk — all of it — in easier words. Simplify the *language*, never the *substance*. Leaving out a real problem because it was hard to phrase simply is a failure, not a kindness.

### Carried over from the app project (still apply here)

- **Be concise.** She is optimising for decisions-per-minute. Cut hard after thinking. Short bullets over paragraphs.
- **Never propose dropping a feature or accepting reduced functionality as the fix.** The tool exists to do more automatically. When something breaks, make it work.
- **No undiscussed changes, no silent workarounds, no shortcut fixes.** Fix the real problem and say what you did.
- **She will not manually enter exhibition data.** Treat that as a fixed constraint, not an open question.

### Put it in code — her rule, 10 Sep 2026

**Hard code beats a Claude Code session, and a Claude Code session beats Chat
Claude.** Push every job as far up that order as it will go.

The test for where something belongs:

> **Does the task have exactly one correct answer, derivable from the inputs?**

- **One correct answer → code.** Merging files, choosing which venues still need
  running, validating a date, resolving a link. These must never be prose rules
  that a session re-derives each time, because that is precisely how a CSV gets
  mangled — and when it does, the damage is invisible until it reaches her.
- **Many acceptable answers, or judgement about the outside world → a model.**
  Compressing curatorial prose into a six-word teaser. Reading a page nobody has taught
  the scraper about.
- **Even then, a model touches strings, never files.** A script owns the CSV and
  asks for a value; the model never sees a comma or a column. The only thing it
  can then get wrong is wording, which is visible on the approval card anyway.

This rule has already reversed one decision. Reconciling part-finished runs was
going to be a written procedure for a session to follow; applying the test moved
it into the scraper as the run-directory design, which deleted the problem
outright instead of documenting it.

Chat Claude has no project context and cannot read this guide. Prefer Claude
Code for anything it can reach; Chat Claude only where the network genuinely
blocks us (Section 6a).

### Specific to Claude Code

- **Destructive actions need a confirmed backup or an explicit yes.** Same rule as the ledger.
- **Long runs need progress.** A backgrounded command shows nothing until it exits, which reads as the session having died. Run long jobs in the background and report progress as they go.
- ISBN-13 is always displayed `xxx-xxxxxxxxxx` (3 digits, hyphen, 10 digits).

---

## 2. What the app is

Cassili collects art-exhibition catalogues. They go out of print fast once a show closes, then resale prices climb. **Cat Watch** tracks temporary exhibitions and their catalogues at a chosen set of museums and galleries, and shows an urgency signal — how close each catalogue is to its likely out-of-print window — so she can buy before it's too late.

It runs as a single React artifact inside Claude. Real ongoing personal use, not a demo.

**Core mental model (load-bearing):** the app is the *tool*; the ledger is the *document* — like a word processor and a file. Data lives in the ledger, never baked into the tool long-term.

**The ledger** holds every tracked exhibition plus her marks: watching / dismissed / want-catalogue / acquired / catalogue details. Losing or silently corrupting it is the worst outcome the whole design guards against.

### Current build

`Cat_Watch_v10.2_haiku.jsx` (1047 lines). A second identical copy exists on Claude chat differing only in one model string (`Cat_Watch_v10.2 sonnet.jsx`). Choosing between them is an open decision — see Section 8.

### What's built and passed testing

**Loading and saving (v8.3).** Old-school word-processor model. She holds the only real copy of the ledger as a file on her disk / Google Drive; the app is just the workspace.
- Open the app → empty portal. No auto-loading from anywhere.
- Import → pick ledger file → loads on screen.
- Three status states, one status line: fresh load or Reset, untouched → calm neutral; after any change → loud red **UNSAVED CHANGES**; after Export/Save → calm green **✓ Saved — safe to close** with filename, flipping back to red on the next change.
- **Export button IS Save** ("Export / Save") — downloads a timestamped ledger file.
- Import and Reset each ask "replace what's on screen?", but only when there's unsaved work.
- Toolbar is one line: Import and Export / Save on the left, Import Refresh right-justified.
- Reset ledger (bottom) force-loads the built-in starter set and counts as a fresh load.
- **Accepted limit (her decision):** the green tick can't be fully honest — Claude's download prompt has a Cancel the app can't detect, so escaping the download still shows green. She lives with it. Do not re-add a confirm step and do not remove the green tick.

**Refreshing for new exhibitions (v9.2).** The app does the thinking; she approves each change.
1. A sweep produces a pro forma CSV. (Historically Chat Claude did this by hand; that's what the scraper is replacing.)
2. She feeds the file in via **Import Refresh**.
3. The app compares the sweep against the ledger — instant, no internet, reads only file text and the on-screen ledger, never visits a link.
4. Shows "X proposed changes" as cards grouped by venue. Nothing touches the ledger yet.
5. She works through them → "Go ahead and update the ledger" → accepted changes apply at once.
6. Teal "Refresh applied…" banner → she's unsaved → she exports.

Proposal types: **Add** (new show), **Fill/Change** (matches existing; per-field accept/reject showing old→new, plus an escape hatch "No — this is a different show, add as separate entry"), and **Couldn't be filed** (unknown venue code or no title; shown with a note, Dismiss only). Bad data is always surfaced with a note, never silently dropped.

Refeed workflow: reject bad rows, fix only those cells in the CSV, refeed the whole file. Already-applied rows stay silent because they match; only corrected rows resurface. Don't alter other rows between feeds.

Deliberately **not** built: bulk-approve, in-app field editing (fixes go through CSV + refeed), and the mirror case where the app proposes Add but it's really an update.

**Sorting, timestamps and dividers (v9.3).** Most at risk of looking "broken" later when it's actually working as designed.

- **Timestamp scheme — do NOT "simplify".** Every import stamps **one shared time for the whole batch**, so a batch sorts together as a block. A new import gets an `addedAt` only, never an `editedAt`. `editedAt` is set only when a later sweep actually changes an existing entry. The ~110 seed entries have no timestamps at all — a permanent "Original set" floor. This is the only way to tell apart this import, earlier imports, imported-but-never-edited, and the seed. Collapsing it silently destroys the "Never edited" band.
- **Date ladder** (within-group order, used everywhere): just opened → on now → dates unclear → announced → closed <3mo → 3–6 → 6–12 → over a year. "Dates unclear" sitting between "on now" and "announced" is her explicit choice.
- **Recently added** bands: This import / Earlier imports / Original set.
- **Recently edited** bands: This import's edits / Earlier edits / Never edited / Original set — one more band than "added", because there are two kinds of not-in-an-edit-batch.
- The same exhibition can rank differently under the two sorts. That's correct; they answer different questions.
- **Default post-import view:** the just-touched batch floats to the top under a single "Rest of the list" divider, and vanishes on any sort click.
- **"Announced last"** applies to the Wanted filter only — nothing to buy yet.
- **Acquiring filters** are AND across the three axes (status, closing window, catalogue), OR within one axis. "3+ mos" means closed 3–6 only; "6+ mos" means 6-and-older; both together means everything 3mo+.

**Urgency tiers** are computed live from dates versus today (`tierFor` in the JSX). No data is written and no internet call is made. The tiers are: Announced, Recently opened (open ≤6 weeks), On now, Dates unclear, Closed under 3 months, Closed 3–6 months, Closed 6–12 months, Closed over a year.

**Catalogue lookup (v10).** The app's one live internet function, and the only thing that spends tokens. Runs when she clicks "Find catalogue" on a single exhibition. Two steps, deliberately frugal:
- **Step 1 — shop only.** Searches only the venue's own shop domain (hard allow-list at the tool level), hard cap of 1 search.
- **Step 2 — broad, only if Step 1 found nothing.** One wider web search to confirm the catalogue exists anywhere.
- Results are tagged shop / web / none, driving three drawer states: "In the museum shop" (green, with product link), "Not in the museum shop" (generic shop link plus reseller links), or "No catalogue found".
- Reseller links are built by the app from the ISBN or title: Amazon AU, AbeBooks, Alibris. The publisher link is passed through from the lookup only when found.
- It's one function (`askClaude`); swapping the model is a one-line change.

### Ledger row shape

`id, museumId, title, startDate, endDate, summary, exUrl, interested, watching, acquiring, looked, hasCatalogue, catalogueTitle, isbn13, publisher, publisherUrl, shopUrl, shopState, addedAt, editedAt`

Ledger backup format is JSON. The sweep pro forma is CSV.

### JSX validation

`tsc check.tsx --jsx preserve --noEmit --skipLibCheck --allowJs --target esnext`, filtering for `error TS1[0-9]{3}[^0-9]`.

---

## 3. The pro forma CSV — the contract between scraper and app

The **only** file the app ingests. Columns exactly, in this order:

```
venue_code, title, start_date, end_date, summary, url, notes
```

- CSV, not Excel. Excel silently reformats dates; the date guard lives in the app.
- Dates must be `YYYY-MM-DD`. The app blanks anything it can't read and puts a note on the proposal card.
- `venue_code` must be one of the known codes in Section 7. Unknown codes land in "Couldn't be filed".
- **Sweep lookback is 1 July 2024, permanently.**

### The scraper must never de-duplicate — a standing rule

**The scraper records everything it finds. It makes no judgement about duplicates, ever.**

Deciding whether two rows are the same exhibition happens in the app, at Import Refresh, where she sees each proposal and approves it. A scraper that silently drops rows it *thinks* are duplicates is making that decision unseen — and when its judgement is wrong the loss is invisible. That is exactly what happened: titles were extracted badly, so 32 real National Gallery exhibitions looked like 3 and 29 were destroyed on the way to the file.

Duplicates in the CSV are cheap. Deleted exhibitions are not.

**But know precisely what the app does and doesn't absorb**, because it is not a catch-all:

- **Across sweeps — handled.** A CSV row matching something already in the ledger becomes a fill/change proposal, not a second entry. Re-feeding the same file is safe; already-applied rows stay silent.
- **Within one file — NOT handled.** `analyzeProForma` compares each CSV row against the ledger only, never against the other rows in the same file. The same exhibition twice in one CSV produces **two "Add" cards**, and `applyRefresh` deliberately keeps both — it sees the id is taken and appends `-2` rather than merging.

So scraper-side duplicates are not silently absorbed; they surface as extra cards she has to reject by hand. That is the reason to keep the scraper's collection logic accurate — not tidiness, but avoiding duplicate ledger entries and manual work. Fix the cause of a duplicate; never paper over it by deleting rows.

**The one permitted exception: never read the same address twice.** Two rows with the
same URL are the same exhibition, always, with no interpretation involved — so
collapsing them cannot be wrong. Nothing cleverer qualifies. Same title, similar dates,
"looks like the same show" are all judgements, and the last one cost 29 National Gallery
exhibitions.

Three details make it actually work, all learned the hard way:
- Compare the **finished address**, not the raw link text. The same Acquavella page is
  linked both as `exhibitions/matisse2` and `/exhibitions/matisse2`, and trailing slashes
  vary. `normalizeUrl()` handles this, resolving each href against the page it was
  found on so `../` and protocol-relative links come out right.
- The guard spans a **whole venue**, not one page. It used to reset between a venue's
  current and past pages.
- **Only the scheme and host are lowercased.** Host names are case-insensitive by
  spec; paths and query values are not. Folding the whole address meant two
  exhibitions whose slugs differed only in capitalisation became one, and the
  second was counted as a duplicate rather than reported as lost — the exact
  failure this rule exists to prevent.

A link resolving to **another host** is refused and counted in its own `offsite`
column, each one logged. A venue page can link anywhere, and an external link
matching the venue's selector would pull another institution's exhibition into
these rows. Counting rather than discarding means a venue that legitimately uses
a second host shows up on the first run instead of quietly returning less.

When a link does appear twice, the surviving row gains an "Also listed on the venue's
'past' page." note. Information, never a silent drop.

### The notes column is written for her, not for a log

Whatever lands in `notes` is shown **verbatim on the approval card** in the app, and she
reads them one card at a time. So:

- **Keep them short.** State the fact and stop.
- **No advice, no instructions.** Not "worth a glance to confirm", not "needs filling in
  by hand". She can see the empty field and decide for herself.
- **Say WHY, not WHAT.** The app already reports empty fields itself ("No end date.",
  "No description."). The scraper's job is to explain the cause.

Good: `No closing date found anywhere on the venue's pages.`
Good: `Dates read from a sentence, not a date field: "23 June to 20 September 2026".`
Bad:  `NO_END_DATE: kept, lookback unverified`

Every row carries at least its source page, so a card always says where the entry came
from.

### Prefer structured data over guessing — everywhere

Some venues embed a **schema.org Event** block for search engines: title,
opening date, closing date and description as actual fields. Where it exists it
removes exactly the part that keeps breaking — every scraper bug so far has been
title-or-date extraction.

**This is universal logic, not a per-venue opt-in**, and deliberately so:
- a venue that *adds* structured data later is picked up with **no code change**
- a venue that *removes* it falls back to reading the page, silently
- it costs one failed lookup in HTML that is already loaded

It is a **bonus source, never a replacement**. Measured 8 Sep 2026: of the six
venues wired, only the National Gallery publishes it, and only on exhibition
detail pages — never listings. The listing still has to be walked to discover
which exhibitions exist, so the browser is always needed. This is not "skip the
browser for tidy sites"; there is one transport and one code path.

Treat it as helpful, not authoritative — it is published for Google and
sometimes goes unmaintained. Rows that use it say so in their notes, and its
dates go through the same calendar validator as everything else.

**It must be proved to belong to this exhibition before it is used.** A page can
carry several event blocks — the exhibition, a members' preview, a curator's
tour, a site-wide listing, stale metadata. `pickStructuredEvent()` accepts one
only on a confident name match; no match, or two equally good ones, and
structured data is skipped entirely and the prose fallback takes over. Taking
whichever came first is how another event's dates end up on this exhibition, and
a wrong date labelled "taken from the site's structured data" reads more
authoritative than a blank one — worse than nothing.

### What the lookback actually means

Keep an exhibition if it was **open at any point on or after 1 July 2024**.

- A show that ran March 2024 → September 2024 is **kept**. It was still open inside the window.
- A show that ran January 2024 → June 2024 is **dropped**. It had already closed.
- The test is on the **end date, never the start date**.
- A show whose end date can't be read is **kept and flagged**, not dropped — an unknown date is not evidence of being too old.
- **One exception, added 8 Sep 2026: a year with no day.** Acquavella's archive
  prints "Summer 2022" and nothing else; Borghese's prints "March / 2026". That
  is not an unknown date, it is a known but imprecise one, and no reading of
  "Summer 2022" reaches July 2024. So the scraper takes the **latest possible
  day of that year** as an upper bound and drops the row if even that is before
  the floor. The bound is used for the lookback test only — **nothing is written
  into the date columns**, because the venue never published a day.

---

## 4. Why the scraper exists

This is the whole reason this repo has a `scraper/` directory.

The app needs exhibition data. Getting it turned out to be the hard part of the project, not the easy part.

Chat Claude's fetch tool **retrieves a page before its JavaScript runs**. Modern museum sites are "shell-plus-database" designs: the HTML that arrives is an empty frame, and the exhibition list is injected by JavaScript a moment later from a database. So the fetch tool sees an empty shell where a human sees a page full of exhibitions. Extended testing across Sep 6–7 2026 confirmed this is architectural. No amount of brief-tightening, prompt-crafting or search-strategy improvement fixes it. **The tool is the constraint.**

On top of that, the Chat-Claude sweep is manual, slow, costly in tokens, and requires her to babysit it.

**A headless browser fixes this at the root.** It is a real browser with no window drawn on screen. It loads the page, runs the JavaScript exactly as Chrome would, waits for the content to appear, and only then reads the text. What the fetch tool couldn't see, it sees.

### The chosen shape

Handover v11 Section 12 listed four options. This repo is **Shape B**: the headless-browser script lives in Claude Code's environment, and Claude Code runs it. Decision on where summary compression happens is still open (Section 8).

**Target output:** a CSV in exact pro forma format, with the **summary column carrying the raw curatorial text dump** rather than a finished short summary. A later compression step turns raw text into the teaser she reads (about six words — see Section 8). Keeping the raw text is what makes fabrication structurally impossible — the compressor can only compress what's actually in the record.

The 6-venue prototype is finished end to end before the other 15 are wired —
see Section 8.

**Final goal:** she feeds the compressed CSV straight into Import Refresh without checking it by hand.

### Scope

**Wire in all 21, including the ones known to refuse us.** The current 6 are a prototype.

A blocked venue costs almost nothing: the site answers "get lost", the scraper logs the code and moves on without ever opening a detail page. Measured in the 7 Sep sweep — Met's two refused pages took 1.5 seconds, Morgan's three took 1.3 seconds.

Leaving them wired in buys a **standing monitor**. Blocks are not permanent facts; IP reputation changes, Cloudflare rules get retuned, institutions change policy. If access ever becomes possible, the next sweep says so. Dropping a venue from the list means never finding out.

Two conditions keep this honest, and both are cheap:
- **Never retry a blocked venue inside a run.** One attempt per page, log the code, move on. Repeatedly hammering a site that has said no is the thing to avoid; a single polite check per sweep is not.
- **Record the block code and the date** in the log, so "has anything changed?" is answered by evidence rather than memory.

---

## 5. Scraper — current state

### Files

- `scraper/sweep_prototype.js` — the real scraper. Playwright + headless Chromium. **This is the one being developed.**
- `scraper/sweep_fetch.js` — an older diagnostic copy using plain `node-fetch` and no browser. Kept as a fallback and a comparison point. Not being developed.
- `scraper/compress.js` — turns the raw curatorial dump into the short summary
  she reads. Pure logic; `scraper/compress_cli.js` is its command line.
- `scraper/date.test.js`, `scraper/compress.test.js` — fixture tests for the
  pure logic of each. `npm test` runs both.
- `scraper/output/run_<date>_<time>/` — one directory per run (see below).

Run:
```
node scraper/sweep_prototype.js              everything
node scraper/sweep_prototype.js ng rijks     named venues only
node scraper/sweep_prototype.js --continue   finish the newest run
node scraper/compress.js                     plan compression of the newest run
node scraper/compress.js <run> --apply       write sweep_compressed.csv
npm test                                     all fixtures, ~1 second
```

### A run is a directory, not a file

```
scraper/output/run_2026-09-10_183045/
    ng.csv  rijks.csv  acq.csv     one file per venue
    sweep.csv                      all of them — this is the file she imports
    log_<stamp>.txt                one per invocation
```

This shape is doing real work, not filing:

- **A venue file is written only once that venue finishes.** So a file existing
  means that venue completed, and a run that dies mid-venue leaves no half venue
  behind. There is no "did it finish?" question to answer later.
- **Re-running a venue overwrites its own file**, so one exhibition can never
  appear twice in a sweep. Duplicates *within a single file* are the one case
  the app does not absorb (Section 3) — each becomes a second "Add" card — so
  making them impossible beats detecting them.
- **`--continue` needs no stored state**: "what still needs doing" is "which
  venues have no file here yet". Nothing to go stale, no flag to misread.
- **`sweep.csv` is rebuilt from the venue files at the end of every run**,
  including a `--continue`. It is the cumulative record of one run date, so a
  sweep that took three invocations still produces one file. Rebuilding rather
  than appending makes it idempotent.

Timestamps are **Sydney time**, fixed to that zone rather than the machine's, so
a run from this container and a run from her laptop stamp the same way.

**Nothing is left for a person to reconcile afterwards.** That was deliberate:
prose rules that a session re-derives each time are how CSVs get mangled.

### Runs are committed, not thrown away

`scraper/output/` is **deliberately not gitignored** (10 Sep). The container is
temporary: when a session ends, anything unpushed is gone — so a finished sweep
could be lost simply because nobody asked for the file before the session
closed. The run was wasted not by failing but by never being collected.

Committing runs also means **a later session can read an earlier sweep** to
diagnose a change, instead of her having to find and re-upload "the CSV from
that date".

**Commit the run directory when a run finishes.** Size is not a reason to
hesitate: a 21-venue run is ~500 KB of text today and ~120 KB once summaries are
compressed. Keep old runs; they are the only record of what a venue looked like
before it changed.

One gap remains, honestly: if the container dies **mid-run**, before anything is
committed, that run's completed venues are still lost with it. Committing per
venue as files appear closes it. Git is deliberately not built into the scraper
— credentials and push targets differ between this container and her laptop, and
that is exactly the kind of thing that fails silently.

### The network bridge — don't remove it

In this Claude Code container, all outbound traffic goes through an agent proxy. **Chromium cannot use that proxy.** The connection tunnel opens, Chromium sends its (unusually large, ~1.8 KB) TLS greeting, and the proxy drops the tunnel — surfacing as `net::ERR_CONNECTION_RESET` on every single https page. Setting a proxy on `chromium.launch()` does not fix it, and neither does ignoring certificate errors, because it is not a certificate problem. `curl` and `openssl` to the same sites work fine; their greetings are small.

**The fix, which is proven and in the code:** Chromium does no network I/O at all. Every request it makes is intercepted and answered by Node, which reaches the internet through the proxy without trouble. Chromium still parses, renders and runs JavaScript exactly as normal. This is `installNetworkBridge()` in `sweep_prototype.js`.

Two consequences worth knowing:
- Because Node does the TLS handshake, the connection's fingerprint doesn't match the Chrome user-agent the page sends. Sites that check for that mismatch may notice.
- Image, media and font requests are deliberately dropped — they cost time and contribute nothing to text scraping.

### Why pages no longer hang

The scraper used to wait for `networkidle` — no network activity for half a second — before reading a page. **Museum sites never go quiet.** Analytics, chat widgets and lazy-loading media keep chattering indefinitely, so the wait expired at 30 seconds on pages whose text had been readable for 3 seconds, and the fully-loaded page was thrown away. That was 55 failures in one run.

It now waits for the HTML, then for the body to actually contain text, and ignores the background noise. Acquavella's listing went from a 30-second timeout to a 3.6-second load.

Leaving a page early has a knock-on: requests from the previous page are still in flight when the next navigation starts, and answering a request whose page has gone throws. Unhandled, that poisoned the *next* navigation and produced a cascade of "interrupted by another navigation" across every venue — a run where all six returned zero. Route calls are now wrapped and `safeGoto` retries once. **Don't unwrap them.**

### How the scraper is organised

**One engine, one recipe per venue.** The split follows what the logic is *about*,
not whether it happens to be shared:

**Universal — in the engine, and a fix here helps all 21 venues:**
fetching and waiting, the counters, the URL-identity guard, the lookback rule,
structured-data-first, **parsing a date string once you have it**, writing the CSV.

**Per venue — in `VENUES`, one readable block each:**
which pages to visit, which links are exhibitions rather than navigation, where
the title sits, where the dates sit, what boilerplate to strip.

There is no clever general rule for the second list, and **every attempt at one
has cost us.** A rule learned at Borghese — "never read the title from above the
link", because its archive returned the first card's heading for every card —
was already wrong at Rijksmuseum a day later, where the title lives exactly
there. A venue writes down only what differs from the default.

Debugging one museum means reading one recipe. Adding a venue means writing one,
not adding another branch to shared code.

Recipe options so far: `selector`, `isNav`, `title` (heading / card / strip
rules), `markEmptyPages` for venues that get blocked, `lookbackAfterDetail` for
venues whose listings carry no closing date, and `yearDropdown` for the Met's
year filter.

**The pure logic is covered by fixture tests** (`scraper/date.test.js`, run with
`npm test`): every date format in this guide, the four art-history traps,
cross-year ranges, impossible dates, URL identity and resolution, and
structured-data matching. No network, no browser, about a second.

Two of the defects the 9 Sep review found would have been caught here before
they ever reached a CSV, which is why the tests exist. **What they cannot do is
tell you a venue redesigned its pages** — they test the logic, not the
assumptions about the outside world. Only a live run does that.

### How a listing page is read

Every venue goes through `collectFromListing()`. Per page it reports:

```
seen -> navigation / already-seen URL -> collected (n of them with no readable title)
```

and the run ends with a coverage table. **Every link is accounted for by a
number.** Nothing disappears silently.

**Titles come from the page's own heading where there is one**, never from the
first line of link text — that captured badges ("Past exhibition", "Free") and
made 32 National Gallery exhibitions share 3 titles. Where a venue wraps only
the *image* in the link (Rijksmuseum's now-on-view page), the title is read from
the card container above it, guarded: at most 2 levels up, and nothing over 220
characters, since a container that has bled into its neighbours is far longer
than one title plus a date.

**A link with no readable title is never dropped.** It gets a row with a blank
title and a note saying what the URL slug suggests. The app shows it as
"Couldn't be filed" — visible and fixable. The slug guess stays in the notes and
never enters the title column.

### A venue that could not be read still says so, in the CSV

**Every venue leaves marker rows for listing pages it could not read** — one per
page, titled `[past page]` and so on, carrying the reason.

This was a per-venue opt-in (`markEmptyPages`) until 10 Sep, set only on
Borghese and Morgan. So **the Met, refused on every page, contributed nothing at
all** and its refusal was invisible unless somebody read the log. That defeats
the point of leaving blocked venues wired in (Section 4): a standing monitor
that reports nothing is not a monitor. It is now universal and the option is
gone.

**The reason says which kind of failure it was.** Everything that was not a
timeout used to come back as `LOAD_ERROR`, which could not distinguish a site
refusing us from one that had moved or was simply down — Borghese's outage was
exactly that ambiguity. `classifyLoadError()` reads Chromium's own network error
name, and `failureProse()` turns it into the sentence she sees on the card:

| What happened | On the card |
|---|---|
| HTTP 403 / 418 / 429 | the venue's site refused us (HTTP 429) |
| `ERR_FAILED` | the venue's site did not respond |
| `ERR_CONNECTION_RESET` | the venue's server dropped the connection part-way |
| `ERR_CONNECTION_REFUSED` | the venue's server refused the connection |
| `ERR_NAME_NOT_RESOLVED` | the venue's web address could not be found |
| `ERR_CERT_*` / `ERR_SSL_*` | the venue's security certificate could not be verified |
| navigation timeout | the page did not finish loading in time |

Measured 10 Sep: Met reports HTTP 429, Morgan HTTP 403, and Borghese
`NO_RESPONSE` — its server accepts nothing at all, rather than refusing us,
which is a site fault and not a block. A reason falling through to
`LOAD_ERROR, cause unknown` means a network error we have not seen before;
add it rather than guess at it.

### A transient failure is retried once — a refusal never is

**A page that fails to load costs more than an empty summary.** It costs the
row's dates, and a row with no end date cannot be dropped by the lookback — so
it arrives on the approval pile as a rogue undated card.

Proven across two runs: NG's *Impressionist Decorations* appears in the 9 Sep
run and is absent from 10 Sep. On 9 Sep its page failed to load, so it had no
dates and survived the lookback; on 10 Sep the page loaded, the dates were read,
and it was correctly dropped as pre-July-2024. The same run lost *Hockney and
Piero*'s summary the same way.

So `safeGoto` retries **once**, after two seconds, and only on a genuine network
fault: `TIMEOUT`, `CONNECTION_*`, `EMPTY_RESPONSE`, `NO_RESPONSE`, `LOAD_ERROR`.

**Every HTTP status is excluded, deliberately.** A venue answering 403, 429 or
404 has told us its answer; asking again is exactly the hammering the
standing rule forbids (Section 4). The retry exists for the case where we never
got an answer at all.

### A dying run is not a page failure — fixed 10 Sep 2026

**The run directory rests on one guarantee: a venue file on disk means that
venue finished.** That is what lets `--continue` work with no stored state.
It was not true.

Found while diffing three committed sweeps to measure how often venues reword
their blurbs. Acquavella appeared to have rewritten 9 of 16 descriptions in
three hours. It had not: **she stopped that run by hand mid-venue**, and the
scraper recorded the browser being torn down as nine ordinary page failures —
nine `LOAD_ERROR`s inside 19 milliseconds, each dutifully *retried* against a
browser that no longer existed, the venue then declared complete, and
`acq.csv` written with 10 of its 16 summaries missing. Nothing said so.
`--continue` would have skipped it, and the loss would have been permanent and
invisible.

**An interrupt only exposed it. A browser crash does the same with nobody
touching anything.**

Three parts, all needed — the first alone was tested and did not work:

1. **`classifyLoadError` knows a shutdown.** `Target closed`,
   `Browser has been closed`, `Execution context was destroyed`,
   `Target crashed` return `SHUTDOWN`, which is deliberately **not** in
   `TRANSIENT_FAILURES`, so it is never retried.
2. **`safeGoto` throws `ScrapeAborted` rather than returning `{ok:false}`.**
   A returned failure looks like a page that would not load, so the venue
   carries on and finishes; throwing aborts it, so `writeVenueCsv` is never
   reached and the next `--continue` redoes it intact.
3. **`rethrowIfAborted()` in every catch that continues past a failure.** This
   is the part that was missed first time and the reason the fix has to be
   stated as a principle rather than a patch: **a dying browser raises the same
   error from ANY Playwright call, not only from navigation.** The listing
   extractor's catch and the detail-page loop's catch each turned "there is no
   browser" into "this one page had a problem" and marched on. Every catch in a
   scraper is written for the page in front of it; that is right, and it is
   exactly why each one needs this guard.

Also added: a `SIGINT`/`SIGTERM` handler that sets `STOPPING`, so the venue in
progress stops at its next navigation instead of grinding through its remaining
pages as failures. A second Ctrl-C exits immediately.

**Verified 10 Sep by doing it**: an interrupted `acq` run now logs
`STOPPED mid-venue — nothing written` and leaves no file; an uninterrupted run
returns 15 rows, all 15 with curatorial text, Rosenquist included. Fixture
tests E-001 to E-006 cover the classification.

**Consequence for the compressor** (Section 8): when it reuses a previous
run's wording because a page did not load, **the row must say so**. Reuse that
silently papers over a scraper failure is worse than the failure.

### Reading dates

**All date parsing is shared, on purpose.** Every venue turns out to contain
several venues' worth of formats — the Rijksmuseum alone uses at least six — so
a pattern learned at one is worth having at all of them.

Sources, in order: **structured data** (Section 3), then the **listing card**
(`datesNearLink`, walking at most 2 levels), then **prose on the exhibition's own
page** (`findDateRangeInProse`), then a date-ish element as a last resort. The
detail-page scan runs whenever *either* date is missing, and **fills only empty
fields — the listing wins on disagreement**, so nothing collected is silently
rewritten.

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
```

**A range that runs backwards crosses the new year, and the opening year is
worked out rather than assumed.** "December 5 – January 20, 2026" opened in
December **2025**. Until 10 Sep the start simply inherited the closing year, so
that show came out ending seven weeks before it opened — and `sane()` was only
wired into the prose parser, never the listing parser, so the impossible range
went straight into the CSV. Museums run winter shows constantly; this was not an
edge case. There is exactly one reading of a backwards range, so this is logic,
not a guess, and the row keeps its dates instead of being blanked.

**Every date is checked against the calendar before it is stored.** `ymd()` is
the single gate — the parsers, and structured data via `isoDay()`, all go
through it. A day that does not exist in its month returns empty rather than a
string: JavaScript rolls `2026-02-31` silently forward to 3 March, so an
impossible date never announces itself, it just becomes a plausible **wrong**
one and can then decide whether a show passes the lookback.

**Her standing rule for dates, 10 Sep 2026:** where the code has applicable
logic it uses it; where it has none the date columns stay blank and the notes
explain why. Never a guess.

### A listing card is not a page — the loose rules apply to one, not the other

**The single most dangerous rule in the file is "one month name beside one
year".** On a listing card that is almost certainly the exhibition's date, and
it is the only thing Borghese's archive publishes ("March / 2026"). On a whole
page it is a lottery, because a page also carries navigation, photo captions, a
footer and the museum's opening hours.

Found in her 9 Sep test run: the Rijksmuseum's **Express yourself** page prints
its real run as `16 Feb - 9 June` with **no year anywhere**, so no pattern could
use it. The scan fell through to the bare month-and-year rule, which matched a
photo caption further down the page — *"Gerard Wessel, RoXY, Amsterdam, April
1994"* — and a 2024 exhibition was given a **1994** opening date. Not cosmetic:
that ranks it as thirty years closed, at the bottom of the urgency ladder.

So `findDateRange` takes `{ looseSingles }`, and `findDateRangeInProse` passes
**false**. Refused on page text:
- bare `Month YYYY` / `Month / YYYY`
- bare `Season YYYY`
- bare `Month D, YYYY` with no preposition

Still allowed everywhere, because two dates joined by a separator are not a
caption, and a preposition anchors a single one:
- every range pattern
- `until 20 February 2026`, `from 5 June 2025`

Express yourself now returns **no dates at all**, with a note saying so. That is
the correct answer — the venue never published a usable one.

**This is the date-shaped version of DEF-03** (Section 11): the summary
extractor has the same exposure to reading the wrong region of a page. Treat
this as evidence that the concern is real rather than theoretical.

### A date must be proved to belong to this exhibition — three sources, three guards

The 9 Sep review raised this against **structured data** only (IR-09): the code
took the first embedded event on a page without checking it was this
exhibition. That recommendation was implemented exactly as narrowly as it was
written, and the underlying principle — *prove a date belongs to this
exhibition before using it* — was not carried across to the other two sources.
Both then failed the same way within a day. **Read the principle, not the
finding.**

**1. Structured data → match the event's name.** `pickStructuredEvent()`. Fixed
10 Sep, IR-09 as written.

**2. Page text → refuse a sentence that contradicts what is already known.**
NG exhibition pages carry a list of related courses and talks. Waldmüller's page
advertises a course running "7 September - 28 September 2026", while its listing
card says the exhibition runs "Until 20 September 2026". The old rule was "fill
only what is empty", so it took the course's OPENING date and discarded its
closing date — the very thing proving the sentence belonged to something else.

No date-*shape* rule can catch this: `7 September - 28 September 2026` is a
complete range with a year, identical in shape to a real run. The only evidence
available is the contradiction, so **if either end of a prose range disagrees
with a date already collected, the whole range is discarded** — not merely the
conflicting half.

**3. Listing cards → stop at the edge of the card.** `datesNearLink()` walked a
fixed **two steps** outward looking for a date near the link, because the date
usually sits just outside the clickable area. A step count is not a boundary.
On the Rijksmuseum's past listing, one step up gave Farifteh's own
"1 NOVEMBER TO 11 JANUARY" — correct but with no year, so unusable — and two
steps up sat a box holding that card *and the next one*, "ISAMU NOGUCHI … 28 MAY
TO 26 OCT 2025". Those had a year, so they won.

The walk now stops as soon as a box contains **more than one exhibition
address** (`coversMoreThanOneExhibition()`), whatever its size or step count.
Verified live 10 Sep: Farifteh returns nothing from the listing where it
previously returned Noguchi's dates, while Metamorphoses and Ellsworth Kelly are
unchanged.

**Why losing that date is the right outcome**, and worth understanding: the row
is then incomplete, and an incomplete row is exactly what sends the scraper to
the exhibition's own page — which states "1 November 2025 to 11 January 2026"
plainly. The bad grab had cost the correct answer twice over, because a row that
looks complete is never followed up, and "the listing wins" would have blocked
the correction even if it had been.

### The half of this that is NOT solved

**There is no general way to tell an exhibition's dates from any other date on
its page.** All three guards above need something to check against — a name, a
contradiction, a card boundary. Where a venue's listing carries no dates at all
and its page carries a related event, the scraper has nothing to compare and
will take the wrong dates silently.

**This is the same problem as known bug 2** (nothing filters out
non-exhibitions), one scale up. Within a page: which of these dates is the
exhibition's? Across a listing: which of these entries is an exhibition rather
than a talk or a workshop? Both are "what is this content actually about", and
both become guesswork the moment a venue stops labelling things.

The answer follows the same ladder each time, and **Tate will exercise all
three**:
1. **The site says so** — Tate tags each item by type. Use the tag, exactly as
   structured data is used for dates.
2. **Structure implies it** — URL path shape, which block the text sits in, a
   "Category: Course" label beside it. Mechanical, so this is code's job.
3. **Neither** — the scraper genuinely cannot know, and the standing answer
   applies: collect it, flag it, let her decide. Never guess, never drop.

A venue that dumps everything on one page *and* tags nothing needs a different
answer, and we will not know whether one exists until we meet it.

**Every dash is normalised first** — U+2010 to U+2015, the minus sign and the
Hebrew maqaf. The National Gallery uses a figure dash on some cards and an en
dash on others; with only the en dash handled, "15 October 2026 ‒ 7 February
2027" missed every range pattern and fell through to the month-and-year branch,
which read it as 1 October 2026.

**Two guards stop art history being read as exhibition dates**, and both are
load-bearing on museum pages:
- A month **name** must sit beside the number, so bare years never match.
- The year must be plausible (**1990–2035**) — low enough for archives going back
  to 2013, far above any artist lifespan.

Verified against `Caravaggio (1571-1610)`, `stayed in Italy in 1629`,
`confiscated on 4 May 1607` and `August 17 1945`: all correctly ignored.

`sane()` drops a start date falling after its own end rather than emitting an
impossible range.

**The two parsers must not diverge.** `findDateRange` (listings) and
`findDateRangeInProse` (page text) drifted apart twice, and each time a venue
silently lost dates — once because only the prose parser knew word separators,
once because only the listing parser knew "Until 15 Jan. 2023". The prose parser
now falls through to the listing parser, so any format either knows is available
to both. There is also one shared `MONTH_PATTERN`; it previously existed as two
copies listing only full month names, which is why `12 SEP 2025` parsed to
nothing.

### The same exhibition linked three times on one card

A venue commonly links one exhibition several times in a single card: the
image, the name, and a "Find out more" button. The URL guard keeps the first —
and on the National Gallery the first is the **image**, which carries no text
at all. Renoir and Love arrived with no title and no dates while the very next
link on the same page spelled out both.

`fillBlanksFromRepeatLink()` fills the kept row's **empty fields only** from
the other links to that same address. This is not de-duplication and cannot
lose anything: those links were already one row, collapsed by the address rule.
Anything already read wins, so nothing is rewritten.

Button text is not a name — no exhibition is called "Find out more". `CTA_ONLY`
rejects a link whose whole text is one of those phrases, matched **whole**, so
a real title merely containing the word "Explore" survives.

"Also listed on the venue's 'past' page." is now added only when the repeat is
on a **different** listing page. Three links inside one card are a
page-building habit, not information.

### A page that loads is not a page that exists

`safeGoto` now refuses any HTTP status of 400 or more, not just the block
codes. A 404 still **serves a readable page**, and the Rijksmuseum's own past
listing links to three exhibitions whose pages are dead — so "This page does
not exist. The page you were looking for was not found." was stored as three
exhibitions' curatorial summaries, and nothing in the run said so.

Those rows are kept, as always, and carry "The venue's own link to this
exhibition is broken (HTTP 404)." The scraper does **not** guess at a working
address: `ed-van-der-elsken` happens to exist with the `/past/` segment
removed, but inventing URLs is a judgement that could land on a different show.

**A dead link stays in the URL column.** The note goes in `notes`, never in
`url` — so the app still gets a real address. On the approval card she reads
both. In the ledger the arrow renders and points at the venue's own dead page:
click it today and the museum tells her the page is gone; click it after they
fix it and it works. Blanking the URL would be worse, since `applyRefresh`
falls back to the venue's generic listing page when `exUrl` is empty, and an
arrow that silently goes somewhere else is harder to understand than one that
goes nowhere honestly.

**Verified 8 Sep 2026 across all 78 rows** of ng, rijks and acq: 75 URLs return
200, the three above are the venue's dead links, none contains consent or
navigation boilerplate, and no two rows share an opening line.

**Correction, 10 Sep:** that check also recorded "no summary is empty", which
was wrong — it was measured before the 404 fix landed, when those three rows
still held "This page does not exist…" as their curatorial text. **The three
dead-link rows necessarily have an empty summary**, because there is no page to
read one from. Empty is the honest answer; the note says why. A fourth row can
appear on any given run when a page simply fails to load — the 10 Sep run had
one, `hockney-and-piero-a-longer-look`, carrying "This exhibition's own page did
not load (LOAD_ERROR)". That is transient, not a defect, and a re-run usually
clears it.

### Travelling exhibitions — a note, never a merge

A venue with more than one address runs the same show in both. Acquavella lists
*Portraiture: From Cassatt to Warhol* in New York and *Portraiture From Cassatt
to Warhol* in Palm Beach — one exhibition, two runs, normally one catalogue.

Both rows are always kept, and the **city stays in the title** so the two read
as different entries on the approval cards. `noteTravellingRuns()` then adds
"The same exhibition is also shown at Palm Beach." to each. Matching ignores the
city and all punctuation, so the colon that is the only other difference between
those two titles does not defeat it.

This is a note and nothing more. It must never become de-duplication: a wrong
match costs one misleading sentence, never a row. A venue opts in by listing its
`locations` in its recipe.

### Last full-sweep result (10 Sep 2026, after the review fixes)

| Venue | Rows | Notes |
|---|---|---|
| `ng` | 27 | **matches her count of the live pages: 2 on now + 5 coming soon + 20 past.** No rows without a closing date. 10 of the 27 cross the new year and are now dated correctly |
| `rijks` | 37 | **10 current/upcoming + 14 past, both matching her count of the live page.** 3 rows are the venue's own dead links |
| `acq` | 15 | 14 are the rows verified on 8 Sep, unchanged. One extra — see below |
| `borghese` | — | **unreachable** on 8 Sep, not retried since, see 6a |
| `met` | 0 | HTTP 429, blocked |
| `morgan` | 0 | HTTP 403, blocked |

**Acquavella's extra row, and why it is probably right.** Coverage is identical
to the 8 Sep run down to the number — 119 seen, 11 nav, 0 off-site, 0 duplicate,
108 collected — so nothing new was found and nothing was lost. The difference is
in the lookback: the listing stage kept 15 rows on 8 Sep and 16 now, because one
row that previously received a closing date now receives none.

That row is `james-rosenquist-at-moma`: a 2012 announcement that a work by an
artist the gallery represents is on view **at MoMA**, opening 2012-01-26 with no
closing date published. Under the standing rule — an unknown end date is never
evidence of being too old — it is kept and flagged, which is what now happens.

**It was previously dropped, which means it was previously given a closing date
the venue never published.** The new plausible-year guard and calendar
validation refuse that parse. So the 8 Sep count of 14 matched her count partly
by luck: a row was being removed by a date bug rather than by the lookback.
**Not fully proven** — the offending string was consumed by the title strip and
is not recoverable from the output — so treat this as the best explanation
rather than a finished diagnosis.

It is also a non-exhibition, which the scraper does not filter (known bug 2). It
will appear as one card to reject.
### Known bugs — open

1. **Coverage against the venues' real totals is verified for all four working
   venues** — Rijksmuseum, Borghese, Acquavella and the National Gallery — each
   against her own count of the live pages.
2. **Nothing filters out non-exhibitions.** The only test is the URL shape — if a
   venue files talks, tours, opening events or permanent displays under its
   exhibitions path, they are collected as exhibitions. Rijksmuseum happens not
   to; **Tate is known to list everything on one "what's on" page, though it does
   tag each item by type**, so that tag is the hook when we get there. A venue
   that dumps everything *and* tags nothing will need a different answer.
3. ~~The summary column is not yet the raw-dump-then-compress design.~~
   **Built 10 Sep** — `scraper/compress.js`, see Section 8. The scraper still
   writes the raw dump, deliberately; `sweep_compressed.csv` is the file she
   imports.
4. **Title casing is inconsistent** — some venues apply capitalisation in CSS, so
   innerText returns caps for some cards and title case for others. **Her
   decision: live with it.** Genuinely all-caps exhibition titles exist, and
   telling them apart is not worth the logic.
5. **Nothing bounds a venue that hangs.** A *block* costs about a second — the
   site refuses and the run moves on. A *hang* costs the full 20s navigation
   timeout plus one retry on every page, so Borghese on 8 Sep could have added
   25+ minutes on its own. Deferred, not fixed: the run-directory design already
   limits the damage, since completed venues are safe on disk and a venue that
   times out is simply picked up by the next `--continue`. Revisit alongside
   parallelism (Section 11, DEF-01).

### Fixed — do not reintroduce

- `networkidle` waits (30s timeouts on pages that had loaded in 3).
- Unwrapped `route.fulfill`/`abort` calls (a cascade of "interrupted by another
  navigation" that returned zero rows for all six venues).
- Title-based de-duplication (deleted 29 NG exhibitions).
- Borghese's `/mostre/` selector (collected the navigation menu).
- Dropping links with unreadable titles.
- A cookie-banner filter that walked up to `<body>` and so excluded every
  paragraph on every page.
- Two copies of the month pattern, listing only full month names, so
  `12 SEP 2025 TO 25 JAN 2026` parsed to nothing.
- The plausible-year guard missing from one branch, so "confiscated on 4 May
  1607" became a start date of 1607.
- Six near-identical venue scraper functions (see the recipes, above).
- A single fixed `sweep_raw.csv`, which let a one-venue diagnostic run silently
  replace a full sweep's output while the file still looked complete. A run is
  now a directory.
- A hardcoded Chromium path, one image update away from failing at launch with
  an unhelpful error.
- A range with the year on the closing side giving the OPENING date that same
  year, so "December 5 – January 20, 2026" ended before it began — and no
  impossible-range guard on the listing parser to catch it.
- Building date strings by hand with `padStart`, with nothing checking the day
  exists. Everything goes through `ymd()` now.
- `parseMonthDay` matching the month as `[A-Za-z]+`, which stopped at the full
  stop `MONTH_PATTERN` allows — so `Sept. 21, 2024 - Oct. 12, 2024` matched the
  range pattern and then produced no dates at all, silently.
- The plausible-year guard missing from the day-first range branch — the busiest
  path in the parser — while every other branch had it.
- `normalizeUrl` lowercasing the whole address. Hosts are case-insensitive;
  paths are not, so two exhibitions differing only in capitalisation collapsed
  into one and the second was counted as a duplicate rather than lost.
- Joining hrefs onto the venue base by hand, which cannot resolve `../`,
  protocol-relative `//host`, or query-only links, and never checked the result
  was still on the venue's own site.
- Taking `events[0]` from a page's structured data without checking the event
  was this exhibition — a members' preview or a tour could supply the dates.
- `parseDateRange`, a second anchored date parser that nothing called. Dead code
  shaped like live code is a trap for whoever debugs dates next.
- Applying the bare month-and-year rule to whole page text, which read a photo
  caption ("Amsterdam, April 1994") as a 2024 exhibition's opening date.
- Giving up on a detail page after one transient network failure, which cost a
  summary AND let an out-of-range row survive the lookback undated.
- Keeping the FIRST link to an address and ignoring the rest, which cost Renoir
  and Love its title and its dates — the National Gallery's first link to a
  card is the image.
- Only the en and em dash being normalised, so a figure dash in a National
  Gallery date turned "15 October 2026" into 1 October 2026.
- Treating a 404 as a page that loaded, which stored "This page does not exist"
  as three Rijksmuseum exhibitions' summaries.
- Treating a torn-down browser as a page failure, so a run stopped mid-venue
  retried nine dead pages and then wrote the venue to disk as COMPLETE with 10
  of 16 summaries missing — breaking the one guarantee the run directory
  exists to give.
- Acquavella's title rule stripping `NEW YORK` / `PALM BEACH`, which made its
  two runs of one show read as the same exhibition. It now strips only the date
  tail — a month or season followed by a digit, so "April in Paris" survives —
  and the city stays in the title.

### Working order agreed with her

Two rules, both hers, both learned the hard way.

**Diagnose one VENUE at a time, not one ISSUE at a time.** Venues fail for
different reasons and jumping between them obscures more than it reveals. Tallying
by issue across six museums produced a headache and no decisions.

**Within a venue, work in this order:**
1. **Is it getting data at all?** — solved for 4 of 6; Met and Morgan are refused
   at the network door.
2. **Is it getting the right data?** — the current stage.
3. **Is it recording and outputting properly?**

**Ask her for the ground truth.** For both Borghese and Rijksmuseum she counted
the live pages herself, and each time that number found something the scraper's
own output could not have revealed — a missing venue path, a whole category of
unread titles. A count from the person who knows what the answer should be is
worth more than any amount of internal consistency.

---

## 6. What we know about venue sites

**Read this section with care.** It has two halves, and they were produced by two completely different tools.

### 6a. Proven by this scraper (a real browser)

This is the only part that describes how the *scraper* reaches sites. It is short because it is new, and it will grow to replace 6b.

| Venue | Finding | Evidence |
|---|---|---|
| `met` | **Hard blocked.** HTTP 429 on every page including `robots.txt`, on the very first request, with plain curl and no browser. This is an IP-reputation block on the whole datacenter range, not us going too fast. Delays won't help. `collectionapi.metmuseum.org` is unblocked from the same IP but covers collection objects, not exhibitions. | Verified repeatedly, 7 Sep 2026 |
| `morgan` | **Hard blocked.** HTTP 403 on all three listing pages and on `sitemap.xml`, from Cloudflare. Their `robots.txt` permits general crawling (`User-agent: *  Allow: /`) and permits AI "reference" use, but name-blocks a list of AI crawlers, and Cloudflare is refusing this network before any of that applies. | Verified 7 Sep 2026 |
| `ng` | **Works well.** Past archive loads 183 entries in one page. Dates live in the card wrapping each link, day-first format ("7 November 2025 – 10 May 2026"). | Full sweep |
| `rijks` | **Works, fully worked through.** See below. | Full sweep + her count of the live pages |
| `acq` | **Works.** One page carries current, upcoming and past together. Dates are in the link text itself ("… NEW YORK OCTOBER 16 - DECEMBER 5, 2025"). Its archive has year-range filter links (`/exhibitions/past/all/2023-2021`) which are navigation, not exhibitions — following them dragged in the whole catalogue back to 1999. | Full sweep |
| `borghese` | **Reaches the site**, contradicting the old "robots-blocked" note in 6b. Fully worked through — see below. | Full sweep + 40 detail pages |

**Two of six venues are blocked at the door.** For those, the headless browser doesn't help — the refusal happens before any page is served. Options are running from an ordinary home connection instead of a datacenter, asking the institution directly, or falling back to the Chat Claude route (different network, behaves like a person browsing). Engineering around a deliberate block is not on the table.

They stay wired in regardless — see Section 4. A refusal costs about half a second and tells us whether anything has changed since last time.

#### Rijksmuseum — worked through in full, 8 Sep 2026

Verified against her count of the live pages: **10 current/upcoming, 14 past
inside the lookback.** Both exact.

**Two different card layouts on different pages.** The past page puts a heading
inside the link ("METAMORPHOSES"). The now-on-view page wraps only the IMAGE, so
the link contains nothing but a "LAST CHANCE" badge where one exists — which is
why the scraper once reported 10 exhibitions found and 0 titles read, and the
two it appeared to get were badges. Title now falls through to the card
container, guarded (see Section 5).

**Some entries are linked to the DUTCH site from the English listing** —
`/nl/zien-en-doen/tentoonstellingen/...` rather than `/en/whats-on/exhibitions/`.
Stop Motion is one, and a selector looking only for the English path missed it
entirely — an invisibility, not a date failure. The recipe accepts both paths and
filters the "Nederlands (Dutch)" language switcher as navigation. Expect other
multilingual venues to do the same.

**At least six date formats across its own pages**, apparently hand-assembled
one exhibition at a time — see the list in Section 5. Its older archive entries
use Dutch `t/m`.

**13 past rows still have no closing date, and that is a site limit.** Checked
individually: Ellsworth Kelly says "Until 24 October" with no year anywhere to
borrow; Slavery and Richard Long publish no dates at all; REVOLUSI!'s only
date-shaped text is "August 17 1945" in its article body, which the year guard
correctly refuses.

**No structured data**, before or after JavaScript — checked both.

#### Borghese — worked through in full, 7 Sep 2026

**Its exhibitions do not live under `/mostre/`.** Those three pages are the listings
themselves, and their only `/mostre/` links are the site's own menu (ITA, Exhibitions,
Current, Past, Upcoming). Individual exhibitions live under **`/en/exhibition/`**. Looking
for `/mostre/` was the entire reason this venue returned exactly one row per page — it was
collecting the navigation bar.

Page counts now: **1 current, 0 upcoming (correctly blank), 40 past.**

**The site publishes almost no dates, and this is a hard limit rather than a bug.**
Checked across all 40 past pages:

| | Pages |
|---|---|
| End date readable from prose | 17 |
| No month-name date anywhere in the text | 22 |
| Numeric date range (`21.06—15.09.2024`) present as **text** | **0** |

The 22 write their dates **inside the poster image**. Verified on the Louise Bourgeois
page: `21.06`, `15.09` and `2024` appear nowhere in the page's text or HTML, only as
pixels in `05-GB-Bourgeois-web_02-scaled.jpg`. No text scraper reaches them. Those rows
are kept and flagged, per the lookback rule.

Consequence: Borghese returns ~30 rows where ~7 are in range. The 7 correct ones are all
present — 5 dated past shows, the current show, and Louise Bourgeois (undated). The other
23 are 2013–2023 shows that cannot be dated and so cannot be excluded.

**Its cookie banner broke the summary column, twice.** The Complianz plugin names its
blocks `cmplz-description`, so a search for any class containing "description" stored the
consent notice as curatorial text. The fix then over-corrected: WordPress puts a `cmplz-`
class on the **`<body>` element**, so excluding anything inside a matching container
excluded the entire page and all 41 summaries came back empty. **The ancestor walk must
stop before `<body>` and `<html>`** — a consent banner is a container within the page,
never the page itself. Expect other WordPress venues to do the same.

Borghese as of 7 Sep: 29 of 30 rows carry real curatorial text, 0 contain
consent boilerplate.

**8 Sep — the site became unreachable from this container.** Every page returns
`net::ERR_FAILED` in the browser, and plain curl fails with a connection reset;
the proxy logs the same tunnel-drop signature as the original Chromium TLS
problem (bytes sent, 39 received, tunnel closed). It worked an hour earlier the
same day. Cause unknown — site-side, network-side, or a new block. **Its numbers
are therefore unverified against the current engine.** Re-check before trusting
anything in this section.

### 6b. Legacy — how *Chat Claude's fetch tool* saw these sites

**This half is being replaced, not maintained.** Every claim in it was produced by the old web-fetch route, which sees pre-JavaScript shells. A venue marked "not fetchable" here may well be fine for the scraper — that's the entire point of using a real browser. Treat it as a starting hypothesis to test, never as a fact about the scraper. Move rows up to 6a as they're proven, and delete them from here.

- **Reliable for current + upcoming (14):** met, ng, rijks, acq, louvre, moma, tate-modern, tate-britain, brit, va, wallace, brera (current only), frick, menil.
- **Reliable for past (6):** ng (archive back to 2007 with blurbs — the best of any venue), rijks, acq, wallace, frick, louvre.
- **Not reliably fetchable — shell-plus-database (3):** morgan (current has titles/dates but no URLs; upcoming has titles but no dates), khm (total shell failure on listings, individual pages fine), artic (dates missing on listings, past page entirely empty).
- **Italian venues, deferred (4):** capo (robots blocked), borghese (`/mostre/` subpages robots-blocked — **already contradicted by 6a**), uffizi (JavaScript-rendered empty shell), dellav (returns broken/stale content mixing 2022 announcements with old shows; the site is genuinely a mess even in a normal browser).
- **met past page:** JS year-filter unclickable via fetch, defaults to latest year only.
- **tate:** venue-filtered query-param URLs couldn't be unlocked; the brief uses the main `tate.org.uk/whats-on` URL for both Tates.
- **Cache inconsistency:** Menil `/exhibitions` returned 3 clean current shows once, then empty minutes later. Single-fetch reliability tests can mislead.
- **The pattern of who failed:** reliable venues bake data into HTML server-side. Broken ones inject it with JavaScript. Failures cluster around mid-tier museums with 2020s design-agency redesigns — big enough to afford the new site, not big enough to test what happens when JavaScript doesn't run. The Frick's old-school 2012-era site just works.

### 6c. Listing URLs the scraper currently visits

Supplied by her, not discovered. Changing these is her call.

| Venue | Pages |
|---|---|
| `met` | `/exhibitions`, `/exhibitions/past` |
| `ng` | `/exhibitions`, `/exhibitions/past` |
| `rijks` | `/en/whats-on/exhibitions/now-on-view`, `/en/whats-on/exhibitions/past` |
| `acq` | `/exhibitions` (carries all three states) |
| `borghese` | `/en/mostre/presenti/`, `/en/mostre/future/`, `/en/mostre/passate/` — exhibitions themselves are at `/en/exhibition/<slug>/` |
| `morgan` | `/exhibitions/current`, `/exhibitions/upcoming`, `/exhibitions/past` |

Known URL corrections from Sep 2026 testing, for venues not yet wired: Louvre current+upcoming is `louvre.fr/en/exhibitions-and-events/exhibitions`; Louvre past needs four URLs (base plus `?date=2024`, `?date=2025`, `?date=2026`, and its year filter is server-side so it actually works); Menil current is `menil.org/exhibitions` not `/exhibitions/current`; Borghese has migrated to `galleriaborghese.cultura.gov.it` from `.beniculturali.it`.

---

## 7. Venue codes (21, all wired in the app)

| Code | Venue |
|---|---|
| `met` | The Met, New York |
| `ng` | National Gallery, London |
| `rijks` | Rijksmuseum, Amsterdam |
| `acq` | Acquavella Galleries, New York |
| `louvre` | Louvre, Paris |
| `uffizi` | Uffizi Galleries, Florence |
| `borghese` | Galleria Borghese, Rome |
| `brera` | Pinacoteca di Brera, Milan |
| `capo` | Capodimonte, Naples |
| `dellav` | Gallerie dell'Accademia, Venice |
| `khm` | Kunsthistorisches Museum, Vienna |
| `moma` | Museum of Modern Art, New York (main only, not PS1) |
| `frick` | The Frick Collection, New York |
| `morgan` | Morgan Library & Museum, New York |
| `menil` | The Menil Collection, Houston |
| `artic` | Art Institute of Chicago |
| `va` | Victoria and Albert Museum, London (South Kensington only; capture **both** "Exhibitions" and "Displays" — both are temporary shows) |
| `brit` | British Museum, London |
| `wallace` | The Wallace Collection, London |
| `tate-modern` | Tate Modern, London |
| `tate-britain` | Tate Britain, London |

Tate is deliberately two venues; merging them was rejected. Order reflects the app's button order.

**Shop homepages** (wired for the catalogue lookup's domain lock): met `store.metmuseum.org`, ng `shop.nationalgallery.org.uk`, rijks `rijksmuseumshop.nl`, acq `acquavellagalleries.myshopify.com`, louvre `boutique.louvre.fr`, uffizi `shop.uffizi.it`, brera `bottegabrera.org`, khm `shop.khm.at`, both Tates `shop.tate.org.uk`, moma `store.moma.org`, frick `shop.frick.org`, morgan `shop.themorgan.org`, menil `bookstore.menil.org`, artic `shop.artic.edu`, brit `britishmuseumshoponline.org`, wallace `wallacecollectionshop.org`, va `vam.ac.uk/shop`. **No shop:** borghese, capo, dellav — these skip straight to the broad web search.

**Seed set:** ~110 exhibitions read 20 Aug 2026, covering met / ng / rijks / acq only. Baked into the JSX, shown via Reset. Stripping or trimming it has been rejected; removing it entirely is a "later", once the ledger is self-sustaining.

---

## 8. Open decisions

### The order of work from here — agreed 10 Sep 2026

Her sequence, with three adjustments made in the same conversation. This supersedes
"finish the 6-venue prototype end to end before wiring the other 15" below, which was
written when no import had been tested. **One has since been run successfully against
scraper output**, so the join between scraper and app is no longer the unproven part.

1. **Compression step — decided 10 Sep, ready to build.** A separate pass over a
   finished CSV, re-runnable without re-scraping. The design is written up under
   "Settled 10 Sep 2026 — how compression works" below: it reads the previous run's
   compressed CSV, reuses wording where the raw text is unchanged, and asks the model
   only where something actually changed. She imports the **compressed** file.
2. **Wire all 21 venues with default recipes and run once.** This replaces what were two
   steps — "re-check Borghese and probe the rest" and "expand to the accessible ones".
   Marker rows became universal on 10 Sep, so **the run itself is the reconnaissance**:
   the coverage table reports blocked, dead and working venues with no separate probe,
   and Borghese's re-check falls out of it. **The laptop run belongs here too**, not
   later — Met's and Morgan's recipes have never once executed, and finding them broken
   during this pass folds into the venue-by-venue work instead of surfacing as a late
   surprise. She will want step-by-step instructions when that happens.
3. **Parallelism and the hang bound** (DEF-01 + DEF-04). Before the diagnosis pass, not
   after: step 4 is a repeated re-run loop and a 20-minute serial sweep makes it painful.
   Parallel across venues only, never within one — IR-15 stands.
4. **Venue-by-venue diagnosis of the working set.** The slow part, and it needs her own
   count of the live pages. Order within a venue as in Section 5. **Tate is the known
   hard case.**
5. **Decide what to do about sites the scraper still cannot reach** — only meaningful
   once step 2 has said which those are.
6. **JSX work** — "Never add this", plus whatever else steps 2–4 turn up.
7. **Catalogue lookup tuning** — Haiku vs Sonnet. Independent of all of the above.

**Where the deferred items die.** Her requirement, 10 Sep: a Defer must be absorbed by
this workflow and end as fixed or permanently rejected — never left standing.

| Ref | Resolved in |
|---|---|
| DEF-01 parallelism | Step 3 |
| DEF-04 hang bound | Step 3 |
| DEF-02 JS filter proof | Step 4, at the first venue that filters by JavaScript |
| DEF-03 summary extractor | Step 4, per venue |

**The ledger is not being protected during development.** Her ruling, 10 Sep: she is
not keeping a real ledger until the JSX and scraper are both finished, so she can import
freely and roll back to nothing. Quarantine ("Never add this") is therefore **not a
blocker on anything** — it is ordinary step-6 work. Do not raise ledger pollution as a
reason to reorder this list.

**Settled 7 Sep 2026:**
- All 21 venues get wired in, blocked ones included, for the standing-monitor reason in
  Section 4. The final *working* set will be smaller than 21; the *wired* set is all of them.
- The scraper de-duplicates on identical URL only, and never on anything requiring
  judgement (Section 3).
- Diagnosis proceeds **one venue at a time**, not one issue at a time. Venues fail for
  different reasons and jumping between them obscures more than it reveals.
- **Borghese is done** to the limit of what the site publishes (but see the 8 Sep
  outage in 6a).
- **Rijksmuseum is done**, verified against her count: 10 current/upcoming, 14 past.
- **Acquavella is done** (8 Sep), verified against her count: 1 upcoming, 13 past.
- **The National Gallery is done** (8 Sep), verified against her count:
  2 on now, 5 coming soon, 20 past. Its "Events" live on a separate page, so
  everything under `/exhibitions` is a temporary exhibition.
- **The two structural changes are built**: structured-data-first as universal
  logic, and the engine/recipe split.
- Date parsing stays **shared across all venues** — every venue contains several
  venues' worth of formats.
- Title casing is left inconsistent on purpose (Section 5, known bugs).

**Settled 8 Sep 2026 — travelling exhibitions stay as separate entries.**
A show that moves between venues (Acquavella New York → Palm Beach, or
*Metamorphoses* from the Rijksmuseum to Borghese) is imported as one entry per
venue. There is normally one catalogue, tracked against whichever entry she keeps;
the others she puts to one side.

Two mechanics of the app decide how that is done, and they are not
interchangeable:
- **Rejecting the Add card is not remembered.** `applyRefresh` skips a rejected
  add and stores nothing, so the same row proposes itself again on every future
  sweep, forever.
- **Dismissing in the ledger is remembered.** `dismiss` writes `interested:false`
  onto the row, so the entry exists, stays out of the way, and later sweeps match
  it as a fill/change rather than proposing it fresh.

So the workflow is **accept both, then dismiss the one she doesn't want** — not
reject the duplicate card.

**That workflow is only right for two entries that are both REAL.** See the
quarantine list below for everything else.

### Quarantine — "never add this", not yet built (agreed 10 Sep 2026)

**Dismiss is not a rubbish chute.** Her rule, and it governs the design: the only
things she dismisses are exhibitions that are **real**, **not duplicates**, and
that she has looked at and simply isn't interested in. Junk must never enter the
ledger at all.

Today the app offers only two outcomes, and neither fits a junk row:
- **Reject** — `applyRefresh` stores nothing, so the row proposes itself again on
  every future sweep, forever.
- **Accept, then dismiss** — it is in the ledger permanently, which is exactly the
  pollution the rule forbids.

There is no third option and there needs to be. Confirmed by reading the JSX:
`dismiss` only writes `interested:false`, and no "seen and refused" list exists
anywhere.

**The design, keyed on URL:**
- The ledger gains an `ignored` list alongside `rows` — the addresses she has
  turned away. The file is `{rows, lastRun, savedAt}` and import reads only
  `d.rows` and `d.lastRun`, so adding this **breaks no existing ledger**.
- `analyzeProForma` skips any CSV row whose URL is on that list, so it never
  becomes a card again.
- Add cards gain a third button — "Never add this" — beside accept and reject.
- **Keyed on the normalised URL**, the same identity the scraper uses: stable,
  and no judgement involved. Rows with no URL fall back to venue + title.

Three clean outcomes: **Accept** (real, goes in), **Never add** (junk,
remembered, never enters), **Dismiss** (real, in the ledger, not interested).

What it is for: dead links, non-exhibitions the scraper cannot filter (known bug
2), and genuine duplicates.

**Note what is NOT a problem.** A real exhibition with no published dates is
fine: accept it, and every later sweep matches it in the ledger and stays
silent. The forever-return only affects rows she **rejects**. So undated shows
need no quarantine — junk does.

**This is a JSX change and is deliberately deferred** to step 6 of the order at the
top of this section. It was previously written as "must exist before her first real
import" — **that is no longer a constraint**: she is keeping no ledger during
development and can roll back to nothing, so a polluted test import costs her only a
reset. Build it before the ledger becomes real, not before the next import.

Cross-venue shows never merge on their own: `sameExhibition` returns false the
moment `museumId` differs, so the app cannot collapse the Rijksmuseum and Borghese
copies even if title and dates are identical. Same-venue travelling runs (both
Acquavella locations) *can* match each other, because the scraper's title rule
strips the city — see the open Acquavella question in Section 5.

**Superseded 10 Sep 2026 — "finish the 6-venue prototype end to end before wiring
the other 15".** That was set on 8 Sep because nothing had confirmed a single
scraper row survived the trip into the app. **She has since run an import against a
scraper-produced CSV and it worked well.** The join is proven, so the reason for
holding the other 15 back is gone — see the order at the top of this section, where
wiring all 21 is step 2 and doubles as the reconnaissance.

What remains of the original point: the summary column still holds raw curatorial
text, so **compression is step 1** and still comes first.

### Settled 10 Sep 2026 — how compression works

**The design principle, and it is hers:** *the model is the only part of this
pipeline that thinks. Do not make it do dumb work for code to be clever on top
of.*

That sentence reversed the design. The first proposal had the compressor run
**blind** — no memory of anything — which forced it to rewrite all ~350 rows
every sweep so that code could then discard the ~340 that had not meaningfully
changed. Her objection: *"it feels upside down, to make the model dead lift 500
times so code can take the 3 bench presses that matter."* She is right, and the
cause was mine: insisting on statelessness is what created the waste.

**Give the compressor one piece of memory and it turns the right way up.**

It reads **the previous run's compressed CSV** — already committed in
`scraper/output/`. Not her ledger: none of the ledger objections apply, the
file is always present, and it is scraper output matched against scraper
output rather than against a ledger months old.

Then, per row:

| Raw text vs last run | What happens | Model calls |
|---|---|---|
| Identical | Reuse last run's wording | **none** — code, cannot be wrong |
| Changed | Model gets the OLD wording *and* the new raw text, and answers one question: **is the old summary now false?** No → return it unchanged. Yes → rewrite | one |
| Never seen | Write fresh | one |

Measured on the three committed sweeps of 10 Sep: **79 of 80 rows matched
across runs**, and **genuine venue rewording was zero**. So the reuse rate is
near total and the model makes a handful of real decisions per sweep instead of
350 mechanical ones.

**"Is the old summary now false?" is the right test, and it is hers.** A blurb
can differ in infinite trivial ways; the only one that matters is whether what
the ledger says has stopped being true. *"Monet's sculptures"* becoming
*"Monet's paintings"* is a rewrite. Promotional copy becoming past tense is
not. That is judgement about the outside world, so it belongs to a model
(Section 1) — and **review-and-edit beats write-from-scratch**, which is why
the old wording is handed over rather than withheld.

**Model non-determinism cannot cause drift**, and this is by construction, not
by hope. Where the blurb is unchanged the model is never asked, so it cannot
answer differently tomorrow. An earlier proposal leaned on temperature zero and
a content-focused prompt to achieve this; **that was overstated** — temperature
zero only stabilises *identical* input, and nothing forces a reworded blurb to
produce the same words. Reuse-by-code is the guarantee; prompt choices are not.

**Matching rows between runs:** venue + URL, falling back to venue + title.
URLs do change — current-to-past path moves, and venues renaming for no reason
— which is why the fallback exists. The failure is soft in both directions: a
miss means writing fresh, which is merely today's behaviour; a false match
means the model is handed the wrong old summary, but it is also handed the new
raw text and asked whether it is still true, so it rewrites.

**A reuse caused by a failed page must say so in `notes`.** If a detail page
did not load, the summary column is empty and reuse would silently paper over a
scraper failure — the exact class of invisible breakage the 10 Sep shutdown bug
belonged to. Reuse is honest; hiding why is not.

**Which rows get compressed: all of them.** The compressor cannot tell "closed
and already in her ledger" from "closed and new to her" — only the app knows
that, and only after the CSV exists. Her delta includes past exhibitions the
August seed missed, and those arrive as Add cards that must carry a
description. With reuse doing the work this costs almost nothing anyway.

**What the app does with them — her table, 10 Sep:**

| Ledger state | Sweep says | App |
|---|---|---|
| Not in ledger at all | anything | **Add**, always carries the summary |
| Closed, has a summary | different summary | **no card** — what the show WAS has not changed |
| Closed, no summary | has one | **fill** |
| Open or upcoming, no summary | has one | **fill** |
| Open or upcoming, has a summary | different | **edit card** |
| Any | summary blank | nothing — `consider()` already returns early on an empty value |

Everything above maps onto distinctions the app already computes: `fill` vs
`change` at `analyzeProForma`, and open-vs-closed from the end date. The only
new behaviour is dropping summary *changes* on closed shows.

**Where the words come from: a Claude Code session first, an API script
later.** Both are safe — a script owns the CSV and the model only ever supplies
a string. The wording will take two or three goes to get right, and that is a
conversation; a script is the worse place to have it. Move to the API once the
wording has settled and unattended runs are wanted. Nothing is wasted: the
script that owns the file is the same either way, only the source of the string
changes.

### Built 10 Sep 2026 — `scraper/compress.js`

```
node scraper/compress.js                  plan the newest run
node scraper/compress.js run_2026-...     plan a named run
node scraper/compress.js <run> --apply    write sweep_compressed.csv
node scraper/compress.js --examples       print the few-shot pairs
node scraper/compress.js --recompress     ignore memory, ask for everything
```

Planning writes `compress_pending.json` — only the rows that need words. A
session writes `compress_answers.json` beside it. `--apply` writes
`sweep_compressed.csv`, **which is the file she imports**. If nothing is
pending, planning writes the file outright and there is no second step.

`compress_cli.js` holds the command line so `compress.js` stays importable by
the fixtures. `compress.test.js` covers the decision logic, matching, CSV
quoting and validation — 30 fixtures, no network, no model.

**The target length came from her data, not from us.** The guide said "12
words" for a long time. Measured across all 110 seed summaries: **minimum 3,
median 6, maximum 10, and every single one ends with a full stop.** So the cap
is ten words and the shape is a noun phrase. Anything longer is refused rather
than truncated.

**The prompt is examples, not rules.** `--examples` builds 29 pairs of (raw
curatorial text → the summary she approved) by matching the app's seed set to
exhibitions the scraper has since collected text for. That teaches brevity,
noun phrases, naming the artist and the hook, and no promotional language far
better than any list of instructions. Nothing in it is written by hand, and it
rebuilds itself as the seed set changes. The Met's 51 seed entries are
unusable — it is blocked, so there is no raw text to pair them with.

Only two rules stay written down, because examples cannot demonstrate them:
never state anything not in the raw text, and refuse text that is not a
description at all.

**Two flaws surfaced by running it, both fixed:**

1. **There was no way to say "this is not a description".** Acquavella's James
   Rosenquist row is a bare link and nothing else. The script offered a valid
   string or a hard failure, so the only way past it was to invent a summary —
   the exact thing keeping raw text in the record exists to prevent. An answer
   of `null` is now a recorded decision: the summary stays empty and the row
   says why. A *missing* answer still stops everything, because that is an
   oversight rather than a decision, and the two must not look alike.
2. **A skip was forgotten immediately.** On the very next sweep that row came
   back as "never seen before" and was asked again — forever, every run. The
   skip is now remembered by its note, and re-asked only if the venue writes
   something real. This is the same forever-return trap as a rejected Add card.

**Verified end to end, 10 Sep.** First compression of a 15-row Acquavella
sweep: 15 asked, 14 written, 1 skipped. Second sweep of the same venue:
**14 reused, 1 remembered skip, zero model calls.**

**The plumbing for a CHANGED blurb is proven too.** One sentence was appended
by hand to Acquavella's Tom Sachs text and the run re-scored: 13 reused, 1
remembered skip, **exactly one row asked** — and that question carried the old
wording, `"Tom Sachs remaking Picasso in bronze."`, beside the new text, which
is what makes review-not-rewrite possible.

**Be precise about what has NOT been tested.** The 15 summaries in that run
were written **by hand, in the session, by Opus** — not by a model reading the
29 example pairs. The examples are built and unused. Nothing yet shows that a
smaller model given those examples writes summaries she would accept, or that
it correctly answers *is the old summary now false?*

### Testing the judgement — `scraper/compress_eval.js`

```
node scraper/compress_eval.js            write the questions
node scraper/compress_eval.js --score    score the answers
```

**Why the cases are authored rather than collected.** Waiting for venues to
rewrite their pages does not work: three sweeps across one day produced exactly
zero genuine rewordings, and the changes that looked like rewordings turned out
to be the shutdown bug. Real material would take months and would still miss
the cases that matter.

`compress_eval.json` holds 14 hand-written before-and-after pairs, each with the
summary we already have and the verdict expected. They cover the changes
actually seen on these venues: promotional copy rewritten into past tense,
opening hours appended, a related-events list appended, a blurb cut to a
fraction of its length, a language switch — all of which must **keep** the
summary — against a changed medium, a changed count, a named artist dropped
from a group show, a second artist added to a solo show, and an address reused
for a different exhibition entirely, which must **rewrite**. Two more must be
**refused**: a curator biography, and consent boilerplate (the Borghese
cookie-banner failure, in summary form).

**The verdict is read straight off the answer** — identical to the previous
summary means keep, a different string means rewrite, `null` means refuse. That
is the same interface the compressor uses, so nothing here is a mock. Wording
quality is not scored; it is printed for her to read.

**Two cases are marked `arguable` and cannot fail a run:** a travelling show
changing city when the summary names no city, and a show postponed
indefinitely. Neither has a single right answer, and the second decides whether
the summary column ever carries status. A disagreement there is a conversation,
not a defect.

**The harness itself was checked against three answer sets**, because an eval
that cannot fail is worthless: answering "keep" to everything — the likeliest
lazy failure — scores **7 of 14 and exits non-zero**; correct verdicts score 14
of 14; correct verdicts with over-long rewrites are caught as invalid. Wrong,
invalid and unanswered all fail the run; disputed does not.

**This is aimed at whichever model does the work in production**, expected to be
Haiku through the API. It is deliberately not a test of a session writing
summaries by hand, which proves nothing about what runs unattended.

**Rejected along the way, with reasons, so they are not re-proposed:**
- **Give the compressor her ledger** so it can skip rows she already has. Puts a
  ledger decision inside the scraper chain, needs the ledger file present on
  whatever machine runs it, and is *wrong*: an entry already in the ledger with
  a blank summary should still be filled.
- **Reuse the app's `sameExhibition` as the cache key.** It asks the right
  question for the ledger — *is this the same exhibition?* — and the wrong one
  here, which is *will the same wording still be correct?* A past-tense
  rewrite is the same exhibition and a stale summary.
- **Fingerprint the raw text as the cache key.** Correct about identity, exactly
  backwards on cost: it recompresses on every trivial rewording, which is the
  noise the whole design exists to prevent.
- **A word-overlap similarity threshold in code** deciding whether a change is
  meaningful. This is the "upside down" case in its purest form — code making
  the judgement call the model should make.

### Superseded — the earlier framing of this decision

- **Where summary compression happens.** The scraper
  writes raw text either way, so nothing built so far has to change whichever
  wins. Three things are already settled about it:
  - **A script owns the CSV; the model only ever supplies a string** (Section 1).
    It never edits the file, so it cannot drop or reorder a row.
  - **A separate pass over the finished CSV** is the only candidate that can be
    re-run without re-scraping. Since the wording will take two or three
    attempts to get right, that difference probably decides it.
  - Keeping the raw text is what makes fabrication structurally impossible — the
    compressor can only compress what is in the record.

  Still open: whether the words come from a session or a script calling the
  API. Same safety either way; different cost and setup.

  **It must also detect text it should not be compressing** — a summary that is
  actually ticketing copy or a curator biography (DEF-03). It flags and stops
  rather than compressing nonsense. But that is a second net, not the first one:
  bad text must not be let through on the assumption this stage will catch it.
- **Haiku vs Sonnet for the in-app catalogue lookup.** Haiku passed the easy cases cheaply and correctly but hasn't been tested on hard ones — touring shows, foreign-language catalogues, ambiguous or retitled shows — where a lighter model may return the wrong book or a wrong ISBN. Decide with one side-by-side session on known-tricky catalogues; failures are visible on click. Not weeks of live use.
- **Running the scraper on her own machine — which is also the answer for Met
  and Morgan.** Parked, not scheduled. These were tracked as two items until
  10 Sep; they are **one**. The blocks are aimed at this datacentre's IP, so a
  Claude Code session on her laptop clears them and gives local runs at the same
  time. Nothing else has to change.

  This supersedes "do a manual Chat Claude sweep for those two". Chat Claude
  cannot read this guide and has no project context, so it is the last resort,
  not the plan (Section 1). Whatever gathers those rows writes them into the pro
  forma **through a script**, never by hand.

  What is actually true about it:
  - **The blocks would very likely lift.** Met's 429 and Morgan's 403 are aimed
    at this datacentre's IP address, not at anything the scraper does. From a
    home connection neither site sees what it is objecting to.
  - **Neither recipe has ever been exercised.** All we have established is that
    the door is shut. Which links are exhibitions, where the title sits, where
    the dates sit — all copied from venues that do work, none tested. Expect a
    first run that needs diagnosing, like Borghese's first run returning the
    navigation menu. Met's year dropdown is written and never once clicked.
  - **Both container-specific blockers are now cleared** (8 Sep). The hardcoded
    Chromium path is gone — `resolveChromium()` tries Playwright's own answer
    first, then whatever is actually installed, newest first. Both halves are
    needed: this container has `chromium-1194` while Playwright's default points
    at `chromium-1243`, so either value alone is wrong somewhere. The network
    bridge was already fine — with no proxy set, `proxyAgent` is undefined and
    Node connects directly.
  - **Setup on a local machine, three commands:** `npm install`, then
    `npx playwright install chromium`, then `node scraper/sweep_prototype.js`.
    The middle one is needed on a laptop but **not** in this container, where
    Chromium is pre-installed and that download is blocked.
  - Verified by inspection, not by running: the script imports only playwright,
    node-fetch, https-proxy-agent and Node's own `fs`/`path`, writes beside
    itself via `__dirname`, and reads nothing else from the repo. It is one file
    plus `package.json`. Nobody has actually run it off this container yet.

- **Sweeper brief v3** — the Chat-Claude-era instruction document still needs its URL corrections and a two-attempt URL-unlock rule. Its scope shrinks as the scraper covers more venues, but it does **not** disappear: the venues the scraper cannot reach are precisely the ones where a human-driven Chat Claude route still has a chance, because it comes from a different network and behaves like a person browsing. Expect the brief to end up as the fallback procedure for blocked and novel-problem venues rather than the main sweep.

### Parked, not accepted

- **Shop links can be stale or dead.** The link comes from the search index, not a live page check, so the lookup can return a delisted or 404ing URL while still labelling it "in shop". The obvious fix — point the shop link at an ISBN search — **doesn't work**, because museum shops search by title, not ISBN. Open problem, not a solved one.

---

## 9. Rejected — do not re-propose

Ledger on Claude cloud storage (intermittent). Google Drive auto-load on open. Saving the ledger to Drive from the app (needs Chat to re-type the whole ledger, hits reply limits — this is exactly why the sweep returns a *file* and Chat never rebuilds the ledger). The app gathering its own exhibition data. Auto-save on every change. A confirm-tap after download. Bulk-approve during refresh. In-app field editing. The separate readout doc. Excel as the sweep format. Merging the two Tates. Stripping the 110 seed. Watching the sweeper and interrupting it (babysitting). Firing a new JSX mid-discussion. Splitting catalogue lookup from drawer output. A "GPT scrapes, Claude compresses" role split (explored, dropped). Proposing "drop the feature" as a fix — rejected as an approach entirely.

Corrected along the way: Chat can *not* fetch any URL cold (it must appear in a search result first). The Italian venues are four different situations, not one problem. "18 venues fetchable" was wrong. The AbeBooks link is `/servlet/SearchResults?kn=…&sts=t`.

---

## 10. The inversion — worth preserving

The originally-easy problem and the originally-hard problem swapped places.

She expected data ingestion to be trivial — she knows which sites to visit, there's no detective work — and the portal to be the hard part.

The reverse happened. The React portal was straightforward for an AI to build: clear inputs, clear outputs, entirely self-contained. **Data gathering is structurally hard, because it depends on the outside world's current architecture**, and museums have moved to shell-plus-database sites that defeat fetch tools. What looks like the same task to a human is a completely different task to a fetch tool versus a browser.

Consequences that should hold:
- The app already built is what she keeps. No data-gathering solution forces a rebuild of the portal.
- **The data-gathering layer is swappable underneath.** Future work sits *under* the current app, never replacing it.
- Whenever a session drifts toward "let's rebuild the app around a new backend" or "let's downgrade the app to fit the tools" — neither.

---

## 11. Independent review log

Outside reviews get commissioned deliberately, with **no project knowledge**, to
get a reader who has not absorbed our assumptions. This table is where their
findings live, so that:

- a raised issue is never quietly lost, and
- a **rejected** suggestion stays rejected on the record. Without this, the next
  reviewer proposes the same thing and the reasoning is argued from scratch.

**Two rules for this section.**
1. A **Reject** is not revisited without new evidence. Point the next reviewer at
   the row rather than re-running the argument.
2. A **Defer** must name its **trigger**. "Later" is indistinguishable from a
   reject and rots into one.

A finding is judged against the code, not against this guide. Where the two
disagreed, the guide was wrong twice (see IR-02 and IR-04).

### 9 Sep 2026 — Codex diagnostic review

Two documents, reviewed against commit `2d083d5`. Verified line by line before
any decision was taken; IR-05, IR-06 and DEF-04 were found during that
verification rather than by the reviewers.

| Ref | Finding | Decision | Status |
|---|---|---|---|
| IR-01 | A range with the year only on the closing side gave the **opening** date that same year, so "December 5 – January 20, 2026" ended before it opened | Implement | **Fixed 10 Sep** |
| IR-02 | `Sept. 21, 2024 - Oct. 12, 2024` matched the range pattern then produced no dates at all — the guide claimed this format worked | Implement | **Fixed 10 Sep** |
| IR-03 | Impossible calendar dates (`2026-02-31`) were emitted as if real | Implement | **Fixed 10 Sep** |
| IR-04 | `sane()` guarded only the prose parser, never the listing parser — so IR-01's impossible range reached the CSV unchecked | Implement | **Fixed 10 Sep** |
| IR-05 | The plausible-year guard was missing from the day-first range branch, the busiest path in the parser | Implement | **Fixed 10 Sep** |
| IR-06 | `parseDateRange` was a second date parser that nothing called — dead code shaped like live code | Implement | **Fixed 10 Sep** |
| IR-07 | `normalizeUrl` lowercased path and query, so two exhibitions differing only in capitalisation collapsed into one | Implement | **Fixed 10 Sep** |
| IR-08 | Links were joined onto the venue base by hand: no `../`, no protocol-relative, no check the result was still on the venue's site | Implement | **Fixed 10 Sep** |
| IR-09 | Structured data used `events[0]` without checking the event was this exhibition | Implement | **Fixed 10 Sep** |
| IR-09a | **Widening of IR-09, not a new finding.** The same mis-attribution through the other two date sources: page text took a related course's range (NG Waldmüller), and the listing walk took the neighbouring card's dates (Rijksmuseum Farifteh). The reviewer wrote the recommendation against structured data only; it was implemented that narrowly, and the principle — prove a date belongs to this exhibition before using it — was not carried across | Implement | **Fixed 10 Sep** — contradiction check on prose, card-boundary guard on the listing walk. See Section 5. **The general case remains unsolved**; recorded there and linked to known bug 2 |
| IR-10 | Output filenames collided within one minute, so a retry could overwrite an earlier run | Implement | **Fixed 10 Sep** — superseded by the run directory |
| IR-11 | No automated tests of any kind | Implement | **Fixed 10 Sep** — `scraper/date.test.js`, `npm test` |
| IR-12 | The CSV was written once at the very end, so a run that died lost everything | Implement | **Fixed 10 Sep** — run directory |
| IR-13 | Block scripts and tracker origins in the network bridge | **Reject** | Running JavaScript is the entire reason a browser is used. Blocking trackers is a marginal speed gain against breaking a venue that waits on its own CDN |
| IR-14 | Split the file into separate modules | **Reject** | One engine plus recipes stands. The real complaint — date logic could not be tested in isolation — is answered by IR-11 without the regression risk |
| IR-15 | Fetch several pages at once **within** a venue | **Reject** | That is the hammering case: five simultaneous requests to one museum is five times the load on their server. Never, at any scale |
| IR-16 | Marker rows (`[current page]`) for blocked or empty listings are exported | Accepted, no repair | Intentional: it proves the venue was checked and visibly reports the failure |
| IR-17 | Reviewer could not launch Chromium | No action | Their environment. Ours was fixed 8 Sep — `resolveChromium()` |
| DEF-01 | Run venues **in parallel with each other** (never within one venue) | **Defer** | **Trigger:** more than ~8 working venues, or a run over 15 minutes. Measured 8 Sep: ~2.9s per detail page, so 21 venues projects to ~20 min. Agreed in principle 10 Sep; she has withdrawn the log-readability objection, since she reads the session's summary rather than the log — so the log may be interleaved provided it stays machine-parseable |
| DEF-02 | After changing a **JavaScript** filter, wait for proof the list changed, not merely that the page has text | **Defer** | **Trigger:** wiring any non-blocked venue that filters by JavaScript. Moot for the Met (HTTP 429; its dropdown has never been clicked). A **server-side** filter loading a different URL per year — the Louvre's — is not exposed to this and needs nothing |
| DEF-03 | The summary extractor falls through to generic paragraph selectors, so a layout change could capture ticketing or biography text | **Defer** | **Trigger:** observe the next handful of venues as they are wired; fix if it actually surfaces. **Her ruling, and the reasoning matters:** it must not be deferred to "the compression step will catch it". Letting bad text through on the assumption a later stage notices is a bad habit, and it must never reach an approval card for her to be the one asking why the description is nonsense |
| IR-18 | Drop a row with no end date when its **start** date is long before the lookback floor (proposed 10 Sep, after the 2012 Rosenquist row) | **Reject** | Her call: more granularity than it is worth. Measured first — across all 87 distinct rows ever collected it would have caught **one**. It would also add a new kind of judgement, since the lookback tests only the end date and an unknown end date is never treated as evidence of age. Any threshold at the floor itself would delete a show that opened just before 1 July 2024 and ran past it, which the guide names as a keeper |
| DEF-04 | Nothing bounds a venue that **hangs** — a block costs a second, a hang costs 20s plus a retry per page | **Defer** | **Trigger:** with DEF-01. The run directory already limits the damage: completed venues are safe on disk and a timed-out venue is picked up by the next `--continue` |
