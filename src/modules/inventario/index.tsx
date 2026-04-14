import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Lote, Sucursal } from '../../types'

const fmt = (n: number|null, cur='MXN') => n == null ? '—' :
  new Intl.NumberFormat('es-MX',{style:'currency',currency:cur,maximumFractionDigits:0}).format(n)

const TIPOS_PIEDRA = ['diamante','esmeralda','rubi','zafiro','perla','otro']
const METALES      = ['Oro 14k','Oro 18k','Plata 925','Platino','Acero','Otro']

function useLotes(sucursalFiltro: string, busqueda: string, soloDisponibles: boolean) {
  const [lotes, setLotes]   = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('lotes').select('*,sucursales(nombre,ciudad)').eq('activo',true)
      .order('created_at',{ascending:false})
    if (sucursalFiltro) q = q.eq('sucursal_id', sucursalFiltro)
    if (soloDisponibles) q = q.eq('vendido', false)
    q.then(({ data }) => {
      let res = (data as Lote[]) ?? []
      if (busqueda) {
        const b = busqueda.toLowerCase()
        res = res.filter(l => l.codigo.toLowerCase().includes(b) || l.descripcion.toLowerCase().includes(b))
      }
      setLotes(res); setLoading(false)
    })
  }, [sucursalFiltro, busqueda, soloDisponibles])

  return { lotes, loading, reload: () => setLoading(true) }
}

function ModalLote({ lote, onClose, onSaved, puedeVerCostos }:
  { lote: Lote|null; onClose:()=>void; onSaved:()=>void; puedeVerCostos:boolean }) {
  const { perfil } = useAuth()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [form, setForm] = useState({
    codigo: lote?.codigo??'', descripcion: lote?.descripcion??'',
    tipo_piedra: lote?.tipo_piedra??'', quilates: lote?.quilates?.toString()??'',
    metal: lote?.metal??'', costo: lote?.costo?.toString()??'',
    precio_venta: lote?.precio_venta?.toString()??'',
    sucursal_id: lote?.sucursal_id??perfil?.sucursal_id??'', notas: lote?.notas??'',
    vendido: lote?.vendido??false, fecha_venta: lote?.fecha_venta??'',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)

  useEffect(() => {
    supabase.from('sucursales').select('*').eq('activo',true).then(({data})=>setSucursales(data??[]))
  },[])

  const set = (k:string, v:string|boolean) => { setForm(p=>({...p,[k]:v})); setError(null) }

  async function save(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!form.codigo.trim()) return setError('El código es obligatorio')
    setLoading(true)
    const payload = {
      codigo: form.codigo.trim(), descripcion: form.descripcion.trim(),
      tipo_piedra: form.tipo_piedra||null, quilates: form.quilates?Number(form.quilates):null,
      metal: form.metal||null,
      costo: puedeVerCostos && form.costo ? Number(form.costo) : undefined,
      precio_venta: form.precio_venta?Number(form.precio_venta):null,
      sucursal_id: form.sucursal_id||null, notas: form.notas||null,
      vendido: form.vendido, fecha_venta: form.vendido?form.fecha_venta||null:null,
    }
    const { error } = lote
      ? await supabase.from('lotes').update(payload).eq('id',lote.id)
      : await supabase.from('lotes').insert(payload)
    if (error) setError(error.message)
    else { onSaved(); onClose() }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{lote?`Editar ${lote.codigo}`:'Nuevo lote'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={save} className="form-grid">
          <div className="form-row">
            <div className="field"><label className="field-label">Código *</label>
              <input className="field-input" value={form.codigo} onChange={e=>set('codigo',e.target.value)} required /></div>
            <div className="field"><label className="field-label">Sucursal</label>
              <select className="field-input" value={form.sucursal_id} onChange={e=>set('sucursal_id',e.target.value)}>
                <option value="">Sin asignar</option>
                {sucursales.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select></div>
            <div className="field field--full"><label className="field-label">Descripción *</label>
              <input className="field-input" value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} required /></div>
            <div className="field"><label className="field-label">Tipo de piedra</label>
              <select className="field-input" value={form.tipo_piedra} onChange={e=>set('tipo_piedra',e.target.value)}>
                <option value="">—</option>
                {TIPOS_PIEDRA.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select></div>
            <div className="field"><label className="field-label">Quilates</label>
              <input type="number" className="field-input" value={form.quilates} onChange={e=>set('quilates',e.target.value)} step="0.001" min="0" /></div>
            <div className="field"><label className="field-label">Metal</label>
              <select className="field-input" value={form.metal} onChange={e=>set('metal',e.target.value)}>
                <option value="">—</option>
                {METALES.map(m=><option key={m} value={m}>{m}</option>)}
              </select></div>
            {puedeVerCostos && <>
              <div className="field"><label className="field-label">Costo MXN</label>
                <input type="number" className="field-input" value={form.costo} onChange={e=>set('costo',e.target.value)} step="0.01" min="0" /></div>
            </>}
            <div className="field"><label className="field-label">Precio venta MXN</label>
              <input type="number" className="field-input" value={form.precio_venta} onChange={e=>set('precio_venta',e.target.value)} step="0.01" min="0" /></div>
            <div className="field field--full"><label className="field-label">Notas</label>
              <textarea className="field-input" rows={2} value={form.notas} onChange={e=>set('notas',e.target.value)} /></div>
            <div className="field field--full">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.vendido} onChange={e=>set('vendido',e.target.checked)} />
                <span>Marcar como vendido</span>
              </label>
              {form.vendido && <input type="date" className="field-input mt-2" value={form.fecha_venta} onChange={e=>set('fecha_venta',e.target.value)} />}
            </div>
          </div>
          {error && <div className="alert alert--error">⚠ {error}</div>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-gold" disabled={loading}>{loading?'Guardando...':'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Inventario() {
  const { puedeVerCostos, perfil } = useAuth()
  const [sucursales, setSucursales]   = useState<Sucursal[]>([])
  const [sucFiltro, setSucFiltro]     = useState(perfil?.sucursal_id??'')
  const [busqueda, setBusqueda]       = useState('')
  const [soloDisp, setSoloDisp]       = useState(true)
  const [modal, setModal]             = useState<Lote|null|'nuevo'>(null)
  const { lotes, loading, reload }    = useLotes(sucFiltro, busqueda, soloDisp)
  useEffect(() => {
    supabase.from('sucursales').select('*').eq('activo',true).then(({data})=>setSucursales(data??[]))
  },[])

  const totalLotes    = lotes.length
  const totalVendidos = lotes.filter(l=>l.vendido).length
  const totalValor    = lotes.filter(l=>!l.vendido).reduce((a,l)=>a+(l.precio_venta??0),0)

  return (
    <div className="modulo">
      <div className="modulo-header">
        <div><h1 className="modulo-titulo">Inventario de Lotes</h1>
          <p className="modulo-sub">Control de piezas por sucursal</p></div>
        <button className="btn-gold" onClick={()=>setModal('nuevo')}>+ Nuevo lote</button>
      </div>

      <div className="kpis">
        <div className="kpi-card kpi-card--neutral"><span className="kpi-titulo">Total lotes</span><span className="kpi-valor">{totalLotes}</span></div>
        <div className="kpi-card kpi-card--pos"><span className="kpi-titulo">Disponibles</span><span className="kpi-valor">{totalLotes-totalVendidos}</span></div>
        <div className="kpi-card kpi-card--neg"><span className="kpi-titulo">Vendidos</span><span className="kpi-valor">{totalVendidos}</span></div>
        <div className="kpi-card kpi-card--neutral"><span className="kpi-titulo">Valor disponible</span><span className="kpi-valor">{new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(totalValor)}</span></div>
      </div>

      <section className="card">
        <div className="filtros">
          <input className="filtro-input" placeholder="🔍 Buscar código o descripción..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          <select className="filtro-input" value={sucFiltro} onChange={e=>setSucFiltro(e.target.value)}>
            <option value="">Todas las sucursales</option>
            {sucursales.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <label className="checkbox-label">
            <input type="checkbox" checked={soloDisp} onChange={e=>setSoloDisp(e.target.checked)} />
            <span>Solo disponibles</span>
          </label>
        </div>
        {loading ? <div className="empty">Cargando inventario...</div> : lotes.length===0 ? <div className="empty">No hay lotes con los filtros seleccionados</div> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th>Código</th><th>Descripción</th><th>Piedra</th><th>Metal</th>
                {puedeVerCostos() && <th>Costo</th>}
                <th>Precio venta</th><th>Sucursal</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {lotes.map(l => (
                  <tr key={l.id}>
                    <td><span className="mono">{l.codigo}</span></td>
                    <td className="td-desc">{l.descripcion}</td>
                    <td>{l.tipo_piedra?l.tipo_piedra.charAt(0).toUpperCase()+l.tipo_piedra.slice(1):'—'}{l.quilates?` ${l.quilates}ct`:''}</td>
                    <td>{l.metal??'—'}</td>
                    {puedeVerCostos() && <td className="text-muted">{fmt(l.costo)}</td>}
                    <td className="text-pos">{fmt(l.precio_venta)}</td>
                    <td>{(l.sucursales as any)?.nombre??'—'}</td>
                    <td><span className={`badge badge--${l.vendido?'neg':'ok'}`}>{l.vendido?'Vendido':'Disponible'}</span></td>
                    <td><button className="btn-xs" onClick={()=>setModal(l)}>Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && <ModalLote
        lote={modal==='nuevo'?null:modal}
        onClose={()=>setModal(null)}
        onSaved={reload}
        puedeVerCostos={puedeVerCostos()}
      />}
    </div>
  )
}
