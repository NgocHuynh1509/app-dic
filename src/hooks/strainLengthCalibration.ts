export interface LengthReference { lengthMm: number; signal: number }
export interface LengthCalibration { first: LengthReference; second: LengthReference }
export type LengthCalibrationResult = { ok: true; calibration: LengthCalibration } | { ok: false; error: string };

export function createLengthCalibration(first: LengthReference, second: LengthReference): LengthCalibrationResult {
  const valid = (point: LengthReference) => point && Number.isFinite(point.lengthMm) && point.lengthMm >= 0
    && Number.isFinite(point.signal) && point.signal > -8388608 && point.signal < 8388607;
  if (!valid(first) || !valid(second)) return { ok: false, error: 'Mốc mm phải là số không âm; tín hiệu phải hợp lệ và không bão hòa.' };
  if (first.lengthMm === second.lengthMm) return { ok: false, error: 'Hai độ dài chuẩn phải khác nhau.' };
  if (first.signal === second.signal) return { ok: false, error: 'Hai tín hiệu trùng nhau. Hãy thay đổi độ dài và ghi nhận lại.' };
  const scale = (second.lengthMm - first.lengthMm) / (second.signal - first.signal);
  if (!Number.isFinite(scale) || !Number.isFinite(first.lengthMm - scale * first.signal)) {
    return { ok: false, error: 'Hai mốc nằm ngoài phạm vi tính toán hợp lệ.' };
  }
  return { ok: true, calibration: { first: { ...first }, second: { ...second } } };
}

export function lengthFromSignal(signal: number, calibration: LengthCalibration | null): number | null {
  if (!calibration || !Number.isFinite(signal)) return null;
  const { first, second } = calibration;
  const result = first.lengthMm + (signal - first.signal) * (second.lengthMm - first.lengthMm) / (second.signal - first.signal);
  return Number.isFinite(result) ? result : null;
}

const STORAGE_KEY = 'hx711-length-calibration-v1';
type CalibrationStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function loadLengthCalibrations(storage?: CalibrationStorage): (LengthCalibration | null)[] {
  try {
    const stored = JSON.parse((storage ?? window.localStorage).getItem(STORAGE_KEY) ?? 'null');
    if (!Array.isArray(stored) || stored.length !== 3) return [null, null, null];
    return stored.map((entry) => {
      if (!entry?.first || !entry?.second) return null;
      const result = createLengthCalibration(entry.first, entry.second);
      return result.ok ? result.calibration : null;
    });
  } catch { return [null, null, null]; }
}

export function saveLengthCalibrations(calibrations: readonly (LengthCalibration | null)[], storage?: CalibrationStorage): boolean {
  try {
    (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify(calibrations));
    return true;
  } catch { return false; }
}
