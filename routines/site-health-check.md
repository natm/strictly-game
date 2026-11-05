# Routine: daily site health check

**Goal:** make sure the live game at https://natm.github.io/strictly-game/ loads and works, without changing anything.

## Steps
1. `git fetch origin gh-pages && git checkout -B health origin/gh-pages`, so you test exactly what's deployed.
2. `npm install` if needed, then `npm test`.
3. Check the live site responds: `curl -sS -o /dev/null -w "%{http_code}" https://natm.github.io/strictly-game/` should print `200`. The page should contain the same `const VERSION=` as `index.html` on `gh-pages`.
4. Check `data/series2026.js` loads on the live site: `https://natm.github.io/strictly-game/data/series2026.js` should return 200.

## Rules
- Read-only: no commits, no pushes.
- If everything passes, report "All good: vX.Y.Z live, N tests passing" in one line.
- If anything fails, report which test or check failed, with the error lines, so a human can look.
