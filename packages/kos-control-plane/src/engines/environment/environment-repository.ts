import type { SystemIdentity, GovernanceMatrix, KnowledgeBaseItem } from './types.js';

/**
 * Puerto de persistencia del entorno de un workspace (Clean Architecture).
 *
 * Este es el corazón de la propuesta de valor de KOS: la configuración de
 * la empresa (identidad, matriz de gobernanza, conocimiento) se define UNA
 * vez y sobrevive al modelo — cambiar de LLM no borra tus métodos de
 * trabajo. Las implementaciones concretas (localStorage en la demo,
 * Supabase en producción) viven fuera del control plane.
 */

export interface WorkspaceEnvironmentConfig {
  identity?: Partial<SystemIdentity>;
  governanceMatrix?: GovernanceMatrix;
  knowledgeItems?: KnowledgeBaseItem[];
}

export interface EnvironmentRepository {
  load(workspaceId: string): Promise<WorkspaceEnvironmentConfig | null>;
  save(workspaceId: string, config: WorkspaceEnvironmentConfig): Promise<void>;
}
