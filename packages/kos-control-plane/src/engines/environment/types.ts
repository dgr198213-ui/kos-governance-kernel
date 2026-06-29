export type ContextLoadingStrategy = 'on-demand' | 'full' | 'selective';

export interface EnvironmentConfig {
  identityFile: string;
  knowledgeBasePath: string;
  skillsCatalogPath: string;
  contextLoadingStrategy: ContextLoadingStrategy;
  maxContextWindowSize?: number;
  enableSkillAutoDiscovery?: boolean;
}

export interface SystemIdentity {
  name: string; role: string; organization: string; coreDirectives: string[];
  personality?: { tone: 'formal' | 'casual' | 'technical' | 'friendly'; verbosity: 'concise' | 'balanced' | 'detailed'; };
  version: string; lastUpdated: number;
}

export interface KnowledgeBaseItem {
  id: string; title: string; category: 'process' | 'client' | 'technical' | 'policy' | 'vision';
  content: string; tags: string[]; lastAccessed?: number; accessCount: number; relevanceScore?: number;
}

export interface KnowledgeBase {
  items: Map<string, KnowledgeBaseItem>;
  indexes: Map<string, string[]>;
  totalItems: number;
  loadedItems: number;
}

export interface Skill {
  id: string; name: string; version: string; description: string; category: string;
  manifest: { dependencies?: string[]; requiredPermissions?: string[]; estimatedDuration?: number; };
  prompts: { main: string; variations?: Record<string, string>; };
  tools?: Array<{ name: string; type: 'api' | 'function' | 'mcp'; config: Record<string, unknown>; }>;
  memory?: { persistent: boolean; schema?: Record<string, string>; };
  tests?: Array<{ name: string; input: unknown; expectedOutput: unknown; }>;
  verifier?: { criteria: string[]; validationMethod: 'automated' | 'human' | 'hybrid'; };
  createdAt: number; updatedAt: number; usageCount: number; successRate: number;
}

export interface GovernanceMatrix {
  always: Array<{ action: string; rationale: string; enforceable: boolean; }>;
  consult: Array<{ action: string; rationale: string; approver: 'human' | 'automated'; condition?: string; }>;
  never: Array<{ action: string; rationale: string; severity: 'critical' | 'high' | 'medium'; }>;
}

export interface Environment {
  id: string; workspaceId: string;
  identity: SystemIdentity; knowledgeBase: KnowledgeBase; skills: Map<string, Skill>; governanceMatrix: GovernanceMatrix;
  contextWindowUsed: number; lastActivity: number; sessionStartTime: number;
  config: EnvironmentConfig;
}

export interface EnvironmentLoadResult {
  environment: Environment;
  warnings: string[];
  recommendations: string[];
  contextWindowBudget: { total: number; used: number; available: number; };
}
