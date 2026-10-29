import { useEffect, useState } from "react";
import { dbApi } from "../../hooks/projectApi";
import type { MeasurementRow } from "../../hooks/projectApi";
import { s } from "./Styles";
import { EMPTY_TEXT, dash } from "./useSavedRuns";
import type { SavedRuns } from "./useSavedRuns";

const PAGE = 100;

export default function MeasurementsPanel({ saved }: { saved: SavedRuns }) {
  const api = dbApi();
  const { runId } = saved;
  const [port, setPort] = useState(0); // 0 = tất cả cổng
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<MeasurementRow[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => { setOffset(0); }, [runId, port]);

  useEffect(() => {
    if (!api || runId == null) { setRows([]); setTotal(0); return; }
    let cancelled = false;
    api.listMeasurements(runId, port || null, offset, PAGE)
      .then((r) => { if (!cancelled) { setRows(r.rows); setTotal(r.total); } })
      .catch(() => { /* bỏ qua, hiển thị bảng trống */ });
    return () => { cancelled = true; };
  }, [api, runId, port, offset]);

  if (runId == null) {
    return <div style={{ padding: 40, textAlign: "center", color: "#8a919a" }}>{EMPTY_TEXT}</div>;
  }
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);

  return (
    <div style={{ ...s.colPane, width: "100%" }}>
      <div style={s.panelHeader}>Dữ liệu đo đã lưu</div>
      <div style={{ ...s.toolbar, alignItems: "center" }}>
        <span>Cổng:</span>
        <select style={{ ...s.fieldInput, width: 110, flex: "none" }} value={port} onChange={(e) => setPort(Number(e.target.value))}>
          <option value={0}>Tất cả</option>
          <option value={1}>HX1 (NO.1)</option>
          <option value={2}>HX2 (NO.2)</option>
          <option value={3}>HX3 (NO.3)</option>
        </select>
        <button style={s.toolbarBtn} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>◀ Trước</button>
        <button style={s.toolbarBtn} disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Sau ▶</button>
        <span>{from}–{to} / {total} dòng</span>
      </div>

      <div style={{ overflow: "auto" }}>
        <table style={{ ...s.table, minWidth: 900 }}>
          <thead>
            <tr>
              <th style={s.th}>t (s)</th>
              <th style={s.th}>Cổng</th>
              <th style={s.th}>Raw</th>
              <th style={s.th}>Δ</th>
              <th style={s.th}>Filtered</th>
              <th style={s.th}>ε (µε)</th>
              <th style={s.th}>L (mm)</th>
              <th style={s.th}>F (kN)</th>
              <th style={s.th}>σ (MPa)</th>
              <th style={s.th}>ε = ΔL/Lo (%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td style={s.td} colSpan={10}>Không có dòng dữ liệu.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={offset + i}>
                <td style={s.td}>{dash(r.elapsed_s, 3)}</td>
                <td style={s.td}>HX{r.channel}</td>
                <td style={s.td}>{r.raw ?? "—"}</td>
                <td style={s.td}>{dash(r.delta, 1)}</td>
                <td style={s.td}>{dash(r.filtered, 1)}</td>
                <td style={s.td}>{dash(r.strain, 3)}</td>
                <td style={s.td}>{dash(r.length_mm, 4)}</td>
                <td style={s.td}>{dash(r.force_kn, 3)}</td>
                <td style={s.td}>{dash(r.stress_mpa, 2)}</td>
                <td style={s.td}>{r.strain_len == null ? "—" : (r.strain_len * 100).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}