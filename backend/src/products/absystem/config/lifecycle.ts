export const absystemLifecycleContent = {
retention: {
    title: 'Повернення в рух',
    gentle: 'Ми збережемо історія і не будемо тиснути.',
    pattern: 'Схоже, ти вже поверталась до цього запиту раніше.',
    nextStep: 'Зараз важливо зробити один маленький крок.',
    savedProgress: 'Історія збережена.',
  },
  BILLING: {
    FOCUS_PAID: {
      text: 'Вітаю, {firstName}\n\n**Оплата пройшла успішно — ти у ФОКУСІ.**\n\nТут ми не будемо просто говорити про зміни.\n\nРаз на тиждень на Zoom-практиці ти будеш дивитись на свою реальну ситуацію:\n\n— що відкладаєш\n— чому переносиш\n— яке рішення не приймаєш\n— який крок треба зробити зараз\n\n> Ти не думаєш. Ти дієш.\n\nОсь посилання на закритий канал:\n{inviteLink}\n\nПерейди і закріпи його, щоб не загубити.',
      cta: 'Відкрити канал',
    },
    PLATFORM_PAID: {
      text: 'ABSystem AI активовано. Починаємо з колеса балансу — це перший крок, щоб побачити загальну картину.',
      cta: 'Відкрити колесо балансу',
    },
    PAYMENT_FAILED: {
      text: 'Ми перевірили — оплата поки не пройшла.\n\nМожливі причини:\n· недостатньо коштів на картці\n· платіж не був завершений до кінця\n· банк не підтвердив транзакцію\n\nСпробуй оплатити ще раз — якщо не вийде, напиши нам, ми допоможемо.',
      cta: 'Спробувати ще раз',
    },
    SUB_EXPIRING: {
      text: 'Твій доступ активний ще 3 дні. Якщо хочеш продовжити рух — поновлення займе хвилину.',
      cta: 'Продовжити доступ',
    },
    TRIAL_DAY_25: {
      text: 'Твій trial добігає кінця. Щоб не втратити темп і збережений прогрес, варто вже зараз перейти в повний доступ.',
      cta: 'Перейти в STARWAY COMPLETE',
    },
    SUB_EXPIRED: {
      text: 'Твій доступ завершено. Всі твої цілі, карта балансу і звіти збережені. Коли будеш готова повернутись — вони тебе чекають.',
      cta: 'Відновити доступ',
    },
    REACTIVATION: {
      text: 'З поверненням. Відновити доступ і продовжити звідти де зупинилась — один крок.',
      cta: 'Оплатити',
    },
  },
  TRIAL_LIFECYCLE: {
    regularDay8: (input: {
      weeklyReportSummary: string | null
      daysRemaining: number
    }) => ({
      title: 'Твій тижневий результат готовий',
      quote: input.weeklyReportSummary?.trim() || null,
      lines: input.weeklyReportSummary?.trim()
        ? [
            `ABSystem працюватиме ще ${input.daysRemaining} днів.`,
          ]
        : [
            'Тижневий звіт уже збирається з твоїх відповідей і дій.',
            `ABSystem працюватиме ще ${input.daysRemaining} днів.`,
          ],
      nextStep: 'Наступний крок: продовж щоденні відповіді і закріпи ритм у ABSystem цього тижня.',
      cta: 'Продовжити ABSystem',
    }),
    legacyGiftDay8: (input: {
      weeklyReportSummary: string | null
      daysRemaining: number
      focusExpiresAt: string
    }) => ({
      title: 'Твій тижневий результат готовий',
      quote: input.weeklyReportSummary?.trim() || null,
      lines: input.weeklyReportSummary?.trim()
        ? [
            `Твій подарунковий ФОКУС активний до ${input.focusExpiresAt}.`,
            `ABSystem працюватиме ще ${input.daysRemaining} днів.`,
          ]
        : [
            'Тижневий звіт ще формується з твоїх відповідей і дій.',
            `Твій подарунковий ФОКУС активний до ${input.focusExpiresAt}.`,
            `ABSystem працюватиме ще ${input.daysRemaining} днів.`,
          ],
      nextStep: 'Наступний крок: продовжуй ранкові та вечірні відповіді цього тижня.',
      cta: null,
    }),
    regularPreExpiry: (input: {
      daysRemaining: number
    }) => ({
      title: `До завершення ABSystem залишилося ${input.daysRemaining} днів`,
      quote: null,
      lines: [
        'Щоб не втратити щоденний трекінг, аналітику і накопичений ритм, продовжи доступ окремо.',
      ],
      nextStep: 'Наступний крок: відкрий продовження ABSystem і зафіксуй доступ без паузи.',
      cta: 'Продовжити ABSystem',
    }),
    legacyGiftPreExpiry: (input: {
      daysRemaining: number
      focusExpiresAt: string
    }) => ({
      title: `До завершення ABSystem залишилося ${input.daysRemaining} днів`,
      quote: null,
      lines: [
        `Твій ФОКУС залишається активним до ${input.focusExpiresAt}.`,
        'Для продовження щоденного трекінгу та аналітики можна окремо активувати ABSystem.',
      ],
      nextStep: 'Наступний крок: якщо хочеш зберегти щоденний ритм без паузи, продовжи ABSystem окремо.',
      cta: 'Продовжити ABSystem',
    }),
    trialExpired: (input: {
      focusExpiresAt: string | null
      legacyGift: boolean
    }) => ({
      title: input.legacyGift
        ? 'Подарунковий період ABSystem завершився'
        : 'Період ABSystem завершився',
      quote: null,
      lines: input.legacyGift && input.focusExpiresAt
        ? [
            'Твої попередні дані та звіти збережені.',
            `ФОКУС і групові Zoom залишаються доступними до ${input.focusExpiresAt}.`,
          ]
        : [
            'Твої попередні дані та звіти збережені.',
            'Щоб повернути щоденний трекінг і аналітику, продовжи ABSystem окремо.',
          ],
      nextStep: 'Наступний крок: якщо хочеш повернути щоденний трекінг і аналітику, продовжи ABSystem.',
      cta: 'Продовжити ABSystem',
    }),
  },
} as const
