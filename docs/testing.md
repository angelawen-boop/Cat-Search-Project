# Testing

## Which tests to run

**Run only the group for the work in hand.** Running every suite meant a session reported failures in
suites that had nothing to do with its change (scraper suites during app work, cloud saving during Add
by link work).

| Work on | Command |
|---|---|
| Add by link — reading a pasted page, venue link rules | `npm run test:links` |
| The shop finder, catalogue lookup, Re-check | `npm run test:lookup` |
| Saving — the cloud ledger, Save, Load | `npm run test:saving` |
| The import screen, cards, sorting, display | `npm run test:screen` |
| The scraper (`scraper/`) — sweep, recipes, QC, compression | `npm run test:scraper` |
| The shared date reader or summary rules (`dates.js`, `compress_prompt.md`) | `npm test` (both halves) |
| **Before publishing the app** | `npm run test:app` (the whole app half), once |

Every app group also runs the import tests and the checks that the page loads and draws. A change that
spans two groups runs both. Which suites each group holds is `scraper/run_tests.js`, never retyped here; a
suite only a branch has goes in that branch's `scraper/fixtures/branch_tests.txt` and runs with every app
group (none today). **The exit code says whether everything run passed.**

## When a test fails

**Do not investigate it in the session.** Record it in CLAUDE.md §2.2.6 as an OPEN item, one or two lines:
the suite, how many times it failed this session, whether it passed when run alone, and a short thought on
why — or "needs investigation" if there is none. If the suite already has an item, update it. Tell her in
one line that it is recorded.

## Live proof pages — testing against the live internet

Work using Parallel (Add by link, the catalogue search) is tested against the live internet, never saved
or invented pages (her decision). Each feature keeps a list of live addresses with the signed-off result
for each. Not part of `npm test`: they need live replies.

**Add by link — `docs/link_proof_pages.json`** (`url`, `venue`, and the `title`, `start`, `end` signed off;
`note` where a field is knowingly imperfect). Fetch the addresses live through Parallel (the keyed
connector only with her yes), save each reply as `{url,title,full_content}` by script into a folder in the
scratchpad, and run `node scraper/link_proof_check.js <folder>` (`--all` also fails on a listed page with
no reply); exit 1 on any difference. A difference is a reader change to sign off (update the list) or a
site that changed.

**Never (her decision):**
- re-fetch the whole list after every small fix within one session — the pages have not changed in the
  last hour, only the code has, so re-run the check on the replies already fetched;
- fetch every listed page for a change that only touches one venue's rule — fetch that venue's pages only.

**Catalogue search — `docs/lookup_proof_cards.json`**, her nine agreed cases. Checked against her own
live lookups, not fetched by the session: save the lookup log (`node build/lookup_log.js` says how), then
`node build/lookup_proof_check.js <saved dir>`; exit 1 on any difference.

## How the suites are built

Each fixture file opens with what it proves; case IDs (AL-, C-, R-, KP-…) are found by grep. Per-venue
`*_pages.js` run a recipe on saved pages, no network, against her counts, dates, titles and descriptions.
`page_loads.js` asks whether the app page LOADS, `page_renders.js` whether it DRAWS (jsdom, plain and with
the runtime answering) — the load check once passed while the live page was black. `intake_cases.js` holds
the merges that must not happen, quarantine, freshness, row identity, whole-file refusal, the ledger gate
and the sweep-log merge, on `intake_sample.csv` (76 rows, 8 venues, every conflict shape).

The harness lifts the intake out of the JSX by **anchors on prose, never line numbers**. An early `return`
in a fixture file exits the whole suite silently — **await, never return.**

**JSX validation:** `tsc check.tsx --jsx preserve --noEmit --skipLibCheck --allowJs --target esnext`,
filtering for `error TS1[0-9]{3}[^0-9]`.
