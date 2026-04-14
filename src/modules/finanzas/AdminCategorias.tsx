import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { CategoriaGasto, TipoCategoria } from '../../types/database'

interface Props {
  categorias: CategoriaGasto[]
  onClose: () => void
  onRefresh: () => void
}

export default function AdminCategorias({ categorias, onClose, onRefresh }: Props) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoCategoria>('egreso')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<TipoCategoria | 'todos'>('todos')

  async function agregar() {
    if (!nombre.trim()) return setError('Escribe el nombre de la categoría.')
    setLoading(true)
    const { error: err } = await supabase.from('categorias_gasto').insert({
      nombre: nombre.trim(),
      tipo,
      activo: true,
    })
    if (err) setError(err.message)
    else {
      setNombre('')
      setError(null)
      onRefresh()
    }
    setLoading(false)
  }

  async function toggle(id: string, activo: boolean) {
    await supabase.from('categorias_gasto').update({ activo: !activo }).eq('id', id)
    onRefresh()
  }

  const listaFiltrada = categorias.filter(c =>
    filtroTipo === 'todos' ? true : c.tipo === filtroTipo
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <div className="modal-header">
          <h2 className="modal-title">Categorías de Transacción</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Formulario de nueva categoría */}
        <div className="admin-add-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
            <div className="field-group">
              <label className="field-label">Nueva categoría</label>
              <input
                type="text"
                className="field-input"
                value={nombre}
                onChange={e => { setNombre(e.target.value); setError(null) }}
                placeholder="Nombre de la categoría..."
                onKeyDown={e => e.key === 'Enter' && agregar()}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Tipo</label>
              <select
                className="field-input"
                value={tipo}
                onChange={e => setTipo(e.target.value as TipoCategoria)}
              >
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </div>
            <button
              className="btn-primary"
              onClick={agregar}
              disabled={loading}
              style={{ height: 38 }}
            >
              {loading ? '...' : '+ Agregar'}
            </button>
          </div>
          {error && <div className="form-error" style={{ marginTop: 8 }}>⚠ {error}</div>}
        </div>

        {/* Filtro */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['todos', 'egreso', 'ingreso'] as const).map(t => (
            <button
              key={t}
              className={`tab-btn ${filtroTipo === t ? 'tab-btn--active' : ''}`}
              onClick={() => setFiltroTipo(t)}
              style={{ fontSize: 12 }}
            >
              {t === 'todos' ? 'Todas' : t === 'egreso' ? 'Egresos' : 'Ingresos'}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="admin-list">
          {listaFiltrada.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>Sin categorías</div>
          ) : (
            listaFiltrada.map(cat => (
              <div
                key={cat.id}
                className="admin-list-item"
                style={{ opacity: cat.activo ? 1 : 0.45 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <span
                    className="badge"
                    style={{
                      background: cat.tipo === 'egreso'
                        ? 'rgba(224,85,85,0.12)' : 'rgba(76,175,110,0.12)',
                      color: cat.tipo === 'egreso' ? 'var(--negative)' : 'var(--positive)',
                      fontSize: 10,
                      padding: '2px 8px',
                    }}
                  >
                    {cat.tipo === 'egreso' ? '↓ Egreso' : '↑ Ingreso'}
                  </span>
                  <span style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>
                    {cat.nombre}
                  </span>
                  {!cat.activo && (
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>
                      (desactivada)
                    </span>
                  )}
                </div>
                <button
                  className={`btn-secondary btn-sm ${cat.activo ? '' : 'btn-reactivate'}`}
                  onClick={() => toggle(cat.id, cat.activo)}
                >
                  {cat.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))
          )}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 12 }}>
          Las categorías desactivadas no aparecen en el formulario de captura.
        </p>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
