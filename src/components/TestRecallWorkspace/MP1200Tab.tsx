import "./MP1200Tab.css";

export default function MP1200Tab() {
  return (
    <div className="mp1200-tab">
      <div className="horizon-toolbar">
        <div className="toolbar-group">
          <button className="horizon-button horizon-button--green">
            ▶ Start
          </button>

          <button className="horizon-button">
            ‖ Pause
          </button>

          <button className="horizon-button horizon-button--red">
            ■ Stop
          </button>

          <button className="horizon-button">
            ↻ Reset
          </button>
        </div>

        <div className="toolbar-separator" />

        <button className="horizon-button">
          New Test
        </button>

        <button className="horizon-button">
          Save Test
        </button>

        <div className="toolbar-spacer" />

        <div className="machine-status">
          <span className="machine-status__lamp" />
          Machine Ready
        </div>
      </div>

      <div className="mp1200-main">
        {/* MACHINE */}
        <section className="horizon-panel mp1200-machine">
          <div className="horizon-panel__title">
            MACHINE INFORMATION
          </div>

          <div className="mp1200-machine__content">
            <div className="info-row">
              <span>Machine</span>
              <strong>MP1200</strong>
            </div>

            <div className="info-row">
              <span>Type</span>
              <strong>Melt Flow Indexer</strong>
            </div>

            <div className="info-row">
              <span>Status</span>
              <strong className="status-heating">
                Heating
              </strong>
            </div>

            <div className="info-separator" />

            <div className="mp1200-display">
              <span>Temperature</span>
              <strong>190.0 °C</strong>
            </div>

            <div className="mp1200-display">
              <span>Load</span>
              <strong>2.16 kg</strong>
            </div>

            <div className="mp1200-display">
              <span>Melt Flow Rate</span>
              <strong>12.4 g/10 min</strong>
            </div>

            <div className="mp1200-display">
              <span>Test Time</span>
              <strong>120 sec</strong>
            </div>
          </div>
        </section>

        {/* GRAPH */}
        <section className="horizon-panel mp1200-graph">
          <div className="horizon-panel__title">
            FLOW GRAPH
          </div>

          <div className="mp1200-graph__area">
            <div className="graph-grid">
              <span className="axis-y">MFR</span>

              <div className="fake-flow-line" />

              <span className="axis-x">
                Time
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* RESULT */}
      <section className="horizon-panel mp1200-result">
        <div className="horizon-panel__title">
          SPECIMEN / RESULT
        </div>

        <div className="mp1200-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Material</th>
                <th>Temperature</th>
                <th>Load</th>
                <th>MFR</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>1</td>
                <td>HDPE</td>
                <td>190 °C</td>
                <td>2.16 kg</td>
                <td>12.4</td>
                <td className="done">DONE</td>
              </tr>

              <tr>
                <td>2</td>
                <td>HDPE</td>
                <td>190 °C</td>
                <td>2.16 kg</td>
                <td>--</td>
                <td className="running">RUNNING</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}