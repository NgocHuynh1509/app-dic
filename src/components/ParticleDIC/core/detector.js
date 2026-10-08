// Phát hiện hạt sáng nhỏ bằng ảnh high-pass (độ tương phản cục bộ).
// Port từ detector.py: trả về các điểm [x, y] sắp theo độ mạnh giảm dần.

export function detectWhiteParticles(cv, gray, cfg) {
  const w = gray.cols;
  const h = gray.rows;

  const grayF = new cv.Mat();
  const bg = new cv.Mat();
  const hp = new cv.Mat();
  const bin32 = new cv.Mat();
  const bin = new cv.Mat();
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centroids = new cv.Mat();

  try {
    gray.convertTo(grayF, cv.CV_32F);
    cv.GaussianBlur(grayF, bg, new cv.Size(0, 0), cfg.blurSigma, cfg.blurSigma, cv.BORDER_DEFAULT);
    cv.subtract(grayF, bg, hp); // highpass = gray - background

    cv.threshold(hp, bin32, cfg.detectionThreshold, 255, cv.THRESH_BINARY);
    bin32.convertTo(bin, cv.CV_8U);

    const n = cv.connectedComponentsWithStats(bin, labels, stats, centroids, 8, cv.CV_32S);
    const st = stats.data32S; // mỗi dòng: left, top, width, height, area
    const bm = cfg.borderMargin;

    const valid = new Uint8Array(n);
    let anyValid = false;
    for (let id = 1; id < n; id++) {
      const left = st[id * 5];
      const top = st[id * 5 + 1];
      const cw = st[id * 5 + 2];
      const ch = st[id * 5 + 3];
      const area = st[id * 5 + 4];
      if (area < cfg.minArea || area > cfg.maxArea) continue;
      if (left < bm || top < bm || left + cw - 1 >= w - bm || top + ch - 1 >= h - bm) continue;
      valid[id] = 1;
      anyValid = true;
    }
    if (!anyValid) return [];

    // Một lượt duyệt ảnh để tính tâm có trọng số cho mọi thành phần hợp lệ.
    const lab = labels.data32S;
    const hpd = hp.data32F;
    const sw = new Float64Array(n);
    const sx = new Float64Array(n);
    const sy = new Float64Array(n);
    const peak = new Float64Array(n);
    for (let y = 0, i = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i++) {
        const id = lab[i];
        if (id === 0 || !valid[id]) continue;
        const wt = Math.max(hpd[i], 1e-3);
        sw[id] += wt;
        sx[id] += x * wt;
        sy[id] += y * wt;
        if (wt > peak[id]) peak[id] = wt;
      }
    }

    const candidates = [];
    for (let id = 1; id < n; id++) {
      if (!valid[id] || sw[id] === 0) continue;
      candidates.push({ x: sx[id] / sw[id], y: sy[id] / sw[id], peak: peak[id] });
    }
    if (!candidates.length) return [];

    candidates.sort((a, b) => b.peak - a.peak);
    const minD = cfg.minDistance;
    const selected = [];
    for (const c of candidates) {
      let ok = true;
      for (const s of selected) {
        if (Math.hypot(c.x - s.x, c.y - s.y) < minD) {
          ok = false;
          break;
        }
      }
      if (ok) selected.push(c);
    }
    return selected.map((p) => [p.x, p.y]);
  } finally {
    grayF.delete();
    bg.delete();
    hp.delete();
    bin32.delete();
    bin.delete();
    labels.delete();
    stats.delete();
    centroids.delete();
  }
}
