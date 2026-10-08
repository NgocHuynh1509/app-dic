import { ManualForceSource, PlaceholderTemperatureSource } from "./sensors.js";

export const SessionState = Object.freeze({
  IDLE: "Idle",
  RUNNING: "Running",
  STOPPED: "Stopped",
});

const round = (x, d) => {
  const f = 10 ** d;
  return Math.round(x * f) / f;
};

/**
 * Quản lý phiên đo: trạng thái, Force, Temperature và bảng kết quả.
 * Camera + DIC chạy ở trình duyệt; mỗi giây trình duyệt gửi một mẫu kết quả,
 * server gắn thêm Force / Temperature rồi lưu lại để xuất CSV.
 */
export class SessionManager {
  constructor(cfg) {
    this.cfg = cfg;
    this.force = new ManualForceSource(cfg.forceStep);
    this.temperature = new PlaceholderTemperatureSource();

    this.state = SessionState.IDLE;
    this.results = [];
    this.startedAt = null;
    this.stoppedAt = null;
    this.lastError = "";
  }

  snapshot() {
    return {
      state: this.state,
      force: round(this.force.read(), 3),
      temperature: round(this.temperature.read(), 2),
      n_results: this.results.length,
      started_at: this.startedAt,
      last_error: this.lastError,
    };
  }

  sensors() {
    return {
      force: round(this.force.read(), 3),
      temperature: round(this.temperature.read(), 2),
    };
  }

  // ------------------------------------------------------------ điều khiển --
  start() {
    if (this.state === SessionState.RUNNING) return this.snapshot();
    this.lastError = "";
    this.state = SessionState.RUNNING;
    this.startedAt = Date.now() / 1000;
    return this.snapshot();
  }

  stop() {
    this.state = SessionState.STOPPED;
    this.stoppedAt = Date.now() / 1000;
    return this.snapshot();
  }

  /** Xoá kết quả tích luỹ. Trình duyệt tự bắt lại reference ở frame kế tiếp. */
  reset() {
    this.results = [];
    this.force.reset();
    this.temperature.reset();
    if (this.state !== SessionState.IDLE) this.state = SessionState.RUNNING;
    return this.snapshot();
  }

  setError(message) {
    this.lastError = message || "";
    if (this.lastError) this.state = SessionState.IDLE;
    return this.snapshot();
  }

  forceIncrease() {
    return this.force.increase();
  }

  forceDecrease() {
    return this.force.decrease();
  }

  // --------------------------------------------------------------- dữ liệu --
  addResult(sample) {
    if (this.state !== SessionState.RUNNING) return false;
    const t = Number(sample.t);
    this.results.push({
      t: round(t, 2),
      time_label: `${Math.round(t)}s`,
      force: round(this.force.read(), 3),
      displacement: sample.displacement,
      displacement_unit: sample.displacement_unit,
      temperature: round(this.temperature.read(), 2),
      eps_xx: sample.eps_xx ?? null,
      eps_yy: sample.eps_yy ?? null,
      gamma_xy: sample.gamma_xy ?? null,
      status: "Running",
    });
    if (this.results.length > this.cfg.maxResultsRows) this.results.shift();
    return true;
  }

  getResults() {
    return this.results.slice();
  }

  resultsCsv() {
    const header = [
      "timestamp_s", "force", "displacement", "displacement_unit",
      "temperature", "eps_xx", "eps_yy", "gamma_xy", "status",
    ];
    const cell = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const r of this.results) {
      lines.push(
        [r.t, r.force, r.displacement, r.displacement_unit, r.temperature, r.eps_xx, r.eps_yy, r.gamma_xy, r.status]
          .map(cell)
          .join(",")
      );
    }
    return lines.join("\r\n") + "\r\n";
  }
}
