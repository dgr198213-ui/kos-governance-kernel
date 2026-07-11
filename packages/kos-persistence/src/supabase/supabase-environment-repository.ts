import type { SupabaseClient } from '@supabase/supabase-js';
import type { EnvironmentRepository, WorkspaceEnvironmentConfig } from '@kos/control-plane';

/**
 * Persistencia en la nube del entorno del workspace (tabla user_environments,
 * migración 0003). Requiere sesión de Supabase Auth: las políticas RLS
 * garantizan que cada usuario solo accede a sus propios entornos.
 */
export class SupabaseEnvironmentRepository implements EnvironmentRepository {
  constructor(private client: SupabaseClient) {}

  async load(workspaceId: string): Promise<WorkspaceEnvironmentConfig | null> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('user_environments')
      .select('config')
      .eq('user_id', userId)
      .eq('workspace_key', workspaceId)
      .maybeSingle();
    if (error) throw new Error(`No se pudo cargar el entorno: ${error.message}`);
    return (data?.config as WorkspaceEnvironmentConfig) ?? null;
  }

  async save(workspaceId: string, config: WorkspaceEnvironmentConfig): Promise<void> {
    const userId = await this.requireUserId();
    const { error } = await this.client
      .from('user_environments')
      .upsert({ user_id: userId, workspace_key: workspaceId, config, updated_at: new Date().toISOString() });
    if (error) throw new Error(`No se pudo guardar el entorno: ${error.message}`);
  }

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data?.user) {
      throw new Error('SupabaseEnvironmentRepository requiere una sesión autenticada');
    }
    return data.user.id;
  }
}
