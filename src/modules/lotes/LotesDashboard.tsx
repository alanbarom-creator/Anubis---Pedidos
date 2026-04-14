import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Lote, Sucursal, Usuario } from '../../types/database'

type Vista = 'dashboard' | 'captura' | 'tabla'
type Periodo = 'dia' | 'mes' | 'anio'

const hoy = new Date().toISOString().split('T')[0]
const fmt = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n)
const fmtNum = (n: number | null) => n == null ? '—' : n.toFixed(2)

function periodoFechas(p: Periodo): { inicio: string; fin: string } {
  const now = new Date()
  if (p === 'dia') return { inicio: hoy, fin: hoy }
  if (p === 'mes') {
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    return { inicio, fin: hoy }
  }
  const inicio = `${now.getFullYear()}-01-01`
  return { inicio, fin: hoy }
}

export default function LotesDashboard() {
  const { perfil, rol, isSocioOrAdmin } = useAuth()
  const [vista, setVista] = useState<Vista>(isSocioOrAdmin ? 'dashboard' : 'tabla')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [vendedores, setVendedores] = useState<Usuario[]>([])

  const canSeeCosts = rol === 'socio'

  const cargar = useCallback(async () => {
    setLoading(true)
    const { inicio, fin } = periodoFechas(periodo)
    let q = supabase
      .from('lotes')
      .select('*, sucursales(*), vendedor:usuarios!vendedor_id(*)')
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha', { ascending: false })
      .limit(500)

    // Vendedores solo ven su sucursal
    if (rol === 'vendedor' && perfil?.sucursal_id) {
      q = q.eq('sucursal_id', perfil.sucursal_id)
    }

    const { data } = await q
    setLotes((data as Lote[]) ?? [])
    setLoading(false)
  }, [periodo, rol, perfil?.sucursal_id])

  useEffect(() => {
    cargar()
    supabase.from('sucursales').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setSucursales(data ?? []))
    supabase.from('usuarios').select('id,nombre,sucursal_id,sucursales(nombre),email,rol,activo,created_at').eq('activo', true).in('rol', ['vendedor','gerente','administrador','socio'])
      .then(({ data }) => setVendedores((data as unknown as Usuario[]) ?? []))
  }, [cargar])

  // KPIs del dashboard
  const totalVentas = lotes.reduce((a, l) => a + (l.precio_venta ?? 0), 0)
  const totalCosto = lotes.reduce((a, l) => a + (l.costo_total ?? 0), 0)
  const totalUtilidad = lotes.reduce((a, l) => a + (l.utilidad ?? 0), 0)
  const totalPiezas = lotes.length

  // Agrupaciones para dashboard
  const porSucursal: Record<string, number> = {}
  const porVendedor: Record<string, number> = {}
  const porProveedor: Record<string, number> = {}
  const porCategoria: Record<string, number> = {}

  for (const l of lotes) {
    const suc = (l as any).sucursales?.nombre ?? 'Sin sucursal'
    const vend = (l as any).vendedor?.nombre ?? 'Sin vendedor'
    const prov = l.proveedor ?? 'Sin proveedor'
    const cat = l.categoria ?? 'Sin categoría'
    porSucursal[suc] = (porSucursal[suc] ?? 0) + (l.precio_venta ?? 0)
    porVendedor[vend] = (porVendedor[vend] ?? 0) + (l.precio_venta ?? 0)
    porProveedor[prov] = (porProveedor[prov] ?? 0) + (l.precio_venta ?? 0)
    porCategoria[cat] = (porCategoria[cat] ?? 0) + (l.precio_venta ?? 0)
  }

  const topEntries = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Lotes · Ventas</h1>
          <p className="modulo-subtitulo">Registro de piezas vendidas y análisis de ventas</p>
        </div>
        <div className="modulo-acciones">
          {isSocioOrAdmin && (
            <button className={`tab-btn ${vista === 'dashboard' ? 'tab-btn--active' : ''}`}
              onClick={() => setVista('dashboard')}>Dashboard</button>
          )}
          <button className={`tab-btn ${vista === 'tabla' ? 'tab-btn--active' : ''}`}
            onClick={() => setVista('tabla')}>Registros</button>
          <button className={`tab-btn ${vista === 'captura' ? 'tab-btn--active' : ''}`}
            onClick={() => setVista('captura')}>+ Nuevo lote</button>
          {isSocioOrAdmin && (
            <div className="period-toggle">
              {(['dia','mes','anio'] as Periodo[]).map(p => (
                <button key={p} className={`period-btn ${periodo === p ? 'period-btn--active' : ''}`}
                  onClick={() => setPeriodo(p)}>
                  {p === 'dia' ? 'Hoy' : p === 'mes' ? 'Mes' : 'Año'}
                </button>
              ))}
            </div>
          )}
          <button className="btn-icon" onClick={cargar} title="Recargar">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4a8 8 0 0112.2 1.4M16 16a8 8 0 01-12.2-1.4M4 8V4H0M16 12v4h4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Dashboard socios */}
      {vista === 'dashboard' && isSocioOrAdmin && (
        <>
          <div className="kpis-grid" style={{ marginBottom: 24 }}>
            <div className="kpi-card kpi-card--default">
              <div className="kpi-titulo">Total piezas</div>
              <div className="kpi-valor">{totalPiezas}</div>
              <div className="kpi-desc">Período seleccionado</div>
            </div>
            <div className="kpi-card kpi-card--positive">
              <div className="kpi-titulo">Venta total</div>
              <div className="kpi-valor">{fmt(totalVentas)}</div>
              <div className="kpi-desc">Precio venta</div>
            </div>
            {canSeeCosts && (
              <>
                <div className="kpi-card kpi-card--warning">
                  <div className="kpi-titulo">Costo total</div>
                  <div className="kpi-valor">{fmt(totalCosto)}</div>
                  <div className="kpi-desc">Costo de piezas</div>
                </div>
                <div className="kpi-card kpi-card--positive">
                  <div className="kpi-titulo">Utilidad total</div>
                  <div className="kpi-valor" style={{ color: totalUtilidad >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                    {fmt(totalUtilidad)}
                  </div>
                  <div className="kpi-desc">Venta − Costo</div>
                </div>
              </>
            )}
          </div>

          <div className="dashboard-grid-2" style={{ marginBottom: 24 }}>
            <RankingCard title="Ventas por sucursal" entries={topEntries(porSucursal)} />
            <RankingCard title="Ventas por vendedor" entries={topEntries(porVendedor)} />
          </div>
          <div className="dashboard-grid-2" style={{ marginBottom: 24 }}>
            <RankingCard title="Ventas por proveedor" entries={topEntries(porProveedor)} />
            <RankingCard title="Ventas por categoría" entries={topEntries(porCategoria)} />
          </div>
        </>
      )}

      {/* Tabla */}
      {vista === 'tabla' && (
        <LotesTabla lotes={lotes} loading={loading} canSeeCosts={canSeeCosts} />
      )}

      {/* Captura */}
      {vista === 'captura' && (
        <LotesCaptura
          sucursales={sucursales}
          vendedores={vendedores}
          perfil={perfil}
          canSeeCosts={canSeeCosts}
          onSuccess={() => { cargar(); setVista('tabla') }}
          onCancel={() => setVista(isSocioOrAdmin ? 'dashboard' : 'tabla')}
        />
      )}
    </div>
  )
}

// ── Ranking card ───────────────────────────────────────────
function RankingCard({ title, entries }: { title: string; entries: [string, number][] }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
  const max = entries[0]?.[1] ?? 1
  return (
    <section className="card">
      <h3 className="card-title">{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px 0' }}>Sin datos</div>
        ) : (
          entries.map(([label, val]) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{fmt(val)}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
                <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--gold), var(--gold-light))', width: `${(val/max)*100}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

// ── Tabla de lotes ─────────────────────────────────────────
function LotesTabla({ lotes, loading, canSeeCosts }: {
  lotes: Lote[]
  loading: boolean
  canSeeCosts: boolean
}) {
  return (
    <section className="card">
      <div className="card-header">
        <h3 className="card-title" style={{ marginBottom: 0 }}>Registros de lotes</h3>
        <span className="card-count">{lotes.length} registros</span>
      </div>
      {loading ? (
        <div className="loading-row">Cargando lotes...</div>
      ) : lotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◇</div>
          Sin registros en el período seleccionado
        </div>
      ) : (
        <div className="tabla-wrapper">
          <table className="tabla">
            <thead>
              <tr>
                <th className="tabla-th">Fecha</th>
                <th className="tabla-th">Folio</th>
                <th className="tabla-th">Lote</th>
                <th className="tabla-th">Código</th>
                <th className="tabla-th">Sucursal</th>
                <th className="tabla-th">Vendedor</th>
                <th className="tabla-th">Proveedor</th>
                <th className="tabla-th">Categoría</th>
                <th className="tabla-th">Oro</th>
                <th className="tabla-th">Tipo P. Cen.</th>
                <th className="tabla-th">Ct Cen.</th>
                <th className="tabla-th">Peso Oro</th>
                <th className="tabla-th">P. Lista</th>
                <th className="tabla-th">Descuento</th>
                <th className="tabla-th">P. Venta</th>
                {canSeeCosts && (
                  <>
                    <th className="tabla-th">Costo P.C.</th>
                    <th className="tabla-th">Costo P.L.</th>
                    <th className="tabla-th">Costo Oro</th>
                    <th className="tabla-th">Costo Total</th>
                    <th className="tabla-th">Utilidad</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {lotes.map(l => (
                <tr key={l.id} className="tabla-fila">
                  <td className="tabla-celda">{l.fecha}</td>
                  <td className="tabla-celda" style={{ color: 'var(--gold)', fontWeight: 600 }}>{l.folio ?? '—'}</td>
                  <td className="tabla-celda">{l.lote ?? '—'}</td>
                  <td className="tabla-celda">{l.codigo ?? '—'}</td>
                  <td className="tabla-celda">{(l as any).sucursales?.nombre ?? '—'}</td>
                  <td className="tabla-celda">{(l as any).vendedor?.nombre ?? '—'}</td>
                  <td className="tabla-celda">{l.proveedor ?? '—'}</td>
                  <td className="tabla-celda">{l.categoria ?? '—'}</td>
                  <td className="tabla-celda">{l.oro ?? '—'}</td>
                  <td className="tabla-celda">{l.tipo_piedra_central ?? '—'}</td>
                  <td className="tabla-celda">{fmtNum(l.ct_central)}</td>
                  <td className="tabla-celda">{l.peso_oro ? `${l.peso_oro}g` : '—'}</td>
                  <td className="tabla-celda tabla-celda--monto">{fmt(l.precio_lista)}</td>
                  <td className="tabla-celda">{l.descuento ? `${l.descuento}%` : '—'}</td>
                  <td className="tabla-celda tabla-celda--monto text-positive">{fmt(l.precio_venta)}</td>
                  {canSeeCosts && (
                    <>
                      <td className="tabla-celda tabla-celda--monto">{fmt(l.costo_piedra_central)}</td>
                      <td className="tabla-celda tabla-celda--monto">{fmt(l.costo_piedra_lateral)}</td>
                      <td className="tabla-celda tabla-celda--monto">{fmt(l.costo_oro)}</td>
                      <td className="tabla-celda tabla-celda--monto">{fmt(l.costo_total)}</td>
                      <td className="tabla-celda tabla-celda--monto" style={{ color: (l.utilidad ?? 0) >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                        {fmt(l.utilidad)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ── Formulario captura de lote ─────────────────────────────
function LotesCaptura({
  sucursales,
  vendedores,
  perfil,
  canSeeCosts,
  onSuccess,
  onCancel,
}: {
  sucursales: Sucursal[]
  vendedores: Usuario[]
  perfil: Usuario | null
  canSeeCosts: boolean
  onSuccess: () => void
  onCancel: () => void
}) {
  const init = {
    fecha: hoy,
    sucursal_id: perfil?.sucursal_id ?? '',
    vendedor_id: perfil?.id ?? '',
    proveedor: '',
    oro: '',
    certificado: '',
    tipo_piedra_central: '',
    calidad: '',
    ct_central: '',
    tipo_piedra_lateral: '',
    ct_lateral: '',
    ctd_piedras: '',
    puntos: '',
    forma_corte: '',
    origen: '',
    notas: '',
    categoria: '',
    codigo: '',
    lote: '',
    folio: '',
    peso_oro: '',
    precio_lista: '',
    descuento: '',
    precio_venta: '',
    // costos (solo socio)
    costo_piedra_central: '',
    costo_piedra_lateral: '',
    costo_oro: '',
    costo_total: '',
    utilidad: '',
  }

  const [form, setForm] = useState(init)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    setError(null)
  }

  const n = (v: string) => v ? Number(v) : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.fecha) return setError('La fecha es requerida.')

    setLoading(true)
    const { error: err } = await supabase.from('lotes').insert({
      fecha: form.fecha,
      sucursal_id: form.sucursal_id || null,
      vendedor_id: form.vendedor_id || null,
      proveedor: form.proveedor || null,
      oro: form.oro || null,
      certificado: form.certificado || null,
      tipo_piedra_central: form.tipo_piedra_central || null,
      calidad: form.calidad || null,
      ct_central: n(form.ct_central),
      tipo_piedra_lateral: form.tipo_piedra_lateral || null,
      ct_lateral: n(form.ct_lateral),
      ctd_piedras: n(form.ctd_piedras),
      puntos: n(form.puntos),
      forma_corte: form.forma_corte || null,
      origen: form.origen || null,
      notas: form.notas || null,
      categoria: form.categoria || null,
      codigo: form.codigo || null,
      lote: form.lote || null,
      folio: form.folio || null,
      peso_oro: n(form.peso_oro),
      precio_lista: n(form.precio_lista),
      descuento: n(form.descuento),
      precio_venta: n(form.precio_venta),
      costo_piedra_central: canSeeCosts ? n(form.costo_piedra_central) : null,
      costo_piedra_lateral: canSeeCosts ? n(form.costo_piedra_lateral) : null,
      costo_oro: canSeeCosts ? n(form.costo_oro) : null,
      costo_total: canSeeCosts ? n(form.costo_total) : null,
      utilidad: canSeeCosts ? n(form.utilidad) : null,
    })

    if (err) setError(err.message)
    else onSuccess()
    setLoading(false)
  }

  return (
    <section className="card" style={{ maxWidth: 900 }}>
      <div className="card-header">
        <h3 className="card-title" style={{ marginBottom: 0 }}>Captura de lote</h3>
        <button className="btn-secondary btn-sm" onClick={onCancel}>Cancelar</button>
      </div>

      <form onSubmit={handleSubmit} className="captura-form">
        {/* Sección: Identificación */}
        <h4 style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Identificación</h4>
        <div className="form-grid-3">
          <F label="Fecha *"><input type="date" className="field-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} required /></F>
          <F label="Folio"><input type="text" className="field-input" value={form.folio} onChange={e => set('folio', e.target.value)} placeholder="Ej: F-001" /></F>
          <F label="Lote"><input type="text" className="field-input" value={form.lote} onChange={e => set('lote', e.target.value)} placeholder="Ej: L-2024" /></F>
          <F label="Código"><input type="text" className="field-input" value={form.codigo} onChange={e => set('codigo', e.target.value)} /></F>
          <F label="Categoría">
            <select className="field-input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
              <option value="">Selecciona...</option>
              {['Anillo','Aretes','Collar','Pulsera','Dije','Brazalete','Otro'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </F>
          <F label="Certificado"><input type="text" className="field-input" value={form.certificado} onChange={e => set('certificado', e.target.value)} /></F>
        </div>

        {/* Sección: Comercial */}
        <h4 style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginTop: 8 }}>Comercial</h4>
        <div className="form-grid-3">
          <F label="Sucursal">
            <select className="field-input" value={form.sucursal_id} onChange={e => set('sucursal_id', e.target.value)}>
              <option value="">Selecciona...</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </F>
          <F label="Vendedor">
            <select className="field-input" value={form.vendedor_id} onChange={e => set('vendedor_id', e.target.value)}>
              <option value="">Selecciona...</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </F>
          <F label="Proveedor"><input type="text" className="field-input" value={form.proveedor} onChange={e => set('proveedor', e.target.value)} /></F>
          <F label="Origen"><input type="text" className="field-input" value={form.origen} onChange={e => set('origen', e.target.value)} placeholder="Ej: India, Italia" /></F>
        </div>

        {/* Sección: Características */}
        <h4 style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginTop: 8 }}>Características de la pieza</h4>
        <div className="form-grid-3">
          <F label="Oro">
            <select className="field-input" value={form.oro} onChange={e => set('oro', e.target.value)}>
              <option value="">Selecciona...</option>
              {['Oro 10K','Oro 14K','Oro 18K','Oro 24K','Oro Blanco 14K','Oro Blanco 18K','Plata','Otro'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </F>
          <F label="Peso oro (g)"><input type="number" className="field-input" value={form.peso_oro} onChange={e => set('peso_oro', e.target.value)} placeholder="0.00" step="0.01" /></F>
          <F label="Tipo piedra central"><input type="text" className="field-input" value={form.tipo_piedra_central} onChange={e => set('tipo_piedra_central', e.target.value)} placeholder="Diamante, Rubí..." /></F>
          <F label="Calidad"><input type="text" className="field-input" value={form.calidad} onChange={e => set('calidad', e.target.value)} placeholder="Ej: VS1, SI2" /></F>
          <F label="Ct central"><input type="number" className="field-input" value={form.ct_central} onChange={e => set('ct_central', e.target.value)} placeholder="0.00" step="0.01" /></F>
          <F label="Tipo piedra lateral"><input type="text" className="field-input" value={form.tipo_piedra_lateral} onChange={e => set('tipo_piedra_lateral', e.target.value)} /></F>
          <F label="Ct lateral"><input type="number" className="field-input" value={form.ct_lateral} onChange={e => set('ct_lateral', e.target.value)} placeholder="0.00" step="0.01" /></F>
          <F label="Ctd piedras"><input type="number" className="field-input" value={form.ctd_piedras} onChange={e => set('ctd_piedras', e.target.value)} placeholder="0" step="1" /></F>
          <F label="Puntos"><input type="number" className="field-input" value={form.puntos} onChange={e => set('puntos', e.target.value)} placeholder="0" step="1" /></F>
          <F label="Forma / Corte"><input type="text" className="field-input" value={form.forma_corte} onChange={e => set('forma_corte', e.target.value)} placeholder="Ej: Redondo, Pera" /></F>
        </div>

        {/* Sección: Precios */}
        <h4 style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginTop: 8 }}>Precios</h4>
        <div className="form-grid-3">
          <F label="Precio lista"><input type="number" className="field-input" value={form.precio_lista} onChange={e => set('precio_lista', e.target.value)} placeholder="0.00" step="0.01" /></F>
          <F label="Descuento (%)"><input type="number" className="field-input" value={form.descuento} onChange={e => set('descuento', e.target.value)} placeholder="0" step="0.01" /></F>
          <F label="Precio venta"><input type="number" className="field-input" value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} placeholder="0.00" step="0.01" /></F>
        </div>

        {/* Sección: Costos (solo socio) */}
        {canSeeCosts && (
          <>
            <h4 style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginTop: 8 }}>
              Costos
              <span style={{ marginLeft: 8, background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>Solo Socio</span>
            </h4>
            <div className="form-grid-3">
              <F label="Costo piedra central"><input type="number" className="field-input" value={form.costo_piedra_central} onChange={e => set('costo_piedra_central', e.target.value)} placeholder="0.00" step="0.01" /></F>
              <F label="Costo piedra lateral"><input type="number" className="field-input" value={form.costo_piedra_lateral} onChange={e => set('costo_piedra_lateral', e.target.value)} placeholder="0.00" step="0.01" /></F>
              <F label="Costo oro"><input type="number" className="field-input" value={form.costo_oro} onChange={e => set('costo_oro', e.target.value)} placeholder="0.00" step="0.01" /></F>
              <F label="Costo total"><input type="number" className="field-input" value={form.costo_total} onChange={e => set('costo_total', e.target.value)} placeholder="0.00" step="0.01" /></F>
              <F label="Utilidad"><input type="number" className="field-input" value={form.utilidad} onChange={e => set('utilidad', e.target.value)} placeholder="0.00" step="0.01" /></F>
            </div>
          </>
        )}

        <div className="field-group">
          <label className="field-label">Notas</label>
          <textarea className="field-input field-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones adicionales..." rows={2} />
        </div>

        {error && <div className="form-error">⚠ {error}</div>}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar lote'}
          </button>
        </div>
      </form>
    </section>
  )
}

// Helper field wrapper
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}
