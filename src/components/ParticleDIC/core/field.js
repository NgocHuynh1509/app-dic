// Nội suy trường chuyển vị lên lưới đều và tính biến dạng (port từ field.py).
// Nội suy tuyến tính trên tam giác Delaunay (tương đương scipy griddata "linear").
import Delaunator from "delaunator";

function linspace(a, b, n) {
  const out = new Float64Array(n);
  const step = n > 1 ? (b - a) / (n - 1) : 0;
  for (let i = 0; i < n; i++) out[i] = a + step * i;
  return out;
}

function reflectIndex(i, n) {
  // chế độ 'reflect' của scipy: d c b a | a b c d | d c b a
  while (i < 0 || i >= n) {
    if (i < 0) i = -i - 1;
    if (i >= n) i = 2 * n - i - 1;
  }
  return i;
}

function gaussianKernel(sigma) {
  const radius = Math.floor(4.0 * sigma + 0.5);
  const k = new Float64Array(2 * radius + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp((-0.5 * i * i) / (sigma * sigma));
    k[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  return k;
}

function filter1d(src, nx, ny, kernel, axis) {
  const out = new Float64Array(src.length);
  const r = (kernel.length - 1) / 2;
  if (axis === 1) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += kernel[k + r] * src[y * nx + reflectIndex(x + k, nx)];
        out[y * nx + x] = s;
      }
    }
  } else {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += kernel[k + r] * src[reflectIndex(y + k, ny) * nx + x];
        out[y * nx + x] = s;
      }
    }
  }
  return out;
}

function gaussianFilter(a, nx, ny, sigma) {
  const k = gaussianKernel(sigma);
  return filter1d(filter1d(a, nx, ny, k, 0), nx, ny, k, 1);
}

/** Làm mượt có bỏ qua NaN (chuẩn hoá theo trọng số). */
function nanSmooth(a, nx, ny, sigma) {
  const vals = new Float64Array(a.length);
  const weights = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) {
    if (Number.isFinite(a[i])) {
      vals[i] = a[i];
      weights[i] = 1;
    }
  }
  const sv = gaussianFilter(vals, nx, ny, sigma);
  const sw = gaussianFilter(weights, nx, ny, sigma);
  const out = new Float64Array(a.length).fill(NaN);
  for (let i = 0; i < a.length; i++) if (sw[i] > 1e-6) out[i] = sv[i] / sw[i];
  return out;
}

/** np.gradient theo một trục với bước h (sai phân trung tâm, một phía ở biên). */
function gradient(a, nx, ny, axis, h) {
  const out = new Float64Array(a.length);
  if (axis === 1) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x;
        if (nx < 2) out[i] = NaN;
        else if (x === 0) out[i] = (a[i + 1] - a[i]) / h;
        else if (x === nx - 1) out[i] = (a[i] - a[i - 1]) / h;
        else out[i] = (a[i + 1] - a[i - 1]) / (2 * h);
      }
    }
  } else {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x;
        if (ny < 2) out[i] = NaN;
        else if (y === 0) out[i] = (a[i + nx] - a[i]) / h;
        else if (y === ny - 1) out[i] = (a[i] - a[i - nx]) / h;
        else out[i] = (a[i + nx] - a[i - nx]) / (2 * h);
      }
    }
  }
  return out;
}

function ptp(arr) {
  let lo = Infinity, hi = -Infinity;
  for (const v of arr) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return hi - lo;
}

/**
 * ref: Float32Array phẳng [x, y, ...] (toạ độ ảnh), u, v: chuyển vị (v hướng lên).
 * Trả về { nx, ny, U, V, M, exx, eyy, gxy } (mảng phẳng theo hàng) hoặc null.
 */
export function interpolateFields(ref, u, v, cfg) {
  const n = ref.length / 2;
  if (n < cfg.minPointsForField) return null;

  const x = new Float64Array(n);
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = ref[2 * i];
    y[i] = -ref[2 * i + 1]; // y hướng lên
  }
  if (ptp(x) < 2 || ptp(y) < 2) return null;

  const nx = cfg.gridNx;
  const ny = cfg.gridNy;
  const xmin = Math.min(...x), xmax = Math.max(...x);
  const ymin = Math.min(...y), ymax = Math.max(...y);
  const gx = linspace(xmin, xmax, nx);
  const gy = linspace(ymin, ymax, ny);

  let tri;
  try {
    const coords = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      coords[2 * i] = x[i];
      coords[2 * i + 1] = y[i];
    }
    tri = new Delaunator(coords).triangles;
  } catch {
    return null;
  }
  if (!tri || tri.length < 3) return null;

  let U = new Float64Array(nx * ny).fill(NaN);
  let V = new Float64Array(nx * ny).fill(NaN);
  const dxg = gx[1] - gx[0];
  const dyg = gy[1] - gy[0];
  const eps = 1e-9;

  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    const x1 = x[a], y1 = y[a], x2 = x[b], y2 = y[b], x3 = x[c], y3 = y[c];
    const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
    if (Math.abs(denom) < 1e-12) continue;

    const i0 = Math.max(0, Math.ceil((Math.min(x1, x2, x3) - xmin) / dxg - eps));
    const i1 = Math.min(nx - 1, Math.floor((Math.max(x1, x2, x3) - xmin) / dxg + eps));
    const j0 = Math.max(0, Math.ceil((Math.min(y1, y2, y3) - ymin) / dyg - eps));
    const j1 = Math.min(ny - 1, Math.floor((Math.max(y1, y2, y3) - ymin) / dyg + eps));

    for (let j = j0; j <= j1; j++) {
      const py = gy[j];
      for (let i = i0; i <= i1; i++) {
        const px = gx[i];
        const l1 = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denom;
        const l2 = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denom;
        const l3 = 1 - l1 - l2;
        if (l1 < -eps || l2 < -eps || l3 < -eps) continue;
        U[j * nx + i] = l1 * u[a] + l2 * u[b] + l3 * u[c];
        V[j * nx + i] = l1 * v[a] + l2 * v[b] + l3 * v[c];
      }
    }
  }

  U = nanSmooth(U, nx, ny, cfg.fieldSmoothSigma);
  V = nanSmooth(V, nx, ny, cfg.fieldSmoothSigma);
  const M = new Float64Array(nx * ny);
  for (let i = 0; i < M.length; i++) M[i] = Math.hypot(U[i], V[i]);

  const du_dy = gradient(U, nx, ny, 0, dyg);
  const du_dx = gradient(U, nx, ny, 1, dxg);
  const dv_dy = gradient(V, nx, ny, 0, dyg);
  const dv_dx = gradient(V, nx, ny, 1, dxg);
  const gxy = new Float64Array(nx * ny);
  for (let i = 0; i < gxy.length; i++) gxy[i] = du_dy[i] + dv_dx[i];

  return { nx, ny, U, V, M, exx: du_dx, eyy: dv_dy, gxy };
}
