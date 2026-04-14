import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Catalogo } from '../../types'

const fmt = (n: number | null) =>
  n == null ? '—' :
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

const CATEGORIAS = ['Anillos', 'Aretes', 'Collares', 'Pulseras', 'Dijes', 'Relojes', 'Otro']

function buildWhatsAppMsg(item: Catalogo): string {
  const lines = [
    `✨ *${item.nombre}*`,
    item.descripcion ? `\n${item.descripcion}` : '',
    '',
    item.categoria   ? `📦 Categoría: ${item.categoria}` : '',
    item.precio != null ? `💰 Precio: ${fmt(item.precio)}` : '',
    item.disponible  ? `✅ Disponible` : `❌ Agotado`,
    '',
    '_SUMEFRA Joyería — Te llevamos elegancia_',
  ].filter(Boolean)
  return encodeURIComponent(lines.join('\n').replace(/\n{3,}/g, '\n\n'))
}

function ModalCatalogo({ item, onClose, onSaved }: {
  item: Catalogo | null; onClose: () => void; onSaved: () => void
}) {
  const [imgFile, setImgFile]     = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState(item?.imagen_url ?? '')
  const [form, setForm] = useState({
    codigo:      item?.codigo      ?? '',
    nombre:      item?.nombre      ?? '',
    descripcion: item?.descripcion ?? '',
    categoria:   item?.categoria   ?? '',
    precio:      item?.precio?.toString() ?? '',
    disponible:  item?.disponible  ?? true,
    destacado:   item?.destacado   ?? false,
    imagen_url:  item?.imagen_url  ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const set = (k: string, v: string | boolean) => { setForm(p => ({ ...p, [k]: v })); setError(null) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setImgFile(f)
    setImgPreview(URL.createObjectURL(f))
  }

  async function uploadImg(): Promise<string | null> {
    if (!imgFile) return form.imagen_url || null
    const ext  = imgFile.name.split('.').pop()
    const path = `catalogo/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('imagenes').upload(path, imgFile)
    if (upErr) { setError('Error subiendo imagen: ' + upErr.message); return null }
    return supabase.storage.from('imagenes').getPublicUrl(path).data.publicUrl
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    setLoading(true)
    const imagen_url = await uploadImg()
    if (error) { setLoading(false); return }
    const payload = {
      codigo:      form.codigo.trim() || null,
      nombre:      form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      categoria:   form.categoria || null,
      precio:      form.precio ? Number(form.precio) : null,
      disponible:  form.disponible,
      destacado:   form.destacado,
      imagen_url,
    }
    const { error: err } = item
      ? await supabase.from('catalogo').update(payload).eq('id', item.id)
      : await supabase.from('catalogo').insert(payload)
    if (err) setError(err.message)
    else { onSaved(); onClose() }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--lg">
        <div className="modal-header">
          <h2 className="modal-title">{item ? `Editar: ${item.nombre}` : 'Nueva pieza'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={save} className="form-grid">
          <div className="form-row">
            <div className="field field--full">
              <label className="field-label">Imagen</label>
              <div className="img-upload-area">
                {imgPreview
                  ? <img src={imgPreview} alt="preview" className="img-preview" />
                  : <div className="img-placeholder">📷 Haz clic para subir imagen</div>}
                <input type="file" accept="image/*" onChange={handleFile} className="img-input" />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Nombre *</label>
              <input className="field-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label">Código interno</label>
              <input className="field-input" value={form.codigo} onChange={e => set('codigo', e.target.value)} />
            </div>
            <div className="field field--full">
              <label className="field-label">Descripción</label>
              <textarea className="field-input" rows={3} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Categoría</label>
              <select className="field-input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                <option value="">—</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Precio MXN</label>
              <input type="number" className="field-input" value={form.precio} onChange={e => set('precio', e.target.value)} step="0.01" min="0" />
            </div>
            <div className="field field--full" style={{ display: 'flex', gap: 24 }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.disponible} onChange={e => set('disponible', e.target.checked)} />
                <span>Disponible en catálogo</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.destacado} onChange={e => set('destacado', e.target.checked)} />
                <span>Pieza destacada</span>
              </label>
            </div>
          </div>
          {error && <div className="alert alert--error">⚠ {error}</div>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-gold" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TarjetaCatalogo({ item, onEdit }: { item: Catalogo; onEdit: () => void }) {
  const waLink = `https://wa.me/?text=${buildWhatsAppMsg(item)}`
  return (
    <div className={`catalogo-card ${!item.disponible ? 'catalogo-card--agotado' : ''}`}>
      <div className="catalogo-img-wrap">
        {item.imagen_url
          ? <img src={item.imagen_url} alt={item.nombre} className="catalogo-img" />
          : <div className="catalogo-img-placeholder">💎</div>}
        {item.destacado && <div className="catalogo-agotado-badge" style={{ background: 'rgba(201,153,42,0.9)' }}>★ Destacado</div>}
        {!item.disponible && <div className="catalogo-agotado-badge">Agotado</div>}
      </div>
      <div className="catalogo-info">
        {item.categoria && <div className="catalogo-cat">{item.categoria}</div>}
        <div className="catalogo-nombre">{item.nombre}</div>
        {item.codigo && <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.codigo}</div>}
        {item.descripcion && <p className="catalogo-desc">{item.descripcion}</p>}
        <div className="catalogo-precio">{fmt(item.precio)}</div>
        <div className="catalogo-actions">
          <button className="btn-xs" onClick={onEdit}>Editar</button>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-wa">📲 WhatsApp</a>
        </div>
      </div>
    </div>
  )
}

export default function CatalogoPage() {
  const { can } = useAuth()
  const [items, setItems]       = useState<Catalogo[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<Catalogo | null | 'nuevo'>(null)
  const [catFiltro, setCatFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [soloDisp, setSoloDisp] = useState(false)
  const [soloDestacat, setSoloDestacat] = useState(false)
  const [vista, setVista]       = useState<'grid' | 'tabla'>('grid')

  function load() {
    setLoading(true)
    let q = supabase.from('catalogo').select('*').order('created_at', { ascending: false })
    if (soloDisp) q = q.eq('disponible', true)
    if (soloDestacat) q = q.eq('destacado', true)
    q.then(({ data }) => {
      let res = (data as Catalogo[]) ?? []
      if (busqueda) {
        const b = busqueda.toLowerCase()
        res = res.filter(i => i.nombre.toLowerCase().includes(b) || (i.descripcion ?? '').toLowerCase().includes(b))
      }
      if (catFiltro) res = res.filter(i => i.categoria === catFiltro)
      setItems(res)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [soloDisp, soloDestacat, busqueda, catFiltro])

  const total       = items.length
  const disponibles = items.filter(i => i.disponible).length
  const destacados  = items.filter(i => i.destacado).length

  return (
    <div className="modulo">
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Catálogo</h1>
          <p className="modulo-sub">Piezas disponibles para compartir por WhatsApp</p>
        </div>
        {can('catalogo') && (
          <button className="btn-gold" onClick={() => setModal('nuevo')}>+ Nueva pieza</button>
        )}
      </div>

      <div className="kpis">
        <div className="kpi-card kpi-card--neutral"><span className="kpi-titulo">Total piezas</span><span className="kpi-valor">{total}</span></div>
        <div className="kpi-card kpi-card--pos"><span className="kpi-titulo">Disponibles</span><span className="kpi-valor">{disponibles}</span></div>
        <div className="kpi-card kpi-card--neutral"><span className="kpi-titulo">Destacadas</span><span className="kpi-valor">{destacados}</span></div>
      </div>

      <section className="card">
        <div className="filtros">
          <input className="filtro-input" placeholder="🔍 Buscar nombre o descripción..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select className="filtro-input" value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="checkbox-label">
            <input type="checkbox" checked={soloDisp} onChange={e => setSoloDisp(e.target.checked)} />
            <span>Solo disponibles</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={soloDestacat} onChange={e => setSoloDestacat(e.target.checked)} />
            <span>Solo destacados</span>
          </label>
          <div className="vista-toggle">
            <button className={`btn-xs ${vista === 'grid' ? 'btn-xs--active' : ''}`} onClick={() => setVista('grid')}>⊞ Grid</button>
            <button className={`btn-xs ${vista === 'tabla' ? 'btn-xs--active' : ''}`} onClick={() => setVista('tabla')}>☰ Lista</button>
          </div>
        </div>

        {loading ? (
          <div className="empty">Cargando catálogo...</div>
        ) : items.length === 0 ? (
          <div className="empty">No hay piezas con los filtros seleccionados</div>
        ) : vista === 'grid' ? (
          <div className="catalogo-grid">
            {items.map(item => (
              <TarjetaCatalogo key={item.id} item={item} onEdit={() => setModal(item)} />
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Nombre</th><th>Código</th><th>Categoría</th><th>Precio</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.nombre}{item.destacado && <span className="badge badge--warn" style={{ marginLeft: 6 }}>★</span>}</td>
                    <td><span className="mono">{item.codigo ?? '—'}</span></td>
                    <td>{item.categoria ?? '—'}</td>
                    <td className="text-pos">{fmt(item.precio)}</td>
                    <td><span className={`badge badge--${item.disponible ? 'ok' : 'neg'}`}>{item.disponible ? 'Disponible' : 'Agotado'}</span></td>
                    <td className="td-actions">
                      <button className="btn-xs" onClick={() => setModal(item)}>Editar</button>
                      <a href={`https://wa.me/?text=${buildWhatsAppMsg(item)}`} target="_blank" rel="noopener noreferrer" className="btn-wa btn-wa--sm">📲</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <ModalCatalogo
          item={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
