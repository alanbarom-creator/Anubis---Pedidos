import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Pedido, EstatusPedido, Sucursal } from '../../types/database'

const SUCURSALES_DEFAULT = [
  'Anubis Sahuaro Grande','Anubis Sahuaro Chico','Anubis Aguascalientes',
  'Anubis Galerias','Anubis Centro','M&P Galerías',
]

const ESTATUS_CONFIG: Record<EstatusPedido, { label: string; color: string; bg: string }> = {
  recibido:   { label: 'Recibido',    color: 'var(--text-muted)', bg: 'rgba(80,80,112,0.1)' },
  en_proceso: { label: 'En proceso',  color: 'var(--info)',       bg: 'rgba(74,158,224,0.1)' },
  en_taller:  { label: 'En taller',   color: 'var(--warning)',    bg: 'rgba(224,160,48,0.1)' },
  listo:      { label: 'Listo',       color: 'var(--positive)',   bg: 'rgba(76,175,110,0.1)' },
  entregado:  { label: 'Entregado',   color: 'var(--positive)',   bg: 'rgba(76,175,110,0.08)' },
  cancelado:  { label: 'Cancelado',   color: 'var(--negative)',   bg: 'rgba(224,85,85,0.08)' },
}

const hoy = new Date().toISOString().split('T')[0]
const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

type Vista = 'dashboard' | 'captura'

export default function PedidosDashboard() {
  const { perfil, isSocioOrAdmin } = useAuth()
  const [vista, setVista] = useState<Vista>('dashboard')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusPedido | 'todos'>('todos')
  const [sucursales, setSucursales] = useState<Sucursal[]>([])

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, sucursales(*), usuarios(*)')
      .order('created_at', { ascending: false })
      .limit(200)
    setPedidos((data as Pedido[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    supabase.from('sucursales').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setSucursales(data ?? []))
  }, [cargar])

  const counts: Record<string, number> = {}
  for (const p of pedidos) counts[p.estatus] = (counts[p.estatus] ?? 0) + 1

  const pedidosFiltrados = filtroEstatus === 'todos'
    ? pedidos
    : pedidos.filter(p => p.estatus === filtroEstatus)

  // Pedidos activos (no entregados ni cancelados) para el listado de folios
  const pedidosActivos = pedidos.filter(p => !['entregado','cancelado'].includes(p.estatus))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Pedidos</h1>
          <p className="modulo-subtitulo">Control de pedidos y status de producción</p>
        </div>
        <div className="modulo-acciones">
          <button className={`tab-btn ${vista === 'dashboard' ? 'tab-btn--active' : ''}`}
            onClick={() => setVista('dashboard')}>Dashboard</button>
          <button className={`tab-btn ${vista === 'captura' ? 'tab-btn--active' : ''}`}
            onClick={() => setVista('captura')}>+ Nuevo pedido</button>
          <button className="btn-icon" onClick={cargar} title="Recargar">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4a8 8 0 0112.2 1.4M16 16a8 8 0 01-12.2-1.4M4 8V4H0M16 12v4h4"/>
            </svg>
          </button>
        </div>
      </div>

      {vista === 'dashboard' && (
        <>
          {/* Status cards */}
          <div className="status-cards-row" style={{ marginBottom: 24 }}>
            {(['recibido','en_proceso','en_taller','listo'] as EstatusPedido[]).map(est => {
              const cfg = ESTATUS_CONFIG[est]
              const cnt = counts[est] ?? 0
              return (
                <div
                  key={est}
                  className={`status-card ${filtroEstatus === est ? 'status-card--active' : ''}`}
                  onClick={() => setFiltroEstatus(filtroEstatus === est ? 'todos' : est)}
                >
                  <div className="status-card-icon" style={{ background: cfg.bg }}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={cfg.color} strokeWidth="1.8" strokeLinecap="round">
                      <rect x="3" y="2" width="14" height="16" rx="2"/>
                      <path d="M7 7h6M7 10h6M7 13h4"/>
                    </svg>
                  </div>
                  <div className="status-card-count" style={{ color: cnt > 0 ? cfg.color : 'var(--text)' }}>{cnt}</div>
                  <div className="status-card-label">{cfg.label}</div>
                </div>
              )
            })}
          </div>

          {/* Folios activos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 24 }}>
            <section className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ marginBottom: 0 }}>Folios activos</h3>
                <span className="card-count">{pedidosActivos.length} pedidos</span>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {pedidosActivos.length === 0 ? (
                  <div className="empty-state">Sin pedidos activos</div>
                ) : (
                  pedidosActivos.map(p => {
                    const cfg = ESTATUS_CONFIG[p.estatus]
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gold)', minWidth: 80 }}>{p.folio}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.cliente}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            {p.sucursales?.nombre ?? '—'} · Entrega: {p.fecha_entrega ? fmt(p.fecha_entrega) : 'Sin fecha'}
                          </div>
                        </div>
                        <span className={`badge badge--${p.estatus.replace('_','-')}`} style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            {/* Resumen total */}
            <section className="card">
              <h3 className="card-title">Resumen general</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(ESTATUS_CONFIG).map(([est, cfg]) => {
                  const cnt = counts[est] ?? 0
                  return (
                    <div key={est} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)' }}>{cfg.label}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: cnt > 0 ? cfg.color : 'var(--text-dim)' }}>{cnt}</span>
                    </div>
                  )
                })}
                <div className="divider" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Total pedidos</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--gold)' }}>{pedidos.length}</span>
                </div>
              </div>
            </section>
          </div>

          {/* Tabla completa */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ marginBottom: 0 }}>
                {filtroEstatus === 'todos' ? 'Todos los pedidos' : ESTATUS_CONFIG[filtroEstatus].label}
              </h3>
              {filtroEstatus !== 'todos' && (
                <button className="btn-secondary btn-sm" onClick={() => setFiltroEstatus('todos')}>
                  Limpiar filtro
                </button>
              )}
            </div>
            {loading ? (
              <div className="loading-row">Cargando pedidos...</div>
            ) : (
              <div className="tabla-wrapper">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th className="tabla-th">Folio</th>
                      <th className="tabla-th">Fecha</th>
                      <th className="tabla-th">Cliente</th>
                      <th className="tabla-th">Tipo</th>
                      <th className="tabla-th">Sucursal</th>
                      <th className="tabla-th">Entrega</th>
                      <th className="tabla-th">Peso</th>
                      <th className="tabla-th">Estatus</th>
                      {isSocioOrAdmin && <th className="tabla-th">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosFiltrados.length === 0 ? (
                      <tr><td colSpan={9} className="loading-row">Sin pedidos</td></tr>
                    ) : (
                      pedidosFiltrados.map(p => {
                        const cfg = ESTATUS_CONFIG[p.estatus]
                        return (
                          <tr key={p.id} className="tabla-fila">
                            <td className="tabla-celda" style={{ fontWeight: 700, color: 'var(--gold)' }}>{p.folio}</td>
                            <td className="tabla-celda">{fmt(p.fecha)}</td>
                            <td className="tabla-celda">{p.cliente}</td>
                            <td className="tabla-celda"><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.tipo_cliente ?? '—'}</span></td>
                            <td className="tabla-celda">{p.sucursales?.nombre ?? '—'}</td>
                            <td className="tabla-celda">{p.fecha_entrega ? fmt(p.fecha_entrega) : '—'}</td>
                            <td className="tabla-celda">{p.peso ? `${p.peso}g` : '—'}</td>
                            <td className="tabla-celda">
                              <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                            </td>
                            {isSocioOrAdmin && (
                              <td className="tabla-celda">
                                <EstatusSelector pedido={p} onUpdate={cargar} />
                              </td>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {vista === 'captura' && (
        <CapturaPedido
          sucursales={sucursales}
          perfil={perfil}
          onSuccess={() => { cargar(); setVista('dashboard') }}
          onCancel={() => setVista('dashboard')}
        />
      )}
    </div>
  )
}

// ── Selector inline de estatus ─────────────────────────────
function EstatusSelector({ pedido, onUpdate }: { pedido: Pedido; onUpdate: () => void }) {
  async function cambiar(estatus: EstatusPedido) {
    await supabase.from('pedidos').update({ estatus }).eq('id', pedido.id)
    onUpdate()
  }
  return (
    <select
      className="filtro-input"
      style={{ fontSize: 12, padding: '4px 8px' }}
      value={pedido.estatus}
      onChange={e => cambiar(e.target.value as EstatusPedido)}
    >
      {Object.entries(ESTATUS_CONFIG).map(([v, { label }]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  )
}

// ── Formulario de captura ──────────────────────────────────
function CapturaPedido({
  sucursales,
  perfil,
  onSuccess,
  onCancel,
}: {
  sucursales: Sucursal[]
  perfil: { id: string; sucursal_id: string | null } | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    folio: '',
    fecha: hoy,
    fecha_entrega: '',
    cliente: '',
    tipo_cliente: '',
    descripcion: '',
    peso: '',
    sucursal_id: perfil?.sucursal_id ?? '',
    notas: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.folio.trim()) return setError('El folio es requerido.')
    if (!form.cliente.trim()) return setError('El nombre del cliente es requerido.')
    if (!form.sucursal_id) return setError('Selecciona una sucursal.')

    setLoading(true)
    const { error: err } = await supabase.from('pedidos').insert({
      folio: form.folio.trim(),
      fecha: form.fecha,
      fecha_entrega: form.fecha_entrega || null,
      cliente: form.cliente.trim(),
      tipo_cliente: form.tipo_cliente || null,
      descripcion: form.descripcion || null,
      peso: form.peso ? Number(form.peso) : null,
      sucursal_id: form.sucursal_id || null,
      capturado_por: perfil?.id ?? null,
      estatus: 'recibido',
      notas: form.notas || null,
    })

    if (err) setError(err.message)
    else onSuccess()
    setLoading(false)
  }

  return (
    <section className="card" style={{ maxWidth: 760 }}>
      <div className="card-header">
        <h3 className="card-title" style={{ marginBottom: 0 }}>Nuevo pedido</h3>
        <button className="btn-secondary btn-sm" onClick={onCancel}>Cancelar</button>
      </div>

      <form onSubmit={handleSubmit} className="captura-form">
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Folio de venta *</label>
            <input type="text" className="field-input" value={form.folio}
              onChange={e => set('folio', e.target.value)} placeholder="Ej: A-2024-001" required />
          </div>
          <div className="field-group">
            <label className="field-label">Fecha *</label>
            <input type="date" className="field-input" value={form.fecha}
              onChange={e => set('fecha', e.target.value)} required />
          </div>
          <div className="field-group">
            <label className="field-label">Cliente *</label>
            <input type="text" className="field-input" value={form.cliente}
              onChange={e => set('cliente', e.target.value)} placeholder="Nombre del cliente" required />
          </div>
          <div className="field-group">
            <label className="field-label">Tipo de cliente</label>
            <select className="field-input" value={form.tipo_cliente}
              onChange={e => set('tipo_cliente', e.target.value)}>
              <option value="">Selecciona...</option>
              <option value="Mostrador">Mostrador</option>
              <option value="Mayoreo">Mayoreo</option>
              <option value="Online">Online</option>
              <option value="Consignación">Consignación</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Fecha de entrega</label>
            <input type="date" className="field-input" value={form.fecha_entrega}
              onChange={e => set('fecha_entrega', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Sucursal *</label>
            <select className="field-input" value={form.sucursal_id}
              onChange={e => set('sucursal_id', e.target.value)} required>
              <option value="">Selecciona sucursal...</option>
              {sucursales.length > 0
                ? sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)
                : SUCURSALES_DEFAULT.map(n => <option key={n} value={n}>{n}</option>)
              }
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Peso (gramos)</label>
            <input type="number" className="field-input" value={form.peso}
              onChange={e => set('peso', e.target.value)} placeholder="0.00" min="0" step="0.01" />
          </div>
          <div className="field-group field-group--full">
            <label className="field-label">Descripción del pedido</label>
            <textarea className="field-input field-textarea" value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Descripción detallada de la pieza o pedido..." rows={3} />
          </div>
          <div className="field-group field-group--full">
            <label className="field-label">Notas adicionales</label>
            <input type="text" className="field-input" value={form.notas}
              onChange={e => set('notas', e.target.value)} placeholder="Notas internas..." />
          </div>
        </div>

        {error && <div className="form-error">⚠ {error}</div>}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar pedido'}
          </button>
        </div>
      </form>
    </section>
  )
}
