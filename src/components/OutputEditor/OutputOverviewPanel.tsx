import { useState } from "react";
import { colors, s } from "./Styles";

interface OverviewSection {
  id: string;
  label: string;
  count: number;
  items: string[];
}

const SECTIONS: OverviewSection[] = [
  { id: "plots", label: "Graphs / Plots", count: 2, items: ["Force vs. Position", "Force vs. Time"] },
  { id: "results", label: "Calculated Results", count: 2, items: ["Break Stress", "Ultimate Force"] },
  { id: "reports", label: "Reports", count: 2, items: ["Summary Report", "Single Report"] },
  { id: "exports", label: "Data Exports", count: 1, items: ["CSV export on test complete"] },
];

export default function OutputOverviewPanel() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    plots: true,
    results: true,
    reports: true,
    exports: true,
  });

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div style={s.twoColRow}>
      {/* Left: general info */}
      <div style={{ ...s.colPane, flex: "0 0 320px" }}>
        <div style={s.panelHeader}>Output Information</div>
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={s.fieldRow}>
            <label style={{ flex: "0 0 90px" }}>Output Name:</label>
            <input style={s.fieldInput} defaultValue="Generic Compression - Force vs. Position" />
          </div>
          <div style={{ ...s.fieldRow, alignItems: "flex-start" }}>
            <label style={{ flex: "0 0 90px" }}>Description:</label>
            <textarea
              style={{ ...s.fieldInput, minHeight: 60, resize: "vertical" }}
              defaultValue="Standard compression output used for generic foam and rubber specimens."
            />
          </div>
          <div style={s.fieldRow}>
            <label style={{ flex: "0 0 90px" }}>Test Standard:</label>
            <input style={s.fieldInput} defaultValue="ASTM D575" />
          </div>
          <div style={s.fieldRow}>
            <label style={{ flex: "0 0 90px" }}>Last Modified:</label>
            <input style={s.fieldInput} readOnly value="9/16/2026 10:27 AM" />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${colors.border}` }}>
          <div style={s.panelHeader}>Used By Methods</div>
          <div style={{ padding: "6px 10px", fontSize: 12 }}>
            <div>• Generic Compression</div>
            <div>• Generic Compression - Foam</div>
          </div>
        </div>
      </div>

      {/* Right: content checklist / preview tree */}
      <div style={s.colPane}>
        <div style={s.panelHeader}>Output Contents</div>
        <div style={{ padding: 4 }}>
          {SECTIONS.map((section) => (
            <div key={section.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
              <button
                onClick={() => toggle(section.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#f4f6f7",
                  border: "none",
                  padding: "6px 8px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: "left",
                }}
              >
                <span>
                  {expanded[section.id] ? "▾" : "▸"} {section.label}
                </span>
                <span
                  style={{
                    background: colors.ribbonActive,
                    color: "#fff",
                    borderRadius: 10,
                    padding: "1px 8px",
                    fontSize: 10,
                  }}
                >
                  {section.count}
                </span>
              </button>
              {expanded[section.id] && (
                <ul style={{ margin: 0, padding: "4px 8px 8px 28px", fontSize: 12 }}>
                  {section.items.map((item) => (
                    <li key={item} style={{ padding: "2px 0" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}