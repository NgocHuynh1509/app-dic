import type { TabDefinition, TabId } from "../../types";
import "./TabNav.css";

const TABS: TabDefinition[] = [
  { id: "test-recall", label: "Test & Recall" },
  { id: "method-editor", label: "Method Editor" },
  { id: "output-editor", label: "Output Editor" },
  { id: "result-editor", label: "Result Editor" },
  { id: "library-tools", label: "Library Tools" },
  { id: "particle-dic", label: "Particle DIC" },
  { id: "configuration", label: "Configuration" },
  { id: "technical-support", label: "Technical Support" },
];

interface Props {
  activeTab: TabId;
  onSelect: (id: TabId) => void;
}

export default function TabNav({ activeTab, onSelect }: Props) {
  return (
    <nav className="tab-nav" role="tablist" aria-label="Horizon sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={
            "tab-nav__item" + (activeTab === tab.id ? " tab-nav__item--active" : "")
          }
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
