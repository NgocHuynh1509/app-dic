import { useCallback, useEffect, useRef, useState } from "react";

export interface StrainSample {
  t: number;
  deviceMs: number;
  raw: number;
  delta: number; // đã nhân sign
  filtered: number; // đã nhân sign
  strain: number | null;
  factor: number;
  sign: 1 | -1; // -1 = đã đảo chiều
}

export type StrainRow = StrainSample & { hostTime: string };

export interface StrainStatus {
  state: "idle" | "trying" | "connected" | "disconnected" | "not_found" | "no_ports";
  port?: string;
  detail?: string;
}

export interface StrainStats {
  minDelta: number | null;
  maxDelta: number | null;
  count: number; // số mẫu đã ghi (chỉ đếm khi đang recording)
}

interface StrainAPI {
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  send: (cmd: string) => Promise<boolean>;
  onEvent: (cb: (msg: { type: string; payload: any }) => void) => () => void;
}

declare global {
  interface Window {
    strainAPI?: StrainAPI;
  }
}

export const PLOT_WINDOW_SECONDS = 30;
const RENDER_INTERVAL_MS = 50; // ~20 lần vẽ/giây

export const CSV_COLUMNS = [
  "host_time",
  "device_ms",
  "elapsed_s",
  "hx711_raw",
  "delta_raw",
  "filtered_delta",
  "strain_ue",
  "calibration_ue_per_count",
  "sign",
] as const;

export function rowToCells(r: StrainRow): (string | number)[] {
  return [r.hostTime, r.deviceMs, r.t, r.raw, r.delta, r.filtered, r.strain ?? "", r.factor, r.sign];
}

interface Options {
  factor?: number;
  invert?: boolean;
}

export function useStrainSerial({ factor = 0, invert = true }: Options = {}) {
  const api = typeof window !== "undefined" ? window.strainAPI : undefined;

  const [status, setStatus] = useState<StrainStatus>({ state: "idle" });
  const [hxReady, setHxReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  const factorRef = useRef(factor);
  const invertRef = useRef(invert);
  const recordingRef = useRef(false);
  const dirtyRef = useRef(false);

  const latestRef = useRef<StrainSample | null>(null);
  const statsRef = useRef<StrainStats>({ minDelta: null, maxDelta: null, count: 0 });
  const rowsRef = useRef<StrainRow[]>([]);
  const seriesRef = useRef<StrainSample[]>([]);

  useEffect(() => { factorRef.current = factor; }, [factor]);
  useEffect(() => { invertRef.current = invert; }, [invert]);

  const resetSession = useCallback(() => {
    latestRef.current = null;
    statsRef.current = { minDelta: null, maxDelta: null, count: 0 };
    rowsRef.current = [];
    seriesRef.current = [];
    dirtyRef.current = true;
  }, []);

  useEffect(() => {
    if (!api) return;

    const off = api.onEvent(({ type, payload }) => {
      if (type === "status") {
        setStatus(payload);
        if (payload.state === "disconnected") {
          recordingRef.current = false;
          setRecording(false);
          setHxReady(false);
        }
      } else if (type === "hx") {
        setHxReady(payload.ready);
      } else if (type === "log") {
        setLogs((l) => [...l.slice(-199), String(payload)]);
      } else if (type === "data") {
        const f = factorRef.current;
        const sign: 1 | -1 = invertRef.current ? -1 : 1;
        const delta = sign * payload.delta;
        const filtered = sign * payload.filtered;
        const s: StrainSample = {
          t: payload.t,
          deviceMs: payload.deviceMs,
          raw: payload.raw,
          delta,
          filtered,
          strain: f === 0 ? null : filtered * f,
          factor: f,
          sign,
        };

        const st = statsRef.current;
        st.minDelta = st.minDelta === null ? delta : Math.min(st.minDelta, delta);
        st.maxDelta = st.maxDelta === null ? delta : Math.max(st.maxDelta, delta);

        if (recordingRef.current) {
          rowsRef.current.push({ ...s, hostTime: new Date().toISOString() });
          st.count = rowsRef.current.length;
        }

        const series = seriesRef.current;
        series.push(s);
        const cutoff = s.t - PLOT_WINDOW_SECONDS;
        let drop = 0;
        while (drop < series.length && series[drop].t < cutoff) drop++;
        if (drop > 0) series.splice(0, drop);

        latestRef.current = s;
        dirtyRef.current = true;
      }
    });

    const timer = setInterval(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setTick((n) => n + 1);
      }
    }, RENDER_INTERVAL_MS);

    api.connect();
    return () => {
      off();
      clearInterval(timer);
      api.disconnect();
    };
  }, [api]);

  const zero = useCallback(() => { api?.send("ZERO"); }, [api]);

  const start = useCallback(() => {
    resetSession();
    recordingRef.current = true;
    setRecording(true);
    api?.send("START");
  }, [api, resetSession]);

  const stop = useCallback(() => {
    recordingRef.current = false;
    setRecording(false);
    api?.send("STOP");
  }, [api]);

  const clear = useCallback(() => {
    if (recordingRef.current) return;
    resetSession();
  }, [resetSession]);

  const exportCsv = useCallback(() => {
    if (!rowsRef.current.length) return;
    const body = rowsRef.current.map((r) => rowToCells(r).join(","));
    const blob = new Blob(["\ufeff" + [CSV_COLUMNS.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `strain_hx711_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  return {
    available: !!api,
    status,
    connected: status.state === "connected",
    hxReady,
    recording,
    logs,
    tick,
    latest: latestRef.current,
    stats: statsRef.current,
    seriesRef,
    rowsRef,
    zero,
    start,
    stop,
    clear,
    exportCsv,
  };
}