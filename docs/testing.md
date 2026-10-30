# Testing

## Which tests to run

**Run only the group for the work in hand** (running every suite reported failures in suites that had nothing to do with the change).

| Work on | Command |
|---|---|
| Add by link — reading a pasted page, venue link rules | `npm run test:links` |
| The shop finder, catalogue lookup, Re-check | `npm run test:lookup` |
| Saving — the cloud ledger, Save, Load | `npm run test:saving` |
| The import screen, cards, sorting, display | `npm run test:screen` |
| The scraper (`scraper/`) — sweep, recipes, QC, compression | `npm run test:scraper` |
| The shared date reader or summary rules (`dates.js`, `compress_prompt.md`) | `npm test` (both halves) |
| **Before publishing the app** | `npm run test:app`, once |

Every app group also runs the import tests and the checks that the page loads and draws. A change spanning two groups runs both.
Which suites each group holds is `scraper/run_tests.js`, never retyped here; a branch's own suite goes in its
`scraper/fixtures/branch_tests.txt`. **The exit code says whether everything run passed.**

## Watched runs (her decision: hard-wired)

Every run goes through `scraper/run_tests.js` (one suite: `--only <part of its command>`; expected time: `--estimate`): it prints the
expected time first, holds a lock so no second run or live check starts beside it, reports every minute, and stops a suite well past
its usual time (`stallLimit`, `scraper/test_watch.js`), then re-runs it alone — "STALLED with others running, then passed alone" is
crowding, "STALLED TWICE" a real fault. Live shop checks stop after six minutes without an answer. Usual times:
`scraper/test_times.json` (`--save-times`). The Bash hook (`.claude/hooks/test-guard.js`) refuses a direct suite run, a second run,
`&`/`nohup`, a long foreground run, a run of a minute or more until the session has written her the exact "Expected test run: …"
line, and any run when only guide, docs or skill text has changed since `main` (no suite reads it).

## When a test fails

**Do not investigate it in the session.** Record it in CLAUDE.md §2.2.6 as an OPEN item, one or two lines: the suite, how often it
failed, whether it passed alone, a short thought on why (or "needs investigation"). Update an existing item. Tell her in one line.
The cloud-saving suites run alone (they wait 8 seconds for an automatic save; the app saves 0.6 seconds after the last change).

## The shop finder's standing check

After a change to the shop finder only: `node scraper/shop_check.js <venue keys>` — the app's own finder, live, on the venues in
`docs/shop_check.json`, each against its ONE right shop (strict); exit 1 on a miss, with the finder's steps beside its last good
run. About five calls a venue on the free Parallel server (her key is not in the environment). **After a fix: only the venues that fix
can reach; all of them once before publishing** (her decision); a full run is about half an hour. **Live only — never saved copies of
the shops' replies** (her decision). The gallery path has its own: `node scraper/gallery_shop_check.js <keys>`
(`docs/gallery_shop_check.json`), same rules.

## Live proof pages — testing against the live internet

Work using Parallel (Add by link, the catalogue search) is tested against the live internet, never saved or invented pages (her
decision). Not part of `npm test`.

**Add by link — `docs/link_proof_pages.json`** (`url`, `venue`, the `title`, `start`, `end` signed off; `note` where knowingly
imperfect; `rules`; `passage`, the first and last 60 characters handed to Claude). Fetch the addresses live through Parallel (the keyed
connector only with her yes), save each reply as `{url,title,full_content}` by script into a scratchpad folder, run `node
scraper/link_proof_check.js <folder>` (`--all` also fails on a listed page with no reply); exit 1 on any difference — a reader change
to sign off (update the list) or a site that changed. A page whose rules changed is reported, not a difference (`--write-rules`).
**A page is on the list only for a rule no other listed page at its venue shows** (her decision: one page per venue layout, one per
unusual thing): add pages only with `--add` on new replies, never by hand; `--cover` prints the fewest pages per venue that show every
rule. A rule the reader cannot see is held by an offline test (AL-031, the date tests). **From a script:** the free Parallel server
answers directly (`https://search.parallel.ai/mcp`, JSON-RPC `initialize`, then `tools/call` `web_fetch` / `web_search`); its free tier
refuses after about 30 requests (a run waits a minute and retries); her keyed connector cannot be reached from a script.

**Never (her decision):** re-fetch the whole list after every small fix within one session (re-run the check on the replies already
fetched); fetch every listed page for a change that touches one venue's rule (that venue's pages only). **A site that refuses
Parallel** (Pages): her saved pages in `docs/link_pages/saved/`, run by `add_by_page.js` (live proof impossible).

**Catalogue search — `docs/lookup_proof_cards.json`**, her nine agreed cases, checked against her own live lookups: save the lookup
log (`node build/lookup_log.js` says how), then `node build/lookup_proof_check.js <saved dir>`; exit 1 on any difference.

## How the suites are built

Each fixture file opens with what it proves; case IDs (AL-, C-, R-, KP-…) are found by grep. `page_loads.js` asks whether the app page
LOADS, `page_renders.js` whether it DRAWS (the load check once passed while the live page was black). The harness lifts the intake out
of the JSX by **anchors on prose, never line numbers**; an early `return` in a fixture file exits the whole suite silently — **await,
never return.** **JSX validation:** `tsc check.tsx --jsx preserve --noEmit --skipLibCheck --allowJs --target esnext`, filtering for
`error TS1[0-9]{3}[^0-9]`.
