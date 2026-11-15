package app.curator

import android.app.Activity
import android.car.Car
import android.car.drivingstate.CarUxRestrictionsManager
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Typeface
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

/** The vehicle owns its driving view and global dock; this window owns the map and audio. */
class MainActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private val refresh = object : Runnable { override fun run() { render(); handler.postDelayed(this, 1000) } }
    private var car: Car? = null
    private lateinit var routeView: RouteView
    private lateinit var stateLabel: TextView
    private lateinit var title: TextView
    private lateinit var subtitle: TextView
    private lateinit var progress: ProgressBar
    private lateinit var notice: TextView
    private lateinit var controls: LinearLayout
    private lateinit var goButton: Button
    private lateinit var nextButton: Button
    private lateinit var stopButton: Button
    private lateinit var history: LinearLayout
    private lateinit var footer: TextView
    private var renderedHeard = -1
    private var previousDriving: Boolean? = null
    private val expanded = mutableSetOf<String>()
    private val saved = mutableSetOf<String>()
    private val topics = mapOf("history" to "역사", "nature" to "자연", "culture" to "문화", "cafe" to "카페", "food" to "맛집", "experience" to "체험", "event" to "행사", "charging" to "충전", "stay" to "숙소", "shop" to "편의점")
    private fun dp(value: Int) = Design.dp(this, value)
    private fun label(size: Float, color: Int = Design.text, bold: Boolean = false) = TextView(this).apply {
        textSize = size; setTextColor(color)
        if (bold) typeface = Typeface.create("sans-serif", Typeface.BOLD)
        setLineSpacing(dp(3).toFloat(), 1f)
    }
    private fun action(text: String, primary: Boolean = false, onClick: () -> Unit) = Button(this).apply {
        this.text = text; textSize = 20f; isAllCaps = false
        setTextColor(Design.text)
        background = Design.shape(this@MainActivity, if (primary) Design.blue else Design.raised, 14, !primary)
        minHeight = dp(64); minimumHeight = dp(64)
        setPadding(dp(14), dp(12), dp(14), dp(12))
        setOnClickListener { onClick() }
    }
    private fun gap(size: Int) = View(this).apply { layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, dp(size)) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Design.background
        window.navigationBarColor = Design.background
        val wide = resources.configuration.screenWidthDp >= 900
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(24), dp(16), dp(24), dp(16))
            addView(label(23f, bold = true).apply {
                text = "↗  지나는 길에"
                layoutParams = LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f)
            })
            addView(label(13f, Design.muted).apply { text = "제주 · 애월 → 곽지" })
        }
        routeView = RouteView(this).apply {
            contentDescription = "OpenStreetMap 기반 애월~곽지 시연 경로"
            layoutParams = if (wide) LinearLayout.LayoutParams(0, MATCH_PARENT, 1.2f) else LinearLayout.LayoutParams(MATCH_PARENT, 0, .42f)
        }
        stateLabel = label(15f, Design.blue, true)
        title = label(if (wide) 38f else 30f, bold = true).apply { setPadding(0, dp(18), 0, dp(10)) }
        subtitle = label(17f, Design.muted)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100; progressBackgroundTintList = ColorStateList.valueOf(Design.border)
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, dp(5)).apply { topMargin = dp(28); bottomMargin = dp(16) }
        }
        notice = label(14f, Design.muted).apply { setPadding(0, 0, 0, dp(16)); accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        goButton = action("↱  가 볼래", true) { Now.onCommand?.invoke("go") }.apply {
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, dp(76))
        }
        nextButton = action("다음  ▷| ") { Now.onCommand?.invoke("next") }
        stopButton = action("□  그만") { Now.onCommand?.invoke("stop") }
        controls = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(goButton); addView(gap(12))
            addView(LinearLayout(this@MainActivity).apply {
                orientation = LinearLayout.HORIZONTAL
                addView(nextButton, LinearLayout.LayoutParams(0, dp(68), 1f).apply { rightMargin = dp(6) })
                addView(stopButton, LinearLayout.LayoutParams(0, dp(68), 1f).apply { leftMargin = dp(6) })
            })
        }
        history = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        footer = label(12f, Design.muted).apply { text = "길 안내가 먼저입니다 · 애월~곽지 시연 경로"; setPadding(0, dp(22), 0, 0) }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(26), dp(24), dp(26), dp(24))
            listOf(stateLabel, title, subtitle, progress, notice, controls, history, footer).forEach { addView(it) }
        }
        val panel = ScrollView(this).apply {
            isFillViewport = true
            background = Design.shape(this@MainActivity, Design.background, 20)
            addView(content)
            layoutParams = if (wide) LinearLayout.LayoutParams(0, MATCH_PARENT, 1f).apply { leftMargin = dp(8) }
                else LinearLayout.LayoutParams(MATCH_PARENT, 0, .58f).apply { topMargin = dp(8) }
        }
        val body = LinearLayout(this).apply {
            orientation = if (wide) LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
            setPadding(dp(8), 0, dp(8), dp(8))
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f)
            addView(routeView); addView(panel)
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setBackgroundColor(Design.background)
            addView(header); addView(body)
        })
        car = Car.createCar(this)
        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION), 0)
        }
        startForegroundService(Intent(this, CuratorService::class.java))
    }

    override fun onResume() { super.onResume(); handler.removeCallbacks(refresh); handler.post(refresh) }
    override fun onPause() { handler.removeCallbacks(refresh); super.onPause() }
    override fun onDestroy() { handler.removeCallbacks(refresh); car?.disconnect(); super.onDestroy() }

    private fun renderHeard() {
        if (Now.heard.size == renderedHeard) return
        renderedHeard = Now.heard.size
        history.removeAllViews()
        if (Now.heard.isEmpty()) history.addView(label(16f, Design.muted).apply {
            text = "주행을 시작하면 주변 이야기가 들려요.\n들었던 장소와 혜택은 여기에 모아둘게요."
            setPadding(0, dp(16), 0, dp(20))
        })
        Now.heard.forEach { place ->
            history.addView(LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(18), dp(18), dp(18), dp(18))
                background = Design.shape(this@MainActivity, Design.surface, 14, true)
                layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { bottomMargin = dp(12) }
                addView(label(12f, if (place.isAd) Design.amber else Design.blue, true).apply { text = if (place.isAd) "광고" else topics[place.category] ?: place.category })
                addView(label(22f, bold = true).apply { text = place.name; setPadding(0, dp(8), 0, dp(14)) })
                val open = place.id in expanded
                addView(action(if (open) "접기" else "자세히 보기") {
                    if (!expanded.remove(place.id)) expanded.add(place.id)
                    renderedHeard = -1; renderHeard()
                }.apply { textSize = 16f })
                if (place.isAd && place.coupon.isNotEmpty()) {
                    addView(gap(10))
                    addView(action(if (place.id in saved) "혜택 확인됨" else "쿠폰 확인") {
                        saved.add(place.id); renderedHeard = -1; renderHeard()
                    }.apply { textSize = 16f; setTextColor(Design.amber) })
                }
                if (place.id in saved) addView(label(16f, Design.amber).apply {
                    text = "${place.coupon}\n시연용 혜택 · 실제 사용은 매장 확인이 필요합니다"
                    setPadding(0, dp(12), 0, 0)
                })
                if (open) addView(label(16f, Design.muted).apply {
                    text = place.long.ifEmpty { place.short }; setPadding(0, dp(16), 0, 0)
                    setLineSpacing(dp(5).toFloat(), 1.15f)
                })
            })
        }
    }

    private fun render() {
        val connected = car ?: Car.createCar(this)?.also { car = it }
        val restriction = try {
            (connected?.getCarManager(Car.CAR_UX_RESTRICTION_SERVICE) as? CarUxRestrictionsManager)?.currentCarUxRestrictions
        } catch (_: IllegalStateException) { null }
        // Unknown restriction state must never expose parked-only details.
        val driving = restriction?.isRequiresDistractionOptimization ?: true
        val playing = Now.playing
        val active = playing != null
        if (previousDriving != driving) { renderedHeard = -1; previousDriving = driving }
        listOf(progress, notice, controls, footer).forEach { it.visibility = if (driving) View.VISIBLE else View.GONE }
        history.visibility = if (driving) View.GONE else View.VISIBLE
        subtitle.visibility = if (driving) View.VISIBLE else View.GONE
        if (driving) {
            stateLabel.text = if (restriction == null) "차량 연결 확인 중" else if (playing?.isAd == true) "광고" else if (active) "지금 듣는 이야기" else "주변 이야기"
            stateLabel.setTextColor(if (playing?.isAd == true) Design.amber else Design.blue)
            title.text = playing?.name ?: "다음 이야기를\n준비하고 있어요"
            subtitle.text = playing?.let { "${topics[it.category] ?: it.category} · ${if (it.isAd) it.coupon else "지금 지나는 곳"}" } ?: "주변에 이야기가 생기면 음성으로 들려드릴게요."
            progress.progressTintList = ColorStateList.valueOf(if (playing?.isAd == true) Design.amber else Design.blue)
            progress.progress = if (!active) 0 else (Now.progress * 100).toInt()
            notice.text = Now.notice
            goButton.isEnabled = active || Now.heard.isNotEmpty()
            nextButton.isEnabled = active; stopButton.isEnabled = active
            listOf(goButton, nextButton, stopButton).forEach { it.alpha = if (it.isEnabled) 1f else .38f }
        } else {
            stateLabel.text = "MY DRIVE · 정차 중"; stateLabel.setTextColor(Design.blue)
            title.text = "오늘 지나온 곳 ${Now.heard.size}곳"
            renderHeard()
        }
        routeView.invalidate()
    }
}
