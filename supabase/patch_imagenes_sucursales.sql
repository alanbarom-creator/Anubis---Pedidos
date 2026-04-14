-- ============================================================
-- PATCH: Imágenes en pedidos + Sucursales correctas
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- 1. Agregar columnas de imágenes a la tabla pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS imagen_inicio_url TEXT,
  ADD COLUMN IF NOT EXISTS imagen_render_url TEXT;

-- 2. Actualizar sucursales con los nombres correctos
--    (Elimina las existentes y recrea con la lista oficial)
DELETE FROM sucursales;

INSERT INTO sucursales (nombre, ciudad, activo) VALUES
  ('Sumefra',                'Guadalajara', TRUE),
  ('Anubis Aguascalientes',  'Aguascalientes', TRUE),
  ('Anubis Centro',          'Guadalajara', TRUE),
  ('Anubis Galerías',        'Guadalajara', TRUE),
  ('Anubis Sahuaro Grande',  'Guadalajara', TRUE),
  ('Anubis Sahuaro Chico',   'Guadalajara', TRUE),
  ('M&P Galerías',           'Guadalajara', TRUE);

-- 3. Instrucciones para el Storage bucket (ejecutar desde Supabase Dashboard)
-- ============================================================
-- Ir a: Storage → New bucket
--   Nombre: pedido-imagenes
--   Public: SÍ (activar toggle "Public bucket")
-- ============================================================
-- O ejecutar via SQL (requiere extensión storage schema):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('pedido-imagenes', 'pedido-imagenes', true)
-- ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Política RLS para que usuarios autenticados suban imágenes
-- (Solo si el bucket no es público o se quiere control adicional)
/*
CREATE POLICY "usuarios autenticados pueden subir" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pedido-imagenes');

CREATE POLICY "usuarios autenticados pueden actualizar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pedido-imagenes');

CREATE POLICY "usuarios autenticados pueden eliminar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pedido-imagenes');

CREATE POLICY "lectura pública de imágenes" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'pedido-imagenes');
*/
