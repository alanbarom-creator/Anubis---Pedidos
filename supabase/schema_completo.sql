-- ============================================================
-- SUMEFRA OS — Schema Completo (fresh install)
-- Ejecutar completo en Supabase SQL Editor para proyecto nuevo.
-- Si ya corriste schema.sql + schema_sprint2.sql, solo corre
-- las partes que falten.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TIPOS ENUM
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM ('socio','administrador','gerente','vendedor','contador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_cuenta AS ENUM ('banco','efectivo','terminal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moneda_tipo AS ENUM ('MXN','USD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_transaccion AS ENUM ('ingreso','egreso','traspaso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_categoria AS ENUM ('ingreso','egreso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estatus_pedido AS ENUM ('recibido','en_proceso','en_taller','listo','entregado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_inventario AS ENUM ('diamante','piedra');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- 2. SUCURSALES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sucursales (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  ciudad     TEXT NOT NULL DEFAULT 'México',
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datos reales de SUMEFRA Joyería
INSERT INTO sucursales (nombre, ciudad) VALUES
  ('Anubis Sahuaro Grande', 'Guadalajara'),
  ('Anubis Sahuaro Chico',  'Guadalajara'),
  ('Anubis Aguascalientes', 'Aguascalientes'),
  ('Anubis Galerias',       'Guadalajara'),
  ('Anubis Centro',         'Guadalajara'),
  ('M&P Galerías',          'Guadalajara')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 3. USUARIOS (perfil extendido de auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  rol         rol_usuario NOT NULL DEFAULT 'vendedor',
  sucursal_id UUID REFERENCES sucursales(id),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: crea perfil automáticamente al confirmar cuenta
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usuarios (id, email, nombre, rol, sucursal_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)),
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'vendedor'),
    (NEW.raw_user_meta_data->>'sucursal_id')::uuid
  )
  ON CONFLICT (id) DO UPDATE
    SET sucursal_id = COALESCE(
          (NEW.raw_user_meta_data->>'sucursal_id')::uuid,
          usuarios.sucursal_id
        );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 4. CORREOS AUTORIZADOS (solo Alan Baro puede autorizar)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_autorizados (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 5. CUENTAS BANCARIAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuentas_banco (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  tipo         tipo_cuenta NOT NULL,
  moneda       moneda_tipo NOT NULL DEFAULT 'MXN',
  saldo_actual NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_minimo NUMERIC(15,2) NOT NULL DEFAULT 0,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cuentas reales de SUMEFRA
INSERT INTO cuentas_banco (nombre, tipo, moneda, saldo_actual, saldo_minimo) VALUES
  ('Scotiabank Luis', 'banco',    'MXN', 0, 5000),
  ('BBVA Sumefra',    'banco',    'MXN', 0, 10000),
  ('BBVA Alberto',    'banco',    'MXN', 0, 5000),
  ('Santander Jaz',   'banco',    'MXN', 0, 5000),
  ('Clip',            'terminal', 'MXN', 0, 0),
  ('Kashpay',         'terminal', 'MXN', 0, 0),
  ('Caja Metal',      'efectivo', 'MXN', 0, 1000),
  ('Caja M&P',        'efectivo', 'MXN', 0, 1000),
  ('Caja Anubis',     'efectivo', 'MXN', 0, 1000),
  ('Efectivo',        'efectivo', 'MXN', 0, 0)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 6. CATEGORÍAS DE GASTO / INGRESO
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias_gasto (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  tipo       tipo_categoria NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categorias_gasto (nombre, tipo) VALUES
  -- Egresos principales
  ('Nómina',            'egreso'),
  ('IMSS',              'egreso'),
  ('Compras Material',  'egreso'),
  ('Renta',             'egreso'),
  ('Publicidad',        'egreso'),
  ('Gasto Operativo',   'egreso'),
  ('Gasto Variable',    'egreso'),
  ('Financiero',        'egreso'),
  ('Comisiones',        'egreso'),
  -- Egresos adicionales
  ('Transporte',        'egreso'),
  ('Servicios',         'egreso'),
  ('Impuestos',         'egreso'),
  ('Mantenimiento',     'egreso'),
  ('Papelería',         'egreso'),
  ('Seguridad',         'egreso'),
  ('Mensajería',        'egreso'),
  ('Devolución',        'egreso'),
  ('Costo de Material', 'egreso'),
  ('Dividendos',        'egreso'),
  -- Ingresos
  ('Venta Mostrador',   'ingreso'),
  ('Venta Online',      'ingreso'),
  ('Venta Lote',        'ingreso'),
  ('Consignación',      'ingreso'),
  ('Anticipo',          'ingreso'),
  ('Otro Ingreso',      'ingreso')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 7. TRANSACCIONES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transacciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo          tipo_transaccion NOT NULL,
  monto         NUMERIC(15,2) NOT NULL CHECK (monto > 0),
  moneda        moneda_tipo NOT NULL DEFAULT 'MXN',
  tipo_cambio   NUMERIC(10,4),
  monto_mxn     NUMERIC(15,2) GENERATED ALWAYS AS (
                  CASE WHEN moneda = 'MXN' THEN monto
                  ELSE monto * COALESCE(tipo_cambio, 1) END
                ) STORED,
  categoria_id  UUID REFERENCES categorias_gasto(id),
  descripcion   TEXT,
  cuenta_id     UUID NOT NULL REFERENCES cuentas_banco(id),
  sucursal_id   UUID REFERENCES sucursales(id),
  capturado_por UUID REFERENCES usuarios(id),
  aprobado      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: actualiza saldo de cuenta al insertar transacción
CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.tipo = 'ingreso' THEN
    UPDATE cuentas_banco
    SET saldo_actual = saldo_actual + NEW.monto_mxn
    WHERE id = NEW.cuenta_id;
  ELSIF NEW.tipo = 'egreso' THEN
    UPDATE cuentas_banco
    SET saldo_actual = saldo_actual - NEW.monto_mxn
    WHERE id = NEW.cuenta_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_transaccion_insert ON transacciones;
CREATE TRIGGER on_transaccion_insert
  AFTER INSERT ON transacciones
  FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_cuenta();

-- ────────────────────────────────────────────────────────────
-- 8. TRASPASOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS traspasos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  monto               NUMERIC(15,2) NOT NULL CHECK (monto > 0),
  moneda              moneda_tipo NOT NULL DEFAULT 'MXN',
  cuenta_origen_id    UUID NOT NULL REFERENCES cuentas_banco(id),
  cuenta_destino_id   UUID NOT NULL REFERENCES cuentas_banco(id),
  sucursal_origen_id  UUID REFERENCES sucursales(id),
  sucursal_destino_id UUID REFERENCES sucursales(id),
  descripcion         TEXT,
  capturado_por       UUID REFERENCES usuarios(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cuentas_distintas CHECK (cuenta_origen_id <> cuenta_destino_id)
);

-- ────────────────────────────────────────────────────────────
-- 9. PEDIDOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio         TEXT NOT NULL,
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega DATE,
  cliente       TEXT NOT NULL,
  tipo_cliente  TEXT,
  descripcion   TEXT,
  peso          NUMERIC(10,3),
  estatus       estatus_pedido NOT NULL DEFAULT 'recibido',
  sucursal_id   UUID REFERENCES sucursales(id),
  capturado_por UUID REFERENCES usuarios(id),
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 10. LOTES (VENTAS)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lotes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                DATE NOT NULL DEFAULT CURRENT_DATE,
  sucursal_id          UUID REFERENCES sucursales(id),
  vendedor_id          UUID REFERENCES usuarios(id),
  proveedor            TEXT,
  oro                  TEXT,
  certificado          TEXT,
  tipo_piedra_central  TEXT,
  calidad              TEXT,
  ct_central           NUMERIC(10,4),
  tipo_piedra_lateral  TEXT,
  ct_lateral           NUMERIC(10,4),
  ctd_piedras          INTEGER,
  puntos               INTEGER,
  forma_corte          TEXT,
  origen               TEXT,
  notas                TEXT,
  categoria            TEXT,
  codigo               TEXT,
  lote                 TEXT,
  folio                TEXT,
  peso_oro             NUMERIC(10,3),
  precio_lista         NUMERIC(15,2),
  descuento            NUMERIC(6,2),
  precio_venta         NUMERIC(15,2),
  -- Solo socio
  costo_piedra_central NUMERIC(15,2),
  costo_piedra_lateral NUMERIC(15,2),
  costo_oro            NUMERIC(15,2),
  costo_total          NUMERIC(15,2),
  utilidad             NUMERIC(15,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 11. INVENTARIO (diamantes y piedras)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventario_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           tipo_inventario NOT NULL,
  codigo         TEXT,
  descripcion    TEXT,
  forma          TEXT,
  origen         TEXT,
  certificado    TEXT,
  existencia     NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidad         TEXT DEFAULT 'pz',
  -- Diamantes
  calidad        TEXT,
  ct             NUMERIC(10,4),
  color          TEXT,
  claridad       TEXT,
  corte          TEXT,
  -- Piedras
  tipo_piedra    TEXT,
  puntos         NUMERIC(10,2),
  -- Costos (solo socio/admin)
  costo_unitario NUMERIC(15,2),
  costo_total    NUMERIC(15,2),
  proveedor      TEXT,
  notas          TEXT,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS inventario_updated_at ON inventario_items;
CREATE TRIGGER inventario_updated_at
  BEFORE UPDATE ON inventario_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 12. COMISIONES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comisiones_vendedor (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  porcentaje  NUMERIC(5,2) NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendedor_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: obtiene rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS rol_usuario LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid()
$$;

-- ── Habilitar RLS ──────────────────────────────────────────
ALTER TABLE usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_banco        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_gasto     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE traspasos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comisiones_vendedor  ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_autorizados    ENABLE ROW LEVEL SECURITY;

-- ── USUARIOS ──────────────────────────────────────────────
CREATE POLICY "usuarios ver propio"    ON usuarios FOR SELECT USING (id = auth.uid());
CREATE POLICY "socios admins ven todos" ON usuarios FOR SELECT USING (get_user_rol() IN ('socio','administrador'));
CREATE POLICY "usuarios insertar trigger" ON usuarios FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "socio admin modifican usuarios" ON usuarios FOR UPDATE USING (get_user_rol() IN ('socio','administrador'));

-- ── SUCURSALES ────────────────────────────────────────────
CREATE POLICY "todos ven sucursales" ON sucursales FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "anon ve sucursales activas" ON sucursales FOR SELECT
  TO anon USING (activo = TRUE);
CREATE POLICY "socio admin modifican sucursales" ON sucursales FOR ALL
  USING (get_user_rol() IN ('socio','administrador'));

-- ── CUENTAS BANCO ─────────────────────────────────────────
CREATE POLICY "finanzas ven cuentas" ON cuentas_banco FOR SELECT
  USING (get_user_rol() IN ('socio','administrador','contador'));
CREATE POLICY "socio admin modifican cuentas" ON cuentas_banco FOR ALL
  USING (get_user_rol() IN ('socio','administrador'));
-- Trigger necesita poder actualizar saldo
CREATE POLICY "trigger actualiza saldo" ON cuentas_banco FOR UPDATE
  USING (TRUE) WITH CHECK (TRUE);

-- ── CATEGORÍAS ────────────────────────────────────────────
CREATE POLICY "todos ven categorias activas" ON categorias_gasto FOR SELECT
  USING (auth.uid() IS NOT NULL AND activo = TRUE);
CREATE POLICY "socio admin modifican categorias" ON categorias_gasto FOR ALL
  USING (get_user_rol() IN ('socio','administrador'));

-- ── TRANSACCIONES ─────────────────────────────────────────
CREATE POLICY "finanzas ven transacciones" ON transacciones FOR SELECT
  USING (get_user_rol() IN ('socio','administrador','contador'));
CREATE POLICY "capturadores insertan" ON transacciones FOR INSERT
  WITH CHECK (get_user_rol() IN ('socio','administrador','gerente','vendedor'));
CREATE POLICY "socio admin modifican transacciones" ON transacciones FOR UPDATE
  USING (get_user_rol() IN ('socio','administrador'));

-- ── TRASPASOS ─────────────────────────────────────────────
CREATE POLICY "finanzas ven traspasos" ON traspasos FOR SELECT
  USING (get_user_rol() IN ('socio','administrador','contador'));
CREATE POLICY "socio admin insertan traspasos" ON traspasos FOR INSERT
  WITH CHECK (get_user_rol() IN ('socio','administrador'));

-- ── PEDIDOS ──────────────────────────────────────────────
CREATE POLICY "socio admin ven todos pedidos" ON pedidos FOR ALL
  USING (get_user_rol() IN ('socio','administrador'));
CREATE POLICY "gerente ve pedidos sucursal" ON pedidos FOR ALL
  USING (
    get_user_rol() = 'gerente'
    AND sucursal_id IN (SELECT sucursal_id FROM usuarios WHERE id = auth.uid())
  );
CREATE POLICY "vendedor ve sus pedidos" ON pedidos FOR ALL
  USING (
    get_user_rol() = 'vendedor'
    AND (
      capturado_por = auth.uid()
      OR sucursal_id IN (SELECT sucursal_id FROM usuarios WHERE id = auth.uid())
    )
  );
CREATE POLICY "contador ve pedidos" ON pedidos FOR SELECT
  USING (get_user_rol() = 'contador');

-- ── LOTES ────────────────────────────────────────────────
CREATE POLICY "socio admin ven todos lotes" ON lotes FOR ALL
  USING (get_user_rol() IN ('socio','administrador'));
CREATE POLICY "gerente ve lotes sucursal" ON lotes FOR ALL
  USING (
    get_user_rol() = 'gerente'
    AND sucursal_id IN (SELECT sucursal_id FROM usuarios WHERE id = auth.uid())
  );
CREATE POLICY "vendedor ve lotes sucursal" ON lotes FOR ALL
  USING (
    get_user_rol() = 'vendedor'
    AND sucursal_id IN (SELECT sucursal_id FROM usuarios WHERE id = auth.uid())
  );
CREATE POLICY "contador ve lotes" ON lotes FOR SELECT
  USING (get_user_rol() = 'contador');

-- ── INVENTARIO ───────────────────────────────────────────
CREATE POLICY "todos autenticados ven inventario" ON inventario_items FOR SELECT
  USING (activo = TRUE AND auth.uid() IN (SELECT id FROM usuarios WHERE activo = TRUE));
CREATE POLICY "socio admin gestionan inventario" ON inventario_items FOR ALL
  USING (get_user_rol() IN ('socio','administrador'));

-- ── COMISIONES ───────────────────────────────────────────
CREATE POLICY "socio admin gestionan comisiones" ON comisiones_vendedor FOR ALL
  USING (get_user_rol() IN ('socio','administrador'));
CREATE POLICY "vendedor ve su comision" ON comisiones_vendedor FOR SELECT
  USING (auth.uid() = vendedor_id);

-- ── EMAIL AUTORIZADOS ────────────────────────────────────
CREATE POLICY "socio admin gestionan emails" ON email_autorizados FOR ALL
  USING (get_user_rol() IN ('socio','administrador'));
CREATE POLICY "anon verifica email en signup" ON email_autorizados FOR SELECT
  TO anon USING (activo = TRUE);
CREATE POLICY "auth verifica email en signup" ON email_autorizados FOR SELECT
  USING (activo = TRUE);
