import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Transaccion, CuentaBanco, Categoria } from '../../types'

const fmt = (n: number, cur = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style:'currency', currency:cur, maximumFractionDigits:0 }).format(n)

const hoy = new Date().toISOString().split('T')[0]
const primerMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

/* ── KPIs ── */
function useKPIs() {
  const [data, setData] = useState({ ingresos_hoy:0, egresos_hoy:0, saldo_total:0, utilidad_mes:0 })
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    const [ih, eh, ctas, im, em] = await Promise.all([
      supabase.from('transacciones').select('monto_mxn').eq('tipo','ingreso').eq('fecha',hoy),
      supabase.from('transacciones').select('monto_mxn').eq('tipo','egreso').eq('fecha',hoy),
      supabase.from('cuentas_banco').select('saldo_actual').eq('activo',true),
      supabase.from('transacciones').select('monto_mxn').eq('tipo','ingreso').gte('fecha',primerMes),
      supabase.from('transacciones').select('monto_mxn').eq('tipo','egreso').gte('fecha',primerMes),
    ])
    const s = (rows: any[]) => (rows??[]).reduce((a:number,r:any)=>a+(r.monto_mxn??0),0)
    setData({
      ingresos_hoy: s(ih.data??[]), egresos_hoy: s(eh.data??[]),
      saldo_total: (ctas.data??[]).reduce((a:number,r:any)=>a+(r.saldo_actual??0),0),
      utilidad_mes: s(im.data??[]) - s(em.data??[]),
    })
    setLoading(false)
  }, [])
  useEffect(()=>{ load() },[load])
  return { data, loading, reload: load }
}

/* ── Gráfica ── */
function useGrafica() {
  const [datos, setDatos] = useState<{fecha:string;ingresos:number;egresos:number}[]>([])
  useEffect(() => {
    supabase.from('transacciones').select('fecha,tipo,monto_mxn')
      .gte('fecha',primerMes).lte('fecha',hoy).then(({ data }) => {
        const m: Record<string,{ingresos:number;egresos:number}> = {}
        for (const t of data??[]) {
          if (!m[t.fecha]) m[t.fecha] = {ingresos:0,egresos:0}
          if (t.tipo==='ingreso') m[t.fecha].ingresos += t.monto_mxn??0
          else m[t.fecha].egresos += t.monto_mxn??0
        }
        setDatos(Object.entries(m).map(([f,v])=>({fecha:f.slice(5),...v})))
      })
  },[])
  return datos
}

/* ── KPI Card ── */
function KPICard({ titulo, valor, tipo }: { titulo:string; valor:number; tipo:'pos'|'neg'|'neutral' }) {
  return (
    <div className={`kpi-card kpi-card--${tipo}`}>
      <span className="kpi-titulo">{titulo}</span>
      <span className="kpi-valor">{fmt(valor)}</span>
    </div>
  )
}

/* ── Cuentas semáforo ── */
function Cuentas() {
  const [cuentas, setCuentas] = useState<CuentaBanco[]>([])
  useEffect(() => { supabase.from('cuentas_banco').select('*').eq('activo',true).then(({data})=>setCuentas(data??[])) },[])
  const icon: Record<string,string> = { banco:'🏦', efectivo:'💵', terminal:'💳' }
  return (
    <section className="card">
      <h3 className="card-title">Saldo por cuenta</h3>
      <div className="cuentas-list">
        {cuentas.map(c => {
          const s = c.saldo_actual <= 0 ? 'rojo' : c.saldo_actual <= c.saldo_minimo ? 'amarillo' : 'verde'
          return (
            <div key={c.id} className={`cuenta-row cuenta-row--${s}`}>
              <span>{icon[c.tipo] ?? '💰'}</span>
              <div className="cuenta-info">
                <span className="cuenta-nombre">{c.nombre}</span>
                <span className="cuenta-tipo">{c.tipo} · {c.moneda}</span>
              </div>
              <div>
                <span className="cuenta-saldo">{fmt(c.saldo_actual, c.moneda)}</span>
                <div className={`semaforo semaforo--${s}`} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ── Tabla transacciones ── */
function Tabla({ onNueva }: { onNueva: () => void }) {
  const [txs, setTxs] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [fi, setFi] = useState(primerMes)
  const [ff, setFf] = useState(hoy)
  const [tipo, setTipo] = useState('todos')

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('transacciones')
      .select('*,categorias_gasto(nombre),cuentas_banco(nombre),usuarios(nombre)')
      .gte('fecha',fi).lte('fecha',ff).order('fecha',{ascending:false}).order('created_at',{ascending:false}).limit(200)
    if (tipo !== 'todos') q = q.eq('tipo', tipo)
    q.then(({ data }) => { setTxs((data as Transaccion[]) ?? []); setLoading(false) })
  }, [fi, ff, tipo])

  return (
    <section className="card">
      <div className="card-header">
        <h3 className="card-title">Transacciones</h3>
        <button className="btn-gold" onClick={onNueva}>+ Nueva</button>
      </div>
      <div className="filtros">
        <input type="date" className="filtro-input" value={fi} onChange={e=>setFi(e.target.value)} />
        <input type="date" className="filtro-input" value={ff} onChange={e=>setFf(e.target.value)} />
        <select className="filtro-input" value={tipo} onChange={e=>setTipo(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="ingreso">Ingresos</option>
          <option value="egreso">Egresos</option>
        </select>
        <span className="filtro-count">{txs.length} registros</span>
      </div>
      {loading ? <div className="empty">Cargando...</div> : txs.length === 0 ? <div className="empty">Sin transacciones</div> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th>Fecha</th><th>Tipo</th><th>Monto</th><th>Categoría</th><th>Descripción</th><th>Cuenta</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {txs.map(t => (
                <tr key={t.id}>
                  <td>{t.fecha}</td>
                  <td><span className={`badge badge--${t.tipo}`}>{t.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}</span></td>
                  <td className={t.tipo==='ingreso'?'text-pos':'text-neg'}>{fmt(t.monto,t.moneda)}{t.moneda==='USD'&&<small> ≈{fmt(t.monto_mxn)}</small>}</td>
                  <td>{(t.categorias_gasto as any)?.nombre??'—'}</td>
                  <td className="td-desc">{t.descripcion??'—'}</td>
                  <td>{(t.cuentas_banco as any)?.nombre??'—'}</td>
                  <td><span className={`badge badge--${t.aprobado?'ok':'pend'}`}>{t.aprobado?'Aprobado':'Pendiente'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ── Formulario captura ── */
function FormCaptura({ onSuccess }: { onSuccess: () => void }) {
  const { perfil } = useAuth()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cuentas, setCuentas]       = useState<CuentaBanco[]>([])
  const [form, setForm] = useState({ tipo:'egreso', fecha:hoy, monto:'', moneda:'MXN', tipo_cambio:'', categoria_id:'', descripcion:'', cuenta_id:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)
  const [ok, setOk]           = useState(false)

  useEffect(() => {
    supabase.from('categorias_gasto').select('*').eq('activo',true).eq('tipo',form.tipo).then(({data})=>setCategorias(data??[]))
  }, [form.tipo])
  useEffect(() => {
    supabase.from('cuentas_banco').select('*').eq('activo',true).then(({data})=>setCuentas(data??[]))
  }, [])

  const set = (k: string, v: string) => { setForm(p=>({...p,[k]:v})); setError(null); setOk(false) }

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!form.cuenta_id) return setError('Selecciona una cuenta')
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) return setError('Monto inválido')
    if (form.moneda==='USD' && (!form.tipo_cambio || isNaN(Number(form.tipo_cambio)))) return setError('Ingresa el tipo de cambio')
    setLoading(true)
    const { error } = await supabase.from('transacciones').insert({
      tipo: form.tipo, fecha: form.fecha, monto: Number(form.monto),
      moneda: form.moneda, tipo_cambio: form.moneda==='USD'?Number(form.tipo_cambio):null,
      categoria_id: form.categoria_id||null, descripcion: form.descripcion||null,
      cuenta_id: form.cuenta_id, sucursal_id: perfil?.sucursal_id??null,
      capturado_por: perfil?.id??null,
      aprobado: ['socio','administrador'].includes(perfil?.rol??''),
    })
    if (error) setError(error.message)
    else { setOk(true); setForm(p=>({...p,monto:'',descripcion:'',categoria_id:'',tipo_cambio:''})); onSuccess() }
    setLoading(false)
  }

  return (
    <section className="card">
      <h3 className="card-title">Capturar transacción</h3>
      <form onSubmit={submit} className="form-grid">
        <div className="tipo-toggle">
          {(['egreso','ingreso'] as const).map(t => (
            <button key={t} type="button"
              className={`tipo-btn tipo-btn--${t}${form.tipo===t?' tipo-btn--active':''}`}
              onClick={()=>set('tipo',t)}>
              {t==='ingreso'?'↑ Ingreso':'↓ Egreso'}
            </button>
          ))}
        </div>
        <div className="form-row">
          <div className="field"><label className="field-label">Fecha</label>
            <input type="date" className="field-input" value={form.fecha} onChange={e=>set('fecha',e.target.value)} required /></div>
          <div className="field"><label className="field-label">Moneda</label>
            <select className="field-input" value={form.moneda} onChange={e=>set('moneda',e.target.value)}>
              <option value="MXN">MXN</option><option value="USD">USD</option>
            </select></div>
          <div className="field"><label className="field-label">Monto ({form.moneda})</label>
            <input type="number" className="field-input" value={form.monto} onChange={e=>set('monto',e.target.value)} min="0.01" step="0.01" placeholder="0.00" required /></div>
          {form.moneda==='USD' && <div className="field"><label className="field-label">Tipo cambio</label>
            <input type="number" className="field-input" value={form.tipo_cambio} onChange={e=>set('tipo_cambio',e.target.value)} placeholder="17.50" /></div>}
          <div className="field"><label className="field-label">Categoría</label>
            <select className="field-input" value={form.categoria_id} onChange={e=>set('categoria_id',e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></div>
          <div className="field"><label className="field-label">Cuenta</label>
            <select className="field-input" value={form.cuenta_id} onChange={e=>set('cuenta_id',e.target.value)} required>
              <option value="">Selecciona...</option>
              {cuentas.filter(c=>form.moneda==='USD'?c.moneda==='USD':c.moneda==='MXN')
                .map(c=><option key={c.id} value={c.id}>{c.nombre} — {fmt(c.saldo_actual,c.moneda)}</option>)}
            </select></div>
          <div className="field field--full"><label className="field-label">Descripción</label>
            <textarea className="field-input" rows={2} value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Detalle de la transacción..." /></div>
        </div>
        {error && <div className="alert alert--error">⚠ {error}</div>}
        {ok    && <div className="alert alert--ok">✓ Guardado correctamente</div>}
        <div className="form-actions">
          <button type="submit" className="btn-gold" disabled={loading}>{loading?'Guardando...':'Guardar'}</button>
        </div>
      </form>
    </section>
  )
}

/* ── Dashboard principal ── */
export default function Finanzas() {
  const { rol } = useAuth()
  const { data, loading, reload } = useKPIs()
  const grafica = useGrafica()
  const [vista, setVista] = useState<'dashboard'|'captura'>('dashboard')

  return (
    <div className="modulo">
      <div className="modulo-header">
        <div><h1 className="modulo-titulo">Finanzas</h1>
          <p className="modulo-sub">{rol==='contador'?'Solo lectura':'Gestión de ingresos y egresos'}</p></div>
        <div className="modulo-actions">
          <button className={`tab${vista==='dashboard'?' tab--active':''}`} onClick={()=>setVista('dashboard')}>▤ Dashboard</button>
          {rol !== 'contador' && <button className={`tab${vista==='captura'?' tab--active':''}`} onClick={()=>setVista('captura')}>+ Capturar</button>}
          <button className="btn-icon" onClick={reload} title="Recargar">↺</button>
        </div>
      </div>

      {vista==='dashboard' && <>
        <div className="kpis">
          {loading ? [1,2,3,4].map(i=><div key={i} className="kpi-card kpi-card--skeleton"/>) : <>
            <KPICard titulo="Ingresos hoy"    valor={data.ingresos_hoy}  tipo="pos" />
            <KPICard titulo="Egresos hoy"     valor={data.egresos_hoy}   tipo="neg" />
            <KPICard titulo="Saldo total"     valor={data.saldo_total}   tipo={data.saldo_total>=0?'pos':'neg'} />
            <KPICard titulo="Utilidad del mes" valor={data.utilidad_mes} tipo={data.utilidad_mes>=0?'pos':'neg'} />
          </>}
        </div>
        <div className="grid-2">
          <section className="card">
            <h3 className="card-title">Ingresos vs Egresos — Mes actual</h3>
            {grafica.length === 0 ? <div className="empty">Sin datos este mes</div> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={grafica} margin={{top:4,right:12,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A42" />
                  <XAxis dataKey="fecha" tick={{fill:'#9090B0',fontSize:11}} axisLine={{stroke:'#2A2A42'}} tickLine={false} />
                  <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fill:'#9090B0',fontSize:11}} axisLine={{stroke:'#2A2A42'}} tickLine={false} width={48} />
                  <Tooltip contentStyle={{background:'#1A1A28',border:'1px solid #2A2A42',borderRadius:8,color:'#E8E8F2'}}
                    formatter={(v,n)=>[fmt(Number(v??0)),String(n)==='ingresos'?'Ingresos':'Egresos']} />
                  <Legend wrapperStyle={{color:'#9090B0',fontSize:12}} />
                  <Bar dataKey="ingresos" fill="#C9992A" radius={[4,4,0,0]} />
                  <Bar dataKey="egresos"  fill="#4A4A6A" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>
          <Cuentas />
        </div>
        <Tabla onNueva={()=>setVista('captura')} />
      </>}

      {vista==='captura' && rol !== 'contador' &&
        <FormCaptura onSuccess={() => { reload(); setTimeout(()=>setVista('dashboard'),1500) }} />}
    </div>
  )
}
