package app.curator

import android.app.Activity
import android.car.Car
import android.car.drivingstate.CarUxRestrictionsManager
import android.content.Intent
import android.content.res.ColorStateList
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
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView

// Driving: route sketch, one glanceable line, two large buttons. Parked: the places passed today, with coupons.
class MainActivity : Activity() {
    private companion object {
        val BACKGROUND = Color.parseColor("#0F1216")
        val SURFACE = Color.parseColor("#1B2027")
        val TEXT = Color.parseColor("#F2F4F7")
        val MUTED = Color.parseColor("#9AA4B2")
        val STORY = Color.parseColor("#4CC2A4")
        val AD = Color.parseColor("#F2B04C")
        val DARK_ON_ACCENT = Color.parseColor("#06231C")
        val TOPICS = mapOf(
            "history" to "역사", "nature" to "자연", "culture" to "문화", "cafe" to "카페", "food" to "맛집",
            "experience" to "체험", "event" to "행사", "charging" to "충전", "stay" to "숙소", "shop" to "편의점",
        )
    }

    private val handler = Handler(Looper.getMainLooper())
    private var car: Car? = null
    private lateinit var routeView: RouteView
    private lateinit var chip: TextView
    private lateinit var title: TextView
    private lateinit var subtitle: TextView
    private lateinit var progress: ProgressBar
    private lateinit var upcoming: TextView
    private lateinit var notice: TextView
    private lateinit var spacer: View
    private lateinit var drivingControls: LinearLayout
    private lateinit var goButton: Button
    private lateinit var heardScroll: ScrollView
    private lateinit var heardList: LinearLayout
    private var renderedHeard = -1
    private val expanded = mutableSetOf<String>()
    private val saved = mutableSetOf<String>()

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

    private fun smallButton(text: String, background: Int, foreground: Int, onClick: () -> Unit) = Button(this).apply {
        this.text = text
        textSize = 22f
        setTextColor(foreground)
        setBackground(rounded(background, 24f))
        setPadding(28, 0, 28, 0)
        isAllCaps = false
        setOnClickListener { onClick() }
        layoutParams = LinearLayout.LayoutParams(WRAP_CONTENT, 88).apply { setMargins(12, 0, 0, 0) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        routeView = RouteView(this).apply { layoutParams = LinearLayout.LayoutParams(0, MATCH_PARENT, 1f) }
        chip = label(24f, DARK_ON_ACCENT, bold = true).apply {
            setPadding(28, 10, 28, 10)
            layoutParams = LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT)
        }
        title = label(56f, TEXT, bold = true).apply { setPadding(0, 24, 0, 8) }
        subtitle = label(30f, MUTED).apply { setPadding(0, 0, 0, 24) }
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, 16)
        }
        upcoming = label(24f, MUTED).apply { setPadding(0, 32, 0, 0) }
        notice = label(26f, STORY).apply { setPadding(0, 16, 0, 0) }
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
        spacer = View(this).apply { layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f) }
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 40, 40, 40)
            layoutParams = LinearLayout.LayoutParams(0, MATCH_PARENT, 1.3f)
            listOf(chip, title, subtitle, progress, upcoming, notice, heardScroll, spacer, drivingControls).forEach { addView(it) }
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(BACKGROUND)
            addView(routeView)
            addView(panel)
        })
        car = Car.createCar(this)
        requestPermissions(arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION), 0)
        startForegroundService(Intent(this, CuratorService::class.java))
        render()
    }

    private fun showChip(text: String, color: Int) {
        chip.text = text
        chip.background = rounded(color, 40f)
    }

    private fun topic(place: Place) = TOPICS[place.category] ?: place.category

    private fun heardRow(place: Place) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(0, 20, 0, 20)
        addView(LinearLayout(this@MainActivity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(label(20f, if (place.isAd) AD else STORY).apply {
                text = if (place.isAd) "광고" else topic(place)
                background = rounded(SURFACE, 20f)
                setPadding(18, 6, 18, 6)
            })
            addView(label(32f, TEXT, bold = true).apply {
                text = place.name
                setPadding(20, 0, 0, 0)
                layoutParams = LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f)
            })
            val open = place.id in expanded
            addView(smallButton(if (open) "접기" else "자세히", SURFACE, TEXT) {
                if (!expanded.remove(place.id)) expanded.add(place.id)
                renderedHeard = -1
            })
            if (place.isAd && place.coupon.isNotEmpty()) {
                val got = place.id in saved
                addView(smallButton(if (got) "저장됨" else "쿠폰 받기", if (got) SURFACE else AD, if (got) AD else DARK_ON_ACCENT) {
                    saved.add(place.id)
                    renderedHeard = -1
                })
            }
        })
        if (place.id in saved) addView(label(26f, AD).apply {
            text = "${place.coupon} · 매장에서 이 화면을 보여 주세요"
            setPadding(0, 12, 0, 0)
        })
        if (place.id in expanded) addView(label(24f, MUTED).apply {
            text = place.long.ifEmpty { place.short }
            setLineSpacing(8f, 1f)
            setPadding(0, 16, 0, 0)
        })
    }

    private fun renderHeard() {
        if (Now.heard.size == renderedHeard) return
        renderedHeard = Now.heard.size
        heardList.removeAllViews()
        Now.heard.forEach { heardList.addView(heardRow(it)) }
    }

    private fun render() {
        val connected = car ?: Car.createCar(this)?.also { car = it }
        val manager = connected?.getCarManager(Car.CAR_UX_RESTRICTION_SERVICE) as? CarUxRestrictionsManager
        // The restriction state is null while the car service is reconnecting.
        val driving = manager?.currentCarUxRestrictions?.isRequiresDistractionOptimization ?: false
        val playing = Now.playing
        val drivingOnly = if (driving) View.VISIBLE else View.GONE
        listOf(progress, upcoming, notice, spacer, drivingControls).forEach { it.visibility = drivingOnly }
        heardScroll.visibility = if (driving) View.GONE else View.VISIBLE
        subtitle.visibility = if (driving && playing != null) View.VISIBLE else View.GONE
        notice.text = Now.notice
        if (driving) {
            when {
                playing == null -> showChip("대기 중", MUTED)
                playing.isAd -> showChip("광고", AD)
                else -> showChip(topic(playing), STORY)
            }
            title.text = playing?.name ?: "다음 이야기를 준비 중"
            if (playing != null) {
                val ahead = (playing.routeM - Now.posM).toInt()
                val where = if (ahead > 50) "${ahead}m 앞" else "지금 지나는 곳"
                subtitle.text = if (playing.isAd) "${topic(playing)} · ${playing.coupon} · $where" else where
                subtitle.setTextColor(if (playing.isAd) AD else MUTED)
            }
            progress.progressTintList = ColorStateList.valueOf(if (playing?.isAd == true) AD else STORY)
            progress.progress = if (playing == null) 0 else (Now.progress * 100).toInt()
            val next = Now.places.filter { it.routeM > Now.posM && Now.heard.none { h -> h.id == it.id } }
                .sortedBy { it.routeM }.take(2)
            upcoming.text = if (next.isEmpty()) "" else "이 길에 남은 곳  " + next.joinToString("  ·  ") { it.name }
            goButton.isEnabled = playing != null || Now.heard.isNotEmpty()
        } else {
            showChip("정차 중", STORY)
            title.text = if (Now.heard.isEmpty()) "아직 들은 이야기가 없어요" else "오늘 지나온 곳 ${Now.heard.size}곳"
            renderHeard()
        }
        routeView.invalidate()
        handler.postDelayed(::render, 1000)
    }
}
