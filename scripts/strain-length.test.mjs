import { test } from 'node:test';
import assert from 'node:assert/strict';
const calibration = () => import('../src/hooks/strainLengthCalibration.ts');

test('two points map 3mm and 4mm with sub-thousandth interpolation and negative slopes', async () => {
  const { createLengthCalibration, lengthFromSignal } = await calibration();
  const result = createLengthCalibration({ lengthMm: 3, signal: 1000 }, { lengthMm: 4, signal: 11000 });
  assert.equal(result.ok, true);
  assert.equal(lengthFromSignal(1000, result.calibration), 3);
  assert.equal(lengthFromSignal(11000, result.calibration), 4);
  assert.equal(lengthFromSignal(1001, result.calibration).toFixed(4), '3.0001');
  const reversed = createLengthCalibration({ lengthMm: 3, signal: 11000 }, { lengthMm: 4, signal: 1000 });
  assert.equal(lengthFromSignal(6000, reversed.calibration), 3.5);
});

test('invalid, identical and saturated references cannot become calibration', async () => {
  const { createLengthCalibration } = await calibration();
  for (const [a, b] of [
    [{ lengthMm: 3, signal: 1000 }, { lengthMm: 4, signal: 1000 }],
    [{ lengthMm: 3, signal: 1000 }, { lengthMm: 3, signal: 2000 }],
    [{ lengthMm: NaN, signal: 1000 }, { lengthMm: 4, signal: 2000 }],
    [{ lengthMm: -3, signal: 1000 }, { lengthMm: 4, signal: 2000 }],
    [{ lengthMm: 3, signal: 8388607 }, { lengthMm: 4, signal: 2000 }],
    [{ lengthMm: 3, signal: 1000 }, { lengthMm: 4, signal: -8388608 }],
    [{ lengthMm: 0, signal: 1000 }, { lengthMm: 1e308, signal: 1000.00001 }],
  ]) assert.equal(createLengthCalibration(a, b).ok, false);
});

const packet = (t, raw = 1000, delta = 50) => ({ t, deviceMs: t * 1000, sampleIndex: t,
  channels: [1, 2, 3].map((channel) => ({ channel, raw, delta, filtered: delta, enabled: true })) });

test('length stays independent by channel, baseline, inversion and session reset', async () => {
  const { createLengthCalibration } = await calibration();
  const { StrainSession } = await import('../src/hooks/strainSession.ts');
  const first = createLengthCalibration({ lengthMm: 3, signal: 1000 }, { lengthMm: 4, signal: 3000 }).calibration;
  const second = createLengthCalibration({ lengthMm: 10, signal: 1000 }, { lengthMm: 20, signal: 3000 }).calibration;
  const session = new StrainSession();
  session.setLengthCalibrations([first, second, null]);
  const options = { factors: [0, 2, 3], invert: [true, false, true], recording: true };
  for (let i = 0; i < 9; i++) session.append(packet(i, 2000), options);
  assert.equal(session.latest[0].lengthMm, null);
  session.append(packet(9, 2000), options);
  assert.deepEqual(session.latest.map((s) => s.lengthMm), [3.5, 15, null]);
  session.reset();
  for (let i = 0; i < 10; i++) session.append(packet(i, 2000, 0), { ...options, invert: false });
  assert.deepEqual(session.latest.map((s) => s.lengthMm), [3.5, 15, null]);
  session.setEnabledChannels([true, false, true]);
  assert.equal(session.latest[1].lengthMm, 0);
});

test('adding calibration updates live mm without modifying previously recorded values', async () => {
  const { createLengthCalibration } = await calibration();
  const { StrainSession, rowToCells, CSV_COLUMNS } = await import('../src/hooks/strainSession.ts');
  const session = new StrainSession();
  const options = { factors: [0, 0, 0], invert: false, recording: true };
  for (let i = 0; i < 10; i++) session.append(packet(i), options);
  const oldRow = session.rows.at(-3);
  assert.equal(oldRow.lengthMm, null);
  const cal = createLengthCalibration({ lengthMm: 3, signal: 1000 }, { lengthMm: 4, signal: 3000 }).calibration;
  session.setLengthCalibrations([cal, null, null]);
  assert.equal(session.latest[0].lengthMm, 3);
  assert.equal(oldRow.lengthMm, null);
  session.append(packet(10), options);
  const row = session.rows.at(-3);
  assert.equal(rowToCells(row)[CSV_COLUMNS.indexOf('length_mm')], '3.0000');
  assert.equal(row.raw, 1000);
  assert.equal(row.delta, 0);
});

test('complete per-channel calibrations survive storage reload and malformed data is rejected', async () => {
  const { createLengthCalibration, loadLengthCalibrations, saveLengthCalibrations } = await calibration();
  let saved;
  const storage = { setItem: (_key, value) => { saved = value; }, getItem: () => saved };
  const cal = createLengthCalibration({ lengthMm: 3, signal: 1000 }, { lengthMm: 4, signal: 3000 }).calibration;
  assert.equal(saveLengthCalibrations([cal, null, cal], storage), true);
  assert.deepEqual(loadLengthCalibrations(storage), [cal, null, cal]);
  saved = '{corrupt';
  assert.deepEqual(loadLengthCalibrations(storage), [null, null, null]);
  saved = JSON.stringify([{ first: { lengthMm: 3, signal: 1 }, second: { lengthMm: 4, signal: 1 } }, null, null]);
  assert.deepEqual(loadLengthCalibrations(storage), [null, null, null]);
});

test('saturated ADC values cannot supply a calibration signal or a valid length', async () => {
  const { createLengthCalibration } = await calibration();
  const { StrainSession } = await import('../src/hooks/strainSession.ts');
  const session = new StrainSession();
  const cal = createLengthCalibration({ lengthMm: 3, signal: 1000 }, { lengthMm: 4, signal: 3000 }).calibration;
  session.setLengthCalibrations([cal, null, null]);
  const options = { factors: [0, 0, 0], invert: false, recording: true };
  for (let i = 0; i < 10; i++) session.append(packet(i, 2000), options);
  assert.equal(session.latest[0].lengthMm, 3.5);
  session.append(packet(10, 8388607), options);
  assert.equal(session.latest[0].lengthSignal, null);
  assert.equal(session.latest[0].lengthMm, null);
});
