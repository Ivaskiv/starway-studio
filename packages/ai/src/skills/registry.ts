import { notifySkill } from './notify.skill.js'
import type { Skill } from './types.js'

export class SkillRegistry {
  private readonly skills = new Map<string, Skill>()

  register(skill: Skill): void {
    this.skills.set(skill.id, skill)
  }

  get(id: string): Skill | undefined {
    return this.skills.get(id)
  }

  list(): Skill[] {
    return Array.from(this.skills.values())
  }
}

export const skillRegistry = new SkillRegistry()

if (!skillRegistry.get(notifySkill.id)) {
  skillRegistry.register(notifySkill)
}
