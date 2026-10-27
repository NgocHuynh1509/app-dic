'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Storage is Electron safeStorage in production (Windows DPAPI).
function createDicFeatureLicense({ file, keyHash, storage }) {
  function validKey(input) {
    if (typeof input !== 'string' || input.length > 128) return false;
    const normalized = input.trim().toUpperCase();
    if (!/^PDIC-(?:[A-F0-9]{4}-){3}[A-F0-9]{4}$/.test(normalized)) return false;
    const hash = crypto.createHash('sha256').update(normalized.replace(/-/g, '')).digest();
    const expected = Buffer.from(keyHash, 'hex');
    return expected.length === hash.length && crypto.timingSafeEqual(hash, expected);
  }

  function status() {
    try {
      if (!storage.isEncryptionAvailable()) return { unlocked: false };
      return { unlocked: validKey(storage.decryptString(fs.readFileSync(file))) };
    } catch {
      return { unlocked: false };
    }
  }

  function activate(input) {
    if (!validKey(input)) return { ok: false, error: 'Key mở khóa Particle DIC không hợp lệ.' };
    if (!storage.isEncryptionAvailable()) {
      return { ok: false, error: 'Không thể lưu kích hoạt an toàn trên máy này. Vui lòng kiểm tra tài khoản Windows.' };
    }
    const temporary = `${file}.tmp`;
    try {
      const encrypted = storage.encryptString(input.trim().toUpperCase());
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(temporary, encrypted);
      fs.renameSync(temporary, file);
      const result = status();
      if (!result.unlocked) throw new Error('Activation verification failed');
      return { ok: true, ...result };
    } catch {
      return { ok: false, error: 'Không lưu được kích hoạt. Kiểm tra quyền ghi dữ liệu ứng dụng rồi thử lại.' };
    } finally {
      try { fs.unlinkSync(temporary); } catch { /* no temporary file */ }
    }
  }

  return { status, activate };
}

module.exports = { createDicFeatureLicense };
