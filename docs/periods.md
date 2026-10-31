# Period — exhibitions in art-period order

**Merged into her app at 51** (her sign-off after stage 3); trial branch `claude/period-sort`. Tests: `period_sort.js` (PS-),
`period_render.js` (PR-), screen group (`scraper/run_tests.js`). Her load of the test page's ledger into 51 confirms (CLAUDE.md §2.2.9).

## Open

- **OPEN — *Hidden Faces* (Met) should be Early Renaissance; no fix yet** that does not move other shows (tried: "Italian and Northern art of
  the same years: the Italian period" gave High Renaissance by date; "…of the 15th and 16th centuries: Early Renaissance" was right but
  tested beside other changes; "Early" for a show spanning Early and High with no heart was mostly Northern). Three shows she says were right drift under the current rules: *Zaragoza's
  Retablo* (International Gothic → Miscellaneous Historic), *Spranger* (Mannerism → Northern), *Jousting Armor* (fixed by her decision
  "anything that fits a non-miscellaneous group goes there").
- **A card whose one line gives no date or place drifts** (*To the Holy Sepulcher*, Frick): she leaves such cards to Relabel and the
  bins. **Flagging unsure labels for her review** (her plan: many flags → refine rules, few → let Claude open the page) is not built.
- **Relabelling is selective** (her way of working: a new rule never moves old labels): later rules reach a labelled show only when she
  relabels it. If she ever relabels everything, a session saves the labels first and gives her the changes in the session.

## Her design

- **A sort called Period**, the third sort chip after Venue (her decision), a divider naming each group; a second tap reverses, as
  Date does. **Every venue is labelled and shown** (stage 3; `PERIOD_VENUES` removed). **Recently labelled** (her ask) is a sort on the
  Sort line and a filter on the Showing line after Dismissed: bands "This labelling", "Earlier labellings", "Stage 1", "Not
  labelled"; a Label run or import stamps `labelledAt`, a Relabel stamps `relabelledAt` (its show stays in its run for the filter,
  goes to the top for the sort). Label asks only shows not yet labelled; a faulty card is fixed by Relabel on that card (her choice).
- **Order:** the group's place in `PERIODS`; within a group, response shows last, then the year of the art (never the exhibition's
  dates), then her venue order.
- **The list's order is her centre-of-gravity rule:** Italy first only where two periods compete (Northern Renaissance after Early,
  before High Renaissance), then the North (Flemish, then Dutch), France from Louis XIV to the 1940s, America after the war; a
  region's periods sit after the dominant region's of the same time (Late Venetian after Rococo). Her reorder: Georgian Britain
  between Late Venetian and Neoclassicism; Belle Époque and Aestheticism before Symbolism and Art Nouveau; Postwar Europe after
  Abstract Expressionism, before Pop; Postwar America (America only, c. 1945–1980, outside Abstract Expressionism and Pop) after
  Postwar Europe, before Pop. Victorian Britain and 19th-century America stay after Symbolism (her decision). Names and dates are the
  model's knowledge; she judges by eye.
- **Groups after Contemporary, in her order:** Surveys, Miscellaneous Historic, Miscellaneous Modern, Non-Western Art. Miscellaneous stays as small as possible (her decision): General 19th Century and General 20th Century (after Pop, before
  Contemporary; c. 1900–1980, self-taught and folk art included) hold shows outside any movement. No kind of show is named as Misc;
  Claude's Misc answers stand (code splits them at 1900 only) (PS-009, PS-021). **Both Miscellaneous groups should ultimately be
  deleted (her view)**; bins for now.
- **A show split evenly between neighbouring periods, with no one heart, goes to the earliest** (her decision; Ingres and Delacroix
  → Neoclassicism). **Postwar Europe is a time-and-place period, not a movement** (her wording in the prompt, 56.4; PS-027): European art of c. 1945–1980 whatever its style, unless a more specific group fits; the General 20th Century catch-all says so too. Claude had read it as a movement and sent late Chagall (Pompidou 1945–1970, Nice 1966–1985) to General 20th Century. American work of those years outside a movement is General 20th Century.
- **Tudor / Stuart Britain** (her period), straight after Northern Renaissance by its 1485 start (her decision: the list sorts by
  start date; long periods overlap later ones), c. 1485–1714; Georgian Britain starts at 1714. A show about an artist's English
  years goes there and keeps it against the one-artist rule (code, PS-020); a general retrospective stays in the artist's home period.
- **Surrealism / Dada** (her name) sits between Early Modernism and Interwar Modernism, which keeps every other style of those years;
  old Interwar labels sort under Interwar Modernism until asked again (`PERIOD_RETIRED`; PS-017–018).
- **The period scrubber (her design):** hidden; a hold (a third of a second) on a narrow band in the middle of the right edge opens a
  ruler of every period in view at once, rows 15.5px apart, nothing scrolling inside; the picked name bulges in place (18px, bold, dark
  pill) on a pale panel as wide as its widest name bulged; sliding picks, lifting jumps to its divider; a swipe that moves first is an
  ordinary scroll (PR-023–031).
- **Rules Claude follows** (`periodPrompt`): a movement's group only for a show about that movement or its artists; a modern artist
  responding to older art, or a pairing across periods, goes under the older art (response, placed last); a long-span show goes to its
  heart, the period most of its works come from — Surveys only when the works spread with no heart; ancient art from anywhere is
  Antiquity; non-Western art that is not ancient is Non-Western Art. A show responding to one older source takes the period most of its
  works come from, marked a response (her decision; PS-024) — not the source's own period. Do not label shows by their staging (her
  words: a sculpture show in a garden is not Nature, paintings among drapery is not Decorative Arts); Nature is not labelled because a
  show is displayed outdoors (Noguchi; Constable's *views of nature* is right, *The Book of Marvels* under Animals stays, her
  decisions). Kept as labelled (her decisions): Diaghilev's Fashion, the Little Dancer's Sculpture, *Jazz* as Books; Orientalism in
  Realism and *Making It Modern* in Symbolism and Art Nouveau are right; Sargent and Whistler belong in Belle Époque and Aestheticism.
- **Themes (her design):** a kind of thing is a label, never a group — every show sits in its period and Claude gives it any number of
  themes (`THEMES`, each rule in the prompt): Fashion (cloth made for clothes included, her decision), Jewellery, Architecture,
  Sculpture, Animals (mythical creatures included), Nature (trees, plants, botanical drawings, gardens, clouds — not landscape, still
  life or animals), Photography, Decorative Arts – Hard (furniture, ceramics, glass, silver; not books), Decorative Arts – Soft
  (wallpaper, carpet, textiles, soft furnishings, interior design; the catch-all for "decorative arts"), Books (rare books, albums
  — "a collector's book of drawings or prints, bound together" — and illuminated manuscripts; PS-023), Capriccio (Hubert Robert,
  Panini) and Veduta (Canaletto, Piranesi's *Vedute di Roma*), the last two under the Architecture chip and always with Architecture
  (told to Claude and added in code; her decision; PS-019). A decorative-arts show naming its kinds gets each kind's theme. Interior was
  dropped (her decision). **Chips under Venue**, her names and order: Fashion & Jewellery (two labels, one chip) · Architecture ·
  Sculpture · Animals · Nature · Photography · Decorative Arts – Hard · Decorative Arts – Soft · Books · Ex-themes (every labelled show
  with no theme, Surveys and Non-Western Art included; a show never asked about themes is under no chip). Chips work as the Venue row
  does (any within the row; rows combine). Themed shows take the period whose years and place hold the work (a prompt line, keeping
  them out of Miscellaneous). PS-012–014, PR-017–022.
- **Code decides, not Claude:** a straggler's group by its year; one artist, one group — a show about one artist takes the group most
  of that artist's shows were given, a tie to the earlier (at sort time; her decision: no hard-coded artist). Ledger fields are in CLAUDE.md §5.1.
- **Do not regroup** (her design, 56.3; PS-026, PR-038–040): the rule is for small stragglers (a late Titian read as Baroque); an
  artist who genuinely spans periods is her call, case by case. When a Relabel's readout says "shown with … other shows", a "Do not
  regroup" button sits next to Relabel and goes with the readout. A tap keeps Claude's answer (`periodKeep`) and the line becomes
  "Relabelled: <label> — no regrouping." It holds until that card's next Relabel, which clears it (no memory). The kept show still
  counts in its artist's tally. Remembering artists never to regroup is undecided (her decision: case by case for now).
- **When labels are written:** Label (footer, beside Clear search) fills every show with no period or no themes, dismissed included,
  40 a question, and never relabels; failed batches wait 15 seconds then a minute (her decision; `LABEL_WAITS`, `labelWhy`; PS-015–016). An import labels each new show on its
  approval card ("Period: …"). Relabel, at the foot of a card's drawer, asks again about one show.
- **Claude's reason** (her ask; PS-025): each label carries `why`, one sentence, kept only in the lookup log. **Every question to Claude is asked afresh, never a replayed answer** (her Metamorphoses Relabel; PR-037). **No hand corrections**
  (her decision): a wrong label is reported and fixed in the rules. **Every run is checked:** her line after Label says all labelled
  or how many were not and why; each Label, import labelling and Relabel is one lookup-log record.
