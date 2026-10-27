import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { LiveData, GraphPoint, Specimen } from "../../types";
import StrainChart from "../StrainChart/StrainChart";
import StrainTable from "../StrainTable/StrainTable";
import ProjectBar from "../ProjectBar/ProjectBar";
import { useStrainSerial } from "../../hooks/useStrainSerial";
import { CHANNEL_LABELS, CHANNEL_COLORS } from "../../hooks/strainSession";
import { StrainChannelReadings, StrainChannelCalibration } from "../StrainChannelReadings/StrainChannelReadings";
import LengthCalibrationPanel from "../StrainChannelReadings/LengthCalibrationPanel";
import { loadLengthCalibrations, saveLengthCalibrations } from "../../hooks/strainLengthCalibration";
import type { LengthCalibration } from "../../hooks/strainLengthCalibration";
import { dbApi } from "../../hooks/projectApi";
import type { SpecimenInfo } from "../../hooks/projectApi";
import "./H5kTTab.css";

interface Props {
  // Các prop dưới đây không còn dùng (data lấy từ ESP32 + HX711),
  // giữ lại dạng tuỳ chọn để component cha không phải sửa.
  liveData?: LiveData;
  curve?: GraphPoint[];
  specimens?: Specimen[];
  onRegenerate?: () => void;
}

const dis = (d: boolean): CSSProperties | undefined =>
  d ? { opacity: 0.45, cursor: "not-allowed" } : undefined;

export default function H5kTTab(_props: Props) {
  const [factorTexts, setFactorTexts] = useState(["0", "0", "0"]);
  const [showRaw, setShowRaw] = useState(false);
  const [enabledChannels, setEnabledChannels] = useState([false, false, false]);
  const [inversions, setInversions] = useState([true, true, true]);
  const [flipY, setFlipY] = useState(false); // lật chiều trục Y của đồ thị
  const [lengthCalibrations, setLengthCalibrations] = useState(loadLengthCalibrations);
  const [lengthStorageError, setLengthStorageError] = useState('');
  const [specimen, setSpecimen] = useState<SpecimenInfo | null>(null);
  const [savedRuns, setSavedRuns] = useState(0);
  const [dbMessage, setDbMessage] = useState('');

  useEffect(() => { setSavedRuns(specimen?.runCount ?? 0); }, [specimen?.id, specimen?.runCount]);

  function applyLengthCalibration(index: number, calibration: LengthCalibration | null) {
    const next = lengthCalibrations.map((entry, i) => i === index ? calibration : entry);
    setLengthCalibrations(next);
    setLengthStorageError(saveLengthCalibrations(next) ? '' : 'Đã áp dụng nhưng chưa lưu được trên máy; hãy ghi lại hai mốc trước khi đóng app.');
  }

  const factors = factorTexts.map((text) => {
    const parsed = parseFloat(text.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  });

  const {
    available, status, connected, hxReady, recording, tick, latest, stats,
    channelCount, hxStates, frameCount, seriesRef, rowsRef, zero, start, stop, clear,
  } = useStrainSerial({ factors, enabledChannels, lengthCalibrations, invert: inversions });

  async function handleStop() {
    stop();
    const api = dbApi();
    if (!api || !specimen) return;
    const rows = rowsRef.current.slice();
    if (!rows.length) return;
    try {
      await api.saveRun(specimen.id, rows);
      setSavedRuns((n) => n + 1);
      setDbMessage(`Đã lưu ${rows.length} dòng vào SQLite (mẫu "${specimen.name}").`);
    } catch (e) {
      setDbMessage(`Lưu SQLite thất bại: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleExportPdf() {
    const api = dbApi();
    if (!api || !specimen) return;
    const result = await api.exportPdf(specimen.id);
    if (result.ok) setDbMessage(`Đã xuất PDF: ${result.path}`);
    else if (result.error) setDbMessage(result.error);
  }

  const channelStatus = channelCount === 3
    ? [1, 2, 3].map((id) => `HX${id} ${!enabledChannels[id - 1] ? "TẮT" : hxStates[id - 1] === undefined ? "--" : hxStates[id - 1] ? "READY" : "BUSY"}`).join(" · ")
    : `HX711 ${!enabledChannels[0] ? "TẮT" : hxReady ? "READY" : "NOT READY"}`;

  const statusText = !available
    ? "(Chỉ hỗ trợ bản Electron)"
    : connected
      ? `(ESP32 ${status.port ?? ""} · ${channelStatus})`
      : status.state === "trying"
        ? `(Đang thử ${status.port ?? ""}...)`
        : status.state === "disconnected"
          ? "(Mất kết nối - đang tìm lại...)"
          : status.state === "no_ports"
            ? "(Không thấy cổng USB Serial)"
            : "(Đang tìm ESP32...)";

  const channelProps = { latest, stats, channelCount, enabled: enabledChannels, labels: CHANNEL_LABELS, colors: CHANNEL_COLORS };
  const canStart = connected && !recording && !!specimen;

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

      {/* PROJECT / MẪU */}
      <ProjectBar disabled={recording} specimen={specimen} onSelectSpecimen={setSpecimen} />

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
            <StrainChart seriesRef={seriesRef} tick={tick} live={recording} flipY={flipY}
              channelCount={channelCount} showRaw={showRaw} enabledChannels={enabledChannels} />
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
              <span>Live Data · từng kênh độc lập</span>
              <div className="h5kt-panel-actions">
                <button title="Minimize">_</button>
                <button title="Close">✕</button>
              </div>
            </div>
            <div className="h5kt-live-data">
              <StrainChannelReadings {...channelProps} />
            </div>
          </section>

          {/* STRAIN */}
          <section className="h5kt-panel h5kt-sigma-eps-panel">
            <div className="h5kt-panel-header">
              <span>Strain (ε) · hiệu chuẩn riêng từng kênh</span>
              <div className="h5kt-panel-actions">
                <button title="Minimize">_</button>
                <button title="Close">✕</button>
              </div>
            </div>
            <div className="h5kt-sigma-eps-body">
              <StrainChannelCalibration {...channelProps} factorTexts={factorTexts} inversions={inversions}
                onFactorChange={(index, text) => setFactorTexts((old) => old.map((value, i) => i === index ? text : value))}
                onInvertChange={(index, inverted) => setInversions((old) => old.map((value, i) => i === index ? inverted : value))} />
              <LengthCalibrationPanel latest={latest} enabled={enabledChannels} channelCount={channelCount}
                recording={recording} calibrations={lengthCalibrations} onApply={applyLengthCalibration}
                storageError={lengthStorageError} />
            </div>
          </section>
        </div>
      </div>

      {/* BOTTOM RESULTS AREA */}
      <section className="h5kt-panel h5kt-results">
        <div className="h5kt-results__toolbar">
          <span className="h5kt-results__title">{channelCount === 3 ? "Testing - 3 HX711" : "Testing - Single Mode"}</span>
          <div className="h5kt-results__tools">
            <span style={{ fontSize: 12 }}>Kênh đã nối cảm biến:</span>
            {CHANNEL_LABELS.slice(0, channelCount).map((label, index) => (
              <label key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                title={`${label}: chỉ bật khi đã nối strain gauge/load cell. Tắt = đường 0.`}>
                <input type="checkbox" checked={enabledChannels[index]}
                  onChange={(event) => setEnabledChannels((old) => old.map((enabled, i) => i === index ? event.target.checked : enabled))} />
                <span className="h5kt-channel-label" style={{ color: CHANNEL_COLORS[index] }}>{`HX${index + 1}`}</span>
              </label>
            ))}
            {channelCount === 3 && <>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />
                Hiện Δ raw
              </label>
            </>}
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
              disabled={!canStart}
              style={dis(!canStart)}
              onClick={start}
              title={specimen
                ? "Kẹp mẫu trước, rồi bấm START: mốc 0 được lấy tại thời điểm này"
                : "Hãy chọn project và mẫu trước khi START"}
            >
              ▶ START
            </button>
            <button disabled={!connected || !recording} style={dis(!connected || !recording)} onClick={handleStop}>
              ■ STOP
            </button>
            <button
              disabled={!specimen || savedRuns === 0 || recording}
              style={dis(!specimen || savedRuns === 0 || recording)}
              onClick={handleExportPdf}
              title="Xuất PDF phiên đo gần nhất của mẫu đang chọn (lấy từ SQLite)"
            >
              📄 PDF
            </button>
            <button disabled={recording || frameCount === 0} style={dis(recording || frameCount === 0)} onClick={clear}>
              🧹 Xóa
            </button>
            <span style={{ fontSize: 12, color: "#aaa" }}>Số mẫu: {frameCount}{channelCount === 3 ? " / kênh" : ""}</span>
            {dbMessage && <span style={{ fontSize: 12, color: "#8bc34a" }}>{dbMessage}</span>}
          </div>
        </div>

        <div className="h5kt-results__table-wrapper">
          <StrainTable rowsRef={rowsRef} tick={Math.floor(tick / 4)} />
        </div>
      </section>
    </div>
  );
}