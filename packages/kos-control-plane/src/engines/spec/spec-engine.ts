import { eventBus } from '../../event-bus/index.js';
import { parseJsonLoose } from '../../llm/llm-client.js';
import type { LLMClient } from '../../llm/llm-client.js';
import type { Intent, SpecConfig, Specification, InterviewQuestion, InterviewAnswer, ExtractedContext, QualityCriterion, ExecutionPlan, MicroTask, SpecGenerationResult } from './types.js';

export class SpecEngine {
  private defaultConfig: SpecConfig = {
    interviewMode: 'reverse',
    executionStyle: 'agile',
    validationCheckpoints: true,
    contextExtractionDepth: 'deep',
    maxInterviewRounds: 3,
    ambiguityThreshold: 0.3
  };

  constructor(private config: Partial<SpecConfig> = {}, private llm?: LLMClient) {}

  async generateSpec(intent: Intent, context?: { knowledge?: Array<{ title: string; category: string; content: string }> }, configOverrides?: Partial<SpecConfig>): Promise<SpecGenerationResult> {
    const config = { ...this.defaultConfig, ...this.config, ...configOverrides };
    const correlationId = `spec-${intent.id}-${Date.now()}`;

    await eventBus.emit({
      id: this.generateId(), type: 'SpecificationStarted', timestamp: Date.now(),
      workspaceId: intent.workspaceId, correlationId, executionId: intent.id,
      payload: { intentId: intent.id, interviewMode: config.interviewMode }
    });

    const interviewTranscript: Array<{ question: InterviewQuestion; answer: InterviewAnswer; timestamp: number; }> = [];
    const extractedContext = await this.conductInterview(intent, config, interviewTranscript, correlationId);

    let realObjective: string;
    let superficialTask: string;
    let qualityCriteria: QualityCriterion[];
    let executionPlan: ExecutionPlan;
    const specWarnings: string[] = [];

    if (this.llm) {
      try {
        const generated = await this.generateSpecWithLLM(intent, context?.knowledge ?? []);
        realObjective = generated.realObjective;
        superficialTask = generated.superficialTask;
        qualityCriteria = generated.qualityCriteria;
        executionPlan = generated.executionPlan;
      } catch (error) {
        specWarnings.push(`El planner LLM falló (${error instanceof Error ? error.message : 'error desconocido'}); se usó el plan heurístico de respaldo.`);
        ({ realObjective, superficialTask } = await this.identifyRealObjective(intent, extractedContext));
        qualityCriteria = await this.defineQualityCriteria(realObjective, extractedContext);
        executionPlan = await this.createExecutionPlan(realObjective, config);
      }
    } else {
      ({ realObjective, superficialTask } = await this.identifyRealObjective(intent, extractedContext));
      qualityCriteria = await this.defineQualityCriteria(realObjective, extractedContext);
      executionPlan = await this.createExecutionPlan(realObjective, config);
    }
    const validationCheckpoints = config.validationCheckpoints ? await this.defineValidationCheckpoints(executionPlan) : [];
    const ambiguityScore = this.calculateAmbiguityScore(extractedContext, interviewTranscript);

    const specification: Specification = {
      id: this.generateId(), intentId: intent.id, workspaceId: intent.workspaceId,
      realObjective, superficialTask, extractedContext, executionPlan, qualityCriteria,
      validationCheckpoints, interviewRounds: Math.ceil(interviewTranscript.length / 5),
      questionsAsked: interviewTranscript.length, ambiguityScore, createdAt: Date.now(), version: 1
    };

    await eventBus.emit({
      id: this.generateId(), type: 'SpecificationCompleted', timestamp: Date.now(),
      workspaceId: intent.workspaceId, correlationId, executionId: intent.id,
      payload: { specId: specification.id, intentId: intent.id, realObjective: specification.realObjective, qualityCriteriaCount: qualityCriteria.length, executionPlanSteps: executionPlan.microTasks.length }
    });

    return { specification, interviewTranscript, warnings: [...specWarnings, ...this.generateWarnings(specification)], recommendations: this.generateRecommendations(specification) };
  }

  private async conductInterview(intent: Intent, config: SpecConfig, transcript: any[], correlationId: string): Promise<ExtractedContext> {
    const questions = await this.generateDiagnosticQuestions(intent, config);
    const answers: InterviewAnswer[] = [];
    for (const question of questions) {
      await eventBus.emit({
        id: this.generateId(), type: 'InterviewQuestionGenerated', timestamp: Date.now(),
        workspaceId: intent.workspaceId, correlationId, executionId: intent.id,
        payload: { questionId: question.id, question: question.question, category: question.category, priority: question.priority }
      });
      const answer = await this.simulateUserAnswer(question, intent);
      answers.push(answer);
      transcript.push({ question, answer, timestamp: Date.now() });
      await eventBus.emit({
        id: this.generateId(), type: 'InterviewAnswerReceived', timestamp: Date.now(),
        workspaceId: intent.workspaceId, correlationId, executionId: intent.id,
        payload: { questionId: question.id, answerProvided: true, followUpNeeded: answer.followUpNeeded ?? false }
      });
    }
    return this.buildExtractedContext(intent, questions, answers);
  }

  private async generateDiagnosticQuestions(intent: Intent, config: SpecConfig): Promise<InterviewQuestion[]> {
    return [
      { id: this.generateId(), question: '¿Cuál es el objetivo de negocio real detrás de esta tarea?', category: 'objective', priority: 1, rationale: 'Diferenciar tarea de objetivo real', expectedAnswerType: 'text' },
      { id: this.generateId(), question: '¿Quién es el stakeholder principal?', category: 'objective', priority: 1, rationale: 'Identificar criterios de éxito', expectedAnswerType: 'text' },
      { id: this.generateId(), question: 'Identifica las tres restricciones implícitas críticas.', category: 'constraint', priority: 2, rationale: 'Extraer conocimiento tácito', expectedAnswerType: 'list' },
      { id: this.generateId(), question: '¿Existen límites de presupuesto, tiempo o recursos?', category: 'constraint', priority: 2, rationale: 'Establecer boundaries', expectedAnswerType: 'text' },
      { id: this.generateId(), question: '¿En qué puntos necesitas validar antes de continuar?', category: 'validation', priority: 1, rationale: 'Establecer checkpoints', expectedAnswerType: 'text' }
    ];
  }

  private async simulateUserAnswer(question: InterviewQuestion, intent: Intent): Promise<InterviewAnswer> {
    return { questionId: question.id, answer: `Respuesta simulada para: ${question.question}`, confidence: 0.85, followUpNeeded: false };
  }

  private buildExtractedContext(intent: Intent, questions: InterviewQuestion[], answers: InterviewAnswer[]): ExtractedContext {
    return {
      implicitConstraints: [{ constraint: 'Cumplir con estándares de calidad', source: 'inferred', criticality: 'high' }],
      businessContext: { businessGoal: intent.rawInput, stakeholder: 'No especificado' },
      technicalContext: { integrations: [] },
      extractedAt: Date.now()
    };
  }

  private async identifyRealObjective(intent: Intent, context: ExtractedContext) {
    return { realObjective: context.businessContext.businessGoal || intent.rawInput, superficialTask: intent.rawInput };
  }

  private async defineQualityCriteria(realObjective: string, context: ExtractedContext): Promise<QualityCriterion[]> {
    return [
      { id: this.generateId(), name: 'Alineación con objetivo', description: 'Output debe abordar el objetivo', measurable: true, metric: { type: 'score', target: 90, tolerance: 5 }, priority: 'must-have', verificationMethod: 'human-review' },
      { id: this.generateId(), name: 'Cumplimiento de restricciones', description: 'Todas las restricciones respetadas', measurable: true, metric: { type: 'binary', target: true }, priority: 'must-have', verificationMethod: 'automated' },
      { id: this.generateId(), name: 'Calidad técnica', description: 'Estándares de la industria', measurable: true, metric: { type: 'score', target: 85, tolerance: 10 }, priority: 'should-have', verificationMethod: 'automated' }
    ];
  }

  private async createExecutionPlan(realObjective: string, config: SpecConfig): Promise<ExecutionPlan> {
    const microTasks: MicroTask[] = [
      { id: this.generateId(), index: 0, title: 'Análisis y diseño', description: 'Analizar requisitos', dependencies: [], estimatedComplexity: 'medium', requiresHotReview: true, validationGate: { condition: 'Aprobación de arquitectura', approver: 'human' }, expectedOutput: 'Documento de diseño' },
      { id: this.generateId(), index: 1, title: 'Implementación', description: 'Desarrollar funcionalidad', dependencies: ['task-0'], estimatedComplexity: 'high', requiresHotReview: true, validationGate: { condition: 'Tests pasando', approver: 'automated' }, expectedOutput: 'Código funcional' },
      { id: this.generateId(), index: 2, title: 'Integración', description: 'Integrar con sistemas', dependencies: ['task-1'], estimatedComplexity: 'medium', requiresHotReview: true, validationGate: { condition: 'Integraciones funcionando', approver: 'human' }, expectedOutput: 'Sistema integrado' },
      { id: this.generateId(), index: 3, title: 'Despliegue', description: 'Desplegar en producción', dependencies: ['task-2'], estimatedComplexity: 'low', requiresHotReview: true, validationGate: { condition: 'Aprobación final', approver: 'human' }, expectedOutput: 'Sistema en producción' }
    ];
    return {
      microTasks,
      totalEstimatedTime: microTasks.reduce((sum, t) => sum + (t.estimatedComplexity === 'low' ? 30 : t.estimatedComplexity === 'medium' ? 60 : 120), 0),
      criticalPath: microTasks.map(t => t.id),
      parallelizable: []
    };
  }

  private async defineValidationCheckpoints(plan: ExecutionPlan) {
    return plan.microTasks.filter(t => t.validationGate).map(t => ({ taskIndex: t.index, condition: t.validationGate!.condition, approver: t.validationGate!.approver }));
  }

  private calculateAmbiguityScore(context: ExtractedContext, transcript: any[]): number {
    let score = 0;
    if (!context.businessContext.businessGoal) score += 0.3;
    if (context.implicitConstraints.length < 3) score += 0.2;
    const avgConfidence = transcript.reduce((sum, t) => sum + (t.answer.confidence || 0.5), 0) / transcript.length;
    score += (1 - avgConfidence) * 0.3;
    return Math.min(score, 1);
  }

  private generateWarnings(spec: Specification): string[] {
    const warnings: string[] = [];
    if (spec.ambiguityScore > 0.5) warnings.push('Alto nivel de ambigüedad detectado.');
    if (spec.qualityCriteria.filter(c => c.priority === 'must-have').length === 0) warnings.push('No hay criterios must-have.');
    return warnings;
  }

  private generateRecommendations(spec: Specification): string[] {
    return ['Revisa la especificación con stakeholders antes de ejecutar.', 'Documenta las integraciones externas.'];
  }

  private async generateSpecWithLLM(intent: Intent, knowledge: Array<{ title: string; category: string; content: string }>): Promise<{ realObjective: string; superficialTask: string; qualityCriteria: QualityCriterion[]; executionPlan: ExecutionPlan; }> {
    const system = [
      'Eres el Spec Engine del kernel de gobernanza KOS.',
      'Transformas la intención de un usuario en una especificación ejecutable.',
      'Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni fences, con esta forma exacta:',
      '{',
      '  "realObjective": "objetivo de negocio real, una frase",',
      '  "superficialTask": "la tarea tal y como la pidió el usuario",',
      '  "qualityCriteria": [ { "name": "...", "description": "...", "priority": "must-have|should-have|nice-to-have" } ],  // 2 a 5 criterios',
      '  "microTasks": [ { "title": "...", "description": "...", "expectedOutput": "...", "estimatedComplexity": "low|medium|high", "requiresHotReview": true|false } ]  // 2 a 6 tareas secuenciales y concretas',
      '}',
    ].join('\n');

    const completion = await this.llm!.complete(
      [
        { role: 'system', content: system },
        { role: 'user', content: [
        `Intención del usuario: ${intent.rawInput}`,
        knowledge.length > 0
          ? `\nDocumentación del workspace (úsala para adaptar el plan a los métodos de trabajo de esta organización):\n${knowledge.map(k => `### ${k.title} [${k.category}]\n${k.content.slice(0, 1200)}`).join('\n\n')}`
          : '',
      ].filter(Boolean).join('\n') },
      ],
      { temperature: 0.2, maxTokens: 1500 }
    );

    const parsed = parseJsonLoose<{
      realObjective?: string;
      superficialTask?: string;
      qualityCriteria?: Array<{ name?: string; description?: string; priority?: string }>;
      microTasks?: Array<{ title?: string; description?: string; expectedOutput?: string; estimatedComplexity?: string; requiresHotReview?: boolean }>;
    }>(completion.content);

    const rawTasks = (parsed.microTasks ?? []).filter(t => t.title).slice(0, 8);
    if (rawTasks.length < 1) throw new Error('El modelo no devolvió micro-tareas válidas');

    const validPriorities = new Set(['must-have', 'should-have', 'nice-to-have']);
    const validComplexities = new Set(['low', 'medium', 'high']);

    const qualityCriteria: QualityCriterion[] = (parsed.qualityCriteria ?? [])
      .filter(c => c.name)
      .slice(0, 6)
      .map(c => ({
        id: this.generateId(),
        name: c.name!,
        description: c.description ?? c.name!,
        measurable: true,
        metric: { type: 'score', target: 85, tolerance: 10 },
        priority: (validPriorities.has(c.priority ?? '') ? c.priority : 'should-have') as QualityCriterion['priority'],
        verificationMethod: 'automated',
      }));
    if (qualityCriteria.length === 0) {
      qualityCriteria.push({ id: this.generateId(), name: 'Alineación con objetivo', description: 'El output debe abordar el objetivo real', measurable: true, metric: { type: 'score', target: 85, tolerance: 10 }, priority: 'must-have', verificationMethod: 'automated' });
    }

    const microTasks: MicroTask[] = rawTasks.map((t, index) => ({
      id: this.generateId(),
      index,
      title: t.title!,
      description: t.description ?? t.title!,
      dependencies: index === 0 ? [] : [`task-${index - 1}`],
      estimatedComplexity: (validComplexities.has(t.estimatedComplexity ?? '') ? t.estimatedComplexity : 'medium') as MicroTask['estimatedComplexity'],
      requiresHotReview: t.requiresHotReview ?? false,
      expectedOutput: t.expectedOutput ?? 'Entregable de la tarea',
    }));

    return {
      realObjective: parsed.realObjective ?? intent.rawInput,
      superficialTask: parsed.superficialTask ?? intent.rawInput,
      qualityCriteria,
      executionPlan: {
        microTasks,
        totalEstimatedTime: microTasks.reduce((sum, t) => sum + (t.estimatedComplexity === 'low' ? 30 : t.estimatedComplexity === 'medium' ? 60 : 120), 0),
        criticalPath: microTasks.map(t => t.id),
        parallelizable: [],
      },
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
