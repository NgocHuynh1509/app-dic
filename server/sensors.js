/**
 * Nguồn Force và Temperature.
 *
 * Chưa gắn load cell hay cảm biến nhiệt thật. Cả hai được truy cập qua giao diện
 * nhỏ (read() / các hàm thay đổi) để sau này thay bằng cảm biến thật mà không phải
 * sửa session.js hay index.js.
 */

export class ForceSource {
  read() {
    throw new Error("not implemented");
  }
}

export class TemperatureSource {
  read() {
    throw new Error("not implemented");
  }
}

/** Force chưa đo thật, chỉ điều khiển từ giao diện bằng FORCE+ / FORCE-. */
export class ManualForceSource extends ForceSource {
  constructor(step = 1.0, initial = 0.0) {
    super();
    this._value = initial;
    this.step = step;
  }
  read() {
    return this._value;
  }
  increase() {
    this._value += this.step;
    return this._value;
  }
  decrease() {
    this._value -= this.step;
    return this._value;
  }
  reset(value = 0.0) {
    this._value = value;
  }
}

/** Chưa có cảm biến nhiệt: sinh đường cong trơn, có giới hạn, để giao diện có dữ liệu realtime. */
export class PlaceholderTemperatureSource extends TemperatureSource {
  constructor(baseC = 24.0, amplitudeC = 6.0, periodS = 120.0) {
    super();
    this.baseC = baseC;
    this.amplitudeC = amplitudeC;
    this.periodS = periodS;
    this._t0 = performance.now() / 1000;
  }
  read() {
    const t = performance.now() / 1000 - this._t0;
    return this.baseC + (this.amplitudeC * (1 - Math.cos((2 * Math.PI * t) / this.periodS))) / 2;
  }
  reset() {
    this._t0 = performance.now() / 1000;
  }
}
