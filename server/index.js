import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";

import { SERVER_CONFIG } from "./config.js";
import { SessionManager } from "./session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cfg = SERVER_CONFIG;
const session = new SessionManager(cfg);

const app = express();
app.use(cors()); // dev-friendly; siết lại khi triển khai thật
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// ------------------------------------------------------------- broadcast --
function broadcast(message) {
  const text = JSON.stringify(message);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(text);
  }
}
const broadcastSession = () => broadcast({ type: "session", ...session.snapshot() });
const broadcastSensors = () => broadcast({ type: "sensors", ...session.sensors() });

setInterval(broadcastSensors, cfg.sensorBroadcastMs);

// ------------------------------------------------------------------ REST --
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/session", (_req, res) => res.json(session.snapshot()));

app.post("/api/session/start", (_req, res) => {
  const snap = session.start();
  broadcastSession();
  res.json(snap);
});

app.post("/api/session/stop", (_req, res) => {
  const snap = session.stop();
  broadcastSession();
  res.json(snap);
});

app.post("/api/session/reset", (_req, res) => {
  const snap = session.reset();
  broadcastSession();
  broadcastSensors();
  res.json(snap);
});

// Trình duyệt báo lỗi mở camera để phiên quay về Idle.
app.post("/api/session/error", (req, res) => {
  const snap = session.setError(String(req.body?.message ?? ""));
  broadcastSession();
  res.json(snap);
});

app.post("/api/force/increase", (_req, res) => {
  const value = session.forceIncrease();
  broadcastSensors();
  res.json({ force: Math.round(value * 1000) / 1000 });
});

app.post("/api/force/decrease", (_req, res) => {
  const value = session.forceDecrease();
  broadcastSensors();
  res.json({ force: Math.round(value * 1000) / 1000 });
});

app.get("/api/results", (_req, res) => res.json({ results: session.getResults() }));

app.get("/api/results/csv", (_req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=results.csv");
  res.send(session.resultsCsv());
});

// ------------------------------------------------------------- websocket --
wss.on("connection", (ws) => {
  console.log(`WS client connected (${wss.clients.size} total)`);
  // Gửi ngay trạng thái hiện tại để giao diện có dữ liệu trước khi frame đầu tiên tới.
  ws.send(JSON.stringify({ type: "session", ...session.snapshot() }));
  ws.send(JSON.stringify({ type: "sensors", ...session.sensors() }));

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg?.type === "result") session.addResult(msg);
  });

  ws.on("close", () => console.log(`WS client disconnected (${wss.clients.size} total)`));
  ws.on("error", (err) => console.error("WS error", err));
});

// Phục vụ bản build của React (npm run build) khi chạy production.
const dist = path.resolve(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Cổng đã có server khác chạy (ví dụ đang chạy `npm run dic:server` riêng): bỏ qua, không làm sập app.
// Lưu ý: WebSocketServer chuyển tiếp lỗi của http server nên cũng cần một listener 'error'.
const onListenError = (err) => {
  if (err?.code === "EADDRINUSE") console.warn(`Cổng ${cfg.port} đang được dùng - giữ server hiện có.`);
  else console.error("Server error", err);
};
server.on("error", onListenError);
wss.on("error", onListenError);

server.listen(cfg.port, () => console.log(`Realtime Particle DIC server: http://localhost:${cfg.port}`));

const shutdown = () => {
  session.stop();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);