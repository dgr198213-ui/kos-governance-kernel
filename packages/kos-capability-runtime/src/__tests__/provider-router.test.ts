import { describe, it, expect, vi, afterEach } from 'vitest';
import { ProviderRouter } from '../provider-router/provider-router.js';
import { OpenRouterProvider } from '../provider-router/openrouter-provider.js';
import type { RoutingRequest } from '../provider-router/types.js';

function makeRequest(overrides: Partial<RoutingRequest> = {}): RoutingRequest {
  return {
    workspaceId: 'ws-test',
    taskType: 'chat',
    input: 'Hola',
    inputTokens: 100,
    estimatedOutputTokens: 200,
    requirements: {},
    ...overrides,
  };
}

describe('ProviderRouter', () => {
  it('selecciona un modelo con la estrategia best-quality', async () => {
    const router = new ProviderRouter();
    const decision = await router.route(makeRequest(), 'best-quality');

    expect(decision.modelId).toBeTruthy();
    expect(decision.providerId).toBeTruthy();
    expect(decision.strategy).toBe('best-quality');
  });

  it('selecciona el modelo más barato con la estrategia cheapest', async () => {
    const router = new ProviderRouter();
    const decision = await router.route(makeRequest(), 'cheapest');

    // gpt-4o-mini es el más barato de los providers por defecto
    expect(decision.modelId).toBe('gpt-4o-mini');
  });

  it('filtra por requisitos de contexto mínimo', async () => {
    const router = new ProviderRouter();
    const decision = await router.route(
      makeRequest({ requirements: { minContextWindow: 500000 } })
    );

    // Solo Gemini soporta 1M de contexto en la configuración por defecto
    expect(decision.modelId).toBe('gemini-2.5-pro');
  });

  it('lanza error si ningún modelo cumple los requisitos', async () => {
    const router = new ProviderRouter();
    await expect(
      router.route(makeRequest({ requirements: { minContextWindow: 99999999 } }))
    ).rejects.toThrow(/No suitable models/);
  });

  it('respeta la lista de providers permitidos', async () => {
    const router = new ProviderRouter();
    const decision = await router.route(
      makeRequest({ allowedProviders: ['anthropic'] })
    );

    expect(decision.providerId).toBe('anthropic');
  });
});

describe('OpenRouterProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve un resultado exitoso con métricas al llamar al modelo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'respuesta de prueba' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 }
      )
    ));

    const provider = new OpenRouterProvider({ apiKey: 'test-key' });
    const result = await provider.call('meta-llama/llama-3.1-8b-instruct:free', [
      { role: 'user', content: 'Hola' },
    ]);

    expect(result.success).toBe(true);
    expect(result.output).toBe('respuesta de prueba');
    expect(result.metrics.inputTokens).toBe(10);
    expect(result.metrics.outputTokens).toBe(5);
    expect(result.metrics.cost).toBe(0); // modelo :free
  });

  it('devuelve un resultado fallido si la API responde con error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('Rate limit exceeded', { status: 429 })
    ));

    const provider = new OpenRouterProvider({ apiKey: 'test-key' });
    const result = await provider.call('gpt-4o', [{ role: 'user', content: 'Hola' }]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Rate limit');
  });

  it('filtra solo modelos gratuitos en listFreeModels', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            { id: 'model-a:free', name: 'A', context_length: 8192, pricing: { prompt: '0.001', completion: '0.002' } },
            { id: 'model-b', name: 'B', context_length: 8192, pricing: { prompt: '0.005', completion: '0.01' } },
            { id: 'model-c', name: 'C', context_length: 8192, pricing: { prompt: '0', completion: '0' } },
          ],
        }),
        { status: 200 }
      )
    ));

    const provider = new OpenRouterProvider({ apiKey: 'test-key' });
    const models = await provider.listFreeModels();

    expect(models.map(m => m.id)).toEqual(['model-a:free', 'model-c']);
  });
});
