export interface InterviewConfig { mode: 'reverse' | 'guided' | 'diagnostic'; maxRounds: number; minQuestions: number; maxQuestions: number; ambiguityThreshold: number; }
export interface InterviewQuestion { id: string; round: number; category: 'objective' | 'constraint' | 'context' | 'validation'; question: string; rationale: string; priority: number; expectedAnswerType: 'text' | 'boolean' | 'list' | 'number'; }
export interface InterviewAnswer { questionId: string; answer: string | boolean | string[] | number; confidence: number; followUpNeeded: boolean; timestamp: number; }
export interface InterviewTranscript { question: InterviewQuestion; answer: InterviewAnswer; extractedInsights: string[]; timestamp: number; }
export interface ExtractedKnowledge {
  realObjective: string; superficialTask: string; businessValue: string;
  implicitConstraints: Array<{ constraint: string; source: 'interview' | 'inferred' | 'explicit'; criticality: 'high' | 'medium' | 'low'; validated: boolean; }>;
  businessContext: { stakeholder: string; successMetrics: string[]; riskFactors: string[]; dependencies: string[]; timeline: string; };
  technicalContext: { integrations: string[]; dataSources: string[]; performanceRequirements: Record<string, string>; securityRequirements: string[]; };
  validationPoints: Array<{ milestone: string; approver: 'human' | 'automated'; condition: string; }>;
  interviewRounds: number; questionsAsked: number; ambiguityScore: number; extractedAt: number;
}
export interface InterviewResult { transcript: InterviewTranscript[]; extractedKnowledge: ExtractedKnowledge; warnings: string[]; recommendations: string[]; completedAt: number; }
