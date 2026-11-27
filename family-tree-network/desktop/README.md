# EZIDINET Desktop (Windows / Linux) — development build

EZIDINET Desktop runs the **complete platform on one computer**: its own PostgreSQL database, the API and the web
app in an app window. Nothing to install, no commands. Development/test build with the fictional demo network.

## Use (Windows)
1. Download `EZIDINET-Desktop-0.1.0-portable.exe` (single file) **or** `EZIDINET-0.1.0-win.zip` (unzip, then start
   `EZIDINET.exe` — starts faster than the portable file).
2. Windows SmartScreen may warn because the build is not code-signed: *More info → Run anyway*.
3. First start creates the local database and loads the demo network (a few seconds). Log in with a demo account.
4. Menu **EZIDINET**:
   * **Share with phone (same Wi-Fi)** — off by default. When on, the web app is reachable from phones on the same
     network; *Phone address…* shows the address to enter in the EZIDINET Android app. Allow Windows Firewall access
     on **private** networks only.
   * **Reset demo data…**, **Open data folder**, **Quit**.

Data folder: `%APPDATA%\EZIDINET\data` (database, logs, per-install secrets). Deleting it resets everything.

## Security design
* Database and API listen on `127.0.0.1` only — never reachable from the network.
* The web server is local-only unless *Share with phone* is on; phones reach the API only through the web server's
  `/api` proxy.
* JWT secret, QR-token key and database password are generated per installation (`config.json` in the data folder,
  never in Git or in the installer).
* Window: context isolation, sandbox, no Node.js in the page, external links open in the normal browser, no
  camera/microphone permissions.
* After a crash, leftover processes recorded by the app are stopped on the next start; foreign programs on the ports
  are never killed (clear error instead).

## Build
```bash
cd desktop
npm install --force          # --force: installs PostgreSQL binaries for Windows and Linux
npm run dist:win             # bundle + dist/EZIDINET-0.1.0-win.zip and dist/EZIDINET-Desktop-0.1.0-portable.exe
npm run dist:linux           # bundle + dist/EZIDINET-0.1.0.AppImage
```
`npm run bundle` builds `bundle/`: API (tsc + esbuild), demo seed, SQL migrations, Prisma client with Windows and
Linux engines, Next.js standalone server (`/api` proxied to `127.0.0.1:47210`). Ports: web 47211, API 47210, DB 47212.

## Tests (2026-11-27, Linux)
* `node scripts/test-runtime.mjs <dir> [shots]` — 8/8: first start, secrets, login + graph + EZID ID in a browser,
  API not on the network, phone sharing on/off, reset, restart keeps data, crash recovery.
* `xvfb-run node scripts/test-electron.mjs <dir>` — 5/5 with the sources **and** with the packaged
  `dist/linux-unpacked/EZIDINET` (`EZ_EXEC=…`): splash → window, login + graph, menu, external links blocked, clean quit.
* **Windows build: produced and checked (PE executable, Windows PostgreSQL and Prisma engines included), but not
  run on Windows here** — first real run on the owner's PC is the remaining test.
