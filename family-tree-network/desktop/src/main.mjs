// EZIDINET Desktop — Electron main process.
// Starts the local runtime (database + API + web server) and shows the web app in a window.
import { app, BrowserWindow, Menu, dialog, shell } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTS, Runtime } from './runtime.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, '..');
const bundleDir = app.isPackaged ? join(process.resourcesPath, 'bundle') : join(appRoot, 'bundle');
const iconPath = join(here, 'icon.png');
const LOCAL_ORIGIN = `http://127.0.0.1:${PORTS.web}`;

let runtime;
let mainWindow;
let splash;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit(); // a second copy would fight over the database and ports
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(boot);
}

const secureWebPreferences = { contextIsolation: true, nodeIntegration: false, sandbox: true };

function showSplash() {
  splash = new BrowserWindow({
    width: 420, height: 260, frame: false, resizable: false, show: true, icon: iconPath,
    backgroundColor: '#F3F0E9', webPreferences: secureWebPreferences,
  });
  splash.loadFile(join(here, 'splash.html'));
}

async function boot() {
  showSplash();
  runtime = new Runtime({
    dataDir: join(app.getPath('userData'), 'data'),
    bundleDir,
    nodeExec: process.execPath, // Electron's own Node.js (ELECTRON_RUN_AS_NODE=1 is set for children)
    log: (m) => console.log(m),
  });
  try {
    await runtime.start();
  } catch (e) {
    if (splash) splash.destroy();
    dialog.showErrorBox(
      'EZIDINET could not start / تعذّر تشغيل EZIDINET',
      `${e?.message ?? e}\n\nLogs / السجلات: ${join(app.getPath('userData'), 'data', 'logs')}`,
    );
    await runtime.stop().catch(() => {});
    app.exit(1);
    return;
  }
  createMainWindow();
  buildMenu();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 600, show: false, icon: iconPath,
    title: 'EZIDINET', backgroundColor: '#F3F0E9', webPreferences: secureWebPreferences,
  });
  // Stay inside the local EZIDINET app; anything else opens in the normal browser (https only).
  const isLocal = (url) => url.startsWith(`${LOCAL_ORIGIN}/`) || url === LOCAL_ORIGIN;
  const openOutside = (url) => { if (url.startsWith('https://')) shell.openExternal(url); };
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: 'deny' }; });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isLocal(url)) { event.preventDefault(); openOutside(url); }
  });
  // No camera/microphone/location etc. in the desktop shell for now.
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  mainWindow.once('ready-to-show', () => {
    if (splash) { splash.destroy(); splash = null; }
    mainWindow.show();
  });
  mainWindow.loadURL(`${LOCAL_ORIGIN}/`);
}

function phoneDialog() {
  const { lan } = runtime.urls();
  const body = lan.length
    ? `Enter this address in the EZIDINET Android app (phone on the same Wi-Fi):\n\n${lan.join('\n')}\n\n` +
      'If Windows asks, allow access on PRIVATE networks only.\n\n' +
      `اكتب هذا العنوان في تطبيق EZIDINET على الهاتف (على نفس شبكة الواي فاي):\n\n${lan.join('\n')}\n\n` +
      'إذا سأل Windows، اسمح بالوصول على الشبكات الخاصة فقط.'
    : runtime.cfg.shareOnLan
      ? 'No Wi-Fi/LAN address found. Connect the computer to Wi-Fi.\nلم يُعثر على عنوان شبكة. صِل الحاسوب بالواي فاي.'
      : 'Phone sharing is off. Turn on "Share with phone" in the EZIDINET menu.\nالمشاركة مع الهاتف متوقفة. فعّلها من قائمة EZIDINET.';
  dialog.showMessageBox(mainWindow, { type: 'info', title: 'Phone / الهاتف', message: 'EZIDINET — Phone', detail: body });
}

function buildMenu() {
  const template = [
    {
      label: 'EZIDINET',
      submenu: [
        {
          label: 'Share with phone (same Wi-Fi) — مشاركة مع الهاتف',
          type: 'checkbox',
          checked: Boolean(runtime.cfg.shareOnLan),
          click: async (item) => {
            await runtime.setShareOnLan(item.checked);
            mainWindow.reload();
            if (item.checked) phoneDialog();
          },
        },
        { label: 'Phone address… — عنوان الهاتف', click: phoneDialog },
        { type: 'separator' },
        {
          label: 'Reset demo data… — إعادة البيانات التجريبية',
          click: async () => {
            const { response } = await dialog.showMessageBox(mainWindow, {
              type: 'warning', buttons: ['Cancel / إلغاء', 'Reset / إعادة'], defaultId: 0, cancelId: 0,
              message: 'Reset all local data to the demo network?',
              detail: 'Everything you added on this computer will be deleted.\nسيُحذف كل ما أضفته على هذا الحاسوب.',
            });
            if (response === 1) { await runtime.resetDemo(); mainWindow.reload(); }
          },
        },
        { label: 'Open data folder — مجلد البيانات', click: () => shell.openPath(join(app.getPath('userData'), 'data')) },
        { type: 'separator' },
        { role: 'quit', label: 'Quit — خروج' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Stop database, API and web server before the app exits.
app.on('before-quit', (event) => {
  if (quitting || !runtime) return;
  event.preventDefault();
  quitting = true;
  runtime.stop().finally(() => app.exit(0));
});
app.on('window-all-closed', () => app.quit());
