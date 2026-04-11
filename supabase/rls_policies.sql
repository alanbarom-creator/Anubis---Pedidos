-- ============================================================
-- SUMEFRA OS — Row Level Security Policies
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_banco     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_gasto  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones     ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- Helper function: obtiene el rol del usuario autenticado
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS rol_usuario LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid()
$$;

-- ────────────────────────────────────────────────────────────
-- USUARIOS
-- ────────────────────────────────────────────────────────────
-- Cada usuario puede ver su propio perfil
CREATE POLICY "usuarios: ver propio perfil"
  ON usuarios FOR SELECT
  USING (id = auth.uid());

-- Socio y administrador pueden ver todos los usuarios
CREATE POLICY "usuarios: socio/admin ven todos"
  ON usuarios FOR SELECT
  USING (get_user_rol() IN ('socio', 'administrador'));

-- Solo socio puede modificar usuarios
CREATE POLICY "usuarios: solo socio puede modificar"
  ON usuarios FOR ALL
  USING (get_user_rol() = 'socio');

-- ────────────────────────────────────────────────────────────
-- SUCURSALES
-- ────────────────────────────────────────────────────────────
-- Todos los usuarios autenticados pueden ver sucursales activas
CREATE POLICY "sucursales: todos pueden ver"
  ON sucursales FOR SELECT
  USING (auth.uid() IS NOT NULL AND activo = TRUE);

-- Solo socio puede modificar sucursales
CREATE POLICY "sucursales: solo socio modifica"
  ON sucursales FOR ALL
  USING (get_user_rol() = 'socio');

-- ────────────────────────────────────────────────────────────
-- CUENTAS BANCO
-- ────────────────────────────────────────────────────────────
-- Socio y administrador ven todas las cuentas
CREATE POLICY "cuentas: socio/admin/contador pueden ver"
  ON cuentas_banco FOR SELECT
  USING (get_user_rol() IN ('socio', 'administrador', 'contador'));

-- Solo socio y administrador pueden insertar/actualizar cuentas
CREATE POLICY "cuentas: socio/admin modifican"
  ON cuentas_banco FOR ALL
  USING (get_user_rol() IN ('socio', 'administrador'));

-- ────────────────────────────────────────────────────────────
-- CATEGORÍAS
-- ────────────────────────────────────────────────────────────
-- Todos los usuarios pueden ver categorías activas
CREATE POLICY "categorias: todos pueden ver"
  ON categorias_gasto FOR SELECT
  USING (auth.uid() IS NOT NULL AND activo = TRUE);

-- Solo socio y administrador pueden modificar categorías
CREATE POLICY "categorias: socio/admin modifican"
  ON categorias_gasto FOR ALL
  USING (get_user_rol() IN ('socio', 'administrador'));

-- ────────────────────────────────────────────────────────────
-- TRANSACCIONES
-- ────────────────────────────────────────────────────────────

-- SOCIO: ve todo
CREATE POLICY "transacciones: socio ve todo"
  ON transacciones FOR SELECT
  USING (get_user_rol() = 'socio');

-- ADMINISTRADOR: ve todas las transacciones
CREATE POLICY "transacciones: administrador ve todo"
  ON transacciones FOR SELECT
  USING (get_user_rol() = 'administrador');

-- CONTADOR: solo lectura en todas las transacciones
CREATE POLICY "transacciones: contador solo lectura"
  ON transacciones FOR SELECT
  USING (get_user_rol() = 'contador');

-- GERENTE: solo ve transacciones de su sucursal (sin montos de costo)
CREATE POLICY "transacciones: gerente ve su sucursal"
  ON transacciones FOR SELECT
  USING (
    get_user_rol() = 'gerente'
    AND sucursal_id = (SELECT sucursal_id FROM usuarios WHERE id = auth.uid())
  );

-- VENDEDOR: ve solo lo que él capturó
CREATE POLICY "transacciones: vendedor ve sus capturas"
  ON transacciones FOR SELECT
  USING (
    get_user_rol() = 'vendedor'
    AND capturado_por = auth.uid()
  );

-- INSERT: socio, administrador, gerente y vendedor pueden capturar
CREATE POLICY "transacciones: captura por roles habilitados"
  ON transacciones FOR INSERT
  WITH CHECK (
    get_user_rol() IN ('socio', 'administrador', 'gerente', 'vendedor')
    AND capturado_por = auth.uid()
  );

-- UPDATE (aprobación): solo socio y administrador pueden aprobar
CREATE POLICY "transacciones: aprobacion socio/admin"
  ON transacciones FOR UPDATE
  USING (get_user_rol() IN ('socio', 'administrador'));

-- DELETE: solo socio
CREATE POLICY "transacciones: solo socio elimina"
  ON transacciones FOR DELETE
  USING (get_user_rol() = 'socio');
