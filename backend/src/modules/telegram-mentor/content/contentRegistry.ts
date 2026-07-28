export const telegramContentRegistry = {
  routes: {
    startTestTriggers: ['почати тест', 'продовжити тут', 'пройти тест'],
    openFaqTriggers: ['задати питання'],
    focusPaymentTriggers: ['оплатити фокус'],
    alreadyPaidTriggers: ['я вже оплатив', 'я вже оплатила', 'я вже оплатив / оплатила'],
    helpTriggers: ['допомога', 'help', 'меню'],
    cancelTriggers: ['скасувати', 'cancel'],
    greetingTriggers: ['привіт', 'добрий день', 'добрий вечір', 'добрий ранок'],
    subscriptionKeywords: ['моя', 'статус', 'покажи', 'яка', 'який'],
    focusInfoKeywords: ['хочу', 'цікаво', 'що', 'як', 'розкажи'],
    paymentIssueKeywords: ['проблем', 'не працю', 'помил', 'не проход', 'зняло', 'failed'],
  },
  intelligenceDetection: {
    memoryRequestTriggers: ['повтори', 'нагадай', 'покажи ще раз', 'що ти щойно', 'попередню відповідь'],
    followupTriggers: ['чому', 'поясни', 'розкажи', 'розкажи більше', 'як так'],
    personalSituationTriggers: ['не можу', 'боюсь', 'відкладаю', 'невизначеність', 'знаю але не', 'не знаю як почати'],
    focusRelatedTriggers: ['фокус', 'абсистем', 'absystem', 'стан', 'ціль', 'вибір', 'рішення', 'дія', 'ціна', 'коштує', 'скільки'],
    questionTriggers: ['як', 'де', 'що', 'коли'],
    smallTalkTriggers: ['привіт', 'дякую', 'спасибо', 'як дела', 'ок', 'окей'],
  },
  replies: {
    pendingNameGreeting: (name: string) =>
      `Приємно познайомитись, ${name}! 👋\n\nТепер давай почнемо тест.`,
    memoryFallback:
      'На жаль, не бачу попередньої відповіді. Сформулюй питання ще раз.',
    smallTalkGreeting: 'Привіт',
    smallTalkThanks: 'Будь ласка.',
    smallTalkHowAreYou: 'Добре. Чим допомогти?',
    scopeFallback:
      'Я допомагаю з ФОКУСОМ, Zoom-практиками, прогресом і функціями ABSystem. Обери потрібний розділ у меню або напиши конкретне питання про платформу.',
    personalSituation: [
      'Це саме те, з чим допомагає ФОКУС.',
      'За 4 практики на тиждень ти розбираєш свою ситуацію через СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.',
      '',
      'Перші зміни видно вже за місяць.',
      'Хочеш записатися на безплатну демо-сесію?',
    ].join('\n'),
    unknownIntent: 'Здається, я не до кінця зрозумів. Можеш переформулювати?',
  },
  buttons: {
    bookDemo: 'ЗАПИСАТИСЯ НА ДЕМО',
    contactNadya: 'НАПИСАТИ НАДІ',
    openFocus: 'ДІЗНАТИСЬ ПРО ФОКУС',
    openAbsystem: 'ВІДКРИТИ ABSYSTEM',
    chooseZoomDay: '🗓️ КАЛЕНДАР ПОДІЙ',
    focusChannel: 'ПЕРЕЙТИ В КАНАЛ ФОКУС',
    continueTask: '▶️ ПРОДОВЖИТИ',
    dismissTask: '✕ ЗАКРИТИ',
  },
  system: {
    telegramIntelligenceConversationTitle: 'telegram-intelligence',
    telegramIntelligenceSource: 'telegram-intelligence',
  },
} as const
