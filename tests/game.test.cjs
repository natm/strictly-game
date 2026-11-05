// End-to-end tests for Strictly Score Guess. Run with: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
// Pulsing/hover animations make buttons "unstable" for Playwright clicks.
const CALM = 'button.pulse{animation:none!important}button:hover{transform:none!important}';
let browser;

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

async function open(viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(URL);
  await page.addStyleTag({ content: CALM });
  page.errors = errors;
  page.reloadCalm = async () => { await page.reload(); await page.addStyleTag({ content: CALM }); };
  return page;
}
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('strictly-v2')));
const typeScores = async (page, nums) => { for (const n of nums) await page.keyboard.press(String(n % 10)); };

// Real scores: one judge at a time, Enter lifts each paddle. Skips the presenters at the end.
async function enterReal(page, nums, { skip = true } = {}) {
  for (const n of nums) { await page.fill('#jscore', String(n)); await page.press('#jscore', 'Enter'); }
  if (await page.isVisible('#jdone')) await page.click('#jdone');            // all four in: reveal the total
  if (skip) { await page.waitForFunction(() => window.__strictlyPhase && window.__strictlyPhase() === 'reveal');
    await page.waitForSelector('#skip:not([style*="none"]), #after[style*="opacity: 1"]', { timeout: 5000 }).catch(() => {});
    // the Skip button hides itself when the presenters finish, so it may vanish just before we click
    if (await page.locator('[data-act=skipreveal]').isVisible()) await page.click('[data-act=skipreveal]', { timeout: 2000 }).catch(() => {}); }
}
async function addCouples(page, names) {   // couples come with the game; tests seed their own
  await page.evaluate(n => { const S = JSON.parse(localStorage.getItem('strictly-v2') || '{"v":2,"jOrder":2}');
    S.couples = n.map((x, i) => ({ id: 'c' + i, name: x, out: null, scores: [] })); S.nextWeek = null; localStorage.setItem('strictly-v2', JSON.stringify(S)); }, names);
  await page.reload(); await page.addStyleTag({ content: CALM });
}

// With several couples left you choose who's next; with one left it goes straight to the stage.
async function pickIfNeeded(page) {
  if (await page.locator('[data-act=pickc]').count()) await page.click('[data-act=pickc] >> nth=0');
}
// Plays one couple: every present player guesses, then the real scores go in.
async function playCouple(page, guess, real) {
  await pickIfNeeded(page);
  await page.click('[data-act=danced]');
  const n = (await state(page)).week.pids.length;
  for (let i = 0; i < n; i++) {
    await page.click('[data-act=ready]');
    await typeScores(page, guess(i));
    await page.keyboard.press('Enter');
  }
  await enterReal(page, real);
  await page.click('[data-act=board]');
  await page.click('[data-act=next]');
}

test('the 2026 couples come with the game, starting at week 7', async () => {
  const page = await open();
  assert.match(await page.textContent('[data-act=newweek]'), /Start Week 7/);
  const s = await state(page);
  assert.equal(s.couples.length, 10);
  assert.ok(s.couples.some(c => c.name === 'John Nellis & Katya Jones'));
  // the setup screen is players only
  await page.click('[data-act=nav][data-to=manage]');
  assert.equal(await page.locator('#newcouples, [data-bind^="judge:"], [data-bind^="pres:"], [data-bind^="couple:"]').count(), 0);
  assert.ok(await page.locator('[data-bind^="player:"]').count() >= 1);
  assert.deepEqual(page.errors, []);
});

test('full week: theme, sick couple, scoring, fix scores, eliminations', async () => {
  const page = await open();
  await addCouples(page, ['Ann & Pro A', 'Bob & Pro B', 'Cat & Pro C']);
  await page.click('[data-act=wkstep][data-d="1"]');
  await page.click('[data-act=newweek]');
  await page.fill('[data-bind=theme]', 'Movie Week');
  await page.click('[data-act=togglesick][data-i="1"]');      // Bob is poorly
  await page.click('[data-act=startweek]');
  assert.match(await page.textContent('.pill.wk .wkf'), /Week 2 · Movie Week/);
  // no running order: pick who's on first (Ann or Cat; Bob is sick)
  assert.equal(await page.locator('[data-act=pickc]').count(), 2);
  await page.click('[data-act=pickc][data-i="0"]');
  await page.selectOption('[data-bind="dance:0"]', 'Waltz');   // dance is optional, picked from a list

  // Couple 1: real 8,8,8,8. Player guesses: exact for first player.
  await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) {
    await page.click('[data-act=ready]');
    await typeScores(page, i === 0 ? [8, 8, 8, 8] : [7, 7, 7, 7]);
    await page.keyboard.press('Enter');
  }
  await enterReal(page, [5, 5, 5, 5]);   // oops, wrong real scores...
  await page.click('[data-act=fixscores]'); // ...fix them
  await enterReal(page, [8, 8, 8, 8]);
  await page.waitForSelector('.pres', { timeout: 3000 }); // a presenter reacts
  let s = await state(page);
  const pts = Object.values(s.week.totals).sort((a, b) => b - a);
  assert.deepEqual(pts, [17, 4, 4]); // exact: 4*3 + 5 bonus; one-away: 4*1, total 4 off = no bonus
  await page.click('[data-act=board]');
  await page.click('[data-act=next]');

  // Couple 2 is Cat (Bob skipped as sick); then the week wraps.
  assert.match(await page.textContent('.couplebig'), /C/);
  await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act=ready]'); await typeScores(page, [6, 6, 6, 6]); await page.keyboard.press('Enter'); }
  await enterReal(page, [6, 6, 6, 6]);
  await page.click('[data-act=board]');
  assert.match(await page.textContent('[data-act=next]'), /wrap/);
  await page.click('[data-act=next]');
  await page.click('[data-act=toelim]');
  await page.click('.cc:nth-child(1)');
  await page.click('.cc:nth-child(3)');
  await page.click('[data-act=finishweek]');

  s = await state(page);
  assert.equal(s.week, null);
  assert.deepEqual(s.couples.map(c => c.out), [2, null, 2]);
  assert.equal(s.couples[1].scores.length, 0, 'sick couple has no scores');
  assert.equal(s.couples[0].scores[0].dance, 'Waltz');
  assert.equal(s.couples[2].scores[0].dance, '', 'dance style left blank is fine');
  assert.equal(s.history[0].theme, 'Movie Week');
  assert.deepEqual(s.history[0].sick, ['Bob & Pro B']);
  assert.equal(s.rounds.length, 2);
  assert.match(await page.textContent('[data-act=newweek]'), /Start Week 3/);
  assert.deepEqual(page.errors, []);
});

test('stats only count couples a player guessed (absent players)', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A', 'Bob & B']);
  for (const absent of [false, true]) {
    await page.click('[data-act=newweek]');
    if (absent) await page.click('.chip >> nth=2');             // Player 3 stays home
    await page.click('[data-act=startweek]');
    for (let c = 0; c < 2; c++) await playCouple(page, () => [7, 7, 7, 7], [7, 7, 7, 7]);
    await page.click('[data-act=toelim]');
    await page.click('[data-act=finishweek]');
  }
  const s = await state(page);
  assert.deepEqual(s.rounds.map(r => Object.keys(r.g).length), [3, 3, 2, 2]);
  const p3 = s.players[2].id;
  assert.equal(s.season[p3].weeks, 1);
  await page.click('[data-act=nav][data-to=season]');
  await page.click('[data-act=stab][data-t=stats]');
  assert.ok(await page.locator('.awardcard').count() > 3);
  assert.match(await page.textContent('#view'), /Here for 1 of 2 weeks/);
  assert.deepEqual(page.errors, []);
});

test('resumes after reload and keeps guesses private', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]');
  await page.click('[data-act=startweek]');
  await page.click('[data-act=danced]');
  await page.click('[data-act=ready]');
  await typeScores(page, [9, 9, 9, 9]);
  await page.keyboard.press('Enter');
  await page.reloadCalm();
  // back on the "pass the controls" screen for the second player
  assert.equal(await page.locator('[data-act=ready]').count(), 1);
  assert.equal((await state(page)).week.oi, 1);
  assert.deepEqual(page.errors, []);
});

test('lifting paddles appear as numbers are entered', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]');
  await page.click('[data-act=startweek]');
  await page.click('[data-act=danced]');
  await page.click('[data-act=ready]');
  await page.click('[data-act=key][data-j="0"][data-n="7"]');
  assert.equal(await page.locator('.pad.has').count(), 1);
  assert.equal(await page.locator('.pup.lift').count(), 1);
  assert.equal((await page.textContent('.pad.has .pcard')).trim(), '7');
  await page.keyboard.press('Backspace');
  assert.equal(await page.locator('.pad.has').count(), 0);
});

test('mobile: no sideways scrolling on main screens', async () => {
  const page = await open({ width: 390, height: 844 });
  const noOverflow = async name => {
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    assert.ok(sw <= iw, `${name} overflows (${sw} > ${iw})`);
  };
  await noOverflow('home');
  await page.click('[data-act=nav][data-to=manage]'); await noOverflow('cast');
  await page.click('[data-act=nav][data-to=""]');
  await page.click('[data-act=newweek]'); await noOverflow('setup');
  await page.click('[data-act=startweek]'); await noOverflow('pick');
  await page.click('[data-act=pickc] >> nth=2'); await noOverflow('stage');
  await page.click('[data-act=danced]'); await page.click('[data-act=ready]'); await noOverflow('keypad');
  assert.deepEqual(page.errors, []);
});

test('who is playing shows green/red ticks', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]');
  assert.equal(await page.locator('.chip .tick', { hasText: '✅' }).count(), 3);
  await page.click('.chip >> nth=1');
  assert.equal(await page.locator('.chip .tick', { hasText: '❌' }).count(), 1);
});

test('long couple names fit on the stage (phone and desktop)', async () => {
  for (const vp of [{ width: 360, height: 740 }, { width: 1280, height: 800 }]) {
    const page = await open(vp);
    await addCouples(page, ['Bethany Antonia-Featherstonehaugh & Maximilian Widdrington-Smythe']);
    await page.click('[data-act=newweek]');
    await page.click('[data-act=startweek]');
    await page.waitForTimeout(4200); // let the letters land
    const { stage, name } = await page.evaluate(() => {
      const r = e => e.getBoundingClientRect();
      const st = r(document.querySelector('.stage'));
      const spans = [...document.querySelectorAll('.couplebig .wd')].map(r);
      return { stage: [st.left, st.right], name: [Math.min(...spans.map(b => b.left)), Math.max(...spans.map(b => b.right))] };
    });
    assert.ok(name[0] >= stage[0] - 1 && name[1] <= stage[1] + 1, `name ${name} outside stage ${stage} at ${vp.width}px`);
    assert.deepEqual(page.errors, []);
  }
});

test('judges always appear Craig, Motsi, Shirley, Anton', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]');
  await page.click('[data-act=startweek]');
  await page.click('[data-act=danced]');
  await page.click('[data-act=ready]');
  const names = await page.$$eval('.keyrow .jname', els => els.map(e => e.textContent.split(' ')[0]));
  assert.deepEqual(names, ['Craig', 'Motsi', 'Shirley', 'Anton']);
});

test('old saves in the previous judge order are re-ordered, scores included', async () => {
  const page = await open();
  // previous default order was Shirley, Motsi, Anton, Craig
  await page.evaluate(() => localStorage.setItem('strictly-v2', JSON.stringify({
    v: 2,
    judges: [{ name: 'Shirley Ballas', photo: '' }, { name: 'Motsi Mabuse', photo: '' }, { name: 'Anton Du Beke', photo: '' }, { name: 'Craig Revel Horwood', photo: '' }],
    players: [{ id: 'p1', name: 'Nan', color: '#f0f', av: '🦄', here: true }],
    couples: [{ id: 'c1', name: 'Ann & A', out: null, scores: [{ week: 1, dance: '', real: [9, 8, 7, 3] }] }],
    rounds: [{ w: 1, c: 'Ann & A', d: '', r: [9, 8, 7, 3], g: { p1: [9, 8, 7, 3] } }],
    season: {}, history: [{ n: 1, winners: [], out: [], sick: [] }], weeksDone: 1, week: null, tmp: [null, null, null, null],
  })));
  await page.reloadCalm();
  const s = await state(page);
  assert.deepEqual(s.judges.map(j => j.name.split(' ')[0]), ['Craig', 'Motsi', 'Shirley', 'Anton']);
  assert.deepEqual(s.judges.map(j => j.style), [3, 1, 0, 2], 'each judge keeps their cartoon');
  assert.deepEqual(s.couples[0].scores[0].real, [3, 8, 9, 7]);
  assert.deepEqual(s.rounds[0].g.p1, [3, 8, 9, 7]);
  await page.reloadCalm();   // runs only once
  assert.deepEqual((await state(page)).rounds[0].r, [3, 8, 9, 7]);
  assert.deepEqual(page.errors, []);
});

test('type the four scores in one box and press Enter', async () => {
  const page = await open({ width: 390, height: 844 });
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]');
  await page.click('[data-act=startweek]');
  await page.click('[data-act=danced]');
  await page.click('[data-act=ready]');
  await page.fill('#quick', '7 8 6 10');
  assert.equal(await page.locator('.pad.has').count(), 4);
  assert.equal(await page.inputValue('#quick'), '7 8 6 10', 'box keeps what you typed');
  await page.press('#quick', 'Enter');
  assert.deepEqual((await state(page)).week.guesses[(await state(page)).week.order[0]], [7, 8, 6, 10]);
  // squashed together works too: 1 0 is read as 10
  await page.click('[data-act=ready]'); await page.fill('#quick', '91059'); await page.press('#quick', 'Enter');
  const s = await state(page);
  assert.deepEqual(s.week.guesses[s.week.order[1]], [9, 10, 5, 9]);
  assert.deepEqual(page.errors, []);
});

test('real scores screen looks different from guessing', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]');
  await page.click('[data-act=startweek]');
  await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act=ready]'); await page.fill('#quick', '7777'); await page.press('#quick', 'Enter'); }
  assert.equal(await page.locator('.realmode .realbanner').count(), 1);
  const bg = await page.$eval('.realmode .jctl', e => getComputedStyle(e).backgroundImage);
  assert.match(bg, /gradient/);
});

test('2026 data: couples have cartoons and facts; stats use the real series scores', async () => {
  const page = await open();
  const info = await page.evaluate(() => {
    const S = JSON.parse(localStorage.getItem('strictly-v2'));
    const lacey = S.couples.find(c => c.name.startsWith('Lacey'));
    const t = window.__strictly;
    return {
      names: S.couples.map(c => c.name),
      facts: t.factsFor(lacey).length,
      photo: (t.presetFor(lacey) || {}).photo,
      dances: t.seriesDances().length,
      perfect: t.scoreStats(lacey, [10, 10, 10, 10], 'Foxtrot').map(x => x.k),
      meh: t.scoreStats(lacey, [5, 5, 5, 5], '').map(x => x.k),
    };
  });
  assert.ok(info.names.includes('John Nellis & Katya Jones'));
  assert.ok(info.facts >= 10, 'facts for Lacey and Vito');
  assert.equal(info.photo, 'img/couples/lacey-vito.jpg');
  assert.equal(info.dances, 79, 'all real series dances from weeks 1-6');
  for (const k of ['perfect', 'seriesBest', 'pb', 'sameAll']) assert.ok(info.perfect.includes(k), k);
  assert.ok(info.meh.includes('worst'), 'lowest score of their series');
  // the photo cartoon loads on the stage
  await page.click('[data-act=newweek]');
  await page.click('[data-act=startweek]');
  await page.click('[data-act=pickc] >> nth=0');
  await page.waitForFunction(() => { const i = document.querySelector('.stage .cart img'); return i && i.complete && i.naturalWidth > 0; });
  assert.equal(await page.locator('#dyk').count(), 0, 'no facts on the stage');
  await page.click('[data-act=danced]');
  assert.equal(await page.locator('#dyk').count(), 1, 'did-you-know fact while passing the controls');
  assert.deepEqual(page.errors, []);
});

test('older saves: "John Nellis" gains his partner from the series data', async () => {
  const page = await open();
  await page.evaluate(() => localStorage.setItem('strictly-v2', JSON.stringify({ v: 2, jOrder: 2, couples: [{ id: 'j', name: 'John Nellis', out: null, scores: [] }] })));
  await page.reloadCalm();
  assert.equal((await state(page)).couples[0].name, 'John Nellis & Katya Jones');
});

test('reveal shows each player exact / how far off as each paddle goes up', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]');
  await page.click('[data-act=startweek]');
  await page.click('[data-act=danced]');
  const guesses = ['9999', '8888', '3333'];
  for (const g of guesses) { await page.click('[data-act=ready]'); await page.fill('#quick', g); await page.press('#quick', 'Enter'); }
  // Craig's 9: one tap and the paddle goes up and the tallies land
  await page.click('[data-act=jkey][data-n="9"]');
  await page.waitForSelector('.rs.done', { timeout: 3000 });
  assert.equal(await page.locator('.paddle.on').count(), 1);
  assert.equal(await page.locator('.sp').count(), 0, 'no presenters beside the judges');
  assert.match(await page.textContent('#jname'), /Motsi/);
  // the rest by keyboard: type + Enter
  await enterReal(page, [9, 9, 9]);
  assert.equal(await page.locator('.rs.done').count(), 12);
  assert.equal(await page.locator('.rs.x').count(), 4, 'one player exact on all four');
  assert.equal(await page.locator('.rs.n').count(), 4);
  const pts = await page.$$eval('.rp .rpts', els => els.map(e => +e.textContent).sort((a, b) => b - a));
  assert.deepEqual(pts, [17, 4, 0]);
  assert.match(await page.textContent('.rbonus.on'), /\+5/);
  assert.deepEqual(page.errors, []);
});

test('laptop: score entry fits on screen without scrolling', async () => {
  const page = await open({ width: 1366, height: 768 });
  await addCouples(page, ['Lacey Turner & Vito Coppola']);
  await page.click('[data-act=newweek]');
  await page.click('[data-act=startweek]');
  await page.click('[data-act=danced]');
  await page.click('[data-act=ready]');
  for (const sel of ['[data-act=confirm]']) {
    const bottom = await page.$eval(sel, e => e.getBoundingClientRect().bottom);
    assert.ok(bottom <= 768, `guess button at ${bottom}px is below the fold`);
  }
  for (let i = 0; i < 3; i++) { if (i) await page.click('[data-act=ready]'); await page.fill('#quick', '7777'); await page.press('#quick', 'Enter'); }
  for (const sel of ['#jscore', '.jkeys']) {
    const b = await page.$eval(sel, e => e.getBoundingClientRect().bottom);
    assert.ok(b <= 768, `${sel} at ${b}px is below the fold`);
  }
});

test('footer credits BBC and Wikipedia and shows the version', async () => {
  const page = await open();
  const txt = await page.textContent('.credits');
  assert.match(txt, /BBC/); assert.match(txt, /Wikipedia/); assert.match(txt, /v\d+\.\d+\.\d+/);
  assert.match(await page.textContent('.ver'), /v\d+\.\d+\.\d+ “[^”]+”/);
});

test('short laptop window: the stage and its buttons fit without scrolling', async () => {
  for (const vp of [{ width: 1000, height: 560 }, { width: 1366, height: 768 }, { width: 1920, height: 1000 }]) {
    const page = await open(vp);
      await page.click('[data-act=newweek]');
    await page.click('[data-act=startweek]');
    await page.click('[data-act=pickc] >> nth=8');   // Graeme Hall & Lauren Oakley
    await page.waitForTimeout(4200);
    for (const sel of ['[data-act=danced]', '[data-bind^="dance:"]', '.couplebig']) {
      const b = await page.$eval(sel, e => e.getBoundingClientRect().bottom);
      assert.ok(b <= vp.height, `${sel} bottom ${Math.round(b)} > ${vp.height} at ${vp.width}x${vp.height}`);
    }
    assert.deepEqual(page.errors, []);
  }
});

test('a judge speech bubble rises when a 10 goes up', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]');
  await page.click('[data-act=startweek]');
  await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act=ready]'); await page.fill('#quick', '8888'); await page.press('#quick', 'Enter'); }
  await page.fill('#jscore', '10'); await page.press('#jscore', 'Enter');
  await page.waitForSelector('.paddle[data-i="0"] .jbub', { timeout: 2000 });
  assert.match(await page.textContent('.jbub'), /\S/);
});

test('phone: guess by tapping (no keyboard), each tap moves to the next judge', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.accept());
  await page.goto(URL); await page.addStyleTag({ content: CALM });
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=danced]');
  await page.tap('[data-act=ready]');
  assert.equal(await page.locator('#quick').count(), 0, 'no keyboard text box on touch screens');
  for (const n of [7, 8, 6, 9]) await page.tap(`.gkeys [data-n="${n}"]`);
  assert.equal(await page.locator('.pad.has').count(), 4);
  await page.tap('.gpad[data-j="2"]'); await page.tap('.gkeys [data-n="10"]');   // change Shirley's
  for (const sel of ['.qlock', '.gkeys [data-n="10"]']) {
    const bt = await page.$eval(sel, e => e.getBoundingClientRect().bottom);
    assert.ok(bt <= 700, `${sel} at ${Math.round(bt)}px needs scrolling`);
  }
  await page.tap('.qlock');
  const s = await state(page);
  assert.deepEqual(s.week.guesses[s.week.order[0]], [7, 8, 10, 9]);
  await ctx.close();
});

test("phone: judges' scores by tapping only, no keyboard box", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.accept());
  await page.goto(URL); await page.addStyleTag({ content: CALM });
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.tap('[data-act=ready]'); for (const n of [7, 7, 7, 7]) await page.tap(`.gkeys [data-n="${n}"]`); await page.tap('.qlock'); }
  assert.equal(await page.isVisible('#jscore'), false, 'no text box on touch screens');
  for (const n of [8, 7, 9, 6]) {
    await page.tap(`[data-act=jkey][data-n="${n}"]`);
    assert.notEqual(await page.evaluate(() => document.activeElement && document.activeElement.id), 'jscore', 'keyboard never opens');
  }
  await page.tap('#jdone');
  await page.waitForFunction(() => window.__strictlyPhase() === 'reveal');
  assert.deepEqual((await state(page)).week.results[(await state(page)).week.entries[0].cid].real, [8, 7, 9, 6]);
  await ctx.close();
});

test('presenter voices: Josh has plenty to say (incl. the judges), Emma is kind on low scores', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act=ready]'); await page.fill('#quick', '4444'); await page.press('#quick', 'Enter'); }
  // sample many presenter lines for a low, split score
  const lines = await page.evaluate(() => { const out = []; for (let i = 0; i < 400; i++) out.push(...window.__strictly.makeQuips([3, 6, 4, 5], { a: [4, 4, 4, 4] }, ['a'])); return out; });
  const josh = new Set(lines.filter(q => q.p === 1).map(q => q.t)), emma = lines.filter(q => q.p === 0).map(q => q.t);
  assert.ok(josh.size >= 12, `Josh only had ${josh.size} different lines`);
  assert.ok([...josh].some(t => /Craig|Motsi|Shirley|Anton/.test(t)), 'Josh comments on the judges');
  assert.ok(emma.some(t => /proud|brave|hug|wonderful|adored/.test(t)), 'Emma is sympathetic');
});

test('big drop from last week leads the comments; series history on the stage', async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]');
  await page.click('[data-act=pickc] >> nth=0');                      // Lacey & Vito
  assert.equal(await page.locator('.hist.side .hb').count(), 6, 'six weeks of real scores');
  assert.match(await page.textContent('.hist.side'), /36/);            // their week 6 Charleston
  const first = await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('strictly-v2'));
    return window.__strictly.scoreStats(S.couples.find(c => c.name.startsWith('Lacey')), [1, 1, 1, 1], '')[0].k; });
  assert.equal(first, 'crash');
  await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act=ready]'); await page.fill('#quick', '8888'); await page.press('#quick', 'Enter'); }
  await page.fill('#jscore', '2'); await page.press('#jscore', 'Enter');   // Craig gave 9 last week
  await page.waitForSelector('.paddle[data-i="0"] .jbub', { timeout: 2000 });
  assert.match(await page.textContent('.jbub'), /9/);
  assert.deepEqual(page.errors, []);
});

test("phone: slim header and judges' score buttons on screen without scrolling", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.accept());
  await page.goto(URL); await page.addStyleTag({ content: CALM });
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=pickc] >> nth=0'); await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.tap('[data-act=ready]'); for (const n of [7, 7, 7, 7]) await page.tap(`.gkeys [data-n="${n}"]`); await page.tap('.qlock'); }
  const hdr = await page.$eval('header', e => e.getBoundingClientRect().height);
  assert.ok(hdr <= 52, `header is ${hdr}px tall`);
  for (const sel of ['.jkeys button[data-n="10"]']) {
    const b = await page.$eval(sel, e => e.getBoundingClientRect().bottom);
    assert.ok(b <= 700, `${sel} at ${Math.round(b)}px needs scrolling`);
  }
  await ctx.close();
});

test('skip a player who is out of the room: no points, not counted in stats', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=danced]');
  const order = (await state(page)).week.order;
  await page.click('[data-act=ready]'); await page.fill('#quick', '7777'); await page.press('#quick', 'Enter');
  await page.click('[data-act=skipplayer]');                      // second player gone to the loo
  await page.click('[data-act=ready]'); await page.fill('#quick', '8888'); await page.press('#quick', 'Enter');
  await enterReal(page, [8, 8, 8, 8]);
  const s = await state(page), res = s.week.results[s.week.entries[0].cid];
  assert.deepEqual(Object.keys(res.guesses).sort(), [order[0], order[2]].sort());
  assert.equal(s.week.totals[order[1]], 0);
  assert.equal(await page.locator('.rp').count(), 2, 'only players who guessed appear in the tally');
  await page.click('[data-act=board]'); await page.click('[data-act=next]');
  await page.click('[data-act=toelim]'); await page.click('[data-act=finishweek]');
  const s2 = await state(page);
  assert.equal(Object.keys(s2.rounds[0].g).length, 2);
  assert.deepEqual(page.errors, []);
});

test('analytics hook is off by default and never sets cookies', async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]');
  assert.equal(await page.evaluate(() => document.cookie), '');
  assert.equal(await page.evaluate(() => typeof window.kdTrack), 'function');
});

test('dance picker is sorted A-Z', async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=pickc] >> nth=0');
  const opts = await page.$$eval('[data-bind^="dance:"] option', o => o.slice(1).map(x => x.textContent));
  assert.deepEqual(opts, [...opts].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
  assert.equal(opts[0], 'American Smooth');
});

test('presenter extras: Josh fact sources, Emma hugs and tissues, breathless lines', async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=pickc] >> nth=0');
  await page.click('[data-act=danced]');
  const lines = await page.evaluate(() => { const out = [];
    for (let i = 0; i < 600; i++) out.push(...window.__strictly.makeQuips([3, 4, 4, 3], { a: [5, 5, 5, 5] }, ['a']));
    for (let i = 0; i < 600; i++) out.push(...window.__strictly.makeQuips([5, 6, 5, 6], { a: [5, 5, 5, 5] }, ['a']));
    return out; });
  const josh = lines.filter(q => q.p === 1).map(q => q.t), emma = lines.filter(q => q.p === 0).map(q => q.t), all = lines.map(q => q.t);
  assert.ok(josh.some(t => /pub|bus|newspaper|Instagram|wife|kids|dream/.test(t)), 'Josh cites his sources');
  assert.ok(josh.filter(t => /Riveting/.test(t)).length < josh.length / 20, 'Josh rarely says Riveting');
  assert.ok(emma.some(t => /tissue/.test(t)), 'tissues for a very low score');
  assert.ok(emma.some(t => /hug/i.test(t)), 'hugs');
  assert.ok(all.some(t => /breath|glisten|sweaty/.test(t)), 'breathless / sweaty lines');
});

test('Johannes signs off "Back to you, Josh and Emma!" and remembers his pro days', async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=pickc] >> nth=0');
  await page.click('[data-act=danced]');
  const qs = await page.evaluate(() => { const out = []; for (let i = 0; i < 800; i++) out.push(window.__strictly.makeQuips([7, 8, 7, 8], { a: [7, 7, 7, 7] }, ['a'])); return out; });
  const solo = qs.filter(q => q.filter(x => x.p !== 3).length === 1 && q[0].p === 2).map(q => q[0].t);
  assert.ok(solo.some(t => /Back to you, Josh and Emma!$/.test(t)), 'catchphrase when Johannes is alone');
  assert.ok(qs.flat().filter(x => x.p === 2).some(x => /pro|danced on this floor|training room/.test(x.t)), 'pro-dancer memories');
  assert.ok(qs.every(q => q.filter(x => x.p !== 2).every(x => !/Back to you, Josh and Emma/.test(x.t))), 'only Johannes says it');
});

test('judges: one tap per judge, then live corrections recalculate the tallies', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act=ready]'); await page.fill('#quick', '8888'); await page.press('#quick', 'Enter'); }
  for (const n of [8, 8, 5, 8]) await page.click(`[data-act=jkey][data-n="${n}"]`);
  await page.waitForFunction(() => document.querySelectorAll('.rs.done').length === 12);
  assert.ok(await page.isVisible('#jdone'), 'reveal button once all four are in');
  let pts = await page.$$eval('.rp .rpts', e => e.map(x => +x.textContent));
  assert.deepEqual(pts, [9, 9, 9]);                                   // 3+3+0+3
  // oops: Shirley actually gave an 8, so tap her paddle and fix it
  await page.click('.paddle[data-i="2"]');
  assert.match(await page.textContent('#jlabel'), /Fix Shirley/);
  assert.equal(await page.$eval('.paddle[data-i="2"] .face', e => getComputedStyle(e).opacity), '1', 'paddle stays visible while being fixed');
  await page.click('[data-act=jkey][data-n="8"]');
  pts = await page.$$eval('.rp .rpts', e => e.map(x => +x.textContent));
  assert.deepEqual(pts, [12, 12, 12]);
  assert.equal(await page.textContent('.paddle[data-i="2"] .face'), '8');
  await page.click('#jdone');
  await page.waitForFunction(() => window.__strictlyPhase() === 'reveal');
  const s = await state(page);
  assert.deepEqual(s.week.results[s.week.entries[0].cid].real, [8, 8, 8, 8]);
  assert.deepEqual(Object.values(s.week.totals), [17, 17, 17]);       // 12 + exact total bonus 5
  assert.deepEqual(page.errors, []);
});

test('fun stats show up mid-week and survive odd saved data', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A', 'Bob & B']);
  await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('strictly-v2')); S.rounds = [{ w: 1, c: 'X', r: [5, 5, 5, 5], g: { ghost: null } }, null]; localStorage.setItem('strictly-v2', JSON.stringify(S)); });
  await page.reload(); await page.addStyleTag({ content: CALM });
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=pickc] >> nth=0'); await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act=ready]'); await page.fill('#quick', '7777'); await page.press('#quick', 'Enter'); }
  await enterReal(page, [7, 7, 8, 8]);
  await page.click('[data-act=nav][data-to=season]'); await page.click('[data-act=stab][data-t=stats]');
  assert.ok(await page.locator('.awardcard').count() > 0, 'awards from the first revealed couple');
  assert.match(await page.textContent('#view'), /in progress/);
  assert.deepEqual(page.errors, []);
});

test('a week counts at the results podium, even without finishing "who went home"', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]');
  await playCouple(page, () => [7, 7, 7, 7], [7, 7, 7, 7]);          // last couple -> week results podium
  let s = await state(page);
  assert.equal(s.week.phase, 'wrap');
  assert.equal(s.history.length, 1, 'week in the history already');
  assert.equal(s.rounds.length, 1);
  assert.equal(Object.values(s.season)[0].weeks, 1);
  // reloading on this screen must not count it twice
  await page.reload(); await page.addStyleTag({ content: CALM });
  s = await state(page);
  assert.equal(s.history.length, 1); assert.equal(s.rounds.length, 1); assert.equal(Object.values(s.season)[0].weeks, 1);
  await page.click('[data-act=nav][data-to=season]'); await page.click('[data-act=stab][data-t=weeks]');
  assert.doesNotMatch(await page.textContent('#view'), /No weeks finished yet/);
  await page.click('[data-act=stab][data-t=stats]');
  assert.ok(await page.locator('.awardcard').count() > 0);
  // then who went home: eliminations recorded on the same history entry
  await page.click('[data-act=nav][data-to=""]'); await page.click('[data-act=toelim]'); await page.click('.cc:nth-child(1)'); await page.click('[data-act=finishweek]');
  s = await state(page);
  assert.equal(s.history.length, 1); assert.deepEqual(s.history[0].out, ['Ann & A']); assert.equal(s.couples[0].out, 1);
  assert.equal(Object.values(s.season)[0].weeks, 1, 'still counted once');
});

test('a week saved before this change, stuck on "who went home", gets counted on load', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]');
  await playCouple(page, () => [8, 8, 8, 8], [8, 8, 8, 8]);
  // simulate an old save: week on the elim screen but never committed
  await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('strictly-v2')); S.week.phase = 'elim'; delete S.week.committed;
    S.history = []; S.rounds = []; S.season = {}; localStorage.setItem('strictly-v2', JSON.stringify(S)); });
  await page.reload(); await page.addStyleTag({ content: CALM });
  const s = await state(page);
  assert.equal(s.history.length, 1); assert.equal(s.rounds.length, 1);
});

test('couples season scoreboard uses the real series scores', async () => {
  const page = await open();
  await page.click('[data-act=nav][data-to=season]'); await page.click('[data-act=stab][data-t=couples]');
  const txt = await page.textContent('#view');
  assert.doesNotMatch(txt, /Not danced yet/);
  assert.match(txt, /Lacey Turner/); assert.match(txt, /Charleston/);           // Lacey's best: week 6 Charleston, 36
  assert.match(txt, /Left week 2/);                                              // Chris & Amy, eliminated in the real series
  const first = await page.$eval('.board .lrow .sc', e => e.textContent.trim());
  assert.ok(+first > 25, 'top average looks like a real Strictly average');
  assert.equal(await page.locator('.board .lrow.gone').count(), 5, 'the 5 couples already eliminated are greyed out');
});

test('announced dances and songs are pre-filled for the week', async () => {
  const page = await open();
  await page.click('[data-act=newweek]');                         // week 7: Wikipedia lists the dances
  const s = await state(page);
  const filled = s.week.entries.filter(e => e.dance);
  assert.ok(filled.length >= 8, `only ${filled.length} dances pre-filled`);
  await page.click('[data-act=startweek]');
  await page.click('[data-act=pickc] >> nth=0');
  const sel = await page.$eval('[data-bind^="dance:"]', e => e.value);
  assert.ok(sel, 'dance pre-selected on the stage');
  assert.equal(await page.locator('.stage .music').count(), 1, 'song shown on the stage');
});

test('a counted week closes itself once the real elimination is in the data', async () => {
  const page = await open();
  await page.evaluate(() => localStorage.setItem('strictly-v2', JSON.stringify({ v: 2, jOrder: 2,
    couples: [{ id: 'c0', name: 'Lawrence Robb & Jowita Przystał', out: null, scores: [] }, { id: 'c1', name: 'Ann & A', out: null, scores: [] }],
    history: [{ n: 6, theme: '', winners: [], out: [], sick: [] }], weeksDone: 6, rounds: [], season: {},
    week: { n: 6, theme: '', phase: 'elim', committed: true, entries: [{ cid: 'c0', dance: '', status: 'dance' }, { cid: 'c1', dance: '', status: 'dance' }],
      pids: [], idx: 0, order: [], oi: 0, guesses: {}, totals: {}, prevTotals: {}, results: {}, leaving: [] } })));
  await page.reload(); await page.addStyleTag({ content: CALM }); await page.waitForTimeout(300);
  const s = await state(page);
  assert.equal(s.week, null, 'week closed');
  assert.equal(s.couples[0].out, 6);
  assert.deepEqual(s.history[0].out, ['Lawrence Robb & Jowita Przystał']);
});

test('judges react: same score = Snap!, Shirley/Anton shout SEVEN', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act=ready]'); await page.fill('#quick', '7777'); await page.press('#quick', 'Enter'); }
  await page.click('[data-act=jkey][data-n="6"]'); await page.click('[data-act=jkey][data-n="6"]');   // Craig 6, Motsi 6
  // Craig may say his own line first; the Snap! bubble replaces it shortly after Motsi's matching 6
  await page.waitForFunction(() => [...document.querySelectorAll('.paddle[data-i="0"] .jbub')].some(b => /Snap|minds|agree|Same/.test(b.textContent)), null, { timeout: 2500 });
  await page.click('[data-act=jkey][data-n="7"]');                 // Shirley 7 (shouts SEVEN most of the time)
  await page.waitForTimeout(700);
  const t = await page.$$eval('.paddle[data-i="2"] .jbub', e => e.map(x => x.textContent).join(' '));
  assert.ok(t === '' || /SE-?VEN|Se-ven|!/.test(t));
  assert.deepEqual(page.errors, []);
});

test('new-presenter jokes and whole-number averages', async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=pickc] >> nth=0'); await page.click('[data-act=danced]');
  const all = await page.evaluate(() => { const o = []; for (let i = 0; i < 800; i++) o.push(...window.__strictly.makeQuips([6, 7, 6, 7], { a: [6, 6, 6, 6] }, ['a'])); return o.map(q => q.t); });
  assert.ok(all.some(t => /first series|still (finding|learning|getting used)/i.test(t)), 'first-series jokes');
  await page.goto(URL); await page.click('[data-act=nav][data-to=season]'); await page.click('[data-act=stab][data-t=couples]');
  const avgs = await page.$$eval('.board .lrow .sc', e => e.map(x => x.textContent.trim()));
  assert.ok(avgs.every(a => /^\d+$/.test(a)), `averages not whole: ${avgs}`);
});

test('the audience boos a low score from Craig and he answers back', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=danced]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act=ready]'); await page.fill('#quick', '7777'); await page.press('#quick', 'Enter'); }
  await page.evaluate(() => { Math.random = () => 0.5; });   // take the "boo" branch every time
  await page.click('[data-act=jkey][data-n="3"]');            // Craig gives a 3
  const booed = !!(await page.waitForSelector('.boo', { state: 'attached', timeout: 2500 }).catch(() => null));
  await page.waitForTimeout(1500);
  const reply = await page.$$eval('.paddle[data-i="0"] .jbub', e => e.map(x => x.textContent).join(' '));
  assert.ok(booed, 'boos appear');
  assert.match(reply, /quiet|honest|boo|over it|ter|rules|dance-off/i);
  assert.deepEqual(page.errors, []);
});

test('week setup: rename players in place; help and footer link to the repo', async () => {
  const page = await open();
  await page.click('[data-act=newweek]');
  await page.fill('[data-bind^="player:"] >> nth=0', 'Nan');
  await page.click('[data-act=addplayerhere]');
  await page.keyboard.type('Grandad');                       // new player's box is focused
  const s = await state(page);
  assert.equal(s.players[0].name, 'Nan'); assert.equal(s.players[s.players.length - 1].name, 'Grandad');
  await page.click('[data-act=nav][data-to=rules]');
  assert.ok(await page.locator('#view a[href="https://github.com/natm/strictly-game"]').count() >= 1, 'help links to the repo');
  assert.ok(await page.locator('.credits a[href="https://github.com/natm/strictly-game"]').count() >= 1, 'footer links to the repo');
});

test('sound is off by default and remembers when you turn it on', async () => {
  const page = await open();
  assert.equal((await state(page) || {}).sound || false, false);
  assert.match(await page.textContent('[data-act=snd]'), /🔇/);
  await page.click('[data-act=snd]');
  assert.equal((await state(page)).sound, true);
  await page.reload(); await page.addStyleTag({ content: CALM });
  assert.match(await page.textContent('[data-act=snd]'), /🔊/, 'stays on after a reload once chosen');
  // an older save that had sound on by default gets switched off
  await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('strictly-v2')); S.sound = true; delete S.soundSet; localStorage.setItem('strictly-v2', JSON.stringify(S)); });
  await page.reload(); await page.addStyleTag({ content: CALM });
  assert.match(await page.textContent('[data-act=snd]'), /🔇/);
});

test('nudges "Player N" to enter their real name on the pass screen', async () => {
  const page = await open();
  await addCouples(page, ['Ann & A']);
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=danced]');
  assert.equal(await page.locator('.namenudge').count(), 1);
  const pid = (await state(page)).week.order[0];
  await page.fill('.namenudge input', 'Grandad');
  assert.equal(await page.textContent('.pass .who'), 'Grandad');
  assert.equal((await state(page)).players.find(p => p.id === pid).name, 'Grandad');
  await page.click('[data-act=ready]'); await page.fill('#quick', '7777'); await page.press('#quick', 'Enter');
  // next player keeps their default name and is not asked again
  await page.click('[data-act=keepname]');
  assert.equal(await page.locator('.namenudge').count(), 0);
});

test('players never share an emoji, and changing one does not re-render the page', async () => {
  const page = await open();
  await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('strictly-v2')); S.players.forEach(p => p.av = '🦄'); localStorage.setItem('strictly-v2', JSON.stringify(S)); });
  await page.reload(); await page.addStyleTag({ content: CALM });
  let avs = (await state(page)).players.map(p => p.av);
  assert.equal(new Set(avs).size, avs.length, 'duplicates fixed on load');
  await page.click('[data-act=nav][data-to=manage]');
  for (let i = 0; i < 14; i++) await page.click('[data-act=addplayer]');   // more players than usual
  avs = (await state(page)).players.map(p => p.av);
  assert.equal(new Set(avs).size, avs.length, 'new players get unused emojis');
  await page.evaluate(() => { document.getElementById('view').dataset.mark = 'same'; });
  for (let i = 0; i < 5; i++) await page.click('[data-act=cycleav] >> nth=0');
  assert.equal(await page.evaluate(() => document.getElementById('view').dataset.mark), 'same', 'no re-render');
  avs = (await state(page)).players.map(p => p.av);
  assert.equal(new Set(avs).size, avs.length, 'cycling skips emojis in use');
  assert.equal(await page.textContent('[data-act=cycleav] >> nth=0'), avs[0]);
});

test('presenters sometimes hand over to each other and the second replies', async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=pickc] >> nth=0'); await page.click('[data-act=danced]');
  const qs = await page.evaluate(() => { const o = []; for (let i = 0; i < 500; i++) o.push(window.__strictly.makeQuips([7, 8, 7, 8], { a: [7, 7, 7, 7] }, ['a'])); return o; });
  const names = ['Emma', 'Josh', 'Johannes'];
  const handovers = qs.filter(q => q[1] && q[1].reply);
  assert.ok(handovers.length > 50, `only ${handovers.length} handovers`);
  for (const q of handovers) {
    assert.ok(q[0].t.includes(names[q[1].p]), `first presenter names the second: ${q[0].t}`);
    assert.ok(q[1].t.includes(names[q[0].p]), `reply names the first: ${q[1].t}`);
  }
});

test('language menu: switch to Welsh (Cymraeg) and back; choice is remembered', async () => {
  const page = await open({ width: 390, height: 844 });
  await page.click('[data-act=langmenu]');
  await page.click('[data-act=setlang][data-l=cy]');
  assert.match(await page.textContent('[data-act=newweek]'), /Dechrau Wythnos 7/);
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'cy');
  await page.reload(); await page.addStyleTag({ content: CALM });
  assert.match(await page.textContent('[data-act=newweek]'), /Dechrau Wythnos/, 'remembered after reload');
  // walk the main screens in Welsh: no English UI leftovers, no sideways scroll
  await page.click('[data-act=newweek]');
  assert.match(await page.textContent('#view'), /Pwy sy'n chwarae heno\?/);
  await page.click('[data-act=startweek]');
  assert.match(await page.textContent('#view'), /Pwy Sy Nesaf\?/);
  await page.click('[data-act=pickc] >> nth=0');
  assert.match(await page.textContent('[data-act=danced]'), /Maen nhw wedi dawnsio/);
  await page.click('[data-act=danced]');
  assert.match(await page.textContent('#view'), /Pasiwch y rheolyddion/);
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(sw <= iw, 'no sideways scroll in Welsh');
  await page.click('[data-act=langmenu]'); await page.click('[data-act=setlang][data-l=en]');
  assert.match(await page.textContent('#view'), /Pass the controls/);
  assert.deepEqual(page.errors, []);
});

test('Dave Arch sometimes misses Claudia', async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=pickc] >> nth=0'); await page.click('[data-act=danced]');
  const dave = await page.evaluate(() => { const o = []; for (let i = 0; i < 1500; i++) o.push(...window.__strictly.makeQuips([7, 8, 7, 8], { a: [7, 7, 7, 7] }, ['a']).filter(q => q.p === 3).map(q => q.t)); return o; });
  assert.ok(dave.length > 40, 'Dave pops up now and then');
  assert.ok(dave.some(t => /Claudia/.test(t)), 'and sometimes misses Claudia');
});

test("pros show their country's flag; presenters spot past contestants in the audience", async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]');
  assert.ok(await page.locator('.cc .pflag').count() >= 9, 'flags on the pick screen');
  await page.click('[data-act=pickc] >> nth=0');                                  // Lacey Turner & Vito Coppola
  await page.waitForTimeout(3500);
  assert.equal(await page.textContent('.couplebig .pflag'), '🇮🇹');
  await page.click('[data-act=danced]');
  const lines = await page.evaluate(() => { const o = []; for (let i = 0; i < 1500; i++) o.push(...window.__strictly.makeQuips([7, 8, 7, 8], { a: [7, 7, 7, 7] }, ['a']).map(q => q.t)); return o; });
  assert.ok(lines.some(t => /in the audience|row three|up there/.test(t)), 'audience cameos');
  assert.ok(lines.some(t => /Ellie Leach|Chris McCausland|Karen Carney|\b20(23|24|25)\b/.test(t)));
  await page.goto(URL); await page.click('[data-act=nav][data-to=season]'); await page.click('[data-act=stab][data-t=couples]');
  assert.ok(await page.locator('.board .pflag').count() >= 10, 'flags on the season scoreboard');
  assert.deepEqual(page.errors, []);
});

test('presenters sometimes joke about the Strictly curse', async () => {
  const page = await open();
  await page.click('[data-act=newweek]'); await page.click('[data-act=startweek]'); await page.click('[data-act=pickc] >> nth=0'); await page.click('[data-act=danced]');
  const lines = await page.evaluate(() => { const o = []; for (let i = 0; i < 1500; i++) o.push(...window.__strictly.makeQuips([9, 9, 8, 9], { a: [7, 7, 7, 7] }, ['a']).map(q => q.t)); return o; });
  const curse = lines.filter(t => /curse/i.test(t));
  assert.ok(curse.length > 10, 'curse jokes turn up');
  assert.ok(curse.length < lines.length / 8, 'but only now and then');
});
