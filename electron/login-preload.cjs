const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licenseApi', {
  login: (creds) => ipcRenderer.invoke('license:login', creds),
  retry: () => ipcRenderer.invoke('license:retry'),
  onReason: (cb) => ipcRenderer.on('license:reason', (_e, msg) => cb(msg)),
});
