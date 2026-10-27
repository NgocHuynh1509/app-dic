// t: chiều dày, b: chiều rộng, l0: chiều dài ban đầu (nhập trước khi đo)
// lu: chiều dài sau khi đứt, bu: chiều rộng sau khi đứt (không bắt buộc)
export interface PortDims {
  port: 1 | 2 | 3; t: number; b: number; l0: number; lu: number | null; bu: number | null;
}

export interface Project { id: number; name: string; createdAt: string }
export interface SpecimenInfo {
  id: number; projectId: number; name: string; createdAt: string; ports: PortDims[]; runCount: number;
}

interface DbAPI {
  listProjects: () => Promise<Project[]>;
  createProject: (name: string) => Promise<Project>;
  listSpecimens: (projectId: number) => Promise<SpecimenInfo[]>;
  createSpecimen: (input: { projectId: number; name: string; ports: PortDims[] }) => Promise<SpecimenInfo>;
  saveRun: (specimenId: number, rows: unknown[]) => Promise<number | null>;
  exportPdf: (specimenId: number) => Promise<{ ok: boolean; path?: string; error?: string }>;
}

declare global {
  interface Window { dbAPI?: DbAPI }
}

export const dbApi = (): DbAPI | undefined => (typeof window !== "undefined" ? window.dbAPI : undefined);