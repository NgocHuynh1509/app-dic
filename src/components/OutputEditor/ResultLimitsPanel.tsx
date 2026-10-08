import { useState } from "react";
import { colors, s } from "./Styles";

type LimitAction = "None" | "Warn" | "Fail Specimen";

interface LimitRow {
  id: number;
  resultName: string;
  units: string;
  min: string;
  max: string;
  target: string;
  action: LimitAction;
}

const INITIAL_LIMITS: LimitRow[] = [
  { id: 1, resultName: "Break Stress", units: "MPa", min: "5.00", max: "12.00", target: "8.50", action: "Fail Specimen" },
  { id: 2, resultName: "Ultimate Force", units: "N", min: "20.00", max: "60.00", target: "44.48", action: "Warn" },
];

export default function ResultLimitsPanel() {
  const [limits, setLimits] = useState<LimitRow[]>(INITIAL_LIMITS);
  const [selected, setSelected] = useState<number | null>(0);

  function addRow() {
    setLimits((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((l) => l.id)) + 1 : 1,
        resultName: "New Result",
        units: "",
        min: "",
        max: "",
        target: "",
        action: "None",
      },
    ]);
  }

  function deleteRow() {
    if (selected === null) return;
    setLimits((prev) => prev.filter((l) => l.id !== selected));
    setSelected(null);
  }

  function updateRow(id: number, patch: Partial<LimitRow>) {
    setLimits((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  return (
    <div style={{ ...s.colPane, width: "100%" }}>
      <div style={s.panelHeader}>Result Limits</div>
      <div style={{ padding: "6px 8px", fontSize: 11, color: "#46525f", background: "#f4f6f7" }}>
        Define acceptable ranges for each calculated result. Specimens outside range can be flagged or
        marked as failed automatically.
      </div>

      <div style={s.toolbar}>
        <button style={s.toolbarBtn} onClick={addRow}>
          Add
        </button>
        <button style={s.toolbarBtn} onClick={deleteRow}>
          Delete
        </button>
        <button style={s.toolbarBtn}>Insert Before</button>
        <button style={s.toolbarBtn}>Insert After</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ ...s.table, minWidth: 760 }}>
          <thead>
            <tr>
              <th style={s.th}>Result Name</th>
              <th style={s.th}>Units</th>
              <th style={s.th}>Min</th>
              <th style={s.th}>Max</th>
              <th style={s.th}>Target</th>
              <th style={s.th}>Action If Out Of Range</th>
            </tr>
          </thead>
          <tbody>
            {limits.map((l) => (
              <tr
                key={l.id}
                onClick={() => setSelected(l.id)}
                style={{
                  cursor: "pointer",
                  background: selected === l.id ? colors.rowSelected : undefined,
                }}
              >
                <td style={s.td}>
                  <input
                    style={s.fieldInput}
                    value={l.resultName}
                    onChange={(e) => updateRow(l.id, { resultName: e.target.value })}
                  />
                </td>
                <td style={s.td}>
                  <input
                    style={{ ...s.fieldInput, width: 70 }}
                    value={l.units}
                    onChange={(e) => updateRow(l.id, { units: e.target.value })}
                  />
                </td>
                <td style={s.td}>
                  <input
                    style={{ ...s.fieldInput, width: 80 }}
                    value={l.min}
                    onChange={(e) => updateRow(l.id, { min: e.target.value })}
                  />
                </td>
                <td style={s.td}>
                  <input
                    style={{ ...s.fieldInput, width: 80 }}
                    value={l.max}
                    onChange={(e) => updateRow(l.id, { max: e.target.value })}
                  />
                </td>
                <td style={s.td}>
                  <input
                    style={{ ...s.fieldInput, width: 80 }}
                    value={l.target}
                    onChange={(e) => updateRow(l.id, { target: e.target.value })}
                  />
                </td>
                <td style={s.td}>
                  <select
                    style={s.fieldInput}
                    value={l.action}
                    onChange={(e) => updateRow(l.id, { action: e.target.value as LimitAction })}
                  >
                    <option>None</option>
                    <option>Warn</option>
                    <option>Fail Specimen</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}