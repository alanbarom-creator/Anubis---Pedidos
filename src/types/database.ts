// ============================================================
// SUMEFRA OS — Database types (Sprint 2)
// ============================================================

export type RolUsuario = 'socio' | 'administrador' | 'gerente' | 'vendedor' | 'contador'
export type TipoCuenta = 'banco' | 'efectivo' | 'terminal'
export type MonedaTipo = 'MXN' | 'USD'
export type TipoTransaccion = 'ingreso' | 'egreso' | 'traspaso'
export type TipoCategoria = 'ingreso' | 'egreso'
export type EstatusPedido = 'recibido' | 'en_proceso' | 'en_taller' | 'listo' | 'entregado' | 'cancelado'
export type TipoPiedra = 'diamante' | 'rubi' | 'esmeralda' | 'zafiro' | 'perla' | 'otro'
export type TipoInventario = 'diamante' | 'piedra'

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

export interface EmailAutorizado {
  id: string
  email: string
  activo: boolean
  creado_por: string | null
  created_at: string
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
  sucursales?: Sucursal
  usuarios?: Usuario
}

export interface Traspaso {
  id: string
  fecha: string
  monto: number
  moneda: MonedaTipo
  cuenta_origen_id: string
  cuenta_destino_id: string
  sucursal_origen_id: string | null
  sucursal_destino_id: string | null
  descripcion: string | null
  capturado_por: string | null
  created_at: string
  cuenta_origen?: CuentaBanco
  cuenta_destino?: CuentaBanco
  sucursal_origen?: Sucursal
  sucursal_destino?: Sucursal
}

// ── Pedidos ────────────────────────────────────────────────
export interface Pedido {
  id: string
  folio: string
  fecha: string
  fecha_entrega: string | null
  cliente: string
  tipo_cliente: string | null
  descripcion: string | null
  peso: number | null
  oro: string | null
  estatus: EstatusPedido
  sucursal_id: string | null
  capturado_por: string | null
  notas: string | null
  imagen_inicio_url: string | null
  imagen_render_url: string | null
  created_at: string
  sucursales?: Sucursal
  usuarios?: Usuario
}

// ── Lotes (Ventas) ─────────────────────────────────────────
export interface Lote {
  id: string
  fecha: string
  sucursal_id: string | null
  vendedor_id: string | null
  proveedor: string | null
  oro: string | null
  certificado: string | null
  tipo_piedra_central: string | null
  calidad: string | null
  ct_central: number | null
  tipo_piedra_lateral: string | null
  ct_lateral: number | null
  ctd_piedras: number | null
  puntos: number | null
  forma_corte: string | null
  origen: string | null
  notas: string | null
  categoria: string | null
  codigo: string | null
  lote: string | null
  folio: string | null
  peso_oro: number | null
  precio_lista: number | null
  descuento: number | null
  precio_venta: number | null
  // Campos restringidos (solo socio)
  costo_piedra_central: number | null
  costo_piedra_lateral: number | null
  costo_oro: number | null
  costo_total: number | null
  utilidad: number | null
  created_at: string
  sucursales?: Sucursal
  vendedor?: Usuario
}

// ── Inventario ─────────────────────────────────────────────
export interface InventarioItem {
  id: string
  tipo: TipoInventario
  codigo: string | null
  descripcion: string | null
  // Campos comunes
  forma: string | null
  origen: string | null
  certificado: string | null
  existencia: number
  unidad: string | null
  // Diamantes
  calidad: string | null
  ct: number | null
  color: string | null
  claridad: string | null
  corte: string | null
  // Piedras
  tipo_piedra: string | null
  puntos: number | null
  // Costos (solo socio)
  costo_unitario: number | null
  costo_total: number | null
  proveedor: string | null
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

// ── Comisiones ─────────────────────────────────────────────
export interface ComisionVendedor {
  id: string
  vendedor_id: string
  porcentaje: number
  activo: boolean
  created_at: string
  usuarios?: Usuario
}

export interface Database {
  public: {
    Tables: {
      usuarios:           { Row: Usuario;          Insert: Omit<Usuario, 'created_at'>;          Update: Partial<Usuario> }
      sucursales:         { Row: Sucursal;          Insert: Omit<Sucursal, 'id' | 'created_at'>; Update: Partial<Sucursal> }
      cuentas_banco:      { Row: CuentaBanco;       Insert: Omit<CuentaBanco, 'id' | 'created_at'>; Update: Partial<CuentaBanco> }
      categorias_gasto:   { Row: CategoriaGasto;    Insert: Omit<CategoriaGasto, 'id' | 'created_at'>; Update: Partial<CategoriaGasto> }
      transacciones:      { Row: Transaccion;       Insert: Omit<Transaccion, 'id' | 'monto_mxn' | 'created_at'>; Update: Partial<Transaccion> }
      traspasos:          { Row: Traspaso;          Insert: Omit<Traspaso, 'id' | 'created_at'>; Update: Partial<Traspaso> }
      pedidos:            { Row: Pedido;            Insert: Omit<Pedido, 'id' | 'created_at'>; Update: Partial<Pedido> }
      lotes:              { Row: Lote;              Insert: Omit<Lote, 'id' | 'created_at'>; Update: Partial<Lote> }
      inventario_items:   { Row: InventarioItem;    Insert: Omit<InventarioItem, 'id' | 'created_at' | 'updated_at'>; Update: Partial<InventarioItem> }
      comisiones_vendedor:{ Row: ComisionVendedor;  Insert: Omit<ComisionVendedor, 'id' | 'created_at'>; Update: Partial<ComisionVendedor> }
      email_autorizados:  { Row: EmailAutorizado;   Insert: Omit<EmailAutorizado, 'id' | 'created_at'>; Update: Partial<EmailAutorizado> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      rol_usuario: RolUsuario
      tipo_cuenta: TipoCuenta
      moneda_tipo: MonedaTipo
      tipo_transaccion: TipoTransaccion
      tipo_categoria: TipoCategoria
      estatus_pedido: EstatusPedido
    }
  }
}
