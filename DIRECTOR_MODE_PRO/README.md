# DIRECTOR MODE PRO — Android Foundation

Version: 0.1.0  
Package: `com.directormodepro.app`  
Minimum Android: 8.0 (API 26)  
Language: Kotlin + Jetpack Compose

## What is included

- Dark director-studio home screen
- Production name field
- Camera source list with starter Sony FX3 and DJI Osmo Action 5 Pro entries
- Add-camera dialog with generic manufacturer and transport choices
- Camera, tools, and settings sections
- Pluggable camera-adapter architecture reserved for manufacturer-specific integrations

## Important implementation status

This is a **UI and application-foundation prototype**, not a finished camera-control product. The preview panels intentionally show `NO SIGNAL`; camera discovery, live video, recording control, camera settings, waveform, false color, peaking, and LUT processing are not implemented yet.

Each camera adapter must be validated against its actual hardware, firmware, protocol, Android version, and any manufacturer licensing requirements. Sony's Camera Remote SDK currently lists desktop/Linux operating systems rather than Android; an Android implementation therefore needs a separately validated route such as a supported network command protocol or a compatible external bridge. DJI Mimo documents Action 5 Pro livestreaming, but that does not itself establish a public SDK for third-party remote control.

## Build with Android Studio

1. Install Android Studio with Android SDK Platform 36 and JDK 17.
2. Open this folder as an existing Gradle project.
3. Allow Gradle sync to finish.
4. Connect an Android phone with USB debugging enabled, or create an emulator.
5. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
6. Android Studio will show the generated APK location.

The project uses Android Gradle Plugin 8.13.2, Kotlin 2.2.21, and Compose BOM 2025.10.01.

## APK build automation

A GitHub Actions workflow is provided at `.github/workflows/android-apk.yml`. It builds an installable debug APK and uploads it as the `director-mode-pro-debug-apk` artifact. See `docs/APK_BUILD_GUIDE_AR.md` for Arabic build and installation instructions.

Expected output: `app/build/outputs/apk/debug/app-debug.apk`.

This APK is a UI/foundation test build. It does not yet provide real camera discovery, live streaming, or manufacturer remote-control integration.
