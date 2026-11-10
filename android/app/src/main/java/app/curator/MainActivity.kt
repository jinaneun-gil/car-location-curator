package app.curator

import android.app.Activity
import android.car.Car
import android.car.drivingstate.CarUxRestrictionsManager
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

// Minimal car screen: one glanceable line while driving, the visited list when parked.
class MainActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var car: Car
    private lateinit var label: TextView
    private lateinit var title: TextView
    private lateinit var detail: TextView

    private fun text(size: Float, color: Int) = TextView(this).apply {
        textSize = size
        setTextColor(color)
        gravity = Gravity.CENTER
        setPadding(0, 16, 0, 16)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        label = text(28f, Color.LTGRAY)
        title = text(56f, Color.WHITE)
        detail = text(28f, Color.LTGRAY)
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.BLACK)
            setPadding(48, 48, 48, 48)
            addView(label)
            addView(title)
            addView(detail)
        })
        car = Car.createCar(this)
        startForegroundService(Intent(this, CuratorService::class.java))
        render()
    }

    private fun render() {
        val manager = car.getCarManager(Car.CAR_UX_RESTRICTION_SERVICE) as CarUxRestrictionsManager
        val driving = manager.currentCarUxRestrictions.isRequiresDistractionOptimization
        val playing = Now.playing
        if (driving) {
            label.text = when {
                playing == null -> "다음 이야기를 준비하고 있어요"
                playing.isAd -> "광고"
                else -> "지금 듣는 이야기"
            }
            title.text = playing?.name ?: ""
            detail.text = ""
        } else {
            label.text = "오늘 지나온 곳"
            title.text = "${Now.heard.size}곳"
            detail.text = Now.heard.joinToString("\n") { p -> if (p.coupon.isEmpty()) p.name else "${p.name} · ${p.coupon}" }
        }
        handler.postDelayed(::render, 1000)
    }
}
