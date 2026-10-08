// Bám hạt bằng Lucas-Kanade (kiểm tra forward-backward) + tính chuyển vị / biến dạng.
// Điểm lưu dạng Float32Array phẳng [x0, y0, x1, y1, ...].

export class ParticleTracker {
  constructor(cv, cfg) {
    this.cv = cv;
    this.cfg = cfg;
    this.referencePoints = null;
    this.currentPoints = null;
    this.activeIds = null;
    this.prevGray = null;
    this.trails = new Map(); // id -> [[x, y], ...]
  }

  get ready() {
    return this.referencePoints !== null && this.currentPoints !== null;
  }

  clear() {
    if (this.prevGray) this.prevGray.delete();
    this.referencePoints = null;
    this.currentPoints = null;
    this.activeIds = null;
    this.prevGray = null;
    this.trails = new Map();
  }

  /** points: mảng [[x, y], ...] */
  setReference(gray, points) {
    if (this.prevGray) this.prevGray.delete();
    const n = points.length;
    const flat = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      flat[2 * i] = points[i][0];
      flat[2 * i + 1] = points[i][1];
    }
    this.referencePoints = flat.slice();
    this.currentPoints = flat.slice();
    this.activeIds = Int32Array.from({ length: n }, (_, i) => i);
    this.prevGray = gray.clone();
    this.trails = new Map();
    for (let i = 0; i < n; i++) this.trails.set(i, [[flat[2 * i], flat[2 * i + 1]]]);
  }

  _lk(prevGray, gray, points) {
    const cv = this.cv;
    const n = points.length / 2;
    const cfg = this.cfg;
    const winSize = new cv.Size(cfg.lkWinSize, cfg.lkWinSize);
    const criteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 30, 0.001);

    const p0 = cv.matFromArray(n, 1, cv.CV_32FC2, Array.from(points));
    const p1 = new cv.Mat();
    const st1 = new cv.Mat();
    const err1 = new cv.Mat();
    const p0b = new cv.Mat();
    const st2 = new cv.Mat();
    const err2 = new cv.Mat();
    try {
      cv.calcOpticalFlowPyrLK(prevGray, gray, p0, p1, st1, err1, winSize, cfg.lkMaxLevel, criteria);
      cv.calcOpticalFlowPyrLK(gray, prevGray, p1, p0b, st2, err2, winSize, cfg.lkMaxLevel, criteria);

      const P0 = p0.data32F;
      const P1 = p1.data32F;
      const P0B = p0b.data32F;
      const S1 = st1.data;
      const S2 = st2.data;
      const E1 = err1.data32F;
      const w = gray.cols;
      const h = gray.rows;

      const next = new Float32Array(P1); // sao chép
      const valid = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const x0 = P0[2 * i];
        const y0 = P0[2 * i + 1];
        const x1 = P1[2 * i];
        const y1 = P1[2 * i + 1];
        const fb = Math.hypot(x0 - P0B[2 * i], y0 - P0B[2 * i + 1]);
        const step = Math.hypot(x1 - x0, y1 - y0);
        const inside = x1 >= 0 && x1 < w && y1 >= 0 && y1 < h;
        valid[i] =
          S1[i] && S2[i] && inside && fb <= cfg.fbErrorMax && E1[i] <= cfg.lkErrorMax && step <= cfg.maxStepPx
            ? 1
            : 0;
      }
      return { next, valid };
    } finally {
      p0.delete();
      p1.delete();
      st1.delete();
      err1.delete();
      p0b.delete();
      st2.delete();
      err2.delete();
    }
  }

  /** Trả về {ids, ref, cur} hoặc null nếu mất hết điểm. */
  update(gray) {
    if (!this.ready) throw new Error("Reference has not been set");
    if (this.currentPoints.length === 0) return null;

    const { next, valid } = this._lk(this.prevGray, gray, this.currentPoints);
    let nValid = 0;
    for (let i = 0; i < valid.length; i++) nValid += valid[i];

    this.prevGray.delete();
    this.prevGray = gray.clone();

    if (nValid === 0) {
      this.currentPoints = new Float32Array(0);
      this.activeIds = new Int32Array(0);
      return null;
    }

    const ids = new Int32Array(nValid);
    const cur = new Float32Array(nValid * 2);
    const ref = new Float32Array(nValid * 2);
    let k = 0;
    for (let i = 0; i < valid.length; i++) {
      if (!valid[i]) continue;
      const id = this.activeIds[i];
      ids[k] = id;
      cur[2 * k] = next[2 * i];
      cur[2 * k + 1] = next[2 * i + 1];
      ref[2 * k] = this.referencePoints[2 * id];
      ref[2 * k + 1] = this.referencePoints[2 * id + 1];
      k++;
    }
    this.activeIds = ids;
    this.currentPoints = cur;

    const maxLen = this.cfg.trailLength;
    for (let i = 0; i < ids.length; i++) {
      const tr = this.trails.get(ids[i]);
      tr.push([cur[2 * i], cur[2 * i + 1]]);
      if (tr.length > maxLen) tr.shift();
    }
    return { ids: ids.slice(), ref: ref.slice(), cur: cur.slice() };
  }
}

function median(arr) {
  const s = Float64Array.from(arr).sort();
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
}

/**
 * u: dương sang phải. v: dương hướng lên (hệ Descartes).
 * dyImg: dương hướng xuống theo toạ độ ảnh.
 */
export function displacementComponents(ref, cur, removeGlobalTranslation = false) {
  const n = ref.length / 2;
  const u = new Float64Array(n);
  const v = new Float64Array(n);
  const dyImg = new Float64Array(n);
  const mag = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    u[i] = cur[2 * i] - ref[2 * i];
    dyImg[i] = cur[2 * i + 1] - ref[2 * i + 1];
  }
  if (removeGlobalTranslation && n) {
    const mx = median(u);
    const my = median(dyImg);
    for (let i = 0; i < n; i++) {
      u[i] -= mx;
      dyImg[i] -= my;
    }
  }
  for (let i = 0; i < n; i++) {
    v[i] = -dyImg[i];
    mag[i] = Math.hypot(u[i], v[i]);
  }
  return { u, v, dyImg, mag };
}

/**
 * Ước lượng biến dạng nhỏ trung bình bằng phép biến đổi affine
 * (bình phương tối thiểu) từ toạ độ reference sang toạ độ hiện tại.
 * Trả về { exx, eyy, gxy, rot } hoặc NaN nếu thiếu điểm.
 */
export function estimateGlobalStrain(ref, cur) {
  const n = ref.length / 2;
  const nan = { exx: NaN, eyy: NaN, gxy: NaN, rot: NaN };
  if (n < 3) return nan;

  // Đổi y-xuống của ảnh sang y-lên (Descartes), rồi căn giữa dữ liệu:
  // phần tịnh tiến bị triệt tiêu, phần tuyến tính A giữ nguyên.
  let mxr = 0, myr = 0, mxc = 0, myc = 0;
  for (let i = 0; i < n; i++) {
    mxr += ref[2 * i];
    myr += -ref[2 * i + 1];
    mxc += cur[2 * i];
    myc += -cur[2 * i + 1];
  }
  mxr /= n; myr /= n; mxc /= n; myc /= n;

  let c00 = 0, c01 = 0, c11 = 0; // C = X^T X
  let b00 = 0, b01 = 0, b10 = 0, b11 = 0; // B = X^T Y
  for (let i = 0; i < n; i++) {
    const xr = ref[2 * i] - mxr;
    const yr = -ref[2 * i + 1] - myr;
    const xc = cur[2 * i] - mxc;
    const yc = -cur[2 * i + 1] - myc;
    c00 += xr * xr;
    c01 += xr * yr;
    c11 += yr * yr;
    b00 += xr * xc;
    b01 += xr * yc;
    b10 += yr * xc;
    b11 += yr * yc;
  }
  const det = c00 * c11 - c01 * c01;
  if (!(Math.abs(det) > 1e-12 * Math.max(1, c00 * c11))) return nan;

  // coeff = C^-1 B  (hàng i: hệ số của biến i, cột j: thành phần j của toạ độ hiện tại)
  const k00 = (c11 * b00 - c01 * b10) / det;
  const k01 = (c11 * b01 - c01 * b11) / det;
  const k10 = (-c01 * b00 + c00 * b10) / det;
  const k11 = (-c01 * b01 + c00 * b11) / det;

  // A = [[k00, k10], [k01, k11]]
  const H00 = k00 - 1;
  const H01 = k10;
  const H10 = k01;
  const H11 = k11 - 1;
  return {
    exx: H00,
    eyy: H11,
    gxy: H01 + H10,
    rot: 0.5 * (H10 - H01),
  };
}
