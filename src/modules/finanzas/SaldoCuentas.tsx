import React from 'react'
import { useCuentas } from './useFinanzas'

const fmt = (n: number, moneda = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 2 }).format(n)

// SVG icons instead of emojis
function BankIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="2" y="9" width="16" height="9" rx="1"/>
      <path d="M2 9l8-6 8 6M6 9v9M10 9v9M14 9v9"/>
    </svg>
  )
}
function CashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1" y="5" width="18" height="12" rx="2"/>
      <circle cx="10" cy="11" r="2.5"/>
      <path d="M4 8v6M16 8v6"/>
    </svg>
  )
}
function CardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="2" y="5" width="16" height="12" rx="2"/>
      <path d="M2 9h16M6 13h4"/>
    </svg>
  )
}

const TIPO_ICON: Record<string, React.ReactElement> = {
  banco:    <BankIcon />,
  efectivo: <CashIcon />,
  terminal: <CardIcon />,
}

export default function SaldoCuentas() {
  const cuentas = useCuentas()

  return (
    <section className="card">
      <h3 className="card-title">Saldo por cuenta</h3>
      <div className="cuentas-grid">
        {cuentas.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>
            Sin cuentas activas
          </p>
        )}
        {cuentas.map(cuenta => {
          const semaforo = cuenta.saldo_actual <= 0
            ? 'rojo'
            : cuenta.saldo_actual <= cuenta.saldo_minimo && cuenta.saldo_minimo > 0
            ? 'amarillo'
            : 'verde'

          return (
            <div key={cuenta.id} className={`cuenta-card cuenta-card--${semaforo}`}>
              <div className="cuenta-header">
                <span className="cuenta-icon" style={{ color: 'var(--gold)' }}>
                  {TIPO_ICON[cuenta.tipo]}
                </span>
                <div className="cuenta-info">
                  <span className="cuenta-nombre">{cuenta.nombre}</span>
                  <span className="cuenta-tipo">{cuenta.tipo} · {cuenta.moneda}</span>
                </div>
                <div
                  className={`semaforo semaforo--${semaforo}`}
                  title={
                    semaforo === 'verde' ? 'Saldo saludable'
                    : semaforo === 'amarillo' ? 'Cerca del mínimo'
                    : 'Saldo bajo o negativo'
                  }
                />
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
