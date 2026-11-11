package app.curator

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.View
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min

// The demo route as a plain line with dots: green stories, orange ads, blue for the car. Not a navigation map.
class RouteView(context: Context) : View(context) {
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 14f
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val dot = Paint(Paint.ANTI_ALIAS_FLAG)

    override fun onDraw(canvas: Canvas) {
        val route = Now.route ?: return
        val lats = route.points.map { it.first } + Now.places.map { it.lat }
        val lons = route.points.map { it.second } + Now.places.map { it.lon }
        val xScale = cos(lats.average() * PI / 180)
        val spanX = (lons.max() - lons.min()) * xScale
        val spanY = lats.max() - lats.min()
        val pad = 48f
        val scale = min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY)
        val offX = (width - spanX * scale) / 2
        val offY = (height - spanY * scale) / 2
        fun x(lon: Double) = (offX + (lon - lons.min()) * xScale * scale).toFloat()
        fun y(lat: Double) = (offY + (lats.max() - lat) * scale).toFloat()

        val pos = Now.posM
        val passed = route.cumulative.indexOfLast { it <= pos }.coerceAtLeast(0)
        fun path(from: Int, to: Int) = Path().apply {
            route.points.subList(from, to + 1).forEachIndexed { i, (lat, lon) ->
                if (i == 0) moveTo(x(lon), y(lat)) else lineTo(x(lon), y(lat))
            }
        }
        line.color = Color.parseColor("#2E3540")
        canvas.drawPath(path(0, route.points.lastIndex), line)
        line.color = Color.parseColor("#5B8DEF")
        canvas.drawPath(path(0, passed), line)

        val heard = Now.heard.map { it.id }.toSet()
        for (place in Now.places) {
            val playing = Now.playing?.id == place.id
            dot.color = Color.parseColor(if (place.isAd) "#F2B04C" else "#4CC2A4")
            dot.alpha = if (place.id in heard && !playing) 90 else 255
            val r = if (playing) 22f else 11f
            if (playing) {
                dot.alpha = 255
                canvas.drawCircle(x(place.lon), y(place.lat), r + 6, Paint(dot).apply { color = Color.WHITE })
            }
            canvas.drawCircle(x(place.lon), y(place.lat), r, dot)
        }

        val (lat, lon) = route.points[passed]
        dot.color = Color.WHITE
        dot.alpha = 255
        canvas.drawCircle(x(lon), y(lat), 20f, dot)
        dot.color = Color.parseColor("#5B8DEF")
        canvas.drawCircle(x(lon), y(lat), 13f, dot)
    }
}
