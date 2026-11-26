# DIRECTOR MODE PRO — Android

Version: 0.2.0 (versionCode 2)
Package: `com.directormodepro.app`
Minimum Android: 8.0 (API 26) • Target/compile SDK 36
Language: Kotlin + Jetpack Compose (Material 3)

## What works in 0.2.0

| Area | Status |
|---|---|
| Camera source management (add / edit / remove, brand, model, transport, endpoint) | ✅ Implemented |
| Local persistence (Room database `director_mode_pro.db`) | ✅ Implemented, survives restarts |
| Generic **RTSP receive-only** adapter: real `DESCRIBE` connection test, SDP video-track check | ✅ Implemented, unit-tested against a local RTSP responder |
| RTSP live preview in the Studio multiview (Media3 ExoPlayer) | ✅ Implemented — **not yet tested on a device with a real stream** |
| Connection status + verified capabilities per source | ✅ Only `livePreview` can become true, and only after a successful test |
| Sony FX3 | ⛔ Integration target — not connectable |
| DJI Osmo Action 5 Pro | ⛔ Integration target — not connectable |
| SRT, USB/UVC, HDMI capture | ⛔ Shown as UNSUPPORTED |
| Camera control (record, ISO, shutter, WB, focus, zoom) | ⛔ Not implemented for any camera |
| Waveform, false color, peaking, zebra, LUT, audio meters | ⛔ Planned (Tools tab shows PLANNED) |

### Honest status rules in the UI
- **REACHABLE** = the RTSP server answered `DESCRIBE` with a video track. It does not mean frames were decoded.
- **● LIVE** on a preview appears only while the Media3 player is actually playing.
- Sony/DJI cards show **INTEGRATION TARGET** and "CHECK SUPPORT" returns *not available*.
- Stream URLs containing usernames/passwords are **rejected**: no secret is ever written to disk.

## Architecture

```
camera/core/       contracts (CameraAdapter, registry, repository), models, validator, CameraConnectionManager
camera/adapters/   DefaultCameraAdapterFactory (only place with vendor knowledge), UnsupportedCameraAdapter
camera/adapters/rtsp/  RtspCameraAdapter, SocketRtspProbe (RFC 2326 DESCRIBE), response/SDP parsers
data/              CameraSourceRepository + CameraSourceStore interface; data/db = Room entity, DAO, database
ui/                DirectorViewModel, CameraSourcesScreen, SourceEditorDialog, RtspPreview, theme/Palette
```
Adding a camera = one new adapter + one branch in `DefaultCameraAdapterFactory`. Compose screens never reference a vendor.

### Dependencies added in 0.2.0 (and why)
| Dependency | Why |
|---|---|
| `androidx.room` 2.8.4 + KSP 2.3.4 | Relational local DB; the YouTube Director scope (projects, scenes, shots, team) needs relations and migrations, so Room was chosen over DataStore. Schemas exported to `app/schemas/`. |
| `androidx.media3` 1.8.0 (exoplayer, exoplayer-rtsp, ui) | Google-maintained player with a built-in RTSP client; avoids bundling native decoders. |
| `lifecycle-viewmodel-compose` / `lifecycle-runtime-compose` 2.9.4 | ViewModel + lifecycle-aware Flow collection; same version as the existing lifecycle dependency. |
| `junit` 4.13.2, `kotlinx-coroutines-test` 1.10.2 | Unit tests. |

## Build

Requirements: JDK 17+ (CI uses 17), Android SDK Platform 36, Build-Tools 36. Gradle 8.13 is pinned by the wrapper.

```bash
cd DIRECTOR_MODE_PRO
echo "sdk.dir=/path/to/Android/sdk" > local.properties   # Android Studio creates this automatically
./gradlew :app:testDebugUnitTest      # 47 JVM unit tests
./gradlew :app:assembleDebug          # -> app/build/outputs/apk/debug/app-debug.apk
./gradlew :app:connectedDebugAndroidTest   # Room DAO test, needs a device/emulator
```

Android Studio: open the `DIRECTOR_MODE_PRO` folder → Gradle sync → **Build > Build APK(s)**.

GitHub Actions: `.github/workflows/android-apk.yml` (repository root) runs the unit tests and uploads the APK as the `director-mode-pro-debug-apk` artifact. Arabic guide: `docs/APK_BUILD_GUIDE_AR.md`.

## Trying the RTSP preview
1. Get an RTSP URL on the same network as the phone/tablet, without a password: an IP camera, an HDMI→RTSP encoder in front of the FX3, or a test server such as MediaMTX publishing an H.264 stream.
2. Cameras → **Add camera source** → *RTSP stream* → paste the URL → Save.
3. **TEST CONNECTION** → the card should show REACHABLE and `✓ Preview`.
4. Studio → **START PREVIEW** on that card.

## Known limitations
- No emulator/device was available in the build environment: the UI and the RTSP preview have **not been run on hardware** yet. See `docs/HARDWARE_TESTS.md`.
- RTSP with authentication (401/403), `rtsps://` and SRT are not supported.
- Production name on the Studio tab is not persisted yet.
- English UI only; Arabic/RTL is planned.
- Debug APK only; release signing is not configured.

Progress log: `docs/PROGRESS_AR.md`.
