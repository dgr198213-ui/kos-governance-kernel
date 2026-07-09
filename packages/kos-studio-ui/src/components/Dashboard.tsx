import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  onSelectWorkspace?: (workspaceId: string) => void;
  onSelectExecution: (executionId: string) => void;
}

export default function Dashboard({ onSelectExecution }: DashboardProps) {
  const [stats] = useState({
    totalExecutions: 127,
    successRate: 94.5,
    totalCost: 45.67,
    avgScore: 87.3
  });

  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);

  useEffect(() => {
    setRecentExecutions([
      {
        id: 'exec-1',
        workspaceName: 'empresa-acme',
        status: 'completed',
        rawInput: 'Generar reporte Q1 2024',
        verificationScore: 92.5,
        totalDuration: 45000,
        totalCost: 0.45,
        startedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'exec-2',
        workspaceName: 'startup-tech',
        status: 'completed',
        rawInput: 'Analizar tendencias de mercado',
        verificationScore: 88.2,
        totalDuration: 32000,
        totalCost: 0.32,
        startedAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'exec-3',
        workspaceName: 'empresa-acme',
        status: 'failed',
        rawInput: 'Automatizar proceso de facturación',
        verificationScore: 0,
        totalDuration: 12000,
        totalCost: 0.12,
        startedAt: new Date(Date.now() - 10800000).toISOString()
      },
      {
        id: 'exec-4',
        workspaceName: 'consultora-digital',
        status: 'completed',
        rawInput: 'Crear estrategia de contenido LinkedIn',
        verificationScore: 95.1,
        totalDuration: 28000,
        totalCost: 0.28,
        startedAt: new Date(Date.now() - 14400000).toISOString()
      }
    ]);
  }, []);

  const chartData = [
    { name: 'Lun', executions: 12, cost: 4.5, score: 85 },
    { name: 'Mar', executions: 19, cost: 7.2, score: 87 },
    { name: 'Mié', executions: 15, cost: 5.8, score: 86 },
    { name: 'Jue', executions: 22, cost: 8.9, score: 89 },
    { name: 'Vie', executions: 28, cost: 10.5, score: 91 },
    { name: 'Sáb', executions: 8, cost: 3.2, score: 84 },
    { name: 'Dom', executions: 5, cost: 2.1, score: 82 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-kos-success bg-kos-success/10';
      case 'failed': return 'text-kos-error bg-kos-error/10';
      case 'running': return 'text-kos-warning bg-kos-warning/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-slate-400">Vista general del sistema KOS - Método Karpathy</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Activity}
          label="Total Executions"
          value={stats.totalExecutions.toString()}
          trend="+12%"
          trendUp={true}
          color="blue"
        />
        <StatCard
          icon={CheckCircle2}
          label="Success Rate"
          value={`${stats.successRate}%`}
          trend="+2.3%"
          trendUp={true}
          color="green"
        />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={`$${stats.totalCost.toFixed(2)}`}
          trend="-5%"
          trendUp={false}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Verification Score"
          value={stats.avgScore.toFixed(1)}
          trend="+4.1"
          trendUp={true}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Executions This Week</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="executions" 
                stroke="#6366f1" 
                fillOpacity={1}
                fill="url(#colorExecutions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Verification Score Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[70, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="bg-slate-900 rounded-xl border border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold">Recent Executions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Workspace</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Intent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentExecutions.map((exec) => (
                <tr 
                  key={exec.id} 
                  className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  onClick={() => onSelectExecution(exec.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-kos-primary" />
                      <span className="text-sm font-medium">{exec.workspaceName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-300 max-w-xs truncate">{exec.rawInput}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exec.status)}`}>
                      {exec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-kos-success h-2 rounded-full" 
                          style={{ width: `${exec.verificationScore}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-300">{exec.verificationScore}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {formatDuration(exec.totalDuration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    ${exec.totalCost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(exec.startedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: any;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ icon: Icon, label, value, trend, trendUp, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm ${trendUp ? 'text-kos-success' : 'text-kos-error'}`}>
          {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{trend}</span>
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-sm mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
