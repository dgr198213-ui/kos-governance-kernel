import type { Intent, Specification } from '../engines/spec/types.js';
import type { Environment } from '../engines/environment/types.js';
import type { VerificationReport, ExecutionResult } from '../engines/verification/types.js';

export type PipelineStage = 'intent' | 'specification' | 'environment' | 'planning' | 'policy-check' | 'context-resolution' | 'execution' | 'verification' | 'approval' | 'commit' | 'audit';

export interface PipelineConfig { enableHumanApproval: boolean; approvalThreshold: number; maxRetries: number; retryFromStage: PipelineStage; enableAudit: boolean; enableCommit: boolean; }

export interface PipelineContext {
  correlationId: string; workspaceId: string; executionId: string;
  currentStage: PipelineStage; completedStages: PipelineStage[];
  intent?: Intent; specification?: Specification; environment?: Environment;
  executionResult?: ExecutionResult; verificationReport?: VerificationReport;
  startedAt: number; lastUpdated: number; retryCount: number;
}

export interface PipelineResult {
  success: boolean; executionId: string; correlationId: string;
  executionResult?: ExecutionResult; verificationReport?: VerificationReport;
  totalDuration: number; stagesCompleted: PipelineStage[];
  failedAt?: PipelineStage; failureReason?: string;
  events: Array<{ stage: PipelineStage; timestamp: number; status: 'started' | 'completed' | 'failed'; duration?: number; }>;
}
