-- ============================================================
-- Migración 0002: Endurecimiento de Row Level Security
-- ============================================================
-- Problemas que corrige del schema.sql original:
--
--   1. workspaces tenía políticas USING (true): cualquier cliente
--      con la anon key podía leer, crear y modificar TODOS los
--      workspaces de TODOS los usuarios.
--   2. executions, audit_logs, skills y knowledge_base tenían RLS
--      habilitado pero SIN políticas: deny-all, la aplicación no
--      podía ni insertar ni leer con la anon key.
--
-- Modelo resultante: cada workspace pertenece a un usuario de
-- Supabase Auth (owner_id = auth.uid()) y todas las tablas hijas
-- heredan el acceso a través de su workspace.
-- ============================================================

-- 1. Ownership en workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

-- Los workspaces creados antes de esta migración quedan sin owner.
-- Asignarlos manualmente antes de activar las políticas en producción:
--   UPDATE workspaces SET owner_id = '<uuid-del-usuario>' WHERE owner_id IS NULL;

-- 2. Eliminar las políticas abiertas
DROP POLICY IF EXISTS "Users can view workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can insert workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update workspaces" ON workspaces;

-- 3. Políticas por ownership: workspaces
CREATE POLICY "workspaces_select_own" ON workspaces
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "workspaces_insert_own" ON workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_own" ON workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_delete_own" ON workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- 4. Función auxiliar: ¿el usuario actual es dueño del workspace?
CREATE OR REPLACE FUNCTION public.owns_workspace(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = ws_id AND owner_id = auth.uid()
  );
$$;

-- 5. Tablas hijas: acceso a través del workspace
CREATE POLICY "executions_all_own" ON executions
  FOR ALL TO authenticated
  USING (public.owns_workspace(workspace_id))
  WITH CHECK (public.owns_workspace(workspace_id));

CREATE POLICY "audit_logs_select_own" ON audit_logs
  FOR SELECT TO authenticated
  USING (public.owns_workspace(workspace_id));

CREATE POLICY "audit_logs_insert_own" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_workspace(workspace_id));
-- Nota: audit_logs es append-only a propósito (sin UPDATE ni DELETE).

CREATE POLICY "skills_all_own" ON skills
  FOR ALL TO authenticated
  USING (public.owns_workspace(workspace_id))
  WITH CHECK (public.owns_workspace(workspace_id));

CREATE POLICY "knowledge_base_all_own" ON knowledge_base
  FOR ALL TO authenticated
  USING (public.owns_workspace(workspace_id))
  WITH CHECK (public.owns_workspace(workspace_id));
