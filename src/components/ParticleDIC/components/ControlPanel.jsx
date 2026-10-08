import Panel from "./Panel.jsx";

export default function ControlPanel({
  busy, loading, running, devices, deviceId, onDeviceChange,
  onStart, onStop, onReset, onForceUp, onForceDown, onExport,
}) {
  return (
    <div className="left-col">
      <Panel title="Bộ điều khiển" className="grow">
        <div className="btn-stack">
          <label className="field">
            <span className="field-name">Camera</span>
            <select value={deviceId} onChange={(e) => onDeviceChange(e.target.value)} disabled={running || busy}>
              <option value="">Mặc định (theo cấu hình)</option>
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i}`}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-start" onClick={onStart} disabled={running || busy || loading}>
            ▶ {busy ? "Đang khởi động…" : loading ? "Đang nạp OpenCV…" : "Start"}
          </button>
          <button className="btn btn-stop" onClick={onStop} disabled={!running}>
            ■ Stop
          </button>
          <button className="btn btn-reset" onClick={onReset}>
            ⟲ Reset
          </button>
          <button className="btn btn-force" onClick={onForceUp}>Force +</button>
          <button className="btn btn-force" onClick={onForceDown}>Force –</button>
        </div>
      </Panel>
      <button className="btn btn-export" onClick={onExport}>
        ⬇ Xuất báo cáo CSV
        <br />
        theo thời gian của lần test
      </button>
    </div>
  );
}
