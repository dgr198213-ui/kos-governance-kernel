export interface IdentityConfig { identityFilePath: string; autoReload: boolean; reloadIntervalMs: number; enableContextBudgeting: boolean; maxContextTokens: number; }
export interface AgentIdentity {
  name: string; role: string; organization: string; version: string;
  coreDirectives: string[];
  personality: { tone: 'formal' | 'casual' | 'technical' | 'friendly'; verbosity: 'concise' | 'balanced' | 'detailed'; risk: 'conservative' | 'balanced' | 'aggressive'; };
  businessContext: { industry: string; marketPosition: string; targetAudience: string; valueProposition: string; };
  currentPriorities: Array<{ priority: string; description: string; weight: number; }>;
  ethicalBoundaries: { neverViolate: string[]; alwaysConsider: string[]; consultBefore: string[]; };
  createdAt: number; updatedAt: number; lastLoaded: number;
}
export interface ContextBudget { totalTokens: number; allocated: { identity: number; knowledge: number; task: number; conversation: number; reserved: number; }; available: number; usagePercent: number; }
export interface ContextLoadStrategy { mode: 'on-demand' | 'predictive' | 'full'; maxItems: number; relevanceThreshold: number; priorityCategories: string[]; }
export interface LoadedContext { identity: AgentIdentity; knowledge: Array<{ id: string; title: string; content: string; relevance: number; tokens: number; }>; taskContext: Record<string, unknown>; conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string; tokens: number; }>; budget: ContextBudget; loadedAt: number; }
export interface IdentityParseResult { identity: AgentIdentity; warnings: string[]; errors: string[]; parsedAt: number; }
