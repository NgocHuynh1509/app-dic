const Database = require('better-sqlite3')
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

let db = null

const CHANNEL_COLORS = ['#d32f2f', '#1565c0', '#000000']

const esc = (v) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const dash = (v, d = 2) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(d))
const optNum = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

// ---------- Vẽ biểu đồ σ–ε dạng SVG ----------
function niceStep(range, ticks = 6) {
  const raw = range / ticks
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return f * mag
}
const fmtTick = (v) => Number(v.toFixed(6)).toString()

// series: [{ label, tag, color, pts: [{ x, y }] }]
function svgChart(title, series) {
  const W = 640, H = 360, L = 66, R = 24, T = 44, B = 50
  const pw = W - L - R, ph = H - T - B
  let xMax = 0, yMax = 0
  for (const s of series) for (const p of s.pts) { if (p.x > xMax) xMax = p.x; if (p.y > yMax) yMax = p.y }
  if (!(xMax > 0)) xMax = 1
  if (!(yMax > 0)) yMax = 1
  const xs = niceStep(xMax), ys = niceStep(yMax)
  xMax = Math.ceil(xMax / xs - 1e-9) * xs
  yMax = Math.ceil(yMax / ys - 1e-9) * ys
  const px = (x) => L + (x / xMax) * pw
  const py = (y) => T + ph - (y / yMax) * ph

  let grid = ''
  for (let v = 0; v <= xMax + xs * 1e-6; v += xs) {
    const x = px(v).toFixed(1)
    grid += `<line x1="${x}" y1="${T}" x2="${x}" y2="${T + ph}" stroke="#ddd"/>`
    grid += `<text x="${x}" y="${T + ph + 16}" text-anchor="middle" font-size="11">${fmtTick(v)}</text>`
  }
  for (let v = 0; v <= yMax + ys * 1e-6; v += ys) {
    const y = py(v).toFixed(1)
    grid += `<line x1="${L}" y1="${y}" x2="${L + pw}" y2="${y}" stroke="#ddd"/>`
    grid += `<text x="${L - 6}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="11">${fmtTick(v)}</text>`
  }

  let curves = '', tags = ''
  for (const s of series) {
    const step = Math.max(1, Math.ceil(s.pts.length / 600))
    const pts = s.pts.filter((_, i) => i % step === 0 || i === s.pts.length - 1)
    curves += `<polyline fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linejoin="round" points="${pts.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')}"/>`
    const last = s.pts[s.pts.length - 1]
    tags += `<text x="${Math.min(px(last.x) + 4, W - 8).toFixed(1)}" y="${Math.max(py(last.y) - 4, T + 10).toFixed(1)}" font-size="12" font-weight="bold" fill="${s.color}">${esc(s.tag)}</text>`
  }

  const legend = series.length > 1
    ? series.map((s, i) => `<line x1="${L + i * 150}" y1="34" x2="${L + i * 150 + 18}" y2="34" stroke="${s.color}" stroke-width="2"/>` +
        `<text x="${L + i * 150 + 24}" y="34" dominant-baseline="middle" font-size="11">${esc(s.label)}</text>`).join('')
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" font-family="Arial, sans-serif">` +
    `<rect width="${W}" height="${H}" fill="#fff"/>` +
    `<defs><clipPath id="clip"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath></defs>` +
    `<text x="${W / 2}" y="16" text-anchor="middle" font-size="13" font-weight="bold">${esc(title)}</text>` +
    legend + grid +
    `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="#000"/>` +
    `<g clip-path="url(#clip)">${curves}</g>${tags}` +
    `<text x="${L + pw / 2}" y="${H - 8}" text-anchor="middle" font-size="12" font-weight="bold">Biến dạng ε = ΔL/Lo (%)</text>` +
    `<text transform="translate(14 ${T + ph / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="bold">Ứng suất σ (MPa)</text>` +
    `</svg>`
}

// ---------- Tính kết quả kéo ----------
// dim = { t, b, l0, lu }
// pts = [{ f (kN), sigma (MPa), eps (mm/mm = ΔL/Lo, hoặc null nếu chưa có độ dài hiệu chuẩn) }]
function computeTensile(dim, pts) {
  const s0 = dim.t * dim.b
  const out = { s0, fm: null, rm: null, rel: null, fel: null, modulus: null, aPct: null }
  if (dim.lu != null && dim.l0 > 0) out.aPct = ((dim.lu - dim.l0) / dim.l0) * 100
  if (!(s0 > 0)) return out

  // Fm, Rm chỉ cần lực, không phụ thuộc ε
  const withForce = pts.filter((p) => p.f != null)
  if (!withForce.length) return out
  out.fm = Math.max(...withForce.map((p) => p.f)) // kN
  out.rm = (out.fm * 1000) / s0                    // MPa

  // M và ReL cần ε
  const ec = pts.filter((p) => p.f != null && p.eps != null)
  if (ec.length < 2) return out
  let iMax = 0
  ec.forEach((p, i) => { if (p.f > ec[iMax].f) iMax = i })

  // M = (σ2 − σ1)/(ε2 − ε1), σ1 = 10% Rm, σ2 = 40% Rm (nội suy trên đoạn tăng tải)
  const epsAt = (target) => {
    for (let i = 1; i <= iMax; i++) {
      const a = ec[i - 1], b = ec[i]
      if (b.sigma > a.sigma && a.sigma <= target && b.sigma >= target) {
        return a.eps + ((b.eps - a.eps) * (target - a.sigma)) / (b.sigma - a.sigma)
      }
    }
    return null
  }
  const s1 = 0.1 * out.rm, s2 = 0.4 * out.rm
  const e1 = epsAt(s1), e2 = epsAt(s2)
  if (e1 != null && e2 != null && e2 !== e1) out.modulus = (s2 - s1) / (e2 - e1)

  // ReL theo giới hạn chảy quy ước Rp0.2
  if (out.modulus != null && out.modulus > 0) {
    const g = (p) => p.sigma - out.modulus * (p.eps - 0.002)
    for (let i = 1; i <= iMax; i++) {
      const g0 = g(ec[i - 1]), g1 = g(ec[i])
      if (g0 > 0 && g1 <= 0) {
        const k = g0 / (g0 - g1)
        out.rel = ec[i - 1].sigma + k * (ec[i].sigma - ec[i - 1].sigma)
        out.fel = (out.rel * s0) / 1000
        break
      }
    }
  }
  return out
}

// ---------- Tính kết quả uốn 3 điểm (ISO 178 / ASTM D790) ----------
// h = chiều dày t, b = chiều rộng, L = khoảng cách 2 gối tựa (mm); pts = [{ f (N), s (mm) }]
function computeBending(h, b, L, pts) {
  const out = {
    maxForce: null, deformAtMax: null, flexuralStrength: null, tangentModulus: null, chordModulus: null,
    breakForce: null, deformAtBreak: null, stressAtBreak: null, strainAtBreakPct: null,
  }
  if (!(h > 0 && b > 0 && L > 0) || pts.length < 2) return out

  const sigma = (f) => (3 * f * L) / (2 * b * h * h)
  const eps = (s) => (6 * s * h) / (L * L)

  let iMax = 0
  pts.forEach((p, i) => { if (p.f > pts[iMax].f) iMax = i })
  out.maxForce = pts[iMax].f
  out.deformAtMax = pts[iMax].s
  out.flexuralStrength = sigma(pts[iMax].f)

  // Điểm phá hoại = điểm cuối của phiên đo
  const last = pts[pts.length - 1]
  out.breakForce = last.f
  out.deformAtBreak = last.s
  out.stressAtBreak = sigma(last.f)
  out.strainAtBreakPct = eps(last.s) * 100

  // Chord modulus: nội suy σ tại ε = 0.0005 và 0.0025 trên đoạn tăng tải
  const stressAt = (target) => {
    for (let i = 1; i <= iMax; i++) {
      const e0 = eps(pts[i - 1].s), e1 = eps(pts[i].s)
      if (e1 > e0 && e0 <= target && e1 >= target) {
        const s0 = sigma(pts[i - 1].f), s1 = sigma(pts[i].f)
        return s0 + ((s1 - s0) * (target - e0)) / (e1 - e0)
      }
    }
    return null
  }
  const s1 = stressAt(0.0005), s2 = stressAt(0.0025)
  if (s1 != null && s2 != null) out.chordModulus = (s2 - s1) / (0.0025 - 0.0005)

  // Tangent modulus: độ dốc F–s lớn nhất (hồi quy tuyến tính cửa sổ trượt) trên đoạn tăng tải
  const n = Math.max(5, Math.floor(iMax * 0.1))
  let m = null
  for (let i = 0; i + n <= iMax + 1; i++) {
    let sx = 0, sy = 0, sxx = 0, sxy = 0
    for (let j = i; j < i + n; j++) {
      const x = pts[j].s, y = pts[j].f
      sx += x; sy += y; sxx += x * x; sxy += x * y
    }
    const den = n * sxx - sx * sx
    if (Math.abs(den) < 1e-12) continue
    const slope = (n * sxy - sx * sy) / den
    if (slope > 0 && (m == null || slope > m)) m = slope
  }
  if (m != null) out.tangentModulus = (L * L * L * m) / (4 * b * h * h * h)

  return out
}

// ---------- DB helpers ----------
function addColumn(table, col, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`)
}

function listPorts(specimenId) {
  return db.prepare('SELECT port, t, b, l0, lu, bu FROM specimen_ports WHERE specimen_id = ? ORDER BY port').all(specimenId)
}

const setupOf = (row) => ({
  sampleLength: row?.sample_length ?? null,
  supportSpan: row?.support_span ?? null,
  loadPointPos: row?.load_point_pos ?? null,
  bearingDia: row?.bearing_dia ?? null,
  loadDia: row?.load_dia ?? null,
  weightG: row?.weight_g ?? null,
})

function specimenInfo(row) {
  const runCount = db.prepare('SELECT COUNT(*) AS n FROM runs WHERE specimen_id = ?').get(row.id).n
  return {
    id: row.id, projectId: row.project_id, name: row.name, createdAt: row.created_at,
    setup: setupOf(row), ports: listPorts(row.id), runCount,
  }
}

const RUN_SELECT = `
  SELECT r.id AS runId, r.started_at AS startedAt, r.row_count AS rowCount,
         s.id AS specimenId, s.name AS specimenName, p.name AS projectName
  FROM runs r JOIN specimens s ON s.id = r.specimen_id JOIN projects p ON p.id = s.project_id`

function buildPdfHtml(runId) {
  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId)
  if (!run) return null
  const sp = db.prepare('SELECT * FROM specimens WHERE id = ?').get(run.specimen_id)
  if (!sp) return null
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(sp.project_id)

  const ports = listPorts(sp.id)
  const results = db.prepare('SELECT * FROM run_results WHERE run_id = ? ORDER BY port').all(run.id)
  const byPort = Object.fromEntries(results.map((r) => [r.port, r]))
  const charts = Object.fromEntries(
    db.prepare('SELECT port, svg FROM run_charts WHERE run_id = ?').all(run.id).map((c) => [c.port, c.svg]))
  const diag = Object.fromEntries(db.prepare(`
    SELECT channel, COUNT(*) n, COUNT(force_kn) nf, COUNT(strain_len) nl
    FROM measurements WHERE run_id = ? AND enabled = 1 GROUP BY channel`).all(run.id).map((d) => [d.channel, d]))

  const shown = ports.filter((p) => byPort[p.port])
  const rowsPorts = shown.length ? shown : ports

  // Ghi rõ lý do khi không có biểu đồ
  const reason = (port) => {
    const d = diag[port]
    if (!d) return `Kênh HX${port} không được bật khi đo.`
    if (!d.nf) return 'Không có dữ liệu lực. Kiểm tra strainSession.ts đã có forceKn và app đã chạy lại.'
    if (!d.nl) return `HX${port} chưa có độ dài (mm) để tính ε = ΔL/Lo. Hiệu chuẩn 2 điểm (SET 1, SET 2) ở panel Hiệu chuẩn thủ công rồi đo lại.`
    return 'Chưa đủ điểm dữ liệu để vẽ biểu đồ.'
  }
  const noChart = (text) => `<div class="nochart">${esc(text)}</div>`

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
    body{font-family:"Segoe UI",Arial,sans-serif;font-size:11px;color:#111;margin:0}
    h1{font-size:18px;margin:0 0 6px;text-align:center} h2{font-size:13px;margin:14px 0 6px}
    table{border-collapse:collapse;width:100%;margin-bottom:10px} th,td{border:1px solid #666;padding:4px 6px;text-align:center}
    th{background:#eee} .meta{margin:2px 0}
    .chart{page-break-inside:avoid;margin:8px 0} .nochart{border:1px dashed #999;padding:30px;text-align:center;color:#666}
  </style></head><body>
    <h1>Composite materials – Tensile testing sheet</h1>
    <div class="meta"><b>Project:</b> ${esc(project?.name)} · <b>Mẫu:</b> ${esc(sp.name)} · <b>Thời gian đo:</b> ${esc(run.started_at)}</div>

    <table style="margin-top:10px"><thead><tr>
      <th>ID</th><th>Lu<br>mm</th><th>ReL<br>MPa</th><th>Fm<br>kN</th><th>Rm<br>MPa</th>
    </tr></thead><tbody>
    ${rowsPorts.map((p) => { const r = byPort[p.port]; return `<tr><td>NO.${p.port}</td><td>${dash(p.lu, 2)}</td><td>${dash(r?.rel_mpa, 0)}</td><td>${dash(r?.fm_kn, 2)}</td><td>${dash(r?.rm_mpa, 0)}</td></tr>` }).join('')}
    </tbody></table>

    <table><thead><tr>
      <th>ID</th><th>M<br>N/mm²</th><th>S0<br>mm²</th><th>t<br>mm</th><th>b<br>mm</th><th>bu<br>mm</th><th>Lo<br>mm</th>
    </tr></thead><tbody>
    ${rowsPorts.map((p) => { const r = byPort[p.port]; return `<tr><td>NO.${p.port}</td><td>${dash(r?.modulus_mpa, 0)}</td><td>${dash(p.t * p.b, 2)}</td><td>${dash(p.t, 2)}</td><td>${dash(p.b, 2)}</td><td>${dash(p.bu, 2)}</td><td>${dash(p.l0, 2)}</td></tr>` }).join('')}
    </tbody></table>

    <h2>Biểu đồ chung các cổng</h2>
    <div class="chart">${charts[0] ?? noChart('Chưa có cổng nào đủ dữ liệu. Xem lý do ở từng biểu đồ bên dưới.')}</div>

    ${[1, 2, 3].map((n) => `<h2>Biểu đồ NO.${n} (HX${n})</h2><div class="chart">${charts[n] ?? noChart(reason(n))}</div>`).join('')}
  </body></html>`
}

async function exportRunPdf(e, runId) {
  const html = buildPdfHtml(runId)
  if (!html) return { ok: false, error: 'Lần đo không tồn tại.' }
  const info = db.prepare('SELECT s.name FROM runs r JOIN specimens s ON s.id = r.specimen_id WHERE r.id = ?').get(runId)
  const parent = BrowserWindow.fromWebContents(e.sender) ?? undefined
  const target = await dialog.showSaveDialog(parent, {
    defaultPath: `${String(info?.name ?? 'bao_cao').replace(/[\\/:*?"<>|]/g, '_')}_${Date.now()}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (target.canceled || !target.filePath) return { ok: false, error: '' }
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false },
  })
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    const pdf = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true })
    fs.writeFileSync(target.filePath, pdf)
    return { ok: true, path: target.filePath }
  } finally {
    win.destroy()
  }
}

/**
 * @param {{ allow: (e: Electron.IpcMainInvokeEvent) => boolean }} opts
 */
function initDatabase({ allow }) {
  if (db) return
  db = new Database(path.join(app.getPath('userData'), 'strain.sqlite'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS specimens (
      id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS specimen_ports (
      specimen_id INTEGER NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
      port INTEGER NOT NULL CHECK (port BETWEEN 1 AND 3),
      t REAL NOT NULL, b REAL NOT NULL, l0 REAL NOT NULL, lu REAL, bu REAL, PRIMARY KEY (specimen_id, port));
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, specimen_id INTEGER NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL, row_count INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      host_time TEXT, device_ms INTEGER, elapsed_s REAL, raw REAL, delta REAL, filtered REAL,
      strain REAL, factor REAL, baseline REAL, sign INTEGER, channel INTEGER, sample_index INTEGER,
      enabled INTEGER, length_mm REAL, length_signal REAL, force_kn REAL, stress_mpa REAL, strain_len REAL);
    CREATE INDEX IF NOT EXISTS idx_meas_run ON measurements(run_id);
    CREATE TABLE IF NOT EXISTS run_results (
      run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      port INTEGER NOT NULL CHECK (port BETWEEN 1 AND 3),
      s0 REAL, fm_kn REAL, rm_mpa REAL, rel_mpa REAL, fel_kn REAL, modulus_mpa REAL, a_pct REAL,
      PRIMARY KEY (run_id, port));
    CREATE TABLE IF NOT EXISTS run_charts (
      run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      port INTEGER NOT NULL CHECK (port BETWEEN 0 AND 3), -- 0 = biểu đồ chung các cổng
      svg TEXT NOT NULL, PRIMARY KEY (run_id, port));
    CREATE TABLE IF NOT EXISTS run_bending (
      run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      port INTEGER NOT NULL CHECK (port BETWEEN 1 AND 3),
      max_force_n REAL, deform_at_max_mm REAL, flexural_strength_mpa REAL, tangent_modulus_mpa REAL,
      chord_modulus_mpa REAL, break_force_n REAL, deform_at_break_mm REAL, flexural_stress_break_mpa REAL,
      strain_at_break_pct REAL, PRIMARY KEY (run_id, port));
  `)
  // Migration cho DB tạo từ các bản trước
  addColumn('specimen_ports', 'lu', 'REAL')
  addColumn('specimen_ports', 'bu', 'REAL')
  addColumn('measurements', 'force_kn', 'REAL')
  addColumn('measurements', 'stress_mpa', 'REAL')
  addColumn('measurements', 'strain_len', 'REAL') // ε = ΔL/Lo (mm/mm)
  for (const col of ['s0', 'fm_kn', 'rm_mpa', 'rel_mpa', 'fel_kn', 'modulus_mpa', 'a_pct']) addColumn('run_results', col, 'REAL')
  // Thông số thử uốn (theo mẫu, không bắt buộc)
  for (const col of ['sample_length', 'support_span', 'load_point_pos', 'bearing_dia', 'load_dia', 'weight_g']) {
    addColumn('specimens', col, 'REAL')
  }

  const handle = (channel, fn) =>
    ipcMain.handle(channel, (e, ...args) => {
      if (!allow(e)) throw new Error('Không có quyền truy cập cơ sở dữ liệu.')
      return fn(e, ...args)
    })

  handle('db:listProjects', () =>
    db.prepare('SELECT id, name, created_at AS createdAt FROM projects ORDER BY id DESC').all())

  handle('db:createProject', (_e, name) => {
    const clean = String(name ?? '').trim()
    if (!clean) throw new Error('Tên project trống.')
    const r = db.prepare('INSERT INTO projects (name) VALUES (?)').run(clean)
    return db.prepare('SELECT id, name, created_at AS createdAt FROM projects WHERE id = ?').get(r.lastInsertRowid)
  })

  handle('db:listSpecimens', (_e, projectId) =>
    db.prepare('SELECT * FROM specimens WHERE project_id = ? ORDER BY id DESC').all(projectId).map(specimenInfo))

  handle('db:createSpecimen', (_e, input) => {
    const name = String(input?.name ?? '').trim()
    if (!name) throw new Error('Tên mẫu trống.')
    const ports = Array.isArray(input?.ports) ? input.ports : []
    const valid = ports.length === 3 && ports.every((p, i) =>
      p.port === i + 1 && [p.t, p.b, p.l0].every((v) => Number.isFinite(v) && v > 0))
    if (!valid) throw new Error('t, b, L0 của 3 cổng phải là số > 0.')
    const s = input?.setup ?? {}
    const tx = db.transaction(() => {
      const r = db.prepare(`INSERT INTO specimens (project_id, name, sample_length, support_span, load_point_pos,
        bearing_dia, load_dia, weight_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(input.projectId, name, optNum(s.sampleLength), optNum(s.supportSpan), optNum(s.loadPointPos),
          optNum(s.bearingDia), optNum(s.loadDia), optNum(s.weightG))
      const ins = db.prepare('INSERT INTO specimen_ports (specimen_id, port, t, b, l0, lu, bu) VALUES (?, ?, ?, ?, ?, ?, ?)')
      for (const p of ports) ins.run(r.lastInsertRowid, p.port, p.t, p.b, p.l0, optNum(p.lu), optNum(p.bu))
      return r.lastInsertRowid
    })
    return specimenInfo(db.prepare('SELECT * FROM specimens WHERE id = ?').get(tx()))
  })

  handle('db:saveRun', (_e, specimenId, rows) => {
    if (!Array.isArray(rows) || !rows.length) return null
    const sp = db.prepare('SELECT * FROM specimens WHERE id = ?').get(specimenId)
    if (!sp) throw new Error('Không tìm thấy mẫu.')
    const dims = Object.fromEntries(listPorts(specimenId).map((p) => [p.port, p]))

    // ε = ΔL/Lo: mốc 0 = độ dài hợp lệ đầu tiên của kênh sau START;
    // chiều dương = chiều ΔL lớn nhất (nếu độ dài giảm khi kéo thì tự đổi dấu)
    const base = { 1: null, 2: null, 3: null }
    const peak = { 1: 0, 2: 0, 3: 0 }
    for (const r of rows) {
      const len = optNum(r.lengthMm)
      if (!r.enabled || len == null || !(r.channel in base)) continue
      if (base[r.channel] == null) base[r.channel] = len
    }
    for (const r of rows) {
      const len = optNum(r.lengthMm)
      if (!r.enabled || len == null || !(r.channel in base) || base[r.channel] == null) continue
      const dl = len - base[r.channel]
      if (Math.abs(dl) > Math.abs(peak[r.channel])) peak[r.channel] = dl
    }
    const sgn = (ch) => (peak[ch] < 0 ? -1 : 1)

    const tx = db.transaction(() => {
      const run = db.prepare('INSERT INTO runs (specimen_id, started_at, row_count) VALUES (?, ?, ?)')
        .run(specimenId, rows[0].hostTime, rows.length)
      const runId = Number(run.lastInsertRowid)
      const ins = db.prepare(`INSERT INTO measurements (run_id, host_time, device_ms, elapsed_s, raw, delta, filtered,
        strain, factor, baseline, sign, channel, sample_index, enabled, length_mm, length_signal, force_kn, stress_mpa, strain_len)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

      const curves = { 1: [], 2: [], 3: [] }
      const enabledPorts = new Set()
      for (const r of rows) {
        const d = dims[r.channel]
        const s0 = d ? d.t * d.b : 0
        const f = optNum(r.forceKn)
        const sigma = f != null && s0 > 0 ? (f * 1000) / s0 : null
        const len = optNum(r.lengthMm)
        const eps = r.enabled && d && d.l0 > 0 && len != null && base[r.channel] != null
          ? (sgn(r.channel) * (len - base[r.channel])) / d.l0
          : null
        ins.run(runId, r.hostTime, r.deviceMs, r.t, r.raw, r.delta, r.filtered, r.strain,
          r.factor, r.baseline, r.sign, r.channel, r.sampleIndex, r.enabled ? 1 : 0, r.lengthMm, r.lengthSignal, f, sigma, eps)
        if (r.enabled && curves[r.channel]) {
          enabledPorts.add(r.channel)
          if (f != null && sigma != null) curves[r.channel].push({ f, sigma, eps })
        }
      }

      const insRes = db.prepare(`INSERT INTO run_results (run_id, port, s0, fm_kn, rm_mpa, rel_mpa, fel_kn, modulus_mpa, a_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      const insBend = db.prepare(`INSERT INTO run_bending (run_id, port, max_force_n, deform_at_max_mm, flexural_strength_mpa,
        tangent_modulus_mpa, chord_modulus_mpa, break_force_n, deform_at_break_mm, flexural_stress_break_mpa, strain_at_break_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      const insChart = db.prepare('INSERT INTO run_charts (run_id, port, svg) VALUES (?, ?, ?)')
      const combined = []
      for (const port of [1, 2, 3]) {
        if (!enabledPorts.has(port) || !dims[port]) continue
        const d = dims[port]
        const pts = curves[port]

        // Phiếu kéo
        const res = computeTensile(d, pts)
        insRes.run(runId, port, res.s0, res.fm, res.rm, res.rel, res.fel, res.modulus, res.aPct)

        // Uốn 3 điểm: F (N) và độ võng s (mm) = ε × Lo (ΔL của cảm biến độ dài)
        const bendPts = pts.filter((p) => p.eps != null).map((p) => ({ f: p.f * 1000, s: p.eps * d.l0 }))
        const bend = computeBending(d.t, d.b, sp.support_span, bendPts)
        insBend.run(runId, port, bend.maxForce, bend.deformAtMax, bend.flexuralStrength, bend.tangentModulus,
          bend.chordModulus, bend.breakForce, bend.deformAtBreak, bend.stressAtBreak, bend.strainAtBreakPct)

        const plot = pts.filter((p) => p.eps != null)
        if (plot.length >= 2) {
          const series = {
            label: `NO.${port} (HX${port})`, tag: String(port), color: CHANNEL_COLORS[port - 1],
            pts: plot.map((p) => ({ x: p.eps * 100, y: p.sigma })),
          }
          insChart.run(runId, port, svgChart(`NO.${port} (HX${port})`, [series]))
          combined.push(series)
        }
      }
      // Biểu đồ chung: vẽ các cổng đang có dữ liệu (1, 2 hoặc 3 cổng)
      if (combined.length) {
        insChart.run(runId, 0, svgChart(
          combined.length === 1 ? combined[0].label : 'Biểu đồ chung các cổng', combined))
      }
      return runId
    })
    return tx()
  })

  // ---------- Đọc dữ liệu đã lưu (cho màn hình Output) ----------
  handle('db:listAllRuns', () => db.prepare(`${RUN_SELECT} ORDER BY r.id DESC`).all())

  handle('db:getRunDetail', (_e, runId) => {
    const run = db.prepare(`${RUN_SELECT} WHERE r.id = ?`).get(runId)
    if (!run) return null
    const sp = db.prepare('SELECT * FROM specimens WHERE id = ?').get(run.specimenId)
    return {
      run,
      setup: setupOf(sp),
      ports: listPorts(run.specimenId),
      results: db.prepare('SELECT * FROM run_results WHERE run_id = ? ORDER BY port').all(runId),
      bending: db.prepare('SELECT * FROM run_bending WHERE run_id = ? ORDER BY port').all(runId),
      charts: db.prepare('SELECT port, svg FROM run_charts WHERE run_id = ? ORDER BY port').all(runId),
    }
  })

  handle('db:listMeasurements', (_e, runId, port, offset, limit) => {
    const p = Number(port)
    const usePort = p >= 1 && p <= 3
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 500)
    const off = Math.max(Number(offset) || 0, 0)
    const where = usePort ? 'run_id = ? AND enabled = 1 AND channel = ?' : 'run_id = ? AND enabled = 1'
    const args = usePort ? [runId, p] : [runId]
    const total = db.prepare(`SELECT COUNT(*) AS n FROM measurements WHERE ${where}`).get(...args).n
    const rows = db.prepare(`SELECT elapsed_s, channel, raw, delta, filtered, strain, length_mm, force_kn, stress_mpa, strain_len
      FROM measurements WHERE ${where} ORDER BY id LIMIT ? OFFSET ?`).all(...args, lim, off)
    return { total, rows }
  })

  handle('db:deleteRun', (_e, runId) => {
    db.prepare('DELETE FROM runs WHERE id = ?').run(runId) // cascade: measurements, run_results, run_bending, run_charts
    return true
  })

  handle('db:exportRunPdf', (e, runId) => exportRunPdf(e, runId))
  handle('db:exportPdf', (e, specimenId) => {
    const run = db.prepare('SELECT id FROM runs WHERE specimen_id = ? ORDER BY id DESC LIMIT 1').get(specimenId)
    if (!run) return { ok: false, error: 'Mẫu chưa có dữ liệu đã lưu.' }
    return exportRunPdf(e, run.id)
  })
}

module.exports = { initDatabase }