import { eventBus } from '../../event-bus/index.js';
import type { Specification } from '../spec/types.js';
import type { AgileExecutorConfig, AgileExecutionPlan, MicroBlock, BlockExecution, AgileExecutionResult } from './types.js';

export class AgileExecutor {
  private defaultConfig: AgileExecutorConfig = {
    mode: 'agile', maxBlockSize: 'small', enableHotReview: true, enableAutoAdjustment: true,
    requireCheckpointApproval: true, maxRetriesPerBlock: 2, driftDetectionThreshold: 0.3
  };

  constructor(private config: Partial<AgileExecutorConfig> = {}) {}

  async execute(spec: Specification, configOverrides?: Partial<AgileExecutorConfig>): Promise<AgileExecutionResult> {
    const config = { ...this.defaultConfig, ...this.config, ...configOverrides };
    const executionId = `agile-exec-${Date.now()}`;
    const correlationId = `agile-${executionId}`;
    const startedAt = Date.now();
    const plan = await this.createAgilePlan(spec, config);

    await eventBus.emit({
      id: this.generateId(), type: 'ExecutionStarted', timestamp: Date.now(),
      workspaceId: spec.workspaceId, correlationId, executionId,
      payload: { executionId, planId: plan.id, totalBlocks: plan.totalBlocks, mode: plan.mode }
    });

    const blockExecutions: BlockExecution[] = [];
    let blocksCompleted = 0, blocksFailed = 0, blocksAdjusted = 0;
    let totalTokensUsed = 0, totalCost = 0, driftEvents = 0, humanReviews = 0;
    const allArtifacts: any[] = [];

    for (const block of plan.blocks) {
      const blockExecution = await this.executeBlock(block, spec, config, correlationId, executionId);
      blockExecutions.push(blockExecution);
      totalTokensUsed += blockExecution.tokensUsed;
      totalCost += blockExecution.cost;

      if (config.enableHotReview && blockExecution.hotReview) {
        if (!blockExecution.hotReview.passed) {
          driftEvents++;
          blocksFailed++;
        } else {
          blocksCompleted++;
        }
      } else {
        blocksCompleted++;
      }

      for (const artifact of blockExecution.artifacts) {
        allArtifacts.push({ ...artifact, sourceBlockId: block.id });
      }

      await eventBus.emit({
        id: this.generateId(), type: 'MicroTaskCompleted', timestamp: Date.now(),
        workspaceId: spec.workspaceId, correlationId, executionId,
        payload: { taskId: block.id, taskIndex: block.index, totalTasks: plan.totalBlocks, output: { summary: `Block ${block.index + 1} completed` }, requiresHotReview: config.enableHotReview }
      });
    }

    const completedAt = Date.now();
    return {
      planId: plan.id, executionId,
      status: blocksFailed === 0 ? 'completed' : blocksCompleted === 0 ? 'failed' : 'partial',
      blockExecutions, totalDuration: completedAt - startedAt, totalTokensUsed, totalCost,
      blocksCompleted, blocksFailed, blocksAdjusted,
      finalOutput: { consolidated: true, blocksProcessed: blockExecutions.length, timestamp: Date.now() },
      allArtifacts, startedAt, completedAt, driftEvents, humanReviews
    };
  }

  private async createAgilePlan(spec: Specification, config: AgileExecutorConfig): Promise<AgileExecutionPlan> {
    const blocks: MicroBlock[] = spec.executionPlan.microTasks.map((task, index) => ({
      id: task.id, index, title: task.title, description: task.description, dependencies: task.dependencies,
      input: {}, expectedOutput: task.expectedOutput,
      validationCriteria: [{ criterion: 'Output matches format', weight: 0.5, automated: true }],
      estimatedComplexity: task.estimatedComplexity, requiresHumanReview: task.requiresHotReview, status: 'pending'
    }));
    return {
      id: this.generateId(), specId: spec.id, mode: config.mode, blocks, totalBlocks: blocks.length,
      estimatedDuration: blocks.reduce((sum, b) => sum + (b.estimatedComplexity === 'low' ? 30 : b.estimatedComplexity === 'medium' ? 60 : 120), 0),
      createdAt: Date.now()
    };
  }

  private async executeBlock(block: MicroBlock, spec: Specification, config: AgileExecutorConfig, correlationId: string, executionId: string): Promise<BlockExecution> {
    const startedAt = Date.now();
    block.status = 'running';

    await eventBus.emit({
      id: this.generateId(), type: 'MicroTaskStarted', timestamp: startedAt,
      workspaceId: spec.workspaceId, correlationId, executionId,
      payload: { taskId: block.id, taskIndex: block.index, totalTasks: spec.executionPlan.microTasks.length }
    });

    const timeMap = { low: 50, medium: 100, high: 200 };
    await new Promise(resolve => setTimeout(resolve, timeMap[block.estimatedComplexity]));

    const output = { blockId: block.id, blockTitle: block.title, specObjective: spec.realObjective, output: `Output for: ${block.description}`, timestamp: Date.now() };
    const tokensUsed = JSON.stringify(output).length / 4;
    const cost = tokensUsed * 0.00003;
    const artifacts = [{ name: `${block.title.replace(/\s+/g, '-').toLowerCase()}.json`, type: 'data', content: output }];
    const driftScore = Math.random() * 0.5;
    const hotReview = config.enableHotReview ? { performedAt: Date.now(), driftScore, issues: driftScore > 0.3 ? ['Output partially deviates'] : [], passed: driftScore < 0.4, reviewer: 'automated' as const } : undefined;
    const completedAt = Date.now();

    return { blockId: block.id, startedAt, completedAt, duration: completedAt - startedAt, output, artifacts, hotReview, tokensUsed: Math.round(tokensUsed), cost: Math.round(cost * 10000) / 10000, retries: 0 };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
