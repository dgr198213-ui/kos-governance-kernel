/**
 * OpenRouter Provider - Integración REAL con API
 * https://openrouter.ai/
 * 
 * Permite usar modelos gratuitos para democratizar el acceso a IA:
 * - meta-llama/llama-3.1-8b-instruct:free
 * - google/gemma-2-9b-it:free
 * - mistralai/mistral-7b-instruct:free
 */

import type { ProviderConfig, ModelConfig, ProviderCallResult } from './types.js';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: { prompt: string; completion: string; };
}

export class OpenRouterProvider {
  private config: OpenRouterConfig;
  private baseUrl: string;

  constructor(config: OpenRouterConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
  }

  async listFreeModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...this.config.defaultHeaders
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch models: ${response.statusText}`);
    const data = await response.json();
    return data.data.filter((model: OpenRouterModel) => 
      model.id.includes(':free') || (model.pricing.prompt === '0' && model.pricing.completion === '0')
    );
  }

  async call(
    modelId: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: { temperature?: number; max_tokens?: number; stream?: boolean; } = {}
  ): Promise<ProviderCallResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/dgr198213-ui/kos-governance-kernel',
          'X-Title': 'KOS Governance Kernel',
          ...this.config.defaultHeaders
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 4096,
          stream: options.stream ?? false
        })
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }
      const data = await response.json();
      const latency = Date.now() - startTime;
      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      const cost = modelId.includes(':free') ? 0 : this.calculateCost(modelId, inputTokens, outputTokens);

      return {
        providerId: 'openrouter', modelId, success: true,
        output: data.choices[0]?.message?.content || '',
        metrics: { latencyMs: latency, inputTokens, outputTokens, cost, retries: 0 },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        providerId: 'openrouter', modelId, success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: { latencyMs: Date.now() - startTime, inputTokens: 0, outputTokens: 0, cost: 0, retries: 0 },
        timestamp: Date.now()
      };
    }
  }

  private calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'openai/gpt-4': { input: 30, output: 60 },
      'openai/gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'anthropic/claude-3-opus': { input: 15, output: 75 },
      'anthropic/claude-3-sonnet': { input: 3, output: 15 },
      'google/gemini-pro': { input: 0.5, output: 1.5 }
    };
    const modelPricing = pricing[modelId] || { input: 1, output: 2 };
    return ((inputTokens / 1_000_000) * modelPricing.input) + ((outputTokens / 1_000_000) * modelPricing.output);
  }

  static createProviderConfig(apiKey: string): ProviderConfig {
    return {
      id: 'openrouter', name: 'OpenRouter', type: 'openrouter',
      apiKey, baseUrl: 'https://openrouter.ai/api/v1', enabled: true,
      models: [
        {
          id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', providerId: 'openrouter',
          capabilities: { maxContextWindow: 8192, supportsVision: false, supportsFunctionCalling: false, supportsStreaming: true, supportsJsonMode: false },
          pricing: { inputPer1M: 0, outputPer1M: 0 },
          quality: { reasoningScore: 75, codingScore: 70, creativityScore: 72, instructionFollowingScore: 78, overallScore: 74 },
          restrictions: { maxOutputTokens: 4096 }
        },
        {
          id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', providerId: 'openrouter',
          capabilities: { maxContextWindow: 8192, supportsVision: false, supportsFunctionCalling: false, supportsStreaming: true, supportsJsonMode: false },
          pricing: { inputPer1M: 0, outputPer1M: 0 },
          quality: { reasoningScore: 72, codingScore: 68, creativityScore: 70, instructionFollowingScore: 75, overallScore: 71 },
          restrictions: { maxOutputTokens: 4096 }
        },
        {
          id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', providerId: 'openrouter',
          capabilities: { maxContextWindow: 32768, supportsVision: false, supportsFunctionCalling: false, supportsStreaming: true, supportsJsonMode: false },
          pricing: { inputPer1M: 0, outputPer1M: 0 },
          quality: { reasoningScore: 70, codingScore: 72, creativityScore: 68, instructionFollowingScore: 74, overallScore: 71 },
          restrictions: { maxOutputTokens: 8192 }
        },
        {
          id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)', providerId: 'openrouter',
          capabilities: { maxContextWindow: 8192, supportsVision: false, supportsFunctionCalling: false, supportsStreaming: true, supportsJsonMode: false },
          pricing: { inputPer1M: 0, outputPer1M: 0 },
          quality: { reasoningScore: 68, codingScore: 65, creativityScore: 70, instructionFollowingScore: 75, overallScore: 69 },
          restrictions: { maxOutputTokens: 4096 }
        },
        {
          id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)', providerId: 'openrouter',
          capabilities: { maxContextWindow: 32768, supportsVision: false, supportsFunctionCalling: false, supportsStreaming: true, supportsJsonMode: false },
          pricing: { inputPer1M: 0, outputPer1M: 0 },
          quality: { reasoningScore: 73, codingScore: 71, creativityScore: 69, instructionFollowingScore: 76, overallScore: 72 },
          restrictions: { maxOutputTokens: 8192 }
        }
      ],
      rateLimits: { requestsPerMinute: 60, tokensPerMinute: 100000, concurrentRequests: 5 },
      performance: { averageLatencyMs: 2000, uptimePercent: 99.0, lastHealthCheck: Date.now() }
    };
  }
}
