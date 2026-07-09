import type { LLMClient, LLMMessage, LLMCompletion } from '@kos/control-plane';
import { OpenRouterProvider } from './openrouter-provider.js';

export interface OpenRouterLLMClientOptions {
  model?: string;
}

const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

/**
 * Adaptador del puerto LLMClient de @kos/control-plane sobre OpenRouter.
 * Permite que SpecEngine y VerifierEngine razonen con un modelo real.
 */
export class OpenRouterLLMClient implements LLMClient {
  private model: string;

  constructor(private provider: OpenRouterProvider, options: OpenRouterLLMClientOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async complete(
    messages: LLMMessage[],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<LLMCompletion> {
    const result = await this.provider.call(this.model, messages, {
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });

    if (!result.success) {
      throw new Error(result.error ?? 'OpenRouter completion failed');
    }

    return {
      content: result.output ?? '',
      tokensUsed: result.metrics.inputTokens + result.metrics.outputTokens,
      cost: result.metrics.cost,
      latencyMs: result.metrics.latencyMs,
      model: this.model,
    };
  }
}
