// t: chiều dày, b: chiều rộng, l0: chiều dài ban đầu (nhập trước khi đo)
// lu: chiều dài sau khi đứt, bu: chiều rộng sau khi đứt (không bắt buộc)
export interface PortDims {
  port: 1 | 2 | 3; t: number; b: number; l0: number; lu: number | null; bu: number | null;
}

// Thông số thử uốn 3 điểm (null = chưa nhập)
export interface SpecimenSetup {
  sampleLength: number | null; // tổng chiều dài mẫu (mm)
  supportSpan: number | null;  // khoảng cách 2 gối tựa (mm)
  loadPointPos: number | null; // vị trí đặt lực từ gối tựa trái (mm)
  bearingDia: number | null;   // đường kính gối tựa (mm)
  loadDia: number | null;      // đường kính đầu đặt lực (mm)
  weightG: number | null;      // trọng lượng mẫu (g)
}

export interface Project { id: number; name: string; createdAt: string }
export interface SpecimenInfo {
  id: number; projectId: number; name: string; createdAt: string;
  setup: SpecimenSetup; ports: PortDims[]; runCount: number;
}

// ----- Dữ liệu đã lưu (màn hình Output) -----
export interface RunSummary {
  runId: number; startedAt: string; rowCount: number;
  specimenId: number; specimenName: string; projectName: string;
}
export interface RunResult {
  run_id: number; port: number; s0: number | null; fm_kn: number | null; rm_mpa: number | null;
  rel_mpa: number | null; fel_kn: number | null; modulus_mpa: number | null; a_pct: number | null;
}
export interface RunBending {
  run_id: number; port: number;
  max_force_n: number | null; deform_at_max_mm: number | null; flexural_strength_mpa: number | null;
  tangent_modulus_mpa: number | null; chord_modulus_mpa: number | null; break_force_n: number | null;
  deform_at_break_mm: number | null; flexural_stress_break_mpa: number | null; strain_at_break_pct: number | null;
}
export interface RunDetail {
  run: RunSummary;
  setup: SpecimenSetup;
  ports: PortDims[];
  results: RunResult[];
  bending: RunBending[];
  charts: { port: number; svg: string }[]; // port 0 = biểu đồ chung
}
export interface MeasurementRow {
  elapsed_s: number | null; channel: number; raw: number | null; delta: number | null; filtered: number | null;
  strain: number | null; length_mm: number | null; force_kn: number | null; stress_mpa: number | null; strain_len: number | null;
}

interface DbAPI {
  listProjects: () => Promise<Project[]>;
  createProject: (name: string) => Promise<Project>;
  listSpecimens: (projectId: number) => Promise<SpecimenInfo[]>;
  createSpecimen: (input: { projectId: number; name: string; setup: SpecimenSetup; ports: PortDims[] }) => Promise<SpecimenInfo>;
  saveRun: (specimenId: number, rows: unknown[]) => Promise<number | null>;
  exportPdf: (specimenId: number) => Promise<{ ok: boolean; path?: string; error?: string }>;
  listAllRuns: () => Promise<RunSummary[]>;
  getRunDetail: (runId: number) => Promise<RunDetail | null>;
  listMeasurements: (runId: number, port: number | null, offset: number, limit: number) =>
    Promise<{ total: number; rows: MeasurementRow[] }>;
  deleteRun: (runId: number) => Promise<boolean>;
  exportRunPdf: (runId: number) => Promise<{ ok: boolean; path?: string; error?: string }>;
}

declare global {
  interface Window { dbAPI?: DbAPI }
}

// Sự kiện phát ra mỗi khi danh sách lần đo thay đổi (lưu mới hoặc xóa)
export const RUNS_CHANGED_EVENT = "strain-runs-changed";

let wrapped: DbAPI | undefined;
let wrappedFrom: DbAPI | undefined;

// Trả về cùng một đối tượng ổn định giữa các lần gọi (an toàn để dùng trong dependency của hook)
export const dbApi = (): DbAPI | undefined => {
  if (typeof window === "undefined" || !window.dbAPI) return undefined;
  const raw = window.dbAPI;
  if (wrappedFrom !== raw) {
    wrappedFrom = raw;
    const notify = () => window.dispatchEvent(new Event(RUNS_CHANGED_EVENT));
    wrapped = {
      ...raw,
      saveRun: async (specimenId, rows) => {
        const result = await raw.saveRun(specimenId, rows);
        notify();
        return result;
      },
      deleteRun: async (runId) => {
        const result = await raw.deleteRun(runId);
        notify();
        return result;
      },
    };
  }
  return wrapped;
};