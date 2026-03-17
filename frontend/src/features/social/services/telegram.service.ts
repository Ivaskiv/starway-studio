export type TelegramParseMode = 'MarkdownV2' | 'HTML' | undefined;

export interface TelegramMessagePayload {
  chatId: string;
  text: string;
  parseMode?: TelegramParseMode;
  silent?: boolean;
  meta?: {
    source?: 'wheel' | 'questions' | 'mentor' | 'product';
    entityId?: string;
  };
}

export const sendTelegramMessage = async ({
  chatId,
  text,
  parseMode,
  silent = false,
}: TelegramMessagePayload): Promise<void> => {
  try {
    await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        text,
        parseMode,
        silent,
      }),
    });
  } catch (error) {
    console.error('[Telegram] send failed', error);
  }
};
