# Architecture

## Files
| Path | Purpose |
|---|---|
| `index.html` | The whole game: CSS, markup and one script (an IIFE). No framework and no build step. |
| `data/series2026.js` | Series data, loaded with a plain `<script>` before the game and exposed as `window.SERIES_2026` (see [data.md](data.md)) |
| `img/couples/*.jpg` | Cartoonified BBC press shots, one per couple |
| `scripts/` | Python tools to refresh the series data from Wikipedia |
| `tests/` | Playwright end-to-end tests (see [testing.md](testing.md)) |
| `routines/` | Instructions for scheduled Claude runs (see [routines.md](routines.md)) |
| `.github/workflows/` | `test.yml` (tests on every push) and `release.yml` (GitHub releases) |

## State
Everything lives in one object, `S`, saved to `localStorage['strictly-v2']` after every change (`save()`).

| Key | Meaning |
|---|---|
| `players[]` | `{id,name,color,av,here}`. `here` means playing this week. |
| `couples[]` | `{id,name,out,scores[],look?,photo?,artMode?}`. `out` is the week they left. `scores` are weeks played in the game. |
| `judges[]`, `presenters[]` | Names, plus `style`, which picks the judge's cartoon and catchphrases (0 Shirley, 1 Motsi, 2 Anton, 3 Craig) |
| `week` | The week in progress, or `null` (see below) |
| `history[]` | Finished weeks: `{n,theme,winners[],out[],sick[]}` |
| `rounds[]` | Every couple's guesses, for Fun Stats: `{w,c,d,r:[4],g:{pid:[4]}}` |
| `season{}` | Per-player season totals: `{pts,weeks,wins,name,color,av}` |
| `tmp` | The four numbers being entered on the current keypad |

On load, the saved state is merged over `defaultState()`. One-off migrations run straight after: judge order, and `applySeries()`, which fills in the couples, eliminations and renames from the series data.

## A week's phases (`S.week.phase`)
```
setup → pick ⇄ dance → guess (per player) → real (live paddles) → reveal → board ─┐
          ↑___________________________________________________________________|  (next couple)
                                                         … last couple → wrap → elim → (week closed)
```
- **setup:** week number, theme, who's playing, which couples are 🤕 not dancing. Announced dances are pre-filled from `SD.upcoming`.
- **pick / dance:** choose the couple on the floor, then the stage. With one couple left, it goes straight to dance.
- **guess:** players take turns in a random order (`week.order`), and skipping a player removes them from `order`.
- **real:** one judge at a time. `liveConfirm()` lifts a paddle, `liveRecalcPlayers()` updates tallies, and tapping a paddle (`jFix`) corrects it. `liveCommit()` scores the round.
- **reveal:** the total, banner and presenter quips (`liveFinish()`).
- **wrap:** the podium. `commitWeek()` adds season points, rounds and history at this point, once per week (`week.committed`).
- **elim:** "Who went home?" `finishWeek()` marks leavers and clears the week. If the real elimination is already in the data, the week closes itself on load.

## Rendering
`render()` rebuilds `#view` from the view function for the current overlay or phase (`vHome`, `vSetup`, `vDance`, `vGuess`, `vLive`…). Clicks are handled in one place: a delegated listener switches on `data-act`. Text inputs with `data-bind` write straight into state without re-rendering, so focus isn't lost. The live paddle screen updates the DOM in place, because a full re-render would replay its animations.

## Devices
`touchUI()` (pointer: coarse) swaps in tap-only keypads, so the device keyboard never covers the screen. Media queries tighten the layout for phones (≤600px), the stage for short laptop windows, and the judges' screen.

## Debug hooks
`window.__strictly` exposes `{scoreStats, seriesDances, presetFor, factsFor, makeQuips}`, and `window.__strictlyPhase()` returns the current phase. The tests use both, and they're handy in the console.
