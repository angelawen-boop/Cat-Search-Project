# The scraper — evidence and design

How `scraper/sweep_prototype.js` reads a museum site and why each rule exists.
`CLAUDE.md` §5 carries the commands and the shape. **Read the relevant section
before changing that area** — almost every rule here replaced something that
looked sensible and was silently wrong. Compressed 30 Sep; full history in git.
Section numbers are referenced from the guide and code — keep them.

---

## 1. How a listing page is read

Per page: `seen → navigation / already-seen URL → collected (n with no readable
title)`, ending in a coverage table. **Every link is accounted for by a number.**

- **Titles come from the page's own heading**, never the first line of link text
  (that made 32 National Gallery shows share 3 titles). Where only the image is
  linked, the title is read from the card above — at most 2 levels, ≤ 220
  characters.
- **A link with no readable title is never dropped.** Blank title, and a note
  saying what the slug suggests; the guess never enters the title column.
- **`noTitle` is counted when the page is finished** — the Met once reported 43
  unreadable titles on a page where every finished row had one. Report the
  state that reaches her.
- **The same show linked several times on one card:** `fillBlanksFromRepeatLink()`
  fills EMPTY fields only from the other links. `CTA_ONLY` rejects a link whose
  whole text is a button phrase.
- **A link back to the venue's own listing is navigation** (`isOwnListingPage()`,
  language prefix stripped). N-004.
- **Listing pages are scrolled before reading**, until two steps show no growth,
  height measured AFTER the wait (KHM builds cards as you scroll).
- **A page that loads and yields nothing leaves a marker row** — checked after the
  already-seen guard.
- **A title can come from the show's own page** when the listing gives none —
  fills a blank only.

---

## 2. Getting past a listing's first page

### A numbered archive is more addresses

`followPagination()` asks for the next page and lets the site decide whether
there is another (the Menil once lost 12 shows to page one only). **Page counts
are never written into a recipe.**

- **It stops at the lookback floor.** Walking to the end cost eleven Menil pages
  and 13 decades-old undated rows. Newest-first is checked, not assumed: if a
  page comes back newer than the one before, the log says so and that venue reads
  to the end.
- **The index base is the site's:** Menil's bare page is page 1 (`from: 2`), the
  Frick's is page 0 (`from: 1`). P-014.

### A "load more" button is a control

If the address changes when you use it, it is just another page (the Met's year
menu — `yearDropdown` was removed). If it doesn't (the Louvre), the venue names
its control (`loadMore`). Four things make it work:

- **The consent banner comes down first** (`dismissConsent()`) — the Louvre's
  cookie popin swallowed the click for two days.
- **The anchor's default action is cancelled before every press** — once the list
  is complete the site stops intercepting and the browser follows the href to a
  404. It fails only on the press AFTER the last real one.
- **A WATCH, not a sleep:** polled until the list grows; 12s of nothing means the
  end. A fixed pause read a slow batch as the end (6 links vs 11, same code).
- **The stop reason is logged**, not just the press count.

### The standing check

`detectUnwiredPagination()` reports, every sweep, any listing that links a page
no recipe follows — structural (same address, one number different), warns and
never fetches. A filter the recipe drives itself is excluded
(`recipeDrivenParams()`; artic's `?year=` once raised 32 false alarms).
`probe_pagination.js` asks whether a given page holds anything, read-only.

---

## 3. Reading dates

**All date parsing is shared** — the Rijksmuseum alone uses six formats. Sources
in order: structured data → the listing card (`datesNearLink`) → the show page's
prose (`findDateRangeInProse`) → a date-ish element. The page scan fills EMPTY
fields only; **the listing wins on disagreement.**

**Her standing rule:** where the code has applicable logic it uses it; otherwise
the dates stay blank and the notes say why. **Never a guess.**

### Formats handled, all found in the wild

```
6 FEBRUARY TILL 25 MAY 2026          day-first, year on the end
22 MARCH 2025 TO 15 MARCH 2026       day-first, year on both
12 SEP 2025 TO 25 JAN 2026           abbreviated months
21 Sept. 2024 to 12 Jan. 2025        abbreviated with a full stop
11 Oct. 2019 t/m 19 Jan. 2020        Dutch "t/m"
December 13, 2025 - February 2, 2026 month-first
From June 10 to September 14, 2025   month-first, word separator
5 June to 25 October                 no year — borrowed from the listing
Till 29 November                     no year, no opening date
WORN till 21 March 2027              single date with a preposition
March / 2026                         month and year only
December 9 - 31, 2023                day only on the closing side
December 5 - January 20, 2026        crosses new year — opens in 2025
Summer 2022                          season and year — a bound, not a date
Dal 16 ottobre 2025 al 6 gennaio 2026   Italian
Dal 16 aprile all'8 settembre 2026      Italian, "al" elided
From 21/03/2024 to 28/04/2024           all numeric — see below
10 set 2026 - 22 nov 2026               Italian three-letter months
Saturday 23 May - Sunday 29 Nov 2026    weekday before each date
Aug 1, 2026–Summer 2027              opens 1 Aug, no closing date, 2027 a bound
Mar 8, 2025–ongoing                  still open
Through Oct 4 / Ongoing from Oct 19  no year — derived
23rd, "Feburary"                     ordinals; a common misspelling
```

- **A closing side that is not a date** (`–Summer 2027`, `–ongoing`) is read
  before the single-date rule — it once wrote the OPENING date into the closing
  column. **A year-less month already past belongs to next year**; the parser
  takes `today` so fixtures can pin it. MO-001 to MO-010.
- **Weekdays are stripped first**, anchored on a following day or month, longest
  name first (Wallace's Churchill row once arrived undated, blamed on the venue).
- **Italian is in the shared month map**, three-letter forms included (`set`);
  longest alternative first so "al" doesn't eat "all'8".
- **All-numeric ranges are read only when the numbers prove their order** (a
  component over 12); otherwise refused. Listing cards only.
- **A backwards range crosses the new year** — the opening year is worked out.
- **`ymd()` checks every date exists** — JavaScript rolls 31 Feb into March.
- **Every dash is normalised** (U+2010–U+2015, minus, maqaf).
- **Two guards against art history:** a month NAME beside the number, and a year
  in 1990–2035. **A published opening year that fails the guard refuses the whole
  range** — never swapped for the closing year (Mimmo Jodice's lifespan was once
  stored as his show's run).
- **One `MONTH_PATTERN`, and the prose parser falls through to the listing
  parser** — two parsers drifted twice, losing dates.

### Loose rules apply to a listing card, not a page

A bare `Month YYYY` on a whole page is a lottery — a 1994 photo caption became a
2024 show's opening date. `findDateRangeInProse` passes `looseSingles: false`:
bare month-year, season-year and undated-preposition singles are refused on page
text. Ranges and singles with a preposition are allowed everywhere.

### A date must be proved to belong to this exhibition

1. **Structured data → the event's name must match** (`pickStructuredEvent()`);
   no match or a tie → skipped.
2. **Page text → a prose range that disagrees with a date already collected is
   discarded whole** (a National Gallery course advertised on a show's page).
3. **Listing cards → stop at the card's edge** (`coversMoreThanOneExhibition()`),
   not after a fixed number of steps.

Losing a wrong date is right: an incomplete row sends the scraper to the show's
page, which states the dates. **Unsolved:** a page with no listing dates and a
related event on it will give the wrong dates silently. The ladder: the site's
own tag → structure (URL, block) → collect, flag, let her decide.

### Structured data

schema.org Event blocks, read on any venue that has them (only the National
Gallery today, detail pages only) — a bonus source, never a replacement, and only
after the name check.

---

## 4. Keeping junk out of the summary — her biggest issue

**Why it matters:** an artist named in a caption reads exactly like an artist
named in the blurb, so compression can state something false. Rules in
descending trust — use the next only when the one above gives nothing:

1. **The page names the block** — `image-caption` (Tate), `Alert` (Louvre),
   `onetrust`, `has-custom-color` (Capodimonte). Survives rewording.
2. **The markup's shape** — a paragraph bold end to end is a label (Wallace),
   guarded to fire only where non-bold prose exists. `keepBold` exempts a bold
   lead paragraph where a venue writes one.
3. **A phrase list** (`BOILERPLATE`) — weakest. Only phrases that could never be
   curatorial prose (donor lists, ticket prices).

- **A noise class on a container holding most of the page is layout**, not noise
  (Wallace's footer spacer, V&A's cookie panel). Ancestor walks stop before
  `<body>`.
- **Clearing one kind of junk can pull in another** — re-check reviewed venues
  after any change here.
- **The 4-paragraph / 2,000-character cut stays** (her ruling, 25 Sep).
- Tested on saved pages: `summary_pages.js` and the per-venue `*_pages.js`.

---

## 5. Failure handling

**Every venue leaves a marker row for each listing page it could not read**,
carrying the reason. `classifyLoadError()` + `failureProse()`:

| What happened | On the card |
|---|---|
| HTTP 403 / 418 / 429 | the venue's site refused us (HTTP 429) |
| `ERR_FAILED` | the venue's site did not respond |
| `ERR_CONNECTION_RESET` | the venue's server dropped the connection part-way |
| `ERR_CONNECTION_REFUSED` | the venue's server refused the connection |
| `ERR_NAME_NOT_RESOLVED` | the venue's web address could not be found |
| `ERR_CERT_*` / `ERR_SSL_*` | the security certificate could not be verified |
| navigation timeout | the page did not finish loading in time |

`LOAD_ERROR, cause unknown` means an unseen error — add it, don't guess.

- **A transient failure is retried once, after 2s; a refusal never is**
  (`safeGoto`: `TIMEOUT`, `CONNECTION_*`, `EMPTY_RESPONSE`, `NO_RESPONSE`,
  `LOAD_ERROR`). Asking again after a 403 is hammering.
- **Status ≥ 400 is a failure**, though a 404 serves a readable page. The dead
  link stays in the URL column, with a note and an empty summary.
- **A dying browser is not a page failure.** A run stopped mid-venue once wrote
  the venue as complete with 10 of 16 summaries missing. Now:
  `classifyLoadError` returns `SHUTDOWN` (never retried); `safeGoto` throws
  `ScrapeAborted` so `writeVenueCsv` is never reached; **every catch that
  continues calls `rethrowIfAborted()`** — a dying browser fails ANY Playwright
  call. `SIGINT`/`SIGTERM` set `STOPPING`. E-001 to E-006.
- **A timeout says what it waited for** (`stallReport`): the page itself, or
  which of its files.

---

## 6. The engine / recipe split

**Engine (a fix helps every venue):** fetching and waiting, counters, the URL
guard, the lookback, structured data first, date parsing, writing the CSV.
**Recipe (`VENUES`, one block each):** which pages, which links are shows, where
title and dates sit, what to strip. **No clever general rule for the recipe
list** — a rule from Borghese was wrong at the Rijksmuseum a day later. Each
option is documented where it is defined in `sweep_prototype.js`.

- **`description`** names the element holding the blurb whatever its tag (V&A's
  blurb is a `div`; Capodimonte's paragraphs are divs). **`noise`** excludes a
  container at one venue only.
- **`notATitle` is checked in the heading branch too** — the heading once returned
  before any check ran.
- **`yearArchive` never writes the years down** — `expandYearArchive()` derives
  floor-year to last year at run time. Y-001 to Y-005 assert no hand-written year.
- **`within` and `paginate` are per page**, not per venue.

---

## 7. The network bridge — don't remove it

In the container Chromium cannot use the agent proxy (its large TLS greeting gets
the tunnel dropped: `ERR_CONNECTION_RESET` on every https page; launch-time proxy
settings don't help). **`installNetworkBridge()`**: Chromium does no network I/O;
Node answers every request through the proxy. Images, media and fonts are dropped
on purpose. The TLS fingerprint no longer matches the user-agent. **A raw egress
path around the proxy exists — do not use or build on it.** File reuse and reply
labels: `CLAUDE.md` §5.

---

## 8. Timings and run folders

Container, measured 12 Sep on 21 venues: one at a time 33 min; `--jobs=4`
(default) ~9–11 min; `--jobs=6` ~7–8 min, bounded by Capodimonte (6 min). Blocked
venues cost seconds. **Parallel across venues only, never within one** (IR-15).
A venue over budget (default 10 min) is abandoned, writes no file, and
`--continue` redoes it. Robots.txt waits, paced lanes and headed venues are
slower and are not in these figures — work out pages × wait for those.

**`archiveOldRuns` moves old runs to `output/archive/`, never deletes** — so
`--continue` resumes the right run. Never moved: newest 10, anything with a
compressed CSV (compression's memory), any run with 16+ venue files.
**Runs are committed** (~500 KB per full run). A container dying mid-run loses
completed venues; git is not built into the scraper on purpose (credentials
differ by machine).

---

## 9. Compression — the summary column

The scraper writes the raw text; `compress.js` turns it into the teaser;
`sweep_compressed.csv` is the file she imports. **Design and evidence:
`docs/compression.md` — finished and signed off, do not re-plan it.**

- **Reuse is by code:** every earlier compressed CSV (run_ and stitch_ folders,
  newest first) is memory; identical raw text reuses the wording with no model
  call. Changed text asks one question — is the old summary now false?
- **Identical text within one file is asked once** (`groupIdenticalRaw`), or two
  wordings reach her as a conflict.
- **Her 110 seed summaries are memory** (`seedMemory`), matched by URL slug, and
  never retired. **They fill gaps, never overrule** (`mergeSeedMemory`);
  `--seed-wins` is a one-time repair flag, never a standing rule — as a rule it
  is a revert machine.
- **Sonnet writes fresh, Haiku judges staleness** (measured), reached through
  subagents so the session's own model doesn't decide.
- A reuse caused by a failed page says so in `notes`.
- **Ten words at most, aim for six**, a noun phrase ending in a full stop —
  measured from her seed (median 6). "Maximum 10" alone produced a median of 9.
- **Running at scale:** chunks of ~75 rows (one subagent cannot hold ~300);
  compact one-line rows, examples folded in (44% fewer tokens than pretty JSON);
  run one chunk and look at it first. **The prompt is advisory** — subagents are
  read-only, and `--check` gates `--apply` (missing index, over length, a code
  fence, an HTML fragment).

---

## 10. No single key identifies an exhibition over time

Seed matching found 56 by title, 103 by URL, of 110. URLs change too: encoded
differently (`waldm%C3%BCller`), moved to `/past/`, slug renamed, or **recycled**
(Rijksmuseum's annual *Document Nederland*). Dates are the tiebreaker.

**The rule depends on the cost of being wrong:** the app folds on the same URL
only (a wrong fold loses a show silently); compression's memory matches loosely —
URL, then title, then dates (a false match only hands the model old wording
alongside the real text).

---

## 11. Travelling exhibitions — a note, never a merge

A venue with two galleries running one show keeps both rows, the city in each
title; `noteTravellingRuns()` adds "The same exhibition is also shown at …".
Never de-duplication. Opt in with `locations`. Acquavella adds the gallery only
to a show run in both within six months.

---

## 12. Her rules for wiring a venue

The intake order is `CLAUDE.md` §5. Also:

- **Her count first; the sweep must return it.** Her counts caught two errors the
  output could not show.
- **Two rounds of fix-and-sweep per venue, then stop and ask** — after checking
  the limit is real (KHM "published two links" because it lazy-loads).
- Diagnose one VENUE at a time: getting data → the right data → recorded right.
- **An engine change is re-verified against the reviewed venues** in the same
  sitting.
- **Hers:** whether something is an exhibition. **The session's:** how the
  scraper finds it, and checkable facts about a site — **verified, never
  assumed** (the Wallace brief's address was a two-tile hub).
- **Count rows, not links.** Reachability is not the question: a row needs a
  title, two dates and curatorial text.

---

## 13. artic — only the venue's own exhibition types

**Her ruling, 12 Sep:** only `EXHIBITION` and `TICKETED EXHIBITION`; every
`… INSTALLATION` and `COLLECTION ROTATION` is out — filtered, not just stripped
from the title. Further exclusions: `CLAUDE.md` §2.

- **The tag is on the show's own page**, not on archive cards.
- **Year pages group by OPENING date**, so the year before the floor is read too.
- **The venue contradicts itself** — the annual Neapolitan Crèche is tagged
  `HOLIDAY INSTALLATION` one year and `EXHIBITION` another. Her ruling: trust the
  tag, accept the hole.
- `show_tags.js` prints every row's tag (`tags_<venue>.txt`), reading the same
  window as the exclusion.
- **The title lesson:** three title fixes guessed from the CSV were wrong because
  the CSV flattens line breaks, and the defect was line breaks. A perfect count
  (77) hid two half-names; only reading all 77 titles found them.

---

## 14. Blocked venues — what was learned

- **`claude/quiet-user-agent` is parked** (her ruling, 19 Sep) — do not merge or
  reopen. Its one proven fact: removing `HeadlessChrome` from the user-agent
  opened MoMA's listing only, never its pages.
- **A probe answers only the request it made.** One listing page read as "the
  venue is open", the scraper changed, and causes invented when the sweep failed.
- **What worked:** a visible Chrome on a profile she has browsed in, paced ~30s,
  in mode B. All four Cloudflare venues (`moma`, `brit`, `morgan`, `orsay`) are
  swept that way from her laptop. Evidence: `docs/venues.md`, "The headed venues".
- **Why the container is refused** at those venues is not known. Don't state a
  cause as fact.
- **Blocked venues stay wired in:** a refusal costs half a second, leaves marker
  rows, and makes every sweep a monitor. Blocks come and go.
- **Who sweeps what is code** (`machineVenues()`), because remembering failed: on
  13 Sep the container's met/artic refusals landed beside her laptop's real rows
  and she couldn't tell which machine had been blocked. Sweeping from both also
  doubles the load that gets venues blocked.

---

## 15. Capodimonte is closed differently

Her ruling, 12 Sep. Italian only; checking a row against the site is uselessly
slow. **Not count-verified and never will be.** She imports every row unless
visibly mangled and uses the app's URL button with Chrome's translation.

- **The `url` column is the load-bearing field here**, not the dates. Every row
  carries the show's own address; five have no closing date, accepted.
- **The summary must arrive in English** — the prompt now requires it
  (`compress_prompt.md`); the English translation of Italian titles opens the
  description (`CLAUDE.md` §4).

---

## 16. Open — confirmed only by a sweep that happens anyway

Her instruction: no probes for hypothetical problems.

| Open | Why |
|---|---|
| `artic` — a year needing page three? | Recipe reads pages 1–2; the standing check reports it |
| The load-more fix beyond the Louvre | No other venue has such a control |

---

## 17. Known limits

1. **Nothing filters out non-exhibitions generally** — only URL shape. Where a
   venue tags (Tate's `event_type`, V&A's `Display`, Tate Britain's `ONGOING`,
   artic's types, Jacquemart-André's card tag, d'Orsay's tags), the tag is used.
   A venue that tags nothing needs its own answer.
2. **Titles are recorded in the venue's own letters** (`restoreCase`); a venue
   that types capitals everywhere gets ordinary capitals from code
   (`capsTitles`). A change of capitals is a Change card, her ruling 23 Sep.
