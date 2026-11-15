// Checks meaningful state transitions and narrow layouts against the real prototype.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-11-14T14:00:00+09:00') });
    await page.goto(pathToFileURL(path.join(__dirname, '../prototype/index.html')).href);
    await page.clock.runFor(500);
    assert.equal(await page.locator('.map-credit').count(), 1);
    assert.equal(await page.locator('#map image').evaluate(el => el.href.baseVal), 'assets/aewol-map.png');
    assert.equal(await page.locator('#map image').evaluate(async () => {
      const image = new Image(); image.src = document.querySelector('#map image').href.baseVal;
      await image.decode(); return image.naturalWidth;
    }), 768);
    await page.evaluate(() => { App.setMode('driving'); App.showNowPlaying('s2', 'short'); App.showProgress(1, 3); });
    assert.match(await page.locator('#panel .title').innerText(), /애월진성/);
    await page.evaluate(() => App.showListening(true));
    assert.equal(await page.locator('[data-cmd="listen"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.progress').getAttribute('aria-valuenow'), '33');
    await page.evaluate(() => App.showListening(false));
    for (const width of [1920, 1600, 1024, 820, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await page.evaluate(() => {
        const panel = document.getElementById('panel').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('.controls button')].map(el => el.getBoundingClientRect());
        return { scrollWidth: document.documentElement.scrollWidth, width: innerWidth, panel: { left: panel.left, right: panel.right }, buttons: buttons.map(r => ({ left: r.left, right: r.right, width: r.width, height: r.height })) };
      });
      assert(geometry.scrollWidth <= geometry.width + 1, `Horizontal overflow at ${width}: ${geometry.scrollWidth}`);
      geometry.buttons.forEach(button => {
        assert(button.left >= geometry.panel.left && button.right <= geometry.panel.right + 1, `Button clipped at ${width}`);
        assert(button.height >= 70, `Touch target too small at ${width}`);
      });
    }
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.evaluate(() => { App.showNowPlaying('a1', 'short'); App.setMode('parked'); });
    await page.locator('[data-coupon="a1"]').click();
    await page.waitForSelector('.qr-image svg');
    await page.locator('[data-scan]').click();
    await page.locator('[data-close="qr"]').click();
    await page.locator('[data-consent="ask"]').click();
    await page.locator('[data-consent="yes"]').click();
    await page.locator('[data-topic="nature"]').click();
    assert.equal(await page.locator('[data-topic="nature"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-consent="revoke"]').click();
    assert.equal(await page.locator('[data-topic="nature"]').getAttribute('aria-pressed'), 'false');
    await page.locator('[data-coupon="a1"]').click();
    await page.evaluate(() => App.setMode('driving'));
    assert.equal(await page.locator('.qr-card').count(), 0, 'QR must close when driving');
    await page.locator('#showPhone').click();
    await page.locator('#tabUser').click();
    assert.equal(await page.locator('.wallet-item').count(), 1);
    // Click the nested icon, not the button text, to exercise delegated events.
    await page.locator('[data-use] svg').click();
    assert.match(await page.locator('.coupon-used').innerText(), /사용 완료/);
    await page.locator('#tabBiz').click();
    await page.locator('[name="sponsor"]').fill('시연 가게');
    await page.locator('[name="text"]').fill('지나는 길에 쉬어가세요.');
    await page.locator('#adForm [type="submit"]').click();
    assert.match(await page.locator('#adResult').innerText(), /검수 통과/);
    assert.match(await page.locator('#adStats').innerText(), /시연 가게/);
    assert.deepEqual(errors, []);
    console.log('PASS: local map, progress, voice state, 6 viewport sizes, QR drive lock, consent revocation, coupon icon click, advertiser form; no browser errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
