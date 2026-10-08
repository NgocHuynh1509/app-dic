import { useState } from "react";
import LibraryTools from "./LibraryTools";
import "./HorizonShell.css";

const TOP_TABS = [
  "Test & Recall",
  "Method Editor",
  "Output Editor",
  "Result Editor",
  "Library Tools",
  "Configuration",
  "Technical Support",
];

type CategoryKey = "methods" | "outputs" | "results";

const CATEGORY_TABS: { key: CategoryKey; label: string; icon: string; iconClass: string }[] = [
  { key: "methods", label: "Methods", icon: "▤", iconClass: "horizon-shell__category-icon--methods" },
  { key: "outputs", label: "Outputs", icon: "▥", iconClass: "horizon-shell__category-icon--outputs" },
  { key: "results", label: "Results", icon: "ƒ(x)", iconClass: "horizon-shell__category-icon--results" },
];

function CategoryStub({ title }: { title: string }) {
  return (
    <div className="horizon-shell__stub">
      <span className="horizon-shell__stub-title">{title}</span>
      <span className="horizon-shell__stub-hint">Chưa có dữ liệu mẫu cho mục này.</span>
    </div>
  );
}

export default function HorizonShell() {
  const [activeTab, setActiveTab] = useState("Library Tools");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("methods");
  const [currentMethod, setCurrentMethod] = useState<string>("Generic Compression - Force vs. Position");
  const [currentOutput, setCurrentOutput] = useState<string>("Generic Compression - Force vs. Position");
  const totalSpecimens = 2;
  const totalSelected = currentMethod ? 1 : 0;

  function handleSelectMethod(name: string) {
    setCurrentMethod(name);
    setCurrentOutput(name);
  }

  return (
    <div className="horizon-shell">
      <div className="horizon-shell__titlebar">
        <span className="horizon-shell__logo">Horizon</span>
        <div className="horizon-shell__spacer" />
        <span className="horizon-shell__dot horizon-shell__dot--yellow" />
        <span className="horizon-shell__dot horizon-shell__dot--green" />
        <span className="horizon-shell__dot horizon-shell__dot--red" />
      </div>

      <header className="horizon-shell__topnav">
        {TOP_TABS.map((tab) => (
          <button
            key={tab}
            className={
              "horizon-shell__tab" + (tab === activeTab ? " horizon-shell__tab--active" : "")
            }
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </header>

      <div className="horizon-shell__body">
        <main className="horizon-shell__main">
          {activeTab === "Library Tools" && (
            <nav className="horizon-shell__category-tabs">
              {CATEGORY_TABS.map((cat) => (
                <button
                  key={cat.key}
                  className={
                    "horizon-shell__category-tab" +
                    (cat.key === activeCategory ? " horizon-shell__category-tab--active" : "")
                  }
                  onClick={() => setActiveCategory(cat.key)}
                >
                  <span className={"horizon-shell__category-icon " + cat.iconClass}>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </nav>
          )}

          <div className="horizon-shell__main-content">
            {activeTab !== "Library Tools" ? (
              <div className="horizon-shell__placeholder">{activeTab}</div>
            ) : activeCategory === "methods" ? (
              <LibraryTools onSelectMethod={handleSelectMethod} />
            ) : activeCategory === "outputs" ? (
              <CategoryStub title="Library of Outputs" />
            ) : (
              <CategoryStub title="Library of Results" />
            )}
          </div>
        </main>

        <aside className="horizon-shell__rail">
          <button className="horizon-shell__rail-item horizon-shell__rail-item--active">
            Machine Control
          </button>
        </aside>
      </div>

      <footer className="horizon-shell__footer">
        <span>
          <strong>Current Method:</strong> {currentMethod}
        </span>
        <span>
          <strong>Current Output:</strong> {currentOutput}
        </span>
        <span>
          <strong>Total Specimens:</strong> {totalSpecimens}
        </span>
        <span>
          <strong>Total Selected:</strong> {totalSelected}
        </span>
      </footer>
    </div>
  );
}