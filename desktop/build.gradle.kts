import org.jetbrains.compose.desktop.application.dsl.TargetFormat

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.compose.multiplatform)
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(project(":shared"))
    implementation(compose.desktop.currentOs)
    implementation(compose.material3)
    implementation(compose.materialIconsExtended)
    implementation(libs.kotlinx.coroutines.swing)
    implementation(libs.jna.platform)
    implementation(libs.zxing.core)

    testImplementation(libs.junit)
}

compose.desktop {
    application {
        mainClass = "com.discoveries.aidirector.desktop.MainKt"
        nativeDistributions {
            targetFormats(TargetFormat.Msi, TargetFormat.Exe)
            packageName = "AIDirectorFX3"
            packageVersion = "0.4.0"
            description = "AI Director FX3 — DISCOVERIES"
            vendor = "DISCOVERIES"
            // java.naming etc. are not needed; sql is not used. jdk.crypto.ec is required for HTTPS.
            modules("java.instrument", "jdk.unsupported", "jdk.crypto.ec", "java.net.http", "java.naming", "java.sql", "jdk.accessibility", "jdk.httpserver")
            windows {
                menuGroup = "AI Director FX3"
                shortcut = true
                dirChooser = true
                perUserInstall = true
                upgradeUuid = "8f0c6a52-2f5e-4b6d-9a55-3f1d7c2b9e41"
            }
        }
    }
}
