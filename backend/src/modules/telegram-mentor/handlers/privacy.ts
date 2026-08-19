import type { Context } from 'telegraf'
import { Markup } from 'telegraf'
import { stankeyContent } from '@/products/stankey/config/stankey.content.js'
import { prisma } from '../../../db/client.js'
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js'
import { loadAbTestProgress } from '@/products/ab-system/telegram/progress.js'
import { welcomeMessage } from './abTest.start.js'
import { buildHomeScreen } from './homeScreen.builder.js'
import {
  resolveEffectiveStartLifecycleState,
  resolveLinkedUserIdFromContext,
  type StartUserSnapshot,
} from './start.js'
import { requireTelegramBotConfig } from '../runtime/botConfig.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'

const PRIVACY_BACK_ACTION = 'privacy:back'
const PRIVACY_TITLE = '<b>Політика конфіденційності чат-бота</b>'

function getBotName(): string {
  return requireTelegramBotConfig('privacy handler').username
}

function buildPrivacyKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(stankeyContent.telegram.buttons.back, PRIVACY_BACK_ACTION)],
  ]).reply_markup
}

function isPrivacyScreenText(text: string | undefined): boolean {
  return String(text ?? '').includes(PRIVACY_TITLE)
}

async function buildPreviousMenuPayload(ctx: Context, userId: string | null) {
  if (!userId) {
    return welcomeMessage()
  }

  const snapshot = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      activeRole: true,
      lifecycleState: true,
      testStartedAt: true,
      testCompletedAt: true,
      offerShownAt: true,
      testResultType: true,
      updatedAt: true,
      firstName: true,
    },
  })

  const [accessState, progress] = await Promise.all([
    getUserAccessState(userId).catch(() => null),
    loadAbTestProgress(userId).catch(() => null),
  ])

  const effectiveSnapshot: StartUserSnapshot = {
    ...snapshot,
    lifecycleState: resolveEffectiveStartLifecycleState({
      lifecycleState: snapshot.lifecycleState,
      accessState,
      testResultType: snapshot.testResultType,
      progress: progress
        ? {
            status: progress.status,
            result_key: progress.result_key ?? null,
          }
        : null,
    }),
  }

  return buildHomeScreen(effectiveSnapshot, ctx)
}

export async function handlePrivacy(ctx: Context) {
  try {
    const botName = getBotName()

    const text = [
      PRIVACY_TITLE,
      '',
      '<b>1. Вступ</b>',
      `Ця Політика конфіденційності описує, як ми, власники бота "${botName}", використовуємо та захищаємо ваші дані. Ці дані можуть бути надані вами або отримані нами під час взаємодії з ботом "${botName}". У цій Політиці конфіденційності "ми", "нас" і "наш" стосуються власників бота, а "ви" — користувача.`,
      'Цей бот є частиною екосистеми ботів Telegram. Щоб дізнатися більше, вставити посилання на <a href="https://telegram.org/privacy/?setln=uk">Політику конфіденційності Telegram</a>.',
      'Цей бот працює на базі <a href="https://sendpulse.com/ua/features/chatbot/telegram">SendPulse</a>, компанія обробляє інформацію відповідно до <a href="https://sendpulse.com/ua/legal/pp">Політики конфіденційності SendPulse</a>.',
      '',
      '<b>2. Дані, які ми збираємо</b>',
      '- Ім’я, прізвище, username, фото профілю Telegram.',
      '- Повідомлення користувача у боті, поки бот активний.',
      '',
      '<b>3. Правові підстави для оброблення персональних даних</b>',
      '1. Забезпечення функціонування бота.',
      '2. Технічна підтримка (швидке знаходження чату по username).',
      '3. Статистика використання.',
      '',
      '<b>4. Розкриття персональних даних</b>',
      '- Дані зберігаються на серверах третьої сторони (SendPulse).',
      '- Не передаємо стороннім, крім випадків вимоги закону.',
      '- Дані зберігаються в межах ЄС і передаються тільки в країни зі стандартами захисту.',
      '',
      '<b>5. Видалення персональних даних</b>',
      '- Заблокувавши бота, дані видаляються автоматично.',
      '- Деякі дані можуть зберігатися до 30 днів.',
      '',
      '<b>6. Зміни в політиці</b>',
      '- Текст політики може змінюватися.',
      '- Щоб перевірити актуальну версію, надішліть команду <i>/privacy</i>.',
    ].join('\n')

    await planMessage(ctx, 'ctx.reply', 'privacy_policy', text, buildPrivacyKeyboard(), 'HTML')
  } catch (error) {
    console.error('[TelegramMentor] privacy error:', error)
    const payload = await buildPreviousMenuPayload(
      ctx,
      await resolveLinkedUserIdFromContext(ctx),
    ).catch(() => welcomeMessage())
    await planMessage(
      ctx,
      'ctx.reply',
      'privacy_policy_fallback_menu',
      payload.text,
      payload.reply_markup,
      payload.parseMode,
    )
  }
}

export async function handlePrivacyBack(ctx: Context): Promise<void> {
  const callbackMessage =
    ctx.callbackQuery && 'message' in ctx.callbackQuery
      ? ctx.callbackQuery.message
      : undefined
  const callbackText =
    callbackMessage
      ? 'text' in callbackMessage
        ? callbackMessage.text
        : undefined
      : undefined

  if (!isPrivacyScreenText(callbackText)) {
    return
  }

  const payload = await buildPreviousMenuPayload(
    ctx,
    await resolveLinkedUserIdFromContext(ctx),
  )

  try {
    await ctx.editMessageText?.(payload.text, {
      parse_mode: payload.parseMode ?? 'HTML',
      reply_markup: payload.reply_markup,
    })
    return
  } catch (error) {
    console.warn('[TelegramMentor] privacy back edit failed:', error)
  }

  await planMessage(
    ctx,
    'ctx.reply',
    'privacy_back_restore_menu',
    payload.text,
    payload.reply_markup,
    payload.parseMode,
  )
}
