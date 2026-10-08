// Vẽ chú thích lên canvas video (port từ overlay.py). Màu giữ đúng như bản BGR gốc.

export function drawTracks(ctx, trails, activeIds, maxLen = 30) {
  ctx.save();
  ctx.strokeStyle = "rgb(180,180,180)";
  ctx.lineWidth = 1;
  for (let k = 0; k < activeIds.length; k++) {
    const dq = trails.get(activeIds[k]);
    if (!dq || dq.length < 2) continue;
    const pts = dq.slice(-maxLen);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawVectors(ctx, ref, cur, gain = 1.0) {
  const n = ref.length / 2;
  ctx.save();
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const x0 = ref[2 * i];
    const y0 = ref[2 * i + 1];
    const x1 = cur[2 * i];
    const y1 = cur[2 * i + 1];
    const ex = x0 + (x1 - x0) * gain;
    const ey = y0 + (y1 - y0) * gain;

    ctx.strokeStyle = "rgb(255,255,0)"; // BGR (0,255,255)
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(ex, ey);
    const len = Math.hypot(ex - x0, ey - y0);
    if (len > 0) {
      const tip = len * 0.25;
      const ang = Math.atan2(y0 - ey, x0 - ex);
      for (const s of [Math.PI / 4, -Math.PI / 4]) {
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + tip * Math.cos(ang + s), ey + tip * Math.sin(ang + s));
      }
    }
    ctx.stroke();

    ctx.fillStyle = "rgb(255,0,0)"; // BGR (0,0,255)
    ctx.beginPath();
    ctx.arc(x1, y1, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** points: Float32Array phẳng hoặc mảng [[x, y], ...] */
export function drawReferencePoints(ctx, points) {
  ctx.save();
  ctx.strokeStyle = "rgb(0,120,255)"; // BGR (255,120,0)
  ctx.lineWidth = 1;
  const flat = !Array.isArray(points);
  const n = flat ? points.length / 2 : points.length;
  for (let i = 0; i < n; i++) {
    const x = flat ? points[2 * i] : points[i][0];
    const y = flat ? points[2 * i + 1] : points[i][1];
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
