cài môi trường: npm install

run WEB: npm run dev


run app: npm run electron:dev

build app: npm run electron:build

## Mở khóa riêng tính năng Particle DIC

- Mở app desktop, kích hoạt license ứng dụng như trước, rồi chọn tab **Particle DIC**.
- Nhập key trong file `particle-dic-key.txt` tại thư mục gốc dự án. Đây là key riêng, không dùng key 3/7 ngày của ứng dụng.
- Chỉ cần nhập một lần. App lưu kích hoạt đã mã hóa bằng Electron `safeStorage` (Windows DPAPI) trong `particle-dic.bin` ở thư mục dữ liệu ứng dụng của tài khoản Windows hiện tại. Sau khi đóng/mở app, Particle DIC tự mở khóa.
- Key tính năng không có hạn riêng; license ứng dụng vẫn phải còn hiệu lực. Tài khoản Windows hoặc máy khác cần nhập key lại.
- Khi chưa mở khóa, tab hiển thị màn hình nhập key; camera và phiên đo chưa khởi tạo. Sau khi mở khóa, toàn bộ giao diện Particle DIC, các nút điều khiển, đồ thị, heatmap và xuất CSV giữ nguyên. Chuyển tab vẫn giữ phiên đo như trước.
- `particle-dic-key.txt` chứa key dành cho người quản lý, đã được loại khỏi Git và không nằm trong danh sách file đóng gói. Bản app chỉ mang hash kiểm tra trong `electron/dic-feature-key.json`.
- Chế độ web thuần hiển thị trạng thái khóa và hướng dẫn mở bản desktop; kích hoạt cần bộ lưu trữ an toàn của Electron.
- Kiểm tra logic khóa: `npm run dic:license:test`.

## Test & Recall: ESP32 + 3 HX711

App nhận qua USB Serial 115200 baud với firmware `sketch_oct24a.ino` (ESP32-S3 + W5500 V5), đồng thời vẫn nhận mạch một HX711 V3.

- Cắm USB, đóng Serial Monitor nếu đang giữ cổng COM, chạy `debug-preview.bat`, mở **Test & Recall → H5kT**, rồi bấm **START**.
- Mạch V5 được nhận bằng `DEVICE,STRAIN_METER_3HX711_W5500,V5`. Một frame là `DATA,sample_index,time_ms,raw1,delta1,raw2,delta2,raw3,delta3`; không cần thay firmware để gửi ba kênh qua USB.
- Biểu đồ mặc định có ba đường dữ liệu riêng: **HX1 · TOP đỏ**, **HX2 · MIDDLE xanh dương**, **HX3 · BOTTOM đen**. Mỗi đường chỉ lấy dữ liệu của đúng HX711 đó, không cộng/trung bình/ghép dữ liệu giữa kênh. Tích **Hiện Δ raw** để xem thêm raw nét đứt của chính từng kênh. Mạch V3 vẫn hiển thị raw và filtered như trước.
- **Live Data** hiển thị đồng thời ba cột HX1/HX2/HX3, gồm Raw, Δ, Filtered, Min/Max, số mẫu và thời gian riêng. **Strain / hiệu chuẩn** cũng có ba cột: strain, hệ số µε/count và đảo dấu riêng từng kênh. Đổi hệ số hoặc đảo dấu HX1 không đổi số liệu HX2/HX3. Không cần chọn kênh xem. Đảo trục Y chỉ đổi cách vẽ biểu đồ.
- START lấy mốc 0 độc lập từ 10 mẫu đầu mỗi kênh; EMA cũng độc lập. ZERO gửi lệnh tới ESP để zero cả ba HX711 theo firmware. STOP và CSV giữ nguyên; mỗi frame tạo ba dòng CSV, có thêm `channel` và `sample_index`. Số mẫu đếm theo frame, tức số mẫu trên mỗi kênh.
- Mất kết nối hoặc ESP khởi động lại sẽ dừng ghi, giữ kết quả cũ để xuất CSV. Bấm START cho phiên mới. Firmware chỉ gửi frame khi **cả ba HX711** có dữ liệu; trạng thái BUSY là đang chuyển đổi, không có nghĩa USB bị ngắt.
- Luồng này dùng USB. UDP/Ethernet trong sketch vẫn hoạt động độc lập; app chưa bổ sung bộ nhận UDP.
- Chạy `npm run strain:test` để kiểm tra decoder, EMA, baseline, CSV, dữ liệu ba đường và khả năng nhận V3 (Node hỗ trợ `--experimental-strip-types`).

### HX711 vẫn gắn nhưng chưa nối strain gauge / load cell

READY chỉ cho biết HX711 đã chuyển đổi xong; không cho biết đầu đo analog có được nối hay chưa. Đầu analog để hở có thể trả số nhiễu. Vì vậy app có các ô **Kênh đã nối cảm biến: HX1 / HX2 / HX3**:

- Ban đầu tất cả kênh tắt. Chỉ tích kênh đã nối đầu đo, rồi bấm START. Ví dụ chỉ dùng đầu đo HX2 thì chỉ tích HX2.
- Kênh tắt luôn có đường thẳng 0 và Live Data bằng 0; các dòng CSV mới của kênh đó có raw/delta/filtered/strain bằng 0 và `enabled=0`. Lịch sử đã ghi trước khi tắt được giữ nguyên.
- Mỗi lần bật lại một kênh, app xóa EMA và lấy mốc mới riêng cho kênh ấy. Trong 10 mẫu đầu, delta và filtered giữ ở 0 để lấy mốc; sau đó mốc được giữ cố định. Hai kênh còn lại không bị reset.
- Các lựa chọn này nằm trong app, không cần nạp lại sketch. Cần đóng và chạy lại `debug-preview.bat` sau khi cập nhật vì có thay đổi Electron/preload.
- Đây là bật/tắt theo lựa chọn của người dùng, không phải tự phát hiện đầu đo analog. Trường hợp tháo hẳn module HX711 khỏi ESP cần thay firmware đang chờ đủ ba module; không đồng nhất với trường hợp đầu đo chưa nối.

### Hiệu chuẩn độ dài mm bằng hai điểm

Các ô Raw, Δ, Filtered, Min/Max, strain và biểu đồ cũ giữ nguyên. Live Data bổ sung dòng **Độ dài (mm)** cho mỗi HX, luôn hiển thị 4 chữ số thập phân khi có hiệu chuẩn. Bảng kết quả/CSV thêm `length_mm` và `length_signal_count`; không tính lại hay ghi đè các dòng đã ghi trước đó.

1. Chạy lại app, bật kênh đã nối cảm biến và bấm **START**.
2. Phần **Hiệu chuẩn thủ công · nhập kích thước và click SET** mở sẵn bên dưới Strain. Các ô chưa hiệu chuẩn để trống để người dùng tự nhập kích thước thực.
3. Kẹp vật chuẩn, nhập kích thước thực vào **Kích thước mẫu 1 (mm)** (ví dụ `3`), giữ yên ít nhất 10 mẫu rồi click **SET 1** đúng cột HX.
4. Đổi vật chuẩn, nhập **Kích thước mẫu 2 (mm)** (ví dụ `4`), giữ yên ít nhất 10 mẫu rồi click **SET 2**. Không cần nhấn Enter hoặc phím tắt. Dưới mỗi nút hiển thị kích thước và tín hiệu đã SET.
5. Hai mốc hợp lệ được tự lưu trên máy. Dòng mm bắt đầu hiển thị độ dài; các kênh còn lại dùng bộ mốc riêng của chúng. **Xóa mốc** chỉ xóa hiệu chuẩn mm của kênh đó.

Công thức: `L = L1 + (S - S1) * (L2 - L1) / (S2 - S1)`. S là trung bình 10 mẫu raw tuyệt đối gần nhất, không dùng delta đã trừ mốc hay đảo dấu. Vì vậy START lại, ZERO hoặc thay đổi hệ số strain không thay đổi thang mm. Mỗi lần START cần đủ 10 mẫu mới; trước khi đủ mẫu hoặc chưa hiệu chuẩn sẽ hiện `--`, kênh tắt hiện `0.0000`.

App từ chối hai mốc cùng độ dài/cùng tín hiệu, dữ liệu cũ và tín hiệu bão hòa. Đổi số mm của một mốc cần ghi lại tín hiệu cho mốc đó. Độ phân giải hiển thị 0.0001 mm không bảo đảm độ chính xác đo 0.0001 mm; kết quả phụ thuộc cảm biến, cơ cấu kẹp, nhiễu và độ tuyến tính. Cần hiệu chuẩn lại khi thay cảm biến hoặc cơ cấu. Hiệu chuẩn web dev và bản desktop được lưu theo kho dữ liệu riêng của từng môi trường.


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
