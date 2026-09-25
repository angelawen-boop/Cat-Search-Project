# The app — forensics

Everything about `Cat_Watch.jsx` that a session needs only when it is working
on that area. `CLAUDE.md` §4 carries the rules; this carries how they were
arrived at and the evidence behind them.

**Read this before changing the catalogue lookup, the intake screen, the
quarantine, the sweep log, or saving.** Each numbered lesson below cost a real
failure, and several were found by her rather than by a test.

---

## 1. Catalogue lookup

### The route as it stands (22 Sep 2026)

Each step runs only if the one before left something missing.

1. **Go to the venue's shop** — its catalogues page and its search box for the
   exhibition's title, opened together in one call. Take the book's own product
   page, never a list.
2. **Open that page** for the ISBN, the publisher and any publisher link.
3. **If the ISBN is still missing, search the open web.** Gaps only.
4. **If no publisher page came back, go to the publisher** — find their site
   from their name, then search inside it, then open what that returns.

Step one finding nothing sends it to the open web to decide whether a catalogue
exists at all. Results are tagged shop / web / none. Reseller links (Amazon AU,
AbeBooks, Alibris) are built from the ISBN when there is one, the title when
there is not.

### How it got here — four rebuilds, all caused by the same shape of mistake

**20 Sep: the connector switch.** The page used to call the Anthropic API
directly. The viewer's sandbox now blocks a page from reaching any outside
address, so the request never left — the diagnostic read `Network: Failed to
fetch`, which is the browser refusing, not a server answering. Nothing was
wrong with the key, the account or the prompt. It moved to her Parallel Search
connector (free, authless), with `sample` reading the results. Claude cannot
browse, so the connector finds pages and Claude only reads text handed to it —
it can never report a shop page that was not found.

**21 Sep: the lost shop lock.** The old search tool took `allowed_domains` and
was *unable* to look elsewhere, so "search the shop and nothing else" was
literally true. The connector has no such lock — only a `site:` hint inside the
query, which a search engine treats as a suggestion. The rebuild kept the
search and lost the lock, so stage one became a general web search dragging the
shop's address along with it. Nobody said so for days, and the screen went on
labelling it "shop".

*What it cost:* the National Gallery's *Zurbarán*. A general index ranks the
shop's LIST of every catalogue above the one book's own page. The whole-page
read then ran flawlessly on a list of 32 books, reported no ISBN, and filed the
list as her "Museum shop" link. **The book's own page was in the same results,
five places down**, printing 978-1857097399 in plain sight. Reproduced 21 Sep,
both halves.

*The correction to the first account of it:* the book's page was not overlooked
by the search. It was inside the eight results handed to the model, which read
them all and named the list anyway. **A choosing failure, not a search
failure** — which is why the answer was to stop choosing from a general index,
not to rank its results better.

*The fix:* `web_fetch` opens a page you name. It had been declared on 21 Sep
for reading a book's page and used for nothing else. `web_search` is now for
the three questions that really are searches — does this book exist anywhere,
where is its ISBN, where does this publisher live — never for reaching a page
whose address we already have or could work out.

**21 Sep: going to the shop made one answer smaller.** Acquavella's page for
its *Matisse* catalogue prints a title, a price and the exhibition's dates: no
ISBN and no publisher. While stage one was a general web search the number came
in from Rizzoli or a bookseller; once stage one went to the shop, finding the
book there ENDED the lookup. She spotted it because that row had had its ISBN
before. So a catalogue found with no ISBN now goes wide anyway (`fillFromWeb`)
— gaps only, and it cannot rename or relocate the title, the shop link or the
"in the shop" verdict. Fixtures C-039 to C-042.

The named steps, so a session can find them: `fillIsbn` re-opens the book's own
shop page to read the number and the publisher off it; `fillFromWeb` is the
gaps-only wide search above; `fillPublisherPage` goes looking for the
publisher's own site once the name is known, and fires only on a catalogue
found, with a publisher named, and no page yet — never to second-guess a link an
earlier step produced.

**22 Sep: a container is not the book.** Her diagnosis, from two of her own
lookups side by side. Whatever page the `site:` search returned was filed as
"the publisher's page" and the lookup stopped. For Rizzoli that was the book
itself and it read as the step working. **It was not working, it was lucky:**
Rizzoli puts the ISBN in its addresses (`rizzoliusa.com/book/9780847877645`).
Hannibal addresses a book with a Dutch slug plus a `#fragment`, and a fragment
is never sent to a server and never indexed — so the deepest thing any search
can return there is the section, `/en/fine-art`. Two different outcomes, one
label, nothing on screen saying which.

Her fix is one step and it is not a better query: **open the candidate.**

| What the page turns out to be | What is kept | Button |
|---|---|---|
| The book's own page | that address, `product` | Publisher |
| A list with the book on it | the book's own link read off the list, `product` | Publisher |
| Came back empty — drawn by script | the section, `container` | Publisher's section |
| Nothing to do with this book | next candidate, then the fallback | |

### The rules that came out of it

- **A link read off a list is checked, never trusted** (`deepLinkOn`): on the
  publisher's own host, and not the list we are standing on. A differing
  `#fragment` counts as a different address deliberately — that is precisely
  how Hannibal addresses a book (`#102642` English, `#102640` Dutch).
- **"Came back empty" is measured** (`pageIsShell`, 400 characters). The
  numbers come from two real pages read through the connector on 22 Sep:
  Hannibal's section returns **110 characters** — a sort control, a newsletter
  box and the web designer's credit — and an ordinary server-drawn shelf
  returns several thousand with every book's address in it. Nothing sits near
  the line.
- **No rendering fetch.** Only buried-product publishers reach this step, and
  only the client-drawn ones come back empty. A headless browser for a handful
  of Belgian art publishers is not worth building; the honest label is.
  `full_content` was tested on Hannibal and returns the same 110 characters —
  no hidden data block to rescue, so no cheaper route either.
- **Two candidates, not one.** Going back costs no new search — the results are
  already in hand. Two is the cap and it is stated, not tuned: the results came
  back ranked, so if the best two are both wrong the site does not have the
  book. The fallback is better than a lucky third guess because it cannot be
  wrong.
- **The ladder ends at the publisher's front door.** A book the site will not
  surface falls back to `https://<publisher>/` labelled **Publisher's website**.
  **Confirmed wanted by her, 22 Sep.** It matters most at Borghese, Capodimonte
  and the Accademia, which have no shop at all.

### Go to the publisher, do not search for them — her correction, 21 Sep

Four query strings were tried in a row to make a general index surface
`hannibalbooks.be`: publisher and title (returns Ovid — Penguin, Oxford,
Gutenberg, Wikipedia), publisher and ISBN, the bare ISBN, all three together.
That is exactly the pattern the same day had been spent removing from stage
one, and tuning it further would have been guessing with more words.

**Two steps, and the first is code's.** One search for the publisher's NAME
alone — a publisher's own site is the top answer for its own name — and the
domain is read off the results mechanically: a publisher's name is in its
hostname. Hannibal Books is `hannibalbooks.be`, Thames & Hudson is
`thamesandhudson.com`, Yale University Press is `yalebooks.yale.edu`. One
input, one correct answer, no model. Words every publisher shares — books,
press, publishing, editions, **university** — carry nothing and are dropped, or
any university press would match any other. Fixtures C-046 to C-051.

Then it searches INSIDE that domain for the title, and only results actually on
that host are read. `site:hannibalbooks.be Metamorphoses` returns four pages,
all on the publisher's site, including the book's own. Verified 21 Sep. A row
with no ISBN loses nothing here, unlike the query-tuning versions: the title is
searched inside one small site rather than against the whole web, where
*Metamorphoses* means Ovid.

**The map of publisher websites was offered and dropped, 22 Sep.** It was
proposed when name-to-domain looked like the failure point; her two diagnostics
disprove that — `publisherDomainFrom` resolved `hannibalbooks.be` and
`www.rizzoliusa.com` cleanly both times. If ever wanted it is a
**named-offenders list** for co-imprints (Rizzoli Electa, DelMonico Books ·
Prestel), never upfront scaffolding.

### Every outcome says which one it was

"No separate publisher page." printed whether the step had searched and found
nothing or **had never fired at all**. Her words: the silence could be *"search
function didn't even fire"*. `publisherNote` gives each rung its own sentence;
fixture C-069a asserts no two are the same.

| Outcome | What the card says |
|---|---|
| `product` | nothing — the button is the answer |
| `container` | The publisher's link opens the section this book sits in, not a page of its own. |
| `site` | The publisher's own site doesn't show this book — the link opens their home page. |
| `nosite` | Couldn't work out the publisher's own website, so there's no link to it. |
| `unnamed` | No publisher was named for this book, so none was looked for. |
| `selfpublished` | Catalogue is self-published by the venue. |
| none recorded | No separate publisher page. — old sentence, older rows only |

`publisherResult` records what the STEP concluded, not only what kind of
address came back — which is why it is set on the four outcomes producing no
link. A row from an older ledger has no result recorded and keeps the plain
label: inventing a claim about it in either direction would be worse than
making none. Fixtures C-052 to C-069a.

### A museum's own imprint is skipped entirely — her ruling, 22 Sep

The National Gallery's *Zurbarán* came back published by "National Gallery
Global", and the step spent two searches and a page read proving what was
already known: a museum publishing arm has no separate site, because its
publisher page IS the shop, which `cleanPublisherUrl` refuses by design.

**It is keyed on the PUBLISHER, never on the venue — her correction, and my
first version got it wrong.** I matched the publisher's name against the
venue's, so every Met and National Gallery catalogue would have skipped the
search. She named the two ordinary ways that breaks: **a blockbuster whose
catalogue the museum hands to a big art-book house**, and **a show mounted
jointly with another museum where the OTHER museum prints it**. In both a real
third-party page exists and the rule would have suppressed the search.

So `SELF_PUBLISHERS` is a list of two — `national gallery global` and
`metropolitan museum of art` — and it grows only when she adds one. Nothing is
inferred from a name's shape. Tate and the Rijksmuseum are NOT on it, and
*Metamorphoses* is the proof: a Rijksmuseum show printed by Hannibal. A miss
costs one search; a wrong entry costs a buy link. Fixtures C-070 to C-078a,
verified by adding Thames & Hudson and watching C-073 fail.

*One limit, stated rather than engineered around:* the sentence says "the
venue", true for every case we have. A Met-published catalogue for a show at
the Louvre would read slightly wrong — one word on one card, no lost link, and
fixing it needs the venue comparison this whole rule exists to avoid.

### The ISBN

**The missed ISBN — her finding 20 Sep, built 21 Sep.** The Met's *Musical
Bodies* catalogue was found in the shop and came back with no ISBN, which is
printed on that very shop page. The cause was structural: the connector returns
**excerpts**, not whole pages, so the small print below the fold was never in
what Claude read. It mattered because with no ISBN the reseller links search by
TITLE, and a title search misfires — *Musical Bodies* is unusual enough that
Amazon and AbeBooks found it anyway, but **Alibris returned the wrong book.**

**The gate in front of the page read is gone** — her ruling, 21 Sep, and she
was right that it was decoration. It used to open the book's page only when the
ISBN was missing. A shop's list of catalogues prints a cover, a title and a
price and never an ISBN, so after a shop lookup the ISBN is always missing and
the gate always opened. In the one case it stayed shut it did harm: it asked
about the ISBN alone, so a web result carrying an ISBN and no publisher never
opened the book's page and **the publisher was lost for nothing**.
`needsPageRead` now asks whether EITHER is blank. Fixtures C-009 to C-013a,
verified by putting the old condition back and watching C-013a fail.

**It fills a blank and cannot do anything else** (`applyIsbnFill`). An ISBN read
from search results is never second-guessed, a known publisher is never
overwritten, and a page yielding nothing leaves the row as it was.

**A collapsed section is reached, and that was her question.** The Met store
prints the ISBN inside a "Details" panel that opens and shuts. The text is
already in the page and the button only hides it, so a full read sees it shut —
verified against that page, 21 Sep: it returned the whole panel and ISBN
978-1588398130 with the panel collapsed. A shop that only GOES AND GETS those
details when clicked would still come back empty, noted, exactly as today.

**A 10-digit ISBN is taken and converted — her ruling, 21 Sep, and she
corrected me to get there.** The first build refused one, which was a limit I
put in rather than a fact about the number: an ISBN-10 is perfectly real, every
book printed before 2007 has one, and plenty of shop pages show only that.

*Her split, and it is the right one: display and search are different
questions.* All three resellers find a book from either form, so the conversion
is NOT for searching — it is for her screen, where the ledger has one field and
one format. `isbn10to13`. **The old check digit is verified before anything is
converted**, so a mistyped number is refused rather than turned into a
plausible wrong one — the same reasoning as `ymd()` proving a date exists.
`toIsbn13` is the only door an ISBN enters by; `cleanIsbn` stays the strict
13-digit gate everything downstream reads. Both prompts ask for the ISBN
exactly as printed and forbid the model converting it — that is code's job and
a model's arithmetic is not checkable. Fixtures C-017, C-019 to C-025.
**Linking straight to an Amazon product page from an ISBN-10 was offered and
declined.**

### The publisher's own page came back — her finding, 21 Sep

The same rewrite that dropped the shop lock. The app has always had a Publisher
button and the ledger has always had a field for it. The 20 Sep rebuild asked
neither prompt for it and wrote `null` into the row every time, so **the button
could never appear** and nothing said so.

It matters most at the three venues with no shop. A museum shop sells its
catalogue while the show is on; the art-book house that printed it often lists
the book long after the shop has sold out — which is the window this whole app
is about. Borghese, Capodimonte and the Accademia have no shop at all, so the
publisher's page is the only real "buy it here" link they can ever get.

**Checked, not trusted** (`cleanPublisherUrl`): a real web address, refused if
it sits on the venue's own shop — that is the shop link wearing the wrong label.
There is no list of art publishers to check against and inventing one would be
the phrase-list mistake again. Fixtures C-032 to C-038.

**A missing button cannot report anything** — the third time this app has had
to learn it. The Publisher button is drawn only when a link was found, so its
absence read identically whether the step found nothing or never ran. The card
now ends the shop sentence with "No separate publisher page." in plain grey,
her wording and her placement.

### A step that died is not an answer — her question, 21 Sep

She asked how she would tell a rate-limited lookup from a book that genuinely
has no ISBN and no publisher page. **She could not.** Steps one and two fail the
whole lookup and say so; the three later steps were written to hand the row back
UNCHANGED when they fail. Right for the row, wrong for the screen: the card
printed "ISBN not confirmed" and "No separate publisher page." as though those
were findings.

Each later step now carries WHY it came back empty, and the screen says so the
moment it happens: the catalogue was found, the search stopped part-way, press
Search again. **It is not stored in the ledger** — a fact about one attempt,
not about the book. Fixtures C-043 to C-045.

**The connector's free tier really does refuse.** It stopped after roughly a
dozen searches in quick succession. **The limit for the keyless tier is
published nowhere** — Parallel documents 600/min for accounts with an API key,
a different thing. It clears in a few minutes and the refusal names the remedy.

### The cost, re-measured 21 Sep

Up to four searches and three readings, where it was two and two. **The searches
are free and the readings are not** — the connector needs no account but it is
a free TIER; every reading runs on her allowance. **Every step after the first
is conditional**, so a shop page that prints everything still costs one search
and one reading. Do not make the later steps unconditional, and do not flip to
searching wide first.

### A book leaving the shop — her ruling, 22 Sep

A row ever found in the shop read "In the museum shop" FOREVER, because nothing
compared one lookup against the last. **Catalogues selling out is the thing this
app exists to watch**, so the single event it most needed to show was the one it
could not.

**Her question first, because the answer is a real limit.** When she clicks
Museum shop and sees for herself that the book has gone, the app learns nothing:
the link opens a tab, and a page cannot see what comes back in a tab it opened.
That is a browser rule. So the status moves only when the app itself re-opens
that page, and only a lookup does that. **Her choice: on Search again and
nowhere else** — which costs no extra calls, because the lookup already re-reads
the shop page for the ISBN. A background check on every click was offered and
not taken.

| Last time | This time | What the card says |
|---|---|---|
| in the shop | not in the shop | **No longer in the museum shop.** — bold, dark red |
| not in the shop (or no catalogue) | in the shop | **Now in the museum shop.** — ordinary green |
| never searched | either | the plain sentence, no news |

**The return matters as much as the loss, and that half is hers.** A shop pulls
a page while a book is merely out of stock and puts it back; a museum simply
fails to maintain its own site. Both look like a loss and neither is permanent.
Same green as the plain sentence — **the word NOW carries the news**, and a
second colour would make a book coming back read as a different kind of thing
from a book being there.

**"Gone" is sticky, "back" is not**, deliberately. A book that left is still
gone on the next search, so the red survives a lookup that finds the same
nothing (`shopChange` remembers). "Now" is news and news expires: the search
after that reads "In the museum shop." again.

**A first lookup is not a change.** No previous state means neither sentence
fires.

The red is the "closed over a year" ink, already muted, already carrying a
dark-mode partner, no loose hex added. `shopChangeFor` and `shopHeadline` sit
outside the component so fixtures reach them; C-079 to C-090b, verified by
dropping the sticky half and watching C-084 fail.

### Shop addresses — checked one by one, 21 Sep

**Stage one needs the shop's own SEARCH BOX, and for 17 of 18 venues it was
never written down.** Before 21 Sep the app held a search address for four
venues only — met, ng, rijks, acq — and the National Gallery's was a **dead
page**. This was not lost in the connector switch: the version immediately
before it had exactly the same four. It was never built.

Every address below was checked by opening it and reading the results back.
`shopSearch` takes the exhibition title on the end. `shopCatalogues` is the
shop's own page listing its exhibition catalogues, opened FIRST in the same
call.

**Why both, checked rather than asserted — her challenge, 21 Sep.** The first
answer given was that the catalogues page only lists what is IN STOCK, so an
older catalogue would be missing. **That is wrong and is withdrawn.** A sold-out
book stays listed: the Menil's page holds 47 and shows all 4 of its sold-out
titles; the National Gallery's holds 36 going back to 2019.

*The real reasons are thinner and they are these two.* `uffizi` and `khm` have
no catalogues page at all, so the search box is their only route. And for
everyone else it is the cheap fallback INSIDE the shop — a catalogue filed under
some other section, or past the third page, would otherwise send the lookup
straight out to the open internet.

**The shelf was not found by guessing a pattern.** Each shop's own navigation
was read and the section it names itself was taken — "Exhibition Catalogues",
"Exhibition books", "Menil Publications", "Guide e cataloghi".

| Venue | Catalogue shelf | Search box |
|---|---|---|
| met | `store.metmuseum.org/books-toys-games/exhibition-catalogues` | `/search?q=` |
| rijks | `rijksmuseumshop.nl/en/books/exhibition-books` | `/en/search?q=` |
| ng | `shop.nationalgallery.org.uk/books/exhibition-catalogues.html` | `/catalogsearch/result/?q=` |
| acq | `acquavellagalleries.myshopify.com/collections/all` — its whole shop IS its catalogues | `/search?q=` |
| frick | `shop.frick.org/publications/exhibition-catalogues/` | `/search.php?search_query=` |
| menil | `bookstore.menil.org/collections/menil-publications` | `/search?q=` |
| artic | `shop.artic.edu/collections/exhibition-catalogues` | `/search?q=` |
| wallace | `wallacecollectionshop.org/collections/wallace-collection-publications` | `/search?q=` |
| both Tates | `shop.tate.org.uk/books/exhibition-books?sz=96` | `/search?q=` |
| va | `vam.ac.uk/shop/books/exhibition-books.html` | `/shop/search?q=` |
| louvre | `boutique.louvre.fr/en/products/400001-exhibition-catalogues/` | `/en/search/products/?q=` |
| brera | `bottegabrera.org/en/collections/guide-e-cataloghi` | `/en/search?q=` |
| moma | `store.moma.org/collections/exhibition-catalogues` | `/search?q=` |
| brit | `britishmuseumshoponline.org/books/exhibition-books.html` | `/catalogsearch/result/?q=` |
| morgan | `shop.themorgan.org/collections/exhibition-catalogs` | `/search?q=` |
| uffizi | **none found** — its books section would not show its contents | `shop.uffizi.it/en/?s=` |
| khm | **none** | `shop.khm.at/en/search?q=` — unverified, see below |

**No shop:** borghese, capo, dellav — these skip to the broad web search.

**A shelf that scrolls or paginates is still just more addresses — her question,
21 Sep.** The Menil's shelf shows 16 of its 47 books and offers three numbered
pages; the Morgan's has no buttons and simply grows as you scroll. **Both answer
`?page=2` perfectly well.** Tate's endless scroll answers a size parameter
instead, so `?sz=96` is baked into its address and it serves the lot in one page
— 40-odd titles where the plain address gave about fifteen. Verified on all
three.

**The depth is one number for every shop, never a count per venue** — the same
rule as `followPagination`, for the same reason: how many pages a shop has is
the shop's business and it changes. Three pages, over in the SAME call as the
search box, so depth costs no extra wait. A shelf longer than three pages is
read only to page three; the largest today is the Menil's 47. The search box is
unaffected — it narrows to one title and has never needed a second page.
Fixtures C-026 to C-031.

**The shops are not the museum sites, and five venues prove it.** `moma`, `brit`
and `morgan` refuse the scraper outright and `met` and `artic` are swept from
her laptop only — **yet all five shops answered the page reader first time.**
The scraper's blocks are on the museums' own exhibition sites and are about a
script driving a browser; the lookup is a different requester reading a
different hostname. **A venue being blocked for sweeping says nothing about its
shop.**

**KHM is the one that did not answer.** Its shop sends every request to a
waiting-room queue and the reader cannot follow that redirect. Wired in anyway:
a refusal costs nothing, stays visible, and blocks are not permanent facts.

**Only one venue needed a second look for a reason worth keeping.** The Met's
results page reads as empty unless you ask it for the right thing — the products
are in the page, the reader's first summary simply quoted the navigation. **A
thin answer from a page is not proof the page is thin.**

### The model question — closed, her ruling 22 Sep

**There is one app, one file, and it names no model.**

*What the question WAS.* The app used to call Anthropic directly with a model
string, and the only thing it used a model for was the catalogue lookup — so
"Haiku or Sonnet for the JSX" and "which model does the lookup" were one
question, written down once as a one-line to-do and **never argued**. Her memory
of no debate is correct. The original is in `afa25d1`: *"Catalogue lookup tuning
— Haiku vs Sonnet, on known-tricky catalogues."*

*Why it is moot.* The page cannot reach any outside address, so it does not
choose a model at all — it asks the viewer's Claude through `sample`. The only
dial is `modelTier`: quick / default / complex, and every one of the lookup's
six `readResults` calls passes `default`.

*Why `default` stays.* Those six reads are judgement on real text — which of
eight results is the book, is this page the book or a shelf, is that ISBN in the
small print. **`quick`'s failure mode is exactly the misreading this route spent
two days fixing**; `complex` costs more on each of up to three reads per lookup.
Nothing has misread in her testing, so **there is no signal to tune against.**

*There was never a Sonnet branch — checked 22 Sep, not remembered.* Every branch
local and remote has been searched: **one `.jsx` file has ever existed in this
project's whole history.** The "identical Sonnet copy" the guide used to
describe was a Claude Chat artifact, never a branch and never a file here.
Retiring it is hers to do, by deleting the chat. (The `sonnet_*.json` files under
`scraper/output/` are compression job files, unrelated.)

**One model string survives, in dormant code, and it stays until she says
otherwise.** `askDrive` carries `model: "claude-sonnet-4-6"` — the only model
name left in the app. It sits in the Google Drive save routine, which nothing
has called for months, alongside a Claude cloud save reaching for a
`window.storage` that does not exist.

**A session deleted that whole cluster without asking, and she caught it —
22 Sep. It is restored, byte for byte.** The reasoning was that the code was
orphaned and carried the string the ruling was about. Both facts are true and
**neither was permission**. Her question was the right one: *"did you ask me
first if I never want to consider using Google drive for backup ever again?"*
No. **Unreachable is not unwanted**, and the narrow change that WOULD have
served the instruction — take out the model string, leave the routine — was
never put to her.

---

## 2. Saving and loading

**Loading and saving (v8.3).** She holds the only real copy of the ledger; the
app is the workspace. Open → empty portal, no auto-loading; Import → pick file.
Status line: calm neutral on fresh load, loud red **UNSAVED CHANGES** after any
change, calm green **✓ Saved — safe to close** after Export. **Export IS Save.**
Import and Reset ask before replacing unsaved work.

**Saving was rebuilt 20 Sep** because the viewer's sandbox now blocks any
download a page starts for itself, `<a download>` included — *"File downloads
aren't available for this artifact"*, from the host, not us. Her save function
was never wrong; the ground moved. Two routes, differing in what is KNOWN:

1. **The runtime's file handoff** (`downloads`, declared at publish — a chat
   session rendering the file will NOT declare it, which is why no session could
   give her a working Export). Asks her, then saves or **rejects**.
2. **An ordinary browser download** (plain page). Cannot tell a finished
   download from a cancelled one from a refused one, so it **does not clear the
   unsaved warning** — not knowing is reported as not knowing.

**Never put back a click-triggered green tick.** It used to fire on the click
(Claude's download prompt had a Cancel the app couldn't see); on 20 Sep that
showed "Saved — safe to close" while nothing was written — the worst thing this
app can do. On route 1 the save resolves or throws, so the tick now means a save
happened.

---

## 3. Refreshing, the intake screen and the bands

**Refreshing (v9.2).** The app does the thinking; she approves each change. A
sweep CSV goes in via **Import Sweep** (named Import Refresh until 25 Sep); the app compares it against the ledger
with no internet access and shows proposals as cards grouped by venue, applying
only what she accepts. Types: **Add**, **Fill/Change** (per-field accept/reject,
escape hatch "this is a different show"), **Couldn't be filed**. Bad data is
always surfaced with a note, never dropped. Refeed workflow: reject bad rows,
fix only those cells, refeed the whole file; already-applied rows stay silent.

### Reading a stitched file — signed off on real files 20 Sep

One CSV carries every machine's output, so the app reconciles rows against each
other before the ledger. Her design: the stitch stays dumb, all judgement lives
in the app where she sees it.

- **Marker rows are not proposals.** Matched on the verbatim sentence `Marker
  row, not an exhibition.`, not the bracketed title (a formatting guess); they
  become a coverage panel. As Add cards they returned on every future sweep
  forever, because rejecting is not remembered.
- **Duplicate rows fold on venue + URL, nothing else.** Gaps fill silently; a
  genuine disagreement becomes a CHOICE card, fuller value ticked and marked a
  guess, both shown. Folds are disclosed in the notes so the card count
  reconciles with the file.
- **Rows with no URL never fold.** The only other key is the title, and
  `sameExhibition()` returns true whenever either side lacks dates — fine
  against the ledger (she sees each proposal), fatal here where it fires first.
  An unfolded duplicate costs one visible card; a wrong fold costs an
  exhibition.

**Odd cases come first, batched by kind, in four bands** (her ruling, cut from
six):

1. **Marker rows**
2. **Combined rows** · identical rows de-duped or reconciled
3. **Combined rows** · identical rows conflicted — yours to choose
4. **No exhibition url** · link goes to the venue's listing page

Easiest first: she is spending attention, not compute, so clearing what needs
nothing leaves more for what does. Batched by kind (a venue can appear twice) so
she finishes one kind of thinking before switching. Venue headings sit inside
each band. **Every band opens and closes; the default is what the band asks of
her, never its size** — markers and combined-agreed open closed (she can't act
on either), conflict and no-url open open. The count sits on the header, so a
collapsed band can't hide that it holds something.

**Two earlier bands were deleted, each wrong differently:**

- **"Two different answers" was a phantom.** A conflict is only ever found by
  holding two rows side by side, and `foldDuplicateRows` flags every card it
  builds, so a conflict that did not come from a fold cannot exist. It shipped
  empty, was listed in the guide as one of six, and nobody ran a file to notice.
  Fixture 17 now asserts every conflict it produces came from a fold.
- **"Unusable rows" was the wrong end of the pipe** (her ruling). A row with no
  title or no venue code is a DATA FAULT whose only outcome is "re-run the
  sweep" — a message to the session, not to her pile. `scraper/qc.js` stops it
  upstream and the app refuses the **whole** file, naming the lines (importing
  the rest would silently drop the faulty row's exhibition). A bad DATE is
  different — the row is still an exhibition, so it is blanked and noted.

**Band membership is the fold's own flag, never words in the notes.** It used to
search notes for "same exhibition" — which `noteTravellingRuns()` also writes —
so Acquavella's two real *Portraiture* runs (two addresses, nothing combined)
were filed as "combined for you". `analyzeProForma` sets `merged` from
`mergedFrom` and the band reads that. Fixture 16.

**The pre-pick on a conflict card is `fuller()` (longest wins), meaningless for
a date** — two 10-char dates tie, so it keeps file order and presents that as a
choice. Meaningful for a description (stub vs real text) or a title. **Her
ruling: leave it**; ticking nothing on a date conflict was offered and declined.

**Order inside a venue in "Normal cases"** (her ruling): fills, then edits, then
new exhibitions; newest CLOSING date first within each; no-closing-date at the
bottom of its group. It was file order (the order the scraper read the pages),
so an edit to something she owns sat between two new shows and she switched
between "is this change right?" and "do I want this?" every few cards. Closing
date because that is the field the app is about.

### The ledger will not move until every card is decided

A hard block, not a warning (her ruling). `applyRefresh` used to skip an
undecided card silently — not applied, not remembered, back on the next sweep;
with 320 cards that is a session's reading gone on one tap. Her words:
*"otherwise I envision total chaos if I can skip. this is SLOW mode at the
moment."* A warning she can wave through is the same failure one dialogue later
— do not re-propose confirm-and-continue. The button says what is missing ("323
still to decide"), the undecided figure accent-red beside it, rather than going
quietly grey.

`countDecisions` moved OUT of the component (a gate a fixture can't reach is a
gate nobody checks). **Rejecting is deciding** — a turned-down Add, a
quarantine, an edit whose every field she refused; counting those as undecided
would make the button unreachable for anyone who rejects anything. Fixtures 18
to 18f. **Finding the undecided ones:** every venue heading carries its own
count and the footer count is a button that opens the venue with the first
undecided card and scrolls to it. The badge appears only where work remains (the
screen "can easily become overengineered"). Gate and jump share one rule —
`countDecisions` calls `isUndecidedCard`; fixture 18g asserts they agree, or the
app is a dead end.

### Counts, and the one that can fail

"319 proposed changes found" is uncheckable, because rows leave the pile for
three innocent reasons (marker, fold, already-matching), so a real loss looks
identical. The header carries the split by type, a count on every band, and one
line that accounts for every row read — her wording, two sentences, each ending
in the number the next starts from:

```
From 415 rows in the file — 9 marker rows, 0 duplicate rows reconciled/de-duped,
86 already matching ledger = 320 entries considered for import
From 320 entries — 14 fill a gap, 7 edit existing data, 299 new exhibitions
```

A quarantine adds a "you'd said never to add" term. **Every term stays** — drop
one and the arithmetic stops closing, which is the only thing these lines are
for. The bands sort by SHAPE and the types cut across them: a new exhibition
assembled from two duplicate rows is in the combined band, not "Normal cases".

### Sorting, timestamps and dividers (v9.3)

Most likely to look "broken" later when it is working as designed.

- **Timestamp scheme — do NOT "simplify".** Every import stamps **one shared
  time for the whole batch**. A new import gets an `addedAt` only; `editedAt` is
  set only when a later sweep changes an existing entry. The ~110 seed entries
  have no timestamps at all — a permanent "Original set" floor. This is the only
  way to tell this import from earlier imports, imported-but-never-edited, and
  the seed.
- **Date ladder:** just opened → on now → dates unclear → announced → closed
  <3mo → 3–6 → 6–12 → over a year. "Dates unclear" between "on now" and
  "announced" is her explicit choice.
- **Recently added** bands: This import / Earlier imports / Original set.
  **Recently edited** bands: This import's edits / Earlier edits / Never edited /
  Original set — one more, because there are two kinds of not-in-an-edit-batch.
- Default post-import view floats the touched batch to the top under one "Rest
  of the list" divider, vanishing on any sort click.
- **"Announced last"** applies to the Wanted filter only. **Acquiring filters**
  are AND across the three axes, OR within one.

**Urgency tiers** are computed live from dates versus today (`tierFor`). No data
written, no internet call.

### Other screen rulings

Venue headings in "Normal cases" are the CONTROL, not a label: accent red,
larger, own count, disclosure triangle, sentence case (caps "a bit
aggressive"), with one **Collapse all / Expand all** over the venues that have
cards. The quarantine shelf is **12.5px in the body ink** (was 10.5 and muted —
"tiny AND faint" — and it is a list of decisions she may need to undo); "Put
back" is **"Remove from quarantine"**; the toggle reads **"Quarantine - 3"** on
its own row (a standing decision, not part of refreshing). A quarantine that
can't save is a **banner, not a footnote** — it borrows the unsaved-changes
banner and is ungated on a ledger being open. **"n to decide" sits beside the
venue's own count, not at the right-hand edge**, so the eye doesn't cross the
screen to pair a number with its venue.

### Dark mode

Her request: *"it's 9pm and this cream background with light grey text is v
difficult to read."* A **Dark / Light** button sits by Import Sweep; first
visit follows the machine's setting, her explicit pick then wins on that device
in browser storage (a per-device comfort, not ledger or sweep-log data; every
touch wrapped because it can throw). **Every colour is named** (`PALETTES`,
`TIER_SETS`) — the bulk of the work, since a stray hex left behind is a cream
patch on a dark page that looks fine in light mode forever. The dark set is not
the light set inverted: warm near-black ground, warm off-white text, `soft`
deliberately lighter (her complaint was grey-on-cream and the reverse is as
easy); urgency badges have their own dark set. **The shell paints a ground
before React runs**, following the browser until the component sets
`data-theme`, or a dark machine flashes cream on the way in.

---

## 4. Quarantine — built 20 Sep, rehoused 20 Sep

**Dismiss is not a rubbish chute.** She dismisses only exhibitions that are
**real**, **not duplicates**, and that she has looked at and isn't interested
in. Junk must never enter the ledger.

Before quarantine there were two outcomes and neither fitted junk: **Reject**
stores nothing, so the row proposes itself again on every future sweep forever;
**Accept then dismiss** puts it in the ledger permanently.

**Keyed on normalised URL**, venue + title where a row has none.
`analyzeProForma` drops a matching row in pass one, before it can fold with
anything; Add cards have a third button.

**It lives in the page's store AND in her export — her ruling, option C, 20 Sep,
and the correction matters: it was NOT built before the sweep log moved out of
the ledger. Both were the same session.** She won the argument for a third place
and the thing sitting beside it was left in the ledger anyway.

**Her scenario is the whole case, and she found it by reasoning about the design
rather than by hitting it:** quarantine two junk rows, Reset to the seed, feed
the SAME sweep file again — and every piece of junk is back, because the only
record went with the ledger she replaced. A feature whose promise is "never show
me this again" cannot depend on which file happens to be open.

**But it is not the sweep log either, and that is what forced two homes rather
than a move.** The sweep log is safe living only in the store because it is
DERIVABLE — every fact in it comes from a sweep file, so losing it costs one
re-import. Quarantine is derivable from nothing. That is the same property that
keeps the LEDGER out of the store.

**Her objection, kept because she was right to raise it:** *"it's messy and lazy
to just loop in a bunch of redundancies."* It is not two hopeful copies. The
store is the working copy that always applies, the export is the backup, and one
rule settles every disagreement — the shape her ledger already has.

**The rule is latest decision wins, which needs tombstones.** Releasing a row is
RECORDED, not merely absent, or loading an older backup would silently re-block
something she had released — the sweep log's own bug one door along.
`mergeQuarantine` is the single rule; the ledger file keeps the plain `ignored`
list it always had, so an older backup loads unchanged and a newer one stays
readable to an older build. The panel shows with no ledger open, because it is
in force before any file is loaded, and a store that cannot be written says so
rather than silently blocking nothing. Fixtures 20 to 20g, verified by reversing
the comparison and watching four of them fail.

**It is COUNTED, never silent** — the row identity on the intake screen gains a
"you'd said never to add" term. And it is **listed at the top with Put back on
every row**, because a quarantine she cannot see is a silent loss.

**A venue retitling its own listing does not undo her decision** — same address,
new title, still blocked. Fixtures 10 to 13.

What it is for: dead links, non-exhibitions, genuine duplicates. **Not** undated
shows — a real exhibition with no dates is fine to accept.

---

## 5. The sweep log

**It lives OUTSIDE the ledger** (her ruling). Test: an older backup said "Met
last brought rows 18 Sep", today's said 20 Sep — but a sweep either ran or it
did not; opening an older file can't un-run it. The distinction: CONTENT rolls
back with a backup (fewer exhibitions, her marks as they stood — correct), a
FACT ABOUT THE WORLD must not, and the sweep log is the second kind sitting in
the first kind's container. (Two rejected arguments for keeping it in the
ledger: "a careless republish could destroy it" — that can wipe the seed too;
"the shell has nowhere to keep anything" — false, the platform gives the page its
own store. And she keeps one ledger, versioned by her backups, not several.)

**What it is:** one document in the page's own store, one line per venue, 21
lines, never growing; survives Reset, present before any ledger opens, unmoved
by loading an old backup. `venueSeen` is no longer in the ledger file at all.
**It is a cache, not a master record** — which is what makes it safe somewhere
she cannot export: every fact comes from `swept_at` in a sweep file, so any
sweep file rebuilds it and losing it costs one re-import. The ledger can never
live there for that same reason — it is derivable from nothing.

**Rebuilding the store is code's job, not hers** (her ruling). With three sweep
files on hand she can't know which holds the lost picture — and sweep files come
from a session anyway, which can write the store directly with `ArtifactData`.
`scraper/sweep_log.js` reads every pro forma CSV under `output/` carrying
`swept_at` and prints the document to write; order can't change its answer,
which is why it is code and not a habit. Fixtures S-001 to S-006; S-004 holds it
against the JSX's own `mergeSweepLog` so the two can't drift.

**The headline "Last refreshed" line read the ledger, not the store** — it was
`lastRun`, stamped at Apply and kept in the ledger, so a wiped store still
printed a confident time and an older backup rolled it back. Fixed per venue on
20 Sep but never carried to the line on top; it now takes the latest attempt
across all venues from the store. `lastRun` is still written to her export (so
an older build reads the file) and drives nothing on screen. The "By venue"
control used to render only when non-empty, so emptying the store removed the
control itself; both the row and the panel are now ungated on a ledger being
open.

**"Unknown", never "never"** (her ruling — a correctness point). An empty store
is not evidence no sweep ran: she may be looking at quarantined rows, which only
ever come from a sweep. Her wording "cannot be read from store" was declined and
the distinction kept — the store answered, and what it answered was nothing; a
store that can't be reached prints its own separate sentence. `page_renders.js`
asserts both lines on the opening screen in each of the page's two homes.

**Written when the file is read, not when she Applies.** It was at Apply (so
cancelling a review left no trace) — right while the log lived in the ledger,
wrong once it moved out: reading a sweep file is when the page learns the sweep
happened, accept or not. Her catch: *"I have to test this against the massive
csv? how am I going to go thru 320 entries?"*

**Merge, never replace.** A venue's line moves only when the incoming sweep is
LATER, so importing an old file changes nothing; the two halves (tried / brought
rows) move independently. Fixtures 15, 15a, 15b.

### The wipe-and-restore drill — passed 21 Sep, run for real

Nothing in the app can empty the page's store and nothing she can do by accident
will, so it was cleared from outside with `ArtifactData`. **The two halves come
back from different places and by different people, and that split is the
drill's whole content:**

| | Restored from | By |
|---|---|---|
| **Quarantine** | her export JSON, which is dated and timestamped | her |
| **Sweep dates** | the sweep files on disk, via `scraper/sweep_log.js` | the session |

**The second row was wrong until she corrected it.** It used to read "she
re-imports a sweep file", and she rejected it on two grounds, both right: she
would have to know which of several files held the lost picture, and sweep files
are handed to her by a session in the first place, so the job was never hers.

What ran: she quarantined two real rows (artic *Raqib Shaw*, louvre *Michelangelo
Rodin*) and exported; both store documents were read out and committed to
`docs/store_backup_2026-09-21/` as insurance, not as a restore route; the store
was emptied and the emptiness confirmed by reading it back; she reloaded, loaded
her export, and **quarantine came back as exactly those two rows**; the session
then wrote the rebuilt sweep dates in and she confirmed all 21 venues, the
Borghese and Capodimonte gaps and the three refusals all reading correctly.

**A `released` quarantine entry is a tombstone and does not survive the round
trip, correctly.** Her export carries only what is BLOCKED, so the Met row she
had quarantined and released minutes earlier came back absent rather than as
"released" — the same state, differently recorded.

**The drill found a real bug, which is what a drill is for** — the headline
freshness line above. Neither the fixtures nor any amount of reasoning had
caught it, because it only shows when the store is empty, and nothing had ever
emptied it.

**The export will not carry the sweep log — her ruling, 20 Sep, asked and
declined.** It could be done safely with quarantine's own latest-wins rule, and
it buys one step she was taking regardless, at the cost of putting a fact about
the world back inside a document that rolls back — the exact shape of the bug
she caught.

---

## 6. The seed set

~110 exhibitions read 20 Aug 2026, covering met / ng / rijks / acq only. Baked
into the JSX, shown via Reset. Stripping it has been rejected.

**The seed is thin on history at two venues, and it is not a matching bug —
measured 20 Sep when she asked why so many "new" exhibitions were arriving at
venues she had already seeded.**

| | Seed | Sweep | New cards |
|---|---|---|---|
| met | 51 | 106 | **56** |
| rijks | 20 | 37 | **18** |
| ng | 25 | 27 | 2 |
| acq | 14 | 15 | 2 |

Of the 59 seed-venue Add cards for shows that had ALREADY CLOSED before the seed
was built, **58 are genuinely absent from it** — checked loosely by title, not
just by key. And of the 74 met+rijks Adds, **69 came from PAST listing pages**
and 5 from current/upcoming.

**The cause:** the seed was gathered by Chat Claude with a fetch tool that reads
a page before its JavaScript runs, so it saw the current programme and almost
none of the archive. ng and acq are behaving exactly as expected for a month's
gap; met and rijks are the whole difference. Her lookback being ~mid-Aug 2024
rather than 1 July 2024 accounts for 7 rows of it.

**Nothing to fix. Do not re-diagnose this as a matching failure.**

---

## 7. Tests

**`page_loads.js` asks whether the app LOADS; `page_renders.js` asks whether it
DRAWS** (added 20 Sep — the first thing this repo carries dependencies for:
`react`, `react-dom`, `jsdom`, dev only, never shipped). The load check is only
a floor: it passed twice while the published page was black, because a palette
defining itself throws on first RENDER, not on load. `page_renders.js` builds
the page as the build does, renders into jsdom, runs effects, reads the opening
screen back — twice, plain then with the Claude runtime answering, so a fault in
a capability path is not invisible. Proved by putting the real fault back: the
load check still passes it, render fails both passes.

`scraper/fixtures/intake_cases.js` — **62 checks**: the two that must NOT merge,
the quarantine rules, the freshness facts with their sweep dates, the row
identity, the whole-file refusal, the phantom band, the ledger gate (18–18g),
the sweep-log merge (15a, 15b), the quarantine's two homes (20–20g).

The harness lifts the intake out of the JSX by ANCHORS, not line numbers (one
file, no build step; the alternative is a second copy that drifts).
`scraper/fixtures/intake_sample.csv` — 76 rows, 8 venues from real sweeps: one
venue with both marker and real rows, two markers-only, four real-only, and a
Louvre block covering every conflict shape.

**Deliberately not built:** bulk-approve, in-app field editing, and the mirror
case where the app proposes Add but it is really an update.

---

## 8. The inversion — worth preserving

The originally-easy and originally-hard problems swapped: she expected ingestion
trivial and the portal hard, but the React portal was straightforward and **data
gathering is structurally hard because it depends on the outside world's current
architecture**. Consequences that hold:

- The app already built is what she keeps — no data-gathering solution forces a
  portal rebuild.
- **The data-gathering layer is swappable underneath**, never replacing the app.
- When a session drifts toward "rebuild the app around a new backend" or
  "downgrade the app to fit the tools" — neither.
