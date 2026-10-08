import { useMemo } from "react";
import type { GraphPoint } from "../../types";
import "./GraphPanel.css";

export interface GraphPanelProps {
  data?: GraphPoint[];
}

// Số điểm gần nhất được hiển thị cùng lúc trên màn hình (cửa sổ trượt
// theo SỐ ĐIỂM, không phải theo mốc position cố định nào — nên sẽ
// không bao giờ "kẹt" ở một giá trị X nào cả, cứ chạy là trượt tiếp).
const VISIBLE_POINT_COUNT = 60;

const PADDING = { top: 20, right: 30, bottom: 60, left: 70 };
const MIN_RANGE_SPAN = 200;

// Dữ liệu gốc (position) đang tính theo inch — quy đổi sang mm để hiển thị.
const IN_TO_MM = 25.4;
const toMm = (inches: number) => inches * IN_TO_MM;

function buildSmoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) {
    return `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  }
  if (coords.length === 2) {
    return (
      `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)} ` +
      `L ${coords[1].x.toFixed(2)} ${coords[1].y.toFixed(2)}`
    );
  }

  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d +=
      ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ` +
      `${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ` +
      `${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

export default function GraphPanel({ data = [] }: GraphPanelProps) {
  const width = 700;
  const height = 360;

  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  // Luôn chỉ lấy N điểm CUỐI CÙNG — bất kể data dài bao nhiêu,
  // đây chính là thứ khiến đồ thị "chạy mãi không dừng".
  // Quy đổi position từ inch sang mm ngay tại đây để toàn bộ phần
  // tính toán bên dưới (range, tick, path) đều làm việc trên mm.
  const visiblePoints = useMemo(() => {
    const windowed = data.length <= VISIBLE_POINT_COUNT
      ? data
      : data.slice(data.length - VISIBLE_POINT_COUNT);
    return windowed.map((p) => ({ ...p, position: toMm(p.position) }));
  }, [data]);

  const visibleRange = useMemo(() => {
    if (visiblePoints.length === 0) {
      return { min: 0, max: 1 };
    }
    const first = visiblePoints[0].position;
    const last = visiblePoints[visiblePoints.length - 1].position;
    return first === last ? { min: first, max: first + 1 } : { min: first, max: last };
  }, [visiblePoints]);

  const range = visibleRange.max - visibleRange.min || 1;

  const forceRange = useMemo(() => {
    if (visiblePoints.length === 0) {
      return { min: -MIN_RANGE_SPAN, max: MIN_RANGE_SPAN };
    }
    const forces = visiblePoints.map((p) => p.force);
    const dataMin = Math.min(...forces);
    const dataMax = Math.max(...forces);
    const span = dataMax - dataMin;

    if (span < MIN_RANGE_SPAN) {
      const center = (dataMax + dataMin) / 2;
      return { min: center - MIN_RANGE_SPAN / 2, max: center + MIN_RANGE_SPAN / 2 };
    }

    const pad = span * 0.15;
    return { min: dataMin - pad, max: dataMax + pad };
  }, [visiblePoints]);

  const getX = (position: number) =>
    PADDING.left + ((position - visibleRange.min) / range) * plotW;

  const getY = (force: number) => {
    const { min, max } = forceRange;
    const span = max - min || 1;
    const clamped = Math.max(0, Math.min(1, (force - min) / span));
    return PADDING.top + plotH - clamped * plotH;
  };

  const pathD = useMemo(() => {
    const coords = visiblePoints.map((p) => ({ x: getX(p.position), y: getY(p.force) }));
    return buildSmoothPath(coords);
  }, [visiblePoints, visibleRange, forceRange]);

  const yTicks = useMemo(() => {
    const count = 7;
    const { min, max } = forceRange;
    return Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1));
  }, [forceRange]);

  const xTicks = useMemo(() => {
    const count = 7;
    return Array.from(
      { length: count },
      (_, i) => visibleRange.min + (range * i) / (count - 1)
    );
  }, [visibleRange, range]);

  const lastPt = visiblePoints.length > 0 ? visiblePoints[visiblePoints.length - 1] : null;
  const lastX = lastPt ? getX(lastPt.position) : 0;
  const lastY = lastPt ? getY(lastPt.force) : 0;

  return (
    <div className="graph-panel">
      <div className="graph-panel__header">
        <span>Force vs. Position</span>
        {lastPt && (
          <span className="graph-panel__live">
            <span className="graph-panel__live-dot">●</span>
            LIVE
          </span>
        )}
      </div>

      <div className="graph-panel__body">
        <svg className="graph-panel__svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <clipPath id="graph-plot-clip">
              <rect x={PADDING.left} y={PADDING.top} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {yTicks.map((value, i) => {
            const y = getY(value);
            return (
              <g key={`y-${i}`}>
                <line x1={PADDING.left} x2={width - PADDING.right} y1={y} y2={y} className="graph-panel__gridline" />
                <text x={PADDING.left - 10} y={y + 4} className="graph-panel__tick graph-panel__tick--y">
                  {value.toFixed(4)}
                </text>
              </g>
            );
          })}

          {xTicks.map((value, index) => {
            const x = getX(value);
            return (
              <g key={`x-${index}`}>
                <line x1={x} x2={x} y1={PADDING.top} y2={height - PADDING.bottom} className="graph-panel__gridline" />
                <text x={x} y={height - PADDING.bottom + 18} textAnchor="middle" className="graph-panel__tick graph-panel__tick--x">
                  {value.toFixed(4)}
                </text>
              </g>
            );
          })}

          <rect x={PADDING.left} y={PADDING.top} width={plotW} height={plotH} className="graph-panel__border" />

          {pathD && (
            <g clipPath="url(#graph-plot-clip)">
              <path d={pathD} className="graph-panel__curve" />
              {lastPt && (
                <>
                  <circle cx={lastX} cy={lastY} r="7" className="graph-panel__break-point-glow" />
                  <circle cx={lastX} cy={lastY} r="4" className="graph-panel__break-point" />
                </>
              )}
            </g>
          )}

          <text x={-(PADDING.top + plotH / 2)} y={20} className="graph-panel__axis-label" transform="rotate(-90)" textAnchor="middle">
            Force (lbf)
          </text>
          <text x={PADDING.left + plotW / 2} y={height - 12} className="graph-panel__axis-label" textAnchor="middle">
            Position (mm)
          </text>
        </svg>
      </div>
    </div>
  );
}