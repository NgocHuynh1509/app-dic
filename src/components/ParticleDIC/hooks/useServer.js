import { useCallback, useEffect, useRef, useState } from "react";
import { wsUrl } from "../api.js";

/** Kết nối WebSocket tới server Node: nhận trạng thái phiên + Force/Temperature, gửi mẫu kết quả. */
export function useServer() {
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState(null);
  const [sensors, setSensors] = useState({ force: 0, temperature: 0 });
  const wsRef = useRef(null);

  useEffect(() => {
    let closed = false;
    let retry = null;

    const connect = () => {
      const ws = new WebSocket(wsUrl("/ws"));
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 1500);
      };
      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "session") setSession(msg);
        else if (msg.type === "sensors") setSensors({ force: msg.force, temperature: msg.temperature });
      };
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(retry);
      wsRef.current?.close();
    };
  }, []);

  const sendResult = useCallback((row) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "result", ...row }));
  }, []);

  return { connected, session, sensors, sendResult };
}
