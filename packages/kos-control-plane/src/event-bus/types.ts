export type KOSEventType =
  | 'IntentReceived' | 'SpecificationStarted' | 'SpecificationCompleted'
  | 'EnvironmentLoading' | 'EnvironmentLoaded'
  | 'PlanningStarted' | 'PlanningCompleted'
  | 'ExecutionStarted' | 'ExecutionCompleted' | 'ExecutionFailed'
  | 'MicroTaskStarted' | 'MicroTaskCompleted'
  | 'VerificationStarted' | 'VerificationCompleted'
  | 'HumanApprovalRequested' | 'CommitStarted' | 'CommitCompleted'
  | 'AuditLogged' | 'InterviewQuestionGenerated' | 'InterviewAnswerReceived'
  | 'QualityCriteriaChecked' | 'ExternalAuditStarted' | 'ExternalAuditCompleted'
  | 'ExternalSignalsValidated' | 'FeedbackLoopIteration'
  | 'PolicyBlocked' | 'SkillInvoked';

export interface KOSBaseEvent {
  id: string;
  type: KOSEventType;
  timestamp: number;
  workspaceId: string;
  correlationId: string;
  executionId: string;
  payload: Record<string, unknown>;
  metadata?: {
    duration?: number;
    retryCount?: number;
    model?: string;
    tokensUsed?: number;
    cost?: number;
  };
}

export type EventHandler<T extends KOSBaseEvent = KOSBaseEvent> = (event: T) => void | Promise<void>;

export interface EventSubscription {
  unsubscribe: () => void;
}
