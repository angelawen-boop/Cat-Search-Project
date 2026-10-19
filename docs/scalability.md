# Scalability — what grows as the ledger grows, and what to do about it

Her ledger passed 1,000 exhibitions (1,003) and the app lagged (her report); 2,000
would not surprise her. **The faster list is built (49).** The rest: agree each item
with her before starting it.

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
| Main list | Fixed at 49 (below) | Every card was redrawn on any change, and the sort re-worked each row's tier per comparison |
| Import compare | Fine — well under a second | Each sweep row checks venue first, then title, then dates (`sameExhibition`) |
| Review pile | Not tied to ledger size | Cards come from what a sweep CHANGED; a reworded description is a Change card |
| Export / Load | Fine — ~1.3 MB file | |
| Cloud live ledger | Fine — 2 pieces per save, old pieces deleted | `cloudSaveLive` |
| **Cloud Saves** | **Grow without end** | Never pruned (her decision); each a whole copy, ~270 KB at 2,000 |
| Store documents | Fine | Cap 25,000 documents per page |
| Store total size | **Unknown** | The platform caps it but publishes no number. Full → saves fail with "The page's store is full" (`cloudTrouble`); nothing lost silently |
| Lookups / Parallel | Not tied to ledger size | Paid per click; no bulk lookup |

Safety does not weaken with size: Export stays her file, Save asks before
writing fewer exhibitions than the cloud holds, a cut-off save keeps the last
complete copy, a damaged piece is refused.

## The faster list — built at 49 (her decision)

- **Only the changed card redraws** (`LedgerCard`, memoised; its props held stable in App).
  The sort works out each row's tier once.
- **Drawn as she scrolls** (`DRAW_STEP` = 200; LD-001–006): 200 more near the end; a new
  filter, sort or search starts from the top; Jump to bottom draws the rest first. Her
  one-venue views are under 200, so they draw whole. Browser find (Ctrl-F) sees only drawn
  cards; the app's own search sees all.
- **Save no longer downloads the cloud copy** to read its count before asking the file
  question: the live record holds the count.
- **Measured** (`node build/list_timing.js`, 2,000 rows, 784 cards on All venues; ms, before →
  after; "phone" = CPU ×4): a star 60–165 → 10–20 (phone 240–450 → 30–60); Save-name
  keystroke 50+ → ~15, one frame (phone ~220 → ~75); clearing a search, phone, up to 2.9 s →
  ~0.2 s; first draw, phone, 1.8 s → 0.5 s.

**The wait before "Confirm save?" — fixed at 49.1 (her decision); her next Saves confirm.** Her
screen recording showed ~1.7 s of "Saving…" while the Cloud Save copy was written, then ~0.45 s
with the box's "Save file" greyed (Claude's download box, not the app's). The file question now
opens while the copy is written; a cancelled file still leaves it (CA-008c, CA-008f2–f4).

Her saved files stay plain, indented JSON (~0.9 MB at 1,003 rows; ~0.7 MB unindented; the cloud
copy is gzipped, ~1/8): she weighed a compressed download and kept them readable (her decision).

## Parked — for later action, her call when

1. **Cloud Saves: keep every one, or a rule for clearing old ones.** Because
   she wanted every save kept, they are never pruned. Options to put to her:
   keep everything and show how much of the store is used; or keep all recent
   saves plus one a month after that.
