# Series data

`data/series2026.js` sets `window.SERIES_2026` (read in the game as `SD`):

```js
{
  afterWeek: 6,                     // last week with scores on Wikipedia
  weekThemes: {"2":"Movie Week",…},
  judgeOrder: "Craig, Motsi, Shirley, Anton",
  couples: [{ slug, name, look:[celeb,pro], facts:{celebrity:[…],pro:[…]}, photo:"img/couples/<slug>.jpg" }],
  dances:  [[week, celebrity, pro, dance, [craig,motsi,shirley,anton]], …],   // every scored dance
  eliminated: [[week, celebrity, pro], …],
  upcoming: [[week, celebrity, pro, dance, music], …]   // announced for next week, pre-filled in setup
}
```

## Where it comes from
| Part | Source | Refreshed by |
|---|---|---|
| Scores, dances, themes, eliminations, upcoming dances | Wikipedia "Strictly Come Dancing series 24" | `scripts/update_series_data.py` (scheduled, see [routines.md](routines.md)) |
| Cartoon `look`, `facts`, couple photos | BBC profiles and press shots, Wikipedia articles, compiled by hand or by Claude subagents | By hand only. The update script never touches these. |

### Refreshing scores
```bash
python3 -I scripts/update_series_data.py --dry-run   # shows what would change, or NO CHANGE
python3 -I scripts/update_series_data.py             # writes data/series2026.js
```
The script fetches the page wikitext, parses it with `scripts/parse_series.py`, and checks that every dance's four judge scores add up to its total (it refuses to write otherwise). It then replaces `afterWeek`, `weekThemes`, `dances`, `eliminated` and `upcoming`.

### How the game uses it
- `seriesDances()` merges the real dances with weeks played in the game. It feeds presenter stats (personal bests, best of a dance, drops from last week), the "Series so far" chart on the stage, and the couples' season scoreboard.
- `presetFor(couple)` matches a saved couple to its data entry by name, or by celebrity name alone. That's how cartoons, facts and photos attach.
- `applySeries()` loads the couples on a fresh start, marks real eliminations, and renames older saves (for example, "John Nellis" becomes "John Nellis & Katya Jones").

### Cartoons
`look` is `{s, h, hs, o, fh, gl, ear, lip}`:
- `s`, `h`, `o`: skin, hair and outfit colours
- `hs`: hair style, 0–10 (`HSTYLES`)
- `fh`: facial hair, 0–3
- `gl`, `ear`, `lip`: glasses, earrings and lipstick flags

`coupleSVG()` draws them. Photo cartoons were made with the same filter as `cartoonify()` in the game (posterise plus ink edges).
