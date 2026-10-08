import { useMemo, useState } from "react";
import "./RecallTab.css";

type RecallTest = {
  id: number;
  method: string;
  output: string;
  date: string;
  specimens: number;
  status: "Finished" | "Running" | "Failed";
  mode: "Single Mode" | "Batch Mode";
};

const TESTS: RecallTest[] = [
  {
    id: 43,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Friday, February 14, 2025, 8:07 AM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 42,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Monday, February 10, 2025, 11:36 AM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 41,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Monday, February 10, 2025, 11:34 AM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 40,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Monday, February 10, 2025, 10:05 AM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 39,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Monday, February 10, 2025, 10:03 AM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 38,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Monday, February 10, 2025, 10:01 AM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 36,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Thursday, January 30, 2025, 7:09 AM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 35,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Thursday, January 30, 2025, 7:08 AM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 34,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Thursday, January 30, 2025, 7:05 AM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 33,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Wednesday, January 29, 2025, 3:06 PM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 32,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Wednesday, January 29, 2025, 2:43 PM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 31,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Wednesday, January 29, 2025, 2:41 PM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 29,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Wednesday, January 29, 2025, 2:36 PM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 28,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Wednesday, January 29, 2025, 1:06 PM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
  {
    id: 27,
    method: "Generic Compression - Force vs. Position",
    output: "Generic Compression - Force vs. Position",
    date: "Wednesday, January 29, 2025, 1:04 PM",
    specimens: 1,
    status: "Finished",
    mode: "Single Mode",
  },
];

export default function RecallTab() {
  const [search, setSearch] = useState("");
  const [machine, setMachine] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState<number | null>(43);

  const [includeArchived, setIncludeArchived] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [completedSpecimenOnly, setCompletedSpecimenOnly] = useState(false);

  const filteredTests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return TESTS.filter((test) => {
      const matchesSearch =
        !keyword ||
        test.method.toLowerCase().includes(keyword) ||
        test.output.toLowerCase().includes(keyword) ||
        String(test.id).includes(keyword);

      const matchesMachine =
        machine === "All" || machine === test.mode;

      const matchesStatus =
        status === "All" || status === test.status;

      return matchesSearch && matchesMachine && matchesStatus;
    });
  }, [search, machine, status]);

  const selectedTest =
    TESTS.find((test) => test.id === selectedId) ?? TESTS[0];

  const handleClear = () => {
    setSearch("");
    setMachine("All");
    setStatus("All");
  };

  return (
    <div className="recall-tab">

      {/* =====================================================
          SEARCH OPTIONS
      ====================================================== */}

      <section className="recall-section recall-search-section">

        <div className="recall-section__title">
          Search Options
        </div>

        <div className="recall-search-content">

          {/* LEFT */}
          <div className="recall-search-column">

            <div className="recall-search-row">
              <label>From:</label>

              <input
                type="text"
                placeholder="(Enter Value)"
              />

              <span className="recall-search-hint">
                The earliest batch in the database
              </span>

              <button className="recall-today-button">
                <span>▣</span>
                Today
              </button>
            </div>

            <div className="recall-search-row">
              <label>To:</label>

              <input
                type="text"
                placeholder="(Enter Value)"
              />

              <span className="recall-search-hint">
                The latest batch in the database
              </span>
            </div>

          </div>

          {/* MIDDLE */}
          <div className="recall-search-column recall-search-column--middle">

            <div className="recall-search-row">
              <label>Search:</label>

              <input
                className="recall-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="(Enter Value)"
              />
            </div>

            <label className="recall-check">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) =>
                  setIncludeArchived(e.target.checked)
                }
              />

              <span>Include Archived Databases</span>
            </label>

            <span className="recall-no-data">
              (No archived data found)
            </span>

          </div>

          {/* RIGHT */}
          <div className="recall-search-column recall-search-column--right">

            <div className="recall-search-row">

              <label>Test Type:</label>

              <select defaultValue="UTM">
                <option>UTM</option>
                <option>MTM</option>
                <option>UTM/MTM</option>
              </select>

            </div>

            <div className="recall-search-row">

              <label>Maximum:</label>

              <select defaultValue="Unlimited">
                <option>Unlimited</option>
                <option>100</option>
                <option>50</option>
                <option>25</option>
              </select>

            </div>

          </div>

          {/* CHECKBOXES */}
          <div className="recall-search-options">

            <label className="recall-check">
              <input
                type="checkbox"
                checked={completedSpecimenOnly}
                onChange={(e) =>
                  setCompletedSpecimenOnly(e.target.checked)
                }
              />

              <span>
                Only Show Batches Containing a Completed Specimen
              </span>
            </label>

            <label className="recall-check">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) =>
                  setIncludeDeleted(e.target.checked)
                }
              />

              <span>Include Deleted Batches</span>
            </label>

          </div>

          {/* SEARCH BUTTONS */}
          <div className="recall-search-actions">

            <button className="recall-green-button">
              Search
            </button>

            <button
              className="recall-icon-button"
              title="Advanced Search"
            >
              ⚙
            </button>

            <button
              className="recall-run-button"
              onClick={() => {}}
            >
              Run Search
            </button>

            <button
              className="recall-clear-button"
              onClick={handleClear}
            >
              Clear
            </button>

          </div>

        </div>

      </section>

      {/* =====================================================
          SEARCH RESULTS
      ====================================================== */}

      <section className="recall-section recall-results-section">

        <div className="recall-section__title">
          Search Results
        </div>

        {/* TOOLBAR */}
        <div className="recall-results-toolbar">

          <div className="recall-result-count">
            <strong>
              Batches Returned:
            </strong>

            <span>
              {filteredTests.length}
            </span>
          </div>

          <button className="recall-toolbar-button">
            ● Batch Status Filter
            <span>▾</span>
          </button>

          <button className="recall-toolbar-button">
            ▶ Resume Testing
          </button>

          <button className="recall-toolbar-button recall-toolbar-button--danger">
            ✕ Delete
          </button>

          <button className="recall-toolbar-button">
            ↻ Recover
          </button>

          <div className="recall-toolbar-spacer" />

          <button className="recall-toolbar-button">
            ⟳ Refresh
          </button>

        </div>

        {/* TABLE */}
        <div className="recall-table-container">

          <table className="recall-table">

            <thead>
              <tr>
                <th>Internal ID</th>
                <th>Method</th>
                <th>Output</th>
                <th>Batch Start Date</th>
                <th>Specimens</th>
                <th>Batch Status</th>
                <th>Test Mode</th>
              </tr>
            </thead>

            <tbody>
              {filteredTests.map((test) => (
                <tr
                  key={test.id}
                  className={
                    selectedId === test.id
                      ? "recall-table__row--selected"
                      : ""
                  }
                  onClick={() => setSelectedId(test.id)}
                >
                  <td>{test.id}</td>

                  <td>
                    {test.method}
                  </td>

                  <td>
                    {test.output}
                  </td>

                  <td>
                    {test.date}
                  </td>

                  <td className="recall-table__center">
                    {test.specimens}
                  </td>

                  <td>
                    <span
                      className={
                        "recall-status recall-status--" +
                        test.status.toLowerCase()
                      }
                    >
                      {test.status}
                    </span>
                  </td>

                  <td>
                    {test.mode}
                  </td>
                </tr>
              ))}

              {filteredTests.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="recall-empty"
                  >
                    No batches found.
                  </td>
                </tr>
              )}
            </tbody>

          </table>

        </div>

      </section>

      {/* =====================================================
          VIEW
      ====================================================== */}

      <section className="recall-view-section">

        <div className="recall-view-title">
          View
        </div>

        <div className="recall-view-content">

          <label>
            Selected Output:
          </label>

          <select
            defaultValue={
              selectedTest.output
            }
          >
            <option>
              (Select Value)
            </option>

            <option>
              Generic Compression - Force vs. Position
            </option>

            <option>
              Generic Compression - Force vs. Time
            </option>
          </select>

          <button className="recall-dropdown-button">
            ▼
          </button>

          <label className="recall-check recall-view-check">

            <input
              type="checkbox"
            />

            <span>
              Apply Latest Method Parameters
            </span>

          </label>

        </div>

      </section>

    </div>
  );
}