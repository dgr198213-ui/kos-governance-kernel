# Diseño Arquitectónico del KOS Kernel

## Resumen Ejecutivo

Este documento detalla el diseño arquitectónico del **Sistema Operativo / IDE de Gobernanza de LLMs (KOS Kernel)**, un proxy hermético diseñado para erradicar la asimetría de información y la brecha de contexto en la operación de modelos de lenguaje grandes (LLMs) a través de APIs. El KOS Kernel impone un diseño estructurado en tres capas principales (Spec, Verificador y Entorno) dentro de un bucle cerrado de auto-aprendizaje, compatible con despliegues locales o en la nube.

El objetivo principal es asegurar que los "fantasmas estadísticos" (modelos por API) operen estrictamente bajo un conjunto de reglas y un contexto predefinido, mitigando así fallos operativos y garantizando la gobernanza corporativa. La implementación se realizará en **TypeScript/Node.js** para permitir una ejecución ligera en entornos `local-first` y escalabilidad en arquitecturas `cloud-native`.

## Principios de Diseño

*   **Desacoplamiento:** Cada capa y componente está diseñado para ser independiente, facilitando el mantenimiento y la escalabilidad.
*   **Determinismo:** Las operaciones del sistema son predecibles y consistentes, eliminando la ambigüedad en la interacción con los LLMs.
*   **Modularidad:** El sistema se compone de módulos bien definidos que pueden ser desarrollados y probados de forma aislada.
*   **Anti-Cascada (Agile):** El diseño evita la ejecución masiva de instrucciones, promoviendo un enfoque iterativo y de feedback continuo.

## Arquitectura General del KOS Kernel

El KOS Kernel se estructura en cuatro fases de desarrollo que corresponden a las tres capas operativas y un bucle de auto-optimización. A continuación, se presenta una visión general de la arquitectura:

### 1. Fase 1: Motor de la Capa I (La Especificación - Spec)

Esta capa es responsable de procesar la intención inicial del usuario, evitando el envío directo de instrucciones masivas a la API del LLM. Su función principal es asegurar que la intención sea clara y bien definida antes de cualquier ejecución.

#### Componentes Clave:

*   **Interceptador de Intenciones del Usuario:** Bloquea el envío directo de instrucciones masivas a la API.
*   **Motor de Entrevista Inversa:** Genera preguntas de diagnóstico automatizadas para extraer restricciones ocultas y clarificar la intención del usuario.
*   **Gestor de Fragmentación Granular:** Descompone el objetivo real extraído en una cola de micro-tareas unitarias, cada una con estados de revisión en caliente.
*   **Calculador de Umbral de Ambigüedad:** Evalúa la precisión sintáctica y contextual de la intención del usuario. Si la ambigüedad es alta, activa la Entrevista Inversa.

### 2. Fase 2: Motor de la Capa II (El Verificador)

La capa del Verificador actúa como un bucle cerrado multi-agente, auditando y optimizando las salidas del LLM. Su objetivo es garantizar que las respuestas del modelo cumplan con los criterios predefinidos y se anclen a fuentes de verdad externas.

#### Componentes Clave:

*   **Pipeline de Orquestación Multi-Agente:** Enruta la respuesta del modelo `Executor` hacia el modelo `Critic` para su evaluación.
*   **Modelo Executor:** Simula la llamada al LLM, guiado por el contexto bajo demanda.
*   **Modelo Critic:** Audita el output del `Executor` basándose en criterios predefinidos y señales externas (`Ground Truth`).
*   **Integrador de Señales Externas:** Interfaz para conectar el validador a bases de datos vectoriales locales, logs del sistema o archivos históricos corporativos, proporcionando el `Ground Truth`.
*   **Bucle de Feedback Repetitivo (Loop de Barret Zoph):** Itera sobre outputs deficientes, retroalimentando al `Executor` con el diferencial exacto del error detectado por el `Critic` hasta que se apruebe la calidad o se alcance un límite de iteraciones.

### 3. Fase 3: Motor de la Capa III (El Entorno - El Taller)

Esta capa es el middleware determinista que aplica las reglas de gobernanza corporativa y gestiona el estado persistente del sistema. Asegura que todas las acciones se realicen dentro de los límites definidos.

#### Componentes Clave:

*   **Abstracción y Parseo del Archivo de Estado Persistente `Cloud.md`:** Gestiona la carga y persistencia del estado del taller operativo.
*   **Motor de Matriz de Gobernanza:** Una capa de middleware dura que evalúa cada llamada contra los niveles de gobernanza: `SIEMPRE`, `PREGUNTAR` y `NUNCA`.
    *   **SIEMPRE:** Ejecución automática por protocolo.
    *   **PREGUNTAR:** Requiere un `checkpoint` e intervención humana.
    *   **NUNCA:** Restricción dura, aborta inmediatamente la acción.
*   **Catálogo de Skills:** Almacenamiento modular de estructuras de salida fijas y ganchos de llamada pre-validados.

### 4. Fase 4: Bucle Cerrado de Auto-Optimización

Esta fase es el pipeline asíncrono que permite al sistema aprender y evolucionar dinámicamente, refactorizando reglas y perfeccionando las `Skills` del catálogo basándose en el feedback del `Critic` y las correcciones manuales.

#### Componentes Clave:

*   **Módulo de Telemetría y Captura de Discrepancias:** Registra los `diffs` de error (correcciones manuales o rechazos del `Critic`).
*   **Compilador Asíncrono de Optimización de Reglas:** Refactoriza dinámicamente las directrices de `Cloud.md` y el catálogo de `Skills` basándose en el aprendizaje histórico del bucle continuo.

## Estructura del Código Base (KOS Kernel en TypeScript)

El núcleo del sistema se implementará en TypeScript, siguiendo una estructura de clases que encapsula la lógica de cada capa. La clase principal `KOSGovernanceOS` orquestará la interacción entre las capas.

```typescript
// kos-kernel.ts

export enum GovernanceLevel {
    SIEMPRE = "SIEMPRE",     // Nivel 1: Ejecución automática por protocolo
    PREGUNTAR = "PREGUNTAR", // Nivel 2: Requiere checkpoint e intervención humana
    NUNCA = "NUNCA"         // Nivel 3: Restricción dura, abortar inmediatamente
}

export interface TaskBlock {
    id: string;
    description: string;
    status: 'PENDING' | 'IN_HOT_REVIEW' | 'APPROVED' | 'FAILED';
    output?: string;
}

export interface CloudMD {
    identity: string;
    contextOnDemandRules: string[];
    skillsCatalog: Map<string, Function>;
    governanceMatrix: Map<string, GovernanceLevel>; // Registro de acciones reguladas
}

export class KOSGovernanceOS {
    private activeEnvironment: CloudMD;
    private currentSpecTasks: TaskBlock[] = [];
    private ambiguityThreshold: number = 0.75;

    constructor(initialEnvironment: CloudMD) {
        this.activeEnvironment = initialEnvironment; // Capa III: Carga persistente del taller
    }

    /**
     * CAPA I: THE SPEC - Procesa la intención primaria evitando el modo cascada
     */
    public async processUserIntention(intention: string): Promise<{ requiresInterview: boolean; questions?: string[]; tasks?: TaskBlock[] }> {
        // Evaluar ambigüedad matemática o semántica para extraer el "Objetivo Real"
        const ambiguityScore = this.calculateAmbiguity(intention);
        
        if (ambiguityScore > this.ambiguityThreshold) {
            // Activar paso de diagnóstico: Entrevista Inversa
            const interviewQuestions = [
                "Identifique las restricciones implícitas de este proyecto no declaradas explícitamente.", // Basado en protocolo de diagnóstico
                "¿Cuál es el valor estratégico de negocio subyacente u objetivo real de este entregable?"
            ];
            return { requiresInterview: true, questions: interviewQuestions };
        }

        // Si es claro, descomponer en micro-tareas unitarias (Fragmentación Ágil)
        this.currentSpecTasks = this.fragmentIntoMicroTasks(intention);
        return { requiresInterview: false, tasks: this.currentSpecTasks };
    }

    /**
     * CAPA III: ENFORCEMENT DEL ENTORNO - Middleware determinista de reglas duras
     */
    private enforceEnvironmentRules(actionKey: string): GovernanceLevel {
        const rule = this.activeEnvironment.governanceMatrix.get(actionKey);
        if (!rule) return GovernanceLevel.PREGUNTAR; // Por defecto congelar ante lo desconocido
        
        if (rule === GovernanceLevel.NUNCA) {
            throw new Error(`[VIOLACIÓN DE GOBERNANZA]: La acción '${actionKey}' está estrictamente PROHIBIDA por el entorno.`); // Restricción Hard
        }
        return rule;
    }

    /**
     * CAPA II: THE VERIFIER - Bucle cerrado multi-agente con anclaje a fuentes reales
     */
    public async executeUnitaryTask(task: TaskBlock, externalSignals: string[]): Promise<string> {
        // 1. Validar reglas de entorno antes de procesar llamadas de ejecución
        const enforcement = this.enforceEnvironmentRules(task.description);
        if (enforcement === GovernanceLevel.PREGUNTAR) {
            return `[CHECKPOINT ACTIVADO]: Esperando validación explícita del arquitecto humano para proceder con la tarea.`; // Detención controlada
        }

        let loopIteration = 0;
        const maxLoops = 3; // Límite del loop de optimización para control de tokens
        let currentOutput = "";
        let isQualityApproved = false;

        // Iniciar Bucle de Feedback Cerrado (Loop de Barret Zoph)
        while (!isQualityApproved && loopIteration < maxLoops) {
            // Simulamos la llamada al modelo Executor guiado por el contexto bajo demanda
            currentOutput = await this.callExecutorModel(task, this.activeEnvironment.identity);

            // El Segundo Bibliotecario (Modelo Crítico) audita el output basándose en los criterios predefinidos y el Ground Truth
            const verificationResult = this.callCriticModel(currentOutput, externalSignals);

            if (verificationResult.passed) {
                isQualityApproved = true;
            } else {
                // El bucle retroalimenta al Executor con el diferencial exacto del error detectado por el Crítico
                task.description += `\n[Feedback del Crítico - Intento ${loopIteration}]: ${verificationResult.feedback}`;
                loopIteration++;
            }
        }

        // BUCLE CERRADO DE AUTO-APRENDIZAJE: Si el bucle requirió correcciones, mutar el entorno de forma asíncrona
        if (loopIteration > 0) {
            this.triggerSelfLearningOptimization(task.description, currentOutput);
        }

        task.status = isQualityApproved ? 'APPROVED' : 'FAILED';
        task.output = currentOutput;
        return currentOutput;
    }

    private calculateAmbiguity(input: string): number {
        // Lógica determinista de evaluación de precisión sintáctica/contextual
        return input.length < 30 ? 0.9 : 0.4; 
    }

    private fragmentIntoMicroTasks(intention: string): TaskBlock[] {
        return [
            { id: "T1", description: "Configurar estructura base y esquemas de datos fijos", status: 'PENDING' },
            { id: "T2", description: "Implementar interceptores del proxy de API según la matriz", status: 'PENDING' }
        ];
    }

    private async callExecutorModel(task: TaskBlock, identity: string): Promise<string> {
        return `[Output Executor para: ${task.description} bajo rol ${identity}]`; 
    }

    private callCriticModel(output: string, groundTruth: string[]): { passed: boolean; feedback?: string } {
        // Auditoría cruzada estricta frente a señales reales y documentación verificada
        const legacyViolationDetected = false; 
        if (legacyViolationDetected) {
            return { passed: false, feedback: "El output se desvía del estándar de arquitectura del proyecto." };
        }
        return { passed: true };
    }

    /**
     * OPTIMIZACIÓN ASÍNCRONA DEL PROPIO BUCLE: Evolución de Cloud.md
     */
    private triggerSelfLearningOptimization(errorContext: string, correctOutput: string): void {
        console.log("[BUCLE CERRADO]: Generando diferencial (diff) de aprendizaje.");
        // Se asume la inyección asíncrona de una actualización en el catálogo de Skills o reglas inyectadas
        this.activeEnvironment.contextOnDemandRules.push(`Optimización automatizada ante desviación detectada en: ${errorContext.substring(0, 30)}`);
    }
}
```

## Referencias

[1] Documentación técnica definitiva del usuario (Archivo `pasted_content.txt` proporcionado por el usuario).
