import type { FunnelScreen } from '@/features/funnels/types/funnel.types'

import type { MasterTab } from './masterPanelPage.utils'

export const RIGHT_PANEL: Record<MasterTab, Array<{ title: string; body: string; tone: 'info' | 'warning' | 'success' }>> = {
  prompts: [
    {
      title: 'Структурна залежність',
      body: 'Зміна промпта може вплинути на генерацію задач, інсайти та щоденні сценарії. Перевіряй версію перед публікацією.',
      tone: 'warning',
    },
    {
      title: 'Версійність',
      body: 'Нові записи створюються окремими версіями. Старі не перезаписуються, тож rollback не губить історію.',
      tone: 'info',
    },
    {
      title: 'Публікація',
      body: 'Активація робить версію живою для всіх наступних викликів. Для суперадміна доступні edit / activate / delete.',
      tone: 'success',
    },
  ],
  notifications: [
    {
      title: 'Один flow',
      body: 'Превʼю показує той самий сценарій у Telegram, Mini App і Desktop без дублювання окремих сторінок.',
      tone: 'info',
    },
    {
      title: 'Канали',
      body: 'Юзерський та expert-канал мають різну глибину деталей. Не змішуй їх у логіці нагадування.',
      tone: 'warning',
    },
    {
      title: 'Відправка',
      body: 'Тут дивимось не лише текст, а й шлях доставки. Це допомагає не ламати сценарії нагадувань при правках.',
      tone: 'success',
    },
  ],
  funnels: [
    {
      title: 'Статус воронки',
      body: 'Draft / active / archived має відображати реальний стан, а не тимчасовий експеримент.',
      tone: 'info',
    },
    {
      title: 'Продукти',
      body: 'Підʼєднані продукти показують, куди саме веде воронка. Не лишай активний funnel без продуктового звʼязку.',
      tone: 'warning',
    },
    {
      title: 'Кроки',
      body: 'Редагуй назву і стан воронки тут, а глибші кроки тримай у відповідному редакторі продукту.',
      tone: 'success',
    },
  ],
}

export const DEFAULT_FUNNEL_SCREEN_TEMPLATES = [
  {
    type: 'lead_magnet' as const,
    title: 'Лід-магніт: діагностика',
    bodyText: 'Коротка діагностика без зайвого шуму. Користувач одразу бачить, що отримає.',
    ctaLabel: 'Пройти діагностику',
    ctaSecondaryLabel: 'Пізніше',
    channels: ['telegram', 'miniapp', 'site'] as const,
    aiPromptId: 'funnel_analysis',
    linkedNotificationId: 'morning-reflection',
  },
  {
    type: 'instant_value' as const,
    title: 'Миттєва цінність',
    bodyText: 'Дай короткий результат ще до основного кроку. Людина має відчути користь одразу.',
    ctaLabel: 'Отримати результат',
    ctaSecondaryLabel: 'Пізніше',
    channels: ['telegram', 'miniapp', 'site'] as const,
    aiPromptId: 'daily_ai_insight',
    linkedNotificationId: 'morning-reflection-repeat',
  },
  {
    type: 'cta' as const,
    title: 'Одна кнопка',
    bodyText: 'Один екран — одна дія. Не перевантажуй користувача зайвими варіантами.',
    ctaLabel: 'Продовжити',
    ctaSecondaryLabel: 'Пізніше',
    channels: ['telegram', 'miniapp', 'site'] as const,
    aiPromptId: 'funnel_analysis',
  },
  {
    type: 'onboarding' as const,
    title: 'Онбординг',
    bodyText: 'Поясни наступний крок коротко й по суті, без довгих вступів.',
    ctaLabel: 'Далі',
    ctaSecondaryLabel: 'Пізніше',
    channels: ['telegram', 'miniapp', 'site'] as const,
    aiPromptId: 'morning_session',
  },
  {
    type: 'activation' as const,
    title: 'Першa активація',
    bodyText: 'Допоможи зробити першу дію і підключи нагадування, якщо користувач застряг.',
    ctaLabel: 'Активувати',
    ctaSecondaryLabel: 'Пізніше',
    channels: ['telegram', 'miniapp', 'site'] as const,
    aiPromptId: 'evening_session',
    linkedNotificationId: 'streak-danger',
  },
  {
    type: 'conversion' as const,
    title: 'Конверсія',
    bodyText: 'Поясни, чому дія зараз вигідна, і виведи до покупки без тиску.',
    ctaLabel: 'Оформити',
    ctaSecondaryLabel: 'Пізніше',
    channels: ['telegram', 'miniapp', 'site'] as const,
    aiPromptId: 'trial_conversion',
    linkedNotificationId: 'trial-conversion-d6',
  },
] satisfies Array<Omit<FunnelScreen, 'id' | 'order' | 'metrics'>>
