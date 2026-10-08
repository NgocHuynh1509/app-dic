import { useMemo, useRef, useState } from "react";
import type { TestMethod } from "../../types";
import { STANDARD_METHODS, WORKING_METHODS } from "./methodData";
import OutputsPanel from "./OutputSpanel.tsx";
import ResultsPanel from "./ResultSpanel.tsx";
import "./LibraryTools.css";

const METHOD_TYPES = ["All", "UTM", "MTM", "UTM/MTM"];

type LibView = "working" | "standard";
type CategoryKey = "methods" | "outputs" | "results";

type LibTab = {
  id: string;
  label: string;
  view: LibView;
};

let tabSeq = 0;
function makeTab(view: LibView): LibTab {
  tabSeq += 1;
  return {
    id: `tab-${tabSeq}`,
    label: view === "working" ? "Library of Working Methods" : "Library of Standard Methods",
    view,
  };
}

const INITIAL_TABS: LibTab[] = [makeTab("working"), makeTab("standard")];

const CATEGORY_TABS: { key: CategoryKey; label: string; icon: string; iconClass: string }[] = [
  { key: "methods", label: "Methods", icon: "▤", iconClass: "library-tools__category-icon--methods" },
  { key: "outputs", label: "Outputs", icon: "▥", iconClass: "library-tools__category-icon--outputs" },
  { key: "results", label: "Results", icon: "ƒ(x)", iconClass: "library-tools__category-icon--results" },
];

function CategoryStub({ title }: { title: string }) {
  return (
    <div className="library-tools__stub">
      <span className="library-tools__stub-title">{title}</span>
      <span className="library-tools__stub-hint">Chưa có dữ liệu mẫu cho mục này.</span>
    </div>
  );
}
void CategoryStub; // giữ lại phòng khi cần placeholder cho mục khác sau này

export default function LibraryTools({
  onSelectMethod,
  onSelectOutput,
  onSelectResult,
}: {
  onSelectMethod?: (name: string) => void;
  onSelectOutput?: (name: string) => void;
  onSelectResult?: (name: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("methods");
  const [tabs, setTabs] = useState<LibTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>(INITIAL_TABS[0].id);
  const [methodType, setMethodType] = useState("All");
  const [keyword, setKeyword] = useState("");
  const [showOverviews, setShowOverviews] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("m5");
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const methods: TestMethod[] = activeTab.view === "working" ? WORKING_METHODS : STANDARD_METHODS;

  const filtered = useMemo(() => {
    let list = methods;
    if (methodType !== "All") {
      list = list.filter((m) => m.equipment.includes(methodType));
    }
    if (keyword.trim()) {
      const k = keyword.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(k));
    }
    return list;
  }, [methods, methodType, keyword]);

  function openTab(view: LibView) {
    const tab = makeTab(view);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }

  function closeTab(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next[next.length - 1].id);
      }
      return next;
    });
  }

  function scrollTabs(dir: -1 | 1) {
    tabsScrollRef.current?.scrollBy({ left: dir * 140, behavior: "smooth" });
  }

  function handleRowClick(m: TestMethod) {
    setSelectedId(m.id);
    onSelectMethod?.(m.name);
  }

  return (
    <div className="library-tools">
      {/* Thanh Methods / Outputs / Results */}
      <nav className="library-tools__category-tabs">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat.key}
            className={
              "library-tools__category-tab" +
              (cat.key === activeCategory ? " library-tools__category-tab--active" : "")
            }
            onClick={() => setActiveCategory(cat.key)}
          >
            <span className={"library-tools__category-icon " + cat.iconClass}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </nav>

      {activeCategory === "outputs" ? (
        <OutputsPanel onSelectOutput={onSelectOutput} />
      ) : activeCategory === "results" ? (
        <ResultsPanel onSelectResult={onSelectResult} />
      ) : (
        <>
          {/* Hàng 1: tab thư viện + bộ lọc + advanced query */}
          <div className="library-tools__filterbar">
            <button className="library-tools__scroll-btn" onClick={() => scrollTabs(-1)}>
              ◄
            </button>

            <div className="library-tools__tabs-scroll" ref={tabsScrollRef}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={
                    "library-tools__subtab" +
                    (tab.id === activeTabId ? " library-tools__subtab--active" : "")
                  }
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <span className="library-tools__subtab-icon">▤</span>
                  {tab.label}
                  {tabs.length > 1 && (
                    <span
                      className="library-tools__subtab-close"
                      onClick={(e) => closeTab(tab.id, e)}
                      title="Đóng tab"
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}

              <div className="library-tools__subtab-add-wrap">
                <button className="library-tools__subtab-add" title="Mở tab mới">
                  +
                </button>
                <div className="library-tools__subtab-add-menu">
                  <button onClick={() => openTab("working")}>Library of Working Methods</button>
                  <button onClick={() => openTab("standard")}>Library of Standard Methods</button>
                </div>
              </div>
            </div>

            <span className="library-tools__count">Methods Found: {filtered.length}</span>

            <label className="library-tools__field">
              Method Type:
              <select value={methodType} onChange={(e) => setMethodType(e.target.value)}>
                {METHOD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="library-tools__field">
              Keyword:
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="(Enter Value)"
              />
            </label>

            <button className="library-tools__help-btn" title="Trợ giúp">
              ?
            </button>

            <button className="library-tools__tool library-tools__tool--query">
              <span className="library-tools__tool-icon">ƒx</span>
              Advanced Query
            </button>

            <div className="library-tools__spacer" />

            <button className="library-tools__close-btn" title="Đóng bảng">
              ✕
            </button>
          </div>

          {/* Hàng 2: các nút thao tác */}
          <div className="library-tools__toolbar">
            <button className="library-tools__tool">
              <span className="library-tools__tool-icon">⇩</span>
              Export
            </button>
            <button className="library-tools__tool">
              <span className="library-tools__tool-icon">⇧</span>
              Import ▾
            </button>
            <span className="library-tools__divider" />
            <button className="library-tools__tool">
              <span className="library-tools__tool-icon">✎</span>
              Edit
            </button>
            <button className="library-tools__tool">
              <span className="library-tools__tool-icon library-tools__tool-icon--danger">✕</span>
              Delete
            </button>
            <button className="library-tools__tool">
              <span className="library-tools__tool-icon">◎</span>
              Show Deleted
            </button>
            <button className="library-tools__tool">
              <span className="library-tools__tool-icon">↺</span>
              Recover
            </button>
            <button className="library-tools__tool">
              <span className="library-tools__tool-icon">⌕</span>
              Show Where Used
            </button>
            <button
              className={
                "library-tools__tool" + (showOverviews ? " library-tools__tool--active" : "")
              }
              onClick={() => setShowOverviews((v) => !v)}
            >
              <span className="library-tools__tool-icon">▥</span>
              Show Overviews
            </button>
          </div>

          <div className="library-tools__table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="library-tools__col-inuse">In Use</th>
                  <th>Method Name</th>
                  <th>Equipment</th>
                  <th>Last Modified Date</th>
                  <th>Method Type</th>
                  {showOverviews && <th>Notes</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    className={
                      m.id === selectedId
                        ? "library-tools__row--selected"
                        : m.inUse
                        ? "library-tools__row--inuse"
                        : ""
                    }
                    onClick={() => handleRowClick(m)}
                  >
                    <td className="library-tools__col-inuse">{m.inUse ? "●" : ""}</td>
                    <td>{m.name}</td>
                    <td>{m.equipment}</td>
                    <td>{m.lastModified}</td>
                    <td>{m.methodType}</td>
                    {showOverviews && <td>{m.notes}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}