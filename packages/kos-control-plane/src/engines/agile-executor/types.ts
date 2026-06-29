export interface AgileExecutorConfig {
  mode: 'agile' | 'waterfall' | 'hybrid';
  maxBlockSize: 'small' | 'medium' | 'large';
  enableHotReview: boolean;
  enableAutoAdjustment: boolean;
  requireCheckpointApproval: boolean;
  maxRetriesPerBlock: number;
  driftDetectionThreshold: number;
}

export interface MicroBlock {
  id: string; index: number; title: string; description: string; dependencies: string[];
  input: Record<string, unknown>; expectedOutput: string;
  validationCriteria: Array<{ criterion: string; weight: number; automated: boolean; }>;
  estimatedComplexity: 'low' | 'medium' | 'high';
  requiresHumanReview: boolean;
  status: 'pending' | 'running' | 'reviewing' | 'completed' | 'failed' | 'adjusted';
}

export interface BlockExecution {
  blockId: string; startedAt: number; completedAt?: number; duration?: number;
  output: unknown;
  artifacts: Array<{ name: string; type: string; content: unknown; }>;
  hotReview?: { performedAt: number; driftScore: number; issues: string[]; passed: boolean; reviewer: 'automated' | 'human'; };
  adjustments?: Array<{ timestamp: number; reason: string; change: string; impact: 'low' | 'medium' | 'high'; }>;
  tokensUsed: number; cost: number; retries: number;
}

export interface AgileExecutionPlan {
  id: string; specId: string; mode: string; blocks: MicroBlock[]; totalBlocks: number;
  estimatedDuration: number; createdAt: number;
}

export interface AgileExecutionResult {
  planId: string; executionId: string; status: 'completed' | 'failed' | 'partial' | 'cancelled';
  blockExecutions: BlockExecution[];
  totalDuration: number; totalTokensUsed: number; totalCost: number;
  blocksCompleted: number; blocksFailed: number; blocksAdjusted: number;
  finalOutput: unknown;
  allArtifacts: Array<{ name: string; type: string; content: unknown; sourceBlockId: string; }>;
  startedAt: number; completedAt: number; driftEvents: number; humanReviews: number;
}
