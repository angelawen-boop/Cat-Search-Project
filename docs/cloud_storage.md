# Cloud storage — the cloud ledger trial

**What it is:** the ledger kept in the page's own store, saved about a second
after every change, instead of living only in her exported file. She reopened
this idea herself. **Branch only — `main` and her published app do not have
it.** Code: "THE CLOUD LEDGER" in `Cat_Watch.jsx` on the branch. Screen spec:
`docs/app.md` §9.

**Versions** (the branch's own series: `main`'s number, then the cloud count):
live on the test page **45.1 · cloud 5**. Cloud-only in it:
the read-only lock (below); Import on an empty page offers only "Open last
cloud save" and Load, and Save asks before writing fewer exhibitions than the
cloud holds (EI-001–007; `docs/app.md` §9); a roll-back's safety copy names the save by its
time (CL-T1–3); Cloud Saves' times share one width. The cloud count moves only
when she says. Publishing: `build_app.js` prints the steps (`docs/publishing.md`).

**What the store holds:**
- **The live ledger** — the only thing the app reads and writes as she works.
  Compressed; a large ledger splits into pieces, same code.
- **Cloud Saves** (snapshots in the code) — whole copies, never rewritten, never
  pruned (her choice). Same store as the live ledger, her yes.
- **The sweep log and quarantine** — during the trial the TEST page's copies are
  the live ones (a page reads only its own store). Seeded from her app.

**Saving:** one **Save** button → a description, "Also save a copy to cloud"
(ticked; revisit if storage fills), Save now. Plus exactly **two automatic
safety copies** of the live ledger: before a roll-back, and before Load or Reset
replaces a live ledger that differs from what is coming in. If it cannot be kept,
nothing is replaced. Import never triggers one.

**Trial switch `CLOUD_OPENS=false`:** the app opens empty, she Loads her file,
and the loading line says whether the file matched the last cloud save — that is
the trial's check.

**Safety, proven** (`cloud_ledger.js`, `cloud_app.js`, 51 checks, her real
ledger): a save writes new pieces and switches one record last, so a save cut off
anywhere leaves the last complete ledger; a damaged or missing piece is refused;
an empty page never saves.

**Her tests all passed** — load, change, reload, roll-back,
Save, close and reopen, a real sweep Import.

**Two copies open: the later one is READ ONLY** (her decision). It opens
empty and writes nothing — "Open it" shows the cloud copy when she asks, never by itself (her decision); an edit record with a heartbeat decides,
stale after a minute; every save checks it first. A republish while her page is open can lock the new page for up to a minute — accepted, her decision (a same-tab fix did not hold and was removed). Design: "ONE COPY EDITS AT A TIME" in the code;
`cloud_two_copies.js`, TC-001–010.

