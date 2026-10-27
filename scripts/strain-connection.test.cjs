const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { StrainSerial } = require('../electron/strainSerial.cjs');

const turn = () => new Promise((resolve) => setImmediate(resolve));
const port = () => Object.assign(new EventEmitter(), { isOpen: true, write() {}, close(cb) { this.isOpen = false; this.emit('close'); cb?.(); } });

test('start/stop/start during discovery keeps a single active scan', async (t) => {
  const serial = new StrainSerial();
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  let attempts = 0;
  serial.candidatePorts = async () => [{ path: 'TEST' }];
  serial.tryPort = async () => { attempts++; await pending; return true; };
  t.after(async () => { release(); await serial.stop(); });
  serial.start();
  const stopping = serial.stop();
  serial.start();
  await turn();
  await stopping;
  assert.equal(attempts, 1);
});

test('late close/error events from an old port cannot disconnect the current port', (t) => {
  const serial = new StrainSerial();
  const oldPort = port(), currentPort = port();
  t.after(async () => { clearInterval(serial.statusTimer); await serial.stop(); });
  serial.port = oldPort;
  serial.connected = true;
  serial.attach(oldPort, new EventEmitter(), 'OLD', { channelCount: 3 });
  const oldTimer = serial.statusTimer;
  t.after(() => clearInterval(oldTimer));
  serial.port = currentPort;
  serial.attach(currentPort, new EventEmitter(), 'CURRENT', { channelCount: 3 });
  oldPort.emit('close');
  oldPort.emit('error', new Error('stale port error'));
  assert.equal(serial.connected, true);
  assert.equal(serial.port, currentPort);
});

test('stopping an old connection never closes a connection attached during shutdown', async (t) => {
  const serial = new StrainSerial();
  const oldPort = port(), currentPort = port();
  t.after(async () => { await serial.stop(); });
  serial.port = oldPort;
  serial.connected = true;
  const stopping = serial.stop();
  serial.port = currentPort;
  serial.connected = true;
  serial.running = true;
  await stopping;
  assert.equal(currentPort.isOpen, true);
  assert.equal(oldPort.isOpen, false);
  assert.equal(serial.port, currentPort);
});
