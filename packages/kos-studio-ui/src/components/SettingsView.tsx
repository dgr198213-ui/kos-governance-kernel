import { useState } from 'react';
import { chatService } from '../services/ChatService';
import GovernanceEditor from './GovernanceEditor';
import KnowledgeEditor from './KnowledgeEditor';
import AccountPanel from './AccountPanel';
import { 
  Database, 
  Key, 
  Globe, 
  Shield,
  Save,
  Check
} from 'lucide-react';

export default function SettingsView() {
  const [activeSection, setActiveSection] = useState<'providers' | 'database' | 'governance' | 'knowledge' | 'general'>('providers');
  const [saved, setSaved] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [model, setModel] = useState('meta-llama/llama-3.1-8b-instruct:free');
  const [liveMode, setLiveMode] = useState(chatService.isLive());

  const handleSave = () => {
    if (activeSection === 'providers') {
      chatService.configureProviders({ openRouterApiKey: openRouterKey, model });
      setLiveMode(chatService.isLive());
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDisconnect = () => {
    chatService.resetToSimulated();
    setOpenRouterKey('');
    setLiveMode(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-slate-400">Configure your KOS instance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {[
              { id: 'providers', label: 'Providers', icon: Globe },
              { id: 'database', label: 'Database', icon: Database },
              { id: 'governance', label: 'Governance', icon: Shield },
              { id: 'knowledge', label: 'Knowledge', icon: Database },
              { id: 'general', label: 'General', icon: Key }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-kos-primary text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="lg:col-span-3">
          {activeSection === 'providers' && (
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-6">Provider Configuration</h3>

              <div className="mb-6 p-4 bg-amber-950/40 border border-amber-800/50 rounded-lg text-sm text-amber-200">
                <p className="font-medium mb-1">🔑 Modo BYOK (Bring Your Own Key)</p>
                <p>
                  Tu clave de OpenRouter se usa <strong>solo en memoria de esta pestaña</strong> para
                  que el Executor llame al modelo directamente: no se guarda en localStorage, cookies
                  ni ningún servidor. Al recargar la página se descarta. Para producción, usa un
                  backend/proxy con <code className="mx-1 px-1 bg-slate-800 rounded">OPENROUTER_API_KEY</code>
                  (ver <code className="px-1 bg-slate-800 rounded">.env.example</code>).
                </p>
                <p className="mt-2">
                  Estado: {liveMode
                    ? <span className="text-emerald-300 font-medium">● Ejecución real activa ({chatService.getActiveModel()})</span>
                    : <span className="text-slate-300">○ Modo simulado (sin clave)</span>}
                  {liveMode && (
                    <button onClick={handleDisconnect} className="ml-3 underline text-amber-300 hover:text-amber-100">
                      Desconectar y borrar clave
                    </button>
                  )}
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">OpenRouter</h4>
                      <p className="text-sm text-slate-400">Access to multiple LLM providers including free models</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kos-primary"></div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">API Key</label>
                    <input
                      type="password"
                      placeholder="sk-or-..."
                      value={openRouterKey}
                      onChange={(e) => setOpenRouterKey(e.target.value)}
                      autoComplete="off"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Modelo</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="meta-llama/llama-3.1-8b-instruct:free"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Base URL</label>
                    <input
                      type="text"
                      defaultValue="https://openrouter.ai/api/v1"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Anthropic</h4>
                      <p className="text-sm text-slate-400">Claude 3.5 Sonnet, Claude 3 Opus</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kos-primary"></div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">API Key</label>
                    <input
                      type="password"
                      placeholder="sk-ant-..."
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="mt-6 px-6 py-2 bg-kos-primary hover:bg-kos-primary/90 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeSection === 'database' && (
            <AccountPanel />
          )}
          

          {activeSection === 'governance' && (
            <GovernanceEditor />
          )}

          {activeSection === 'knowledge' && (
            <KnowledgeEditor />
          )}

          {activeSection === 'general' && (
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-6">General Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Default Model</label>
                  <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary">
                    <option>claude-sonnet-4-20250514</option>
                    <option>gpt-4o</option>
                    <option>gemini-2.5-pro</option>
                    <option>meta-llama/llama-3.1-8b-instruct:free</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Audit Retention (days)</label>
                  <input
                    type="number"
                    defaultValue={90}
                    min={1}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium">Enable Telemetry</p>
                    <p className="text-sm text-slate-400">Collect usage metrics and analytics</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kos-primary"></div>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="mt-6 px-6 py-2 bg-kos-primary hover:bg-kos-primary/90 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
