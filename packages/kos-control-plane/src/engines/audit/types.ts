export type AuditLevel = 'minimal' | 'standard' | 'verbose';
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';
export interface AuditConfig { level: AuditLevel; retentionDays: number; enableExport: boolean; exportFormat: 'json' | 'csv'; maxLogSize: number; }
export interface AuditEntry {
  id: string; timestamp: number; workspaceId: string; correlationId: string; executionId: string;
  eventType: string; severity: AuditSeverity; data: Record<string, unknown>;
  userId?: string; duration?: number; tokensUsed?: number; cost?: number; model?: string;
  checksum: string; previousChecksum?: string;
}
export interface AuditQuery { workspaceId?: string; correlationId?: string; executionId?: string; eventType?: string; severity?: AuditSeverity[]; dateRange?: { from: number; to: number; }; userId?: string; limit?: number; offset?: number; }
export interface AuditReport {
  id: string; title: string; generatedAt: number; query: AuditQuery;
  totalEntries: number; severityBreakdown: Record<AuditSeverity, number>; eventTypeBreakdown: Record<string, number>;
  totalDuration: number; totalTokensUsed: number; totalCost: number;
  entries: AuditEntry[]; anomalies: Array<{ type: string; description: string; severity: AuditSeverity; affectedEntries: string[]; }>;
}
export interface AuditStats { totalEntries: number; entriesBySeverity: Record<AuditSeverity, number>; entriesByEventType: Record<string, number>; entriesByWorkspace: Record<string, number>; averageDuration: number; totalCost: number; oldestEntry: number; newestEntry: number; storageUsed: number; }
