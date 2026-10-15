# Testing

## Tests

**Test the half you changed — her decision.** A plumber does not test the
wiring.

- App work (`Cat_Watch.jsx`, `build/`) → `npm run test:app`.
- Scraper work (`scraper/`) → `npm run test:scraper`.
- `npm test` (both) only when a change touches both halves.

Where the halves meet — importing a scraper CSV, the shared date reader and
summary rules — those tests run in both halves already. A test failing in the
other half is reported in one line and left alone. **The exit code says
whether everything run passed.**

The suite list, and which half each belongs to, is `scraper/run_tests.js`,
never retyped here; a suite only a branch has goes in that branch's
`scraper/fixtures/branch_tests.txt` and runs with the app half (none today).
Each fixture file opens with what it proves; case IDs (AL-, C-, R-, KP-…) are
found by grep. Per-venue `*_pages.js` run a recipe on saved pages, no network,
against her counts, dates, titles and descriptions. `page_loads.js` asks whether the
app page LOADS, `page_renders.js` whether it DRAWS (jsdom, plain and with the runtime
answering) — the load check once passed while the live page was black.
`intake_cases.js` holds the merges that must not happen, quarantine, freshness, row
identity, whole-file refusal, the ledger gate and the sweep-log merge, on
`intake_sample.csv` (76 rows, 8 venues, every conflict shape).

The harness lifts the intake out of the JSX by **anchors on prose, never line
numbers**. An early `return` in a fixture file exits the whole suite silently —
**await, never return.**

**JSX validation:** `tsc check.tsx --jsx preserve --noEmit --skipLibCheck
--allowJs --target esnext`, filtering for `error TS1[0-9]{3}[^0-9]`.
