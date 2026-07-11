import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { EnvironmentRepository } from '@kos/control-plane';
import { SupabaseEnvironmentRepository } from '@kos/persistence';
import { LocalStorageEnvironmentRepository } from './LocalStorageEnvironmentRepository';

/**
 * Capa de cuenta de KOS Studio.
 *
 * - Con VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY configuradas y sesión
 *   iniciada (magic link, sin contraseñas): la configuración del workspace
 *   se guarda en la nube y te sigue a cualquier dispositivo.
 * - Sin variables o sin sesión: se usa localStorage de este navegador.
 * Mismo puerto EnvironmentRepository en ambos casos.
 */
class AuthService {
  readonly supabase: SupabaseClient | null;
  private session: Session | null = null;
  private listeners = new Set<(session: Session | null) => void>();

  constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    this.supabase = url && anonKey ? createClient(url, anonKey) : null;

    if (this.supabase) {
      this.supabase.auth.getSession().then(({ data }) => this.setSession(data.session));
      this.supabase.auth.onAuthStateChange((_event, session) => this.setSession(session));
    }
  }

  /** ¿Está la persistencia en la nube disponible (variables configuradas)? */
  isCloudConfigured(): boolean {
    return this.supabase !== null;
  }

  getSession(): Session | null {
    return this.session;
  }

  onSessionChange(listener: (session: Session | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async sendMagicLink(email: string): Promise<void> {
    if (!this.supabase) throw new Error('Supabase no está configurado en este despliegue');
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
  }

  async signOut(): Promise<void> {
    if (this.supabase) await this.supabase.auth.signOut();
  }

  /** Repositorio activo según el estado: nube con sesión, local si no. */
  getEnvironmentRepository(): EnvironmentRepository {
    if (this.supabase && this.session) {
      return new SupabaseEnvironmentRepository(this.supabase);
    }
    return new LocalStorageEnvironmentRepository();
  }

  private setSession(session: Session | null) {
    this.session = session;
    for (const listener of this.listeners) listener(session);
  }
}

export const authService = new AuthService();
