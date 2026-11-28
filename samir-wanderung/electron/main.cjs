// SSBN desktop app: runs the full server (API + built PWA) inside Electron on a private
// 127.0.0.1 port and shows it in a sandboxed window. Data (SQLite, media) lives in the user profile.
const { app, BrowserWindow, session, shell, Menu, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
process.env.PORT = '0';
process.env.HOST = '127.0.0.1';
process.env.DIST_DIR = path.join(ROOT, 'dist');
process.env.DATA_DIR = path.join(app.getPath('userData'), 'data');

if (!app.requestSingleInstanceLock()) app.quit();
let win = null;

async function createWindow() {
  // Provider requests from the embedded server use Chromium's network stack (system proxy, OS certificates).
  globalThis.fetch = (url, opts) => net.fetch(url, opts);
  const { ready } = await import(pathToFileURL(path.join(ROOT, 'server', 'index.mjs')).href);
  const port = await ready;
  const origin = `http://127.0.0.1:${port}`;

  // Only grant what the app needs, and only to our own origin.
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, details) => {
    const ok = (details.requestingUrl || '').startsWith(origin) && ['geolocation', 'fullscreen', 'clipboard-sanitized-write', 'notifications'].includes(perm);
    cb(ok);
  });

  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 380, minHeight: 600, backgroundColor: '#0b0f12', title: 'SSBN',
    icon: path.join(ROOT, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  // External links open in the system browser; the window never navigates away from the app.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origin)) { e.preventDefault(); shell.openExternal(url); } });
  await win.loadURL(origin);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
