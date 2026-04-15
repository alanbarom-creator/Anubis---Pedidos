import { useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useKPIs, useTodasCuentas } from './useFinanzas'
import KPICard from './KPICard'
import SaldoCuentas from './SaldoCuentas'
import GraficaTransacciones from './GraficaTransacciones'
import TransaccionesTable from './TransaccionesTable'
import CapturaTransaccion from './CapturaTransaccion'
import Traspasos from './Traspasos'

type Vista = 'dashboard' | 'captura' | 'traspasos'

export default function FinanzasDashboard() {
  const { rol, isSocioOrAdmin } = useAuth()
  const { kpis, loading, recargar } = useKPIs()
  const { cuentas, recargar: recargarCuentas } = useTodasCuentas()

  const [vista, setVista] = useState<Vista>('dashboard')

  const puedeCapturar = rol !== 'contador'

  const handleSuccessCaptura = useCallback(() => {
    recargar()
    recargarCuentas()
    setTimeout(() => setVista('dashboard'), 1200)
  }, [recargar, recargarCuentas])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Encabezado */}
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Finanzas</h1>
          <p className="modulo-subtitulo">
            {rol === 'contador' ? 'Solo lectura' : 'Gestión de ingresos, egresos y traspasos'}
          </p>
        </div>
        <div className="modulo-acciones">
          <button
            className={`tab-btn ${vista === 'dashboard' ? 'tab-btn--active' : ''}`}
            onClick={() => setVista('dashboard')}
          >
            Dashboard
          </button>
          {puedeCapturar && (
            <button
              className={`tab-btn ${vista === 'captura' ? 'tab-btn--active' : ''}`}
              onClick={() => setVista('captura')}
            >
              + Capturar
            </button>
          )}
          {isSocioOrAdmin && (
            <button
              className={`tab-btn ${vista === 'traspasos' ? 'tab-btn--active' : ''}`}
              onClick={() => setVista('traspasos')}
            >
              Traspasos
            </button>
          )}
          <button className="btn-icon" onClick={() => { recargar(); recargarCuentas() }} title="Recargar">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4a8 8 0 0112.2 1.4M16 16a8 8 0 01-12.2-1.4M4 8V4H0M16 12v4h4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Dashboard */}
      {vista === 'dashboard' && (
        <>
          <div className="kpis-grid">
            {loading || !kpis ? (
              <>
                <div className="kpi-card kpi-card--skeleton" />
                <div className="kpi-card kpi-card--skeleton" />
                <div className="kpi-card kpi-card--skeleton" />
                <div className="kpi-card kpi-card--skeleton" />
              </>
            ) : (
              <>
                <KPICard titulo="Ingresos hoy"     valor={kpis.ingresos_hoy}  variante="positive" descripcion="Total ingresos del día" />
                <KPICard titulo="Egresos hoy"      valor={kpis.egresos_hoy}   variante="negative" descripcion="Total egresos del día" />
                <KPICard titulo="Saldo total"      valor={kpis.saldo_total}   variante={kpis.saldo_total >= 0 ? 'positive' : 'negative'} descripcion="Suma de todas las cuentas" />
                <KPICard titulo="Utilidad del mes" valor={kpis.utilidad_mes}  variante={kpis.utilidad_mes >= 0 ? 'positive' : 'negative'} descripcion="Ingresos − Egresos del mes" />
              </>
            )}
          </div>

          <div className="dashboard-grid-2">
            <GraficaTransacciones />
            <SaldoCuentas />
          </div>

          <TransaccionesTable />
        </>
      )}

      {/* Captura */}
      {vista === 'captura' && puedeCapturar && (
        <CapturaTransaccion onSuccess={handleSuccessCaptura} />
      )}

      {/* Traspasos */}
      {vista === 'traspasos' && isSocioOrAdmin && (
        <Traspasos cuentas={cuentas.filter(c => c.activo)} />
      )}
    </div>
  )
}
