plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The app reads the same content file as the web prototype.
val copyContent = tasks.register<Copy>("copyContent") {
    from("../../prototype/b/content.js")
    into(layout.buildDirectory.dir("generated/sharedAssets"))
}

android {
    namespace = "app.curator"
    compileSdk = 34
    useLibrary("android.car")
    defaultConfig {
        applicationId = "app.curator"
        minSdk = 28
        targetSdk = 34
    }
    buildTypes {
        // ponytail: release is signed with the debug key for the contest APK; add a real keystore before App Market submission.
        release { signingConfig = signingConfigs.getByName("debug") }
    }
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/sharedAssets"))
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

tasks.named("preBuild") { dependsOn(copyContent) }

dependencies {
    implementation("ai.pleos.playground:Vehicle:2.3.2")
    implementation("ai.pleos.playground:TextToSpeech:3.3.1")
    implementation("ai.pleos.playground:NaviHelper:3.0.5")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
