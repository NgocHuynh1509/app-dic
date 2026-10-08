// Vòng xử lý DIC (port từ dic_worker.py).
//   Camera -> frame mới nhất -> DIC -> giao diện
// Luôn xử lý frame mới nhất; frame cũ bị bỏ, không xếp hàng.
// Nếu mất bám (quá ít điểm), reference bị bỏ và tự bắt lại.

import { detectWhiteParticles } from "./detector.js";
import { ParticleTracker, displacementComponents, estimateGlobalStrain } from "./tracker.js";
import { interpolateFields } from "./field.js";
import { drawTracks, drawVectors, drawReferencePoints } from "./overlay.js";
import { onNextFrame } from "./camera.js";

const now = () => performance.now() / 1000;
const rnd = (x, d) => {
  const f = 10 ** d;
  return Math.round(x * f) / f;
};
const safe = (x) => (x == null || Number.isNaN(x) ? null : rnd(x, 8));

export class DicWorker {
  /**
   * @param {object} o
   * @param {object} o.cv        OpenCV.js
   * @param {object} o.camera    CameraWorker
   * @param {object} o.cfg       { dic, camera, stream }
   * @param {HTMLCanvasElement} o.canvas  canvas hiển thị video + chú thích
   * @param {(msg:object)=>void} o.onMessage  số liệu realtime (~wsTargetFps)
   * @param {(row:object)=>void} o.onResult   mẫu kết quả mỗi resultSampleIntervalS
   */
  constructor({ cv, camera, cfg, canvas, onMessage, onResult }) {
    this.cv = cv;
    this.camera = camera;
    this.cfg = cfg;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.onMessage = onMessage;
    this.onResult = onResult;

    this.tracker = new ParticleTracker(cv, cfg.dic);
    this._running = false;
    this._cancel = null;

    this._frameCounter = 0;
    this._globalCorr = false;

    const t = now();
    this._tCamStart = t; // dùng cho warm-up (reset() không ảnh hưởng)
    this._tStart = t;
    this._lastWsEmit = 0;
    this._lastResultSample = 0;
    this._lastDetect = 0;
    this._fpsSmooth = 0;
    this._lastFrameTime = t;

    this._heat = { version: 0, field: null };
    this._previewPts = [];

    this.referenceParticleCount = 0;
    this.referenceResets = 0;
  }

  // ------------------------------------------------------------- ctrl --
  start() {
    this._running = true;
    const t = now();
    this._tCamStart = t;
    this._tStart = t;
    this._lastResultSample = 0;
    this._lastDetect = 0;
    this._frameCounter = 0;
    this._schedule();
  }

  stop() {
    this._running = false;
    if (this._cancel) this._cancel();
    this._cancel = null;
    this.tracker.clear();
  }

  /** Dùng khi Reset phiên: bỏ reference, đặt lại mốc thời gian. */
  resetSession() {
    this.tracker.clear();
    this._resetHeat();
    this._tStart = now();
    this._lastResultSample = 0;
  }

  _resetHeat() {
    this._heat = { version: this._heat.version + 1, field: null };
  }

  _setReference(gray, pts) {
    this.tracker.setReference(gray, pts);
    this._resetHeat();
    this.referenceParticleCount = pts.length;
  }

  _dropReference() {
    this.referenceResets += 1;
    console.warn(`Tracking lost (${this.referenceResets} resets so far) -> re-acquiring reference`);
    this.tracker.clear();
    this._resetHeat();
    this._lastDetect = 0;
  }

  // ------------------------------------------------------------- loop --
  _schedule() {
    const video = this.camera.video;
    if (!this._running || !video) return;
    this._cancel = onNextFrame(video, () => {
      if (!this._running) return;
      try {
        this._process();
      } catch (e) {
        console.error("DIC error:", e);
      }
      this._schedule();
    });
  }

  _process() {
    const cv = this.cv;
    const dicCfg = this.cfg.dic;
    const video = this.camera.video;
    if (!video || !video.videoWidth) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const ctx = this.ctx;
    ctx.drawImage(video, 0, 0, w, h);

    const t = now();
    const dt = Math.max(t - this._lastFrameTime, 1e-6);
    this._lastFrameTime = t;
    const instFps = 1 / dt;
    this._fpsSmooth = this._fpsSmooth === 0 ? instFps : 0.9 * this._fpsSmooth + 0.1 * instFps;

    const rgba = cv.matFromImageData(ctx.getImageData(0, 0, w, h));
    const gray = new cv.Mat();
    cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
    rgba.delete();

    try {
      const warmupS = this.cfg.camera.lockAutofocusAfterStartS + 0.5;

      // ---- (bắt lại) reference: chỉ sau warm-up, có giới hạn tần suất ----
      if (!this.tracker.ready) {
        if (t - this._tCamStart >= warmupS && t - this._lastDetect >= dicCfg.detectIntervalS) {
          this._lastDetect = t;
          let pts = detectWhiteParticles(cv, gray, dicCfg);
          pts = pts.slice(0, dicCfg.maxPoints); // detector đã sắp theo độ mạnh
          this._previewPts = pts;
          if (pts.length >= dicCfg.minRefPoints) this._setReference(gray, pts);
        }
      }

      const stats = {
        state: this.tracker.ready ? "TRACKING" : "WAIT_REF",
        n: 0,
        meanMag: 0,
        maxMag: 0,
        meanU: 0,
        meanV: 0,
        exx: NaN,
        eyy: NaN,
        gxy: NaN,
        fps: rnd(this._fpsSmooth, 1),
        threshold: dicCfg.detectionThreshold,
      };

      if (this.tracker.ready) {
        const result = this.tracker.update(gray);
        const nActive = result === null ? 0 : result.ids.length;
        const minKeep = Math.max(
          dicCfg.minRefPoints,
          Math.trunc(dicCfg.minTrackRatio * this.referenceParticleCount)
        );

        if (nActive < minKeep) {
          this._dropReference(); // mất bám: chọn reference mới
          stats.state = "REACQUIRE";
        } else {
          const { ids, ref, cur: curRaw } = result;
          const { u, v, mag } = displacementComponents(ref, curRaw, this._globalCorr);

          const cur = ref.slice();
          for (let i = 0; i < u.length; i++) {
            cur[2 * i] += u[i];
            cur[2 * i + 1] -= v[i];
          }
          const { exx, eyy, gxy } = estimateGlobalStrain(ref, cur);

          // Heatmap: tính lại mỗi N frame (tốn kém), còn lại dùng cache.
          if (this._frameCounter % Math.max(1, dicCfg.fieldEveryNFrames) === 0) {
            const field = interpolateFields(ref, u, v, dicCfg);
            if (field) this._heat = { version: this._heat.version + 1, field };
          }

          const n = ids.length;
          let sumMag = 0, maxMag = 0, sumU = 0, sumV = 0;
          for (let i = 0; i < n; i++) {
            sumMag += mag[i];
            if (mag[i] > maxMag) maxMag = mag[i];
            sumU += u[i];
            sumV += v[i];
          }
          Object.assign(stats, {
            n,
            meanMag: n ? sumMag / n : 0,
            maxMag: n ? maxMag : 0,
            meanU: n ? sumU / n : 0,
            meanV: n ? sumV / n : 0,
            exx,
            eyy,
            gxy,
          });

          drawTracks(ctx, this.tracker.trails, ids, dicCfg.trailLength);
          drawVectors(ctx, ref, cur, dicCfg.vectorGain);
          drawReferencePoints(ctx, this.tracker.referencePoints);
        }
      } else {
        // Đang chờ reference: hiển thị những gì detector đang thấy.
        stats.n = this._previewPts.length;
        drawReferencePoints(ctx, this._previewPts);
      }

      this._frameCounter += 1;
      const elapsed = t - this._tStart;

      const minWsPeriod = 1 / Math.max(this.cfg.stream.wsTargetFps, 1e-6);
      if (t - this._lastWsEmit >= minWsPeriod) {
        this._lastWsEmit = t;
        this.onMessage({
          type: "frame",
          t: rnd(elapsed, 3),
          camera: { width: w, height: h },
          heat: this._heat,
          dic: {
            state: stats.state,
            n_particles: stats.n,
            reference_particles: this.referenceParticleCount,
            reference_resets: this.referenceResets,
            mean_disp_px: rnd(stats.meanMag, 5),
            max_disp_px: rnd(stats.maxMag, 5),
            mean_u_px: rnd(stats.meanU, 5),
            mean_v_px: rnd(stats.meanV, 5),
            eps_xx: safe(stats.exx),
            eps_yy: safe(stats.eyy),
            gamma_xy: safe(stats.gxy),
            fps: stats.fps,
          },
        });
      }

      if (t - this._lastResultSample >= this.cfg.stream.resultSampleIntervalS) {
        this._lastResultSample = t;
        const scale = dicCfg.scaleMmPerPx || 1.0;
        this.onResult({
          t: rnd(elapsed, 2),
          displacement: rnd(stats.meanMag * scale, 5),
          displacement_unit: dicCfg.scaleMmPerPx ? "mm" : "px",
          eps_xx: safe(stats.exx),
          eps_yy: safe(stats.eyy),
          gamma_xy: safe(stats.gxy),
        });
      }
    } finally {
      gray.delete();
    }
  }
}
