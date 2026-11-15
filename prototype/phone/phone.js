// Phone companion screen, simulated inside the same page: coupon wallet and advertiser registration.
(function () {
  const $ = id => document.getElementById(id);
  const root = $('phone');
  const CATEGORIES = [['cafe', '카페'], ['food', '맛집'], ['experience', '체험'], ['event', '행사'], ['charging', '충전'], ['stay', '숙소'], ['shop', '편의점']];
  const coupons = [];
  const used = new Set();
  const today = new Date();
  const dateValue = d => d.toLocaleDateString('sv');
  const monthLater = new Date(today.getTime() + 30 * 86400000);
  // Places far enough along the demo route for an ad to finish before arrival.
  const places = App.contents.filter(c => c.type === 'story' && c.routeM >= 800);

  root.innerHTML = `
    <div class="phone-top">
      <div><span class="phone-brand">${App.icon('route')}${App.NAME}</span><p class="phone-caption">드라이브에서 발견한 즐거움</p></div>
      <button id="showConsole">차량으로</button>
    </div>
    <div class="row phone-tabs" aria-label="동반 앱 메뉴">
      <button id="tabUser" aria-pressed="false">${App.icon('ticket')}내 쿠폰</button>
      <button id="tabBiz" aria-pressed="true">${App.icon('pin')}우리 가게</button>
    </div>
    <section id="biz">
      <div class="phone-section-head"><h2>길 위의 손님에게<br>가게를 알려보세요.</h2><p>가게 근처를 지나는 운전자에게<br>짧은 음성과 혜택으로 소개합니다.</p></div>
      <form id="adForm">
        <label>상호 <input name="sponsor" required maxlength="20" placeholder="가상 상호"></label>
        <label>업종 <select name="category">${CATEGORIES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
        <label>위치 <select name="place">${places.map(p => `<option value="${p.id}">${p.name} 근처</option>`).join('')}</select></label>
        <label>노출 범위 <select name="reachM">
          <option value="1000">도착 전 1km부터</option>
          <option value="2000" selected>도착 전 2km부터</option>
          <option value="3000">도착 전 3km부터</option>
        </select></label>
        <div class="row">
          <label>시작 <input type="date" name="from" value="${dateValue(today)}" required></label>
          <label>종료 <input type="date" name="to" value="${dateValue(monthLater)}" required></label>
        </div>
        <label>시간대 <select name="hours">
          <option value="0,24">종일</option>
          <option value="11,14">점심 11~14시</option>
          <option value="17,21">저녁 17~21시</option>
        </select></label>
        <label>노출 우선순위 <select name="bid">
          <option value="3">기본</option>
          <option value="4">높음</option>
          <option value="5" selected>최우선</option>
        </select></label>
        <label>안내 문구 <input name="text" required maxlength="50" placeholder="약 8초 분량으로 짧게"></label>
        <label>쿠폰 (선택) <input name="coupon" maxlength="20" placeholder="예: 음료 10% 할인"></label>
        <p id="adPreview" class="preview" role="status"></p>
        <p class="note">운전 습관이나 속도로 사람을 고르지 않습니다. 동의한 사용자에게만 관심 업종이 반영됩니다.</p>
        <button type="submit">광고 등록 신청${App.icon('arrow')}</button>
      </form>
      <p id="adResult" class="note" role="status"></p>
      <h3>내 광고 성과</h3>
      <ul id="adStats"></ul>
      <button id="clearAds">등록 광고 초기화</button>
    </section>
    <section id="user" hidden>
      <div class="phone-section-head"><h2>드라이브의 작은 혜택</h2><p>차에서 만난 가게의 쿠폰을 모았어요.<br>매장에서 사용할 쿠폰을 선택해 주세요.</p></div>
      <ul id="wallet"></ul>
    </section>`;

  const STORAGE_KEY = 'curator.registeredAds';
  const loadAds = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  };
  const saveAds = ads => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ads)); } catch { /* demo still works without storage */ }
  };

  // Spells out the chosen conditions so they can be explained on screen.
  function showPreview() {
    const form = $('adForm');
    const label = name => form.elements[name].selectedOptions[0].text;
    const km = +form.elements.reachM.value / 1000;
    $('adPreview').textContent =
      `${label('place')} 도착 ${km}km 전(60km/h 기준 약 ${km}분 전)부터 안내합니다. ` +
      `기간 ${form.elements.from.value} ~ ${form.elements.to.value}, 시간대 ${label('hours')}, 우선순위 ${label('bid')}.`;
  }

  function showTab(biz) {
    $('biz').hidden = !biz;
    $('user').hidden = biz;
    $('tabBiz').setAttribute('aria-pressed', biz);
    $('tabUser').setAttribute('aria-pressed', !biz);
  }
  function showPhone(visible) {
    root.hidden = !visible;
    $('console').hidden = visible;
  }

  $('tabBiz').onclick = () => showTab(true);
  $('tabUser').onclick = () => showTab(false);
  $('showPhone').onclick = () => showPhone(true);
  $('showConsole').onclick = () => showPhone(false);

  $('adForm').onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    // Strip markup characters: every screen renders these fields as HTML.
    const value = key => f.get(key).trim().replace(/[<>&"]/g, '');
    if (value('from') > value('to')) {
      $('adResult').textContent = '종료일이 시작일보다 빠릅니다.';
      return;
    }
    // Stand-in for human review; only the alcohol rule from the review guide is modelled.
    if (/소주|맥주|와인|막걸리|술집/.test(value('text')) && !/음주운전/.test(value('text'))) {
      $('adResult').textContent = '검수 반려: 주류 광고에는 음주운전 경고 문구가 필요합니다.';
      return;
    }
    const place = App.contentById(value('place'));
    const ad = {
      id: `reg-${Date.now()}`, type: 'ad', name: value('sponsor'), sponsor: value('sponsor'),
      category: value('category'), lat: place.lat, lon: place.lon, bid: +value('bid'),
      coupon: value('coupon'), short: `광고입니다. ${value('text')}`,
      reachM: +value('reachM'), from: value('from'), to: value('to'),
      hours: value('hours').split(',').map(Number),
    };
    App.addAd(ad);
    saveAds([...loadAds(), ad]);
    $('adResult').textContent = '검수 통과 (시뮬레이션) · 게시되었습니다.';
    e.target.reset();
    showPreview();
  };

  $('adForm').oninput = showPreview;
  $('clearAds').onclick = () => {
    saveAds([]);
    location.reload();
  };

  App.saveCoupon = c => {
    if (!coupons.includes(c)) coupons.push(c);
  };

  $('wallet').onclick = e => {
    const button = e.target.closest('button[data-use]');
    if (!button) return;
    const c = coupons.find(item => item.id === button.dataset.use);
    if (!c) return;
    used.add(c.id);
    App.log(`쿠폰 사용: ${c.sponsor}`);
    App.phoneUpdate();
  };

  App.phoneUpdate = () => {
    const registered = App.contents.filter(c => c.id.startsWith('reg-'));
    $('adStats').innerHTML = registered.map(c => {
      const s = App.stats[c.id] || { plays: 0, goes: 0, coupons: 0 };
      return `<li><span class="result-label">게시 중 · 시뮬레이션</span><br><b>${c.sponsor}</b><div class="stats-values"><span>음성 노출<b>${s.plays}</b></span><span>경유지 추가<b>${s.goes}</b></span><span>쿠폰 저장<b>${s.coupons}</b></span></div></li>`;
    }).join('') || '<li>아직 등록한 광고가 없어요.<br>첫 광고를 등록하면 성과를 확인할 수 있어요.</li>';
    $('wallet').innerHTML = coupons.map(c => `<li class="wallet-item"><span class="coupon-category">${App.icon('ticket')}드라이브 혜택</span><b>${c.sponsor}</b><div class="coupon-value">${c.coupon}</div>${
      used.has(c.id) ? `<div class="coupon-used">${App.icon('check')}사용 완료</div>` : `<button data-use="${c.id}">매장에서 사용${App.icon('arrow')}</button>`
    }</li>`).join('') || `<li class="wallet-empty">${App.icon('ticket')}<strong>아직 저장한 쿠폰이 없어요</strong>정차 후 차량 화면의 쿠폰 QR을 스캔하면<br>여기에 안전하게 보관해 드릴게요.</li>`;
  };
  loadAds().forEach(App.addAd);
  showPreview();
  App.phoneUpdate();
})();
