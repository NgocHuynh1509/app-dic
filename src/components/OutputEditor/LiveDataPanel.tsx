import { useState } from "react";
import { colors, s } from "./Styles";

interface LiveChannel {
  id: string;
  name: string;
  units: string;
  decimals: number;
  visible: boolean;
}

const INITIAL_CHANNELS: LiveChannel[] = [
  { id: "force", name: "Force", units: "N", decimals: 2, visible: true },
  { id: "position", name: "Position", units: "mm", decimals: 2, visible: true },
  { id: "time", name: "Time", units: "s", decimals: 1, visible: true },
  { id: "position-rate", name: "Position Rate", units: "mm/min", decimals: 1, visible: false },
  { id: "strain", name: "Strain", units: "%", decimals: 2, visible: false },
];

// A few representative sample values just so the preview isn't empty.
const SAMPLE_VALUES: Record<string, string> = {
  force: "12.48",
  position: "6.35",
  time: "14.2",
  "position-rate": "50.0",
  strain: "0.86",
};

export default function LiveDataPanel() {
  const [channels, setChannels] = useState<LiveChannel[]>(INITIAL_CHANNELS);
  const [fontSize, setFontSize] = useState("Large");
  const [updateRate, setUpdateRate] = useState("10 Hz");

  function toggleChannel(id: string) {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  }

  function updateDecimals(id: string, decimals: number) {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, decimals } : c)));
  }

  const visibleChannels = channels.filter((c) => c.visible);

  return (
    <div style={s.twoColRow}>
      {/* Left: channel configuration table */}
      <div style={s.colPane}>
        <div style={s.panelHeader}>Live Data Channels</div>
        <div style={s.toolbar}>
          <button style={s.toolbarBtn}>Add Channel</button>
          <button style={s.toolbarBtn}>Remove</button>
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Show</th>
              <th style={s.th}>Channel</th>
              <th style={s.th}>Units</th>
              <th style={s.th}>Decimals</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.id}>
                <td style={s.td}>
                  <input type="checkbox" checked={c.visible} onChange={() => toggleChannel(c.id)} />
                </td>
                <td style={s.td}>{c.name}</td>
                <td style={s.td}>{c.units}</td>
                <td style={s.td}>
                  <select
                    style={{ ...s.fieldInput, width: 60 }}
                    value={c.decimals}
                    onChange={(e) => updateDecimals(c.id, Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: `1px solid ${colors.border}`, padding: 8 }}>
          <div style={s.fieldRow}>
            <label style={{ flex: "0 0 100px" }}>Display Font Size:</label>
            <select style={s.fieldInput} value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
              <option>Extra Large</option>
            </select>
          </div>
          <div style={s.fieldRow}>
            <label style={{ flex: "0 0 100px" }}>Update Rate:</label>
            <select style={s.fieldInput} value={updateRate} onChange={(e) => setUpdateRate(e.target.value)}>
              <option>1 Hz</option>
              <option>10 Hz</option>
              <option>50 Hz</option>
              <option>100 Hz</option>
            </select>
          </div>
        </div>
      </div>

      {/* Right: live readout preview */}
      <div style={s.colPane}>
        <div style={s.panelHeader}>Live Readout Preview</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            padding: 12,
          }}
        >
          {visibleChannels.length === 0 && (
            <div style={{ gridColumn: "1 / -1", color: "#8a919a", padding: 20, textAlign: "center" }}>
              No channels selected — check a channel on the left to preview it here.
            </div>
          )}
          {visibleChannels.map((c) => (
            <div
              key={c.id}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                padding: "10px 12px",
                background: "#f8fafb",
              }}
            >
              <div style={{ fontSize: 11, color: "#46525f", fontWeight: 600 }}>{c.name}</div>
              <div
                style={{
                  fontSize: fontSize === "Extra Large" ? 34 : fontSize === "Large" ? 26 : fontSize === "Medium" ? 20 : 15,
                  fontWeight: 700,
                  color: "#1c2530",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Number(SAMPLE_VALUES[c.id] ?? 0).toFixed(c.decimals)}{" "}
                <span style={{ fontSize: 12, color: "#8a919a" }}>{c.units}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 12px 12px", fontSize: 11, color: "#8a919a" }}>
          Values shown are sample data for layout preview — actual readings populate here while a test is
          running.
        </div>
      </div>
    </div>
  );
}