# Ledger size — what grows, and what to do about it

Her ledger is about 850 exhibitions and nearing 1,000; 2,000 would not surprise
her. This doc tracks what that means and the work parked for when she decides
to act. **Nothing here is built.** Open with her before starting any item.

## Measured

Her ledger of 24 Sep (`docs/ledger_2026-09-24/`, 352 rows): 220 KB as JSON,
35 KB gzipped, ~630 characters a row. Scaled: ~1.3 MB and ~200 KB gzipped at
2,000. Rows will grow somewhat as catalogue details fill in.

Growth (a guess): the first sweeps back-filled everything open since the
1 July 2024 lookback. Later sweeps add mostly new shows — perhaps 400–700 a
year across 28 venues. Her second full sweep's Add count gives the real rate.

## What scales and what doesn't

| Area | At 2,000 | Why |
|---|---|---|
| Main list | **The first pinch.** Lag on typing in search and on any mark, worse on a phone — a guess; untested | The `view` list draws every visible card at once, and no card is memoised, so one tick redraws them all |
| Import compare | Fine — well under a second | Each sweep row checks venue first, then title, then dates (`sameExhibition`) |
| Review pile | Not tied to ledger size | Cards come from what a sweep CHANGED; a reworded description is a Change card |
| Export / Load | Fine — ~1.3 MB file | |
| Cloud live ledger | Fine — 2 pieces per save, old pieces deleted | `cloudSaveLive` (branch `claude/ledger-cloud`) |
| **Cloud Saves** | **Grow without end** | Never pruned (her decision); each a whole copy, ~270 KB at 2,000 |
| Store documents | Fine | Cap 25,000 documents per page |
| Store total size | **Unknown** | The platform caps it but publishes no number. Full → saves fail with "The page's store is full" (`cloudTrouble`); nothing lost silently |
| Lookups / Parallel | Not tied to ledger size | Paid per click; no bulk lookup |

Safety does not weaken with size: Export stays her file, Save asks before
writing fewer exhibitions than the cloud holds, a cut-off save keeps the last
complete copy, a damaged piece is refused.

## Parked — for later action, her call when

1. **Make the list faster** — two changes, same screen, nothing she sees
   changes:
   - **Redraw only the card that changed** (memoise each card), so ticking a
     mark on one card no longer redraws the rest.
   - **Draw cards as she scrolls** — the first ~200, more as she reaches the
     bottom.
   Suggested trigger: before ~1,500 exhibitions, or the first lag she notices.
   Prove it on a 2,000-row copy of her ledger, timing before and after.
2. **Cloud Saves: keep every one, or a rule for clearing old ones.** Because
   she wanted every save kept, they are never pruned. Options to put to her:
   keep everything and show how much of the store is used; or keep all recent
   saves plus one a month after that. Applies on `claude/ledger-cloud` only
   until the cloud ledger merges.
