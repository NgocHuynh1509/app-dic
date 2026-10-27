const { app, BrowserWindow, ipcMain, safeStorage } = require('electron')
const path = require('path')
const crypto = require('crypto')
const { pathToFileURL } = require('url')
const { startLicenseGate } = require('./license-gate.cjs') // khoá ONLINE (giữ nguyên, bị vô hiệu khi LICENSE_MODE = 'local')
const { StrainSerial } = require('./strainSerial.cjs')
const localLicense = require('./local-license.cjs') // khoá LOCAL (key 3 / 7 ngày, offline)
const { createDicFeatureLicense } = require('./dic-feature-license.cjs')
const { keyHash: dicKeyHash } = require('./dic-feature-key.json')
const { initDatabase } = require('./database.cjs') // SQLite: project / mẫu / dữ liệu đo

// Feature entitlement is separate from the application license and serial access.
process.env.DIC_FEATURE_UNLOCKED = '0'
let dicFeatureLicense = null
function getDicFeatureLicense() {
  if (!dicFeatureLicense) {
    dicFeatureLicense = createDicFeatureLicense({
      file: path.join(app.getPath('userData'), 'particle-dic.bin'),
      keyHash: dicKeyHash,
      storage: safeStorage,
    })
  }
  return dicFeatureLicense
}

function refreshDicFeature() {
  const status = getDicFeatureLicense().status()
  process.env.DIC_FEATURE_UNLOCKED = status.unlocked ? '1' : '0'
  return status
}

// Chọn cơ chế khoá:
//   'local'  : key offline 3/7 ngày + chống tua đồng hồ (mặc định)
//   'online' : đăng nhập + license server như cũ (license-gate.cjs)
// Muốn quay lại online: đổi 'local' thành 'online' ở dòng dưới (hoặc đặt biến môi trường LICENSE_MODE=online).
const LICENSE_MODE = process.env.LICENSE_MODE || 'local'

let mainWindow = null
let serverStarted = false

// ---------- Strain meter (ESP32 + HX711) ----------
const strain = new StrainSerial()

// Gửi sự kiện tới cửa sổ chính hiện tại (nếu còn)
const pushStrain = (type) => (payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('strain:event', { type, payload })
  }
}
strain.on('status', pushStrain('status'))
strain.on('hx', pushStrain('hx'))
strain.on('data', pushStrain('data'))
strain.on('log', pushStrain('log'))
strain.on('reset', pushStrain('reset'))

// Chỉ nhận lệnh từ cửa sổ chính
const fromMain = (e) => mainWindow && e.sender === mainWindow.webContents

ipcMain.handle('dicfeature:status', (e) => {
  if (!fromMain(e) || !process.env.DIC_LOCAL_TOKEN) return { unlocked: false }
  return refreshDicFeature()
})

ipcMain.handle('dicfeature:activate', (e, key) => {
  if (!fromMain(e) || !process.env.DIC_LOCAL_TOKEN) {
    return { ok: false, error: 'Cần kích hoạt ứng dụng trước khi mở khóa Particle DIC.' }
  }
  const result = getDicFeatureLicense().activate(key)
  refreshDicFeature()
  return result
})

ipcMain.handle('strain:connect', (e) => {
  if (!fromMain(e)) return false
  strain.start()
  return true
})
ipcMain.handle('strain:disconnect', async (e) => {
  if (!fromMain(e)) return
  await strain.stop()
})
ipcMain.handle('strain:send', (e, cmd) => (fromMain(e) ? strain.send(cmd) : false))
ipcMain.handle('strain:channels', (e, channels) => (fromMain(e) ? strain.setEnabledChannels(channels) : false))

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
    strain.stop() // đóng cổng COM khi cửa sổ đóng
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
    mainWindow && e.sender === mainWindow.webContents && process.env.DIC_FEATURE_UNLOCKED === '1'
      ? process.env.DIC_LOCAL_TOKEN || '' : ''
})

// ===================== KHOÁ ONLINE (cũ - giữ nguyên) =====================
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
  strain.stop()
  if (mainWindow) {
    mainWindow.destroy()
    mainWindow = null
  }
}

// ===================== KHOÁ LOCAL (mới) =====================
// Active  -> cấp token + chạy server DIC. Không active -> thu hồi token, dừng strain.
// Cửa sổ vẫn mở để màn hình nhập key (LocalLicenseGate) hiển thị.
async function applyLocalLicense(st) {
  if (st.state === 'active') {
    if (!process.env.DIC_LOCAL_TOKEN) {
      if (app.isPackaged) delete process.env.DIC_AUTH_DISABLED // bản build không cho tắt xác thực
      process.env.DIC_LOCAL_TOKEN = crypto.randomBytes(32).toString('hex')
    }
    await startServer()
  } else {
    process.env.DIC_LOCAL_TOKEN = ''
    strain.stop()
  }
  return st
}

ipcMain.handle('locallicense:status', async (e) => {
  if (!fromMain(e)) return { state: 'none' }
  // Chế độ online: gate local tự cho qua (việc kiểm tra do license-gate.cjs lo)
  if (LICENSE_MODE !== 'local') return { state: 'active', type: 'online' }
  return applyLocalLicense(localLicense.getStatus())
})

ipcMain.handle('locallicense:activate', async (e, key) => {
  if (!fromMain(e)) return { ok: false, error: 'Yêu cầu không hợp lệ.' }
  if (LICENSE_MODE !== 'local') return { ok: false, error: 'Đang dùng chế độ license online.' }
  const r = localLicense.activate(key)
  if (r.ok) await applyLocalLicense(r.status) // cấp token trước khi giao diện mở khoá
  return r
})

async function startLocalLicense() {
  await applyLocalLicense(localLicense.getStatus())
  createWindow()
  // Mỗi phút cập nhật lastUsed; nếu hết hạn / bị tua đồng hồ -> thu hồi token + báo giao diện
  localLicense.startHeartbeat(async (st) => {
    await applyLocalLicense(st)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('locallicense:changed', st)
    }
  })
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
    refreshDicFeature()
    // DB chỉ cho cửa sổ chính truy cập và chỉ khi license đang active (token còn hiệu lực)
    initDatabase({ allow: (e) => !!fromMain(e) && !!process.env.DIC_LOCAL_TOKEN })
    if (LICENSE_MODE === 'online') {
      startLicenseGate({ createMainWindow, closeMainWindows })
    } else {
      startLocalLicense()
    }
  })

  app.on('before-quit', () => {
    strain.stop()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}