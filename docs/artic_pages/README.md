# Art Institute of Chicago — pages she saved

| File | Saved | What it settled |
|---|---|---|
| `exhibition_history_2024.mhtml` | 23 Sep 2026, from her browser | The site's main menu (`nav.g-header__nav-primary`) carries a "Featured Exhibition" card — Mary Cassatt — on every page, which the recipe's selector matched, so the show was "also listed" on all eight archive pages. Every exhibition in the archive sits inside `main#content` (`ul.o-row-listing > li.m-listing`). Recipe scoped with `within: ['#content']`. |

The container is refused by this venue, so the current and upcoming pages have
not been read with the scope applied. If `#content` does not hold their
listings, those pages collect nothing and leave marker rows — visible on her
pile, never silent.
