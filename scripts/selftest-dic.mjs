// Kiểm tra nhanh lõi DIC trong Node (không cần camera / trình duyệt).
//   npm run dic:selftest
import cvReady from "@techstark/opencv-js";
import { APP_CONFIG } from "../src/components/ParticleDIC/core/config.js";
import { detectWhiteParticles } from "../src/components/ParticleDIC/core/detector.js";
import { ParticleTracker, displacementComponents, estimateGlobalStrain } from "../src/components/ParticleDIC/core/tracker.js";
import { interpolateFields } from "../src/components/ParticleDIC/core/field.js";

const W = 640, H = 480;
let seed = 12345;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());

function render(points) {
  const img = new Uint8Array(W * H);
  for (let i = 0; i < img.length; i++) img[i] = Math.max(0, Math.min(255, 40 + gauss() * 1.5));
  for (const [px, py] of points) {
    for (let y = Math.floor(py) - 4; y <= Math.floor(py) + 4; y++)
      for (let x = Math.floor(px) - 4; x <= Math.floor(px) + 4; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d2 = (x - px) ** 2 + (y - py) ** 2;
        img[y * W + x] = Math.min(255, img[y * W + x] + 160 * Math.exp(-d2 / (2 * 1.0 ** 2)));
      }
  }
  return img;
}

const ok = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${extra}`);
  if (!cond) process.exitCode = 1;
};

const cv = await cvReady;

// Hạt ngẫu nhiên, cách nhau >= 18 px, cách biên >= 30 px.
const pts = [];
while (pts.length < 90) {
  const p = [30 + rand() * (W - 60), 30 + rand() * (H - 60)];
  if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 18)) pts.push(p);
}
// Biến dạng đã biết: exx = 0.01, eyy = 0.02, gxy = 0, kèm tịnh tiến (2, -1) px.
const cx = W / 2, cy = H / 2;
const pts2 = pts.map(([x, y]) => [cx + 1.01 * (x - cx) + 2, cy + 1.02 * (y - cy) - 1]);

const g1 = cv.matFromArray(H, W, cv.CV_8UC1, Array.from(render(pts)));
const g2 = cv.matFromArray(H, W, cv.CV_8UC1, Array.from(render(pts2)));

let t0 = performance.now();
const det = detectWhiteParticles(cv, g1, APP_CONFIG);
console.log(`detect: ${det.length} hạt / ${pts.length} thật, ${(performance.now() - t0).toFixed(0)} ms`);
ok("detector tìm đủ hạt", det.length >= pts.length * 0.95 && det.length <= pts.length * 1.05);

const tr = new ParticleTracker(cv, APP_CONFIG);
tr.setReference(g1, det);
t0 = performance.now();
const res = tr.update(g2);
console.log(`track: ${res?.ids.length} điểm giữ lại, ${(performance.now() - t0).toFixed(0)} ms`);
ok("tracker giữ >= 90% điểm", res && res.ids.length >= det.length * 0.9);

const { u, v, mag } = displacementComponents(res.ref, res.cur);
const cur = res.ref.slice();
for (let i = 0; i < u.length; i++) { cur[2 * i] += u[i]; cur[2 * i + 1] -= v[i]; }
const s = estimateGlobalStrain(res.ref, cur);
console.log("strain:", s);
ok("exx ~ 0.01", Math.abs(s.exx - 0.01) < 1e-3);
ok("eyy ~ 0.02", Math.abs(s.eyy - 0.02) < 1e-3);
ok("gxy ~ 0", Math.abs(s.gxy) < 1e-3);

t0 = performance.now();
const f = interpolateFields(res.ref, u, v, APP_CONFIG);
console.log(`field: ${(performance.now() - t0).toFixed(0)} ms`);
ok("field tạo được", f && f.M.length === APP_CONFIG.gridNx * APP_CONFIG.gridNy);
if (f) {
  const mid = Math.floor(f.ny / 2) * f.nx + Math.floor(f.nx / 2);
  ok("exx trường ~ 0.01 tại tâm", Math.abs(f.exx[mid] - 0.01) < 3e-3, `(${f.exx[mid].toFixed(5)})`);
  ok("eyy trường ~ 0.02 tại tâm", Math.abs(f.eyy[mid] - 0.02) < 3e-3, `(${f.eyy[mid].toFixed(5)})`);
}

const s0 = estimateGlobalStrain(new Float32Array([0, 0, 1, 1]), new Float32Array([0, 0, 1, 1]));
ok("ít hơn 3 điểm -> NaN", Number.isNaN(s0.exx));

tr.clear(); g1.delete(); g2.delete();
console.log(process.exitCode ? "\nCÓ LỖI" : "\nTất cả đều đạt");
process.exit(process.exitCode ?? 0);
