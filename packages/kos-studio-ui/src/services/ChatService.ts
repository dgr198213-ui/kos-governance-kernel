import { KOSPipeline } from '@kos/control-plane';
import { ProviderRouter, OpenRouterProvider, OpenRouterTaskExecutor } from '@kos/capability-runtime';

export interface ProviderSettings {
  openRouterApiKey: string;
  model?: string;
}

/**
 * ChatService actúa como el puente entre la interfaz de usuario y el núcleo de KOS.
 *
 * Dos modos de ejecución:
 * - Simulado (por defecto): el pipeline genera artefactos placeholder sin red.
 * - Real (BYOK): si el usuario configura su clave de OpenRouter en Settings,
 *   el Executor llama al modelo elegido. La clave vive SOLO en memoria de esta
 *   pestaña: no se persiste en localStorage, cookies ni backend.
 */
export class ChatService {
  private pipeline: KOSPipeline;
  private router: ProviderRouter;
  private live = false;
  private activeModel: string | null = null;

  constructor() {
    this.router = new ProviderRouter();
    this.pipeline = new KOSPipeline({ enableHumanApproval: true, enableAudit: true });
  }

  /** Activa la ejecución real con la clave del usuario (solo en memoria). */
  configureProviders(settings: ProviderSettings): void {
    const apiKey = settings.openRouterApiKey.trim();
    if (!apiKey) {
      this.resetToSimulated();
      return;
    }
    const provider = new OpenRouterProvider({ apiKey });
    const executor = new OpenRouterTaskExecutor(provider, { model: settings.model });
    this.pipeline = new KOSPipeline(
      { enableHumanApproval: true, enableAudit: true },
      { executor }
    );
    this.live = true;
    this.activeModel = settings.model ?? 'meta-llama/llama-3.1-8b-instruct:free';
  }

  /** Vuelve al modo simulado y descarta la clave. */
  resetToSimulated(): void {
    this.pipeline = new KOSPipeline({ enableHumanApproval: true, enableAudit: true });
    this.live = false;
    this.activeModel = null;
  }

  /** ¿Está el Executor conectado a un LLM real? */
  isLive(): boolean {
    return this.live;
  }

  getActiveModel(): string | null {
    return this.activeModel;
  }

  /** Expone el router para configuración de proveedores desde la UI. */
  getRouter(): ProviderRouter {
    return this.router;
  }

  /**
   * Procesa una solicitud del usuario a través del Pipeline de KOS
   */
  async processRequest(workspaceId: string, input: string, onStatusChange: (status: string) => void) {
    try {
      onStatusChange('specifying');

      const result = await this.pipeline.execute({
        id: `intent-${Date.now()}`,
        workspaceId,
        userId: 'user-1',
        rawInput: input,
        source: 'chat',
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('KOS Execution Error:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
