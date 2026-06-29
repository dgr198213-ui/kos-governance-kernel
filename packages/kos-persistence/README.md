# @kos/persistence

Capa de persistencia para KOS usando Supabase.

## Configuración

```typescript
import { SupabaseKOSClient } from '@kos/persistence';

const client = new SupabaseKOSClient({
  url: process.env.SUPABASE_URL!,
  anonKey: process.env.SUPABASE_ANON_KEY!
});
```

## Uso

```typescript
// Crear workspace
const workspace = await client.createWorkspace({
  name: 'mi-empresa',
  description: 'Workspace de automatización',
  identity: { name: 'KOS Agent', role: 'Estratega', organization: 'Mi Empresa' }
});

// Crear ejecución
const execution = await client.createExecution({
  workspaceId: workspace.id,
  correlationId: 'corr-123',
  intentId: 'intent-1',
  rawInput: 'Analizar datos'
});

// Registrar auditoría
await client.createAuditLog({
  workspaceId: workspace.id,
  correlationId: 'corr-123',
  eventType: 'IntentReceived',
  eventData: { input: 'Analizar datos' },
  checksum: 'abc123'
});
```

## Schema

Ver `src/supabase/schema.sql` para el schema completo de PostgreSQL.

## Licencia

MIT
