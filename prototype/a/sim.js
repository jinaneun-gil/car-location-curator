// Simulated vehicle, control panel and the main loop.
(function () {
  const $ = id => document.getElementById(id);
  const s = {
    posM: 0, speedKmh: 60, gear: 'P', driverBusy: false, played: new Set(), interests: {},
    clock: 0, driveStart: 0, adsPlayed: 0, lastAdEnd: -Infinity, lastCategory: null,
    playing: null, restUntil: 0, announced: new Set(),
    adConsent: false, couponCategories: new Set(),
  };
  App.stats = {};
  const stat = id => (App.stats[id] = App.stats[id] || { plays: 0, goes: 0, coupons: 0 });

  // Advertiser-chosen period and hours. Registered ads only; sample ads have no schedule.
  function isActive(c) {
    if (!c.from) return true;
    const now = new Date(), today = now.toLocaleDateString('sv');
    return c.from <= today && today <= c.to && now.getHours() >= c.hours[0] && now.getHours() < c.hours[1];
  }
  const INTEREST_WEIGHT = 1.5;

  // Only chosen interests and saved coupons, and only after consent. Driving data never reaches this.
  function adInterests() {
    if (!s.adConsent) return {};
    const result = { ...s.interests };
    s.couponCategories.forEach(category => { result[category] = INTEREST_WEIGHT; });
    return result;
  }

  App.contents.forEach(c => { c.routeM = App.route.project(c.lat, c.lon); });

  function plannerState() {
    return {
      posM: s.posM, speedMps: s.speedKmh / 3.6, maneuvers: App.route.maneuvers,
      driverBusy: s.driverBusy, played: s.played, interests: s.interests, adInterests: adInterests(),
      elapsedSec: s.clock - s.driveStart, adsPlayed: s.adsPlayed,
      secSinceLastAd: s.clock - s.lastAdEnd, lastCategory: s.lastCategory,
    };
  }

  function showPlan(seq) {
    $('plan').innerHTML = seq.map(i => `<li>+${Math.round(i.start)}초 ${App.contentById(i.id).name} (${i.version})</li>`).join('');
  }

  function vehicleView() {
    const next = App.route.maneuvers.find(m => m.routeM > s.posM);
    return { speedKmh: s.gear === 'D' ? s.speedKmh : 0, gear: s.gear, posM: s.posM, tbt: next ? `${Math.round(next.routeM - s.posM)}m 앞 회전` : '' };
  }

  function announceManeuvers() {
    for (const m of App.route.maneuvers) {
      const eta = (m.routeM - s.posM) / (s.speedKmh / 3.6);
      if (eta <= 8 && eta > 0 && !s.announced.has(m.routeM)) {
        s.announced.add(m.routeM);
        App.interruptForNavi(m.text);
      }
    }
  }

  function tick() {
    s.clock++;
    if (s.gear === 'D') {
      s.posM += s.speedKmh / 3.6;
      if (s.posM >= App.route.length) { s.posM = App.route.length; setGear('P'); }
      announceManeuvers();
      const seq = App.planner.plan(plannerState(), App.contents.filter(isActive));
      showPlan(seq);
      if (!s.playing && s.clock >= s.restUntil && seq[0] && seq[0].start <= 1) {
        const item = seq[0];
        s.playing = item;
        s.played.add(item.id);
        s.lastCategory = item.category;
        App.log(`재생: ${App.contentById(item.id).name} (${item.version})`);
        App.play({ contentId: item.id, version: item.version });
      }
    }
    App.showVehicle(vehicleView());
  }

  function setGear(gear) {
    s.gear = gear;
    App.setMode(gear === 'D' ? 'driving' : 'parked');
    App.log(`기어 ${gear}`);
  }

  App.onFinished = id => {
    if (s.playing && s.playing.isAd && s.playing.id === id) {
      s.adsPlayed++;
      s.lastAdEnd = s.clock;
      stat(id).plays++;
      App.phoneUpdate();
    }
    s.playing = null;
    s.restUntil = s.clock + App.planner.DEFAULTS.gapSec;
  };

  App.onCommand = command => {
    App.log(`명령: ${command}`);
    if (command === 'go' && s.playing) {
      App.log(`경유지 추가: ${App.contentById(s.playing.id).name}`);
      if (s.playing.isAd) { stat(s.playing.id).goes++; App.phoneUpdate(); }
    }
  };

  App.setPreferences = ({ consent, interests }) => {
    s.interests = Object.fromEntries(interests.map(category => [category, INTEREST_WEIGHT]));
    s.adConsent = consent;
    if (!consent) s.couponCategories.clear();
    App.log(`맞춤 광고 ${consent ? '동의' : '미동의'}, 관심사 ${interests.length}개`);
  };

  App.onCouponSaved = id => {
    const c = App.contentById(id);
    if (s.adConsent) s.couponCategories.add(c.category);
    App.log(`쿠폰 저장: ${c.sponsor}`);
    stat(id).coupons++;
    App.saveCoupon(c);
    App.phoneUpdate();
  };

  App.addAd = ad => {
    ad.routeM = App.route.project(ad.lat, ad.lon);
    App.contents.push(ad);
    App.redrawMap();
    App.log(`광고 게시: ${ad.sponsor}`);
    App.phoneUpdate();
  };

  $('start').onclick = () => {
    s.posM = 0; s.played.clear(); s.announced.clear(); s.adsPlayed = 0;
    s.lastAdEnd = -Infinity; s.lastCategory = null; s.driveStart = s.clock;
    setGear('D');
  };
  $('gearD').onclick = () => setGear('D');
  $('gearP').onclick = () => setGear('P');
  $('speedInput').oninput = e => { s.speedKmh = +e.target.value; $('speedOut').value = s.speedKmh; };
  $('signal').onchange = e => { s.driverBusy = e.target.checked; };
  $('naviNow').onclick = () => App.interruptForNavi('잠시 후 내비 안내입니다.');

  App.log = text => {
    const li = document.createElement('li');
    li.textContent = text;
    $('log').prepend(li);
  };

  App.setMode('parked');
  App.showVehicle(vehicleView());
  setInterval(tick, 1000);
})();
