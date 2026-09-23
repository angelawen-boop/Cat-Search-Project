# Art Institute of Chicago — pages she saved, 23 Sep 2026

The site's main menu (`nav.g-header__nav-primary`) carries a "Featured
Exhibition" card — Mary Cassatt — on every page. The recipe's selector matched
it, so the show was "also listed" on all eight archive pages, 2023 included.
Recipe scoped with `within: ['#content']`.

| File | What it settled |
|---|---|
| `exhibition_history_2024.mhtml` | Every archive row sits in `main#content` (`ul.o-row-listing > li.m-listing`); the promo in the header nav |
| `exhibitions_current.mhtml` | 18 of 18 exhibition links inside `#content`; the only one outside is the menu card. Cassatt is ALSO inside, as a genuine current show, so it is still collected |
| `exhibitions_upcoming.mhtml` | 6 of 6 inside `#content`; only the menu card outside |

Saved pages rewrite the menu's own links to `#`; those are the save, not the site.
