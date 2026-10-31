# Add by link — design, decisions and venue link rules

**Her design; signed off at 39.5.** Code: "ADD BY LINK" in `Cat_Watch.jsx`; test `scraper/fixtures/add_by_link.js` (AL-).
The app handles unreadable links itself; no scraper-side reader. Why it exists: some venues matter only now and then
(~5 shows a year); a full venue costs a recipe, an archive and a monthly sweep, and ~27 of ~30 rows get dismissed.

## Code or Claude — the four buckets (her decision)

**Why code first.** The sweep went to a scraper, not a session told to go and fetch the shows, for two reasons: code is
plainly right or plainly wrong, while Claude needs instructions, checking and can make things up; and many pages need a
headless browser Claude cannot run. So code does the work, and Claude is the backup for what code cannot do. Never start by
handing a job to Claude.

**Where the line falls — what the text arrives as:**
1. **A venue the app already knows** (the 28, or a link venue a session has already fixed): code, by the shared rules and that
   venue's own. This bucket grows with every fix, so imports come in right more and more often.
2. **A venue the app has never seen, by Links or Pages:** code, today. About half need a session's fix (title or dates
   misread); each fix adds a shared or venue rule, so the reader covers more over time. **Her option to flip it:** if the fixes
   never end or the code becomes a tangle, Claude reads the title and dates for every never-seen venue instead, with code
   checking them as Paste does. Not built; hers to call.
3. **Someone else's page** (a blog, a library, a magazine): Claude, built. The text is about a show held elsewhere, so code
   would read it as the site's own — Claude names the venue and the title ("Someone else's page", below).
4. **Paste: Claude for title and dates, always** (built at 56). Pasted text has no page layout for the reader to work with,
   and a paste can be her own tidied copy or scraps from several sources dumped in — code cannot tell which, and does not know
   when it has picked the wrong first line. Claude reads both kinds as easily. Code keeps the guard: Claude's title must be in
   the text word for word, and Claude copies the date words, which code checks are there and reads into dates. No extra
   call — the same one that writes the description.

## The design

- **Import opens ONE small pop-up, nothing added to the page** (her design): **CSV · Links** (and **Pages**, **Paste**, below), a small
  **Cancel**. Links = the box and **Read**, with a progress bar; links separated any way; a repeat read once. The review opens
  when reading ends; the pop-up waits under it if a link failed.
- **Then the shop screen** (her design): with a card going in from a venue outside her 28 whose shop is unconfirmed, the
  review's last button is **Next** → one card per such venue: **Confirm · Look again · No shop · Add**, always that order.
  **Add** (her ask) opens an empty box; her link, taken on Enter or on leaving the box, is the confirmed section (Escape
  closes it; words that are not a link are not taken); its search is worked out at the venue's first lookup. AL-080. Only a
  venue with a card going in is asked (her decision; `venuesGoingIn`, AL-046). **The ledger moves only when every one is
  answered.** Back returns to the review. Confirmed once, never asked again. An answer is stored only for a venue with a
  show going in (her decision; `answeredOnly`, `beforeAnswer`; AL-009o2, AL-046f).
- **The ordinary review:** each link becomes a pro forma row fed to the existing intake (Add / Fill / Change / Reject /
  quarantine). **An import she does not finish keeps NOTHING** (new venues, shops, answers, a CSV's sweep log): Cancel import
  drops them, Back keeps them; a file or Read with nothing to propose counts as finished.
- **A link it cannot read is a line, never a card** — the full link and why. Unread links stay in the paste box (stored when
  the import finishes) until read or cleared ("Clear" empties box and store). **Links come back to the box** (her decision):
  a rejected card's, an undecided card's after a partial apply, and on Cancel import every link the Read took (AL-012c, AL-024).
- **No lookback cutoff** for anything added by link (her decision). **Chip: one "Occasional"** for every venue added this way
  (her decision), each venue keeping its own name and shop behind it. A link to a venue already swept files under that venue.
- **One entry per venue — `LINK_VENUES`** (her decision): own chip, group, short and card names, full and lookup names, other
  sites (`sites`: a path on a shared site, a house `line`), link options, shop settings. What the app finds out sits in the
  store and the entry wins (`occVenue`). Never a second table for one of these facts. Store: `venues/occasional` (venues,
  shops, confirmations) and `links/pending` (the box). A ledger row whose venue a page's store has not met shows under its
  web address, shop "not found".
- **A venue not met before is named by Claude** (her decision), on its first link only, in the same call as its description:
  full name, other names (acronym, own-language), city and country, a short card name in her style (AL-053); `englishSpeaking`
  and `gallery` are asked with every link and kept. A venue stored by address only is asked once more (`namedByAddress`,
  `needsFacts`). Never written in by session except by the rename below.
- **The card name shows on both screens** (her decision): `card`, else `short`, never the long search name. **Search name long,
  card name short** (her decision): the shop search uses full name, other names, city, country (`venueSearchName`).
- **Renaming a link venue Claude named — a session's job, and Claude learns from it** (her decision: no editing in the app).
  Write its `LINK_VENUES` entry: her `card` and `notCard` (what Claude gave); `short` and `name` stay as they are, so chips
  and shop searches do not move. Renames go into Claude's question as "for <full name>: <her name>, not <Claude's>", the
  full name from the entry or the store (`SHORT_NAME_RENAMES`, AL-066). **Her style** (her review of every link venue, 56.2):
  the venue's own name first, then its city ("Städel Frankfurt", "Reina Sofía Madrid"), never a comma, every accent the venue
  uses. To review again: a page listing each venue (card, full names, city, a box for hers) — her rename page,
  `https://claude.ai/artifact/RmSC86pu1rkBxsZDtfdA1J`, its store `renames`.
- **Christie's press site is Christie's** (her decision, 56.2): `press.christies.com` links file under `occ-christies-com`
  (`sites`); rows already in stay under the press venue (her decision: no ledger move). AL-066b.
- **The Royal Collection's venue (`rct.uk`) holds every Queen's Gallery**: her name "Queen's Gallery Edinburgh" heads its
  London shows too (AL-052d).
- **A Wayback Machine copy files under the museum it copied** (her decision): the venue, its shop and the title's site name come from
  the address inside the copy; the copy is what is read and linked (`siteUrlOf`; AL-037).
- **A new venue's shop** (her decision): the **exhibition-catalogues section**, else the museum's publications, else books — never
  one book, a post, or a section mixing books with other goods (a mixed section is opened and a books-only section inside it
  taken); the front page only when it sells books and there is no books section (the shop finder, rule 3). Nothing found is stored
  until the import finishes.

## Per link — code first, model only for prose

1. One page read (`fetchPage`, `full`).
2. **Title = what the catalogue would be called** (her decision): the page's title, site name stripped; subtitles and split
   headings kept; in the museum's language.
3. **Dates:** the first range after the show's heading, by the scraper's own date reader (`dates.js`, shared, never copied).
4. **Description by the model** (`modelTier: default`, her decision), the compression prompt shared not copied. **Any non-English
   page comes out in English; a non-English title gets its translation first** (`In English: "…".`, every language, her
   decision), recased as the title is (`cardTitle`, AP-012b).
5. **Claude's answer is checked as the compressor's** (`answerFaults`, shared `scraper/answer_check.js`): shape, and every claim
   word and number on the page. A refused answer is asked again with its reason, twice at most (`LINK_ASK_AGAIN`); one that
   never passes leaves the link unread: "Claude's description failed check and re-attempt multiple times (…)", faults in the
   brackets (her wording; AL-062).
6. No note — a link is not a sweep; `swept_at` blank, sweep log untouched.

## The shop finder — her design

**One right section per shop: the finder finds it, or says it could not.** Never "the best of whatever the search returned"
(her words: you go out for capsicum; if you can't find it you are looking in the wrong place, or it doesn't exist). Steps:
1. **Search** "<long museum name> shop exhibition catalogues". A result is taken at once only if its own name carries both a
   catalogues word and an exhibitions word (or it is the venue's own section on a shop company's site, CEDON); a lesser one
   is kept as the best so far.
2. **Otherwise walk the shop**: Parallel does not click, so each step fetches one address and code reads the link labels. Open
   the front page, check its section links, then the best section link not yet opened — **four page opens at most** after the
   search. Only when the shop truly has no catalogues section is the best section seen taken, and the screen says **"Shop found,
   but not its catalogues section"** (her wording; one line for every such case, nothing about what was taken instead).
3. **No books section but the front page sells books → the front page is the shop** (the gallery path's rule, carried to museums
   at her decision), confirmable (`shelfKind: "front"`; AL-078). A front page selling only gifts or tickets stays as in 4.
4. **Where it cannot work it says so** ("Shop found, but not its books section"): a menu drawn by script, a page Parallel
   cannot fetch (bot check, 202, "301 Moved"). Else "No museum shop found." / "Search failed." — **a miss is a finder bug, fixed
   in code: she never pastes a shop link** (her decision).
   For a venue in a non-English country, an English catalogues section the finder cannot read is offered beside the foreign one;
   her pick reads **"The museum shop contents cannot be seen — unconfirmed page problem"** (her wording; that scenario only).

Rules built in: **an exhibition-catalogues section that also sells the shows' goods counts** (her decision; Thyssen's
"Exposiciones": two priced books suffice; every other section stays books-only). A pick is opened and must read as books with
prices, or its first product must read as one book with a price (her decision, lists of titles only: `firstProductIsBook`,
AL-042, YS-001–005). A Shopify section under a translated address is found by its number in the shop's section list and read
there; a Shopify section with no books on its page is judged on `products.json` (`shopifyShelfIsBooks`, AL-033); a list of 250
sections is read on to four pages. A shelf whose label is the museum's own name is its publications (KMSKA). A section whose page
returns no books counts when the shop shows two of its books elsewhere (`booksUnder`, AL-072). A page linked as the shop with no
section links gives way to the shop's front page, never when it has sections (Yale on a shared site, AL-042a). The museum's own
Shop page pointing elsewhere is followed (`shopElsewhere`, AL-034); a Shop button vouches for that page, never the whole site;
a book's address in a menu stands for its section (`menuLinks`). A shop on a shared site (Yale/Touchnet) is read on the exact
page the museum links; a shop page that is one line is reopened once with `page=1` (`openShopPage`); a short page of several
lines never (Louvre, LG-); menu labels read by their first six words. The shared word lists (`SHELF_CATALOGUES`, `SHELF_BOOKS`, `BOOK_WORD`) include German, Danish and Scandinavian
words and franc/crown prices (AL-059). Ranking: an exhibitions' catalogues section first (`SHELF_EXHIBITIONS`, AL-070); "/products/" after a section word is a
section; a shop on the museum's own sub-address is the shop. A section found on a later page is kept by its first (her decision;
`firstPageOf`, AL-063).

**The English version — her design** (a foreign-language shop must not hide the English one). For a venue in a country that does
not speak English: (1) search for the English shop first ("<name> English language shop exhibition catalogues"), the English
result taken, no stacked searches (her decision); (2) landed on a foreign shop, look for its English version — a language link,
else English addresses (`/en/`, `/en-int/`, `/en-gb/`, `/en-us/`, `en.`) in one call — and walk it as the shop was; (3) the English
search finds no shop → the plain search, then step 2; no English version → the foreign section stands. AL-073–073f.
**Known gap — Belvedere stays German** (CLAUDE.md §5.4).

**Right answers, her decisions:** Thyssen — "Exposiciones", not the collection guides she once confirmed; Antwerp — the KMSKA
shelf under Books, as confirmed. **The standing check is strict** (one right answer per venue): `docs/shop_check.json`,
`docs/testing.md`. Evidence: `docs/link_pages/shop_search/`.

**Shelf AND whole-shop search, as the 28 (her decision).** A search is kept only if it finds a book the finder saw
(`proveShopSearch`; AL-008k, AL-014). **Three fallbacks, every venue** (her decision; AL-044): a book whose price sits a few lines
below its title link (not a button, not an empty basket); Shopware's two searches (`search?search=`, `search?sSearch=`) in a second
call; the book found in the results by its title when its address differs — only on a page for that book alone (a page that ignores
the words proves nothing). `SEARCH_RULE`-less venues are proved at their next lookup. **Look again** skips only the pages she turned
down, never the site. **No shop** → lookups go to the web. Venues found by the old finder and never confirmed are looked for again.

**The finder runs in named steps** (`discoverShop` in code; one search call with two queries, hers and "<venue> shop books
publications"). Code ranks every result (museum's own shop site only; plural section words; "not Catalogues" and sale shelves
last). **A site name the reader cannot match to the address
needs a venue rule naming it** (`LINK_VENUES` `name`; Mia). Fixes from Berlin: German joins its words; the shop page that shows
the shop itself links one book first, so the book's site is taken.

**A gallery's shop — her design** (published at 52.1; `docs/gallery_shop_check.json`, `node scraper/gallery_shop_check.js`).
Galleries sell books from a "Publications"/"Publishing"/"Library" page on their own site or a shop on another, rarely called a shop
and never with an "exhibition catalogues" section, so they have their own path (her decision: galleries apart from museums) so no
museum can get worse. Claude says whether a new venue is a gallery (`gallery`); a gallery goes down `galleryShop` first, and the
museum path runs unchanged when it finds nothing. Steps, each only if the one before found nothing: the show page's links (Shop,
Store, Books, Publications, Publishing, Library; never "Editions"); the home page, redirects followed; the usual addresses (/shop,
/store, /books, /publications, /publishing and /en/ forms; one landing on the home page proves nothing); a search.
**What counts:** a shop elsewhere is the shop; a page of the gallery's own when it sells books — priced books on it, or one book
opened (the one under a books heading first) showing a price and its make; no cart needed; "80 €" counts on a book's page. A list
read without its links is proved by its books linked from other pages. **Which list — her decision: the NARROWEST section that holds
the catalogues and can be read** — the catalogues section, else the gallery's publications, then books, then the whole shop; lists
of one kind: the smaller first. Never a section of only some books (Selected, New, Rare, Sale…), editions, prints, posters, a tax
copy ("Books Zero Rated UK"), "All Items", or one book's page. A landing page with no narrower section gives way to its "All" list
(Zwirner); a Shopify shop's lists are read to the last page; a shop with no product types → the whole list read as a page, one book
opened; a shop with no books-only list → its front page if it sells books (Mennour). A non-English gallery: the section's English
version by the page's own language link, with the section's own filter, taken when it carries the same titles. Karsten Greve's
Catalogues tab (`?filter=C`) is the whole list read live (the site filters in the browser); it holds the catalogues. **Never "no
shop" for a site that could not be read**: "Search failed". Shared lookup rule: a list of titles without prices is proved books by
its first book under its own address (GK-001–002). Tests AL-076–076j. Right on all 15 galleries.

**A shop drawn by script — her decision.** The finder meets it as a front page only. When she brings one: (1) prove the cause from
the shop page's own code (empty frame and a script → by script; books in the code → our reading is at fault, fix the finder);
(2) write in the best section on the venue's `LINK_VENUES` entry (`shopHome`, `shopCatalogues`) with `shopUnseen: "script"` — a
hard-coded answer, say so to her; (3) its lookups read "The museum shop contents cannot be seen — JS-rendering", search the web,
and the card's "Museum shop" link is the written-in section (`shopLink`, `shopButtonUrl`; BS-004), Re-check the same; (4) if she
already answered No shop, reset the store's record with her yes (`shop: "found"`, the section, `foundBy: "the venue's rule"`,
unconfirmed). **Basel** (`occ-kunstmuseumbasel-ch`) is the first: section `shop.kunstmuseumbasel.ch/en/merchandise?category=Exhibition+Catalogues`
(BS-001–003).

## The general reader — shared rules, venue rules only where needed

Built as the scraper is: one shared reader, a venue entry only for what differs (her decision). **Where the sweep has met a case
and she has decided it, Links and Pages follow the sweep's rule — the same code (`dates.js`), never a rule of their own** (her
decision). Before writing a reader rule, look for the sweep's. A general rule ships only if no proof page gets worse. Code:
`readShowPage`, `splitPageTitle`, `cardTitle`, `DATES.findDateRange`. Tests DS-005–006, AL-054–058, AL-064–065.

- **R1 Site in the page title** — a dash tail that is the site's address is the site (KHM); a separator with no site after it is
  dropped (AL-047); a bar title with the site first takes the other part (AL-057).
- **R2 The heading is the name** — as the scraper (`titleFromPage`). The page title adds only what the page backs: its spelling
  when it reads the same; the line under the heading when the title's extra words are all on it; its subtitle after ". " or ": ".
  Never its dates, site name or another spelling. A heading of generic words, the site's name, or sharing no word with the page
  title gives way to it — unless the page title names the site and the heading does not (AL-056a). AL-056.
- **R2a Generic label** ("Exhibition", "Mostra", "Ausstellung") before the name leaves it (AL-054).
- **R2b The venue's name alone is never the title** (her decision) unless the show's dates sit under it; with no other candidate
  the link fails, never a card (`venueNamesFor`, AL-075a–b). A "##"/"###" heading that is part of the tab title is a title
  candidate before any plain line (AL-075). **Tours are never added** (her decision).
- **R2c Capitals** — a title wholly in capitals is recased unless one short word (`cardTitle`). A swept venue that types titles in
  capitals takes the sweep's rule (`DATES.sweptVenueTitle`, `SWEPT_CAPS_TITLES`): the Borghese's em dash between name and subtitle
  (AL-068). The Italian "e" stays small, as "di".
- **R3 Closing-only dates** ("Through …", "Until …", "fino al …", "Now–…") after the ranges, so a range wins (DS-002).
- **R5 Title line** — first `# `; else first `##`/`###` holding the show's title; else first line holding it; else first short line
  (2+ words, ≤80 characters) that is a whole-word piece of it; the heading is the first with dates under it.
- **R6 Sixty lines** of dates under the title (`LINK_DATE_LINES`). **R4** a date line over 150 characters stays in the passage.
- **R7 Clean passage** — a repeated line once; HTML codes decoded (`decodeEntities`).
- **R9 One side completed** — a one-sided first date takes a full range further down sharing the date on the same side, never a
  range ending on another day.
- **R10 Heading over two lines** is one heading and the title, over the tab title; a date line is never the second half (Munich's
  house line). **R11 Range over three lines** — date, "to"/dash, date.
- **R12 Date forms** — an ordinal set apart by a space ("September 29 th 2012"); a month-first range with no comma before either
  year (DS-010); dotted dates with the year on the closing side only or two-digit (DS-005); a slashed range; an all-number date in
  the order its numbers settle, else its venue's in `DATE_ORDER`, else the order-unknown note; the blanket "dots are day first"
  rule was never hers (`docs/scraper.md` §3; DS-006, DS-009); "22.05.2008 | 14.08.2008" (AL-065).
- **R13 Dates around the heading** — an opening date over "Until …"/"to …" read together (AL-077b); a run the page says closed
  early ends that day (`DATES.closedEarly`, shared; AL-077); a paragraph's one-sided date waits six lines (AL-054); with none under
  any title line, the two lines above the heading (AL-055).
- **R14** Under a top heading, dates stop at the next top heading; a lower heading never stops them (AL-065).
- **R15 No usable dates** — as the sweep: undated, a day never invented. Months only/season/no year → the sweep's note quoting the
  page (`DATES.shownOnlyNote`); nothing → `DATES.NO_DATES_NOTE`; one copy each in `dates.js`. AL-064, AP-002, AP-006b–c.
- **R16 A bot check is never a show** — stays unread with "The venue's site answered with a bot check instead of the page."
  (`scraper/bot_check.js`; AL-069).

**The passage — what Claude is handed** (`takePassage`, AL-061; shared rules first, her decision). The page is read by structure:
paragraphs joined (a line per few words; a sentence wrapped over paragraphs); never a list, quotation, table, non-prose paragraph
(under eight words, no sentence end), caption (`isCaption`), the title again or a shouted line; junk sentences go one at a time
(`scraper/boilerplate.js` `BOILERPLATE` and `LINK_JUNK`; `sentencesOf` ignores an initial's full stop). It ends at four paragraphs
or 2,000 characters (her decision), or at a heading for other matter (`OTHER_MATTER`), or a box heading (`LINK_BOX`) after 600
characters; "Related …" above the text is skipped; an online feature's section ("Online special") is passed over. Each proof
page's passage is signed off on the list (`--write-passages`). Venue rules (`from`, `until`, `skip`, `minLine`) only where a
layout is its own; junk at the end of a passage is tolerated (her decision).

**Venue options** (`linkRead` on a `MUSEUMS` or `LINK_VENUES` entry; her decision: Parallel-only rules live in the app, never the
scraper; read by `readShowPage`, `venueTitle`; the options are listed where they are read). `skip` lines are never a subtitle.
Proof pages for every rule: `docs/link_proof_pages.json`.

## Venue link rules

**Occasional order and chips** are `VENUE_ORDER` (CLAUDE.md §5.4). **A venue's rule is that venue's** (her decision).

- **Galerie de la Présidence** (`occ-presidence-fr`): " : Exhibition" leaves its show headings (her decision; `titleDrop`,
  AP-015). **Tate library** (`occ-library-tate-org-uk`): Claude is handed the record's Summary (`from`, `fromLast`; AP-014).

- **San Marco** (`occ-museitoscana-cultura-gov-it`): card "San Marco Florence" (`card`), lookups search "Museo di San Marco" (`name`;
  AL-046d); titles are the press-release headline's first sentence, without "Mostra" and the quotation marks, capitals recased
  (her decision; `firstSentence`, `titleDrop`, `unquote`, `capsTitles`); shop: none (her answer).
- **Palazzo Ducale Genova** (`occ-palazzoducale-genova-it`), **Palazzo Reale Milano** (`occ-palazzorealemilano-it`): her names
  written in, second and third under Occasional; Milan's heading "I Brueghel - Palazzo Reale Milano" → `titleDrop` + `nameInLines`
  (AL-048). The city's site refuses Parallel (403) — Pages only.
- **Łazienki** (`occ-lazienki-krolewskie-pl`, her decision): title from the page title less " - Events" (`tabTitle`; AL-086).
  **Getty** (`occ-getty-edu`, her decision): "Museum Collection" pages take their heading as title (`tabNotName`; AL-087); Getty's
  dates are drawn by script (data.getty.edu), so its links come in undated (reading them from there is unbuilt). **A link with no
  dates whose page holds a script's unfilled placeholder** gets "Dates cannot be seen — JS-rendering." (her wording, shared;
  `SCRIPT_DATES_NOTE`, AL-088). HTML codes in a heading are decoded (AL-086a).
- **The Correr's archive** (`occ-archivio-correr-visitmuve-it`): the title is the "# " heading after "Section menu" / "Menù di
  sezione" (`titleAfter`, AL-089); capitals recased each side of a full stop (her decision; `capsStops`, AL-089b).
- **NGA** (`occ-nga-gov`, her decision): own chip "NG Washington", cards say so; a leading "Exhibition:" dropped (`linkRead`;
  AL-030). **Mia**: chip "Mia", cards "MIA", the "–– Minneapolis Institute of Art" tail dropped (her decision; AL-032). **Yale CBA**
  (`occ-britishart-yale-edu`): chip and cards "Yale CBA", after Cincinnati; lookups search the full name (her decision; AL-039);
  clock times dropped from dates (`CLOCK_TIME`, DS-003); shop = Publications on Touchnet. **NGV**: two-digit years read as 20YY at
  NGV only (`shortYear`, `withLongYears`; AL-038); goes last in Occasional; cards "National Gallery Victoria" (her decision).
  **Jacquemart-André**: the line under the heading is the subtitle (`subtitleUnderHeading`). **Boston MFA** (`occ-mfa-org`): chip
  "Boston", cards "Boston MFA" (her decision).
- **Berlin** (`occ-smb-museum`): chip "Berlin" after KHM, cards "Berlin Gemäldegalerie" (her decision), shop searched as "Staatliche
  Museen zu Berlin"; dots, day first (`DATE_ORDER`, DS-004). **Berlin Alte NG** (`occ-alte-nationalgalerie`) and **Berlin Neue NG**
  (`occ-neue-nationalgalerie`) (her decision): second and third venues under the chip, filed by path
  (`/museums-institutions/alte-nationalgalerie/`, `/museums-institutions/neue-nationalgalerie/`) or the house line just under the dates (`afterDates`); other smb.museum pages stay under the
  Gemäldegalerie (`linkVenue`). Shop found by the finder at its first link (AL-074, AL-074a).
- **Munich** — three venues, one chip "Munich", the Alte first, before Berlin (her decision; `group`, `chipKey`): Alte Pinakothek
  (`occ-alte-pinakothek`), der Moderne (`occ-pinakothek-der-moderne`), Sammlung Schack (`occ-sammlung-schack`); the Neue is left out
  (her decision). Capitals recased per part (`capsTitles`, `capsTitleParts`; CT-001); "Venezia 500<<" is the museum's own title.
  Filed by the house line between title and dates (`sites` with a house `line`, `linkVenue`), never offered as a subtitle; a page
  naming none is a line. Schack has no shop (AL-043h). **Shops: CEDON**, a section per house, searched in German, one query per
  house (`shopQueries`, `shopNamed`, `namesVenue`); on for these two venues only (a general rule needs every link venue's search
  re-checked live); CEDON's search `search?search=` (AL-044); its German/English one-page editions are an open lookup fault
  (`docs/catalogue_versions.md`, cases 10–11). AL-043.
- **Dresden** (`occ-gemaeldegalerie-skd-museum`): chip "Dresden" after Berlin, cards "Dresden Gemäldegalerie" (her decision); title
  is the heading after "Active page:" (`titleAfter`); dates day first; the site line never reaches Claude (`skip`, her decision);
  shop.skd.museum sells tickets and gifts only → she answers **No shop** once (her decision). AL-045.
- **Chantilly** (`occ-chateaudechantilly-fr`): chip "Chantilly" after Jacquemart, cards "Chantilly Musée Condé" (her decision;
  AL-081). **The Prado** (`occ-museodelprado-es`): chip "Prado" after KHM, cards "Prado Madrid", month first (`DATE_ORDER`; her
  decision; AL-085, DS-006); a touring show's other house on its date line still files here. **Cini** (her decision): three venues
  under one chip "Cini" after Capo — foundation (`occ-cini-it`), Le Stanze del Vetro, Le Stanze della Fotografia — Claude decides
  the venue as for any new one, and answers the Cini house only on first meeting cini.it, so a later Stanze show files under the
  foundation (her accepted outcome; AL-084). **Moretti** (`occ-morettigallery-com`, her decision: a Moretti rule): the place after
  " : " leaves the title, title recased, capitals description kept (`capsText`), passage ends at "Manage cookies" (AL-083).
- **Frankfurt** (the Städel, `occ-staedelmuseum-de`): chip "Frankfurt" after Dresden, cards "Städel Frankfurt" (her decision;
  AL-049). Its shop (`liebieghaus.ticketfritz.de/Shop/Index/staedel-publikationen/43885`): Parallel's reading stops after the menu
  (neither JS-rendered nor blocked). **Two facts written in, her decision:** the section (`shopCatalogues`, AL-049a) and
  `shopUnseen: "parallel"` — a shop page with no priced line says "The museum shop contents cannot be seen — Parallel fault"
  (FS-001–005); the rule stays until removed.
- **A link to a quarantined show** reads "Read 1 link, but nothing to add — already in your quarantine." when every show read is
  quarantined (her wording; AL-080); otherwise "…your ledger already matches it". A
  page with no year gets the sweep's note (`unusableDateText`, shared; her decision; AL-082).
- **The swept venues' link options** (met, frick, menil, acq, louvre, artic, cincinnati, brit) are on their `MUSEUMS` entries
  (`linkRead`). Her decisions among them: acq's `##` "In collaboration with" is a credit, not part of the title; cincinnati's
  "Now–May 30, 2021" is a closing date only.

## Saved pages — the Pages button

For a site that refuses Parallel (her decision; Palazzo Reale Milano's council site answers 403). She chooses saved show pages
(`.mht`/`.mhtml` or `.html`); the app unpacks each to the text Parallel would give (`savedPageReply`) and reads it with
`readShowPage`, then the same intake as a link. The address comes from the file (`Snapshot-Content-Location`, else the canonical
link); a page naming none is refused. **Behaves as the Links box** (her design): all at once, listed by title, kept in the store as
text (`links_pages/…`), Cancel / rejected / undecided put pages back, Clear empties both. Palazzo Reale Milano's council pages file
by path (`sites`) with options `titleHeading`, `titleDrop`, `datesUntil`, `until`, `asOfTo`. **Months only → undated** with the
sweep's note (her decision: the old first-to-last-day rule is gone); capitals recased there (`capsTitles`, her decision). Proof:
her saved pages in `docs/link_pages/saved/` (live proof is impossible); tests AP-001–010 (`add_by_page.js`).

## Pasted pages — the Paste button

For mostly-text pages where saving each is slow (her idea; the Tate library's records, bot-blocked), and her last resort for manual
entry: details from several sources typed in under a link to any page useful for that show. **No link, no import** (her decision).
One box per page, the link and the text apart (her design), two to start, + for more; a faint "Link" in each link box, nothing in the
text box; "Clear" in each box, "Clear all" centred in the row with + and Read (her design). Stored as she types, one document per box (`links_pastes/…`), under the
store-read lock. Cancel / rejected / undecided put boxes back. A pasted link's Change card she rejects herself.
**Read by Claude, checked by code** (her decision, bucket 4 above; 56): the page reader never sees pasted text (`pastedPage`).
Claude is handed the whole paste (the 2,000-character cut) and gives the description, the title and the date words; code
refuses a title or date words not in the text word for word (capitals, punctuation and line breaks aside) and asks again
(`pasteFaults`), then reads the dates by the shared reader **with no year floor** (`anyYear`: the words are already cut out, so
no lifespan can be among them; the sweep and the page reader keep 1990). " : " becomes ": ", a closing full stop goes
(`pasteTitle`). **The description comes from the rest of the text** (her decision, 56.1): Claude is told so, its claims are
checked against the paste with the title and date words taken out (`pasteRest`), and one whose every word is the title's is
refused and asked again (her Met paste gave "Late Antique and Early Christian art, third to seventh century."). **Any length
is read** — no "too little text" (her decision). Then the same venue rules, shop finder and review.
Proof: her three Tate library pastes (`docs/link_pages/pasted_tate_library.json`) and her one-sentence Met paste (*The Age of
Spirituality*, 1977); tests PS-001–029, PS-004c (`add_by_paste.js`).

## Another part of one of her museums' own site — all three ways in

A page whose address is one of her museums' site, or under it (`library.tate.org.uk`), that the address alone does not file, goes
under the museum Claude names when that museum is on that site (`ownMuseumNamed`, `nearMuseumSite`) — no new venue, no shop asked
(her decision: a general rule, for Links, Pages and Paste). Such a site is asked the venue on every page, so each record files
under its own museum (a Tate Modern record under Tate Modern). A sister site on a shared domain (cultura.gov.it) is not "under".
**"Tate Gallery"** (pre-2000 records) names neither Tate, so it is its own venue (her decision); its shop must be the Tate's
current shop. Its records' text for Claude is the one under their "Summary" heading, below the copies list (her saved Reynolds and
Pre-Raphaelite pages; venue rule `from` with `fromLast`, AP-014). No listed proof page can reach the rule (every page on her museums' sites files by address first). Tests PS-006, PS-025.

## Someone else's page — a show held elsewhere

A last resort (her decision): a show so old its venue's page is gone, read off a blog or magazine page.
- **The venue is Claude's to find** (her decision): for a site the app has never seen, Claude is sent the page's address and the
  date line (the showing the card is for) and asked which museum it names and whether the address is that museum's own site. **Only
  when it says not** is a second question asked (`elsewherePrompt`): the museum's website and the show's full title. Code files it
  (`heldElsewhere`): one of hers by name or site, else a new Occasional venue under its site. The site Claude gives is its
  knowledge, not read off the page. AL-052g.
- **The title is Claude's too** (her decision), from the text; the 2,000-character cut applies (AL-052h). A label before the show
  ("Exhibition | …") is dropped, and a dash-led site tail read first (`splitPageTitle`, `TITLE_LABEL`); tracking tails leave a
  saved page's link (`withoutTracking`). Tests AL-050–052 (`docs/link_pages/elsewhere/`).
- **The Borghese's archive site** (approfondimentimostre.com) files under her Borghese by this route, nothing written in (her
  decision: test Claude first). Parallel answers 202 for most of its pages: "The page contents cannot be seen — Parallel fault.
  Import the full saved page." (`pageUnreadWhy`, AL-067) — those come in by Pages. Her way: the Borghese's own page first, the
  archive page by Pages only when the own page lacks what she needs.

## Left as is, and what a session must not change (her decisions)

- **Her confirmed shops in her app are never hand-edited** (her decision: no edits to store or ledger); a session amends one
  only when she asks — if she imports more links there or a lookup misses a catalogue.
- Two Stuttgart links still meet the site's bot check (she re-reads later or imports them by Pages); Soutine
  (Palazzo Reale) keeps its made-up first-to-last-day dates; a Borghese sweep may bring title Change cards for a
  capital "E" — expected.
- Louisiana's Tracey Emin page was never read (Parallel 202, no cached copy, so the finder never ran);
  `louisiana.dk/en/exhibition/jorn-meets-jorn/` is expected to give
  `butik.louisiana.dk/en-int/collections/udstillingskataloger`.

## What links are for, and how far the reader reaches

- **At a swept venue** a link is for shows before the 1 July 2024 lookback, or a venue she has stopped sweeping — never a show the
  scraper has or will have. **No exclusions apply to a link** (her decision): displays and collection shows are added too.
- **The general reader does not yet work at** acq, rijks, borghese, louvre, uffizi, mam, mad, ashmolean, artic, brit, dellav.
  **Her choice: only acq, louvre, artic and brit get work**; the others may never come into play. A page printing no year still
  fails — blank dates are NOT approved, and "current year" would misdate archives.
- **A link from one of the 28 files under that venue**, known by its site (`VENUE_SITES`, written by `build/sync_shared.js`; the
  Tates by path). A new venue's shop is looked for once per Read, never once per link.
- **Claude reads relevant passages, not the first N characters** (`pickPassages`); a link labelled "catalog" onto the venue's shop
  in web results is taken in code (`catalogueLinkOn`). Titles from a page title: the show is the first part of a barred title, a
  bar inside the show's name is kept (AL-015).
