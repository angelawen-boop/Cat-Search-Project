# Cat Watch — project guide for Claude Code

**Repo:** `angelawen-boop/Cat-Search-Project`
**Last updated:** 8 Sep 2026 (Acquavella and National Gallery both verified)
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

## 1. House rules for this repo

These are the rules for Claude Code sessions. They will grow over time; right now there is one, and it is not negotiable.

**Plain English, ELI5 for a non-technical reader — but never use that as cover for explaining less.**
The owner does not read code and does not want to. Explain the logic, the trade-off, the limitation, the risk — all of it — in easier words. Simplify the *language*, never the *substance*. Leaving out a real problem because it was hard to phrase simply is a failure, not a kindness.

### Carried over from the app project (still apply here)

- **Be concise.** She is optimising for decisions-per-minute. Cut hard after thinking. Short bullets over paragraphs.
- **Never propose dropping a feature or accepting reduced functionality as the fix.** The tool exists to do more automatically. When something breaks, make it work.
- **No undiscussed changes, no silent workarounds, no shortcut fixes.** Fix the real problem and say what you did.
- **She will not manually enter exhibition data.** Treat that as a fixed constraint, not an open question.

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

Two details make it actually work, both learned the hard way:
- Compare the **finished address**, not the raw link text. The same Acquavella page is
  linked both as `exhibitions/matisse2` and `/exhibitions/matisse2`, and trailing slashes
  vary. `normalizeUrl()` handles this.
- The guard spans a **whole venue**, not one page. It used to reset between a venue's
  current and past pages.

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
dates still pass the plausible-year guard.

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

**Target output:** a CSV in exact pro forma format, with the **summary column carrying the raw curatorial text dump** rather than a finished 12-word summary. A later compression step turns raw text into the 12-word summary. Keeping the raw text is what makes fabrication structurally impossible — the compressor can only compress what's actually in the record.

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
- `scraper/output/sweep_raw.csv` — the pro forma output.
- `scraper/output/sweep_log.txt` — per-venue diagnostics: what worked, what failed, why.

Run: `node scraper/sweep_prototype.js` for everything, or `node scraper/sweep_prototype.js ng rijks` for named venues only.

**Warning:** a filtered run still overwrites `sweep_raw.csv` with only those venues' rows. Not yet fixed.

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
Summer 2022                          season and year — a bound, not a date
```

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
200, the three above are the venue's dead links, no summary is empty, none is
under 94 characters, none contains consent or navigation boilerplate, and no
two rows share an opening line.

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

### Last full-sweep result (8 Sep 2026)

| Venue | Rows | Notes |
|---|---|---|
| `ng` | 27 | **matches her count of the live pages: 2 on now + 5 coming soon + 20 past.** No rows without a closing date |
| `rijks` | 37 | **10 current/upcoming + 14 past, both matching her count of the live page.** 3 rows are the venue's own dead links |
| `acq` | 14 | **matches her count of the live page: 1 upcoming + 13 past.** 119 listed, 11 archive-nav links ignored, 94 cut by the lookback |
| `borghese` | — | **unreachable** on 8 Sep, see 6a |
| `met` | 0 | HTTP 429, blocked |
| `morgan` | 0 | HTTP 403, blocked |

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
3. **Filtered runs overwrite the whole CSV** with only those venues' rows. Known,
   unfixed; she has confirmed the output is hypothetical for now.
4. **The summary column is not yet the raw-dump-then-compress design** in
   Section 4. It currently holds up to 2000 characters of curatorial text.
5. **Title casing is inconsistent** — some venues apply capitalisation in CSS, so
   innerText returns caps for some cards and title case for others. **Her
   decision: live with it.** Genuinely all-caps exhibition titles exist, and
   telling them apart is not worth the logic.

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
- Keeping the FIRST link to an address and ignoring the rest, which cost Renoir
  and Love its title and its dates — the National Gallery's first link to a
  card is the image.
- Only the en and em dash being normalised, so a figure dash in a National
  Gallery date turned "15 October 2026" into 1 October 2026.
- Treating a 404 as a page that loaded, which stored "This page does not exist"
  as three Rijksmuseum exhibitions' summaries.
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

Cross-venue shows never merge on their own: `sameExhibition` returns false the
moment `museumId` differs, so the app cannot collapse the Rijksmuseum and Borghese
copies even if title and dates are identical. Same-venue travelling runs (both
Acquavella locations) *can* match each other, because the scraper's title rule
strips the city — see the open Acquavella question in Section 5.

- **Where summary compression happens.** Three candidates, none chosen: Chat Claude does it; Claude Code does it inside the sweep run after the raw text is pulled; Claude Code does it as a separate pass outside the scrape script. The scraper writes raw text either way, so this can be decided later without rework.
- **Haiku vs Sonnet for the in-app catalogue lookup.** Haiku passed the easy cases cheaply and correctly but hasn't been tested on hard ones — touring shows, foreign-language catalogues, ambiguous or retitled shows — where a lighter model may return the wrong book or a wrong ISBN. Decide with one side-by-side session on known-tricky catalogues; failures are visible on click. Not weeks of live use.
- **Running the scraper on her own machine, for Met and Morgan.** Parked, not
  scheduled — she may do a manual Chat Claude sweep for those two instead. The
  point of raising it was to stop the blocked venues quietly falling out of
  view now that the other four work.

  What is actually true about it:
  - **The blocks would very likely lift.** Met's 429 and Morgan's 403 are aimed
    at this datacentre's IP address, not at anything the scraper does. From a
    home connection neither site sees what it is objecting to.
  - **Neither recipe has ever been exercised.** All we have established is that
    the door is shut. Which links are exhibitions, where the title sits, where
    the dates sit — all copied from venues that do work, none tested. Expect a
    first run that needs diagnosing, like Borghese's first run returning the
    navigation menu. Met's year dropdown is written and never once clicked.
  - **Two things are wired for this container.** The Chromium path is hardcoded
    to `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, and there is no
    written setup step. Both are small fixes: fall back to whatever Playwright
    installed locally, and write down the two commands. The network bridge is
    already fine — with no proxy set, `proxyAgent` is undefined and Node
    connects directly.

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
