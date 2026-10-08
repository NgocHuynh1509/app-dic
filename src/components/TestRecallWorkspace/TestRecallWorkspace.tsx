import { useEffect, useState } from "react";
import H5kTTab from "./H5kTTab";
import MP1200Tab from "./MP1200Tab";
import RecallTab from "./RecallTab";
import "./TestRecallWorkspace.css";
import type { Specimen } from "../../types";
import { useSimulatedH5kTData } from "./useSimulatedH5kTData";

type SubTab = "H5kT" | "MP1200" | "Recall";

function makePendingSpecimen(id: string): Specimen {
  return {
    id,
    status: "New",
    width: 0.5,
    thickness: 0.03,
    area: 0.015,
    modulus: null,
    ultimateForce: null,
    ultimateStress: null,
  };
}

// The very first row starts as "Before Test"; every row added after that
// starts as "New" (queued) until its sweep finishes.
const INITIAL_SPECIMENS: Specimen[] = [
  { ...makePendingSpecimen("1"), status: "Before Test" },
];

export default function TestRecallWorkspace() {
  const [activeTab, setActiveTab] = useState<SubTab>("H5kT");
  const [specimens, setSpecimens] = useState<Specimen[]>(INITIAL_SPECIMENS);

  // The graph now runs continuously and never stops on its own — `result`
  // simply fires each time one left-to-right sweep completes.
  const { liveData, curve, result, restart } = useSimulatedH5kTData();

  // Every time a sweep completes: fill in the last pending row with that
  // sweep's peak as "After Test", then append a fresh pending row for the
  // next sweep. History accumulates — nothing gets overwritten.
  useEffect(() => {
    if (!result) return;

    setSpecimens((prev) => {
      const lastIndex = prev.length - 1;
      const last = prev[lastIndex];

      const jitter = 0.97 + Math.random() * 0.06;
      const ultimateForce = Number((result.ultimateForce * jitter).toFixed(1));
      const ultimateStress = Number((ultimateForce / last.area).toFixed(0));
      const modulus = Number((ultimateStress / (result.peakPosition * 1_000_000)).toFixed(2));

      const completedLast: Specimen = {
        ...last,
        status: "After Test",
        ultimateForce,
        ultimateStress,
        modulus,
      };

      const nextPending = makePendingSpecimen(String(prev.length + 1));

      return [...prev.slice(0, lastIndex), completedLast, nextPending];
    });
  }, [result]);

  const handleRegenerate = () => {
    // Force-reset the current sweep immediately (the graph would keep
    // going on its own anyway — this just skips ahead).
    restart();
  };

  return (
    <div className="tr-workspace">
      <div className="tr-workspace__tabs">
        {(["H5kT", "MP1200", "Recall"] as SubTab[]).map((tab) => (
          <button
            key={tab}
            className={`tr-workspace__tab ${activeTab === tab ? "tr-workspace__tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="tr-workspace__content">
        {activeTab === "H5kT" && (
          <H5kTTab
            liveData={liveData}
            curve={curve}
            specimens={specimens}
            onRegenerate={handleRegenerate}
          />
        )}
        {activeTab === "MP1200" && <MP1200Tab />}
        {activeTab === "Recall" && <RecallTab />}
      </div>
    </div>
  );
}