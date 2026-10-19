const { EventEmitter } = require('events');
const { SerialPort, ReadlineParser } = require('serialport');

const BAUD_RATE = 115200;
const DEVICE_SIGNATURE = 'DEVICE,STRAIN_METER_HX711,V3';
const EMA_ALPHA = 0.18;
const ALLOWED_CMDS = new Set(['STATUS', 'ZERO', 'START', 'STOP', 'READ']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class StrainSerial extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.running = false;
    this.connected = false;
    this.firstMs = null;
    this.ema = null;
    this.statusTimer = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  async stop() {
    this.running = false;
    clearInterval(this.statusTimer);
    if (this.connected) {
      try { this.port.write('STOP\n'); await sleep(50); } catch {}
    }
    await this.closePort();
  }

  async loop() {
    while (this.running) {
      if (!this.connected) await this.scanOnce();
      await sleep(2000);
    }
  }

  async candidatePorts() {
    const all = await SerialPort.list();
    const usb = all.filter((p) => {
      const d = `${p.manufacturer || ''} ${p.friendlyName || ''}`.toUpperCase();
      return p.vendorId || /USB|CP210|CH340|UART|SILICON/.test(d);
    });
    return usb.length ? usb : all;
  }

  async scanOnce() {
    const ports = await this.candidatePorts();
    if (!ports.length) return this.emit('status', { state: 'no_ports' });

    for (const p of ports) {
      if (!this.running) return;
      this.emit('status', { state: 'trying', port: p.path });
      if (await this.tryPort(p.path)) return;
    }
    this.emit('status', { state: 'not_found' });
  }

  tryPort(path) {
    return new Promise((resolve) => {
      const port = new SerialPort({ path, baudRate: BAUD_RATE, autoOpen: false });
      const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
      let done = false;
      let pingTimer = null;

      const finish = (ok) => {
        if (done) return;
        done = true;
        clearInterval(pingTimer);
        if (!ok) {
          parser.removeAllListeners('data');
          if (port.isOpen) port.close(() => resolve(false));
          else resolve(false);
        } else resolve(true);
      };

      port.on('error', (e) => {
        this.emit('log', `${path}: ${e.message}`);
        finish(false);
      });

      parser.on('data', (raw) => {
        const line = String(raw).trim();
        if (!line) return;
        if (!done) {
          if (line === DEVICE_SIGNATURE) {
            this.port = port;
            this.connected = true;
            this.attach(port, parser, path);
            finish(true);
          }
          return;
        }
      });

      port.open(async (err) => {
        if (err) {
          this.emit('log', `${path}: ${err.message}`);
          return finish(false);
        }
        await sleep(1300); // ESP32 DevKit thường reset khi mở COM
        if (done) return;
        try { port.flush(); } catch {}
        const deadline = Date.now() + 3000;
        pingTimer = setInterval(() => {
          if (done) return;
          if (Date.now() > deadline) return finish(false);
          port.write('PING\n');
        }, 500);
        port.write('PING\n');
      });
    });
  }

  attach(port, parser, path) {
    this.firstMs = null;
    this.ema = null;
    this.emit('status', { state: 'connected', port: path });
    port.write('STATUS\n');

    parser.on('data', (raw) => this.handleLine(String(raw).trim()));

    port.on('close', () => this.onLost('Cổng đã đóng'));
    port.on('error', (e) => this.onLost(e.message));

    this.statusTimer = setInterval(() => this.send('STATUS'), 2000);
  }

  onLost(msg) {
    if (!this.connected) return;
    this.connected = false;
    clearInterval(this.statusTimer);
    this.port = null;
    this.emit('status', { state: 'disconnected', detail: msg });
  }

  async closePort() {
    const p = this.port;
    this.port = null;
    this.connected = false;
    if (p && p.isOpen) await new Promise((r) => p.close(() => r()));
  }

  send(cmd) {
    const c = String(cmd).trim().toUpperCase();
    if (!ALLOWED_CMDS.has(c) || !this.connected || !this.port) return false;
    this.port.write(c + '\n');
    return true;
  }

  handleLine(line) {
    if (!line) return;

    if (line === 'HX711,READY') return this.emit('hx', { ready: true });
    if (line === 'HX711,NOT_READY') return this.emit('hx', { ready: false });

    if (line.startsWith('DATA,')) {
      const p = line.split(',');
      if (p.length !== 4) return this.emit('log', 'DATA lỗi: ' + line);
      const deviceMs = parseInt(p[1], 10);
      const raw = parseInt(p[2], 10);
      const delta = parseInt(p[3], 10);
      if ([deviceMs, raw, delta].some(Number.isNaN)) {
        return this.emit('log', 'Không parse được: ' + line);
      }
      if (this.firstMs === null) this.firstMs = deviceMs;
      const t = (deviceMs - this.firstMs) / 1000;
      this.ema = this.ema === null ? delta : this.ema + EMA_ALPHA * (delta - this.ema);
      return this.emit('data', { t, deviceMs, raw, delta, filtered: this.ema });
    }

    if (line.startsWith('START') || line === 'OK,START') this.firstMs = null, this.ema = null;
    this.emit('log', line);
  }
}

module.exports = { StrainSerial };