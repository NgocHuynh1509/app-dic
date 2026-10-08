// Cấu hình DIC. Giá trị detection giữ nguyên theo logic mẫu ban đầu.
export const APP_CONFIG = {
  // Detection (logic mẫu)
  blurSigma: 2.0,
  detectionThreshold: 12.0,
  minArea: 2,
  maxArea: 30,
  minDistance: 3.0,
  borderMargin: 4,

  // Chọn / khôi phục reference
  maxPoints: 400, // giữ N điểm mạnh nhất
  minRefPoints: 15, // cần tối thiểu số này để đặt reference
  minTrackRatio: 0.3, // active < ratio * reference_count -> bắt lại reference
  detectIntervalS: 0.5, // tần suất detect khi đang chờ reference

  // Lucas-Kanade optical flow
  lkWinSize: 15,
  lkMaxLevel: 3,
  fbErrorMax: 1.0,
  lkErrorMax: 30.0,
  maxStepPx: 40.0, // chuyển động tối đa hợp lý giữa 2 frame

  // Field / strain
  gridNx: 90,
  gridNy: 60,
  fieldEveryNFrames: 3,
  fieldSmoothSigma: 1.2,
  minPointsForField: 8,

  // Hiển thị
  vectorGain: 1.0,
  trailLength: 30,
  graphHistory: 300,

  // Hiệu chuẩn vật lý (tuỳ chọn)
  scaleMmPerPx: null,
};

export const CAMERA_CONFIG = {
  // Chỉ số thiết bị video trong danh sách trình duyệt trả về (thứ tự có thể khác OpenCV).
  source: "0",

  preferredWidth: 1920,
  preferredHeight: 1080,
  preferredFps: 30,

  fallbackWidth: 1280,
  fallbackHeight: 720,
  fallbackFps: 30,

  minAcceptableFps: 18,
  fpsProbeFrames: 20,

  openReadRetries: 20, // số lần chờ frame đầu tiên sau khi mở
  reopenDelayS: 0.4,

  lockAutofocusAfterStartS: 2.0,
};

export const STREAM_CONFIG = {
  wsTargetFps: 20, // tần suất đẩy số liệu lên giao diện
  resultSampleIntervalS: 1.0,
};
