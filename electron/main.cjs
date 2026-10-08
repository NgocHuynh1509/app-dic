const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const crypto = require('crypto')
const { pathToFileURL } = require('url')
const { startLicenseGate } = require('./license-gate.cjs')

let mainWindow = null
let serverStarted = false

// Chạy server Node (Express + WebSocket, cổng 8000) ngay trong tiến trình Electron.
// Chỉ khởi động SAU KHI license hợp lệ. Tắt app thì server tắt theo;
// nếu cổng 8000 đã có server khác thì server/index.js tự bỏ qua.
async function startServer() {
  if (serverStarted) return
  serverStarted = true
  try {
    await import(pathToFileURL(path.join(__dirname, '../server/index.js')).href)
  } catch (err) {
    console.error('[server] không khởi động được:', err)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !!process.env.ELECTRON_DEV, // bản build: tắt DevTools
    },
  })

  // Không cho trang mở cửa sổ mới / điều hướng ra ngoài
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.ELECTRON_DEV) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Giao diện (cửa sổ chính) xin token để gọi server DIC; cửa sổ khác nhận chuỗi rỗng
ipcMain.on('dic:get-token', (e) => {
  e.returnValue =
    mainWindow && e.sender === mainWindow.webContents ? process.env.DIC_LOCAL_TOKEN || '' : ''
})

// Được license gate gọi khi đăng nhập / kiểm tra license thành công
async function createMainWindow() {
  if (app.isPackaged) delete process.env.DIC_AUTH_DISABLED // bản build không cho tắt xác thực
  process.env.DIC_LOCAL_TOKEN = crypto.randomBytes(32).toString('hex')
  await startServer()
  createWindow()
}

// Được license gate gọi khi bị khóa từ xa: thu hồi token nên server DIC từ chối mọi request
function closeMainWindows() {
  process.env.DIC_LOCAL_TOKEN = ''
  if (mainWindow) {
    mainWindow.destroy()
    mainWindow = null
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

  app.whenReady().then(() => {
    startLicenseGate({ createMainWindow, closeMainWindows })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
