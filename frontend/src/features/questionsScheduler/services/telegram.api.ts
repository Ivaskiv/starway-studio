//
export const sendTelegramMessage = async (chatId: string, text: string) => {
  try {
    await fetch(`${import.meta.env.VITE_TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error('Telegram send error', err);
  }
};
