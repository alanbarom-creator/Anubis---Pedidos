import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import Finanzas from './modules/finanzas'
import Inventario from './modules/inventario'
import Pedidos from './modules/pedidos'
import CatalogoPage from './modules/catalogo'
import Comisiones from './modules/comisiones'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/finanzas" replace />} />
            <Route path="/finanzas"   element={<Finanzas />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/pedidos"    element={<Pedidos />} />
            <Route path="/catalogo"   element={<CatalogoPage />} />
            <Route path="/comisiones" element={<Comisiones />} />
            <Route path="*"           element={<Navigate to="/finanzas" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
