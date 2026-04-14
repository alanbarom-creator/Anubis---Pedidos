import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { CuentaBanco, TipoCuenta } from '../../types/database'

interface Props {
  cuentas: CuentaBanco[]
  onClose: () => void
  onRefresh: () => void
}

export default function AdminCuentas({ cuentas, onClose, onRefresh }: Props) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoCuenta>('banco')
  const [saldoMin, setSaldoMin] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agregarCuenta() {
    if (!nombre.trim()) return setError('Escribe el nombre de la cuenta.')
    setLoading(true)
    const { error: err } = await supabase.from('cuentas_banco').insert({
      nombre: nombre.trim(),
      tipo,
      moneda: 'MXN',
      saldo_actual: 0,
      saldo_minimo: Number(saldoMin) || 0,
      activo: true,
    })
    if (err) setError(err.message)
    else {
      setNombre('')
      setSaldoMin('0')
      setError(null)
      onRefresh()
    }
    setLoading(false)
  }

  async function toggleCuenta(id: string, activo: boolean) {
    await supabase.from('cuentas_banco').update({ activo: !activo }).eq('id', id)
    onRefresh()
  }

  async function actualizarSaldo(id: string, saldo: number) {
    await supabase.from('cuentas_banco').update({ saldo_actual: saldo }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <div className="modal-header">
          <h2 className="modal-title">Administrar Cuentas</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Lista de cuentas */}
        <div className="admin-list">
          {cuentas.map(c => (
            <AdminCuentaRow
              key={c.id}
              cuenta={c}
              onToggle={() => toggleCuenta(c.id, c.activo)}
              onSaldoUpdate={saldo => actualizarSaldo(c.id, saldo)}
            />
          ))}
        </div>

        <div className="divider" />

        {/* Agregar nueva cuenta */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Agregar cuenta
        </h3>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="field-group">
            <label className="field-label">Nombre</label>
            <input
              type="text"
              className="field-input"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: BBVA Sumefra"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Tipo</label>
            <select
              className="field-input"
              value={tipo}
              onChange={e => setTipo(e.target.value as TipoCuenta)}
            >
              <option value="banco">Banco</option>
              <option value="efectivo">Efectivo / Caja</option>
              <option value="terminal">Terminal (Clip, Kashpay)</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Saldo mínimo</label>
            <input
              type="number"
              className="field-input"
              value={saldoMin}
              onChange={e => setSaldoMin(e.target.value)}
              placeholder="0"
              min="0"
              step="100"
            />
          </div>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 12 }}>⚠ {error}</div>}

        <div className="form-actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={agregarCuenta} disabled={loading}>
            {loading ? 'Guardando...' : '+ Agregar cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminCuentaRow({
  cuenta,
  onToggle,
  onSaldoUpdate,
}: {
  cuenta: CuentaBanco
  onToggle: () => void
  onSaldoUpdate: (saldo: number) => void
}) {
  const [editingSaldo, setEditingSaldo] = useState(false)
  const [saldoInput, setSaldoInput] = useState(String(cuenta.saldo_actual))

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

  function guardarSaldo() {
    const val = parseFloat(saldoInput)
    if (!isNaN(val)) onSaldoUpdate(val)
    setEditingSaldo(false)
  }

  return (
    <div className="admin-list-item" style={{ opacity: cuenta.activo ? 1 : 0.45 }}>
      <div style={{ flex: 1 }}>
        <span className="admin-list-item-label">{cuenta.nombre}</span>
        <span className="admin-list-item-sub" style={{ display: 'block' }}>
          {cuenta.tipo} · {cuenta.moneda}
        </span>
      </div>

      {/* Saldo editable */}
      <div className="inline-edit">
        {editingSaldo ? (
          <>
            <input
              type="number"
              className="inline-input"
              value={saldoInput}
              onChange={e => setSaldoInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') guardarSaldo(); if (e.key === 'Escape') setEditingSaldo(false) }}
              autoFocus
            />
            <button className="btn-primary btn-sm" onClick={guardarSaldo}>✓</button>
          </>
        ) : (
          <button
            onClick={() => { setEditingSaldo(true); setSaldoInput(String(cuenta.saldo_actual)) }}
            style={{ background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '4px 10px', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
            title="Clic para editar saldo"
          >
            {fmt(cuenta.saldo_actual)}
          </button>
        )}
      </div>

      <button
        className={cuenta.activo ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}
        onClick={onToggle}
      >
        {cuenta.activo ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  )
}
