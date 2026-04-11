import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span>Cargando SUMEFRA OS...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
