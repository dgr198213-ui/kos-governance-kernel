import { eventBus } from '../../event-bus/index.js';
import type { IdentityConfig, AgentIdentity, ContextBudget, ContextLoadStrategy, LoadedContext, IdentityParseResult } from './types.js';

export class IdentityManager {
  private identity: AgentIdentity | null = null;
  private defaultConfig: IdentityConfig = { identityFilePath: './CLAUDE.md', autoReload: false, reloadIntervalMs: 300000, enableContextBudgeting: true, maxContextTokens: 100000 };
  constructor(private config: Partial<IdentityConfig> = {}) {}

  async loadIdentity(configOverrides?: Partial<IdentityConfig>): Promise<IdentityParseResult> {
    const config = { ...this.defaultConfig, ...this.config, ...configOverrides };
    const identity: AgentIdentity = {
      name: 'KOS Agent', role: 'Estratega de Automatización', organization: 'Default Organization', version: '1.0.0',
      coreDirectives: ['Siempre seguir la especificación', 'Nunca alucinar información', 'Siempre solicitar validación', 'Mantener trazabilidad'],
      personality: { tone: 'technical', verbosity: 'balanced', risk: 'conservative' },
      businessContext: { industry: 'Technology', marketPosition: 'Innovation Leader', targetAudience: 'Enterprise', valueProposition: 'AI-Powered Automation' },
      currentPriorities: [{ priority: 'Quality over Speed', description: 'Priorizar precisión', weight: 0.9 }, { priority: 'Compliance', description: 'Cumplir políticas', weight: 0.85 }],
      ethicalBoundaries: { neverViolate: ['Ignorar Brand Voice', 'Usar datos no anonimizados', 'Saltarse verificación'], alwaysConsider: ['Privacidad', 'Seguridad', 'Impacto de negocio'], consultBefore: ['Modificaciones de presupuesto', 'Cambios de arquitectura'] },
      createdAt: Date.now(), updatedAt: Date.now(), lastLoaded: Date.now()
    };
    this.identity = identity;
    await eventBus.emit({
      id: this.generateId(), type: 'EnvironmentLoaded', timestamp: Date.now(),
      workspaceId: '*', correlationId: `identity-${Date.now()}`, executionId: 'identity-load',
      payload: { environmentId: 'identity', workspaceId: identity.organization, identityLoaded: true, knowledgeBaseItemsLoaded: 0, skillsAvailable: 0, governanceMatrixLoaded: true }
    });
    return { identity, warnings: [], errors: [], parsedAt: Date.now() };
  }

  getIdentity(): AgentIdentity | null { return this.identity; }

  calculateContextBudget(taskTokens: number, conversationTokens: number = 0): ContextBudget {
    if (!this.identity) throw new Error('Identity not loaded');
    const totalTokens = this.config.maxContextTokens || 100000;
    const identityTokens = Math.floor(JSON.stringify(this.identity).length / 4);
    const knowledgeBudget = Math.floor(totalTokens * 0.3);
    const allocated = identityTokens + knowledgeBudget + taskTokens + conversationTokens + Math.floor(totalTokens * 0.05);
    return { totalTokens, allocated: { identity: identityTokens, knowledge: knowledgeBudget, task: taskTokens, conversation: conversationTokens, reserved: Math.floor(totalTokens * 0.05) }, available: Math.max(0, totalTokens - allocated), usagePercent: (allocated / totalTokens) * 100 };
  }

  async loadContext(taskDescription: string, strategy: ContextLoadStrategy, conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []): Promise<LoadedContext> {
    if (!this.identity) throw new Error('Identity not loaded');
    const conversationTokens = conversationHistory.reduce((sum, msg) => sum + msg.content.length / 4, 0);
    const taskTokens = taskDescription.length / 4;
    const budget = this.calculateContextBudget(taskTokens, conversationTokens);
    const knowledge = await this.loadRelevantKnowledge(taskDescription, strategy, budget.allocated.knowledge);
    return { identity: this.identity, knowledge, taskContext: { description: taskDescription }, conversationHistory: conversationHistory.map(msg => ({ ...msg, tokens: msg.content.length / 4 })), budget, loadedAt: Date.now() };
  }

  private async loadRelevantKnowledge(taskDescription: string, strategy: ContextLoadStrategy, tokenBudget: number): Promise<LoadedContext['knowledge']> {
    const mockKnowledge = [
      { id: 'kb-1', title: 'Proceso de onboarding', content: 'El proceso incluye...', relevance: 0.8, tokens: 150 },
      { id: 'kb-2', title: 'Política de seguridad', content: 'Datos sensibles encriptados...', relevance: 0.9, tokens: 200 }
    ];
    const relevant = mockKnowledge.filter(item => item.relevance >= strategy.relevanceThreshold).sort((a, b) => b.relevance - a.relevance).slice(0, strategy.maxItems);
    let totalTokens = 0;
    const loaded: LoadedContext['knowledge'] = [];
    for (const item of relevant) {
      if (totalTokens + item.tokens > tokenBudget) break;
      loaded.push(item);
      totalTokens += item.tokens;
    }
    return loaded;
  }

  private generateId(): string { return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`; }
}
