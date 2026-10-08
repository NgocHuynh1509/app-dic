// Lấy token license do app Electron cấp (window.dicAuth do electron/preload.cjs tạo).
// Chạy ngoài Electron (npm run dic:dev) thì không có -> trả chuỗi rỗng, server bỏ qua xác thực ở chế độ dev.
export function getDicToken() {
  try {
    return window.dicAuth?.getToken?.() ?? "";
  } catch {
    return "";
  }
}

// Header cho fetch: fetch(url, { headers: { ...dicHeaders(), "Content-Type": "application/json" } })
export function dicHeaders() {
  return { "x-dic-token": getDicToken() };
}

// Gắn ?token=... vào URL (WebSocket, link tải CSV...)
export function withDicToken(url) {
  const u = new URL(url, window.location.href);
  u.searchParams.set("token", getDicToken());
  return u.toString();
}