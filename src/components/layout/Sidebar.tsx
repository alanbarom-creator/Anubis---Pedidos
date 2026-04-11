import { NavLink } from 'react-router-dom'
import { useAuth, type ModuloPermiso } from '../../contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: string
  modulo: ModuloPermiso
}

const NAV_ITEMS: NavItem[] = [
  { to: '/finanzas',   label: 'Finanzas',   icon: '₱', modulo: 'finanzas'   },
  { to: '/inventario', label: 'Inventario', icon: '◈', modulo: 'inventario' },
  { to: '/ventas',     label: 'Ventas',     icon: '◉', modulo: 'ventas'     },
  { to: '/pedidos',    label: 'Pedidos',    icon: '◎', modulo: 'pedidos'    },
  { to: '/comisiones', label: 'Comisiones', icon: '✦', modulo: 'comisiones' },
  { to: '/reportes',   label: 'Reportes',   icon: '▤', modulo: 'reportes'   },
  { to: '/usuarios',   label: 'Usuarios',   icon: '◈', modulo: 'usuarios'   },
]

export default function Sidebar() {
  const { canAccess, perfil } = useAuth()

  const itemsVisibles = NAV_ITEMS.filter(item => canAccess(item.modulo))

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">S</div>
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
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer del sidebar */}
      <div className="sidebar-footer">
        <span className="sidebar-version">v1.0 Sprint 1</span>
      </div>
    </aside>
  )
}
