export * from './spec/index.js';
export * from './environment/index.js';
export * from './verification/index.js';
export * from './agile-executor/index.js';
export * from './identity/index.js';
export * from './audit/index.js';
export * from './governance/index.js';

// El módulo interview define sus propios InterviewQuestion/InterviewAnswer,
// que colisionan con los de spec. Se re-exportan con alias para evitar TS2308.
export { InterviewEngine } from './interview/index.js';
export type {
  InterviewQuestion as EngineInterviewQuestion,
  InterviewAnswer as EngineInterviewAnswer,
  InterviewConfig,
  InterviewTranscript,
  InterviewResult,
  ExtractedKnowledge,
} from './interview/types.js';
