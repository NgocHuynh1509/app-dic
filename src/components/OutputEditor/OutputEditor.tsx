import overviewIcon from "../../assets/output-overview.svg";
import resultsIcon from "../../assets/result-limits.svg";
import graphingIcon from "../../assets/graphing.svg";
import dataIcon from "../../assets/live-data.svg";
import exportIcon from "../../assets/data-exporting.svg";
import { useState } from "react";
import type { CSSProperties } from "react";
import OutputOverviewPanel from "./OutputOverviewPanel";
import ResultsPanel from "./ResultsPanel";
import GraphingPanel from "./GraphingPanel";
import MeasurementsPanel from "./MeasurementsPanel";
import DataExportingPanel from "./DataExportingPanel";
import { colors, s } from "./Styles";
import { formatTime, useSavedRuns } from "./useSavedRuns";

export type OutputSubTab = "overview" | "results" | "graphing" | "data" | "export";

interface SubNavItem {
  id: OutputSubTab;
  label: string;
  icon: string;
}

const SUB_NAV: SubNavItem[] = [
  { id: "overview", label: "Tổng\nquan", icon: overviewIcon },
  { id: "results", label: "Kết\nquả", icon: resultsIcon },
  { id: "graphing", label: "Biểu\nđồ", icon: graphingIcon },
  { id: "data", label: "Dữ liệu\nđo", icon: dataIcon },
  { id: "export", label: "Xuất\nPDF", icon: exportIcon },
];

const ribbonStyle: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  background: `linear-gradient(${colors.ribbonBg1}, ${colors.ribbonBg2})`,
  borderBottom: "1px solid #10151b",
  padding: "4px 8px",
  gap: 4,
  boxSizing: "border-box",
};

const ribbonBtnStyle = (active: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  background: active ? colors.ribbonActive : "transparent",
  border: active ? "1px solid #6bbf42" : "1px solid transparent",
  color: active ? "#fff" : colors.ribbonText,
  padding: "4px 10px",
  cursor: "pointer",
  borderRadius: 3,
  minWidth: 64,
  boxSizing: "border-box",
});

const actionBtnStyle = (variant?: "gold" | "danger", disabled?: boolean): CSSProperties => ({
  background: variant === "gold" ? colors.gold : "#3a4552",
  border: variant === "gold" ? "1px solid #a9840f" : "1px solid #55626f",
  color: variant === "gold" ? "#241c04" : variant === "danger" ? "#ff8a8a" : "#dfe4e8",
  padding: "5px 10px",
  borderRadius: 3,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1,
  fontSize: 11,
  fontWeight: variant === "gold" ? 600 : 400,
});

export default function OutputEditor() {
  const [subTab, setSubTab] = useState<OutputSubTab>("overview");
  const saved = useSavedRuns();
  const noRun = saved.runId == null;

  return (
    <div style={s.page}>
      {/* Ribbon */}
      <div style={ribbonStyle}>
        {SUB_NAV.map((item) => (
          <button key={item.id} style={ribbonBtnStyle(subTab === item.id)} onClick={() => setSubTab(item.id)}>
            <img src={item.icon} alt="" style={{ width: 22, height: 22, objectFit: "contain", display: "block" }} />
            <span style={{ fontSize: 10, lineHeight: 1.15, textAlign: "center" }}>
              {item.label.split("\n").map((line, i) => (
                <span key={i}>{line}<br /></span>
              ))}
            </span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button style={actionBtnStyle()} onClick={() => void saved.reload()}>⟳ Làm mới</button>
          <button style={actionBtnStyle("gold", noRun)} disabled={noRun} onClick={() => void saved.exportPdf()}>
            📄 Xuất PDF
          </button>
          <button style={actionBtnStyle("danger", noRun)} disabled={noRun} onClick={() => void saved.remove()}>
            Xóa lần đo
          </button>
        </div>
      </div>

      {/* Thanh chọn lần đo */}
      <div
        style={{
          background: colors.selectedBarBg,
          color: colors.selectedBarText,
          padding: "6px 12px",
          fontSize: 12,
          borderBottom: "1px solid #10151b",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "#cfd6dc" }}>Lần đo đang chọn:</span>
        <select
          style={{ ...s.fieldInput, width: 460, flex: "none" }}
          value={saved.runId ?? ""}
          onChange={(e) => saved.setRunId(e.target.value ? Number(e.target.value) : null)}
          disabled={saved.runs.length === 0}
        >
          {saved.runs.length === 0 && <option value="">(chưa có lần đo nào)</option>}
          {saved.runs.map((r) => (
            <option key={r.runId} value={r.runId}>
              {`#${r.runId} · ${r.projectName} · ${r.specimenName} · ${formatTime(r.startedAt)}`}
            </option>
          ))}
        </select>
        {saved.message && <span style={{ color: "#8bc34a" }}>{saved.message}</span>}
      </div>

      {/* Nội dung */}
      <div style={s.body}>
        {!saved.available ? (
          <div style={{ padding: 40, textAlign: "center", color: "#8a919a" }}>Chỉ hỗ trợ bản Electron.</div>
        ) : (
          <>
            {subTab === "overview" && <OutputOverviewPanel saved={saved} onView={() => setSubTab("results")} />}
            {subTab === "results" && <ResultsPanel saved={saved} />}
            {subTab === "graphing" && <GraphingPanel saved={saved} />}
            {subTab === "data" && <MeasurementsPanel saved={saved} />}
            {subTab === "export" && <DataExportingPanel saved={saved} />}
          </>
        )}
      </div>
    </div>
  );
}