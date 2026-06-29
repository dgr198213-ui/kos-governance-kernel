import { eventBus } from '../../event-bus/index.js';
import type { InterviewConfig, InterviewQuestion, InterviewAnswer, InterviewTranscript, ExtractedKnowledge, InterviewResult } from './types.js';

export class InterviewEngine {
  private defaultConfig: InterviewConfig = { mode: 'reverse', maxRounds: 3, minQuestions: 5, maxQuestions: 15, ambiguityThreshold: 0.3 };
  constructor(private config: Partial<InterviewConfig> = {}) {}

  async conductInterview(workspaceId: string, userId: string, initialIntent: string, configOverrides?: Partial<InterviewConfig>): Promise<InterviewResult> {
    const config = { ...this.defaultConfig, ...this.config, ...configOverrides };
    const sessionId = `interview-${Date.now()}`;
    const correlationId = `interview-${sessionId}`;
    const transcript: InterviewTranscript[] = [];

    for (let round = 0; round < config.maxRounds; round++) {
      const questions = await this.generateQuestions(initialIntent, config, round + 1, transcript);
      for (const question of questions) {
        if (transcript.length >= config.maxQuestions) break;
        const answer = await this.simulateAnswer(question, initialIntent);
        transcript.push({ question, answer, extractedInsights: [`Insight from: ${question.category}`], timestamp: Date.now() });
        await eventBus.emit({
          id: this.generateId(), type: 'InterviewQuestionGenerated', timestamp: Date.now(),
          workspaceId, correlationId, executionId: sessionId,
          payload: { questionId: question.id, question: question.question, category: question.category, priority: question.priority }
        });
      }
      const ambiguityScore = this.calculateAmbiguity(transcript);
      if (ambiguityScore <= config.ambiguityThreshold && transcript.length >= config.minQuestions) break;
    }

    const extractedKnowledge = await this.extractKnowledge(initialIntent, transcript);
    return { transcript, extractedKnowledge, warnings: this.generateWarnings(extractedKnowledge), recommendations: ['Revisa el conocimiento extraído.'], completedAt: Date.now() };
  }

  private async generateQuestions(intent: string, config: InterviewConfig, round: number, previousTranscript: any[]): Promise<InterviewQuestion[]> {
    const questions: InterviewQuestion[] = [];
    if (round === 1) {
      questions.push({ id: this.generateId(), round: 1, category: 'objective', question: '¿Cuál es el objetivo de negocio real?', rationale: 'Diferenciar tarea de objetivo', priority: 1, expectedAnswerType: 'text' });
      questions.push({ id: this.generateId(), round: 1, category: 'constraint', question: 'Identifica las tres restricciones implícitas críticas.', rationale: 'Extraer conocimiento tácito', priority: 2, expectedAnswerType: 'list' });
    }
    if (round === 2) {
      questions.push({ id: this.generateId(), round: 2, category: 'context', question: '¿Qué sistemas deben integrarse?', rationale: 'Identificar dependencias', priority: 3, expectedAnswerType: 'list' });
      questions.push({ id: this.generateId(), round: 2, category: 'validation', question: '¿En qué puntos necesitas validar?', rationale: 'Establecer checkpoints', priority: 1, expectedAnswerType: 'text' });
    }
    return questions.slice(0, config.maxQuestions - previousTranscript.length);
  }

  private async simulateAnswer(question: InterviewQuestion, intent: string): Promise<InterviewAnswer> {
    const answers: Record<string, any> = {
      'objective': `El objetivo real es automatizar "${intent}" para reducir tiempo en 60%.`,
      'constraint': ['Debe cumplir con GDPR', 'Integración con legacy', 'Presupuesto limitado'],
      'context': ['Base de datos PostgreSQL', 'API REST de terceros'],
      'validation': 'Necesito validar la arquitectura antes de implementar.'
    };
    return { questionId: question.id, answer: answers[question.category] || 'Respuesta simulada', confidence: 0.85, followUpNeeded: false, timestamp: Date.now() };
  }

  private async extractKnowledge(intent: string, transcript: InterviewTranscript[]): Promise<ExtractedKnowledge> {
    return {
      realObjective: intent, superficialTask: intent, businessValue: 'Automatización',
      implicitConstraints: [{ constraint: 'Cumplir estándares', source: 'inferred', criticality: 'high', validated: true }],
      businessContext: { stakeholder: 'No especificado', successMetrics: [], riskFactors: [], dependencies: [], timeline: 'No especificado' },
      technicalContext: { integrations: [], dataSources: [], performanceRequirements: {}, securityRequirements: [] },
      validationPoints: [{ milestone: 'Aprobación de arquitectura', approver: 'human', condition: 'Validación explícita' }],
      interviewRounds: Math.max(...transcript.map(t => t.question.round), 1),
      questionsAsked: transcript.length, ambiguityScore: this.calculateAmbiguity(transcript), extractedAt: Date.now()
    };
  }

  private calculateAmbiguity(transcript: InterviewTranscript[]): number {
    if (transcript.length === 0) return 1;
    const avgConfidence = transcript.reduce((sum, t) => sum + t.answer.confidence, 0) / transcript.length;
    return Math.min((1 - avgConfidence) * 0.4 + (transcript.length < 5 ? 0.3 : 0), 1);
  }

  private generateWarnings(knowledge: ExtractedKnowledge): string[] {
    const warnings: string[] = [];
    if (knowledge.ambiguityScore > 0.5) warnings.push('Alto nivel de ambigüedad.');
    if (knowledge.implicitConstraints.length === 0) warnings.push('No se identificaron restricciones.');
    return warnings;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
