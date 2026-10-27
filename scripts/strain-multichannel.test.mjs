import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
const require = createRequire(import.meta.url);
const protocol = () => require('../electron/strainProtocol.cjs');
const model = () => import('../src/hooks/strainSession.ts');

function listen() {
  const { StrainProtocol } = protocol();
  const decoder = new StrainProtocol();
  const frames = [], readiness = [], logs = [];
  decoder.on('data', (frame) => frames.push(frame));
  decoder.on('hx', (state) => readiness.push(state));
  decoder.on('log', (line) => logs.push(line));
  return { decoder, frames, readiness, logs };
}

test('recognizes the exact V5 firmware handshake and the old V3 board', () => {
  const { deviceInfo } = protocol();
  assert.deepEqual(deviceInfo('DEVICE,STRAIN_METER_3HX711_W5500,V5'), { channelCount: 3 });
  assert.deepEqual(deviceInfo('DEVICE,STRAIN_METER_HX711,V3'), { channelCount: 1 });
  assert.equal(deviceInfo('DEVICE,UNRELATED,V5'), null);
});

test('V5 frame preserves channel order and uses independent EMA at a shared time', () => {
  const { decoder, frames } = listen();
  decoder.handleLine('DATA,1,1000,1100,100,2200,200,-3300,-300');
  decoder.handleLine('DATA,2,1100,1110,110,2180,180,-3270,-270');
  assert.equal(frames.length, 2);
  assert.equal(frames[1].t, 0.1);
  assert.equal(frames[1].sampleIndex, 2);
  assert.deepEqual(frames[0].channels, [
    { channel: 1, raw: 1100, delta: 100, filtered: 100, enabled: true },
    { channel: 2, raw: 2200, delta: 200, filtered: 200, enabled: true },
    { channel: 3, raw: -3300, delta: -300, filtered: -300, enabled: true },
  ]);
  assert.deepEqual(frames[1].channels.map((s) => s.filtered), [101.8, 196.4, -294.6]);
});

test('legacy frames, readiness and START reset remain supported', () => {
  const { decoder, frames, readiness } = listen();
  decoder.handleLine('HX711,READY');
  decoder.handleLine('DATA,800,500,10');
  decoder.handleLine('DATA,900,600,20');
  assert.equal(readiness[0].ready, true);
  assert.equal(frames[1].channels[0].filtered, 11.8);
  decoder.handleLine('OK,START');
  decoder.handleLine('DATA,2000,700,90');
  assert.equal(frames[2].t, 0);
  assert.equal(frames[2].channels.length, 1);
  assert.equal(frames[2].channels[0].filtered, 90);
});

test('V5 readiness identifies each sensor; READ uses the same frame layout', () => {
  const { decoder, frames, readiness } = listen();
  decoder.handleLine('STATUS,HX1=READY,HX2=BUSY,HX3=READY');
  assert.deepEqual(readiness[0].channels, [true, false, true]);
  assert.equal(readiness[0].ready, false);
  decoder.handleLine('READ,7,1200,1,2,3,4,5,6');
  assert.deepEqual(frames[0].channels.map((s) => s.delta), [2, 4, 6]);
});

test('rejects incomplete, malformed or out-of-range frames without poisoning EMA', () => {
  const { decoder, frames, logs } = listen();
  for (const line of [
    'DATA,1,1000,1,2,3,4,5', 'DATA,1,1000,1,2,3,no,5,6',
    'DATA,1,1000,1,2,3,4,5,6oops', 'DATA,1,1000,1,2,3,4,,6',
    'DATA,1,-1,1,2,3,4,5,6', 'DATA,1,1000,8388608,2,3,4,5,6',
  ]) decoder.handleLine(line);
  assert.equal(frames.length, 0);
  assert.equal(logs.length, 6);
  decoder.handleLine('DATA,2,1500,1,10,3,20,5,30');
  assert.equal(frames[0].t, 0);
  assert.deepEqual(frames[0].channels.map((s) => s.filtered), [10, 20, 30]);
});

test('uint32 millis wrap keeps elapsed time increasing', () => {
  const { decoder, frames } = listen();
  decoder.handleLine('DATA,1,4294967290,1,1,2,2,3,3');
  decoder.handleLine('DATA,2,4,1,1,2,2,3,3');
  assert.equal(frames[1].t, 0.01);
});

function frame(t, values, filtered = values) {
  return { t, deviceMs: t * 1000, sampleIndex: t + 1,
    channels: values.map((delta, i) => ({ channel: i + 1, raw: delta + 10000, delta, filtered: filtered[i] })) };
}

test('three baselines, calibration, extrema and CSV rows stay isolated', async () => {
  const { StrainSession, CSV_COLUMNS, rowToCells } = await model();
  const session = new StrainSession();
  const options = { factors: [2, 3, 4], invert: true, recording: true };
  for (let i = 0; i < 10; i++) session.append(frame(i, [100, 1000, -100]), options);
  session.append(frame(10, [110, 980, -70]), options);
  assert.deepEqual(session.latest.map((s) => s.baseline), [100, 1000, -100]);
  assert.deepEqual(session.latest.map((s) => s.delta), [-10, 20, -30]);
  assert.deepEqual(session.latest.map((s) => s.strain), [-20, 60, -120]);
  assert.equal(session.frameCount, 11);
  assert.equal(session.rows.length, 33);
  assert.deepEqual(session.stats.map((s) => s.count), [11, 11, 11]);
  assert.deepEqual(session.stats.map((s) => s.minDelta), [-10, 0, -30]);
  const lastRows = session.rows.slice(-3);
  assert.deepEqual(lastRows.map((row) => row.channel), [1, 2, 3]);
  for (const row of lastRows) {
    const cells = rowToCells(row);
    assert.equal(cells[CSV_COLUMNS.indexOf('channel')], row.channel);
    assert.equal(cells[CSV_COLUMNS.indexOf('sample_index')], 11);
    assert.equal(cells.length, CSV_COLUMNS.length);
  }
});

test('stop retains recorded rows, window trims all channels, reset clears all baselines', async () => {
  const { StrainSession } = await model();
  const session = new StrainSession();
  session.append(frame(0, [10, 20, 30]), { factors: [0, 0, 0], invert: false, recording: true });
  session.append(frame(31, [40, 50, 60]), { factors: [0, 0, 0], invert: false, recording: false });
  assert.equal(session.rows.length, 3);
  assert.equal(session.frameCount, 1);
  assert.equal(session.series.length, 3);
  assert.ok(session.series.every((s) => s.t === 31));
  session.reset();
  assert.equal(session.rows.length, 0);
  assert.equal(session.series.length, 0);
  assert.equal(session.frameCount, 0);
  session.append(frame(0, [900, 800, 700]), { factors: [0, 0, 0], invert: false, recording: true });
  assert.deepEqual(session.latest.map((s) => s.baseline), [900, 800, 700]);
  assert.deepEqual(session.latest.map((s) => s.delta), [0, 0, 0]);
});

test('chart builds three separate filtered traces; raw overlays and V3 remain available', async () => {
  const { StrainSession, buildStrainTraces } = await model();
  const session = new StrainSession();
  const options = { factors: [0, 0, 0], invert: false, recording: true };
  for (let i = 0; i < 10; i++) session.append(frame(i, [100, 200, 300]), options);
  session.append(frame(10, [101, 202, 303], [101, 201, 301]), options);
  const traces = buildStrainTraces(session.series, 3, false);
  assert.equal(traces.length, 3);
  assert.equal(new Set(traces.map((s) => s.color)).size, 3);
  assert.deepEqual(traces.map((s) => s.points.at(-1).value), [1, 1, 1]);
  assert.deepEqual(traces.map((s) => s.label), ['HX1 · TOP', 'HX2 · MIDDLE', 'HX3 · BOTTOM']);
  assert.ok(traces.every((s) => s.points.length === 11));
  assert.equal(buildStrainTraces(session.series, 3, true).length, 6);
  const legacy = buildStrainTraces(session.series.filter((s) => s.channel === 1), 1, false);
  assert.deepEqual(legacy.map((s) => s.label), ['Δ raw', 'Filtered']);
});

test('real V5 decoding feeds three session traces with no channel mixing', async () => {
  const { StrainSession, buildStrainTraces } = await model();
  const { decoder } = listen();
  const session = new StrainSession();
  decoder.on('data', (packet) => session.append(packet, { factors: [0, 0, 0], invert: false, recording: true }));
  for (let i = 0; i < 10; i++) decoder.handleLine(`DATA,${i + 1},${i * 100},100,10,200,20,300,30`);
  decoder.handleLine('DATA,11,1000,110,20,180,0,330,60');
  const ends = buildStrainTraces(session.series, 3, false).map((s) => s.points.at(-1).value);
  for (const [i, expected] of [1.8, -3.6, 5.4].entries()) assert.ok(Math.abs(ends[i] - expected) < 1e-10);
  assert.equal(session.rows.length, 33);
});

test('reconnecting retains exportable data and blocks new clock data until the next START', async () => {
  const { StrainSession } = await model();
  const session = new StrainSession();
  const options = { factors: [0, 0, 0], invert: false, recording: true };
  session.append(frame(40, [10, 20, 30]), options);
  session.suspend();
  session.append(frame(0, [100, 200, 300]), options);
  assert.equal(session.frameCount, 1);
  assert.equal(session.rows.length, 3);
  assert.equal(session.series[0].t, 40);
  session.reset();
  session.append(frame(0, [100, 200, 300]), options);
  assert.equal(session.frameCount, 1);
  assert.deepEqual(session.latest.map((sample) => sample.baseline), [100, 200, 300]);
});

test('actual serial adapter reconstructs split USB chunks into complete V5 frames', async (t) => {
  const { StrainSerial } = require('../electron/strainSerial.cjs');
  const { ReadlineParser } = require('serialport');
  const serial = new StrainSerial();
  const parser = new ReadlineParser({ delimiter: '\n' });
  // Only the physical port is replaced; use the production adapter and line parser.
  const port = new EventEmitter();
  port.write = () => {};
  const frames = [], statuses = [];
  serial.on('data', (data) => frames.push(data));
  serial.on('status', (status) => statuses.push(status));
  serial.attach(port, parser, 'TEST_PORT', protocol().deviceInfo('DEVICE,STRAIN_METER_3HX711_W5500,V5'));
  t.after(() => clearInterval(serial.statusTimer));
  const finished = new Promise((resolve) => parser.once('finish', resolve));
  parser.write('DATA,1,1000,100,10,200');
  parser.write(',20,300,30\r\nDATA,2,1100,110,20,180');
  parser.end(',0,330,60\n');
  await finished;
  assert.equal(statuses[0].channelCount, 3);
  assert.equal(frames.length, 2);
  assert.equal(frames[1].channels.length, 3);
  assert.equal(frames[1].t, 0.1);
  assert.deepEqual(frames[1].channels.map((sample) => sample.delta), [20, 0, 60]);
});

test('disabled channels ignore floating sensor noise and do not contaminate enabled channels', async () => {
  const { StrainSession, rowToCells, CSV_COLUMNS } = await model();
  const session = new StrainSession();
  session.setEnabledChannels([true, false, false]);
  const options = { factors: [2, 3, 4], invert: true, recording: true };
  for (let i = 0; i < 10; i++) session.append(frame(i, [100, i * 999, -i * 777]), options);
  session.append(frame(10, [110, 8000000, -8000000]), options);
  assert.equal(session.latest[0].delta, -10);
  for (const sample of session.latest.slice(1)) {
    assert.deepEqual([sample.raw, sample.delta, sample.filtered, sample.strain, sample.baseline], [0, 0, 0, 0, 0]);
    assert.equal(sample.enabled, false);
    assert.equal(rowToCells({ ...sample, hostTime: 'now' })[CSV_COLUMNS.indexOf('enabled')], 0);
  }
});

test('enable/disable resets only that channels baseline and zeros it immediately', async () => {
  const { StrainSession } = await model();
  const session = new StrainSession();
  const options = { factors: [1, 1, 1], invert: false, recording: true };
  for (let i = 0; i < 10; i++) session.append(frame(i, [100, 200, 300]), options);
  session.append(frame(10, [110, 220, 330]), options);
  const other = session.latest[0];
  session.setEnabledChannels([true, false, true]);
  assert.equal(session.latest[1].delta, 0);
  assert.equal(session.latest[0], other);
  assert.equal(session.rows.length, 33);
  session.setEnabledChannels([true, true, true]);
  for (let i = 0; i < 10; i++) session.append(frame(11 + i, [110, 900, 330]), options);
  assert.equal(session.latest[1].baseline, 900);
  assert.equal(session.latest[1].delta, 0);
  assert.equal(session.latest[0].baseline, 100);
});

test('baseline warmup holds measurement at zero until ten fresh samples are collected', async () => {
  const { StrainSession } = await model();
  const session = new StrainSession();
  for (let i = 0; i < 9; i++) {
    session.append(frame(i, [100 + i * 10, 200, 300]), { factors: [1, 1, 1], invert: false, recording: true });
    assert.equal(session.latest[0].delta, 0);
    assert.equal(session.latest[0].filtered, 0);
  }
});

test('decoder drops disabled noise and reinitializes only its own EMA on re-enable', () => {
  const { decoder, frames } = listen();
  decoder.setEnabledChannels([true, false, true]);
  decoder.handleLine('DATA,1,1000,100,10,8000000,8000000,300,30');
  assert.deepEqual(frames[0].channels[1], { channel: 2, raw: 0, delta: 0, filtered: 0, enabled: false });
  decoder.setEnabledChannels([true, true, true]);
  decoder.handleLine('DATA,2,1100,110,20,200,20,330,60');
  assert.equal(frames[1].channels[1].filtered, 20);
  assert.equal(frames[1].channels[0].filtered, 11.8);
});

test('disabled trace is flat zero even before START or when the previous history was noisy', async () => {
  const { StrainSession, buildStrainTraces } = await model();
  const session = new StrainSession();
  const options = { factors: [0, 0, 0], invert: false, recording: true };
  for (let i = 0; i < 12; i++) session.append(frame(i, [100 + i, 80000 * i, -50000 * i]), options);
  const traces = buildStrainTraces(session.series, 3, false, [true, false, false]);
  assert.ok(traces[0].points.some((p) => p.value !== 0));
  assert.ok(traces.slice(1).every((trace) => trace.points.length >= 2 && trace.points.every((p) => p.value === 0)));
  assert.ok(buildStrainTraces([], 3, false, [false, false, false]).every((trace) => trace.points.length === 2 && trace.points.every((p) => p.value === 0)));
});

test('queued disabled frames cannot enter a freshly enabled channels baseline', async () => {
  const { StrainSession } = await model();
  const { decoder, frames } = listen();
  decoder.setEnabledChannels([false, false, false]);
  decoder.handleLine('DATA,1,100,1000,1000,2000,2000,3000,3000');
  const session = new StrainSession();
  session.setEnabledChannels([false, false, false]);
  session.setEnabledChannels([true, false, false]);
  const options = { factors: [1, 1, 1], invert: false, recording: true };
  session.append(frames[0], options);
  assert.equal(session.stats[0].count, 0);
  decoder.setEnabledChannels([true, false, false]);
  for (let i = 0; i < 10; i++) {
    decoder.handleLine(`DATA,${i + 2},${(i + 2) * 100},1000,1000,2000,2000,3000,3000`);
    session.append(frames.at(-1), options);
  }
  assert.equal(session.latest[0].baseline, 1000);
  assert.equal(session.latest[0].delta, 0);
  assert.equal(session.stats[0].count, 10);
});

test('red, blue and black traces keep three distinct measurements with independent sign and calibration', async () => {
  const { StrainSession, buildStrainTraces } = await model();
  const session = new StrainSession();
  const options = { factors: [2, 3, 4], invert: [false, true, false], recording: true };
  for (let i = 0; i < 10; i++) session.append(frame(i, [100, 200, 300]), options);
  session.append(frame(10, [110, 220, 330]), options);
  assert.deepEqual(session.latest.map((s) => s.delta), [10, -20, 30]);
  assert.deepEqual(session.latest.map((s) => s.strain), [20, -60, 120]);
  const traces = buildStrainTraces(session.series, 3, false);
  assert.deepEqual(traces.map((trace) => trace.color), ['#d32f2f', '#1565c0', '#000000']);
  assert.deepEqual(traces.map((trace) => trace.points.at(-1).value), [10, -20, 30]);
});

test('live and strain panels render all channels own numbers at the same time', async () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const ts = require('typescript');
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const source = fs.readFileSync(new URL('../src/components/StrainChannelReadings/StrainChannelReadings.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const output = { exports: {} };
  vm.runInNewContext(compiled, { exports: output.exports, module: output, require });
  const { StrainSession } = await model();
  const session = new StrainSession();
  const options = { factors: [2, 3, 4], invert: false, recording: true };
  for (let i = 0; i < 10; i++) session.append(frame(i, [100, 200, 300]), options);
  session.append(frame(10, [110, 220, 330]), options);
  const props = {
    latest: session.latest, stats: session.stats, channelCount: 3, enabled: [true, true, true],
    labels: ['HX1 · TOP', 'HX2 · MIDDLE', 'HX3 · BOTTOM'], colors: ['#d32f2f', '#1565c0', '#000000'],
    factorTexts: ['2', '3', '4'], inversions: [false, false, false], onFactorChange() {}, onInvertChange() {},
  };
  const html = renderToStaticMarkup(React.createElement(output.exports.StrainChannelReadings, props));
  for (const [i, raw] of [10110, 10220, 10330].entries()) {
    assert.match(html, new RegExp(`aria-label="HX${i + 1} Raw HX711"[^>]*value="${raw}"`));
  }
  const strain = renderToStaticMarkup(React.createElement(output.exports.StrainChannelCalibration, props));
  for (const [i, value] of ['20.000', '60.000', '120.000'].entries()) {
    assert.match(strain, new RegExp(`aria-label="HX${i + 1} Strain"[^>]*value="${value}"`));
  }
  const disabled = renderToStaticMarkup(React.createElement(output.exports.StrainChannelReadings, { ...props, enabled: [true, false, true] }));
  assert.match(disabled, /aria-label="HX2 Raw HX711"[^>]*value="0"/);
  assert.match(disabled, /aria-label="HX1 Raw HX711"[^>]*value="10110"/);
  const lengths = renderToStaticMarkup(React.createElement(output.exports.StrainChannelReadings, {
    ...props, latest: session.latest.map((sample, i) => ({ ...sample, lengthMm: [3.0001, 4.5, null][i] })),
  }));
  assert.match(lengths, /aria-label="HX1 Length mm"[^>]*value="3.0001"/);
  assert.match(lengths, /aria-label="HX2 Length mm"[^>]*value="4.5000"/);
  assert.match(lengths, /aria-label="HX3 Length mm"[^>]*value="--"/);
});
