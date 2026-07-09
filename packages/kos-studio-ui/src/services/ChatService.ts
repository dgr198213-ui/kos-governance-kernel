import { KOSPipeline } from '@kos/control-plane';
import { ProviderRouter } from '@kos/capability-runtime';

/**
 * ChatService actúa como el puente entre la interfaz de usuario y el núcleo de KOS.
 * Orquesta el flujo desde que el usuario envía un mensaje hasta que el Verifier Engine lo valida.
 */
export class ChatService {
  private pipeline: KOSPipeline;
  private router: ProviderRouter;

  constructor() {
    // El router quedará disponible para cuando el Executor haga llamadas reales a LLMs.
    this.router = new ProviderRouter();
    this.pipeline = new KOSPipeline({ enableHumanApproval: true, enableAudit: true });
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
      
      // En una implementación real, aquí llamaríamos al pipeline.execute
      // Para la demo de la UI, simulamos los pasos que el kernel realiza internamente
      
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
