# KOS Governance Kernel v0.2.0

> **Control Plane para ejecución gobernada de IA basado en el Método Karpathy.**

KOS (Kernel Operating System) es un sistema operativo de gobernanza diseñado para orquestar agentes de IA de forma determinista, segura y eficiente. A diferencia de los sistemas de chat tradicionales, KOS actúa como un procesador central que planifica, ejecuta y verifica cada tarea bajo un marco de gobernanza estricto.

## 🚀 Características Principales

### 🧠 Control Plane Determinista
- **Spec Engine**: Transforma intenciones ambiguas en especificaciones técnicas detalladas. Con un `LLMClient` inyectado, el objetivo real, los criterios de calidad y las micro-tareas se **generan con un modelo real adaptados a cada intención** (con fallback heurístico si el modelo falla); sin él, usa el plan heurístico.
- **Agile Executor**: Descompone tareas complejas en micro-tareas manejables con gestión de dependencias.
- **Event Bus**: Sistema de comunicación reactiva que permite la trazabilidad total de cada decisión tomada por la IA.

### 🛡️ Gobernanza y Verificación
- **Matriz de Gobernanza aplicada de verdad**: la etapa `policy-check` evalúa la intención y cada micro-tarea del plan contra las reglas del workspace con matching determinista por palabras clave (insensible a mayúsculas y acentos, explicable y auditable). Las reglas **NUNCA** bloquean el pipeline (evento `PolicyBlocked` + motivo con regla, severidad y dónde se detectó). Las reglas **PREGUNTAR** — o una puntuación de verificación bajo el umbral — disparan aprobación humana real (`HumanApprovalRequested`): en Studio UI se te pregunta en el navegador; denegar aborta. Sin `approvalHandler` configurado, el pipeline aplica *fail-safe deny*: nunca avanza sin la aprobación requerida.
- **Verifier Engine**: Auditoría automática de resultados. Con un `LLMClient` inyectado usa un **modelo crítico real** que puntúa los artefactos contra los criterios de la especificación; sin él, degrada a heurísticas **deterministas** basadas en la evidencia de ejecución (misma entrada → misma puntuación, sin azar).
- **Bucle de Retroalimentación**: Mejora iterativa del output hasta alcanzar los umbrales de calidad configurados.
- **Políticas de Aprobación**: Soporte nativo para intervención humana en tareas críticas.

### ⚡ Ejecución real de extremo a extremo
- **TaskExecutor (puerto)**: el Control Plane define la interfaz de ejecución de micro-tareas sin conocer la implementación (inversión de dependencias).
- **OpenRouterTaskExecutor (adaptador)**: implementación real en el Capability Runtime — cada micro-tarea se ejecuta contra el modelo configurado en OpenRouter, con el objetivo real de la especificación, los criterios de calidad *must-have* y los artefactos previos como contexto.
- **SimulatedTaskExecutor**: modo por defecto sin red (tests, CI, demos).
- **Modo BYOK en Studio UI**: introduce tu clave de OpenRouter en Settings y el pipeline pasa de simulado a real. La clave vive solo en memoria de la pestaña — nunca se persiste.

```typescript
import { KOSPipeline } from '@kos/control-plane';
import { OpenRouterProvider, OpenRouterTaskExecutor } from '@kos/capability-runtime';

const provider = new OpenRouterProvider({ apiKey: process.env.OPENROUTER_API_KEY! });
const executor = new OpenRouterTaskExecutor(provider, { model: 'meta-llama/llama-3.1-8b-instruct:free' });
const pipeline = new KOSPipeline({}, { executor });

const result = await pipeline.execute(intent); // ejecución real, verificada y auditada
```

### 🛠️ Runtime de Capacidades
- **Skill System**: Arquitectura modular para registrar y ejecutar habilidades específicas (código, datos, APIs).
- **Provider Router**: Enrutamiento inteligente hacia modelos de IA (OpenAI, Anthropic, Google) optimizando coste, latencia y calidad a través de **OpenRouter**.

### 📊 KOS Studio UI
- Dashboard profesional construido con **React + Tailwind CSS**.
- Visualización en tiempo real de flujos de trabajo, métricas de éxito y costes de tokens.

## 🏗️ Estructura del Proyecto (Monorepo)

```text
packages/
├── kos-control-plane/       # Núcleo: Motores de especificación, ejecución y verificación.
├── kos-capability-runtime/  # Ejecución: Gestión de Skills y Router de modelos.
├── kos-persistence/         # Datos: Capa de persistencia con Supabase.
└── kos-studio-ui/           # Interfaz: Dashboard visual y gestión de workspaces.

docs/
├── KOS_Kernel_Architecture_Design.md   # Diseño arquitectónico del kernel.
├── KOS_SaaS_Platform.md                # Documentación del KOS SaaS Platform (repo externo).
└── legacy/kos-kernel.prototype.ts      # Prototipo inicial del kernel (referencia histórica).
```

> **Nota:** El *KOS SaaS Platform* (React + Express + tRPC, generado con Manus) vive en un repositorio propio y **no forma parte de este monorepo**. Aquí solo se conserva su documentación en `docs/KOS_SaaS_Platform.md`.

## 🛠️ Instalación y Configuración

### Requisitos Previos
- Node.js >= 18.0.0
- Cuenta en [Supabase](https://supabase.com/)
- API Key de [OpenRouter](https://openrouter.ai/)

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/dgr198213-ui/kos-governance-kernel.git
   cd kos-governance-kernel
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar la Base de Datos:**
   - Ejecuta el script SQL ubicado en `packages/kos-persistence/src/supabase/schema.sql` en tu instancia de Supabase.

4. **Variables de Entorno:**
   Crea un archivo `.env` en la raíz con:
   ```env
   VITE_SUPABASE_URL=tu_url_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   OPENROUTER_API_KEY=tu_clave_openrouter
   ```
   (Hay una plantilla disponible en `.env.example`.)

   > ⚠️ **Seguridad:** `OPENROUTER_API_KEY` no debe usarse nunca desde el navegador. Cualquier variable con prefijo `VITE_` se incrusta en el bundle del frontend y es pública. Las llamadas a OpenRouter deben hacerse desde un backend o proxy.

## 🚀 Ejecución

### Desarrollo
Para iniciar el Dashboard de Studio UI:
```bash
npm run studio:dev
```

### Build
Compila los paquetes en orden topológico (control-plane → capability-runtime → persistence → studio-ui):
```bash
npm run build
```

### Tests
La suite cubre EventBus, SpecEngine, KOSPipeline, ProviderRouter y OpenRouterProvider (con `fetch` mockeado):
```bash
npm test
```

### Integración continua
Cada push y pull request a `main` ejecuta build + tests mediante GitHub Actions (`.github/workflows/ci.yml`).

## 📜 Licencia
Este proyecto está bajo la Licencia MIT.

---
Desarrollado con ❤️ por el equipo de KOS. Basado en los principios de arquitectura de sistemas para LLMs (Karpathy Method).
