import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { dbApi } from "../../hooks/projectApi";
import type { PortDims, Project, SpecimenInfo } from "../../hooks/projectApi";

interface Props {
  disabled: boolean; // đang ghi => khoá đổi project/mẫu
  specimen: SpecimenInfo | null;
  onSelectSpecimen: (specimen: SpecimenInfo | null) => void;
}

const overlay: CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 1000,
};
const dialog: CSSProperties = {
  background: "#2b2b2b", color: "#eee", padding: 16, borderRadius: 6, minWidth: 640,
  maxHeight: "90vh", overflowY: "auto", border: "1px solid #555",
};
const inp: CSSProperties = { width: 80, padding: "3px 6px" };

type DimKey = "t" | "b" | "l0" | "lu" | "bu";
const COLUMNS: { key: DimKey; label: string }[] = [
  { key: "t", label: "t - chiều dày (mm)" },
  { key: "b", label: "b - chiều rộng (mm)" },
  { key: "l0", label: "Lo (mm)" },
  { key: "lu", label: "Lu (mm) - tuỳ chọn" },
  { key: "bu", label: "bu (mm) - tuỳ chọn" },
];

const emptyDims = () => [0, 1, 2].map(() => ({ t: "", b: "", l0: "", lu: "", bu: "" }));
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
    const created = await api.createSpecimen({ projectId, name: specimenName, ports });
    setModal(null); setSpecimenName(""); setError("");
    setDims(emptyDims());
    await loadSpecimens(projectId);
    onSelectSpecimen(created);
  }

  if (!api) return null;

  return (
    <div className="h5kt-project-bar" style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 8px", fontSize: 12, flexWrap: "wrap" }}>
      <span>Project:</span>
      <select disabled={disabled} value={projectId ?? ""} onChange={(e) => selectProject(e.target.value ? Number(e.target.value) : null)}>
        <option value="">-- chọn --</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button disabled={disabled} onClick={() => { setError(""); setModal("project"); }}>＋ Tạo project</button>

      <span style={{ marginLeft: 12 }}>Mẫu:</span>
      <select disabled={disabled || projectId === null} value={specimen?.id ?? ""}
        onChange={(e) => onSelectSpecimen(specimens.find((s) => s.id === Number(e.target.value)) ?? null)}>
        <option value="">-- chọn --</option>
        {specimens.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button disabled={disabled || projectId === null} onClick={() => { setError(""); setModal("specimen"); }}>＋ Tạo mẫu</button>

      {specimen && (
        <span style={{ color: "#aaa" }}>
          {specimen.ports.map((p) => `NO.${p.port}: t=${p.t} b=${p.b} Lo=${p.l0}`).join(" · ")}
        </span>
      )}

      {modal === "project" && (
        <div style={overlay}><div style={dialog}>
          <h3 style={{ marginTop: 0 }}>Tạo project</h3>
          <input autoFocus style={{ width: "100%", padding: 4 }} placeholder="Tên project" value={projectName}
            onChange={(e) => setProjectName(e.target.value)} />
          {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setModal(null)}>Huỷ</button>
            <button onClick={createProject}>Tạo</button>
          </div>
        </div></div>
      )}

      {modal === "specimen" && (
        <div style={overlay}><div style={dialog}>
          <h3 style={{ marginTop: 0 }}>Tạo mẫu</h3>
          <input autoFocus style={{ width: "100%", padding: 4, marginBottom: 10 }} placeholder="Tên mẫu" value={specimenName}
            onChange={(e) => setSpecimenName(e.target.value)} />
          <table style={{ width: "100%" }}>
            <thead><tr><th>Cổng</th>{COLUMNS.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {dims.map((d, i) => (
                <tr key={i}>
                  <td>{`NO.${i + 1} · HX${i + 1}`}</td>
                  {COLUMNS.map(({ key }) => (
                    <td key={key}><input style={inp} type="text" inputMode="decimal" value={d[key]}
                      onChange={(e) => setDims((old) => old.map((x, j) => j === i ? { ...x, [key]: e.target.value } : x))} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ color: "#aaa", marginTop: 6 }}>S0 = t × b được tính tự động. Lu, bu đo sau khi mẫu đứt, có thể để trống.</div>
          {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setModal(null)}>Huỷ</button>
            <button onClick={createSpecimen}>Tạo</button>
          </div>
        </div></div>
      )}
    </div>
  );
}