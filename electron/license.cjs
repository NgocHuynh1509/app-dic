const { app, safeStorage } = require('electron');
const crypto = require('node:crypto');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const SERVER = process.env.LICENSE_SERVER || 'https://license-server-production-f8a1.up.railway.app'; // TODO: đổi sang URL server thật
const PUBLIC_KEY = fs.readFileSync(path.join(__dirname, 'public.pem'), 'utf8');

// Các mã lỗi khiến phiên bị xóa, bắt đăng nhập lại
const HARD_FAIL = new Set(['INVALID_SESSION', 'REVOKED', 'EXPIRED', 'INVALID_LICENSE']);

function machineId() {
  const mac = Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i && !i.internal && i.mac && i.mac !== '00:00:00:00:00:00')?.mac || '';
  const raw = [os.hostname(), os.platform(), os.arch(), os.cpus()[0]?.model || '', mac].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

const sessionFile = () => path.join(app.getPath('userData'), 'session.bin');

function saveSession(data) {
  const json = JSON.stringify(data);
  const buf = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : Buffer.from(json);
  fs.writeFileSync(sessionFile(), buf);
}

function loadSession() {
  try {
    const buf = fs.readFileSync(sessionFile());
    const json = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString();
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function clearSession() {
  try { fs.unlinkSync(sessionFile()); } catch { /* ignore */ }
}

// Kiểm tra chữ ký + đúng máy. offline=true: bỏ qua hạn 5 phút của token (dùng hạn license `lexp` thay thế)
function verifyToken(token, { offline = false } = {}) {
  try {
    const [body, sig] = String(token).split('.');
    const ok = crypto.verify(null, Buffer.from(body), PUBLIC_KEY, Buffer.from(sig, 'base64url'));
    if (!ok) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.mid !== machineId()) return null;
    if (!offline && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function post(endpoint, body) {
  try {
    const r = await fetch(SERVER + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  } catch {
    return { status: 0, data: { code: 'NO_NETWORK' } };
  }
}

// Đăng nhập: cần mạng. Lưu session để lần sau mở app không phải đăng nhập lại.
async function login({ email, password, licenseKey }) {
  const { status, data } = await post('/api/login', {
    email, password, licenseKey, machineId: machineId(), appVersion: app.getVersion(),
  });
  if (status === 200 && verifyToken(data.token)) {
    saveSession({ sessionId: data.sessionId, token: data.token });
    return { ok: true };
  }
  return { ok: false, reason: data.code || 'UNKNOWN', downloadUrl: data.downloadUrl };
}

// Gọi MỘT LẦN lúc mở app (không gọi định kỳ).
async function validate() {
  const s = loadSession();
  if (!s) return { ok: false, reason: 'LOGIN_REQUIRED' };

  const { status, data } = await post('/api/heartbeat', {
    sessionId: s.sessionId, machineId: machineId(), appVersion: app.getVersion(),
  });

  // Online: server xác nhận còn hợp lệ
  if (status === 200 && verifyToken(data.token)) {
    saveSession({ ...s, token: data.token });
    return { ok: true };
  }

  // Offline: dựa vào hạn license (lexp) nằm trong token đã ký
  if (status === 0) {
    const p = verifyToken(s.token, { offline: true });
    if (p && 'lexp' in p) {
      if (p.lexp === null || p.lexp > Date.now()) return { ok: true, offline: true };
      clearSession();
      return { ok: false, reason: 'EXPIRED' };
    }
    return { ok: false, reason: 'NO_NETWORK' }; // session cũ không có lexp -> cần mạng để đăng nhập lại
  }

  if (HARD_FAIL.has(data.code)) clearSession();
  return { ok: false, reason: data.code || 'UNKNOWN', downloadUrl: data.downloadUrl };
}

module.exports = { login, validate, clearSession };