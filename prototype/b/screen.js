// Car screen: driving view, route map, and the driving and parked app panels.
(function () {
  const $ = id => document.getElementById(id);
  let mode = 'parked', nowPlaying = null;
  const heard = [];
  const TOPICS = [['history', '역사'], ['nature', '자연'], ['culture', '문화'], ['cafe', '카페'],
    ['food', '맛집'], ['experience', '체험'], ['event', '행사'], ['charging', '충전']];
  let consent = false, askConsent = false;
  const interests = new Set();

  const sendPreferences = () => App.setPreferences({ consent, interests: [...interests] });

  $('appName').textContent = App.NAME;

  // Fit route coordinates into the square map.
  const lats = App.route.points.map(p => p[0]), lons = App.route.points.map(p => p[1]);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const xy = ([lat, lon]) => [
    30 + ((lon - minLon) / (maxLon - minLon)) * 340,
    370 - ((lat - minLat) / (maxLat - minLat)) * 340,
  ];

  App.redrawMap = () => {
    const line = App.route.points.map(p => xy(p).join(',')).join(' ');
    const places = App.contents.map(c => {
      const [x, y] = xy([c.lat, c.lon]);
      return `<circle cx="${x}" cy="${y}" r="6" class="${c.type}"/>`;
    }).join('');
    $('map').innerHTML = `<polyline points="${line}" class="road"/>${places}<circle id="carDot" r="10" class="carDot"/>`;
  };
  App.redrawMap();

  function renderDriving() {
    const c = nowPlaying && App.contentById(nowPlaying);
    $('panel').innerHTML = `
      <p class="label">${c ? (c.type === 'ad' ? '광고' : '지금 듣는 이야기') : '다음 이야기를 준비하고 있어요'}</p>
      <h2 class="title">${c ? c.name : App.NAME}</h2>
      <div class="controls">
        <button data-cmd="go">가 볼래</button>
        <button data-cmd="next">다음</button>
        <button data-cmd="listen">말하기</button>
      </div>`;
  }

  function renderParked() {
    const items = heard.map(App.contentById, App).map(c => `
      <li><b>${c.name}</b>${c.coupon ? `<button data-coupon="${c.id}">${c.coupon} 받기</button>` : ''}</li>`).join('');
    $('panel').innerHTML = `
      <h2 class="title">오늘 지나온 곳</h2>
      <ul class="heard">${items || '<li>아직 들은 이야기가 없어요</li>'}</ul>
      <div id="qr"></div>
      <h3>관심사</h3>
      <div class="chips">${TOPICS.map(([key, label]) =>
        `<button data-topic="${key}" aria-pressed="${interests.has(key)}">${label}</button>`).join('')}</div>
      ${consentSection()}`;
  }

  function consentSection() {
    if (consent) return '<p class="note">맞춤 광고 사용 중</p><button data-consent="revoke">동의 철회 및 데이터 삭제</button>';
    if (!askConsent) return '<button data-consent="ask">맞춤 광고 설정</button>';
    return `<div class="consent">
      <p><b>맞춤 광고 동의 (선택)</b></p>
      <p>수집 항목: 선택한 관심사, 쿠폰 저장 이력<br>이용 목적: 관심사에 맞는 광고 안내<br>보유 기간: 동의 철회 시까지</p>
      <p>동의를 거부할 수 있으며, 거부해도 앱을 그대로 쓸 수 있습니다. 주행 데이터는 광고 선택에 쓰지 않습니다.</p>
      <div class="row"><button data-consent="yes">동의</button><button data-consent="no">거부</button></div>
    </div>`;
  }

  const render = () => (mode === 'driving' ? renderDriving() : renderParked());

  $('panel').addEventListener('click', e => {
    const { cmd, coupon, topic, consent: action } = e.target.dataset;
    if (cmd === 'listen') App.listen();
    else if (cmd) App.sendCommand(cmd);
    if (coupon) {
      App.onCouponSaved(coupon);
      $('qr').textContent = `QR 자리 (B 작업): ${App.contentById(coupon).coupon}`;
    }
    if (topic) {
      interests.has(topic) ? interests.delete(topic) : interests.add(topic);
      sendPreferences();
      render();
    }
    if (action) {
      askConsent = action === 'ask';
      consent = action === 'yes';
      if (action === 'revoke') interests.clear();
      if (action !== 'ask') sendPreferences();
      render();
    }
  });

  App.setMode = next => { mode = next; render(); };

  App.showWaypoint = name => {
    $('waypoint').textContent = `경유지 추가됨: ${name}`;
    $('waypoint').hidden = false;
  };

  App.showNowPlaying = id => {
    nowPlaying = id;
    if (!heard.includes(id)) heard.push(id);
    render();
  };

  App.showVehicle = v => {
    $('speed').textContent = Math.round(v.speedKmh);
    $('gear').textContent = v.gear;
    $('tbt').textContent = v.tbt;
    const [x, y] = xy(App.route.pointAt(v.posM));
    const dot = $('carDot');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
  };
})();
