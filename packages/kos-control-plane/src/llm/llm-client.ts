/**
 * Puerto LLM genérico del Control Plane (Clean Architecture).
 *
 * Los motores (Spec, Verifier) pueden recibir un LLMClient para razonar
 * con un modelo real; si no se inyecta, degradan a heurísticas
 * deterministas. Las implementaciones concretas (OpenRouter, etc.)
 * viven en @kos/capability-runtime.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletion {
  content: string;
  tokensUsed: number;
  cost: number;
  latencyMs: number;
  model?: string;
}

export interface LLMClient {
  complete(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMCompletion>;
}

/**
 * Extrae un objeto JSON de una respuesta de modelo, tolerando fences
 * de Markdown y texto alrededor. Lanza si no hay JSON parseable.
 */
export function parseJsonLoose<T = unknown>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}
