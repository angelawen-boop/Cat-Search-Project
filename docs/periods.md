# Period — exhibitions in art-period order

Her trial: code on `claude/period-sort`, published only to its own test page, never her app until she
says. **Test page:** https://claude.ai/artifact/JeoJyWxJbU9RApY9q4sVni ("Cat Watch Period Test",
footer "version 1.3"; its own store, separate from her app — `node build/build_app.js` on the branch
builds it and prints the steps). Tests: `period_sort.js` (PS-), `period_render.js` (PR-), listed in the
branch's `scraper/fixtures/branch_tests.txt`.

## Open

- **Her review of v1.2 is pending.** She re-Loads her file (no labels) and presses Label, then checks
  the groups v1.2 changed: Surveys, General 19th Century, Late Venetian, Belle Époque and Aestheticism,
  Decorative Arts, Architecture. v1.1 was ~90–95% right by her eye; v1.2 was "most of the way there".
- **v1.3 published: her reorder and the Venice fix.** Her rule "names in a period's description stand
  for shows about those artists" and Emily Sargent named in Belle Époque: on her cards *Impressions of
  Venice* goes to 19th-century America, the Sargent, Emily Sargent and Whistler shows stay in Belle Époque.
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
- **How theme groups are handled will change** (her new idea, for a new session): groups that are a
  kind of thing rather than a time — today Decorative Arts and Architecture, possibly Surveys and the
  rest after Contemporary. Ask her for the idea before touching them.
- **Next, after her review:** widen from the seven trial venues to her whole ledger (a one-line change,
  `PERIOD_VENUES`), then test the import labelling with a fake sweep CSV and her own links and pages.
  Merging into her app is her call, after that.

## Her design

- **A sort called Period**, after Recently edited: shows with a period at the trial venues, not
  dismissed, with a divider naming each group. A second tap reverses, as Date does.
- **Trial venues (her choice):** the Met, NG UK, Orsay, Accademia (Venice), V&A, Tate Modern,
  Cincinnati — `PERIOD_VENUES`.
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
- **Groups after Contemporary, in her order:** Surveys, Decorative Arts, Architecture, Miscellaneous
  Historic, Miscellaneous Modern, Non-Western Art. Miscellaneous stays as small as possible (her
  decision) — General 19th Century keeps 19th-century shows outside any movement in their place in time.
- **Rules Claude follows** (`periodPrompt`): a movement's group only for a show about that movement or
  its artists; a modern artist responding to older art, or a pairing across periods, goes under the
  older art (response, placed last); a long-span show goes to its heart, the period most of its works
  come from — Surveys only when the works spread with no heart (five centuries of cats); ancient art
  from anywhere is Antiquity; non-Western art that is not ancient is Non-Western Art.
- **Code decides, not Claude:** Miscellaneous splits at 1900; decorative arts and architecture leave
  their period from 1800 (Claude says the kind, code applies the cut-off; older pots and tapestries
  stay with their period); one artist, one group — a show about one artist takes the group most of
  that artist's shows were given, a tie to the earlier group (worked out at sort time, never written
  in; her decision: no hard-coded artist).
- **Ledger fields:** `period`, `periodYear`, `periodResponse`, `periodArtist`. Not her edits: `editedAt`
  is untouched. Nothing new in the CSV — the app is the one labeller, for sweeps, links and pages alike.
- **When labels are written:** Label (footer, beside Reset search) fills every show at the trial venues
  with no period, dismissed included, 40 a question, and never relabels. An import labels each new show
  on its approval card ("Period: …"). Relabel, on its own line at the foot of a card's drawer, asks
  again about one show and says the result there.
- **No hand corrections (her decision):** a wrong label is reported and fixed in the rules, so the app
  learns.
- **Every run is checked:** a failed batch is asked once more; her line after Label says all labelled,
  or how many were not and why; each Label, import labelling and Relabel is one record in the lookup
  log (read it with ArtifactData on the test page, then `node build/lookup_log.js`). v1's three silent
  failed batches (120 shows, the Met's *Siena* among them) are why.
- **Settled cases:** Orientalism in Realism and *Making It Modern* (ceramics 1880s–1910s) in Symbolism
  and Art Nouveau are right; Sargent and Whistler belong in Belle Époque and Aestheticism.
