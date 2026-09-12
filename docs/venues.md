# Venue sites — what we know

Moved out of `CLAUDE.md` on 12 Sep 2026. **Read this when working a specific
venue**, not before. The trunk guide carries the per-venue status table; this
file carries the evidence behind it.

Addresses also live in `docs/venue_urls.md`, taken from the Sweeper Brief.

---

## 6. What we know about venue sites

**Read this section with care.** It has two halves, and they were produced by two completely different tools.

### 6a. Proven by this scraper (a real browser)

This is the only part that describes how the *scraper* reaches sites. It is short because it is new, and it will grow to replace 6b.

#### THE SCOREBOARD — all 21 venues, 11 Sep 2026

Which route reaches which venue. **These are conclusions, not hypotheses** —
every venue was opened from this container, and every venue that failed here was
then retried from her own machine on the same evening.

**How it was measured, and what that does NOT establish.**
`scraper/reach_probe.js` opens a venue's listing addresses using the same
Chromium, the same network bridge and the same `safeGoto()` as a real sweep, so
a refusal here is a refusal a sweep would meet. Using curl instead would have
been faster and worthless — that is how the Met was misdiagnosed for four days.

**But reachability is not the project's question.** Her correction, 11 Sep:
*"this is not a project in can you map me an internet directory"*. A row needs a
title, an opening date, a closing date and curatorial text. **A venue listed as
reachable below has NOT been shown to yield a single usable row** — only that its
listing pages open. The venues with proven rows are the wired ones, and they were
proven by sweeps against her own counts, never by a probe.

**Three measurement failures in one afternoon, all the same mistake**, recorded
because the pattern matters more than any of them:
1. The probe counted anchors whose address merely *looked* exhibition-ish, which
   counted the site's own menu on every page. It reported `brit` at 19 links; the
   real figure is 1.
2. The listing inspector grouped links by address shape and printed the commonest
   shapes — so navigation, repeated in every header and footer, crowded out the
   exhibitions, each of which is unique and scores one. Six venues were reported
   as empty JavaScript shells. They were not; the tool was.
3. The replacement counted addresses *below* the listing path, which reads zero
   for any venue filing exhibitions outside its archive's path — `artic` does
   exactly that.

Each measured something cheap to obtain instead of the thing that mattered, and
each produced a confident claim that had to be withdrawn. **Count rows, not
links.** The only instrument that answers the real question is a recipe plus a
sweep.

**Confirmed 11 Sep, every listing page of every blocked venue tested separately
— current, upcoming and past.** Her instruction, after an earlier probe pinged
one or two pages per venue and reported the VENUE as reachable.

| Venue | Current | Upcoming | Past | Verdict |
|---|---|---|---|---|
| `met` | 429 | 429 | 429 | blocked on every page |
| `morgan` | 403 | 403 | 403 | blocked on every page |
| `moma` | 403 | 403 | 403 | blocked on every page |
| `artic` | 403 | 403 | 403 | blocked on every page |
| `brit` | opens, **1 link** | opens, 1 link | 403 | see below |
| `dellav` | ~~no response~~ | — | — | **WRONG — wrong address. It works; see below** |

| Route | Venues | Count |
|---|---|---|
| **Claude-run scrape** | `ng` `rijks` `acq` `louvre` `uffizi` `brera` `capo` `khm` `frick` `menil` `wallace` `va` `tate-modern` `tate-britain` `dellav`, plus `borghese` when its site is up | 16 |
| **Local scrape** (her machine) | `met`, `artic` | 2 |
| **No route yet** | `morgan`, `moma`, `brit` | 3 |

**Corrected 12 Sep: `dellav` moved out of "no route" — it was never blocked.**
See below. The four-venue figure above the line is superseded.

**Her own machine, same six venues, every page — 11 Sep, `probe_2026-09-11_231704.md`:**

| Venue | Result from her laptop |
|---|---|
| `met` | **429 on all three pages** — see below, this is new |
| `morgan` | 403 on all three |
| `moma` | 403 on all three |
| `artic` | current **opened, 21 links**; upcoming and past read 0 (a flaw in the counter, see below) |
| `brit` | current opens with 1 link; past and see-everything 403 |
| `dellav` | old address 404; new address and its home page both NO_RESPONSE |

**The Met refused her laptop, hours after giving her 106 rows from it.** 429 is
"too many requests", and she had run Met sweeps repeatedly that day, so the most
likely reading is ordinary rate-limiting rather than a policy change — but it is
a reading, not a measurement. **Re-test before concluding the local route is
lost**, and do not rewrite the Met's section on this alone.

**`dellav` is settled: refused from both machines**, while loading in her
ordinary browser. Not an outage and not an address error — the site accepts no
automated connection from either network.

**The "links below the listing" counter under-reports, and artic proves it.**
It counts addresses that sit beneath the listing's own path. Artic's exhibitions
live at `/exhibitions/<slug>`, which is not beneath `/exhibitions/past`, so a
full archive scores **zero**. It is still far better than the word-matching
counter it replaced — that counted the site's own menu on every page — but any
venue whose archive links sideways rather than downward will read as empty.
**Treat a zero as "look closer", never as "nothing there."** The real answer for
these venues comes from a recipe and a sweep, not from another counter.

**`brit` was reported as "current works, archive blocked". That was wrong**, and
twice over:
- Its current page yields **one** link below the listing, not the 19 first
  reported. The 19 was the broken link-counting described below.
- It returns 200 only while Cloudflare holds a cached copy. Once that expired the
  same page returned **403 with `cf-mitigated: challenge`**, like its archive. So
  the "working" half was a cache artefact with a lifetime, not a property of the
  site.

Treat the British Museum as blocked. `brit` and `dellav` have **not** been tested
from her machine; `morgan` and `moma` have, and were refused there too.

**What the probe overturned.** Four claims in this document came from the old
fetch tool and were wrong about the scraper:

- **`uffizi`** was marked UNVERIFIED, never tested — it works, 31 links.
- **`capo`** was recorded as robots-blocked — it works, though thin at 7 links.
- **`moma` and `artic`** were both listed as *reliable* — both refuse the scraper
  outright with a flat 403. The fetch tool reached them because it comes from a
  different network, which is the whole reason 6b is legacy.
- **`borghese`** is reachable again after its three-day outage.

**No venue returned an empty JavaScript shell.** Every page that opened had real
content on it. That was the failure the headless browser was adopted to beat, and
it is beaten across all 21 — the remaining problems are all refusals or outages,
which are a different kind of problem entirely.

**Read "denied" precisely, because these are four different failures:**

- **`met`** is not refusing Claude. It dislikes the *type of connection* the
  container forces on us (a Vercel bot checkpoint), and no permitted alternative
  exists. Locally there is no such constraint, so it works — 106 rows.
- **`artic`** is the same shape and was found the same way: a flat 403 here in
  0.3 seconds, and **66 links from her laptop**. Address-based, so the local
  route clears it.
- **`morgan` and `moma`** refuse every automated route from every address tried,
  however honestly the scraper identifies itself. Her machine gets the identical
  403 in 0.1 seconds. These are the Chat Claude venues.
- **`brit` is blocked. An earlier claim that it was "split" is withdrawn** — see
  the paragraph below; the "19 links" was a broken counter and the working
  current page was a Cloudflare cache with a lifetime.
- **`dellav` IS NOT BLOCKED AND NEVER WAS — corrected 12 Sep 2026.**
  `gallerieaccademia.it/en/` serves us normally; she supplied the address. It
  has no listing page at all ("Events & Exhibitions" in the menu is a dropdown),
  so the home page carries its 1-2 current shows, matching the brief. No
  upcoming and no archive.

  **The clue was in our own output the whole time.** The brief's address
  returned HTTP 404, which means the SERVER ANSWERED — and it was filed beside
  genuine 403s and NO_RESPONSEs without anyone reading the difference. On top of
  that, the recorded migration to `galleriaaccademiafirenze.it` is the Galleria
  dell'Accademia in FLORENCE, a different museum from the Venice one this code
  means; scraping it would have filed another institution's exhibitions under
  this code invisibly. Everything below this line about dellav is superseded.

- ~~**`dellav` is blocked, settled 11 Sep — but its NEW ADDRESS IS PROBABLY THE
  WRONG MUSEUM, flagged 12 Sep.**~~ (superseded, kept for the record) The brief's address
  (`gallerieaccademia.it/en/node?page=1`) 404s, and this guide recorded the
  venue as having migrated to `galleriaaccademiafirenze.it/en/exhibitions-events/`.
  **`dellav` is the Gallerie dell'Accademia in VENICE; `galleriaaccademiafirenze`
  is the Galleria dell'Accademia in FLORENCE** — a different museum, the one with
  Michelangelo's David. Scraping it would file another institution's exhibitions
  under this code, and nothing downstream could tell. The recipe keeps the
  brief's host and records the doubt. This cannot be settled by trying, because
  the venue refuses every automated connection from both machines: **she needs to
  open both sites in an ordinary browser and say which is hers.** The new address and its
  home page both return `NO_RESPONSE` from **both** the container and her
  machine, while loading in her ordinary browser. Earlier this was recorded as
  possibly a transient outage like Borghese's; two machines refusing while a
  browser succeeds rules that out.

#### Exactly what each refusal IS — read 11 Sep 2026, not inferred

Her question, and it deserved evidence rather than a guess. The body and headers
of each refusal were read. **There are two mechanisms, and they are not the same
thing.**

| Venue | HTTP | `cf-mitigated` | Page says | Mechanism |
|---|---|---|---|---|
| `artic` | 403 | `challenge` | "Just a moment…" | Cloudflare **managed challenge** |
| `moma` | 403 | `challenge` | "Just a moment…" | Cloudflare **managed challenge** |
| `brit` past | 403 | `challenge` | "Just a moment…" | Cloudflare **managed challenge** |
| `morgan` | 403 | **absent** | "Attention Required!" | Cloudflare **firewall rule — a flat block** |
| `met` | 429 | — | "Vercel Security Checkpoint" | Vercel bot protection — a challenge |

**A challenge is a gate, not a wall.** It says *prove you are a real browser*: run
this JavaScript, accept a cookie, and the real page follows. A human never sees
it. `artic`'s carries `cType: 'managed'`, and it challenges **even `/robots.txt`**
— so, exactly as with the Met, we cannot read the institution's own stated policy
because the gate sits in front of it.

**Morgan is the different one.** No `cf-mitigated` header at all and a different
page: this is a Cloudflare firewall rule refusing the request outright, with no
gate offered and nothing to pass. That is why every honest variation failed on
it — an empty user-agent, Chromium's own TLS, her own machine. There is no door.

**So the three new venues are the MET's situation, not Morgan's**, and that
matters because the Met's answer — run it locally — worked for `artic` (66 links
from her laptop). It did not work for `moma`, which still returned 403 there.
The likeliest reading, and it is a reading rather than a measurement: the
challenge fires on how the connection looks, her home address clears `artic`'s
threshold, and `moma`'s is tighter or reacts to headless markers her ordinary
Chrome does not carry. Confirming it would mean reading `cf-mitigated` on her
machine, which the probe does not currently record.

**`brit`'s split is now explained.** Its current page returns 200 with
`cf-cache-status: HIT` — served from Cloudflare's edge cache, so the request
never reaches the origin and the challenge never runs. The past archive is not
cached, so it goes to origin and is challenged. The museum's **own `robots.txt`
explicitly permits the page we are refused**:

```
Allow: /exhibitions-events/past-exhibitions/
Disallow: /exhibitions-events/*
```

Tested with and without the trailing slash — both 403. So this is bot protection
acting before the institution's stated policy applies, not the museum declining
us. Worth knowing, and it changes nothing about what we do.

**What we do NOT do about any of it.** Passing a challenge means satisfying a
check designed to stop automation, and the standing rule (Section 4) is that
engineering around a deliberate block is not on the table. The Met's checkpoint
was put to her as a genuine question and she answered it by moving the Met to a
local run rather than by defeating the gate. The same answer applies here.
`artic` is a local venue. `moma` and `brit`'s archive have no route yet.

**Several Italian venues have migrated during this project** — Borghese moved
hosts, and now Gallerie dell'Accademia. Treat an Italian 404 as "find the new
site" before "the venue is unreachable".

**This supersedes the older "met and morgan are blocked" framing throughout this
document.** Where an earlier paragraph says the blocks are about this
datacentre's IP address, that paragraph is wrong and superseded — see the two
venue sections below.

| Venue | Finding | Evidence |
|---|---|---|
| `met` | **A bot checkpoint, NOT an IP block — corrected 11 Sep 2026.** The 429 is a **"Vercel Security Checkpoint"** page: the Met's site is hosted on Vercel, and Vercel serves this challenge instead of the content. See below — the data-centre theory was wrong for four days. `collectionapi.metmuseum.org` is unaffected but covers collection objects, not exhibitions. | Disproved from her home connection, 11 Sep 2026 |
| `morgan` | **Hard blocked.** HTTP 403 on all three listing pages and on `sitemap.xml`, from Cloudflare. Their `robots.txt` permits general crawling (`User-agent: *  Allow: /`) and permits AI "reference" use, but name-blocks a list of AI crawlers, and Cloudflare is refusing this network before any of that applies. | Verified 7 Sep 2026 |
| `ng` | **Works well.** Past archive loads 183 entries in one page. Dates live in the card wrapping each link, day-first format ("7 November 2025 – 10 May 2026"). | Full sweep |
| `rijks` | **Works, fully worked through.** See below. | Full sweep + her count of the live pages |
| `acq` | **Works.** One page carries current, upcoming and past together. Dates are in the link text itself ("… NEW YORK OCTOBER 16 - DECEMBER 5, 2025"). Its archive has year-range filter links (`/exhibitions/past/all/2023-2021`) which are navigation, not exhibitions — following them dragged in the whole catalogue back to 1999. | Full sweep |
| `borghese` | **Reaches the site**, contradicting the old "robots-blocked" note in 6b. Fully worked through — see below. | Full sweep + 40 detail pages |

**Two of six venues are blocked at the door.** They stay wired in regardless — see
Section 4. A refusal costs about half a second and tells us whether anything has
changed since last time. **Engineering around a deliberate block is not on the
table**, and that rule is unchanged by what follows.

#### The Met — the data-centre theory was wrong, disproved 11 Sep 2026

**She ran the scraper on her own Chromebook, on her home internet, and the Met
returned the same HTTP 429.** Meanwhile `metmuseum.org` loaded normally in her
ordinary Chrome browser, on that same connection, at that same moment.

That kills the explanation this guide carried from 7 to 11 September — "an
IP-reputation block on the whole datacenter range, delays won't help". Two
different networks, same refusal, while a human browser on one of them sails
through. **It was never about where the request comes from.**

**What it actually is:** the 429 body is a **"Vercel Security Checkpoint"** page.
The Met's site runs on Vercel, whose bot protection serves this challenge instead
of the content. A normal browser passes it invisibly — a little JavaScript runs, a
cookie is set, and the real page appears. Our scraper never gets that far:
`safeGoto` refuses any status of 400 or more, so it hangs up on the challenge
before the page can do anything.

**Worth sitting with, because it is the more useful lesson:** for four days the
guide stated a confident mechanism, backed by repeated testing, that was wrong.
The tests were real — 429 every time — but they only ever measured the *symptom*.
Nobody read the body of the refusal. **A status code is not a diagnosis**, and the
cheap check that settled it was a person opening the site in a normal browser.

**Undecided, and it is hers to decide:** whether letting the browser answer that
checkpoint is legitimate. One reading is that it asks "are you a real browser?"
and we genuinely are one, so passing is compliance. The other is that it exists to
stop automated access, which is exactly what the standing rule refuses to engineer
around. **The Met's `robots.txt` would settle it — and we cannot read it, because
the checkpoint blocks that too.** She can, in her browser. Do not implement
anything here until she has read it and ruled.

#### HER CONCLUSION ON THE MET — settled 11 Sep 2026

In her words, and it is the summary to keep:

> **429 does not mean the Met is deliberately trying to block Claude.** But it
> does not like the *type of connection* we are using, and we cannot find a
> different type that works without violating the proxy. The Met is now
> unblocked for her locally, because the local run has an alternate path (no
> bridge). **So the Met is a local-scrape situation.**

It stays wired in, so the container keeps reporting the checkpoint on every
sweep and we find out if anything changes. It yields **82 rows** whenever she
runs it from her laptop.

##### The Met's data, diagnosed 11 Sep 2026 — 82 rows from her laptop

Four separate issues, which a first pass wrongly reported as one. **Her
correction: they are not the same problem and each needed checking.**

**1. Ten rows were not exhibitions. FIXED.** Nine were the **language switcher**
— `/es/exhibitions/past`, `/fr/...`, `/ja/...`, one row each titled "Español",
"Français", "日本語" — and the tenth was "Browse the archives". Met's own `isNav`
rejected `/exhibitions/past` but every one of these carries a language prefix,
so none matched. Now handled universally by `isOwnListingPage()` (Section 5).

Worse than clutter: **"Browse the archives" had been given dates from a
neighbouring card**, so it would have reached an approval card looking like a
real exhibition with a real run.

**2. Summaries are good — the reported "10 missing" was an artefact.** All ten
were those junk rows. **Every one of the 72 real exhibitions has curatorial
text**, 612–2000 characters, median 1571, with no ticketing or promotional
boilerplate. One row leads with "This exhibition is temporarily closed due to
gallery maintenance" — the venue's own opening sentence, so a judgement for the
compressor rather than a scraper fault.

**3. One row lacks a CLOSING date, and the scraper is right — checked 11 Sep.**
*Baseball Cards from the Collection of Jefferson R. Burdick* is shut for gallery
maintenance and its page says only that it reopens in spring 2027. The Met's
structured data carries that reopening as the opening date; there is no closing
date anywhere, so the column is blank and the note says why. **She checked the
live page and confirmed it.** Nothing to fix — do not go looking again.

**4. Nineteen rows had no closing date because they are PERMANENT DISPLAYS —
fixed, and they are deliberately invisible.** *The British Galleries*, *Cycladic
Art*, *Art of Native America*, *Fabergé*, the *Arts of Oceania / Africa / Ancient
Americas* reinstallations and twelve more. **Her ruling: the scraper collects
temporary exhibitions only.**

`excludeOngoing` reads **the Met's own "Ongoing" label** in the card's date slot,
matched as a whole line or as the closing side of a range ("July 25, 2026–Ongoing")
— never as a loose search, since an exhibition whose title contains the word would
then be deleted on a false match.

**This is the one place the scraper drops a row silently, and she asked for that
explicitly** (11 Sep): if the Met itself calls it Ongoing, she does not want it on
an approval card at all. It is permitted here because it is rung 1 of the ladder —
**the site says so** — not our judgement. The exclusions are named one by one in
the log. Do not "fix" this into marker rows; do not copy it to a venue that has not
been checked for the same wording.

**5. The archive reaches every year after all — the menu was never the way in.**
Driving the dropdown through 2026, 2025 and 2024 returned the same 68 links each
time, so the guide recorded the Met as a one-year archive and pinned its floor to
2026-01-01. **She checked the live site and the address bar changes**:
`/exhibitions/past?year=2025`. That makes it a **server-side** filter, like the
Louvre's — the year is a different page, not a different state of one page. The
years are now listed in `pages`, the pin is removed, and the project's July 2024
floor applies to the Met like everywhere else.

**The lesson is the same one the 429 taught four days earlier.** Both times a
confident mechanism was written down from repeated testing that only ever
measured the symptom, and both times the cheap check that settled it was a person
opening the site in an ordinary browser. **Before automating an interaction, look
at what the address bar does.** A click that changes the URL is a page to fetch,
not a control to operate — and operating it races the navigation it triggers,
which is exactly the 68-links-three-times result.

##### What was tried, and why nothing is left in the code

Four things were built and tested during that afternoon. **All of the code was
removed from `main` afterwards**, because none of it helped anywhere we could
measure — her standing rule is that unproven code does not sit in the main path.
It is preserved on the branch **`claude/met-connection-experiments`**, and the
findings are kept here so nobody repeats the work.

**1. Wait for the challenge instead of hanging up.** `safeGoto` refused at the
status line before the checkpoint page could run. With her approval — given
after she read the Met's `robots.txt` in her own browser: `User-agent: *`, six
housekeeping paths disallowed, `/exhibitions` not among them, a published
sitemap — it was changed to recognise a challenge by page title and wait up to
15 seconds, once per venue per run. No second request, no faked identity.

**Result: it helped nowhere.** In the container the challenge appears and never
clears. On her laptop the Met serves immediately **with no challenge at all**,
so it never fires. Removed.

**2. A transparent TCP relay** (`scraper/tls_relay_test.js`), proposed by an
outside engineer: sit under Chromium so it keeps its own end-to-end TLS while
still going through the mandatory proxy, varying how the ClientHello is written
in case the proxy chokes on one large write. It terminated no TLS and read
nothing — it copied bytes.

**Every write size failed, and the proxy's own log explains why better than the
experiment did.** From `curl -sS "$HTTPS_PROXY/__agentproxy/status"`:

```
tunnel closed (code 1006, Connection ended) after 6s;
1724 B sent, 39 B received, client reading, 0 B still queued in the relay
```

- The ClientHello **was fully sent**, nothing left queued — segmentation was
  never the problem and chunking could not have helped.
- **39 bytes came back** before the tunnel died. The tunnel fails, not the
  destination.
- The same failures are logged for **www.google.com and accounts.google.com** —
  nothing to do with museums, Vercel or bot protection. Chromium's own TLS does
  not survive this proxy for anybody.

**3. Is there another sanctioned way out?** Checked the proxy's documentation
and the machine: **`HTTPS_PROXY` is the only supported setting** (the README
says so and tells you to unset `HTTP_PROXY`), there is **one endpoint**,
HTTP CONNECT, and **no SOCKS listener** is documented or running.

**4. Chromium pointed straight at the official proxy**, no interception, no
Node. Re-tested rather than trusted to the old note: `ERR_CONNECTION_RESET` on
`google.com` as well as the Met.

##### The thing NOT to do, recorded so it is never quietly done

A **raw egress path does exist** — a direct TLS connection from this container,
bypassing the proxy entirely, completes and gets a response. **Do not use it and
do not build on it.** This environment routes outbound traffic through the
policy proxy deliberately, the instructions here are explicit about not
circumventing it, and a side door around a limitation of the front door is
exactly the kind of thing that is fine until it is not.

Note also what that test did *not* show: it used **Node**, which the Met already
refuses, so its 429 said nothing new. Chromium through that door was never
tested, and is not going to be.

The proxy is a WebSocket relay (`ws_closed_mid_exchange`), and
`/root/.ccr/README.md` lists WebSocket upgrades under **"Not supported through
the proxy (report, do not work around)"**. So the remaining route is to
**report it** — to Anthropic support or a workspace admin — rather than to
engineer past it. Nobody has done that yet.

#### Morgan — every automated route is closed. Chat Claude is the one that works.

**Worked through exhaustively on 11 Sep. Do not re-litigate this; re-test only if
something outside changes.**

| Route | Result |
|---|---|
| Scraper in this container | **403** |
| Scraper on her Chromebook, bridge off, Chromium's own TLS | **403** |
| Scraper with the honest user-agent (`HeadlessChrome/141`) | **403** |
| Scraper with an **empty** user-agent (`--no-ua`) | **403** |
| `curl` from this container | **403** |
| `WebFetch`, this session's own fetch tool | **403** |
| **Her own browser** | **works**, after a Cloudflare check that passes |
| **Chat Claude** | **works** — confirmed by her, 11 Sep |

**Only `robots.txt` is served to us.** Checked individually: `/`, `/about`,
`/sitemap.xml`, `/exhibitions/current` and a named exhibition page all return
403. So **feeding a session individual exhibition URLs does not help** — the
refusal covers the whole site for this address, not just the listings.

**It is not about Claude, and the scraper never says otherwise.** Their
`robots.txt` does name-block `ClaudeBot` (with GPTBot, CCBot, Google-Extended
and others) and sets `ai-train=no`, but it also gives `User-agent: *` an outright
`Allow: /` with `Content-Signal: search=yes, use=reference`. **Her use is
reference**, and she is not ClaudeBot any more than she is Googlebot when she
opens a page in Chrome.

**What differs is the stage at which we are refused.** Her browser gets a
Cloudflare challenge — "Performing security verification" — which runs, passes
and lets her in. The scraper gets a flat 403 with no challenge offered. So
Cloudflare classifies us *before* the challenge stage, and since the TLS was
genuinely Chromium's and the user-agent honest, it is reacting to something else
— most likely headless and automation markers, which is behaviour rather than
anything we could say about ourselves.

**Two things were considered and REJECTED, so neither is quietly revived:**

- **Running headed** (`headless: false`). Legitimate — a visible browser genuinely
  is one — but **her call: no.** It only works with her sitting watching a browser
  drive itself, and for Morgan's three pages that is slower than clicking them
  herself. In her words, it would make her "seem like I'm HANDSLESS".
- **Staying headless while masking it.** That is the disguise line. Saying
  "Chrome" when we are HeadlessChrome is a lie; `--no-ua` (declining to state)
  was the honest version of the same test, and it failed too.

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

**37 rows became 36 on 11 Sep, and that is the venue, not us.** *Asian Pavilion*
stopped appearing. Checked three ways before accepting it: it is absent from the
log entirely rather than failing, a deliberately **serial** re-run returned the
same 36, and **she looked it up — the Rijksmuseum lists it as "temporarily
closed"**, so it has been pulled out of the exhibitions section.

Worth keeping because the next session diffing sweeps will see a row vanish and
go hunting. **A disappearing row is not automatically a bug** — but it must be
proved, not assumed, and the cheap proof is a serial re-run plus a look at the
live page.

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

**Resolved 11 Sep 2026 — it was the site, not us.** She confirmed Borghese was
down for her too, from her own machine, over the same couple of days. So this was
never a block or a proxy problem, and no scraper change would have helped.

**Back up on 11 Sep**, and its first successful run since 7 Sep: 8 rows, with
real dates and curatorial text, current and past both reading. So the outage
lasted roughly three days and cleared on its own. **Its 7 Sep numbers are
therefore still the reference** — nobody has re-counted it against the live
pages since the engine changed.

**Her observation, and it matters for planning:** that site does not stay up
reliably, and **she suspects some of the other Italian venues are the same** —
Uffizi is already marked UNVERIFIED in the brief because it was down when the
brief was written, and Capodimonte is flagged as possibly refusing automated
access. Treat an Italian venue returning nothing as **probably transient**, and
confirm across separate days before concluding anything about it. This is exactly
why a venue that cannot be read still leaves marker rows: a one-day outage should
read as an outage, not as a venue with no exhibitions.

### 6b. Legacy — how *Chat Claude's fetch tool* saw these sites

**This half is being replaced, not maintained.** Every claim in it was produced by the old web-fetch route, which sees pre-JavaScript shells. A venue marked "not fetchable" here may well be fine for the scraper — that's the entire point of using a real browser. Treat it as a starting hypothesis to test, never as a fact about the scraper. Move rows up to 6a as they're proven, and delete them from here.

- **Reliable for current + upcoming (14):** met, ng, rijks, acq, louvre, moma, tate-modern, tate-britain, brit, va, wallace, brera (current only), frick, menil.
- **Reliable for past (6):** ng (archive back to 2007 with blurbs — the best of any venue), rijks, acq, wallace, frick, louvre.
- **Not reliably fetchable — shell-plus-database (3):** morgan (current has titles/dates but no URLs; upcoming has titles but no dates), khm (total shell failure on listings, individual pages fine), artic (dates missing on listings, past page entirely empty).
- **Italian venues, deferred (4):** capo (robots blocked), borghese (`/mostre/` subpages robots-blocked — **already contradicted by 6a**), uffizi (JavaScript-rendered empty shell), dellav (returns broken/stale content mixing 2022 announcements with old shows; the site is genuinely a mess even in a normal browser).
- **met past page:** JS year-filter unclickable via fetch, defaults to latest year only.
- ~~**tate:** venue-filtered query-param URLs couldn't be unlocked~~ — **WRONG, corrected 12 Sep 2026. They are in Tate's own navigation menu**, and they are server-side, so each combination is simply another page: `?date_range=from_now&gallery_group=tate-modern&event_type=display&event_type=exhibition`. `gallery_group` separates the two Tates and drops St Ives and Liverpool; `event_type` asks the site for exhibitions and displays only. **That is the answer to known bug 2 at the venue the guide named as its hard case** — Tate lists talks, tours, workshops, films and private views on the same page, and its own tag does the filtering, which is rung 1 of the ladder rather than our guess. `date_range=past` is NOT an archive despite the name: everything it returns also appears under `from_now`, so it means "has already opened". Tate publishes no past archive.
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

**Added 12 Sep 2026 — the 15 wired that day.** Several differ from the brief,
and each difference was read off the live site rather than assumed:

| Venue | Pages | What the brief got wrong |
|---|---|---|
| `frick` | `/exhibitions`, `/exhibitions/past` | — (but any `?` returns 403 here) |
| `menil` | `/exhibitions`, `/exhibitions/upcoming`, `/exhibitions/past` | exhibitions are `/exhibition/<slug>`, SINGULAR |
| `wallace` | `/whats-on/exhibitions-displays/`, `/explore/past-exhibitions/` | **`/whats-on/` is a two-tile hub, not a listing** |
| `va` | `/whatson?type=exhibition` | — (that filter already includes displays) |
| `tate-modern` / `tate-britain` | `/whats-on?date_range=from_now\|past&gallery_group=…&event_type=display&event_type=exhibition` | **the filters were recorded as impossible to unlock** |
| `louvre` | `/en/exhibitions-and-events/exhibitions`, `…/past-exhibitions` + `?date=YYYY` | selector must be the full `/exhibitions/` path or the tabs come in as shows |
| `uffizi` | `/en/event-category/exhibitions`, `…/upcoming`, `…/years/YYYY` | the year sits in the PATH, not a query parameter |
| `brera` | `/en/exhibitions-and-events/exhibitions/?current_page=1&date=in-progress\|scheduled\|archive` | exhibitions are filed under `/en/news/mostra/` |
| `capo` | `/mostre/` | exhibitions are `/mostra/<slug>`, SINGULAR |
| `khm` | `/en/exhibitions` (scoped), `/en/exhibitions/upcoming` | **lazy-loads; also mixes permanent collections in** |
| `dellav` | `/en/` | **not blocked; the brief's address 404s and there is no listing page** |
| `artic` | `/exhibitions`, `/exhibitions/upcoming`, `/exhibitions/history?year=YYYY[&page=2]` | **archive is `history?year=`, and it paginates twice over** |
| `moma` | `/calendar/exhibitions`, `…/history` | untested — refused |
| `brit` | `/exhibitions-events`, `…/past-exhibitions` | untested — refused |

Known URL corrections from Sep 2026 testing, for venues not yet wired: Louvre current+upcoming is `louvre.fr/en/exhibitions-and-events/exhibitions`; Louvre past needs four URLs (base plus `?date=2024`, `?date=2025`, `?date=2026`, and its year filter is server-side so it actually works); Menil current is `menil.org/exhibitions` not `/exhibitions/current`; Borghese has migrated to `galleriaborghese.cultura.gov.it` from `.beniculturali.it`.

**All 21 venues' addresses are now in the repo — `docs/venue_urls.md`** (added
11 Sep 2026). They come from the **Sweeper Brief v2**, stored beside it as
`docs/Cat_Watch_Sweeper_Brief_v2.docx`.

**That document had never been committed, on any branch**, so the addresses for the
15 unwired venues lived only inside a Claude chat — recoverable only by asking her
to find and re-upload it, which is precisely what happened. Anything the project
depends on belongs in the repo.

`docs/venue_urls.md` also carries the per-venue traps the brief records (the Met's
unreachable past years, Uffizi never tested, Capodimonte possibly blocking, the
venues with no past archive at all, and the Tate venue tag), and flags **three
addresses where the brief and the corrections above disagree** — Louvre current,
Louvre past, and Menil current. Nobody has retested those, so try the brief's
address first and the correction second before calling a venue unreachable.

**Most of the brief does not apply to the scraper** and is marked as such in that
file — it was written for Chat Claude driving a fetch tool. Its hand-brake rule is
the *opposite* of what this scraper must do, and its 12-word summary cap was
superseded by the measured ten.

---

