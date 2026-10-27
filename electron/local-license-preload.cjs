'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('localLicense', {
  status: () => ipcRenderer.invoke('locallicense:status'),
  activate: (key) => ipcRenderer.invoke('locallicense:activate', key),
  onChange: (cb) => {
    const handler = (_e, st) => cb(st);
    ipcRenderer.on('locallicense:changed', handler);
    return () => ipcRenderer.removeListener('locallicense:changed', handler);
  },
});
