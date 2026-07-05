const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  lock: () => ipcRenderer.send('pc-lock'),
  unlock: () => ipcRenderer.send('pc-unlock'),
  exitApp: () => ipcRenderer.send('app-exit'),
  log: (msg) => console.log('[Electron Native] ' + msg)
});
