import { NavLink } from 'react-router-dom'
import { useAuth, type ModuloPermiso } from '../../contexts/AuthContext'

// SVG Icons
const Icons = {
  finanzas: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="16" height="12" rx="2"/>
      <path d="M6 5V3.5A1.5 1.5 0 017.5 2h5A1.5 1.5 0 0114 3.5V5"/>
      <path d="M10 10v2M8 10h4"/>
    </svg>
  ),
  inventario: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L2 6v8l8 4 8-4V6l-8-4z"/>
      <path d="M10 2v12M2 6l8 4 8-4"/>
    </svg>
  ),
  pedidos: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="14" height="16" rx="2"/>
      <path d="M7 7h6M7 10h6M7 13h4"/>
    </svg>
  ),
  lotes: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l3 5h5l-4 3.5 1.5 5.5L10 13l-5.5 3 1.5-5.5L2 7h5z"/>
    </svg>
  ),
  comisiones: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3"/>
      <circle cx="14" cy="13" r="3"/>
      <path d="M5 15l10-10"/>
    </svg>
  ),
  reportes: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="2"/>
      <path d="M7 10v4M10 7v7M13 12v2"/>
    </svg>
  ),
  usuarios: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="7" r="3"/>
      <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
      <path d="M15 11c1.7 0 3 1.3 3 3v3"/>
      <circle cx="15" cy="6" r="2"/>
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L18 8L14 18H6L2 8L10 2Z"/>
      <path d="M2 8h16M10 2L6 8l4 10 4-10-4-6z"/>
    </svg>
  ),
}

interface NavItem {
  to: string
  label: string
  icon: keyof typeof Icons
  modulo: ModuloPermiso
  soloSocioAdmin?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/finanzas',    label: 'Finanzas',    icon: 'finanzas',   modulo: 'finanzas'   },
  { to: '/pedidos',     label: 'Pedidos',     icon: 'pedidos',    modulo: 'pedidos'    },
  { to: '/lotes',       label: 'Lotes',       icon: 'lotes',      modulo: 'lotes'      },
  { to: '/inventario',  label: 'Inventario',  icon: 'inventario', modulo: 'inventario' },
  { to: '/comisiones',  label: 'Comisiones',  icon: 'comisiones', modulo: 'comisiones', soloSocioAdmin: true },
  { to: '/reportes',    label: 'Reportes',    icon: 'reportes',   modulo: 'reportes',   soloSocioAdmin: true },
  { to: '/usuarios',    label: 'Usuarios',    icon: 'usuarios',   modulo: 'usuarios',   soloSocioAdmin: true },
]

export default function Sidebar() {
  const { canAccess, perfil, isSocioOrAdmin } = useAuth()

  const itemsVisibles = NAV_ITEMS.filter(item => {
    if (!canAccess(item.modulo)) return false
    if (item.soloSocioAdmin && !isSocioOrAdmin) return false
    return true
  })

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          {Icons.diamond}
        </div>
        <span className="sidebar-brand-name">SUMEFRA</span>
      </div>

      {/* Sucursal activa */}
      {perfil?.sucursales && (
        <div className="sidebar-sucursal">
          <span className="sidebar-sucursal-label">Sucursal</span>
          <span className="sidebar-sucursal-nombre">{perfil.sucursales.nombre}</span>
        </div>
      )}

      {/* Navegación */}
      <nav className="sidebar-nav">
        {itemsVisibles.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`
            }
          >
            <span className="sidebar-icon" aria-hidden="true">
              {Icons[item.icon]}
            </span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <span className="sidebar-version">SUMEFRA OS v2.0</span>
      </div>
    </aside>
  )
}
