import type { TestMethod } from "../../types";

// Field methodType -> "Category", notes -> công thức tóm tắt.
export const WORKING_RESULTS: TestMethod[] = [
  {
    id: "r1",
    name: "Break Stress",
    equipment: "MPa",
    lastModified: "9/1/2025 10:02:00 AM",
    methodType: "Strength",
    notes: "F / A0",
    inUse: true,
  },
  {
    id: "r2",
    name: "Ultimate Force",
    equipment: "N",
    lastModified: "9/1/2025 10:02:00 AM",
    methodType: "Strength",
    notes: "MAX(F)",
    inUse: true,
  },
  {
    id: "r3",
    name: "% Elongation at Break",
    equipment: "%",
    lastModified: "6/14/2024 4:12:30 PM",
    methodType: "Elongation",
    notes: "(L1 - L0) / L0 * 100",
  },
  {
    id: "r4",
    name: "Modulus of Elasticity",
    equipment: "GPa",
    lastModified: "6/14/2024 4:20:00 PM",
    methodType: "Modulus",
    notes: "SLOPE(Stress, Strain)",
  },
  {
    id: "r5",
    name: "Offset Yield @ 0.2%",
    equipment: "MPa",
    lastModified: "1/30/2015 10:55:00 AM",
    methodType: "Strength",
    notes: "Offset method, 0.2% strain",
  },
];

export const STANDARD_RESULTS: TestMethod[] = WORKING_RESULTS.slice(0, 3);