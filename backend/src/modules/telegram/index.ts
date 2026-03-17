// backend/src/modules/telegram/index.ts
// ═══════════════════════════════════════════════════════════════
// ЄДИНА ТОЧКА РЕЄСТРАЦІЇ ВСІХ TELEGRAM КОМАНД
// Порядок важливий: специфічні handlers перед загальними
// ═══════════════════════════════════════════════════════════════

import { Markup }                from 'telegraf'
import type { Context }           from 'telegraf'
import { randomUUID }            from 'crypto'
import { bot }                   from '../../lib/telegram.js'
import { prisma }                from '../../db/client.js'
import { openai }                from '../../lib/openai.js'
import { verifyTelegramLinkCode } from '../social/service.js'
import { getPrimaryGoal }        from '../goals/service.js'
import { getBotLink }            from '../../lib/telegram.js'
import { getSession, clearSession } from '../telegram-mentor/session.js'
import { handleMorning, handleMorningAnswer } from '../telegram-mentor/handlers/morning.js'
import { handleEvening, handleEveningAnswer } from '../telegram-mentor/handlers/evening.js'
import { handleTasks, handleTaskDone }        from '../telegram-mentor/handlers/tasks.js'
import { handleStatus }                       from '../telegram-mentor/handlers/status.js'
import { handleChat }                         from '../telegram-mentor/handlers/chat.js'
import { sendMorningQuestion, sendEveningQuestion } from '../daily-cycle/telegram.js'
import { createWheelPDF }        from '../wheel/pdf.js'
import { findFocus, findWeakest, scoresFromMap } from '../wheel/service.js'
import type { WheelPDFData, WheelInsights } from '../wheel/types.js'

const getAppUrl = () => process.env.FRONTEND_URL ?? 'http://localhost:5173'

// ─────────────────────────────────────────────────────────────
// ГОЛОВНА КЛАВІАТУРА
// ─────────────────────────────────────────────────────────────
const mainKeyboard = Markup.keyboard([
  ['🤖 AI-ментор',   '🎯 Моя ціль'],
  ['☯️ Колесо',      '🔥 Streak'],
  ['📊 Звіт тижня',  '⚙️ Налаштування'],
]).resize()

const mentorKeyboard = Markup.keyboard([
  ['🌅 Ранок',  '🌙 Вечір'],
  ['✅ Завдання', '📊 Стан'],
  ['💬 Ментор', '❌ Скасувати'],
]).resize()

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
async function findUserByChatId(chatId: string) {
  // Шукаємо в обох таблицях — TelegramLink (новий механізм) і telegramUserId (старий)
  const link = await prisma.telegramLink.findFirst({
    where:  { chatId, isActive: true },
    select: { userId: true },
  })
  if (link) {
    return prisma.user.findUnique({ where: { id: link.userId } })
  }
  return prisma.user.findFirst({ where: { telegramUserId: chatId } })
}

// ─────────────────────────────────────────────────────────────
// /start — ЄДИНИЙ обробник (linking + welcome)
// ─────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  if (!ctx.from || !ctx.chat) return

  const chatId           = getChatId(ctx)
  if (!chatId) return
  const telegramUserId   = String(ctx.from.id)
  const telegramUserName = ctx.from.username ?? null
  const payload          = (ctx as any).startPayload ?? ''
  const name             = ctx.from.first_name ?? 'Учасник'

  let userId: string | null = null

  // 1. One-time link код (від web-додатку)
  if (payload.startsWith('link_')) {
    userId = await verifyTelegramLinkCode(payload)
  }

  // 2. Пошук по telegramUserId або username
  if (!userId) {
    const found = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramUserId: telegramUserId },
          ...(telegramUserName ? [{ telegramUserName }] : []),
        ],
      },
      select: { id: true },
    })
    userId = found?.id ?? null
  }

  // 3. Пошук через TelegramLink
  if (!userId) {
    const link = await prisma.telegramLink.findFirst({
      where:  { chatId, isActive: true },
      select: { userId: true },
    })
    userId = link?.userId ?? null
  }

  if (!userId) {
    await ctx.reply(
      '🔗 Акаунт не знайдено.\n\n' +
      'Щоб підключити Telegram:\n' +
      '1. Зайди на starway.app\n' +
      '2. Профіль → Telegram → «Підключити»',
      { reply_markup: {
        inline_keyboard: [[{ text: 'Відкрити Starway', url: `${getAppUrl()}/dashboard` }]],
      }},
    )
    return
  }

  // Оновлюємо telegramUserId + username у юзера
  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramUserId: telegramUserId,
      ...(telegramUserName ? { telegramUserName } : {}),
    },
  })

  // Забезпечуємо TelegramLink запис
  await prisma.telegramLink.upsert({
    where:  { chatId },
    update: { isActive: true, userId },
    create: {
      chatId,
      userId,
      isActive: true,
      code: randomUUID(),
    },
  })

  await ctx.replyWithHTML(
    `👋 <b>Вітаю, ${name}!</b>\n\n` +
    `Я — твій AI-ментор.\n` +
    `Жодної мотивації. Тільки система.\n\n` +
    `<b>СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ</b>\n\n` +
    `Використовуй /aimentor щоб увійти в режим ментора.`,
    mainKeyboard,
  )
})

// ─────────────────────────────────────────────────────────────
// /aimentor — головна точка входу в AI-ментора
// ─────────────────────────────────────────────────────────────
bot.command('aimentor', async (ctx) => {
  const chatId = getChatId(ctx)
  if (!chatId) return
  const user   = chatId ? await findUserByChatId(chatId) : null

  if (!user) {
    await ctx.reply(
      '🔗 Акаунт не прив\'язаний.\n\n' +
      'Зайди на starway.app → Профіль → Telegram → «Підключити»,\n' +
      'або натисни /start якщо маєш посилання.',
    )
    return
  }

  const name = user.name ?? ctx.from?.first_name ?? ''

  await ctx.replyWithHTML(
    `🤖 <b>AI-Ментор Starway</b>\n\n` +
    `Привіт, ${name}!\n\n` +
    `🌅 /morning — ранковий чекін\n` +
    `🌙 /evening — вечірній чекін\n` +
    `✅ /task — мої завдання\n` +
    `📊 /status — мій прогрес\n` +
    `💬 Просто напиши — поговоримо`,
    mentorKeyboard,
  )
})

// ─────────────────────────────────────────────────────────────
// /menu — показати клавіатуру
// ─────────────────────────────────────────────────────────────
bot.command('menu', async (ctx) => {
  await ctx.reply('Головне меню 👇', mainKeyboard)
})

// ─────────────────────────────────────────────────────────────
// /morning /evening /task /status
// ─────────────────────────────────────────────────────────────
bot.command('morning', handleMorning)
bot.command('evening', handleEvening)
bot.command('task',    handleTasks)
bot.command('status',  handleStatus)

// ─────────────────────────────────────────────────────────────
// /cancel
// ─────────────────────────────────────────────────────────────
bot.command('cancel', async (ctx) => {
  const chatId  = getChatId(ctx)
  if (!chatId) return
  const session = await getSession(chatId)
  if (session) await clearSession(session.userId, chatId)
  await ctx.reply('❌ Скасовано.', mainKeyboard)
})

// ─────────────────────────────────────────────────────────────
// /goal /streak /report /wheel /settings
// ─────────────────────────────────────────────────────────────
bot.command('goal', async (ctx) => {
  const chatId = getChatId(ctx)
  const user   = chatId ? await findUserByChatId(chatId) : null
  if (!user) return ctx.reply('Авторизуйся у web-додатку.')
  const goal = await getPrimaryGoal(user.id)
  await ctx.replyWithHTML(goal
    ? `🎯 <b>Твоя головна ціль:</b>\n${goal.text}`
    : '🎯 Ціль не задана. Зайди у web-додаток → Цілі.')
})

bot.command('streak', async (ctx) => {
  const chatId = getChatId(ctx)
  const user   = chatId ? await findUserByChatId(chatId) : null
  if (!user) return ctx.reply('Авторизуйся у web-додатку.')
  const streak = await prisma.streak.findFirst({ where: { userId: user.id } })
  const days   = streak?.current ?? 0
  const emoji  = days >= 21 ? '🏆' : days >= 7 ? '🔥' : days >= 3 ? '✅' : '🌱'
  await ctx.replyWithHTML(`${emoji} <b>Streak: ${days} днів</b>\n${
    days >= 7 ? 'Система працює.' : 'Потрібна стабільність.'
  }`)
})

bot.command('report', async (ctx) => {
  const chatId = getChatId(ctx)
  if (!chatId) return
  const user   = await findUserByChatId(chatId)
  if (!user) return ctx.reply('Авторизуйся у web-додатку.')
  const report = await prisma.weeklyReport.findFirst({
    where: { userId: user.id }, orderBy: { weekStart: 'desc' },
  })
  if (!report) return ctx.reply('Звіт ще не готовий. Формується щонеділі о 08:00.')

  const text = [
    `📊 <b>Тижневий звіт</b>`,
    ``,
    `✦ Прогрес: ${report.overallScore}/10`,
    `✅ Виконано: ${report.completionRate}%`,
    `🔥 Streak: ${report.streakDays}д`,
    ``,
    report.motivationText ?? '',
  ].join('\n')

  await ctx.replyWithHTML(text, report.pdfUrl
    ? Markup.inlineKeyboard([[Markup.button.url('↓ PDF звіт', report.pdfUrl)]])
    : Markup.inlineKeyboard([[Markup.button.webApp('Повний звіт', process.env.WEBAPP_URL ?? 'https://starway.app/mini')]])
  )
})

bot.command('wheel', async (ctx) => {
  await ctx.replyWithHTML(
    '☯️ <b>Колесо балансу</b>\nВідкрий у додатку для оновлення оцінок.',
    Markup.inlineKeyboard([[
      Markup.button.webApp('Відкрити колесо', `${process.env.WEBAPP_URL ?? 'https://starway.app/mini'}?page=wheel`),
    ]]),
  )
})

bot.command('settings', async (ctx) => {
  await ctx.replyWithHTML(
    '⚙️ Налаштування доступні у web-додатку.',
    Markup.inlineKeyboard([[Markup.button.webApp('Відкрити', process.env.WEBAPP_URL ?? 'https://starway.app')]]),
  )
})

// ─────────────────────────────────────────────────────────────
// КНОПКИ ГОЛОВНОГО МЕНЮ (hears)
// ─────────────────────────────────────────────────────────────
bot.hears('🌅 Ранок',    handleMorning)
bot.hears('🌙 Вечір',    handleEvening)
bot.hears('✅ Завдання', handleTasks)
bot.hears('📊 Стан',     handleStatus)

bot.hears(['🤖 AI-ментор', '💬 Ментор'], async (ctx) => {
  const chatId = getChatId(ctx)
  const user   = chatId ? await findUserByChatId(chatId) : null
  if (!user) return ctx.reply('Спочатку авторизуйся у web-додатку.')

  const [primaryGoal, streak, lastCycle] = await Promise.all([
    getPrimaryGoal(user.id),
    prisma.streak.findFirst({ where: { userId: user.id } }),
    prisma.dailyEntry.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
  ])

  const systemPrompt =
    `Ти — AI-ментор Starway. Жорстка ясність, без мотивації. Українська.\n` +
    `Ціль: ${primaryGoal?.text ?? 'не задана'}. Streak: ${streak?.current ?? 0}д.\n` +
    `Останній стан: ${(lastCycle?.state as string) ?? 'невідомо'}.\n` +
    `Задай одне найважливіше питання.`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o', max_tokens: 200, temperature: 0.5,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: 'Початок сесії' },
    ],
  })

  await ctx.replyWithHTML(
    `🤖 <b>AI-ментор</b>\n\n${res.choices[0].message.content}`,
    Markup.inlineKeyboard([[
      Markup.button.webApp('Відкрити чат', process.env.WEBAPP_URL ?? 'https://starway.app/mini'),
    ]]),
  )
})

bot.hears(['🎯 Моя ціль', '🎯 Ціль'], async (ctx) => {
  const chatId = getChatId(ctx)
  const user   = chatId ? await findUserByChatId(chatId) : null
  if (!user) return ctx.reply('Авторизуйся у web-додатку.')
  const goal = await getPrimaryGoal(user.id)
  await ctx.replyWithHTML(goal
    ? `🎯 <b>Твоя головна ціль:</b>\n${goal.text}`
    : '🎯 Ціль не задана. Зайди у web-додаток → Цілі.')
})

bot.hears(['🔥 Streak', '🔥'], async (ctx) => {
  const chatId = getChatId(ctx)
  const user   = chatId ? await findUserByChatId(chatId) : null
  if (!user) return ctx.reply('Авторизуйся у web-додатку.')
  const streak = await prisma.streak.findFirst({ where: { userId: user.id } })
  const days   = streak?.current ?? 0
  const emoji  = days >= 21 ? '🏆' : days >= 7 ? '🔥' : days >= 3 ? '✅' : '🌱'
  await ctx.replyWithHTML(`${emoji} <b>Streak: ${days} днів</b>\n${
    days >= 7 ? 'Система працює.' : 'Потрібна стабільність.'
  }`)
})

bot.hears(['☯️ Колесо'], async (ctx) => {
  await ctx.replyWithHTML(
    '☯️ <b>Колесо балансу</b>',
    Markup.inlineKeyboard([[
      Markup.button.webApp('Відкрити', `${process.env.WEBAPP_URL ?? 'https://starway.app/mini'}?page=wheel`),
    ]]),
  )
})

bot.hears(['📊 Звіт тижня'], async (ctx) => {
  const chatId = getChatId(ctx)
  const user   = chatId ? await findUserByChatId(chatId) : null
  if (!user) return ctx.reply('Авторизуйся у web-додатку.')
  const report = await prisma.weeklyReport.findFirst({
    where: { userId: user.id }, orderBy: { weekStart: 'desc' },
  })
  if (!report) return ctx.reply('Звіт ще не готовий. Формується щонеділі о 08:00.')
  await ctx.replyWithHTML(
    `📊 <b>Тижневий звіт</b>\n✦ ${report.overallScore}/10 · ${report.completionRate}% · 🔥${report.streakDays}д\n\n${report.motivationText ?? ''}`,
    report.pdfUrl
      ? Markup.inlineKeyboard([[Markup.button.url('↓ PDF', report.pdfUrl)]])
      : Markup.inlineKeyboard([[Markup.button.webApp('Відкрити', process.env.WEBAPP_URL ?? 'https://starway.app/mini')]]),
  )
})

bot.hears(['⚙️ Налаштування'], async (ctx) => {
  await ctx.replyWithHTML(
    '⚙️ Налаштування доступні у web-додатку.',
    Markup.inlineKeyboard([[Markup.button.webApp('Відкрити', process.env.WEBAPP_URL ?? 'https://starway.app')]]),
  )
})

bot.hears('❌ Скасувати', async (ctx) => {
  const chatId  = getChatId(ctx)
  if (!chatId) return
  const session = await getSession(chatId)
  if (session) await clearSession(session.userId, chatId)
  await ctx.reply('❌ Скасовано.', mainKeyboard)
})

// ─────────────────────────────────────────────────────────────
// CALLBACK QUERIES — тільки конкретні патерни
// ─────────────────────────────────────────────────────────────

// done_<taskId> — завдання виконано
bot.action(/^done_(.+)$/, async (ctx) => {
  await handleTaskDone(ctx, ctx.match[1])
})

// wheel_pdf_<entryId> — генерація PDF колеса
bot.action(/^wheel_pdf_(.+)$/, async (ctx) => {
  try {
    const entryId = ctx.match[1]
    await ctx.answerCbQuery('⏳ Генерую PDF...')

    const entry = await prisma.userBalanceEntry.findUnique({
      where:   { id: entryId },
      include: { user: true },
    })
    if (!entry) { await ctx.answerCbQuery('❌ Не знайдено'); return }

    const scores  = scoresFromMap(entry.scores)
    const weakest = findWeakest(scores)
    const focus   = findFocus(scores, weakest)

    const fallbackInsights: WheelInsights = {
      analysis: entry.note ?? '',
      diagnosis: entry.note ?? '',
      personalityProfile: {
        decisionStyle: 'reflective',
        motivationType: 'growth',
        stressPattern: 'steady',
        growthDriver: 'purpose',
      },
      trajectoryPrediction: {
        riskAreas: [],
        growthPotential: [],
        predictionSummary: 'Legacy data; trajectory not stored.',
      },
      actionPlan: [],
      adaptiveMissions: [],
    }
    const pdfData: WheelPDFData = {
      userName:      entry.user?.firstName ?? entry.user?.email ?? 'Користувач',
      scores,
      weakestSphere: weakest?.categoryId ?? '',
      focusSphere:   focus?.categoryId ?? weakest?.categoryId ?? '',
      insights:      fallbackInsights,
      createdAt:     entry.createdAt.toISOString(),
    }

    const buffer = await createWheelPDF(pdfData)

    await ctx.telegram.sendDocument(
      ctx.from!.id,
      { source: buffer, filename: `wheel-${entryId}.pdf` },
      { caption: '🎡 Колесо балансу — PDF звіт' },
    )
    await ctx.answerCbQuery('✅ PDF надіслано!')
  } catch (err) {
    console.error('❌ wheel_pdf error:', err)
    await ctx.answerCbQuery('❌ Помилка генерації PDF')
  }
})

// ─────────────────────────────────────────────────────────────
// TEXT ROUTER — останній в черзі
// ─────────────────────────────────────────────────────────────
bot.on('message' as const, async (ctx) => {
  if (!('text' in ctx.message) || !ctx.message?.text) {
    await ctx.reply('Щоб почати — /aimentor', mainKeyboard)
    return
  }
  const chatId = getChatId(ctx)
  const message = ctx.message.text.trim()
  if (!chatId || !message) {
    await ctx.reply('Щоб почати — /aimentor', mainKeyboard)
    return
  }
  const text = message
  const session = await getSession(chatId)

  if (!session) {
    await ctx.reply('Щоб почати — /aimentor', mainKeyboard)
    return
  }

  const { state } = session

  if (state.startsWith('morning_q')) { await handleMorningAnswer(ctx, text); return }
  if (state.startsWith('evening_q')) { await handleEveningAnswer(ctx, text); return }

  await handleChat(ctx, text)
})

function getChatId(ctx: Context): string | null {
  const chat = ctx.chat as { id?: number } | undefined
  return chat?.id ? String(chat.id) : null
}

// ─────────────────────────────────────────────────────────────
// EXPORT — одна функція реєстрації
// ─────────────────────────────────────────────────────────────
export function registerAllBotHandlers() {
  // Всі handlers вже зареєстровані вище при імпорті модуля.
  // Ця функція існує як явна точка виклику в index.ts.
  console.log('✅ [Bot] All handlers registered')
  console.log('   Commands: /start /aimentor /menu /morning /evening /task /status')
  console.log('   Commands: /goal /streak /report /wheel /settings /cancel')
}
