import { eventBus } from '../event-bus/index.js';
import { SpecEngine } from '../engines/spec/index.js';
import { EnvironmentEngine } from '../engines/environment/index.js';
import { VerifierEngine } from '../engines/verification/index.js';
import type { Intent } from '../engines/spec/types.js';
import type { PipelineConfig, PipelineContext, PipelineResult, PipelineStage } from './types.js';
import type { ExecutionResult } from '../engines/verification/types.js';
import { SimulatedTaskExecutor } from './task-executor.js';
import { GovernancePolicyEngine } from '../engines/governance/governance-engine.js';
import type { GovernanceDecision } from '../engines/governance/governance-engine.js';
import type { TaskExecutor } from './task-executor.js';

export type ApprovalHandler = (request: {
  workspaceId: string;
  executionId: string;
  reasons: string[];
  verificationScore?: number;
}) => Promise<boolean>;

export class KOSPipeline {
  private specEngine: SpecEngine;
  private environmentEngine: EnvironmentEngine;
  private verifierEngine: VerifierEngine;
  private taskExecutor: TaskExecutor;
  private governanceEngine = new GovernancePolicyEngine();
  private approvalHandler?: ApprovalHandler;
  private defaultConfig: PipelineConfig = { enableHumanApproval: true, approvalThreshold: 90, maxRetries: 2, retryFromStage: 'planning', enableAudit: true, enableCommit: true };

  constructor(config: Partial<PipelineConfig> = {}, engines?: { spec?: SpecEngine; environment?: EnvironmentEngine; verifier?: VerifierEngine; executor?: TaskExecutor; approvalHandler?: ApprovalHandler; }) {
    this.specEngine = engines?.spec ?? new SpecEngine();
    this.environmentEngine = engines?.environment ?? new EnvironmentEngine();
    this.verifierEngine = engines?.verifier ?? new VerifierEngine();
    this.taskExecutor = engines?.executor ?? new SimulatedTaskExecutor();
    this.approvalHandler = engines?.approvalHandler;
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  async execute(intent: Intent, configOverrides?: Partial<PipelineConfig>): Promise<PipelineResult> {
    const config = { ...this.defaultConfig, ...configOverrides };
    const correlationId = `pipeline-${intent.id}-${Date.now()}`;
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const context: PipelineContext = { correlationId, workspaceId: intent.workspaceId, executionId, currentStage: 'intent', completedStages: [], intent, startedAt: Date.now(), lastUpdated: Date.now(), retryCount: 0 };
    const events: PipelineResult['events'] = [];

    try {
      // Stage 1: Intent
      await eventBus.emit({ id: this.generateId(), type: 'IntentReceived', timestamp: Date.now(), workspaceId: intent.workspaceId, correlationId, executionId, payload: { intentId: intent.id, userId: intent.userId, rawInput: intent.rawInput, source: intent.source } });
      events.push({ stage: 'intent', timestamp: Date.now(), status: 'completed' });
      context.completedStages.push('intent');

      // Stage 2: Specification
      const specStartTime = Date.now();
      context.currentStage = 'specification';
      const specResult = await this.specEngine.generateSpec(intent);
      context.specification = specResult.specification;
      events.push({ stage: 'specification', timestamp: Date.now(), status: 'completed', duration: Date.now() - specStartTime });
      context.completedStages.push('specification');

      // Stage 3: Environment
      const envStartTime = Date.now();
      context.currentStage = 'environment';
      const envResult = await this.environmentEngine.loadEnvironment(intent.workspaceId);
      context.environment = envResult.environment;
      events.push({ stage: 'environment', timestamp: Date.now(), status: 'completed', duration: Date.now() - envStartTime });
      context.completedStages.push('environment');

      // Stage 4: Planning
      context.currentStage = 'planning';
      await eventBus.emit({ id: this.generateId(), type: 'PlanningCompleted', timestamp: Date.now(), workspaceId: intent.workspaceId, correlationId, executionId, payload: { planId: 'plan-1', totalTasks: specResult.specification.executionPlan.microTasks.length } });
      events.push({ stage: 'planning', timestamp: Date.now(), status: 'completed' });
      context.completedStages.push('planning');

      // Stage 5: Policy Check — evaluación real contra la Matriz de Gobernanza
      context.currentStage = 'policy-check';
      const governanceDecision = this.governanceEngine.evaluate(
        context.environment!.governanceMatrix,
        [
          { label: 'intención', text: intent.rawInput },
          ...context.specification!.executionPlan.microTasks.map(t => ({
            label: `micro-tarea ${t.index}: ${t.title}`,
            text: `${t.title} ${t.description} ${t.expectedOutput}`,
          })),
        ]
      );
      (context as PipelineContext & { governanceDecision?: GovernanceDecision }).governanceDecision = governanceDecision;

      if (governanceDecision.verdict === 'block') {
        const violations = governanceDecision.blocks
          .map(b => `[${b.severity}] "${b.rule}" (${b.rationale}) — detectado en ${b.matchedIn}`)
          .join('; ');
        await eventBus.emit({ id: this.generateId(), type: 'PolicyBlocked', timestamp: Date.now(), workspaceId: intent.workspaceId, correlationId, executionId, payload: { verdict: 'block', violations: governanceDecision.blocks } });
        events.push({ stage: 'policy-check', timestamp: Date.now(), status: 'failed' });
        throw new Error(`Bloqueado por la Matriz de Gobernanza (NUNCA): ${violations}`);
      }
      events.push({ stage: 'policy-check', timestamp: Date.now(), status: 'completed' });
      context.completedStages.push('policy-check');

      // Stage 6: Context Resolution
      context.currentStage = 'context-resolution';
      events.push({ stage: 'context-resolution', timestamp: Date.now(), status: 'completed' });
      context.completedStages.push('context-resolution');

      // Stage 7: Execution
      const execStartTime = Date.now();
      context.currentStage = 'execution';
      const executionResult = await this.executePlan(context);
      context.executionResult = executionResult;
      events.push({ stage: 'execution', timestamp: Date.now(), status: 'completed', duration: Date.now() - execStartTime });
      context.completedStages.push('execution');

      // Stage 8: Verification
      const verifyStartTime = Date.now();
      context.currentStage = 'verification';
      const verificationReport = await this.verifierEngine.verify(context.specification!, context.executionResult!);
      context.verificationReport = verificationReport;
      events.push({ stage: 'verification', timestamp: Date.now(), status: 'completed', duration: Date.now() - verifyStartTime });
      context.completedStages.push('verification');

      // Stage 9: Approval — humano en el bucle cuando la gobernanza o la calidad lo exigen
      if (config.enableHumanApproval) {
        context.currentStage = 'approval';
        const decision = (context as PipelineContext & { governanceDecision?: GovernanceDecision }).governanceDecision;
        const consultReasons = (decision?.approvals ?? []).map(a => `Regla PREGUNTAR "${a.rule}" (${a.rationale}) — detectado en ${a.matchedIn}`);
        const scoreBelowThreshold = context.verificationReport!.finalScore < config.approvalThreshold;
        if (scoreBelowThreshold) {
          consultReasons.push(`Puntuación de verificación ${context.verificationReport!.finalScore.toFixed(1)} por debajo del umbral de aprobación ${config.approvalThreshold}`);
        }

        if (consultReasons.length > 0) {
          await eventBus.emit({ id: this.generateId(), type: 'HumanApprovalRequested', timestamp: Date.now(), workspaceId: intent.workspaceId, correlationId, executionId, payload: { reasons: consultReasons, verificationScore: context.verificationReport!.finalScore } });

          if (!this.approvalHandler) {
            // Fail-safe deny: sin mecanismo de aprobación, no se avanza.
            events.push({ stage: 'approval', timestamp: Date.now(), status: 'failed' });
            throw new Error(`Aprobación humana requerida y no hay approvalHandler configurado: ${consultReasons.join('; ')}`);
          }

          const approved = await this.approvalHandler({ workspaceId: intent.workspaceId, executionId, reasons: consultReasons, verificationScore: context.verificationReport!.finalScore });
          if (!approved) {
            events.push({ stage: 'approval', timestamp: Date.now(), status: 'failed' });
            throw new Error(`Aprobación humana denegada: ${consultReasons.join('; ')}`);
          }
        }
        events.push({ stage: 'approval', timestamp: Date.now(), status: 'completed' });
        context.completedStages.push('approval');
      }

      // Stage 10: Commit
      if (config.enableCommit) {
        context.currentStage = 'commit';
        await eventBus.emit({ id: this.generateId(), type: 'CommitCompleted', timestamp: Date.now(), workspaceId: intent.workspaceId, correlationId, executionId, payload: { executionId } });
        events.push({ stage: 'commit', timestamp: Date.now(), status: 'completed' });
        context.completedStages.push('commit');
      }

      // Stage 11: Audit
      if (config.enableAudit) {
        context.currentStage = 'audit';
        await eventBus.emit({ id: this.generateId(), type: 'AuditLogged', timestamp: Date.now(), workspaceId: intent.workspaceId, correlationId, executionId, payload: { executionId, totalDuration: Date.now() - context.startedAt, stagesCompleted: context.completedStages.length } });
        events.push({ stage: 'audit', timestamp: Date.now(), status: 'completed' });
        context.completedStages.push('audit');
      }

      context.lastUpdated = Date.now();
      return { success: true, executionId, correlationId, executionResult: context.executionResult, verificationReport: context.verificationReport, totalDuration: Date.now() - context.startedAt, stagesCompleted: context.completedStages, events };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await eventBus.emit({ id: this.generateId(), type: 'ExecutionFailed', timestamp: Date.now(), workspaceId: intent.workspaceId, correlationId, executionId, payload: { failedAt: context.currentStage, error: errorMessage, retryCount: context.retryCount } });
      return { success: false, executionId, correlationId, totalDuration: Date.now() - context.startedAt, stagesCompleted: context.completedStages, failedAt: context.currentStage, failureReason: errorMessage, events };
    }
  }

  private async executePlan(context: PipelineContext): Promise<ExecutionResult> {
    const artifacts: ExecutionResult['artifacts'] = [];
    const executionLog: ExecutionResult['executionLog'] = [];
    let totalDuration = 0, tokensUsed = 0, cost = 0, microTasksCompleted = 0, checkpointsPassed = 0;

    for (const task of context.specification!.executionPlan.microTasks) {
      const taskStartTime = Date.now();
      await eventBus.emit({ id: this.generateId(), type: 'MicroTaskStarted', timestamp: taskStartTime, workspaceId: context.workspaceId, correlationId: context.correlationId, executionId: context.executionId, payload: { taskId: task.id, taskIndex: task.index, totalTasks: context.specification!.executionPlan.microTasks.length } });

      const output = await this.taskExecutor.executeTask({
        task,
        specification: context.specification!,
        previousArtifacts: [...artifacts],
        workspaceId: context.workspaceId,
      });

      if (output.result === 'failure') {
        executionLog.push({ timestamp: Date.now(), taskId: task.id, action: 'execute', result: 'failure', details: output.details ?? 'Task execution failed' });
        throw new Error(`Micro-task "${task.title}" failed: ${output.details ?? 'unknown error'}`);
      }

      const extension = output.artifactType === 'code' ? 'ts' : output.artifactType === 'data' ? 'json' : output.artifactType === 'config' ? 'yaml' : 'md';
      artifacts.push({ id: this.generateId(), type: output.artifactType, name: `${task.title.replace(/\s+/g, '-').toLowerCase()}.${extension}`, content: output.content, metadata: { taskId: task.id, model: output.metrics.model, latencyMs: output.metrics.latencyMs } });
      executionLog.push({ timestamp: Date.now(), taskId: task.id, action: 'execute', result: output.result, details: output.details ?? 'Task completed' });
      await eventBus.emit({ id: this.generateId(), type: 'MicroTaskCompleted', timestamp: Date.now(), workspaceId: context.workspaceId, correlationId: context.correlationId, executionId: context.executionId, payload: { taskId: task.id, taskIndex: task.index, totalTasks: context.specification!.executionPlan.microTasks.length, output: artifacts[artifacts.length - 1], requiresHotReview: task.requiresHotReview } });
      totalDuration += Date.now() - taskStartTime;
      tokensUsed += output.metrics.tokensUsed;
      cost += output.metrics.cost;
      microTasksCompleted++;
      if (task.requiresHotReview) checkpointsPassed++;
    }

    return { id: context.executionId, specId: context.specification!.id, workspaceId: context.workspaceId, artifacts, executionLog, metrics: { totalDuration, tokensUsed, cost, microTasksCompleted, checkpointsPassed }, completedAt: Date.now() };
  }

  private generateId(): string { return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`; }
}
