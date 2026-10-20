import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { StrainSample } from "../../hooks/useStrainSerial";

interface Props {
  seriesRef: MutableRefObject<StrainSample[]>;
  tick: number; // đổi giá trị => vẽ lại
  live: boolean;
  windowSec?: number;
  flipY?: boolean; // true: giá trị lớn nằm dưới, nhỏ nằm trên
}

const RAW_COLOR = "#f0b429";
const FILTERED_COLOR = "#35b7ff";

export default function StrainChart({ seriesRef, tick, live, windowSec = 30, flipY = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);

    // tiêu đề
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, 24);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`Δ HX711 vs Thời gian • ${live ? "LIVE" : "STOP"}`, w / 2, 12);

    const L = 70, R = 16, T = 36, B = 46;
    const pw = w - L - R;
    const ph = h - T - B;
    if (pw <= 10 || ph <= 10) return;

    const data = seriesRef.current;

    // Trục X: bắt đầu từ 0 (lúc START), trượt khi quá windowSec
    let xMin = 0, xMax = windowSec;
    // Trục Y: luôn chứa mốc 0; nếu dữ liệu dương thì 0 nằm ở đáy
    let yMin = 0, yMax = 1;
    if (data.length > 0) {
      const last = data[data.length - 1].t;
      xMax = Math.max(last, 1);
      xMin = Math.max(0, xMax - windowSec);

      let lo = 0, hi = 0;
      for (const s of data) {
        lo = Math.min(lo, s.delta, s.filtered);
        hi = Math.max(hi, s.delta, s.filtered);
      }
      if (hi - lo < 1) hi = lo + 1;
      const pad = (hi - lo) * 0.08;
      yMax = hi + pad;
      yMin = lo < 0 ? lo - pad : 0;
    }

    const px = (x: number) => L + ((x - xMin) / (xMax - xMin)) * pw;
    const py = (y: number) => {
      const r = (y - yMin) / (yMax - yMin);
      return flipY ? T + r * ph : T + ph - r * ph;
    };

    // lưới + nhãn
    ctx.strokeStyle = "#ddd";
    ctx.fillStyle = "#222";
    ctx.lineWidth = 1;
    ctx.font = "11px sans-serif";
    const N = 5;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= N; i++) {
      const v = yMin + ((yMax - yMin) * i) / N;
      const y = py(v);
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke();
      ctx.fillText(v.toFixed(Math.abs(yMax - yMin) < 10 ? 2 : 0), L - 6, y);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= N; i++) {
      const v = xMin + ((xMax - xMin) * i) / N;
      const x = px(v);
      ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.stroke();
      ctx.fillText(v.toFixed(1), x, T + ph + 6);
    }

    // khung
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(L, T, pw, ph);

    // đường mốc 0 (vị trí kẹp mẫu lúc START)
    const y0 = py(0);
    ctx.strokeStyle = "#d64545";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(L, y0); ctx.lineTo(L + pw, y0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#d64545";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = flipY ? "top" : "bottom";
    ctx.fillText("mốc 0 (START)", L + pw - 6, flipY ? y0 + 4 : y0 - 4);

    // nhãn trục
    ctx.fillStyle = "#000";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Thời gian (s)", L + pw / 2, h - 8);
    ctx.save();
    ctx.translate(14, T + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(flipY ? "Biến thiên Δ (count) ↓" : "Biến thiên Δ (count)", 0, 0);
    ctx.restore();

    // đường dữ liệu
    const plot = (key: "delta" | "filtered", color: string, width: number) => {
      if (data.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(L, T, pw, ph);
      ctx.clip();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = "round";
      ctx.beginPath();
      data.forEach((s, i) => {
        const x = px(s.t), y = py(s[key]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    };
    plot("delta", RAW_COLOR, 1.2);
    plot("filtered", FILTERED_COLOR, 2);

    // chú thích
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = RAW_COLOR; ctx.fillRect(L + 8, T + 8, 14, 3);
    ctx.fillStyle = "#222"; ctx.fillText("Δ raw", L + 28, T + 10);
    ctx.fillStyle = FILTERED_COLOR; ctx.fillRect(L + 78, T + 8, 14, 3);
    ctx.fillStyle = "#222"; ctx.fillText("Filtered", L + 98, T + 10);
  };

  // vẽ lại mỗi lần render (tick hoặc flipY đổi)
  useEffect(() => { draw(); });
  void tick;

  // vẽ lại khi đổi kích thước
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%", minHeight: 240 }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}