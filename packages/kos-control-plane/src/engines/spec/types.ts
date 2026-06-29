export type InterviewMode = 'reverse' | 'guided' | 'direct';
export type ExecutionStyle = 'agile' | 'waterfall';
export type ContextExtractionDepth = 'shallow' | 'deep' | 'exhaustive';

export interface SpecConfig {
  interviewMode: InterviewMode;
  executionStyle: ExecutionStyle;
  validationCheckpoints: boolean;
  contextExtractionDepth: ContextExtractionDepth;
  maxInterviewRounds?: number;
  ambiguityThreshold?: number;
}

export interface Intent {
  id: string;
  workspaceId: string;
  userId: string;
  rawInput: string;
  source: 'chat' | 'webhook' | 'cron' | 'api' | 'manual';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'objective' | 'constraint' | 'context' | 'validation';
  priority: number;
  rationale: string;
  expectedAnswerType: 'text' | 'boolean' | 'list' | 'number';
}

export interface InterviewAnswer {
  questionId: string;
  answer: string | boolean | string[] | number;
  confidence?: number;
  followUpNeeded?: boolean;
}

export interface ExtractedContext {
  implicitConstraints: Array<{ constraint: string; source: 'interview' | 'inferred' | 'explicit'; criticality: 'high' | 'medium' | 'low'; }>;
  businessContext: { stakeholder?: string; businessGoal?: string; successMetrics?: string[]; riskFactors?: string[]; };
  technicalContext: { dependencies?: string[]; integrations?: string[]; performanceRequirements?: Record<string, string>; };
  extractedAt: number;
}

export interface QualityCriterion {
  id: string;
  name: string;
  description: string;
  measurable: boolean;
  metric?: { type: 'threshold' | 'range' | 'binary' | 'score'; target: number | string | boolean; tolerance?: number; };
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  verificationMethod: 'automated' | 'human-review' | 'external-signal';
}

export interface MicroTask {
  id: string;
  index: number;
  title: string;
  description: string;
  dependencies: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  requiresHotReview: boolean;
  validationGate?: { condition: string; approver: 'automated' | 'human'; };
  expectedOutput: string;
}

export interface ExecutionPlan {
  microTasks: MicroTask[];
  totalEstimatedTime: number;
  criticalPath: string[];
  parallelizable: string[][];
}

export interface Specification {
  id: string;
  intentId: string;
  workspaceId: string;
  realObjective: string;
  superficialTask: string;
  extractedContext: ExtractedContext;
  executionPlan: ExecutionPlan;
  qualityCriteria: QualityCriterion[];
  validationCheckpoints: Array<{ taskIndex: number; condition: string; approver: 'automated' | 'human'; }>;
  interviewRounds: number;
  questionsAsked: number;
  ambiguityScore: number;
  createdAt: number;
  version: number;
}

export interface SpecGenerationResult {
  specification: Specification;
  interviewTranscript: Array<{ question: InterviewQuestion; answer: InterviewAnswer; timestamp: number; }>;
  warnings: string[];
  recommendations: string[];
}
