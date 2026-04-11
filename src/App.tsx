import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import FinanzasDashboard from './modules/finanzas/FinanzasDashboard'
import ProximamentePage from './pages/ProximamentePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas (dentro del AppShell) */}
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/finanzas" replace />} />
            <Route path="/finanzas"   element={<FinanzasDashboard />} />
            <Route path="/inventario" element={<ProximamentePage modulo="Inventario" />} />
            <Route path="/ventas"     element={<ProximamentePage modulo="Ventas" />} />
            <Route path="/pedidos"    element={<ProximamentePage modulo="Pedidos" />} />
            <Route path="/comisiones" element={<ProximamentePage modulo="Comisiones" />} />
            <Route path="/reportes"   element={<ProximamentePage modulo="Reportes" />} />
            <Route path="/usuarios"   element={<ProximamentePage modulo="Usuarios" />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
