import { useEffect, useRef, useState } from "react";
import "./MethodEditor.css";

/* ---------------- Types ---------------- */

type ControlMode = "Rate of" | "Ramp to" | "Hold" | "Cycle";
type EndCondition =
  | "Value is Greater than End Value"
  | "Value is Less than End Value"
  | "Specimen Break"
  | "Time Elapsed"
  | "Manual";

interface Segment {
  id: string;
  controlMode: ControlMode;
  controlSource: string;
  controlValue: number;
  controlUnit: string;
  endCondition: EndCondition;
  endSource: string;
  expanded: boolean;
  options: {
    watchForSpecimenBreak: boolean;
    captureData: boolean;
    timeout: boolean;
    timeoutValueSec: number;
    segmentLabel: string;
    keyboardEntryInstructions: string;
    endConditionStateTest: boolean;
    durationValueSec: number;
    gainsSource: "vmc" | "horizon";
    derivativeSampleInterval: number;
    integratorLimitPct: number;
    maxError: number;
    maxErrorUnit: string;
    pidControlMode: "Auto" | "Manual";
    actions: string[];
  };
}

let segIdSeq = 0;
function newSegment(partial?: Partial<Segment>): Segment {
  segIdSeq += 1;
  return {
    id: `seg-${segIdSeq}`,
    controlMode: "Rate of",
    controlSource: "Position",
    controlValue: 0.25,
    controlUnit: "in / min",
    endCondition: "Value is Greater than End Value",
    endSource: "Force",
    expanded: false,
    options: {
      watchForSpecimenBreak: false,
      captureData: true,
      timeout: false,
      timeoutValueSec: 0,
      segmentLabel: "",
      keyboardEntryInstructions: "",
      endConditionStateTest: false,
      durationValueSec: 0,
      gainsSource: "horizon",
      derivativeSampleInterval: 0,
      integratorLimitPct: 100,
      maxError: 0,
      maxErrorUnit: "in",
      pidControlMode: "Auto",
      actions: ["<None>"],
    },
    ...partial,
  };
}

const CONTROL_MODES: ControlMode[] = ["Rate of", "Ramp to", "Hold", "Cycle"];
const CONTROL_SOURCES = ["Position", "Force", "Strain", "Time"];
const CONTROL_UNITS = ["in / min", "mm / min", "lbf / min", "N / min", "sec"];
const END_CONDITIONS: EndCondition[] = [
  "Value is Greater than End Value",
  "Value is Less than End Value",
  "Specimen Break",
  "Time Elapsed",
  "Manual",
];
const END_SOURCES = ["Force", "Position", "Strain", "—"];

const RIBBON_SECTIONS = [
  { id: "method-overview", label: "Method\nOverview", icon: "▤" },
  { id: "source-selection", label: "Source\nSelection", icon: "1234" },
  { id: "parameters", label: "Parameters", icon: "☑" },
  { id: "entries", label: "Entries", icon: "▥" },
  { id: "data-importing", label: "Data\nImporting", icon: "⇩" },
  { id: "control-segments", label: "Control\nSegments", icon: "▦" },
  { id: "control-options", label: "Control\nOptions", icon: "⚙" },
  { id: "output-selection", label: "Output\nSelection", icon: "▧" },
];

/* ---------------- Component ---------------- */

export default function MethodEditor() {
  const [methodName] = useState("Generic Compression - Force vs. Position");
  const [activeSection, setActiveSection] = useState(RIBBON_SECTIONS[5].id);
  const [segments, setSegments] = useState<Segment[]>([
    newSegment({
      controlMode: "Rate of",
      controlSource: "Position",
      controlValue: 0.25,
      controlUnit: "in / min",
      endCondition: "Value is Greater than End Value",
      endSource: "Force",
      expanded: false,
    }),
    newSegment({
      controlMode: "Rate of",
      controlSource: "Position",
      controlValue: 0.05,
      controlUnit: "in / min",
      endCondition: "Specimen Break",
      endSource: "—",
      expanded: true,
      options: {
        ...newSegment().options,
        watchForSpecimenBreak: true,
        captureData: true,
      },
    }),
  ]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(segments[1]?.id ?? "");
  const [clipboard, setClipboard] = useState<Segment | null>(null);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* Scroll-spy: mục ribbon tự sáng theo section đang xem */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { root: null, threshold: [0.3, 0.6] }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollToSection(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---- Segment CRUD ---- */
  function updateSegment(id: string, patch: Partial<Segment>) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function updateSegmentOptions(id: string, patch: Partial<Segment["options"]>) {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, options: { ...s.options, ...patch } } : s))
    );
  }

  function toggleExpand(id: string) {
    updateSegment(id, { expanded: !segments.find((s) => s.id === id)?.expanded });
  }

  function expandAll() {
    setSegments((prev) => prev.map((s) => ({ ...s, expanded: true })));
  }

  function collapseAll() {
    setSegments((prev) => prev.map((s) => ({ ...s, expanded: false })));
  }

  function addSegment() {
    const seg = newSegment();
    setSegments((prev) => [...prev, seg]);
    setSelectedSegmentId(seg.id);
  }

  function insertRelative(offset: 0 | 1) {
    const idx = segments.findIndex((s) => s.id === selectedSegmentId);
    if (idx === -1) return addSegment();
    const seg = newSegment();
    setSegments((prev) => {
      const next = [...prev];
      next.splice(idx + offset, 0, seg);
      return next;
    });
    setSelectedSegmentId(seg.id);
  }

  function deleteSelected() {
    setSegments((prev) => {
      const next = prev.filter((s) => s.id !== selectedSegmentId);
      const idx = prev.findIndex((s) => s.id === selectedSegmentId);
      setSelectedSegmentId(next[Math.max(0, idx - 1)]?.id ?? "");
      return next;
    });
  }

  function cutSelected() {
    const seg = segments.find((s) => s.id === selectedSegmentId);
    if (!seg) return;
    setClipboard(seg);
    deleteSelected();
  }

  function copySelected() {
    const seg = segments.find((s) => s.id === selectedSegmentId);
    if (seg) setClipboard(seg);
  }

  function pasteAt(mode: "current" | "before" | "after") {
    if (!clipboard) return;
    const pasted = newSegment({ ...clipboard, id: undefined as unknown as string });
    const idx = segments.findIndex((s) => s.id === selectedSegmentId);
    setSegments((prev) => {
      const next = [...prev];
      if (mode === "current" || idx === -1) {
        next.push(pasted);
      } else if (mode === "before") {
        next.splice(idx, 0, pasted);
      } else {
        next.splice(idx + 1, 0, pasted);
      }
      return next;
    });
    setSelectedSegmentId(pasted.id);
  }

  return (
    <div className="method-editor">
      {/* Thông tin method + Load/Save/Rename/Delete/Export */}
      <div className="method-editor__infobar">
        <span className="method-editor__infobar-label">Selected Method:</span>
        <span className="method-editor__infobar-value">{methodName}</span>
        <div className="method-editor__spacer" />
        <button className="method-editor__tool">🔍</button>
        <button className="method-editor__tool">
          <span className="method-editor__tool-icon">📁</span>Load
        </button>
        <button className="method-editor__tool">
          <span className="method-editor__tool-icon">💾</span>Save
        </button>
        <button className="method-editor__tool">
          <span className="method-editor__tool-icon">📄</span>Save As...
        </button>
        <button className="method-editor__tool">
          <span className="method-editor__tool-icon">✎</span>Rename
        </button>
        <button className="method-editor__tool">
          <span className="method-editor__tool-icon method-editor__tool-icon--danger">✕</span>
          Delete Method
        </button>
        <button className="method-editor__tool">
          <span className="method-editor__tool-icon">⇪</span>Export
        </button>
      </div>

      {/* Ribbon con: 8 mục, cùng 1 trang, bấm để cuộn tới section */}
      <nav className="method-editor__ribbon">
        {RIBBON_SECTIONS.map((s) => (
          <button
            key={s.id}
            className={
              "method-editor__ribbon-item" +
              (activeSection === s.id ? " method-editor__ribbon-item--active" : "")
            }
            onClick={() => scrollToSection(s.id)}
          >
            <span className="method-editor__ribbon-icon">{s.icon}</span>
            <span className="method-editor__ribbon-label">
              {s.label.split("\n").map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </span>
          </button>
        ))}
      </nav>

      {/* Toàn bộ nội dung: 1 trang cuộn duy nhất */}
      <div className="method-editor__scroll">
        <Section
          id="method-overview"
          title="Method Overview"
          refCb={(el) => (sectionRefs.current["method-overview"] = el)}
        >
          <div className="method-editor__field-grid">
            <label>
              Method Name
              <input defaultValue={methodName} />
            </label>
            <label>
              Equipment
              <input defaultValue="UTM/MTM" />
            </label>
            <label className="method-editor__field-wide">
              Description
              <textarea rows={3} placeholder="(Enter Value)" />
            </label>
          </div>
        </Section>

        <Section
          id="source-selection"
          title="Source Selection"
          refCb={(el) => (sectionRefs.current["source-selection"] = el)}
        >
          <table className="method-editor__mini-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Channel</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Load Cell</td>
                <td>1</td>
                <td>lbf</td>
              </tr>
              <tr>
                <td>Crosshead Position</td>
                <td>2</td>
                <td>in</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section
          id="parameters"
          title="Parameters"
          refCb={(el) => (sectionRefs.current["parameters"] = el)}
        >
          <div className="method-editor__field-grid">
            <label>
              Specimen Width
              <input defaultValue="0" />
            </label>
            <label>
              Specimen Thickness
              <input defaultValue="0" />
            </label>
            <label>
              Gauge Length
              <input defaultValue="0" />
            </label>
          </div>
        </Section>

        <Section id="entries" title="Entries" refCb={(el) => (sectionRefs.current["entries"] = el)}>
          <div className="method-editor__field-grid">
            <label>
              Operator
              <input placeholder="(Enter Value)" />
            </label>
            <label>
              Batch / Lot #
              <input placeholder="(Enter Value)" />
            </label>
          </div>
        </Section>

        <Section
          id="data-importing"
          title="Data Importing"
          refCb={(el) => (sectionRefs.current["data-importing"] = el)}
        >
          <p className="method-editor__hint">
            Chưa có cấu hình import dữ liệu cho method này.
          </p>
        </Section>

        {/* -------- Control Segments (phần chi tiết chính) -------- */}
        <Section
          id="control-segments"
          title="Control Segments"
          refCb={(el) => (sectionRefs.current["control-segments"] = el)}
        >
          <div className="method-editor__seg-toolbar">
            <button className="method-editor__tool" onClick={addSegment}>
              <span className="method-editor__tool-icon">✦</span>Add
            </button>
            <button className="method-editor__tool" onClick={() => insertRelative(0)}>
              <span className="method-editor__tool-icon">⭆</span>Insert Before
            </button>
            <button className="method-editor__tool" onClick={() => insertRelative(1)}>
              <span className="method-editor__tool-icon">⭇</span>Insert After
            </button>
            <span className="method-editor__divider" />
            <button className="method-editor__tool" onClick={cutSelected}>
              <span className="method-editor__tool-icon">✂</span>Cut
            </button>
            <button className="method-editor__tool" onClick={copySelected}>
              <span className="method-editor__tool-icon">⧉</span>Copy
            </button>
            <button
              className="method-editor__tool"
              disabled={!clipboard}
              onClick={() => pasteAt("current")}
            >
              Paste Current
            </button>
            <button
              className="method-editor__tool"
              disabled={!clipboard}
              onClick={() => pasteAt("before")}
            >
              Paste Before
            </button>
            <button
              className="method-editor__tool"
              disabled={!clipboard}
              onClick={() => pasteAt("after")}
            >
              Paste After
            </button>
            <span className="method-editor__divider" />
            <button className="method-editor__tool" onClick={deleteSelected}>
              <span className="method-editor__tool-icon method-editor__tool-icon--danger">✕</span>
              Delete
            </button>
            <button className="method-editor__tool" onClick={expandAll}>
              Expand All
            </button>
            <button className="method-editor__tool" onClick={collapseAll}>
              Collapse All
            </button>
          </div>

          <div className="method-editor__seg-header">
            <span>Segment #</span>
            <span>Control Mode</span>
            <span>Control Source</span>
            <span>Control Value</span>
            <span>Control Units</span>
            <span>End Condition</span>
            <span>End Source</span>
          </div>

          <div className="method-editor__seg-list">
            {segments.map((seg, idx) => (
              <div
                key={seg.id}
                className={
                  "method-editor__seg" +
                  (seg.id === selectedSegmentId ? " method-editor__seg--selected" : "")
                }
                onClick={() => setSelectedSegmentId(seg.id)}
              >
                <div className="method-editor__seg-row">
                  <span className="method-editor__seg-num">{idx + 1}</span>
                  <button
                    className="method-editor__seg-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(seg.id);
                    }}
                  >
                    {seg.expanded ? "▲" : "▼"}
                  </button>

                  <select
                    value={seg.controlMode}
                    onChange={(e) =>
                      updateSegment(seg.id, { controlMode: e.target.value as ControlMode })
                    }
                  >
                    {CONTROL_MODES.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={seg.controlSource}
                    onChange={(e) => updateSegment(seg.id, { controlSource: e.target.value })}
                  >
                    {CONTROL_SOURCES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>

                  <span className="method-editor__seg-value">
                    <span className="method-editor__seg-value-icon">📈</span>
                    <input
                      type="number"
                      step="0.01"
                      value={seg.controlValue}
                      onChange={(e) =>
                        updateSegment(seg.id, { controlValue: Number(e.target.value) })
                      }
                    />
                  </span>

                  <select
                    value={seg.controlUnit}
                    onChange={(e) => updateSegment(seg.id, { controlUnit: e.target.value })}
                  >
                    {CONTROL_UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>

                  <select
                    value={seg.endCondition}
                    onChange={(e) =>
                      updateSegment(seg.id, { endCondition: e.target.value as EndCondition })
                    }
                  >
                    {END_CONDITIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={seg.endSource}
                    onChange={(e) => updateSegment(seg.id, { endSource: e.target.value })}
                    disabled={seg.endCondition === "Specimen Break"}
                  >
                    {END_SOURCES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {seg.expanded && (
                  <div className="method-editor__seg-panel">
                    <fieldset className="method-editor__box">
                      <legend>Segment Options</legend>
                      <label className="method-editor__checkbox">
                        <input
                          type="checkbox"
                          checked={seg.options.watchForSpecimenBreak}
                          onChange={(e) =>
                            updateSegmentOptions(seg.id, {
                              watchForSpecimenBreak: e.target.checked,
                            })
                          }
                        />
                        Watch for Specimen Break
                      </label>
                      <label className="method-editor__checkbox">
                        <input
                          type="checkbox"
                          checked={seg.options.captureData}
                          onChange={(e) =>
                            updateSegmentOptions(seg.id, { captureData: e.target.checked })
                          }
                        />
                        Capture Data
                      </label>
                      <label className="method-editor__checkbox">
                        <input
                          type="checkbox"
                          checked={seg.options.timeout}
                          onChange={(e) =>
                            updateSegmentOptions(seg.id, { timeout: e.target.checked })
                          }
                        />
                        Timeout
                      </label>
                      <label className="method-editor__inline-field">
                        Timeout Value (sec):
                        <input
                          type="number"
                          value={seg.options.timeoutValueSec}
                          onChange={(e) =>
                            updateSegmentOptions(seg.id, {
                              timeoutValueSec: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="method-editor__inline-field">
                        Segment Label:
                        <input
                          value={seg.options.segmentLabel}
                          placeholder="(Enter Value)"
                          onChange={(e) =>
                            updateSegmentOptions(seg.id, { segmentLabel: e.target.value })
                          }
                        />
                      </label>
                      <label className="method-editor__inline-field">
                        Keyboard Entry Instructions:
                        <input
                          value={seg.options.keyboardEntryInstructions}
                          onChange={(e) =>
                            updateSegmentOptions(seg.id, {
                              keyboardEntryInstructions: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="method-editor__checkbox">
                        <input
                          type="checkbox"
                          checked={seg.options.endConditionStateTest}
                          onChange={(e) =>
                            updateSegmentOptions(seg.id, {
                              endConditionStateTest: e.target.checked,
                            })
                          }
                        />
                        End Condition State Test
                      </label>
                      <label className="method-editor__inline-field">
                        Duration Value (sec):
                        <input
                          type="number"
                          value={seg.options.durationValueSec}
                          onChange={(e) =>
                            updateSegmentOptions(seg.id, {
                              durationValueSec: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </fieldset>

                    <fieldset className="method-editor__box">
                      <legend>VMC Gain Options</legend>
                      <label className="method-editor__radio">
                        <input
                          type="radio"
                          name={`gains-${seg.id}`}
                          checked={seg.options.gainsSource === "vmc"}
                          onChange={() => updateSegmentOptions(seg.id, { gainsSource: "vmc" })}
                        />
                        Use Gains from VMC
                      </label>
                      <label className="method-editor__radio">
                        <input
                          type="radio"
                          name={`gains-${seg.id}`}
                          checked={seg.options.gainsSource === "horizon"}
                          onChange={() =>
                            updateSegmentOptions(seg.id, { gainsSource: "horizon" })
                          }
                        />
                        Use Gains in Horizon
                      </label>
                      {seg.options.gainsSource === "horizon" && (
                        <div className="method-editor__sub-fields">
                          <label className="method-editor__inline-field">
                            Derivative Sample Interval:
                            <input
                              type="number"
                              value={seg.options.derivativeSampleInterval}
                              onChange={(e) =>
                                updateSegmentOptions(seg.id, {
                                  derivativeSampleInterval: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="method-editor__inline-field">
                            Integrator Limit (%):
                            <input
                              type="number"
                              value={seg.options.integratorLimitPct}
                              onChange={(e) =>
                                updateSegmentOptions(seg.id, {
                                  integratorLimitPct: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="method-editor__inline-field">
                            Max Error:
                            <input
                              type="number"
                              value={seg.options.maxError}
                              onChange={(e) =>
                                updateSegmentOptions(seg.id, {
                                  maxError: Number(e.target.value),
                                })
                              }
                            />
                            <select
                              value={seg.options.maxErrorUnit}
                              onChange={(e) =>
                                updateSegmentOptions(seg.id, {
                                  maxErrorUnit: e.target.value,
                                })
                              }
                            >
                              <option>in</option>
                              <option>mm</option>
                            </select>
                          </label>
                        </div>
                      )}
                    </fieldset>

                    <fieldset className="method-editor__box">
                      <legend>VMC Segment Options</legend>
                      <label className="method-editor__inline-field">
                        PID Control Mode:
                        <select
                          value={seg.options.pidControlMode}
                          onChange={(e) =>
                            updateSegmentOptions(seg.id, {
                              pidControlMode: e.target.value as "Auto" | "Manual",
                            })
                          }
                        >
                          <option>Auto</option>
                          <option>Manual</option>
                        </select>
                      </label>
                    </fieldset>

                    <fieldset className="method-editor__box method-editor__box--wide">
                      <legend>Segment Actions</legend>
                      <table className="method-editor__mini-table">
                        <thead>
                          <tr>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seg.options.actions.map((a, i) => (
                            <tr key={i}>
                              <td>{a}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </fieldset>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="control-options"
          title="Control Options"
          refCb={(el) => (sectionRefs.current["control-options"] = el)}
        >
          <div className="method-editor__field-grid">
            <label className="method-editor__checkbox">
              <input type="checkbox" defaultChecked />
              Zero Position at Start
            </label>
            <label className="method-editor__checkbox">
              <input type="checkbox" />
              Zero Force at Start
            </label>
          </div>
        </Section>

        <Section
          id="output-selection"
          title="Output Selection"
          refCb={(el) => (sectionRefs.current["output-selection"] = el)}
        >
          <p className="method-editor__hint">
            Chưa gán Output cho method này — bấm sang tab Outputs ở Library Tools để tạo mới.
          </p>
        </Section>
      </div>

      <footer className="method-editor__footer">Tinius Olsen Horizon</footer>
    </div>
  );
}

function Section({
  id,
  title,
  children,
  refCb,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  refCb: (el: HTMLDivElement | null) => void;
}) {
  return (
    <section id={id} ref={refCb} className="method-editor__section">
      <h3 className="method-editor__section-title">{title}</h3>
      {children}
    </section>
  );
}