import { useState } from "react";
import { Area, AreaChart, Brush, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import Panel from "./Panel.jsx";

/**
 * Biểu đồ Mean Disp theo thời gian chạy.
 * Theo dõi BẬT: biểu đồ chạy theo dữ liệu mới. Kéo thanh Brush bên dưới để di chuyển / zoom
 * thì tự chuyển sang TẮT và đóng băng dữ liệu; bấm nút để quay lại.
 */
export default function DispChart({ data, follow, onFollowChange, resetKey }) {
  const [frozen, setFrozen] = useState([]);
  const [range, setRange] = useState({ s: 0, e: 0 });

  const shown = follow ? data : frozen;

  const turnOff = (r) => {
    setFrozen(data.slice());
    setRange(r);
    onFollowChange(false);
  };

  const onBrush = (r) => {
    if (r?.startIndex == null) return;
    const next = { s: r.startIndex, e: r.endIndex };
    if (follow) turnOff(next);
    else setRange(next);
  };

  return (
    <Panel title="Biểu đồ độ dãn / thời gian" className="chart-panel">
      <div className="chart-bar">
        <span className="hint">Kéo thanh bên dưới để di chuyển hoặc zoom</span>
        <button
          className={`btn-follow ${follow ? "on" : "off"}`}
          onClick={() => onFollowChange(!follow)}
          aria-pressed={follow}
        >
          {follow ? "⏺ Theo dõi mới nhất: BẬT" : "⏸ Theo dõi mới nhất: TẮT (nhấn để quay lại)"}
        </button>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={shown} margin={{ top: 6, right: 12, bottom: 0, left: 0 }} key={resetKey}>
            <CartesianGrid stroke="#ffffff" strokeOpacity={0.12} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              stroke="#262d38"
              tick={{ fill: "#7c8798", fontSize: 11 }}
              tickFormatter={(v) => v.toFixed(0)}
              label={{ value: "Run Time (s)", position: "insideBottomRight", offset: -2, fill: "#7c8798", fontSize: 11 }}
            />
            <YAxis
              stroke="#262d38"
              tick={{ fill: "#7c8798", fontSize: 11 }}
              width={56}
              tickFormatter={(v) => v.toFixed(3)}
              domain={["auto", "auto"]}
            />
            <Area
              type="monotone"
              dataKey="disp"
              stroke="#4c8dff"
              strokeWidth={2.5}
              fill="#4c8dff"
              fillOpacity={0.2}
              isAnimationActive={false}
              dot={false}
            />
            <Brush
              dataKey="t"
              height={18}
              stroke="#4c8dff"
              fill="#0a0d12"
              travellerWidth={8}
              tickFormatter={(v) => Number(v).toFixed(0)}
              {...(follow ? {} : { startIndex: Math.min(range.s, Math.max(0, shown.length - 1)), endIndex: Math.min(range.e, Math.max(0, shown.length - 1)) })}
              onChange={onBrush}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
