const { SerialPort, ReadlineParser } = require('serialport');
const { StrainProtocol, deviceInfo } = require('./strainProtocol.cjs');

const BAUD_RATE = 115200;
const ALLOWED_CMDS = new Set(['STATUS', 'ZERO', 'START', 'STOP', 'READ']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class StrainSerial extends StrainProtocol {
  constructor() {
    super();
    this.port = null;
    this.running = false;
    this.connected = false;
    this.statusTimer = null;
    this.generation = 0;
    this.cancelProbe = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const generation = ++this.generation;
    this.loop(generation).catch((err) => {
      if (!this.isCurrent(generation)) return;
      this.running = false;
      this.emit('status', { state: 'disconnected', detail: err.message });
      this.emit('log', `Serial: ${err.message}`);
    });
  }

  async stop() {
    this.running = false;
    this.generation++;
    clearInterval(this.statusTimer);
    this.cancelProbe?.();
    // Detach synchronously. A later start must not be closed by this async stop.
    const oldPort = this.port;
    this.port = null;
    this.connected = false;
    if (oldPort?.isOpen) {
      try { oldPort.write('STOP\n', () => {}); await sleep(50); } catch {}
    }
    await this.closePort(oldPort);
  }

  isCurrent(generation) {
    return this.running && generation === this.generation;
  }

  async loop(generation) {
    while (this.isCurrent(generation)) {
      if (!this.connected) await this.scanOnce(generation);
      if (!this.isCurrent(generation)) return;
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

  async scanOnce(generation = this.generation) {
    const ports = await this.candidatePorts();
    if (!this.isCurrent(generation)) return;
    if (!ports.length) return this.emit('status', { state: 'no_ports' });

    for (const p of ports) {
      if (!this.isCurrent(generation) || this.connected) return;
      this.emit('status', { state: 'trying', port: p.path });
      if (await this.tryPort(p.path, generation)) return;
    }
    if (this.isCurrent(generation) && !this.connected) this.emit('status', { state: 'not_found' });
  }

  tryPort(path, generation = this.generation) {
    return new Promise((resolve) => {
      const port = new SerialPort({ path, baudRate: BAUD_RATE, autoOpen: false });
      const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
      let done = false;
      let pingTimer = null;
      let deadlineTimer = null;

      const finish = (ok) => {
        if (done) return;
        done = true;
        clearInterval(pingTimer);
        clearTimeout(deadlineTimer);
        if (this.cancelProbe === cancel) this.cancelProbe = null;
        if (!ok) {
          parser.removeAllListeners('data');
          this.closePort(port).then(() => resolve(false));
        } else resolve(true);
      };
      const cancel = () => finish(false);
      this.cancelProbe = cancel;
      // Also settles when a USB device vanishes before returning its signature.
      deadlineTimer = setTimeout(() => {
        if (this.isCurrent(generation)) this.emit('log', `${path}: không nhận được phản hồi PING từ ESP32.`);
        finish(false);
      }, 6500);

      port.on('error', (e) => {
        this.emit('log', `${path}: ${e.message}`);
        finish(false);
      });
      port.on('close', () => finish(false));

      parser.on('data', (raw) => {
        const line = String(raw).trim();
        if (!line) return;
        if (!done) {
          if (!this.isCurrent(generation)) return finish(false);
          const info = deviceInfo(line);
          if (info) {
            this.attach(port, parser, path, info);
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
        if (done || !this.isCurrent(generation)) {
          if (this.port !== port) await this.closePort(port);
          return finish(false);
        }
        await sleep(1300); // ESP32 DevKit thường reset khi mở COM
        if (done || !this.isCurrent(generation)) return finish(false);
        pingTimer = setInterval(() => {
          if (done) return;
          if (!this.isCurrent(generation)) return finish(false);
          port.write('PING\n', (writeErr) => { if (writeErr) finish(false); });
        }, 500);
        port.write('PING\n', (writeErr) => { if (writeErr) finish(false); });
      });
    });
  }

  attach(port, parser, path, info) {
    clearInterval(this.statusTimer);
    this.port = port;
    this.connected = true;
    this.resetTracking();
    this.emit('status', { state: 'connected', port: path, ...info });
    port.write('STATUS\n', (err) => { if (err) this.onLost(err.message, port); });

    parser.on('data', (raw) => {
      if (this.port === port && this.connected) this.handleLine(String(raw).trim());
    });

    port.on('close', () => this.onLost('Cổng đã đóng', port));
    port.on('error', (e) => this.onLost(e.message, port));

    this.statusTimer = setInterval(() => this.send('STATUS'), 2000);
  }

  onLost(msg, port = this.port) {
    if (!this.connected || this.port !== port) return;
    this.connected = false;
    clearInterval(this.statusTimer);
    this.port = null;
    this.emit('status', { state: 'disconnected', detail: msg });
    this.emit('log', `Serial: ${msg}`);
    this.closePort(port);
  }

  async closePort(p = this.port) {
    if (this.port === p) {
      this.port = null;
      this.connected = false;
    }
    if (p && p.isOpen) await new Promise((resolve) => {
      try { p.close(() => resolve()); } catch { resolve(); }
    });
  }

  send(cmd) {
    const c = String(cmd).trim().toUpperCase();
    if (!ALLOWED_CMDS.has(c) || !this.connected || !this.port) return false;
    const port = this.port;
    port.write(c + '\n', (err) => { if (err) this.onLost(err.message, port); });
    return true;
  }

}

module.exports = { StrainSerial };
