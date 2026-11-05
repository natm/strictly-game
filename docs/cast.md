# Presenters, judges & lines

## Where things live (all in `index.html`)
| What | Code |
|---|---|
| Judge cartoons | `avatar(j, i, mood)`, chosen by `judge.style` (0 Shirley, 1 Motsi, 2 Anton, 3 Craig). Moods: `idle`, `happy`, `meh`, `sad`. |
| Judge speech bubbles | `JUDGEQ` (catchphrases by score band), `judgeBubble()` (compares with last week, "SEVEN!"), `judgesReact()` (Snap! and "Harsh!"), `craigBoos()` |
| Presenter cartoons | `presenterAvatar(i, mood)`: 0 Emma, 1 Josh, 2 Johannes, 3 Dave Arch (band leader) |
| Presenter lines | `QUIPS` (per presenter, by tier: `top`/`great`/`ok`/`low`, plus `split`/`best`/`worst`), `JOSH`, `JOSH_JUDGES`, `JOSH_FACT`, `EMMA_KIND` (hugs and tissues), `JOHANNES_PRO`, `NEWHOST`, `BREATHLESSQ`, `BANDQ` |
| Stat lines | `scoreStats()` finds what's notable (perfect, first 10, personal best, best of a dance, crash or rocket vs last week…), and `STATQ` / `STATQ_EXTRA` hold the lines for each |
| Picking who speaks | `makeQuips(real, guesses, order)` runs once per couple and stores the result on the result, so a reload replays the same lines |

`{tokens}` such as `{first}`, `{pro}`, `{total}`, `{topJudge}`, `{hi}`, `{lowJudge}`, `{lo}`, `{dance}`, `{craig}`, `{craigScore}`, `{prev}`, `{last}`, `{diff}`, `{fact}`, `{best}` and `{worst}` are filled in by `makeQuips`.

## A new series
1. Write a new `data/series2027.js` (same shape, see [data.md](data.md)) and point the `<script src>` at it.
2. Update `scripts/update_series_data.py` with the new Wikipedia page name, and give the series its own `localStorage` key or a season reset.
3. Make cartoons, photos and facts for the new couples. Claude can do this with one subagent per couple from the BBC and Wikipedia pages.

## A new judge or presenter
- **Names:** `defaultJudges()` / `defaultPresenters()`. Saved games keep the old names, so add a small migration like `migrateJudgeOrder()`.
- **Cartoon:** add a style to `avatar()` (judges) or `presenterAvatar()` (presenters).
- **Lines:** the biggest job. Write the presenter's `QUIPS` entry and any personal pools, or a judge's `JUDGEQ` entry.
- **A different number of people:** the code assumes 4 judges and 3 presenters (`ids=shuffle([0,1,2])`, arrays of 4 scores). Changing that touches the keypads, the reveal and stats.

Recommended before 2027: move the cast (names, cartoon settings and line pools) into the series data file, so changing the cast becomes a data edit.
