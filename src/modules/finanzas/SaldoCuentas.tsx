import { useCuentas } from './useFinanzas'

const fmt = (n: number, moneda = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 2 }).format(n)

const TIPO_ICON: Record<string, string> = {
  banco:    '🏦',
  efectivo: '💵',
  terminal: '💳',
}

export default function SaldoCuentas() {
  const cuentas = useCuentas()

  return (
    <section className="card">
      <h3 className="card-title">Saldo por cuenta</h3>
      <div className="cuentas-grid">
        {cuentas.map(cuenta => {
          const semaforo = cuenta.saldo_actual <= 0
            ? 'rojo'
            : cuenta.saldo_actual <= cuenta.saldo_minimo
            ? 'amarillo'
            : 'verde'

          return (
            <div key={cuenta.id} className={`cuenta-card cuenta-card--${semaforo}`}>
              <div className="cuenta-header">
                <span className="cuenta-icon">{TIPO_ICON[cuenta.tipo]}</span>
                <div className="cuenta-info">
                  <span className="cuenta-nombre">{cuenta.nombre}</span>
                  <span className="cuenta-tipo">{cuenta.tipo} · {cuenta.moneda}</span>
                </div>
                <div className={`semaforo semaforo--${semaforo}`} title={
                  semaforo === 'verde' ? 'Saldo saludable'
                  : semaforo === 'amarillo' ? 'Cerca del mínimo'
                  : 'Saldo bajo o negativo'
                } />
              </div>
              <span className="cuenta-saldo">{fmt(cuenta.saldo_actual, cuenta.moneda)}</span>
              {cuenta.saldo_minimo > 0 && (
                <span className="cuenta-minimo">Mínimo: {fmt(cuenta.saldo_minimo, cuenta.moneda)}</span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
