import { 
  LayoutDashboard, 
  FolderKanban, 
  Settings, 
  Zap,
  ChevronRight,
  MessageSquare
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'workspace' | 'execution' | 'settings' | 'chat') => void;
  onSelectWorkspace: (workspaceId: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'chat', label: 'KOS Chat', icon: MessageSquare, highlight: true },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workspace', label: 'Workspaces', icon: FolderKanban },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-kos-primary to-kos-secondary rounded-lg flex items-center justify-center shadow-lg shadow-kos-primary/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">KOS Studio</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Governance Kernel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-kos-primary text-white shadow-lg shadow-kos-primary/25'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'group-hover:text-kos-primary transition-colors'}`} />
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="w-2 h-2 bg-kos-success rounded-full animate-pulse"></div>
          <div className="text-[10px]">
            <p className="text-slate-300 font-bold">KERNEL ONLINE</p>
            <p className="text-slate-500">v0.2.0 • Karpathy Method</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
