// Placeholder content. Replace every text, and check real-place stories against a source.
(function () {
  const filler = (name, seconds) => {
    const sentence = `${name}에 대한 예시 문장입니다. `;
    return sentence.repeat(Math.ceil((seconds * 6.5) / sentence.length)).trim();
  };
  const story = (id, name, category, lat, lon, importance) => ({
    id, type: 'story', name, category, lat, lon, importance,
    short: filler(name, 10), long: filler(name, 40),
  });
  const ad = (id, sponsor, category, lat, lon, bid, coupon) => ({
    id, type: 'ad', name: sponsor, sponsor, category, lat, lon, bid, coupon,
    short: `광고입니다. 곧 지나는 ${sponsor}에서 ${coupon} 혜택을 드립니다.`,
  });

  App.contents.push(
    story('s1', '애월 포구', 'history', 33.4660, 126.3225, 3),
    story('s2', '해안도로 전망', 'nature', 33.4640, 126.3155, 4),
    story('s3', '돌담 마을', 'culture', 33.4600, 126.3105, 3),
    story('s4', '바닷가 용암 지형', 'nature', 33.4540, 126.3065, 4),
    story('s5', '곽지 해변', 'nature', 33.4508, 126.3050, 3),
    ad('a1', '바다멍 카페', 'cafe', 33.4650, 126.3190, 4, '음료 10% 할인'),
    ad('a2', '돌담흑돼지', 'food', 33.4625, 126.3125, 4, '음료 1잔 무료'),
    ad('a3', '귤밭체험농장', 'experience', 33.4570, 126.3085, 3, '체험료 20% 할인'),
    ad('a4', '초록충전소', 'charging', 33.4540, 126.3065, 3, '충전 요금 15% 할인'),
    ad('a5', '애월 플리마켓', 'event', 33.4508, 126.3050, 3, '입장 기념품 증정'),
  );
})();
