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

  async function run() {
    const arrived = parked();
    step('주행 시작 · 60km/h');
    $('start').click();

    // 1. The first ad: answer "가 볼래" so it becomes a waypoint.
    const ad = await nextPlay(c => c.type === 'ad');
    await wait(2500);
    step('음성 명령 "가 볼래" → 경유지 추가');
    App.showCaption('가 볼래', 'driver');
    App.log('시연: 음성 명령 "가 볼래"');
    App.sendCommand('go');
    await wait(4000);

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
    const couponButton = document.querySelector(`[data-coupon="${ad.id}"]`) || document.querySelector('[data-coupon]');
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
      await wait(5000);
      $('showConsole').click();
    }
    step(null);
    card(`<h1>${App.NAME}</h1>
      <p>지금 지나는 곳과 곧 만날 곳의 이야기를 운전에 방해되지 않는 음성으로 들려줍니다.</p>
      <p>이 영상의 차량 신호(기어, 속도, 위치, 내비 안내)는 웹 시뮬레이션입니다. 홍보 상호는 모두 가상입니다.</p>
      <p>지도 데이터 © OpenStreetMap 기여자</p>`);
  }

  window.addEventListener('load', () => {
    const intro = card(`<h1>${App.NAME} 시연</h1>
      <p>제주 애월~곽지 일주서로 약 3.1km 구간</p>
      <p>차량 신호(기어, 속도, 위치, 내비 안내)는 시뮬레이션입니다.<br>음성이 나오므로 소리를 켜 주세요.</p>`, '시연 시작');
    // Speech needs a user gesture, so the run starts from this button.
    intro.querySelector('button').onclick = () => { intro.remove(); run(); };
  });
})();
