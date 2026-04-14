-- ============================================================
-- SUMEFRA OS — RLS Policies v2
-- ============================================================
ALTER TABLE usuarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_banco    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_imagenes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comisiones_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE comisiones       ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_rol()
RETURNS rol_usuario LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION get_sucursal()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sucursal_id FROM usuarios WHERE id = auth.uid()
$$;

-- USUARIOS
CREATE POLICY "u_self"  ON usuarios FOR SELECT USING (id = auth.uid());
CREATE POLICY "u_admin" ON usuarios FOR SELECT USING (get_rol() IN ('socio','administrador'));
CREATE POLICY "u_mod"   ON usuarios FOR ALL    USING (get_rol() = 'socio');

-- SUCURSALES
CREATE POLICY "s_all"   ON sucursales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "s_socio" ON sucursales FOR ALL   USING (get_rol() = 'socio');

-- CUENTAS
CREATE POLICY "c_fin"   ON cuentas_banco FOR SELECT USING (get_rol() IN ('socio','administrador','contador'));
CREATE POLICY "c_mod"   ON cuentas_banco FOR ALL    USING (get_rol() IN ('socio','administrador'));

-- CATEGORIAS
CREATE POLICY "cat_all" ON categorias_gasto FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cat_mod" ON categorias_gasto FOR ALL   USING (get_rol() IN ('socio','administrador'));

-- TRANSACCIONES
CREATE POLICY "tx_socio"  ON transacciones FOR SELECT USING (get_rol() IN ('socio','administrador','contador'));
CREATE POLICY "tx_insert" ON transacciones FOR INSERT WITH CHECK (get_rol() IN ('socio','administrador') AND capturado_por = auth.uid());
CREATE POLICY "tx_update" ON transacciones FOR UPDATE USING (get_rol() IN ('socio','administrador'));
CREATE POLICY "tx_delete" ON transacciones FOR DELETE USING (get_rol() = 'socio');

-- LOTES — vendedor ve sin costos (via view)
CREATE POLICY "lot_socio"    ON lotes FOR SELECT USING (get_rol() IN ('socio','administrador'));
CREATE POLICY "lot_gerente"  ON lotes FOR SELECT USING (get_rol() = 'gerente' AND sucursal_id = get_sucursal());
CREATE POLICY "lot_vendedor" ON lotes FOR SELECT USING (get_rol() = 'vendedor' AND sucursal_id = get_sucursal());
CREATE POLICY "lot_insert"   ON lotes FOR INSERT WITH CHECK (get_rol() IN ('socio','administrador','gerente','vendedor'));
CREATE POLICY "lot_update"   ON lotes FOR UPDATE USING (get_rol() IN ('socio','administrador','gerente'));
CREATE POLICY "lot_delete"   ON lotes FOR DELETE USING (get_rol() IN ('socio','administrador'));

-- PEDIDOS — todos los roles
CREATE POLICY "ped_all"    ON pedidos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ped_insert" ON pedidos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND creado_por = auth.uid());
CREATE POLICY "ped_update" ON pedidos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ped_delete" ON pedidos FOR DELETE USING (get_rol() IN ('socio','administrador'));

CREATE POLICY "pi_all"    ON pedido_imagenes  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pi_insert" ON pedido_imagenes  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ph_all"    ON pedido_historial FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ph_insert" ON pedido_historial FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- CATÁLOGO — todos ven
CREATE POLICY "cat2_all" ON catalogo FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cat2_mod" ON catalogo FOR ALL   USING (get_rol() IN ('socio','administrador'));

-- COMISIONES
CREATE POLICY "com_socio"    ON comisiones_config FOR SELECT USING (get_rol() IN ('socio','administrador'));
CREATE POLICY "com_mod"      ON comisiones_config FOR ALL   USING (get_rol() IN ('socio','administrador'));
CREATE POLICY "comv_socio"   ON comisiones        FOR SELECT USING (get_rol() IN ('socio','administrador'));
CREATE POLICY "comv_self"    ON comisiones        FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "comv_insert"  ON comisiones        FOR INSERT WITH CHECK (get_rol() IN ('socio','administrador'));
CREATE POLICY "comv_update"  ON comisiones        FOR UPDATE USING (get_rol() IN ('socio','administrador'));
