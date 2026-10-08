const { app, BrowserWindow } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

// Chạy server Node (Express + WebSocket, cổng 8000) ngay trong tiến trình Electron.
// Tắt app thì server tắt theo; nếu cổng 8000 đã có server khác thì server/index.js tự bỏ qua.
async function startServer() {
  try {
    await import(pathToFileURL(path.join(__dirname, '../server/index.js')).href)
  } catch (err) {
    console.error('[server] không khởi động được:', err)
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Materials Analysis',
    icon: path.join(__dirname, '../build/icon.ico'), // icon ở taskbar
    autoHideMenuBar: true,
    titleBarStyle: 'hidden', // ẩn thanh tiêu đề gốc "my-react-app"
    titleBarOverlay: {
      color: '#f1f1f4', // trùng nền TitleBar
      symbolColor: '#032761', // màu 3 nút _ □ ✕
      height: 48, // trùng chiều cao TitleBar
    },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_DEV) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Chỉ cho mở một cửa sổ (mở lần 2 sẽ đưa cửa sổ cũ lên trước)
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(async () => {
    await startServer()
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}