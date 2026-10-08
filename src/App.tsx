import { useEffect, useState } from "react";
import TitleBar from "./components/TitleBar/TitleBar";
import TabNav from "./components/TabNav/TabNav";
import LibraryTools from "./components/LibraryTools/LibraryTools";
import MethodEditor from "./components/MethodEditor/MethodEditor";
import OutputEditor from "./components/OutputEditor/OutputEditor";
import ResultEditor from "./components/ResultEditor/Resulteditor";
import TestRecallWorkspace from "./components/TestRecallWorkspace/TestRecallWorkspace";
import ParticleDIC from "./components/ParticleDIC/ParticleDIC.jsx";
import MachineControlDock from "./components/MachineControlDock/MachineControlDock";
import StatusBar from "./components/StatusBar/StatusBar";
import type { LiveData, TabId } from "./types";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("test-recall");

  // Tab Particle DIC giữ nguyên trạng thái (camera, phiên đo) khi chuyển tab:
  // chỉ mount ở lần mở đầu tiên, sau đó ẩn bằng CSS thay vì unmount.
  const [dicVisited, setDicVisited] = useState(false);
  function handleSelectTab(id: TabId) {
    if (id === "particle-dic") setDicVisited(true);
    setActiveTab(id);
  }

  // Cho StatusBar - cập nhật khi chọn method/output/result trong LibraryTools
  const [currentMethod, setCurrentMethod] = useState("Generic Compression - Force vs. Position");
  const [currentOutput, setCurrentOutput] = useState("Generic Compression - Force vs. Position");
  const [currentResult, setCurrentResult] = useState("Ultimate Force");

  // Live machine data - shared by the left-hand jog dock and the Test & Recall workspace
  const [liveData, setLiveData] = useState<LiveData>({
    force: -543.48,
    position: -0.006,
    time: 0,
    positionRate: 18,
  });

  // Left machine control dock: can be shown or hidden
  const [dockOpen, setDockOpen] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setLiveData((prev) => ({ ...prev, time: prev.time + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function handleSelectMethod(name: string) {
    setCurrentMethod(name);
    setCurrentOutput(name);
  }
  function handleSelectOutput(name: string) {
    setCurrentOutput(name);
  }
  function handleSelectResult(name: string) {
    setCurrentResult(name);
  }

  return (
    <div className="app">
      <TitleBar />

      <div className="app__body">
        {dockOpen ? (
          <MachineControlDock liveData={liveData} onClose={() => setDockOpen(false)} />
        ) : (
          <button
            className="app__dock-reopen"
            onClick={() => setDockOpen(true)}
            title="Show machine control panel"
          >
            ▶
          </button>
        )}

        <div className="app__content">
          <TabNav activeTab={activeTab} onSelect={handleSelectTab} />

          <main className="app__main">
            {activeTab === "library-tools" ? (
              <LibraryTools
                onSelectMethod={handleSelectMethod}
                onSelectOutput={handleSelectOutput}
                onSelectResult={handleSelectResult}
              />
            ) : activeTab === "method-editor" ? (
              <MethodEditor />
            ) : activeTab === "output-editor" ? (
              <OutputEditor selectedOutputName={currentOutput} />
            ) : activeTab === "result-editor" ? (
              <ResultEditor selectedResultName={currentResult} />
            ) : activeTab === "particle-dic" ? null : (
              <TestRecallWorkspace />
            )}

            {dicVisited && (
              <div
                className="app__dic"
                style={{ display: activeTab === "particle-dic" ? "block" : "none" }}
              >
                <ParticleDIC />
              </div>
            )}
          </main>
        </div>
      </div>

      <StatusBar
        currentMethod={currentMethod}
        currentOutput={currentOutput}
        totalSpecimens={2}
        totalSelected={1}
      />
    </div>
  );
}