import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import './ParticleDICGate.css';

declare global {
  interface Window {
    dicFeature?: {
      status: () => Promise<{ unlocked: boolean }>;
      activate: (key: string) => Promise<{ ok: boolean; unlocked?: boolean; error?: string }>;
    };
  }
}

export default function ParticleDICGate({ children }: { children: ReactNode }) {
  const api = window.dicFeature;
  const [state, setState] = useState<'checking' | 'locked' | 'unlocked'>(api ? 'checking' : 'locked');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!api) return;
    api.status().then((status) => {
      if (alive) setState(status.unlocked ? 'unlocked' : 'locked');
    }).catch(() => {
      if (alive) {
        setState('locked');
        setError('Không kiểm tra được trạng thái kích hoạt. Vui lòng mở lại ứng dụng.');
      }
    });
    return () => { alive = false; };
  }, [api]);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!api || busy || !key.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.activate(key);
      if (result.ok && result.unlocked) {
        setKey('');
        setState('unlocked');
      } else {
        setError(result.error || 'Không thể mở khóa Particle DIC. Vui lòng thử lại.');
      }
    } catch {
      setError('Không thể mở khóa Particle DIC. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'unlocked') return <>{children}</>;

  return (
    <section className="dic-feature-gate" aria-label="Kích hoạt Particle DIC">
      <div className="dic-feature-gate__card">
        <h1>Particle DIC</h1>
        {state === 'checking' ? <p role="status">Đang kiểm tra kích hoạt…</p> : <>
          <h2>Tính năng đang khóa</h2>
          <p>Nhập key riêng để mở khóa Particle DIC. Kích hoạt được ghi nhớ trên máy này cho những lần sử dụng sau.</p>
          {api ? <form onSubmit={activate}>
            <label htmlFor="particle-dic-key">Key mở khóa Particle DIC</label>
            <input id="particle-dic-key" type="password" value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="PDIC-XXXX-XXXX-XXXX-XXXX" autoComplete="off"
              spellCheck={false} maxLength={128} disabled={busy}
              aria-describedby={error ? 'particle-dic-key-error' : undefined} />
            {error && <p id="particle-dic-key-error" className="dic-feature-gate__error" role="alert">{error}</p>}
            <button type="submit" disabled={busy || !key.trim()}>
              {busy ? 'Đang mở khóa…' : 'Mở khóa Particle DIC'}
            </button>
          </form> : <p role="status">Vui lòng mở bản desktop để nhập key và sử dụng Particle DIC.</p>}
        </>}
      </div>
    </section>
  );
}
