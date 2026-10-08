const { BrowserWindow, ipcMain, dialog, shell, app } = require('electron');
const path = require('node:path');
const license = require('./license.cjs');

const HEARTBEAT_MS = 60 * 1000;

const MESSAGES = {
  LOGIN_REQUIRED: 'Vui lòng đăng nhập để sử dụng phần mềm.',
  NO_NETWORK: 'Không kết nối được máy chủ. Phần mềm yêu cầu có mạng — kiểm tra kết nối rồi bấm "Thử lại".',
  BAD_CREDENTIALS: 'Sai email hoặc mật khẩu.',
  INVALID_LICENSE: 'License key không hợp lệ.',
  REVOKED: 'License đã bị khóa. Liên hệ nhà cung cấp.',
  EXPIRED: 'License đã hết hạn.',
  DEVICE_LIMIT: 'License đã đạt số thiết bị tối đa.',
  INVALID_SESSION: 'Phiên đăng nhập không còn hiệu lực, vui lòng đăng nhập lại.',
  TOO_MANY_REQUESTS: 'Thử quá nhiều lần, vui lòng đợi ít phút.',
  UNKNOWN: 'Có lỗi xảy ra, vui lòng thử lại.',
};

let loginWin = null;
let heartbeatTimer = null;
let mainStarted = false;
let opts = null;

function showLogin(reason) {
  const msg = MESSAGES[reason] || MESSAGES.UNKNOWN;
  if (loginWin) {
    loginWin.webContents.send('license:reason', msg);
    loginWin.show();
    return;
  }
  loginWin = new BrowserWindow({
    width: 420,
    height: 540,
    resizable: false,
    autoHideMenuBar: true,
    title: 'Đăng nhập',
    webPreferences: {
      preload: path.join(__dirname, 'login-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  loginWin.loadFile(path.join(__dirname, 'login.html'));
  loginWin.webContents.once('did-finish-load', () => loginWin?.webContents.send('license:reason', msg));
  loginWin.on('closed', () => { loginWin = null; });
}

function handleFail(res) {
  if (res.reason === 'UPDATE_REQUIRED') {
    dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Cần cập nhật',
      message: 'Phiên bản này không còn được hỗ trợ. Vui lòng cài bản mới để tiếp tục.',
      buttons: ['Tải bản mới'],
    });
    if (res.downloadUrl) shell.openExternal(res.downloadUrl);
    app.quit();
    return;
  }
  showLogin(res.reason);
}

function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

// Khóa từ xa: đóng cửa sổ chính, quay lại màn hình đăng nhập (hoặc thoát nếu bắt update)
function lock(res) {
  stopHeartbeat();
  mainStarted = false;
  handleFail(res); // mở login trước để app không tự thoát khi hết cửa sổ
  opts.closeMainWindows();
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(async () => {
    const res = await license.heartbeat();
    if (!res.ok) lock(res);
  }, HEARTBEAT_MS);
}

async function proceed(res) {
  if (!res.ok) return handleFail(res);
  if (loginWin) loginWin.close();
  if (!mainStarted) {
    mainStarted = true;
    opts.createMainWindow();
  }
  startHeartbeat();
}

/**
 * @param {{ createMainWindow: () => void, closeMainWindows: () => void }} options
 */
async function startLicenseGate(options) {
  opts = options;

  ipcMain.handle('license:login', async (_e, creds) => {
    const res = await license.login(creds);
    if (res.ok) await proceed(res);
    else if (res.reason === 'UPDATE_REQUIRED') handleFail(res);
    return res.ok ? { ok: true } : { ok: false, message: MESSAGES[res.reason] || MESSAGES.UNKNOWN, reason: res.reason };
  });

  ipcMain.handle('license:retry', async () => {
    await proceed(await license.validate());
  });

  await proceed(await license.validate());
}

module.exports = { startLicenseGate };
