// Xác thực request tới server DIC (localhost:8000) bằng token do app Electron cấp.
// Token nằm trong process.env.DIC_LOCAL_TOKEN (main.cjs đặt khi license hợp lệ, xóa khi bị khóa),
// nên request từ bên ngoài app, hoặc sau khi bị khóa từ xa, đều bị từ chối.
//
// Chạy server riêng khi phát triển (npm run dic:server / dic:dev): script đặt DIC_AUTH_DISABLED=1
// để bỏ qua kiểm tra. Bản đóng gói (app.isPackaged) luôn xóa biến này trong main.cjs.
import crypto from 'node:crypto';

const authDisabled = () => process.env.DIC_AUTH_DISABLED === '1';

function safeEqual(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

// true khi app đã bị khóa (không còn token hợp lệ nào) -> server nên ngắt các kết nối đang mở
export function isLocked() {
  return !authDisabled() && !process.env.DIC_LOCAL_TOKEN;
}

export function isAuthorized(token) {
  if (authDisabled()) return true;
  const real = process.env.DIC_LOCAL_TOKEN || '';
  return !!real && !!token && safeEqual(token, real);
}

// Express: app.use('/api', requireLocalToken)  (đặt sau app.use(cors()))
export function requireLocalToken(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const token = req.headers['x-dic-token'] || req.query?.token;
  if (!isAuthorized(token)) return res.status(401).json({ code: 'LICENSE_REQUIRED' });
  next();
}

// WebSocket (thư viện ws): new WebSocketServer({ server, verifyClient: ({ req }) => verifyWsClient(req) })
// Client kết nối: new WebSocket(`ws://localhost:8000/ws?token=${token}`)
export function verifyWsClient(req) {
  const url = new URL(req.url, 'http://localhost');
  return isAuthorized(url.searchParams.get('token'));
}