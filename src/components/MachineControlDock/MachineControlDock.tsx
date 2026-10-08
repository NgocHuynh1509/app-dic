import { useState } from "react";
import type { LiveData } from "../../types";
import "./MachineControlDock.css";

interface Props {
  liveData: LiveData;
  connection?: string;
  state?: string;
  onClose?: () => void;
}

export default function MachineControlDock({
  liveData,
  connection = "COM4",
  state = "Stopped",
  onClose,
}: Props) {
  const [speed1] = useState(0.5);
  const [speed2] = useState(2);
  const [jogSpeed] = useState(3);

  return (
    <aside className="mcd">
      <div className="mcd__header">
        <span className="mcd__header-label">Jog Slide</span>
        {onClose && (
          <button className="mcd__header-close" onClick={onClose} title="Hide panel">
            ‹
          </button>
        )}
      </div>

      <div className="mcd__info">
        <div className="mcd__info-row">
          <span className="mcd__dot" />
          Connected: {connection}
        </div>
        <div className="mcd__info-row">State: {state}</div>
      </div>

      <div className="mcd__live-label">Live Data</div>

      <div className="mcd__slider-area">
        <div className="mcd__max-speed">
          Max Speed
          <strong>1.99 in/min</strong>
        </div>

        <div className="mcd__slider-track">
          <div className="mcd__slider-handle" />
        </div>

        <div className="mcd__readouts">
          <div className="mcd__readout">
            <span className="mcd__readout-icon">🔒</span>
            <span className="mcd__readout-chevron">«</span>
            <span className="mcd__readout-value">{liveData.force.toFixed(2)}</span>
          </div>
          <div className="mcd__readout">
            <span className="mcd__readout-icon">🔒</span>
            <span className="mcd__readout-chevron">«</span>
            <span className="mcd__readout-value">{liveData.position.toFixed(4)}</span>
          </div>
          <div className="mcd__rate">Rate = {liveData.positionRate.toFixed(3)} in/min</div>
        </div>
      </div>

      <div className="mcd__turtle" title="Slow jog mode">🐢</div>

      <div className="mcd__section-label">Machine Control</div>

      <div className="mcd__glyphs">
        <button className="mcd__glyph mcd__glyph--stop" title="Emergency stop">⏻</button>
        <button className="mcd__glyph" title="Jog up">▲</button>
        <button className="mcd__glyph" title="Jog down">▼</button>
        <button className="mcd__glyph" title="Jog up fast">▲</button>
        <button className="mcd__glyph" title="Jog left">▼</button>
        <button className="mcd__glyph" title="Jog right">▲</button>
        <button className="mcd__glyph" title="Jog down fast">▼</button>
        <button className="mcd__glyph" title="Jog reverse">▲</button>
      </div>

      <div className="mcd__speeds">
        <div className="mcd__speed-row">
          <span>Speed1</span>
          <strong>{speed1} in/min</strong>
        </div>
        <div className="mcd__speed-row">
          <span>Speed2</span>
          <strong>{speed2} in/min</strong>
        </div>
      </div>

      <div className="mcd__spacer" />

      <div className="mcd__fixed-jog">Fixed Jog</div>

      <button className="mcd__return" title="Return to start">↰</button>
      <button className="mcd__up" title="Jog up">▲</button>

      <div className="mcd__run-row">
        <button className="mcd__play" title="Run">▶</button>
        <button className="mcd__stop" title="Stop">●</button>
      </div>

      <button className="mcd__down" title="Jog down">▼</button>

      <div className="mcd__foot-row">
        <button className="mcd__foot-icon" title="Preset A">⛭</button>
        <button className="mcd__foot-icon" title="Preset B">⛭</button>
      </div>

      <div className="mcd__jog-speed-label">{jogSpeed} in/min</div>

      <button className="mcd__repeat" title="Repeat">↺</button>
    </aside>
  );
}
