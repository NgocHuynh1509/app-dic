'use strict';
/**
 * Khoá license local (offline) cho Electron main process.
 *  - Key 3 ngày / 7 ngày, chỉ lưu HASH của key trong license-keys.json.
 *  - Trạng thái lưu ở 2 nơi (userData + ProgramData), ký HMAC, gắn với MachineGuid.
 *  - Chống tua ngày: lastUsed chỉ tăng; nếu now < lastUsed - dung sai => khoá.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { app } = require('electron');
const { SALT, APP_SECRET } = require('./local-license-config.cjs');

const DAY_MS = 24 * 60 * 60 * 1000;
const TOLERANCE_MS = 2 * 60 * 1000;   // dung sai lệch đồng hồ (NTP sync, v.v.)
const HEARTBEAT_MS = 60 * 1000;       // cập nhật lastUsed mỗi phút khi app đang chạy

let KEYS = {};
try { KEYS = require('./local-license-keys.json'); } catch { KEYS = {}; }

// ---------- helpers ----------
let _machineId = null;
function machineId() {
  if (_machineId) return _machineId;
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
        { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
      );
      const m = out.match(/MachineGuid\s+REG_SZ\s+(\S+)/);
      if (m) return (_machineId = m[1]);
    }
  } catch { /* fallthrough */ }
  return (_machineId = os.hostname());
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hmac = (s) =>
  crypto.createHmac('sha256', `${APP_SECRET}|${machineId()}`).update(s).digest('hex');

function normalizeKey(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
const hashKey = (normalized) => sha256(SALT + normalized);

function storePaths() {
  const p1 = path.join(app.getPath('userData'), 'local-license.dat');
  const base = process.env.PROGRAMDATA || process.env.ALLUSERSPROFILE || os.homedir();
  const p2 = path.join(base, 'MyReactApp', 'sys-local.dat');
  return [p1, p2];
}

function readStore(p) {
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (typeof raw.data !== 'string' || raw.sig !== hmac(raw.data)) return { corrupt: true };
    return { data: JSON.parse(raw.data) };
  } catch (e) {
    return e && e.code === 'ENOENT' ? null : { corrupt: true };
  }
}

function writeStore(p, state) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const data = JSON.stringify(state);
    fs.writeFileSync(p, JSON.stringify({ data, sig: hmac(data) }));
  } catch { /* thư mục không ghi được -> bỏ qua, còn store còn lại */ }
}

const emptyState = () => ({ used: [], active: null, lastUsed: 0, history: [] });

function load() {
  const results = storePaths().map(readStore);
  const valid = results.filter((r) => r && r.data).map((r) => r.data);
  const anyCorrupt = results.some((r) => r && r.corrupt);

  // Cả hai file đều có nhưng hỏng/bị sửa -> coi là gian lận.
  if (!valid.length && anyCorrupt) return { state: emptyState(), forcedTamper: true };
  if (!valid.length) return { state: emptyState(), forcedTamper: false };

  // Gộp: lấy bản có lastUsed lớn nhất, hợp used, lastUsed = max.
  valid.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  // Lịch sử kích hoạt: gộp theo hash; bản cũ chưa có history thì lấy từ active.
  const hist = new Map();
  valid.forEach((v) => {
    (v.history || []).forEach((h) => hist.set(h.hash, h));
    if (v.active && !hist.has(v.active.hash)) hist.set(v.active.hash, { ...v.active });
  });
  const merged = {
    ...valid[0],
    used: [...new Set(valid.flatMap((v) => v.used || []))],
    lastUsed: Math.max(...valid.map((v) => v.lastUsed || 0)),
    history: [...hist.values()].sort((a, b) => a.activatedAt - b.activatedAt),
  };
  return { state: merged, forcedTamper: false };
}

function save(state) {
  storePaths().forEach((p) => writeStore(p, state));
}

function evaluate(state, now, forcedTamper) {
  if (forcedTamper) return { state: 'tampered', reason: 'file' };
  if (now < state.lastUsed - TOLERANCE_MS) {
    return { state: 'tampered', reason: 'clock', lastUsed: state.lastUsed };
  }
  if (!state.active) return { state: 'none' };
  if (now >= state.active.expiresAt) {
    return { state: 'expired', expiresAt: state.active.expiresAt };
  }
  return {
    state: 'active',
    type: `${state.active.days}d`,
    days: state.active.days,
    daysLeft: Math.ceil((state.active.expiresAt - now) / DAY_MS),
    expiresAt: state.active.expiresAt,
  };
}

// ---------- public API ----------
/** Cập nhật lastUsed (chỉ tăng) rồi trả trạng thái. */
function getStatus() {
  const { state, forcedTamper } = load();
  const now = Date.now();
  const st = evaluate(state, now, forcedTamper);
  if (st.state !== 'tampered') {
    state.lastUsed = Math.max(state.lastUsed || 0, now);
    save(state); // luôn ghi lại để khôi phục store bị xoá + cập nhật lastUsed
  }
  return st;
}

function activate(input) {
  const key = normalizeKey(input);
  if (key.length < 10) return { ok: false, error: 'Key không hợp lệ.' };

  const { state, forcedTamper } = load();
  const now = Date.now();
  const cur = evaluate(state, now, forcedTamper);
  if (cur.state === 'tampered') {
    return { ok: false, error: 'Phát hiện chỉnh sửa đồng hồ/dữ liệu license.', status: cur };
  }
  if (cur.state === 'active') {
    return { ok: false, error: 'Đang có key còn hạn, không thể kích hoạt key mới.', status: cur };
  }

  const hash = hashKey(key);
  const days = KEYS[hash];
  if (!days) return { ok: false, error: 'Key không hợp lệ.' };
  if (state.used.includes(hash)) return { ok: false, error: 'Key này đã được sử dụng.' };

  state.used.push(hash);
  state.active = { hash, days, activatedAt: now, expiresAt: now + days * DAY_MS };
  state.history = [...(state.history || []), { ...state.active }];
  state.lastUsed = Math.max(state.lastUsed || 0, now);
  save(state);
  return { ok: true, status: evaluate(state, now, false) };
}

let timer = null;
/** onInvalid(status) được gọi khi trạng thái không còn 'active'. */
function startHeartbeat(onInvalid) {
  if (timer) return;
  timer = setInterval(() => {
    const st = getStatus();
    if (st.state !== 'active' && typeof onInvalid === 'function') onInvalid(st);
  }, HEARTBEAT_MS);
  timer.unref?.();
}

/** Lịch sử kích hoạt trên máy này (chỉ hash, số ngày, thời điểm kích hoạt / hết hạn). */
function listHistory() {
  const { state } = load();
  return (state.history || []).map((h) => ({
    keyHash: h.hash.slice(0, 12),
    days: h.days,
    activatedAt: h.activatedAt,
    expiresAt: h.expiresAt,
    current: !!(state.active && state.active.hash === h.hash),
  }));
}

/** Tra cứu 1 key: hợp lệ không, đã dùng trên máy này chưa, kích hoạt/hết hạn lúc nào. */
function checkKey(input) {
  const hash = hashKey(normalizeKey(input));
  const days = KEYS[hash] || null;
  const { state, forcedTamper } = load();
  const rec = (state.history || []).find((h) => h.hash === hash) || null;
  return {
    validKey: !!days,
    days,
    usedOnThisMachine: state.used.includes(hash),
    current: !!(state.active && state.active.hash === hash),
    activatedAt: rec ? rec.activatedAt : null,
    expiresAt: rec ? rec.expiresAt : null,
    dataTampered: forcedTamper,
  };
}

module.exports = { listHistory, checkKey, getStatus, activate, startHeartbeat, _internal: { hashKey, normalizeKey, load, save, TOLERANCE_MS } };
