package app.curator

import android.app.Activity
import android.car.Car
import android.car.drivingstate.CarUxRestrictionsManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

// Glanceable while driving (one line, two large buttons); the visited list when parked.
class MainActivity : Activity() {
    private companion object {
        val BACKGROUND = Color.parseColor("#0F1216")
        val SURFACE = Color.parseColor("#1B2027")
        val TEXT = Color.parseColor("#F2F4F7")
        val MUTED = Color.parseColor("#9AA4B2")
        val STORY = Color.parseColor("#4CC2A4")
        val AD = Color.parseColor("#F2B04C")
        val DARK_ON_ACCENT = Color.parseColor("#06231C")
    }

    private val handler = Handler(Looper.getMainLooper())
    private lateinit var car: Car
    private lateinit var chip: TextView
    private lateinit var title: TextView
    private lateinit var notice: TextView
    private lateinit var drivingControls: LinearLayout
    private lateinit var goButton: Button
    private lateinit var heardScroll: ScrollView
    private lateinit var heardList: LinearLayout
    private var renderedHeard = -1

    private fun rounded(color: Int, radius: Float) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = radius
    }

    private fun label(size: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
        textSize = size
        setTextColor(color)
        if (bold) typeface = Typeface.DEFAULT_BOLD
    }

    private fun button(text: String, background: Int, foreground: Int, command: String) = Button(this).apply {
        this.text = text
        textSize = 36f
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(foreground)
        setBackground(rounded(background, 32f))
        setOnClickListener { Now.onCommand?.invoke(command) }
        layoutParams = LinearLayout.LayoutParams(0, 200, 1f).apply { setMargins(12, 0, 12, 0) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        chip = label(26f, DARK_ON_ACCENT, bold = true).apply {
            setPadding(32, 12, 32, 12)
            layoutParams = LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT)
        }
        title = label(64f, TEXT, bold = true).apply { setPadding(0, 32, 0, 16) }
        notice = label(28f, STORY).apply { setPadding(0, 0, 0, 16) }
        goButton = button("가 볼래", STORY, DARK_ON_ACCENT, "go")
        drivingControls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(goButton)
            addView(button("다음", SURFACE, TEXT, "next"))
        }
        heardList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        heardScroll = ScrollView(this).apply {
            addView(heardList)
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f)
        }
        val spacer = View(this).apply { layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f) }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(BACKGROUND)
            setPadding(48, 48, 48, 48)
            addView(chip)
            addView(title)
            addView(notice)
            addView(heardScroll)
            addView(spacer)
            addView(drivingControls)
        })
        spacerView = spacer
        car = Car.createCar(this)
        startForegroundService(Intent(this, CuratorService::class.java))
        if (intent.getBooleanExtra("testRoute", false)) Now.onCommand?.invoke("test-route") // TEMPORARY
        render()
    }

    private lateinit var spacerView: View

    private fun showChip(text: String, color: Int) {
        chip.text = text
        chip.background = rounded(color, 40f)
    }

    private fun renderHeard() {
        if (Now.heard.size == renderedHeard) return
        renderedHeard = Now.heard.size
        heardList.removeAllViews()
        for (place in Now.heard) {
            heardList.addView(label(32f, TEXT, bold = true).apply {
                text = place.name
                setPadding(0, 24, 0, 4)
            })
            if (place.coupon.isNotEmpty()) heardList.addView(label(26f, AD).apply { text = place.coupon })
        }
    }

    private fun render() {
        val manager = car.getCarManager(Car.CAR_UX_RESTRICTION_SERVICE) as CarUxRestrictionsManager
        val driving = manager.currentCarUxRestrictions.isRequiresDistractionOptimization
        val playing = Now.playing
        notice.text = Now.notice
        drivingControls.visibility = if (driving) View.VISIBLE else View.GONE
        spacerView.visibility = if (driving) View.VISIBLE else View.GONE
        heardScroll.visibility = if (driving) View.GONE else View.VISIBLE
        if (driving) {
            when {
                playing == null -> showChip("대기 중", MUTED)
                playing.isAd -> showChip("광고", AD)
                else -> showChip("이야기", STORY)
            }
            title.text = playing?.name ?: "다음 이야기를 준비하고 있어요"
            goButton.isEnabled = playing != null || Now.heard.isNotEmpty()
        } else {
            showChip("정차 중", STORY)
            title.text = if (Now.heard.isEmpty()) "아직 들은 이야기가 없어요" else "오늘 지나온 곳 ${Now.heard.size}곳"
            renderHeard()
        }
        handler.postDelayed(::render, 1000)
    }
}
