import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCuentas, useCategorias } from './useFinanzas'

interface Props {
  onSuccess?: () => void
}

interface FormState {
  tipo: 'ingreso' | 'egreso'
  fecha: string
  monto: string
  moneda: 'MXN' | 'USD'
  tipo_cambio: string
  categoria_id: string
  descripcion: string
  cuenta_id: string
}

const hoy = new Date().toISOString().split('T')[0]

export default function CapturaTransaccion({ onSuccess }: Props) {
  const { perfil } = useAuth()
  const cuentas = useCuentas()

  const [form, setForm] = useState<FormState>({
    tipo: 'egreso',
    fecha: hoy,
    monto: '',
    moneda: 'MXN',
    tipo_cambio: '',
    categoria_id: '',
    descripcion: '',
    cuenta_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  const categorias = useCategorias(form.tipo)

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
    setError(null)
    setExito(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.cuenta_id) return setError('Selecciona una cuenta.')
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0)
      return setError('El monto debe ser un número positivo.')
    if (form.moneda === 'USD' && (!form.tipo_cambio || isNaN(Number(form.tipo_cambio))))
      return setError('Ingresa el tipo de cambio para transacciones en USD.')

    setLoading(true)

    const payload = {
      tipo: form.tipo,
      fecha: form.fecha,
      monto: Number(form.monto),
      moneda: form.moneda,
      tipo_cambio: form.moneda === 'USD' ? Number(form.tipo_cambio) : null,
      categoria_id: form.categoria_id || null,
      descripcion: form.descripcion || null,
      cuenta_id: form.cuenta_id,
      sucursal_id: perfil?.sucursal_id ?? null,
      capturado_por: perfil?.id ?? null,
      aprobado: ['socio', 'administrador'].includes(perfil?.rol ?? '') ? true : false,
    }

    const { error } = await supabase.from('transacciones').insert(payload)

    if (error) {
      setError('Error al guardar: ' + error.message)
    } else {
      setExito(true)
      setForm(prev => ({ ...prev, monto: '', descripcion: '', categoria_id: '', tipo_cambio: '' }))
      onSuccess?.()
    }
    setLoading(false)
  }

  return (
    <section className="card">
      <h3 className="card-title">Capturar transacción</h3>

      <form onSubmit={handleSubmit} className="captura-form">
        {/* Tipo: toggle ingreso/egreso */}
        <div className="tipo-toggle">
          {(['egreso', 'ingreso'] as const).map(t => (
            <button
              key={t}
              type="button"
              className={`tipo-btn tipo-btn--${t} ${form.tipo === t ? 'tipo-btn--active' : ''}`}
              onClick={() => set('tipo', t)}
            >
              {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
            </button>
          ))}
        </div>

        <div className="form-grid">
          {/* Fecha */}
          <div className="field-group">
            <label className="field-label">Fecha</label>
            <input
              type="date"
              className="field-input"
              value={form.fecha}
              onChange={e => set('fecha', e.target.value)}
              required
            />
          </div>

          {/* Moneda */}
          <div className="field-group">
            <label className="field-label">Moneda</label>
            <select
              className="field-input"
              value={form.moneda}
              onChange={e => set('moneda', e.target.value as 'MXN' | 'USD')}
            >
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="USD">USD — Dólar</option>
            </select>
          </div>

          {/* Monto */}
          <div className="field-group">
            <label className="field-label">Monto ({form.moneda})</label>
            <input
              type="number"
              className="field-input"
              value={form.monto}
              onChange={e => set('monto', e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          {/* Tipo de cambio (solo USD) */}
          {form.moneda === 'USD' && (
            <div className="field-group">
              <label className="field-label">Tipo de cambio (MXN/USD)</label>
              <input
                type="number"
                className="field-input"
                value={form.tipo_cambio}
                onChange={e => set('tipo_cambio', e.target.value)}
                placeholder="ej. 17.50"
                min="0.01"
                step="0.0001"
              />
            </div>
          )}

          {/* Categoría */}
          <div className="field-group">
            <label className="field-label">Categoría</label>
            <select
              className="field-input"
              value={form.categoria_id}
              onChange={e => set('categoria_id', e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Cuenta origen */}
          <div className="field-group">
            <label className="field-label">Cuenta origen</label>
            <select
              className="field-input"
              value={form.cuenta_id}
              onChange={e => set('cuenta_id', e.target.value)}
              required
            >
              <option value="">Selecciona cuenta...</option>
              {cuentas
                .filter(c => form.moneda === 'USD' ? c.moneda === 'USD' : c.moneda === 'MXN')
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} — {new Intl.NumberFormat('es-MX', {
                      style: 'currency', currency: c.moneda, maximumFractionDigits: 0
                    }).format(c.saldo_actual)}
                  </option>
                ))}
            </select>
          </div>

          {/* Descripción */}
          <div className="field-group field-group--full">
            <label className="field-label">Descripción</label>
            <textarea
              className="field-input field-textarea"
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Detalle de la transacción..."
              rows={2}
            />
          </div>
        </div>

        {error && (
          <div className="form-error" role="alert">⚠ {error}</div>
        )}
        {exito && (
          <div className="form-success" role="status">✓ Transacción guardada correctamente</div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : `Guardar ${form.tipo}`}
          </button>
        </div>
      </form>
    </section>
  )
}
