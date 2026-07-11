-- ============================================================
-- Migración 0003: Entornos de workspace por usuario
-- ============================================================
-- Soporta la persistencia en la nube de la configuración del
-- workspace (identidad, matriz de gobernanza, documentación)
-- que edita el usuario en KOS Studio. Cada usuario solo puede
-- leer y escribir SUS entornos.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_environments (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_key TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workspace_key)
);

ALTER TABLE user_environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_environments_all_own" ON user_environments
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
