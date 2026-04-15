import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Usuario, Sucursal } from '../../types/database'

type Periodo = 'dia' | 'mes' | 'anio'

const hoy = new Date().toISOString().split('T')[0]
const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n)

function periodoFechas(p: Periodo) {
  const now = new Date()
  if (p === 'dia') return { inicio: hoy, fin: hoy }
  if (p === 'mes') {
    return { inicio: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], fin: hoy }
  }
  return { inicio: `${now.getFullYear()}-01-01`, fin: hoy }
}

interface VendedorComision {
  usuario: Usuario
  porcentaje: number
  comision_id: string | null
  ventas_total: number
  comision_total: number
}

export default function ComisionesDashboard() {
  const { isSocioOrAdmin } = useAuth()
  const [vendedores, setVendedores] = useState<VendedorComision[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [modalAgregar, setModalAgregar] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { inicio, fin } = periodoFechas(periodo)

    // Cargar usuarios vendedores/gerentes
    const { data: users } = await supabase
      .from('usuarios')
      .select('*, sucursales(*)')
      .in('rol', ['vendedor', 'gerente'])
      .eq('activo', true)
      .order('nombre')

    // Cargar configuraciones de comisión
    const { data: comisiones } = await supabase
      .from('comisiones_vendedor')
      .select('*')
      .eq('activo', true)

    // Cargar ventas del período
    const { data: lotes } = await supabase
      .from('lotes')
      .select('vendedor_id, precio_venta')
      .gte('fecha', inicio)
      .lte('fecha', fin)

    const comisionMap: Record<string, { porcentaje: number; id: string }> = {}
    for (const c of comisiones ?? []) {
      comisionMap[c.vendedor_id] = { porcentaje: c.porcentaje, id: c.id }
    }

    const ventasPorVendedor: Record<string, number> = {}
    for (const l of lotes ?? []) {
      if (l.vendedor_id) {
        ventasPorVendedor[l.vendedor_id] = (ventasPorVendedor[l.vendedor_id] ?? 0) + (l.precio_venta ?? 0)
      }
    }

    const result: VendedorComision[] = (users ?? []).map(u => {
      const conf = comisionMap[u.id]
      const pct = conf?.porcentaje ?? 0
      const ventas = ventasPorVendedor[u.id] ?? 0
      return {
        usuario: u as Usuario,
        porcentaje: pct,
        comision_id: conf?.id ?? null,
        ventas_total: ventas,
        comision_total: ventas * (pct / 100),
      }
    })

    setVendedores(result)
    setLoading(false)
  }, [periodo])

  useEffect(() => {
    cargar()
    supabase.from('sucursales').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setSucursales(data ?? []))
  }, [cargar])

  async function actualizarPorcentaje(vendedorId: string, comisionId: string | null, pct: number) {
    setSaving(vendedorId)
    try {
      if (comisionId) {
        await supabase.from('comisiones_vendedor').update({ porcentaje: pct }).eq('id', comisionId)
      } else {
        await supabase.from('comisiones_vendedor').insert({
          vendedor_id: vendedorId,
          porcentaje: pct,
          activo: true,
        })
      }
      cargar()
    } finally {
      setSaving(null)
    }
  }

  async function toggleVendedor(vendedorId: string, activo: boolean) {
    await supabase.from('usuarios').update({ activo: !activo }).eq('id', vendedorId)
    cargar()
  }

  const totalComisiones = vendedores.reduce((a, v) => a + v.comision_total, 0)
  const totalVentas = vendedores.reduce((a, v) => a + v.ventas_total, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Comisiones</h1>
          <p className="modulo-subtitulo">Control de comisiones por vendedor</p>
        </div>
        <div className="modulo-acciones">
          <div className="period-toggle">
            {(['dia','mes','anio'] as Periodo[]).map(p => (
              <button key={p} className={`period-btn ${periodo === p ? 'period-btn--active' : ''}`}
                onClick={() => setPeriodo(p)}>
                {p === 'dia' ? 'Hoy' : p === 'mes' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
          {isSocioOrAdmin && (
            <button className="btn-secondary btn-sm" onClick={() => setModalAgregar(true)}>
              + Vendedor
            </button>
          )}
          <button className="btn-icon" onClick={cargar} title="Recargar">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4a8 8 0 0112.2 1.4M16 16a8 8 0 01-12.2-1.4M4 8V4H0M16 12v4h4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card kpi-card--default">
          <div className="kpi-titulo">Vendedores activos</div>
          <div className="kpi-valor">{vendedores.length}</div>
        </div>
        <div className="kpi-card kpi-card--positive">
          <div className="kpi-titulo">Ventas totales</div>
          <div className="kpi-valor" style={{ fontSize: 18 }}>{fmt(totalVentas)}</div>
          <div className="kpi-desc">Período seleccionado</div>
        </div>
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-titulo">Total comisiones</div>
          <div className="kpi-valor" style={{ fontSize: 18 }}>{fmt(totalComisiones)}</div>
          <div className="kpi-desc">Por pagar</div>
        </div>
      </div>

      {/* Lista de vendedores */}
      <section className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ marginBottom: 0 }}>Comisiones por vendedor</h3>
          <span className="card-count">{vendedores.length} vendedores</span>
        </div>

        {loading ? (
          <div className="loading-row">Cargando comisiones...</div>
        ) : vendedores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">◇</div>
            Sin vendedores registrados
          </div>
        ) : (
          vendedores.map(v => (
            <div key={v.usuario.id} className="comision-row">
              <div style={{ flex: 1 }}>
                <div className="comision-name">{v.usuario.nombre}</div>
                <div className="comision-sucursal">
                  {(v.usuario as any).sucursales?.nombre ?? 'Sin sucursal'} · {v.usuario.rol}
                </div>
              </div>

              {/* % editable */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>%</span>
                <input
                  type="number"
                  className="comision-pct-input"
                  defaultValue={v.porcentaje}
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={!isSocioOrAdmin || saving === v.usuario.id}
                  onBlur={e => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val) && val !== v.porcentaje) {
                      actualizarPorcentaje(v.usuario.id, v.comision_id, val)
                    }
                  }}
                />
                {saving === v.usuario.id && (
                  <span style={{ fontSize: 11, color: 'var(--gold)' }}>...</span>
                )}
              </div>

              {/* Ventas */}
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ventas</div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{fmt(v.ventas_total)}</div>
              </div>

              {/* Comisión calculada */}
              <div className="comision-total">
                <div className="comision-total-label">Comisión</div>
                <div className="comision-total-amount">{fmt(v.comision_total)}</div>
              </div>

              {isSocioOrAdmin && (
                <button
                  className="btn-danger btn-sm"
                  onClick={() => toggleVendedor(v.usuario.id, v.usuario.activo)}
                  title={v.usuario.activo ? 'Desactivar vendedor' : 'Activar vendedor'}
                >
                  {v.usuario.activo ? 'Desactivar' : 'Activar'}
                </button>
              )}
            </div>
          ))
        )}
      </section>

      {/* Modal agregar vendedor */}
      {modalAgregar && (
        <AgregarVendedorModal
          sucursales={sucursales}
          onClose={() => setModalAgregar(false)}
          onSuccess={() => { setModalAgregar(false); cargar() }}
        />
      )}
    </div>
  )
}

// ── Modal agregar vendedor ─────────────────────────────────
function AgregarVendedorModal({ sucursales, onClose, onSuccess }: {
  sucursales: Sucursal[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [rol, setRol] = useState<'vendedor' | 'gerente'>('vendedor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!nombre.trim() || !email.trim()) return setError('Nombre y correo son requeridos.')
    setLoading(true)
    try {
      // Agregar email autorizado para que pueda registrarse
      const { error: err } = await supabase.from('email_autorizados').insert({
        email: email.toLowerCase().trim(),
        activo: true,
        creado_por: null,
      })

      if (err && !err.message.includes('duplicate') && !err.message.includes('unique')) {
        setError(err.message)
        return
      }

      // Si ya existe usuario, actualizar rol y sucursal
      const { data: existing } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (existing) {
        await supabase.from('usuarios').update({
          nombre: nombre.trim(),
          rol,
          sucursal_id: sucursalId || null,
        }).eq('id', existing.id)
      }

      onSuccess()
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Agregar vendedor</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field-group">
            <label className="field-label">Nombre completo</label>
            <input type="text" className="field-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del vendedor" />
          </div>
          <div className="field-group">
            <label className="field-label">Correo electrónico</label>
            <input type="email" className="field-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="vendedor@sumefra.com" />
          </div>
          <div className="field-group">
            <label className="field-label">Rol</label>
            <select className="field-input" value={rol} onChange={e => setRol(e.target.value as 'vendedor' | 'gerente')}>
              <option value="vendedor">Vendedor</option>
              <option value="gerente">Gerente</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Sucursal</label>
            <select className="field-input" value={sucursalId} onChange={e => setSucursalId(e.target.value)}>
              <option value="">Sin sucursal</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Al agregar el correo, quedará autorizado para registrarse en el sistema.
          </p>
        </div>

        {error && <div className="form-error" style={{ marginTop: 12 }}>⚠ {error}</div>}

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={loading}>
            {loading ? 'Guardando...' : 'Autorizar y agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}
