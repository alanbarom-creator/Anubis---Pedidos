import { useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useKPIs } from './useFinanzas'
import KPICard from './KPICard'
import SaldoCuentas from './SaldoCuentas'
import GraficaTransacciones from './GraficaTransacciones'
import TransaccionesTable from './TransaccionesTable'
import CapturaTransaccion from './CapturaTransaccion'

type Vista = 'dashboard' | 'captura'

export default function FinanzasDashboard() {
  const { rol } = useAuth()
  const { kpis, loading, recargar } = useKPIs()
  const [vista, setVista] = useState<Vista>('dashboard')

  const puedeCapturar = rol !== 'contador'

  const handleSuccessCaptura = useCallback(() => {
    recargar()
    // Volver al dashboard después de capturar
    setTimeout(() => setVista('dashboard'), 1200)
  }, [recargar])

  return (
    <div className="modulo-finanzas">
      {/* Encabezado del módulo */}
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Finanzas</h1>
          <p className="modulo-subtitulo">
            {rol === 'contador' ? 'Solo lectura' : 'Gestión de ingresos y egresos'}
          </p>
        </div>
        <div className="modulo-acciones">
          <button
            className={`tab-btn ${vista === 'dashboard' ? 'tab-btn--active' : ''}`}
            onClick={() => setVista('dashboard')}
          >
            ▤ Dashboard
          </button>
          {puedeCapturar && (
            <button
              className={`tab-btn ${vista === 'captura' ? 'tab-btn--active' : ''}`}
              onClick={() => setVista('captura')}
            >
              + Capturar
            </button>
          )}
          <button
            className="btn-icon"
            onClick={recargar}
            title="Recargar datos"
          >
            ↺
          </button>
        </div>
      </div>

      {vista === 'dashboard' && (
        <>
          {/* KPIs */}
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
                <KPICard
                  titulo="Ingresos hoy"
                  valor={kpis.ingresos_hoy}
                  variante="positive"
                  descripcion="Total ingresos del día"
                />
                <KPICard
                  titulo="Egresos hoy"
                  valor={kpis.egresos_hoy}
                  variante="negative"
                  descripcion="Total egresos del día"
                />
                <KPICard
                  titulo="Saldo total"
                  valor={kpis.saldo_total}
                  variante={kpis.saldo_total > 0 ? 'positive' : 'negative'}
                  descripcion="Suma de todas las cuentas"
                />
                <KPICard
                  titulo="Utilidad del mes"
                  valor={kpis.utilidad_mes}
                  variante={kpis.utilidad_mes >= 0 ? 'positive' : 'negative'}
                  descripcion="Ingresos − Egresos (mes actual)"
                />
              </>
            )}
          </div>

          {/* Gráfica + Saldo de cuentas */}
          <div className="dashboard-grid-2">
            <GraficaTransacciones />
            <SaldoCuentas />
          </div>

          {/* Tabla de transacciones */}
          <TransaccionesTable />
        </>
      )}

      {vista === 'captura' && puedeCapturar && (
        <CapturaTransaccion onSuccess={handleSuccessCaptura} />
      )}
    </div>
  )
}
