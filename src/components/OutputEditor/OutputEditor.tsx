import overviewIcon from "../../assets/output-overview.svg";
import liveDataIcon from "../../assets/live-data.svg";
import resultLimitsIcon from "../../assets/result-limits.svg";
import graphingIcon from "../../assets/graphing.svg";
import reportingIcon from "../../assets/reporting.svg";
import dataExportingIcon from "../../assets/data-exporting.svg";
import { useState } from "react";
import type { CSSProperties } from "react";
import GraphingPanel from "./GraphingPanel";
import ReportingPanel from "./ReportingPanel";
import OutputOverviewPanel from "./OutputOverviewPanel.tsx";
import LiveDataPanel from "./LiveDataPanel.tsx";
import ResultLimitsPanel from "./ResultLimitsPanel.tsx";
import DataExportingPanel from "./DataExportingPanel.tsx";
import { colors, s } from "./Styles";

export type OutputSubTab =
  | "overview"
  | "live-data"
  | "result-limits"
  | "graphing"
  | "reporting"
  | "data-exporting";

interface SubNavItem {
  id: OutputSubTab;
  label: string;
  icon: string;
}

const SUB_NAV: SubNavItem[] = [
  {
    id: "overview",
    label: "Output\nOverview",
    icon: overviewIcon,
  },
  {
    id: "live-data",
    label: "Live\nData",
    icon: liveDataIcon,
  },
  {
    id: "result-limits",
    label: "Result\nLimits",
    icon: resultLimitsIcon,
  },
  {
    id: "graphing",
    label: "Graphing",
    icon: graphingIcon,
  },
  {
    id: "reporting",
    label: "Reporting",
    icon: reportingIcon,
  },
  {
    id: "data-exporting",
    label: "Data\nExporting",
    icon: dataExportingIcon,
  },
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

const actionBtnStyle = (variant?: "gold" | "danger"): CSSProperties => ({
  background: variant === "gold" ? colors.gold : "#3a4552",
  border: variant === "gold" ? "1px solid #a9840f" : "1px solid #55626f",
  color: variant === "gold" ? "#241c04" : variant === "danger" ? "#ff8a8a" : "#dfe4e8",
  padding: "5px 10px",
  borderRadius: 3,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: variant === "gold" ? 600 : 400,
});

interface OutputEditorProps {
  /** Name shown in the "Selected Output:" bar */
  selectedOutputName?: string;
}

export default function OutputEditor({
  selectedOutputName = "Generic Compression - Force vs. Position",
}: OutputEditorProps) {
  const [subTab, setSubTab] = useState<OutputSubTab>("graphing");

  return (
    <div style={s.page}>
      {/* Sub-navigation ribbon */}
      <div style={ribbonStyle}>
        {SUB_NAV.map((item) => (
          <button
            key={item.id}
            style={ribbonBtnStyle(subTab === item.id)}
            onClick={() => setSubTab(item.id)}
          >
            <img
              src={item.icon}
              alt=""
              style={{
                width: 22,
                height: 22,
                objectFit: "contain",
                display: "block",
              }}
            />
            <span style={{ fontSize: 10, lineHeight: 1.15, textAlign: "center" }}>
              {item.label.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button style={actionBtnStyle()}>🔍</button>
          <button style={actionBtnStyle("gold")}>Load</button>
          <button style={actionBtnStyle("gold")}>Save</button>
          <button style={actionBtnStyle()}>Save As...</button>
          <button style={actionBtnStyle("danger")}>Delete Output</button>
        </div>
      </div>

      {/* Selected output bar */}
      <div
        style={{
          background: colors.selectedBarBg,
          color: colors.selectedBarText,
          padding: "6px 12px",
          fontSize: 12,
          borderBottom: "1px solid #10151b",
          boxSizing: "border-box",
        }}
      >
        <span style={{ color: "#cfd6dc", marginRight: 6 }}>Selected Output:</span>
        {selectedOutputName}
      </div>

      {/* Body */}
      <div style={s.body}>
        {subTab === "graphing" && <GraphingPanel />}
        {subTab === "reporting" && <ReportingPanel />}
        {subTab === "overview" && <OutputOverviewPanel />}
        {subTab === "live-data" && <LiveDataPanel />}
        {subTab === "result-limits" && <ResultLimitsPanel />}
        {subTab === "data-exporting" && <DataExportingPanel />}
      </div>
    </div>
  );
}