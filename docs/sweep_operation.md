# Sweep operation — running the scraper

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
| `sweep_log.js`, `venue_status.js` | Freshness drawer rebuilt from disk; CLAUDE.md §2's printed venue status |
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


### Then hand her the file — she must never have to ask

**Before sending, read the run summary's TITLES list** — every title the page
check (`titleFromPage`) changed, and every name it could not complete.

Send `sweep_compressed.csv` with the file-sending tool as soon as compression
finishes, saying how many rows and how many summaries were reused versus written.
**One file only** — never `sweep.csv`, which holds raw text. **If compression has
not been run, the run is not finished.** Run the file through the app's intake
and READ the cards before sending (§6).
