# The tests — what is kept, what retires, and the rules after (her decision)

Agreed with her, not yet built. Her reasons: most tests were never proven, many guard one old case or run on a pretend
Claude, and the whole-file lock blocked a basic job (adding Budapest). A reorganisation was rejected: it would open every
test and balloon. Retiring opens nothing. Retired tests stay in git, and any of them can be brought back.

## The plan

1. **The essential tests are kept as they are, and each is proven** (a fault planted on purpose, caught):
   - the page opens and draws: `page_renders.js`, `page_loads.js`
   - saving and ledger safety: `cloud_ledger.js`, `cloud_app.js`, `cloud_two_copies.js`, `cloud_empty_import.js`,
     `store_unread.js`
   - import never loses or wrongly merges a show: `intake_cases.js`
   - their shared kit stays: `harness.js`, `fake_store.js`, `words.js`
2. **The tests already proven are kept**: the build checks (`join_guard`, `structure_check`, `fact_check`,
   `words_check`, `side_by_side`), `quarantine_moved`, `mfab_pages`, `pacing`, `routing`. **Two kinds retire:** the lock's own
   test (`lock`), and the one-off tests of single past sweeps (`sweep_nov_pages`, `sweep_nov27_pages`, `khm_season_pages`),
   each with its proof.
3. **The date reader's tests (`date.test.js`) are kept as they are, and proven.** They hold the real date formats collected
   over months, and a rewrite would lose some.
4. **Nothing is rewritten for the sake of it.** They already do the right job; what they lack is proof.
5. **The lock goes.** The refusal of changed or unproven tests leaves the runner and the hook. `--prove` stays, as a
   tool for proving. The watched runs stay (her decision; `docs/testing.md`, "Watched runs").
6. **The rules for new tests, kept light:**
   - a new test is added only for the core areas above
   - it is proven when it is added
   - it reads the real lists (the venue register, the words list), never a typed-out copy
   - a test never blocks her change: it is updated or retired on the spot, and she is told in one line
   - the only code check is a small guard that refuses a typed-out venue list or venue count in a test; anything more
     becomes a lock again
7. **Everything else retires** (removed from the runner and from `scraper/fixtures/`). That includes Add by link, page and
   paste, the catalogue lookup and Re-check, compression, the screen-drawing tests, the one-museum page tests, the venue
   list tests, the scraper's paperwork tests, and the tests of the test machinery.
8. **Two small fixes inside kept tests:**
   - the typed-out venue order and count come out of `intake_cases.js` (checks 19, 19a, 19c, 19d)
   - the saving tests wait until the save has happened, never a fixed number of seconds, which ends the false
     failures when the machine is busy
9. **The session checks for real before it says "done"** — real pages (through Parallel where the work uses it), and
   the app opened the way she opens it. This replaces the retired tests; she is never the tester.

**When it is built:** the runner's list, `docs/testing.md` (the lock, the groups, the 8-second note), §4.1's lock lesson,
and §2.2.6's failing suites are brought in line with it.
