# Library — purchase tracking (future consideration)

**Her idea, brainstormed 27 Sep 2026. Not open work.** She may build it or
may not. **Never propose it, list it among open items, or start it** — she
raises it when she wants it. If she does: build only after the cloud-ledger
trial (§7.1 of CLAUDE.md) has merged to `main`, because this adds fields to
the ledger and two branches changing the ledger shape at once is what she
ruled out.

## What she wants

A record of the catalogues she buys: date of purchase, where from (museum
shop, Amazon, etc.), hard or soft cover, price, ISBN. The ISBN of the copy
she BUYS can differ from the one the lookup found — a British show printed by
Tate, bought in its American edition from Yale.

## The design as agreed

- **A separate Library tab**, purchases first. The exhibition tab stays as it
  is. Her framing: when she wants to review what she has bought and see
  patterns, exhibition-by-exhibition is the wrong shape.
- **Three views:** Shelf (cover grid, like Kindle's library), List (compact,
  sortable by date, venue, publisher, price), Patterns (spend by month,
  seller, publisher; hard vs soft; per currency).
- **A Wanted shelf** — her "v good idea": every card marked Acquiring: Yes and
  not yet bought, shown as greyed covers.
- **Each book has "Exhibition →"**, jumping to its card and opening it. If
  filters would hide the card, the jump clears them or says so — never lands
  on nothing. The card carries one line back: "Bought … · see in Library".
- **The link is by the card's `id`, never its title** (titles change on a
  rename). An exhibition no longer in the ledger says so; no dead button.
- **A book with no tracked exhibition** (a venue outside the 27, a show before
  July 2024) sits on the shelf with no Exhibition button.

## The purchase record

- **Its own ISBN**, separate from the lookup's `isbn13`. Neither overwrites the
  other. Displayed `xxx-xxxxxxxxxx`.
- **More than one purchase per exhibition** (two editions, a second copy).
- Date defaults to today; ISBN pre-filled from the lookup; source and cover
  type as chips (Museum shop / Amazon / AbeBooks / Publisher / Bookshop /
  Other; Hard / Soft); currency remembers the last one used.
- **Price stored as paid, in its own currency, never converted.** Totals per
  currency.
- **Existing Acquired rows** get empty purchase records, filled when she likes.

## Data safety

- Purchases are hers and derivable from nothing — they live in the ledger
  (her file and the cloud saves), per the three-container rule in §4.
- A sweep Import must never touch them.
- The safety-snapshot comparison before Load / Reset must count them as a
  difference.
- Each of these needs a fixture.

## Covers — tested 27 Sep

Test page, separate from Cat Watch, kept by her choice:
**https://claude.ai/artifact/S7aB8Q1S26S4xnhT9WDDAH** (source:
`docs/library_cover_test.html`; store holds one sample cover and one picture
she added).

| Question | Result, on her screen |
|---|---|
| A cover loaded by address from another website (Open Library) | **NO** — the page blocks pictures from other hosts (platform rule, confirmed) |
| A cover a session saved into the page's store | **YES** |
| A picture she adds, shrunk and saved to the store | **YES**, and it survives a reload |

- **Covers live in the page's store, beside the live ledger** — her
  preference. One cover per store document; limits are 256 KiB per document
  and 5,000 documents per page. A total size cap for the whole store is not
  documented and not measured.
- **Both test pictures were blurry.** Box 2 because Open Library's copy is
  5 KB; box 3 because the test shrinks to 400 px wide — a sharp screen needs
  about double. A sharp cover is estimated at 60–120 KB, unmeasured.
- **Whether exported ledger files carry covers** is undecided (it would make
  them much larger).

### Where covers come from — unsettled

She has ideas of her own; ask her before choosing.

- **Open Library** had no cover for the ledger's one ISBN (*Hidden Faces*,
  978-1588397751) nor for the Rijksmuseum's 2023 *Vermeer* catalogue.
  Coverage of exhibition catalogues looks thin.
- **Google Books** refused without a key (keyless quota 0 from the
  container). A free key would open it; coverage untested.
- **The museum shop's product page** almost always shows the cover — a guess
  at the best source, unproven.
- The page cannot fetch a picture itself, so a cover reaches the store either
  from a session (fetch, then write to the store) or from her adding one.

## Still open, hers

- Postage as its own field, or inside the price.
- Paste an order-confirmation email → the model reads out price, date, seller,
  ISBN as plain strings; code writes the record; she confirms. Wanted or not.
- In-app field editing is on the rejected list (§4, §8). That ruling was about
  exhibition data, which is fixed at the source; purchase data has no source
  but her. Confirm with her that the ruling does not cover this.
- Later, maybe: what the catalogue costs now on AbeBooks against what she paid.
