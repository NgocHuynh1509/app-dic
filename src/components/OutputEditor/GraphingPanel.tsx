import { useState } from "react";
import { s } from "./Styles";
import { EMPTY_TEXT, chartSrc } from "./useSavedRuns";
import type { SavedRuns } from "./useSavedRuns";

const TABS = [
  { port: 0, label: "Biểu đồ chung" },
  { port: 1, label: "NO.1 (HX1)" },
  { port: 2, label: "NO.2 (HX2)" },
  { port: 3, label: "NO.3 (HX3)" },
];

export default function GraphingPanel({ saved }: { saved: SavedRuns }) {
  const [port, setPort] = useState(0);
  const { detail } = saved;
  if (!detail) {
    return <div style={{ padding: 40, textAlign: "center", color: "#8a919a" }}>{EMPTY_TEXT}</div>;
  }
  const chart = detail.charts.find((c) => c.port === port);

  return (
    <div style={{ ...s.colPane, width: "100%" }}>
      <div style={s.panelHeader}>Đồ thị kết quả thí nghiệm (Graph) — σ theo ε</div>
      <div style={s.tabsRow}>
        {TABS.map((t) => (
          <button key={t.port} style={s.tab(port === t.port)} onClick={() => setPort(t.port)}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 10 }}>
        {chart ? (
          <div style={{ height: "clamp(240px, calc(100vh - 340px), 560px)", display: "flex", justifyContent: "center" }}>
            <img
              src={chartSrc(chart.svg)}
              alt={`Biểu đồ ${port === 0 ? "chung" : `NO.${port}`}`}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "#8a919a" }}>
            Không có biểu đồ này. Nguyên nhân thường gặp: kênh không bật khi đo, hoặc chưa hiệu chuẩn độ dài
            2 điểm nên chưa tính được ε = ΔL/Lo.
          </div>
        )}
      </div>
    </div>
  );
}