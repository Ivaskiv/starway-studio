const formatDayWord = (days: number) => {
  const mod10 = days % 10
  const mod100 = days % 100

  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дні'
  return 'днів'
}

export const WHEEL_TEXTS = {
  trial: {
    badge: 'Пробний період',
    title: 'Безкоштовний пробний період',
    daysLeft: (days: number) => `Залишилось ${days} ${formatDayWord(days)}`,
    cta: 'Отримати повний доступ',
    description: 'Відкрий повний функціонал, AI-інсайти та необмежене використання',
  },
  paywall: {
    preview: 'Попередній перегляд Pro',
    locked: 'Закриті можливості Pro',
    description:
      'Подивись, що відкриється після пробного періоду: глибші AI-інсайти, підтримка та необмежене використання',
    cta: 'Отримати повний доступ',
    available: 'Доступно у Pro',
  },
  features: {
    recovery: {
      title: 'AI-план відновлення',
      desc: 'Персональний план відновлення з адаптивними діями по слабкій сфері',
    },
    patterns: {
      title: 'Щотижневий аналіз патернів',
      desc: 'Патерни за 7 днів, щоб бачити, що саме тягне баланс вниз',
    },
    mentor: {
      title: 'Ментор + Zoom-підтримка',
      desc: 'Живі сесії, додаткові модулі та повний супровід у циклі',
    },
  },
  analysis: {
    completed: 'Аналіз завершено',
    criticalZone: 'критична зона',
    recoveryMode: 'режим відновлення',
    scoreSuffix: 'з 10',
    loading: 'Завантажуємо аналіз…',
    recoveryProgressPrefix: 'Якщо робити це 3 дні:',
    recoveryProgressValue: '0 → 2–3',
    ctaPlan: 'Перейти до цілей',
    ctaRecovery: 'Розблокувати відновлення',
  },
  chart: {
    title: 'Колесо балансу',
    restart: 'Почати заново',
    restartAria: 'Почати заповнення колеса заново',
    averageScore: 'Середній бал',
    criticalZone: 'Критична зона',
    strongSphere: 'Сильна сфера',
  },
  sphere: {
    actions: 'Дії',
    aiHint: 'AI формує план на основі твоїх даних',
    zeroHint: 'Що саме не працює або відсутнє?',
    editActionAria: 'Додати або редагувати',
    addActionPlaceholder: 'Додай дію...',
    removeActionAria: 'Видалити',
  },
  plan: {
    title: 'План дій',
    subtitle: 'Відредагуй дії по сферах',
    closeAria: 'Закрити план дій',
    currentScore: (score: number) => `Поточна оцінка: ${score}/10`,
    addOrEditActionAria: 'Додати або редагувати дію',
  },
  history: {
    title: 'Історія колеса',
    loading: 'Завантаження історії...',
    error: 'Не вдалося завантажити історію. Спробуйте ще раз трохи пізніше.',
    empty: (userName: string) => `Для ${userName} ще немає збережених оцінок колеса.`,
    journalCta: 'Перейти до журналу',
  },
  reports: {
    section: 'Звіти',
    title: 'PDF-звіти',
    itemTitle: (date: string) => `Звіт — ${date}`,
    averageAndWeakest: (averageScore: string, weakestSphere: string) =>
      `Середній бал ${averageScore} · слабка сфера ${weakestSphere}`,
    view: 'Перегляд',
    pdf: 'PDF',
    empty: "Після нового заповнення тут з'являться PDF-звіти з історії колеса.",
  },
  cycle: {
    title: 'Щоденний цикл',
    description: 'Після колеса система веде тебе далі',
    path: 'вебкарта → ранок → дія → вечірній звіт → патерни',
    cta: 'Перейти →',
    ctaAria: 'Перейти в щоденний цикл',
  },
  subscription: {
    startTrial: 'Почати пробний період',
    paidStatus: 'Оплачено',
    trialStatus: 'Пробний період',
    expiredStatus: 'Завершено',
    startingStatus: 'Запускається',
    trialLabel: 'Пробний період',
    trialLeft: (days: number) => `Залишилось ${days} дн.`,
    startTrialLoading: 'Запускаємо пробний період…',
    activeTitle: (days: number) => `Пробний період активний · залишилось ${days} дн.`,
    expiredTitle: 'Пробний період завершено',
    usedTitle: 'Пробний доступ уже відкрито',
    activeCopy: 'Доступ працює в режимі пробного періоду. Базові дії відкриті, а апгрейд збереже ритм без паузи.',
    expiredCopy: 'Базовий цикл залишився для перегляду, але активна робота далі відкривається через підписку.',
    readyCopy: 'Пробний період стартує автоматично разом зі стартовими кроками. Далі ти зможеш продовжити без розриву.',
    heroDescription: 'Доступ будується просто: короткий пробний період на старті, далі один платний план без зайвого шуму.',
    asideDescription: 'Базовий цикл і стартові кроки лишаються зрозумілими. Апгрейд відкриває безперервний доступ без пауз після пробного періоду.',
    autostart: 'Автостарт',
    monthlyPlanTitle: 'Starway щомісячний доступ',
  },
  monthlyBoard: {
    analysis: 'Аналіз',
    noWeeklyReport: 'Окремий тижневий звіт для цього періоду ще не згенеровано',
    completionRate: (rate: number) => `${rate}% завершення`,
    waitingReport: 'Аналіз колеса вже є, але тижневий звіт за цей місяць ще не підтягнувся.',
  },
} as const
