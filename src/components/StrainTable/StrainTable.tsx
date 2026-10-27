import { memo } from "react";
import type { MutableRefObject } from "react";
import { CSV_COLUMNS } from "../../hooks/useStrainSerial";
import type { StrainRow } from "../../hooks/useStrainSerial";
import "./StrainTable.css";

interface Props {
  rowsRef: MutableRefObject<StrainRow[]>;
  tick: number; // đổi giá trị => vẽ lại bảng
}

const MAX_SHOWN = 100;

function StrainTable({ rowsRef }: Props) {
  const all = rowsRef.current;
  const shown = all.slice(-MAX_SHOWN).reverse(); // mới nhất ở trên

  return (
    <div className="strain-table-wrap">
      <table className="strain-table">
        <thead>
          <tr>
            {CSV_COLUMNS.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 ? (
            <tr>
              <td colSpan={CSV_COLUMNS.length} className="strain-table-empty">
                Chưa có dữ liệu — kẹp mẫu rồi bấm START để bắt đầu đo
              </td>
            </tr>
          ) : (
            shown.map((r, i) => (
              <tr key={all.length - i}>
                <td>{r.hostTime}</td>
                <td>{r.deviceMs}</td>
                <td>{r.t.toFixed(3)}</td>
                <td>{r.raw}</td>
                <td>{r.delta.toFixed(1)}</td>
                <td>{r.filtered.toFixed(1)}</td>
                <td>{r.strain === null ? "" : r.strain.toFixed(3)}</td>
                <td>{r.factor}</td>
                <td>{r.baseline.toFixed(1)}</td>
                <td>{r.sign}</td>
                <td>{`HX${r.channel}`}</td>
                <td>{r.sampleIndex ?? ""}</td>
                <td>{r.enabled ? "1" : "0"}</td>
                <td>{r.lengthMm == null ? "" : r.lengthMm.toFixed(4)}</td>
                <td>{r.lengthSignal ?? ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default memo(StrainTable);
