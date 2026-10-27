'use strict';
/**
 * Tạo 10 key 3 ngày + 10 key 7 ngày.
 *   node scripts/gen-keys.cjs           -> tạo mới (từ chối nếu đã có local-license-keys.json)
 *   node scripts/gen-keys.cjs --force   -> tạo lại (key cũ đã phát sẽ MẤT hiệu lực)
 * Output:
 *   keys-plain.txt               key gốc để phát cho người dùng (đã .gitignore, KHÔNG commit)
 *   electron/local-license-keys.json   chỉ chứa HASH -> số ngày (được đóng gói vào app)
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { SALT } = require('../electron/local-license-config.cjs');

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'electron', 'local-license-keys.json');
const OUT_TXT = path.join(ROOT, 'keys-plain.txt');
const PLAN = [{ days: 3, prefix: 'D3', count: 10 }, { days: 7, prefix: 'D7', count: 10 }];

if (fs.existsSync(OUT_JSON) && !process.argv.includes('--force')) {
  console.error('local-license-keys.json đã tồn tại. Dùng --force nếu thật sự muốn tạo lại.');
  process.exit(1);
}

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 ký tự, bỏ I/L/O/0/1
function rand(n) {
  let s = '';
  while (s.length < n) {
    const b = crypto.randomBytes(1)[0];
    if (b < 248) s += ALPHA[b % 31]; // 248 = 31*8 -> không lệch phân phối
  }
  return s;
}

const hashes = {};
const lines = [];
for (const { days, prefix, count } of PLAN) {
  lines.push(`# Key ${days} ngày`);
  for (let i = 0; i < count; i++) {
    const body = rand(16);
    const normalized = prefix + body;
    const shown = `${prefix}-${body.match(/.{4}/g).join('-')}`;
    hashes[crypto.createHash('sha256').update(SALT + normalized).digest('hex')] = days;
    lines.push(shown);
  }
  lines.push('');
}

fs.writeFileSync(OUT_JSON, JSON.stringify(hashes, null, 2));
fs.writeFileSync(OUT_TXT, lines.join('\n'));
console.log(`Đã tạo ${Object.keys(hashes).length} key -> keys-plain.txt, electron/local-license-keys.json`);
