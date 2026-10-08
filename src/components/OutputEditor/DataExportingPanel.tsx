import { useState } from "react";
import { colors, s } from "./Styles";

interface ExportColumn {
  id: string;
  name: string;
  included: boolean;
}

const INITIAL_COLUMNS: ExportColumn[] = [
  { id: "specimen-id", name: "Specimen ID", included: true },
  { id: "date-time", name: "Date/Time", included: true },
  { id: "break-stress", name: "Break Stress", included: true },
  { id: "ultimate-force", name: "Ultimate Force", included: true },
  { id: "width", name: "Width", included: false },
  { id: "thickness", name: "Thickness", included: false },
  { id: "raw-curve", name: "Raw Force/Position Curve", included: false },
];

export default function DataExportingPanel() {
  const [format, setFormat] = useState("CSV (.csv)");
  const [delimiter, setDelimiter] = useState("Comma");
  const [destination, setDestination] = useState("C:\\Horizon\\Exports\\{OutputName}_{Date}.csv");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [autoExportOnComplete, setAutoExportOnComplete] = useState(true);
  const [appendToExisting, setAppendToExisting] = useState(false);
  const [columns, setColumns] = useState<ExportColumn[]>(INITIAL_COLUMNS);

  function toggleColumn(id: string) {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, included: !c.included } : c)));
  }

  return (
    <div style={s.twoColRow}>
      {/* Left: format + destination + triggers */}
      <div style={s.colPane}>
        <div style={s.panelHeader}>Export Settings</div>
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={s.fieldRow}>
            <label style={{ flex: "0 0 100px" }}>File Format:</label>
            <select style={s.fieldInput} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option>CSV (.csv)</option>
              <option>Tab-Delimited (.txt)</option>
              <option>Excel Workbook (.xlsx)</option>
              <option>XML (.xml)</option>
            </select>
          </div>
          <div style={s.fieldRow}>
            <label style={{ flex: "0 0 100px" }}>Delimiter:</label>
            <select
              style={s.fieldInput}
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              disabled={format !== "CSV (.csv)" && format !== "Tab-Delimited (.txt)"}
            >
              <option>Comma</option>
              <option>Semicolon</option>
              <option>Tab</option>
            </select>
          </div>
          <div style={{ ...s.fieldRow, alignItems: "flex-start" }}>
            <label style={{ flex: "0 0 100px" }}>Destination:</label>
            <input style={s.fieldInput} value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
          <div style={{ fontSize: 11, color: "#8a919a", paddingLeft: 106 }}>
            Supports tokens: {"{OutputName}"}, {"{Date}"}, {"{SpecimenID}"}
          </div>

          <label style={s.checkboxRow}>
            <input type="checkbox" checked={includeHeader} onChange={(e) => setIncludeHeader(e.target.checked)} />
            Include column header row
          </label>
          <label style={s.checkboxRow}>
            <input
              type="checkbox"
              checked={autoExportOnComplete}
              onChange={(e) => setAutoExportOnComplete(e.target.checked)}
            />
            Automatically export when a test completes
          </label>
          <label style={s.checkboxRow}>
            <input
              type="checkbox"
              checked={appendToExisting}
              onChange={(e) => setAppendToExisting(e.target.checked)}
            />
            Append to existing file (instead of overwrite)
          </label>
        </div>

        <div style={{ borderTop: `1px solid ${colors.border}`, padding: "8px 10px", display: "flex", gap: 6 }}>
          <button style={s.toolbarBtn}>Test Export</button>
          <button style={s.toolbarBtn}>Browse...</button>
        </div>
      </div>

      {/* Right: columns to export */}
      <div style={s.colPane}>
        <div style={s.panelHeader}>Columns To Export</div>
        <div style={s.toolbar}>
          <button style={s.toolbarBtn} onClick={() => setColumns((p) => p.map((c) => ({ ...c, included: true })))}>
            Select All
          </button>
          <button
            style={s.toolbarBtn}
            onClick={() => setColumns((p) => p.map((c) => ({ ...c, included: false })))}
          >
            Select None
          </button>
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Include</th>
              <th style={s.th}>Column</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c) => (
              <tr key={c.id}>
                <td style={s.td}>
                  <input type="checkbox" checked={c.included} onChange={() => toggleColumn(c.id)} />
                </td>
                <td style={s.td}>{c.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}