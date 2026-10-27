'use strict';
/**
 * Tra cứu lịch sử kích hoạt KEY LOCAL trên CHÍNH MÁY này (file license gắn với MachineGuid).
 *   node scripts/check-key.cjs                     -> liệt kê toàn bộ lịch sử trên máy này
 *   node scripts/check-key.cjs D3-XXXX-XXXX-XXXX-XXXX   -> tra 1 key
 * Tuỳ chọn: --userData "<thư mục chứa local-license.dat>"  (mặc định tự tìm trong %APPDATA%)
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const args = process.argv.slice(2);
let userData = null;
const rest = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--userData') userData = args[++i];
  else rest.push(args[i]);
}

if (!userData) {
  const base = process.env.APPDATA;
  if (base && fs.existsSync(base)) {
    for (const d of fs.readdirSync(base)) {
      const dir = path.join(base, d);
      try { if (fs.existsSync(path.join(dir, 'local-license.dat'))) { userData = dir; break; } } catch { /* bỏ qua */ }
    }
  }
}
if (!userData) {
  console.error('Không tìm thấy local-license.dat. Dùng --userData "<thư mục>".');
  process.exit(1);
}

const origLoad = Module._load;
Module._load = function (req, ...r) {
  if (req === 'electron') return { app: { getPath: () => userData } };
  return origLoad.call(this, req, ...r);
};
const L = require(path.join(__dirname, '..', 'electron', 'local-license.cjs'));
const fmt = (t) => (t ? new Date(t).toLocaleString('vi-VN') : '-');

console.log('Thư mục dữ liệu:', userData);
if (rest[0]) {
  const r = L.checkKey(rest[0]);
  console.log({
    'Key hợp lệ (có trong danh sách)': r.validKey,
    'Số ngày': r.days,
    'Đã dùng trên máy này': r.usedOnThisMachine,
    'Đang là key hiện tại': r.current,
    'Kích hoạt lúc': fmt(r.activatedAt),
    'Hết hạn lúc': fmt(r.expiresAt),
    'Dữ liệu bị sửa': r.dataTampered,
  });
} else {
  const h = L.listHistory();
  if (!h.length) console.log('Chưa có lịch sử kích hoạt.');
  h.forEach((x, i) => console.log(`${i + 1}. [${x.keyHash}…] ${x.days} ngày | kích hoạt ${fmt(x.activatedAt)} | hết hạn ${fmt(x.expiresAt)}${x.current ? ' | (hiện tại)' : ''}`));
}
