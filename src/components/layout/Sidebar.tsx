import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { Modulo } from '../../types'

const NAV: { to: string; label: string; icon: string; modulo: Modulo }[] = [
  { to:'/finanzas',   label:'Finanzas',   icon:'💰', modulo:'finanzas'   },
  { to:'/inventario', label:'Inventario', icon:'💎', modulo:'inventario' },
  { to:'/pedidos',    label:'Pedidos',    icon:'📋', modulo:'pedidos'    },
  { to:'/catalogo',   label:'Catálogo',   icon:'🛍', modulo:'catalogo'   },
  { to:'/comisiones', label:'Comisiones', icon:'📊', modulo:'comisiones' },
  { to:'/usuarios',   label:'Usuarios',   icon:'👥', modulo:'usuarios'   },
]

export default function Sidebar() {
  const { can, perfil } = useAuth()
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">S</div>
        <span className="sidebar-name">SUMEFRA</span>
      </div>
      {perfil?.sucursales && (
        <div className="sidebar-suc">
          <span className="sidebar-suc-label">Sucursal</span>
          <span className="sidebar-suc-name">{perfil.sucursales.nombre}</span>
        </div>
      )}
      <nav className="sidebar-nav">
        {NAV.filter(n => can(n.modulo)).map(n => (
          <NavLink key={n.to} to={n.to}
            className={({ isActive }) => `sidebar-item${isActive ? ' sidebar-item--active' : ''}`}>
            <span className="sidebar-icon">{n.icon}</span>
            <span className="sidebar-label">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span>v2.0 · Sprint 2</span>
      </div>
    </aside>
  )
}
