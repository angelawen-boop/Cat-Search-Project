# Cat Watch — project guide for Claude Code

**Repo:** `angelawen-boop/Cat-Search-Project`
**Last updated:** 7 Sep 2026 (end of the Borghese session)
**Source:** built from Cat Watch Handover v11 plus what this repo's own scraper work has since proven.

This repo now holds **two** things, and will hold both going forward:

1. **The app** — `Cat_Watch_v10.2_haiku.jsx`, a React artifact. Development of this is being **ported from Claude chat into Claude Code**, so app decisions get made here too, not just scraper ones.
2. **The scraper** — `scraper/`, which produces the CSV the app eats.

Neither exists for its own sake. The scraper feeds the app. Don't build either in isolation.

## Which branch to work on — read this first

**`main` is the trunk.** It holds this file and the current scraper. Work there, or
branch from there.

`claude/personal-tracking-ledgers-z49s2h` is **dead**. It is an old session branch that
was, for a while, the repository's *default* branch on GitHub — which meant new sessions
opened it, found no CLAUDE.md and an ancient copy of the scraper, and reported the
project as barely started. If a session tells you the scraper has no date handling and
no project guide, it is on that branch. Ignore what it says and check out `main`.

`claude/headless-chromium-claude-code-wl94l0` is the branch all of this was developed on
and is identical to `main`.

---

## 1. House rules for this repo

These are the rules for Claude Code sessions. They will grow over time; right now there is one, and it is not negotiable.

**Plain English, ELI5 for a non-technical reader — but never use that as cover for explaining less.**
The owner does not read code and does not want to. Explain the logic, the trade-off, the limitation, the risk — all of it — in easier words. Simplify the *language*, never the *substance*. Leaving out a real problem because it was hard to phrase simply is a failure, not a kindness.

### Carried over from the app project (still apply here)

- **Be concise.** She is optimising for decisions-per-minute. Cut hard after thinking. Short bullets over paragraphs.
- **No hedging, no manufactured uncertainty.** If you know it, say it. Don't bolt "but I can't be sure" onto things you do know — she has correctly called that lying. Name real unknowns once, briefly, then stop.
- **Never fish for "go."** No "ready when you are", "want me to start", "shall I proceed". She says go. Wait.
- **Read the code before speaking about it.** Claims about the JSX or the scraper come from having read the file this session, not from memory or general patterns. Breaking this has produced confident, invented "bugs" before.
- **"Proven working" and "looks right in the code" are different things.** Say which one you have.
- **Never propose dropping a feature or accepting reduced functionality as the fix.** The tool exists to do more automatically. When something breaks, make it work.
- **No undiscussed changes, no silent workarounds, no shortcut fixes.** Fix the real problem and say what you did.
- **Don't editorialise or classify things into problem-piles unless asked.** A factual question gets a factual answer.
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

### What the lookback actually means

Keep an exhibition if it was **open at any point on or after 1 July 2024**.

- A show that ran March 2024 → September 2024 is **kept**. It was still open inside the window.
- A show that ran January 2024 → June 2024 is **dropped**. It had already closed.
- The test is on the **end date, never the start date**.
- A show whose end date can't be read is **kept and flagged**, not dropped — an unknown date is not evidence of being too old.

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

### How a listing page is read

All six venues go through one shared function, `collectFromListing()`, so counting, the
URL guard and the title rules behave identically everywhere. Per page it reports:

```
seen -> navigation / already-seen URL -> collected (n of them with no readable title)
```

and the run ends with a coverage table. **Every link is accounted for by a number.**
Nothing disappears silently.

**Titles come from the page's own heading, not the first line of link text.** That was
the old approach and it captured badges — "Past exhibition", "Free" — so 32 National
Gallery exhibitions shared 3 "titles". `TITLE_RULES` records which shape each venue
uses: a heading inside the link (NG, Rijksmuseum), or no heading plus a predictable
wrapper to strip (Acquavella's trailing "NEW YORK APRIL 9 - MAY 22, 2026", Borghese's
"March / 2026 ... DISCOVER THE EXHIBITION"). **Never read a heading from the link's
parent** — on Borghese's archive that returns the first card's heading for every card.

**A link with no readable title is never dropped.** It gets a row with a blank title and
a note saying what the URL slug suggests. The app shows it as "Couldn't be filed" — 
visible and fixable. The slug guess stays in the notes and never enters the title
column: it is the site's URL, not the exhibition's name.

### Reading dates

Three sources, tried in order:

1. **The listing page** — `datesNearLink()` reads the link and its immediate parent (not
   higher; that picks up the next card's dates). Getting dates here is what lets the
   lookback cut the list *before* spending a page load on each entry.
2. **Prose on the exhibition's own page** — `findDateRangeInProse()`. Some venues print
   no date field at all and write the run into the opening sentence. This is
   pattern-matching, not comprehension, but a date has a shape and that is enough.
3. **A date-ish element** on the detail page, as a last resort.

Handles month-first ("June 10 to September 14, 2025") and day-first ("From 20 January to
22 February 2026", "on 1 November 2017 and will last until 20 February 2018"). Where a
sentence omits the year entirely ("From March 26 to June 23"), the year comes from the
listing page.

**Two guards stop it grabbing the wrong date**, and both are load-bearing on pages full
of art history:
- A month **name** must sit beside the number, so bare years never match.
- The year must be plausible (**1990–2035**) — low enough for archives going back to
  2013, far above any artist lifespan.

Verified against `Caravaggio (1571-1610)`, `stayed in Italy in 1629` and `confiscated on
4 May 1607`: all correctly ignored.

`sane()` drops a start date that falls after its own end rather than emitting an
impossible range. This caught a real bug: with the year floor at 2015, "From 8 October
2014 to 11 January 2015" produced a start of 2015-10-08.

### Last full-sweep result (7 Sep 2026, 4m05s)

| Venue | Collected | Notes |
|---|---|---|
| `ng` | 34 | 183 listed on the past page, 151 pre-July-2024 correctly cut |
| `rijks` | 41 | only 2 of 15 current-page links kept — **suspected under-collection** |
| `acq` | 19 | 108 listed, 89 pre-floor cut, 11 archive-nav links ignored |
| `borghese` | 30 | see 6a — the site publishes almost no dates |
| `met` | 0 | HTTP 429, blocked |
| `morgan` | 0 | HTTP 403, blocked |

### Known bugs — open

1. **Rijksmuseum's current/upcoming page keeps only 2 of 15 links**, with 8 rejected for
   having no readable title. Missing *current* exhibitions is worse than over-collecting
   old ones. **This is the next thing to look at.**
2. **Coverage against the venues' real totals is still unverified.** The counters now
   explain where rows go, but nothing confirms the scraper reached everything each venue
   publishes. Open question: whether NG and Rijksmuseum list upcoming shows on a page
   not in 6c.
3. **Two National Gallery rows carry a badge as a title** (`Across the UK`,
   `Find out more` — the latter is really the Renoir and Love exhibition). Two
   Rijksmuseum rows are both titled `LAST CHANCE` (Ed van der Elsken, Fiep Westendorp).
   The heading rule works except where a site puts a badge in the heading slot.
4. **Filtered runs overwrite the whole CSV** with only those venues' rows. Known,
   unfixed; she has confirmed the output is hypothetical for now.
5. **The summary column is not yet the raw-dump-then-compress design** in Section 4. It
   currently holds up to 2000 characters of curatorial text.

### Fixed this session — do not reintroduce

- `networkidle` waits (30s timeouts on pages that had loaded in 3).
- Unwrapped `route.fulfill`/`abort` calls (a cascade of "interrupted by another
  navigation" that returned zero rows for all six venues).
- Title-based de-duplication (deleted 29 NG exhibitions).
- Borghese's `/mostre/` selector (collected the navigation menu).
- Dropping links with unreadable titles.
- A cookie-banner filter that walked up to `<body>` and therefore excluded every
  paragraph on every page (see 6a).

### Working order agreed with her

Diagnose in this order and don't jump ahead:
1. **Is it getting data at all?** — solved for 4 of 6 venues.
2. **Is it getting the right data?** — current stage. Lookback is done; coverage and titles are not.
3. **Is it recording and outputting properly?** — the title/dedup bug lives here.

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
| `rijks` | **Works.** 41 exhibitions, all with curatorial text. Dates mostly not readable from listing or detail pages. | Full sweep |
| `acq` | **Works.** One page carries current, upcoming and past together. Dates are in the link text itself ("… NEW YORK OCTOBER 16 - DECEMBER 5, 2025"). Its archive has year-range filter links (`/exhibitions/past/all/2023-2021`) which are navigation, not exhibitions — following them dragged in the whole catalogue back to 1999. | Full sweep |
| `borghese` | **Reaches the site**, contradicting the old "robots-blocked" note in 6b. Fully worked through — see below. | Full sweep + 40 detail pages |

**Two of six venues are blocked at the door.** For those, the headless browser doesn't help — the refusal happens before any page is served. Options are running from an ordinary home connection instead of a datacenter, asking the institution directly, or falling back to the Chat Claude route (different network, behaves like a person browsing). Engineering around a deliberate block is not on the table.

They stay wired in regardless — see Section 4. A refusal costs about half a second and tells us whether anything has changed since last time.

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

Borghese now: 29 of 30 rows carry real curatorial text, 0 contain consent boilerplate.

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
- **Borghese is done** to the limit of what the site publishes. Rijksmuseum is next.

- **Where summary compression happens.** Three candidates, none chosen: Chat Claude does it; Claude Code does it inside the sweep run after the raw text is pulled; Claude Code does it as a separate pass outside the scrape script. The scraper writes raw text either way, so this can be decided later without rework.
- **Haiku vs Sonnet for the in-app catalogue lookup.** Haiku passed the easy cases cheaply and correctly but hasn't been tested on hard ones — touring shows, foreign-language catalogues, ambiguous or retitled shows — where a lighter model may return the wrong book or a wrong ISBN. Decide with one side-by-side session on known-tricky catalogues; failures are visible on click. Not weeks of live use.
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
