import type { GovernanceMatrix } from '../environment/types.js';

/**
 * Motor de la Matriz de Gobernanza (SIEMPRE / PREGUNTAR / NUNCA).
 *
 * Evalúa la intención y el plan de ejecución contra las reglas del
 * workspace de forma determinista y explicable: una regla coincide si
 * TODAS sus palabras clave significativas (sin stopwords ni acentos)
 * aparecen en el texto evaluado. Sin LLM y sin azar: la decisión de
 * bloquear algo tiene que ser reproducible y auditable.
 */

export interface GovernanceMatch {
  rule: string;
  rationale: string;
  matchedKeywords: string[];
  matchedIn: string;
  severity?: 'critical' | 'high' | 'medium';
  approver?: 'human' | 'automated';
  condition?: string;
}

export interface GovernanceDecision {
  verdict: 'allow' | 'require-approval' | 'block';
  blocks: GovernanceMatch[];
  approvals: GovernanceMatch[];
  evaluatedTexts: number;
}

const STOPWORDS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas',
  'en', 'que', 'con', 'por', 'para', 'sin', 'segun', 'y', 'o', 'u', 'a',
  'se', 'su', 'sus', 'al', 'lo', 'como', 'mas', 'the', 'of', 'in', 'to', 'and',
]);

export class GovernancePolicyEngine {
  /**
   * Evalúa una lista de textos (intención + micro-tareas) contra la matriz.
   * NUNCA tiene prioridad sobre PREGUNTAR.
   */
  evaluate(matrix: GovernanceMatrix, texts: Array<{ label: string; text: string }>): GovernanceDecision {
    const blocks: GovernanceMatch[] = [];
    const approvals: GovernanceMatch[] = [];

    for (const target of texts) {
      const normalizedTarget = this.normalize(target.text);

      for (const rule of matrix.never) {
        const matched = this.matchRule(rule.action, normalizedTarget);
        if (matched) {
          blocks.push({ rule: rule.action, rationale: rule.rationale, severity: rule.severity, matchedKeywords: matched, matchedIn: target.label });
        }
      }

      for (const rule of matrix.consult) {
        const matched = this.matchRule(rule.action, normalizedTarget);
        if (matched) {
          approvals.push({ rule: rule.action, rationale: rule.rationale, approver: rule.approver, condition: rule.condition, matchedKeywords: matched, matchedIn: target.label });
        }
      }
    }

    return {
      verdict: blocks.length > 0 ? 'block' : approvals.length > 0 ? 'require-approval' : 'allow',
      blocks: this.dedupe(blocks),
      approvals: this.dedupe(approvals),
      evaluatedTexts: texts.length,
    };
  }

  /** Devuelve las keywords coincidentes si TODAS las de la regla están en el texto; si no, null. */
  private matchRule(action: string, normalizedTarget: string): string[] | null {
    const keywords = this.keywords(action);
    if (keywords.length === 0) return null;
    const targetWords = new Set(normalizedTarget.split(/\W+/));
    const matched = keywords.filter(k => targetWords.has(k));
    return matched.length === keywords.length ? matched : null;
  }

  private keywords(action: string): string[] {
    return this.normalize(action)
      .split(/\W+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w));
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private dedupe(matches: GovernanceMatch[]): GovernanceMatch[] {
    const seen = new Set<string>();
    return matches.filter(m => {
      const key = `${m.rule}::${m.matchedIn}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
