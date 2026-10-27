import { lengthFromSignal } from './strainLengthCalibration.ts';
import type { LengthCalibration } from './strainLengthCalibration.ts';

export type ChannelId = 1 | 2 | 3;

// Lực GIẢ LẬP (kN/s): tăng đều theo thời gian kể từ lúc START, dùng tạm cho đến khi có nguồn lực thật.
export const FORCE_RATE_KN_PER_S = 0.5;

export interface DeviceFrame {
  t: number;
  deviceMs: number;
  sampleIndex: number | null;
  channels: { channel: ChannelId; raw: number; delta: number; filtered: number; enabled?: boolean }[];
}

export interface StrainSample {
  t: number;
  deviceMs: number;
  sampleIndex: number | null;
  channel: ChannelId;
  raw: number;
  delta: number;
  filtered: number;
  strain: number | null;
  factor: number;
  baseline: number;
  sign: 1 | -1;
  enabled: boolean;
  baselineReady: boolean;
  lengthSignal: number | null;
  lengthMm: number | null;
  lengthSampledAtMs: number;
  forceKn: number;
}

export type StrainRow = StrainSample & { hostTime: string };
export interface StrainStats { minDelta: number | null; maxDelta: number | null; count: number }

export const PLOT_WINDOW_SECONDS = 30;
export const CHANNEL_LABELS = ['HX1 · TOP', 'HX2 · MIDDLE', 'HX3 · BOTTOM'] as const;
export const CHANNEL_COLORS = ['#d32f2f', '#1565c0', '#000000'] as const;
export const CSV_COLUMNS = [
  'host_time', 'device_ms', 'elapsed_s', 'hx711_raw', 'delta_raw', 'filtered_delta',
  'strain_ue', 'calibration_ue_per_count', 'baseline', 'sign', 'channel', 'sample_index', 'enabled', 'length_mm', 'length_signal_count',
] as const;

export function rowToCells(row: StrainRow): (string | number)[] {
  return [row.hostTime, row.deviceMs, row.t, row.raw, row.delta, row.filtered,
    row.strain ?? '', row.factor, row.baseline, row.sign, row.channel, row.sampleIndex ?? '', row.enabled ? 1 : 0,
    row.lengthMm == null ? '' : row.lengthMm.toFixed(4), row.lengthSignal ?? ''];
}

const emptyStats = (): StrainStats => ({ minDelta: null, maxDelta: null, count: 0 });

export class StrainSession {
  // Arrays retain their identities so existing chart/table refs stay valid after reset.
  rows: StrainRow[] = [];
  series: StrainSample[] = [];
  latest: (StrainSample | null)[] = [null, null, null];
  stats = [emptyStats(), emptyStats(), emptyStats()];
  frameCount = 0;
  private baselines: number[][] = [[], [], []];
  private suspended = false;
  private enabledChannels = [true, true, true];
  private lengthSignals: number[][] = [[], [], []];
  private lengthCalibrations: readonly (LengthCalibration | null)[] = [null, null, null];

  setLengthCalibrations(calibrations: readonly (LengthCalibration | null)[]) {
    this.lengthCalibrations = calibrations;
    // Replace only live snapshots: recorded rows keep the calibration used at capture time.
    this.latest = this.latest.map((sample, index) => sample ? { ...sample,
      lengthMm: !sample.enabled ? 0 : sample.lengthSignal === null ? null : lengthFromSignal(sample.lengthSignal, calibrations[index]),
    } : null);
  }

  setEnabledChannels(channels: readonly boolean[]) {
    channels.forEach((enabled, index) => {
      if (enabled === this.enabledChannels[index]) return;
      this.baselines[index] = [];
      this.lengthSignals[index] = [];
      this.stats[index] = { minDelta: 0, maxDelta: 0, count: 0 };
      const previous = this.latest[index];
      this.latest[index] = {
        t: previous?.t ?? 0, deviceMs: previous?.deviceMs ?? 0, sampleIndex: previous?.sampleIndex ?? null,
        channel: (index + 1) as ChannelId, raw: 0, delta: 0, filtered: 0,
        strain: enabled ? null : 0, factor: previous?.factor ?? 0, baseline: 0, sign: previous?.sign ?? 1,
        enabled, baselineReady: false,
        lengthSignal: null, lengthMm: enabled ? null : 0, lengthSampledAtMs: 0,
        forceKn: 0,
      };
    });
    this.enabledChannels = channels.slice();
  }

  // Preserve the last session for CSV after a cable disconnect or board restart.
  suspend() { this.suspended = true; }

  reset() {
    this.rows.length = 0;
    this.series.length = 0;
    this.latest = [null, null, null];
    this.stats = [emptyStats(), emptyStats(), emptyStats()];
    this.baselines = [[], [], []];
    this.lengthSignals = [[], [], []];
    this.frameCount = 0;
    this.suspended = false;
  }

  append(frame: DeviceFrame, options: { factors: readonly number[]; invert: boolean | readonly boolean[]; recording: boolean }) {
    if (this.suspended) return;
    const hostTime = new Date().toISOString();
    for (const sample of frame.channels) {
      const index = sample.channel - 1;
      const inverted = typeof options.invert === 'boolean' ? options.invert : options.invert[index];
      const sign = inverted ? -1 : 1;
      const enabled = this.enabledChannels[index];
      // A disabled IPC frame may already be queued when the user enables this channel.
      // It must not become one of that channel's new baseline samples.
      if (enabled && sample.enabled === false) continue;
      const buffer = this.baselines[index];
      const warming = buffer.length < 10;
      if (enabled && warming) buffer.push(sample.delta);
      const baseline = enabled && buffer.length ? buffer.reduce((a, b) => a + b, 0) / buffer.length : 0;
      const factor = options.factors[index] || 0;
      const rawBuffer = this.lengthSignals[index];
      if (enabled && sample.raw > -8388608 && sample.raw < 8388607) {
        rawBuffer.push(sample.raw);
        if (rawBuffer.length > 10) rawBuffer.shift();
      } else {
        rawBuffer.length = 0;
      }
      const lengthSignal = enabled && rawBuffer.length === 10 ? rawBuffer.reduce((a, b) => a + b, 0) / 10 : null;
      const filtered = enabled && !warming ? sign * (sample.filtered - baseline) || 0 : 0;
      const delta = enabled && !warming ? sign * (sample.delta - baseline) || 0 : 0;
      const point: StrainSample = {
        t: frame.t, deviceMs: frame.deviceMs, sampleIndex: frame.sampleIndex,
        channel: sample.channel, raw: enabled ? sample.raw : 0, delta, filtered,
        strain: !enabled ? 0 : factor === 0 ? null : filtered * factor, factor, baseline, sign,
        enabled, baselineReady: enabled && buffer.length >= 10,
        lengthSignal,
        lengthSampledAtMs: lengthSignal === null ? 0 : Date.now(),
        lengthMm: !enabled ? 0 : lengthSignal === null ? null : lengthFromSignal(lengthSignal, this.lengthCalibrations[index]),
        forceKn: enabled ? FORCE_RATE_KN_PER_S * Math.max(0, frame.t) : 0,
      };
      const stats = this.stats[index];
      stats.minDelta = stats.minDelta === null ? delta : Math.min(stats.minDelta, delta);
      stats.maxDelta = stats.maxDelta === null ? delta : Math.max(stats.maxDelta, delta);
      if (options.recording) {
        this.rows.push({ ...point, hostTime });
        stats.count++;
      }
      this.series.push(point);
      this.latest[index] = point;
    }
    if (options.recording) this.frameCount++;
    const cutoff = frame.t - PLOT_WINDOW_SECONDS;
    let drop = 0;
    while (drop < this.series.length && this.series[drop].t < cutoff) drop++;
    if (drop > 0) this.series.splice(0, drop);
  }
}

export interface StrainTrace {
  label: string;
  color: string;
  raw: boolean;
  points: { t: number; value: number }[];
}

export function buildStrainTraces(series: StrainSample[], channelCount: number, showRaw: boolean, enabled?: readonly boolean[]): StrainTrace[] {
  const traces: StrainTrace[] = [];
  for (let index = 0; index < channelCount; index++) {
    const points = series.filter((sample) => sample.channel === index + 1);
    const label = CHANNEL_LABELS[index];
    const color = CHANNEL_COLORS[index];
    const values = (key: 'delta' | 'filtered') => enabled?.[index] === false
      ? [{ t: 0, value: 0 }, { t: Math.max(series.at(-1)?.t ?? 30, 1), value: 0 }]
      : points.map((sample) => ({ t: sample.t, value: sample[key] }));
    if (channelCount === 1 || showRaw) {
      traces.push({ label: channelCount === 1 ? 'Δ raw' : `${label} raw`,
        color: channelCount === 1 ? '#f0b429' : color, raw: true,
        points: values('delta') });
    }
    traces.push({ label: channelCount === 1 ? 'Filtered' : label,
      color: channelCount === 1 ? '#35b7ff' : color, raw: false,
      points: values('filtered') });
  }
  return traces;
}