import type { Specimen } from "../../types";
import "./SpecimenTable.css";

interface Props {
  specimens: Specimen[];
}

const fmt = (v: number | null) => (v === null ? "N/F" : v.toString());

export default function SpecimenTable({ specimens }: Props) {
  return (
    <div className="specimen-table">
      <div className="specimen-table__toolbar">
        <button className="specimen-table__action">Print</button>
        <button className="specimen-table__action">Regenerate</button>
        <button className="specimen-table__action">Add</button>
        <button className="specimen-table__action">Comments</button>
        <button className="specimen-table__action">Clear Completed</button>
        <button className="specimen-table__action">Curve Overlay</button>
      </div>
      <div className="specimen-table__scroll-wrap">
        <table>
          <thead>
            <tr>
              <th>Action / Status</th>
              <th>Width, in</th>
              <th>Thickness, in</th>
              <th>Area, in²</th>
              <th>Modulus, Mpsi</th>
              <th>Ultimate Force, lbf</th>
              <th>Ultimate Stress, ksi</th>
            </tr>
          </thead>
          <tbody>
            {specimens.map((s) => (
              <tr key={s.id}>
                <td className="specimen-table__status">{s.status}</td>
                <td>{s.width}</td>
                <td>{s.thickness}</td>
                <td>{s.area}</td>
                <td>{fmt(s.modulus)}</td>
                <td>{fmt(s.ultimateForce)}</td>
                <td>{fmt(s.ultimateStress)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
