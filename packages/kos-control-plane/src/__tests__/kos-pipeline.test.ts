import { describe, it, expect } from 'vitest';
import { KOSPipeline } from '../pipeline/kos-pipeline.js';
import { SpecEngine } from '../engines/spec/spec-engine.js';
import type { Intent } from '../engines/spec/types.js';

function makeIntent(rawInput = 'Crear un endpoint REST para listar usuarios'): Intent {
  return {
    id: `intent-${Date.now()}`,
    workspaceId: 'ws-test',
    userId: 'user-test',
    rawInput,
    source: 'chat',
    timestamp: Date.now(),
  };
}

describe('SpecEngine', () => {
  it('genera una especificación a partir de un intent', async () => {
    const engine = new SpecEngine();
    const result = await engine.generateSpec(makeIntent());

    expect(result.specification).toBeDefined();
    expect(result.specification.workspaceId).toBe('ws-test');
    expect(result.specification.executionPlan.microTasks.length).toBeGreaterThan(0);
  });
});

describe('KOSPipeline', () => {
  it('ejecuta el pipeline completo con éxito', async () => {
    const pipeline = new KOSPipeline();
    const result = await pipeline.execute(makeIntent());

    expect(result.success).toBe(true);
    expect(result.stagesCompleted).toContain('specification');
    expect(result.stagesCompleted).toContain('execution');
    expect(result.stagesCompleted).toContain('verification');
    expect(result.executionResult).toBeDefined();
    expect(result.verificationReport).toBeDefined();
  });

  it('respeta la configuración de aprobación humana desactivada', async () => {
    const pipeline = new KOSPipeline({ enableHumanApproval: false });
    const result = await pipeline.execute(makeIntent());

    expect(result.success).toBe(true);
    expect(result.stagesCompleted).not.toContain('approval');
  });

  it('omite commit y audit si están desactivados', async () => {
    const pipeline = new KOSPipeline({ enableCommit: false, enableAudit: false });
    const result = await pipeline.execute(makeIntent());

    expect(result.success).toBe(true);
    expect(result.stagesCompleted).not.toContain('commit');
    expect(result.stagesCompleted).not.toContain('audit');
  });

  it('genera artefactos por cada micro-tarea del plan', async () => {
    const pipeline = new KOSPipeline();
    const result = await pipeline.execute(makeIntent());

    expect(result.executionResult!.artifacts.length).toBe(
      result.executionResult!.metrics.microTasksCompleted
    );
  });

  it('devuelve success=false y la etapa fallida si un engine lanza error', async () => {
    const failingSpec = {
      generateSpec: async () => {
        throw new Error('spec boom');
      },
    } as unknown as SpecEngine;

    const pipeline = new KOSPipeline({}, { spec: failingSpec });
    const result = await pipeline.execute(makeIntent());

    expect(result.success).toBe(false);
    expect(result.failedAt).toBe('specification');
    expect(result.failureReason).toContain('spec boom');
  });
});

describe('KOSPipeline con TaskExecutor inyectado', () => {
  it('usa el ejecutor inyectado y refleja su contenido y métricas', async () => {
    const customExecutor = {
      executeTask: async ({ task }: { task: { title: string } }) => ({
        content: `contenido real de ${task.title}`,
        artifactType: 'document' as const,
        result: 'success' as const,
        metrics: { tokensUsed: 500, cost: 0.002, latencyMs: 10, model: 'test-model' },
      }),
    };

    const pipeline = new KOSPipeline({}, { executor: customExecutor });
    const result = await pipeline.execute(makeIntent());

    expect(result.success).toBe(true);
    const first = result.executionResult!.artifacts[0];
    expect(String(first.content)).toContain('contenido real de');
    expect(first.metadata?.model).toBe('test-model');
    expect(result.executionResult!.metrics.tokensUsed).toBe(
      500 * result.executionResult!.metrics.microTasksCompleted
    );
  });

  it('aborta la etapa de ejecución si el ejecutor devuelve failure', async () => {
    const failingExecutor = {
      executeTask: async () => ({
        content: '',
        artifactType: 'document' as const,
        result: 'failure' as const,
        details: 'provider caído',
        metrics: { tokensUsed: 0, cost: 0, latencyMs: 5 },
      }),
    };

    const pipeline = new KOSPipeline({}, { executor: failingExecutor });
    const result = await pipeline.execute(makeIntent());

    expect(result.success).toBe(false);
    expect(result.failedAt).toBe('execution');
    expect(result.failureReason).toContain('provider caído');
  });
});
