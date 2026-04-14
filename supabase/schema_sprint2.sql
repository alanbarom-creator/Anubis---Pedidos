-- ============================================================
-- SUMEFRA OS — Schema Sprint 2
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema_sprint1
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ACTUALIZAR SUCURSALES (reemplazar datos de prueba)
-- ────────────────────────────────────────────────────────────

-- Limpiar sucursales de prueba y agregar las reales
DELETE FROM sucursales;

INSERT INTO sucursales (nombre, ciudad) VALUES
  ('Anubis Sahuaro Grande',   'Guadalajara'),
  ('Anubis Sahuaro Chico',    'Guadalajara'),
  ('Anubis Aguascalientes',   'Aguascalientes'),
  ('Anubis Galerias',         'Guadalajara'),
  ('Anubis Centro',           'Guadalajara'),
  ('M&P Galerías',            'Guadalajara');

-- ────────────────────────────────────────────────────────────
-- 2. ACTUALIZAR CUENTAS BANCARIAS
-- ────────────────────────────────────────────────────────────

-- Limpiar cuentas de prueba y agregar las reales
DELETE FROM cuentas_banco;

INSERT INTO cuentas_banco (nombre, tipo, moneda, saldo_actual, saldo_minimo) VALUES
  ('Scotiabank Luis',  'banco',    'MXN', 0, 5000),
  ('BBVA Sumefra',     'banco',    'MXN', 0, 10000),
  ('BBVA Alberto',     'banco',    'MXN', 0, 5000),
  ('Santander Jaz',    'banco',    'MXN', 0, 5000),
  ('Clip',             'terminal', 'MXN', 0, 0),
  ('Kashpay',          'terminal', 'MXN', 0, 0),
  ('Caja Metal',       'efectivo', 'MXN', 0, 1000),
  ('Caja M&P',         'efectivo', 'MXN', 0, 1000),
  ('Caja Anubis',      'efectivo', 'MXN', 0, 1000),
  ('Efectivo',         'efectivo', 'MXN', 0, 0);

-- ────────────────────────────────────────────────────────────
-- 3. AGREGAR TIPO TRASPASO A TRANSACCIONES
-- ────────────────────────────────────────────────────────────

ALTER TYPE tipo_transaccion ADD VALUE IF NOT EXISTS 'traspaso';

-- ────────────────────────────────────────────────────────────
-- 4. CORREOS AUTORIZADOS (control de registro por Alan Baro)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_autorizados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para email_autorizados
ALTER TABLE email_autorizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "socios y admins gestionan emails autorizados"
  ON email_autorizados FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol IN ('socio', 'administrador') AND activo = TRUE
    )
  );

-- Lectura para verificar en signup (anon también puede leer)
CREATE POLICY "verificar email en signup"
  ON email_autorizados FOR SELECT
  TO anon
  USING (activo = TRUE);

-- ────────────────────────────────────────────────────────────
-- 5. TRASPASOS
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

ALTER TABLE traspasos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "socios y admins ven todos los traspasos"
  ON traspasos FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol IN ('socio', 'administrador', 'contador') AND activo = TRUE
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. PEDIDOS
-- ────────────────────────────────────────────────────────────

CREATE TYPE estatus_pedido AS ENUM (
  'recibido', 'en_proceso', 'en_taller', 'listo', 'entregado', 'cancelado'
);

CREATE TABLE IF NOT EXISTS pedidos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio          TEXT NOT NULL,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega  DATE,
  cliente        TEXT NOT NULL,
  tipo_cliente   TEXT,
  descripcion    TEXT,
  peso           NUMERIC(10,3),
  estatus        estatus_pedido NOT NULL DEFAULT 'recibido',
  sucursal_id    UUID REFERENCES sucursales(id),
  capturado_por  UUID REFERENCES usuarios(id),
  notas          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Socios y admins ven todo
CREATE POLICY "socios y admins ven todos los pedidos"
  ON pedidos FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol IN ('socio', 'administrador') AND activo = TRUE
    )
  );

-- Gerentes ven su sucursal
CREATE POLICY "gerentes ven pedidos de su sucursal"
  ON pedidos FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios
      WHERE rol = 'gerente' AND activo = TRUE
        AND sucursal_id = pedidos.sucursal_id
    )
  );

-- Vendedores ven los que capturaron
CREATE POLICY "vendedores ven sus pedidos"
  ON pedidos FOR ALL
  USING (
    auth.uid() = capturado_por
    AND auth.uid() IN (
      SELECT id FROM usuarios WHERE rol = 'vendedor' AND activo = TRUE
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. LOTES (VENTAS)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lotes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                 DATE NOT NULL DEFAULT CURRENT_DATE,
  sucursal_id           UUID REFERENCES sucursales(id),
  vendedor_id           UUID REFERENCES usuarios(id),
  proveedor             TEXT,
  oro                   TEXT,
  certificado           TEXT,
  tipo_piedra_central   TEXT,
  calidad               TEXT,
  ct_central            NUMERIC(10,4),
  tipo_piedra_lateral   TEXT,
  ct_lateral            NUMERIC(10,4),
  ctd_piedras           INTEGER,
  puntos                INTEGER,
  forma_corte           TEXT,
  origen                TEXT,
  notas                 TEXT,
  categoria             TEXT,
  codigo                TEXT,
  lote                  TEXT,
  folio                 TEXT,
  peso_oro              NUMERIC(10,3),
  precio_lista          NUMERIC(15,2),
  descuento             NUMERIC(6,2),
  precio_venta          NUMERIC(15,2),
  -- Campos restringidos (solo socio en RLS)
  costo_piedra_central  NUMERIC(15,2),
  costo_piedra_lateral  NUMERIC(15,2),
  costo_oro             NUMERIC(15,2),
  costo_total           NUMERIC(15,2),
  utilidad              NUMERIC(15,2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;

-- Socios ven todo (incluyendo costos)
CREATE POLICY "socios ven todo en lotes"
  ON lotes FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol = 'socio' AND activo = TRUE
    )
  );

-- Admins ven todo
CREATE POLICY "admins ven lotes"
  ON lotes FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol = 'administrador' AND activo = TRUE
    )
  );

-- Gerentes ven su sucursal (sin costos - se filtran en la app)
CREATE POLICY "gerentes ven lotes de su sucursal"
  ON lotes FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios
      WHERE rol = 'gerente' AND activo = TRUE
        AND sucursal_id = lotes.sucursal_id
    )
  );

CREATE POLICY "gerentes capturan lotes"
  ON lotes FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM usuarios
      WHERE rol = 'gerente' AND activo = TRUE
        AND sucursal_id = lotes.sucursal_id
    )
  );

-- Vendedores ven su sucursal (sin costos - se filtran en la app)
CREATE POLICY "vendedores ven lotes de su sucursal"
  ON lotes FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios
      WHERE rol = 'vendedor' AND activo = TRUE
        AND sucursal_id = lotes.sucursal_id
    )
  );

CREATE POLICY "vendedores capturan lotes"
  ON lotes FOR INSERT
  WITH CHECK (
    auth.uid() = vendedor_id
    AND auth.uid() IN (
      SELECT id FROM usuarios WHERE rol = 'vendedor' AND activo = TRUE
    )
  );

-- ────────────────────────────────────────────────────────────
-- 8. INVENTARIO
-- ────────────────────────────────────────────────────────────

CREATE TYPE tipo_inventario AS ENUM ('diamante', 'piedra');

CREATE TABLE IF NOT EXISTS inventario_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            tipo_inventario NOT NULL,
  codigo          TEXT,
  descripcion     TEXT,
  forma           TEXT,
  origen          TEXT,
  certificado     TEXT,
  existencia      NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidad          TEXT DEFAULT 'pz',
  -- Diamantes
  calidad         TEXT,
  ct              NUMERIC(10,4),
  color           TEXT,
  claridad        TEXT,
  corte           TEXT,
  -- Piedras
  tipo_piedra     TEXT,
  puntos          NUMERIC(10,2),
  -- Costos (solo socio/admin en la app)
  costo_unitario  NUMERIC(15,2),
  costo_total     NUMERIC(15,2),
  proveedor       TEXT,
  notas           TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventario_items ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver el inventario (existencias)
CREATE POLICY "todos ven inventario activo"
  ON inventario_items FOR SELECT
  USING (
    activo = TRUE
    AND auth.uid() IN (
      SELECT id FROM usuarios WHERE activo = TRUE
    )
  );

-- Solo socios y admins pueden insertar/editar
CREATE POLICY "socios y admins gestionan inventario"
  ON inventario_items FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol IN ('socio', 'administrador') AND activo = TRUE
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventario_updated_at
  BEFORE UPDATE ON inventario_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 9. COMISIONES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comisiones_vendedor (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  porcentaje  NUMERIC(5,2) NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendedor_id)
);

ALTER TABLE comisiones_vendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "socios y admins gestionan comisiones"
  ON comisiones_vendedor FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE rol IN ('socio', 'administrador') AND activo = TRUE
    )
  );

-- Vendedores pueden ver su propia comisión
CREATE POLICY "vendedores ven su comision"
  ON comisiones_vendedor FOR SELECT
  USING (auth.uid() = vendedor_id);

-- ────────────────────────────────────────────────────────────
-- 10. ACTUALIZAR TRIGGER handle_new_user para incluir sucursal
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usuarios (id, email, nombre, rol, sucursal_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
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

-- ────────────────────────────────────────────────────────────
-- 11. AGREGAR CATEGORÍAS DE EGRESO ADICIONALES
-- ────────────────────────────────────────────────────────────

INSERT INTO categorias_gasto (nombre, tipo) VALUES
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
  -- Ingresos adicionales
  ('Venta Lote',        'ingreso'),
  ('Anticipo',          'ingreso')
ON CONFLICT DO NOTHING;
