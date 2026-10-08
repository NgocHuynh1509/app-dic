// Nạp OpenCV.js (WASM) một lần duy nhất. Nếu lỗi thì cho phép thử lại.
let cvPromise = null;

export function loadOpenCV() {
  if (!cvPromise) {
    cvPromise = import("./opencvModule.js")
      .then((m) => m.getCvReady())
      .then((cv) => {
        // Bản >= 4.11: export mặc định là Promise trả về đối tượng cv.
        if (!cv || typeof cv.Mat !== "function") {
          throw new Error("OpenCV.js đã nạp nhưng thiếu cv.Mat (build không đầy đủ)");
        }
        return cv;
      })
      .catch((err) => {
        cvPromise = null;
        console.error("[OpenCV] nạp thất bại:", err);
        throw err;
      });
  }
  return cvPromise;
}