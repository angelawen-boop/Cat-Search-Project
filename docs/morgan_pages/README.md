# Morgan pages, saved from her browser — 22 Sep 2026

`exhibition_tarot.mhtml` — `themorgan.org/exhibitions/tarot`, saved with Ctrl+S
from a tab she had open. No request was made to the Morgan to produce it.

**Read it with `email.message_from_bytes` and take the `text/html` part** — an
`.mhtml` is a MIME container, so a plain `grep` sees quoted-printable.

## What it gives us

The Morgan runs Drupal and names its fields, so the page is the tidiest of the
three blocked venues:

| Wanted | Where |
|---|---|
| Title | `h1.page-header span` — *Tarot! Renaissance Symbols, Modern Visions* |
| Dates | `.field--name-field-display-date` — `June 26 through October 4, 2026` |
| The exhibition | `article.exhibitions.full` wraps the lot |

No JSON-LD, so the engine's structured-data path finds nothing and every field
comes from the markup.

## The trap, and it would have cost a day

**`field--name-body` appears TWICE.** The first one is 29,000 characters above
the exhibition — it is the site header's Shop / Tickets / Search buttons. A
recipe naming `.field--name-body` gets three buttons as the curatorial text for
every Morgan row, on every page, and the summary would look populated rather
than empty.

**So the blurb selector must be scoped inside the article**, not matched on the
class alone. Same shape as the Wallace's `section--footer-spacer` and the V&A's
cookie panel: a class that means "a field" in general, believed as though it
meant this field in particular.

## Access, as of 22 Sep

**A real Morgan exhibition page has never been read.** Run A reached
`/exhibitions/current` and `/exhibitions/online` — a listing and a section of
the site. `/exhibitions/william-blake` was the first genuine exhibition page
tried, and by then the burst of unpaced requests had already lost us access.
That is still open.
