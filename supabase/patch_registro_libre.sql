-- ============================================================
-- PATCH: Registro abierto con aprobación de administrador
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- 1. Nuevos usuarios empiezan inactivos (pendientes de aprobación)
ALTER TABLE usuarios ALTER COLUMN activo SET DEFAULT FALSE;

-- 2. Actualizar trigger para que nuevos registros sean inactivos
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usuarios (id, email, nombre, rol, sucursal_id, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)),
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'vendedor'),
    NULLIF(NEW.raw_user_meta_data->>'sucursal_id', '')::uuid,
    FALSE  -- siempre inactivo hasta que admin active
  )
  ON CONFLICT (id) DO UPDATE
    SET sucursal_id = COALESCE(
          NULLIF(NEW.raw_user_meta_data->>'sucursal_id', '')::uuid,
          usuarios.sucursal_id
        );
  RETURN NEW;
END;
$$;

-- 3. Permitir lectura pública de sucursales (para el formulario de registro)
-- (ya existe en el schema, esto es por si se necesita recrear)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sucursales' AND policyname = 'anon ve sucursales activas'
  ) THEN
    CREATE POLICY "anon ve sucursales activas" ON sucursales FOR SELECT
      TO anon USING (activo = TRUE);
  END IF;
END $$;

-- 4. Confirmar que tu usuario (administrador) ya tiene activo = TRUE
-- Reemplaza 'tu@correo.com' con tu correo real
-- UPDATE usuarios SET activo = TRUE WHERE email = 'tu@correo.com';
