# Live check — baseline and follow-up

The live check page runs the app's real `lookupCatalogue` on her nine cases (her
connector, the in-page Claude) and grades each against `docs/lookup_proof_cards.json`.
A catalogue-lookup change is "fixed" only when this page passes (CLAUDE.md §1, §7.4).

- **Page:** https://claude.ai/artifact/KrnwLxC6YdZkd3QyFW4wmy — its own store; never
  her app or test page. Capabilities: mcp (Parallel Search Key: web_search, web_fetch),
  sample, db.
- **Build:** `node build/live_check.js` → `build/dist/live_check.html`; republish that
  file to the page's url. Source: `build/live_check_page.jsx`; cards and the NGA venue:
  `build/live_check_cases.json`.
- **Run:** she taps Run once (~10 min). Read it back with ArtifactData `list` +
  `out_dir`: `checks` (one doc per run), `checks/<run>/cases` (grades, drawn blocks,
  final row, every search with result addresses), `.../cases/<n>/reads/<k>` (Claude's
  prompt and raw answer, in pieces); `lookups` + `lookups/<id>/pieces` for
  `node build/lookup_log.js <dir> [<id>]`.
- **Graded:** versions listed, second number, language, publisher (every house
  named), showing, pick, left-off books, no extra versions. Binding, pages, titles
  and notes are not graded.

## Baseline — run R1791639137375lahf (code 43, commit 12bfa1e), one run each

Claude tier: `default` answered (`modelApplied` is never reported: the app names no
model). Each verdict rests on ONE run; results vary between runs.

| Case | Result | What failed |
|---|---|---|
| 1 Vasari | Fail | French 978-2359063721 and Stockholm 978-9171009166 not listed; English block has no language. The facts read answered all-empty; the publisher-site search died (`upstream_error`) |
| 2 Hubert Robert, Louvre | Fail | French block's publisher "Somogy éditions d'art" (Louvre not joined); Lund Humphries block has no publisher |
| 3 Hubert Robert, NGA | Fail | French book not listed; publisher "Lund Humphries" — Claude's facts read said "National Gallery of Art/Lund Humphries" and the card dropped NGA |
| 4 Hammershøi | Fail | French publisher "Fonds Mercator" (no Culturespaces); English block has no publisher (her card: Rizzoli Electa) |
| 5 Watteau | Fail | No publisher — Claude named "Musée du Louvre Éditions / Liénart Éditions", then "Lienart éditions"; the card kept neither |
| 6 Canaletto – Guardi | **Pass** | |
| 7 Botticelli | Fail | Publisher "Fonds Mercator" (no Culturespaces). Graded from its lookup record: the case record did not save |
| 8 Metamorphoses | Fail | Dutch and Italian not listed; publisher "Publication" — Claude said "Hannibal Books"/"Hannibal"; the publisher step then searched for "Publication" |
| 9 Millet | **Pass** | |

Passed everywhere they apply: pick (9/9), showing, left-off books, the co-edition's
second number (Hubert Robert), no extra versions.

Lookup records: Vasari `L179163914853866pa`, Hubert Louvre `L17916392049779uln`,
Hubert NGA `L1791639241852kdog`, Hammershøi `L1791639269084mdwl`, Watteau
`L17916393094463yis`, Canaletto `L17916393438786rrg`, Botticelli `L1791639405079sfni`,
Metamorphoses `L17916396765747elm`, Millet `L1791639703068rbam`.

## Follow up — next session

1. **The page is fixed (live as version 2, commit e837c72): run it again first.** Every
   write is recorded with the store's code and message, on the page ("Problems during
   this run") and in the run record's `problems`; the app's own writes are watched
   (its `saveLookupTape` hides failures). Retries follow the store's contract per code:
   `unavailable` waits 1–3 s, `resource_exhausted` 20–40 s then spaces later writes 1 s
   (both windows are judgement), the rest are not retried. "Saved" is read back from the
   store. The page no longer prunes the lookup log (the app keeps 50). Answers follow
   her agreed cards; Hammershøi's English publisher is graded. Botticelli's lost record
   stays unexplained — its code was never kept; the next failure names its cause.
   Tests: `scraper/fixtures/live_check_page.js`, LC-001 to LC-033.
2. **Regraded baseline:** still 2 of 9 (`docs/live_check_runs/`); Hammershøi's English
   publisher is now a fail, not "disputed".
3. **A failure is the baseline, not a fix list.** Diagnose from the lookup records
   above before changing anything; strongest leads: Watteau's and Metamorphoses'
   publisher (Claude's name not kept / "Publication" read off a label), NGA's name
   dropped from "National Gallery of Art/Lund Humphries", the facts read finding no
   other editions at Vasari, Hubert NGA and Metamorphoses.
4. **Repeat runs measure how stable the lookup is, and can be back to back** — the
   search and Claude's reading vary call to call, not day to day. A case that changes
   between two runs is itself a fault in the lookup.
