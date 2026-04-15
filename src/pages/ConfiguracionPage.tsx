import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Usuario, RolUsuario, Sucursal, CuentaBanco, CategoriaGasto, TipoCuenta, TipoCategoria } from '../types/database'

type Tab = 'usuarios' | 'cuentas' | 'sucursales' | 'categorias' | 'vendedores'

const ROL_LABELS: Record<RolUsuario, string> = {
  socio: 'Socio',
  administrador: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  contador: 'Contador',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

export default function ConfiguracionPage() {
  const { perfil, isSocioOrAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('usuarios')

  // All data loaded at once
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [cuentas, setCuentas] = useState<CuentaBanco[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [u, s, c, cat] = await Promise.all([
      supabase.from('usuarios').select('*, sucursales(*)').order('activo', { ascending: false }).order('nombre'),
      supabase.from('sucursales').select('*').order('nombre'),
      supabase.from('cuentas_banco').select('*').order('nombre'),
      supabase.from('categorias_gasto').select('*').order('tipo').order('nombre'),
    ])
    setUsuarios((u.data as Usuario[]) ?? [])
    setSucursales(s.data ?? [])
    setCuentas(c.data ?? [])
    setCategorias(cat.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (!isSocioOrAdmin) {
    return (
      <div className="proximamente">
        <div className="proximamente-icon">🔒</div>
        <h2 className="proximamente-titulo">Acceso restringido</h2>
        <p className="proximamente-texto">Esta sección es exclusiva para Socio y Administrador.</p>
      </div>
    )
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'usuarios',   label: 'Usuarios' },
    { id: 'vendedores', label: 'Vendedores' },
    { id: 'cuentas',    label: 'Cuentas' },
    { id: 'sucursales', label: 'Sucursales' },
    { id: 'categorias', label: 'Categorías' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Configuración</h1>
          <p className="modulo-subtitulo">Administración del sistema · Solo Socio y Administrador</p>
        </div>
        <div className="modulo-acciones">
          <button className="btn-icon" onClick={cargar} title="Recargar">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4a8 8 0 0112.2 1.4M16 16a8 8 0 01-12.2-1.4M4 8V4H0M16 12v4h4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="config-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`config-tab ${tab === t.id ? 'config-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-row">Cargando configuración...</div>
      ) : (
        <>
          {tab === 'usuarios'   && <TabUsuarios usuarios={usuarios} sucursales={sucursales} perfil={perfil} onRefresh={cargar} />}
          {tab === 'vendedores' && <TabVendedores usuarios={usuarios} sucursales={sucursales} onRefresh={cargar} />}
          {tab === 'cuentas'    && <TabCuentas cuentas={cuentas} onRefresh={cargar} />}
          {tab === 'sucursales' && <TabSucursales sucursales={sucursales} onRefresh={cargar} />}
          {tab === 'categorias' && <TabCategorias categorias={categorias} onRefresh={cargar} />}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB: USUARIOS
// ─────────────────────────────────────────────────────────────
function TabUsuarios({
  usuarios,
  sucursales,
  perfil,
  onRefresh,
}: {
  usuarios: Usuario[]
  sucursales: Sucursal[]
  perfil: Usuario | null
  onRefresh: () => void
}) {
  async function cambiarRol(userId: string, rol: RolUsuario) {
    await supabase.from('usuarios').update({ rol }).eq('id', userId)
    onRefresh()
  }
  async function cambiarSucursal(userId: string, sucursalId: string) {
    await supabase.from('usuarios').update({ sucursal_id: sucursalId || null }).eq('id', userId)
    onRefresh()
  }
  async function toggleUsuario(userId: string, activo: boolean) {
    await supabase.from('usuarios').update({ activo: !activo }).eq('id', userId)
    onRefresh()
  }

  const pendientes = usuarios.filter(u => !u.activo)
  const activos    = usuarios.filter(u => u.activo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Solicitudes pendientes */}
      {pendientes.length > 0 && (
        <section className="card" style={{ border: '1px solid rgba(224,152,40,0.35)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ marginBottom: 0, color: 'var(--gold)' }}>
              Solicitudes pendientes de activación
            </h3>
            <span style={{ background: 'rgba(201,153,42,0.15)', color: 'var(--gold)', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12 }}>
              {pendientes.length}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Estos usuarios confirmaron su correo y esperan activación. Asigna rol y sucursal antes de activar.
          </p>
          <div className="admin-list">
            {pendientes.map(u => (
              <div key={u.id} className="admin-list-item">
                <div style={{ flex: 1 }}>
                  <span className="admin-list-item-label">{u.nombre}</span>
                  <span className="admin-list-item-sub" style={{ display: 'block' }}>{u.email}</span>
                </div>
                <select
                  className="filtro-input"
                  style={{ fontSize: 12, padding: '4px 8px', maxWidth: 130 }}
                  value={u.rol}
                  onChange={e => cambiarRol(u.id, e.target.value as RolUsuario)}
                >
                  {Object.entries(ROL_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select
                  className="filtro-input"
                  style={{ fontSize: 12, padding: '4px 8px', maxWidth: 160 }}
                  value={u.sucursal_id ?? ''}
                  onChange={e => cambiarSucursal(u.id, e.target.value)}
                >
                  <option value="">Sin sucursal</option>
                  {sucursales.filter(s => s.activo).map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
                <button className="btn-primary btn-sm" onClick={() => toggleUsuario(u.id, false)}>
                  Activar acceso
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Usuarios activos */}
      <section className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ marginBottom: 0 }}>Usuarios del sistema</h3>
          <span className="card-count">{activos.length} activos</span>
        </div>
        <div className="tabla-wrapper">
          <table className="tabla">
            <thead>
              <tr>
                <th className="tabla-th">Nombre</th>
                <th className="tabla-th">Correo</th>
                <th className="tabla-th">Rol</th>
                <th className="tabla-th">Sucursal</th>
                <th className="tabla-th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {activos.map(u => (
                <tr key={u.id} className="tabla-fila">
                  <td className="tabla-celda" style={{ fontWeight: 600 }}>{u.nombre}</td>
                  <td className="tabla-celda tabla-celda--desc">{u.email}</td>
                  <td className="tabla-celda">
                    <select
                      className="filtro-input"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={u.rol}
                      disabled={perfil?.rol !== 'socio' && u.rol === 'socio'}
                      onChange={e => cambiarRol(u.id, e.target.value as RolUsuario)}
                    >
                      {Object.entries(ROL_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="tabla-celda">
                    <select
                      className="filtro-input"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={u.sucursal_id ?? ''}
                      onChange={e => cambiarSucursal(u.id, e.target.value)}
                    >
                      <option value="">Sin sucursal</option>
                      {sucursales.filter(s => s.activo).map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td className="tabla-celda">
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => toggleUsuario(u.id, true)}
                      disabled={u.id === perfil?.id}
                    >
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB: VENDEDORES
// ─────────────────────────────────────────────────────────────
function TabVendedores({
  usuarios,
  sucursales,
  onRefresh,
}: {
  usuarios: Usuario[]
  sucursales: Sucursal[]
  onRefresh: () => void
}) {
  const vendedores = usuarios.filter(u =>
    u.activo && ['socio','administrador','gerente','vendedor'].includes(u.rol)
  )

  const initiales = (nombre: string) =>
    nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const ROL_BADGE_CLASS: Record<string, string> = {
    socio:         'badge-role--socio',
    administrador: 'badge-role--administrador',
    gerente:       'badge-role--gerente',
    vendedor:      'badge-role--vendedor',
  }

  async function cambiarSucursal(userId: string, sucursalId: string) {
    await supabase.from('usuarios').update({ sucursal_id: sucursalId || null }).eq('id', userId)
    onRefresh()
  }

  return (
    <section className="card">
      <div className="card-header">
        <h3 className="card-title" style={{ marginBottom: 0 }}>Vendedores del equipo</h3>
        <span className="card-count">{vendedores.length} activos</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
        Lista de personas habilitadas para registrar ventas en Lotes. Para agregar un vendedor, regístralo en la pestaña Usuarios y asígnale rol Vendedor o Gerente.
      </p>
      <div className="vendedor-list">
        {vendedores.length === 0 ? (
          <div className="empty-state">Sin vendedores activos</div>
        ) : (
          vendedores.map(v => (
            <div key={v.id} className="vendedor-row">
              <div className="vendedor-avatar">{initiales(v.nombre)}</div>
              <div className="vendedor-info">
                <span className="vendedor-nombre">{v.nombre}</span>
                <span className="vendedor-meta">{v.email}</span>
              </div>
              <span className={`badge-role ${ROL_BADGE_CLASS[v.rol] ?? ''}`}>
                {ROL_LABELS[v.rol]}
              </span>
              <select
                className="filtro-input"
                style={{ fontSize: 12, padding: '4px 8px', maxWidth: 180 }}
                value={v.sucursal_id ?? ''}
                onChange={e => cambiarSucursal(v.id, e.target.value)}
              >
                <option value="">Sin sucursal</option>
                {sucursales.filter(s => s.activo).map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB: CUENTAS
// ─────────────────────────────────────────────────────────────
function TabCuentas({ cuentas, onRefresh }: { cuentas: CuentaBanco[]; onRefresh: () => void }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoCuenta>('banco')
  const [saldoMin, setSaldoMin] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agregar() {
    if (!nombre.trim()) return setError('Escribe el nombre de la cuenta.')
    setLoading(true)
    const { error: err } = await supabase.from('cuentas_banco').insert({
      nombre: nombre.trim(), tipo, moneda: 'MXN',
      saldo_actual: 0, saldo_minimo: Number(saldoMin) || 0, activo: true,
    })
    if (err) setError(err.message)
    else { setNombre(''); setSaldoMin('0'); setError(null); onRefresh() }
    setLoading(false)
  }

  async function toggleCuenta(id: string, activo: boolean) {
    await supabase.from('cuentas_banco').update({ activo: !activo }).eq('id', id)
    onRefresh()
  }

  async function actualizarSaldo(id: string, saldo: number) {
    await supabase.from('cuentas_banco').update({ saldo_actual: saldo }).eq('id', id)
    onRefresh()
  }

  return (
    <section className="card">
      <div className="card-header">
        <h3 className="card-title" style={{ marginBottom: 0 }}>Cuentas bancarias / Cajas</h3>
        <span className="card-count">{cuentas.filter(c => c.activo).length} activas</span>
      </div>

      {/* Lista */}
      <div className="admin-list" style={{ marginBottom: 24 }}>
        {cuentas.map(c => (
          <CuentaRow
            key={c.id}
            cuenta={c}
            onToggle={() => toggleCuenta(c.id, c.activo)}
            onSaldoUpdate={s => actualizarSaldo(c.id, s)}
          />
        ))}
      </div>

      <div className="divider" />

      {/* Agregar */}
      <h4 className="config-section-label" style={{ marginTop: 16 }}>Nueva cuenta</h4>
      <div className="form-grid-3" style={{ marginBottom: 16 }}>
        <div className="field-group">
          <label className="field-label">Nombre</label>
          <input type="text" className="field-input" value={nombre}
            onChange={e => setNombre(e.target.value)} placeholder="Ej: BBVA Sumefra" />
        </div>
        <div className="field-group">
          <label className="field-label">Tipo</label>
          <select className="field-input" value={tipo} onChange={e => setTipo(e.target.value as TipoCuenta)}>
            <option value="banco">Banco</option>
            <option value="efectivo">Efectivo / Caja</option>
            <option value="terminal">Terminal (Clip, Kashpay)</option>
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Saldo mínimo</label>
          <input type="number" className="field-input" value={saldoMin}
            onChange={e => setSaldoMin(e.target.value)} placeholder="0" min="0" step="100" />
        </div>
      </div>
      {error && <div className="form-error" style={{ marginBottom: 12 }}>⚠ {error}</div>}
      <button className="btn-primary" onClick={agregar} disabled={loading}>
        {loading ? 'Guardando...' : '+ Agregar cuenta'}
      </button>
    </section>
  )
}

function CuentaRow({
  cuenta, onToggle, onSaldoUpdate,
}: { cuenta: CuentaBanco; onToggle: () => void; onSaldoUpdate: (s: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(String(cuenta.saldo_actual))

  function guardar() {
    const val = parseFloat(input)
    if (!isNaN(val)) onSaldoUpdate(val)
    setEditing(false)
  }

  return (
    <div className="admin-list-item" style={{ opacity: cuenta.activo ? 1 : 0.45 }}>
      <div style={{ flex: 1 }}>
        <span className="admin-list-item-label">{cuenta.nombre}</span>
        <span className="admin-list-item-sub" style={{ display: 'block' }}>
          {cuenta.tipo} · {cuenta.moneda}
        </span>
      </div>
      <div className="inline-edit">
        {editing ? (
          <>
            <input type="number" className="inline-input" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus />
            <button className="btn-primary btn-sm" onClick={guardar}>✓</button>
          </>
        ) : (
          <button
            onClick={() => { setEditing(true); setInput(String(cuenta.saldo_actual)) }}
            style={{ background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '4px 10px', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
            title="Clic para editar saldo"
          >
            {fmt(cuenta.saldo_actual)}
          </button>
        )}
      </div>
      <button className={cuenta.activo ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'} onClick={onToggle}>
        {cuenta.activo ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB: SUCURSALES
// ─────────────────────────────────────────────────────────────
function TabSucursales({ sucursales, onRefresh }: { sucursales: Sucursal[]; onRefresh: () => void }) {
  const [nombre, setNombre] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agregar() {
    if (!nombre.trim()) return setError('Escribe el nombre de la sucursal.')
    setLoading(true)
    const { error: err } = await supabase.from('sucursales').insert({
      nombre: nombre.trim(), ciudad: ciudad.trim() || 'México', activo: true,
    })
    if (err) setError(err.message)
    else { setNombre(''); setCiudad(''); setError(null); onRefresh() }
    setLoading(false)
  }

  async function toggleSucursal(id: string, activo: boolean) {
    await supabase.from('sucursales').update({ activo: !activo }).eq('id', id)
    onRefresh()
  }

  return (
    <section className="card">
      <div className="card-header">
        <h3 className="card-title" style={{ marginBottom: 0 }}>Sucursales</h3>
        <span className="card-count">{sucursales.filter(s => s.activo).length} activas</span>
      </div>

      <div className="admin-list" style={{ marginBottom: 24 }}>
        {sucursales.map(s => (
          <div key={s.id} className="admin-list-item" style={{ opacity: s.activo ? 1 : 0.45 }}>
            <div style={{ flex: 1 }}>
              <span className="admin-list-item-label">{s.nombre}</span>
              <span className="admin-list-item-sub" style={{ display: 'block' }}>{s.ciudad}</span>
            </div>
            <button className={s.activo ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}
              onClick={() => toggleSucursal(s.id, s.activo)}>
              {s.activo ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        ))}
      </div>

      <div className="divider" />

      <h4 className="config-section-label" style={{ marginTop: 16 }}>Nueva sucursal</h4>
      <div className="form-grid-3" style={{ marginBottom: 16 }}>
        <div className="field-group">
          <label className="field-label">Nombre</label>
          <input type="text" className="field-input" value={nombre}
            onChange={e => setNombre(e.target.value)} placeholder="Ej: Anubis Centro" />
        </div>
        <div className="field-group">
          <label className="field-label">Ciudad</label>
          <input type="text" className="field-input" value={ciudad}
            onChange={e => setCiudad(e.target.value)} placeholder="Ej: Guadalajara" />
        </div>
      </div>
      {error && <div className="form-error" style={{ marginBottom: 12 }}>⚠ {error}</div>}
      <button className="btn-primary" onClick={agregar} disabled={loading}>
        {loading ? 'Guardando...' : '+ Agregar sucursal'}
      </button>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB: CATEGORÍAS
// ─────────────────────────────────────────────────────────────
function TabCategorias({ categorias, onRefresh }: { categorias: CategoriaGasto[]; onRefresh: () => void }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoCategoria>('egreso')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<TipoCategoria | 'todos'>('todos')

  async function agregar() {
    if (!nombre.trim()) return setError('Escribe el nombre de la categoría.')
    setLoading(true)
    const { error: err } = await supabase.from('categorias_gasto').insert({
      nombre: nombre.trim(), tipo, activo: true,
    })
    if (err) setError(err.message)
    else { setNombre(''); setError(null); onRefresh() }
    setLoading(false)
  }

  async function toggle(id: string, activo: boolean) {
    await supabase.from('categorias_gasto').update({ activo: !activo }).eq('id', id)
    onRefresh()
  }

  const lista = categorias.filter(c => filtro === 'todos' ? true : c.tipo === filtro)

  return (
    <section className="card">
      <div className="card-header">
        <h3 className="card-title" style={{ marginBottom: 0 }}>Categorías de transacción</h3>
        <span className="card-count">{categorias.filter(c => c.activo).length} activas</span>
      </div>

      {/* Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end', marginBottom: 16 }}>
        <div className="field-group">
          <label className="field-label">Nueva categoría</label>
          <input type="text" className="field-input" value={nombre}
            onChange={e => { setNombre(e.target.value); setError(null) }}
            placeholder="Nombre de la categoría..."
            onKeyDown={e => e.key === 'Enter' && agregar()} />
        </div>
        <div className="field-group">
          <label className="field-label">Tipo</label>
          <select className="field-input" value={tipo} onChange={e => setTipo(e.target.value as TipoCategoria)}>
            <option value="egreso">Egreso</option>
            <option value="ingreso">Ingreso</option>
          </select>
        </div>
        <button className="btn-primary" onClick={agregar} disabled={loading} style={{ height: 38 }}>
          {loading ? '...' : '+ Agregar'}
        </button>
      </div>
      {error && <div className="form-error" style={{ marginBottom: 12 }}>⚠ {error}</div>}

      {/* Filtro */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['todos', 'egreso', 'ingreso'] as const).map(t => (
          <button key={t} className={`tab-btn ${filtro === t ? 'tab-btn--active' : ''}`}
            onClick={() => setFiltro(t)} style={{ fontSize: 12 }}>
            {t === 'todos' ? 'Todas' : t === 'egreso' ? 'Egresos' : 'Ingresos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="admin-list">
        {lista.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Sin categorías</div>
        ) : (
          lista.map(cat => (
            <div key={cat.id} className="admin-list-item" style={{ opacity: cat.activo ? 1 : 0.45 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                  background: cat.tipo === 'egreso' ? 'rgba(224,85,85,0.12)' : 'rgba(76,175,110,0.12)',
                  color: cat.tipo === 'egreso' ? 'var(--negative)' : 'var(--positive)',
                }}>
                  {cat.tipo === 'egreso' ? '↓ Egreso' : '↑ Ingreso'}
                </span>
                <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>{cat.nombre}</span>
                {!cat.activo && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>(desactivada)</span>}
              </div>
              <button className={`btn-secondary btn-sm`} onClick={() => toggle(cat.id, cat.activo)}>
                {cat.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))
        )}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 12 }}>
        Las categorías desactivadas no aparecen en el formulario de captura de transacciones.
      </p>
    </section>
  )
}
