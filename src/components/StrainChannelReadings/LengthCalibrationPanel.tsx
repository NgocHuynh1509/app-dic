import { useState } from 'react';
import { createLengthCalibration } from '../../hooks/strainLengthCalibration.ts';
import type { LengthCalibration, LengthReference } from '../../hooks/strainLengthCalibration.ts';
import type { StrainSample } from '../../hooks/strainSession';

interface Props {
  latest: readonly (StrainSample | null)[];
  enabled: readonly boolean[];
  channelCount: number;
  recording: boolean;
  calibrations: readonly (LengthCalibration | null)[];
  onApply: (index: number, calibration: LengthCalibration | null) => void;
  storageError: string;
}

interface Draft { lengths: [string, string]; points: [LengthReference | null, LengthReference | null]; error: string }
const draftFor = (cal: LengthCalibration | null): Draft => ({
  lengths: [cal ? String(cal.first.lengthMm) : '', cal ? String(cal.second.lengthMm) : ''],
  points: [cal?.first ?? null, cal?.second ?? null], error: '',
});

export default function LengthCalibrationPanel({ latest, enabled, channelCount, recording, calibrations, onApply, storageError }: Props) {
  const [drafts, setDrafts] = useState(() => calibrations.map(draftFor));
  function update(index: number, draft: Draft) {
    setDrafts((old) => old.map((entry, i) => i === index ? draft : entry));
  }
  function capture(index: number, pointIndex: 0 | 1) {
    const draft = drafts[index];
    const sample = latest[index];
    const signal = sample?.lengthSignal;
    if (!recording || !enabled[index] || signal == null || !Number.isFinite(signal)) return;
    if (!sample || Date.now() - sample.lengthSampledAtMs > 1500) {
      update(index, { ...draft, error: 'Chưa có dữ liệu mới từ cảm biến. Kiểm tra kết nối rồi ghi lại mốc.' });
      return;
    }
    const text = draft.lengths[pointIndex].trim().replace(',', '.');
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || !Number.isFinite(Number(text))) {
      update(index, { ...draft, error: 'Nhập độ dài mm không âm hợp lệ.' });
      return;
    }
    const points: Draft['points'] = [...draft.points];
    points[pointIndex] = { lengthMm: Number(text), signal };
    let error = '';
    if (points[0] && points[1]) {
      const result = createLengthCalibration(points[0], points[1]);
      if (result.ok) onApply(index, result.calibration);
      else error = result.error;
    }
    update(index, { ...draft, points, error });
  }

  return <details className="h5kt-length-calibration" open>
    <summary>Hiệu chuẩn thủ công · nhập kích thước và click SET</summary>
    <p>Bật kênh và click nút START. Kẹp vật mẫu, nhập kích thước thực (mm), giữ yên ít nhất 10 mẫu rồi click SET 1. Đổi vật mẫu, nhập kích thước thứ hai rồi click SET 2. Không cần nhấn Enter; hai mốc hợp lệ sẽ tự lưu.</p>
    <table className="h5kt-channel-table">
      <thead><tr><th>Mốc chuẩn</th>{Array.from({ length: channelCount }, (_, i) => <th key={i}>{`HX${i + 1}`}</th>)}</tr></thead>
      <tbody>
        {([0, 1] as const).map((pointIndex) => <tr key={pointIndex}><th>{`Kích thước mẫu ${pointIndex + 1} (mm)`}</th>
          {drafts.slice(0, channelCount).map((draft, i) => <td key={i}>
            <input type="text" inputMode="decimal" aria-label={`HX${i + 1} Mốc ${pointIndex + 1} mm`}
              placeholder="Nhập mm" title={`Nhập kích thước thực của vật mẫu ${pointIndex + 1}, rồi click SET ${pointIndex + 1}`}
              value={draft.lengths[pointIndex]} onChange={(e) => {
                const lengths: Draft['lengths'] = [...draft.lengths]; lengths[pointIndex] = e.target.value;
                const points: Draft['points'] = [...draft.points]; points[pointIndex] = null;
                update(i, { lengths, points, error: '' });
              }} />
            <button type="button" disabled={!recording || !enabled[i] || latest[i]?.lengthSignal == null}
              aria-label={`HX${i + 1} SET ${pointIndex + 1}`}
              title={`Ghi nhận tín hiệu HX${i + 1} tại kích thước vừa nhập`}
              onClick={() => capture(i, pointIndex)}>{`SET ${pointIndex + 1}`}</button>
            <small>{draft.points[pointIndex]
              ? `Đã SET: ${draft.points[pointIndex].lengthMm.toFixed(4)} mm · ${draft.points[pointIndex].signal.toFixed(2)} count`
              : 'Nhập kích thước rồi click SET'}</small>
          </td>)}
        </tr>)}
        <tr><th>Hiệu chuẩn</th>{drafts.slice(0, channelCount).map((draft, i) => <td key={i}>
          <small>{calibrations[i] ? 'Đã lưu 2 điểm' : 'Chưa hiệu chuẩn'}</small>
          {draft.error && <small className="h5kt-length-error" role="alert">{draft.error}</small>}
          <button type="button" onClick={() => { update(i, draftFor(null)); onApply(i, null); }}>Xóa mốc</button>
        </td>)}</tr>
      </tbody>
    </table>
    {storageError && <p className="h5kt-length-error" role="alert">{storageError}</p>}
    <p>Hiển thị 0.0001 mm; độ chính xác thực tế phụ thuộc đầu đo và cơ cấu kẹp. Cần hiệu chuẩn lại khi thay cảm biến hoặc cơ cấu.</p>
  </details>;
}
