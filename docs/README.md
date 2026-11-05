# Developer docs

Keep Dancing! is a single-page browser game with no build step and no server. It's hosted on GitHub Pages and saves each family's game in `localStorage`.

| Page | What's in it |
|---|---|
| [Architecture](architecture.md) | How the app is put together: files, state, screens and phases, the main flows |
| [Series data](data.md) | `data/series2026.js`: couples, cartoons, facts and real scores, and how they're refreshed from Wikipedia |
| [Presenters, judges & lines](cast.md) | Where the cartoons and comment pools live, how stats feed the comments, and what to change for a new series or cast |
| [Testing](testing.md) | The Playwright suites (desktop, phone, tablet), how to run them, and how to write a test |
| [Releasing & deploying](releasing.md) | Versions and dance names, the changelog, GitHub Pages, the release workflow and the update banner |
| [Routines](routines.md) | Scheduled jobs Claude runs (series data updates, health checks) |
| [Analytics](analytics.md) | The optional cookieless analytics hook |

## Quick start
```bash
git clone https://github.com/natm/strictly-game && cd strictly-game
npm install            # Playwright, for the tests
open index.html        # or any static server; the game works from file:// too
npm test               # all end-to-end tests (desktop, phone, tablet)
```

Day-to-day work happens on the `strictly-score-guess` branch. Deploying means pushing that branch to `gh-pages`, and `main` gets changes through pull requests.
