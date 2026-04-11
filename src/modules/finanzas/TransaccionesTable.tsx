import { useState } from 'react'
import { useTransacciones, useCuentas, useCategorias, useFiltrosInit, type FiltrosTransacciones } from './useFinanzas'
import type { Transaccion } from '../../types/database'

const fmt = (n: number, moneda = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 2 }).format(n)

function FilaTransaccion({ t }: { t: Transaccion }) {
  return (
    <tr className="tabla-fila">
      <td className="tabla-celda">{t.fecha}</td>
      <td className="tabla-celda">
        <span className={`badge badge--${t.tipo}`}>
          {t.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
        </span>
      </td>
      <td className="tabla-celda tabla-celda--monto">
        <span className={t.tipo === 'ingreso' ? 'text-positive' : 'text-negative'}>
          {fmt(t.monto, t.moneda)}
        </span>
        {t.moneda === 'USD' && (
          <span className="tabla-subtext"> ≈ {fmt(t.monto_mxn)}</span>
        )}
      </td>
      <td className="tabla-celda">{(t.categorias_gasto as any)?.nombre ?? '—'}</td>
      <td className="tabla-celda tabla-celda--desc">{t.descripcion ?? '—'}</td>
      <td className="tabla-celda">{(t.cuentas_banco as any)?.nombre ?? '—'}</td>
      <td className="tabla-celda">
        <span className={`badge badge--${t.aprobado ? 'aprobado' : 'pendiente'}`}>
          {t.aprobado ? 'Aprobado' : 'Pendiente'}
        </span>
      </td>
    </tr>
  )
}

export default function TransaccionesTable() {
  const [filtros, setFiltros] = useState<FiltrosTransacciones>(useFiltrosInit())
  const { transacciones, loading } = useTransacciones(filtros)
  const cuentas = useCuentas()
  const categorias = useCategorias()

  function setFiltro<K extends keyof FiltrosTransacciones>(k: K, v: FiltrosTransacciones[K]) {
    setFiltros(prev => ({ ...prev, [k]: v }))
  }

  return (
    <section className="card">
      <div className="card-header">
        <h3 className="card-title">Transacciones</h3>
        <span className="card-count">{transacciones.length} registros</span>
      </div>

      {/* Filtros */}
      <div className="filtros-row">
        <div className="filtro-group">
          <label className="filtro-label">Desde</label>
          <input
            type="date"
            className="filtro-input"
            value={filtros.fecha_inicio}
            onChange={e => setFiltro('fecha_inicio', e.target.value)}
          />
        </div>
        <div className="filtro-group">
          <label className="filtro-label">Hasta</label>
          <input
            type="date"
            className="filtro-input"
            value={filtros.fecha_fin}
            onChange={e => setFiltro('fecha_fin', e.target.value)}
          />
        </div>
        <div className="filtro-group">
          <label className="filtro-label">Tipo</label>
          <select
            className="filtro-input"
            value={filtros.tipo}
            onChange={e => setFiltro('tipo', e.target.value as FiltrosTransacciones['tipo'])}
          >
            <option value="todos">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>
        </div>
        <div className="filtro-group">
          <label className="filtro-label">Cuenta</label>
          <select
            className="filtro-input"
            value={filtros.cuenta_id}
            onChange={e => setFiltro('cuenta_id', e.target.value)}
          >
            <option value="">Todas</option>
            {cuentas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="filtro-group">
          <label className="filtro-label">Categoría</label>
          <select
            className="filtro-input"
            value={filtros.categoria_id}
            onChange={e => setFiltro('categoria_id', e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="loading-row">Cargando transacciones...</div>
      ) : transacciones.length === 0 ? (
        <div className="empty-state">No hay transacciones con los filtros seleccionados</div>
      ) : (
        <div className="tabla-wrapper">
          <table className="tabla">
            <thead>
              <tr>
                <th className="tabla-th">Fecha</th>
                <th className="tabla-th">Tipo</th>
                <th className="tabla-th">Monto</th>
                <th className="tabla-th">Categoría</th>
                <th className="tabla-th">Descripción</th>
                <th className="tabla-th">Cuenta</th>
                <th className="tabla-th">Estado</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.map(t => <FilaTransaccion key={t.id} t={t} />)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
