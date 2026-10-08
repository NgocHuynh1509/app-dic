const { app, safeStorage } = require('electron');
const crypto = require('node:crypto');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const SERVER = process.env.LICENSE_SERVER || 'https://license.example.com'; // TODO: đổi sang URL server thật
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

// Kiểm tra chữ ký + hạn + đúng máy
function verifyToken(token) {
  try {
    const [body, sig] = String(token).split('.');
    const ok = crypto.verify(null, Buffer.from(body), PUBLIC_KEY, Buffer.from(sig, 'base64url'));
    if (!ok) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now() || payload.mid !== machineId()) return null;
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

// Gọi khi khởi động và theo định kỳ. Bắt buộc có mạng.
async function validate() {
  const s = loadSession();
  if (!s) return { ok: false, reason: 'LOGIN_REQUIRED' };

  const { status, data } = await post('/api/heartbeat', {
    sessionId: s.sessionId, machineId: machineId(), appVersion: app.getVersion(),
  });

  if (status === 200 && verifyToken(data.token)) {
    saveSession({ ...s, token: data.token });
    return { ok: true };
  }
  if (HARD_FAIL.has(data.code)) clearSession();
  return { ok: false, reason: data.code || 'UNKNOWN', downloadUrl: data.downloadUrl };
}

// Dùng trong lúc app đang chạy: mất mạng ngắn vẫn cho chạy tới khi token cũ hết hạn
async function heartbeat() {
  const res = await validate();
  if (res.ok) return res;
  if (res.reason === 'NO_NETWORK') {
    const s = loadSession();
    if (s && verifyToken(s.token)) return { ok: true, offline: true };
  }
  return res;
}

module.exports = { login, validate, heartbeat, clearSession };
