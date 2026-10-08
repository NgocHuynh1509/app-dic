import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiUrl } from "./api.js";
import { useServer } from "./hooks/useServer.js";
import { APP_CONFIG, CAMERA_CONFIG, STREAM_CONFIG } from "./core/config.js";
import { loadOpenCV } from "./core/opencv.js";
import { CameraWorker, listVideoDevices } from "./core/camera.js";
import { DicWorker } from "./core/dicWorker.js";
import ControlPanel from "./components/ControlPanel.jsx";
import HeatmapPanel from "./components/HeatmapPanel.jsx";
import CameraView from "./components/CameraView.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import DispChart from "./components/DispChart.jsx";
import "./ParticleDIC.css";

const CFG = { dic: APP_CONFIG, camera: CAMERA_CONFIG, stream: STREAM_CONFIG };
const MAX_CHART_POINTS = 500;

const PHASES = {
  ready: { text: "Ready", color: "var(--amber)" },
  running: { text: "Running", color: "var(--green)" },
  stopped: { text: "Stopped", color: "var(--red)" },
};

export default function ParticleDIC() {
  const { connected, sensors, sendResult } = useServer();

  const canvasRef = useRef(null);
  const cvRef = useRef(null);
  const cameraRef = useRef(null);
  const workerRef = useRef(null);

  const [cvState, setCvState] = useState("loading"); // loading | ready | error
  const [cvError, setCvError] = useState("");
  const [phase, setPhase] = useState("ready");
  const [busy, setBusy] = useState(false);
  const [dic, setDic] = useState(null);
  const [heat, setHeat] = useState(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [chartKey, setChartKey] = useState(0);
  const [follow, setFollow] = useState(true);
  const [cameraStatus, setCameraStatus] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [notice, setNotice] = useState(null); // { kind: "error" | "info", text }

  const running = phase === "running";

  // ---- nạp OpenCV.js + danh sách camera ----
  useEffect(() => {
    let alive = true;
    loadOpenCV()
      .then((cv) => {
        if (!alive) return;
        cvRef.current = cv;
        setCvState("ready");
      })
      .catch((e) => {
        console.error(e);
        if (alive) {
          setCvError(String(e?.message || e));
          setCvState("error");
        }
      });
    listVideoDevices().then((d) => alive && setDevices(d)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // ---- dọn dẹp khi đóng tab / rời trang ----
  useEffect(() => {
    const onUnload = () => navigator.sendBeacon?.(apiUrl("/api/session/stop"));
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      workerRef.current?.stop();
      cameraRef.current?.stop();
    };
  }, []);

  // ---- số liệu realtime từ DicWorker ----
  const handleMessage = useCallback((msg) => {
    setHasFrame(true);
    setDic(msg.dic);
    setHeat(msg.heat);
    setChartData((prev) => {
      const next = prev.length >= MAX_CHART_POINTS ? prev.slice(1) : prev.slice();
      next.push({ t: msg.t, disp: msg.dic.mean_disp_px });
      return next;
    });
  }, []);

  const showError = (text) => setNotice({ kind: "error", text });

  // ---- điều khiển ----
  const doStart = async () => {
    if (cvState !== "ready") return;
    setBusy(true);
    setNotice(null);
    const camera = new CameraWorker(CAMERA_CONFIG);
    try {
      await api.startSession();
      await camera.start(deviceId || undefined);
      cameraRef.current = camera;
      setCameraStatus({ ...camera.status });
      listVideoDevices().then(setDevices).catch(() => {});

      const worker = new DicWorker({
        cv: cvRef.current,
        camera,
        cfg: CFG,
        canvas: canvasRef.current,
        onMessage: handleMessage,
        onResult: sendResult,
      });
      workerRef.current = worker;
      worker.start();
      setPhase("running");
    } catch (e) {
      camera.stop();
      cameraRef.current = null;
      api.reportError(String(e.message || e)).catch(() => {});
      showError(`Error starting: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const doStop = async () => {
    workerRef.current?.stop();
    workerRef.current = null;
    cameraRef.current?.stop();
    cameraRef.current = null;
    setCameraStatus(null);
    setPhase("stopped");
    api.stopSession().catch(() => {});
  };

  const doReset = async () => {
    try {
      await api.resetSession();
    } catch (e) {
      showError(`Reset lỗi: ${e.message}`);
      return;
    }
    workerRef.current?.resetSession();
    setChartData([]);
    setChartKey((k) => k + 1);
    setFollow(true);
    setHeat(null);
    setPhase("ready");
  };

  const doExport = async () => {
    try {
      const csv = await api.getResultsCsv();
      const rows = csv.split(/\r?\n/).filter(Boolean).length - 1; // trừ dòng tiêu đề
      if (rows < 1) {
        setNotice({ kind: "info", text: "Không có dữ liệu để xuất (No data to export)." });
        return;
      }
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `baocao_test_${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice({ kind: "info", text: `Đã xuất ${rows} dòng: baocao_test_${stamp}.csv` });
    } catch (e) {
      showError(`Lỗi khi xuất file: ${e.message}`);
    }
  };

  const phaseInfo = PHASES[phase];
  const cvText = cvState === "loading" ? "Đang nạp OpenCV…" : cvState === "error" ? "Không nạp được OpenCV" : null;

  return (
    <div className="dic-root">
      <header className="header">
        <div>
          <h1 className="title">Realtime Particle DIC</h1>
          <p className="subtitle">Digital Image Correlation · Test &amp; Recall</p>
        </div>
        <div className="header-status">
          {cvText && (
            <span className="chip warn" title={cvError}>
              {cvText}{cvError ? `: ${cvError}` : ""}
            </span>
          )}
          <span className={`chip ${connected ? "ok" : "warn"}`}>
            Server: {connected ? "đã kết nối" : "mất kết nối"}
          </span>
          <span className="status-dot" style={{ color: phaseInfo.color }}>
            ● {phaseInfo.text}
          </span>
        </div>
      </header>

      {notice && (
        <div className={`notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Đóng thông báo">
            ×
          </button>
        </div>
      )}

      <main className="body">
        <ControlPanel
          busy={busy}
          loading={cvState !== "ready"}
          running={running}
          devices={devices}
          deviceId={deviceId}
          onDeviceChange={setDeviceId}
          onStart={doStart}
          onStop={doStop}
          onReset={doReset}
          onForceUp={() => api.forceIncrease().catch((e) => showError(e.message))}
          onForceDown={() => api.forceDecrease().catch((e) => showError(e.message))}
          onExport={doExport}
        />

        <div className="right-col">
          <HeatmapPanel heat={heat} />
          <div className="mid-row">
            <CameraView canvasRef={canvasRef} live={hasFrame} cameraStatus={cameraStatus} />
            <StatsPanel dic={dic} force={sensors.force} />
          </div>
          <DispChart
            data={chartData}
            follow={follow}
            onFollowChange={setFollow}
            resetKey={chartKey}
          />
        </div>
      </main>
    </div>
  );
}
