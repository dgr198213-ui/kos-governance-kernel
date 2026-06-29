import { eventBus } from '../../event-bus/index.js';
import type { KOSBaseEvent } from '../../event-bus/types.js';
import type { AuditConfig, AuditEntry, AuditQuery, AuditReport, AuditStats, AuditSeverity } from './types.js';

export class AuditEngine {
  private entries: AuditEntry[] = [];
  private lastChecksum: string = '';
  private defaultConfig: AuditConfig = { level: 'standard', retentionDays: 90, enableExport: true, exportFormat: 'json', maxLogSize: 1000 };

  constructor(private config: Partial<AuditConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.subscribe('*', (event: KOSBaseEvent) => { this.logEvent(event); });
  }

  async logEvent(event: KOSBaseEvent): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: this.generateId(), timestamp: event.timestamp, workspaceId: event.workspaceId,
      correlationId: event.correlationId, executionId: event.executionId, eventType: event.type,
      severity: this.determineSeverity(event), data: event.payload,
      duration: event.metadata?.duration, tokensUsed: event.metadata?.tokensUsed, cost: event.metadata?.cost, model: event.metadata?.model,
      checksum: this.calculateChecksum(event), previousChecksum: this.lastChecksum
    };
    this.entries.push(entry);
    this.lastChecksum = entry.checksum;
    this.applyRetention();
    return entry;
  }

  private determineSeverity(event: KOSBaseEvent): AuditSeverity {
    if (event.type.includes('Failed') || event.type.includes('Blocked')) return 'error';
    if (event.type.includes('Warning') || event.type.includes('Violation')) return 'warning';
    return 'info';
  }

  private calculateChecksum(event: KOSBaseEvent): string {
    const data = JSON.stringify({ id: event.id, type: event.type, timestamp: event.timestamp, payload: event.payload });
    let hash = 0;
    for (let i = 0; i < data.length; i++) { hash = ((hash << 5) - hash) + data.charCodeAt(i); hash = hash & hash; }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  async search(query: AuditQuery): Promise<AuditEntry[]> {
    let results = [...this.entries];
    if (query.workspaceId) results = results.filter(e => e.workspaceId === query.workspaceId);
    if (query.correlationId) results = results.filter(e => e.correlationId === query.correlationId);
    if (query.executionId) results = results.filter(e => e.executionId === query.executionId);
    if (query.eventType) results = results.filter(e => e.eventType === query.eventType);
    if (query.severity && query.severity.length > 0) results = results.filter(e => query.severity!.includes(e.severity));
    if (query.dateRange) results = results.filter(e => e.timestamp >= query.dateRange!.from && e.timestamp <= query.dateRange!.to);
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return results.slice(offset, offset + limit);
  }

  async getExecutionChain(correlationId: string): Promise<AuditEntry[]> {
    return this.entries.filter(e => e.correlationId === correlationId).sort((a, b) => a.timestamp - b.timestamp);
  }

  async generateReport(query: AuditQuery, title: string): Promise<AuditReport> {
    const entries = await this.search({ ...query, limit: 10000 });
    const severityBreakdown: Record<AuditSeverity, number> = { info: 0, warning: 0, error: 0, critical: 0 };
    const eventTypeBreakdown: Record<string, number> = {};
    let totalDuration = 0, totalTokensUsed = 0, totalCost = 0;
    for (const entry of entries) {
      severityBreakdown[entry.severity]++;
      eventTypeBreakdown[entry.eventType] = (eventTypeBreakdown[entry.eventType] || 0) + 1;
      if (entry.duration) totalDuration += entry.duration;
      if (entry.tokensUsed) totalTokensUsed += entry.tokensUsed;
      if (entry.cost) totalCost += entry.cost;
    }
    return { id: this.generateId(), title, generatedAt: Date.now(), query, totalEntries: entries.length, severityBreakdown, eventTypeBreakdown, totalDuration, totalTokensUsed, totalCost, entries, anomalies: [] };
  }

  async getStats(): Promise<AuditStats> {
    const entriesBySeverity: Record<AuditSeverity, number> = { info: 0, warning: 0, error: 0, critical: 0 };
    const entriesByEventType: Record<string, number> = {};
    const entriesByWorkspace: Record<string, number> = {};
    let totalDuration = 0, totalCost = 0, oldestEntry = Date.now(), newestEntry = 0;
    for (const entry of this.entries) {
      entriesBySeverity[entry.severity]++;
      entriesByEventType[entry.eventType] = (entriesByEventType[entry.eventType] || 0) + 1;
      entriesByWorkspace[entry.workspaceId] = (entriesByWorkspace[entry.workspaceId] || 0) + 1;
      if (entry.duration) totalDuration += entry.duration;
      if (entry.cost) totalCost += entry.cost;
      if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
      if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
    }
    return { totalEntries: this.entries.length, entriesBySeverity, entriesByEventType, entriesByWorkspace, averageDuration: this.entries.length > 0 ? totalDuration / this.entries.length : 0, totalCost, oldestEntry: this.entries.length > 0 ? oldestEntry : 0, newestEntry, storageUsed: JSON.stringify(this.entries).length };
  }

  async export(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'json') return JSON.stringify(this.entries, null, 2);
    const headers = ['id', 'timestamp', 'workspaceId', 'correlationId', 'executionId', 'eventType', 'severity'];
    const rows = this.entries.map(e => [e.id, e.timestamp, e.workspaceId, e.correlationId, e.executionId, e.eventType, e.severity]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private applyRetention(): void {
    const retentionMs = (this.config.retentionDays || 90) * 24 * 60 * 60 * 1000;
    this.entries = this.entries.filter(e => e.timestamp > Date.now() - retentionMs);
  }

  private generateId(): string { return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`; }
}
