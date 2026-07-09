import { describe, it, expect, vi } from 'vitest';
import { SpecEngine } from '../engines/spec/spec-engine.js';
import { VerifierEngine } from '../engines/verification/verifier-engine.js';
import type { LLMClient } from '../llm/llm-client.js';
import { parseJsonLoose } from '../llm/llm-client.js';
import type { Intent } from '../engines/spec/types.js';
import type { ExecutionResult } from '../engines/verification/types.js';

function makeIntent(rawInput = 'Escribe un informe de mercado sobre IA generativa'): Intent {
  return { id: 'intent-1', workspaceId: 'ws-1', userId: 'u-1', rawInput, source: 'chat', timestamp: Date.now() };
}

function fakeLLM(response: string): LLMClient & { complete: ReturnType<typeof vi.fn> } {
  return {
    complete: vi.fn(async () => ({ content: response, tokensUsed: 100, cost: 0.001, latencyMs: 10, model: 'fake' })),
  };
}

function makeExecutionResult(overrides: Partial<ExecutionResult> = {}): ExecutionResult {
  return {
    id: 'exec-1', specId: 'spec-1', workspaceId: 'ws-1',
    artifacts: [{ id: 'a1', type: 'document', name: 'informe.md', content: '# Informe\nContenido real.' }],
    executionLog: [{ timestamp: Date.now(), taskId: 't1', action: 'execute', result: 'success', details: 'ok' }],
    metrics: { totalDuration: 100, tokensUsed: 500, cost: 0.01, microTasksCompleted: 1, checkpointsPassed: 0 },
    completedAt: Date.now(),
    ...overrides,
  };
}

describe('parseJsonLoose', () => {
  it('parsea JSON limpio, con fences y con texto alrededor', () => {
    expect(parseJsonLoose('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Claro, aquí tienes: {"a":1} ¡Espero que sirva!')).toEqual({ a: 1 });
  });

  it('lanza si no hay JSON', () => {
    expect(() => parseJsonLoose('no hay nada aquí')).toThrow();
  });
});

describe('SpecEngine con LLM', () => {
  const validPlan = JSON.stringify({
    realObjective: 'Informar decisiones de inversión en IA generativa',
    superficialTask: 'Escribir informe de mercado',
    qualityCriteria: [
      { name: 'Datos actuales', description: 'Usar cifras de 2026', priority: 'must-have' },
    ],
    microTasks: [
      { title: 'Investigar tendencias', description: 'Recopilar tendencias clave', expectedOutput: 'Lista de tendencias', estimatedComplexity: 'medium', requiresHotReview: false },
      { title: 'Redactar informe', description: 'Redactar el informe final', expectedOutput: 'Informe en Markdown', estimatedComplexity: 'high', requiresHotReview: true },
    ],
  });

  it('genera el plan desde la respuesta del modelo', async () => {
    const llm = fakeLLM(validPlan);
    const engine = new SpecEngine({}, llm);
    const result = await engine.generateSpec(makeIntent());

    expect(llm.complete).toHaveBeenCalledTimes(1);
    expect(result.specification.realObjective).toBe('Informar decisiones de inversión en IA generativa');
    expect(result.specification.executionPlan.microTasks).toHaveLength(2);
    expect(result.specification.executionPlan.microTasks[1].title).toBe('Redactar informe');
    expect(result.specification.qualityCriteria[0].name).toBe('Datos actuales');
    expect(result.warnings.some(w => w.includes('respaldo'))).toBe(false);
  });

  it('degrada al plan heurístico con warning si el modelo devuelve basura', async () => {
    const engine = new SpecEngine({}, fakeLLM('esto no es JSON en absoluto'));
    const result = await engine.generateSpec(makeIntent());

    expect(result.specification.executionPlan.microTasks.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('respaldo'))).toBe(true);
  });

  it('sin LLM sigue funcionando en modo heurístico sin warnings de planner', async () => {
    const engine = new SpecEngine();
    const result = await engine.generateSpec(makeIntent());

    expect(result.specification.executionPlan.microTasks.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('respaldo'))).toBe(false);
  });
});

describe('VerifierEngine determinista', () => {
  it('devuelve la misma puntuación para la misma entrada (sin azar)', async () => {
    const engine = new VerifierEngine({ feedbackLoops: 1 });
    const spec = (await new SpecEngine().generateSpec(makeIntent())).specification;
    const exec = makeExecutionResult({ specId: spec.id });

    const r1 = await engine.verify(spec, exec);
    const r2 = await engine.verify(spec, exec);

    expect(r1.finalScore).toBe(r2.finalScore);
    expect(r1.passed).toBe(r2.passed);
  });

  it('penaliza ejecuciones sin artefactos con un issue crítico', async () => {
    const engine = new VerifierEngine({ feedbackLoops: 1 });
    const spec = (await new SpecEngine().generateSpec(makeIntent())).specification;
    const exec = makeExecutionResult({ artifacts: [], executionLog: [] });

    const report = await engine.verify(spec, exec);

    expect(report.passed).toBe(false);
  });

  it('usa el crítico LLM cuando está inyectado', async () => {
    const critic = fakeLLM(JSON.stringify({
      overallScore: 92,
      strengths: ['Contenido alineado con el objetivo'],
      weaknesses: [],
      recommendations: [],
      criticalIssues: [],
    }));
    const engine = new VerifierEngine({ feedbackLoops: 1 }, critic);
    const spec = (await new SpecEngine().generateSpec(makeIntent())).specification;

    const report = await engine.verify(spec, makeExecutionResult({ specId: spec.id }));

    expect(critic.complete).toHaveBeenCalled();
    const audit = report.iterations[0].externalAudit!;
    expect(audit.overallScore).toBe(92);
    expect(audit.strengths[0]).toContain('alineado');
  });

  it('degrada a la auditoría heurística si el crítico LLM falla', async () => {
    const brokenCritic: LLMClient = {
      complete: async () => { throw new Error('critic caído'); },
    };
    const engine = new VerifierEngine({ feedbackLoops: 1 }, brokenCritic);
    const spec = (await new SpecEngine().generateSpec(makeIntent())).specification;

    const report = await engine.verify(spec, makeExecutionResult({ specId: spec.id }));

    expect(report.iterations[0].externalAudit).toBeDefined();
    expect(report.finalScore).toBeGreaterThan(0);
  });
});
