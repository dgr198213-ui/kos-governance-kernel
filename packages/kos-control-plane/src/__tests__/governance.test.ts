import { describe, it, expect, vi } from 'vitest';
import { GovernancePolicyEngine } from '../engines/governance/governance-engine.js';
import { KOSPipeline } from '../pipeline/kos-pipeline.js';
import { eventBus } from '../event-bus/index.js';
import type { GovernanceMatrix } from '../engines/environment/types.js';
import type { Intent } from '../engines/spec/types.js';

function makeIntent(rawInput: string): Intent {
  return { id: `intent-${Date.now()}`, workspaceId: 'ws-gov', userId: 'u-1', rawInput, source: 'chat', timestamp: Date.now() };
}

const matrix: GovernanceMatrix = {
  always: [{ action: 'Citar fuentes externas', rationale: 'Trazabilidad', enforceable: true }],
  consult: [
    { action: 'Uso de datos sensibles', rationale: 'Cumplimiento GDPR', approver: 'human' },
    { action: 'Modificación de presupuestos', rationale: 'Impacto financiero', approver: 'human', condition: 'Cambio > 10%' },
  ],
  never: [
    { action: 'Usar datos no anonimizados en logs', rationale: 'Violación de privacidad', severity: 'critical' },
    { action: 'Eliminar backups', rationale: 'Recuperación ante desastres', severity: 'critical' },
  ],
};

describe('GovernancePolicyEngine', () => {
  const engine = new GovernancePolicyEngine();

  it('permite intenciones que no coinciden con ninguna regla', () => {
    const decision = engine.evaluate(matrix, [{ label: 'intención', text: 'Escribe un poema sobre el mar' }]);
    expect(decision.verdict).toBe('allow');
    expect(decision.blocks).toHaveLength(0);
    expect(decision.approvals).toHaveLength(0);
  });

  it('bloquea cuando coinciden todas las keywords de una regla NUNCA', () => {
    const decision = engine.evaluate(matrix, [
      { label: 'intención', text: 'quiero eliminar los backups antiguos del servidor' },
    ]);
    expect(decision.verdict).toBe('block');
    expect(decision.blocks[0].rule).toBe('Eliminar backups');
    expect(decision.blocks[0].severity).toBe('critical');
  });

  it('es insensible a mayúsculas y acentos', () => {
    const decision = engine.evaluate(matrix, [
      { label: 'intención', text: 'ELIMINAR todos los BACKUPS' },
    ]);
    expect(decision.verdict).toBe('block');
  });

  it('exige aprobación cuando coincide una regla PREGUNTAR', () => {
    const decision = engine.evaluate(matrix, [
      { label: 'intención', text: 'analiza el uso de estos datos sensibles de clientes' },
    ]);
    expect(decision.verdict).toBe('require-approval');
    expect(decision.approvals[0].rule).toBe('Uso de datos sensibles');
    expect(decision.approvals[0].approver).toBe('human');
  });

  it('NUNCA tiene prioridad sobre PREGUNTAR', () => {
    const decision = engine.evaluate(matrix, [
      { label: 'intención', text: 'eliminar backups con uso de datos sensibles' },
    ]);
    expect(decision.verdict).toBe('block');
  });

  it('no coincide si solo aparecen parte de las keywords', () => {
    const decision = engine.evaluate(matrix, [
      { label: 'intención', text: 'haz una copia de los datos del informe' },
    ]);
    expect(decision.verdict).toBe('allow');
  });
});

describe('KOSPipeline con Matriz de Gobernanza', () => {
  // La matriz mock del EnvironmentEngine incluye:
  //   NUNCA: "Usar datos no anonimizados en logs" (critical)
  //   PREGUNTAR: "Uso de datos sensibles" (human)

  it('bloquea en policy-check una intención que viola una regla NUNCA', async () => {
    const events: string[] = [];
    const sub = eventBus.subscribe('PolicyBlocked', () => { events.push('PolicyBlocked'); });

    const pipeline = new KOSPipeline();
    const result = await pipeline.execute(
      makeIntent('vamos a usar datos no anonimizados en los logs de producción')
    );

    sub.unsubscribe();
    expect(result.success).toBe(false);
    expect(result.failedAt).toBe('policy-check');
    expect(result.failureReason).toContain('Matriz de Gobernanza');
    expect(events).toContain('PolicyBlocked');
  });

  it('pide aprobación para reglas PREGUNTAR y continúa si el humano aprueba', async () => {
    const approvalHandler = vi.fn(async () => true);
    const pipeline = new KOSPipeline({}, { approvalHandler });

    const result = await pipeline.execute(
      makeIntent('prepara un análisis sobre el uso de datos sensibles de clientes')
    );

    expect(approvalHandler).toHaveBeenCalledTimes(1);
    expect(approvalHandler.mock.calls[0][0].reasons.join(' ')).toContain('datos sensibles');
    expect(result.success).toBe(true);
    expect(result.stagesCompleted).toContain('approval');
  });

  it('aborta si el humano deniega la aprobación', async () => {
    const approvalHandler = vi.fn(async () => false);
    const pipeline = new KOSPipeline({}, { approvalHandler });

    const result = await pipeline.execute(
      makeIntent('prepara un análisis sobre el uso de datos sensibles de clientes')
    );

    expect(result.success).toBe(false);
    expect(result.failedAt).toBe('approval');
    expect(result.failureReason).toContain('denegada');
  });

  it('fail-safe deny: sin approvalHandler, una regla PREGUNTAR aborta el pipeline', async () => {
    const pipeline = new KOSPipeline();

    const result = await pipeline.execute(
      makeIntent('prepara un análisis sobre el uso de datos sensibles de clientes')
    );

    expect(result.success).toBe(false);
    expect(result.failedAt).toBe('approval');
    expect(result.failureReason).toContain('approvalHandler');
  });

  it('no molesta al humano cuando nada coincide y la verificación supera el umbral', async () => {
    const approvalHandler = vi.fn(async () => true);
    const pipeline = new KOSPipeline({}, { approvalHandler });

    const result = await pipeline.execute(makeIntent('Escribe un poema sobre el mar'));

    expect(result.success).toBe(true);
    expect(approvalHandler).not.toHaveBeenCalled();
  });
});

describe('EnvironmentRepository: la configuración del workspace gobierna el pipeline', () => {
  it('aplica la matriz personalizada persistida en lugar de la plantilla', async () => {
    const customRepo = {
      load: async () => ({
        identity: { name: 'Agente Qodeia' },
        governanceMatrix: {
          always: [],
          consult: [],
          never: [{ action: 'publicar precios', rationale: 'Solo dirección aprueba precios', severity: 'critical' as const }],
        },
      }),
      save: async () => {},
    };

    const { EnvironmentEngine } = await import('../engines/environment/environment-engine.js');
    const pipeline = new KOSPipeline({}, { environment: new EnvironmentEngine({}, customRepo) });

    // Esta intención viola la regla personalizada (no la de la plantilla)
    const blocked = await pipeline.execute(makeIntent('quiero publicar los precios nuevos en la web'));
    expect(blocked.success).toBe(false);
    expect(blocked.failedAt).toBe('policy-check');
    expect(blocked.failureReason).toContain('publicar precios');

    // Y una intención que violaría la plantilla por defecto ahora pasa,
    // porque la matriz personalizada la ha sustituido por completo
    const allowed = await pipeline.execute(makeIntent('usar datos no anonimizados en los logs'));
    expect(allowed.success).toBe(true);
  });
});
