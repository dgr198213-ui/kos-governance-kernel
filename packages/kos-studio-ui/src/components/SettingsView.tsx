import { useState } from 'react';
import { 
  Database, 
  Key, 
  Globe, 
  Shield,
  Save,
  Check
} from 'lucide-react';

export default function SettingsView() {
  const [activeSection, setActiveSection] = useState<'providers' | 'database' | 'governance' | 'general'>('providers');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-6">Supabase Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Project URL</label>
                  <input
                    type="text"
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Anon Key</label>
                  <input
                    type="password"
                    placeholder="eyJhbGc..."
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Service Role Key (Optional)</label>
                  <input
                    type="password"
                    placeholder="eyJhbGc..."
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                  />
                  <p className="text-xs text-slate-500 mt-1">Required for admin operations</p>
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

          {activeSection === 'governance' && (
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-6">Governance Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Default Verification Threshold</label>
                  <input
                    type="number"
                    defaultValue={85}
                    min={0}
                    max={100}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum score to pass verification (0-100)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Max Feedback Loops</label>
                  <input
                    type="number"
                    defaultValue={3}
                    min={1}
                    max={10}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary"
                  />
                  <p className="text-xs text-slate-500 mt-1">Maximum verification iterations per execution</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium">Require Human Approval</p>
                    <p className="text-sm text-slate-400">Always require human approval before commit</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kos-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium">Enable Multi-Agent Audit</p>
                    <p className="text-sm text-slate-400">Use second model for cross-verification</p>
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
