package app.curator

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.View
import org.json.JSONObject
import kotlin.math.PI
import kotlin.math.asinh
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.tan

/** A bundled, attributed map of the demo area. Route overlay shares its Web Mercator projection. */
class RouteView(context: Context) : View(context) {
    private val bitmap = context.assets.open("aewol-map.png").use { BitmapFactory.decodeStream(it) }
    private val config = JSONObject(context.assets.open("map-config.json").bufferedReader().use { it.readText() })
    private val world = 2.0.pow(config.getInt("zoom"))
    private val tileX = config.getInt("tileX")
    private val tileY = config.getInt("tileY")
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { isFilterBitmap = true }
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND
    }
    private fun dp(value: Int) = Design.dp(context, value).toFloat()
    private fun x(lon: Double) = (((lon + 180) / 360 * world - tileX) * 256).toFloat()
    private fun y(lat: Double) = (((1 - asinh(tan(lat * PI / 180)) / PI) / 2 * world - tileY) * 256).toFloat()

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val image = bitmap ?: return
        canvas.drawColor(Color.parseColor("#E6E5DA"))
        val scale = min(width.toFloat() / image.width, height.toFloat() / image.height)
        val offsetX = (width - image.width * scale) / 2
        val offsetY = (height - image.height * scale) / 2
        canvas.save()
        canvas.translate(offsetX, offsetY); canvas.scale(scale, scale)
        canvas.drawBitmap(image, 0f, 0f, paint)
        val route = Now.route
        if (route != null) {
            val passed = route.cumulative.indexOfLast { it <= Now.posM }.coerceAtLeast(0)
            val path = Path().apply {
                route.points.forEachIndexed { i, point -> if (i == 0) moveTo(x(point.second), y(point.first)) else lineTo(x(point.second), y(point.first)) }
            }
            line.color = Color.WHITE; line.strokeWidth = dp(9) / scale; canvas.drawPath(path, line)
            line.color = Design.blue; line.strokeWidth = dp(5) / scale; canvas.drawPath(path, line)
            val heard = Now.heard.map { it.id }.toSet()
            Now.places.forEach { place ->
                val active = Now.playing?.id == place.id
                paint.color = if (place.isAd) Design.amber else Design.blue
                paint.alpha = if (place.id in heard && !active) 100 else 255
                canvas.drawCircle(x(place.lon), y(place.lat), dp(if (active) 7 else 3) / scale, paint)
            }
            paint.alpha = 255
            val point = route.points[passed]
            val cx = x(point.second); val cy = y(point.first)
            paint.color = Color.WHITE; canvas.drawCircle(cx, cy, dp(15) / scale, paint)
            paint.color = Design.blue
            val r = dp(10) / scale
            canvas.drawPath(Path().apply {
                moveTo(cx, cy - r); lineTo(cx + r * .8f, cy + r); lineTo(cx, cy + r * .45f); lineTo(cx - r * .8f, cy + r); close()
            }, paint)
        }
        canvas.restore()
        // The map is not a replacement for the vehicle's navigation app.
        val box = RectF(dp(14), dp(14), width - dp(14), dp(76))
        paint.color = Design.background; canvas.drawRoundRect(box, dp(14), dp(14), paint)
        paint.typeface = android.graphics.Typeface.DEFAULT_BOLD
        paint.color = Color.WHITE; paint.textSize = dp(18)
        canvas.drawText("애월 → 곽지", dp(30), dp(42), paint)
        paint.typeface = android.graphics.Typeface.DEFAULT
        paint.color = Design.muted; paint.textSize = dp(11)
        canvas.drawText("일주서로 · 시연 경로", dp(30), dp(61), paint)
        val credit = "© OpenStreetMap contributors"
        paint.textSize = dp(10)
        val textWidth = paint.measureText(credit)
        paint.color = Color.WHITE
        canvas.drawRect(width - textWidth - dp(16), height - dp(25), width.toFloat(), height.toFloat(), paint)
        paint.color = Color.parseColor("#253A55")
        canvas.drawText(credit, width - textWidth - dp(8), height - dp(9), paint)
    }
}
