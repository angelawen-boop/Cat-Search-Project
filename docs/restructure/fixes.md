# Session 3 — the four fixes left from item 4 (her decisions)

Working brief for the session doing them. When the work is merged, fold its record into
`docs/restructure.md` and delete this file.

## Her standard — read this first, it is the point of the brief

The restructure exists because the app holds several inconsistent rules for the same thing. They happen to
agree today; that is the problem being removed, never a reason to leave it ("nothing is failing" is not a
bar she accepts).

**What you solve yourself, without asking her:**
- **Anything the real world gives one answer to.** A price without cents is a price. A letter is the same
  letter however a site types it. An empty basket's total is not a book's price. Ask "what is this feature
  for, and is it doing it?" — if that settles it, it is settled.
- **A side effect of a fix is a flaw in the fix.** Find the fix that fixes it and has no side effect; keep
  going. Never "the fix broke a page, so nothing was done". If, after real attempts, you cannot find one,
  bring her what you tried and why each attempt failed — never a suggestion to do nothing.
- **An inconsistency with how the rest of the app already does the same job.** Make it consistent.
- **A test's answer key that the world has moved on from.** Its job decides what happens to it (item 4 below).
- **How to prove it.** The bars are hers and fixed: no show she holds is offered again as new; no venue's
  shop comes out worse; no page is read worse.

**Not one rule for everything.** Two parts that have different jobs may read differently (one needs only
the month, another the full date; a country whose venues really do publish no day). One answer where the
world has one; different rules only where the job is different — and then say what the different job is.

**What goes to her — only these:**
- a choice of taste or of her own data: the words of a sentence shown on screen (word for word, before it
  is built), what a venue should include or leave out, a name SHE chose being replaced;
- anything that would change, delete or migrate her ledger or her store (her ledger is never changed);
- publishing;
- a real fork, where both answers are right in the real world and only she can pick;
- a fix you could not find (with what you tried).

**How to put it to her when you must:** abstract and describe. What the thing is for, what is wrong, what
you recommend, the one decision — a few plain lines. No code names, no symbols, no lists of venues, no
side-by-side dumps, nothing buried in a long reply, and never an undefined term ("title key"). Never bring
her a question whose answer is obvious, and never ask for a go-ahead to spread responsibility: the
responsibility for a fix being right is yours.

## The four items

1. **The special letters (ø, æ, œ, ß and the like) are read three ways:** the search box folds them to
   plain letters, title matching reads them as a gap, compression's title key drops them. Same job, one
   answer: fold them the same way wherever a title is simplified to be compared or searched.
   *Proof:* `build/keys_compare.js` on her ledger and quarantine (how to read them from her store,
   read-only: `docs/restructure.md`, handover record). The bars: every stored quarantine key and every
   starter ID unchanged; her ledger and every stitched sweep re-imported offer the same cards, none she
   holds offered as new. The simplified copies of a few titles WILL be spelled differently — they are
   made fresh on both sides of every comparison and stored nowhere, so that is expected: make the tool say
   so as a note, while it still fails on anything stored or on any card. A trial already passed these bars.
2. **One price rule.** The shop finder and the catalogue lookup each decide "is this a price?". Today the
   finder misses a price written without cents; the lookup's whole-page test counts an empty basket's
   total as a price. One rule for both: prices with or without cents, in every currency already listed; a
   price RANGE (a "filter by price" link) is not a price; a zero total is not a price.
   *Proof:* every venue's shop shelf page fetched live, old rule beside new, each difference read and
   right; then the shop finder itself run live on every venue (`scraper/shop_check.js`,
   `scraper/gallery_shop_check.js`; `docs/testing.md`): every venue's shop the same or better. A venue
   that comes out worse means the rule is not finished.
3. **A venue searched in its own language is searched under its own-language name.** One venue's full
   name is its English one, so its own-language catalogue search mixes two languages. Give it its
   own-language full name (its English name stays as its English name; card and chip unchanged), and check
   every venue that has an own-language search the same way.
4. **The proof pages** (`docs/link_proof_pages.json`) exist to catch a change to the READER that changes
   what is read. So when a website or Parallel's reply changes: if the reader reads the changed page
   correctly, the key is updated to reality; if it reads it badly, the reader is fixed (that venue's rule,
   unless she asks for a shared one) — the key is never bent to a bad reading. Four pages differed at the
   last live check; one of them now ends its text in a stray scrap, which is a reader fault. One page is a
   known Parallel fault and stays as listed. Fetch live; her keyed Parallel has her yes for this work.

**Also judge by the same standard, fix what is plainly wrong, leave what has a different job:** the sweep
log can record a blank "last tried" date for a venue first met through a file with no sweep time; one
internal tool drops a malformed row without saying so; `build/blocks_check.js` types its show IDs by hand.
Left alone on purpose, different jobs: compression's looser address key, the sweep-diff's fold, the
publisher step's own address strip.

## How this session works with the others

- **Session 2** ("Restructure w/ Fable 2 (LIVE)", `session_01SCEkH2qpKwmbr9293FG8tP`) is doing the main
  screen on `main` and will produce her test page. **Do not collide with it.**
- **Work only on the branch `claude/restructure-fixes`. Do not merge, do not push to `main`, do not
  publish**, until the moment below. Build and prove everything on the branch.
- **Contact Session 2 for one thing only: to learn when it is completely done** — every step of the plan
  finished and the test page given to her. It has been asked to message you then. Do not ask it for
  anything else, and do not start your merge on anything less than that message.
- **When that message comes** (she is then testing): bring `main` into the branch, settle any conflict
  yourself, rejoin (`node build/app_join.js`), run the gates, every proof above again and the full test
  run, then merge into `main`, push, and message Session 2 that it is in. Session 2 waits for you, then
  for her test report, before anything else.
- Tell her, in the plain style above, what went in. Her test page was built before your merge: say so, so
  she and Session 2 can decide whether it is rebuilt before 60.
- Her standing rules for this run hold (`docs/restructure.md`, "This run — her decisions"): a sub-agent,
  if you use one, one at a time, model named and no higher than Opus, effort medium; the watched test
  runner; nothing written to her store.
