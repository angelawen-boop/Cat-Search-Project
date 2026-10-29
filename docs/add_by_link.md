# Add by link — design, decisions and venue link rules

**Her design; signed off at 39.5.** Code: "ADD BY LINK" in `Cat_Watch.jsx`; test
`scraper/fixtures/add_by_link.js` (AL-). The app handles unreadable links itself; no scraper-side reader.

## The problem

Some venues matter only now and then (~5 shows a year). A full venue costs a recipe, an archive and a monthly
sweep — then ~30 rows arrive and 27 are dismissed. She would rather pick the shows and add one the moment she
meets it.

## The design

- **Import opens ONE small pop-up — nothing added to the page** (her design, 39.2): **CSV · Links**, a small
  **Cancel** under them (the footer's Quarantine style). CSV = the file picker, the sweep route. Links = the
  box and **Read**, same pop-up, with a progress bar. Links separated any way; a repeat read once. The review
  opens when reading ends; the pop-up waits under it if a link failed.
- **Then the shop screen** (her design): with a card going in from a venue outside her 27 whose shop is
  unconfirmed, the review's last button is **Next** → one card per such venue: **Confirm · Look again · No
  shop**, always in that order. Only a venue with at least one card going in is asked; one whose every card is
  rejected, undecided or quarantined is not (her decision; `venuesGoingIn`, AL-046). **The ledger moves only when every one is answered.** Back returns
  to the review. Confirmed once, never asked again. **An answer is stored only for a venue with a show going in**
  (her decision): answered, then its show rejected after Back, the venue is stored as the finder left it, unanswered,
  and asked again at its first real import (`answeredOnly`, `beforeAnswer`; AL-009o2, AL-046f).
- **The ordinary review.** Each link becomes a pro forma row fed to the existing intake: Add / Fill / Change /
  Reject / quarantine all as now.
- **An import she does not finish keeps NOTHING** — new venues and shops, Confirm / No shop /
  Look again, a CSV's sweep log: all stored when the ledger moves. Cancel import drops them; Back
  keeps them. A file or Read with nothing to propose counts as finished.
- **A link it cannot read is a line, never a card** — the full link and why (empty page, refused, Parallel's fault).
  Unread links **stay in the paste box**, stored when the import finishes, until read or cleared ("Clear", inside the box, empties it and the store). **Links come
  back to the box** (her decision): a rejected card's, an undecided card's after a partial apply, and on
  Cancel import every link the Read took — each stored at once. AL-012c, AL-024.
- **No lookback cutoff** for anything added by link (her decision).
- **Chip: one "Occasional"** for every venue added this way (her decision); each venue keeps its own name and
  shop behind it. A link to a venue already swept files under that venue.
- **One entry per venue — `LINK_VENUES`** (her decision: one place, as `MUSEUMS` is for the swept venues).
  Everything she decided about a link venue: own chip, group, short and card names, full and lookup names,
  other sites (`sites`: a path on a shared site, a house line), link options, shop settings. What the app
  finds out sits in the store and the entry wins over it (`occVenue`, one function for stored and unseen
  venues). Never a second table for one of these facts.
- **A venue not met before is named by Claude** (her decision), on its first link only, in the same call as its
  description: its full name, the other names it goes by (acronym, own-language name), city and country, and a
  short card name — identifying but short, in her style (her names in `LINK_VENUES` are the examples). A stored
  venue named only by its address is asked once more (`namedByAddress`). The tab title's site name, then the
  address, only when Claude gives none. AL-053.
- **The card name shows on both screens** (her decision): the review's venue heading and the shop screen show the
  name on the venue's cards (`card`, else `short`), never the long search name.
- **Renaming a link venue Claude named — a session's job, and Claude learns from it** (her decision: no editing in
  the app). Write the venue's `LINK_VENUES` entry: `name` (Claude's full name), her `card` name (or `short`, for a
  venue under Occasional), and `notCard` — the card name Claude gave. Every rename goes into Claude's question as
  "for <full name>: <her name>, not <Claude's>" beside her other names (`SHORT_NAME_RENAMES`, AL-066), so later
  new venues come closer to her style.
- **Search name long, card name short** (her decision): the shop search uses the full name, other names, city
  and country (`venueSearchName`); cards use the short name. Proved live (Parallel, 9 searches): "Palazzo Ducale"
  alone found Venice's shop; KMSKA's English name alone found the Brussels museums, with "KMSKA" beside it
  Antwerp's shop; San Marco's regional-office name found no shop, "Museo di San Marco Florence Italy" its
  bookshop partner. Nothing is written in: a venue Claude has not yet placed (no city stored, her hand-set ones included) is asked on its next link, her names and rules kept (`needsFacts`). Tested on 42 live pages with Sonnet: right museum, city and country on all 42 (AL-053f).
- **Store:** `venues/occasional` (venues, shops, her confirmations) and `links/pending` (the box). Both were
  copied into her app's store when the cloud ledger merged. A ledger row whose venue a page's store has not met shows under
  its web address, shop "not found".

## Per link — code first, model only for prose

1. One page read (`fetchPage`, `full`).
2. **Title = what the catalogue would be called** (her decision): the page's title, site name stripped;
   subtitles and split headings kept. **Title stays in the museum's language.**
3. **Dates:** the first range after the show's heading, by the scraper's own date reader — in its own file,
   shared, never copied.
4. **Description by the model** (`modelTier: default`, her decision), same prompt as compression, shared not
   copied. **Any non-English page comes out in English; a non-English title gets its translation at the
   start** (`In English: "…".`), every language (her decision). The translation is recased as the title is: Claude translates a title
   typed in capitals into capitals (Borghese *TITIAN. DIALOGUES OF NATURE AND LOVE*; `cardTitle`, AP-012b).
   **Tested with Sonnet on 70 live pages** (the app's own code built each question; code scored it): subtitle
   pick right on all 13 pages that print one and none taken on the rest; English title given on every
   non-English title and never on an English one; English-speaking country right on 70; summaries within the
   rules on 69 by code check. **Read for meaning on the clean passages** (every proof page, the new-museum pages,
   Wallraf, the blog pages): right about the show on all but Pontormo (Scuderie), where Claude writes "first" with no
   word for it in the text, on two reads of three — now caught by the description check and asked again (re-run on 50: one
   read of three said "first", refused; the re-ask clean).
   A blog page's second question (`elsewherePrompt`): right museum, site and full title on 9 of 9 reads
   (Enfilade Canaletto → rct.uk; her two Reynolds pages → the Wallace, *Joshua Reynolds: Experiments in Paint*).
5. **Claude's answer checked as the compressor's** (`answerFaults`, the shared `scraper/answer_check.js`):
   shape, and every claim word and number on the page. A refused answer is asked again with its reason, twice
   at most (`LINK_ASK_AGAIN`); one that never passes leaves the link unread, the reason on its line (her
   decision): "Claude's description failed check and re-attempt multiple times (…)", the faults in the
   brackets (her wording). AL-062.
6. No note — a link is not a sweep; `swept_at` blank, sweep log untouched.

## A venue the app has not seen

**Measured on 24 museums never seen** (her decision: the shop finder rebuilt as the reader was): a books section
found for 9 → 11; the museum's home page given as its shop 3 → 0; nothing found 7 → 3 (Strozzi, Scuderie, Poldi
Pezzoli — no online shop seen). Shared rules added: one list of shop words in the languages met (Danish "butik",
a name run into "shop"), German and Scandinavian section words, prices in francs, crowns and with the currency
code first, one book's page never a section, a file or an app store never the shop, a shop page on the museum's
own site kept as itself, a shop address on another site followed, and one more search for the shop itself when
the first finds nothing shop-like. AL-059.

## A gallery's shop — her design (built 26 Oct, not yet published)

**Why its own path** (her decision): galleries sell their books differently from museums — from a "Publications",
"Publishing" or "Library" page on their own site, or a shop on another (shop.pacegallery.com, a Shopify shop), rarely
called a shop, and never with an "exhibition catalogues" section. The museum finder recognised a shop only by its
name, so Galerie Karsten Greve's Publications page was thrown away and the walk never started. Rules for galleries
are kept apart so no museum can get worse: Claude says whether a new venue is a gallery (`gallery`, asked with every
link, kept on the venue); a gallery goes down this path first; when it finds no shop, the museum path runs unchanged.

**The path** (`galleryShop`), each step only if the one before found nothing:
1. **The show page read** (the link's page): a link named Shop, Store, Books, Publications, Publishing or Library
   (in the languages met; never "Editions" — a gallery's editions are prints), or whose address is one of those
   words; a link into a shop site (that shop); a book's "Purchase" / "Buy now" (its list).
2. **The home page**, a redirect followed (kamelmennour.com → mennour.com); read the same way.
3. **The usual addresses** in one call: /shop, /store, /books, /publications, /publishing and their /en/ forms. One
   that lands on the home page proves nothing.
4. **A search**, its results judged as pages are: a shop site, a page of the gallery's own named for its books.

**What counts:** a shop elsewhere is the shop. A page of the gallery's own is the shop when it sells books: priced
books on it, or one of its books opened (the one under a books heading first — Massimo De Carlo lists prints before
its "Catalogues") showing a price and its make (ISBN, binding, page count). No cart is needed (Lisson: prices and
"Enquire"). A price with no cents counts on a book's page ("80 €"), and a page the shop files under Books does too
("Books, Editions Mennour"). A list read without its links is proved by its books linked from the gallery's other
pages (Karsten Greve's home page); a heading naming its books with two priced entries under it proves a list whose
book pages come back empty (Massimo De Carlo's "Catalogues"). A book whose page says "Buy" in a shop elsewhere sends
the path to that shop (Lévy Gorvy Dayan's Library). The gallery's own site is the show page's (a moved site,
kamelmennour.com → mennour.com); "www." or not is the same site.

**Which list — her rule:** the NARROWEST section that holds the catalogues and can be read. The catalogues section
("Catalogues", "Exhibition-Related Books") if it can be read; if not, the next wider section that can be — the
gallery's own publications ("Publications", "Gagosian Books", "Perrotin Editions - Books"), then books, then the
whole shop; with no catalogues section, the narrowest that exists. Lists of one kind: the smaller first. Never a
section of only some books (Selected, New, Rare, Sale…), editions, prints or posters, a tax copy ("Books Zero Rated
UK") or a list of everything ("All Items"); never one book's page (a link the page also shows with its price).
On a gallery's own page its narrower sections are tried first (Karsten Greve's "Catalogues" tab, White Cube's
"Publications"); a landing page with none gives way to its "All" list (Zwirner's "All Books"). A Shopify shop's lists
are read to their last page (Perrotin's "Perrotin Editions - Books" is on its second); a shop whose products carry no
type (Lévy Gorvy Dayan's) → its whole list read as a page, one book opened; a shop with no books-only list → its
front page, when it sells books (Mennour: books, caps and bags). A gallery in a country that does not speak English:
the section's English version, by the page's own language link (its words would not do: English titles make Karsten
Greve's German list read as English), with the section's own filter (the site's language links carry whichever
filter it served last); taken when it carries the same titles. **Corrected 26 Oct:** the path was first built to
take the widest list, Claude's invention against her design; her rule replaced it the same day, and the check's
right answers were reset by it.

**Karsten Greve's Catalogues tab** (`?filter=C`) reads with its books, but read live it is the whole list (a bag
among them): the site filters it in the browser. It holds the catalogues, so lookups find them there.

**Never "no shop" for a site that could not be read:** a gallery whose home page could not be read, and where the
museum path then finds nothing, is "Search failed".

**The lookup** (shared; in the design she approved): a list of titles without prices is proved books by its first book under its
own address too, read as a gallery's book page — so a show missing from Karsten Greve's list is not in the shop,
never "cannot be seen" (GK-001–002). The museum finder's own proof is unchanged.

**Tests:** AL-076–076j (offline); `node scraper/gallery_shop_check.js` — the app's own finder, live, on fifteen
galleries (`docs/gallery_shop_check.json`), each against the list set from its live site before the run. **26 Oct,
final code, right answers by her rule: every gallery right** (Sprüth Magers: no shop, rightly). Claude's gallery call, with a stand-in Claude
(Sonnet) on the app's own prompt: right on all 13 gallery and 10 museum show pages read live, the museums named
"Gallery" (National Gallery, Galleria Borghese, Gemäldegalerie, Neue Nationalgalerie) included; her own imports prove
it.

## The shop finder — her design (built, not yet published)

**There is one right section per shop: the finder finds it, or says it could not.** Never "the best of whatever the
search returned" (her words: you go out for capsicum; if you can't find it you are looking in the wrong place, or it
doesn't exist). How a person does it, and so how the finder does it:
1. **Search** "<long museum name> shop exhibition catalogues". A result is taken at once only if it IS the shop's
   exhibition-catalogues section — its own name (title, label, address words) says exhibitions' catalogues.
2. **Otherwise walk the shop.** Parallel does not click: each step is a fetch of one address, the page back as
   text with its links as `[label](address)`; code reads the labels and opens the one named for catalogues. Start
   at the shop found (its front page, a Shopify shop's section list, its menu), go into a broader section ("Books")
   when the catalogues may sit inside it. At most **four page opens** after the search. Only when the shop truly
   has no catalogues section does it take the best section it saw, and the shop screen says **"Shop found, but
   not its catalogues section"** — her wording, one line for every such case, nothing about what was taken
   instead (her decision: she asked only for better looking, never for lines describing kinds of result).
3. **No books section, but the shop's front page sells books → the front page is the shop** (the gallery path's rule,
   carried to museums at her decision): the shop screen says "Shop found, but not its catalogues section" and she can
   Confirm it (`shelfKind: "front"`; AL-078). A front page selling only gifts or tickets stays as below (Dresden).
4. **Where it cannot work it says so** ("Shop found, but not its books section"): a menu drawn by script that
   Parallel gets nearly empty (Hamburg's Friends' shop), a page Parallel cannot fetch (bot check, 202, a "301
   Moved" notice).

**As built:** a search result is the target only when its name carries both a catalogues word and an exhibitions
word (or it is the venue's own section on a shop company's site, CEDON); a lesser one is kept as the best so far and
its shop walked, in English when the search shows the shop's English pages. The walk opens the front page, checks its
section links (only those ranked above the best so far), then goes into the best section link not yet opened, four
pages at most. **An exhibition-catalogues section that also sells the shows' goods counts** (her decision: Thyssen's
"Exposiciones" holds catalogues, posters, socks and mugs) — it needs two priced books, not mostly books; every other
section stays books-only. A Shopify section under a translated address ("/en/collections/exhibitions") lists no
products there; its number finds it in the shop's section list ("exposiciones") and it is read there, the address
found kept. A books shelf whose menu label is the museum's own name is its publications (KMSKA). AL-071. **A section
whose own page comes back without its books** (Parallel gave Berlin's "Ausstellungskataloge" as its footer alone)
counts when the shop shows two of its books elsewhere, priced, under its address (`booksUnder`, AL-072). **A page
linked as the shop with no section links at all** (Berlin's "Museen & Sammlungen") gives way to the shop's own front
page — never when the page has sections, so a shop on a shared site is never left for the site's root (Yale, AL-042a).
**The English version — her design (a foreign-language shop must not hide the English one, nor the English books
on it).** For a venue in a country that does not speak English (Claude's `englishSpeaking`, kept on the venue):
1. **Search for the English shop first:** "<name> English language shop exhibition catalogues" (and "…books
   publications"). Results in two languages: the English one is taken. No separate searches stacked (her decision).
2. **Landed on a foreign-language shop** (address language part, else its words): look for its English version — a
   language link on its pages, else its English addresses (`/en/`, `/en-int/`, `/en-gb/`, `/en-us/`, `en.`), all in
   one call; the first that reads in English is walked as the shop was. The same section in English (same address
   without its language part, Louisiana) is taken; otherwise the English shop's result stands unless it is a lesser
   section than the foreign one (four opens can miss).
3. **The English search finds no shop:** the plain search (Berlin's German shop was pushed out by "English"), then
   step 2. **No English version:** the foreign-language section stands.

Not a language switcher alone: Louisiana has none (its English shop is `/en-int/`, its `/en/` not found), and
Parallel keeps Albertina's "Englisch" without its link. Also built with it: a Shopify shop's section list is read in
the shop's own language part (Thyssen's English list); a section named only "Exhibitions" is read with its own
description (Thyssen's "los catálogos … de nuestras exposiciones"; a show's own section by its title alone); a
translated section's products are read under the shop's own-language name; a front page read without its sections
(Albertina's English one: shows and products only) gives way to another shop page the search found, never a mixed
section; a section whose page failed is proved by books seen later. AL-073–073f.

**Live, 23 Oct, all 18 right:** Albertina, Louisiana (`/en-int/`), Thyssen, KMSKA, Beyeler in English. **Berlin stays
German though an English shop exists** (`/en/books-und-media/exhibition-catalogues/`): Parallel returns that page and
the English front page without their books, so nothing proves it; the German section sells the English editions too
(*Cassirer and the Breakthrough of Impressionism*). **Known gap (her Belvedere link, 50.3):** an English shop page
on the museum's own site whose shop link points to the German shop (`belvedere.at/en/museum-shop` → `/shop`) is
followed into German; the English-version step tries only English front pages, never the English version of the shop
page itself, and Parallel drops the toggle. Open: CLAUDE.md §5.4, item 2.

**The fault it fixes:** the old finder walked the shop only when the search found nothing usable, and accepted any
section with books and prices — so Thyssen took "Publications" and Antwerp the whole Dutch "Boeken" when the search
happened to show them. **The standing check is strict:** one right answer per venue, never a second.

**Right answers, her decisions:** Thyssen — "Exposiciones" (catalogues and guides of its exhibitions), not the
collection guides she once confirmed; Antwerp — the KMSKA shelf under Books, as confirmed (its shop's "Catalogus" is
the whole product list; its "Exhibitions" section looks like goods per show — unchecked). **Confirmed shops in her
app stay as they are** (her decision: no hand edits to store or ledger); a session amends one only when she asks —
if she imports more links there or a lookup misses a catalogue.

**History:** the first finder (39) read the shop's menu after one search; her first run picked one book's page (RA)
and a blog post (Courtauld), and her design that day (39.2) went search-first, the shop's section list and menu only
when the search found nothing. The plural-section rule added the same day would have fixed both misses on the menu
route too; the walk is back, now after a strict search.

Name: Claude's (above). Its shop: the **exhibition-catalogues section**, else the museum's publications,
else books — **never the front page, one book, a post, or a section mixing books with other goods** (her
decision). A mixed section is opened and a books-only section inside it taken. **Nothing found is stored until
the import finishes.** Code: "FINDING A NEW VENUE'S SHOP SECTION".

**The finder runs in named steps** (`discoverShop`, as the reader does; each step reads and writes `sf`, the search
for one venue's shop): the venue's written-in section (`shopFromRule`), the search (`searchForShop`), a books section
among its results (`pickFromSearch`), the museum's Shop page sending visitors elsewhere (`followShopElsewhere`), a
Shopify shop's section list (`shopifySectionList`), the shop's menu (`shopMenu`), the answer (`shopResult`). Each
candidate is proved books-only by `tryShelves`.

**The finder's standing check** (her decision; proof pages test only the reader): `node scraper/shop_check.js` runs
the app's own finder live, on the free Parallel server, on the venues in `docs/shop_check.json` — one per way a
shop has been found or missed, each with its right shop (hers where she confirmed it) and the case it guards. A miss
prints the finder's steps beside its last good run (`--write` keeps a passing run's steps). Run it after a change to
the shop finder only: about five calls a venue.

1. **One search call, two queries: hers, "<venue> shop exhibition catalogues", and "<venue> shop books
   publications"** — Detroit's "DIA Publications" came back with both, never with hers alone (keyed). Parallel
   does not always rank the section first (Cleveland's was 4th), so code ranks every result: the museum's own
   shop site only; plural section words; "not Catalogues" and sale shelves refused or last.
2. **A Shopify shop's section list** (`collections.json`) — Thyssen's search held only single books. Ranked on
   titles.
3. **The shop's menu.**

**Fixes from the first venues it had never met (proven live, 43.1):**
- **The venue's own name drives the search.** A site name the reader cannot match to the address (Mia, on
  new.artsmia.org) left the search finding other museums' shops; a venue rule names it (`LINK_VENUES` `name`),
  Look again included.
- **A Shopify section that opens with no books** (Mia's Catalogues shows only its menu) is judged on its
  `products.json`: two priced products, most with a book type (`shopifyShelfIsBooks`; AL-033).
- **The museum's own Shop page pointing elsewhere** (Worcester's "Shop now" → a myshopify.com shop) is
  followed when the search finds no section (`shopElsewhere`; AL-034).
- **A shop on a site shared by many shops** (Yale's, on Touchnet): its menu is read on the exact page the
  museum links to, never the site's root, and that page is its shop link. A /museum-shop address counts as a
  shop page (`SHOP_PATH`). **A shop page that comes back as its title alone (one line) is opened once
  more with `page=1` added** (`openShopPage`; finder, the lookup's book page, Re-check): Touchnet sends its
  menu, lists and books only then. A short page of several lines is never retried (Louvre, LG-). **A menu label is read by its first six
  words** (`menuLinks`; Touchnet adds "The number of products in this category is"). Checked on the 48 saved
  pages: no menu ranks differently. AL-042.

**Fixes from Berlin (Staatliche Museen zu Berlin; proven live on its shop):**
- **A Shop button on the museum's own site** (smb.museum/webshop) vouches for that page, never the whole site
  ("Online Catalogues & Databases" there is no shop).
- **A Shop page that shows the shop itself** links one book first: the book's site is taken, not the book
  (`shopElsewhere`).
- **A book's own address in a menu** ("/buecher-und-medien/ausstellungskataloge/6442/brancusi") stands for the
  section it sits in (`menuLinks`).
- **German joins its words**: "Ausstellungskataloge" is a catalogues section, "Bücher" (`buecher`) books
  (`SHELF_CATALOGUES`, `SHELF_BOOKS`, `BOOK_WORD`).
Found: `smb-webshop.de/buecher-und-medien/ausstellungskataloge/`, by the shop's menu. Proven by running the app's
own finder with every call answered by a live Parallel fetch. The site itself often hangs (her own browser too).

A pick is **opened and must read as books with prices** (unless its excerpt already does), **or its first
product must read as one book with a price** — her decision, for a list of titles only (Yale's Publications;
`firstProductIsBook`, one copy with the lookup's shop step, AL-042, YS-001–005). Nothing → "Shop
found, but not its books section: <shop>" / "No museum shop found." / "Search failed." — and **a miss is a
finder bug, fixed in code: she never pastes a shop link** (her decision). **Confirm** on "Shop found, but not its books
section" takes the shop shown as its section (her ask; `confirmShop`, AL-079). **Look again** skips only the pages
she turned down, never the site. **No shop** → lookups go to the web, as at Capodimonte. Venues found by the
old finder and never confirmed are looked for again on their next link. Evidence:
`docs/link_pages/shop_search/`.

**NGV writes two-digit years** ("4 Sep 26 – 31 Jan 27"): read as 20YY at NGV only (`shortYear` in
`LINK_VENUES` `linkRead`, `withLongYears`; AL-038). A general rule would read "Jun 23" as a year anywhere. NGV goes
last in the Occasional group; its cards say "National Gallery Victoria" (her decision).

**A Wayback Machine copy files under the museum it copied** (her decision; *Sargent and the Sea*, RA 2010):
the venue, its shop and the page title's site name come from the address inside the copy; the copy is what is
read and what the card links (`siteUrlOf`; AL-037).

**A section found on a later page is kept by its first** (her decision): the search can rank page 2 first, as
it did KMSKA's ".../books/kmska/page2.html"; "/page2.html", "/page-2", "/page/2/" and "?page=2" are read as page 1,
and a sort order leaves the address ("?sort_by=best-selling", Thyssen) (`firstPageOf`, AL-063).

**Found by the standing check** (shared rules; AL-070; each live on the venue it came from, no venue on the list worse):
- **An exhibitions' catalogues section ranks first** among catalogues, her order: Thyssen's "Exposiciones: catálogos y
  guías" above its collection guides and catalogues (`SHELF_EXHIBITIONS`).
- **Danish joins its words**: "udstillingskataloger" is catalogues (Louisiana).
- **A section under "/products/"** — the step after it a section's word — is a section, not a product (Albertina's
  "/en/products/publications/", "Catalogues & Publications").
- **A shop on the museum's own sub-address is the shop** (Louisiana's butik.louisiana.dk), not the museum's page about it.
- **A Shopify list of 250 sections is read on**, up to four pages (Louisiana's "Udstillingskataloger" sits past 250).
- **A page linked as the shop that comes back empty** ("301 Moved Permanently", Berlin's) gives way to the shop's
  own front page for its menu.

**Shelf AND whole-shop search, as the 28 (her decision)** — DIA files a show's book in the show's own section.
A search is kept only if it finds a book the finder saw (`proveShopSearch`; AL-008k, AL-014); older venues
work it out at first lookup. **Where those rules found nothing, three fallbacks (her decision, every venue; AL-044):**
a book whose price sits a few lines below its title link, in its own block (CEDON, Berlin; not a button like "Reset"
or "Shop now", not an empty basket's "0,00 €"; a title cut short takes the book's full one); Shopware's two searches (`search?search=`, `search?sSearch=`) in a
second call, so the first call is unchanged; and the book found in the results by its title when its address differs
— only on a page for that book alone, so a page that ignores the words (Berlin's home page, CEDON's `search?q=`) proves
nothing. A section taken on its excerpt is opened once for its books. Venues stored before (`SEARCH_RULE`) are proved
once more at their next lookup. Live check, every link venue's shelf: venues the old rule served pick the same books;
new searches proved for the Royal Academy (`catalogsearch/result/?q=`), Berlin (`search?sSearch=`) and both CEDON
houses (`search?search=`); Yale, Mauritshuis, Thyssen, NGA, NGV and Mia still show no book in their shelf text.

## The general reader — shared rules, venue rules only where needed

Built as the scraper is: one shared reader, a venue entry only for what differs (her decision).
**Where the sweep has already met a case and she has decided how it is handled, Links and Pages follow the
sweep's rule — the same code where it can be shared (`dates.js`), never a rule of their own** (her decision:
no reinventing, no inconsistencies). Before writing a reader rule, look for the sweep's. Rebuilt on
101 live pages: the 76 proof pages at her venues plus 25 pages from museums the app had never seen — 13 of
those 25 read clean before, 25 after, with no proof page worse. Code: `readShowPage`, `splitPageTitle`,
`cardTitle`, `DATES.findDateRange`. Tests: DS-005–006, AL-054–058, AL-064–065.

- **R1 Site in the page title** — a dash tail that is the site's own address is the site (KHM); a separator
  with no site after it is dropped (Genoa, AL-047); a bar title with the site first takes the other part
  (Nationalmuseum, AL-057). `splitPageTitle`.
- **R2 The heading is the name** — as in the scraper (`titleFromPage`). The page title adds only what the
  page backs: its spelling when it reads the same (Tate "90s"); the line under the heading when the page
  title's extra words are all on it (Poldi Pezzoli); its subtitle after ". " or ": " (KHM *Head and
  Shoulders. Coins in Fashion*). Never its dates, site name or another spelling (MFAH, NPG, Philadelphia).
  A heading of generic words, the site's name, or sharing no word with the page title gives way to it
  (NGA's "Global Search") — unless the page title names the site and the heading does not: then it is the
  site's own label ("Information: Wallraf-Richartz-Museum") and the heading stays (AL-056a). AL-056.
- **Tours are never added** (her decision) — a page about a show touring other museums is a title test only.
- **R2b The venue's name alone is never the title** (her decision): a line that is only the venue's name, a house's
  name on its site, or the site the tab title names is not taken as the title unless the show's dates sit under it
  (Brancusi's "Neue Nationalgalerie" line under its dates); with no other candidate the link fails, never a card
  (`venueNamesFor`, AL-075a–b). A "##"/"###" heading that is part of the tab title is a title candidate, before any
  plain line (Brancusi: "## Brancusi" in "Brancusi at the Neue Nationalgalerie"; AL-075).
- **R2a Generic label** — "Exhibition", "Mostra", "Ausstellung"… before the name leaves it (NGA, San Marco,
  Van Gogh Museum; AL-054).
- **R2b Capitals** — a title typed wholly in capitals is recased, unless one short word (Scuderie, Albertina,
  Borghese; AL-058). `cardTitle`, the same for the app and the proof check. A swept venue that types its titles
  in capitals takes the sweep's own rule (`DATES.sweptVenueTitle`, `SWEPT_CAPS_TITLES` in `dates.js`, one copy):
  the Borghese's em dash between name and subtitle (AL-068). The Italian "e" stays small, as "di" does.
- **R12 Date forms** — dotted dates with the year on the closing side only or two-digit years, a dotted
  closing date (DS-005); a slashed range on the date line when the numbers prove its order (Prado, DS-006);
  two full dotted dates either side of a bar, "22.05.2008 | 14.08.2008" (the Borghese's archive site, AL-065).
- **R14 Under a top heading, dates stop at the next top heading** — its dates are its own part of the page (the
  Borghese's archive: "# Insights | 1998 / 2026", the site, over "# Correggio and Antiquity"; AL-065). A lower
  heading never stops them (San Marco's "### Date di apertura" under its "###" title).
- **R16 A bot check is never a show** — a page titled as a bot check ("Just a moment…", Anubis's "Making sure
  you're not a bot!" at the Staatsgalerie) stays unread with the sweep's words, "The venue's site answered with a bot
  check instead of the page." — the sweep's own test, one copy (`scraper/bot_check.js`). Without it, R15 let the
  check in as an undated card (AL-069).
- **R15 No usable dates** — as the sweep: the page is read and comes in undated, a day never invented. Months
  only, a season or no year: the sweep's note quoting what the page shows, 'The venue's page shows only
  "september 2027" for this exhibition's dates — no day is published, only the month and year.'
  (`DATES.shownOnlyNote`); nothing at all: "No closing date found anywhere on the venue's pages."
  (`DATES.NO_DATES_NOTE`). One copy of each, the sweep's (`dates.js`). The Borghese prints most past shows'
  dates only in the poster (Louise Bourgeois). AL-064, AP-002, AP-006b–c.
- **R13 Dates around the heading** — an opening date over "Until …"/"to …" read together, whatever word comes first
  (Van Gogh Museum's "From", Reina Sofía's "Held on"; AL-077b); a run the page says closed early ends that day
  (`DATES.closedEarly`, shared with the sweep; MSK Ghent, AL-077); a paragraph's one-sided date
  waits six lines for a full range (Van Gogh Museum, AL-054); with none under any title line, the two lines
  above the heading (Kunsthaus, Boston, Pinakothek der Moderne; AL-055).
- **R3 Closing-only dates** — "Through …", "Until …", "Closes …", "fino al …", "Now–…", in the shared `dates.js` after
  the ranges, so a range still wins; the scraper reads them too. DS-002.
- **R9 One side completed** — a one-sided first date takes a full range further down that shares the date on
  the same side (Tate Modern *Ana Mendieta*); never a range ending on another day (National Gallery *Renoir
  and Love*).
- **R5 Title line** — first `# `; else first `##`/`###` holding the show's title; else first line holding it;
  else first short line (2+ words, 80 characters at most) that is a whole-word piece of it. The heading is the
  first with dates under it (Cincinnati *Rexroth*, Orsay *Cassatt*).
- **R6 Sixty lines** — dates are looked for in 60 non-empty lines under the title (`LINK_DATE_LINES`; Met
  *Harlem Renaissance*).
- **R4 Long date line stays** — a date line over 150 characters is a paragraph carrying the dates; it stays in
  the passage (Borghese, Uffizi).
- **R10 Heading over two lines** — a heading ending in a line break, then a plain line, is one heading and the
  title, over the tab title (Berlin: "## Donatello" / "Inventor of the Renaissance"; its tab titles can be
  misspelt or German). Joined with the tab title's own mark when it reads the same, else as the scraper joins.
  A date line is never the second half: Munich's "### Alte Pinakothek" over the dates is the house line (*Van
  Dyck*, *Boucher*).
- **R11 Range over three lines** — a date, a line holding only "to" or a dash, a date (Berlin).
- **R7 Clean passage** — a repeated line is kept once; HTML character codes become characters (Acquavella
  "Mir&oacute;"). `decodeEntities`.

## The passage — what Claude is handed to describe

Shared rules first, as titles and dates (her decision). The page is read by its structure, as the scraper reads
markup: the reply keeps paragraphs, headings, lists and quotations, and the reader once threw that away, so menus,
sponsor lists, opening hours, captions, event listings and cookie notices reached Claude on most pages. Now
(`takePassage`, AL-061):
- **Paragraphs:** a paragraph's lines are one paragraph (Musée des Arts Décoratifs prints a line per few words); a
  sentence wrapped over paragraphs a line each joins up (Enfilade's PDF). A lead paragraph set as a heading is a
  paragraph (KMSKA).
- **Never the show's text:** a list, a quotation, a table; a paragraph that is not prose (under eight words, or no
  sentence that ends: labels, names, logos, addresses, hours); a picture's caption or description (`isCaption`: "(detail)",
  a size, "Gift of …" with a year, a medium with a year and no verb, "Charcoal drawing of …", a title in capitals);
  the show's title again; a line shouted in capitals.
- **Junk sentences** go, a sentence at a time: the scraper's `BOILERPLATE` (one copy, `scraper/boilerplate.js`) and
  `LINK_JUNK`, what whole-page text carries that the scraper drops by markup — funders, tickets, members' offers,
  times, visiting and access notes, links' own words, cookie and newsletter notices, credits. An initial's full stop
  ends no sentence (`sentencesOf`): Frick's funder list once lost its first half and kept its tail.
- **Where it ends:** four paragraphs or 2,000 characters, the scraper's cut (her decision). A heading for other
  matter (other shows, events, the shop, press, the newsletter, sharing, the footer: `OTHER_MATTER`) ends it once
  the show's text is in; "Related …" above the text is skipped (Getty). A box's heading (tickets, visiting,
  supporters, films, pictures: `LINK_BOX`) ends it only after 600 characters: Kunsthaus carries its text on below
  its ticket box with no heading; below the Alte Pinakothek's text come its tours.
- **An online feature's section** ("Online special") is passed over to the next heading: Rijksmuseum's, narrated by
  Joanna Lumley, sat between its introduction and its show, and Claude described the feature.

Read on every proof page, the 18 new-museum pages off the list, Wallraf, the three blog pages and her three saved
pages: each passage is the show's own text, nothing else. Known residue, show-related: an event's blurb in the
show's own section (Cincinnati's dance video), a series' blurb (Getty's PST ART). Each proof page's passage is
signed off on the list (first and last 60 characters; `--write-passages`). Venue rules (`from`, `until`, `skip`,
`minLine`) stay where a page's layout is its own.

**Orsay and MoMA's changed passages:** the old reader let junk in at the edges, and those edges moved. Orsay's page
now carries a YouTube cookie notice; with it taken out, the old reader gives the signed-off passage exactly. Whether
Orsay added it or Parallel now returns it is not known. MoMA's passage ended on a link to a catalogue excerpt, whose
wording MoMA changed. The new reader reads neither.

## Venue link rules

**San Marco** (`occ-museitoscana-cultura-gov-it`, her decision): the Tuscan state museums' site names itself
"Direzione regionale Musei nazionali Toscana"; under "Occasional", first, its cards say "San Marco" (`short`)
and the lookup searches as "Museo di San Marco" (`name`; AL-046d). Names written in — they would also name
another Tuscan museum's show on that site. Its titles are the
press-release headline (her decision). Shop: none (her answer). Proved live: *Beato Angelico*, *Rothko a Firenze*.

**Palazzo Ducale Genova** (`occ-palazzoducale-genova-it`) and **Palazzo Reale Milano** (`occ-palazzorealemilano-it`):
her names, written in (`LINK_VENUES`) — Genoa's page titles give none, Milan's name the city council;
second and third under Occasional (her decision). Palazzo Reale Milano's heading is "I Brueghel - Palazzo Reale
Milano" with the full name on a line below: `titleDrop` plus `nameInLines` (AL-048). Its /en/ pages print the
show's text in Italian. The city's site (www2.comune.milano.it) refuses Parallel (403) and has no cached or
archived copies: those links cannot be read.

**NGA has its own chip** (her decision): National Gallery of Art links (`occ-nga-gov`) are an occasional venue
in every other way, but sit under an "NG Washington" chip, never "Occasional", and their cards say NG Washington (`LINK_VENUES`;
AL-030). A leading "Exhibition:" is dropped from titles (her ask; *Hubert Robert, 1733–1808*): an `LINK_VENUES`
entry can carry `linkRead`, found by `linkReadVenue`. Proved live: five archive pages, title and dates (on
`docs/link_proof_pages.json`); descriptions carry menu and caption junk, left alone until it reaches Claude's.

**Mia** (Minneapolis Institute of Art): its own chip "Mia", cards print "MIA" (her decision); the full name and the
"–– Minneapolis Institute of Art" title tail are dropped (`LINK_VENUES`; AL-032, on the proof list). HTML
codes in any page title are decoded ("Chagall&#039;s"). **Yale CBA** (Yale Center for British Art, `occ-britishart-yale-edu`): its own chip
and cards "Yale CBA", after Cincinnati (her decision); the lookup searches by the full name (`LINK_VENUES`; AL-039).
Its dates carry clock times ("February 7, 2008, 10:00 am ET–Sunday, April 27, 2008, 5:00 pm ET"): the shared date reader drops them (`CLOCK_TIME`, DS-003).
Its shop: the Publications section on Touchnet (AL-042, above), confirmed in her app; *Constable* filed In the museum shop by phase 4b (SB-, `docs/app.md`). Proved live on the **Yale Shop Check** page, https://claude.ai/artifact/ETa9sqoU2fCfxkW2kHz2et (`node build/shop_check.js`: the app's code whole, the finder, Find catalogue and Re-check run on the case, graded in code). **Jacquemart-André**: the line under the heading is the
subtitle, read by code (`subtitleUnderHeading`); the dates sit at the page's foot, so the description is read
from under the heading.

**Berlin** (Staatliche Museen zu Berlin, `occ-smb-museum`): its own chip "Berlin", after KHM; cards say
"Berlin Gemäldegalerie" (her decision); its shop is searched as "Staatliche Museen zu Berlin" (`LINK_VENUES`). Dates are numbers with dots, day first (DS-004). On the proof list.
**Berlin Alte NG** (`occ-alte-nationalgalerie`, her decision): a second venue under the chip. A smb.museum page
files there by its path (`/museums-institutions/alte-nationalgalerie/`) or by the house line "Alte Nationalgalerie"
just under the dates (`afterDates`; Böcklin's page sits at `/en/exhibitions/detail/`); every other smb.museum
page files under the Gemäldegalerie as before — a shared site whose own host has a link venue falls back to it,
never a "doesn't say which museum" line (`linkVenue`). Proved live on her Böcklin and Cassirer pages and the four
Gemäldegalerie proof pages (AL-074). Its shop is found by the finder at its first link.
**Berlin Neue NG** (`occ-neue-nationalgalerie`, her decision): the same, by `/museums-institutions/neue-nationalgalerie/`
or the house line "Neue Nationalgalerie" under the dates (her Wols page, on the proof list; AL-074a).

**Munich** — three venues, each its own cards, under one chip "Munich", the Alte first,
before Berlin (her decision; `group`, `chipKey`): **Munich Alte Pinakothek**
(`occ-alte-pinakothek`), **Munich der Moderne** (`occ-pinakothek-der-moderne`) and **Munich Sammlung Schack**
(`occ-sammlung-schack`). The Neue is left out (her decision): its pictures hang in the
Alte and Schack while it is closed, and their pages name those. Titles the site types in capitals are recased,
each part alone (`capsTitles`, the scraper's `capsTitleParts` in `dates.js`; "da", "van" stay small mid-name;
CT-001). "Venezia 500<<" is the museum's own title.
- **Sammlung Schack has no shop**: its pages link none and CEDON has no Schack section. It carries no shop
  settings, so the finder's own search ends at "No museum shop found" (run live). AL-043h.
- **Which house** (`sites` with a house `line`, `linkVenue`): a pinakothek.de show page prints its house on the line between title
  and dates ("Alte Pinakothek", "Pinakothek der Moderne | Art", "Sammlung Schack"); that line files the show and
  is never offered as a subtitle. A page naming none is a line, not a card. The Pinakothek der Moderne's own site files under it;
  it prints "10/07/2026 - 04/10/2026" above the title, day first (R13, `slashDayFirst` on der Moderne's entry).
- **Shops: CEDON**, a company running several museums' shops, a section per house
  (`museumsshop.cedon.de/Kataloge/Alte-Pinakothek-Muenchen`, `…/Pinakothek-der-Moderne-Muenchen`), linked only
  from the museums' house pages. Searched in German, one query per house (`shopQueries`: "<house> München
  Museumsshop Kataloge"; live: Alte's section 1st in 3 of 3, der Moderne's 4th in 6 of 7; the English queries
  never found der Moderne's). A shop site outside the museum's domain counts when its own address names the
  house (`shopNamed`, `namesVenue`) — the other house's section there does not. On for these two venues only:
  a general rule needs every link venue's shop search re-checked live first. CEDON's search: `search?search=` (AL-044).
  A CEDON book page often sells German and English on one page, with a language choice — the lookup
  does not yet know this (`docs/catalogue_versions.md`, cases 10–11).
  AL-043.
- Proved live: show pages on the proof list (both sites, every house), and the app's own finder run on
  the live searches with excerpts withheld, so it opened each pick: both sections found, the Dana Schutz page's
  ticket-shop link (`pinakothek.shop`) not taken.

**Dresden** (Gemäldegalerie Alte Meister, `occ-gemaeldegalerie-skd-museum`): its own chip "Dresden", after
Berlin; cards "Dresden Gemäldegalerie" (her decision; `LINK_VENUES`). A page opens with a short
"# Hopper" above every SKD museum's menu; the show's own heading follows "Active page:" and is the title
(`titleAfter`). Dates "14/04/2022—31/07/2022", day first (`slashDayFirst`). The site line ("Exhibition Site
Zwinger") never reaches Claude, as passage or subtitle (her decision; `skip`). Shop: shop.skd.museum sells tickets
and gifts only; the finder says "Shop found, but not its books section" and she answers **No shop** once (her
decision; lookups go to the web). On the proof list; AL-045.

**Chantilly** (Musée Condé, `occ-chateaudechantilly-fr`): its own chip "Chantilly", after Jacquemart; its cards keep
the name Claude gave, "Chantilly Musée Condé" (her decision; `LINK_VENUES`; AL-081).

**Moretti** (`occ-morettigallery-com`, her decision: a Moretti rule, not a shared one): the place after " : " leaves
the title ("… : Monaco"), and the title, then wholly in capitals, is recased; its description, typed in capitals
under small headings, is kept (`capsText`); the passage ends at "Manage cookies" (AL-083).

**A link to a quarantined show** reads "Read 1 link, but nothing to add — already in your quarantine." when every
show read is quarantined (her wording; AL-080); otherwise "…your ledger already matches it" as before.
Its English pages print "From 8 March to 15 June" with no year (the French pages carry it): undated, with the
sweep's own note quoting what the page shows (`unusableDateText`, shared; her decision; AL-082).

**Frankfurt** (the Städel, `occ-staedelmuseum-de`): its own chip "Frankfurt", after Dresden; cards "Frankfurt
Städel" (her decision; `LINK_VENUES`; AL-049). No pages on the proof list yet. **Its shop**
(`liebieghaus.ticketfritz.de/Shop/Index/staedel-publikationen/43885`, linked "Kataloge online kaufen" from the
Städel's Museumsshop page): the books and prices are in the page's own HTML, but Parallel's reading of it
stops after the menu ("A- A+") — neither JS-rendered nor blocked (proved: a keyed fetch beside a direct one).
Each book is a line with a quantity box, no page of its own. **Two facts written in, her decision** (the app
cannot tell a Parallel fault from JS-rendering): the section (`shopCatalogues`, offered on the shop screen for
her to confirm; AL-049a), and `shopUnseen: "parallel"` — a shop page with no priced line, read whole, says
"The museum shop contents cannot be seen — Parallel fault", Re-check the same (FS-001–005, on Parallel's live
answer). Once Parallel returns the books, the shop is read as usual (FS-004); the rule stays until removed.

**A shop drawn by script — her decision.** The finder meets such a shop as a front page only, or a section it
cannot confirm holds books, because the page's contents never arrive. When she brings one to a session:
1. **Prove the cause first:** fetch the shop page's own code directly. An empty frame and a script, no books or
   prices, is drawn by script. Books in the code mean our reading is at fault: fix the finder or reader instead.
2. **Write in the best section the shop has** — its catalogues section, else books, else the best it offers —
   on the venue's `LINK_VENUES` entry (`shopHome`, `shopCatalogues`), with `shopUnseen: "script"`. A
   hard-coded answer: say so to her.
3. **Its lookups** read "The museum shop contents cannot be seen — JS-rendering", search the web for the book,
   and the card's "Museum shop" link is the written-in section, for her own search (`shopLink`, `shopButtonUrl`;
   BS-004). Re-check the same.
4. **If she has already answered the shop screen for it** (No shop), the store's record is reset with her yes:
   `shop: "found"`, the section, `foundBy: "the venue's rule"`, unconfirmed, so her next import shows it to confirm.
**Basel** (`occ-kunstmuseumbasel-ch`, under Occasional) is the first: `shop.kunstmuseumbasel.ch` is an empty frame
and one script; Parallel returns only its cookie notice. Section written in:
`shop.kunstmuseumbasel.ch/en/merchandise?category=Exhibition+Catalogues`; its stored No shop reset with her yes
(BS-001–003, on Parallel's live answer).

A venue's page can carry its own options (`linkRead` on its `MUSEUMS` entry; her decision: Parallel-only rules
live in the app, never the scraper). They only tidy what Claude is handed. Options: `title`, `titleDrop` (a
label before the show's name), `dateLine` (dates from the first line matching, anywhere), `from` / `until`
(passage starts after / ends at a matching line), `skip` / `skipEntities` / `minLine` (lines left out),
`cleanLink` (address loses query and fragment), `crumb` (title from the breadcrumb when the page never prints its tab title), `titleAfter` (the first heading after a matching line is the title), `capsTitles` (titles typed in capitals recased), `capsText` (a passage typed in capitals is kept, Moretti). `skip` lines are never offered as a subtitle either. An
occasional venue takes them from its `LINK_VENUES` entry; read by `readShowPage`, `venueTitle`. Junk at the end of a
passage is tolerated (her decision).

- **met** — dates from the "on view" line (`dateLine`), anywhere on the page: a podcast transcript can push it
  past 60 lines, and an old-layout page prints it above the only line naming the show. *Matisse* (2012) prints
  no dates in its text at all.
- **Boston MFA** (`occ-mfa-org`, chip "Boston" under "Occasional", cards "Boston MFA", her decision) — dates
  printed on the line above the title (R13). Legacy Illuminated, Degas and Sargent are unchecked
  (the free tier refused).
- **frick** — a leading "Special Loan:" is the Frick's label, not the show's name (`titleDrop`).
- **menil** — a leading "Collection Close-Up:" dropped (`titleDrop`, her ask).
- **acq** — description = the "Press Release" text (`from`), headings and short caption lines dropped. Title =
  `# name` + the `##` line under it unless that is a place (New York, Palm Beach), joined as the scraper joins
  a card (`: `, a dash after a name with a colon). The gallery in brackets is not added: the scraper adds it
  only when one show ran in both galleries. Stored address loses `?view=…#…`. A layout with no Press Release
  skips lines with unread HTML codes (caption blobs). A `##` line opening "In collaboration with" is a credit,
  never a subtitle (her decision; *Calder | Miró*, `linkRead.credit`).
- **louvre** — title = the `##` and `###` lines joined (the `#` heading is those two run together); one `##`
  alone is the title. Passage: lines of 60+ characters, closure and late-opening notices skipped.
- **artic** — passage starts after the first "Share" heading, lines of 60+ characters; credit lines (©, "Photo
  courtesy", "Press 300ppi") and picture descriptions opening "A/An/The … painting/poster/cover … of/with/…"
  skipped. Passage ends at the closing "Share", a "Related" box or the newsletter (`until`): a photos-only
  page otherwise took another show's card as its description (*Violence and Virtue*; `noDescription`).
- **cincinnati** — a tab title the page never prints (a sentence: *Cagnacci*) gives way to the breadcrumb's last step (`crumb`). "Now–May 30, 2021" (*Anila Quayyum Agha*) is a closing date only, no opening date (her decision; the shared `dates.js`, DS-002).
- **brit** — passage starts after the shop line ("For the catalogue, homewares and gifts…", archive pages) or
  "Book tickets" (current pages).

Proof pages for every rule above: `docs/link_proof_pages.json`.

## San Marco's titles

Its pages are press releases (museitoscana.cultura.gov.it). The title is the headline's first sentence,
without "Mostra" or the quotation marks round the name, capitals recased (her decision; `firstSentence`,
`titleDrop`, `unquote`, `capsTitles`): *Rothko a Firenze*, *Beato Angelico*. Cards already in her ledger
change only when their link is read again (a Change card for the title and the description).

## Saved pages — the Pages button

For a site that refuses Parallel (her decision; Palazzo Reale Milano's pages on the city council's site,
`www2.comune.milano.it`, answer Parallel 403). Import offers CSV · Links · Pages. She chooses saved show pages
(Chrome's `.mht`/`.mhtml` from her phone, or `.html`); the app unpacks each to the text Parallel would give
(`savedPageReply`: headings as `#`, links as `[text](href)`; the photos and fonts packed in the file
dropped) and reads it with `readShowPage`, then the same intake as a link. No Parallel, no network.

- **The address** comes from the file (`Snapshot-Content-Location`, else the canonical link); a page that
  names none is refused, said so.
- **Behaves as the Links box** (her design): every page chosen at once; listed by title; kept in the page's
  store as text, one document each (`links_pages/…`), so the list survives a reload; Cancel, a rejected or
  undecided card put pages back; Clear empties list and store.
- **Palazzo Reale Milano on the council's site** files under `occ-palazzorealemilano-it` by path
  (its `sites` entry — a fixed rule, written in). Its options: the show's heading is the one ending
  "- Palazzo Reale Milano", "- Palazzo Reale, Milan" or "- Royal Palace of Milan" (`titleHeading`,
  `titleDrop`); dates and text stop at the "Upcoming Exhibitions" box (`datesUntil`, `until` — Soutine took
  the box's first dates); its English pages' "as of" reads as "to" (`asOfTo`; Antonello da Messina).
- **Months only** ("september 2027 - january 2028", Soutine): undated with the sweep's note, as anywhere (R15). The
  old rule here — first day of the opening month to the last of the closing one — is gone (her decision: it put
  dates on cards the venue never gave; the sweep never does).
- **Capitals** recased at this venue (`capsTitles`, her decision): CASORATI → Casorati; a title mixing
  capitals and ordinary letters in one part (I am LEONOR FINI) stays as typed.
- **Proof:** her saved pages, kept in `docs/link_pages/saved/` cut to the page itself (her decision: the
  site refuses Parallel, so live proof is impossible). Tests AP-001–010 (`add_by_page.js`).

## Someone else's page — a show held elsewhere

A last resort (her decision): a show so old its venue's page is gone, read off a blog or magazine page
(her Enfilade link, Canaletto at the Queen's Gallery).
- **The venue is Claude's to find** (her decision): for a site the app has never seen, Claude is sent the
  page's address and the date line read, at the top as the showing the card is for (her Enfilade Canaletto page
  went to Edinburgh, the next showing listed, 9 of 9 reads until it was), and asked which museum that line names, and whether the address is that
  museum's own site. **Only when it says not** is Claude asked a second question (`elsewherePrompt`): the
  museum's website and the show's full title — nothing only a blog page needs is asked of a museum's own page
  (her decision). Code files it (`heldElsewhere`): one of hers by name or site, else a new Occasional venue under
  its site (by name when Claude knows none). A venue named in the page's own site, or the site Claude gives being
  the page's own, keeps today's filing. The site Claude gives is its knowledge, not read off the page. Sent no
  address, Claude called her Reynolds links (Enfilade's PDF, Meer) the Wallace's own pages (AL-052g).
- **The title is Claude's too on such a page** (her decision): someone else's page title can be anything, so
  a show held elsewhere takes the full name Claude reads from the text (Enfilade's PDF was titled "Joshua
  Reynolds"; AL-052h). The 2,000-character cut applies: she sends pages with the show near the top.
- **A label before the show** in the page title ("Exhibition | …") is dropped, and a dash-led site tail
  read first (`splitPageTitle`, `TITLE_LABEL`). **Tracking tails** leave a saved page's link too, as a pasted link's
  (`withoutTracking`). Tests AL-050–052, on her pages as Parallel returned them (`docs/link_pages/elsewhere/`).
- **The Borghese's archive site, approfondimentimostre.com ("Insights 1998 / 2026")**, files under her Borghese by
  this route, nothing written in (her decision: test Claude first, hard code only if it fails): on her Correggio
  page Claude named the Galleria Borghese and the site as not its own, three reads of three. Parallel answers 202
  for most of its pages though the site serves them to anyone — "The page contents cannot be seen — Parallel
  fault. Import the full saved page." (`pageUnreadWhy`, AL-067); those come in by Pages. Her way of working: the
  Borghese's own page first (title and text, but undated); the archive page by Pages only when the own page
  lacks what she needs.

## What links are for, and how far the reader reaches

- **At a swept venue** a link is for shows before the 1 July 2024 lookback, or a venue she
  has stopped sweeping (too few keepers per sweep) — never a show the scraper has or will
  have. Otherwise, occasional venues. **No exclusions apply to a link** (her decision):
  displays and collection shows are added too.
- **The general reader works at 17 of the 28** once the eight rules are in (checked on 67
  live pages: one archive, one current each, plus her 10 occasional links). Still short:
  acq, rijks, borghese, louvre, uffizi, mam, mad, ashmolean, artic, brit, dellav. **Her
  choice: only acq, louvre, artic and brit get work** (deep archives); the others may never
  come into play. A page printing no year ("5 June to 25 October") still fails — blank
  dates are NOT approved, and "current year" would misdate archives.
- **Titles from a page title** (AL-015): the show is the first part of a barred title, the
  site the last; a bar inside the show's own name ("Duccio | Caro") is kept, read off the
  page's heading. A page title that dresses the heading ("Exhibition Giovanni Bellini in
  Paris") gives way to the heading.
- **A link from one of the 28 files under that venue**, known by its site from the
  scraper's recipes (`VENUE_SITES`, written by `build/sync_shared.js`; the Tates told apart
  by path). A new venue's shop is looked for once per Read, never once per link.
- **Claude reads relevant passages, not the first N characters** (`pickPassages`): lines
  naming the book or show, catalogue/ISBN/price words, or a link onto the venue's shop come
  first. A link labelled "catalog" onto the venue's shop, in web results, is taken in code
  (`catalogueLinkOn`).
