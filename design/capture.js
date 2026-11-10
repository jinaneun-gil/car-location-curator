// Captures the screen mockups in design/ from the real prototype.
// Run from the repository root: npm i --no-save playwright && npx playwright install chromium && node design/capture.js
// Time is faked and speech is replaced by a silent stand-in that lasts as long as real speech, so a run takes about a minute.
const path = require('node:path');
const { chromium } = require('playwright');
const OUT = __dirname + path.sep;
const PAGE = 'file://' + path.join(__dirname, '..', 'prototype', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-11-14T14:00:00+09:00') });
  await page.addInitScript(() => {
    let current = null;
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [], addEventListener() {},
      speak(u) { current = u; u._t = setTimeout(() => { if (current === u) current = null; u.onend && u.onend(); }, u.text.length / 6.5 * 1000); },
      cancel() { if (current) { clearTimeout(current._t); const u = current; current = null; u.onerror && u.onerror({ error: 'interrupted' }); } },
    } });
    window.webkitSpeechRecognition = function () { this.start = () => {}; };
    localStorage.clear();
  });
  await page.goto(PAGE);
  await page.clock.runFor(500);
  const car = () => page.locator('.car');
  const until = async (sel, max = 300) => { for (let i = 0; i < max && !(await page.$(sel)); i++) await page.clock.runFor(1000); };
  const shot = async (name, loc = car()) => { await loc.screenshot({ path: OUT + name }); console.log('saved', name); };

  await page.click('[data-topic="history"]');
  await page.click('[data-topic="nature"]');
  await page.click('#start');
  await until('.now.story');
  await page.clock.runFor(4000);
  await shot('car-01-driving-story.png');
  await until('.now.ad');
  await page.clock.runFor(2000);
  await shot('car-02-driving-ad.png');
  await page.click('[data-cmd="go"]');
  await page.clock.runFor(300);
  await shot('car-03-navi-first.png');
  await page.clock.runFor(4000);
  await page.click('[data-cmd="listen"]');
  await page.clock.runFor(300);
  await shot('car-04-voice-command.png');
  await page.evaluate(() => App.showListening(false));
  // Slow traffic: long version.
  await page.fill('#speedInput', '20');
  await page.dispatchEvent('#speedInput', 'input');
  await until('.now.story .meta >> text=길게 듣기');
  await page.clock.runFor(8000);
  await shot('car-05-slow-long-story.png');
  await page.fill('#speedInput', '60');
  await page.dispatchEvent('#speedInput', 'input');
  for (let t = 0; t < 400 && !(await page.textContent('#gear')).includes('P'); t++) await page.clock.runFor(1000);
  await page.clock.runFor(1000);
  await page.click('[data-detail="s5"]').catch(() => page.click('[data-detail]'));
  await shot('car-06-parked-history.png');
  await page.click('[data-coupon]');
  await page.clock.runFor(300);
  await shot('car-07-coupon-qr.png');
  await page.click('[data-scan]');
  await page.click('[data-close]');
  await page.click('[data-consent="ask"]');
  await page.locator('.consent').scrollIntoViewIfNeeded();
  await shot('car-08-consent.png');
  await page.click('[data-consent="yes"]');

  await page.click('#showPhone');
  await page.click('#tabUser');
  await page.clock.runFor(300);
  await shot('phone-01-coupon-wallet.png', page.locator('#phone'));
  await page.click('#tabBiz');
  await page.fill('[name="sponsor"]', '노을빛 젤라또');
  await page.fill('[name="text"]', '곧 지나는 노을빛 젤라또에서 두 번째 컵을 반값에 드립니다.');
  await page.fill('[name="coupon"]', '두 번째 컵 50% 할인');
  await page.dispatchEvent('#adForm', 'input');
  await shot('phone-02-advertiser-form.png', page.locator('#phone'));
  await page.click('#adForm [type="submit"]');
  await page.clock.runFor(300);
  await page.locator('#adStats').scrollIntoViewIfNeeded();
  await shot('phone-03-advertiser-result.png', page.locator('#phone'));
  await page.click('#showConsole');

  // Portrait car screen while driving, on a fresh page.
  await page.setViewportSize({ width: 820, height: 1400 });
  await page.reload();
  await page.clock.runFor(500);
  await page.click('#start');
  await until('.now.story');
  await page.clock.runFor(3000);
  await shot('car-09-portrait-driving.png');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
