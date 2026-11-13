// Electron main process. Renderer is sandboxed: no Node access, only the preload API below.
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const PORT = process.env.IKTISHAFAT_PORT || '8765'
const DEV_URL = process.env.VITE_DEV_URL
let backend = null

function startBackend() {
  if (process.env.IKTISHAFAT_EXTERNAL_BACKEND === '1') return
  const root = path.join(__dirname, '..', '..', 'backend')
  const venvPy = process.platform === 'win32'
    ? path.join(root, '.venv', 'Scripts', 'python.exe') : path.join(root, '.venv', 'bin', 'python')
  const py = require('fs').existsSync(venvPy) ? venvPy : (process.platform === 'win32' ? 'python' : 'python3')
  backend = spawn(py, ['-m', 'app.main'], { cwd: root, env: { ...process.env, IKTISHAFAT_PORT: PORT }, windowsHide: true })
  backend.stderr.on('data', d => console.error('[backend]', d.toString()))
  backend.on('exit', c => console.log('[backend] exited', c))
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, backgroundColor: '#04070F', title: 'IKTISHAFAT AI STUDIO',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://') && !(DEV_URL && url.startsWith(DEV_URL))) e.preventDefault() })
  DEV_URL ? win.loadURL(DEV_URL) : win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

ipcMain.handle('pick-file', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openFile'],
    filters: [{ name: 'Media', extensions: ['mp4', 'mov', 'mkv', 'avi', 'mxf', 'webm', 'wav', 'mp3', 'aac', 'flac', 'm4a', 'jpg', 'jpeg', 'png', 'webp', 'srt', 'vtt'] }] })
  return r.canceled ? null : r.filePaths[0]
})

app.whenReady().then(() => { startBackend(); createWindow() })
app.on('before-quit', () => { if (backend) backend.kill() })
app.on('window-all-closed', () => app.quit())
