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

## Seguridad: Row Level Security

El `schema.sql` original dejaba la tabla `workspaces` **abierta a cualquier cliente con la anon key** (políticas `USING (true)`) y el resto de tablas en deny-all (RLS activado sin políticas).

La migración `src/supabase/migrations/0002_rls_hardening.sql` corrige ambos problemas:

1. Añade `owner_id` a `workspaces` (referencia a `auth.users`).
2. Sustituye las políticas abiertas por políticas de ownership (`owner_id = auth.uid()`).
3. Da acceso a `executions`, `audit_logs`, `skills` y `knowledge_base` solo al dueño del workspace. `audit_logs` es append-only (sin UPDATE/DELETE).

**Pasos para aplicarla en una instancia existente:**

```sql
-- 1. Ejecutar la migración en el SQL Editor de Supabase
-- 2. Asignar owner a los workspaces existentes:
UPDATE workspaces SET owner_id = '<uuid-del-usuario>' WHERE owner_id IS NULL;
```

Tras la migración, `createWorkspace()` exige una sesión autenticada de Supabase Auth: sin login, la inserción se rechaza tanto en el cliente como en la base de datos.
