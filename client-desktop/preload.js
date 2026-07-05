const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  lock: () => ipcRenderer.send('pc-lock'),
  unlock: () => ipcRenderer.send('pc-unlock'),
  log: (msg) => console.log('[Electron Native] ' + msg)
});
