package app.curator

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
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log

// What the screen shows; written by the service once per tick.
object Now {
    @Volatile var gear = "GEAR_PARK"
    @Volatile var speedKmh = 0.0
    @Volatile var playing: Place? = null
    val heard = java.util.concurrent.CopyOnWriteArrayList<Place>()
}

// Runs as a foreground service so speech continues behind navigation or while driving.
class CuratorService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var vehicle: Vehicle
    private lateinit var car: Car
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
        vehicle = Vehicle(this).also { it.initialize() }
        car = Car.createCar(this)
        startTts()
        handler.postDelayed(::tick, 3000)
    }

    private fun startTts() {
        tts = TextToSpeech(applicationContext, Mode.ON_DEVICE)
        tts.initialize(object : OnInitializeListener {
            override fun onSuccess() {
                tts.addEventListener(object : EventListener {
                    override fun onReady() = Unit
                    override fun onStart() = Unit
                    override fun onUpdatedRms(rms: Double) = Unit
                    override fun onDone() = handler.post { finishSpeech() }.let { }
                    override fun onStop() = handler.post { finishSpeech() }.let { }
                    override fun onError(errorType: ErrorType) {
                        log("tts error $errorType")
                        handler.post { finishSpeech() }
                    }
                })
                ttsReady = true
                log("tts ready")
            }
            override fun onFailure(errorType: ErrorType) = log("tts init failed $errorType")
        })
    }

    private fun finishSpeech() {
        val item = current ?: return
        if (item.isAd) {
            adsPlayed++
            lastAdEnd = clock
        }
        current = null
        Now.playing = null
        restUntil = clock + Planner.Options().gapSec
        log("done ${item.id}")
    }

    private fun readVehicle() {
        vehicle.getGear().getCurrentGearSelectionState({ Now.gear = it.toString() }, { log("gear failed $it") })
        vehicle.getTurnSignal().getCurrentTurnSignalState({ turnOn = it.toString() != "OFF" }, { log("turn failed $it") })
        vehicle.getBrake().getCurrentBrakePedalStatus({ braking = it.toString() == "true" }, { log("brake failed $it") })
        val properties = car.getCarManager(Car.PROPERTY_SERVICE) as CarPropertyManager
        Now.speedKmh = properties.getFloatProperty(VehiclePropertyIds.PERF_VEHICLE_SPEED, 0) * 3.6
    }

    private fun tick() {
        clock++
        try {
            readVehicle()
            if (Now.gear == "GEAR_DRIVE") drive()
        } catch (t: Throwable) {
            log("tick failed ${t.javaClass.simpleName}: ${t.message}")
        }
        handler.postDelayed(::tick, 1000)
    }

    private fun drive() {
        if (posM >= route.length) restartDemo()
        posM += Now.speedKmh / 3.6
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
        if (Now.heard.none { it.id == place.id }) Now.heard.add(place)
        log("play ${next.id} ${next.version} at ${posM.toInt()}m")
        tts.speak(if (next.version == "long") place.long else place.short, true)
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
