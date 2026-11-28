# EZIDINET — Android development app (APK)

A small Android app (WebView shell) that opens the EZIDINET web app from a **test server you run yourself** — for
example your Windows PC on the same Wi-Fi. It is a **development build**: debug-signed, allows plain `http://` on the
local network, not for the Play Store and not for real users.

## What it does
* First start: asks for the server address (e.g. `http://192.168.1.20:3000`) and remembers it.
* Loads EZIDINET inside the app; external links open in the normal browser.
* No backup of app data (`allowBackup=false`); stores only the server address.
* Camera permission is requested only when the web app asks for it, and only for the configured server.
  (Note: browsers allow the camera only on HTTPS or localhost, so a QR camera scanner will need the HTTPS staging server.)
* If the server cannot be reached, the address screen opens again with an error message.
* Needs **Android System WebView / Chrome 80 or newer** (the web app uses modern JavaScript). Phones with Google Play
  update it automatically; on an older WebView the app shows an update hint instead of a blank page.
* If the WebView renderer stops (crash or low memory), the app does not close: it replaces the WebView and shows the
  address screen with a message.

## Test results (2026-11-27, emulator in software mode — no hardware acceleration available)
| Test | Android 8 (WebView 69) | Android 14 (WebView 113) |
|---|---|---|
| App installs and starts, setup screen (EN + AR) | ✅ | ✅ (splash with icon) |
| Invalid address → error message | ✅ | — |
| Unreachable server → back to setup with error | ✅ | — |
| Web app loads | ❌ WebView 69 too old (`globalThis`, optional chaining) → now shows update hint | renderer stopped under emulation |
| Renderer stops → app recovers instead of crashing | — | ✅ (forced with `Page.crash`) |
A full login test on a real phone (or an emulator with hardware acceleration) is still needed.

## Run the server for the phone (Windows PC)
```bash
# 1. API as usual
npm run dev:api
# 2. Web app reachable on the network, API proxied through the web server (one address for the phone)
cd apps/web
set NEXT_PUBLIC_API_URL=/api
set API_PROXY_TARGET=http://localhost:4000/api
npm run dev:lan
```
(PowerShell: `$env:NEXT_PUBLIC_API_URL="/api"` etc.) Find the PC's address with `ipconfig` (IPv4, e.g. 192.168.1.20)
and allow port 3000 in the Windows firewall for private networks. Enter `http://<that-address>:3000` in the app.

## Build the APK
Requirements: JDK 17+, Android SDK (platform 34, build-tools 34), Gradle 8.9+.
```bash
cd apps/android
echo sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk > local.properties   # path to your SDK
gradle assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```
Install: copy the APK to the phone and open it (allow "install unknown apps" for the file manager), or
`adb install app/build/outputs/apk/debug/app-debug.apk`.

## Before any real release (needs owner approval)
HTTPS-only server (staging/production deployment), release signing key kept outside Git, final application id after
the domain decision (EZ-18), remove cleartext traffic, privacy texts, store listing — or publish the web app as a PWA.
