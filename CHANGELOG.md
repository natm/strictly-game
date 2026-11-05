# Changelog

Every release has a semantic version and a dance (or Strictly word) as its name.
The version is shown in the game header and footer, so you can quote it in bug reports.

## v3.0.6 "Handover" (2026-11-05)
- Presenters sometimes hand over to each other. Emma might finish with "What do you think, Josh?", and Josh replies "Well, Emma… That was less a dance, more a hostage negotiation."

## v3.0.5 "Sway" (2026-11-05)
- Every player has their own emoji: new players and avatar changes skip emojis already in use, and any duplicates in saved games are fixed.
- Changing a player's emoji no longer flashes the page.

## v3.0.4 "Hello" (2026-11-05)
- Still called "Player 2"? The pass-the-controls screen asks for your real name, with a box right there, or "Keep Player 2" to stop asking.

## v3.0.3 "Hush" (2026-11-05)
- Sound is off by default. Tap 🔇 in the header to turn it on, and the game remembers your choice.

## v3.0.2 "Promenade" (2026-11-05)
- Week setup: change player names right there while picking who's playing, and a new player's name box is ready to type in.
- Help screen and footer link to the code on GitHub.

## v3.0.1 "Boo" (2026-11-05)
- If Craig gives 5 or under, the audience usually boos 👎, and Craig answers back ("Oh, be quiet!", "I'm just being honest, darling!").

## v3.0.0 "Paso" (2026-11-05)
- **Dances pre-filled:** the dances (and songs 🎵) announced for the coming week are pre-filled for each couple, from Wikipedia via the scheduled data update.
- **Weeks close themselves:** once the real result is in the data, a finished week closes on its own. "Who went home?" also pre-selects the real result.
- **Judges react to each other:**
  - The same score as the judge before gets smiles and a "Snap! 🤝".
  - A much lower score makes the more generous judges react ("Really?! 😱", "Harsh!").
- **SEVEN!** Shirley and Anton sometimes shout "SE-VEN!" for a 7, in honour of Len Goodman.
- **New presenters:** Emma, Josh and Johannes joke about it being their first series presenting.
- **Whole numbers:** averages are shown as whole numbers.
- **Phones:** fixed a white flash when more than one presenter comments.
- **README:** "Play now" link at the top.

## v2.9.1 "Pivot" (2026-11-05)
- The couples' season scoreboard uses every real score this series plus the weeks you play. Couples are ranked by average judges' score, with dances, best dance and recent totals. Eliminated couples are greyed out at the bottom.

## v2.9.0 "Spin" (2026-11-05)
- A week counts as soon as its results podium appears: season points, wins, Fun Stats and the Weeks table. Before, it only counted after "Who went home?" was confirmed. "Who went home?" now just records eliminations.
- A week already on the results or "who went home" screen is saved as soon as the game opens.
- A "New version available, tap to update" banner appears when the live site has a newer release than the one your browser loaded.

## v2.8.1 "Twirl" (2026-11-05)
- Fun Stats includes the week in progress, so stats appear as soon as the first couple's scores are in. It also ignores any odd saved data instead of showing nothing.

## v2.8.0 "Tap" (2026-11-05)
- Entering the judges' scores is as quick as guessing. One tap on a number lifts that judge's paddle, updates everyone's tallies, and moves on to the next judge. No separate ✓.
- Live corrections: tap any paddle that's up, pick the right number, and the tallies recalculate straight away.
- Once all four are in, tap 🥁 Reveal the total! (or press Enter) for the total, the banner and the presenters.

## v2.7.1 "Mambo" (2026-11-05)
- Josh sometimes skips the fact and just makes a joke.
- When Johannes is the only one to comment, he often runs through the scores and signs off with "Back to you, Josh and Emma!"
- Johannes remembers his years as a Strictly pro ("Trust me, I danced on this floor for years…").

## v2.7.0 "Salsa" (2026-11-05)
- Josh gets his facts from all over: the back of a newspaper, X, Instagram, the bus, the man down the pub, his wife, his kids, a dream… He says "Riveting" much less.
- Emma offers a hug for a low score 🤗, and tissues for a very low one 🤧.
- New breathless and sweaty lines: Johannes points out the couple are too out of breath to speak, and Josh and Emma comment on them glistening.

## v2.6.0 "Lindy" (2026-11-05)
- Phones and tablets: guessing works like the judges' screen. All four judges sit in a row with one set of 1–10 buttons, and tapping a number lifts that paddle and moves to the next judge. Tap a judge to change their score. No device keyboard, so nothing covers the screen.

## v2.5.1 "Bolero" (2026-11-05)
- The dance picker on the stage is sorted A–Z.

## v2.5.0 "Charleston" (2026-11-05)
- The Players screen (formerly "Couples, Players & Judges") now only edits players. The 2026 couples, judges and presenters come with the game and load automatically.
- Optional cookieless analytics hook, switched off by default (see README).
- `routines/`: instructions Claude can run on a schedule, including refreshing the series data from Wikipedia, then testing, releasing and deploying. Also a daily site health check.
- `scripts/update_series_data.py` and `scripts/parse_series.py` refresh `data/series2026.js` from Wikipedia while keeping the cartoons and facts.

## v2.4.0 "Jive" (2026-11-05)
- Skip a player for one couple ("out of the room") from the pass-the-controls or guessing screen. They score nothing for that couple, and their stats aren't affected.
- Presenter cartoons match the BBC's 2026 photo: Emma's short dark crop, Josh's curls and glasses, Johannes in green.
- New iPad/tablet test suite (portrait and landscape).

## v2.3.1 "Swing" (2026-11-05)
- Phones: a slim one-row header (version moved to the footer) and a tighter judges' scores screen, so there's much less scrolling.

## v2.3.0 "Quickstep" (2026-11-05)
- A huge drop (or jump) from last week is now the first thing the presenters talk about: "From 30 last week to 4 tonight…".
- Judges' speech bubbles compare with what they gave the couple last week ("Last week I gave you an 8!").
- While a couple dances, a "Series so far" chart shows their real score for every week of the series.

## v2.2.0 "Foxtrot" (2026-11-05)
- Picking the dance on the stage is now a simple list, with no typing.
- Josh has lots more to say: wilder lines, and digs at the judges' scores ("Craig gave a 6. Probably scores sunsets a 6.").
- Emma is sympathetic on tougher nights.

## v2.1.2 "Rumba" (2026-11-05)
- On phones and tablets, the judges' scores use just the number buttons and ✓, so no keyboard pops up and covers the screen.

## v2.1.1 "Samba" (2026-11-05)
- The game is now called **Keep Dancing!** (top left and the browser tab).

## v2.1.0 "Cha-Cha" (2026-11-05)
- Real scores and the reveal are one screen. Enter each judge's score (type it or tap it), confirm with Enter or ✓, and their paddle goes up while every player's tally updates on the left.
- Judges sometimes get a speech bubble when their paddle goes up: "Fab-u-lous!", "Jabulous!", "Let me show you…", "Keep working on it!" and more.
- The stage fits short laptop windows: the dance box and buttons sit on the stage floor.
- "Did you know?" facts only appear while passing the controls, so the other screens are less busy.
- No presenters beside the judges while the scores go up; they still comment afterwards.

## v2.0.0 "Tango" (2026-11-05)
- Real 2026 series data from Wikipedia: all 10 couples still in (John Nellis is with Katya Jones) and every score from weeks 1–6.
- Each couple has a cartoon made from their BBC press shots, as a cartoonified photo or a drawn cartoon you can edit.
- "Did you know?" facts about every celebrity and pro, from BBC and Wikipedia.
- Presenter comments use real series stats: personal bests, first 10s and 9s, best Foxtrot of the series, up or down on last week, top of the leaderboard tonight, and more. Josh is always snarky.
- Dave Arch, the band leader, occasionally pops up after the judges.
- Reveal: each player's exact or how-far-off result appears live after every paddle, with points counting up and total bonuses.
- Reveal: Emma, Josh and Johannes stand beside the stage, clapping or looking sad depending on the scores.
- Score entry fits a laptop screen without scrolling.
- Footer credits the BBC and Wikipedia; version shown in the header.
- Cartoon editor adds facial hair, glasses, earrings, lipstick and more hairstyles.

## v1.0.0 "Waltz"
- First family release: players, couples, judges' paddles, presenters, leaderboards, season stats and GitHub Pages hosting.
