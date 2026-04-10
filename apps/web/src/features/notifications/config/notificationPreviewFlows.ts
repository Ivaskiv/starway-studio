export type NotificationPreviewChannel = 'user' | 'expert'
export type NotificationPreviewButtonTone = 'neutral' | 'primary' | 'secondary'

export interface NotificationPreviewButton {
  label: string
  tone?: NotificationPreviewButtonTone
}

export interface NotificationPreviewMessage {
  id: string
  text: string
  time: string
  buttons?: NotificationPreviewButton[]
}

export interface NotificationPreviewThread {
  title: string
  subtitle: string
  avatar: string
  composerPlaceholder?: string
  messages: NotificationPreviewMessage[]
}

export interface NotificationPreviewModule {
  id: string
  icon: string
  label: string
  user: NotificationPreviewThread
  expert: NotificationPreviewThread
}

export interface Notification {
  id: string
  name: string
  type: 'reflection' | 'microtask' | 'streak' | 'subscription' | 'report' | 'reactivation' | 'ai'
  channels: ('telegram' | 'app' | 'miniapp')[]
  time: string
  roles: ('user' | 'trial' | 'pause' | 'expert' | 'mentor')[]
  condition: string
  bodyText: string
  active: boolean
  linkedPromptId?: string
  durationDays?: number
  repeatOnMiss?: boolean
  triggerScreens?: string[]
}

export const NOTIFICATION_TYPE_META: Record<
  Notification['type'],
  {
    label: string
    icon: string
  }
> = {
  reflection: { label: 'Рефлексія', icon: '🌙' },
  microtask: { label: 'Мікрозавдання', icon: '📋' },
  streak: { label: 'Стрік', icon: '🔥' },
  subscription: { label: 'Підписка', icon: '🧭' },
  report: { label: 'Звіт', icon: '📊' },
  reactivation: { label: 'Реактивація', icon: '♻️' },
  ai: { label: 'AI', icon: '✨' },
}

export const NOTIFICATION_ROLE_META: Record<Notification['roles'][number], string> = {
  user: 'Користувач',
  trial: 'Тріал',
  pause: 'Пауза',
  expert: 'Експерт',
  mentor: 'Ментор',
}

export const NOTIFICATION_CHANNEL_META: Record<Notification['channels'][number], string> = {
  telegram: 'Telegram',
  app: 'App',
  miniapp: 'Mini-app',
}

export const NOTIFICATION_ROLE_OPTIONS: Array<{ id: 'all' | Notification['roles'][number]; label: string }> = [
  { id: 'all', label: 'Всі ролі' },
  { id: 'user', label: 'Користувач' },
  { id: 'trial', label: 'Тріал' },
  { id: 'pause', label: 'Пауза' },
  { id: 'expert', label: 'Експерт' },
]

export const NOTIFICATION_CHANNEL_OPTIONS: Array<{ id: 'all' | Notification['channels'][number]; label: string }> = [
  { id: 'all', label: 'Всі канали' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'app', label: 'App' },
  { id: 'miniapp', label: 'Mini-app' },
]

export const MASTER_NOTIFICATIONS: Notification[] = [
  {
    id: 'morning-reflection',
    name: 'Ранкова рефлексія',
    type: 'reflection',
    channels: ['telegram', 'app'],
    time: '08:00',
    roles: ['user', 'trial'],
    condition: 'Якщо сесія не відкрита до 08:00',
    bodyText: 'Час відкрити ранкову сесію і задати вектор дня.',
    active: true,
    linkedPromptId: 'morning_session',
    triggerScreens: ['Ранкова сесія', 'Лід-магніт: діагностика'],
  },
  {
    id: 'morning-reflection-repeat',
    name: 'Ранкова рефлексія (повтор)',
    type: 'reflection',
    channels: ['telegram'],
    time: '08:30',
    roles: ['user', 'trial'],
    condition: 'Якщо не відреагувала на сигнал 08:00. Один раз.',
    bodyText: 'Нагадування зайти в ранкову сесію, якщо перший сигнал залишився без відповіді.',
    active: true,
    linkedPromptId: 'morning_session',
    repeatOnMiss: true,
    triggerScreens: ['Ранкова сесія', 'Повторний ранковий пуш'],
  },
  {
    id: 'microtask-reminder',
    name: 'Мікрозавдання',
    type: 'microtask',
    channels: ['telegram', 'app'],
    time: '14:00',
    roles: ['user'],
    condition: 'Якщо завдання не виконане до 14:00. Один раз.',
    bodyText: 'Мікрозавдання ще відкрите. Краще закрити його зараз, ніж переносити на вечір.',
    active: true,
    linkedPromptId: 'microtasks_generation',
    repeatOnMiss: true,
    triggerScreens: ['Мікрозавдання', 'AI-інсайт дня'],
  },
  {
    id: 'evening-session',
    name: 'Вечірня сесія',
    type: 'reflection',
    channels: ['telegram', 'app'],
    time: '20:00',
    roles: ['user', 'trial'],
    condition: 'Щодня. Після проходження → AI-аналіз у TG.',
    bodyText: 'Вечірня сесія збирає підсумок дня і передає його в аналіз.',
    active: true,
    linkedPromptId: 'evening_session',
    triggerScreens: ['Вечірня сесія', 'Аналіз дня'],
  },
  {
    id: 'evening-report',
    name: 'Вечірній звіт',
    type: 'report',
    channels: ['telegram'],
    time: '21:00',
    roles: ['expert'],
    condition: 'Нові реєстрації, джерело, продукт, активність, завершення циклів.',
    bodyText: 'Короткий вечірній дайджест для експерта по ключових подіях дня.',
    active: true,
    linkedPromptId: 'weekly_report',
    triggerScreens: ['Аналіз воронки', 'Щотижневий звіт'],
  },
  {
    id: 'pause-reactivation',
    name: 'Пауза реактивація',
    type: 'reactivation',
    channels: ['telegram'],
    time: '10:00',
    roles: ['pause'],
    condition: 'День 3 і день 7 паузи. Не надсилати якщо статус "свідома пауза".',
    bodyText: 'Мʼяке повернення до системи без тиску і без повторного входу з нуля.',
    active: true,
    triggerScreens: ['Пауза', 'Реактивація'],
  },
  {
    id: 'streak-danger',
    name: 'Streak danger',
    type: 'streak',
    channels: ['telegram'],
    time: '21:00',
    roles: ['user', 'trial'],
    condition: 'Якщо streak > 3 і поточний день не закритий до 21:00.',
    bodyText: 'Стрік під загрозою. Сигнал має прийти вчасно, без дублювань.',
    active: true,
    linkedPromptId: 'streak_risk',
    repeatOnMiss: true,
    triggerScreens: ['Щоденний цикл', 'Завершення дня'],
  },
  {
    id: 'trial-conversion-d6',
    name: 'Trial conversion D6',
    type: 'subscription',
    channels: ['telegram'],
    time: '18:00',
    roles: ['trial'],
    condition: 'День 6 тріалу, якщо немає активної підписки.',
    bodyText: 'Шостий день тріалу. Саме час дати прозорий і спокійний CTA на продовження.',
    active: true,
    linkedPromptId: 'trial_conversion',
    triggerScreens: ['Trial → підписка', 'Аналіз воронки'],
  },
]

export const MASTER_NOTIFICATION_SEED_COUNT = MASTER_NOTIFICATIONS.length

export const NOTIFICATION_PREVIEW_CHANNELS: Array<{ id: NotificationPreviewChannel; label: string }> = [
  { id: 'user', label: 'Юзер' },
  { id: 'expert', label: 'Надя' },
]

export const NOTIFICATION_PREVIEW_MODULES: NotificationPreviewModule[] = [
  {
    id: 'wheel',
    icon: '⚖️',
    label: 'Колесо балансу',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'wheel-user',
          time: '19:51',
          text: '👋 Привіт! Час заповнити Колесо балансу — щоб побачити, де ти зараз, і куди рухатись. Це займе 2 хвилини.',
          buttons: [{ label: 'Почати', tone: 'primary' }],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'wheel-expert',
          time: '19:53',
          text: '📊 Звіт: Колесо балансу\n\n✅ Заповнили сьогодні: 14 з 21 активних\n❌ Не заповнили: 7 юзерів\n\n📈 Середня зміна по сферах:\n▸ Карʼєра: +0.8\n▸ Здоровʼя: +1.2\n▸ Фінанси: -0.3 (увага!)\n▸ Стосунки: +0.5',
          buttons: [
            { label: 'Хто не заповнив?', tone: 'neutral' },
            { label: 'Написати всім', tone: 'secondary' },
          ],
        },
      ],
    },
  },
  {
    id: 'morning',
    icon: '🌅',
    label: 'Ранкова сесія',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'morning-user',
          time: '19:50',
          text: '☀️ Доброго ранку! Як ти сьогодні?\nЦе займе 1 хвилину — коротка ранкова check-in.',
          buttons: [
            { label: '🔥 Вогонь', tone: 'neutral' },
            { label: '🙂 Нормально', tone: 'neutral' },
            { label: '🥱 Важко', tone: 'neutral' },
          ],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'morning-expert',
          time: '19:53',
          text: '☀️ Ранкові check-in — зведення\n\nВідповіли: 18 / 21 юзерів\n\n🙂 Настрій «добре/вогонь»: 11 осіб\n😐 «Нормально»: 5 осіб\n🥱 «Важко»: 2 особи — потребують уваги!\n\nТоп-цілі сьогодні:\n▸ Завершити проект — 6 осіб\n▸ Зайнятись спортом — 4 особи',
          buttons: [{ label: 'Хто відповів «важко»?', tone: 'neutral' }],
        },
      ],
    },
  },
  {
    id: 'microtasks',
    icon: '📋',
    label: 'Мікрозавдання',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'microtasks-user',
          time: '19:51',
          text: '📋 Час для мікрозавдання!\nМале, конкретне, реальне. Виконаєш за 10–20 хвилин.',
          buttons: [
            { label: 'Дай завдання', tone: 'primary' },
            { label: 'Сам напишу', tone: 'neutral' },
          ],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'microtasks-expert',
          time: '19:53',
          text: '📋 Мікрозавдання — статус дня\n\n✅ Виконали: 12 / 21 (57%)\n⏭ Пропустили: 5\n⌛ Ще не відповіли: 4\n\nСереднє завдання займає: 8 хв',
          buttons: [{ label: 'Нагадати тим хто не відповів', tone: 'neutral' }],
        },
      ],
    },
  },
  {
    id: 'evening',
    icon: '🌙',
    label: 'Вечірня сесія',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'evening-user',
          time: '19:51',
          text: '🌙 Вечірня рефлексія\nЯк минув твій день?',
          buttons: [
            { label: '💪 Продуктивно', tone: 'neutral' },
            { label: '🌊 По-різному', tone: 'neutral' },
            { label: '🥲 Складно', tone: 'neutral' },
          ],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'evening-expert',
          time: '19:53',
          text: '🌙 Вечірні рефлексії — зведення\n\nВідповіли: 16 / 21 юзерів\n\nДень був:\n💪 Продуктивним: 9 осіб\n🌊 По-різному: 5 осіб\n🥲 Складним: 2 особи\n\nСлово що повторюється найчастіше: «втома»',
        },
      ],
    },
  },
  {
    id: 'streak',
    icon: '🔥',
    label: 'Стрік',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'streak-user',
          time: '19:51',
          text: '🔥 Твій поточний стрік: 12 днів!\n\nЩодня ти відкриваєш бота — і це вже 12 днів поспіль. Надя пишається 🎉',
          buttons: [
            { label: 'Мій рекорд?', tone: 'neutral' },
            { label: 'Що дає стрік?', tone: 'neutral' },
          ],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'streak-expert',
          time: '19:53',
          text: '🔥 Стрік — аналітика\n\nАктивних стріків 7+ днів: 8 юзерів\nСередній стрік: 9.3 дні\n\n🏆 Топ стріки:\n1. @user_anna — 31 день 🥇\n2. @user_bohdan — 24 дні\n3. @user_lena — 18 днів\n\n⚠️ Ризик зламати стрік сьогодні (3+ дні без входу): 4 юзери',
          buttons: [{ label: 'Нагадати ризик-групі', tone: 'neutral' }],
        },
      ],
    },
  },
  {
    id: 'trial-conversion-d6',
    icon: '🧭',
    label: 'Trial conversion D6',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'trial-conversion-d6-user',
          time: '19:54',
          text: '🧭 День 6 тріалу.\n\nТи вже побачив, як працює система. Якщо хочеш продовжити шлях без паузи — ось добрий момент.',
          buttons: [
            { label: 'Продовжити', tone: 'primary' },
            { label: 'Поставити нагадування', tone: 'secondary' },
          ],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'trial-conversion-d6-expert',
          time: '19:55',
          text: '🧭 Trial conversion D6 — короткий контроль\n\nДень 6 тріалу: 8 юзерів\nКонверсія в оплату після пуша: 37%\n\nПотрібна одна проста CTA-логіка без зайвого тиску.',
          buttons: [
            { label: 'Переглянути CTA', tone: 'neutral' },
            { label: 'Надіслати всім D6', tone: 'secondary' },
          ],
        },
      ],
    },
  },
  {
    id: 'inactive',
    icon: '😴',
    label: 'Неактивність',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'inactive-user',
          time: '19:52',
          text: '👋 Привіт! Я помітив, що ти не заходив вже 3 дні.\n\nВсе ок? Може щось заважає?',
          buttons: [
            { label: 'Все норм, зайнятий', tone: 'neutral' },
            { label: 'Немає мотивації', tone: 'neutral' },
            { label: 'Думаю про паузу', tone: 'neutral' },
          ],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'inactive-expert',
          time: '19:53',
          text: '😴 Неактивні сьогодні: 7 юзерів\n\n▸ @user_maria — 5 днів без активності\n▸ @user_dmytro — 4 дні\n▸ @user_olena — 3 дні\n▸ + ще 4 юзери\n\nАлгоритм уже надіслав автоматичне нагадування всім.',
          buttons: [
            { label: 'Написати @maria', tone: 'neutral' },
            { label: 'Написати всім', tone: 'neutral' },
            { label: 'Запропонувати паузу всім', tone: 'secondary' },
          ],
        },
      ],
    },
  },
  {
    id: 'pause',
    icon: '⏸',
    label: 'Пауза',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'pause-user',
          time: '19:52',
          text: '⏸ Хочеш взяти паузу?\n\nЦе не кінець — це пауза. Твій прогрес нікуди не дінеться.',
          buttons: [
            { label: 'Так, хочу паузу', tone: 'primary' },
            { label: 'Розкажи детальніше', tone: 'neutral' },
          ],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'pause-expert',
          time: '19:53',
          text: '⏸ Паузи — поточний стан\n\nАктивних пауз: 3 юзери\n▸ @user_sasha — пауза 14 днів (ще 9 днів)\n▸ @user_max — пауза 7 днів (закінчиться завтра!)\n▸ @user_kate — пауза 30 днів (ще 21 день)\n\n⚠️ Завтра закінчиться пауза у @max — бот автоматично надішле запрошення.',
          buttons: [{ label: 'Написати @max особисто', tone: 'neutral' }],
        },
      ],
    },
  },
  {
    id: 'bonuses',
    icon: '🎁',
    label: 'Бонуси / Анонси',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'bonuses-user',
          time: '19:52',
          text: '🎁 У тебе є бонус від Наді!\n\n«Техніка 5-хвилинного старту» — безкоштовний міні-урок для тих, хто застряг у прокрастинації.',
          buttons: [
            { label: 'Отримати бонус', tone: 'primary' },
            { label: 'Пізніше', tone: 'neutral' },
          ],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'bonuses-expert',
          time: '19:53',
          text: '🎁 Панель broadcast / бонусів\n\nОбери сегмент для розсилки:',
          buttons: [
            { label: 'Всі PAID', tone: 'neutral' },
            { label: 'TRIAL (7 днів)', tone: 'neutral' },
            { label: 'Readiness > 0.5', tone: 'neutral' },
          ],
        },
      ],
    },
  },
  {
    id: 'zoom',
    icon: '📅',
    label: 'Zoom-сесія',
    user: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Юзер (бот)',
      avatar: 'U',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'zoom-user',
          time: '19:52',
          text: '📅 Надя запрошує тебе на Zoom-сесію!\n\nПерсональна 30-хвилинна зустріч — ми проаналізуємо твій прогрес і визначимо наступний крок.',
          buttons: [
            { label: 'Обрати слот', tone: 'primary' },
            { label: 'Не зараз', tone: 'neutral' },
          ],
        },
      ],
    },
    expert: {
      title: '@Starway_byNadya_Bot',
      subtitle: 'Надя — особиста бесіда (EXPERT_CHAT_ID)',
      avatar: 'Н',
      composerPlaceholder: 'Написати повідомлення...',
      messages: [
        {
          id: 'zoom-expert',
          time: '19:52',
          text: '📅 Zoom-сесії — бриф по юзерам\n\nЗабронювали сесію: 3 юзери\n\n👤 @user_anna — Вт 10:00\n▸ Настрій (7 днів): 🙂 позитивний\n▸ Колесо avg: 7.2 (+0.6 від минулого разу)\n▸ Стрік: 31 день\n▸ Тема рефлексії: карʼєрний вибір\n\n👤 @user_bohdan — Чт 14:00\n▸ Настрій: 😐 нейтральний\n▸ Колесо avg: 5.8 (-0.4)\n▸ Фокус: фінанси та стрес',
          buttons: [
            { label: 'Бриф по @anna', tone: 'neutral' },
            { label: 'Бриф по @bohdan', tone: 'neutral' },
            { label: 'Підтвердити всіх', tone: 'secondary' },
          ],
        },
      ],
    },
  },
]
