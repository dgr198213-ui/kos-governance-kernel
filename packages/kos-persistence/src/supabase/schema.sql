-- ============================================================================
-- KOS Governance Kernel - Supabase Schema v0.2.0
-- Persistencia completa para Workspaces, Executions, Audit, Skills, Knowledge
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WORKSPACES
-- ============================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
  identity_name VARCHAR(255),
  identity_role VARCHAR(255),
  identity_organization VARCHAR(255),
  identity_directives JSONB,
  identity_personality JSONB,
  governance_always JSONB DEFAULT '[]',
  governance_consult JSONB DEFAULT '[]',
  governance_never JSONB DEFAULT '[]',
  require_human_approval BOOLEAN DEFAULT true,
  max_cost_per_execution DECIMAL(10, 2) DEFAULT 10.00,
  allowed_models JSONB DEFAULT '[]',
  data_retention_days INTEGER DEFAULT 90,
  min_verification_score INTEGER DEFAULT 85,
  enable_multi_agent_audit BOOLEAN DEFAULT true,
  feedback_loops INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_status ON workspaces(status);
CREATE INDEX idx_workspaces_created_at ON workspaces(created_at);

-- ============================================
-- EXECUTIONS
-- ============================================
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  correlation_id VARCHAR(255) NOT NULL,
  intent_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  raw_input TEXT NOT NULL,
  source VARCHAR(50),
  status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_stage VARCHAR(50),
  spec_objective TEXT,
  spec_extracted_context JSONB,
  spec_quality_criteria JSONB,
  spec_execution_plan JSONB,
  execution_artifacts JSONB DEFAULT '[]',
  execution_metrics JSONB,
  verification_score DECIMAL(5, 2),
  verification_passed BOOLEAN,
  verification_iterations INTEGER,
  verification_report JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_duration INTEGER,
  total_tokens_used INTEGER,
  total_cost DECIMAL(10, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_executions_workspace_id ON executions(workspace_id);
CREATE INDEX idx_executions_correlation_id ON executions(correlation_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_started_at ON executions(started_at);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  correlation_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  severity VARCHAR(50) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  event_data JSONB,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  duration INTEGER,
  tokens_used INTEGER,
  cost DECIMAL(10, 4),
  model VARCHAR(255),
  checksum VARCHAR(255) NOT NULL,
  previous_checksum VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_execution_id ON audit_logs(execution_id);
CREATE INDEX idx_audit_logs_correlation_id ON audit_logs(correlation_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================
-- SKILLS
-- ============================================
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  author VARCHAR(255),
  manifest JSONB NOT NULL,
  policy JSONB,
  prompts JSONB,
  tools JSONB,
  memory_config JSONB,
  tests JSONB,
  verifier JSONB,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'published', 'deprecated')),
  total_runs INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0,
  average_duration INTEGER DEFAULT 0,
  average_cost DECIMAL(10, 4) DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name, version)
);

CREATE INDEX idx_skills_workspace_id ON skills(workspace_id);
CREATE INDEX idx_skills_status ON skills(status);
CREATE INDEX idx_skills_category ON skills(category);

-- ============================================
-- KNOWLEDGE BASE
-- ============================================
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  content TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_workspace_id ON knowledge_base(workspace_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspaces" ON workspaces FOR SELECT USING (true);
CREATE POLICY "Users can insert workspaces" ON workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update workspaces" ON workspaces FOR UPDATE USING (true);

-- ============================================
-- VIEWS
-- ============================================
CREATE VIEW workspace_stats AS
SELECT 
  w.id, w.name,
  COUNT(DISTINCT e.id) as total_executions,
  COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_executions,
  COUNT(DISTINCT CASE WHEN e.status = 'failed' THEN e.id END) as failed_executions,
  COALESCE(SUM(e.total_cost), 0) as total_cost,
  COALESCE(SUM(e.total_tokens_used), 0) as total_tokens,
  COALESCE(AVG(e.verification_score), 0) as avg_verification_score
FROM workspaces w
LEFT JOIN executions e ON w.id = e.workspace_id
GROUP BY w.id, w.name;

CREATE VIEW recent_executions AS
SELECT 
  e.id, e.workspace_id, w.name as workspace_name, e.status, e.raw_input,
  e.verification_score, e.total_duration, e.total_cost, e.started_at, e.completed_at
FROM executions e
JOIN workspaces w ON e.workspace_id = w.id
ORDER BY e.started_at DESC
LIMIT 100;
