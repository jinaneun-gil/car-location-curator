// Decides what to play by building a schedule for the next few minutes.
// Re-run on every tick; only the first item of the schedule is ever played.
(function () {
  const DEFAULTS = {
    horizonSec: 180,
    leadSec: 45,          // a story may start this long before reaching the place
    afterSec: 15,         // a story may run this long after passing the place
    adDecisionSec: 30,    // an ad must end this long before the place, so the driver can decide
    gapSec: 3,            // silence between items
    minAdGapSec: 45,
    adTargetPerSec: 3.5 / 180,
    charsPerSec: 6.5,
    maxContents: 8,
    maxDepth: 4,
    longBonus: 1.6,
    sameCategoryPenalty: 0.85,
    maneuverBeforeSec: 12,
    maneuverAfterSec: 5,
    busySec: 8,
  };

  const durationOf = (text, o) => text.length / o.charsPerSec;

  // Times when the driver should not be spoken to: around turns and during vehicle signals.
  function quietWindows(state, o, v) {
    const windows = state.maneuvers
      .map(m => (m.routeM - state.posM) / v)
      .filter(eta => eta > -o.maneuverAfterSec && eta < o.horizonSec)
      .map(eta => [eta - o.maneuverBeforeSec, eta + o.maneuverAfterSec]);
    if (state.driverBusy) windows.push([0, o.busySec]);
    return windows;
  }

  function adPacing(state, o) {
    const expected = state.elapsedSec * o.adTargetPerSec;
    return Math.min(2, Math.max(0.4, 1 + (expected - state.adsPlayed) * 0.6));
  }

  function candidates(state, contents, o, v) {
    const pacing = adPacing(state, o);
    const items = [];
    const near = contents
      .filter(c => !state.played.has(c.id))
      .map(c => ({ c, eta: (c.routeM - state.posM) / v }))
      .filter(x => x.eta > -o.afterSec && x.eta < o.horizonSec + o.leadSec)
      .sort((a, b) => a.eta - b.eta)
      .slice(0, o.maxContents);

    for (const { c, eta } of near) {
      const isAd = c.type === 'ad';
      // adInterests stays empty unless the user pressed the consent button.
      const base = isAd
        ? c.bid * pacing * (state.adInterests[c.category] || 1)
        : c.importance * (state.interests[c.category] || 1);
      for (const version of ['short', 'long']) {
        if (isAd && version === 'long') continue;
        items.push({
          id: c.id, version, isAd, category: c.category, eta,
          dur: durationOf(c[version], o),
          earliest: isAd
            ? Math.max(0, c.reachM ? eta - c.reachM / v : 0)
            : Math.max(0, eta - o.leadSec),
          latestEnd: isAd ? eta - o.adDecisionSec : eta + o.afterSec,
          value: version === 'long' ? base * o.longBonus : base,
        });
      }
    }
    return items;
  }

  // Earliest start at or after `t` that avoids every quiet window, or null if the item cannot end in time.
  function fit(item, t, quiet) {
    let start = Math.max(t, item.earliest);
    for (let moved = true; moved;) {
      moved = false;
      for (const [a, b] of quiet) {
        if (start < b && start + item.dur > a) { start = b; moved = true; }
      }
    }
    return start + item.dur <= item.latestEnd ? start : null;
  }

  // ponytail: exhaustive search capped by maxContents and maxDepth; fine for a few nearby places.
  function search(items, t, used, adReadyAt, lastCategory, depth, ctx) {
    if (depth === ctx.o.maxDepth) return { value: 0, seq: [] };
    let best = { value: 0, seq: [] };
    for (const item of items) {
      if (used.has(item.id)) continue;
      const start = fit(item, item.isAd ? Math.max(t, adReadyAt) : t, ctx.quiet);
      if (start === null || start >= ctx.o.horizonSec) continue;
      const repeat = item.category === lastCategory ? ctx.o.sameCategoryPenalty : 1;
      const value = item.value * repeat * (1 - 0.3 * Math.min(1, Math.abs(start - item.eta) / ctx.o.horizonSec));
      const end = start + item.dur;
      used.add(item.id);
      const rest = search(items, end + ctx.o.gapSec, used,
        item.isAd ? end + ctx.o.minAdGapSec : adReadyAt, item.category, depth + 1, ctx);
      used.delete(item.id);
      if (value + rest.value > best.value) {
        best = { value: value + rest.value, seq: [{ ...item, start }, ...rest.seq] };
      }
    }
    return best;
  }

  function plan(state, contents, options) {
    const o = { ...DEFAULTS, ...options };
    const v = Math.max(1.5, state.speedMps);
    const quiet = quietWindows(state, o, v);
    const items = candidates(state, contents, o, v);
    const adReadyAt = Math.max(0, o.minAdGapSec - state.secSinceLastAd);
    return search(items, 0, new Set(), adReadyAt, state.lastCategory, 0, { o, quiet }).seq;
  }

  const api = { plan, DEFAULTS };
  if (typeof module !== 'undefined') module.exports = api;
  else App.planner = api;
})();
