export type ProviderType = 'openai' | 'anthropic' | 'google' | 'ollama' | 'deepseek' | 'meta' | 'mistral' | 'openrouter' | 'custom';
export type RoutingStrategy = 'cheapest' | 'fastest' | 'best-quality' | 'round-robin' | 'weighted' | 'fallback-chain';

export interface ProviderConfig {
  id: string; name: string; type: ProviderType; apiKey?: string; baseUrl?: string; enabled: boolean;
  models: ModelConfig[];
  rateLimits: { requestsPerMinute: number; tokensPerMinute: number; concurrentRequests: number; };
  performance: { averageLatencyMs: number; uptimePercent: number; lastHealthCheck: number; };
}

export interface ModelConfig {
  id: string; name: string; providerId: string;
  capabilities: { maxContextWindow: number; supportsVision: boolean; supportsFunctionCalling: boolean; supportsStreaming: boolean; supportsJsonMode: boolean; };
  pricing: { inputPer1M: number; outputPer1M: number; cachedInputPer1M?: number; };
  quality: { reasoningScore: number; codingScore: number; creativityScore: number; instructionFollowingScore: number; overallScore: number; };
  restrictions: { allowedRegions?: string[]; requiresApproval?: boolean; maxOutputTokens: number; };
}

export interface RoutingRequest {
  workspaceId: string;
  taskType: 'chat' | 'code' | 'analysis' | 'creative' | 'reasoning' | 'embedding';
  input: string;
  inputTokens: number;
  estimatedOutputTokens: number;
  requirements: {
    minContextWindow?: number;
    requiresVision?: boolean;
    requiresFunctionCalling?: boolean;
    requiresJsonMode?: boolean;
    maxLatencyMs?: number;
    maxCost?: number;
    preferredModel?: string;
    preferredProvider?: string;
  };
  allowedModels?: string[];
  allowedProviders?: string[];
}

export interface RoutingDecision {
  providerId: string; modelId: string; providerType: ProviderType;
  reason: string; strategy: RoutingStrategy;
  estimatedCost: number; estimatedLatencyMs: number; confidence: number;
  fallbackChain: Array<{ providerId: string; modelId: string; reason: string; }>;
}

export interface ProviderCallResult {
  providerId: string; modelId: string; success: boolean;
  output?: string; error?: string;
  metrics: { latencyMs: number; inputTokens: number; outputTokens: number; cost: number; retries: number; cachedTokens?: number; };
  timestamp: number;
}

export interface ProviderRouterStats {
  totalRequests: number; totalCost: number; averageLatencyMs: number;
  requestsByProvider: Record<string, number>; requestsByModel: Record<string, number>;
  errorRate: number; fallbackTriggered: number;
}
