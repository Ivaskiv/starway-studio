
import { resolveModelStrategyTier } from '@starway/ai/providers/routing'

import { prisma } from '@/db/client.js'
import { coachBot } from '@/lib/telegram.js'
import { callProviderSafe } from '@/modules/sales-assistant/sales-assistant.providers.js'
import {
  AI_OPERATOR_ACTIONS,
  DEFAULT_STYLE_HINTS,
  __testOnly,
  deriveStyleHints,
  docs,
  escapeHtml,
  extractDiff,
  getKyivDateKey,
  getKyivDayBounds,
  readDailyExecution,
  readStyleMemory,
  saveDailyExecution,
  withAiDocuments,
  type AiOperatorAction,
  type DailyExecutionState,
  type OperatorStep,
  type StartDayState,
  type StyleMemoryState,
} from './operator.foundation.js'

async function collectStartDayState(userId: string): Promise<StartDayState> {
 const { start, end } = getKyivDayBounds()

 const zoom_bookings_today = await prisma.zoomSessionAttendee.count({
 where: {
 userId,
 session: {
 scheduledAt: {
 gte: start,
 lte: end,
 },
 },
 },
 })

 return {
 post_today_exists: false,
 zoom_bookings_today,
 conversations_count: null,
 }
}

async function generateContentPost(styleHints: string[]): Promise<string> {
 const knowledgePack = docs()
 const response = await callProviderSafe(
 'claude',
 [
 'Ти виконуєш роль ai-content як операторський execution agent.',
 'Використовуй тільки knowledge pack нижче.',
 knowledgePack.operatingRules,
 knowledgePack.aiContentPrompt,
 ].join('\n\n'),
 [
 'Завдання: згенеруй 1 Instagram-пост для FOCUS українською.',
 'Формат:',
 '- сильний хук на початку',
 '- 2-4 короткі абзаци',
 '- один чіткий CTA в кінці',
 '- без хештегів',
 '- без markdown',
 '- без пояснень і варіантів',
 'Контекст продукту: FOCUS = щотижневі Zoom-розбори AB System.',
 'Ціль: підштовхнути до публікації поста сьогодні.',
 styleHints.length > 0
 ? `Write in this style:\n${styleHints.join('\n')}`
 : `Write in this style:\n${DEFAULT_STYLE_HINTS.join('\n')}`,
 'Поверни тільки готовий текст поста.',
 ].join('\n'),
 {
 contentType: 'telegram',
 strategyTier: resolveModelStrategyTier('raw_truth'),
 },
 )

 return response.content?.trim() || 'Сьогодні вийди не в контент, а в ясність.\n\nFOCUS не про ще одну мотивацію. Це місце, де перестаєш крутити одну й ту саму думку по колу і починаєш бачити, де саме зливається дія.\n\nРаз на тиждень на Zoom-розборі розбирається реальна ситуація: що відкладається, яке рішення зависло і який крок потрібно зробити зараз.\n\nЯкщо час перестати ходити по колу — заходь у FOCUS.'
}

async function generateOutreachMessage(): Promise<string> {
 const knowledgePack = docs()
 const response = await callProviderSafe(
 'claude',
 [
 'Ти виконуєш роль ai-assistant для operator execution flow.',
 'Використовуй тільки knowledge pack нижче.',
 knowledgePack.operatingRules,
 knowledgePack.aiAssistantPrompt,
 knowledgePack.aiMentorMethodPrompt,
 knowledgePack.aiFocusPrompt,
 ].join('\n\n'),
 [
 'Завдання: згенеруй 1 коротке outreach-повідомлення, яке коуч надішле 5 людям.',
 'Формат:',
 '- українською',
 '- 4-6 коротких рядків',
 '- природно, без маніпуляцій',
 '- одна чітка дія в кінці',
 '- без markdown',
 '- без варіантів і без пояснень',
 'Контекст: запросити в FOCUS на щотижневий Zoom-розбір.',
 'Поверни тільки готовий текст повідомлення.',
 ].join('\n'),
 {
 contentType: 'telegram',
 strategyTier: resolveModelStrategyTier('raw_truth'),
 },
 )

 return response.content?.trim() || 'Привіт.\n\nЄ формат, де можна не говорити навколо проблеми, а розібрати одну реальну ситуацію й побачити, де саме стопориться дія.\n\nЦе щотижневий Zoom-розбір FOCUS.\n\nЯкщо хочеш — скину деталі і найближчу дату.'
}

async function generateDialogueAssistMessage(dialogueContext: string): Promise<string> {
 const knowledgePack = docs()
 const response = await callProviderSafe(
 'claude',
 [
 'Ти виконуєш роль ai-assistant для operator execution flow.',
 'Використовуй тільки knowledge pack нижче.',
 knowledgePack.operatingRules,
 knowledgePack.aiAssistantPrompt,
 knowledgePack.aiMentorMethodPrompt,
 knowledgePack.aiFocusPrompt,
 ].join('\n\n'),
 [
 'Завдання: допоможи коучу дотиснути діалог після outreach.',
 'Формат:',
 '- українською',
 '- короткий розбір у 1-2 рядки',
 '- далі 1 готова відповідь, яку можна одразу надіслати',
 '- без markdown',
 '- без кількох варіантів',
 'Ось відповіді або контекст діалогу:',
 dialogueContext,
 ].join('\n'),
 {
 contentType: 'telegram',
 strategyTier: resolveModelStrategyTier('raw_truth'),
 },
 )

 return response.content?.trim() || 'Тримай коротку відповідь: "Бачу, що тема зараз жива. Якщо хочеш, я скину найближчу дату Zoom-розбору і ти подивишся, чи тобі підходить формат."'
}

function buildPostStep(input: {
 state: StartDayState
 postContent: string
}): OperatorStep {
 return {
 text: [
 '<b>Стан:</b>',
 `Пост: ${input.state.post_today_exists ? '' : ''}`,
 `Zoom бронювання сьогодні: ${input.state.zoom_bookings_today}`,
 '',
 '<b>Що робимо:</b>',
 'Опублікувати пост',
 '',
 '<b>Пост:</b>',
 escapeHtml(input.postContent),
 ].join('\n'),
 buttons: [
 [
 { text: 'Редагувати', callback_data: AI_OPERATOR_ACTIONS.POST_EDIT },
        { text: 'Опублікувала', callback_data: AI_OPERATOR_ACTIONS.POST_DONE },
      ],
    ],
  }
}

function buildEditPromptStep(): OperatorStep {
  return {
    text: 'Відредагуй текст і надішли його повідомленням',
 buttons: [],
 }
}

function buildEditedPostStep(finalPost: string): OperatorStep {
 return {
 text: [
 '<b>Оновлений пост:</b>',
 escapeHtml(finalPost),
 ].join('\n\n'),
 buttons: [
 [
 { text: 'Опублікувати', callback_data: AI_OPERATOR_ACTIONS.POST_PUBLISH },
        { text: 'Згенерувати новий', callback_data: AI_OPERATOR_ACTIONS.POST_REGEN },
      ],
    ],
  }
}

function buildOutreachStep(outreachContent: string): OperatorStep {
  return {
    text: [
      '<b>Далі:</b>',
      'Напиши 5 людям:',
      '',
      escapeHtml(outreachContent),
    ].join('\n'),
    buttons: [
      [{ text: 'Написала', callback_data: AI_OPERATOR_ACTIONS.OUTREACH_DONE }],
    ],
  }
}

function buildOutreachFollowupStep(): OperatorStep {
  return {
    text: [
      '🔥 Добре.',
      '',
      'Тепер скинь відповіді або напиши:',
      'є діалоги / нема',
    ].join('\n'),
    buttons: [
      [
        { text: 'Є діалоги', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_YES },
        { text: 'Нема', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_NO },
      ],
    ],
  }
}

function buildDialoguePromptStep(): OperatorStep {
  return {
    text: [
      'Я розберу відповіді і допоможу дожати.',
      '',
      '👉 Скинь відповіді повідомленням',
    ].join('\n'),
    buttons: [
      [{ text: 'Нема', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_NO }],
    ],
  }
}

function buildDialogueAssistStep(assistMessage: string): OperatorStep {
  return {
    text: [
      '<b>Що відповісти:</b>',
      escapeHtml(assistMessage),
    ].join('\n\n'),
    buttons: [
      [
        { text: 'Є ще діалоги', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_YES },
        { text: 'Нема', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_NO },
      ],
    ],
  }
}

function buildDialogueLoopStep(): OperatorStep {
  return {
    text: 'Напиши ще 5 людям',
 buttons: [
 [{ text: 'Написала', callback_data: AI_OPERATOR_ACTIONS.OUTREACH_DONE }],
    ],
  }
}

function buildDoneStep(state: DailyExecutionState): OperatorStep {
  return {
    text: [
      '<b>Сьогоднішній execution закрито.</b>',
      `Пост: ${state.post_done ? '✅' : '❌'}`,
      `Outreach: ${state.outreach_done ? '✅' : '❌'}`,
    ].join('\n'),
    buttons: [],
  }
}

function buildPublishConfirmStep(): OperatorStep {
  return {
    text: [
      '✅ Пост готовий.',
      '',
      '👉 Далі: напиши 5 людям',
    ].join('\n'),
    buttons: [
      [{ text: 'Написала', callback_data: AI_OPERATOR_ACTIONS.OUTREACH_DONE }],
    ],
  }
}

async function loadUserOperatorState(userId: string): Promise<{
  settings: unknown
  dailyExecution: DailyExecutionState
  styleMemory: StyleMemoryState
  state: StartDayState
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  })

  const dateKey = getKyivDateKey()
  return {
    settings: user?.settings ?? {},
    dailyExecution: readDailyExecution(user?.settings, dateKey),
    styleMemory: readStyleMemory(user?.settings),
    state: await collectStartDayState(userId),
  }
}

export async function runCoachStartDay(userId: string): Promise<OperatorStep> {
  const result = await withAiDocuments(async () => {
    const { settings, dailyExecution, styleMemory, state } = await loadUserOperatorState(userId)

    if (!dailyExecution.post_done) {
      if (dailyExecution.editing_post) {
        return buildEditPromptStep()
      }

      const postContent =
        dailyExecution.final_post ??
        dailyExecution.draft_post ??
        dailyExecution.post_content ??
        await generateContentPost(styleMemory.styleHints)
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        draft_post: postContent,
        post_content: postContent,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildPostStep({ state, postContent })
    }

    if (dailyExecution.awaiting_dialogues) {
      return buildDialoguePromptStep()
    }

    if (!dailyExecution.outreach_done) {
      const outreachContent = dailyExecution.outreach_content ?? await generateOutreachMessage()
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        outreach_content: outreachContent,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildOutreachStep(outreachContent)
    }

    return buildDoneStep(dailyExecution)
  })

  return result
}

export async function runCoachOperatorAction(
  userId: string,
  action: AiOperatorAction,
): Promise<OperatorStep> {
  const result = await withAiDocuments(async () => {
    const { settings, dailyExecution, styleMemory, state } = await loadUserOperatorState(userId)

    if (
      action === AI_OPERATOR_ACTIONS.POST_EDIT ||
      action === AI_OPERATOR_ACTIONS.POST_EDIT_AGAIN
    ) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        editing_post: true,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildEditPromptStep()
    }

    if (action === AI_OPERATOR_ACTIONS.POST_REGEN) {
      const postContent = await generateContentPost(styleMemory.styleHints)
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        editing_post: false,
        draft_post: postContent,
        final_post: undefined,
        post_content: postContent,
        post_done: false,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildPostStep({ state, postContent })
    }

    if (action === AI_OPERATOR_ACTIONS.POST_PUBLISH) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        post_done: true,
        editing_post: false,
        outreach_done: false,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildPublishConfirmStep()
    }

    if (
      action === AI_OPERATOR_ACTIONS.POST_DONE ||
      action === AI_OPERATOR_ACTIONS.POST_SKIP
    ) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        post_done: true,
        editing_post: false,
        outreach_done: false,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildPublishConfirmStep()
    }

    if (action === AI_OPERATOR_ACTIONS.OUTREACH_DONE) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildOutreachFollowupStep()
    }

    if (action === AI_OPERATOR_ACTIONS.DIALOGUES_YES) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        awaiting_dialogues: true,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildDialoguePromptStep()
    }

    if (action === AI_OPERATOR_ACTIONS.DIALOGUES_NO) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        awaiting_dialogues: false,
        dialogue_context: undefined,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildDialogueLoopStep()
    }

    return buildDoneStep(dailyExecution)
  })

  return result
}

export async function isCoachPostEditingActive(userId: string): Promise<boolean> {
  const { dailyExecution } = await loadUserOperatorState(userId)
  return dailyExecution.editing_post === true
}

export async function isCoachDialogueAwaiting(userId: string): Promise<boolean> {
  const { dailyExecution } = await loadUserOperatorState(userId)
  return dailyExecution.awaiting_dialogues === true
}

export async function submitCoachEditedPost(
  userId: string,
  finalPost: string,
): Promise<OperatorStep> {
  const { settings, dailyExecution, styleMemory } = await loadUserOperatorState(userId)
  const sanitizedPost = finalPost.trim()
  const originalDraft = String(dailyExecution.draft_post ?? dailyExecution.post_content ?? '').trim()
  const shouldLearn = Boolean(originalDraft && sanitizedPost && originalDraft !== sanitizedPost)
  const nextEdits = shouldLearn
    ? [
        ...styleMemory.edits,
        {
          original: originalDraft,
          edited: sanitizedPost,
          diff: extractDiff(originalDraft, sanitizedPost),
          timestamp: new Date().toISOString(),
        },
      ].slice(-10)
    : styleMemory.edits
  const nextStyleMemory: StyleMemoryState = {
    edits: nextEdits,
    styleHints: nextEdits.length > 0 ? deriveStyleHints(nextEdits) : [...DEFAULT_STYLE_HINTS],
  }
  const nextState: DailyExecutionState = {
    ...dailyExecution,
    editing_post: false,
    awaiting_dialogues: false,
    draft_post: sanitizedPost,
    final_post: sanitizedPost,
    post_content: sanitizedPost,
  }
  await saveDailyExecution(userId, settings, nextState, nextStyleMemory)
  return buildEditedPostStep(sanitizedPost)
}

export async function submitCoachDialogues(
  userId: string,
  dialogueContext: string,
): Promise<OperatorStep> {
  const result = await withAiDocuments(async () => {
    const { settings, dailyExecution, styleMemory } = await loadUserOperatorState(userId)
    const sanitizedContext = dialogueContext.trim()
    const assistMessage = await generateDialogueAssistMessage(sanitizedContext)
    const nextState: DailyExecutionState = {
      ...dailyExecution,
      outreach_done: true,
      awaiting_dialogues: false,
      dialogue_context: sanitizedContext,
    }
    await saveDailyExecution(userId, settings, nextState, styleMemory)
    return buildDialogueAssistStep(assistMessage)
  })

  return result
}

export async function sendCoachZoomSummary(
  expertId: string | null | undefined,
  text: string,
  options?: {
    targetUserIds?: string[]
    replyMarkup?: {
      inline_keyboard: Array<Array<
        | { text: string; callback_data: string }
        | { text: string; url: string }
        | { text: string; web_app: { url: string } }
      >>
    }
  },
): Promise<Array<{ userId: string; sent: boolean }>> {
  if (!expertId || !text.trim()) {
    return []
  }

  const targetUserIds = options?.targetUserIds?.filter(Boolean) ?? []

  const coaches = await prisma.user.findMany({
    where: {
      expertId,
      deletedAt: null,
      role: { in: ['EXPERT', 'SUPERADMIN'] },
      ...(targetUserIds.length > 0 ? { id: { in: targetUserIds } } : {}),
    },
    select: {
      id: true,
      telegramChatId: true,
      telegramLinks: {
        where: {
          isActive: true,
          chatId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const results: Array<{ userId: string; sent: boolean }> = []

  for (const coach of coaches) {
    const chatId = coach.telegramChatId ?? coach.telegramLinks[0]?.chatId ?? null
    if (!chatId) {
      results.push({ userId: coach.id, sent: false })
      continue
    }

    await coachBot.telegram.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: options?.replyMarkup,
    })
    results.push({ userId: coach.id, sent: true })
  }

  return results
}

export { AI_OPERATOR_ACTIONS, __testOnly } from './operator.foundation.js'
