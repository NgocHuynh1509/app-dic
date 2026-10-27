const { EventEmitter } = require('node:events');

const EMA_ALPHA = 0.18;
const UINT32_MAX = 0xffffffff;

function deviceInfo(line) {
  if (line === 'DEVICE,STRAIN_METER_HX711,V3') return { channelCount: 1 };
  if (line === 'DEVICE,STRAIN_METER_3HX711_W5500,V5') return { channelCount: 3 };
  return null;
}

function integer(text, min, max) {
  if (!/^-?\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

class StrainProtocol extends EventEmitter {
  constructor() {
    super();
    this.enabledChannels = [true, true, true];
    this.resetTracking();
  }

  setEnabledChannels(channels) {
    if (!Array.isArray(channels) || channels.length !== 3 || channels.some((value) => typeof value !== 'boolean')) return false;
    channels.forEach((enabled, i) => {
      if (enabled !== this.enabledChannels[i]) this.ema[i] = null;
    });
    this.enabledChannels = channels.slice();
    return true;
  }

  resetTracking() {
    this.lastDeviceMs = null;
    this.elapsedMs = 0;
    this.ema = [];
  }

  handleLine(line) {
    if (!line) return;
    if (line === 'HX711,READY' || line === 'HX711,NOT_READY') {
      const ready = line === 'HX711,READY';
      return this.emit('hx', { ready, channels: [ready] });
    }
    const status = /^STATUS,HX1=(READY|BUSY),HX2=(READY|BUSY),HX3=(READY|BUSY)$/.exec(line);
    if (status) {
      const channels = status.slice(1).map((value) => value === 'READY');
      return this.emit('hx', { ready: channels.every(Boolean), channels });
    }

    if (line.startsWith('DATA,') || line.startsWith('READ,')) {
      const parts = line.split(',');
      const multi = parts.length === 9;
      if (!multi && parts.length !== 4) return this.emit('log', 'DATA lỗi: ' + line);
      const deviceMs = integer(parts[multi ? 2 : 1], 0, UINT32_MAX);
      const sampleIndex = multi ? integer(parts[1], 0, UINT32_MAX) : null;
      const channels = [];
      for (let i = 0; i < (multi ? 3 : 1); i++) {
        const offset = (multi ? 3 : 2) + i * 2;
        const raw = integer(parts[offset], -8388608, 8388607);
        const delta = integer(parts[offset + 1], -16777215, 16777215);
        if (raw === null || delta === null) return this.emit('log', 'Không parse được: ' + line);
        channels.push({ channel: i + 1, raw, delta });
      }
      if (deviceMs === null || (multi && sampleIndex === null)) return this.emit('log', 'Không parse được: ' + line);

      // millis() wraps after ~49 days; a reset is announced by the board signature.
      if (this.lastDeviceMs !== null) {
        this.elapsedMs += (deviceMs - this.lastDeviceMs + UINT32_MAX + 1) % (UINT32_MAX + 1);
      }
      this.lastDeviceMs = deviceMs;
      for (const sample of channels) {
        const i = sample.channel - 1;
        sample.enabled = this.enabledChannels[i];
        if (!this.enabledChannels[i]) {
          sample.raw = 0;
          sample.delta = 0;
          sample.filtered = 0;
          this.ema[i] = null;
          continue;
        }
        const previous = this.ema[i];
        this.ema[i] = previous == null ? sample.delta : previous + EMA_ALPHA * (sample.delta - previous);
        sample.filtered = this.ema[i];
      }
      return this.emit('data', { t: this.elapsedMs / 1000, deviceMs, sampleIndex, channels });
    }

    if (line === 'OK,START' || line.startsWith('START')) this.resetTracking();
    const info = deviceInfo(line);
    if (info) {
      this.resetTracking();
      this.emit('reset', info);
    }
    this.emit('log', line);
  }
}

module.exports = { StrainProtocol, deviceInfo };
