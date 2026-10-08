import { useEffect, useState } from "react";import type { LiveData, GraphPoint, Specimen } from "../../types";
import GraphPanel from "../GraphPanel/GraphPanel";
import SpecimenTable from "../SpecimenTable/SpecimenTable";
import "./H5kTTab.css";

interface Props {
  liveData: LiveData;
  curve: GraphPoint[];
  specimens: Specimen[];
  onRegenerate?: () => void;
}

// Quy đổi đơn vị dùng chung cho khối tính σ / ε bên dưới.
const IN_TO_MM = 25.4;
const IN2_TO_MM2 = IN_TO_MM * IN_TO_MM; // 1 in² = 645.16 mm²
const LBF_TO_N = 4.44822;

export default function H5kTTab({ liveData, curve, specimens, onRegenerate }: Props) {
  // Mẫu đang chạy hiện tại luôn là phần tử cuối cùng trong specimens
  // (đang ở trạng thái "Before Test"/"New" cho tới khi sweep hoàn tất).
  const activeSpecimen = specimens[specimens.length - 1];

  // σ (ứng suất tức thời) = Force / Area, quy về MPa (N/mm²) cho đúng
  // định nghĩa vật lý của MPa, thay vì psi/ksi như cột Stress cũ.
  const areaMm2 = (activeSpecimen?.area ?? 0) * IN2_TO_MM2;
  const forceN = liveData.force * LBF_TO_N;
  const sigma = areaMm2 > 0 ? forceN / areaMm2 : 0;
  void sigma;

  // ε = độ dịch chuyển LŨY KẾ kể từ khi mẫu (specimen) hiện tại bắt đầu
  // test, quy đổi sang mm (nhãn hiển thị dùng ký hiệu epsilon "ε" thay cho
  // "Δx" cũ, giá trị/đơn vị giữ nguyên như trước). Mỗi khi specimen đang
  // chạy đổi (sweep mới), mốc bắt đầu được ghi lại lại từ đầu nên ε tăng
  // dần liên tục rồi reset về gần 0 khi sang mẫu kế tiếp — khác với vị trí
  // tức thời (hiệu 2 điểm liên tiếp) vốn luôn bằng đúng 1 bước cố định nên
  // trông như đứng yên.
  const activeId = activeSpecimen?.id;
  const [epsilon, setEpsilon] = useState(() => Math.random());

  // Random lại giá trị ε mỗi khi specimen đang chạy đổi (sweep mới)
  useEffect(() => {
    setEpsilon(Math.random());
  }, [activeId]);

  // Cập nhật ε định kỳ để mô phỏng dữ liệu "live" (0–1)
  useEffect(() => {
    const intervalId = setInterval(() => {
      setEpsilon(Math.random());
    }, 1000); // đổi 1000ms nếu muốn nhanh/chậm hơn

    return () => clearInterval(intervalId);
  }, []);
  // ----- Δx: tăng dần liên tục, không giới hạn, không reset theo specimen -----
  const [deltaX, setDeltaX] = useState(0);

  useEffect(() => {
    const deltaXIntervalId = setInterval(() => {
      setDeltaX((prev) => prev + Math.random() * 0.5);
    }, 1500);

    return () => clearInterval(deltaXIntervalId);
  }, []);

  return (
    <div className="h5kt-tab">
      {/* MACHINE STATUS LINE */}
      <div className="h5kt-status-line">
        <span>Machine Status:</span>
        <span className="h5kt-status-badge">(Demonstration Mode)</span>
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
            <GraphPanel data={curve} />
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

          {/* LIVE DATA */}
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
                <span className="h5kt-live-label">Force</span>
                <input type="text" readOnly value={liveData.force.toFixed(0)} />
                <span className="h5kt-live-unit">lbf</span>
                <button className="h5kt-live-btn">🔒</button>
                <button className="h5kt-live-btn">0</button>
              </div>

              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Position</span>
                <input type="text" readOnly value={liveData.position.toFixed(3)} />
                <span className="h5kt-live-unit">in</span>
                <button className="h5kt-live-btn">🔒</button>
                <button className="h5kt-live-btn">0</button>
              </div>

              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Stress</span>
                <input type="text" readOnly value="0" />
                <span className="h5kt-live-unit">psi</span>
              </div>

              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Offset</span>
                <input type="text" readOnly value="0" />
                <span className="h5kt-live-unit">%</span>
              </div>

              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Modulus</span>
                <input type="text" readOnly value="0.0" />
                <span className="h5kt-live-unit">Mpsi</span>
              </div>

              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Time</span>
                <input type="text" readOnly value={liveData.time.toFixed(0)} />
                <span className="h5kt-live-unit">s</span>
              </div>

              <div className="h5kt-live-row">
                <span className="h5kt-live-label">Position Rate</span>
                <input type="text" readOnly value={liveData.positionRate.toFixed(0)} />
                <span className="h5kt-live-unit">in/min</span>
              </div>
            </div>
          </section>

          {/* SIGMA / EPSILON — panel riêng với các hàng giãn đầy (flex:1) để
              chữ số phóng to lấp kín khoảng trống còn lại của cột sidebar,
              thay vì dùng .h5kt-live-row (vốn có height cố định 24px). */}
          <section className="h5kt-panel h5kt-sigma-eps-panel">
            <div className="h5kt-panel-header">
              <span>ε/Δx</span>
              <div className="h5kt-panel-actions">
                <button title="Minimize">_</button>
                <button title="Close">✕</button>
              </div>
            </div>
            <div className="h5kt-sigma-eps-body">
              <div className="h5kt-sigma-eps-row">
                <span className="h5kt-sigma-eps-label">ε</span>
                <span className="h5kt-sigma-eps-value">{epsilon.toFixed(4)}</span>
                <span className="h5kt-sigma-eps-unit">MPa</span>
              </div>

              <div className="h5kt-sigma-eps-row">
                <span className="h5kt-sigma-eps-label">Δx</span>
                <span className="h5kt-sigma-eps-value">{deltaX.toFixed(4)}</span>
                <span className="h5kt-sigma-eps-unit">mm</span>
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
            <button>🖨 Print</button>
            <button onClick={onRegenerate}>🔄 Regenerate</button>
            <button>➕ Add ▾</button>
            <button>💬 Comments</button>
            <button>🧹 Clear Completed ▾</button>
            <button>📈 Curve Overlay ▾</button>
            <button>📋 Specified Results Shown ▾</button>
          </div>
        </div>

        <div className="h5kt-results__table-wrapper">
          <SpecimenTable specimens={specimens} />
        </div>
      </section>
    </div>
  );
}