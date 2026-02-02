import axios from 'axios';

export interface TelegramMessageOptions {
  chatId: string;
  text: string;
  parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown';
  replyMarkup?: Record<string, any>; // inline buttons або custom keyboard
}

const TELEGRAM_BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export const sendTelegramMessage = async (options: TelegramMessageOptions) => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram bot token is not set');
    return;
  }

  try {
    const payload: Record<string, any> = {
      chat_id: options.chatId,
      text: options.text,
      parse_mode: options.parseMode || 'MarkdownV2',
    };

    if (options.replyMarkup) {
      payload.reply_markup = options.replyMarkup;
    }

    const res = await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
    return res.data;
  } catch (err: any) {
    console.error('Telegram send error:', err.response?.data || err.message);
    throw err;
  }
};

// Приклад генерації кнопок для MiniApp / Quick Actions
export const buildInlineKeyboard = (buttons: { text: string; callbackData: string }[][]) => ({
  inline_keyboard: buttons,
});
