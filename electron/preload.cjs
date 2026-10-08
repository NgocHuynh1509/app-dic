const { contextBridge, ipcRenderer } = require('electron');

// Giao diện lấy token để gắn vào request gọi server DIC (localhost:8000)
contextBridge.exposeInMainWorld('dicAuth', {
  getToken: () => ipcRenderer.sendSync('dic:get-token'),
});
