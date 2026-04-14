import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { ComisionConfig, Comision } from '../../types'

const fmt = (n: number | null) =>
  n == null ? '—' :
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

/* ──────────── CONFIG MODAL (per-user %) ──────────── */
function ModalConfig({ cfg, onClose, onSaved }: {
  cfg: ComisionConfig | null; onClose: () => void; onSaved: () => void
}) {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [form, setForm] = useState({
    usuario_id: cfg?.usuario_id ?? '',
    porcentaje: cfg?.porcentaje?.toString() ?? '5',
    activo:     cfg?.activo ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const set = (k: string, v: string | boolean) => { setForm(p => ({ ...p, [k]: v })); setError(null) }

  useEffect(() => {
    supabase.from('usuarios').select('id,nombre,rol,sucursales(nombre)')
      .in('rol', ['vendedor', 'gerente']).eq('activo', true)
      .then(({ data }) => setUsuarios(data ?? []))
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const payload = {
      usuario_id: form.usuario_id,
      porcentaje: Number(form.porcentaje),
      activo:     form.activo,
    }
    const { error: err } = cfg
      ? await supabase.from('comisiones_config').update(payload).eq('id', cfg.id)
      : await supabase.from('comisiones_config').insert(payload)
    if (err) setError(err.message)
    else { onSaved(); onClose() }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{cfg ? 'Editar porcentaje' : 'Asignar comisión'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={save} className="form-grid">
          <div className="form-row">
            <div className="field field--full">
              <label className="field-label">Vendedor / Gerente *</label>
              <select className="field-input" value={form.usuario_id} onChange={e => set('usuario_id', e.target.value)} required disabled={!!cfg}>
                <option value="">Seleccionar...</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} — {(u.sucursales as any)?.nombre ?? 'Sin sucursal'} ({u.rol})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Porcentaje de comisión %</label>
              <input type="number" className="field-input" value={form.porcentaje}
                onChange={e => set('porcentaje', e.target.value)} step="0.1" min="0" max="100" required />
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} />
                <span>Configuración activa</span>
              </label>
            </div>
          </div>
          {error && <div className="alert alert--error">⚠ {error}</div>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-gold" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ──────────── REGISTRO COMISIÓN MANUAL ──────────── */
function ModalRegistro({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [configs, setConfigs] = useState<any[]>([])
  const [lotes, setLotes]     = useState<any[]>([])
  const [form, setForm] = useState({
    usuario_id:  '',
    lote_id:     '',
    monto_venta: '',
    porcentaje:  '',
    fecha:       new Date().toISOString().slice(0, 10),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(null) }

  useEffect(() => {
    supabase.from('comisiones_config').select('*,usuarios(nombre,rol,sucursales(nombre))').eq('activo', true)
      .then(({ data }) => setConfigs(data ?? []))
    supabase.from('lotes').select('id,codigo,descripcion,precio_venta').eq('activo', true).eq('vendido', false)
      .then(({ data }) => setLotes(data ?? []))
  }, [])

  // Auto-fill porcentaje when user selected
  function handleUsuarioChange(uid: string) {
    set('usuario_id', uid)
    const cfg = configs.find(c => c.usuario_id === uid)
    if (cfg) setForm(p => ({ ...p, usuario_id: uid, porcentaje: cfg.porcentaje.toString() }))
  }

  // Auto-fill monto_venta from lote
  function handleLoteChange(lid: string) {
    set('lote_id', lid)
    const lote = lotes.find(l => l.id === lid)
    if (lote?.precio_venta) setForm(p => ({ ...p, lote_id: lid, monto_venta: lote.precio_venta.toString() }))
  }

  const comisionCalc = form.monto_venta && form.porcentaje
    ? (Number(form.monto_venta) * Number(form.porcentaje)) / 100 : 0

  async function save(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!form.usuario_id) return setError('Selecciona un usuario')
    if (!form.monto_venta || Number(form.monto_venta) <= 0) return setError('El monto de venta es obligatorio')
    setLoading(true)
    const payload = {
      usuario_id:  form.usuario_id,
      lote_id:     form.lote_id || null,
      monto_venta: Number(form.monto_venta),
      porcentaje:  Number(form.porcentaje) || 0,
      fecha:       form.fecha,
      pagado:      false,
    }
    const { error: err } = await supabase.from('comisiones').insert(payload)
    if (err) setError(err.message)
    else { onSaved(); onClose() }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Registrar comisión</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={save} className="form-grid">
          <div className="form-row">
            <div className="field field--full">
              <label className="field-label">Vendedor *</label>
              <select className="field-input" value={form.usuario_id} onChange={e => handleUsuarioChange(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {configs.map(c => (
                  <option key={c.usuario_id} value={c.usuario_id}>
                    {c.usuarios?.nombre} — {c.usuarios?.sucursales?.nombre ?? 'Sin sucursal'} ({c.porcentaje}%)
                  </option>
                ))}
              </select>
            </div>
            <div className="field field--full">
              <label className="field-label">Lote vendido (opcional)</label>
              <select className="field-input" value={form.lote_id} onChange={e => handleLoteChange(e.target.value)}>
                <option value="">Sin lote específico</option>
                {lotes.map(l => (
                  <option key={l.id} value={l.id}>{l.codigo} — {l.descripcion.slice(0, 40)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Monto de venta MXN *</label>
              <input type="number" className="field-input" value={form.monto_venta}
                onChange={e => set('monto_venta', e.target.value)} step="0.01" min="0" required />
            </div>
            <div className="field">
              <label className="field-label">Porcentaje %</label>
              <input type="number" className="field-input" value={form.porcentaje}
                onChange={e => set('porcentaje', e.target.value)} step="0.1" min="0" max="100" />
            </div>
            <div className="field field--full">
              <div className="comision-preview">
                Comisión calculada: <strong className="text-gold">{fmt(comisionCalc)}</strong>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Fecha</label>
              <input type="date" className="field-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
          </div>
          {error && <div className="alert alert--error">⚠ {error}</div>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-gold" disabled={loading}>{loading ? 'Guardando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ──────────── MAIN PAGE ──────────── */
export default function Comisiones() {
  const [tab, setTab]           = useState<'dashboard' | 'config'>('dashboard')
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [configs, setConfigs]   = useState<ComisionConfig[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalCfg, setModalCfg] = useState<ComisionConfig | null | 'nuevo'>(null)
  const [modalReg, setModalReg] = useState(false)

  const now = new Date()
  const [mesInicio, setMesInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [mesFin, setMesFin] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return d.toISOString().slice(0, 10)
  })

  function loadComisiones() {
    setLoading(true)
    supabase.from('comisiones')
      .select('*,usuarios(nombre,rol,sucursales(nombre)),lotes(codigo,descripcion)')
      .gte('fecha', mesInicio).lte('fecha', mesFin)
      .order('fecha', { ascending: false })
      .then(({ data }) => { setComisiones((data as Comision[]) ?? []); setLoading(false) })
  }

  function loadConfigs() {
    supabase.from('comisiones_config')
      .select('*,usuarios(nombre,rol,sucursales(nombre))')
      .then(({ data }) => setConfigs(data ?? []))
  }

  useEffect(() => { loadConfigs() }, [])
  useEffect(() => { loadComisiones() }, [mesInicio, mesFin])

  const totalComisiones = comisiones.reduce((a, c) => a + (c.monto_comision ?? 0), 0)
  const totalPagado     = comisiones.filter(c => c.pagado).reduce((a, c) => a + (c.monto_comision ?? 0), 0)
  const totalPendiente  = totalComisiones - totalPagado

  async function togglePagado(c: Comision) {
    await supabase.from('comisiones').update({ pagado: !c.pagado }).eq('id', c.id)
    loadComisiones()
  }

  return (
    <div className="modulo">
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Comisiones</h1>
          <p className="modulo-sub">Registro y pago de comisiones por ventas</p>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={() => setTab(t => t === 'dashboard' ? 'config' : 'dashboard')}>
            {tab === 'dashboard' ? '⚙ Configuración' : '📊 Dashboard'}
          </button>
          {tab === 'dashboard' && (
            <button className="btn-gold" onClick={() => setModalReg(true)}>+ Registrar</button>
          )}
          {tab === 'config' && (
            <button className="btn-gold" onClick={() => setModalCfg('nuevo')}>+ Asignar %</button>
          )}
        </div>
      </div>

      {tab === 'dashboard' && (<>
        <div className="kpis">
          <div className="kpi-card kpi-card--neutral"><span className="kpi-titulo">Total período</span><span className="kpi-valor">{fmt(totalComisiones)}</span></div>
          <div className="kpi-card kpi-card--pos"><span className="kpi-titulo">Pagado</span><span className="kpi-valor">{fmt(totalPagado)}</span></div>
          <div className="kpi-card kpi-card--neg"><span className="kpi-titulo">Pendiente</span><span className="kpi-valor">{fmt(totalPendiente)}</span></div>
          <div className="kpi-card kpi-card--neutral"><span className="kpi-titulo">Registros</span><span className="kpi-valor">{comisiones.length}</span></div>
        </div>

        <section className="card">
          <div className="filtros">
            <div className="field" style={{ flex: 0 }}>
              <label className="field-label">Desde</label>
              <input type="date" className="filtro-input" value={mesInicio} onChange={e => setMesInicio(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 0 }}>
              <label className="field-label">Hasta</label>
              <input type="date" className="filtro-input" value={mesFin} onChange={e => setMesFin(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="empty">Cargando comisiones...</div>
          ) : comisiones.length === 0 ? (
            <div className="empty">No hay comisiones en este período</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vendedor</th><th>Sucursal</th><th>Lote</th>
                    <th>Venta</th><th>%</th><th>Comisión</th><th>Fecha</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {comisiones.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="td-user">
                          <span>{(c.usuarios as any)?.nombre ?? '—'}</span>
                          <span className="td-user-rol">{(c.usuarios as any)?.rol ?? ''}</span>
                        </div>
                      </td>
                      <td className="text-muted">{(c.usuarios as any)?.sucursales?.nombre ?? '—'}</td>
                      <td className="mono">{(c.lotes as any)?.codigo ?? '—'}</td>
                      <td className="text-muted">{fmt(c.monto_venta)}</td>
                      <td>{c.porcentaje}%</td>
                      <td><strong className="text-gold">{fmt(c.monto_comision)}</strong></td>
                      <td className="text-muted">{c.fecha}</td>
                      <td>
                        <span className={`badge badge--${c.pagado ? 'ok' : 'warn'}`}>
                          {c.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        <button className={`btn-xs ${!c.pagado ? 'btn-xs--ok' : ''}`} onClick={() => togglePagado(c)}>
                          {c.pagado ? 'Desmarcar' : '✓ Pagar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>)}

      {tab === 'config' && (
        <section className="card">
          <h3 className="section-title">Porcentajes por usuario</h3>
          {configs.length === 0 ? (
            <div className="empty">No hay configuraciones. Asigna un porcentaje para empezar.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Vendedor</th><th>Rol</th><th>Sucursal</th><th>% Comisión</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {configs.map(cfg => (
                    <tr key={cfg.id}>
                      <td>{(cfg.usuarios as any)?.nombre ?? '—'}</td>
                      <td><span className="badge badge--neutral">{(cfg.usuarios as any)?.rol ?? '—'}</span></td>
                      <td className="text-muted">{(cfg.usuarios as any)?.sucursales?.nombre ?? '—'}</td>
                      <td className="text-pos"><strong>{cfg.porcentaje}%</strong></td>
                      <td><span className={`badge badge--${cfg.activo ? 'ok' : 'neg'}`}>{cfg.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td><button className="btn-xs" onClick={() => setModalCfg(cfg)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {modalCfg && (
        <ModalConfig
          cfg={modalCfg === 'nuevo' ? null : modalCfg}
          onClose={() => setModalCfg(null)}
          onSaved={loadConfigs}
        />
      )}
      {modalReg && (
        <ModalRegistro
          onClose={() => setModalReg(false)}
          onSaved={loadComisiones}
        />
      )}
    </div>
  )
}
