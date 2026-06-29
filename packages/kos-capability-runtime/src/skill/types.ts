export type SkillStatus = 'draft' | 'validated' | 'published' | 'deprecated';
export type SkillCategory = 'analytics' | 'reporting' | 'automation' | 'communication' | 'code-generation' | 'data-processing' | 'integration' | 'validation' | 'custom';

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  category: SkillCategory;
  author: string;
  license: string;
  dependencies: string[];
  requiredPermissions: string[];
  requiredProviders: string[];
  estimatedDuration: number;
  estimatedTokensPerRun: number;
  maxCostPerRun: number;
  minRuntimeVersion: string;
  supportedEnvironments: string[];
}

export interface SkillPolicy {
  requireHumanApproval: boolean;
  approvalConditions: string[];
  maxRetries: number;
  timeoutMs: number;
  allowedDataAccess: 'none' | 'read-only' | 'read-write';
  auditLevel: 'minimal' | 'standard' | 'verbose';
}

export interface SkillPrompt {
  id: string;
  name: string;
  template: string;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    default?: unknown;
    description: string;
  }>;
  systemMessage?: string;
  temperature: number;
  maxTokens: number;
}

export interface SkillTool {
  id: string;
  name: string;
  type: 'api' | 'function' | 'mcp' | 'shell' | 'database';
  description: string;
  config: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface SkillMemory {
  persistent: boolean;
  schema: Record<string, { type: string; description: string; ttl?: number; }>;
  maxEntries: number;
}

export interface SkillTestCase {
  id: string;
  name: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  assertions: Array<{ path: string; operator: string; value: unknown; }>;
  timeoutMs: number;
}

export interface SkillVerifier {
  criteria: Array<{ id: string; name: string; description: string; weight: number; validationMethod: 'automated' | 'human' | 'llm-judge'; }>;
  minScore: number;
  feedbackTemplate: string;
}

export interface Skill {
  id: string;
  manifest: SkillManifest;
  policy: SkillPolicy;
  prompts: SkillPrompt[];
  tools: SkillTool[];
  memory: SkillMemory;
  tests: SkillTestCase[];
  verifier: SkillVerifier;
  status: SkillStatus;
  installedAt: number;
  updatedAt: number;
  usageStats: { totalRuns: number; successRate: number; averageDuration: number; averageCost: number; lastRunAt?: number; };
}

export interface SkillExecutionRequest {
  skillId: string;
  workspaceId: string;
  input: Record<string, unknown>;
  options?: { promptVariation?: string; dryRun?: boolean; skipVerification?: boolean; memoryKey?: string; };
}

export interface SkillExecutionResult {
  skillId: string;
  executionId: string;
  status: 'success' | 'failed' | 'timeout' | 'cancelled';
  output: unknown;
  artifacts: Array<{ name: string; type: string; content: unknown; }>;
  metrics: { duration: number; tokensUsed: number; cost: number; verificationScore?: number; };
  logs: Array<{ timestamp: number; level: 'info' | 'warn' | 'error'; message: string; data?: unknown; }>;
  memoryUpdated: boolean;
}
