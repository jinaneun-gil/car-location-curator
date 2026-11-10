package app.curator

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// Port of prototype/a/planner.js, which stays the reference. Change both together.
object Planner {
    data class Options(
        val horizonSec: Double = 180.0,
        val leadSec: Double = 45.0,
        val afterSec: Double = 15.0,
        val adDecisionSec: Double = 30.0,
        val gapSec: Double = 3.0,
        val minAdGapSec: Double = 45.0,
        val adTargetPerSec: Double = 3.5 / 180,
        val charsPerSec: Double = 6.5,
        val maxContents: Int = 8,
        val maxDepth: Int = 4,
        val longBonus: Double = 1.6,
        val sameCategoryPenalty: Double = 0.85,
        val maneuverBeforeSec: Double = 12.0,
        val maneuverAfterSec: Double = 5.0,
        val busySec: Double = 8.0,
    )

    data class State(
        val speedMps: Double,
        val maneuverDistancesM: List<Double>,
        val driverBusy: Boolean,
        val played: Set<String>,
        val interests: Map<String, Double> = emptyMap(),
        val adInterests: Map<String, Double> = emptyMap(),
        val elapsedSec: Double,
        val adsPlayed: Int,
        val secSinceLastAd: Double,
        val lastCategory: String?,
    )

    data class Scheduled(
        val id: String,
        val version: String,
        val isAd: Boolean,
        val category: String,
        val eta: Double,
        val dur: Double,
        val earliest: Double,
        val latestEnd: Double,
        val value: Double,
        val start: Double = 0.0,
    )

    private class Context(val o: Options, val quiet: List<Pair<Double, Double>>)

    private fun quietWindows(state: State, o: Options, v: Double): List<Pair<Double, Double>> {
        val windows = state.maneuverDistancesM
            .map { it / v }
            .filter { it > -o.maneuverAfterSec && it < o.horizonSec }
            .map { (it - o.maneuverBeforeSec) to (it + o.maneuverAfterSec) }
            .toMutableList()
        if (state.driverBusy) windows.add(0.0 to o.busySec)
        return windows
    }

    private fun adPacing(state: State, o: Options): Double {
        val expected = state.elapsedSec * o.adTargetPerSec
        return min(2.0, max(0.4, 1 + (expected - state.adsPlayed) * 0.6))
    }

    private fun candidates(state: State, places: List<Place>, o: Options, v: Double): List<Scheduled> {
        val pacing = adPacing(state, o)
        val near = places
            .filter { it.id !in state.played }
            .map { it to it.distanceM / v }
            .filter { (_, eta) -> eta > -o.afterSec && eta < o.horizonSec + o.leadSec }
            .sortedBy { (_, eta) -> eta }
            .take(o.maxContents)

        val items = mutableListOf<Scheduled>()
        for ((c, eta) in near) {
            val base = if (c.isAd) c.bid * pacing * (state.adInterests[c.category] ?: 1.0)
            else c.importance * (state.interests[c.category] ?: 1.0)
            for (version in listOf("short", "long")) {
                if (c.isAd && version == "long") continue
                val text = if (version == "long") c.long else c.short
                items.add(
                    Scheduled(
                        id = c.id, version = version, isAd = c.isAd, category = c.category, eta = eta,
                        dur = text.length / o.charsPerSec,
                        earliest = if (c.isAd) max(0.0, if (c.reachM > 0) eta - c.reachM / v else 0.0)
                        else max(0.0, eta - o.leadSec),
                        latestEnd = if (c.isAd) eta - o.adDecisionSec else eta + o.afterSec,
                        value = if (version == "long") base * o.longBonus else base,
                    ),
                )
            }
        }
        return items
    }

    private fun fit(item: Scheduled, t: Double, quiet: List<Pair<Double, Double>>): Double? {
        var start = max(t, item.earliest)
        var moved = true
        while (moved) {
            moved = false
            for ((a, b) in quiet) {
                if (start < b && start + item.dur > a) {
                    start = b
                    moved = true
                }
            }
        }
        return if (start + item.dur <= item.latestEnd) start else null
    }

    private fun search(
        items: List<Scheduled>, t: Double, used: MutableSet<String>, adReadyAt: Double,
        lastCategory: String?, depth: Int, ctx: Context,
    ): Pair<Double, List<Scheduled>> {
        if (depth == ctx.o.maxDepth) return 0.0 to emptyList()
        var best = 0.0 to emptyList<Scheduled>()
        for (item in items) {
            if (item.id in used) continue
            val start = fit(item, if (item.isAd) max(t, adReadyAt) else t, ctx.quiet) ?: continue
            if (start >= ctx.o.horizonSec) continue
            val repeat = if (item.category == lastCategory) ctx.o.sameCategoryPenalty else 1.0
            val value = item.value * repeat * (1 - 0.3 * min(1.0, abs(start - item.eta) / ctx.o.horizonSec))
            val end = start + item.dur
            used.add(item.id)
            val rest = search(
                items, end + ctx.o.gapSec, used,
                if (item.isAd) end + ctx.o.minAdGapSec else adReadyAt, item.category, depth + 1, ctx,
            )
            used.remove(item.id)
            if (value + rest.first > best.first) {
                best = (value + rest.first) to (listOf(item.copy(start = start)) + rest.second)
            }
        }
        return best
    }

    fun plan(state: State, places: List<Place>, o: Options = Options()): List<Scheduled> {
        val v = max(1.5, state.speedMps)
        val adReadyAt = max(0.0, o.minAdGapSec - state.secSinceLastAd)
        val ctx = Context(o, quietWindows(state, o, v))
        return search(candidates(state, places, o, v), 0.0, mutableSetOf(), adReadyAt, state.lastCategory, 0, ctx).second
    }
}
