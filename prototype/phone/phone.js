// Phone companion screen, simulated inside the same page: coupon wallet and advertiser registration.
(function () {
  const $ = id => document.getElementById(id);
  const root = $('phone');
  const CATEGORIES = [['cafe', '카페'], ['food', '맛집'], ['experience', '체험'], ['event', '행사'], ['charging', '충전']];
  const coupons = [];
  const today = new Date();
  const dateValue = d => d.toLocaleDateString('sv');
  const monthLater = new Date(today.getTime() + 30 * 86400000);
  // Places far enough along the demo route for an ad to finish before arrival.
  const places = App.contents.filter(c => c.type === 'story' && c.routeM >= 800);

  root.innerHTML = `
    <div class="phone-top">
      <b>${App.NAME} 폰 앱</b>
      <button id="showConsole">차량 신호 보기</button>
    </div>
    <div class="row">
      <button id="tabBiz" aria-pressed="true">광고주</button>
      <button id="tabUser" aria-pressed="false">내 쿠폰</button>
    </div>
    <section id="biz">
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
        <p class="note">운전 습관이나 속도로 사람을 고르지 않습니다. 동의한 사용자에게만 관심 업종이 반영됩니다.</p>
        <button type="submit">등록 신청</button>
      </form>
      <p id="adResult" class="note" role="status"></p>
      <h3>내 광고 성과</h3>
      <ul id="adStats"></ul>
    </section>
    <section id="user" hidden>
      <h3>저장한 쿠폰</h3>
      <ul id="wallet"></ul>
    </section>`;

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
    const value = key => f.get(key).trim();
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
    App.addAd({
      id: `reg-${Date.now()}`, type: 'ad', name: value('sponsor'), sponsor: value('sponsor'),
      category: value('category'), lat: place.lat, lon: place.lon, bid: +value('bid'),
      coupon: value('coupon'), short: `광고입니다. ${value('text')}`,
      reachM: +value('reachM'), from: value('from'), to: value('to'),
      hours: value('hours').split(',').map(Number),
    });
    $('adResult').textContent = '검수 통과 (시뮬레이션) · 게시되었습니다.';
    e.target.reset();
  };

  App.saveCoupon = c => {
    if (!coupons.includes(c)) coupons.push(c);
  };

  App.phoneUpdate = () => {
    const registered = App.contents.filter(c => c.id.startsWith('reg-'));
    $('adStats').innerHTML = registered.map(c => {
      const s = App.stats[c.id] || { plays: 0, goes: 0, coupons: 0 };
      return `<li><b>${c.sponsor}</b><br>음성 노출 ${s.plays} · 경유지 추가 ${s.goes} · 쿠폰 저장 ${s.coupons}</li>`;
    }).join('') || '<li>등록한 광고가 없습니다</li>';
    $('wallet').innerHTML = coupons.map(c => `<li><b>${c.sponsor}</b><br>${c.coupon}</li>`).join('') || '<li>저장한 쿠폰이 없습니다</li>';
  };
  App.phoneUpdate();
})();
