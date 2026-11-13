const { contextBridge, ipcRenderer } = require('electron')
// Minimal, explicit surface. No secrets, no generic IPC, no fs access exposed.
contextBridge.exposeInMainWorld('studio', {
  apiBase: `http://127.0.0.1:${process.env.IKTISHAFAT_PORT || '8765'}`,
  pickFile: () => ipcRenderer.invoke('pick-file'),
})
