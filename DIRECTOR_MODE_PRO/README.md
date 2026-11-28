# DIRECTOR MODE PRO — Android

Version: 0.5.0 (versionCode 6)
Package: `com.directormodepro.app`
Minimum Android: 8.0 (API 26) • Target/compile SDK 36
Language: Kotlin + Jetpack Compose (Material 3)

## What works in 0.5.0

| Area | Status |
|---|---|
| **Languages: English, العربية (RTL), Deutsch** — in-app picker in Settings, also in Android 13+ system settings | ✅ Implemented, completeness checked by `LocalizationTest` |
| **Multi-phone link**: one director phone/tablet controls several camera phones on the same Wi-Fi — PIN pairing (HMAC, never stored), record/stop all with shared take names, live low-res preview, battery/storage, lens flip, auto-reconnect | ✅ Implemented, end-to-end tested over localhost — **not yet run on 2 real phones** |
| **Phone cameras** (back/front) via CameraX: live preview, video recording to `Movies/DirectorModePro`, zoom | ✅ Implemented — **not yet run on a device** |
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
| `androidx.camera` 1.5.1 (camera2, lifecycle, video, view) | Google's official API for the built-in cameras: preview, recording, zoom. |
| `kotlinx-serialization-json` 1.9.0 | JSON messages between linked phones (director ↔ camera). |
| `androidx.appcompat` 1.7.1 | Per-app language switching (`AppCompatDelegate.setApplicationLocales`) that also works on Android 8–12. |
| `junit` 4.13.2, `kotlinx-coroutines-test` 1.10.2 | Unit tests. |

## Build

Requirements: JDK 17+ (CI uses 17), Android SDK Platform 36, Build-Tools 36. Gradle 8.13 is pinned by the wrapper.

```bash
cd DIRECTOR_MODE_PRO
echo "sdk.dir=/path/to/Android/sdk" > local.properties   # Android Studio creates this automatically
./gradlew :app:testDebugUnitTest      # 63 JVM unit tests
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

## Desktop director console (Windows / macOS / Linux)
Module `desktop/` (Compose Multiplatform 1.9.3) reuses the shared `link-core/` protocol, so it controls the same camera phones as the Android director.
- Run from source: `./gradlew :desktop:run` (options: `--lang ar|de|en`, `--connect HOST:PORT --pin NNNNNN`, `--demo N` for simulated DEMO cameras).
- Installers: `./gradlew :desktop:packageDeb` (Linux, needs `fakeroot`), `packageMsi`/`packageExe` (Windows only), `packageDmg` (macOS only). CI: `.github/workflows/desktop.yml` builds all three and uploads them as artifacts.
- Discovery uses mDNS (JmDNS `_dmpcam._tcp.local.`); allow the app in the OS firewall if phones do not appear, or add them by address.

## Multi-phone link (architecture)
`link-core/…/LinkProtocol.kt` (frames, messages, PIN auth) · `link-core/…/CameraNodeServer.kt` (camera phone) · `link-core/…/DirectorSession.kt` (director) · `link/LinkDiscovery.kt` (Android NSD `_dmpcam._tcp`) · `link/CameraXNodeController.kt` (CameraX on the camera phone) · `ui/link/LinkScreens.kt`.
Full-quality video stays on each camera phone; only ~480 px JPEG preview frames travel to the director. After pairing, commands travel unencrypted on the local network (no secrets are sent).

## Localization
- Strings: `res/values` (English, default), `res/values-ar`, `res/values-de`. Camera brand/model names stay untranslated.
- Domain code returns language-neutral codes (`StatusMessage`, `ValidationCode`, `IntegrationReason`); `ui/Labels.kt` maps them to strings.
- URLs and IP addresses are forced left-to-right inside the Arabic layout.
- Add a language: copy `values/strings.xml` to `values-xx/`, translate, add `"xx"` to `localeFilters` and the picker list in `MainActivity.kt`.

## Known limitations
- No emulator/device was available in the build environment: the UI and the RTSP preview have **not been run on hardware** yet. See `docs/HARDWARE_TESTS.md`.
- RTSP with authentication (401/403), `rtsps://` and SRT are not supported.
- Production name on the Studio tab is not persisted yet.
- Arabic/German translations were written for this release and have not yet been reviewed on a device by a native speaker.
- Debug APK only; release signing is not configured.

Progress log: `docs/PROGRESS_AR.md`.
