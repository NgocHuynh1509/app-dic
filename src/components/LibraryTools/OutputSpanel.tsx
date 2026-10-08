import { useMemo, useRef, useState } from "react";
import type { TestMethod } from "../../types";
import { STANDARD_OUTPUTS, WORKING_OUTPUTS } from "./outputData.ts";

type LibView = "working" | "standard";
type LibTab = { id: string; label: string; view: LibView };

let tabSeq = 0;
function makeTab(view: LibView): LibTab {
  tabSeq += 1;
  return {
    id: `otab-${tabSeq}`,
    label: view === "working" ? "Library of Working Outputs" : "Library of Standard Outputs",
    view,
  };
}
const INITIAL_TABS: LibTab[] = [makeTab("working"), makeTab("standard")];

export default function OutputsPanel({
  onSelectOutput,
}: {
  onSelectOutput?: (name: string) => void;
}) {
  const [tabs, setTabs] = useState<LibTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState(INITIAL_TABS[0].id);
  const [keyword, setKeyword] = useState("");
  const [showOverviews, setShowOverviews] = useState(false);
  const [selectedId, setSelectedId] = useState("o1");
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const outputs: TestMethod[] = activeTab.view === "working" ? WORKING_OUTPUTS : STANDARD_OUTPUTS;

  const filtered = useMemo(() => {
    if (!keyword.trim()) return outputs;
    const k = keyword.toLowerCase();
    return outputs.filter((o) => o.name.toLowerCase().includes(k));
  }, [outputs, keyword]);

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
  function handleRowClick(o: TestMethod) {
    setSelectedId(o.id);
    onSelectOutput?.(o.name);
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
              <span className="library-tools__subtab-icon">▥</span>
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
              <button onClick={() => openTab("working")}>Library of Working Outputs</button>
              <button onClick={() => openTab("standard")}>Library of Standard Outputs</button>
            </div>
          </div>
        </div>

        <span className="library-tools__count">Outputs Found: {filtered.length}</span>

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
              <th>Output Name</th>
              <th>Equipment</th>
              <th>Last Modified Date</th>
              <th>Report Contents</th>
              {showOverviews && <th>Notes</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                className={
                  o.id === selectedId
                    ? "library-tools__row--selected"
                    : o.inUse
                    ? "library-tools__row--inuse"
                    : ""
                }
                onClick={() => handleRowClick(o)}
              >
                <td className="library-tools__col-inuse">{o.inUse ? "●" : ""}</td>
                <td>{o.name}</td>
                <td>{o.equipment}</td>
                <td>{o.lastModified}</td>
                <td>{o.methodType}</td>
                {showOverviews && <td>{o.notes}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}