import { openai } from '../../../lib/openai.js'
import { buildContextPrompt, buildSystemPrompt } from '../../ai-mentor/prompt.js'
import { PROMPT_INITIAL, PROMPT_UPDATE } from '../../ai-mentor/state.service.js'
import { getRecentUserEvents } from '../../events/service.js'
import type { RouterContext } from '../router/context.js'
import type { Intent } from '../router/intent.js'
import type { RoleConfig, RoleResult } from './base.role.js'

export const mentorRoleConfig: RoleConfig = {
  systemPrompt: [buildSystemPrompt(), PROMPT_INITIAL, PROMPT_UPDATE].join('\n\n'),
  temperature: 0.4,
  maxTokens: 500,
}

function buildModePrompt(context: RouterContext, intent: Intent): string {
  if (context.userState === 'in_trial') {
    return [
      'Режим: TRIAL.',
      'Давай більше користі, менше продажу.',
      'Кожна відповідь: коротко, конкретно, 1 наступна дія.',
      `Intent: ${intent}.`,
    ].join('\n')
  }

  if (context.userState === 'subscribed') {
    return [
      'Режим: SUBSCRIBED.',
      'Можна глибше, але без води.',
      'Веди до рішення, а не до розмови.',
      `Intent: ${intent}.`,
    ].join('\n')
  }

  return [
    'Режим: ACTIVE.',
    'Тримай фокус на наступному кроці.',
    `Intent: ${intent}.`,
  ].join('\n')
}

export async function runMentorRole(context: RouterContext, intent: Intent): Promise<RoleResult> {
  if (process.env.APP_MODE === 'LM_ONLY') {
    // [LM_ONLY_MODE] AI disabled during funnel-only phase.
    return {
      reply: 'Зараз доступний тільки безкоштовний практикум. Заверши його, щоб рухатись далі.',
      action: 'NONE',
      buttons: [
        { text: '▶️ Продовжити', callback_data: 'lm_continue' },
      ],
    }
  }

  const baseContext = context.userId ? await buildContextPrompt(context.userId) : '{}'
  const recentEvents = context.userId ? await getRecentUserEvents(context.userId, 8) : []
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: mentorRoleConfig.temperature,
    max_tokens: mentorRoleConfig.maxTokens,
    messages: [
      { role: 'system', content: [mentorRoleConfig.systemPrompt, buildModePrompt(context, intent)].join('\n\n') },
      {
        role: 'user',
        content: JSON.stringify({
          routerContext: context,
          mentorContext: baseContext,
          recentEvents,
          intent,
          message: context.rawText,
        }),
      },
    ],
  })

  return {
    reply: completion.choices[0]?.message?.content?.trim() || 'Сформулюй питання конкретніше.',
    action: 'NONE',
  }
}
