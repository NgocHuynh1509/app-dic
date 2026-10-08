// Vẽ trường vô hướng thành heatmap (colormap Turbo) lên canvas, port từ colorize_scalar.

function turbo(t) {
  // Xấp xỉ đa thức của colormap Turbo (Google).
  t = Math.min(1, Math.max(0, t));
  const r = 0.13572138 + t * (4.6153926 + t * (-42.66032258 + t * (132.13108234 + t * (-152.94239396 + t * 59.28637943))));
  const g = 0.09140261 + t * (2.19418839 + t * (4.84296658 + t * (-14.18503333 + t * (4.27729857 + t * 2.82956604))));
  const b = 0.1066733 + t * (12.64194608 + t * (-60.58204836 + t * (110.36276771 + t * (-89.90310912 + t * 27.34824973))));
  const c = (v) => Math.min(255, Math.max(0, Math.round(v * 255)));
  return [c(r), c(g), c(b)];
}

const LUT = Array.from({ length: 256 }, (_, i) => turbo(i / 255));

function percentile(sorted, q) {
  const pos = (q / 100) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function fmtG(v) {
  // gần giống định dạng %.4g của Python
  if (v === 0) return "0";
  return String(Number(v.toPrecision(4)));
}

export function drawBlank(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * field: mảng phẳng nx*ny (hàng 0 = y nhỏ nhất, giữ nguyên như bản Python).
 */
export function drawScalarField(canvas, field, nx, ny, { symmetric = false, label = "" } = {}) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.font = "13px 'Segoe UI', Arial, sans-serif";
  ctx.textBaseline = "alphabetic";

  const vals = [];
  for (let i = 0; i < field.length; i++) if (Number.isFinite(field[i])) vals.push(field[i]);
  if (!vals.length) {
    ctx.fillStyle = "#dcdcdc";
    ctx.fillText("No field data", 12, 30);
    return;
  }

  let lo, hi;
  if (symmetric) {
    const abs = vals.map(Math.abs).sort((a, b) => a - b);
    const lim = Math.max(percentile(abs, 98), 1e-12);
    lo = -lim;
    hi = lim;
  } else {
    const s = vals.slice().sort((a, b) => a - b);
    lo = percentile(s, 2);
    hi = percentile(s, 98);
    if (hi <= lo) hi = lo + 1e-9;
  }

  const small = document.createElement("canvas");
  small.width = nx;
  small.height = ny;
  const sctx = small.getContext("2d");
  const img = sctx.createImageData(nx, ny);
  for (let i = 0; i < field.length; i++) {
    const o = i * 4;
    if (Number.isFinite(field[i])) {
      const t = Math.min(1, Math.max(0, (field[i] - lo) / (hi - lo)));
      const [r, g, b] = LUT[Math.floor(t * 255)];
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
    }
    img.data[o + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, width, height);

  ctx.strokeStyle = "#5a5a5a";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 3;
  ctx.fillText(label, 10, 22);
  ctx.font = "11px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(`min ${fmtG(lo)}`, 10, height - 10);
  const txt = `max ${fmtG(hi)}`;
  ctx.fillText(txt, width - ctx.measureText(txt).width - 10, height - 10);
  ctx.shadowBlur = 0;
}
