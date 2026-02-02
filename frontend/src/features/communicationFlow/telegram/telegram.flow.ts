import { FlowDecision } from '@/features/communicationFlow/types';
import { buildTelegramMessage } from './telegram.templates';
import { sendTelegramMessage } from '@/features/questionsScheduler/services/telegram.api';

export const sendTelegramFlow = async (
  decision: FlowDecision,
  chatId: string,
) => {
  const messages = buildTelegramMessage(decision);

  for (const msg of messages) {
    await sendTelegramMessage(chatId, msg);
  }
};
