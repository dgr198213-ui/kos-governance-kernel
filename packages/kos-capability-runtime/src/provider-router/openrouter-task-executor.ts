import type { TaskExecutor, TaskExecutionInput, TaskExecutionOutput } from '@kos/control-plane';
import { OpenRouterProvider } from './openrouter-provider.js';

export interface OpenRouterTaskExecutorOptions {
  /** Modelo de OpenRouter a usar. Por defecto, un modelo gratuito. */
  model?: string;
  temperature?: number;
  maxTokensPerTask?: number;
  /** Nº máximo de artefactos previos que se incluyen como contexto. */
  maxContextArtifacts?: number;
}

const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

/**
 * Ejecutor real de micro-tareas usando OpenRouter.
 *
 * Adaptador del puerto TaskExecutor definido en @kos/control-plane:
 * por cada micro-tarea construye un prompt con el objetivo real de la
 * especificación, los criterios de calidad y los artefactos previos,
 * y delega la generación en el modelo configurado.
 */
export class OpenRouterTaskExecutor implements TaskExecutor {
  private options: Required<OpenRouterTaskExecutorOptions>;

  constructor(
    private provider: OpenRouterProvider,
    options: OpenRouterTaskExecutorOptions = {}
  ) {
    this.options = {
      model: options.model ?? DEFAULT_MODEL,
      temperature: options.temperature ?? 0.3,
      maxTokensPerTask: options.maxTokensPerTask ?? 2000,
      maxContextArtifacts: options.maxContextArtifacts ?? 3,
    };
  }

  async executeTask(input: TaskExecutionInput): Promise<TaskExecutionOutput> {
    const { task, specification, previousArtifacts, knowledge = [] } = input;

    const mustHaveCriteria = specification.qualityCriteria
      .filter(c => c.priority === 'must-have')
      .map(c => `- ${c.name}: ${c.description}`)
      .join('\n');

    const contextArtifacts = previousArtifacts
      .slice(-this.options.maxContextArtifacts)
      .map(a => `### ${a.name}\n${this.truncate(String(a.content), 1500)}`)
      .join('\n\n');

    const system = [
      'Eres el Executor del kernel de gobernanza KOS.',
      'Ejecutas una micro-tarea concreta dentro de un plan mayor. Produce únicamente el entregable pedido, sin preámbulos ni explicaciones meta.',
      `Objetivo real del plan: ${specification.realObjective}`,
      mustHaveCriteria ? `Criterios de calidad obligatorios:\n${mustHaveCriteria}` : '',
      knowledge.length > 0
        ? `Documentación del workspace (respétala como fuente de verdad de esta organización):\n${knowledge.map(k => `### ${k.title} [${k.category}]\n${this.truncate(k.content, 1000)}`).join('\n\n')}`
        : '',
    ].filter(Boolean).join('\n\n');

    const user = [
      `Micro-tarea ${task.index}: ${task.title}`,
      `Descripción: ${task.description}`,
      `Salida esperada: ${task.expectedOutput}`,
      contextArtifacts ? `Artefactos de tareas anteriores (contexto):\n\n${contextArtifacts}` : '',
    ].filter(Boolean).join('\n\n');

    const result = await this.provider.call(
      this.options.model,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: this.options.temperature, max_tokens: this.options.maxTokensPerTask }
    );

    if (!result.success) {
      return {
        content: '',
        artifactType: 'document',
        result: 'failure',
        details: result.error ?? 'OpenRouter call failed',
        metrics: {
          tokensUsed: result.metrics.inputTokens + result.metrics.outputTokens,
          cost: result.metrics.cost,
          latencyMs: result.metrics.latencyMs,
          model: this.options.model,
        },
      };
    }

    const content = result.output ?? '';
    return {
      content,
      artifactType: this.inferArtifactType(task.title, task.expectedOutput, content),
      result: content.trim().length > 0 ? 'success' : 'warning',
      details: content.trim().length > 0 ? 'Task completed via OpenRouter' : 'Model returned empty output',
      metrics: {
        tokensUsed: result.metrics.inputTokens + result.metrics.outputTokens,
        cost: result.metrics.cost,
        latencyMs: result.metrics.latencyMs,
        model: this.options.model,
      },
    };
  }

  private inferArtifactType(title: string, expectedOutput: string, content: string): TaskExecutionOutput['artifactType'] {
    const haystack = `${title} ${expectedOutput}`.toLowerCase();
    if (/c[oó]digo|code|script|implementaci[oó]n|funci[oó]n|endpoint|api\b/.test(haystack) || /```/.test(content)) {
      return 'code';
    }
    if (/json|dataset|datos|csv/.test(haystack)) return 'data';
    if (/config|yaml|\.env|despliegue|deployment/.test(haystack)) return 'config';
    return 'document';
  }

  private truncate(text: string, max: number): string {
    return text.length <= max ? text : `${text.slice(0, max)}\n[...truncado...]`;
  }
}
