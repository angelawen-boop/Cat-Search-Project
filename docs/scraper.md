# The scraper — forensics

How `scraper/sweep_prototype.js` reads a museum site, and what every rule in it
cost to learn. `CLAUDE.md` §5 carries the commands and the shape; this carries
the reasoning.

**Read the relevant section before changing that area.** Almost every rule below
replaced something that looked sensible and was silently wrong.

---

## 1. How a listing page is read

Per page: `seen -> navigation / already-seen URL -> collected (n with no readable
title)`, ending in a coverage table. **Every link is accounted for by a number.**

**Titles come from the page's own heading where there is one**, never from the
first line of link text — that captured badges and made 32 National Gallery
exhibitions share 3 titles. Where a venue wraps only the *image*, the title is
read from the card container above, guarded: at most 2 levels up, nothing over
220 characters.

**A link with no readable title is never dropped.** It gets a blank title and a
note saying what the URL slug suggests. The slug guess stays in the notes and
never enters the title column.

**`noTitle` is counted when the page is FINISHED, not as each link is read.** A
venue links one exhibition several times per card; `fillBlanksFromRepeatLink()`
supplies the name a moment later, but the counter had already fired. The Met
reported **43 unreadable titles on a page whose finished rows every one had a
title**, and that was read as a defect and reported as one. **Report the state
that reaches her.**

**The same exhibition linked three times on one card.**
`fillBlanksFromRepeatLink()` fills the kept row's **empty fields only** from
other links to the same address — not de-duplication, and it cannot lose
anything. Button text is not a name: `CTA_ONLY` rejects a link whose **whole**
text is one of those phrases, so a title containing "Explore" survives.

**A link back to the venue's own listing page is navigation** — universal.
`isOwnListingPage()` compares with any language prefix stripped, so
`/es/exhibitions/past` matches. Mechanical rather than a judgement, because we
already know which pages are listings. It cannot swallow a real exhibition;
fixture N-004 guarantees it.

### Three universal behaviours added 12 Sep 2026

- **A listing page is SCROLLED before it is read.** The KHM builds cards as you
  scroll; read at the fold its whole programme is two links, and that was
  written into the project guide as a fact about the venue. Listing pages only;
  the loop stops when the page stops growing.
- **Measure the page height AFTER the wait, not before.** The first version
  still missed all three KHM upcoming shows. It now requires two unchanged
  steps.
- **A page that loads and yields nothing leaves a marker row.** The check sits
  AFTER the de-duplication guard, so a page whose links were all collected
  elsewhere does not report itself as empty.
- **A title can come from the exhibition's own page when the listing gives
  none.** Fills a BLANK only, never overwrites.

---

## 2. Getting past a listing's first page

Two shapes of "there is more below", and which one a venue uses decides
everything.

### A numbered archive is just more addresses

The Menil's past listing paginates, `?page=2`, and only page one was being read
— **12 exhibitions lost outright**, invisible in the output because a first page
that reads perfectly looks exactly like a complete archive.
`followPagination()` asks for the next page and lets the site's answer decide
whether there is another, stopping when a page hands over no address not already
seen. **How many pages there are is never written into a recipe** — the same
trap as a hand-written year, one step worse, because only the site knows.

**It stops at the lookback floor, and that is not an optimisation.** The first
version walked to the true end, on the grounds that stopping early assumes a
newest-first archive. That caution cost eleven Menil pages instead of three and
put 13 decades-old undated exhibitions on her approval pile that nothing
downstream could drop. **The ordering is not assumed, it is checked**: each page
carries its newest closing date to the next, and the first page that comes back
newer says so in the log and reverts that venue to reading to the end.

**The index base is the site's to state.** The Menil's bare page IS page 1
(`from: 2`); the Frick's is page 0 (`from: 1`). Fixture P-014 holds both.

### A "load more" button is a control, and pressing it is correct here

The test is whether the address changes — the Met's year menu changes it, so each
year was simply another page and clicking raced the navigation; the Louvre's
loader changes nothing in the address bar and has no address of its own that
answers. A venue names its own control (`loadMore`); there is no general rule for
what such a button looks like.

Three things make it work, and each cost a failure:

- **The consent banner comes down first** (`dismissConsent()`, universal). The
  Louvre's control was recorded as broken for two days because the cookie popin
  swallowed the click. **"I clicked it and nothing happened" is only evidence if
  the click reached the thing.** The banner is not shown on every visit, which is
  how one unlucky test became a written fact.
- **The anchor's default action is cancelled before every press.** The button is
  a disguised link to a page that 404s. While there is more to load the site
  intercepts the click; once the list is complete it stops intercepting, the
  browser follows the href, and the listing is replaced by the 404. **The failure
  needs the press AFTER the last real one**, so a single-click probe cannot show
  it — mine reported success immediately before the live sweep lost 8 rows. **A
  control tested once is tested in its easy case.**
- **The press is followed by a WATCH, not a sleep — 13 Sep.** A fixed 2.5s pause
  then one count was answering two questions at once — has the batch arrived, and
  is there no batch — and cannot tell them apart. Under load it read a slow batch
  as the end of the list: the Louvre's "past 2025" gave 6 links at `--jobs=4` and
  11 alone, same code, same day, both reporting success. Now polled until it
  grows; only 12s of nothing means the end. **22 was never a verified ceiling** —
  the old loop read 43 links from the past page where it now reads 60.
- **The stop REASON is logged, not just the press count.** "pressed 1x" was
  printed whether the control vanished, the click missed, or the batch was slow.
  **A log that cannot tell a working mechanism from a broken one is why this sat
  unnoticed.**

### The standing check for a page nobody follows

`detectUnwiredPagination()` asks every listing page, every sweep, whether it
links a page no recipe follows, and reports it in the run summary. **Structural,
never a phrase list** — same address, one number different. **It warns, never
fetches.** A filter the recipe drives itself is not a page: artic's `?year=`
decade links tripped it 32 times for a venue with nothing missing, so
`recipeDrivenParams()` excludes them. **A false alarm teaches her to scroll past
the real one.**

`scraper/probe_pagination.js` asks whether a given page holds anything.
Read-only; reads the venue's own selector so it cannot drift from the engine.

**`yearDropdown` is gone.** Driving the Met's year menu returned the same 68
links three times. **The menu changes the ADDRESS** — `?year=2025` — so each year
is simply another page, and clicking raced the navigation. **Check the address
bar before reaching for a click: if it changes, there is no interaction to
automate.**

---

## 3. Reading dates

**All date parsing is shared, on purpose** — every venue contains several
venues' worth of formats (the Rijksmuseum alone uses six), so a pattern learned
at one is worth having at all.

Sources in order: **structured data** → the **listing card** (`datesNearLink`) →
**prose on the exhibition's page** (`findDateRangeInProse`) → a date-ish element.
The detail scan runs whenever *either* date is missing and **fills only empty
fields — the listing wins on disagreement.**

### A closing side that is not a date — 22 Sep 2026

Found by running MoMA's real listing text through the parser rather than
reading it off a screenshot. **`Aug 1, 2026–Summer 2027` wrote 1 Aug 2026 into
the CLOSING column** — the opening date, in the field her whole out-of-print
window is calculated from. It fell through every range pattern (the closing
side is not a date) to the single-date rule, which had no reason to know it was
half of a range.

**Not a gap. A wrong answer shaped exactly like a right one**, and no count or
QC pass could see it: the row had a plausible date in a plausible column.

Four shapes now read correctly, all above the single-date rule, and the
placement is the fix:

| Card | Reads as |
|---|---|
| `Aug 1, 2026–Summer 2027` | opens 1 Aug 2026, no closing date, 2027 kept as a bound |
| `Sep 3, 2026—Spring 2027` | same, em dash — MoMA uses both |
| `Mar 8, 2025–ongoing` | opens 8 Mar 2025, still open |
| `Through Oct 4`, `Ongoing from Oct 19` | month-first, no year — the year is derived |

**The derived year has one answer, so it is code.** A listing of what is on now
cannot describe a show that closed last March, so a month already past belongs
to next year — the same reasoning `startYearFor()` uses on the opening side.
`findDateRange` takes an optional `today` so a fixture can pin it; a parser
that silently read the clock would pass in September and fail in November.

Fixtures MO-001 to MO-010. No other venue produced any of these shapes — every
committed sweep was checked — so nothing existing changed behaviour.

### Formats handled, all found in the wild

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

**A weekday name breaks every range pattern**, so it is stripped first. The
Wallace prints "Saturday 23 May - Sunday 29 November 2026" and its Churchill row
reached her with NO dates and a note saying the venue published none — untrue,
and the same shape of failure as dellav below: **the scraper blamed the site for
its own gap.** The strip is anchored on what follows (a day number or a month
name) so a bare "Sun" is not cut out of prose. Longest alternative first, or it
removes "Sunday" and silently leaves "Saturday" — which is what the first attempt
did.

**Three-letter Italian months.** The Gallerie dell'Accademia prints "10 set 2026
- 22 nov 2026" on its ENGLISH page. `nov` matched as English, `set` did not,
because the map held `sett`. Both dates came back blank.

**Italian is in the SHARED month map**, like every other format: five wired
venues are Italian. Without it Capodimonte's 50 rows were ALL undated, and
undated rows cannot be excluded by the lookback, so its entire history survived.
Note the elision: "al" becomes "all'" before a vowel, in both apostrophes, and
**the longest alternative must come first** or a bare "al" matches the first two
letters of "all'8".

**An ALL-NUMERIC range is read only when the numbers PROVE their own order.** In
"From 21/03/2024 to 28/04/2024", 21 cannot be a month, so the range is day-first
and the other end inherits it. If either end has a first component over 12 it is
day-first; a second component over 12, month-first; if **neither end proves
anything the range is refused** rather than guessed. It is a **listing-card
rule** — run against whole page text it gave two Uffizi exhibitions the run of a
sidebar lecture.

**A range that runs backwards crosses the new year**, and the opening year is
worked out rather than assumed. "December 5 – January 20, 2026" opened in
December **2025**. Until 10 Sep the start inherited the closing year, so the show
ended seven weeks before it opened. Museums run winter shows constantly.

**Every date is checked against the calendar before storage.** `ymd()` is the
single gate. JavaScript rolls `2026-02-31` silently forward to 3 March, so an
impossible date never announces itself — it becomes a plausible **wrong** one and
can then decide whether a show passes the lookback.

**Every dash is normalised first** — U+2010 to U+2015, minus sign, Hebrew maqaf.
With only the en dash handled, a figure dash made "15 October 2026" read as
1 October.

**Two guards stop art history being read as exhibition dates:** a month **name**
must sit beside the number, and the year must be plausible (**1990–2035**).
Verified against `Caravaggio (1571-1610)`, `stayed in Italy in 1629`,
`confiscated on 4 May 1607`, `August 17 1945` — all correctly ignored.

**A published opening year that fails that guard refuses the whole range** — it
is never quietly swapped for the closing year. Capodimonte's Mimmo Jodice page
says "Mimmo Jodice ( Napoli 29 marzo 1934 – 27 ottobre 2025)", the photographer's
birth and death. 1934 was rejected, the opening year was then worked out from the
closing one, and **a lifespan was stored as the exhibition's run** in a row that
looked healthy in every other respect. The flaw was treating "no year published"
and "a year published that cannot be an exhibition year" as the same case. They
are opposites: the first is a gap to fill, the second is proof the sentence is
not about a run at all.

**The two parsers must not diverge.** `findDateRange` (listings) and
`findDateRangeInProse` (page text) drifted twice, each time silently losing
dates. The prose parser now falls through to the listing parser, and there is one
shared `MONTH_PATTERN`.

**Her standing rule:** where the code has applicable logic it uses it; where it
has none the date columns stay blank and the notes explain why. **Never a
guess.**

### A listing card is not a page — the loose rules apply to one, not the other

**The most dangerous rule in the file is "one month name beside one year".** On a
listing card that is almost certainly the exhibition's date. On a whole page it
is a lottery, because a page also carries navigation, captions, a footer and
opening hours.

The Rijksmuseum's *Express yourself* prints `16 Feb - 9 June` with **no year
anywhere**, so the scan fell through to the bare month-and-year rule and matched
a photo caption — *"Gerard Wessel, RoXY, Amsterdam, April 1994"*. A 2024
exhibition got a **1994** opening date, ranking it thirty years closed.

So `findDateRange` takes `{ looseSingles }` and `findDateRangeInProse` passes
**false**. Refused on page text: bare `Month YYYY`, bare `Season YYYY`, bare
`Month D, YYYY` with no preposition. Still allowed everywhere: every range
pattern, and a single date with a preposition (`until 20 February 2026`).

Express yourself now returns **no dates at all**, with a note. That is the
correct answer — the venue never published a usable one.

### A date must be proved to belong to this exhibition — three sources, three guards

The 9 Sep review raised this against **structured data** only (IR-09). It was
implemented exactly that narrowly, and the underlying principle was not carried
across. Both other sources then failed the same way within a day. **Read the
principle, not the finding.**

1. **Structured data → match the event's name.** `pickStructuredEvent()`.
2. **Page text → refuse a sentence that contradicts what is already known.**
   National Gallery pages carry related courses. Waldmüller's page advertises a
   course running "7 September - 28 September 2026" while its card says "Until 20
   September 2026". The old rule was "fill only what is empty", so it took the
   course's opening date and discarded its closing date — the very thing proving
   the sentence belonged to something else. No date-*shape* rule can catch this,
   so **if either end of a prose range disagrees with a date already collected,
   the whole range is discarded.**
3. **Listing cards → stop at the edge of the card.** `datesNearLink()` walked a
   fixed two steps; a step count is not a boundary. Two steps up sat a box
   holding one card *and the next one*, whose dates had a year and so won. The
   walk now stops as soon as a box contains **more than one exhibition address**
   (`coversMoreThanOneExhibition()`), whatever its size.

**Why losing that date is the right outcome:** the row is then incomplete, and an
incomplete row is exactly what sends the scraper to the exhibition's own page,
which states the dates plainly. The bad grab cost the correct answer twice over,
because a row that looks complete is never followed up.

**The half that is NOT solved.** There is no general way to tell an exhibition's
dates from any other date on its page. All three guards need something to check
against. Where a venue's listing carries no dates and its page carries a related
event, the scraper will take the wrong dates silently. The ladder is the same
each time:

1. **The site says so** — use its tag, exactly as structured data is used.
2. **Structure implies it** — URL shape, which block the text sits in.
   Mechanical, so code's job.
3. **Neither** — collect it, flag it, let her decide. Never guess, never drop.

### Structured data

Some venues embed a **schema.org Event** block: title, dates and description as
real fields. It removes exactly the part that keeps breaking.

**Universal logic, not a per-venue opt-in** — a venue that adds it later is
picked up with no code change, one that removes it falls back silently. It is a
**bonus source, never a replacement**: only the National Gallery publishes it,
and only on detail pages, so the listing still has to be walked and the browser
is always needed.

**It must be proved to belong to this exhibition before use.** A page can carry
several event blocks — a members' preview, a curator's tour, stale metadata.
`pickStructuredEvent()` accepts one only on a confident name match; no match, or
two equally good ones, and structured data is skipped entirely. A wrong date
labelled "from the site's structured data" reads more authoritative than a blank
one, which is worse than nothing.

---

## 4. Keeping junk out of the summary — her biggest issue, 12 Sep

Her verdict across the twelve venues she reviewed: **the biggest problem is junk
text in the summaries** — photo captions, "join us for the opening talk",
ticketing. And the reason it matters is hers, not a restatement: some litter the
compression step can be trusted to ignore, but **an artist and a work named in a
caption read exactly like an artist and a work named in the blurb**, so the model
cannot tell them apart and can state something false with no way to know.

Three kinds of rule, in descending order of trust. Reach for the next one only
when the one above gives nothing:

1. **The page names the block itself** — `image-caption` at Tate, `Alert` at the
   Louvre, `onetrust` anywhere, `has-custom-color` at Capodimonte. Strongest,
   because it survives the wording inside changing, and the Louvre's visitor
   notices change weekly.
2. **The shape of the markup** — a paragraph that is bold end to end is a label,
   not prose. The Wallace's details line sits in the same `div.rich-text` as its
   blurb, same class, same parent; the bold is the only difference. Guarded to
   fire only where the page has non-bold prose to fall back on.
3. **A phrase list** (`BOILERPLATE`) — "admission charge", "generously provided
   by", a star rating. **Weakest, and it does not generalise**: it catches only
   the phrasings we have seen, and a venue writing "entry is chargeable" slips
   through. Only add a phrase that could never appear in a real blurb — a donor
   list, a ticket price — never a word that might turn up in curatorial prose.

**Junk in a summary is visible on her approval card, unlike a dropped row.** That
is why a phrase list is an acceptable last resort here and would not be
acceptable for deciding what to collect.

**Clearing one kind of junk can pull in another.** Removing Tate's caption freed a
slot and what moved up at the Menil was the funder list — and the Frick was
already shedding those while the Menil was taking them on. Re-check the closed
venues after every change to this area, which is her standing rule for an engine
change anyway.

---

## 5. Failure handling

**Every venue leaves marker rows for listing pages it could not read** — one per
page, titled `[past page]`, carrying the reason. Universal since 10 Sep: it was a
per-venue opt-in, so **the Met, refused on every page, contributed nothing at
all**. A standing monitor that reports nothing is not a monitor.

`classifyLoadError()` reads Chromium's own error name and `failureProse()` turns
it into the sentence she sees:

| What happened | On the card |
|---|---|
| HTTP 403 / 418 / 429 | the venue's site refused us (HTTP 429) |
| `ERR_FAILED` | the venue's site did not respond |
| `ERR_CONNECTION_RESET` | the venue's server dropped the connection part-way |
| `ERR_CONNECTION_REFUSED` | the venue's server refused the connection |
| `ERR_NAME_NOT_RESOLVED` | the venue's web address could not be found |
| `ERR_CERT_*` / `ERR_SSL_*` | the security certificate could not be verified |
| navigation timeout | the page did not finish loading in time |

A reason falling through to `LOAD_ERROR, cause unknown` means a network error we
have not seen; add it rather than guess.

**A transient failure is retried once — a refusal never is.** A failed page costs
the row's dates, and a row with no end date cannot be dropped by the lookback, so
it arrives as a rogue undated card. `safeGoto` retries **once**, after two
seconds, only on `TIMEOUT`, `CONNECTION_*`, `EMPTY_RESPONSE`, `NO_RESPONSE`,
`LOAD_ERROR`. **Every HTTP status is excluded, deliberately** — a venue answering
403 has told us its answer, and asking again is the hammering the standing rule
forbids.

**A page that loads is not a page that exists.** `safeGoto` refuses any status
≥ 400. A 404 still **serves a readable page**, so "This page does not exist." was
stored as three Rijksmuseum summaries. Those rows are kept and carry a note; **the
dead link stays in the URL column**, because `applyRefresh` falls back to the
venue's generic listing when `exUrl` is empty, and an arrow that silently goes
somewhere else is worse than one that goes nowhere honestly. Such rows
necessarily have an empty summary.

**A dying run is not a page failure.** The run directory rests on one guarantee —
a venue file on disk means that venue finished — and it was not true. A run
stopped by hand mid-venue recorded the browser teardown as nine ordinary page
failures, **retried them against a browser that no longer existed**, declared the
venue complete and wrote 10 of 16 summaries missing. Nothing said so. A browser
crash does the same with nobody touching anything. Three parts, all needed:

1. `classifyLoadError` returns `SHUTDOWN` for `Target closed`, `Browser has been
   closed`, `Execution context was destroyed`, `Target crashed` — deliberately
   **not** in `TRANSIENT_FAILURES`, so never retried.
2. `safeGoto` **throws `ScrapeAborted`** rather than returning `{ok:false}`. A
   returned failure looks like a page that would not load, so the venue finishes;
   throwing means `writeVenueCsv` is never reached.
3. **`rethrowIfAborted()` in every catch that continues past a failure.** This is
   the part missed first time, and why it must be stated as a principle: **a
   dying browser raises the same error from ANY Playwright call, not only
   navigation.** Every catch in a scraper is written for the page in front of it
   — that is right, and exactly why each one needs this guard.

Also: a `SIGINT`/`SIGTERM` handler sets `STOPPING` so the venue stops at its next
navigation. Fixtures E-001 to E-006 cover the classification.

---

## 6. The engine / recipe split

**One engine, one recipe per venue.** The split follows what the logic is
*about*, not whether it happens to be shared.

**Universal — in the engine, a fix here helps all 21:** fetching and waiting, the
counters, the URL-identity guard, the lookback rule, structured-data-first,
**parsing a date string once you have it**, writing the CSV.

**Per venue — in `VENUES`, one readable block each:** which pages to visit, which
links are exhibitions rather than navigation, where the title sits, where the
dates sit, what boilerplate to strip.

There is no clever general rule for the second list, and **every attempt at one
has cost us**. A rule learned at Borghese — "never read the title from above the
link" — was wrong at Rijksmuseum a day later. A venue writes down only what
differs.

Recipe options: `selector`, `isNav`, `title` (heading / card / strip rules),
`lookbackAfterDetail`, `excludeOngoing`, `yearArchive`, `lookbackFrom` (unused),
`card: { firstLine }`, `otherBranch`, `within` (per **page**, not per venue),
`excludeUndated`, `suffix`, `includeCurrentYear`, `notATitle`, `excludeLabelled`,
`paginate` (per **page**), `loadMore`, `description`, `noise`.

The last two are about where the BLURB is, and they exist because the shared
extraction ladder expects a paragraph at every rung:

- **`description`** names the element holding the curatorial text, read whatever
  its tag. The V&A writes its blurb into a `div` with no paragraph in it at all,
  so the ladder fell to the bottom rung and stored the membership offer on all 15
  rows. Capodimonte keeps its article in a tabbed panel whose paragraphs are
  divs, so the ladder took a nested fragment and several summaries began
  mid-sentence.
- **`noise`** names extra containers to exclude at one venue only —
  Capodimonte's practical-info box is styled `has-custom-color`, a generic
  WordPress class that means nothing anywhere else.

Two that carry a trap:

- **`notATitle` is checked wherever `CTA_ONLY` is checked, INCLUDING the heading
  branch.** The heading was trusted first and returned before any check ran,
  which was the entire bug on the first attempt — Tate's hero cards named two
  exhibitions after the building.
- **`yearArchive` never writes the years down.** A recipe listing `2025, 2024` by
  hand is correct that afternoon and wrong every year after: run it in 2028 and
  the sweep **completes, reports no error, and is quietly missing two years**. So
  a recipe declares the shape and `expandYearArchive()` derives the years at run
  time — the floor's year through **last** year, newest first, current year
  excluded because the bare `past` page already serves it. Fixtures Y-001 to
  Y-005 assert no recipe carries a hand-written year again.

---

## 7. The network bridge — don't remove it

In this container all outbound traffic goes through an agent proxy, and
**Chromium cannot use it**: the tunnel opens, Chromium sends its unusually large
(~1.8 KB) TLS greeting, and the proxy drops the tunnel —
`net::ERR_CONNECTION_RESET` on every https page. Setting a proxy on
`chromium.launch()` does not fix it; nor does ignoring certificate errors,
because it is not a certificate problem.

**The fix, proven and in the code:** Chromium does no network I/O at all. Every
request is intercepted and answered by Node, which reaches the internet through
the proxy fine. Chromium still parses, renders and runs JavaScript normally. This
is `installNetworkBridge()`.

Two consequences: the TLS fingerprint does not match the Chrome user-agent the
page sends, so sites checking for that may notice; and image, media and font
requests are deliberately dropped.

**A raw egress path around the proxy exists. Do not use it and do not build on
it.** The environment routes traffic through the policy proxy deliberately. The
remaining route is to **report** the WebSocket limitation, not engineer past it.

---

## 8. How long a sweep takes — measured 12 Sep 2026 from the run logs

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

### The sweep archives old runs at start-up

`archiveOldRuns`, 13 Sep. Diagnosing one venue means running real sweeps, each
leaving a folder, and `--continue` resumes whichever is NEWEST — by 13 Sep there
were 135 and the newest three were one-venue probes. **Moved into
`output/archive/`, never deleted**, and three things are never moved: the newest
10, anything holding a compressed CSV (that is compression's memory — archiving
it silently recompresses everything), and any run with 16+ venue files. It runs
before the run directory is chosen, and says what it moved.

**Runs are committed, not gitignored.** The container is temporary: a finished
sweep could otherwise be lost because nobody asked for the file before the
session closed. Committing also lets a later session read an earlier sweep to
diagnose a change. Size is not a reason to hesitate (~500 KB per 21-venue run).

One gap, honestly: if the container dies **mid-run**, completed venues are still
lost. Git is deliberately not built into the scraper — credentials differ between
machines, and that fails silently.

---

## 9. Compression — the summary column

The scraper writes the **raw curatorial dump**; `scraper/compress.js` turns it
into the ~6-word teaser she reads, and `sweep_compressed.csv` is **the file she
imports**.

- **Reuse is by code and cannot be wrong.** It reads the previous run's
  compressed CSV; identical raw text reuses the wording with **no model call**.
  Changed text asks one question — *is the old summary now false?* — handing over
  the old wording.
- **Identical text INSIDE one file is also asked once** (`groupIdenticalRaw`,
  13 Sep). A stitched file repeats any venue swept on both machines, and the
  previous-run memory cannot see the copy beside it. Asking twice is worse than
  wasteful: each row is an isolated question, so the model can word the same text
  differently and the difference reaches her as a conflict.
- **Her 110 seed summaries are memory too** (`seedMemory`). They predate the
  compressor, so every one read as "never seen" and would have been rewritten —
  ~100 cards proposing to replace her own wording. They carry no raw text, so
  each becomes a REVIEW rather than a free reuse. Matched through the same keys
  as everything else: the seed stores a URL SLUG, and matching it by title found
  56 of 110 where 103 were there. **It does not retire** — the seed is baked into
  the JSX, so every run consults it.
- **The seed fills gaps, it does not overrule.** `mergeSeedMemory()` adds her
  wording only where the previous run knows nothing. `--seed-wins` lets hers
  REPLACE a compressor-written summary, but that is a **one-time repair, never
  the standing rule** — as a rule it is a revert machine, since a venue rewording
  its page should produce an updated summary and a standing override would reset
  the memory and propose changing it straight back forever. It repaired one
  non-recurring condition (19 Sep): Acquavella was compressed 11 Sep, before
  `seedMemory` existed, so 13 of her summaries came back as proposed rewrites; 10
  of the 13 cost no model call, the pending set being byte-identical.
- **Sonnet writes fresh, Haiku judges staleness.** Measured, not assumed.
- **Reached by subagent, not the session itself** — a session uses whatever model
  it happens to be, which discards the measurement.
- **A reuse caused by a failed page must say so in `notes`.** Silent reuse papers
  over a scraper failure.
- Cap is **ten words**, ending in a full stop, a noun phrase — measured from her
  110 seed summaries, not chosen. Their MEDIAN is 6, and that distinction cost a
  chunk: told "maximum 10, examples average six", the model heard the ceiling and
  wrote a median of 9 with nothing under 7. Told to aim for six, with her
  three-word summaries quoted as exemplary, it came back at a median of 6.

**Running it — measured 19 Sep on 652 rows, the first time at scale.** The
mechanics are in `compress_cli.js`, which writes the job files and prints the
steps; this is only what a session cannot see from there:

- **ONE subagent cannot take 296 rows.** It must hold every row's raw text and
  write every answer. Chunks of 75 cost ~100k tokens each, three times running.
- **The file shape is most of the cost.** Pretty-printed JSON with unused fields
  plus a separate examples file: 173KB, 178k tokens. The same rows flattened to
  one compact line, examples folded in: 112KB, 100k. Identical work, 44% less.
- **Run one chunk and look at it before spending the rest.**
- **THE PROMPT IS ADVISORY.** In five jobs a subagent wrote a file it was told not
  to (35k tokens to copy its own input), ignored "read once" twice, wrapped its
  answer in a code fence, and twice carried an HTML entity through an explicit
  rule. Anything that must not happen is removed from its tools — read-only
  subagents — or checked in code coming back: `--check` gates `--apply` and
  refuses on a missing index, an over-length summary, a fence or an HTML
  fragment.

**Full design, evidence and the rejected alternatives: `docs/compression.md`.**
It is finished and signed off — do not re-plan it.

---

## 10. No single key identifies an exhibition over time — 13 Sep 2026

Found while matching her 110 seed summaries against a real sweep. Title matching
found 56; URL matching found 103 of the same 110. Four cases where they
disagreed, and they had four different causes:

| What happened | Example |
|---|---|
| Same address, written differently | `waldmuller` vs `waldm%C3%BCller` |
| The show moved to the archive | `/exhibitions/zurbaran` → `/exhibitions/past/zurbaran` |
| The venue renamed its own slug | `ng-stories-making-a-national-gallery` → `ng-stories` |
| **The venue RECYCLED an address** | Rijksmuseum's *Document Nederland* is annual; `/past/document-nederland` now points at the 2024 edition and the 2025 one has a suffix |

The first two are code gaps, not changes: decode before comparing, and strip a
known listing segment. The last is the important one — **a URL is not permanent
either.** It is the address-shaped version of artic's Crèche problem.

**So neither key works alone, and DATES are the tiebreaker.** Same address with
date ranges a year apart is a recycled address, not one exhibition.

**The right answer differs by where it is used, because the cost of being wrong
differs.** This is the part to carry across:

- **The app's folding — strict, same URL only.** A wrong fold loses an
  exhibition permanently and silently. Everything else becomes two cards she can
  see and reject.
- **Compression memory — loose is safe.** Both failures are soft: a miss costs
  one model call, and a false match hands the model the wrong old wording
  **together with the real blurb**, so it rewrites. URL, then title, then dates.

Applying the app's rule to compression wastes calls; applying compression's rule
to the app loses rows.

---

## 11. Travelling exhibitions — a note, never a merge

A venue with two addresses runs the same show in both. Both rows are always kept
and the **city stays in the title**, so they read as different entries.
`noteTravellingRuns()` adds "The same exhibition is also shown at Palm Beach." to
each. Matching ignores the city and all punctuation. **It must never become
de-duplication:** a wrong match costs one misleading sentence, never a row. A
venue opts in by listing its `locations`.

---

## 12. Her rules for wiring a venue

- **Count the live listing pages FIRST, then write the recipe, then check the
  sweep returns that number.** This step was skipped for the European venues and
  she caught two errors from the counts alone that the output could not show. An
  independent count is the only check that can say "your number is wrong" rather
  than "your rows look tidy".
- **Two rounds of fixing and sweeping per venue, then stop.** If a session cannot
  tell "the venue does not publish this" from "my recipe is wrong", it stops and
  asks. **But check the limit is real first** — the KHM was written off as
  publishing two links when the page simply lazy-loads.
- At most ~15 diagnostic page reads per venue. Commit each venue before starting
  the next; commit an unsolved venue anyway with the open question in the
  message.
- **Diagnose one VENUE at a time, not one ISSUE at a time.** Within a venue: is
  it getting data → is it getting the right data → is it recording it properly.
- **An engine change is re-verified against the signed-off venues in the same
  sitting.** Re-sweep after an engine change, never after a recipe tweak.

### What is hers and what is the session's

- **How the scraper mechanically finds the right thing on a page** — the
  session's.
- **Whether a thing is an exhibition at all** — hers. Use judgement, proceed, and
  surface it for confirmation.
- **Checkable facts about the outside world** (is this documented address really
  the listing?) — the session's, but **verified, never assumed**. This is the only
  one of the three that fails silently: a bad extraction rule shows up as visible
  junk, a wrong category call as unwanted cards, but a listing page never found
  shows up as nothing at all. The Wallace brief's address is a two-tile hub;
  trusting it would have returned 4 healthy-looking rows.

**Reachability is not the project's question.** Her correction: *"this is not a
project in can you map me an internet directory."* A row needs a title, two dates
and curatorial text. **Count rows, not links.** Three measurement failures in one
afternoon all made the same mistake — measuring something cheap instead of the
thing that mattered, then stating it confidently and having to withdraw it.

---

## 13. artic — the two lessons

### Only the two types the venue calls an exhibition, her ruling 12 Sep

**65 rows, down from 77.** She wants ONLY `EXHIBITION` and `TICKETED EXHIBITION`;
`COLLECTION INSTALLATION`, `COLLECTION ROTATION`, `VIDEO INSTALLATION`,
`SPECIAL LOAN INSTALLATION` and `HOLIDAY INSTALLATION` are all out. Her question
was the right one: *"I don't know why we simply unglued the tags, instead of
filtering out those exhibitions completely."* The badge stuck to the title was the
visible symptom, so it had been treated as a title problem, and stripping it left
the row in place looking like an exhibition.

**The tag is on the exhibition's own page, not on every listing card.** Its
current and upcoming cards carry it; its archive cards do not, which is why the
card rule caught eight on the current page and nothing at all across six history
pages.

**Its year pages group by OPENING date**, so the year before the lookback floor
has to be requested too — a show that opened in December 2023 and closed in
August 2024 is in range and sits on the 2023 page.

**The venue contradicts its own tagging.** The Neapolitan Crèche runs every year:
one instance is labelled `HOLIDAY INSTALLATION` and excluded, the 2024 instance
is labelled `EXHIBITION` and kept. **Her ruling: leave it.** Trusting the venue's
tag is still right — the alternative is us deciding what things are — but it
cannot survive the venue disagreeing with itself, and that is a known, accepted
hole rather than a bug to chase.

**`scraper/show_tags.js` prints every row's tag** and writes `tags_<venue>.txt`
into the run directory. It exists because reconciling her count meant opening
dozens of pages by hand to read one word off each — work with exactly one correct
answer per row, which makes it code's job. It reads the same 400-character window
as the scraper's own exclusion, so the two cannot disagree about where a tag
lives.

### The earlier title lesson, worth more than the venue

**77 rows, every title clean, verified against her own count and her reading of
all 77.** The last of the 21. Detail in `docs/venues.md`.

**Three fixes in a row were guessed at from the CSV and all three were wrong**,
because the CSV stores the title *squashed to one line* and the defect was made
of line breaks — the evidence had been destroyed before it reached the file being
read. One diagnostic on her machine printing the card's text **as lines** settled
it in a single pass.

**When the artefact cannot contain the evidence, stop reading the artefact.** And
the CSV is not the only thing that flattens: a count does too. The run before
last scored perfectly — 0 badges, 0 blanks, 0 wrong rows, exactly the predicted
77 — while two titles had quietly lost half their names. **Only reading the 77
titles found it.** Numbers confirm what you already suspect; they do not tell you
what you failed to imagine.

---

## 14. The blocked venues, and the `Headless` user-agent

**PARKED ON `claude/quiet-user-agent`, her ruling 19 Sep. Nothing on that branch
is revived — the 22 Sep route (a profile with a history) is not the user-agent
work and does not need it.** Her verdict on the session that
produced it: theories were spun up, sweeps were run to test them, the sweeps
caused rate limiting, and then the limiting was read as fresh evidence. Nothing
usable came out that is worth the divergence. **Do not merge it, and do not
re-open it on a session's own initiative.**

**What is parked is the BRANCH, not the VENUES.** `moma`, `brit`, `morgan` and
`artic` are open work.

**The one proven fact, kept because it is real:** Chromium announces
`HeadlessChrome`, and removing that word changes MoMA's LISTING page from 403 to
200 with 24 exhibitions. **It opens nothing else.** All 24 MoMA detail pages still
refuse, so no row has text; `brit`, `artic` and the Met were unaffected. In the
container all of them refuse either way.

**Why these venues refuse is UNKNOWN.** Rate limiting, volume, her address,
Cloudflare profiling her across sites — all guessed at, none tested. Do not
repeat any as fact.

**The shape of the failure, which is the part worth keeping:** a probe read one
listing page, that was read as "the venue is open", the scraper was changed on
it, and when the real sweep failed, causes were invented to explain it. **A probe
that does not do what the sweep does — its volume, its detail pages, its
concurrency — cannot tell you a venue works. It tells you one request was
answered.**

**The Morgan is NOT blocked — overturned 22 Sep, see `docs/venues.md` §Morgan.**
All four combinations tried on 16 Sep used a BLANK profile, which is why they
failed alike; a box that never cleared however many times she clicked was never
grading the click. A visible Chrome on a profile she had browsed in was served
the listing and a real page with no check at all. The same holds for `moma` and
`brit`.

**What is still open is PACE, and it is the harder half.** `probe_headed.js`
now leaves a varied gap between pages and stops at the first check that will not
clear. The engine does neither: it fetches exhibition pages back to back, and
MoMA alone would fire 24 in seconds.

**Who sweeps them now:** `moma` moved to her machine on 22 Sep (`route: 'local'`,
`headed: true`); `brit` and `morgan` stay on the container until their recipes
are written from the live pages. Fixtures R-001 to R-005.

**Blocked venues stay wired in deliberately:** a refusal costs about half a
second, leaves marker rows in the CSV so it is visible on the approval pile, and
turns every sweep into a standing monitor. Blocks are not permanent facts — in
five days Borghese went down and came back, dellav turned out never to have been
blocked, the Met's archive turned out to be reachable, and `artic` went from
"reliable" to refused.

### Who sweeps what — in code since 20 Sep, not a habit

**The two machines never sweep the same venue.** `machineVenues()` decides, the
machine is worked out from the proxy (present in the container, absent on her
laptop), `--home` / `--container` force it, and the run announces which it thinks
it is before fetching anything. Container: its 16 working venues plus `moma`,
`brit`, `morgan`. Her laptop: `met`, `artic` (`route: 'local'` in their recipes).

**It is code because remembering it failed.** On 13 Sep the container swept all
21: its met and artic rows were nothing but refusals, and they landed in the
stitched file beside the 171 real rows her own machine had for the same two
venues — reading the coverage panel a week later she could not tell whether she
had been blocked at home. And the cost is not only confusion: sweeping a venue
from both machines doubles what it sees, and both of these rate-limit, which is
how a working venue becomes a blocked one.

**Naming venues by hand still wins**, because a one-off diagnostic is exactly when
the rule should be breakable. It says so in the log rather than happening quietly.
Fixtures R-001 to R-004.

---

## 15. Capodimonte is closed differently, and the difference matters

Her ruling 12 Sep. She could confirm the CSV holds no *visible* defects — no
nonsensical titles, no mangled summaries. She could **not** verify it against the
site: Capodimonte publishes in Italian only, and taking a CSV row and finding that
exhibition on the site is slow to the point of uselessness.

**So this venue is not count-verified and will not be.** Her decision instead:
import every row unless it is visibly mangled, then use the app's URL button —
Chrome translates the page for her, and the link is already attached to the card.

Two consequences:

- **The `url` column is the load-bearing field at this venue, not the dates.** All
  18 rows carry the venue's own exhibition address and none was dead on the
  12 Sep run. Five rows have no closing date; she has accepted that.
- **The summary must arrive in English.** Her whole approach rests on it. Prompt A
  never stated an output language — English prompt, English examples, so a model
  would most likely comply, but nothing required it. Now it does; see
  `scraper/compress_prompt.md`.

---

## 16. What is not confirmed — 13 Sep 2026

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

---

## 17. Known bugs — open

1. **Nothing filters out non-exhibitions, generally.** The only test is URL shape,
   so talks, tours and opening events filed under an exhibitions path are
   collected. A venue that dumps everything *and* tags nothing still needs a
   different answer. **Where a venue DOES tag, the tag is now used** — Tate's
   `event_type` query filter, the V&A's `Display` badge, Tate Britain's
   `ONGOING`, the Art Institute's `COLLECTION INSTALLATION`. That is rung 1 of the
   ladder, the site saying so.
2. **Title casing is inconsistent** — some venues apply capitalisation in CSS.
   **Her decision: live with it.** Genuinely all-caps titles exist.
3. **artic's two title defects** — §13 above.
