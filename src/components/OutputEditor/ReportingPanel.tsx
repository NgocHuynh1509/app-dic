import { useState, type CSSProperties } from "react";
import { colors, s } from "./Styles";

interface ResultRow {
  order: number;
  name: string;
  header1: string;
  header2: string;
  units: string;
  formatType: string;
  format: number;
  widthIn: number;
  headerJustification: string;
  dataJustification: string;
  resultIndex: number;
}

const INITIAL_RESULTS: ResultRow[] = [
  {
    order: 1,
    name: "Break Stress",
    header1: "Break Stress",
    header2: "(Enter Value)",
    units: "MPa",
    formatType: "Significant Digits",
    format: 3,
    widthIn: 1,
    headerJustification: "Left",
    dataJustification: "Left",
    resultIndex: 0,
  },
  {
    order: 2,
    name: "Ultimate Force",
    header1: "Ultimate Force",
    header2: "(Enter Value)",
    units: "N",
    formatType: "Significant Digits",
    format: 3,
    widthIn: 1,
    headerJustification: "Left",
    dataJustification: "Left",
    resultIndex: 0,
  },
];

type ReportTab = "summary" | "single";
type PreviewPanel = "image-left" | "title" | "image-right" | "results" | "graph-1" | "graph-2" | null;

export default function ReportingPanel() {
  const [reportTab, setReportTab] = useState<ReportTab>("summary");
  const [results, setResults] = useState<ResultRow[]>(INITIAL_RESULTS);
  const [selectedRow, setSelectedRow] = useState<number | null>(0);
  const [activePanel, setActivePanel] = useState<PreviewPanel>(null);

  const [showResultsOnScreen, setShowResultsOnScreen] = useState(true);
  const [reportConsolidation, setReportConsolidation] = useState(false);
  const [showStatisticsOnly, setShowStatisticsOnly] = useState(false);

  function addResultRow() {
    setResults((prev) => [
      ...prev,
      {
        order: prev.length + 1,
        name: "New Result",
        header1: "New Result",
        header2: "(Enter Value)",
        units: "",
        formatType: "Significant Digits",
        format: 3,
        widthIn: 1,
        headerJustification: "Left",
        dataJustification: "Left",
        resultIndex: 0,
      },
    ]);
  }

  function deleteResultRow() {
    if (selectedRow === null) return;
    setResults((prev) => prev.filter((_, i) => i !== selectedRow));
    setSelectedRow(null);
  }

  const stackFieldRow: CSSProperties = { ...s.fieldRow, flexDirection: "column", alignItems: "stretch" };

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 10, width: "100%", height: "100%", minHeight: 0 }}>
      {/* Left settings column */}
      <div
        style={{
          flex: "0 0 200px",
          minWidth: 0,
          background: colors.panelBg,
          border: `1px solid ${colors.border}`,
          padding: "8px 0",
          boxSizing: "border-box",
        }}
      >
        <div style={stackFieldRow}>
          <label>Name:</label>
          <input style={s.fieldInput} defaultValue="Summary Report" />
        </div>
        <div style={stackFieldRow}>
          <label>Type:</label>
          <select style={s.fieldInput} defaultValue="Summary">
            <option>Summary</option>
            <option>Single</option>
          </select>
        </div>
        <div style={stackFieldRow}>
          <label>Paper Size:</label>
          <select style={s.fieldInput} defaultValue="Letter">
            <option>Letter</option>
            <option>A4</option>
            <option>Legal</option>
          </select>
        </div>
        <div style={stackFieldRow}>
          <label>Orientation:</label>
          <select style={s.fieldInput} defaultValue="Landscape">
            <option>Landscape</option>
            <option>Portrait</option>
          </select>
        </div>

        <label style={s.checkboxRow}>
          <input
            type="checkbox"
            checked={showResultsOnScreen}
            onChange={(e) => setShowResultsOnScreen(e.target.checked)}
          />
          Show Results On Screen
        </label>
        <label style={s.checkboxRow}>
          <input
            type="checkbox"
            checked={reportConsolidation}
            onChange={(e) => setReportConsolidation(e.target.checked)}
          />
          Report Consolidation
        </label>
        <label style={{ ...s.checkboxRow, paddingLeft: 22 }}>
          <input
            type="checkbox"
            disabled={!reportConsolidation}
            checked={showStatisticsOnly}
            onChange={(e) => setShowStatisticsOnly(e.target.checked)}
          />
          Show Statistics Only
        </label>

        <button
          style={{
            margin: "10px 8px 4px",
            background: "#eef1f3",
            border: `1px solid ${colors.border}`,
            padding: "6px 8px",
            fontSize: 11,
            cursor: "pointer",
            width: "calc(100% - 16px)",
            textAlign: "left",
          }}
        >
          ⚙ Automatic Options
        </button>
      </div>

      {/* Right: designer + result selection */}
      <div
        style={{
          flex: "1 1 0%",
          minWidth: 0,
          minHeight: 0,
          background: colors.panelBg,
          border: `1px solid ${colors.border}`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", gap: 2, padding: "4px 8px 0", background: colors.headerBg, flex: "0 0 auto" }}>
          <button style={s.tab(reportTab === "summary")} onClick={() => setReportTab("summary")}>
            Summary Report
            {reportTab === "summary" && <span style={{ color: "#8a333a", fontWeight: 700 }}>×</span>}
          </button>
          <button style={s.tab(reportTab === "single")} onClick={() => setReportTab("single")}>
            Single Report
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 6,
            borderBottom: `1px solid ${colors.border}`,
            background: "#f4f6f7",
            flex: "0 0 auto",
          }}
        >
          {["Layouts", "Add", "Zoom", "Preview", "Edit", "Enlarge", "Shrink", "Delete", "Position"].map(
            (label) => (
              <button key={label} style={s.toolbarBtn}>
                {label}
              </button>
            )
          )}
        </div>

        <div style={{ ...s.panelHeader, flex: "0 0 auto" }}>Report Preview</div>
        <div
          style={{
            margin: "8px auto",
            width: "100%",
            maxWidth: 1000,
            border: "1px solid #9aa4ab",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            flex: "1 1 0%",
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", borderBottom: "1px solid #c9cfd4", flex: "0 0 auto" }}>
            <PreviewCell
              label="Image"
              active={activePanel === "image-left"}
              onClick={() => setActivePanel("image-left")}
            />
            <PreviewCell
              label="Title"
              active={activePanel === "title"}
              onClick={() => setActivePanel("title")}
            />
            <PreviewCell
              label="Image"
              active={activePanel === "image-right"}
              onClick={() => setActivePanel("image-right")}
            />
          </div>

          {/* Batches: 2 ô riêng biệt, có viền, cao hơn để dễ đọc */}
          <div style={{ display: "flex", borderBottom: "1px solid #c9cfd4", flex: "0 0 auto" }}>
            <BatchesCell label="Method Name:" />
            <BatchesCell label="Output Name:" />
          </div>

          <div
            style={{
              position: "relative",
              flex: "2 1 0%",
              minHeight: 0,
              cursor: "pointer",
              padding: "6px 8px 8px",
              outline: activePanel === "results" ? `2px solid ${colors.ribbonActive}` : "none",
              outlineOffset: -2,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              // Chặn mọi nội dung con (ví dụ chữ "Results" ghost) tràn ra
              // ngoài khối này, để nó không bao giờ đè lên khối Graph bên dưới.
              overflow: "hidden",
            }}
            onClick={() => setActivePanel("results")}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                fontSize: 9,
                color: "#46525f",
                borderBottom: "1px solid #dfe3e6",
                paddingBottom: 4,
                flexWrap: "wrap",
                flex: "0 0 auto",
              }}
            >
              {[
                "Width\nin",
                "Thickness\nin",
                "Area\nin\u00b2",
                "Modulus\nMpsi",
                "Ultimate Force\nlbf",
                "Ultimate Stress\nksi",
                "Offset @ 0.2%\nlbf",
                "Offset @ 0.2%\nksi",
                "TE (Manual)\n%",
                "Area (Reduction)\n%",
              ].map((h) => (
                <div key={h} style={{ minWidth: 46 }}>
                  {h.split("\n").map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              ))}
            </div>
            <div
              style={{
                flex: "1 1 0%",
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.ghost,
                fontSize: 46,
                fontWeight: 700,
              }}
            >
              Results
            </div>
          </div>

          {/* Graph: chiếm 1/2 chiều cao còn lại của khung Report Preview,
              Results (ở trên) chiếm 1/2 còn lại — cả hai đều dùng
              flex: "1 1 0%" nên luôn chia đôi bằng nhau, không phụ thuộc
              nội dung. overflow hidden để nội dung graph không tràn ra
              ngoài phần được chia. */}
          <div
            style={{
              display: "flex",
              flex: "3 1 0%",
              minHeight: 0,
              borderTop: "1px solid #c9cfd4",
              overflow: "hidden",
            }}
          >
            <MiniGraph
              title="Graph"
              yLabel="Stress (ksi)"
              xLabel="Strain (%)"
              yMax={50}
              xMax={2}
              yStep={5}
              xStep={0.2}
              active={activePanel === "graph-1"}
              onClick={() => setActivePanel("graph-1")}
              withDivider
            />
            <MiniGraph
              title="Graph"
              yLabel="Force (lbf)"
              xLabel="Position (in)"
              yMax={20000}
              xMax={1}
              yStep={2000}
              xStep={0.1}
              active={activePanel === "graph-2"}
              onClick={() => setActivePanel("graph-2")}
            />
          </div>
        </div>

        {activePanel === "results" && (
          <div style={{ margin: 10, borderTop: "2px solid #c3cad0", paddingTop: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px",
                color: colors.selectedBarText,
                background: colors.selectedBarBg,
                fontSize: 12,
              }}
            >
              <button
                style={{
                  background: colors.danger,
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                }}
                onClick={() => setActivePanel(null)}
              >
                ◀
              </button>
              <span>
                Report: <b>Summary Report</b> &nbsp; Section: <b>UTM Results</b>
              </span>
            </div>

            <div style={s.toolbar}>
              <button style={s.toolbarBtn} onClick={addResultRow}>
                Add
              </button>
              {["Insert Before", "Insert After", "Cut", "Copy", "Paste Current", "Paste Before", "Paste After"].map(
                (label) => (
                  <button key={label} style={s.toolbarBtn}>
                    {label}
                  </button>
                )
              )}
              <button style={s.toolbarBtn} onClick={deleteResultRow}>
                Delete
              </button>
              <button style={s.toolbarBtn}>Expand All</button>
              <button style={s.toolbarBtn}>Collapse All</button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ ...s.table, minWidth: 900, marginTop: 4 }}>
                <thead>
                  <tr>
                    <th style={s.th}>Order #</th>
                    <th style={s.th}>Result Name</th>
                    <th style={s.th}>Header 1</th>
                    <th style={s.th}>Header 2</th>
                    <th style={s.th}>Units</th>
                    <th style={s.th}>Format Type</th>
                    <th style={s.th}>Format</th>
                    <th style={s.th}>Width, in</th>
                    <th style={s.th}>Header Justification</th>
                    <th style={s.th}>Data Justification</th>
                    <th style={s.th}>Result Index</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        cursor: "pointer",
                        background: selectedRow === i ? colors.rowSelected : undefined,
                      }}
                      onClick={() => setSelectedRow(i)}
                    >
                      <td style={s.td}>{r.order}</td>
                      <td style={s.td}>{r.name}</td>
                      <td style={s.td}>{r.header1}</td>
                      <td style={{ ...s.td, fontStyle: "italic", color: "#8a919a" }}>{r.header2}</td>
                      <td style={s.td}>{r.units}</td>
                      <td style={s.td}>{r.formatType}</td>
                      <td style={s.td}>{r.format}</td>
                      <td style={s.td}>{r.widthIn}</td>
                      <td style={s.td}>{r.headerJustification}</td>
                      <td style={s.td}>{r.dataJustification}</td>
                      <td style={s.td}>{r.resultIndex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewCell({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      style={{
        position: "relative",
        flex: "1 1 0%",
        minWidth: 0,
        height: 72,
        borderRight: "1px dashed #cf5b63",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        outline: active ? `2px solid ${colors.ribbonActive}` : "none",
        outlineOffset: -2,
        boxSizing: "border-box",
      }}
      onClick={onClick}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 8,
          color: colors.danger,
          fontWeight: 600,
        }}
      >
        (PANEL NOT CONFIGURED)
      </span>
      <span style={{ color: colors.ghost, fontSize: 22, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

// Method Name / Output Name — a bordered cell like PreviewCell above, but
// taller and with the field label pinned top-left instead of centered.
function BatchesCell({ label }: { label: string }) {
  return (
    <div
      style={{
        flex: "1 1 0%",
        minWidth: 0,
        height: 56,
        borderRight: "1px solid #c9cfd4",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <span style={{ position: "absolute", top: 4, left: 8, fontSize: 10, color: "#46525f" }}>{label}</span>
      <span style={{ color: colors.ghost, fontSize: 20, fontWeight: 700 }}>Batches</span>
    </div>
  );
}

// yStep/xStep drive both the number of grid lines drawn and the tick labels,
// so the axis always reads in the same round increments as the reference
// screenshots (Stress every 5 ksi, Strain every 0.2%, Force every 2,000 lbf,
// Position every 0.1 in) instead of an arbitrary fixed tick count.
//
// Đồ thị co giãn lấp đầy chiều cao được cấp (container cha quyết định, hiện
// đang là 1/2 khung Report Preview) thay vì dùng chiều cao SVG cố định:
// cột ngoài dùng flexDirection: "column" + flex: 1 trên chính svg, và
// preserveAspectRatio="none" để svg lấp đầy hoàn toàn ô của nó theo cả hai
// chiều, không chừa khoảng trống hay bị giới hạn bởi tỉ lệ viewBox gốc.
function MiniGraph({
  title,
  yLabel,
  xLabel,
  yMax,
  xMax,
  yStep,
  xStep,
  active,
  onClick,
  withDivider,
}: {
  title: string;
  yLabel: string;
  xLabel: string;
  yMax: number;
  xMax: number;
  yStep: number;
  xStep: number;
  active: boolean;
  onClick: () => void;
  withDivider?: boolean;
}) {
  const yTicks = Math.round(yMax / yStep);
  const xTicks = Math.round(xMax / xStep);
  return (
    <div
      style={{
        position: "relative",
        flex: "1 1 0%",
        minWidth: 0,
        minHeight: 0,
        padding: "4px 6px",
        cursor: "pointer",
        borderRight: withDivider ? "1px solid #c9cfd4" : "none",
        outline: active ? `2px solid ${colors.ribbonActive}` : "none",
        outlineOffset: -2,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onClick}
    >
      <div
        style={{
          position: "absolute",
          top: "46%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: colors.ghost,
          fontSize: 20,
          fontWeight: 700,
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: 2,
          transform: "rotate(-90deg) translateX(50%)",
          fontSize: 9,
          fontWeight: 600,
        }}
      >
        {yLabel}
      </div>
      <svg
        viewBox="0 0 300 190"
        preserveAspectRatio="none"
        style={{ width: "100%", flex: "1 1 0%", minHeight: 0, display: "block" }}
      >
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const y = 6 + (1 - i / yTicks) * 145;
          return (
            <g key={i}>
              <line x1={44} y1={y} x2={290} y2={y} stroke="#dfe3e6" />
              <text x={40} y={y + 3} fontSize="8" textAnchor="end">
                {(yStep * i).toLocaleString(undefined, { minimumFractionDigits: yStep < 1 ? 2 : 0 })}
              </text>
            </g>
          );
        })}
        {Array.from({ length: xTicks + 1 }, (_, i) => {
          const x = 44 + (i / xTicks) * 246;
          return (
            <g key={i}>
              <line x1={x} y1={6} x2={x} y2={151} stroke="#dfe3e6" />
              <text x={x} y={163} fontSize="8" textAnchor="middle">
                {(xStep * i).toFixed(xStep < 1 ? 2 : 0)}
              </text>
            </g>
          );
        })}
        <rect x={44} y={6} width={246} height={145} fill="none" stroke="#9aa4ab" />
      </svg>
      <div style={{ textAlign: "center", fontSize: 10, fontWeight: 600, flex: "0 0 auto" }}>{xLabel}</div>
    </div>
  );
}