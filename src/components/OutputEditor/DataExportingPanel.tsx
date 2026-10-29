import { s } from "./Styles";
import { EMPTY_TEXT, formatTime } from "./useSavedRuns";
import type { SavedRuns } from "./useSavedRuns";

export default function DataExportingPanel({ saved }: { saved: SavedRuns }) {
  const { detail } = saved;
  if (!detail) {
    return <div style={{ padding: 40, textAlign: "center", color: "#8a919a" }}>{EMPTY_TEXT}</div>;
  }
  return (
    <div style={{ ...s.colPane, width: "100%" }}>
      <div style={s.panelHeader}>Xuất kết quả (Export)</div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          Lần đo: <b>#{detail.run.runId}</b> · {detail.run.projectName} · {detail.run.specimenName} ·{" "}
          {formatTime(detail.run.startedAt)}
        </div>
        <div style={{ color: "#8a919a" }}>File PDF gồm: bảng kết quả (Lu, ReL, Fm, Rm), bảng thông số mẫu
          (M, S0, t, b, bu, Lo), 1 biểu đồ chung và 3 biểu đồ riêng từng cổng.</div>
        <div>
          <button style={{ ...s.toolbarBtn, padding: "6px 14px", fontSize: 12 }} onClick={() => void saved.exportPdf()}>
            📄 Xuất PDF
          </button>
        </div>
        {saved.message && <div style={{ color: "#8bc34a" }}>{saved.message}</div>}
      </div>
    </div>
  );
}