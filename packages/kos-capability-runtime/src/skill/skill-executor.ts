import { eventBus } from '@kos/control-plane';
import { SkillRegistry } from './skill-registry.js';
import type { Skill, SkillExecutionRequest, SkillExecutionResult, SkillPrompt } from './types.js';

export class SkillExecutor {
  private memoryStore: Map<string, Map<string, unknown>> = new Map();

  constructor(private registry: SkillRegistry) {}

  async execute(request: SkillExecutionRequest): Promise<SkillExecutionResult> {
    const executionId = this.generateId();
    const correlationId = `skill-exec-${executionId}`;
    const startTime = Date.now();
    const logs: SkillExecutionResult['logs'] = [];
    const log = (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => {
      logs.push({ timestamp: Date.now(), level, message, data });
    };

    try {
      log('info', `Resolving skill: ${request.skillId}`);
      const skill = this.registry.get(request.skillId);
      if (!skill) throw new Error(`Skill not found: ${request.skillId}`);

      log('info', 'Checking skill policies');
      if (skill.policy.requireHumanApproval && !request.options?.skipVerification) {
        await eventBus.emit({
          id: this.generateId(), type: 'HumanApprovalRequested', timestamp: Date.now(),
          workspaceId: request.workspaceId, correlationId, executionId,
          payload: { skillId: skill.id, skillName: skill.manifest.name, conditions: skill.policy.approvalConditions }
        });
      }

      if (request.options?.dryRun) {
        log('info', 'Dry run mode');
        return {
          skillId: skill.id, executionId, status: 'success',
          output: { dryRun: true, skill: skill.manifest.name },
          artifacts: [], metrics: { duration: Date.now() - startTime, tokensUsed: 0, cost: 0 },
          logs, memoryUpdated: false
        };
      }

      log('info', 'Resolving prompt template');
      const prompt = this.resolvePrompt(skill, request);
      const resolvedInput = this.resolveVariables(prompt, request.input);
      const memoryKey = request.options?.memoryKey || `${request.workspaceId}:${skill.id}`;
      const memory = this.loadMemory(memoryKey, skill);
      log('info', `Memory loaded: ${Object.keys(memory).length} entries`);

      const toolResults = await this.executeTools(skill, resolvedInput, log);
      log('info', 'Generating output');
      const output = await this.generateOutput(skill, prompt, resolvedInput, memory, toolResults);
      const artifacts = this.generateArtifacts(skill, output);
      const memoryUpdated = this.updateMemory(memoryKey, skill, output);

      const duration = Date.now() - startTime;
      const tokensUsed = JSON.stringify(resolvedInput).length / 4 + JSON.stringify(output).length / 4;
      const cost = tokensUsed * 0.00003;

      const result: SkillExecutionResult = {
        skillId: skill.id, executionId, status: 'success', output, artifacts,
        metrics: { duration, tokensUsed: Math.round(tokensUsed), cost: Math.round(cost * 100) / 100 },
        logs, memoryUpdated
      };

      this.registry.updateUsageStats(skill.id, result);

      await eventBus.emit({
        id: this.generateId(), type: 'MicroTaskCompleted', timestamp: Date.now(),
        workspaceId: request.workspaceId, correlationId, executionId,
        payload: { taskId: executionId, taskIndex: 0, totalTasks: 1, output: { summary: `Skill ${skill.manifest.name} executed` }, requiresHotReview: skill.policy.requireHumanApproval }
      });

      log('info', `Execution completed in ${duration}ms`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', `Execution failed: ${errorMessage}`);
      return {
        skillId: request.skillId, executionId, status: 'failed', output: null, artifacts: [],
        metrics: { duration: Date.now() - startTime, tokensUsed: 0, cost: 0 },
        logs, memoryUpdated: false
      };
    }
  }

  private resolvePrompt(skill: Skill, request: SkillExecutionRequest): SkillPrompt {
    if (request.options?.promptVariation) {
      const variation = skill.prompts.find(p => p.name === request.options!.promptVariation);
      if (variation) return variation;
    }
    if (skill.prompts.length === 0) throw new Error(`Skill ${skill.manifest.name} has no prompts`);
    return skill.prompts[0];
  }

  private resolveVariables(prompt: SkillPrompt, input: Record<string, unknown>): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const variable of prompt.variables) {
      if (variable.name in input) resolved[variable.name] = input[variable.name];
      else if (variable.default !== undefined) resolved[variable.name] = variable.default;
      else if (variable.required) throw new Error(`Required variable "${variable.name}" not provided`);
    }
    return resolved;
  }

  private loadMemory(key: string, skill: Skill): Record<string, unknown> {
    if (!skill.memory.persistent) return {};
    const store = this.memoryStore.get(key);
    return store ? Object.fromEntries(store) : {};
  }

  private async executeTools(skill: Skill, input: Record<string, unknown>, log: (level: any, message: string) => void): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    for (const tool of skill.tools) {
      log('info', `Executing tool: ${tool.name}`);
      results[tool.name] = { status: 'success', output: `Result from ${tool.name}`, executionTime: Math.random() * 100 };
    }
    return results;
  }

  private async generateOutput(skill: Skill, prompt: SkillPrompt, input: Record<string, unknown>, memory: Record<string, unknown>, toolResults: Record<string, unknown>): Promise<unknown> {
    return {
      skill: skill.manifest.name, promptUsed: prompt.name,
      inputProcessed: Object.keys(input), memoryContext: Object.keys(memory).length,
      toolsExecuted: Object.keys(toolResults), generatedAt: new Date().toISOString(),
      content: `Output generated by ${skill.manifest.name} v${skill.manifest.version}`
    };
  }

  private generateArtifacts(skill: Skill, output: unknown): SkillExecutionResult['artifacts'] {
    return [{ name: `${skill.manifest.name}-output.json`, type: 'data', content: output }];
  }

  private updateMemory(key: string, skill: Skill, output: unknown): boolean {
    if (!skill.memory.persistent) return false;
    if (!this.memoryStore.has(key)) this.memoryStore.set(key, new Map());
    const store = this.memoryStore.get(key)!;
    store.set('lastOutput', output);
    store.set('lastRunAt', Date.now());
    store.set('runCount', (store.get('runCount') as number || 0) + 1);
    return true;
  }

  private generateId(): string { return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`; }
}
