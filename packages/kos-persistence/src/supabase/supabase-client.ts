import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export class SupabaseKOSClient {
  private client: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.anonKey, {
      auth: { autoRefreshToken: true, persistSession: true }
    });
  }

  // WORKSPACES
  async createWorkspace(data: {
    name: string; description?: string;
    identity?: { name: string; role: string; organization: string; directives?: string[]; personality?: Record<string, unknown>; };
    policies?: { governance?: { always?: string[]; consult?: string[]; never?: string[]; }; security?: { requireHumanApproval?: boolean; maxCostPerExecution?: number; allowedModels?: string[]; }; };
  }) {
    const { data: workspace, error } = await this.client.from('workspaces').insert({
      name: data.name, description: data.description,
      identity_name: data.identity?.name, identity_role: data.identity?.role,
      identity_organization: data.identity?.organization,
      identity_directives: data.identity?.directives, identity_personality: data.identity?.personality,
      governance_always: data.policies?.governance?.always || [],
      governance_consult: data.policies?.governance?.consult || [],
      governance_never: data.policies?.governance?.never || [],
      require_human_approval: data.policies?.security?.requireHumanApproval ?? true,
      max_cost_per_execution: data.policies?.security?.maxCostPerExecution ?? 10.00,
      allowed_models: data.policies?.security?.allowedModels || []
    }).select().single();
    if (error) throw error;
    return workspace;
  }

  async getWorkspace(id: string) {
    const { data, error } = await this.client.from('workspaces').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async listWorkspaces(filters?: { status?: string }) {
    let query = this.client.from('workspaces').select('*');
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async updateWorkspace(id: string, updates: Record<string, unknown>) {
    const { data, error } = await this.client.from('workspaces').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  // EXECUTIONS
  async createExecution(data: { workspaceId: string; correlationId: string; intentId: string; userId?: string; rawInput: string; source?: string; }) {
    const { data: execution, error } = await this.client.from('executions').insert({
      workspace_id: data.workspaceId, correlation_id: data.correlationId,
      intent_id: data.intentId, user_id: data.userId, raw_input: data.rawInput,
      source: data.source, status: 'running'
    }).select().single();
    if (error) throw error;
    return execution;
  }

  async updateExecution(id: string, updates: Record<string, unknown>) {
    const { data, error } = await this.client.from('executions').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async getExecution(id: string) {
    const { data, error } = await this.client.from('executions').select('*, workspace:workspaces(name)').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async listExecutions(filters?: { workspaceId?: string; status?: string; limit?: number }) {
    let query = this.client.from('executions').select('*, workspace:workspaces(name)');
    if (filters?.workspaceId) query = query.eq('workspace_id', filters.workspaceId);
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('started_at', { ascending: false }).limit(filters?.limit || 50);
    if (error) throw error;
    return data;
  }

  // AUDIT LOGS
  async createAuditLog(data: {
    workspaceId: string; executionId?: string; correlationId: string;
    eventType: string; severity?: string; eventData?: Record<string, unknown>;
    userId?: string; duration?: number; tokensUsed?: number; cost?: number; model?: string;
    checksum: string; previousChecksum?: string;
  }) {
    const { data: log, error } = await this.client.from('audit_logs').insert({
      workspace_id: data.workspaceId, execution_id: data.executionId,
      correlation_id: data.correlationId, event_type: data.eventType,
      severity: data.severity || 'info', event_data: data.eventData,
      user_id: data.userId, duration: data.duration, tokens_used: data.tokensUsed,
      cost: data.cost, model: data.model, checksum: data.checksum,
      previous_checksum: data.previousChecksum
    }).select().single();
    if (error) throw error;
    return log;
  }

  async getAuditLogs(filters: { correlationId?: string; executionId?: string; eventType?: string; severity?: string[]; limit?: number }) {
    let query = this.client.from('audit_logs').select('*');
    if (filters.correlationId) query = query.eq('correlation_id', filters.correlationId);
    if (filters.executionId) query = query.eq('execution_id', filters.executionId);
    if (filters.eventType) query = query.eq('event_type', filters.eventType);
    if (filters.severity && filters.severity.length > 0) query = query.in('severity', filters.severity);
    const { data, error } = await query.order('timestamp', { ascending: false }).limit(filters.limit || 100);
    if (error) throw error;
    return data;
  }

  // SKILLS
  async createSkill(data: {
    workspaceId: string; name: string; version: string; description?: string;
    category?: string; author?: string; manifest: Record<string, unknown>;
    policy?: Record<string, unknown>; prompts?: Record<string, unknown>; tools?: Record<string, unknown>;
  }) {
    const { data: skill, error } = await this.client.from('skills').insert({
      workspace_id: data.workspaceId, name: data.name, version: data.version,
      description: data.description, category: data.category, author: data.author,
      manifest: data.manifest, policy: data.policy, prompts: data.prompts, tools: data.tools
    }).select().single();
    if (error) throw error;
    return skill;
  }

  async listSkills(workspaceId: string, filters?: { status?: string; category?: string }) {
    let query = this.client.from('skills').select('*').eq('workspace_id', workspaceId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category) query = query.eq('category', filters.category);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data;
  }

  // KNOWLEDGE BASE
  async addKnowledgeItem(data: { workspaceId: string; title: string; category?: string; content: string; tags?: string[]; }) {
    const { data: item, error } = await this.client.from('knowledge_base').insert({
      workspace_id: data.workspaceId, title: data.title, category: data.category,
      content: data.content, tags: data.tags || []
    }).select().single();
    if (error) throw error;
    return item;
  }

  async searchKnowledge(workspaceId: string, query: string) {
    const { data, error } = await this.client.from('knowledge_base').select('*')
      .eq('workspace_id', workspaceId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(20);
    if (error) throw error;
    return data;
  }

  // STATISTICS
  async getWorkspaceStats(workspaceId: string) {
    const { data, error } = await this.client.from('workspace_stats').select('*').eq('id', workspaceId).single();
    if (error) throw error;
    return data;
  }

  async getRecentExecutions(workspaceId?: string, limit = 10) {
    let query = this.client.from('recent_executions').select('*');
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query.limit(limit);
    if (error) throw error;
    return data;
  }
}
