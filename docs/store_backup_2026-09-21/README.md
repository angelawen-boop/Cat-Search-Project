# Store snapshot, 21 Sep 2026 — taken for the wipe-and-restore drill

The app keeps two documents in the published page's own store (§4):
`quarantine/rows` and `sweeps/venues`. This folder holds both exactly as
they stood immediately before the drill emptied them.

**IT IS INSURANCE, NOT PART OF THE TEST.** The drill's whole point is that
quarantine comes back from HER export and the sweep dates come back from
`scraper/sweep_log.js`. These files exist so a failed drill costs nothing,
and they are not the route either half is supposed to take.

`sweeps_venues.json` was produced by `node scraper/sweep_log.js --json` and
was verified identical to the live store across all 21 venues before the
wipe — which is itself the check that the rebuilder is trustworthy.

At the moment of the snapshot: two rows BLOCKED (artic Raqib Shaw, louvre
Michelangelo Rodin) and three tombstones, one of them the Met's P. S. Art,
which she quarantined and released minutes earlier. **A tombstone is not in
her export**, which carries only what is blocked, so it is expected to be
absent after the restore rather than to come back as "released".
