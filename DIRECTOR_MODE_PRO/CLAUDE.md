# DIRECTOR MODE PRO — Claude Code Project Instructions

You are the senior Android/Kotlin engineer implementing DIRECTOR MODE PRO.

## Product decisions (approved)
- Product: DIRECTOR MODE PRO.
- Platform: Android only for the first release.
- Delivery: installable APK.
- Devices: target a broad range of Android phones and tablets.
- Camera architecture: extensible adapter/plugin model; never hard-code the app to one manufacturer.
- Initial camera targets: Sony FX3 and DJI Osmo Action 5 Pro, with future adapters for Canon, Blackmagic, Panasonic and generic network video sources.
- User prefers a polished professional cinema-director interface, dark theme, tablet-responsive layout, and minimal manual coding.

## Existing project
- Package: `com.directormodepro.app`
- Language: Kotlin
- UI: Jetpack Compose + Material 3
- Minimum Android: API 26 (Android 8.0)
- Java/JVM target: 17
- Existing UI foundation: `app/src/main/java/com/directormodepro/app/MainActivity.kt`
- Camera contracts: `app/src/main/java/com/directormodepro/app/camera/`

## Non-negotiable engineering rules
1. First inspect the entire repository and current Gradle configuration. Do not replace working files blindly.
2. Keep the app buildable after every implementation step. Run Gradle compile/build tasks when the environment permits and report exact results.
3. Do not fake camera connectivity, video, battery, recording, or remote-control success. Demo data must be clearly labelled DEMO; unsupported functions must be visibly disabled or reported as unsupported.
4. Implement one adapter per validated camera protocol/model. Keep vendor-specific code out of Compose screens and domain models.
5. A camera capability is true only after verified support. Do not infer a public SDK from the existence of a manufacturer's consumer app.
6. Respect Android USB host permissions, Wi-Fi/network permissions, lifecycle, reconnects, and resource cleanup.
7. Do not reverse engineer, bypass pairing, or violate manufacturer terms. Prefer documented SDKs/protocols and user-authorized connections.
8. Never store camera passwords or secrets in plain text. Avoid logging credentials, network keys, or personal data.
9. Use coroutines/Flow for asynchronous work. Do not block the main thread.
10. Add tests for domain logic and adapter state transitions. Document hardware tests separately from emulator tests.
11. Preserve the current app identity, package name, and dark cinema design language unless the user approves a change.
12. Before adding a dependency, explain why it is needed and choose a maintained Android-compatible version.

## Hardware and protocol truth
- Sony FX3: investigate officially documented Android-compatible options first. Sony Camera Remote SDK may not support Android directly; do not claim native SDK integration without proof. Consider a supported external bridge or a validated network protocol only where permitted.
- DJI Osmo Action 5 Pro: DJI Mimo functionality does not automatically imply a public third-party SDK. Investigate documented livestream/network output and validate actual device behavior before implementing controls.
- Generic RTSP/SRT/IP video sources can be implemented as receive-only sources when the stream URL is supplied by the user and the stream format is supported.
- USB capture requires compatible UVC hardware and Android USB host support; a camera USB-C port is not automatically a UVC output.

## Current milestone
Milestone 1 — Camera Engine Foundation:
- Review `camera/core` contracts and improve them if needed.
- Add a camera-source management UI: add/edit/remove source, choose transport, connection test, status and capabilities.
- Add persistent local storage for user-created camera sources (Room or DataStore; justify choice).
- Add a generic RTSP receive-only adapter only if a real stream URL can be supplied and the chosen decoder dependency is appropriate.
- Keep Sony and DJI as clearly marked integration targets until real hardware validation is completed.
- Add unit tests for registry/repository and connection state.
- Update README with exact build/run steps and known limitations.

## Workflow
Work in small, coherent steps. At the end of each step:
- list files changed;
- explain what is implemented and what remains;
- run available tests/build and report pass/fail accurately;
- give the next concrete milestone.

Do not stop at writing a plan. Implement the next safe, testable increment in code.

## APK build requirements

- Keep the project buildable with Android Gradle Plugin 8.13.2, Gradle 8.13, JDK 17, and Android SDK Platform 36.
- Before claiming an APK is ready, run `gradle :app:assembleDebug` (or the Android Studio equivalent) and verify that `app/build/outputs/apk/debug/app-debug.apk` exists.
- Do not claim real camera streaming or remote control unless a hardware-backed adapter has been implemented and tested.
- Preserve the GitHub Actions APK workflow at `.github/workflows/android-apk.yml` and update `docs/APK_BUILD_GUIDE_AR.md` if build steps change.
