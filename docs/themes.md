# Themes — art books by theme, not by exhibition

Her design brief and her decisions. Not open work until she says.

## Why

A different kind of art book: one that follows no exhibition — for example fashion as
shown through art (Watteau, rococo women). These books **must not mix with the ledger's
presentation**: they are not exhibitions and are not shown among the cards.

## What she wants

- **A wishlist, in effect.** Each book shows: cover, title, ISBN (`xxx-xxxxxxxxxx`),
  publisher, and the same four bookseller links the cards carry (Amazon AU, AbeBooks AU,
  Alibris, Booko AU).
- **"How out of stock": by publishing date.** The book's publication date is the signal of
  how close it is to going out of print.
- **Add a book by:** its ISBN; a link to its page; or a page she saved — for a site that
  blocks bots but has good book information, such as AbeBooks.
- **Find a book by:** ISBN.
- **Themes, kept apart:** a separate tab for themes. A book can sit under **more than one
  theme**.
- **Drag and drop the covers** to rearrange them, the way a Kindle library's grid of covers
  is rearranged (her "bonus points").
- **Covers:** she is happy to try options. Uploading covers herself is fine, but aim for
  something easier and more hands-off.

## Her decisions

- **An extension of Cat Watch, on its own page only while it is a prototype.** It looks and
  behaves like Cat Watch: its palettes, fonts, header, button row, chip rows, pop-ups and
  footer, copied control for control — never a look of its own. Only its rose sets it apart.
- **No check against the ledger.** Themes stay fully separate from Cat Watch.
- **One drag order for every book**, whichever theme is showing — the simpler choice, for
  now; she was unsure between one order per theme and one for everything.
- **Start simple: no bells and whistles.**
- **Later add-on, not now:** Claude searching for more books on a theme.
- **Cloud save only, for now** — no file Export or Load on the page (the code is kept).
- **No instruction lines anywhere on the page** — no how-to text, no placeholder text in boxes.

## The prototype — Theme Shelf

**Live: 3** at https://claude.ai/artifact/V5jWKh9F8cFqNQek2owyzT (private; republish to that
url — `node build/build_shelf.js` builds it and prints the url). Source `Theme_Shelf.jsx`
on branch `claude/theme-shelf`, not on `main`. Tests: `npm run test:shelf` (TS-001–009).
Shared code (ISBNs, booksellers, saved pages, palettes, link buttons) is copied from Cat
Watch by `build/sync_shelf.js`; `npm test` fails if the copies differ.

**Her design, as built:**
- **Grid:** cards in Cat Watch's style; publisher, ISBN (typewriter face) and the year alone,
  as Cat Watch prints them; booksellers without "AU". Books across: phone 2 with details, 3
  or 5 covers only; computer as many as fit, 5 or 7 covers only; underlined 2/3/5/7 beside 🔍.
- **Owned or Wishlist:** every book is Owned unless wishlisted. A card's three dots open a
  narrow menu in place with one line, Wishlist (the gem with inner lines); a wishlisted book
  shows that gem left of the dots; the same line takes it off. The book view's corner tag
  says Owned or Wishlist. Counts: Books · Owned · Wishlist; a Status row filters.
- **Add book:** Cat Watch's Import pop-up — ISBN, Links, Pages; one box size; Pages opens the
  file picker at once; Read, then the books found, ticked, then Add; Cancel centred.
- **Covers:** from a saved page only (link and ISBN bring none — she accepts that). Raw-byte
  and AVIF pictures are read (her Clothing Art save). Tapping a cover opens, top to bottom
  and centred: Remove (greyed with no cover), a book-shaped Drag box, Load, Cancel.
- **Themes:** a chip row; Add from library, Rename, Delete beside a chosen theme; a new
  theme opens the library list (ticks, Add, Cancel). Remove book is in the footer, as Cat
  Watch's Reset search. Source is always the last line of the book view.
- **Light-mode rose** #B24D6E (her pick); dark #D99AAE.

**Unproven:** adding by ISBN or link through her Parallel connector (never run live); tapping
Drag to paste on a phone; drag to rearrange on a phone.
