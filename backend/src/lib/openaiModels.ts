import { AI_MODEL_TIERS, type AiTaskType, resolveAiModel } from '../platform/ai.registry.js'

export const MODEL_FOR_TASK = {
  weekly_report: resolveAiModel('assistant_weekly_insight'),
  monthly_analysis: AI_MODEL_TIERS.premium,
  morning_tasks: AI_MODEL_TIERS.cheap,
  evening_analysis: resolveAiModel('daily_analysis'),
  daily_insight: AI_MODEL_TIERS.cheap,
  tg_notification: AI_MODEL_TIERS.cheap,
} as const

export function resolveModelForTask(taskType: AiTaskType) {
  return resolveAiModel(taskType)
}
