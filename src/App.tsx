import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import FinanzasDashboard from './modules/finanzas/FinanzasDashboard'
import PedidosDashboard from './modules/pedidos/PedidosDashboard'
import LotesDashboard from './modules/lotes/LotesDashboard'
import InventariosDashboard from './modules/inventarios/InventariosDashboard'
import ComisionesDashboard from './modules/comisiones/ComisionesDashboard'
import UsuariosPage from './pages/UsuariosPage'
import ProximamentePage from './pages/ProximamentePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/finanzas" replace />} />
            <Route path="/finanzas"   element={<FinanzasDashboard />} />
            <Route path="/pedidos"    element={<PedidosDashboard />} />
            <Route path="/lotes"      element={<LotesDashboard />} />
            <Route path="/inventario" element={<InventariosDashboard />} />
            <Route path="/comisiones" element={<ComisionesDashboard />} />
            <Route path="/reportes"   element={<ProximamentePage modulo="Reportes" />} />
            <Route path="/usuarios"   element={<UsuariosPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
