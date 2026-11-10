// Run with: node a/planner.test.js
const assert = require('node:assert');
const { plan, DEFAULTS } = require('./planner.js');

const text = seconds => 'ㄱ'.repeat(Math.round(seconds * DEFAULTS.charsPerSec));
const story = (id, routeM, extra) => ({
  id, type: 'story', category: 'history', importance: 3, routeM,
  short: text(10), long: text(40), ...extra,
});
const ad = (id, routeM) => ({ id, type: 'ad', category: 'food', bid: 4, routeM, short: text(8) });
const state = extra => ({
  posM: 0, speedMps: 16, maneuvers: [], driverBusy: false, played: new Set(), interests: {}, adInterests: {},
  elapsedSec: 0, adsPlayed: 0, secSinceLastAd: Infinity, lastCategory: null, ...extra,
});

assert.strictEqual(plan(state({ speedMps: 25 }), [story('s', 300)])[0].version, 'short', 'fast traffic uses the short version');
assert.strictEqual(plan(state({ speedMps: 3 }), [story('s', 300)])[0].version, 'long', 'slow traffic uses the long version');
assert.strictEqual(plan(state({ played: new Set(['s']) }), [story('s', 300)]).length, 0, 'played items are skipped');

const turn = plan(state({ speedMps: 10, maneuvers: [{ routeM: 200 }] }), [story('s', 400)])[0];
assert.ok(turn.start >= 20 + DEFAULTS.maneuverAfterSec || turn.start + turn.dur <= 20 - DEFAULTS.maneuverBeforeSec, 'speech avoids turns');

const busy = plan(state({ driverBusy: true }), [story('s', 500)])[0];
assert.ok(busy.start >= DEFAULTS.busySec, 'speech waits while the driver is busy');

assert.strictEqual(plan(state({ speedMps: 16 }), [ad('a', 200)]).length, 0, 'an ad too close to decide on is dropped');
const ads = plan(state({ speedMps: 8 }), [ad('a', 800), ad('b', 900)]);
assert.ok(ads.length < 2 || ads[1].start - (ads[0].start + ads[0].dur) >= DEFAULTS.minAdGapSec, 'ads keep their minimum gap');

// Close enough that only one of the two ads fits before its deadline.
const cafe = { ...ad('cafe', 500), category: 'cafe' };
const food = { ...ad('food', 500), category: 'food' };
assert.strictEqual(plan(state({ speedMps: 8, adInterests: { cafe: 1.5 } }), [food, cafe])[0].id, 'cafe', 'a consented interest raises matching ads');
const noConsent = plan(state({ speedMps: 8, interests: { cafe: 1.5 } }), [food, cafe])[0].id;
assert.strictEqual(noConsent, 'food', 'story interests alone never personalize ads');

const reach = plan(state({ speedMps: 10 }), [{ ...ad('r', 1000), reachM: 800 }])[0];
assert.ok(reach.start >= 20, 'an ad waits until the car is inside its registered reach');

// Full route dry run with the real demo data.
global.App = { contents: [], route: null };
global.window = global;
require('./route.js');
require('../b/content.js');
App.contents.forEach(c => { c.routeM = App.route.project(c.lat, c.lon); });
let s = state({ maneuvers: App.route.maneuvers }), t = 0, busyUntil = 0, lastAdEnd = -Infinity;
const played = [];
while (s.posM < App.route.length) {
  if (t >= busyUntil) {
    const next = plan({ ...s, elapsedSec: t, secSinceLastAd: t - lastAdEnd }, App.contents)[0];
    if (next && next.start <= 1) {
      played.push(next);
      s.played.add(next.id);
      s.lastCategory = next.category;
      busyUntil = t + next.dur + DEFAULTS.gapSec;
      if (next.isAd) { s.adsPlayed++; lastAdEnd = t + next.dur; }
    }
  }
  s.posM += s.speedMps;
  t++;
}
const adCount = played.filter(p => p.isAd).length;
console.log(`demo route: ${t}s, ${played.length} items, ${adCount} ads:`, played.map(p => `${p.id}/${p.version}`).join(' '));
assert.ok(adCount >= 3 && adCount <= 4, `demo should play 3-4 ads, played ${adCount}`);
assert.ok(played.length - adCount >= 3, 'demo should still be mostly stories');
console.log('ok');
