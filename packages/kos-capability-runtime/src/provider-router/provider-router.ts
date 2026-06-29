import { eventBus } from '@kos/control-plane';
import type { ProviderConfig, ModelConfig, RoutingRequest, RoutingDecision, ProviderCallResult, ProviderRouterStats, RoutingStrategy } from './types.js';

export class ProviderRouter {
  private providers: Map<string, ProviderConfig> = new Map();
  private stats: ProviderRouterStats = {
    totalRequests: 0, totalCost: 0, averageLatencyMs: 0,
    requestsByProvider: {}, requestsByModel: {}, errorRate: 0, fallbackTriggered: 0
  };
  private totalErrors = 0;

  constructor() { this.initializeDefaultProviders(); }

  private initializeDefaultProviders(): void {
    const defaults: ProviderConfig[] = [
      {
        id: 'openai', name: 'OpenAI', type: 'openai', enabled: true,
        models: [
          {
            id: 'gpt-4o', name: 'GPT-4o', providerId: 'openai',
            capabilities: { maxContextWindow: 128000, supportsVision: true, supportsFunctionCalling: true, supportsStreaming: true, supportsJsonMode: true },
            pricing: { inputPer1M: 5.0, outputPer1M: 15.0, cachedInputPer1M: 1.25 },
            quality: { reasoningScore: 92, codingScore: 90, creativityScore: 88, instructionFollowingScore: 94, overallScore: 91 },
            restrictions: { maxOutputTokens: 16384 }
          },
          {
            id: 'gpt-4o-mini', name: 'GPT-4o Mini', providerId: 'openai',
            capabilities: { maxContextWindow: 128000, supportsVision: true, supportsFunctionCalling: true, supportsStreaming: true, supportsJsonMode: true },
            pricing: { inputPer1M: 0.15, outputPer1M: 0.60, cachedInputPer1M: 0.075 },
            quality: { reasoningScore: 82, codingScore: 80, creativityScore: 78, instructionFollowingScore: 86, overallScore: 81 },
            restrictions: { maxOutputTokens: 16384 }
          }
        ],
        rateLimits: { requestsPerMinute: 500, tokensPerMinute: 30000, concurrentRequests: 10 },
        performance: { averageLatencyMs: 1200, uptimePercent: 99.9, lastHealthCheck: Date.now() }
      },
      {
        id: 'anthropic', name: 'Anthropic', type: 'anthropic', enabled: true,
        models: [
          {
            id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', providerId: 'anthropic',
            capabilities: { maxContextWindow: 200000, supportsVision: true, supportsFunctionCalling: true, supportsStreaming: true, supportsJsonMode: false },
            pricing: { inputPer1M: 3.0, outputPer1M: 15.0 },
            quality: { reasoningScore: 95, codingScore: 94, creativityScore: 90, instructionFollowingScore: 96, overallScore: 94 },
            restrictions: { maxOutputTokens: 64000 }
          }
        ],
        rateLimits: { requestsPerMinute: 400, tokensPerMinute: 40000, concurrentRequests: 8 },
        performance: { averageLatencyMs: 1500, uptimePercent: 99.8, lastHealthCheck: Date.now() }
      },
      {
        id: 'google', name: 'Google AI', type: 'google', enabled: true,
        models: [
          {
            id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', providerId: 'google',
            capabilities: { maxContextWindow: 1000000, supportsVision: true, supportsFunctionCalling: true, supportsStreaming: true, supportsJsonMode: true },
            pricing: { inputPer1M: 1.25, outputPer1M: 10.0 },
            quality: { reasoningScore: 93, codingScore: 88, creativityScore: 85, instructionFollowingScore: 90, overallScore: 89 },
            restrictions: { maxOutputTokens: 65536 }
          }
        ],
        rateLimits: { requestsPerMinute: 300, tokensPerMinute: 50000, concurrentRequests: 6 },
        performance: { averageLatencyMs: 1800, uptimePercent: 99.7, lastHealthCheck: Date.now() }
      }
    ];
    for (const provider of defaults) this.providers.set(provider.id, provider);
  }

  registerProvider(config: ProviderConfig): void { this.providers.set(config.id, config); }

  async route(request: RoutingRequest, strategy: RoutingStrategy = 'best-quality'): Promise<RoutingDecision> {
    const candidates = this.getCandidates(request);
    if (candidates.length === 0) throw new Error('No suitable models found for the given requirements');
    const ranked = this.rankCandidates(candidates, request, strategy);
    const best = ranked[0];
    const fallbackChain = ranked.slice(1, 4).map(c => ({ providerId: c.model.providerId, modelId: c.model.id, reason: c.reason }));
    return {
      providerId: best.model.providerId, modelId: best.model.id,
      providerType: this.providers.get(best.model.providerId)!.type,
      reason: best.reason, strategy,
      estimatedCost: best.estimatedCost, estimatedLatencyMs: best.estimatedLatency,
      confidence: best.confidence, fallbackChain
    };
  }

  async executeWithFallback(request: RoutingRequest, input: string, strategy: RoutingStrategy = 'best-quality'): Promise<ProviderCallResult> {
    const decision = await this.route(request, strategy);
    let result = await this.executeCall(decision.providerId, decision.modelId, input);
    if (!result.success && decision.fallbackChain.length > 0) {
      this.stats.fallbackTriggered++;
      for (const fallback of decision.fallbackChain) {
        result = await this.executeCall(fallback.providerId, fallback.modelId, input);
        if (result.success) break;
      }
    }
    this.updateStats(result);
    return result;
  }

  private getCandidates(request: RoutingRequest): Array<{ model: ModelConfig; provider: ProviderConfig }> {
    const candidates: Array<{ model: ModelConfig; provider: ProviderConfig }> = [];
    for (const [providerId, provider] of this.providers) {
      if (!provider.enabled) continue;
      if (request.allowedProviders && !request.allowedProviders.includes(providerId)) continue;
      for (const model of provider.models) {
        if (request.allowedModels && !request.allowedModels.includes(model.id)) continue;
        if (request.requirements.minContextWindow && model.capabilities.maxContextWindow < request.requirements.minContextWindow) continue;
        if (request.requirements.requiresVision && !model.capabilities.supportsVision) continue;
        if (request.requirements.requiresFunctionCalling && !model.capabilities.supportsFunctionCalling) continue;
        if (request.requirements.requiresJsonMode && !model.capabilities.supportsJsonMode) continue;
        const estimatedCost = this.estimateCost(model, request.inputTokens, request.estimatedOutputTokens);
        if (request.requirements.maxCost && estimatedCost > request.requirements.maxCost) continue;
        candidates.push({ model, provider });
      }
    }
    return candidates;
  }

  private rankCandidates(candidates: Array<{ model: ModelConfig; provider: ProviderConfig }>, request: RoutingRequest, strategy: RoutingStrategy) {
    return candidates.map(({ model, provider }) => {
      const estimatedCost = this.estimateCost(model, request.inputTokens, request.estimatedOutputTokens);
      const estimatedLatency = provider.performance.averageLatencyMs;
      let score = 0, reason = '';
      switch (strategy) {
        case 'cheapest': score = 100 - (estimatedCost * 1000); reason = `Lowest cost: $${estimatedCost.toFixed(4)}`; break;
        case 'fastest': score = 100 - (estimatedLatency / 100); reason = `Fastest: ${estimatedLatency}ms`; break;
        case 'best-quality':
          score = model.quality.overallScore;
          switch (request.taskType) {
            case 'code': score = model.quality.codingScore; break;
            case 'reasoning': score = model.quality.reasoningScore; break;
            case 'creative': score = model.quality.creativityScore; break;
          }
          reason = `Best quality for ${request.taskType}: ${score}/100`;
          break;
        case 'round-robin': score = Math.random() * 100; reason = 'Round-robin'; break;
        case 'weighted':
          score = (model.quality.overallScore * 0.4) + ((100 - estimatedCost * 100) * 0.3) + ((100 - estimatedLatency / 50) * 0.3);
          reason = `Weighted: quality(40%) + cost(30%) + speed(30%)`;
          break;
        default: score = model.quality.overallScore; reason = 'Default quality-based';
      }
      if (request.requirements.maxLatencyMs && estimatedLatency > request.requirements.maxLatencyMs) score *= 0.5;
      return { model, provider, score, reason, estimatedCost, estimatedLatency, confidence: Math.min(score / 100, 1) };
    }).sort((a, b) => b.score - a.score);
  }

  private estimateCost(model: ModelConfig, inputTokens: number, outputTokens: number): number {
    return ((inputTokens / 1_000_000) * model.pricing.inputPer1M) + ((outputTokens / 1_000_000) * model.pricing.outputPer1M);
  }

  private async executeCall(providerId: string, modelId: string, input: string): Promise<ProviderCallResult> {
    const startTime = Date.now();
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { providerId, modelId, success: false, error: `Provider ${providerId} not found`, metrics: { latencyMs: 0, inputTokens: 0, outputTokens: 0, cost: 0, retries: 0 }, timestamp: Date.now() };
    }
    try {
      const latency = provider.performance.averageLatencyMs + (Math.random() * 500 - 250);
      const inputTokens = input.length / 4;
      const outputTokens = inputTokens * 1.5;
      const model = provider.models.find(m => m.id === modelId);
      const cost = model ? this.estimateCost(model, inputTokens, outputTokens) : 0;
      if (Math.random() < 0.05) throw new Error('Simulated provider error');
      return {
        providerId, modelId, success: true,
        output: `Response from ${modelId}: processed ${inputTokens} tokens`,
        metrics: { latencyMs: Math.round(latency), inputTokens: Math.round(inputTokens), outputTokens: Math.round(outputTokens), cost: Math.round(cost * 10000) / 10000, retries: 0 },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        providerId, modelId, success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: { latencyMs: Date.now() - startTime, inputTokens: 0, outputTokens: 0, cost: 0, retries: 0 },
        timestamp: Date.now()
      };
    }
  }

  private updateStats(result: ProviderCallResult): void {
    const prevTotal = this.stats.totalRequests;
    this.stats.totalRequests++;
    this.stats.totalCost += result.metrics.cost;
    this.stats.averageLatencyMs = (this.stats.averageLatencyMs * prevTotal + result.metrics.latencyMs) / this.stats.totalRequests;
    this.stats.requestsByProvider[result.providerId] = (this.stats.requestsByProvider[result.providerId] || 0) + 1;
    this.stats.requestsByModel[result.modelId] = (this.stats.requestsByModel[result.modelId] || 0) + 1;
    if (!result.success) this.totalErrors++;
    this.stats.errorRate = this.totalErrors / this.stats.totalRequests;
  }

  getStats(): ProviderRouterStats { return { ...this.stats }; }
  listProviders(): ProviderConfig[] { return Array.from(this.providers.values()).filter(p => p.enabled); }
  getModel(modelId: string): ModelConfig | undefined {
    for (const provider of this.providers.values()) {
      const model = provider.models.find(m => m.id === modelId);
      if (model) return model;
    }
    return undefined;
  }
}
