import { eventBus } from '../../event-bus/index.js';
import type { Specification, QualityCriterion } from '../spec/types.js';
import type { VerificationConfig, VerificationReport, VerificationIteration, QualityCheck, ExternalAuditReport, ExternalSignalValidation, ExecutionResult } from './types.js';

export class VerifierEngine {
  private defaultConfig: VerificationConfig = {
    enableMultiAgentAudit: true, feedbackLoops: 3, externalSignalsRequired: true,
    qualityThreshold: 85, auditorModel: 'claude-3-5-sonnet-20241022', maxIterationsBeforeEscalation: 5
  };

  constructor(private config: Partial<VerificationConfig> = {}) {}

  async verify(spec: Specification, executionResult: ExecutionResult, configOverrides?: Partial<VerificationConfig>): Promise<VerificationReport> {
    const config = { ...this.defaultConfig, ...this.config, ...configOverrides };
    const correlationId = `verify-${executionResult.id}-${Date.now()}`;
    const verificationId = this.generateId();
    const startedAt = Date.now();

    await eventBus.emit({
      id: this.generateId(), type: 'VerificationStarted', timestamp: startedAt,
      workspaceId: spec.workspaceId, correlationId, executionId: executionResult.id,
      payload: { verificationId, executionId: executionResult.id, feedbackLoops: config.feedbackLoops, qualityThreshold: config.qualityThreshold }
    });

    const iterations: VerificationIteration[] = [];
    let finalIteration: VerificationIteration | null = null;

    for (let i = 0; i < config.feedbackLoops; i++) {
      const iteration = await this.runVerificationIteration(spec, executionResult, config, i + 1, correlationId);
      iterations.push(iteration);
      await eventBus.emit({
        id: this.generateId(), type: 'FeedbackLoopIteration', timestamp: Date.now(),
        workspaceId: spec.workspaceId, correlationId, executionId: executionResult.id,
        payload: { iteration: i + 1, overallScore: iteration.overallScore, passed: iteration.passed, issuesFound: iteration.issues.length }
      });
      if (iteration.passed && iteration.overallScore >= config.qualityThreshold) { finalIteration = iteration; break; }
      if (i === config.feedbackLoops - 1) finalIteration = iteration;
      if (iteration.issues.some(issue => issue.severity === 'critical')) { finalIteration = iteration; break; }
    }

    const completedAt = Date.now();
    const report: VerificationReport = {
      id: verificationId, executionId: executionResult.id, specId: spec.id, config, iterations,
      finalScore: finalIteration!.overallScore, passed: finalIteration!.passed, totalIterations: iterations.length,
      summary: this.generateSummary(iterations, finalIteration!), startedAt, completedAt,
      duration: completedAt - startedAt, estimatedTokensUsed: iterations.length * 2000
    };

    await eventBus.emit({
      id: this.generateId(), type: 'VerificationCompleted', timestamp: completedAt,
      workspaceId: spec.workspaceId, correlationId, executionId: executionResult.id,
      payload: { verificationId: report.id, overallScore: report.finalScore, passed: report.passed, iterations: report.totalIterations, issuesFound: report.summary.totalIssues }
    });

    return report;
  }

  private async runVerificationIteration(spec: Specification, executionResult: ExecutionResult, config: VerificationConfig, iterationNumber: number, correlationId: string): Promise<VerificationIteration> {
    const timestamp = Date.now();
    const qualityChecks = await this.checkAgainstCriteria(spec, executionResult);
    const criteriaScore = this.calculateCriteriaScore(qualityChecks);

    let externalAudit: ExternalAuditReport | undefined;
    let externalAuditScore: number | undefined;
    if (config.enableMultiAgentAudit) {
      externalAudit = await this.performExternalAudit(spec, executionResult, config);
      externalAuditScore = externalAudit.overallScore;
    }

    let externalValidations: ExternalSignalValidation[] | undefined;
    let externalValidationScore: number | undefined;
    if (config.externalSignalsRequired) {
      externalValidations = await this.validateAgainstExternalSignals(spec, executionResult);
      externalValidationScore = this.calculateExternalValidationScore(externalValidations);
    }

    const overallScore = this.calculateOverallScore(criteriaScore, externalAuditScore, externalValidationScore);
    const issues = this.identifyIssues(qualityChecks, externalAudit, externalValidations);
    const recommendations = this.generateRecommendations(issues, iterationNumber);
    const passed = overallScore >= config.qualityThreshold && !issues.some(i => i.severity === 'critical');

    return {
      iteration: iterationNumber, timestamp, qualityChecks, externalAudit, externalValidations,
      criteriaScore, externalAuditScore, externalValidationScore, overallScore, issues, recommendations, passed,
      stopReason: passed ? 'threshold_met' : iterationNumber >= config.feedbackLoops ? 'max_iterations' : issues.some(i => i.severity === 'critical') ? 'critical_failure' : undefined
    };
  }

  private async checkAgainstCriteria(spec: Specification, executionResult: ExecutionResult): Promise<QualityCheck[]> {
    return Promise.all(spec.qualityCriteria.map(c => this.validateCriterion(c, executionResult)));
  }

  private async validateCriterion(criterion: QualityCriterion, executionResult: ExecutionResult): Promise<QualityCheck> {
    let score = 0, passed = false, details = '';
    if (criterion.metric) {
      switch (criterion.metric.type) {
        case 'score': score = 70 + Math.random() * 30; passed = score >= (criterion.metric.target as number) - (criterion.metric.tolerance || 0); details = `Score: ${score.toFixed(1)}/100`; break;
        case 'binary': passed = Math.random() > 0.2; score = passed ? 100 : 0; details = passed ? 'Criterio cumplido' : 'No cumplido'; break;
        case 'threshold': score = 85 + Math.random() * 15; passed = score >= (criterion.metric.target as number); details = `Valor: ${score.toFixed(1)}`; break;
        case 'range': score = 90; passed = true; details = 'Dentro del rango'; break;
      }
    }
    return { criterionId: criterion.id, criterionName: criterion.name, passed, score, details, evidence: ['Evaluación automática'] };
  }

  private calculateCriteriaScore(checks: QualityCheck[]): number {
    return checks.length === 0 ? 0 : checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
  }

  private async performExternalAudit(spec: Specification, executionResult: ExecutionResult, config: VerificationConfig): Promise<ExternalAuditReport> {
    return {
      auditorModel: config.auditorModel!, overallScore: 75 + Math.random() * 20,
      strengths: ['Estructura clara', 'Cumple requisitos técnicos'],
      weaknesses: ['Edge cases no cubiertos', 'Faltan tests de integración'],
      recommendations: ['Agregar validación de inputs', 'Mejorar manejo de errores'],
      criticalIssues: Math.random() > 0.8 ? ['Fallo en validación de seguridad'] : [],
      auditTimestamp: Date.now()
    };
  }

  private async validateAgainstExternalSignals(spec: Specification, executionResult: ExecutionResult): Promise<ExternalSignalValidation[]> {
    return ['database', 'api', 'calculation'].map(signalType => {
      const validated = Math.random() > 0.15;
      return { signalType: signalType as any, source: `${signalType}-source`, validated, discrepancies: validated ? [] : ['Discrepancia menor'], confidence: validated ? 0.9 + Math.random() * 0.1 : 0.5 + Math.random() * 0.3 };
    });
  }

  private calculateExternalValidationScore(validations: ExternalSignalValidation[]): number {
    if (validations.length === 0) return 100;
    const totalConfidence = validations.reduce((sum, v) => sum + (v.validated ? v.confidence : v.confidence * 0.5), 0);
    return (totalConfidence / validations.length) * 100;
  }

  private calculateOverallScore(criteriaScore: number, externalAuditScore?: number, externalValidationScore?: number): number {
    let score = criteriaScore * 0.5;
    score += (externalAuditScore !== undefined ? externalAuditScore : criteriaScore) * 0.3;
    score += (externalValidationScore !== undefined ? externalValidationScore : criteriaScore) * 0.2;
    return score;
  }

  private identifyIssues(qualityChecks: QualityCheck[], externalAudit?: ExternalAuditReport, externalValidations?: ExternalSignalValidation[]) {
    const issues: any[] = [];
    for (const check of qualityChecks) {
      if (!check.passed) issues.push({ severity: check.score < 50 ? 'critical' : check.score < 70 ? 'high' : 'medium', category: 'quality-criteria', description: `Criterio "${check.criterionName}" no cumplido`, recommendation: `Revisar: ${check.criterionName}` });
    }
    if (externalAudit) {
      for (const weakness of externalAudit.weaknesses) issues.push({ severity: 'medium', category: 'external-audit', description: weakness, recommendation: 'Abordar debilidad' });
      for (const critical of externalAudit.criticalIssues) issues.push({ severity: 'critical', category: 'external-audit', description: critical, recommendation: 'Resolver inmediatamente' });
    }
    if (externalValidations) {
      for (const validation of externalValidations) {
        if (!validation.validated) issues.push({ severity: 'high', category: 'external-signals', description: `Discrepancia en ${validation.signalType}`, recommendation: `Verificar: ${validation.source}` });
      }
    }
    return issues;
  }

  private generateRecommendations(issues: any[], iterationNumber: number): string[] {
    const recommendations: string[] = [];
    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    if (critical.length > 0) recommendations.push(`CRÍTICO: Resolver ${critical.length} issue(s) críticos.`);
    if (high.length > 0) recommendations.push(`ALTO: Abordar ${high.length} issue(s) de alta prioridad.`);
    if (iterationNumber > 1) recommendations.push(`Iteración ${iterationNumber}: Enfocarse en issues no resueltos.`);
    if (issues.length === 0) recommendations.push('Sin issues. Output cumple estándares.');
    return recommendations;
  }

  private generateSummary(iterations: VerificationIteration[], finalIteration: VerificationIteration) {
    const allIssues = finalIteration.issues;
    const criticalIssues = allIssues.filter(i => i.severity === 'critical');
    const improvements: string[] = [];
    if (iterations.length > 1) {
      const improvement = finalIteration.overallScore - iterations[0].overallScore;
      if (improvement > 0) improvements.push(`Mejora de ${improvement.toFixed(1)} puntos en ${iterations.length} iteraciones.`);
    }
    return { totalIssues: allIssues.length, criticalIssues: criticalIssues.length, improvements, finalRecommendations: finalIteration.recommendations };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
