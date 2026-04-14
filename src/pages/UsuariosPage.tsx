import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Usuario, EmailAutorizado, RolUsuario, Sucursal } from '../types/database'

const ROL_LABELS: Record<RolUsuario, string> = {
  socio: 'Socio',
  administrador: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  contador: 'Contador',
}

const ROL_COLORS: Record<RolUsuario, string> = {
  socio: 'var(--gold)',
  administrador: 'var(--info)',
  gerente: 'var(--warning)',
  vendedor: 'var(--positive)',
  contador: 'var(--text-muted)',
}

export default function UsuariosPage() {
  const { isSocioOrAdmin, perfil } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [emailsAuth, setEmailsAuth] = useState<EmailAutorizado[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'usuarios' | 'accesos'>('usuarios')

  // Form para nuevo email autorizado
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [u, e, s] = await Promise.all([
      supabase.from('usuarios').select('*, sucursales(*)').order('nombre'),
      supabase.from('email_autorizados').select('*').order('created_at', { ascending: false }),
      supabase.from('sucursales').select('*').eq('activo', true).order('nombre'),
    ])
    setUsuarios((u.data as Usuario[]) ?? [])
    setEmailsAuth((e.data as EmailAutorizado[]) ?? [])
    setSucursales(s.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function agregarEmail() {
    if (!nuevoEmail.trim()) return setEmailError('Escribe el correo.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoEmail)) return setEmailError('Correo inválido.')
    setAddingEmail(true)
    const { error: err } = await supabase.from('email_autorizados').insert({
      email: nuevoEmail.toLowerCase().trim(),
      activo: true,
      creado_por: perfil?.id ?? null,
    })
    if (err) setEmailError(err.message.includes('duplicate') ? 'Ese correo ya está autorizado.' : err.message)
    else {
      setNuevoEmail('')
      setEmailError(null)
      cargar()
    }
    setAddingEmail(false)
  }

  async function toggleEmail(id: string, activo: boolean) {
    await supabase.from('email_autorizados').update({ activo: !activo }).eq('id', id)
    cargar()
  }

  async function cambiarRol(userId: string, rol: RolUsuario) {
    await supabase.from('usuarios').update({ rol }).eq('id', userId)
    cargar()
  }

  async function cambiarSucursal(userId: string, sucursalId: string) {
    await supabase.from('usuarios').update({ sucursal_id: sucursalId || null }).eq('id', userId)
    cargar()
  }

  async function toggleUsuario(userId: string, activo: boolean) {
    await supabase.from('usuarios').update({ activo: !activo }).eq('id', userId)
    cargar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Usuarios</h1>
          <p className="modulo-subtitulo">Gestión de accesos y permisos del sistema</p>
        </div>
        <div className="modulo-acciones">
          <button className={`tab-btn ${tab === 'usuarios' ? 'tab-btn--active' : ''}`}
            onClick={() => setTab('usuarios')}>Usuarios</button>
          {isSocioOrAdmin && (
            <button className={`tab-btn ${tab === 'accesos' ? 'tab-btn--active' : ''}`}
              onClick={() => setTab('accesos')}>Correos autorizados</button>
          )}
          <button className="btn-icon" onClick={cargar} title="Recargar">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4a8 8 0 0112.2 1.4M16 16a8 8 0 01-12.2-1.4M4 8V4H0M16 12v4h4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Usuarios tab */}
      {tab === 'usuarios' && (
        <section className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ marginBottom: 0 }}>Usuarios del sistema</h3>
            <span className="card-count">{usuarios.filter(u => u.activo).length} activos</span>
          </div>
          {loading ? (
            <div className="loading-row">Cargando usuarios...</div>
          ) : (
            <div className="tabla-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th className="tabla-th">Nombre</th>
                    <th className="tabla-th">Correo</th>
                    <th className="tabla-th">Rol</th>
                    <th className="tabla-th">Sucursal</th>
                    <th className="tabla-th">Estado</th>
                    {isSocioOrAdmin && <th className="tabla-th">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} className="tabla-fila" style={{ opacity: u.activo ? 1 : 0.5 }}>
                      <td className="tabla-celda" style={{ fontWeight: 600 }}>{u.nombre}</td>
                      <td className="tabla-celda tabla-celda--desc">{u.email}</td>
                      <td className="tabla-celda">
                        {isSocioOrAdmin ? (
                          <select
                            className="filtro-input"
                            style={{ fontSize: 12, padding: '4px 8px', color: ROL_COLORS[u.rol] }}
                            value={u.rol}
                            onChange={e => cambiarRol(u.id, e.target.value as RolUsuario)}
                          >
                            {Object.entries(ROL_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="badge" style={{ color: ROL_COLORS[u.rol], background: `${ROL_COLORS[u.rol]}18` }}>
                            {ROL_LABELS[u.rol]}
                          </span>
                        )}
                      </td>
                      <td className="tabla-celda">
                        {isSocioOrAdmin ? (
                          <select
                            className="filtro-input"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            value={u.sucursal_id ?? ''}
                            onChange={e => cambiarSucursal(u.id, e.target.value)}
                          >
                            <option value="">Sin sucursal</option>
                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                          </select>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            {(u as any).sucursales?.nombre ?? '—'}
                          </span>
                        )}
                      </td>
                      <td className="tabla-celda">
                        <span className="badge" style={{
                          background: u.activo ? 'rgba(76,175,110,0.1)' : 'rgba(80,80,112,0.1)',
                          color: u.activo ? 'var(--positive)' : 'var(--text-dim)',
                        }}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {isSocioOrAdmin && (
                        <td className="tabla-celda">
                          <button
                            className={u.activo ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}
                            onClick={() => toggleUsuario(u.id, u.activo)}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Correos autorizados tab */}
      {tab === 'accesos' && isSocioOrAdmin && (
        <section className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ marginBottom: 0 }}>Correos autorizados</h3>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Solo los correos aquí registrados pueden crear cuenta
            </span>
          </div>

          {/* Agregar nuevo */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input
              type="email"
              className="field-input"
              style={{ maxWidth: 340 }}
              value={nuevoEmail}
              onChange={e => { setNuevoEmail(e.target.value); setEmailError(null) }}
              placeholder="correo@ejemplo.com"
              onKeyDown={e => e.key === 'Enter' && agregarEmail()}
            />
            <button className="btn-primary" onClick={agregarEmail} disabled={addingEmail}>
              {addingEmail ? 'Autorizando...' : '+ Autorizar correo'}
            </button>
          </div>

          {emailError && <div className="form-error" style={{ marginBottom: 12 }}>⚠ {emailError}</div>}

          <div className="admin-list">
            {emailsAuth.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>Sin correos autorizados</div>
            ) : (
              emailsAuth.map(e => (
                <div key={e.id} className="admin-list-item" style={{ opacity: e.activo ? 1 : 0.5 }}>
                  <div style={{ flex: 1 }}>
                    <span className="admin-list-item-label">{e.email}</span>
                    <span className="admin-list-item-sub" style={{ display: 'block' }}>
                      Agregado: {new Date(e.created_at).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                  <span className="badge" style={{
                    background: e.activo ? 'rgba(76,175,110,0.1)' : 'rgba(80,80,112,0.1)',
                    color: e.activo ? 'var(--positive)' : 'var(--text-dim)',
                  }}>
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    className={e.activo ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}
                    onClick={() => toggleEmail(e.id, e.activo)}
                  >
                    {e.activo ? 'Revocar' : 'Restaurar'}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}
