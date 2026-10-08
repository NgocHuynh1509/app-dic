import Panel from "./Panel.jsx";

const fmt6 = (v) => (v == null ? "NaN" : v.toFixed(6));

export default function StatsPanel({ dic, force }) {
  const rows = [
    ["FPS", String(dic?.fps ?? 0)],
    ["Particles", String(dic?.n_particles ?? 0)],
    ["Force", (force ?? 0).toFixed(2)],
    ["Mean Disp", (dic?.mean_disp_px ?? 0).toFixed(4)],
    ["Eps XX", fmt6(dic?.eps_xx)],
    ["Eps YY", fmt6(dic?.eps_yy)],
    ["Gamma XY", fmt6(dic?.gamma_xy)],
  ];
  return (
    <Panel title="Thông số log ra" className="stats-panel">
      <dl className="stats">
        {rows.map(([name, value], i) => (
          <div key={name} className={`stat-row ${i % 2 ? "alt" : ""}`}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
