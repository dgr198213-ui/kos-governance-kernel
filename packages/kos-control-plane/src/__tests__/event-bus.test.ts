import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../event-bus/event-bus.js';
import type { KOSBaseEvent } from '../event-bus/types.js';

function makeEvent(overrides: Partial<KOSBaseEvent> = {}): KOSBaseEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    type: 'IntentReceived',
    timestamp: Date.now(),
    workspaceId: 'ws-1',
    correlationId: 'corr-1',
    executionId: 'exec-1',
    payload: {},
    ...overrides,
  };
}

describe('EventBus', () => {
  it('notifica a los suscriptores del tipo específico', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe('IntentReceived', handler);

    await bus.emit(makeEvent());

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('notifica a los suscriptores globales (*) para cualquier evento', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe('*', handler);

    await bus.emit(makeEvent({ type: 'ExecutionFailed' }));
    await bus.emit(makeEvent({ type: 'AuditLogged' }));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('no notifica a suscriptores de otros tipos', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe('CommitCompleted', handler);

    await bus.emit(makeEvent({ type: 'IntentReceived' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('permite cancelar la suscripción', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const sub = bus.subscribe('IntentReceived', handler);

    sub.unsubscribe();
    await bus.emit(makeEvent());

    expect(handler).not.toHaveBeenCalled();
  });

  it('filtra eventos por correlationId', async () => {
    const bus = new EventBus();
    await bus.emit(makeEvent({ correlationId: 'a' }));
    await bus.emit(makeEvent({ correlationId: 'b' }));
    await bus.emit(makeEvent({ correlationId: 'a' }));

    expect(bus.getEventsByCorrelationId('a')).toHaveLength(2);
    expect(bus.getEventsByCorrelationId('b')).toHaveLength(1);
  });

  it('respeta el límite máximo del log de eventos', async () => {
    const bus = new EventBus({ maxLogSize: 3 });
    for (let i = 0; i < 5; i++) {
      await bus.emit(makeEvent({ correlationId: `c-${i}` }));
    }
    // Solo deben quedar los 3 últimos
    expect(bus.getEventsByCorrelationId('c-0')).toHaveLength(0);
    expect(bus.getEventsByCorrelationId('c-4')).toHaveLength(1);
  });
});
