import type { LiveData } from "../../types";
import "./LiveDataStrip.css";

interface Props {
  data: LiveData;
}

export default function LiveDataStrip({ data }: Props) {
  const fields: Array<{ label: string; value: string; unit: string }> = [
    { label: "Force", value: data.force.toFixed(0), unit: "lbf" },
    { label: "Position", value: data.position.toFixed(3), unit: "in" },
    { label: "Time", value: data.time.toFixed(0), unit: "sec" },
    { label: "Position Rate", value: data.positionRate.toFixed(0), unit: "in/min" },
  ];

  return (
    <div className="live-data-strip">
      {fields.map((f) => (
        <div className="live-data-strip__cell" key={f.label}>
          <span className="live-data-strip__label">{f.label}</span>
          <span className="live-data-strip__value">
            {f.value} <span className="live-data-strip__unit">{f.unit}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
