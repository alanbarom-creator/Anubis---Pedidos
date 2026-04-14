import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ROL_COLOR: Record<string, string> = {
  socio:'#C9992A', administrador:'#7C9EF8', gerente:'#6EE7B7',
  vendedor:'#FCA5A5', contador:'#D9B5FF'
}
const ROL_LABEL: Record<string, string> = {
  socio:'Socio', administrador:'Administrador', gerente:'Gerente',
  vendedor:'Vendedor', contador:'Contador'
}

export default function Topbar() {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const initiales = perfil?.nombre?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() ?? '?'
  const color = perfil?.rol ? ROL_COLOR[perfil.rol] : '#C9992A'

  async function logout() { await signOut(); navigate('/login') }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-title">SUMEFRA OS</h2>
        <span className="topbar-sub">Sistema ERP Joyería</span>
      </div>
      <div className="topbar-right">
        <span className="topbar-date">
          {new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </span>
        <div className="topbar-user" onClick={() => setOpen(o=>!o)}>
          <div className="topbar-avatar">{initiales}</div>
          <div className="topbar-info">
            <span className="topbar-name">{perfil?.nombre ?? '...'}</span>
            <span className="topbar-rol" style={{ color }}>{ROL_LABEL[perfil?.rol ?? ''] ?? ''}</span>
          </div>
          <span className="topbar-chevron">{open ? '▲' : '▼'}</span>
        </div>
        {open && (
          <div className="topbar-menu">
            <div className="topbar-menu-email">{perfil?.email}</div>
            <button className="topbar-menu-item topbar-menu-item--danger" onClick={logout}>
              ↩ Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
