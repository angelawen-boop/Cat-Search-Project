# Venue listing URLs — the original 21, from the Sweeper Brief

**Source:** Sweeper Brief v2, Section 4 (`Cat_Watch_Sweeper_Brief_v2.docx`
beside this file). **These addresses are hers.** Changing one is her call; fetch
the exact address, never construct one from a pattern. Venues added from 24 Sep
are in their recipes only.

**Where a URL repeats across columns the venue puts everything on one page** — visit it
once and take all three states from it.

| Code | Venue | Current | Upcoming | Past |
|---|---|---|---|---|
| `met` | The Met, New York | `/exhibitions` | same | `/exhibitions/past` |
| `ng` | National Gallery, London | `/exhibitions` | same | `/exhibitions/past` |
| `rijks` | Rijksmuseum | `/en/whats-on/exhibitions/now-on-view` | same | `/en/whats-on/exhibitions/past` |
| `acq` | Acquavella | `/exhibitions` | same | same |
| `louvre` | Louvre | `louvre.fr/en/explore/exhibitions` | same | `louvre.fr/en/exhibitions-and-events/past-exhibitions` |
| `uffizi` | Uffizi | `uffizi.it/en/event-category/exhibitions` | same | same |
| `borghese` | Galleria Borghese | `galleriaborghese.cultura.gov.it/en/mostre/presenti/` | `/en/mostre/future/` | `/en/mostre/passate/` |
| `brera` | Pinacoteca di Brera | `pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=in-progress` | `…&date=scheduled` | `…&date=archive` |
| `capo` | Capodimonte | `capodimonte.cultura.gov.it/mostre/` | same | same |
| `dellav` | Gallerie dell'Accademia | `gallerieaccademia.it/en/node?page=1` | none | none |
| `khm` | KHM, Vienna | `khm.at/en/exhibitions` | `khm.at/en/exhibitions/upcoming` | none |
| `moma` | MoMA | `moma.org/calendar/exhibitions` | same | `moma.org/calendar/exhibitions/history/` |
| `frick` | Frick Collection | `frick.org/exhibitions` | same | same |
| `morgan` | Morgan Library | `/exhibitions/current` | `/exhibitions/upcoming` | `/exhibitions/past` |
| `menil` | Menil Collection | `menil.org/exhibitions/current` | `/exhibitions/upcoming` | `/exhibitions/past` |
| `artic` | Art Institute of Chicago | `artic.edu/exhibitions` | `artic.edu/exhibitions/upcoming` | `artic.edu/exhibitions/past` |
| `brit` | British Museum | `britishmuseum.org/exhibitions-events` | same | `/exhibitions-events/past-exhibitions` |
| `wallace` | Wallace Collection | `wallacecollection.org/whats-on/` | same | `wallacecollection.org/explore/past-exhibitions/` |
| `va` | V&A | `vam.ac.uk/whatson/?type=exhibition` | same | none |
| `tate-modern` | Tate Modern | `tate.org.uk/whats-on` | same | none |
| `tate-britain` | Tate Britain | `tate.org.uk/whats-on` | same | none |

## What the brief says, checked against the scraper

The brief's addresses are the starting record; **the recipes in `VENUES` are
what is swept**, and where they differ the difference was read off the live site
(`docs/venues.md` §8). Brief traps that still hold:

- **`dellav`** — current shows only, 1–2 at a time (its listed address 404s;
  the home page carries them).
- **`khm`, `va`, `tate-modern`** — no past archive exists; an empty past page is
  correct. (Tate Britain's past is read from its calendar — her ruling.)
- **Tate** — one shared What's On page; the site's own filters separate the two.
- **`brit`** — the current page mixes exhibitions with events.
- **`moma`** — main MoMA only, never PS1. **`va`** — South Kensington only.

Brief notes now overturned: the Met's older years ARE reachable (one page per
year); Uffizi works; the Louvre and Menil addresses were corrected when wired.

**Not carried over:** everything written for Chat Claude driving a fetch tool —
the unlock rule, the greenlight, the hand-brake (the scraper logs a failure and
steps past it), the 12-word cap (superseded by ten, measured) and the file
naming. The brief's remaining value is as a fallback procedure for venues the
scraper cannot reach.
