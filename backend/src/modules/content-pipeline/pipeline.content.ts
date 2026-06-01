import type { ReelsVariant } from './pipeline.types.js'

export const pipelineContent = {
  commandUsage: 'Вкажи тему: /reels застрягання між рішенням і дією',
  generating: (topic: string) => `⏳ Генерую 3 варіанти для: <b>${topic}</b>`,
  generationError: (message: string) => `❌ Помилка генерації: ${message}`,
  selected: (variantId: string) => `✅ Варіант ${variantId} обрано. Виробляємо відео + озвучку...`,
  producingError: (message: string) => `❌ Помилка виробництва: ${message}`,
  previewReady: '🎬 Готово! Переглянь перше відео і обери дію:',
  publishing: '📤 Публікуємо...',
  cancelled: '❌ Pipeline скасовано',
  publishDone: (instagramOk: boolean, telegramOk: boolean) =>
    `✅ Опубліковано!\n📱 Instagram: ${instagramOk ? '✓' : '—'}\n📢 Telegram: ${telegramOk ? '✓' : '—'}`,
  labels: {
    A: '🔴 ОГОЛЕНА ПРАВДА',
    B: '🟡 ПСИХОЛОГІЯ',
    C: '🔵 АРХІТЕКТОР',
  } as Record<ReelsVariant['id'], string>,
  buttons: {
    variantA: 'Варіант А — Правда',
    variantB: 'Варіант Б — Психологія',
    variantC: 'Варіант В — Архітектор',
    cancel: 'Скасувати',
    publish: '✅ Опублікувати',
    editHook: '✏️ Редагувати хук',
  },
} as const
