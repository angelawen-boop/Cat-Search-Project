# Independent review log

Moved out of `CLAUDE.md` on 12 Sep 2026. **Read this when a reviewer raises a
finding**, to check whether it has already been decided.

Two standing rules: a **Reject** is not revisited without new evidence — point
the reviewer at the row rather than re-running the argument. A **Defer** must
name its trigger, or it rots into a reject.

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
| DEF-01 | Run venues **in parallel with each other** (never within one venue) | **Fixed 11 Sep** — `--jobs=N`, default 4. Five venues in 4m46s, bounded by the slowest venue instead of the sum. Proved lossless against the serial baseline before being trusted. ~~Defer~~ | **Trigger:** more than ~8 working venues, or a run over 15 minutes. ~~Measured 8 Sep: ~2.9s per detail page, so 21 venues projects to ~20 min.~~ **Re-measured 12 Sep from the logs of every committed run: 33 min serial, ~9-11 min at the default --jobs=4, bounded by Capodimonte's 6 minutes. See Section 5.** Agreed in principle 10 Sep; she has withdrawn the log-readability objection, since she reads the session's summary rather than the log — so the log may be interleaved provided it stays machine-parseable |
| DEF-02 | After changing a **JavaScript** filter, wait for proof the list changed, not merely that the page has text | **Defer** | **Trigger:** wiring any non-blocked venue that filters by JavaScript. Moot for the Met (HTTP 429; its dropdown has never been clicked). A **server-side** filter loading a different URL per year — the Louvre's — is not exposed to this and needs nothing |
| DEF-03 | The summary extractor falls through to generic paragraph selectors, so a layout change could capture ticketing or biography text | **Defer** | **Trigger:** observe the next handful of venues as they are wired; fix if it actually surfaces. **Her ruling, and the reasoning matters:** it must not be deferred to "the compression step will catch it". Letting bad text through on the assumption a later stage notices is a bad habit, and it must never reach an approval card for her to be the one asking why the description is nonsense |
| IR-18 | Drop a row with no end date when its **start** date is long before the lookback floor (proposed 10 Sep, after the 2012 Rosenquist row) | **Reject** | Her call: more granularity than it is worth. Measured first — across all 87 distinct rows ever collected it would have caught **one**. It would also add a new kind of judgement, since the lookback tests only the end date and an unknown end date is never treated as evidence of age. Any threshold at the floor itself would delete a show that opened just before 1 July 2024 and ran past it, which the guide names as a keeper |
| DEF-04 | Nothing bounds a venue that **hangs** — a block costs a second, a hang costs 20s plus a retry per page | **Fixed 11 Sep** — a venue over its budget (default 10 min, `--budget-mins=N`) is abandoned, writes no file and is redone by `--continue`. Fired on purpose at a 9-second budget to prove it, since a guard nobody has seen fire is a guard nobody knows works. ~~Defer~~ | **Trigger:** with DEF-01. The run directory already limits the damage: completed venues are safe on disk and a timed-out venue is picked up by the next `--continue` |
