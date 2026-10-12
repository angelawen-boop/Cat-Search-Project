# Live check — the Stage 1 page

The live check page runs the app's real `lookupCatalogue` on the cases in
`build/live_check_cases.json` (her connector, the in-page Claude), in rounds — every case
once, then again — and grades each lookup by her Stage 1 pass test
(`build/stage1_grade.js`; answers `docs/stage1_answers.json`;
`docs/handover_search_stage1.md`). A catalogue-lookup change is "fixed" only when it
passes, every round (CLAUDE.md §1, §7.4).

- **Page:** https://claude.ai/artifact/KrnwLxC6YdZkd3QyFW4wmy — its own store; never
  her app or test page. Capabilities: mcp (Parallel Search Key: web_search, web_fetch),
  sample, db.
- **Build:** `node build/live_check.js` → `build/dist/live_check.html`; republish that
  file to the page's url. Source: `build/live_check_page.jsx`.
- **Run:** she sets Rounds (default 3; ~5 min a round) and taps Run. Each round is one
  run record (`checks/<run>`, `loop` and `round` name it), its cases under
  `checks/<run>/cases/<n>` (the Stage 1 lines, the books kept, every search's result
  addresses). Every lookup's full record: `lookups` + `lookups/<id>/pieces` (ArtifactData
  `list` + `out_dir`).
- **Regrade saved records:** `node build/stage1_check.js <saved dir> [<id> ...]` — the
  same pass test, with each book's trace; `node build/lookup_log.js <dir> <id>` prints one
  lookup whole.

## Baseline — the old code (before commit 5f3f0a6), three runs, her three cases

Regraded from the saved records (`docs/live_check_runs/lookups/`; S1P-007): **4 of 9 pass.**

| Case | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Vasari | Fail — Stockholm shown to Claude, not reported | Fail — the same | Fail — Stockholm reported, dropped by the app |
| Hubert Robert (Louvre) | Pass | Pass | Pass (the Washington book not in the results) |
| Hammershøi | Fail — 978-9462301290 shown to Claude, not reported | Fail — the English edition never seen | Pass |

The earlier card grading (her nine cards, `docs/lookup_proof_cards.json`) is parked
until Stage 2; git holds it.
