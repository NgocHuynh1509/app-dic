import { useMemo, useRef, useState } from "react";
import type { TestMethod } from "../../types";
import { STANDARD_RESULTS, WORKING_RESULTS } from "./resultData.ts";

type LibView = "working" | "standard";
type LibTab = { id: string; label: string; view: LibView };

let tabSeq = 0;
function makeTab(view: LibView): LibTab {
  tabSeq += 1;
  return {
    id: `rtab-${tabSeq}`,
    label: view === "working" ? "Library of Working Results" : "Library of Standard Results",
    view,
  };
}
const INITIAL_TABS: LibTab[] = [makeTab("working"), makeTab("standard")];

export default function ResultsPanel({
  onSelectResult,
}: {
  onSelectResult?: (name: string) => void;
}) {
  const [tabs, setTabs] = useState<LibTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState(INITIAL_TABS[0].id);
  const [keyword, setKeyword] = useState("");
  const [showOverviews, setShowOverviews] = useState(false);
  const [selectedId, setSelectedId] = useState("r1");
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const results: TestMethod[] = activeTab.view === "working" ? WORKING_RESULTS : STANDARD_RESULTS;

  const filtered = useMemo(() => {
    if (!keyword.trim()) return results;
    const k = keyword.toLowerCase();
    return results.filter((r) => r.name.toLowerCase().includes(k));
  }, [results, keyword]);

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
      if (activeTabId === id) setActiveTabId(next[next.length - 1].id);
      return next;
    });
  }
  function scrollTabs(dir: -1 | 1) {
    tabsScrollRef.current?.scrollBy({ left: dir * 140, behavior: "smooth" });
  }
  function handleRowClick(r: TestMethod) {
    setSelectedId(r.id);
    onSelectResult?.(r.name);
  }

  return (
    <>
      <div className="library-tools__filterbar">
        <button className="library-tools__scroll-btn" onClick={() => scrollTabs(-1)}>
          ◄
        </button>
        <div className="library-tools__tabs-scroll" ref={tabsScrollRef}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={
                "library-tools__subtab" + (tab.id === activeTabId ? " library-tools__subtab--active" : "")
              }
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="library-tools__subtab-icon">ƒx</span>
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
              <button onClick={() => openTab("working")}>Library of Working Results</button>
              <button onClick={() => openTab("standard")}>Library of Standard Results</button>
            </div>
          </div>
        </div>

        <span className="library-tools__count">Results Found: {filtered.length}</span>

        <label className="library-tools__field">
          Keyword:
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="(Enter Value)" />
        </label>

        <div className="library-tools__spacer" />
        <button className="library-tools__close-btn" title="Đóng bảng">
          ✕
        </button>
      </div>

      <div className="library-tools__toolbar">
        <button className="library-tools__tool">
          <span className="library-tools__tool-icon">⇩</span>Export
        </button>
        <button className="library-tools__tool">
          <span className="library-tools__tool-icon">⇧</span>Import ▾
        </button>
        <span className="library-tools__divider" />
        <button className="library-tools__tool">
          <span className="library-tools__tool-icon">✎</span>Edit
        </button>
        <button className="library-tools__tool">
          <span className="library-tools__tool-icon library-tools__tool-icon--danger">✕</span>Delete
        </button>
        <button className="library-tools__tool">
          <span className="library-tools__tool-icon">◎</span>Show Deleted
        </button>
        <button className="library-tools__tool">
          <span className="library-tools__tool-icon">↺</span>Recover
        </button>
        <button className="library-tools__tool">
          <span className="library-tools__tool-icon">⌕</span>Show Where Used
        </button>
        <button
          className={"library-tools__tool" + (showOverviews ? " library-tools__tool--active" : "")}
          onClick={() => setShowOverviews((v) => !v)}
        >
          <span className="library-tools__tool-icon">▥</span>Show Overviews
        </button>
      </div>

      <div className="library-tools__table-wrap">
        <table>
          <thead>
            <tr>
              <th className="library-tools__col-inuse">In Use</th>
              <th>Result Name</th>
              <th>Units</th>
              <th>Last Modified Date</th>
              <th>Category</th>
              {showOverviews && <th>Formula</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className={
                  r.id === selectedId
                    ? "library-tools__row--selected"
                    : r.inUse
                    ? "library-tools__row--inuse"
                    : ""
                }
                onClick={() => handleRowClick(r)}
              >
                <td className="library-tools__col-inuse">{r.inUse ? "●" : ""}</td>
                <td>{r.name}</td>
                <td>{r.equipment}</td>
                <td>{r.lastModified}</td>
                <td>{r.methodType}</td>
                {showOverviews && <td>{r.notes}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}