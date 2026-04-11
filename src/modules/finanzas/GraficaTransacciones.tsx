import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { useDatosGrafica } from './useFinanzas'

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

export default function GraficaTransacciones() {
  const { datos, loading } = useDatosGrafica()

  if (loading) return <div className="card"><div className="loading-row">Cargando gráfica...</div></div>

  if (datos.length === 0) {
    return (
      <section className="card">
        <h3 className="card-title">Ingresos vs Egresos — Mes actual</h3>
        <div className="empty-state">Sin transacciones este mes</div>
      </section>
    )
  }

  return (
    <section className="card">
      <h3 className="card-title">Ingresos vs Egresos — Mes actual</h3>
      <div className="grafica-wrapper">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={datos} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A40" />
            <XAxis
              dataKey="fecha"
              tick={{ fill: '#9090B0', fontSize: 11 }}
              axisLine={{ stroke: '#2A2A40' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: '#9090B0', fontSize: 11 }}
              axisLine={{ stroke: '#2A2A40' }}
              tickLine={false}
              width={52}
            />
            <Tooltip
              contentStyle={{
                background: '#1A1A28',
                border: '1px solid #2A2A40',
                borderRadius: 8,
                color: '#E8E8F2',
              }}
              formatter={(value, name) => [
                fmt(Number(value ?? 0)),
                String(name) === 'ingresos' ? 'Ingresos' : 'Egresos',
              ]}
            />
            <Legend
              wrapperStyle={{ color: '#9090B0', fontSize: 12 }}
              formatter={v => v === 'ingresos' ? 'Ingresos' : 'Egresos'}
            />
            <Bar dataKey="ingresos" fill="#C9992A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egresos"  fill="#4A4A6A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
