import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ROL_LABELS: Record<string, string> = {
  socio:         'Socio',
  administrador: 'Administrador',
  gerente:       'Gerente',
  vendedor:      'Vendedor',
  contador:      'Contador',
}

const ROL_COLORS: Record<string, string> = {
  socio:         'var(--gold)',
  administrador: '#7C9EF8',
  gerente:       '#6EE7B7',
  vendedor:      '#FCA5A5',
  contador:      '#D9B5FF',
}

export default function Topbar() {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleSignOut() {
    navigate('/login')
    signOut()
  }

  const rolLabel = perfil?.rol ? ROL_LABELS[perfil.rol] : ''
  const rolColor = perfil?.rol ? ROL_COLORS[perfil.rol] : 'var(--gold)'

  const initiales = perfil?.nombre
    ? perfil.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <header className="topbar">
      {/* Título de la página actual */}
      <div className="topbar-left">
        <h2 className="topbar-title">SUMEFRA OS</h2>
        <span className="topbar-subtitle">Sistema ERP Joyería</span>
      </div>

      {/* Info de usuario */}
      <div className="topbar-right">
        <div className="topbar-date">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </div>

        <div className="topbar-user" onClick={() => setMenuOpen(o => !o)}>
          <div className="topbar-avatar">{initiales}</div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{perfil?.nombre ?? 'Cargando...'}</span>
            <span className="topbar-user-rol" style={{ color: rolColor }}>
              {rolLabel}
            </span>
          </div>
          <span className="topbar-chevron">{menuOpen ? '▲' : '▼'}</span>
        </div>

        {/* Dropdown */}
        {menuOpen && (
          <div className="topbar-dropdown">
            <div className="topbar-dropdown-header">
              <span className="topbar-dropdown-email">{perfil?.email}</span>
            </div>
            <button
              className="topbar-dropdown-item topbar-dropdown-item--danger"
              onClick={handleSignOut}
            >
              ↩ Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
