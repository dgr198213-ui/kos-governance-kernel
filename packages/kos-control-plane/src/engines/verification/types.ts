export interface VerificationConfig {
  enableMultiAgentAudit: boolean;
  feedbackLoops: number;
  externalSignalsRequired: boolean;
  qualityThreshold: number;
  auditorModel?: string;
  maxIterationsBeforeEscalation?: number;
}

export interface QualityCheck {
  criterionId: string;
  criterionName: string;
  passed: boolean;
  score: number;
  details: string;
  evidence?: string[];
}

export interface ExternalAuditReport {
  auditorModel: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  criticalIssues: string[];
  auditTimestamp: number;
}

export interface ExternalSignalValidation {
  signalType: 'database' | 'api' | 'document' | 'calculation';
  source: string;
  validated: boolean;
  discrepancies: string[];
  confidence: number;
}

export interface VerificationIteration {
  iteration: number;
  timestamp: number;
  qualityChecks: QualityCheck[];
  externalAudit?: ExternalAuditReport;
  externalValidations?: ExternalSignalValidation[];
  criteriaScore: number;
  externalAuditScore?: number;
  externalValidationScore?: number;
  overallScore: number;
  issues: Array<{ severity: 'critical' | 'high' | 'medium' | 'low'; category: string; description: string; recommendation: string; }>;
  recommendations: string[];
  passed: boolean;
  stopReason?: 'threshold_met' | 'max_iterations' | 'critical_failure';
}

export interface VerificationReport {
  id: string;
  executionId: string;
  specId: string;
  config: VerificationConfig;
  iterations: VerificationIteration[];
  finalScore: number;
  passed: boolean;
  totalIterations: number;
  summary: { totalIssues: number; criticalIssues: number; improvements: string[]; finalRecommendations: string[]; };
  startedAt: number;
  completedAt: number;
  duration: number;
  estimatedTokensUsed: number;
}

export interface ExecutionResult {
  id: string;
  specId: string;
  workspaceId: string;
  artifacts: Array<{ id: string; type: 'code' | 'document' | 'data' | 'config'; name: string; content: unknown; metadata?: Record<string, unknown>; }>;
  executionLog: Array<{ timestamp: number; taskId: string; action: string; result: 'success' | 'failure' | 'warning'; details?: string; }>;
  metrics: { totalDuration: number; tokensUsed: number; cost: number; microTasksCompleted: number; checkpointsPassed: number; };
  completedAt: number;
}
