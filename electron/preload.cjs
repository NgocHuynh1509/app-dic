const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dicFeature', {
  status: () => ipcRenderer.invoke('dicfeature:status'),
  activate: (key) => ipcRenderer.invoke('dicfeature:activate', key),
});

// Giao diện lấy token để gắn vào request gọi server DIC (localhost:8000)
contextBridge.exposeInMainWorld('dicAuth', {
  getToken: () => ipcRenderer.sendSync('dic:get-token'),
});

// Strain meter (ESP32 + HX711) qua USB Serial
contextBridge.exposeInMainWorld('strainAPI', {
  setChannels: (channels) => ipcRenderer.invoke('strain:channels', channels),
  connect: () => ipcRenderer.invoke('strain:connect'),
  disconnect: () => ipcRenderer.invoke('strain:disconnect'),
  send: (cmd) => ipcRenderer.invoke('strain:send', cmd),
  onEvent: (cb) => {
    const h = (_e, msg) => cb(msg);
    ipcRenderer.on('strain:event', h);
    return () => ipcRenderer.removeListener('strain:event', h);
  },
});

// Project / mẫu / dữ liệu đo lưu trong SQLite
contextBridge.exposeInMainWorld('dbAPI', {
  listProjects: () => ipcRenderer.invoke('db:listProjects'),
  createProject: (name) => ipcRenderer.invoke('db:createProject', name),
  listSpecimens: (projectId) => ipcRenderer.invoke('db:listSpecimens', projectId),
  createSpecimen: (input) => ipcRenderer.invoke('db:createSpecimen', input),
  saveRun: (specimenId, rows) => ipcRenderer.invoke('db:saveRun', specimenId, rows),

  exportPdf: (specimenId) => ipcRenderer.invoke('db:exportPdf', specimenId),
});

// Khoá license LOCAL (key 3 / 7 ngày) - dùng bởi LocalLicenseGate
contextBridge.exposeInMainWorld('localLicense', {
  status: () => ipcRenderer.invoke('locallicense:status'),
  activate: (key) => ipcRenderer.invoke('locallicense:activate', key),
  onChange: (cb) => {
    const h = (_e, st) => cb(st);
    ipcRenderer.on('locallicense:changed', h);
    return () => ipcRenderer.removeListener('locallicense:changed', h);
  },
});