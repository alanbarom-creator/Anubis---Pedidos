export type Rol      = 'socio' | 'administrador' | 'gerente' | 'vendedor' | 'contador'
export type Moneda   = 'MXN' | 'USD'
export type TipoTx   = 'ingreso' | 'egreso'
export type EstatusPedido = 'levantado' | 'recibido' | 'en_produccion' | 'revision_render' | 'aprobado' | 'enviado' | 'cerrado' | 'cancelado'
export type Modulo   = 'finanzas' | 'inventario' | 'pedidos' | 'catalogo' | 'comisiones' | 'usuarios' | 'reportes'

export interface Sucursal {
  id: string; nombre: string; ciudad: string; activo: boolean; created_at?: string
}

export interface Usuario {
  id: string; email: string; nombre: string; rol: Rol
  sucursal_id: string | null; activo: boolean; created_at?: string
  sucursales?: Sucursal
}

export interface CuentaBanco {
  id: string; nombre: string; tipo: string; moneda: Moneda
  saldo_actual: number; saldo_minimo: number; activo: boolean
}

export interface Categoria {
  id: string; nombre: string; tipo: TipoTx; activo: boolean
}

export interface Transaccion {
  id: string; fecha: string; tipo: TipoTx; monto: number; moneda: Moneda
  tipo_cambio: number | null; monto_mxn: number
  categoria_id: string | null; descripcion: string | null
  cuenta_id: string; sucursal_id: string | null
  capturado_por: string | null; aprobado: boolean; created_at: string
  categorias_gasto?: Categoria; cuentas_banco?: CuentaBanco; usuarios?: Usuario
}

export interface Lote {
  id: string; codigo: string; descripcion: string
  tipo_piedra: string | null; quilates: number | null; metal: string | null
  costo: number | null; precio_venta: number | null
  sucursal_id: string | null; vendido: boolean; fecha_venta: string | null
  vendido_por: string | null; notas: string | null; activo: boolean; created_at: string
  sucursales?: Sucursal; usuarios?: Usuario
}

export interface Pedido {
  id: string; folio: string; cliente_nombre: string; cliente_tel: string | null
  descripcion: string; especificaciones: string | null; fecha_compromiso: string | null
  precio_acordado: number | null; anticipo: number; estatus: EstatusPedido
  sucursal_id: string | null; creado_por: string | null; asignado_a: string | null
  prioridad: string; created_at: string; updated_at: string
  sucursales?: Sucursal; usuarios?: Usuario
}

export interface PedidoImagen {
  id: string; pedido_id: string; url: string; nombre: string | null; created_at?: string
}

export interface PedidoHistorial {
  id: string; pedido_id: string; estatus: EstatusPedido
  comentario: string | null; usuario_id: string | null; created_at: string
  usuarios?: Usuario
}

export interface Catalogo {
  id: string; codigo: string | null; nombre: string; descripcion: string | null
  precio: number | null; imagen_url: string | null; categoria: string | null
  disponible: boolean; destacado: boolean; created_at?: string
}

export interface ComisionConfig {
  id: string; usuario_id: string; porcentaje: number; activo: boolean; created_at?: string
  usuarios?: Usuario
}

export interface Comision {
  id: string; usuario_id: string; lote_id: string | null
  monto_venta: number; porcentaje: number; monto_comision: number
  fecha: string; pagado: boolean; created_at?: string
  usuarios?: Usuario; lotes?: Lote
}
