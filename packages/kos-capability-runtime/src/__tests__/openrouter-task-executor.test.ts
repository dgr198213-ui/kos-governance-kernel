import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenRouterProvider } from '../provider-router/openrouter-provider.js';
import { OpenRouterTaskExecutor } from '../provider-router/openrouter-task-executor.js';
import type { TaskExecutionInput } from '@kos/control-plane';

function makeInput(overrides: Partial<TaskExecutionInput['task']> = {}): TaskExecutionInput {
  return {
    workspaceId: 'ws-test',
    previousArtifacts: [],
    task: {
      id: 'task-1',
      index: 1,
      title: 'Redactar resumen',
      description: 'Redactar un resumen ejecutivo del análisis',
      dependencies: [],
      estimatedComplexity: 'low',
      requiresHotReview: false,
      expectedOutput: 'Documento en Markdown',
      ...overrides,
    },
    specification: {
      id: 'spec-1',
      intentId: 'intent-1',
      workspaceId: 'ws-test',
      realObjective: 'Producir un informe de mercado',
      superficialTask: 'informe',
      extractedContext: {
        implicitConstraints: [],
        businessContext: {},
        technicalContext: {},
        extractedAt: Date.now(),
      },
      executionPlan: { microTasks: [], totalEstimatedTime: 0, criticalPath: [], parallelizable: [] },
      qualityCriteria: [
        {
          id: 'q1', name: 'Claridad', description: 'Texto claro y conciso',
          measurable: false, priority: 'must-have', verificationMethod: 'automated',
        },
      ],
      validationCheckpoints: [],
      interviewRounds: 0,
      questionsAsked: 0,
      ambiguityScore: 0.1,
      createdAt: Date.now(),
      version: 1,
    },
  };
}

describe('OpenRouterTaskExecutor', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ejecuta una micro-tarea y devuelve el contenido del modelo con métricas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: '# Resumen ejecutivo\nContenido generado.' } }],
        usage: { prompt_tokens: 120, completion_tokens: 80 },
      }), { status: 200 })
    ));

    const executor = new OpenRouterTaskExecutor(new OpenRouterProvider({ apiKey: 'test' }));
    const output = await executor.executeTask(makeInput());

    expect(output.result).toBe('success');
    expect(output.content).toContain('Resumen ejecutivo');
    expect(output.artifactType).toBe('document');
    expect(output.metrics.tokensUsed).toBe(200);
    expect(output.metrics.model).toContain(':free');
  });

  it('incluye el objetivo real y los criterios must-have en el prompt', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const executor = new OpenRouterTaskExecutor(new OpenRouterProvider({ apiKey: 'test' }));
    await executor.executeTask(makeInput());

    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    const systemMsg = body.messages.find((m: any) => m.role === 'system').content;
    expect(systemMsg).toContain('Producir un informe de mercado');
    expect(systemMsg).toContain('Claridad');
  });

  it('clasifica como code las tareas de implementación', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: '```ts\nexport const x = 1;\n```' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }), { status: 200 })
    ));

    const executor = new OpenRouterTaskExecutor(new OpenRouterProvider({ apiKey: 'test' }));
    const output = await executor.executeTask(
      makeInput({ title: 'Implementación del endpoint', expectedOutput: 'Código TypeScript' })
    );

    expect(output.artifactType).toBe('code');
  });

  it('mapea errores de la API a result=failure sin lanzar excepción', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('Insufficient credits', { status: 402 })
    ));

    const executor = new OpenRouterTaskExecutor(new OpenRouterProvider({ apiKey: 'test' }));
    const output = await executor.executeTask(makeInput());

    expect(output.result).toBe('failure');
    expect(output.details).toContain('Insufficient credits');
  });

  it('marca como warning una respuesta vacía del modelo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: '' } }],
        usage: { prompt_tokens: 1, completion_tokens: 0 },
      }), { status: 200 })
    ));

    const executor = new OpenRouterTaskExecutor(new OpenRouterProvider({ apiKey: 'test' }));
    const output = await executor.executeTask(makeInput());

    expect(output.result).toBe('warning');
  });
});
