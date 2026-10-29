import { useCallback, useEffect, useState } from "react";
import { dbApi } from "../../hooks/projectApi";
import type { PortDims, Project, SpecimenInfo, SpecimenSetup } from "../../hooks/projectApi";
import "./ProjectBar.css";

interface Props {
  disabled: boolean; // đang ghi => khoá đổi project/mẫu
  specimen: SpecimenInfo | null;
  onSelectSpecimen: (specimen: SpecimenInfo | null) => void;
}

type DimKey = "t" | "b" | "l0" | "lu" | "bu";
const COLUMNS: { key: DimKey; label: string }[] = [
  { key: "t", label: "t - chiều dày (mm)" },
  { key: "b", label: "b - chiều rộng (mm)" },
  { key: "l0", label: "Lo (mm)" },
  { key: "lu", label: "Lu (mm) - tuỳ chọn" },
  { key: "bu", label: "bu (mm) - tuỳ chọn" },
];

const SETUP_FIELDS: { key: keyof SpecimenSetup; label: string }[] = [
  { key: "sampleLength", label: "Tổng chiều dài mẫu (mm)" },
  { key: "supportSpan", label: "Khoảng cách 2 gối tựa (mm)" },
  { key: "loadPointPos", label: "Vị trí đặt lực từ gối tựa trái (mm)" },
  { key: "bearingDia", label: "Đường kính gối tựa (mm)" },
  { key: "loadDia", label: "Đường kính đầu đặt lực (mm)" },
  { key: "weightG", label: "Trọng lượng mẫu (g)" },
];

const emptyDims = () => [0, 1, 2].map(() => ({ t: "", b: "", l0: "", lu: "", bu: "" }));
const emptySetup = (): Record<keyof SpecimenSetup, string> => ({
  sampleLength: "", supportSpan: "", loadPointPos: "", bearingDia: "", loadDia: "", weightG: "",

});
const toNum = (s: string) => parseFloat(s.replace(",", "."));

// "" -> null (bỏ trống); số hợp lệ >= 0 -> số; còn lại -> undefined (lỗi)
function optional(s: string): number | null | undefined {
  const text = s.trim();
  if (!text) return null;
  const v = toNum(text);
  return Number.isFinite(v) && v >= 0 ? v : undefined;
}

export default function ProjectBar({ disabled, specimen, onSelectSpecimen }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [specimens, setSpecimens] = useState<SpecimenInfo[]>([]);
  const [modal, setModal] = useState<"project" | "specimen" | null>(null);
  const [projectName, setProjectName] = useState("");
  const [specimenName, setSpecimenName] = useState("");
  const [dims, setDims] = useState(emptyDims);
  const [setupTexts, setSetupTexts] = useState(emptySetup);
  const [error, setError] = useState("");
  const api = dbApi();

  const loadProjects = useCallback(async () => {
    if (!api) return;
    try { setProjects(await api.listProjects()); } catch { /* chưa active license */ }
  }, [api]);

  const loadSpecimens = useCallback(async (id: number) => {
    if (!api) return;
    setSpecimens(await api.listSpecimens(id));
  }, [api]);


  useEffect(() => { void loadProjects(); }, [loadProjects]);

  async function createProject() {
    if (!api || !projectName.trim()) { setError("Nhập tên project."); return; }
    const p = await api.createProject(projectName);
    setModal(null); setProjectName(""); setError("");
    await loadProjects();
    selectProject(p.id);
  }

  function selectProject(id: number | null) {
    setProjectId(id);
    onSelectSpecimen(null);
    setSpecimens([]);
    if (id !== null) void loadSpecimens(id);
  }

  async function createSpecimen() {
    if (!api || projectId === null) return;
    if (!specimenName.trim()) { setError("Nhập tên mẫu."); return; }

    const ports: PortDims[] = [];
    for (let i = 0; i < 3; i++) {
      const t = toNum(dims[i].t), b = toNum(dims[i].b), l0 = toNum(dims[i].l0);
      if (![t, b, l0].every((v) => Number.isFinite(v) && v > 0)) {
        setError(`NO.${i + 1} (HX${i + 1}): t, b, Lo phải là số > 0.`);
        return;
      }
      const lu = optional(dims[i].lu), bu = optional(dims[i].bu);
      if (lu === undefined || bu === undefined) {
        setError(`NO.${i + 1} (HX${i + 1}): Lu, bu phải là số ≥ 0 hoặc để trống.`);

        return;
      }
      ports.push({ port: (i + 1) as 1 | 2 | 3, t, b, l0, lu, bu });
    }

    const setup = {} as SpecimenSetup;
    for (const { key, label } of SETUP_FIELDS) {
      const v = optional(setupTexts[key]);
      if (v === undefined) { setError(`${label}: phải là số ≥ 0 hoặc để trống.`); return; }
      setup[key] = v;
    }

    const created = await api.createSpecimen({ projectId, name: specimenName, setup, ports });
    setModal(null); setSpecimenName(""); setError("");
    setDims(emptyDims()); setSetupTexts(emptySetup());
    await loadSpecimens(projectId);
    onSelectSpecimen(created);
  }

  if (!api) return null;

  return (
    <div className="pb-bar">
      <div className="pb-group">
        <span className="pb-label">Project:</span>
        <select className="pb-select" disabled={disabled} value={projectId ?? ""}
          onChange={(e) => selectProject(e.target.value ? Number(e.target.value) : null)}>
          <option value="">-- chọn --</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="pb-btn" disabled={disabled} onClick={() => { setError(""); setModal("project"); }}>
          ＋ Tạo project

        </button>
      </div>

      <div className="pb-group">
        <span className="pb-label">Mẫu:</span>
        <select className="pb-select" disabled={disabled || projectId === null} value={specimen?.id ?? ""}
          onChange={(e) => onSelectSpecimen(specimens.find((s) => s.id === Number(e.target.value)) ?? null)}>
          <option value="">-- chọn --</option>
          {specimens.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="pb-btn" disabled={disabled || projectId === null} onClick={() => { setError(""); setModal("specimen"); }}>
          ＋ Tạo mẫu
        </button>
      </div>

      {specimen && (
        <div className="pb-info">
          {specimen.ports.map((p) => (
            <span key={p.port} className={`pb-chip pb-chip--${p.port}`}>
              NO.{p.port} · t=<b>{p.t}</b> b=<b>{p.b}</b> Lo=<b>{p.l0}</b>
            </span>
          ))}
          {specimen.setup.supportSpan != null && (
            <span className="pb-chip">Span=<b>{specimen.setup.supportSpan}</b></span>
          )}
        </div>
      )}

      {modal === "project" && (
        <div className="pb-overlay">
          <div className="pb-dialog pb-dialog--small">
            <div className="pb-dialog__header">Tạo project</div>

            <div className="pb-dialog__body">
              <input autoFocus className="pb-input pb-input--full" placeholder="Tên project" value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void createProject(); }} />
              {error && <p className="pb-error">{error}</p>}
            </div>
            <div className="pb-dialog__footer">
              <button className="pb-btn" onClick={() => setModal(null)}>Huỷ</button>
              <button className="pb-btn pb-btn--primary" onClick={createProject}>Tạo</button>
            </div>
          </div>
        </div>
      )}

      {modal === "specimen" && (
        <div className="pb-overlay">
          <div className="pb-dialog">
            <div className="pb-dialog__header">Tạo mẫu</div>
            <div className="pb-dialog__body">
              <input autoFocus className="pb-input pb-input--full" placeholder="Tên mẫu" value={specimenName}
                onChange={(e) => setSpecimenName(e.target.value)} />

              <div className="pb-section">Kích thước theo cổng</div>
              <table className="pb-table">
                <thead><tr><th>Cổng</th>{COLUMNS.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>
                  {dims.map((d, i) => (
                    <tr key={i}>
                      <td>{`NO.${i + 1} · HX${i + 1}`}</td>
                      {COLUMNS.map(({ key }) => (
                        <td key={key}>
                          <input className="pb-input pb-input--num" type="text" inputMode="decimal" value={d[key]}

                            onChange={(e) => setDims((old) => old.map((x, j) => j === i ? { ...x, [key]: e.target.value } : x))} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pb-hint">S0 = t × b được tính tự động. Lu, bu đo sau khi mẫu đứt, có thể để trống.</div>

              <div className="pb-section">Thông số thử uốn 3 điểm (không bắt buộc, để trống = null)</div>
              <table className="pb-table">
                <tbody>
                  {SETUP_FIELDS.map(({ key, label }) => (
                    <tr key={key}>
                      <td>{label}</td>
                      <td>
                        <input className="pb-input pb-input--num" type="text" inputMode="decimal" value={setupTexts[key]}
                          onChange={(e) => setSetupTexts((old) => ({ ...old, [key]: e.target.value }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pb-hint">
                Cần "Khoảng cách 2 gối tựa" để tính cường độ, mô đun và biến dạng uốn.
              </div>

              {error && <p className="pb-error">{error}</p>}
            </div>
            <div className="pb-dialog__footer">
              <button className="pb-btn" onClick={() => setModal(null)}>Huỷ</button>
              <button className="pb-btn pb-btn--primary" onClick={createSpecimen}>Tạo</button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}