'use strict';
// ĐỔI 2 GIÁ TRỊ NÀY thành chuỗi ngẫu nhiên của bạn TRƯỚC KHI chạy gen-keys.
// Đổi sau khi đã phát key => toàn bộ key cũ + file license đã lưu đều mất hiệu lực.
module.exports = {
  SALT: 'DOI-TOI-CHUOI-NGAU-NHIEN-SO-1',      // dùng để băm key
  APP_SECRET: 'DOI-TOI-CHUOI-NGAU-NHIEN-SO-2', // dùng để ký file license trên máy
};
