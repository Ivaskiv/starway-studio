import {
  AI_MENTOR_PROMPTS,
  AI_PRODUCER_SYSTEM_PROMPT,
} from './config/prompts.js'
import { prisma } from './db/client.js'

export interface PromptResult {
  content: string
  config: Record<string, unknown>
  source: 'db' | 'fallback'
}

const FORBIDDEN_WORDS = ['stage', 'status_id', 'runtime', 'db_index']

export class PromptProvider {
  private static fallbackRegistry: Record<string, string> = {
    'start.welcome':
      'Привіт.\nЦе тест AB System:\n«Чому ти відкладаєш те, що давно хочеш зробити?»\n\nПросто відповідай так, як є зараз.',
    'start.lead_active':
      'Привіт.\nЦе тест AB System:\n«Чому ти відкладаєш те, що давно хочеш зробити?»\n\nПросто відповідай так, як є зараз.',
    'start.test_in_progress':
      'У тесті буде 5 питань.\nОбирай той варіант, який найбільше схожий на тебе зараз.\n\nНе треба відповідати «правильно».\nТреба чесно.',
    'test.welcome_back':
      'У тесті буде 5 питань.\nОбирай той варіант, який найбільше схожий на тебе зараз.\n\nНе треба відповідати «правильно».\nТреба чесно.',
    'mentor.system': AI_MENTOR_PROMPTS.SYSTEM,
    'mentor.morning.system': AI_MENTOR_PROMPTS.MORNING.SYSTEM,
    'mentor.morning.user': AI_MENTOR_PROMPTS.MORNING.USER_TEMPLATE,
    'mentor.evening.system': AI_MENTOR_PROMPTS.EVENING.SYSTEM,
    'mentor.evening.user': AI_MENTOR_PROMPTS.EVENING.USER_TEMPLATE,
    'mentor.wheel.system': AI_MENTOR_PROMPTS.WHEEL.SYSTEM,
    'mentor.chat.system': AI_MENTOR_PROMPTS.CHAT.SYSTEM,
    'mentor.weekly.system': AI_MENTOR_PROMPTS.WEEKLY.SYSTEM,
    'producer.system': AI_PRODUCER_SYSTEM_PROMPT,
  }

  static async getPrompt(
    slug: string,
    context: Record<string, string> = {}
  ): Promise<PromptResult> {
    let rawContent: string | undefined
    let config: Record<string, unknown> = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
    }
    let source: 'db' | 'fallback' = 'fallback'

    try {
      const record = await prisma.promptVersion.findFirst({
        where: { name: slug, isActive: true },
        orderBy: { version: 'desc' },
      })
      if (record) {
        rawContent = record.content
        source = 'db'
      }
    } catch (error) {
      console.error(`[PromptProvider] Error fetching prompt "${slug}":`, error)
    }

    if (!rawContent) {
      rawContent = this.fallbackRegistry[slug]
      if (!rawContent) {
        return {
          content: '',
          config: { model: 'gpt-4o-mini', temperature: 0.7 },
          source: 'fallback',
        }
      }
    }

    return {
      content: this.compile(rawContent, context),
      config,
      source,
    }
  }

  static async validate(
    newContent: string,
    slug: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []
    const varRegex = /{{(.*?)}}/g
    const getKeys = (str: string) =>
      [...str.matchAll(varRegex)].map((m) => m[1].trim())

    let activeContent: string | undefined
    try {
      const dbPrompt = await prisma.promptVersion.findFirst({
        where: { name: slug, isActive: true },
        orderBy: { version: 'desc' },
      })
      activeContent = dbPrompt?.content ?? this.fallbackRegistry[slug]
    } catch {
      activeContent = this.fallbackRegistry[slug]
    }

    if (activeContent) {
      for (const key of getKeys(activeContent)) {
        if (!getKeys(newContent).includes(key)) {
          errors.push(`Критична змінна {{${key}}} видалена`)
        }
      }
    }

    for (const word of FORBIDDEN_WORDS) {
      if (newContent.toLowerCase().includes(word)) {
        errors.push(`Copy contains telemetry language: "${word}"`)
      }
    }

    if (errors.length > 0) {
      console.error(
        `[SOS/Admin-Safety] Validation failed for "${slug}": ${errors.join(', ')}`
      )
    }

    return { isValid: errors.length === 0, errors }
  }

  private static compile(
    template: string,
    context: Record<string, string>
  ): string {
    return template.replace(/{{(.*?)}}/g, (_, p1) => {
      const key = p1.trim()
      if (key in context) return context[key]
      console.warn(`[PromptProvider] Missing variable "${key}" in context`)
      return key === 'userName' ? 'Сяюча зірка' : ''
    })
  }
}
