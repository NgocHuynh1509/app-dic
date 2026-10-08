import { useState } from "react";
import { useDraggable } from "../../hooks/useDraggable";
import "./MachineControlPanel.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  force: number;
  position: number;
}

export default function MachineControlPanel({ isOpen, onClose, force, position }: Props) {
  const { position: pos, isDragging, onHeaderMouseDown } = useDraggable({ x: 560, y: 70 });
  const [speed1] = useState(0.5);
  const [speed2] = useState(2);

  if (!isOpen) return null;

  return (
    <div
      className={"mcp" + (isDragging ? " mcp--dragging" : "")}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="mcp__header" onMouseDown={onHeaderMouseDown}>
        <span className="mcp__title">Machine Control — TOVMC 3005T</span>
        <button className="mcp__close" onClick={onClose} aria-label="Close machine control panel">
          ×
        </button>
      </div>

      <div className="mcp__body">
        <div className="mcp__jog-col">
          <span className="mcp__jog-label">Jog Slider</span>
          <div className="mcp__jog-track">
            <div className="mcp__jog-fill" />
            <div className="mcp__jog-handle" />
          </div>
        </div>

        <div className="mcp__readouts">
          <div className="mcp__readout">
            <span className="mcp__readout-label">Force, lbf</span>
            <span className="mcp__readout-value">{force.toFixed(2)}</span>
          </div>
          <div className="mcp__readout">
            <span className="mcp__readout-label">Position, in</span>
            <span className="mcp__readout-value">{position.toFixed(4)}</span>
          </div>

          <div className="mcp__speeds">
            <div className="mcp__speed-row">
              <span>Speed 1</span>
              <span>{speed1} in/min</span>
            </div>
            <div className="mcp__speed-row">
              <span>Speed 2</span>
              <span>{speed2} in/min</span>
            </div>
          </div>

          <div className="mcp__buttons">
            <button className="mcp__btn mcp__btn--dir" title="Jog reverse">◄</button>
            <button className="mcp__btn mcp__btn--dir" title="Jog up">▲</button>
            <button className="mcp__btn mcp__btn--go" title="Run">▶</button>
            <button className="mcp__btn mcp__btn--stop" title="Stop">●</button>
            <button className="mcp__btn mcp__btn--dir" title="Jog down">▼</button>
            <button className="mcp__btn mcp__btn--dir" title="Jog forward">►</button>
          </div>
        </div>
      </div>
    </div>
  );
}