import { useState, type ReactNode, type CSSProperties } from "react";
import { colors, s } from "./Styles";

interface PlotRow {
  id: number;
  name: string;
  ySource: string;
  xSource: string;
  color: string;
  pointSize: number;
  style: string;
}

interface GraphTab {
  id: string;
  label: string;
}

const GRAPH_TABS: GraphTab[] = [
  { id: "force-position", label: "Force vs. Position" },
  { id: "force-time", label: "Force vs. Time" },
];

const INITIAL_PLOTS: PlotRow[] = [
  {
    id: 1,
    name: "Force",
    ySource: "Force",
    xSource: "Position",
    color: "#1c1c1c",
    pointSize: 0.5,
    style: "Points and Lines",
  },
];

export default function GraphingPanel() {
  const [plots] = useState<PlotRow[]>(INITIAL_PLOTS);
  const [activeGraphTab, setActiveGraphTab] = useState("force-position");
  const [mainGraph, setMainGraph] = useState(true);
  const [lockPlotAtBreak, setLockPlotAtBreak] = useState(false);

  // Y Axis
  const [yUnitType, setYUnitType] = useState("Force");
  const [yUnits, setYUnits] = useState("N");
  const [yLabel, setYLabel] = useState("Force (N)");
  const [yFormat, setYFormat] = useState("Automatic");
  const [yRangeLow, setYRangeLow] = useState("0");
  const [yRangeHigh, setYRangeHigh] = useState("44.48");
  const [yRescaleHigh, setYRescaleHigh] = useState(true);
  const [yRescaleLow, setYRescaleLow] = useState(false);

  // X Axis
  const [xUnitType, setXUnitType] = useState("Length");
  const [xUnits, setXUnits] = useState("mm");
  const [xLabel, setXLabel] = useState("Position");
  const [xRangeHigh, setXRangeHigh] = useState("25.4");
  const [xRescaleHigh, setXRescaleHigh] = useState(true);
  const [dualAxisSource, setDualAxisSource] = useState("<None>");

  const yHigh = parseFloat(yRangeHigh) || 0;
  const xHigh = parseFloat(xRangeHigh) || 0;
  const Y_TICKS = 8;
  const X_TICKS = 10;

  return (
    <div style={s.stackCol}>
      {/* Top row: Requirements + Graph Preview (left) / Graph Options (right) */}
      <div style={s.twoColRow}>
        {/* Left: Requirements + Graph Preview */}
        <div style={s.colPane}>
          <div style={s.panelHeader}>Requirements</div>
          <div style={{ ...s.fieldRow, padding: "6px 8px" }}>
            <label style={{ flex: "0 0 50px" }}>Name:</label>
            <input style={s.fieldInput} value="Force vs. Position" readOnly />
          </div>
          <label style={s.checkboxRow}>
            <input
              type="checkbox"
              checked={mainGraph}
              onChange={(e) => setMainGraph(e.target.checked)}
            />
            Main Graph
          </label>
          <label style={s.checkboxRow}>
            <input
              type="checkbox"
              checked={lockPlotAtBreak}
              onChange={(e) => setLockPlotAtBreak(e.target.checked)}
            />
            Lock Plot at Break
          </label>

          <div style={{ ...s.tabsRow }}>
            {GRAPH_TABS.map((t) => (
              <button
                key={t.id}
                style={s.tab(activeGraphTab === t.id)}
                onClick={() => setActiveGraphTab(t.id)}
              >
                {t.label}
                {activeGraphTab === t.id && (
                  <span style={{ color: "#8a333a", fontWeight: 700 }}>×</span>
                )}
              </button>
            ))}
          </div>

          <div
            style={{
              borderTop: `1px solid ${colors.border}`,
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={s.panelHeader}>Graph Preview</div>
            <GraphPreviewSvg
              yLabel={yLabel}
              xLabel={`${xLabel} (${xUnits})`}
              yHigh={yHigh}
              xHigh={xHigh}
              yTicks={Y_TICKS}
              xTicks={X_TICKS}
            />
          </div>
        </div>

        {/* Right: Graph Options */}
        <div style={s.colPane}>
          <div style={s.panelHeader}>Graph Options</div>
          <div
            style={{
              padding: "4px 8px",
              fontSize: 11,
              color: "#46525f",
              background: "#f4f6f7",
              borderBottom: "1px solid #e0e4e7",
            }}
          >
            ▸ Graph Lines
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: 8,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {/* Y AXIS */}
            <div style={s.axisBlock}>
              <div style={s.axisBlockTitle}>▾ Y Axis</div>
              <FieldRow label="Unit Type:">
                <select
                  style={s.fieldInput}
                  value={yUnitType}
                  onChange={(e) => setYUnitType(e.target.value)}
                >
                  <option>Force</option>
                  <option>Length</option>
                  <option>Stress</option>
                </select>
              </FieldRow>
              <FieldRow label="Units:">
                <select
                  style={s.fieldInput}
                  value={yUnits}
                  onChange={(e) => setYUnits(e.target.value)}
                >
                  <option>N</option>
                  <option>lbf</option>
                  <option>kN</option>
                </select>
              </FieldRow>
              <label style={{ ...s.checkboxRow, padding: "2px 8px 6px" }}>
                <input type="checkbox" /> Compound Unit Type
              </label>
              <FieldRow label="Label:">
                <input
                  style={s.fieldInput}
                  value={yLabel}
                  onChange={(e) => setYLabel(e.target.value)}
                  placeholder="(Enter Value)"
                />
              </FieldRow>
              <FieldRow label="Format:">
                <select
                  style={s.fieldInput}
                  value={yFormat}
                  onChange={(e) => setYFormat(e.target.value)}
                >
                  <option>Automatic</option>
                  <option>Fixed</option>
                  <option>Scientific</option>
                </select>
              </FieldRow>
              <FieldRow label="Range Low:">
                <input
                  style={s.fieldInput}
                  value={yRangeLow}
                  onChange={(e) => setYRangeLow(e.target.value)}
                />
              </FieldRow>
              <label style={{ ...s.checkboxRow, padding: "2px 8px 6px" }}>
                <input
                  type="checkbox"
                  checked={yRescaleLow}
                  onChange={(e) => setYRescaleLow(e.target.checked)}
                />
                Rescale Range Low
              </label>
              <FieldRow label="Range High:">
                <input
                  style={s.fieldInput}
                  value={yRangeHigh}
                  onChange={(e) => setYRangeHigh(e.target.value)}
                />
              </FieldRow>
              <label style={{ ...s.checkboxRow, padding: "2px 8px 6px" }}>
                <input
                  type="checkbox"
                  checked={yRescaleHigh}
                  onChange={(e) => setYRescaleHigh(e.target.checked)}
                />
                Rescale Range High
              </label>
            </div>

            {/* X AXIS */}
            <div style={s.axisBlock}>
              <div style={s.axisBlockTitle}>▾ X Axis</div>
              <FieldRow label="Unit Type:">
                <select
                  style={s.fieldInput}
                  value={xUnitType}
                  onChange={(e) => setXUnitType(e.target.value)}
                >
                  <option>Length</option>
                  <option>Time</option>
                </select>
              </FieldRow>
              <FieldRow label="Units:">
                <select
                  style={s.fieldInput}
                  value={xUnits}
                  onChange={(e) => setXUnits(e.target.value)}
                >
                  <option>mm</option>
                  <option>in</option>
                  <option>cm</option>
                </select>
              </FieldRow>
              <label style={{ ...s.checkboxRow, padding: "2px 8px 6px" }}>
                <input type="checkbox" /> Compound Unit Type
              </label>
              <FieldRow label="Label:">
                <input
                  style={s.fieldInput}
                  value={xLabel}
                  onChange={(e) => setXLabel(e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Range High:">
                <input
                  style={s.fieldInput}
                  value={xRangeHigh}
                  onChange={(e) => setXRangeHigh(e.target.value)}
                />
              </FieldRow>
              <label style={{ ...s.checkboxRow, padding: "2px 8px 6px" }}>
                <input
                  type="checkbox"
                  checked={xRescaleHigh}
                  onChange={(e) => setXRescaleHigh(e.target.checked)}
                />
                Rescale Range High
              </label>

              <div
                style={{
                  marginTop: 8,
                  borderTop: "1px dashed #c3cad0",
                  paddingTop: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "0 8px 4px",
                    color: "#46525f",
                  }}
                >
                  Dual Axis First Range
                </div>
                <FieldRow label="Change Range Source:">
                  <select
                    style={s.fieldInput}
                    value={dualAxisSource}
                    onChange={(e) => setDualAxisSource(e.target.value)}
                  >
                    <option>&lt;None&gt;</option>
                    <option>Time</option>
                    <option>Position</option>
                  </select>
                </FieldRow>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Plots — full width, own bordered panel */}
      <div style={s.fullWidthPane}>
        <div style={s.panelHeader}>Plots</div>
        <div style={s.toolbar}>
          {[
            "Add",
            "Insert Before",
            "Insert After",
            "Cut",
            "Copy",
            "Paste Current",
            "Paste Before",
            "Paste After",
            "Delete",
          ].map((label) => (
            <button key={label} style={s.toolbarBtn}>
              {label}
            </button>
          ))}
          <div style={{ width: 1, background: colors.border, margin: "0 4px" }} />
          <button style={s.toolbarBtn}>Expand All</button>
          <button style={s.toolbarBtn}>Collapse All</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ ...s.table, minWidth: 480 }}>
            <thead>
              <tr>
                <th style={s.th}>Plot #</th>
                <th style={s.th}>Y Axis Source</th>
                <th style={s.th}>X Axis Source</th>
                <th style={s.th}>Color</th>
                <th style={s.th}>Point Size</th>
                <th style={s.th}>Style</th>
              </tr>
            </thead>
            <tbody>
              {plots.map((p) => (
                <tr key={p.id}>
                  <td style={s.td}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#2e8b3d",
                        marginRight: 4,
                      }}
                    />
                    {p.name}
                  </td>
                  <td style={s.td}>{p.ySource}</td>
                  <td style={s.td}>{p.xSource}</td>
                  <td style={s.td}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 16,
                        height: 12,
                        border: "1px solid #888",
                        background: p.color,
                      }}
                    />
                  </td>
                  <td style={s.td}>{p.pointSize}</td>
                  <td style={s.td}>{p.style}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={s.fieldRow}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function GraphPreviewSvg({
  yLabel,
  xLabel,
  yHigh,
  xHigh,
  yTicks,
  xTicks,
}: {
  yLabel: string;
  xLabel: string;
  yHigh: number;
  xHigh: number;
  yTicks: number;
  xTicks: number;
}) {
  const width = 640;
  const height = 320;
  const padL = 60;
  const padR = 20;
  const padT = 20;
  const padB = 50;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const yVals = Array.from({ length: yTicks + 1 }, (_, i) => ((yHigh || 44.48) * i) / yTicks);
  const xVals = Array.from({ length: xTicks + 1 }, (_, i) => ((xHigh || 25.4) * i) / xTicks);

  // Giãn lấp đầy phần còn trống của cột trái (bằng chiều cao cột Graph Options
  // bên phải nhờ alignItems: "stretch" ở twoColRow), thay vì kích thước cố định.
  const frameStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "20px 1fr",
    gridTemplateRows: "1fr 22px",
    padding: 8,
    boxSizing: "border-box",
    flex: 1,
    minHeight: 0,
  };

  return (
    <div style={frameStyle}>
      <div
        style={{
          gridRow: 1,
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          textAlign: "center",
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        {yLabel}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ gridRow: 1, width: "100%", height: "100%", minHeight: 0, background: "#fff" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {yVals.map((v, i) => {
          const y = padT + plotH - (i / yTicks) * plotH;
          return (
            <g key={`y-${i}`}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#dfe3e6" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10">
                {v.toFixed(2)}
              </text>
            </g>
          );
        })}
        {xVals.map((v, i) => {
          const x = padL + (i / xTicks) * plotW;
          return (
            <g key={`x-${i}`}>
              <line x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#dfe3e6" />
              <text x={x} y={padT + plotH + 14} textAnchor="middle" fontSize="10">
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        <rect x={padL} y={padT} width={plotW} height={plotH} fill="none" stroke="#9aa4ab" />
      </svg>
      <div style={{ gridColumn: 2, textAlign: "center", fontSize: 10, fontWeight: 600 }}>
        {xLabel}
      </div>
    </div>
  );
}