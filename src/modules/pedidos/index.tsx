import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Pedido, EstatusPedido, Sucursal } from '../../types'
import { format, isPast, isToday, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTATUS_CONFIG: Record<EstatusPedido, { label:string; color:string; next?: EstatusPedido }> = {
  levantado:       { label:'Levantado',        color:'#9090B0', next:'recibido'       },
  recibido:        { label:'Recibido',          color:'#7C9EF8', next:'en_produccion'  },
  en_produccion:   { label:'En producción',     color:'#E0A030', next:'revision_render'},
  revision_render: { label:'Revisión render',   color:'#D9B5FF', next:'aprobado'       },
  aprobado:        { label:'Aprobado',          color:'#C9992A', next:'enviado'        },
  enviado:         { label:'Enviado',           color:'#6EE7B7', next:'cerrado'        },
  cerrado:         { label:'Cerrado',           color:'#4CAF6E', next: undefined       },
  cancelado:       { label:'Cancelado',         color:'#E05555', next: undefined       },
}

const ORDEN: EstatusPedido[] = ['levantado','recibido','en_produccion','revision_render','aprobado','enviado','cerrado','cancelado']

function usePedidos(filtroEstatus: string, busqueda: string) {
  const [pedidos, setPedidos]   = useState<Pedido[]>([])
  const [loading, setLoading]   = useState(true)

  const load = () => {
    setLoading(true)
    let q = supabase.from('pedidos').select('*,sucursales(nombre)').order('created_at',{ascending:false}).limit(100)
    if (filtroEstatus && filtroEstatus !== 'todos') q = q.eq('estatus', filtroEstatus)
    q.then(({ data }) => {
      let res = (data as Pedido[]) ?? []
      if (busqueda) {
        const b = busqueda.toLowerCase()
        res = res.filter(p => p.folio?.toLowerCase().includes(b) || p.cliente_nombre.toLowerCase().includes(b))
      }
      setPedidos(res); setLoading(false)
    })
  }

  useEffect(load, [filtroEstatus, busqueda])
  return { pedidos, loading, reload: load }
}

function VencimientoBadge({ fecha }: { fecha: string | null }) {
  if (!fecha) return null
  const d = parseISO(fecha)
  const dias = differenceInDays(d, new Date())
  if (isPast(d) && !isToday(d)) return <span className="badge badge--neg">⚠ Vencido {Math.abs(dias)}d</span>
  if (dias <= 3) return <span className="badge badge--warn">⏰ {dias}d</span>
  return <span className="badge badge--ok">{format(d,'dd MMM',{locale:es})}</span>
}

function ModalPedido({ pedido, onClose, onSaved }:
  { pedido: Pedido|null; onClose:()=>void; onSaved:()=>void }) {
  const { perfil } = useAuth()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [form, setForm] = useState({
    cliente_nombre: pedido?.cliente_nombre??'',
    cliente_tel:    pedido?.cliente_tel??'',
    descripcion:    pedido?.descripcion??'',
    especificaciones: pedido?.especificaciones??'',
    fecha_compromiso: pedido?.fecha_compromiso??'',
    precio_acordado: pedido?.precio_acordado?.toString()??'',
    anticipo:       pedido?.anticipo?.toString()??'0',
    sucursal_id:    pedido?.sucursal_id??perfil?.sucursal_id??'',
    prioridad:      pedido?.prioridad??'normal',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)

  useEffect(() => {
    supabase.from('sucursales').select('*').eq('activo',true).then(({data})=>setSucursales(data??[]))
  },[])
  const set = (k:string,v:string) => { setForm(p=>({...p,[k]:v})); setError(null) }

  async function save(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!form.cliente_nombre.trim()) return setError('Nombre del cliente obligatorio')
    if (!form.descripcion.trim()) return setError('Descripción obligatoria')
    setLoading(true)
    const payload = {
      cliente_nombre: form.cliente_nombre.trim(), cliente_tel: form.cliente_tel||null,
      descripcion: form.descripcion.trim(), especificaciones: form.especificaciones||null,
      fecha_compromiso: form.fecha_compromiso||null,
      precio_acordado: form.precio_acordado?Number(form.precio_acordado):null,
      anticipo: Number(form.anticipo||0),
      sucursal_id: form.sucursal_id||null, prioridad: form.prioridad,
      ...(pedido ? { updated_at: new Date().toISOString() } : { creado_por: perfil?.id??null, folio: '' }),
    }
    const { error } = pedido
      ? await supabase.from('pedidos').update(payload).eq('id',pedido.id)
      : await supabase.from('pedidos').insert(payload)
    if (error) setError(error.message)
    else { onSaved(); onClose() }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal--lg">
        <div className="modal-header">
          <h2 className="modal-title">{pedido?`Editar ${pedido.folio}`:'Nuevo pedido'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={save} className="form-grid">
          <div className="form-row">
            <div className="field"><label className="field-label">Cliente *</label>
              <input className="field-input" value={form.cliente_nombre} onChange={e=>set('cliente_nombre',e.target.value)} required /></div>
            <div className="field"><label className="field-label">Teléfono</label>
              <input className="field-input" value={form.cliente_tel} onChange={e=>set('cliente_tel',e.target.value)} /></div>
            <div className="field"><label className="field-label">Sucursal</label>
              <select className="field-input" value={form.sucursal_id} onChange={e=>set('sucursal_id',e.target.value)}>
                <option value="">—</option>
                {sucursales.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select></div>
            <div className="field"><label className="field-label">Prioridad</label>
              <select className="field-input" value={form.prioridad} onChange={e=>set('prioridad',e.target.value)}>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
                <option value="vip">VIP</option>
              </select></div>
            <div className="field field--full"><label className="field-label">Descripción *</label>
              <textarea className="field-input" rows={2} value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} required /></div>
            <div className="field field--full"><label className="field-label">Especificaciones (piedras, medidas, grabados...)</label>
              <textarea className="field-input" rows={3} value={form.especificaciones} onChange={e=>set('especificaciones',e.target.value)} /></div>
            <div className="field"><label className="field-label">Fecha compromiso</label>
              <input type="date" className="field-input" value={form.fecha_compromiso} onChange={e=>set('fecha_compromiso',e.target.value)} /></div>
            <div className="field"><label className="field-label">Precio acordado MXN</label>
              <input type="number" className="field-input" value={form.precio_acordado} onChange={e=>set('precio_acordado',e.target.value)} step="0.01" min="0" /></div>
            <div className="field"><label className="field-label">Anticipo MXN</label>
              <input type="number" className="field-input" value={form.anticipo} onChange={e=>set('anticipo',e.target.value)} step="0.01" min="0" /></div>
          </div>
          {error && <div className="alert alert--error">⚠ {error}</div>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-gold" disabled={loading}>{loading?'Guardando...':'Guardar pedido'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalDetalle({ pedido, onClose, onSaved }:
  { pedido: Pedido; onClose:()=>void; onSaved:()=>void }) {
  const { perfil } = useAuth()
  const [comentario, setComentario] = useState('')
  const [historial, setHistorial]   = useState<any[]>([])
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    supabase.from('pedido_historial').select('*,usuarios(nombre)').eq('pedido_id',pedido.id)
      .order('created_at',{ascending:false}).then(({data})=>setHistorial(data??[]))
  },[pedido.id])

  async function avanzar() {
    const cfg = ESTATUS_CONFIG[pedido.estatus]
    if (!cfg.next) return
    setLoading(true)
    await supabase.from('pedidos').update({ estatus: cfg.next, updated_at: new Date().toISOString() }).eq('id',pedido.id)
    await supabase.from('pedido_historial').insert({ pedido_id:pedido.id, estatus:cfg.next, comentario:`Avanzado a ${ESTATUS_CONFIG[cfg.next].label}`, usuario_id:perfil?.id??null })
    onSaved(); onClose()
  }

  async function agregarComentario() {
    if (!comentario.trim()) return
    setLoading(true)
    await supabase.from('pedido_historial').insert({ pedido_id:pedido.id, estatus:pedido.estatus, comentario:comentario.trim(), usuario_id:perfil?.id??null })
    setComentario('')
    supabase.from('pedido_historial').select('*,usuarios(nombre)').eq('pedido_id',pedido.id)
      .order('created_at',{ascending:false}).then(({data})=>setHistorial(data??[]))
    setLoading(false)
  }

  const cfg = ESTATUS_CONFIG[pedido.estatus]
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal--lg">
        <div className="modal-header">
          <h2 className="modal-title">{pedido.folio} · {pedido.cliente_nombre}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="detalle-grid">
          <div className="detalle-col">
            <div className="detalle-estatus" style={{borderColor:cfg.color}}>
              <span style={{color:cfg.color,fontWeight:700}}>{cfg.label}</span>
              {cfg.next && <button className="btn-gold btn-sm" onClick={avanzar} disabled={loading}>
                → {ESTATUS_CONFIG[cfg.next].label}
              </button>}
            </div>
            <div className="detalle-info">
              <div className="detalle-row"><span>Cliente</span><b>{pedido.cliente_nombre}</b></div>
              {pedido.cliente_tel && <div className="detalle-row"><span>Tel</span><b>{pedido.cliente_tel}</b></div>}
              <div className="detalle-row"><span>Compromiso</span><VencimientoBadge fecha={pedido.fecha_compromiso} /></div>
              <div className="detalle-row"><span>Precio</span><b>{pedido.precio_acordado ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(pedido.precio_acordado) : '—'}</b></div>
              <div className="detalle-row"><span>Anticipo</span><b>{new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(pedido.anticipo)}</b></div>
              <div className="detalle-row"><span>Prioridad</span><span className={`badge badge--${pedido.prioridad==='urgente'?'neg':pedido.prioridad==='vip'?'gold':'ok'}`}>{pedido.prioridad}</span></div>
            </div>
            <div className="detalle-desc">
              <p className="field-label">Descripción</p>
              <p>{pedido.descripcion}</p>
            </div>
            {pedido.especificaciones && <div className="detalle-desc">
              <p className="field-label">Especificaciones</p>
              <p>{pedido.especificaciones}</p>
            </div>}
            {/* Timeline */}
            <div className="timeline-wrap">
              <p className="field-label mb-2">Seguimiento del pedido</p>
              <div className="timeline">
                {ORDEN.map((e,i) => {
                  const idx = ORDEN.indexOf(pedido.estatus)
                  const done = i <= idx && pedido.estatus !== 'cancelado'
                  return (
                    <div key={e} className={`timeline-step${done?' timeline-step--done':''}`}>
                      <div className="timeline-dot" style={done?{background:ESTATUS_CONFIG[e].color}:undefined} />
                      <span className="timeline-label">{ESTATUS_CONFIG[e].label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="detalle-col">
            <p className="field-label mb-2">Historial y comentarios</p>
            <div className="historial">
              {historial.map(h => (
                <div key={h.id} className="historial-item">
                  <div className="historial-header">
                    <span className="badge" style={{background:ESTATUS_CONFIG[h.estatus as EstatusPedido]?.color+'22',color:ESTATUS_CONFIG[h.estatus as EstatusPedido]?.color}}>{ESTATUS_CONFIG[h.estatus as EstatusPedido]?.label??h.estatus}</span>
                    <span className="historial-fecha">{format(parseISO(h.created_at),'dd MMM HH:mm',{locale:es})}</span>
                  </div>
                  {h.comentario && <p className="historial-texto">{h.comentario}</p>}
                  {h.usuarios && <p className="historial-user">— {h.usuarios.nombre}</p>}
                </div>
              ))}
              {historial.length === 0 && <p className="empty">Sin historial</p>}
            </div>
            <div className="comentario-form">
              <textarea className="field-input" rows={2} value={comentario} onChange={e=>setComentario(e.target.value)} placeholder="Agregar comentario..." />
              <button className="btn-gold btn-sm" onClick={agregarComentario} disabled={loading||!comentario.trim()}>Agregar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Pedidos() {
  const [filtroEstatus, setFiltroEstatus] = useState('todos')
  const [busqueda, setBusqueda]           = useState('')
  const [modalNuevo, setModalNuevo]       = useState(false)
  const [detalle, setDetalle]             = useState<Pedido|null>(null)
  const { pedidos, loading, reload }      = usePedidos(filtroEstatus, busqueda)

  const vencidos  = pedidos.filter(p=>p.fecha_compromiso && isPast(parseISO(p.fecha_compromiso)) && !isToday(parseISO(p.fecha_compromiso)) && p.estatus!=='cerrado' && p.estatus!=='cancelado')
  const urgentes  = pedidos.filter(p=>p.prioridad==='urgente'||p.prioridad==='vip')
  const enCurso   = pedidos.filter(p=>!['cerrado','cancelado'].includes(p.estatus))

  return (
    <div className="modulo">
      <div className="modulo-header">
        <div><h1 className="modulo-titulo">Pedidos Personalizados</h1>
          <p className="modulo-sub">Gestión de órdenes de clientes</p></div>
        <button className="btn-gold" onClick={()=>setModalNuevo(true)}>+ Nuevo pedido</button>
      </div>

      <div className="kpis">
        <div className="kpi-card kpi-card--neutral"><span className="kpi-titulo">En curso</span><span className="kpi-valor">{enCurso.length}</span></div>
        <div className="kpi-card kpi-card--neg"><span className="kpi-titulo">Vencidos</span><span className="kpi-valor">{vencidos.length}</span></div>
        <div className="kpi-card kpi-card--warn"><span className="kpi-titulo">Urgentes / VIP</span><span className="kpi-valor">{urgentes.length}</span></div>
        <div className="kpi-card kpi-card--pos"><span className="kpi-titulo">Total registros</span><span className="kpi-valor">{pedidos.length}</span></div>
      </div>

      <section className="card">
        <div className="filtros">
          <input className="filtro-input" placeholder="🔍 Folio o cliente..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          <select className="filtro-input" value={filtroEstatus} onChange={e=>setFiltroEstatus(e.target.value)}>
            <option value="todos">Todos los estatus</option>
            {ORDEN.map(e=><option key={e} value={e}>{ESTATUS_CONFIG[e].label}</option>)}
          </select>
        </div>
        {loading ? <div className="empty">Cargando pedidos...</div> : pedidos.length===0 ? <div className="empty">No hay pedidos</div> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th>Folio</th><th>Cliente</th><th>Descripción</th><th>Sucursal</th>
                <th>Compromiso</th><th>Precio</th><th>Prioridad</th><th>Estatus</th><th></th>
              </tr></thead>
              <tbody>
                {pedidos.map(p => {
                  const cfg = ESTATUS_CONFIG[p.estatus]
                  return (
                    <tr key={p.id} className={vencidos.includes(p)?'tr--alert':''}>
                      <td><span className="mono">{p.folio}</span></td>
                      <td><b>{p.cliente_nombre}</b>{p.cliente_tel&&<><br/><small className="text-muted">{p.cliente_tel}</small></>}</td>
                      <td className="td-desc">{p.descripcion}</td>
                      <td>{(p.sucursales as any)?.nombre??'—'}</td>
                      <td><VencimientoBadge fecha={p.fecha_compromiso} /></td>
                      <td>{p.precio_acordado?new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(p.precio_acordado):'—'}</td>
                      <td><span className={`badge badge--${p.prioridad==='urgente'?'neg':p.prioridad==='vip'?'gold':'ok'}`}>{p.prioridad}</span></td>
                      <td><span className="badge" style={{background:cfg.color+'22',color:cfg.color}}>{cfg.label}</span></td>
                      <td><button className="btn-xs" onClick={()=>setDetalle(p)}>Ver</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalNuevo && <ModalPedido pedido={null} onClose={()=>setModalNuevo(false)} onSaved={reload} />}
      {detalle    && <ModalDetalle pedido={detalle} onClose={()=>setDetalle(null)} onSaved={reload} />}
    </div>
  )
}
