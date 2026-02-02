import { FlowDecision } from "@/features/communicationFlow/types";

export const buildTelegramMessage = (decision: FlowDecision): string[] => {
  const messages: string[] = [];

  // 🔹 Підтримка
  if (decision.supportMessage) {
    messages.push(`🧠 ${decision.supportMessage}`);
  }

  // 🔹 Мікрозавдання
  if (decision.microTasks?.length) {
    decision.microTasks.forEach((task) => {
      messages.push(
        `✅ Мікрозавдання:\n${task.payload.title}\n${task.payload.description}`
      );
    });
  }

  // 🔹 Upsell
  if (decision.upsell) {
    messages.push(`🚪 Наступний крок: ${decision.upsell.type}${decision.upsell.slug ? ` (${decision.upsell.slug})` : ''}`);
  }

  return messages;
};
