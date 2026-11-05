// iPad / tablet end-to-end tests (touch, portrait and landscape). Run with: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CALM = 'button.pulse{animation:none!important}button:hover{transform:none!important}';
const TABLETS = {
  'iPad portrait': devices['iPad (gen 7)'],
  'iPad landscape': devices['iPad (gen 7) landscape'],
  'iPad Pro 11 portrait': devices['iPad Pro 11'],
  'iPad Pro 11 landscape': devices['iPad Pro 11 landscape'],
  'Galaxy Tab S4 landscape': devices['Galaxy Tab S4 landscape'],
};
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

async function open(device) {
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  page.errors = []; page.on('pageerror', e => page.errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(URL); await page.addStyleTag({ content: CALM });
  page.ctx = ctx; return page;
}
const vp = page => page.viewportSize();
async function fits(page, sel, name) {
  const b = await page.$eval(sel, e => e.getBoundingClientRect().bottom);
  assert.ok(b <= vp(page).height + 1, `${name}: ${sel} at ${Math.round(b)}px, below the ${vp(page).height}px screen`);
}
async function noSideScroll(page, name) {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(sw <= iw, `${name}: sideways scroll (${sw} > ${iw})`);
}

for (const [name, device] of Object.entries(TABLETS)) {
  test(`${name}: whole couple by touch, no sideways scroll, key controls on screen`, async () => {
    const page = await open(device);
    await noSideScroll(page, name + ' home');
    await page.tap('[data-act=newweek]'); await noSideScroll(page, name + ' setup');
    await page.tap('[data-act=startweek]'); await noSideScroll(page, name + ' pick');
    await page.tap('[data-act=pickc] >> nth=0');
    await page.waitForTimeout(4200);
    await noSideScroll(page, name + ' stage');
    await fits(page, '[data-act=danced]', name + ' stage');
    await page.selectOption('[data-bind^="dance:"]', 'Foxtrot');
    await page.tap('[data-act=danced]');
    for (let i = 0; i < 3; i++) {
      await page.tap('[data-act=ready]');
      for (const [j, n] of [[0, 7], [1, 8], [2, 7], [3, 8]]) await page.tap(`[data-act=key][data-j="${j}"][data-n="${n}"]`);
      await fits(page, '.qlock', name + ' guess');
      await page.tap('.qlock');
    }
    // judges: tap number + ✓, no keyboard box on touch screens
    assert.equal(await page.isVisible('#jscore'), false, 'no text box on tablets');
    await fits(page, '.jkeys button[data-n="10"]', name + ' judges');
    for (const n of [8, 9, 8, 9]) await page.tap(`[data-act=jkey][data-n="${n}"]`);
    await fits(page, '#jdone', name + ' reveal button');
    await page.tap('#jdone');
    await page.waitForFunction(() => window.__strictlyPhase() === 'reveal');
    await noSideScroll(page, name + ' reveal');
    await page.waitForFunction(() => document.querySelectorAll('.rs.done').length === 12, null, { timeout: 4000 });
    await page.waitForSelector('[data-act=skipreveal]', { state: 'visible', timeout: 5000 }).catch(() => {});
    if (await page.isVisible('[data-act=skipreveal]')) await page.tap('[data-act=skipreveal]');
    await page.tap('[data-act=board]'); await noSideScroll(page, name + ' leaderboard');
    assert.deepEqual(page.errors, []);
    await page.ctx.close();
  });
}

test('iPad: rotating mid-guess keeps the layout and the progress', async () => {
  const page = await open(TABLETS['iPad portrait']);
  await page.tap('[data-act=newweek]'); await page.tap('[data-act=startweek]');
  await page.tap('[data-act=pickc] >> nth=0'); await page.tap('[data-act=danced]'); await page.tap('[data-act=ready]');
  await page.tap('[data-act=key][data-j="0"][data-n="9"]');
  const land = TABLETS['iPad landscape'].viewport;
  await page.setViewportSize(land);
  await noSideScroll(page, 'rotated');
  assert.equal(await page.locator('.pad.has').count(), 1);
  await fits(page, '.qlock', 'rotated guess');
  await page.ctx.close();
});
