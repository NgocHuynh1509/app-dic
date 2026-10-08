// Camera trong trình duyệt (getUserMedia). Port từ camera.py.
// Luồng đọc camera do trình duyệt đảm nhiệm; DicWorker luôn lấy frame mới nhất.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Gọi cb khi có frame video mới (requestVideoFrameCallback, dự phòng bằng rAF). */
export function onNextFrame(video, cb) {
  if (typeof video.requestVideoFrameCallback === "function") {
    const h = video.requestVideoFrameCallback((now, meta) => cb(now, meta));
    return () => video.cancelVideoFrameCallback?.(h);
  }
  let last = video.currentTime;
  let raf = 0;
  const tick = (now) => {
    if (video.currentTime !== last) {
      last = video.currentTime;
      cb(now, null);
    } else {
      raf = requestAnimationFrame(tick);
    }
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export async function listVideoDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "videoinput");
}

function measureFps(video, nFrames, warmup = 3, timeoutMs = 4000) {
  return new Promise((resolve) => {
    let count = 0;
    let t0 = 0;
    let cancel = () => {};
    const timer = setTimeout(() => {
      cancel();
      resolve(0);
    }, timeoutMs);
    const step = () => {
      cancel = onNextFrame(video, () => {
        count++;
        if (count === warmup) t0 = performance.now();
        if (count >= warmup + nFrames) {
          clearTimeout(timer);
          const dt = Math.max((performance.now() - t0) / 1000, 1e-6);
          resolve(nFrames / dt);
        } else {
          step();
        }
      });
    };
    step();
  });
}

export const emptyCameraStatus = () => ({
  connected: false,
  backendName: "",
  source: "",
  width: 0,
  height: 0,
  requestedMode: "",
  measuredFps: 0,
  error: "",
});

export class CameraWorker {
  constructor(cfg) {
    this.cfg = cfg;
    this.stream = null;
    this.video = null;
    this.status = emptyCameraStatus();
    this._focusTimer = null;
  }

  async _openStream(deviceId, width, height, fps) {
    const video = {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: fps },
    };
    if (deviceId) video.deviceId = { exact: deviceId };
    return navigator.mediaDevices.getUserMedia({ video, audio: false });
  }

  _attach(stream) {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.srcObject = stream;
    return v;
  }

  async _waitFirstFrame(video) {
    for (let i = 0; i < Math.max(1, this.cfg.openReadRetries); i++) {
      if (video.videoWidth > 0 && video.readyState >= 2) return true;
      await sleep(50);
    }
    return false;
  }

  /** Mở camera: thử chế độ ưu tiên, nếu không đủ FPS thì hạ xuống chế độ dự phòng. */
  async open(deviceId) {
    const cfg = this.cfg;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.status = { ...emptyCameraStatus(), error: "Trình duyệt không hỗ trợ camera (cần HTTPS hoặc localhost)." };
      return this.status;
    }

    try {
      // Cấp quyền trước để enumerateDevices trả về deviceId và nhãn đầy đủ.
      const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      probe.getTracks().forEach((t) => t.stop());
    } catch (e) {
      this.status = {
        ...emptyCameraStatus(),
        error: `Không mở được camera (kiểm tra quyền Camera của trình duyệt / app khác đang dùng camera): ${e.name || e.message}`,
      };
      return this.status;
    }

    const devices = await listVideoDevices();
    let chosen = deviceId || devices[parseInt(cfg.source, 10)]?.deviceId || devices[0]?.deviceId;

    const modes = [[cfg.preferredWidth, cfg.preferredHeight, cfg.preferredFps, "preferred"]];
    if (cfg.fallbackWidth !== cfg.preferredWidth || cfg.fallbackHeight !== cfg.preferredHeight) {
      modes.push([cfg.fallbackWidth, cfg.fallbackHeight, cfg.fallbackFps, "fallback"]);
    }

    const tried = [];
    for (let mi = 0; mi < modes.length; mi++) {
      const [w, h, fps, label] = modes[mi];
      let stream = null;
      try {
        stream = await this._openStream(chosen, w, h, fps);
      } catch (e) {
        tried.push(`${w}x${h}:${e.name}`);
        await sleep(cfg.reopenDelayS * 1000);
        continue;
      }

      const video = this._attach(stream);
      try {
        await video.play();
      } catch {
        /* sẽ được kiểm tra bằng frame đầu tiên */
      }
      if (!(await this._waitFirstFrame(video))) {
        stream.getTracks().forEach((t) => t.stop());
        tried.push(`${w}x${h}:no-frame`);
        continue;
      }

      const measured = await measureFps(video, cfg.fpsProbeFrames);
      const isLast = mi === modes.length - 1;
      if (!isLast && measured < cfg.minAcceptableFps) {
        stream.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
        await sleep(cfg.reopenDelayS * 1000); // chờ thiết bị được giải phóng
        continue;
      }

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings?.() || {};
      this.stream = stream;
      this.video = video;
      track.addEventListener("ended", () => {
        this.status = { ...this.status, error: "Mất tín hiệu camera" };
      });
      this.status = {
        connected: true,
        backendName: "getUserMedia",
        source: track.label || String(chosen || ""),
        width: video.videoWidth || settings.width || w,
        height: video.videoHeight || settings.height || h,
        requestedMode: label,
        measuredFps: Math.round(measured * 10) / 10,
        error: "",
      };
      return this.status;
    }

    this.status = {
      ...emptyCameraStatus(),
      error:
        "Không mở được camera (kiểm tra app khác đang dùng camera / quyền Camera). Đã thử: " +
        tried.slice(0, 12).join("; "),
    };
    return this.status;
  }

  /** Bắt đầu: mở nếu chưa mở, rồi khoá autofocus sau vài giây. */
  async start(deviceId) {
    if (!this.stream) await this.open(deviceId);
    if (!this.status.connected) throw new Error(`Camera not connected: ${this.status.error}`);

    const track = this.stream.getVideoTracks()[0];
    this._focusTimer = setTimeout(async () => {
      try {
        await track.applyConstraints({ advanced: [{ focusMode: "manual" }] });
      } catch {
        /* camera không hỗ trợ khoá lấy nét */
      }
    }, this.cfg.lockAutofocusAfterStartS * 1000);
  }

  stop() {
    clearTimeout(this._focusTimer);
    this._focusTimer = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.video) this.video.srcObject = null;
    this.stream = null;
    this.video = null;
    this.status = emptyCameraStatus();
  }
}
