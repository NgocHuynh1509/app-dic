import { useCallback, useEffect, useRef, useState } from "react";
import { StrainSession, CSV_COLUMNS, rowToCells } from "./strainSession";
import type { DeviceFrame, StrainSample, StrainStats } from "./strainSession";
import type { LengthCalibration } from "./strainLengthCalibration";
export { CSV_COLUMNS, rowToCells, PLOT_WINDOW_SECONDS } from "./strainSession";
export type { StrainSample, StrainRow, StrainStats } from "./strainSession";

export interface StrainStatus {
  state: "idle" | "trying" | "connected" | "disconnected" | "not_found" | "no_ports";
  port?: string;
  detail?: string;
  channelCount?: 1 | 3;
}

interface StrainAPI {
  setChannels: (enabled: readonly boolean[]) => Promise<boolean>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  send: (cmd: string) => Promise<boolean>;
  onEvent: (cb: (msg: { type: string; payload: any }) => void) => () => void;
}

declare global {
  interface Window { strainAPI?: StrainAPI }
}

interface Options {
  lengthCalibrations: readonly (LengthCalibration | null)[];
  enabledChannels: readonly boolean[];
  factors: readonly number[];
  invert?: boolean | readonly boolean[];
}

interface SessionView {
  latest: (StrainSample | null)[];
  stats: StrainStats[];
  frameCount: number;
}

function viewOf(session: StrainSession): SessionView {
  return { latest: session.latest.slice(), stats: session.stats.map((s) => ({ ...s })), frameCount: session.frameCount };
}

export function useStrainSerial({ factors, enabledChannels, lengthCalibrations, invert = true }: Options) {
  const api = typeof window !== "undefined" ? window.strainAPI : undefined;
  const [session] = useState(() => new StrainSession());
  const [view, setView] = useState(() => viewOf(session));
  const [status, setStatus] = useState<StrainStatus>({ state: "idle" });
  const [hxStates, setHxStates] = useState<boolean[]>([]);
  const [channelCount, setChannelCount] = useState<1 | 3>(1);
  const [recording, setRecording] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const factorRef = useRef(factors);
  const invertRef = useRef(invert);
  const recordingRef = useRef(false);
  const dirtyRef = useRef(false);
  const seriesRef = useRef(session.series);
  const rowsRef = useRef(session.rows);

  useEffect(() => { factorRef.current = factors; }, [factors]);
  useEffect(() => { invertRef.current = invert; }, [invert]);
  useEffect(() => {
    session.setLengthCalibrations(lengthCalibrations);
    dirtyRef.current = true;
  }, [session, lengthCalibrations]);

  useEffect(() => {
    session.setEnabledChannels(enabledChannels);
    dirtyRef.current = true;
    // Vite can hot-reload this hook before the desktop preload is restarted.
    if (!api || typeof api.setChannels !== "function") return;
    api.setChannels(enabledChannels).catch(() => {
      setLogs((old) => [...old.slice(-199), 'Không cập nhật được kênh. Hãy khởi động lại bản desktop.']);
    });
  }, [api, session, enabledChannels]);

  const resetSession = useCallback(() => {
    session.reset();
    setView(viewOf(session));
    // The table redraws every fourth tick; resets must invalidate it immediately.
    setTick((n) => n + 4);
    dirtyRef.current = true;
  }, [session]);

  useEffect(() => {
    if (!api) return;
    const stopRecording = () => {
      recordingRef.current = false;
      setRecording(false);
    };
    const off = api.onEvent(({ type, payload }) => {
      if (type === "status") {
        setStatus(payload);
        if (payload.state === "connected") {
          stopRecording();
          setHxStates([]);
          setChannelCount(payload.channelCount ?? 1);
          session.suspend();
        } else if (payload.state === "disconnected") {
          stopRecording();
          setHxStates([]);
          session.suspend();
        }
      } else if (type === "reset") {
        stopRecording();
        setHxStates([]);
        session.suspend();
        setLogs((l) => [...l.slice(-199), "ESP32 đã khởi động lại. Bấm START để đo phiên mới."]);
      } else if (type === "hx") {
        setHxStates(payload.channels ?? [payload.ready]);
      } else if (type === "log") {
        setLogs((l) => [...l.slice(-199), String(payload)]);
      } else if (type === "data") {
        session.append(payload as DeviceFrame, {
          factors: factorRef.current, invert: invertRef.current, recording: recordingRef.current,
        });
        dirtyRef.current = true;
      }
    });
    const timer = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setView(viewOf(session));
      setTick((n) => n + 1);
    }, 50);
    api.connect().catch(() => setStatus({ state: "disconnected", detail: "Không mở được cổng Serial." }));
    return () => {
      off();
      clearInterval(timer);
      api.disconnect().catch(() => {});
    };
  }, [api, session, resetSession]);

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
    if (!recordingRef.current) resetSession();
  }, [resetSession]);
  const exportCsv = useCallback(() => {
    if (!session.rows.length) return;
    const body = session.rows.map((row) => rowToCells(row).join(","));
    const blob = new Blob(["\ufeff" + [CSV_COLUMNS.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `strain_hx711_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [session]);

  return {
    available: !!api, status, connected: status.state === "connected",
    channelCount, hxStates, hxReady: hxStates.length > 0 && hxStates.every(Boolean),
    recording, logs, tick, latest: view.latest, stats: view.stats, frameCount: view.frameCount,
    seriesRef, rowsRef, zero, start, stop, clear, exportCsv,
  };
}
