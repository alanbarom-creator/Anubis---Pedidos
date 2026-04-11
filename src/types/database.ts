// ============================================================
// SUMEFRA OS — Database types (generados desde schema.sql)
// ============================================================

export type RolUsuario = 'socio' | 'administrador' | 'gerente' | 'vendedor' | 'contador'
export type TipoCuenta = 'banco' | 'efectivo' | 'terminal'
export type MonedaTipo = 'MXN' | 'USD'
export type TipoTransaccion = 'ingreso' | 'egreso'
export type TipoCategoria = 'ingreso' | 'egreso'

export interface Sucursal {
  id: string
  nombre: string
  ciudad: string
  activo: boolean
  created_at: string
}

export interface Usuario {
  id: string
  email: string
  nombre: string
  rol: RolUsuario
  sucursal_id: string | null
  activo: boolean
  created_at: string
  sucursales?: Sucursal
}

export interface CuentaBanco {
  id: string
  nombre: string
  tipo: TipoCuenta
  moneda: MonedaTipo
  saldo_actual: number
  saldo_minimo: number
  activo: boolean
  created_at: string
}

export interface CategoriaGasto {
  id: string
  nombre: string
  tipo: TipoCategoria
  activo: boolean
  created_at: string
}

export interface Transaccion {
  id: string
  fecha: string
  tipo: TipoTransaccion
  monto: number
  moneda: MonedaTipo
  tipo_cambio: number | null
  monto_mxn: number
  categoria_id: string | null
  descripcion: string | null
  cuenta_id: string
  sucursal_id: string | null
  capturado_por: string | null
  aprobado: boolean
  created_at: string
  categorias_gasto?: CategoriaGasto
  cuentas_banco?: CuentaBanco
  usuarios?: Usuario
}

// Type alias para el cliente Supabase con tipos
export interface Database {
  public: {
    Tables: {
      usuarios: { Row: Usuario; Insert: Omit<Usuario, 'created_at'>; Update: Partial<Usuario> }
      sucursales: { Row: Sucursal; Insert: Omit<Sucursal, 'id' | 'created_at'>; Update: Partial<Sucursal> }
      cuentas_banco: { Row: CuentaBanco; Insert: Omit<CuentaBanco, 'id' | 'created_at'>; Update: Partial<CuentaBanco> }
      categorias_gasto: { Row: CategoriaGasto; Insert: Omit<CategoriaGasto, 'id' | 'created_at'>; Update: Partial<CategoriaGasto> }
      transacciones: { Row: Transaccion; Insert: Omit<Transaccion, 'id' | 'monto_mxn' | 'created_at'>; Update: Partial<Transaccion> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      rol_usuario: RolUsuario
      tipo_cuenta: TipoCuenta
      moneda_tipo: MonedaTipo
      tipo_transaccion: TipoTransaccion
      tipo_categoria: TipoCategoria
    }
  }
}
