// Địa chỉ server Node (server/index.js).
// - Dev web (vite): để rỗng -> dùng proxy /api và /ws trong vite.config.ts
// - Electron bản build (file://): trỏ thẳng tới http://localhost:8000
// - Có thể ép bằng biến môi trường VITE_DIC_SERVER, ví dụ http://192.168.1.10:8000
const ENV_BASE = import.meta.env?.VITE_DIC_SERVER;
export const SERVER_BASE =
  ENV_BASE ?? (typeof location !== "undefined" && location.protocol === "file:" ? "http://localhost:8000" : "");

export const apiUrl = (path) => `${SERVER_BASE}${path}`;
export const wsUrl = (path) => {
  if (SERVER_BASE) return SERVER_BASE.replace(/^http/, "ws") + path;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}${path}`;
};

async function request(path, options) {
  const res = await fetch(apiUrl(path), options);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res;
}

const post = async (path, body) =>
  (
    await request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
  ).json();

export const api = {
  getSession: async () => (await request("/api/session")).json(),
  startSession: () => post("/api/session/start"),
  stopSession: () => post("/api/session/stop"),
  resetSession: () => post("/api/session/reset"),
  reportError: (message) => post("/api/session/error", { message }),
  forceIncrease: () => post("/api/force/increase"),
  forceDecrease: () => post("/api/force/decrease"),
  getResultsCsv: async () => (await request("/api/results/csv")).text(),
};
