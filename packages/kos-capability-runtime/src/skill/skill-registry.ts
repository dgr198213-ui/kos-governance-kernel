import { eventBus } from '@kos/control-plane';
import type { Skill, SkillExecutionResult, SkillStatus } from './types.js';

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private skillsByName: Map<string, string> = new Map();

  async register(skill: Skill): Promise<void> {
    this.validateManifest(skill.manifest);
    const existingId = this.skillsByName.get(skill.manifest.name);
    if (existingId) {
      const existing = this.skills.get(existingId);
      if (existing && existing.manifest.version === skill.manifest.version) {
        throw new Error(`Skill ${skill.manifest.name}@${skill.manifest.version} already registered`);
      }
    }
    this.skills.set(skill.id, skill);
    this.skillsByName.set(skill.manifest.name, skill.id);
    await eventBus.emit({
      id: this.generateId(), type: 'SkillInvoked', timestamp: Date.now(),
      workspaceId: '*', correlationId: `registry-${Date.now()}`, executionId: skill.id,
      payload: { action: 'registered', skillId: skill.id, skillName: skill.manifest.name, version: skill.manifest.version }
    });
  }

  get(skillId: string): Skill | undefined { return this.skills.get(skillId); }
  getByName(name: string): Skill | undefined {
    const id = this.skillsByName.get(name);
    return id ? this.skills.get(id) : undefined;
  }

  list(filter?: { category?: string; status?: SkillStatus }): Skill[] {
    let result = Array.from(this.skills.values());
    if (filter?.category) result = result.filter(s => s.manifest.category === filter.category);
    if (filter?.status) result = result.filter(s => s.status === filter.status);
    return result;
  }

  async updateStatus(skillId: string, status: SkillStatus): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) throw new Error(`Skill ${skillId} not found`);
    skill.status = status;
    skill.updatedAt = Date.now();
  }

  async unregister(skillId: string): Promise<boolean> {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    this.skillsByName.delete(skill.manifest.name);
    this.skills.delete(skillId);
    return true;
  }

  private validateManifest(manifest: Skill['manifest']): void {
    if (!manifest.name || manifest.name.trim() === '') throw new Error('Skill manifest must have a name');
    if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('Skill manifest must have a valid semver version');
    if (!manifest.description) throw new Error('Skill manifest must have a description');
    if (manifest.estimatedDuration <= 0) throw new Error('Skill estimated duration must be positive');
  }

  updateUsageStats(skillId: string, result: SkillExecutionResult): void {
    const skill = this.skills.get(skillId);
    if (!skill) return;
    const stats = skill.usageStats;
    const prevTotal = stats.totalRuns;
    stats.totalRuns++;
    stats.averageDuration = (stats.averageDuration * prevTotal + result.metrics.duration) / stats.totalRuns;
    stats.averageCost = (stats.averageCost * prevTotal + result.metrics.cost) / stats.totalRuns;
    stats.lastRunAt = Date.now();
    if (result.status === 'success') {
      stats.successRate = (stats.successRate * prevTotal + 1) / stats.totalRuns;
    } else {
      stats.successRate = (stats.successRate * prevTotal) / stats.totalRuns;
    }
  }

  private generateId(): string { return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`; }
}
