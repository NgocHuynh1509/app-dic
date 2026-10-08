import type { TestMethod } from "../../types";

// Dùng lại kiểu TestMethod (giống Method) nhưng field methodType/notes được
// diễn giải lại cho Output: methodType -> "Output Type", notes -> ghi chú.
export const WORKING_OUTPUTS: TestMethod[] = [
  {
    id: "o1",
    name: "Generic Metals Tensile with Ext.",
    equipment: "UTM/MTM",
    lastModified: "9/12/2025 8:41:02 AM",
    methodType: "Summary + Single Report, Force vs. Position graph",
    notes: "",
    inUse: true,
  },
  {
    id: "o2",
    name: "16 CFR 1500 Toy Safety (5x) Tension Tests",
    equipment: "UTM/MTM",
    lastModified: "3/2/2025 2:10:55 PM",
    methodType: "Summary Report, UTM Results section",
    notes: "",
    inUse: true,
  },
  {
    id: "o3",
    name: "Generic Compression - Force vs. Position",
    equipment: "UTM/MTM",
    lastModified: "10/23/2024 9:58:00 AM",
    methodType: "Single Report, no graph",
    notes: "",
  },
  {
    id: "o4",
    name: "Generic 180° Peel with Live Data",
    equipment: "UTM/MTM",
    lastModified: "5/24/2016 2:30:10 PM",
    methodType: "Live Data + Summary Report",
    notes: "",
  },
  {
    id: "o5",
    name: "Generic 7 Strand Break Report",
    equipment: "UTM/MTM & Strain Extensometer",
    lastModified: "3/10/2015 12:15:00 PM",
    methodType: "Summary Report, Force vs. Strain graph",
    notes: "",
  },
];

export const STANDARD_OUTPUTS: TestMethod[] = WORKING_OUTPUTS.slice(0, 3);