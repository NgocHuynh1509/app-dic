import { useEffect, useRef } from "react";
import Panel from "./Panel.jsx";
import { drawBlank, drawScalarField } from "../core/heatmap.js";

const TILES = [
  { key: "M", label: "Displacement (M)", symmetric: false },
  { key: "exx", label: "Strain XX", symmetric: true },
  { key: "eyy", label: "Strain YY", symmetric: true },
  { key: "gxy", label: "Shear XY", symmetric: true },
];

/** 4 heatmap (M, exx, eyy, gxy). Chỉ vẽ lại khi trường mới được tính (heat.version đổi). */
export default function HeatmapPanel({ heat }) {
  const refs = useRef({});

  useEffect(() => {
    for (const tile of TILES) {
      const canvas = refs.current[tile.key];
      if (!canvas) continue;
      if (!heat?.field) drawBlank(canvas);
      else
        drawScalarField(canvas, heat.field[tile.key], heat.field.nx, heat.field.ny, {
          symmetric: tile.symmetric,
          label: tile.label,
        });
    }
  }, [heat?.version]);

  return (
    <Panel title="4 heatmaps (M, exx, eyy, gxy)">
      <div className="heat-row">
        {TILES.map((t) => (
          <canvas
            key={t.key}
            className="feed heat"
            width={320}
            height={220}
            ref={(el) => (refs.current[t.key] = el)}
            aria-label={t.label}
          />
        ))}
      </div>
    </Panel>
  );
}
