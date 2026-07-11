import type { EnvironmentRepository, WorkspaceEnvironmentConfig } from '@kos/control-plane';

const KEY_PREFIX = 'kos:environment:';

/**
 * Persistencia del entorno del workspace en el navegador (localStorage).
 *
 * Perfecta para la demo desplegada: tu matriz de gobernanza, identidad y
 * conocimiento sobreviven a recargas sin necesidad de login. En producción
 * multi-dispositivo se sustituye por el adaptador de Supabase detrás del
 * mismo puerto EnvironmentRepository.
 *
 * Nota: aquí NO se guardan claves de API — solo configuración de trabajo.
 */
export class LocalStorageEnvironmentRepository implements EnvironmentRepository {
  async load(workspaceId: string): Promise<WorkspaceEnvironmentConfig | null> {
    try {
      const raw = localStorage.getItem(KEY_PREFIX + workspaceId);
      return raw ? (JSON.parse(raw) as WorkspaceEnvironmentConfig) : null;
    } catch {
      return null;
    }
  }

  async save(workspaceId: string, config: WorkspaceEnvironmentConfig): Promise<void> {
    localStorage.setItem(KEY_PREFIX + workspaceId, JSON.stringify(config));
  }
}
