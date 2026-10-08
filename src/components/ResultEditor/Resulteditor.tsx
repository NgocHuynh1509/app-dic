import { useEffect, useRef, useState } from "react";
import "./ResultEditor.css";

/* ---------------- Types ---------------- */

type ResultTypeKey = "At Point" | "At Break" | "Slope" | "Offset" | "Area Under Curve";
type SourceType = "Specified" | "Force";
type Location = "Maximum First" | "Minimum First" | "First Occurrence" | "Last Occurrence";
type Comparison = "Positive Slope" | "Negative Slope" | "Nearest";
type Category = "Strength" | "Elongation" | "Modulus" | "Custom";

interface FormulaParameter {
  id: string;
  test: string;
  parameter: string;
}

interface OutputRow {
  id: string;
  name: string;
  assigned: boolean;
  order: number;
  showUnits: boolean;
}

const RIBBON_SECTIONS = [
  { id: "base-information", label: "Base\nInformation", icon: "▤" },
  { id: "result-type", label: "Result\nType", icon: "ƒ(x)" },
  { id: "output-selection", label: "Output\nSelection", icon: "▧" },
];

const AVAILABLE_PARAMETERS: FormulaParameter[] = [
  { id: "p1", test: "This Test", parameter: "Ultimate Force" },
  { id: "p2", test: "This Test", parameter: "Break Stress" },
  { id: "p3", test: "This Test", parameter: "Gauge Length" },
  { id: "p4", test: "Cross Section", parameter: "Area" },
  { id: "p5", test: "Extensometer", parameter: "Elongation at Break" },
];

const DEFAULT_OUTPUTS: OutputRow[] = [
  { id: "o1", name: "Generic Metals Tensile with Ext.", assigned: true, order: 1, showUnits: true },
  { id: "o2", name: "16 CFR 1500 Toy Safety (5x) Tension Tests", assigned: false, order: 2, showUnits: true },
  { id: "o3", name: "ASTM D638 Plastics Tensile", assigned: false, order: 3, showUnits: false },
  { id: "o4", name: "Customer Certificate of Conformance", assigned: false, order: 4, showUnits: true },
];

export default function ResultEditor({
  selectedResultName,
}: {
  selectedResultName?: string;
} = {}) {
  const [resultName, setResultName] = useState(selectedResultName ?? "Ultimate Force");
  const [activeSection, setActiveSection] = useState(RIBBON_SECTIONS[1].id);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Nâng lên đây vì cả Result Type lẫn phần Formula (Base Information) đều
  // cần bị khoá khi result đến từ thư viện Standard, giống ảnh
  // "(This result cannot be edited.)".
  const [isStandard, setIsStandard] = useState(true);
  const editable = !isStandard;

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

  return (
    <div className="result-editor">
      <div className="result-editor__infobar">
        <span className="result-editor__infobar-label">Selected Result:</span>
        <span className="result-editor__infobar-value">{resultName}</span>
        <div className="result-editor__spacer" />
        <label className="result-editor__checkbox result-editor__demo-toggle">
          <input
            type="checkbox"
            checked={isStandard}
            onChange={(e) => setIsStandard(e.target.checked)}
          />
          Standard Result (khoá)
        </label>
        <button className="result-editor__tool">
          <span className="result-editor__tool-icon">📁</span>Load
        </button>
        <button className="result-editor__tool">
          <span className="result-editor__tool-icon">💾</span>Save
        </button>
        <button className="result-editor__tool">
          <span className="result-editor__tool-icon">📄</span>Save As...
        </button>
      </div>

      <nav className="result-editor__ribbon">
        {RIBBON_SECTIONS.map((s) => (
          <button
            key={s.id}
            className={
              "result-editor__ribbon-item" +
              (activeSection === s.id ? " result-editor__ribbon-item--active" : "")
            }
            onClick={() => scrollToSection(s.id)}
          >
            <span className="result-editor__ribbon-icon">{s.icon}</span>
            <span className="result-editor__ribbon-label">
              {s.label.split("\n").map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </span>
          </button>
        ))}
      </nav>

      <div className="result-editor__scroll">
        <BaseInformationSection
          refCb={(el) => (sectionRefs.current["base-information"] = el)}
          resultName={resultName}
          onResultNameChange={setResultName}
          editable={editable}
        />

        <ResultTypeSection
          refCb={(el) => (sectionRefs.current["result-type"] = el)}
          editable={editable}
        />

        <OutputSelectionSection
          refCb={(el) => (sectionRefs.current["output-selection"] = el)}
        />
      </div>

      <footer className="result-editor__footer">Tinius Olsen Horizon</footer>
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
    <section id={id} ref={refCb} className="result-editor__section">
      <h3 className="result-editor__section-title">{title}</h3>
      {children}
    </section>
  );
}

/* ---------------- Base Information ---------------- */

function BaseInformationSection({
  refCb,
  resultName,
  onResultNameChange,
  editable,
}: {
  refCb: (el: HTMLDivElement | null) => void;
  resultName: string;
  onResultNameChange: (v: string) => void;
  editable: boolean;
}) {
  const [category, setCategory] = useState<Category>("Strength");
  const [defaultUnits, setDefaultUnits] = useState("N");
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const [enabled, setEnabled] = useState(true);
  const [description, setDescription] = useState(
    "Lực lớn nhất ghi nhận được trong suốt quá trình thử."
  );

  // --- Custom formula (chỉ khoá khi Standard Result) ---
  const [useCustomFormula, setUseCustomFormula] = useState(false);
  const [formula, setFormula] = useState("");
  const [selectedParamId, setSelectedParamId] = useState<string | null>(null);
  const formulaError =
    useCustomFormula && formula.trim().length > 0 && !isBalanced(formula)
      ? "Công thức không hợp lệ: dấu ngoặc chưa cân bằng."
      : null;

  function insertParameter(p: FormulaParameter) {
    if (!editable) return;
    const token = `[${p.test}.${p.parameter}]`;
    setFormula((prev) => (prev ? `${prev} ${token}` : token));
    setSelectedParamId(p.id);
  }

  return (
    <Section id="base-information" title="Base Information" refCb={refCb}>
      <div className="result-editor__field-grid">
        <label>
          Result ID
          <input value="RES-0001" readOnly className="result-editor__readonly" />
        </label>
        <label>
          Result Name
          <input
            value={resultName}
            onChange={(e) => onResultNameChange(e.target.value)}
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            <option>Strength</option>
            <option>Elongation</option>
            <option>Modulus</option>
            <option>Custom</option>
          </select>
        </label>
        <label>
          Default Units
          <input value={defaultUnits} onChange={(e) => setDefaultUnits(e.target.value)} />
        </label>
        <label>
          Decimal Places
          <input
            type="number"
            min={0}
            max={8}
            value={decimalPlaces}
            onChange={(e) => setDecimalPlaces(Number(e.target.value))}
          />
        </label>
        <label className="result-editor__checkbox result-editor__checkbox--aligned">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled (tham gia tính toán &amp; hiển thị)
        </label>
        <label className="result-editor__field-wide">
          Description
          <textarea
            rows={2}
            placeholder="(Enter Value)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="result-editor__box" disabled={!editable}>
        <legend>Formula</legend>
        <label className="result-editor__checkbox">
          <input
            type="checkbox"
            checked={useCustomFormula}
            onChange={(e) => setUseCustomFormula(e.target.checked)}
          />
          Use Custom Formula
        </label>

        {!editable && (
          <p className="result-editor__warning">(This result cannot be edited.)</p>
        )}

        {useCustomFormula && (
          <>
            <label className="result-editor__inline-field result-editor__formula-field">
              Formula:
              <input
                value={formula}
                placeholder="vd: [This Test.Ultimate Force] / [Cross Section.Area]"
                onChange={(e) => setFormula(e.target.value)}
              />
            </label>
            {formulaError && <p className="result-editor__error">{formulaError}</p>}

            <p className="result-editor__hint result-editor__hint--tight">
              Chọn một tham số bên dưới và bấm Insert để chèn vào công thức. Có thể lấy tham số
              từ phép thử hiện tại hoặc từ các thiết bị/phép thử khác.
            </p>

            <table className="result-editor__param-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Test / Device</th>
                  <th>Parameter</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {AVAILABLE_PARAMETERS.map((p) => (
                  <tr
                    key={p.id}
                    className={
                      selectedParamId === p.id ? "result-editor__param-row--selected" : ""
                    }
                    onClick={() => editable && setSelectedParamId(p.id)}
                  >
                    <td>
                      <input
                        type="radio"
                        name="formula-param"
                        checked={selectedParamId === p.id}
                        onChange={() => setSelectedParamId(p.id)}
                      />
                    </td>
                    <td>{p.test}</td>
                    <td>{p.parameter}</td>
                    <td>
                      <button
                        type="button"
                        className="result-editor__tool"
                        disabled={!editable}
                        onClick={() => insertParameter(p)}
                      >
                        Insert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </fieldset>
    </Section>
  );
}

function isBalanced(s: string): boolean {
  let depth = 0;
  for (const ch of s) {
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/* ---------------- Result Type (phần chính, dựng theo ảnh) ---------------- */

function ResultTypeSection({
  refCb,
  editable,
}: {
  refCb: (el: HTMLDivElement | null) => void;
  editable: boolean;
}) {
  const [resultType, setResultType] = useState<ResultTypeKey>("At Point");
  const [answerSource, setAnswerSource] = useState("End");
  const [sourceType, setSourceType] = useState<SourceType>("Force");
  const [location, setLocation] = useState<Location>("Maximum First");
  const [subtractElasticStrain, setSubtractElasticStrain] = useState(false);
  const [atResult, setAtResult] = useState("<None>");
  const [specifiedValue, setSpecifiedValue] = useState(0);
  const [specifiedUnits, setSpecifiedUnits] = useState("N");
  const [comparison, setComparison] = useState<Comparison>("Positive Slope");
  const [segmentBased, setSegmentBased] = useState(false);
  const [segmentLabel, setSegmentLabel] = useState("");

  return (
    <Section id="result-type" title="Result Type" refCb={refCb}>
      <div className="result-editor__type-head">
        <span className="result-editor__type-label">
          Result Type: <b>{resultType}</b>
        </span>
      </div>

      {!editable && (
        <p className="result-editor__warning">(This result cannot be edited.)</p>
      )}

      <fieldset className="result-editor__box" disabled={!editable}>
        <legend>Answer</legend>
        <label className="result-editor__inline-field">
          Type:
          <select value={resultType} onChange={(e) => setResultType(e.target.value as ResultTypeKey)}>
            <option>At Point</option>
            <option>At Break</option>
            <option>Slope</option>
            <option>Offset</option>
            <option>Area Under Curve</option>
          </select>
        </label>
        <label className="result-editor__inline-field">
          Source:
          <select value={answerSource} onChange={(e) => setAnswerSource(e.target.value)}>
            <option>Start</option>
            <option>End</option>
            <option>Peak</option>
            <option>Break</option>
          </select>
        </label>
      </fieldset>

      {resultType === "At Point" && (
        <>
          <fieldset className="result-editor__box" disabled={!editable}>
            <legend>At Point</legend>
            <div className="result-editor__inline-field">
              Source Type:
              <div className="result-editor__toggle-group">
                <button
                  type="button"
                  className={
                    "result-editor__toggle-btn" + (sourceType === "Specified" ? " result-editor__toggle-btn--active" : "")
                  }
                  onClick={() => editable && setSourceType("Specified")}
                >
                  Specified
                </button>
                <button
                  type="button"
                  className={
                    "result-editor__toggle-btn" + (sourceType === "Force" ? " result-editor__toggle-btn--active" : "")
                  }
                  onClick={() => editable && setSourceType("Force")}
                >
                  Force
                </button>
              </div>
            </div>
            <label className="result-editor__inline-field">
              Location:
              <select value={location} onChange={(e) => setLocation(e.target.value as Location)}>
                <option>Maximum First</option>
                <option>Minimum First</option>
                <option>First Occurrence</option>
                <option>Last Occurrence</option>
              </select>
            </label>
            <label className="result-editor__checkbox">
              <input
                type="checkbox"
                checked={subtractElasticStrain}
                onChange={(e) => setSubtractElasticStrain(e.target.checked)}
              />
              Subtract Elastic Strain
            </label>
          </fieldset>

          <fieldset className="result-editor__box" disabled={!editable}>
            <legend>At Result</legend>
            <label className="result-editor__inline-field">
              Reference Result:
              <select value={atResult} onChange={(e) => setAtResult(e.target.value)}>
                <option>{"<None>"}</option>
                <option>Break Stress</option>
                <option>Ultimate Force</option>
              </select>
            </label>
          </fieldset>

          {sourceType === "Specified" && (
            <fieldset className="result-editor__box" disabled={!editable}>
              <legend>Specified Value</legend>
              <div className="result-editor__field-grid">
                <label>
                  Value
                  <input
                    type="number"
                    value={specifiedValue}
                    onChange={(e) => setSpecifiedValue(Number(e.target.value))}
                  />
                </label>
                <label>
                  Units
                  <input value={specifiedUnits} onChange={(e) => setSpecifiedUnits(e.target.value)} />
                </label>
                <label>
                  Comparison
                  <select value={comparison} onChange={(e) => setComparison(e.target.value as Comparison)}>
                    <option>Positive Slope</option>
                    <option>Negative Slope</option>
                    <option>Nearest</option>
                  </select>
                </label>
              </div>
              <button type="button" className="result-editor__tool" disabled={!editable}>
                Reset Location
              </button>
              <p className="result-editor__hint result-editor__hint--tight">
                Reset Location sẽ đưa điểm tìm kiếm về lại vị trí Ultimate Force Point theo điều
                kiện Comparison đã chọn ở trên.
              </p>
            </fieldset>
          )}
        </>
      )}

      <fieldset className="result-editor__box" disabled={!editable}>
        <legend>Segment Based</legend>
        <label className="result-editor__checkbox">
          <input type="checkbox" checked={segmentBased} onChange={(e) => setSegmentBased(e.target.checked)} />
          Segment Based
        </label>
        <label className="result-editor__inline-field">
          Segment Label:
          <input value={segmentLabel} onChange={(e) => setSegmentLabel(e.target.value)} />
        </label>
      </fieldset>
    </Section>
  );
}

/* ---------------- Output Selection ---------------- */

function OutputSelectionSection({
  refCb,
}: {
  refCb: (el: HTMLDivElement | null) => void;
}) {
  const [outputs, setOutputs] = useState<OutputRow[]>(DEFAULT_OUTPUTS);
  const [search, setSearch] = useState("");

  const filtered = outputs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );
  const assignedCount = outputs.filter((o) => o.assigned).length;
  const allAssigned = outputs.length > 0 && assignedCount === outputs.length;

  function toggleOne(id: string) {
    setOutputs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, assigned: !o.assigned } : o))
    );
  }

  function toggleAll() {
    setOutputs((prev) => prev.map((o) => ({ ...o, assigned: !allAssigned })));
  }

  function updateOrder(id: string, order: number) {
    setOutputs((prev) => prev.map((o) => (o.id === id ? { ...o, order } : o)));
  }

  function toggleShowUnits(id: string) {
    setOutputs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, showUnits: !o.showUnits } : o))
    );
  }

  return (
    <Section id="output-selection" title="Output Selection" refCb={refCb}>
      <p className="result-editor__hint">
        Chọn các Output sẽ hiển thị kết quả này trong báo cáo (Report → Section → Result
        Selection ở trang Output Editor). Với mỗi Output đã gán, có thể tuỳ chỉnh thứ tự cột
        (Order) và có hiển thị đơn vị (Show Units) hay không.
      </p>

      <div className="result-editor__seg-toolbar">
        <input
          className="result-editor__search"
          placeholder="Tìm Output..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="result-editor__tool" onClick={toggleAll}>
          {allAssigned ? "Clear All" : "Select All"}
        </button>
        <span className="result-editor__hint result-editor__hint--tight">
          {assignedCount}/{outputs.length} output đã gán
        </span>
      </div>

      <table className="result-editor__mini-table">
        <thead>
          <tr>
            <th>Gán vào Output</th>
            <th>Tên Output</th>
            <th>Order</th>
            <th>Show Units</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.id}>
              <td>
                <input
                  type="checkbox"
                  checked={o.assigned}
                  onChange={() => toggleOne(o.id)}
                />
              </td>
              <td>{o.name}</td>
              <td>
                <input
                  type="number"
                  min={1}
                  value={o.order}
                  disabled={!o.assigned}
                  onChange={(e) => updateOrder(o.id, Number(e.target.value))}
                  className="result-editor__order-input"
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={o.showUnits}
                  disabled={!o.assigned}
                  onChange={() => toggleShowUnits(o.id)}
                />
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={4} className="result-editor__hint result-editor__hint--tight">
                Không tìm thấy Output phù hợp.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Section>
  );
}