const { contextBridge, ipcRenderer } = require('electron');

// Giao diện lấy token để gắn vào request gọi server DIC (localhost:8000)
contextBridge.exposeInMainWorld('dicAuth', {
  getToken: () => ipcRenderer.sendSync('dic:get-token'),
});

// Strain meter (ESP32 + HX711) qua USB Serial
contextBridge.exposeInMainWorld('strainAPI', {
  connect: () => ipcRenderer.invoke('strain:connect'),
  disconnect: () => ipcRenderer.invoke('strain:disconnect'),
  send: (cmd) => ipcRenderer.invoke('strain:send', cmd),
  onEvent: (cb) => {
    const h = (_e, msg) => cb(msg);
    ipcRenderer.on('strain:event', h);
    return () => ipcRenderer.removeListener('strain:event', h);
  },
});