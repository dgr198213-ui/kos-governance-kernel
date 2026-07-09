import type { MicroTask, Specification } from '../engines/spec/types.js';
import type { ExecutionResult } from '../engines/verification/types.js';

/**
 * Puerto de ejecución de micro-tareas (Clean Architecture).
 *
 * El control plane define QUÉ necesita para ejecutar una tarea, sin conocer
 * CÓMO se ejecuta. Las implementaciones reales (OpenRouter, Anthropic, local)
 * viven en @kos/capability-runtime, evitando una dependencia circular entre
 * paquetes: capability-runtime depende de control-plane, nunca al revés.
 */

export type Artifact = ExecutionResult['artifacts'][number];

export interface TaskExecutionInput {
  task: MicroTask;
  specification: Specification;
  /** Artefactos producidos por las tareas anteriores, como contexto. */
  previousArtifacts: Artifact[];
  workspaceId: string;
}

export interface TaskExecutionOutput {
  content: string;
  artifactType: Artifact['type'];
  result: 'success' | 'failure' | 'warning';
  details?: string;
  metrics: {
    tokensUsed: number;
    cost: number;
    latencyMs: number;
    model?: string;
  };
}

export interface TaskExecutor {
  executeTask(input: TaskExecutionInput): Promise<TaskExecutionOutput>;
}

/**
 * Implementación simulada: genera artefactos placeholder sin llamar a
 * ningún LLM. Es el ejecutor por defecto para que el pipeline funcione
 * sin red (tests, demos, CI). Para ejecución real, inyectar por ejemplo
 * OpenRouterTaskExecutor de @kos/capability-runtime.
 */
export class SimulatedTaskExecutor implements TaskExecutor {
  async executeTask(input: TaskExecutionInput): Promise<TaskExecutionOutput> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      content: `// [SIMULADO] Output: ${input.task.title}`,
      artifactType: 'code',
      result: 'success',
      details: 'Task completed (simulated)',
      metrics: { tokensUsed: 1000, cost: 0.01, latencyMs: 50, model: 'simulated' },
    };
  }
}
