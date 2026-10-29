import { useState } from "react";
import { s } from "./Styles";
import { EMPTY_TEXT, dash } from "./useSavedRuns";
import type { SavedRuns } from "./useSavedRuns";
import type { PortDims, RunBending, SpecimenSetup } from "../../hooks/projectApi";

type SubTab = "tensile" | "bending";

interface BendRow {
  label: string;
  unit: string;
  d?: number;
  get: (p: PortDims, setup: SpecimenSetup, bend: RunBending | undefined) => number | string | null;
}

// Thứ tự dòng giống màn hình "Kết quả (Results)" của máy
const BEND_ROWS: BendRow[] = [
  { label: "Hình dạng tiết diện/mẫu (Shape)", unit: "", get: () => "Tiết diện tấm mỏng - FLAT" },
  { label: "Bề rộng tiết diện (width of section)", unit: "mm", d: 2, get: (p) => p.b },
  { label: "Chiều dày tiết diện (Thickness of section)", unit: "mm", d: 2, get: (p) => p.t },
  { label: "Diện tích tiết diện (Cross section area)", unit: "mm²", d: 1, get: (p) => p.t * p.b },
  { label: "Tổng chiều dài mẫu (sample length)", unit: "mm", d: 2, get: (_p, st) => st.sampleLength },
  { label: "Khoảng cách 2 gối tựa (support span)", unit: "mm", d: 2, get: (_p, st) => st.supportSpan },
  { label: "Vị trí đặt lực từ gối tựa trái (loading point from left support)", unit: "mm", d: 2, get: (_p, st) => st.loadPointPos },
  { label: "Đường kính gối tựa (Bearing dia.)", unit: "mm", d: 2, get: (_p, st) => st.bearingDia },
  { label: "Đường kính đầu đặt lực (Point load dia.)", unit: "mm", d: 2, get: (_p, st) => st.loadDia },
  { label: "Trọng lượng mẫu (Weight of sample)", unit: "gr", d: 1, get: (_p, st) => st.weightG },
  { label: "Lực uốn lớn nhất (maximum bending force)", unit: "N", d: 1, get: (_p, _s, b) => b?.max_force_n ?? null },
  { label: "Biến dạng tại Maxload (Deformation at maxload)", unit: "mm", d: 2, get: (_p, _s, b) => b?.deform_at_max_mm ?? null },
  { label: "Cường độ chịu kéo khi uốn (flexural strength)", unit: "MPa", d: 1, get: (_p, _s, b) => b?.flexural_strength_mpa ?? null },
  { label: "Mô đun đàn hồi uốn tĩnh tiếp tuyến (Tangent Elas. Modulus in bending)", unit: "MPa", d: 1, get: (_p, _s, b) => b?.tangent_modulus_mpa ?? null },
  { label: "Mô đun đàn hồi uốn tĩnh chord (Chord Elas. Modulus in bending)", unit: "MPa", d: 1, get: (_p, _s, b) => b?.chord_modulus_mpa ?? null },
  { label: "Lực phá hoại/kéo đứt (Break force Py)", unit: "N", d: 1, get: (_p, _s, b) => b?.break_force_n ?? null },
  { label: "Độ dãn dài khi đứt (Deformation at breakdown)", unit: "mm", d: 2, get: (_p, _s, b) => b?.deform_at_break_mm ?? null },
  { label: "Ứng suất kéo khi uốn tại lực phá hoại (flexural stress at break)", unit: "MPa", d: 1, get: (_p, _s, b) => b?.flexural_stress_break_mpa ?? null },
  { label: "Biến dạng uốn tại lực phá hoại (Strain at break load)", unit: "%", d: 3, get: (_p, _s, b) => b?.strain_at_break_pct ?? null },
];

export default function ResultsPanel({ saved }: { saved: SavedRuns }) {
  const [tab, setTab] = useState<SubTab>("tensile");
  const { detail } = saved;
  if (!detail) {
    return <div style={{ padding: 40, textAlign: "center", color: "#8a919a" }}>{EMPTY_TEXT}</div>;
  }

  const resultOf = (port: number) => detail.results.find((r) => r.port === port);
  const bendingOf = (port: number) => detail.bending.find((b) => b.port === port);
  const withResult = detail.ports.filter((p) => resultOf(p.port));
  const ports = withResult.length ? withResult : detail.ports;

  return (
    <div style={{ ...s.colPane, width: "100%" }}>
      <div style={s.tabsRow}>
        <button style={s.tab(tab === "tensile")} onClick={() => setTab("tensile")}>Phiếu kéo (Tensile)</button>
        <button style={s.tab(tab === "bending")} onClick={() => setTab("bending")}>Uốn 3 điểm (Bending)</button>
      </div>

      {tab === "tensile" && (
        <>
          <div style={s.panelHeader}>Composite materials · Tensile testing sheet</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>ID</th>
                <th style={s.th}>Lu (mm)</th>
                <th style={s.th}>ReL (MPa)</th>
                <th style={s.th}>Fm (kN)</th>
                <th style={s.th}>Rm (MPa)</th>
              </tr>
            </thead>
            <tbody>
              {ports.map((p) => {
                const r = resultOf(p.port);
                return (
                  <tr key={p.port}>
                    <td style={s.td}>NO.{p.port}</td>
                    <td style={s.td}>{dash(p.lu, 2)}</td>
                    <td style={s.td}>{dash(r?.rel_mpa, 0)}</td>
                    <td style={s.td}>{dash(r?.fm_kn, 2)}</td>
                    <td style={s.td}>{dash(r?.rm_mpa, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={s.panelHeader}>Thông số mẫu</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>ID</th>
                <th style={s.th}>M (N/mm²)</th>
                <th style={s.th}>S0 (mm²)</th>
                <th style={s.th}>t (mm)</th>
                <th style={s.th}>b (mm)</th>
                <th style={s.th}>bu (mm)</th>
                <th style={s.th}>Lo (mm)</th>
              </tr>
            </thead>
            <tbody>
              {ports.map((p) => {
                const r = resultOf(p.port);
                return (
                  <tr key={p.port}>
                    <td style={s.td}>NO.{p.port}</td>
                    <td style={s.td}>{dash(r?.modulus_mpa, 0)}</td>
                    <td style={s.td}>{dash(p.t * p.b, 2)}</td>
                    <td style={s.td}>{dash(p.t, 2)}</td>
                    <td style={s.td}>{dash(p.b, 2)}</td>
                    <td style={s.td}>{dash(p.bu, 2)}</td>
                    <td style={s.td}>{dash(p.l0, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {tab === "bending" && (
        <>
          <div style={s.panelHeader}>Kết quả (Results) — thử uốn 3 điểm</div>
          <div style={{ overflow: "auto" }}>
            <table style={{ ...s.table, minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={s.th}>Thông số</th>
                  {ports.map((p) => (
                    <th key={p.port} style={s.th}>Giá trị (Value) · NO.{p.port}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BEND_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td style={s.td}>{row.label}</td>
                    {ports.map((p) => {
                      const v = row.get(p, detail.setup, bendingOf(p.port));
                      return (
                        <td key={p.port} style={s.td}>
                          {typeof v === "string" ? v : `${dash(v, row.d ?? 2)}${v == null || !row.unit ? "" : ` ${row.unit}`}`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "6px 8px", fontSize: 11, color: "#8a919a" }}>
            "—" nghĩa là chưa có giá trị: chưa nhập thông số (ví dụ khoảng cách 2 gối tựa), hoặc chưa đủ dữ liệu
            để tính. Lực hiện là lực giả lập tăng đều; độ võng lấy từ ΔL của cảm biến độ dài.
          </div>
        </>
      )}
    </div>
  );
}