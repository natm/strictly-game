# Routines

The [`routines/`](../routines/README.md) folder holds instructions Claude follows on a schedule. Each run is a fresh session on this repo.

| Routine | Schedule | Does |
|---|---|---|
| [update-series-data.md](../routines/update-series-data.md) | Scheduled: Sundays and Mondays, 09:32 UK | Refreshes `data/series2026.js` from Wikipedia: scores, eliminations, next week's dances. Then tests, bumps the patch version, writes the changelog, deploys, and checks the live site. Stops without changes if there's nothing new or the data looks wrong. |
| [site-health-check.md](../routines/site-health-check.md) | Not scheduled | Read-only: runs the tests against what's deployed and checks the live site responds |

They need network access to `en.wikipedia.org` and push access to the `strictly-score-guess` and `gh-pages` branches. The `strictly-game` cloud environment has both.
