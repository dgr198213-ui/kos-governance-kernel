import { useState, useEffect } from 'react';
import { 
  Play, 
  Settings, 
  FileText, 
  Shield, 
  Zap,
  Plus,
  MoreVertical
} from 'lucide-react';

interface WorkspaceViewProps {
  workspaceId: string;
  onSelectExecution: (executionId: string) => void;
}

export default function WorkspaceView({ workspaceId, onSelectExecution }: WorkspaceViewProps) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'executions' | 'skills' | 'governance'>('overview');

  useEffect(() => {
    setWorkspace({
      id: workspaceId,
      name: 'empresa-acme',
      description: 'Workspace de automatización para Acme Corp',
      status: 'active',
      identity: {
        name: 'KOS Agent',
        role: 'Estratega de Automatización',
        organization: 'Acme Corp'
      },
      stats: {
        totalExecutions: 45,
        successRate: 96.2,
        totalCost: 23.45,
        avgScore: 89.7
      }
    });

    setExecutions([
      {
        id: 'exec-1',
        status: 'completed',
        rawInput: 'Generar reporte Q1',
        verificationScore: 92.5,
        startedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'exec-2',
        status: 'completed',
        rawInput: 'Analizar tendencias',
        verificationScore: 88.2,
        startedAt: new Date(Date.now() - 7200000).toISOString()
      }
    ]);
  }, [workspaceId]);

  if (!workspace) return null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-kos-primary to-kos-secondary rounded-xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{workspace.name}</h1>
              <p className="text-slate-400">{workspace.description}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-kos-primary hover:bg-kos-primary/90 rounded-lg font-medium transition-colors flex items-center gap-2">
              <Play className="w-4 h-4" />
              New Execution
            </button>
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'executions', label: 'Executions', icon: Play },
            { id: 'skills', label: 'Skills', icon: Zap },
            { id: 'governance', label: 'Governance', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-kos-primary text-kos-primary'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <p className="text-slate-400 text-sm mb-2">Total Executions</p>
              <p className="text-3xl font-bold">{workspace.stats.totalExecutions}</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <p className="text-slate-400 text-sm mb-2">Success Rate</p>
              <p className="text-3xl font-bold text-kos-success">{workspace.stats.successRate}%</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <p className="text-slate-400 text-sm mb-2">Total Cost</p>
              <p className="text-3xl font-bold">${workspace.stats.totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <p className="text-slate-400 text-sm mb-2">Avg Score</p>
              <p className="text-3xl font-bold text-kos-primary">{workspace.stats.avgScore}</p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4">Agent Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Name</p>
                <p className="font-medium">{workspace.identity.name}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Role</p>
                <p className="font-medium">{workspace.identity.role}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Organization</p>
                <p className="font-medium">{workspace.identity.organization}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'executions' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Executions</h3>
            <button className="px-3 py-1.5 bg-kos-primary hover:bg-kos-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
          <div className="divide-y divide-slate-800">
            {executions.map(exec => (
              <div 
                key={exec.id} 
                className="p-6 hover:bg-slate-800/30 cursor-pointer transition-colors"
                onClick={() => onSelectExecution(exec.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium mb-1">{exec.rawInput}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(exec.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Score</p>
                      <p className="font-bold text-kos-success">{exec.verificationScore}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      exec.status === 'completed' 
                        ? 'text-kos-success bg-kos-success/10' 
                        : 'text-kos-error bg-kos-error/10'
                    }`}>
                      {exec.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Skills Catalog</h3>
            <button className="px-3 py-1.5 bg-kos-primary hover:bg-kos-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Install Skill
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Data Analysis', category: 'analytics', version: '1.2.0', runs: 23 },
              { name: 'Report Generator', category: 'reporting', version: '2.0.1', runs: 45 },
              { name: 'Code Review', category: 'development', version: '1.0.0', runs: 12 }
            ].map((skill, idx) => (
              <div key={idx} className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-kos-primary transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold mb-1">{skill.name}</h4>
                    <p className="text-xs text-slate-400">v{skill.version}</p>
                  </div>
                  <button className="text-slate-400 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{skill.category}</span>
                  <span className="text-kos-primary">{skill.runs} runs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'governance' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-kos-success" />
              Always Execute
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-kos-success mt-2" />
                <span>Ejecutar Skills validadas del catálogo</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-kos-success mt-2" />
                <span>Formatear documentos según la Spec</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-kos-success mt-2" />
                <span>Citar fuentes externas</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-kos-warning" />
              Consult Before
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-kos-warning mt-2" />
                <span>Modificación de presupuestos o límites de gasto</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-kos-warning mt-2" />
                <span>Cambios en arquitectura de datos</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-kos-warning mt-2" />
                <span>Uso de datos sensibles</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-kos-error" />
              Never Execute
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-kos-error mt-2" />
                <span>Generar contenido que ignore Brand Voice</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-kos-error mt-2" />
                <span>Usar datos de clientes no anonimizados</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-kos-error mt-2" />
                <span>Saltarse bucle de verificación multi-agente</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
