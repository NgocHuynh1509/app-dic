import type { ReactNode } from 'react';
import type { StrainSample, StrainStats } from '../../hooks/strainSession';

interface CommonProps {
  latest: readonly (StrainSample | null)[];
  stats: readonly StrainStats[];
  channelCount: number;
  enabled: readonly boolean[];
  labels: readonly string[];
  colors: readonly string[];
}

function Header({ channelCount, labels, colors }: CommonProps) {
  return <thead><tr><th scope="col">Số liệu</th>
    {labels.slice(0, channelCount).map((label, index) => (
      <th scope="col" key={label} style={{ borderTop: `3px solid ${colors[index]}` }}>
        <span className="h5kt-channel-label" style={{ color: colors[index] }}>{label}</span>
      </th>
    ))}
  </tr></thead>;
}

function Row({ name, label, values }: { name: string; label: string; values: readonly string[] }) {
  return <tr><th scope="row">{label}</th>{values.map((value, i) => (
    <td key={i}><input aria-label={`HX${i + 1} ${name}`} type="text" readOnly value={value} /></td>
  ))}</tr>;
}

function Table({ props, children }: { props: CommonProps; children: ReactNode }) {
  return <table className="h5kt-channel-table"><Header {...props} /><tbody>{children}</tbody></table>;
}

export function StrainChannelReadings(props: CommonProps) {
  const { latest, stats, enabled, channelCount } = props;
  const values = (get: (sample: StrainSample | null, index: number) => string) =>
    Array.from({ length: channelCount }, (_, i) => enabled[i] ? get(latest[i], i) : '0');
  return <Table props={props}>
    <Row name="Raw HX711" label="Raw (count)" values={values((s) => s ? String(s.raw) : '--')} />
    <Row name="Delta" label="Δ (count)" values={values((s) => s ? s.delta.toFixed(1) : '--')} />
    <Row name="Filtered" label="Filtered" values={values((s) => s ? s.filtered.toFixed(1) : '--')} />
    <Row name="Min" label="Min Δ" values={values((_, i) => stats[i].minDelta?.toFixed(1) ?? '--')} />
    <Row name="Max" label="Max Δ" values={values((_, i) => stats[i].maxDelta?.toFixed(1) ?? '--')} />
    <Row name="Sample count" label="Số mẫu" values={values((_, i) => String(stats[i].count))} />
    <Row name="Time" label="Time (s)" values={values((s) => s ? s.t.toFixed(2) : '0.00')} />
    <Row name="Length mm" label="Độ dài (mm)" values={Array.from({ length: channelCount }, (_, i) =>
      !enabled[i] ? '0.0000' : latest[i]?.lengthMm?.toFixed(4) ?? '--')} />
  </Table>;
}

interface CalibrationProps extends CommonProps {
  factorTexts: readonly string[];
  inversions: readonly boolean[];
  onFactorChange: (index: number, text: string) => void;
  onInvertChange: (index: number, inverted: boolean) => void;
}

export function StrainChannelCalibration(props: CalibrationProps) {
  const { latest, enabled, channelCount, factorTexts, inversions, onFactorChange, onInvertChange } = props;
  const indices = Array.from({ length: channelCount }, (_, i) => i);
  return <Table props={props}>
    <Row name="Strain" label="ε (µε)" values={indices.map((i) => !enabled[i] ? '0' : latest[i]?.strain?.toFixed(3) ?? '--')} />
    <tr><th scope="row">µε/count</th>{indices.map((i) => <td key={i}>
      <input aria-label={`HX${i + 1} Hệ số`} type="text" inputMode="decimal" value={factorTexts[i]}
        onChange={(e) => onFactorChange(i, e.target.value)} title={`Hệ số riêng HX${i + 1}; 0 = chưa hiệu chuẩn`} />
    </td>)}</tr>
    <tr><th scope="row">Đảo dấu</th>{indices.map((i) => <td key={i}>
      <input aria-label={`HX${i + 1} Đảo dấu`} type="checkbox" checked={inversions[i]}
        onChange={(e) => onInvertChange(i, e.target.checked)} />
    </td>)}</tr>
  </Table>;
}
