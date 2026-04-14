import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Pedido, EstatusPedido, Sucursal } from '../../types/database'

const SUCURSALES_DEFAULT = [
  'Sumefra',
  'Anubis Aguascalientes',
  'Anubis Centro',
  'Anubis Galerías',
  'Anubis Sahuaro Grande',
  'Anubis Sahuaro Chico',
  'M&P Galerías',
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
  const [pedidoImagen, setPedidoImagen] = useState<Pedido | null>(null)

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

  const pedidosActivos = pedidos.filter(p => !['entregado','cancelado'].includes(p.estatus))

  function abrirImagen(p: Pedido) {
    // Sync latest data from list
    setPedidoImagen(p)
  }

  function handleImagenUpdate(actualizado: Pedido) {
    setPedidos(prev => prev.map(p => p.id === actualizado.id ? actualizado : p))
    setPedidoImagen(actualizado)
  }

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
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
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
                      <th className="tabla-th">Imágenes</th>
                      {isSocioOrAdmin && <th className="tabla-th">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosFiltrados.length === 0 ? (
                      <tr><td colSpan={10} className="loading-row">Sin pedidos</td></tr>
                    ) : (
                      pedidosFiltrados.map(p => {
                        const cfg = ESTATUS_CONFIG[p.estatus]
                        const tieneImagenes = !!(p.imagen_inicio_url || p.imagen_render_url)
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
                            <td className="tabla-celda">
                              <button
                                className="btn-icon"
                                title={tieneImagenes ? 'Ver / subir imágenes' : 'Subir imágenes'}
                                onClick={() => abrirImagen(p)}
                                style={{ position: 'relative' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
                                  stroke={tieneImagenes ? 'var(--gold)' : 'var(--text-muted)'}
                                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="1" y="4" width="18" height="13" rx="2"/>
                                  <circle cx="10" cy="10.5" r="3"/>
                                  <path d="M6.5 4l1.5-3h4l1.5 3"/>
                                </svg>
                                {tieneImagenes && (
                                  <span style={{
                                    position: 'absolute', top: 1, right: 1,
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: 'var(--gold)',
                                  }} />
                                )}
                              </button>
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

      {/* Modal imágenes */}
      {pedidoImagen && (
        <ImagenModal
          pedido={pedidoImagen}
          onClose={() => setPedidoImagen(null)}
          onUpdate={handleImagenUpdate}
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

// ── Modal de imágenes ──────────────────────────────────────
const BUCKET = 'pedido-imagenes'

function ImagenModal({
  pedido,
  onClose,
  onUpdate,
}: {
  pedido: Pedido
  onClose: () => void
  onUpdate: (p: Pedido) => void
}) {
  const [inicioUrl, setInicioUrl] = useState(pedido.imagen_inicio_url ?? null)
  const [renderUrl, setRenderUrl] = useState(pedido.imagen_render_url ?? null)
  const [uploading, setUploading] = useState<'inicio' | 'render' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visor, setVisor] = useState<string | null>(null)
  const inicioRef = useRef<HTMLInputElement>(null)
  const renderRef = useRef<HTMLInputElement>(null)

  async function uploadImagen(tipo: 'inicio' | 'render', file: File) {
    setError(null)
    setUploading(tipo)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${pedido.id}/${tipo}.${ext}`

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      setError(upErr.message)
      setUploading(null)
      return
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    // Bust cache by appending timestamp
    const url = urlData.publicUrl + '?t=' + Date.now()

    const field = tipo === 'inicio' ? 'imagen_inicio_url' : 'imagen_render_url'
    const { data: updated, error: updateErr } = await supabase
      .from('pedidos')
      .update({ [field]: urlData.publicUrl })
      .eq('id', pedido.id)
      .select('*, sucursales(*), usuarios(*)')
      .single()

    if (updateErr) {
      setError(updateErr.message)
      setUploading(null)
      return
    }

    if (tipo === 'inicio') setInicioUrl(url)
    else setRenderUrl(url)

    if (updated) onUpdate(updated as Pedido)
    setUploading(null)
  }

  async function eliminarImagen(tipo: 'inicio' | 'render') {
    setError(null)
    const url = tipo === 'inicio' ? inicioUrl : renderUrl
    if (!url) return

    // Remove from storage (try both common extensions)
    const basePath = `${pedido.id}/${tipo}`
    for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'gif']) {
      await supabase.storage.from(BUCKET).remove([`${basePath}.${ext}`])
    }

    const field = tipo === 'inicio' ? 'imagen_inicio_url' : 'imagen_render_url'
    const { data: updated } = await supabase
      .from('pedidos')
      .update({ [field]: null })
      .eq('id', pedido.id)
      .select('*, sucursales(*), usuarios(*)')
      .single()

    if (tipo === 'inicio') setInicioUrl(null)
    else setRenderUrl(null)

    if (updated) onUpdate(updated as Pedido)
  }

  function handleFile(tipo: 'inicio' | 'render', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadImagen(tipo, file)
    e.target.value = ''
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal" style={{ maxWidth: 680, width: '90vw' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Imágenes del pedido</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {pedido.folio} · {pedido.cliente}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 5L5 15M5 5l10 10"/>
            </svg>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '20px 24px 24px' }}>
          {(['inicio', 'render'] as const).map(tipo => {
            const url = tipo === 'inicio' ? inicioUrl : renderUrl
            const ref = tipo === 'inicio' ? inicioRef : renderRef
            const isUploading = uploading === tipo
            const label = tipo === 'inicio' ? 'Imagen Inicio' : 'Imagen Render'
            const sublabel = tipo === 'inicio' ? 'Diseño o boceto inicial' : 'Render o foto final'

            return (
              <div key={tipo} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sublabel}</div>
                </div>

                {/* Preview area */}
                <div
                  onClick={() => url && setVisor(url)}
                  style={{
                    width: '100%',
                    aspectRatio: '4/3',
                    borderRadius: 10,
                    border: '2px dashed var(--border)',
                    background: 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: url ? 'zoom-in' : 'default',
                    position: 'relative',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => {
                        if (tipo === 'inicio') setInicioUrl(null)
                        else setRenderUrl(null)
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      <svg width="36" height="36" viewBox="0 0 20 20" fill="none"
                        stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ margin: '0 auto 8px', display: 'block' }}>
                        <rect x="1" y="4" width="18" height="13" rx="2"/>
                        <circle cx="10" cy="10.5" r="3"/>
                        <path d="M6.5 4l1.5-3h4l1.5 3"/>
                      </svg>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin imagen</span>
                    </div>
                  )}
                  {isUploading && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(247,244,239,0.8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 10,
                    }}>
                      <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>Subiendo...</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={ref}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleFile(tipo, e)}
                  />
                  <button
                    className="btn-primary btn-sm"
                    style={{ flex: 1 }}
                    disabled={isUploading}
                    onClick={() => ref.current?.click()}
                  >
                    {isUploading ? 'Subiendo...' : url ? 'Reemplazar' : 'Subir imagen'}
                  </button>
                  {url && (
                    <button
                      className="btn-danger btn-sm"
                      disabled={isUploading}
                      onClick={() => eliminarImagen(tipo)}
                      title="Eliminar imagen"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="form-error" style={{ margin: '0 24px 20px' }}>
            {error}
          </div>
        )}

        <div style={{ padding: '0 24px 20px', fontSize: 12, color: 'var(--text-muted)' }}>
          Formatos admitidos: JPG, PNG, WebP, GIF · Tamaño máximo recomendado: 5 MB
        </div>
      </div>

      {/* Visor de imagen completa */}
      {visor && (
        <>
          <div
            className="modal-overlay"
            style={{ zIndex: 200 }}
            onClick={() => setVisor(null)}
          />
          <div style={{
            position: 'fixed', inset: 0, zIndex: 201,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <img
              src={visor}
              alt="Vista completa"
              style={{
                maxWidth: '90vw', maxHeight: '85vh',
                borderRadius: 12,
                boxShadow: '0 24px 80px rgba(30,24,16,0.5)',
                pointerEvents: 'auto',
                cursor: 'zoom-out',
                objectFit: 'contain',
              }}
              onClick={() => setVisor(null)}
            />
          </div>
        </>
      )}
    </>
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
