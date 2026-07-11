import { eventBus } from '../../event-bus/index.js';
import type { EnvironmentConfig, Environment, SystemIdentity, KnowledgeBase, KnowledgeBaseItem, Skill, GovernanceMatrix, EnvironmentLoadResult } from './types.js';
import type { EnvironmentRepository } from './environment-repository.js';

export class EnvironmentEngine {
  private environments: Map<string, Environment> = new Map();
  private defaultConfig: EnvironmentConfig = {
    identityFile: 'CLAUDE.md', knowledgeBasePath: './knowledge', skillsCatalogPath: './skills',
    contextLoadingStrategy: 'on-demand', maxContextWindowSize: 100000, enableSkillAutoDiscovery: true
  };

  constructor(private config: Partial<EnvironmentConfig> = {}, private repository?: EnvironmentRepository) {}

  async loadEnvironment(workspaceId: string, configOverrides?: Partial<EnvironmentConfig>): Promise<EnvironmentLoadResult> {
    const config = { ...this.defaultConfig, ...this.config, ...configOverrides };
    const correlationId = `env-${workspaceId}-${Date.now()}`;

    await eventBus.emit({
      id: this.generateId(), type: 'EnvironmentLoading', timestamp: Date.now(),
      workspaceId, correlationId, executionId: workspaceId, payload: { workspaceId, config }
    });

    let identity = await this.loadIdentity(config.identityFile, workspaceId);
    let knowledgeBase = await this.loadKnowledgeBase(config.knowledgeBasePath, config);
    const skills = await this.loadSkillsCatalog(config.skillsCatalogPath, config);
    let governanceMatrix = await this.loadGovernanceMatrix(workspaceId);

    // Superponer la configuración persistida del workspace (si existe):
    // lo que el usuario definió UNA vez prevalece sobre las plantillas.
    if (this.repository) {
      const stored = await this.repository.load(workspaceId).catch(() => null);
      if (stored) {
        if (stored.identity) identity = { ...identity, ...stored.identity };
        if (stored.governanceMatrix) governanceMatrix = stored.governanceMatrix;
        if (stored.knowledgeItems && stored.knowledgeItems.length > 0) {
          const items = new Map<string, KnowledgeBaseItem>();
          const indexes = new Map<string, string[]>();
          for (const item of stored.knowledgeItems) {
            items.set(item.id, item);
            for (const tag of item.tags) {
              if (!indexes.has(tag)) indexes.set(tag, []);
              indexes.get(tag)!.push(item.id);
            }
          }
          knowledgeBase = { items, indexes, totalItems: stored.knowledgeItems.length, loadedItems: items.size };
        }
      }
    }

    const environment: Environment = {
      id: this.generateId(), workspaceId, identity, knowledgeBase, skills, governanceMatrix,
      contextWindowUsed: this.calculateContextUsage(identity, knowledgeBase, skills),
      lastActivity: Date.now(), sessionStartTime: Date.now(), config
    };

    this.environments.set(workspaceId, environment);

    await eventBus.emit({
      id: this.generateId(), type: 'EnvironmentLoaded', timestamp: Date.now(),
      workspaceId, correlationId, executionId: workspaceId,
      payload: { environmentId: environment.id, workspaceId, identityLoaded: true, knowledgeBaseItemsLoaded: knowledgeBase.loadedItems, skillsAvailable: skills.size, governanceMatrixLoaded: true }
    });

    const contextWindowBudget = { total: config.maxContextWindowSize!, used: environment.contextWindowUsed, available: config.maxContextWindowSize! - environment.contextWindowUsed };

    return { environment, warnings: this.generateWarnings(environment, contextWindowBudget), recommendations: this.generateRecommendations(environment), contextWindowBudget };
  }

  private async loadIdentity(identityFile: string, workspaceId: string): Promise<SystemIdentity> {
    return {
      name: 'KOS Agent', role: 'Estratega de Automatización', organization: workspaceId,
      coreDirectives: ['Siempre seguir la especificación', 'Nunca alucinar información', 'Siempre solicitar validación en checkpoints', 'Mantener trazabilidad completa'],
      personality: { tone: 'technical', verbosity: 'balanced' },
      version: '1.0.0', lastUpdated: Date.now()
    };
  }

  private async loadKnowledgeBase(knowledgeBasePath: string, config: EnvironmentConfig): Promise<KnowledgeBase> {
    const items = new Map<string, KnowledgeBaseItem>();
    const indexes = new Map<string, string[]>();
    const mockItems: KnowledgeBaseItem[] = [
      { id: this.generateId(), title: 'Proceso de onboarding', category: 'process', content: 'El proceso incluye: 1) Reunión inicial, 2) Configuración técnica...', tags: ['onboarding', 'proceso'], accessCount: 0 },
      { id: this.generateId(), title: 'Política de seguridad', category: 'policy', content: 'Todos los datos sensibles deben ser encriptados...', tags: ['seguridad', 'datos', 'gdpr'], accessCount: 0 },
      { id: this.generateId(), title: 'Arquitectura técnica', category: 'technical', content: 'Microservicios en Kubernetes con PostgreSQL...', tags: ['arquitectura', 'técnico'], accessCount: 0 }
    ];
    for (const item of mockItems) {
      items.set(item.id, item);
      for (const tag of item.tags) {
        if (!indexes.has(tag)) indexes.set(tag, []);
        indexes.get(tag)!.push(item.id);
      }
    }
    return { items, indexes, totalItems: mockItems.length, loadedItems: items.size };
  }

  private async loadSkillsCatalog(skillsCatalogPath: string, config: EnvironmentConfig): Promise<Map<string, Skill>> {
    const skills = new Map<string, Skill>();
    const mockSkills: Skill[] = [
      {
        id: this.generateId(), name: 'Análisis de datos', version: '1.0.0', description: 'Analiza datasets y genera insights', category: 'analytics',
        manifest: { dependencies: ['pandas'], estimatedDuration: 30 },
        prompts: { main: 'Eres un analista experto...' },
        tools: [{ name: 'python-executor', type: 'function', config: { timeout: 300 } }],
        memory: { persistent: true, schema: { lastAnalysis: 'object' } },
        verifier: { criteria: ['Insights accionables'], validationMethod: 'hybrid' },
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0, successRate: 0.95
      }
    ];
    for (const skill of mockSkills) skills.set(skill.id, skill);
    return skills;
  }

  private async loadGovernanceMatrix(workspaceId: string): Promise<GovernanceMatrix> {
    return {
      always: [
        { action: 'Ejecutar Skills validadas del catálogo', rationale: 'Skills validadas tienen calidad garantizada', enforceable: true },
        { action: 'Formatear documentos según la Spec', rationale: 'Consistencia con especificaciones', enforceable: true },
        { action: 'Citar fuentes externas', rationale: 'Trazabilidad', enforceable: true }
      ],
      consult: [
        { action: 'Modificación de presupuestos', rationale: 'Impacto financiero', approver: 'human', condition: 'Cambio > 10%' },
        { action: 'Cambios en arquitectura de datos', rationale: 'Impacto en integraciones', approver: 'human' },
        { action: 'Uso de datos sensibles', rationale: 'Cumplimiento GDPR', approver: 'human' }
      ],
      never: [
        { action: 'Generar contenido que ignore Brand Voice', rationale: 'Consistencia de marca', severity: 'high' },
        { action: 'Usar datos no anonimizados en logs', rationale: 'Violación de privacidad', severity: 'critical' },
        { action: 'Saltarse verificación multi-agente', rationale: 'Control de calidad', severity: 'high' },
        { action: 'Avanzar sin validación en checkpoints', rationale: 'Prevención de errores', severity: 'critical' }
      ]
    };
  }

  private calculateContextUsage(identity: SystemIdentity, knowledgeBase: KnowledgeBase, skills: Map<string, Skill>): number {
    let tokens = JSON.stringify(identity).length / 4;
    for (const item of knowledgeBase.items.values()) tokens += item.content.length / 4;
    for (const skill of skills.values()) tokens += (skill.name.length + skill.description.length) / 4;
    return Math.round(tokens);
  }

  async checkGovernance(workspaceId: string, action: string): Promise<{ allowed: boolean; level: 'always' | 'consult' | 'never'; reason: string }> {
    const env = this.environments.get(workspaceId);
    if (!env) return { allowed: false, level: 'never', reason: 'Entorno no cargado' };

    if (env.governanceMatrix.always.some(a => action.toLowerCase().includes(a.action.toLowerCase()))) return { allowed: true, level: 'always', reason: 'Acción permitida' };
    if (env.governanceMatrix.consult.some(a => action.toLowerCase().includes(a.action.toLowerCase()))) return { allowed: false, level: 'consult', reason: 'Requiere aprobación' };
    if (env.governanceMatrix.never.some(a => action.toLowerCase().includes(a.action.toLowerCase()))) return { allowed: false, level: 'never', reason: 'Acción prohibida' };
    return { allowed: true, level: 'always', reason: 'Acción no restringida' };
  }

  private generateWarnings(env: Environment, budget: any): string[] {
    const warnings: string[] = [];
    if (budget.used > budget.total * 0.8) warnings.push(`Ventana de contexto al ${Math.round(budget.used / budget.total * 100)}%.`);
    if (env.skills.size === 0) warnings.push('No hay Skills disponibles.');
    return warnings;
  }

  private generateRecommendations(env: Environment): string[] {
    return ['Revisa y actualiza el catálogo de Skills regularmente.', 'Considera estrategia on-demand para bases grandes.'];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
