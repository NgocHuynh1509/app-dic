import type { CSSProperties } from "react";
import { colors, s } from "./Styles";
import { EMPTY_TEXT, chartSrc, dash, formatTime } from "./useSavedRuns";
import type { SavedRuns } from "./useSavedRuns";

interface Props {
  saved: SavedRuns;
  onView: () => void;
}

const dis = (d: boolean): CSSProperties | undefined => (d ? { opacity: 0.45, cursor: "not-allowed" } : undefined);

export default function OutputOverviewPanel({ saved, onView }: Props) {
  const { runs, runId, setRunId, detail } = saved;
  const empty = runs.length === 0;
  const overall = detail?.charts.find((c) => c.port === 0) ?? detail?.charts[0];
  const resultOf = (port: number) => detail?.results.find((r) => r.port === port);
  const shown = detail ? detail.ports.filter((p) => resultOf(p.port)) : [];

  return (
    <div style={s.twoColRow}>
      {/* Trái: danh mục các lần đo */}
      <div style={{ ...s.colPane, flex: "1.2 1 0%" }}>
        <div style={s.panelHeader}>Danh mục các lần đo, tổng số: {runs.length}</div>
        <div style={s.toolbar}>
          <button style={{ ...s.toolbarBtn, ...dis(empty) }} disabled={empty} onClick={onView}>Xem kết quả (View)</button>
          <button style={{ ...s.toolbarBtn, ...dis(empty) }} disabled={empty} onClick={() => void saved.exportPdf()}>
            Xuất PDF (Export)
          </button>
          <button style={{ ...s.toolbarBtn, ...dis(empty) }} disabled={empty} onClick={() => void saved.remove()}>
            Xóa (Delete)
          </button>
        </div>

        {empty ? (
          <div style={{ padding: 30, textAlign: "center", color: "#8a919a" }}>{EMPTY_TEXT}</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Mã</th>
                <th style={s.th}>Project</th>
                <th style={s.th}>Mẫu (Specimen)</th>
                <th style={s.th}>Giờ / Ngày đo</th>
                <th style={s.th}>Số dòng</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.runId}
                  style={{ cursor: "pointer", background: runId === r.runId ? colors.rowSelected : undefined }}
                  onClick={() => setRunId(r.runId)}
                  onDoubleClick={onView}
                >
                  <td style={s.td}>#{r.runId}</td>
                  <td style={s.td}>{r.projectName}</td>
                  <td style={s.td}>{r.specimenName}</td>
                  <td style={s.td}>{formatTime(r.startedAt)}</td>
                  <td style={s.td}>{r.rowCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Phải: tóm tắt + biểu đồ */}
      <div style={{ ...s.colPane, flex: "1.4 1 0%" }}>
        <div style={s.panelHeader}>Tóm tắt lần đo</div>
        {!detail ? (
          <div style={{ padding: 30, textAlign: "center", color: "#8a919a" }}>{empty ? EMPTY_TEXT : "Đang tải..."}</div>
        ) : (
          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={s.fieldRow}><label style={s.fieldLabel}>Project:</label><span>{detail.run.projectName}</span></div>
              <div style={s.fieldRow}><label style={s.fieldLabel}>Mẫu:</label><span>{detail.run.specimenName}</span></div>
              <div style={s.fieldRow}><label style={s.fieldLabel}>Thời gian đo:</label><span>{formatTime(detail.run.startedAt)}</span></div>
              <div style={s.fieldRow}><label style={s.fieldLabel}>Số dòng đã lưu:</label><span>{detail.run.rowCount}</span></div>
            </div>

            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>Fm (kN)</th>
                  <th style={s.th}>Rm (MPa)</th>
                  <th style={s.th}>M (N/mm²)</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr><td style={s.td} colSpan={4}>Không có kênh nào được bật khi đo.</td></tr>
                )}
                {shown.map((p) => {
                  const r = resultOf(p.port);
                  return (
                    <tr key={p.port}>
                      <td style={s.td}>NO.{p.port}</td>
                      <td style={s.td}>{dash(r?.fm_kn, 2)}</td>
                      <td style={s.td}>{dash(r?.rm_mpa, 0)}</td>
                      <td style={s.td}>{dash(r?.modulus_mpa, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={s.panelHeader}>Đồ thị kết quả thí nghiệm (Graph)</div>
            {overall ? (
              <div style={{ height: "clamp(180px, calc(100vh - 560px), 360px)", display: "flex", justifyContent: "center" }}>
                <img
                  src={chartSrc(overall.svg)}
                  alt="Biểu đồ σ–ε"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: "#8a919a" }}>
                Chưa có biểu đồ. Xem lý do ở tab Biểu đồ hoặc trong file PDF.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}