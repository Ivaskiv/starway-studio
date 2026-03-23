import { getStateMessage } from '../handlers/start.js'
import type { RouterContext } from '../router/context.js'
import type { Intent } from '../router/intent.js'
import type { RoleConfig, RoleResult } from './base.role.js'

export const funnelRoleConfig: RoleConfig = {
  systemPrompt: 'Ти визначаєш наступний крок у funnel flow. Тільки конкретний CTA.',
  temperature: 0.1,
  maxTokens: 200,
}

function getTrialDayLabel(trialStartsAt: Date | null | undefined): string | undefined {
  if (!trialStartsAt) {
    return undefined
  }

  return String(Math.max(1, Math.floor((Date.now() - trialStartsAt.getTime()) / 86400000) + 1))
}

export async function runFunnelRole(context: RouterContext, intent: Intent): Promise<RoleResult> {
  if (!context.userId) {
    return {
      reply: 'Система недоступна без прив\'язки користувача.',
      action: 'NONE',
    }
  }

  if (intent === 'off_topic') {
    return {
      reply: 'Зараз ти в процесі практикуму.\n\nЯ не тут щоб пояснювати що я вмію.\n\n👉 Що зараз найбільше заважає тобі рухатись до результату?',
      buttons: [
        { text: '▶️ Продовжити', callback_data: 'lm_continue' },
        { text: '📊 Мій стан', callback_data: 'open_status' },
      ],
      action: 'NONE',
    }
  }

  if (intent === 'product_intent') {
    return {
      reply: 'Рішення не в ще одному поясненні.\n\nАбо запускаєш систему зараз, або залишаєш все на рівні думок.\n\n👉 Який крок обираєш?',
      buttons: [
        { text: '✨ Пройти практикум', callback_data: 'lm_continue' },
        { text: '🚀 Отримати результат', callback_data: 'start_trial' },
        { text: '📊 Мій стан', callback_data: 'open_status' },
      ],
      action: 'NONE',
    }
  }

  if (intent === 'resistance' || intent === 'support') {
    return {
      reply: 'Зупинись на секунду.\n\n👉 Що саме тебе зараз стопорить: неясність, страх чи відкладання?',
      buttons: [
        { text: '🧭 Знайти причину', callback_data: 'open_status' },
        { text: '▶️ Продовжити', callback_data: 'lm_continue' },
      ],
      action: 'NONE',
    }
  }

  if (intent === 'progress') {
    return {
      reply: 'Не зупиняйся на розумінні.\n\n👉 Повернись у практикум і закрий наступний крок.',
      buttons: [
        { text: '▶️ Продовжити', callback_data: 'lm_continue' },
        { text: '📊 Мій стан', callback_data: 'open_status' },
      ],
      action: 'NONE',
    }
  }

  const message = await getStateMessage(
    context.userState,
    '',
    {
      insight: context.mentorInsight,
      stage: context.mentorStage,
      blocker: context.mentorBlocker,
    },
    getTrialDayLabel(context.userMenuContext?.trialStartsAt),
    0,
  )

  return {
    reply: message.text,
    buttons: message.buttons
      .flat()
      .filter((button): button is { text: string; callback_data: string } => 'callback_data' in button),
    action: 'NONE',
  }
}
