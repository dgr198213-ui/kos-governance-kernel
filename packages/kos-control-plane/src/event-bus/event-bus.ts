import type { KOSBaseEvent, KOSEventType, EventHandler, EventSubscription } from './types.js';

export class EventBus {
  private handlers: Map<KOSEventType | '*', Set<EventHandler>> = new Map();
  private eventLog: KOSBaseEvent[] = [];
  private maxLogSize: number;

  constructor(options: { maxLogSize?: number } = {}) {
    this.maxLogSize = options.maxLogSize ?? 10000;
  }

  subscribe<T extends KOSBaseEvent>(eventType: KOSEventType | '*', handler: EventHandler<T>): EventSubscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler as EventHandler);
    return {
      unsubscribe: () => { handlers.delete(handler as EventHandler); }
    };
  }

  async emit<T extends KOSBaseEvent>(event: T): Promise<void> {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
    const specificHandlers = this.handlers.get(event.type);
    if (specificHandlers) {
      await Promise.all(Array.from(specificHandlers).map(handler => handler(event)));
    }
    const globalHandlers = this.handlers.get('*');
    if (globalHandlers) {
      await Promise.all(Array.from(globalHandlers).map(handler => handler(event)));
    }
  }

  getEventsByCorrelationId(correlationId: string): KOSBaseEvent[] {
    return this.eventLog.filter(event => event.correlationId === correlationId);
  }

  getEventsByType(eventType: KOSEventType): KOSBaseEvent[] {
    return this.eventLog.filter(event => event.type === eventType);
  }

  getStats() {
    const eventsByType: Record<string, number> = {};
    for (const event of this.eventLog) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }
    let activeSubscriptions = 0;
    for (const handlers of this.handlers.values()) {
      activeSubscriptions += handlers.size;
    }
    return { totalEvents: this.eventLog.length, eventsByType, activeSubscriptions };
  }
}

export const eventBus = new EventBus();
