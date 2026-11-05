# Strictly Score Guess 🪩

A family game to play while watching Strictly Come Dancing. Guess each judge's score before they give it!

- Runs entirely in the browser; progress is saved in `localStorage` (resume any time in the same browser).
- Remembers couples week to week; mark couples as sick/absent for a week and pick who left at the end.
- Season tables for players and couples. Export/import a backup from the "Couples, Players & Judges" screen.

## Play / host on GitHub Pages
1. Merge to `main`.
2. Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
3. Open `https://<your-user>.github.io/strictly-game/`.

Or just open `index.html` in a browser.


## Screenshots

| | |
|---|---|
| ![Home](docs/screenshots/home.jpg) **Keep dancing!** Load the 2026 couples in one tap | ![Who's up next](docs/screenshots/pick.jpg) **Who's up next?** No running order needed |
| ![Stage](docs/screenshots/stage.jpg) **Curtains up**: cartoon couples, the week's theme and "Did you know?" facts | ![Guessing](docs/screenshots/guess.jpg) **Guess the paddles**: type `8 9 8 9` and press Enter |
| ![Real scores](docs/screenshots/real.jpg) **The official scores**: enter each judge, confirm, and up goes the paddle | ![Reveal](docs/screenshots/reveal.jpg) **The reveal**: everyone's 🎯 or "2 off" lands live as each paddle goes up, with the odd "Fab-u-lous!" |
| ![Presenters](docs/screenshots/presenters.jpg) **Presenter banter** using real series stats (Josh is always snarky) | ![Leaderboard](docs/screenshots/leaderboard.jpg) **Leaderboards** for the family and the judges |

## Releases
Each release has a semantic version and a dance name (e.g. `v2.0.0 "Tango"`), shown in the game header and footer.
To release: bump `VERSION`/`RELEASE` in `index.html`, add a section to `CHANGELOG.md`, and deploy to the `gh-pages` branch.
The `release` workflow then creates the `vX.Y.Z` tag and GitHub release with the changelog notes (pushing a `v*` tag by hand works too).

## Credits
Photos and profile info: BBC Strictly Come Dancing. Scores, dances and facts: Wikipedia (CC BY-SA).
This is an unofficial fan-made family game and is not affiliated with the BBC.
