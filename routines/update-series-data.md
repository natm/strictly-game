# Routine: update the 2026 series data from Wikipedia

**Goal:** keep `data/series2026.js` in step with Wikipedia's "Strictly Come Dancing series 24" page: every scored dance, the week themes, who has been eliminated, and the dances and songs announced for the coming week (these get pre-filled in the game). Then test, release and deploy, so the game's stats, presenter comments and "Series so far" charts use the latest real scores.

## Steps
1. Get the latest code: `git fetch origin strictly-score-guess && git checkout strictly-score-guess && git pull origin strictly-score-guess`.
2. Dry run: `python3 -I scripts/update_series_data.py --dry-run`
   - If it prints **NO CHANGE**, stop here and report "No new scores on Wikipedia yet". Don't commit anything.
   - If it exits with an error (rate limiting, or scores that don't add up), stop and report the message. Don't edit the data by hand.
3. Look over the summary: new dances should be for the latest week only, each total between 4 and 40, and eliminations should match the show. If anything looks wrong (a couple scored twice, a week going backwards), stop and report it.
4. Apply it: `python3 -I scripts/update_series_data.py`
5. Test: `npm install` (first run only), then `npm test`. Every test must pass. If one fails because the new data changed an expected number in a test (for example the count of 79 series dances), update that number to match the new data and say so in the summary. For any other failure, stop and report it without pushing.
6. Release: bump the patch version in `index.html` (`const VERSION='x.y.z',RELEASE='<Name>'`). Pick a new release name, a dance or Strictly word not already in `CHANGELOG.md`. Add a changelog section at the top, for example:
   `## vX.Y.Z "Name" (YYYY-MM-DD)` then `- Series data updated to week N from Wikipedia: <one line on what's new, e.g. Week 8 scores; Graeme & Lauren eliminated>.`
7. Commit, ending the message with the usual attribution lines: `git commit -am "vX.Y.Z \"Name\": series data to week N"`
8. Push the branch, then deploy (which triggers the GitHub release):
   `git push -u origin strictly-score-guess && git push origin strictly-score-guess:gh-pages`
9. Check it's live: wait until `https://natm.github.io/strictly-game/` contains `RELEASE='Name'` (poll every 10s for up to 5 minutes).

## What not to touch
- Couple looks, photos and facts in `data/series2026.js`. The script keeps these as they are.
- `main`: changes reach it through the open pull request.

## Report
Finish with three or four lines: the week now covered, the new dances (couple: dance, total), any eliminations, the version released, and whether the live site shows it.
