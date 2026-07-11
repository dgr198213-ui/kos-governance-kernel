import { useEffect, useState } from 'react';
import { Cloud, CloudOff, LogOut, Mail } from 'lucide-react';
import { authService } from '../services/AuthService';

/**
 * Cuenta y sincronización en la nube. Magic link, sin contraseñas.
 */
export default function AccountPanel() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState(authService.getSession());

  useEffect(() => authService.onSessionChange(setSession), []);

  const inputCls = 'px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-kos-primary text-sm w-full';

  if (!authService.isCloudConfigured()) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <CloudOff className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold">Sincronización en la nube</h3>
        </div>
        <p className="text-sm text-slate-400">
          No configurada en este despliegue: tu configuración se guarda en este navegador.
          Para activarla, define <code className="px-1 bg-slate-800 rounded">VITE_SUPABASE_URL</code> y{' '}
          <code className="px-1 bg-slate-800 rounded">VITE_SUPABASE_ANON_KEY</code> en las variables
          de entorno del proyecto en Vercel y aplica las migraciones 0002 y 0003 en Supabase.
        </p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold">Sincronización activa</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Sesión: <span className="text-slate-200">{session.user.email}</span>. Tu matriz de
          gobernanza y tu documentación se guardan en la nube y te siguen a cualquier dispositivo.
        </p>
        <button
          onClick={() => authService.signOut()}
          className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-slate-500 rounded-lg text-sm"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-5 h-5 text-kos-primary" />
        <h3 className="text-lg font-semibold">Inicia sesión para sincronizar</h3>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Sin contraseñas: te enviamos un enlace mágico al correo. Con sesión iniciada, tu
        configuración deja de vivir solo en este navegador.
      </p>
      {sent ? (
        <p className="text-sm text-emerald-300">✉️ Enlace enviado a {email}. Revisa tu correo y vuelve aquí.</p>
      ) : (
        <div className="flex gap-2">
          <input
            className={inputCls}
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button
            onClick={async () => {
              setError(null);
              try {
                await authService.sendMagicLink(email.trim());
                setSent(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Error enviando el enlace');
              }
            }}
            className="px-4 py-2 bg-kos-primary hover:bg-kos-primary/80 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            Enviar enlace
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}
