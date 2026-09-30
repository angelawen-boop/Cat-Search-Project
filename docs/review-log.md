# Independent review log

**Read this when a reviewer raises a finding**, to check whether it was already
decided. A **Reject** is not revisited without new evidence — point the reviewer
at the row. A **Defer** must name its trigger. Findings are judged against the
code, not the guide.

## 9 Sep 2026 — Codex diagnostic review (commit `2d083d5`)

| Ref | Finding | Decision |
|---|---|---|
| IR-01 | Year only on the closing side gave the opening date that year | Fixed 10 Sep |
| IR-02 | `Sept. 21, 2024 - Oct. 12, 2024` produced no dates | Fixed 10 Sep |
| IR-03 | Impossible dates (`2026-02-31`) emitted as real | Fixed 10 Sep (`ymd()`) |
| IR-04 | The sanity guard covered only the prose parser | Fixed 10 Sep |
| IR-05 | Plausible-year guard missing from the day-first branch | Fixed 10 Sep |
| IR-06 | `parseDateRange`, a second parser nothing called | Deleted 10 Sep |
| IR-07 | `normalizeUrl` lowercased the path | Fixed 10 Sep — scheme and host only |
| IR-08 | Links joined onto the base by hand | Fixed 10 Sep — resolved, host checked |
| IR-09, IR-09a | A date not proved to belong to this exhibition — structured data, then page text and neighbouring cards | Fixed 10 Sep for all three sources (`docs/scraper.md` §3). The general case is unsolved |
| IR-10, IR-12 | Output files collided; a dying run lost everything | Fixed — the run directory |
| IR-11 | No automated tests | Fixed — `npm test` |
| IR-13 | Block scripts and trackers in the bridge | **Reject** — running JavaScript is why a browser is used |
| IR-14 | Split the scraper into modules | **Reject** — one engine plus recipes; testability answered by IR-11 |
| IR-15 | Fetch several pages at once within a venue | **Reject — never, at any scale.** Hammering |
| IR-16 | Marker rows are exported | Intended — proves the venue was checked |
| IR-17 | Reviewer could not launch Chromium | Their environment (`resolveChromium()`) |
| IR-18 | Drop an undated row whose START is long before the floor | **Reject** (her call) — would have caught one row in 87, and adds judgement the lookback deliberately avoids |
| DEF-01 | Run venues in parallel with each other | Built 11 Sep — `--jobs=N`, default 4 |
| DEF-02 | After a JavaScript filter, wait for proof the list changed | **Defer.** Trigger: wiring a venue that filters by JavaScript. Server-side filters (Met, Louvre years) don't need it |
| DEF-03 | Generic summary fallback could capture ticketing or biography | Largely answered by the junk rules (`docs/scraper.md` §4). **Her ruling:** never defer bad text to "compression will catch it" |
| DEF-04 | Nothing bounds a hanging venue | Built 11 Sep — `--budget-mins`, default 10 |
