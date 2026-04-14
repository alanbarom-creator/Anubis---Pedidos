import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { CuentaBanco, Sucursal, Traspaso } from '../../types/database'

const hoy = new Date().toISOString().split('T')[0]
const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n)

interface Props {
  cuentas: CuentaBanco[]
}

export default function Traspasos({ cuentas }: Props) {
  const { perfil } = useAuth()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [traspasos, setTraspasos] = useState<Traspaso[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const [form, setForm] = useState({
    fecha: hoy,
    monto: '',
    cuenta_origen_id: '',
    cuenta_destino_id: '',
    sucursal_origen_id: '',
    sucursal_destino_id: '',
    descripcion: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    supabase.from('sucursales').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setSucursales(data ?? []))
    cargarTraspasos()
  }, [])

  async function cargarTraspasos() {
    setLoadingList(true)
    const { data } = await supabase
      .from('traspasos')
      .select(`
        *,
        cuenta_origen:cuentas_banco!cuenta_origen_id(nombre),
        cuenta_destino:cuentas_banco!cuenta_destino_id(nombre),
        sucursal_origen:sucursales!sucursal_origen_id(nombre),
        sucursal_destino:sucursales!sucursal_destino_id(nombre)
      `)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)
    setTraspasos((data as Traspaso[]) ?? [])
    setLoadingList(false)
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
    setError(null)
    setExito(false)
  }

  async function handleSubmit() {
    if (!form.cuenta_origen_id) return setError('Selecciona la cuenta origen.')
    if (!form.cuenta_destino_id) return setError('Selecciona la cuenta destino.')
    if (form.cuenta_origen_id === form.cuenta_destino_id) return setError('Las cuentas deben ser diferentes.')
    if (!form.monto || Number(form.monto) <= 0) return setError('El monto debe ser mayor a cero.')

    setLoading(true)

    const payload = {
      fecha: form.fecha,
      monto: Number(form.monto),
      moneda: 'MXN' as const,
      cuenta_origen_id: form.cuenta_origen_id,
      cuenta_destino_id: form.cuenta_destino_id,
      sucursal_origen_id: form.sucursal_origen_id || null,
      sucursal_destino_id: form.sucursal_destino_id || null,
      descripcion: form.descripcion || null,
      capturado_por: perfil?.id ?? null,
    }

    const { error: err } = await supabase.from('traspasos').insert(payload)

    if (err) {
      setError('Error al guardar: ' + err.message)
    } else {
      // Actualizar saldos
      const origen = cuentas.find(c => c.id === form.cuenta_origen_id)
      const destino = cuentas.find(c => c.id === form.cuenta_destino_id)
      const monto = Number(form.monto)

      await Promise.all([
        origen && supabase.from('cuentas_banco')
          .update({ saldo_actual: origen.saldo_actual - monto })
          .eq('id', origen.id),
        destino && supabase.from('cuentas_banco')
          .update({ saldo_actual: destino.saldo_actual + monto })
          .eq('id', destino.id),
      ])

      setExito(true)
      setForm(prev => ({ ...prev, monto: '', descripcion: '', cuenta_origen_id: '', cuenta_destino_id: '', sucursal_origen_id: '', sucursal_destino_id: '' }))
      cargarTraspasos()
    }
    setLoading(false)
  }

  return (
    <section className="card">
      <h3 className="card-title">Traspasos entre cuentas</h3>

      {/* Form */}
      <div style={{ marginBottom: 28 }}>
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <div className="field-group">
            <label className="field-label">Fecha</label>
            <input type="date" className="field-input" value={form.fecha}
              onChange={e => set('fecha', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Monto (MXN)</label>
            <input type="number" className="field-input" value={form.monto}
              onChange={e => set('monto', e.target.value)}
              placeholder="0.00" min="0.01" step="0.01" />
          </div>
        </div>

        {/* Traspaso visual */}
        <div className="traspaso-form">
          <div>
            <div className="field-group" style={{ marginBottom: 10 }}>
              <label className="field-label">Cuenta origen</label>
              <select className="field-input" value={form.cuenta_origen_id}
                onChange={e => set('cuenta_origen_id', e.target.value)}>
                <option value="">Selecciona...</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Sucursal origen (opcional)</label>
              <select className="field-input" value={form.sucursal_origen_id}
                onChange={e => set('sucursal_origen_id', e.target.value)}>
                <option value="">Sin sucursal</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="traspaso-arrow">→</div>

          <div>
            <div className="field-group" style={{ marginBottom: 10 }}>
              <label className="field-label">Cuenta destino</label>
              <select className="field-input" value={form.cuenta_destino_id}
                onChange={e => set('cuenta_destino_id', e.target.value)}>
                <option value="">Selecciona...</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Sucursal destino (opcional)</label>
              <select className="field-input" value={form.sucursal_destino_id}
                onChange={e => set('sucursal_destino_id', e.target.value)}>
                <option value="">Sin sucursal</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="field-group" style={{ marginTop: 14 }}>
          <label className="field-label">Descripción / Motivo</label>
          <input type="text" className="field-input" value={form.descripcion}
            onChange={e => set('descripcion', e.target.value)}
            placeholder="Ej: Depósito efectivo Sahuaro → BBVA" />
        </div>

        {error && <div className="form-error" style={{ marginTop: 12 }}>⚠ {error}</div>}
        {exito && <div className="form-success" style={{ marginTop: 12 }}>✓ Traspaso registrado correctamente</div>}

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : 'Registrar traspaso'}
          </button>
        </div>
      </div>

      {/* Historial */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Historial reciente
      </h4>

      {loadingList ? (
        <div className="loading-row">Cargando...</div>
      ) : traspasos.length === 0 ? (
        <div className="empty-state">Sin traspasos registrados</div>
      ) : (
        <div className="tabla-wrapper">
          <table className="tabla">
            <thead>
              <tr>
                <th className="tabla-th">Fecha</th>
                <th className="tabla-th">Origen</th>
                <th className="tabla-th">Destino</th>
                <th className="tabla-th">Monto</th>
                <th className="tabla-th">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {traspasos.map(t => (
                <tr key={t.id} className="tabla-fila">
                  <td className="tabla-celda">{t.fecha}</td>
                  <td className="tabla-celda">
                    {(t as any).cuenta_origen?.nombre ?? '—'}
                    {(t as any).sucursal_origen && (
                      <span className="tabla-subtext"> · {(t as any).sucursal_origen.nombre}</span>
                    )}
                  </td>
                  <td className="tabla-celda">
                    {(t as any).cuenta_destino?.nombre ?? '—'}
                    {(t as any).sucursal_destino && (
                      <span className="tabla-subtext"> · {(t as any).sucursal_destino.nombre}</span>
                    )}
                  </td>
                  <td className="tabla-celda tabla-celda--monto text-gold">{fmt(t.monto)}</td>
                  <td className="tabla-celda tabla-celda--desc">{t.descripcion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
