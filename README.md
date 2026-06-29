# KOS Governance Kernel v0.2.0

> **Control Plane para ejecución gobernada de IA basado en el Método Karpathy.**

KOS (Kernel Operating System) es un sistema operativo de gobernanza diseñado para orquestar agentes de IA de forma determinista, segura y eficiente. A diferencia de los sistemas de chat tradicionales, KOS actúa como un procesador central que planifica, ejecuta y verifica cada tarea bajo un marco de gobernanza estricto.

## 🚀 Características Principales

### 🧠 Control Plane Determinista
- **Spec Engine**: Transforma intenciones ambiguas en especificaciones técnicas detalladas mediante entrevistas diagnósticas.
- **Agile Executor**: Descompone tareas complejas en micro-tareas manejables con gestión de dependencias.
- **Event Bus**: Sistema de comunicación reactiva que permite la trazabilidad total de cada decisión tomada por la IA.

### 🛡️ Gobernanza y Verificación
- **Verifier Engine**: Auditoría automática de resultados mediante modelos de IA secundarios y validación de señales externas.
- **Bucle de Retroalimentación**: Mejora iterativa del output hasta alcanzar los umbrales de calidad configurados.
- **Políticas de Aprobación**: Soporte nativo para intervención humana en tareas críticas.

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
```

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

## 🚀 Ejecución

### Desarrollo
Para iniciar el Dashboard de Studio UI:
```bash
npm run studio:dev
```

### Tests
Para ejecutar la suite de pruebas de los motores:
```bash
npm test
```

## 📜 Licencia
Este proyecto está bajo la Licencia MIT.

---
Desarrollado con ❤️ por el equipo de KOS. Basado en los principios de arquitectura de sistemas para LLMs (Karpathy Method).
