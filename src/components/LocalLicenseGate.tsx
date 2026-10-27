import { useEffect, useState, type ReactNode } from 'react';

type LicenseStatus = {
  state: 'none' | 'active' | 'expired' | 'tampered';
  type?: string;
  daysLeft?: number;
  expiresAt?: number;
  reason?: 'clock' | 'file';
};

type ActivateResult = { ok: boolean; error?: string; status?: LicenseStatus };

declare global {
  interface Window {
    localLicense?: {
      status: () => Promise<LicenseStatus>;
      activate: (key: string) => Promise<ActivateResult>;
      onChange: (cb: (st: LicenseStatus) => void) => () => void;
    };
  }
}

const box: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif',
};
const card: React.CSSProperties = {
  width: 420, padding: 28, borderRadius: 12, background: '#1e293b', boxShadow: '0 8px 30px #0006',
};

export default function LocalLicenseGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const api = window.localLicense;

  useEffect(() => {
    if (!api) return;
    api.status().then(setStatus);
    return api.onChange(setStatus);
  }, [api]);

  // Chạy web thuần (npm run dev, không Electron): bỏ qua khoá. Bản build luôn có window.localLicense.
  if (!api) {
    if (import.meta.env.DEV) return <>{children}</>;
    return <div style={box}><div style={card}>Ứng dụng phải chạy trong bản desktop.</div></div>;
  }

  if (!status) return <div style={box}>Đang kiểm tra license…</div>;
  if (status.state === 'active') return <>{children}</>;

  const submit = async () => {
    setBusy(true);
    setErr('');
    const r = await api.activate(key);
    setBusy(false);
    if (r.ok && r.status) setStatus(r.status);
    else setErr(r.error || 'Kích hoạt thất bại.');
  };

  const title =
    status.state === 'expired' ? 'Key đã hết hạn'
    : status.state === 'tampered' ? 'Phát hiện bất thường'
    : 'Kích hoạt ứng dụng';

  return (
    <div style={box}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>

        {status.state === 'tampered' ? (
          <p>
            {status.reason === 'clock'
              ? 'Đồng hồ hệ thống bị chỉnh lùi so với lần dùng gần nhất. Hãy đặt lại đúng ngày giờ rồi mở lại ứng dụng.'
              : 'Dữ liệu license bị chỉnh sửa hoặc hỏng. Vui lòng liên hệ người cấp key.'}
          </p>
        ) : (
          <>
            {status.state === 'expired' && <p>Nhập key mới để tiếp tục sử dụng.</p>}
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !busy && submit()}
              placeholder="D3-XXXX-XXXX-XXXX-XXXX"
              spellCheck={false}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #475569',
                       background: '#0f172a', color: 'inherit', boxSizing: 'border-box' }}
            />
            {err && <p style={{ color: '#f87171' }}>{err}</p>}
            <button
              onClick={submit}
              disabled={busy || !key.trim()}
              style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 8, border: 0,
                       background: '#2563eb', color: '#fff', cursor: 'pointer' }}
            >
              {busy ? 'Đang kiểm tra…' : 'Kích hoạt'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}