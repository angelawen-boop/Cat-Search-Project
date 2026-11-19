# Container run `run_2026-11-19_195713` — the report

**Done, with faults.** Pushed to main. Every container venue wrote its file, so no `--continue` was needed.

## Changes

| Group | What |
|---|---|
| 1. New shows | • ng 27 → 30: Collected; Frankenthaler and Bassano; Piero della Francesca<br>• acq 15 → 17: Harumi Klossowska de Rola: Horizon; The Dark Side of the Moon<br>• lgd 27 → 31: Jutta Koether; Leoncillo; Bacon / de Kooning; Special Presentation (Brown, Emin, Watt) — opened 10 Oct but first listed after the last run: the listing grew by exactly these 4 links<br>• frick 11 → 12: Imagined Lives: Alison Watt<br>• capo 18 → 19: Napoli tra i Borbone…; Andrea Fogli. Atlas Partenope<br>• uffizi 13 → 14: Magnifico 1492 (Fault 5)<br>• khm 5 → 8: The Imperial Crown; Dürer: The Artist's Dream; Toni R. Toivonen (Fault 5)<br>• tate-modern 13 → 28: 15 Relaxed Hours / Members Hours / Members Private View rows (Fault 2) |
| 2. Your fixes now reflected | • Acquavella: "– Acquavella Palm Beach" has left the title (Change card)<br>• Borghese: 9 titles now in ordinary capitals with an em dash (one round of Change cards)<br>• Tate Britain: listing pages 2 and 3 now read, which brings back James McNeill Whistler (2026-05-21 → 2026-09-27); the 15 Oct run missed it<br>• Brera: the info block is still there on one row (Fault 4) |
| 3. Missing shows | • menil 25 → 0: every page refused (Fault 1)<br>• cincinnati 31 → 0: every page refused (Fault 1)<br>• mam 16 → 0: server errors (Fault 1)<br>• louvre 22 → 0 (Fault 1)<br>• dellav 2 → 0: no answer (Fault 1); Abramović had closed anyway<br>• wallace 11 → 8: Churchill, Rachel Kneebone and Cosimo I gone (Fault 3)<br>• va 6 → 5: Schiaparelli closed on 15 Nov; this venue reads no past listing<br>• capo: Yeesookyung. Whisper Only to You gone — its own text dates it 2019–2020, before the lookback<br>• borghese: upcoming page empty, but no show lost — the upcoming shows have opened |
| 4. Changed titles | • rijks: 20th-century galleries (capitals only)<br>• khm: A Different Beauty. Japanese Ceramic Masterworks (colon → full stop; the name now read from the show's page because the listing links it by image only)<br>• tate-modern: Hyundai Commission: Tarek Atoui → Tarek Atoui: Hold |
| 5. Changed links | • rijks: Carel Visser moved to /past/ — QC expects a Change card for the link |
| 6. New dates | • uffizi: Carlo Maria Mariani gains 2024-10-08 → 2024-12-01 |
| 7. Changed dates | • rijks WORN and khm A Different Beauty lose their opening date — both pages show no opening date while the show runs (from the notes)<br>• rijks 20th-century galleries: closing 9 Nov → 10 May 2027<br>• va Punk to Pop: closing 2 Jan 2028 → 21 Mar 2027, from the site's hidden data (Fault 6)<br>• lgd Wangari Mathenge: closing 24 Oct → 28 Oct<br>• tate-britain Sonia Boyce: opening 24 Mar → 26 Mar 2027 |
| 8. Description problems | • rijks: 4 rows that never had text (pages return 404, already known)<br>• Junk on several rows (Fault 5) |
| 9. Others | • Kept under the lookback rule: Rosenquist F-111 (acq), Tosatti and Oltre Caravaggio (capo)<br>• Empty-page marker rows: brera upcoming, khm current |

## Faults

1. **Five venues brought nothing.**
   - **What:** every Menil, Cincinnati, MAM, Louvre and Accademia show is missing from this run.
   - **Cause, proven from the log:** Menil and Cincinnati refused every page (blocked). MAM's server answered every
     page with a server error. The Louvre's past pages failed with a server error; its current page loaded but held
     no exhibitions. The Accademia's site never answered.
   - **Cause, guess:** whether the Louvre's current page has changed — its current exhibitions page would settle it.
   - **Fix:** nothing to change in code. Re-sweeping these five is your call.
2. **Tate Modern events taken as exhibitions.**
   - **What:** 15 rows that are events for shows already in the run: "Relaxed Hours: …", "Members Hours: …",
     "Members Private View: …".
   - **Cause, proven:** Tate's exhibitions-only listing now lists these events, and each row's text says "these events".
   - **Fix:** a Tate recipe rule dropping them, tested on this run's rows.
3. **The Wallace's current shows are gone.**
   - **What:** Winston Churchill: The Painter, Metamorphoses (Rachel Kneebone), Cosimo I de' Medici — all running or
     newly opened.
   - **Cause:** proven from the log — the current listing loaded but the recipe found no links in it. Guess — the site
     changed the page's layout; its current exhibitions page would settle it.
   - **Fix:** a recipe fix to where the Wallace recipe looks for links on that page.
4. **Brera's info block still gets through.**
   - **What:** Giorgio Armani. Milano, per amore still ends "When … Hours Tuesday to Sunday: 8:30 a.m. …".
   - **Cause, guess:** on this page the labels are not in the bold-label form the stop rule looks for; that show's
     page would settle it.
   - **Fix:** a recipe fix to Brera's stop rule.
5. **Junk in summaries.**
   - **What:** ticket lines or prices — Zurbarán (ng), Magnifico 1492 (uffizi, new); funder lines — Ink
     (tate-modern, new this run), Art Now: Hylozoic/Desires (tate-britain); hours — Yves Klein and the Tangible World
     (lgd); map junk ("… 1010 Wien Google Maps arrow_outward") — 5 KHM rows, including the new Dürer and Toivonen.
   - **Cause, proven by comparing with the last run:** each line is in the page text and no rule cuts it; all except
     Magnifico, Ink and the two new KHM rows were already there last run.
   - **Fix:** a rule per venue (KHM address and map line; Tate funders; National Gallery tickets; Uffizi prices;
     Lévy Gorvy Dayan hours), each tested on this run's rows.
6. **The V&A's Punk to Pop closing date.**
   - **What:** the run now says Punk to Pop runs one week (13–21 Mar 2027).
   - **Cause, guess:** the date comes from the page's hidden data and has changed there; the visible page has none.
   - **Fix:** none until that page is seen.

Say which faults to fix.

Next: your home sweep, then stitch and compress.
