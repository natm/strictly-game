# Releasing & deploying

- **Version:** `const VERSION='x.y.z',RELEASE='<Name>'` in `index.html`. It shows in the header (hidden on phones) and the footer. Every release gets a new dance or Strictly word as its name; check `CHANGELOG.md` for names already used.
- **Changelog:** add `## vX.Y.Z "Name" (YYYY-MM-DD)` at the top of `CHANGELOG.md`, with short player-facing bullets.
- **Deploy:** GitHub Pages serves the `gh-pages` branch.
  ```bash
  npm test && git push -u origin strictly-score-guess && git push origin strictly-score-guess:gh-pages
  ```
- **GitHub release:** `.github/workflows/release.yml` runs on pushes to `gh-pages`. If `vVERSION` isn't released yet, it creates the tag and release from that version's changelog section. Pushing a `v*` tag by hand also works.
- **Update banner:** the game fetches its own page with `no-store`. If the live `VERSION` is newer than the one loaded, it shows "✨ New version … tap to update".
- **Credits:** keep the BBC and Wikipedia credit in the footer (`credits()`), because the photos and data come from them.
