package app.curator

import org.json.JSONObject
import org.json.JSONArray
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.hypot

data class Place(
    val id: String,
    val isAd: Boolean,
    val name: String,
    val category: String,
    val lat: Double,
    val lon: Double,
    val short: String,
    val long: String,
    val importance: Double,
    val bid: Double,
    val coupon: String,
    val reachM: Double = 0.0,
    val routeM: Double = 0.0,
    val distanceM: Double = 0.0,
)

// content.js is shared with the web prototype: a JS file wrapping one plain JSON array.
fun parseContent(text: String): List<Place> {
    val array = JSONArray(text.substring(text.indexOf('['), text.lastIndexOf(']') + 1))
    return (0 until array.length()).map { i ->
        val c = array.getJSONObject(i)
        Place(
            id = c.getString("id"),
            isAd = c.getString("type") == "ad",
            name = c.getString("name"),
            category = c.getString("category"),
            lat = c.getDouble("lat"),
            lon = c.getDouble("lon"),
            short = c.getString("short"),
            long = c.optString("long", ""),
            importance = c.optDouble("importance", 0.0),
            bid = c.optDouble("bid", 0.0),
            coupon = c.optString("coupon", ""),
        )
    }
}

class Route(private val points: List<Pair<Double, Double>>, val maneuversM: List<Double>) {
    private val cumulative = points.indices.runningFold(0.0) { sum, i ->
        if (i == 0) sum else sum + dist(points[i - 1], points[i])
    }.drop(1)

    val length: Double get() = cumulative.last()

    private fun dist(a: Pair<Double, Double>, b: Pair<Double, Double>): Double {
        val k = PI / 180
        val x = (b.second - a.second) * k * cos((a.first + b.first) / 2 * k)
        val y = (b.first - a.first) * k
        return hypot(x, y) * 6371000
    }

    fun project(lat: Double, lon: Double): Double {
        val best = points.indices.minByOrNull { dist(points[it], lat to lon) } ?: 0
        return cumulative[best]
    }

    fun onRoute(places: List<Place>) = places.map { it.copy(routeM = project(it.lat, it.lon)) }

    companion object {
        fun parse(text: String): Route {
            val json = JSONObject(text)
            val points = json.getJSONArray("points")
            val maneuvers = json.getJSONArray("maneuversM")
            return Route(
                (0 until points.length()).map { points.getJSONArray(it).let { p -> p.getDouble(0) to p.getDouble(1) } },
                (0 until maneuvers.length()).map { maneuvers.getDouble(it) },
            )
        }
    }
}
