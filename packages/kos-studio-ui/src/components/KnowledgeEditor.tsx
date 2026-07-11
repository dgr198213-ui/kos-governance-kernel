import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Check } from 'lucide-react';
import type { WorkspaceEnvironmentConfig } from '@kos/control-plane';
import { chatService, DEFAULT_WORKSPACE_ID } from '../services/ChatService';

interface KnowledgeItemDraft {
  id: string;
  title: string;
  category: 'process' | 'client' | 'technical' | 'policy' | 'vision';
  content: string;
  tags: string;
}

/**
 * Editor de la documentación del workspace. Lo que guardes aquí se inyecta
 * como contexto real en el planner (Spec) y en cada micro-tarea (Executor):
 * define tus métodos de trabajo UNA vez y valen para cualquier modelo.
 */
export default function KnowledgeEditor() {
  const [items, setItems] = useState<KnowledgeItemDraft[]>([]);
  const [stored, setStored] = useState<WorkspaceEnvironmentConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chatService.getEnvironmentRepository().load(DEFAULT_WORKSPACE_ID).then(config => {
      setStored(config);
      if (config?.knowledgeItems) {
        setItems(config.knowledgeItems.map(k => ({
          id: k.id, title: k.title, category: k.category, content: k.content, tags: k.tags.join(', '),
        })));
      }
      setLoaded(true);
    });
  }, []);

  const save = async () => {
    const config: WorkspaceEnvironmentConfig = {
      ...(stored ?? {}),
      knowledgeItems: items
        .filter(i => i.title.trim() && i.content.trim())
        .map(i => ({
          id: i.id,
          title: i.title.trim(),
          category: i.category,
          content: i.content,
          tags: i.tags.split(',').map(t => t.trim()).filter(Boolean),
          accessCount: 0,
        })),
    };
    await chatService.getEnvironmentRepository().save(DEFAULT_WORKSPACE_ID, config);
    setStored(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addItem = () => setItems(list => [...list, {
    id: `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: '', category: 'process', content: '', tags: '',
  }]);

  const update = (id: string, patch: Partial<KnowledgeItemDraft>) =>
    setItems(list => list.map(i => i.id === id ? { ...i, ...patch } : i));

  if (!loaded) return null;

  const inputCls = 'px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary text-sm w-full';

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-kos-primary" />
        <h3 className="text-lg font-semibold">Documentación del Workspace</h3>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Tus métodos de trabajo, procesos y contexto de negocio. Se inyectan
        automáticamente en la planificación y en cada tarea cuando son relevantes
        para lo que pidas — sin repetirlos en cada conversación ni en cada modelo.
      </p>

      {items.map(item => (
        <div key={item.id} className="mb-4 p-4 bg-slate-950/60 border border-slate-800 rounded-lg">
          <div className="flex gap-2 mb-2">
            <input className={inputCls} placeholder="Título (ej: Proceso de publicación de contenido)"
              value={item.title} onChange={e => update(item.id, { title: e.target.value })} />
            <select className={inputCls + ' w-36'} value={item.category}
              onChange={e => update(item.id, { category: e.target.value as KnowledgeItemDraft['category'] })}>
              <option value="process">process</option>
              <option value="technical">technical</option>
              <option value="policy">policy</option>
              <option value="client">client</option>
              <option value="vision">vision</option>
            </select>
            <button onClick={() => setItems(list => list.filter(i => i.id !== item.id))}
              className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
          <textarea className={inputCls + ' min-h-24 font-mono text-xs'} placeholder="Contenido del documento..."
            value={item.content} onChange={e => update(item.id, { content: e.target.value })} />
          <input className={inputCls + ' mt-2'} placeholder="Tags separados por comas (ej: marketing, publicación, blog)"
            value={item.tags} onChange={e => update(item.id, { tags: e.target.value })} />
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-xs text-slate-500 mb-4">
          Sin documentos propios — el workspace usa la plantilla de ejemplo hasta que guardes al menos uno.
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={addItem} className="flex items-center gap-1 px-4 py-2 border border-slate-700 hover:border-slate-500 rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Añadir documento
        </button>
        <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-kos-primary hover:bg-kos-primary/80 rounded-lg font-medium text-sm">
          {saved ? <><Check className="w-4 h-4" /> Guardado — activo como contexto</> : 'Guardar documentación'}
        </button>
      </div>
    </div>
  );
}
