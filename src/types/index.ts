export interface LiveData {
  force: number;
  position: number;
  time: number;
  positionRate: number;
}

export interface Specimen {
  id: string;
  status: "New" | "Before Test" | "After Test" | "Running";
  width: number;
  thickness: number;
  area: number;
  modulus: number | null;
  ultimateForce: number | null;
  ultimateStress: number | null;
}

export interface GraphPoint {
  position: number;
  force: number;
}

export interface PanelPosition {
  x: number;
  y: number;
}

export interface TestMethod {
  id: string;
  name: string;
  equipment: string;
  lastModified: string;
  methodType: string;
  notes: string;
  inUse?: boolean;
  selected?: boolean;
}

export type LibraryView = "working" | "standard";

export type TabId =
  | "test-recall"
  | "method-editor"
  | "output-editor"
  | "result-editor"
  | "library-tools"
  | "particle-dic"
  | "configuration"
  | "technical-support";

export interface TabDefinition {
  id: TabId;
  label: string;
}
