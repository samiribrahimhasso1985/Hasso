import org.jetbrains.compose.desktop.application.dsl.TargetFormat
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// Desktop director console (Windows / macOS / Linux). Controls the same camera phones as the
// Android director, through the shared :link-core protocol.
plugins {
    id("org.jetbrains.kotlin.jvm")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.compose")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    implementation(project(":link-core"))
    implementation(compose.desktop.currentOs)
    implementation(compose.material3)
    implementation(compose.materialIconsExtended)
    // Main-thread dispatcher for Compose Desktop (Swing event thread).
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.10.2")
    // mDNS/DNS-SD: finds camera phones advertised by Android NSD (_dmpcam._tcp) on the LAN.
    implementation("org.jmdns:jmdns:3.6.3")
    testImplementation("junit:junit:4.13.2")
}

compose.desktop {
    application {
        mainClass = "com.directormodepro.desktop.MainKt"
        nativeDistributions {
            targetFormats(TargetFormat.Msi, TargetFormat.Exe, TargetFormat.Dmg, TargetFormat.Deb)
            packageName = "DirectorModePro"
            // Installers (macOS DMG) need MAJOR > 0; the desktop console starts at 1.0.0.
            packageVersion = "1.0.0"
            description = "Director Mode Pro - desktop director console"
            vendor = "Director Mode Pro"
            modules("java.logging", "java.naming", "jdk.unsupported")
            windows {
                menuGroup = "Director Mode Pro"
                shortcut = true
                dirChooser = true
                perUserInstall = true
                // Fixed so new versions upgrade the installed one instead of installing twice.
                upgradeUuid = "6f4b8a52-3c1e-4d0b-9a77-2f5e1c9d8b41"
                iconFile.set(project.file("icons/icon.ico"))
            }
            macOS {
                bundleID = "com.directormodepro.desktop"
                iconFile.set(project.file("icons/icon.icns"))
            }
            linux {
                iconFile.set(project.file("icons/icon.png"))
            }
        }
    }
}
