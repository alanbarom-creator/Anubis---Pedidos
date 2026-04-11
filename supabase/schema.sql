-- ============================================================
-- SUMEFRA OS — Schema completo Sprint 1
-- Ejecutar en Supabase SQL Editor (en orden)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TIPOS ENUM
-- ────────────────────────────────────────────────────────────
CREATE TYPE rol_usuario AS ENUM (
  'socio',
  'administrador',
  'gerente',
  'vendedor',
  'contador'
);

CREATE TYPE tipo_cuenta AS ENUM ('banco', 'efectivo', 'terminal');
CREATE TYPE moneda_tipo AS ENUM ('MXN', 'USD');
CREATE TYPE tipo_transaccion AS ENUM ('ingreso', 'egreso');
CREATE TYPE tipo_categoria AS ENUM ('ingreso', 'egreso');

-- ────────────────────────────────────────────────────────────
-- 2. SUCURSALES
-- ────────────────────────────────────────────────────────────
CREATE TABLE sucursales (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  ciudad      TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datos iniciales: 6 sucursales
INSERT INTO sucursales (nombre, ciudad) VALUES
  ('Sucursal Centro',   'Ciudad de México'),
  ('Sucursal Norte',    'Monterrey'),
  ('Sucursal Sur',      'Guadalajara'),
  ('Sucursal Oriente',  'Puebla'),
  ('Sucursal Occidente','León'),
  ('Sucursal Bajío',    'Querétaro');

-- ────────────────────────────────────────────────────────────
-- 3. USUARIOS (perfil extendido de auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE usuarios (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,
  nombre       TEXT NOT NULL,
  rol          rol_usuario NOT NULL DEFAULT 'vendedor',
  sucursal_id  UUID REFERENCES sucursales(id),
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: crea perfil automáticamente al registrar usuario en auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usuarios (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'vendedor')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 4. CUENTAS BANCARIAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE cuentas_banco (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  tipo          tipo_cuenta NOT NULL,
  moneda        moneda_tipo NOT NULL DEFAULT 'MXN',
  saldo_actual  NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_minimo  NUMERIC(15,2) NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO cuentas_banco (nombre, tipo, moneda, saldo_actual, saldo_minimo) VALUES
  ('Caja Efectivo MXN',   'efectivo', 'MXN', 50000.00, 5000.00),
  ('BBVA Empresarial',    'banco',    'MXN', 150000.00, 20000.00),
  ('Santander Corriente', 'banco',    'MXN', 80000.00, 10000.00),
  ('Terminal Clip',       'terminal', 'MXN', 0.00, 0.00),
  ('Caja USD',            'efectivo', 'USD', 2000.00, 200.00);

-- ────────────────────────────────────────────────────────────
-- 5. CATEGORÍAS DE GASTO/INGRESO
-- ────────────────────────────────────────────────────────────
CREATE TABLE categorias_gasto (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  TEXT NOT NULL,
  tipo    tipo_categoria NOT NULL,
  activo  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datos iniciales requeridos
INSERT INTO categorias_gasto (nombre, tipo) VALUES
  ('Nómina',            'egreso'),
  ('IMSS',              'egreso'),
  ('Compras Material',  'egreso'),
  ('Renta',             'egreso'),
  ('Publicidad',        'egreso'),
  ('Gasto Operativo',   'egreso'),
  ('Gasto Variable',    'egreso'),
  ('Financiero',        'egreso'),
  ('Comisiones',        'egreso'),
  -- Categorías de ingreso
  ('Venta Mostrador',   'ingreso'),
  ('Venta Online',      'ingreso'),
  ('Consignación',      'ingreso'),
  ('Otro Ingreso',      'ingreso');

-- ────────────────────────────────────────────────────────────
-- 6. TRANSACCIONES
-- ────────────────────────────────────────────────────────────
CREATE TABLE transacciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo            tipo_transaccion NOT NULL,
  monto           NUMERIC(15,2) NOT NULL CHECK (monto > 0),
  moneda          moneda_tipo NOT NULL DEFAULT 'MXN',
  tipo_cambio     NUMERIC(10,4),                          -- solo si moneda=USD
  monto_mxn       NUMERIC(15,2) GENERATED ALWAYS AS (
                    CASE WHEN moneda = 'MXN' THEN monto
                    ELSE monto * COALESCE(tipo_cambio, 1) END
                  ) STORED,
  categoria_id    UUID REFERENCES categorias_gasto(id),
  descripcion     TEXT,
  cuenta_id       UUID NOT NULL REFERENCES cuentas_banco(id),
  sucursal_id     UUID REFERENCES sucursales(id),
  capturado_por   UUID REFERENCES usuarios(id),
  aprobado        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: actualiza saldo de cuenta al insertar transacción
CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo = 'ingreso' THEN
    UPDATE cuentas_banco SET saldo_actual = saldo_actual + NEW.monto
    WHERE id = NEW.cuenta_id;
  ELSE
    UPDATE cuentas_banco SET saldo_actual = saldo_actual - NEW.monto
    WHERE id = NEW.cuenta_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transaccion_insert
  AFTER INSERT ON transacciones
  FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_cuenta();
