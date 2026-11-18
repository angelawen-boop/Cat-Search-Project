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
(`docs/gallery_shop_check.json`), same rules. **Known misses, not investigated** (CLAUDE.md §2.2.6; the same under the
code before 59.2, on the same live replies): Berlin takes one book's page for the section, the Albertina's section is not
found, the Belvedere stays German, White Cube takes its prints section.

## Live proof pages — testing against the live internet

Work using Parallel (Add by link, the catalogue search) is tested against the live internet, never saved or invented pages (her
decision). Not part of `npm test`.

**Add by link — `docs/link_proof_pages.json`** (`url`, `venue`, the `title`, `start`, `end` signed off; `note` where knowingly
imperfect; `rules`; `passage`, the first and last 60 characters handed to Claude). Fetch the addresses live through Parallel (the keyed
connector only with her yes), save each reply as `{url,title,full_content}` by script into a scratchpad folder, run `node
scraper/link_proof_check.js <folder>` (`--all` also fails on a listed page with no reply); exit 1 on any difference — a reader change
to sign off (update the list) or a site that changed. A page whose rules changed is reported, not a difference (`--write-rules`); a page listed as refused counts as listed while
it is refused for the same reason. A changed page read correctly updates the list; read badly, that venue gets a rule.
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

## Proving the checks — OPEN (her decision)

**Why this exists.** The restructure's checks were trusted without proof. A check that stays quiet when nothing has changed
proves nothing about whether it sounds when something breaks; only planting faults on purpose shows that. Parts of the
side-by-side check were added marked "being proven", then written up as "The proof: every screen identical" — not a proof
— and put off to "re-run the tools' own proofs at the end"; sessions after cleared work, and sent her test pages, on that
unproven check. The one-place, words and layout checks have never had a fault planted at all. **The machine proves the
work before she sees it; her test page is never where proof comes from.**

**The plan, in this order:**
1. **The migration's tools go.** The tool that moved the app into its parts, the layer-by-layer gates, the placement
   list's layer machinery and the proof that replays the whole move. Kept: the join that builds `Cat_Watch.jsx` from
   `app/`, its guard against a hand-edited `Cat_Watch.jsx`, the three checks below and the side-by-side check. A job a
   kept tool still needs from a removed one moves into the kept tool first.
2. **The three checks are proven** — the one-place check (`build/fact_check.js`), the words check
   (`build/words_check.js`), the layout check (`build/structure_check.js`) — by a fault planted in every rule each
   enforces, each caught by that rule. **The hand-edit guard gets its own proof** (its only proof was in the migration
   proof removed in 1).
3. **The side-by-side check is rewritten where it wastes time.** The check itself still walks every screen once (a
   change in one place can break another). Its proof re-walks the whole app for each planted fault: rewritten, each
   fault walks only the screen or step it is planted in. The idle waits for the screen to settle are cut in both.
4. **The side-by-side check is proven, in full** — a fault planted in every screen, step and store record it checks, each
   caught by its own step — by the session that rewrites it, before anything relies on it.
5. **Enforced by code: no test can be used until it is proven.** A test, new or changed, does not report "passed" until
   its planted-fault proof has passed on that exact version of it; the code remembers the version that passed and refuses
   when the test has changed since. Whoever builds or changes a test proves it in the same work — never later, never by
   another session. Tests that exist now and are not touched stay unproven until next changed (her decision, knowing it).
   Every proof runs through `scraper/run_tests.js`, so her expected-time line comes first.
6. **Before her next test page:** the side-by-side check and the three checks run on the current code — they are what
   cleared the words list and the housekeeping that go into 60. Her test page then covers only what a machine cannot
   reach: her Claude, her Parallel searches, her store. **Anything a machine can test, a machine tests.**

When done, this section is cut to its result: which checks are proven, and the lock (5) as a standing rule.

## How the suites are built

Each fixture file opens with what it proves; case IDs (AL-, C-, R-, KP-…) are found by grep. `page_loads.js` asks whether the app page
LOADS, `page_renders.js` whether it DRAWS (the load check once passed while the live page was black). The harness lifts the intake out
of the JSX by **anchors on prose, never line numbers**; an early `return` in a fixture file exits the whole suite silently — **await,
never return.** **A test looks for the app's sentences in its words list** (`scraper/fixtures/words.js`; `docs/restructure.md`, "The
words list"), never retyped; a test that lifts part of the page puts `wordsSource(src)` in front of it. **JSX validation:** `tsc check.tsx --jsx preserve --noEmit --skipLibCheck --allowJs --target esnext`, filtering for
`error TS1[0-9]{3}[^0-9]`.
