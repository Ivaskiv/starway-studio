import { sendTelegramFlow } from "@/features/communicationFlow/telegram/telegram.flow";
import { sendMiniAppFlow } from "@/features/communicationFlow/miniApp/miniApp.flow";
import { FlowDecision } from "@/features/communicationFlow/types";

export const flowDispatcher = async (
  decision: FlowDecision,
  ctx: { userId: string; telegramChatId?: string }
) => {
  if (ctx.telegramChatId) {
    await sendTelegramFlow(decision, ctx.telegramChatId);
  }

  await sendMiniAppFlow(decision, ctx.userId);
};
