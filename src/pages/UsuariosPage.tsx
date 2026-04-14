import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Usuario, RolUsuario, Sucursal } from '../types/database'
import AdminSucursales from '../modules/finanzas/AdminSucursales'

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
  const { isSocioOrAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalSucursales, setModalSucursales] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [u, s] = await Promise.all([
      supabase.from('usuarios').select('*, sucursales(*)').order('activo', { ascending: false }).order('nombre'),
      supabase.from('sucursales').select('*').order('nombre'),
    ])
    setUsuarios((u.data as Usuario[]) ?? [])
    setSucursales(s.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

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

  const pendientes = usuarios.filter(u => !u.activo)
  const activos    = usuarios.filter(u => u.activo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Usuarios</h1>
          <p className="modulo-subtitulo">
            {pendientes.length > 0
              ? `${pendientes.length} solicitud${pendientes.length > 1 ? 'es' : ''} pendiente${pendientes.length > 1 ? 's' : ''} de activación`
              : 'Gestión de accesos y permisos'}
          </p>
        </div>
        <div className="modulo-acciones">
          {isSocioOrAdmin && (
            <button className="btn-secondary btn-sm" onClick={() => setModalSucursales(true)}>
              Sucursales
            </button>
          )}
          <button className="btn-icon" onClick={cargar} title="Recargar">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4a8 8 0 0112.2 1.4M16 16a8 8 0 01-12.2-1.4M4 8V4H0M16 12v4h4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Solicitudes pendientes */}
      {pendientes.length > 0 && (
        <section className="card" style={{ border: '1px solid rgba(224,152,40,0.35)', marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title" style={{ marginBottom: 0, color: 'var(--gold)' }}>
              Solicitudes pendientes de activación
            </h3>
            <span className="badge" style={{ background: 'rgba(201,153,42,0.15)', color: 'var(--gold)' }}>
              {pendientes.length}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Estos usuarios confirmaron su correo y esperan que actives su cuenta.
          </p>
          <div className="admin-list">
            {pendientes.map(u => (
              <div key={u.id} className="admin-list-item">
                <div style={{ flex: 1 }}>
                  <span className="admin-list-item-label">{u.nombre}</span>
                  <span className="admin-list-item-sub" style={{ display: 'block' }}>{u.email}</span>
                </div>
                {isSocioOrAdmin && (
                  <>
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
                  </>
                )}
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
                {activos.map(u => (
                  <tr key={u.id} className="tabla-fila">
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
                          {sucursales.filter(s => s.activo).map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                          {(u as any).sucursales?.nombre ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="tabla-celda">
                      <span className="badge" style={{
                        background: 'rgba(76,175,110,0.1)',
                        color: 'var(--positive)',
                      }}>
                        Activo
                      </span>
                    </td>
                    {isSocioOrAdmin && (
                      <td className="tabla-celda">
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => toggleUsuario(u.id, true)}
                        >
                          Desactivar
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

      {/* Modal sucursales */}
      {modalSucursales && (
        <AdminSucursales
          sucursales={sucursales}
          onClose={() => setModalSucursales(false)}
          onRefresh={cargar}
        />
      )}
    </div>
  )
}
