# Period — exhibitions in art-period order

Her trial: code on `claude/period-sort`, published only to its own test page, never her app until she
says. **Test page:** https://claude.ai/artifact/JeoJyWxJbU9RApY9q4sVni ("Cat Watch Period Test",
footer "version 3"; its own store, separate from her app — `node build/build_app.js` on the branch
builds it and prints the steps). Tests: `period_sort.js` (PS-), `period_render.js` (PR-), listed in the
branch's `scraper/fixtures/branch_tests.txt`.

## Open

- **v3 published: stage 3, the whole ledger** (her decision, after signing off stage 2). Every venue, link
  venues included, is labelled and shown by Period; no venue list is left (`PERIOD_VENUES` removed). Label
  asks only shows not yet labelled; she reviews with the Recently labelled filter. Before stage 3 her main
  app's ledger and the test page's were compared by script: the same 1,029 shows, three marks apart, which she
  settled by hand. Bringing the labels into her app later is a script's job: copy them by show id onto
  whatever her main ledger holds then.
- **v2.2 published, her review pending:**
  Tudor / Stuart Britain, General 20th Century, Capriccio and Veduta, and Nature's garden line ("do not
  label Nature just because the show is displayed outdoors or in a garden" — Noguchi; Constable's *views of
  nature* is right, and *The Book of Marvels* under Animals stays, her decisions). They reach a labelled
  show only when she relabels it — she relabels selectively, card by card (her way of working: a new
  rule never moves old labels).
- **v2.1 published: stage 2, her review pending.** Eleven venues added, picked for kinds of show the first
  seven lacked: MAD, Morgan, British Museum, Menil, Rijksmuseum, Uffizi, Capodimonte, Borghese, Louvre,
  Tate Britain, Wallace. She taps Label (it asks only the new venues' shows) and reviews them under
  **Recently labelled** (her ask; the fourth "recently" sort, copied from Recently added): bands "This
  labelling", "Earlier labellings", "Stage 1" (labelled before the sort existed), "Not labelled". The band
  names are Claude's, copied from the import's pattern. 2.1 adds a **Recently labelled filter** (her ask), on
  the Showing line after Dismissed: only the newest Label run or import, so it works with Period. A Label run
  or import stamps `labelledAt`; a Relabel stamps `relabelledAt` instead, so its show stays in its run for the
  filter and goes to the top for the sort. A faulty card is fixed by Relabel on that card (her choice); if she ever relabels
  everything, a session saves the labels first and gives her the changes in the session, not in the app.
  Stage 3 is the rest of the ledger. PS-004, PR-032–034.
- **v1.8 published: the scrubber on a pale panel with a bulging pill, her check pending.** On her Pixel 7
  Pro the whole timeline fits (1.7); the see-through look was hard to read and her thumb hid the names, so
  the picked one bulges (her design; a big name off to the side she found intrusive).
- **Her later consideration — bigger scrubber text and wider line spacing**, if widening this test page
  to the full ledger does not add many more period headings (the list holds 39 at most). Her shows labelled Interwar before the split show there
  until she taps Label, which asks only those again.
- **v1.4–1.5 published: themes as labels, her review pending.** Her 1.4 Label labelled every show in one
  run, themes included. She checks the theme
  chips and where the former theme-group shows landed — the likeliest mess is a 20th-century design or
  fashion show with no period of its time, falling into Miscellaneous Modern (a guess; her run shows it).
  Each run still needs her check on the waits: the lookup log shows whether the retries landed.
- **OPEN — *Hidden Faces* (Met) should be Early Renaissance; no fix yet** that does not move other shows.
  Tried: "Italian and Northern art of the same years: the Italian period" (→ High Renaissance, by date);
  "…of the 15th and 16th centuries: Early Renaissance" (right, but tested beside other changes);
  "a Renaissance show spanning Early and High with no one heart: Early" (mostly Northern). Three shows she
  says were right before now drift under the current rules: *Zaragoza's Retablo* (International Gothic →
  Miscellaneous Historic, Claude dating it c. 1470), *Spranger* (Mannerism → Northern), *Jousting Armor*
  (Northern, once Miscellaneous); her rule "anything that fits a non-miscellaneous group goes there" fixed
  only the armor.
- **Flagging unsure labels for her review** (her plan): before Claude opens pages, unsure answers are
  flagged for her; many flags → refine rules, few → let Claude open the show's page. Not built.
- **The plan to widen (her decision), in this order:** (1) themes as labels (built, 1.4); (2) widen in steps (`PERIOD_VENUES`), adding venues
  chosen for being *different* from the seven (e.g. Rijksmuseum, Italian venues, Menil, Wallace, Louvre),
  not the whole ledger at once, and fix the rules on what each step shows; (3) when a step brings few new
  kinds of mistake, add the rest of the ledger as the last check (about 700 shows she reviews — dismissed
  shows are labelled, she does not review them). **Each review round shows only what changed since the
  last labelling** (her decision; not built), never the whole list. Then test the import labelling with a
  fake sweep CSV and her own links and pages. Merging into her app is her call, after that.
- **Label stopping part-way — built at 1.4, her runs confirm.** The page's Claude refuses in spells
  (`upstream_error`, "request failed" / "the connection was lost") and answers again minutes later; the
  old retry asked at once, inside the spell. Now a failed batch waits 15 seconds, then a minute (her
  decision), and every batch still unlabelled gets one last go after a minute (`LABEL_WAITS`). Label has
  its own lines (`labelWhy`): "Claude didn't answer (code).", "Claude's answer came back unreadable.",
  "You declined to let this page use Claude." — never the lookup's "search results". PS-015–016, PR-013.

## Her design

- **A sort called Period**, the third sort chip, after Venue (her decision): shows with a period at the trial venues, not
  dismissed, with a divider naming each group. A second tap reverses, as Date does.
- **Venues, in stages (her choice):** stage 1 the Met, NG UK, Orsay, Accademia (Venice), V&A, Tate Modern,
  Cincinnati; stage 2 the eleven above; stage 3 every venue.
- **Order:** the group's place in `PERIODS`; within a group, response shows last, then the year of the
  art (never the exhibition's dates), then her venue order for a tie (two Monet shows).
- **The list's order is her centre-of-gravity rule:** Italy first only where two periods compete
  (Northern Renaissance after Early, before High Renaissance), then the North (Flemish, then Dutch),
  France from Louis XIV to the 1940s, America after the war. A region's periods sit after the
  dominant region's of the same time (Late Venetian after Rococo). Her reorder on review of v1.2: Georgian
  Britain between Late Venetian and Neoclassicism; Belle Époque and Aestheticism before Symbolism and Art
  Nouveau; Postwar Europe after Abstract Expressionism, before Pop. Victorian Britain and 19th-century
  America stay after Symbolism (her decision: she declined moving them beside Romanticism and Realism). Names and dates are the model's knowledge, not hers;
  she judges by eye.
- **Groups after Contemporary, in her order:** Surveys, Miscellaneous Historic, Miscellaneous Modern,
  Non-Western Art — shows that cannot file in the chronology, so groups, never themes. Miscellaneous stays as small as possible (her
  decision) — General 19th Century keeps 19th-century shows outside any movement in their place in time,
  General 20th Century (after Pop, before Contemporary; c. 1900–1980, self-taught and folk art included)
  the 20th century's. No kind of show is named as Misc; Claude's Misc answers stand (code splits them at
  1900 only), so the bins show what no rule yet files (her decision; PS-009, PS-021). **Both Miscellaneous
  groups should ultimately be deleted (her view)**; kept for now as bins while the filing is refined.
- **A show split evenly between neighbouring periods, with no one heart, goes to the earliest** (her
  decision; Ingres and Delacroix → Neoclassicism, not General 19th Century). **Postwar Europe is Europe
  only** — Kentucky's Lexington Camera Club (Cincinnati) went there because its description gave only the
  dates (lookup log); American work of those years outside a movement is General 20th Century.
- **Tudor / Stuart Britain** (her period), straight after Northern Renaissance, by its 1485 start (her
  decision: the list sorts by start date; long periods overlap later ones, as Dutch Golden Age does Italian
  Baroque). c. 1485–1714; Georgian Britain starts at 1714 (George I), so they meet. A show about an
  artist's English years (Holbein at the Tudor court, Van Dyck in England) goes there; a general
  retrospective stays in the artist's home period (Northern Renaissance, Flemish Baroque) — and an
  English-years show keeps Tudor / Stuart against the one-artist rule (code, PS-020).
- **Flemish Baroque** exists; no stage 1 or 2 show has landed there — she checks it in stage 3.
- **Surrealism / Dada** (her name), between Early Modernism and Interwar Modernism; Interwar Modernism keeps
  every other style of those years. A show labelled under the old Interwar key sorts under Interwar
  Modernism until Label asks it again (`PERIOD_RETIRED`; PS-017–018).
- **The period scrubber (her design):** hidden; a hold (a third of a second) on a narrow band in the
  middle of the right edge opens a ruler of every period in the view at once — her mock-up A, rows 15.5px
  apart, nothing scrolling inside (ten at a time she found stressful); fewer periods make a shorter ruler,
  never wider spacing. Names as written, 10px; the picked one bulges in place — 18px, bold, in a dark pill, its row
  opened to 28px — and goes back as she moves on; the pick is read from the rows before the bulge. The
  ruler sits on a pale panel always as wide as its widest name bulged (PR-030–031). Sliding picks;
  lifting jumps to its divider. A swipe that moves first is an ordinary scroll. ↑ ↓ unchanged.
  PR-023–029.
- **Rules Claude follows** (`periodPrompt`): a movement's group only for a show about that movement or
  its artists; a modern artist responding to older art, or a pairing across periods, goes under the
  older art (response, placed last); a long-span show goes to its heart, the period most of its works
  come from — Surveys only when the works spread with no heart (five centuries of cats); ancient art
  from anywhere is Antiquity; non-Western art that is not ancient is Non-Western Art.
- **Themes (her design):** a kind of thing is a label, never a group — every show sits in its period, and
  Claude gives it any number of themes (`THEMES`, each with its rule in the prompt): Fashion, Jewellery,
  Architecture, Sculpture, Animals (mythical creatures included), Nature (trees, plants, botanical
  drawings, gardens, clouds — not landscape, still life or animals), Photography, Decorative Arts – Hard
  (furniture, ceramics, glass, silver; not books or manuscripts), Decorative Arts – Soft (wallpaper, carpet,
  textiles, chintz, soft furnishings, interior design; the catch-all when a show says only "decorative arts";
  not dress silks or other cloth for clothes), Books (rare books,
  collections, illuminated manuscripts), Capriccio (architectural fantasy of ruins — Hubert Robert, Panini)
  and Veduta (accurate topographical views — Canaletto, Piranesi's *Vedute di Roma*): labels of their own,
  under the Architecture chip, and always with Architecture too — told to Claude and added in code (her
  decision; PS-019; built after 2.1, published at 2.2; shows labelled before keep their themes until Relabel). Cloth made for clothes is Fashion (her decision). A
  decorative-arts show naming its kinds gets each kind's theme. A theme row of chips under Venue, her
  names and order: Fashion & Jewellery (two labels, one chip, so she can regroup later) · Architecture ·
  Sculpture · Animals · Nature · Photography · Decorative Arts – Hard · Decorative Arts – Soft · Books ·
  Ex-themes. Ex-themes is every labelled show with no theme, Surveys and Non-Western Art included. Chips
  work as the Venue row does (any within the row; rows combine). A show never asked about themes is
  under no chip, Ex-themes included. Interior was dropped (her decision). Themed shows take the period
  whose years and place hold the work, even when not about that movement's artists (a prompt line, to
  keep them out of Miscellaneous). Every theme has a chip, so the chips and Ex-themes together hold the whole
  Period view once a show is labelled with themes (her 1.4 run: every show in one or the other; PR-022).
  PS-012–014, PR-017–022. The two "not" clauses published at 1.5; shows labelled at 1.4 keep their themes until Relabel.
- **Code decides, not Claude:** a straggler's group by its year (above); one artist, one group — a show about one artist takes the group most of
  that artist's shows were given, a tie to the earlier group (worked out at sort time, never written
  in; her decision: no hard-coded artist).
- **Ledger fields:** `period`, `periodYear`, `periodResponse`, `periodArtist`, `themes` (a list), `labelledAt`, `relabelledAt`. Not her edits: `editedAt`
  is untouched. Nothing new in the CSV — the app is the one labeller, for sweeps, links and pages alike.
- **When labels are written:** Label (footer, beside Reset search) fills every show at the trial venues
  with no period or no themes, dismissed included, 40 a question, and never relabels. An import labels each new show
  on its approval card ("Period: …"). Relabel, on its own line at the foot of a card's drawer, asks
  again about one show and says the result there, its themes after the year.
- **No hand corrections (her decision):** a wrong label is reported and fixed in the rules, so the app
  learns.
- **Every run is checked:** a failed batch is asked again after a wait (above); her line after Label says all labelled,
  or how many were not and why; each Label, import labelling and Relabel is one record in the lookup
  log (read it with ArtifactData on the test page, then `node build/lookup_log.js`). v1's three silent
  failed batches (120 shows, the Met's *Siena* among them) are why.
- **Settled cases:** Orientalism in Realism and *Making It Modern* (ceramics 1880s–1910s) in Symbolism
  and Art Nouveau are right; Sargent and Whistler belong in Belle Époque and Aestheticism.
