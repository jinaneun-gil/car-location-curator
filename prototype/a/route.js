// Demo route. ponytail: hand-placed temporary coordinates, replace with a real road trace before recording.
(function () {
  const POINTS = [
    [33.4665, 126.3265], [33.4660, 126.3225], [33.4650, 126.3190],
    [33.4640, 126.3155], [33.4625, 126.3125], [33.4600, 126.3105],
    [33.4570, 126.3085], [33.4540, 126.3065], [33.4508, 126.3050],
  ];

  function dist(a, b) {
    const k = Math.PI / 180;
    const x = (b[1] - a[1]) * k * Math.cos(((a[0] + b[0]) / 2) * k);
    const y = (b[0] - a[0]) * k;
    return Math.hypot(x, y) * 6371000;
  }

  const cumulative = [0];
  for (let i = 1; i < POINTS.length; i++) cumulative.push(cumulative[i - 1] + dist(POINTS[i - 1], POINTS[i]));

  App.route = {
    points: POINTS,
    length: cumulative[cumulative.length - 1],
    maneuvers: [
      { routeM: 1000, text: '잠시 후 왼쪽 방향입니다.' },
      { routeM: 2100, text: '잠시 후 오른쪽 방향입니다.' },
    ],
    // Metres along the route of the vertex nearest to a point.
    project(lat, lon) {
      let best = 0, bestD = Infinity;
      POINTS.forEach((p, i) => {
        const d = dist(p, [lat, lon]);
        if (d < bestD) { bestD = d; best = i; }
      });
      return cumulative[best];
    },
    // Position source for the demo: distance ahead of the car along the replayed route.
    ahead(posM, items) {
      return items.map(item => ({ ...item, distanceM: item.routeM - posM }));
    },
    pointAt(m) {
      for (let i = 1; i < POINTS.length; i++) {
        if (m <= cumulative[i]) {
          const f = (m - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1]);
          return POINTS[i - 1].map((v, j) => v + (POINTS[i][j] - v) * f);
        }
      }
      return POINTS[POINTS.length - 1];
    },
  };
})();
