// Exposes only a flag so the web app knows it runs in the desktop shell.
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('swDesktop', { platform: process.platform, version: '0.1.0' });
