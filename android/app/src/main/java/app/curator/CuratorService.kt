package app.curator

import ai.pleos.playground.navi.constants.NaviErrorCode
import ai.pleos.playground.navi.constants.WaypointIndex
import ai.pleos.playground.navi.data.RequestWaypointInfo
import ai.pleos.playground.navi.data.RouteInfo
import ai.pleos.playground.navi.data.RouteStartInfo
import ai.pleos.playground.navi.data.WaypointChangedInfo
import ai.pleos.playground.navi.helper.NaviHelper
import ai.pleos.playground.navi.helper.listener.NaviHelperEventListener
import ai.pleos.playground.tts.TextToSpeech
import ai.pleos.playground.tts.constant.ErrorType
import ai.pleos.playground.tts.constant.Mode
import ai.pleos.playground.tts.listener.EventListener
import ai.pleos.playground.tts.listener.OnInitializeListener
import ai.pleos.playground.vehicle.Vehicle
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.car.Car
import android.car.VehiclePropertyIds
import android.car.hardware.property.CarPropertyManager
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.LocationListener
import android.location.LocationManager
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log

// What the screen shows; written by the service once per tick.
object Now {
    @Volatile var gear = "GEAR_PARK"
    @Volatile var speedKmh = 0.0
    @Volatile var playing: Place? = null
    @Volatile var notice = ""
    @Volatile var onCommand: ((String) -> Unit)? = null
    @Volatile var route: Route? = null
    @Volatile var places: List<Place> = emptyList()
    @Volatile var posM = 0.0
    @Volatile var progress = 0f
    val heard = java.util.concurrent.CopyOnWriteArrayList<Place>()
}

// One session for both the playback service and the media card service, whichever starts first.
private var session: MediaSession? = null

@Synchronized
fun sharedSession(context: android.content.Context): MediaSession =
    session ?: MediaSession(context, "curator").also { session = it }

// Runs as a foreground service so speech continues behind navigation or while driving.
class CuratorService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var vehicle: Vehicle
    private var car: Car? = null
    private lateinit var tts: TextToSpeech
    private lateinit var route: Route
    private lateinit var places: List<Place>

    private var clock = 0.0
    private var driveStart = 0.0
    private var posM = 0.0
    private var turnOn = false
    private var braking = false
    private var adsPlayed = 0
    private var lastAdEnd = Double.NEGATIVE_INFINITY
    private var lastCategory: String? = null
    private val played = mutableSetOf<String>()
    private var current: Planner.Scheduled? = null
    private var playDeadline = 0.0
    private var restUntil = 0.0
    private var ttsReady = false
    private var sentences = emptyList<String>()
    private var sentenceIndex = 0
    private lateinit var navi: NaviHelper
    private var naviReady = false
    private var routeActive = false
    private var waypoints = 0
    private var locationStarted = false
    private var fixLat = 0.0
    private var fixLon = 0.0
    private var fixClock = Double.NEGATIVE_INFINITY
    private var onGps: Boolean? = null
    private lateinit var media: MediaSession

    private fun log(text: String) { Log.i("CURATOR", text) }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        val channel = NotificationChannel("curator", "안내", NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        val notification = Notification.Builder(this, "curator")
            .setContentTitle("위치 안내 중").setSmallIcon(android.R.drawable.ic_media_play).build()
        startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)

        route = Route.parse(assets.open("route.json").bufferedReader().readText())
        places = route.onRoute(parseContent(assets.open("content.js").bufferedReader().readText()))
        Now.route = route
        Now.places = places
        vehicle = Vehicle(this).also { it.initialize() }
        car = Car.createCar(this)
        startTts()
        startNavi()
        Now.onCommand = { command -> handler.post { handleCommand(command) } }
        startMedia()
        handler.postDelayed(::tick, 3000)
    }

    // Publishes what is playing so the system media card can show it beside the navigation map.
    private fun startMedia() {
        media = sharedSession(applicationContext)
        media.setCallback(object : MediaSession.Callback() {
            override fun onSkipToNext() = handleCommand("next")
            override fun onStop() = handleCommand("next")
        })
        media.isActive = true
        showMedia(null)
    }

    private fun showMedia(place: Place?) {
        val title = place?.name ?: "다음 이야기를 준비 중"
        val subtitle = when {
            place == null -> "지나는 길에"
            place.isAd -> "광고 · ${place.coupon}"
            else -> "지나는 길에 · 이야기"
        }
        media.setMetadata(
            MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, subtitle)
                .build(),
        )
        val state = if (place == null) PlaybackState.STATE_PAUSED else PlaybackState.STATE_PLAYING
        media.setPlaybackState(
            PlaybackState.Builder()
                .setState(state, 0, 1f)
                .setActions(PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_STOP)
                .build(),
        )
    }

    // Retried every tick until the location permission is granted.
    private fun startLocation() {
        try {
            getSystemService(LocationManager::class.java).requestLocationUpdates(
                LocationManager.GPS_PROVIDER, 1000L, 0f,
                LocationListener {
                    fixLat = it.latitude
                    fixLon = it.longitude
                    fixClock = clock
                },
                Looper.getMainLooper(),
            )
            locationStarted = true
            log("location started")
        } catch (e: SecurityException) {
            Unit
        }
    }

    private fun startNavi() {
        navi = NaviHelper(applicationContext)
        navi.initialize(
            onConnected = {
                navi.addListener(object : NaviHelperEventListener {
                    override fun onRouteStarted(routeStartInfo: RouteStartInfo) {
                        routeActive = true
                        log("navi route started $routeStartInfo")
                    }
                    override fun onRouteCancelled() {
                        routeActive = false
                        waypoints = 0
                    }
                    override fun onWaypointChanged(waypointChangedInfo: WaypointChangedInfo) =
                        log("navi waypoint changed $waypointChangedInfo")
                    override fun onError(errorCode: NaviErrorCode) = log("navi error $errorCode")
                })
                naviReady = true
                log("navi ready")
            },
            onFailed = { log("navi failed $it") },
        )
    }

    private fun handleCommand(command: String) {
        log("command $command")
        when (command) {
            "next" -> if (current != null) tts.stop()
            "go" -> (Now.playing ?: Now.heard.lastOrNull())?.let(::addToRoute)
        }
    }

    // Navigation needs a destination first, and allows at most two waypoints.
    private fun addToRoute(place: Place) {
        if (!naviReady) {
            Now.notice = "내비 연결을 기다리고 있어요"
            return
        }
        if (!routeActive) {
            navi.requestRoute(
                RouteInfo(
                    latitude = place.lat, longitude = place.lon, displayLongitude = null, displayLatitude = null,
                    poiName = place.name, poiId = "", poiSubId = "0", address = place.name,
                ),
            )
            Now.notice = "${place.name}(으)로 안내를 시작합니다"
            log("route requested ${place.id}")
        } else if (waypoints < 2) {
            navi.addWaypoint(
                RequestWaypointInfo(
                    latitude = place.lat, longitude = place.lon,
                    waypointIndex = if (waypoints == 0) WaypointIndex.FIRST else WaypointIndex.SECOND,
                    poiId = "", poiName = place.name, poiSubId = "0", address = place.name,
                ),
            )
            waypoints++
            Now.notice = "${place.name} 경유지 추가"
            log("waypoint requested ${place.id}")
        } else {
            Now.notice = "경유지는 두 곳까지 추가할 수 있어요"
        }
    }

    private fun startTts() {
        tts = TextToSpeech(applicationContext, Mode.ON_DEVICE)
        tts.initialize(object : OnInitializeListener {
            override fun onSuccess() {
                tts.addEventListener(object : EventListener {
                    override fun onReady() = Unit
                    override fun onStart() = Unit
                    override fun onUpdatedRms(rms: Double) = Unit
                    override fun onDone() = handler.post { speakNext() }.let { }
                    override fun onStop() = handler.post { finishSpeech() }.let { }
                    override fun onError(errorType: ErrorType) {
                        log("tts error $errorType on: ${sentences.getOrNull(sentenceIndex - 1)}")
                        // The on-device model is prepared after the first failed request; give it time.
                        handler.post {
                            finishSpeech()
                            restUntil = clock + 30
                        }
                    }
                })
                ttsReady = true
                log("tts ready")
                tts.speak("안내를 시작합니다.", true)
            }
            override fun onFailure(errorType: ErrorType) = log("tts init failed $errorType")
        })
    }

    // One sentence per request, so a failed sentence does not lose the rest of the text.
    private fun speakNext() {
        if (current == null) return
        if (sentenceIndex >= sentences.size) {
            finishSpeech()
            return
        }
        Now.progress = (sentenceIndex + 1f) / sentences.size
        tts.speak(sentences[sentenceIndex++], true)
    }

    private fun finishSpeech() {
        val item = current ?: return
        if (item.isAd) {
            adsPlayed++
            lastAdEnd = clock
        }
        current = null
        Now.playing = null
        showMedia(null)
        restUntil = clock + Planner.Options().gapSec
        log("done ${item.id}")
    }

    private fun readVehicle() {
        vehicle.getGear().getCurrentGearSelectionState({ Now.gear = it.toString() }, { log("gear failed $it") })
        vehicle.getTurnSignal().getCurrentTurnSignalState({ turnOn = it.toString() != "OFF" }, { log("turn failed $it") })
        vehicle.getBrake().getCurrentBrakePedalStatus({ braking = it.toString() == "true" }, { log("brake failed $it") })
        // createCar returns null while the car service restarts; try again on the next tick.
        val connected = car ?: Car.createCar(this)?.also { car = it } ?: return
        val properties = connected.getCarManager(Car.PROPERTY_SERVICE) as CarPropertyManager
        Now.speedKmh = properties.getFloatProperty(VehiclePropertyIds.PERF_VEHICLE_SPEED, 0) * 3.6
    }

    private fun tick() {
        clock++
        try {
            if (!locationStarted) startLocation()
            readVehicle()
            if (Now.gear == "GEAR_DRIVE") drive()
        } catch (t: Throwable) {
            log("tick failed ${t.javaClass.simpleName}: ${t.message}")
        }
        handler.postDelayed(::tick, 1000)
    }

    private fun drive() {
        // A fresh GPS fix on the route wins; otherwise advance along the demo route by the vehicle speed.
        val (gpsM, offM) = route.locate(fixLat, fixLon)
        val gps = clock - fixClock <= 3 && offM < 100
        if (gps != onGps) {
            onGps = gps
            log(if (gps) "position from gps" else "position from speed")
        }
        if (gps) {
            posM = gpsM
        } else {
            if (posM >= route.length) restartDemo()
            posM += Now.speedKmh / 3.6
        }
        Now.posM = posM
        if (current != null && clock > playDeadline) finishSpeech()
        if (current != null || !ttsReady || clock < restUntil) return

        val state = Planner.State(
            speedMps = Now.speedKmh / 3.6,
            maneuverDistancesM = route.maneuversM.map { it - posM },
            driverBusy = turnOn || braking,
            played = played,
            elapsedSec = clock - driveStart,
            adsPlayed = adsPlayed,
            secSinceLastAd = clock - lastAdEnd,
            lastCategory = lastCategory,
        )
        val next = Planner.plan(state, places.map { it.copy(distanceM = it.routeM - posM) }).firstOrNull() ?: return
        if (next.start > 1) return

        val place = places.first { it.id == next.id }
        current = next
        played.add(next.id)
        lastCategory = next.category
        playDeadline = clock + next.dur + 15
        Now.playing = place
        showMedia(place)
        if (Now.heard.none { it.id == place.id }) Now.heard.add(place)
        log("play ${next.id} ${next.version} at ${posM.toInt()}m")
        val text = if (next.version == "long") place.long else place.short
        sentences = text.split(Regex("(?<=[.!?])\\s+")).filter { it.isNotBlank() }
        sentenceIndex = 0
        speakNext()
    }

    private fun restartDemo() {
        posM = 0.0
        driveStart = clock
        adsPlayed = 0
        lastAdEnd = Double.NEGATIVE_INFINITY
        lastCategory = null
        played.clear()
        log("demo restarted")
    }
}
