import { useState } from "react";
import type { CSSProperties } from "react";
import type { LiveData, GraphPoint, Specimen } from "../../types";
import StrainChart from "../StrainChart/StrainChart";
import StrainTable from "../StrainTable/StrainTable";
import { useStrainSerial } from "../../hooks/useStrainSerial";
import "./H5kTTab.css";

interface Props {
  // Các prop dưới đây không còn dùng (data lấy từ ESP32 + HX711),
  // giữ lại dạng tuỳ chọn để component cha không phải sửa.
  liveData?: LiveData;
  curve?: GraphPoint[];
  specimens?: Specimen[];
  onRegenerate?: () => void;
}

const dash = "--";
const dis = (d: boolean): CSSProperties | undefined =>
  d ? { opacity: 0.45, cursor: "not-allowed" } : undefined;

export default function H5kTTab(_props: Props) {
  const [factorText, setFactorText] = useState("0");
  const [invert, setInvert] = useState(true); // dãn mẫu => giá trị tăng từ mốc 0
  const [flipY, setFlipY] = useState(false); // lật chiều trục Y của đồ thị

  const parsed = parseFloat(factorText.replace(",", "."));
  const factor = Number.isFinite(parsed) ? parsed : 0;

  const {
    available, status, connected, hxReady, recording, tick, latest, stats,
    seriesRef, rowsRef, zero, start, stop, clear, exportCsv,
  } = useStrainSerial({ factor, invert });

  const statusText = !available
    ? "(Chỉ hỗ trợ bản Electron)"
    : connected
      ? `(ESP32 ${status.port ?? ""} · HX711 ${hxReady ? "READY" : "NOT READY"})`
      : status.state === "trying"
        ? `(Đang thử ${status.port ?? ""}...)`
        : status.state === "disconnected"
          ? "(Mất kết nối - đang tìm lại...)"
          : status.state === "no_ports"
            ? "(Không thấy cổng USB Serial)"
            : "(Đang tìm ESP32...)";

  const rawText = latest ? String(latest.raw) : dash;
  const deltaText = latest ? latest.delta.toFixed(1) : dash;
  const filteredText = latest ? latest.filtered.toFixed(1) : dash;
  const minText = stats.minDelta === null ? dash : stats.minDelta.toFixed(1);
  const maxText = stats.maxDelta === null ? dash : stats.maxDelta.toFixed(1);
  const timeText = latest ? latest.t.toFixed(2) : "0.00";
  const strainText = latest && latest.strain !== null ? latest.strain.toFixed(3) : dash;

  return (
    <div className="h5kt-tab">
      {/* MACHINE STATUS LINE */}
      <div className="h5kt-status-line">
        <span>Machine Status:</span>
        <span className="h5kt-status-badge">{statusText}</span>
        <span className="h5kt-status-spacer" />
        <button className="h5kt-btn-dropdown">Panels ▾</button>
        <button className="h5kt-btn-dropdown">Layouts ▾</button>
      </div>

      {/* TOP WORKSPACE: GRAPH & SIDEBAR */}
      <div className="h5kt-top-content">
        {/* GRAPH PANEL */}
        <section className="h5kt-panel h5kt-graph-panel">
          <div className="h5kt-panel-header">
            <span>Graph</span>
            <div className="h5kt-panel-actions">
              <button title="Maximize">□</button>
              <button title="Close">✕</button>
            </div>
          </div>
          <div className="h5kt-graph-content">
            <StrainChart seriesRef={seriesRef} tick={tick} live={recording} flipY={flipY} />
          </div>
        </section>

        {/* RIGHT SIDEBAR */}
        <div className="h5kt-right-sidebar">
          {/* MACHINE CONTROLS */}
          <section className="h5kt-panel h5kt-controls-panel">
            <div className="h5kt-panel-header">
              <span>Machine Controls</span>
              <div className="h5kt-panel-actions">
                <button title="Minimize">_</button>
                <button title="Maximize">□</button>
                <button title="Close">✕</button>
              </div>
            </div>
            <div className="h5kt-controls-body">
              <button className="h5kt-ctrl-btn ctrl-grip" title="Grip / Setup">
                <svg viewBox="0 0 36 36" className="ctrl-icon">
                  <rect x="6" y="6" width="24" height="24" rx="2" fill="#555" stroke="#888" strokeWidth="1" />
                  <path d="M10 18 h16 M18 10 v16" stroke="#ff8c00" strokeWidth="3" />
                  <circle cx="18" cy="18" r="4" fill="#ff4500" />
                </svg>
              </button>

              <button className="h5kt-ctrl-btn" title="Fast Up">
                <svg viewBox="0 0 36 36" className="ctrl-icon">
                  <path d="M18 6 L28 20 H8 Z" fill="url(#grad-orange)" />
                  <path d="M18 16 L28 30 H8 Z" fill="url(#grad-orange)" />
                  <defs>
                    <linearGradient id="grad-orange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffa500" />
                      <stop offset="100%" stopColor="#ff4500" />
                    </linearGradient>
                  </defs>
                </svg>
              </button>

              <button className="h5kt-ctrl-btn" title="Up">
                <svg viewBox="0 0 36 36" className="ctrl-icon">
                  <path d="M18 8 L30 26 H6 Z" fill="url(#grad-orange)" />
                </svg>
              </button>

              <button className="h5kt-ctrl-btn" title="Return">
                <svg viewBox="0 0 36 36" className="ctrl-icon">
                  <circle cx="18" cy="18" r="10" fill="none" stroke="#ff8c00" strokeWidth="3" />
                  <path d="M18 10 L24 18 H12 Z" fill="#ff8c00" />
                </svg>
              </button>

              <button className="h5kt-ctrl-btn" title="Fine Adjust">
                <svg viewBox="0 0 36 36" className="ctrl-icon">
                  <path d="M18 28 L6 10 H30 Z" fill="url(#grad-orange)" />
                </svg>
              </button>

              <button className="h5kt-ctrl-btn ctrl-stop" title="Emergency Stop">
                <span className="ctrl-stop-x">X</span>
              </button>

              <button className="h5kt-ctrl-btn" title="Home">
                <svg viewBox="0 0 36 36" className="ctrl-icon">
                  <path d="M8 28 V16 L18 8 L28 16 V28 H20 V20 H16 V28 Z" fill="url(#grad-orange)" />
                </svg>
              </button>
            </div>
          </section>

          {/* LIVE DATA (HX711) */}
          <section className="h5kt-panel h5kt-live-panel">
            <div className="h5kt-panel-header">
              <span>Live Data</span>
              <div className="h5kt-panel-actions">
                <button title="Minimize">_</button>
                <button title="Close">✕</button>
              </div>
            </div>
            <div className="h5kt-live-data">
              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Raw HX711</span>
                <input type="text" readOnly value={rawText} />
                <span className="h5kt-live-unit">count</span>
              </div>
              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Δ Raw</span>
                <input type="text" readOnly value={deltaText} />
                <span className="h5kt-live-unit">count</span>
              </div>
              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Filtered</span>
                <input type="text" readOnly value={filteredText} />
                <span className="h5kt-live-unit">count</span>
              </div>
              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Min Δ</span>
                <input type="text" readOnly value={minText} />
                <span className="h5kt-live-unit">count</span>
              </div>
              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Max Δ</span>
                <input type="text" readOnly value={maxText} />
                <span className="h5kt-live-unit">count</span>
              </div>
              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Số mẫu</span>
                <input type="text" readOnly value={String(stats.count)} />
                <span className="h5kt-live-unit">mẫu</span>
              </div>
              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Time</span>
                <input type="text" readOnly value={timeText} />
                <span className="h5kt-live-unit">s</span>
              </div>
            </div>
          </section>

          {/* STRAIN */}
          <section className="h5kt-panel h5kt-sigma-eps-panel">
            <div className="h5kt-panel-header">
              <span>Strain (ε)</span>
              <div className="h5kt-panel-actions">
                <button title="Minimize">_</button>
                <button title="Close">✕</button>
              </div>
            </div>
            <div className="h5kt-sigma-eps-body">
              <div className="h5kt-sigma-eps-row">
                <span className="h5kt-sigma-eps-label">ε</span>
                <span className="h5kt-sigma-eps-value">{strainText}</span>
                <span className="h5kt-sigma-eps-unit">µε</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* BOTTOM RESULTS AREA */}
      <section className="h5kt-panel h5kt-results">
        <div className="h5kt-results__toolbar">
          <span className="h5kt-results__title">Testing - Single Mode</span>
          <div className="h5kt-results__tools">
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              Hệ số
              <input
                type="text"
                inputMode="decimal"
                value={factorText}
                onChange={(e) => setFactorText(e.target.value)}
                title="Hệ số calibration (µε/count), 0 = chưa hiệu chuẩn"
                style={{ width: 90 }}
              />
              µε/count
            </label>
            <label
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
              title="Nhân -1 cho Δ, Filtered và ε (áp dụng cho mẫu mới). Bật: dãn mẫu => giá trị tăng từ mốc 0."
            >
              <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
              Đảo dấu dữ liệu
            </label>
            <label
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
              title="Lật chiều trục Y của đồ thị. Không đổi dữ liệu. Đừng bật cùng Đảo dấu dữ liệu."
            >
              <input type="checkbox" checked={flipY} onChange={(e) => setFlipY(e.target.checked)} />
              Đảo trục Y
            </label>
            <button
              disabled={!connected || recording}
              style={dis(!connected || recording)}
              onClick={zero}
              title="Tuỳ chọn: đặt lại mốc trong ESP32. Không cần nếu chỉ dùng START (mốc tự lấy)."
            >
              ⊘ ZERO
            </button>
            <button
              disabled={!connected || recording}
              style={dis(!connected || recording)}
              onClick={start}
              title="Kẹp mẫu trước, rồi bấm START: mốc 0 được lấy tại thời điểm này"
            >
              ▶ START
            </button>
            <button disabled={!connected || !recording} style={dis(!connected || !recording)} onClick={stop}>
              ■ STOP
            </button>
            <button disabled={stats.count === 0} style={dis(stats.count === 0)} onClick={exportCsv}>
              💾 CSV
            </button>
            <button disabled={recording || stats.count === 0} style={dis(recording || stats.count === 0)} onClick={clear}>
              🧹 Xóa
            </button>
            <span style={{ fontSize: 12, color: "#aaa" }}>Số mẫu: {stats.count}</span>
          </div>
        </div>

        <div className="h5kt-results__table-wrapper">
          <StrainTable rowsRef={rowsRef} tick={Math.floor(tick / 4)} />
        </div>
      </section>
    </div>
  );
}