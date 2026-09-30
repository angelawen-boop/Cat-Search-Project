# Venue sites — evidence per venue

**Read this when working a specific venue**, not before. Her rulings per venue
are in `CLAUDE.md` §2; current yields come from `node scraper/venue_status.js`.
Listing addresses live in each recipe in `VENUES` (`sweep_prototype.js`) — the
code is the record, not this file. Compressed 30 Sep; full history in git.

---

## 1. What a refusal is — read the body, not the status

**A status code is not a diagnosis.** For four days the Met's 429 was recorded
as a data-centre IP block; reading the body showed a Vercel bot checkpoint, and
her laptop proved the IP theory wrong. The cheap check that settled it was a
person opening the site in an ordinary browser.

| Gatekeeper | Looks like | Venues |
|---|---|---|
| Cloudflare managed challenge | 403, `cf-mitigated: challenge`, "Just a moment…" | `artic`, `moma`, `brit`, `orsay`, `morgan` (its "flat block" reading was withdrawn 22 Sep — her browser is shown a check that clears) |
| Vercel Security Checkpoint | 429 | `met` |
| Plain 403 | no challenge | `mad` (container, robots.txt included) |
| Waiting room | 307 | KHM's shop |

- **A challenge is a gate, not a wall**: a real browser passes it. Her line
  (22 Sep): the only thing out of bounds is taking information a site does not
  publish; these are public listings. **Be the thing, don't claim to be it** — a
  real browser with a history passes; a disguised one fails harder.
- **A cached page can hide a gate.** The British Museum's current page once
  answered 200 from Cloudflare's cache (`cf-cache-status: HIT`) while its archive
  was challenged; once the cache expired, it was challenged too.
- **Blank browser profiles are refused; a profile she has browsed in is not**
  (22 Sep, `probe_headed.js`). Never install anything into the seeded profile —
  her own browser, with six extensions, gets the Morgan's check every visit; the
  bare profile gets none (a reading, not a measurement).
- **Pace is the other half:** five pages back to back were all challenged after
  the first, and the judgement followed to the next Cloudflare venue.
- **A 404 means the server answered** — `dellav` was filed as blocked for a day
  while its 404 said the address was wrong. An Italian 404 means "find the new
  site" first; Borghese and the Accademia both moved.
- **Italian sites go down for days** (Borghese, 8–11 Sep, down for her too).
  Confirm across separate days before concluding anything; marker rows make an
  outage read as an outage.

### The container's proxy — findings kept so nobody repeats them

- Chromium's own TLS does not survive the agent proxy for any site (Google
  included) — the tunnel closes after the full greeting is sent. Hence the
  network bridge (`docs/scraper.md` §7).
- `HTTPS_PROXY` is the only supported route; no SOCKS listener. A transparent
  TCP relay and waiting for the Vercel challenge were both tried 11 Sep and
  helped nowhere; the code is on `claude/met-connection-experiments` (abandoned).
- **A raw egress path around the proxy exists. Do not use it or build on it.**
  The proxy's README lists WebSocket upgrades as "report, do not work around".

---

## 2. The headed venues — `brit`, `orsay`, `morgan`, `moma` (22–30 Sep)

All behind Cloudflare, one pacing lane, all swept from her laptop in a visible
Chrome on the seeded profile.

| Mode | What it is | Runs |
|---|---|---|
| A (`--launch-chrome`) | The sweep launches Chrome on the seeded profile | MoMA stopped at page 19 after 18 clean (27 Sep). d'Orsay 403 at 18 after 17 (29 Sep). British Museum 41 clean (28 Sep). All at 30s |
| **B (default)** | She opens Chrome, warms it up, leaves it open; the sweep attaches | 30 Sep: d'Orsay 54 pages, Morgan 18 (twice), MoMA 25, British Museum 37. No challenge, four venues back to back with `--ignore-cooldown` |
| C | Her everyday Chrome and profile | Rejected 28 Sep (`CLAUDE.md` §8) |

Mode A's stops can't show whether pages or minutes triggered them. That mode B is
WHY 30 Sep was clean is likely, not proven.

**The runs that count, and what was fixed offline:**

- **d'Orsay** `run_2026-09-30_140401`: 58 of 58 with text (13 + 45); 10 pages
  from those kept 29 Sep.
- **Morgan** `run_2026-09-30_160740`: 39 of 39. The 15:38 run (superseded)
  wrote 8 — the engine dropped rows whose text came off the listing (MP-009/010).
  The re-run re-asked 8 pages: kept pages aren't reused once a venue has written
  a file, even a wrong one. *Giovanni Bellini's "Pietà" Restored*: the listing's
  only text is a caption and photo credit; the page isn't opened (her ruling).
- **MoMA** `run_2026-09-30_162442`: 14 (9 + 5). It opened all 24 listed pages
  because the recipe missed the listing's section headings — fixed
  (MM-001–003). Lost colons (MM-004) and a gallery-closure notice (MM-005)
  corrected offline.
- **British Museum** `run_2026-09-30_165517`: 34. A two-line current name joined
  with a space where the museum writes a colon (`brParts`, BM-016/017), three
  titles corrected offline. Its 28 Sep run (mode A) had *Korea* taking the date
  line (RT-010) and five out-of-cutoff pages opened (BM-013–015).
- **British Museum shop** (separate site, Varnish, not Cloudflare) gave the
  seeded Chrome a 403 on 28 Sep.

**The Morgan's robots.txt** gives `User-agent: *` `Allow: /` with
`Content-Signal: search=yes, use=reference` (it name-blocks `ClaudeBot` and sets
`ai-train=no`). Her use is reference. It returns 403 to us now, so her 30s pace
is its only wait.

---

## 3. The Met

- **Her conclusion, 11 Sep:** the Met doesn't block Claude; it dislikes the
  connection type the container is forced to use. **Swept from her laptop.**
- **The archive is one page per year** — the year menu changes the address
  (`/exhibitions/past?year=2025`). Driving the menu returned the same 68 links
  three times. **Check the address bar before automating a click.**
- **Language-switcher links** (`/es/exhibitions/past`…) were collected as rows,
  one given a neighbour's dates; `isOwnListingPage()` now treats them as
  navigation for every venue.
- **`excludeOngoing`** drops permanent displays on the Met's own "Ongoing" label
  (whole line, or the closing side of a range) — the one silent drop, her explicit
  ruling 11 Sep, named in the log. Don't copy it to a venue not checked for the
  same wording.
- *Baseball Cards … Burdick* has no closing date anywhere; she confirmed it.
  (It is now excluded as a recurring series — `CLAUDE.md` §2.)
- Summaries: every real exhibition has curatorial text, 612–2,000 characters.
- `collectionapi.metmuseum.org` covers objects, not exhibitions.

---

## 4. Rijksmuseum

- Her count matched exactly (8 Sep): 10 current/upcoming, 14 past in range.
- **Two card layouts:** the past page puts a heading in the link; now-on-view
  wraps only the image, so the title comes from the card.
- **Some English-listing entries link to the DUTCH site** (`/nl/zien-en-doen/…`);
  the recipe accepts both and treats the language switcher as navigation.
- Six date formats; older entries use Dutch `t/m`. No structured data.
- **13 past rows have no closing date — a site limit**, checked one by one.
- *Asian Pavilion* vanished 11 Sep because the venue pulled it (she checked). **A
  disappearing row must be proved, not assumed**: a serial re-run plus a look at
  the live page.
- Three rows' pages return 404: kept, empty summary, noted.

---

## 5. Borghese

- **Exhibitions live at `/en/exhibition/<slug>/`**, not `/mostre/` (that was the
  menu). Listings: current, future (genuinely empty — the marker row), past.
- **Most past shows print their dates only inside the poster image** (22 of 40
  pages; verified on Louise Bourgeois). Those rows are kept, undated and flagged,
  so ~23 decades-old rows survive the lookback. A hard limit.
- **Its consent plugin** (`cmplz-`) broke summaries twice — first stored as text,
  then, with a `cmplz-` class on `<body>`, every paragraph excluded. The ancestor
  walk stops before `<body>`.
- Site moved to `galleriaborghese.cultura.gov.it`; down 8–11 Sep for everyone.
- Open: 7 titles still in capitals (`CLAUDE.md` §7.3).

---

## 6. Art Institute of Chicago (`artic`)

Swept from her laptop; the container gets Cloudflare's challenge. Her count
matched on every page (12 Sep).

- **Archive:** `history?year=YYYY`, 20 per page, `&page=2` for the rest. **Year
  pages run January first**, so page two holds the late-2024 shows that pass the
  floor. Year 2023 checked by her: nothing reaches the floor.
- **No card has a heading**; the whole card is the link, read as lines
  (`linkLines`). The title is the first line that is not entirely a badge.
- **Every label it uses** (read by her): `EXHIBITION`, `TICKETED EXHIBITION`,
  `VIDEO INSTALLATION`, `COLLECTION INSTALLATION`, `COLLECTION ROTATION`,
  `SPECIAL LOAN INSTALLATION`, `NOW OPEN`, `CLOSING SOON`, `OPENING SOON`,
  `MEMBERS ONLY`, `FREE`. Only the first two are kept (`docs/scraper.md` §13).
- **Three title defects, all fixed:** a bare `EXHIBITION` badge; the description
  welded to the title (invisible in the CSV); a title broken after a colon — a
  colon promises a continuation, so it is rejoined.

---

## 7. Accademia, Venice (`dellav`)

**Never blocked.** `gallerieaccademia.it/en/` has no listing page; the home page
carries its 1–2 current shows. No upcoming, no archive. The brief's address
404s. **`galleriaaccademiafirenze.it` is a different museum** (Florence) — never
use it for this code.

---

## 8. Addresses from the brief — the traps

`docs/venue_urls.md` holds the original 21 venues' addresses from the Sweeper
Brief. Where the live site differed (read off the site, 12 Sep):

| Venue | Trap |
|---|---|
| `wallace` | `/whats-on/` is a two-tile hub, not a listing |
| `menil`, `capo` | show pages are SINGULAR (`/exhibition/`, `/mostra/`) |
| `tate-*` | the filters work — `gallery_group` separates the Tates, `event_type` asks for exhibitions; `date_range=past` means "already opened", not an archive |
| `louvre` | the selector needs the full `/exhibitions/` path or the tabs come in as shows; past years are `?date=YYYY` |
| `uffizi` | the year is in the PATH |
| `brera` | shows are filed under `/en/news/mostra/` |
| `khm` | lazy-loads; mixes permanent collections in |
| `acq` | one page carries all three states; its year-range filter links are navigation (following them reached 1999) |
| `frick` | any `?` query once returned 403 |
| `artic` | the archive is `history?year=` and paginates |

**Anything the project depends on belongs in the repo** — the brief's addresses
once existed only inside a Chat Claude conversation.

**Legacy note:** what Chat Claude's fetch tool could see (Sept, pre-scraper) is
superseded by the scraper; the one lasting lesson is that sites which build
their pages with JavaScript look empty to a tool that doesn't run it.
