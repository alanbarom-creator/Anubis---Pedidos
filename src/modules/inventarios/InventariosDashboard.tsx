import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { InventarioItem } from '../../types/database'
import * as XLSX from 'xlsx'

type Vista = 'dashboard' | 'tabla' | 'captura'
type TipoFiltro = 'todos' | 'diamante' | 'piedra'

const fmt = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n)

export default function InventariosDashboard() {
  const { isSocioOrAdmin } = useAuth()
  const [vista, setVista] = useState<Vista>('tabla')
  const [items, setItems] = useState<InventarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('inventario_items')
      .select('*')
      .eq('activo', true)
      .order('tipo')
      .order('descripcion')
    setItems((data as InventarioItem[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const itemsFiltrados = items.filter(i => {
    if (tipoFiltro !== 'todos' && i.tipo !== tipoFiltro) return false
    if (busqueda) {
      const b = busqueda.toLowerCase()
      return (
        i.descripcion?.toLowerCase().includes(b) ||
        i.codigo?.toLowerCase().includes(b) ||
        i.tipo_piedra?.toLowerCase().includes(b) ||
        i.proveedor?.toLowerCase().includes(b)
      )
    }
    return true
  })

  // KPIs
  const totalDiamantes = items.filter(i => i.tipo === 'diamante').length
  const totalPiedras = items.filter(i => i.tipo === 'piedra').length
  const totalCosto = items.reduce((a, i) => a + (i.costo_total ?? 0), 0)
  const totalExistencia = items.reduce((a, i) => a + i.existencia, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="modulo-header">
        <div>
          <h1 className="modulo-titulo">Inventario</h1>
          <p className="modulo-subtitulo">Diamantes y piedras preciosas en existencia</p>
        </div>
        <div className="modulo-acciones">
          {isSocioOrAdmin && (
            <button className={`tab-btn ${vista === 'dashboard' ? 'tab-btn--active' : ''}`}
              onClick={() => setVista('dashboard')}>Dashboard</button>
          )}
          <button className={`tab-btn ${vista === 'tabla' ? 'tab-btn--active' : ''}`}
            onClick={() => setVista('tabla')}>Inventario</button>
          <button className={`tab-btn ${vista === 'captura' ? 'tab-btn--active' : ''}`}
            onClick={() => setVista('captura')}>+ Agregar</button>
          <button className="btn-icon" onClick={cargar} title="Recargar">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4a8 8 0 0112.2 1.4M16 16a8 8 0 01-12.2-1.4M4 8V4H0M16 12v4h4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Dashboard socios */}
      {vista === 'dashboard' && isSocioOrAdmin && (
        <>
          <div className="inv-stats-grid">
            <div className="kpi-card kpi-card--default">
              <div className="kpi-titulo">Total ítems</div>
              <div className="kpi-valor">{items.length}</div>
              <div className="kpi-desc">En inventario activo</div>
            </div>
            <div className="kpi-card kpi-card--info">
              <div className="kpi-titulo">Diamantes</div>
              <div className="kpi-valor">{totalDiamantes}</div>
              <div className="kpi-desc">Piezas registradas</div>
            </div>
            <div className="kpi-card kpi-card--warning">
              <div className="kpi-titulo">Piedras</div>
              <div className="kpi-valor">{totalPiedras}</div>
              <div className="kpi-desc">Piezas registradas</div>
            </div>
            <div className="kpi-card kpi-card--positive">
              <div className="kpi-titulo">Existencia total</div>
              <div className="kpi-valor">{totalExistencia}</div>
              <div className="kpi-desc">Unidades disponibles</div>
            </div>
            <div className="kpi-card kpi-card--positive">
              <div className="kpi-titulo">Costo total</div>
              <div className="kpi-valor" style={{ fontSize: 18 }}>{fmt(totalCosto)}</div>
              <div className="kpi-desc">Valor del inventario</div>
            </div>
          </div>

          <div className="dashboard-grid-2">
            <ResumenPorTipo items={items.filter(i => i.tipo === 'diamante')} titulo="Diamantes por calidad" campo="calidad" />
            <ResumenPorTipo items={items.filter(i => i.tipo === 'piedra')} titulo="Piedras por tipo" campo="tipo_piedra" />
          </div>
        </>
      )}

      {/* Tabla inventario */}
      {vista === 'tabla' && (
        <>
          <div className="filtros-row">
            <div className="filtro-group">
              <label className="filtro-label">Tipo</label>
              <select className="filtro-input" value={tipoFiltro}
                onChange={e => setTipoFiltro(e.target.value as TipoFiltro)}>
                <option value="todos">Todos</option>
                <option value="diamante">Diamantes</option>
                <option value="piedra">Piedras</option>
              </select>
            </div>
            <div className="filtro-group" style={{ minWidth: 220 }}>
              <label className="filtro-label">Buscar</label>
              <input type="text" className="filtro-input" value={busqueda}
                onChange={e => setBusqueda(e.target.value)} placeholder="Código, descripción..." />
            </div>
          </div>

          <section className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ marginBottom: 0 }}>
                {tipoFiltro === 'todos' ? 'Diamantes y Piedras' : tipoFiltro === 'diamante' ? 'Diamantes' : 'Piedras'}
              </h3>
              <span className="card-count">{itemsFiltrados.length} ítems</span>
            </div>
            {loading ? (
              <div className="loading-row">Cargando inventario...</div>
            ) : itemsFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">◇</div>
                Sin ítems en inventario
              </div>
            ) : (
              <div className="tabla-wrapper">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th className="tabla-th">Tipo</th>
                      <th className="tabla-th">Código</th>
                      <th className="tabla-th">Descripción</th>
                      <th className="tabla-th">Calidad / Tipo</th>
                      <th className="tabla-th">Ct</th>
                      <th className="tabla-th">Color</th>
                      <th className="tabla-th">Corte</th>
                      <th className="tabla-th">Origen</th>
                      <th className="tabla-th">Certificado</th>
                      <th className="tabla-th">Existencia</th>
                      {isSocioOrAdmin && (
                        <>
                          <th className="tabla-th">Proveedor</th>
                          <th className="tabla-th">Costo unit.</th>
                          <th className="tabla-th">Costo total</th>
                        </>
                      )}
                      <th className="tabla-th">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsFiltrados.map(item => (
                      <tr key={item.id} className="tabla-fila">
                        <td className="tabla-celda">
                          <span className="badge" style={{
                            background: item.tipo === 'diamante' ? 'rgba(74,158,224,0.1)' : 'rgba(201,153,42,0.1)',
                            color: item.tipo === 'diamante' ? 'var(--info)' : 'var(--gold)',
                          }}>
                            {item.tipo === 'diamante' ? 'Diamante' : 'Piedra'}
                          </span>
                        </td>
                        <td className="tabla-celda" style={{ color: 'var(--gold)', fontWeight: 600 }}>{item.codigo ?? '—'}</td>
                        <td className="tabla-celda">{item.descripcion ?? '—'}</td>
                        <td className="tabla-celda">{item.calidad ?? item.tipo_piedra ?? '—'}</td>
                        <td className="tabla-celda">{item.ct != null ? item.ct.toFixed(2) : '—'}</td>
                        <td className="tabla-celda">{item.color ?? '—'}</td>
                        <td className="tabla-celda">{item.corte ?? item.forma ?? '—'}</td>
                        <td className="tabla-celda">{item.origen ?? '—'}</td>
                        <td className="tabla-celda">{item.certificado ?? '—'}</td>
                        <td className="tabla-celda" style={{ fontWeight: 700, color: item.existencia > 0 ? 'var(--positive)' : 'var(--negative)' }}>
                          {item.existencia} {item.unidad ?? ''}
                        </td>
                        {isSocioOrAdmin && (
                          <>
                            <td className="tabla-celda">{item.proveedor ?? '—'}</td>
                            <td className="tabla-celda tabla-celda--monto">{fmt(item.costo_unitario)}</td>
                            <td className="tabla-celda tabla-celda--monto">{fmt(item.costo_total)}</td>
                          </>
                        )}
                        <td className="tabla-celda tabla-celda--desc">{item.notas ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Agregar / importar */}
      {vista === 'captura' && (
        <InventarioCaptura
          isSocioOrAdmin={isSocioOrAdmin}
          onSuccess={() => { cargar(); setVista('tabla') }}
          onCancel={() => setVista('tabla')}
        />
      )}
    </div>
  )
}

// ── Resumen por campo ──────────────────────────────────────
function ResumenPorTipo({ items, titulo, campo }: {
  items: InventarioItem[]
  titulo: string
  campo: keyof InventarioItem
}) {
  const grupos: Record<string, number> = {}
  for (const i of items) {
    const k = String(i[campo] ?? 'Sin dato')
    grupos[k] = (grupos[k] ?? 0) + i.existencia
  }
  const entries = Object.entries(grupos).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const max = entries[0]?.[1] ?? 1

  return (
    <section className="card">
      <h3 className="card-title">{titulo}</h3>
      {entries.length === 0 ? (
        <div className="empty-state" style={{ padding: '12px 0' }}>Sin datos</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(([label, cnt]) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{cnt}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
                <div style={{ height: '100%', borderRadius: 2, background: 'var(--gold)', width: `${(cnt/max)*100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Formulario / Importar Excel ────────────────────────────
function InventarioCaptura({ isSocioOrAdmin, onSuccess, onCancel }: {
  isSocioOrAdmin: boolean
  onSuccess: () => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'manual' | 'excel'>('manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    tipo: 'diamante' as 'diamante' | 'piedra',
    codigo: '',
    descripcion: '',
    calidad: '',
    ct: '',
    color: '',
    claridad: '',
    corte: '',
    forma: '',
    tipo_piedra: '',
    puntos: '',
    origen: '',
    certificado: '',
    existencia: '1',
    unidad: 'pz',
    proveedor: '',
    costo_unitario: '',
    costo_total: '',
    notas: '',
  })

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    setError(null)
  }

  async function handleManual(e: FormEvent) {
    e.preventDefault()
    if (!form.existencia || Number(form.existencia) < 0) return setError('Existencia inválida.')
    setLoading(true)

    const payload = {
      tipo: form.tipo,
      codigo: form.codigo || null,
      descripcion: form.descripcion || null,
      calidad: form.calidad || null,
      ct: form.ct ? Number(form.ct) : null,
      color: form.color || null,
      claridad: form.claridad || null,
      corte: form.corte || null,
      forma: form.forma || null,
      tipo_piedra: form.tipo_piedra || null,
      puntos: form.puntos ? Number(form.puntos) : null,
      origen: form.origen || null,
      certificado: form.certificado || null,
      existencia: Number(form.existencia),
      unidad: form.unidad || null,
      proveedor: isSocioOrAdmin ? (form.proveedor || null) : null,
      costo_unitario: isSocioOrAdmin ? (form.costo_unitario ? Number(form.costo_unitario) : null) : null,
      costo_total: isSocioOrAdmin ? (form.costo_total ? Number(form.costo_total) : null) : null,
      notas: form.notas || null,
      activo: true,
    }

    const { error: err } = await supabase.from('inventario_items').insert(payload)
    if (err) setError(err.message)
    else onSuccess()
    setLoading(false)
  }

  async function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })

      let imported = 0

      for (const sheetName of wb.SheetNames) {
        const lower = sheetName.toLowerCase()
        const tipo: 'diamante' | 'piedra' = lower.includes('diam') ? 'diamante' : 'piedra'
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

        const batch = rows
          .filter(r => Object.values(r).some(v => v != null))
          .map(r => {
            const get = (...keys: string[]) => {
              for (const k of keys) {
                const val = r[k] ?? r[k.toLowerCase()] ?? r[k.toUpperCase()]
                if (val != null) return String(val)
              }
              return null
            }
            const getN = (...keys: string[]) => {
              const v = get(...keys)
              return v ? parseFloat(v) : null
            }

            return {
              tipo,
              codigo: get('Código','Codigo','CODE','codigo'),
              descripcion: get('Descripción','Descripcion','Descripcion','DESCRIPCION'),
              calidad: get('Calidad','CALIDAD','calidad'),
              ct: getN('Ct','CT','Quilates','ct') ?? getN('Ct Central','ct_central'),
              color: get('Color','COLOR','color'),
              claridad: get('Claridad','CLARIDAD','claridad'),
              corte: get('Corte','CORTE','corte'),
              forma: get('Forma','Forma/Corte','FORMA'),
              tipo_piedra: get('Tipo Piedra','Tipo','TIPO'),
              origen: get('Origen','ORIGEN','origen'),
              certificado: get('Certificado','CERT','certificado'),
              existencia: getN('Existencia','Qty','QTY','existencia') ?? 1,
              unidad: get('Unidad','UM','unidad') ?? 'pz',
              proveedor: isSocioOrAdmin ? get('Proveedor','PROVEEDOR','proveedor') : null,
              costo_unitario: isSocioOrAdmin ? getN('Costo','Costo Unit','costo_unitario','COSTO') : null,
              costo_total: isSocioOrAdmin ? getN('Costo Total','costo_total','COSTO TOTAL') : null,
              notas: get('Notas','NOTAS','notas','Obs','Observaciones'),
              activo: true,
            }
          })

        if (batch.length > 0) {
          const { error: err } = await supabase.from('inventario_items').insert(batch)
          if (err) throw new Error(`Error en hoja "${sheetName}": ${err.message}`)
          imported += batch.length
        }
      }

      setExito(`✓ ${imported} registros importados correctamente`)
      setTimeout(onSuccess, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo')
    }
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <section className="card" style={{ maxWidth: 800 }}>
      <div className="card-header">
        <h3 className="card-title" style={{ marginBottom: 0 }}>Agregar al inventario</h3>
        <button className="btn-secondary btn-sm" onClick={onCancel}>Cancelar</button>
      </div>

      {/* Mode toggle */}
      <div className="tipo-toggle" style={{ marginBottom: 24 }}>
        <button type="button" className={`tipo-btn ${mode === 'manual' ? 'tipo-btn--active tipo-btn--ingreso' : ''}`}
          onClick={() => setMode('manual')}>Captura manual</button>
        <button type="button" className={`tipo-btn ${mode === 'excel' ? 'tipo-btn--active tipo-btn--ingreso' : ''}`}
          onClick={() => setMode('excel')}>Importar Excel</button>
      </div>

      {mode === 'excel' && (
        <div>
          <div
            className={`upload-area ${loading ? 'upload-area--active' : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            <div className="upload-icon" style={{ margin: '0 auto 12px' }}>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="8" y="6" width="32" height="36" rx="3"/>
                <path d="M16 18h16M16 24h16M16 30h10"/>
                <path d="M32 2v10h10"/>
              </svg>
            </div>
            <div className="upload-title">
              {loading ? 'Procesando...' : 'Selecciona archivo Excel'}
            </div>
            <div className="upload-sub">
              .xlsx · Hojas "Diamantes" y "Piedras" del archivo de Lotes Inventarios<br />
              El sistema detecta automáticamente el tipo por nombre de hoja
            </div>
          </div>
          <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" onChange={handleExcel}
            style={{ display: 'none' }} />

          {error && <div className="form-error" style={{ marginTop: 12 }}>⚠ {error}</div>}
          {exito && <div className="form-success" style={{ marginTop: 12 }}>{exito}</div>}
        </div>
      )}

      {mode === 'manual' && (
        <form onSubmit={handleManual} className="captura-form">
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label">Tipo *</label>
              <select className="field-input" value={form.tipo} onChange={e => set('tipo', e.target.value as 'diamante' | 'piedra')}>
                <option value="diamante">Diamante</option>
                <option value="piedra">Piedra</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Código</label>
              <input type="text" className="field-input" value={form.codigo} onChange={e => set('codigo', e.target.value)} />
            </div>
            <div className="field-group field-group--full">
              <label className="field-label">Descripción</label>
              <input type="text" className="field-input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Ej: Diamante redondo brillante" />
            </div>

            {form.tipo === 'diamante' ? (
              <>
                <div className="field-group"><label className="field-label">Calidad</label><input type="text" className="field-input" value={form.calidad} onChange={e => set('calidad', e.target.value)} placeholder="VS1, SI2..." /></div>
                <div className="field-group"><label className="field-label">Ct</label><input type="number" className="field-input" value={form.ct} onChange={e => set('ct', e.target.value)} placeholder="0.00" step="0.01" /></div>
                <div className="field-group"><label className="field-label">Color</label><input type="text" className="field-input" value={form.color} onChange={e => set('color', e.target.value)} placeholder="D, E, F..." /></div>
                <div className="field-group"><label className="field-label">Claridad</label><input type="text" className="field-input" value={form.claridad} onChange={e => set('claridad', e.target.value)} placeholder="VVS1, VS2..." /></div>
                <div className="field-group"><label className="field-label">Corte</label><input type="text" className="field-input" value={form.corte} onChange={e => set('corte', e.target.value)} placeholder="Excelente, Muy bueno..." /></div>
              </>
            ) : (
              <>
                <div className="field-group"><label className="field-label">Tipo piedra</label><input type="text" className="field-input" value={form.tipo_piedra} onChange={e => set('tipo_piedra', e.target.value)} placeholder="Rubí, Esmeralda..." /></div>
                <div className="field-group"><label className="field-label">Ct</label><input type="number" className="field-input" value={form.ct} onChange={e => set('ct', e.target.value)} placeholder="0.00" step="0.01" /></div>
                <div className="field-group"><label className="field-label">Puntos</label><input type="number" className="field-input" value={form.puntos} onChange={e => set('puntos', e.target.value)} step="1" /></div>
                <div className="field-group"><label className="field-label">Forma</label><input type="text" className="field-input" value={form.forma} onChange={e => set('forma', e.target.value)} /></div>
              </>
            )}

            <div className="field-group"><label className="field-label">Origen</label><input type="text" className="field-input" value={form.origen} onChange={e => set('origen', e.target.value)} /></div>
            <div className="field-group"><label className="field-label">Certificado</label><input type="text" className="field-input" value={form.certificado} onChange={e => set('certificado', e.target.value)} /></div>
            <div className="field-group"><label className="field-label">Existencia *</label><input type="number" className="field-input" value={form.existencia} onChange={e => set('existencia', e.target.value)} min="0" step="1" required /></div>
            <div className="field-group"><label className="field-label">Unidad</label><input type="text" className="field-input" value={form.unidad} onChange={e => set('unidad', e.target.value)} placeholder="pz, ct..." /></div>

            {isSocioOrAdmin && (
              <>
                <div className="field-group"><label className="field-label">Proveedor</label><input type="text" className="field-input" value={form.proveedor} onChange={e => set('proveedor', e.target.value)} /></div>
                <div className="field-group"><label className="field-label">Costo unitario</label><input type="number" className="field-input" value={form.costo_unitario} onChange={e => set('costo_unitario', e.target.value)} placeholder="0.00" step="0.01" /></div>
                <div className="field-group"><label className="field-label">Costo total</label><input type="number" className="field-input" value={form.costo_total} onChange={e => set('costo_total', e.target.value)} placeholder="0.00" step="0.01" /></div>
              </>
            )}

            <div className="field-group field-group--full"><label className="field-label">Notas</label><input type="text" className="field-input" value={form.notas} onChange={e => set('notas', e.target.value)} /></div>
          </div>

          {error && <div className="form-error">⚠ {error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar ítem'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
