import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Sucursal } from '../../types/database'

interface Props {
  sucursales: Sucursal[]
  onClose: () => void
  onRefresh: () => void
}

export default function AdminSucursales({ sucursales, onClose, onRefresh }: Props) {
  const [nombre, setNombre] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agregar() {
    if (!nombre.trim()) return setError('Escribe el nombre de la sucursal.')
    setLoading(true)
    const { error: err } = await supabase.from('sucursales').insert({
      nombre: nombre.trim(),
      ciudad: ciudad.trim() || 'México',
      activo: true,
    })
    if (err) setError(err.message)
    else {
      setNombre('')
      setCiudad('')
      setError(null)
      onRefresh()
    }
    setLoading(false)
  }

  async function toggleSucursal(id: string, activo: boolean) {
    await supabase.from('sucursales').update({ activo: !activo }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <div className="modal-header">
          <h2 className="modal-title">Administrar Sucursales</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="admin-list">
          {sucursales.map(s => (
            <div key={s.id} className="admin-list-item" style={{ opacity: s.activo ? 1 : 0.45 }}>
              <div style={{ flex: 1 }}>
                <span className="admin-list-item-label">{s.nombre}</span>
                <span className="admin-list-item-sub" style={{ display: 'block' }}>{s.ciudad}</span>
              </div>
              <button
                className={s.activo ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}
                onClick={() => toggleSucursal(s.id, s.activo)}
              >
                {s.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>

        <div className="divider" />

        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Agregar sucursal
        </h3>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="field-group">
            <label className="field-label">Nombre</label>
            <input
              type="text"
              className="field-input"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Anubis Sahuaro Grande"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Ciudad</label>
            <input
              type="text"
              className="field-input"
              value={ciudad}
              onChange={e => setCiudad(e.target.value)}
              placeholder="Ej: Guadalajara"
            />
          </div>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 12 }}>⚠ {error}</div>}

        <div className="form-actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={agregar} disabled={loading}>
            {loading ? 'Guardando...' : '+ Agregar sucursal'}
          </button>
        </div>
      </div>
    </div>
  )
}
