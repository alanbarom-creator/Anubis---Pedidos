-- ============================================================
-- SUMEFRA OS — Schema completo v2
-- Ejecutar en Supabase SQL Editor (borrar tablas anteriores primero)
-- ============================================================

-- ENUMS
CREATE TYPE rol_usuario      AS ENUM ('socio','administrador','gerente','vendedor','contador');
CREATE TYPE tipo_cuenta      AS ENUM ('banco','efectivo','terminal');
CREATE TYPE moneda_tipo      AS ENUM ('MXN','USD');
CREATE TYPE tipo_transaccion AS ENUM ('ingreso','egreso');
CREATE TYPE tipo_categoria   AS ENUM ('ingreso','egreso');
CREATE TYPE estatus_pedido   AS ENUM ('levantado','recibido','en_produccion','revision_render','aprobado','enviado','cerrado','cancelado');
CREATE TYPE tipo_piedra      AS ENUM ('diamante','esmeralda','rubi','zafiro','perla','otro');

-- SUCURSALES
CREATE TABLE sucursales (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  ciudad     TEXT NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO sucursales (nombre, ciudad) VALUES
  ('Sucursal Centro','Ciudad de México'),
  ('Sucursal Norte','Monterrey'),
  ('Sucursal Sur','Guadalajara'),
  ('Sucursal Oriente','Puebla'),
  ('Sucursal Occidente','León'),
  ('Sucursal Bajío','Querétaro');

-- USUARIOS
CREATE TABLE usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  rol         rol_usuario NOT NULL DEFAULT 'vendedor',
  sucursal_id UUID REFERENCES sucursales(id),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rol rol_usuario := 'vendedor'; v_nombre TEXT;
BEGIN
  BEGIN v_rol := (NEW.raw_user_meta_data->>'rol')::rol_usuario;
  EXCEPTION WHEN OTHERS THEN v_rol := 'vendedor'; END;
  v_nombre := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre',''), split_part(NEW.email,'@',1));
  INSERT INTO usuarios (id,email,nombre,rol) VALUES (NEW.id,NEW.email,v_nombre,v_rol)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- CUENTAS BANCO
CREATE TABLE cuentas_banco (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  tipo         tipo_cuenta NOT NULL,
  moneda       moneda_tipo NOT NULL DEFAULT 'MXN',
  saldo_actual NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_minimo NUMERIC(15,2) NOT NULL DEFAULT 0,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO cuentas_banco (nombre,tipo,moneda,saldo_actual,saldo_minimo) VALUES
  ('Caja Efectivo MXN','efectivo','MXN',50000,5000),
  ('BBVA Empresarial','banco','MXN',150000,20000),
  ('Santander Corriente','banco','MXN',80000,10000),
  ('Terminal Clip','terminal','MXN',0,0),
  ('Caja USD','efectivo','USD',2000,200);

-- CATEGORÍAS
CREATE TABLE categorias_gasto (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  TEXT NOT NULL,
  tipo    tipo_categoria NOT NULL,
  activo  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO categorias_gasto (nombre,tipo) VALUES
  ('Nómina','egreso'),('IMSS','egreso'),('Compras Material','egreso'),
  ('Renta','egreso'),('Publicidad','egreso'),('Gasto Operativo','egreso'),
  ('Gasto Variable','egreso'),('Financiero','egreso'),('Comisiones','egreso'),
  ('Venta Mostrador','ingreso'),('Venta Online','ingreso'),
  ('Consignación','ingreso'),('Otro Ingreso','ingreso');

-- TRANSACCIONES
CREATE TABLE transacciones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo         tipo_transaccion NOT NULL,
  monto        NUMERIC(15,2) NOT NULL CHECK (monto > 0),
  moneda       moneda_tipo NOT NULL DEFAULT 'MXN',
  tipo_cambio  NUMERIC(10,4),
  monto_mxn    NUMERIC(15,2) GENERATED ALWAYS AS (
    CASE WHEN moneda='MXN' THEN monto ELSE monto * COALESCE(tipo_cambio,1) END
  ) STORED,
  categoria_id  UUID REFERENCES categorias_gasto(id),
  descripcion   TEXT,
  cuenta_id     UUID NOT NULL REFERENCES cuentas_banco(id),
  sucursal_id   UUID REFERENCES sucursales(id),
  capturado_por UUID REFERENCES usuarios(id),
  aprobado      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo='ingreso' THEN
    UPDATE cuentas_banco SET saldo_actual=saldo_actual+NEW.monto WHERE id=NEW.cuenta_id;
  ELSE
    UPDATE cuentas_banco SET saldo_actual=saldo_actual-NEW.monto WHERE id=NEW.cuenta_id;
  END IF; RETURN NEW;
END;$$;
CREATE TRIGGER on_transaccion_insert
  AFTER INSERT ON transacciones FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_cuenta();

-- INVENTARIO DE LOTES
CREATE TABLE lotes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo       TEXT NOT NULL UNIQUE,
  descripcion  TEXT NOT NULL,
  tipo_piedra  tipo_piedra,
  quilates     NUMERIC(8,3),
  metal        TEXT,                    -- oro 14k, plata, etc.
  costo        NUMERIC(15,2),           -- solo visible para socio/admin
  precio_venta NUMERIC(15,2),
  sucursal_id  UUID REFERENCES sucursales(id),
  vendido      BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_venta  DATE,
  vendido_por  UUID REFERENCES usuarios(id),
  notas        TEXT,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PEDIDOS PERSONALIZADOS
CREATE TABLE pedidos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio           TEXT NOT NULL UNIQUE,
  cliente_nombre  TEXT NOT NULL,
  cliente_tel     TEXT,
  descripcion     TEXT NOT NULL,
  especificaciones TEXT,
  fecha_compromiso DATE,
  precio_acordado NUMERIC(15,2),
  anticipo        NUMERIC(15,2) DEFAULT 0,
  estatus         estatus_pedido NOT NULL DEFAULT 'levantado',
  sucursal_id     UUID REFERENCES sucursales(id),
  creado_por      UUID REFERENCES usuarios(id),
  asignado_a      UUID REFERENCES usuarios(id),
  prioridad       TEXT DEFAULT 'normal',  -- normal, urgente, vip
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pedido_imagenes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id  UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  nombre     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pedido_historial (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id   UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  estatus     estatus_pedido NOT NULL,
  comentario  TEXT,
  usuario_id  UUID REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CATÁLOGO VIRTUAL
CREATE TABLE catalogo (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo       TEXT,
  nombre       TEXT NOT NULL,
  descripcion  TEXT,
  precio       NUMERIC(15,2),
  imagen_url   TEXT,
  categoria    TEXT,
  disponible   BOOLEAN NOT NULL DEFAULT TRUE,
  destacado    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMISIONES
CREATE TABLE comisiones_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  porcentaje   NUMERIC(5,2) NOT NULL DEFAULT 0,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id)
);

CREATE TABLE comisiones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID NOT NULL REFERENCES usuarios(id),
  lote_id      UUID REFERENCES lotes(id),
  monto_venta  NUMERIC(15,2) NOT NULL,
  porcentaje   NUMERIC(5,2) NOT NULL,
  monto_comision NUMERIC(15,2) GENERATED ALWAYS AS
    (monto_venta * porcentaje / 100) STORED,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  pagado       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Función folio automático para pedidos
CREATE OR REPLACE FUNCTION generar_folio()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.folio := 'PED-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
    LPAD((SELECT COUNT(*)+1 FROM pedidos
      WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW()))::TEXT, 4, '0');
  RETURN NEW;
END;$$;
CREATE TRIGGER set_folio BEFORE INSERT ON pedidos
  FOR EACH ROW WHEN (NEW.folio IS NULL OR NEW.folio = '')
  EXECUTE FUNCTION generar_folio();
