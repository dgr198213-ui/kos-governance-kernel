import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  FileText,
  Activity,
  DollarSign,
  Zap,
  MessageSquare
} from 'lucide-react';

interface ExecutionViewProps {
  executionId: string;
}

export default function ExecutionView({ executionId }: ExecutionViewProps) {
  const [execution, setExecution] = useState<any>(null);

  useEffect(() => {
    setExecution({
      id: executionId,
      workspaceName: 'empresa-acme',
      status: 'completed',
      correlationId: 'corr-123-abc',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3500000).toISOString(),
      totalDuration: 45000,
      intent: 'Generar reporte de análisis de ventas Q1 2024',
      stages: [
        { name: 'intent', status: 'completed', duration: 100, icon: '📥' },
        { name: 'specification', status: 'completed', duration: 5200, icon: '📋' },
        { name: 'environment', status: 'completed', duration: 1800, icon: '🏗️' },
        { name: 'planning', status: 'completed', duration: 3400, icon: '🗺️' },
        { name: 'policy-check', status: 'completed', duration: 800, icon: '🛡️' },
        { name: 'context-resolution', status: 'completed', duration: 2100, icon: '🔍' },
        { name: 'execution', status: 'completed', duration: 18500, icon: '⚡' },
        { name: 'verification', status: 'completed', duration: 8200, icon: '✅' },
        { name: 'approval', status: 'completed', duration: 1500, icon: '👤' },
        { name: 'commit', status: 'completed', duration: 2800, icon: '💾' },
        { name: 'audit', status: 'completed', duration: 600, icon: '📜' }
      ],
      artifacts: [
        { name: 'sales-report-q1-2024.pdf', type: 'document', size: '2.4 MB' },
        { name: 'analysis-data.json', type: 'data', size: '156 KB' },
        { name: 'charts-and-graphs.zip', type: 'archive', size: '5.8 MB' }
      ],
      telemetry: {
        cost: 0.45,
        tokensUsed: 15234,
        verificationScore: 92.5,
        confidence: 0.87,
        model: 'claude-sonnet-4-20250514',
        provider: 'anthropic'
      },
      timeline: [
        { timestamp: Date.now() - 3600000, type: 'IntentReceived', message: 'Intent received from chat', level: 'info' },
        { timestamp: Date.now() - 3595000, type: 'SpecificationCompleted', message: 'Spec generated with 5 quality criteria', level: 'success' },
        { timestamp: Date.now() - 3590000, type: 'EnvironmentLoaded', message: 'Environment loaded with 12 skills', level: 'success' },
        { timestamp: Date.now() - 3580000, type: 'ExecutionStarted', message: 'Execution started with 4 micro-tasks', level: 'info' },
        { timestamp: Date.now() - 3550000, type: 'VerificationCompleted', message: 'Verification score: 92.5/100', level: 'success' }
      ],
      verificationReport: {
        finalScore: 92.5,
        iterations: 2,
        criteriaPassed: 8,
        criteriaTotal: 9,
        issues: [
          { severity: 'medium', description: 'Minor formatting inconsistency in section 3' }
        ]
      }
    });
  }, [executionId]);

  if (!execution) return null;

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-kos-success" />;
      case 'failed': return <XCircle className="w-5 h-5 text-kos-error" />;
      case 'running': return <Loader2 className="w-5 h-5 text-kos-warning animate-spin" />;
      default: return <Clock className="w-5 h-5 text-slate-600" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Execution Details</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                execution.status === 'completed' 
                  ? 'text-kos-success bg-kos-success/10' 
                  : execution.status === 'failed'
                  ? 'text-kos-error bg-kos-error/10'
                  : 'text-kos-warning bg-kos-warning/10'
              }`}>
                {execution.status}
              </span>
            </div>
            <p className="text-slate-400">{execution.intent}</p>
            <p className="text-sm text-slate-500 mt-1">
              Correlation ID: {execution.correlationId}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-kos-primary" />
              <div>
                <p className="text-slate-400 text-xs">Cost</p>
                <p className="text-xl font-bold">${execution.telemetry.cost.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-kos-secondary" />
              <div>
                <p className="text-slate-400 text-xs">Duration</p>
                <p className="text-xl font-bold">{formatDuration(execution.totalDuration)}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-kos-success" />
              <div>
                <p className="text-slate-400 text-xs">Tokens</p>
                <p className="text-xl font-bold">{execution.telemetry.tokensUsed.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-kos-success" />
              <div>
                <p className="text-slate-400 text-xs">Verification</p>
                <p className="text-xl font-bold text-kos-success">{execution.telemetry.verificationScore}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline Stages */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Pipeline Stages
            </h3>
            <div className="space-y-3">
              {execution.stages.map((stage: any, idx: number) => (
                <div 
                  key={idx}
                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="text-2xl">{stage.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium capitalize">{stage.name.replace('-', ' ')}</p>
                  </div>
                  <div className="text-sm text-slate-400">
                    {formatDuration(stage.duration)}
                  </div>
                  {getStageIcon(stage.status)}
                </div>
              ))}
            </div>
          </div>

          {/* Artifacts */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generated Artifacts
            </h3>
            <div className="space-y-2">
              {execution.artifacts.map((artifact: any, idx: number) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-kos-primary" />
                    <div>
                      <p className="font-medium">{artifact.name}</p>
                      <p className="text-xs text-slate-400">{artifact.type}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-400">{artifact.size}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Telemetry */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4">Telemetry</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Verification Score</span>
                  <span className="font-medium">{execution.telemetry.verificationScore}/100</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className="bg-kos-success h-2 rounded-full transition-all" 
                    style={{ width: `${execution.telemetry.verificationScore}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Confidence</span>
                  <span className="font-medium">{(execution.telemetry.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className="bg-kos-primary h-2 rounded-full transition-all" 
                    style={{ width: `${execution.telemetry.confidence * 100}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="text-sm text-slate-400 mb-1">Model</p>
                <p className="font-medium">{execution.telemetry.model}</p>
                <p className="text-xs text-slate-500">{execution.telemetry.provider}</p>
              </div>
            </div>
          </div>

          {/* Verification Report */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4">Verification Report</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Iterations</span>
                <span className="font-medium">{execution.verificationReport.iterations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Criteria Passed</span>
                <span className="font-medium text-kos-success">
                  {execution.verificationReport.criteriaPassed}/{execution.verificationReport.criteriaTotal}
                </span>
              </div>
              {execution.verificationReport.issues.length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <p className="text-sm text-slate-400 mb-2">Issues Found</p>
                  {execution.verificationReport.issues.map((issue: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        issue.severity === 'critical' ? 'bg-kos-error' :
                        issue.severity === 'high' ? 'bg-kos-error' :
                        issue.severity === 'medium' ? 'bg-kos-warning' :
                        'bg-slate-400'
                      }`} />
                      <span className="text-slate-300">{issue.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Timeline
            </h3>
            <div className="space-y-3">
              {execution.timeline.map((event: any, idx: number) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${
                      event.level === 'success' ? 'bg-kos-success' :
                      event.level === 'error' ? 'bg-kos-error' :
                      event.level === 'warning' ? 'bg-kos-warning' :
                      'bg-slate-400'
                    }`} />
                    {idx < execution.timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-slate-800 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="text-sm font-medium">{event.message}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
