import { useEffect, useState } from 'react';
import { Shield, Plus, Trash2, Check } from 'lucide-react';
import type { WorkspaceEnvironmentConfig } from '@kos/control-plane';
import { chatService, DEFAULT_WORKSPACE_ID } from '../services/ChatService';

type NeverRule = { action: string; rationale: string; severity: 'critical' | 'high' | 'medium' };
type ConsultRule = { action: string; rationale: string; approver: 'human' | 'automated'; condition?: string };
type AlwaysRule = { action: string; rationale: string; enforceable: boolean };

const EMPTY_MATRIX = { always: [] as AlwaysRule[], consult: [] as ConsultRule[], never: [] as NeverRule[] };

/**
 * Editor de la Matriz de Gobernanza del workspace.
 * Lo que definas aquí se aplica de verdad en la etapa policy-check del
 * pipeline: las reglas NUNCA bloquean, las PREGUNTAR piden tu aprobación.
 */
export default function GovernanceEditor() {
  const [matrix, setMatrix] = useState(EMPTY_MATRIX);
  const [identityName, setIdentityName] = useState('KOS Agent');
  const [identityRole, setIdentityRole] = useState('Estratega de Automatización');
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chatService.getEnvironmentRepository().load(DEFAULT_WORKSPACE_ID).then(stored => {
      if (stored?.governanceMatrix) {
        setMatrix({
          always: stored.governanceMatrix.always as AlwaysRule[],
          consult: stored.governanceMatrix.consult as ConsultRule[],
          never: stored.governanceMatrix.never as NeverRule[],
        });
      }
      if (stored?.identity?.name) setIdentityName(stored.identity.name);
      if (stored?.identity?.role) setIdentityRole(stored.identity.role);
      setLoaded(true);
    });
  }, []);

  const save = async () => {
    const config: WorkspaceEnvironmentConfig = {
      identity: { name: identityName, role: identityRole },
      governanceMatrix: matrix,
    };
    await chatService.getEnvironmentRepository().save(DEFAULT_WORKSPACE_ID, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addNever = () => setMatrix(m => ({ ...m, never: [...m.never, { action: '', rationale: '', severity: 'high' }] }));
  const addConsult = () => setMatrix(m => ({ ...m, consult: [...m.consult, { action: '', rationale: '', approver: 'human' }] }));
  const addAlways = () => setMatrix(m => ({ ...m, always: [...m.always, { action: '', rationale: '', enforceable: true }] }));

  if (!loaded) return null;

  const inputCls = 'px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary text-sm w-full';

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-kos-primary" />
        <h3 className="text-lg font-semibold">Matriz de Gobernanza del Workspace</h3>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Define tus reglas una sola vez: se aplican a cualquier modelo que conectes.
        Las reglas <strong className="text-red-400">NUNCA</strong> bloquean el pipeline;
        las <strong className="text-amber-400">PREGUNTAR</strong> piden tu aprobación antes de continuar.
        Coinciden cuando todas sus palabras clave aparecen en la intención o en el plan.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Nombre del agente</label>
          <input className={inputCls} value={identityName} onChange={e => setIdentityName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Rol</label>
          <input className={inputCls} value={identityRole} onChange={e => setIdentityRole(e.target.value)} />
        </div>
      </div>

      {/* NUNCA */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-red-400">🚫 NUNCA</h4>
          <button onClick={addNever} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"><Plus className="w-4 h-4" /> Añadir</button>
        </div>
        {matrix.never.map((rule, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input className={inputCls} placeholder="Acción prohibida (ej: eliminar backups)" value={rule.action}
              onChange={e => setMatrix(m => ({ ...m, never: m.never.map((r, j) => j === i ? { ...r, action: e.target.value } : r) }))} />
            <input className={inputCls} placeholder="Motivo" value={rule.rationale}
              onChange={e => setMatrix(m => ({ ...m, never: m.never.map((r, j) => j === i ? { ...r, rationale: e.target.value } : r) }))} />
            <select className={inputCls + ' w-32'} value={rule.severity}
              onChange={e => setMatrix(m => ({ ...m, never: m.never.map((r, j) => j === i ? { ...r, severity: e.target.value as NeverRule['severity'] } : r) }))}>
              <option value="critical">critical</option><option value="high">high</option><option value="medium">medium</option>
            </select>
            <button onClick={() => setMatrix(m => ({ ...m, never: m.never.filter((_, j) => j !== i) }))} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {matrix.never.length === 0 && <p className="text-xs text-slate-500">Sin reglas NUNCA propias — se usa la plantilla por defecto hasta que guardes al menos una.</p>}
      </div>

      {/* PREGUNTAR */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-amber-400">✋ PREGUNTAR</h4>
          <button onClick={addConsult} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"><Plus className="w-4 h-4" /> Añadir</button>
        </div>
        {matrix.consult.map((rule, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input className={inputCls} placeholder="Acción que requiere aprobación (ej: datos sensibles)" value={rule.action}
              onChange={e => setMatrix(m => ({ ...m, consult: m.consult.map((r, j) => j === i ? { ...r, action: e.target.value } : r) }))} />
            <input className={inputCls} placeholder="Motivo" value={rule.rationale}
              onChange={e => setMatrix(m => ({ ...m, consult: m.consult.map((r, j) => j === i ? { ...r, rationale: e.target.value } : r) }))} />
            <button onClick={() => setMatrix(m => ({ ...m, consult: m.consult.filter((_, j) => j !== i) }))} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {/* SIEMPRE */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-emerald-400">✅ SIEMPRE</h4>
          <button onClick={addAlways} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"><Plus className="w-4 h-4" /> Añadir</button>
        </div>
        {matrix.always.map((rule, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input className={inputCls} placeholder="Directriz (ej: citar fuentes externas)" value={rule.action}
              onChange={e => setMatrix(m => ({ ...m, always: m.always.map((r, j) => j === i ? { ...r, action: e.target.value } : r) }))} />
            <input className={inputCls} placeholder="Motivo" value={rule.rationale}
              onChange={e => setMatrix(m => ({ ...m, always: m.always.map((r, j) => j === i ? { ...r, rationale: e.target.value } : r) }))} />
            <button onClick={() => setMatrix(m => ({ ...m, always: m.always.filter((_, j) => j !== i) }))} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-kos-primary hover:bg-kos-primary/80 rounded-lg font-medium">
        {saved ? <><Check className="w-4 h-4" /> Guardado — activo en el pipeline</> : 'Guardar matriz'}
      </button>
    </div>
  );
}
