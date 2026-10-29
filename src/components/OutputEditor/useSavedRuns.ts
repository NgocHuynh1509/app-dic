import { useCallback, useEffect, useState } from "react";
import { RUNS_CHANGED_EVENT, dbApi } from "../../hooks/projectApi";
import type { RunDetail, RunSummary } from "../../hooks/projectApi";

export const EMPTY_TEXT = "Chưa có dữ liệu. Hãy đo ở tab H5kT rồi bấm STOP để lưu một lần đo.";

export const dash = (v: number | null | undefined, d = 2) =>
  v == null || !Number.isFinite(v) ? "—" : v.toFixed(d);

export function formatTime(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString("vi-VN");
}

// SVG lưu trong DB hiển thị qua <img> để không bị trùng id giữa các biểu đồ
export const chartSrc = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useSavedRuns() {
  const api = dbApi();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runId, setRunId] = useState<number | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [message, setMessage] = useState("");

  // selectNewest = true: chọn lần đo mới nhất (dùng khi vừa lưu); false: giữ lựa chọn hiện tại nếu còn
  const reload = useCallback(async (selectNewest = false) => {
    if (!api) return;
    try {
      const list = await api.listAllRuns();
      setRuns(list);
      setRunId((cur) =>
        !selectNewest && cur != null && list.some((r) => r.runId === cur) ? cur : list[0]?.runId ?? null);
    } catch (e) {
      setMessage(errText(e));
    }
  }, [api]);

  // Tải lần đầu
  useEffect(() => { void reload(); }, [reload]);

  // Tự cập nhật khi có lần đo mới được lưu hoặc bị xóa
  useEffect(() => {
    const onChanged = () => { void reload(true); };
    window.addEventListener(RUNS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(RUNS_CHANGED_EVENT, onChanged);
  }, [reload]);

  useEffect(() => {
    if (!api || runId == null) { setDetail(null); return; }
    let cancelled = false;
    api.getRunDetail(runId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((e) => { if (!cancelled) setMessage(errText(e)); });
    return () => { cancelled = true; };
  }, [api, runId]);

  const exportPdf = useCallback(async () => {
    if (!api || runId == null) return;
    try {
      const r = await api.exportRunPdf(runId);
      if (r.ok) setMessage(`Đã xuất PDF: ${r.path}`);
      else if (r.error) setMessage(r.error);
    } catch (e) {
      setMessage(errText(e));
    }
  }, [api, runId]);

  const remove = useCallback(async () => {
    if (!api || runId == null) return;
    if (!window.confirm("Xóa lần đo này (gồm dữ liệu đo, kết quả và biểu đồ)?")) return;
    try {
      await api.deleteRun(runId); // phát sự kiện, danh sách tự tải lại
      setMessage("Đã xóa lần đo.");
    } catch (e) {
      setMessage(errText(e));
    }
  }, [api, runId]);

  return { available: !!api, runs, runId, setRunId, detail, message, reload, exportPdf, remove };
}

export type SavedRuns = ReturnType<typeof useSavedRuns>;