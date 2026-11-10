package app.curator

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

// Same cases as prototype/a/planner.test.js, so the port cannot drift from the web version.
class PlannerTest {
    private val options = Planner.Options()
    private fun text(seconds: Double) = "ㄱ".repeat(Math.round(seconds * options.charsPerSec).toInt())

    private fun story(id: String, routeM: Double) = Place(
        id, false, id, "history", 0.0, 0.0, text(10.0), text(40.0), 3.0, 0.0, "", routeM = routeM, distanceM = routeM,
    )

    private fun ad(id: String, routeM: Double, category: String = "food", reachM: Double = 0.0) = Place(
        id, true, id, category, 0.0, 0.0, text(8.0), "", 0.0, 4.0, "", reachM = reachM, routeM = routeM, distanceM = routeM,
    )

    private fun state(
        speed: Double = 16.0, turns: List<Double> = emptyList(), busy: Boolean = false,
        played: Set<String> = emptySet(), interests: Map<String, Double> = emptyMap(),
        adInterests: Map<String, Double> = emptyMap(),
    ) = Planner.State(
        speed, turns, busy, played, interests, adInterests, 0.0, 0, Double.POSITIVE_INFINITY, null,
    )

    @Test fun fastTrafficUsesShortVersion() =
        assertEquals("short", Planner.plan(state(speed = 25.0), listOf(story("s", 300.0)))[0].version)

    @Test fun slowTrafficUsesLongVersion() =
        assertEquals("long", Planner.plan(state(speed = 3.0), listOf(story("s", 300.0)))[0].version)

    @Test fun playedItemsAreSkipped() =
        assertTrue(Planner.plan(state(played = setOf("s")), listOf(story("s", 300.0))).isEmpty())

    @Test fun speechAvoidsTurns() {
        val first = Planner.plan(state(speed = 10.0, turns = listOf(200.0)), listOf(story("s", 400.0)))[0]
        assertTrue(first.start >= 25 || first.start + first.dur <= 8)
    }

    @Test fun speechWaitsWhileDriverBusy() =
        assertTrue(Planner.plan(state(busy = true), listOf(story("s", 500.0)))[0].start >= options.busySec)

    @Test fun adTooCloseToDecideIsDropped() =
        assertTrue(Planner.plan(state(), listOf(ad("a", 200.0))).isEmpty())

    @Test fun adsKeepMinimumGap() {
        val ads = Planner.plan(state(speed = 8.0), listOf(ad("a", 800.0), ad("b", 900.0)))
        assertTrue(ads.size < 2 || ads[1].start - (ads[0].start + ads[0].dur) >= options.minAdGapSec)
    }

    @Test fun consentedInterestRaisesMatchingAd() {
        val places = listOf(ad("food", 500.0, "food"), ad("cafe", 500.0, "cafe"))
        assertEquals("cafe", Planner.plan(state(speed = 8.0, adInterests = mapOf("cafe" to 1.5)), places)[0].id)
        assertEquals("food", Planner.plan(state(speed = 8.0, interests = mapOf("cafe" to 1.5)), places)[0].id)
    }

    @Test fun adWaitsForRegisteredReach() =
        assertTrue(Planner.plan(state(speed = 10.0), listOf(ad("r", 1000.0, reachM = 800.0)))[0].start >= 20)

    // The web test prints this exact order for the same content and route.
    @Test fun demoRouteMatchesWebPrototype() {
        val route = Route.parse(File("src/main/assets/route.json").readText())
        val places = route.onRoute(parseContent(File("../../prototype/b/content.js").readText()))
        val played = mutableSetOf<String>()
        val order = mutableListOf<String>()
        var posM = 0.0
        var t = 0.0
        var busyUntil = 0.0
        var adsPlayed = 0
        var lastAdEnd = Double.NEGATIVE_INFINITY
        var lastCategory: String? = null
        val speed = 16.0
        while (posM < route.length) {
            if (t >= busyUntil) {
                val s = Planner.State(
                    speed, route.maneuversM.map { it - posM }, false, played, emptyMap(), emptyMap(),
                    t, adsPlayed, t - lastAdEnd, lastCategory,
                )
                val next = Planner.plan(s, places.map { it.copy(distanceM = it.routeM - posM) }).firstOrNull()
                if (next != null && next.start <= 1) {
                    order.add("${next.id}/${next.version}")
                    played.add(next.id)
                    lastCategory = next.category
                    busyUntil = t + next.dur + options.gapSec
                    if (next.isAd) {
                        adsPlayed++
                        lastAdEnd = t + next.dur
                    }
                }
            }
            posM += speed
            t++
        }
        assertEquals("a1/short s2/long a3/short s3/long s4/short a5/short s5/short", order.joinToString(" "))
    }
}
