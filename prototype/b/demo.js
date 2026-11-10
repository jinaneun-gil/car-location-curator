// Recording helper for the demo video. Open index.html?demo and press the start button.
// It only presses the same buttons a person would, waiting for real events, so the planner still decides what plays.
(function () {
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const listeners = [];

  // Resolve when a content of the given test starts playing.
  const nextPlay = test => new Promise(resolve => listeners.push({ test, resolve }));
  const originalPlay = App.play;
  App.play = cue => {
    originalPlay(cue);
    const c = App.contentById(cue.contentId);
    listeners.splice(0).forEach(l => (l.test(c, cue) ? l.resolve(c) : listeners.push(l)));
  };

  let parkedResolve = null;
  const originalSetMode = App.setMode;
  App.setMode = mode => {
    originalSetMode(mode);
    if (mode === 'parked' && parkedResolve) { parkedResolve(); parkedResolve = null; }
  };
  const parked = () => new Promise(resolve => { parkedResolve = resolve; });

  function setSpeed(kmh) {
    const input = $('speedInput');
    input.value = kmh;
    input.dispatchEvent(new Event('input'));
  }

  function card(html, buttonLabel) {
    const el = document.createElement('div');
    el.className = 'demo-card';
    el.innerHTML = `<div>${html}${buttonLabel ? `<button class="primary">${buttonLabel}</button>` : ''}</div>`;
    document.body.appendChild(el);
    return el;
  }

  const style = document.createElement('style');
  style.textContent = `
    .demo-card { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(5, 7, 10, 0.92); z-index: 30; text-align: center; }
    .demo-card > div { max-width: 680px; padding: 32px; line-height: 1.6; word-break: keep-all; }
    .demo-card h1 { font-size: 40px; margin: 0 0 12px; }
    .demo-card p { color: #c8ced6; font-size: 18px; margin: 0 0 12px; }
    .demo-card button { margin-top: 16px; font-size: 22px; padding: 16px 32px; }
    .demo-step { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); padding: 8px 16px; border-radius: 999px; background: #6aa9ff; color: #06182f; font-weight: 700; z-index: 25; }`;
  document.head.appendChild(style);

  const stepLabel = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'demo-step', hidden: true }));
  const step = text => { stepLabel.hidden = !text; stepLabel.textContent = text || ''; };

  // Scene 1: a merchant registers an ad on the phone. The same ad is then chosen by the planner on the road.
  const MERCHANT = '달물길 식당';
  function resetRegisteredAds() {
    try { localStorage.removeItem('curator.registeredAds'); } catch { /* demo works without storage */ }
    App.contents.splice(0, App.contents.length, ...App.contents.filter(c => !c.id.startsWith('reg-')));
    App.redrawMap();
    App.phoneUpdate();
  }

  async function registerAd() {
    const form = $('adForm');
    const fill = async (name, value, pause = 1200) => {
      form.elements[name].value = value;
      form.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(pause);
    };
    step('지역 상인: 폰에서 광고 등록');
    $('showPhone').click();
    $('tabBiz').click();
    await wait(1500);
    await fill('sponsor', MERCHANT);
    await fill('category', 'food');
    await fill('place', 's6');
    step('노출 조건: 위치, 도착 전 2km부터, 기간, 시간대');
    await fill('reachM', '2000', 3500);
    await fill('hours', '0,24', 1500);
    await fill('bid', '5', 1500);
    step('안내 문구와 쿠폰');
    await fill('text', `곧 지나는 ${MERCHANT}에서 제주 향토 정식을 드실 수 있습니다.`, 2000);
    await fill('coupon', '식사 10% 할인', 2000);
    form.querySelector('[type=submit]').click();
    step('검수 통과 → 게시 (시뮬레이션)');
    await wait(3000);
    $('showConsole').click();
  }

  async function run() {
    resetRegisteredAds();
    await registerAd();
    const arrived = parked();
    step('주행 시작 · 60km/h');
    $('start').click();

    // 1. The ad registered in scene 1 reaches the driver: answer "가 볼래" so it becomes a waypoint.
    const ad = await Promise.race([nextPlay(c => c.sponsor === MERCHANT), arrived]);
    if (ad) {
      step('방금 등록한 광고가 차에서 음성으로');
      await wait(2500);
      step('음성 명령 "가 볼래" → 경유지 추가');
      App.showCaption('가 볼래', 'driver');
      App.log('시연: 음성 명령 "가 볼래"');
      App.sendCommand('go');
      await wait(4000);
    }

    // 2. Traffic: slow down so the planner switches to the long version, then speed up again.
    step('정체 구간 (속도 20km/h) → 긴 이야기로 전환');
    setSpeed(20);
    const longStory = nextPlay((c, cue) => cue.version === 'long').then(() => new Promise(resolve => {
      const original = App.onFinished;
      App.onFinished = id => { App.onFinished = original; original(id); resolve(id); };
    }));
    await Promise.race([longStory, arrived]);
    step('정체 해소 · 60km/h');
    setSpeed(60);

    // 3. Arrival: the simulation shifts to P at the end of the route; open the coupon of the ad from step 1.
    await arrived;
    step('도착 · 정차 화면');
    await wait(3000);
    const couponButton = (ad && document.querySelector(`[data-coupon="${ad.id}"]`)) || document.querySelector('[data-coupon]');
    if (couponButton) {
      step('쿠폰 QR 표시');
      couponButton.click();
      await wait(4000);
      const scan = document.querySelector('[data-scan]');
      if (scan) {
        step('휴대폰으로 스캔 → 쿠폰함에 저장');
        scan.click();
        await wait(2500);
      }
      $('showPhone').click();
      $('tabUser').click();
      await wait(3500);
      const useCoupon = document.querySelector('[data-use]');
      if (useCoupon) {
        step('매장에서 쿠폰 사용');
        useCoupon.click();
        await wait(3000);
      }
      step('상인 성과: 음성 노출 → 경유지 추가 → 쿠폰 저장');
      $('tabBiz').click();
      $('adStats').scrollIntoView({ block: 'center' });
      await wait(6000);
      $('showConsole').click();
    }
    step(null);
    card(`<h1>${App.NAME}</h1>
      <p>지나가는 차를 지역 상점의 손님으로. 이야기로 귀를 열고, 혜택으로 발길을 잇습니다.</p>
      <p>이 영상의 차량 신호(기어, 속도, 위치, 내비 안내)는 웹 시뮬레이션입니다. 홍보 상호는 모두 가상입니다.</p>
      <p>지도 데이터 © OpenStreetMap 기여자</p>`);
  }

  window.addEventListener('load', () => {
    const intro = card(`<h1>${App.NAME} 시연</h1>
      <p>지역 상인의 광고 등록부터 운전자의 방문, 상인의 성과 확인까지</p>
      <p>제주 애월~곽지 일주서로 약 3.1km 구간</p>
      <p>차량 신호(기어, 속도, 위치, 내비 안내)는 시뮬레이션입니다.<br>음성이 나오므로 소리를 켜 주세요.</p>`, '시연 시작');
    // Speech needs a user gesture, so the run starts from this button.
    intro.querySelector('button').onclick = () => { intro.remove(); run(); };
  });
})();
