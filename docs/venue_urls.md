# Venue listing URLs — all 21

**Source:** Cat Watch Sweeper Brief v2 (September 2026), Section 4, stored beside this
file as `Cat_Watch_Sweeper_Brief_v2.docx`. Added to the repo 11 Sep 2026 — it had
never been committed, on any branch, so the addresses for the 15 unwired venues
existed only inside a Claude chat.

**These addresses are hers, not discovered.** Changing one is her call, and the brief's
own rule applies to the scraper too: fetch the exact URL listed, never construct one
from a pattern.

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

## Venue traps the brief records

Carried across because they are facts about the sites, not instructions to a chat
sweeper, and each one will bite the scraper the same way.

- **`met`** — past page shows only the most recent year behind a JavaScript menu.
  Older years are unreachable and **that gap is accepted**, not a bug to solve.
- **`uffizi`** — marked UNVERIFIED in the brief: the site was down when it was
  written and the address has never been tested.
- **`capo`** — Italian only, no English page. The brief warns it **may block
  automated fetching**.
- **`dellav`** — current shows only, 1–2 at a time.
- **`khm`**, **`va`**, both Tates — **no past archive exists.** An empty past page is
  the correct answer, not a failure.
- **`tate-modern` / `tate-britain`** — one shared What's On page. Entries are tagged
  by venue; take only the matching tag. This is the tag hook CLAUDE.md relies on for
  known bug 2.
- **`brit`** — the current page mixes exhibitions with events.
- **`moma`** — main MoMA only, never PS1.
- **`va`** — South Kensington only, never V&A East or Young V&A.

## Three conflicts with CLAUDE.md Section 6c, unresolved

Section 6c carried "known URL corrections from Sep 2026 testing" that disagree with
the brief. **The brief is older, so the corrections are probably right — but they were
recorded against the fetch tool, not the scraper, and nobody has retested.** Do not
silently pick one: try the brief's address first, and if it fails, try the correction
before declaring a venue unreachable.

| Venue | Brief says | Section 6c correction says |
|---|---|---|
| `louvre` current | `/en/explore/exhibitions` | `/en/exhibitions-and-events/exhibitions` |
| `louvre` past | one page | **four** pages — base plus `?date=2024`, `?date=2025`, `?date=2026`; its year filter is server-side, so it genuinely works |
| `menil` current | `/exhibitions/current` | `menil.org/exhibitions` |

## What is NOT carried over

The brief is written for **Chat Claude driving a fetch tool**, and much of it describes
that arrangement rather than the venues: the one-search-to-unlock rule, the two-step
greenlight, the hand-brake that stops the whole sweep at the first bad page, the 12-word
summary cap, and the CSV file-naming scheme.

None of that applies to the scraper, and some of it is now actively wrong:
- **The hand-brake is the opposite of the scraper's design.** A blocked venue must be
  logged, marked in the CSV and stepped past, so a run reports on all 21.
- **12 words was superseded** — measured against her own seed summaries, the cap is
  **ten** and the shape is a noun phrase.
- **"These links have been verified as fetchable"** was true of the fetch tool in
  September and says nothing about whether a site answers this scraper today. That is
  exactly what the ping run exists to find out.

The brief keeps its own value as the fallback procedure for venues the scraper cannot
reach, since Chat Claude comes from a different network.
