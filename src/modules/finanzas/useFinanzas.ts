// Hook central para datos de finanzas
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Transaccion, CuentaBanco, CategoriaGasto, Sucursal } from '../../types/database'

export interface KPIsFinanzas {
  ingresos_hoy: number
  egresos_hoy: number
  saldo_total: number
  utilidad_mes: number
}

export interface FiltrosTransacciones {
  fecha_inicio: string
  fecha_fin: string
  cuenta_id: string
  categoria_id: string
  tipo: 'todos' | 'ingreso' | 'egreso'
}

const hoy = new Date().toISOString().split('T')[0]
const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().split('T')[0]

export function useFiltrosInit(): FiltrosTransacciones {
  return {
    fecha_inicio: primerDiaMes,
    fecha_fin: hoy,
    cuenta_id: '',
    categoria_id: '',
    tipo: 'todos',
  }
}

export function useKPIs() {
  const [kpis, setKpis] = useState<KPIsFinanzas | null>(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)

    const [ingrHoy, egrHoy, saldos, ingresMes, egrMes] = await Promise.all([
      supabase.from('transacciones').select('monto_mxn').eq('tipo', 'ingreso').eq('fecha', hoy),
      supabase.from('transacciones').select('monto_mxn').eq('tipo', 'egreso').eq('fecha', hoy),
      supabase.from('cuentas_banco').select('saldo_actual').eq('activo', true),
      supabase.from('transacciones').select('monto_mxn').eq('tipo', 'ingreso').gte('fecha', primerDiaMes),
      supabase.from('transacciones').select('monto_mxn').eq('tipo', 'egreso').gte('fecha', primerDiaMes),
    ])

    const sum = (rows: { monto_mxn: number }[] | null) =>
      (rows ?? []).reduce((a, r) => a + (r.monto_mxn ?? 0), 0)

    const saldoTotal = (saldos.data ?? []).reduce((a, r) => a + (r.saldo_actual ?? 0), 0)

    setKpis({
      ingresos_hoy: sum(ingrHoy.data),
      egresos_hoy: sum(egrHoy.data),
      saldo_total: saldoTotal,
      utilidad_mes: sum(ingresMes.data) - sum(egrMes.data),
    })
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return { kpis, loading, recargar: cargar }
}

export function useTransacciones(filtros: FiltrosTransacciones) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      setLoading(true)

      let q = supabase
        .from('transacciones')
        .select(`
          *,
          categorias_gasto(nombre),
          cuentas_banco(nombre, moneda),
          usuarios(nombre)
        `)
        .gte('fecha', filtros.fecha_inicio)
        .lte('fecha', filtros.fecha_fin)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)

      if (filtros.tipo !== 'todos') q = q.eq('tipo', filtros.tipo)
      if (filtros.cuenta_id) q = q.eq('cuenta_id', filtros.cuenta_id)
      if (filtros.categoria_id) q = q.eq('categoria_id', filtros.categoria_id)

      const { data } = await q
      setTransacciones((data as Transaccion[]) ?? [])
      setLoading(false)
    }
    cargar()
  }, [filtros])

  return { transacciones, loading }
}

export function useCuentas() {
  const [cuentas, setCuentas] = useState<CuentaBanco[]>([])

  useEffect(() => {
    supabase.from('cuentas_banco').select('*').eq('activo', true)
      .then(({ data }) => setCuentas((data as CuentaBanco[]) ?? []))
  }, [])

  return cuentas
}

export function useCategorias(tipo?: 'ingreso' | 'egreso') {
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])

  useEffect(() => {
    let q = supabase.from('categorias_gasto').select('*').eq('activo', true).order('nombre')
    if (tipo) q = q.eq('tipo', tipo) as typeof q
    q.then(({ data }) => setCategorias((data as CategoriaGasto[]) ?? []))
  }, [tipo])

  return categorias
}

// Datos para gráfica: egresos vs ingresos por día del mes actual
export function useDatosGrafica() {
  const [datos, setDatos] = useState<{ fecha: string; ingresos: number; egresos: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const { data } = await supabase
        .from('transacciones')
        .select('fecha, tipo, monto_mxn')
        .gte('fecha', primerDiaMes)
        .lte('fecha', hoy)
        .order('fecha', { ascending: true })

      // Agrupar por fecha
      const mapa: Record<string, { ingresos: number; egresos: number }> = {}

      for (const t of data ?? []) {
        if (!mapa[t.fecha]) mapa[t.fecha] = { ingresos: 0, egresos: 0 }
        if (t.tipo === 'ingreso') mapa[t.fecha].ingresos += t.monto_mxn ?? 0
        else mapa[t.fecha].egresos += t.monto_mxn ?? 0
      }

      setDatos(
        Object.entries(mapa).map(([fecha, v]) => ({
          fecha: fecha.slice(5), // MM-DD
          ...v,
        }))
      )
      setLoading(false)
    }
    cargar()
  }, [])

  return { datos, loading }
}

export function useSucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('sucursales').select('*').order('nombre')
    setSucursales((data as Sucursal[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return { sucursales, loading, recargar: cargar }
}

export function useTodasCuentas() {
  const [cuentas, setCuentas] = useState<CuentaBanco[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('cuentas_banco').select('*').order('nombre')
    setCuentas((data as CuentaBanco[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return { cuentas, loading, recargar: cargar }
}
