# Testing

```bash
npm install     # once: Playwright
npm test        # node --test tests/*.test.cjs
node --test --test-name-pattern="judges react" tests/game.test.cjs   # one test
```

| Suite | Covers |
|---|---|
| `tests/game.test.cjs` | The full flow on desktop, plus phone tests with `isMobile`/`hasTouch`: a full week, sick couples, skips, eliminations, Fun Stats with absent players, resume, live judge entry and corrections, reveal tallies, presenter and judge lines, series stats, layout fit at several sizes, migrations |
| `tests/tablet.test.cjs` | iPad, iPad Pro 11 and Galaxy Tab, portrait and landscape: a whole couple by touch, no sideways scroll, controls on screen, rotating mid-guess |

CI runs `npm test` on every push (`.github/workflows/test.yml`).

## Writing tests
- `open(viewport)` opens the game and adds `CALM` CSS, which stops pulsing buttons that Playwright would otherwise treat as unstable.
- `addCouples(page, names)` seeds couples straight into `localStorage`, since couples can't be edited in the UI.
- `playCouple(page, guessFn, real)` plays one couple end to end. `enterReal(page, nums)` types the real scores and taps **Reveal**.
- Randomness: presenter and judge lines are random. Either sample many with `window.__strictly.makeQuips(...)`, or pin `Math.random` in the page.
- Timing: paddles mark players after about 450ms. Use `waitForFunction`, not fixed sleeps or a first match.
- Gate pushes on the exit code: `npm test && git push …`. Checking for the summary line isn't enough.
