// Car screen: driving view, route map, and the driving and parked app panels.
// Driving: only the current title, a status label and three large buttons. Parked: details, coupon QR, interests, consent.
(function () {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  // Extra B scripts, loaded here so index.html does not need to change: the QR encoder, and the recording helper on ?demo.
  const loadScript = src => document.head.appendChild(Object.assign(document.createElement('script'), { src }));
  loadScript('b/qr.js');
  if (params.has('demo')) loadScript('b/demo.js');

  const TOPICS = [['history', '역사'], ['nature', '자연'], ['culture', '문화'], ['cafe', '카페'],
    ['food', '맛집'], ['experience', '체험'], ['event', '행사'], ['charging', '충전'], ['stay', '숙소'], ['shop', '편의점']];
  const topicLabel = key => (TOPICS.find(([k]) => k === key) || [key, key])[1];
  const esc = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);

  let mode = 'parked', nowPlaying = null, nowVersion = null, naviText = null, listening = false;
  let consent = false, askConsent = false, couponOpen = null, waypointTimer = null, lastVehicle = null;
  let progressPercent = 0;
  const heard = [], openDetails = new Set(), savedCoupons = new Set(), waypoints = new Set();
  const interests = new Set();

  const sendPreferences = () => App.setPreferences({ consent, interests: [...interests] });

  $('appName').textContent = App.NAME;

  // Same Web Mercator coordinates as assets/map-config.json; no network at runtime.
  const xy = ([lat, lon]) => [
    ((lon + 180) / 360 * 32768 - 27880) * 256,
    ((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 32768 - 13147) * 256,
  ];
  const line = points => points.map(p => xy(p).map(v => v.toFixed(1)).join(',')).join(' ');

  App.redrawMap = () => {
    const places = App.contents.map(c => {
      const [x, y] = xy([c.lat, c.lon]);
      const state = [c.type, heard.includes(c.id) ? 'heard' : '', c.id === nowPlaying ? 'active' : ''].join(' ');
      const pin = waypoints.has(c.id) ? `<path class="pin" d="M${x} ${y - 8}l-7 -14h14z"/>` : '';
      const active = c.id === nowPlaying;
      const label = active ? `<text x="${Math.max(18, Math.min(x + 18, 560))}" y="${y - 20}" class="map-place-label ${c.type}">${esc(c.name)}</text>` : '';
      return `<circle cx="${x}" cy="${y}" r="${active ? 11 : 5}" class="place ${state}"/>${pin}${label}`;
    }).join('');
    $('map').innerHTML = '<image href="assets/aewol-map.png" width="768" height="1024"/>' +
      `<polyline points="${line(App.route.points)}" class="road-casing"/><polyline points="${line(App.route.points)}" class="road"/>` +
      `<polyline id="passed" points="" class="passed"/>${places}<g id="carDot"><circle r="17" class="carDot"/><path d="M0 -11L9 10 0 6-9 10Z" class="car-arrow"/></g>`;
    if (lastVehicle) App.showVehicle(lastVehicle);
  };
  App.redrawMap();

  function nowCard() {
    const c = nowPlaying && App.contentById(nowPlaying);
    if (naviText) {
      return `<div class="now navi-prompt"><p class="label"><span class="badge navi-prompt">${App.icon('go')}내비 안내</span></p>
        <h2 class="title">${esc(naviText)}</h2>
        <p class="meta">${c ? `${esc(c.name)} ${c.type === 'ad' ? '광고는' : '이야기는'} 안내가 끝나면 이어서 들려드려요` : '길 안내 음성이 먼저 나옵니다'}</p></div>`;
    }
    if (!c) {
      return `<div class="now idle"><p class="label"><span class="badge">${App.icon('audio')}주변 이야기</span></p>
        <h2 class="title">다음 이야기를<br>준비하고 있어요</h2><p class="meta">지나는 곳에 이야기가 생기면<br>음성으로 들려드릴게요.</p></div>`;
    }
    const isAd = c.type === 'ad';
    return `<div class="now ${isAd ? 'ad' : 'story'}">
      <p class="label"><span class="badge ${isAd ? 'ad' : 'story'}">${App.icon(isAd ? 'ticket' : 'audio')}${isAd ? '광고' : '지금 듣는 이야기'}</span></p>
      <h2 class="title">${esc(c.name)}</h2>
      <p class="meta">${esc(topicLabel(c.category))}${isAd ? ` · ${esc(c.coupon || '혜택 안내')}` : ` · ${nowVersion === 'long' ? '길게 듣기' : '짧게 듣기'}`}</p>
      <div class="progress" role="progressbar" aria-label="이야기 진행" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent}"><span id="progressBar" style="width:${progressPercent}%"></span></div>
      <div class="playback-status"><span>음성 안내 중</span><span>길 안내 우선</span></div></div>`;
  }

  function renderDriving() {
    $('panel').innerHTML = `
      <div class="app-driving"><div aria-live="polite">${nowCard()}</div>
      <div class="controls">
        <button data-cmd="go" class="primary" ${nowPlaying ? '' : 'disabled'}>${App.icon('go')}가 볼래</button>
        <button data-cmd="next" ${nowPlaying ? '' : 'disabled'}>${App.icon('next')}다음</button>
        <button data-cmd="listen" class="${listening ? 'listening' : ''}" aria-pressed="${listening}">${App.icon('mic')}${listening ? '듣는 중…' : '말하기'}</button>
      </div>
      <p class="hint">${App.icon('shield')}"가 볼래", "다음", "그만"이라고 말할 수 있어요</p></div>`;
  }

  // Short code shown under the QR; stands in for a server-issued coupon number.
  // The QR prefix follows the package name (app.curator), so renaming the app does not change it.
  function couponCode(id) {
    let h = 7;
    for (const ch of id + new Date().toLocaleDateString('sv')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h.toString(36).toUpperCase().slice(-6).padStart(6, '0');
  }

  function qrCard() {
    const c = App.contentById(couponOpen);
    const code = couponCode(c.id);
    const qr = window.QR ? window.QR.svg(`CURATOR:COUPON:${c.id}:${code}`) : '<p>QR 준비 중</p>';
    const saved = savedCoupons.has(c.id);
    return `<section class="qr-card" aria-label="쿠폰 QR">
      <div class="qr-image">${qr}</div>
      <div class="qr-info">
        <p class="badge ad">쿠폰</p>
        <h3>${esc(c.sponsor)}</h3>
        <p class="coupon">${esc(c.coupon)}</p>
        <p class="code">쿠폰 번호 ${code}</p>
        <p class="note">휴대폰 동반 앱으로 QR을 스캔하면 내 쿠폰함에 저장됩니다. 차량에는 쿠폰을 보관하지 않습니다.</p>
        ${saved ? '<p class="done" role="status">휴대폰 쿠폰함에 저장했어요</p>'
          : `<button data-scan="${esc(c.id)}" class="primary">휴대폰으로 스캔 (시연)</button>`}
        <button data-close="qr">닫기</button>
      </div></section>`;
  }

  function heardItem(c) {
    const isAd = c.type === 'ad';
    const open = openDetails.has(c.id);
    const couponButton = c.coupon
      ? `<button data-coupon="${esc(c.id)}" class="${savedCoupons.has(c.id) ? 'saved' : ''}">${savedCoupons.has(c.id) ? '쿠폰 저장됨' : '쿠폰 받기'}</button>`
      : '';
    return `<li class="${isAd ? 'ad' : 'story'}">
      <div class="row-head">
        <span class="tag ${isAd ? 'ad' : ''}">${isAd ? '광고' : esc(topicLabel(c.category))}</span>
        <b>${esc(c.name)}</b>
        <span class="actions">
          <button data-detail="${esc(c.id)}" aria-expanded="${open}">${open ? '접기' : '자세히'}</button>${couponButton}
        </span>
      </div>
      ${open ? `<p class="detail">${esc(c.long || c.short)}</p>` : ''}
    </li>`;
  }

  function renderParked() {
    const items = heard.map(id => App.contentById(id)).filter(Boolean);
    $('panel').innerHTML = `
      ${couponOpen ? qrCard() : ''}
      <p class="section-eyebrow">MY DRIVE · 정차 중</p>
      <div class="parked-head"><h2 class="title">오늘 지나온 곳</h2><span class="count">${items.length}곳</span></div>
      <ul class="heard">${items.map(heardItem).join('') || `<li class="empty"><div class="empty-state">${App.icon('route')}<strong>이 길의 첫 이야기를 만나보세요</strong><p>주행을 시작하면 주변 이야기가 들려요.<br>들었던 장소와 혜택은 여기에 모아둘게요.</p></div></li>`}</ul>
      <h3>관심사 <small>고른 주제의 이야기를 먼저 들려드려요</small></h3>
      <div class="chips">${TOPICS.map(([key, label]) =>
        `<button data-topic="${key}" aria-pressed="${interests.has(key)}">${label}</button>`).join('')}</div>
      ${consentSection()}`;
  }

  function consentSection() {
    if (consent) return '<p class="note">맞춤 광고 사용 중 · 고른 관심사와 쿠폰 저장 이력만 씁니다</p><button data-consent="revoke">동의 철회 및 데이터 삭제</button>';
    if (!askConsent) return '<button data-consent="ask">맞춤 광고 설정</button>';
    return `<div class="consent">
      <p><b>맞춤 광고 동의 (선택)</b></p>
      <p>수집 항목: 선택한 관심사, 쿠폰 저장 이력<br>이용 목적: 관심사에 맞는 광고 안내<br>보유 기간: 동의 철회 시까지</p>
      <p>동의를 거부할 수 있으며, 거부해도 앱을 그대로 쓸 수 있습니다. 속도, 브레이크, 경로 같은 주행 데이터는 광고 선택에 쓰지 않습니다.</p>
      <div class="row"><button data-consent="yes" class="primary">동의</button><button data-consent="no">거부</button></div>
    </div>`;
  }

  const render = () => (mode === 'driving' ? renderDriving() : renderParked());

  $('panel').addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;
    const { cmd, coupon, scan, close, detail, topic, consent: action } = button.dataset;
    if (cmd === 'listen') App.listen();
    else if (cmd) App.sendCommand(cmd);
    if (coupon) { couponOpen = coupon; render(); $('panel').scrollTop = 0; }
    if (scan) {
      savedCoupons.add(scan);
      App.onCouponSaved(scan);
      render();
    }
    if (close) { couponOpen = null; render(); }
    if (detail) {
      openDetails.has(detail) ? openDetails.delete(detail) : openDetails.add(detail);
      render();
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

  App.setMode = next => {
    mode = next;
    if (next === 'driving') couponOpen = null;
    $('panel').scrollTop = 0;
    document.querySelector('.car').dataset.mode = next;
    render();
  };

  App.showWaypoint = name => {
    const place = App.contents.find(c => c.name === name);
    if (place) { waypoints.add(place.id); App.redrawMap(); }
    $('waypoint').textContent = `경유지 추가됨: ${name}`;
    $('waypoint').hidden = false;
    clearTimeout(waypointTimer);
    waypointTimer = setTimeout(() => { $('waypoint').hidden = true; }, 6000);
  };

  App.showNowPlaying = (id, version) => {
    if (nowPlaying !== id) progressPercent = 0;
    nowPlaying = id;
    nowVersion = version || null;
    if (id && !heard.includes(id)) heard.push(id);
    App.redrawMap();
    render();
  };

  // Called once per sentence; a stepped bar, not a running animation.
  App.showProgress = (index, total) => {
    progressPercent = total > 0 ? Math.round((index / total) * 100) : 0;
    const bar = $('progressBar');
    if (bar) { bar.style.width = `${progressPercent}%`; bar.parentElement.setAttribute('aria-valuenow', progressPercent); }
  };

  App.showNavi = text => { naviText = text; if (mode === 'driving') render(); };
  App.showListening = on => { listening = on; if (mode === 'driving') render(); };

  // Subtitles for the demo video only (?caption or ?demo). Shown outside the car screen, never while really driving.
  const caption = params.has('caption') || params.has('demo')
    ? document.body.appendChild(Object.assign(document.createElement('div'), { className: 'caption', hidden: true }))
    : null;
  App.showCaption = (text, kind) => {
    if (!caption) return;
    caption.hidden = !text;
    if (!text) return;
    const who = { navi: '내비', ad: '광고', story: App.NAME, driver: '음성 명령(시연)' }[kind] || App.NAME;
    caption.innerHTML = `<span class="who ${kind === 'navi' ? 'navi-prompt' : kind}">${who}</span>${esc(text)}`;
  };

  App.showVehicle = v => {
    lastVehicle = v;
    $('speed').textContent = Math.round(v.speedKmh);
    $('gear').textContent = v.gear;
    $('tbt').textContent = v.tbt;
    const nextTurn = App.route.maneuvers.find(m => m.routeM > v.posM);
    $('turnDistance').textContent = v.gear === 'P' ? '정차 중' : nextTurn ? `${Math.max(0, Math.round(nextTurn.routeM - v.posM))} m` : '도착지 근처';
    $('turnRoad').textContent = v.gear === 'P' ? '애월 → 곽지 · 일주서로' : nextTurn && /왼쪽/.test(nextTurn.text) ? '왼쪽 방향 · 경로 안내' : '오른쪽 방향 · 경로 안내';
    $('turnIcon').textContent = v.gear === 'P' ? 'P' : nextTurn && /왼쪽/.test(nextTurn.text) ? '↰' : '↱';
    const remaining = Math.max(0, App.route.length - v.posM);
    const minutes = Math.max(1, Math.ceil(remaining / Math.max(v.speedKmh / 3.6, 1) / 60));
    const clock = new Date();
    $('clock').textContent = clock.toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit',hour12:false});
    const arrival = new Date(clock.getTime() + minutes * 60000);
    $('arrivalTime').textContent = v.gear === 'P' ? '애월에서 곽지까지' : `${arrival.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})} 도착 예정`;
    $('arrivalMeta').textContent = `${v.gear === 'P' ? '시연 경로' : `약 ${minutes}분`} · ${(remaining / 1000).toFixed(1)} km`;
    const passed = App.route.points.filter((p, i) => App.route.project(p[0], p[1]) <= v.posM || i === 0);
    $('passed').setAttribute('points', line([...passed, App.route.pointAt(v.posM)]));
    const [x, y] = xy(App.route.pointAt(v.posM));
    const dot = $('carDot');
    dot.setAttribute('transform', `translate(${x},${y})`);
  };
})();
