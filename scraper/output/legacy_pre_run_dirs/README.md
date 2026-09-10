# Output from before runs became directories (pre-10 Sep 2026)

Kept for reference, not produced any more.

- `sweep_2026-09-08_0805_acq.csv` — the Acquavella run verified against her count
  of the live page on 8 Sep. Useful as a baseline; today's runs are diffed
  against it.
- `sweep_raw.csv` — **do not read this as a full sweep.** It holds Rijksmuseum
  rows only. It is what the old scheme's bug produced: a one-venue diagnostic
  run overwrote a complete sweep and left a file that still looked complete.
  It is the reason a run is now a directory.
- `sweep_log.txt`, `sweep_2026-09-08_0805_acq.log.txt` — the matching logs.
