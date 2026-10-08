cài môi trường: npm install

run WEB: npm run dev


run app: npm run electron:dev

build app: npm run electron:build


## Tab "Particle DIC" (Digital Image Correlation)

Tab này được ghép từ project `realtime-particle-dic` (React + Node). Camera và xử lý ảnh
(OpenCV.js/WASM) chạy trong giao diện; server Node (`server/`) lưu phiên đo, Force/Temperature
và xuất CSV.

- `src/components/ParticleDIC/` – giao diện + lõi DIC (`core/`: detector, tracker, field, heatmap, camera...)
- `server/` – Express + WebSocket (cổng 8000)
- Mọi tham số DIC nằm trong `src/components/ParticleDIC/core/config.js`

```bash
npm run dic:dev        # server :8000 + giao diện :5173 -> mở tab "Particle DIC"
npm run dic:server     # chỉ chạy server (dùng cùng electron:dev / build)
npm run dic:selftest   # kiểm tra lõi DIC bằng ảnh tổng hợp (không cần camera)
```

Khi chạy Electron bản build (`file://`), giao diện tự gọi `http://localhost:8000`; đổi bằng biến
`VITE_DIC_SERVER` nếu server ở máy khác. Cần chạy `npm run dic:server` trước để tab hoạt động đầy đủ.
