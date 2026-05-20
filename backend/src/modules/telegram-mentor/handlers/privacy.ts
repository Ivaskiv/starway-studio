import type { Context } from 'telegraf'
import { supportMenuKeyboard } from '../keyboards.js'
import { sendEntryOffer, sendStateMenu, resolveLinkedUserIdFromContext } from './start.js'
import { requireTelegramBotConfig } from '../runtime/botConfig.js'

function getBotName(): string {
  return requireTelegramBotConfig('privacy handler').username
}

export async function handlePrivacy(ctx: Context) {
  try {
    const botName = getBotName()

    const text = [
      '<b>Політика конфіденційності чат-бота</b>',
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

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: supportMenuKeyboard.reply_markup,
    })
  } catch (error) {
    console.error('[TelegramMentor] privacy error:', error)
    const userId = await resolveLinkedUserIdFromContext(ctx)
    if (userId) {
      await sendStateMenu(ctx, userId)
      return
    }

    await sendEntryOffer(ctx)
  }
}
